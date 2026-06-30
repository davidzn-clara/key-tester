#!/usr/bin/env bash
# Instala dependencias y verifica que el entorno esté listo.
set -e

echo "→ Verificando Node.js..."
node_version=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$node_version" ] || [ "$node_version" -lt 18 ]; then
  echo "✗ Se requiere Node.js 18+. Versión actual: $(node -v 2>/dev/null || echo 'no instalado')"
  exit 1
fi
echo "  ✓ Node.js $(node -v)"

echo "→ Instalando dependencias..."
npm install

echo ""
echo "✓ Setup completo."
echo ""
echo "  Desarrollo:   npm run dev   → http://localhost:5173"
echo "  Producción:   npm run build && npm start → http://localhost:3001"
