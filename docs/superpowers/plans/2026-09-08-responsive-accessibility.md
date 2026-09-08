# F10 Responsive, accessibilité et états UI — plan d’implémentation

> **Pour l’agent d’implémentation :** utiliser le skill `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Respecter `superpowers:test-driven-development` : chaque comportement nouveau doit être testé avant le code de production.

**Objectif :** harmoniser le shell authentifié et les écrans prioritaires du MVP sur mobile, tablette et desktop, avec des états de chargement, erreur, vide et interaction accessibles, sans modifier les règles métier ni les contrats API.

**Architecture :** conserver `AppShell` comme point d’entrée public, mais extraire ses zones réutilisables dans `AppHeader`, `DesktopSidebar`, `MobileHeader` et `MobileBottomNav`. Centraliser les états asynchrones visuels dans `features/ui/async-state.tsx`. Les pages restent des compositions de vues ; aucune logique métier ne doit être déplacée dans le shell.

**Stack :** Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4 uniquement, Lucide React, Vitest. Aucune nouvelle dépendance.

**Spécification validée :** `docs/superpowers/specs/2026-09-08-responsive-accessibility-design.md`

## Contraintes globales

- Travailler uniquement sur la branche `feat/responsive-accessibility`, créée depuis `develop` à jour.
- Ne pas modifier les routes REST, les schémas, les validations métier, les permissions, les migrations ou les tests fusionnés.
- Ne pas ajouter de fichier CSS, de style inline, de CSS-in-JS ou de valeur Tailwind arbitraire non justifiée.
- Employer le logo officiel `apps/web/public/branding/logo.svg` et les rôles typographiques documentés dans `docs/design-system.md`.
- Utiliser les libellés français déjà prévus par le design system : `Tableau de bord`, `Parties`, `Joueurs`, `Planning`, `Profil`.
- Préserver le comportement actuel de la cloche : elle reste visible uniquement dans le shell authentifié et son panneau s’ouvre par clic ou clavier.
- Ajouter `motion-reduce:transition-none` aux transitions introduites ou harmonisées ; ne pas utiliser une animation indispensable à la compréhension.
- Toute commande de test doit être exécutée depuis la racine avec pnpm.

## Tâche 1 — Refactorer le shell partagé et ses états actifs

**Fichiers de test :**

- Modifier `apps/web/tests/web-shell.test.ts`.
- Compléter les assertions pertinentes de `apps/web/tests/dashboard-visual.test.ts`.

**Fichiers de production :**

- Créer `apps/web/features/layout/app-header.tsx`.
- Créer `apps/web/features/layout/desktop-sidebar.tsx`.
- Créer `apps/web/features/layout/mobile-header.tsx`.
- Créer `apps/web/features/layout/mobile-bottom-nav.tsx`.
- Modifier `apps/web/features/layout/app-shell.tsx`.
- Mettre à jour les appels `AppShell active=...` dans les vues et pages existantes.

### Étapes TDD

1. Écrire les tests source-level qui vérifient :

   - `AppShell` compose les quatre zones partagées et conserve `children` ;
   - le logo vient de `/branding/logo.svg` ;
   - les cinq entrées de navigation utilisent exactement les libellés français et les liens `/dashboard`, `/parties`, `/joueurs`, `/planning`, `/profil` ;
   - l’état actif possède un attribut ou une classe identifiable et reste visible au clavier ;
   - la navigation desktop est masquée sous `lg` et la navigation mobile est masquée à partir de `lg` ;
   - les boutons de création, notifications et menu mobile ont une cible minimale de 48 px, un `focus-visible` explicite et une transition compatible avec `prefers-reduced-motion` ;
   - les deux variantes de header utilisent le composant `NotificationBell` sans créer une seconde implémentation de la cloche.

2. Exécuter le test ciblé en phase Red :

   ```bash
   pnpm exec vitest run apps/web/tests/web-shell.test.ts apps/web/tests/dashboard-visual.test.ts
   ```

   Le test doit échouer sur l’absence des composants nommés et/ou sur les libellés anglais actuels. Un échec dû à une faute de test doit être corrigé avant de continuer.

3. Implémenter les quatre composants de shell avec les responsabilités suivantes :

   - `AppHeader` : contrat visuel commun du header et composition responsive, sans logique de navigation métier ;
   - `DesktopSidebar` : logo, navigation verticale et CTA `Créer une partie` ;
   - `MobileHeader` : logo, action notifications et bouton de menu si le menu mobile est rendu interactif ;
   - `MobileBottomNav` : navigation principale, état actif, bouton de création flottant et réserve basse cohérente avec la barre fixe.

4. Faire de `AppShell` un orchestrateur court : il rend le shell, le conteneur de contenu et les enfants. Il ne doit pas contenir plusieurs copies du markup de header/navigation.

5. Remplacer les valeurs anglaises passées à `active` dans tout le frontend, notamment `Dashboard`, `Games`, `Players`, `Schedule` et `Profile`, par les libellés français centralisés. Ne pas casser les usages sans valeur `active`.

6. Ajouter les états de focus visibles aux branches actives et inactives, conserver les zones tactiles de 48 px, garder `pb-28` sur le contenu mobile et ajouter les variantes `motion-reduce` aux transitions du shell.

7. Relancer les tests ciblés, puis vérifier que les tests visuels existants du dashboard passent sans modifier leurs attentes métier.

8. Commit atomique :

   ```bash
   git add apps/web/features/layout apps/web/tests/web-shell.test.ts apps/web/tests/dashboard-visual.test.ts apps/web/features apps/web/app
   git commit -m "refactor: harmonize responsive application shell"
   ```

## Tâche 2 — Centraliser les états UI accessibles

**Fichiers de test :**

- Créer `apps/web/tests/async-state-visual.test.ts`.
- Compléter `apps/web/tests/dashboard-visual.test.ts` pour les états du dashboard.

**Fichiers de production :**

- Créer `apps/web/features/ui/async-state.tsx`.
- Modifier `apps/web/features/dashboard/dashboard-block.tsx`.
- Modifier les vues qui rendent un état de chargement/erreur/absence dans le périmètre F10.

### Étapes TDD

1. Définir dans les tests les trois variantes réutilisables :

   - `LoadingState` : `role="status"` et texte français ou contenu annoncé aux lecteurs d’écran ;
   - `ErrorState` : `role="alert"`, message utilisateur en français et bouton `Réessayer` lorsqu’un callback est fourni ;
   - `EmptyState` : texte explicite, sans attribut d’erreur et avec une action optionnelle.

2. Vérifier dans ces mêmes tests que les actions possèdent `min-h-12`, `focus-visible`, `disabled`/`aria-disabled` cohérent et `motion-reduce:transition-none` lorsqu’une transition est utilisée.

3. Exécuter :

   ```bash
   pnpm exec vitest run apps/web/tests/async-state-visual.test.ts apps/web/tests/dashboard-visual.test.ts
   ```

   La phase Red doit échouer parce que le module partagé n’existe pas encore et parce que `DashboardBlock` utilise encore ses variantes locales.

4. Implémenter les composants génériques sans y placer d’accès API ni de règle métier. Les messages doivent rester injectés par la vue afin de ne pas masquer le contexte métier.

5. Adapter `DashboardBlock` pour réutiliser ces composants tout en conservant les rôles et le rendu des données existants. Ne pas changer le type des projections du dashboard.

6. Vérifier que le chargement initial du dashboard conserve `AppShell` et la navigation, qu’une erreur permet une nouvelle tentative et qu’un état vide ne ressemble pas à une erreur.

7. Relancer les tests ciblés et supprimer uniquement le markup devenu redondant.

8. Commit atomique :

   ```bash
   git add apps/web/features/ui apps/web/features/dashboard apps/web/tests/async-state-visual.test.ts apps/web/tests/dashboard-visual.test.ts
   git commit -m "feat: standardize accessible async states"
   ```

## Tâche 3 — Rendre dashboard et profil XP cohérents sur les trois viewport

**Fichiers de test :**

- Modifier `apps/web/tests/dashboard-visual.test.ts`.
- Modifier `apps/web/tests/xp-visual.test.ts`.

**Fichiers de production :**

- Modifier `apps/web/features/dashboard/dashboard-view.tsx`.
- Modifier `apps/web/features/xp/xp-history-view.tsx`.
- Modifier, si nécessaire, les composants de progression déjà utilisés par ces vues.

### Étapes TDD

1. Ajouter les assertions avant le code pour :

   - un contenu principal avec un titre identifiable et une hiérarchie de titres conservée ;
   - une grille qui s’empile sur mobile, passe par une variante tablette et conserve les colonnes desktop ;
   - les CTA et liens principaux en cible tactile 48 px avec `focus-visible` ;
   - la progression XP avec `aria-valuenow`, `aria-valuemin` et `aria-valuemax` inchangés ;
   - les états loading/error/empty et l’action `Réessayer` annoncés correctement ;
   - aucune animation obligatoire sans variante `motion-reduce`.

2. Exécuter les tests dashboard/XP en Red et confirmer que les nouvelles attentes échouent sur les classes ou états manquants, pas sur un import cassé.

3. Ajuster les classes Tailwind dans les vues, en respectant l’ordre `layout → spacing → sizing → typography → color → border → interaction → responsive`. Garder les projections, appels de services, labels métier et liens fonctionnels inchangés.

4. Harmoniser l’action de retour du profil XP avec une route existante et explicite si le lien actuel vers `/profil` reste sans page ; documenter ce choix dans le commentaire de code ou la fiche F10 seulement si une correction de parcours est nécessaire.

5. Vérifier que la notification du dashboard n’est rendue que lorsque le résumé existe et que le placement reste lisible sur mobile et desktop.

6. Relancer les tests ciblés, puis commit :

   ```bash
   git add apps/web/features/dashboard apps/web/features/xp apps/web/tests/dashboard-visual.test.ts apps/web/tests/xp-visual.test.ts
   git commit -m "fix: improve dashboard and profile responsiveness"
   ```

## Tâche 4 — Corriger les contrôles du planning et ses états responsive

**Fichiers de test :**

- Modifier `apps/web/tests/planning-visual.test.ts`.
- Créer ou compléter `apps/web/tests/planning-accessibility.test.ts` si les assertions de comportement clavier dépassent le test visuel existant.

**Fichiers de production :**

- Modifier `apps/web/features/planning/planning-view.tsx`.
- Modifier `apps/web/features/planning/month-calendar.tsx`.
- Modifier `apps/web/features/planning/session-card.tsx`.
- Modifier `apps/web/app/planning/page.tsx` si l’état initial doit réutiliser le shell sans changer le contrat de service.

### Étapes TDD

1. Écrire les attentes suivantes :

   - la vue utilise `active="Planning"` ;
   - les boutons mois précédent, mois suivant et aujourd’hui ont une cible de 48 px, un libellé accessible, un focus visible et un état réduit-motion ;
   - les onglets Mois/Semaine/Jour indiquent l’état actif sans dépendre uniquement de la couleur ;
   - le calendrier desktop possède une structure lisible par les technologies d’assistance et la liste mobile conserve un titre de séance et son statut ;
   - le bouton d’absence est désactivé quand aucune séance n’est disponible avec une explication accessible ;
   - l’état vide et l’état d’erreur utilisent les rôles et messages français attendus.

2. Exécuter les tests ciblés en Red.

3. Implémenter les classes et attributs nécessaires. Ne pas transformer le calendrier en nouveau composant métier et ne pas modifier les dates, fuseaux horaires, filtres ou règles d’absence.

4. Sur mobile, conserver la liste des séances comme représentation principale ; sur desktop, conserver la grille mensuelle et la colonne latérale. Les classes doivent respecter les breakpoints documentés sans masquer une information importante.

5. Rendre les boutons de `SessionCard` cohérents avec les autres actions et vérifier le focus des commandes de navigation au clavier.

6. Relancer les tests de planning et commit :

   ```bash
   git add apps/web/features/planning apps/web/app/planning/page.tsx apps/web/tests/planning-visual.test.ts apps/web/tests/planning-accessibility.test.ts
   git commit -m "fix: make planning controls responsive and accessible"
   ```

## Tâche 5 — Compléter les états et contrôles de disponibilités et de joueurs

**Fichiers de test :**

- Modifier `apps/web/tests/availability-visual.test.ts`.
- Modifier `apps/web/tests/players-visual.test.ts`.
- Créer `apps/web/tests/availability-players-accessibility.test.ts` si le regroupement des assertions communes reste lisible.

**Fichiers de production :**

- Modifier `apps/web/features/availability/availability-view.tsx`.
- Modifier `apps/web/features/availability/availability-grid.tsx`.
- Modifier `apps/web/features/players/player-search-view.tsx`.

### Étapes TDD

1. Tester avant modification :

   - `Disponibilités` utilise `active="Profil"` et conserve la grille 4/8/12 adaptée aux viewport ;
   - un échec de lecture initial des disponibilités est visible, annoncé et réessayable au lieu de disparaître silencieusement ;
   - les cases à cocher et champs d’heures ont labels, focus visible, cible tactile suffisante et état désactivé lisible ;
   - `Joueurs` utilise `active="Joueurs"`, conserve les filtres sur mobile et expose l’ouverture/fermeture du panneau avec `aria-expanded` et `aria-controls` ;
   - pagination, recherche et bouton de filtres sont utilisables au clavier et mesurent au moins 48 px sur mobile ;
   - les résultats, états vides et erreurs restent dans une région annoncée sans exposer le texte brut d’une exception API.

2. Exécuter les tests ciblés et confirmer la phase Red.

3. Ajouter l’état d’erreur initial aux disponibilités en conservant le service existant et en traduisant l’action utilisateur. Ne pas exposer l’erreur brute ni modifier la réponse API.

4. Harmoniser les contrôles Tailwind de la grille et des filtres. Ajouter les états `hover`, `focus-visible`, `disabled` et `motion-reduce` seulement là où ils sont pertinents.

5. Conserver la recherche de joueurs, le filtrage multi-critères, la pagination et les données affichées. Les changements se limitent au shell, aux états et à la présentation responsive.

6. Relancer les tests ciblés et commit :

   ```bash
   git add apps/web/features/availability apps/web/features/players apps/web/tests/availability-visual.test.ts apps/web/tests/players-visual.test.ts apps/web/tests/availability-players-accessibility.test.ts
   git commit -m "fix: improve availability and player search states"
   ```

## Tâche 6 — Documentation fonctionnelle et traçabilité

**Fichiers :**

- Créer `docs/features/016-responsive-accessibility.md`.
- Modifier `docs/project-status.md`.
- Modifier `docs/design-system.md` uniquement si un token ou une règle générale change réellement.
- Modifier `docs/implementation-plan.md` uniquement pour corriger une règle devenue obsolète, sans réécrire l’historique.

### Étapes

1. Rédiger la fiche F10 avec : objectif, périmètre réellement implémenté, écrans touchés, règles responsive, accessibilité, états UI, décisions, limites reportées, preuve TDD Red/Green/Refactor, contrôles de sécurité, commandes et résultats.

2. Garder le statut `IN_PROGRESS` tant que la PR n’est pas créée. Passer à `IN_REVIEW` uniquement après push réussi et ouverture effective de la PR. Ne jamais écrire `MERGED` avant confirmation du propriétaire.

3. Documenter explicitement les écrans mobiles différés : création de partie, détail public et gestion MJ, sauf s’ils ont été ajoutés dans cette branche de façon cohérente et testée.

4. Vérifier que les documents ne contiennent ni secrets, ni données personnelles, ni valeurs d’environnement.

5. Commit documentaire :

   ```bash
   git add docs/features/016-responsive-accessibility.md docs/project-status.md docs/design-system.md docs/implementation-plan.md
   git commit -m "docs: track responsive accessibility feature"
   ```

## Tâche 7 — Vérification complète avant PR

Exécuter après tous les commits fonctionnels et documentaires :

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Puis effectuer les contrôles suivants :

- rechercher les fichiers CSS, `style=`, balises `<style>`, `dangerouslySetInnerHTML`, secrets évidents et fichiers parasites ajoutés ;
- vérifier que les tests fusionnés n’ont pas été supprimés, affaiblis ou marqués `skip`, `todo` ou `only` ;
- vérifier les sources `AppShell` et les cinq écrans avec `rg` pour repérer les anciens états actifs anglais ;
- vérifier au clavier les routes `/dashboard`, `/planning`, `/disponibilites`, `/joueurs` et `/profil/xp` ;
- vérifier en largeur mobile, tablette et desktop : header, nav, cloche, CTA, contenu, cartes, états vides/erreurs et barre basse ;
- vérifier avec `prefers-reduced-motion: reduce` que l’information et les contrôles restent utilisables ;
- vérifier que les messages visibles sont en français clair et ne rendent jamais l’exception API brute.

Si une vérification échoue, appliquer `superpowers:systematic-debugging` avant toute correction. Ne pas désactiver la vérification pour obtenir un résultat vert.

## Tâche 8 — Préparer la Pull Request

1. Relire le diff complet et les fichiers non suivis.
2. Vérifier que la branche est toujours basée sur `develop` et qu’aucun fichier hors périmètre n’a été modifié.
3. Pousser la branche dédiée sans force push :

   ```bash
   git push origin feat/responsive-accessibility
   ```

4. Ouvrir une PR vers `develop` avec : résumé, fichiers/modules, critères, preuve TDD, règles métier inchangées, sécurité, commandes/résultats, limites, vérification manuelle et captures si disponibles.
5. Mettre la fiche et le tableau global à `IN_REVIEW` seulement après ouverture réelle de la PR.
6. S’arrêter et fournir le lien de PR. La fusion reste réservée au propriétaire.

## Ordre des commits attendu

1. `refactor: harmonize responsive application shell`
2. `feat: standardize accessible async states`
3. `fix: improve dashboard and profile responsiveness`
4. `fix: make planning controls responsive and accessible`
5. `fix: improve availability and player search states`
6. `docs: track responsive accessibility feature`

Des commits plus petits sont acceptés si chacun reste cohérent et que le cycle Red/Green/Refactor est traçable dans la fiche F10.

