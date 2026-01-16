import type { OrchestrationSystem } from "../../src/types";
import { generateUUID } from "../../src/utils/uuid";

/**
 * Create a test orchestration system with minimal configuration
 */
export function createOrchestrationSystem(): OrchestrationSystem {
  return {
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
  };
}
