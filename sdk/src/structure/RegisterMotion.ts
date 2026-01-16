/**
 * RegisterMotionManager - Structural Register Changes
 *
 * Register (pitch range) changes are STRUCTURAL events, not ornamental.
 * When a role's register shifts significantly, it must write to formal tension.
 *
 * Schillinger Principles:
 * - Register changes create formal tension (expansion, contraction, jumps)
 * - Bass anchors during chaos (high tension periods)
 * - Different roles have different register behaviors
 * - Register motion follows curves, not random jumps
 *
 * @module structure/RegisterMotion
 */

import { TensionAccumulator, globalTension } from "./TensionAccumulator";

/**
 * Pitch representation (MIDI note number)
 */
export type Pitch = number;

/**
 * Musical role identifier
 */
export type RoleId = string;

/**
 * Musical function category (from RoleIR)
 */
export type MusicalFunction =
  | "melodic"
  | "harmonic"
  | "rhythmic"
  | "textural"
  | "structural";

/**
 * Role register constraints (from RoleIR)
 */
export interface RoleRegisterConstraints {
  /** Minimum allowed pitch (undefined = no constraint) */
  min?: Pitch;
  /** Maximum allowed pitch (undefined = no constraint) */
  max?: Pitch;
  /** Preferred pitch (undefined = no preference) */
  preferred?: Pitch;
}

/**
 * Current register state for a role
 */
export interface RegisterState {
  /** Current minimum pitch being used */
  currentMin: Pitch;
  /** Current maximum pitch being used */
  currentMax: Pitch;
  /** Current center pitch (average of min and max) */
  currentCenter: Pitch;
  /** Current range in semitones */
  currentRange: number;
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Register change event
 */
export interface RegisterChangeEvent {
  /** Role that changed */
  role: RoleId;
  /** Musical function */
  function: MusicalFunction;
  /** Previous state */
  previous: RegisterState;
  /** New state */
  current: RegisterState;
  /** Type of change */
  changeType:
    | "expansion"
    | "contraction"
    | "shift_up"
    | "shift_down"
    | "stable";
  /** Magnitude of change in semitones */
  magnitude: number;
  /** Whether this change exceeded threshold (structural vs ornamental) */
  isStructural: boolean;
  /** Musical time of change */
  musicalTime: {
    bar: number;
    beat: number;
    position: number;
  };
  /** What caused this change */
  cause: string;
}

/**
 * Register curve recommendation
 */
export interface RegisterCurveRecommendation {
  /** Recommended minimum pitch */
  recommendedMin: Pitch;
  /** Recommended maximum pitch */
  recommendedMax: Pitch;
  /** Recommended center pitch */
  recommendedCenter: Pitch;
  /** Recommended range in semitones */
  recommendedRange: number;
  /** Reason for recommendation */
  reason: string;
  /** Expected formal tension if applied (0-1) */
  expectedTension: number;
}

/**
 * Register motion configuration
 */
export interface RegisterMotionConfig {
  /** Threshold in semitones for structural register changes (default: 6 = tritone) */
  structuralChangeThreshold: number;
  /** Bass anchoring tension threshold (above this, bass resists register changes) */
  bassAnchoringThreshold: number;
  /** Bass anchoring strength (0-1, how strongly bass resists changes) */
  bassAnchoringStrength: number;
  /** Enable curve recommendations */
  enableRecommendations: boolean;
  /** Maximum register range per role (prevents unreasonable expansion) */
  maxRangePerRole: Record<MusicalFunction, number>;
}

/**
 * Role register entry
 */
interface RoleRegisterEntry {
  roleId: RoleId;
  musicalFunction: MusicalFunction;
  constraints: RoleRegisterConstraints;
  state: RegisterState;
}

/**
 * Manages register motion as structural tension
 *
 * Key responsibilities:
 * - Track register state per role
 * - Detect structural register changes (exceeding threshold)
 * - Write formal tension for significant register shifts
 * - Provide bass anchoring during high tension
 * - Offer register curve recommendations
 *
 * Usage:
 * ```typescript
 * const manager = new RegisterMotionManager(accumulator);
 *
 * // Register roles with their constraints
 * manager.registerRole('bass', 'harmonic', { min: 36, max: 60, preferred: 48 });
 * manager.registerRole('melody', 'melodic', { min: 60, max: 84, preferred: 72 });
 *
 * // Update register state during composition
 * manager.updateRegister('bass', { currentMin: 40, currentMax: 52 }, 'bass_line_expansion');
 *
 * // Check if role should resist changes (bass anchoring)
 * if (manager.shouldAnchorRole('bass')) {
 *   // Keep bass stable during high tension
 * }
 *
 * // Get register curve recommendation
 * const recommendation = manager.getRegisterCurve('melody', 'increasing_energy');
 * ```
 */
export class RegisterMotionManager {
  private accumulator: TensionAccumulator;
  private roles: Map<RoleId, RoleRegisterEntry> = new Map();
  private changeHistory: RegisterChangeEvent[] = [];
  private config: RegisterMotionConfig;

  // Default configuration
  private readonly DEFAULT_STRUCTURAL_THRESHOLD = 6; // Tritone
  private readonly DEFAULT_BASS_ANCHORING_THRESHOLD = 0.5;
  private readonly DEFAULT_BASS_ANCHORING_STRENGTH = 0.8;
  private readonly MAX_HISTORY_LENGTH = 1000;

  // Default max ranges per role (in semitones)
  private readonly DEFAULT_MAX_RANGES: Record<MusicalFunction, number> = {
    melodic: 24, // 2 octaves
    harmonic: 18, // 1.5 octaves (bass, harmony roles)
    rhythmic: 12, // 1 octave
    textural: 30, // 2.5 octaves (pads, atmospheres)
    structural: 16, // 1.3 octaves
  };

  constructor(
    accumulator: TensionAccumulator,
    config?: Partial<RegisterMotionConfig>,
  ) {
    this.accumulator = accumulator;
    this.config = {
      structuralChangeThreshold:
        config?.structuralChangeThreshold ?? this.DEFAULT_STRUCTURAL_THRESHOLD,
      bassAnchoringThreshold:
        config?.bassAnchoringThreshold ?? this.DEFAULT_BASS_ANCHORING_THRESHOLD,
      bassAnchoringStrength:
        config?.bassAnchoringStrength ?? this.DEFAULT_BASS_ANCHORING_STRENGTH,
      enableRecommendations: config?.enableRecommendations ?? true,
      maxRangePerRole: config?.maxRangePerRole ?? this.DEFAULT_MAX_RANGES,
    };
  }

  /**
   * Register a role with its register constraints
   *
   * @param roleId - Unique role identifier
   * @param musicalFunction - Musical function category
   * @param constraints - Register constraints from RoleIR
   */
  registerRole(
    roleId: RoleId,
    musicalFunction: MusicalFunction,
    constraints: RoleRegisterConstraints,
  ): void {
    const entry: RoleRegisterEntry = {
      roleId,
      musicalFunction,
      constraints,
      state: {
        currentMin: constraints.min ?? 60,
        currentMax: constraints.max ?? 72,
        currentCenter: ((constraints.min ?? 60) + (constraints.max ?? 72)) / 2,
        currentRange: (constraints.max ?? 72) - (constraints.min ?? 60),
        lastUpdate: Date.now(),
      },
    };

    this.roles.set(roleId, entry);
  }

  /**
   * Update register state for a role
   *
   * Detects if change is structural (writes to tension) or ornamental (no effect).
   *
   * @param roleId - Role to update
   * @param newState - New register state
   * @param cause - What caused this change
   * @returns The change event (if structural) or null
   */
  updateRegister(
    roleId: RoleId,
    newState: Partial<Pick<RegisterState, "currentMin" | "currentMax">>,
    cause: string,
  ): RegisterChangeEvent | null {
    const entry = this.roles.get(roleId);
    if (!entry) {
      throw new Error(
        `Role ${roleId} not registered. Call registerRole() first.`,
      );
    }

    const previous = { ...entry.state };
    const musicalTime = this.accumulator.getMusicalPosition();

    // Update state
    if (newState.currentMin !== undefined) {
      entry.state.currentMin = newState.currentMin;
    }
    if (newState.currentMax !== undefined) {
      entry.state.currentMax = newState.currentMax;
    }

    // Recalculate derived values
    entry.state.currentCenter =
      (entry.state.currentMin + entry.state.currentMax) / 2;
    entry.state.currentRange = entry.state.currentMax - entry.state.currentMin;
    entry.state.lastUpdate = Date.now();

    // Analyze change
    const change = this.analyzeChange(entry, previous, musicalTime, cause);

    // Write tension if structural
    if (change.isStructural) {
      this.writeTensionForChange(change);
      // Only record structural changes in history
      this.changeHistory.push(change);

      // Limit history
      if (this.changeHistory.length > this.MAX_HISTORY_LENGTH) {
        this.changeHistory.shift();
      }
    }

    return change.isStructural ? change : null;
  }

  /**
   * Check if role should anchor (resist register changes)
   *
   * Bass roles anchor during high tension to maintain stability.
   *
   * @param roleId - Role to check
   * @returns True if role should anchor
   */
  shouldAnchorRole(roleId: RoleId): boolean {
    const entry = this.roles.get(roleId);
    if (!entry) {
      return false;
    }

    // Only harmonic roles (bass) anchor
    if (entry.musicalFunction !== "harmonic") {
      return false;
    }

    const currentTension = this.accumulator.getTotal();

    // Anchor during high tension
    return currentTension > this.config.bassAnchoringThreshold;
  }

  /**
   * Get register curve recommendation for a role
   *
   * Provides intelligent register suggestions based on:
   * - Current tension level
   * - Role's musical function
   * - Register constraints
   * - Recent register history
   *
   * @param roleId - Role to get recommendation for
   * @param context - Musical context for recommendation
   * @returns Register curve recommendation
   */
  getRegisterCurve(
    roleId: RoleId,
    context: string,
  ): RegisterCurveRecommendation {
    const entry = this.roles.get(roleId);
    if (!entry) {
      throw new Error(`Role ${roleId} not registered.`);
    }

    const currentTension = this.accumulator.getTotal();
    const recent = this.getRecentChangesForRole(roleId, 16);

    // Calculate recommendation based on role function and current state
    const recommendation = this.calculateRecommendation(
      entry,
      currentTension,
      recent,
      context,
    );

    return recommendation;
  }

  /**
   * Get current register state for a role
   */
  getRegisterState(roleId: RoleId): RegisterState | null {
    const entry = this.roles.get(roleId);
    return entry ? { ...entry.state } : null;
  }

  /**
   * Get all register states
   */
  getAllRegisterStates(): Map<RoleId, RegisterState> {
    const states = new Map<RoleId, RegisterState>();
    for (const [roleId, entry] of this.roles.entries()) {
      states.set(roleId, { ...entry.state });
    }
    return states;
  }

  /**
   * Get register change history
   */
  getChangeHistory(): RegisterChangeEvent[] {
    return [...this.changeHistory];
  }

  /**
   * Get recent changes for a specific role
   */
  getRecentChangesForRole(
    roleId: RoleId,
    bars: number = 16,
  ): RegisterChangeEvent[] {
    const currentBar = this.accumulator.getMusicalPosition().bar;
    return this.changeHistory.filter(
      (event) =>
        event.role === roleId && event.musicalTime.bar >= currentBar - bars,
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RegisterMotionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset all register states
   */
  reset(): void {
    for (const entry of this.roles.values()) {
      entry.state.currentMin = entry.constraints.min ?? 60;
      entry.state.currentMax = entry.constraints.max ?? 72;
      entry.state.currentCenter =
        (entry.state.currentMin + entry.state.currentMax) / 2;
      entry.state.currentRange =
        entry.state.currentMax - entry.state.currentMin;
      entry.state.lastUpdate = Date.now();
    }
    this.changeHistory = [];
  }

  /**
   * Analyze register change to determine type and magnitude
   */
  private analyzeChange(
    entry: RoleRegisterEntry,
    previous: RegisterState,
    musicalTime: { bar: number; beat: number; position: number },
    cause: string,
  ): RegisterChangeEvent {
    const current = entry.state;

    // Calculate magnitudes
    const centerShift = Math.abs(
      current.currentCenter - previous.currentCenter,
    );
    const rangeChange = current.currentRange - previous.currentRange;

    // Determine change type
    let changeType: RegisterChangeEvent["changeType"];
    if (rangeChange > 1) {
      changeType = rangeChange > 0 ? "expansion" : "contraction";
    } else if (centerShift > 1) {
      changeType =
        current.currentCenter > previous.currentCenter
          ? "shift_up"
          : "shift_down";
    } else {
      changeType = "stable";
    }

    // Calculate magnitude (combined effect of shift and range change)
    const magnitude = Math.sqrt(centerShift ** 2 + rangeChange ** 2);

    // Determine if structural (exceeds threshold)
    const isStructural = magnitude >= this.config.structuralChangeThreshold;

    return {
      role: entry.roleId,
      function: entry.musicalFunction,
      previous,
      current,
      changeType,
      magnitude,
      isStructural,
      musicalTime,
      cause,
    };
  }

  /**
   * Write formal tension for structural register change
   */
  private writeTensionForChange(change: RegisterChangeEvent): void {
    // Calculate tension based on change type and magnitude
    let baseTension: number;

    switch (change.changeType) {
      case "expansion":
        // Register expansion increases tension (widening = more possibilities = more tension)
        baseTension =
          0.4 +
          (change.magnitude / this.config.structuralChangeThreshold) * 0.3;
        break;
      case "contraction":
        // Register contraction increases tension (narrowing = focus = tension)
        baseTension =
          0.3 +
          (change.magnitude / this.config.structuralChangeThreshold) * 0.2;
        break;
      case "shift_up":
        // Upward shifts increase tension (ascending energy)
        baseTension =
          0.3 +
          (change.magnitude / this.config.structuralChangeThreshold) * 0.3;
        break;
      case "shift_down":
        // Downward shifts can be tension (descent) or resolution
        baseTension =
          0.2 +
          (change.magnitude / this.config.structuralChangeThreshold) * 0.2;
        break;
      case "stable":
        // No tension for stable register
        baseTension = 0.1;
        break;
    }

    // Clamp to 0-1
    const tension = Math.max(0, Math.min(1, baseTension));

    // Write to formal tension with original cause
    this.accumulator.writeFormalTension(tension, change.cause);
  }

  /**
   * Calculate register curve recommendation
   */
  private calculateRecommendation(
    entry: RoleRegisterEntry,
    currentTension: number,
    recent: RegisterChangeEvent[],
    context: string,
  ): RegisterCurveRecommendation {
    const { state, constraints, musicalFunction } = entry;
    const maxRange = this.config.maxRangePerRole[musicalFunction];

    // Determine target range based on tension
    let targetRange: number;
    let reason: string;

    if (currentTension > 0.6) {
      // High tension: expand range for melodic/textural, contract for rhythmic
      if (musicalFunction === "melodic" || musicalFunction === "textural") {
        targetRange = Math.min(maxRange, state.currentRange * 1.3); // Increased from 1.2
        reason = "High tension: expanding register for expressive range";
      } else {
        targetRange = Math.max(6, state.currentRange * 0.8);
        reason = "High tension: focusing register for rhythmic clarity";
      }
    } else if (currentTension < 0.3) {
      // Low tension: moderate range
      targetRange = state.currentRange * 0.9;
      reason = "Low tension: moderate register for stability";
    } else {
      // Medium tension: maintain current
      targetRange = state.currentRange;
      reason = "Medium tension: maintaining current register";
    }

    // Apply bass anchoring (only for bass role, not all harmonic roles)
    const isBassRole = entry.roleId === "bass";
    if (
      isBassRole &&
      musicalFunction === "harmonic" &&
      this.shouldAnchorRole(entry.roleId)
    ) {
      targetRange = Math.min(targetRange, 12); // Limit bass to 1 octave during high tension
      reason =
        "Bass anchoring during high tension: limiting register to maintain stability";
    }

    // Clamp to constraints
    const constrainedMin = constraints.min ?? state.currentMin - 6;
    const constrainedMax = constraints.max ?? state.currentMax + 6;
    const clampedRange = Math.max(6, Math.min(maxRange, targetRange));

    // Calculate recommended min/max maintaining current center
    let recommendedMin = Math.max(
      constrainedMin,
      state.currentCenter - clampedRange / 2,
    );
    let recommendedMax = Math.min(
      constrainedMax,
      state.currentCenter + clampedRange / 2,
    );

    // Adjust if constraints prevent centered range
    if (recommendedMax - recommendedMin < clampedRange) {
      if (recommendedMin <= constrainedMin) {
        recommendedMax = recommendedMin + clampedRange;
      } else {
        recommendedMin = recommendedMax - clampedRange;
      }
    }

    const recommendedCenter = (recommendedMin + recommendedMax) / 2;

    // Calculate expected formal tension (reduced base tension)
    const rangeChange = Math.abs(clampedRange - state.currentRange);
    const expectedTension =
      0.15 + (rangeChange / this.config.structuralChangeThreshold) * 0.25;

    return {
      recommendedMin,
      recommendedMax,
      recommendedCenter,
      recommendedRange: clampedRange,
      reason,
      expectedTension: Math.min(1, expectedTension),
    };
  }
}

/**
 * Global register motion manager singleton
 */
export const globalRegisterMotion = new RegisterMotionManager(globalTension);
