# ADR 002 — JWT d’accès avec session de rafraîchissement révocable

**Statut :** accepté le 2026-09-04

## Décision

JDR Hub utilise un JWT d’accès signé, court et placé dans un cookie `HttpOnly`.
Une session de rafraîchissement opaque reste stockée côté serveur afin de
conserver la révocation immédiate, la déconnexion effective, les expirations
idle/absolue et une rotation contrôlée.

## Conséquences

- Aucun JWT ou identifiant de session n’est placé dans `localStorage`, une URL
  ou le code frontend.
- Chaque route protégée vérifie le JWT puis l’état serveur de la session. Le
  JWT ne porte aucun rôle ou droit métier.
- Les cookies impliquent toujours une protection CSRF pour les routes qui
  modifient l’état.
- Le secret de signature reste uniquement dans l’environnement d’exécution et
  suit une procédure de rotation avec clé précédente temporaire.

## Alternatives écartées

- **JWT entièrement stateless :** rejeté car le logout et la révocation ne
  seraient pas immédiats pendant la validité du token.
- **JWT dans le stockage navigateur :** rejeté car une XSS pourrait exfiltrer
  le jeton.
- **Conserver uniquement la session opaque :** remplacé à la demande explicite
  du propriétaire par le modèle JWT ci-dessus.
