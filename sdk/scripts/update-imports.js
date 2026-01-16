#!/usr/bin/env node

/**
 * Import Path Migration Script
 *
 * Updates all TypeScript import statements to use the new package structure.
 *
 * Changes:
 * - @schillinger-sdk/shared/ir → @schillinger-sdk/core/ir
 * - @schillinger-sdk/core → @schillinger-sdk/core (unchanged)
 * - Relative imports within packages
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Import mappings
const importMappings = {
  '@schillinger-sdk/shared/ir': '@schillinger-sdk/core/ir',
  '@schillinger-sdk/shared': '@schillinger-sdk/core', // For now, map to core
};

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: [],
};

/**
 * Update imports in a single file
 */
function updateFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileUpdates = 0;

    // Check each import mapping
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      // Pattern to match import statements
      const regex = new RegExp(
        `(import\\s+(?:{[^}]*}|\\*\\s+as\\s+\\w+|\\w+)\\s+from\\s+['"]${oldImport.replace('/', '/')}(?:/[^'"]*)?['"])`,
        'g'
      );

      const matches = content.match(regex);
      if (matches) {
        fileUpdates += matches.length;
        content = content.replace(
          new RegExp(`from ['"]${oldImport.replace('/', '/')}(/[^'"]*)?['"]`, 'g'),
          `from '${newImport}$1'`
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
      stats.importsUpdated += fileUpdates;
      console.log(`✓ Updated ${filePath}: ${fileUpdates} imports`);
    }

    stats.filesScanned++;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ Error processing ${filePath}: ${error.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Starting import path migration...\n');

  // Find all TypeScript files
  const patterns = [
    'core/**/*.ts',
    'packages/**/*.ts',
    'tests/**/*.ts',
  ];

  const files = [];
  for (const pattern of patterns) {
    const matched = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });
    files.push(...matched);
  }

  console.log(`📂 Found ${files.length} TypeScript files\n`);

  // Process each file
  for (const file of files) {
    updateFileImports(file);
  }

  // Print statistics
  console.log('\n📊 Migration Statistics:');
  console.log(`   Files scanned: ${stats.filesScanned}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Imports updated: ${stats.importsUpdated}`);
  console.log(`   Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ Import migration complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
