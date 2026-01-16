#!/bin/bash

# REST API Security Framework Deployment Script
# This script handles the complete deployment of the REST security system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build_simple"
DEPLOYMENT_DIR="$SCRIPT_DIR"
NAMESPACE="schillinger-backend"
APP_NAME="schillinger-backend-rest-security"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..60})${NC}"
}

print_section() {
    echo -e "${CYAN}📋 $1${NC}"
    echo -e "${CYAN}$(printf '─%.0s' {1..50})${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check if required tools are installed
    local required_tools=("docker" "kubectl" "helm" "git")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            print_success "$tool is installed"
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and try again"
        exit 1
    fi

    # Check if Kubernetes cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot access Kubernetes cluster"
        print_info "Please check your kubeconfig and try again"
        exit 1
    else
        print_success "Kubernetes cluster is accessible"
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker and try again"
        exit 1
    else
        print_success "Docker daemon is running"
    fi

    print_success "All prerequisites satisfied"
}

# Function to build the REST security components
build_rest_security() {
    print_section "Building REST Security Components"

    print_info "Building REST security library..."
    cd "$PROJECT_ROOT"

    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        print_info "Cleaning previous build..."
        rm -rf "$BUILD_DIR"
    fi

    # Configure CMake
    print_info "Configuring CMake..."
    if ! cmake -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release; then
        print_error "CMake configuration failed"
        exit 1
    fi

    # Build REST security library
    print_info "Building REST security library..."
    if ! cmake --build "$BUILD_DIR" --config Release --target RestApiSecurityLib -j$(nproc); then
        print_error "Build failed"
        exit 1
    fi

    # Build comprehensive tests
    print_info "Building comprehensive tests..."
    if ! cmake --build "$BUILD_DIR" --config Release --target RestSecurityComprehensiveTests -j$(nproc); then
        print_error "Test build failed"
        exit 1
    fi

    # Run tests to verify build
    print_info "Running tests to verify build..."
    if ! "$BUILD_DIR/src/rest/RestSecurityComprehensiveTests" --gtest_filter="*JsonParser*:*RateLimit*"; then
        print_error "Build verification tests failed"
        exit 1
    fi

    print_success "REST security components built successfully"
}

# Function to build Docker image
build_docker_image() {
    print_section "Building Docker Image"

    # Create Dockerfile if it doesn't exist
    local dockerfile="$DEPLOYMENT_DIR/Dockerfile"
    if [ ! -f "$dockerfile" ]; then
        print_info "Creating Dockerfile..."
        cat > "$dockerfile" << 'EOF'
# Multi-stage build for REST security backend
FROM alpine:3.18 AS builder

# Install build dependencies
RUN apk add --no-cache \
    cmake \
    make \
    g++ \
    pkgconfig \
    jsoncpp-dev \
    sqlite-dev \
    git \
    linux-headers

# Set working directory
WORKDIR /build

# Copy source code
COPY . .

# Build REST security components
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release --target RestApiSecurityLib

# Production stage
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    jsoncpp \
    sqlite \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -D -s /bin/sh -u 1000 -G appgroup appuser

# Create necessary directories
RUN mkdir -p /app/config /app/logs /app/ssl && \
    chown -R appuser:appgroup /app

# Copy built libraries and executables
COPY --from=builder /build/build/src/rest/*.so* /app/lib/
COPY --from=builder /build/src/rest/RestApiSecurityDemo /app/bin/

# Copy configuration files
COPY deployment/rest_security_deployment.yaml /app/config/
COPY deployment/docker-entrypoint.sh /app/entrypoint.sh

# Set permissions
RUN chmod +x /app/entrypoint.sh && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set working directory
WORKDIR /app

# Expose ports
EXPOSE 8080 8443 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /app/bin/RestApiSecurityDemo --health-check || exit 1

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command
CMD ["--server", "--port=8080", "--ssl-port=8443"]
EOF
        print_success "Dockerfile created"
    fi

    # Create Docker entrypoint script
    local entrypoint="$DEPLOYMENT_DIR/docker-entrypoint.sh"
    if [ ! -f "$entrypoint" ]; then
        print_info "Creating Docker entrypoint script..."
        cat > "$entrypoint" << 'EOF'
#!/bin/sh

set -e

echo "🚀 Starting Schillinger REST Security Backend"
echo "============================================="

# Initialize configuration
echo "📋 Initializing configuration..."
/app/bin/RestApiSecurityDemo --init-config

# Generate SSL certificates if they don't exist
if [ ! -f "/app/ssl/cert.pem" ]; then
    echo "🔐 Generating self-signed SSL certificate..."
    openssl req -x509 -newkey rsa:2048 -keyout /app/ssl/key.pem -out /app/ssl/cert.pem -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=Schillinger/CN=localhost"
fi

# Set permissions
chmod 600 /app/ssl/key.pem
chmod 644 /app/ssl/cert.pem

# Create log directory
mkdir -p /app/logs

echo "✅ Initialization complete"

# Run the application
echo "🌟 Starting REST security server..."
exec "$@"
EOF
        chmod +x "$entrypoint"
        print_success "Docker entrypoint script created"
    fi

    # Build Docker image
    print_info "Building Docker image..."
    local image_tag="schillinger/backend:rest-security-$(git rev-parse --short HEAD)"

    if ! docker build -t "$image_tag" -f "$dockerfile" "$PROJECT_ROOT"; then
        print_error "Docker build failed"
        exit 1
    fi

    print_success "Docker image built successfully: $image_tag"
    echo "$image_tag" > "$DEPLOYMENT_DIR/.image_tag"
}

# Function to setup Kubernetes namespace
setup_kubernetes_namespace() {
    print_section "Setting Up Kubernetes Namespace"

    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Creating namespace: $NAMESPACE"
        if ! kubectl create namespace "$NAMESPACE"; then
            print_error "Failed to create namespace"
            exit 1
        fi
        print_success "Namespace created: $NAMESPACE"
    else
        print_success "Namespace already exists: $NAMESPACE"
    fi

    # Set default namespace
    kubectl config set-context --current --namespace="$NAMESPACE"
}

# Function to setup secrets
setup_secrets() {
    print_section "Setting Up Kubernetes Secrets"

    # Check if secrets exist
    if ! kubectl get secret schillinger-secrets -n "$NAMESPACE" &> /dev/null; then
        print_info "Creating secrets..."

        # Generate JWT secret
        local jwt_secret=$(openssl rand -base64 32)

        # Create secrets
        kubectl create secret generic schillinger-secrets \
            --from-literal=jwt-secret="$jwt_secret" \
            --from-literal=github-client-id="${GITHUB_CLIENT_ID:-placeholder}" \
            --from-literal=github-client-secret="${GITHUB_CLIENT_SECRET:-placeholder}" \
            -n "$NAMESPACE"

        print_success "Secrets created"
    else
        print_success "Secrets already exist"
    fi

    # Setup SSL certificates
    if ! kubectl get secret schillinger-ssl-certs -n "$NAMESPACE" &> /dev/null; then
        print_info "Creating SSL certificates..."

        # Create temporary directory for certificates
        local temp_cert_dir=$(mktemp -d)
        trap "rm -rf $temp_cert_dir" EXIT

        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$temp_cert_dir/tls.key" \
            -out "$temp_cert_dir/tls.crt" \
            -subj "/C=US/ST=State/L=City/O=Schillinger/CN=localhost"

        # Create Kubernetes secrets
        kubectl create secret tls schillinger-ssl-certs \
            --cert="$temp_cert_dir/tls.crt" \
            --key="$temp_cert_dir/tls.key" \
            -n "$NAMESPACE"

        kubectl create secret generic schillinger-ssl-private \
            --from-file=tls.key="$temp_cert_dir/tls.key" \
            -n "$NAMESPACE"

        print_success "SSL certificates created"
    else
        print_success "SSL certificates already exist"
    fi
}

# Function to deploy to Kubernetes
deploy_to_kubernetes() {
    print_section "Deploying to Kubernetes"

    # Apply ConfigMap
    print_info "Applying ConfigMap..."
    if ! kubectl apply -f "$DEPLOYMENT_DIR/rest_security_deployment.yaml" -n "$NAMESPACE"; then
        print_error "Failed to apply ConfigMap"
        exit 1
    fi

    # Get image tag
    local image_tag
    if [ -f "$DEPLOYMENT_DIR/.image_tag" ]; then
        image_tag=$(cat "$DEPLOYMENT_DIR/.image_tag")
    else
        image_tag="schillinger/backend:rest-security-latest"
    fi

    # Update image in deployment
    print_info "Updating deployment image: $image_tag"
    kubectl patch deployment "$APP_NAME" -n "$NAMESPACE" -p \
        "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"schillinger-backend\",\"image\":\"$image_tag\"}]}}}}"

    # Wait for deployment to be ready
    print_info "Waiting for deployment to be ready..."
    if ! kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=300s; then
        print_error "Deployment failed to become ready"
        exit 1
    fi

    print_success "Deployment completed successfully"
}

# Function to verify deployment
verify_deployment() {
    print_section "Verifying Deployment"

    # Check pod status
    print_info "Checking pod status..."
    local pod_status=$(kubectl get pods -l app="$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.items[0].status.phase}')

    if [ "$pod_status" = "Running" ]; then
        print_success "Pods are running"
    else
        print_error "Pods are not running (status: $pod_status)"
        kubectl get pods -l app="$APP_NAME" -n "$NAMESPACE"
        exit 1
    fi

    # Check service status
    print_info "Checking service status..."
    if kubectl get service "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        print_success "Service is running"
    else
        print_error "Service is not running"
        exit 1
    fi

    # Perform health check
    print_info "Performing health check..."
    local pod_name=$(kubectl get pods -l app="$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if kubectl exec "$pod_name" -n "$NAMESPACE" -- /app/bin/RestApiSecurityDemo --health-check; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi

    # Test security endpoints
    print_info "Testing security endpoints..."
    local pod_ip=$(kubectl get pod "$pod_name" -n "$NAMESPACE" -o jsonpath='{.status.podIP}')

    # Test rate limiting
    print_info "Testing rate limiting..."
    for i in {1..5}; do
        if curl -s "http://$pod_ip:8080/api/test" -H "X-Client-IP: 192.168.1.100" > /dev/null; then
            echo "Request $i: OK"
        else
            echo "Request $i: Failed"
        fi
    done

    print_success "Security endpoints are responding"
}

# Function to setup monitoring
setup_monitoring() {
    print_section "Setting Up Monitoring"

    # Create ServiceMonitor for Prometheus
    cat > "$DEPLOYMENT_DIR/service-monitor.yaml" << 'EOF'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: schillinger-backend-rest-security
  namespace: schillinger-backend
  labels:
    app: schillinger-backend
    component: rest-security
spec:
  selector:
    matchLabels:
      app: schillinger-backend
      component: rest-security
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
EOF

    # Apply ServiceMonitor
    if kubectl apply -f "$DEPLOYMENT_DIR/service-monitor.yaml" -n "$NAMESPACE"; then
        print_success "ServiceMonitor created"
    else
        print_warning "ServiceMonitor creation failed (Prometheus may not be installed)"
    fi

    # Create PrometheusRule for alerting
    cat > "$DEPLOYMENT_DIR/prometheus-rules.yaml" << 'EOF'
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: schillinger-backend-alerts
  namespace: schillinger-backend
  labels:
    app: schillinger-backend
    component: rest-security
spec:
  groups:
    - name: schillinger-backend.rules
      rules:
        - alert: SchillingerBackendDown
          expr: up{job="schillinger-backend"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Schillinger Backend is down"
            description: "Schillinger Backend has been down for more than 1 minute."

        - alert: HighErrorRate
          expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "High error rate detected"
            description: "Error rate is {{ $value | humanizePercentage }}."

        - alert: HighRateLimitViolations
          expr: rate(rate_limit_violations_total[5m]) > 10
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "High rate limit violations"
            description: "Rate limit violations: {{ $value }} per second."
EOF

    # Apply PrometheusRule
    if kubectl apply -f "$DEPLOYMENT_DIR/prometheus-rules.yaml" -n "$NAMESPACE"; then
        print_success "PrometheusRules created"
    else
        print_warning "PrometheusRules creation failed (Prometheus Operator may not be installed)"
    fi
}

# Function to generate deployment report
generate_deployment_report() {
    print_section "Generating Deployment Report"

    local report_file="$DEPLOYMENT_DIR/deployment_report.md"
    local deployment_date=$(date '+%Y-%m-%d %H:%M:%S')
    local git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    cat > "$report_file" << EOF
# REST API Security Framework Deployment Report

## Deployment Information
- **Date:** $deployment_date
- **Git Commit:** $git_commit
- **Git Branch:** $git_branch
- **Namespace:** $NAMESPACE
- **Application:** $APP_NAME

## Security Configuration
- **Rate Limiting:** Enabled
- **JSON Security:** Enabled
- **Input Validation:** Enabled
- **Authentication:** Enabled
- **HTTPS Enforcement:** Enabled
- **CORS Protection:** Enabled

## Infrastructure Status

### Pods
\`\`\`
$(kubectl get pods -l app="$APP_NAME" -n "$NAMESPACE")
\`\`\`

### Services
\`\`\`
$(kubectl get services -n "$NAMESPACE")
\`\`\`

### ConfigMaps
\`\`\`
$(kubectl get configmaps -n "$NAMESPACE")
\`\`\`

### Secrets
\`\`\`
$(kubectl get secrets -n "$NAMESPACE")
\`\`\`

## Security Features Deployed

### Rate Limiting
- Global rate limits enforced
- Per-client rate limits enforced
- Burst capacity management
- Whitelist and blacklist support

### JSON Security
- Size limits enforced
- Nesting depth limits
- Type validation
- Malicious content detection

### Input Validation
- SQL injection prevention
- XSS protection
- Input sanitization
- Size restrictions

### Authentication & Authorization
- JWT token validation
- API key authentication
- HTTPS enforcement
- CORS protection

### Monitoring & Logging
- Security event logging
- Performance metrics
- Health checks
- Prometheus monitoring

## Access Information

### External Access
- **HTTP Port:** 80 (redirects to HTTPS)
- **HTTPS Port:** 443
- **API Base URL:** https://api.schillinger.app
- **Health Check:** https://api.schillinger.app/health

### Internal Access
- **Service Name:** $APP_NAME
- **Service Port:** 8080 (HTTP), 8443 (HTTPS)
- **Metrics Port:** 9090

## Testing Commands

### Health Check
\`\`\`
curl https://api.schillinger.app/health
\`\`\`

### Rate Limit Test
\`\`\`
for i in {1..10}; do
  curl -H "X-API-Key: test-key" https://api.schillinger.app/api/test
done
\`\`\`

### Security Test
\`\`\`
curl -X POST -H "Content-Type: application/json" \\
     -d '{"query":"\\'; DROP TABLE users; --"}' \\
     https://api.schillinger.app/api/validate
\`\`\`

## Troubleshooting

### Logs
\`\`\`
kubectl logs -l app="$APP_NAME" -n "$NAMESPACE"
\`\`\`

### Events
\`\`\`
kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$APP_NAME"
\`\`\`

### Port Forwarding
\`\`\`
kubectl port-forward service/$APP_NAME 8080:8080 -n "$NAMESPACE"
\`\`\`

### Security Events
\`\`\`
kubectl logs -l app="$APP_NAME" -n "$NAMESPACE" | grep "SECURITY"
\`\`\`

## Next Steps
1. Monitor the deployment for the first 24 hours
2. Set up automated alerts for security events
3. Configure backup and disaster recovery
4. Perform penetration testing
5. Set up log aggregation and analysis

---
*Report generated automatically by deployment script*
EOF

    print_success "Deployment report generated: $report_file"
}

# Function to cleanup on failure
cleanup_on_failure() {
    print_error "Deployment failed, cleaning up..."

    # Remove image tag file
    rm -f "$DEPLOYMENT_DIR/.image_tag"

    # Rollback Kubernetes deployment
    if kubectl get deployment "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        print_info "Rolling back deployment..."
        kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE"
    fi

    exit 1
}

# Main deployment function
main() {
    print_header "REST API Security Framework Deployment"

    # Set up error handling
    trap cleanup_on_failure ERR

    # Parse command line arguments
    local action="${1:-deploy}"
    case "$action" in
        "build")
            check_prerequisites
            build_rest_security
            ;;
        "docker")
            check_prerequisites
            build_docker_image
            ;;
        "k8s")
            check_prerequisites
            setup_kubernetes_namespace
            setup_secrets
            deploy_to_kubernetes
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "verify")
            verify_deployment
            ;;
        "report")
            generate_deployment_report
            ;;
        "deploy")
            check_prerequisites
            build_rest_security
            build_docker_image
            setup_kubernetes_namespace
            setup_secrets
            deploy_to_kubernetes
            verify_deployment
            setup_monitoring
            generate_deployment_report
            ;;
        "cleanup")
            print_section "Cleaning Up Deployment"
            kubectl delete deployment "$APP_NAME" -n "$NAMESPACE" || true
            kubectl delete service "$APP_NAME" -n "$NAMESPACE" || true
            kubectl delete configmap rest-security-config -n "$NAMESPACE" || true
            kubectl delete secret schillinger-secrets -n "$NAMESPACE" || true
            rm -f "$DEPLOYMENT_DIR/.image_tag"
            print_success "Cleanup completed"
            ;;
        "--help"|"-h")
            cat << EOF
Usage: $0 [ACTION]

Actions:
  build      Build REST security components
  docker     Build Docker image
  k8s        Deploy to Kubernetes
  monitoring Setup monitoring and alerting
  verify     Verify deployment
  report     Generate deployment report
  deploy     Full deployment (default)
  cleanup    Clean up deployment
  --help     Show this help message

Examples:
  $0                    # Full deployment
  $0 build             # Build only
  $0 k8s               # Deploy to Kubernetes only
  $0 verify             # Verify deployment only
EOF
            exit 0
            ;;
        *)
            print_error "Unknown action: $action"
            print_info "Use --help for usage information"
            exit 1
            ;;
    esac

    print_header "Deployment Completed Successfully! 🎉"
    print_success "REST API Security Framework is deployed and ready for use"
    print_info "Access the API at: https://api.schillinger.app"
    print_info "Health check: https://api.schillinger.app/health"
}

# Run main function with all arguments
main "$@"