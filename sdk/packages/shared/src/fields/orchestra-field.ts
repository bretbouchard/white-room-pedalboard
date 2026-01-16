/**
 * Orchestra Field Implementation
 *
 * Orchestra fields manage instrumental resources and their capabilities,
 * enabling intelligent orchestration and instrument assignment for
 * realized musical material.
 */

import {
  OrchestraField as IOrchestraField,
  InstrumentSpec,
  MusicalRole,
  RegisterRange,
} from "../types/realization";

/**
 * Instrument family characteristics
 */
export interface InstrumentFamily {
  family: string;
  defaultRegister: RegisterRange;
  typicalRoles: MusicalRole[];
  blendCompatibility: Record<string, number>; // Compatibility with other families
  density: "sparse" | "medium" | "dense";
  color: string; // For visualization
}

/**
 * Orchestration constraints and preferences
 */
export interface OrchestrationConstraints {
  maxInstrumentCount: number;
  balancePreferences: Record<MusicalRole, number>;
  registerConstraints: {
    avoidOverlap: boolean;
    maxOverlapPercent: number;
    preferSpacing: boolean;
  };
  styleConstraints: {
    period: "baroque" | "classical" | "romantic" | "modern" | "contemporary";
    ensembleSize: "chamber" | "orchestral" | "band" | "electronic" | "mixed";
  };
}

/**
 * Instrument assignment result
 */
export interface InstrumentAssignment {
  layerId: string;
  instrument: InstrumentSpec;
  confidence: number; // 0.0 to 1.0
  reasons: string[]; // Why this instrument was chosen
  alternatives: Array<{
    instrument: InstrumentSpec;
    confidence: number;
  }>;
}

/**
 * Orchestra field implementation
 */
export class OrchestraField implements IOrchestraField {
  public readonly id: string;
  public instruments: InstrumentSpec[];
  public constraints: {
    registerOverlap: number;
    doublingTolerance: number;
    densityLimit: number;
    balanceWeight: Record<MusicalRole, number>;
  };

  private _instrumentFamilies: Map<string, InstrumentFamily> = new Map();
  private _assignmentCache: Map<string, InstrumentAssignment[]> = new Map();
  private _compatibilityMatrix: Map<string, Map<string, number>> = new Map();

  constructor(options: {
    id: string;
    instruments?: InstrumentSpec[];
    constraints?: Partial<{
      registerOverlap: number;
      doublingTolerance: number;
      densityLimit: number;
      balanceWeight: Record<MusicalRole, number>;
    }>;
  }) {
    this.id = options.id;
    this.instruments = options.instruments || this.getDefaultInstrumentarium();
    this.constraints = {
      registerOverlap: 0.3,
      doublingTolerance: 2,
      densityLimit: 12,
      balanceWeight: {
        melody: 1.0,
        lead: 1.0,
        bass: 0.8,
        harmony: 0.7,
        "counter-melody": 0.6,
        rhythm: 0.5,
        texture: 0.4,
        ornament: 0.3,
        accompaniment: 0.4,
      },
      ...options.constraints,
    };

    this.initializeInstrumentFamilies();
    this.buildCompatibilityMatrix();
  }

  /**
   * Get instruments suitable for specific role
   */
  getInstrumentsForRole(role: MusicalRole): InstrumentSpec[] {
    const suitable = this.instruments.filter((instrument) =>
      instrument.capabilities.roles.includes(role),
    );

    // Sort by suitability for role
    return suitable.sort((a, b) => {
      const scoreA = this.calculateRoleSuitability(a, role);
      const scoreB = this.calculateRoleSuitability(b, role);
      return scoreB - scoreA;
    });
  }

  /**
   * Check register compatibility between instruments
   */
  areRegistersCompatible(
    inst1: InstrumentSpec,
    inst2: InstrumentSpec,
  ): boolean {
    const overlap = this.calculateRegisterOverlap(
      inst1.register,
      inst2.register,
    );
    return overlap <= this.constraints.registerOverlap;
  }

  /**
   * Assign instruments to layers intelligently
   */
  assignInstruments(
    layerRequirements: Array<{
      layerId: string;
      role: MusicalRole;
      register: RegisterRange;
      energy: number;
      characteristics?: {
        density?: number;
        complexity?: number;
        articulation?: "legato" | "staccato" | "mixed";
      };
    }>,
    existingAssignments?: Map<string, InstrumentSpec>,
  ): InstrumentAssignment[] {
    const cacheKey = this.generateAssignmentCacheKey(
      layerRequirements,
      existingAssignments,
    );
    if (this._assignmentCache.has(cacheKey)) {
      return this._assignmentCache.get(cacheKey)!;
    }

    const assignments: InstrumentAssignment[] = [];
    const availableInstruments =
      this.getAvailableInstruments(existingAssignments);
    const roleBalances = this.calculateRequiredBalances(layerRequirements);

    // Sort layers by importance and difficulty
    const sortedRequirements = layerRequirements.sort((a, b) => {
      const importanceA = this.constraints.balanceWeight[a.role];
      const importanceB = this.constraints.balanceWeight[b.role];
      return importanceB - importanceA;
    });

    for (const requirement of sortedRequirements) {
      const assignment = this.findBestInstrument(
        requirement,
        availableInstruments,
        assignments,
        roleBalances,
      );

      if (assignment) {
        assignments.push(assignment);
        // Remove assigned instrument from availability
        const assignedIndex = availableInstruments.findIndex(
          (inst) => inst.id === assignment.instrument.id,
        );
        if (assignedIndex >= 0) {
          availableInstruments.splice(assignedIndex, 1);
        }
      }
    }

    // Cache result
    this._assignmentCache.set(cacheKey, assignments);
    return assignments;
  }

  /**
   * Optimize orchestration for overall balance
   */
  optimizeOrchestration(
    assignments: InstrumentAssignment[],
  ): InstrumentAssignment[] {
    const optimized = [...assignments];

    // Check for register conflicts
    this.resolveRegisterConflicts(optimized);

    // Check for role balance
    this.balanceRoles(optimized);

    // Check for doubling issues
    this.resolveDoublingConflicts(optimized);

    // Check for density
    this.optimizeDensity(optimized);

    return optimized;
  }

  /**
   * Generate orchestration suggestions
   */
  generateOrchestrationSuggestions(
    musicalContext: {
      style?: string;
      period?: string;
      ensembleSize?: string;
      mood?: "bright" | "dark" | "dramatic" | "lyrical" | "rhythmic";
    },
    layerCount: number,
  ): Array<{
    description: string;
    instruments: InstrumentSpec[];
    suitability: number;
    reasons: string[];
  }> {
    const suggestions = [];

    // Generate different orchestration strategies
    const strategies = [
      this.generateClassicalOrchestration(musicalContext, layerCount),
      this.generateModernOrchestration(musicalContext, layerCount),
      this.generateChamberOrchestration(musicalContext, layerCount),
      this.generateElectronicOrchestration(musicalContext, layerCount),
      this.generateMixedOrchestration(musicalContext, layerCount),
    ];

    for (const strategy of strategies) {
      if (strategy) {
        suggestions.push(strategy);
      }
    }

    return suggestions.sort((a, b) => b.suitability - a.suitability);
  }

  /**
   * Get instrument family information
   */
  getInstrumentFamily(familyName: string): InstrumentFamily | undefined {
    return this._instrumentFamilies.get(familyName);
  }

  /**
   * Check compatibility between instrument families
   */
  getFamilyCompatibility(family1: string, family2: string): number {
    return this._compatibilityMatrix.get(family1)?.get(family2) || 0.5;
  }

  /**
   * Get orchestration statistics
   */
  getOrchestrationStatistics(): {
    totalInstruments: number;
    familyDistribution: Record<string, number>;
    roleCapabilities: Record<MusicalRole, number>;
    registerRange: RegisterRange;
  } {
    const familyDistribution: Record<string, number> = {};
    const roleCapabilities: Partial<Record<MusicalRole, number>> = {};

    let minPitch = 127;
    let maxPitch = 0;

    for (const instrument of this.instruments) {
      // Count family distribution
      familyDistribution[instrument.family] =
        (familyDistribution[instrument.family] || 0) + 1;

      // Count role capabilities
      for (const role of instrument.capabilities.roles) {
        roleCapabilities[role] = (roleCapabilities[role] || 0) + 1;
      }

      // Track register range
      minPitch = Math.min(minPitch, instrument.register.min);
      maxPitch = Math.max(maxPitch, instrument.register.max);
    }

    // Ensure all roles are present in roleCapabilities
    const allRoles: MusicalRole[] = [
      "bass",
      "harmony",
      "melody",
      "counter-melody",
      "rhythm",
      "ornament",
      "lead",
      "accompaniment",
      "texture",
    ];
    for (const role of allRoles) {
      if (!roleCapabilities[role]) {
        roleCapabilities[role] = 0;
      }
    }

    return {
      totalInstruments: this.instruments.length,
      familyDistribution,
      roleCapabilities: roleCapabilities as Record<MusicalRole, number>,
      registerRange: {
        min: minPitch,
        max: maxPitch,
        center: (minPitch + maxPitch) / 2,
        width: maxPitch - minPitch,
      },
    };
  }

  // Private methods

  /**
   * Initialize instrument families with default characteristics
   */
  private initializeInstrumentFamilies(): void {
    const families: Record<string, InstrumentFamily> = {
      strings: {
        family: "strings",
        defaultRegister: { min: 40, max: 88, center: 64, width: 48 },
        typicalRoles: ["melody", "harmony", "texture", "accompaniment"],
        blendCompatibility: {
          strings: 0.9,
          woodwinds: 0.8,
          brass: 0.7,
          percussion: 0.6,
          keyboard: 0.8,
          electronic: 0.5,
        },
        density: "dense",
        color: "#8B4513",
      },
      woodwinds: {
        family: "woodwinds",
        defaultRegister: { min: 55, max: 92, center: 73, width: 37 },
        typicalRoles: ["melody", "counter-melody", "ornament", "texture"],
        blendCompatibility: {
          strings: 0.8,
          woodwinds: 0.7,
          brass: 0.6,
          percussion: 0.5,
          keyboard: 0.7,
          electronic: 0.6,
        },
        density: "medium",
        color: "#DEB887",
      },
      brass: {
        family: "brass",
        defaultRegister: { min: 34, max: 78, center: 56, width: 44 },
        typicalRoles: ["melody", "harmony", "rhythm", "lead"],
        blendCompatibility: {
          strings: 0.7,
          woodwinds: 0.6,
          brass: 0.8,
          percussion: 0.7,
          keyboard: 0.6,
          electronic: 0.4,
        },
        density: "medium",
        color: "#FFD700",
      },
      percussion: {
        family: "percussion",
        defaultRegister: { min: 0, max: 50, center: 25, width: 50 },
        typicalRoles: ["rhythm", "texture", "ornament"],
        blendCompatibility: {
          strings: 0.6,
          woodwinds: 0.5,
          brass: 0.7,
          percussion: 0.9,
          keyboard: 0.5,
          electronic: 0.7,
        },
        density: "sparse",
        color: "#C0C0C0",
      },
      keyboard: {
        family: "keyboard",
        defaultRegister: { min: 21, max: 108, center: 64, width: 87 },
        typicalRoles: ["harmony", "melody", "accompaniment", "texture"],
        blendCompatibility: {
          strings: 0.8,
          woodwinds: 0.7,
          brass: 0.6,
          percussion: 0.5,
          keyboard: 0.7,
          electronic: 0.8,
        },
        density: "dense",
        color: "#000080",
      },
      electronic: {
        family: "electronic",
        defaultRegister: { min: 0, max: 127, center: 63, width: 127 },
        typicalRoles: ["texture", "rhythm", "harmony", "lead"],
        blendCompatibility: {
          strings: 0.5,
          woodwinds: 0.6,
          brass: 0.4,
          percussion: 0.7,
          keyboard: 0.8,
          electronic: 0.9,
        },
        density: "dense",
        color: "#FF00FF",
      },
    };

    for (const [name, family] of Object.entries(families)) {
      this._instrumentFamilies.set(name, family);
    }
  }

  /**
   * Build compatibility matrix between instrument families
   */
  private buildCompatibilityMatrix(): void {
    for (const [family1, family1Data] of this._instrumentFamilies) {
      const compatibilityMap = new Map<string, number>();

      for (const [family2, _family2Data] of this._instrumentFamilies) {
        const compatibility = family1Data.blendCompatibility[family2] || 0.5;
        compatibilityMap.set(family2, compatibility);
      }

      this._compatibilityMatrix.set(family1, compatibilityMap);
    }
  }

  /**
   * Get default instrumentarium
   */
  private getDefaultInstrumentarium(): InstrumentSpec[] {
    // Standard orchestral instruments with realistic specifications
    return [
      // Strings
      {
        id: "violin1",
        name: "Violin I",
        family: "strings",
        register: { min: 55, max: 88, center: 71, width: 33 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [20, 127],
          attackTime: 0.05,
          sustainTime: 2.0,
          releaseTime: 0.3,
        },
        capabilities: {
          roles: ["melody", "counter-melody", "texture", "ornament"],
          techniques: ["legato", "staccato", "pizzicato", "tremolo", "vibrato"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "viola",
        name: "Viola",
        family: "strings",
        register: { min: 48, max: 81, center: 64, width: 33 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [20, 120],
          attackTime: 0.06,
          sustainTime: 2.2,
          releaseTime: 0.35,
        },
        capabilities: {
          roles: ["harmony", "counter-melody", "texture", "accompaniment"],
          techniques: ["legato", "staccato", "pizzicato", "tremolo"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "cello",
        name: "Cello",
        family: "strings",
        register: { min: 36, max: 72, center: 54, width: 36 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [25, 120],
          attackTime: 0.08,
          sustainTime: 3.0,
          releaseTime: 0.4,
        },
        capabilities: {
          roles: ["bass", "harmony", "melody", "accompaniment"],
          techniques: ["legato", "staccato", "pizzicato", "tremolo"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "double-bass",
        name: "Double Bass",
        family: "strings",
        register: { min: 28, max: 55, center: 41, width: 27 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [30, 115],
          attackTime: 0.1,
          sustainTime: 3.5,
          releaseTime: 0.5,
        },
        capabilities: {
          roles: ["bass", "rhythm", "harmony"],
          techniques: ["legato", "staccato", "pizzicato"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },

      // Woodwinds
      {
        id: "flute",
        name: "Flute",
        family: "woodwinds",
        register: { min: 60, max: 96, center: 78, width: 36 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [30, 120],
          attackTime: 0.03,
          sustainTime: 1.5,
          releaseTime: 0.2,
        },
        capabilities: {
          roles: ["melody", "counter-melody", "ornament", "texture"],
          techniques: [
            "legato",
            "staccato",
            "tremolo",
            "flutter-tongue",
            "trill",
          ],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "oboe",
        name: "Oboe",
        family: "woodwinds",
        register: { min: 58, max: 88, center: 73, width: 30 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [35, 115],
          attackTime: 0.04,
          sustainTime: 2.0,
          releaseTime: 0.25,
        },
        capabilities: {
          roles: ["melody", "counter-melody", "ornament"],
          techniques: ["legato", "staccato", "tremolo", "trill"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "clarinet",
        name: "Clarinet",
        family: "woodwinds",
        register: { min: 50, max: 92, center: 71, width: 42 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [25, 120],
          attackTime: 0.05,
          sustainTime: 2.5,
          releaseTime: 0.3,
        },
        capabilities: {
          roles: ["melody", "harmony", "counter-melody", "texture"],
          techniques: ["legato", "staccato", "tremolo", "glissando"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },

      // Brass
      {
        id: "french-horn",
        name: "French Horn",
        family: "brass",
        register: { min: 34, max: 78, center: 56, width: 44 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [40, 125],
          attackTime: 0.1,
          sustainTime: 4.0,
          releaseTime: 0.5,
        },
        capabilities: {
          roles: ["harmony", "melody", "texture", "accompaniment"],
          techniques: ["legato", "staccato", "mute", "stopped"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },
      {
        id: "trumpet",
        name: "Trumpet",
        family: "brass",
        register: { min: 52, max: 84, center: 68, width: 32 },
        characteristics: {
          polyphonic: false,
          dynamicRange: [35, 127],
          attackTime: 0.08,
          sustainTime: 3.0,
          releaseTime: 0.3,
        },
        capabilities: {
          roles: ["melody", "lead", "harmony", "rhythm"],
          techniques: ["legato", "staccato", "mute", "flutter-tongue"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },

      // Keyboard
      {
        id: "piano",
        name: "Piano",
        family: "keyboard",
        register: { min: 21, max: 108, center: 64, width: 87 },
        characteristics: {
          polyphonic: true,
          dynamicRange: [10, 127],
          attackTime: 0.02,
          sustainTime: 5.0,
          releaseTime: 0.8,
        },
        capabilities: {
          roles: ["harmony", "melody", "accompaniment", "texture", "rhythm"],
          techniques: ["legato", "staccato", "pedal", "arpeggio"],
          expressions: ["crescendo", "diminuendo", "accent"],
        },
      },

      // Electronic
      {
        id: "synth-lead",
        name: "Synthesizer Lead",
        family: "electronic",
        register: { min: 24, max: 96, center: 60, width: 72 },
        characteristics: {
          polyphonic: true,
          dynamicRange: [5, 127],
          attackTime: 0.01,
          sustainTime: 3.0,
          releaseTime: 0.2,
        },
        capabilities: {
          roles: ["lead", "melody", "texture", "harmony"],
          techniques: ["legato", "staccato", "portamento", "vibrato"],
          expressions: ["crescendo", "diminuendo", "accent", "filter"],
        },
      },
    ];
  }

  /**
   * Calculate suitability score for instrument and role
   */
  private calculateRoleSuitability(
    instrument: InstrumentSpec,
    role: MusicalRole,
  ): number {
    const hasRole = instrument.capabilities.roles.includes(role) ? 1.0 : 0.0;
    const roleWeight = this.constraints.balanceWeight[role] || 0.5;
    const familyBonus = this.getRoleFamilyBonus(instrument.family, role);

    return hasRole * roleWeight * familyBonus;
  }

  /**
   * Get bonus score for instrument family and role combination
   */
  private getRoleFamilyBonus(family: string, role: MusicalRole): number {
    const bonuses: Record<string, Partial<Record<MusicalRole, number>>> = {
      strings: {
        melody: 1.2,
        harmony: 1.1,
        texture: 1.0,
        accompaniment: 0.9,
      },
      woodwinds: {
        melody: 1.3,
        "counter-melody": 1.2,
        ornament: 1.1,
        texture: 0.8,
      },
      brass: {
        lead: 1.3,
        rhythm: 1.1,
        harmony: 0.9,
        melody: 1.0,
      },
      keyboard: {
        harmony: 1.3,
        accompaniment: 1.2,
        melody: 1.0,
        texture: 1.1,
      },
      electronic: {
        texture: 1.3,
        rhythm: 1.2,
        lead: 1.1,
        harmony: 1.0,
      },
    };

    return bonuses[family]?.[role] || 1.0;
  }

  /**
   * Calculate register overlap percentage
   */
  private calculateRegisterOverlap(
    reg1: RegisterRange,
    reg2: RegisterRange,
  ): number {
    const overlapStart = Math.max(reg1.min, reg2.min);
    const overlapEnd = Math.min(reg1.max, reg2.max);

    if (overlapStart >= overlapEnd) return 0;

    const overlapRange = overlapEnd - overlapStart;
    const combinedRange =
      Math.max(reg1.max, reg2.max) - Math.min(reg1.min, reg2.min);

    return overlapRange / combinedRange;
  }

  /**
   * Get available instruments considering existing assignments
   */
  private getAvailableInstruments(
    existingAssignments?: Map<string, InstrumentSpec>,
  ): InstrumentSpec[] {
    if (!existingAssignments || existingAssignments.size === 0) {
      return [...this.instruments];
    }

    const assignedIds = Array.from(existingAssignments.values()).map(
      (inst) => inst.id,
    );
    return this.instruments.filter((inst) => !assignedIds.includes(inst.id));
  }

  /**
   * Calculate required role balances
   */
  private calculateRequiredBalances(
    requirements: Array<{ role: MusicalRole }>,
  ): Record<MusicalRole, number> {
    const balances: Record<MusicalRole, number> = {} as Record<
      MusicalRole,
      number
    >;

    for (const requirement of requirements) {
      balances[requirement.role] = (balances[requirement.role] || 0) + 1;
    }

    return balances;
  }

  /**
   * Find best instrument for a requirement
   */
  private findBestInstrument(
    requirement: any,
    availableInstruments: InstrumentSpec[],
    currentAssignments: InstrumentAssignment[],
    _roleBalances: Record<MusicalRole, number>,
  ): InstrumentAssignment | null {
    const candidates = availableInstruments.filter((inst) =>
      inst.capabilities.roles.includes(requirement.role),
    );

    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates.map((instrument) => {
      let score = 0;
      const reasons: string[] = [];

      // Role suitability
      const roleScore = this.calculateRoleSuitability(
        instrument,
        requirement.role,
      );
      score += roleScore * 0.4;
      if (roleScore > 0.8) reasons.push("Excellent for role");

      // Register match
      const registerScore = this.calculateRegisterMatch(
        instrument.register,
        requirement.register,
      );
      score += registerScore * 0.3;
      if (registerScore > 0.8) reasons.push("Good register match");

      // Energy compatibility
      const energyScore = this.calculateEnergyCompatibility(
        instrument,
        requirement.energy,
      );
      score += energyScore * 0.2;
      if (energyScore > 0.8) reasons.push("Good energy match");

      // Compatibility with other instruments
      const compatibilityScore = this.calculateEnsembleCompatibility(
        instrument,
        currentAssignments,
      );
      score += compatibilityScore * 0.1;
      if (compatibilityScore > 0.8) reasons.push("Good ensemble blend");

      return { instrument, score, reasons };
    });

    // Select best candidate
    const best = scored.reduce((max, current) =>
      current.score > max.score ? current : max,
    );

    // Generate alternatives
    const alternatives = scored
      .filter((s) => s.instrument.id !== best.instrument.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => ({
        instrument: s.instrument,
        confidence: s.score,
      }));

    return {
      layerId: requirement.layerId,
      instrument: best.instrument,
      confidence: best.score,
      reasons: best.reasons,
      alternatives,
    };
  }

  /**
   * Calculate register match score
   */
  private calculateRegisterMatch(
    instrumentRegister: RegisterRange,
    requiredRegister: RegisterRange,
  ): number {
    const overlapStart = Math.max(instrumentRegister.min, requiredRegister.min);
    const overlapEnd = Math.min(instrumentRegister.max, requiredRegister.max);

    if (overlapStart >= overlapEnd) return 0;

    const overlapRange = overlapEnd - overlapStart;
    const requiredRange = requiredRegister.max - requiredRegister.min;

    return overlapRange / requiredRange;
  }

  /**
   * Calculate energy compatibility
   */
  private calculateEnergyCompatibility(
    instrument: InstrumentSpec,
    requiredEnergy: number,
  ): number {
    const dynamicRange =
      instrument.characteristics.dynamicRange[1] -
      instrument.characteristics.dynamicRange[0];
    const instrumentEnergy = dynamicRange / 127; // Normalize to 0-1

    return 1 - Math.abs(instrumentEnergy - requiredEnergy);
  }

  /**
   * Calculate ensemble compatibility
   */
  private calculateEnsembleCompatibility(
    instrument: InstrumentSpec,
    assignments: InstrumentAssignment[],
  ): number {
    if (assignments.length === 0) return 1.0;

    const compatibilities = assignments.map((assignment) => {
      const existingFamily = assignment.instrument.family;
      const newFamily = instrument.family;
      return this.getFamilyCompatibility(existingFamily, newFamily);
    });

    return (
      compatibilities.reduce((sum, comp) => sum + comp, 0) /
      compatibilities.length
    );
  }

  /**
   * Generate cache key for assignments
   */
  private generateAssignmentCacheKey(
    requirements: any[],
    existingAssignments?: Map<string, InstrumentSpec>,
  ): string {
    const reqKey = requirements
      .map((r) => `${r.role}:${r.register.min}-${r.register.max}`)
      .join("|");
    const existingKey = existingAssignments
      ? Array.from(existingAssignments.keys()).sort().join(",")
      : "";
    return `${reqKey}:${existingKey}`;
  }

  /**
   * Resolve register conflicts in assignments
   */
  private resolveRegisterConflicts(assignments: InstrumentAssignment[]): void {
    // Check for excessive register overlap
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const overlap = this.calculateRegisterOverlap(
          assignments[i].instrument.register,
          assignments[j].instrument.register,
        );

        if (overlap > this.constraints.registerOverlap) {
          // Try to find alternative for one of them
          const alternative1 = assignments[i].alternatives.find(
            (alt) =>
              this.calculateRegisterOverlap(
                alt.instrument.register,
                assignments[j].instrument.register,
              ) <= this.constraints.registerOverlap,
          );

          if (alternative1 && alternative1.confidence > 0.5) {
            assignments[i].instrument = alternative1.instrument;
            assignments[i].confidence = Math.min(
              assignments[i].confidence,
              alternative1.confidence,
            );
          }
        }
      }
    }
  }

  /**
   * Balance roles in assignments
   */
  private balanceRoles(_assignments: InstrumentAssignment[]): void {
    const currentRoles: Record<MusicalRole, number> = {} as Record<
      MusicalRole,
      number
    >;

    for (const _assignment of _assignments) {
      // This would need the original requirement - simplified here
      const role = "harmony" as MusicalRole; // Placeholder
      currentRoles[role] = (currentRoles[role] || 0) + 1;
    }

    // Apply balancing logic
    // (This is a simplified version - real implementation would be more sophisticated)
  }

  /**
   * Resolve doubling conflicts
   */
  private resolveDoublingConflicts(assignments: InstrumentAssignment[]): void {
    const instrumentCounts: Record<string, number> = {};

    for (const assignment of assignments) {
      const family = assignment.instrument.family;
      instrumentCounts[family] = (instrumentCounts[family] || 0) + 1;
    }

    // Check for excessive doubling
    for (const [family, count] of Object.entries(instrumentCounts)) {
      if (count > this.constraints.doublingTolerance) {
        // Find assignments to modify
        const familyAssignments = assignments.filter(
          (a) => a.instrument.family === family,
        );
        const toModify = familyAssignments.slice(
          this.constraints.doublingTolerance,
        );

        for (const assignment of toModify) {
          // Try to find alternative from different family
          const alternative = assignment.alternatives.find(
            (alt) => alt.instrument.family !== family,
          );
          if (alternative && alternative.confidence > 0.4) {
            assignment.instrument = alternative.instrument;
            assignment.confidence = Math.min(
              assignment.confidence,
              alternative.confidence,
            );
          }
        }
      }
    }
  }

  /**
   * Optimize density
   */
  private optimizeDensity(assignments: InstrumentAssignment[]): void {
    if (assignments.length > this.constraints.densityLimit) {
      // Remove least important assignments
      assignments.sort((a, b) => b.confidence - a.confidence);
      assignments.splice(this.constraints.densityLimit);
    }
  }

  // Orchestration suggestion methods

  private generateClassicalOrchestration(
    context: any,
    layerCount: number,
  ): any {
    // Classical orchestration implementation
    return {
      description: "Classical orchestra with strings, woodwinds, and brass",
      instruments: this.instruments
        .filter((inst) =>
          ["strings", "woodwinds", "brass"].includes(inst.family),
        )
        .slice(0, layerCount),
      suitability: 0.8,
      reasons: ["Balanced timbre", "Traditional orchestration", "Good blend"],
    };
  }

  private generateModernOrchestration(context: any, layerCount: number): any {
    // Modern orchestration implementation
    return {
      description:
        "Modern ensemble with expanded percussion and electronic elements",
      instruments: this.instruments
        .filter((inst) =>
          [
            "strings",
            "woodwinds",
            "brass",
            "percussion",
            "electronic",
          ].includes(inst.family),
        )
        .slice(0, layerCount),
      suitability: 0.7,
      reasons: ["Contemporary sound", "Wide dynamic range", "Textural variety"],
    };
  }

  private generateChamberOrchestration(context: any, layerCount: number): any {
    // Chamber orchestration implementation
    return {
      description: "Chamber ensemble with intimate scoring",
      instruments: this.instruments
        .filter((inst) => ["strings", "woodwinds"].includes(inst.family))
        .slice(0, Math.min(layerCount, 8)),
      suitability: 0.9,
      reasons: ["Intimate sound", "Clear textures", "Flexible scoring"],
    };
  }

  private generateElectronicOrchestration(
    context: any,
    layerCount: number,
  ): any {
    // Electronic orchestration implementation
    return {
      description: "Electronic ensemble with synthesizers and processed sounds",
      instruments: this.instruments
        .filter((inst) => ["electronic", "keyboard"].includes(inst.family))
        .slice(0, layerCount),
      suitability: 0.6,
      reasons: ["Modern sound", "Unlimited timbral options", "Precise control"],
    };
  }

  private generateMixedOrchestration(context: any, layerCount: number): any {
    // Mixed orchestration implementation
    return {
      description: "Mixed ensemble combining acoustic and electronic elements",
      instruments: this.instruments.slice(0, layerCount),
      suitability: 0.8,
      reasons: [
        "Versatile sound",
        "Wide expressive range",
        "Contemporary appeal",
      ],
    };
  }
}
