# DEV-003 — Drizzle Studio local

## Identifiant

DEV-003

## Statut

`IN_PROGRESS`

## Branche

`chore/drizzle-studio`

## Lien ou numéro de Pull Request

Non créée.

## Dates

- Début : 2026-09-05
- Fin : Non terminée

## Contexte et besoin

Permettre l’inspection de la base PostgreSQL de développement avec Drizzle
Studio sans publier PostgreSQL sur la machine ni demander une commande longue.

## Périmètre réalisé

- Service Compose `db-studio` activé par le profil `tools`.
- Connexion au service `postgres` via le réseau Docker `database-internal` ; le
  réseau applicatif sert uniquement à rendre le port local joignable depuis
  l’hôte Docker.
- Publication locale uniquement sur `127.0.0.1:4983`.
- Image dédiée construite depuis le workspace, avec utilisateur non-root et
  version de Node déjà utilisée par les images du projet.
- Configuration Drizzle Kit alimentée par `DATABASE_URL`.
- Commande racine courte `pnpm db:studio`.
- Documentation de l’URL et de l’arrêt du service dans le README.

## Compatibilité et modèle de données

Aucun contrat HTTP, schéma, migration, dépendance ou parcours utilisateur n’est
modifié. Le service est réservé au développement local et n’est pas démarré
par la stack Compose normale.

## Architecture et sécurité

Studio rejoint le réseau interne nécessaire à PostgreSQL et le réseau
applicatif déjà utilisé pour les services exposés localement ; son seul port
publié est lié à la boucle locale. PostgreSQL reste uniquement sur
`database-internal` et n’a aucun port publié. Le conteneur utilise
`cap_drop: ALL`, `no-new-privileges` et l’utilisateur non-root `node`. Aucun
secret n’est ajouté au dépôt : Compose transmet les variables déjà fournies
par l’environnement.

## Tests et preuve TDD

- **Red :** le test d’infrastructure échouait car la commande, le service, la
  configuration `dbCredentials` et le Dockerfile n’existaient pas.
- **Green :** ces quatre éléments ont été ajoutés avec la configuration minimale
  nécessaire à Studio.
- **Refactor :** la commande et les règles de réseau sont documentées, et la
  configuration reste séparée du runtime API.

## Vérifications

- `pnpm exec vitest run tests/infrastructure/drizzle-studio.test.ts` — 4 tests
  verts.
- `pnpm test` — 61 fichiers, 146 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `pnpm build` — API et Next.js verts.
- `docker compose -f docker-compose.yml build db-studio` — image construite.
- `docker compose --profile tools up -d --force-recreate db-studio` — service
  démarré et PostgreSQL sain.
- `docker compose port db-studio 4983` — `127.0.0.1:4983`.
- `curl http://127.0.0.1:4983` — statut `404` attendu sur la racine technique,
  confirmant que le serveur répond ; l’interface est fournie par
  `https://local.drizzle.studio`.
- `git diff --check` — vert.

## Limites et travaux reportés

- Studio n’est pas destiné à la production.
- L’URL `https://local.drizzle.studio` nécessite que le service local soit
  démarré et que le navigateur autorise sa connexion à `127.0.0.1:4983`.
- La Pull Request reste à créer.
