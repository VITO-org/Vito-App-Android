#!/usr/bin/env bash
set -euo pipefail

# Usage: discord-notify.sh WEBHOOK_URL TITLE DESCRIPTION COLOR [FIELDS_JSON]
#
# WEBHOOK_URL  - Discord webhook URL
# TITLE        - Embed title (e.g. "🚀 Push a rama scrum-122")
# DESCRIPTION  - Embed description (optional, can be empty string "")
# COLOR        - Decimal color code (e.g. 3066993 for green, 15158332 for red)
# FIELDS_JSON  - Optional: JSON array of field objects [{"name":"X","value":"Y","inline":true}]

WEBHOOK_URL="${1:?Usage: discord-notify.sh WEBHOOK_URL TITLE DESCRIPTION COLOR [FIELDS_JSON]}"
TITLE="${2:?Usage: discord-notify.sh WEBHOOK_URL TITLE DESCRIPTION COLOR [FIELDS_JSON]}"
DESCRIPTION="${3:-}"
COLOR="${4:-3066993}"
FIELDS_JSON="${5:-[]}"

# Build the embed JSON
EMBED=$(jq -n \
  --arg title "$TITLE" \
  --arg description "$DESCRIPTION" \
  --argjson color "$COLOR" \
  --argjson fields "$FIELDS_JSON" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    embeds: [{
      title: $title,
      description: $description,
      color: $color,
      fields: $fields,
      footer: { text: "VITO CI/CD" },
      timestamp: $timestamp
    }]
  }')

# Send to Discord
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$EMBED" \
  "$WEBHOOK_URL")

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "✅ Discord notification sent (HTTP ${HTTP_CODE})"
else
  echo "::warning::Discord notification failed (HTTP ${HTTP_CODE})"
  exit 0  # Don't fail the workflow
fi
