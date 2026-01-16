import type { EnsembleModel } from "../../src/types";

/**
 * Create a minimal ensemble model for testing
 */
export function createEnsembleModel(): EnsembleModel {
  return {
    voices: [],
    groups: [],
    balanceRules: [],
  };
}
