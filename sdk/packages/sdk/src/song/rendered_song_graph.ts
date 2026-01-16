/**
 * RenderedSongGraph - Audio-Ready Projection
 *
 * RenderedSongGraph is the result of projecting a SongState through
 * a PerformanceConfiguration. It represents the complete audio graph
 * ready for playback.
 *
 * Architecture:
 * SongState (what the song is) + PerformanceConfiguration (how it sounds)
 *   → projectSongState()
 *   → RenderedSongGraph (audio-ready graph)
 *
 * RenderedSongGraph contains:
 * - References to source SongState and PerformanceConfiguration
 * - Audio graph structure (voices, buses, effects)
 * - Assigned notes (notes with voice assignments)
 * - Runtime metadata (CPU estimates, playability)
 *
 * This is what JUCE receives for rendering.
 */

import type { SongState } from './song_state.js';
import type { PerformanceConfiguration } from './performance_configuration.js';

// ============================================================================
// Core RenderedSongGraph Type
// ============================================================================

/**
 * RenderedSongGraph v1 - Audio-ready projection
 *
 * Complete audio graph ready for playback in JUCE engine.
 */
export interface RenderedSongGraph {
  readonly version: '1.0';
  readonly id: string;

  // Sources
  readonly songState: SongState;
  readonly performance: PerformanceConfiguration;

  // Audio graph
  readonly voices: Voice[];
  readonly buses: Bus[];
  readonly effects: Effect[];

  // Assigned notes (notes with instruments assigned)
  readonly assignedNotes: AssignedNote[];

  // Timeline (derived from SongState form)
  readonly timeline: Timeline;

  // Runtime metadata
  readonly isPlayable: boolean;
  readonly estimatedCpuUsage: number; // 0-1
  readonly estimatedMemoryUsage: number; // bytes
  readonly renderedAt: number;
}

// ============================================================================
// Audio Graph Types
// ============================================================================

/**
 * Voice - Audio voice with instrument
 */
export interface Voice {
  readonly id: string;
  readonly roleId: string; // From SongState
  readonly instrumentType: string; // From PerformanceConfiguration
  readonly presetId: string; // From PerformanceConfiguration
  readonly busId: string; // From PerformanceConfiguration
  readonly polyphony: number; // Max simultaneous notes
}

/**
 * Bus - Mix bus (voice, mix, or master)
 */
export interface Bus {
  readonly id: string;
  readonly name: string;
  readonly type: 'voice' | 'mix' | 'master';
  readonly gain: number; // 0-1
  readonly pan: number; // -1 to 1
  readonly muted: boolean;
  readonly solo: boolean;
  readonly effectIds: string[]; // Effect chain
}

/**
 * Effect - Audio effect
 */
export interface Effect {
  readonly id: string;
  readonly type: EffectType;
  readonly busId: string; // Bus this effect is on
  readonly enabled: boolean;
  readonly parameters: Record<string, number>; // Effect parameters
}

/**
 * Effect types
 */
export type EffectType =
  | 'compressor'
  | 'limiter'
  | 'parametric_eq'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'phaser'
  | 'overdrive'
  | 'bitcrusher';

// ============================================================================
// Assigned Notes
// ============================================================================

/**
 * AssignedNote - Note with instrument assignment
 *
 * Derived from SongState notes + PerformanceConfiguration instrumentation.
 * Each note is assigned to a specific voice/instrument.
 */
export interface AssignedNote {
  readonly id: string;
  readonly sourceNoteId: string; // Original note ID from SongState
  readonly voiceId: string; // Assigned voice
  readonly roleId: string; // Functional role
  readonly startTime: number; // samples
  readonly duration: number; // samples
  readonly pitch: number; // MIDI note (0-127)
  readonly velocity: number; // 0-1

  // Performance adjustments from PerformanceConfiguration
  readonly timingOffset: number; // samples (from groove)
  readonly velocityOffset: number; // 0-1 (from groove)

  // Register adjustment from PerformanceConfiguration
  readonly transposition: number; // semitones
  readonly finalPitch: number; // pitch + transposition
}

// ============================================================================
// Timeline
// ============================================================================

/**
 * Timeline - Song structure derived from SongState form
 */
export interface Timeline {
  readonly tempo: number; // BPM
  readonly timeSignature: [number, number]; // [numerator, denominator]
  readonly duration: number; // samples
  readonly sections: readonly TimelineSection[];
}

/**
 * Timeline section
 */
export interface TimelineSection {
  readonly id: string;
  readonly name: string; // From SongState form section
  readonly startTime: number; // samples
  readonly duration: number; // samples
  readonly tempo: number; // BPM
  readonly timeSignature: [number, number];
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly value: unknown;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ValidationError[];
}

/**
 * Validate RenderedSongGraph
 */
export function validateRenderedSongGraph(graph: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof graph !== 'object' || graph === null) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Graph must be an object', value: graph }]
    };
  }

  const g = graph as Record<string, unknown>;

  // Version
  if (g.version !== '1.0') {
    errors.push({ path: 'version', message: 'Version must be "1.0"', value: g.version });
  }

  // ID
  if (typeof g.id !== 'string' || g.id.length === 0) {
    errors.push({ path: 'id', message: 'ID is required', value: g.id });
  }

  // SongState reference
  if (typeof g.songState !== 'object' || g.songState === null) {
    errors.push({ path: 'songState', message: 'SongState reference is required', value: g.songState });
  }

  // Performance reference
  if (typeof g.performance !== 'object' || g.performance === null) {
    errors.push({ path: 'performance', message: 'PerformanceConfiguration reference is required', value: g.performance });
  }

  // Voices
  if (!Array.isArray(g.voices)) {
    errors.push({ path: 'voices', message: 'Voices must be an array', value: g.voices });
  }

  // Buses
  if (!Array.isArray(g.buses)) {
    errors.push({ path: 'buses', message: 'Buses must be an array', value: g.buses });
  }

  // Effects
  if (!Array.isArray(g.effects)) {
    errors.push({ path: 'effects', message: 'Effects must be an array', value: g.effects });
  }

  // Assigned notes
  if (!Array.isArray(g.assignedNotes)) {
    errors.push({ path: 'assignedNotes', message: 'Assigned notes must be an array', value: g.assignedNotes });
  }

  // Timeline
  if (typeof g.timeline !== 'object' || g.timeline === null) {
    errors.push({ path: 'timeline', message: 'Timeline is required', value: g.timeline });
  }

  // Runtime metadata
  if (typeof g.isPlayable !== 'boolean') {
    errors.push({ path: 'isPlayable', message: 'isPlayable must be boolean', value: g.isPlayable });
  }
  if (typeof g.estimatedCpuUsage !== 'number' || g.estimatedCpuUsage < 0 || g.estimatedCpuUsage > 1) {
    errors.push({ path: 'estimatedCpuUsage', message: 'CPU usage must be 0-1', value: g.estimatedCpuUsage });
  }
  if (typeof g.estimatedMemoryUsage !== 'number' || g.estimatedMemoryUsage < 0) {
    errors.push({ path: 'estimatedMemoryUsage', message: 'Memory usage must be >= 0', value: g.estimatedMemoryUsage });
  }
  if (typeof g.renderedAt !== 'number' || g.renderedAt < 0) {
    errors.push({ path: 'renderedAt', message: 'Invalid rendered timestamp', value: g.renderedAt });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Type guard for RenderedSongGraph
 */
export function isRenderedSongGraph(value: unknown): value is RenderedSongGraph {
  const result = validateRenderedSongGraph(value);
  return result.valid;
}

// ============================================================================
// Projection Function
// ============================================================================

/**
 * projectSongState - Project SongState through PerformanceConfiguration
 *
 * This is the core function that combines invariant musical logic (SongState)
 * with realization parameters (PerformanceConfiguration) to create an
 * audio-ready graph (RenderedSongGraph).
 *
 * Steps:
 * 1. Build audio graph from PerformanceConfiguration instrumentation
 * 2. Assign notes to voices based on role assignments
 * 3. Apply performance adjustments (groove, register, density)
 * 4. Build timeline from SongState form
 * 5. Estimate CPU/memory usage
 * 6. Validate playability
 *
 * @param songState - Invariant musical logic
 * @param performance - Realization lens
 * @returns Audio-ready graph
 */
export function projectSongState(
  songState: SongState,
  performance: PerformanceConfiguration
): RenderedSongGraph {
  const now = Date.now();
  const id = crypto.randomUUID();

  // Build audio graph
  const voices = buildVoices(songState, performance);
  const buses = buildBuses(songState, performance);
  const effects = buildEffects(performance);

  // Assign notes to voices
  const assignedNotes = assignNotes(songState, performance);

  // Build timeline from form
  const timeline = buildTimeline(songState);

  // Estimate resource usage
  const estimatedCpuUsage = estimateCpuUsage(voices, assignedNotes, performance);
  const estimatedMemoryUsage = estimateMemoryUsage(voices, assignedNotes);

  // Check playability
  const isPlayable = checkPlayability(voices, assignedNotes, performance);

  return {
    version: '1.0',
    id,
    songState,
    performance,
    voices,
    buses,
    effects,
    assignedNotes,
    timeline,
    isPlayable,
    estimatedCpuUsage,
    estimatedMemoryUsage,
    renderedAt: now
  };
}

/**
 * Build voices from SongState voiceAssignments + PerformanceConfiguration instrumentation
 *
 * ARCHITECTURAL UPDATE (January 2026):
 * SongStateV1 contains voiceAssignments (rendered state) not orchestrationSystems (musical logic).
 * This function now uses voiceAssignments directly from SongStateV1.
 */
function buildVoices(
  songState: SongState,
  performance: PerformanceConfiguration
): Voice[] {
  const voices: Voice[] = [];

  // SongStateV1 has voiceAssignments (rendered output)
  // Each voiceAssignment maps voiceId → instrumentId, presetId, busId
  const voiceAssignments = (songState as any).voiceAssignments || [];

  // Map each voice assignment to a Voice
  for (const voiceAssignment of voiceAssignments) {
    // Find instrument assignment from PerformanceConfiguration
    const instrumentAssignment = performance.instrumentation.assignments.find(
      a => a.roleId === voiceAssignment.voiceId // Map voiceId to roleId
    );

    voices.push({
      id: voiceAssignment.voiceId,
      roleId: instrumentAssignment?.roleId || 'default', // Use roleId from PerformanceConfiguration
      instrumentType: voiceAssignment.instrumentId, // From SongStateV1
      presetId: voiceAssignment.presetId, // From SongStateV1
      busId: voiceAssignment.busId, // From SongStateV1
      polyphony: 16 // Default polyphony
    });
  }

  // If no voice assignments, create default voice from PerformanceConfiguration
  if (voices.length === 0 && performance.instrumentation.assignments.length > 0) {
    const firstAssignment = performance.instrumentation.assignments[0];
    voices.push({
      id: `voice-${Date.now()}`,
      roleId: firstAssignment.roleId,
      instrumentType: firstAssignment.instrumentType,
      presetId: firstAssignment.presetId,
      busId: firstAssignment.busId,
      polyphony: 16
    });
  }

  return voices;
}

/**
 * Build buses from SongStateV1 console
 *
 * ARCHITECTURAL UPDATE (January 2026):
 * SongStateV1 has a complete console with buses.
 * This function extracts buses from the console.
 */
function buildBuses(songState: SongState, performance: PerformanceConfiguration): Bus[] {
  const buses: Bus[] = [];

  // SongStateV1 has console
  const stateV1 = songState as any;
  if (stateV1.console) {
    const console = stateV1.console;

    // Voice buses
    for (const voiceBus of console.voiceBusses || []) {
      buses.push({
        id: voiceBus.id,
        name: voiceBus.name,
        type: 'voice',
        gain: voiceBus.gain,
        pan: voiceBus.pan,
        muted: voiceBus.muted,
        solo: voiceBus.solo,
        effectIds: []
      });
    }

    // Mix buses
    for (const mixBus of console.mixBusses || []) {
      buses.push({
        id: mixBus.id,
        name: mixBus.name,
        type: 'mix',
        gain: mixBus.gain,
        pan: mixBus.pan,
        muted: mixBus.muted,
        solo: mixBus.solo,
        effectIds: []
      });
    }

    // Master bus
    if (console.masterBus) {
      buses.push({
        id: console.masterBus.id,
        name: console.masterBus.name,
        type: 'master',
        gain: console.masterBus.gain,
        pan: console.masterBus.pan,
        muted: console.masterBus.muted,
        solo: console.masterBus.solo,
        effectIds: []
      });
    }
  } else {
    // Fallback to PerformanceConfiguration bus configuration
    for (const voiceBusId of performance.busConfiguration.voiceBusIds) {
      buses.push({
        id: voiceBusId,
        name: `Voice ${voiceBusId}`,
        type: 'voice',
        gain: 1.0,
        pan: 0.0,
        muted: false,
        solo: false,
        effectIds: []
      });
    }

    for (const mixBusId of performance.busConfiguration.mixBusIds) {
      buses.push({
        id: mixBusId,
        name: `Mix ${mixBusId}`,
        type: 'mix',
        gain: 1.0,
        pan: 0.0,
        muted: false,
        solo: false,
        effectIds: []
      });
    }

    buses.push({
      id: performance.busConfiguration.masterBusId,
      name: 'Master',
      type: 'master',
      gain: 1.0,
      pan: 0.0,
      muted: false,
      solo: false,
      effectIds: []
    });
  }

  return buses;
}

/**
 * Build effects from PerformanceConfiguration
 *
 * TODO: This is a placeholder - actual effect loading would come from ConsoleX profile
 */
function buildEffects(performance: PerformanceConfiguration): Effect[] {
  // For now, return empty array
  // In full implementation, this would load effects from ConsoleX profile
  return [];
}

/**
 * Assign notes to voices
 *
 * This is a placeholder implementation that assigns notes to the first available voice.
 * Full implementation would:
 * 1. Generate notes from SongState Schillinger systems
 * 2. Apply density scaling from PerformanceConfiguration
 * 3. Assign each note to a voice based on role
 * 4. Apply register constraints
 * 5. Apply groove timing/velocity adjustments
 */
function assignNotes(
  songState: SongState,
  performance: PerformanceConfiguration
): AssignedNote[] {
  // Placeholder: return empty array
  // Full implementation would derive notes from Schillinger systems
  return [];
}

/**
 * Build timeline from SongStateV1 timeline
 *
 * ARCHITECTURAL UPDATE (January 2026):
 * SongStateV1 already has a timeline (rendered output).
 * This function extracts and formats the existing timeline.
 */
function buildTimeline(songState: SongState): Timeline {
  // SongStateV1 has timeline, tempo, timeSignature, duration
  const stateV1 = songState as any;

  // Use timeline from SongStateV1 if available
  if (stateV1.timeline && stateV1.tempo && stateV1.timeSignature) {
    return {
      tempo: stateV1.tempo,
      timeSignature: stateV1.timeSignature,
      duration: stateV1.duration || 0,
      sections: stateV1.timeline?.sections || []
    };
  }

  // Fallback to defaults for non-V1 SongState
  const tempo = 120;
  const timeSignature: [number, number] = [4, 4];

  return {
    tempo,
    timeSignature,
    duration: 0,
    sections: []
  };
}

/**
 * Estimate CPU usage
 */
function estimateCpuUsage(
  voices: Voice[],
  notes: AssignedNote[],
  performance: PerformanceConfiguration
): number {
  // Simple heuristic: base CPU + voices * factor + notes * factor
  const baseCpu = 0.01; // 1% base
  const voiceCpu = voices.length * 0.02; // 2% per voice
  const noteCpu = notes.length * 0.0001; // Small factor per note

  return Math.min(baseCpu + voiceCpu + noteCpu, performance.targetCpuUsage * 1.5);
}

/**
 * Estimate memory usage
 */
function estimateMemoryUsage(voices: Voice[], notes: AssignedNote[]): number {
  // Simple heuristic: voices + notes * size
  const voiceMemory = voices.length * 1024; // 1KB per voice
  const noteMemory = notes.length * 64; // 64 bytes per note

  return voiceMemory + noteMemory;
}

/**
 * Check playability
 */
function checkPlayability(
  voices: Voice[],
  notes: AssignedNote[],
  performance: PerformanceConfiguration
): boolean {
  // Check if we exceed max voices
  if (voices.length > performance.maxVoices) {
    return false;
  }

  // Check if estimated CPU exceeds target significantly
  const estimatedCpu = estimateCpuUsage(voices, notes, performance);
  if (estimatedCpu > performance.targetCpuUsage * 1.5) {
    return false;
  }

  return true;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize RenderedSongGraph to JSON
 */
export function serializeRenderedSongGraph(graph: RenderedSongGraph): string {
  return JSON.stringify({
    ...graph,
    // Don't serialize full SongState/Performance (too large)
    // Just serialize IDs for reference
    songStateId: graph.songState.id,
    performanceId: graph.performance.id
  }, null, 2);
}

/**
 * Deserialize RenderedSongGraph from JSON
 *
 * Note: This requires SongState and PerformanceConfiguration to be
 * loaded separately and then combined.
 */
export function deserializeRenderedSongGraph(
  json: string,
  songState: SongState,
  performance: PerformanceConfiguration
): RenderedSongGraph {
  const partial = JSON.parse(json) as Partial<RenderedSongGraph>;

  // Validate that IDs match
  if (partial.songState && (partial.songState as any).id !== songState.id) {
    throw new Error('SongState ID mismatch');
  }
  if (partial.performance && (partial.performance as any).id !== performance.id) {
    throw new Error('PerformanceConfiguration ID mismatch');
  }

  // Return full graph
  return {
    version: '1.0',
    id: partial.id || crypto.randomUUID(),
    songState,
    performance,
    voices: partial.voices || [],
    buses: partial.buses || [],
    effects: partial.effects || [],
    assignedNotes: partial.assignedNotes || [],
    timeline: partial.timeline || { tempo: 120, timeSignature: [4, 4], duration: 0, sections: [] },
    isPlayable: partial.isPlayable ?? false,
    estimatedCpuUsage: partial.estimatedCpuUsage ?? 0,
    estimatedMemoryUsage: partial.estimatedMemoryUsage ?? 0,
    renderedAt: partial.renderedAt ?? Date.now()
  };
}
