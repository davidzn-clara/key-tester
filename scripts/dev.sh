#!/usr/bin/env bash
# Levanta el entorno de desarrollo: proxy Node en :3001 + Vite en :5173.
set -e

if [ ! -d "node_modules" ]; then
  echo "→ node_modules no encontrado. Ejecutando npm install..."
  npm install
fi

echo "→ Iniciando Clara API Tester en modo desarrollo..."
echo "  Proxy:    http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
npm run dev
