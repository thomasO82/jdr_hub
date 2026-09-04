# F01 — Discord OAuth2 et sessions

## Statut

`IN_PROGRESS`

## Branche

`feat/discord-auth`, créée depuis `develop` après fusion de F00 le 2026-09-03.

## Dates

- Début : 2026-09-03
- Dernière mise à jour : 2026-09-04

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

- Contrats Zod partagés de l’utilisateur courant.
- OAuth2 Discord Authorization Code côté API avec `state` à usage unique,
  PKCE, scope `identify`, URI de callback stricte et redirection interne.
- Tables Drizzle `users`, `sessions` et `oauth_login_attempts`, avec migration
  générée ; les tokens Discord ne sont ni persistés ni envoyés au navigateur.
- Sessions opaques côté serveur : cookie `HttpOnly`, `SameSite=Lax`, `Secure`
  en production, expiration inactive et absolue, révocation au logout.
- Routes `GET /auth/discord`, `GET /auth/discord/callback`, `GET /me` et
  `POST /auth/logout`, incluant des réponses d’erreur avec `requestId`.
- Page serveur responsive `/connexion` : logo officiel local, fond sombre
  cohérent desktop/mobile, unique CTA `Continuer avec Discord` vers
  `/api/auth/discord`, aucun accès invité, aucune image ou script externe et
  métadonnée `noindex`.

La conception reste documentée dans
`docs/superpowers/specs/2026-09-03-discord-auth-design.md`.

## Limites et travaux reportés

- Pas de stockage de token Discord, bot ou notification.
- Pas de profil avancé, liaison de comptes ou mot de passe local.
- La maquette mobile validée a été préparée localement ; l’import de son
  brouillon Superdesign est différé, car son API était indisponible pendant
  cette session. Le code `/connexion` applique la direction validée.

## Preuve TDD

- **Red — interface de connexion :** ajout de
  `tests/smoke/connection-page.test.ts`, puis exécution de
  `pnpm exec vitest run tests/smoke/connection-page.test.ts`. Les deux tests
  ont échoué pour la raison attendue : la route `/connexion` n’existait pas.
- **Green :** création du Server Component et de son CSS module, avec le logo
  officiel local, une unique redirection OAuth et `noindex`.
- **Green vérifié :** le test ciblé est vert, puis le typecheck web est vert.
- **Refactor :** styles confinés au CSS module et page conservée sans état
  client ni appel navigateur ; aucune refactorisation comportementale n’était
  nécessaire après le vert.
- **Revue :** une revue indépendante a relevé un CTA potentiellement rogné sur
  viewport court. Un test rouge a reproduit `overflow: hidden`, puis le style
  a été corrigé pour ne masquer que le débordement horizontal. Deux autres
  tests rouges ont couvert l’alternative textuelle décorative du logo et la
  préférence de mouvement réduit.
- **Non-régression :** `pnpm test` : 21 fichiers de test, 60 tests verts.

## Sécurité

Les exigences applicables sont celles des sections OAuth2 Discord, sessions,
CSRF, validation, logs et RGPD de `docs/security/security-requirements.md`.

- Le CTA lance uniquement le flux OAuth côté API ; aucun secret, token,
  identifiant de session ou champ sensible n’est rendu dans le navigateur.
- La page ne référence que `/branding/logo.svg` et ne charge ni image, police,
  script ou icône externe. React conserve son échappement par défaut et aucun
  `dangerouslySetInnerHTML` n’est utilisé.
- La route d’authentification est `noindex`, afin de ne pas créer une page de
  connexion indexée inutilement.
- Le test smoke vérifie l’unique entrée OAuth, l’absence d’accès invité, de
  composant client et de ressource distante, ainsi que la cible tactile, le
  focus visible, le défilement vertical et le mouvement réduit. Les en-têtes
  et protections du flux OAuth restent couverts par les suites
  API/infrastructure existantes.

## Documentation et fichiers principaux

- Références consultées : cahier des charges, exigences de sécurité, plan
  d’implémentation, design system, audit visuel, maquettes D03/M03 et
  documentation officielle Next.js App Router/metadata.
- `apps/web/app/connexion/page.tsx`
- `apps/web/app/connexion/page.module.css`
- `tests/smoke/connection-page.test.ts`
- `docs/design-audit.md`

## Architecture, données et routes

- Le module Hono `auth` garde l’échange OAuth Discord, le `state`, PKCE et les
  sessions côté serveur. Le navigateur ne reçoit qu’un cookie de session opaque.
- Les tables `users`, `sessions` et `oauth_login_attempts` portent l’identité
  minimale, les empreintes de session et les tentatives à usage unique.
- Routes effectivement réalisées : `GET /auth/discord`,
  `GET /auth/discord/callback`, `GET /me` et `POST /auth/logout`.
- La page Next.js `/connexion` est un Server Component autonome : elle ne lit
  pas la base et se limite à orienter le visiteur vers la route API OAuth.

## Parcours et vérification manuelle

1. Ouvrir `/connexion` sur un viewport mobile et desktop.
2. Vérifier le logo officiel, le fond sombre et le bouton unique.
3. Vérifier le focus visible du bouton au clavier.
4. Suivre le bouton : il doit démarrer `/api/auth/discord`, sans token ni
   paramètre de redirection arbitraire dans la page.
5. Vérifier que la page ne propose pas d’accès invité.

## Commandes et résultats observés

- `pnpm exec vitest run tests/smoke/connection-page.test.ts` : 5 tests verts.
- `pnpm --filter @jdr-hub/web build` : build vert ; `/connexion` pré-rendue.
- `pnpm lint` : vert.
- `pnpm typecheck` : vert.
- `pnpm test` : 21 fichiers, 60 tests verts.
- `pnpm audit` : une vulnérabilité modérée transitive `esbuild` est signalée
  dans le chemin de développement de `drizzle-kit`. Aucune dépendance n’a été
  modifiée dans F01 ; une mise à jour exigerait une validation dédiée du
  propriétaire.

## Commits importants

- `b81c501` — écran de connexion responsive, test initial et documentation.
