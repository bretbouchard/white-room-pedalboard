# Audio Agent Build Instructions

This document provides comprehensive build instructions for different environments and use cases.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Build](#development-build)
3. [Production Build](#production-build)
4. [Docker Build](#docker-build)
5. [Plugin Database Setup](#plugin-database-setup)
6. [Troubleshooting](#troubleshooting)
7. [Platform-Specific Instructions](#platform-specific-instructions)

---

## Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+, Windows 10+, or Linux (Ubuntu 20.04+)
- **Python**: 3.11+ (required for backend)
- **Node.js**: 18+ (required for frontend)
- **Memory**: Minimum 4GB RAM, recommended 8GB+
- **Storage**: 10GB free space minimum

### Required Software
```bash
# Install Python 3.11+
# macOS
brew install python@3.11

# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-pip

# Install Node.js 18+
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Docker (optional but recommended)
# macOS
brew install docker docker-compose

# Ubuntu
sudo apt install docker.io docker-compose
```

### Audio Engine Dependencies
```bash
# Install DawDreamer (GPL licensed)
# Download from: https://github.com/DBraun/DawDreamer/releases

# macOS: Place in /usr/local/bin or add to PATH
# Windows: Place in System32 or add to PATH
# Linux: Place in /usr/local/bin or add to PATH
```

### Development Tools
```bash
# Install Tilt for development
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# Install additional development dependencies
npm install -g @vue/cli
npm install -g typescript
```

---

## Development Build

### Quick Start Development
```bash
# Clone the repository
git clone <repository-url>
cd audio_agent

# Install backend dependencies
cd backend
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Start development environment
cd ..
tilt up
```

### Step-by-Step Development Build

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -m src.database.init_db

# Run database migrations
python -m src.database.migrate

# Start backend in development mode
python -m src.main
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development

# Start development server
npm run dev
```

#### 3. SDK Build (if needed)
```bash
# Navigate to SDK directory
cd sdk

# Install dependencies
npm install

# Build all packages
npm run build:sequential

# Link packages locally
npm run link:all
```

### Development Configuration
```javascript
// frontend/.env.development
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_LOG_LEVEL=debug
VITE_ENABLE_HOT_RELOAD=true
```

```bash
# backend/.env.development
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=sqlite:///./dev_audio_agent.db
CORS_ORIGIN=http://localhost:3000
```

---

## Production Build

### Frontend Production Build
```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview

# Run production server
npm run preview -- --host 0.0.0.0 --port 3000
```

### Backend Production Setup
```bash
cd backend

# Create production virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install production dependencies
pip install -r requirements.txt

# Configure production environment
cp .env.example .env.production

# Initialize production database
python -m src.database.init_db

# Start production server
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 src.main:app
```

### Production Configuration
```bash
# frontend/.env.production
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com/ws
VITE_LOG_LEVEL=error
VITE_ENABLE_HOT_RELOAD=false
```

```bash
# backend/.env.production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://user:password@localhost:5432/audio_agent
CORS_ORIGIN=https://your-domain.com
SECRET_KEY=your-secret-key-here
```

---

## Docker Build

### Multi-Stage Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ .
RUN npm run build

FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN python -m src.database.init_db

FROM python:3.11-slim AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app

WORKDIR /app

# Copy backend
COPY --from=backend-builder --chown=app:app /app/backend ./backend
COPY --from=backend-builder --chown=app:app /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy frontend build
COPY --from=frontend-builder --chown=app:app /app/frontend/dist ./frontend/dist

# Copy scripts and configuration
COPY scripts/ ./scripts/
COPY docker-compose.yml ./

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "src.main"]
```

### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app/backend
      - ~/.vst3:/home/app/.vst3:ro
      - ~/Library/Audio/Plug-Ins:/home/app/Library/Audio/Plug-Ins:ro
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    command: python -m src.main

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
    command: npm run dev

  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=audio_agent_dev
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DEBUG=false
      - LOG_LEVEL=info
      - DATABASE_URL=postgresql://postgres:password@database:5432/audio_agent
    depends_on:
      - database
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  frontend:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - backend

  database:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_DB=audio_agent
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'

volumes:
  postgres_data:
```

### Building and Running with Docker
```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose -f docker-compose.prod.yml up --build -d

# Stop containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

---

## Plugin Database Setup

### Initial Plugin Scan
```bash
# Navigate to backend directory
cd backend

# Scan VST3 plugins
python -m src.audio_engine.scan_plugins --type VST3 --path ~/.vst3

# Scan AU plugins (macOS only)
python -m src.audio_engine.scan_plugins --type AU --path ~/Library/Audio/Plug-Ins/Components

# Scan all plugin types
python -m src.audio_engine.scan_plugins --all
```

### Database Migration
```bash
# Create migration
python -m src.database.migration create --name "add_plugin_metadata"

# Apply migrations
python -m src.database.migration upgrade

# Rollback migration
python -m src.database.migration downgrade
```

### Plugin Database Backup
```bash
# Backup database
python -m src.database.backup --output backup_$(date +%Y%m%d).db

# Restore database
python -m src.database.restore --input backup_20240101.db
```

---

## Troubleshooting

### Common Build Issues

#### Backend Won't Start
```bash
# Check Python version
python --version  # Should be 3.11+

# Check virtual environment
which python  # Should point to venv

# Check dependencies
pip list  # Verify all required packages are installed

# Check database connection
python -c "from src.database.connection import test_connection; test_connection()"
```

#### Frontend Build Fails
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+

# Check TypeScript compilation
npm run type-check

# Clear build cache
rm -rf dist
npm run build
```

#### Plugin Scanning Issues
```bash
# Check plugin paths
ls -la ~/.vst3
ls -la ~/Library/Audio/Plug-Ins/VST3

# Test plugin loading
python -m src.audio_engine.test_plugin --path /path/to/plugin.vst3

# Check permissions
chmod +x /path/to/plugin.vst3
```

### Performance Optimization

#### Backend Optimization
```bash
# Use Gunicorn with multiple workers
gunicorn -w $(nproc) -k uvicorn.workers.UvicornWorker src.main:app

# Enable database connection pooling
export DB_POOL_SIZE=20
export DB_MAX_OVERFLOW=30

# Use Redis for caching
pip install redis
export REDIS_URL=redis://localhost:6379
```

#### Frontend Optimization
```bash
# Enable compression
npm install --save-dev compression-webpack-plugin

# Enable tree shaking
npm run build -- --mode production

# Analyze bundle size
npm run build:analyze
```

---

## Platform-Specific Instructions

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 node postgresql redis

# Enable AU plugin support
export AU_PLUGIN_PATH="/Library/Audio/Plug-Ins:~/Library/Audio/Plug-Ins"

# Handle macOS security for plugins
sudo spctl --master-disable  # Temporary for development
```

### Windows
```bash
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install python311 nodejs postgresql redis

# Set environment variables
setx PYTHONPATH "C:\path\to\backend\src"
setx NODE_ENV "development"

# Handle Windows Defender exclusions
Add-MpPreference -ExclusionPath "C:\path\to\project"
```

### Linux (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3.11-pip python3.11-venv nodejs postgresql redis-server

# Install audio development packages
sudo apt install -y libasound2-dev portaudio19-dev libjack-jackd2-dev

# Configure audio permissions
sudo usermod -a -G audio $USER
newgrp audio

# Set environment variables
export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/build.yml
name: Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: 3.11

    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt

    - name: Run tests
      run: |
        cd backend
        python -m pytest

  test-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js 18
      uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: |
        cd frontend
        npm ci

    - name: Run tests
      run: |
        cd frontend
        npm run test

    - name: Build
      run: |
        cd frontend
        npm run build

  build-docker:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: |
        docker build -t audio-agent:${{ github.sha }} .

    - name: Run security scan
      run: |
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
          -v $PWD:/root/.cache/ aquasec/trivy:latest image audio-agent:${{ github.sha }}
```

---

## Monitoring and Logging

### Application Monitoring
```javascript
// monitoring/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const audioProcessingTime = new prometheus.Histogram({
  name: 'audio_processing_duration_seconds',
  help: 'Time taken to process audio',
  labelNames: ['plugin_type']
});

// Export metrics
module.exports = {
  httpRequestDuration,
  audioProcessingTime,
  register: prometheus.register
};
```

### Log Configuration
```javascript
// config/logging.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

---

This comprehensive build instruction guide covers all aspects of building and deploying the Audio Agent system. For specific issues or questions, refer to the troubleshooting section or create an issue in the project repository.