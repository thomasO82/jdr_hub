# FIX-UX-002 — Gestion et vote des dates de séance

## État

`IN_REVIEW` — branche `feat/session-scheduling-controls`, PR vers `develop` en cours de création.

## Contexte

F06 fournit déjà les API de création de séances fixes, de propositions de
créneaux, de vote et de sélection par le MJ. L’écran de gestion n’exposait
toutefois pas la création des dates, et les actions de vote du tableau de bord
n’étaient pas cliquables.

## Comportement réalisé

- Dans **Gestion de la partie → Séances**, le MJ peut planifier une séance avec
  une date et une plage horaire saisies dans son fuseau de navigateur.
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
