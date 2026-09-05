# F06 — Séances, créneaux, votes et planning

## Identifiant
F06

## Statut
`IN_PROGRESS`

## Branche
`feat/sessions-scheduling`

## Pull Request
Non créée automatiquement : `gh` n'est pas installé dans l'environnement.
Ouverture manuelle : https://github.com/thomasO82/jdr_hub/pull/new/feat/sessions-scheduling

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

- contrats partagés stricts pour fenêtres UTC, propositions, votes, séances et
  périodes de planning ;
- migration additive `0005_scheduling.sql` et tables Drizzle
  `time_proposals`, `time_votes`, `game_sessions` ;
- repository séparé des handlers, avec transaction de sélection, unicité des
  votes et lecture des séances du propriétaire ou des membres actifs ;
- services distincts pour propositions, lecture, vote, séance fixe, sélection
  idempotente et planning ;
- routes `POST/GET /games/:id/proposals`, `POST /proposals/:id/votes`,
  `POST /games/:id/sessions` et `GET /planning` ;
- page `/planning` avec calendrier mensuel desktop, agenda mobile, prochaines
  séances, légende et états loading/error/empty ;
- écran `/parties/[id]/vote` avec matrice desktop, cartes mobiles, compteurs,
  progression et choix accessibles au clavier.

## Dépendances

F02, F04 et F05 doivent être disponibles dans `develop`.

## Documentation consultée

`AGENTS.md`, `docs/security/ai-access-policy.md`,
`docs/security/security-requirements.md`,
`docs/specifications/cahier-des-charges.md`,
`docs/implementation-plan.md`, les maquettes planning/vote desktop et mobile,
`docs/superpowers/specs/2026-09-06-sessions-scheduling-design.md`.

## Preuve TDD

Les tests de contrats et de politique ont d'abord échoué car les modules
n'existaient pas (Red), puis sont passés après l'implémentation minimale
(Green). Les services, routes et composants ont suivi le même cycle ; une
régression one-shot (sélection d'une quatrième séance) a ensuite été ajoutée
et vérifiée. Aucun test existant n'a été modifié ou affaibli.

## Tests et vérifications

- tests F06 ciblés : 26 tests ;
- suite monorepo : 84 fichiers, 202 tests passés ;
- lint et typecheck des quatre packages passés ;
- build Next.js passé avec Turbopack après autorisation de création de
  processus ;
- test repository d'idempotence et de double vote ajouté sous
  `apps/api/tests/integration/scheduling` ; il utilise le helper mémoire
  existant car aucun harness PostgreSQL d'intégration n'est encore fourni.

## Sécurité

Les mutations exigent une session, l'origine applicative et un contrôle de
propriétaire ou de membre actif. Les entrées sont validées par Zod avec dates,
durées, listes et périodes bornées. Les votes sont uniques par proposition et
utilisateur ; la sélection est transactionnelle et idempotente. Les services
ne lisent pas `process.env`, les repositories ne dépendent pas de Hono et aucun
secret ou horaire privé d'un autre utilisateur n'est exposé.

## Limites et travaux reportés

- les tests d'intégration PostgreSQL et la migration seront exécutés avec une
  base de test isolée ;
- les notifications Discord, présences et absences ne font pas partie de F06 ;
- le planning ne propose pour l'instant que la vue mensuelle desktop et
  l'agenda mobile ; les vues semaine/jour de la maquette restent décoratives ;
- l'ouverture de la PR interviendra après les vérifications et reste sous
  réserve des permissions GitHub.

## Blocage de livraison

La branche est poussée et vérifiée, mais la PR doit être ouverte manuellement
avec le lien ci-dessus. Le statut reste `IN_PROGRESS` jusqu'à l'ouverture
effective de la PR.
