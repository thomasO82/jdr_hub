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

## Architecture et sécurité

Les scripts sont de simples alias vers Docker Compose existant. Aucun port,
réseau, secret, dépendance ou service n’est modifié. Le seed reste protégé par
son refus de l’environnement production.

## Tests et preuve TDD

- **Red :** le test d’infrastructure échouait car les quatre scripts n’étaient
  pas déclarés.
- **Green :** les alias ont été ajoutés au `package.json` racine.
- **Refactor :** le README et le suivi projet utilisent désormais les alias
  courts.

## Vérifications

- `pnpm exec vitest run tests/infrastructure/developer-scripts.test.ts` — vert.
- `pnpm test` — 60 fichiers, 142 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `git diff --check` — vert.

## Limites et travaux reportés

- Les commandes supposent Docker Compose disponible et un `.env` configuré pour
  les variables obligatoires de l’API.
- La Pull Request reste à créer.
