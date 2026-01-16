/**
 * ProjectionValidator - Validates SongModel projections and mixgraph topology
 *
 * Provides validation for role projections, track/bus assignments, and
 * detection of circular dependencies in the mix graph.
 *
 * @module realization/ProjectionValidator
 */

import type {
  SongModel_v1,
  Projection_v1,
} from "@schillinger-sdk/shared";

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error code for categorization */
  code:
    | "ROLE_NOT_FOUND"
    | "TARGET_NOT_FOUND"
    | "DUPLICATE_PROJECTION_ID"
    | "INVALID_SEND"
    | "CIRCULAR_DEPENDENCY";
  /** Human-readable error message */
  message: string;
  /** Path to the invalid element */
  path: string;
  /** Severity level */
  severity: "error" | "warning";
}

/**
 * Result of projection validation
 */
export interface ValidationResult {
  /** Overall validation status */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
}

/**
 * Circular dependency detection result
 */
export interface CircularDependencyResult {
  /** Whether circular dependencies were detected */
  hasCycles: boolean;
  /** List of detected cycles (each cycle is a list of node IDs) */
  cycles: string[][];
}

/**
 * Address resolution validation result
 */
export interface AddressResolutionResult {
  /** Overall validation status */
  isValid: boolean;
  /** List of unresolved parameter addresses */
  unresolvedAddresses: string[];
}

// =============================================================================
// PROJECTION VALIDATOR CLASS
// =============================================================================

/**
 * ProjectionValidator - Comprehensive validation for SongModel projections
 *
 * Validates:
 * - Role projections to tracks/buses
 * - Target existence (tracks, buses)
 * - Duplicate projection IDs
 * - Circular dependencies in send graph
 * - Parameter address resolution
 */
export class ProjectionValidator {
  /**
   * Validate all projections in a SongModel
   * @param model - SongModel to validate
   * @returns ValidationResult with errors array
   */
  validateProjections(model: SongModel_v1): ValidationResult {
    const errors: ValidationError[] = [];

    // Track all projection IDs for duplicate detection
    const projectionIds = new Set<string>();

    // Validate each projection
    for (const projection of model.projections) {
      // Check for duplicate IDs
      if (projectionIds.has(projection.id)) {
        errors.push({
          code: "DUPLICATE_PROJECTION_ID",
          message: `Duplicate projection ID: ${projection.id}`,
          path: `projections.${projection.id}`,
          severity: "error",
        });
      }
      projectionIds.add(projection.id);

      // Validate role exists
      const role = model.roles.find((r: { id: string }) => r.id === projection.roleId);
      if (!role) {
        errors.push({
          code: "ROLE_NOT_FOUND",
          message: `Role not found: ${projection.roleId}`,
          path: `projections[${projection.id}].roleId (${projection.roleId})`,
          severity: "error",
        });
        continue; // Skip further validation if role doesn't exist
      }

      // Validate target exists
      const targetError = this.validateTargetExists(
        projection,
        model,
      );
      if (targetError) {
        errors.push(targetError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect circular dependencies in send graph
   * @param model - SongModel to analyze
   * @returns CircularDependencyResult with detected cycles
   */
  detectCircularProjections(model: SongModel_v1): CircularDependencyResult {
    // Build adjacency graph for sends
    // Nodes are track and bus IDs
    // Edges represent sends: fromTrackId -> toBusId
    const graph = new Map<string, string[]>();

    // Initialize graph with all tracks and buses
    for (const track of model.mixGraph.tracks) {
      graph.set(track.id, []);
    }
    for (const bus of model.mixGraph.buses) {
      graph.set(bus.id, []);
    }

    // Add send edges (including invalid ones for cycle detection)
    for (const send of model.mixGraph.sends) {
      // Initialize source node if not exists
      if (!graph.has(send.fromTrack)) {
        graph.set(send.fromTrack, []);
      }

      // Initialize target node if not exists
      if (!graph.has(send.toBus)) {
        graph.set(send.toBus, []);
      }

      // Add edge: fromTrack -> toBus
      // This includes potentially invalid configurations
      const neighbors = graph.get(send.fromTrack) || [];
      neighbors.push(send.toBus);
      graph.set(send.fromTrack, neighbors);
    }

    // Detect cycles using DFS
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = [...path.slice(cycleStart), neighbor];
          cycles.push(cycle);
          return true;
        }
      }

      path.pop();
      recStack.delete(node);
      return false;
    };

    // Run DFS from each node
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
    };
  }

  /**
   * Validate that all parameter addresses in the model resolve correctly
   * @param model - SongModel to validate
   * @returns AddressResolutionResult with unresolved addresses
   */
  validateAddressResolution(model: SongModel_v1): AddressResolutionResult {
    const unresolvedAddresses: string[] = [];

    // Collect all parameter addresses from roles
    for (const role of model.roles) {
      for (const paramName of Object.keys(role.parameters)) {
        // Construct parameter address
        const address = `/role/${role.id}/${paramName}`;

        // Validate address format
        if (!this.validateParameterAddress(address)) {
          unresolvedAddresses.push(address);
        }
      }
    }

    // Collect all parameter addresses from tracks
    for (const track of model.mixGraph.tracks) {
      if ("custom" in track && track.custom) {
        for (const paramName of Object.keys(track.custom)) {
          const address = `/track/${track.id}/${paramName}`;

          if (!this.validateParameterAddress(address)) {
            unresolvedAddresses.push(address);
          }
        }
      }
    }

    // Collect all parameter addresses from buses
    for (const bus of model.mixGraph.buses) {
      if ("custom" in bus && bus.custom) {
        for (const paramName of Object.keys(bus.custom)) {
          const address = `/bus/${bus.id}/${paramName}`;

          if (!this.validateParameterAddress(address)) {
            unresolvedAddresses.push(address);
          }
        }
      }
    }

    return {
      isValid: unresolvedAddresses.length === 0,
      unresolvedAddresses,
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPER METHODS
  // -------------------------------------------------------------------------

  /**
   * Validate that a projection's target exists in the model
   * @param projection - Projection to validate
   * @param model - SongModel containing targets
   * @returns ValidationError if target not found, undefined otherwise
   */
  private validateTargetExists(
    projection: Projection_v1,
    model: SongModel_v1,
  ): ValidationError | undefined {
    const { target } = projection;

    switch (target.type) {
      case "track":
        const track = model.mixGraph.tracks.find((t: { id: string }) => t.id === target.id);
        if (!track) {
          return {
            code: "TARGET_NOT_FOUND",
            message: `Track not found: ${target.id}`,
            path: `projections[${projection.id}].target (${target.id})`,
            severity: "error",
          };
        }
        break;

      case "bus":
        const bus = model.mixGraph.buses.find((b: { id: string }) => b.id === target.id);
        if (!bus) {
          return {
            code: "TARGET_NOT_FOUND",
            message: `Bus not found: ${target.id}`,
            path: `projections[${projection.id}].target (${target.id})`,
            severity: "error",
          };
        }
        break;
    }

    return undefined;
  }

  /**
   * Validate parameter address format
   * @param address - Parameter address string
   * @returns true if valid, false otherwise
   */
  private validateParameterAddress(address: string): boolean {
    // Basic validation: must start with / and have at least 3 parts
    if (!address.startsWith("/")) {
      return false;
    }

    const parts = address.split("/").filter((p) => p.length > 0);
    if (parts.length < 2) {
      return false;
    }

    // Validate scope
    const validScopes = ["role", "track", "bus", "instrument", "global", "section", "transport"];
    if (!validScopes.includes(parts[0])) {
      return false;
    }

    return true;
  }
}
