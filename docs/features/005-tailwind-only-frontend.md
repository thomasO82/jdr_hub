# REF-001 — Migration frontend Tailwind-only

## Identifiant

REF-001

## Statut

`IN_PROGRESS`

## Branche

`refactor/tailwind-only-frontend`

## Lien ou numéro de Pull Request

Non créée.

## Dates de début et de fin

- Début : 2026-09-05
- Fin : Non terminée

## Dépendances

### Prévues

- F00 — socle Next.js et monorepo.
- F01 — écran de connexion et shell applicatif.
- F02 — contrats et catalogue des parties.

### Réalisées ou constatées

- Les dépendances sont présentes dans `develop` ; la branche a été créée après
  synchronisation avec `origin/develop`.

### Restantes

- Revue et fusion de cette branche par le propriétaire.

## Contexte

### Prévu

Supprimer les CSS Modules du frontend et appliquer exclusivement Tailwind CSS
avec les tokens du design system.

### Réalisé

Les écrans de connexion, shell, catalogue, détail et création de partie sont
portés par des classes Tailwind v4 et partagent un seul point d’entrée global.
La vue détail s’appuie aussi sur le endpoint public F02 récupéré avec les
écrans.

### Restant à faire

Les futurs écrans devront appliquer les mêmes règles.

## Besoin utilisateur

### Prévu

Disposer d’une interface cohérente avec les maquettes, lisible sur desktop et
mobile, sans feuilles CSS difficiles à maintenir.

### Réalisé

Les vues parties utilisent la palette Arcane, Hanken Grotesk, Inter, Geist,
le shell partagé et les breakpoints documentés.

### Restant à faire

Aucun écran métier supplémentaire n’est inclus dans cette migration.

## Périmètre prévu

- Ajouter l’entrée globale Tailwind et les tokens JDR Hub.
- Migrer le shell, la connexion Discord et les vues parties.
- Supprimer les CSS Modules et verrouiller la règle par test.

## Fonctionnalités effectivement réalisées

- `apps/web/app/globals.css` contient l’unique import Tailwind et les tokens.
- Le shell, la connexion, le catalogue, le détail et la création utilisent des
  classes Tailwind sans CSS Module ni style inline.
- Le test architectural refuse le retour des CSS locaux.

## Parcours utilisateur

### Prévu

Conserver les parcours existants de connexion et de découverte/création de
parties, avec un rendu visuel équivalent aux maquettes.

### Réalisé

Les routes et les textes métier restent inchangés ; seuls les styles et les
tests visuels ont été migrés.

### Restant à faire

Vérification humaine des captures desktop et mobile avant fusion.

## Règles métier

### Prévues

- Ne pas modifier les routes, réponses, validations, cookies ou règles métier
  existants pendant la migration Tailwind.
- Conserver les labels, le focus visible et le responsive existants.

### Implémentées

- Les tests API et métier existants restent verts.
- Les classes Tailwind gèrent les états responsive et focus.

### Non couvertes ou reportées

- Aucune règle métier nouvelle ; la migration ne couvre pas les futures
  fonctionnalités du catalogue SEO.

## Architecture et choix techniques

### Prévu

Un seul `apps/web/app/globals.css`, PostCSS Tailwind v4 et des classes dans les
composants TSX.

### Réalisé

`@tailwindcss/postcss` est configuré dans `apps/web/postcss.config.mjs`, les
tokens sont déclarés dans `@theme` et les trois CSS Modules ont été supprimés.

### Restant à faire

Aucun changement d’architecture restant pour cette migration.

## Modèle de données et migrations

### Prévu

Aucune modification du modèle de données.

### Réalisé

La migration Tailwind ne modifie pas le schéma existant. La branche récupère
également le seed idempotent des tags déjà développé pour F02.

### Restant à faire

Aucun.

## Routes API

### Prévues

Conserver les routes existantes.

### Implémentées

Les routes Hono existantes restent compatibles ; `GET /public/games/:slug` et
son contrat public, déjà développés pour la vue détail F02, sont conservés.

### Restantes

Aucune route nouvelle dans cette migration.

## Interface et composants

### Prévus

- Shell partagé desktop/mobile.
- Connexion Discord.
- Catalogue, détail et création de partie.

### Réalisés

- `AppShell`, `GamesListView`, `GameDetailView`, `NewGameView` et
  `ConnectionView` migrés vers Tailwind.
- `FiltersToggle` conserve le panneau de filtres repliable.

### Restants

- Vérification visuelle humaine sur les deux formats.

## Tests

### Prévus

- Tests de non-régression métier/API.
- Tests de structure visuelle et de typographie.
- Test architectural Tailwind-only.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm test` | 41 fichiers, 106 tests verts | 2026-09-05 |
| `pnpm lint` | Vert | 2026-09-05 |
| `pnpm typecheck` | Vert | 2026-09-05 |
| `pnpm build` | Vert après relance hors sandbox | 2026-09-05 |

### Restants

- Contrôle manuel des écrans dans un navigateur.

## Preuve TDD Red, Green, Refactor

### Red

- Les tests Tailwind-only et visuels ont été écrits avant la migration des
  composants dans les commits récupérés.
- L’échec initial vérifiait l’absence de `globals.css` et la présence des CSS
  Modules.

### Green

- Les tokens, la configuration PostCSS et les classes Tailwind ont été ajoutés
  jusqu’à obtenir 106 tests verts.

### Refactor

- Les styles ont été déplacés des feuilles locales vers les composants sans
  modifier les routes ni les textes.
- Lint, typecheck et build sont verts.

## Contrôles de sécurité

### Prévus

- Ne pas exposer de secret dans le frontend ou les documents.
- Conserver CSP, focus et échappement React.

### Réalisés

- Aucun secret réel ajouté ; seuls les exemples restent factices.
- Aucun `dangerouslySetInnerHTML`, style inline ou CSS Module ne subsiste sous
  `apps/web`.
- Les tests de headers et les tests API restent verts.

### Restants ou limites

- Vérification manuelle CSP et rendu responsive avant fusion.

## Documentation technique consultée

- `AGENTS.md`.
- `docs/design-system.md`.
- `docs/design-audit.md`.
- `docs/security/security-requirements.md`.
- `docs/superpowers/specs/2026-09-05-tailwind-only-architecture-design.md`.
- `docs/superpowers/plans/2026-09-05-tailwind-only-frontend.md`.

## Fichiers principaux

- `apps/web/app/globals.css` — tokens et import Tailwind unique.
- `apps/web/postcss.config.mjs` — intégration PostCSS Tailwind v4.
- `apps/web/features/layout/app-shell.tsx` — shell partagé.
- `apps/web/features/authentication/connection-view.tsx` — connexion Discord.
- `apps/web/features/games/` — catalogue, détail, filtres et création.
- `apps/web/tests/tailwind-only.test.ts` — garde architecturale.

## Limites connues

- La PR n’est pas encore créée.
- Les pages SEO publiques F03 restent à développer.
