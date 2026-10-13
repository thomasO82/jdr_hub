# Décision 004 — Identifiant UUID pour les routes de participation

## Date

2026-09-06

## Statut

Acceptée par le propriétaire du projet.

## Contexte

Les pages publiques utilisent un slug pour être lisibles et indexables. Les
opérations métier de participation ciblent toutefois une ligne `games` dont
la clé primaire est un UUID. La tentative de traiter un slug comme un UUID
provoquait une erreur de conversion PostgreSQL masquée en conflit `409`.

## Décision

Les routes de candidature utilisent exclusivement l’UUID de la partie dans
leur paramètre `:id`. Les projections publiques exposent cet UUID en plus du
slug nécessaire aux URLs publiques. Le frontend conserve le slug pour la
navigation, mais transmet `game.id` aux opérations de candidature.

## Conséquences

- Les candidatures ne déclenchent plus de requête UUID avec une valeur de slug.
- Une valeur non-UUID ne résout aucune partie dans le repository de
  candidature.
- Les slugs restent utilisés pour les pages publiques et le SEO.
- Les UUID restent les identifiants publics prévus par le cahier des charges.

## Alternatives écartées

- **Conserver la résolution UUID ou slug :** rejeté pour éviter deux contrats
  d’identification et les conversions implicites PostgreSQL.
- **Remplacer les UUID par des entiers auto-incrémentés :** rejeté car cette
  correction ne nécessite pas de migration globale et les UUID sont déjà le
  choix d’identifiants publics du projet.
