/**
 * SongState V1 - Derived musical state from SongContract
 *
 * This represents the derived executable song with notes, timeline,
 * and performance parameters.
 *
 * Supports multiple performance interpretations via the performances array.
 */

import type { PerformanceState_v1 } from './performance_state.js';

export interface SongStateV1 {
  readonly version: '1.0';
  readonly id: string;
  readonly sourceContractId: string;
  readonly derivationId: string;
  readonly timeline: Timeline;
  readonly notes: NoteEvent[];
  readonly automations: Automation[];
  readonly duration: number;
  readonly tempo: number;
  readonly timeSignature: [number, number];
  readonly sampleRate: number;
  readonly voiceAssignments: VoiceAssignment[];
  readonly console: ConsoleModel;
  readonly presets: PresetAssignment[];
  readonly derivedAt: number;
  readonly performances: PerformanceState_v1[];
  readonly activePerformanceId: string;
}

export interface Timeline {
  readonly sections: readonly TimelineSection[];
  readonly tempo: number;
  readonly timeSignature: [number, number];
}

export interface TimelineSection {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly tempo: number;
  readonly timeSignature: [number, number];
}

export interface NoteEvent {
  readonly id: string;
  readonly voiceId: string;
  readonly startTime: number;
  readonly duration: number;
  readonly pitch: number;
  readonly velocity: number;
  readonly derivation?: NoteDerivation;
}

export interface NoteDerivation {
  readonly systemType: 'rhythm' | 'melody' | 'harmony';
  readonly systemId: string;
  readonly confidence: number;
  readonly metadata?: Record<string, unknown>;
}

export interface Automation {
  readonly id: string;
  readonly parameter: string;
  readonly points: readonly AutomationPoint[];
}

export interface AutomationPoint {
  readonly time: number;
  readonly value: number;
  readonly curve?: 'linear' | 'exponential' | 'step';
}

export interface VoiceAssignment {
  readonly voiceId: string;
  readonly instrumentId: string;
  readonly presetId: string;
  readonly busId: string;
}

export interface PresetAssignment {
  readonly instrumentType: string;
  readonly presetId: string;
}

export interface ConsoleModel {
  readonly version: '1.0';
  readonly id: string;
  readonly voiceBusses: readonly Bus[];
  readonly mixBusses: readonly Bus[];
  readonly masterBus: Bus;
  readonly sendEffects: readonly SendEffect[];
  readonly routing: RoutingMatrix;
  readonly metering: MeteringConfig;
}

export type BusType = 'voice' | 'mix' | 'master';

export interface Bus {
  readonly id: string;
  readonly name: string;
  readonly type: BusType;
  readonly inserts: readonly EffectSlot[];
  readonly gain: number;
  readonly pan: number;
  readonly muted: boolean;
  readonly solo: boolean;
}

export interface EffectSlot {
  readonly id: string;
  readonly effectType: string;
  readonly enabled: boolean;
  readonly bypassed: boolean;
  readonly parameters: Record<string, number>;
  readonly automation?: string;
}

export interface SendEffect {
  readonly id: string;
  readonly busId: string;
  readonly effectType: string;
  readonly enabled: boolean;
  readonly parameters: Record<string, number>;
  readonly sends: readonly Send[];
}

export interface Send {
  readonly sourceBusId: string;
  readonly level: number;
  readonly pan: number;
}

export interface RoutingMatrix {
  readonly routes: readonly Route[];
}

export interface Route {
  readonly sourceBusId: string;
  readonly destinationBusId: string;
  readonly level: number;
  readonly enabled: boolean;
}

export interface MeteringConfig {
  readonly enabled: boolean;
  readonly refreshRate: number;
  readonly meterType: 'peak' | 'rms' | 'both';
  readonly holdTime: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a minimal valid SongState for testing
 *
 * @param contractId - Source contract ID (defaults to 'test-contract')
 * @param overrides - Optional field overrides
 * @returns Minimal SongStateV1
 */
export function createMinimalSongState(
  contractId: string = 'test-contract',
  overrides: Partial<SongStateV1> = {}
): SongStateV1 {
  // Create default performance
  const defaultPerformance: PerformanceState_v1 = {
    version: '1',
    id: `perf-${Date.now()}`,
    name: 'Default Performance',
    arrangementStyle: 'SOLO_PIANO',
    density: 1.0,
    grooveProfileId: 'default',
    consoleXProfileId: 'default',
    instrumentationMap: {},
    mixTargets: {},
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    metadata: {}
  };

  return {
    version: '1.0',
    id: `song-${contractId}-${Date.now()}`,
    sourceContractId: contractId,
    derivationId: `derivation-${Date.now()}`,
    timeline: {
      sections: [],
      tempo: 120,
      timeSignature: [4, 4]
    },
    notes: [],
    automations: [],
    duration: 44100 * 8, // 8 seconds at 44.1kHz
    tempo: 120,
    timeSignature: [4, 4],
    sampleRate: 44100,
    voiceAssignments: [],
    console: {
      version: '1.0',
      id: 'console-default',
      voiceBusses: [],
      mixBusses: [],
      masterBus: {
        id: 'master',
        name: 'Master',
        type: 'master',
        inserts: [],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false
      },
      sendEffects: [],
      routing: {
        routes: []
      },
      metering: {
        enabled: false,
        refreshRate: 30,
        meterType: 'peak',
        holdTime: 1000
      }
    },
    presets: [],
    derivedAt: Date.now(),
    performances: [defaultPerformance],
    activePerformanceId: defaultPerformance.id,
    ...overrides
  };
}
