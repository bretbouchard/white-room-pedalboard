/**
 * Performance Benchmark for ExpansionOperators
 * Standalone script for testing performance without complex test framework dependencies
 */

// Simple mock implementations for testing
const mockRhythmAPI = {
  generateResultant: async (options) => ({
    durations: [3, 1, 0, 1, 3, 1, 0, 1, 3, 1, 0, 1],
    timeSignature: options.timeSignature,
    tempo: options.tempo,
    pattern: '101010101010'
  })
};

const mockHarmonyAPI = {
  generateProgression: async (options) => ({
    chords: Array(options.length).fill(null).map((_, i) => ({
      root: 60 + (i * 5) % 12,
      type: 'major',
      inversion: 0
    })),
    key: options.key,
    scale: options.scale
  })
};

const mockMelodyAPI = {
  generateContour: async (options) => ({
    contour: Array(options.length).fill(null).map((_, i) =>
      i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'same'
    ),
    notes: Array(options.length).fill(null).map((_, i) => ({
      pitch: 60 + i % 12,
      time: i * 0.5,
      duration: 0.5
    }))
  })
};

// Performance measurement utilities
class PerformanceBenchmark {
  constructor() {
    this.metrics = [];
  }

  async measureOperation(name, operation, dataSize = 1) {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    const result = await operation();

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const executionTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;
    const throughput = dataSize / (executionTime / 1000);

    const metrics = {
      operation: name,
      executionTime,
      memoryUsage,
      dataSize,
      throughput,
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    return { result, metrics };
  }

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  printSummary() {
    console.log('\n=== Performance Benchmark Summary ===');

    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {});

    Object.keys(grouped).forEach(operation => {
      const operationMetrics = grouped[operation];
      const avgTime = operationMetrics.reduce((sum, m) => sum + m.executionTime, 0) / operationMetrics.length;
      const minTime = Math.min(...operationMetrics.map(m => m.executionTime));
      const maxTime = Math.max(...operationMetrics.map(m => m.executionTime));
      const avgThroughput = operationMetrics.reduce((sum, m) => sum + m.throughput, 0) / operationMetrics.length;
      const totalMemory = operationMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);

      console.log(`\n${operation}:`);
      console.log(`  Samples: ${operationMetrics.length}`);
      console.log(`  Avg Time: ${avgTime.toFixed(3)}ms`);
      console.log(`  Min Time: ${minTime.toFixed(3)}ms`);
      console.log(`  Max Time: ${maxTime.toFixed(3)}ms`);
      console.log(`  Avg Throughput: ${avgThroughput.toFixed(0)} ops/sec`);
      console.log(`  Total Memory: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
    });

    // Performance requirements validation
    console.log('\n=== Performance Requirements Validation ===');

    const realTimeOperations = this.metrics.filter(m => m.dataSize <= 50);
    const realTimeAvg = realTimeOperations.reduce((sum, m) => sum + m.executionTime, 0) / realTimeOperations.length;

    console.log(`Real-time operations (<50 elements): ${realTimeAvg.toFixed(3)}ms average`);
    console.log(`Target: <10ms | Status: ${realTimeAvg < 10 ? '✅ PASS' : '❌ FAIL'}`);

    const largeOperations = this.metrics.filter(m => m.dataSize > 50);
    if (largeOperations.length > 0) {
      const largeAvg = largeOperations.reduce((sum, m) => sum + m.executionTime, 0) / largeOperations.length;
      console.log(`Large operations (>50 elements): ${largeAvg.toFixed(3)}ms average`);
      console.log(`Target: <100ms | Status: ${largeAvg < 100 ? '✅ PASS' : '❌ FAIL'}`);
    }

    // Memory efficiency
    const avgMemoryPerOp = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    console.log(`Average memory per operation: ${(avgMemoryPerOp / 1024).toFixed(2)}KB`);
    console.log(`Target: <1024KB | Status: ${avgMemoryPerOp < 1024 * 1024 ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Basic ExpansionOperators implementation for testing
class ExpansionOperators {
  static expandContour(contour, options = {}) {
    const expansions = [];

    // Simple permutation
    if (contour.length > 1) {
      for (let i = 1; i < contour.length; i++) {
        const rotated = [...contour.slice(i), ...contour.slice(0, i)];
        expansions.push({
          originalContour: contour,
          expandedContour: rotated,
          expansionRatio: contour.length / rotated.length,
          operation: 'permutation',
          integrity: this.calculateIntegrity(contour, rotated)
        });
      }
    }

    // Retrograde
    expansions.push({
      originalContour: contour,
      expandedContour: [...contour].reverse(),
      expansionRatio: 1,
      operation: 'retrograde',
      integrity: this.calculateIntegrity(contour, [...contour].reverse())
    });

    // Inversion
    const inverted = contour.map(dir => {
      switch (dir) {
        case 'up': return 'down';
        case 'down': return 'up';
        case 'same': return 'same';
        default: return dir;
      }
    });
    expansions.push({
      originalContour: contour,
      expandedContour: inverted,
      expansionRatio: 1,
      operation: 'inversion',
      integrity: this.calculateIntegrity(contour, inverted)
    });

    return expansions.filter(exp => exp.integrity >= 0.3);
  }

  static expandIntervals(intervals, options = {}) {
    const expansions = [];

    // Arithmetic expansion
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const expanded = intervals.map(interval => [interval, interval + avg]).flat();
    expansions.push({
      originalIntervals: intervals,
      expandedIntervals: expanded,
      harmonicMean: this.calculateHarmonicMean(expanded),
      tension: this.calculateTension(expanded),
      consonance: this.calculateConsonance(expanded),
      operation: 'arithmetic'
    });

    return expansions;
  }

  static analyzeExpansion(original, expanded) {
    return {
      complexity: Math.min(1, expanded.length / 20),
      integrity: this.calculateIntegrity(original, expanded),
      elegance: this.calculateElegance(expanded),
      growth: expanded.length / Math.max(original.length, 1),
      redundancy: this.calculateRedundancy(expanded)
    };
  }

  static calculateIntegrity(original, expanded) {
    if (original.length === 0 || expanded.length === 0) return 0;
    let matches = 0;
    const ratio = expanded.length / original.length;
    for (let i = 0; i < original.length; i++) {
      const expIndex = Math.floor(i * ratio);
      if (expIndex < expanded.length && original[i] === expanded[expIndex]) {
        matches++;
      }
    }
    return matches / original.length;
  }

  static calculateHarmonicMean(intervals) {
    if (intervals.length === 0) return 0;
    const sum = intervals.reduce((acc, interval) => acc + 1 / Math.abs(interval || 1), 0);
    return intervals.length / sum;
  }

  static calculateTension(intervals) {
    const avgInterval = intervals.reduce((a, b) => a + Math.abs(b), 0) / intervals.length;
    return Math.min(1, avgInterval / 12);
  }

  static calculateConsonance(intervals) {
    const consonantIntervals = [1, 3, 4, 5, 6, 8, 9, 10, 12];
    const consonantCount = intervals.filter(interval =>
      consonantIntervals.includes(Math.abs(interval % 12))
    ).length;
    return consonantCount / intervals.length;
  }

  static calculateElegance(data) {
    if (!Array.isArray(data)) return 0.5;
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.ceil(data.length / 2)).reverse();
    let matches = 0;
    for (let i = 0; i < Math.min(firstHalf.length, secondHalf.length); i++) {
      if (firstHalf[i] === secondHalf[i]) matches++;
    }
    return matches / Math.max(firstHalf.length, 1);
  }

  static calculateRedundancy(data) {
    if (!Array.isArray(data)) return 0;
    const unique = new Set(data);
    return 1 - (unique.size / data.length);
  }
}

class ExpansionAPI {
  static async generateMelodicExpansions(melody, options = {}) {
    const expansions = ExpansionOperators.expandContour(melody.contour, options);
    const analysis = ExpansionOperators.analyzeExpansion(melody.contour, melody.contour);

    return {
      expansions,
      analysis: {
        complexity: analysis.complexity,
        integrity: analysis.integrity,
        elegance: analysis.elegance
      }
    };
  }

  static async analyzeExpansionQuality(original, expanded) {
    const metrics = ExpansionOperators.analyzeExpansion(original, expanded);
    const quality = (metrics.complexity + metrics.integrity + metrics.elegance + (1 - metrics.redundancy)) / 4;

    let recommendation = '';
    if (quality >= 0.8) {
      recommendation = 'Excellent expansion with high musical and mathematical quality';
    } else if (quality >= 0.6) {
      recommendation = 'Good expansion with some room for improvement';
    } else if (quality >= 0.4) {
      recommendation = 'Acceptable expansion, consider refining parameters';
    } else {
      recommendation = 'Poor expansion quality, recommend regeneration with different parameters';
    }

    return {
      quality,
      metrics,
      recommendation
    };
  }
}

// Main benchmark execution
async function runBenchmarks() {
  console.log('🚀 Starting ExpansionOperators Performance Benchmarks...\n');

  const benchmark = new PerformanceBenchmark();

  // Test 1: Basic Contour Expansion Performance
  console.log('Test 1: Basic Contour Expansion');
  const testSizes = [5, 10, 25, 50, 100, 500];

  for (const size of testSizes) {
    const testContour = Array(size).fill(null).map((_, i) =>
      i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'same'
    );

    const { result, metrics } = await benchmark.measureOperation(
      `contour-expansion-${size}`,
      () => ExpansionOperators.expandContour(testContour, {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      }),
      size
    );

    console.log(`  Size ${size}: ${metrics.executionTime.toFixed(3)}ms, ${metrics.throughput.toFixed(0)} ops/sec, ${result.length} expansions`);
  }

  // Test 2: Interval Expansion Performance
  console.log('\nTest 2: Interval Expansion');
  const intervalSizes = [5, 10, 25, 50];

  for (const size of intervalSizes) {
    const testIntervals = Array(size).fill(null).map((_, i) => (i % 12) + 1);

    const { result, metrics } = await benchmark.measureOperation(
      `interval-expansion-${size}`,
      () => ExpansionOperators.expandIntervals(testIntervals, {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      }),
      size
    );

    console.log(`  Size ${size}: ${metrics.executionTime.toFixed(3)}ms, ${metrics.throughput.toFixed(0)} ops/sec, ${result.length} expansions`);
  }

  // Test 3: High-Level API Performance
  console.log('\nTest 3: High-Level API Performance');
  for (const size of [10, 25, 50]) {
    const melody = {
      notes: Array(size).fill(null).map((_, i) => ({
        pitch: 60 + i % 12,
        time: i * 0.5,
        duration: 0.5
      })),
      contour: Array(size).fill(null).map((_, i) =>
        i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'same'
      )
    };

    const { result, metrics } = await benchmark.measureOperation(
      `melodic-expansion-${size}`,
      () => ExpansionAPI.generateMelodicExpansions(melody, {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      }),
      size
    );

    console.log(`  Size ${size}: ${metrics.executionTime.toFixed(3)}ms, ${result.expansions.length} expansions`);
  }

  // Test 4: Quality Analysis Performance
  console.log('\nTest 4: Quality Analysis Performance');
  for (const size of [10, 50, 100]) {
    const original = Array(size).fill(null).map((_, i) => i + 1);
    const expanded = [...original, ...original.map(x => x + 1)];

    const { result, metrics } = await benchmark.measureOperation(
      `quality-analysis-${size}`,
      () => ExpansionAPI.analyzeExpansionQuality(original, expanded),
      size
    );

    console.log(`  Size ${size}: ${metrics.executionTime.toFixed(3)}ms, quality: ${result.quality.toFixed(3)}`);
  }

  // Test 5: Consistency Under Load
  console.log('\nTest 5: Consistency Under Load (100 iterations)');
  const testContour = ['up', 'down', 'same', 'up', 'down'];
  const executionTimes = [];

  for (let i = 0; i < 100; i++) {
    const { metrics } = await benchmark.measureOperation(
      `consistency-test-${i}`,
      () => ExpansionOperators.expandContour(testContour, {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      }),
      testContour.length
    );

    executionTimes.push(metrics.executionTime);
  }

  const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
  const maxTime = Math.max(...executionTimes);
  const minTime = Math.min(...executionTimes);

  console.log(`  Average: ${avgTime.toFixed(3)}ms`);
  console.log(`  Min: ${minTime.toFixed(3)}ms`);
  console.log(`  Max: ${maxTime.toFixed(3)}ms`);
  console.log(`  Consistency Ratio: ${(maxTime / minTime).toFixed(2)}x`);

  // Test 6: Memory Efficiency Test
  console.log('\nTest 6: Memory Efficiency Test (1000 operations)');
  const initialMemory = benchmark.getMemoryUsage();

  for (let i = 0; i < 1000; i++) {
    const testContour = Array(20).fill(null).map((_, j) =>
      j % 2 === 0 ? 'up' : 'down'
    );

    ExpansionOperators.expandContour(testContour, {
      preserveContour: true,
      maintainIntegrity: true,
      allowDissonance: false
    });
  }

  const finalMemory = benchmark.getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`  Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Per Operation: ${(memoryIncrease / 1000 / 1024).toFixed(2)}KB`);

  // Print comprehensive summary
  benchmark.printSummary();

  console.log('\n✅ Performance benchmarks completed!');
}

// Run the benchmarks
runBenchmarks().catch(console.error);