# Décision 001 — Branche `develop` d’intégration

## Date

2026-09-02

## Statut

Acceptée

## Contexte

Le projet doit disposer d’une branche de test partagée avant la promotion de versions stables vers `main`. Le flux initial du plan décrivait des branches de fonctionnalité directement basées sur `main`, ce qui ne correspond plus au fonctionnement retenu.

## Décision

- `main` reste la branche stable et protégée.
- `develop` est créée depuis `main` et constitue la branche partagée de test et d’intégration.
- Toute nouvelle branche de fonctionnalité est créée depuis `develop` à jour.
- Les Pull Requests de fonctionnalité ciblent `develop`.
- La promotion de `develop` vers `main` se fait séparément, après validation humaine et contrôles de release.
- Aucune fusion, approbation personnelle, poussée directe sur `main` ou suppression de branche distante n’est automatisée par Codex.

## Conséquences

Le plan d’implémentation et les fiches de fonctionnalités doivent indiquer `develop` comme base d’intégration. GitHub reste la source de vérité pour l’état des Pull Requests et le propriétaire conserve la responsabilité des fusions.

## Références

- [`docs/implementation-plan.md`](../implementation-plan.md)
- [`AGENTS.md`](../../AGENTS.md)
