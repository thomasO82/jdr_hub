# AGENTS.md — JDR Hub

## 1. Mission

JDR Hub est une application web sociale et logistique pour organiser des parties de jeu de rôle sur table. Le MVP permet de rechercher, créer et gérer des parties, postuler, inviter des joueurs, renseigner les disponibilités, proposer et voter des créneaux, consulter un planning, signaler une absence et progresser en XP. Le MVP n'est pas un Virtual Tabletop.

## 2. Sources de vérité

### Fonctionnel

La source fonctionnelle principale est :

`docs/specifications/cahier-des-charges.md`

Avant chaque fonctionnalité, lire les sections concernées, les règles métier, les critères d'acceptation, les contraintes techniques et les éléments hors MVP. Ne pas se fier uniquement à une conversation ou à un ancien résumé.

### Design

Les références visuelles sont dans :

- `docs/maquettes/desktop/`
- `docs/maquettes/mobile/`
- `docs/branding/README.md`
- `docs/branding/logo.svg`

Parcourir récursivement les sous-dossiers et consulter les `screen.png`, `code.html`, `DESIGN.md` et autres fichiers Markdown. Les `code.html` de Stitch sont des références visuelles, pas le code définitif. Ne pas les copier aveuglément.

### Ordre de priorité

Pour les fonctionnalités :

1. `docs/specifications/cahier-des-charges.md`
2. les décisions plus récentes de `docs/decisions/`
3. les règles explicites de ce fichier
4. les maquettes

Pour le design :

1. `docs/branding/logo.svg`
2. `docs/branding/README.md`
3. la landing page desktop
4. la landing page mobile
5. les autres maquettes
6. le cahier des charges

Toute décision récente qui remplace une règle du cahier des charges doit être documentée dans `docs/decisions/`.

## 3. Audit obligatoire avant développement

Avant la première implémentation :

1. lire le cahier des charges complet ;
2. parcourir toutes les maquettes desktop et mobile ;
3. associer chaque écran desktop à son équivalent mobile ;
4. lire les fichiers Markdown de Stitch ;
5. inspecter les captures et ressources ;
6. identifier les composants communs ;
7. relever les incohérences fonctionnelles et visuelles ;
8. créer `docs/design-audit.md` ;
9. créer `docs/design-system.md` ;
10. créer `docs/implementation-plan.md`.

Ne pas commencer l'implémentation complète avant cet audit.

## 4. Cohérence des maquettes

Stitch peut produire des différences accidentelles de logo, header, footer, navigation, couleurs, typographies, boutons, cartes, espacements, icônes ou responsive. Ne pas reproduire ces incohérences automatiquement.

Pour une différence mineure et réversible, choisir la version la plus cohérente, l'appliquer partout et documenter la décision dans `docs/design-audit.md`. Pour une différence importante impossible à résoudre objectivement, demander une validation humaine.

## 5. Logo officiel

Le logo officiel est `docs/branding/logo.svg`. Le copier vers `apps/web/public/branding/logo.svg` lors de la création du frontend.

Il est interdit de le redessiner, remplacer par du texte, recolorer, déformer, recadrer, modifier ou remplacer par une variante issue accidentellement d'une maquette. Une version compacte ne peut être utilisée que si elle existe et a été validée ; ne pas en inventer.

## 6. Header, navigation et footer

Créer un seul composant `AppHeader` partagé. Toutes les pages concernées doivent l'utiliser. Conserver le même logo, la même hauteur, le même fond, les mêmes couleurs, espacements, typographies, styles de boutons et ordre de navigation.

Seuls l'état actif, les actions liées à l'authentification et l'adaptation mobile peuvent changer. Appliquer la même règle au footer, aux navigations desktop/mobile et au menu utilisateur. Ne pas recréer ces composants page par page.

## 7. Design system

Documenter dans `docs/design-system.md` : couleurs, typographies, tailles, espacements, rayons, bordures, ombres, icônes, largeurs, breakpoints, états interactifs et règles responsive.

Créer des composants réutilisables : boutons, champs, sélecteurs, filtres, tags, badges, cartes, modales, notifications, onglets, progression, skeletons, états vides et erreurs.

shadcn/ui peut servir de base, mais doit être adapté au design JDR Hub. Ne pas remplacer les maquettes par une interface shadcn générique.

## 8. Architecture technique

Utiliser un monorepo pnpm :

```text
apps/
  web/          # Next.js
  api/          # Hono
packages/
  shared/       # Contrats Zod, types et enums partagés
  database/     # Drizzle, relations et migrations
  ui/           # Composants partagés si pertinent
docs/
```

### Frontend

- Next.js avec App Router
- TypeScript strict
- Tailwind CSS
- shadcn/ui lorsque pertinent
- Lucide Icons
- Server Components par défaut
- Client Components uniquement si une interaction navigateur l'exige

### Backend

- Hono et TypeScript strict
- API REST
- Zod
- Drizzle ORM
- PostgreSQL
- Discord OAuth2
- sessions sécurisées

Hono reste un monolithe modulaire. Ne pas créer de microservices pour le MVP. Modules recommandés : `auth`, `users`, `games`, `tags`, `applications`, `invitations`, `members`, `sessions`, `availability`, `scheduling`, `attendance`, `notifications`, `gamification`.

Ne jamais importer le package de base de données dans du code frontend exécuté dans le navigateur.

### Docker

Prévoir `web-next`, `api-hono` et `postgres`. L'architecture doit permettre `/` vers Next.js et `/api/*` vers Hono sous le même domaine.

## 9. Règles métier essentielles

Une partie est distincte d'une séance.

### One-shot

- type `ONE_SHOT` ;
- une à trois séances maximum ;
- dates éventuellement différentes ;
- fin explicite décidée par le MJ ;
- quatrième séance interdite ;
- progression des séances affichée.

### Campagne

- type `CAMPAIGN` ;
- nombre de séances non limité ;
- rythme généralement hebdomadaire ;
- séances créées progressivement ;
- active jusqu'à sa fermeture par le MJ.

### Tags

Utiliser des tables relationnelles `tags` et `game_tags`. Ne pas stocker les tags dans une chaîne. Les filtres multi-tags utilisent par défaut une logique `AND`.

### XP

Utiliser un journal d'événements, pas uniquement un compteur. L'attribution doit être traçable, testable, transactionnelle et idempotente.

## 10. Règles générales de développement

Avant chaque fonctionnalité : relire la spécification, consulter `docs/implementation-plan.md` et les maquettes, extraire les règles métier et critères d'acceptation, puis appliquer le cycle TDD.

Ne pas mettre les règles métier dans React, exposer Drizzle au navigateur, dupliquer inutilement les contrats, utiliser `any` sans justification, masquer une erreur TypeScript, ajouter une dépendance sans justification ou modifier des fichiers sans rapport avec la tâche. Utiliser pnpm.

## Autonomie d'exécution

Pour une fonctionnalité explicitement autorisée, Codex exécute de manière
autonome les étapes normales de développement : exploration autorisée, tests,
modifications liées au périmètre, builds, contrôles, commits locaux, Docker de
développement et préparation de Pull Request. Ne pas interrompre inutilement
le propriétaire pour demander une confirmation intermédiaire.

Dès qu’une fonctionnalité satisfait les vérifications obligatoires, Codex doit
créer les commits locaux, pousser sa branche dédiée et ouvrir automatiquement
une Pull Request vers `develop`, sans demander un choix d’intégration. Après
l’ouverture, il fournit le lien et s’arrête jusqu’à la revue ou la confirmation
de fusion du propriétaire.

Demander une validation explicite avant l'ajout ou la mise à jour d'une
dépendance. Les validations imposées par une règle de sécurité, une opération
destructive, une migration risquée, un accès interdit ou une coordination
externe restent obligatoires.

## 11. Workflow Git obligatoire

Chaque fonctionnalité utilise une branche dédiée créée depuis un `develop` propre et à jour. Les Pull Requests de fonctionnalité ciblent `develop`, puis une promotion séparée et validée peut rejoindre `main`. Il est interdit de développer directement sur `main`.

Ne jamais créer ni utiliser de Git worktree pour ce dépôt. Tout travail doit
être effectué dans l'espace de travail courant, sur la branche dédiée active.

Convention : `feat/`, `fix/`, `refactor/`, `docs/`, `test/` ou `chore/` suivi d'une description courte, par exemple `feat/discord-auth` ou `feat/games-and-tags`.

Une branche correspond à une seule fonctionnalité cohérente. Ne jamais réutiliser une ancienne branche pour une nouvelle fonctionnalité.

Créer des commits petits et explicites, idéalement :

```text
test: define expected game creation behavior
feat: implement game creation
refactor: simplify game creation service
```

Ne pas committer `.env`, secrets, `node_modules`, builds, fichiers temporaires ou `Zone.Identifier`.

Avant une Pull Request : lint, TypeScript, tests, build, examen du diff, contrôle des secrets, documentation, commits, push de la branche, puis PR vers `develop`. La promotion vers `main` suit un contrôle séparé et une validation humaine.

Chaque PR décrit : résumé, fichiers/modules, règles métier, décisions, tests, preuve TDD, sécurité, commandes, résultats, limites, vérification manuelle et captures pour les changements visuels.

### Validation humaine

Le propriétaire vérifie et fusionne personnellement chaque PR. Codex ne doit jamais fusionner, pousser directement sur `main`, approuver sa propre PR, contourner la revue, forcer un push, réécrire l'historique partagé ou supprimer automatiquement une branche distante.

Après création de la PR, fournir le lien, la branche, le résumé, les tests et les points à vérifier, puis s'arrêter jusqu'à confirmation du merge.

## 12. TDD obligatoire

Les tests définissent le comportement. Aucune fonctionnalité métier ne doit être implémentée avant ses tests.

### Red

Traduire le besoin en critères d'acceptation, écrire les tests, les exécuter et confirmer qu'ils échouent pour la bonne raison. Un test déjà vert ne prouve pas un nouveau comportement.

### Green

Écrire uniquement le code nécessaire, faire réussir les nouveaux tests et vérifier que tous les anciens tests restent verts.

### Refactor

Améliorer lisibilité, responsabilités et duplications sans changer le comportement, en réexécutant les tests.

Ordre obligatoire : spécification, critères, cas nominal, erreurs, limites, tests rouges, implémentation minimale, tests verts, refactorisation, vérification complète.

## 13. Niveaux de tests

- Unitaires : XP, niveaux, limite one-shot, statuts, permissions, disponibilités, créneaux, candidatures, invitations.
- Intégration : Drizzle/PostgreSQL, contraintes, transactions, relations, sessions, authentification, notifications, idempotence.
- API : validation, authentification, autorisation, statuts HTTP, réponses, erreurs et effets en base.
- Composants : formulaires, filtres, tags, votes, disponibilités, navigation et états UI.
- E2E : Discord, création de partie, recherche, candidature, invitation, vote, planning, absence, séance et XP.

Les tests E2E ne remplacent pas les autres niveaux.

## 14. Immutabilité des tests validés

Après validation et fusion dans `main`, les tests deviennent des tests de non-régression immuables. Ne jamais modifier, affaiblir, contourner ou supprimer un test pour faire passer du code.

Interdictions : modifier une attente pour correspondre à un bug, supprimer ou affaiblir une assertion, retirer un cas limite, utiliser `skip`, `todo` ou `only`, gonfler un timeout, truquer un mock, désactiver une suite ou réduire la couverture sans autorisation.

Un ancien test en échec est d'abord considéré comme une régression du code.

Un test fusionné ne peut changer qu'après explication et autorisation explicite, si la spécification a changé, si une décision métier validée le remplace, si le test est démontrablement erroné, si une dépendance externe a changé ou si une restructuration l'invalide sans modifier le comportement. Utiliser alors une branche et une PR dédiées ; ne jamais cacher ce changement dans une PR fonctionnelle.

## 15. Preuve TDD et couverture

Chaque PR contient une section `Preuve TDD` : tests écrits avant l'implémentation, raison de l'échec initial, code les faisant passer, refactorisations, non-régression, résultat final et évolution de couverture.

Une fonctionnalité n'est pas terminée si elle n'est pas testée, si un ancien test échoue, si un test a été modifié sans autorisation, ou si TypeScript, lint ou build échouent.

La couverture n'est pas l'unique preuve de qualité, mais une fonctionnalité ne doit pas la réduire. Couvrir les branches métier critiques. Toute exclusion ou baisse doit être justifiée.

## 16. Commentaires et documentation du code

Le code doit être compréhensible par le propriétaire. Commenter surtout le **pourquoi** : règles métier, architecture, permissions, statuts, transactions, XP, one-shots, fuseaux horaires, requêtes Drizzle complexes, Discord, SEO, sécurité, compromis et limitations.

Utiliser TSDoc pour les services, fonctions publiques, règles complexes, types difficiles et utilitaires partagés.

Ne pas commenter littéralement chaque ligne, conserver du code mort commenté, écrire des commentaires faux ou compenser de mauvais noms. Privilégier d'abord noms explicites, fonctions courtes, types précis et responsabilités claires.

Lorsqu'un comportement change, mettre à jour code, tests autorisés, commentaires et documentation dans la même PR. Un commentaire faux est une régression documentaire.

## 17. Référentiel de sécurité obligatoire

Le référentiel complet est :

`docs/security/security-requirements.md`

Le consulter avant toute modification concernant l'authentification, les sessions, permissions, routes API, données personnelles, PostgreSQL, Docker, Discord, CI/CD, logs, uploads, IA ou RAG.

La sécurité fait partie des critères d'acceptation. Pour chaque fonctionnalité : identifier les exigences applicables, les ajouter aux critères, écrire d'abord les tests de sécurité, vérifier les utilisateurs non authentifiés/non autorisés, les accès aux ressources d'autrui, les entrées invalides ou surdimensionnées et la concurrence pertinente.

Chaque PR contient une section `Sécurité` précisant risques, contrôles, tests, limites, données personnelles et permissions.

Il est interdit de désactiver une protection pour faire fonctionner une fonctionnalité, modifier un test de sécurité fusionné sans autorisation, exposer un secret, faire confiance aux permissions du frontend ou rendre une donnée privée publique sans validation.

Avant de terminer une fonctionnalité, vérifier la checklist de `docs/security/security-requirements.md`.

## 18. Principes de sécurité minimaux

- OAuth2 Discord avec `state`, URI de redirection stricte, scopes minimaux et protection contre les redirections ouvertes.
- Sessions serveur avec cookies `HttpOnly`, `Secure`, `SameSite`, rotation, expiration et révocation.
- Protection CSRF des routes qui modifient l'état.
- Refus par défaut et autorisation par ressource pour prévenir IDOR et élévations de privilèges.
- Validation Zod stricte avec tailles maximales et rejet des propriétés sensibles/inconnues.
- Requêtes Drizzle paramétrées ; SQL brut révisé et jamais concaténé avec une entrée utilisateur.
- Échappement XSS, sanitisation du contenu riche et absence de `dangerouslySetInnerHTML` non maîtrisé.
- CSP, HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy` et `Permissions-Policy`.
- Rate limiting adapté par route et prévention du spam.
- Transactions et idempotence pour places, votes, séances, notifications et XP.
- Secrets absents du code, du Git, des images Docker, des logs et des PR.
- PostgreSQL non public avec compte applicatif à privilèges minimaux.
- Conteneurs non-root, images épinglées, healthchecks, ports et capacités minimaux.
- Logs structurés et corrélés sans données sensibles.
- Analyse des dépendances, secrets, code et images en CI.
- Sauvegardes protégées avec restauration testée.
- Minimisation, confidentialité, export et suppression des données personnelles conformément au RGPD.

## 19. SEO

Rendre côté serveur les pages publiques `/parties`, `/parties/[slug]`, `/mj/[slug]`, `/tags/[slug]` et `/jeux/[slug]`. Fournir HTML initial complet, title, description, canonical, Open Graph, aperçu Discord et HTML sémantique. Générer `sitemap.xml` et `robots.txt`.

Mettre en `noindex` dashboard, planning personnel, profil privé, gestion MJ, candidatures, invitations et combinaisons arbitraires de filtres.

## 20. Responsive et accessibilité

Vérifier chaque écran en mobile, tablette et desktop. La maquette desktop guide les grands écrans et la mobile les petits. Respecter clavier, focus visible, contrastes, labels, zones tactiles, messages accessibles et absence d'interaction importante dépendant uniquement du survol ou de la couleur.

## 21. Vérifications obligatoires

Selon le périmètre, exécuter lint, TypeScript, tests unitaires/composants/API/intégration/E2E, builds Next.js/Hono, migrations sur base de test et Docker Compose. Ne jamais désactiver une vérification pour obtenir du vert.

Avant de terminer : examiner `git status`, le diff, les fichiers non suivis, les secrets, fichiers parasites, commentaires et documentation.

## 22. Rapport de fin de tâche

Fournir : branche, résumé, fichiers, règles métier, tests, preuve TDD, sécurité, commandes, résultats, couverture, limites, vérifications manuelles et lien de PR. Expliquer le fonctionnement de façon compréhensible pour un développeur découvrant le module.

## 23. Hors MVP

Ne pas implémenter sans demande explicite : RAG, assistant IA, VTT, chat temps réel complet, paiement, abonnement, application mobile native, microservices, calendrier externe ou réputation complexe.

## 24. Conditions d'arrêt

Demander une validation humaine si plusieurs logos sont impossibles à départager, si une décision change profondément le produit, si un test fusionné semble devoir changer, si une action destructive ou une migration risquée est requise, si un secret manque, si les sources se contredisent fortement, si la branche contient des modifications inconnues ou si la PR précédente n'est pas fusionnée.

Pour une décision mineure et réversible, choisir rationnellement, documenter et continuer.

## 25. Definition of Done

Une fonctionnalité est terminée uniquement si : critères satisfaits, tests écrits avant l'implémentation, échec initial vérifié, nouveaux et anciens tests verts, aucun test fusionné modifié sans autorisation, TypeScript/lint/build verts, sécurité vérifiée, documentation et commentaires à jour, responsive et accessibilité contrôlés, diff propre, aucun secret, branche poussée, PR créée et instructions de vérification fournies.

La fonctionnalité n'est terminée que si sa fiche dans `docs/features/` et `docs/project-status.md` ont été mis à jour.

La fonctionnalité est fusionnée uniquement par le propriétaire du projet.

## 26. Plugins, skills et outils obligatoires

Les plugins et skills complètent les règles du projet sans jamais les remplacer. L'ordre de priorité reste : demande explicite du propriétaire, `AGENTS.md`, cahier des charges, décisions validées, exigences de sécurité, puis recommandations des plugins.

Avant d'invoquer un plugin ou une skill, vérifier qu'il est disponible dans la session active. Annoncer brièvement son utilisation et sa finalité. Ne jamais prétendre avoir utilisé un outil qui n'a pas réellement été invoqué. Si un outil obligatoire est indisponible, s'arrêter avant l'action concernée, expliquer le blocage et demander une décision au propriétaire.

Utiliser les outils selon le contexte suivant :

- nouvelle fonctionnalité, modification de comportement ou décision de conception : `superpowers:brainstorming` avant toute implémentation ;
- plan d'implémentation multi-étapes : `superpowers:writing-plans` après validation de la conception ;
- fonctionnalité ou correction : `superpowers:test-driven-development` avant le code de production ;
- bug, test en échec ou comportement inattendu : `superpowers:systematic-debugging` avant de proposer une correction ;
- développement ou modification significative de l'interface web : `build-web-apps`, en respectant les maquettes et le design system du projet ;
- avant d'affirmer qu'une tâche est terminée ou réussie : `superpowers:verification-before-completion` avec preuves fraîches ;
- création, consultation ou mise à jour d'une Pull Request : plugin GitHub, sans jamais fusionner la PR ;
- ajout ou mise à jour de dépendances : `supply-chain-risk-auditor` s'il est disponible ;
- vérification de conformité entre code et spécifications : `spec-to-code-compliance` s'il est disponible.

Ne pas lancer tous les plugins pour chaque tâche. Utiliser uniquement ceux qui sont pertinents afin de limiter le bruit, les permissions, le temps d'exécution et les contradictions.

Un plugin, une skill, un serveur MCP, un hook, un sous-agent ou un script hérite de toutes les restrictions de ce fichier et de `docs/security/ai-access-policy.md`. Aucun outil ne donne l'autorisation de lire un secret, modifier une référence protégée, modifier un test fusionné, pousser sur `main` ou fusionner une Pull Request.

## 27. Politique d'accès de l'IA aux fichiers

Avant toute exploration du dépôt, lire `docs/security/ai-access-policy.md` sans tenter d'ouvrir au préalable un fichier potentiellement secret. Cette politique distingue :

- les fichiers dont la lecture et la modification sont interdites ;
- les références lisibles mais non modifiables sans autorisation ;
- les tests et migrations protégés ;
- les fichiers de travail ordinaires.

Cette politique s'applique aux commandes shell, recherches récursives, plugins, skills, serveurs MCP, hooks, sous-agents, scripts et outils externes. Lors d'un inventaire ou d'une recherche, exclure explicitement les chemins interdits. Ne jamais afficher, résumer, copier, indexer, transmettre ou journaliser leur contenu.

Si un fichier interdit est rencontré, ne signaler que son chemin et la raison du blocage. Demander au propriétaire une valeur factice ou une information non sensible. Une autorisation d'exception doit être explicite, limitée à un fichier et à une opération, et ne vaut pas autorisation générale.

`.gitignore` limite le versionnement, mais ne constitue pas un contrôle d'accès. Les secrets réels doivent rester hors du dépôt et être fournis par un gestionnaire de secrets, GitHub Secrets, l'environnement de déploiement ou une autre solution prévue à cet effet.

## 28. Suivi et traçabilité des fonctionnalités

- Toute fonctionnalité possède une fiche dans `docs/features/`.
- `docs/project-status.md` donne l'état global du projet.
- La fiche doit être créée ou mise à jour avant la Pull Request.
- Une fonctionnalité ne peut pas être déclarée terminée sans cette fiche.
- La fiche décrit uniquement ce qui a réellement été implémenté.
- Les limites, erreurs restantes et travaux reportés doivent être indiqués.
- Les commandes et résultats des tests doivent être consignés.
- La preuve du cycle TDD Red, Green, Refactor doit être renseignée.
- Les contrôles de sécurité doivent être renseignés.
- Le statut doit être `IN_REVIEW` au moment de l'ouverture de la Pull Request.
- Codex ne doit jamais indiquer `MERGED` avant confirmation du propriétaire.
- Une fiche fusionnée ne doit pas être réécrite silencieusement.
- Une évolution importante doit créer une nouvelle fiche ou une section datée.
- Les décisions architecturales restent enregistrées dans `docs/decisions/`.
- Les secrets, données personnelles et valeurs sensibles ne doivent jamais apparaître dans ces documents.
- `docs/security/ai-access-policy.md` s'applique à tous ces fichiers.

## 28. Suivi et traçabilité des fonctionnalités

Chaque fonctionnalité doit être documentée afin de conserver une trace précise
de l’état du projet, du contexte initial, du travail réalisé et des éléments
restants.

Les documents de suivi sont :

- `docs/project-status.md` pour la vision globale du projet ;
- `docs/features/` pour les fiches détaillées des fonctionnalités ;
- `docs/decisions/` pour les décisions métier et architecturales importantes.

### Tableau de suivi global

Avant de commencer une fonctionnalité, mettre à jour
`docs/project-status.md` avec :

- l’identifiant de la fonctionnalité ;
- son nom ;
- son statut ;
- le nom de sa branche ;
- sa fiche détaillée ;
- ses dépendances éventuelles.

Les seuls statuts autorisés sont :

- `PLANNED` : fonctionnalité prévue mais non commencée ;
- `IN_PROGRESS` : développement en cours ;
- `BLOCKED` : développement bloqué ;
- `IN_REVIEW` : implémentation terminée et Pull Request en attente ;
- `MERGED` : Pull Request fusionnée par le propriétaire.

Codex ne doit jamais indiquer `MERGED` avant confirmation explicite du
propriétaire ou vérification de l’état réel de la Pull Request sur GitHub.

GitHub reste la source de vérité pour l’état réel des Pull Requests.

### Fiche de fonctionnalité

Chaque fonctionnalité possède une fiche :

`docs/features/NNN-nom-de-la-fonctionnalite.md`

Exemples :

- `docs/features/001-project-foundation.md`
- `docs/features/002-discord-authentication.md`
- `docs/features/003-game-creation.md`
- `docs/features/004-game-tags.md`

La numérotation est croissante et ne doit pas être réutilisée.

La fiche doit être créée au début de la fonctionnalité avec le statut
`IN_PROGRESS`, puis complétée pendant le développement.

Elle doit contenir :

- identifiant et nom ;
- statut ;
- branche ;
- Pull Request ;
- dates ;
- dépendances ;
- contexte ;
- besoin utilisateur ;
- périmètre prévu ;
- fonctionnalités réellement réalisées ;
- parcours utilisateur ;
- règles métier implémentées ;
- architecture et choix techniques ;
- modèle de données et migrations ;
- routes API ;
- pages et composants ;
- tests ajoutés ;
- preuve du cycle TDD Red, Green, Refactor ;
- contrôles de sécurité ;
- documentation technique consultée ;
- fichiers principaux ;
- limites connues ;
- travaux reportés ;
- procédure de vérification manuelle ;
- commits importants ;
- décisions associées.

La fiche doit clairement distinguer :

- ce qui était prévu ;
- ce qui a réellement été réalisé ;
- ce qui reste à faire.

Ne jamais présenter comme réalisée une fonctionnalité absente, incomplète,
désactivée ou non vérifiée.

### Mise à jour avant Pull Request

Avant la création de chaque Pull Request :

1. compléter la fiche de fonctionnalité ;
2. consigner les commandes de vérification réellement exécutées ;
3. indiquer les résultats des tests ;
4. consigner la preuve TDD ;
5. consigner les contrôles de sécurité ;
6. documenter les limites et travaux reportés ;
7. passer le statut à `IN_REVIEW` ;
8. mettre à jour `docs/project-status.md` ;
9. inclure la fiche dans la Pull Request.

Une fonctionnalité n’est pas terminée tant que sa fiche et le tableau global
ne sont pas à jour.

### Après fusion

Codex ne fusionne jamais la Pull Request.

Après confirmation de la fusion par le propriétaire, passer le statut de la
fonctionnalité à `MERGED` au début de la prochaine branche documentaire ou
fonctionnelle.

Si aucune nouvelle fonctionnalité n’est prévue, effectuer cette synchronisation
dans une Pull Request documentaire dédiée.

### Protection de l’historique

Une fiche correspondant à une fonctionnalité fusionnée constitue un historique
du projet. Elle ne doit pas être supprimée, réécrite ou corrigée silencieusement.

Une évolution importante doit :

- créer une nouvelle fiche ; ou
- ajouter une section datée explicitement reliée à une nouvelle Pull Request.

Une erreur documentaire peut être corrigée avec une justification claire dans
le diff et la Pull Request.

Les fiches ne doivent jamais contenir de secret, jeton, mot de passe, donnée
personnelle réelle ou contenu interdit par
`docs/security/ai-access-policy.md`.
