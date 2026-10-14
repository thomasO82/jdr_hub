# Conception — modification et remplacement des séances planifiées

## Contexte et objectif

La PR #34 expose la création de séances fixes, la création de propositions de
créneaux et la sélection d'un créneau par le MJ. Après sélection, le créneau
retenu devient une séance `SCHEDULED`, mais le MJ ne peut ni modifier son
horaire ni l'annuler depuis la gestion de partie. Les autres créneaux du même
envoi restent actuellement `OPEN`, et le modèle ne distingue pas les séries de
vote.

L'objectif approuvé est de donner au MJ un cycle de planification récupérable :
un vote retenu est figé ; la séance issue de ce vote peut être déplacée ou
annulée ; après annulation, le MJ peut démarrer un nouveau vote. Les anciens
créneaux et votes restent consultables comme historique.

## Comportement retenu

- Chaque envoi de créneaux crée une série de vote distincte. Les créneaux d'une
  série sont ses options ; il n'est pas possible d'ajouter des options à une
  série après qu'un créneau a été retenu.
- Une partie ne peut avoir qu'une série de vote `OPEN` à la fois. Le MJ peut
  créer une nouvelle série après la clôture d'une série précédente, y compris
  pour planifier une séance suivante d'une campagne.
- Le choix d'un créneau sélectionne cette option, ferme les autres options de
  la même série et crée une séance `SCHEDULED`.
- Depuis la gestion MJ, une séance `SCHEDULED` peut être modifiée directement
  (début et fin) ou annulée. La modification ne réécrit pas l'option votée ;
  elle porte sur la séance et conserve l'historique du vote.
- Une séance `COMPLETED` ou `CANCELLED` n'est ni modifiable ni annulable une
  seconde fois. Une annulation conserve le vote et la séance historique, puis
  permet de planifier une date fixe ou de lancer un nouveau vote.
- Les créneaux et résultats des séries précédentes restent visibles en lecture
  seule dans la gestion MJ. Les joueurs ne peuvent voter que dans une série
  `OPEN`.

## Modèle et transitions

Ajouter une entité persistée de série de vote liée à une partie, et relier
chaque `time_proposal` à sa série. La série porte son état (`OPEN`, `SELECTED`,
`CANCELLED`) et, si utile à l'intégrité du choix, l'identifiant de son option
retenue. Les votes restent liés aux options existantes ; ils ne sont ni
supprimés ni réinitialisés lors d'une annulation.

Transitions principales :

```text
Série OPEN
  ├─ retenir une option → série SELECTED, option retenue SELECTED,
  │                      autres options CLOSED, séance SCHEDULED

Séance SCHEDULED
  ├─ modifier l'horaire → SCHEDULED (même séance, mêmes votes historiques)
  └─ annuler → CANCELLED (nouveau vote/date possible)

Séance COMPLETED ou CANCELLED → aucune modification
```

La création de séance, la sélection/clôture de la série et l'annulation
associée doivent être transactionnelles. Une contrainte ou un verrouillage doit
empêcher deux séries ouvertes concurrentes pour une même partie et deux
sélections concurrentes d'une même série. La limite de trois séances
non-annulées d'un one-shot demeure appliquée au serveur ; une séance annulée ne
consomme plus cette limite.

## API et autorisations

- Chaque écriture exige une session authentifiée, l'origine applicative exacte,
  une validation Zod stricte et le MJ propriétaire vérifié côté API.
- Ajouter une commande API de modification d'horaire et une commande
  d'annulation de séance, ciblées par partie et séance afin de vérifier
  l'appartenance de ressource et prévenir les IDOR.
- Ajouter une lecture des séances d'une partie réservée au MJ propriétaire,
  incluant les séances planifiées et leur historique terminal, pour alimenter
  les actions de gestion sans dépendre du planning personnel paginé.
- La création de créneaux crée une nouvelle série, jamais des options dans une
  série retenue. Les endpoints de vote rejettent toute option dont la série
  n'est plus `OPEN`.
- Les statuts métier invalides répondent avec l'enveloppe d'erreur générique
  existante ; aucune donnée privée ou détail SQL n'est révélé.
- Les mutations MJ sont couvertes par des tests propriétaire/non-propriétaire,
  utilisateur non authentifié, mauvaise origine, partie/séance incohérente,
  état terminal et rejeu/concurrence.

## Interface

- La gestion des séances distingue les séries `OPEN`, `SELECTED` et `CANCELLED`
  au lieu de présenter une liste plate de propositions ouvertes.
- Chaque séance future `SCHEDULED` expose les actions « Modifier la date » et
  « Annuler la séance », avec une confirmation avant annulation.
- Les formulaires de modification réutilisent la validation existante des
  horaires (fin après début, durée de 15 minutes à 24 heures) et affichent les
  erreurs en français.
- Après annulation, l'action de planification permet une date fixe ou une
  nouvelle série de vote. La nouvelle série est séparée visuellement et
  techniquement des options historiques.
- L'état `COMPLETED` est affiché sans action de modification ou d'annulation.

## Critères d'acceptation

1. Après sélection d'un créneau, les joueurs ne peuvent plus voter sur cette
   série et ses options non retenues ne restent pas ouvertes.
2. Le MJ ne peut pas ajouter des options à une série déjà retenue ; une
   nouvelle série possède un nouvel identifiant et ne modifie pas les votes
   historiques.
3. Le MJ propriétaire peut changer début et fin d'une séance `SCHEDULED` ; la
   mise à jour apparaît dans le planning des participants.
4. Le MJ propriétaire peut annuler une séance `SCHEDULED` ; elle disparaît des
   plannings actifs, reste en historique, et une nouvelle date ou série de vote
   peut être créée.
5. Les séances terminées ou déjà annulées ne peuvent pas être modifiées ou
   annulées à nouveau.
6. Les non-MJ, non-membres et sessions non authentifiées ne peuvent ni modifier
   ni annuler une séance ; les réponses ne révèlent pas les ressources d'autrui.
7. La limite one-shot compte les séances non annulées, conserve son maximum de
   trois, et une annulation ne permet pas de contourner les autres règles
   serveur.
8. Les votes historiques et les options retenues restent lisibles au MJ après
   modification ou annulation de la séance.

## Hors périmètre

- Réécrire ou supprimer les votes déjà émis.
- Modifier une séance terminée ou recalculer l'XP après sa validation.
- Permettre à un joueur de modifier le vote d'un autre joueur.
- Ajouter des notifications externes ou un historique d'audit séparé.

## Validation humaine

Le propriétaire a approuvé en conversation le comportement fonctionnel et a
demandé que l'évolution soit ajoutée à la PR #34. Cette conception doit être
relue avant la rédaction du plan d'implémentation.
