# État global du projet JDR Hub

## Objectif

Ce document centralise l'état global des fonctionnalités de JDR Hub. Il permet de suivre les fonctionnalités prévues, en cours, bloquées, en revue et fusionnées, en complément des fiches détaillées de `docs/features/`.

Il ne remplace ni les spécifications, ni les décisions d'architecture, ni les Pull Requests. Il synthétise uniquement l'état connu et documenté du projet.

## Dernière mise à jour

2026-10-13

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
| F00 | Socle monorepo, Docker et CI sécurisée | `MERGED` | `fix/f00-hardening` | [PR #3](https://github.com/thomasO82/jdr_hub/pull/3) | Vérifications finales vertes avant fusion | Audit hautes vulnérabilités vide, réseau DB interne, non-root, digests et healthchecks | [Fiche F00](features/001-monorepo-foundation.md) |
| F01 | Discord OAuth2 et sessions sécurisées | `MERGED` | `feat/discord-auth` | [PR #4](https://github.com/thomasO82/jdr_hub/pull/4) | 60 tests verts ; lint, typecheck et builds verts avant fusion | Contrôles OAuth/session réalisés ; audit pnpm : une vulnérabilité modérée transitive esbuild à traiter séparément | [Fiche F01](features/002-discord-authentication.md) |
| F12 | Durcissement JWT des sessions | `IN_PROGRESS` | `fix/jwt-session-security` | Création bloquée : intégration GitHub sans permission | 77/77 tests verts ; lint, typecheck et builds verts | JWT d’accès, rotation, révocation serveur et CSRF | [Fiche F12](features/003-jwt-session-security.md) |
| F02 | Parties, tags et cycle de vie | `MERGED` | `feat/games-and-tags` | [PR #7](https://github.com/thomasO82/jdr_hub/pull/7) | 89 tests monorepo verts au moment de la fusion | Contrôles d’autorisation, validation stricte et invariants métier | [Fiche F02](features/004-games-and-tags.md) |
| REF-001 | Migration frontend Tailwind-only | `IN_PROGRESS` | `refactor/tailwind-only-frontend` | Non créée | 106 tests monorepo verts ; lint, typecheck et build verts | Aucun changement de contrat ; contrôle architectural CSS et focus accessibles | [Fiche REF-001](features/005-tailwind-only-frontend.md) |
| F03 | Catalogue public, détail et SEO | `IN_PROGRESS` | `feat/public-games-and-seo` | Non créée | 120 tests monorepo verts ; lint, typecheck et build verts | Projection sans données privées, UUID public, visibilité publique, validation stricte, filtres AND et slugs sitemap | [Fiche F03](features/006-public-games-and-seo.md) |
| F04 | Candidatures et roster | `IN_PROGRESS` | `feat/applications` | Création bloquée : intégration GitHub sans permission | 135 tests monorepo verts ; lint, typecheck, build et Docker web verts | Autorisation par ressource, anti-doublon, transaction de capacité, origine et validation stricte | [Fiche F04](features/007-applications.md) |
| FIX-001 | Identifiant UUID des routes de participation | `IN_PROGRESS` | `fix/applications-id-only` | Non créée | 98 fichiers, 250 tests verts ; lint, typecheck et builds API/web verts | Rejet des slugs avant requête UUID, projection publique sans données privées | [Fiche F04 — correctif UUID](features/007-applications.md) |
| DEV-001 | Données de développement | `IN_PROGRESS` | `feat/development-seeds` | Non créée | 59 fichiers, 141 tests verts ; lint, typecheck et build verts | Données fictives uniquement, pas de suppression ni de secret | [Fiche DEV-001](features/008-development-seeds.md) |
| DEV-002 | Commandes de développement | `IN_PROGRESS` | `chore/developer-commands` | Non créée | 60 fichiers, 142 tests verts ; lint et typecheck verts | Alias Docker Compose sans modification de sécurité | [Fiche DEV-002](features/009-developer-commands.md) |
| DEV-003 | Drizzle Studio local | `IN_PROGRESS` | `chore/drizzle-studio` | Non créée | 61 fichiers, 146 tests verts ; lint, typecheck, build et image Studio vérifiés | Port local uniquement, réseau PostgreSQL privé, conteneur non-root | [Fiche DEV-003](features/010-drizzle-studio.md) |
| F05 | Disponibilités et recherche de joueurs | `MERGED` | `feat/availability-and-player-search` | Fusion confirmée par le propriétaire dans `develop` | 72 fichiers, 173 tests monorepo verts ; lint, typecheck et builds verts | Session obligatoire, origine stricte, rate limit d’écriture, horaires privés, projection agrégée et validation bornée | [Fiche F05](features/011-availability-and-player-search.md) |
| F06 | Séances, créneaux, votes et planning | `IN_PROGRESS` | `feat/sessions-scheduling` | Non créée | 84 fichiers, 203 tests monorepo verts ; lint, typecheck et build web verts | Appartenance/MJ, origine stricte, votes uniques, transaction de sélection, dates bornées | [Fiche F06](features/012-sessions-scheduling.md) |
| F07 | Présences, absences et notifications Discord optionnelles | `IN_PROGRESS` | `feat/game-messaging` | Non créée | 108 fichiers, 306 tests verts ; lint, typecheck, builds et intégrations PostgreSQL/Redis (8 fichiers, 17 tests) verts | Notifications JDR Hub maintenues ; DM après adhésion consentie ; OAuth `guilds.join` distinct ; aucun contenu de chat transmis | [Fiche F07](features/013-attendance-notifications.md) |
| F07B | Messagerie textuelle par partie | `IN_PROGRESS` | `feat/game-messaging` | Non créée | 108 fichiers, 306 tests verts ; build Docker Compose, intégrations PostgreSQL/Redis et conteneurs sains ; vérification navigateur restante | Autorisation propriétaire/membre actif, lecture seule après fermeture, texte borné/échappé, SSE revalidé, Redis interne | [Fiche F07B](features/015-game-messaging.md) |
| F08 | Dashboard et gestion MJ | `IN_PROGRESS` | `feat/dashboard-and-gm-management` | Non créée | 115 fichiers, 308 tests monorepo verts + 8 tests d'intégration PostgreSQL ; lint, typecheck et build verts | Session/origine/rate limit, autorisation par ressource, projection minimale, notifications destinataire-scopées, validation stricte, contrainte d'invitation et transactions | [Fiche F08](features/014-dashboard-and-gm-management.md) |
| F09 | XP, niveaux et historique de progression | `MERGED` | `feat/xp-and-levels` | Fusion confirmée par le propriétaire dans `develop` | 122 fichiers et 326 tests verts ; 11 tests d'intégration PostgreSQL ; lint, typecheck et builds verts | Session authentifiée, historique privé, limites Zod, idempotence DB, transaction présence/XP, absence de champs internes | [Fiche F09](features/015-xp-and-levels.md) |
| F10 | Responsive, accessibilité et états UI | `IN_PROGRESS` | `feat/responsive-accessibility` | Non créée | 125 fichiers et 333 tests verts ; lint, typecheck et build verts | Aucun changement API/auth ; erreurs traduites, focus clavier, cibles tactiles et réduction des animations | [Fiche F10](features/016-responsive-accessibility.md) |
| FIX-SEC-001 | Mise à jour des dépendances vulnérables | `MERGED` | `fix/security-dependency-updates` | [PR #24](https://github.com/thomasO82/jdr_hub/pull/24) | 124 fichiers, 330 tests unitaires/composants/API verts ; 11 tests PostgreSQL ; lint, typecheck, build et Compose verts | Plus aucune vulnérabilité critique/haute à l'audit pnpm ; la vulnérabilité modérée transitive a été traitée dans FIX-SEC-002 | [Fiche FIX-SEC-001](features/018-security-dependency-updates.md) |
| FIX-SEC-002 | Remédiation esbuild | `MERGED` | `fix/esbuild-moderate-remediation` | [PR #26](https://github.com/thomasO82/jdr_hub/pull/26) | Vérifications locales réussies avant fusion ; job CI `quality` en échec sur le commit fusionné, cause indisponible dans les logs | Override esbuild vers 0.25.12 ; remplacement du scan Scout suivi séparément dans FIX-SEC-003 | [Fiche FIX-SEC-002](features/019-esbuild-moderate-remediation.md) |
| FIX-SEC-003 | Scan gratuit des images Docker dans la CI | `IN_PROGRESS` | `fix/free-image-scanning` | Création automatique refusée (`403`) ; [ouvrir manuellement vers `develop`](https://github.com/thomasO82/jdr_hub/compare/develop...fix/free-image-scanning?expand=1) | 125 fichiers/334 tests, 11 intégration PostgreSQL, lint, typecheck, build, audit, build Docker et scans locaux des deux images verts ; CI GitHub à confirmer | Trivy épinglé par SHA, images web/API, seuil critique/élevé bloquant, base runtime corrigée, aucun abonnement Scout | [Fiche FIX-SEC-003](features/020-free-image-scanning.md) |

## Blocages

- 2026-10-13 — F07/F07B : la décision 006 est acceptée et l'implémentation
  est en cours sur `feat/game-messaging` ; aucune PR n'est ouverte. L'interface
  de consentement/onboarding et le réglage du profil sont implémentés. Restent
  la vérification navigateur (outil absent) et la revue TDD de la livraison
  Discord déjà codée avant ses tests unitaires.

- 2026-09-04 — F12 : la branche `fix/jwt-session-security` est poussée,
  mais l'intégration GitHub a refusé la création de PR vers `develop`
  (`403 Resource not accessible by integration`). La fonctionnalité reste
  `IN_PROGRESS` jusqu'à ce qu'une identité ayant la permission de création
  ouvre la PR.
- 2026-09-05 — F04 : la branche `feat/applications` est poussée et vérifiée,
  mais l'intégration GitHub a refusé la création de PR vers `develop`
  (`403 Resource not accessible by integration`). La fonctionnalité reste
  `IN_PROGRESS` jusqu'à ce qu'une identité ayant la permission de création
  ouvre la PR.
- 2026-09-05 — F05 : la branche `feat/availability-and-player-search` est
  poussée et vérifiée, mais l'intégration GitHub a refusé la création de PR
  vers `develop` (`403 Resource not accessible by integration`). La
  fonctionnalité reste `IN_PROGRESS` jusqu'à l'ouverture manuelle de la PR.
- 2026-09-06 — F06 : la branche `feat/sessions-scheduling` est poussée et
  vérifiée ; l'ouverture automatique est indisponible car `gh` n'est pas
  installé. La PR doit être ouverte manuellement et F06 reste `IN_PROGRESS`.
- 2026-09-06 — F07B : la branche `feat/game-messaging` est poussée et
  vérifiée, mais l'intégration GitHub refuse l'ouverture automatique
  (`403 Resource not accessible by integration`). La PR doit être ouverte
  manuellement et F07B reste `IN_PROGRESS` :
  https://github.com/thomasO82/jdr_hub/pull/new/feat/game-messaging
- 2026-09-06 — F08 : la branche `feat/dashboard-and-gm-management` est
  poussée et vérifiée, mais l'intégration GitHub a refusé la création de PR
  (`403 Resource not accessible by integration`) et `gh` n'est pas installé.
  La PR doit être ouverte manuellement et F08 reste `IN_PROGRESS`.
- 2026-10-13 — FIX-SEC-003 : le job `quality` de la PR #26 a échoué après
  fusion. Les étapes et journaux du run ne sont pas accessibles via
  l'intégration ; le scan payant Docker Scout est remplacé par Trivy, sans
  désactiver l'analyse bloquante des images.
- 2026-10-13 — FIX-SEC-003 : le scan local a identifié l'ancienne base Node
  (Alpine 3.22.1) et npm intégré dans les images runtime. Après mise à jour de
  la base, des paquets Alpine et retrait de npm/npx du runtime, Trivy v0.75.0
  ne signale plus de vulnérabilité HIGH/CRITICAL dans les deux images.
- 2026-10-13 — FIX-SEC-003 : la branche a été poussée, mais le connecteur
  GitHub a refusé l'ouverture de la PR (`403 Resource not accessible by
  integration`). L'ouverture manuelle reste nécessaire.

## Mise à jour après fusion — 2026-10-12

Le propriétaire a confirmé la fusion de FIX-SEC-001 dans la
[PR #24](https://github.com/thomasO82/jdr_hub/pull/24). FIX-SEC-002 a ensuite
été fusionnée dans la [PR #26](https://github.com/thomasO82/jdr_hub/pull/26).
Le job CI de cette PR ayant échoué, le remplacement de Docker Scout par un
scanner sans abonnement est suivi séparément dans FIX-SEC-003.

## Mise à jour architecture — 2026-09-05

La refactorisation MVC de l'authentification est réalisée sur la branche F12 :
routes, handlers, services par cas d'usage, cookies, JWT/sessions, OAuth et
repository sont séparés ; les tests ont été déplacés hors de `src/`. Aucun
contrat HTTP, schéma, dépendance ou comportement de sécurité n'a été modifié.

## Prochaines fonctionnalités

Les prochaines fonctionnalités seront ajoutées au tableau avec une fiche détaillée dans `docs/features/` avant le début de leur implémentation. Elles recevront initialement le statut `PLANNED`.

## Source de vérité des Pull Requests

GitHub reste la source de vérité pour l'état réel des Pull Requests. Le statut indiqué ici doit être synchronisé avec GitHub avant toute ouverture de Pull Request et après toute confirmation de revue ou de fusion. Codex ne doit pas indiquer `MERGED` sans confirmation du propriétaire.
