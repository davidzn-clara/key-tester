#!/usr/bin/env bash
# Build de producción y arranque del servidor Node que sirve el estático.
set -e

if [ ! -d "node_modules" ]; then
  echo "→ node_modules no encontrado. Ejecutando npm install..."
  npm install
fi

echo "→ Generando build de producción..."
npm run build

echo "→ Iniciando servidor en http://localhost:3001"
npm start
