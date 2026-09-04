# F12 — Durcissement JWT des sessions

## Statut

`IN_PROGRESS`

## Branche

`fix/jwt-session-security`

## Pull Request

Non créée : la branche a été poussée, mais l'intégration GitHub de cette
session a reçu `403 Resource not accessible by integration` lors de la
création vers `develop`.

## Dates

- Début : 2026-09-04
- Dernière mise à jour : 2026-09-04

## Dépendances

- F01 — Discord OAuth2 et sessions sécurisées — fusionnée dans la PR #4.

## Contexte et périmètre prévu

Le propriétaire a demandé l’usage de JWT pour l’authentification et le
durcissement direct de ce flux. La conception retenue est documentée dans
`docs/superpowers/specs/2026-09-04-jwt-session-security-design.md` et ADR 002.

Le périmètre couvre les JWT d’accès en cookie `HttpOnly`, le rafraîchissement
opaque révocable, la rotation, les validations cryptographiques et les tests
de sécurité correspondants. Il exclut les rôles, les permissions métier,
l’authentification par mot de passe et le stockage de token Discord.

## Réalisé

- Documentation de conception et ADR 002 créées.
- `JWT_SIGNING_SECRET` strictement validée : base64url canonique, au moins
  32 octets, obligatoire ; une clé précédente distincte peut servir pendant
  une fenêtre de rotation contrôlée.
- JWT d'accès HS256 de quinze minutes, limité aux claims `sub`, `sid`, `iss`,
  `aud`, `iat`, `nbf`, `exp`, `jti` et `token_use`. Les claims sont vérifiés
  cryptographiquement puis revalidés avec Zod.
- Refresh credential opaque de 256 bits, stocké uniquement sous forme de
  digest SHA-256, lié à un `sessions.id` UUID non secret.
- `GET /me` vérifie le JWT puis la session serveur active et l'égalité
  `sub`/`userId`; un JWT signé seul ne suffit jamais.
- `POST /auth/refresh` vérifie l'origine, révoque puis recrée
  transactionnellement une session de refresh sans dépasser son expiration
  absolue ; un refresh rejeu est refusé.
- `POST /auth/logout` révoque uniquement la session active nommée. Si son
  refresh a déjà été tourné par une requête concurrente, il révoque toutes les
  sessions actives de l'utilisateur afin de contenir la session de remplacement.
  Il supprime dans tous les cas les cookies d'accès, refresh et legacy.
- Compose transmet les clés JWT seulement à `api-hono`; elles ne sont pas
  exposées au frontend.
- Le script de démarrage local de l'API charge le `.env` racine avec le
  mécanisme natif de Node.js ; Docker Compose continue à injecter ses variables
  sans embarquer ce fichier dans l'image.

## Parcours utilisateur

Après le callback Discord, le navigateur reçoit un cookie d'accès
`jdr_hub_access` limité à `/api` et un refresh `jdr_hub_refresh` limité à
`/api/auth`, tous deux `HttpOnly`, `SameSite=Lax` et `Secure` en production.
Une requête protégée contrôle d'abord l'accès signé, puis la session serveur.
Le refresh remplace atomiquement les deux cookies ; le logout invalide le JWT
restant par révocation serveur.

## Architecture, données et routes

- Aucun schéma ni migration n'a été ajouté : `sessions.id` est le `sid` et
  `token_digest` reste le seul stockage du secret de refresh.
- `services/access-token.ts` isole l'émission et la validation JWT de la gestion
  des cookies et de la persistance.
- Le repository ajoute la recherche par ID, la rotation transactionnelle et
  la révocation de toutes les sessions d'un utilisateur.
- Routes concernées : `GET /me`, `POST /auth/refresh`, `POST /auth/logout`,
  ainsi que le callback OAuth Discord.

## Tests et preuve TDD

- **Red :** `config-jwt.test.ts` a échoué car une clé JWT absente était
  acceptée ; `access-token.test.ts` a échoué car le module manquait ;
  `session-jwt.test.ts` a échoué faute de `sid`; `repository-jwt.test.ts` et
  `routes-jwt.test.ts` ont échoué faute de rotation et de cookies JWT ; le
  test Compose a échoué avant l'ajout de la variable serveur.
- **Green :** les implémentations minimales ont ensuite fait réussir chaque
  test ciblé.
- **Refactor :** la validation JWT, le cycle de vie des sessions et les
  cookies sont séparés par responsabilité. Une refactorisation plus globale,
  centrée sur la lisibilité humaine du module, est volontairement reportée à
  la demande du propriétaire.
- Tests ajoutés : `config-jwt.test.ts`, `access-token.test.ts`,
  `session-jwt.test.ts`, `repository-jwt.test.ts`, `routes-jwt.test.ts` et
  `jwt-compose-config.test.ts`, ainsi que le test du chargement local du
  `.env`.
- Vérifications finales observées : `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (77/77) et `pnpm build` réussissent.

## Sécurité

- Le secret JWT est requis côté serveur, non journalisé et absent du code,
  des réponses et du frontend. Aucun paquet n'a été ajouté.
- L'algorithme est épinglé à HS256 ; issuer, audience, temps, but du token
  et forme des claims sont imposés.
- Les cookies restent protégés contre la lecture JavaScript et les endpoints
  de refresh/logout exigent l'origine exacte.
- La révocation côté serveur protège contre un JWT copié après logout ou
  rotation de refresh.
- `pnpm audit` signale toujours une vulnérabilité **modérée** transitive
  `esbuild` via `drizzle-kit`, déjà présente avant F12 ; aucune vulnérabilité
  critique ou élevée n'a été rapportée.

## Documentation technique consultée

- Documentation officielle Hono — helper JWT.
- RFC 8725 — recommandations de sécurité JWT.
- `docs/security/security-requirements.md`.

## Fichiers principaux

- `apps/api/src/modules/auth/access-token.ts`
- `apps/api/src/modules/auth/session-service.ts`
- `apps/api/src/modules/auth/repository.ts`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/auth/config.ts`
- `docker-compose.yml` et `.env.example`

## Évolution architecturale — 2026-09-05

La refactorisation MVC demandée a été réalisée sans modifier les contrats :

- les routes Hono déclarent uniquement les endpoints ;
- les handlers portent le transport HTTP ;
- chaque parcours d'authentification est coordonné par un service dédié dans
  `apps/api/src/modules/auth/services/` ;
- cookies, JWT, sessions et OAuth sont isolés dans leurs modules spécialisés ;
- le repository de production est PostgreSQL et le repository mémoire vit dans
  `apps/api/tests/helpers/` ;
- les tests sont séparés de `src/` par niveau sous `apps/api/tests`, avec les
  tests frontend et packages dans leurs répertoires dédiés.

Les vues Next.js ont également été déplacées dans `apps/web/features/`; les
fichiers `app/**/page.tsx` restent des points d'entrée de route et de métadonnées.

## Vérification manuelle proposée

1. Définir une clé base64url de 32 octets dans l'environnement de l'API.
2. Se connecter via Discord puis vérifier que le navigateur reçoit les deux
   cookies aux chemins attendus, sans JWT dans le stockage navigateur.
3. Appeler `/api/me`, rafraîchir via `/api/auth/refresh`, puis vérifier que
   l'ancien cookie d'accès est refusé.
4. Se déconnecter et vérifier que l'ancien JWT d'accès est refusé.

## Limites connues

- Les règles d’autorisation par ressource seront ajoutées dans les modules
  métier concernés ; elles ne seront jamais inférées d’un JWT.
- La rotation transactionnelle PostgreSQL est couverte par les tests du
  repository en mémoire ; un harnais d'intégration PostgreSQL concurrent dédié
  reste à créer ultérieurement.
