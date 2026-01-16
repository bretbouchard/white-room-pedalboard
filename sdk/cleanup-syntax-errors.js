#!/usr/bin/env node

/**
 * SDK Syntax Error Cleanup Script
 *
 * Fixes malformed const declarations introduced by automated linting fixes:
 * - Removes invalid const declarations in function parameters
 * - Removes invalid const declarations in method calls
 * - Removes invalid const declarations in interface definitions
 * - Removes standalone invalid const declarations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting SDK syntax error cleanup...\n');

// Get all TypeScript files
function getAllTSFiles() {
  const output = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { encoding: 'utf8' }
  );
  return output.split('\n').filter(f => f.trim());
}

// Cleanup patterns for malformed const declarations
const cleanupPatterns = [
  // Pattern 1: const declarations in function parameters
  {
    name: 'Function parameter const declarations',
    pattern: /,\s*const\s+_\w+\s*=\s*[^,;)]+;?\s*(?=,|\))/g,
    replacement: '',
  },

  // Pattern 2: const declarations at start of parameter list
  {
    name: 'Leading parameter const declarations',
    pattern: /\(\s*const\s+_\w+\s*=\s*[^,;)]+;?\s*,/g,
    replacement: '(',
  },

  // Pattern 3: const declarations in method call arguments
  {
    name: 'Method call const declarations',
    pattern: /,\s*const\s+_\w+\s*=\s*[^,;)]+;?\s*(?=,|\))/g,
    replacement: '',
  },

  // Pattern 4: standalone const declarations in wrong contexts (interfaces, etc)
  {
    name: 'Interface const declarations',
    pattern: /^\s*const\s+_\w+\s*=\s*[^;]+;\s*$/gm,
    replacement: '',
  },

  // Pattern 5: const declarations before method calls
  {
    name: 'Pre-method call const declarations',
    pattern: /const\s+_\w+\s*=\s*[^;]+;\s*(?=\w+\()/g,
    replacement: '',
  },

  // Pattern 6: const declarations in object literals
  {
    name: 'Object literal const declarations',
    pattern: /,\s*const\s+_\w+\s*=\s*[^,}]+;?\s*(?=,|})/g,
    replacement: '',
  },

  // Pattern 7: Fix malformed import statements
  {
    name: 'Malformed import statements',
    pattern: /import\s*{\s*,\s*(\w+)/g,
    replacement: 'import { $1',
  },

  // Pattern 8: Fix trailing commas in imports
  {
    name: 'Import trailing commas',
    pattern: /import\s*{\s*([^}]*),\s*,\s*([^}]*)\s*}/g,
    replacement: 'import { $1, $2 }',
  },

  // Pattern 9: Fix object destructuring with leading dots
  {
    name: 'Object destructuring dots',
    pattern: /{\s*\._(\w+)/g,
    replacement: '{ $1',
  },

  // Pattern 10: Fix spread syntax with dots
  {
    name: 'Spread syntax dots',
    pattern: /\.\.\._(\w+)/g,
    replacement: '...$1',
  },

  // Pattern 11: Fix undefined variables that should be defined
  {
    name: 'Undefined _now variables',
    pattern: /(\s+)([^=\s]+:\s*)?_now(?=\s*[,;)\]}])/g,
    replacement: '$1$2Date.now()',
  },

  // Pattern 12: Fix undefined _total variables
  {
    name: 'Undefined _total variables',
    pattern: /(\s+)([^=\s]+:\s*)?_total(?=\s*[,;)\]}])/g,
    replacement: '$1$20',
  },

  // Pattern 13: Fix undefined _sessionId variables
  {
    name: 'Undefined _sessionId variables',
    pattern: /(\s+)([^=\s]+:\s*)?_sessionId(?=\s*[,;)\]}])/g,
    replacement: '$1$2sessionId',
  },

  // Pattern 14: Fix undefined _age variables
  {
    name: 'Undefined _age variables',
    pattern: /(\s+)([^=\s]+:\s*)?_age(?=\s*[,;)\]}])/g,
    replacement: '$1$2age',
  },

  // Pattern 15: Fix undefined _key variables
  {
    name: 'Undefined _key variables',
    pattern: /(\s+)([^=\s]+:\s*)?_key(?=\s*[,;)\]}])/g,
    replacement: '$1$2key',
  },
];

// Additional specific fixes for common malformed patterns
const specificFixes = [
  // Fix method signatures with const in parameters
  {
    name: 'Method signature parameter fixes',
    pattern: /(\w+\s*\([^)]*),\s*const\s+_\w+\s*=\s*[^,)]+;?\s*([^)]*\))/g,
    replacement: '$1$2',
  },

  // Fix return statements with const
  {
    name: 'Return statement const fixes',
    pattern: /return\s+const\s+_\w+\s*=\s*[^;]+;/g,
    replacement: 'return;',
  },

  // Fix variable references that need proper declarations
  {
    name: 'Fix missing variable declarations',
    pattern: /(\s+)(if\s*\([^)]*_now[^)]*\)|_now\s*[><=!]+|[><=!]+\s*_now)/g,
    replacement: function (match, indent, condition) {
      return (
        indent +
        'const _now = Date.now();\n' +
        indent +
        condition.replace(/_now/g, '_now')
      );
    },
  },

  // Fix calculations with undefined variables
  {
    name: 'Fix calculation variable declarations',
    pattern: /(\s+)(.*[=+\-*/]\s*_total|_total\s*[=+\-*/].*)/g,
    replacement: function (match, indent, calc) {
      if (calc.includes('_total') && !calc.includes('const _total')) {
        return indent + 'const _total = 0;\n' + indent + calc;
      }
      return match;
    },
  },
];

function cleanupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { changed: false, errors: [] };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let changeCount = 0;
  const errors = [];

  try {
    // Apply cleanup patterns
    for (const pattern of cleanupPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        content = content.replace(pattern.pattern, pattern.replacement);
        changeCount += matches.length;
        console.log(`  ✅ ${pattern.name}: ${matches.length} fixes`);
      }
    }

    // Apply specific fixes
    for (const fix of specificFixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        changeCount += matches.length;
        console.log(`  ✅ ${fix.name}: ${matches.length} fixes`);
      }
    }

    // Clean up multiple empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Clean up trailing whitespace
    content = content.replace(/[ \t]+$/gm, '');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      return { changed: true, changeCount, errors };
    }
  } catch (error) {
    errors.push(`Error processing ${filePath}: ${error.message}`);
  }

  return { changed: content !== originalContent, changeCount, errors };
}

// Main execution
function main() {
  const files = getAllTSFiles();
  let totalFiles = 0;
  let changedFiles = 0;
  let totalChanges = 0;
  const allErrors = [];

  console.log(`📁 Found ${files.length} TypeScript files to process\n`);

  for (const file of files) {
    if (!file.trim()) continue;

    totalFiles++;
    console.log(`🔧 Processing: ${file}`);

    const result = cleanupFile(file);

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
      console.log(`  ❌ Errors: ${result.errors.length}`);
    }

    if (result.changed) {
      changedFiles++;
      totalChanges += result.changeCount || 0;
      console.log(`  ✨ Fixed ${result.changeCount || 'unknown'} issues`);
    } else {
      console.log(`  ✅ No changes needed`);
    }

    console.log('');
  }

  // Summary
  console.log('🎉 Cleanup Summary:');
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`🔧 Files changed: ${changedFiles}`);
  console.log(`✨ Total fixes applied: ${totalChanges}`);

  if (allErrors.length > 0) {
    console.log(`❌ Errors encountered: ${allErrors.length}`);
    allErrors.forEach(error => console.log(`   ${error}`));
  }

  console.log('\n🚀 Cleanup complete! Try building the SDK now.');
}

if (require.main === module) {
  main();
}

module.exports = { cleanupFile, cleanupPatterns, specificFixes };
