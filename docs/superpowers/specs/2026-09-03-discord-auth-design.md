# F01 — Discord OAuth2 et sessions sécurisées

## Contexte et objectif

F00 est fusionnée dans `develop` (PR #3). F01 ajoute la première capacité
métier : permettre à un visiteur de se connecter avec Discord sans mot de
passe local, puis d'utiliser une session JDR Hub indépendante du token Discord.

## Périmètre validé

- `GET /auth/discord` démarre le flux OAuth2 avec une URI de callback fixe,
  les scopes minimaux `identify`, un `state` aléatoire à usage unique et une
  destination post-login limitée à une allowlist interne.
- `GET /auth/discord/callback` vérifie le `state`, échange le code côté serveur,
  récupère uniquement l'identité Discord minimale, puis crée ou met à jour le
  compte local de façon idempotente.
- Une session locale est créée avec un identifiant aléatoire ; seule son
  empreinte est persistée côté serveur. Le cookie est `HttpOnly`, `SameSite=Lax`,
  limité à `/`, et `Secure` en production.
- La session est régénérée après authentification, possède une expiration idle
  et absolue, et ne peut pas être utilisée après logout ou révocation globale.
- `POST /auth/logout` révoque la session courante avec une vérification
  d'origine ; `GET /me` retourne le profil courant sans token Discord.
- La page de connexion est un Server Component responsive reprenant le logo
  officiel et les intentions visuelles des maquettes desktop/mobile. Le bouton
  principal est « Se connecter avec Discord » ; aucune promesse de VTT n'est
  affichée.
- `docs/security/authorization-matrix.md` décrit les permissions visiteur et
  utilisateur connecté pour les routes disponibles.

## Hors périmètre

- Stockage ou rafraîchissement persistant des tokens Discord.
- Liaison de plusieurs comptes Discord, mot de passe local, MFA, bot Discord,
  notifications ou profil complet.
- Fournisseur OAuth autre que Discord.

## Architecture et flux

Le module `auth` reste dans le monolithe Hono. Un adaptateur Discord reçoit les
variables d'environnement validées (`DISCORD_CLIENT_ID`,
`DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`) et expose des fonctions
testables pour construire l'URL, échanger le code et lire l'identité. Un
service de session indépendant génère les secrets, calcule leur empreinte,
applique les expirations et fournit les opérations de rotation/révocation.

Le navigateur ne reçoit jamais de code OAuth, de client secret ni de token
Discord. Le callback pose le cookie de session puis redirige vers une
destination interne validée. Les erreurs externes deviennent une réponse
sobre en enveloppe API sans détail sensible.

## Modèle de données

- `users`: UUID public, `discord_id` unique, pseudo d'affichage, avatar
  optionnel, fuseau horaire par défaut, dates de création/mise à jour.
- `sessions`: UUID, `user_id`, empreinte SHA-256 du token, expiration idle,
  expiration absolue, révocation et dates d'audit ; index sur empreinte,
  utilisateur et expiration.
- `oauth_login_attempts`: identifiant, empreinte du `state`, destination
  interne, expiration et consommation ; aucune valeur OAuth brute n'est
  persistée.

Les opérations de création/mise à jour utilisateur, consommation de tentative
et création de session sont transactionnelles lorsque le stockage est
disponible. Les contraintes `UNIQUE` empêchent les doublons Discord et les
`state` rejoués.

## Contrats et erreurs

- `GET /auth/discord`: `302` vers Discord ou `429` après dépassement de limite.
- Callback accepté : `302` vers la destination interne avec cookie de session.
- Callback invalide/expiré/rejoué, code refusé ou identité incomplète : `400`
  avec message générique et `requestId`.
- `GET /me` sans session : `401` ; session révoquée/expirée : `401`.
- `POST /auth/logout` sans session : réponse idempotente `204` ; origine
  absente ou non autorisée : `403`.

## Sécurité et observabilité

Les tests couvrent login CSRF, `state` invalide/expiré/rejoué, URI refusée,
échange Discord en erreur, fixation de session, rotation, expiration, logout,
révocation de toutes les sessions, absence d'ID de session dans les URL/logs,
et limites de débit. Les logs structurés indiquent succès/échec et
`requestId`, sans code, token, cookie, secret ni donnée Discord superflue.

## UI et accessibilité

La page `/connexion` utilise le logo de `apps/web/public/branding/logo.svg`,
un bouton Discord avec nom accessible, états focus/chargement/erreur, contraste
adapté et mise en page mobile/desktop. Les textes sont en français et les
liens de confidentialité restent des placeholders explicitement hors F01.

## Critères de réussite

Les tests de sécurité et métier sont écrits avant le code et observés en échec,
puis passent avec la non-régression complète. `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm build`, `pnpm audit --audit-level=high` et le contrôle des
secrets doivent rester verts.
