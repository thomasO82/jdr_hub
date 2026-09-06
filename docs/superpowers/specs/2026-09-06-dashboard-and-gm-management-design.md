# F08 — Dashboard et gestion MJ

## Contexte

F07 ajoute les présences, les absences et les notifications. F08 doit rendre
ces informations réellement exploitables depuis le point d'entrée authentifié
de l'application et fournir au MJ une vue cohérente de ses parties.

La fonctionnalité couvre une seule PR : le dashboard joueur/MJ et la gestion
MJ des candidatures, invitations, roster et séances. Elle ne crée pas de chat,
de calendrier externe, de nouvelle règle d'XP ou de nouveau modèle métier.

## Objectif

Faire du dashboard le point d'entrée authentifié de JDR Hub et permettre à un
MJ de piloter ses parties depuis une vue dédiée, sans contourner les contrôles
d'autorisation des modules existants.

## Décisions validées

### Architecture retenue

Le backend expose un service d'agrégation dédié au dashboard. Ce service
compose des projections provenant des repositories et services existants :

- prochaine séance et séances pertinentes ;
- parties actives de l'utilisateur ;
- candidatures reçues pour les parties dont il est MJ ;
- invitations reçues ou émises selon les droits ;
- votes de créneaux à traiter ;
- absence à signaler pour une séance éligible ;
- résumé de progression disponible dans les modules existants.

L'agrégateur exécute les sous-requêtes indépendantes séparément. Un échec
secondaire ne doit pas empêcher le rendu des autres blocs : la réponse porte
un état explicite par bloc et le frontend propose une action de nouvelle
tentative lorsque c'est pertinent.

La gestion MJ reste découpée en routes et services par domaine. Elle réutilise
les repositories et les invariants de F04, F06 et F07 ; elle ne recopie pas la
logique de capacité, de statut de séance, de vote ou de notification.

Une grosse requête SQL croisant tous les modules est écartée car elle couplerait
les domaines et rendrait l'autorisation par ressource plus difficile à vérifier.
Plusieurs appels directs depuis le navigateur sont également écartés pour
éviter une cascade de requêtes, des états partiels incohérents et la diffusion
de données non nécessaires au client.

### Périmètre API

Les routes suivantes sont ajoutées ou complétées selon les contrats déjà
présents dans le dépôt :

- `GET /dashboard` pour la projection authentifiée de l'utilisateur connecté ;
- `GET /games/:gameId/manage` pour la projection de gestion d'une partie dont
  l'utilisateur est propriétaire ;
- les actions de gestion des candidatures, invitations, roster et séances,
  en conservant les routes métier propres à chaque module.

La route dashboard ne prend pas d'identifiant d'utilisateur dans la requête.
L'identité provient exclusivement de la session authentifiée. La route de
gestion prend un identifiant de partie, mais vérifie côté serveur que
l'utilisateur courant en est le MJ propriétaire avant de retourner une donnée
privée ou d'exécuter une action.

Les réponses sont des projections explicites. Elles ne renvoient pas de token,
de cookie, de secret, de disponibilité précise non prévue, d'adresse privée,
de détail Discord inutile ou de colonne brute issue de Drizzle.

### Dashboard joueur et MJ

Le dashboard est adapté aux données et droits de l'utilisateur, sans supposer
qu'il est MJ. Les blocs prévus sont :

1. prochaine séance, avec partie, date, heure, rôle et action principale ;
2. parties actives ou suivies ;
3. candidatures à suivre pour le joueur et candidatures reçues pour le MJ ;
4. invitations à traiter ;
5. créneaux ou votes nécessitant une action ;
6. absence à signaler lorsqu'une séance est éligible ;
7. résumé de progression déjà disponible.

Un bloc vide possède un état vide explicite. Un bloc indisponible possède un
état d'erreur localisé, conserve le reste du dashboard et expose une action
`Réessayer` lorsque le rejeu est sûr. Les compteurs sont produits par les
projections sources et ne sont pas recalculés dans React.

### Gestion MJ

La page de gestion est rattachée à une partie précise et contient les onglets
suivants :

- Vue d'ensemble ;
- Joueurs ;
- Candidatures ;
- Séances ;
- Paramètres n'ajoute aucune mutation dans F08 ; il peut uniquement pointer
  vers une gestion déjà existante si cette route est disponible.

Le MJ peut consulter et administrer uniquement les parties qu'il possède. Les
onglets, liens et boutons sont des aides d'interface ; ils ne constituent
jamais une permission. Les actions d'acceptation, de refus, d'invitation,
d'ajout ou de retrait de membre et de gestion de séance passent par les
services métier existants et respectent leurs transactions, contraintes,
statuts et règles de concurrence.

Toute action sensible fournit un retour de succès ou d'échec en français. Une
erreur de concurrence ou de statut indique une action possible, par exemple
actualiser la liste, sans exposer l'exception technique.

## Design et responsive

### Desktop

Le dashboard reprend la maquette `tableau_de_bord_jdr_hub` :

- grille de contenu en cartes avec la prochaine séance mise en avant ;
- progression et résumé en blocs secondaires ;
- liste des parties actives ;
- activité ou alertes dans une colonne dédiée ;
- bouton primaire de création et cloche de notifications dans le shell.

La gestion MJ reprend `gestion_mj_la_crypte_maudite` et
`gestion_des_candidatures_jdr_hub` : titre de la partie, statut, navigation par
onglets, cartes de candidatures, résumé du groupe et prochaine séance.

### Mobile

Le dashboard reprend `tableau_de_bord_mobile` :

- header mobile partagé ;
- prochaine séance en premier ;
- parties actives sous forme de cartes empilées ;
- alertes et actions prioritaires accessibles sans survol ;
- navigation basse cohérente avec le shell existant.

La gestion MJ reprend `gestion_des_candidatures_mobile` :

- header et navigation partagés ;
- informations synthétiques de la partie ;
- onglets horizontaux défilants ou sélecteur accessible ;
- cartes verticales pour les candidatures et actions tactiles de taille
  suffisante.

Les nouvelles vues utilisent `AppHeader`, le logo officiel et les tokens du
design system. Les rôles typographiques restent Hanken Grotesk pour la
hiérarchie, Inter pour le texte courant et les contrôles, et Geist pour les
labels et métadonnées. Aucun CSS local, style inline ou valeur de couleur
répétée ne sera ajouté.

Les états loading, empty, error, disabled, focus-visible et reduced-motion
sont prévus dès la composition des composants. Les actions critiques sont
clavier-accessibles, annoncées aux technologies d'assistance et ne dépendent
pas uniquement de la couleur.

## Flux de données

```text
Session authentifiée
        │
        ▼
GET /dashboard ──► dashboard service
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       séances       parties        actions à traiter
          │              │              │
          └──────────────┴──────────────┘
                         ▼
               projection par bloc
                         ▼
                   vue dashboard

GET /games/:gameId/manage ──► autorisation propriétaire
                                      │
                                      ▼
                         projection de gestion MJ
                                      │
                                      ▼
             actions → services métier → transaction/repository
```

Le service d'agrégation reçoit l'utilisateur authentifié et une horloge
injectable pour les tests. Les repositories restent la seule frontière de
persistance. Les handlers lisent le transport et construisent les réponses ;
ils ne portent ni règle métier ni requête Drizzle.

## Erreurs et sécurité

- Une requête sans session reçoit `401`.
- Une partie inexistante ou inaccessible ne révèle pas son existence privée et
  suit le format d'erreur API existant.
- Une action sur une partie appartenant à un autre MJ reçoit `403` ou `404`
  selon la politique d'exposition retenue par le module.
- Les erreurs inattendues sont journalisées avec `requestId` côté serveur et
  retournent un message générique en français.
- Les paramètres d'identifiant, pagination et filtres sont validés par Zod,
  avec propriétés inconnues refusées et limites explicites.
- Les routes qui modifient l'état vérifient l'origine et la protection CSRF
  existante.
- Les agrégats et actions sensibles sont soumis au rate limiting adapté.
- Les messages de candidature sont échappés par React et ne sont jamais
  injectés comme HTML brut.
- Les actions de MJ importantes sont journalisées sans donnée personnelle
  inutile.
- Les requêtes utilisent Drizzle paramétré ; aucune concaténation SQL avec une
  entrée utilisateur n'est autorisée.

## Critères d'acceptation

1. Un utilisateur authentifié peut ouvrir `/dashboard` et voit une projection
   adaptée à ses parties et à ses droits.
2. Un dashboard sans séance, partie, candidature ou invitation affiche des
   états vides compréhensibles.
3. Une panne d'un agrégat secondaire laisse les autres blocs visibles et
   affiche une erreur localisée avec une action de nouvelle tentative lorsque
   possible.
4. Un MJ peut ouvrir la gestion d'une de ses parties et naviguer entre les
   onglets prévus.
5. Un utilisateur non propriétaire ne peut ni lire ni modifier la gestion
   d'une autre partie en manipulant l'URL ou les identifiants.
6. L'acceptation ou le refus d'une candidature respecte la capacité et les
   contraintes de F04, y compris en cas de concurrence.
7. Les invitations, le roster et les séances utilisent les contrats et
   transactions des modules existants.
8. Les compteurs affichés restent cohérents après une action réussie ou un
   rejeu idempotent.
9. Les vues desktop, tablette et mobile restent utilisables au clavier,
   affichent un focus visible et fournissent des labels accessibles.
10. Le dashboard et la gestion MJ sont `noindex` et ne publient aucune donnée
    privée dans le HTML ou les métadonnées.

## Stratégie de tests

### Tests unitaires

- projection dashboard joueur et MJ ;
- politique de visibilité par rôle et propriétaire ;
- agrégat vide et erreur partielle ;
- compteurs et priorités d'action ;
- validation des paramètres et mapping des erreurs ;
- cohérence d'une projection après changement de statut.

### Tests API

- authentification et refus sans session ;
- accès horizontal à la partie d'un autre MJ ;
- projection explicite sans champs privés ;
- erreurs stables avec `requestId` ;
- actions de candidatures, invitations, roster et séances ;
- rejeu et conflit de concurrence ;
- rate limiting et vérification d'origine sur les mutations.

### Tests d'intégration

- agrégations multi-modules sur PostgreSQL réel ;
- projection privée minimale ;
- transaction d'action MJ et respect des contraintes existantes ;
- cohérence des compteurs après modification ;
- absence d'effet lorsqu'une action échoue.

### Tests composants et E2E

- cartes de prochaine séance, listes, timeline, compteurs et onglets ;
- états loading, empty, error et retry ;
- navigation clavier, focus, annonces et responsive ;
- ouverture du dashboard par un joueur ;
- administration d'une partie par son MJ ;
- refus d'accès d'un autre MJ.

## Hors périmètre

- chat temps réel ou messagerie de partie ;
- rappels Discord automatiques autres que F07 ;
- calendrier externe ;
- nouvelle mécanique d'XP ou de niveau ;
- administration globale ou outils de modération ;
- refonte des règles métier F04, F06 ou F07 ;
- nouvelle table PostgreSQL, sauf index justifié par une mesure et validé
  séparément.

## Fichiers et responsabilités attendus

- `apps/api/src/modules/dashboard/` : routes, handlers, service d'agrégation,
  repository/projections et politique du dashboard ;
- `apps/api/src/modules/games/`, `applications/`, `invitations/`, `members/`
  et `sessions/` : raccordement aux actions déjà spécialisées ;
- `packages/shared/src/` : contrats Zod et types de projection réellement
  partagés ;
- `apps/web/app/` : définitions de routes uniquement ;
- `apps/web/features/dashboard/` : composition du dashboard et composants
  d'état ;
- `apps/web/features/gm-management/` : vue de gestion MJ, onglets et actions ;
- `apps/web/lib/` : clients API frontend ;
- `apps/api/tests/`, `apps/web/tests/` et `packages/*/tests/` : tests organisés
  par niveau, sans tests métier dans `src/`.

## Documentation de livraison

La PR mettra à jour :

- `docs/features/` avec la fiche détaillant uniquement le comportement livré ;
- `docs/project-status.md` avec la branche, le statut, les tests et les
  limites ;
- `docs/security/authorization-matrix.md` si les permissions dashboard/MJ
  nécessitent une nouvelle ligne ;
- la preuve TDD Red, Green, Refactor, les contrôles de sécurité et les
  vérifications manuelles.
