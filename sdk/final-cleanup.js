#!/usr/bin/env node

/**
 * Final SDK Cleanup Script
 *
 * Fixes remaining specific issues:
 * - Variable name consistency (_key vs key)
 * - Duplicate variable declarations
 * - Missing variable definitions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Final SDK cleanup...\n');

// Get all TypeScript files in shared package (where most errors are)
function getSharedTSFiles() {
  const output = execSync(
    'find packages/shared/src -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { encoding: 'utf8' }
  );
  return output.split('\n').filter(f => f.trim());
}

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { changed: false, fixes: [] };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const fixes = [];

  // Fix 1: Comprehensive variable naming and type consistency
  if (filePath.includes('cache/')) {
    const cacheSpecificFixes = [
      // Fix return type mismatches - change _key back to key in return objects
      {
        pattern: /\.map\(\(\[key, entry\]\) => \(\{ _key,/g,
        replacement: '.map(([key, entry]) => ({ key,',
      },

      // Fix emit calls to use correct parameter name
      {
        pattern: /level: '(memory|network|persistent)', _key,/g,
        replacement: "level: '$1', key,",
      },

      // Fix localStorage calls
      { pattern: /this\.prefix \+ _key/g, replacement: 'this.prefix + key' },

      // Fix object destructuring and assignment
      {
        pattern: /return \{ _key, value \}/g,
        replacement: 'return { key, value }',
      },
      {
        pattern: /results\.set\(key, value\)/g,
        replacement: 'results.set(_key, value)',
      },
      {
        pattern: /entries\.push\(\{ _key: _key, entry \}\)/g,
        replacement: 'entries.push({ _key: key, entry })',
      },

      // Fix shorthand properties in objects
      { pattern: /parameters: \{ _key,/g, replacement: 'parameters: { key,' },
      {
        pattern: /generateHarmonicProgression\(a, b, \{ _key,/g,
        replacement: 'generateHarmonicProgression(a, b, { key,',
      },
    ];

    for (const fix of cacheSpecificFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        fixes.push(`Cache-specific fix: ${fix.pattern}`);
      }
    }
  }

  // Fix auth-specific issues
  if (filePath.includes('auth/')) {
    const authFixes = [
      // Fix _sessionId reference issues
      {
        pattern: /const sessionId = _sessionId \|\| "";/g,
        replacement: 'const sessionId = sessionId || "";',
      },
      { pattern: /const sessionId = sessionId \|\| "";/g, replacement: '' }, // Remove redundant declaration
    ];

    for (const fix of authFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        fixes.push(`Auth-specific fix: ${fix.pattern}`);
      }
    }
  }

  // Fix 2: Remove duplicate const declarations
  const lines = content.split('\n');
  const seenDeclarations = new Set();
  const filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*const\s+(_\w+)\s*=\s*([^;]+);?\s*$/);

    if (match) {
      const [, varName, value] = match;
      const key = `${varName}=${value}`;

      // Skip duplicate declarations in same scope
      if (seenDeclarations.has(key)) {
        fixes.push(`Removed duplicate: ${line.trim()}`);
        continue;
      }
      seenDeclarations.add(key);
    }

    filteredLines.push(line);
  }

  content = filteredLines.join('\n');

  // Fix 3: Add missing variable declarations and fix specific issues
  const specificFixes = [
    // Fix cache-manager issues
    {
      pattern: /this\.emit\('set', 'all', _key, \{ ttl \}\)/g,
      replacement: "this.emit('set', 'all', key, { ttl })",
    },
    {
      pattern: /const _age = Date\.now\(\) - entry\.timestamp;/g,
      replacement: 'const _age = Date.now() - entry.timestamp;',
    },

    // Fix admin-middleware sessionId issue
    {
      pattern:
        /const sessionId = _sessionId \|\| "";[\s\S]*?metadata: \{ sessionId: sessionId,/g,
      replacement: match => {
        // Remove the problematic const declaration and use a parameter directly
        return match
          .replace(/const sessionId = _sessionId \|\| "";\s*/, '')
          .replace('sessionId: sessionId', 'sessionId: sessionId || ""');
      },
    },
  ];

  for (const fix of specificFixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      fixes.push(
        `Specific fix applied: ${fix.pattern.toString().substring(0, 50)}...`
      );
    }
  }

  // Add missing variables where needed
  const contentLines = content.split('\n');
  const newLines = [];

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];

    // Add missing entry variable for _age calculation
    if (
      line.includes('const _age = Date.now() - entry.timestamp') &&
      !content.includes('const entry =')
    ) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(
        `${indent}const entry = this.cache.get(key) || { timestamp: Date.now() };`
      );
      fixes.push('Added missing entry variable');
    }

    newLines.push(line);
  }

  content = newLines.join('\n');

  // Fix 4: Fix object destructuring issues
  content = content.replace(
    /for \(const \{ key, entry \} of entries\)/g,
    'for (const { _key, entry } of entries)'
  );
  content = content.replace(
    /await this\.storageAdapter\.set\(_key, entry\)/g,
    'await this.storageAdapter.set(_key, entry)'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return { changed: true, fixes };
  }

  return { changed: false, fixes: [] };
}

// Main execution
function main() {
  const files = getSharedTSFiles();
  let totalFiles = 0;
  let changedFiles = 0;
  let totalFixes = 0;

  console.log(`📁 Found ${files.length} shared package files to process\n`);

  for (const file of files) {
    if (!file.trim()) continue;

    totalFiles++;
    console.log(`🔧 Processing: ${file}`);

    const result = fixFile(file);

    if (result.changed) {
      changedFiles++;
      totalFixes += result.fixes.length;
      console.log(`  ✨ Applied ${result.fixes.length} fixes`);
      result.fixes.forEach(fix => console.log(`    - ${fix}`));
    } else {
      console.log(`  ✅ No changes needed`);
    }

    console.log('');
  }

  // Summary
  console.log('🎉 Final Cleanup Summary:');
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`🔧 Files changed: ${changedFiles}`);
  console.log(`✨ Total fixes applied: ${totalFixes}`);

  console.log('\n🚀 Final cleanup complete! Try building the SDK now.');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile };
