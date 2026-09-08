# Matrice d'autorisation JDR Hub

Cette matrice décrit les permissions côté API. Le frontend ne constitue jamais
un contrôle d'autorisation.

| Ressource/action | Visiteur | Utilisateur connecté | Candidat | Membre | MJ propriétaire | Administrateur |
| --- | --- | --- | --- | --- | --- | --- |
| Lire le catalogue et les fiches publiques | Oui | Oui | Oui | Oui | Oui | Oui |
| Déposer une candidature | Non | Oui, sauf sa propre partie | Oui, une candidature unique | Oui si aucune candidature existante | Non sur sa partie | Selon politique support |
| Lire ses propres candidatures | Non | Oui | Oui | Oui | Oui pour ses candidatures | Selon politique support |
| Lire les candidatures d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Accepter/refuser une candidature | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire ou modifier le roster privé | Non | Non | Non | Oui pour sa partie | Oui, uniquement ses parties | Selon politique support |
| Modifier ou fermer une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Lire son dashboard | Non | Oui, uniquement ses projections | Oui, selon ses droits | Oui, selon ses droits | Oui, selon ses droits | Selon politique support |
| Lire ses invitations reçues | Non | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Selon politique support |
| Créer/lire/annuler les invitations d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Accepter/refuser une invitation reçue | Non | Oui, uniquement les siennes | Oui, uniquement les siennes | Oui, uniquement les siennes | Non pour une invitation reçue par autrui | Selon politique support |
| Lire la gestion d'une partie | Non | Non | Non | Non | Oui, uniquement ses parties | Selon politique support |
| Retirer un joueur du roster | Non | Non | Non | Non | Oui, uniquement ses parties ; jamais le MJ | Selon politique support |

Règles F04 : toutes les mutations exigent une session active et l'origine
exacte configurée ; `userId`, `ownerId`, `role` et `status` protégés sont
déduits côté serveur ou validés par une liste blanche. Un refus ne révèle pas
l'existence d'une ressource privée à un autre utilisateur.

Règles F08 : le dashboard est toujours calculé pour l'utilisateur authentifié
et n'accepte aucun identifiant utilisateur fourni par le client. Les routes de
gestion, de roster et d'invitations d'une partie vérifient côté serveur le
rôle de MJ propriétaire. Les invitations sont limitées à une partie ouverte ou
active, expirent après sept jours, ne peuvent être acceptées qu'une fois et
leur acceptation réserve la place dans une transaction. Les mutations exigent
également l'origine applicative exacte, un payload Zod strict et le rate
limiting prévu ; les projections excluent les identifiants Discord et les
informations de disponibilité privées.
