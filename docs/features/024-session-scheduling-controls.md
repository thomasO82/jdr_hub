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

## Révision des propositions et des séances — 2026-10-14

- **Comportement ajouté :** chaque nouvel envoi crée un tour de vote distinct.
  Une seule proposition peut être ouverte par partie à la fois ; retenir un
  créneau ferme ses options sœurs et le tour. Les votes déjà enregistrés restent
  inchangés.
- **Gestion MJ :** le MJ propriétaire peut consulter les séances planifiées,
  terminées et annulées. Il peut déplacer une séance `SCHEDULED` sans modifier
  la proposition d’origine ni ses votes, ou l’annuler après confirmation. Une
  séance annulée sort du planning, son tour devient `CANCELLED`, son historique
  reste visible et une séance de remplacement ou un nouveau tour peuvent être
  créés. Les statuts `COMPLETED` et `CANCELLED` ne sont plus modifiables.
- **Base :** migration additive `0011_flat_sentinel.sql`, création des tours,
  rattachement des propositions existantes sans supprimer les votes et
  contrainte garantissant un tour `OPEN` au maximum par partie.
- **Preuve TDD — Red :** tests shared/schema manquants, puis tests API/services
  sans les méthodes de tour et de gestion ; les tests client web échouaient sur
  les nouvelles méthodes absentes et les règles de regroupement d’interface.
- **Preuve TDD — Green :** contrats, transactions repository, services,
  endpoints et interface ajoutés ; les tests ciblés API, services et UI passent.
  Le test PostgreSQL vérifie sélection concurrente, création concurrente,
  conservation des votes, modification sans réécriture de la proposition,
  annulation, retrait du planning et séance de remplacement.
- **Résultats :** `pnpm exec vitest run --exclude='.superpowers/**'` — 146
  fichiers/439 tests verts ; tests d’intégration PostgreSQL — 11 fichiers/24
  tests verts ; `pnpm lint`, `pnpm --filter @jdr-hub/web typecheck` et
  `pnpm build` verts. `pnpm test` complet donne 441 tests verts et deux échecs
  temporaires préexistants sous `.superpowers/sdd/2026-09-02-monorepo-foundation`
  car leur fixture `red-baseline` est absente.
- **Sécurité :** listing et mutations vérifient le propriétaire côté serveur ;
  mutations protégées par session, origine exacte, rate limit et schéma Zod
  strict. Les lignes de séance et de tour sont verrouillées pendant leurs
  transitions. Les réponses d’erreur gardent leur enveloppe générique.
- **Vérification navigateur :** tentative Playwright avec données API fictives,
  mais Chromium ne démarre pas car la bibliothèque système `libnspr4.so` manque.
  L’installation des bibliothèques a été bloquée par `sudo` qui demande un mot
  de passe dans cet environnement. Le rendu responsive et les interactions
  navigateur restent donc à vérifier manuellement avant fusion.
- **Dépendance de développement :** `@playwright/test` 1.64.0 a été ajouté à la
  demande antérieure du propriétaire pour les contrôles frontend. Aucun test
  navigateur automatisé n’a pu être exécuté dans cet environnement.

## Correctif des votes clôturés — 2026-10-14

- **Contexte :** un `POST /api/proposals/:id/votes` peut répondre `409` quand le
  vote existe déjà ou que le créneau/le tour a été clôturé. L’API masque la
  cause précise dans son enveloppe d’erreur ; le statut seul ne permet donc pas
  de départager ces situations.
- **Red :** le nouveau test de disponibilité a d’abord échoué car la règle
  partagée de vote n’existait pas. Il vérifie ensuite les tours clos, les
  propositions clôturées, le vote déjà enregistré et leurs libellés français.
- **Green :** les vues desktop et mobile désactivent les choix non votables ;
  l’envoi ignore les propositions fermées et ne s’active qu’après un choix
  valable. Un échec concurrent demande d’actualiser la page.
- **Sécurité :** l’API conserve ses contrôles serveur d’adhésion, de vote
  unique et de statut du tour. Le contrôle frontend ne remplace pas ces règles.
- **Vérifications :** `pnpm exec vitest run --exclude='.superpowers/**'` — 147
  fichiers/444 tests verts ; `pnpm lint` et `pnpm build` verts.
- **Limite :** sans le corps complet de la réponse ni l’état de la proposition,
  la cause du `409` reçu par le propriétaire reste indéterminée. Une modification
  du MJ ou un vote déjà enregistré juste avant la requête reste un conflit
  légitime ; l’interface invite alors à recharger les propositions.
