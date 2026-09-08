# Filtres avancés du catalogue public

## Identifiant

F17

## Statut

`IN_PROGRESS`

## Branche

`feat/advanced-catalog-filters`

## Lien ou numéro de Pull Request

Non créée.

## Dates de début et de fin

- Début : 2026-09-08
- Fin : Non terminée

## Dépendances

### Prévues

- F03 — catalogue public, détail et SEO.
- F04/F08 — membres actifs et capacité des parties.
- F06 — séances planifiées.

### Réalisées ou constatées

- Contrat public existant, tags relationnels, membres et séances PostgreSQL.
- Fusion précédente de F10 dans `develop` avant la création de la branche.

### Restantes

- Revue humaine et fusion de la Pull Request.

## Contexte

### Prévu

Les contrôles de type et format étaient affichés mais n’étaient pas reliés à la requête. La spécification prévoit aussi des filtres de système, date et places.

### Réalisé

Le flux formulaire → URL → client API → contrat Zod → repository PostgreSQL est maintenant relié de bout en bout.

### Restant à faire

- Vérification manuelle dans le navigateur avec les données de développement.

## Besoin utilisateur

### Prévu

Pouvoir combiner les filtres du catalogue et partager le résultat par URL.

### Réalisé

Les filtres recherche, MJ, tags, type, format, système, période de séance et places disponibles sont transmis et appliqués côté serveur.

### Restant à faire

- Aucun filtre de niveau n’est ajouté, conformément à la décision utilisateur.

## Fonctionnalités effectivement réalisées

- Type `ONE_SHOT`/`CAMPAIGN` filtrable.
- Format `ONLINE`/`TABLE` persisté et filtrable.
- Système filtré sans distinction de casse.
- Période filtrée sur les séances futures `SCHEDULED`.
- Places disponibles calculées à partir de `maxPlayers` et des membres actifs.
- Tags conservés en logique `AND`.
- Paramètres conservés dans l’URL et restaurés par le formulaire.
- Projection publique enrichie avec format, places disponibles et prochaine séance.

## Règles métier implémentées

- Tous les filtres sont cumulatifs.
- Les parties privées, brouillons et fermées restent exclues.
- Les valeurs inconnues et les dates inversées sont rejetées par Zod.
- Aucun niveau n’est accepté par l’API.

## Architecture et modèle de données

- `games.format` est ajouté par migration additive avec défaut `ONLINE` et index.
- Les séances `SCHEDULED` et membres `ACTIVE` sont interrogés côté repository avant pagination.
- Le frontend ne dépend pas de la base de données ; il utilise uniquement le contrat partagé.
- Les suites PostgreSQL sont séparées et exécutées séquentiellement pour éviter les courses de migration.

## Tests et preuve TDD

### Red

- Contrat : échec sur les clés inconnues avant ajout des nouveaux champs.
- Client : échec car les nouveaux paramètres n’étaient pas sérialisés.
- API : échec car `type` était rejeté puis ignoré.
- Schéma : échec car `games.format` et sa migration n’existaient pas.
- UI : échec car les contrôles utilisaient `visualType`/`visualFormat` et les autres champs n’existaient pas.

### Green / non-régression

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm test` | 125 fichiers, 339 tests verts | 2026-09-08 |
| `DATABASE_URL=… pnpm test:integration` | 5 fichiers, 12 tests PostgreSQL verts | 2026-09-08 |
| `pnpm lint` | Vert | 2026-09-08 |
| `pnpm typecheck` | Vert | 2026-09-08 |
| `pnpm build` | API et Next.js compilés | 2026-09-08 |
| `git diff --check` | Vert | 2026-09-08 |

## Sécurité

- Validation Zod stricte, bornes de pagination, dates et capacité.
- Requêtes Drizzle paramétrées, sans interpolation de valeurs utilisateur dans SQL brut.
- Projection publique limitée ; aucun membre, propriétaire technique ou détail privé exposé.
- Tests de visibilité publique, projection sûre et combinaison des filtres.

## Limites connues

- Le filtre de niveau n’est pas implémenté.
- La vérification visuelle navigateur reste à effectuer.
- La Pull Request n’est pas encore créée.
