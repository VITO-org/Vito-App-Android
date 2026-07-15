#!/usr/bin/env bash
set -euo pipefail

ISSUE_KEY="${1:?Usage: jira-transition.sh ISSUE_KEY TRANSITION_NAME}"
TRANSITION_NAME="${2:?Usage: jira-transition.sh ISSUE_KEY TRANSITION_NAME}"

# Validate environment variables
: "${JIRA_BASE_URL:?JIRA_BASE_URL is required}"
: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"

# Helper: make an authenticated Jira REST API request
jira_request() {
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

# Normalize a transition name for comparison (lowercase, trim whitespace)
normalize() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | xargs
}

# Attempt to find a transition by name (case-insensitive)
find_transition_id() {
  local target
  target="$(normalize "$TRANSITION_NAME")"

  local response
  response=$(jira_request GET "/rest/api/3/issue/${ISSUE_KEY}/transitions")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  # Issue not found – warn and exit gracefully
  if [[ "$http_code" == "404" ]]; then
    echo "::warning::Issue ${ISSUE_KEY} not found (404). Skipping transition."
    exit 0
  fi

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "::warning::Failed to fetch transitions for ${ISSUE_KEY} (HTTP ${http_code}). Skipping."
    exit 0
  fi

  # Extract transition ID matching by name (case-insensitive)
  local transition_id
  transition_id=$(echo "$body" | jq -r --arg target "$target" '
    .transitions[] |
    select((.name | ascii_downcase) == $target or (.name == $target)) |
    .id
  ' | head -n1)

  echo "$transition_id"
}

# Fetch all transition names for error reporting
list_transition_names() {
  local response
  response=$(jira_request GET "/rest/api/3/issue/${ISSUE_KEY}/transitions")
  local body
  body=$(echo "$response" | sed '$d')
  echo "$body" | jq -r '.transitions[].name' 2>/dev/null || echo "(unable to list)"
}

echo "Transitioning ${ISSUE_KEY} → \"${TRANSITION_NAME}\"..."

TRANSITION_ID=$(find_transition_id)

if [[ -z "$TRANSITION_ID" ]]; then
  echo "::warning::Transition '${TRANSITION_NAME}' is not available for ${ISSUE_KEY}."
  echo "Available transitions:"
  list_transition_names | sed 's/^/  - /'
  echo "Skipping."
  exit 0
fi

echo "Found transition ID: ${TRANSITION_ID}"

PAYLOAD=$(jq -n --arg id "$TRANSITION_ID" '{ transition: { id: $id } }')

response=$(jira_request POST "/rest/api/3/issue/${ISSUE_KEY}/transitions" -d "$PAYLOAD")
http_code=$(echo "$response" | tail -n1)

if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
  echo "✅ Successfully transitioned ${ISSUE_KEY} → \"${TRANSITION_NAME}\" (HTTP ${http_code})"
else
  body=$(echo "$response" | sed '$d')
  echo "::warning::Failed to transition ${ISSUE_KEY} → \"${TRANSITION_NAME}\" (HTTP ${http_code})."
  echo "Response: ${body}"
  exit 0
fi
