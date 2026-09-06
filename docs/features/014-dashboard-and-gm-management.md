# F08 — Dashboard et gestion MJ

## Identifiant

F08

## Statut

`IN_PROGRESS`

> La Pull Request n'est pas encore ouverte. Le statut deviendra `IN_REVIEW`
> après son ouverture effective. Il ne deviendra `MERGED` qu'après confirmation
> du propriétaire.

## Branche

`feat/dashboard-and-gm-management`

## Lien ou numéro de Pull Request

Création automatique refusée par l'intégration GitHub (`403 Resource not
accessible by integration`). Ouverture manuelle :
https://github.com/thomasO82/jdr_hub/pull/new/feat/dashboard-and-gm-management

## Dates de début et de fin

- Début : 2026-09-06
- Fin : 2026-09-06

## Dépendances

### Prévues

- F02 — parties et cycle de vie ;
- F04 — candidatures, membres et invitations ;
- F06 — séances, créneaux, votes et planning ;
- F07 — présences et notifications.

### Réalisées ou constatées

- Les contrats, repositories et services des fonctionnalités précédentes sont
  réutilisés via l'injection de dépendances de l'API.
- Le planning et les candidatures existants restent les destinations des
  actions détaillées.

### Restantes

- F09 raccordera la progression XP au bloc de progression du dashboard.

## Contexte

### Prévu

Faire du dashboard le point d'entrée authentifié de JDR Hub et fournir au MJ
une vue privée pour suivre ses parties, candidatures, invitations, roster et
séances.

### Réalisé

Le dashboard agrège la prochaine séance, les parties actives, les candidatures,
les invitations, les créneaux à traiter et les actions d'absence. Chaque source
secondaire peut être vide ou en erreur sans bloquer les autres blocs. La vue de
gestion MJ est privée, limitée aux parties possédées et organisée en onglets
Résumé, Candidatures, Invitations, Joueurs et Séances.

### Restant à faire

La progression XP reste un état vide jusqu'à F09. Le MVP ne fournit pas de chat
temps réel ; la messagerie SSE/Redis précédemment évoquée appartient à une
fonctionnalité distincte et n'est pas introduite ici.

## Besoin utilisateur

### Prévu

Permettre à un joueur de retrouver rapidement ses prochaines parties et actions
à effectuer, et à un MJ d'administrer une partie sans naviguer entre plusieurs
écrans non reliés.

### Réalisé

La racine authentifiée affiche un dashboard responsive avec états de chargement,
vide, erreur et reprise. Le MJ peut consulter les candidatures, inviter ou
annuler une invitation, voir le roster, retirer un joueur et accéder au planning
des séances depuis la gestion de sa partie.

### Restant à faire

Le parcours visible d'acceptation/refus d'une invitation reçue pourra être
complété dans une évolution UI dédiée ; les routes et le service de décision
existent déjà pour préserver le contrat serveur.

## Périmètre prévu

- contrats partagés du dashboard et des invitations ;
- agrégation authentifiée du dashboard ;
- gestion MJ par partie ;
- invitations persistées et décisions acceptation/refus/annulation ;
- lecture et retrait sécurisé du roster ;
- interface responsive alignée sur le shell et le design system existants ;
- tests unitaires, API, composants et intégration PostgreSQL.

## Fonctionnalités effectivement réalisées

- contrats Zod stricts et projections typées dans `packages/shared` ;
- table `invitations`, index et contrainte d'unicité des invitations `PENDING` ;
- services et routes d'invitation avec expiration serveur à sept jours ;
- service et routes de roster avec projection du MJ propriétaire et retrait
  logique des joueurs ;
- repository d'agrégation dashboard et projection de gestion MJ ;
- gestion des erreurs partielles avec état par bloc et message utilisateur
  français ;
- clients frontend credentialed pour dashboard, invitations et membres ;
- dashboard d'accueil et écran `/gestion/parties/[id]` responsive, accessible
  au clavier et en Tailwind-only ;
- intégration des mutations de candidatures avec l'origine applicative stricte.

## Parcours utilisateur

### Prévu

1. Un utilisateur authentifié ouvre le dashboard.
2. Il consulte sa prochaine séance, ses parties actives et ses actions.
3. Un MJ ouvre la gestion d'une de ses parties.
4. Il traite les candidatures, les invitations, le roster et le lien vers les
   séances.

### Réalisé

Le dashboard est rendu à la racine après authentification. Les cartes renvoient
vers les parties, candidatures, invitations, planning ou gestion concernés. La
gestion vérifie le propriétaire côté API avant d'afficher ses onglets. Les
actions d'invitation et de retrait demandent une confirmation ou affichent une
erreur française exploitable.

### Restant à faire

- capture E2E avec un vrai navigateur et données de démonstration ;
- écran dédié côté dashboard pour décider une invitation reçue.

## Règles métier

### Prévues

- le dashboard agrège les sources existantes sans réimplémenter leurs règles ;
- la gestion est réservée au MJ propriétaire ;
- une invitation concerne un joueur non membre d'une partie ouverte ou active ;
- une invitation expire et ne peut pas être acceptée deux fois ;
- l'acceptation respecte la capacité et le roster ;
- les états loading, empty, error et notification sont explicites.

### Implémentées

- l'identité du dashboard vient exclusivement de la session ;
- `Promise.allSettled` isole les erreurs des blocs indépendants et évite un
  écran entièrement bloqué ;
- les invitations `PENDING` expirées sont nettoyées lors d'une nouvelle
  invitation et refusées lors d'une décision ;
- la contrainte partielle empêche deux invitations `PENDING` pour le même
  joueur et la même partie ;
- l'acceptation verrouille la partie, vérifie la capacité et ajoute ou réactive
  le membre dans la même transaction ;
- seul le propriétaire peut créer/lire/annuler les invitations de sa partie et
  retirer un joueur ; le MJ ne peut pas être retiré ;
- le retrait est idempotent et conserve l'historique via le statut `REMOVED` ;
- les compteurs et projections ne contiennent que les données accessibles à
  l'utilisateur courant.

### Non couvertes ou reportées

- attribution et historique XP ;
- chat temps réel, SSE et Redis Streams ;
- notification Discord d'une invitation ;
- expérience UI complète d'acceptation/refus d'une invitation reçue.

## Architecture et choix techniques

### Prévu

Conserver un monolithe Hono modulaire, exposer des projections dédiées et
réutiliser les services existants depuis une interface Next.js composée de
composants réutilisables.

### Réalisé

Les routes délèguent aux handlers, puis aux services et repositories. Le
repository dashboard ne modifie pas les données et filtre les parties par
propriétaire ou membre actif. Les routes de gestion réutilisent les modules
applications, sessions, invitations et membres au lieu de déplacer leur
logique métier dans React. Le dashboard rend chaque bloc indépendamment et
les clients frontend n'exposent jamais d'exception brute.

La table d'invitations a été ajoutée malgré le plan initial qui la supposait
déjà existante : la spécification et le besoin MVP la rendent nécessaire pour
un workflow complet et testable. Cette décision est détaillée dans
`docs/decisions/004-f08-invitations.md`.

### Restant à faire

- ajouter des mesures de performance avant d'envisager de nouveaux index ;
- remplacer les liens de séance par une vue de gestion dédiée si le périmètre
  des séances évolue.

## Modèle de données et migrations

### Prévu

Une projection dashboard sans nouvelle entité obligatoire et les tables
relationnelles nécessaires pour les invitations et leurs états.

### Réalisé

La migration additive `0008_invitations.sql` crée `invitations` avec clés
étrangères vers `games` et `users`, index par partie, invitée et expiration,
statuts bornés et index unique partiel sur les invitations `PENDING`. Les
acceptations et les retraits du roster utilisent les tables existantes et des
transactions.

### Restant à faire

Aucune migration destructive. Les index supplémentaires seront justifiés par
une mesure de charge ultérieure.

## Routes API

### Prévues

- `GET /dashboard` ;
- `GET /games/:gameId/manage` ;
- `POST /games/:gameId/invitations` ;
- `GET /games/:gameId/invitations` ;
- `GET /invitations` ;
- `PATCH /invitations/:invitationId` ;
- `GET /games/:gameId/members` ;
- `DELETE /games/:gameId/members/:userId`.

### Implémentées

Toutes ces routes exigent une session valide. Les mutations exigent l'origine
applicative exacte, une validation Zod stricte, un rate limit et une réponse
française stable. Les routes de gestion, d'invitations d'une partie et de
roster vérifient le rôle de propriétaire côté serveur. Les réponses privées
excluent les identifiants Discord et les horaires de disponibilité.

### Restantes

Aucune route obligatoire F08 restante.

## Interface et composants

### Prévus

- dashboard responsive avec prochaine séance, parties, actions et compteurs ;
- écran de gestion MJ avec onglets ;
- listes candidatures, invitations, roster et séances ;
- états loading, empty, error, succès et confirmation.

### Réalisés

- `DashboardView` et `DashboardBlock` sur `/` ;
- `GmManagementView`, `ManageTabs`, `InvitationsPanel` et `RosterPanel` sur
  `/gestion/parties/[id]` ;
- réutilisation d'`AppShell`/`AppHeader` et des tokens Tailwind du projet ;
- actions candidature existantes raccordées à l'origine applicative ;
- responsive mobile/tablette/desktop avec labels, rôles d'onglets, focus
  visible et régions live pour les retours d'action.

### Restants

- vérification visuelle manuelle dans un navigateur réel ;
- écran UI d'acceptation/refus des invitations reçues.

## Tests

### Prévus

- contrats et politiques d'invitation ;
- services dashboard, invitations et roster ;
- routes 401/403/404/409/429 et validation stricte ;
- contraintes et transactions PostgreSQL ;
- clients et vues frontend ;
- non-régression complète, lint, typecheck et builds.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm test -- --reporter=dot` | 113 fichiers, 291 tests verts ; les intégrations PostgreSQL sont exécutées séparément | 2026-09-06 |
| `DATABASE_URL=postgresql://… pnpm test:integration` | 2 fichiers, 5 tests PostgreSQL verts avec base locale dédiée | 2026-09-06 |
| `pnpm lint` | Tous les packages lintés sans erreur | 2026-09-06 |
| `pnpm typecheck` | Shared, web, database et API sans erreur TypeScript | 2026-09-06 |
| `pnpm build` | API, packages et Next.js construits avec succès ; 12 pages statiques et routes dynamiques générées | 2026-09-06 |

### Restants

- exécuter un E2E navigateur réel ;
- mesurer la couverture dédiée, non exécutée dans cette branche.

## Preuve TDD Red, Green, Refactor

### Red

- Tests écrits avant l'implémentation pour les contrats, politiques, services,
  routes, projections et parcours visuels ;
- les premiers tests échouaient par absence des modules/routes et par les
  comportements non implémentés ;
- l'intégration PostgreSQL a aussi révélé une erreur de migration et une
  condition d'expiration trop large, corrigées ensuite sans affaiblir les
  assertions.

### Green

- Implémentation minimale des contrats, migration, repositories, services,
  handlers, clients et vues ;
- les suites ciblées puis la suite complète ont été relancées après chaque
  correction ;
- l'intégration valide l'unicité `PENDING`, l'acceptation avec capacité, le
  refus de capacité, l'annulation MJ, le roster, l'idempotence et l'isolation
  du dashboard.

### Refactor

- agrégation secondaire isolée avec `Promise.allSettled` ;
- séparation routes/handlers/services/repositories et helpers mémoire de test ;
- correction du client candidatures pour propager l'origine de confiance sans
  déplacer la logique d'autorisation côté frontend ;
- exécution séquentielle des fichiers d'intégration pour éviter une course de
  migration PostgreSQL.

## Contrôles de sécurité

### Prévus

- session, CSRF/origine et rate limiting sur les mutations ;
- autorisation par ressource et prévention IDOR ;
- validation stricte, bornes et absence de données privées dans les projections ;
- transactions et idempotence sur invitation, capacité et retrait.

### Réalisés

- visiteurs refusés et utilisateurs sans session renvoyés vers une erreur
  d'authentification ;
- propriétaire vérifié côté serveur pour la gestion, les invitations de partie
  et le roster ; invité vérifié côté serveur pour ses décisions ;
- origine exacte requise pour les écritures, schémas Zod stricts et payloads
  bornés ; rate limit de 30 mutations par minute et utilisateur ;
- projection dashboard/gestion sans `discordId`, token, disponibilité ni
  données de parties non accessibles ;
- transactions, verrouillage de partie, contrainte SQL partielle et décisions
  idempotentes ; erreurs internes non exposées au frontend.

### Restants ou limites

- E2E avec tests d'attaque navigateur et audit de couverture à ajouter ;
- le support administrateur reste une politique future, non exposée par F08.

## Documentation technique consultée

- `docs/specifications/cahier-des-charges.md` ;
- `docs/implementation-plan.md` ;
- `docs/design-system.md` et `docs/design-audit.md` ;
- maquettes desktop/mobile dashboard et gestion MJ ;
- `docs/security/security-requirements.md` ;
- `docs/security/authorization-matrix.md` ;
- `docs/decisions/004-f08-invitations.md`.

## Fichiers principaux

- `packages/shared/src/dashboard.ts` et `invitations.ts` — contrats et types ;
- `packages/database/src/schema/invitations.ts` — schéma et index ;
- `apps/api/src/modules/dashboard/` — projections et routes de lecture ;
- `apps/api/src/modules/invitations/` — workflow d'invitation ;
- `apps/api/src/modules/members/` — roster protégé ;
- `apps/web/features/dashboard/` — dashboard ;
- `apps/web/features/gm-management/` — gestion MJ ;
- `apps/web/lib/*-api.ts` — clients frontend credentialed ;
- `apps/api/tests/` et `apps/web/tests/` — preuves unitaires, API, intégration
  et composants.

## Limites connues

- progression XP vide jusqu'à F09 ;
- pas de chat, SSE, Redis Streams ou notification Discord d'invitation ;
- pas d'E2E navigateur réel dans cette branche ;
- aucune mesure de couverture dédiée n'a été exécutée.

## Travaux reportés

- F09 — XP, niveaux et historique ;
- fonctionnalité ultérieure — messagerie textuelle par partie ;
- E2E navigateur et contrôle visuel manuel avec compte de test.

## Vérification manuelle

### Prévue

Avec deux comptes de test : ouvrir le dashboard sur desktop et mobile, vérifier
la prochaine séance, les états vides et les liens ; ouvrir la gestion d'une
partie comme MJ ; vérifier chaque onglet, une invitation, son annulation et le
retrait d'un joueur ; tenter la même URL avec un autre compte et vérifier le
refus.

### Réalisée

- Les contrats visuels, l'accessibilité structurelle et le responsive sont
  couverts par les tests de composants Tailwind-only.

### Restante

- parcours manuel dans un navigateur avec authentification réelle ;
- vérification des captures desktop/mobile et des retours réseau.

## Commits importants

- `190288a` — contrats dashboard et invitations ;
- `2f093a0` — persistance des invitations ;
- `139e628`, `717994d`, `96b3203`, `e9d29af` — workflow et API invitations ;
- `ba71541` — roster protégé ;
- `dd3e201`, `5f7c221` — agrégations et API dashboard ;
- `190abfd` — dashboard authentifié ;
- `889249b` — interface de gestion MJ ;
- `395ef57` — origine des mutations de candidatures ;
- `b01a086` — intégration PostgreSQL dashboard/gestion.

## Décisions associées

- [`004-f08-invitations.md`](../decisions/004-f08-invitations.md) — ajouter
  la table et le workflow d'invitations dans F08 afin de couvrir le besoin MVP.

## Évolutions datées

| Date | Évolution | Impact | Référence |
| --- | --- | --- | --- |
| 2026-09-06 | Ajout du workflow complet d'invitation et de la gestion MJ | Dashboard, roster et invitations sont livrés dans une seule PR | branche `feat/dashboard-and-gm-management` |
