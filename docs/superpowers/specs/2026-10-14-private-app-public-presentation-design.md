# Pages privées et présentation publique — conception

## Statut

Conception soumise à validation du propriétaire avant rédaction du plan et
implémentation.

## Besoin

Le propriétaire ne veut aucune page applicative accessible aux visiteurs non
connectés. La seule page de présentation publique est `/`. `/connexion` doit
rester accessible pour permettre l'authentification. Toutes les autres pages
Next.js exigent une session active, y compris `/parties`, les fiches de partie,
les pages MJ/tags/jeux, les pages de création et les écrans de compte.

Cette décision remplace, pour l'interface web, les règles antérieures de
catalogue public et de pages SEO du cahier des charges. La portée concerne les
pages web ; les endpoints API `public/*` restent inchangés et ne sont pas une
autorisation de lire une page Next.js.

## Politique d'accès

- `GET /` : page de présentation, sans session.
- `/connexion` : écran d'authentification, sans session.
- Toute autre route de page : session active requise.
- Visiteur sans session : redirection vers `/connexion` avant le rendu de la
  page privée.
- Session expirée ou révoquée : traitée comme non authentifiée par la vérification
  serveur auprès de Hono.
- API inaccessible ou réponse inattendue : refus fermé pour toute page privée,
  sans effacer les cookies ; afficher une réponse temporairement indisponible
  plutôt que déconnecter l'utilisateur à tort. `/` reste servi comme page publique
  si la session ne peut pas être vérifiée ; il n'est alors pas redirigé vers le
  dashboard.
- Utilisateur déjà connecté sur `/` : redirection vers `/dashboard`, afin que le
  retour OAuth n'atterrisse pas sur la présentation.
- Les routes API et les ressources internes Next.js ne sont pas des pages et
  restent hors du matcher du garde.

## Architecture de sécurité proposée

Le garde côté navigateur actuel n'est pas une frontière de sécurité pour le SSR.
Un garde Next.js `proxy.ts` validera donc l'accès avant de laisser une requête de
page atteindre son rendu. Il appellera le endpoint `/me` de Hono côté serveur et
ne considérera une session valide que si Hono retourne `200`.

Le cookie d'accès `HttpOnly` doit être envoyé avec la requête de page pour que
le proxy puisse l'authentifier. Son chemin passe de `/api` à `/`. Il conserve
`SameSite=Lax`, `Secure` en production, son expiration actuelle, et son nom.
Le proxy transmet à Hono uniquement le cookie d'accès nécessaire, jamais le
cookie de renouvellement. Hono continue à vérifier la signature, l'expiration,
la révocation et l'état du compte ; le proxy ne décode ni ne fait confiance au
JWT seul.

La migration doit éviter les doublons de cookies de même nom avec des chemins
différents : au login, au renouvellement et au logout, les anciennes variantes
`Path=/api` et les nouvelles `Path=/` sont explicitement remplacées ou effacées.
Le cookie de renouvellement reste limité à `/api/auth`.

Le cookie d'accès sera transmis au serveur Next.js sur les requêtes de page et
de ressources du même hôte, car `Path` est un mécanisme de portée de transport,
pas une frontière d'isolation. Il reste inaccessible au JavaScript grâce à
`HttpOnly`. Le proxy n'en transmet que la valeur d'accès à l'API interne. Cette
portée plus large est le compromis requis pour authentifier les requêtes SSR ;
les contrôles API existants restent la protection finale des données.

## Présentation `/`

Créer une landing en français à partir de la maquette desktop D01 : header public
avec logo officiel, hero orienté organisation des parties, CTA vers Discord,
fonctions réellement disponibles, et footer public. L'adaptation mobile suit la
priorité de la maquette desktop et les règles responsive du design system. Ne
pas afficher de parties publiques ni de lien vers `/parties` aux visiteurs.
Ignorer les images de démo externes absentes du dépôt et ne pas inventer de logo.

`/connexion` demeure la seule page fonctionnelle publique en plus de la
présentation. Aucune navigation de l'application ne doit apparaître sur la
landing.

## Référencement

- Le sitemap ne contient que `/`.
- Les routes applicatives ne sont plus publiées dans le sitemap.
- `robots.txt` donne la priorité à la présentation et ne référence aucune page
  applicative ; il ne remplace pas le garde serveur.
- Les pages de parties, MJ, tags et jeux ne sont plus des pages SEO accessibles
  sans session.

## Tests et critères d'acceptation

1. Une requête anonyme à `/` reçoit la page de présentation et ne lance pas de
   vérification de session.
2. Une requête anonyme à `/connexion` reçoit l'écran de connexion.
3. Les requêtes anonymes à `/parties`, `/parties/:slug`, `/mj/:slug`,
   `/tags/:slug`, `/jeux/:slug`, `/dashboard`, et aux routes applicatives
   redirigent avant rendu vers `/connexion`.
4. Une session valide acceptée par Hono permet le rendu des pages protégées.
5. Une session expirée ou révoquée est refusée même si son JWT est encore
   présent.
6. Une panne ou une réponse non reconnue de Hono ne permet jamais le rendu d'une
   page privée et n'efface pas les cookies.
7. Le proxy ne transmet pas le cookie de renouvellement à l'API `/me`.
8. Le login, le renouvellement, le logout et la migration effacent les cookies
   d'accès ayant les deux anciens/nouveaux chemins sans créer de doublon.
9. Les endpoints API conservent leur authentification et leur autorisation
   existantes.
10. Le sitemap n'énumère aucune page applicative et la landing reste responsive
    et navigable au clavier.

## Vérifications de sécurité

- Tests d'accès anonyme, session active, session expirée/révoquée et API en panne.
- Vérification de la portée et des attributs de cookie après login, refresh et
  logout ; aucune valeur réelle de secret ou session dans les tests.
- Le garde échoue fermé avant le rendu serveur.
- Les API Hono restent l'autorité ; masquer une route dans l'interface ne
  remplace pas les contrôles d'accès par ressource.
- Le contenu de présentation ne contient aucune donnée privée ni donnée de
  partie issue de l'API.

## Hors périmètre

- Fermer les endpoints de lecture `public/*` de Hono.
- Supprimer les projections publiques ou le code F03 historique.
- Ajouter une fonctionnalité de compte ou changer le flux OAuth Discord.
- Changer les secrets, clés JWT, durées de session ou le domaine du cookie.

