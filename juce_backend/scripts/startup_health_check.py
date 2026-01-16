#!/usr/bin/env python3
"""
Startup Health Check - Runs at startup to ensure system is properly configured.

This should be run BEFORE starting any services.
If checks fail, services should NOT start.
"""

import socket
import subprocess
import sys
import time
from pathlib import Path

import requests


class StartupHealthCheck:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.errors = []

    def check_python_dependencies(self):
        """Check if required Python dependencies are installed."""
        print("🐍 Checking Python dependencies...")

        required_packages = ["fastapi", "uvicorn", "pydantic", "websockets", "pytest"]

        for package in required_packages:
            try:
                result = subprocess.run(
                    [sys.executable, "-c", f"import {package}"],
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    self.errors.append(f"Missing required package: {package}")
            except ImportError:
                self.errors.append(f"Cannot import package: {package}")

    def check_dawdreamer_dependency(self):
        """Check DawDreamer dependency specifically."""
        print("🎵 Checking DawDreamer dependency...")

        # Check if DawDreamer is supposed to be installed
        req_file = self.project_root / "requirements.txt"
        if req_file.exists():
            content = req_file.read_text()
            if "dawdreamer" not in content.lower():
                print("⚠️  DawDreamer not in requirements.txt (may be intentional)")

        # Check if code tries to import DawDreamer
        backend_dir = self.project_root / "backend" / "src"
        if backend_dir.exists():
            dawdreamer_files = list(backend_dir.rglob("*dawdreamer*"))
            if dawdreamer_files:
                print(f"📁 Found {len(dawdreamer_files)} DawDreamer-related files")

                # Try to import
                try:
                    result = subprocess.run(
                        [sys.executable, "-c", "import dawdreamer"],
                        capture_output=True,
                        text=True,
                        cwd=str(self.project_root),
                    )
                    if result.returncode != 0:
                        self.errors.append(
                            "DawDreamer import failed - either install it or remove all DawDreamer code"
                        )
                except ImportError:
                    self.errors.append("DawDreamer not available but code expects it")

    def check_frontend_dependencies(self):
        """Check if frontend dependencies are installed."""
        print("📦 Checking frontend dependencies...")

        frontend_dir = self.project_root / "frontend"
        if not frontend_dir.exists():
            self.errors.append("Frontend directory not found")
            return

        # Check if node_modules exists
        node_modules = frontend_dir / "node_modules"
        if not node_modules.exists():
            self.errors.append(
                "Node modules not installed - run 'npm install' in frontend directory"
            )
            return

        # Check for critical dependencies
        critical_deps = ["react", "react-dom", "@xyflow/react", "vite"]

        for dep in critical_deps:
            dep_path = node_modules / dep
            if not dep_path.exists():
                self.errors.append(f"Missing frontend dependency: {dep}")

    def check_configuration_files(self):
        """Check if required configuration files exist."""
        print("⚙️  Checking configuration files...")

        required_files = [
            "frontend/package.json",
            "backend/requirements.txt",
            "backend/src/main.py",
        ]

        for file_path in required_files:
            full_path = self.project_root / file_path
            if not full_path.exists():
                self.errors.append(f"Missing required file: {file_path}")

    def check_ports_available(self):
        """Check if required ports are available."""
        print("🔌 Checking port availability...")

        ports_needed = {
            3000: "Frontend (fallback)",
            3001: "Frontend (primary)",
            8000: "Backend",
            8081: "Backend (alternative)",
        }

        used_ports = []
        for port, description in ports_needed.items():
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                result = sock.connect_ex(("localhost", port))
                if result == 0:
                    used_ports.append((port, description))
            finally:
                sock.close()

        if used_ports:
            print(f"⚠️  Ports already in use: {[f'{p} ({d})' for p, d in used_ports]}")

    def check_backend_startup(self):
        """Try to start backend and check if it responds."""
        print("🚀 Testing backend startup...")

        backend_dir = self.project_root / "backend"
        if not backend_dir.exists():
            self.errors.append("Backend directory not found")
            return

        # Try to start backend briefly
        try:
            process = subprocess.Popen(
                [sys.executable, "-m", "src.main"],
                cwd=str(backend_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Give it a moment to start
            time.sleep(3)

            # Check if it's still running
            if process.poll() is not None:
                # Process has terminated
                stdout, stderr = process.communicate()
                self.errors.append("Backend failed to start:")
                if stderr:
                    self.errors.append(f"  stderr: {stderr[:500]}")
                if stdout:
                    self.errors.append(f"  stdout: {stdout[:500]}")
            else:
                # Process is still running, try to check if it responds
                try:
                    response = requests.get("http://localhost:8000/health", timeout=2)
                    if response.status_code != 200:
                        self.errors.append(
                            "Backend health endpoint returned non-200 status"
                        )
                except requests.exceptions.RequestException:
                    self.errors.append(
                        "Backend started but doesn't respond to health checks"
                    )

                # Kill the process
                process.terminate()
                process.wait(timeout=5)

        except Exception as e:
            self.errors.append(f"Error testing backend startup: {e}")

    def check_frontend_startup(self):
        """Check if frontend can start."""
        print("🌐 Testing frontend startup...")

        frontend_dir = self.project_root / "frontend"
        if not frontend_dir.exists():
            self.errors.append("Frontend directory not found")
            return

        # This is harder to test without actually starting it
        # For now, just check if the build command exists
        package_json = frontend_dir / "package.json"
        if package_json.exists():
            try:
                import json

                with open(package_json) as f:
                    package_data = json.load(f)

                if "scripts" in package_data:
                    if "dev" in package_data["scripts"]:
                        print("✅ Found frontend dev script")
                    else:
                        self.errors.append("Frontend package.json missing 'dev' script")
                else:
                    self.errors.append("Frontend package.json missing scripts section")
            except Exception as e:
                self.errors.append(f"Error reading frontend package.json: {e}")

    def run_all_checks(self):
        """Run all startup health checks."""
        print("🏥 STARTUP HEALTH CHECK")
        print("=" * 50)
        print("SYSTEM PRINCIPLE: If it doesn't work, it should fail immediately.")
        print("No silent failures, no disabled features.")
        print("=" * 50)

        # Run all checks
        self.check_python_dependencies()
        self.check_dawdreamer_dependency()
        self.check_frontend_dependencies()
        self.check_configuration_files()
        self.check_ports_available()
        self.check_backend_startup()
        self.check_frontend_startup()

        print("\n📊 STARTUP HEALTH SUMMARY")
        print("=" * 50)

        if self.errors:
            print(f"❌ {len(self.errors)} CRITICAL STARTUP ISSUES FOUND:")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")

            print("\n🚨 SYSTEM IS NOT READY TO START")
            print("   Fix the issues above before starting any services.")
            print("   Services will NOT start until these issues are resolved.")
            return False
        else:
            print("✅ ALL STARTUP CHECKS PASSED")
            print("   System is ready to start.")
            print("   All components should work as expected.")
            return True


if __name__ == "__main__":
    project_root = Path(__file__).parent.parent
    checker = StartupHealthCheck(str(project_root))

    if not checker.run_all_checks():
        sys.exit(1)

    print("\n🎉 SYSTEM IS READY!")
    print("   You can now start the services.")
    sys.exit(0)
