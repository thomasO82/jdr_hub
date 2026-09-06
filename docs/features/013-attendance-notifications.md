# F07 — Présences, absences et notifications Discord

## Identifiant

F07

## Statut

`IN_PROGRESS`

> La Pull Request n’est pas encore ouverte. Le statut deviendra `IN_REVIEW`
> uniquement après l’ouverture effective de la PR.

## Branche

`feat/attendance-notifications`

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
  `notification_deliveries`, migration `0006_attendance_notifications` ;
- repository transactionnel d’absence et validation MJ ;
- adaptateur Discord natif `fetch` v10, ouverture/réutilisation de DM,
  `allowed_mentions: { parse: [] }`, contenu borné et erreurs internes sûres ;
- worker de livraison toutes les 30 secondes, cinq tentatives maximum,
  backoff borné et statuts `SENT`/`FAILED` ;
- routes `POST /sessions/:id/absence`,
  `POST /sessions/:id/attendance`, `GET /notifications` et
  `POST /notifications/:id/read` ;
- cloche/panneau de notifications, dialogue d’absence et raccordement au
  planning desktop/mobile avec Tailwind uniquement ;
- configuration Compose et `.env.example` sans secret réel.

## Parcours utilisateur

### Prévu

1. Un membre authentifié ouvre son planning.
2. Il choisit une séance confirmée et confirme son absence.
3. Le MJ retrouve une notification interne et reçoit un DM Discord.
4. Le MJ valide les présences de la séance.

### Réalisé

Le bouton du planning ouvre le dialogue pour la séance à venir sélectionnée.
La confirmation envoie `{}` au serveur, affiche le succès et laisse la
notification interne lisible dans la cloche. Les erreurs sont traduites en
français. Le MJ peut envoyer la liste de présences validées par la route dédiée.

### Restant à faire

La réception Discord réelle dépend d’un token bot fourni par l’environnement
de déploiement et n’a pas été appelée pendant les tests.

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
contraintes d’unicité. Aucun objet F01–F06 n’est supprimé ou modifié.

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
- les erreurs publiques utilisent `ATTENDANCE_ERROR` ou
  `NOTIFICATION_ERROR` et ne révèlent pas les détails Discord ;
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
  focus-visible ;
- client web avec `credentials: 'include'`, origine de mutation et messages
  français ;
- action d’absence sur les cartes de planning et bouton de la colonne latérale.

### Restants

- capture E2E avec un vrai navigateur et fournisseur Discord simulé ;
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
| `pnpm exec vitest run apps/api/tests/unit/attendance/services.test.ts apps/api/tests/unit/notifications/services.test.ts apps/api/tests/unit/notifications/worker.test.ts` | 10 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts` | 6 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/web/tests/notifications-api.test.ts apps/web/tests/attendance-api.test.ts apps/web/tests/notifications-visual.test.ts apps/web/tests/attendance-visual.test.ts apps/web/tests/tailwind-only.test.ts` | 11 tests verts | 2026-09-06 |
| `pnpm test` | 98 fichiers, 243 tests verts | 2026-09-06 |
| `pnpm lint` | 4 packages verts | 2026-09-06 |
| `pnpm typecheck` | 4 packages verts | 2026-09-06 |
| `pnpm --filter @jdr-hub/api build` | Build API vert | 2026-09-06 |
| `pnpm --filter @jdr-hub/web build` | Build Next/Turbopack vert | 2026-09-06 |
| `docker compose -f docker-compose.yml up --build --wait --wait-timeout 120` | API, web, proxy et PostgreSQL healthy ; migration appliquée | 2026-09-06 |
| `curl http://127.0.0.1:18080/api/health` | Réponse JSON `status: ok` | 2026-09-06 |

### Restants

- test d’intégration PostgreSQL dédié aux repositories ;
- test E2E Discord simulé et vérification manuelle du parcours dans un
  navigateur.

## Preuve TDD Red, Green, Refactor

### Red

- Les tests de contrats, schéma, adaptateur, services, routes et interface ont
  été écrits avant leurs modules respectifs.
- Les commandes ciblées ont échoué avec des modules absents, comme attendu.

### Green

- Les implémentations minimales ont fait passer les tests ciblés : 7, 3, 6,
  10, 6 puis 11 tests selon les tranches.
- Une reconstruction des packages `shared`/`database` a été nécessaire avant
  les typechecks, car leurs déclarations `dist` étaient obsolètes.

### Refactor

- La génération du message Discord a été isolée pour exclure les identifiants
  internes et nettoyer les mentions.
- Le worker centralise la classification sûre des erreurs et le backoff.
- Le shell conserve une seule cloche responsive et le planning réutilise un
  dialogue unique desktop/mobile.

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
- PostgreSQL interne au réseau Docker, conteneurs non-root, images épinglées et
  secrets de vérification manifestement fictifs ;
- réponses et interface sans stack trace, token, `discordId` ou détail de
  fournisseur.

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
- les tests d’intégration PostgreSQL et E2E Discord restent à ajouter dans un
  harness isolé ;
- F07B implémentera séparément la conversation textuelle par partie, SSE et
  Redis Streams ; aucun départ de salon Discord ne déclenche d’action.

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
