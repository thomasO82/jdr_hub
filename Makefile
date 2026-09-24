COMPOSE := docker compose -f docker-compose.yml

.DEFAULT_GOAL := help
.PHONY: help up rebuild recreate seed studio down

help:
	@printf '%s\n' \
	  'make up       - démarre la stack sans reconstruire les images' \
	  'make rebuild  - reconstruit puis démarre la stack' \
	  'make recreate - reconstruit et recrée les conteneurs' \
	  'make seed     - charge les données fictives de développement' \
	  'make studio   - démarre Drizzle Studio' \
	  'make down     - arrête la stack'

up:
	$(COMPOSE) up -d --wait

rebuild:
	$(COMPOSE) up -d --build --wait

recreate:
	$(COMPOSE) up -d --build --force-recreate --wait

seed:
	$(COMPOSE) run --rm api-hono node node_modules/@jdr-hub/database/dist/seed-cli.js

studio:
	$(COMPOSE) --profile tools up --build db-studio

down:
	$(COMPOSE) down
