# FIX-UX-001 — Accès privé et découverte après création

## Statut

`IN_REVIEW`

## Branche

`fix/game-creation-auth-and-discovery`

## Pull Request

[PR #33](https://github.com/thomasO82/jdr_hub/pull/33), ouverte vers `develop`.

## Évolution du périmètre — 2026-10-14

À la demande du propriétaire, la décision 007 remplace l'accès visiteur au
catalogue F03 : `/` devient la présentation publique, `/connexion` reste
accessible pour ouvrir une session, et toute autre page exige une session
vérifiée côté serveur par Next.js auprès de Hono. Un utilisateur connecté qui
arrive sur `/` est envoyé vers `/dashboard`. Les endpoints API `public/*`
restent inchangés ; cette évolution porte sur les pages web.

La landing reprend la composition sombre D01 à toutes les tailles, utilise le
logo officiel, décrit des fonctions implémentées et ne présente aucune partie
publique. Le sitemap ne publie que `/`.

## Contexte et besoin

Trois défauts ont été signalés pendant les essais : les écrans de compte
s'affichaient sans session, un tag inexistant produisait un message demandant
de se connecter, et une partie créée n'apparaissait pas dans le catalogue.

Le cahier des charges F03 maintient le catalogue et les fiches publiques
accessibles aux visiteurs. Les écrans de compte restent privés et l'API
conserve ses contrôles de session.

## Comportement du correctif initial avant la décision 007

- Une vérification de `/api/me` masque les écrans de compte et redirige les
  visiteurs non authentifiés vers `/connexion`.
- `/parties`, ses fiches publiques, les collections MJ/tags/jeux et
  `/connexion` restent accessibles sans session.
- Les créations de parties commencent en statut `OPEN`, compatible avec les
  règles F02/F03 du catalogue public.
- L'API exige une session et l'origine applicative exacte à la création ; la
  lecture par identifiant interne est réservée au MJ propriétaire.
- Après création, une partie publique ouvre sa fiche ; une partie privée ouvre
  l'espace de gestion du propriétaire.
- Un tag inexistant retourne un code `INVALID_GAME_TAG` traduit en français.
  Seule une réponse 401 affiche une consigne de connexion.

## Preuve TDD

### Red

Les nouveaux tests échouaient d'abord : routes de vérification absentes,
statut retourné `DRAFT` au lieu de `OPEN`, tag invalide retourné en 409,
création acceptée depuis une origine non autorisée et lecture interne possible
sans authentification. Un 503 du service de session était aussi interprété à
tort comme une absence de connexion.

### Green

Les tests ciblés passent après ajout du contrôle d'accès web, de l'état initial
`OPEN`, du code d'erreur métier, des destinations post-création et des
contrôles de session, de propriétaire et d'origine de l'API.

### Refactor

Les règles de destination, d'accès aux pages et de traduction d'erreur sont
isolées pour être testées sans dépendance externe.

### Vérifications

- `pnpm exec vitest run apps/web/tests/private-page-access.test.ts apps/web/tests/game-creation-feedback.test.ts apps/web/tests/api-errors.test.ts apps/api/tests/api/games/creation-behavior.test.ts` — 13 tests verts.
- `pnpm exec vitest run tests apps/api/tests apps/web/tests packages/shared/tests packages/database/tests` — 405 tests verts.
- `pnpm lint` et `pnpm build` — réussis.
- `pnpm test` local détecte aussi 2 tests ignorés par Git sous
  `.superpowers/sdd/` qui pointent vers un ancien répertoire `red-baseline`;
  ils ne sont pas inclus dans le diff. Les 405 tests applicatifs et transverses
  passent avec la commande listée ci-dessus.
- Le navigateur intégré et Playwright ne sont pas disponibles dans cette
  session ; le contrôle visuel manuel reste à faire.

## Sécurité

- Le contrôle web améliore le parcours, tandis que les permissions restent
  appliquées par l'API ; aucune donnée privée n'est rendue par le garde. La
  lecture par identifiant interne vérifie aussi le propriétaire.
- La création vérifie l'origine applicative exacte pour limiter le CSRF.
- Les pages publiques et projections existantes restent inchangées.
- Les réponses d'erreur brutes ne sont pas affichées ; le frontend traduit le
  code stable et conserve un message français générique pour les autres erreurs.
- Les tests API utilisent un utilisateur fictif et un secret explicitement
  réservé aux tests.

## Limites et vérification manuelle

- Une coupure réseau pendant la vérification de session affiche un état de
  reprise, plutôt qu'un écran de compte.
- Vérifier dans le navigateur : visiteur vers `/dashboard`, accès anonyme à
  `/parties`, création publique avec détail ouvert, création privée vers la
  gestion et tag non reconnu.

## Sécurité après décision 007

- Le proxy Next.js protège les pages avant leur rendu et demande à Hono de
  valider la session ; une session expirée ou révoquée ne suffit pas.
- Une panne du service de session renvoie une réponse 503 `no-store` et ne
  détruit pas les cookies.
- Le cookie d'accès reste `HttpOnly`, `SameSite=Lax`, `Secure` en production et
  conserve son expiration. Son chemin `/` permet la vérification serveur ; le
  cookie de renouvellement reste limité à `/api/auth`.
- L'ancien cookie d'accès `Path=/api` est expiré au login, au refresh et au
  logout. Le proxy ne transmet jamais le cookie de renouvellement.
- Hono conserve tous ses contrôles API d'authentification, d'origine et
  d'autorisation par ressource ; les endpoints `public/*` restent hors du
  périmètre de la décision.

## Vérification manuelle après décision 007

- Sans session, `/` affiche la présentation et `/connexion` affiche le parcours
  Discord ; les pages `/parties`, `/mj`, `/tags`, `/jeux` et `/dashboard`
  redirigent vers `/connexion`.
- Avec une session valide, les pages applicatives s'ouvrent et `/` mène au
  dashboard.
- Si `/me` renvoie 503 ou est inaccessible, le contenu privé ne s'affiche pas
  et l'écran indique une indisponibilité temporaire sans effacer la session.
- La landing a été contrôlée par Playwright sur desktop et mobile le
  2026-10-14 ; le flux réel de connexion OAuth Discord reste à faire par le
  propriétaire.

## Vérifications finales — 2026-10-14

- Red/Green : les tests du cookie, du garde serveur, de la landing et du sitemap
  ont d'abord échoué sur les comportements manquants, puis passent après
  implémentation. Le test de disponibilité de `/` a aussi été ajouté en rouge
  lorsque Hono répond 503, puis passe après le maintien de la page publique.
- `pnpm exec vitest run tests apps/api/tests apps/web/tests packages/shared/tests packages/database/tests`
  — 142 fichiers et 421 tests verts.
- `pnpm lint` — réussi (build préalable des packages partagés, génération des
  types Next.js et vérification TypeScript de l'API, du web et des packages).
- `pnpm build` — réussi pour Hono et Next.js ; le build liste le proxy Next.js.
- `git diff --check` — réussi.
- Couverture non mesurée pour cette passe.
- QA rendu : Playwright 1.64.0 avec Chromium 156.0.8078.4, utilisé en fallback
  car le plugin Browser n'est pas disponible. Landing en 200, titre et H1
  attendus, logo chargé, CTA Discord vers `/connexion`, et `/dashboard` sans
  session redirigé vers `/connexion`.
- Viewports contrôlés : desktop 1440×1000 et mobile 390×844. Aucun débordement
  horizontal sur mobile et aucune erreur console relevée. Captures conservées
  temporairement dans `/tmp/jdrhub-landing-desktop.png` et
  `/tmp/jdrhub-landing-mobile.png`.
- Playwright et Chromium sont dans le cache utilisateur, sans dépendance ajoutée
  au dépôt. Les bibliothèques absentes du système ont été extraites sous `/tmp`
  pour ce test uniquement.
- Le parcours OAuth réel Discord, les autres navigateurs et l'accessibilité au
  clavier n'ont pas été contrôlés dans cette passe.
- Aucun secret réel ni donnée personnelle n'a été introduit. Le proxy ne
  transmet que le cookie d'accès à `/me`, refuse les pages privées en cas de
  panne, et laisse `/` public même quand la vérification de session échoue.
