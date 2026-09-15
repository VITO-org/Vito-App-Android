#!/usr/bin/env bash
# tag-release.sh — Helper para crear releases de Vito App Android
# Uso: bash scripts/tag-release.sh [VERSION]
# Ejemplo: bash scripts/tag-release.sh 1.2.0
#
# Qué hace:
#   1. Verifica que el working tree esté limpio
#   2. Corre dod:check (paridad versiones + CHANGELOG + migraciones)
#   3. Verifica que el CHANGELOG tenga la sección [VERSION]
#   4. Crea el tag anotado vX.Y.Z
#   5. Hace push del tag → dispara release.yml automáticamente
#
# Prerequisito: haber actualizado manualmente:
#   - version en package.json
#   - expo.version y android.versionCode en app.json
#   - sección [VERSION] en CHANGELOG.md
#   - commit con: git commit -m "chore(release): vX.Y.Z"

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# --- 1. Versión a taggear ---
if [ $# -eq 1 ]; then
  VERSION="$1"
else
  VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
  if [ -z "$VERSION" ]; then
    fail "No se pudo leer la versión de package.json. Pasá la versión como argumento: bash scripts/tag-release.sh 1.2.0"
  fi
  warn "No se pasó versión como argumento. Usando package.json: $VERSION"
fi

TAG="v${VERSION}"
echo ""
echo "🏷️  Preparando release: $TAG"
echo "──────────────────────────────"

# --- 2. Working tree limpio ---
if ! git diff-index --quiet HEAD --; then
  fail "Hay cambios sin commitear. Hacé commit o stash antes de taggear."
fi
ok "Working tree limpio"

# --- 3. Verificar que la versión en package.json coincide ---
PKG_VER=$(node -p "require('./package.json').version")
if [ "$PKG_VER" != "$VERSION" ]; then
  fail "Versión '$VERSION' no coincide con package.json ('$PKG_VER'). Actualizar package.json primero."
fi
ok "package.json versión: $PKG_VER"

# --- 4. Verificar que app.json coincide ---
APP_VER=$(python3 -c "import json;print(json.load(open('app.json'))['expo']['version'])" 2>/dev/null || echo "ERROR")
if [ "$APP_VER" != "$VERSION" ]; then
  fail "app.json expo.version ('$APP_VER') no coincide con '$VERSION'. Actualizar app.json antes de taggear."
fi
ok "app.json versión: $APP_VER"

# --- 5. Correr dod:check completo ---
echo ""
echo "📋 Corriendo dod:check..."
if ! npm run dod:check; then
  fail "dod:check falló. Corregir gaps antes de taggear."
fi

# --- 6. Verificar que CHANGELOG tiene la sección de esta versión ---
if ! grep -q "## \[$VERSION\]" CHANGELOG.md; then
  fail "CHANGELOG.md no tiene sección '## [$VERSION]'. Agregala antes de taggear."
fi
ok "CHANGELOG.md tiene sección [$VERSION]"

# --- 7. Verificar que el tag no existe ya ---
if git tag --list | grep -q "^${TAG}$"; then
  fail "El tag '$TAG' ya existe. Usá una versión diferente o borrá el tag existente."
fi

# --- 8. Confirmación final ---
echo ""
echo "──────────────────────────────"
echo "📦 Todo verificado. A punto de crear y pushear: $TAG"
echo "   → Esto disparará el pipeline release.yml en GitHub Actions"
read -r -p "¿Continuar? (s/N) " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  warn "Operación cancelada por el usuario."
  exit 0
fi

# --- 9. Crear tag y push ---
git tag -a "$TAG" -m "Release $VERSION — ver CHANGELOG.md"
ok "Tag $TAG creado localmente"

git push origin "$TAG"
ok "Tag $TAG pusheado a origin"

echo ""
echo "──────────────────────────────"
ok "Release $TAG en curso 🚀"
echo "   → Seguí el pipeline en: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo "   → Cuando termine, verificá la GitHub Release en: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/$TAG"
