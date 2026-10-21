#!/usr/bin/env bash
# verify-migrations.sh — DoD releases (OPERACIONES-2 + DESPLIEGUE-2)
# Verifica gaps de bajo costo antes del tag vX.Y.Z. Exit 0 = OK, !=0 = gap.
# No toca BD ni red: solo inspecciona el repo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0
say() { echo "$1"; }
fail() { echo "❌ $1"; FAIL=1; }
ok() { echo "✅ $1"; }

# 1) Paridad de versiones package.json / app.json (python3: robusto en WSL + CI)
PKG_VER="$(python3 -c "import json;print(json.load(open('$ROOT/package.json'))['version'])" 2>/dev/null || echo MISSING)"
APP_VER="$(python3 -c "import json;print(json.load(open('$ROOT/app.json'))['expo']['version'])" 2>/dev/null || echo MISSING)"
if [ "$PKG_VER" = "MISSING" ] || [ "$APP_VER" = "MISSING" ]; then
  fail "version faltante (package.json=$PKG_VER app.json=$APP_VER)"
elif [ "$PKG_VER" != "$APP_VER" ]; then
  fail "version despareja: package.json=$PKG_VER vs app.json expo.version=$APP_VER (igualar antes del tag)"
else
  ok "versiones en paridad: $PKG_VER"
fi

# 2) CHANGELOG con seccion Unreleased + entrada de la version
if [ ! -f "$ROOT/CHANGELOG.md" ]; then
  fail "CHANGELOG.md ausente"
else
  grep -q "## \[Unreleased\]" "$ROOT/CHANGELOG.md" && ok "CHANGELOG tiene [Unreleased]" || fail "CHANGELOG sin seccion [Unreleased]"
  grep -q "## \[$PKG_VER\]" "$ROOT/CHANGELOG.md" && ok "CHANGELOG tiene entrada [$PKG_VER]" || say "⚠️ CHANGELOG sin entrada [$PKG_VER] (agregar al taggear)"
fi

# 3) Idempotencia: cada .sql debe usar IF NOT EXISTS / OR REPLACE / IF EXISTS.
# Allowlist historica: migraciones ya aplicadas y reemplazadas por una posterior
# (no re-ejecutar; solo warning). Ver runbook DoD OPERACIONES-2.
SUPERSEDED="2026-08-18_hu41_tabla_alertas.sql"
check_idempotent() {
  local dir="$1" found=0
  [ -d "$dir" ] || { say "⚠️ sin directorio $dir"; return 0; }
  for f in "$dir"/*.sql; do
    [ -e "$f" ] || continue
    found=1
    local base="$(basename "$f")"
    if grep -qiE "IF NOT EXISTS|OR REPLACE|IF EXISTS" "$f"; then
      ok "idempotente: $(basename "$dir")/$base"
    elif echo "$SUPERSEDED" | grep -q "$base"; then
      say "⚠️ historica superada (no re-ejecutar, reemplazada por migracion posterior): $base"
    else
      fail "NO idempotente: $f (agregar IF NOT EXISTS / OR REPLACE)"
    fi
  done
  [ "$found" = "1" ] || say "⚠️ sin .sql en $dir"
}
check_idempotent "$ROOT/scripts/migrations"
check_idempotent "$ROOT/supabase/migrations"

# 4) Divergencia conocida: migraciones solo-remotas 20260901* (DEC-2026-09-11)
say "ℹ️ Recordatorio DoD: no usar 'supabase db push' hasta reconciliar historial remoto divergente (migraciones 20260901* solo remoto). Deploy de SQL via SQL Editor en staging."

if [ "$FAIL" -ne 0 ]; then
  echo "⛔ dod:check FALLO — corregir gaps antes del tag vX.Y.Z"
  exit 1
fi
echo "🎉 dod:check OK — listo para tag v$PKG_VER (ver runbook DoD Step 8)"
