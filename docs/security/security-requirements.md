# JDR Hub — Exigences de sécurité

Ce document définit les exigences minimales de sécurité de JDR Hub. Il complète le cahier des charges et `AGENTS.md`.

Référentiel cible : OWASP ASVS 5.0, niveau 2 lorsque pertinent pour une application communautaire manipulant des comptes et des données personnelles.

## Règles générales

- La sécurité fait partie des critères d'acceptation de chaque fonctionnalité.
- Toute règle de sécurité doit être testée selon l'approche TDD du projet.
- Les contrôles d'autorisation sont appliqués côté API, jamais uniquement dans l'interface.
- Toute donnée provenant du navigateur ou d'un service externe est considérée comme non fiable.
- Une Pull Request ne peut pas être fusionnée si elle introduit une vulnérabilité connue critique ou élevée.
- Une mesure de sécurité ne doit pas être désactivée pour accélérer le développement.

## Authentification Discord OAuth2

- Utiliser le flux OAuth2 officiel de Discord.
- Générer un paramètre `state` aléatoire, imprévisible, lié à la tentative de connexion et à durée de vie courte.
- Vérifier `state` avec une comparaison sûre lors du callback.
- Utiliser PKCE lorsque le flux et la bibliothèque choisis le permettent.
- Déclarer une liste stricte d'URI de redirection ; aucune redirection dynamique arbitraire.
- Protéger les redirections post-connexion contre les open redirects.
- Ne jamais utiliser directement le token Discord comme session applicative.
- Ne jamais exposer le client secret ou les tokens Discord au navigateur.
- Demander uniquement les scopes Discord nécessaires.
- Chiffrer les tokens persistés lorsqu'ils sont indispensables ; éviter leur conservation sinon.
- Gérer l'expiration, la révocation et les erreurs d'échange de tokens.
- Limiter le débit des routes de démarrage et de callback OAuth.
- Journaliser les succès et échecs sans enregistrer de token, code OAuth ou secret.
- Tester le login CSRF, le rejeu du callback, le `state` invalide et l'URI de redirection refusée.

## Sessions applicatives

- Utiliser un identifiant de session aléatoire avec une entropie suffisante.
- Stocker côté serveur uniquement l'empreinte du token de session si le modèle le permet.
- Utiliser des cookies `HttpOnly`, `Secure` en production et `SameSite` adapté.
- Restreindre le chemin et le domaine du cookie au strict nécessaire.
- Régénérer la session après authentification et changement de privilège.
- Invalider la session côté serveur lors de la déconnexion.
- Définir une expiration après inactivité et une expiration absolue.
- Prévoir la révocation de toutes les sessions d'un utilisateur.
- Ne jamais placer l'identifiant de session dans une URL ou dans les logs.
- Tester la fixation de session, l'expiration, la déconnexion et la révocation.

## Protection CSRF

- Protéger toutes les routes authentifiées qui modifient l'état.
- Vérifier l'en-tête `Origin` lorsque pertinent.
- Utiliser un token CSRF si `SameSite` et la vérification d'origine ne suffisent pas au modèle retenu.
- Ne pas considérer la méthode POST comme une protection suffisante.
- Ne jamais modifier de données via une requête GET.
- Tester les requêtes sans token, avec token invalide et depuis une origine non autorisée.

## Autorisations et contrôle d'accès

- Définir et maintenir une matrice d'autorisations dans `docs/security/authorization-matrix.md`.
- Appliquer un refus par défaut.
- Vérifier l'autorisation pour chaque ressource chargée par identifiant.
- Vérifier l'appartenance à la partie avant l'accès aux données privées.
- Vérifier que seul le MJ propriétaire peut administrer sa partie.
- Séparer explicitement les données publiques, membres, MJ et administration.
- Ne jamais accepter depuis le client des champs sensibles comme `ownerId`, `role`, `xp`, `level` ou un statut protégé.
- Protéger contre les IDOR et le mass assignment.
- Tester l'accès horizontal entre deux utilisateurs et deux parties différentes.
- Tester l'élévation verticale de privilèges.
- Journaliser les refus d'accès importants sans exposer de données sensibles.

## Matrice minimale à définir

La matrice doit couvrir au moins les acteurs suivants :

- visiteur ;
- utilisateur connecté ;
- candidat ;
- membre d'une partie ;
- MJ propriétaire ;
- administrateur.

Elle doit couvrir au moins : lecture publique, candidature, invitation, roster, créneaux, votes, séances, absences, validation, XP, modification et fermeture.

## Validation des entrées

- Valider toutes les entrées API avec Zod.
- Refuser les propriétés inconnues sur les commandes sensibles.
- Définir une taille maximale pour chaque chaîne, tableau et requête.
- Utiliser des enums ou listes blanches pour les valeurs fermées.
- Valider les dates, fuseaux horaires, durées et relations temporelles.
- Normaliser les slugs et garantir leur unicité.
- Limiter le nombre de tags, créneaux, disponibilités et invitations.
- Normaliser les pseudos et détecter les caractères Unicode trompeurs lorsque pertinent.
- Valider séparément les paramètres de filtre, pagination et tri.
- Ne jamais retourner les champs privés simplement parce qu'ils existent dans le modèle Drizzle.

## Injections SQL et requêtes

- Utiliser les requêtes paramétrées de Drizzle.
- Interdire la construction de SQL par concaténation de données utilisateur.
- Réviser explicitement tout usage de SQL brut.
- Utiliser une liste blanche pour les colonnes de tri.
- Limiter la taille des recherches et la pagination maximale.
- Indexer les recherches coûteuses nécessaires au MVP.
- Tester les recherches, filtres, slugs et paramètres de tri avec des charges d'injection.

## XSS et affichage du contenu utilisateur

- Conserver l'échappement React par défaut.
- Éviter `dangerouslySetInnerHTML`.
- Tout usage de HTML ou Markdown utilisateur doit passer par une sanitisation reconnue avec liste blanche.
- Valider les protocoles des liens et refuser `javascript:` et équivalents dangereux.
- Valider les URL d'images et ressources externes.
- Limiter la longueur des descriptions et messages.
- Tester les champs affichés avec des charges XSS stockées et réfléchies.
- Définir une Content Security Policy restrictive et compatible avec l'application.

## Headers HTTP et transport

- Forcer HTTPS en production.
- Rediriger HTTP vers HTTPS.
- Activer HSTS après validation complète du domaine HTTPS.
- Définir une Content Security Policy.
- Définir `X-Content-Type-Options: nosniff`.
- Utiliser CSP `frame-ancestors` pour empêcher le clickjacking.
- Définir une `Referrer-Policy` restrictive.
- Définir une `Permissions-Policy` adaptée.
- Supprimer les headers révélant inutilement les technologies.
- Limiter CORS aux origines nécessaires.
- Ne jamais combiner une origine CORS `*` avec des credentials.
- Tester les headers sur Next.js et Hono.

## Règles métier et concurrence

- Empêcher les candidatures multiples avec validation et contrainte DB.
- Empêcher les votes multiples avec validation et contrainte DB.
- Empêcher une quatrième séance pour un one-shot.
- Empêcher la création de séance après fermeture de la partie.
- Empêcher les votes après fermeture du sondage.
- Empêcher les membres exclus de voter ou d'accéder aux données privées.
- Utiliser une transaction pour accepter une candidature et réserver une place.
- Empêcher deux acceptations concurrentes de dépasser `maxPlayers`.
- Rendre la validation de séance et l'attribution d'XP idempotentes.
- Empêcher une double attribution d'XP par contrainte DB.
- Définir explicitement les transitions de statut autorisées.
- Journaliser les actions sensibles du MJ.
- Tester les courses concurrentes et les rejeux de requêtes.

## Rate limiting et prévention des abus

- Définir des limites adaptées par route et non une seule limite globale.
- Limiter les tentatives OAuth, recherches, créations de parties, candidatures, invitations, votes et notifications Discord.
- Limiter la taille du corps HTTP.
- Limiter la pagination maximale.
- Prévenir le scraping massif des profils et disponibilités.
- Prévoir le signalement d'une partie ou d'un utilisateur avant l'ouverture publique.
- Prévoir la suspension et le bannissement administratif.
- Ne pas exposer publiquement les disponibilités précises sans choix explicite de l'utilisateur.
- Ajouter une protection contre `@everyone`, `@here` et les mentions abusives dans Discord.

## Intégration Discord et notifications

- Donner au bot Discord les permissions minimales.
- Conserver les secrets du bot dans un gestionnaire de secrets ou des variables sécurisées.
- Prévoir la rotation des secrets.
- Ne jamais mettre de donnée confidentielle dans les messages Discord.
- Échapper et limiter le contenu utilisateur envoyé au bot.
- Utiliser une file d'attente pour les notifications asynchrones lorsque nécessaire.
- Limiter les nouvelles tentatives et prévoir une dead-letter queue si une file est introduite.
- Utiliser une clé d'idempotence afin d'éviter les messages en double.
- Gérer les indisponibilités et limitations de débit de Discord.

## PostgreSQL

- Utiliser un compte applicatif sans privilège administrateur.
- Ne pas exposer PostgreSQL publiquement.
- Isoler PostgreSQL sur un réseau interne Docker.
- Utiliser TLS pour la connexion en production lorsque la base est distante.
- Utiliser des contraintes `UNIQUE`, clés étrangères et transactions pour garantir les invariants.
- Séparer les bases et identifiants de développement, test et production.
- Sauvegarder automatiquement la production.
- Chiffrer et protéger les sauvegardes.
- Tester réellement la restauration.
- Documenter la procédure de migration et de rollback.
- Examiner les migrations destructives avant exécution.

## Docker et infrastructure

- Exécuter les conteneurs applicatifs avec un utilisateur non-root.
- Utiliser des images minimales et des versions épinglées.
- Utiliser des builds multi-stage.
- Ne stocker aucun secret dans les Dockerfiles, images ou fichiers Compose versionnés.
- Ajouter `.dockerignore`.
- N'exposer que les ports nécessaires.
- Ajouter des healthchecks.
- Utiliser un système de fichiers en lecture seule lorsque possible.
- Supprimer les capacités Linux inutiles.
- Limiter CPU et mémoire selon l'environnement.
- Scanner les images avant production.
- Ne jamais monter le socket Docker dans un conteneur applicatif.

## Gestion des erreurs

- Centraliser les erreurs dans Hono.
- Utiliser un format d'erreur stable avec un `requestId`.
- Ne jamais retourner de stack trace en production.
- Ne jamais exposer une requête SQL, un chemin interne, un cookie, un token ou un secret.
- Fournir un message public sobre et conserver le détail uniquement dans les logs sécurisés.
- Prévoir des pages d'erreur Next.js.
- Tester les principales réponses d'erreur.

## Logs, audit et monitoring

- Produire des logs structurés JSON en production.
- Utiliser un identifiant de requête corrélé entre Next.js, Hono et les traitements asynchrones.
- Journaliser les authentifications, refus importants, actions MJ, modifications de statut et événements XP.
- Ne jamais journaliser les tokens, cookies, secrets ou données personnelles inutiles.
- Neutraliser les caractères permettant l'injection de fausses lignes de logs.
- Restreindre l'accès aux logs.
- Définir une durée de conservation.
- Mettre en place des alertes sur les erreurs, refus anormaux, indisponibilités et saturation.
- Monitorer Next.js, Hono, PostgreSQL, les tâches asynchrones et Discord.

## Dépendances, Git et CI/CD

- Protéger la branche `main`.
- Interdire le push direct sur `main`.
- Exiger une Pull Request et une revue humaine.
- Exiger le passage des tests, du lint, de TypeScript et des builds avant fusion.
- Ajouter un audit des dépendances pnpm.
- Utiliser Dependabot ou Renovate.
- Scanner les secrets dans la CI.
- Ajouter une analyse statique de sécurité.
- Scanner les images Docker.
- Utiliser des permissions minimales pour `GITHUB_TOKEN`.
- Épingler les actions GitHub à des versions fiables, idéalement par SHA pour les workflows sensibles.
- Protéger l'environnement de production et ses secrets.
- Maintenir un inventaire des dépendances ou SBOM avant production.

## Données personnelles et RGPD

- Collecter uniquement les données Discord nécessaires.
- Documenter la finalité de chaque donnée.
- Définir les données publiques, privées et réservées aux membres.
- Masquer les disponibilités précises par défaut.
- Ne jamais publier une adresse physique exacte pour une partie présentielle.
- Prévoir l'export des données utilisateur.
- Prévoir la suppression du compte.
- Définir l'anonymisation des historiques devant être conservés.
- Définir les durées de conservation.
- Fournir une politique de confidentialité.
- Recueillir le consentement uniquement lorsqu'il est juridiquement nécessaire et conserver sa preuve.
- Prévoir une procédure de gestion des incidents et violations de données.

## Sauvegardes et continuité

- Définir une fréquence de sauvegarde.
- Définir une durée de conservation.
- Chiffrer les sauvegardes.
- Restreindre leur accès.
- Tester régulièrement leur restauration.
- Définir des objectifs RPO et RTO avant la production.
- Documenter la procédure de reprise.
- Monitorer l'espace disque et la validité des sauvegardes.

## Futurs uploads et RAG

Ces éléments sont hors MVP, mais devront respecter :

- taille maximale des fichiers ;
- contrôle du type réel ;
- antivirus ;
- stockage privé ;
- URLs temporaires ;
- isolation par campagne ;
- autorisation appliquée avant la recherche vectorielle ;
- séparation `MJ_ONLY` et `PLAYERS` ;
- protection contre les prompt injections documentaires ;
- suppression et politique de conservation ;
- traçabilité des documents sources.

## Exigences TDD de sécurité

Pour chaque fonctionnalité sensible, écrire d'abord des tests couvrant :

- utilisateur non authentifié ;
- utilisateur authentifié sans autorisation ;
- accès à la ressource d'un autre utilisateur ;
- entrée invalide ;
- entrée surdimensionnée ;
- requête rejouée ;
- opération concurrente lorsque pertinent ;
- comportement nominal ;
- absence d'effet en base lorsque l'opération échoue.

Les tests de sécurité fusionnés sont soumis aux règles d'immutabilité définies dans `AGENTS.md`.

## Checklist obligatoire avant Pull Request

- [ ] Les entrées sont validées côté serveur.
- [ ] Les permissions sont vérifiées côté API.
- [ ] Les données sensibles ne sont ni retournées ni loguées.
- [ ] Les cas non authentifiés et non autorisés sont testés.
- [ ] Les contraintes DB nécessaires existent.
- [ ] Les opérations sensibles sont transactionnelles et idempotentes si nécessaire.
- [ ] Le rate limiting pertinent est appliqué.
- [ ] Aucun secret n'est ajouté au dépôt.
- [ ] Les messages d'erreur ne révèlent pas d'information interne.
- [ ] Les tests de non-régression réussissent.
- [ ] Les dépendances ajoutées ont été examinées.
- [ ] La Pull Request décrit les risques et contrôles de sécurité.

## Conditions bloquant une Pull Request

Une Pull Request ne doit pas être proposée comme terminée si :

- une vulnérabilité critique ou élevée connue reste ouverte ;
- un contrôle d'autorisation manque ;
- un secret est présent dans le diff ;
- un test de sécurité échoue ;
- une protection existante a été désactivée ;
- une migration destructive n'a pas été examinée ;
- des données privées deviennent publiques sans validation explicite.

