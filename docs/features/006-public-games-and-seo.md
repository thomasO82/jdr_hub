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
`docs/superpowers/specs/2026-09-05-public-games-seo-design.md`. Les lectures
publiques, le rendu SSR et les routes SEO sont implémentés sur la branche.

### Restant à faire

La PR et la vérification manuelle dans Docker restent à réaliser.

## Besoin utilisateur

### Prévu

Rechercher une partie, ouvrir une fiche partageable et découvrir les parties
publiques depuis une URL indexable.

### Réalisé

Le catalogue public, le détail et les collections éditoriales utilisent le
client serveur public ; les parties privées et fermées restent absentes.

### Restant à faire

La vérification responsive et la revue humaine restent à faire.

## Périmètre prévu

- Projection publique dédiée côté Hono.
- Catalogue paginé et filtres `q`, MJ et tags en logique `AND`.
- Pages SSR `/parties`, `/parties/[slug]`, `/mj/[slug]`, `/tags/[slug]` et
  `/jeux/[slug]`.
- `generateMetadata`, canonical, Open Graph, sitemap et robots.
- `noindex` des recherches libres et espaces non éditoriaux.

## Fonctionnalités effectivement réalisées

- Projection publique explicite sans identifiants internes.
- Catalogue `/parties` SSR avec recherche, MJ, pagination et multi-tags `AND`.
- Détail `/parties/[slug]` et collections `/mj/[slug]`, `/tags/[slug]` et
  `/jeux/[slug]` SSR.
- Métadonnées canonical/Open Graph, `/sitemap.xml` et `/robots.txt`.
- Endpoint `/public/slugs` limité aux ressources publiques indexables.

## Parcours utilisateur

### Prévu

Un visiteur ouvre `/parties`, utilise les filtres conservés dans l’URL, ouvre
une partie publique et peut partager sa fiche.

### Réalisé

Les scénarios API et SSR sont couverts par les tests automatisés ; le contrôle
visuel desktop/mobile reste à effectuer.

### Restant à faire

Contrôle visuel et parcours de partage à vérifier manuellement.

## Règles métier

### Prévues

- Une partie privée, brouillon ou fermée est absente de la surface publique.
- Les projections publiques n’exposent ni identifiant interne ni donnée privée.
- Plusieurs tags sont combinés avec une logique `AND`.

### Implémentées

Les repositories et helpers exposent une projection publique sans `id` ni
`ownerId`, les statuts éligibles sont `OPEN` et `ACTIVE`, et les filtres tags
répétés utilisent `AND`.

### Non couvertes ou reportées

Les candidatures, membres, disponibilités et actions MJ restent hors F03.

## Architecture et choix techniques

### Prévu

Services de lecture Hono indépendants du transport, repository avec sélection
explicite des colonnes publiques et Server Components Next.js pour le SSR.

### Réalisé

La projection SQL, les services de lecture, le client public et les Server
Components sont séparés par responsabilité.

### Restant à faire

La revue visuelle et la PR restent à faire.

## Modèle de données et migrations

### Prévu

Réutiliser les slugs de parties et tags ; dériver les slugs de MJ et de système
par normalisation déterministe sans exposer d’identifiant technique.

### Réalisé

Aucune migration F03 n’a été exécutée ; le schéma existant est réutilisé.

### Restant à faire

Vérifier les collisions de slug et les index utiles sans migration destructive.

## Routes API

### Prévues

- `GET /public/games`
- `GET /public/games/:slug`
- `GET /public/gms/:slug`
- `GET /public/tags/:slug`
- `GET /public/systems/:slug`
- `GET /public/slugs`

### Implémentées

Toutes les routes prévues sont implémentées, avec `/public/slugs` pour le
sitemap.

### Restantes

La revue du contrat public et le déploiement restent à vérifier.

## Interface et composants

### Prévus

- Catalogue public et filtres.
- Détail public d’une partie.
- Pages publiques MJ, tag et système.
- États vides, erreurs, pagination et métadonnées.

### Réalisés

Les écrans SSR et leurs états vide/erreur sont implémentés en Tailwind dans les
composants de catalogue, détail et collection.

### Restants

Le contrôle responsive manuel reste reporté.

## Tests

### Prévus

- Tests API et repository de projection publique, visibilité, recherche,
  pagination, tags `AND`, XSS et slugs.
- Tests SSR des métadonnées, canonical, Open Graph, `noindex`, sitemap et
  robots.
- Tests composants du catalogue, des filtres, des états vide et erreur.

### Réalisés

Les tests API, unitaires, client et SSR F03 sont ajoutés ; la suite complète
compte 120 tests verts.

### Restants

La couverture E2E et le contrôle visuel restent reportés.

## Preuve TDD Red, Green, Refactor

### Red

Les tests ont été écrits avant les services, routes et pages ; les premiers
tests rouges signalaient les surfaces absentes.

### Green

Les tests ciblés puis la suite complète passent après l’implémentation.

### Refactor

La projection, le client public et les pages sont séparés par responsabilité,
sans modification de schéma ni de dépendance.

## Contrôles de sécurité

### Prévus

- Projection publique explicite sans `ownerId`, `discordId`, session,
  disponibilité ou candidature.
- Validation stricte des filtres et limites de pagination.
- Requêtes Drizzle paramétrées et échappement React.
- `noindex` et absence de contenu privé dans le HTML, les métadonnées et le
  sitemap.

### Réalisés

Tests de visibilité privée/fermée, projection sans identifiants, validation des
limites, filtrage `AND`, XSS rendu échappé par React et slugs publics exécutés.

### Restants ou limites

La revue manuelle des en-têtes de déploiement et le contrôle SEO avec une URL
publique restent à faire.

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
