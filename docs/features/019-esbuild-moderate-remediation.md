# Remédiation esbuild et correction du scan Docker Scout CI

## Identifiant

FIX-SEC-002

## Statut

`MERGED`

## Dates

- Début : 2026-10-13
- Fin : 2026-10-13

## Branche

`fix/esbuild-moderate-remediation`

## Pull Request

[PR #26](https://github.com/thomasO82/jdr_hub/pull/26), fusionnée dans `develop` le 2026-10-13.

## Contexte et besoin utilisateur

Après la fusion de FIX-SEC-001, `pnpm audit` signalait encore une vulnérabilité
modérée d'esbuild transitivement apportée par la chaîne de `drizzle-kit`. Les
runs CI des PR #24 et #25 échouaient également sur leur job `quality`, mais les
logs des étapes étaient inaccessibles. Le workflow appelait `docker scout`
directement sans installer le plugin ; la commande n'est pas disponible dans
l'environnement local examiné. Cette cause CI est donc probable, mais ne sera
confirmée qu'après exécution du workflow corrigé.

## Périmètre

- Forcer esbuild à une version corrigée déjà présente dans le graphe verrouillé,
  sans mettre à jour de dépendance directe ni modifier le comportement métier.
- Utiliser l'action officielle Docker Scout avec une référence complète de
  commit, scanner les deux images et conserver le seuil high/critical.
- Ne pas publier de commentaire automatique dans les PR ; l'action n'a donc
  besoin que des permissions CI en lecture déjà déclarées.

## Modifications réalisées

- Ajout de l'override pnpm `esbuild: 0.25.12` ; cette version est supérieure
  à la version corrigée minimale annoncée par l'avis et était déjà résolue dans
  le graphe de dépendances.
- Remplacement des appels CLI non installés par deux appels à
  `docker/scout-action`, épinglés sur le commit complet
  `221e7f4860634eeb1579e3bd7ca232e577bd1864` (release v1.25.0).
- Ajout de `local://` pour cibler les images construites localement,
  `exit-code: true` et `only-severities: critical,high` ; désactivation des
  commentaires automatiques avec `write-comment: false`.
- Aucun changement des contrats, règles métier ou données ; un test de
  configuration CI fusionné a été adapté avec l'autorisation explicite du
  propriétaire.

## Preuve TDD Red, Green, Refactor

Changement de configuration de dépendances et de CI uniquement : aucun nouveau
comportement applicatif n'est introduit. L'audit initial signalait l'avis
modéré esbuild ; après l'override, `pnpm audit` ne trouve plus de vulnérabilité
connue. Le test de configuration CI existant a d'abord échoué car il exigeait
la commande CLI remplacée ; avec l'autorisation explicite du propriétaire, ses
assertions vérifient désormais deux actions Scout épinglées, les images locales,
le seuil critique/élevé, l'échec bloquant et l'absence de commentaires. Le test
ciblé puis la suite complète (333 tests) passent. Cette adaptation autorisée
est documentée ; aucun autre test n'a été changé. Le run CI de la PR devra
encore confirmer le scan réel des images.

## Tests et vérifications

| Commande | Résultat |
| --- | --- |
| `pnpm audit` | Aucune vulnérabilité connue après l'override esbuild. |
| `pnpm lint` | Réussi. |
| `pnpm typecheck` | Réussi. |
| `pnpm exec vitest run tests/infrastructure/ci-config.test.ts` | 1 test réussi après adaptation autorisée des assertions à l'action Docker Scout et à ses garde-fous. |
| `DATABASE_URL=… pnpm test` avec PostgreSQL temporaire isolé | 125 fichiers, 333 tests réussis. |
| `pnpm build` | Builds API et Next.js réussis. |
| `pnpm --filter @jdr-hub/database exec drizzle-kit check --config drizzle.config.ts` | Réussi ; schéma Drizzle cohérent. |
| `DATABASE_URL=… pnpm test:integration` avec PostgreSQL temporaire isolé | 4 fichiers, 11 tests réussis ; conteneur temporaire supprimé. |
| `docker compose -f docker-compose.yml build web-next api-hono` | Réussi ; les deux images sont construites. |
| `git diff --check` | Réussi. |

Le nouveau scan Docker Scout doit encore être confirmé par la CI GitHub.

## Sécurité

- Aucun secret ou fichier d'environnement n'a été lu ni ajouté.
- Le seuil CI bloquant les vulnérabilités critiques et élevées est conservé.
- L'action externe est épinglée à un SHA complet vérifié correspondant à une
  release officielle Docker ; les commentaires PR sont désactivés, sans élargir
  `permissions`.
- Les vérifications de vulnérabilités de l'action elle-même dépendent de la
  disponibilité/authentification du service Docker Scout ; si le run exige des
  identifiants Docker Hub, il faudra traiter cette configuration séparément
  sans ajouter de secret au dépôt.

## Limites et suite

- Le run GitHub de la PR #26 a échoué sur `quality`, sans journaux accessibles
  pour isoler la cause. Le scanner d'images a ensuite été remplacé par Trivy
  dans FIX-SEC-003, fusionnée dans la PR #27.

## Suivi après fusion — 2026-10-13

Le propriétaire a confirmé la fusion dans la [PR #26](https://github.com/thomasO82/jdr_hub/pull/26).
Le run GitHub associé a terminé en échec sur le job `quality` ; les étapes et
logs ne sont pas disponibles via l'intégration, donc la cause exacte n'est pas
confirmée. Le remplacement de Docker Scout par un scanner sans abonnement est
suivi séparément dans FIX-SEC-003 (`docs/features/020-free-image-scanning.md`).

## Synchronisation après fusion — 2026-10-13

La PR #26 a été fusionnée dans `develop` le 2026-10-13. Le statut CI en échec et l’absence de journaux accessibles restent des limites documentées ; la correction de scan est suivie dans FIX-SEC-003.
