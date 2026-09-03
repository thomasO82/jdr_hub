# État global du projet JDR Hub

## Objectif

Ce document centralise l'état global des fonctionnalités de JDR Hub. Il permet de suivre les fonctionnalités prévues, en cours, bloquées, en revue et fusionnées, en complément des fiches détaillées de `docs/features/`.

Il ne remplace ni les spécifications, ni les décisions d'architecture, ni les Pull Requests. Il synthétise uniquement l'état connu et documenté du projet.

## Dernière mise à jour

2026-09-03

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
| F00 | Socle monorepo, Docker et CI sécurisée | `IN_PROGRESS` | `develop` — reprise directe demandée par le propriétaire | Sans PR à ce stade | 18 tests verts ; Docker Compose couvert | Réseau DB interne, non-root et healthchecks vérifiés | [Fiche F00](features/001-monorepo-foundation.md) |

## Blocages

Aucun blocage déclaré.

Tout blocage doit être décrit ici avec son impact, sa date d'apparition, sa dépendance éventuelle et la condition nécessaire à sa résolution. Une fonctionnalité ne doit être marquée `BLOCKED` que si le blocage est explicite et actuel.

## Prochaines fonctionnalités

Les prochaines fonctionnalités seront ajoutées au tableau avec une fiche détaillée dans `docs/features/` avant le début de leur implémentation. Elles recevront initialement le statut `PLANNED`.

## Source de vérité des Pull Requests

GitHub reste la source de vérité pour l'état réel des Pull Requests. Le statut indiqué ici doit être synchronisé avec GitHub avant toute ouverture de Pull Request et après toute confirmation de revue ou de fusion. Codex ne doit pas indiquer `MERGED` sans confirmation du propriétaire.
