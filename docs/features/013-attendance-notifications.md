# F07 — Présences, absences et notifications Discord

## Identifiant

F07

## Statut

`IN_PROGRESS`

> La Pull Request n’est pas encore ouverte. Le statut deviendra `IN_REVIEW`
> uniquement après l’ouverture effective de la PR.

## Branche

`feat/game-messaging`

## Lien ou numéro de Pull Request

Non créée automatiquement : `gh` n’est pas installé dans l’environnement.
Ouverture manuelle : https://github.com/thomasO82/jdr_hub/pull/new/feat/attendance-notifications

## Dates de début et de fin

- Début : 2026-09-06
- Fin : 2026-09-06

## Dépendances

### Prévues

- F01 — authentification Discord et sessions ;
- F04 — membres actifs et autorisation par partie ;
- F06 — séances planifiées.

### Réalisées ou constatées

- Contrats et schémas F01, F04 et F06 présents sur `develop` au démarrage de
  cette branche.
- Le bot Discord est configuré uniquement par variable d’environnement.

### Restantes

- F09 raccordera ultérieurement la validation d’une séance à l’XP.
- La messagerie par partie, SSE et Redis Streams sont reportés dans F07B,
  branche dédiée `feat/game-messaging` après fusion de F07.

## Contexte

### Prévu

Permettre à un membre actif de signaler une absence pour une séance planifiée,
prévenir le MJ dans l’application et par DM Discord, puis permettre au MJ de
valider les présences.

### Réalisé

Le modèle distingue `PENDING`, `PRESENT`, `ABSENT` et `EXCUSED`. Une absence
déclarée est persistée en `EXCUSED`, crée une notification interne et ajoute
une livraison Discord idempotente. Le MJ peut clôturer la séance en validant
les entrées de membres actifs.

### Restant à faire

Les notifications push natives, l’XP et la messagerie de groupe par partie ne
font pas partie de cette branche.

## Addendum du 2026-10-13 — consentement Discord facultatif

La décision 006 (`docs/decisions/006-discord-absence-notifications-and-server-consent.md`)
réactive les DMs d'absence comme complément facultatif aux notifications
internes. Elle supersède la décision 005 uniquement sur le retrait des DMs ;
le chat de partie reste exclusivement dans JDR Hub.

- après la création du compte, l'utilisateur peut autoriser l'ajout du bot au
  serveur Discord privé dédié ; les comptes existants peuvent activer cette
  option depuis leur profil ;
- l'outbox reçoit une livraison DM seulement après consentement du MJ et
  confirmation d'adhésion ; un refus ou un échec conserve la notification
  interne ;
- aucun DM rétroactif n'est créé pour les absences antérieures au consentement.
  Le bot doit être déjà membre du serveur et n'a besoin que de la permission
  Discord `CREATE_INSTANT_INVITE` ([documentation Discord](https://docs.discord.com/developers/resources/guild#add-guild-member)) ;
- aucun contenu de chat ni donnée privée de partie n'est envoyé à Discord ;
- l'implémentation est en cours sur `feat/game-messaging` et n'est pas déclarée
  fusionnée.

## Besoin utilisateur

### Prévu

Signaler rapidement une absence depuis le planning et permettre au MJ de la
retrouver sans dépendre uniquement de Discord.

### Réalisé

Le planning desktop et mobile ouvrent le même dialogue de confirmation. Le
shell partagé affiche une cloche avec compteur non lu, panneau navigable au
clavier, états chargement/vide/erreur et lien vers la séance.

### Restant à faire

Aucun parcours de chat n’est ajouté ici ; il est documenté séparément dans la
conception F07/F07B.

## Périmètre prévu

- contrats Zod et politiques d’autorisation de présence ;
- migration PostgreSQL additive ;
- DM Discord serveur avec retry et idempotence ;
- routes d’absence, validation, lecture et marquage des notifications ;
- interface responsive de notification et déclaration d’absence.

## Fonctionnalités effectivement réalisées

- `packages/shared/src/attendance.ts` avec schémas stricts et bornés ;
- tables `session_attendance`, `notifications` et
  `notification_deliveries`, migrations `0006_attendance_notifications` et
  `0007_equal_hedge_knight` pour le bail de traitement outbox ;
- repository transactionnel d’absence et validation MJ ;
- adaptateur Discord natif `fetch` v10, ouverture/réutilisation de DM,
  `allowed_mentions: { parse: [] }`, contenu borné et erreurs internes sûres ;
- worker de livraison toutes les 30 secondes, cinq tentatives maximum,
  backoff borné, clé Discord compacte et reprise des traitements expirés ;
- routes `POST /sessions/:id/absence`,
  `POST /sessions/:id/attendance`, `GET /notifications` et
  `POST /notifications/:id/read` ;
- cloche/panneau de notifications, dialogue d’absence et raccordement au
  planning desktop/mobile avec Tailwind uniquement ;
- configuration Compose et `.env.example` sans secret réel.

### Addendum du 2026-10-13 — interface de consentement

- après connexion, un panneau non bloquant explique l’adhésion facultative au
  serveur Discord privé réservé au bot et permet de différer le choix ;
- la page privée `/profil` permet de démarrer l’autorisation Discord plus tard
  et présente les retours de réussite, refus ou indisponibilité ;
- l’interface précise que les notifications restent disponibles dans JDR Hub
  et que les messages de partie ne sont jamais envoyés à Discord ;
- la page d’accueil conserve un lien vers les préférences du profil après le
  masquage du panneau d’onboarding.

## Parcours utilisateur

### Prévu

1. Un membre authentifié ouvre son planning.
2. Il choisit une séance confirmée et confirme son absence.
3. Le MJ retrouve une notification interne et reçoit un DM Discord uniquement
   s'il a accepté l'adhésion au serveur privé.
4. Le MJ valide les présences de la séance.

### Réalisé

Le bouton du planning ouvre le dialogue pour la séance à venir sélectionnée.
La confirmation envoie `{}` au serveur, affiche le succès et laisse la
notification interne lisible dans la cloche. Les erreurs sont traduites en
français. Le MJ peut envoyer la liste de présences validées par la route dédiée.

### Restant à faire

La réception Discord réelle dépend du token bot fourni par l'environnement de
déploiement et n'a pas été appelée pendant les tests. Les flux OAuth et la file
de livraison utilisent des clients simulés pendant les tests.

## Règles métier

### Prévues

- seul un membre actif d’une séance planifiée peut déclarer son absence ;
- une déclaration crée `EXCUSED` et ne modifie pas le roster ;
- le MJ propriétaire valide les membres actifs et clôture la séance ;
- un rejeu ne crée pas de notification ni de livraison en double ;
- un échec Discord ne supprime pas l’événement local.

### Implémentées

- contrôle de la partie `OPEN`/`ACTIVE`, séance `SCHEDULED` et membre `ACTIVE` ;
- autorisation par propriétaire pour la validation ;
- unicités SQL sur `(session_id, user_id)`, clé logique de notification et
  `(notification_id, channel)` ;
- transaction absence → notification → livraison ;
- reprise des erreurs réseau/rate limit, dead-letter après cinq tentatives ;
- bail de cinq minutes pour reprendre une livraison restée `PROCESSING` après
  l’arrêt d’un worker ;
- rejeu identique d’une validation terminée accepté sans nouvel effet ;
- partie fermée, séance annulée/terminée, membre quitté et utilisateur
  extérieur refusés.

### Non couvertes ou reportées

- attribution d’XP après validation ;
- absence d’un utilisateur dont le lien Discord est invalide côté fournisseur ;
- chat, SSE et Redis Streams dans F07B.

## Architecture et choix techniques

### Prévu

Séparer handlers, services et repositories, conserver PostgreSQL comme source
de vérité et livrer Discord par une file transactionnelle réessayable.

### Réalisé

Les handlers Hono valident le transport, contrôlent session/origine/rate limit
et appellent des services indépendants de Hono. Les repositories Drizzle sont
la frontière de persistance. Le token bot est parsé une fois au démarrage et
reste serveur. Le worker réclame les livraisons avec `FOR UPDATE SKIP LOCKED`.

### Restant à faire

Le worker reste dans le processus API monolithique du MVP. Une évolution vers
un exécuteur séparé n’est pas nécessaire avant une mesure de charge.

## Modèle de données et migrations

### Prévu

Ajouter les présences, notifications et livraisons Discord avec clés
étrangères, index, contraintes d’idempotence et états de retry.

### Réalisé

La migration additive `packages/database/migrations/0006_attendance_notifications.sql`
crée les trois tables, leurs index, longueurs bornées, cascades ciblées et
contraintes d’unicité. `0007_equal_hedge_knight.sql` ajoute le champ nullable
`processing_at` sans modifier les données existantes. Aucun objet F01–F06
n’est supprimé ou modifié.

### Restant à faire

Les migrations d’XP et de messagerie appartiennent aux fonctionnalités
ultérieures.

## Routes API

### Prévues

- `POST /sessions/:id/absence` ;
- `POST /sessions/:id/attendance` ;
- `GET /notifications` ;
- `POST /notifications/:id/read`.

### Implémentées

- les quatre routes exigent une session valide ;
- les mutations exigent l’origine applicative et un payload Zod strict ;
- les erreurs métier utilisent `ATTENDANCE_ERROR` ou `NOTIFICATION_ERROR`, les
  erreurs inattendues `INTERNAL_ERROR`, sans révéler les détails Discord ;
- les projections ne contiennent ni token, ni `discordId`, ni contenu
  fournisseur.

### Restantes

Aucune route F07 restante. Les routes chat/SSE sont F07B.

## Interface et composants

### Prévus

- cloche et panneau de notifications ;
- dialogue d’absence partagé ;
- états loading/empty/error/success ;
- adaptation desktop/mobile.

### Réalisés

- `NotificationBell` et `NotificationPanel` dans le shell partagé ;
- `AbsenceDialog` avec confirmation, succès, erreur générique, Escape et
  focus-visible, restauration du focus et piège clavier ;
- client web avec `credentials: 'include'`, origine de mutation et messages
  français ;
- action d’absence sur les cartes de planning et bouton de la colonne latérale.

### Restants

- vérification visuelle et interaction en vrai navigateur, indisponible dans
  cette session (aucun plugin Browser, Playwright absent et démarrage local
  refusé par le bac à sable) ;
- messagerie de groupe par partie dans F07B.

## Tests

### Prévus

- contrats, politiques, services, retry et rollback ;
- contraintes de schéma et migration ;
- routes 401/403/404/409/429 ;
- clients et états UI ;
- build et vérification Compose.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm exec vitest run packages/shared/tests/attendance.test.ts apps/api/tests/unit/attendance/policy.test.ts` | 7 tests verts | 2026-09-06 |
| `pnpm exec vitest run packages/database/tests/attendance-schema.test.ts` | 3 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/api/tests/unit/notifications/config.test.ts apps/api/tests/unit/notifications/discord-client.test.ts` | 6 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/api/tests/unit/attendance/services.test.ts apps/api/tests/unit/notifications/services.test.ts apps/api/tests/unit/notifications/worker.test.ts` | 13 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts` | 8 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/web/tests/notifications-api.test.ts apps/web/tests/attendance-api.test.ts apps/web/tests/notifications-visual.test.ts apps/web/tests/attendance-visual.test.ts apps/web/tests/tailwind-only.test.ts` | 11 tests verts | 2026-09-06 |
| `pnpm test` | 98 fichiers, 248 tests verts | 2026-09-06 |
| `pnpm test:integration` avec PostgreSQL de test | 3 tests verts : transactions, rejeu, reprise outbox | 2026-09-06 |
| `pnpm lint` | 4 packages verts | 2026-09-06 |
| `pnpm typecheck` | 4 packages verts | 2026-09-06 |
| `pnpm --filter @jdr-hub/api build` | Build API vert | 2026-09-06 |
| `pnpm --filter @jdr-hub/web build` | Build Next/Turbopack vert | 2026-09-06 |
| `docker compose -f docker-compose.yml up --build --wait --wait-timeout 120` | API, web, proxy et PostgreSQL healthy ; migration appliquée | 2026-09-06 |
| `curl http://127.0.0.1:18080/api/health` | Réponse JSON `status: ok` | 2026-09-06 |
| `pnpm exec vitest run apps/web/tests/discord-guild-consent.test.ts` | 11 tests UI/API/profil verts ; échecs Red observés pour le chargement et l’erreur d’onboarding | 2026-10-13 |
| `pnpm test` | 108 fichiers, 306 tests verts | 2026-10-13 |
| `pnpm lint` | 4 packages verts | 2026-10-13 |
| `pnpm typecheck` | 4 packages verts | 2026-10-13 |
| `pnpm build` | Builds API et Next.js verts ; avertissement Next.js sur plusieurs lockfiles | 2026-10-13 |
| `pnpm test:integration` avec PostgreSQL et Redis éphémères sur `127.0.0.1:15432/16379` | 8 fichiers, 17 tests verts | 2026-10-13 |

### Restants

- test E2E Discord simulé et vérification manuelle du parcours dans un
  navigateur ; aucun plugin Browser n’est disponible et Playwright n’est pas
  installé (`pnpm exec playwright --version` échoue).

## Preuve TDD Red, Green, Refactor

### Red

- Les tests de contrats, schéma, adaptateur, services, routes et interface ont
  été écrits avant leurs modules respectifs.
- Les commandes ciblées ont échoué avec des modules absents, comme attendu.
- Pour l’interface de consentement, le test a échoué car le client API et le
  composant n’existaient pas ; un test ajouté ensuite a aussi échoué car la page
  d’accueil ne permettait pas d’accéder au profil après « Plus tard ».
- Pour l’onboarding, les tests ont d’abord échoué car les états de chargement et
  d’erreur étaient masqués avant leur rendu ; la condition de masquage a été
  resserrée.

### Green

- Les implémentations minimales ont fait passer les tests ciblés : 7, 3, 6,
  13, 8 puis 11 tests selon les tranches.
- Les 11 tests du client API, du consentement et du profil passent ; la suite
  complète compte 306 tests verts.
- Une reconstruction des packages `shared`/`database` a été nécessaire avant
  les typechecks, car leurs déclarations `dist` étaient obsolètes.
- La suite PostgreSQL a d’abord révélé le verrouillage interdit d’un `LEFT
  JOIN` nullable ; le verrou a été isolé sur la ligne de séance.

### Refactor

- La génération du message Discord a été isolée pour exclure les identifiants
  internes et nettoyer les mentions.
- Le worker centralise la classification sûre des erreurs et le backoff.
- Le shell conserve une seule cloche responsive et le planning réutilise un
  dialogue unique desktop/mobile.
- Le panneau d’onboarding et le réglage de profil réutilisent le même composant
  de présentation ; l’état d’adhésion reste fourni par `/me`.
- La page `/profil`, le shell et la cloche de notifications sont rendables par
  le harness SSR de test sans exposer de configuration Discord sensible.

## Sécurité

- Token bot uniquement dans `DISCORD_BOT_TOKEN`, jamais dans le code, le
  frontend, les tests ou les documents ;
- identifiants Discord validés, contenu limité à 2 000 caractères, mentions
  Discord désactivées et erreurs fournisseur transformées en codes bornés ;
- droits calculés côté serveur par session, propriétaire et roster actif ;
- origine stricte sur les mutations, cookies de session existants et rate limits
  par utilisateur ;
- validation Zod stricte avec tailles maximales et refus des propriétés
  inconnues ;
- transaction d’absence et clés uniques contre les doublons ;
- clé Discord dérivée par empreinte et limitée à 25 caractères ;
- bail de traitement et reprise transactionnelle des livraisons `PROCESSING` ;
- PostgreSQL interne au réseau Docker, conteneurs non-root, images épinglées et
  secrets de vérification manifestement fictifs ;
- réponses et interface sans stack trace, token, `discordId` ou détail de
  fournisseur.
- l’ajout au serveur demande un clic distinct puis réutilise le flux OAuth
  `guilds.join` protégé par `state` ; « Plus tard » ne coupe pas les
  notifications JDR Hub ; `/profil` est exclu de l’indexation.

## Vérifications manuelles

- Ouvrir `/planning` sur mobile et desktop ;
- ouvrir la cloche, vérifier le compteur, les états vide/erreur et le lien vers
  une séance ;
- ouvrir « Signaler une absence », annuler, confirmer et vérifier l’état de
  succès ;
- vérifier que la requête envoyée est `{}` et que l’absence répétée reste
  idempotente ;
- fournir un token bot de test dans l’environnement uniquement pour vérifier la
  livraison Discord dans un espace contrôlé.

## Limites connues et travaux reportés

- le lien d’une notification utilise l’identifiant de séance dans un fragment
  de planning ; une route canonique de séance pourra être ajoutée lors du
  dashboard ;
- le DM Discord est asynchrone : une indisponibilité du fournisseur laisse la
  notification interne disponible et marque la livraison pour retry ou échec ;
- les tests E2E Discord restent à ajouter dans un harness isolé ;
- F07B conserve séparément la conversation textuelle par partie, SSE et Redis
  Streams ; aucun départ de salon Discord ne déclenche d’action.

## Documentation consultée

`AGENTS.md`, `docs/security/ai-access-policy.md`,
`docs/security/security-requirements.md`,
`docs/specifications/cahier-des-charges.md`, `docs/implementation-plan.md`,
les maquettes desktop/mobile et le design system du dépôt,
`docs/superpowers/specs/2026-09-06-attendance-notifications-and-game-messaging-design.md`,
`docs/superpowers/plans/2026-09-06-attendance-notifications.md`,
`docs/decisions/003-in-app-game-messaging.md`.

## Design

Brouillon généré et conservé sur le canvas Superdesign :
https://superdesign.dev/teams/7d4c232a-149e-4854-94a5-097beff389ba/projects/b4d5c24e-7ef4-491c-b0f0-68d58ac81378

La récupération HTML automatique du brouillon a rencontré deux erreurs DNS
temporaires du registre npm ; l’implémentation finale a donc été contrôlée par
le design system local, les tests Tailwind-only et le build Next.

## Addendum du 2026-10-13 — décision 006 en cours d'implémentation

La décision 006 a été acceptée : chaque absence garde sa notification interne ;
un DM Discord complémentaire est mis en file uniquement si le MJ a accepté
l'adhésion du bot au serveur privé. Le compte reste utilisable en cas de refus,
d'indisponibilité Discord ou de DM bloqué. Aucun texte de chat n'est transmis.

### Preuve TDD de la reprise serveur

- Red : le test d'intégration PostgreSQL d'un MJ ayant rejoint le serveur
  recevait `delivery: undefined`; le callback lancé depuis une autre session
  consommait également l'autorisation légitime.
- Green : l'outbox est créée dans la transaction d'absence uniquement quand
  `discord_server_joined_at` est renseigné ; la consommation OAuth vérifie
  atomiquement compte et session avant de marquer l'état consommé.
- Vérifications du 2026-10-13 : `pnpm test` — 108 fichiers / 306 tests verts ;
  `pnpm run lint` et `pnpm run typecheck` verts ; build API/web vert ;
  intégrations `pnpm test:integration` — 8 fichiers / 17 tests verts ;
  configuration Compose avec valeurs fictives valide. Le build Next a dû être
  relancé hors du bac à sable après un refus d'ouverture de port Turbopack.
- L'UI de consentement/profil et la réception Discord réelle restent à faire ;
  le statut demeure `IN_PROGRESS`.
- Limite TDD à ne pas masquer : les tests unitaires du client Discord et du
  worker ont été ajoutés après leur code et n'ont pas eu de phase Red observée.
  Cette preuve manque avant toute PR ; les tests PostgreSQL de l'outbox et du
  callback OAuth ont, eux, échoué avant leur correction.
