import type { SchillingerSong_v1 } from "../../src/types";
import { createEnsembleModel } from "./create-ensemble-model";
import { generateUUID } from "../../src/utils/uuid";

/**
 * Create a minimal Schillinger song for testing with correct schema structure
 */
export function createTestSong(overrides?: Partial<SchillingerSong_v1>): SchillingerSong_v1 {
  const defaults: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),
    globals: {
      tempo: 120,
      timeSignature: [4, 4],
      key: 0,
    },
    bookI_rhythmSystems: [],
    bookII_melodySystems: [],
    bookIII_harmonySystems: [],
    bookIV_formSystem: null,
    bookV_orchestration: {
      systemId: generateUUID(),
      systemType: "orchestration",
      roles: [],
      registerSystem: {
        systemId: generateUUID(),
        roleRegisters: [],
      },
      spacingSystem: {
        systemId: generateUUID(),
        minSpacing: [],
        maxSpacing: [],
        crossingRules: [],
      },
      densitySystem: {
        systemId: generateUUID(),
        roleDensity: [],
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: [],
    },
    ensembleModel: createEnsembleModel(),
    bindings: {
      roleRhythmBindings: [],
      roleMelodyBindings: [],
      roleHarmonyBindings: [],
      roleEnsembleBindings: [],
    },
    constraints: [],
    provenance: {
      createdAt: new Date().toISOString(),
      createdBy: "test",
      modifiedAt: new Date().toISOString(),
      derivationChain: [],
    },
  };

  return { ...defaults, ...overrides };
}
