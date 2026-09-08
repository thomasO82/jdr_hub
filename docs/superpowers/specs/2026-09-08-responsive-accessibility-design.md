# F10 — Responsive, accessibilité et états UI

## Statut de la conception

Proposée après validation du périmètre initial F10 par le propriétaire.

## Objectif

Harmoniser le shell applicatif et les écrans authentifiés prioritaires sur mobile, tablette et desktop, tout en rendant leurs états de chargement, vide, erreur et interaction utilisables au clavier et compréhensibles par les technologies d’assistance.

Cette tranche ne modifie aucune règle métier, aucun contrat REST, aucune migration et aucune permission côté serveur.

## Périmètre de cette tranche

### Inclus

- refactorisation de `AppShell` autour d’un header applicatif partagé, d’une navigation desktop, d’un header mobile et d’une navigation mobile cohérents ;
- conservation du logo officiel `docs/branding/logo.svg` et des tokens Arcane documentés ;
- harmonisation du shell sur les écrans authentifiés existants ;
- revue responsive prioritaire de `/dashboard`, `/planning`, `/disponibilites`, `/joueurs` et `/profil/xp` ;
- états loading, empty, error, retry et disabled cohérents pour ces écrans ;
- focus visible, ordre de tabulation, labels, `aria-*`, annonces d’état et fermeture clavier des interactions déjà présentes ;
- respect de `prefers-reduced-motion` pour les animations et transitions ajoutées ou corrigées ;
- tests de structure, d’accessibilité statique et de responsive class naming sans introduire une nouvelle dépendance de production.

### Explicitement reporté

- conception complète des parcours mobiles absents des maquettes : création de partie, détail de partie et gestion MJ ;
- modification de règles métier, endpoints, schémas partagés ou permissions ;
- refonte visuelle de la landing publique et résolution du choix de thème sombre/clair encore ouvert dans l’audit ;
- dépendance E2E ou moteur de capture ajouté au workspace.

## Références design retenues

- palette Arcane System, avec `primary` violet, surfaces claires applicatives et contraste sémantique ;
- Hanken Grotesk pour les titres, Inter pour le texte et Geist pour les labels/métadonnées ;
- header desktop de 64 px, header mobile fixe de 64 px, navigation mobile de cinq entrées et cibles tactiles minimales de 48 × 48 px ;
- grille mobile 4 colonnes, tablette 8 colonnes et desktop 12 colonnes ;
- footer public uniquement ; les écrans authentifiés conservent la navigation applicative ;
- français comme langue d’interface, sans recopier les variations anglaises accidentelles de Stitch.

## Architecture proposée

`AppShell` reste le point de composition utilisé par les vues authentifiées, mais délègue sa structure à des composants internes réutilisables :

- `AppHeader` : contexte de page et actions globales, dont la cloche de notifications ;
- `DesktopSidebar` : marque, navigation principale et CTA de création ;
- `MobileHeader` : marque, actions globales et zone sûre supérieure ;
- `MobileBottomNav` : les cinq destinations applicatives et l’état actif ;
- `AsyncState` ou des composants d’état locaux lorsque le contenu exige une sémantique plus précise.

Les composants de présentation ne récupèrent aucune donnée métier. Les vues existantes conservent leurs clients API et leurs états fonctionnels ; la refactorisation ne fait que normaliser la composition et l’accessibilité.

## Responsive

- Les marges et colonnes suivent les tokens documentés, sans valeurs arbitraires sauf justification visuelle ;
- les panneaux secondaires passent sous le contenu principal sur tablette et mobile ;
- les cartes et listes empilent leurs métadonnées sans masquer une action importante ;
- les tableaux ou grilles complexes disposent d’une représentation lisible en mobile, ou d’un défilement horizontal annoncé lorsqu’aucune réduction ne conserve l’information ;
- le contenu reste visible au-dessus de la navigation fixe et des FAB, avec un padding inférieur adapté ;
- les contrôles importants ne dépendent ni du hover ni d’une couleur seule.

## Accessibilité et états

- un seul `main` et une hiérarchie de titres cohérente par vue ;
- `aria-label`, `aria-labelledby`, `aria-live` et `role="status"`/`role="alert"` uniquement lorsque leur sémantique est utile ;
- focus visible sur liens, boutons, champs, onglets, popovers et actions de retry ;
- retour du focus après fermeture d’une interaction déjà modale ou popover ;
- boutons de chargement désactivés avec texte stable et message vocalisable ;
- erreurs traduites en français clair, sans exception brute ni identifiant sensible ;
- états vides expliquant la situation et proposant l’action suivante lorsqu’elle existe ;
- animations désactivables avec `motion-reduce` et absence de clignotement nécessaire à la compréhension.

## Tests et critères d’acceptation

### Tests automatisés

- tests de structure du shell : logo officiel, une seule navigation desktop/mobile, ordre des cinq destinations, action de notification et absence de style inline ;
- tests de vues : présence des états loading/empty/error/retry et des labels/focus visibles ;
- tests de clients API existants pour vérifier qu’aucun changement de contrat n’est introduit ;
- tests TypeScript, lint, tests monorepo et build web/API.

### Vérification manuelle

- dashboard, planning, disponibilités, joueurs et profil XP à 375 px, 768 px et 1280 px ;
- parcours clavier depuis le header jusqu’au contenu principal et à la navigation mobile ;
- ouverture/fermeture de la cloche avec `Escape` ;
- zoom navigateur et réduction des animations ;
- contraste et lisibilité des états erreur, vide et désactivé.

## Sécurité et non-régression

- ne pas ajouter d’information au HTML qui n’était pas déjà autorisée par le contrat ;
- conserver CSP, échappement React, URLs internes encodées et absence de secrets dans le DOM ;
- ne pas transformer une route privée en page indexable ;
- ne pas modifier les tests métier ou de sécurité fusionnés ;
- conserver les appels API credentialed et les messages d’erreur français.

## Décisions de conception

1. La tranche commence par le shell et cinq écrans authentifiés déjà existants ; les trois écrans mobiles sans maquette seront traités séparément.
2. Le nom de marque, les destinations et le vocabulaire français sont harmonisés dans le shell ; les différences Stitch en anglais ne sont pas reproduites.
3. Les états UI sont des composants ou conventions frontend, sans nouveau format de réponse serveur.
4. L’absence d’un outil E2E/axe dans le workspace ne justifie pas l’ajout d’une dépendance dans cette tranche ; les tests statiques existants et la vérification manuelle documentée restent la preuve prévue.
