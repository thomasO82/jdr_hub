# Messages d’erreur frontend — Spécification

## Objectif

Rendre les erreurs compréhensibles dans toute l’application sans exposer les
exceptions, les détails internes, les secrets ou modifier les contrats HTTP de
l’API.

## Décision

Le frontend utilise un traducteur centralisé. Il reçoit le statut HTTP, le code
d’erreur public éventuellement présent dans l’enveloppe JSON et, si nécessaire,
un contexte d’action (`create-game`, `load-games`, `authenticate`). Il retourne
un message français sûr et une indication d’action.

Les composants affichent uniquement ce résultat. Ils ne lisent jamais le texte
brut d’une exception, d’une réponse serveur ou d’un objet `Error`.

## Contrat conservé

Les routes, statuts, codes et messages de l’API restent inchangés. Le
`requestId` reste disponible dans les logs et les outils de diagnostic, mais ne
doit pas être présenté comme détail technique obligatoire à l’utilisateur.

## Règles de traduction

- `400` : demander de vérifier les champs ou les filtres.
- `401` : demander de se connecter ou de renouveler la session.
- `403` : indiquer que l’action n’est pas autorisée.
- `404` : indiquer que la ressource n’existe plus ou est indisponible.
- `409` : expliquer le conflit attendu dans le contexte, par exemple un titre
  déjà utilisé ou des tags indisponibles.
- `413` : indiquer que la demande est trop volumineuse.
- erreur réseau ou statut inconnu : message générique et réessayable.

Les messages ne révèlent pas si une ressource privée existe, ne recopient pas
les entrées utilisateur et ne contiennent aucun secret.

## Intégration

Un utilitaire frontend partagé est utilisé par les formulaires et les pages
avec états d’erreur. La création de partie l’utilise en premier, puis les
écrans de connexion, catalogue et détail réutilisent la même fonction au fur
et à mesure qu’ils deviennent interactifs.

## Tests

Les tests unitaires couvrent chaque statut, les codes connus, les erreurs
inconnues et l’absence de réponse. Les tests de pages vérifient qu’un message
humain est rendu et qu’aucun texte d’exception brut n’est affiché.
