# DEV-002 — Commandes de développement

## Identifiant

DEV-002

## Statut

`IN_PROGRESS`

## Branche

`chore/developer-commands`

## Lien ou numéro de Pull Request

Non créée.

## Dates

- Début : 2026-09-05
- Fin : Non terminée

## Contexte et besoin

Réduire les commandes Docker nécessaires pour démarrer, reconstruire et arrêter
la stack locale, ainsi que pour appliquer les seeds de développement.

## Fonctionnalités effectivement réalisées

- `pnpm dev:up` démarre la stack sans rebuild.
- `pnpm dev:rebuild` reconstruit puis démarre tous les conteneurs.
- `pnpm db:seed` exécute le seed dans le conteneur API et utilise la base
  PostgreSQL privée de Compose.
- `pnpm dev:down` arrête la stack.
- Le `Makefile` fournit des alias homogènes pour l’installation, le démarrage,
  les tests, les vérifications, le seed, Drizzle Studio et les journaux.
- `make help` documente les cibles disponibles ; `make check` enchaîne les
  tests, le lint, TypeScript et les builds.

## Architecture et sécurité

Les scripts sont de simples alias vers Docker Compose existant. Aucun port,
réseau, secret, dépendance ou service n’est modifié. Le seed reste protégé par
son refus de l’environnement production.

## Tests et preuve TDD

- **Red :** le test d’infrastructure échouait car les quatre scripts n’étaient
  pas déclarés.
- **Green :** les alias ont été ajoutés au `package.json` racine.
- **Refactor :** le Makefile regroupe les scripts pnpm sans dupliquer leur
  logique, et le README documente le parcours recommandé.

## Vérifications

- `pnpm exec vitest run tests/infrastructure/developer-scripts.test.ts` — vert.
- `pnpm test` — 108 fichiers, 302 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `pnpm build` — API et Next.js verts.
- `pnpm audit` — échec attendu sur 17 vulnérabilités de dépendances existantes
  (1 faible, 7 modérées, 4 élevées, 5 critiques), sans modification de
  dépendance dans cette fonctionnalité.
- `git diff --check` — vert.
- `pnpm test tests/infrastructure/makefile.test.ts` — 4 tests verts.

## Limites et travaux reportés

- Les commandes supposent Docker Compose disponible et un `.env` configuré pour
  les variables obligatoires de l’API.
- La Pull Request reste à créer.
