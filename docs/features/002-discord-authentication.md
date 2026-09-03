# F01 — Discord OAuth2 et sessions

## Statut

`IN_PROGRESS`

## Branche

`feat/discord-auth`, créée depuis `develop` après fusion de F00 le 2026-09-03.

## Pull Request

À créer vers `develop` après vérifications finales.

## Dépendances

- F00 — socle monorepo, Docker et CI sécurisée — fusionnée dans la PR #3.

## Contexte et périmètre

Cette fiche suit l'implémentation de la connexion Discord OAuth2, du profil
minimal et des sessions applicatives sécurisées. Les tokens Discord ne sont
pas persistés dans le périmètre initial.

## Prévu

- Routes `/auth/discord`, `/auth/discord/callback`, `/auth/logout` et `/me`.
- Tables `users`, `sessions` et tentatives OAuth à usage unique.
- Protection CSRF/login CSRF, redirections allowlistées, rotation et révocation.
- Page de connexion responsive conforme aux maquettes.
- Matrice d'autorisation et documentation des contrôles.

## Réalisé

Rien avant le cycle TDD ; la conception est documentée dans
`docs/superpowers/specs/2026-09-03-discord-auth-design.md`.

## Limites et travaux reportés

- Pas de stockage de token Discord, bot ou notification.
- Pas de profil avancé, liaison de comptes ou mot de passe local.

## Preuve TDD

À compléter pendant les cycles Red, Green et Refactor.

## Sécurité

Les exigences applicables sont celles des sections OAuth2 Discord, sessions,
CSRF, validation, logs et RGPD de `docs/security/security-requirements.md`.
Les tests et résultats seront consignés avant la PR.
