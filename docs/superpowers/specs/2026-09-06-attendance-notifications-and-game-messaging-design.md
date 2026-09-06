# F07 / F07B — Présences, notifications et messagerie par partie

## Statut

Brouillon de conception approuvé en conversation le 2026-09-06, en attente de
relecture du document avant le plan d'implémentation.

## Décisions produit

Le MVP est étendu avec une messagerie applicative dédiée aux échanges autour
d'une partie. Cette extension remplace la règle précédente qui excluait le
chat complet du MVP ; elle ne modifie pas la frontière « pas de VTT, pas de
chat vocal et pas de réseau social généraliste ».

Les décisions validées sont :

- une absence déclenche une notification Discord en message privé au MJ ;
- la même absence crée une notification interne dans JDR Hub ;
- la messagerie applicative est une conversation de groupe par partie, pas une
  messagerie privée entre deux utilisateurs ;
- les messages sont textuels uniquement pour le MVP ;
- seuls le MJ propriétaire et les membres actifs de la partie peuvent lire ou
  écrire ;
- un joueur qui quitte ou est exclu perd immédiatement l'accès à la
  conversation ;
- quitter un salon Discord associé ne déclenche aucune action dans JDR Hub ;
- une partie fermée ou terminée conserve sa conversation en lecture seule ;
- le temps réel utilise SSE ;
- Redis Streams relaie les événements entre instances API, tandis que
  PostgreSQL reste la source de vérité des messages ;
- la livraison initiale est organisée en deux fonctionnalités et deux PR :
  `feat/attendance-notifications`, puis `feat/game-messaging`.

## Découpage

### F07 — Présences, absences et notifications

Cette première livraison couvre les états de présence, la déclaration
d'absence, la validation par le MJ, les notifications internes et le DM
Discord. Elle fournit le socle de notification réutilisable par la
messagerie.

### F07B — Messagerie par partie

Cette seconde livraison couvre l'historique des messages, les droits d'accès,
le flux SSE, la diffusion Redis Streams et l'interface de conversation.

Les deux fonctionnalités restent dans le MVP, mais leur séparation conserve
des branches et des PR cohérentes : l'absence et la notification ont des
risques d'intégration Discord différents du stockage et du temps réel de la
messagerie.

## Hors périmètre

Ne sont pas prévus dans ces deux livraisons :

- messages privés entre utilisateurs ;
- fichiers, images, pièces jointes ou liens enrichis ;
- réactions, sondages, fils de discussion et citations ;
- modification ou suppression de messages dans la première version ;
- synchronisation des messages avec un salon Discord ;
- action automatique lorsqu'un utilisateur quitte un salon Discord ;
- appels audio/vidéo, présence en ligne et saisie « est en train d'écrire » ;
- notifications push mobiles natives ;
- chat temps réel général en dehors d'une partie.

## Architecture générale

### Source de vérité et flux asynchrones

PostgreSQL conserve les données métier et l'historique durable. Redis n'est
pas utilisé comme base de messages : il sert de relais temps réel entre les
processus API.

Pour chaque événement qui doit atteindre Discord, la transaction métier
conserve l'événement local avant de lancer la livraison externe. Un échec de
Discord ne supprime donc jamais une absence ou une notification interne. La
livraison Discord est réessayable, idempotente et limitée par utilisateur et
par type d'événement.

Pour les messages, l'API enregistre d'abord le message en base. Après la
validation de la transaction, elle publie un événement dans un Redis Stream
avec l'identifiant du message et de la partie. Les processus API lisent les
événements et les redistribuent uniquement aux connexions SSE locales qui
appartiennent encore à la partie concernée. Si Redis est indisponible, le
message reste lisible via l'API et sera récupéré lors d'une reconnexion ou
d'un rechargement ; Redis ne peut pas provoquer la perte de l'historique.

Redis Streams est préféré à Redis Pub/Sub pour pouvoir reprendre les
événements récents après une déconnexion. La rétention du stream sera bornée
et l'historique complet restera dans PostgreSQL.

### Configuration et déploiement

Le service Redis sera ajouté à Docker Compose avec un healthcheck, sans port
public et avec une version d'image explicitement maîtrisée. Son URL provient
de l'environnement API (`REDIS_URL`) et ne sera jamais codée dans les sources
ou les tests. L'API doit rester démarrable avec une configuration de test
factice ; aucun secret Discord ou Redis ne sera commité.

Le reverse proxy devra préserver les connexions SSE et désactiver tout
buffering incompatible avec un flux d'événements. Le développement local
reste composé de `web-next`, `api-hono`, `postgres` et `redis`.

## F07 — Présences et notifications

### Modèle métier

Une ligne de présence relie une séance et un membre actif. Les statuts
doivent distinguer au minimum l'absence déclarée, la présence validée et
l'absence validée par le MJ ; le statut initial d'un membre sans déclaration
reste implicite ou explicite selon le schéma retenu dans le plan.

Le joueur ne peut déclarer son absence que pour une séance à laquelle il a
encore accès. La demande est idempotente pour la même séance et le même
utilisateur. Elle ne modifie pas le roster et ne donne pas lieu à une pénalité
XP dans le MVP.

Le MJ propriétaire valide la séance et les présences selon les règles
d'autorisation par ressource. Un membre exclu, une séance annulée, un
utilisateur non authentifié ou un utilisateur extérieur à la partie reçoit
une réponse d'erreur publique générique.

### Notification interne

La notification interne contient uniquement les informations nécessaires :
type d'événement, partie, séance, auteur de l'absence, destinataire MJ, état
lu/non lu et dates techniques. Le frontend affiche un libellé français clair,
une date accessible et un lien vers la séance ou la partie ; il ne rend jamais
le texte brut d'une exception API.

La création de la notification et de l'événement de livraison est
transactionnelle avec l'absence. Une clé d'idempotence logique empêche de
créer plusieurs notifications pour la même absence.

### DM Discord

Un adaptateur Discord dédié reçoit l'identifiant Discord du MJ et un message
déjà contrôlé. Il ouvre ou réutilise un DM puis envoie un message textuel
minimal, sans adresse exacte, token, identifiant interne, données privées
inutiles ou mention `@everyone`/`@here`. Le token du bot reste uniquement dans
l'environnement API.

Le service Discord est injecté dans les cas d'usage et remplacé par un faux
dans les tests. Les erreurs réseau, réponses 429 et indisponibilités créent
un état de livraison réessayable sans exposer le détail Discord à l'utilisateur.

Cette stratégie correspond aux primitives officielles Discord pour créer un
DM avec un utilisateur puis poster un message dans un canal DM. Les messages
utilisateur doivent rester limités et les mentions désactivées explicitement.

## F07B — Messagerie par partie

### Données

Le modèle prévu comprend :

- `game_messages` : identifiant UUID, partie, auteur, contenu texte borné,
  date de création et identifiant d'ordre ;
- `game_message_reads` : curseur de lecture par partie et utilisateur pour
  calculer les non-lus sans modifier chaque message ;
- éventuellement un événement/outbox technique si les tests démontrent que
  la publication Redis doit être garantie après commit.

Le contenu est validé côté API avec Zod, limité à une taille compatible avec
le design et la lisibilité mobile, et refusé s'il est vide ou composé
uniquement d'espaces. Le texte est rendu par React comme texte échappé ; aucun
HTML arbitraire ni `dangerouslySetInnerHTML` n'est autorisé.

### Contrat API proposé

- `GET /games/:id/messages` : historique paginé, réservé aux membres actifs
  et au MJ ;
- `POST /games/:id/messages` : créer un message textuel, avec origine
  stricte, rate limit et clé d'idempotence de soumission ;
- `GET /games/:id/messages/events` : ouvrir le flux SSE après contrôle de
  session et d'appartenance ;
- `POST /games/:id/messages/read` : avancer le curseur de lecture de
  l'utilisateur courant ;
- `GET /notifications` et `POST /notifications/:id/read` : lire et marquer
  les notifications internes selon les conventions communes.

Les erreurs restent génériques côté public et utilisent un identifiant de
requête pour le support. Aucun `userId` ou rôle fourni par le navigateur ne
sert à autoriser une opération.

### Flux SSE et Redis Streams

Le navigateur ouvre un `EventSource` sur la partie visible. L'API vérifie le
cookie de session et l'appartenance avant de garder la connexion ouverte. Les
événements contiennent un identifiant de stream, le message projeté et un
type explicite. Des heartbeats maintiennent la connexion ; l'abandon du
navigateur libère l'abonnement local.

Lors d'une reconnexion, le dernier identifiant SSE est utilisé pour récupérer
les événements encore disponibles dans Redis ; l'historique PostgreSQL reste
le mécanisme de rattrapage si l'événement n'est plus dans la fenêtre Redis.
Les doublons sont ignorés côté client grâce à l'identifiant de message.

Un gestionnaire local par processus regroupe les abonnements SSE d'une même
partie. Une instance API consomme les événements Redis nécessaires puis les
diffuse uniquement à ses connexions autorisées. Les messages Redis ne sont
jamais envoyés directement au navigateur.

### Droits et cycle de vie

- membre actif ou MJ : lecture et écriture lorsque la partie est ouverte ;
- partie fermée ou terminée : lecture seule pour les membres qui conservent
  leur accès ;
- membre quitté ou exclu : aucun accès ultérieur à l'historique ou au flux ;
- utilisateur extérieur : même absence publique pour éviter la divulgation
  d'existence ;
- départ d'un salon Discord : aucune modification du roster ou des droits
  applicatifs.

Le serveur coupe ou refuse un flux SSE dès que le contrôle d'accès ne permet
plus l'accès à la partie. Une modification du roster reste donc effective
indépendamment de l'état de la page ouverte.

## Interface et design

La messagerie réutilise `AppShell`, le header et la navigation existants. Elle
reprend les tokens du design system : surfaces claires, violet `primary` pour
l'action d'envoi et les états actifs, Hanken Grotesk pour les titres, Inter
pour le contenu et Geist pour les métadonnées.

### Desktop

- panneau central plafonné dans la grille applicative ;
- titre de la partie, statut et membres autorisés dans l'en-tête ;
- historique vertical avec auteur, avatar autorisé, heure et contenu ;
- séparateurs de jour accessibles ;
- formulaire fixé en bas du panneau avec label visible, compteur de longueur
  et bouton d'envoi ;
- indicateur de connexion et état « lecture seule » non dépendant de la
  couleur seule.

### Mobile

- une seule colonne sous le header fixe et au-dessus de la bottom navigation ;
- messages empilés avec zones tactiles d'au moins 48 px ;
- formulaire conservant le clavier et le bouton d'envoi accessibles ;
- état de reconnexion visible mais discret ;
- conversation fermée présentée comme historique, sans champ d'envoi.

Les états loading, vide, erreur, reconnexion, absence d'autorisation et
lecture seule ont chacun un texte en français et une action possible lorsque
cela a un sens (`Réessayer`, revenir à la partie, se reconnecter).

## Tests attendus

### F07

- règles pures de statuts et d'idempotence d'absence ;
- autorisation joueur/MJ, membre quitté ou exclu, séance annulée ;
- transaction absence + notification interne ;
- échec Discord sans perte de l'événement local ;
- retries et réponses 429 Discord ;
- absence de secrets, mentions abusives et données personnelles inutiles ;
- routes 401/403/404/409/429 et origine stricte ;
- intégration PostgreSQL des contraintes, index et relations ;
- interface du bouton, confirmation, statut et erreur de notification.

### F07B

- validation de longueur, contenu vide et propriétés inconnues ;
- droits de lecture/écriture selon le roster et le statut de partie ;
- pagination, curseur, ordre chronologique et dédoublonnage ;
- SSE authentifié, reconnexion et rattrapage ;
- publication et consommation Redis Streams avec plusieurs instances API ;
- comportement lorsque Redis est indisponible ;
- rate limiting, CSRF/origine et absence de fuite d'existence ;
- tests composants desktop/mobile, clavier, focus, lecture seule et erreurs ;
- tests d'architecture confirmant que le navigateur n'importe pas la base.

## Points techniques à confirmer dans le plan

- choisir la taille exacte du message, avec 2 000 caractères comme valeur
  initiale recommandée pour rester lisible et aligné avec les limites Discord ;
- choisir la durée et la taille maximale de rétention Redis ;
- décider si la publication Redis reste best-effort avec rattrapage PostgreSQL
  ou si un outbox transactionnel est nécessaire dès F07B ;
- ajouter les variables d'environnement factices dans `.env.example` si elles
  sont requises par Docker Compose ;
- prévoir une vérification manuelle du flux SSE derrière Caddy et avec deux
  instances API avant d'ouvrir la PR F07B.
