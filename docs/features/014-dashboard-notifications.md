# Tableau de bord et notifications visibles

## Identifiant

F08

## Statut

MERGED

## Branche

`feat/dashboard-notifications`

## Lien ou numéro de Pull Request

[PR #19](https://github.com/thomasO82/jdr_hub/pull/19), fusionnée le 2026-09-08

## Dates de début et de fin

- Début : 2026-09-08
- Fin : 2026-09-08

## Dépendances

### Prévues

- F01 pour l'authentification et les sessions ;
- F06 pour les séances et le planning ;
- F07 pour les notifications et leur marquage comme lues ;
- le shell applicatif et le design system existants.

### Réalisées ou constatées

- Les repositories F06 et F07 fournissent les projections nécessaires ;
- l'API réutilise le contrôle d'accès par session existant ;
- l'interface reprend `AppShell`, les tokens Tailwind et les composants de notification existants.

### Restantes

- Aucune dépendance bloquante identifiée.

## Contexte

### Prévu

Le tableau de bord doit réunir les prochaines actions utiles à un utilisateur connecté. Une notification non lue doit être immédiatement visible sans nécessiter l'ouverture de la cloche du header.

### Réalisé

Une projection privée `/dashboard` regroupe la prochaine séance, les parties actives et un résumé des notifications non lues. Le bloc de notification est rendu uniquement lorsqu'il existe au moins une notification non lue : dans la colonne droite sur desktop et immédiatement sous la prochaine séance sur mobile.

### Restant à faire

La gestion détaillée des parties côté MJ et la progression XP restent dans leurs fonctionnalités respectives.

## Besoin utilisateur

### Prévu

Être averti clairement lorsqu'une action liée à une partie doit être traitée, tout en conservant l'accès à l'historique complet dans la cloche du header.

### Réalisé

Les notifications non lues sont visibles dans un bloc « À traiter », limité aux trois plus récentes, avec accès à la séance et action de marquage comme lue. Aucun bloc vide n'est affiché lorsqu'il n'y a aucune notification non lue.

### Restant à faire

Aucun changement de l'historique complet des notifications n'est inclus dans cette fonctionnalité.

## Périmètre prévu

- ajouter une projection de dashboard privée et session-scoped ;
- rendre la présence de notifications non lues saillante ;
- respecter la hiérarchie desktop/mobile validée ;
- couvrir les erreurs indépendantes des blocs et les accès non authentifiés.

## Fonctionnalités effectivement réalisées

- contrats partagés stricts pour les blocs du dashboard ;
- repository PostgreSQL du dashboard avec filtrage par propriétaire/membre ;
- service de lecture des notifications non lues avec comptage serveur et limite de trois éléments ;
- route authentifiée `GET /dashboard` ;
- redirection de `/` vers `/dashboard` et navigation Dashboard cohérente ;
- carte conditionnelle de notifications dans le dashboard ;
- marquage comme lue depuis le résumé et lien vers la séance ;
- états loading, erreur et absence de données en français ;
- tests unitaires, API, structure UI et intégration PostgreSQL.

## Parcours utilisateur

### Prévu

Un utilisateur connecté arrive sur le tableau de bord, voit sa prochaine séance et, uniquement s'il a une notification non lue, voit un bloc d'action bien placé. Il peut ouvrir la séance ou marquer la notification comme lue.

### Réalisé

Après authentification, `/` redirige vers `/dashboard`. Le dashboard charge sa projection privée. Le résumé « À traiter » apparaît dans la colonne droite desktop ou sous la prochaine séance mobile, puis disparaît lorsque toutes ses notifications sont marquées comme lues.

### Restant à faire

- vérification E2E avec un navigateur réel ;
- validation visuelle manuelle sur les tailles d'écran de référence.

## Règles métier

### Prévues

- une notification est privée et liée à son destinataire ;
- les informations affichées doivent être une projection sûre, sans identifiants fournisseur ;
- le dashboard doit fonctionner partiellement si un bloc indépendant échoue ;
- un résumé de notifications ne doit pas créer de bruit lorsqu'il est vide.

### Implémentées

- la route utilise l'utilisateur de la session et n'accepte aucun `userId` fourni par le client ;
- les notifications sont filtrées sur le destinataire et `readAt IS NULL` ;
- le serveur limite le résumé à trois notifications et calcule le nombre total non lu ;
- un compteur nul produit un bloc `EMPTY`, rendu sans section UI ;
- les erreurs d'un bloc sont isolées dans un bloc `ERROR` générique ;
- les notifications sont ordonnées par date de création puis identifiant décroissants.

### Non couvertes ou reportées

- pagination ou recherche de l'historique complet ;
- notifications temps réel ;
- progression XP du dashboard.

## Architecture et choix techniques

### Prévu

Séparer contrats partagés, projection API, service de lecture, route HTTP, client frontend et composants de présentation. Garder la cloche existante dans le shell et ajouter un résumé contextuel au dashboard.

### Réalisé

`dashboard/repository.ts` construit les projections PostgreSQL, `get-dashboard.ts` orchestre les blocs avec `Promise.allSettled`, et `handlers.ts` reste responsable du transport HTTP. Le frontend consomme `/dashboard` via `lib/dashboard-api.ts`; `DashboardView` compose les cartes et `NotificationSummary` gère l'état local de lecture.

Le placement desktop utilise une grille avec colonne droite dédiée. Le DOM conserve l'ordre mobile souhaité : prochaine séance, notifications, parties actives.

### Restant à faire

Le client frontend utilise actuellement les types partagés à la compilation et le contrat d'enveloppe API ; l'ajout d'une validation Zod runtime côté web nécessiterait une dépendance frontend explicitement validée.

## Modèle de données et migrations

### Prévu

Réutiliser les tables F06/F07 sans migration métier inutile ; ajouter uniquement les projections et index nécessaires si l'inspection l'exige.

### Réalisé

Aucune migration n'a été ajoutée. Les requêtes réutilisent `games`, `gameMembers`, `gameSessions` et `notifications` avec les index existants.

### Restant à faire

Aucune évolution de schéma identifiée pour ce périmètre.

## Routes API

### Prévues

- `GET /dashboard` ;
- réutilisation de `POST /notifications/:id/read` pour l'action de lecture.

### Implémentées

- `GET /dashboard` exige une session valide, ne prend pas de paramètre d'utilisateur et retourne les blocs `nextSession`, `activeGames` et `notifications` ;
- les erreurs d'authentification et d'infrastructure sont traduites en français générique avec `requestId` de diagnostic ;
- le marquage comme lu passe par l'endpoint F07 existant et reste autorisé par destinataire.

### Restantes

Aucune route supplémentaire prévue dans ce périmètre.

## Interface et composants

### Prévus

- route privée `/dashboard` ;
- résumé de notifications conditionnel ;
- placement desktop/mobile accessible ;
- états chargement, erreur et vide.

### Réalisés

- `apps/web/app/dashboard/page.tsx` ;
- `DashboardView` et `DashboardCard` ;
- `NotificationSummary` avec compteur, date, lien, marquage comme lue et message d'erreur ;
- `AppShell` place la cloche dans la barre d'actions supérieure sur desktop, la conserve dans le header mobile et pointe l'entrée Dashboard vers `/dashboard` ;
- zones tactiles minimales, focus visible, libellés et annonces accessibles.

### Restants

- captures de vérification manuelle ;
- E2E navigateur.

## Tests

### Prévus

- contrats partagés ;
- service et repository de notifications ;
- service et route API du dashboard ;
- client et rendu conditionnel du dashboard ;
- intégration PostgreSQL et non-régression F07.

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm exec vitest run packages/shared/tests/dashboard.test.ts` | 3 tests verts | 2026-09-08 |
| `pnpm exec vitest run apps/api/tests/unit/notifications/services.test.ts apps/api/tests/unit/dashboard/get-dashboard.test.ts apps/api/tests/api/dashboard/routes.test.ts` | Tests ciblés verts | 2026-09-08 |
| `pnpm exec vitest run apps/web/tests/dashboard-api.test.ts apps/web/tests/dashboard-pages.test.ts apps/web/tests/dashboard-visual.test.ts apps/web/tests/notifications-visual.test.ts` | Tests ciblés verts | 2026-09-08 |
| `DATABASE_URL=... pnpm test:integration` | 6 tests verts, dont 3 F07 et 3 F08 | 2026-09-08 |
| `pnpm test` | 104 fichiers et 266 tests verts | 2026-09-08 |
| `pnpm lint` | API, web, shared et database verts | 2026-09-08 |
| `pnpm typecheck` | API, web, shared et database verts | 2026-09-08 |
| `pnpm build` | Builds API et web verts | 2026-09-08 |
| `pnpm --filter @jdr-hub/shared typecheck` | Vert | 2026-09-08 |
| `pnpm --filter @jdr-hub/api typecheck` | Vert | 2026-09-08 |
| `pnpm --filter @jdr-hub/web typecheck` | Vert | 2026-09-08 |
| `pnpm --filter @jdr-hub/web lint` | Vert | 2026-09-08 |

### Restants

- E2E navigateur et validation visuelle humaine.

## Preuve TDD Red, Green, Refactor

### Red

- Tests écrits avant l'implémentation : oui, dans les tests de contrats, services, API, client, pages, placement UI et intégration PostgreSQL dédiés à F08.
- Échecs initiaux : modules absents, route `/` encore active et composants de dashboard non présents ; les tests ont échoué pour ces raisons attendues.

### Green

- Contrats, repository/service/route API, client, route et composants ont été ajoutés jusqu'au passage des tests ciblés.
- Une correction de fixture a aligné l'horloge JWT du test API sur l'horloge d'exécution ; aucun contrôle de sécurité n'a été désactivé.

### Refactor

- Les blocs du dashboard ont été isolés pour tolérer les erreurs indépendantes.
- Le placement responsive a été structuré par grille CSS et ordre DOM sans dupliquer le composant de notification.
- Les types TypeScript ont été resserrés après le premier typecheck frontend.

## Contrôles de sécurité

### Prévus

- session obligatoire et autorisation par destinataire ;
- absence de `userId` contrôlable côté client ;
- validation des identifiants et projection sans données fournisseur ;
- messages d'erreur génériques ;
- protection existante des mutations de notification.

### Réalisés

- tests API non authentifié : 401 ;
- tests d'intégration propriétaire/membre/tiers : le tiers ne voit pas la partie privée ;
- test d'intégration de notifications : seul le destinataire reçoit le résumé ;
- aucun secret, token, `discordId` ou donnée personnelle réelle ajouté aux fichiers ;
- l'action de lecture réutilise le contrôle F07 et ne modifie que la notification autorisée.

### Restants ou limites

- revue manuelle de la checklist sécurité complète au contrôle final ;
- tests E2E des interactions de navigation.

## Documentation technique consultée

- `docs/specifications/cahier-des-charges.md` ;
- `docs/design-system.md` et les maquettes dashboard desktop/mobile ;
- `docs/security/security-requirements.md` ;
- `docs/security/ai-access-policy.md` ;
- `docs/implementation-plan.md`.

## Fichiers principaux

- `packages/shared/src/dashboard.ts` — contrats partagés ;
- `apps/api/src/modules/dashboard/` — projection et route API ;
- `apps/api/src/modules/notifications/` — lecture des non-lues ;
- `apps/web/app/dashboard/page.tsx` — route frontend ;
- `apps/web/features/dashboard/` — vue et carte ;
- `apps/web/features/notifications/notification-summary.tsx` — bloc conditionnel ;
- `apps/api/tests/integration/postgres-dashboard.test.ts` — vérification PostgreSQL.

## Limites connues

- aucune validation visuelle automatisée par navigateur ;
- aucune notification temps réel ;
- la progression XP reste un emplacement explicite et non une donnée simulée ;
- le résumé affiche au maximum trois notifications.

## Travaux reportés

- écran complet de gestion des parties pour MJ ;
- progression XP ;
- pagination et historique enrichi des notifications ;
- E2E Discord/navigateur.

## Vérification manuelle

### Prévue

Avec un compte de test authentifié, vérifier le dashboard avec zéro notification, puis avec une notification non lue : présence du bloc dans la colonne droite desktop, sous la prochaine séance mobile, lien vers la séance, marquage comme lue et disparition du bloc après la dernière lecture.

### Réalisée

Non réalisée dans un navigateur réel.

### Restante

- vérification desktop, tablette et mobile ;
- vérification clavier et lecteur d'écran sur le bloc conditionnel.

## Commits importants

- `467bd92` — contrats de projection dashboard ;
- `4f26e3f` — résumé des notifications non lues ;
- `07d6df1` — projection API dashboard ;
- `597b46e` — route privée dashboard ;
- `94a3cdc` — placement visuel des notifications ;
- `a2a95d1` — traçabilité, intégration PostgreSQL et vérifications finales.

## Décisions associées

- `docs/superpowers/plans/2026-09-08-dashboard-notifications.md` — plan approuvé et exécuté en ligne.

## Évolutions datées

| Date | Évolution | Impact | Référence |
| --- | --- | --- | --- |
| 2026-09-08 | Ajout du dashboard privé et du résumé conditionnel des notifications | Les notifications non lues deviennent visibles sans ouvrir la cloche | Branche `feat/dashboard-notifications` |
| 2026-09-08 | Déplacement de la cloche desktop dans la barre d'actions supérieure | Le contrôle de notification est visible en haut de l'écran, conformément à la maquette | Test `dashboard-visual.test.ts` |
