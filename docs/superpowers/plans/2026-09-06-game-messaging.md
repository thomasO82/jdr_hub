# Messagerie textuelle par partie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une conversation textuelle temps réel par partie, accessible au MJ et aux membres actifs, avec reprise SSE et diffusion Redis Streams.

**Architecture:** PostgreSQL est la source de vérité de `game_messages` et des curseurs de lecture. Chaque processus API maintient un hub SSE local et lit un Redis Stream global en lecture indépendante afin de recevoir les événements des autres processus ; Redis transporte seulement `{gameId, messageId}`. L’historique REST et le rattrapage PostgreSQL rendent les reconnexions fiables même après expiration ou indisponibilité Redis.

**Tech Stack:** pnpm, TypeScript strict, Hono `streamSSE`, Redis Streams avec le client Node `redis`, PostgreSQL/Drizzle, Next.js App Router, EventSource navigateur, Tailwind CSS, Lucide et Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-attendance-notifications-and-game-messaging-design.md`

## Global Constraints

- F07 `feat/attendance-notifications` doit être fusionnée dans `develop` avant de créer cette branche.
- Respecter `AGENTS.md`, `docs/security/ai-access-policy.md` et `docs/security/security-requirements.md`.
- Écrire les tests Red avant chaque implémentation et conserver les tests fusionnés inchangés.
- Une conversation est liée à une partie ; aucun DM entre utilisateurs n’est créé.
- Le contenu est texte uniquement, strictement borné à 2 000 caractères, non vide après trim, sans HTML ni mention enrichie.
- Seuls le MJ propriétaire et les membres `ACTIVE` peuvent lire ; seuls ces utilisateurs peuvent écrire tant que la partie est ouverte.
- Une partie `CLOSED` ou `COMPLETED` est lisible en lecture seule ; un membre quitté/exclu perd tout accès.
- Le départ d’un salon Discord ne modifie ni le roster, ni les permissions, ni les messages JDR Hub.
- Redis est un relais temporaire ; PostgreSQL conserve l’historique durable et le client doit dédupliquer par `messageId`.
- Les cookies de session, l’origine stricte, le rate limiting, les messages d’erreur français et le contrôle serveur d’autorisation restent obligatoires.
- Le frontend n’importe jamais `packages/database`, n’ajoute aucun CSS local et ne rend jamais du HTML utilisateur.

---

### Task 1: Contrats partagés de messagerie

**Files:**
- Create: `packages/shared/src/messaging.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/messaging.test.ts`
- Create: `apps/api/src/modules/messaging/policy.ts`
- Create: `apps/api/tests/unit/messaging/policy.test.ts`

**Interfaces:**
- `messageInputSchema`: `{ content: string }` strict, trim, 1..2 000 caractères.
- `messageQuerySchema`: `{ cursor?: string; limit: 1..50 }` strict, défaut `30`.
- `messageReadSchema`: `{ messageId: UUID }` strict.
- `messageStreamEventSchema`: `{ messageId: UUID; gameId: UUID; authorId: UUID | null; authorName: string; content: string; createdAt: ISODate }` strict.
- `MessageView`: `{ id: string; gameId: string; authorId: string | null; authorName: string; content: string; createdAt: string }` is the shared serialized projection.
- `MessagesPage`: `{ items: MessageView[]; nextCursor: string | null; readMessageId: string | null }`.
- `canReadGameConversation(input: { actorId: string; ownerId: string; memberStatus: string; gameStatus: GameStatus }): boolean`.
- `canWriteGameConversation(input: { actorId: string; ownerId: string; memberStatus: string; gameStatus: GameStatus }): boolean`.

- [ ] **Step 1: Écrire les tests Red.** Vérifier trim, 2 000 caractères, contenu vide, propriétés inconnues, curseur invalide, détection lecture seule, membre quitté/exclu et utilisateur extérieur.

```ts
it('rejects empty or oversized message content', () => {
  expect(messageInputSchema.safeParse({ content: '   ' }).success).toBe(false)
  expect(messageInputSchema.safeParse({ content: 'a'.repeat(2_001) }).success).toBe(false)
})
```

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run packages/shared/tests/messaging.test.ts apps/api/tests/unit/messaging/policy.test.ts`

Expected: échec car les contrats et politiques n’existent pas.

- [ ] **Step 3: Implémenter les schémas et politiques pures.** Autoriser l’écriture uniquement pour `OPEN`/`ACTIVE`, la lecture seule pour `CLOSED`/`COMPLETED`, et refuser tout membre qui n’est plus `ACTIVE`.

- [ ] **Step 4: Rejouer et refactoriser.** Ne pas importer Hono, Drizzle, Redis ou `process.env` dans les contrats/politiques.

- [ ] **Step 5: Commiter.**

```bash
git add packages/shared/src/messaging.ts packages/shared/src/index.ts packages/shared/tests/messaging.test.ts apps/api/src/modules/messaging/policy.ts apps/api/tests/unit/messaging/policy.test.ts
git commit -m "feat: define game messaging contracts"
```

### Task 2: Tables PostgreSQL et migration additive

**Files:**
- Create: `packages/database/src/schema/messaging.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0007_game_messaging.sql`
- Modify: `packages/database/migrations/meta/_journal.json`
- Create: `packages/database/migrations/meta/0007_snapshot.json`
- Create: `packages/database/tests/messaging-schema.test.ts`

**Interfaces:**
- `messagingSchema` exports `gameMessages` and `gameMessageReads`.
- `gameMessages` references `games` and `users`, stores `varchar(2_000)` content, UTC creation timestamp, and indexes `(gameId, createdAt, id)` and `authorId`.
- `gameMessageReads` references `games` and `users`, has a primary/unique key `(gameId, userId)`, a nullable `lastMessageId` referencing `gameMessages`, and `updatedAt`.
- `gameMessages.authorId` is nullable with `ON DELETE SET NULL`; when the author is deleted, the repository projects the generic label `Utilisateur supprimé` and never stores a Discord id or a permanent author-name snapshot. Deleting a game cascades to its messages and read cursors.

- [ ] **Step 1: Écrire les tests Red du schéma.** Couvrir colonnes, longueur, UTC, clés, unicité d’un curseur, index, suppression d’une partie et `ON DELETE SET NULL` de l’auteur afin de conserver l’historique sans conserver son identité.

- [ ] **Step 2: Exécuter le test Red.**

Run: `pnpm exec vitest run packages/database/tests/messaging-schema.test.ts`

Expected: échec car le schéma n’existe pas.

- [ ] **Step 3: Implémenter les tables Drizzle et la migration.** Le corps du message est uniquement texte ; aucune colonne ne reçoit du HTML ou une donnée Discord.

- [ ] **Step 4: Exécuter le typecheck et relire la migration.** Vérifier qu’elle est additive et qu’elle ne modifie pas les tables F01–F06.

Run: `pnpm exec vitest run packages/database/tests/messaging-schema.test.ts && pnpm --filter @jdr-hub/database typecheck`

- [ ] **Step 5: Commiter.**

```bash
git add packages/database/src/schema/messaging.ts packages/database/src/index.ts packages/database/migrations/0007_game_messaging.sql packages/database/migrations/meta/_journal.json packages/database/migrations/meta/0007_snapshot.json packages/database/tests/messaging-schema.test.ts
git commit -m "feat: add game messaging schema"
```

### Task 3: Redis, configuration et infrastructure SSE

**Files:**
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/api/src/modules/messaging/redis-config.ts`
- Create: `apps/api/src/modules/messaging/redis-event-bus.ts`
- Create: `apps/api/src/modules/messaging/sse-hub.ts`
- Create: `apps/api/tests/unit/messaging/redis-event-bus.test.ts`
- Create: `apps/api/tests/unit/messaging/sse-hub.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `docker/Caddyfile`

**Interfaces:**
- `MessagingRedisConfig`: `{ url: string; streamKey: string; retentionMs: number; maxLength: number }` with `streamKey = 'jdr:game-messages'`, `retentionMs = 86_400_000` and `maxLength = 10_000`.
- `parseMessagingRedisConfig(environment: unknown): MessagingRedisConfig` validates a `redis://` or `rediss://` URL and reads `REDIS_URL` once at startup.
- `MessageEventBus.publish(event: { gameId: string; messageId: string }): Promise<void>` appends only identifiers to Redis Streams and applies `MAXLEN`/time cleanup.
- `MessageEventBus.start(onEvent: (event: { gameId: string; messageId: string }) => void): Promise<() => Promise<void>>` starts one independent stream reader per API process; it does not use a shared consumer group because every process must receive every event.
- `MessageStreamEvent`: `{ messageId: string; gameId: string; authorId: string | null; authorName: string; content: string; createdAt: string }` is the serialized projection sent through the local SSE hub.
- `SseHub.subscribe(gameId: string, listener: (event: MessageStreamEvent) => void): () => void` and `SseHub.publish(event: MessageStreamEvent): void` manage only local authorized listeners.

- [ ] **Step 1: Valider l’ajout de la dépendance et écrire les tests Red.** Ajouter le package `redis` uniquement dans `apps/api`; tester URL invalide, publication bornée, lecture des champs et nettoyage des abonnements/listeners.

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/messaging/redis-event-bus.test.ts apps/api/tests/unit/messaging/sse-hub.test.ts`

Expected: échec car la configuration, le bus et le hub n’existent pas.

- [ ] **Step 3: Implémenter l’abstraction Redis.** Utiliser une connexion de commande et une connexion de lecture dupliquée ; ne jamais envoyer Redis directement au navigateur ; transformer une panne Redis en erreur technique interne exploitable par le fallback PostgreSQL.

- [ ] **Step 4: Ajouter Redis à Compose.** Utiliser une image Redis 7 Alpine immuable vérifiée par digest, sans port hôte, avec healthcheck, réseau interne, `cap_drop: ALL` et `no-new-privileges`. Faire dépendre `api-hono` de l’état healthy Redis et passer `REDIS_URL=redis://redis:6379` par environnement.

- [ ] **Step 5: Configurer Caddy pour SSE.** Conserver `/api/*` sur Hono, désactiver le buffering de la route d’événements et ne pas appliquer de timeout court aux flux SSE ; ne pas modifier le routage des pages existantes.

- [ ] **Step 6: Rejouer tests, typecheck et contrôle de verrouillage.**

Run: `pnpm exec vitest run apps/api/tests/unit/messaging/redis-event-bus.test.ts apps/api/tests/unit/messaging/sse-hub.test.ts && pnpm --filter @jdr-hub/api typecheck && pnpm --filter @jdr-hub/web typecheck`

- [ ] **Step 7: Commiter.**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/modules/messaging/redis-config.ts apps/api/src/modules/messaging/redis-event-bus.ts apps/api/src/modules/messaging/sse-hub.ts apps/api/tests/unit/messaging/redis-event-bus.test.ts apps/api/tests/unit/messaging/sse-hub.test.ts apps/api/src/index.ts docker-compose.yml .env.example docker/Caddyfile
git commit -m "feat: add Redis event bus for messaging"
```

### Task 4: Repository et services de messagerie

**Files:**
- Create: `apps/api/src/modules/messaging/repository.ts`
- Create: `apps/api/src/modules/messaging/services/list-messages.ts`
- Create: `apps/api/src/modules/messaging/services/send-message.ts`
- Create: `apps/api/src/modules/messaging/services/mark-messages-read.ts`
- Create: `apps/api/tests/helpers/in-memory-messaging-repository.ts`
- Create: `apps/api/tests/unit/messaging/services.test.ts`

**Interfaces:**
- `MessageRecord`: `{ id: string; gameId: string; authorId: string | null; authorName: string; content: string; createdAt: Date }` is the API-internal persistence projection; handlers convert `createdAt` to ISO before returning `MessageView`.
- `MessagePageRecord`: `{ items: MessageRecord[]; nextCursor: string | null; readMessageId: string | null }` is the repository-internal paginated projection.
- `MessagingRepository.findConversationAccess(input: { gameId: string; userId: string }): Promise<{ ownerId: string; gameStatus: GameStatus; memberStatus: string } | null>`.
- `MessagingRepository.listMessages(input: { gameId: string; userId: string; cursor: string | null; limit: number }): Promise<MessagePageRecord>`.
- `MessagingRepository.createMessage(input: { gameId: string; authorId: string; content: string; now: Date; idempotencyKey: string }): Promise<MessageRecord>`.
- `MessagingRepository.markRead(input: { gameId: string; userId: string; messageId: string; now: Date }): Promise<void>` verifies that the message belongs to the game and never accepts a cursor that moves backward.
- `sendMessage(input: { gameId: string; userId: string; content: string; idempotencyKey: string; repository: MessagingRepository; eventBus: MessageEventBus; localHub: SseHub; now?: () => Date }): Promise<MessageRecord>` commits the message, publishes its identifier, and invokes the local hub directly if Redis is unavailable so a single-instance deployment remains live.

- [ ] **Step 1: Écrire les tests Red des services.** Couvrir lecture/écriture owner et membre actif, partie fermée en lecture seule, membre quitté/exclu, utilisateur extérieur, idempotence, longueur, ordre, pagination, curseur de lecture et publication après commit.

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/unit/messaging/services.test.ts`

Expected: échec car le helper, le repository et les services n’existent pas.

- [ ] **Step 3: Implémenter le helper mémoire sans l’exporter de la production.** Reproduire les contraintes de ressource et les transitions de partie nécessaires aux tests.

- [ ] **Step 4: Implémenter les services purs.** Refuser un contenu vide avant la persistance, générer un UUID serveur, utiliser la clé d’idempotence pour éviter les doublons et ne jamais confier l’autorisation au client.

- [ ] **Step 5: Implémenter le repository Drizzle.** Utiliser des requêtes paramétrées, récupérer uniquement `id`, `username`, contenu et dates nécessaires, et faire avancer le curseur avec une comparaison `(createdAt, id)` stable.

- [ ] **Step 6: Rejouer et vérifier les frontières.**

Run: `pnpm exec vitest run apps/api/tests/unit/messaging/services.test.ts && rg -n "from 'hono'|process\.env" apps/api/src/modules/messaging/services apps/api/src/modules/messaging/repository.ts`

Expected: tests verts et aucune dépendance interdite dans les services/repository.

- [ ] **Step 7: Commiter.**

```bash
git add apps/api/src/modules/messaging/repository.ts apps/api/src/modules/messaging/services apps/api/tests/helpers/in-memory-messaging-repository.ts apps/api/tests/unit/messaging/services.test.ts
git commit -m "feat: implement game messaging services"
```

### Task 5: API REST et flux SSE protégés

**Files:**
- Create: `apps/api/src/modules/messaging/handlers.ts`
- Create: `apps/api/src/modules/messaging/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/tests/api/messaging/routes.test.ts`
- Create: `apps/api/tests/api/messaging/sse.test.ts`

**Interfaces:**
- `registerMessagingRoutes(app, dependencies)` registers `GET /games/:id/messages`, `POST /games/:id/messages`, `POST /games/:id/messages/read` and `GET /games/:id/messages/events`.
- `GET /games/:id/messages/events` authenticates the cookie before opening the stream, checks membership, sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no` and sends heartbeats.
- `Last-Event-ID` identifies the last message UUID delivered to the browser; the handler subscribes before reading the PostgreSQL backlog to avoid a race, deduplicates the backlog/local queue and then streams new authorized projections.
- A removed member’s open stream is closed or receives no further events after the next authorization check; the hub never trusts a stale subscription forever.

- [ ] **Step 1: Écrire les tests Red API/SSE.** Vérifier 401/403/404/409/413/429, origine stricte sur `POST`/read, payload inconnu, absence de `ownerId`, partie fermée en lecture seule, SSE headers, heartbeat, reconnect/catch-up and duplicate suppression.

```ts
it('keeps a closed conversation readable but rejects new messages', async () => {
  const read = await app.request('/games/closed/messages', { headers: memberHeaders })
  const write = await app.request('/games/closed/messages', { method: 'POST', headers: memberHeaders, body: JSON.stringify({ content: 'test' }) })
  expect(read.status).toBe(200)
  expect(write.status).toBe(409)
})
```

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/api/tests/api/messaging/routes.test.ts apps/api/tests/api/messaging/sse.test.ts`

Expected: échec car les routes et handlers n’existent pas.

- [ ] **Step 3: Implémenter handlers/routes.** Valider uniquement le transport avec Zod, utiliser l’utilisateur de session, appliquer les limites (30 lectures/minute, 20 écritures/minute, 2 flux simultanés/utilisateur) et convertir les erreurs en `MESSAGING_ERROR` générique.

- [ ] **Step 4: Implémenter le flux Hono.** Utiliser `streamSSE`, `stream.onAbort`, heartbeat de 15 secondes et fermeture propre ; exclure les connexions autorisées d’une partie dès que le repository ne confirme plus leur accès.

- [ ] **Step 5: Enregistrer le module et le lecteur Redis au démarrage.** Le lecteur Redis est lancé une fois par processus, arrêté avec l’API et ne bloque pas le démarrage si Redis est momentanément indisponible ; les lectures REST restent disponibles.

- [ ] **Step 6: Rejouer les tests ciblés et le typecheck.**

Run: `pnpm exec vitest run apps/api/tests/api/messaging/routes.test.ts apps/api/tests/api/messaging/sse.test.ts && pnpm --filter @jdr-hub/api typecheck`

- [ ] **Step 7: Commiter.**

```bash
git add apps/api/src/modules/messaging/handlers.ts apps/api/src/modules/messaging/routes.ts apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/api/messaging/routes.test.ts apps/api/tests/api/messaging/sse.test.ts
git commit -m "feat: expose real-time game messaging api"
```

### Task 6: Interface conversation responsive

**Files:**
- Create: `apps/web/lib/messaging-api.ts`
- Create: `apps/web/features/messaging/game-conversation-view.tsx`
- Create: `apps/web/features/messaging/message-list.tsx`
- Create: `apps/web/features/messaging/message-composer.tsx`
- Create: `apps/web/app/parties/[slug]/messages/page.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Create: `apps/web/tests/messaging-api.test.ts`
- Create: `apps/web/tests/messaging-pages.test.ts`
- Create: `apps/web/tests/messaging-visual.test.ts`

**Interfaces:**
- `listMessages(gameId: string, query?: { cursor?: string; limit?: number }): Promise<MessagesPage>` uses credentials and shared French error translation.
- `sendMessage(gameId: string, content: string, idempotencyKey: string): Promise<MessageRecord>` sends strict origin and keeps the idempotency key opaque.
- `markMessagesRead(gameId: string, messageId: string): Promise<void>` advances the server cursor only forward.
- `GameConversationView` loads history, opens `EventSource` with the session cookie, reconnects with the last message id, deduplicates by message id and closes the stream on unmount.

- [ ] **Step 1: Écrire les tests Red web.** Couvrir URL/curseurs, credentials, origin, cycle de vie `EventSource`, reconnexion, dédoublonnage, loading/empty/error, lecture seule, 2 000 caractères, clavier et classes mobile/desktop.

- [ ] **Step 2: Exécuter les tests Red.**

Run: `pnpm exec vitest run apps/web/tests/messaging-api.test.ts apps/web/tests/messaging-pages.test.ts apps/web/tests/messaging-visual.test.ts`

Expected: échec car clients, page et composants n’existent pas.

- [ ] **Step 3: Implémenter le client REST et la vue client.** Ne pas rendre les messages côté serveur en contenu HTML ; utiliser `textContent` via JSX normal, `EventSource`, `AbortController` pour les fetchs et une clé idempotente par tentative d’envoi.

- [ ] **Step 4: Construire le design desktop/mobile.** Reprendre `AppShell`, le logo officiel, les tokens existants, Hanken/Inter/Geist, un panneau central desktop, une pile mobile, des séparateurs de jour, avatar/pseudo, heure accessible, compteur de caractères et formulaire 48 px.

- [ ] **Step 5: Implémenter les états métier.** Afficher « Lecture seule » pour une partie fermée/terminée, aucun champ pour un membre sans droit, « Reconnexion… » pour une perte SSE et « Réessayer » pour un échec historique.

- [ ] **Step 6: Ajouter l’entrée à la fiche de partie sans dupliquer le shell.** Le lien « Conversation » est rendu uniquement lorsque l’utilisateur est autorisé par la réponse serveur ; la sécurité ne dépend pas de sa présence frontend.

- [ ] **Step 7: Rejouer tests, typecheck et architecture CSS.**

Run: `pnpm exec vitest run apps/web/tests/messaging-api.test.ts apps/web/tests/messaging-pages.test.ts apps/web/tests/messaging-visual.test.ts && pnpm --filter @jdr-hub/web typecheck && pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

- [ ] **Step 8: Commiter.**

```bash
git add apps/web/lib/messaging-api.ts apps/web/features/messaging apps/web/app/parties/[slug]/messages/page.tsx apps/web/features/games/game-detail-view.tsx apps/web/tests/messaging-api.test.ts apps/web/tests/messaging-pages.test.ts apps/web/tests/messaging-visual.test.ts
git commit -m "feat: add game conversation interface"
```

### Task 7: Tests multi-instance, Docker, documentation et livraison F07B

**Files:**
- Create: `apps/api/tests/integration/messaging/repository.test.ts`
- Create: `apps/api/tests/integration/messaging/redis-sse.test.ts`
- Create: `tests/infrastructure/redis-compose-config.test.ts`
- Create: `docs/features/014-game-messaging.md`
- Modify: `docs/implementation-plan.md`
- Modify: `docs/project-status.md`

- [ ] **Step 1: Écrire les tests Red d’intégration.** Couvrir contraintes PostgreSQL, pagination stable, curseur monotone, deux instances API recevant le même événement Redis, reconnexion après `Last-Event-ID`, expiration du stream, doublon, panne Redis et retrait d’un membre.

- [ ] **Step 2: Exécuter les tests avec les services de développement.**

Run: `DISCORD_CLIENT_ID=123456789012345678 DISCORD_CLIENT_SECRET=local-test-only-secret JWT_SIGNING_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA REDIS_URL=redis://redis:6379 docker compose -f docker-compose.yml up --build --wait --wait-timeout 120`

Expected: `postgres`, `redis`, `api-hono`, `web-next` et `proxy-caddy` healthy ; aucun secret réel utilisé.

- [ ] **Step 3: Vérifier les scénarios SSE manuellement.** Ouvrir la même conversation dans deux navigateurs de test, envoyer un message dans le premier, vérifier l’arrivée immédiate dans le second, couper Redis, vérifier que l’historique REST reste disponible, redémarrer l’API et confirmer la reconnexion/déduplication.

- [ ] **Step 4: Renseigner la fiche et le tableau de projet.** Documenter Red/Green/Refactor, tests multi-instance, limites de rétention Redis, sécurité XSS/IDOR/CSRF/rate limit, vérifications desktop/mobile et statut `IN_REVIEW` uniquement après ouverture de PR.

- [ ] **Step 5: Exécuter la vérification complète.**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm audit --audit-level=high && git diff --check`

- [ ] **Step 6: Arrêter proprement les services de développement et examiner le diff.** Vérifier `git status --short`, migrations, dépendances, image Redis digestée, absence de secrets et absence de fichiers parasites.

- [ ] **Step 7: Commiter la documentation et pousser la branche.**

```bash
git add tests/infrastructure/redis-compose-config.test.ts docs/features/014-game-messaging.md docs/implementation-plan.md docs/project-status.md
git commit -m "docs: record game messaging verification"
git push -u origin feat/game-messaging
```

## Definition of Done

- La conversation par partie fonctionne en lecture et écriture avec droits serveur, lecture seule et retrait immédiat des membres sortants.
- SSE diffuse les messages, se reconnecte et récupère l’historique sans dépendre de la rétention Redis.
- Redis est privé, digesté, configurable par environnement et non indispensable à la conservation des messages.
- Les tests unitaires, API, composants, intégration et infrastructure sont verts sans test affaibli.
- La fiche F07B, le plan global, la sécurité et le tableau de projet sont à jour.
- La branche est poussée et une PR vers `develop` est ouverte ou le blocage est documenté.
