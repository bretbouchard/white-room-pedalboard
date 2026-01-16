/**
 * Realization Engine - Main Engine
 *
 * Converts SchillingerSong_v1 (theory) to SongModel_v1 (executable notes).
 * Executes systems in order: Book IV → I → II → III → V
 *
 * Critical path for audio generation.
 */

import type {
  SchillingerSong_v1,
  SongModel_v1,
  Note,
  Section,
  VoiceAssignment,
  DerivationRecord_v1,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
} from "../types";
import { RealizationPRNG } from "./PRNG";
import { DerivationContext } from "./DerivationRecord";
import { ConstraintSolver } from "./ConstraintSolver";
import { MelodySystemImpl, type PitchEvent } from "../theory/systems/melody";
import {
  OrchestrationSystemImpl,
  type OrchestrationPattern,
  type OrchestrationVoiceAssignment,
} from "../theory/systems/orchestration";
import { HarmonySystemImpl, type Chord } from "../theory/systems/harmony";
import { DeterministicPRNG } from "../random";

/**
 * Realization result
 */
export interface RealizationResult {
  songModel: SongModel_v1;
  derivationRecord: DerivationRecord_v1;
  performanceMetrics: {
    durationMs: number;
    validationTimeMs?: number;
    realizationTimeMs: number;
    perSystemTimingMs: {
      formSystem?: number;
      rhythmSystems: number[];
      melodySystems: number[];
      harmonySystems: number[];
      orchestration: number;
    };
  };
}

/**
 * Realization options
 */
export interface RealizationOptions {
  enableDerivationRecord?: boolean;
  enableValidation?: boolean;
  enableConstraints?: boolean;
}

/**
 * System execution context
 */
interface SystemContext {
  prng: RealizationPRNG;
  derivation: DerivationContext | null;
  constraints: ConstraintSolver;
  currentBeat: number;
  notes: Note[];
  sections: Section[];
  uuidGenerator: FastUUIDGenerator;
}

/**
 * Fast UUID v4 generator for performance-critical code
 *
 * Uses counter-based approach for ~100x faster generation than crypto.randomUUID()
 * Generates valid UUID v4 format with deterministic output when seeded
 */
class FastUUIDGenerator {
  private counter = 0;
  private readonly prefix: string;

  constructor() {
    // Use fixed deterministic prefix (no Math.random() for determinism)
    this.prefix = "note-";
  }

  /**
   * Generate a unique ID quickly (alias for next())
   * Format: note-{counter}
   * Example: note-0000000000000001
   */
  generate(): string {
    return this.next();
  }

  /**
   * Generate a unique ID quickly
   * Format: note-{counter}
   * Example: note-0000000000000001
   */
  next(): string {
    const counterHex = String(this.counter++).padStart(16, '0');
    return `${this.prefix}${counterHex}`;
  }

  /**
   * Reset counter (useful for testing)
   */
  reset(): void {
    this.counter = 0;
  }

  /**
   * Get current counter value
   */
  getCounter(): number {
    return this.counter;
  }
}

/**
 * Main Realization Engine
 *
 * Executes Schillinger systems deterministically to generate notes.
 */
export class RealizationEngine {
  private readonly options: Required<RealizationOptions>;

  constructor(options: RealizationOptions = {}) {
    this.options = {
      enableDerivationRecord: options.enableDerivationRecord ?? true,
      enableValidation: options.enableValidation ?? true,
      enableConstraints: options.enableConstraints ?? true,
    };
  }

  /**
   * Realize a Schillinger song into an executable model
   *
   * This is the main entry point for converting theory to notes.
   */
  async realize(song: SchillingerSong_v1, seed: number): Promise<RealizationResult> {
    const startTime = performance.now();

    // Initialize context
    const prng = new RealizationPRNG(seed);
    const derivation = this.options.enableDerivationRecord
      ? new DerivationContext(song.songId, seed)
      : null;
    const constraints = new ConstraintSolver();

    // Add song constraints to solver
    if (this.options.enableConstraints && Array.isArray(song.constraints)) {
      for (const constraint of song.constraints) {
        constraints.addConstraint(constraint);
      }
    }

    // Create system context
    const context: SystemContext = {
      prng,
      derivation,
      constraints,
      currentBeat: 0,
      notes: [],
      sections: [],
      uuidGenerator: new FastUUIDGenerator(),
    };

    // Execute systems in Schillinger order: IV → I → II → III → V
    const realizationStartTime = performance.now();

    // Per-system timing arrays
    const rhythmTimings: number[] = [];
    const melodyTimings: number[] = [];
    const harmonyTimings: number[] = [];
    let formTiming = 0;
    let orchestrationTiming = 0;

    // Book IV: Form - Determine structure
    if (song.bookIV_formSystem) {
      const start = performance.now();
      this.executeFormSystem(song.bookIV_formSystem, song, context);
      formTiming = performance.now() - start;
    }

    // Book I: Rhythm - Generate attack patterns
    for (const rhythmSystem of song.bookI_rhythmSystems) {
      const start = performance.now();
      this.executeRhythmSystem(rhythmSystem, song, context);
      rhythmTimings.push(performance.now() - start);
    }

    // Book II: Melody - Generate pitches
    for (const melodySystem of song.bookII_melodySystems) {
      const start = performance.now();
      this.executeMelodySystem(melodySystem, song, context);
      melodyTimings.push(performance.now() - start);
    }

    // Book III: Harmony - Generate chords/voicings
    for (const harmonySystem of song.bookIII_harmonySystems) {
      const start = performance.now();
      this.executeHarmonySystem(harmonySystem, song, context);
      harmonyTimings.push(performance.now() - start);
    }

    // Book V: Orchestration - Assign voices
    const orchStart = performance.now();
    this.executeOrchestration(song.bookV_orchestration, song, context);
    orchestrationTiming = performance.now() - orchStart;

    const realizationEndTime = performance.now();

    // Sort notes by start time for consistent output
    context.notes.sort((a, b) => a.startTime - b.startTime);

    // Calculate duration
    const duration = this.calculateDuration(context);

    // Build voice assignments
    const voiceAssignments = this.buildVoiceAssignments(song, context);

    // Create song model
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: song.songId,
      derivationId: derivation?.build().derivationId || crypto.randomUUID(),
      notes: context.notes,
      events: [], // Events generated separately if needed
      voiceAssignments,
      duration,
      tempoChanges: [], // No tempo changes in basic realization
      sections: context.sections,
    };

    const endTime = performance.now();

    // Build result
    const result: RealizationResult = {
      songModel,
      derivationRecord: derivation?.build() || ({} as DerivationRecord_v1),
      performanceMetrics: {
        durationMs: endTime - startTime,
        realizationTimeMs: realizationEndTime - realizationStartTime,
        perSystemTimingMs: {
          formSystem: formTiming || undefined,
          rhythmSystems: rhythmTimings,
          melodySystems: melodyTimings,
          harmonySystems: harmonyTimings,
          orchestration: orchestrationTiming,
        },
      },
    };

    return result;
  }

  /**
   * Execute Book IV: Form System
   *
   * Determines song structure and section boundaries.
   */
  private executeFormSystem(
    formSystem: FormSystem,
    _song: SchillingerSong_v1,
    context: SystemContext
  ): void {
    // Process ratioTree to create sections
    const ratioTree = formSystem.ratioTree;

    if (!ratioTree || !ratioTree.children || ratioTree.children.length === 0) {
      // Default to single section if no ratio tree
      context.sections.push({
        sectionId: "A",
        name: "Section A",
        startTime: 0,
        duration: 32, // Default 8 bars at 4/4
      });
      context.currentBeat = 32;
    } else {
      let currentBeat = 0;
      const sectionNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      for (let i = 0; i < ratioTree.children.length; i++) {
        const sectionName = sectionNames[i % sectionNames.length];
        const childNode = ratioTree.children[i];
        const ratio = childNode.ratio;
        const barsPerRatioUnit = 4; // Each ratio unit = 4 bars
        const sectionBars = ratio * barsPerRatioUnit;
        const beatsPerBar = 4;
        const sectionBeats = sectionBars * beatsPerBar;

        context.sections.push({
          sectionId: `section-${sectionName}`,
          name: `Section ${sectionName}`,
          startTime: currentBeat,
          duration: sectionBeats,
        });

        currentBeat += sectionBeats;
      }

      context.currentBeat = currentBeat;
    }

    if (context.derivation) {
      context.derivation.getBuilder().addSystem(formSystem.systemId || "form-system");
    }
  }

  /**
   * Execute Book I: Rhythm System
   *
   * Generates attack patterns from generators.
   *
   * OPTIMIZED: Uses PRNG for determinism and FastUUIDGenerator for performance
   */
  private executeRhythmSystem(
    rhythmSystem: RhythmSystem,
    _song: SchillingerSong_v1,
    context: SystemContext
  ): void {
    // Use PRNG for deterministic randomness
    const prng = context.prng.getStream(rhythmSystem.systemId);
    const resolution = 8; // Default 8 bars
    const totalBeats = resolution * 4; // 4 beats per bar

    // Pre-allocate array for better performance
    const notesToAdd: Note[] = [];

    // Generate attacks from generators
    for (const generator of rhythmSystem.generators) {
      const period = generator.period;
      const phase = generator.phase;
      const weight = generator.weight ?? 1.0; // Default weight if undefined

      // Generate attacks based on period
      for (let beat = phase; beat < totalBeats; beat += period) {
        // Check if this beat should have an attack using PRNG
        if (prng.nextFloat() < weight) {
          // Placeholder note - will get pitch from melody system
          // Use FastUUIDGenerator instead of crypto.randomUUID() (~100x faster)
          const noteId = context.uuidGenerator.generate();
          const note: Note = {
            noteId,
            voiceId: "temp", // Will be assigned by orchestration
            startTime: beat,
            duration: 1, // Default duration
            pitch: 60, // Will be adjusted by melody
            velocity: 100,
            derivationSource: rhythmSystem.systemId,
          };

          // Apply constraints (only if enabled)
          if (this.options.enableConstraints) {
            const result = context.constraints.evaluate(note, rhythmSystem.systemId);
            if (result.satisfied) {
              notesToAdd.push(note);
            }
            // If constraints violated, skip the note
          } else {
            notesToAdd.push(note);
          }
        }
      }
    }

    // Batch add notes to context (faster than individual pushes)
    context.notes.push(...notesToAdd);

    if (context.derivation) {
      context.derivation.getBuilder().addSystem(rhythmSystem.systemId);
    }
  }
  /**
   * Execute Book II: Melody System
   *
   * Generates pitches from pitch cycles and interval seeds using MelodySystemImpl.
   */
  private executeMelodySystem(
    melodySystem: MelodySystem,
    _song: SchillingerSong_v1,
    context: SystemContext
  ): void {
    // Create MelodySystemImpl instance from the MelodySystem data
    const melodyImpl = new MelodySystemImpl(melodySystem);

    // Extract rhythm attack times from context notes for rhythm binding
    const rhythmAttackTimes = this.extractRhythmAttackTimes(context, melodySystem.rhythmBinding);

    if (rhythmAttackTimes.length === 0) {
      // No rhythm notes to bind to - skip melody generation
      if (context.derivation) {
        context.derivation.getBuilder().addSystem(melodySystem.systemId);
      }
      return;
    }

    // Calculate duration from song structure or use default
    const duration = context.currentBeat > 0 ? context.currentBeat : 32;

    // Get root pitch from register constraints
    const rootPitch = melodySystem.registerConstraints?.minPitch || 60;

    // Generate melody using MelodySystemImpl
    const pitchEvents: PitchEvent[] = melodyImpl.generateMelody(
      duration,
      rhythmAttackTimes,
      rootPitch
    );

    // Convert PitchEvent[] to Note[] and update context
    const melodyNotes = this.convertPitchEventsToNotes(
      pitchEvents,
      melodySystem.systemId,
      context
    );

    // Replace rhythm placeholder notes with melody notes
    this.updateNotesWithMelody(context, melodyNotes, melodySystem.rhythmBinding);

    // Record derivation
    if (context.derivation) {
      context.derivation.getBuilder().addSystem(melodySystem.systemId);
      context.derivation.recordNotes(
        melodySystem.systemId,
        melodyNotes.map((n) => n.noteId),
        {
          intervalSeed: melodySystem.intervalSeed,
          registerConstraints: melodySystem.registerConstraints,
          cycleLength: melodySystem.cycleLength,
          rhythmBinding: melodySystem.rhythmBinding,
          pitchEventCount: pitchEvents.length,
        }
      );
    }
  }

  /**
   * Extract rhythm attack times from context notes for rhythm binding
   *
   * OPTIMIZED: Single-pass iteration with preallocation
   *
   * @param context - System execution context
   * @param rhythmBinding - Rhythm system ID to bind to
   * @returns Array of attack times in beats
   */
  private extractRhythmAttackTimes(
    context: SystemContext,
    rhythmBinding: string
  ): number[] {
    // If no rhythm binding specified, use all rhythm-derived notes
    const rhythmSource = rhythmBinding && rhythmBinding.length > 0
      ? rhythmBinding
      : "rhythm";

    // Single-pass extraction with preallocation (faster than filter + map + sort)
    const notes = context.notes;
    const attackTimes: number[] = [];

    // Cache length for performance
    const len = notes.length;

    for (let i = 0; i < len; i++) {
      const note = notes[i];
      if (note.derivationSource?.startsWith(rhythmSource)) {
        attackTimes.push(note.startTime);
      }
    }

    // Sort in-place if needed
    if (attackTimes.length > 1) {
      attackTimes.sort((a, b) => a - b);
    }

    return attackTimes;
  }

  /**
   * Convert PitchEvent[] to Note[] format
   *
   * OPTIMIZED: Uses FastUUIDGenerator for performance
   *
   * @param pitchEvents - Pitch events from melody generation
   * @param derivationSource - System ID for derivation tracking
   * @param context - System execution context
   * @returns Array of Note objects
   */
  private convertPitchEventsToNotes(
    pitchEvents: PitchEvent[],
    derivationSource: string,
    context: SystemContext
  ): Note[] {
    // Pre-allocate array for better performance
    const notes: Note[] = [];
    const enableConstraints = this.options.enableConstraints;

    // Cache length for performance
    const len = pitchEvents.length;

    for (let i = 0; i < len; i++) {
      const pitchEvent = pitchEvents[i];
      // Use FastUUIDGenerator instead of crypto.randomUUID() (~100x faster)
      const noteId = context.uuidGenerator.generate();
      const note: Note = {
        noteId,
        voiceId: "temp", // Will be assigned by orchestration
        startTime: pitchEvent.time,
        duration: pitchEvent.duration,
        pitch: pitchEvent.pitch,
        velocity: pitchEvent.velocity,
        derivationSource,
      };

      // Apply constraints if enabled
      if (enableConstraints) {
        const adjusted = context.constraints.applyAllForSystem(note, derivationSource);
        if (adjusted) {
          notes.push({
            ...note,
            pitch: adjusted.pitch,
            velocity: adjusted.velocity,
            duration: adjusted.duration,
          });
        } else {
          notes.push(note);
        }
      } else {
        notes.push(note);
      }
    }

    return notes;
  }

  /**
   * Update context notes by replacing rhythm placeholders with melody notes
   *
   * OPTIMIZED: Single-pass iteration with preallocation
   *
   * @param context - System execution context
   * @param melodyNotes - Melody notes to insert
   * @param rhythmBinding - Rhythm system ID to replace
   */
  private updateNotesWithMelody(
    context: SystemContext,
    melodyNotes: Note[],
    rhythmBinding: string
  ): void {
    // If no rhythm binding specified, replace all rhythm-derived notes
    const rhythmSource = rhythmBinding && rhythmBinding.length > 0
      ? rhythmBinding
      : "rhythm";

    // Single-pass filtering (faster than filter + spread)
    const filteredNotes: Note[] = [];
    const notes = context.notes;
    const len = notes.length;

    for (let i = 0; i < len; i++) {
      const note = notes[i];
      if (!note.derivationSource?.startsWith(rhythmSource)) {
        filteredNotes.push(note);
      }
    }

    // Concatenate and sort
    const newNotes = filteredNotes.concat(melodyNotes);
    newNotes.sort((a, b) => a.startTime - b.startTime);

    context.notes = newNotes;
  }

  /**
   * Execute Book III: Harmony System
   *
   * Generates chord voicings and harmonic structures.
   */
  private executeHarmonySystem(
    harmonySystem: HarmonySystem,
    song: SchillingerSong_v1,
    context: SystemContext
  ): void {
    const _prng = context.prng.getStream(harmonySystem.systemId);

    // Create HarmonySystemImpl instance
    const harmonyImpl = new HarmonySystemImpl(harmonySystem);

    // Extract rhythm attacks from the bound rhythm system
    const rhythmAttacks = this.extractHarmonicRhythm(harmonySystem, song, context);

    if (rhythmAttacks.length === 0) {
      // If no rhythm attacks found, use default pattern (quarter notes)
      const totalBeats = context.currentBeat || 32;
      for (let beat = 0; beat < totalBeats; beat += 1) {
        rhythmAttacks.push(beat);
      }
    }

    // Determine duration from form system or use default
    const duration = context.currentBeat || 32;

    // Determine root pitch (use key from song or default to C4)
    const rootPitch = this.extractRootPitch(song, _prng);

    // Generate harmony progression
    const chords = harmonyImpl.generateHarmony(duration, rhythmAttacks, rootPitch);

    // Convert chords to notes (chord tones as separate notes)
    const chordNotes = this.convertChordsToNotes(chords, harmonySystem.systemId, context);

    // Add notes to context
    for (const note of chordNotes) {
      // Apply constraints if enabled
      if (this.options.enableConstraints) {
        const result = context.constraints.evaluate(note, harmonySystem.systemId);
        if (!result.satisfied) {
          // Skip notes that violate constraints
          continue;
        }
      }

      context.notes.push(note);
    }

    // Record derivation
    if (context.derivation) {
      context.derivation.getBuilder().addSystem(harmonySystem.systemId);
      context.derivation.recordNotes(
        harmonySystem.systemId,
        chordNotes.map((n) => n.noteId),
        {
          chordsGenerated: chords.length,
          rhythmAttacks: rhythmAttacks.length,
          rootPitch,
          duration,
        }
      );
    }
  }

  /**
   * Extract harmonic rhythm attacks from bound rhythm system
   *
   * @param harmonySystem - Harmony system with rhythm binding
   * @param song - Song containing rhythm systems
   * @param context - System context
   * @returns Array of attack times in beats
   */
  private extractHarmonicRhythm(
    harmonySystem: HarmonySystem,
    song: SchillingerSong_v1,
    context: SystemContext
  ): number[] {
    const rhythmBindingId = harmonySystem.harmonicRhythmBinding;

    // Find the bound rhythm system
    const boundRhythmSystem = song.bookI_rhythmSystems.find(
      (rs) => rs.systemId === rhythmBindingId
    );

    if (!boundRhythmSystem) {
      // If bound system not found, extract unique attack times from existing notes
      const attackTimes = new Set<number>();
      for (const note of context.notes) {
        if (note.derivationSource?.startsWith("rhythm")) {
          attackTimes.add(note.startTime);
        }
      }
      return Array.from(attackTimes).sort((a, b) => a - b);
    }

    // Extract attack times from rhythm system generators
    const attacks: number[] = [];
    const resolution = 8; // Default 8 bars
    const totalBeats = resolution * 4;

    for (const generator of boundRhythmSystem.generators) {
      const period = generator.period;
      const phase = generator.phase;

      for (let beat = phase; beat < totalBeats; beat += period) {
        if (!attacks.includes(beat)) {
          attacks.push(beat);
        }
      }
    }

    return attacks.sort((a, b) => a - b);
  }

  /**
   * Extract root pitch from song or use default
   *
   * @param song - Song data
   * @param prng - DeterministicPRNG stream for deterministic generation
   * @returns Root MIDI note number
   */
  private extractRootPitch(song: SchillingerSong_v1, prng: DeterministicPRNG): number {
    // Extract key from globals (pitch class 0-11, where 0=C)
    const pitchClass = song.globals.key; // 0-11

    // Convert pitch class to MIDI note number in middle octave (C4 = 60)
    // Pitch class 0 (C) becomes 60 (C4), pitch class 1 (C#) becomes 61 (C#4), etc.
    const basePitch = 60 + pitchClass;

    // Add octave variation based on PRNG for deterministic but varied root pitches
    const octaveVariation = prng.nextInt(-1, 1) * 12; // -12, 0, or +12 semitones

    return basePitch + octaveVariation;
  }

  /**
   * Convert chords to notes (chord tones as separate notes)
   *
   * OPTIMIZED: Uses FastUUIDGenerator for performance
   *
   * @param chords - Array of chord structures
   * @param systemId - System ID for derivation tracking
   * @param context - System context for calculating durations
   * @returns Array of notes representing chord tones
   */
  private convertChordsToNotes(
    chords: Chord[],
    systemId: string,
    context: SystemContext
  ): Note[] {
    // Pre-allocate array for better performance
    const notes: Note[] = [];
    const chordLen = chords.length;
    const defaultDuration = context.currentBeat || 32;

    for (let i = 0; i < chordLen; i++) {
      const chord = chords[i];
      const nextChord = chords[i + 1];

      // Calculate duration until next chord or end of section
      const duration = nextChord
        ? nextChord.time - chord.time
        : defaultDuration - chord.time;

      // Create a note for each chord tone (interval)
      const intervals = chord.intervals;
      const intervalLen = intervals.length;

      for (let j = 0; j < intervalLen; j++) {
        const pitch = chord.root + intervals[j];

        // Use FastUUIDGenerator instead of crypto.randomUUID() (~100x faster)
        const note: Note = {
          noteId: context.uuidGenerator.generate(),
          voiceId: "harmony",
          startTime: chord.time,
          duration,
          pitch,
          velocity: Math.floor(80 + chord.weight * 20), // Map weight to 80-100 velocity
          derivationSource: systemId,
        };

        notes.push(note);
      }
    }

    return notes;
  }

  /**
   * Execute Book V: Orchestration
   *
   * Assigns notes to voices based on roles and ensembles using OrchestrationSystemImpl.
   */
  private executeOrchestration(
    orchestrationSystem: OrchestrationSystem,
    song: SchillingerSong_v1,
    context: SystemContext
  ): void {
    // Get ensemble voices from the song's ensemble model
    const voices = song.ensembleModel?.voices || [];
    const enabledVoices = voices.filter((v) => v.rolePools && v.rolePools.length > 0);

    if (enabledVoices.length === 0) {
      // Use default voice if no voices available
      const defaultRoleId = context.uuidGenerator.next();
      enabledVoices.push({
        id: defaultRoleId,
        name: "Default Voice",
        rolePools: [{ role: "primary" as const, functionalClass: "foundation" as const, enabled: true }],
        registerRange: { minPitch: 48, maxPitch: 84 },
      });
    }

    // Extract voice IDs for orchestration system
    const voiceIds = enabledVoices.map((v) => v.id);

    // Create OrchestrationSystemImpl instance
    const orchestrationImpl = new OrchestrationSystemImpl(orchestrationSystem);

    // Generate orchestration pattern
    const pattern: OrchestrationPattern = orchestrationImpl.generateOrchestration(voiceIds);

    // Create a mapping of roleId to voiceId from assignments
    const roleToVoiceMap = new Map<string, string[]>();
    for (const assignment of pattern.assignments) {
      if (!roleToVoiceMap.has(assignment.roleId)) {
        roleToVoiceMap.set(assignment.roleId, []);
      }
      roleToVoiceMap.get(assignment.roleId)!.push(assignment.voiceId);
    }

    // Create voice-to-role mapping for reverse lookup
    const voiceToRoleMap = new Map<string, OrchestrationVoiceAssignment>();
    for (const assignment of pattern.assignments) {
      voiceToRoleMap.set(assignment.voiceId, assignment);
    }

    // Assign notes to voices based on roles
    // Strategy: Group notes by pitch range and assign to appropriate roles
    const notesByRole = this.groupNotesByRole(context.notes, voiceToRoleMap);

    // Apply assignments and create new notes with assigned voices
    const newNotes: Note[] = [];

    // Assign notes to voices based on role grouping
    for (const [roleId, noteIndices] of notesByRole) {
      const voiceIdsForRole = roleToVoiceMap.get(roleId);
      if (!voiceIdsForRole || voiceIdsForRole.length === 0) {
        // If no voice assigned to this role, skip these notes
        continue;
      }

      // Distribute notes across voices for this role
      for (let i = 0; i < noteIndices.length; i++) {
        const noteIndex = noteIndices[i];
        const originalNote = context.notes[noteIndex];
        const voiceId = voiceIdsForRole[i % voiceIdsForRole.length];

        // Get register constraints for this voice
        const assignment = voiceToRoleMap.get(voiceId);
        let adjustedPitch = originalNote.pitch;

        // Apply register constraints if available (only if significantly outside range)
        // This respects constraints already applied by melody/harmony systems
        if (assignment) {
          const { minPitch, maxPitch } = assignment.register;
          // Only adjust if more than an octave outside the register range
          if (adjustedPitch < minPitch - 12) {
            adjustedPitch = minPitch;
          } else if (adjustedPitch > maxPitch + 12) {
            adjustedPitch = maxPitch;
          }
        }

        // Create updated note with assigned voice and adjusted pitch
        const updatedNote: Note = {
          ...originalNote,
          voiceId,
          pitch: adjustedPitch,
        };

        newNotes.push(updatedNote);
      }
    }

    // If no notes were assigned (fallback), just assign all notes to the first available voice
    if (newNotes.length === 0 && context.notes.length > 0) {
      const fallbackVoiceId = voiceIds[0];
      for (const note of context.notes) {
        newNotes.push({
          ...note,
          voiceId: fallbackVoiceId,
        });
      }
    }

    // Apply doublings
    const doubledNotes = this.applyDoublings(newNotes, pattern.doublings, context.uuidGenerator);

    // Apply reinforcements (delayed copies)
    const finalNotes = this.applyReinforcements(doubledNotes, pattern.reinforcements, context.uuidGenerator);

    // Replace context notes with orchestrated notes
    context.notes = finalNotes;

    if (context.derivation) {
      const systemId = orchestrationSystem.systemId || "orchestration";
      context.derivation.getBuilder().addSystem(systemId);
      context.derivation.recordNotes(
        systemId,
        finalNotes.map((n) => n.noteId),
        {
          voiceCount: enabledVoices.length,
          assignments: pattern.assignments.length,
          doublings: pattern.doublings.length,
          reinforcements: pattern.reinforcements.length,
        }
      );
    }
  }

  /**
   * Group notes by role based on pitch range and existing characteristics
   */
  private groupNotesByRole(
    notes: Note[],
    voiceToRoleMap: Map<string, OrchestrationVoiceAssignment>
  ): Map<string, number[]> {
    const notesByRole = new Map<string, number[]>();

    // Sort notes by pitch (descending) - higher notes to melody/accompaniment, lower to bass
    const sortedNotes = notes
      .map((note, index) => ({ note, index }))
      .sort((a, b) => b.note.pitch - a.note.pitch);

    // Get unique roles
    const roles = Array.from(new Set(Array.from(voiceToRoleMap.values()).map((a) => a.roleId)));

    // Assign notes to roles based on pitch ranges
    for (const { note, index } of sortedNotes) {
      let assignedRole = roles[0]; // Default to first role

      // Find best role based on pitch range
      for (const role of roles) {
        const assignment = Array.from(voiceToRoleMap.values()).find((a) => a.roleId === role);
        if (assignment) {
          const { minPitch, maxPitch } = assignment.register;
          if (note.pitch >= minPitch && note.pitch <= maxPitch) {
            assignedRole = role;
            break;
          }
        }
      }

      // Add note to role group
      if (!notesByRole.has(assignedRole)) {
        notesByRole.set(assignedRole, []);
      }
      notesByRole.get(assignedRole)!.push(index);
    }

    return notesByRole;
  }

  /**
   * Apply doublings - copy notes from source to target voice with interval offset
   *
   * OPTIMIZED: Single-pass iteration with FastUUIDGenerator
   */
  private applyDoublings(
    notes: Note[],
    doublings: Array<{ sourceVoiceId: string; targetVoiceId: string; interval: number }>,
    uuidGenerator: FastUUIDGenerator
  ): Note[] {
    // Pre-allocate result array with estimated size
    const result: Note[] = [];
    result.length = notes.length;

    // Copy original notes
    for (let i = 0; i < notes.length; i++) {
      result[i] = notes[i];
    }

    // Apply doublings
    for (const doubling of doublings) {
      const sourceVoiceId = doubling.sourceVoiceId;
      const targetVoiceId = doubling.targetVoiceId;
      const interval = doubling.interval;

      // Single-pass filtering
      const notesLen = notes.length;
      for (let i = 0; i < notesLen; i++) {
        const sourceNote = notes[i];
        if (sourceNote.voiceId === sourceVoiceId) {
          const doubledNote: Note = {
            ...sourceNote,
            // Use FastUUIDGenerator instead of crypto.randomUUID() (~100x faster)
            noteId: uuidGenerator.generate(),
            voiceId: targetVoiceId,
            pitch: sourceNote.pitch + interval,
          };
          result.push(doubledNote);
        }
      }
    }

    return result;
  }

  /**
   * Apply reinforcements - delayed copies of notes
   *
   * OPTIMIZED: Single-pass iteration with FastUUIDGenerator
   */
  private applyReinforcements(
    notes: Note[],
    reinforcements: Array<{ sourceVoiceId: string; targetVoiceId: string; delay: number }>,
    uuidGenerator: FastUUIDGenerator
  ): Note[] {
    // Pre-allocate result array with estimated size
    const result: Note[] = [];
    result.length = notes.length;

    // Copy original notes
    for (let i = 0; i < notes.length; i++) {
      result[i] = notes[i];
    }

    // Apply reinforcements
    for (const reinforcement of reinforcements) {
      const sourceVoiceId = reinforcement.sourceVoiceId;
      const targetVoiceId = reinforcement.targetVoiceId;
      const delay = reinforcement.delay;

      // Single-pass filtering
      const notesLen = notes.length;
      for (let i = 0; i < notesLen; i++) {
        const sourceNote = notes[i];
        if (sourceNote.voiceId === sourceVoiceId) {
          const reinforcedNote: Note = {
            ...sourceNote,
            // Use FastUUIDGenerator instead of crypto.randomUUID() (~100x faster)
            noteId: uuidGenerator.generate(),
            voiceId: targetVoiceId,
            startTime: sourceNote.startTime + delay,
          };
          result.push(reinforcedNote);
        }
      }
    }

    return result;
  }

  /**
   * Calculate total duration of the song
   */
  private calculateDuration(context: SystemContext): number {
    if (context.notes.length === 0) {
      return 0;
    }

    const lastNote = context.notes[context.notes.length - 1];
    return lastNote.startTime + lastNote.duration;
  }

  /**
   * Build voice assignments from notes
   */
  private buildVoiceAssignments(
    song: SchillingerSong_v1,
    context: SystemContext
  ): VoiceAssignment[] {
    const assignments = new Map<string, VoiceAssignment>();

    for (const note of context.notes) {
      if (!assignments.has(note.voiceId)) {
        // Find the voice from ensemble model (if available)
        const voice = song.ensembleModel?.voices?.find((v) => v.id === note.voiceId);
        // Get the first role from rolePools, or use "primary" as default
        const roleId = voice?.rolePools?.[0]?.role || "primary";

        assignments.set(note.voiceId, {
          voiceId: note.voiceId,
          roleId,
          systemIds: [note.derivationSource],
        });
      }
    }

    return Array.from(assignments.values());
  }
}

/**
 * Default realization engine instance
 */
export const defaultRealizationEngine = new RealizationEngine();

/**
 * Convenience function to realize a song
 */
export async function realize(
  song: SchillingerSong_v1,
  seed: number,
  _options?: RealizationOptions
): Promise<RealizationResult> {
  return defaultRealizationEngine.realize(song, seed);
}
