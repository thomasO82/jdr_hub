# JDR Hub

Socle technique du MVP JDR Hub, organisé en monorepo pnpm.

## Démarrage local

Les dépendances utilisent pnpm 11.25.0 et Node.js 24.8.0.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
docker compose -f docker-compose.yml up -d --build --wait
curl --fail http://127.0.0.1:18080/
curl --fail http://127.0.0.1:18080/api/health
docker compose -f docker-compose.yml down
```

Le proxy Caddy publie uniquement `127.0.0.1:18080`. PostgreSQL reste privé
sur le réseau Docker interne et utilise le volume local `postgres-data`.

## Structure

- `apps/web` : shell Next.js App Router rendu côté serveur ;
- `apps/api` : API Hono et endpoint technique `/health` ;
- `packages/shared` : contrats neutres partagés ;
- `packages/database` : frontière serveur Drizzle/PostgreSQL ;
- `docker` : proxy et healthcheck PostgreSQL.

F00 ne contient aucun module métier, aucune authentification et aucune donnée
de production. Les fonctionnalités MVP sont planifiées dans les fiches de
`docs/features/`.
