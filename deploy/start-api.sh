#!/usr/bin/env bash
# Wrapper que ejecuta PM2 al iniciar/reiniciar control-alumnos-api.
# Sincroniza el build del frontend a /var/www antes de levantar la API,
# así nginx no necesita permisos sobre el home del usuario.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DEPLOY_DIR="/var/www/control-alumnos/web"

if [ -d "$REPO_ROOT/apps/web/dist" ]; then
  mkdir -p "$WEB_DEPLOY_DIR"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$REPO_ROOT/apps/web/dist/" "$WEB_DEPLOY_DIR/"
  else
    # rsync no instalado: recreamos la carpeta con cp
    rm -rf "${WEB_DEPLOY_DIR:?}"/*
    cp -a "$REPO_ROOT/apps/web/dist/." "$WEB_DEPLOY_DIR/"
  fi
fi

# cd a apps/api: env.ts carga .env vía dotenv/config, que busca en el cwd del proceso
cd "$REPO_ROOT/apps/api"
exec node dist/server.js
