#!/usr/bin/env python3
"""
Deployment verification script for Schillinger SDK HTTP Server
Tests all components of the native deployment
"""

import os
import subprocess
import sys
import time

import requests

# Configuration
SERVER_URL = "http://localhost:8350"
NGINX_URL = "http://localhost"
TIMEOUT = 10
RETRY_COUNT = 3


def log_test(test_name, passed, message=""):
    """Log test results"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"   {message}")


def test_systemd_service():
    """Test if systemd service is running"""
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "schillinger-server"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        is_active = result.stdout.strip() == "active"
        log_test(
            "Systemd service status",
            is_active,
            f"Service status: {result.stdout.strip()}",
        )
        return is_active
    except Exception as e:
        log_test("Systemd service status", False, str(e))
        return False


def test_service_health():
    """Test service health endpoint"""
    for attempt in range(RETRY_COUNT):
        try:
            response = requests.get(f"{SERVER_URL}/health", timeout=TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                is_healthy = data.get("status") == "healthy"
                log_test(
                    "Service health check",
                    is_healthy,
                    f"Status: {data.get('status')}, Initialized: {data.get('initialized')}",
                )
                return is_healthy
            else:
                log_test(
                    "Service health check",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                )
                return False
        except requests.exceptions.ConnectRefusedError:
            if attempt < RETRY_COUNT - 1:
                print(
                    f"Attempt {attempt + 1}/{RETRY_COUNT}: Connection refused, retrying..."
                )
                time.sleep(2)
                continue
            else:
                log_test("Service health check", False, "Connection refused")
                return False
        except Exception as e:
            log_test("Service health check", False, str(e))
            return False


def test_api_capabilities():
    """Test API capabilities endpoint"""
    try:
        response = requests.get(f"{SERVER_URL}/capabilities", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            has_generation = len(data.get("generation", [])) > 0
            has_analysis = len(data.get("analysis", [])) > 0
            log_test(
                "API capabilities",
                has_generation and has_analysis,
                f"Generation types: {len(data.get('generation', []))}, "
                f"Analysis types: {len(data.get('analysis', []))}",
            )
            return has_generation and has_analysis
        else:
            log_test("API capabilities", False, f"HTTP {response.status_code}")
            return False
    except Exception as e:
        log_test("API capabilities", False, str(e))
        return False


def test_generation_endpoint():
    """Test music generation endpoint"""
    try:
        payload = {
            "type": "pattern",
            "parameters": {"key": "C", "scale": "MAJOR", "length": 2, "complexity": 3},
        }

        response = requests.post(
            f"{SERVER_URL}/music/generate", json=payload, timeout=TIMEOUT
        )

        if response.status_code == 200:
            data = response.json()
            has_result = data.get("success") and data.get("data")
            log_test(
                "Music generation",
                has_result,
                f"Success: {data.get('success')}, Has data: {bool(data.get('data'))}",
            )
            return has_result
        else:
            log_test(
                "Music generation",
                False,
                f"HTTP {response.status_code}: {response.text}",
            )
            return False
    except Exception as e:
        log_test("Music generation", False, str(e))
        return False


def test_analysis_endpoint():
    """Test music analysis endpoint"""
    try:
        payload = {
            "type": "harmony",
            "input": {
                "content": {
                    "chords": [
                        {"root": 60, "type": "major", "duration": 1},
                        {"root": 64, "type": "major", "duration": 1},
                    ]
                }
            },
        }

        response = requests.post(
            f"{SERVER_URL}/music/analyze", json=payload, timeout=TIMEOUT
        )

        if response.status_code == 200:
            data = response.json()
            has_result = data.get("success") and data.get("data")
            log_test(
                "Music analysis",
                has_result,
                f"Success: {data.get('success')}, Has data: {bool(data.get('data'))}",
            )
            return has_result
        else:
            log_test(
                "Music analysis", False, f"HTTP {response.status_code}: {response.text}"
            )
            return False
    except Exception as e:
        log_test("Music analysis", False, str(e))
        return False


def test_nginx_proxy():
    """Test NGINX reverse proxy"""
    try:
        response = requests.get(f"{NGINX_URL}/health", timeout=TIMEOUT)
        if response.status_code == 200:
            log_test(
                "NGINX reverse proxy", True, "NGINX successfully proxying requests"
            )
            return True
        else:
            log_test("NGINX reverse proxy", False, f"HTTP {response.status_code}")
            return False
    except requests.exceptions.ConnectRefusedError:
        log_test("NGINX reverse proxy", False, "NGINX not responding")
        return False
    except Exception as e:
        log_test("NGINX reverse proxy", False, str(e))
        return False


def test_redis_connection():
    """Test Redis connection"""
    try:
        result = subprocess.run(
            ["redis-cli", "ping"], capture_output=True, text=True, timeout=5
        )
        is_connected = result.stdout.strip() == "PONG"
        log_test(
            "Redis connection", is_connected, f"Redis response: {result.stdout.strip()}"
        )
        return is_connected
    except FileNotFoundError:
        log_test("Redis connection", False, "Redis CLI not found")
        return False
    except Exception as e:
        log_test("Redis connection", False, str(e))
        return False


def test_file_permissions():
    """Test file and directory permissions"""
    issues = []

    # Check key directories
    dirs_to_check = [
        "/opt/schillinger",
        "/var/log/schillinger",
        "/var/lib/schillinger",
        "/etc/schillinger",
    ]

    for dir_path in dirs_to_check:
        if not os.path.exists(dir_path):
            issues.append(f"Directory missing: {dir_path}")
        else:
            stat_info = os.stat(dir_path)
            if stat_info.st_uid == 0:  # root owned
                issues.append(
                    f"Directory {dir_path} owned by root instead of schillinger user"
                )

    has_issues = len(issues) == 0
    log_test(
        "File permissions",
        has_issues,
        "All permissions correct" if has_issues else "; ".join(issues),
    )
    return has_issues


def test_log_files():
    """Test if log files are being created"""
    log_files = [
        "/var/log/schillinger/server.log",
        "/var/log/schillinger/server_error.log",
    ]

    existing_logs = []
    for log_file in log_files:
        if os.path.exists(log_file):
            existing_logs.append(log_file)

    has_logs = len(existing_logs) > 0
    log_test(
        "Log files",
        has_logs,
        f"Found {len(existing_logs)} log files: {', '.join([os.path.basename(f) for f in existing_logs])}",
    )
    return has_logs


def main():
    """Run all verification tests"""
    print("🔍 Schillinger SDK HTTP Server Deployment Verification")
    print("=" * 60)

    tests = [
        ("Systemd Service", test_systemd_service),
        ("Service Health", test_service_health),
        ("API Capabilities", test_api_capabilities),
        ("Music Generation", test_generation_endpoint),
        ("Music Analysis", test_analysis_endpoint),
        ("NGINX Proxy", test_nginx_proxy),
        ("Redis Connection", test_redis_connection),
        ("File Permissions", test_file_permissions),
        ("Log Files", test_log_files),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n🧪 Testing {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            log_test(test_name, False, f"Test error: {str(e)}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Deployment is successful.")
        return 0
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please check the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
