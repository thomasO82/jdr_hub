# F03 — Catalogue public, détail et SEO

## Identifiant

F03

## Statut

`IN_PROGRESS`

## Branche

`feat/public-games-and-seo`

## Lien ou numéro de Pull Request

Non créée.

## Dates de début et de fin

- Début : 2026-09-05
- Fin : Non terminée

## Dépendances

### Prévues

- F01 — authentification et sessions.
- F02 — parties, tags et cycle de vie.
- REF-001 — frontend Tailwind-only.

### Réalisées ou constatées

- F01, F02 et REF-001 sont fusionnées dans `develop`.

### Restantes

- Aucune dépendance bloquante identifiée.

## Contexte

### Prévu

Rendre les parties publiques découvrables et indexables par les moteurs de
recherche, sans exposer de données privées.

### Réalisé

La conception est validée et documentée dans
`docs/superpowers/specs/2026-09-05-public-games-seo-design.md`.

### Restant à faire

L’implémentation API, SSR, SEO et les vérifications restent à réaliser.

## Besoin utilisateur

### Prévu

Rechercher une partie, ouvrir une fiche partageable et découvrir les parties
publiques depuis une URL indexable.

### Réalisé

Aucun parcours F03 n’est déclaré réalisé avant la fin des tests.

### Restant à faire

Catalogue, fiches publiques, pages MJ/tags/jeux et métadonnées SEO.

## Périmètre prévu

- Projection publique dédiée côté Hono.
- Catalogue paginé et filtres `q`, MJ et tags en logique `AND`.
- Pages SSR `/parties`, `/parties/[slug]`, `/mj/[slug]`, `/tags/[slug]` et
  `/jeux/[slug]`.
- `generateMetadata`, canonical, Open Graph, sitemap et robots.
- `noindex` des recherches libres et espaces non éditoriaux.

## Fonctionnalités effectivement réalisées

Aucune à ce stade.

## Parcours utilisateur

### Prévu

Un visiteur ouvre `/parties`, utilise les filtres conservés dans l’URL, ouvre
une partie publique et peut partager sa fiche.

### Réalisé

Aucun parcours F03 n’est encore vérifié.

### Restant à faire

Rendu SSR et contrôle manuel desktop/mobile.

## Règles métier

### Prévues

- Une partie privée, brouillon ou fermée est absente de la surface publique.
- Les projections publiques n’exposent ni identifiant interne ni donnée privée.
- Plusieurs tags sont combinés avec une logique `AND`.

### Implémentées

Aucune avant le cycle TDD.

### Non couvertes ou reportées

Les candidatures, membres, disponibilités et actions MJ restent hors F03.

## Architecture et choix techniques

### Prévu

Services de lecture Hono indépendants du transport, repository avec sélection
explicite des colonnes publiques et Server Components Next.js pour le SSR.

### Réalisé

La conception est décrite dans le document de spécification F03.

### Restant à faire

Implémenter les services, routes, client serveur et pages.

## Modèle de données et migrations

### Prévu

Réutiliser les slugs de parties et tags ; dériver les slugs de MJ et de système
par normalisation déterministe sans exposer d’identifiant technique.

### Réalisé

Aucune migration F03 exécutée.

### Restant à faire

Vérifier les collisions de slug et les index utiles sans migration destructive.

## Routes API

### Prévues

- `GET /public/games`
- `GET /public/games/:slug`
- `GET /public/gms/:slug`
- `GET /public/tags/:slug`
- `GET /public/systems/:slug`

### Implémentées

Aucune route F03 nouvelle à ce stade.

### Restantes

Toutes les routes publiques prévues.

## Interface et composants

### Prévus

- Catalogue public et filtres.
- Détail public d’une partie.
- Pages publiques MJ, tag et système.
- États vides, erreurs, pagination et métadonnées.

### Réalisés

Aucun écran F03 vérifié.

### Restants

Tous les écrans et leur adaptation responsive.

## Tests

### Prévus

- Tests API et repository de projection publique, visibilité, recherche,
  pagination, tags `AND`, XSS et slugs.
- Tests SSR des métadonnées, canonical, Open Graph, `noindex`, sitemap et
  robots.
- Tests composants du catalogue, des filtres, des états vide et erreur.

### Réalisés

Aucun test F03 ajouté avant l’écriture du cycle TDD.

### Restants

Tous les tests prévus et la non-régression complète.

## Preuve TDD Red, Green, Refactor

### Red

À renseigner après l’écriture et l’exécution des premiers tests F03.

### Green

À renseigner après l’implémentation minimale.

### Refactor

À renseigner après la refactorisation et la vérification complète.

## Contrôles de sécurité

### Prévus

- Projection publique explicite sans `ownerId`, `discordId`, session,
  disponibilité ou candidature.
- Validation stricte des filtres et limites de pagination.
- Requêtes Drizzle paramétrées et échappement React.
- `noindex` et absence de contenu privé dans le HTML, les métadonnées et le
  sitemap.

### Réalisés

Aucun contrôle F03 exécuté avant l’implémentation.

### Restants ou limites

Les tests de sécurité et la vérification des headers restent à faire.

## Documentation technique consultée

- `AGENTS.md`.
- `docs/specifications/cahier-des-charges.md`.
- `docs/design-audit.md` et `docs/design-system.md`.
- `docs/security/security-requirements.md`.
- `docs/superpowers/specs/2026-09-05-public-games-seo-design.md`.

## Fichiers principaux

- `apps/api/src/modules/games/` — API et repository publics.
- `apps/web/app/` — pages SSR et métadonnées.
- `apps/web/features/games/` — composants du catalogue et du détail.
- `docs/superpowers/specs/2026-09-05-public-games-seo-design.md` — conception.

## Limites connues

- La PR n’est pas encore créée.
- Les pages SEO F03 ne sont pas encore implémentées.
