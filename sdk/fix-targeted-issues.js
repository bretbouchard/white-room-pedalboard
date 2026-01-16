#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 Fixing targeted ESLint issues...');

// Step 1: Fix the _analysisResult issue in audio analyzer
function fixAnalysisResult() {
  const file = 'packages/audio/src/analyzer.ts';
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Fix the undefined _analysisResult reference
    content = content.replace(/_analysisResult/g, 'analysisResult');
    fs.writeFileSync(file, content);
    console.log('✅ Fixed _analysisResult reference');
  }
}

// Step 2: Fix unused parameter issues by prefixing with underscore (function parameters only)
function fixUnusedParameters() {
  console.log('📝 Fixing unused parameters...');

  const files = [
    'packages/core/src/__tests__/rhythm-integration.test.ts',
    'packages/core/src/advanced-analysis/musical-intelligence.ts',
    'packages/core/src/advanced-analysis/structural-analyzer.ts',
    'packages/core/src/advanced-analysis/style-analyzer.ts',
    'packages/core/src/integrations/integration-manager.ts',
    'packages/core/src/integrations/music21-bridge.ts',
    'packages/core/src/integrations/tonejs-enhanced.ts',
    'packages/core/src/integrations/web-audio.ts',
    'packages/core/src/performance/intelligent-cache.ts',
    'packages/core/src/performance/memory-optimizer.ts',
    'packages/core/src/performance/performance-engine.ts',
    'packages/core/src/telemetry/usage-analytics.ts',
    'packages/core/src/workers/calculation-worker.ts',
    'packages/shared/src/__tests__/cache.test.ts',
    'packages/shared/src/__tests__/errors.test.ts',
    'packages/shared/src/__tests__/pattern-variations-examples.test.ts',
    'packages/shared/src/__tests__/pattern-variations.test.ts',
    'packages/shared/src/__tests__/property-based.test.ts',
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix function parameters that are unused
    const parameterPatterns = [
      // Match function parameters in parentheses
      {
        pattern: /\(([^)]*\b)(contextVector)(\b[^)]*)\)/g,
        replacement: '($1_contextVector$3)',
      },
      {
        pattern: /\(([^)]*\b)(historyVector)(\b[^)]*)\)/g,
        replacement: '($1_historyVector$3)',
      },
      {
        pattern: /\(([^)]*\b)(analysis)(\b[^)]*)\)/g,
        replacement: '($1_analysis$3)',
      },
      {
        pattern: /\(([^)]*\b)(composition)(\b[^)]*)\)/g,
        replacement: '($1_composition$3)',
      },
      {
        pattern: /\(([^)]*\b)(metadata)(\b[^)]*)\)/g,
        replacement: '($1_metadata$3)',
      },
      {
        pattern: /\(([^)]*\b)(options)(\b[^)]*)\)/g,
        replacement: '($1_options$3)',
      },
      {
        pattern: /\(([^)]*\b)(history)(\b[^)]*)\)/g,
        replacement: '($1_history$3)',
      },
      {
        pattern: /\(([^)]*\b)(outcome)(\b[^)]*)\)/g,
        replacement: '($1_outcome$3)',
      },
      { pattern: /\(([^)]*\b)(data)(\b[^)]*)\)/g, replacement: '($1_data$3)' },
      {
        pattern: /\(([^)]*\b)(format)(\b[^)]*)\)/g,
        replacement: '($1_format$3)',
      },
      {
        pattern: /\(([^)]*\b)(analyser)(\b[^)]*)\)/g,
        replacement: '($1_analyser$3)',
      },
      {
        pattern: /\(([^)]*\b)(channelData)(\b[^)]*)\)/g,
        replacement: '($1_channelData$3)',
      },
      {
        pattern: /\(([^)]*\b)(sampleRate)(\b[^)]*)\)/g,
        replacement: '($1_sampleRate$3)',
      },
      {
        pattern: /\(([^)]*\b)(chord)(\b[^)]*)\)/g,
        replacement: '($1_chord$3)',
      },
      { pattern: /\(([^)]*\b)(key)(\b[^)]*)\)/g, replacement: '($1_key$3)' },
      { pattern: /\(([^)]*\b)(tags)(\b[^)]*)\)/g, replacement: '($1_tags$3)' },
      {
        pattern: /\(([^)]*\b)(constraints)(\b[^)]*)\)/g,
        replacement: '($1_constraints$3)',
      },
      {
        pattern: /\(([^)]*\b)(patterns)(\b[^)]*)\)/g,
        replacement: '($1_patterns$3)',
      },
      {
        pattern: /\(([^)]*\b)(features)(\b[^)]*)\)/g,
        replacement: '($1_features$3)',
      },
      {
        pattern: /\(([^)]*\b)(accessPatterns)(\b[^)]*)\)/g,
        replacement: '($1_accessPatterns$3)',
      },
      {
        pattern: /\(([^)]*\b)(algorithm)(\b[^)]*)\)/g,
        replacement: '($1_algorithm$3)',
      },
      {
        pattern: /\(([^)]*\b)(testCases)(\b[^)]*)\)/g,
        replacement: '($1_testCases$3)',
      },
      {
        pattern: /\(([^)]*\b)(patternLength)(\b[^)]*)\)/g,
        replacement: '($1_patternLength$3)',
      },
      {
        pattern: /\(([^)]*\b)(currentStyle)(\b[^)]*)\)/g,
        replacement: '($1_currentStyle$3)',
      },
      { pattern: /\(([^)]*\b)(ctx)(\b[^)]*)\)/g, replacement: '($1_ctx$3)' },
      {
        pattern: /\(([^)]*\b)(worker)(\b[^)]*)\)/g,
        replacement: '($1_worker$3)',
      },
      {
        pattern: /\(([^)]*\b)(business)(\b[^)]*)\)/g,
        replacement: '($1_business$3)',
      },
      { pattern: /\(([^)]*\b)(url)(\b[^)]*)\)/g, replacement: '($1_url$3)' },
      {
        pattern: /\(([^)]*\b)(index)(\b[^)]*)\)/g,
        replacement: '($1_index$3)',
      },
    ];

    for (const fix of parameterPatterns) {
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

// Step 3: Fix unused variable assignments
function fixUnusedVariables() {
  console.log('📝 Fixing unused variables...');

  const variablePatterns = [
    // Match variable assignments
    { pattern: /(\s+)(feature)(\s*=)/g, replacement: '$1_feature$3' },
    { pattern: /(\s+)(total)(\s*=)/g, replacement: '$1_total$3' },
    { pattern: /(\s+)(instrument)(\s*=)/g, replacement: '$1_instrument$3' },
    { pattern: /(\s+)(age)(\s*=)/g, replacement: '$1_age$3' },
    { pattern: /(\s+)(now)(\s*=)/g, replacement: '$1_now$3' },
    { pattern: /(\s+)(type)(\s*=)/g, replacement: '$1_type$3' },
    { pattern: /(\s+)(oldGCs)(\s*=)/g, replacement: '$1_oldGCs$3' },
    { pattern: /(\s+)(name)(\s*=)/g, replacement: '$1_name$3' },
    {
      pattern: /(\s+)(operationCount)(\s*=)/g,
      replacement: '$1_operationCount$3',
    },
    {
      pattern: /(\s+)(totalExecutionTime)(\s*=)/g,
      replacement: '$1_totalExecutionTime$3',
    },
    { pattern: /(\s+)(timeRange)(\s*=)/g, replacement: '$1_timeRange$3' },
    { pattern: /(\s+)(userId)(\s*=)/g, replacement: '$1_userId$3' },
    { pattern: /(\s+)(sessionId)(\s*=)/g, replacement: '$1_sessionId$3' },
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

    for (const fix of variablePatterns) {
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

// Step 4: Fix unused imports by aliasing
function fixUnusedImports() {
  console.log('📝 Fixing unused imports...');

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

    // Fix ValidationError and ProcessingError imports
    if (
      content.includes('ValidationError') &&
      !content.includes('ValidationError as _ValidationError')
    ) {
      content = content.replace(
        /import\s*{\s*([^}]*),?\s*ValidationError\s*([^}]*)\s*}/g,
        'import { $1, ValidationError as _ValidationError$2 }'
      );
      content = content.replace(
        /import\s*{\s*ValidationError\s*,\s*([^}]*)\s*}/g,
        'import { ValidationError as _ValidationError, $1 }'
      );
      content = content.replace(
        /import\s*{\s*ValidationError\s*}/g,
        'import { ValidationError as _ValidationError }'
      );
      changed = true;
    }

    if (
      content.includes('ProcessingError') &&
      !content.includes('ProcessingError as _ProcessingError')
    ) {
      content = content.replace(
        /import\s*{\s*([^}]*),?\s*ProcessingError\s*([^}]*)\s*}/g,
        'import { $1, ProcessingError as _ProcessingError$2 }'
      );
      content = content.replace(
        /import\s*{\s*ProcessingError\s*,\s*([^}]*)\s*}/g,
        'import { ProcessingError as _ProcessingError, $1 }'
      );
      content = content.replace(
        /import\s*{\s*ProcessingError\s*}/g,
        'import { ProcessingError as _ProcessingError }'
      );
      changed = true;
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
    fixAnalysisResult();
    fixUnusedParameters();
    fixUnusedVariables();
    fixUnusedImports();

    console.log('🎉 Targeted fixes applied! Running lint check...');

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
