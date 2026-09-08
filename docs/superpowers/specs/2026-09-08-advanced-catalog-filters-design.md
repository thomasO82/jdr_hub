# Filtres avancés du catalogue — Design

Date : 2026-09-08  
Statut : approuvé en conversation, à relire avant implémentation

## Objectif

Rendre fonctionnels tous les filtres affichés ou prévus par le catalogue public `/parties`, avec un traitement serveur, des paramètres partageables dans l’URL et une validation identique entre le frontend, le contrat partagé et l’API.

Le périmètre comprend la recherche par nom, le MJ, les tags, le type, le format, le système/jeu, la date d’une séance et le nombre minimal de places disponibles. Le filtre de niveau est explicitement exclu, car aucune règle métier de niveau de partie n’est définie.

## Règles fonctionnelles

- Les filtres sont combinés avec une logique `AND`.
- Les tags sont également combinés avec une logique `AND`.
- Le type est `ONE_SHOT` ou `CAMPAIGN` et reste le champ métier de la partie ; il n’est pas copié dans les tags.
- Le format est un nouveau champ métier `ONLINE` ou `TABLE` de la partie.
- Le système est filtré par égalité insensible à la casse après normalisation de l’entrée.
- La date filtre les séances futures dont le statut est `SCHEDULED` :
  - `dateFrom` inclut les séances à partir du début du jour indiqué ;
  - `dateTo` inclut les séances jusqu’à la fin du jour indiqué ;
  - une partie correspond si elle possède au moins une séance dans l’intervalle.
- Les places disponibles sont `maxPlayers - membres ayant le statut ACTIVE`. Le filtre `minAvailablePlaces` conserve les parties ayant au moins ce nombre de places libres.
- Une partie publique reste éligible uniquement si sa visibilité est `PUBLIC` et son statut est `OPEN` ou `ACTIVE`.
- Les paramètres filtrants sont conservés dans l’URL de `/parties` ; une URL copiée reproduit le même résultat.
- Le niveau n’est ni affiché comme contrôle actif ni accepté par l’API.

## Contrat partagé et URL

`publicGamesQuerySchema` reçoit les champs suivants, avec des limites strictes :

```ts
{
  q?: string
  gmId?: string
  gmName?: string
  tagSlugs?: string[]
  type?: 'ONE_SHOT' | 'CAMPAIGN'
  format?: 'ONLINE' | 'TABLE'
  system?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  minAvailablePlaces?: number
  page?: number
  pageSize?: number
}
```

Les dates sont validées comme dates calendaires ISO et `dateTo` ne peut pas précéder `dateFrom`. Le nombre de places demandé est borné par la capacité maximale métier. Les propriétés inconnues sont rejetées.

Le modèle public expose `format`, `availablePlaces` et `nextSessionStartsAt` afin que les cartes décrivent les résultats filtrés sans requête supplémentaire côté navigateur.

## Persistance et requête

- Ajouter `format` à la table `games`, avec une valeur par défaut de migration compatible avec les parties existantes (`ONLINE`). Les contrats de création et de modification deviennent explicites sur ce champ.
- Ajouter un index adapté sur `games.format` en complément des index catalogue existants.
- Utiliser `game_sessions` pour la présence d’une séance future `SCHEDULED` dans l’intervalle et pour calculer la prochaine séance publique.
- Utiliser `game_members` pour compter les membres `ACTIVE` par partie et calculer les places disponibles.
- Implémenter ces règles dans le repository PostgreSQL avec des requêtes paramétrées et des sous-requêtes/agrégations contrôlées ; ne pas filtrer après pagination en mémoire.
- Adapter les repositories mémoire utilisés par les tests pour appliquer les mêmes règles observables.

## Interface

Le formulaire SSR de `/parties` transmet exactement les clés du contrat :

- les radios existantes deviennent `type` et `format` ;
- un sélecteur de système utilise les systèmes publics disponibles ;
- deux champs date `dateFrom` et `dateTo` permettent une période ;
- un champ numérique `minAvailablePlaces` filtre les places libres ;
- les valeurs sélectionnées sont restaurées depuis `searchParams` ;
- la réinitialisation supprime tous les filtres ;
- le libellé explique que les filtres sont cumulatifs.

Les cartes affichent le format réel, la prochaine séance lorsqu’elle existe et les places disponibles. Les états vide, erreur, clavier, responsive et lecteur d’écran restent accessibles.

## API et sécurité

- L’endpoint public conserve uniquement la projection publique existante et les nouveaux champs nécessaires au catalogue.
- Les champs privés, membres détaillés, propositions de créneaux et données personnelles ne sont jamais exposés.
- Zod rejette les formats de date, nombres, énumérations, longueurs et tableaux hors limites.
- Les requêtes SQL restent paramétrées ; les systèmes et tags ne sont jamais interpolés directement.
- Les paramètres de pagination et de filtre sont plafonnés pour prévenir les charges excessives.
- Les combinaisons de filtres ne changent pas la politique SEO : la page catalogue filtrée reste non éditoriale/noindex selon les règles existantes.

## Tests

Le cycle TDD couvre :

1. le contrat partagé et les bornes de validation ;
2. la sérialisation complète de l’URL frontend ;
3. le rendu/restauration des contrôles du formulaire ;
4. les routes API pour chaque filtre et les combinaisons `AND` ;
5. le repository PostgreSQL pour dates, places disponibles, type, format et système ;
6. la projection publique et l’absence de données privées ;
7. la non-régression du catalogue, de la pagination, du sitemap et des collections publiques.

## Hors périmètre

- filtre de niveau de personnage ou de joueur ;
- recherche par disponibilité personnelle ;
- tri libre du catalogue ;
- modification de la politique de visibilité ou des règles de pagination ;
- calendrier externe ou réservation de place.

