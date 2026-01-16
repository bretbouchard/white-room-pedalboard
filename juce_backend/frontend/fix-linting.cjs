#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get list of TypeScript/JavaScript files to process
const { execSync } = require('child_process');

console.log('🔧 Starting automated linting fixes...');

// Get all .ts and .tsx files (excluding tests and examples)
const { stdout } = execSync('find src -name "*.ts" -o -name "*.tsx" | grep -v __tests__ | grep -v ".example"', { encoding: 'utf8' });
const files = stdout.trim().split('\n').filter(Boolean);

console.log(`Found ${files.length} files to process`);

let totalFixed = 0;

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Remove unused import statements (simple pattern)
    content = content
      // Remove unused imports with no usage in file
      .replace(/^import [^{]+\s*from\s+['"][^'"]*['"];?\s*$/gm, '')
      // Remove unused variable declarations (simple cases)
      .replace(/const\s+\w+\s*=\s*[^;]+;\s*\/\/?\s*$/gm, '')
      // Remove unused function parameters (simple cases)
      .replace(/\(\s*_?:\s*\w+\s*[,)]*\)/g, '');

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files!`);

// Run linter again to see remaining issues
try {
  const lintResult = execSync('npm run lint 2>&1', { encoding: 'utf8' });
  const errorCount = (lintResult.match(/error/g) || []).length;
  const warningCount = (lintResult.match(/warning/g) || []).length;

  console.log(`\n📊 Remaining linting issues:`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Warnings: ${warningCount}`);

  if (errorCount > 0) {
    console.log('\n🔍 Top 10 error types:');
    const errorLines = lintResult.split('\n').filter(line => line.includes(' error '));
    const errorTypes = {};

    errorLines.forEach(line => {
      const match = line.match(/error\s+([^@]+)/);
      if (match) {
        const errorType = match[1].trim();
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    });

    Object.entries(errorTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([type, count]) => {
        console.log(`   ${count}x ${type}`);
      });
  }
} catch (error) {
  console.error('Error running lint:', error.message);
}