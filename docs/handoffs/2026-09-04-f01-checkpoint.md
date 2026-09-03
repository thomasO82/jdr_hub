# Point de reprise — F01 Discord OAuth2 et sessions

Date : 2026-09-04  
Branche : `feat/discord-auth`  
Statut : `IN_PROGRESS`

## Où en est F01

Le backend OAuth Discord et les sessions applicatives sont implémentés, testés
au niveau unitaire/API et démarrent dans Docker avec PostgreSQL. La page
frontend `/connexion` n'est **pas encore codée** : elle attend la validation
du brouillon visuel final ci-dessous.

Ne pas créer de Git worktree. Continuer dans ce répertoire et sur cette
branche.

## Brouillon visuel à valider

- Aperçu : <https://p.superdesign.dev/draft/1467f968-c602-4fb0-bb3e-dc8a0038d28e>
- Canvas : <https://superdesign.dev/teams/7d4c232a-149e-4854-94a5-097beff389ba/projects/2628c2b7-58d9-4ca1-b993-5c005d8fc791?live=1>
- Projet Superdesign : `2628c2b7-58d9-4ca1-b993-5c005d8fc791`
- Brouillon actif : `1467f968-c602-4fb0-bb3e-dc8a0038d28e`, version 3.

Le brouillon v3 a été généré avec les captures réelles suivantes comme
références de composition :

- `docs/maquettes/desktop/connexion_discord_plein_cran_jdr_hub/screen.png`
- `docs/maquettes/mobile/connexion_discord_mobile/screen.png`

Les adaptations volontaires et obligatoires sont :

- emploi de `docs/branding/logo.svg` uniquement ;
- aucune illustration ou icône externe issue de Stitch ;
- pas de mode invité, qui n'est pas dans F01 ;
- texte français ;
- unique CTA vers `/api/auth/discord`.

Le brouillon Superdesign contient encore des balises Iconify de démonstration.
L'implémentation Next.js doit employer `lucide-react`, déjà installé, sans
charger de script, d’icône ou d’image externe.

## Backend réalisé

- Contrats Zod partagés pour l’utilisateur courant.
- Tables Drizzle `users`, `sessions` et `oauth_login_attempts`, avec migration
  générée ; ne jamais ouvrir ni modifier une migration existante.
- OAuth2 Discord Authorization Code avec `state` haché à usage unique, PKCE,
  scope `identify`, callback strict et redirection interne.
- Échange Discord côté serveur uniquement ; aucun token Discord persistant ou
  envoyé au navigateur.
- Cookie de session opaque, `HttpOnly`, `SameSite=Lax`, `Secure` en production,
  révocation au logout, durée inactive glissante et durée absolue plafonnée.
- Routes API : `GET /auth/discord`, `GET /auth/discord/callback`, `GET /me`,
  `POST /auth/logout`.
- Logout protégé par vérification stricte de l’en-tête `Origin`.
- Réponses d’erreur et `/me` avec `requestId` dans `meta`.
- Démarrage API : migrations appliquées avant l’ouverture du serveur.
- Compose : API connectée au réseau PostgreSQL interne et dépendante de son
  healthcheck ; paramètres Discord uniquement dans l’environnement API.

## Jalons Git récents

- `09a2310` — contrats d’authentification
- `6d1477a` — politiques OAuth et sessions
- `aa88d49` — adaptateur Discord
- `cbafd3c` — routes API
- `7be61a1` — persistance PostgreSQL
- `0af2958` — migrations au démarrage et Compose
- `11b0806` — renouvellement de l’expiration inactive
- `a0e0dfc` — `requestId` dans les réponses d’authentification

## Vérifications déjà exécutées

- Tests API ciblés : 28 tests verts après le dernier correctif.
- Tests base de données et Compose ciblés : 6 tests verts.
- `pnpm --filter @jdr-hub/api build` vert.
- `pnpm --filter @jdr-hub/api lint` vert.
- Image API Docker construite avec migrations présentes, sans lire leur contenu.
- Stack Docker démarrée avec des valeurs Discord factices : PostgreSQL, API,
  web et proxy sains ; `GET /api/health` via Caddy a répondu `200`.
- La stack de vérification a été arrêtée sans suppression du volume PostgreSQL.

## Reprise demain

1. Obtenir ou vérifier l’approbation explicite du brouillon v3.
2. Utiliser `superpowers:test-driven-development` avant le code frontend.
3. Écrire un test rouge pour `/connexion`, puis intégrer Tailwind CSS 4,
   `lucide-react` et le logo officiel en reproduisant le comportement
   desktop/mobile du brouillon v3.
4. Ne pas charger les ressources externes visibles dans les HTML Stitch.
5. Lancer ensuite lint, typecheck, tests, builds, audit et vérification Docker
   complète.
6. Mettre à jour `docs/features/002-discord-authentication.md` et
   `docs/project-status.md` avec des résultats réellement observés avant la PR.
7. Exécuter `superpowers:verification-before-completion`, contrôle sécurité,
   diff, absence de secrets, push de branche et PR vers `develop`. Ne pas
   fusionner la PR.

## Contraintes à garder en tête

- Lire `docs/security/ai-access-policy.md` avant toute nouvelle exploration.
- Ne jamais lire les fichiers `.env` réels ; seulement `.env.example` si utile.
- Ne demander une validation qu'en cas de nouvelle dépendance, action
  destructive, migration risquée, secret manquant ou autre cas explicitement
  protégé par `AGENTS.md`.
- Ne pas utiliser de worktree.
