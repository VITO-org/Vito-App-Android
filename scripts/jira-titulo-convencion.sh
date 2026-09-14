#!/usr/bin/env bash
set -euo pipefail
#
# jira-titulo-convencion.sh — Convención de títulos BUG / QA en Jira (VITO)
#
# IMPORTANTE — Key vs Summary en Jira:
#   - La Key (SCRUM-X, ej: SCRUM-189) la genera Jira al crear la tarjeta.
#     Es inmutable, nunca se edita ni se pierde. El script jamás la toca.
#   - El Summary es el título editable. Es lo único que este script genera/valida.
#   - En la UI Jira ves:  [SCRUM-189] BUG HU-51 ... (extraída de SCRUM-95)
#     donde [SCRUM-189] lo pone Jira solo y el resto es el Summary.
#
# Formato canónico del Summary (lo que se escribe en el campo Summary):
#   BUG HU-<n> <descripción corta del bug> (extraída de SCRUM-<id>)
#   QA  HU-<n> <nombre de la historia>     (extraída de SCRUM-<id>)
#
# Formato display completo (para vault/ramas/logs, NO para el campo Summary):
#   SCRUM-<propio>: BUG HU-<n> ... (extraída de SCRUM-<origen>)
#   Ej: SCRUM-189: BUG HU-51 Push no se dispara server-side (extraída de SCRUM-95)
#
# Ejemplos Summary:
#   QA HU-51 Notificaciones push de app móvil (extraída de SCRUM-95)
#   BUG HU-51 Push no se dispara para alertas server-side (extraída de SCRUM-95)
#
# Regex de validación (sobre el Summary, tras quitar prefijo opcional "SCRUM-X: "):
#   ^(QA|BUG) HU-[0-9]+ .+ \(extraída de SCRUM-[0-9]+\)$
#
# Uso:
#   ./scripts/jira-titulo-convencion.sh format QA HU-51 "Notificaciones push de app móvil" SCRUM-95
#   ./scripts/jira-titulo-convencion.sh display SCRUM-190 QA HU-51 "Notificaciones push" SCRUM-95
#   ./scripts/jira-titulo-convencion.sh validate "QA HU-51 Notificaciones push de app móvil (extraída de SCRUM-95)"
#   ./scripts/jira-titulo-convencion.sh validate "SCRUM-190: QA HU-51 Notificaciones push (extraída de SCRUM-95)"
#   ./scripts/jira-titulo-convencion.sh rename SCRUM-189 BUG HU-51 "Push no se dispara para alertas server-side" SCRUM-95
#   ./scripts/jira-titulo-convencion.sh check SCRUM-189
#

TITULO_REGEX='^(QA|BUG) HU-[0-9]+ .+ \(extraída de SCRUM-[0-9]+\)$'

usage() {
  cat <<'EOF'
Uso:
  jira-titulo-convencion.sh format <QA|BUG> <HU-51|51> "<Nombre o descripción>" <SCRUM-95|95>
    → imprime SOLO el Summary (lo que va en el campo Summary de Jira).
  jira-titulo-convencion.sh display <SCRUM-propio> <QA|BUG> <HU> "<Nombre>" <SCRUM-origen>
    → imprime "SCRUM-X: <Summary>" para vault/ramas/logs. NO usar en Jira.
    → alias: vault (mismo output, nombre explícito para compatibilidad vault actual).
    → vault actual guarda: title: "SCRUM-95: HU-51 ..." / "SCRUM-189: BUG HU-51 ..."
  jira-titulo-convencion.sh validate "<título completo>"
    → acepta con o sin prefijo "SCRUM-X: " (lo quita antes de validar).
  jira-titulo-convencion.sh rename <ISSUE_KEY> <QA|BUG> <HU-51|51> "<Nombre>" <SCRUM-95|95>
    → actualiza SOLO el Summary vía API. La Key nunca se toca.
  jira-titulo-convencion.sh check <ISSUE_KEY>
    → lee el Summary de Jira y lo valida. Muestra Key + Summary por separado.

Ejemplos:
  ./scripts/jira-titulo-convencion.sh format QA HU-51 "Notificaciones push de app móvil" SCRUM-95
  # → QA HU-51 Notificaciones push de app móvil (extraída de SCRUM-95)
  #   En Jira se verá como: [SCRUM-190] QA HU-51 Notificaciones push... (extraída de SCRUM-95)

  ./scripts/jira-titulo-convencion.sh display SCRUM-190 QA HU-51 "Notificaciones push" SCRUM-95
  # → SCRUM-190: QA HU-51 Notificaciones push (extraída de SCRUM-95)

  ./scripts/jira-titulo-convencion.sh validate "QA HU-51 Notificaciones push (extraída de SCRUM-95)"
  ./scripts/jira-titulo-convencion.sh validate "SCRUM-190: QA HU-51 Notificaciones push (extraída de SCRUM-95)"
  ./scripts/jira-titulo-convencion.sh rename SCRUM-189 BUG HU-51 "Push no se dispara server-side" SCRUM-95
  ./scripts/jira-titulo-convencion.sh check SCRUM-189
EOF
}

# Normaliza "51" → "HU-51", "hu-51" → "HU-51"
normalizar_hu() {
  local raw="$1"
  raw="$(echo "$raw" | xargs)"
  if [[ "$raw" =~ ^[Hh][Uu]-([0-9]+)$ ]]; then
    echo "HU-${BASH_REMATCH[1]}"
  elif [[ "$raw" =~ ^([0-9]+)$ ]]; then
    echo "HU-${BASH_REMATCH[1]}"
  else
    echo "ERROR: HU inválida '$1'. Esperado HU-<n> o <n> (ej: HU-51)." >&2
    return 1
  fi
}

# Normaliza "95" → "SCRUM-95", "scrum-95" → "SCRUM-95"
normalizar_origen() {
  local raw="$1"
  raw="$(echo "$raw" | xargs)"
  if [[ "$raw" =~ ^[Ss][Cc][Rr][Uu][Mm]-([0-9]+)$ ]]; then
    echo "SCRUM-${BASH_REMATCH[1]}"
  elif [[ "$raw" =~ ^([0-9]+)$ ]]; then
    echo "SCRUM-${BASH_REMATCH[1]}"
  else
    echo "ERROR: origen inválido '$1'. Esperado SCRUM-<id> o <id> (ej: SCRUM-95)." >&2
    return 1
  fi
}

normalizar_tipo() {
  local raw
  raw="$(echo "$1" | tr '[:lower:]' '[:upper:]' | xargs)"
  if [[ "$raw" != "QA" && "$raw" != "BUG" ]]; then
    echo "ERROR: tipo inválido '$1'. Usar QA o BUG." >&2
    return 1
  fi
  echo "$raw"
}

# Colapsa espacios múltiples y recorta extremos
limpiar_nombre() {
  echo "$1" | xargs | tr -s ' '
}

formatear_titulo() {
  local tipo hu nombre origen
  tipo="$(normalizar_tipo "${1:?Falta TIPO (QA|BUG)}")"
  hu="$(normalizar_hu "${2:?Falta HU (ej: HU-51)}")"
  nombre="$(limpiar_nombre "${3:?Falta nombre/descripción}")"
  origen="$(normalizar_origen "${4:?Falta origen (ej: SCRUM-95)}")"

  if [[ -z "$nombre" ]]; then
    echo "ERROR: el nombre/descripción no puede estar vacío." >&2
    return 1
  fi

  echo "${tipo} ${hu} ${nombre} (extraída de ${origen})"
}

validar_titulo() {
  local original="${1:?Falta el título a validar}"
  # Quita prefijo opcional "SCRUM-123: " (lo que Jira muestra + lo que el vault guarda
  # como "SCRUM-189: <summary>"). La Key no es parte del Summary.
  local titulo="$original"
  if [[ "$titulo" =~ ^SCRUM-[0-9]+:[[:space:]]*(.*)$ ]]; then
    titulo="${BASH_REMATCH[1]}"
  fi
  if [[ "$titulo" =~ $TITULO_REGEX ]]; then
    echo "✅ Título válido: $original"
    return 0
  else
    echo "❌ Título inválido: $original" >&2
    echo "" >&2
    echo "Formato esperado del Summary (la Key SCRUM-X la pone Jira sola, no la escribas):" >&2
    echo "  QA HU-51 Notificaciones push de app móvil (extraída de SCRUM-95)" >&2
    echo "  BUG HU-51 Push no se dispara server-side (extraída de SCRUM-95)" >&2
    echo "Display completo (vault/ramas): SCRUM-190: QA HU-51 ... (extraída de SCRUM-95)" >&2
    echo "Regex: $TITULO_REGEX" >&2
    return 1
  fi
}

# Display completo "SCRUM-X: <Summary>" para vault/ramas/logs.
# NO usar su output en el campo Summary de Jira.
mostrar_display() {
  local propia_raw="${1:?Falta la Key propia (ej: SCRUM-190)}"
  local propia
  propia="$(normalizar_origen "$propia_raw")"
  shift
  local summary
  summary="$(formatear_titulo "$@")"
  echo "${propia}: ${summary}"
}

jira_request() {
  : "${JIRA_BASE_URL:?JIRA_BASE_URL is required}"
  : "${JIRA_EMAIL:?JIRA_EMAIL is required}"
  : "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
  local method="$1"
  local endpoint="$2"
  shift 2
  curl -s -w "\n%{http_code}" \
    -X "$method" \
    -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$@" \
    "${JIRA_BASE_URL}${endpoint}"
}

renombrar_issue() {
  local issue_key="${1:?Falta ISSUE_KEY (ej: SCRUM-189)}"
  local titulo
  titulo="$(formatear_titulo "$2" "$3" "$4" "$5")"
  validar_titulo "$titulo" >/dev/null

  echo "Renombrando ${issue_key} → \"${titulo}\"..."
  local payload
  payload=$(jq -n --arg s "$titulo" '{fields: {summary: $s}}')

  local response http_code body
  response=$(jira_request PUT "/rest/api/3/issue/${issue_key}" -d "$payload")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "✅ ${issue_key} actualizado (HTTP ${http_code})"
  else
    echo "❌ Falló el rename de ${issue_key} (HTTP ${http_code})." >&2
    echo "Respuesta: ${body}" >&2
    return 1
  fi
}

consultar_issue() {
  local issue_key="${1:?Falta ISSUE_KEY (ej: SCRUM-189)}"
  local response http_code body summary
  response=$(jira_request GET "/rest/api/3/issue/${issue_key}?fields=summary")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "❌ No se pudo leer ${issue_key} (HTTP ${http_code})." >&2
    echo "Respuesta: ${body}" >&2
    return 1
  fi

  summary=$(echo "$body" | jq -r '.fields.summary // empty')
  echo "Key:     ${issue_key}  (generada por Jira, inmutable, no se toca)"
  echo "Summary: ${summary}"
  validar_titulo "$summary"
}

cmd="${1:-help}"
case "$cmd" in
  format)
    shift
    if [[ $# -ne 4 ]]; then usage >&2; exit 1; fi
    formatear_titulo "$@"
    ;;
  display|vault)
    shift
    if [[ $# -ne 5 ]]; then usage >&2; exit 1; fi
    mostrar_display "$@"
    ;;
  validate)
    shift
    if [[ $# -ne 1 ]]; then usage >&2; exit 1; fi
    validar_titulo "$1"
    ;;
  rename)
    shift
    if [[ $# -ne 5 ]]; then usage >&2; exit 1; fi
    renombrar_issue "$@"
    ;;
  check)
    shift
    if [[ $# -ne 1 ]]; then usage >&2; exit 1; fi
    consultar_issue "$1"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Comando desconocido: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
