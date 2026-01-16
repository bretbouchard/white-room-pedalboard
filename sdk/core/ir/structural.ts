/**
 * StructuralIR — Form & Hierarchy
 *
 * Responsibility: Defines hierarchical musical structure and sectional logic
 *
 * Phase 4: StructuralIR becomes a tree, not a flat list.
 * Enables: form, hierarchy, sectional logic, and long-range musical intent
 */

import type {
  SectionId,
  RoleId,
  ConstraintId,
  SceneId,
  TimeRange,
} from "./types";

/**
 * Section role behavior - how a role behaves in a specific section
 */
export interface SectionRoleBehavior {
  roleId: RoleId;
  sectionId: SectionId;

  /** Bias modifiers for this role in this section */
  densityBias?: number; // -1 to 1, modifies density
  registerBias?: number; // -1 to 1, modifies pitch register
  rhythmicBias?: number; // -1 to 1, modifies rhythmic activity
}

/**
 * Scene hint - how scenes influence structural transitions
 */
export interface SceneHint {
  sceneId: SceneId;

  /** Intent bias when this scene is active */
  intentBias?: {
    tension?: number; // 0 to 1, harmonic tension
    density?: number; // 0 to 1, event density
    contrast?: number; // 0 to 1, contrast level
  };

  /** How to transition to/from this scene */
  transitionStyle?: "cut" | "fade" | "morph";
}

/**
 * Structural constraint (legacy, kept for backward compatibility)
 */
export interface StructuralConstraint {
  type: "range" | "density" | "complexity" | "custom";
  value: number | string;
  description?: string;
}

/**
 * StructuralIR_v1 - Hierarchical form graph
 *
 * Phase 4: Sections form a directed acyclic graph (tree structure)
 * - Root section is the entry point
 * - Children inherit constraints unless overridden
 * - Section boundaries do not regenerate patterns
 * - StructuralIR never emits notes directly
 */
export interface StructuralIR_v1 {
  version: "1.0";
  id: SectionId; // Structure identifier

  /**
   * Root section of the hierarchical structure
   */
  rootSection: SectionId;

  /**
   * All sections in the structure (tree nodes)
   */
  sections: {
    id: SectionId;

    /** Parent section (undefined for root) */
    parent?: SectionId;

    /** Child sections (leaf nodes have empty array) */
    children?: SectionId[];

    /** Time range this section occupies */
    timeRange: TimeRange;

    /** Role weights for this section (0 to 1, relative emphasis) */
    roleWeights: Record<RoleId, number>;

    /** Constraints applying to this section */
    constraints?: ConstraintId[];

    /** Scene hints for this section */
    sceneHints?: SceneHint[];
  }[];

  /**
   * Section-aware role behaviors
   */
  roleBehaviors?: SectionRoleBehavior[];

  /**
   * Legacy global constraints (kept for backward compatibility)
   */
  globalConstraints?: StructuralConstraint[];
}
