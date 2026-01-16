/**
 * SongModelBuilder
 *
 * Builder pattern for creating SongModel_v1 instances from RealizationPlane.
 *
 * TDD Phase: GREEN - Implementation skeleton, tests will drive completion
 *
 * This component will be implemented by Agent 4 after Agents 1-3 create:
 * - SongModel_v1 type (Agent 1)
 * - RealizationPlane with proper projection support (Agent 3)
 * - DeterministicEventEmitter (Agent 2)
 */

import {
  MusicalTime,
  RealizationPlane,
  RealizedLayer,
} from "../types/realization";

// SongModel_v1 will be created by Agent 1
export interface SongModel_v1 {
  version: "1.0";
  id: string;
  createdAt: number;
  metadata: any;
  transport: any;
  sections: any[];
  roles: any[];
  projections: any[];
  mixGraph: any;
  realizationPolicy: any;
  determinismSeed: string;
}

export interface SongModelBuilderConfig {
  /** Base sample rate for audio rendering */
  sampleRate: number;
  /** Default determinism seed if none provided */
  defaultSeed?: string;
  /** Enable strict validation */
  strictMode?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Builder class for creating SongModel_v1 from RealizationPlane
 */
export class SongModelBuilder {
  private config: SongModelBuilderConfig;
  private model: Partial<SongModel_v1>;

  constructor(config: SongModelBuilderConfig) {
    this.config = {
      sampleRate: config.sampleRate || 48000,
      defaultSeed: config.defaultSeed || "default-seed",
      strictMode: config.strictMode !== false,
    };
    this.model = {
      version: "1.0",
      createdAt: Date.now(),
    };
  }

  /**
   * Build SongModel from RealizationPlane
   * This is the main method that transforms realization to execution model
   */
  buildFromRealizationPlane(plane: RealizationPlane): SongModel_v1 {
    // Validate input
    if (!plane || !plane.id) {
      throw new Error("Invalid RealizationPlane: missing id");
    }

    // Extract metadata
    this.model.id = `songmodel-${plane.id}`;
    this.model.metadata = {
      sourcePlaneId: plane.id,
      sourceType: "RealizationPlane",
      sampleRate: this.config.sampleRate,
    };

    // Extract transport configuration
    this.model.transport = this.extractTransportConfig(plane);

    // Extract sections from time window
    this.model.sections = this.extractSections(plane);

    // Extract roles from generator set
    this.model.roles = this.extractRoles(plane);

    // Extract projections
    this.model.projections = this.extractProjections(plane);

    // Build mix graph
    this.model.mixGraph = this.buildMixGraph(plane);

    // Extract realization policy
    this.model.realizationPolicy = this.extractRealizationPolicy(plane);

    // Set determinism seed
    this.model.determinismSeed =
      this.config.defaultSeed || `seed-${plane.id}-${Date.now()}`;

    // Validate complete model
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(
        `SongModel validation failed:\n${validation.errors.join("\n")}`,
      );
    }

    return this.model as SongModel_v1;
  }

  /**
   * Set determinism seed explicitly
   */
  setDeterminismSeed(seed: string): this {
    this.model.determinismSeed = seed;
    return this;
  }

  /**
   * Add metadata to model
   */
  setMetadata(metadata: Record<string, any>): this {
    this.model.metadata = {
      ...this.model.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * Validate current model state
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!this.model.version) {
      errors.push("Missing version");
    }
    if (this.model.version !== "1.0") {
      errors.push(`Invalid version: ${this.model.version}, expected '1.0'`);
    }
    if (!this.model.id) {
      errors.push("Missing id");
    }
    if (!this.model.determinismSeed) {
      errors.push("Missing determinismSeed");
    }
    if (!this.model.transport) {
      errors.push("Missing transport configuration");
    }
    if (!this.model.roles || this.model.roles.length === 0) {
      errors.push("Missing roles (at least one role required)");
    }
    if (!this.model.mixGraph) {
      errors.push("Missing mixGraph");
    }

    // Warnings
    if (this.config.strictMode) {
      if (!this.model.sections || this.model.sections.length === 0) {
        warnings.push("No sections defined (optional but recommended)");
      }
      if (!this.model.projections || this.model.projections.length === 0) {
        warnings.push("No projections defined (roles will not be heard)");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Serialize model to JSON
   */
  toJSON(): string {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(
        `Cannot serialize invalid model:\n${validation.errors.join("\n")}`,
      );
    }
    return JSON.stringify(this.model, null, 2);
  }

  /**
   * Deserialize JSON to SongModel
   */
  static fromJSON(json: string): SongModel_v1 {
    const model = JSON.parse(json);
    const builder = new SongModelBuilder({ sampleRate: 48000 });
    builder.model = model;
    const validation = builder.validate();
    if (!validation.valid) {
      throw new Error(
        `Invalid SongModel JSON:\n${validation.errors.join("\n")}`,
      );
    }
    return model as SongModel_v1;
  }

  /**
   * Extract transport configuration from RealizationPlane
   */
  private extractTransportConfig(plane: RealizationPlane): any {
    return {
      tempoMap: [], // Will be extracted from plane metadata
      timeSignatureMap: [], // Will be extracted from plane metadata
      loopPolicy: {
        enabled: false,
        start: 0,
        end: plane.timeWindow?.duration || 0,
        count: 1,
      },
      playbackSpeed: 1.0,
    };
  }

  /**
   * Extract sections from time window and traversal plan
   */
  private extractSections(plane: RealizationPlane): any[] {
    // For now, create single section covering entire time window
    if (!plane.timeWindow) {
      return [];
    }

    return [
      {
        id: "section-main",
        name: "Main Section",
        start: plane.timeWindow.start,
        end: plane.timeWindow.end,
        roles: [], // Will be populated from generator set
      },
    ];
  }

  /**
   * Extract roles from generator set
   */
  private extractRoles(plane: RealizationPlane): any[] {
    const roles: any[] = [];

    if (!plane.generators) {
      return roles;
    }

    // Extract rhythm role
    if (plane.generators.rhythm) {
      roles.push({
        id: plane.generators.rhythm.id,
        name: "Rhythm",
        type: "rhythm",
        generatorConfig: plane.generators.rhythm.parameters,
        parameters: {},
      });
    }

    // Extract harmony role
    if (plane.generators.harmony) {
      roles.push({
        id: plane.generators.harmony.id,
        name: "Harmony",
        type: "harmony",
        generatorConfig: plane.generators.harmony.parameters,
        parameters: {},
      });
    }

    // Extract melody role
    if (plane.generators.contour) {
      roles.push({
        id: plane.generators.contour.id,
        name: "Melody",
        type: "melody",
        generatorConfig: plane.generators.contour.parameters,
        parameters: {},
      });
    }

    return roles;
  }

  /**
   * Extract projections from plane
   */
  private extractProjections(plane: RealizationPlane): any[] {
    // For now, create default projections for each role
    const projections: any[] = [];
    const roles = this.extractRoles(plane);

    roles.forEach((role, index) => {
      projections.push({
        id: `proj-${role.id}`,
        roleId: role.id,
        target: {
          type: "track",
          id: `track-${index}`,
        },
      });
    });

    return projections;
  }

  /**
   * Build mix graph from plane
   */
  private buildMixGraph(plane: RealizationPlane): any {
    const roles = this.extractRoles(plane);
    const tracks = roles.map((role, index) => ({
      id: `track-${index}`,
      name: role.name,
      instrument: "default",
      output: { format: "audio", bus: "master" },
      parameters: {
        volume: 0.7,
        pan: 0.0,
      },
    }));

    return {
      tracks,
      buses: [],
      sends: [],
      master: {
        id: "master",
        volume: 1.0,
        parameters: {},
      },
    };
  }

  /**
   * Extract realization policy from plane
   */
  private extractRealizationPolicy(plane: RealizationPlane): any {
    return {
      windowSize: plane.timeWindow || { seconds: 2.0 },
      lookaheadDuration: plane.configuration?.layerCapacity
        ? { seconds: plane.configuration.layerCapacity * 0.1 }
        : { seconds: 0.5 },
      determinismMode: "strict",
    };
  }
}

/**
 * Factory function for convenient SongModel creation
 */
export function buildSongModel(
  plane: RealizationPlane,
  config?: Partial<SongModelBuilderConfig>,
): SongModel_v1 {
  const builder = new SongModelBuilder({
    sampleRate: 48000,
    ...config,
  });
  return builder.buildFromRealizationPlane(plane);
}
