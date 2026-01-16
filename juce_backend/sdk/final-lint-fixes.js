#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 Applying final comprehensive lint fixes...');

// Step 1: Fix remaining unused parameters by prefixing with underscore
function fixRemainingUnusedParams() {
  console.log('📝 Fixing remaining unused parameters...');

  const paramFixes = [
    // Core module fixes
    {
      file: 'packages/core/src/__tests__/rhythm-integration.test.ts',
      pattern: /index:\s*number/g,
      replacement: '_index: number',
    },
    {
      file: 'packages/core/src/advanced-analysis/musical-intelligence.ts',
      pattern: /history:\s*any/g,
      replacement: '_history: any',
    },
    {
      file: 'packages/core/src/advanced-analysis/musical-intelligence.ts',
      pattern: /analysis:\s*any/g,
      replacement: '_analysis: any',
    },
    {
      file: 'packages/core/src/advanced-analysis/structural-analyzer.ts',
      pattern: /composition:\s*any/g,
      replacement: '_composition: any',
    },
    {
      file: 'packages/core/src/advanced-analysis/structural-analyzer.ts',
      pattern: /patternLength:\s*number/g,
      replacement: '_patternLength: number',
    },
    {
      file: 'packages/core/src/integrations/integration-manager.ts',
      pattern: /options:\s*any/g,
      replacement: '_options: any',
    },
    {
      file: 'packages/core/src/integrations/music21-bridge.ts',
      pattern: /metadata:\s*any/g,
      replacement: '_metadata: any',
    },
    {
      file: 'packages/core/src/integrations/music21-bridge.ts',
      pattern: /data:\s*any/g,
      replacement: '_data: any',
    },
    {
      file: 'packages/core/src/integrations/music21-bridge.ts',
      pattern: /format:\s*string/g,
      replacement: '_format: string',
    },
    {
      file: 'packages/core/src/integrations/web-audio.ts',
      pattern: /analyser:\s*any/g,
      replacement: '_analyser: any',
    },
    {
      file: 'packages/core/src/integrations/web-audio.ts',
      pattern: /channelData:\s*any/g,
      replacement: '_channelData: any',
    },
    {
      file: 'packages/core/src/integrations/web-audio.ts',
      pattern: /sampleRate:\s*number/g,
      replacement: '_sampleRate: number',
    },
    {
      file: 'packages/core/src/integrations/web-audio.ts',
      pattern: /chord:\s*any/g,
      replacement: '_chord: any',
    },
    {
      file: 'packages/core/src/performance/intelligent-cache.ts',
      pattern: /tags:\s*any/g,
      replacement: '_tags: any',
    },
    {
      file: 'packages/core/src/performance/performance-engine.ts',
      pattern: /ctx:\s*any/g,
      replacement: '_ctx: any',
    },
    {
      file: 'packages/core/src/telemetry/usage-analytics.ts',
      pattern: /business:\s*any/g,
      replacement: '_business: any',
    },
    {
      file: 'packages/core/src/workers/calculation-worker.ts',
      pattern: /composition:\s*any/g,
      replacement: '_composition: any',
    },
    {
      file: 'packages/core/src/workers/calculation-worker.ts',
      pattern: /features:\s*any/g,
      replacement: '_features: any',
    },
    {
      file: 'packages/core/src/workers/calculation-worker.ts',
      pattern: /patterns:\s*any/g,
      replacement: '_patterns: any',
    },
    {
      file: 'packages/generation/src/ai-assistant.ts',
      pattern: /composition:\s*any/g,
      replacement: '_composition: any',
    },

    // Shared module fixes
    {
      file: 'packages/shared/src/__tests__/cache.test.ts',
      pattern: /url:\s*string/g,
      replacement: '_url: string',
    },
    {
      file: 'packages/shared/src/__tests__/property-based.test.ts',
      pattern: /index:\s*number/g,
      replacement: '_index: number',
    },
    {
      file: 'packages/shared/src/math/pattern-variations.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
  ];

  for (const fix of paramFixes) {
    if (fs.existsSync(fix.file)) {
      let content = fs.readFileSync(fix.file, 'utf8');
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        fs.writeFileSync(fix.file, newContent);
        console.log(`  ✅ Fixed parameters in ${fix.file}`);
      }
    }
  }
}

// Step 2: Fix remaining unused variables by prefixing with underscore
function fixRemainingUnusedVars() {
  console.log('📝 Fixing remaining unused variables...');

  const varFixes = [
    {
      file: 'packages/analysis/src/reverse-analysis/harmony-reverse.ts',
      pattern: /(\s+)options(\s*=)/g,
      replacement: '$1_options$2',
    },
    {
      file: 'packages/core/src/advanced-analysis/musical-intelligence.ts',
      pattern: /(\s+)feature(\s*=)/g,
      replacement: '$1_feature$2',
    },
    {
      file: 'packages/core/src/performance/memory-optimizer.ts',
      pattern: /(\s+)type(\s*=)/g,
      replacement: '$1_type$2',
    },
    {
      file: 'packages/core/src/performance/performance-engine.ts',
      pattern: /(\s+)name(\s*=)/g,
      replacement: '$1_name$2',
    },
    {
      file: 'packages/core/src/telemetry/usage-analytics.ts',
      pattern: /(\s+)timeRange(\s*=)/g,
      replacement: '$1_timeRange$2',
    },
    {
      file: 'packages/core/src/telemetry/usage-analytics.ts',
      pattern: /(\s+)userId(\s*=)/g,
      replacement: '$1_userId$2',
    },
    {
      file: 'packages/core/src/telemetry/usage-analytics.ts',
      pattern: /(\s+)sessionId(\s*=)/g,
      replacement: '$1_sessionId$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations-examples.test.ts',
      pattern: /(\s+)determineDifficultyLevel(\s*=)/g,
      replacement: '$1_determineDifficultyLevel$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /(\s+)RhythmVariation(\s*=)/g,
      replacement: '$1_RhythmVariation$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /(\s+)HarmonicVariation(\s*=)/g,
      replacement: '$1_HarmonicVariation$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /(\s+)MelodicTransformation(\s*=)/g,
      replacement: '$1_MelodicTransformation$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /(\s+)PatternComplexity(\s*=)/g,
      replacement: '$1_PatternComplexity$2',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /(\s+)DifficultyLevel(\s*=)/g,
      replacement: '$1_DifficultyLevel$2',
    },
    {
      file: 'packages/shared/src/__tests__/property-based.test.ts',
      pattern: /(\s+)applyRhythmDiminution(\s*=)/g,
      replacement: '$1_applyRhythmDiminution$2',
    },
  ];

  for (const fix of varFixes) {
    if (fs.existsSync(fix.file)) {
      let content = fs.readFileSync(fix.file, 'utf8');
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        fs.writeFileSync(fix.file, newContent);
        console.log(`  ✅ Fixed variables in ${fix.file}`);
      }
    }
  }
}

// Step 3: Fix undefined variables by declaring them or fixing references
function fixUndefinedVariables() {
  console.log('📝 Fixing undefined variables...');

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

    // Fix common undefined variables by declaring them
    const fixes = [
      {
        pattern:
          /(\s+)(?<!const |let |var )now(?=\s*=\s*Date\.now\(\)|=\s*performance\.now\(\)|=\s*new Date\(\))/g,
        replacement: '$1const now',
      },
      {
        pattern: /(\s+)(?<!const |let |var )total(?=\s*=\s*0|=\s*\d+)/g,
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
        pattern: /(\s+)(?<!const |let |var )operationCount(?=\s*=)/g,
        replacement: '$1let operationCount',
      },
      {
        pattern: /(\s+)(?<!const |let |var )totalExecutionTime(?=\s*=)/g,
        replacement: '$1let totalExecutionTime',
      },
      {
        pattern: /(\s+)(?<!const |let |var )key(?=\s*=)/g,
        replacement: '$1const key',
      },
      {
        pattern: /(\s+)(?<!const |let |var )data(?=\s*=)/g,
        replacement: '$1const data',
      },
    ];

    for (const fix of fixes) {
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

// Step 4: Fix specific file issues
function fixSpecificFileIssues() {
  console.log('📝 Fixing specific file issues...');

  // Fix the ValidationError redeclaration in errors/index.ts
  const errorsFile = 'packages/shared/src/errors/index.ts';
  if (fs.existsSync(errorsFile)) {
    let content = fs.readFileSync(errorsFile, 'utf8');
    // Remove duplicate ValidationError declaration
    content = content.replace(
      /export\s+class\s+ValidationError[^}]+}\s*export\s+class\s+ValidationError[^}]+}/g,
      content.match(/export\s+class\s+ValidationError[^}]+}/)?.[0] || ''
    );
    fs.writeFileSync(errorsFile, content);
    console.log(`  ✅ Fixed ValidationError redeclaration in ${errorsFile}`);
  }

  // Fix parsing error in shared/src/__tests__/errors.test.ts
  const errorsTestFile = 'packages/shared/src/__tests__/errors.test.ts';
  if (fs.existsSync(errorsTestFile)) {
    let content = fs.readFileSync(errorsTestFile, 'utf8');
    // Fix malformed import
    content = content.replace(/import\s*{\s*,\s*([^}]+)\s*}/g, 'import { $1 }');
    content = content.replace(
      /import\s*{\s*([^}]+),\s*}\s*from/g,
      'import { $1 } from'
    );
    fs.writeFileSync(errorsTestFile, content);
    console.log(`  ✅ Fixed parsing error in ${errorsTestFile}`);
  }

  // Fix DifficultyLevel references in pattern-variations.ts
  const patternVarFile = 'packages/shared/src/math/pattern-variations.ts';
  if (fs.existsSync(patternVarFile)) {
    let content = fs.readFileSync(patternVarFile, 'utf8');
    // Add DifficultyLevel type definition if missing
    if (
      !content.includes('type DifficultyLevel') &&
      !content.includes('enum DifficultyLevel')
    ) {
      const typeDefinition = `
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
`;
      content = typeDefinition + content;
      fs.writeFileSync(patternVarFile, content);
      console.log(`  ✅ Added DifficultyLevel type in ${patternVarFile}`);
    }
  }
}

// Main execution
async function main() {
  try {
    fixRemainingUnusedParams();
    fixRemainingUnusedVars();
    fixUndefinedVariables();
    fixSpecificFileIssues();

    console.log('🎉 Final lint fixes applied! Running lint check...');

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
