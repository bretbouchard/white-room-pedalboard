# Production-ready Dockerfile for Schillinger SDK HTTP Server
# Multi-stage build for optimized production images

# Stage 1: Builder
FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_ENV=production
ARG APP_VERSION=1.0.0

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
COPY requirements-prod.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements-prod.txt

# Stage 2: Production
FROM python:3.11-slim as production

# Set production arguments
ARG BUILD_ENV=production
ARG APP_VERSION=1.0.0
ARG APP_PORT=8350

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    BUILD_ENV=${BUILD_ENV} \
    APP_VERSION=${APP_VERSION} \
    APP_PORT=${APP_PORT} \
    SCHILLINGER_HOST=0.0.0.0 \
    SCHILLINGER_PORT=${APP_PORT} \
    SCHILLINGER_RELOAD=false \
    SCHILLINGER_LOG_LEVEL=info

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r schillinger && \
    useradd -r -g schillinger -d /app -s /bin/bash schillinger

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R schillinger:schillinger /app

# Copy Python dependencies from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=schillinger:schillinger src/ ./src/
COPY --chown=schillinger:schillinger scripts/ ./scripts/
COPY --chown=schillinger:schillinger README.md .
COPY --chown=schillinger:schillinger LICENSE .

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp /app/data && \
    chown -R schillinger:schillinger /app/logs /app/tmp /app/data

# Switch to non-root user
USER schillinger

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${APP_PORT}/health || exit 1

# Expose port
EXPOSE ${APP_PORT}

# Start the application
CMD ["python", "src/audio_agent/tools/local_schillinger_server.py", "--host", "0.0.0.0", "--port", "8350", "--log-level", "info"]

# Labels for metadata
LABEL maintainer="Schillinger SDK Team" \
      version="${APP_VERSION}" \
      description="Schillinger SDK HTTP Server for Music Generation and Analysis" \
      org.opencontainers.image.title="Schillinger SDK HTTP Server" \
      org.opencontainers.image.description="Production-ready HTTP server for Schillinger SDK" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.vendor="Schillinger" \
      org.opencontainers.image.licenses="MIT"