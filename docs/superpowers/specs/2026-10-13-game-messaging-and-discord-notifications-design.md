# Conception — Messagerie de partie et notifications Discord

## Statut

Proposition rédigée après validation conversationnelle du propriétaire le
2026-10-13. Cette conception remplace, pour la suite du travail, la décision
de retirer les DMs Discord décrite dans la décision 005. Elle ne constitue pas
une validation de l'implémentation existante sur `feat/game-messaging`.

## Objectif

Ajouter une conversation textuelle JDR Hub à chaque partie, tout en conservant
les notifications d'absence dans l'application et leur livraison
complémentaire par DM Discord au MJ. L'inscription doit proposer une
autorisation Discord distincte permettant de rejoindre un serveur privé utilisé
par le bot. Refuser cette autorisation ne bloque jamais l'inscription ni
l'utilisation des notifications JDR Hub.

## Périmètre

### Inclus

- conversation textuelle de groupe propre à une partie dans JDR Hub ;
- accès réservé au MJ propriétaire et aux membres actifs, révoqué après départ
  ou exclusion ;
- historique PostgreSQL, lecture/création REST, diffusion navigateur SSE et
  relais inter-instance par Redis Streams ;
- notification d'absence persistée dans JDR Hub et livraison DM Discord
  complémentaire au MJ lorsque celui-ci a rejoint le serveur du bot ;
- autorisation OAuth Discord séparée pour ajouter un utilisateur au serveur
  privé du bot ;
- inscription utilisable même si l'autorisation est refusée ou si Discord est
  temporairement indisponible ;
- possibilité pour un compte existant d'activer l'intégration ultérieurement ;
- tests de contrats, règles métier, sécurité, API, persistance, intégrations et
  interface.

### Exclus

- messages de conversation copiés dans Discord ou envoyés en DM ;
- salon Discord de discussion entre joueurs ou synchronisation de roster ;
- messages privés entre utilisateurs dans JDR Hub ;
- édition, suppression, réactions, pièces jointes, mentions, Markdown riche,
  appels, présence en ligne et accusés de lecture ;
- blocage de l'inscription ou des notifications internes lorsque Discord est
  refusé, inaccessible ou ne livre pas un DM.

## Règles produit

1. Le signalement d'absence crée toujours une notification interne destinée au
   MJ, dans la même transaction que l'enregistrement métier.
2. Une livraison Discord est un complément. Elle ne remplace ni ne retarde la
   notification interne et son échec ne fait jamais échouer le signalement.
3. Un DM d'absence n'est planifié que si le MJ a autorisé l'ajout au serveur et
   que l'opération d'ajout a réussi. Les nouvelles absences survenues avant
   cette adhésion ne sont pas rejouées rétroactivement.
4. L'inscription Discord existante conserve son scope `identify`. Après la
   création du compte et de la session, JDR Hub explique l'usage du serveur et
   propose un second consentement Discord demandant `guilds.join`.
5. En cas de refus, d'annulation, d'erreur OAuth ou d'indisponibilité Discord,
   le compte et la session restent utilisables ; les notifications demeurent
   consultables dans JDR Hub.
6. Un utilisateur déjà inscrit peut lancer le même parcours depuis ses
   paramètres de compte. L'état d'intégration indique uniquement si l'ajout a
   réussi ou reste à effectuer ; aucun token OAuth utilisateur n'est conservé.
7. Le serveur est privé et dédié à l'intégration JDR Hub : il ne sert pas de
   salon communautaire. Rejoindre ce serveur ne donne aucun accès aux
   conversations JDR Hub.
8. La conversation d'une partie n'est jamais transmise au bot, à Discord ou au
   serveur privé.

## Parcours OAuth et ajout au serveur

```text
Connexion Discord (identify)
        ↓
Compte et session JDR Hub créés
        ↓
Explication + choix « Autoriser l'ajout au serveur du bot »
        ↓
OAuth Discord séparé (guilds.join, state lié à la session)
        ↓
API JDR Hub échange le code puis demande l'ajout au serveur configuré
        ↓
Succès : intégration active       Refus/échec : compte utilisable, intégration inactive
```

Le bot doit déjà appartenir au serveur cible. Le serveur cible est configuré
par son identifiant dans l'environnement ; le token bot reste uniquement côté
API et n'est jamais transmis au navigateur. L'access token utilisateur sert
uniquement à cette opération, puis est abandonné ; ni access token ni refresh
token utilisateur ne sont stockés.

Le second flux utilise un `state` à usage unique, lié à la session et protégé
contre le rejeu et la substitution de callback. La redirection Discord est
fixe et validée côté API. Le scope supplémentaire est demandé après une
explication lisible précisant le but, le destinataire des DM et le fait que le
refus n'empêche pas l'usage de JDR Hub. L'explication indique que le serveur
commun est le contexte choisi pour que le bot puisse tenter de contacter le MJ
en DM ; les paramètres de confidentialité ou les limites Discord peuvent
toutefois empêcher la livraison. Le DM d'absence est déclenché par le
signalement volontaire d'un membre et n'est jamais un envoi collectif. Discord
documente `guilds.join` pour l'ajout d'un utilisateur et précise que le bot
doit déjà appartenir au serveur cible
([documentation OAuth2 Discord](https://docs.discord.com/developers/topics/oauth2#oauth2-scopes)).
L'endpoint d'ajout exige aussi que le bot possède la permission
`CREATE_INSTANT_INVITE` dans ce serveur ; un membre déjà présent est un résultat
idempotent, pas une erreur
([documentation Discord — Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member)).
L'endpoint de création de DM demande de limiter les ouvertures rapides et
précise qu'un DM devrait généralement correspondre à une action de l'utilisateur
([documentation Discord — Create DM](https://docs.discord.com/developers/resources/user#create-dm)).

## Notifications d'absence

Le flux existant reste la base : transaction d'absence → notification interne
→ livraison Discord idempotente si l'intégration du MJ est active. Le worker
Discord conserve ses retries bornés et ses erreurs internes sûres. Un refus
permanent ou l'impossibilité de créer/envoyer le DM marque uniquement la
livraison Discord en échec ; la notification JDR Hub reste disponible et
lisible.

Discord ne permet pas de garantir qu'un DM atteindra toujours le destinataire
(par exemple si ses paramètres de confidentialité le bloquent). L'interface ne
doit donc jamais présenter l'envoi Discord comme la seule confirmation d'une
absence. Les logs ne contiennent ni le contenu du message ni les tokens.

## Messagerie par partie

### Règles d'accès et cycle de vie

- le MJ propriétaire et les membres `ACTIVE` peuvent lire les conversations ;
- seuls ces mêmes membres peuvent écrire tant que la partie est `OPEN` ou
  `ACTIVE` ;
- une partie `CLOSED` ou `COMPLETED` reste lisible mais devient non modifiable ;
- candidat, invité non accepté, membre retiré et utilisateur extérieur sont
  refusés côté API pour toute lecture, écriture et connexion SSE ;
- quitter le serveur Discord ne change pas les droits de messagerie JDR Hub.

### Architecture et données

- PostgreSQL conserve les messages et reste la source durable de vérité ;
- REST charge l'historique paginé et crée les messages ; SSE diffuse les
  nouveaux événements aux navigateurs autorisés ; Redis Streams relaie les
  événements entre instances sans port public ;
- une panne Redis n'annule pas un message déjà persisté et l'historique REST
  reste lisible ; les reconnexions rechargent depuis PostgreSQL ;
- le message est du texte UTF-8 borné à 2 000 caractères, trimé et non vide ;
- l'identité de l'auteur vient de la session, jamais du payload client ;
- index de pagination stable `(game_id, created_at, id)` ; aucun token ou
  contenu de conversation dans Redis au-delà des données de diffusion
  strictement nécessaires.

### Interface

Le détail d'une partie intègre une conversation responsive, avec historique,
chargement des pages antérieures, saisie lorsque l'écriture est permise,
lecture seule pour une partie terminée, et états vide, chargement, erreur et
reconnexion. Les messages sont rendus comme texte échappé, jamais comme HTML ou
Markdown interprété. Les annonces de nouveaux messages, le clavier, le focus et
les erreurs accessibles sont couverts.

## Sécurité et vie privée

- authn obligatoire et autorisation de ressource vérifiée côté API à chaque
  opération ; l'accès SSE est revalidé périodiquement et avant diffusion ;
- protection `state`, session et origine pour le second OAuth ; callback fixe,
  anti-rejeu et validation stricte des réponses Discord ;
- scope minimal `guilds.join`, tokens utilisateurs éphémères, secrets bot et
  identifiant de serveur fournis par l'environnement ;
- rate limits par utilisateur et partie pour l'envoi, plus limites de connexion
  SSE ; validation Zod stricte et rejet des propriétés inconnues ;
- contenu de message limité et affiché comme texte afin de prévenir le XSS
  stocké ; aucune donnée de message dans les logs ;
- notification interne disponible en cas de refus, de départ du serveur ou
  d'échec Discord ; ne pas exposer les détails Discord bruts au navigateur ;
- appliquer les exigences RGPD du dépôt : finalité explicite, minimisation,
  procédure d'export/suppression et rétention documentée avant livraison.

## Approches considérées

- **Conserver les DMs Discord sans adhésion au serveur :** non retenu, car le
  parcours voulu inclut un serveur privé partagé avec le bot et un consentement
  explicite à l'ajout.
- **Exiger Discord pour créer ou utiliser le compte :** rejeté ; le refus ne
  doit pas priver l'utilisateur de JDR Hub ni des notifications internes.
- **Autorisation secondaire facultative après création du compte :** retenue ;
  elle sépare clairement la connexion de l'adhésion au serveur, permet un
  consentement éclairé et conserve un parcours fonctionnel en cas de refus.
- **Copier la conversation de partie dans Discord :** rejeté ; les échanges
  restent privés dans JDR Hub et Discord ne sert qu'aux notifications
  d'absence.

## Critères d'acceptation et preuve TDD attendue

Avant toute implémentation, écrire et faire échouer les tests suivants pour la
bonne raison, puis implémenter le minimum et les faire passer :

### OAuth serveur

- `guilds.join` n'est jamais demandé pendant la connexion initiale ;
- un utilisateur authentifié peut démarrer le second consentement, mais pas
  agir au nom d'un autre compte ;
- `state` absent, incorrect, expiré ou rejoué est refusé ;
- un refus OAuth n'annule pas le compte ou la session ;
- le callback ajoute l'identité Discord liée à la session au seul serveur
  configuré ;
- access token ou refresh token Discord absent des réponses, de la base, des
  logs et du frontend ;
- un échec Discord n'active pas l'intégration et peut être retenté plus tard.

### Notifications

- une absence produit une notification interne, même si Discord est désactivé,
  refusé ou indisponible ;
- seul un MJ ayant rejoint le serveur reçoit une livraison DM planifiée ;
- l'idempotence et les retries bornés ne produisent pas de doubles livraisons ;
- échec permanent Discord ne supprime ni ne masque la notification interne.

### Messagerie

- lecture/écriture autorisées seulement au MJ et aux membres actifs ;
- accès refusé aux non-membres, candidats, invités non acceptés et membres
  retirés ; révocation vérifiée sur REST et SSE ;
- partie terminée : lecture seule ; message invalide, vide, surdimensionné ou
  avec propriétés inconnues refusé ;
- contenu XSS restitué comme texte ; absence de contenu dans les logs ;
- historique PostgreSQL lisible sans Redis ; publication Redis après
  persistance ; reprise SSE sans duplicata visible.

La suite doit aussi couvrir intégration PostgreSQL/Redis, composants
responsive/accessibles, lint, TypeScript, tests et builds. Aucun test déjà
fusionné ne peut être modifié sans l'exception documentée par `AGENTS.md`.

## Déploiement et limites

- Compose utilise PostgreSQL, API, web et Redis interne ; le port Redis n'est
  pas publié ; aucun service hébergé payant n'est requis ;
- `DISCORD_BOT_TOKEN` reste une configuration secrète runtime ; un identifiant
  du serveur privé est également requis côté API ;
- le propriétaire crée/configure le serveur et y ajoute le bot avec les
  permissions minimales, dont `CREATE_INSTANT_INVITE` requise par l'API
  d'adhésion, avant d'activer l'environnement ;
- le départ ultérieur d'un utilisateur du serveur peut rendre les DMs
  impossibles ; l'application conserve la notification interne et propose une
  nouvelle autorisation ;
- modération avancée, signalement de messages et politique de rétention
  détaillée nécessitent une décision dédiée si les exigences RGPD du dépôt ne
  suffisent pas à les trancher.

## Documents à réconcilier lors de la planification

La décision 005 et le plan `2026-09-06-game-messaging.md` supposent le retrait
des DMs Discord. Ils devront être remplacés ou mis à jour selon cette
conception avant d'exécuter la fonctionnalité. La fiche F07 doit continuer à
décrire la livraison d'absence Discord ; la fiche F07B doit couvrir uniquement
la messagerie de partie et son onboarding serveur.
