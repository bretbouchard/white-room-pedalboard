#!/usr/bin/env python3
"""
GPL Import Fixer Script

This script automatically fixes common GPL import patterns in the codebase.

License: MIT
"""

import re
import sys
from pathlib import Path


def fix_dawdreamer_engine_imports(content: str) -> str:
    """Fix imports from dawdreamer_engine module."""

    # Replace specific imports
    replacements = [
        # Basic imports
        (r"from \.dawdreamer_engine import (.+)", r"from ..engine.client import \1"),
        (
            r"from \.\.core\.dawdreamer_engine import (.+)",
            r"from ..engine.client import \1",
        ),
        # Replace DawDreamerEngine with EngineClient
        (r"DawDreamerEngine", r"EngineClient"),
        # Fix relative imports in error handling
        (
            r"from \.dawdreamer_error_handling import (.+)",
            r"# GPL isolation: removed \1 import",
        ),
        (r"from \.dawdreamer_mock import (.+)", r"# GPL isolation: removed \1 import"),
    ]

    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)

    return content


def add_mit_license_header(content: str, filename: str) -> str:
    """Add MIT license header to file if missing."""

    if "License: MIT" in content or "MIT Licensed" in content:
        return content

    # Determine if this is a Python file
    if not filename.endswith(".py"):
        return content

    # Check if file already has a docstring
    if content.strip().startswith('"""') or content.strip().startswith("'''"):
        # Insert license info into existing docstring
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if line.strip().endswith('"""') or line.strip().endswith("'''"):
                # Insert license before closing docstring
                lines.insert(i, "")
                lines.insert(i + 1, "License: MIT")
                return "\n".join(lines)

    # Add new docstring with license
    header = '''"""
MIT Licensed Module

License: MIT
"""

'''

    return header + content


def fix_file(file_path: Path) -> bool:
    """Fix GPL imports in a single file."""
    try:
        with open(file_path, encoding="utf-8") as f:
            original_content = f.read()

        # Apply fixes
        content = fix_dawdreamer_engine_imports(original_content)
        content = add_mit_license_header(content, file_path.name)

        # Only write if content changed
        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            print(f"⏭️  No changes: {file_path}")
            return False

    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: fix_gpl_imports.py <directory>")
        sys.exit(1)

    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"Directory not found: {directory}")
        sys.exit(1)

    print(f"🔧 Fixing GPL imports in: {directory}")
    print("=" * 50)

    # Find Python files
    python_files = list(directory.rglob("*.py"))

    # Exclude engine_process directory (it's supposed to have GPL code)
    python_files = [f for f in python_files if "engine_process" not in str(f)]

    fixed_count = 0

    for file_path in python_files:
        if fix_file(file_path):
            fixed_count += 1

    print("=" * 50)
    print(f"🎉 Fixed {fixed_count} files out of {len(python_files)} total")


if __name__ == "__main__":
    main()
