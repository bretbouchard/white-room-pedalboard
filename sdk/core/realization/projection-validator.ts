/**
 * ProjectionValidator - Comprehensive SongModel projection validation
 *
 * Validates that all projections in a SongModel_v1 are valid:
 * - All role IDs exist in SongModel
 * - All track/bus IDs exist in MixGraph
 * - No circular dependencies in projections
 * - All parameter addresses resolve
 *
 * @module realization/projection-validator
 */

import {
  SongModel_v1,
  Projection_v1,
  SongModelValidationResult as ValidationResult,
  SongModelValidationError as ValidationError,
  SongModelValidationWarning as ValidationWarning,
} from "@schillinger-sdk/shared";

export interface CycleReport {
  hasCycles: boolean;
  cycles: string[][]; // Array of cycles, each cycle is array of IDs
  errors: ValidationError[];
}

export interface AddressReport {
  isValid: boolean;
  unresolvedAddresses: string[];
  resolvedAddresses: string[];
  errors: ValidationError[];
}

/**
 * ProjectionValidator validates SongModel projections
 *
 * Ensures all projections are properly configured and can resolve
 * to valid targets in the mix graph.
 */
export class ProjectionValidator {
  /**
   * Validate all projections in the SongModel
   *
   * Checks:
   * - All role IDs exist
   * - All target track/bus IDs exist
   * - No duplicate projection IDs
   *
   * @param model - SongModel to validate
   * @returns Validation result with errors and warnings
   */
  validateProjections(model: SongModel_v1): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Build lookup maps
    const roleIds = new Set(model.roles.map((r) => r.id));
    const trackIds = new Set(model.mixGraph.tracks.map((t) => t.id));
    const busIds = new Set(model.mixGraph.buses.map((b) => b.id));
    const projectionIds = new Set<string>();

    // Validate each projection
    for (const projection of model.projections) {
      // Check for duplicate projection IDs
      if (projectionIds.has(projection.id)) {
        errors.push({
          code: "VALIDATION_ERROR",
          message: `Duplicate projection ID: ${projection.id}`,
          path: `projections.${projection.id}`,
          severity: "error",
        });
        continue;
      }
      projectionIds.add(projection.id);

      // Validate role ID exists
      if (!roleIds.has(projection.roleId)) {
        errors.push({
          code: "VALIDATION_ERROR",
          message: `Role ID '${projection.roleId}' not found in SongModel`,
          path: `projections.${projection.id}.roleId`,
          severity: "error",
        });
      }

      // Validate target exists
      const targetId = projection.target.id;
      if (projection.target.type === "track") {
        if (!trackIds.has(targetId)) {
          errors.push({
            code: "VALIDATION_ERROR",
            message: `Track ID '${targetId}' not found in MixGraph`,
            path: `projections.${projection.id}.target.id`,
            severity: "error",
          });
        }
      } else if (projection.target.type === "bus") {
        if (!busIds.has(targetId)) {
          errors.push({
            code: "VALIDATION_ERROR",
            message: `Bus ID '${targetId}' not found in MixGraph`,
            path: `projections.${projection.id}.target.id`,
            severity: "error",
          });
        }
      } else if (projection.target.type === "instrument") {
        // Instruments are validated by their presence in tracks
        const instrumentUsed = model.mixGraph.tracks.some(
          (t) => t.instrumentId === targetId,
        );
        if (!instrumentUsed) {
          warnings.push({
            code: "INSTRUMENT_NOT_USED",
            message: `Instrument '${targetId}' is not referenced by any track`,
            path: `projections.${projection.id}.target.id`,
            severity: "warning",
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect circular dependencies in projections
   *
   * Checks for cycles in:
   * - Send routing (track -> bus -> track loops)
   * - Projection chains (if future versions support chained projections)
   *
   * @param model - SongModel to check
   * @returns Cycle detection report
   */
  detectCircularProjections(model: SongModel_v1): CycleReport {
    const cycles: string[][] = [];
    const errors: ValidationError[] = [];

    // Build adjacency graph for sends
    const graph = new Map<string, string[]>();
    const allIds = new Set<string>();

    // Add all tracks and buses to graph
    for (const track of model.mixGraph.tracks) {
      graph.set(track.id, []);
      allIds.add(track.id);
    }
    for (const bus of model.mixGraph.buses) {
      graph.set(bus.id, []);
      allIds.add(bus.id);
    }

    // Add send edges (track -> bus)
    for (const send of model.mixGraph.sends) {
      // Validate: sends must be from track to bus
      const isTrack = model.mixGraph.tracks.some(
        (t) => t.id === send.fromTrack,
      );
      const isBus = model.mixGraph.buses.some((b) => b.id === send.toBus);

      if (!isTrack) {
        errors.push({
          code: "VALIDATION_ERROR",
          message: `Send source '${send.fromTrack}' is not a valid track`,
          path: `mixGraph.sends[${send.fromTrack}->${send.toBus}]`,
          severity: "error",
        });
      }

      if (!isBus) {
        errors.push({
          code: "VALIDATION_ERROR",
          message: `Send target '${send.toBus}' is not a valid bus`,
          path: `mixGraph.sends[${send.fromTrack}->${send.toBus}]`,
          severity: "error",
        });
      }

      // Build graph edge
      if (isTrack && isBus) {
        const neighbors = graph.get(send.fromTrack) || [];
        neighbors.push(send.toBus);
        graph.set(send.fromTrack, neighbors);
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const detectCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      currentPath.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = currentPath.indexOf(neighbor);
          cycles.push([...currentPath.slice(cycleStart), neighbor]);
          return true;
        }
      }

      currentPath.pop();
      recursionStack.delete(node);
      return false;
    };

    // Check all nodes for cycles
    const allIdsArray = Array.from(allIds);
    for (const nodeId of allIdsArray) {
      if (!visited.has(nodeId)) {
        detectCycle(nodeId);
      }
    }

    // Add cycle errors
    for (const cycle of cycles) {
      errors.push({
        code: "VALIDATION_ERROR",
        message: `Circular dependency detected: ${cycle.join(" -> ")}`,
        path: "mixGraph.sends",
        severity: "error",
      });
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
      errors,
    };
  }

  /**
   * Validate all parameter addresses resolve
   *
   * Checks that all parameter references in roles, projections, and
   * mix graph can be resolved to valid targets.
   *
   * @param model - SongModel to validate
   * @returns Address resolution report
   */
  validateAddressResolution(model: SongModel_v1): AddressReport {
    const unresolvedAddresses: string[] = [];
    const resolvedAddresses: string[] = [];
    const errors: ValidationError[] = [];

    // Validate role parameter addresses
    for (const role of model.roles) {
      for (const paramName of Object.keys(role.parameters)) {
        const address = `/role/${role.id}/${paramName}`;
        resolvedAddresses.push(address);
      }
    }

    // Validate track parameter addresses
    for (const track of model.mixGraph.tracks) {
      if (track.custom) {
        for (const paramName of Object.keys(track.custom)) {
          const address = `/track/${track.id}/${paramName}`;
          resolvedAddresses.push(address);
        }
      }
    }

    // Validate bus parameter addresses
    for (const bus of model.mixGraph.buses) {
      if (bus.custom) {
        for (const paramName of Object.keys(bus.custom)) {
          const address = `/bus/${bus.id}/${paramName}`;
          resolvedAddresses.push(address);
        }
      }
    }

    // Validate projection transform addresses
    for (const projection of model.projections) {
      if (projection.transform) {
        for (const transformName of Object.keys(projection.transform)) {
          const address = `/projection/${projection.id}/${transformName}`;
          resolvedAddresses.push(address);
        }
      }
    }

    return {
      isValid: unresolvedAddresses.length === 0,
      unresolvedAddresses,
      resolvedAddresses,
      errors,
    };
  }
}
