/**
 * Offline manager for the core SDK client
 */

import { MathUtils } from "@schillinger-sdk/shared";
import { generateRhythmicResultant } from "@schillinger-sdk/shared";

export class OfflineManager {
  // private offlineMode: boolean = false;
  private offlineCapabilities = new Set([
    "generateRhythmicResultant",
    "applyRhythmVariation",
    "analyzeRhythmPattern",
    "calculateComplexity",
    "calculateSyncopation",
  ]);

  /**
   * Set offline mode
   */
  setOfflineMode(): void {
    // this.offlineMode = offline;
  }

  /**
   * Check if operation is available offline
   */
  isOfflineCapable(endpoint: string): boolean {
    return this.offlineCapabilities.has(endpoint);
  }

  /**
   * Check if operation can be performed offline
   */
  canPerformOffline(operation: string): boolean {
    return this.offlineCapabilities.has(operation);
  }

  /**
   * Generate rhythmic resultant offline
   */
  generateRhythmicResultant(a: number, b: number): number[] {
    const resultant = generateRhythmicResultant(a, b);
    return resultant.pattern;
  }

  /**
   * Apply rhythm variation offline (simplified)
   */
  applyRhythmVariation(
    durations: number[],
    type: string,
    parameters?: any,
  ): number[] {
    switch (type) {
      case "retrograde":
        return [...durations].reverse();
      case "rotation": {
        const steps = parameters?.steps || 1;
        const normalizedSteps =
          ((steps % durations.length) + durations.length) % durations.length;
        return [
          ...durations.slice(normalizedSteps),
          ...durations.slice(0, normalizedSteps),
        ];
      }
      case "augmentation": {
        const factor = parameters?.factor || 2;
        return durations.map((d) => Math.round(d * factor));
      }
      case "diminution": {
        const divisor = parameters?.factor || 2;
        return durations.map((d) => Math.max(1, Math.round(d / divisor)));
      }
      default:
        return durations;
    }
  }

  /**
   * Analyze rhythm pattern offline
   */
  analyzeRhythmPattern(
    durations: number[],
    timeSignature: [number, number] = [4, 4],
  ) {
    const complexity = MathUtils.calculateComplexity(durations);
    const syncopation = MathUtils.calculateSyncopation(
      durations,
      timeSignature,
    );
    const density = durations.filter((d) => d > 0).length / durations.length;

    return {
      complexity,
      syncopation,
      density,
      patterns: [],
      suggestions: [
        complexity < 0.3 ? "Pattern is simple" : "Pattern has good complexity",
        syncopation > 0.5
          ? "High syncopation creates interest"
          : "Low syncopation, follows strong beats",
      ],
    };
  }
}
