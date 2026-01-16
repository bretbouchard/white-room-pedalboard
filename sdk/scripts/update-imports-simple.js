#!/usr/bin/env node

/**
 * Simple Import Path Migration Script
 *
 * Updates all TypeScript import statements to use the new package structure.
 * Uses only Node.js built-ins (no external dependencies).
 */

const fs = require('fs');
const path = require('path');

// Import mappings
const importMappings = {
  '@schillinger-sdk/shared/ir': '@schillinger-sdk/core/ir',
};

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: [],
};

/**
 * Recursively find all TypeScript files
 */
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

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
      // Pattern to match from clause in imports
      const escapedOld = oldImport.replace(/\//g, '\\/');
      const regex = new RegExp(
        `from\\s+['"](${escapedOld})(/[^'"]*)?['"]`,
        'g'
      );

      const matches = content.match(regex);
      if (matches) {
        fileUpdates += matches.length;
        content = content.replace(regex, `from '${newImport}$2'`);
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
function main() {
  console.log('🔄 Starting import path migration...\n');

  // Find all TypeScript files in core and packages directories
  let files = [];
  const directories = ['core', 'packages'];

  directories.forEach((dir) => {
    if (fs.existsSync(dir)) {
      files = files.concat(findTsFiles(dir));
    }
  });

  console.log(`📂 Found ${files.length} TypeScript files\n`);

  // Process each file
  files.forEach((file) => {
    updateFileImports(file);
  });

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

main();
