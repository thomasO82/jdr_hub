# F00 — Socle monorepo, Docker et CI sécurisée

## Identifiant

F00

## Statut

`IN_PROGRESS`

## Branche

`chore/monorepo-foundation`, créée depuis `develop`

## Lien ou numéro de Pull Request

Non créée — la Pull Request ciblera `develop`.

## Dates de début et de fin

- Début : 2026-09-02
- Fin : Non terminée

## Dépendances

### Prévues

- Aucune fonctionnalité applicative.
- `develop` à jour depuis `main`.

### Réalisées ou constatées

- `develop` existe et suit `origin/develop`.

### Restantes

- Aucune dépendance fonctionnelle ; les outils de développement seront installés dans cette fiche au fil de F00.

## Contexte

### Prévu

Établir un socle reproductible pour le MVP JDR Hub avant l’authentification et les modules métier.

### Réalisé

La conception F00 est validée comme prochaine étape documentaire. L’implémentation technique n’a pas commencé.

### Restant à faire

Créer le workspace, les applications, les packages, les conteneurs, le routage local et la CI.

## Besoin utilisateur

### Prévu

Fournir une base technique installable, testable et reproductible pour développer JDR Hub en sécurité.

### Réalisé

Non applicable à ce stade : aucun comportement applicatif n’est encore disponible.

### Restant à faire

Rendre le socle exécutable localement et vérifiable par CI.

## Périmètre prévu

- Workspace pnpm strict.
- `apps/web` avec Next.js App Router.
- `apps/api` avec Hono et endpoint de santé.
- `packages/shared` pour les contrats partagés.
- `packages/database` préparé sans modèle métier définitif.
- `packages/ui` uniquement si un composant partagé est nécessaire au socle.
- PostgreSQL non exposé publiquement.
- Routage `/` vers Next.js et `/api/*` vers Hono sous le même domaine local.
- Docker Compose avec `web-next`, `api-hono`, `postgres` et reverse proxy local si nécessaire.
- `.env.example` factice, `.dockerignore`, images épinglées, conteneurs non-root et healthchecks.
- CI GitHub Actions pour installation, lint, TypeScript, tests, builds, audit, scan de secrets, analyse statique et scan d’images.

## Fonctionnalités effectivement réalisées

- La branche `chore/monorepo-foundation` a été créée depuis `develop`.
- La conception et les critères de F00 sont documentés.

## Parcours utilisateur

### Prévu

Un développeur clone le dépôt, fournit uniquement des valeurs factices ou des secrets par l’environnement, démarre le socle avec Docker Compose, vérifie `/` et `/api/health`, puis exécute les contrôles pnpm.

### Réalisé

Non disponible : le socle n’est pas encore implémenté.

### Restant à faire

Valider le parcours local et le parcours CI après implémentation.

## Règles métier

### Prévues

- Aucun modèle métier définitif dans F00.
- Hono reste un monolithe modulaire ; aucun microservice.
- Le frontend ne doit jamais importer `packages/database` dans du code navigateur.

### Implémentées

- Aucune règle métier applicative ; cette fiche ne présente pas la conception comme implémentée.

### Non couvertes ou reportées

- Authentification, parties, tags, candidatures, séances, disponibilités, planning, notifications et XP sont reportés aux fonctionnalités suivantes.

## Architecture et choix techniques

### Prévu

Monorepo pnpm avec Next.js App Router, Hono REST, packages TypeScript partagés, Drizzle préparé pour PostgreSQL, Docker Compose et reverse proxy local pour le routage par chemin.

### Réalisé

La stack et les frontières sont documentées dans le cahier des charges et la conception F00 ; aucun fichier applicatif n’a encore été créé.

### Restant à faire

Implémenter les frontières workspace, les scripts, les services et les vérifications reproductibles.

## Modèle de données et migrations

### Prévu

Préparer l’accès Drizzle et PostgreSQL sans créer de migration métier. Les tables `users`, `games`, `game_sessions` et autres seront ajoutées par les fonctionnalités concernées.

### Réalisé

Aucun schéma ni migration créé.

### Restant à faire

Ajouter la connectivité de test minimale sans introduire prématurément le modèle métier.

## Routes API

### Prévues

- `GET /api/health` — santé de l’API et format de réponse de base.
- `/api/*` — routage réservé à Hono sous le domaine local partagé.

### Implémentées

- Aucune route implémentée.

### Restantes

- Endpoint de santé, validation de taille de corps et format d’erreur avec `requestId`.

## Interface et composants

### Prévus

- Page Next.js minimale confirmant le démarrage du web.
- Page d’erreur de base si elle est nécessaire au shell technique.

### Réalisés

- Aucun composant applicatif.

### Restants

- Aucun écran fonctionnel ; le shell technique et les états de base restent à créer.

## Tests

### Prévus

- Test d’architecture des frontières workspace et de l’absence d’import navigateur vers `packages/database`.
- Smoke test du routage `/` et `/api/health`.
- Tests de configuration sans secret.
- Tests négatifs CI pour secret détecté, image non épinglée et conteneur root.
- Vérifications Compose/PostgreSQL et builds web/API.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `rg`, contrôles Markdown et vérifications Git documentaires | Réussis pour la phase de conception ; aucun test applicatif n’existe encore | 2026-09-02 |

### Restants

- Tous les tests F00 d’architecture, intégration, API, Compose, CI et builds.

## Preuve TDD Red, Green, Refactor

### Red

- Tests écrits avant l’implémentation : À faire avant le code F00.
- Commande exécutée : Non applicable avant la création des tests.
- Échec initial et raison attendue : À consigner lorsque les tests rouges seront exécutés.

### Green

- Implémentation minimale ajoutée : Aucune.
- Commande exécutée : Non applicable.
- Résultat : À consigner après l’implémentation minimale.

### Refactor

- Refactorisations effectuées sans changement de comportement : Aucune.
- Commande exécutée : Non applicable.
- Résultat final : À consigner après la phase Green et la refactorisation.

## Contrôles de sécurité

### Prévus

- Aucun secret dans le dépôt, les Dockerfiles, Compose, les logs ou les workflows.
- `.env.example` limité à des noms de variables et valeurs manifestement factices.
- PostgreSQL sur réseau interne, sans exposition publique par défaut.
- Images épinglées, builds multi-stage, conteneurs non-root, capacités minimales et healthchecks.
- Permissions minimales du `GITHUB_TOKEN` et scans CI.
- Taille de corps et format d’erreur contrôlés sans fuite d’informations internes.

### Réalisés

- La politique d’accès de l’IA a été consultée.
- Aucun motif de secret n’a été détecté dans les documents de cette phase.

### Restants ou limites

- Tous les contrôles techniques seront exécutés après implémentation et consignés avant la Pull Request.

## Documentation technique consultée

- `docs/specifications/cahier-des-charges.md` — version MVP septembre 2026.
- `docs/security/security-requirements.md` — référentiel de sécurité du projet.
- `docs/design-audit.md` et `docs/design-system.md` — sources design consultées pour les frontières du shell.
- `docs/implementation-plan.md` — F00 et règles de livraison.
- `docs/security/ai-access-policy.md` — politique d’accès appliquée, sans modification.

## Fichiers principaux

- À créer dans F00 : workspace pnpm, `apps/web`, `apps/api`, packages, Docker Compose, workflows CI et documentation de démarrage.

## Limites connues

- Le code applicatif et les configurations F00 ne sont pas encore implémentés.
- Aucun test automatisé de projet n’est encore disponible dans le dépôt.

## Travaux reportés

- Authentification Discord et sessions — F01.
- Modèle métier et migrations — fonctionnalités F01/F02 et suivantes.
- UI fonctionnelle et responsive — fonctionnalités applicatives puis F10.
- Release, sauvegardes et exploitation — F11.

## Vérification manuelle

### Prévue

Après implémentation : installer avec pnpm, démarrer Compose, vérifier les healthchecks, ouvrir `/`, appeler `/api/health`, puis contrôler les logs et la présence de fichiers interdits.

### Réalisée

- Vérification documentaire et de branche réalisée le 2026-09-02.

### Restante

- Toute vérification d’exécution locale et CI.

## Commits importants

- À venir : commits TDD Red, Green et Refactor de F00.

## Décisions associées

- [`001-develop-integration-branch.md`](../decisions/001-develop-integration-branch.md) — branche `develop` de test et PR de fonctionnalité vers `develop`.

## Évolutions datées

| Date | Évolution | Impact | Référence |
| --- | --- | --- | --- |
| 2026-09-02 | Création de la conception F00 et de la branche de travail | F00 passe en `IN_PROGRESS` ; aucun code encore livré | Conception F00 |
