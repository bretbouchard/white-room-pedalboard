/**
 * SchillingerSong_v1 Implementation
 *
 * Canonical theory object containing only systems, parameters, bindings, and constraints.
 * Zero notes, zero events - pure theory representation.
 *
 * This class provides:
 * - Validation against schema
 * - Serialization/deserialization (JSON)
 * - Factory methods for creating songs
 * - Helper methods for common operations
 */

import { generateUUID, isValidUUID } from "../utils/uuid";
import {
  SchillingerSong_v1 as SchillingerSongType,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  EnsembleModel,
  Voice,
  RoleRhythmBinding,
  RoleMelodyBinding,
  RoleHarmonyBinding,
  RoleEnsembleBinding,
  Constraint,
} from "../types";
import { validate, addSchema } from "../schemas";
import schillingerSongSchema from "../schemas/schillinger-song-v1.schema.json";

// Register the schema for validation
addSchema(schillingerSongSchema, "schillinger-song-v1");

/**
 * Validation result for SchillingerSong
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SchillingerSong_v1 - Theory-first song representation
 *
 * This is the canonical source of truth for all compositions.
 * Contains only theoretical systems and parameters, zero notes.
 */
export class SchillingerSong implements SchillingerSongType {
  readonly schemaVersion = "1.0" as const;
  readonly songId: string;
  readonly globals: {
    tempo: number;
    timeSignature: [number, number];
    key: number;
  };
  bookI_rhythmSystems: RhythmSystem[];
  bookII_melodySystems: MelodySystem[];
  bookIII_harmonySystems: HarmonySystem[];
  bookIV_formSystem: FormSystem | null;
  bookV_orchestration: OrchestrationSystem;
  ensembleModel: EnsembleModel;
  bindings: {
    roleRhythmBindings: RoleRhythmBinding[];
    roleMelodyBindings: RoleMelodyBinding[];
    roleHarmonyBindings: RoleHarmonyBinding[];
    roleEnsembleBindings: RoleEnsembleBinding[];
  };
  constraints: Constraint[];
  provenance: {
    readonly createdAt: string;
    readonly createdBy: string;
    readonly modifiedAt: string;
    readonly derivationChain: string[];
  };

  private constructor(data: SchillingerSongType) {
    this.songId = data.songId;
    this.globals = data.globals;
    this.bookI_rhythmSystems = data.bookI_rhythmSystems;
    this.bookII_melodySystems = data.bookII_melodySystems;
    this.bookIII_harmonySystems = data.bookIII_harmonySystems;
    this.bookIV_formSystem = data.bookIV_formSystem;
    this.bookV_orchestration = data.bookV_orchestration;
    this.ensembleModel = data.ensembleModel;
    this.bindings = data.bindings;
    this.constraints = data.constraints;
    this.provenance = data.provenance;
  }

  /**
   * Create a new SchillingerSong from data
   *
   * @param data - Song data
   * @returns New SchillingerSong instance
   * @throws Error if validation fails
   */
  static create(data: Omit<SchillingerSongType, "schemaVersion">): SchillingerSong {
    // Add schema version
    const fullData: SchillingerSongType = {
      schemaVersion: "1.0",
      ...data,
    };

    // Validate
    const validation = SchillingerSong.validate(fullData);
    if (!validation.valid) {
      throw new Error(`Invalid SchillingerSong: ${validation.errors.join(", ")}`);
    }

    return new SchillingerSong(fullData);
  }

  /**
   * Validate a SchillingerSong data object
   *
   * @param data - Song data to validate
   * @returns Validation result
   */
  static validate(data: SchillingerSongType): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    const schemaResult = validate("schillinger-song-v1", data);
    if (!schemaResult.valid) {
      errors.push(...schemaResult.errors.map((e) => `${e.path}: ${e.message}`));
    }

    // Business logic validation
    if (!isValidUUID(data.songId)) {
      errors.push(`songId: Invalid UUID "${data.songId}"`);
    }

    if (data.globals.tempo < 40 || data.globals.tempo > 300) {
      errors.push(`Tempo ${data.globals.tempo} out of range (40-300)`);
    }

    const [numerator, denominator] = data.globals.timeSignature;
    if (numerator < 1 || numerator > 16) {
      errors.push(`Time signature numerator ${numerator} out of range (1-16)`);
    }
    if (!isPowerOfTwo(denominator)) {
      errors.push(`Time signature denominator ${denominator} must be power of 2`);
    }

    if (data.globals.key < 0 || data.globals.key > 11) {
      errors.push(`Key ${data.globals.key} out of range (0-11)`);
    }

    // Check system ID uniqueness
    const allSystemIds = new Set<string>();
    const checkSystemId = (id: string, context: string) => {
      if (!isValidUUID(id)) {
        errors.push(`${context}: Invalid UUID "${id}"`);
      }
      if (allSystemIds.has(id)) {
        errors.push(`${context}: Duplicate system ID "${id}"`);
      }
      allSystemIds.add(id);
    };

    data.bookI_rhythmSystems.forEach((s) => checkSystemId(s.systemId, "RhythmSystem"));
    data.bookII_melodySystems.forEach((s) => checkSystemId(s.systemId, "MelodySystem"));
    data.bookIII_harmonySystems.forEach((s) => checkSystemId(s.systemId, "HarmonySystem"));
    if (data.bookIV_formSystem) {
      checkSystemId(data.bookIV_formSystem.systemId, "FormSystem");
    }
    checkSystemId(data.bookV_orchestration.systemId, "OrchestrationSystem");

    // Check voice ID uniqueness
    const allVoiceIds = new Set<string>();
    data.ensembleModel.voices.forEach((v) => {
      if (!isValidUUID(v.id)) {
        errors.push(`Voice: Invalid UUID "${v.id}"`);
      }
      if (allVoiceIds.has(v.id)) {
        errors.push(`Voice: Duplicate voice ID "${v.id}"`);
      }
      allVoiceIds.add(v.id);
    });

    // Warnings for empty systems
    if (data.bookI_rhythmSystems.length === 0) {
      warnings.push("No rhythm systems defined - song will have no notes");
    }
    if (data.bookI_rhythmSystems.length > 10) {
      warnings.push("Many rhythm systems may result in dense texture");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Serialize song to JSON
   *
   * Note: Returns an object for JSON.stringify compatibility.
   * Use toString() to get a JSON string.
   */
  toJSON(): SchillingerSongType {
    return {
      schemaVersion: this.schemaVersion,
      songId: this.songId,
      globals: this.globals,
      bookI_rhythmSystems: this.bookI_rhythmSystems,
      bookII_melodySystems: this.bookII_melodySystems,
      bookIII_harmonySystems: this.bookIII_harmonySystems,
      bookIV_formSystem: this.bookIV_formSystem,
      bookV_orchestration: this.bookV_orchestration,
      ensembleModel: this.ensembleModel,
      bindings: this.bindings,
      constraints: this.constraints,
      provenance: this.provenance,
    };
  }

  /**
   * Convert to JSON string
   *
   * @returns JSON string representation
   */
  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  /**
   * Deserialize song from JSON
   *
   * @param json - JSON string
   * @returns SchillingerSong instance
   * @throws Error if JSON is invalid
   */
  static fromJSON(json: string): SchillingerSong {
    try {
      const data = JSON.parse(json) as SchillingerSongType;
      return SchillingerSong.create(data);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create a minimal valid song (for testing)
   *
   * @param options - Optional overrides
   * @returns New SchillingerSong with minimal configuration
   */
  static minimal(options?: Partial<SchillingerSongType>): SchillingerSong {
    const now = new Date().toISOString();

    return SchillingerSong.create({
      songId: generateUUID(),
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [],
      bookII_melodySystems: [],
      bookIII_harmonySystems: [],
      bookIV_formSystem: null,
      bookV_orchestration: {
        systemId: generateUUID(),
        systemType: "orchestration",
        roles: [],
        registerSystem: {
          systemId: generateUUID(),
          roleRegisters: [],
        },
        spacingSystem: {
          systemId: generateUUID(),
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: generateUUID(),
          roleDensity: [],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      },
      ensembleModel: {
        version: "1.0",
        id: generateUUID(),
        voices: [],
        voiceCount: 0,
        groups: [],
      },
      bindings: {
        roleRhythmBindings: [],
        roleMelodyBindings: [],
        roleHarmonyBindings: [],
        roleEnsembleBindings: [],
      },
      constraints: [],
      provenance: {
        createdAt: now,
        createdBy: "system",
        modifiedAt: now,
        derivationChain: [],
      },
      ...options,
    });
  }

  /**
   * Create a song without validation (for testing only)
   *
   * @param data - Song data (may be invalid)
   * @returns SchillingerSong instance without validation
   * @internal
   */
  static _createForTesting(data: SchillingerSongType): SchillingerSong {
    return new SchillingerSong(data);
  }

  /**
   * Get all system IDs in the song
   *
   * @returns Array of system IDs
   */
  getSystemIds(): string[] {
    const ids: string[] = [];

    this.bookI_rhythmSystems.forEach((s) => ids.push(s.systemId));
    this.bookII_melodySystems.forEach((s) => ids.push(s.systemId));
    this.bookIII_harmonySystems.forEach((s) => ids.push(s.systemId));
    if (this.bookIV_formSystem) {
      ids.push(this.bookIV_formSystem.systemId);
    }
    ids.push(this.bookV_orchestration.systemId);

    return ids;
  }

  /**
   * Get all voice IDs in the song
   *
   * @returns Array of voice IDs
   */
  getVoiceIds(): string[] {
    return this.ensembleModel.voices.map((v) => v.id);
  }

  /**
   * Get total duration in seconds (based on tempo)
   *
   * @param duration - Duration in beats
   * @returns Duration in seconds
   */
  beatsToSeconds(duration: number): number {
    const beatsPerSecond = this.globals.tempo / 60;
    return duration / beatsPerSecond;
  }

  /**
   * Update provenance information
   *
   * @param modifiedBy - User/system making the modification
   * @returns New SchillingerSong with updated provenance
   */
  updateProvenance(modifiedBy: string): SchillingerSong {
    const updatedData = this.toJSON();

    const newSongId = generateUUID();

    const newData: SchillingerSongType = {
      ...updatedData,
      songId: newSongId,
      provenance: {
        ...updatedData.provenance,
        modifiedAt: new Date().toISOString(),
        derivationChain: [...updatedData.provenance.derivationChain, this.songId],
        createdBy: modifiedBy,
      },
    };

    return SchillingerSong.create(newData);
  }
}

/**
 * Check if a number is a power of 2
 *
 * @param n - Number to check
 * @returns True if power of 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Create a SchillingerSong using builder pattern
 *
 * Provides a fluent interface for constructing songs.
 *
 * @example
 * ```typescript
 * const song = SchillingerSongBuilder
 *   .create()
 *   .withTempo(140)
 *   .withKey(7) // G major
 *   .withRhythmSystem({
 *     systemId: uuid(),
 *     systemType: 'rhythm',
 *     ...
 *   })
 *   .build();
 * ```
 */
export class SchillingerSongBuilder {
  private data: Omit<SchillingerSongType, "schemaVersion">;

  private constructor() {
    const now = new Date().toISOString();
    this.data = {
      songId: generateUUID(),
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [],
      bookII_melodySystems: [],
      bookIII_harmonySystems: [],
      bookIV_formSystem: null,
      bookV_orchestration: {
        systemId: generateUUID(),
        systemType: "orchestration",
        roles: [],
        registerSystem: {
          systemId: generateUUID(),
          roleRegisters: [],
        },
        spacingSystem: {
          systemId: generateUUID(),
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: generateUUID(),
          roleDensity: [],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      },
      ensembleModel: {
        version: "1.0",
        id: generateUUID(),
        voices: [],
        voiceCount: 0,
        groups: [],
      },
      bindings: {
        roleRhythmBindings: [],
        roleMelodyBindings: [],
        roleHarmonyBindings: [],
        roleEnsembleBindings: [],
      },
      constraints: [],
      provenance: {
        createdAt: now,
        createdBy: "user",
        modifiedAt: now,
        derivationChain: [],
      },
    };
  }

  /**
   * Start building a new song
   *
   * @returns New builder instance
   */
  static create(): SchillingerSongBuilder {
    return new SchillingerSongBuilder();
  }

  /**
   * Set tempo
   *
   * @param tempo - Tempo in BPM (40-300)
   * @returns Builder instance for chaining
   */
  withTempo(tempo: number): SchillingerSongBuilder {
    this.data.globals.tempo = tempo;
    return this;
  }

  /**
   * Set time signature
   *
   * @param numerator - Top number (beats per measure)
   * @param denominator - Bottom number (note value)
   * @returns Builder instance for chaining
   */
  withTimeSignature(numerator: number, denominator: number): SchillingerSongBuilder {
    this.data.globals.timeSignature = [numerator, denominator];
    return this;
  }

  /**
   * Set key
   *
   * @param key - Pitch class (0-11, 0=C)
   * @returns Builder instance for chaining
   */
  withKey(key: number): SchillingerSongBuilder {
    this.data.globals.key = key;
    return this;
  }

  /**
   * Add a rhythm system
   *
   * @param system - Rhythm system to add
   * @returns Builder instance for chaining
   */
  withRhythmSystem(system: RhythmSystem): SchillingerSongBuilder {
    this.data.bookI_rhythmSystems.push(system);
    return this;
  }

  /**
   * Add a melody system
   *
   * @param system - Melody system to add
   * @returns Builder instance for chaining
   */
  withMelodySystem(system: MelodySystem): SchillingerSongBuilder {
    this.data.bookII_melodySystems.push(system);
    return this;
  }

  /**
   * Add a harmony system
   *
   * @param system - Harmony system to add
   * @returns Builder instance for chaining
   */
  withHarmonySystem(system: HarmonySystem): SchillingerSongBuilder {
    this.data.bookIII_harmonySystems.push(system);
    return this;
  }

  /**
   * Set form system
   *
   * @param system - Form system (or null to remove)
   * @returns Builder instance for chaining
   */
  withFormSystem(system: FormSystem | null): SchillingerSongBuilder {
    this.data.bookIV_formSystem = system;
    return this;
  }

  /**
   * Add a voice to ensemble
   *
   * @param voice - Voice to add (partial Voice object, missing id will be generated)
   * @returns Builder instance for chaining
   */
  withVoice(voice: Omit<Voice, "id"> & { id?: string }): SchillingerSongBuilder {
    this.data.ensembleModel.voices.push({
      id: voice.id || generateUUID(),
      name: voice.name,
      rolePools: voice.rolePools,
      groupIds: voice.groupIds,
      registerRange: voice.registerRange,
    });

    return this;
  }

  /**
   * Add a binding
   *
   * @param binding - Binding to add
   * @returns Builder instance for chaining
   */
  withBinding(
    binding: RoleRhythmBinding | RoleMelodyBinding | RoleHarmonyBinding | RoleEnsembleBinding
  ): SchillingerSongBuilder {
    if ("rhythmSystemId" in binding) {
      this.data.bindings.roleRhythmBindings.push(binding as RoleRhythmBinding);
    } else if ("melodySystemId" in binding) {
      this.data.bindings.roleMelodyBindings.push(binding as RoleMelodyBinding);
    } else if ("harmonySystemId" in binding) {
      this.data.bindings.roleHarmonyBindings.push(binding as RoleHarmonyBinding);
    } else {
      this.data.bindings.roleEnsembleBindings.push(binding as RoleEnsembleBinding);
    }

    return this;
  }

  /**
   * Set creator
   *
   * @param createdBy - User/system ID
   * @returns Builder instance for chaining
   */
  withCreator(createdBy: string): SchillingerSongBuilder {
    this.data = {
      ...this.data,
      provenance: {
        ...this.data.provenance,
        createdBy,
      },
    };
    return this;
  }

  /**
   * Build the song
   *
   * @returns SchillingerSong instance
   * @throws Error if validation fails
   */
  build(): SchillingerSong {
    return SchillingerSong.create(this.data);
  }
}
