#!/bin/bash

# Analytics and Monitoring Setup Script for Schillinger SDK
# Sets up usage analytics, error reporting, and performance monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ANALYTICS_DIR="analytics"
MONITORING_DIR="monitoring"
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run     Show what would be set up without making changes"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📊 Setting up Analytics and Monitoring${NC}"
echo -e "${BLUE}Dry Run: $DRY_RUN${NC}"

# Create directory structure
if [[ "$DRY_RUN" == false ]]; then
    mkdir -p "$ANALYTICS_DIR"/{collectors,processors,dashboards}
    mkdir -p "$MONITORING_DIR"/{health,performance,errors}
    mkdir -p "scripts/monitoring"
    echo -e "${GREEN}✅ Directory structure created${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would create directory structure${NC}"
fi

# Setup analytics configuration
if [[ "$DRY_RUN" == false ]]; then
    cat > "$ANALYTICS_DIR/config.json" << 'EOF'
{
  "analytics": {
    "enabled": true,
    "sampling_rate": 0.1,
    "max_events_per_session": 100,
    "endpoint": "${ANALYTICS_ENDPOINT}",
    "api_key": "${ANALYTICS_API_KEY}",
    "events": {
      "sdk_initialized": true,
      "method_called": true,
      "error_occurred": true,
      "performance_metric": true
    }
  }
}
EOF
    echo -e "${GREEN}✅ Analytics configuration created${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would create analytics configuration${NC}"
fi

# Create monitoring scripts
if [[ "$DRY_RUN" == false ]]; then
    cat > "scripts/monitoring/health-check.sh" << 'EOF'
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
EOF
    
    chmod +x "scripts/monitoring/health-check.sh"
    echo -e "${GREEN}✅ Health check script created${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would create health check script${NC}"
fi

echo -e "${GREEN}🎉 Analytics and monitoring setup completed!${NC}"