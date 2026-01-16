export * from "./client";
export * from "./rhythm";
export * from "./harmony";
// Melody exports (renamed to avoid conflicts)
export type { CoreMelodyGenerationParams as MelodyGenerationParamsCore } from "./melody";
export type { CoreMelodyVariationParams as MelodyVariationParamsCore } from "./melody";
export * from "./melody";
export * from "./counterpoint";
export * from "./expansion";
export * from "./contour";
// Harmonic Expansion exports (renamed to avoid conflicts)
export type { HarmonicHarmonicVoiceLeadingConstraints as HarmonicVoiceLeadingConstraints } from "./harmonic-expansion";
export type { HarmonicExpansionParameters as ExpansionParametersHarmonic } from "./harmonic-expansion";
export type { HarmonicModulation as ModulationHarmonic } from "./harmonic-expansion";
export type { HarmonicCadence as CadenceHarmonic } from "./harmonic-expansion";
export * from "./harmonic-expansion";
// Orchestration exports (renamed to avoid conflicts)
export type { OrchestrationTextureLayer as TextureLayerOrchestration } from "./orchestration";
export * from "./orchestration";
export * from "./form";
// Composition Pipeline exports (renamed to avoid conflicts)
export type { PipelineCompositionAnalysis as CompositionAnalysisPipeline } from "./composition-pipeline";
export type { PipelineCompositionAPI as CompositionAPIPipeline } from "./composition-pipeline";
export type { PipelineTempoChange as TempoChangePipeline } from "./composition-pipeline";
export type { OrchestrationTextureLayer as TextureLayerPipeline } from "./orchestration";
export type { Cadence as CadencePipeline } from "./composition-pipeline";
export type { Modulation as ModulationPipeline } from "./composition-pipeline";
// Exclude CompositionAPI from wildcard export to avoid duplicate export conflict with composition.ts
export {
  CompositionPipeline,
  PipelineCompositionAPI,
  createQuickComposition,
  analyzeProject,
  createTheme,
  type CompositionRequest,
  type CompositionProject,
  type CompositionSection,
  type PipelineOptions,
  type PipelineResult,
  type ThemeMaterial,
  type MotifMaterial,
} from "./composition-pipeline";
// Composition exports (renamed to avoid conflicts)
export type { CompositionVariationParams as VariationParamsComposition } from "./composition";
export * from "./composition";
export * from "./cache";
export * from "./offline";
export * from "./error-handling";
export * from "./audio-export";
// Visual Editor exports (renamed to avoid conflicts)
export type { TempoChange as TempoChangeVisual } from "./visual-editor";
export type { VisualSection as SectionVisual } from "./visual-editor";
export * from "./visual-editor";
// Generators exports (renamed to avoid conflicts)
export type { RhythmVariationParams as VariationParamsRhythm } from "./generators/RhythmGenerator";
export type { GeneratorMelodyGenerationParams as MelodyGenerationParamsGenerator } from "./generators/MelodyGenerator";
export type { GeneratorMelodyVariationParams as MelodyVariationParamsGenerator } from "./generators/MelodyGenerator";
// Selective exports to avoid conflicts
export {
  BaseGenerator,
  RhythmGenerator,
  HarmonyGenerator,
  MelodyGenerator,
  CompositionGenerator,
} from "./generators";
export type {
  RhythmGeneratorConfig,
  HarmonyGeneratorConfig,
  MelodyGeneratorConfig,
  CompositionGeneratorConfig,
} from "@schillinger-sdk/shared";
// Realtime exports: prefer modular path; selectively re-export legacy types to avoid ambiguity
export * from "./realtime/index";
// ConflictResolution is only exported from collaboration
export type { ConflictResolution as CollaborationConflictResolution } from "./collaboration";
export * from "./collaboration";
export * from "./documentation";
export { SchillingerSDK } from "./client";
// Realization exports - Event Emission Engine for SongModel_v1
// Realization exports (renamed to avoid conflicts)
export type { RealtimeTempoEvent as TempoEventRealization } from "./realization/types";
export type { RealtimeTimeSignatureEvent as TimeSignatureEventRealization } from "./realization/types";
export type { RealtimeLoopPolicy as LoopPolicyRealization } from "./realization/types";
export type { RealtimeTransportConfig as TransportConfigRealization } from "./realization/types";
export * from "./realization";

// Timeline Model exports - LLVM Architecture (renamed to avoid conflicts)
export type { TimelineTransportConfig as TransportConfigTimeline } from "./types/timeline/timeline-model";
export type { TimelineTempoEvent as TempoEventTimeline } from "./types/timeline/timeline-model";
export type { TimelineTimeSignatureEvent as TimeSignatureEventTimeline } from "./types/timeline/timeline-model";
export type { TimelineLoopPolicy as LoopPolicyTimeline } from "./types/timeline/timeline-model";
export * from "./types/timeline";
export * from "./evaluation";
