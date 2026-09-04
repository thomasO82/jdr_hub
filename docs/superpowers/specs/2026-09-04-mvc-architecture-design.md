# Architecture MVC du monorepo

## Objectif

Réorganiser le monorepo JDR Hub afin de séparer clairement le transport HTTP,
la logique applicative, les accès aux données, les vues Next.js et les tests,
sans modifier les parcours ou les garanties de sécurité existants.

## Principes

L’API Hono adopte MVC par module. Les routes déclarent uniquement les chemins
et injectent les dépendances. Les handlers sont les contrôleurs HTTP : ils
lisent la requête, appellent un service et construisent une réponse Hono. Les
services appliquent les règles applicatives sans dépendre de Hono. Les
repositories représentent la frontière de persistance et restent les seuls
consommateurs de Drizzle dans l’API.

Next.js conserve App Router. Les fichiers `app/**/page.tsx` restent les
points d’entrée de routes ; les composants de rendu sont déplacés dans des
features et constituent la couche View. Aucun contrôleur MVC artificiel ne
sera ajouté au frontend. Les futurs accès à l’API passeront par des services
frontend, jamais par des composants de vue.

## Structure cible

```text
apps/api/src/
  app.ts
  modules/auth/
    routes.ts
    handlers.ts
    cookies.ts
    config.ts
    policy.ts
    repository.ts
    discord-client.ts
    services/
      auth-service.ts
      access-token.ts
      session-service.ts
      oauth.ts

apps/api/tests/
  api/auth/
  integration/auth/
  unit/auth/
  helpers/

apps/web/
  app/
  features/home/
  features/authentication/
  tests/

packages/shared/tests/
packages/database/tests/
tests/
  architecture/
  infrastructure/
  smoke/
```

`tests/` à la racine conserve uniquement les contrôles transverses. Les
tests propres à une application ou à un package sont placés dans son dossier
`tests/`, hors du code de production.

## Module auth

`handlers.ts` sera la couche contrôleur et conservera le contrat HTTP actuel :
les chemins, statuts, cookies, réponses génériques et redirections ne
changent pas. `cookies.ts` centralisera les noms, portées et attributs des
cookies. `services/auth-service.ts` coordonnera le login Discord, le callback,
l’authentification par JWT, le renouvellement et la déconnexion.

Les services spécialisés conservent leurs limites : `access-token.ts` signe et
vérifie seulement les JWT ; `session-service.ts` crée, empreinte et valide les
credentials de renouvellement ; `oauth.ts` produit et vérifie les tentatives
OAuth. `repository.ts` reste indépendant de Hono. Le dépôt mémoire, réservé
aux tests, devient un helper de test et ne sera plus exporté par le code de
production.

La validation de `process.env` reste unique au démarrage de l’API. Aucun
service, handler ou repository ne lit l’environnement directement.

## Invariants de sécurité

- Les JWT, refresh tokens et secrets restent exclusivement côté serveur et
  hors des logs, réponses et code frontend.
- `GET /me` exige un JWT valide, une session serveur active et la concordance
  entre le sujet JWT et la session.
- `POST /auth/refresh` et `POST /auth/logout` conservent la vérification
  stricte de l’origine, les cookies `HttpOnly`, `SameSite=Lax` et `Secure` en
  production.
- La rotation du refresh token reste transactionnelle ; un rejeu continue à
  invalider les sessions actives concernées.
- Les paramètres Discord OAuth, PKCE, le callback fixe et les redirections
  internes restent inchangés.

## Tests et migration technique

Les tests existants sont déplacés sans affaiblir leurs assertions. Des helpers
communs fourniront la configuration factice, l’horloge déterministe, le dépôt
mémoire et une application Hono de test. Les tests API testeront les handlers
via les routes publiques ; les tests unitaires testeront les services et les
utilitaires ; les tests d’intégration couvriront les repositories.

Les imports, scripts de test et configurations TypeScript seront ajustés pour
que les tests déplacés restent découverts par Vitest et exclus des builds de
production. Aucun changement de schéma, migration, dépendance ou API publique
n’est prévu.
