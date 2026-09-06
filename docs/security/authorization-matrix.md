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
| Lire les messages d’une partie | Non | Non | Non | Oui, parties accessibles | Oui, uniquement ses parties | Selon politique support |
| Écrire un message dans une partie | Non | Non | Non | Oui si partie `OPEN`/`ACTIVE` | Oui si partie `OPEN`/`ACTIVE` | Selon politique support |
| Lire les messages d’une partie `CLOSED`/`COMPLETED` | Non | Non | Non | Oui si membre toujours actif | Oui, uniquement ses parties | Selon politique support |
| Écrire dans une partie `CLOSED`/`COMPLETED` | Non | Non | Non | Non | Non | Selon politique support |

Règles F04 : toutes les mutations exigent une session active et l'origine
exacte configurée ; `userId`, `ownerId`, `role` et `status` protégés sont
déduits côté serveur ou validés par une liste blanche. Un refus ne révèle pas
l'existence d'une ressource privée à un autre utilisateur.

Règles F07B : le MJ propriétaire et les membres `ACTIVE` sont les seuls sujets
autorisés à lire une conversation. Un candidat, un membre supprimé ou parti,
et un utilisateur extérieur sont refusés. Une partie fermée ou terminée est
consultable en lecture seule. Le départ d'un serveur ou d'un salon Discord ne
modifie jamais cette autorisation.
