# F06 — Séances, créneaux, votes et planning

## Statut de la conception

Conception validée pour implémentation sur `feat/sessions-scheduling`.

## Objectif

Permettre à un MJ de planifier une séance fixe ou de proposer plusieurs
créneaux, aux membres actifs de voter, puis au MJ de choisir le créneau retenu.
La séance planifiée apparaît dans le planning personnel de chaque membre, avec
les heures converties dans son fuseau horaire.

## Périmètre

Inclus :

- création d'une séance fixe par le MJ ;
- création de propositions de créneaux pour une partie ;
- vote Oui, Peut-être ou Non, avec l'état Sans réponse implicite ;
- clôture d'un sondage et choix explicite d'un créneau par le MJ ;
- création idempotente de la séance retenue ;
- lecture du planning des séances auxquelles l'utilisateur appartient ;
- calendrier mensuel desktop et agenda mobile ;
- tests unitaires, API, intégration PostgreSQL et composants.

Exclus :

- notifications Discord et déclaration d'absence (F07) ;
- sélection automatique d'un créneau ;
- synchronisation avec un calendrier externe ;
- modification du schéma ou des routes existantes.

## Règles métier

- Une séance possède `startsAt`, `endsAt` en UTC et un statut
  `PROPOSED`, `SCHEDULED`, `COMPLETED` ou `CANCELLED`.
- Un one-shot accepte au maximum trois séances ; une campagne n'a pas de
  limite mais n'accepte plus de séance lorsque la partie est `CLOSED` ou
  `COMPLETED`.
- Une proposition appartient à une partie et possède un statut `OPEN`,
  `CLOSED` ou `SELECTED`.
- Un membre actif ne possède qu'un vote par proposition. Une seconde écriture
  est refusée avant comme après la clôture ; toute écriture après clôture est
  refusée.
- Le MJ propriétaire est le seul à créer une séance, créer des propositions,
  clôturer un sondage et sélectionner un créneau.
- Les membres actifs peuvent voter et consulter les propositions ; les autres
  utilisateurs reçoivent une erreur générique d'autorisation.
- Les dates doivent être valides, en ordre, dans une durée bornée et dans une
  fenêtre de recherche bornée. La base stocke les instants en UTC.
- La fermeture et la sélection s'effectuent dans une transaction verrouillée.
  La séance retenue est créée une seule fois pour une proposition sélectionnée.

## Contrats API

Les handlers renvoient le format de réponse commun existant. Les erreurs
publiques utilisent `SCHEDULING_ERROR` et restent génériques.

- `POST /games/:id/proposals` : MJ, crée une ou plusieurs propositions ;
- `GET /games/:id/proposals` : membre actif, lit le sondage et les compteurs ;
- `POST /proposals/:id/votes` : membre actif, écrit son vote avant clôture ;
- `POST /games/:id/sessions` : MJ, crée une séance fixe ou sélectionne une
  proposition ;
- `GET /planning` : utilisateur authentifié, renvoie ses séances dans une
  plage de dates bornée.

Les mutations exigent l'origine autorisée, comme les autres mutations
authentifiées. Aucun identifiant d'utilisateur n'est fourni pour déterminer le
propriétaire ou les participants : ces informations viennent de la session et
de la base.

## Architecture

Le module `apps/api/src/modules/scheduling` contient `routes.ts`, `handlers.ts`,
`repository.ts`, `policy.ts` et des services distincts :
`create-proposals`, `list-proposals`, `cast-vote`, `create-session`,
`select-proposal` et `get-planning`. Aucun service ne dépend de Hono et seul le
repository utilise `packages/database`.

Les contrats et fonctions pures de validation résident dans
`packages/shared/src/scheduling.ts`. Les tables Drizzle résident dans
`packages/database/src/schema/scheduling.ts` et sont ajoutées par une migration
additive.

## Interface

- `/planning` réutilise `AppShell` ; desktop : calendrier mensuel à sept
  colonnes, navigation mois/semaine/jour, prochaine séance et légende ;
- mobile : navigation compacte des jours, cartes de séances avec heure et MJ,
  section des propositions en attente et bouton d'action flottant ;
- l'écran de vote affiche une matrice desktop et des cartes mobile, les trois
  choix de vote, la progression et les compteurs ;
- toutes les interactions ont un libellé accessible, un focus visible et des
  états loading, vide et erreur ; le style est uniquement Tailwind et utilise
  les icônes Lucide déjà présentes.

## Sécurité et tests

Les tests couvrent les accès sans session, les non-membres, les membres exclus,
le contrôle MJ, l'origine, les dates trop longues, le double vote, le vote après
clôture, la concurrence clôture/sélection, l'idempotence et les conversions
UTC/fuseau avec changement d'heure. Les requêtes sont paramétrées et les logs
ne contiennent ni token ni donnée personnelle inutile.
