# Tailwind-only Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer toute l’interface Next.js vers Tailwind CSS, sans CSS Modules ni changement de comportement observable.

**Architecture:** Un fichier `apps/web/app/globals.css` importera Tailwind v4 et déclarera les tokens du design system dans `@theme`. Les composants TSX porteront directement leurs classes utilitaires ; les CSS Modules actuels seront supprimés après migration. La logique métier, les appels API, les routes et les textes resteront inchangés.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind CSS 4, `@tailwindcss/postcss`, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-tailwind-only-architecture-design.md`

## Global Constraints

- Tailwind v4 est importé une seule fois dans `apps/web/app/globals.css`.
- Aucun nouveau fichier `.css` ou `.module.css` n’est autorisé.
- Aucun `<style>`, style inline, CSS-in-JS ou sélecteur CSS applicatif n’est autorisé hors des directives/imports/tokens Tailwind du fichier global.
- Les composants utilisent les tokens du design system plutôt que des valeurs hexadécimales recopiées.
- Les classes sont ordonnées `layout → spacing → sizing → typography → color → border → interaction → responsive`.
- Les breakpoints sont mobile `<768 px`, tablette `768–1023 px`, desktop `>=1024 px`.
- Les rôles typographiques sont Hanken Grotesk pour les titres, Inter pour le texte courant et Geist pour les labels/métadonnées.
- Les routes, requêtes, réponses, validations, cookies, textes métier et parcours restent inchangés.
- Aucun test existant ne doit être supprimé, affaibli, ignoré ou modifié pour masquer une régression.

---

### Task 1: Verrouiller l’absence de CSS local

**Files:**
- Create: `apps/web/tests/tailwind-only.test.ts`
- Test existing: `apps/web/tests/web-shell.test.ts`

**Interfaces:**
- Consumes: fichiers de l’interface sous `apps/web`.
- Produces: une règle automatisée qui échoue tant que le point d’entrée Tailwind et la migration ne sont pas terminés.

- [ ] **Step 1: Write the failing test**

Ajouter un test qui vérifie que `apps/web/app/globals.css` contient `@import "tailwindcss"`, que `apps/web/app/layout.tsx` importe ce fichier, et qu’aucun fichier `*.module.css` n’existe sous `apps/web` hors `.next`.

```ts
it('uses one global Tailwind entrypoint and no CSS modules', () => {
  expect(read('apps/web/app/globals.css')).toContain('@import "tailwindcss"')
  expect(read('apps/web/app/layout.tsx')).toContain("./globals.css")
  expect(findCssModules('apps/web')).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

Expected: FAIL because `globals.css` does not exist and the three CSS Modules are still present.

- [ ] **Step 3: Keep the failing test as the migration guard**

Ne pas ajouter de contournement ou de `skip`; les étapes suivantes doivent rendre cette assertion verte.

### Task 2: Ajouter Tailwind v4 et les règles de projet

**Files:**
- Create: `apps/web/app/globals.css`
- Create: `apps/web/postcss.config.mjs`
- Modify: `apps/web/app/layout.tsx`
- Modify: `AGENTS.md`
- Modify: `apps/web/next.config.mjs` uniquement si la CSP doit rester cohérente avec les fontes utilisées.

**Interfaces:**
- Consumes: tokens de `docs/design-system.md` et dépendances déjà présentes dans `apps/web/package.json`.
- Produces: le CSS global Tailwind chargé une fois par le layout.

- [ ] **Step 1: Write the failing test**

Étendre le test de Task 1 pour vérifier les tokens `--color-primary`, `--font-display`, `--font-body`, `--font-label`, ainsi que la présence du plugin PostCSS `@tailwindcss/postcss`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

Expected: FAIL because the global file, PostCSS configuration and tokens are absent.

- [ ] **Step 3: Write minimal implementation**

Créer `globals.css` avec `@import "tailwindcss"` et un bloc `@theme` contenant les couleurs Arcane, les familles `Hanken Grotesk`, `Inter`, `Geist`, les rayons et les breakpoints documentés. Créer `postcss.config.mjs` avec `plugins: { '@tailwindcss/postcss': {} }`. Importer `./globals.css` dans le layout avant le rendu de `body`.

Ajouter dans `AGENTS.md` une section « Tailwind-only » reprenant les onze règles de la spécification, notamment l’interdiction des CSS Modules et des styles inline.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

Expected: PASS for the global entrypoint, tokens and configuration checks; the CSS Module inventory remains the only expected failure until Tasks 3–5.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/postcss.config.mjs apps/web/app/layout.tsx AGENTS.md apps/web/tests/tailwind-only.test.ts
git commit -m "feat: configure tailwind-only frontend"
```

### Task 3: Migrer le shell partagé

**Files:**
- Modify: `apps/web/features/layout/app-shell.tsx`
- Delete after migration: `apps/web/features/layout/app-shell.module.css`
- Modify: `apps/web/tests/games-visual-shell.test.ts`

**Interfaces:**
- Consumes: tokens Tailwind et `AppShell` existant.
- Produces: le même shell desktop/mobile, avec les mêmes liens, logo officiel, états actifs et CTA.

- [ ] **Step 1: Write the failing test**

Ajouter dans le test visuel une vérification que `app-shell.tsx` ne contient plus `app-shell.module.css` et qu’il contient des classes Tailwind (`fixed`, `lg:`, `bottom-`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/games-visual-shell.test.ts`

Expected: FAIL because le composant importe actuellement son CSS Module.

- [ ] **Step 3: Write minimal implementation**

Remplacer `styles.*` par des classes Tailwind, conserver les cinq entrées de navigation, le logo `/branding/logo.svg`, les liens et l’accessibilité. Utiliser `lg:` pour la sidebar desktop et masquer/afficher le header, FAB et bottom navigation avec les variantes responsive.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/tests/games-visual-shell.test.ts`

Expected: PASS, avec le même contenu et les mêmes chemins.

- [ ] **Step 5: Delete obsolete CSS Module**

Supprimer `apps/web/features/layout/app-shell.module.css` uniquement après confirmation qu’aucun import ne subsiste.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/layout apps/web/tests/games-visual-shell.test.ts
git commit -m "refactor: migrate app shell to tailwind"
```

### Task 4: Migrer l’authentification

**Files:**
- Modify: `apps/web/features/authentication/connection-view.tsx`
- Delete after migration: `apps/web/features/authentication/connection-view.module.css`
- Modify: `apps/web/tests/connection-page.test.ts`

**Interfaces:**
- Consumes: layout global Tailwind, logo officiel et parcours `/connexion` existant.
- Produces: le même écran Discord, avec les mêmes textes, lien OAuth et états accessibles.

- [ ] **Step 1: Write the failing test**

Ajouter une assertion vérifiant l’absence d’import `connection-view.module.css` et la présence de classes Tailwind de mise en page, de focus et de responsive.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/connection-page.test.ts`

Expected: FAIL because la vue importe encore un CSS Module.

- [ ] **Step 3: Write minimal implementation**

Migrer les règles visuelles dans le JSX avec les tokens Tailwind : thème sombre, centrage, Hanken pour le titre, Inter pour le corps, focus visible et bouton Discord. Ne modifier ni URL, ni texte, ni logique de connexion.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/tests/connection-page.test.ts`

Expected: PASS.

- [ ] **Step 5: Delete obsolete CSS Module**

Supprimer `apps/web/features/authentication/connection-view.module.css` après vérification des imports.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/authentication apps/web/tests/connection-page.test.ts
git commit -m "refactor: migrate connection view to tailwind"
```

### Task 5: Migrer toutes les vues parties

**Files:**
- Modify: `apps/web/features/games/games-list-view.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Modify: `apps/web/features/games/new-game-view.tsx`
- Modify: `apps/web/features/games/filters-toggle.tsx`
- Delete after migration: `apps/web/features/games/games-view.module.css`
- Modify: `apps/web/tests/games-pages.test.ts`
- Modify: `apps/web/tests/games-visual-shell.test.ts`
- Modify: `apps/web/tests/games-form-visual.test.ts`

**Interfaces:**
- Consumes: `createGamesApi`, les paramètres de recherche, les formulaires et le shell migré.
- Produces: les mêmes pages `/parties`, `/parties/[slug]`, `/parties/nouvelle`, filtres, états vides/erreurs et actions.

- [ ] **Step 1: Write the failing test**

Ajouter une assertion commune vérifiant l’absence d’import `games-view.module.css` dans les quatre vues et la présence de classes Tailwind pour la grille, les espacements et les états focus.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/games-pages.test.ts apps/web/tests/games-form-visual.test.ts`

Expected: FAIL because les vues utilisent encore `styles.*`.

- [ ] **Step 3: Write minimal implementation**

Migrer les classes de catalogue, filtres, cartes, hero, détail, formulaire, bouton secondaire et responsive en classes Tailwind. Conserver les noms de paramètres `q`, `tagSlugs`, `gmId`, `gmName`, les appels API et les textes existants. Utiliser les tokens `font-display`, `font-body`, `font-label` et les variantes `hover:`, `focus-visible:`, `disabled:`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/tests/games-pages.test.ts apps/web/tests/games-form-visual.test.ts apps/web/tests/games-visual-shell.test.ts`

Expected: PASS, sans modification des assertions métier existantes.

- [ ] **Step 5: Delete obsolete CSS Module**

Supprimer `apps/web/features/games/games-view.module.css` après inventaire des imports.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/games apps/web/tests/games-pages.test.ts apps/web/tests/games-form-visual.test.ts apps/web/tests/games-visual-shell.test.ts
git commit -m "refactor: migrate games views to tailwind"
```

### Task 6: Contrôle documentaire et inventaire final

**Files:**
- Modify: `docs/features/004-games-and-tags.md`
- Modify: `docs/project-status.md`
- Modify: `apps/web/tests/tailwind-only.test.ts`

**Interfaces:**
- Consumes: résultats réels des tests et commandes de vérification.
- Produces: suivi F02 indiquant la migration réelle, sans déclarer une étape non exécutée.

- [ ] **Step 1: Write the failing test**

Étendre le test architectural pour parcourir `apps/web` et refuser tout import contenant `.module.css`, tout fichier CSS local hors `app/globals.css`, et toute référence `style={{` dans les composants TSX.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

Expected: FAIL si un fichier ou import interdit subsiste.

- [ ] **Step 3: Write minimal implementation**

Supprimer uniquement les fichiers CSS Modules restants et corriger les imports résiduels. Mettre à jour F02 avec le nombre de tests réel, les fichiers migrés, la règle Tailwind-only et les limites réellement observées.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/tests/tailwind-only.test.ts`

Expected: PASS avec zéro CSS Module et un seul `globals.css`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/tailwind-only.test.ts docs/features/004-games-and-tags.md docs/project-status.md
git commit -m "docs: record tailwind-only migration"
```

### Task 7: Vérification complète et livraison

**Files:**
- Verify: tous les fichiers suivis et non suivis du dépôt.

**Interfaces:**
- Consumes: l’application migrée et les tests de non-régression.
- Produces: une branche propre, poussée, avec des résultats vérifiables.

- [ ] **Step 1: Run the complete checks**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short --branch
```

Expected: tous les tests, lint, typecheck et builds passent ; aucun diff parasite, secret ou CSS interdit n’est présent.

- [ ] **Step 2: Verify the visual contract manually**

Contrôler `/connexion`, `/parties`, `/parties/nouvelle` et `/parties/<slug>` en desktop et mobile : logo officiel, typographies Hanken/Inter/Geist, sidebar, navigation mobile, filtres, cartes, formulaire et focus clavier.

- [ ] **Step 3: Commit any documentation corrections only**

Ne corriger que les résultats réellement observés dans la fiche F02 et le suivi global ; ne pas modifier un test pour obtenir du vert.

- [ ] **Step 4: Push the dedicated branch**

```bash
git push origin feat/games-and-tags
```

- [ ] **Step 5: Report results**

Fournir la branche, les commits, les fichiers migrés/supprimés, les commandes et résultats, les contrôles de sécurité, la vérification manuelle et les limites restantes. Ne pas déclarer la fonctionnalité fusionnée sans confirmation du propriétaire.
