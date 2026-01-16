#!/usr/bin/env python3
"""
DAID Core Migration Script

This script helps migrate from the current backend/src/daid implementation
to the new consolidated daid-core package.
"""

import os
import re
import shutil
import sys
from pathlib import Path


class DAIDMigrationTool:
    """Tool to migrate from backend DAID implementation to daid-core package."""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_daid_path = self.project_root / "backend" / "src" / "daid"
        self.changes_made = []
        self.warnings = []

    def analyze_current_usage(self) -> dict[str, list[str]]:
        """Analyze current DAID usage in the project."""
        print("🔍 Analyzing current DAID usage...")

        usage = {
            "imports": [],
            "client_usage": [],
            "model_usage": [],
            "middleware_usage": [],
            "service_usage": [],
        }

        # Find all Python files that import from backend.src.daid
        for py_file in self.project_root.rglob("*.py"):
            if "backend/src/daid" in str(py_file):
                continue  # Skip the DAID implementation itself

            try:
                content = py_file.read_text()

                # Check for imports
                import_patterns = [
                    r"from backend\.src\.daid",
                    r"from \.\.daid",
                    r"import.*backend\.src\.daid",
                ]

                for pattern in import_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        usage["imports"].append(str(py_file))

                # Check for specific usage patterns
                if "DAIDClient" in content:
                    usage["client_usage"].append(str(py_file))
                if "DAIDRecord" in content or "EntityType" in content:
                    usage["model_usage"].append(str(py_file))
                if "DAIDTrackingMiddleware" in content:
                    usage["middleware_usage"].append(str(py_file))
                if "DAIDService" in content:
                    usage["service_usage"].append(str(py_file))

            except Exception as e:
                self.warnings.append(f"Could not analyze {py_file}: {e}")

        return usage

    def create_backup(self) -> str:
        """Create a backup of the current implementation."""
        print("💾 Creating backup...")

        backup_dir = self.project_root / "daid_migration_backup"
        if backup_dir.exists():
            shutil.rmtree(backup_dir)

        # Backup the backend DAID implementation
        if self.backend_daid_path.exists():
            shutil.copytree(self.backend_daid_path, backup_dir / "backend_daid")

        # Backup any files that import DAID
        usage = self.analyze_current_usage()
        all_files = set()
        for file_list in usage.values():
            all_files.update(file_list)

        for file_path in all_files:
            rel_path = Path(file_path).relative_to(self.project_root)
            backup_file = backup_dir / "importing_files" / rel_path
            backup_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, backup_file)

        print(f"✅ Backup created at: {backup_dir}")
        return str(backup_dir)

    def update_imports(self, file_path: Path) -> bool:
        """Update imports in a single file."""
        try:
            content = file_path.read_text()
            original_content = content

            # Import replacements
            replacements = [
                # Basic imports
                (
                    r"from backend\.src\.daid\.client import DAIDClient",
                    "from daid_core import DAIDClient",
                ),
                (
                    r"from backend\.src\.daid\.models import (.*)",
                    r"from daid_core import \1",
                ),
                (
                    r"from backend\.src\.daid\.service import DAIDService",
                    "from daid_core.integrations.fastapi import DAIDService",
                ),
                (
                    r"from backend\.src\.daid\.middleware import DAIDTrackingMiddleware",
                    "from daid_core.integrations.websocket import DAIDTrackingMiddleware",
                ),
                (
                    r"from backend\.src\.daid\.decorators import (.*)",
                    r"from daid_core.integrations.decorators import \1",
                ),
                (r"from backend\.src\.daid import (.*)", r"from daid_core import \1"),
                # Relative imports
                (
                    r"from \.\.daid\.client import DAIDClient",
                    "from daid_core import DAIDClient",
                ),
                (r"from \.\.daid\.models import (.*)", r"from daid_core import \1"),
                (
                    r"from \.\.daid\.service import DAIDService",
                    "from daid_core.integrations.fastapi import DAIDService",
                ),
                (
                    r"from \.\.daid\.middleware import DAIDTrackingMiddleware",
                    "from daid_core.integrations.websocket import DAIDTrackingMiddleware",
                ),
                (r"from \.\.daid import (.*)", r"from daid_core import \1"),
            ]

            for old_pattern, new_import in replacements:
                content = re.sub(old_pattern, new_import, content)

            # Update enum usage to strings
            enum_replacements = [
                (r"EntityType\.TRACK", '"track"'),
                (r"EntityType\.PLUGIN", '"plugin"'),
                (r"EntityType\.PARAMETER", '"parameter"'),
                (r"EntityType\.USER_ACTION", '"user_action"'),
                (r"EntityType\.COMPOSITION", '"composition"'),
                (r"EntityType\.ANALYSIS", '"analysis"'),
                (r"OperationType\.CREATE", '"create"'),
                (r"OperationType\.UPDATE", '"update"'),
                (r"OperationType\.DELETE", '"delete"'),
                (r"OperationType\.USER_INTERACTION", '"user_interaction"'),
                (r"OperationType\.AI_DECISION", '"ai_decision"'),
            ]

            for old_enum, new_string in enum_replacements:
                content = re.sub(old_enum, new_string, content)

            # Update client initialization patterns
            client_patterns = [
                (
                    r"DAIDClient\(\s*base_url=([^,)]+),\s*api_key=([^,)]+),\s*timeout=([^,)]+),\s*agent_id=([^,)]+)\s*\)",
                    r"DAIDClient(agent_id=\4, base_url=\1, api_key=\2, timeout=\3)",
                ),
                (
                    r"DAIDClient\(\s*base_url=([^,)]+),\s*agent_id=([^,)]+)\s*\)",
                    r"DAIDClient(agent_id=\2, base_url=\1)",
                ),
            ]

            for old_pattern, new_pattern in client_patterns:
                content = re.sub(old_pattern, new_pattern, content)

            if content != original_content:
                file_path.write_text(content)
                return True

        except Exception as e:
            self.warnings.append(f"Could not update {file_path}: {e}")

        return False

    def migrate_files(self) -> None:
        """Migrate all files that use DAID."""
        print("🔄 Migrating files...")

        usage = self.analyze_current_usage()
        all_files = set()
        for file_list in usage.values():
            all_files.update(file_list)

        for file_path_str in all_files:
            file_path = Path(file_path_str)
            if self.update_imports(file_path):
                self.changes_made.append(f"Updated imports in {file_path}")
                print(f"  ✅ Updated {file_path}")
            else:
                print(f"  ⏭️  No changes needed in {file_path}")

    def update_requirements(self) -> None:
        """Update requirements.txt files."""
        print("📦 Updating requirements...")

        req_files = list(self.project_root.rglob("requirements*.txt"))

        for req_file in req_files:
            try:
                content = req_file.read_text()

                # Add daid-core if not present
                if "daid-core" not in content:
                    content += "\ndaid-core>=1.0.0\n"
                    req_file.write_text(content)
                    self.changes_made.append(f"Added daid-core to {req_file}")
                    print(f"  ✅ Updated {req_file}")

            except Exception as e:
                self.warnings.append(f"Could not update {req_file}: {e}")

    def create_migration_summary(self, backup_dir: str) -> None:
        """Create a summary of the migration."""
        summary_file = self.project_root / "DAID_MIGRATION_SUMMARY.md"

        summary_content = f"""# DAID Migration Summary

## Migration completed on: {__import__("datetime").datetime.now().isoformat()}

## Backup Location
{backup_dir}

## Changes Made
"""

        for change in self.changes_made:
            summary_content += f"- {change}\n"

        if self.warnings:
            summary_content += "\n## Warnings\n"
            for warning in self.warnings:
                summary_content += f"- ⚠️ {warning}\n"

        summary_content += """
## Next Steps

1. **Install the new package:**
   ```bash
   pip install daid-core
   ```

2. **Test your application:**
   - Run your test suite
   - Check that DAID functionality works as expected
   - Verify WebSocket and API integrations

3. **Update configuration:**
   - Review environment variables (see INTEGRATION_GUIDE.md)
   - Update any hardcoded configuration

4. **Remove old implementation:**
   - After confirming everything works, you can remove `backend/src/daid/`
   - Clean up any unused imports

5. **Review new features:**
   - Check out the unified client API
   - Consider enabling health monitoring and auto-recovery
   - Explore new integration helpers

## Rollback Instructions

If you need to rollback:

1. Restore files from backup:
   ```bash
   cp -r {backup_dir}/importing_files/* ./
   cp -r {backup_dir}/backend_daid backend/src/daid/
   ```

2. Remove daid-core from requirements.txt

3. Reinstall old dependencies

## Support

- See INTEGRATION_GUIDE.md for detailed usage
- Check examples/ directory for integration patterns
- Review MIGRATION_GUIDE.md for API changes
"""

        summary_file.write_text(summary_content)
        print(f"📝 Migration summary created: {summary_file}")

    def run_migration(self) -> None:
        """Run the complete migration process."""
        print("🚀 Starting DAID Core migration...")
        print("=" * 50)

        # Check if we're in the right directory
        if not self.backend_daid_path.exists():
            print("❌ Error: backend/src/daid directory not found")
            print("Make sure you're running this from the project root")
            sys.exit(1)

        # Analyze current usage
        usage = self.analyze_current_usage()
        print(
            f"Found DAID usage in {sum(len(files) for files in usage.values())} files"
        )

        # Create backup
        backup_dir = self.create_backup()

        # Migrate files
        self.migrate_files()

        # Update requirements
        self.update_requirements()

        # Create summary
        self.create_migration_summary(backup_dir)

        print("\n" + "=" * 50)
        print("🎉 Migration completed!")
        print(f"📊 Changes made: {len(self.changes_made)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print("\nNext steps:")
        print("1. Install daid-core: pip install daid-core")
        print("2. Test your application")
        print("3. Review DAID_MIGRATION_SUMMARY.md")


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()

    print(f"Project root: {project_root}")

    migrator = DAIDMigrationTool(project_root)
    migrator.run_migration()


if __name__ == "__main__":
    main()
