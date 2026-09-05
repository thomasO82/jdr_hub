# F05 — Disponibilités et recherche de joueurs

## Identifiant
F05

## Statut
`MERGED`

## Branche
`feat/availability-and-player-search`

## Pull Request
Création automatique initialement refusée par l’intégration GitHub (`403`).
Fusion ensuite confirmée par le propriétaire dans `develop` ; le numéro de PR
n'a pas été vérifié dans cette session.

## Dates
- Début : 2026-09-05
- Fin : 2026-09-06 (fusion confirmée)

## Contexte et périmètre

F05 permet à un utilisateur de renseigner ses créneaux récurrents, son fuseau,
ses exceptions et ses préférences, puis à un utilisateur authentifié de
rechercher des joueurs par pseudo, système et compatibilité agrégée. Les
horaires précis restent privés : `/players` ne renvoie jamais les règles ou
exceptions d’un autre utilisateur.

## Réalisé

- contrats Zod partagés avec bornes et rejet des propriétés inconnues ;
- validation des fuseaux IANA et chevauchements sans mutation des entrées ;
- tables Drizzle `availability_rules`, `availability_exceptions`,
  `user_preferences` et `user_preferred_systems` ;
- migration additive `0004_availability-and-player-preferences.sql` ;
- repository Drizzle transactionnel, indépendant de Hono ;
- services séparés `get-availability`, `replace-availability` et
  `search-players` ;
- routes `GET /availability`, `PUT /availability` (origine stricte) et
  `GET /players` ;
- pages Tailwind `/disponibilites` et `/joueurs`, états chargement/vide/erreur,
  responsive et navigation AppShell ;
- projections joueurs limitées au profil public et à une compatibilité booléenne.

## Architecture et données

La validation d’environnement reste au démarrage API. Les handlers lisent la
requête, authentifient la session, valident le transport et appellent les
services ; les services ne dépendent pas de Hono. Le remplacement s’effectue
dans une transaction et met à jour le fuseau du profil utilisateur.

## Routes et parcours

- `GET /availability` lit uniquement le snapshot de l’utilisateur courant ;
- `PUT /availability` remplace le snapshot après authentification, contrôle
  d’origine et validation stricte ;
- `GET /players` exige une session, accepte des filtres bornés et renvoie des
  cartes sans disponibilité détaillée ;
- `/disponibilites` permet de modifier grille, fuseau et préférences ;
- `/joueurs` propose recherche, système, jour et pagination.

## Tests et preuve TDD

Tests écrits avant chaque implémentation puis exécutés en rouge : contrats et
politique, services, routes API, client web, pages et structure Tailwind.
Après implémentation, les suites ciblées puis la suite monorepo sont vertes.

- tests F05 ciblés : 24 assertions ;
- suite monorepo : 72 fichiers, 172 tests passés ;
- type-check et lint monorepo passés ;
- build API et Next.js passé (Turbopack relancé avec permissions de processus).

Les tests PostgreSQL dédiés restent à ajouter/exécuter avec une base de test
isolée ; les tests de schéma et le repository mémoire couvrent déjà les contrats
et invariants sans dépendre d’un `.env`.

## Sécurité

Session obligatoire pour les trois routes, origine exacte pour la mutation,
validation Zod stricte, pagination bornée, limite de 20 écritures par utilisateur
et par minute, projection sans créneaux détaillés et
aucun `userId` fourni par le navigateur. Les cookies et JWT restent gérés par
le module auth existant. Aucun secret réel n’a été ajouté.

## Limites et travaux reportés

- les exceptions ne sont pas encore soustraites du calcul de compatibilité (la
  compatibilité actuelle porte sur la semaine type) ;
- séances, votes, invitations et notifications restent hors F05 ;
- les tests PostgreSQL dédiés restent un travail de suivi séparé.

## Dépendances et documentation consultée

F01, F02, le socle Next.js/Hono/PostgreSQL/Drizzle/Tailwind,
`docs/specifications/cahier-des-charges.md`, `docs/security/security-requirements.md`,
`docs/security/ai-access-policy.md`, les maquettes desktop/mobile, la fiche de
conception et le plan F05.

## Synchronisation post-fusion — 2026-09-06

Le propriétaire a confirmé la fusion de cette fonctionnalité dans `develop`.
Le numéro de Pull Request n'a pas été vérifié dans cette session.
