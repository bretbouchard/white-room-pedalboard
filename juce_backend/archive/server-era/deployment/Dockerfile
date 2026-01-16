# Audio Agent Production Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libffi-dev \
    libssl-dev \
    libasound2-dev \
    libportaudio2 \
    libportaudiocpp0 \
    portaudio19-dev \
    libsndfile1-dev \
    libflac-dev \
    libogg-dev \
    libvorbis-dev \
    libopus-dev \
    libmp3lame-dev \
    libfdk-aac-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml ./
COPY requirements.txt ./

# Install pip and poetry
RUN pip install --upgrade pip poetry

# Configure poetry
RUN poetry config virtualenvs.create false

# Install Python dependencies
RUN poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY src/ ./src/
COPY backend/ ./backend/
COPY docs/ ./docs/
COPY examples/ ./examples/

# Create directories for audio files and logs
RUN mkdir -p /app/audio_files /app/logs /app/temp

# Set environment variables
ENV PYTHONPATH=/app/src:/app/backend/src
ENV HOST=0.0.0.0
ENV PORT=8081
ENV RELOAD=false
ENV ENVIRONMENT=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Expose port
EXPOSE 8081

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash audioagent
RUN chown -R audioagent:audioagent /app
USER audioagent

# Start command
CMD ["python", "-m", "src.audio_agent.main"]