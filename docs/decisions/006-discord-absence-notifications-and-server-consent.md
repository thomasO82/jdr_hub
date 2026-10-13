# Décision 006 — Maintenir les notifications Discord et demander l'adhésion au serveur

## Date

2026-10-13

## Statut

Acceptée par le propriétaire le 2026-10-13 après revue de la conception et
du plan d'implémentation.

## Contexte

La messagerie textuelle par partie reste dans JDR Hub. Le remplacement des DMs
Discord d'absence décrit dans la décision 005 ne correspond pas au besoin
confirmé : ces notifications Discord doivent être conservées, en complément
des notifications déjà visibles dans JDR Hub.

## Décision

- le signalement d'absence crée toujours une notification interne ;
- le bot envoie en plus un DM Discord au MJ si celui-ci a autorisé l'ajout au
  serveur privé de JDR Hub et que cet ajout a réussi ;
- après la création du compte et de la session, l'utilisateur reçoit une
  explication et peut donner un consentement OAuth distinct via `guilds.join` ;
- refuser, annuler ou échouer à rejoindre le serveur ne bloque ni l'inscription
  ni les notifications internes ;
- un compte existant peut activer l'intégration ultérieurement ;
- la conversation de partie reste exclusivement dans JDR Hub ; aucun message
  de chat n'est envoyé à Discord ;
- les tokens OAuth utilisateurs ne sont pas conservés ; le token du bot et
  l'identifiant du serveur sont fournis uniquement par l'environnement.

## Conséquences

- Discord OAuth initial demeure limité à l'identité ; un second flux protégé
  par `state` gère l'adhésion au serveur ;
- le serveur privé doit être créé et le bot doit déjà en être membre ;
- pour l'API Discord d'ajout au serveur, le bot doit disposer de la permission
  `CREATE_INSTANT_INVITE` ; aucune permission supplémentaire n'est demandée ;
- les livraisons Discord restent complémentaires et idempotentes ; leur échec
  ne supprime jamais les notifications dans JDR Hub ;
- les absences survenues avant le consentement ne déclenchent pas de DM
  rétroactif ;
- la décision 005 est supersédée uniquement sur le retrait des DMs d'absence ;
  la séparation du chat de partie et l'absence de synchronisation avec Discord
  restent applicables.
- la fiche F07, la fiche F07B et le plan d'implémentation doivent refléter ce
  comportement optionnel, sans déclarer la fonctionnalité terminée avant
  vérification et revue.
