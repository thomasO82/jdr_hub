# F02 — Parties, tags et cycle de vie

## Statut

`IN_PROGRESS`

## Branche

`feat/games-and-tags`

## Pull Request

Non créée.

## Périmètre

Créer et administrer les parties, leurs tags relationnels et les règles de
cycle de vie `ONE_SHOT`/`CAMPAIGN`. Les séances, candidatures et invitations
restent dans les fonctionnalités suivantes.

## Règles métier

- Une partie possède un propriétaire MJ, un type, un statut, une visibilité et
  une capacité maximale.
- Les tags utilisent `tags` et `game_tags`, jamais une chaîne sérialisée.
- Les tags sélectionnés sont filtrés avec une logique `AND`.
- Un one-shot est limité à trois séances ; une campagne n'a pas cette limite.
- Seul le MJ propriétaire peut modifier, fermer ou archiver sa partie.

## Architecture prévue

Module Hono `games` séparé en routes, handlers, services applicatifs et
repository PostgreSQL. Les schémas Zod et enums réellement partagés vivent
dans `packages/shared`. Les migrations sont non destructives.

## Tests et sécurité

Tests unitaires, API et intégration écrits en premier. Ils couvrent validation,
permissions par ressource, visibilité, transitions, limites one-shot, tags
multi-sélection `AND`, mass assignment et concurrence de capacité.

## Limites

La recherche publique, les pages SEO, les candidatures, les membres et les
séances seront traitées dans des fonctionnalités dédiées.
