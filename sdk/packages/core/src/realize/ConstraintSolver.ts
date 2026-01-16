/**
 * Realization Engine - Constraint Solver
 *
 * Handles constraint satisfaction during realization.
 * Ensures generated notes comply with register, contour, and other constraints.
 */

import type { Constraint, Note } from "../types";

/**
 * Constraint satisfaction result
 */
export interface ConstraintResult {
  satisfied: boolean;
  violations: string[];
  adjustments: Adjustment[];
}

/**
 * Note adjustment made to satisfy constraints
 */
export interface Adjustment {
  noteId: string;
  property: "pitch" | "velocity" | "duration";
  originalValue: number;
  adjustedValue: number;
  reason: string;
}

/**
 * Constraint solver
 *
 * Evaluates and applies constraints during realization.
 */
export class ConstraintSolver {
  private constraints: Map<string, Constraint>;

  constructor() {
    this.constraints = new Map();
  }

  /**
   * Add a constraint
   */
  addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.constraintId, constraint);
  }

  /**
   * Evaluate a note against constraints
   */
  evaluate(note: Note, systemId: string): ConstraintResult {
    const violations: string[] = [];
    const adjustments: Adjustment[] = [];

    for (const constraint of this.constraints.values()) {
      // Check if constraint applies to this system
      if (constraint.systemId && constraint.systemId !== systemId) {
        continue;
      }

      const result = this.evaluateConstraint(note, constraint);
      if (!result.satisfied) {
        violations.push(`${constraint.type}: ${result.reason}`);
      }
    }

    return {
      satisfied: violations.length === 0,
      violations,
      adjustments,
    };
  }

  /**
   * Apply constraint to a note
   */
  apply(note: Note, constraint: Constraint): Note | null {
    switch (constraint.type) {
      case "register":
        return this.applyRegisterConstraint(note, constraint);
      case "contour":
        return this.applyContourConstraint(note, constraint);
      case "duration":
        return this.applyDurationConstraint(note, constraint);
      case "velocity":
        return this.applyVelocityConstraint(note, constraint);
      default:
        return note;
    }
  }

  /**
   * Evaluate a single constraint
   */
  private evaluateConstraint(
    note: Note,
    constraint: Constraint
  ): {
    satisfied: boolean;
    reason: string;
  } {
    switch (constraint.type) {
      case "register":
        return this.evaluateRegister(note, constraint);
      case "contour":
        return this.evaluateContour(note, constraint);
      case "duration":
        return this.evaluateDuration(note, constraint);
      case "velocity":
        return this.evaluateVelocity(note, constraint);
      default:
        return { satisfied: true, reason: "Unknown constraint type" };
    }
  }

  /**
   * Evaluate register constraint
   */
  private evaluateRegister(
    note: Note,
    constraint: Constraint
  ): {
    satisfied: boolean;
    reason: string;
  } {
    const params = constraint.parameters as { minPitch?: number; maxPitch?: number };

    if (params.minPitch !== undefined && note.pitch < params.minPitch) {
      return { satisfied: false, reason: `Pitch ${note.pitch} below minimum ${params.minPitch}` };
    }
    if (params.maxPitch !== undefined && note.pitch > params.maxPitch) {
      return { satisfied: false, reason: `Pitch ${note.pitch} above maximum ${params.maxPitch}` };
    }

    return { satisfied: true, reason: "" };
  }

  /**
   * Evaluate contour constraint
   */
  private evaluateContour(
    _note: Note,
    _constraint: Constraint
  ): {
    satisfied: boolean;
    reason: string;
  } {
    // Contour constraints require context (previous notes)
    // For now, always satisfied (context evaluated elsewhere)
    return { satisfied: true, reason: "" };
  }

  /**
   * Evaluate duration constraint
   */
  private evaluateDuration(
    note: Note,
    constraint: Constraint
  ): {
    satisfied: boolean;
    reason: string;
  } {
    const params = constraint.parameters as { minDuration?: number; maxDuration?: number };

    if (params.minDuration !== undefined && note.duration < params.minDuration) {
      return {
        satisfied: false,
        reason: `Duration ${note.duration} below minimum ${params.minDuration}`,
      };
    }
    if (params.maxDuration !== undefined && note.duration > params.maxDuration) {
      return {
        satisfied: false,
        reason: `Duration ${note.duration} above maximum ${params.maxDuration}`,
      };
    }

    return { satisfied: true, reason: "" };
  }

  /**
   * Evaluate velocity constraint
   */
  private evaluateVelocity(
    note: Note,
    constraint: Constraint
  ): {
    satisfied: boolean;
    reason: string;
  } {
    const params = constraint.parameters as { minVelocity?: number; maxVelocity?: number };

    if (params.minVelocity !== undefined && note.velocity < params.minVelocity) {
      return {
        satisfied: false,
        reason: `Velocity ${note.velocity} below minimum ${params.minVelocity}`,
      };
    }
    if (params.maxVelocity !== undefined && note.velocity > params.maxVelocity) {
      return {
        satisfied: false,
        reason: `Velocity ${note.velocity} above maximum ${params.maxVelocity}`,
      };
    }

    return { satisfied: true, reason: "" };
  }

  /**
   * Apply register constraint (clamp to range)
   */
  private applyRegisterConstraint(note: Note, constraint: Constraint): Note | null {
    const params = constraint.parameters as { minPitch?: number; maxPitch?: number };
    let adjusted = false;

    if (params.minPitch !== undefined && note.pitch < params.minPitch) {
      note.pitch = params.minPitch;
      adjusted = true;
    }
    if (params.maxPitch !== undefined && note.pitch > params.maxPitch) {
      note.pitch = params.maxPitch;
      adjusted = true;
    }

    return adjusted ? { ...note } : null;
  }

  /**
   * Apply contour constraint (adjust based on previous note)
   */
  private applyContourConstraint(_note: Note, _constraint: Constraint): Note | null {
    // Contour requires context - handled at higher level
    return null;
  }

  /**
   * Apply duration constraint (clamp to range)
   */
  private applyDurationConstraint(note: Note, constraint: Constraint): Note | null {
    const params = constraint.parameters as { minDuration?: number; maxDuration?: number };
    let adjusted = false;

    if (params.minDuration !== undefined && note.duration < params.minDuration) {
      note.duration = params.minDuration;
      adjusted = true;
    }
    if (params.maxDuration !== undefined && note.duration > params.maxDuration) {
      note.duration = params.maxDuration;
      adjusted = true;
    }

    return adjusted ? { ...note } : null;
  }

  /**
   * Apply velocity constraint (clamp to range)
   */
  private applyVelocityConstraint(note: Note, constraint: Constraint): Note | null {
    const params = constraint.parameters as { minVelocity?: number; maxVelocity?: number };
    let adjusted = false;

    if (params.minVelocity !== undefined && note.velocity < params.minVelocity) {
      note.velocity = params.minVelocity;
      adjusted = true;
    }
    if (params.maxVelocity !== undefined && note.velocity > params.maxVelocity) {
      note.velocity = params.maxVelocity;
      adjusted = true;
    }

    return adjusted ? { ...note } : null;
  }

  /**
   * Clear all constraints
   */
  clear(): void {
    this.constraints.clear();
  }

  /**
   * Get constraint count
   */
  get count(): number {
    return this.constraints.size;
  }

  /**
   * Apply all constraints for a system to a note
   * Returns the adjusted note or null if no adjustments were made
   */
  applyAllForSystem(note: Note, systemId: string): Note | null {
    let adjustedNote: Note | null = null;
    let workingNote = { ...note };

    for (const constraint of this.constraints.values()) {
      // Check if constraint applies to this system
      if (constraint.systemId && constraint.systemId !== systemId) {
        continue;
      }

      const result = this.evaluateConstraint(workingNote, constraint);
      if (!result.satisfied) {
        const adjusted = this.apply(workingNote, constraint);
        if (adjusted) {
          workingNote = adjusted;
          adjustedNote = adjusted;
        }
      }
    }

    return adjustedNote;
  }
}
