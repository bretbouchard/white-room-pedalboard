/**
 * Realization Pipeline
 *
 * Deterministic conversion from SchillingerSong_v1 to SongModel_v1.
 * Uses PCG-random PRNG for cross-platform consistency.
 *
 * Output: Executable song model with derivation tracking.
 */

// Main realization engine
export {
  RealizationEngine,
  defaultRealizationEngine,
  realize,
  type RealizationResult,
  type RealizationOptions,
} from "./RealizationEngine";

// PRNG wrapper
export { RealizationPRNG } from "./PRNG";

// Derivation tracking
export { DerivationRecordBuilder, DerivationContext } from "./DerivationRecord";

// Constraint handling
export { ConstraintSolver, type ConstraintResult, type Adjustment } from "./ConstraintSolver";

// Timeline generation
export { TimelineBuilder, type TimelineBuilderOptions } from "./TimelineBuilder";

export { SectionDetector, type SectionDetectorOptions } from "./SectionDetector";

// Note event generation
export { NoteEventGenerator, type NoteEventGeneratorOptions } from "./NoteEventGenerator";
