/**
 * Test Factories for Schillinger SDK
 *
 * Provides factory functions for creating test data across all schema types.
 * All factories support deterministic generation via seed parameter.
 */

import {
  UUID,
  Timestamp,
  SchillingerSong,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  EnsembleModel,
  Voice,
  RoleType,
  FunctionalClass,
  SongModel,
  NoteEvent,
  TimelineIR,
  TimelineSection,
  VoiceAssignment,
  PerformanceState,
  ArrangementStyle,
  InstrumentAssignment,
} from '@schillinger-sdk/schemas';

/**
 * Generate deterministic UUID from seed
 */
export function generateUUID(seed: number, suffix: string = ''): UUID {
  const hash = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0');
  return `uuid-${hash}${suffix ? `-${suffix}` : ''}` as UUID;
}

/**
 * Generate deterministic timestamp from seed
 */
export function generateTimestamp(seed: number): Timestamp {
  return Date.now() + seed * 1000;
}

// =============================================================================
// BOOK I - RHYTHM FACTORIES
// =============================================================================

export interface RhythmSystemOptions {
  type?: 'resultant' | 'permutation' | 'density';
  generatorCount?: number;
  period?: number;
  density?: number;
}

export function createRhythmSystem(
  seed: number,
  options: RhythmSystemOptions = {}
): RhythmSystem {
  const {
    type = 'resultant',
    generatorCount = 2,
    period = 4,
    density = 0.5,
  } = options;

  return {
    id: generateUUID(seed, 'rhythm'),
    type,
    generators: Array.from({ length: generatorCount }, (_, i) => ({
      period: period + i,
      phaseOffset: seed % period,
    })),
    resultant: type === 'resultant' ? { pattern: [1, 0, 1, 1] } : undefined,
    permutations: type === 'permutation' ? [[1, 2, 3], [3, 1, 2]] : undefined,
    density: type === 'density' ? density : undefined,
  };
}

export function createResultantRhythm(seed: number): RhythmSystem {
  return createRhythmSystem(seed, { type: 'resultant', generatorCount: 2 });
}

export function createPermutationRhythm(seed: number): RhythmSystem {
  return createRhythmSystem(seed, { type: 'permutation' });
}

export function createDensityRhythm(seed: number, density = 0.5): RhythmSystem {
  return createRhythmSystem(seed, { type: 'density', density });
}

// =============================================================================
// BOOK II - MELODY FACTORIES
// =============================================================================

export interface MelodySystemOptions {
  type?: 'pitch_cycle' | 'interval_seed';
  cycleLength?: number;
  intervalSeeds?: number[][];
}

export function createMelodySystem(
  seed: number,
  options: MelodySystemOptions = {}
): MelodySystem {
  const {
    type = 'pitch_cycle',
    cycleLength = 8,
    intervalSeeds,
  } = options;

  return {
    id: generateUUID(seed, 'melody'),
    type,
    cycleLength: type === 'pitch_cycle' ? cycleLength : undefined,
    intervalSeeds: type === 'interval_seed'
      ? intervalSeeds ?? [[1, 2, 3], [2, 3, 4]]
      : undefined,
    contour: { direction: seed % 2 === 0 ? 'ascending' : 'descending' },
    register: { min: 48, max: 72 },
  };
}

export function createPitchCycleMelody(seed: number, cycleLength = 8): MelodySystem {
  return createMelodySystem(seed, { type: 'pitch_cycle', cycleLength });
}

export function createIntervalSeedMelody(seed: number): MelodySystem {
  return createMelodySystem(seed, { type: 'interval_seed' });
}

// =============================================================================
// BOOK III - HARMONY FACTORIES
// =============================================================================

export interface HarmonySystemOptions {
  type?: 'distribution' | 'chord_class';
  chordClass?: string;
}

export function createHarmonySystem(
  seed: number,
  options: HarmonySystemOptions = {}
): HarmonySystem {
  const {
    type = 'distribution',
    chordClass = 'major',
  } = options;

  return {
    id: generateUUID(seed, 'harmony'),
    type,
    distribution: type === 'distribution' ? { tension: 0.5 } : undefined,
    chordClass: type === 'chord_class' ? chordClass : undefined,
    harmonicRhythm: generateUUID(seed, 'rhythm'),
  };
}

// =============================================================================
// BOOK IV - FORM FACTORIES
// =============================================================================

export interface FormSystemOptions {
  sectionCount?: number;
  ratioTree?: number[];
}

export function createFormSystem(
  seed: number,
  options: FormSystemOptions = {}
): FormSystem {
  const {
    sectionCount = 3,
    ratioTree,
  } = options;

  const sections: FormSystem['sections'] = Array.from(
    { length: sectionCount },
    (_, i) => ({
      id: generateUUID(seed + i, 'section'),
      name: `Section ${String.fromCharCode(65 + i)}`,
      ratio: (i + 1) * 2,
    })
  );

  return {
    id: generateUUID(seed, 'form'),
    ratioTree: ratioTree ?? [1, 1, 2],
    sections,
  };
}

// =============================================================================
// BOOK V - ORCHESTRATION FACTORIES
// =============================================================================

export interface OrchestrationSystemOptions {
  type?: 'role_assignment' | 'register' | 'density' | 'reinforcement';
}

export function createOrchestrationSystem(
  seed: number,
  options: OrchestrationSystemOptions = {}
): OrchestrationSystem {
  const {
    type = 'role_assignment',
  } = options;

  return {
    id: generateUUID(seed, 'orchestration'),
    type,
    roleHierarchy: type === 'role_assignment' ? {
      primary: ['foundation'],
      secondary: ['motion'],
      tertiary: ['ornament'],
    } : undefined,
    functionalClasses: ['foundation', 'motion', 'ornament', 'reinforcement'],
    register: { min: 36, max: 84 },
    density: { min: 0.3, max: 0.8 },
    reinforcement: { enabled: true },
  };
}

// =============================================================================
// ENSEMBLE MODEL FACTORIES
// =============================================================================

export interface EnsembleModelOptions {
  voiceCount?: number;
  groupCount?: number;
}

export function createEnsembleModel(
  seed: number,
  options: EnsembleModelOptions = {}
): EnsembleModel {
  const {
    voiceCount = 4,
    groupCount = 1,
  } = options;

  const voices: Voice[] = Array.from(
    { length: voiceCount },
    (_, i) => ({
      id: generateUUID(seed + i, 'voice'),
      name: `Voice ${i + 1}`,
      rolePools: [
        { role: 'primary' as RoleType, functionalClass: 'foundation' as FunctionalClass, enabled: true },
        { role: 'secondary' as RoleType, functionalClass: 'motion' as FunctionalClass, enabled: true },
        { role: 'tertiary' as RoleType, functionalClass: 'ornament' as FunctionalClass, enabled: false },
      ],
      groupIds: groupCount > 0 ? [generateUUID(seed, 'group')] : [],
    })
  );

  return {
    version: '1.0',
    id: generateUUID(seed, 'ensemble'),
    voices,
    voiceCount,
    groups: groupCount > 0 ? [{
      id: generateUUID(seed, 'group'),
      name: 'Group 1',
      voiceIds: voices.map(v => v.id),
    }] : [],
    balance: {
      priority: [1, 2, 3],
      limits: { maxVoices: voiceCount, maxPolyphony: voiceCount * 2 },
    },
  };
}

// =============================================================================
// SCHILLINGER SONG FACTORIES
// =============================================================================

export interface SchillingerSongOptions {
  rhythmSystemCount?: number;
  melodySystemCount?: number;
  harmonySystemCount?: number;
  orchestrationSystemCount?: number;
  voiceCount?: number;
  seed?: number;
}

export function createMinimalSchillingerSong(
  seed: number = 42
): SchillingerSong {
  const ensemble = createEnsembleModel(seed, { voiceCount: 1 });
  const form = createFormSystem(seed);

  return {
    version: '1.0',
    id: generateUUID(seed, 'song'),
    createdAt: generateTimestamp(seed),
    modifiedAt: generateTimestamp(seed + 1),
    author: 'Test Author',
    name: 'Test Song',
    seed,

    // Minimal: just form and ensemble
    book4: form,
    ensemble,
    bindings: {},
    constraints: { constraints: [] },
    console: {
      version: '1.0',
      id: generateUUID(seed, 'console'),
      voiceBusses: [],
      mixBusses: [],
      masterBus: {
        id: generateUUID(seed, 'master'),
        name: 'Master',
        type: 'master',
        inserts: [],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false,
      },
      routing: { routes: [] },
    },
  };
}

export function createTypicalSchillingerSong(
  seed: number = 42,
  options: SchillingerSongOptions = {}
): SchillingerSong {
  const {
    rhythmSystemCount = 2,
    melodySystemCount = 2,
    harmonySystemCount = 1,
    orchestrationSystemCount = 1,
    voiceCount = 4,
  } = options;

  const book1 = Array.from(
    { length: rhythmSystemCount },
    (_, i) => createResultantRhythm(seed + i)
  );

  const book2 = Array.from(
    { length: melodySystemCount },
    (_, i) => createPitchCycleMelody(seed + i)
  );

  const book3 = Array.from(
    { length: harmonySystemCount },
    (_, i) => createHarmonySystem(seed + i)
  );

  const book4 = createFormSystem(seed);
  const book5 = Array.from(
    { length: orchestrationSystemCount },
    (_, i) => createOrchestrationSystem(seed + i)
  );

  const ensemble = createEnsembleModel(seed, { voiceCount });

  return {
    version: '1.0',
    id: generateUUID(seed, 'song'),
    createdAt: generateTimestamp(seed),
    modifiedAt: generateTimestamp(seed + 1),
    author: 'Test Author',
    name: 'Test Song',
    seed,

    book1,
    book2,
    book3,
    book4,
    book5,
    ensemble,
    bindings: {
      rhythmBindings: book1.map(r => r.id),
      melodyBindings: book2.map(m => m.id),
      harmonyBindings: book3.map(h => h.id),
    },
    constraints: { constraints: [] },
    console: {
      version: '1.0',
      id: generateUUID(seed, 'console'),
      voiceBusses: ensemble.voices.map(v => ({
        id: generateUUID(seed, `bus-${v.id}`),
        name: `${v.name} Bus`,
        type: 'voice',
        inserts: [],
        gain: -6,
        pan: 0,
        muted: false,
        solo: false,
      })),
      mixBusses: [],
      masterBus: {
        id: generateUUID(seed, 'master'),
        name: 'Master',
        type: 'master',
        inserts: [],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false,
      },
      routing: {
        routes: ensemble.voices.map(v => ({
          sourceBusId: generateUUID(seed, `bus-${v.id}`),
          destinationBusId: generateUUID(seed, 'master'),
          level: -6,
          enabled: true,
        })),
      },
    },
  };
}

// =============================================================================
// SONG MODEL FACTORIES
// =============================================================================

export interface SongModelOptions {
  noteCount?: number;
  sectionCount?: number;
  duration?: number;
  tempo?: number;
  timeSignature?: [number, number];
}

export function createMinimalSongModel(
  sourceSongId: UUID,
  derivationId: UUID,
  seed: number = 42
): SongModel {
  return {
    version: '1.0',
    id: generateUUID(seed, 'song-model'),
    sourceSongId,
    derivationId,

    timeline: {
      sections: [{
        id: generateUUID(seed, 'section'),
        name: 'A',
        startTime: 0,
        duration: 44100 * 4 * 60, // 4 bars at 60 BPM
        tempo: 60,
        timeSignature: [4, 4],
      }],
      tempo: 60,
      timeSignature: [4, 4],
    },

    notes: [],

    duration: 44100 * 4 * 60,
    tempo: 60,
    timeSignature: [4, 4],
    sampleRate: 44100,

    voiceAssignments: [],
    console: {
      version: '1.0',
      id: generateUUID(seed, 'console'),
      voiceBusses: [],
      mixBusses: [],
      masterBus: {
        id: generateUUID(seed, 'master'),
        name: 'Master',
        type: 'master',
        inserts: [],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false,
      },
      routing: { routes: [] },
    },

    performances: [],
    derivedAt: generateTimestamp(seed),
  };
}

export function createTypicalSongModel(
  sourceSongId: UUID,
  derivationId: UUID,
  seed: number = 42,
  options: SongModelOptions = {}
): SongModel {
  const {
    noteCount = 100,
    sectionCount = 3,
    duration = 44100 * 16 * 60,
    tempo = 120,
    timeSignature = [4, 4] as [number, number],
  } = options;

  const notes: NoteEvent[] = Array.from(
    { length: noteCount },
    (_, i) => ({
      id: generateUUID(seed + i, 'note'),
      voiceId: generateUUID(i % 4, 'voice'),
      startTime: (i * duration) / noteCount,
      duration: 44100 * 60 / tempo,
      pitch: 60 + (i % 24),
      velocity: 0.7 + (seed % 30) / 100,
      derivation: {
        systemType: 'rhythm',
        systemId: generateUUID(seed, 'rhythm'),
        confidence: 0.9,
      },
    })
  );

  const sections: TimelineSection[] = Array.from(
    { length: sectionCount },
    (_, i) => ({
      id: generateUUID(seed + i, 'section'),
      name: `Section ${String.fromCharCode(65 + i)}`,
      startTime: (i * duration) / sectionCount,
      duration: duration / sectionCount,
      tempo,
      timeSignature,
    })
  );

  const voiceAssignments: VoiceAssignment[] = Array.from(
    { length: 4 },
    (_, i) => ({
      voiceId: generateUUID(i, 'voice'),
      instrumentId: 'LocalGal',
      presetId: 'default',
      busId: generateUUID(i, 'bus'),
    })
  );

  return {
    version: '1.0',
    id: generateUUID(seed, 'song-model'),
    sourceSongId,
    derivationId,

    timeline: {
      sections,
      tempo,
      timeSignature,
    },

    notes,
    duration,
    tempo,
    timeSignature,
    sampleRate: 44100,

    voiceAssignments,
    console: {
      version: '1.0',
      id: generateUUID(seed, 'console'),
      voiceBusses: voiceAssignments.map(va => ({
        id: va.busId,
        name: `Voice ${va.instrumentId} Bus`,
        type: 'voice',
        inserts: [],
        gain: -6,
        pan: 0,
        muted: false,
        solo: false,
      })),
      mixBusses: [],
      masterBus: {
        id: generateUUID(seed, 'master'),
        name: 'Master',
        type: 'master',
        inserts: [],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false,
      },
      routing: {
        routes: voiceAssignments.map(va => ({
          sourceBusId: va.busId,
          destinationBusId: generateUUID(seed, 'master'),
          level: -6,
          enabled: true,
        })),
      },
    },

    performances: [],
    derivedAt: generateTimestamp(seed),
  };
}

// =============================================================================
// PERFORMANCE STATE FACTORIES
// =============================================================================

export interface PerformanceStateOptions {
  arrangementStyle?: ArrangementStyle;
  density?: number;
  instrumentCount?: number;
}

export function createMinimalPerformanceState(
  seed: number = 42
): PerformanceState {
  return {
    version: '1',
    id: generateUUID(seed, 'performance'),
    name: 'Minimal Performance',
    arrangementStyle: ArrangementStyle.SOLO_PIANO,
    density: 0.5,
    grooveProfileId: 'default',
    instrumentationMap: {},
    consoleXProfileId: 'default',
    mixTargets: {},
    createdAt: new Date(generateTimestamp(seed)).toISOString(),
    modifiedAt: new Date(generateTimestamp(seed + 1)).toISOString(),
  };
}

export function createTypicalPerformanceState(
  seed: number = 42,
  options: PerformanceStateOptions = {}
): PerformanceState {
  const {
    arrangementStyle = ArrangementStyle.CHAMBER_ENSEMBLE,
    density = 0.6,
    instrumentCount = 4,
  } = options;

  const instrumentationMap: Record<string, InstrumentAssignment> = {};
  const mixTargets: Record<string, { gain: number; pan: number }> = {};

  const roles = ['primary', 'secondary', 'tertiary'] as const;

  for (let i = 0; i < instrumentCount; i++) {
    const role = roles[i % roles.length];
    instrumentationMap[role] = {
      instrumentId: i === 0 ? 'LocalGal' : 'KaneMarco',
      presetId: 'default',
    };
    mixTargets[role] = {
      gain: -6 + i * 2,
      pan: (i % 2 === 0 ? -1 : 1) * (i * 0.2),
    };
  }

  return {
    version: '1',
    id: generateUUID(seed, 'performance'),
    name: 'Typical Performance',
    arrangementStyle,
    density,
    grooveProfileId: 'default',
    instrumentationMap,
    consoleXProfileId: 'default',
    mixTargets,
    createdAt: new Date(generateTimestamp(seed)).toISOString(),
    modifiedAt: new Date(generateTimestamp(seed + 1)).toISOString(),
    metadata: {
      test: true,
    },
  };
}

export function createPianoPerformance(seed: number = 42): PerformanceState {
  return createTypicalPerformanceState(seed, {
    arrangementStyle: ArrangementStyle.SOLO_PIANO,
    density: 0.7,
    instrumentCount: 1,
  });
}

export function createSATBPerformance(seed: number = 42): PerformanceState {
  return createTypicalPerformanceState(seed, {
    arrangementStyle: ArrangementStyle.SATB,
    density: 0.5,
    instrumentCount: 4,
  });
}

export function createOrchestralPerformance(seed: number = 42): PerformanceState {
  return createTypicalPerformanceState(seed, {
    arrangementStyle: ArrangementStyle.FULL_ORCHESTRA,
    density: 0.8,
    instrumentCount: 12,
  });
}

// =============================================================================
// ERROR SCENARIO FACTORIES
// =============================================================================

export function createInvalidSchillingerSong(seed: number = 42): Partial<SchillingerSong> {
  return {
    version: '1.0',
    id: generateUUID(seed, 'song'),
    createdAt: generateTimestamp(seed),
    modifiedAt: generateTimestamp(seed + 1),
    author: 'Test Author',
    name: 'Invalid Song',
    seed,
    // Missing required fields
  } as Partial<SchillingerSong>;
}

export function createCorruptedSongModel(seed: number = 42): Partial<SongModel> {
  return {
    version: '1.0',
    id: generateUUID(seed, 'song-model'),
    sourceSongId: generateUUID(seed, 'song'),
    derivationId: generateUUID(seed, 'derivation'),
    // Missing required fields
  } as Partial<SongModel>;
}

// =============================================================================
// PERFORMANCE TEST DATA
// =============================================================================

export function createLargeSongModel(
  sourceSongId: UUID,
  derivationId: UUID,
  seed: number = 42
): SongModel {
  return createTypicalSongModel(sourceSongId, derivationId, seed, {
    noteCount: 10000,
    sectionCount: 10,
    duration: 44100 * 60 * 5, // 5 minutes at 44100
  });
}

export function createComplexPerformanceEnsemble(
  seed: number = 42
): PerformanceState[] {
  return [
    createPianoPerformance(seed),
    createSATBPerformance(seed + 1),
    createOrchestralPerformance(seed + 2),
    createTypicalPerformanceState(seed + 3, {
      arrangementStyle: ArrangementStyle.JAZZ_TRIO,
      density: 0.6,
      instrumentCount: 3,
    }),
    createTypicalPerformanceState(seed + 4, {
      arrangementStyle: ArrangementStyle.AMBIENT_TECHNO,
      density: 0.4,
      instrumentCount: 6,
    }),
  ];
}
