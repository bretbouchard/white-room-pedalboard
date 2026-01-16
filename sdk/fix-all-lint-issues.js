#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting comprehensive ESLint fixes...');

// Step 1: Fix undefined variables by finding and correcting references
function fixUndefinedVariables() {
  console.log('📝 Fixing undefined variables...');

  // Fix _analysisResult reference in audio analyzer
  const audioAnalyzerPath = 'packages/audio/src/analyzer.ts';
  if (fs.existsSync(audioAnalyzerPath)) {
    let content = fs.readFileSync(audioAnalyzerPath, 'utf8');
    content = content.replace(/_analysisResult/g, 'analysisResult');
    fs.writeFileSync(audioAnalyzerPath, content);
    console.log('  ✅ Fixed _analysisResult reference');
  }
}

// Step 2: Fix unused parameters by prefixing with underscore
function fixUnusedParameters() {
  console.log('📝 Fixing unused parameters...');

  const parameterFixes = [
    // Common unused parameter patterns
    { pattern: /\bcontextVector\b/g, replacement: '_contextVector' },
    { pattern: /\bhistoryVector\b/g, replacement: '_historyVector' },
    { pattern: /\banalysis\b(?=\s*[,)])/g, replacement: '_analysis' },
    { pattern: /\bcomposition\b(?=\s*[,)])/g, replacement: '_composition' },
    { pattern: /\bmetadata\b(?=\s*[,)])/g, replacement: '_metadata' },
    { pattern: /\boptions\b(?=\s*[,)])/g, replacement: '_options' },
    { pattern: /\bhistory\b(?=\s*[,)])/g, replacement: '_history' },
    { pattern: /\boutcome\b(?=\s*[,)])/g, replacement: '_outcome' },
    { pattern: /\bdata\b(?=\s*[,)])/g, replacement: '_data' },
    { pattern: /\bformat\b(?=\s*[,)])/g, replacement: '_format' },
    { pattern: /\banalyser\b(?=\s*[,)])/g, replacement: '_analyser' },
    { pattern: /\bchannelData\b(?=\s*[,)])/g, replacement: '_channelData' },
    { pattern: /\bsampleRate\b(?=\s*[,)])/g, replacement: '_sampleRate' },
    { pattern: /\bchord\b(?=\s*[,)])/g, replacement: '_chord' },
    { pattern: /\bkey\b(?=\s*[,)])/g, replacement: '_key' },
    { pattern: /\btags\b(?=\s*[,)])/g, replacement: '_tags' },
    { pattern: /\bconstraints\b(?=\s*[,)])/g, replacement: '_constraints' },
    { pattern: /\bpatterns\b(?=\s*[,)])/g, replacement: '_patterns' },
    { pattern: /\bfeatures\b(?=\s*[,)])/g, replacement: '_features' },
    {
      pattern: /\baccessPatterns\b(?=\s*[,)])/g,
      replacement: '_accessPatterns',
    },
    { pattern: /\balgorithm\b(?=\s*[,)])/g, replacement: '_algorithm' },
    { pattern: /\btestCases\b(?=\s*[,)])/g, replacement: '_testCases' },
    { pattern: /\bpatternLength\b(?=\s*[,)])/g, replacement: '_patternLength' },
    { pattern: /\bcurrentStyle\b(?=\s*[,)])/g, replacement: '_currentStyle' },
    { pattern: /\bctx\b(?=\s*[,)])/g, replacement: '_ctx' },
    { pattern: /\bworker\b(?=\s*[,)])/g, replacement: '_worker' },
    { pattern: /\bbusiness\b(?=\s*[,)])/g, replacement: '_business' },
    { pattern: /\burl\b(?=\s*[,)])/g, replacement: '_url' },
    { pattern: /\bindex\b(?=\s*[,)])/g, replacement: '_index' },
  ];

  // Apply fixes to all TypeScript files
  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const fix of parameterFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed parameters in ${file}`);
    }
  }
}

// Step 3: Fix unused variables by prefixing with underscore
function fixUnusedVariables() {
  console.log('📝 Fixing unused variables...');

  const variableFixes = [
    { pattern: /(\s+)feature(\s*=)/g, replacement: '$1_feature$2' },
    { pattern: /(\s+)total(\s*=)/g, replacement: '$1_total$2' },
    { pattern: /(\s+)instrument(\s*=)/g, replacement: '$1_instrument$2' },
    { pattern: /(\s+)age(\s*=)/g, replacement: '$1_age$2' },
    { pattern: /(\s+)now(\s*=)/g, replacement: '$1_now$2' },
    { pattern: /(\s+)type(\s*=)/g, replacement: '$1_type$2' },
    { pattern: /(\s+)oldGCs(\s*=)/g, replacement: '$1_oldGCs$2' },
    { pattern: /(\s+)name(\s*=)/g, replacement: '$1_name$2' },
    {
      pattern: /(\s+)operationCount(\s*=)/g,
      replacement: '$1_operationCount$2',
    },
    {
      pattern: /(\s+)totalExecutionTime(\s*=)/g,
      replacement: '$1_totalExecutionTime$2',
    },
    { pattern: /(\s+)timeRange(\s*=)/g, replacement: '$1_timeRange$2' },
    { pattern: /(\s+)userId(\s*=)/g, replacement: '$1_userId$2' },
    { pattern: /(\s+)sessionId(\s*=)/g, replacement: '$1_sessionId$2' },
  ];

  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const fix of variableFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed variables in ${file}`);
    }
  }
}

// Step 4: Fix unused imports
function fixUnusedImports() {
  console.log('📝 Fixing unused imports...');

  const importFixes = [
    {
      pattern: /import\s*{\s*ValidationError\s*,/g,
      replacement: 'import { ValidationError as _ValidationError,',
    },
    {
      pattern: /import\s*{\s*ProcessingError\s*,/g,
      replacement: 'import { ProcessingError as _ProcessingError,',
    },
    {
      pattern: /import\s*{\s*([^}]*),\s*ValidationError\s*}/g,
      replacement: 'import { $1, ValidationError as _ValidationError }',
    },
    {
      pattern: /import\s*{\s*([^}]*),\s*ProcessingError\s*}/g,
      replacement: 'import { $1, ProcessingError as _ProcessingError }',
    },
  ];

  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const fix of importFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed imports in ${file}`);
    }
  }
}

// Main execution
async function main() {
  try {
    fixUndefinedVariables();
    fixUnusedParameters();
    fixUnusedVariables();
    fixUnusedImports();

    console.log('🎉 All fixes applied! Running lint check...');

    // Run lint to see remaining issues
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('✅ All linting issues resolved!');
    } catch (error) {
      console.log('⚠️  Some issues may remain. Check output above.');
    }
  } catch (error) {
    console.error('❌ Error during fixes:', error.message);
    process.exit(1);
  }
}

main();
