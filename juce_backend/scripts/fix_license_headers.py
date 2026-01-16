#!/usr/bin/env python3
"""
License Header Fixer Script

This script fixes malformed license headers in Python files.

License: MIT
"""

import re
from pathlib import Path


def fix_license_header(content: str) -> str:
    """Fix malformed license headers."""

    # Pattern to match standalone "License: MIT" lines
    pattern = r"^License: MIT\s*$"

    # Replace with properly formatted docstring
    if re.search(pattern, content, re.MULTILINE):
        # Find the line and replace it
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if line.strip() == "License: MIT":
                # Check if we're inside a docstring
                in_docstring = False
                for j in range(i):
                    if '"""' in lines[j] or "'''" in lines[j]:
                        in_docstring = not in_docstring

                if not in_docstring:
                    # Replace with proper docstring
                    lines[i] = '"""'
                    lines.insert(i + 1, "MIT Licensed Module")
                    lines.insert(i + 2, "")
                    lines.insert(i + 3, "License: MIT")
                    lines.insert(i + 4, '"""')
                    lines.insert(i + 5, "")
                    break

        content = "\n".join(lines)

    return content


def fix_file(file_path: Path) -> bool:
    """Fix license headers in a single file."""
    try:
        with open(file_path, encoding="utf-8") as f:
            original_content = f.read()

        # Apply fixes
        content = fix_license_header(original_content)

        # Only write if content changed
        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            return False

    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False


def main():
    """Main function."""
    # Find files with malformed license headers
    import subprocess

    try:
        result = subprocess.run(
            ["grep", "-r", "^License: MIT", "src/", "--include=*.py", "-l"],
            capture_output=True,
            text=True,
            cwd=Path.cwd(),
        )

        if result.returncode == 0:
            files = result.stdout.strip().split("\n")
            files = [Path(f) for f in files if f]

            print(f"🔧 Fixing {len(files)} files with malformed license headers...")

            fixed_count = 0
            for file_path in files:
                if fix_file(file_path):
                    fixed_count += 1

            print(f"🎉 Fixed {fixed_count} files")
        else:
            print("✅ No malformed license headers found")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
