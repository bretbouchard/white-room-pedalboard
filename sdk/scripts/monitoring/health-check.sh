#!/bin/bash
# Health Check Script for Schillinger SDK Services

BASE_URL="${SDK_BASE_URL:-https://api.schillinger.ai}"
API_KEY="${SDK_API_KEY:-test-key}"

echo "🏥 SDK Health Check"

# Test core endpoints
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/health" > /dev/null && echo "✅ Health endpoint OK" || echo "❌ Health endpoint failed"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/api/v1/rhythm/generate" -X POST -d '{}' > /dev/null && echo "✅ Rhythm API OK" || echo "❌ Rhythm API failed"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/api/v1/harmony/generate" -X POST -d '{}' > /dev/null && echo "✅ Harmony API OK" || echo "❌ Harmony API failed"

echo "🎉 Health check completed"
