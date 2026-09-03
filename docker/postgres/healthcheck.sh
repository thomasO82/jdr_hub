#!/bin/sh
set -eu

pg_isready --quiet --dbname "$POSTGRES_DB" --username "$POSTGRES_USER"
