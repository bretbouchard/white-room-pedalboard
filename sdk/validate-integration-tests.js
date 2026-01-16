#!/usr/bin/env node

/**
 * Integration Test Validation Script
 * Validates that integration tests are properly structured and can be executed
 */

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'tests', 'integration');
const requiredFiles = [
  'setup.ts',
  'api-integration.test.ts',
  'auth-integration.test.ts',
  'websocket.test.ts',
  'cross-platform.test.ts',
  'environment.test.ts',
  'vitest.config.ts',
  '.env.test',
];

console.log('🔍 Validating integration test structure...\n');

let allValid = true;

// Check if test directory exists
if (!fs.existsSync(testDir)) {
  console.error('❌ Integration test directory not found:', testDir);
  process.exit(1);
}

// Check required files
console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  const filePath = path.join(testDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allValid = false;
  }
}

// Check test file structure
console.log('\n📋 Validating test file structure:');

const testFiles = [
  'api-integration.test.ts',
  'auth-integration.test.ts',
  'websocket.test.ts',
  'cross-platform.test.ts',
  'environment.test.ts',
];

for (const testFile of testFiles) {
  const filePath = path.join(testDir, testFile);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for required imports
    const hasDescribe = content.includes('describe(');
    const hasIt = content.includes('it(');
    const hasExpect = content.includes('expect(');
    const hasImports = content.includes('import');

    if (hasDescribe && hasIt && hasExpect && hasImports) {
      console.log(`  ✅ ${testFile} - Structure valid`);
    } else {
      console.log(`  ⚠️  ${testFile} - Structure issues:`);
      if (!hasDescribe) console.log(`    - Missing describe() blocks`);
      if (!hasIt) console.log(`    - Missing it() test cases`);
      if (!hasExpect) console.log(`    - Missing expect() assertions`);
      if (!hasImports) console.log(`    - Missing import statements`);
    }

    // Count test cases
    const testCases = (content.match(/it\(/g) || []).length;
    console.log(`    📊 Test cases: ${testCases}`);
  }
}

// Check configuration files
console.log('\n⚙️  Validating configuration:');

const configFiles = [
  {
    file: '../../vitest.integration.config.ts',
    required: ['testTimeout', 'coverage', 'setupFiles'],
  },
  { file: '../../vitest.config.ts', required: ['test', 'resolve'] },
  { file: '../../package.json', required: ['test:integration'] },
];

for (const { file, required } of configFiles) {
  const filePath = path.join(testDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const missingConfig = required.filter(config => !content.includes(config));

    if (missingConfig.length === 0) {
      console.log(`  ✅ ${file} - Configuration valid`);
    } else {
      console.log(`  ⚠️  ${file} - Missing: ${missingConfig.join(', ')}`);
    }
  } else {
    console.log(`  ❌ ${file} - File not found`);
    allValid = false;
  }
}

// Check environment configuration
console.log('\n🌍 Validating environment configuration:');

const envFile = path.join(testDir, '.env.test');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredEnvVars = ['TEST_API_URL_DEV', 'TEST_API_KEY', 'USE_MOCK_API'];

  const missingEnvVars = requiredEnvVars.filter(
    envVar => !envContent.includes(envVar)
  );

  if (missingEnvVars.length === 0) {
    console.log('  ✅ Environment configuration valid');
  } else {
    console.log(
      `  ⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`
    );
  }
} else {
  console.log('  ❌ .env.test file not found');
  allValid = false;
}

// Check cross-platform test setup
console.log('\n🔄 Validating cross-platform setup:');

const platformDirs = [
  '../../packages/python',
  '../../packages/swift',
  '../../packages/juce-cpp',
];

for (const dir of platformDirs) {
  const dirPath = path.join(testDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir.split('/').pop()} SDK found`);
  } else {
    console.log(`  ⚠️  ${dir.split('/').pop()} SDK not found (optional)`);
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('🎉 Integration test validation PASSED');
  console.log('\n📋 Next steps:');
  console.log('  1. Run: npm run test:integration:api');
  console.log('  2. Run: npm run test:integration:full');
  console.log('  3. Run: ./run-integration-tests.sh --help');
  process.exit(0);
} else {
  console.log('❌ Integration test validation FAILED');
  console.log(
    '\n🔧 Please fix the issues above before running integration tests'
  );
  process.exit(1);
}
