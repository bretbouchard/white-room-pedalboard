/**
 * Structure Module - Musical Form and Tension
 *
 * This module provides the foundational types and services for managing
 * structural tension across all musical domains in the Schillinger System.
 *
 * Key concepts:
 * - StructuralTension: Unified tension signal across rhythm, harmony, and form
 * - TensionAccumulator: Central tension state management
 * - PhaseStateManager: Persistent phase interference as motion
 * - All tension changes are explainable and reversible
 * - Tension drives musical decisions (fills, gates, transitions, resolution)
 *
 * @module structure
 */

export {
  StructuralTension,
  zeroTension,
  totalTension,
  clampTension,
  copyTension,
  tensionEquals,
  interpolateTension,
} from "./StructuralTension";

export {
  TensionAccumulator,
  globalTension,
  TensionChange,
  TensionSnapshot,
} from "./TensionAccumulator";

export {
  PhaseStateManager,
  globalPhaseState,
  RolePhaseState,
  PhaseEvent,
} from "./PhaseState";

export {
  HarmonicAnalyzer,
  ChordQuality,
  HarmonicTensionAnalysis,
} from "./HarmonicAnalyzer";

export {
  OrthogonalMotionManager,
  ParameterPair,
  OrthogonalMotionSnapshot,
  ParameterType,
} from "./OrthogonalMotion";

export { EnergyManager, EnergyState, EnergySnapshot } from "./EnergyCurves";

export {
  SectionTransitionManager,
  SectionConfig,
  SectionType,
  TransitionTrigger,
} from "./SectionTransition";

export {
  LongCycleMemory,
  PeakContext,
  PeakInfo,
  ResolutionStrategy,
  StrategySuggestion,
  MemoryConfig,
} from "./LongCycleMemory";

export {
  RegisterMotionManager,
  globalRegisterMotion,
  Pitch,
  RoleId,
  MusicalFunction,
  RoleRegisterConstraints,
  RegisterState,
  RegisterChangeEvent,
  RegisterCurveRecommendation,
  RegisterMotionConfig,
} from "./RegisterMotion";

export {
  RhythmicResultantsGenerator,
  globalRhythmicResultants,
  ResultantContext,
  ResultantApplication,
  SelectionStrategy,
  CustomTarget,
  ResultantsConfig,
} from "./RhythmicResultants";

export {
  DomainOrthogonalMotionManager,
  globalDomainOrthogonalMotion,
  MusicalDomain,
  DomainLevel,
  DomainPair,
  DomainOrthogonalSnapshot,
  DomainRecommendation,
  DomainOrthogonalConfig,
} from "./DomainOrthogonalMotion";

// Re-export types from rhythmic-resultants math
export type {
  RhythmicResultant,
  ResultantOptions,
} from "../../packages/shared/src/math/rhythmic-resultants";
