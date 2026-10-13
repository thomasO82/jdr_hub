# Architecture Tailwind-only — JDR Hub

## Statut

Conception validée en conversation ; revue du document à effectuer avant
l’implémentation.

## Objectif

Migrer toute l’interface Next.js vers Tailwind CSS sans modifier le
comportement observable, les routes, les contrats HTTP, les données ou les
parcours utilisateur. La migration concerne les écrans existants et les
composants partagés, pas l’ajout d’une fonctionnalité métier.

## Périmètre réel

Les trois feuilles de style actuelles sont concernées :

- `apps/web/features/authentication/connection-view.module.css` ;
- `apps/web/features/games/games-view.module.css` ;
- `apps/web/features/layout/app-shell.module.css`.

Le layout global, les vues de connexion, de catalogue, de détail, de création
et le shell partagé seront migrés. Les fichiers CSS Modules seront supprimés
une fois que leurs consommateurs auront été migrés.

## Source de vérité visuelle

Les tokens et rôles sont ceux de `docs/design-system.md` et des maquettes
Arcane System :

- Hanken Grotesk pour les titres et la marque ;
- Inter pour le texte courant, les champs, les boutons et la navigation ;
- Geist pour les labels et métadonnées ;
- palette Arcane, espacements multiples de 4 px, rayons documentés et
  breakpoints mobile `<768 px`, tablette `768–1023 px`, desktop `>=1024 px`.

## Règles obligatoires

1. Tailwind v4 est importé une seule fois dans `apps/web/app/globals.css`.
2. Les tokens du design system sont déclarés dans `@theme` dans ce fichier.
3. Le style des composants est exprimé par des classes Tailwind dans les
   fichiers TSX.
4. Aucun nouveau fichier `.css` ou `.module.css` n’est autorisé.
5. Aucun `<style>`, style inline, CSS-in-JS ou sélecteur CSS applicatif n’est
   autorisé hors des directives/imports/tokens Tailwind du fichier global.
6. Les variantes Tailwind (`sm`, `md`, `lg`, `hover`, `focus-visible`,
   `disabled`, `motion-reduce`) portent les comportements responsive et les
   états interactifs.
7. Les valeurs arbitraires (`[...]`) sont interdites sauf nécessité visuelle
   documentée et impossible à exprimer avec un token.
8. Les couleurs, tailles, rayons, ombres et familles de fontes utilisent les
   tokens Tailwind ; aucune valeur hexadécimale ou valeur répétée ne doit être
   recopiée dans les composants.
9. Les classes longues doivent rester lisibles : les groupes de classes sont
   ordonnés `layout → spacing → sizing → typography → color → border →
   interaction → responsive`.
10. Les composants réutilisables gardent une responsabilité unique et ne
    contournent pas Tailwind avec une feuille locale.
11. La migration ne modifie aucune logique serveur, requête API, route,
    réponse, cookie, validation ou texte métier.

## CSS global autorisé

`globals.css` peut uniquement contenir :

- `@import "tailwindcss"` ;
- les déclarations `@theme` des tokens JDR Hub ;
- les éventuelles directives Tailwind globales strictement nécessaires au
  reset/accessibilité et documentées dans cette fiche.

Il ne doit pas devenir une nouvelle feuille de composants avec des sélecteurs
personnalisés.

## Plan de migration

1. Ajouter le point d’entrée global et les tokens sans changer le rendu.
2. Migrer le shell partagé et sa navigation.
3. Migrer la connexion Discord.
4. Migrer les vues parties et le formulaire de création.
5. Supprimer les trois CSS Modules devenus inutilisés.
6. Ajouter un test d’architecture qui échoue si un import CSS Module ou un
   fichier de style local réapparaît dans `apps/web`.
7. Vérifier visuellement les maquettes desktop/mobile et exécuter tests,
   lint, typecheck et builds.

## Compatibilité et accessibilité

Les labels, rôles ARIA, focus visibles, contrastes, responsive, états vides et
messages d’erreur existants sont conservés ou améliorés sans changement de
contrat. Les interactions essentielles restent utilisables au clavier et ne
dépendent pas uniquement de la couleur ou du survol.

## Critères d’acceptation

- aucun CSS Module restant dans `apps/web` ;
- aucun style applicatif hors Tailwind ;
- tous les écrans existants compilent avec le layout global ;
- les tokens et rôles typographiques sont utilisés ;
- les tests métier/API existants restent inchangés et verts ;
- le test architectural Tailwind-only est vert ;
- lint, typecheck, tests et builds passent ;
- aucune dépendance, migration ou API publique n’est modifiée.
