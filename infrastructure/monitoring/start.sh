#!/bin/bash
# Quick Start Script for White Room Production Monitoring
# This script sets up and starts the complete monitoring stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONITORING_DIR="/Users/bretbouchard/apps/schill/white_room/infrastructure/monitoring"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.yml"

# Functions
print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_dependencies() {
    print_header "Checking Dependencies"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    print_success "Docker is running"

    echo ""
}

setup_environment() {
    print_header "Setting Up Environment"

    cd "$MONITORING_DIR"

    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning "Creating .env file with default values"

        cat > .env << EOF
# Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# PagerDuty Integration
PAGERDUTY_SERVICE_KEY_CRITICAL=your-critical-key-here
PAGERDUTY_SERVICE_KEY_HIGH=your-high-key-here
PAGERDUTY_SERVICE_KEY_SECURITY=your-security-key-here

# SMTP Configuration (for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@white-room.ai
SMTP_PASSWORD=your-smtp-password-here
SMTP_FROM=alerts@white-room.ai

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Environment
ENVIRONMENT=production
CLUSTER=white-room-production
EOF

        print_warning "Please update .env file with your actual credentials"
        print_warning "Run: vim $MONITORING_DIR/.env"
    else
        print_success ".env file already exists"
    fi

    echo ""
}

create_directories() {
    print_header "Creating Directories"

    # Create data directories
    mkdir -p prometheus/data
    mkdir -p grafana/data
    mkdir -p alertmanager/data
    mkdir -p loki/data

    # Set permissions
    chmod -R 755 prometheus/data
    chmod -R 755 grafana/data
    chmod -R 755 alertmanager/data
    chmod -R 755 loki/data

    print_success "Data directories created"

    echo ""
}

start_services() {
    print_header "Starting Monitoring Stack"

    cd "$MONITORING_DIR"

    # Pull latest images
    echo "Pulling Docker images..."
    docker-compose pull

    # Start services
    echo "Starting services..."
    docker-compose up -d

    # Wait for services to be healthy
    echo "Waiting for services to start..."
    sleep 10

    echo ""
}

verify_services() {
    print_header "Verifying Services"

    cd "$MONITORING_DIR"

    # Check if services are running
    services=(
        "prometheus:9090"
        "grafana:3000"
        "alertmanager:9093"
        "loki:3100"
    )

    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)

        if curl -s "http://localhost:$port" > /dev/null; then
            print_success "$name is running on port $port"
        else
            print_error "$name failed to start on port $port"
        fi
    done

    echo ""
}

display_info() {
    print_header "Monitoring Stack Information"

    echo -e "${GREEN}Services:${NC}"
    echo "  Prometheus:  http://localhost:9090"
    echo "  Grafana:     http://localhost:3000 (admin/admin123)"
    echo "  Alertmanager: http://localhost:9093"
    echo "  Loki:        http://localhost:3100"

    echo ""
    echo -e "${GREEN}Grafana Dashboards:${NC}"
    echo "  System Health:     http://localhost:3000/d/system-health"
    echo "  Application:       http://localhost:3000/d/application-performance"
    echo "  Business Metrics:  http://localhost:3000/d/business-metrics"
    echo "  Alerts:            http://localhost:3000/d/alerts"

    echo ""
    echo -e "${GREEN}Documentation:${NC}"
    echo "  Setup Guide:    $MONITORING_DIR/docs/MONITORING_SETUP_GUIDE.md"
    echo "  Incident Guide: $MONITORING_DIR/docs/INCIDENT_RESPONSE_GUIDE.md"
    echo "  Runbooks:       $MONITORING_DIR/runbooks/"

    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  Stop services:  docker-compose down"
    echo "  View logs:      docker-compose logs -f [service]"
    echo "  Restart:        docker-compose restart [service]"
    echo "  Status:         docker-compose ps"

    echo ""
}

next_steps() {
    print_header "Next Steps"

    echo -e "${YELLOW}1. Update credentials in .env file:${NC}"
    echo "   vim $MONITORING_DIR/.env"

    echo ""
    echo -e "${YELLOW}2. Configure PagerDuty integration:${NC}"
    echo "   Add your PagerDuty service keys to .env"

    echo ""
    echo -e "${YELLOW}3. Configure Slack webhook:${NC}"
    echo "   Add Slack webhook URL to .env for notifications"

    echo ""
    echo -e "${YELLOW}4. Test alerting:${NC}"
    echo "   Check Alertmanager: http://localhost:9093"
    echo "   Send test alert via Prometheus"

    echo ""
    echo -e "${YELLOW}5. Review dashboards:${NC}"
    echo "   Open Grafana: http://localhost:3000"
    echo "   Explore all 4 dashboards"

    echo ""
    echo -e "${YELLOW}6. Read documentation:${NC}"
    echo "   Setup Guide: $MONITORING_DIR/docs/MONITORING_SETUP_GUIDE.md"
    echo "   Runbooks: $MONITORING_DIR/runbooks/"

    echo ""
}

# Main execution
main() {
    print_header "White Room Production Monitoring Setup"

    echo ""
    check_dependencies
    setup_environment
    create_directories
    start_services
    verify_services
    display_info
    next_steps

    print_success "Monitoring stack setup complete!"
    echo ""
}

# Run main function
main
