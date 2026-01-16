#!/usr/bin/env python3
"""
GPL Isolation Verification Script

This script verifies that the main application process does not contain
any GPL-licensed code imports, ensuring clean licensing boundaries.

License: MIT
"""

import ast
import os
import sys
from pathlib import Path


class GPLImportChecker(ast.NodeVisitor):
    """AST visitor to check for GPL imports."""

    def __init__(self):
        self.gpl_imports = []
        self.gpl_modules = {
            "dawdreamer",
            "dawdreamer.RenderEngine",
            "dawdreamer.Processor",
        }

    def visit_Import(self, node):
        """Check import statements."""
        for alias in node.names:
            if alias.name in self.gpl_modules or alias.name.startswith("dawdreamer."):
                self.gpl_imports.append(f"import {alias.name}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        """Check from...import statements."""
        if node.module and (
            node.module in self.gpl_modules or node.module.startswith("dawdreamer")
        ):
            names = [alias.name for alias in node.names]
            self.gpl_imports.append(f"from {node.module} import {', '.join(names)}")
        self.generic_visit(node)


def check_file_for_gpl_imports(file_path: Path) -> list[str]:
    """Check a Python file for GPL imports."""
    try:
        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        tree = ast.parse(content, filename=str(file_path))
        checker = GPLImportChecker()
        checker.visit(tree)

        return checker.gpl_imports
    except Exception as e:
        print(f"Warning: Could not parse {file_path}: {e}")
        return []


def find_python_files(directory: Path, exclude_dirs: set[str] = None) -> list[Path]:
    """Find all Python files in a directory, excluding specified directories."""
    if exclude_dirs is None:
        exclude_dirs = {"__pycache__", ".git", "venv", "node_modules", "engine_process"}

    python_files = []

    for root, dirs, files in os.walk(directory):
        # Remove excluded directories from dirs list to prevent traversal
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if file.endswith(".py"):
                python_files.append(Path(root) / file)

    return python_files


def verify_gpl_isolation() -> tuple[bool, list[tuple[Path, list[str]]]]:
    """
    Verify GPL isolation in the main application.

    Returns:
        Tuple of (is_clean, violations) where violations is a list of
        (file_path, gpl_imports) tuples.
    """
    # Get the project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Directories to check (main application only, exclude engine_process)
    check_dirs = [
        project_root / "src" / "audio_agent",
        project_root / "frontend" / "src",
        project_root / "backend" / "src",
    ]

    violations = []

    for check_dir in check_dirs:
        if not check_dir.exists():
            continue

        print(f"Checking directory: {check_dir}")
        python_files = find_python_files(check_dir)

        for file_path in python_files:
            gpl_imports = check_file_for_gpl_imports(file_path)
            if gpl_imports:
                violations.append((file_path, gpl_imports))

    return len(violations) == 0, violations


def check_license_headers() -> tuple[bool, list[Path]]:
    """Check that files have appropriate license headers."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Files that should have MIT license headers
    mit_dirs = [
        project_root / "src" / "audio_agent" / "engine",
        project_root / "src" / "audio_agent" / "api",
        project_root / "frontend" / "src",
    ]

    missing_headers = []

    for check_dir in mit_dirs:
        if not check_dir.exists():
            continue

        python_files = find_python_files(check_dir)

        for file_path in python_files:
            try:
                with open(file_path, encoding="utf-8") as f:
                    content = f.read(500)  # Check first 500 chars

                if "License: MIT" not in content and "MIT Licensed" not in content:
                    missing_headers.append(file_path)
            except Exception:
                pass

    return len(missing_headers) == 0, missing_headers


def main():
    """Main verification function."""
    print("🔍 Verifying GPL Isolation...")
    print("=" * 50)

    # Check for GPL imports
    is_clean, violations = verify_gpl_isolation()

    if is_clean:
        print("✅ No GPL imports found in main application")
    else:
        print("❌ GPL contamination detected!")
        for file_path, gpl_imports in violations:
            print(f"\n📁 {file_path}:")
            for import_stmt in gpl_imports:
                print(f"  🚨 {import_stmt}")

    print("\n" + "=" * 50)

    # Check license headers
    headers_clean, missing_headers = check_license_headers()

    if headers_clean:
        print("✅ All files have appropriate license headers")
    else:
        print("⚠️  Some files missing license headers:")
        for file_path in missing_headers:
            print(f"  📄 {file_path}")

    print("\n" + "=" * 50)

    # Overall result
    overall_clean = is_clean and headers_clean

    if overall_clean:
        print("🎉 GPL Isolation Verification PASSED!")
        print("   The main application is free of GPL contamination.")
        return 0
    else:
        print("💥 GPL Isolation Verification FAILED!")
        print("   Please fix the issues above before distribution.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
