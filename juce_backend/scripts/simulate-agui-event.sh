#!/bin/bash

# This script simulates sending an AG-UI event to the local events API.
# Usage: ./simulate-agui-event.sh <eventType> <payloadJson>
# Example: ./simulate-agui-event.sh "tool_call" '{"name": "playNote", "parameters": {"note": "C4"}}'

EVENTS_URL="${NEXT_PUBLIC_AGUI_EVENTS_URL:-http://localhost:3000/api/agui/events}"

EVENT_TYPE="$1"
PAYLOAD_JSON="$2"

if [ -z "$EVENT_TYPE" ] || [ -z "$PAYLOAD_JSON" ]; then
  echo "Usage: $0 <eventType> <payloadJson>"
  echo "Example: $0 \"tool_call\" '{\"name\": \"playNote\", \"parameters\": {\"note\": \"C4\"}}'"
  exit 1
fi

# Generate a unique ID for the event
EVENT_ID="evt-$(date +%s)-$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 7)"
TIMESTAMP=$(date +%s%3N) # Current timestamp in milliseconds

# Construct the full event JSON
EVENT_JSON=$(cat <<EOF
{
  "id": "$EVENT_ID",
  "timestamp": $TIMESTAMP,
  "type": "$EVENT_TYPE",
  "payload": $PAYLOAD_JSON
}
EOF
)

echo "Sending AG-UI event to: $EVENTS_URL"
echo "Event Type: $EVENT_TYPE"
echo "Payload: $PAYLOAD_JSON"

curl -X POST \
     -H "Content-Type: application/json" \
     -d "$EVENT_JSON" \
     "$EVENTS_URL"

echo "\nEvent sent. Check server logs for confirmation."
