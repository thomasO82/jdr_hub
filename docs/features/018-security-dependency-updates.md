# Mise à jour des dépendances vulnérables

## Identifiant

FIX-SEC-001

## Statut

MERGED

## Branche

`fix/security-dependency-updates`

## Lien ou numéro de Pull Request

[PR #24](https://github.com/thomasO82/jdr_hub/pull/24) — fusion confirmée par le propriétaire le 2026-10-12.

## Dates de début et de fin

- Début : 2026-10-12
- Fin : 2026-10-12

## Contexte et besoin utilisateur

### Prévu

Réduire le risque lié aux dépendances vulnérables signalées par l'audit du monorepo, sans modifier les contrats ni le comportement fonctionnel de JDR Hub.

### Réalisé

Les versions vulnérables de Next.js, Vitest, Hono, sharp et source-map-js ont été mises à jour. Le verrou pnpm a été régénéré et les applications, tests et images Docker ont été vérifiés.

### Restant à faire

Traiter séparément une vulnérabilité modérée d'esbuild introduite transitivement par drizzle-kit. Vérifier également le résultat du scan d'images Docker en CI : Docker Scout n'est pas disponible dans l'environnement local utilisé.

## Périmètre prévu

- Mettre à jour les dépendances affectées par des avis de sécurité.
- Conserver les contrats, validations, parcours utilisateurs et règles métier.
- Vérifier tests, lint, types, builds, images Docker et audit.

## Fonctionnalités effectivement réalisées

- Next.js mis à jour de 16.2.11 à 16.3.8.
- Vitest mis à jour en version 4.1.11 à la racine et dans l'application web.
- Hono mis à jour à partir de 4.13.5 vers la plage `^4.13.7`.
- Overrides pnpm de sharp vers 0.35.5 et ajout de source-map-js 1.2.2 ; override PostCSS conservé.
- Aucun changement de code métier, de contrat HTTP, de schéma ou de migration.

## Règles métier et architecture

- Aucun comportement métier ou parcours utilisateur n'est modifié.
- Les mises à jour restent dans les manifests et le lockfile du monorepo.

## Tests et vérifications

| Commande | Résultat | Date |
| --- | --- | --- |
| `pnpm exec vitest run --exclude 'apps/api/tests/integration/postgres-*.test.ts'` | 124 fichiers, 330 tests réussis | 2026-10-12 |
| `DATABASE_URL=… pnpm test:integration` avec PostgreSQL temporaire isolé | 4 fichiers, 11 tests réussis ; conteneur temporaire supprimé après le test | 2026-10-12 |
| `pnpm lint` | Réussi | 2026-10-12 |
| `pnpm typecheck` | Réussi | 2026-10-12 |
| `pnpm build` | Réussi | 2026-10-12 |
| `docker compose -f docker-compose.yml build web-next api-hono` | Réussi | 2026-10-12 |
| `pnpm audit --audit-level=high` | Réussi, aucune vulnérabilité critique ou haute ; une modérée transitive reste signalée | 2026-10-12 |
| Scan Docker Scout local | Non exécuté : commande/option Scout indisponible dans l'environnement | 2026-10-12 |

## Preuve TDD Red, Green, Refactor

Cette intervention porte uniquement sur les versions de dépendances et le lockfile ; elle n'ajoute ni ne change de comportement applicatif, donc aucun test métier nouveau n'a été écrit. La vérification a consisté à exécuter les suites existantes avec les nouvelles versions puis à comparer le nombre de tests à la branche de base. La suite non-PostgreSQL a réussi avec 330 tests, et les tests PostgreSQL isolés avec 11 tests. Aucun test existant n'a été modifié.

## Sécurité

- Les avis critiques et élevés initiaux ont été traités par la mise à jour des paquets et overrides concernés.
- L'audit après mises à jour ne bloque plus au seuil élevé ; une vulnérabilité modérée d'esbuild dans la chaîne transitive de drizzle-kit reste à évaluer.
- Les tests n'ont utilisé que des données et secrets fictifs. Aucun fichier d'environnement ou secret n'a été consulté ou ajouté.
- Le scan d'images Docker reste à confirmer par la CI avec Docker Scout.

## Limites connues et travaux reportés

- Mettre à jour ou remplacer en sécurité la chaîne drizzle-kit/esbuild pour éliminer l'avis modéré restant, dans une intervention dédiée si nécessaire.
- Consulter le résultat Docker Scout en CI ; aucun scan local n'a été exécuté.

## Mise à jour après fusion — 2026-10-12

Le propriétaire a confirmé la fusion de cette fiche dans la
[PR #24](https://github.com/thomasO82/jdr_hub/pull/24). Le statut `MERGED`
reflète cette confirmation. L'avis modéré d'esbuild et la vérification Docker
Scout restent des éléments de suivi, sans être présentés comme résolus.

## Commandes finales

```bash
pnpm exec vitest run --exclude 'apps/api/tests/integration/postgres-*.test.ts'
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm build
docker compose -f docker-compose.yml build web-next api-hono
pnpm audit --audit-level=high
git diff --check
```
