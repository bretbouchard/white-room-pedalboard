/**
 * Realization Engine
 *
 * Converts Schillinger theory (SchillingerSong_v1) into executable
 * music (SongModel_v1) through deterministic realization.
 *
 * Process:
 * 1. Resolve system execution order
 * 2. Execute systems in order (Rhythm → Melody → Harmony → Orchestration)
 * 3. Apply bindings to assign material to voices
 * 4. Generate derivation record
 */

import type { SchillingerSong_v1, SongModel_v1 } from "../types";
import { resolveExecutionOrder, type ExecutionPlan } from "./dependency-resolver";
import type { DeterministicPRNG } from "../random/prng";
import { resolveBindings, realizeEnsemble } from "./ensemble-realizer";
import type { RealizedEnsembleModel_v1 } from "./ensemble-realizer";

/**
 * Realization output - complete result of realization
 *
 * Contains:
 * - songModel: Executable notes and events
 * - realizedEnsemble: Ensemble members with stable IDs
 * - derivation: Trace of how everything was generated
 */
export interface RealizationOutput {
  songModel: SongModel_v1;
  realizedEnsemble: RealizedEnsembleModel_v1;
  derivation: DerivationRecord;
}

/**
 * Intermediate representation during realization
 */
interface RealizationContext {
  /** Generated rhythm patterns */
  rhythmPatterns: Map<string, number[]>;

  /** Generated melody sequences */
  melodySequences: Map<string, number[]>;

  /** Generated chord progressions */
  chordProgressions: Map<string, ChordGeneration[]>;

  /** Generated form analysis */
  formAnalysis: FormAnalysis | null;

  /** PRNG for deterministic generation */
  prng: DeterministicPRNG;
}

/**
 * Generated chord with metadata
 */
interface ChordGeneration {
  time: number;
  root: number;
  intervals: number[];
  weight: number;
}

/**
 * Form analysis from FormSystem
 */
interface FormAnalysis {
  sections: FormalSection[];
  hierarchy: any;
  depth: number;
  totalDuration: number;
}

/**
 * Formal section from form system
 */
interface FormalSection {
  sectionId: string;
  startTime: number;
  duration: number;
  label: string;
}

/**
 * Realize Schillinger song into executable song model
 *
 * @param song - Schillinger song to realize
 * @param seed - Random seed for deterministic realization
 * @returns Realized song model with ensemble and derivation record
 */
export function realizeSong(song: SchillingerSong_v1, seed: number): RealizationOutput {
  // Resolve execution order
  const executionPlan = resolveExecutionOrder(song);

  if (!executionPlan.valid) {
    throw new Error(`Invalid song: ${executionPlan.error}`);
  }

  // Initialize realization context with PRNG
  const prng = createSeededPRNG(seed);

  const context: RealizationContext = {
    rhythmPatterns: new Map(),
    melodySequences: new Map(),
    chordProgressions: new Map(),
    formAnalysis: null,
    prng,
  };

  // Execute systems in phases
  for (const phase of executionPlan.phases) {
    for (const systemId of phase) {
      executeSystem(song, systemId, context);
    }
  }

  // Apply bindings to assign material to voices
  const voiceAssignments = applyBindings(song, context);

  // Resolve bindings for ensemble realization
  const bindings = resolveBindings(song);

  // Generate song model
  const songModel = generateSongModel(song, context, voiceAssignments, seed);

  // Realize ensemble with stable IDs
  const realizedEnsemble = realizeEnsemble(song, bindings, seed);

  // Generate derivation record
  const derivation = generateDerivationRecord(
    song,
    songModel,
    executionPlan,
    context,
    voiceAssignments,
    seed
  );

  return { songModel, realizedEnsemble, derivation };
}

/**
 * Execute a single system and collect its output
 */
function executeSystem(
  song: SchillingerSong_v1,
  systemId: string,
  context: RealizationContext
): void {
  const [type, id] = systemId.split(":");

  switch (type) {
    case "rhythm":
      executeRhythmSystem(song, id, context);
      break;
    case "melody":
      executeMelodySystem(song, id, context);
      break;
    case "harmony":
      executeHarmonySystem(song, id, context);
      break;
    case "form":
      executeFormSystem(song, id, context);
      break;
    case "orchestration":
      // Orchestration doesn't generate material, just assigns it
      break;
  }
}

/**
 * Execute rhythm system and collect attack times
 */
function executeRhythmSystem(
  song: SchillingerSong_v1,
  systemId: string,
  context: RealizationContext
): void {
  const rhythmSystem = song.bookI_rhythmSystems.find((rs) => rs.systemId === systemId);
  if (!rhythmSystem) return;

  // TODO: Implement rhythm system execution
  // For now, use placeholder
  const duration = 32; // TODO: Get from form system
  // const timeSignature = song.globals.timeSignature[0];
  // const pattern = rhythmSystem.generatePattern(duration, timeSignature);

  // Placeholder: generate simple pattern
  const attackTimes = Array.from({ length: duration }, (_, i) => i);

  // Extract attack times
  // const attackTimes = pattern.attacks.map(a => a.time);

  context.rhythmPatterns.set(systemId, attackTimes);
}

/**
 * Execute melody system and collect pitch sequence
 */
function executeMelodySystem(
  song: SchillingerSong_v1,
  systemId: string,
  context: RealizationContext
): void {
  const melodySystem = song.bookII_melodySystems.find((ms) => ms.systemId === systemId);
  if (!melodySystem) return;

  // Get rhythm pattern from binding
  const rhythmPattern = context.rhythmPatterns.get(melodySystem.rhythmBinding);
  if (!rhythmPattern) {
    throw new Error(
      `Melody system ${systemId} depends on unknown rhythm pattern: ${melodySystem.rhythmBinding}`
    );
  }

  // Generate melody

  // TODO: Get duration from form system
  const rootPitch = song.globals.key + 60; // TODO: Proper key to pitch conversion
  // const pitchEvents = melodySystem.generateMelody(duration, rhythmPattern, rootPitch);

  // Placeholder: generate simple melody
  const pitches = rhythmPattern.map((_, i) => rootPitch + (i % 12));

  // Extract pitches
  // const pitches = pitchEvents.map(e => e.pitch);

  context.melodySequences.set(systemId, pitches);
}

/**
 * Execute harmony system and collect chord progression
 */
function executeHarmonySystem(
  song: SchillingerSong_v1,
  systemId: string,
  context: RealizationContext
): void {
  const harmonySystem = song.bookIII_harmonySystems.find((hs) => hs.systemId === systemId);
  if (!harmonySystem) return;

  // Get rhythm pattern from binding
  const rhythmPattern = context.rhythmPatterns.get(harmonySystem.harmonicRhythmBinding);
  if (!rhythmPattern) {
    throw new Error(
      `Harmony system ${systemId} depends on unknown rhythm pattern: ${harmonySystem.harmonicRhythmBinding}`
    );
  }

  // Generate harmony

  // TODO: Get duration from form system
  const rootPitch = song.globals.key + 60; // TODO: Proper key to pitch conversion
  // const chords = harmonySystem.generateHarmony(duration, rhythmPattern, rootPitch);

  // Placeholder: generate simple chords
  const chordGenerations: ChordGeneration[] = rhythmPattern.map((time, _i) => ({
    time,
    root: rootPitch,
    intervals: [0, 4, 7], // Major chord
    weight: 1.0,
  }));

  // Convert to chord generation format
  // const chordGenerations: ChordGeneration[] = chords.map(chord => ({
  //   time: chord.time,
  //   root: chord.root,
  //   intervals: chord.intervals,
  //   weight: chord.weight,
  // }));

  context.chordProgressions.set(systemId, chordGenerations);
}

/**
 * Execute form system and collect form analysis
 */
function executeFormSystem(
  song: SchillingerSong_v1,
  systemId: string,
  context: RealizationContext
): void {
  const formSystem = song.bookIV_formSystem;
  if (!formSystem || formSystem.systemId !== systemId) return;

  // Generate form
  const totalDuration = 128; // TODO: Calculate from song structure
  // const formAnalysis = formSystem.generateForm(totalDuration);

  // Placeholder: simple form analysis
  const formAnalysis: FormAnalysis = {
    sections: [
      {
        sectionId: "section-A",
        startTime: 0,
        duration: totalDuration / 2,
        label: "A",
      },
      {
        sectionId: "section-B",
        startTime: totalDuration / 2,
        duration: totalDuration / 2,
        label: "B",
      },
    ],
    hierarchy: {},
    depth: 1,
    totalDuration,
  };

  context.formAnalysis = formAnalysis as FormAnalysis;
}

/**
 * Apply bindings to assign material to voices
 */
function applyBindings(
  song: SchillingerSong_v1,
  context: RealizationContext
): Map<string, VoiceAssignment> {
  const assignments = new Map<string, VoiceAssignment>();

  // Apply role → rhythm bindings
  for (const binding of song.bindings.roleRhythmBindings) {
    const rhythmPattern = context.rhythmPatterns.get(binding.rhythmSystemId);
    if (!rhythmPattern) continue;

    const assignment: VoiceAssignment = {
      roleId: binding.roleId,
      rhythmSystemId: binding.rhythmSystemId,
      rhythmPattern,
      melodySystemId: null,
      pitches: null,
      harmonySystemId: null,
      chords: null,
    };

    assignments.set(binding.roleId, assignment);
  }

  // Apply role → melody bindings
  for (const binding of song.bindings.roleMelodyBindings) {
    const existing = assignments.get(binding.roleId);
    const pitches = context.melodySequences.get(binding.melodySystemId);

    if (!pitches) continue;

    if (existing) {
      existing.melodySystemId = binding.melodySystemId;
      existing.pitches = pitches;
    } else {
      const assignment: VoiceAssignment = {
        roleId: binding.roleId,
        rhythmSystemId: null,
        rhythmPattern: [],
        melodySystemId: binding.melodySystemId,
        pitches,
        harmonySystemId: null,
        chords: null,
      };
      assignments.set(binding.roleId, assignment);
    }
  }

  // Apply role → harmony bindings
  for (const binding of song.bindings.roleHarmonyBindings) {
    const existing = assignments.get(binding.roleId);
    const chords = context.chordProgressions.get(binding.harmonySystemId);

    if (!chords) continue;

    if (existing) {
      existing.harmonySystemId = binding.harmonySystemId;
      existing.chords = chords;
    } else {
      const assignment: VoiceAssignment = {
        roleId: binding.roleId,
        rhythmSystemId: null,
        rhythmPattern: [],
        melodySystemId: null,
        pitches: null,
        harmonySystemId: binding.harmonySystemId,
        chords,
      };
      assignments.set(binding.roleId, assignment);
    }
  }

  return assignments;
}

/**
 * Generate final song model
 */
function generateSongModel(
  song: SchillingerSong_v1,
  _context: RealizationContext,
  _voiceAssignments: Map<string, VoiceAssignment>,
  seed: number
): SongModel_v1 {
  // TODO: Implement proper song model generation
  // For now, return minimal valid song model
  const songModel: SongModel_v1 = {
    schemaVersion: "1.0",
    songId: `realized-${song.songId}-seed-${seed}`, // Include seed for uniqueness
    derivationId: `derivation-${song.songId}-${seed}`,
    sourceSongId: song.songId,
    notes: [],
    events: [],
    voiceAssignments: [],
    sections: [],
    duration: 0,
    tempoChanges: [],
    tempo: song.globals.tempo,
    timeSignature: song.globals.timeSignature,
    key: song.globals.key,
    createdAt: new Date().toISOString(),
  };

  return songModel;
}

/**
 * Generate derivation record
 */
function generateDerivationRecord(
  song: SchillingerSong_v1,
  songModel: SongModel_v1,
  executionPlan: ExecutionPlan,
  _context: RealizationContext,
  voiceAssignments: Map<string, VoiceAssignment>,
  seed: number
): DerivationRecord {
  const derivation: DerivationRecord = {
    schemaVersion: "1.0",
    derivationId: `derivation-${song.songId}`,
    sourceSongId: song.songId,
    realizedSongId: songModel.songId,
    seed,
    executionPhases: executionPlan.phases,
    systemOutputs: {},
    bindingAssignments: Array.from(voiceAssignments.entries()).map(([roleId, assignment]) => ({
      roleId,
      rhythmSystemId: assignment.rhythmSystemId,
      rhythmPattern: assignment.rhythmPattern,
      melodySystemId: assignment.melodySystemId,
      pitches: assignment.pitches,
      harmonySystemId: assignment.harmonySystemId,
      chords: assignment.chords,
    })),
    createdAt: new Date().toISOString(),
  };

  return derivation;
}

/**
 * Voice assignment from binding
 */
interface VoiceAssignment {
  roleId: string;
  rhythmSystemId: string | null;
  rhythmPattern: number[];
  melodySystemId: string | null;
  pitches: number[] | null;
  harmonySystemId: string | null;
  chords: ChordGeneration[] | null;
}

/**
 * Derivation record
 */
export interface DerivationRecord {
  schemaVersion: "1.0";
  derivationId: string;
  sourceSongId: string;
  realizedSongId: string;
  seed: number;
  executionPhases: string[][];
  systemOutputs: Record<string, any>;
  bindingAssignments: any[];
  createdAt: string;
}

// Import helpers
import { createSeededPRNG } from "../random/prng";
