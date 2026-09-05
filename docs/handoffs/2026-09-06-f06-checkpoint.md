# Point de reprise — F06 scheduling — 2026-09-06

## Branche et état Git

- Branche active : `feat/sessions-scheduling`.
- Branche poussée : `origin/feat/sessions-scheduling`.
- Dernier commit : `78b988d fix: align scheduling vote route segment`.
- Arbre de travail propre au moment de la sauvegarde.
- F05 a été confirmée fusionnée par le propriétaire dans `develop`.

## F06 réalisée

F06 ajoute les séances, propositions de créneaux, votes et planning :

- contrats partagés et validation stricte des fenêtres UTC ;
- migration `packages/database/migrations/0005_scheduling.sql` ;
- tables `time_proposals`, `time_votes`, `game_sessions` ;
- services séparés et repository Drizzle ;
- routes Hono `/games/:id/proposals`, `/proposals/:id/votes`,
  `/games/:id/sessions` et `/planning` ;
- page `/planning` et écran `/parties/[slug]/vote` en Tailwind ;
- contrôles d'appartenance, propriétaire MJ, origine, votes uniques,
  idempotence et limite de trois séances one-shot.

## Vérifications

- `pnpm test` : 84 fichiers, 203 tests passés ;
- `pnpm lint` : OK ;
- `pnpm typecheck` : OK ;
- build API : OK ;
- build Next.js : OK avec Turbopack ;
- image Docker `web-next` reconstruite et conteneur vérifié `healthy`.

## Correction récente

Next.js refusait la présence simultanée de `/parties/[slug]` et
`/parties/[id]/vote`. La route F06 est désormais `/parties/[slug]/vote`, et le
repository accepte l'id ou le slug de la partie.

## Livraison

La PR F06 n'a pas pu être créée automatiquement car `gh` n'est pas installé.
Lien manuel :
https://github.com/thomasO82/jdr_hub/pull/new/feat/sessions-scheduling

Le statut F06 reste `IN_PROGRESS` jusqu'à l'ouverture effective de la PR.

## Prochaine étape

Après revue et fusion de F06, tirer `develop` et commencer F07 (présence,
absence et notifications Discord). La route `/profil` n'est pas encore
implémentée : elle appartient à F09 (XP, niveaux et historique), après F08.

## Limite connue

Le test d'intégration F06 utilise le helper mémoire existant ; le dépôt ne
fournit pas encore de harness PostgreSQL d'intégration dédié.
