/**
 * SongDiff - Model mutation system for live editing
 *
 * SongDiff represents atomic changes to a SongModel that can be applied
 * at safe boundaries without breaking determinism or requiring complete
 * model reconstruction.
 *
 * @module types/song-diff
 */

import type {
  SongModel_v1,
  Role_v1,
  Section_v1,
  Projection_v1,
  MixGraph_v1,
} from "./song-model";

// =============================================================================
// SONG DIFF
// =============================================================================

/**
 * SongDiff represents a set of mutations to apply to a SongModel
 *
 * Diffs are applied immutably - they return a new SongModel rather than
 * modifying the original. This ensures determinism and enables undo/redo.
 */
export interface SongDiff {
  /** Version identifier for serialization/deserialization */
  version: "1.0";

  /** Unique diff identifier */
  diffId: string;

  /** Creation timestamp */
  timestamp: number;

  /** SongModel ID this diff applies to */
  appliesTo: string;

  /** Operations to apply in sequence */
  operations: DiffOperation[];

  /** Optional metadata for tracking and context */
  metadata?: {
    author?: string;
    description?: string;
    context?: Record<string, unknown>;
  };
}

// =============================================================================
// DIFF OPERATIONS
// =============================================================================

/**
 * DiffOperation represents a single atomic change to the SongModel
 *
 * Operations are applied in sequence. If one operation fails,
 * the entire diff is rejected.
 */
export type DiffOperation =
  | AddRoleOperation
  | RemoveRoleOperation
  | UpdateRoleOperation
  | AddSectionOperation
  | RemoveSectionOperation
  | UpdateSectionOperation
  | AddProjectionOperation
  | RemoveProjectionOperation
  | UpdateMixGraphOperation
  | UpdateParameterOperation;

// -----------------------------------------------------------------------------
// Role Operations
// -----------------------------------------------------------------------------

/**
 * Add a new role to the model
 */
export interface AddRoleOperation {
  type: "addRole";
  role: Role_v1;
  index?: number; // Insert at specific index (default: append)
}

/**
 * Remove a role from the model
 */
export interface RemoveRoleOperation {
  type: "removeRole";
  roleId: string;
}

/**
 * Update properties of an existing role
 */
export interface UpdateRoleOperation {
  type: "updateRole";
  roleId: string;
  updates: Partial<Role_v1>;
}

// -----------------------------------------------------------------------------
// Section Operations
// -----------------------------------------------------------------------------

/**
 * Add a new section to the model
 */
export interface AddSectionOperation {
  type: "addSection";
  section: Section_v1;
  index?: number; // Insert at specific index (default: append)
}

/**
 * Remove a section from the model
 */
export interface RemoveSectionOperation {
  type: "removeSection";
  sectionId: string;
}

/**
 * Update properties of an existing section
 */
export interface UpdateSectionOperation {
  type: "updateSection";
  sectionId: string;
  updates: Partial<Section_v1>;
}

// -----------------------------------------------------------------------------
// Projection Operations
// -----------------------------------------------------------------------------

/**
 * Add a new projection to the model
 */
export interface AddProjectionOperation {
  type: "addProjection";
  projection: Projection_v1;
}

/**
 * Remove a projection from the model
 */
export interface RemoveProjectionOperation {
  type: "removeProjection";
  projectionId: string;
}

// -----------------------------------------------------------------------------
// Mix Graph Operations
// -----------------------------------------------------------------------------

/**
 * Update mix graph configuration
 */
export interface UpdateMixGraphOperation {
  type: "updateMixGraph";
  updates: Partial<MixGraph_v1>;
}

// -----------------------------------------------------------------------------
// Parameter Operations
// -----------------------------------------------------------------------------

/**
 * Update a parameter value
 *
 * Parameter updates are stored as metadata hints. The actual parameter
 * value resolution happens during event emission.
 */
export interface UpdateParameterOperation {
  type: "updateParameter";
  target: string; // Parameter address path (e.g., "/role/bass/volume")
  value: unknown;
  interpolation?: "linear" | "exponential" | "step";
  rampDuration?: number; // in samples or musical time
}

// =============================================================================
// DIFF APPLIER
// =============================================================================

/**
 * SongDiffApplier applies diffs to SongModels
 *
 * All operations are immutable - they return new models rather than
 * modifying the original.
 */
export class SongDiffApplier {
  /**
   * Apply a diff to a SongModel
   * @param model - Original SongModel
   * @param diff - Diff to apply
   * @returns New SongModel with diff applied (immutable)
   */
  static apply(model: SongModel_v1, diff: SongDiff): SongModel_v1 {
    // Validate diff applies to correct model
    if (diff.appliesTo !== model.id) {
      throw new Error(
        `Diff applies to ${diff.appliesTo} but model is ${model.id}`,
      );
    }

    let result: SongModel_v1 = { ...model };

    // Apply each operation in sequence
    for (const operation of diff.operations) {
      result = this.applyOperation(result, operation);
    }

    return result;
  }

  /**
   * Apply a single operation to a SongModel
   */
  private static applyOperation(
    model: SongModel_v1,
    operation: DiffOperation,
  ): SongModel_v1 {
    switch (operation.type) {
      case "addRole":
        return this.addRole(model, operation);
      case "removeRole":
        return this.removeRole(model, operation);
      case "updateRole":
        return this.updateRole(model, operation);
      case "addSection":
        return this.addSection(model, operation);
      case "removeSection":
        return this.removeSection(model, operation);
      case "updateSection":
        return this.updateSection(model, operation);
      case "addProjection":
        return this.addProjection(model, operation);
      case "removeProjection":
        return this.removeProjection(model, operation);
      case "updateMixGraph":
        return this.updateMixGraph(model, operation);
      case "updateParameter":
        return this.updateParameter(model, operation);
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Role Operation Implementations
  // ---------------------------------------------------------------------------

  private static addRole(
    model: SongModel_v1,
    op: AddRoleOperation,
  ): SongModel_v1 {
    const roles = [...model.roles];
    if (op.index !== undefined) {
      roles.splice(op.index, 0, op.role);
    } else {
      roles.push(op.role);
    }
    return { ...model, roles };
  }

  private static removeRole(
    model: SongModel_v1,
    op: RemoveRoleOperation,
  ): SongModel_v1 {
    const roles = model.roles.filter((r) => r.id !== op.roleId);
    if (roles.length === model.roles.length) {
      throw new Error(`Role not found: ${op.roleId}`);
    }
    return { ...model, roles };
  }

  private static updateRole(
    model: SongModel_v1,
    op: UpdateRoleOperation,
  ): SongModel_v1 {
    // Validate role exists
    if (!model.roles.find((r) => r.id === op.roleId)) {
      throw new Error(`Role not found: ${op.roleId}`);
    }

    const roles = model.roles.map((r) =>
      r.id === op.roleId ? { ...r, ...op.updates } : r,
    );
    return { ...model, roles };
  }

  // ---------------------------------------------------------------------------
  // Section Operation Implementations
  // ---------------------------------------------------------------------------

  private static addSection(
    model: SongModel_v1,
    op: AddSectionOperation,
  ): SongModel_v1 {
    const sections = [...model.sections];
    if (op.index !== undefined) {
      sections.splice(op.index, 0, op.section);
    } else {
      sections.push(op.section);
    }
    return { ...model, sections };
  }

  private static removeSection(
    model: SongModel_v1,
    op: RemoveSectionOperation,
  ): SongModel_v1 {
    const sections = model.sections.filter((s) => s.id !== op.sectionId);
    if (sections.length === model.sections.length) {
      throw new Error(`Section not found: ${op.sectionId}`);
    }
    return { ...model, sections };
  }

  private static updateSection(
    model: SongModel_v1,
    op: UpdateSectionOperation,
  ): SongModel_v1 {
    const sections = model.sections.map((s) =>
      s.id === op.sectionId ? { ...s, ...op.updates } : s,
    );
    return { ...model, sections };
  }

  // ---------------------------------------------------------------------------
  // Projection Operation Implementations
  // ---------------------------------------------------------------------------

  private static addProjection(
    model: SongModel_v1,
    op: AddProjectionOperation,
  ): SongModel_v1 {
    const projections = [...model.projections, op.projection];
    return { ...model, projections };
  }

  private static removeProjection(
    model: SongModel_v1,
    op: RemoveProjectionOperation,
  ): SongModel_v1 {
    const projections = model.projections.filter(
      (p) => p.id !== op.projectionId,
    );
    if (projections.length === model.projections.length) {
      throw new Error(`Projection not found: ${op.projectionId}`);
    }
    return { ...model, projections };
  }

  // ---------------------------------------------------------------------------
  // Mix Graph Operation Implementations
  // ---------------------------------------------------------------------------

  private static updateMixGraph(
    model: SongModel_v1,
    op: UpdateMixGraphOperation,
  ): SongModel_v1 {
    const mixGraph = { ...model.mixGraph, ...op.updates };
    return { ...model, mixGraph };
  }

  // ---------------------------------------------------------------------------
  // Parameter Operation Implementations
  // ---------------------------------------------------------------------------

  private static updateParameter(
    model: SongModel_v1,
    op: UpdateParameterOperation,
  ): SongModel_v1 {
    // Parameter updates are stored as metadata hints in metadata.custom
    // The actual parameter value resolution happens during event emission
    const custom = {
      ...model.metadata.custom,
      [op.target]: {
        value: op.value,
        interpolation: op.interpolation,
        rampDuration: op.rampDuration,
        timestamp: Date.now(),
      },
    };

    return {
      ...model,
      metadata: {
        ...model.metadata,
        custom,
      },
    };
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  /**
   * Validate a diff before applying
   * @param model - SongModel to validate against
   * @param diff - Diff to validate
   * @returns Validation result
   */
  static validate(model: SongModel_v1, diff: SongDiff): DiffValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check diff applies to correct model
    if (diff.appliesTo !== model.id) {
      errors.push(`Diff applies to ${diff.appliesTo} but model is ${model.id}`);
    }

    // Validate each operation
    for (const operation of diff.operations) {
      const opValidation = this.validateOperation(model, operation);
      errors.push(...opValidation.errors);
      warnings.push(...opValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single operation
   */
  private static validateOperation(
    model: SongModel_v1,
    operation: DiffOperation,
  ): DiffValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (operation.type) {
      case "removeRole":
        if (!model.roles.find((r) => r.id === operation.roleId)) {
          errors.push(`Cannot remove non-existent role: ${operation.roleId}`);
        }
        break;

      case "updateRole":
        if (!model.roles.find((r) => r.id === operation.roleId)) {
          errors.push(`Cannot update non-existent role: ${operation.roleId}`);
        }
        break;

      case "removeSection":
        if (!model.sections.find((s) => s.id === operation.sectionId)) {
          errors.push(
            `Cannot remove non-existent section: ${operation.sectionId}`,
          );
        }
        break;

      case "updateSection":
        if (!model.sections.find((s) => s.id === operation.sectionId)) {
          errors.push(
            `Cannot update non-existent section: ${operation.sectionId}`,
          );
        }
        break;

      case "removeProjection":
        if (!model.projections.find((p) => p.id === operation.projectionId)) {
          errors.push(
            `Cannot remove non-existent projection: ${operation.projectionId}`,
          );
        }
        break;

      // Add more validation as needed for other operations
      case "addRole":
      case "addSection":
      case "addProjection":
      case "updateMixGraph":
      case "updateParameter":
        // These operations are always valid (no preconditions)
        break;

      default:
        warnings.push(`Unknown operation type: ${(operation as any).type}`);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Diff validation result
 */
export interface DiffValidation {
  /** Whether the diff is valid */
  valid: boolean;

  /** Validation errors (must be fixed to apply) */
  errors: string[];

  /** Validation warnings (should be reviewed but won't block application) */
  warnings: string[];
}
