# XP, niveaux et historique de progression

## Identifiant

F09

## Statut

IN_PROGRESS

## Branche

`feat/xp-and-levels`

## Lien ou numéro de Pull Request

Création automatique refusée par GitHub (`403 Resource not accessible by integration`) ; [ouverture manuelle](https://github.com/thomasO82/jdr_hub/pull/new/feat/xp-and-levels)

## Dates de début et de fin

- Début : 2026-09-08
- Fin : Non terminée

## Dépendances

### Prévues

- F01 pour l’identité authentifiée et les sessions ;
- F06/F07 pour les séances et la validation des présences ;
- F08 pour le dashboard et le shell applicatif.

### Réalisées ou constatées

- Les séances F06/F07 disposent déjà d’une transaction de validation ;
- le dashboard F08 fournit les blocs privés et les conventions frontend ;
- le dépôt PostgreSQL et les migrations Drizzle sont disponibles.

### Restantes

- Revue et fusion humaines de la Pull Request.

## Contexte

### Prévu

Attribuer une progression traçable aux joueurs présents à une séance, sans transformer JDR Hub en VTT ni accepter de valeurs XP fournies par le navigateur.

### Réalisé

Le journal `xp_events` est la source d’audit. Les projections `users.xp` et `users.level` sont recalculées dans la même transaction que la validation de présence.

### Restant à faire

La vérification manuelle dans un navigateur réel reste à effectuer.

## Besoin utilisateur

### Prévu

Gagner exactement 100 XP après une séance jouée, voir son niveau et consulter son historique personnel.

### Réalisé

Le dashboard affiche le niveau et le total XP ; `/profil/xp` affiche la progression, les événements « Séance jouée » et une pagination par curseur.

### Restant à faire

Aucun autre motif XP n’est inclus dans le MVP.

## Périmètre prévu

- règles partagées XP et niveaux ;
- persistance idempotente des événements ;
- attribution atomique après validation ;
- route privée d’historique ;
- dashboard et écran de profil responsive.

## Fonctionnalités effectivement réalisées

- Récompense `SESSION_ATTENDED = 100` et seuils de niveaux partagés ;
- table `xp_events`, contrainte d’idempotence, index et projections utilisateur ;
- attribution uniquement aux utilisateurs `PRESENT` ;
- rejeu sans doublon et rollback si l’attribution échoue ;
- `GET /profile/xp` authentifié, limité à 50 éléments et paginé par curseur ;
- filtrage des champs internes avant réponse HTTP ;
- progression intégrée au dashboard et page `/profil/xp` en Tailwind-only.

## Parcours utilisateur

### Prévu

1. Le MJ valide les présences d’une séance.
2. Les joueurs présents reçoivent 100 XP.
3. Le joueur consulte son dashboard ou ouvre son profil XP.
4. Il charge les pages suivantes de son historique.

### Réalisé

Le serveur dérive les bénéficiaires depuis les présences validées et l’utilisateur connecté dérive l’historique depuis sa session. Aucun `userId`, XP, niveau, montant ou motif client n’est pris en compte.

### Restant à faire

- contrôle visuel manuel desktop/mobile ;
- test E2E navigateur avec une séance complète.

## Règles métier

### Prévues

- 100 XP par participant présent ;
- aucun XP pour `ABSENT`, `EXCUSED` ou non présent ;
- événements idempotents par séance et utilisateur ;
- progression calculée depuis le journal ;
- historique privé.

### Implémentées

- `session-attended:<sessionId>:<userId>` est unique en base ;
- le callback XP reçoit la transaction Drizzle de présence ;
- le rejeu d’une séance déjà complétée ne rappelle pas l’attribution ;
- les niveaux suivent les seuils 0, 250, 600, 1100 et 1750 XP ;
- la pagination est bornée à 50 et ordonnée par date puis identifiant décroissants.

### Non couvertes ou reportées

- bonus manuels, XP de campagne, pénalités et classement public.

## Architecture et choix techniques

### Réalisé

Le module `gamification` sépare policy, repository, services, handlers et routes. `attendance/repository.ts` injecte l’attribution dans la transaction existante. Le dashboard lit une projection dédiée et le frontend consomme uniquement des services API.

## Modèle de données et migrations

La migration Drizzle `0009_lethal_mattie_franklin.sql` ajoute `users.xp`, `users.level` et `xp_events` avec clé étrangère, montant positif, clé d’idempotence unique et index utilisateur/date et séance.

## Routes API

### Implémentées

- `GET /profile/xp` : session obligatoire, paramètres `cursor` et `limit` stricts, réponse enveloppée et champs publics uniquement.

### Restantes

- Aucune route supplémentaire dans F09.

## Interface et composants

### Réalisés

- `XpProgressCard` avec barre native accessible ;
- `XpHistoryView` avec états chargement, erreur, vide et pagination ;
- `app/profil/xp/page.tsx` comme composition de route ;
- carte de progression dans `DashboardView` ;
- navigation via le shell existant, sans duplication du header/footer.

## Tests

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm exec vitest run packages/shared/tests/xp.test.ts` | 3 tests XP verts | 2026-09-08 |
| `pnpm exec vitest run apps/api/tests/unit/gamification/services.test.ts` | 3 tests de services verts | 2026-09-08 |
| `pnpm exec vitest run apps/api/tests/api/gamification/routes.test.ts` | 2 tests API verts | 2026-09-08 |
| `DATABASE_URL=... pnpm exec vitest run --config vitest.integration.config.ts apps/api/tests/integration/postgres-xp.test.ts` | 3 tests XP PostgreSQL verts | 2026-09-08 |
| `pnpm exec vitest run apps/web/tests/xp-api.test.ts apps/web/tests/xp-visual.test.ts` | 5 tests frontend XP verts | 2026-09-08 |
| `DATABASE_URL=... pnpm test` | 122 fichiers et 326 tests verts | 2026-09-08 |
| `DATABASE_URL=... pnpm test:integration` | 4 fichiers et 11 tests PostgreSQL verts | 2026-09-08 |
| `pnpm lint` | API, web, shared et database verts | 2026-09-08 |
| `pnpm typecheck` | API, web, shared et database verts | 2026-09-08 |
| `pnpm build` | Builds API et web verts, route `/profil/xp` générée | 2026-09-08 |

### Restants

- Aucun contrôle automatisé restant ; revue et vérification manuelle avant fusion.

## Preuve TDD Red, Green, Refactor

### Red

- Les tests partagés, PostgreSQL, API et frontend ont été écrits avant leurs implémentations respectives ;
- les commandes ciblées ont d’abord échoué sur modules/routes absents ;
- l’intégration PostgreSQL a aussi confirmé l’absence initiale du service local avant démarrage du conteneur de test.

### Green

- Les contrats, schémas, services, transaction d’attribution, route, client et vues ont ensuite été implémentés au minimum ;
- les tests ciblés et les non-régressions dashboard/attendance sont verts.

### Refactor

- Les dépendances XP restent injectées ; les champs internes sont filtrés au handler ; les composants restent séparés et sans CSS additionnel.

## Contrôles de sécurité

### Réalisés

- Route XP refusée sans session (`401`) ;
- `userId` de query ignoré et identité dérivée du cookie de session ;
- limites et curseurs invalides rejetés en français (`400`) ;
- `userId` et `idempotencyKey` absents de la réponse ;
- montant/motif non acceptés depuis le client ;
- transaction et contrainte DB contre les doubles attributions ;
- erreurs internes traduites sans SQL, secret ou exception brute.

### Restants ou limites

- Les logs d’audit XP structurés restent à compléter dans une évolution observabilité dédiée.

## Limites connues

- Les données historiques avant F09 ne génèrent pas rétroactivement d’événement XP.

## Travaux reportés

- E2E navigateur et captures de vérification manuelle.

## Vérification manuelle

### Prévue

- Valider la carte de progression du dashboard sur mobile et desktop ;
- ouvrir `/profil/xp`, vérifier le libellé « Séance jouée », le focus clavier et « Charger plus » ;
- valider une séance avec un présent puis vérifier que son XP augmente une seule fois.

### Réalisée

- Non réalisée dans cette session.

### Restante

- Vérification navigateur et captures de référence.

## Commits importants

- `a2b6dd3` — règles et contrats XP ;
- `e5b0b40` — schéma et migration ;
- `08c7370` — services d’attribution et historique ;
- `19e9b5b` — attribution atomique avec les présences ;
- `1206cf5` — API privée d’historique ;
- `c529317` — dashboard et profil XP.

## Décisions associées

- `docs/superpowers/specs/2026-09-08-xp-and-levels-design.md` ;
- `docs/superpowers/plans/2026-09-08-xp-and-levels.md`.
