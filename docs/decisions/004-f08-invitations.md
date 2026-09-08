# Décision 004 — Intégrer les invitations à F08

## Date

2026-09-06

## Statut

Acceptée par le propriétaire du projet.

## Contexte

Le périmètre validé de F08 comprend le dashboard et la gestion MJ des
candidatures, du roster, des séances et des invitations. Le dépôt fournit déjà
les candidatures et les membres, mais ne contient pas encore de contrat, de
table ou de module applicatif pour les invitations.

## Décision

F08 ajoute le module invitations complet dans la même PR :

- contrats partagés et validation stricte ;
- table PostgreSQL et migration additive ;
- invitation par un MJ propriétaire vers un utilisateur ;
- consultation des invitations émises et reçues ;
- acceptation ou refus par l'invité ;
- annulation par le MJ propriétaire ;
- expiration serveur après sept jours ;
- acceptation transactionnelle avec contrôle de capacité et ajout au roster.

Les statuts retenus sont `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` et
`EXPIRED`. Une seule invitation active est autorisée pour un couple partie /
invité. Les règles d'autorisation et de capacité sont appliquées par l'API et
la base, jamais par l'interface seule.

## Conséquences

- F08 contient une migration supplémentaire, sans suppression ni modification
  destructive de données existantes ;
- les agrégats dashboard pourront afficher les invitations en attente ;
- une intégration Discord n'est pas ajoutée pour les invitations dans cette
  fonctionnalité ;
- les invitations réutilisent `game_members` à l'acceptation et ne créent pas
  un second modèle de roster ;
- les tests PostgreSQL couvrent la contrainte active, l'expiration, la
  concurrence de capacité et l'idempotence des décisions.

## Alternatives écartées

- reporter les invitations à une PR séparée : incohérent avec le parcours de
  gestion MJ validé et le dashboard qui doit exposer les actions prioritaires ;
- stocker les invitations dans une colonne JSON de `games` : empêche les
  contraintes relationnelles, les requêtes par invité et l'autorisation fine ;
- laisser le frontend calculer l'expiration ou la capacité : contournable et
  incompatible avec les exigences de sécurité.
