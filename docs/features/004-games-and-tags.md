# F02 — Parties, tags et cycle de vie

## Statut

`MERGED`

## Branche

`feat/games-and-tags`

## Pull Request

Fusionnée dans `develop` via [PR #7](https://github.com/thomasO82/jdr_hub/pull/7).

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

## Réalisé à ce stade

- Contrats Zod stricts de création, mise à jour et recherche paginée.
- Tables `games`, `tags` et `game_tags`, avec migration Drizzle `0001`.
- Repository PostgreSQL avec visibilité publique, recherche par titre, MJ et
  tags en logique `AND`, validation des tags actifs et archivage propriétaire.
- Services, handlers et routes Hono `GET/POST /games`, `GET/PATCH/DELETE
  /games/:id` et `GET /tags`.
- Tests unitaires, API et intégration : suite monorepo à 89 tests verts.

## Tests et sécurité

Tests unitaires, API et intégration écrits en premier. Ils couvrent validation,
permissions par ressource, visibilité, tags multi-sélection `AND`, mass
assignment et transitions de statut. La suite monorepo passe avec 89 tests.

## Limites

La recherche publique, les pages SEO, les candidatures, les membres et les
séances seront traitées dans des fonctionnalités dédiées.
