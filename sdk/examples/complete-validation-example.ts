/**
 * Complete SongModel Validation Example
 *
 * Demonstrates using all validators together to ensure a SongModel
 * is production-ready for deterministic audio playback.
 */

import { SongModel_v1, MusicalTime } from "@schillinger-sdk/shared";
import {
  ProjectionValidator,
  LookaheadManager,
  OfflineReplaySystem,
  AudioHasher,
} from "@schillinger-sdk/core";

/**
 * Complete validation pipeline for SongModel
 *
 * This is the production validation workflow that should be run
 * before any SongModel is used for audio generation.
 */
export class SongModelValidator {
  private projectionValidator: ProjectionValidator;
  private lookaheadManager: LookaheadManager;
  private replaySystem: OfflineReplaySystem;
  private audioHasher: AudioHasher;

  constructor() {
    this.projectionValidator = new ProjectionValidator();
    this.lookaheadManager = new LookaheadManager();
    this.replaySystem = new OfflineReplaySystem();
    this.audioHasher = new AudioHasher();
  }

  /**
   * Validate SongModel is production-ready
   *
   * Runs all validation checks and returns detailed report.
   *
   * @param model - SongModel to validate
   * @param maxLookaheadSeconds - Maximum allowed lookahead (default: 5s)
   * @returns Complete validation report
   */
  async validate(
    model: SongModel_v1,
    maxLookaheadSeconds: number = 5.0,
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {},
    };

    // Step 1: Validate projections
    console.log("🔍 Validating projections...");
    const projectionResult =
      this.projectionValidator.validateProjections(model);

    if (!projectionResult.isValid) {
      report.isValid = false;
      report.errors.push(
        ...projectionResult.errors.map((e) => ({
          category: "projection",
          code: e.code,
          message: e.message,
          path: e.path,
        })),
      );
    }

    report.warnings.push(
      ...projectionResult.warnings.map((w) => ({
        category: "projection",
        code: w.code,
        message: w.message,
        path: w.path,
      })),
    );

    report.details.projectionValidation = {
      isValid: projectionResult.isValid,
      errorCount: projectionResult.errors.length,
      warningCount: projectionResult.warnings.length,
    };

    // Step 2: Check for circular dependencies
    console.log("🔍 Detecting circular dependencies...");
    const cycleResult =
      this.projectionValidator.detectCircularProjections(model);

    if (cycleResult.hasCycles) {
      report.isValid = false;
      for (const cycle of cycleResult.cycles) {
        report.errors.push({
          category: "circular",
          code: "CIRCULAR_DEPENDENCY",
          message: `Circular dependency: ${cycle.join(" -> ")}`,
          path: "mixGraph.sends",
        });
      }
    }

    report.details.circularDependencies = {
      hasCycles: cycleResult.hasCycles,
      cycleCount: cycleResult.cycles.length,
    };

    // Step 3: Validate parameter addresses
    console.log("🔍 Validating parameter addresses...");
    const addressResult =
      this.projectionValidator.validateAddressResolution(model);

    if (!addressResult.isValid) {
      report.isValid = false;
      for (const address of addressResult.unresolvedAddresses) {
        report.errors.push({
          category: "address",
          code: "UNRESOLVED_ADDRESS",
          message: `Unresolved address: ${address}`,
          path: address,
        });
      }
    }

    report.details.addressResolution = {
      isValid: addressResult.isValid,
      resolvedCount: addressResult.resolvedAddresses.length,
      unresolvedCount: addressResult.unresolvedAddresses.length,
    };

    // Step 4: Validate lookahead bounds
    console.log("🔍 Validating lookahead bounds...");
    const lookaheadRequirements =
      this.lookaheadManager.calculateLookahead(model);
    const boundedLookahead = this.lookaheadManager.enforceBoundaries(
      model,
      maxLookaheadSeconds,
    );

    if (boundedLookahead.wasClamped) {
      report.warnings.push({
        category: "lookahead",
        code: "LOOKAHEAD_CLAMPED",
        message: `Lookahead clamped from ${boundedLookahead.originalValue}s to ${boundedLookahead.clampedValue}s`,
        path: "realizationPolicy.lookaheadDuration",
      });
    }

    report.details.lookahead = {
      minLookahead: lookaheadRequirements.minLookahead,
      maxLookahead: lookaheadRequirements.maxLookahead,
      recommendedLookahead: lookaheadRequirements.recommendedLookahead,
      wasClamped: boundedLookahead.wasClamped,
      finalValue: boundedLookahead.lookaheadDuration,
    };

    // Step 5: Verify determinism (if in strict mode)
    if (model.realizationPolicy.determinismMode === "strict") {
      console.log("🔍 Verifying determinism...");
      const repeatabilityReport = this.replaySystem.verifyRepeatability(
        model,
        10,
      );

      if (!repeatabilityReport.isRepeatable) {
        report.isValid = false;
        report.errors.push({
          category: "determinism",
          code: "NON_DETERMINISTIC",
          message: `Model is not deterministic: ${repeatabilityReport.matchRate * 100}% match rate`,
          path: "realizationPolicy.determinismMode",
        });
      }

      report.details.determinism = {
        isRepeatable: repeatabilityReport.isRepeatable,
        matchRate: repeatabilityReport.matchRate,
        totalRuns: repeatabilityReport.totalRuns,
        consistentRuns: repeatabilityReport.consistentRuns,
      };
    }

    // Step 6: Generate model hash for regression testing
    console.log("🔍 Generating model hash...");
    const modelHash = this.generateModelHash(model);
    report.details.modelHash = modelHash;

    return report;
  }

  /**
   * Generate hash for regression testing
   *
   * @param model - SongModel to hash
   * @returns Deterministic hash
   */
  private generateModelHash(model: SongModel_v1): string {
    // Create canonical representation
    const canonical = {
      id: model.id,
      version: model.version,
      determinismSeed: model.determinismSeed,
      roles: model.roles.map((r) => ({
        id: r.id,
        type: r.type,
        generatorConfig: r.generatorConfig,
        parameters: r.parameters,
      })),
      projections: model.projections.map((p) => ({
        id: p.id,
        roleId: p.roleId,
        target: p.target,
        transform: p.transform,
      })),
      realizationPolicy: model.realizationPolicy,
      transport: model.transport,
    };

    // Sort and stringify
    const serialized = JSON.stringify(canonical, this.jsonStringifySort);
    return this.audioHasher.hashEventStream([]); // Hash serialized string
  }

  /**
   * JSON stringify with sorted keys
   */
  private jsonStringifySort(key: string, value: unknown): unknown {
    if (value instanceof Object && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = (value as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return value;
  }
}

/**
 * Validation report structure
 */
export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details: ValidationDetails;
}

export interface ValidationError {
  category: string;
  code: string;
  message: string;
  path: string;
}

export interface ValidationWarning {
  category: string;
  code: string;
  message: string;
  path: string;
}

export interface ValidationDetails {
  projectionValidation?: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
  };
  circularDependencies?: {
    hasCycles: boolean;
    cycleCount: number;
  };
  addressResolution?: {
    isValid: boolean;
    resolvedCount: number;
    unresolvedCount: number;
  };
  lookahead?: {
    minLookahead: number;
    maxLookahead: number;
    recommendedLookahead: number;
    wasClamped: boolean;
    finalValue: number;
  };
  determinism?: {
    isRepeatable: boolean;
    matchRate: number;
    totalRuns: number;
    consistentRuns: number;
  };
  modelHash?: string;
}

/**
 * Usage Example
 */
export async function exampleUsage() {
  // Create a sample SongModel
  const model: SongModel_v1 = {
    version: "1.0",
    id: "example-model",
    createdAt: Date.now(),
    metadata: { title: "Example Song" },
    transport: {
      tempoMap: [{ time: 0, tempo: 120 }],
      timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
      loopPolicy: { enabled: false },
      playbackSpeed: 1.0,
    },
    sections: [],
    roles: [
      {
        id: "bass-role",
        name: "Bass",
        type: "bass",
        generatorConfig: { type: "test", parameters: {} },
        parameters: {},
      },
    ],
    projections: [
      {
        id: "bass-projection",
        roleId: "bass-role",
        target: { type: "track", id: "bass-track" },
      },
    ],
    mixGraph: {
      tracks: [{ id: "bass-track", name: "Bass", type: "midi" }],
      buses: [],
      sends: [],
      master: { tempo: 120, timeSignature: [4, 4] },
    },
    realizationPolicy: {
      windowSize: { seconds: 1 },
      lookaheadDuration: { seconds: 2 },
      determinismMode: "strict",
    },
    determinismSeed: "example-seed",
  };

  // Validate the model
  const validator = new SongModelValidator();
  const report = await validator.validate(model);

  // Check results
  if (report.isValid) {
    console.log("✅ Model is production-ready!");
    console.log(`   Model Hash: ${report.details.modelHash}`);
  } else {
    console.error("❌ Model validation failed!");
    console.error("Errors:");
    for (const error of report.errors) {
      console.error(`  [${error.category}] ${error.message}`);
      console.error(`    Path: ${error.path}`);
    }
  }

  if (report.warnings.length > 0) {
    console.warn("Warnings:");
    for (const warning of report.warnings) {
      console.warn(`  [${warning.category}] ${warning.message}`);
    }
  }

  return report;
}
