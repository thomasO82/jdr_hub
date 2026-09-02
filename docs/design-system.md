# Système de design — JDR Hub

Version de travail préparatoire au MVP. Ce document consolide les maquettes sans reprendre leurs variations accidentelles. Il ne constitue pas encore une implémentation CSS ou un contrat de composants.

## Principes

- Modernité lisible, avec une touche fantasy légère : surfaces calmes, violet réservé aux actions importantes, iconographie simple.
- Une hiérarchie visuelle explicite : un CTA principal par écran, des panneaux structurés et des états métier lisibles.
- Le texte et les icônes complètent la couleur ; aucun état important ne repose uniquement sur la couleur.
- L’interface MVP est en français par défaut. `Game` est traduit par « partie » et `GameSession` par « séance ».
- Le système est mobile-first pour les composants, avec une composition dédiée au calendrier mobile plutôt qu’un calendrier desktop réduit.

## Marque et logo

L’unique logo officiel est `docs/branding/logo.svg`. Il doit être utilisé tel quel, sans recoloration, modification, déformation, recadrage ni redessin.

- Ratio intrinsèque : 27 × 24 ; conserver ce ratio à toutes les tailles.
- Taille recommandée dans le header : 27 × 24 px pour le symbole, avec le nom « JDR Hub » adjacent lorsque le contexte le permet.
- Taille minimale indicative : 20 × 18 px, uniquement si le rendu reste net et identifiable.
- Texte alternatif du symbole : `JDR Hub` ; si le nom adjacent est déjà exposé, le symbole peut être décoratif pour éviter une répétition.
- Les pictogrammes dé, étoiles, baguette, épées et avatars vus dans Stitch sont des contenus de maquette, jamais des variantes de logo.
- Une version compacte officielle n’existe pas dans les assets fournis ; aucune ne doit être inventée.

## Palette officielle

Les tokens Arcane System desktop/mobile sont retenus car ils sont communs aux deux fichiers `DESIGN.md`, cohérents avec le SVG et majoritaires dans les captures. La palette bleue proposée dans l’ancienne section UI du cahier des charges est conservée comme observation historique, pas comme token principal.

| Token | Valeur | Usage |
| --- | --- | --- |
| `primary` | `#630ED4` | CTA, liens d’action, focus, navigation active |
| `primary-container` | `#7C3AED` | Variante plus lumineuse, FAB, accent de sélection |
| `on-primary` | `#FFFFFF` | Texte et icônes sur violet primaire |
| `primary-fixed` | `#EADDFF` | Surface de sélection douce |
| `primary-fixed-dim` | `#D2BBFF` | Accent violet secondaire |
| `on-primary-container` | `#EDE0FF` | Texte sur conteneur primaire sombre |
| `secondary` | `#515F74` | Métadonnées, navigation secondaire, texte d’information |
| `secondary-container` | `#D5E3FC` | Surface secondaire et filtres neutres |
| `on-secondary-container` | `#57657A` | Texte sur surface secondaire |
| `background` | `#F7F9FB` | Fond général applicatif |
| `surface` | `#F7F9FB` | Header, sidebar et surfaces principales |
| `surface-container-lowest` | `#FFFFFF` | Cartes et panneaux élevés |
| `surface-container-low` | `#F2F4F6` | Sections légèrement différenciées |
| `surface-container` | `#ECEEF0` | Champs, séparateurs de zones |
| `surface-container-high` | `#E6E8EA` | États désactivés et surfaces secondaires |
| `surface-container-highest` | `#E0E3E5` | Contrôles neutres et bordures fortes |
| `on-background` / `on-surface` | `#191C1E` | Texte principal |
| `on-surface-variant` | `#4A4455` | Texte secondaire |
| `outline` | `#7B7487` | Bordures et contrôles secondaires |
| `outline-variant` | `#CCC3D8` | Divisions discrètes |
| `tertiary` | `#654A00` | Information ambre et état « flexible » |
| `tertiary-container` | `#836100` | Badge ambre soutenu |
| `tertiary-fixed-dim` | `#F9BD22` | Accent ambre, avertissement visuel |
| `on-tertiary-container` | `#FFE2AB` | Texte sur conteneur ambre sombre |
| `error` | `#BA1A1A` | Erreur, refus, absence critique |
| `error-container` | `#FFDAD6` | Surface d’erreur |
| `on-error` | `#FFFFFF` | Texte sur erreur |
| `success` | `#2E7D32` | Présence confirmée, réussite ; à vérifier avec les tests de contraste |

Les versions `inverse-*` (`#2D3133`, `#EFF1F3`, `#D2BBFF`) servent aux surfaces inversées et à l’écran de connexion. Une couleur doit être choisie avec son token `on-*` correspondant pour respecter le contraste.

### Thème public provisoire

Le landing desktop est sombre tandis que le landing mobile est clair. En attendant la validation humaine signalée dans l’audit, la règle provisoire est : application et pages authentifiées sur surfaces claires ; connexion Discord sur thème sombre ; landing publique utilisant la composition du desktop et une surface sombre sur grand écran, avec une adaptation claire possible sur mobile seulement après validation. Ce point est volontairement marqué comme décision produit ouverte et ne doit pas être figé silencieusement dans le code.

## Typographie

| Rôle | Police | Taille | Poids | Interligne |
| --- | --- | ---: | ---: | ---: |
| Display | Hanken Grotesk | 48 px | 700 | 1,1 |
| Heading large | Hanken Grotesk | 32 px | 600 | 1,2 |
| Heading large mobile | Hanken Grotesk | 28 px | 600 | 1,2 |
| Heading medium | Hanken Grotesk | 24 px | 600 | 1,3 |
| Heading small | Hanken Grotesk | 20 px | 600 | 1,4 |
| Corps large | Inter | 18 px | 400 | 1,6 |
| Corps standard | Inter | 16 px | 400 | 1,6 |
| Corps secondaire | Inter | 14 px | 400 | 1,5 |
| Label / donnée | Geist | 12 px | 500 | 1,0 |

Les titres peuvent utiliser un espacement de lettres de `-0,02em` pour le display et `-0,01em` pour les headings larges. Les labels de catégorie peuvent être en capitales avec `0,05em`, sans transformer les contenus utilisateur en capitales.

## Échelle, rayons, bordures et ombres

### Espacements

Toutes les valeurs sont des multiples de 4 px : `xs = 4`, `sm = 8`, `md = 16`, `lg = 24`, `xl = 40` px. La base typographique et de grille est 4 px. Utiliser 16 px comme gouttière mobile et 24 px comme marge de conteneur desktop.

### Rayons

| Token | Valeur | Usage |
| --- | ---: | --- |
| `sm` | 4 px | Petits contrôles et éléments compacts |
| `md` | 8 px | Champs, boutons, tags et badges |
| `lg` | 12 px | Panneaux secondaires |
| `xl` | 16 px | Cartes et panneaux principaux |
| `2xl` | 24 px | Hero ou grand conteneur si nécessaire |
| `full` | 9999 px | Avatars, pills et FAB circulaire |

Les `code.html` utilisent parfois un rayon par défaut de 4 px, alors que le `DESIGN.md` associe le défaut à 8 px. Les composants doivent donc utiliser des tokens nommés et explicites ; le rayon `md` de 8 px est le défaut des contrôles.

### Bordures et élévation

- Bordure discrète : 1 px `outline-variant` ou `#E0E3E5`.
- Focus : anneau externe de 2 px `primary`, avec une bordure visible conservée.
- Niveau 0 : aucune ombre sur le fond.
- Niveau 1 : `0 1px 3px 0 rgba(0,0,0,.10), 0 1px 2px -1px rgba(0,0,0,.10)` pour les cartes.
- Niveau 2 : `0 10px 15px -3px rgba(124,58,237,.10), 0 4px 6px -4px rgba(124,58,237,.10)` pour hover ou élément actif élevé.
- Niveau 3 : ombre diffuse violette à environ 15 % pour modal/popover.
- Glassmorphism : réservé aux headers sticky et navigations superposées ; flou de fond indicatif 8 px, avec un fond de repli opaque.

## Largeurs, grille et conteneurs

| Plage | Grille | Marges/gouttières | Composition |
| --- | --- | --- | --- |
| Mobile `< 768 px` | 4 colonnes | 16 px / 16 px | Une colonne, bottom navigation si authentifié |
| Tablette `768–1023 px` | 8 colonnes | 24 px / 16 px | Sidebar réduite ou drawer ; calendrier en liste adaptée |
| Desktop `1024–1439 px` | 12 colonnes | 24 px / 16 px | Sidebar 256 px, contenu flexible |
| Large `≥ 1440 px` | 12 colonnes | 24 px / 16 px | Contenu global plafonné à 1440 px |

- Conteneur global : `max-width: 1440px`.
- Contenu métier confortable : `max-width: 1200px`.
- Texte long/synopsis : `max-width: 800px`.
- La recherche de joueurs peut utiliser toute la largeur du conteneur global, sans dépasser 1440 px.
- Sidebar desktop : largeur fixe 256 px ; elle ne doit pas dupliquer le contenu principal.
- Header desktop : hauteur cible 64 px ; header mobile : hauteur cible 64 px, plus zone sûre si nécessaire.
- Bottom navigation mobile : cinq entrées, hauteur minimale de 72 px hors zone sûre.

## Shell officiel

### `AppHeader`

Un seul composant partagé, avec des emplacements optionnels mais une structure commune : logo officiel à gauche, contexte/page, recherche si nécessaire, notifications, réglages si autorisés, menu utilisateur et CTA contextuel. Le fond, la hauteur, la typographie et les espacements restent constants ; seul l’état actif et les actions contextuelles peuvent varier.

### Navigation desktop

Sidebar persistante à partir de 1024 px :

1. Tableau de bord
2. Parties
3. Joueurs
4. Planning
5. Profil

Le bouton « Créer une partie » est un CTA global distinct, visible uniquement lorsque l’utilisateur est authentifié et autorisé à créer. L’état actif utilise `primary` avec une surface `primary-fixed` ou une barre d’accent, jamais le bleu accidentel de certaines maquettes.

### Navigation mobile

Bottom navigation fixe pour les écrans authentifiés : Tableau de bord, Parties, Joueurs, Planning, Profil. Chaque entrée possède un libellé, une icône Lucide, un état actif iconographique et textuel, une cible tactile minimale de 48 × 48 px et un focus clavier. Les écrans publics et la connexion n’affichent pas cette navigation.

### Menu utilisateur

Le menu affiche le pseudo Discord et l’avatar autorisé, puis Profil, Préférences/Disponibilités selon le périmètre, et Déconnexion. Il ne révèle ni token Discord, ni identifiant technique, ni information privée d’une partie. Il est accessible au clavier, fermé par `Escape` et ancré au bouton déclencheur.

### Footer

Un seul footer public partagé, contenant le nom de marque, les mentions légales, la confidentialité et l’année courante. Il n’est pas ajouté aux écrans applicatifs où la navigation fixe fournit déjà le shell. Les textes de démonstration `© 2024` sont remplacés par une année dynamique lors de l’implémentation.

## Composants

### Boutons

- Primaire : fond `primary`, texte `on-primary`, hauteur 40 px desktop / 48 px mobile, rayon 8 px.
- Secondaire : fond transparent ou surface, bordure `outline`, texte `on-surface`, mêmes hauteurs.
- Fantôme : sans bordure, texte `primary`, réservé aux actions secondaires.
- Danger : fond `error` uniquement pour une action destructive confirmée.
- Icône : carré tactile 48 px, avec libellé accessible si l’icône seule n’est pas évidente.
- Tous les boutons ont des états hover, focus visible, active, disabled et loading ; l’état loading conserve la largeur et expose un message au lecteur d’écran.

### Champs, sélecteurs et filtres

- Labels toujours visibles et associés au contrôle ; aide et erreur reliées par `aria-describedby`.
- Hauteur standard 40 px desktop, 48 px sur mobile ; padding horizontal 16 px ; rayon 8 px.
- Focus : anneau primaire 2 px ; erreur : bordure et message `error`.
- `Select` pour une valeur, `MultiSelect` pour les tags avec compteur et suppression clavier.
- Radio pour le type de partie et les états exclusifs ; checkbox pour les systèmes/tags combinables.
- Toggle pour les préférences ; fournir un libellé textuel et l’état « activé/désactivé ».
- `FilterPanel` regroupe recherche de nom, filtre MJ, tags et filtres complémentaires ; afficher le nombre de filtres actifs et conserver les valeurs dans l’URL.
- La logique multi-tags est `ET` par défaut et l’interface le dit explicitement.

### Cartes de partie

Une carte affiche au minimum titre, système, type, tags pertinents, MJ, places/statut et prochain créneau. L’image est décorative ou possède un texte alternatif utile ; aucune adresse présentielle exacte n’est affichée publiquement. Une carte entière est navigable via un lien identifiable, sans imbriquer plusieurs contrôles incompatibles.

### Tags et filtres

- Tag de contenu : surface `primary-fixed`, texte `on-primary-fixed`/`primary` selon contraste.
- Tag système : surface secondaire claire, texte secondaire.
- Type métier : badge dédié `One-shot` ou `Campagne`, jamais une duplication dans `tags`.
- Tag supprimable : bouton de suppression accessible, zone tactile 32 px minimum incluse dans une cible de 48 px.
- Les tags actifs proviennent du référentiel contrôlé côté API ; les noms et slugs sont normalisés.

### Badges de statut

| Statut | Traitement | Exemple |
| --- | --- | --- |
| En cours / actif | Violet | Partie active, vote ouvert |
| Confirmé / succès | Vert + icône | Séance confirmée |
| En attente | Ambre + icône | Vote ou candidature en attente |
| Refusé / annulé | Rouge + icône | Candidature refusée, séance annulée |
| Brouillon | Neutre | Partie non publiée |

Le texte et l’icône restent présents lorsque la couleur est supprimée ou difficile à distinguer.

### Alertes, notifications et modales

- `Alert` inline pour une information qui modifie la compréhension de la page.
- `Toast` après une action réussie ou échouée, non utilisé comme seul moyen de transmettre une erreur critique.
- `NotificationItem` avec titre, contexte, date relative accessible et état lu/non lu.
- `Modal` niveau 3 avec titre, description, bouton de fermeture explicite, focus piégé et retour du focus à l’ouverture.
- `ConfirmDialog` pour refuser, fermer une partie, signaler une absence ou supprimer une exception ; le texte décrit l’effet réel.

### États vides, chargement et erreur

- État vide : titre explicite, explication courte, CTA de sortie adapté ; ne jamais présenter une page blanche.
- Chargement : skeletons de même structure et de hauteur proche du contenu final ; ne pas masquer une opération longue sans indication.
- Erreur : message public sobre, identifiant de requête si nécessaire pour le support, action Réessayer ; aucune stack trace ni donnée technique.
- Les listes paginées indiquent l’absence de résultat et permettent de réinitialiser les filtres.

## Comportements responsive

### Mobile

Une seule colonne, marges 16 px, contrôles de 48 px, header fixe et bottom navigation pour les écrans authentifiés. Les filtres deviennent une ligne de chips défilable ou une modale ; la grille de disponibilités devient un jour détaillé avec changement de jour ; le calendrier devient un sélecteur de date et une liste d’agenda. Les cartes de candidatures, votes et séances empilent les informations et conservent les actions principales visibles.

### Tablette

Utiliser 8 colonnes et 24 px de marge. La sidebar peut devenir un drawer ou une navigation compacte ; les panneaux secondaires passent sous le contenu principal. Ne pas réduire un tableau de votes ou un formulaire au point de perdre ses intitulés.

### Desktop

Utiliser la sidebar de 256 px, la grille 12 colonnes et des panneaux en deux ou trois zones lorsque cela améliore la lecture. Le catalogue et la recherche de joueurs peuvent présenter filtres et résultats côte à côte. Le planning utilise une vue mois ; les panneaux de prochaines séances et de légende restent accessibles.

## Accessibilité

- HTML sémantique : titres hiérarchisés, `main`, `nav`, `header`, `footer`, listes et tableaux adaptés.
- Navigation clavier complète, ordre de tabulation logique, focus visible et fermeture clavier des popovers/modales.
- Contraste vérifié pour texte, composants et états ; ne pas utiliser le violet clair avec un texte trop pâle.
- Labels explicites pour les champs, boutons et icônes ; les textes tronqués restent accessibles au complet.
- Messages d’erreur et changements de statut annoncés de façon compatible avec les technologies d’assistance.
- Zones tactiles d’au moins 44 × 44 px, cible recommandée 48 × 48 px.
- `prefers-reduced-motion` respecté pour transitions, FAB et changements de page.
- Images décoratives marquées comme telles ; avatars et illustrations utiles ont un texte alternatif descriptif.
- Aucun contenu ou action important ne dépend uniquement du survol, d’une animation ou de la couleur.
- Tester les écrans en largeur mobile, tablette et desktop, avec zoom navigateur et clavier.

## Iconographie

Utiliser Lucide Icons dans l’application, avec un trait de 1,75 px par défaut. Les icônes suivent la couleur du texte parent, sauf accent décoratif primaire. Les Material Symbols utilisés dans Stitch ne sont pas repris comme dépendance implicite ni comme logo.
