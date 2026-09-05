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

Règles F04 : toutes les mutations exigent une session active et l'origine
exacte configurée ; `userId`, `ownerId`, `role` et `status` protégés sont
déduits côté serveur ou validés par une liste blanche. Un refus ne révèle pas
l'existence d'une ressource privée à un autre utilisateur.
