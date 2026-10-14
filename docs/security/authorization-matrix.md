# Matrice d'autorisation JDR Hub

Cette matrice décrit les permissions côté API. Le frontend ne constitue jamais
un contrôle d'autorisation.

## Accès aux pages web

Selon la décision 007, les visiteurs sans session peuvent ouvrir uniquement la
présentation `/` et la page nécessaire à la connexion `/connexion`. Toute autre
page Next.js exige une session active, vérifiée côté serveur avant le rendu.
Cette règle ne modifie pas les permissions API ci-dessous : les endpoints
`public/*` restent des projections publiques et chaque API privée conserve ses
propres contrôles d'authentification et d'autorisation.

| Ressource/action | Visiteur | Utilisateur connecté | Candidat | Membre | MJ propriétaire | Administrateur |
| --- | --- | --- | --- | --- | --- | --- |
| Lire le catalogue et les fiches publiques | Oui | Oui | Oui | Oui | Oui | Oui |
| Lire une partie par identifiant interne | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Créer une partie | Non | Oui, session active et origine applicative exacte | Oui, mêmes contrôles | Oui, mêmes contrôles | Oui, mêmes contrôles | Selon politique support |
| Déposer une candidature | Non | Oui, sauf sa propre partie | Oui, une candidature unique | Oui si aucune candidature existante | Non sur sa partie | Selon politique support |
| Lire ses propres candidatures | Non | Oui | Oui | Oui | Oui pour ses candidatures | Selon politique support |
| Lire les candidatures d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Accepter/refuser une candidature | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire ou modifier le roster privé | Non | Non | Non | Oui pour sa partie | Oui, uniquement ses parties | Selon politique support |
| Modifier ou fermer une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire les messages d’une partie | Non | Non | Non | Oui, parties accessibles | Oui, uniquement ses parties | Selon politique support |
| Écrire un message dans une partie | Non | Non | Non | Oui si partie `OPEN`/`ACTIVE` | Oui si partie `OPEN`/`ACTIVE` | Selon politique support |
| Lire les messages d’une partie `CLOSED`/`COMPLETED` | Non | Non | Non | Oui si membre toujours actif | Oui, uniquement ses parties | Selon politique support |
| Écrire dans une partie `CLOSED`/`COMPLETED` | Non | Non | Non | Non | Non | Selon politique support |
| Lire son dashboard | Non | Oui, uniquement ses projections | Oui, selon ses droits | Oui, selon ses droits | Oui, selon ses droits | Selon politique support |
| Lire ses invitations reçues | Non | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Selon politique support |
| Créer/lire/annuler les invitations d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Accepter/refuser une invitation reçue | Non | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Non pour une invitation reçue par autrui | Selon politique support |
| Lire la gestion d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire les propositions et voter sur un créneau ouvert | Non | Non | Non | Oui, partie dont il est membre actif | Oui, uniquement ses parties | Selon politique support |
| Créer un tour de propositions ou retenir un créneau | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire l’historique des séances d’une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Modifier ou annuler une séance planifiée | Non | Non | Non | Non | Oui, uniquement ses parties et si la séance est `SCHEDULED` | Selon politique support |
| Retirer un joueur du roster | Non | Non | Non | Non | Oui, uniquement ses parties ; jamais le MJ | Selon politique support |
| Lire son historique XP et sa progression | Non | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Selon politique support |
| Attribuer l'XP d'une séance validée | Non | Non | Non | Non | Oui, uniquement ses parties et après validation | Selon politique support |

Règles F04 : toutes les mutations exigent une session active et l'origine
exacte configurée ; `userId`, `ownerId`, `role` et `status` protégés sont
déduits côté serveur ou validés par une liste blanche. Un refus ne révèle pas
l'existence d'une ressource privée à un autre utilisateur.

| Action Discord optionnelle | Visiteur | Utilisateur connecté | Candidat | Membre | MJ propriétaire | Administrateur |
| --- | --- | --- | --- | --- | --- | --- |
| Démarrer le consentement d'adhésion du bot | Non | Oui, session active | Non | Non | Oui | Selon politique support |
| Recevoir un DM d'absence | Non | Selon consentement du MJ | Non | Selon consentement du MJ | Oui, après adhésion consentie | Selon politique support |
| Refuser l'adhésion et utiliser JDR Hub | Non | Oui | Selon session | Selon session | Oui | Selon politique support |

Règles F07B : le MJ propriétaire et les membres `ACTIVE` sont les seuls sujets
autorisés à lire une conversation. Un candidat, un membre supprimé ou parti,
et un utilisateur extérieur sont refusés. Une partie fermée ou terminée est
consultable en lecture seule. Le départ d'un serveur ou d'un salon Discord ne
modifie jamais cette autorisation.

Règles d'adhésion Discord : seul un utilisateur authentifié peut démarrer le
flux `guilds.join`, lié à son état OAuth, son compte et sa session. Le callback
ne modifie pas la session JDR Hub. Un refus ne bloque ni le compte ni les
notifications internes. Aucun message de partie n'est transmis à Discord.
Règles F08 : le dashboard est toujours calculé pour l'utilisateur authentifié
et n'accepte aucun identifiant utilisateur fourni par le client. Les routes de
gestion, de roster et d'invitations d'une partie vérifient côté serveur le
rôle de MJ propriétaire. Les invitations sont limitées à une partie ouverte ou
active, expirent après sept jours, ne peuvent être acceptées qu'une fois et
leur acceptation réserve la place dans une transaction. Les mutations exigent
également l'origine applicative exacte, un payload Zod strict et le rate
limiting prévu ; les projections excluent les identifiants Discord et les
informations de disponibilité privées.

Règles F09 : `GET /profile/xp` dérive exclusivement l'utilisateur de la session
active et ignore tout identifiant fourni par le client. Les événements XP sont
créés côté serveur uniquement pour les présences `PRESENT`, avec une clé
d'idempotence unique et une transaction partagée avec la validation de séance.
Le montant, le niveau et le motif ne sont jamais des champs d'autorité du
navigateur ; la réponse n'expose ni clé d'idempotence ni identifiant Discord.

Clarification FIX-UX-001 — 2026-10-14 : les fiches publiques se lisent par
slug via `/public/games/:slug`. La lecture par identifiant interne est réservée
au MJ propriétaire ; les créations exigent une session active et l'origine
applicative exacte.

FIX-UX-002 — 2026-10-14 : les tours de vote et leur historique sont visibles
au MJ propriétaire et aux membres actifs de la partie. Seul le MJ propriétaire
peut lister l’historique complet des séances, retenir un créneau, modifier une
séance `SCHEDULED` ou l’annuler. Les séances `COMPLETED` et `CANCELLED` sont
terminales ; l’annulation conserve le tour et les votes pour consultation.
