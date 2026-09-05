# F03 — Catalogue public, détail et SEO

## Statut

Conception validée en conversation ; revue du document en attente.

## Objectif

Rendre les parties publiques découvrables par recherche et par URL partageable,
avec un HTML initial complet produit par Next.js et des métadonnées SEO
cohérentes. Les données privées et les identifiants internes ne doivent jamais
quitter la projection publique de l’API.

## Périmètre

La fonctionnalité couvre :

- le catalogue paginé `/parties` avec recherche par nom, MJ et tags ;
- le détail public `/parties/[slug]` ;
- les pages éditoriales `/mj/[slug]`, `/tags/[slug]` et `/jeux/[slug]` ;
- les projections et requêtes publiques Hono nécessaires au rendu serveur ;
- `generateMetadata`, canonical, Open Graph, `sitemap.ts` et `robots.ts` ;
- les règles `noindex` pour les recherches libres, filtres combinés et pages
  non publiques.

Les candidatures, membres, disponibilités précises et actions MJ restent hors
de ce périmètre. Aucun parcours authentifié ne change.

## Sources et décisions de conception

- Le cahier des charges impose les cinq routes publiques, le rendu SSR et la
  conservation des filtres dans l’URL.
- La maquette D02 guide le catalogue desktop ; D05 guide le détail ; les
  adaptations mobile suivent le système de design lorsque la maquette mobile
  correspondante manque.
- Tailwind v4 et les composants du shell déjà fusionnés sont réutilisés.
- Le français reste la langue de l’interface ; « partie » désigne `Game` et
  « séance » désigne `GameSession`.

## Architecture et flux de données

### API publique

Le module `games` expose une lecture publique séparée des commandes privées :

- `GET /public/games` — liste filtrée et paginée ;
- `GET /public/games/:slug` — détail d’une partie `PUBLIC` en statut `OPEN` ou
  `ACTIVE` ;
- `GET /public/gms/:slug` — profil public minimal du MJ et ses parties ouvertes ;
- `GET /public/tags/:slug` — page éditoriale d’un tag actif ;
- `GET /public/systems/:slug` — page éditoriale d’un système présent dans les
  parties publiques.

Les handlers valident les paramètres avec Zod et appellent des services de
lecture dédiés. Le repository sélectionne explicitement les colonnes
publiables, joint uniquement les tags actifs et ne retourne jamais `ownerId`,
`discordId`, session, disponibilité, adresse ou données de candidature.
Les parties privées, brouillons et parties fermées se comportent comme
absentes (`404` pour un slug, liste vide pour un filtre).

Les slugs de parties et de tags existants sont réutilisés. Les slugs de MJ et
de système sont dérivés par une fonction commune de normalisation ; si
plusieurs valeurs produisent le même slug, la page regroupe les résultats au
lieu d’exposer un identifiant technique.

### Next.js SSR

Un client serveur public encapsule l’URL interne `API_INTERNAL_URL` et les
enveloppes `{ data, error, meta }`. Les Server Components appellent ce client
avant le rendu HTML. Aucun composant navigateur n’accède à PostgreSQL ni aux
secrets API.

Les filtres `q`, `gmName`, `gmId`, `tagSlugs`, `page` et `pageSize` sont lus,
normalisés et reconstruits dans l’URL par une fonction pure. Les valeurs
inconnues sont ignorées côté affichage et restent rejetées côté API.

### Indexation

- `/parties` sans recherche libre et avec la pagination de base peut être
  indexable ; les recherches, pages au-delà de la première et combinaisons de
  filtres reçoivent `noindex,follow`.
- `/parties/[slug]`, `/mj/[slug]`, `/tags/[slug]` et `/jeux/[slug]` sont
  indexables uniquement lorsque la ressource publique existe.
- Les pages absentes utilisent `notFound()` et ne génèrent pas de contenu
  éditorial trompeur.
- `sitemap.ts` ne contient que les URLs publiques déterministes ; `robots.ts`
  interdit les espaces privés et les routes de filtres non éditoriales.
- Les métadonnées utilisent un titre, une description bornée, un canonical
  absolu et l’image Open Graph par défaut sans exposer de données privées.

## Compatibilité HTTP

Les routes CRUD F02, leurs statuts, leurs erreurs et leurs réponses restent
compatibles. Les endpoints `/public/*` constituent une surface de lecture
publique dédiée ; aucune authentification ou cookie n’est requis. Les erreurs
continuent d’utiliser l’enveloppe et le `requestId` existants sans détail
interne.

## Tests et sécurité

Les tests sont écrits avant chaque implémentation :

- API : projection sans champs privés, visibilité/statut, 404 générique,
  pagination maximale, recherche casse-insensible et tags en `AND` ;
- repository : jointures paramétrées, tags inactifs, slugs accentués et
  collisions de slug ;
- SSR : présence du contenu principal dans le HTML initial, canonical, Open
  Graph, `noindex`, sitemap et robots ;
- composants : filtres conservés dans l’URL, état vide, erreur sobre,
  échappement React et responsive D02/D05 ;
- sécurité : payload XSS, injection de filtre, accès à une partie privée,
  absence d’identifiant interne et limites de pagination.

Les requêtes restent paramétrées via Drizzle, les projections publiques sont
explicites et les textes utilisateur sont échappés par React. Aucun secret,
token Discord, cookie ou disponibilité précise n’est rendu dans le HTML, les
logs, les métadonnées ou le sitemap.

## Hors périmètre et limites acceptées

- Les systèmes n’ont pas encore de table dédiée : leur page s’appuie sur les
  valeurs `games.system` publiques et une normalisation déterministe.
- Aucun JSON-LD n’est ajouté tant qu’un vocabulaire Schema.org pertinent n’est
  pas validé pour les parties JDR.
- La recherche de joueurs, les candidatures et les pages privées restent dans
  les fonctionnalités F04 à F08.
