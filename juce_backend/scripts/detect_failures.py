#!/usr/bin/env python3
"""
Failure Detection System - Scans codebase for hidden failures and broken dependencies.

PRINCIPLE: No mocks. If something doesn't work, it should fail fast and loudly.
This tool identifies patterns that indicate broken functionality.
"""

import ast
import importlib.util
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


class FailureDetector:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.issues = []
        self.failed_imports = set()
        self.mock_usage = set()
        self.disabled_features = set()

    def detect_mock_usage(self) -> dict[str, list[str]]:
        """Detect mock usage that masks real failures."""
        print("🔍 Detecting mock usage...")

        mock_patterns = [
            r"\bMock\(",
            r"\bMagicMock\(",
            r"\bAsyncMock\(",
            r"\bmock_",
            r"@mock\.patch\(",
            r"mock_.*=.*Mock\(",
            r"pytest\.mock",
            r"unittest\.mock",
        ]

        mock_files = {}

        for py_file in self.project_root.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue

            try:
                content = py_file.read_text()
                file_mocks = []

                for pattern in mock_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        file_mocks.extend(matches)

                if file_mocks:
                    mock_files[str(py_file)] = file_mocks

            except Exception as e:
                self.issues.append(f"Error reading {py_file}: {e}")

        return mock_files

    def detect_disabled_features(self) -> dict[str, list[str]]:
        """Detect disabled features and TODO comments."""
        print("🔍 Detecting disabled features...")

        disabled_patterns = [
            r"(?i)TODO.*implement",
            r"(?i)FIXME.*not.*working",
            r"(?i)disabled.*backend",
            r"(?i)not.*implemented",
            r"(?i)temporary.*disabled",
            r"(?i)placeholder.*code",
            r"(?i)stub.*function",
            r"(?i)#.*disable.*feature",
            r"(?i)raise.*NotImplementedError",
        ]

        disabled_files = {}

        for py_file in self.project_root.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue

            try:
                content = py_file.read_text()
                file_issues = []

                for pattern in disabled_patterns:
                    matches = re.findall(pattern, content, re.MULTILINE)
                    for match in matches:
                        # Get line number
                        lines = content.split("\n")
                        for i, line in enumerate(lines):
                            if re.search(pattern, line):
                                file_issues.append(f"Line {i+1}: {line.strip()}")

                if file_issues:
                    disabled_files[str(py_file)] = file_issues

            except Exception as e:
                self.issues.append(f"Error reading {py_file}: {e}")

        return disabled_files

    def test_imports(self) -> dict[str, list[str]]:
        """Test all imports to see if they actually work."""
        print("🔍 Testing imports...")

        failed_imports = {}

        for py_file in self.project_root.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue

            try:
                # Parse AST to find imports
                with open(py_file) as f:
                    content = f.read()

                try:
                    tree = ast.parse(content)
                except SyntaxError as e:
                    failed_imports[str(py_file)] = [f"Syntax error: {e}"]
                    continue

                imports = []
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)

                # Test each import
                for import_name in imports:
                    try:
                        if import_name.startswith("."):
                            # Relative import
                            continue
                        spec = importlib.util.find_spec(import_name)
                        if spec is None:
                            failed_imports.setdefault(str(py_file), []).append(
                                f"Cannot import: {import_name}"
                            )
                    except (ImportError, ModuleNotFoundError) as e:
                        failed_imports.setdefault(str(py_file), []).append(
                            f"Import failed: {import_name} - {e}"
                        )

            except Exception as e:
                failed_imports[str(py_file)] = [f"Error parsing {py_file}: {e}"]

        return failed_imports

    def check_frontend_backend_connection(self) -> dict[str, Any]:
        """Check if frontend is configured to connect to correct backend."""
        print("🔍 Checking frontend-backend connection...")

        connection_issues = []

        # Check frontend config files
        frontend_files = [
            "frontend/src/main.tsx",
            "frontend/src/App.tsx",
            "frontend/src/lib/daid/client.ts",
            "frontend/src/lib/audio-engine/AudioEngineStore.ts",
            "frontend/src/stores/flowStore.ts",
        ]

        for file_path in frontend_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                try:
                    content = full_path.read_text()

                    # Look for hardcoded backend URLs
                    backend_urls = re.findall(r"http://localhost[:\d]+", content)
                    for url in backend_urls:
                        port = url.split(":")[-1]
                        if port not in ["8000", "8081"]:
                            connection_issues.append(
                                f"{file_path}: Unusual backend port {port} in {url}"
                            )

                    # Look for fetch/API calls
                    fetch_patterns = re.findall(r'fetch\([\'"]([^\'"]+)[\'"]', content)
                    for url in fetch_patterns:
                        if "localhost" in url:
                            connection_issues.append(
                                f"{file_path}: Fetching from {url}"
                            )

                except Exception as e:
                    connection_issues.append(f"Error reading {file_path}: {e}")

        return {"connection_issues": connection_issues}

    def check_docker_and_environment(self) -> dict[str, Any]:
        """Check for Docker and environment issues."""
        print("🔍 Checking Docker and environment...")

        issues = []

        # Check for Docker files
        docker_files = ["Dockerfile", "docker-compose.yml", ".dockerignore"]

        for docker_file in docker_files:
            docker_path = self.project_root / docker_file
            if docker_path.exists():
                try:
                    content = docker_path.read_text()

                    # Check for common Docker issues
                    if (
                        "EXPOSE" in content
                        and "8000" not in content
                        and "8081" not in content
                    ):
                        issues.append(
                            f"{docker_file}: Exposed ports don't match backend/frontend"
                        )

                    if "ENV" in content and any(
                        port in content for port in ["PORT", "HOST"]
                    ):
                        # This is expected for Docker files
                        pass

                except Exception as e:
                    issues.append(f"Error reading {docker_file}: {e}")
            else:
                issues.append(f"Missing {docker_file}")

        # Check for environment files
        env_files = [".env", ".env.example", ".env.local"]
        for env_file in env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                try:
                    content = env_path.read_text()

                    # Check for undefined environment variables in code
                    env_vars = re.findall(
                        r'os\.environ\.get\([\'"]([^\'"]+)[\'"]', content
                    )

                except Exception as e:
                    issues.append(f"Error reading {env_file}: {e}")

        return {"docker_env_issues": issues}

    def check_database_and_dependencies(self) -> dict[str, Any]:
        """Check database connections and dependencies."""
        print("🔍 Checking database and dependencies...")

        issues = []

        # Check requirements.txt
        req_files = ["requirements.txt", "pyproject.toml", "package.json"]

        for req_file in req_files:
            req_path = self.project_root / req_file
            if req_path.exists():
                try:
                    if req_file == "package.json":
                        content = req_path.read_text()
                        # Check for missing dependencies in node_modules
                        if (
                            self.project_root / "node_modules"
                            not in self.project_root.iterdir()
                        ):
                            issues.append(
                                "package.json exists but node_modules missing"
                            )

                    elif req_file == "requirements.txt":
                        content = req_path.read_text()
                        # Check for DawDreamer specifically
                        if "dawdreamer" not in content.lower():
                            issues.append(
                                "DawDreamer not in requirements.txt but code expects it"
                            )

                except Exception as e:
                    issues.append(f"Error reading {req_file}: {e}")

        return {"dependency_issues": issues}

    def check_service_health(self) -> dict[str, Any]:
        """Check if services are actually running and healthy."""
        print("🔍 Checking service health...")

        health_issues = []

        # Check if ports are in use
        ports_to_check = [8000, 3001, 5432]  # backend, frontend, DB

        for port in ports_to_check:
            try:
                result = subprocess.run(
                    ["lsof", "-i", f":{port}"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    # Port is in use
                    pass
                else:
                    if port == 8000:
                        health_issues.append(f"Backend port {port} not in use")
                    elif port == 3001:
                        health_issues.append(f"Frontend port {port} not in use")
                    elif port == 5432:
                        health_issues.append(f"Database port {port} not in use")
            except subprocess.TimeoutExpired:
                health_issues.append(f"Port {port} check timed out")
            except Exception as e:
                health_issues.append(f"Error checking port {port}: {e}")

        return {"health_issues": health_issues}

    def run_all_checks(self) -> dict[str, Any]:
        """Run all failure detection checks."""
        print("🚨 FAILURE DETECTION SYSTEM")
        print("=" * 50)
        print("PRINCIPLE: No mocks. If it doesn't work, it should fail fast.")
        print("=" * 50)

        results = {
            "mock_usage": self.detect_mock_usage(),
            "disabled_features": self.detect_disabled_features(),
            "failed_imports": self.test_imports(),
            "connection_issues": self.check_frontend_backend_connection(),
            "docker_env_issues": self.check_docker_and_environment(),
            "dependency_issues": self.check_database_and_dependencies(),
            "health_issues": self.check_service_health(),
        }

        # Count total issues
        total_issues = (
            len(results["mock_usage"])
            + len(results["disabled_features"])
            + len(results["failed_imports"])
            + len(results["connection_issues"]["connection_issues"])
            + len(results["docker_env_issues"]["docker_env_issues"])
            + len(results["dependency_issues"]["dependency_issues"])
            + len(results["health_issues"]["health_issues"])
        )

        print("\n📊 FAILURE DETECTION SUMMARY")
        print("=" * 50)
        print(f"Total Issues Found: {total_issues}")

        if total_issues == 0:
            print("🎉 NO CRITICAL ISSUES FOUND!")
            print("   System appears to be properly configured.")
        else:
            print(f"🚨 {total_issues} CRITICAL ISSUES FOUND!")

            if results["mock_usage"]:
                print(f"\n📝 MOCK USAGE ({len(results['mock_usage'])} files):")
                for file_path, mocks in results["mock_usage"].items():
                    print(f"   {file_path}: {len(mocks)} mocks")

            if results["disabled_features"]:
                print(
                    f"\n⚠️  DISABLED FEATURES ({len(results['disabled_features'])} files):"
                )
                for file_path, issues in results["disabled_features"].items():
                    print(f"   {file_path}: {len(issues)} issues")

            if results["failed_imports"]:
                print(f"\n💥 FAILED IMPORTS ({len(results['failed_imports'])} files):")
                for file_path, imports in results["failed_imports"].items():
                    print(f"   {file_path}: {len(imports)} failed imports")

            if results["connection_issues"]["connection_issues"]:
                print(
                    f"\n🔌 CONNECTION ISSUES ({len(results['connection_issues']['connection_issues'])}):"
                )
                for issue in results["connection_issues"]["connection_issues"]:
                    print(f"   {issue}")

            if results["docker_env_issues"]["docker_env_issues"]:
                print(
                    f"\n🐳 DOCKER/ENV ISSUES ({len(results['docker_env_issues']['docker_env_issues'])}):"
                )
                for issue in results["docker_env_issues"]["docker_env_issues"]:
                    print(f"   {issue}")

            if results["dependency_issues"]["dependency_issues"]:
                print(
                    f"\n📦 DEPENDENCY ISSUES ({len(results['dependency_issues']['dependency_issues'])}):"
                )
                for issue in results["dependency_issues"]["dependency_issues"]:
                    print(f"   {issue}")

            if results["health_issues"]["health_issues"]:
                print(
                    f"\n💔 HEALTH ISSUES ({len(results['health_issues']['health_issues'])}):"
                )
                for issue in results["health_issues"]["health_issues"]:
                    print(f"   {issue}")

        print("\n🎯 RECOMMENDATION:")
        if total_issues > 0:
            print("❌ SYSTEM IS NOT PROPERLY CONFIGURED")
            print("   Fix the issues above before proceeding.")
            print("   No feature should be 'disabled' or 'not implemented'.")
            print("   If something doesn't work, it should fail immediately.")
        else:
            print("✅ SYSTEM IS PROPERLY CONFIGURED")
            print("   All components should work as expected.")

        return results


def create_pre_commit_hook():
    """Create a pre-commit hook that runs failure detection."""
    hook_content = """#!/bin/sh
# Pre-commit hook: Run failure detection
python scripts/detect_failures.py
if [ $? -ne 0 ]; then
    echo "❌ PRE-CHECK FAILED: Fix the issues before committing"
    exit 1
fi
"""

    hooks_dir = Path(".git/hooks")
    hooks_dir.mkdir(exist_ok=True)

    pre_commit_file = hooks_dir / "pre-commit"
    with open(pre_commit_file, "w") as f:
        f.write(hook_content)

    os.chmod(pre_commit_file, 0o755)
    print("🔧 Created pre-commit hook for failure detection")


if __name__ == "__main__":
    project_root = Path(__file__).parent
    detector = FailureDetector(project_root)
    results = detector.run_all_checks()

    # Exit with error code if critical issues found
    total_issues = (
        len(results["failed_imports"])
        + len(results["health_issues"]["health_issues"])
        + len(results["connection_issues"]["connection_issues"])
    )

    if total_issues > 0:
        print(f"\n💥 EXITING WITH ERROR: {total_issues} critical issues found")
        sys.exit(1)

    print("\n✅ All critical checks passed")
    sys.exit(0)
