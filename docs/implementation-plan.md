# Plan d’implémentation — JDR Hub MVP

## Cadre

Ce plan transforme le cahier des charges et les exigences de sécurité en petites fonctionnalités livrables. Il ne lance aucune implémentation dans cette tâche : aucun framework, conteneur, schéma ou service n’est créé ici.

Architecture cible : monorepo pnpm, Next.js App Router pour le frontend, Hono pour l’API REST, Drizzle ORM pour PostgreSQL, Docker Compose pour l’environnement reproductible et un monolithe modulaire Hono. Le frontend ne charge jamais le package de base de données ; les pages publiques appellent Hono côté serveur pour produire du HTML initial complet.

Modules Hono prévus : `auth`, `users`, `games`, `tags`, `applications`, `invitations`, `members`, `sessions`, `availability`, `scheduling`, `attendance`, `notifications`, `gamification`. Les contrats Zod et les enums réellement partagés vivent dans `packages/shared`.

## Règles de livraison communes

Chaque fonctionnalité ci-dessous doit être développée sur une branche dédiée créée depuis un `main` propre et à jour, avec une Pull Request dédiée vers `main`. Le propriétaire valide et fusionne personnellement chaque PR ; aucune fusion, approbation personnelle, poussée directe sur `main` ou suppression de branche distante n’est automatisée.

Cycle obligatoire pour chaque fonctionnalité :

1. relire les sections correspondantes du cahier des charges, de la sécurité et du design system ;
2. transformer les règles en critères d’acceptation et écrire les tests ;
3. **Red** : exécuter les tests et confirmer leur échec pour la bonne raison ;
4. **Green** : implémenter le minimum nécessaire ;
5. **Refactor** : améliorer les responsabilités sans changer le comportement ;
6. exécuter la non-régression, TypeScript, lint, build et les tests applicables ;
7. documenter dans la PR la preuve TDD, la sécurité, les migrations et les limites.

Les tests fusionnés deviennent immuables. Ils ne peuvent être modifiés, affaiblis, supprimés ou ignorés qu’avec une autorisation explicite et une PR dédiée justifiant le changement.

## Vue d’ensemble du découpage

| ID | Fonctionnalité | Branche recommandée | Dépendances principales |
| --- | --- | --- | --- |
| F00 | Socle monorepo, Docker et CI sécurisée | `chore/monorepo-foundation` | Aucune |
| F01 | Discord OAuth2 et sessions | `feat/discord-auth` | F00 |
| F02 | Parties, tags et cycle de vie | `feat/games-and-tags` | F00, F01 |
| F03 | Catalogue public, détail et SEO | `feat/public-games-and-seo` | F01, F02 |
| F04 | Candidatures, membres et invitations | `feat/applications-and-invitations` | F02, F01 |
| F05 | Disponibilités et recherche de joueurs | `feat/availability-and-player-search` | F01, F02 |
| F06 | Séances, créneaux, votes et planning | `feat/scheduling-and-planning` | F02, F04, F05 |
| F07 | Présence, absence et notifications Discord | `feat/attendance-notifications` | F01, F04, F06 |
| F08 | Dashboard et gestion MJ | `feat/dashboard-and-gm-management` | F02, F04, F06, F07 |
| F09 | XP, niveaux et historique | `feat/xp-and-levels` | F06, F07, F08 |
| F10 | Responsive, accessibilité et états UI | `refactor/responsive-accessibility` | F01 à F09 selon l’écran |
| F11 | Durcissement release, sauvegardes et exploitation | `chore/release-hardening` | F00 à F10 |

---

## F00 — Socle monorepo, Docker et CI sécurisée

### Objectif

Installer la structure pnpm prévue (`apps/web`, `apps/api`, `packages/shared`, `packages/database`, `packages/ui` si utile), les services `web-next`, `api-hono`, `postgres`, le routage `/` et `/api/*`, ainsi que les contrôles de qualité de base.

### Dépendances

Aucune fonctionnalité applicative. La branche est créée depuis `main` propre et à jour.

### Règles métier et techniques

- Hono reste un monolithe modulaire ; aucun microservice.
- TypeScript strict, contrats partagés uniquement dans `packages/shared`.
- PostgreSQL n’est pas exposé publiquement et rejoint un réseau Docker interne.
- Docker utilise des images minimales et épinglées, des builds multi-stage, des healthchecks et des conteneurs non-root.
- Les secrets viennent de variables d’environnement ou d’un gestionnaire de secrets ; seul `.env.example` sans valeur réelle est versionné.
- Ajouter `.dockerignore`, limites de ressources raisonnables, capacités minimales et absence de socket Docker monté.
- CI : pnpm audit, lint, TypeScript, tests, builds, scan de secrets, analyse statique et scan d’images.

### Critères d’acceptation

- `pnpm` installe le workspace sans dépendance inutile.
- Les trois services démarrent avec Docker Compose et leurs healthchecks sont exploitables.
- `/` atteint Next.js et `/api/*` atteint Hono sous le même domaine de développement.
- Les builds web/API sont séparés et reproductibles.
- La CI refuse une branche si lint, TypeScript, tests ou build échouent, ou si un secret est détecté.
- Aucun secret, fichier `Zone.Identifier`, build ou `node_modules` n’est suivi.

### Tests à écrire en premier — Red

- Test d’architecture vérifiant les frontières workspace et l’absence d’import de `packages/database` dans le navigateur.
- Test de smoke des healthchecks et du routage `/`/`/api`.
- Test CI négatif sur secret détecté, image non épinglée et conteneur root lorsque les outils sont en place.

### Tests nécessaires

- Unitaires : validation des variables d’environnement et configuration sans secret.
- Intégration : démarrage PostgreSQL de test et connectivité minimale Drizzle, sans modèle métier définitif.
- API : endpoint de santé, format d’erreur avec `requestId`, taille maximale du corps.
- Composants : aucun composant métier ; vérification de la page d’erreur de base si elle est créée.
- E2E : navigation smoke et proxy `/api` en environnement Compose.

### Contrôles de sécurité

Pas de valeurs secrètes dans la documentation, les Dockerfiles, Compose, les logs ou les workflows. Vérifier non-root, réseau PostgreSQL interne, ports minimaux, headers de base, permissions minimales du `GITHUB_TOKEN`, dépendances et scans CI.

### Écrans concernés

Aucun écran fonctionnel ; shell technique uniquement.

### PR et migration

- PR : structure monorepo, configurations, Docker, CI et documentation de démarrage.
- Migration : aucune migration métier ; ne pas créer la base applicative dans cette fondation.

## F01 — Discord OAuth2 et sessions

### Objectif

Permettre la connexion sans mot de passe local et créer une session applicative sécurisée avec profil minimal Discord.

### Dépendances

F00 ; une matrice d’autorisation devra être ajoutée avant les routes métier protégées conformément au référentiel de sécurité.

### Règles métier

- Utiliser le flux OAuth2 officiel Discord avec scopes minimaux.
- Générer un `state` imprévisible, lié à la tentative et de courte durée ; vérifier son intégrité et empêcher le rejeu.
- Utiliser PKCE si la bibliothèque et le flux le permettent, URI de redirection strictes et destination post-login allowlistée.
- Le token Discord n’est jamais une session et n’est pas exposé au navigateur ; ne pas le persister sauf besoin justifié et alors le chiffrer.
- Régénérer la session après connexion/changement de privilège, expiration idle et absolue, révocation serveur et déconnexion effective.

### Critères d’acceptation

- Un visiteur démarre OAuth puis revient sur une session locale avec profil créé ou mis à jour.
- `state` invalide, expiré, réutilisé ou URI refusée aboutissent à une erreur sobre sans création de session.
- Cookie de session `HttpOnly`, `Secure` en production, `SameSite` adapté, chemin/domaine restreints ; aucune session dans URL/logs.
- Les routes privées répondent 401 sans session et 403 lorsque la ressource est interdite.
- L’écran de connexion propose « Continuer avec Discord » et ne promet pas une fonctionnalité VTT.

### Tests à écrire en premier — Red

- Tests de sécurité OAuth : login CSRF, `state` invalide/rejoué, redirection ouverte, code échangé deux fois et erreur Discord.
- Tests de session : fixation, rotation, expiration, logout, révocation de toutes les sessions.
- Test nominal de création/mise à jour idempotente du profil Discord.

### Tests nécessaires

- Unitaires : génération/comparaison `state`, validation des scopes/redirect URI, politique d’expiration.
- Intégration : échange OAuth simulé, persistance utilisateur/session, révocation transactionnelle.
- API : statuts 302/400/401/403, cookies et format d’erreur, Origin/CSRF sur logout et routes d’état.
- Composants : boutons de connexion, état de chargement, erreur et déconnexion accessible.
- E2E : parcours Discord simulé, création de profil, accès privé puis déconnexion.

### Contrôles de sécurité

CSRF, login CSRF, open redirect, rate limiting démarrage/callback, secrets absents des logs, CSP/HSTS/nosniff/referrer/permissions policy, minimisation et finalité des données Discord. Préparer `docs/security/authorization-matrix.md` dans cette PR ou une PR sécurité dédiée avant les fonctionnalités métier.

### Écrans concernés

D03, M03, headers, menu utilisateur, états privés du shell.

### PR et migration

- PR : OAuth, sessions, profil minimal, middleware d’authentification et matrice d’autorisation.
- Migration : `users`, `sessions` et éventuellement tentatives OAuth ; index unique `discordId`, empreinte de session et expirations.

## F02 — Parties, tags et cycle de vie

### Objectif

Créer le modèle métier des parties, des tags relationnels et des règles `ONE_SHOT`/`CAMPAIGN`, avec CRUD serveur sécurisé.

### Dépendances

F00 et F01.

### Règles métier

- `Game` est distinct de `GameSession` et possède un propriétaire MJ, type, statut, visibilité, titre, description, système et capacité.
- Les tags résident dans `tags` et `game_tags`, jamais dans une chaîne ; référentiel contrôlé et slug unique normalisé.
- Le type `ONE_SHOT`/`CAMPAIGN` est un champ dédié, non un tag.
- Un one-shot accepte une à trois séances maximum ; une campagne n’a pas de maximum et reste active jusqu’à fermeture du MJ.
- Une partie fermée bloque nouvelles candidatures et planifications selon la transition de statut autorisée.
- Seul le MJ propriétaire modifie, ferme ou archive sa partie ; `ownerId`, rôle, XP, niveau et statuts protégés ne viennent pas du client.

### Critères d’acceptation

- Un MJ authentifié crée/modifie une partie valide avec plusieurs tags.
- Les entrées inconnues, trop longues, tags inactifs et relations temporelles invalides sont rejetés.
- Une partie publique/privée respecte sa visibilité dans les listes et détails.
- Les transitions `DRAFT`, `OPEN`, `ACTIVE`, `CLOSED`, `COMPLETED` sont explicites et testées.
- Le one-shot refuse une quatrième séance et la campagne accepte des séances successives jusqu’à fermeture.

### Tests à écrire en premier — Red

- Cas nominal de création/édition, erreurs de validation, propriétaire différent, partie fermée et visibilité.
- Règles unitaires de limite one-shot et de transitions de statut.
- Concurrence de création de tags/liaisons et tentative de mass assignment.

### Tests nécessaires

- Unitaires : enums, limites, normalisation de slug, filtre multi-tags `AND`, permissions et transitions.
- Intégration : contraintes FK/UNIQUE, relations `games/tags/game_tags`, transactions et index de recherche.
- API : CRUD, 400 validation, 401/403/404, 409 conflit métier, pagination de base et champs retournés.
- Composants : formulaire, sélection de type, sélecteur de tags, badges, erreurs et état vide.
- E2E : MJ crée une partie, l’édite, la ferme et vérifie qu’elle apparaît selon visibilité.

### Contrôles de sécurité

Zod strict avec tailles maximales, refus des propriétés inconnues, autorisation par ressource contre IDOR, rate limiting création/édition, requêtes Drizzle paramétrées, XSS sur titre/description/tags, logs sans contenu sensible et transaction sur invariants.

### Écrans concernés

D04, D05, D02, M02 et composants de partie/tag.

### PR et migration

- PR : contrats partagés, module `games`, module `tags`, CRUD et règles de cycle de vie.
- Migration : `games`, `tags`, `game_tags`, index sur titre normalisé, propriétaire, visibilité, slug et liaison.

## F03 — Catalogue public, détail et SEO

### Objectif

Rendre découvrables les parties publiques avec recherche serveur par nom, MJ et tags, puis fournir les pages SSR indexables prévues.

### Dépendances

F01 et F02.

### Règles métier

- `/parties` est paginé côté serveur ; filtres conservés dans l’URL.
- Recherche de nom insensible à la casse ; filtre MJ par identifiant, avec recherche par pseudo si proposé.
- Plusieurs tags utilisent `AND` et la règle est indiquée dans l’UI.
- Pages indexables : `/parties`, `/parties/[slug]`, `/mj/[slug]`, `/tags/[slug]`, `/jeux/[slug]`.
- Pages privées, combinaisons de filtres libres et parties privées/fermées non éditoriales sont `noindex`.
- Next.js Server Components appellent Hono côté serveur et produisent title, description, canonical, Open Graph et HTML sémantique.

### Critères d’acceptation

- Un visiteur consulte le catalogue et une fiche publique sans connexion.
- Les filtres nom/MJ/tags donnent des résultats cohérents et partageables par URL.
- Une page sans résultat possède un état vide ; pagination et paramètres ne permettent pas une charge excessive.
- Le HTML initial contient le contenu principal et les métadonnées ; sitemap et robots sont cohérents.
- Aucun champ privé, disponibilité précise, adresse exacte ou token n’est exposé dans HTML, JSON-LD ou Open Graph.

### Tests à écrire en premier — Red

- Tests SSR vérifiant HTML initial, métadonnées, canonical, Open Graph, `noindex`, sitemap et robots.
- Tests de recherche `AND`, casse, MJ, pagination maximale et slug inexistant.
- Tests d’accès public à une partie privée/fermée et de sortie XSS dans titre/description.

### Tests nécessaires

- Unitaires : construction d’URL, canonical, politique d’indexation, pagination et combinaison `AND`.
- Intégration : requêtes Drizzle paginées, index et projection publique minimale.
- API : `/games` public, routes `/public/*`, paramètres invalides, 404 et 429.
- Composants : barre de recherche, filtre MJ, tags, cartes, pagination, skeleton, erreur et état vide.
- E2E : visiteur recherche, ouvre une fiche, partage l’URL et contrôle un rendu SSR via Playwright.

### Contrôles de sécurité

Validation Zod des filtres et slugs, allowlist de tri, limites de recherche/pagination, requêtes paramétrées, XSS échappé/sanitized, CSP et headers, anti-scraping raisonnable, séparation stricte public/privé et rate limiting catalogue/profils.

### Écrans concernés

D01, D02, D05, M06, M02, plus les pages non maquettées MJ/tag/jeu à concevoir conformément au système de design.

### PR et migration

- PR : lecture publique, routes SSR, métadonnées, sitemap/robots et projection publique.
- Migration : slugs uniques pour parties, MJ, tags et systèmes si absents ; index de recherche. Aucune migration destructive.

## F04 — Candidatures, membres et invitations

### Objectif

Permettre à un joueur de candidater, au MJ d’accepter/refuser, et aux utilisateurs autorisés d’émettre et traiter des invitations avec roster cohérent.

### Dépendances

F02 et F01.

### Règles métier

- Une candidature peut contenir un message facultatif et possède un statut explicite.
- Un utilisateur ne peut pas candidater plusieurs fois à une partie ni s’auto-ajouter si le workflow impose candidature.
- L’acceptation réserve une place dans une transaction et ne dépasse jamais `maxPlayers`, même en concurrence.
- Le MJ propriétaire consulte et administre les candidatures ; le candidat voit son propre statut ; le membre voit uniquement les données prévues.
- Les invitations ont inviter/invitee, statut et expiration ; elles ne peuvent pas être réutilisées après décision.

### Critères d’acceptation

- Un joueur non membre dépose une candidature et voit `PENDING`.
- Le MJ accepte/refuse ; l’acceptation crée un membre et met à jour les places atomiquement.
- Une candidature doublon, une place pleine, une partie fermée ou une action d’un autre MJ échouent sans effet partiel.
- Un MJ invite un joueur, qui accepte/refuse avant expiration ; le roster reste cohérent.

### Tests à écrire en premier — Red

- Nominal candidature/acceptation/refus/invitation.
- Accès horizontal à la candidature d’un autre utilisateur et accès vertical d’un faux MJ.
- Rejeu et deux acceptations concurrentes dépassant la capacité.

### Tests nécessaires

- Unitaires : statuts, transitions, expiration, permissions et calcul des places.
- Intégration : contraintes uniques, transaction d’acceptation, verrouillage/concurrence et relations roster.
- API : validation message, 401/403/404/409/429, projections candidat/MJ/membre.
- Composants : formulaire de candidature, onglets, cartes, boutons accept/refus, invitation et confirmation.
- E2E : candidature d’un joueur, acceptation MJ, invitation d’un second joueur et mise à jour du planning à venir.

### Contrôles de sécurité

CSRF, autorisation par ressource/IDOR, Zod et limites des messages, XSS stocké, rate limiting candidature/invitation, absence de données privées dans les projections et logs d’audit des décisions MJ sans contenu sensible.

### Écrans concernés

D05, D06, D08, M04, D12/M10 pour invitations et notifications.

### PR et migration

- PR : `applications`, `invitations`, `members`, transitions et réservations de places.
- Migration : `applications`, `invitations`, `game_members`, index uniques `(gameId,userId)` et statuts/expirations.

## F05 — Disponibilités et recherche de joueurs

### Objectif

Permettre de déclarer des disponibilités récurrentes et de rechercher des joueurs par nom et compatibilité, sans publier leurs horaires précis par défaut.

### Dépendances

F01 ; F02 pour les systèmes, tags et préférences utiles à la recherche.

### Règles métier

- Une disponibilité est jour de semaine + minute début/fin dans le fuseau du profil.
- Le profil conserve le fuseau horaire ; les dates applicatives sont ensuite converties en UTC pour stockage/planification.
- Plusieurs plages sont autorisées, avec validation des bornes et absence de chevauchement non intentionnel.
- Les exceptions ponctuelles peuvent ignorer la semaine type.
- La compatibilité est un indicateur agrégé ; les disponibilités précises restent privées sauf choix explicite.

### Critères d’acceptation

- Un utilisateur remplace ses plages et retrouve la nouvelle version après rechargement.
- Les plages invalides, fuseaux inconnus, chevauchements interdits et tableaux surdimensionnés sont rejetés.
- La recherche filtre par nom, systèmes/préférences et compatibilité de disponibilité sans fuite d’horaires détaillés.
- Le rendu desktop affiche la grille et le mobile permet de naviguer par jour sans perdre l’état.

### Tests à écrire en premier — Red

- Cas nominal multi-plages, exception, modification et conversion de fuseau.
- Tests limites début=fin, fin avant début, DST/fuseaux et surcharge de tableau.
- Tests d’accès à la disponibilité précise d’un autre utilisateur et de visibilité publique désactivée.

### Tests nécessaires

- Unitaires : intervalles, chevauchement, compatibilité, fuseaux et exceptions.
- Intégration : remplacement transactionnel, contraintes et requêtes de recherche indexées.
- API : GET/PUT availability, `/players`, validation, 401/403/429 et projection agrégée.
- Composants : grille, carte mobile du jour, toggles, exceptions, filtres, skeleton et erreurs.
- E2E : utilisateur renseigne ses disponibilités, un MJ recherche un joueur compatible et aucune heure privée n’est montrée publiquement.

### Contrôles de sécurité

CSRF sur remplacement, autorisation stricte de la ressource, minimisation RGPD, rate limiting de recherche et anti-scraping, validation Zod des tableaux/fuseaux, absence de données précises dans logs et réponses publiques.

### Écrans concernés

D07, M05, D11, M09, profil et filtres de création/planification.

### PR et migration

- PR : disponibilité récurrente, exceptions, préférences de visibilité et recherche joueur.
- Migration : `availability_rules`, table d’exceptions si retenue, index `(userId, dayOfWeek)` et champs de préférence/visibilité.

## F06 — Séances, créneaux, votes et planning

### Objectif

Planifier les séances distinctes des parties, proposer des créneaux, recueillir les votes et afficher le planning personnel responsive.

### Dépendances

F02, F04 et F05.

### Règles métier

- `GameSession` possède `startsAt`, `endsAt`, statut `PROPOSED`, `SCHEDULED`, `COMPLETED` ou `CANCELLED`, et appartient à une partie.
- Un one-shot reste limité à trois séances ; une campagne n’a pas de maximum et cesse d’accepter des séances après fermeture.
- Les dates sont stockées en UTC ; le fuseau utilisateur sert à l’affichage et aux disponibilités.
- Un vote vaut Oui, Peut-être, Non ou Sans réponse ; un utilisateur ne vote qu’une fois par proposition et un sondage fermé refuse tout vote.
- Le système affiche le résultat, mais le MJ choisit le créneau ; aucun choix automatique non spécifié.

### Critères d’acceptation

- Le MJ crée une séance fixe ou plusieurs propositions puis clôture et choisit un créneau.
- Les joueurs autorisés votent une fois ; le tableau/cartes montrent les quatre états et compteurs.
- Le créneau choisi devient une séance planifiée visible dans le planning de tous les participants, dans leur fuseau.
- Les membres exclus, utilisateurs non membres, partie fermée et séance invalide sont refusés.
- Le mobile utilise un agenda/liste et le desktop une vue mois ; les actions restent utilisables au clavier.

### Tests à écrire en premier — Red

- Limite one-shot, fermeture de partie/sondage, double vote et vote d’un non-membre.
- Conversion UTC/fuseau et cas de changement d’heure.
- Concurrence sur clôture/choix et rejeu de création de séance.

### Tests nécessaires

- Unitaires : transitions de séance, calcul de score, règles de vote, limites et fuseaux.
- Intégration : contraintes proposition/vote, transactions choix→séance, relations et idempotence.
- API : création, vote, choix, planning, statuts 400/401/403/404/409/429 et pagination/dates bornées.
- Composants : step de planning, proposition, matrice de vote, calendrier, agenda, légende, empty/error/loading.
- E2E : MJ propose des créneaux, joueurs votent, MJ valide et la séance apparaît dans les plannings.

### Contrôles de sécurité

CSRF, contrôle d’appartenance et propriétaire côté API, Zod sur dates/durations/listes, rate limiting votes/propositions, transactions et contraintes contre doubles votes/surcapacité, logs d’actions MJ sans données inutiles.

### Écrans concernés

D05, D07/D13, D08, D09, M07, M11, M05 et dashboard.

### PR et migration

- PR : `sessions`, `scheduling`, propositions, votes et lecture planning.
- Migration : `time_proposals`, `time_votes`, `game_sessions`, contraintes uniques `(proposalId,userId)`, index dates/partie et statuts.

## F07 — Présence, absence et notifications Discord

### Objectif

Permettre de signaler une absence à une séance et de notifier le MJ via une intégration Discord maîtrisée ; permettre ensuite la validation de présence.

### Dépendances

F01, F04 et F06.

### Règles métier

- Seul un participant autorisé peut signaler son absence pour une séance à laquelle il appartient.
- La demande crée un événement d’absence et une notification au MJ ; elle ne modifie pas directement le roster.
- Le canal de notification doit être autorisé par l’architecture du Bot, avec permissions minimales et contenu non confidentiel.
- Les notifications sont idempotentes, limitées, réessayables avec gestion des erreurs/rate limits Discord.
- La validation de séance et présence est réservée au MJ selon la matrice d’autorisation.

### Critères d’acceptation

- Le participant signale son absence depuis desktop et mobile, confirme l’action et voit son état.
- Le MJ reçoit au plus une notification pour le même événement logique, sans token ni contenu sensible.
- Un non-membre, un autre utilisateur ou une séance annulée ne peut pas signaler l’absence.
- Le MJ valide une séance ; les présences sont persistées et deviennent l’entrée du calcul XP ultérieur.

### Tests à écrire en premier — Red

- Autorisation membre/non-membre et séance d’une autre partie.
- Rejeu de la requête et retry Discord sans message en double.
- Échec de notification sans perte de l’événement local ni fuite d’exception.

### Tests nécessaires

- Unitaires : transitions attendance, clé d’idempotence, composition sobre du message et politique de retry.
- Intégration : `session_attendance`, transaction de validation, outbox/file si nécessaire.
- API : absence, validation, erreurs 401/403/404/409/429 et réponse sans données sensibles.
- Composants : bouton, dialog de confirmation, statut présence/absence et notification d’échec.
- E2E : signalement desktop/mobile, réception Discord simulée et validation MJ.

### Contrôles de sécurité

CSRF, autorisation par ressource, rate limiting absence/notification, échappement et longueur du message Discord, protection `@everyone`/`@here`, secrets du Bot hors dépôt, permissions minimales, logs corrélés sans données personnelles inutiles.

### Écrans concernés

D09, D05, M07 et dashboard ; notifications applicatives du shell.

### PR et migration

- PR : attendance, service de notification Discord, idempotence et journal d’événements.
- Migration : `session_attendance`, `notifications`, clés d’idempotence/outbox si retenues ; migration réversible et examinée.

## F08 — Dashboard et gestion MJ

### Objectif

Faire du dashboard le point d’entrée authentifié et fournir à un MJ la gestion de ses parties, candidatures, roster et séances.

### Dépendances

F02, F04, F06 et F07.

### Règles métier

- Le dashboard agrège prochaine séance, parties actives, candidatures, invitations, votes à traiter, absence et résumé XP sans réimplémenter les règles métier.
- La gestion MJ est limitée aux parties dont l’utilisateur est propriétaire ; les onglets n’accordent aucun privilège par eux-mêmes.
- Le MVP n’inclut pas de chat temps réel ; un éventuel message de candidature reste limité au workflow défini.
- Les états loading, empty, error et notifications sont explicites.

### Critères d’acceptation

- Le joueur et le MJ voient un dashboard adapté à leurs droits et à leurs données.
- Le MJ peut passer de la vue d’ensemble au roster, candidatures et séances sans accéder à une autre partie.
- Les compteurs et liens sont cohérents avec les modules sources et ne révèlent pas de données d’autrui.
- Le dashboard ne bloque pas si un agrégat secondaire échoue ; une erreur partielle est signalée proprement.

### Tests à écrire en premier — Red

- Projection joueur/MJ, refus d’une autre partie, agrégat vide et échec partiel.
- Test anti-régression : changement de statut d’une candidature ou séance met à jour les compteurs attendus.

### Tests nécessaires

- Unitaires : agrégateurs et politique de visibilité par rôle.
- Intégration : requêtes multi-modules, projections minimales et transaction des actions MJ.
- API : dashboard, routes de gestion, autorisations et erreurs stables avec `requestId`.
- Composants : cartes de prochaine séance, listes, timeline, onglets, compteurs, skeletons et états vides.
- E2E : utilisateur ouvre son dashboard ; MJ administre sa partie et un autre MJ est refusé.

### Contrôles de sécurité

Authorization matrix, refus par défaut, IDOR, projection sans secrets/données privées, rate limiting des agrégats, XSS des messages affichés, logs des actions sensibles et headers CSP.

### Écrans concernés

D12, M10, M01, D08, D06, D09/M07 et menu utilisateur.

### PR et migration

- PR : agrégations dashboard, gestion MJ, états UI et raccordement aux modules précédents.
- Migration : aucune nouvelle table obligatoire ; ajouter uniquement les index justifiés après mesure, sans migration destructive.

## F09 — XP, niveaux et historique

### Objectif

Attribuer de l’XP de manière traçable, transactionnelle et idempotente après séance validée, puis calculer le niveau depuis une table de seuils.

### Dépendances

F06, F07 et F08.

### Règles métier

- `xp_events` est la source d’audit ; le compteur utilisateur est une projection et non l’unique historique.
- Présence validée à une séance : valeur MVP paramétrable ; création de première partie MJ et participation sont des événements distincts si retenus.
- Une validation rejouée ne double pas l’événement ; contrainte DB et clé métier idempotente obligatoires.
- Le niveau est recalculé à partir de l’XP cumulée et d’une table de seuils versionnée/configurable.
- Les absences annoncées ne donnent pas d’XP dans la proposition MVP ; aucune pénalité non spécifiée.

### Critères d’acceptation

- Une séance validée crée un événement XP pour chaque participant présent et recalcule son niveau.
- Une double validation ou un retry ne crée pas de doublon.
- L’historique affiche montant, raison et date sans permettre au client de fixer `xp` ou `level`.
- Les valeurs et seuils peuvent évoluer sans effacer l’historique.

### Tests à écrire en premier — Red

- Attribution nominale, absent exclu, séance non validée et calcul de seuil.
- Rejeu/idempotence, double validation concurrente et échec transactionnel sans effet partiel.
- Tentative client de modifier XP/niveau et accès à l’historique d’un autre utilisateur.

### Tests nécessaires

- Unitaires : calcul niveau, seuils, événements et règles de montant.
- Intégration : transaction validation→XP, contrainte unique et reconstruction du compteur depuis journal.
- API : `/profile/xp`, réponse paginée, 401/403/404, champs en lecture seule.
- Composants : barre XP, niveau, historique, état vide et message d’erreur.
- E2E : séance validée, XP visible dans profil/dashboard et rejeu sans progression supplémentaire.

### Contrôles de sécurité

Autorisation historique, mass assignment refusé, transaction/idempotence, rate limiting des actions MJ, logs d’audit sans données inutiles et validation serveur des paramètres de pagination.

### Écrans concernés

D10, M08, D12, M10 et écran de validation MJ.

### PR et migration

- PR : `gamification`, événements XP, seuils/niveaux et composants de progression.
- Migration : `xp_events`, éventuelle table de seuils/configuration ; index `(userId, createdAt)` et contrainte idempotence.

## F10 — Responsive, accessibilité et états UI

### Objectif

Harmoniser les écrans du MVP avec le système de design, compléter les vues mobiles manquantes et garantir les états et interactions accessibles.

### Dépendances

Les modules métiers F01 à F09 doivent fournir des contrats stables ; les écrans peuvent être traités par sous-PR uniquement si elles restent cohérentes avec cette PR de polish.

### Règles métier et design

- Un seul `AppHeader`, une seule navigation desktop/mobile, un seul menu utilisateur et un footer public partagé.
- Logo officiel uniquement ; aucune variante Stitch.
- 4 colonnes mobile, 8 tablette, 12 desktop ; planning mois desktop et agenda mobile.
- Compléter création, détail et gestion MJ en mobile, absents des maquettes, sans inventer de nouvelle règle produit.
- Respecter clavier, focus, contrastes, labels, zones tactiles, annonces d’erreur et `prefers-reduced-motion`.

### Critères d’acceptation

- Chaque écran du MVP fonctionne aux largeurs mobile, tablette et desktop prévues.
- Les composants communs ont une apparence et des états cohérents ; aucun header indépendant n’est créé.
- Les états loading/empty/error, notifications et confirmations existent pour les parcours critiques.
- Les contrôles principaux sont utilisables au clavier et les tests d’accessibilité ne signalent pas de violation critique.
- Les points ouverts de l’audit (thème landing, wording VTT, catalogue mobile, confidentialité profils) sont validés avant de figer les écrans concernés.

### Tests à écrire en premier — Red

- Tests de composants sur navigation active, filtres, tags, formulaires, votes, disponibilités et états UI.
- Tests responsive des écrans et tests clavier/focus/lecteur d’écran sur actions critiques.
- Test empêchant l’usage du SVG officiel comme image modifiée ou d’un logo textuel de remplacement.

### Tests nécessaires

- Unitaires : tokens/utilitaires de formatage date, fuseau et état.
- Intégration : rendu shell partagé et communication des erreurs API.
- API : aucune règle nouvelle ; rejouer les contrats et headers.
- Composants : couverture complète des composants listés dans `design-system.md`, y compris loading/empty/error.
- E2E : parcours critiques desktop/mobile, zoom, clavier, vote, absence, candidature et création.

### Contrôles de sécurité

Conserver CSP, échappement React, aucune dépendance au hover, aucun secret dans le HTML, vérification des liens externes/images et absence de fuite dans les métadonnées.

### Écrans concernés

Tous les écrans D01–D13 et M01–M11, avec priorité aux trois vues mobiles manquantes.

### PR et migration

- PR : composants UI, shell, responsive, accessibilité, états et documentation visuelle.
- Migration : aucune.

## F11 — Durcissement release, sauvegardes et exploitation

### Objectif

Préparer une release MVP vérifiable : sécurité transversale, observabilité, sauvegardes/restauration, dépendances et déploiement Docker.

### Dépendances

Toutes les fonctionnalités précédentes.

### Règles métier et opérationnelles

- Main protégée, PR obligatoire, revue humaine, CI verte avant fusion.
- Logs JSON structurés et corrélés par `requestId`, sans tokens, cookies, secrets ou données personnelles inutiles ; durée de conservation définie.
- Erreurs publiques sobres, pas de stack trace, SQL, chemin interne ou secret.
- PostgreSQL compte applicatif sans privilèges admin, réseau interne, TLS si distant, migrations et rollback documentés.
- Sauvegardes chiffrées, accès restreint, fréquence/rétention/RPO/RTO définis et restauration réellement testée.
- Dépendances pnpm, actions GitHub et images épinglées/scannées ; SBOM avant production.
- Procédure RGPD : finalité, minimisation, confidentialité, export, suppression, anonymisation et gestion d’incident.

### Critères d’acceptation

- La checklist de `docs/security/security-requirements.md` est remplie et jointe à la PR.
- Les scans secrets/dépendances/SAST/images sont verts ou chaque exception est documentée et approuvée.
- Une sauvegarde peut être restaurée sur une base isolée et le résultat est vérifié.
- Les headers HTTPS/CSP/HSTS/nosniff/frame-ancestors/referrer/permissions sont contrôlés sur Next.js et Hono.
- Les tableaux de bord de logs/erreurs surveillent web, API, PostgreSQL, tâches Discord et saturation sans exposer de données personnelles.
- Une vérification manuelle couvre responsive, SEO public, flux Discord simulé, planning, absence, concurrence et XP.

### Tests à écrire en premier — Red

- Tests des headers, erreurs publiques, permissions CI et absence de secrets dans artefacts/logs.
- Test de restauration depuis une sauvegarde de test et contrôle de cohérence des données.
- Tests de non-régression E2E des neuf scénarios critiques du cahier des charges.

### Tests nécessaires

- Unitaires : redaction de logs, classification de données et politique de rétention.
- Intégration : migrations up/down sur base de test, contraintes, backup/restore et comptes DB minimaux.
- API : erreurs centralisées, headers, rate limiting et `requestId`.
- Composants : pages d’erreur, consentement/ confidentialité si nécessaire, états offline/indisponibilité.
- E2E : connexion, SSR public, création, candidature, invitation, vote, planning, absence et XP.

### Contrôles de sécurité

Repasser toute la checklist sécurité : OAuth/session/CSRF, authz/IDOR, Zod, XSS/CSP, rate limiting, secrets/logs, PostgreSQL, Docker, CI, sauvegardes, restauration, RGPD, transactions et idempotence. Aucune vulnérabilité critique/élevée connue, protection désactivée ou migration destructive non examinée ne doit rester.

### Écrans concernés

Tous les écrans et toutes les routes publiques/privées ; cette étape ne doit pas introduire de nouvelle fonctionnalité produit.

### PR et migration

- PR : scans, durcissement, observabilité, backup/restore, runbooks et dossier de release.
- Migration : uniquement migrations déjà approuvées, revues et testées sur base de test ; aucun changement destructif sans validation humaine explicite.

## Ordre recommandé des sprints

Le backlog du cahier des charges est conservé sous une forme TDD et PR-isolée :

| Sprint | Fonctionnalités | Résultat |
| --- | --- | --- |
| S0 | F00 | Environnement reproductible et CI |
| S1 | F01 | Auth Discord et session sécurisée |
| S2 | F02–F03 | Parties, tags, catalogue public et SEO de base |
| S3 | F04 | Candidatures, roster et invitations |
| S4 | F05 | Disponibilités et recherche joueurs |
| S5 | F06 | Séances, votes et planning |
| S6 | F07 | Absence et notification Discord |
| S7 | F08 | Dashboard et gestion MJ |
| S8 | F09 | XP, niveaux et historique |
| S9 | F10 | Responsive, accessibilité, états et performance |
| S10 | F11 | E2E final, sécurité, sauvegarde, restauration et release |

## Limites explicites du MVP

Ne pas inclure sans demande explicite : VTT, cartes/tokens/jets synchronisés, chat temps réel complet, paiement/abonnement, application mobile native, calendrier externe, RAG, assistant IA, réputation complexe, matchmaking avancé et bot Discord avancé au-delà des notifications nécessaires.

La création d’une partie doit néanmoins modéliser correctement le type, les tags, le fuseau, la planification et les séances. Le choix final du thème landing, le wording du mode en ligne et le périmètre public du catalogue mobile sont des validations humaines préalables à leur figement visuel.

## Definition of Done par PR

Une PR n’est proposée comme terminée que si ses critères sont satisfaits, les tests ont été écrits avant le code et ont d’abord échoué, les nouveaux et anciens tests passent, TypeScript/lint/build sont verts, la sécurité est vérifiée, les migrations sont revues, la documentation et les commentaires sont à jour, le responsive et l’accessibilité ont été contrôlés, le diff ne contient aucun secret/fichier parasite, et la PR fournit la preuve TDD, la section Sécurité, les commandes, les résultats, les limites et les vérifications manuelles.
