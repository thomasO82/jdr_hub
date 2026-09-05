# État global du projet JDR Hub

## Objectif

Ce document centralise l'état global des fonctionnalités de JDR Hub. Il permet de suivre les fonctionnalités prévues, en cours, bloquées, en revue et fusionnées, en complément des fiches détaillées de `docs/features/`.

Il ne remplace ni les spécifications, ni les décisions d'architecture, ni les Pull Requests. Il synthétise uniquement l'état connu et documenté du projet.

## Dernière mise à jour

2026-09-05

## Signification des statuts

Seuls les statuts suivants sont autorisés :

- `PLANNED` : fonctionnalité prévue, dont l'implémentation n'a pas commencé ;
- `IN_PROGRESS` : fonctionnalité en cours d'implémentation ou de documentation ;
- `BLOCKED` : fonctionnalité interrompue par un blocage identifié ;
- `IN_REVIEW` : Pull Request ouverte et en attente de revue ou de validation humaine ;
- `MERGED` : Pull Request fusionnée, uniquement après confirmation du propriétaire.

## Tableau global des fonctionnalités

| Identifiant | Fonctionnalité | Statut | Branche | Pull Request | Tests | Sécurité | Fiche détaillée |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DOC-001 | Mise en place du suivi documentaire | `IN_PROGRESS` | `docs/feature-tracking` | Non créée | Documentation uniquement — à consigner dans la fiche | Contrôles documentaires à renseigner | [README du registre](features/README.md) |
| F00 | Socle monorepo, Docker et CI sécurisée | `MERGED` | `fix/f00-hardening` | [PR #3](https://github.com/thomasO82/jdr_hub/pull/3) | Vérifications finales vertes avant fusion | Audit hautes vulnérabilités vide, réseau DB interne, non-root, digests et healthchecks | [Fiche F00](features/001-monorepo-foundation.md) |
| F01 | Discord OAuth2 et sessions sécurisées | `MERGED` | `feat/discord-auth` | [PR #4](https://github.com/thomasO82/jdr_hub/pull/4) | 60 tests verts ; lint, typecheck et builds verts avant fusion | Contrôles OAuth/session réalisés ; audit pnpm : une vulnérabilité modérée transitive esbuild à traiter séparément | [Fiche F01](features/002-discord-authentication.md) |
| F12 | Durcissement JWT des sessions | `IN_PROGRESS` | `fix/jwt-session-security` | Création bloquée : intégration GitHub sans permission | 77/77 tests verts ; lint, typecheck et builds verts | JWT d’accès, rotation, révocation serveur et CSRF | [Fiche F12](features/003-jwt-session-security.md) |
| F02 | Parties, tags et cycle de vie | `IN_PROGRESS` | `feat/games-and-tags` | Non créée | 97 tests monorepo verts ; implémentation en cours | Contrôles d’autorisation, validation stricte et invariants métier | [Fiche F02](features/004-games-and-tags.md) |

## Blocages

- 2026-09-04 — F12 : la branche `fix/jwt-session-security` est poussée,
  mais l'intégration GitHub a refusé la création de PR vers `develop`
  (`403 Resource not accessible by integration`). La fonctionnalité reste
  `IN_PROGRESS` jusqu'à ce qu'une identité ayant la permission de création
  ouvre la PR.

## Mise à jour architecture — 2026-09-05

La refactorisation MVC de l'authentification est réalisée sur la branche F12 :
routes, handlers, services par cas d'usage, cookies, JWT/sessions, OAuth et
repository sont séparés ; les tests ont été déplacés hors de `src/`. Aucun
contrat HTTP, schéma, dépendance ou comportement de sécurité n'a été modifié.

## Prochaines fonctionnalités

Les prochaines fonctionnalités seront ajoutées au tableau avec une fiche détaillée dans `docs/features/` avant le début de leur implémentation. Elles recevront initialement le statut `PLANNED`.

## Source de vérité des Pull Requests

GitHub reste la source de vérité pour l'état réel des Pull Requests. Le statut indiqué ici doit être synchronisé avec GitHub avant toute ouverture de Pull Request et après toute confirmation de revue ou de fusion. Codex ne doit pas indiquer `MERGED` sans confirmation du propriétaire.
