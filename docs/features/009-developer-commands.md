# DEV-002 — Commandes de développement

## Identifiant

DEV-002

## Statut

`IN_PROGRESS`

## Branche

`chore/make-container-commands`

## Lien ou numéro de Pull Request

Non créée.

## Dates

- Début : 2026-09-05
- Fin : Non terminée

## Contexte et besoin

Réduire les commandes Docker nécessaires pour démarrer, reconstruire et arrêter
la stack locale, ainsi que pour appliquer les seeds de développement.

## Fonctionnalités effectivement réalisées

- `make up` démarre la stack sans rebuild.
- `make rebuild` reconstruit puis démarre tous les conteneurs.
- `make recreate` reconstruit et recrée tous les conteneurs.
- `make seed` exécute le seed dans le conteneur API et utilise la base
  PostgreSQL privée de Compose.
- `make studio` démarre Drizzle Studio.
- `make down` arrête la stack.

## Architecture et sécurité

Le Makefile centralise les commandes Docker Compose. Aucun port, réseau,
secret, dépendance ou service n’est modifié. Le seed reste protégé par
son refus de l’environnement production.

## Tests et preuve TDD

- **Red :** le test d’infrastructure échouait car le `Makefile` était absent
  et les scripts Docker pnpm étaient encore présents.
- **Green :** les cibles Make ont été ajoutées et les scripts Docker ont été
  retirés du `package.json` racine.
- **Refactor :** le README et les fiches de suivi utilisent désormais les
  cibles Make.

## Vérifications

- `pnpm exec vitest run tests/infrastructure/developer-scripts.test.ts tests/infrastructure/drizzle-studio.test.ts` — 2 fichiers, 6 tests verts.
- `pnpm exec vitest run --exclude apps/api/tests/integration/postgres-xp.test.ts` — 124 fichiers, 331 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `pnpm build` — vert.
- `make -n up rebuild recreate seed studio down` — cibles vérifiées sans démarrer de conteneur.
- `git diff --check` — vert.
- `pnpm audit --audit-level=high` — échec avec 6 vulnérabilités déjà présentes dans Next.js/sharp ; aucune dépendance n’a été modifiée par cette évolution.

## Limites et travaux reportés

- Les commandes supposent Docker Compose disponible et un `.env` configuré pour
  les variables obligatoires de l’API.
- Le test PostgreSQL `apps/api/tests/integration/postgres-xp.test.ts` n’a pas
  été exécuté sans `DATABASE_URL` ; les autres tests applicables sont verts.
- La Pull Request reste à créer.
