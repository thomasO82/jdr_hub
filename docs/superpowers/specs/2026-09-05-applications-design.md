# F04 — Candidatures et roster

## Objectif

Permettre à un utilisateur connecté de candidater à une partie publique,
consulter ses candidatures, et permettre au MJ propriétaire d'accepter ou de
refuser chaque candidature sans exposer de données privées.

## Périmètre

- dépôt d'une candidature avec message facultatif ;
- consultation par le candidat de ses propres candidatures et statuts ;
- consultation des candidatures d'une partie par son MJ propriétaire ;
- décision du MJ : acceptation ou refus ;
- ajout transactionnel d'un candidat accepté au roster ;
- contrôle des doublons, de la capacité et des statuts de partie.

Les invitations, disponibilités, séances, votes et notifications Discord sont
hors F04.

## Règles métier

- seules les parties `PUBLIC` en statut `OPEN` acceptent une candidature ;
- un utilisateur ne peut pas candidater à sa propre partie ;
- une seule candidature existe pour le couple `(gameId, userId)` ;
- une candidature nouvellement créée est `PENDING` ;
- une candidature `PENDING` peut devenir `ACCEPTED` ou `REJECTED` une seule fois ;
- accepter vérifie que la partie est toujours ouverte et que le nombre de
  membres joueurs est inférieur à `maxPlayers` ;
- accepter crée un membre `PLAYER` dans la même transaction que la décision ;
- une candidature refusée ne crée aucun membre ;
- les décisions répétées et les conflits de capacité renvoient `409` ;
- le candidat ne voit que ses propres candidatures ; le MJ ne voit que celles
  de ses parties.

## API

- `POST /games/:id/applications` — authentifié, candidat courant ; corps
  strict `{ message?: string }`, message limité à 1 000 caractères ; réponse
  `201` avec la candidature publique du candidat ;
- `GET /applications` — authentifié, retourne les candidatures du compte
  courant ;
- `GET /games/:id/applications` — authentifié, propriétaire de la partie ;
- `PATCH /applications/:id` — authentifié, propriétaire de la partie ; corps
  strict `{ status: 'ACCEPTED' | 'REJECTED' }`.

Les réponses suivent l'enveloppe `{ data, error, meta.requestId }` existante et
les erreurs publiques restent génériques (`401`, `403`, `404`, `409`). Aucun
identifiant Discord, token, cookie ou champ d'administration n'est retourné.

## Architecture

Le module `applications` sépare `routes.ts`, `handlers.ts`, `repository.ts` et
les services `submit-application.ts`, `list-my-applications.ts`,
`list-game-applications.ts` et `decide-application.ts`. Les services ne
dépendent pas de Hono ; les handlers ne font ni SQL ni autorisation implicite.
L'identité est fournie par le service d'authentification existant et les
dépendances sont injectées explicitement.

## Persistance

Ajouter les tables `applications` et `game_members` sans modifier les tables
existantes. `applications` contient `id`, `gameId`, `userId`, `message`,
`status`, `createdAt`, `updatedAt` et une contrainte unique `(gameId, userId)`.
`game_members` contient `gameId`, `userId`, `role`, `status`, `joinedAt` et une
clé primaire composée. La décision d'acceptation utilise une transaction et
un verrou de ligne sur la partie afin d'empêcher le dépassement concurrent de
`maxPlayers`.

## Frontend

Le détail public affiche le formulaire de candidature lorsque le visiteur est
connecté et une information de statut lorsqu'une candidature existe. La page
`/candidatures` liste les candidatures du compte. Les écrans reprennent la
hiérarchie D05/D06 et la version mobile M04, exclusivement en Tailwind, avec
messages d'erreur compréhensibles et états chargement/vide.

## Sécurité et tests

- tests rouges puis verts pour authentification, autorisation par ressource,
  doublon, auto-candidature, partie privée/fermée, message trop long et
  décisions répétées ;
- tests d'intégration PostgreSQL pour contraintes, transaction d'acceptation et
  concurrence de capacité ;
- aucune confiance dans `userId`, `ownerId`, `role` ou `status` fournis par le
  navigateur ;
- vérification d'origine/CSRF sur les routes qui modifient l'état, selon le
  mécanisme déjà utilisé par l'API ;
- message rendu avec l'échappement React par défaut.

## Compatibilité

Les routes et contrats existants restent inchangés. Aucune dépendance externe,
aucun secret et aucune modification fonctionnelle hors participation ne sont
introduits.
