/**
 * IntentIR — Goal Authority
 *
 * Responsibility: Captures what the system is trying to achieve, not how
 *
 * Phase 5: Intent-driven adaptation with strict safety and explainability
 *
 * Rules:
 * - IntentIR never directly creates PatternIR
 * - IntentIR influences Process selection, Control field shaping, Constraint priority
 * - Higher priority intents dominate
 * - Conflicting intents must resolve deterministically
 */

import type { IntentId, TimeRange } from "./types";

/**
 * Intent goals - what the system is trying to achieve
 */
export type IntentGoal =
  | "increase_tension"
  | "resolve_tension"
  | "thin_texture"
  | "increase_density"
  | "create_contrast"
  | "stabilize"
  | "prepare_transition";

/**
 * Intent scope - where the intent applies
 */
export type IntentScope = "global" | "scene" | "section" | "role";

/**
 * Intent source - who or what created the intent
 */
export type IntentSource = "user" | "composer" | "ai" | "system";

/**
 * IntentIR_v1 - Goal Authority
 *
 * IntentIR represents what the system is trying to achieve, not how.
 * This is the foundation for intent-driven adaptation with strict safety and explainability.
 */
export interface IntentIR_v1 {
  version: "1.0";
  id: IntentId;

  /**
   * What the system is trying to achieve
   */
  goal: IntentGoal;

  /**
   * Intent strength (0-1)
   * Determines how strongly the intent influences behavior
   */
  strength: number;

  /**
   * Where the intent applies
   */
  scope: IntentScope;

  /**
   * Optional time range for temporal intents
   */
  timeRange?: TimeRange;

  /**
   * Source of the intent
   * AI-sourced intents are treated as suggestions, subject to arbitration
   */
  source: IntentSource;

  /**
   * Priority for conflict resolution
   * Higher priority intents dominate
   */
  priority: number;
}
