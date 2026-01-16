#!/usr/bin/env node

/**
 * Update /core Imports Script
 *
 * Updates imports in /core directory to use relative paths for IR types
 * instead of @schillinger-sdk/shared.
 *
 * Strategy:
 * 1. IR types (PatternIR, InstrumentIR, etc.) → import from ./ir
 * 2. Utilities (ValidationUtils, etc.) → keep @schillinger-sdk/shared
 * 3. Other shared types → keep @schillinger-sdk/shared
 */

const fs = require('fs');
const path = require('path');

// IR type patterns that should be imported from ./ir
const irTypePatterns = [
  'PatternIR',
  'InstrumentIR',
  'ControlIR',
  'TimelineIR',
  'SongGraphIR',
  'SongPlacementIR',
  'SignalGraphIR',
  'ProcessIR',
  'StructuralIR',
  'MixIR',
  'SceneIR',
  'RoleIR',
  'ConstraintIR',
  'RealizationPolicyIR',
  'GraphInstanceIR',
  'ParameterBindingIR',
  'AutomationIR',
  'PerformanceContextIR',
  'VariationIntentIR',
  'NamespaceIR',
  'IntentIR',
  'HumanIntentIR',
  'GestureIR',
  'ExplainabilityIR',
];

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: [],
};

/**
 * Check if an import is for IR types
 */
function isIRImport(importStatement) {
  return irTypePatterns.some(pattern => importStatement.includes(pattern));
}

/**
 * Update imports in a single file
 */
function updateFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileUpdates = 0;

    // Split into lines
    const lines = content.split('\n');
    const updatedLines = lines.map(line => {
      // Match import statements from @schillinger-sdk/shared
      const importMatch = line.match(
        /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]@schillinger-sdk\/shared['"]/
      );

      if (importMatch) {
        // Check if this import contains IR types
        if (isIRImport(line)) {
          // Replace with relative import to ./ir
          const newLine = line.replace(
            /['"]@schillinger-sdk\/shared['"]/g,
            "'./ir'"
          );
          if (newLine !== line) {
            modified = true;
            fileUpdates++;
            return newLine;
          }
        }
      }

      return line;
    });

    if (modified) {
      content = updatedLines.join('\n');
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
 * Recursively find all TypeScript files in /core
 */
function findTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
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
 * Main execution
 */
function main() {
  console.log('🔄 Starting /core import updates...\n');

  // Find all TypeScript files in /core
  const coreDir = path.join(process.cwd(), 'core');

  if (!fs.existsSync(coreDir)) {
    console.error('❌ /core directory not found!');
    process.exit(1);
  }

  const files = findTsFiles(coreDir);
  console.log(`📂 Found ${files.length} TypeScript files in /core\n`);

  // Process each file
  files.forEach((file) => {
    updateFileImports(file);
  });

  // Print statistics
  console.log('\n📊 Update Statistics:');
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

  console.log('\n✅ Import updates complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run TypeScript compilation to check for errors');
  console.log('   2. Fix any remaining import issues');
  console.log('   3. Run test suite to verify');
}

main();
