# F04 — Candidatures et roster

## Statut

`IN_PROGRESS`

## Branche

`feat/applications`

## Pull Request

Non créée.

## Dépendances

- F01 — authentification et sessions (`MERGED`).
- F02 — parties et cycle de vie (`MERGED`).
- REF-001 — frontend Tailwind-only (`MERGED`).

## Contexte et besoin

Le MVP doit permettre à un joueur de déposer une candidature, de suivre son
statut et au MJ d'accepter ou refuser cette candidature. La décision acceptée
doit réserver une place sans course concurrente.

## Périmètre prévu

API, persistance, services applicatifs, contrôles d'autorisation, écran de
candidature sur le détail, page `/candidatures` et écran MJ de gestion.

## Spécification

Voir `docs/superpowers/specs/2026-09-05-applications-design.md`.

## Réalisé

- Contrats partagés stricts et migration `0003_applications-and-members.sql`.
- Tables `applications` et `game_members`, contrainte unique par partie et
  utilisateur, index de recherche et clés étrangères en cascade.
- Services `submit-application`, `list-my-applications`,
  `list-game-applications` et `decide-application` indépendants de Hono.
- API `POST /games/:id/applications`, `GET /applications`,
  `GET /games/:id/applications` et `PATCH /applications/:id`.
- Acceptation transactionnelle avec contrôle de capacité et création du membre
  `PLAYER`; résolution possible par UUID ou slug public.
- Formulaire sur le détail public, page candidat `/candidatures` et page MJ
  `/gestion/parties/[id]/candidatures`, en Tailwind et responsive.
- Matrice d'autorisation créée dans `docs/security/authorization-matrix.md`.
- Dockerfile `web-next` complété pour copier et compiler `@jdr-hub/shared`
  avant le build Next.js.

## Parcours utilisateur

1. Un joueur ouvre une partie publique et rédige un message facultatif.
2. L'API authentifie le compte, vérifie la partie et crée une candidature
   `PENDING`.
3. Le joueur retrouve son statut dans `/candidatures`.
4. Le MJ consulte les candidatures de sa partie et accepte ou refuse.
5. Une acceptation réserve une place et ajoute le joueur au roster dans une
   transaction ; une partie pleine renvoie `409`.

## Tests et preuve TDD

- **Red :** les tests de contrats, services, routes et UI ont d'abord échoué
  sur les modules et routes absents.
- **Green :** contrats, repository, services, handlers et composants ont été
  implémentés au minimum pour faire passer chaque scénario.
- **Refactor :** résolution UUID/slug, contrôle d'origine, projections et
  responsabilités ont été séparés sans affaiblir les assertions.
- Suite finale : 57 fichiers, 135 tests verts.

## Sécurité

- Session active obligatoire et origine exacte pour POST/PATCH.
- Validation Zod stricte, message limité à 1 000 caractères et champs forgés
  rejetés.
- Autorisation MJ par propriétaire côté service/repository.
- Anti-doublon par vérification métier et contrainte unique SQL.
- Acceptation transactionnelle verrouillée et limite `maxPlayers` contrôlée.
- Projections sans token Discord, cookie, session ou données privées inutiles.
- Messages rendus par React avec échappement par défaut.

## Vérification

- `pnpm test` — 57 fichiers, 135 tests verts.
- `pnpm lint` — vert.
- `pnpm typecheck` — vert.
- `pnpm build` — API et Next.js verts.
- `docker compose -f docker-compose.yml build --progress=plain web-next` — image
  `web-next` construite avec succès.
- `git diff --check` — vert.

## Limites et travaux reportés

- Les invitations, disponibilités, séances, votes et notifications Discord sont
  hors F04.
- L'intégration PostgreSQL réelle dépend d'une base de test disponible ; les
  invariants de repository sont couverts par le helper déterministe et le
  schéma Drizzle.
- La vérification visuelle manuelle desktop/mobile reste à effectuer.
