# Décision 007 — Pages privées et présentation publique

## Date

2026-10-14

## Statut

Acceptée par le propriétaire le 2026-10-14 après revue de la conception et du
plan d'implémentation.

## Contexte

Pendant les essais, le propriétaire a demandé que l'application ne soit plus
accessible aux visiteurs non connectés, à l'exception de sa page de
présentation. Le cahier des charges et F03 exposaient jusque-là le catalogue,
les fiches de partie et les collections éditoriales sans connexion.

Un garde uniquement côté navigateur n'est pas suffisant : les pages Next.js
peuvent rendre leur contenu sur le serveur. La session doit être validée avant
que Next.js rende une page applicative.

## Décision

- `/` est la seule page publique de présentation ; `/connexion` reste accessible
  pour permettre l'authentification.
- Toutes les autres pages Next.js demandent une session active : catalogue,
  fiches de partie, profils MJ, collections tags/jeux, dashboard, création,
  planning et gestion.
- Le proxy Next.js vérifie l'accès auprès de Hono `/me` avant le rendu. Hono
  reste l'autorité qui vérifie signature, expiration, révocation et compte
  actif.
- Le cookie d'accès `HttpOnly` passe à `Path=/` afin que le proxy reçoive le
  cookie sur les requêtes de page ; son nom, ses attributs `SameSite=Lax`,
  `Secure` en production et son expiration ne changent pas.
- Le proxy ne transmet à Hono que le cookie d'accès. Le cookie de renouvellement
  conserve `Path=/api/auth`. Le login, le renouvellement et le logout expirent
  explicitement l'ancienne variante d'accès `Path=/api`.
- Une réponse Hono `401` redirige vers `/connexion`. Une panne ou une réponse
  inattendue refuse le rendu privé avec une réponse temporaire non cacheable,
  sans effacer les cookies.
- Un utilisateur authentifié arrivant sur `/` est envoyé vers `/dashboard`.
- Le sitemap ne contient que `/`. `robots.txt` n'autorise l'indexation que de
  la racine ; ces directives ne remplacent pas le garde serveur.
- La landing suit la composition desktop D01 sur mobile également. Les endpoints
  API Hono `public/*` restent inchangés ; cette décision concerne les pages web.

## Conséquences

- Les règles F03 de consultation publique des pages sont remplacées pour
  l'interface web ; l'historique d'implémentation F03 et ses projections API
  restent documentés.
- Le cookie d'accès est transmis au serveur Next.js sur les chemins du même
  hôte ; `HttpOnly` empêche l'accès JavaScript et le proxy ne transmet au service
  Hono que ce cookie précis.
- Les utilisateurs possédant encore un cookie historique limité à `/api`
  devront effectuer le flux de connexion pour obtenir la variante `Path=/`.
- Les pages privées ne sont plus publiées dans le sitemap et les visiteurs
  reçoivent une redirection avant le rendu de leur contenu.
- La fiche FIX-UX-001 et `docs/project-status.md` décrivent cette évolution sans
  déclarer la PR fusionnée.

