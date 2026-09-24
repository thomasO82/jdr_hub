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
make rebuild
curl --fail http://127.0.0.1:18080/
curl --fail http://127.0.0.1:18080/api/health
make down
```

Pour charger les données fictives de développement après le démarrage de
PostgreSQL :

```bash
make seed
```

La commande charge automatiquement le `.env` racine s’il existe, applique les
migrations existantes et peut être relancée sans créer de doublons. Elle ne doit
pas être exécutée contre une base de production.

La cible `make seed` lance le seed dans le conteneur API, avec le réseau et
la configuration Docker Compose appropriés.

Les cibles Make de la stack sont `make up`, `make rebuild`, `make recreate`,
`make seed`, `make studio` et `make down`.

Pour inspecter la base de développement avec Drizzle Studio, démarrez la
stack PostgreSQL puis lancez :

```bash
make studio
```

Ouvrez ensuite <https://local.drizzle.studio>. Studio est publié uniquement
sur `127.0.0.1:4983` et utilise le réseau Docker privé ; PostgreSQL ne reçoit
toujours aucun port public. La commande reste attachée au terminal : `Ctrl-C`
arrête Studio, puis `make down` arrête les conteneurs de développement.

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
