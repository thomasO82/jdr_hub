# Présences et notifications Discord Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de déclarer une absence, de valider les présences d’une séance et de notifier le MJ dans JDR Hub et par DM Discord.

**Architecture:** Le module `attendance` porte les règles de présence et le module `notifications` porte les notifications internes et la livraison Discord. PostgreSQL conserve l’absence, la notification et un outbox transactionnel ; un worker réessayable appelle Discord via un adaptateur injecté, sans exposer de token au frontend.

**Tech Stack:** pnpm, TypeScript strict, Hono, Zod, Drizzle ORM, PostgreSQL, Next.js App Router, Tailwind CSS, Vitest et `fetch` natif pour l’API Discord.

**Spec:** `docs/superpowers/specs/2026-09-06-attendance-notifications-and-game-messaging-design.md`

## Global Constraints

- Respecter `AGENTS.md`, `docs/security/ai-access-policy.md` et `docs/security/security-requirements.md`.
- Écrire les tests Red avant chaque implémentation métier et ne modifier aucun test fusionné.
- Utiliser `PENDING`, `PRESENT`, `ABSENT` et `EXCUSED` pour les états de présence ; une absence déclarée crée `EXCUSED`.
- Le serveur reste l’unique source de l’identité, du roster, du propriétaire et des permissions.
- Les mutations authentifiées vérifient l’origine applicative, la session et un rate limit borné.
- Les messages Discord sont limités, échappés, sans `@everyone` ni `@here`, et ne contiennent aucun secret, identifiant interne ou horaire privé inutile.
- Les vrais tokens Discord restent dans l’environnement d’exécution ; les tests utilisent uniquement des valeurs fictives.
- Le frontend n’importe jamais `packages/database`, n’affiche jamais une exception brute et utilise uniquement Tailwind dans `apps/web/app/globals.css`.
- Ajouter une dépendance n’est autorisé que si elle est nécessaire ; F07 utilise `fetch` natif et n’ajoute aucune dépendance npm.

---

### Task 1: Contrats partagés et politiques de présence

**Files:**
- Create: `packages/shared/src/attendance.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/attendance.test.ts`
- Create: `apps/api/src/modules/attendance/policy.ts`
- Create: `apps/api/tests/unit/attendance/policy.test.ts`

**Interfaces:**
- `attendanceStatusSchema`: `PENDING | PRESENT | ABSENT | EXCUSED`.
- `absenceCommandSchema`: objet strict vide `{}` afin qu’aucun texte utilisateur ne soit transmis automatiquement à Discord.
- `attendanceCommandSchema`: `{ entries: Array<{ userId: UUID; status: PRESENT | ABSENT | EXCUSED }> }`, entre 1 et 50 entrées.
- `notificationQuerySchema`: `{ cursor?: string; limit: 1..50 }` avec valeur par défaut `20`.
- `notificationTypeSchema`: `ABSENCE_REPORTED`.
- `notificationChannelSchema`: `IN_APP | DISCORD_DM`.
- `AttendanceEntry`: `{ userId: string; status: Exclude<AttendanceStatus, 'PENDING'> }`.
- `AttendanceRecord`: `{ id: string; sessionId: string; userId: string; status: AttendanceStatus; createdAt: Date; updatedAt: Date }`.
- `SessionContext`: `{ sessionId: string; gameId: string; ownerId: string; gameStatus: GameStatus; sessionStatus: SessionStatus; memberStatus: string; memberDiscordId: string | null; ownerDiscordId: string | null }`.
- `NotificationView`: `{ id: string; type: NotificationType; recipientId: string; gameId: string; sessionId: string; actorId: string; title: string; body: string; readAt: string | null; createdAt: string }` is the serialized frontend projection.
- `NotificationsPage`: `{ items: NotificationView[]; nextCursor: string | null; unreadCount: number }`.
- `DiscordDelivery`: `{ id: string; notificationId: string; recipientDiscordId: string; content: string; status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED'; attempts: number; nextAttemptAt: Date | null; lastErrorCode: string | null }`.
- `canReportAbsence(input: { sessionStatus: SessionStatus; gameStatus: GameStatus; memberStatus: string; attendanceStatus: AttendanceStatus | null }): boolean`.
- `canValidateAttendance(input: { sessionStatus: SessionStatus; gameStatus: GameStatus; ownerId: string; actorId: string }): boolean`.

- [ ] **Step 1: Écrire les tests Red des contrats.** Couvrir les statuts inconnus, les propriétés supplémentaires, les UUID invalides, les listes vides ou trop longues, les limites de pagination et la distinction entre absence annoncée (`EXCUSED`) et absence finale (`ABSENT`).

```ts
it('accepts a strict absence command and rejects a client-provided reason', () => {
  expect(absenceCommandSchema.safeParse({}).success).toBe(true)
  expect(absenceCommandSchema.safeParse({ reason: 'texte' }).success).toBe(false)
})
```

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run packages/shared/tests/attendance.test.ts apps/api/tests/unit/attendance/policy.test.ts`

Expected: échec car les contrats et la politique n’existent pas.

- [ ] **Step 3: Implémenter les schémas et politiques minimaux.** Réutiliser les enums de séances et de parties via leurs types partagés, refuser une séance `CANCELLED` ou `COMPLETED` pour une absence, refuser un membre non `ACTIVE`, et réserver la validation au propriétaire.

- [ ] **Step 4: Rejouer les tests ciblés et refactoriser.** Vérifier que les fonctions restent pures, sans Hono, Drizzle, `process.env` ou appel Discord.

- [ ] **Step 5: Commiter.**

```bash
git add packages/shared/src/attendance.ts packages/shared/src/index.ts packages/shared/tests/attendance.test.ts apps/api/src/modules/attendance/policy.ts apps/api/tests/unit/attendance/policy.test.ts
git commit -m "feat: define attendance and notification contracts"
```

### Task 2: Schéma PostgreSQL et migration additive

**Files:**
- Create: `packages/database/src/schema/attendance.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0006_attendance_notifications.sql`
- Modify: `packages/database/migrations/meta/_journal.json`
- Create: `packages/database/migrations/meta/0006_snapshot.json`
- Create: `packages/database/tests/attendance-schema.test.ts`

**Interfaces:**
- `attendanceSchema` exports `sessionAttendance`, `notifications` and `notificationDeliveries`.
- `sessionAttendance` references `gameSessions` and `users`, has a unique `(sessionId, userId)`, a status bounded to 16 characters, timestamps and indexes by session/user/status.
- `notifications` references `games`, `gameSessions`, `users` and the MJ recipient where applicable, stores `ABSENCE_REPORTED`, a read timestamp and a stable logical key.
- `notificationDeliveries` references `notifications`, stores `DISCORD_DM`, `PENDING | PROCESSING | SENT | FAILED`, attempts, retry time, provider message id and a sanitized failure code; unique `(notificationId, channel)` prevents duplicate delivery records.

- [ ] **Step 1: Écrire les tests Red du schéma.** Vérifier les exports, clés étrangères, cascades limitées, longueurs, index, unicités et l’impossibilité de créer deux absences ou deux livraisons Discord pour le même événement.

- [ ] **Step 2: Exécuter le test Red.**

Run: `pnpm exec vitest run packages/database/tests/attendance-schema.test.ts`

Expected: échec car le module et les tables n’existent pas.

- [ ] **Step 3: Implémenter le schéma Drizzle.** Utiliser `uuid`, `timestamptz`, `varchar` borné et `jsonb` uniquement pour une projection interne strictement typée si nécessaire ; ne pas stocker de token, contenu Discord brut ou donnée personnelle non nécessaire.

- [ ] **Step 4: Générer et relire la migration.** La migration doit uniquement créer les nouvelles tables, contraintes et index, sans modifier les tables F01–F06.

- [ ] **Step 5: Exécuter les tests et le typecheck database.**

Run: `pnpm exec vitest run packages/database/tests/attendance-schema.test.ts && pnpm --filter @jdr-hub/database typecheck`

- [ ] **Step 6: Commiter.**

```bash
git add packages/database/src/schema/attendance.ts packages/database/src/index.ts packages/database/migrations/0006_attendance_notifications.sql packages/database/migrations/meta/_journal.json packages/database/migrations/meta/0006_snapshot.json packages/database/tests/attendance-schema.test.ts
git commit -m "feat: add attendance and notification schema"
```

### Task 3: Configuration et adaptateur DM Discord

**Files:**
- Create: `apps/api/src/modules/notifications/config.ts`
- Create: `apps/api/src/modules/notifications/discord-client.ts`
- Create: `apps/api/tests/unit/notifications/config.test.ts`
- Create: `apps/api/tests/unit/notifications/discord-client.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Interfaces:**
- `NotificationConfig`: `{ botToken: string; isProduction: boolean }`.
- `parseNotificationConfig(environment: unknown): NotificationConfig` reads and validates `DISCORD_BOT_TOKEN` once at startup.
- `DiscordNotifier.sendDirectMessage(input: { recipientDiscordId: string; content: string; idempotencyKey: string }): Promise<{ providerMessageId: string }>`.
- `createDiscordNotifier(config: NotificationConfig, fetcher?: FetchFunction): DiscordNotifier` calls Discord API v10 through `fetch` only.

- [ ] **Step 1: Écrire les tests Red de configuration et HTTP.** Couvrir token absent, identifiant Discord invalide, header `Authorization: Bot …`, création/réutilisation du DM, publication du texte avec `allowed_mentions: { parse: [] }`, réponse Discord invalide, 429 et erreurs réseau sans fuite du token.

```ts
it('disables all Discord mentions in an absence DM', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'dm-message-1' }), { status: 200 }))
  const notifier = createDiscordNotifier({ botToken: 'fake-bot-token', isProduction: false }, fetcher)
  await notifier.sendDirectMessage({ recipientDiscordId: '100000000000000001', content: 'Une absence a été signalée.', idempotencyKey: 'absence-1' })
  expect(JSON.parse(fetcher.mock.calls[1][1].body as string).allowed_mentions).toEqual({ parse: [] })
})
```

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/notifications/config.test.ts apps/api/tests/unit/notifications/discord-client.test.ts`

Expected: échec car la configuration et l’adaptateur n’existent pas.

- [ ] **Step 3: Implémenter l’adaptateur.** Ouvrir le DM avec l’identifiant Discord du MJ, envoyer un texte généré côté serveur, borner son contenu à 2 000 caractères et transformer chaque réponse externe en erreur interne typée sans inclure le corps Discord dans les logs ou réponses HTTP.

- [ ] **Step 4: Ajouter la configuration Compose sans secret réel.** Déclarer `DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN:?DISCORD_BOT_TOKEN must be set}` dans `api-hono` et un exemple manifestement factice dans `.env.example`; ne pas lire l’environnement depuis le client Discord ou un handler.

- [ ] **Step 5: Brancher la configuration au démarrage et rejouer les tests.**

Run: `pnpm exec vitest run apps/api/tests/unit/notifications/config.test.ts apps/api/tests/unit/notifications/discord-client.test.ts && pnpm --filter @jdr-hub/api typecheck`

- [ ] **Step 6: Commiter.**

```bash
git add apps/api/src/modules/notifications/config.ts apps/api/src/modules/notifications/discord-client.ts apps/api/tests/unit/notifications/config.test.ts apps/api/tests/unit/notifications/discord-client.test.ts apps/api/src/index.ts docker-compose.yml .env.example
git commit -m "feat: add Discord notification adapter"
```

### Task 4: Repositories et services d’absence, notification et retry

**Files:**
- Create: `apps/api/src/modules/attendance/repository.ts`
- Create: `apps/api/src/modules/attendance/services/report-absence.ts`
- Create: `apps/api/src/modules/attendance/services/validate-attendance.ts`
- Create: `apps/api/src/modules/notifications/repository.ts`
- Create: `apps/api/src/modules/notifications/services/list-notifications.ts`
- Create: `apps/api/src/modules/notifications/services/mark-notification-read.ts`
- Create: `apps/api/src/modules/notifications/services/process-discord-deliveries.ts`
- Create: `apps/api/src/modules/notifications/worker.ts`
- Create: `apps/api/tests/helpers/in-memory-attendance-repository.ts`
- Create: `apps/api/tests/helpers/in-memory-notifications-repository.ts`
- Create: `apps/api/tests/unit/attendance/services.test.ts`
- Create: `apps/api/tests/unit/notifications/services.test.ts`
- Create: `apps/api/tests/unit/notifications/worker.test.ts`

**Interfaces:**
- `AttendanceRepository.findSessionContext(sessionId: string): Promise<SessionContext | null>` returns session, game owner/status and member state without exposing unrelated users.
- `AttendanceRepository.reportAbsence(input: { sessionId: string; userId: string; now: Date }): Promise<AbsenceEvent>` creates or returns the idempotent event, attendance row, in-app notification and Discord delivery in one transaction.
- `AttendanceRepository.finalizeAttendance(input: { sessionId: string; ownerId: string; entries: AttendanceEntry[]; now: Date }): Promise<AttendanceRecord[]>` locks the session, validates every target member and marks the session `COMPLETED` atomically.
- `NotificationRecord`: `{ id: string; type: NotificationType; recipientId: string; gameId: string; sessionId: string; actorId: string; title: string; body: string; readAt: Date | null; createdAt: Date }` is the API-internal persistence projection; handlers convert its dates to ISO for `NotificationView`.
- `NotificationPageRecord`: `{ items: NotificationRecord[]; nextCursor: string | null; unreadCount: number }` is the repository-internal paginated projection.
- `AbsenceEvent`: `{ attendance: AttendanceRecord; notification: NotificationRecord; delivery: DiscordDelivery }` is the API-internal transaction result.
- `NotificationRepository.listForUser(input: { userId: string; cursor: string | null; limit: number }): Promise<NotificationPageRecord>`.
- `NotificationRepository.markRead(input: { notificationId: string; userId: string; now: Date }): Promise<boolean>` refuses another user’s notification without revealing its existence.
- `NotificationRepository.claimPendingDeliveries(input: { now: Date; limit: number }): Promise<DiscordDelivery[]>`, `markSent`, `markRetryableFailure` and `markPermanentFailure` implement bounded retries with `FOR UPDATE SKIP LOCKED` in PostgreSQL.
- `processDiscordDeliveries(input: { repository: NotificationRepository; notifier: DiscordNotifier; now: () => Date; limit: number }): Promise<number>` sends no more than one provider request per claimed delivery and never throws provider details to HTTP callers.
- `startNotificationWorker(input: { process: () => Promise<number>; intervalMs: number }): () => void` runs the bounded delivery cycle without blocking HTTP startup and returns a shutdown function for tests and process termination.

- [ ] **Step 1: Écrire les tests Red de service.** Couvrir joueur actif, MJ, membre quitté/exclu, séance annulée/terminée, partie fermée, absence répétée idempotente, notification unique, validation MJ, tentative de valider un autre jeu, rollback complet et retry 429/réseau.

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/attendance/services.test.ts apps/api/tests/unit/notifications/services.test.ts`

Expected: échec car les repositories, helpers mémoire et services n’existent pas.

- [ ] **Step 3: Implémenter les helpers mémoire uniquement sous `apps/api/tests/helpers`.** Reproduire les contraintes de la base : unicité de l’absence, autorisation par roster, notification/delivery liés et états de retry observables.

- [ ] **Step 4: Implémenter les services sans Hono ni `process.env`.** Le service d’absence construit un message Discord minimal avec le titre de partie, l’horaire localisé au minimum nécessaire et un lien applicatif générique ; il transmet uniquement l’identifiant Discord au repository/notifier prévu.

- [ ] **Step 5: Implémenter le repository PostgreSQL transactionnel.** Verrouiller la séance et les membres pendant la déclaration/validation, empêcher les effets partiels et ne journaliser qu’un code d’erreur technique borné (`DISCORD_RATE_LIMIT`, `DISCORD_UNAVAILABLE`, etc.). Le worker réclame les livraisons avec `FOR UPDATE SKIP LOCKED`, borne les tentatives à cinq et calcule des délais croissants sans stocker le détail de l’exception externe.

- [ ] **Step 6: Implémenter le worker et rejouer les tests.** L’intervalle de production est de 30 secondes, le worker s’arrête proprement quand l’API se termine et une livraison déjà `SENT` reste idempotente.

- [ ] **Step 7: Vérifier les frontières.**

Run: `pnpm exec vitest run apps/api/tests/unit/attendance/services.test.ts apps/api/tests/unit/notifications/services.test.ts apps/api/tests/unit/notifications/worker.test.ts && rg -n "from 'hono'|process\.env" apps/api/src/modules/attendance apps/api/src/modules/notifications/services apps/api/src/modules/notifications/worker.ts`

Expected: tests verts ; aucun import Hono ou lecture d’environnement dans les services.

- [ ] **Step 8: Commiter.**

```bash
git add apps/api/src/modules/attendance apps/api/src/modules/notifications/repository.ts apps/api/src/modules/notifications/services apps/api/src/modules/notifications/worker.ts apps/api/tests/helpers/in-memory-attendance-repository.ts apps/api/tests/helpers/in-memory-notifications-repository.ts apps/api/tests/unit/attendance/services.test.ts apps/api/tests/unit/notifications/services.test.ts apps/api/tests/unit/notifications/worker.test.ts
git commit -m "feat: implement attendance and notification services"
```

### Task 5: Routes Hono et protection API

**Files:**
- Create: `apps/api/src/modules/attendance/handlers.ts`
- Create: `apps/api/src/modules/attendance/routes.ts`
- Create: `apps/api/src/modules/notifications/handlers.ts`
- Create: `apps/api/src/modules/notifications/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/tests/api/attendance/routes.test.ts`
- Create: `apps/api/tests/api/notifications/routes.test.ts`

**Interfaces:**
- `registerAttendanceRoutes(app, dependencies)` registers `POST /sessions/:id/absence` and `POST /sessions/:id/attendance`.
- `registerNotificationRoutes(app, dependencies)` registers `GET /notifications` and `POST /notifications/:id/read`.
- Handlers call `authenticateUser`, validate only transport data, require the configured origin for mutations, map domain errors to `ATTENDANCE_ERROR` or `NOTIFICATION_ERROR`, and preserve `requestId` only in metadata.

- [ ] **Step 1: Écrire les tests Red des routes.** Vérifier 401 sans session, 403 origine/permission, 404 générique, 409 absence déjà traitée, 429 rate limit, payload inconnu/trop grand, réponse commune et absence de `discordId`, token ou stack trace.

```ts
it('does not reveal whether an outsider can access a session absence', async () => {
  const response = await app.request('/sessions/session-1/absence', { method: 'POST', headers: outsiderHeaders, body: '{}' })
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({ data: null, error: { code: 'ATTENDANCE_ERROR' } })
})
```

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts`

Expected: échec car les routes et handlers n’existent pas.

- [ ] **Step 3: Implémenter les handlers et routes.** Réutiliser les conventions d’authentification existantes, ne jamais accepter `ownerId` ou `userId` pour identifier l’acteur, et ne retourner que des projections nécessaires à l’utilisateur courant.

- [ ] **Step 4: Enregistrer les dépendances au démarrage.** Ajouter les repositories, le notifier et le worker de livraison à `createApiApp`/`startApi`, avec une boucle de retry bornée qui ne bloque pas le serveur HTTP.

- [ ] **Step 5: Rejouer les tests ciblés et le typecheck API.**

Run: `pnpm exec vitest run apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts && pnpm --filter @jdr-hub/api typecheck`

- [ ] **Step 6: Commiter.**

```bash
git add apps/api/src/modules/attendance/handlers.ts apps/api/src/modules/attendance/routes.ts apps/api/src/modules/notifications/handlers.ts apps/api/src/modules/notifications/routes.ts apps/api/src/modules/notifications/worker.ts apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/api/attendance/routes.test.ts apps/api/tests/api/notifications/routes.test.ts
git commit -m "feat: expose attendance and notification api"
```

### Task 6: Interface notifications et déclaration d’absence

**Files:**
- Create: `apps/web/lib/notifications-api.ts`
- Create: `apps/web/features/notifications/notification-bell.tsx`
- Create: `apps/web/features/notifications/notification-panel.tsx`
- Create: `apps/web/features/attendance/absence-dialog.tsx`
- Modify: `apps/web/features/layout/app-shell.tsx`
- Modify: `apps/web/features/planning/planning-view.tsx`
- Create: `apps/web/tests/notifications-api.test.ts`
- Create: `apps/web/tests/notifications-visual.test.ts`
- Create: `apps/web/tests/attendance-visual.test.ts`

**Interfaces:**
- `getNotifications(input?: { cursor?: string; limit?: number }): Promise<NotificationsPage>` sends credentials and translates transport failures into a shared French message.
- `markNotificationRead(id: string): Promise<void>` sends the trusted origin and keeps internal request ids out of rendered text.
- `NotificationBell` is a client component exposing unread count, keyboard-accessible panel, loading/empty/error states and a link to the relevant session.
- `AbsenceDialog` confirms the irreversible user action, posts `{}`, disables duplicate submissions and announces success/error accessibly.

- [ ] **Step 1: Écrire les tests Red frontend.** Vérifier les URLs/query params, `credentials: 'include'`, origine des mutations, compteur non lu, état vide/erreur, texte français et absence de détails internes.

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/web/tests/notifications-api.test.ts apps/web/tests/notifications-visual.test.ts apps/web/tests/attendance-visual.test.ts`

Expected: échec car les clients et composants n’existent pas.

- [ ] **Step 3: Implémenter le client et les composants Tailwind.** Reprendre Hanken Grotesk pour les titres, Inter pour les textes, Geist pour les métadonnées, Lucide pour les icônes, les tokens existants et des cibles de 48 px.

- [ ] **Step 4: Intégrer un unique `AppHeader` dans `AppShell`.** Le bouton cloche desktop/mobile reste cohérent, le panneau est navigable au clavier et l’action « Signaler une absence » du planning ouvre le même `AbsenceDialog` sur les deux formats.

- [ ] **Step 5: Rejouer tests, typecheck et contrôle Tailwind-only.**

Run: `pnpm exec vitest run apps/web/tests/notifications-api.test.ts apps/web/tests/notifications-visual.test.ts apps/web/tests/attendance-visual.test.ts && pnpm --filter @jdr-hub/web typecheck && pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

- [ ] **Step 6: Commiter.**

```bash
git add apps/web/lib/notifications-api.ts apps/web/features/notifications apps/web/features/attendance/absence-dialog.tsx apps/web/features/layout/app-shell.tsx apps/web/features/planning/planning-view.tsx apps/web/tests/notifications-api.test.ts apps/web/tests/notifications-visual.test.ts apps/web/tests/attendance-visual.test.ts
git commit -m "feat: add absence and notification interface"
```

### Task 7: Intégration PostgreSQL, Docker, documentation et livraison F07

**Files:**
- Create: `apps/api/tests/integration/attendance/repository.test.ts`
- Create: `apps/api/tests/integration/notifications/delivery.test.ts`
- Create: `docs/features/013-attendance-notifications.md`
- Modify: `docs/implementation-plan.md`
- Modify: `docs/project-status.md`
- Modify: `docs/features/012-sessions-scheduling.md`

- [ ] **Step 1: Écrire les tests d’intégration Red.** Couvrir contraintes, transaction d’absence, rollback, verrouillage de validation, idempotence de la notification, reprise après 429 et absence d’accès d’un membre retiré. Utiliser la base de test isolée si le harness existe ; sinon conserver un test d’adaptateur documentant explicitement la limite sans prétendre tester PostgreSQL.

- [ ] **Step 2: Appliquer la migration et exécuter les tests.**

Run: `pnpm --filter @jdr-hub/database db:generate && pnpm exec vitest run apps/api/tests/integration/attendance/repository.test.ts apps/api/tests/integration/notifications/delivery.test.ts`

Expected: migration additive, tests verts ou blocage PostgreSQL documenté sans masquer une erreur de code.

- [ ] **Step 3: Vérifier Docker et les secrets.** Utiliser des valeurs Discord fictives uniquement, vérifier que Redis n’est pas encore requis par F07, que PostgreSQL reste non public, que l’API reste non-root et que les logs n’impriment aucun token ou message personnel.

- [ ] **Step 4: Renseigner la fiche et l’état du projet.** Documenter Red/Green/Refactor, commandes/résultats, couverture, contrôles sécurité, limites, vérification manuelle desktop/mobile et statut `IN_REVIEW` uniquement après ouverture de la PR.

- [ ] **Step 5: Exécuter la vérification complète avant livraison.**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm audit --audit-level=high && git diff --check`

- [ ] **Step 6: Examiner le diff et pousser la branche.** Vérifier `git status --short`, fichiers non suivis, secrets et migration ; pousser `feat/attendance-notifications` vers `origin` sans fusionner ni pousser sur `main`.

- [ ] **Step 7: Commiter la documentation finale.**

```bash
git add docs/features/013-attendance-notifications.md docs/implementation-plan.md docs/project-status.md docs/features/012-sessions-scheduling.md
git commit -m "docs: record attendance notification verification"
git push -u origin feat/attendance-notifications
```

## Definition of Done

- Les absences, présences et notifications sont testées par contrats, services, API, intégration et composants.
- Les DM Discord sont injectables, limités, réessayables et sans secret dans le code ou les logs.
- Les droits sont appliqués côté serveur et retirent l’accès aux membres quittés/exclus.
- Les états loading, empty, error et confirmation sont accessibles en français sur desktop et mobile.
- Migration, fiche de fonctionnalité, tableau de projet et contrôles de sécurité sont à jour.
- La branche est poussée et une PR vers `develop` est ouverte ou le blocage est documenté.
