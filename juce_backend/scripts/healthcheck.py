#!/usr/bin/env python3
"""
Health check script for Schillinger SDK HTTP Server
Monitors the service and restarts if unhealthy
"""

import subprocess
import sys
import time
from datetime import datetime

import requests

# Configuration
SERVICE_NAME = sys.argv[1] if len(sys.argv) > 1 else "schillinger-server"
HEALTH_URL = "http://localhost:8350/health"
CHECK_INTERVAL = 30
MAX_FAILURES = 3
LOG_FILE = "/var/log/schillinger/healthcheck.log"


def log_message(message):
    """Log messages to both stdout and log file"""
    timestamp = datetime.now().isoformat()
    log_line = f"[{timestamp}] {message}"
    print(log_line)

    try:
        with open(LOG_FILE, "a") as f:
            f.write(log_line + "\n")
    except Exception:
        pass  # Don't fail if we can't write to log file


def check_service_health():
    """Check if the service is healthy by calling the health endpoint"""
    try:
        response = requests.get(HEALTH_URL, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                return True, "Service is healthy"
            else:
                return False, f"Service reported unhealthy status: {data.get('status')}"
        else:
            return False, f"Health check returned status {response.status_code}"
    except requests.exceptions.Timeout:
        return False, "Health check timed out"
    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to service"
    except Exception as e:
        return False, f"Health check error: {str(e)}"


def restart_service():
    """Restart the service using systemctl"""
    try:
        log_message(f"Restarting {SERVICE_NAME} service...")
        result = subprocess.run(
            ["systemctl", "restart", SERVICE_NAME], capture_output=True, text=True
        )
        if result.returncode == 0:
            log_message(f"Successfully restarted {SERVICE_NAME}")
            return True
        else:
            log_message(f"Failed to restart {SERVICE_NAME}: {result.stderr}")
            return False
    except Exception as e:
        log_message(f"Error restarting service: {str(e)}")
        return False


def main():
    """Main health check loop"""
    failure_count = 0

    log_message(f"Starting health check monitoring for {SERVICE_NAME}")

    while True:
        try:
            is_healthy, message = check_service_health()

            if is_healthy:
                log_message(f"✅ Health check passed: {message}")
                failure_count = 0
            else:
                failure_count += 1
                log_message(
                    f"❌ Health check failed ({failure_count}/{MAX_FAILURES}): {message}"
                )

                if failure_count >= MAX_FAILURES:
                    log_message("Maximum failures reached, restarting service...")
                    if restart_service():
                        failure_count = 0
                        # Wait a bit after restart
                        time.sleep(30)
                    else:
                        log_message("Failed to restart service, continuing monitoring")

            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            log_message("Health check monitoring stopped by user")
            break
        except Exception as e:
            log_message(f"Unexpected error in health check: {str(e)}")
            time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
