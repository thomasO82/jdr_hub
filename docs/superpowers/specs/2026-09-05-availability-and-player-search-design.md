# F05 — Disponibilités et recherche de joueurs

## Statut de la conception

Conception proposée — validation du propriétaire requise avant le plan
d’implémentation.

## Contexte

JDR Hub doit permettre à chaque utilisateur de renseigner ses disponibilités
récurrentes, puis à un MJ de trouver des joueurs selon un nom, des préférences
de système et une compatibilité de créneau. Les horaires détaillés sont des
données personnelles : ils restent visibles par leur propriétaire et ne sont
jamais renvoyés dans une recherche de joueurs.

La fonctionnalité suit les règles F05 du cahier des charges : stockage des
jours et minutes dans le fuseau du profil, exceptions ponctuelles, visibilité
publique désactivée par défaut, projection agrégée et interface desktop/mobile
adaptée aux maquettes.

## Périmètre

### Inclus

- gestion transactionnelle des plages hebdomadaires d’un utilisateur ;
- gestion d’exceptions d’indisponibilité datées et libellées ;
- fuseau horaire du profil réutilisé et validé avec la bibliothèque IANA ;
- préférences de notification d’invitation et de visibilité agrégée ;
- systèmes de jeu préférés pour la recherche ;
- recherche authentifiée de joueurs par nom, système et compatibilité ;
- pages `/disponibilites` et `/joueurs`, avec états chargement, vide et erreur ;
- tests unitaires, API, intégration et composants.

### Exclus

- conversion d’un planning réel ou synchronisation avec un calendrier externe ;
- affichage des horaires précis d’un autre utilisateur ;
- recommandations automatiques ou classement de joueurs ;
- notification Discord et planification des séances, réservées aux F06/F07.

## Décisions d’architecture

### Modèle de données

Le module API `availability` possède ses routes, handlers, services et
repository. Les tables prévues sont :

- `availability_rules` : `id`, `userId`, `dayOfWeek` (0–6), `startMinute`,
  `endMinute`, timestamps et index `(userId, dayOfWeek)` ;
- `availability_exceptions` : `id`, `userId`, `startsAt`, `endsAt`, `label`,
  timestamps et index `(userId, startsAt)` ; une exception représente une
  période bloquée qui ignore la semaine type ;
- `user_preferences` : une ligne par utilisateur avec
  `availabilityPublic` (faux par défaut), `invitationNotifications` (vrai par
  défaut) et un niveau d’expérience facultatif ;
- `user_preferred_systems` : association `(userId, system)` unique pour les
  systèmes de jeu préférés.

Les règles et exceptions sont stockées en minutes et en UTC respectivement.
Le fuseau IANA de l’utilisateur sert à interpréter les minutes côté
application ; les transitions DST sont validées avant la persistance.

Le remplacement des disponibilités et préférences se fait dans une
transaction : les nouvelles lignes sont validées avant de remplacer les
anciennes. Aucun effacement global ni cascade non ciblée n’est autorisé.

### Contrats partagés

`packages/shared` expose les schémas Zod et types suivants :

- plage hebdomadaire avec jour entier, minutes dans `[0, 1440]` et `end > start` ;
- exception avec dates valides, durée positive et libellé borné ;
- préférences strictes sans propriétés inconnues ;
- requête de recherche paginée avec nom, système et créneau facultatifs ;
- projection `PlayerSummary` contenant uniquement identifiant, nom, avatar,
  niveau éventuel, systèmes préférés et indicateur de compatibilité.

Les tableaux ont des tailles maximales explicites. Les plages qui se
chevauchent pour un même jour sont refusées ; deux plages adjacentes restent
autorisées.

### API Hono

- `GET /availability` — session obligatoire ; retourne les plages,
  exceptions et préférences de l’utilisateur courant uniquement ;
- `PUT /availability` — session et vérification stricte de l’origine ; valide
  puis remplace l’ensemble dans une transaction ;
- `GET /players` — session obligatoire ; accepte `q`, `system`, un intervalle
  de recherche facultatif et la pagination ; retourne uniquement des résumés
  agrégés ;
- `GET /players/:id` n’est pas inclus dans F05 afin d’éviter d’exposer une
  disponibilité détaillée par inadvertance.

Les handlers lisent le cookie, valident les paramètres et délèguent aux
services. Le repository est le seul composant à utiliser Drizzle. Les erreurs
publiques restent génériques (`AUTH_ERROR`, `AVAILABILITY_ERROR` ou
`PLAYER_SEARCH_ERROR`) et contiennent le `requestId`.

La recherche ne renvoie l’indicateur de compatibilité que si l’utilisateur
cible a activé `availabilityPublic`. Sinon, la valeur est `null` et aucun
créneau, exception ou fuseau précis n’est inclus. Les réponses sont limitées,
non triables arbitrairement et soumises au rate limiting existant ou dédié.

### Interface web

- `/disponibilites` utilise la maquette desktop « Ma Gestion des
  Disponibilités » : grille semaine type, états Disponible/Flexible/Indispo,
  exceptions et préférences ;
- sur mobile, la grille devient une navigation par jour comme dans la maquette
  « Mes Disponibilités Habituelles » ; l’état local est conservé pendant le
  changement de jour ;
- `/joueurs` reprend les cartes et filtres des maquettes desktop/mobile :
  recherche, systèmes, disponibilité, cartes de joueurs et pagination ;
- `AppShell` reste le composant de navigation partagé ; aucune copie de header
  ou footer n’est créée.

Les composants client sont limités aux interactions de grille, toggles,
exceptions, filtres et pagination. Les pages et états initiaux restent des
Server Components quand aucune interaction navigateur n’est nécessaire.

## Flux de données

1. Le navigateur charge `/disponibilites` avec la session existante.
2. Next.js appelle l’API Hono côté serveur pour l’état initial.
3. L’utilisateur modifie les cases et préférences ; le client envoie un `PUT`
   complet avec le cookie et les en-têtes d’origine requis.
4. Le service valide les bornes, le fuseau et les chevauchements, puis remplace
   les lignes dans une transaction.
5. `/joueurs` envoie des filtres bornés ; le service calcule une compatibilité
   agrégée sans sélectionner les plages précises d’un autre utilisateur.

## Sécurité et confidentialité

- authentification obligatoire pour lire ou remplacer ses disponibilités et
  pour rechercher des joueurs ;
- contrôle d’origine/CSRF sur `PUT /availability` ;
- autorisation par utilisateur : aucun `userId` fourni par le client pour la
  ressource courante ;
- validation Zod stricte, taille maximale des tableaux et libellés ;
- fuseaux IANA validés, gestion explicite des jours inexistants lors des
  changements DST ;
- réponse de recherche minimisée, aucune heure exacte ni exception ;
- rate limiting et pagination bornée pour limiter le scraping ;
- aucune donnée précise dans les logs, messages d’erreur ou métadonnées SEO ;
- migrations non destructives et requêtes Drizzle paramétrées.

## Stratégie de tests

### Tests écrits en premier

- intervalles valides, bornes, chevauchements, adjacence et surcharge ;
- fuseaux IANA et cas DST ;
- remplacement idempotent des plages, exceptions et préférences ;
- accès refusé sans session ou avec une origine invalide ;
- recherche par nom/système et indicateur de compatibilité agrégé ;
- absence de plages précises ou de données privées dans les réponses.

### Non-régression

Les tests auth, games, applications et infrastructure restent inchangés. Les
tests d’intégration utilisent une base PostgreSQL de test et des utilisateurs
fictifs uniquement.

## Migration et compatibilité

Une migration additive crée les tables et index F05. Aucun champ existant n’est
supprimé, aucune route actuelle n’est modifiée et aucun contrat HTTP existant
n’est changé. Les nouveaux endpoints sont indépendants des parcours F04.

## Critères de fin

- les tests Red/Green/Refactor sont consignés dans la fiche de fonctionnalité ;
- les routes API, pages desktop/mobile et erreurs sont vérifiées ;
- lint, typecheck, tests, build et migration PostgreSQL de test passent ;
- la fiche `docs/features/011-availability-and-player-search.md` et
  `docs/project-status.md` sont à jour avant la PR.
