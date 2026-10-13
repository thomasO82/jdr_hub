# FIX-SEC-003 — Scanner gratuit des images Docker dans la CI

## Identifiant

FIX-SEC-003

## Statut

`IN_PROGRESS`

## Branche et Pull Request

- Branche : `fix/free-image-scanning`
- Pull Request : création automatique refusée (`403 Resource not accessible by integration`) ; [ouvrir manuellement vers `develop`](https://github.com/thomasO82/jdr_hub/compare/develop...fix/free-image-scanning?expand=1)

## Contexte

Le job `quality` de la PR #26 a échoué après fusion. Les logs GitHub ne sont
pas accessibles via l'intégration disponible. Le propriétaire indique que
Docker Scout demanderait un abonnement qu'il ne souhaite pas payer.

## Objectif et périmètre

- Remplacer Docker Scout par un scanner d'images sans abonnement payant.
- Continuer à scanner les images Docker locales `web-next` et `api-hono`.
- Conserver l'échec CI pour les vulnérabilités `HIGH` et `CRITICAL`.
- Épingler l'action GitHub par SHA complet et utiliser une version Trivy
  publiée après l'incident de chaîne d'approvisionnement de mars 2026.
- Ne modifier aucune règle métier ni désactiver les autres contrôles CI.

## Choix technique

Utiliser l'action officielle `aquasecurity/trivy-action`, épinglée au commit
`ed142fd0673e97e23eac54620cfb913e5ce36c25` (release signée v0.36.0), avec le
scanner Trivy v0.75.0. Cette release de l'action est postérieure aux versions
signalées compromises en mars 2026. Le premier scan local a révélé que les
images utilisaient une ancienne base Node/Alpine et conservaient npm dans les
images runtime alors que l'application n'en a pas besoin au démarrage. Les
Dockerfiles utilisent donc Node 24.20.0 / Alpine 3.24 épinglé par digest,
mettent à jour les paquets Alpine au build et retirent npm/npx de l'image
runtime. Aucun compte Docker Scout ni secret Docker Hub n'est requis.

## Preuve TDD

### Red

Le test d'infrastructure a d'abord été adapté pour exiger deux utilisations de
Trivy, les références aux deux images, le seuil `CRITICAL,HIGH`, un code de
sortie bloquant, la version Trivy épinglée et l'absence de Docker Scout. Il a
échoué sur l'existant car le workflow ne contenait que l'action Scout. Les
assertions couvrent aussi la version Node épinglée et le retrait des paquets
inutiles/vulnérables des images runtime ; elles ont échoué avant la mise à jour
des Dockerfiles.

### Green / Refactor

- Le workflow utilise maintenant Trivy après la construction des deux images.
- Le workflow utilise Node 24.20.0 pour les contrôles CI et Trivy v0.75.0 pour
  les deux images.
- Les tests d'infrastructure ciblés passent après les mises à jour du workflow
  et des Dockerfiles.
- Suite complète : 125 fichiers, 334 tests réussis avec PostgreSQL temporaire.
- Tests d'intégration : 4 fichiers, 11 tests réussis.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` et
  `pnpm audit --audit-level=high` réussissent.
- `docker compose --env-file /dev/null -f docker-compose.yml build web-next
  api-hono` réussit avec des valeurs factices.
- Trivy v0.75.0 a analysé les deux images construites localement : zéro
  vulnérabilité HIGH/CRITICAL après correction.
- La modification du test CI fusionné a été explicitement autorisée par le
  propriétaire dans le cadre du remplacement du scanner.
- Le scan effectif reste à confirmer par le run GitHub de la PR ; le run local
  n'a pas utilisé de service Docker Scout.

## Sécurité

- Le contrôle de vulnérabilités d'images reste actif et bloquant pour HIGH et
  CRITICAL ; le fournisseur change et la cause des alertes du runtime est
  corrigée.
- Les références de l'action sont épinglées par SHA ; Trivy utilise la version
  v0.75.0, postérieure aux versions compromises de mars 2026. L'image Node
  officielle est épinglée par digest ; `apk upgrade` prend les correctifs
  Alpine publiés au moment du build.
- Aucun secret, identifiant Docker Hub ou permission GitHub supplémentaire
  n'est ajouté.
- L'action et sa dépendance `setup-trivy` sont épinglées dans leur dépôt
  officiel. Le build et l'analyse locale des deux images passent ; le run CI
  GitHub reste à confirmer après ouverture de la PR.

## Limites et vérifications restantes

- Ouvrir la Pull Request avec le lien ci-dessus ; le connecteur GitHub n'a pas
  le droit de créer la PR.
- Confirmer le résultat du workflow GitHub après ouverture de la PR.
- Aucun coût d'abonnement scanner n'est ajouté ; les quotas éventuels des
  runners GitHub restent ceux du compte GitHub.
