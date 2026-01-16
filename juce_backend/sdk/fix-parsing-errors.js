#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing parsing errors in import statements...');

// Get all files with parsing errors
const files = [
  'packages/admin/src/analytics.ts',
  'packages/admin/src/configuration.ts',
  'packages/admin/src/system-monitoring.ts',
  'packages/admin/src/user-management.ts',
  'packages/core/src/__tests__/composition.test.ts',
  'packages/core/src/__tests__/rhythm.test.ts',
  'packages/gateway/src/middleware.ts',
  'packages/gateway/src/validation.ts',
  'packages/shared/src/__tests__/errors.test.ts',
  'packages/shared/src/math/generators.ts',
  'packages/shared/src/math/harmonic-progressions.ts',
  'packages/shared/src/math/melodic-contours.ts',
  'packages/shared/src/math/pattern-variations.ts',
  'packages/shared/src/math/rhythmic-resultants.ts',
  'packages/shared/src/math/validation.ts',
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix malformed import statements
  const fixes = [
    // Fix double commas in imports
    {
      pattern: /import\s*{\s*([^}]*),\s*,\s*([^}]*)\s*}/g,
      replacement: 'import { $1, $2 }',
    },
    // Fix trailing commas before closing brace
    {
      pattern: /import\s*{\s*([^}]*),\s*}\s*from/g,
      replacement: 'import { $1 } from',
    },
    // Fix leading commas
    { pattern: /import\s*{\s*,\s*([^}]*)\s*}/g, replacement: 'import { $1 }' },
    // Fix empty import sections
    { pattern: /import\s*{\s*,\s*}/g, replacement: 'import { }' },
    // Fix spaces around commas in imports
    {
      pattern: /import\s*{\s*([^}]*)\s*,\s*([^}]*)\s*}/g,
      replacement: 'import { $1, $2 }',
    },
  ];

  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  // Additional specific fixes for common patterns
  content = content.replace(
    /ValidationError as _ValidationError as _ValidationError/g,
    'ValidationError as _ValidationError'
  );
  content = content.replace(
    /ProcessingError as _ProcessingError as _ProcessingError/g,
    'ProcessingError as _ProcessingError'
  );

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed parsing errors in ${file}`);
  }
}

console.log('🎉 Parsing errors fixed! Running lint check...');

// Run lint to see remaining issues
try {
  const result = execSync('npm run lint 2>&1 | tail -3', { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.log('⚠️  Some issues may remain.');
}
