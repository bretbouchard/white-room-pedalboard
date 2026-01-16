#!/usr/bin/env node

/**
 * Comprehensive Testing Framework Validation Script
 *
 * Validates the entire TDD framework setup including:
 * - Configuration integrity
 * - Test discovery and execution
 * - Performance requirements
 * - Coverage thresholds
 * - Integration functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Validation results
const results = {
  configuration: { passed: 0, failed: 0, details: [] },
  tests: { passed: 0, failed: 0, details: [] },
  performance: { passed: 0, failed: 0, details: [] },
  coverage: { passed: 0, failed: 0, details: [] },
  integration: { passed: 0, failed: 0, details: [] },
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Validation functions
function validateConfiguration() {
  logSection('Configuration Validation');

  const requiredFiles = [
    'vitest.config.ts',
    'vitest.enhanced.config.ts',
    'vitest.integration.config.ts',
    'vitest.performance.config.ts',
    'test-setup.ts',
    'package.json',
  ];

  const requiredDirectories = [
    'tests/property-based',
    'tests/performance',
    'tests/hardware',
    'tests/integration',
    'tests/fixtures',
    'tests/mocks',
    'tests/utils',
  ];

  // Check required files
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`Found configuration file: ${file}`);
      results.configuration.passed++;
    } else {
      logError(`Missing configuration file: ${file}`);
      results.configuration.failed++;
    }
  });

  // Check required directories
  requiredDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      logSuccess(`Found directory: ${dir}`);
      results.configuration.passed++;
    } else {
      logError(`Missing directory: ${dir}`);
      results.configuration.failed++;
    }
  });

  // Validate package.json test scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
      'test',
      'test:coverage',
      'test:performance',
      'test:integration',
    ];

    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`Found test script: ${script}`);
        results.configuration.passed++;
      } else {
        logError(`Missing test script: ${script}`);
        results.configuration.failed++;
      }
    });
  } catch (error) {
    logError(`Failed to parse package.json: ${error.message}`);
    results.configuration.failed++;
  }

  // Validate dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDevDependencies = [
      'vitest',
      '@vitest/coverage-v8',
      'fast-check',
      'benchmark',
    ];

    requiredDevDependencies.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        logSuccess(`Found dev dependency: ${dep}`);
        results.configuration.passed++;
      } else {
        logError(`Missing dev dependency: ${dep}`);
        results.configuration.failed++;
      }
    });
  } catch (error) {
    logError(`Failed to check dependencies: ${error.message}`);
    results.configuration.failed++;
  }
}

function validateTests() {
  logSection('Test Discovery and Execution');

  // Find test files
  const testPatterns = [
    'packages/**/__tests__/**/*.test.ts',
    'tests/property-based/**/*.test.ts',
    'tests/performance/**/*.test.ts',
    'tests/hardware/**/*.test.ts',
    'tests/integration/**/*.test.ts',
  ];

  let totalTests = 0;
  const testCategories = {
    unit: 0,
    propertyBased: 0,
    performance: 0,
    hardware: 0,
    integration: 0,
  };

  testPatterns.forEach(pattern => {
    try {
      // Simple glob simulation for test discovery
      const { execSync } = require('child_process');
      const testFiles = execSync(`find . -name "*.test.ts" -path "${pattern.replace('**/', '*/*')}"`, { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file.length > 0);

      testFiles.forEach(file => {
        if (file.includes('__tests__')) testCategories.unit++;
        else if (file.includes('property-based')) testCategories.propertyBased++;
        else if (file.includes('performance')) testCategories.performance++;
        else if (file.includes('hardware')) testCategories.hardware++;
        else if (file.includes('integration')) testCategories.integration++;
      });

      totalTests += testFiles.length;
      logSuccess(`Found ${testFiles.length} test files for pattern: ${pattern}`);
      results.tests.passed++;
    } catch (error) {
      logWarning(`No test files found for pattern: ${pattern}`);
      results.tests.failed++;
    }
  });

  logInfo(`Total test files found: ${totalTests}`);
  logInfo(`Test categories: Unit (${testCategories.unit}), Property-Based (${testCategories.propertyBased}), Performance (${testCategories.performance}), Hardware (${testCategories.hardware}), Integration (${testCategories.integration})`);

  // Validate test file structure
  try {
    const sampleTestFiles = execSync('find . -name "*.test.ts" | head -3', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    sampleTestFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Check for test structure
      if (content.includes('describe(') && content.includes('it(')) {
        logSuccess(`Test file ${file} has proper structure`);
        results.tests.passed++;
      } else {
        logError(`Test file ${file} has invalid structure`);
        results.tests.failed++;
      }

      // Check for assertions
      if (content.includes('expect(')) {
        logSuccess(`Test file ${file} has assertions`);
        results.tests.passed++;
      } else {
        logWarning(`Test file ${file} may be missing assertions`);
        results.tests.failed++;
      }
    });
  } catch (error) {
    logError(`Failed to validate test file structure: ${error.message}`);
    results.tests.failed++;
  }
}

function validatePerformance() {
  logSection('Performance Requirements Validation');

  // Check performance test files
  try {
    const performanceFiles = execSync('find tests/performance -name "*.test.ts"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    performanceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Check for performance testing patterns
      if (content.includes('PerformanceTestHelpers') ||
          content.includes('assertPerformance') ||
          content.includes('benchmarkFunction')) {
        logSuccess(`Performance test ${file} uses proper performance testing utilities`);
        results.performance.passed++;
      } else {
        logWarning(`Performance test ${file} may not be using performance testing utilities`);
        results.performance.failed++;
      }
    });

    // Check for performance thresholds
    const perfSetupFile = 'tests/performance/setup.ts';
    if (fs.existsSync(perfSetupFile)) {
      const setupContent = fs.readFileSync(perfSetupFile, 'utf8');
      if (setupContent.includes('PerformanceThresholds')) {
        logSuccess('Performance thresholds are defined');
        results.performance.passed++;

        // Check for specific threshold categories
        const requiredThresholds = [
          'audio-processing',
          'mathematical-operations',
          'pattern-generation',
          'analysis-operations',
        ];

        requiredThresholds.forEach(threshold => {
          if (setupContent.includes(threshold)) {
            logSuccess(`Performance threshold found: ${threshold}`);
            results.performance.passed++;
          } else {
            logWarning(`Performance threshold missing: ${threshold}`);
            results.performance.failed++;
          }
        });
      } else {
        logError('Performance thresholds are not defined');
        results.performance.failed++;
      }
    }
  } catch (error) {
    logError(`Failed to validate performance tests: ${error.message}`);
    results.performance.failed++;
  }

  // Try to run a quick performance test
  try {
    logInfo('Running quick performance test...');
    const startTime = Date.now();

    // Simple performance test - measure how long it takes to count to 1 million
    const count = 1000000;
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += i;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration < 100) { // Should complete in less than 100ms
      logSuccess(`Quick performance test passed (${duration}ms)`);
      results.performance.passed++;
    } else {
      logWarning(`Quick performance test slow (${duration}ms)`);
      results.performance.failed++;
    }
  } catch (error) {
    logError(`Quick performance test failed: ${error.message}`);
    results.performance.failed++;
  }
}

function validateCoverage() {
  logSection('Coverage Requirements Validation');

  // Check coverage configuration
  try {
    const vitestConfig = fs.readFileSync('vitest.enhanced.config.ts', 'utf8');

    if (vitestConfig.includes('coverage:')) {
      logSuccess('Coverage configuration found');
      results.coverage.passed++;

      // Check for coverage thresholds
      const coverageThresholds = [
        'global: {',
        'branches:',
        'functions:',
        'lines:',
        'statements:',
      ];

      coverageThresholds.forEach(threshold => {
        if (vitestConfig.includes(threshold)) {
          logSuccess(`Coverage configuration includes: ${threshold}`);
          results.coverage.passed++;
        } else {
          logWarning(`Coverage configuration missing: ${threshold}`);
          results.coverage.failed++;
        }
      });

      // Check for 90% global threshold
      if (vitestConfig.includes('global: {') &&
          vitestConfig.includes('90')) {
        logSuccess('Global coverage threshold of 90% is configured');
        results.coverage.passed++;
      } else {
        logError('Global coverage threshold of 90% is not configured');
        results.coverage.failed++;
      }
    } else {
      logError('Coverage configuration not found');
      results.coverage.failed++;
    }
  } catch (error) {
    logError(`Failed to validate coverage configuration: ${error.message}`);
    results.coverage.failed++;
  }

  // Check for coverage scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts && packageJson.scripts['test:coverage']) {
      logSuccess('Coverage test script found');
      results.coverage.passed++;
    } else {
      logError('Coverage test script not found');
      results.coverage.failed++;
    }
  } catch (error) {
    logError(`Failed to check coverage scripts: ${error.message}`);
    results.coverage.failed++;
  }
}

function validateIntegration() {
  logSection('Integration Testing Validation');

  // Check integration test files
  try {
    const integrationFiles = execSync('find tests/integration -name "*.test.ts"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    integrationFiles.forEach(file => {
      logSuccess(`Found integration test: ${file}`);
      results.integration.passed++;
    });

    // Check for LangGraph integration tests
    const langGraphTests = execSync('find tests/integration -name "*LangGraph*"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    if (langGraphTests.length > 0) {
      logSuccess(`Found ${langGraphTests.length} LangGraph integration tests`);
      results.integration.passed++;
    } else {
      logWarning('No LangGraph integration tests found');
      results.integration.failed++;
    }

    // Check for subagent coordination tests
    langGraphTests.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('subagent') || content.includes('coordination')) {
        logSuccess(`Subagent coordination test found in ${file}`);
        results.integration.passed++;
      }
    });
  } catch (error) {
    logWarning(`No integration tests found: ${error.message}`);
    results.integration.failed++;
  }

  // Check for hardware integration tests
  try {
    const hardwareFiles = execSync('find tests/hardware -name "*.test.ts"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    hardwareFiles.forEach(file => {
      logSuccess(`Found hardware test: ${file}`);
      results.integration.passed++;
    });
  } catch (error) {
    logWarning(`No hardware integration tests found: ${error.message}`);
    results.integration.failed++;
  }
}

function runSampleTests() {
  logSection('Sample Test Execution');

  try {
    logInfo('Running a quick sample test...');

    // Create a simple test file to validate the testing setup
    const sampleTest = `
import { describe, it, expect } from 'vitest';

describe('Framework Validation', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
`;

    fs.writeFileSync('sample-validation.test.ts', sampleTest);

    // Run the sample test
    const testResult = execSync('npx vitest run sample-validation.test.ts --reporter=verbose', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (testResult.includes('PASS') && testResult.includes('2 passed')) {
      logSuccess('Sample test execution passed');
      results.tests.passed++;
    } else {
      logError('Sample test execution failed');
      results.tests.failed++;
      console.log(testResult);
    }

    // Clean up
    fs.unlinkSync('sample-validation.test.ts');
  } catch (error) {
    logError(`Sample test execution failed: ${error.message}`);
    results.tests.failed++;
  }
}

function generateReport() {
  logSection('Validation Report');

  const totalPassed = Object.values(results).reduce((sum, category) => sum + category.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, category) => sum + category.failed, 0);
  const totalChecks = totalPassed + totalFailed;

  console.log(`\n${colors.cyan}Overall Results:${colors.reset}`);
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalFailed}${colors.reset}`);

  const successRate = totalChecks > 0 ? ((totalPassed / totalChecks) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);

  console.log(`\n${colors.cyan}Category Breakdown:${colors.reset}`);

  Object.entries(results).forEach(([category, result]) => {
    const categoryTotal = result.passed + result.failed;
    const categorySuccess = categoryTotal > 0 ? ((result.passed / categoryTotal) * 100).toFixed(1) : 0;
    const color = categorySuccess >= 90 ? 'green' : categorySuccess >= 70 ? 'yellow' : 'red';

    console.log(`${colors[color]}${category}:${colors.reset} ${result.passed}/${categoryTotal} (${categorySuccess}%)`);
  });

  // Write detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalChecks,
      passed: totalPassed,
      failed: totalFailed,
      successRate: parseFloat(successRate),
    },
    categories: results,
  };

  fs.writeFileSync('test-framework-validation.json', JSON.stringify(report, null, 2));
  logInfo(`Detailed report saved to: test-framework-validation.json`);

  // Final recommendation
  if (parseFloat(successRate) >= 90) {
    logSuccess('\n🎉 Testing framework validation passed! Ready for development.');
  } else if (parseFloat(successRate) >= 70) {
    logWarning('\n⚠️  Testing framework has some issues. Review and fix failed checks.');
  } else {
    logError('\n❌ Testing framework validation failed significant checks. Major setup required.');
  }
}

// Main execution
function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║          Schillinger SDK Testing Framework Validation       ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  validateConfiguration();
  validateTests();
  validatePerformance();
  validateCoverage();
  validateIntegration();
  runSampleTests();
  generateReport();
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateConfiguration,
  validateTests,
  validatePerformance,
  validateCoverage,
  validateIntegration,
  runSampleTests,
  generateReport,
};