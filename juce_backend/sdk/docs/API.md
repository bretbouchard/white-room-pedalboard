# Schillinger SDK v2.0 API Documentation

## Overview

The Schillinger SDK v2.0 introduces revolutionary new APIs for the Moving Sidewalk Realization System alongside enhanced Generator APIs. All existing v1.x APIs remain fully compatible.

## Table of Contents

- [Getting Started](#getting-started)
- [Generator APIs](#generator-apis)
- [Moving Sidewalk Realization APIs](#moving-sidewalk-realization-apis)
- [Backward Compatibility](#backward-compatibility)
- [Type Reference](#type-reference)
- [Examples](#examples)

## Getting Started

### Installation

```bash
npm install @schillinger-sdk/core@2.0.0
npm install @schillinger-sdk/shared@2.0.0
```

### Basic Setup

```typescript
import { SchillingerSDK } from '@schillinger-sdk/core';

const sdk = new SchillingerSDK({
  generators: {
    rhythm: { enabled: true },
    harmony: { enabled: true },
    melody: { enabled: true },
    composition: { enabled: true }
  }
});
```

## Generator APIs

The Generator architecture provides a class-based, stateful approach to musical generation that extends the original functional Agent APIs.

### BaseGenerator

All generators extend the `BaseGenerator` abstract class:

```typescript
abstract class BaseGenerator<TConfig, TParams> {
  protected config: TConfig;
  protected parameters: TParams;
  protected sdk: SchillingerSDK;

  // Core methods
  abstract getDefaultConfig(): TConfig;
  abstract getDefaultParameters(): TParams;
  abstract generate<T>(params: TParams): GeneratorResult<T>;

  // Utility methods
  updateParameters(newParams: Partial<TParams>): void;
  createResult<T>(data: T, methodParams: Record<string, any>): GeneratorResult<T>;
  reset(): void;
  getState(): GeneratorState;
}
```

### RhythmGenerator

```typescript
class RhythmGenerator extends BaseGenerator<RhythmConfig, RhythmParams> {

  // Core generation methods
  generateResultant(params: RhythmResultantParams): GeneratorResult<RhythmResultant> {
    return this.createResult(resultantData, params);
  }

  generateComplex(params: RhythmComplexParams): GeneratorResult<RhythmComplex> {
    return this.createResult(complexData, params);
  }

  // Analysis methods
  analyzePattern(pattern: number[]): RhythmAnalysis;
  inferGenerators(rhythm: RhythmResultant): RhythmGenerator[];

  // Advanced methods
  generateSymmetricResultant(params: SymmetricResultantParams): GeneratorResult<RhythmResultant>;
  generateLayeredResultant(params: LayeredResultantParams): GeneratorResult<RhythmLayered>;
}
```

#### RhythmGenerator Examples

```typescript
// Basic resultant generation
const rhythmResult = sdk.generators.rhythm.generateResultant({
  period: 8,
  primaryAccents: [0, 3],
  secondaryAccents: [2, 6]
});

// Complex rhythm generation
const complexRhythm = sdk.generators.rhythm.generateComplex({
  resultants: [rhythmResult.data],
  coordination: 'parallel',
  layering: 'sequential'
});

// Pattern analysis
const analysis = sdk.generators.rhythm.analyzePattern([1, 0, 1, 0, 1, 1, 0, 1]);
console.log(analysis.density); // 0.75
console.log(analysis.symmetry); // true
```

### HarmonyGenerator

```typescript
class HarmonyGenerator extends BaseGenerator<HarmonyConfig, HarmonyParams> {

  // Harmonic generation
  generateHarmonicProgression(params: HarmonyProgressionParams): GeneratorResult<HarmonicProgression> {
    return this.createResult(progressionData, params);
  }

  generateChordSeries(params: ChordSeriesParams): GeneratorResult<ChordSeries> {
    return this.createResult(chordData, params);
  }

  generateVoiceLeading(params: VoiceLeadingParams): GeneratorResult<VoiceLeading> {
    return this.createResult(voiceLeadingData, params);
  }

  // Analysis methods
  analyzeHarmony(harmony: Harmony): HarmonyAnalysis;
  generateModulation(params: ModulationParams): GeneratorResult<Modulation>;
}
```

#### HarmonyGenerator Examples

```typescript
// Generate harmonic progression
const progression = sdk.generators.harmony.generateHarmonicProgression({
  key: 'C',
  scale: 'major',
  progression: 'I-IV-V-I',
  voiceLeading: 'optimal'
});

// Generate chord series with tensions
const chords = sdk.generators.harmony.generateChordSeries({
  baseProgression: progression.data,
  tensions: { add9: true, add11: false, add13: true },
  inversions: 'automatic'
});

// Voice leading analysis
const voiceLeading = sdk.generators.harmony.generateVoiceLeading({
  fromChords: chords.data.slice(0, -1),
  toChords: chords.data.slice(1),
  style: 'classical'
});
```

### MelodyGenerator

```typescript
class MelodyGenerator extends BaseGenerator<MelodyConfig, MelodyParams> {

  // Melodic generation
  generateContour(params: MelodyContourParams): GeneratorResult<MelodyContour> {
    return this.createResult(contourData, params);
  }

  generateMotif(params: MotifParams): GeneratorResult<MelodyMotif> {
    return this.createResult(motifData, params);
  }

  generateMelody(params: MelodyParams): GeneratorResult<Melody> {
    return this.createResult(melodyData, params);
  }

  // Analysis methods
  analyzeMelody(melody: Melody): MelodyAnalysis;
  generateVariation(params: MelodyVariationParams): GeneratorResult<Melody>;
}
```

#### MelodyGenerator Examples

```typescript
// Generate melodic contour
const contour = sdk.generators.melody.generateContour({
  generator: rhythmResult.data,
  direction: 'upward',
  range: [60, 84], // MIDI note range
  shape: 'arch'
});

// Generate melodic motif
const motif = sdk.generators.melody.generateMotif({
  contour: contour.data,
  harmonicContext: chords.data,
  rhythmicStructure: rhythmResult.data,
  style: 'lyrical'
});

// Generate complete melody
const melody = sdk.generators.melody.generateMelody({
  motifs: [motif.data],
  development: 'thematic',
  register: 'middle',
  articulation: 'legato'
});
```

### CompositionGenerator

```typescript
class CompositionGenerator extends BaseGenerator<CompositionConfig, CompositionParams> {

  // Unified composition generation
  generateUnifiedResultant(params: UnifiedResultantParams): GeneratorResult<UnifiedResultant> {
    return this.createResult(unifiedData, params);
  }

  generateComposition(params: CompositionParams): GeneratorResult<Composition> {
    return this.createResult(compositionData, params);
  }

  // Orchestration
  generateOrchestration(params: OrchestrationParams): GeneratorResult<Orchestration>;

  // Analysis
  analyzeComposition(composition: Composition): CompositionAnalysis;
}
```

#### CompositionGenerator Examples

```typescript
// Generate unified resultant
const unifiedResultant = sdk.generators.composition.generateUnifiedResultant({
  rhythmGen: sdk.generators.rhythm,
  harmonyGen: sdk.generators.harmony,
  melodyGen: sdk.generators.melody,
  coordination: 'fugal'
});

// Generate complete composition
const composition = sdk.generators.composition.generateComposition({
  unifiedResultant: unifiedResultant.data,
  form: 'sonata',
  orchestration: 'string_quartet',
  duration: 240 // seconds
});
```

## Moving Sidewalk Realization APIs

The revolutionary Moving Sidewalk Realization System creates continuous musical time projection from discrete Schillinger patterns.

### RealizationPlane

The core of the Moving Sidewalk system:

```typescript
class RealizationPlane {
  constructor(config: RealizationPlaneConfig);

  // Core realization method - the "moving sidewalk"
  realize(atTime: MusicalTime): RealizedFrame {
    this.updateTimeWindow(atTime);
    const intensity = this.fields.intensity.getValueAt(atTime.seconds);
    const convergence = this.fields.coincidence?.hasConvergence(atTime.seconds);
    const layers = this.generateLayers(atTime, intensity, convergence);

    return {
      time: atTime,
      layers,
      coherenceScore: this.calculateCoherence(layers),
      convergenceFlags: this.detectConvergenceHints(atTime),
      metadata: {
        intensity,
        energy: this.calculateEnergy(layers),
        density: layers.length
      }
    };
  }

  // Window management
  slideWindow(newPosition: MusicalTime): void;
  getWindowDuration(): number;
  setWindowElasticity(elasticity: number): void;

  // Layer management
  addLayer(layer: RealizedLayer): void;
  removeLayer(layerId: string): void;
  getActiveLayers(): RealizedLayer[];

  // Track projection
  project(layers: RealizedLayer[]): TrackSet {
    return this.createTrackProjection(layers);
  }

  // State management
  getState(): RealizationState;
  reset(): void;
}
```

#### RealizationPlane Examples

```typescript
// Create a realization plane
const plane = new RealizationPlane({
  id: 'main-realization',
  timeWindow: {
    start: { seconds: 0 },
    end: { seconds: 10 },
    duration: 10
  },
  generators: {
    rhythm: { id: 'rhythm-gen', generator: rhythmGen, parameters: {} },
    harmony: { id: 'harmony-gen', generator: harmonyGen, parameters: {} },
    melody: { id: 'melody-gen', generator: melodyGen, parameters: {} }
  },
  fields: {
    intensity: new IntensityField({
      id: 'main-intensity',
      values: [0.2, 0.4, 0.7, 1.0, 0.8, 0.5, 0.3],
      timePoints: [0, 10, 20, 30, 40, 50, 60],
      interpolation: 'cubic'
    }),
    coincidence: new CoincidenceField({
      id: 'coincidence-field',
      convergencePoints: [
        { time: 30, strength: 0.9, participatingLayers: ['rhythm', 'harmony'] },
        { time: 60, strength: 1.0, participatingLayers: ['rhythm', 'harmony', 'melody'] }
      ]
    }),
    orchestra: new OrchestraField({
      id: 'orchestra-field',
      instruments: [/* instrument specifications */],
      constraints: {
        registerOverlap: 6,
        doublingTolerance: 2,
        densityLimit: 8
      }
    })
  },
  traversal: {
    duration: { seconds: 60 },
    intensityCurve: /* intensity field */,
    releaseMoments: [
      {
        time: 30,
        type: 'gradual',
        layers: ['rhythm', 'harmony'],
        parameters: { fadeTime: 5 }
      }
    ],
    behavior: {
      speed: 1.0,
      smoothing: 0.8,
      elasticity: 0.3
    }
  },
  configuration: {
    layerCapacity: 12,
    coherenceThreshold: 0.6,
    emergenceEnabled: true,
    realtimeMode: true
  }
});

// Realize musical material at specific time
const frame1 = plane.realize({ seconds: 15.5 });
console.log(`Frame has ${frame1.layers.length} active layers`);
console.log(`Coherence score: ${frame1.coherenceScore}`);

// Realize at convergence point
const frame2 = plane.realize({ seconds: 30.0 });
if (frame2.convergenceFlags.approachingConvergence) {
  console.log('Approaching convergence point!');
}

// Slide the window forward
plane.slideWindow({ seconds: 20.0 });

// Project layers to tracks for DAW export
const tracks = plane.project(frame1.layers);
console.log(`Created ${tracks.tracks.length} output tracks`);
```

### IntensityField

Manages dynamic intensity evolution over time:

```typescript
class IntensityField {
  constructor(config: IntensityFieldConfig);

  // Core methods
  getValueAt(time: number): number;
  getGradientAt(time: number): number;
  getCurvatureAt(time: number): number;

  // Projection methods
  projectForward(fromTime: number, duration: number): IntensityProjection;
  projectToTarget(startTime: number, targetIntensity: number): IntensityPath;

  // Modification methods
  addControlPoint(time: number, intensity: number): void;
  removeControlPoint(time: number): void;
  setInterpolation(method: 'linear' | 'cubic' | 'exponential'): void;
}
```

#### IntensityField Examples

```typescript
// Create intensity field
const intensityField = new IntensityField({
  id: 'dynamics',
  values: [0.1, 0.3, 0.8, 1.0, 0.6, 0.2],
  timePoints: [0, 10, 25, 45, 60, 80],
  interpolation: 'cubic'
});

// Get intensity at specific time
const intensity = intensityField.getValueAt(30.5); // ~0.65

// Get intensity gradient (rate of change)
const gradient = intensityField.getProjectedAt(30.5); // positive if increasing

// Project intensity curve forward
const projection = intensityField.projectForward(30.0, 10.0);
console.log(`Projected intensity: ${projection.targetIntensity}`);

// Create intensity path to target
const path = intensityField.projectToTarget(30.0, 0.9);
console.log(`Time to reach target: ${path.duration} seconds`);
```

### CoincidenceField

Detects and manages convergence points:

```typescript
class CoincidenceField {
  constructor(config: CoincidenceFieldConfig);

  // Convergence detection
  hasConvergence(time: number, tolerance: number = 1.0): boolean;
  getNearestConvergence(time: number): ConvergencePoint | null;
  getUpcomingConvergences(fromTime: number): ConvergencePoint[];

  // Convergence analysis
  analyzeConvergenceStrength(layers: string[], timeWindow: TimeRange): ConvergenceAnalysis;
  predictConvergences(timeWindow: TimeRange): PredictedConvergence[];

  // Convergence management
  addConvergencePoint(point: ConvergencePoint): void;
  removeConvergencePoint(time: number): void;
  modifyConvergenceStrength(time: number, strength: number): void;
}
```

#### CoincidenceField Examples

```typescript
// Create coincidence field
const coincidenceField = new CoincidenceField({
  id: 'convergence-detector',
  convergencePoints: [
    { time: 30, strength: 0.8, layers: ['rhythm', 'harmony'], type: 'cadence' },
    { time: 60, strength: 1.0, layers: ['rhythm', 'harmony', 'melody'], type: 'climax' }
  ]
});

// Check for convergence
if (coincidenceField.hasConvergence(30.5, 2.0)) {
  console.log('Within convergence window');
}

// Get nearest convergence
const nearest = coincidenceField.getNearestConvergence(45.0);
if (nearest) {
  console.log(`Nearest convergence at ${nearest.time}s with strength ${nearest.strength}`);
}

// Analyze convergence potential
const analysis = coincidenceField.analyzeConvergenceStrength(
  ['rhythm', 'harmony', 'melody'],
  { start: { seconds: 25 }, end: { seconds: 35 }, duration: 10 }
);
console.log(`Convergence probability: ${analysis.probability}`);
```

### OrchestraField

Manages instrument constraints and role assignments:

```typescript
class OrchestraField {
  constructor(config: OrchestraFieldConfig);

  // Instrument management
  getInstrumentsForRole(role: MusicalRole): InstrumentSpec[];
  areRegistersCompatible(inst1: InstrumentSpec, inst2: InstrumentSpec): boolean;
  assignRoleToInstrument(role: MusicalRole, instrument: InstrumentSpec): void;

  // Constraint management
  checkConstraints(assignment: RoleAssignment): ConstraintViolation[];
  optimizeAssignment(layers: RealizedLayer[]): OptimizedAssignment;

  // Register management
  getAvailableRegister(instrument: InstrumentSpec): RegisterRange;
  reserveRegister(instrument: InstrumentSpec, register: RegisterRange): void;
  releaseRegister(instrument: InstrumentSpec, register: RegisterRange): void;
}
```

#### OrchestraField Examples

```typescript
// Create orchestra field
const orchestraField = new OrchestraField({
  id: 'orchestra',
  instruments: [
    {
      id: 'violin1',
      name: 'Violin I',
      family: 'strings',
      register: { min: 55, max: 96, center: 75, width: 41 },
      capabilities: {
        roles: ['melody', 'harmony', 'counter-melody'],
        techniques: ['pizzicato', 'col-legno', 'sul-ponticello'],
        expressions: ['legato', 'staccato', 'spiccato']
      }
    }
    // ... more instruments
  ],
  constraints: {
    registerOverlap: 6,
    doublingTolerance: 2,
    densityLimit: 8,
    balanceWeight: {
      melody: 1.0,
      harmony: 0.8,
      bass: 0.9,
      rhythm: 0.6
    }
  }
});

// Get instruments for melody role
const melodyInstruments = orchestraField.getInstrumentsForRole('melody');
console.log(`Melody instruments: ${melodyInstruments.map(i => i.name).join(', ')}`);

// Assign role to instrument
orchestraField.assignRoleToInstrument('melody', melodyInstruments[0]);

// Optimize layer assignment
const optimized = orchestraField.optimizeAssignment(realizedLayers);
console.log(`Optimized assignment score: ${optimized.score}`);
```

## Backward Compatibility

All existing v1.x APIs continue to work unchanged:

```typescript
// Original Agent APIs still work
const rhythmResult = sdk.rhythm.generateResultant(8, [0, 3], [2, 6]);
const harmonyResult = sdk.harmony.generateHarmonicProgression('C', 'major', [1, 4, 5, 1]);
const melodyResult = sdk.melody.generateContour(rhythmResult, 'upward', [60, 84]);

// Original analysis APIs
const patternAnalysis = sdk.rhythm.analyzePattern([1, 0, 1, 0, 1, 1, 0, 1]);
const harmonyAnalysis = sdk.harmony.analyzeHarmony(harmonyResult);
```

## Type Reference

### Core Types

```typescript
// Musical time representation
interface MusicalTime {
  seconds: number;
  beats?: number;
  measures?: number;
  precision?: 'seconds' | 'samples' | 'ticks';
}

// Time range for operations
interface TimeRange {
  start: MusicalTime;
  end: MusicalTime;
  duration: number;
  contains(time: MusicalTime): boolean;
  overlap(other: TimeRange): TimeRange | null;
  slide(delta: number): TimeRange;
}

// Musical roles (instead of tracks)
type MusicalRole =
  | 'bass' | 'harmony' | 'melody' | 'counter-melody'
  | 'rhythm' | 'texture' | 'ornament' | 'lead' | 'accompaniment';
```

### Generator Types

```typescript
// Generator result with metadata
interface GeneratorResult<T> {
  data: T;
  metadata: {
    generatorId: string;
    timestamp: number;
    parameters: Record<string, any>;
    processingTime: number;
    success: boolean;
    errors?: string[];
  };
}

// Generator state
interface GeneratorState {
  id: string;
  isActive: boolean;
  lastGenerated: number;
  parameters: Record<string, any>;
  performance: {
    averageProcessingTime: number;
    successRate: number;
    totalGenerations: number;
  };
}
```

### Realization Types

```typescript
// Realized musical layer
interface RealizedLayer {
  id: string;
  role: MusicalRole;
  generatorId: string;
  material: MusicalMaterial; // Array of MusicalEvent
  register: RegisterRange;
  energy: number;
  coherence: number;
  emergence: number;
  metadata: {
    intensity?: number;
    complexity?: number;
    convergenceHints?: ConvergenceHints;
  };
}

// Realized frame (snapshot in time)
interface RealizedFrame {
  time: MusicalTime;
  layers: RealizedLayer[];
  coherenceScore: number;
  convergenceFlags: ConvergenceHints;
  metadata: {
    intensity?: number;
    energy?: number;
    density?: number;
  };
}

// Track projection to output
interface TrackProjection {
  id: string;
  name: string;
  layers: string[];
  instrument?: InstrumentSpec;
  output: {
    format: 'midi' | 'audio' | 'daw';
    channel?: number;
    bus?: string;
  };
  parameters: {
    volume: number;
    pan: number;
    reverb?: number;
    effects?: Record<string, number>;
  };
}
```

## Examples

### Complete Workflow Example

```typescript
import { SchillingerSDK, RealizationPlane, IntensityField } from '@schillinger-sdk/core';

// Initialize SDK with generators
const sdk = new SchillingerSDK({
  generators: {
    rhythm: { enabled: true },
    harmony: { enabled: true },
    melody: { enabled: true },
    composition: { enabled: true }
  }
});

// Generate base musical material
const rhythmResult = sdk.generators.rhythm.generateResultant({
  period: 8,
  primaryAccents: [0, 3],
  secondaryAccents: [2, 6]
});

const harmonyProgression = sdk.generators.harmony.generateHarmonicProgression({
  key: 'C',
  scale: 'major',
  progression: 'I-IV-V-I',
  voiceLeading: 'optimal'
});

const melodyContour = sdk.generators.melody.generateContour({
  generator: rhythmResult.data,
  direction: 'upward',
  range: [60, 84],
  harmonicContext: harmonyProgression.data
});

// Create Moving Sidewalk realization
const plane = new RealizationPlane({
  id: 'composition-realization',
  timeWindow: {
    start: { seconds: 0 },
    end: { seconds: 12 },
    duration: 12
  },
  generators: {
    rhythm: { id: 'rhythm-gen', generator: sdk.generators.rhythm, parameters: {} },
    harmony: { id: 'harmony-gen', generator: sdk.generators.harmony, parameters: {} },
    melody: { id: 'melody-gen', generator: sdk.generators.melody, parameters: {} }
  },
  fields: {
    intensity: new IntensityField({
      id: 'composition-intensity',
      values: [0.3, 0.5, 0.8, 1.0, 0.7, 0.4],
      timePoints: [0, 20, 40, 60, 80, 100],
      interpolation: 'cubic'
    })
  },
  traversal: {
    duration: { seconds: 100 },
    intensityCurve: /* intensity field */,
    releaseMoments: [
      {
        time: 60,
        type: 'gradual',
        layers: ['rhythm', 'harmony'],
        parameters: { fadeTime: 8 }
      }
    ],
    behavior: { speed: 1.0, smoothing: 0.7, elasticity: 0.4 }
  },
  configuration: {
    layerCapacity: 8,
    coherenceThreshold: 0.6,
    emergenceEnabled: true,
    realtimeMode: true
  }
});

// Realize composition at different time points
const frames = [];
for (let t = 0; t < 100; t += 5) {
  const frame = plane.realize({ seconds: t });
  frames.push(frame);

  console.log(`Time ${t}s: ${frame.layers.length} layers, coherence: ${frame.coherenceScore}`);

  if (frame.convergenceFlags.approachingConvergence) {
    console.log(`  → Approaching ${frame.convergenceFlags.convergenceType} at ${frame.convergenceFlags.convergenceTime}s`);
  }
}

// Export final tracks
const finalFrame = frames[frames.length - 1];
const tracks = plane.project(finalFrame.layers);

console.log(`Generated ${tracks.tracks.length} output tracks ready for DAW export`);
```

### Real-time Application Example

```typescript
// Real-time music generation application
class RealtimeMusicApp {
  private plane: RealizationPlane;
  private isPlaying = false;
  private currentTime = 0;

  constructor(sdk: SchillingerSDK) {
    this.plane = new RealizationPlane({
      // ... configuration for real-time use
      configuration: {
        layerCapacity: 6,
        coherenceThreshold: 0.5,
        emergenceEnabled: true,
        realtimeMode: true
      }
    });
  }

  startPlayback() {
    this.isPlaying = true;
    this.scheduleNextFrame();
  }

  private scheduleNextFrame() {
    if (!this.isPlaying) return;

    // Realize current frame
    const frame = this.plane.realize({ seconds: this.currentTime });

    // Process frame (send to audio engine, update UI, etc.)
    this.processFrame(frame);

    // Advance time
    this.currentTime += 0.1; // 100ms frames

    // Schedule next frame
    setTimeout(() => this.scheduleNextFrame(), 100);
  }

  private processFrame(frame: RealizedFrame) {
    // Send musical events to audio engine
    frame.layers.forEach(layer => {
      layer.material.forEach(event => {
        this.scheduleAudioEvent(event);
      });
    });

    // Update UI visualization
    this.updateVisualization(frame);

    // Check for convergence events
    if (frame.convergenceFlags.approachingConvergence) {
      this.triggerConvergenceEvent(frame.convergenceFlags);
    }
  }

  private scheduleAudioEvent(event: MusicalEvent) {
    // Send MIDI/audio data to real-time audio engine
    // Implementation depends on audio backend
  }

  private updateVisualization(frame: RealizedFrame) {
    // Update UI with current frame data
    // Layer colors, intensity meters, convergence indicators
  }

  private triggerConvergenceEvent(hints: ConvergenceHints) {
    // Trigger visual/audio effects for convergence points
    console.log(`Convergence event: ${hints.convergenceType}`);
  }
}
```

## Migration Guide

### From v1.x to v2.0

The migration is straightforward since all v1.x APIs remain fully functional:

1. **Update package versions**:
   ```bash
   npm install @schillinger-sdk/core@2.0.0
   ```

2. **Optional: Start using Generator APIs**:
   ```typescript
   // Old way (still works)
   const result = sdk.rhythm.generateResultant(8, [0, 3], [2, 6]);

   // New way (recommended)
   const result = sdk.generators.rhythm.generateResultant({
     period: 8,
     primaryAccents: [0, 3],
     secondaryAccents: [2, 6]
   });
   ```

3. **Optional: Add Moving Sidewalk realization**:
   ```typescript
   const plane = new RealizationPlane({
     // ... configuration
   });

   const frame = plane.realize({ seconds: 30.0 });
   ```

All existing code will continue to work without any changes required.

---

## Support

For additional support:

- **Documentation**: [Complete API reference](https://docs.schillinger-sdk.com)
- **Examples**: [GitHub examples repository](https://github.com/schillinger-sdk/examples)
- **Community**: [Discord server](https://discord.gg/schillinger-sdk)
- **Issues**: [GitHub issues](https://github.com/schillinger-sdk/issues)