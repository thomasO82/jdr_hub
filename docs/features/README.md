# Fiches de fonctionnalités

Ce dossier contient une fiche de traçabilité pour chaque fonctionnalité du projet. Une fiche est créée ou mise à jour avant l'ouverture de la Pull Request et décrit uniquement le travail réellement implémenté, ses preuves et ses limites.

## Nommage

Les fiches suivent le format :

```text
docs/features/NNN-nom-de-la-fonctionnalite.md
```

Exemples :

```text
docs/features/001-project-foundation.md
docs/features/002-discord-authentication.md
docs/features/003-game-creation.md
```

Le numéro est séquentiel. Le nom est court, descriptif, en minuscules, avec des traits d'union. Ne pas réutiliser un numéro. Une évolution importante doit créer une nouvelle fiche ou une section datée dans la fiche existante, sans réécriture silencieuse d'une fiche fusionnée.

## Règles de contenu

Chaque fiche doit distinguer clairement :

- ce qui était prévu, dans `Périmètre prévu` et `Dépendances` ;
- ce qui a réellement été réalisé, dans `Fonctionnalités effectivement réalisées` et les sections de preuves ;
- ce qui reste à faire, dans `Limites connues` et `Travaux reportés`.

Les commandes et résultats des tests, la preuve TDD Red, Green, Refactor, ainsi que les contrôles de sécurité sont obligatoires. Les secrets, données personnelles et valeurs sensibles ne doivent jamais apparaître dans ces documents. `docs/security/ai-access-policy.md` s'applique à ce dossier et à toutes ses fiches.

## Modèle d'une fiche

Copier le modèle suivant dans un nouveau fichier `docs/features/NNN-nom-de-la-fonctionnalite.md`, puis remplacer les valeurs entre crochets. Ne pas présenter comme réalisé un élément qui est seulement prévu.

```markdown
# [Titre de la fonctionnalité]

## Identifiant

[NNN ou identifiant documentaire]

## Statut

[PLANNED | IN_PROGRESS | BLOCKED | IN_REVIEW | MERGED]

> Le statut doit être `IN_REVIEW` au moment de l'ouverture de la Pull Request. `MERGED` ne peut être renseigné qu'après confirmation du propriétaire.

## Branche

[nom de la branche]

## Lien ou numéro de Pull Request

[lien GitHub ou numéro ; « Non créée » si aucune Pull Request n'existe]

## Dates de début et de fin

- Début : [AAAA-MM-JJ]
- Fin : [AAAA-MM-JJ ou « Non terminée »]

## Dépendances

### Prévues

- [dépendance prévue]

### Réalisées ou constatées

- [dépendance effectivement utilisée ou constatée]

### Restantes

- [dépendance non résolue, ou « Aucune »]

## Contexte

### Prévu

[contexte ayant motivé la fonctionnalité]

### Réalisé

[contexte effectivement couvert par l'implémentation]

### Restant à faire

[contexte non couvert, ou « Aucun »]

## Besoin utilisateur

### Prévu

[besoin utilisateur extrait de la spécification]

### Réalisé

[besoin effectivement satisfait]

### Restant à faire

[partie du besoin non satisfaite, ou « Aucun »]

## Périmètre prévu

- [élément prévu]

## Fonctionnalités effectivement réalisées

- [élément réellement implémenté et vérifié]

## Parcours utilisateur

### Prévu

[parcours attendu]

### Réalisé

[parcours effectivement disponible]

### Restant à faire

[étape non disponible, ou « Aucune »]

## Règles métier

### Prévues

- [règle métier applicable]

### Implémentées

- [règle métier effectivement appliquée]

### Non couvertes ou reportées

- [règle non implémentée, ou « Aucune »]

## Architecture et choix techniques

### Prévu

[architecture et choix envisagés]

### Réalisé

[architecture et choix effectivement utilisés, avec leur justification]

### Restant à faire

[évolution technique restante, ou « Aucun »]

## Modèle de données et migrations

### Prévu

[entités, relations, contraintes et migrations prévues]

### Réalisé

[modèle et migrations effectivement créés ou modifiés]

### Restant à faire

[migration ou évolution restante, ou « Aucun »]

## Routes API

### Prévues

- [méthode et route prévues]

### Implémentées

- [méthode, route, validation, autorisation et résultat effectivement disponibles]

### Restantes

- [route non implémentée, ou « Aucune »]

## Interface et composants

### Prévus

- [écran ou composant prévu]

### Réalisés

- [écran ou composant effectivement implémenté]

### Restants

- [écran ou composant non disponible, ou « Aucun »]

## Tests

### Prévus

- [tests unitaires, intégration, API, composants ou E2E prévus]

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `[commande]` | [succès ou échec, avec résumé] | [AAAA-MM-JJ] |

### Restants

- [test manquant ou non exécuté, ou « Aucun »]

## Preuve TDD Red, Green, Refactor

### Red

- Tests écrits avant l'implémentation : [oui/non, fichiers ou cas couverts]
- Commande exécutée : `[commande]`
- Échec initial et raison attendue : [résultat expurgé et explication]

### Green

- Implémentation minimale ajoutée : [description]
- Commande exécutée : `[commande]`
- Résultat : [tests nouvellement verts et non-régression]

### Refactor

- Refactorisations effectuées sans changement de comportement : [description ou « Aucune »]
- Commande exécutée : `[commande]`
- Résultat final : [résultat]

## Contrôles de sécurité

### Prévus

- [exigence de sécurité applicable]

### Réalisés

- [contrôle effectué]
- Utilisateurs non authentifiés ou non autorisés : [résultat]
- Accès aux ressources d'autrui : [résultat]
- Entrées invalides ou surdimensionnées : [résultat]
- Concurrence, idempotence ou CSRF si applicable : [résultat]

### Restants ou limites

- [contrôle restant ou limite, ou « Aucun »]

> Vérifier `docs/security/security-requirements.md` et appliquer `docs/security/ai-access-policy.md`. Ne jamais consigner de secret, de donnée personnelle réelle ou de valeur sensible.

## Documentation technique consultée

- [document et version ou date de consultation]

## Fichiers principaux

- `[chemin]` — [rôle]

## Limites connues

- [limite, erreur restante ou comportement incomplet]

## Travaux reportés

- [travail explicitement reporté et raison, ou « Aucun »]

## Vérification manuelle

### Prévue

[scénario manuel à vérifier]

### Réalisée

- [date, environnement et résultat]

### Restante

- [vérification non effectuée, ou « Aucune »]

## Commits importants

- `[sha ou message]` — [rôle]

## Décisions associées

- [lien vers `docs/decisions/` et résumé, ou « Aucune »]

## Évolutions datées

| Date | Évolution | Impact | Référence |
| --- | --- | --- | --- |
| [AAAA-MM-JJ] | [modification importante] | [impact sur le périmètre ou le statut] | [commit, décision ou Pull Request] |
```
