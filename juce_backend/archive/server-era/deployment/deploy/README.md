# Native Deployment Guide for Schillinger SDK HTTP Server

This deployment method uses native system services and is compatible with VST plugin environments where Docker is not suitable.

## Overview

- **Process Management**: systemd services with auto-restart
- **Web Server**: NGINX reverse proxy with SSL and rate limiting
- **Caching**: Redis for session and result caching
- **Monitoring**: Built-in health checks and logging
- **Security**: Non-root user, proper file permissions
- **VST Compatible**: No containerization, direct system access

## Prerequisites

- Ubuntu 20.04+ / Debian 10+ / CentOS 8+ / RHEL 8+
- Python 3.11+
- sudo/root access
- Internet connection for package installation

## Quick Installation

```bash
# Clone and deploy
cd /tmp
git clone <your-repo> schillinger
cd schillinger
sudo ./deploy/setup.sh
```

## Manual Installation Steps

### 1. System Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip nginx redis-server supervisor curl build-essential

# CentOS/RHEL
sudo yum update -y
sudo yum install -y python3.11 python3.11-pip python3.11-devel nginx redis supervisor curl gcc gcc-c++
```

### 2. Create Service User

```bash
sudo useradd -r -s /bin/false -d /opt/schillinger schillinger
```

### 3. Create Directories

```bash
sudo mkdir -p /opt/schillinger
sudo mkdir -p /var/log/schillinger
sudo mkdir -p /var/lib/schillinger
sudo mkdir -p /etc/schillinger
sudo chown -R schillinger:schillinger /opt/schillinger
sudo chown -R schillinger:schillinger /var/log/schillinger
sudo chown -R schillinger:schillinger /var/lib/schillinger
sudo chown -R schillinger:schillinger /etc/schillinger
```

### 4. Install Application

```bash
# Copy files
sudo cp -r src /opt/schillinger/
sudo cp requirements-prod.txt /opt/schillinger/
sudo cp README.md /opt/schillinger/

# Create virtual environment
sudo -u schillinger python3.11 -m venv /opt/schillinger/venv
sudo -u schillinger /opt/schillinger/venv/bin/pip install --upgrade pip
sudo -u schillinger /opt/schillinger/venv/bin/pip install -r /opt/schillinger/requirements-prod.txt
```

### 5. Systemd Service

Create `/etc/systemd/system/schillinger-server.service`:

```ini
[Unit]
Description=Schillinger SDK HTTP Server
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=schillinger
Group=schillinger
WorkingDirectory=/opt/schillinger
Environment="PATH=/opt/schillinger/venv/bin"
Environment="SCHILLINGER_HOST=0.0.0.0"
Environment="SCHILLINGER_PORT=8350"
Environment="SCHILLINGER_RELOAD=false"
Environment="SCHILLINGER_LOG_LEVEL=info"
Environment="BUILD_ENV=production"
Environment="PYTHONPATH=/opt/schillinger/src"
ExecStart=/opt/schillinger/venv/bin/python src/audio_agent/tools/local_schillinger_server.py --host 0.0.0.0 --port 8350 --log-level info
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 6. NGINX Configuration

Create `/etc/nginx/sites-available/schillinger-server`:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8350;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8350;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -sf /etc/nginx/sites-available/schillinger-server /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Start Services

```bash
# Start and enable services
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo systemctl daemon-reload
sudo systemctl start schillinger-server
sudo systemctl enable schillinger-server
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Service Management

### Management Commands

```bash
# Service control
sudo systemctl start schillinger-server
sudo systemctl stop schillinger-server
sudo systemctl restart schillinger-server
sudo systemctl status schillinger-server

# View logs
sudo journalctl -u schillinger-server -f
tail -f /var/log/schillinger/server.log

# Health check
curl http://localhost:8350/health
```

### Management Script

Use the provided management script:

```bash
schillinger-server start
schillinger-server stop
schillinger-server restart
schillinger-server status
schillinger-server logs
schillinger-server health
```

## Configuration

### Environment Variables

Edit `/etc/schillinger/.env`:

```bash
# Server settings
SCHILLINGER_HOST=0.0.0.0
SCHILLINGER_PORT=8350
SCHILLINGER_LOG_LEVEL=info

# Security
API_SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379/0

# VST settings
VST_PLUGIN_PATHS=/usr/lib/vst,/usr/local/lib/vst
AUDIO_BUFFER_SIZE=512
SAMPLE_RATE=44100
```

### Rate Limiting

NGINX provides built-in rate limiting:
- General API: 10 requests/second
- Generation endpoints: 2 requests/second

### SSL/HTTPS

For production SSL setup:

1. Install SSL certificates:
```bash
sudo certbot --nginx -d your-domain.com
```

2. Update NGINX configuration to include SSL settings

## Monitoring

### Health Checks

The service includes automatic health monitoring:
- Health endpoint: `http://localhost:8350/health`
- Auto-restart on failure
- Logging to `/var/log/schillinger/healthcheck.log`

### Log Management

Logs are managed by systemd and logrotate:
- Service logs: `journalctl -u schillinger-server`
- Application logs: `/var/log/schillinger/server.log`
- Error logs: `/var/log/schillinger/server_error.log`
- Log rotation: `/etc/logrotate.d/schillinger-server`

### Performance Metrics

Monitor service performance:
```bash
# System resources
htop
iotop

# Service status
systemctl status schillinger-server
curl http://localhost:8350/health

# Network connections
netstat -tlnp | grep :8350
```

## VST Plugin Integration

This deployment method is VST-compatible because:

1. **Direct System Access**: No containerization limits
2. **Native Audio Paths**: Access to system audio and VST plugins
3. **File System Access**: Direct access to plugin directories
4. **Process Management**: systemd manages the service efficiently

### VST Configuration

Configure VST paths in environment:
```bash
VST_PLUGIN_PATHS=/usr/lib/vst,/usr/local/lib/vst,/home/user/.vst
```

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   sudo journalctl -u schillinger-server -n 50
   ```

2. **Port already in use**:
   ```bash
   sudo lsof -i :8350
   sudo kill -9 <PID>
   ```

3. **Permission issues**:
   ```bash
   sudo chown -R schillinger:schillinger /opt/schillinger
   sudo chown -R schillinger:schillinger /var/log/schillinger
   ```

4. **NGINX errors**:
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

### Recovery Procedures

1. **Full service restart**:
   ```bash
   sudo systemctl stop schillinger-server nginx redis-server
   sudo systemctl start redis-server schillinger-server nginx
   ```

2. **Reinstall application**:
   ```bash
   sudo systemctl stop schillinger-server
   sudo -u schillinger /opt/schillinger/venv/bin/pip install -r /opt/schillinger/requirements-prod.txt --force-reinstall
   sudo systemctl start schillinger-server
   ```

## Security Considerations

1. **Firewall**: Configure UFW or iptables
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw deny 8350/tcp  # Only allow via NGINX
   ```

2. **Fail2Ban**: Install and configure for brute force protection
3. **Regular Updates**: Keep system and packages updated
4. **Monitoring**: Set up alerts for service failures

## Backup and Recovery

### Backup Configuration

```bash
# Create backup script
cat > /usr/local/bin/backup-schillinger.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/schillinger"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/schillinger_$DATE.tar.gz \
    /opt/schillinger/src \
    /etc/schillinger \
    /var/lib/schillinger \
    /etc/nginx/sites-available/schillinger-server \
    /etc/systemd/system/schillinger-server.service
EOF

chmod +x /usr/local/bin/backup-schillinger.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/backup-schillinger.sh" | sudo crontab -
```

### Recovery

```bash
# Restore from backup
sudo systemctl stop schillinger-server
sudo tar -xzf /var/backups/schillinger/schillinger_YYYYMMDD_HHMMSS.tar.gz -C /
sudo systemctl start schillinger-server
```

This native deployment approach provides full system access, VST plugin compatibility, and production-grade reliability without containerization limitations.