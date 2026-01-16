/**
 * System Execution Order Resolver
 *
 * Analyzes dependencies between Schillinger systems and determines
 * correct execution order for deterministic realization.
 *
 * Dependencies:
 * - HarmonySystem → RhythmSystem (via harmonicRhythmBinding)
 * - MelodySystem → RhythmSystem (via rhythmBinding)
 * - All systems → FormSystem (for structure)
 * - All systems → Orchestration (voice assignment)
 *
 * Algorithm: Topological sort of dependency graph
 */

import type { SchillingerSong_v1, MelodySystem, HarmonySystem } from "../types";

/**
 * System node in dependency graph
 */
interface SystemNode {
  id: string;
  type: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  systemIndex: number; // Index in the song's system arrays
  dependencies: string[]; // IDs of systems this depends on
}

/**
 * Execution plan with ordered systems
 */
export interface ExecutionPlan {
  /**
   * Ordered list of system IDs to execute
   * Systems can be executed in parallel within the same phase
   */
  phases: string[][];

  /**
   * Mapping from system ID to node details
   */
  systems: Map<string, SystemNode>;

  /**
   * Whether all dependencies are resolvable
   */
  valid: boolean;

  /**
   * Error message if invalid (circular dependency, etc.)
   */
  error?: string;
}

/**
 * Resolve execution order for all systems in a Schillinger song
 *
 * @param song - Schillinger song to analyze
 * @returns Execution plan with ordered phases
 */
export function resolveExecutionOrder(song: SchillingerSong_v1): ExecutionPlan {
  const systems: Map<string, SystemNode> = new Map();
  const nodes: SystemNode[] = [];

  // Collect all systems and their dependencies
  collectSystems(song, systems, nodes);

  // Build adjacency list for topological sort
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, new Set(node.dependencies));
    inDegree.set(node.id, node.dependencies.length);
  }

  // Kahn's algorithm for topological sort
  const phases: string[][] = [];
  const queue: string[] = [];
  const processed = new Set<string>();

  // Find all nodes with no dependencies
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  // Process nodes in phases
  while (queue.length > 0) {
    // All nodes in queue can be executed in parallel (same phase)
    phases.push([...queue]);
    for (const id of queue) {
      processed.add(id);
    }

    // Reduce in-degree for dependent nodes
    const currentQueue = [...queue]; // Create a copy of the current queue
    queue.length = 0; // Clear queue

    for (const nodeId of currentQueue) {
      const dependents = findDependents(nodeId, nodes);
      for (const dependent of dependents) {
        if (!processed.has(dependent)) {
          const newDegree = (inDegree.get(dependent) || 0) - 1;
          inDegree.set(dependent, newDegree);

          if (newDegree === 0) {
            queue.push(dependent);
          }
        }
      }
    }
  }

  // Check for circular dependency
  if (processed.size !== nodes.length) {
    const unprocessed = nodes.filter((n) => !processed.has(n.id)).map((n) => n.id);
    return {
      phases: [],
      systems,
      valid: false,
      error: `Circular dependency detected involving systems: ${unprocessed.join(", ")}`,
    };
  }

  return {
    phases,
    systems,
    valid: true,
  };
}

/**
 * Collect all systems from song and build dependency graph
 */
function collectSystems(
  song: SchillingerSong_v1,
  systems: Map<string, SystemNode>,
  nodes: SystemNode[]
): void {
  // FormSystem (no dependencies, needed by all)
  if (song.bookIV_formSystem) {
    const formNode: SystemNode = {
      id: `form:${song.bookIV_formSystem.systemId}`,
      type: "form",
      systemIndex: 0,
      dependencies: [],
    };
    systems.set(formNode.id, formNode);
    nodes.push(formNode);
  }

  // RhythmSystems (no dependencies)
  song.bookI_rhythmSystems.forEach((system, index) => {
    const rhythmNode: SystemNode = {
      id: `rhythm:${system.systemId}`,
      type: "rhythm",
      systemIndex: index,
      dependencies: [],
    };
    systems.set(rhythmNode.id, rhythmNode);
    nodes.push(rhythmNode);
  });

  // MelodySystems (depend on RhythmSystems via rhythmBinding)
  song.bookII_melodySystems.forEach((system, index) => {
    const melodyNode: SystemNode = {
      id: `melody:${system.systemId}`,
      type: "melody",
      systemIndex: index,
      dependencies: buildMelodyDependencies(system, song),
    };
    systems.set(melodyNode.id, melodyNode);
    nodes.push(melodyNode);
  });

  // HarmonySystems (depend on RhythmSystems via harmonicRhythmBinding)
  song.bookIII_harmonySystems.forEach((system, index) => {
    const harmonyNode: SystemNode = {
      id: `harmony:${system.systemId}`,
      type: "harmony",
      systemIndex: index,
      dependencies: buildHarmonyDependencies(system, song),
    };
    systems.set(harmonyNode.id, harmonyNode);
    nodes.push(harmonyNode);
  });

  // Orchestration (depends on all material-generating systems)
  // Note: Orchestration node is created without dependencies first,
  // then dependencies are added after all systems are collected
  let orchestrationNode: SystemNode | null = null;
  if (song.bookV_orchestration) {
    orchestrationNode = {
      id: `orchestration:${song.bookV_orchestration.systemId}`,
      type: "orchestration",
      systemIndex: 0,
      dependencies: [], // Will be filled in after all nodes are created
    };
    systems.set(orchestrationNode.id, orchestrationNode);
    nodes.push(orchestrationNode);
  }

  // Now build orchestration dependencies after all systems are in the map
  if (orchestrationNode) {
    orchestrationNode.dependencies = buildOrchestrationDependencies(song, systems);
  }
}

/**
 * Build dependencies for MelodySystem
 */
function buildMelodyDependencies(system: MelodySystem, song: SchillingerSong_v1): string[] {
  const dependencies: string[] = [];

  // MelodySystem depends on rhythmBinding
  if (system.rhythmBinding) {
    const rhythmSystem = song.bookI_rhythmSystems.find(
      (rs) => rs.systemId === system.rhythmBinding
    );
    if (rhythmSystem) {
      dependencies.push(`rhythm:${rhythmSystem.systemId}`);
    }
  }

  return dependencies;
}

/**
 * Build dependencies for HarmonySystem
 */
function buildHarmonyDependencies(system: HarmonySystem, song: SchillingerSong_v1): string[] {
  const dependencies: string[] = [];

  // HarmonySystem depends on harmonicRhythmBinding
  if (system.harmonicRhythmBinding) {
    const rhythmSystem = song.bookI_rhythmSystems.find(
      (rs) => rs.systemId === system.harmonicRhythmBinding
    );
    if (rhythmSystem) {
      dependencies.push(`rhythm:${rhythmSystem.systemId}`);
    }
  }

  return dependencies;
}

/**
 * Build dependencies for Orchestration
 */
function buildOrchestrationDependencies(
  _song: SchillingerSong_v1,
  systems: Map<string, SystemNode>
): string[] {
  const dependencies: string[] = [];

  // Orchestration depends on all material-generating systems
  for (const [id, node] of systems) {
    if (node.type === "rhythm" || node.type === "melody" || node.type === "harmony") {
      dependencies.push(id);
    }
  }

  return dependencies;
}

/**
 * Find all nodes that depend on a given node
 */
function findDependents(nodeId: string, nodes: SystemNode[]): string[] {
  const dependents: string[] = [];

  for (const node of nodes) {
    if (node.dependencies.includes(nodeId)) {
      dependents.push(node.id);
    }
  }

  return dependents;
}

/**
 * Get system by ID from execution plan
 *
 * @param plan - Execution plan
 * @param systemId - System ID (type:systemId format)
 * @returns System node or undefined if not found
 */
export function getSystemById(plan: ExecutionPlan, systemId: string): SystemNode | undefined {
  return plan.systems.get(systemId);
}

/**
 * Get execution phase for a system
 *
 * @param plan - Execution plan
 * @param systemId - System ID
 * @returns Phase index (0-based) or -1 if not found
 */
export function getSystemPhase(plan: ExecutionPlan, systemId: string): number {
  for (let i = 0; i < plan.phases.length; i++) {
    if (plan.phases[i].includes(systemId)) {
      return i;
    }
  }
  return -1;
}

/**
 * Validate execution plan
 *
 * @param plan - Execution plan to validate
 * @returns True if plan is valid (no circular dependencies)
 */
export function validateExecutionPlan(plan: ExecutionPlan): boolean {
  return plan.valid;
}
