# Décision 005 — La messagerie applicative remplace les DMs Discord

## Date

2026-09-06

## Statut

Acceptée par le propriétaire du projet.

## Contexte

JDR Hub utilise Discord OAuth2 pour identifier les utilisateurs. La livraison
des absences par DM Discord obligerait toutefois les membres à partager un
serveur avec le bot et à autoriser les messages privés. Le propriétaire ne
souhaite pas imposer l'installation du bot aux utilisateurs.

## Décision

- Discord reste utilisé uniquement pour la connexion OAuth2 ;
- `DISCORD_BOT_TOKEN`, l'envoi de DM et le worker de livraison Discord sont
  retirés de l'exécution de l'application ;
- les notifications d'absence restent persistées et consultables dans JDR Hub ;
- une conversation textuelle de groupe est ajoutée à chaque partie ;
- seuls le MJ propriétaire et les membres actifs peuvent lire ou écrire tant
  que la partie est ouverte ou active ;
- une partie fermée ou terminée reste consultable en lecture seule par ces
  utilisateurs tant que leur appartenance applicative est active ;
- un départ ou une exclusion révoque immédiatement l'accès à la conversation ;
- quitter un serveur ou un salon Discord n'a aucun effet dans JDR Hub ;
- PostgreSQL est la source de vérité ; REST charge et crée les messages ; SSE
  diffuse les nouveaux messages ; Redis Streams relaie les événements entre
  instances API ;
- les messages privés, pièces jointes, réactions, édition, suppression,
  mentions et chat général restent hors périmètre.

La table historique `notification_deliveries` n'est pas supprimée par cette
évolution afin d'éviter une migration destructive. Elle ne reçoit plus de
nouvelles livraisons Discord et fera l'objet d'une décision de rétention
distincte si nécessaire.

## Conséquences

- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` et le flux OAuth restent
  nécessaires ; `DISCORD_BOT_TOKEN` ne l'est plus ;
- la configuration Docker n'a plus de secret Bot obligatoire ;
- un nouveau modèle `game_messages` et une migration additive sont nécessaires ;
- Redis est un relais d'événements et non une base durable ; une reconnexion
  relit les messages depuis PostgreSQL ;
- chaque lecture et écriture vérifie l'appartenance et le statut de la partie
  côté API ; le frontend ne constitue pas une autorité ;
- les messages étant des données personnelles, leur contenu est borné,
  échappé à l'affichage, non journalisé et soumis au rate limiting ;
- la documentation F07 est mise à jour pour retirer la livraison Discord et une
  fiche F07B dédiée trace le chat applicatif.

## Alternatives écartées

- **Conserver les DMs Discord en option :** maintient une dépendance et une
  expérience différente selon les utilisateurs ; rejeté pour ce besoin.
- **REST avec rafraîchissement périodique :** plus simple, mais moins adapté à
  une conversation et contraire au choix SSE déjà validé.
- **WebSocket :** permettrait une communication bidirectionnelle inutile ici ;
  l'envoi passe par REST et la diffusion par SSE.
- **Redis Pub/Sub seul :** les événements émis pendant une déconnexion sont
  perdus ; Redis Streams permet une reprise bornée.
- **Synchroniser un salon Discord :** recrée le couplage serveur/bot et expose
  les échanges hors du contrôle de JDR Hub.
