#!/usr/bin/env bash
# tag-release.sh — Helper para crear releases de Vito App Android
# Uso: bash scripts/tag-release.sh [VERSION]
# Ejemplo: bash scripts/tag-release.sh 1.2.0
#
# Qué hace:
#   1. Sincroniza los tags remotos (git fetch --tags) para no colisionar
#   2. Verifica que el working tree esté limpio
#   3. Corre dod:check (paridad versiones + CHANGELOG + migraciones)
#   4. Verifica que el CHANGELOG tenga la sección [VERSION]
#   5. Verifica que el tag no exista (ni local ni remoto)
#   6. Crea el tag anotado vX.Y.Z
#   7. Hace push del tag → dispara release.yml automáticamente
#
# Prerequisito: haber actualizado manualmente:
#   - version en package.json
#   - expo.version y android.versionCode en app.json (versionCode MONOTÓNICO: +1)
#   - sección [VERSION] en CHANGELOG.md
#   - commit con: git commit -m "chore(release): vX.Y.Z"
#
# IMPORTANTE (política de tags — DEC-2026-10-19):
#   - El bump de versión se hace sobre main/dev, NUNCA sobre una rama de feature:
#     taguear desde una feature reintroduce la regresión de versiones (1.0.0).
#   - La versión nueva debe ser MAYOR que el último tag publicado.
#   - Los tags ya publicados no se borran ni se re-apuntan (trazabilidad de release).
#   - El tag y el bump deben estar en el MISMO commit: release.yml valida
#     TAG == package.json version y cancela toda la cadena si difieren.

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

# --- 3. Sincronizar tags remotos (evita colisionar con un tag ya publicado) ---
git fetch --tags --quiet 2>/dev/null || warn "No se pudieron sincronizar los tags remotos (sin red?). Se verifica contra los tags locales."
ok "Tags sincronizados con origin"

# --- 4. Rama de release (el bump NO se hace en ramas de feature) ---
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$BRANCH" =~ ^(main|dev|release/.*|chore/release.*)$ ]]; then
  warn "Estás en la rama '$BRANCH'. El bump de versión y el tag se hacen sobre main/dev o release/*."
  warn "Taguear desde una feature puede reintroducir la regresión de versiones."
fi
ok "Rama actual: $BRANCH"

# --- 5. Verificar que la versión en package.json coincide ---
PKG_VER=$(node -p "require('./package.json').version")
if [ "$PKG_VER" != "$VERSION" ]; then
  fail "Versión '$VERSION' no coincide con package.json ('$PKG_VER'). Actualizar package.json primero."
fi
ok "package.json versión: $PKG_VER"

# --- 6. Verificar que app.json coincide ---
APP_VER=$(python3 -c "import json;print(json.load(open('app.json'))['expo']['version'])" 2>/dev/null || echo "ERROR")
if [ "$APP_VER" != "$VERSION" ]; then
  fail "app.json expo.version ('$APP_VER') no coincide con '$VERSION'. Actualizar app.json antes de taggear."
fi
ok "app.json versión: $APP_VER"

# --- 7. Correr dod:check completo ---
echo ""
echo "📋 Corriendo dod:check..."
if ! npm run dod:check; then
  fail "dod:check falló. Corregir gaps antes de taggear."
fi

# --- 8. Verificar que CHANGELOG tiene la sección de esta versión ---
if ! grep -q "## \[$VERSION\]" CHANGELOG.md; then
  fail "CHANGELOG.md no tiene sección '## [$VERSION]'. Agregala antes de taggear."
fi
ok "CHANGELOG.md tiene sección [$VERSION]"

# --- 9. Verificar que el tag no existe ya (local ni remoto) ---
if git tag --list | grep -q "^${TAG}$"; then
  fail "El tag '$TAG' ya existe. Usá una versión diferente o borrá el tag existente."
fi
if git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1; then
  fail "El tag '$TAG' ya existe en origin. Usá una versión diferente."
fi

# --- 10. Verificar que la versión es mayor que el último tag semver publicado ---
LAST_TAG=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n 1)
if [ -n "$LAST_TAG" ]; then
  LAST_VER="${LAST_TAG#v}"
  if [ "$(printf '%s\n%s\n' "$LAST_VER" "$VERSION" | sort -V | head -n 1)" != "$LAST_VER" ]; then
    fail "La versión '$VERSION' no es mayor que el último tag publicado ('$LAST_TAG'). Usá una versión superior."
  fi
  ok "Versión '$VERSION' > último tag publicado ('$LAST_TAG')"
fi

# --- 11. Confirmación final ---
echo ""
echo "──────────────────────────────"
echo "📦 Todo verificado. A punto de crear y pushear: $TAG"
echo "   → Esto disparará el pipeline release.yml en GitHub Actions"
read -r -p "¿Continuar? (s/N) " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  warn "Operación cancelada por el usuario."
  exit 0
fi

# --- 12. Crear tag y push ---
git tag -a "$TAG" -m "Release $VERSION — ver CHANGELOG.md"
ok "Tag $TAG creado localmente"

git push origin "$TAG"
ok "Tag $TAG pusheado a origin"

echo ""
echo "──────────────────────────────"
ok "Release $TAG en curso 🚀"
echo "   → Seguí el pipeline en: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo "   → Cuando termine, verificá la GitHub Release en: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/$TAG"
