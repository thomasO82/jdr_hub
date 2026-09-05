# F04 — Candidatures et roster

## Statut

`IN_PROGRESS`

## Branche

`feat/applications`

## Pull Request

Non créée.

## Dépendances

- F01 — authentification et sessions (`MERGED`).
- F02 — parties et cycle de vie (`MERGED`).
- REF-001 — frontend Tailwind-only (`MERGED`).

## Contexte et besoin

Le MVP doit permettre à un joueur de déposer une candidature, de suivre son
statut et au MJ d'accepter ou refuser cette candidature. La décision acceptée
doit réserver une place sans course concurrente.

## Périmètre prévu

API, persistance, services applicatifs, contrôles d'autorisation, écran de
candidature sur le détail et page `/candidatures`.

## Spécification

Voir `docs/superpowers/specs/2026-09-05-applications-design.md`.

## État initial

La spécification est approuvée ; l'implémentation et les tests TDD restent à
réaliser.
