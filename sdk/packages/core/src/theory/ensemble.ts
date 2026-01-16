/**
 * Schillinger SDK 2.1 - Ensemble Model
 *
 * Implementation of EnsembleModel_v1 with voice definitions, role pools,
 * groups, and balance rules for structural ensemble management.
 */

import type {
  EnsembleModel,
  Voice,
  VoiceGroup,
  RolePool,
  BalanceRules,
  RoleType,
  FunctionalClass,
  UUID,
} from "../types";

// =============================================================================
// ENSEMBLE MODEL CLASS
// =============================================================================

/**
 * Ensemble class - manages voice configuration for song generation
 *
 * Ensemble is STRUCTURAL, not musical authority:
 * - Defines what voices exist
 * - Defines role assignments (primary/secondary/tertiary)
 * - Defines functional classes (foundation/motion/ornament/reinforcement)
 * - Does NOT generate musical content
 */
export class Ensemble {
  private voices: Map<UUID, Voice> = new Map();
  private groups: Map<UUID, VoiceGroup> = new Map();
  private balanceRules?: BalanceRules;

  constructor(config: Omit<EnsembleModel, "voiceCount">) {
    // Validate version
    if (config.version !== "1.0") {
      throw new Error(`Invalid ensemble version: ${config.version}`);
    }

    // Set balance rules (mapped from balanceRules property)
    this.balanceRules = config.balanceRules;

    // Add voices
    for (const voice of config.voices) {
      this.addVoice(voice);
    }

    // Add groups
    if (config.groups) {
      for (const group of config.groups) {
        this.addGroup(group);
      }
    }

    // Validate voice count
    const voiceCount = this.voices.size;
    if (voiceCount < 1 || voiceCount > 100) {
      throw new Error(`Voice count must be 1-100, got ${voiceCount}`);
    }
  }

  /**
   * Get ensemble model for serialization
   */
  getModel(): EnsembleModel {
    return {
      version: "1.0",
      id: this.getId(),
      voices: Array.from(this.voices.values()),
      voiceCount: this.voices.size,
      groups: Array.from(this.groups.values()),
      balanceRules: this.balanceRules,
    };
  }

  /**
   * Get ensemble ID
   */
  getId(): UUID {
    // Use first voice ID as ensemble ID (convention)
    const firstVoice = Array.from(this.voices.values())[0];
    return firstVoice ? firstVoice.id : this.generateUUID();
  }

  /**
   * Get all voices
   */
  getVoices(): Voice[] {
    return Array.from(this.voices.values());
  }

  /**
   * Get voice by ID
   */
  getVoice(id: UUID): Voice | undefined {
    return this.voices.get(id);
  }

  /**
   * Add a voice to the ensemble
   */
  addVoice(voice: Voice): void {
    // Validate voice count limit
    if (this.voices.size >= 100) {
      throw new Error("Cannot add voice: maximum 100 voices reached");
    }

    // Validate voice
    this.validateVoice(voice);

    // Check for duplicate ID
    if (this.voices.has(voice.id)) {
      throw new Error(`Voice with ID ${voice.id} already exists`);
    }

    this.voices.set(voice.id, voice);
  }

  /**
   * Remove a voice from the ensemble
   */
  removeVoice(id: UUID): void {
    if (!this.voices.has(id)) {
      throw new Error(`Voice ${id} not found`);
    }

    // Check if this would leave ensemble empty
    if (this.voices.size === 1) {
      throw new Error("Cannot remove last voice: ensemble must have at least 1 voice");
    }

    // Remove from all groups
    for (const group of this.groups.values()) {
      group.voiceIds = group.voiceIds.filter((vid: UUID) => vid !== id);
    }

    this.voices.delete(id);
  }

  /**
   * Get all groups
   */
  getGroups(): VoiceGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get group by ID
   */
  getGroup(id: UUID): VoiceGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * Add a voice group
   */
  addGroup(group: VoiceGroup): void {
    // Validate group
    this.validateGroup(group);

    // Check for duplicate ID
    if (this.groups.has(group.id)) {
      throw new Error(`Group with ID ${group.id} already exists`);
    }

    // Verify all voice IDs exist
    for (const voiceId of group.voiceIds) {
      if (!this.voices.has(voiceId)) {
        throw new Error(`Group references undefined voice ${voiceId}`);
      }
    }

    this.groups.set(group.id, { ...group });
  }

  /**
   * Remove a voice group
   */
  removeGroup(id: UUID): void {
    if (!this.groups.has(id)) {
      throw new Error(`Group ${id} not found`);
    }

    this.groups.delete(id);
  }

  /**
   * Get balance rules
   */
  getBalanceRules(): BalanceRules | undefined {
    return this.balanceRules;
  }

  /**
   * Set balance rules
   */
  setBalanceRules(rules: BalanceRules): void {
    this.validateBalanceRules(rules);
    this.balanceRules = rules;
  }

  /**
   * Get voices by role
   */
  getVoicesByRole(role: RoleType): Voice[] {
    return this.getVoices().filter((voice: Voice) =>
      voice.rolePools.some((pool: RolePool) => pool.role === role && pool.enabled)
    );
  }

  /**
   * Get voices by functional class
   */
  getVoicesByFunctionalClass(functionalClass: FunctionalClass): Voice[] {
    return this.getVoices().filter((voice: Voice) =>
      voice.rolePools.some(
        (pool: RolePool) => pool.functionalClass === functionalClass && pool.enabled
      )
    );
  }

  /**
   * Get voices matching both role and functional class
   */
  getVoicesByRoleAndClass(role: RoleType, functionalClass: FunctionalClass): Voice[] {
    return this.getVoices().filter((voice: Voice) =>
      voice.rolePools.some(
        (pool: RolePool) =>
          pool.role === role && pool.functionalClass === functionalClass && pool.enabled
      )
    );
  }

  /**
   * Validate voice configuration
   */
  private validateVoice(voice: Voice): void {
    if (!voice.id || voice.id.trim() === "") {
      throw new Error("Voice must have a valid ID");
    }

    if (!voice.name || voice.name.trim() === "") {
      throw new Error("Voice must have a valid name");
    }

    if (!Array.isArray(voice.rolePools) || voice.rolePools.length === 0) {
      throw new Error("Voice must have at least one role pool");
    }

    // Validate role pools
    for (const pool of voice.rolePools) {
      this.validateRolePool(pool);
    }

    // Validate group IDs
    if (voice.groupIds) {
      for (const groupId of voice.groupIds) {
        if (!this.groups.has(groupId)) {
          throw new Error(`Voice references undefined group ${groupId}`);
        }
      }
    }
  }

  /**
   * Validate role pool
   */
  private validateRolePool(pool: RolePool): void {
    const validRoles: RoleType[] = ["primary", "secondary", "tertiary"];
    const validClasses: FunctionalClass[] = ["foundation", "motion", "ornament", "reinforcement"];

    if (!validRoles.includes(pool.role)) {
      throw new Error(`Invalid role: ${pool.role}`);
    }

    if (!validClasses.includes(pool.functionalClass)) {
      throw new Error(`Invalid functional class: ${pool.functionalClass}`);
    }

    if (typeof pool.enabled !== "boolean") {
      throw new Error("Role pool enabled must be a boolean");
    }
  }

  /**
   * Validate voice group
   */
  private validateGroup(group: VoiceGroup): void {
    if (!group.id || group.id.trim() === "") {
      throw new Error("Group must have a valid ID");
    }

    if (!group.name || group.name.trim() === "") {
      throw new Error("Group must have a valid name");
    }

    if (!Array.isArray(group.voiceIds)) {
      throw new Error("Group voiceIds must be an array");
    }
  }

  /**
   * Validate balance rules
   */
  private validateBalanceRules(rules: BalanceRules): void {
    if (rules.priority) {
      if (!Array.isArray(rules.priority)) {
        throw new Error("Balance priority must be an array");
      }
    }

    if (rules.limits) {
      const { maxVoices, maxPolyphony } = rules.limits;

      if (typeof maxVoices !== "number" || maxVoices < 1 || maxVoices > 100) {
        throw new Error("maxVoices must be between 1 and 100");
      }

      if (typeof maxPolyphony !== "number" || maxPolyphony < 1 || maxPolyphony > 200) {
        throw new Error("maxPolyphony must be between 1 and 200");
      }
    }
  }

  /**
   * Generate UUID (v4)
   */
  private generateUUID(): UUID {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as UUID;
  }
}

// =============================================================================
// ENSEMBLE BUILDER
// =============================================================================

/**
 * Builder class for creating Ensemble models
 */
export class EnsembleBuilder {
  private voices: Voice[] = [];
  private groups: VoiceGroup[] = [];
  private balanceRules?: BalanceRules;

  /**
   * Add a voice to the ensemble
   */
  addVoice(config: {
    name: string;
    rolePools: Array<{
      role: RoleType;
      functionalClass: FunctionalClass;
      enabled?: boolean;
    }>;
    groupIds?: UUID[];
  }): EnsembleBuilder {
    const voice: Voice = {
      id: this.generateUUID(),
      name: config.name,
      rolePools: config.rolePools.map((pool) => ({
        ...pool,
        enabled: pool.enabled ?? true,
      })),
      groupIds: config.groupIds ?? [],
    };

    this.voices.push(voice);
    return this;
  }

  /**
   * Add a voice group
   */
  addGroup(config: { name: string; voiceIds?: UUID[] }): EnsembleBuilder {
    const group: VoiceGroup = {
      id: this.generateUUID(),
      name: config.name,
      voiceIds: config.voiceIds ?? [],
    };

    this.groups.push(group);
    return this;
  }

  /**
   * Set balance rules
   */
  setBalanceRules(rules: BalanceRules): EnsembleBuilder {
    this.balanceRules = rules;
    return this;
  }

  /**
   * Build the ensemble
   */
  build(): Ensemble {
    if (this.voices.length === 0) {
      throw new Error("Ensemble must have at least one voice");
    }

    if (this.voices.length > 100) {
      throw new Error("Ensemble cannot have more than 100 voices");
    }

    return new Ensemble({
      version: "1.0",
      id: this.generateUUID(),
      voices: this.voices,
      groups: this.groups.length > 0 ? this.groups : undefined,
      balanceRules: this.balanceRules,
    });
  }

  /**
   * Generate UUID (v4)
   */
  private generateUUID(): UUID {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as UUID;
  }
}

// =============================================================================
// PRESET ENSEMBLES
// =============================================================================

/**
 * Create a minimal ensemble (1 voice)
 */
export function createMinimalEnsemble(): Ensemble {
  return new EnsembleBuilder()
    .addVoice({
      name: "Voice 1",
      rolePools: [{ role: "primary", functionalClass: "foundation" }],
    })
    .build();
}

/**
 * Create a trio ensemble (3 voices)
 */
export function createTrioEnsemble(): Ensemble {
  return new EnsembleBuilder()
    .addVoice({
      name: "Primary",
      rolePools: [
        { role: "primary", functionalClass: "foundation" },
        { role: "secondary", functionalClass: "motion" },
      ],
    })
    .addVoice({
      name: "Secondary",
      rolePools: [
        { role: "secondary", functionalClass: "foundation" },
        { role: "tertiary", functionalClass: "ornament" },
      ],
    })
    .addVoice({
      name: "Foundation",
      rolePools: [{ role: "tertiary", functionalClass: "foundation" }],
    })
    .setBalanceRules({
      limits: { maxVoices: 3, maxPolyphony: 12 },
    })
    .build();
}

/**
 * Create a full ensemble (8 voices)
 */
export function createFullEnsemble(): Ensemble {
  const builder = new EnsembleBuilder();

  // Add all 8 voices
  for (let i = 0; i < 8; i++) {
    builder.addVoice({
      name: `Voice ${i + 1}`,
      rolePools: [{ role: "primary", functionalClass: "foundation" }],
    });
  }

  // Build first to get generated voice IDs
  const ensemble = builder
    .addGroup({
      name: "Leads",
      voiceIds: [],
    })
    .addGroup({
      name: "Harmony",
      voiceIds: [],
    })
    .setBalanceRules({
      priority: [],
      limits: { maxVoices: 8, maxPolyphony: 32 },
    })
    .build();

  // Get actual voice IDs and set priority
  const voiceIds = ensemble.getVoices().map((v) => v.id);
  const model = ensemble.getModel();

  // Create new ensemble with priority set
  return new Ensemble({
    ...model,
    balanceRules: {
      ...model.balanceRules,
      priority: voiceIds, // Set priority with actual voice IDs
    },
  });
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate ensemble model
 */
export function validateEnsembleModel(model: EnsembleModel): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Version check
  if (model.version !== "1.0") {
    errors.push(`Invalid version: ${model.version}`);
  }

  // Voice count
  if (model.voiceCount < 1 || model.voiceCount > 100) {
    errors.push(`Voice count out of range: ${model.voiceCount} (must be 1-100)`);
  }

  if (model.voices.length !== model.voiceCount) {
    errors.push(
      `Voice count mismatch: ${model.voices.length} voices vs ${model.voiceCount} specified`
    );
  }

  // Validate voices
  const voiceIds = new Set<UUID>();
  for (const voice of model.voices) {
    const voiceErrors = validateVoice(voice);
    errors.push(...voiceErrors);

    if (voiceIds.has(voice.id)) {
      errors.push(`Duplicate voice ID: ${voice.id}`);
    }
    voiceIds.add(voice.id);
  }

  // Validate groups
  if (model.groups) {
    for (const group of model.groups) {
      const groupErrors = validateVoiceGroup(group, voiceIds);
      errors.push(...groupErrors);
    }
  }

  // Validate balance rules
  if (model.balanceRules) {
    const balanceErrors = validateBalanceRules(model.balanceRules);
    errors.push(...balanceErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate voice
 */
function validateVoice(voice: Voice): string[] {
  const errors: string[] = [];

  if (!voice.id || voice.id.trim() === "") {
    errors.push("Voice missing ID");
  }

  if (!voice.name || voice.name.trim() === "") {
    errors.push(`Voice ${voice.id}: missing name`);
  }

  if (!Array.isArray(voice.rolePools) || voice.rolePools.length === 0) {
    errors.push(`Voice ${voice.id}: must have at least one role pool`);
  }

  for (const pool of voice.rolePools) {
    errors.push(...validateRolePool(pool, voice.id));
  }

  if (voice.groupIds) {
    for (const groupId of voice.groupIds) {
      if (!groupId || groupId.trim() === "") {
        errors.push(`Voice ${voice.id}: invalid group ID`);
      }
    }
  }

  return errors;
}

/**
 * Validate role pool
 */
function validateRolePool(pool: RolePool, voiceId: string): string[] {
  const errors: string[] = [];

  const validRoles: RoleType[] = ["primary", "secondary", "tertiary"];
  const validClasses: FunctionalClass[] = ["foundation", "motion", "ornament", "reinforcement"];

  if (!validRoles.includes(pool.role)) {
    errors.push(`Voice ${voiceId}: invalid role "${pool.role}"`);
  }

  if (!validClasses.includes(pool.functionalClass)) {
    errors.push(`Voice ${voiceId}: invalid functional class "${pool.functionalClass}"`);
  }

  if (typeof pool.enabled !== "boolean") {
    errors.push(`Voice ${voiceId}: role pool enabled must be boolean`);
  }

  return errors;
}

/**
 * Validate voice group
 */
function validateVoiceGroup(group: VoiceGroup, voiceIds: Set<UUID>): string[] {
  const errors: string[] = [];

  if (!group.id || group.id.trim() === "") {
    errors.push(`Group missing ID`);
  }

  if (!group.name || group.name.trim() === "") {
    errors.push(`Group ${group.id}: missing name`);
  }

  if (!Array.isArray(group.voiceIds)) {
    errors.push(`Group ${group.id}: voiceIds must be an array`);
    return errors;
  }

  for (const voiceId of group.voiceIds) {
    if (!voiceIds.has(voiceId)) {
      errors.push(`Group ${group.id}: references undefined voice ${voiceId}`);
    }
  }

  return errors;
}

/**
 * Validate balance rules
 */
function validateBalanceRules(rules: BalanceRules): string[] {
  const errors: string[] = [];

  if (rules.priority) {
    if (!Array.isArray(rules.priority)) {
      errors.push("Balance priority must be an array");
    }
  }

  if (rules.limits) {
    const { maxVoices, maxPolyphony } = rules.limits;

    if (typeof maxVoices !== "number" || maxVoices < 1 || maxVoices > 100) {
      errors.push(`maxVoices must be 1-100, got ${maxVoices}`);
    }

    if (typeof maxPolyphony !== "number" || maxPolyphony < 1 || maxPolyphony > 200) {
      errors.push(`maxPolyphony must be 1-200, got ${maxPolyphony}`);
    }
  }

  return errors;
}
