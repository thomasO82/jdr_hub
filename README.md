# JDR Hub

Socle technique du MVP JDR Hub, organisé en monorepo pnpm.

## Démarrage local

Les dépendances utilisent pnpm 11.25.0 et Node.js 24.8.0.

```bash
make install
make lint
make typecheck
make test
make build
make audit
make up
curl --fail http://127.0.0.1:18080/
curl --fail http://127.0.0.1:18080/api/health
make down
```

Pour charger les données fictives de développement après le démarrage de
PostgreSQL :

```bash
make db-seed
```

La commande charge automatiquement le `.env` racine s’il existe, applique les
migrations existantes et peut être relancée sans créer de doublons. Elle ne doit
pas être exécutée contre une base de production.

Avec Docker Compose, la même opération peut être lancée dans le conteneur API
pour utiliser automatiquement le réseau et la configuration Compose :

```bash
docker compose -f docker-compose.yml run --rm api-hono node node_modules/@jdr-hub/database/dist/seed-cli.js
```

Le Makefile expose les commandes courantes avec `make help`. `make start`
démarre la stack sans reconstruire les images, tandis que `make rebuild` et
`make recreate` reconstruisent les conteneurs. `make logs SERVICE=api-hono`
permet de suivre le service API. Les scripts pnpm sous-jacents restent
disponibles pour les usages CI et les commandes ciblées.

Pour inspecter la base de développement avec Drizzle Studio, démarrez la
stack PostgreSQL puis lancez :

```bash
make db-studio
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
