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

## Réalisé à ce stade

- Contrats Zod stricts de création, mise à jour et recherche paginée.
- Tables `games`, `tags` et `game_tags`, avec migration Drizzle `0001`.
- Repository PostgreSQL avec visibilité publique, recherche par titre, MJ et
  tags en logique `AND`, validation des tags actifs et archivage propriétaire.
- Services, handlers et routes Hono `GET/POST /games`, `GET/PATCH/DELETE
  /games/:id`, `GET /public/games/:slug` et `GET /tags`.
- Pages Next.js `/parties`, `/parties/nouvelle` et `/parties/[slug]` avec une
  hiérarchie visuelle alignée sur les maquettes D02, D04 et D05 : shell partagé,
  sidebar desktop, navigation mobile, panneau de filtres repliable, recherche,
  cartes de catalogue, création, hero de partie, synopsis, tags, candidature et
  détails.
- Client serveur Next.js branché sur les réponses publiques de l’API pour le
  catalogue filtré et la fiche par slug, avec états vide et erreur explicites.
- Interface migrée vers Tailwind CSS v4 uniquement : tokens globaux Arcane,
  shell partagé, connexion Discord, catalogue, détail et création sans CSS
  Module ni style inline.
- Migration de données idempotente avec un référentiel initial de tags actifs
  pour les filtres et la création de partie.
- Tests unitaires, API, structure visuelle, typographie et formulaire : suite
  monorepo : 103 tests verts.

## Tests et sécurité

Tests unitaires, API et intégration écrits en premier. Ils couvrent validation,
permissions par ressource, visibilité, tags multi-sélection `AND` et mass
assignment. Les tests PostgreSQL réels et les transitions complètes de statut
restent à compléter avant l’ouverture de la PR.

## Limites

La liste et la page détail utilisent encore des données de présentation ; le
branchement SSR sur `GET /games` et `GET /games/:id`, les pages SEO complètes,
les candidatures, les membres et les séances seront traités dans des
fonctionnalités dédiées.
