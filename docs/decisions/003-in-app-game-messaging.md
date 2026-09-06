# Décision 003 — Messagerie textuelle par partie dans le MVP

## Date

2026-09-06

## Statut

Acceptée par le propriétaire du projet.

## Contexte

Le MVP doit permettre de coordonner des parties sur table. Les notifications
Discord sont utiles, mais elles ne garantissent pas que tous les échanges
restent accessibles dans l'application. Le cahier des charges excluait
initialement le chat complet ; le propriétaire a explicitement demandé une
messagerie applicative dans le MVP.

## Décision

JDR Hub ajoute une conversation textuelle de groupe par partie :

- elle est réservée au MJ et aux membres actifs ;
- le départ ou l'exclusion d'une partie retire immédiatement l'accès ;
- une partie fermée ou terminée reste consultable en lecture seule ;
- le départ d'un salon Discord n'a aucun effet dans JDR Hub ;
- les messages privés entre utilisateurs restent hors périmètre ;
- les pièces jointes, réactions, édition, suppression, appels et chat général
  sont reportés ;
- SSE assure la diffusion navigateur et Redis Streams relaie les événements
  entre instances API ;
- PostgreSQL conserve l'historique durable et reste la source de vérité.

La messagerie sera livrée dans une fonctionnalité distincte
`feat/game-messaging`, après le socle F07 de présences et notifications.

## Conséquences

- le design system doit prévoir une vue de conversation responsive et un état
  lecture seule ;
- le modèle de données doit protéger les messages par autorisation de
  ressource et non par une simple visibilité frontend ;
- Docker Compose accueillera Redis sans exposer son port publiquement ;
- une stratégie de reprise est nécessaire, car le temps réel ne doit pas
  devenir la source de vérité ;
- le registre des fonctionnalités et le plan d'implémentation devront
  distinguer F07 et F07B ;
- la documentation de sécurité devra couvrir les messages, la limitation de
  taille, le rate limiting, le XSS et la révocation d'accès après départ.

## Alternatives écartées

- **REST avec rafraîchissement périodique uniquement :** plus simple mais ne
  respecte pas le choix de temps réel retenu pour l'expérience de messagerie.
- **WebSocket :** capable de communication bidirectionnelle, mais inutile
  pour un envoi REST et une diffusion serveur ; SSE réduit la surface et
  s'intègre à la réponse HTTP Hono.
- **Redis Pub/Sub seul :** les événements envoyés pendant une déconnexion sont
  perdus ; Streams permet une reprise bornée.
- **Synchronisation avec un salon Discord :** rejetée pour éviter de coupler
  le roster applicatif à un événement externe et de créer un canal de chat
  hors contrôle de JDR Hub.

