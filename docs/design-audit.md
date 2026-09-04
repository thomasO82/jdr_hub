# Audit design — JDR Hub

## Objet et méthode

Cet audit prépare le développement du MVP sans produire de code applicatif. Les sources ont été analysées dans l’ordre défini par `AGENTS.md` :

1. `docs/branding/logo.svg` et `docs/branding/README.md` ;
2. la landing page desktop, puis la landing page mobile ;
3. les autres maquettes desktop et mobile ;
4. `docs/specifications/cahier-des-charges.md` ;
5. `docs/security/security-requirements.md`.

Les 24 fichiers `code.html` de Stitch ont été lus comme des références visuelles et structurelles uniquement. Les 24 captures `screen.png` ont été inspectées. Les liens d’images `aida-public` présents dans les fichiers Stitch sont des ressources générées par la maquette ; aucune ressource graphique locale supplémentaire n’est fournie avec les écrans.

Les noms de répertoires existants sont parfois générés avec des caractères accentués remplacés par `_` (`cr_er`, `d_tails`, `disponibilit_s`, `cr_neaux`). Les chemins ci-dessous reprennent les chemins réels du dépôt.

## Inventaire des écrans

### Desktop — 13 écrans

| ID | Écran fonctionnel | Référence | Éléments principaux |
| --- | --- | --- | --- |
| D01 | Landing publique | `docs/maquettes/desktop/jdr_hub_accueil/` | Header public, hero, fonctionnalités, parties à la une, footer |
| D02 | Catalogue des parties | `docs/maquettes/desktop/catalogue_des_parties/` | Sidebar, filtres, recherche implicite, cartes de parties, pagination/vue |
| D03 | Connexion Discord | `docs/maquettes/desktop/connexion_discord_plein_cran_jdr_hub/` | Écran plein écran, OAuth Discord, accès invité, mentions légales |
| D04 | Création d’une partie — étape 1 | `docs/maquettes/desktop/cr_er_une_partie_tape_1/` | Progression, titre, système, mode, type one-shot/campagne |
| D05 | Détail d’une partie | `docs/maquettes/desktop/d_tails_de_la_partie_la_crypte_maudite/` | Hero, synopsis, tags, séances, MJ, roster, candidature |
| D06 | Gestion des candidatures | `docs/maquettes/desktop/gestion_des_candidatures_jdr_hub/` | Onglets de statut, cartes candidats, actions MJ, statut de campagne |
| D07 | Gestion des disponibilités | `docs/maquettes/desktop/gestion_des_disponibilit_s_jdr_hub/` | Grille semaine type, exceptions, préférences, sauvegarde |
| D08 | Gestion MJ d’une partie | `docs/maquettes/desktop/gestion_mj_la_crypte_maudite/` | Onglets de gestion, candidatures, roster, besoins, prochaine séance |
| D09 | Planning | `docs/maquettes/desktop/planning_jdr_hub/` | Calendrier mensuel, séances, légende, prochaines séances, absence |
| D10 | Profil utilisateur | `docs/maquettes/desktop/profil_utilisateur_jdr_hub/` | XP, niveau, chronique, systèmes, campagnes actives, historique, statistiques |
| D11 | Recherche de joueurs | `docs/maquettes/desktop/recherche_de_joueurs_jdr_hub/` | Filtres, cartes joueurs, pagination, vue grille/liste |
| D12 | Tableau de bord | `docs/maquettes/desktop/tableau_de_bord_jdr_hub/` | Prochaine séance, parties actives, activité, XP |
| D13 | Vote de créneaux | `docs/maquettes/desktop/vote_de_cr_neaux_jdr_hub/` | Tableau des disponibilités, résumé des votes, activité, choix MJ |

### Mobile — 11 écrans

| ID | Écran fonctionnel | Référence | Éléments principaux |
| --- | --- | --- | --- |
| M01 | Accueil authentifié | `docs/maquettes/mobile/accueil_jdr_hub_mobile/` | Hero d’accueil, raccourcis, campagnes à la une, bottom navigation |
| M02 | Catalogue / campagnes | `docs/maquettes/mobile/catalogue_des_parties_mobile/` | Recherche, filtres horizontaux, campagnes de l’utilisateur, FAB, bottom navigation |
| M03 | Connexion Discord | `docs/maquettes/mobile/connexion_discord_mobile/` | Visuel immersif, OAuth Discord, aide, confidentialité |
| M04 | Gestion des candidatures | `docs/maquettes/mobile/gestion_des_candidatures_mobile/` | Résumé de partie, onglets de statut, cartes candidats, actions |
| M05 | Disponibilités | `docs/maquettes/mobile/gestion_des_disponibilit_s_mobile/` | Jours, détail du jour choisi, exceptions, préférences, barre d’action fixe |
| M06 | Landing publique | `docs/maquettes/mobile/landing_page_publique_mobile/` | Hero illustré, CTA Discord, fonctionnalités, footer |
| M07 | Planning | `docs/maquettes/mobile/planning_jdr_hub_mobile/` | Sélecteur de dates, prochaines séances, propositions en attente, FAB |
| M08 | Profil utilisateur | `docs/maquettes/mobile/profil_utilisateur_mobile/` | Profil, XP, chronique, statistiques, parties actives, déconnexion |
| M09 | Recherche de joueurs | `docs/maquettes/mobile/recherche_de_joueurs_mobile/` | Recherche, chips de filtres, cartes joueurs, bottom navigation |
| M10 | Tableau de bord | `docs/maquettes/mobile/tableau_de_bord_mobile/` | Prochaine séance, campagnes actives, notification, bottom navigation |
| M11 | Vote de créneaux | `docs/maquettes/mobile/vote_de_cr_neaux_mobile/` | Cartes de propositions, sélection, nombre de disponibilités, validation |

### Correspondance desktop/mobile

| Desktop | Mobile | Correspondance | Écart principal |
| --- | --- | --- | --- |
| D01 Landing publique | M06 Landing publique | Partielle | Même objectif, mais structure, visuel, ton et thème différents |
| D02 Catalogue | M02 Catalogue / campagnes | Partielle | Desktop découvre les parties publiques ; mobile montre surtout les campagnes de l’utilisateur |
| D03 Connexion Discord | M03 Connexion Discord | Directe | Mise en page, visuel et wording différents ; le desktop propose aussi un accès invité |
| D04 Création | — | Manquante côté mobile | Aucun parcours de création responsive n’est fourni |
| D05 Détail partie | — | Manquante côté mobile | Aucun détail de partie mobile n’est fourni |
| D06 Candidatures | M04 Candidatures | Directe | Desktop riche en informations et actions ; mobile simplifie les cartes et traduit partiellement le contenu |
| D07 Disponibilités | M05 Disponibilités | Directe | Grille complète desktop contre détail d’un jour à la fois sur mobile |
| D08 Gestion MJ | — | Manquante côté mobile | Aucun écran de gestion de partie mobile complet |
| D09 Planning | M07 Planning | Directe | Calendrier mensuel desktop contre agenda et propositions mobile |
| D10 Profil | M08 Profil | Directe | Desktop orienté MJ et historique ; mobile orienté personnage, statistiques et déconnexion |
| D11 Joueurs | M09 Joueurs | Directe | Desktop dispose de filtres détaillés ; mobile réduit les filtres à des chips |
| D12 Dashboard | M10 Dashboard / M01 Accueil | Partielle | M10 est l’équivalent le plus proche ; M01 est une variante d’accueil authentifié |
| D13 Vote | M11 Vote | Directe | Tableau desktop contre cartes verticales mobile |

Écrans manquants côté mobile : création de partie, détail de partie et gestion MJ. Écrans sans équivalent desktop strict : M01 accueil authentifié et M06 landing publique, car D01 est une landing desktop mais son contenu diffère fortement. Les maquettes ne couvrent pas non plus les pages publiques SEO `/mj/[slug]`, `/tags/[slug]` et `/jeux/[slug]` demandées par le cahier des charges.

## Comparaison visuelle et contenu

### Logo et identité

- La source officielle et unique est `docs/branding/logo.svg`. Elle contient un hexagone violet (`#630ED4`) avec un contour noir, dans un ratio intrinsèque de 27 × 24.
- Les maquettes utilisent à la place des icônes Material Symbols ou des illustrations : dé, étoiles, baguette, épées, hexagone, avatar et parfois une image de fond. Le mot-symbole et le sous-titre varient : « Digital Dungeon Master », « Dungeon Master », « Digital DM Console » ou aucun sous-titre.
- Certains écrans montrent un logo illustré, un logo recadré ou un visuel parasite/coupé, notamment le planning desktop. Ces variantes ne sont pas des sources de marque.
- Décision commune : ne réutiliser aucune icône de maquette comme logo, ne pas recolorer ou redessiner le SVG officiel, ne pas déformer son ratio. Le texte « JDR Hub » peut accompagner le SVG comme libellé de marque, mais ne le remplace pas.
- Les images externes `lh3.googleusercontent.com/aida-public/...` servent d’avatars ou d’illustrations de démonstration. Elles ne doivent pas être considérées comme des assets de production ni être recopiées dans l’application.

### Header, navigation et footer

- Le desktop alterne une sidebar de 256 px, un header supérieur, ou les deux. Les hauteurs, ombres, fonds translucides, sous-titres de marque, intitulés d’actions et états actifs ne sont pas uniformes.
- La sidebar desktop propose généralement cinq entrées, mais les libellés alternent entre `Dashboard / Games / Players / Schedule / Profile` et des équivalents français. Les écrans de landing et de connexion ont un shell public distinct.
- Les états actifs sont tantôt violets, tantôt bleus, tantôt signalés par un liseré droit. La version violette est la plus proche de l’accent de marque et sera retenue.
- Les barres supérieures desktop mélangent recherche globale, notifications, réglages, avatar et CTA « Create Post », « New Game » ou « New Campaign ». Ces variations doivent devenir des slots d’actions dans un unique `AppHeader`, pas des composants concurrents.
- Le mobile utilise majoritairement un header fixe de 64 px et une bottom navigation de cinq entrées. Les écrans publics et de connexion n’ont pas de bottom navigation. L’ordre récurrent est Dashboard, Games, Players, Calendar, Profile.
- `Schedule` côté desktop et `Calendar` côté mobile désignent le même espace fonctionnel. Le cahier des charges emploie « Planning » ; ce terme est retenu pour le produit français.
- Le footer est visible dans la landing desktop et la landing mobile, mais absent des écrans applicatifs. Décision réversible : footer public uniquement ; les écrans authentifiés utilisent la navigation applicative.
- `docs/branding/README.md` référence `desktop/landing-page/` et `mobile/landing-page/`, chemins absents du dépôt. Les dossiers réels sont `desktop/jdr_hub_accueil/` et `mobile/landing_page_publique_mobile/`. Le fichier existant n’est pas modifié dans cette tâche.

### Couleurs et typographies

- Les maquettes Arcane System desktop et mobile partagent le même jeu de tokens : primaire violet `#630ED4`, conteneur primaire `#7C3AED`, surface `#F7F9FB`, texte `#191C1E`, secondaire ardoise `#515F74`, accent ambre et couleurs d’erreur.
- Le cahier des charges propose une palette plus ancienne où le bleu ardoise est primaire (`#37474F`) et le violet un accent (`#7E57C2`). Cette proposition contredit les tokens Arcane, le logo officiel et la majorité des captures ; la palette Arcane est retenue pour le design system.
- Le landing desktop est sombre (`#2D3133` avec héro très sombre), tandis que le landing mobile est clair. C’est une divergence importante de thème et non un simple détail responsive ; une proposition provisoire est documentée dans `design-system.md` et doit être validée.
- Les titres utilisent Hanken Grotesk, le corps Inter et les labels/données Geist. Les poids et tailles sont relativement stables dans les `code.html`, même si les textes visibles varient.
- Le contenu alterne français et anglais, y compris dans un même écran : `Games`, `Players`, `Schedule`, `Create Post`, `Your Campaigns`, `DMing`, contre des titres et messages français. La copie MVP sera en français par défaut, conformément au cahier des charges et à la présente collaboration.

### Boutons, formulaires, cartes, badges et tags

- Le bouton primaire est généralement violet plein, avec texte blanc, rayon arrondi et icône optionnelle. Les boutons secondaires sont à contour violet/ardoise ; les actions tertiaires sont en style fantôme.
- Les tailles varient entre des boutons compacts de 32–40 px et des CTA de 48–56 px. Le système unifie une hauteur standard de 40 px, une variante tactile mobile de 48 px et une hauteur héro de 48 px.
- Les formulaires de création présentent des champs larges, labels en capitales et sélecteurs avec chevron ; les filtres du catalogue ajoutent cases à cocher, radios et segments. Les états de focus ne sont pas visibles de manière homogène.
- Les cartes de parties desktop combinent image, système, type, description, MJ, créneau et places. La carte mobile de catalogue est plutôt une carte de campagne personnelle avec séance et rôle (`DMing`/`Playing`) ; elle ne couvre pas toutes les données publiques demandées.
- Les tags sont tantôt des chips violettes, tantôt gris ardoise, tantôt des badges de système. Le type `ONE_SHOT`/`CAMPAIGN` ne doit pas être stocké comme tag : il reste un champ métier dédié.
- Les statuts utilisent violet, ambre, vert ou rouge, mais certains contrastes sont trop faibles (notamment texte pâle sur badge violet clair). Le design system imposera un texte sémantique contrasté et ne reposera pas uniquement sur la couleur.
- Les cartes de candidatures desktop exposent davantage de métadonnées, badges de vérification, micro et disponibilité ; le mobile ne conserve que l’essentiel. Cette réduction est acceptable si l’information et les actions restent accessibles.

## Incohérences fonctionnelles à traiter

1. L’étape de création affiche le one-shot comme « une session unique », alors que la spécification autorise une à trois séances. Le texte doit devenir « une aventure autonome en une à trois séances maximum » et afficher la progression `X / 3` après création.
2. La création propose `En ligne (VTT)`, hybride et `Play-by-Post`, et le détail affiche VTT/Roll20. Le VTT et les intégrations de table virtuelle sont hors MVP. Le MVP doit conserver un mode en ligne ou présentiel logistique, sans implémenter de VTT ; le libellé exact du mode en ligne nécessite validation si l’on veut mentionner Discord.
3. La recherche de parties requise par la spécification inclut nom, MJ, tags et filtres complémentaires. La capture desktop expose des filtres système/type/format, mais pas de champ de recherche ni de filtre MJ visible ; la capture mobile présente des campagnes de l’utilisateur plutôt qu’un catalogue public. Les deux doivent converger vers le contrat de recherche serveur.
4. La spécification impose des tags relationnels avec une logique multi-tags `AND`. Les maquettes montrent des chips mais ne montrent pas la règle `ET`. Elle devra être explicitée dans l’UI et les résultats.
5. L’écran mobile de recherche de joueurs n’expose pas la compatibilité de disponibilité pourtant demandée. Il faut afficher une information compatible sans publier les disponibilités précises par défaut.
6. L’écran de planning desktop propose « Signaler une absence », mais le planning mobile n’expose pas d’action équivalente. L’action doit exister dans les deux formats, avec confirmation et notification Discord.
7. Le vote desktop affiche `Oui / Peut-être / Non / Sans réponse` dans un tableau ; le mobile réduit parfois cet état à des compteurs. Le modèle et l’accessibilité doivent conserver les quatre états, même si l’affichage est condensé.
8. Les écrans utilisent `Session`, `Jeu`, `Campagne` et `Partie` de façon interchangeable. Le vocabulaire officiel sera « partie » pour `Game` et « séance » pour `GameSession`.
9. Les candidatures desktop comportent une action de message et le dashboard affiche un journal de messages. Le chat temps réel complet est hors MVP. Les actions doivent se limiter au message fonctionnel nécessaire au dossier de candidature ou à une notification, sans créer un module de chat.
10. Les pages publiques SEO prévues pour les parties, MJ, tags et systèmes de jeu ne sont pas couvertes par les captures. Elles restent obligatoires dans le plan et devront recevoir des états responsive dédiés.
11. Les captures affichent des avatars, illustrations et informations qui ressemblent à des données de démonstration. Les données privées, disponibilités précises, adresses présentiel et tokens Discord ne doivent jamais être rendus publics par imitation de ces écrans.

## Composants communs identifiés

### Shell et navigation

- `AppHeader` unique : logo officiel, titre de contexte, recherche optionnelle, notifications, menu utilisateur et actions contextuelles.
- `DesktopSidebar` et `MobileBottomNavigation`, rendus par le shell commun et non par chaque page.
- `UserMenu` : profil, préférences, déconnexion, état connecté.
- `PublicHeader` et `PublicFooter` comme variantes du même système de marque, avec les mêmes tokens.

### Primitives et composants métier

- Boutons primaire, secondaire, fantôme, danger et icône ; états hover, focus, actif, désactivé et chargement.
- `TextField`, `TextArea`, `Select`, `MultiSelect`, radio, checkbox, toggle, date/heure et champ de recherche.
- `Tag`, `TagSelector`, `FilterBar`, `FilterPanel`, compteur de filtres et pagination URL.
- `GameCard`, `GameStatusBadge`, `GameTypeBadge`, `PlayerCount`, avatar et pile d’avatars.
- `Panel`, `SectionCard`, `Tabs`, `EmptyState`, `Skeleton`, `ErrorState`, `Toast`, `Alert`, `Modal`, `ConfirmDialog`.
- `ProgressBar` pour XP et capacité, `StepIndicator` pour la création, `CalendarGrid`, `AgendaList` et `TimeProposalCard`.
- `ApplicationCard`, `RosterList`, `InvitationCard`, `AvailabilityGrid`, `AvailabilityDayCard`, `VoteMatrix` et `AttendanceControl`.
- `NotificationItem`, timeline d’activité, légende de planning et badges de statut accessibles.

## Décisions prises sans risque important

- Utiliser exclusivement `docs/branding/logo.svg` comme asset de logo ; ne copier aucune variante Stitch.
- Centraliser le shell dans `AppHeader`, la sidebar desktop, la navigation mobile, le menu utilisateur et le footer public.
- Utiliser les tokens Arcane System communs desktop/mobile comme base du design system, avec le violet `#630ED4` pour les actions et états actifs.
- Retenir Hanken Grotesk pour les titres, Inter pour le texte courant et Geist pour les labels/données.
- Conserver une grille de base de 4 px et les espacements 4/8/16/24/40 px.
- Employer « partie » et « séance » de manière distincte, et conserver `ONE_SHOT`/`CAMPAIGN` comme champ métier dédié.
- Utiliser « Planning » comme libellé français commun à la place de l’alternance `Schedule`/`Calendar`.
- Rendre le footer uniquement sur les pages publiques et utiliser la navigation applicative sur les pages authentifiées.
- Ne pas reprendre les images distantes, les textes de démonstration, les icônes Material Symbols ou les liens `href="#"` comme production.
- Pour D03/M03 (connexion Discord), conserver la composition sombre et centrée du desktop à tous les breakpoints. La variante mobile avec illustration distante, titre tronqué et carte vitrée est écartée : le mobile utilise le logo officiel, une hiérarchie identique au desktop et un unique CTA Discord tactile. Décision validée par le propriétaire le 2026-09-04.

## Points nécessitant validation humaine

1. Thème de la landing : conserver le thème sombre prioritaire du desktop sur mobile, ou adopter le thème clair visible dans la landing mobile ? La décision modifie fortement l’identité publique.
2. Wording du mode en ligne : le cahier des charges exclut le VTT, tandis que plusieurs maquettes mentionnent `VTT`, `Foundry` et `Roll20`. Il faut confirmer le libellé et le périmètre exacts du mode en ligne.
3. Périmètre de l’écran mobile de catalogue : doit-il être un catalogue public identique au desktop ou une vue des campagnes de l’utilisateur ?
4. Identité éditoriale : confirmer que toute l’interface MVP doit être en français, y compris les noms de navigation actuellement en anglais dans Stitch.
5. Exposition publique des profils joueurs : confirmer quelles informations (pseudo, systèmes, niveau, préférences, compatibilité) sont publiques et quelles informations restent privées ou réservées aux membres.
6. Absence d’un écran mobile de création, de détail et de gestion MJ : valider qu’ils seront dérivés du desktop au moment de l’implémentation avant toute réalisation UI.
7. Les valeurs d’XP et la présentation des statistiques de carrière sont proposées dans les maquettes mais doivent rester alignées sur les événements et seuils validés dans le cahier des charges.

## Conclusion

Le socle visuel est suffisamment cohérent pour démarrer après validation des points ci-dessus : palette Arcane, typographie Hanken/Inter/Geist, surfaces claires applicatives, violet de marque et shell partagé. Les écarts les plus importants ne sont pas des détails CSS : ils concernent la langue, le thème de la landing, la frontière VTT/hors MVP, la nature du catalogue mobile et la confidentialité des données. Ils sont donc signalés avant implémentation.
