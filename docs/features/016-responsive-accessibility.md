# Responsive, accessibilité et états UI

## Identifiant

F10

## Statut

IN_PROGRESS

## Branche

`feat/responsive-accessibility`

## Lien ou numéro de Pull Request

Non créée

## Dates de début et de fin

- Début : 2026-09-08
- Fin : Non terminée

## Dépendances

### Prévues

- F01 à F09 pour l’identité, les modules métiers et les écrans authentifiés ;
- le shell applicatif existant et les règles de `docs/design-system.md` ;
- la spécification F10 validée dans `docs/superpowers/specs/2026-09-08-responsive-accessibility-design.md`.

### Réalisées ou constatées

- F09 est fusionnée dans `develop` et fournit l’écran de progression XP ;
- les vues dashboard, planning, disponibilités et joueurs existaient déjà avec leurs contrats frontend ;
- le logo officiel et les tokens Tailwind sont disponibles.

### Restantes

- Revue et validation humaines de la Pull Request ;
- vérification manuelle dans un navigateur réel sur les trois familles de viewport.

## Contexte

### Prévu

Harmoniser le shell authentifié et les écrans prioritaires du MVP afin que la navigation, les états asynchrones, les contrôles et les zones tactiles restent cohérents et accessibles sur mobile, tablette et desktop.

### Réalisé

Le shell partage désormais ses zones desktop/mobile via `AppHeader`, `DesktopSidebar`, `MobileHeader` et `MobileBottomNav`. Les libellés de navigation sont français, l’état actif est annoncé, la cloche reste le point d’entrée global des notifications et les contrôles principaux ont un focus visible et des cibles tactiles adaptées.

Les états chargement, erreur et absence sont centralisés dans `features/ui/async-state.tsx`. Le dashboard, le profil XP, le planning, les disponibilités et la recherche de joueurs utilisent des messages français, des rôles ARIA adaptés et des actions de reprise lorsque cela est pertinent.

### Restant à faire

Les écrans mobiles dédiés de création de partie, de détail public et de gestion MJ restent reportés à une sous-PR ultérieure. La landing page publique n’est pas modifiée.

## Besoin utilisateur

### Prévu

Pouvoir naviguer, consulter les états de chargement/erreur/vide et utiliser les actions essentielles au clavier ou au toucher, sans perte d’information entre mobile, tablette et desktop.

### Réalisé

Les écrans prioritaires conservent leurs données et parcours métier tout en ajoutant des états visibles, des libellés accessibles, des contrôles d’onglets du planning, une divulgation des filtres joueurs et une reprise des erreurs initiales de disponibilités/planning.

### Restant à faire

Le contrôle manuel visuel et clavier sur navigateur réel reste à effectuer avant la revue.

## Périmètre prévu

- shell authentifié partagé et navigation responsive ;
- dashboard et profil XP ;
- planning et liste mobile des séances ;
- disponibilités et recherche de joueurs ;
- états UI accessibles, focus, cibles tactiles et `prefers-reduced-motion` ;
- tests source-level responsive/accessibilité et documentation.

## Fonctionnalités effectivement réalisées

- extraction des zones réutilisables du shell sans modifier les contrats API ;
- navigation française et état actif annoncé par `aria-current` ;
- composants `LoadingState`, `ErrorState` et `EmptyState` ;
- planning avec navigation de mois, onglets indiquant leur sélection, grille sémantique et liste mobile ;
- état de lecture des disponibilités récupérable par bouton `Réessayer` ;
- filtres joueurs contrôlables sur mobile par `aria-expanded` et `aria-controls` ;
- tailles minimales, focus visible, transitions réduites et animations désactivables dans les vues concernées ;
- lien de retour XP vers une route existante (`/dashboard`).

## Règles métier et contrats

- Aucun endpoint, schéma partagé, service métier, permission, migration ou format de réponse API n’a été modifié.
- Les règles de sessions, absences, disponibilités, recherche, notifications et XP restent dans leurs modules existants.
- Les erreurs visibles sont formulées en français et ne rendent pas d’exception brute.

## Preuve TDD

### Red

Les tests ont été écrits avant les modifications correspondantes et ont échoué pour les comportements attendus : composants du shell absents, états UI non centralisés, attributs responsive/accessibilité manquants et contrôles des vues non harmonisés.

### Green

Les implémentations minimales ont ensuite fait passer les suites ciblées du shell, dashboard, états UI, XP, planning, disponibilités et joueurs.

### Refactor

Le markup du shell et les états asynchrones ont été factorisés après passage au vert. Les vues ont été reformattées lorsque nécessaire pour rendre les responsabilités, la hiérarchie sémantique et les variantes responsive lisibles.

### Vérifications ciblées actuelles

```text
web-shell.test.ts                              2 tests verts
dashboard-visual.test.ts                       4 tests verts
async-state-visual.test.ts                     2 tests verts
xp-visual.test.ts                              3 tests verts
planning-visual.test.ts                        2 tests verts
planning-accessibility.test.ts                 1 test vert
availability-visual.test.ts                    3 tests verts
players-visual.test.ts                         1 test vert
availability-players-accessibility.test.ts     2 tests verts
web typecheck                                  vert
```

Résultats finaux : `pnpm test` avec PostgreSQL de test temporaire : 125 fichiers et 333 tests verts ; `pnpm lint` vert ; `pnpm typecheck` vert ; `pnpm build` vert ; `git diff --check` vert.

## Sécurité

- Aucun changement d’authentification, de session, de route API, de permission ou de persistance.
- Les états d’erreur frontend ne montrent pas les exceptions ou réponses API brutes.
- Les données XP, disponibilités, joueurs et notifications restent servies par les mêmes projections et limites existantes.
- Les contrôles conservent le focus clavier et les états désactivés ; aucune protection backend n’est remplacée par une protection visuelle.
- Aucun secret, fichier `.env` ou identifiant réel n’a été lu ou ajouté.

## Limites connues et travaux reportés

- La revue visuelle humaine et la vérification navigateur sont encore nécessaires.
- Les écrans mobiles de création, détail public et gestion MJ sont hors de cette tranche.
- Aucun test E2E navigateur ni audit automatisé axe n’est ajouté dans cette PR ; les dépendances et l’infrastructure restent inchangées.

## Commandes finales à consigner

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Le conteneur PostgreSQL temporaire utilisé pour la suite d’intégration a été arrêté et supprimé après vérification.
