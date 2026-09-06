# Design — Messagerie textuelle par partie

## Objectif

Remplacer les messages Discord liés aux absences par une conversation textuelle
native à JDR Hub, disponible par partie et indépendante de l'installation d'un
bot Discord.

## Périmètre

### Inclus

- suppression de l'exigence runtime `DISCORD_BOT_TOKEN` et de la livraison DM ;
- conservation des notifications d'absence internes ;
- historique persistant de messages par partie ;
- lecture paginée et création de messages via API REST ;
- diffusion des nouveaux messages via SSE ;
- relais inter-instance via Redis Streams, sans exposer Redis publiquement ;
- accès MJ/membres actifs, révocation après départ ou exclusion ;
- lecture seule après fermeture ou fin de partie ;
- interface responsive dans le détail d'une partie ;
- tests contrats, sécurité, services, API, intégration PostgreSQL/Redis et UI.

### Exclus

- Discord Bot, DMs Discord et notifications Discord d'absence ;
- messages privés entre utilisateurs ;
- édition, suppression, réactions, pièces jointes, images, audio et Markdown
  riche ;
- mentions, chat général, recherche de messages et modération avancée ;
- synchronisation ou association obligatoire à un serveur Discord ;
- VTT, présence en ligne et accusés de lecture.

## Règles métier

1. L'identité de l'auteur vient exclusivement de la session applicative.
2. Le MJ propriétaire et un membre `ACTIVE` peuvent lire les messages d'une
   partie `OPEN`, `ACTIVE`, `CLOSED` ou `COMPLETED`.
3. Seuls le MJ propriétaire et les membres `ACTIVE` peuvent créer un message
   dans une partie `OPEN` ou `ACTIVE`.
4. Dans une partie `CLOSED` ou `COMPLETED`, toute écriture est refusée avec un
   conflit métier et la lecture reste autorisée.
5. Un membre `REMOVED`, un candidat, un invité non accepté et un utilisateur
   extérieur n'ont ni lecture ni écriture, même s'ils connaissent l'identifiant
   de la partie.
6. Un message contient uniquement un texte UTF-8 trimé, borné à 2 000
   caractères, et ne peut pas être vide.
7. Le rejeu d'une création n'est pas dédoublonné par le contenu ; chaque
   requête valide crée un message distinct. Le client doit utiliser son propre
   mécanisme de retry avec discernement.
8. L'ordre affiché repose sur `createdAt` puis l'UUID du message ; la base reste
   la source de vérité si Redis est indisponible.
9. Les notifications d'absence internes continuent d'être créées, mais aucune
   livraison Discord n'est produite.

## Architecture

### Flux d'écriture

```text
Navigateur
   │ POST /games/:id/messages
   ▼
Hono → handler → service → repository → PostgreSQL
                                      │
                                      └→ XADD game-messages:{id} → Redis
```

L'insertion PostgreSQL est effectuée avant la publication. Une erreur Redis ne
fait pas échouer la création durable du message : un mécanisme de rattrapage
peut republier l'identifiant lors d'une évolution ultérieure, tandis que les
lectures REST restent complètes.

### Flux de lecture temps réel

```text
Navigateur ── GET /games/:id/messages/stream ──► API Hono
                                                     │
                                                     └─ XREAD Redis Streams
```

Le flux SSE envoie `id`, `event: message` et une projection JSON minimale. Une
connexion possède un heartbeat, écoute l'abandon du client et est limitée à la
partie autorisée. À la reconnexion, le navigateur recharge les messages REST
depuis son curseur ; SSE accélère l'affichage mais ne remplace jamais la base.

### Limites opérationnelles

- Redis est sur le réseau Docker interne et son stream est borné par partie ;
- aucun contenu de message n'est écrit dans les logs applicatifs ;
- le nombre de connexions SSE et de créations de messages est limité par
  utilisateur et par partie ;
- les erreurs Redis et SSE sont traduites en état temporaire côté interface ;
- une instance API ne fait confiance ni à un événement Redis ancien ni au
  frontend et relit l'accès en base lors du chargement initial.

## Modèle de données

Créer `game_messages` avec :

| Colonne | Règle |
| --- | --- |
| `id` | UUID, clé primaire |
| `game_id` | UUID, clé étrangère vers `games`, cascade ciblée |
| `author_id` | UUID, clé étrangère vers `users`, cascade ciblée |
| `content` | `varchar(2000)`, non nul |
| `created_at` | timestamp avec fuseau, non nul |

Ajouter un index composite `(game_id, created_at, id)` pour la pagination stable
et les lectures SSE. Aucun identifiant Discord n'est copié dans le message.

## Contrats et API

### Contrat partagé

```ts
const gameMessageCommandSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
}).strict()
```

La requête de lecture accepte `limit` borné à 50 et un curseur opaque. Le
curseur encode uniquement la position de pagination ; il ne contient pas de
données utilisateur.

### Routes

- `:gameId` accepte l'UUID interne ou le slug public afin que le détail public
  puisse ouvrir la conversation sans exposer une nouvelle donnée ; le
  repository résout toujours l'identifiant interne avant la requête.
- `GET /games/:gameId/messages?limit=20&cursor=...` — lecture authentifiée,
  vérification de ressource, page de messages et curseur suivant ;
- `POST /games/:gameId/messages` — création authentifiée, origine stricte,
  validation Zod et rate limiting ;
- `GET /games/:gameId/messages/stream` — lecture SSE authentifiée avec reprise
  par `Last-Event-ID` ou curseur de flux.

Les réponses exposent l'UUID du message, l'auteur public déjà prévu par les
projections JDR Hub, le contenu texte et la date ISO. Elles n'exposent ni
`discordId`, ni token, ni disponibilité, ni erreur Redis brute.

## Autorisation

Le service appelle une politique dédiée avant chaque lecture, écriture et
connexion SSE. La politique vérifie le statut de la partie et l'appartenance
active dans la même projection ; une modification du roster révoque donc le
prochain accès sans dépendre d'un état React ou Redis.

Les onglets, l'URL et la connexion SSE ne donnent aucun privilège. Un utilisateur
non authentifié reçoit une erreur d'authentification ; un utilisateur sans
accès reçoit une réponse qui ne confirme pas l'existence d'une conversation
privée.

## Interface

Le détail d'une partie reçoit une section `Conversation` cohérente avec les
cartes existantes :

- en-tête avec titre et nombre de messages chargé ;
- liste chronologique compacte avec auteur, avatar public, date et contenu
  texte échappé ;
- chargement des pages précédentes sans casser la position de lecture ;
- champ et bouton d'envoi uniquement si l'utilisateur peut écrire ;
- état lecture seule explicite pour une partie fermée/terminée ;
- états chargement, vide, erreur et reconnexion ;
- annonce accessible des nouveaux messages et focus visible ;
- adaptation mobile sans interaction dépendante du survol.

Le rendu ne passe pas par `dangerouslySetInnerHTML`. Les messages sont affichés
comme texte et non comme HTML ou Markdown interprétable.

## Gestion de l'ancien flux Discord

- retirer `DISCORD_BOT_TOKEN` du contrat de démarrage et de Compose ;
- ne plus créer de `notification_deliveries` lors d'une absence ;
- conserver les notifications internes et leurs routes de lecture ;
- retirer le worker et le client Discord de l'index API ;
- conserver la migration historique de `notification_deliveries` sans nouvelle
  écriture, aucune suppression destructive n'étant nécessaire ;
- mettre à jour les tests et la fiche F07 pour refléter ce comportement.

## Tests d'acceptation

### Métier et sécurité

- un utilisateur non authentifié ne lit ni n'écrit ;
- un membre actif lit et écrit dans une partie ouverte/active ;
- le MJ lit et écrit sans ligne `game_members` dédiée ;
- un candidat, membre retiré et utilisateur d'une autre partie sont refusés ;
- une partie fermée/terminée autorise la lecture et refuse l'écriture ;
- un payload vide, trop long, enrichi de propriétés inconnues ou non textuel est
  refusé ;
- une absence crée une notification interne sans livraison Discord ;
- les messages XSS sont conservés comme texte et rendus sans HTML ;
- les écritures et connexions SSE dépassant le rate limit sont refusées ;
- la déconnexion Redis n'empêche pas une lecture historique PostgreSQL ;
- une reconnexion SSE ne crée aucun message en double.

### Technique

- migration PostgreSQL idempotente dans l'environnement de test ;
- pagination stable et indexée ;
- publication Redis après persistance et récupération inter-instance ;
- fermeture de connexion SSE et heartbeat testés ;
- suite web responsive et accessibilité structurelle ;
- lint, TypeScript, tests et builds des quatre packages.

## Limites connues

- la modération avancée et les signalements de messages sont reportés ;
- Redis Streams apporte la diffusion inter-instance, pas une garantie de
  livraison de notification durable ; PostgreSQL reste la reprise ;
- l'identification reste dépendante de Discord OAuth, mais aucune installation
  de bot n'est requise ;
- l'absence de dédoublonnage de contenu implique qu'un retry client peut créer
  deux messages, choix à documenter dans l'UX.

## Décisions associées

- [`003-in-app-game-messaging.md`](../../decisions/003-in-app-game-messaging.md)
  — choix initial du chat par partie, SSE, Redis Streams et règles d'accès ;
- [`005-in-app-messaging-replaces-discord-dms.md`](../../decisions/005-in-app-messaging-replaces-discord-dms.md)
  — retrait des DMs Discord et maintien des notifications internes.
