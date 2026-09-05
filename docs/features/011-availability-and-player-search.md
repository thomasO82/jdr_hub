# F05 — Disponibilités et recherche de joueurs

## Identifiant

F05

## Statut

`IN_PROGRESS`

## Branche

`feat/availability-and-player-search`

## Lien ou numéro de Pull Request

Non créée.

## Dates

- Début : 2026-09-05
- Fin : Non terminée

## Dépendances

### Prévues

- F01 — authentification et sessions ;
- F02 — parties, systèmes et tags ;
- socle Next.js, Hono, PostgreSQL et Drizzle.

### Réalisées ou constatées

- Les sessions et repositories auth existants sont disponibles.
- Les contrats et routes des parties existants sont disponibles.

### Restantes

- Aucune dépendance bloquante identifiée.

## Contexte et besoin

### Prévu

Permettre à un utilisateur de déclarer ses créneaux récurrents et ses
exceptions, puis permettre à un MJ authentifié de rechercher des joueurs par
nom, système préféré et compatibilité agrégée.

### Réalisé

La conception détaillée est proposée dans
`docs/superpowers/specs/2026-09-05-availability-and-player-search-design.md`.

### Restant à faire

L’implémentation API, la migration, les pages web et les tests restent à
réaliser.

## Périmètre prévu

- règles hebdomadaires jour/minute ;
- exceptions d’indisponibilité datées ;
- préférences de visibilité et de notification ;
- recherche de joueurs avec projection sans horaires précis ;
- pages `/disponibilites` et `/joueurs` responsive selon les maquettes.

## Fonctionnalités effectivement réalisées

- Aucune fonctionnalité métier livrée à ce stade ; seule la conception est
  documentée.

## Parcours utilisateur

### Prévu

L’utilisateur ouvre ses disponibilités, modifie la grille et les préférences,
enregistre, puis un MJ ouvre la recherche de joueurs et applique ses filtres.

### Réalisé

Non implémenté.

### Restant à faire

Le parcours complet et ses états d’erreur doivent être construits et vérifiés.

## Règles métier

### Prévues

- minutes hebdomadaires interprétées dans le fuseau IANA du profil ;
- plages bornées, positives et sans chevauchement ;
- exceptions ponctuelles qui ignorent la semaine type ;
- horaires précis privés par défaut ;
- compatibilité renvoyée uniquement sous forme agrégée et selon la visibilité.

### Implémentées

- Aucune.

### Non couvertes ou reportées

- conversion vers les séances et votes, réservée à F06.

## Architecture et choix techniques

### Prévu

Module Hono `availability` séparé en routes, handlers, services et repository,
contrats Zod dans `packages/shared`, repository Drizzle côté API uniquement et
composants Tailwind réutilisant `AppShell`.

### Réalisé

- Spécification d’architecture écrite et relue ; implémentation en attente de
  validation du propriétaire.

### Restant à faire

- créer le module API, les contrats, la migration et les composants web ;
- intégrer la protection CSRF et le rate limiting prévus.

## Modèle de données et migrations

### Prévu

Créer `availability_rules`, `availability_exceptions`, `user_preferences` et
`user_preferred_systems` avec index utilisateur et contraintes de clés
étrangères. La migration sera additive et non destructive.

### Réalisé

Aucune migration.

### Restant à faire

Implémenter les tables, contraintes, transaction de remplacement et tests
d’intégration PostgreSQL.

## Routes API

### Prévues

- `GET /availability` ;
- `PUT /availability` ;
- `GET /players`.

### Implémentées

Aucune.

### Restantes

Toutes les routes prévues.

## Interface et composants

### Prévus

- grille desktop et navigation par jour mobile pour les disponibilités ;
- exceptions, préférences, états loading/empty/error ;
- recherche de joueurs, filtres, cartes et pagination ;
- navigation `AppShell` avec les liens `/disponibilites` et `/joueurs`.

### Réalisés

Aucun.

### Restants

Tous les écrans et composants prévus.

## Tests

### Prévus

- unitaires : intervalles, fuseaux, DST, chevauchements et compatibilité ;
- API : authentification, CSRF, validation, projection et erreurs ;
- intégration : remplacement transactionnel et contraintes ;
- composants : grille, toggles, filtres, états et responsive.

### Réalisés

Aucun test F05 ; les tests existants restent inchangés.

### Restants

Écrire les tests en premier selon la spécification de conception.

## Preuve TDD Red, Green, Refactor

### Red

Pas encore commencé ; les tests seront écrits avant toute implémentation.

### Green

Non commencé.

### Refactor

Non commencé.

## Sécurité

### Contrôles prévus

- session obligatoire pour les endpoints privés ;
- origine stricte/CSRF sur `PUT /availability` ;
- aucun `userId` client pour la ressource courante ;
- réponses agrégées sans horaires ou exceptions d’autrui ;
- validation Zod, pagination bornée et rate limiting ;
- logs sans données de disponibilité précises.

### Vérifications réalisées

Aucune.

## Documentation consultée

- `docs/specifications/cahier-des-charges.md` ;
- `docs/implementation-plan.md` ;
- `docs/security/security-requirements.md` ;
- maquettes desktop/mobile de recherche de joueurs et disponibilités ;
- `docs/superpowers/specs/2026-09-05-availability-and-player-search-design.md`.

## Limites connues et travaux reportés

- La conception doit encore être approuvée avant le plan d’implémentation.
- Les séances, votes et notifications restent hors F05.
- La Pull Request n’est pas créée.
