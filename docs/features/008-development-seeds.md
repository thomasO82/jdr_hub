# DEV-001 — Données de développement

## Identifiant

DEV-001

## Statut

`IN_PROGRESS`

## Branche

`feat/development-seeds`

## Lien ou numéro de Pull Request

Non créée.

## Dates

- Début : 2026-09-05
- Fin : Non terminée

## Contexte et besoin

Fournir un jeu de données fictives pour tester rapidement le catalogue public,
les filtres, les détails de parties et les écrans de candidatures en local.

## Fonctionnalités effectivement réalisées

- Données stables pour trois utilisateurs fictifs, six tags, cinq parties et
  leurs relations.
- Une partie publique ouverte, une partie publique active, une partie privée,
  un brouillon et une partie fermée pour vérifier la visibilité.
- Deux candidatures et un membre fictifs pour tester les listes F04.
- Script transactionnel relançable avec upserts, précédé de l’application des
  migrations existantes.
- Commandes `pnpm db:seed` et
  `pnpm --filter @jdr-hub/database db:seed`, avec chargement automatique du
  `.env` racine.

## Modèle de données et migrations

Aucune migration ni modification de schéma. Les tables existantes sont
réutilisées.

## Tests et preuve TDD

- **Red :** `packages/database/tests/seed.test.ts` échouait car le module de
  données n’existait pas.
- **Green :** les données fictives, leurs références et les écritures
  conflict-safe ont été ajoutées ; trois tests passent.
- **Refactor :** les données sont séparées du script d’accès PostgreSQL.

## Sécurité

- Aucun secret, compte réel ou donnée personnelle réelle.
- Le script utilise uniquement `DATABASE_URL` fournie par l’environnement au
  moment de son exécution.
- Aucune suppression ni réinitialisation de données ; les écritures sont
  limitées aux enregistrements de seed identifiés.

## Vérifications

- `pnpm exec vitest run packages/database/tests/seed.test.ts` — 3 tests verts.
- `pnpm exec vitest run tests/infrastructure/database-seed-config.test.ts` — 1
  test vert.
- `pnpm test` — 59 fichiers, 140 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `pnpm build` — API et Next.js verts.
- `pnpm --filter @jdr-hub/database build` — vert.
- `git diff --check` — vert.

## Limites et travaux reportés

- La commande doit être exécutée avec une `DATABASE_URL` pointant vers la base
  de développement ; aucun seed automatique n’est lancé au démarrage de la
  production.
- La vérification PostgreSQL réelle reste à effectuer dans l’environnement
  local du propriétaire.
