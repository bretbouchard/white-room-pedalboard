#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing undefined variable references...');

// Step 1: Fix variables that were incorrectly prefixed with underscore
function fixIncorrectlyPrefixedVars() {
  console.log('📝 Fixing incorrectly prefixed variables...');

  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  const fixes = [
    // Variables that should NOT be prefixed (they are used)
    { pattern: /_analysisResult/g, replacement: 'analysisResult' },
    { pattern: /_history(?!\w)/g, replacement: 'history' },
    { pattern: /_composition(?!\w)/g, replacement: 'composition' },
    { pattern: /_analysis(?!\w)/g, replacement: 'analysis' },
    { pattern: /_features(?!\w)/g, replacement: 'features' },
    { pattern: /_patterns(?!\w)/g, replacement: 'patterns' },
    { pattern: /_data(?!\w)/g, replacement: 'data' },
    { pattern: /_options(?!\w)/g, replacement: 'options' },
    { pattern: /_key(?!\w)/g, replacement: 'key' },
    { pattern: /_chord(?!\w)/g, replacement: 'chord' },
    { pattern: /_analyser(?!\w)/g, replacement: 'analyser' },
    { pattern: /_channelData(?!\w)/g, replacement: 'channelData' },
    { pattern: /_sampleRate(?!\w)/g, replacement: 'sampleRate' },
    { pattern: /_patternLength(?!\w)/g, replacement: 'patternLength' },
    { pattern: /_tags(?!\w)/g, replacement: 'tags' },
    { pattern: /_metadata(?!\w)/g, replacement: 'metadata' },
    { pattern: /_format(?!\w)/g, replacement: 'format' },
    { pattern: /_url(?!\w)/g, replacement: 'url' },
    { pattern: /_index(?!\w)/g, replacement: 'index' },
    { pattern: /_ctx(?!\w)/g, replacement: 'ctx' },
    { pattern: /_business(?!\w)/g, replacement: 'business' },
    { pattern: /_feature(?!\w)/g, replacement: 'feature' },
    { pattern: /_type(?!\w)/g, replacement: 'type' },
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const fix of fixes) {
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

// Step 2: Fix specific undefined variables by declaring them or fixing references
function fixSpecificUndefinedVars() {
  console.log('📝 Fixing specific undefined variables...');

  // Fix common undefined variables
  const commonFixes = [
    // Variables that need to be declared
    {
      pattern: /(\s+)(?<!const |let |var )now(?=\s*=)/g,
      replacement: '$1const now',
    },
    {
      pattern: /(\s+)(?<!const |let |var )total(?=\s*=)/g,
      replacement: '$1let total',
    },
    {
      pattern: /(\s+)(?<!const |let |var )age(?=\s*=)/g,
      replacement: '$1const age',
    },
    {
      pattern: /(\s+)(?<!const |let |var )name(?=\s*=)/g,
      replacement: '$1const name',
    },
    {
      pattern: /(\s+)(?<!const |let |var )instrument(?=\s*=)/g,
      replacement: '$1const instrument',
    },
    {
      pattern: /(\s+)(?<!const |let |var )sessionId(?=\s*=)/g,
      replacement: '$1const sessionId',
    },
    {
      pattern: /(\s+)(?<!const |let |var )userId(?=\s*=)/g,
      replacement: '$1const userId',
    },
    {
      pattern: /(\s+)(?<!const |let |var )operationCount(?=\s*=)/g,
      replacement: '$1let operationCount',
    },
    {
      pattern: /(\s+)(?<!const |let |var )totalExecutionTime(?=\s*=)/g,
      replacement: '$1let totalExecutionTime',
    },
  ];

  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const fix of commonFixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed undefined vars in ${file}`);
    }
  }
}

// Step 3: Fix unused variables by prefixing with underscore (only for assignments)
function fixUnusedVariableAssignments() {
  console.log('📝 Fixing unused variable assignments...');

  const files = execSync(
    'find packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(f => f.trim());

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Only prefix variables that are assigned but never used
    const unusedVarPatterns = [
      {
        pattern: /(\s+)(determineDifficultyLevel)(\s*=)/g,
        replacement: '$1_determineDifficultyLevel$3',
      },
      {
        pattern: /(\s+)(RhythmVariation)(\s*=)/g,
        replacement: '$1_RhythmVariation$3',
      },
      {
        pattern: /(\s+)(HarmonicVariation)(\s*=)/g,
        replacement: '$1_HarmonicVariation$3',
      },
      {
        pattern: /(\s+)(MelodicTransformation)(\s*=)/g,
        replacement: '$1_MelodicTransformation$3',
      },
      {
        pattern: /(\s+)(PatternComplexity)(\s*=)/g,
        replacement: '$1_PatternComplexity$3',
      },
      {
        pattern: /(\s+)(DifficultyLevel)(\s*=)/g,
        replacement: '$1_DifficultyLevel$3',
      },
      {
        pattern: /(\s+)(applyRhythmDiminution)(\s*=)/g,
        replacement: '$1_applyRhythmDiminution$3',
      },
    ];

    for (const fix of unusedVarPatterns) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed unused assignments in ${file}`);
    }
  }
}

// Main execution
async function main() {
  try {
    fixIncorrectlyPrefixedVars();
    fixSpecificUndefinedVars();
    fixUnusedVariableAssignments();

    console.log('🎉 Undefined variable fixes applied! Running lint check...');

    // Run lint to see remaining issues
    try {
      const result = execSync('npm run lint 2>&1 | tail -3', {
        encoding: 'utf8',
      });
      console.log(result);
    } catch (error) {
      console.log('⚠️  Some issues may remain.');
    }
  } catch (error) {
    console.error('❌ Error during fixes:', error.message);
    process.exit(1);
  }
}

main();
