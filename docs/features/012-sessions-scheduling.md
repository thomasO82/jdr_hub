# F06 — Séances, créneaux, votes et planning

## Identifiant
F06

## Statut
`IN_PROGRESS`

## Branche
`feat/sessions-scheduling`

## Pull Request
Non créée.

## Dates

- Début : 2026-09-06
- Fin : Non terminée

## Contexte et périmètre prévu

F06 sépare une partie de ses séances, permet au MJ de proposer des créneaux,
aux membres de voter et à tous les participants de consulter leur planning.
Les heures sont stockées en UTC et affichées dans le fuseau du profil.

Le périmètre prévu couvre les séances fixes, les propositions, les votes, la
sélection explicite du MJ, la lecture du planning et les interfaces desktop et
mobile des maquettes. Les absences et notifications restent F07.

## Réalisé

La conception et le plan d'implémentation sont écrits. Aucun code métier F06
n'est encore déclaré réalisé.

## Dépendances

F02, F04 et F05 doivent être disponibles dans `develop`.

## Documentation consultée

`AGENTS.md`, `docs/security/ai-access-policy.md`,
`docs/security/security-requirements.md`,
`docs/specifications/cahier-des-charges.md`,
`docs/implementation-plan.md`, les maquettes planning/vote desktop et mobile,
`docs/superpowers/specs/2026-09-06-sessions-scheduling-design.md`.

## Limites et travaux reportés

- les tests d'intégration PostgreSQL et la migration seront exécutés avec une
  base de test isolée ;
- les notifications Discord, présences et absences ne font pas partie de F06 ;
- l'ouverture de la PR interviendra après les vérifications et reste sous
  réserve des permissions GitHub.

