#!/bin/bash
# Workaround for npm workspace:* protocol issue
# Temporarily replaces workspace:* with file: references

set -e

echo "🔧 npm workspace:* protocol workaround"
echo "======================================"

# Backup directory
BACKUP_DIR=".backup_package_jsons"
mkdir -p "$BACKUP_DIR"

# Find all package.json files with workspace: references
echo "📦 Backing up package.json files..."
find packages -name "package.json" -type f | while read -r file; do
  backup_path="$BACKUP_DIR/$(echo "$file" | sed 's|/|_|g')"
  cp "$file" "$backup_path"
done

# Replace workspace:* with file: references
echo "🔄 Replacing workspace:* with file: references..."
find packages -name "package.json" -type f -exec sed -i.bak 's|"workspace:\*"|"file:../\*"|g' {} \;

# Install dependencies
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps "$@"

# Restore original package.json files
echo "📤 Restoring original package.json files..."
find packages -name "package.json.bak" -type f -delete

# Restore from backups
for backup in "$BACKUP_DIR"/*; do
  original=$(echo "$backup" | sed "s|$BACKUP_DIR/||" | sed 's|_|/|g')
  cp "$backup" "$original"
done

# Clean up
rm -rf "$BACKUP_DIR"

echo "✅ Installation complete!"
