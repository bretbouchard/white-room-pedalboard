/**
 * ProcessIR — Schillinger Operations
 *
 * Responsibility: Captures how patterns were generated
 *
 * Rules:
 * - Every generated PatternIR must have a ProcessIR
 * - Enables explainability, evolution, reverse analysis
 */

import type { ProcessId, PatternIRId } from "./types";

// Re-export ProcessId for convenience
export type { ProcessId };

/**
 * Process operation types from Schillinger System (Phase 3)
 */
export type ProcessOperation =
  | "resultant"
  | "interference"
  | "permutation"
  | "rotation"
  | "expansion"
  | "contraction"
  | "inversion"
  | "reflection"
  | "phase_shift";

/**
 * ProcessIR_v1 - Captures Schillinger operation provenance
 *
 * ProcessIR records the generator operation that created a pattern,
 * enabling explainability and reverse analysis.
 */
export interface ProcessIR_v1 {
  version: "1.0";

  /**
   * Unique identifier for this process
   */
  id: ProcessId;

  /**
   * Seed used for deterministic generation
   */
  seed: number;

  /**
   * Schillinger operation (Phase 3)
   */
  operation: ProcessOperation;

  /**
   * Input pattern IRs (for operations that combine patterns)
   */
  inputs: PatternIRId[];

  /**
   * Operation-specific parameters
   * e.g., generators for resultant: [3, 4]
   */
  parameters: Record<string, number>;

  /**
   * Output pattern IR produced by this process
   */
  output: PatternIRId;
}
