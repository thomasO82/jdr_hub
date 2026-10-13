# Décision 006 — Maintenir les notifications Discord et demander l'adhésion au serveur

## Date

2026-10-13

## Statut

Proposée après validation conversationnelle ; à confirmer après revue de la
conception écrite.

## Contexte

La messagerie textuelle par partie reste dans JDR Hub. Le remplacement des DMs
Discord d'absence décrit dans la décision 005 ne correspond pas au besoin
confirmé : ces notifications Discord doivent être conservées, en complément
des notifications déjà visibles dans JDR Hub.

## Décision proposée

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
- les livraisons Discord restent complémentaires et idempotentes ; leur échec
  ne supprime jamais les notifications dans JDR Hub ;
- la décision 005 et le plan de messagerie qui en découle sont supersédés sur
  le retrait des DMs et doivent être réconciliés avant implémentation ;
- cette décision est effective uniquement après revue/validation de la
  conception écrite par le propriétaire.
