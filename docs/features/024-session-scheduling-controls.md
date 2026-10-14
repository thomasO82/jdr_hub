# FIX-UX-002 — Gestion et vote des dates de séance

## État

`IN_REVIEW` — branche `feat/session-scheduling-controls`, [PR #34](https://github.com/thomasO82/jdr_hub/pull/34) vers `develop`.

## Contexte

F06 fournit déjà les API de création de séances fixes, de propositions de
créneaux, de vote et de sélection par le MJ. L’écran de gestion n’exposait
toutefois pas la création des dates, et les actions de vote du tableau de bord
n’étaient pas cliquables.

## Comportement réalisé

- Dans **Gestion de la partie → Séances**, le MJ peut planifier une séance avec
  une date et une plage horaire saisies dans son fuseau de navigateur.
- Le panneau demande d’abord le mode de planification. Après le choix d’une
  date fixe ou de créneaux à proposer, seul le formulaire correspondant reste
  visible ; « Changer de mode » permet de revenir au choix.
- Les formulaires refusent localement une fin antérieure ou égale au début et
  indiquent clairement qu’il faut choisir une heure de fin postérieure. L’API
  conserve sa validation complète comme contrôle final.
- Le MJ peut proposer de un à dix créneaux. Il peut en ajouter ou en retirer,
  consulter les votes reçus et retenir explicitement un créneau.
- La séance créée ou retenue affiche un lien direct vers sa position dans le
  planning. Les propositions retenues sont retirées de la liste des choix ouverts.
- Les actions `VOTE` du tableau de bord ouvrent l’écran de vote de la partie.
- Le frontend utilise les contrats et endpoints F06 existants ; aucun changement
  de schéma, d’API ou de dépendance n’est inclus.

## Preuve TDD

- **Red :** les tests du panneau et du lien ont été écrits puis exécutés avant
  les composants correspondants ; l’import échouait car ces modules
  n’existaient pas.
- **Green :** le panneau de dates rend les deux parcours, et l’action de vote
  produit la route `/parties/{gameId}/vote`.
- **Refactor :** ajout du lien vers la séance planifiée, affichage des bornes
  début/fin et compteur basé sur les propositions ouvertes.
- **Résultat ciblé :** tests scheduling/UI et dashboard verts.
- **Non-régression :** 143 fichiers et 422 tests passent en excluant deux
  anciens tests temporaires dans `.superpowers` qui lisent un répertoire
  `red-baseline` absent. Le lancement sans exclusion échoue uniquement sur ces
  deux tests temporaires ; aucun test suivi du dépôt n’a été modifié.
- **Couverture :** non mesurée par les commandes disponibles.

## Sécurité

- Les mutations continuent de passer par les endpoints F06 qui exigent une
  session, l’origine applicative et le propriétaire de la partie.
- La consultation des propositions reste protégée aux propriétaires et
  membres actifs ; le vote et le choix du créneau gardent leurs contrôles API.
- Les limites one-shot, formats de date, durées et quantités restent appliqués
  par les validations et services backend existants. Les erreurs affichées
  sont reformulées en français sans détail de réponse API.
- Aucune donnée personnelle ni horaire n’est ajouté aux logs.

## Vérifications

- `pnpm exec vitest run apps/web/tests/session-scheduling-panel.test.tsx apps/web/tests/dashboard-scheduling-action.test.ts apps/web/tests/gm-management-visual.test.ts apps/web/tests/dashboard-visual.test.ts apps/web/tests/scheduling-api.test.ts` — 5 fichiers, 10 tests verts.
- `pnpm exec vitest run --exclude='.superpowers/**'` — 143 fichiers, 422 tests verts.
- `pnpm --filter @jdr-hub/web typecheck` — vert.
- `pnpm lint` — vert.
- `pnpm build` — API et Next.js verts.
- `git diff --check` — vert.
- Playwright 1.64 sur le build de production, avec une API fictive : séance fixe créée, créneaux envoyés puis un créneau retenu. Bureau 1440×1000 et mobile 390×844 ; aucune erreur console. Captures : [bureau](024-session-scheduling-controls/desktop.png) et [mobile](024-session-scheduling-controls/mobile.png).

## Limites et points à vérifier

- La vérification Playwright utilise une API fictive ; tester également le
  parcours avec l’API et une partie réelle avant la fusion, notamment le vote
  joueur et la limite du troisième/quatrième créneau du one-shot.
- L’API reste l’autorité finale pour les dates invalides, la limite de trois
  séances d’un one-shot et les autorisations ; le frontend présente un message
  générique en cas de refus.

## Suivi UX — 2026-10-14

- **Red :** le test SSR vérifiait le sélecteur de mode et l’absence des deux
  formulaires au premier affichage ; il échouait car les deux formulaires
  étaient rendus simultanément.
- **Green :** un état local mémorise le mode choisi, masque le sélecteur pendant
  l’édition et rend uniquement le formulaire correspondant.
- **Refactor :** le retour au sélecteur est explicite et conserve les brouillons
  saisis dans chaque formulaire.
- **Vérification interactive :** Playwright sur le build de production a choisi
  chaque mode, confirmé que l’autre choix disparaissait, créé une séance fixe,
  proposé puis retenu un créneau. Viewports 1440×1000 et 390×844 ; aucune erreur
  console. Captures mises à jour ci-dessus.
- **Résultats après suivi :** 143 fichiers et 422 tests passent hors deux tests
  temporaires `.superpowers` qui ciblent un répertoire absent ; `pnpm lint` et
  `pnpm build` passent.

## Suivi validation des horaires — 2026-10-14

- **Red :** tests du validateur avec le payload signalé (fin le 14 octobre,
  début le 15) et un intervalle croissant ; l’import du validateur échouait car
  il n’existait pas encore.
- **Green :** les deux formulaires consultent le validateur avant l’appel API et
  affichent un message français si la fin n’est pas postérieure au début.
- **Refactor :** le validateur reste dans un petit module UI commun aux deux
  parcours ; la validation serveur reste inchangée.
- **Résultats :** 144 fichiers et 424 tests passent hors deux tests temporaires
  `.superpowers` qui ciblent un répertoire absent ; `pnpm lint` et `pnpm build`
  passent.
- **Playwright :** les deux formulaires bloquent le payload inversé sans appel
  API ; la création d’une date fixe et l’envoi puis la sélection d’un créneau
  valide fonctionnent toujours. Aucune erreur console.
