/**
 * Generator modules for the Schillinger SDK
 *
 * Generators provide stateful, deterministic alternatives to the functional APIs,
 * allowing for parameter persistence, configuration management, and enhanced
 * metadata tracking.
 */

// Base Generator class
export { BaseGenerator, isGenerator } from "./BaseGenerator";

// Individual Generator implementations
export { RhythmGenerator } from "./RhythmGenerator";
export type {
  RhythmGeneratorConfig,
  RhythmGeneratorParameters,
} from "@schillinger-sdk/shared";

export {
  ComplexRhythmParams,
  RhythmVariationParams as VariationParams,
} from "./RhythmGenerator";

export { HarmonyGenerator } from "./HarmonyGenerator";
export type {
  HarmonyGeneratorConfig,
  HarmonyGeneratorParameters,
} from "@schillinger-sdk/shared";

export {
  ProgressionParams,
  ResolutionParams,
  HarmonyVariationParams,
} from "./HarmonyGenerator";

export { MelodyGenerator } from "./MelodyGenerator";
export type {
  MelodyGeneratorConfig,
  MelodyGeneratorParameters,
} from "@schillinger-sdk/shared";

export {
  GeneratorMelodyGenerationParams as MelodyGenerationParams,
  GeneratorMelodyVariationParams as MelodyVariationParams,
  MelodyAnalysisParams,
} from "./MelodyGenerator";

export { CompositionGenerator } from "./CompositionGenerator";
export type {
  CompositionGeneratorConfig,
  CompositionGeneratorParameters,
} from "@schillinger-sdk/shared";

export {
  CompositionCreationParams,
  ArrangementParams,
  CompositionAnalysisParams,
  UserInputParams,
} from "./CompositionGenerator";

// Re-export all types for convenience
export type {
  GeneratorResult,
  RhythmPattern,
  ChordProgression,
  MelodyLine,
  Composition,
  Section,
  RhythmAnalysis,
  HarmonicAnalysis,
  CompositionAnalysis,
  GeneratorInference,
  VariationType,
  SectionType,
} from "@schillinger-sdk/shared";
