/**
 * Realization Layer Example
 *
 * Demonstrates how to use the "moving sidewalk" concept for continuous
 * musical time projection using the Schillinger SDK realization layer.
 */

import {
  // Core types
  MusicalTime,
  TimeRange,
  MusicalRole,
  RegisterRange,

  // Fields (Phase 2)
  IntensityField,
  CoincidenceField,
  OrchestraField,

  // Realization Layer (Phase 3)
  RealizationPlane,
  RealizedLayer,
  TrackProjection,
  RealizationEngine,
  RealizationEngineFactory,

  // Time management
  MusicalTimeRange,
  TimeConverter,

  // Utilities
  RealizedFrame,
  TrackSet,
} from '../src/index';

/**
 * Basic realization setup example
 */
export function setupBasicRealization(): RealizationPlane {
  // 1. Create time window (the "moving sidewalk")
  const timeWindow = new MusicalTimeRange(
    { seconds: 0, precision: 'seconds' },
    { seconds: 10, precision: 'seconds' }
  );

  // 2. Create intensity field for dynamic evolution
  const intensityField = IntensityField.fromPreset('gradual-rise');

  // 3. Create coincidence field for convergence detection
  const coincidenceField = new CoincidenceField({
    id: 'coincidence-detector',
    algorithm: 'phase-correlation',
    sensitivity: 0.7
  });

  // 4. Create orchestra field for instrument management
  const orchestraField = new OrchestraField({
    id: 'orchestra',
    constraints: {
      registerOverlap: 0.3,
      doublingTolerance: 2,
      densityLimit: 8,
      balanceWeight: {
        melody: 1.0,
        bass: 0.8,
        harmony: 0.7,
        rhythm: 0.5,
        lead: 1.0,
        'counter-melody': 0.6,
        texture: 0.4,
        ornament: 0.3,
        accompaniment: 0.4
      }
    }
  });

  // 5. Create traversal plan for the moving sidewalk
  const traversalPlan = {
    id: 'main-traversal',
    duration: { seconds: 30, precision: 'seconds' },
    intensityCurve: intensityField,
    releaseMoments: [
      {
        time: 10,
        type: 'gradual',
        layers: ['melody', 'harmony'],
        parameters: { fadeTime: 2.0, intensity: 0.8 }
      },
      {
        time: 20,
        type: 'sudden',
        layers: ['rhythm', 'bass'],
        parameters: { intensity: 1.0 }
      }
    ],
    behavior: {
      speed: 1.0,
      smoothing: 0.7,
      elasticity: 0.5
    }
  };

  // 6. Create generator set (using existing Phase 1 generators)
  const generators = {
    rhythm: {
      id: 'rhythm-gen',
      generator: null, // Would connect to existing RhythmGenerator
      parameters: { complexity: 0.6, style: 'contemporary' }
    },
    harmony: {
      id: 'harmony-gen',
      generator: null, // Would connect to existing HarmonyGenerator
      parameters: { complexity: 0.5, style: 'jazz' }
    },
    contour: {
      id: 'melody-gen',
      generator: null, // Would connect to existing MelodyGenerator
      parameters: { complexity: 0.7, contour: 'wave' }
    }
  };

  // 7. Create realization plane (the core "moving sidewalk")
  const realizationPlane = new RealizationPlane({
    id: 'main-plane',
    timeWindow,
    generators,
    fields: {
      intensity: intensityField,
      coincidence: coincidenceField,
      orchestra: orchestraField
    },
    traversal: traversalPlan,
    configuration: {
      layerCapacity: 8,
      coherenceThreshold: 0.5,
      emergenceEnabled: true,
      realtimeMode: true
    }
  });

  return realizationPlane;
}

/**
 * Real-time performance example
 */
export async function realtimePerformance(plane: RealizationPlane): Promise<void> {
  // Create real-time engine
  const engine = RealizationEngineFactory.createRealtimeEngine(plane, {
    frameRate: 30,
    bufferSize: 100
  });

  // Subscribe to frame updates for UI
  engine.onFrameUpdate((frame: RealizedFrame) => {
    console.log(`Frame: ${frame.time.seconds.toFixed(2)}s, Layers: ${frame.layers.length}, Coherence: ${frame.coherenceScore.toFixed(2)}`);

    // Handle convergence events
    if (frame.convergenceFlags.approachingConvergence) {
      console.log(`Convergence approaching at ${frame.convergenceFlags.convergenceTime?.toFixed(2)}s (${frame.convergenceFlags.convergenceType})`);
    }
  });

  // Subscribe to convergence events
  engine.onConvergence((point) => {
    console.log(`Convergence detected: ${point.type} at ${point.time.toFixed(2)}s, strength: ${point.strength.toFixed(2)}`);
  });

  // Start the engine
  await engine.start();

  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop the engine
  await engine.stop();

  // Get statistics
  const stats = engine.getStatistics();
  console.log('Performance Statistics:', stats);
}

/**
 * DAW integration example
 */
export function dawIntegration(plane: RealizationPlane): TrackSet {
  // Realize a few frames to generate material
  const frames: RealizedFrame[] = [];
  for (let t = 0; t < 10; t += 0.5) {
    const time = { seconds: t, precision: 'seconds' };
    const frame = plane.realize(time);
    frames.push(frame);
  }

  // Get the last frame with most material
  const lastFrame = frames[frames.length - 1];

  // Project layers to tracks
  const trackSet = plane.project(lastFrame.layers);

  console.log(`Generated ${trackSet.tracks.length} tracks:`);
  for (const track of trackSet.tracks) {
    console.log(`  - ${track.name} (${track.instrument?.name})`);
  }

  return trackSet;
}

/**
 * Emergence demonstration
 */
export function demonstrateEmergence(plane: RealizationPlane): void {
  console.log('Demonstrating emergent behavior...');

  // Realize frames over time and show emergence
  for (let t = 0; t < 20; t += 2) {
    const time = { seconds: t, precision: 'seconds' };
    const frame = plane.realize(time);

    const emergenceScores = frame.layers.map(layer => ({
      role: layer.role,
      emergence: layer.emergence,
      coherence: layer.coherence
    }));

    console.log(`Time ${t}s:`, emergenceScores);

    // Show when high emergence occurs
    const highEmergence = emergenceScores.find(score => score.emergence > 0.7);
    if (highEmergence) {
      console.log(`  🌟 High emergence in ${highEmergence.role} layer!`);
    }
  }
}

/**
 * Complete usage example
 */
export async function runRealizationExample(): Promise<void> {
  console.log('🎵 Schillinger SDK Realization Layer Example');
  console.log('============================================');

  try {
    // 1. Setup realization plane
    console.log('\n1. Setting up realization plane...');
    const plane = setupBasicRealization();
    console.log('✅ Realization plane created');

    // 2. Demonstrate emergence
    console.log('\n2. Demonstrating emergent behavior...');
    demonstrateEmergence(plane);
    console.log('✅ Emergence demonstration complete');

    // 3. DAW integration
    console.log('\n3. DAW integration example...');
    const trackSet = dawIntegration(plane);
    console.log('✅ Track projection complete');

    // 4. Real-time performance (commented out to avoid long running)
    // console.log('\n4. Starting real-time performance...');
    // await realtimePerformance(plane);
    // console.log('✅ Real-time performance complete');

    // 5. Show final statistics
    console.log('\n5. Final plane statistics:');
    const stats = plane.getLayerStatistics();
    console.log('   Layer Statistics:', stats);

    console.log('\n🎉 Realization example completed successfully!');

  } catch (error) {
    console.error('❌ Error in realization example:', error);
  }
}

/**
 * Advanced configuration example
 */
export function advancedConfiguration(): RealizationPlane {
  console.log('Creating advanced realization configuration...');

  // Create custom intensity curve
  const customIntensity = new IntensityField({
    id: 'custom-intensity',
    curveType: 'sine-wave',
    parameters: {
      amplitude: 0.8,
      frequency: 0.3,
      phase: 0,
      duration: 60,
      resolution: 1000
    }
  });

  // Create time range with specific precision
  const advancedTimeWindow = new MusicalTimeRange(
    {
      seconds: 0,
      beats: 0,
      precision: 'beats',
      tempo: 120
    },
    {
      seconds: 30,
      beats: 60,
      precision: 'beats',
      tempo: 120
    }
  );

  // Create high-sensitivity coincidence field
  const sensitiveCoincidence = new CoincidenceField({
    id: 'sensitive-coincidence',
    algorithm: 'pattern-synchronization',
    sensitivity: 0.8,
    lookaheadWindow: 8.0
  });

  // Return advanced plane configuration
  return new RealizationPlane({
    id: 'advanced-plane',
    timeWindow: advancedTimeWindow,
    generators: {
      rhythm: { id: 'advanced-rhythm', generator: null, parameters: { complexity: 0.9 } },
      harmony: { id: 'advanced-harmony', generator: null, parameters: { complexity: 0.8 } },
      contour: { id: 'advanced-contour', generator: null, parameters: { complexity: 0.9 } },
      orchestration: { id: 'advanced-orch', generator: null, parameters: { density: 'dense' } }
    },
    fields: {
      intensity: customIntensity,
      coincidence: sensitiveCoincidence
    },
    traversal: {
      id: 'advanced-traversal',
      duration: { seconds: 60, beats: 120, precision: 'beats' },
      intensityCurve: customIntensity,
      releaseMoments: [
        { time: 15, type: 'cascading', layers: ['texture', 'ornament'], parameters: { cascadeDelay: 0.5 } },
        { time: 30, type: 'staggered', layers: ['melody', 'harmony', 'bass'], parameters: { fadeTime: 3.0 } },
        { time: 45, type: 'gradual', layers: ['rhythm'], parameters: { intensity: 0.3 } }
      ],
      behavior: {
        speed: 1.2,
        smoothing: 0.9,
        elasticity: 0.7
      }
    },
    configuration: {
      layerCapacity: 12,
      coherenceThreshold: 0.6,
      emergenceEnabled: true,
      realtimeMode: true,
      updateRate: 60,
      lookaheadTime: 4.0,
      smoothingFactor: 0.8
    }
  });
}

// Export for use in tests or other modules
export {
  setupBasicRealization,
  realtimePerformance,
  dawIntegration,
  demonstrateEmergence,
  runRealizationExample,
  advancedConfiguration
};

// Run example if this file is executed directly
if (require.main === module) {
  runRealizationExample().catch(console.error);
}