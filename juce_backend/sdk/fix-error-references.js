#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing ValidationError and ProcessingError references...');

function fixErrorReferences() {
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

    // Check if file has aliased imports
    const hasValidationErrorAlias = content.includes(
      'ValidationError as _ValidationError'
    );
    const hasProcessingErrorAlias = content.includes(
      'ProcessingError as _ProcessingError'
    );

    if (hasValidationErrorAlias) {
      // Replace all ValidationError references with _ValidationError
      const newContent = content.replace(
        /\bValidationError\b(?!\s+as)/g,
        '_ValidationError'
      );
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    if (hasProcessingErrorAlias) {
      // Replace all ProcessingError references with _ProcessingError
      const newContent = content.replace(
        /\bProcessingError\b(?!\s+as)/g,
        '_ProcessingError'
      );
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    // If file doesn't have aliases but uses these errors, we need to import them properly
    if (
      !hasValidationErrorAlias &&
      content.includes('ValidationError') &&
      !content.includes('import')
    ) {
      // This file needs ValidationError imported
      const importLine =
        "import { ValidationError } from '@schillinger-sdk/shared';\n";
      content = importLine + content;
      changed = true;
    }

    if (
      !hasProcessingErrorAlias &&
      content.includes('ProcessingError') &&
      !content.includes('import')
    ) {
      // This file needs ProcessingError imported
      const importLine =
        "import { ProcessingError } from '@schillinger-sdk/shared';\n";
      content = importLine + content;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ Fixed error references in ${file}`);
    }
  }
}

// Fix specific files that have issues with unused parameters
function fixUnusedParameters() {
  console.log('📝 Fixing remaining unused parameters...');

  const parameterFixes = [
    // Fix function parameters that are unused
    {
      file: 'packages/core/src/realtime/index.ts',
      pattern: /data:\s*any/g,
      replacement: '_data: any',
    },
    {
      file: 'packages/core/src/telemetry/logfire-engine.ts',
      pattern: /data:\s*any/g,
      replacement: '_data: any',
    },
    {
      file: 'packages/core/src/integrations/music21-bridge.ts',
      pattern: /stream:\s*any/g,
      replacement: '_stream: any',
    },
    {
      file: 'packages/shared/src/cache/cache-utils.ts',
      pattern: /data:\s*any/g,
      replacement: '_data: any',
    },
    {
      file: 'packages/shared/src/cache/in-memory-storage-adapter.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/auth/credential-storage.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/auth/credential-storage.ts',
      pattern: /data:\s*any/g,
      replacement: '_data: any',
    },
    {
      file: 'packages/shared/src/auth/permission-manager.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/auth/auth-manager.ts',
      pattern: /options:\s*any/g,
      replacement: '_options: any',
    },
    {
      file: 'packages/shared/src/cache/memory-cache.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/cache/memory-cache.ts',
      pattern: /metadata:\s*any/g,
      replacement: '_metadata: any',
    },
    {
      file: 'packages/shared/src/cache/network-cache.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/cache/network-cache.ts',
      pattern: /metadata:\s*any/g,
      replacement: '_metadata: any',
    },
    {
      file: 'packages/shared/src/cache/persistent-cache.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/cache/persistent-cache.ts',
      pattern: /metadata:\s*any/g,
      replacement: '_metadata: any',
    },
    {
      file: 'packages/shared/src/cache/cache-manager.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/shared/src/cache/cache-manager.ts',
      pattern: /metadata:\s*any/g,
      replacement: '_metadata: any',
    },
    {
      file: 'packages/core/src/integrations/integration-manager.ts',
      pattern: /key:\s*string/g,
      replacement: '_key: string',
    },
    {
      file: 'packages/analysis/src/reverse-analysis/harmony-reverse.ts',
      pattern: /chord:\s*any/g,
      replacement: '_chord: any',
    },
    {
      file: 'packages/shared/src/__tests__/pattern-variations.test.ts',
      pattern: /index:\s*number/g,
      replacement: '_index: number',
    },
    {
      file: 'packages/shared/src/__tests__/property-based.test.ts',
      pattern: /index:\s*number/g,
      replacement: '_index: number',
    },
    {
      file: 'packages/admin/src/user-management.ts',
      pattern: /options:\s*any/g,
      replacement: '_options: any',
    },
  ];

  for (const fix of parameterFixes) {
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

// Main execution
async function main() {
  try {
    fixErrorReferences();
    fixUnusedParameters();

    console.log('🎉 Error reference fixes applied! Running lint check...');

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
