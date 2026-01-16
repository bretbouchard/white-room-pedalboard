/**
 * VariationIntentIR - Non-Destructive Musical Variation
 *
 * Represents non-destructive musical variation.
 *
 * This is how the system evolves, not regenerates.
 *
 * Responsibility:
 * - References base pattern
 * - Specifies variation operations
 * - Optional intensity curve
 * - Provides seed for deterministic variation
 *
 * Rules:
 * - Does not delete original PatternIR
 * - Produces new PatternIR + ProcessIR
 * - Must be reversible
 *
 * What this enables:
 * - Motif families
 * - AI-driven reinterpretation
 * - Schillinger-style development
 * - Long-form evolution
 *
 * v1.0 - Initial release
 */

import type { PatternId, VariationIntentId } from "./types";

/**
 * Variation operation types
 */
export type VariationOperation =
  | "augmentation"
  | "diminution"
  | "interference"
  | "phase_shift"
  | "register_rotation"
  | "density_warp"
  | "rhythmic_displacement";

/**
 * VariationIntentIR v1.0 - Non-Destructive Musical Variation
 */
export interface VariationIntentIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Variation identifier
   */
  id: VariationIntentId;

  /**
   * Base pattern to vary
   */
  basePattern: PatternId;

  /**
   * Variation operations to apply
   */
  operations: VariationOperation[];

  /**
   * Intensity (0-1)
   */
  intensity: number;

  /**
   * Seed for deterministic variation
   */
  seed: number;
}
