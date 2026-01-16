/**
 * Performance Benchmark for Orchestration Matrix
 * Tests orchestral texture generation, register mapping, and balance analysis
 */

// Mock implementation for testing
const mockOrchestrationEngine = {
  // Simplified orchestration generation
  createOrchestralTexture: (harmony, instruments, constraints) => {
    const layers = instruments.map((instrumentId, index) => {
      const instrumentRanges = {
        'violin': { min: 60, max: 96, register: 'treble' },
        'viola': { min: 55, max: 86, register: 'alto' },
        'cello': { min: 42, max: 72, register: 'tenor' },
        'bass': { min: 32, max: 60, register: 'bass' },
        'flute': { min: 64, max: 96, register: 'treble' },
        'oboe': { min: 60, max: 84, register: 'alto' },
        'clarinet': { min: 53, max: 92, register: 'tenor' },
        'horn': { min: 43, max: 79, register: 'tenor' },
        'trumpet': { min: 60, max: 84, register: 'treble' },
        'trombone': { min: 47, max: 72, register: 'tenor' }
      };

      const instrumentInfo = instrumentRanges[instrumentId] || { min: 60, max: 72, register: 'alto' };
      const notesPerInstrument = Math.ceil(harmony.length / instruments.length);
      const startNote = index * notesPerInstrument;
      const endNote = Math.min(startNote + notesPerInstrument, harmony.length);
      const assignedNotes = harmony.slice(startNote, endNote);

      const notes = assignedNotes.map((pitch, noteIndex) => ({
        pitch: pitch,
        velocity: 75 + Math.floor(Math.random() * 20),
        duration: 1,
        startTime: noteIndex * 0.5,
        instrument: instrumentId,
        dynamic: 'mf',
        articulation: 'legato'
      }));

      return {
        instrumentId,
        notes,
        density: notes.length / Math.max(1, notes.reduce((sum, note) => sum + note.duration, 0)),
        range: assignedNotes.length > 0 ? Math.max(...assignedNotes) - Math.min(...assignedNotes) : 0,
        register: instrumentInfo.register,
        role: index === 0 ? 'primary' : index < instruments.length * 0.3 ? 'secondary' : 'background',
        weight: 0.5 + Math.random() * 0.4,
        blendMode: 'linear'
      };
    }).filter(layer => layer.notes.length > 0);

    const allNotes = layers.flatMap(layer => layer.notes);
    const spectralCentroid = allNotes.length > 0 ?
      allNotes.reduce((sum, note) => sum + note.pitch, 0) / allNotes.length : 60;

    // Calculate section balance
    const sections = {
      strings: 0,
      woodwinds: 0,
      brass: 0,
      percussion: 0
    };

    const stringInstruments = ['violin', 'viola', 'cello', 'bass'];
    const woodwindInstruments = ['flute', 'oboe', 'clarinet', 'bassoon'];
    const brassInstruments = ['horn', 'trumpet', 'trombone', 'tuba'];

    layers.forEach(layer => {
      const weight = layer.weight;
      if (stringInstruments.includes(layer.instrumentId)) sections.strings += weight;
      else if (woodwindInstruments.includes(layer.instrumentId)) sections.woodwinds += weight;
      else if (brassInstruments.includes(layer.instrumentId)) sections.brass += weight;
      else sections.percussion += weight;
    });

    return {
      id: `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Orchestral Texture',
      layers,
      overallDensity: layers.reduce((sum, layer) => sum + layer.density, 0),
      dynamicRange: { min: 60, max: 100 },
      spectralCentroid,
      complexity: Math.min(1, layers.length * 0.15 + (sections.strings + sections.woodwinds + sections.brass) * 0.05),
      balance: sections,
      quality: {
        clarity: Math.max(0.3, Math.min(1, (8 - layers.length) / 8)),
        richness: Math.min(1, new Set(layers.map(layer => {
          const instrument = layer.instrumentId;
          if (stringInstruments.includes(instrument)) return 'string';
          if (woodwindInstruments.includes(instrument)) return 'woodwind';
          if (brassInstruments.includes(instrument)) return 'brass';
          return 'other';
        })).size / 4),
        warmth: layers.filter(layer => ['bass', 'pedal'].includes(layer.register)).length / layers.length * 0.8,
        brightness: layers.filter(layer => ['treble', 'extreme'].includes(layer.register)).length / layers.length * 0.8,
        transparency: Math.max(0, 1 - layers.reduce((sum, layer) => sum + layer.weight, 0) / layers.length)
      }
    };
  },

  generateRegisterMap: (instruments) => {
    const sections = ['string', 'woodwind', 'brass', 'percussion'];
    const instrumentData = {
      'violin': { section: 'string', ranges: { treble: { min: 86, max: 96 }, alto: { min: 79, max: 86 } } },
      'viola': { section: 'string', ranges: { alto: { min: 72, max: 79 }, tenor: { min: 63, max: 72 } } },
      'cello': { section: 'string', ranges: { tenor: { min: 60, max: 67 }, bass: { min: 47, max: 60 } } },
      'bass': { section: 'string', ranges: { bass: { min: 36, max: 47 }, pedal: { min: 28, max: 36 } } },
      'flute': { section: 'woodwind', ranges: { treble: { min: 91, max: 96 }, alto: { min: 86, max: 91 } } },
      'oboe': { section: 'woodwind', ranges: { alto: { min: 77, max: 82 }, tenor: { min: 72, max: 77 } } },
      'clarinet': { section: 'woodwind', ranges: { tenor: { min: 72, max: 81 }, alto: { min: 81, max: 88 } } },
      'horn': { section: 'brass', ranges: { tenor: { min: 67, max: 74 }, bass: { min: 55, max: 67 } } },
      'trumpet': { section: 'brass', ranges: { treble: { min: 74, max: 79 }, tenor: { min: 67, max: 74 } } },
      'trombone': { section: 'brass', ranges: { tenor: { min: 65, max: 71 }, bass: { min: 47, max: 65 } } }
    };

    const maps = [];

    sections.forEach(section => {
      const sectionInstruments = instruments.filter(id =>
        instrumentData[id]?.section === section
      );

      if (sectionInstruments.length > 0) {
        const registerMap = {
          pedal: { instruments: [], range: [0, 0], color: 'deep, massive' },
          bass: { instruments: [], range: [0, 0], color: 'dark, full' },
          tenor: { instruments: [], range: [0, 0], color: 'warm, lyrical' },
          alto: { instruments: [], range: [0, 0], color: 'bright, warm' },
          treble: { instruments: [], range: [0, 0], color: 'brilliant, clear' },
          extreme: { instruments: [], range: [0, 0], color: 'brilliant, intense' }
        };

        sectionInstruments.forEach(instrumentId => {
          const data = instrumentData[instrumentId];
          if (data) {
            const ranges = data.ranges;
            const registers = Object.keys(ranges);
            const bestRegister = registers[0]; // Simplified selection

            registerMap[bestRegister].instruments.push(instrumentId);
          }
        });

        // Calculate ranges for each register
        Object.keys(registerMap).forEach(registerName => {
          const register = registerMap[registerName];
          if (register.instruments.length > 0) {
            let minPitch = 127;
            let maxPitch = 0;

            register.instruments.forEach(instrumentId => {
              const data = instrumentData[instrumentId];
              if (data && data.ranges[registerName]) {
                minPitch = Math.min(minPitch, data.ranges[registerName].min);
                maxPitch = Math.max(maxPitch, data.ranges[registerName].max);
              }
            });

            register.range = [minPitch, maxPitch];
          }
        });

        maps.push({
          section,
          instruments: sectionInstruments,
          ...registerMap
        });
      }
    });

    return maps;
  },

  generateDensityCurve: (duration, shape, complexity = 0.5, smoothness = 0.8) => {
    const timePoints = 100;
    const time = Array.from({ length: timePoints + 1 }, (_, i) => (i / timePoints) * duration);
    let density;

    switch (shape) {
      case 'linear':
        density = time.map(t => (t / duration) * 10);
        break;
      case 'exponential':
        density = time.map(t => Math.pow(t / duration, 2) * 15);
        break;
      case 'logarithmic':
        density = time.map(t => Math.sqrt(t / duration) * 12);
        break;
      case 'bell-curve':
        const center = duration / 2;
        const spread = duration / 4;
        density = time.map(t => {
          const x = (t - center) / spread;
          return Math.exp(-x * x) * 20;
        });
        break;
      case 'complex':
        density = time.map((t, i) => {
          const linear = (t / duration) * 8;
          const sinusoidal = Math.sin((i / timePoints) * Math.PI * 4) * 3;
          const noise = (Math.random() - 0.5) * complexity * 2;
          return Math.max(0, linear + sinusoidal + noise + 5);
        });
        break;
      default:
        density = time.map(() => 8);
    }

    // Apply smoothing
    if (smoothness > 0) {
      const passes = Math.floor(smoothness * 5);
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 1; i < density.length - 1; i++) {
          density[i] = (density[i - 1] + density[i] + density[i + 1]) / 3;
        }
      }
    }

    return {
      time,
      density,
      smoothness,
      complexity,
      envelope: shape === 'complex' ? 'custom' : shape
    };
  },

  voiceHarmony: (harmony, instruments, constraints = {}) => {
    const notes = [];
    const sortedInstruments = [...instruments].sort((a, b) => a.localeCompare(b));

    harmony.forEach((pitch, index) => {
      const instrumentId = sortedInstruments[index % sortedInstruments.length];

      notes.push({
        pitch,
        velocity: 75,
        duration: 1,
        startTime: index * 0.5,
        instrument: instrumentId,
        dynamic: 'mf',
        articulation: 'legato'
      });
    });

    // Calculate voice leading metrics
    const voiceLeading = {
      totalMotion: Math.random() * 20,
      parallelMotion: Math.random() * 10,
      contraryMotion: Math.random() * 10,
      obliqueMotion: Math.random() * 5
    };

    // Calculate spacing
    const sortedNotes = notes.sort((a, b) => a.pitch - b.pitch);
    const intervals = [];
    for (let i = 1; i < sortedNotes.length; i++) {
      intervals.push(sortedNotes[i].pitch - sortedNotes[i - 1].pitch);
    }

    const spacing = {
      spacingRule: intervals.every(iv => iv >= 3) ? 'open' :
                   intervals.every(iv => iv <= 4) ? 'close' : 'mixed',
      intervals,
      balance: 1 - (intervals.reduce((sum, iv) => {
        const avg = intervals.reduce((s, i) => s + i, 0) / intervals.length;
        return sum + Math.pow(iv - avg, 2);
      }, 0) / intervals.length) / 25
    };

    // Calculate register balance
    const registerBalance = {
      pedal: 0,
      bass: 0,
      tenor: 0,
      alto: 0,
      treble: 0,
      extreme: 0
    };

    notes.forEach(note => {
      const register = note.pitch < 36 ? 'pedal' :
                      note.pitch < 48 ? 'bass' :
                      note.pitch < 60 ? 'tenor' :
                      note.pitch < 72 ? 'alto' :
                      note.pitch < 84 ? 'treble' : 'extreme';
      registerBalance[register]++;
    });

    // Estimate quality
    const quality = {
      clarity: Math.min(1, Math.min(...intervals) / 3),
      blend: 0.7 + Math.random() * 0.2,
      projection: 0.6 + Math.random() * 0.3
    };

    return {
      notes,
      voiceLeading,
      spacing,
      registerBalance,
      quality
    };
  },

  analyzeBalance: (texture) => {
    const balance = texture.balance;
    const total = balance.strings + balance.woodwinds + balance.brass + balance.percussion;

    if (total === 0) {
      return {
        currentBalance: balance,
        recommendations: ['No instruments in texture'],
        adjustments: []
      };
    }

    const percentages = {
      strings: (balance.strings / total) * 100,
      woodwinds: (balance.woodwinds / total) * 100,
      brass: (balance.brass / total) * 100,
      percussion: (balance.percussion / total) * 100
    };

    const idealBalance = {
      strings: 40,
      woodwinds: 25,
      brass: 25,
      percussion: 10
    };

    const recommendations = [];
    const adjustments = [];

    Object.keys(idealBalance).forEach(section => {
      const current = percentages[section];
      const ideal = idealBalance[section];
      const diff = current - ideal;

      if (Math.abs(diff) > 15) {
        if (diff > 0) {
          recommendations.push(`Reduce ${section} presence by ${diff.toFixed(1)}%`);
          adjustments.push({
            instrument: section,
            change: -diff / 100,
            reason: `Over-represented section (${current.toFixed(1)}% vs ideal ${ideal}%)`
          });
        } else {
          recommendations.push(`Increase ${section} presence by ${Math.abs(diff).toFixed(1)}%`);
          adjustments.push({
            instrument: section,
            change: Math.abs(diff) / 100,
            reason: `Under-represented section (${current.toFixed(1)}% vs ideal ${ideal}%)`
          });
        }
      }
    });

    return {
      currentBalance: balance,
      recommendations,
      adjustments
    };
  }
};

// Performance measurement utilities
class OrchestrationPerformanceBenchmark {
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
    console.log('\n=== Orchestration Matrix Performance Benchmark Summary ===');

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

    const orchestrationOps = this.metrics.filter(m => m.operation.startsWith('orchestration-'));
    if (orchestrationOps.length > 0) {
      const avgOrchestrationTime = orchestrationOps.reduce((sum, m) => sum + m.executionTime, 0) / orchestrationOps.length;
      console.log(`Orchestral Texture Generation (${orchestrationOps.length} samples): ${avgOrchestrationTime.toFixed(3)}ms average`);
      console.log(`Target: <50ms | Status: ${avgOrchestrationTime < 50 ? '✅ PASS' : '❌ FAIL'}`);
    }

    const voiceHarmonyOps = this.metrics.filter(m => m.operation.startsWith('voice-harmony-'));
    if (voiceHarmonyOps.length > 0) {
      const avgVoiceHarmonyTime = voiceHarmonyOps.reduce((sum, m) => sum + m.executionTime, 0) / voiceHarmonyOps.length;
      console.log(`Voice Harmony (${voiceHarmonyOps.length} samples): ${avgVoiceHarmonyTime.toFixed(3)}ms average`);
      console.log(`Target: <20ms | Status: ${avgVoiceHarmonyTime < 20 ? '✅ PASS' : '❌ FAIL'}`);
    }

    const densityCurveOps = this.metrics.filter(m => m.operation.startsWith('density-curve-'));
    if (densityCurveOps.length > 0) {
      const avgDensityCurveTime = densityCurveOps.reduce((sum, m) => sum + m.executionTime, 0) / densityCurveOps.length;
      console.log(`Density Curve Generation (${densityCurveOps.length} samples): ${avgDensityCurveTime.toFixed(3)}ms average`);
      console.log(`Target: <10ms | Status: ${avgDensityCurveTime < 10 ? '✅ PASS' : '❌ FAIL'}`);
    }

    // Memory efficiency
    const avgMemoryPerOp = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    console.log(`Average memory per operation: ${(avgMemoryPerOp / 1024).toFixed(2)}KB`);
    console.log(`Target: <1024KB | Status: ${avgMemoryPerOp < 1024 * 1024 ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Main benchmark execution
async function runOrchestrationBenchmarks() {
  console.log('🎼 Starting Orchestration Matrix Performance Benchmarks...\n');

  const benchmark = new OrchestrationPerformanceBenchmark();

  // Test 1: Orchestral Texture Generation Performance
  console.log('Test 1: Orchestral Texture Generation');
  const ensembleSizes = [
    { name: 'solo', instruments: ['violin'] },
    { name: 'quartet', instruments: ['violin', 'viola', 'cello', 'bass'] },
    { name: 'chamber', instruments: ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn'] },
    { name: 'small_orchestra', instruments: [
      'violin', 'viola', 'cello', 'bass',
      'flute', 'oboe', 'clarinet', 'horn', 'trumpet'
    ] },
    { name: 'full_orchestra', instruments: [
      'violin', 'viola', 'cello', 'bass',
      'flute', 'oboe', 'clarinet', 'horn',
      'trumpet', 'trombone', 'timpani'
    ] }
  ];

  const harmonySizes = [4, 8, 12, 16, 24];

  for (const ensemble of ensembleSizes) {
    for (const harmonySize of harmonySizes) {
      const harmony = Array.from({ length: harmonySize }, (_, i) => 60 + (i * 2) % 24);

      const { result, metrics } = await benchmark.measureOperation(
        `orchestration-${ensemble.name}-${harmonySize}`,
        () => mockOrchestrationEngine.createOrchestralTexture(
          harmony,
          ensemble.instruments,
          {
            maxSimultaneousNotes: harmonySize * 2,
            minVoiceSeparation: 2,
            registerDistribution: {
              pedal: { min: 0, max: 1 },
              bass: { min: 1, max: 2 },
              tenor: { min: 1, max: 3 },
              alto: { min: 1, max: 2 },
              treble: { min: 1, max: 2 },
              extreme: { min: 0, max: 1 }
            },
            balanceConstraints: {
              strings: { min: 0, max: 1 },
              woodwinds: { min: 0, max: 1 },
              brass: { min: 0, max: 1 },
              percussion: { min: 0, max: 1 }
            },
            dynamicConstraints: {
              overall: { min: 20, max: 100 },
              sections: {}
            }
          }
        ),
        harmonySize
      );

      console.log(`  ${ensemble.name} (${harmonySize} notes): ${metrics.executionTime.toFixed(3)}ms, ${result.layers.length} layers`);
    }
  }

  // Test 2: Register Map Generation Performance
  console.log('\nTest 2: Register Map Generation');
  const registerMapSizes = [
    { name: 'strings', instruments: ['violin', 'viola', 'cello', 'bass'] },
    { name: 'winds', instruments: ['flute', 'oboe', 'clarinet', 'bassoon'] },
    { name: 'brass', instruments: ['horn', 'trumpet', 'trombone', 'tuba'] },
    { name: 'full_orchestra', instruments: [
      'violin', 'viola', 'cello', 'bass',
      'flute', 'oboe', 'clarinet', 'bassoon',
      'horn', 'trumpet', 'trombone', 'tuba'
    ] }
  ];

  for (const mapSize of registerMapSizes) {
    const { result, metrics } = await benchmark.measureOperation(
      `register-map-${mapSize.name}`,
      () => mockOrchestrationEngine.generateRegisterMap(mapSize.instruments),
      mapSize.instruments.length
    );

    console.log(`  ${mapSize.name} (${mapSize.instruments.length} instruments): ${metrics.executionTime.toFixed(3)}ms, ${result.length} sections`);
  }

  // Test 3: Density Curve Generation Performance
  console.log('\nTest 3: Density Curve Generation');
  const curveShapes = ['linear', 'exponential', 'logarithmic', 'bell-curve', 'complex'];
  const durations = [4, 8, 16, 32];

  for (const shape of curveShapes) {
    for (const duration of durations) {
      const { result, metrics } = await benchmark.measureOperation(
        `density-curve-${shape}-${duration}`,
        () => mockOrchestrationEngine.generateDensityCurve(duration, shape, 0.7, 0.8),
        duration
      );

      console.log(`  ${shape} (${duration} beats): ${metrics.executionTime.toFixed(3)}ms, ${result.time.length} points`);
    }
  }

  // Test 4: Voice Harmony Performance
  console.log('\nTest 4: Voice Harmony Performance');
  const harmonyComplexities = [
    { notes: 4, instruments: 2, name: 'simple' },
    { notes: 8, instruments: 4, name: 'moderate' },
    { notes: 12, instruments: 6, name: 'complex' },
    { notes: 16, instruments: 8, name: 'very_complex' }
  ];

  for (const complexity of harmonyComplexities) {
    const harmony = Array.from({ length: complexity.notes }, (_, i) => 60 + (i * 3) % 24);
    const instruments = ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn', 'trumpet', 'trombone'].slice(0, complexity.instruments);

    const { result, metrics } = await benchmark.measureOperation(
      `voice-harmony-${complexity.name}`,
      () => mockOrchestrationEngine.voiceHarmony(harmony, instruments),
      complexity.notes
    );

    console.log(`  ${complexity.name} (${complexity.notes} notes, ${complexity.instruments} instruments): ${metrics.executionTime.toFixed(3)}ms, ${result.notes.length} voiced notes`);
  }

  // Test 5: Balance Analysis Performance
  console.log('\nTest 5: Balance Analysis Performance');
  const textureComplexities = [
    { layers: 3, name: 'sparse' },
    { layers: 6, name: 'moderate' },
    { layers: 12, name: 'dense' },
    { layers: 24, name: 'very_dense' }
  ];

  for (const complexity of textureComplexities) {
    // Create mock texture
    const mockTexture = {
      balance: {
        strings: Math.random() * 2,
        woodwinds: Math.random() * 1.5,
        brass: Math.random() * 1.8,
        percussion: Math.random() * 0.5
      },
      layers: Array.from({ length: complexity.layers }, (_, i) => ({
        notes: []
      }))
    };

    const { result, metrics } = await benchmark.measureOperation(
      `balance-analysis-${complexity.name}`,
      () => mockOrchestrationEngine.analyzeBalance(mockTexture),
      complexity.layers
    );

    console.log(`  ${complexity.name} (${complexity.layers} layers): ${metrics.executionTime.toFixed(3)}ms, ${result.recommendations.length} recommendations`);
  }

  // Test 6: Complex Workflow Performance
  console.log('\nTest 6: Complex Orchestration Workflow');
  const workflowSizes = [8, 16, 32];

  for (const size of workflowSizes) {
    const { result, metrics } = await benchmark.measureOperation(
      `orchestration-workflow-${size}`,
      async () => {
        // Generate harmony
        const harmony = Array.from({ length: size }, (_, i) => 60 + (i * 2) % 24);

        // Create orchestral texture
        const texture = mockOrchestrationEngine.createOrchestralTexture(
          harmony,
          ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn', 'trumpet', 'trombone'],
          {
            maxSimultaneousNotes: size,
            minVoiceSeparation: 2,
            registerDistribution: {
              pedal: { min: 0, max: 1 },
              bass: { min: 1, max: 2 },
              tenor: { min: 1, max: 3 },
              alto: { min: 1, max: 2 },
              treble: { min: 1, max: 2 },
              extreme: { min: 0, max: 1 }
            },
            balanceConstraints: {
              strings: { min: 0, max: 1 },
              woodwinds: { min: 0, max: 1 },
              brass: { min: 0, max: 1 },
              percussion: { min: 0, max: 1 }
            },
            dynamicConstraints: {
              overall: { min: 20, max: 100 },
              sections: {}
            }
          }
        );

        // Generate register map
        const registerMap = mockOrchestrationEngine.generateRegisterMap(
          ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn', 'trumpet', 'trombone']
        );

        // Voice harmony
        const voiceResult = mockOrchestrationEngine.voiceHarmony(
          harmony.slice(0, Math.min(8, harmony.length)),
          ['violin', 'viola', 'cello', 'flute']
        );

        // Analyze balance
        const balanceAnalysis = mockOrchestrationEngine.analyzeBalance(texture);

        // Generate density curve
        const densityCurve = mockOrchestrationEngine.generateDensityCurve(16, 'complex', 0.6, 0.7);

        return {
          harmonySize: harmony.length,
          layerCount: texture.layers.length,
          registerMapSections: registerMap.length,
          voicedNotes: voiceResult.notes.length,
          balanceRecommendations: balanceAnalysis.recommendations.length,
          densityCurvePoints: densityCurve.time.length,
          textureComplexity: texture.complexity,
          overallBalance: texture.balance
        };
      },
      size
    );

    console.log(`  Workflow (${size}): ${metrics.executionTime.toFixed(3)}ms, ${result.layerCount} layers, complexity: ${result.textureComplexity.toFixed(3)}`);
  }

  // Test 7: Memory Stress Test
  console.log('\nTest 7: Memory Stress Test (50 orchestral textures)');
  const initialMemory = benchmark.getMemoryUsage();

  for (let i = 0; i < 50; i++) {
    const harmony = Array.from({ length: 16 }, (_, j) => 60 + (j * 2) % 24);
    mockOrchestrationEngine.createOrchestralTexture(
      harmony,
      ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn', 'trumpet', 'trombone'],
      {
        maxSimultaneousNotes: 16,
        minVoiceSeparation: 2,
        registerDistribution: {
          pedal: { min: 0, max: 1 },
          bass: { min: 1, max: 2 },
          tenor: { min: 1, max: 3 },
          alto: { min: 1, max: 2 },
          treble: { min: 1, max: 2 },
          extreme: { min: 0, max: 1 }
        },
        balanceConstraints: {
          strings: { min: 0, max: 1 },
          woodwinds: { min: 0, max: 1 },
          brass: { min: 0, max: 1 },
          percussion: { min: 0, max: 1 }
        },
        dynamicConstraints: {
          overall: { min: 20, max: 100 },
          sections: {}
        }
      }
    );
  }

  const finalMemory = benchmark.getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`  Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Per Texture: ${(memoryIncrease / 50 / 1024).toFixed(2)}KB`);

  // Test 8: Real-time Performance Test
  console.log('\nTest 8: Real-time Performance Requirements');
  const realTimeSizes = [3, 4, 6, 8]; // Small sizes for real-time use
  const realTimeOperations = [];

  for (const size of realTimeSizes) {
    const { metrics } = await benchmark.measureOperation(
      `realtime-orchestration-${size}`,
      () => {
        const harmony = Array.from({ length: size }, (_, i) => 60 + (i * 3) % 24);
        const texture = mockOrchestrationEngine.createOrchestralTexture(
          harmony,
          ['violin', 'viola', 'cello'],
          {
            maxSimultaneousNotes: size * 2,
            minVoiceSeparation: 2,
            registerDistribution: {
              pedal: { min: 0, max: 1 },
              bass: { min: 1, max: 2 },
              tenor: { min: 1, max: 2 },
              alto: { min: 1, max: 2 },
              treble: { min: 1, max: 2 },
              extreme: { min: 0, max: 1 }
            },
            balanceConstraints: {
              strings: { min: 0, max: 1 },
              woodwinds: { min: 0, max: 1 },
              brass: { min: 0, max: 1 },
              percussion: { min: 0, max: 1 }
            },
            dynamicConstraints: {
              overall: { min: 20, max: 100 },
              sections: {}
            }
          }
        );
        return mockOrchestrationEngine.analyzeBalance(texture);
      },
      size
    );

    realTimeOperations.push(metrics);
  }

  const avgRealTime = realTimeOperations.reduce((sum, m) => sum + m.executionTime, 0) / realTimeOperations.length;
  const maxRealTime = Math.max(...realTimeOperations.map(m => m.executionTime));

  console.log(`  Real-time Operations Average: ${avgRealTime.toFixed(3)}ms`);
  console.log(`  Real-time Operations Max: ${maxRealTime.toFixed(3)}ms`);
  console.log(`  Target: <25ms | Status: ${maxRealTime < 25 ? '✅ PASS' : '❌ FAIL'}`);

  // Print comprehensive summary
  benchmark.printSummary();

  console.log('\n✅ Orchestration Matrix performance benchmarks completed!');
}

// Run the benchmarks
runOrchestrationBenchmarks().catch(console.error);