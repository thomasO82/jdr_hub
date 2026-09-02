# JDR HUB

Plan de conception — MVP (version 4)

Application web de gestion de parties de jeu de rôle

> **Next.js • Hono • Drizzle ORM • PostgreSQL • Docker • Discord OAuth2**

Document de cadrage technique et fonctionnel

Version MVP — septembre 2026

# 1. Vision du produit

JDR Hub est une application web destinée à simplifier l'organisation de parties de jeu de rôle. Elle centralise la recherche de parties et de joueurs, la gestion des inscriptions, les disponibilités, la planification des séances et la communication avec le MJ. Une couche légère de gamification récompense la participation aux parties et fait progresser les joueurs par niveaux.

Le MVP doit privilégier trois qualités : une UX immédiatement compréhensible, une interface responsive et une architecture suffisamment propre pour permettre l'ajout ultérieur de fonctionnalités sans devoir réécrire le socle.

## Objectifs MVP

- Connexion rapide via Discord, sans gestion de mot de passe local.

- Créer, découvrir, filtrer, rejoindre et administrer des parties.

- Rendre indexables les pages publiques utiles grâce au rendu serveur de Next.js.

- Filtrer les parties dès le MVP par tags, nom de partie et nom du MJ.

- Gérer les candidatures et les invitations.

- Planifier les séances avec propositions de créneaux et votes.

- Déclarer ses disponibilités récurrentes et les exploiter pour la recherche.

- Afficher un planning personnel clair.

- Prévenir automatiquement le MJ d'une absence via Discord.

- Rechercher des joueurs par nom et compatibilité de disponibilité.

- Attribuer de l'XP après une séance validée et faire progresser les niveaux.

## Principe produit

Le produit ne doit pas essayer de devenir un VTT (Virtual Tabletop) dans le MVP. Il s'agit avant tout d'un « gestionnaire social et logistique » de parties.

# 2. Périmètre fonctionnel

| ID | Fonctionnalité | Priorité | MVP |
| --- | --- | --- | --- |
| F01 | Inscription / connexion via Discord | Must | Oui |
| F02 | Créer une partie | Must | Oui |
| F03 | Lister, rechercher et filtrer les parties par tags, MJ ou nom | Must | Oui |
| F04 | Postuler à une partie | Must | Oui |
| F05 | Manager ses parties | Must | Oui |
| F06 | Inviter des joueurs | Must | Oui |
| F07 | Planning visuel | Must | Oui |
| F08 | Déclarer une absence + notification Discord | Should | Oui |
| F09 | Proposer des créneaux + vote des joueurs | Must | Oui |
| F10 | Disponibilités préférées | Must | Oui |
| F11 | Recherche de joueurs par nom/disponibilité | Should | Oui |
| F12 | XP + niveaux après les séances | Should | Oui |

## Hors MVP

- Chat temps réel complet dans l'application.

- VTT : cartes, tokens, jets de dés synchronisés, feuilles de personnages.

- Paiement / abonnement.

- Système complexe de rôles communautaires.

- Matchmaking algorithmique avancé.

- Notifications push mobiles natives.

- Import automatique des calendriers Google/Outlook.

# 3. Rôles et parcours principaux

| Rôle | Besoin principal | Actions |
| --- | --- | --- |
| Utilisateur / joueur | Trouver et rejoindre des parties compatibles | Rechercher, postuler, voter, confirmer, signaler absence |
| MJ | Organiser une campagne sans multiplier les outils | Créer, inviter, accepter/refuser, planifier, valider séance, attribuer XP |
| Utilisateur + MJ | Pouvoir jouer et maîtriser | Un même compte peut avoir les deux usages |
| Admin technique | Maintenir le service | Modération, logs, paramètres, sécurité |

## Parcours A — rejoindre une partie

1. Accueil → Connexion Discord.

1. Liste des parties → recherche par nom et filtres par tags, MJ, jeu, date, format, niveau et places.

1. Fiche partie → détails du MJ, description, horaires, places.

1. Postuler → message facultatif → candidature en attente.

1. Le MJ accepte → le joueur rejoint le roster.

1. Le joueur reçoit la partie dans son planning.

## Parcours B — créer et planifier une partie

1. Créer une partie → titre, système, description, nombre de joueurs, mode, fuseau horaire.

1. Choisir un mode de planification : date fixe ou recherche de créneau.

1. Si recherche de créneau : le MJ propose plusieurs plages.

1. Les joueurs votent selon leurs disponibilités.

1. Le MJ choisit le créneau gagnant.

1. La séance apparaît dans le planning de tous les participants.

# 4. UX / UI — direction du MVP

L'interface doit être sobre et moderne, avec une identité « fantasy légère » sans tomber dans le médiéval chargé. L'utilisateur doit pouvoir comprendre la fonction d'une page en quelques secondes.

## Palette proposée

| Usage | Couleur | Hex |
| --- | --- | --- |
| Primaire | Bleu ardoise | #37474F |
| Secondaire | Bleu gris | #546E7A |
| Accent | Violet fantasy | #7E57C2 |
| Succès | Vert | #43A047 |
| Alerte | Orange | #FB8C00 |
| Erreur | Rouge | #E53935 |
| Fond | Gris très clair | #F5F7F8 |
| Surface | Blanc | #FFFFFF |

## Règles UI

- Navigation principale : Tableau de bord, Parties, Joueurs, Planning, Profil.

- Desktop : sidebar ou top navigation compacte ; mobile : bottom navigation ou menu hamburger.

- Cartes de parties avec tags visibles, statut, nom du MJ, nombre de places et prochain créneau.

- La liste des parties propose une barre de recherche par nom, un filtre MJ et un sélecteur multi-tags combinables.

- CTA principal unique par écran (« Créer une partie », « Postuler », « Voter »…).

- Feedback systématique : toast après action, état vide explicite, skeleton pendant chargement.

- Contrastes accessibles et tailles tactiles adaptées au mobile.

- Calendrier responsive : vue mois sur desktop, agenda/liste sur mobile.

## Écrans du MVP

| Écran | Contenu clé |
| --- | --- |
| Landing / Login | Présentation courte + bouton « Continuer avec Discord » |
| Dashboard | Prochaines parties, candidatures, invitations, résumé XP |
| Liste des parties | Recherche par nom, filtre MJ, multi-tags, filtres complémentaires, cartes et pagination |
| Détail partie | Description, MJ, joueurs, créneaux, candidature |
| Créer / éditer partie | Formulaire, type, tags et règles de planification |
| Gestion MJ | Candidatures, invitations, roster, séances |
| Planning | Calendrier personnel + séances |
| Disponibilités | Grille jours × horaires |
| Joueurs | Recherche nom + filtres de disponibilité |
| Profil | Pseudo Discord, niveau, XP, disponibilité, parties |

# 5. Architecture technique

Architecture recommandée : un monorepo modulaire avec deux applications déployables. Next.js (App Router) porte l'interface responsive et le rendu web. Hono expose une API REST dédiée, Drizzle gère PostgreSQL et Docker fournit un environnement reproductible. Cette séparation conserve un backend Hono clair sans transformer prématurément le projet en microservices. Les pages publiques sont rendues côté serveur par Next.js, qui appelle Hono côté serveur afin d'envoyer aux moteurs de recherche un HTML complet.

```text
[ Navigateur ]
      │ HTTPS
      ▼
[ Reverse Proxy / Caddy ]
      ├────────► [ Web Next.js ]
      │                 │ appels REST
      │                 ▼
      └────────► [ API Hono ]
                        ├──► [ Drizzle ] ──► [ PostgreSQL ]
                        ├──► [ Discord OAuth2 ]
                        └──► [ Discord Bot ]
```

## Stack

| Couche | Choix | Responsabilité |
| --- | --- | --- |
| Frontend | Next.js (App Router) + TypeScript | UI responsive, App Router, SSR/Server Components, métadonnées SEO et consommation de l'API Hono |
| Backend | Hono + TypeScript | API REST séparée, auth et règles métier |
| ORM | Drizzle ORM | Schéma SQL typé, requêtes, migrations |
| DB | PostgreSQL | Données applicatives |
| Auth | Discord OAuth2 | Identité et connexion |
| Discord | Discord Bot / API | Notifications d'absence, invitations si besoin |
| Validation | Zod | Validation des entrées API |
| Containerisation | Docker + Compose | Dev / staging / production |
| Reverse proxy | Nginx ou Caddy | HTTPS, routage, assets |

## Structure backend recommandée

```text
apps/
  web/                         # Next.js — App Router
    app/
      (auth)/
      dashboard/
      games/
      players/
      planning/
      profile/
    components/
    features/
    lib/api/
  api/                         # Hono — API REST
    src/
      modules/
        auth/
        users/
        games/
        tags/
        sessions/
        applications/
        invitations/
        availability/
        scheduling/
        notifications/
        gamification/
      db/
        schema/
        migrations/
      middleware/
      lib/
      index.ts
packages/
  shared/                      # contrats Zod et types partagés
docker/
  compose.yml
```

L'objectif est de séparer les modules métier plutôt que de créer un énorme dossier controllers/services. Chaque module peut contenir ses routes, schémas de validation, services et accès aux données.

# 6. Modèle de données

Le modèle doit distinguer une « partie » (Game) d'une « séance » (GameSession). Une partie représente la campagne/activité organisée ; une séance représente une occurrence jouée à une date donnée.

| Table | Champs principaux | Rôle |
| --- | --- | --- |
| users | id, discordId, username, avatarUrl, timezone, xp, level, createdAt | Compte utilisateur |
| games | id, ownerId, title, system, description, type, maxPlayers, status, visibility | Partie/campagne |
| game_members | gameId, userId, role, status, joinedAt | Roster de joueurs/MJ |
| applications | id, gameId, userId, message, status, createdAt | Candidatures |
| invitations | id, gameId, inviterId, inviteeId, status, expiresAt | Invitations |
| availability_rules | id, userId, dayOfWeek, startMinute, endMinute | Disponibilités récurrentes |
| time_proposals | id, gameId, proposerId, startsAt, endsAt, status | Créneaux proposés |
| time_votes | proposalId, userId, vote | Votes sur les créneaux |
| game_sessions | id, gameId, startsAt, endsAt, status, notes | Séances réellement planifiées |
| session_attendance | sessionId, userId, status | Présence/absence |
| xp_events | id, userId, sessionId, amount, reason, createdAt | Historique XP |
| notifications | id, userId, type, payload, readAt | Notifications applicatives |
| tags | id, name, slug, isActive, createdAt | Référentiel des tags filtrables |
| game_tags | gameId, tagId | Association plusieurs-à-plusieurs entre parties et tags |

## Relations principales

```text
users 1 ─── N games                    (MJ / owner)
users N ─── N games                      (game_members)
games N ─── N tags                       (game_tags)
games 1 ─── N applications
games 1 ─── N invitations
users 1 ─── N availability_rules
games 1 ─── N time_proposals
time_proposals 1 ─── N time_votes
games 1 ─── N game_sessions
game_sessions 1 ─── N session_attendance
users 1 ─── N xp_events
```

## Décisions de conception importantes

- Utiliser UUID pour les identifiants publics.

- Conserver discordId comme identifiant externe unique, sans utiliser l'ID Discord comme clé primaire.

- Stocker les horaires en UTC en base et conserver le fuseau horaire utilisateur.

- Stocker les disponibilités comme jour de semaine + minute de début/fin dans le fuseau préféré de l'utilisateur.

- Ne jamais calculer l'XP uniquement à partir d'un compteur : conserver un journal xp_events pour l'audit et les futurs bonus.

- Utiliser des statuts explicites plutôt que des booléens quand plusieurs états métier existent.

- Modéliser les tags dans une table dédiée avec une table de liaison game_tags et un slug unique normalisé.

# 7. API REST — contrat initial

| Méthode | Route | But |
| --- | --- | --- |
| GET | /auth/discord | Démarrer OAuth2 Discord |
| GET | /auth/discord/callback | Callback OAuth2 |
| POST | /auth/logout | Déconnexion |
| GET | /me | Utilisateur courant |
| GET | /games | Lister/rechercher : q (nom), gmId ou gmName, tagSlugs[], autres filtres |
| POST | /games | Créer une partie |
| GET | /games/:id | Détail partie |
| PATCH | /games/:id | Modifier partie |
| DELETE | /games/:id | Archiver/supprimer partie |
| POST | /games/:id/applications | Postuler |
| GET | /games/:id/applications | Voir candidatures — MJ |
| PATCH | /applications/:id | Accepter/refuser |
| POST | /games/:id/invitations | Inviter un joueur |
| PATCH | /invitations/:id | Accepter/refuser invitation |
| GET | /availability | Lire disponibilités |
| PUT | /availability | Remplacer disponibilités |
| POST | /games/:id/proposals | Créer une proposition horaire |
| POST | /proposals/:id/votes | Voter pour un créneau |
| POST | /games/:id/sessions | Créer/valider une séance |
| GET | /planning | Planning personnel |
| POST | /sessions/:id/absence | Déclarer une absence |
| GET | /players | Rechercher des joueurs |
| GET | /profile/xp | Historique XP / niveau |
| GET | /tags | Lister les tags actifs disponibles dans les filtres |
| GET | /public/games/:slug | Données publiques d'une partie pour le rendu serveur Next.js |
| GET | /public/gms/:slug | Profil public d'un MJ et ses parties ouvertes |

## Convention de réponse

```text
{
  "data": {...},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

Les erreurs doivent utiliser des codes HTTP cohérents (400 validation, 401 non authentifié, 403 interdit, 404 absent, 409 conflit métier, 429 rate limit, 500 erreur interne) et un format d'erreur stable.

# 8. Intégration Discord

## Connexion

1. Le navigateur redirige vers Discord OAuth2.

1. Le backend vérifie le callback et récupère l'identité Discord.

1. Création ou mise à jour du compte local.

1. Création d'une session applicative sécurisée.

1. Le token Discord ne doit pas être exposé au frontend.

## Absence → message Discord

Pour envoyer un message au MJ, privilégier un Bot Discord installé sur un serveur ou une stratégie de notification autorisée. Le MVP doit éviter de dépendre d'un simple webhook si le destinataire est un utilisateur individuel.

```text
Joueur clique « Signaler mon absence »
        ↓
API vérifie appartenance + séance
        ↓
Création de l'événement d'absence
        ↓
Notification Discord au MJ
        ↓
Confirmation dans l'interface
```

## Données Discord minimales

- discordId

- username / global display name

- avatar

- éventuellement les informations nécessaires au Bot pour notifier

# 9. Moteur de disponibilités et planification

C'est une fonctionnalité centrale. Il faut distinguer les disponibilités personnelles récurrentes et les créneaux ponctuels proposés pour une partie.

## Disponibilité utilisateur

- Exemple : lundi 18:00–22:00, mercredi 19:00–23:00, samedi 14:00–23:00.

- L'utilisateur peut modifier ses plages à tout moment.

- Le fuseau horaire du profil sert de référence.

- Une disponibilité ne signifie pas qu'un joueur est libre à 100 % : elle représente sa préférence/compatibilité.

## Vote de créneau

| Vote | Signification |
| --- | --- |
| Oui | Le joueur est disponible et souhaite le créneau |
| Peut-être | Compatible mais non garanti |
| Non | Indisponible |
| Sans réponse | Pas encore voté |

Le score d'un créneau peut être affiché simplement : nombre de Oui / Peut-être / Non. Le MVP laisse le MJ choisir ; il ne faut pas automatiser le choix sans règle claire.

# 10. Gamification XP / niveaux

La gamification doit rester légère : elle récompense la participation et la fiabilité sans transformer l'application en jeu concurrentiel.

| Événement | XP MVP proposée |
| --- | --- |
| Séance jouée / présence validée | +100 XP |
| Première partie créée comme MJ | +150 XP |
| Participation à une nouvelle partie | +25 XP |
| Absence annoncée à l'avance | +0 XP |
| Absence non signalée | 0 XP / éventuelle pénalité future |

Ces valeurs sont des paramètres produit et devront être facilement modifiables.

## Formule de niveau

```text
XP cumulée → niveau calculé à partir d'une table de seuils.

Exemple MVP :
Niveau 1 : 0 XP
Niveau 2 : 250 XP
Niveau 3 : 600 XP
Niveau 4 : 1 100 XP
Niveau 5 : 1 750 XP
...
```

Ne pas supprimer ou écraser l'historique xp_events. Cela permettra ensuite d'ajouter badges, saisons, bonus MJ, achievements ou classement sans modifier le modèle de base.

# 11. Sécurité et règles métier

- Toutes les routes sensibles nécessitent une authentification.

- Vérifier côté serveur que seul le propriétaire/MJ peut modifier une partie.

- Un joueur ne peut pas s'auto-ajouter au roster si le workflow impose une candidature.

- Empêcher les candidatures multiples sur la même partie.

- Empêcher les votes multiples sur le même créneau.

- Limiter les invitations et actions sensibles par rate limiting.

- Valider toutes les entrées avec Zod.

- Échapper/sanitizer les contenus affichés pour éviter XSS.

- Utiliser des cookies de session sécurisés (HttpOnly, Secure, SameSite adapté).

- Ne jamais stocker les secrets Discord dans le dépôt Git.

- Variables d'environnement séparées dev/staging/prod.

- Journaliser les actions importantes : création, acceptation, invitation, séance validée, XP.

# 12. Docker et environnement

Le développement local doit pouvoir démarrer avec une commande.

```text
docker compose up -d

Services MVP :
- postgres
- api-hono
- web-next
- reverse-proxy (optionnel en local)
```

## Organisation des fichiers

```text
/
  apps/
    web/        # Next.js
    api/        # Hono
  packages/
    shared/
  docker-compose.yml
  .env.example
  package.json
  pnpm-workspace.yaml
  README.md
```

Le projet peut être géré en monorepo pnpm. Le package shared contient les types et contrats réellement partagés, sans coupler le frontend aux détails internes de l'API.

# 13. Tests et qualité

| Niveau | Outil / stratégie | Exemples |
| --- | --- | --- |
| Unit | Vitest | Calcul XP, règles de disponibilité, permissions |
| API | Vitest + Hono test client | Routes, validation, auth, statuts HTTP |
| DB | PostgreSQL de test | Contraintes, relations, requêtes Drizzle |
| E2E | Playwright | Connexion, candidature, vote, planning |
| Lint | ESLint | Qualité TypeScript |
| Format | Prettier | Uniformité |
| CI | GitHub Actions | Lint + tests + build |

## Scénarios E2E critiques

- Un utilisateur se connecte via Discord et son profil est créé.

- Une fiche publique de partie renvoie un HTML complet avec title, description, canonical et Open Graph.

- Un MJ crée une partie et la retrouve dans la liste.

- Un joueur postule et le MJ accepte.

- Un MJ invite un joueur et celui-ci accepte.

- Le MJ propose trois créneaux et les joueurs votent.

- Le créneau retenu apparaît dans le planning.

- Un joueur signale son absence et le MJ reçoit une notification Discord.

- Le MJ valide une séance et les participants reçoivent leur XP.

# 14. Backlog de développement

| Sprint | Objectif | Livrables |
| --- | --- | --- |
| S0 | Socle | Monorepo, Next.js, Hono, Docker, PostgreSQL, Drizzle, CI, variables env |
| S1 | Auth | Discord OAuth2, session, profil minimal |
| S2 | Parties | CRUD partie, tags, recherche par nom/MJ, filtres multi-tags, détail |
| S3 | Participation | Candidatures, roster, invitations |
| S4 | Disponibilités | Profil de disponibilité, recherche joueur |
| S5 | Planning | Séances, calendrier, fuseaux horaires |
| S6 | Vote | Créneaux, votes, choix final MJ |
| S7 | Discord | Notifications d'absence et événements utiles |
| S8 | Gamification | Présence, XP, niveaux, historique |
| S9 | Polish & SEO | Responsive, accessibilité, SSR public, métadonnées, sitemap, robots, Open Graph, états vides et performance |
| S10 | Release | E2E, sécurité, backup DB, monitoring, déploiement |

# 15. Critères d'acceptation MVP

- Un utilisateur peut se connecter avec Discord sans créer de mot de passe local.

- Un MJ peut créer et modifier une partie.

- Une partie peut être visible dans la liste selon sa visibilité.

- Un utilisateur peut rechercher une partie par son nom, filtrer par MJ et sélectionner un ou plusieurs tags.

- Un joueur peut déposer une candidature et voir son statut.

- Le MJ peut accepter/refuser une candidature.

- Le MJ peut inviter un joueur.

- Un utilisateur voit ses parties et séances dans un planning responsive.

- Un utilisateur peut définir plusieurs disponibilités récurrentes.

- Le MJ peut proposer plusieurs créneaux et les joueurs peuvent voter.

- Le système affiche clairement le résultat des votes.

- Un joueur peut signaler son absence pour une séance.

- Le MJ reçoit une notification Discord pour une absence.

- Un MJ peut valider une séance jouée.

- La validation d'une séance crée un événement XP pour les participants présents.

- Le niveau est recalculé à partir de l'XP cumulée.

- Les pages privées et les combinaisons de filtres sans valeur éditoriale sont en noindex.

- Un sitemap.xml et un robots.txt cohérents sont générés par Next.js.

- Chaque page publique possède une URL lisible, un title, une meta description, une URL canonique et des balises Open Graph.

- Les pages publiques de partie, de MJ, de jeu et de tag sont rendues côté serveur et consultables sans connexion Discord.

- L'application fonctionne correctement sur mobile, tablette et desktop.

# 16. Découpage Must / Should / Could

| Must have | Should have | Could later |
| --- | --- | --- |
| Discord OAuth2 | Notification Discord | Badges |
| CRUD parties + tags | Recherche joueurs | Classements |
| Candidatures | XP / niveaux | Achievements |
| Invitations | Suggestions de tags | Calendrier externe |
| Disponibilités | Historique activité | Bot Discord avancé |
| Vote créneaux | Préférences UI | VTT |
| Planning | Rappels automatiques | Chat temps réel |

# 17. Risques techniques à traiter tôt

| Risque | Impact | Décision |
| --- | --- | --- |
| OAuth Discord | Élevé | Tester le flux complet dès S1 |
| Fuseaux horaires | Élevé | UTC en DB + timezone utilisateur |
| Disponibilités | Élevé | Modèle explicite jour/minute |
| Notifications Discord | Moyen/élevé | Valider l'architecture Bot dès le début |
| Concurrence sur candidatures/votes | Moyen | Contraintes DB + transactions |
| Gamification exploitable | Moyen | Journal xp_events immuable |
| Responsive calendrier | Moyen | Vue mobile dédiée plutôt que simple shrink |
| Filtres et tags | Moyen | Index DB sur title normalisé, ownerId, tag slug et game_tags ; pagination serveur |

# 18. Definition of Done

- Fonctionnalité accessible via UI et API.

- Validation serveur en place.

- Permissions testées.

- États loading / empty / error gérés.

- Pour une page publique : HTML serveur, métadonnées, canonical, Open Graph et règle d'indexation vérifiés.

- Responsive desktop + mobile.

- Tests unitaires/API pour les règles métier.

- Au moins un scénario E2E pour les parcours critiques.

- Logs utiles et aucune donnée sensible dans les logs.

- Documentation README mise à jour.

# 19. Recommandation d'architecture finale

Pour ce projet, je recommande un monorepo pnpm avec Next.js pour le frontend et une API Hono séparée, tous deux en TypeScript, avec Drizzle, PostgreSQL et Docker. Cela garde les responsabilités lisibles, permet à Next.js d'exceller sur l'UX et le rendu, et préserve Hono comme backend métier testable. Il n'est pas nécessaire de passer aux microservices pour le MVP.

Le point architectural le plus important est de séparer les concepts « partie », « séance », « disponibilité », « candidature » et « membre ». Cela évite de construire un modèle trop simpliste qui deviendrait difficile à faire évoluer dès que plusieurs séances et campagnes seront nécessaires.

Pour l'UX, le tableau de bord doit être le point d'entrée : prochaine séance, invitations/candidatures, créneaux à voter, absence à signaler et progression XP. La liste des parties sert à la découverte ; le planning sert à la coordination.

# 20. Évolutions post-MVP

- Campagnes multi-saisons et archivage.

- Fiches de personnages.

- Suggestions automatiques de tags, tags personnalisés modérés et pages publiques dédiées aux tags.

- Recommandation automatique de parties selon disponibilités et préférences.

- Bot Discord complet : rappels, sondages, commandes slash.

- Synchronisation Google Calendar / Outlook.

- Badges et achievements.

- Statistiques de participation.

- Système de réputation / fiabilité avec précautions anti-abus.

- VTT intégré ou intégration externe.

- PWA / application mobile.

# 20. Recherche et système de tags — MVP

Les tags font partie du périmètre MVP. Ils servent à décrire rapidement une partie et à rendre la découverte efficace, notamment pour les genres, ambiances, systèmes ou niveaux d'expérience.

- Lors de la création ou de l'édition, le MJ sélectionne plusieurs tags dans un référentiel contrôlé.

- Exemples : fantasy, horreur, science-fiction, enquête, débutant accepté, roleplay, combat tactique.

- Le type ONE_SHOT ou CAMPAIGN reste un champ métier dédié ; il peut être affiché comme filtre mais ne doit pas être dupliqué comme source de vérité dans les tags.

- La recherche par nom est insensible à la casse ; le filtre MJ cible l'identifiant du MJ quand il est sélectionné et peut proposer une recherche par pseudo.

- Plusieurs tags sélectionnés utilisent par défaut une logique ET : la partie doit posséder tous les tags choisis. L'interface doit l'indiquer clairement.

- Les résultats sont paginés côté serveur et les filtres sont conservés dans l'URL afin de pouvoir partager une recherche.

# 21. Complément métier — cycle de vie d'une partie

Une partie n'est pas une séance. La partie (Game) représente l'aventure ou la campagne organisée par le MJ, tandis qu'une séance (GameSession) représente une occurrence réellement planifiée et jouée. Cette distinction est structurante pour le MVP.

| Type | Définition | Planification | Fin |
| --- | --- | --- | --- |
| ONE_SHOT | Aventure autonome en 1 à 3 séances maximum. | Dates variables, avec propositions et votes possibles. | Fin explicite lorsque l'aventure est terminée. |
| CAMPAIGN | Aventure suivie composée de nombreuses séances. | En général 1 à 2 séances par semaine, planifiées progressivement. | Pas de date de fin obligatoire ; le MJ ferme la campagne. |

## Règles métier

- Une partie possède un type : ONE_SHOT ou CAMPAIGN.

- Un ONE_SHOT peut comporter de 1 à 3 séances maximum.

- Les séances d'un ONE_SHOT peuvent avoir des dates différentes.

- Une campagne n'a pas de nombre maximal de séances dans le MVP.

- Une campagne peut être renouvelée/continuer tant que le MJ ne la ferme pas.

- Le MJ peut fermer une campagne à tout moment ; aucune nouvelle séance ne peut alors être planifiée.

- La fin d'un ONE_SHOT est déterminée par le MJ lorsque l'aventure est terminée.

- Une séance possède son propre statut : PROPOSED, SCHEDULED, COMPLETED, CANCELLED.

- La validation d'une séance COMPLETED déclenche le calcul/attribution de l'XP.

## Modèle conceptuel corrigé

```text
GAME
 ├── type: ONE_SHOT | CAMPAIGN
 ├── status: DRAFT | OPEN | ACTIVE | CLOSED | COMPLETED
 ├── maxPlayers
 ├── ownerId
 └── ...
       │
       └── N GAME_SESSION
              ├── startsAt
              ├── endsAt
              ├── status
              └── attendance

ONE_SHOT
 └── 1 à 3 GAME_SESSION

CAMPAIGN
 └── 1 à N GAME_SESSION
       └── la campagne reste ACTIVE jusqu'à fermeture du MJ
```

## Exemples de fonctionnement

Exemple One-shot

```text
La Crypte Maudite
Type : ONE_SHOT
Maximum : 3 séances

Séance 1 → 12/09
Séance 2 → 19/09
Séance 3 → 26/09

Le MJ termine l'aventure → GAME = COMPLETED
```

Exemple Campagne

```text
Les Chroniques d'Avalon
Type : CAMPAIGN
Rythme souhaité : 1 séance / semaine

05/09 → Séance 1
12/09 → Séance 2
19/09 → Séance 3
26/09 → Séance 4
03/10 → Séance 5
...

Le MJ continue à proposer des séances
La campagne reste ACTIVE
Le MJ ferme la campagne lorsqu'elle est terminée
```

# 22. Planification selon le type de partie

L'UX de planification doit s'adapter au type choisi lors de la création. Le même moteur de créneaux peut être réutilisé, mais les règles et l'affichage diffèrent.

| Aspect | One-shot | Campagne |
| --- | --- | --- |
| Nombre de séances | 1 à 3 | Illimité dans le MVP |
| Date de fin | Oui, quand l'aventure est terminée | Non obligatoire |
| Récurrence | Non obligatoire | 1 à 2 séances/semaine recommandées |
| Créneaux | Ponctuels | Ponctuels, éventuellement proposés régulièrement |
| Fermeture | Fin de l'aventure | Décision du MJ |
| Planning | Quelques séances regroupées | Planning évolutif |
| XP | À chaque séance validée | À chaque séance validée |

# 23. Adaptation de l'interface de création

- Étape 1 : choisir le type de partie — One-shot ou Campagne.

- Pour One-shot : afficher la limite « maximum 3 séances ».

- Pour Campagne : demander un rythme indicatif, par exemple 1 ou 2 séances par semaine.

- Le rythme de campagne est une préférence d'organisation, pas une contrainte technique imposée au calendrier.

- Après création, le MJ peut passer par le même écran « Planifier une séance ».

- Pour une campagne active, l'action principale devient « Proposer la prochaine séance ».

- Pour un one-shot, l'interface affiche également « X / 3 séances planifiées ».

- Lorsque le MJ clôt une campagne ou termine un one-shot, le système bloque les nouvelles candidatures et planifications selon la règle métier choisie.

# 24. Stratégie SEO du MVP

Next.js apporte l'avantage SEO de l'architecture. Hono reste l'API métier et ne pénalise pas le référencement, à condition que Next.js récupère les données côté serveur et produise directement le HTML des pages publiques.

## Pages publiques indexables

- /parties — catalogue principal paginé

- /parties/[slug] — fiche détaillée d'une partie

- /mj/[slug] — profil public d'un MJ et parties ouvertes

- /tags/[slug] — sélection éditoriale par tag

- /jeux/[slug] — parties liées à un système de jeu

## Pages non indexables

- Dashboard, profil privé, planning, gestion MJ, candidatures et invitations.

- Résultats de recherches libres et combinaisons nombreuses de filtres.

- Parties privées, brouillons, campagnes fermées si elles ne doivent plus être publiques.

## Règles d'implémentation Next.js

- Utiliser l'App Router et les Server Components pour les pages publiques.

- Appeler l'API Hono depuis le serveur Next.js avant de générer la réponse HTML.

- Créer les métadonnées dynamiques avec generateMetadata : title, description, canonical et Open Graph.

- Générer sitemap.xml et robots.txt avec les conventions Next.js.

- Utiliser des slugs uniques et lisibles pour les parties, MJ, tags et systèmes de jeu.

- Ajouter une image Open Graph par défaut et permettre une image spécifique pour chaque partie.

- Conserver les filtres UX dans l'URL, mais appliquer noindex aux combinaisons sans page éditoriale dédiée.

- Utiliser la pagination serveur et éviter les pages infinies accessibles uniquement par JavaScript.

- Ajouter des données structurées JSON-LD seulement lorsqu'un vocabulaire Schema.org correspond réellement au contenu.

## Exemple de flux SEO

```text
Google ou Discord ouvre /parties/la-crypte-maudite → Next.js appelle Hono côté serveur → Hono lit PostgreSQL avec Drizzle → Next.js produit le HTML complet et les métadonnées → le robot reçoit immédiatement le titre, la description, le MJ, les tags et les informations publiques de la partie.
```

## Mesures de qualité

- Vérifier que le contenu principal existe dans le HTML initial sans attendre une requête navigateur.

- Tester les aperçus Discord et les balises Open Graph.

- Contrôler les Core Web Vitals, notamment LCP, INP et CLS.

- Éviter les contenus dupliqués avec des URL canoniques cohérentes.

- Ne pas exposer de données privées dans les métadonnées ou le HTML public.
