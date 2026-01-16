import type { MusicalPattern, HarmonicAnalysis } from "../../packages/core/src";
export declare class SchillingerIntegrationService {
  private sdk;
  constructor();
  /**
   * Analyze harmonic structure using Schillinger's methods
   * @param pattern Input musical pattern to analyze
   * @returns Harmonic analysis results
   */
  analyzeHarmony(pattern: MusicalPattern): Promise<HarmonicAnalysis>;
  /**
   * Generate musical pattern using Schillinger's systems
   * @param parameters Generation parameters
   * @returns Generated musical pattern
   */
  generatePattern(parameters: PatternParameters): Promise<MusicalPattern>;
}
export interface PatternParameters {
  basePattern: MusicalPattern;
  variationRules: VariationRule[];
  complexityLevel: number;
}
interface VariationRule {
  operation: "inversion" | "retrograde" | "diminution" | "augmentation";
  intensity: number;
}
export {};
//# sourceMappingURL=schillinger-service.d.ts.map
