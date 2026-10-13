# F09 — XP, niveaux et historique

## Statut du design

Design proposé après validation du cadrage fonctionnel le 2026-09-08.

## Objectif

Ajouter une gamification légère et traçable. Lorsqu’un MJ valide une séance,
chaque participant marqué `PRESENT` reçoit l’XP prévue par le MVP. Le total et
le niveau sont visibles dans le dashboard et un utilisateur peut consulter son
historique paginé. Le client ne peut jamais choisir ou modifier son XP, son
niveau, le bénéficiaire ou la raison d’un événement.

## Périmètre retenu

Inclus dans F09 :

- attribution de `+100 XP` pour une présence validée ;
- journal immuable `xp_events` ;
- projection `users.xp` et `users.level`, recalculée depuis le journal dans la
  même transaction que l’attribution ;
- calcul de niveau avec les seuils MVP versionnés dans un module de règles ;
- idempotence par clé métier et contrainte PostgreSQL ;
- endpoint authentifié `GET /profile/xp` avec pagination bornée ;
- progression XP dans le dashboard et page d’historique `/profil/xp` ;
- états loading, vide, erreur et focus accessibles.

Reporté :

- `+25 XP` pour la participation à une nouvelle partie ;
- `+150 XP` pour la première partie créée comme MJ ;
- pénalité pour absence non signalée ;
- badges, classement, saisons et bonus configurables par administrateur.

Ces événements sont réservés dans les types et la structure du journal, mais
ne sont pas déclenchés tant qu’un workflow métier explicite et testé n’existe
pas.

## Règles métier

### Attribution

- Seuls les participants `PRESENT` transmis par la validation du MJ reçoivent
  `SESSION_ATTENDED`.
- Les utilisateurs `ABSENT`, `EXCUSED` ou absents de la liste validée ne
  reçoivent aucun événement.
- La séance doit passer à `COMPLETED` dans la même transaction que l’écriture
  des événements XP et la mise à jour des projections utilisateur.
- Une séance déjà `COMPLETED` ne peut être validée à nouveau qu’avec le même
  résultat ; le rejeu renvoie les données existantes sans nouvelle attribution.
- Une différence entre le résultat déjà enregistré et une nouvelle requête est
  un conflit métier, sans modification partielle.

### Niveau

Les seuils MVP sont :

| Niveau | XP minimale |
| --- | ---: |
| 1 | 0 |
| 2 | 250 |
| 3 | 600 |
| 4 | 1 100 |
| 5 | 1 750 |

Au-delà du dernier seuil, le niveau reste extensible selon la même règle. Le
calcul choisit le niveau correspondant au plus grand seuil inférieur ou égal
au total. Les seuils et récompenses sont définis dans un module versionné,
sans permettre une modification par le client.

## Architecture

### Contrats partagés

Créer `packages/shared/src/xp.ts` avec :

- `xpReasonSchema` (`SESSION_ATTENDED`, puis raisons réservées) ;
- `xpEventSchema` pour l’historique privé du propriétaire du compte ;
- `xpSummarySchema` avec total, niveau, seuil courant, prochain seuil et
  progression ;
- `xpHistoryQuerySchema` avec curseur optionnel et limite maximale ;
- `xpHistoryPageSchema` et les types associés ;
- fonctions pures de calcul de niveau et de progression.

Les événements exposés au frontend ne contiennent ni `actorId`, ni identifiant
Discord, ni données de séance non nécessaires. Le montant, la raison et la
date sont en lecture seule.

### Base de données

Ajouter une migration additive `0009_xp.sql` :

- colonnes `xp` et `level` sur `users`, avec défauts `0` et `1` ;
- table `xp_events` : `id`, `user_id`, `session_id` nullable, `amount`,
  `reason`, `idempotency_key`, `created_at` ;
- clés étrangères vers `users` et `game_sessions`, avec cascade contrôlée ;
- contrainte `amount > 0` pour le MVP ;
- contrainte unique sur `idempotency_key` ;
- index `(user_id, created_at, id)` pour l’historique ;
- index sur `session_id` pour les contrôles d’idempotence.

Le journal est append-only dans le code applicatif : aucune route ne permet de
modifier ou supprimer un événement. Les colonnes `users.xp` et `users.level`
sont des projections transactionnelles, jamais la seule source de vérité.

### Module API

Créer `apps/api/src/modules/gamification/` :

- `policy.ts` : règles de récompense et accès à l’historique ;
- `repository.ts` : lecture de l’historique et écriture transactionnelle des
  événements ;
- `services/calculate-level.ts` : calcul pur délégué aux règles partagées ;
- `services/award-session-xp.ts` : attribution idempotente pour une séance ;
- `services/get-xp-history.ts` : projection paginée du compte courant ;
- `handlers.ts` et `routes.ts` : transport HTTP uniquement.

Le service d’attribution est injecté dans le workflow de validation de séance.
Le repository de présence lui fournit le contexte transactionnel afin que le
passage à `COMPLETED`, les présences, les événements et les projections soient
atomiques. La logique métier reste dans le service de gamification ; le
repository ne fait que persister les opérations paramétrées.

### API

`GET /profile/xp` :

- session obligatoire ;
- `limit` bornée à 50 et curseur opaque validé ;
- réponse enveloppée avec `summary`, `items` et `nextCursor` ;
- lecture limitée à l’utilisateur authentifié, sans `userId` accepté depuis
  la query string ;
- erreurs françaises génériques avec `requestId`.

Aucune route d’écriture XP n’est exposée au frontend. L’écriture ne peut être
déclenchée que par la validation autorisée d’une séance.

### Interface web

- compléter le bloc `progression` du dashboard avec niveau, XP totale et
  progression vers le prochain niveau ;
- ajouter `/profil/xp` comme composition de route ;
- créer une vue d’historique avec date, raison traduite et montant ;
- afficher un état vide si aucun événement n’existe ;
- conserver les messages d’erreur en français et ne jamais afficher une
  réponse brute de l’API ;
- respecter `Hanken Grotesk`, `Inter`, `Geist`, les tokens Tailwind et les
  zones tactiles accessibles.

## Flux transactionnel

1. Le MJ authentifié envoie la validation de présence avec des utilisateurs
   appartenant à la partie.
2. L’API vérifie session, origine, rate limit, propriétaire et statut de la
   séance.
3. La transaction verrouille la séance et vérifie les résultats existants.
4. Elle écrit ou met à jour les présences puis passe la séance à `COMPLETED`.
5. Pour chaque `PRESENT`, le service crée la clé
   `session-attended:<sessionId>:<userId>` ; une contrainte unique protège le
   rejeu et la concurrence.
6. Le total est recalculé depuis `xp_events`, le niveau est calculé depuis les
   seuils, puis `users.xp` et `users.level` sont mis à jour.
7. Toute erreur annule l’ensemble de la transaction.

## Gestion des erreurs et concurrence

- une séance inexistante renvoie 404 sans révéler d’information privée ;
- un acteur non propriétaire renvoie 403 ;
- une séance non validable ou une liste incohérente renvoie 409 ;
- un retry identique est idempotent ;
- un retry avec des présences différentes est rejeté ;
- une contrainte d’unicité ou une course transactionnelle ne doit jamais
  produire un compteur partiellement augmenté ;
- les détails SQL et exceptions restent internes aux logs corrélés.

## Tests TDD

Écrire avant le code de production :

- tests unitaires des seuils, de la progression et des montants ;
- attribution aux seuls `PRESENT`, exclusion des absents et séance non
  validée ;
- rejeu identique, rejeu différent et concurrence ;
- rollback si un événement ou la projection utilisateur échoue ;
- intégration migration, contrainte unique, reconstruction depuis le journal
  et validation de séance dans une transaction ;
- API 401/403/400/409, pagination bornée et refus des champs sensibles ;
- composants dashboard, historique, état vide, erreur et accessibilité ;
- non-régression des validations de présence existantes.

## Sécurité et données personnelles

- autorisation côté serveur pour la validation et l’historique ;
- aucun `xp`, `level`, `userId`, `reason` ou montant accepté dans une commande
  d’attribution cliente ;
- protection Origin et rate limiting de la validation MJ réutilisés ;
- pagination maximale et curseur validé pour limiter le scraping ;
- historique uniquement accessible au propriétaire du compte ;
- logs sans tokens, cookies, identifiants Discord ou détails inutiles ;
- audit de la migration et aucune opération destructive.

## Limites explicites

- pas de classement public ni de profil XP d’un autre utilisateur ;
- pas d’édition manuelle de l’XP par un administrateur dans F09 ;
- pas de bonus ou pénalité non définis ;
- pas d’E2E navigateur réel si l’environnement de test ne fournit pas de
  compte et de navigateur contrôlé.

## Critères d’acceptation

- une validation de séance attribue exactement `+100 XP` à chaque présent ;
- aucun absent ne reçoit d’XP ;
- un rejeu identique ne double ni le journal ni le compteur ;
- le niveau est toujours cohérent avec la somme du journal ;
- l’historique ne permet pas de lire ou modifier le compte d’un autre joueur ;
- le dashboard et `/profil/xp` affichent les états nominal, vide, chargement et
  erreur conformément au design system.
