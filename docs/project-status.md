# État global du projet JDR Hub

## Objectif

Ce document centralise l'état global des fonctionnalités de JDR Hub. Il permet de suivre les fonctionnalités prévues, en cours, bloquées, en revue et fusionnées, en complément des fiches détaillées de `docs/features/`.

Il ne remplace ni les spécifications, ni les décisions d'architecture, ni les Pull Requests. Il synthétise uniquement l'état connu et documenté du projet.

## Dernière mise à jour

2026-10-14

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
| DOC-001 | Mise en place du suivi documentaire | `MERGED` | `docs/feature-tracking` | [PR #1](https://github.com/thomasO82/jdr_hub/pull/1), fusionnée dans `main` | Documentation fusionnée | Contrôles documentaires consignés | [README du registre](features/README.md) |
| DOC-002 | Synchronisation des statuts après fusion | `MERGED` | `docs/sync-merged-feature-statuses` | [PR #30](https://github.com/thomasO82/jdr_hub/pull/30), fusionnée dans `develop` | Vérification documentaire consignée dans la fiche | Statuts rapprochés de GitHub ; aucune donnée sensible ajoutée | [Fiche DOC-002](features/021-sync-merged-feature-statuses.md) |
| DOC-003 | Synchronisation des fiches des outils de développement | `MERGED` | `docs/sync-development-tools-status` | [PR #31](https://github.com/thomasO82/jdr_hub/pull/31), fusionnée dans `develop` | Vérification documentaire consignée dans la fiche | États de fusion confirmés via GitHub ; aucune donnée sensible ajoutée | [Fiche DOC-003](features/022-sync-development-tools-status.md) |
| F00 | Socle monorepo, Docker et CI sécurisée | `MERGED` | `fix/f00-hardening` | [PR #3](https://github.com/thomasO82/jdr_hub/pull/3) | Vérifications finales vertes avant fusion | Audit hautes vulnérabilités vide, réseau DB interne, non-root, digests et healthchecks | [Fiche F00](features/001-monorepo-foundation.md) |
| F01 | Discord OAuth2 et sessions sécurisées | `MERGED` | `feat/discord-auth` | [PR #4](https://github.com/thomasO82/jdr_hub/pull/4) | 60 tests verts ; lint, typecheck et builds verts avant fusion | Contrôles OAuth/session réalisés ; audit pnpm : une vulnérabilité modérée transitive esbuild à traiter séparément | [Fiche F01](features/002-discord-authentication.md) |
| F12 | Durcissement JWT des sessions | `MERGED` | `fix/jwt-session-security` | [PR #5](https://github.com/thomasO82/jdr_hub/pull/5) et correctif [PR #6](https://github.com/thomasO82/jdr_hub/pull/6), fusionnées dans `develop` | Vérifications consignées dans la fiche | JWT d’accès, rotation, révocation serveur et CSRF | [Fiche F12](features/003-jwt-session-security.md) |
| F02 | Parties, tags et cycle de vie | `MERGED` | `feat/games-and-tags` | [PR #7](https://github.com/thomasO82/jdr_hub/pull/7) | 89 tests monorepo verts au moment de la fusion | Contrôles d’autorisation, validation stricte et invariants métier | [Fiche F02](features/004-games-and-tags.md) |
| FIX-UX-001 | Accès privé et découverte après création | `IN_REVIEW` | `fix/game-creation-auth-and-discovery` | [PR #33](https://github.com/thomasO82/jdr_hub/pull/33) | 142 fichiers/421 tests verts ; lint et builds API/web verts ; Playwright desktop/mobile vérifiés, parcours OAuth manuel restant | Vérification de session côté serveur, pages privées sauf présentation/connexion, contrôles API conservés | [Fiche FIX-UX-001](features/023-game-creation-access-and-discovery.md) |
| REF-001 | Migration frontend Tailwind-only | `MERGED` | `refactor/tailwind-only-frontend` | [PR #9](https://github.com/thomasO82/jdr_hub/pull/9), fusionnée dans `main` | 106 tests monorepo verts ; lint, typecheck et build verts | Aucun changement de contrat ; contrôle architectural CSS et focus accessibles | [Fiche REF-001](features/005-tailwind-only-frontend.md) |
| F03 | Catalogue public, détail et SEO | `MERGED` | `feat/public-games-and-seo` | [PR #12](https://github.com/thomasO82/jdr_hub/pull/12), fusionnée dans `develop` | 120 tests monorepo verts ; lint, typecheck et build verts | Projection sans données privées, UUID public, visibilité publique, validation stricte, filtres AND et slugs sitemap | [Fiche F03](features/006-public-games-and-seo.md) |
| F04 | Candidatures et roster | `MERGED` | `feat/applications` | Intégrée avec le correctif UUID dans [PR #18](https://github.com/thomasO82/jdr_hub/pull/18), fusionnée dans `develop` | 135 tests monorepo verts ; lint, typecheck, build et Docker web verts | Autorisation par ressource, anti-doublon, transaction de capacité, origine et validation stricte | [Fiche F04](features/007-applications.md) |
| FIX-001 | Identifiant UUID des routes de participation | `MERGED` | `fix/applications-id-only` | [PR #18](https://github.com/thomasO82/jdr_hub/pull/18), fusionnée dans `develop` | 98 fichiers, 250 tests verts ; lint, typecheck et builds API/web verts | Rejet des slugs avant requête UUID, projection publique sans données privées | [Fiche F04 — correctif UUID](features/007-applications.md) |
| DEV-001 | Données de développement | `MERGED` | `feat/development-seeds` → `chore/drizzle-studio` | [PR #13](https://github.com/thomasO82/jdr_hub/pull/13), fusionnée dans `develop` | Vérifications consignées dans la fiche | Données fictives uniquement, pas de suppression ni de secret | [Fiche DEV-001](features/008-development-seeds.md) |
| DEV-002 | Commandes de développement | `MERGED` | `chore/developer-commands` → `chore/drizzle-studio` | [PR #13](https://github.com/thomasO82/jdr_hub/pull/13), fusionnée dans `develop` | Vérifications consignées dans la fiche | Alias Docker Compose sans modification de sécurité | [Fiche DEV-002](features/009-developer-commands.md) |
| DEV-003 | Drizzle Studio local | `MERGED` | `chore/drizzle-studio` | [PR #13](https://github.com/thomasO82/jdr_hub/pull/13), fusionnée dans `develop` | 61 fichiers, 146 tests verts ; lint, typecheck, build et image Studio vérifiés | Port local uniquement, réseau PostgreSQL privé, conteneur non-root | [Fiche DEV-003](features/010-drizzle-studio.md) |
| F05 | Disponibilités et recherche de joueurs | `MERGED` | `feat/availability-and-player-search` | Fusion confirmée par le propriétaire dans `develop` | 72 fichiers, 173 tests monorepo verts ; lint, typecheck et builds verts | Session obligatoire, origine stricte, rate limit d’écriture, horaires privés, projection agrégée et validation bornée | [Fiche F05](features/011-availability-and-player-search.md) |
| F06 | Séances, créneaux, votes et planning | `MERGED` | `feat/sessions-scheduling` | [PR #15](https://github.com/thomasO82/jdr_hub/pull/15), fusionnée dans `develop` | 84 fichiers, 203 tests monorepo verts ; lint, typecheck et build web verts | Appartenance/MJ, origine stricte, votes uniques, transaction de sélection, dates bornées | [Fiche F06](features/012-sessions-scheduling.md) |
| FIX-UX-002 | Gestion des dates, tours de vote et révisions de séance | `IN_REVIEW` | `feat/session-scheduling-controls` | [PR #34](https://github.com/thomasO82/jdr_hub/pull/34) vers `develop` | 147 fichiers/444 tests suivis verts hors deux tests temporaires `.superpowers` ; 11 fichiers d’intégration PostgreSQL/24 tests précédemment verts ; lint et build verts ; votes déjà soumis et créneaux clôturés désactivés dans l’interface ; Playwright installé mais rendu non vérifié faute de `libnspr4.so` et de droits sudo | Historique MJ protégé, mutations session/origine/rate limit/Zod stricts, transitions transactionnelles, votes conservés et API toujours autoritaire pour les statuts | [Fiche FIX-UX-002](features/024-session-scheduling-controls.md) |
| F07 | Présences, absences et notifications Discord optionnelles | `MERGED` | `feat/attendance-notifications` | [PR #17](https://github.com/thomasO82/jdr_hub/pull/17), fusionnée dans `develop` | 108 fichiers, 306 tests verts ; lint, typecheck, builds et intégrations PostgreSQL/Redis (8 fichiers, 17 tests) verts | Notifications JDR Hub maintenues ; DM après adhésion consentie ; OAuth `guilds.join` distinct ; aucun contenu de chat transmis | [Fiche F07](features/013-attendance-notifications.md) |
| F07B | Messagerie textuelle par partie | `MERGED` | `feat/game-messaging` | [PR #28](https://github.com/thomasO82/jdr_hub/pull/28), fusionnée dans `develop` | 108 fichiers, 306 tests verts ; build Docker Compose, intégrations PostgreSQL/Redis et conteneurs sains ; vérification navigateur restant à confirmer | Autorisation propriétaire/membre actif, lecture seule après fermeture, texte borné/échappé, SSE revalidé, Redis interne | [Fiche F07B](features/015-game-messaging.md) |
| F08 | Dashboard et gestion MJ | `MERGED` | `feat/dashboard-and-gm-management` | [PR #21](https://github.com/thomasO82/jdr_hub/pull/21), fusionnée dans `develop` | 115 fichiers, 308 tests monorepo verts + 8 tests d’intégration PostgreSQL ; lint, typecheck et build verts | Session/origine/rate limit, autorisation par ressource, projection minimale, notifications destinataire-scopées, validation stricte, contrainte d’invitation et transactions | [Fiche F08](features/014-dashboard-and-gm-management.md) |
| F09 | XP, niveaux et historique de progression | `MERGED` | `feat/xp-and-levels` | Fusion confirmée par le propriétaire dans `develop` | 122 fichiers et 326 tests verts ; 11 tests d'intégration PostgreSQL ; lint, typecheck et builds verts | Session authentifiée, historique privé, limites Zod, idempotence DB, transaction présence/XP, absence de champs internes | [Fiche F09](features/015-xp-and-levels.md) |
| F10 | Responsive, accessibilité et états UI | `MERGED` | `feat/responsive-accessibility` | [PR #23](https://github.com/thomasO82/jdr_hub/pull/23), fusionnée dans `develop` | 125 fichiers et 333 tests verts ; lint, typecheck et build verts | Aucun changement API/auth ; erreurs traduites, focus clavier, cibles tactiles et réduction des animations | [Fiche F10](features/016-responsive-accessibility.md) |
| FIX-SEC-001 | Mise à jour des dépendances vulnérables | `MERGED` | `fix/security-dependency-updates` | [PR #24](https://github.com/thomasO82/jdr_hub/pull/24) | 124 fichiers, 330 tests unitaires/composants/API verts ; 11 tests PostgreSQL ; lint, typecheck, build et Compose verts | Plus aucune vulnérabilité critique/haute à l'audit pnpm ; la vulnérabilité modérée transitive a été traitée dans FIX-SEC-002 | [Fiche FIX-SEC-001](features/018-security-dependency-updates.md) |
| FIX-SEC-002 | Remédiation esbuild | `MERGED` | `fix/esbuild-moderate-remediation` | [PR #26](https://github.com/thomasO82/jdr_hub/pull/26) | Vérifications locales réussies avant fusion ; job CI `quality` en échec sur le commit fusionné, cause indisponible dans les logs | Override esbuild vers 0.25.12 ; remplacement du scan Scout suivi séparément dans FIX-SEC-003 | [Fiche FIX-SEC-002](features/019-esbuild-moderate-remediation.md) |
| FIX-SEC-003 | Scan gratuit des images Docker dans la CI | `MERGED` | `fix/free-image-scanning` | [PR #27](https://github.com/thomasO82/jdr_hub/pull/27), fusionnée dans `develop` | 125 fichiers/334 tests, 11 intégration PostgreSQL, lint, typecheck, build, audit, build Docker et scans locaux verts ; résultat CI GitHub à confirmer | Trivy épinglé par SHA, images web/API, seuil critique/élevé bloquant, base runtime corrigée, aucun abonnement Scout | [Fiche FIX-SEC-003](features/020-free-image-scanning.md) |

## Blocages

Aucun blocage actif de Pull Request n’est identifié. Les blocages documentés
avant le 2026-10-14 sont résolus pour les fonctionnalités dont les PR ont été
fusionnées ; les limites de vérification manuelle restantes restent décrites
dans leurs fiches.

## Synchronisation des fusions — 2026-10-14

Les statuts ont été rapprochés de GitHub après vérification des PR fusionnées :
F03 (#12), F04 et FIX-001 (#18), F06 (#15), F07 (#17), F07B (#28), F08 (#21),
F10 (#23), F12 (#5 et #6), DEV-003 (#13), FIX-SEC-003 (#27), REF-001 (#9 vers
`main`) et DOC-001 (#1 vers `main`). Les fiches concernées conservent leur
historique et documentent cette synchronisation.

## Mise à jour des fusions — 2026-10-14

La PR #13 comprend également les seeds DEV-001 et les commandes DEV-002. La
PR #30 est fusionnée ; sa fiche DOC-002 est à jour.

## Mise à jour après fusion — 2026-10-14

Le propriétaire a confirmé la fusion de DOC-003 dans la [PR #31](https://github.com/thomasO82/jdr_hub/pull/31). La fiche DOC-003 et le tableau global reflètent cet état.

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
