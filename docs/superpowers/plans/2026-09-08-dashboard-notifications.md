# Dashboard et notifications prioritaires Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page d’accueil applicative provisoire par un dashboard authentifié `/dashboard` qui met immédiatement en évidence les notifications non lues, sans afficher de bloc vide lorsqu’il n’y en a aucune.

**Architecture:** Le backend expose une projection authentifiée `GET /dashboard` composée par un service d’agrégation dédié. Les notifications restent produites et lues par le module `notifications`; le dashboard consomme une projection limitée des notifications non lues et ne recopie aucune règle métier. Le frontend charge cette projection une seule fois, affiche le résumé des notifications dans une carte prioritaire et conserve la cloche globale du shell pour l’historique complet.

**Tech Stack:** pnpm, TypeScript strict, Zod, Hono, Drizzle ORM, PostgreSQL, Next.js App Router, React client components lorsque l’état navigateur est nécessaire, Tailwind CSS v4, Lucide Icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-dashboard-and-gm-management-design.md` — périmètre de cette tranche : dashboard joueur/MJ et visibilité des notifications ; la gestion détaillée des parties MJ (`/games/:gameId/manage`) est explicitement reportée à un plan séparé.

## Global Constraints

- Utiliser la branche dédiée `feat/dashboard-notifications`, créée depuis un `develop` propre et à jour ; ne pas utiliser de worktree.
- Respecter le flux `routes -> handlers -> services -> repositories` ; aucun accès Drizzle dans un handler ou un composant frontend.
- Le dashboard n’accepte aucun `userId` fourni par le navigateur : l’identité vient exclusivement de la session.
- Les notifications du résumé sont limitées aux destinataires de la session courante et aux champs de projection prévus par `@jdr-hub/shared`.
- Toute erreur visible est localisée en français et ne révèle ni exception, ni stack trace, ni détail Discord, ni existence d’une ressource privée.
- Les mutations de lecture de notification conservent l’origine approuvée, la session et le rate limiting existants.
- Le frontend utilise uniquement les tokens du design system et les classes Tailwind ; aucun fichier CSS, style inline, CSS-in-JS ou valeur de couleur répétée ne sera ajouté.
- Le composant `AppShell` reste partagé ; la cloche du header et de la navigation desktop n’est pas remplacée par une implémentation page par page.
- Les vues privées restent `noindex` et ne rendent aucune donnée privée dans les métadonnées publiques.
- Aucun nouveau modèle XP, chat, SSE, calendrier externe, push mobile ou gestion MJ n’est ajouté dans cette tranche.

---

## Décisions d’interface à préserver

- La cloche reste toujours disponible dans le header et ouvre `NotificationPanel` pour l’historique complet.
- `NotificationSummary` est rendu uniquement si `unreadCount > 0`.
- Desktop : le résumé apparaît dans la colonne droite de la première grille du dashboard, avant les informations secondaires.
- Mobile : le résumé apparaît immédiatement sous la carte « Prochaine séance », avant les parties actives.
- Le résumé affiche au maximum trois notifications non lues, une action « Voir la séance » et un lien vers l’historique de la cloche lorsque celui-ci est disponible.
- La lecture de la dernière notification non lue retire la carte du dashboard sans rechargement complet ; la cloche recharge son propre état lorsqu’elle est ouverte.
- Les états de chargement et d’erreur du dashboard occupent la zone du résumé uniquement et ne masquent pas les autres cartes déjà disponibles.

### Task 1: Définir le contrat partagé du dashboard

**Files:**
- Create: `packages/shared/src/dashboard.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/dashboard.test.ts`

**Interfaces:**
- Produces `DashboardBlock<T>`, `DashboardNotificationSummary`, `DashboardSessionSummary`, `DashboardGameSummary` et `DashboardData`.
- `DashboardData` expose `nextSession`, `activeGames` et `notifications` comme blocs indépendants ; aucun identifiant utilisateur n’est présent dans le contrat de réponse.
- `DashboardSessionSummary` contient `id`, `gameId`, `gameTitle`, `startsAt`, `endsAt`, `status`, `role` (`GM` ou `PLAYER`) et `canReportAbsence`.
- `DashboardGameSummary` contient `id`, `title`, `system`, `type`, `status` et `role` (`GM` ou `PLAYER`).
- `DashboardNotificationSummary` contient `unreadCount` et au plus trois `DashboardNotification` dont `readAt` est toujours `null`.

- [ ] **Step 1: Write the failing contract tests**

```ts
import { describe, expect, it } from 'vitest'
import { dashboardDataSchema } from '../src/dashboard.js'

describe('dashboard contracts', () => {
  it('accepts a dashboard whose notification block is absent when there are no unread notifications', () => {
    const result = dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: { status: 'EMPTY', data: null },
    })

    expect(result.notifications.status).toBe('EMPTY')
  })

  it('accepts only bounded unread notification summaries', () => {
    const result = dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: {
        status: 'READY',
        data: {
          unreadCount: 1,
          items: [{
            id: 'notification-1',
            type: 'ABSENCE_REPORTED',
            gameId: 'game-1',
            sessionId: 'session-1',
            title: 'Absence signalée',
            body: 'Un joueur a signalé son absence pour une séance.',
            readAt: null,
            createdAt: '2026-09-08T10:00:00.000Z',
          }],
        },
      },
    })

    expect(result.notifications.data?.items).toHaveLength(1)
    expect(result.notifications.data?.items[0]?.readAt).toBeNull()
  })

  it('rejects a dashboard notification containing a recipient or actor identifier', () => {
    expect(() => dashboardDataSchema.parse({
      nextSession: { status: 'EMPTY', data: null },
      activeGames: { status: 'READY', data: [] },
      notifications: { status: 'READY', data: { unreadCount: 1, items: [{ recipientId: 'private-user', actorId: 'private-user' }] } },
    })).toThrow()
  })
})
```

- [ ] **Step 2: Run the contract test and confirm the expected failure**

Run: `pnpm exec vitest run packages/shared/tests/dashboard.test.ts`

Expected: FAIL because `packages/shared/src/dashboard.ts` and `dashboardDataSchema` do not exist yet.

- [ ] **Step 3: Implement the minimal shared contract**

Create strict Zod schemas and inferred types with these exact rules:

```ts
export const dashboardBlockSchema = <T extends z.ZodType>(data: T) => z.discriminatedUnion('status', [
  z.object({ status: z.literal('READY'), data }).strict(),
  z.object({ status: z.literal('EMPTY'), data: z.null() }).strict(),
  z.object({ status: z.literal('ERROR'), data: z.null(), code: z.literal('DASHBOARD_BLOCK_UNAVAILABLE') }).strict(),
])

export const dashboardNotificationSchema = z.object({
  id: z.string().trim().min(1).max(128),
  type: notificationTypeSchema,
  gameId: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2_000),
  readAt: z.null(),
  createdAt: z.iso.datetime({ offset: true }),
}).strict()

export const dashboardDataSchema = z.object({
  nextSession: dashboardBlockSchema(dashboardSessionSchema),
  activeGames: dashboardBlockSchema(z.array(dashboardGameSchema).max(12)),
  notifications: dashboardBlockSchema(z.object({ unreadCount: z.number().int().min(1).max(10_000), items: z.array(dashboardNotificationSchema).max(3) }).strict()),
}).strict()
```

The session and game schemas must use the existing shared `GameType`, `GameStatus` and `SessionStatus` enums. Export all public schemas and types from `packages/shared/src/index.ts`.

- [ ] **Step 4: Run the contract tests and shared type checks**

Run: `pnpm exec vitest run packages/shared/tests/dashboard.test.ts && pnpm --filter @jdr-hub/shared typecheck`

Expected: all dashboard contract tests PASS and the shared package typecheck exits successfully.

- [ ] **Step 5: Commit the contract**

```bash
git add packages/shared/src/dashboard.ts packages/shared/src/index.ts packages/shared/tests/dashboard.test.ts
git commit -m "feat: define dashboard projection contracts"
```

### Task 2: Exposer une lecture ciblée des notifications non lues

**Files:**
- Modify: `apps/api/src/modules/notifications/repository.ts`
- Create: `apps/api/src/modules/notifications/services/list-unread-notifications.ts`
- Modify: `apps/api/tests/helpers/in-memory-notifications-repository.ts`
- Test: `apps/api/tests/unit/notifications/services.test.ts`
- Test: `apps/api/tests/api/notifications/routes.test.ts`

**Interfaces:**
- Adds `NotificationRepository.listUnreadForUser(input: { userId: string; limit: number }): Promise<{ items: NotificationRecord[]; unreadCount: number }>`.
- Adds `listUnreadNotifications(input: { userId: string; limit: number; repository: NotificationRepository }): Promise<DashboardNotificationSummary>`.
- Keeps `GET /notifications` unchanged for the full history and pagination.

- [ ] **Step 1: Write failing repository/service tests**

```ts
import type { NotificationRecord } from '../../../src/modules/notifications/repository.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const unreadNotification: NotificationRecord = {
  id: 'notification-base',
  type: 'ABSENCE_REPORTED',
  recipientId: 'gm-1',
  gameId: 'game-1',
  sessionId: 'session-1',
  actorId: 'player-1',
  title: 'Absence signalée',
  body: 'Un joueur a signalé son absence pour une séance.',
  readAt: null,
  createdAt: new Date('2026-09-08T10:00:00.000Z'),
}

it('returns only unread notifications and the total unread count', async () => {
  const repository = createInMemoryNotificationsRepository({ notifications: [
    { ...unreadNotification, id: 'notification-1' },
    { ...unreadNotification, id: 'notification-2' },
    { ...unreadNotification, id: 'notification-3', readAt: new Date('2026-09-07T10:00:00.000Z') },
  ] })

  const result = await listUnreadNotifications({ userId: 'gm-1', limit: 3, repository })

  expect(result.unreadCount).toBe(2)
  expect(result.items).toHaveLength(2)
  expect(result.items.every((item) => item.readAt === null)).toBe(true)
})

it('does not expose unread notifications belonging to another user', async () => {
  const repository = createInMemoryNotificationsRepository({ notifications: [{ ...unreadNotification, recipientId: 'other-user' }] })
  await expect(listUnreadNotifications({ userId: 'gm-1', limit: 3, repository })).resolves.toEqual({ unreadCount: 0, items: [] })
})
```

- [ ] **Step 2: Run the targeted tests and confirm the expected failure**

Run: `pnpm exec vitest run apps/api/tests/unit/notifications/services.test.ts`

Expected: FAIL because the unread repository method and service do not exist.

- [ ] **Step 3: Implement the unread projection**

Add the repository method using the existing notification recipient predicate, `isNull(readAt)`, descending creation order and `limit + 1` only if needed to calculate a bounded result. Keep `unreadCount` as a server-side count. The in-memory repository must apply the same recipient, unread and ordering rules.

The service maps `Date` values to ISO strings and returns only the fields permitted by `dashboardNotificationSchema`; it must reject or omit no field silently, so the repository projection should not load Discord delivery fields.

- [ ] **Step 4: Add API non-regression coverage**

Extend the existing notification route tests to prove that the full history endpoint is unchanged and that the unread service cannot cross user boundaries. Do not modify existing expectations to make the new tests pass.

- [ ] **Step 5: Run notification tests and commit**

Run: `pnpm exec vitest run apps/api/tests/unit/notifications/services.test.ts apps/api/tests/api/notifications/routes.test.ts`

Expected: all existing notification tests plus the new unread tests PASS.

```bash
git add apps/api/src/modules/notifications/repository.ts apps/api/src/modules/notifications/services/list-unread-notifications.ts apps/api/tests/helpers/in-memory-notifications-repository.ts apps/api/tests/unit/notifications/services.test.ts apps/api/tests/api/notifications/routes.test.ts
git commit -m "feat: expose unread notification summaries"
```

### Task 3: Ajouter l’agrégateur et la route `GET /dashboard`

**Files:**
- Create: `apps/api/src/modules/dashboard/repository.ts`
- Create: `apps/api/src/modules/dashboard/services/get-dashboard.ts`
- Create: `apps/api/src/modules/dashboard/handlers.ts`
- Create: `apps/api/src/modules/dashboard/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/tests/helpers/in-memory-dashboard-repository.ts`
- Create: `apps/api/tests/helpers/in-memory-failing-notifications-repository.ts`
- Test: `apps/api/tests/unit/dashboard/get-dashboard.test.ts`
- Test: `apps/api/tests/api/dashboard/routes.test.ts`

**Interfaces:**
- `DashboardRepository.findNextSession(input: { userId: string; now: Date }): Promise<DashboardSessionSummary | null>`.
- `DashboardRepository.listActiveGames(input: { userId: string }): Promise<DashboardGameSummary[]>`.
- `getDashboard(input: { userId: string; now: Date; repository: DashboardRepository; notificationsRepository: NotificationRepository }): Promise<DashboardData>`.
- `DashboardDependencies` injects `authConfig`, `authRepository`, `repository`, `notificationsRepository` and optional `now` exactly like the existing modules.
- `registerDashboardRoutes(app, dependencies)` registers only `GET /dashboard`.

- [ ] **Step 1: Write failing service tests for all block states**

```ts
import type { DashboardGameSummary, DashboardSessionSummary } from '@jdr-hub/shared'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'
import { createFailingNotificationsRepository } from '../../helpers/in-memory-failing-notifications-repository.js'
import { createInMemoryDashboardRepository } from '../../helpers/in-memory-dashboard-repository.js'
import type { NotificationRecord, NotificationRepository } from '../../../src/modules/notifications/repository.js'
import type { DashboardRepository } from '../../../src/modules/dashboard/repository.js'

const now = new Date('2026-09-08T12:00:00.000Z')
const nextSessionFixture: DashboardSessionSummary = {
  id: 'session-1', gameId: 'game-1', gameTitle: 'La Crypte Maudite',
  startsAt: '2026-09-08T20:00:00.000Z', endsAt: '2026-09-08T23:00:00.000Z',
  status: 'SCHEDULED', role: 'GM', canReportAbsence: false,
}
const activeGameFixture: DashboardGameSummary = {
  id: 'game-1', title: 'La Crypte Maudite', system: 'D&D 5e', type: 'CAMPAIGN', status: 'ACTIVE', role: 'GM',
}
const unreadNotificationFixture: NotificationRecord = {
  id: 'notification-1', type: 'ABSENCE_REPORTED', recipientId: 'gm-1', gameId: 'game-1',
  sessionId: 'session-1', actorId: 'player-1', title: 'Absence signalée',
  body: 'Un joueur a signalé son absence pour une séance.', readAt: null,
  createdAt: new Date('2026-09-08T10:00:00.000Z'),
}
const dashboardRepository: DashboardRepository = createInMemoryDashboardRepository({
  nextSession: nextSessionFixture,
  activeGames: [activeGameFixture],
})
const emptyDashboardRepository: DashboardRepository = createInMemoryDashboardRepository()
const notificationsRepository: NotificationRepository = createInMemoryNotificationsRepository({ notifications: [unreadNotificationFixture] })
const emptyNotificationsRepository: NotificationRepository = createInMemoryNotificationsRepository()
const failingNotificationsRepository: NotificationRepository = createFailingNotificationsRepository()

it('returns the next session, active games and the visible unread notification block', async () => {
  const result = await getDashboard({ userId: 'gm-1', now, repository: dashboardRepository, notificationsRepository })

  expect(result.nextSession.status).toBe('READY')
  expect(result.activeGames.status).toBe('READY')
  expect(result.notifications).toMatchObject({ status: 'READY', data: { unreadCount: 1 } })
})

it('returns an empty notification block when there are no unread notifications', async () => {
  const result = await getDashboard({ userId: 'player-1', now, repository: emptyDashboardRepository, notificationsRepository: emptyNotificationsRepository })
  expect(result.notifications).toEqual({ status: 'EMPTY', data: null })
})

it('keeps successful blocks when the notifications repository fails', async () => {
  const result = await getDashboard({ userId: 'gm-1', now, repository: dashboardRepository, notificationsRepository: failingNotificationsRepository })
  expect(result.nextSession.status).toBe('READY')
  expect(result.activeGames.status).toBe('READY')
  expect(result.notifications).toEqual({ status: 'ERROR', data: null, code: 'DASHBOARD_BLOCK_UNAVAILABLE' })
})
```

The test imports `DashboardSessionSummary` and `DashboardGameSummary` from
`@jdr-hub/shared`; the two helper factories above implement the repository
interfaces from this task.
`createFailingNotificationsRepository()` is created in
`apps/api/tests/helpers/in-memory-failing-notifications-repository.ts`; it
throws `new Error('NOTIFICATION_STORAGE_FAILURE')` only from
`listUnreadForUser`, while its other methods delegate to the in-memory
repository so the partial-failure assertion is isolated to one block.

- [ ] **Step 2: Run the dashboard unit tests and confirm the expected failure**

Run: `pnpm exec vitest run apps/api/tests/unit/dashboard/get-dashboard.test.ts`

Expected: FAIL because the dashboard module, repository contract and service do not exist.

- [ ] **Step 3: Implement the dashboard repository projections**

Use parameterized Drizzle queries against the existing game, member and session tables. `findNextSession` must restrict rows to sessions visible to the authenticated user (owner or active member), use `SCHEDULED`, filter `endsAt >= now`, and order by `startsAt`. `listActiveGames` must restrict rows to owned or active-member games and include only `OPEN`/`ACTIVE` games, returning a maximum of twelve records ordered by recent activity. Return explicit projection objects rather than database rows.

The repository must not accept a caller-provided owner id, role or visibility flag. The in-memory helper must enforce the same predicates so unit tests cannot pass through a weaker fake.

- [ ] **Step 4: Implement the service with independent block isolation**

Run the next-session query, active-game query and unread-notification query independently. Convert a `null` or empty result to `EMPTY`, successful data to `READY`, and any caught secondary error to `ERROR` with the public code `DASHBOARD_BLOCK_UNAVAILABLE`. Do not return error messages from exceptions. Use the injected `now` for every time comparison.

- [ ] **Step 5: Implement handlers, route registration and production wiring**

The handler authenticates the access token exactly as the existing protected modules do, returns `401` without a session, calls `getDashboard`, and emits `{ data, error: null, meta: { requestId } }`. It must never read a query `userId`. Unexpected aggregate failures return the existing generic French internal error envelope with the request id. Register the module in `createApiApp` and inject the same PostgreSQL scheduling/game read dependencies plus the existing notification repository from `apps/api/src/index.ts`.

- [ ] **Step 6: Add API security tests**

```ts
const { app, owner } = await createTestApp()
const authenticatedHeaders = { cookie: owner.cookie }

it('returns 401 without a valid session', async () => {
  const response = await app.request('/dashboard')
  expect(response.status).toBe(401)
})

it('ignores a forged userId query parameter and uses the authenticated session', async () => {
  const response = await app.request('/dashboard?userId=other-user', { headers: authenticatedHeaders })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ data: { notifications: { status: 'EMPTY', data: null } } })
})

it('does not expose recipientId, actorId, Discord identifiers or delivery data', async () => {
  const body = await (await app.request('/dashboard', { headers: authenticatedHeaders })).json()
  expect(JSON.stringify(body)).not.toContain('recipientId')
  expect(JSON.stringify(body)).not.toContain('actorId')
  expect(JSON.stringify(body)).not.toContain('discord')
})
```

- [ ] **Step 7: Run API checks and commit**

Run: `pnpm exec vitest run apps/api/tests/unit/dashboard/get-dashboard.test.ts apps/api/tests/api/dashboard/routes.test.ts && pnpm --filter @jdr-hub/api typecheck`

Expected: all dashboard unit/API/security tests PASS and the API typecheck exits successfully.

```bash
git add apps/api/src/modules/dashboard apps/api/src/app.ts apps/api/src/index.ts apps/api/tests/helpers/in-memory-dashboard-repository.ts apps/api/tests/unit/dashboard apps/api/tests/api/dashboard
git commit -m "feat: add authenticated dashboard projection"
```

### Task 4: Créer le client frontend et la page privée `/dashboard`

**Files:**
- Create: `apps/web/lib/dashboard-api.ts`
- Create: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/features/layout/app-shell.tsx`
- Test: `apps/web/tests/dashboard-api.test.ts`
- Test: `apps/web/tests/dashboard-pages.test.ts`

**Interfaces:**
- `createDashboardApi(options?: { baseUrl?: string; fetcher?: typeof fetch }): { get(): Promise<DashboardData | null> }`.
- The page fetches `/api/dashboard` with `credentials: 'include'` and `cache: 'no-store'`, matching the existing frontend API clients.
- The page passes the validated response to `DashboardView`; it does not contain business logic or notification formatting.

- [ ] **Step 1: Write failing API-client and route tests**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { DashboardData } from '@jdr-hub/shared'

const web = resolve(import.meta.dirname, '..')

const dashboardData: DashboardData = {
  nextSession: { status: 'EMPTY', data: null },
  activeGames: { status: 'READY', data: [] },
  notifications: { status: 'EMPTY', data: null },
}

it('loads the dashboard with session credentials and no user-controlled identity', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: dashboardData, error: null }), { status: 200 }))
  await expect(createDashboardApi({ baseUrl: 'http://localhost:8787/api', fetcher }).get()).resolves.toEqual(dashboardData)
  expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/dashboard', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
})

it('maps transport failures to a French actionable message', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('raw backend failure'))
  await expect(createDashboardApi({ fetcher }).get()).resolves.toBeNull()
})
```

- [ ] **Step 2: Run the frontend tests and confirm the expected failure**

Run: `pnpm exec vitest run apps/web/tests/dashboard-api.test.ts apps/web/tests/dashboard-pages.test.ts`

Expected: FAIL because the client, `/dashboard` page and dashboard view do not exist.

- [ ] **Step 3: Implement the minimal client and route composition**

The client must parse only the expected API envelope and return `null` for non-OK responses or malformed data. The `/dashboard` page is a client boundary only because it needs browser credentials and loading state; it renders `DashboardView` and localized loading/error states. The root page redirects to `/dashboard` for the authenticated MVP entry point, and the shared desktop/mobile Dashboard links target `/dashboard`.

Do not add a `userId` parameter, local storage session, client-side database import or direct notification fetch from the page.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm exec vitest run apps/web/tests/dashboard-api.test.ts apps/web/tests/dashboard-pages.test.ts`

Expected: all client and route composition tests PASS.

```bash
git add apps/web/lib/dashboard-api.ts apps/web/app/dashboard/page.tsx apps/web/app/page.tsx apps/web/features/layout/app-shell.tsx apps/web/tests/dashboard-api.test.ts apps/web/tests/dashboard-pages.test.ts
git commit -m "feat: add private dashboard route"
```

### Task 5: Construire les cartes dashboard et le résumé de notifications visible

**Files:**
- Create: `apps/web/features/dashboard/dashboard-view.tsx`
- Create: `apps/web/features/dashboard/dashboard-card.tsx`
- Create: `apps/web/features/notifications/notification-summary.tsx`
- Test: `apps/web/tests/dashboard-visual.test.ts`
- Existing notification visual tests remain unchanged; the new placement is covered by `apps/web/tests/dashboard-visual.test.ts`.

**Interfaces:**
- `DashboardView({ initial }: { initial: DashboardData })` composes `AppShell active="Dashboard"` and the dashboard cards.
- `NotificationSummary({ initial, onRead }: { initial: DashboardNotificationSummary; onRead: (id: string) => Promise<void> })` renders only the unread summary and invokes the callback after a successful mark-read request.
- `DashboardCard({ title, children, className? }: { title: string; children: ReactNode; className?: string })` owns shared card surface, border, radius and spacing tokens.

- [ ] **Step 1: Write failing visual/behavior tests**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const web = resolve(import.meta.dirname, '..')

it('places the notification summary in the desktop secondary column and after the next session on mobile', () => {
  const source = readFileSync(resolve(web, 'features/dashboard/dashboard-view.tsx'), 'utf8')
  expect(source).toContain('NotificationSummary')
  expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_320px]')
  expect(source).toContain('nextSession')
})

it('renders no notification summary when unreadCount is zero', () => {
  const source = readFileSync(resolve(web, 'features/notifications/notification-summary.tsx'), 'utf8')
  expect(source).toContain('unreadCount > 0')
})

it('keeps the shell bell as the global history entry point', () => {
  const source = readFileSync(resolve(web, 'features/layout/app-shell.tsx'), 'utf8')
  expect(source.match(/<NotificationBell/g)?.length).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 2: Run the visual tests and confirm the expected failure**

Run: `pnpm exec vitest run apps/web/tests/dashboard-visual.test.ts apps/web/tests/notifications-visual.test.ts`

Expected: FAIL because the dashboard view and notification summary are not implemented.

- [ ] **Step 3: Implement the dashboard composition**

Use a responsive grid with the first row ordered as `nextSession`, `notifications`, then secondary cards. On desktop, place the notification summary in the right column; on mobile, use normal document order so it follows the next-session card before active games. Render explicit empty and error states per block. Use Hanken Grotesk for headings, Inter for controls/body, Geist for labels and dates, and only existing Tailwind tokens.

The first implementation exposes the available F06/F07 data: next scheduled session, active games, and notification actions. Progression and full management cards are represented by explicit empty states until their own domain modules are available; no fake XP or invitation data is introduced.

- [ ] **Step 4: Implement notification behavior**

`NotificationSummary` receives only unread items. It displays the French title/body/date, a visible unread treatment that is not color-only, a link to `/planning#session-<id>`, and an accessible `Marquer comme lue` action. On success it removes the item from local state and calls the parent callback; on failure it keeps the item visible and shows the shared French notification error. The component must support keyboard focus, `aria-live` for the count, and reduced-motion-safe transitions.

Keep `NotificationBell` behavior unchanged except for extracting any duplicated item/date markup into a small shared presentation helper if that reduces duplication without changing its existing API or keyboard behavior.

- [ ] **Step 5: Run frontend tests, lint and typecheck**

Run: `pnpm exec vitest run apps/web/tests/dashboard-visual.test.ts apps/web/tests/notifications-visual.test.ts && pnpm --filter @jdr-hub/web typecheck && pnpm --filter @jdr-hub/web lint`

Expected: all dashboard/notification visual tests PASS, then frontend typecheck and lint PASS.

```bash
git add apps/web/features/dashboard apps/web/features/notifications/notification-summary.tsx apps/web/tests/dashboard-visual.test.ts
git commit -m "feat: highlight unread notifications on dashboard"
```

### Task 6: Vérifier l’intégration PostgreSQL, le responsive et la sécurité

**Files:**
- Create: `apps/api/tests/integration/postgres-dashboard.test.ts`
- Create: `docs/features/014-dashboard-notifications.md`
- Modify: `docs/project-status.md`
- Modify: `vitest.config.ts`

**Interfaces:**
- The integration test uses the existing test database conventions and synthetic UUIDs only.
- The feature fiche records the actual implementation, Red/Green/Refactor evidence, security checks, commands, limits and manual verification state.
- `docs/project-status.md` adds the feature as `IN_PROGRESS` during implementation and changes it to `IN_REVIEW` only when the PR is actually opened.

- [ ] **Step 1: Write the failing PostgreSQL projection tests**

```ts
const now = new Date('2026-09-08T12:00:00.000Z')
const seed = {
  ownerId: '00000000-0000-4000-8000-000000000001',
  memberId: '00000000-0000-4000-8000-000000000002',
  outsiderId: '00000000-0000-4000-8000-000000000003',
  upcomingSessionId: '00000000-0000-4000-8000-000000000010',
  notificationId: '00000000-0000-4000-8000-000000000020',
  otherUserNotificationId: '00000000-0000-4000-8000-000000000021',
}

it('projects only sessions visible to the owner or active member', async () => {
  const ownerDashboard = await repository.findNextSession({ userId: seed.ownerId, now })
  const memberDashboard = await repository.findNextSession({ userId: seed.memberId, now })
  const outsiderDashboard = await repository.findNextSession({ userId: seed.outsiderId, now })

  expect(ownerDashboard?.id).toBe(seed.upcomingSessionId)
  expect(memberDashboard?.id).toBe(seed.upcomingSessionId)
  expect(outsiderDashboard).toBeNull()
})

it('keeps unread summaries recipient-scoped and excludes ended sessions', async () => {
  const dashboard = await getDashboard({ userId: seed.ownerId, now, repository, notificationsRepository })

  expect(dashboard.nextSession).toMatchObject({ status: 'READY', data: { id: seed.upcomingSessionId } })
  expect(dashboard.notifications).toMatchObject({ status: 'READY', data: { unreadCount: 1 } })
  expect(JSON.stringify(dashboard)).not.toContain(seed.otherUserNotificationId)
})

it('returns an empty notification block after the only notification is marked read', async () => {
  await notificationsRepository.markRead({ notificationId: seed.notificationId, userId: seed.ownerId, now })
  const dashboard = await getDashboard({ userId: seed.ownerId, now, repository, notificationsRepository })
  expect(dashboard.notifications).toEqual({ status: 'EMPTY', data: null })
})
```

The integration fixture creates two users, one owner game, one active member,
one outsider, one scheduled session in the future, one completed session in
the past, one unread notification for the owner and one unread notification
for the other user. `seed` is a typed object containing those UUIDs; all UUIDs
are generated as reserved test values and no production data is loaded.

- [ ] **Step 2: Run the integration tests against the test database**

Run: `DATABASE_URL=postgresql://jdr_hub_app:ci-only-development-password@127.0.0.1:15432/jdr_hub_test pnpm test:integration -- apps/api/tests/integration/postgres-dashboard.test.ts`

Expected: the new integration tests initially fail because the dashboard repository/projection is incomplete, then pass after the implementation is wired. No production `.env`, real identifier or real user data may be used.

- [ ] **Step 3: Perform the manual responsive/accessibility check**

Check `/dashboard` at mobile, tablet and desktop widths with synthetic data containing zero, one and three unread notifications. Verify the card is absent at zero, prominent below the next session on mobile, in the right column on desktop, keyboard reachable, focus-visible, readable without color perception, and not hidden behind the mobile bottom navigation or fixed header.

- [ ] **Step 4: Run repository-wide verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @jdr-hub/api build
pnpm --filter @jdr-hub/web build
git diff --check
git status --short
```

Expected: all tests, lint, typechecks, builds and whitespace checks PASS; `git status --short` contains only intended feature files and no secret, build, log, database or temporary file.

- [ ] **Step 5: Complete documentation and review the diff**

Document the exact placement decision, the conditional rendering rule, the API projection, security controls, test commands/results, coverage impact, known limitation that full MJ management is separate, and the manual responsive check. Review all changed files against the specification, design system, AI access policy and security checklist before preparing the PR.

- [ ] **Step 6: Commit the documentation**

```bash
git add docs/features/014-dashboard-notifications.md docs/project-status.md apps/api/tests/integration/postgres-dashboard.test.ts
git commit -m "docs: track dashboard notification feature"
```

## Definition of Done

- `GET /dashboard` is authenticated, user-scoped by session and returns explicit independent block states.
- Unread notifications are queried server-side, bounded, recipient-scoped and absent from the dashboard when their count is zero.
- The desktop and mobile placements match the approved design decision.
- The bell remains the shared global notification entry point.
- Loading, empty, error, keyboard, focus-visible, responsive and reduced-motion states are covered.
- No frontend component imports database code or implements business authorization.
- Unit, API, integration and frontend tests cover nominal, empty, unauthorized, cross-user and partial-failure cases.
- TypeScript, lint, builds, full tests and diff checks pass.
- The feature fiche and project status are updated, the branch is pushed, and a PR targeting `develop` is opened only after the owner’s review gate is ready.
