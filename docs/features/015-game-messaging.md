# F07B — Messagerie textuelle par partie

## Identifiant

F07B

## Statut

`MERGED`

## Branche

`feat/game-messaging`

## Lien ou numéro de Pull Request

[PR #28](https://github.com/thomasO82/jdr_hub/pull/28), fusionnée dans `develop` le 2026-10-13.

## Dates de début et de fin

- Début : 2026-09-06
- Fin : 2026-10-13

## Dépendances

### Prévues

- F01 — authentification et sessions ;
- F02 — parties et cycle de vie ;
- F04 — membres actifs et autorisation par partie ;
- F07 — notifications applicatives.

### Réalisées ou constatées

- PostgreSQL reste la source de vérité des parties, membres et messages ;
- Redis est ajouté comme relais d'événements inter-instances ;
- le design system existant et le composant de détail d'une partie sont
  réutilisés.

### Restantes

- aucune dépendance fonctionnelle bloquante ;
- une vérification E2E avec navigateur réel reste à faire.

## Contexte et besoin utilisateur

Les utilisateurs doivent pouvoir coordonner une partie sur table sans être
obligés de rejoindre un serveur ou un salon Discord contenant un Bot. Le MVP
fournit donc une conversation textuelle de groupe dans chaque partie.

Le chat de partie reste exclusivement dans JDR Hub. Selon la décision 006, les
DMs d'absence sont une fonctionnalité séparée et facultative, activée par le
consentement d'adhésion au serveur privé. Aucun contenu de chat n'est transmis
à Discord ; quitter Discord ne change pas les permissions applicatives.

## Périmètre prévu

- conversation textuelle par partie ;
- accès MJ et membres actifs ;
- lecture seule après fermeture ou achèvement ;
- historique REST, création REST et diffusion SSE ;
- relais Redis Streams entre instances API ;
- interface responsive intégrée au détail d'une partie.

## Fonctionnalités effectivement réalisées

- migration additive `0010_game-messages-and-discord-consent` et table `game_messages` ;
- contrat partagé strict limité au texte, borné à 2 000 caractères ;
- pagination stable par curseur et résolution par UUID ou slug public ;
- contrôle serveur de l'appartenance, du rôle propriétaire et du statut de la
  partie ;
- création durable en PostgreSQL avant publication de l'événement ;
- événements Redis Streams limités aux identifiants, sans contenu de message ;
- endpoint SSE avec reprise, heartbeat, revalidation d'accès et limite de
  connexions ;
- chat texte accessible dans la vue détail, avec états chargement, vide,
  erreur et lecture seule.

## Parcours utilisateur

1. Un MJ ou membre actif ouvre le détail de sa partie.
2. L'application charge l'historique via `GET`.
3. L'utilisateur écrit un message texte puis l'envoie via `POST`.
4. Le message est enregistré et diffusé aux navigateurs abonnés par SSE.
5. Après une reconnexion, l'historique PostgreSQL reste la référence et le
   flux peut reprendre à partir du dernier identifiant connu.

Une partie fermée ou terminée reste lisible. Un membre supprimé ou parti,
un candidat et un utilisateur extérieur perdent immédiatement l'accès.

## Règles métier

### Implémentées

- seuls le MJ propriétaire et les membres `ACTIVE` peuvent lire ;
- seuls ces mêmes utilisateurs peuvent écrire lorsque la partie est `OPEN` ou
  `ACTIVE` ;
- `CLOSED` et `COMPLETED` sont lisibles mais refusent toute écriture ;
- le départ ou l'exclusion révoque l'accès, sans supprimer l'historique ;
- les messages privés, pièces jointes, réactions, édition, suppression,
  mentions et chat général restent hors MVP ;
- quitter Discord ne déclenche aucun traitement JDR Hub.

### Non couvertes ou reportées

- accusés de lecture, recherche et modération avancée ;
- test E2E navigateur avec plusieurs clients réellement connectés ;
- reconnexion SSE personnalisée côté client au-delà du mécanisme natif
  `EventSource`.

## Architecture et choix techniques

Les routes Hono restent une couche HTTP mince : elles authentifient, valident
le transport et délèguent aux services. Le repository contrôle les accès et
les transactions. PostgreSQL persiste les messages ; REST porte les lectures
et écritures ; SSE diffuse les nouveaux événements ; Redis Streams relaie les
identifiants entre processus API. Une panne Redis ne perd donc pas un message
déjà validé en base.

## Modèle de données et migrations

`game_messages` contient `id`, `game_id`, `author_id`, `content` borné et
`created_at`, avec clés étrangères en cascade et index `(game_id, created_at,
id)`. La migration additive est
`packages/database/migrations/0010_game-messages-and-discord-consent.sql`. Les DMs d'absence
utilisent séparément l'outbox `notification_deliveries` et ne contiennent
jamais le texte d'un message de partie.

## Routes API

- `GET /games/:gameId/messages` : session, curseur et limite validés ;
- `POST /games/:gameId/messages` : session, origine stricte, rate limit,
  payload Zod strict et autorisation serveur ;
- `GET /games/:gameId/messages/stream` : session, autorisation, `Last-Event-ID`,
  heartbeat et revalidation périodique.

Le paramètre `gameId` accepte l'UUID interne ou le slug public. Les réponses
ne contiennent ni `discordId`, ni token, ni détail d'erreur interne.

## Interface et composants

Le composant client `GameChatView` est composé dans le détail de partie. Il
utilise les tokens Tailwind existants, la typographie du design system et une
mise en page une colonne adaptée au mobile. Le rendu du contenu reste textuel
et échappé par React ; aucun HTML utilisateur n'est interprété.

## Tests

### Réalisés

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm exec vitest run packages/shared/tests/game-messages.test.ts packages/database/tests/game-messages-schema.test.ts apps/api/tests/unit/messages/policy.test.ts apps/api/tests/unit/messages/repository.test.ts apps/api/tests/unit/messages/event-bus.test.ts` | 22 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/api/tests/api/messages/routes.test.ts apps/api/tests/api/app-security.test.ts` | 14 tests verts | 2026-09-06 |
| `pnpm exec vitest run apps/web/tests/game-messages-api.test.ts apps/web/tests/game-chat-visual.test.ts` | 6 tests verts | 2026-09-06 |
| `pnpm test:integration` avec PostgreSQL et Redis de test | 7 fichiers, 11 tests verts | 2026-09-06 |
| `pnpm audit --audit-level=high` | Aucune vulnérabilité haute/critique ; une vulnérabilité modérée transitive `esbuild` préexistante via `drizzle-kit` | 2026-09-06 |
| `pnpm --filter @jdr-hub/web build` | Build Next.js/Turbopack vert | 2026-09-06 |

### Restants

- vérification manuelle dans un navigateur réel ;
- scénario E2E multi-client SSE.

## Preuve TDD Red, Green, Refactor

### Red

Les contrats, politiques, repository, bus d'événements, routes, client API et
tests visuels ont été écrits avant leur implémentation. Les commandes ciblées
ont d'abord échoué pour l'absence des modules, routes ou composants attendus.

### Green

L'implémentation minimale a ensuite fait passer les tests unitaires, API,
intégration et client concernés. Les tests d'intégration ont vérifié les
contraintes PostgreSQL, la pagination stable, les accès révoqués et le relais
Redis ciblé par partie.

### Refactor

Les responsabilités ont été séparées entre contrats, repository, services,
bus Redis, handlers Hono, client API et vue client. Les contrôles de lint,
TypeScript et build ont été rejoués après cette séparation.

## Contrôles de sécurité

- autorisation par ressource côté serveur contre IDOR ;
- vérification de session et d'origine sur les mutations ;
- validation Zod stricte et limite de 2 000 caractères ;
- rate limit utilisateur sur l'envoi ;
- contenu rendu comme texte échappé, sans `dangerouslySetInnerHTML` ;
- flux SSE sans token en URL et sans contenu dans Redis ;
- revalidation d'accès sur heartbeat et avant diffusion ;
- limite de connexions SSE par utilisateur et partie ;
- erreurs publiques françaises et sobres, sans exception interne ;
- Redis non exposé publiquement dans Compose, image épinglée par digest ;
- aucun secret réel dans le code, les tests, la documentation ou les images.

La dépendance `redis` officielle a été ajoutée après validation explicite du
propriétaire. Le skill dédié d'audit de chaîne d'approvisionnement n'était pas
disponible ; la sortie de pnpm a toutefois confirmé le contrôle de politique
de chaîne d'approvisionnement du lockfile.

### Correctif Compose du 2026-09-06

L'image Redis utilisée par Compose démarre via un entrypoint qui bascule vers
l'utilisateur non-root `redis`. `cap_drop: ALL` empêchait cette opération et
faisait sortir le conteneur avec `operation not permitted`. Compose conserve le
drop de capacités et autorise uniquement `SETUID` et `SETGID`, vérifiés par un
test de configuration et par un démarrage réel de la stack.

## Vérification manuelle recommandée

1. Ouvrir une partie `OPEN` avec un MJ et un membre actif dans deux fenêtres.
2. Envoyer un message texte depuis l'une et vérifier sa réception dans l'autre.
3. Fermer la partie et vérifier la lecture seule.
4. Retirer le membre et vérifier les réponses d'accès refusé.
5. Vérifier le rendu mobile, le clavier, le focus et les messages d'erreur.

## Limites

Le chat est volontairement textuel et limité à une conversation par partie.
Il n'y a pas de synchronisation du chat avec Discord, de chat privé, de pièces jointes,
de modération avancée ni de test E2E navigateur automatisé dans cette PR.

## Addendum du 2026-10-13 — reprise et alignement Discord

La décision 006 maintient les notifications d'absence Discord comme option
distincte ; elle ne change ni le contenu, ni les permissions, ni le transport
du chat. La conversation reste exclusivement dans JDR Hub.

La reprise serveur a vérifié le démarrage SSE avant chargement d'historique,
l'absence de doublons, la récupération après erreur de flux et la révocation
d'un membre pendant un flux inactif. Résultats du 2026-10-13 : suite complète
`pnpm test` — 108 fichiers / 306 tests verts ; lint, TypeScript et build API/web
verts ; build Docker Compose complet et conteneurs PostgreSQL, Redis, API,
frontend et proxy sains. La suite `pnpm test:integration` — 8 fichiers / 17
tests verts — a été exécutée avec des conteneurs PostgreSQL et Redis éphémères
dédiés sur les ports locaux de test. L'UI n'a pas été modifiée dans F07B ; la
vérification visuelle/accessibilité reste à faire, l'outil Browser et
Playwright n'étant pas disponibles.

## Synchronisation après fusion — 2026-10-13

La PR #28 a été fusionnée dans `develop` le 2026-10-13. GitHub confirme son état fusionné ; la vérification navigateur reste à confirmer comme indiqué dans la fiche.
