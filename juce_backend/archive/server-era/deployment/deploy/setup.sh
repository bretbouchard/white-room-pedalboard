#!/bin/bash
# Native deployment setup script for Schillinger SDK HTTP Server
# Compatible with VST plugin environment

set -euo pipefail

# Configuration
SERVICE_NAME="schillinger-server"
SERVICE_USER="schillinger"
INSTALL_DIR="/opt/schillinger"
LOG_DIR="/var/log/schillinger"
DATA_DIR="/var/lib/schillinger"
PYTHON_VERSION="3.11"
VENV_DIR="$INSTALL_DIR/venv"
PORT="8350"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root. Use: sudo ./deploy/setup.sh"
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect operating system"
    fi
    log "Detected OS: $OS $VER"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."

    case "$OS" in
        "Ubuntu"* | "Debian"*)
            apt-get update
            apt-get install -y \
                python$PYTHON_VERSION \
                python$PYTHON_VERSION-venv \
                python$PYTHON_VERSION-dev \
                python3-pip \
                nginx \
                redis-server \
                supervisor \
                curl \
                build-essential \
                pkg-config \
                libffi-dev \
                libssl-dev
            ;;
        "CentOS"* | "Red Hat"*)
            yum update -y
            yum install -y \
                python$PYTHON_VERSION \
                python$PYTHON_VERSION-pip \
                python$PYTHON_VERSION-devel \
                nginx \
                redis \
                supervisor \
                curl \
                gcc \
                gcc-c++ \
                pkgconfig \
                openssl-devel \
                libffi-devel
            ;;
        *)
            error "Unsupported OS: $OS"
            ;;
    esac
}

# Create service user
create_user() {
    log "Creating service user: $SERVICE_USER"

    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
    fi
}

# Create directories
create_directories() {
    log "Creating directories..."

    mkdir -p "$INSTALL_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "/etc/schillinger"

    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "/etc/schillinger"
}

# Copy application files
copy_application() {
    log "Copying application files..."

    # Copy source code
    cp -r src "$INSTALL_DIR/"
    cp requirements-prod.txt "$INSTALL_DIR/"
    cp README.md "$INSTALL_DIR/"

    # Copy configuration
    cp -r deploy/config/* "/etc/schillinger/"

    # Set ownership
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
}

# Create virtual environment
create_venv() {
    log "Creating Python virtual environment..."

    sudo -u "$SERVICE_USER" python$PYTHON_VERSION -m venv "$VENV_DIR"

    # Upgrade pip
    sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install --upgrade pip

    # Install dependencies
    sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install -r "$INSTALL_DIR/requirements-prod.txt"
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."

    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Schillinger SDK HTTP Server
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="SCHILLINGER_HOST=0.0.0.0"
Environment="SCHILLINGER_PORT=$PORT"
Environment="SCHILLINGER_RELOAD=false"
Environment="SCHILLINGER_LOG_LEVEL=info"
Environment="BUILD_ENV=production"
Environment="PYTHONPATH=$INSTALL_DIR/src"
ExecStart=$VENV_DIR/bin/python src/audio_agent/tools/local_schillinger_server.py --host 0.0.0.0 --port $PORT --log-level info
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR $DATA_DIR /etc/schillinger

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
}

# Configure nginx
configure_nginx() {
    log "Configuring nginx..."

    cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=generate:10m rate=2r/s;

    location / {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~ ^/music/generate {
        limit_req zone=generate burst=5 nodelay;

        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Longer timeout for generation requests
        proxy_connect_timeout 5s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location /health {
        proxy_pass http://127.0.0.1:$PORT;
        access_log off;
    }
}
EOF

    # Enable site
    ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/"
    rm -f "/etc/nginx/sites-enabled/default"

    # Test and reload nginx
    nginx -t && systemctl reload nginx
}

# Configure log rotation
configure_logrotate() {
    log "Configuring log rotation..."

    cat > "/etc/logrotate.d/$SERVICE_NAME" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF
}

# Create management scripts
create_management_scripts() {
    log "Creating management scripts..."

    # Management script
    cat > "/usr/local/bin/$SERVICE_NAME" << EOF
#!/bin/bash
# Schillinger Server Management Script

SERVICE_NAME="$SERVICE_NAME"
INSTALL_DIR="$INSTALL_DIR"
VENV_DIR="$VENV_DIR"

case "\$1" in
    start)
        systemctl start \$SERVICE_NAME
        ;;
    stop)
        systemctl stop \$SERVICE_NAME
        ;;
    restart)
        systemctl restart \$SERVICE_NAME
        ;;
    status)
        systemctl status \$SERVICE_NAME
        ;;
    logs)
        journalctl -u \$SERVICE_NAME -f
        ;;
    health)
        curl -f http://localhost:$PORT/health || echo "Service not healthy"
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|health}"
        exit 1
        ;;
esac
EOF

    chmod +x "/usr/local/bin/$SERVICE_NAME"
}

# Start services
start_services() {
    log "Starting services..."

    # Start Redis
    systemctl start redis-server
    systemctl enable redis-server

    # Start Schillinger service
    systemctl start "$SERVICE_NAME"

    # Start nginx
    systemctl start nginx
    systemctl enable nginx
}

# Final verification
verify_installation() {
    log "Verifying installation..."

    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Schillinger service is running"
    else
        error "❌ Schillinger service failed to start"
    fi

    # Check health endpoint
    sleep 5
    if curl -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
        log "✅ Health endpoint responding"
    else
        error "❌ Health endpoint not responding"
    fi

    # Check nginx
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx is running"
    else
        error "❌ Nginx failed to start"
    fi
}

# Main installation function
main() {
    log "Starting Schillinger SDK HTTP Server deployment..."

    check_root
    detect_os
    install_dependencies
    create_user
    create_directories

    # Get current directory for copying files
    CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$(dirname "$CURRENT_DIR")"

    copy_application
    create_venv
    create_systemd_service
    configure_nginx
    configure_logrotate
    create_management_scripts
    start_services
    verify_installation

    log "🎉 Installation completed successfully!"
    log "Service management: $SERVICE_NAME {start|stop|restart|status|logs|health}"
    log "API endpoint: http://localhost:$PORT"
    log "Health check: http://localhost:$PORT/health"
    log "API docs: http://localhost:$PORT/docs"
}

# Run main function
main "$@"