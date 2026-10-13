.DEFAULT_GOAL := help
.PHONY: help install up start rebuild recreate down ps logs test test-integration lint typecheck build check db-seed db-studio audit

PNPM ?= pnpm
COMPOSE ?= docker compose -f docker-compose.yml
SERVICE ?=

help: ## Affiche les commandes disponibles
	@awk 'BEGIN { FS = ":.*##"; print "Commandes JDR Hub :" } /^[a-zA-Z0-9_-]+:.*##/ { printf "  %-18s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Installe les dépendances du monorepo
	$(PNPM) install --frozen-lockfile

up: ## Reconstruit et démarre la stack Docker de développement
	$(PNPM) dev:rebuild

start: ## Démarre la stack sans reconstruire les images
	$(PNPM) dev:up

rebuild: ## Reconstruit les images et attend que les services soient sains
	$(PNPM) dev:rebuild

recreate: ## Reconstruit puis recrée tous les conteneurs de développement
	$(PNPM) build:recreate

down: ## Arrête les services sans supprimer les données PostgreSQL
	$(PNPM) dev:down

ps: ## Affiche l'état des services Docker
	$(COMPOSE) ps

logs: ## Suit les journaux Docker (SERVICE=api-hono pour filtrer)
	$(COMPOSE) logs --tail=100 -f $(SERVICE)

test: ## Lance tous les tests unitaires, API et composants
	$(PNPM) test

test-integration: ## Lance les tests nécessitant PostgreSQL et Redis
	$(PNPM) test:integration

lint: ## Vérifie le lint et les types des packages
	$(PNPM) lint

typecheck: ## Vérifie TypeScript dans tout le monorepo
	$(PNPM) typecheck

build: ## Construit l'API et le frontend Next.js
	$(PNPM) build

check: ## Lance successivement les tests, le lint, TypeScript et les builds
	$(PNPM) test
	$(PNPM) lint
	$(PNPM) typecheck
	$(PNPM) build

db-seed: ## Ajoute les données de démonstration à la base locale
	$(PNPM) db:seed

db-studio: ## Ouvre Drizzle Studio pour la base locale
	$(PNPM) db:studio

audit: ## Vérifie les vulnérabilités des dépendances pnpm
	$(PNPM) audit
