#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files and their unused variables to fix
const fixes = [
  // Core files
  {
    file: 'packages/core/src/advanced-analysis/musical-intelligence.ts',
    fixes: [
      { line: 8, old: 'ValidationError', new: '_ValidationError' },
      { line: 425, old: 'contextVector', new: '_contextVector' },
      { line: 425, old: 'historyVector', new: '_historyVector' },
      { line: 467, old: 'contextVector', new: '_contextVector' },
      { line: 467, old: 'historyVector', new: '_historyVector' },
      { line: 509, old: 'contextVector', new: '_contextVector' },
      { line: 509, old: 'historyVector', new: '_historyVector' },
      { line: 561, old: 'history', new: '_history' },
      { line: 606, old: 'analysis', new: '_analysis' },
      { line: 624, old: 'analysis', new: '_analysis' },
      { line: 649, old: 'analysis', new: '_analysis' },
      { line: 673, old: 'analysis', new: '_analysis' },
      { line: 709, old: 'outcome', new: '_outcome' },
      { line: 984, old: 'feature', new: '_feature' },
    ],
  },
  {
    file: 'packages/core/src/advanced-analysis/structural-analyzer.ts',
    fixes: [
      { line: 8, old: 'ValidationError', new: '_ValidationError' },
      { line: 454, old: 'composition', new: '_composition' },
      { line: 456, old: 'total', new: '_total' },
      { line: 523, old: 'composition', new: '_composition' },
      { line: 1092, old: 'patternLength', new: '_patternLength' },
    ],
  },
  {
    file: 'packages/core/src/advanced-analysis/style-analyzer.ts',
    fixes: [{ line: 856, old: 'currentStyle', new: '_currentStyle' }],
  },
];

function fixFile(filePath, fileFixes) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let lines = content.split('\n');

  // Sort fixes by line number in descending order to avoid line number shifts
  fileFixes.sort((a, b) => b.line - a.line);

  for (const fix of fileFixes) {
    if (fix.line <= lines.length) {
      lines[fix.line - 1] = lines[fix.line - 1].replace(
        new RegExp(`\\b${fix.old}\\b`, 'g'),
        fix.new
      );
    }
  }

  fs.writeFileSync(fullPath, lines.join('\n'));
  console.log(`Fixed ${fileFixes.length} issues in ${filePath}`);
}

// Apply all fixes
for (const fileConfig of fixes) {
  fixFile(fileConfig.file, fileConfig.fixes);
}

console.log('All unused variable fixes applied!');
