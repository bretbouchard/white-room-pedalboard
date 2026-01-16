/**
 * Ensemble Realizer - Derive RealizedEnsemble from SchillingerSong
 *
 * This module transforms user-authored ensemble intent (SchillingerSong.ensembleModel)
 * into execution identity (RealizedEnsembleModel_v1) with stable IDs for binding.
 *
 * Process:
 * 1. Resolve role-to-system bindings
 * 2. Determine required voices per role
 * 3. Calculate voice specs (range, density, articulation)
 * 4. Determine orchestration (register, doubling)
 * 5. Assign stable IDs based on musical identity
 * 6. Trace sources back to theory systems
 *
 * @module realization/ensemble-realizer
 */

import type { SchillingerSong_v1, Role } from "../types/definitions";
import type { MusicalFunction } from "../utils/stable-id";

import { generateMemberId, generateOrchestrationKey, generateEnsembleId } from "../utils/stable-id";

// =============================================================================
// REALIZED ENSEMBLE TYPES
// =============================================================================

/**
 * RealizedEnsembleModel_v1 - Ensemble with stable IDs
 *
 * Result of ensemble realization with deterministic member IDs
 * based on musical identity (role, function, orchestration).
 */
export interface RealizedEnsembleModel_v1 {
  readonly version: "1.0";
  readonly ensembleId: string;
  members: RealizedEnsembleMember[];
}

/**
 * RealizedEnsembleMember - Single ensemble member
 */
export interface RealizedEnsembleMember {
  readonly id: string;
  readonly function: MusicalFunction;
  voiceSpec: VoiceSpec;
  orchestration: OrchestrationSpec;
  source: EnsembleSource;
}

/**
 * VoiceSpec - Voice specification
 */
export interface VoiceSpec {
  pitchRange: {
    min: number;
    max: number;
  };
  density: "sparse" | "medium" | "dense";
  articulation: "legato" | "staccato" | "mixed";
  polyphony: number;
}

/**
 * OrchestrationSpec - Orchestration specification
 */
export interface OrchestrationSpec {
  register: "low" | "mid" | "high";
  doubling: number;
  spatialHint?: "mono" | "wide" | "cluster";
}

/**
 * EnsembleSource - Source traceability
 */
export interface EnsembleSource {
  rhythmSystemIds: string[];
  melodySystemIds: string[];
  harmonySystemIds: string[];
  formSectionIds: string[];
}

// =============================================================================
// RESOLVED BINDING TYPES
// =============================================================================

/**
 * RoleBinding - Consolidated binding data for a single role
 *
 * Combines all rhythm, melody, and harmony bindings for a role
 * into a single structure for ensemble realization.
 */
export interface RoleBinding {
  /** Role ID from orchestration system */
  roleId: string;

  /** Rhythm systems bound to this role */
  rhythmSystems: Array<{
    systemId: string;
    bindingId: string;
    priority: number;
  }>;

  /** Melody systems bound to this role */
  melodySystems?: Array<{
    systemId: string;
    bindingId: string;
    priority: number;
  }>;

  /** Harmony systems bound to this role */
  harmonySystems?: Array<{
    systemId: string;
    bindingId: string;
    priority: number;
  }>;

  /** Rhythmic authority (0-1) from bound systems */
  rhythmAuthority: number;

  /** Voice IDs from ensemble model */
  voiceIds: string[];
}

/**
 * BindingResolution - Complete binding resolution for all roles
 *
 * Maps all roles to their bound systems and voices.
 */
export interface BindingResolution {
  /** Map of role ID → binding data */
  roles: Map<string, RoleBinding>;
}

// =============================================================================
// ENSEMBLE REALIZATION
// =============================================================================

/**
 * Realize ensemble from SchillingerSong and bindings
 *
 * This is the main entry point for ensemble realization. It:
 * - Resolves all bindings
 * - Determines voice count per role
 * - Generates stable member IDs
 * - Traces sources back to theory systems
 *
 * @param song - Source SchillingerSong (theory layer)
 * @param bindings - Resolved bindings
 * @param seed - Random seed for deterministic output
 * @returns Realized ensemble with stable IDs
 *
 * @example
 * ```typescript
 * const song = createTestSong();
 * const bindings = resolveBindings(song);
 * const ensemble = realizeEnsemble(song, bindings, 12345);
 *
 * console.log(ensemble.ensembleId); // "ensemble_a7b3c9d2"
 * console.log(ensemble.members.length); // Number of voices
 * console.log(ensemble.members[0].id); // "member_3a7f2c9e" (stable)
 * ```
 */
export function realizeEnsemble(
  song: SchillingerSong_v1,
  bindings: BindingResolution,
  seed: number
): RealizedEnsembleModel_v1 {
  const members: RealizedEnsembleMember[] = [];

  // For each role in bindings
  for (const [roleId, roleBinding] of bindings.roles) {
    // Determine how many voices this role needs
    const voiceCount = calculateRequiredVoices(roleBinding, song);

    // For each voice
    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const member = realizeMember(song, roleId, voiceIndex, roleBinding, seed);
      members.push(member);
    }
  }

  return {
    version: "1.0",
    ensembleId: generateEnsembleId(song.songId, seed),
    members,
  };
}

// =============================================================================
// MEMBER REALIZATION
// =============================================================================

/**
 * Realize a single ensemble member
 *
 * Generates all required data for a single voice:
 * - Musical function
 * - Voice specification (range, density, articulation, polyphony)
 * - Orchestration (register, doubling, spatial)
 * - Source traceability
 * - Stable ID
 *
 * @param song - Source song
 * @param roleId - Role ID to realize
 * @param voiceIndex - Voice index for disambiguation
 * @param binding - Role binding data
 * @param seed - Realization seed
 * @returns Realized ensemble member
 *
 * @internal
 */
function realizeMember(
  song: SchillingerSong_v1,
  roleId: string,
  voiceIndex: number,
  binding: RoleBinding,
  seed: number
): RealizedEnsembleMember {
  // 1. Get role definition
  const role = song.bookV_orchestration.roles.find((r) => r.roleId === roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  // 2. Determine musical function
  const fn = inferMusicalFunction(role);

  // 3. Calculate voice spec
  const voiceSpec = calculateVoiceSpec(role, binding, song);

  // 4. Determine orchestration
  const orchestration = calculateOrchestration(role, voiceIndex, binding, song);

  // 5. Trace sources
  const source = traceSources(binding);

  // 6. Generate stable ID
  const id = generateMemberId(seed, {
    roleId,
    function: fn,
    voiceIndex,
    orchestrationKey: generateOrchestrationKey(
      orchestration.register,
      orchestration.doubling,
      orchestration.spatialHint
    ),
  });

  return {
    id,
    function: fn,
    voiceSpec,
    orchestration,
    source,
  };
}

// =============================================================================
// MUSICAL FUNCTION INFERENCE
// =============================================================================

/**
 * Infer musical function from role definition
 *
 * Maps role functionalClass to MusicalFunction:
 * - foundation → "foundation"
 * - motion → "motion"
 * - ornament → "ornament"
 * - reinforcement → "texture"
 * - (fallback) → "voice"
 *
 * @param role - Role definition
 * @returns Musical function
 *
 * @internal
 */
function inferMusicalFunction(role: Role): MusicalFunction {
  switch (role.functionalClass) {
    case "foundation":
      return "foundation";
    case "motion":
      return "motion";
    case "ornament":
      return "ornament";
    case "reinforcement":
      return "texture";
    default:
      return "voice";
  }
}

// =============================================================================
// VOICE SPEC CALCULATION
// =============================================================================

/**
 * Calculate voice specification from role and bindings
 *
 * Determines:
 * - Pitch range (from register system)
 * - Density (from rhythm authority)
 * - Articulation (from role defaults)
 * - Polyphony (from role affinity)
 *
 * @param role - Role definition
 * @param binding - Role binding data
 * @param song - Source song
 * @returns Voice specification
 *
 * @internal
 */
function calculateVoiceSpec(role: Role, binding: RoleBinding, song: SchillingerSong_v1): VoiceSpec {
  // Get register from orchestration system
  const registerEntry = song.bookV_orchestration.registerSystem.roleRegisters.find(
    (r) => r.roleId === role.roleId
  );

  // Pitch range from register or defaults
  const pitchRange = {
    min: registerEntry?.minPitch ?? 36, // Default C2
    max: registerEntry?.maxPitch ?? 84, // Default C6
  };

  // Density from rhythmic authority
  const density = inferDensity(binding.rhythmAuthority);

  // Articulation from role name (simple heuristic)
  const articulation = inferArticulation(role);

  // Polyphony - default to 1 (monophonic)
  // TODO: Could be enhanced with orchestration affinity data
  const polyphony = 1;

  return {
    pitchRange,
    density,
    articulation,
    polyphony,
  };
}

/**
 * Infer density from rhythmic authority
 *
 * Maps 0-1 authority value to density categories:
 * - 0.0 - 0.33 → sparse
 * - 0.33 - 0.67 → medium
 * - 0.67 - 1.0 → dense
 *
 * @param authority - Rhythmic authority (0-1)
 * @returns Density category
 *
 * @internal
 */
function inferDensity(authority: number): "sparse" | "medium" | "dense" {
  if (authority < 0.33) return "sparse";
  if (authority < 0.67) return "medium";
  return "dense";
}

/**
 * Infer articulation from role
 *
 * Simple heuristic based on role name:
 * - Bass roles → legato (continuous foundation)
 * - Percussion roles → staccato (short, detached)
 * - Everything else → mixed
 *
 * @param role - Role definition
 * @returns Articulation style
 *
 * @internal
 */
function inferArticulation(role: Role): "legato" | "staccato" | "mixed" {
  const roleName = role.roleName.toLowerCase();

  if (roleName.includes("bass") || roleName.includes("pad")) {
    return "legato";
  }

  if (roleName.includes("drum") || roleName.includes("percussion")) {
    return "staccato";
  }

  return "mixed";
}

// =============================================================================
// ORCHESTRATION CALCULATION
// =============================================================================

/**
 * Calculate orchestration specification
 *
 * Determines:
 * - Register (low/mid/high) from pitch range
 * - Doubling (currently always 1)
 * - Spatial hint (optional, currently omitted)
 *
 * @param role - Role definition
 * @param voiceIndex - Voice index
 * @param binding - Role binding data
 * @param song - Source song
 * @returns Orchestration specification
 *
 * @internal
 */
function calculateOrchestration(
  role: Role,
  _voiceIndex: number,
  _binding: RoleBinding,
  song: SchillingerSong_v1
): OrchestrationSpec {
  // Get register from orchestration system
  const registerEntry = song.bookV_orchestration.registerSystem.roleRegisters.find(
    (r) => r.roleId === role.roleId
  );

  // Determine register from pitch range
  const minPitch = registerEntry?.minPitch ?? 36;
  const maxPitch = registerEntry?.maxPitch ?? 84;
  const register = inferRegister(minPitch, maxPitch);

  // Doubling - currently always 1 (no doubling implemented)
  // TODO: Integrate with DoublingRule system from Book V
  const doubling = 1;

  // Spatial hint - optional, not currently implemented
  // TODO: Integrate with spatial system if available
  const spatialHint: "mono" | "wide" | "cluster" | undefined = undefined;

  return {
    register,
    doubling,
    spatialHint,
  };
}

/**
 * Infer register from pitch range
 *
 * Maps MIDI note ranges to register classifications:
 * - 0 - 47 → low (bass)
 * - 48 - 83 → mid (middle)
 * - 84 - 127 → high (treble)
 *
 * @param minPitch - Minimum MIDI note
 * @param maxPitch - Maximum MIDI note
 * @returns Register classification
 *
 * @internal
 */
function inferRegister(minPitch: number, maxPitch: number): "low" | "mid" | "high" {
  // Use center of range
  const center = (minPitch + maxPitch) / 2;

  if (center < 48) return "low";
  if (center < 84) return "mid";
  return "high";
}

// =============================================================================
// SOURCE TRACEABILITY
// =============================================================================

/**
 * Trace sources back to theory systems
 *
 * Records which systems from each Book produced this member.
 * Enables round-trip editing and reconciliation.
 *
 * @param binding - Role binding data
 * @returns Source traceability
 *
 * @internal
 */
function traceSources(binding: RoleBinding): EnsembleSource {
  return {
    rhythmSystemIds: binding.rhythmSystems.map((s) => s.systemId),
    melodySystemIds: binding.melodySystems?.map((s) => s.systemId) || [],
    harmonySystemIds: binding.harmonySystems?.map((s) => s.systemId) || [],
    formSectionIds: [], // TODO: Add form section tracking
  };
}

// =============================================================================
// VOICE COUNT CALCULATION
// =============================================================================

/**
 * Calculate required voices for a role
 *
 * Determines how many voices a role needs based on:
 * - Harmony bindings (multiple voices for chords)
 * - Explicit voice assignments
 * - Role defaults
 *
 * @param binding - Role binding data
 * @param song - Source song
 * @returns Required voice count
 *
 * @internal
 */
function calculateRequiredVoices(binding: RoleBinding, _song: SchillingerSong_v1): number {
  // If binding has explicit voice IDs, use those
  if (binding.voiceIds.length > 0) {
    return binding.voiceIds.length;
  }

  // If role has harmony bindings, might need multiple voices
  // TODO: More sophisticated calculation based on harmony system requirements
  if (binding.harmonySystems && binding.harmonySystems.length > 0) {
    return 1; // Start with 1, could be expanded based on harmony needs
  }

  // Default: 1 voice per role
  return 1;
}

// =============================================================================
// BINDING RESOLUTION
// =============================================================================

/**
 * Resolve bindings from SchillingerSong
 *
 * Converts raw binding data into a consolidated structure
 * that's easier to work with during ensemble realization.
 *
 * @param song - Source song
 * @returns Resolved bindings
 *
 * @example
 * ```typescript
 * const song = createTestSong();
 * const bindings = resolveBindings(song);
 *
 * for (const [roleId, roleBinding] of bindings.roles) {
 *   console.log(`Role ${roleId} has ${roleBinding.rhythmSystems.length} rhythm systems`);
 * }
 * ```
 */
export function resolveBindings(song: SchillingerSong_v1): BindingResolution {
  const roles = new Map<string, RoleBinding>();

  // Initialize roles from orchestration system
  for (const role of song.bookV_orchestration.roles) {
    roles.set(role.roleId, {
      roleId: role.roleId,
      rhythmSystems: [],
      melodySystems: [],
      harmonySystems: [],
      rhythmAuthority: 0.5, // Default authority
      voiceIds: [],
    });
  }

  // Process rhythm bindings
  for (const binding of song.bindings.roleRhythmBindings) {
    const roleBinding = roles.get(binding.roleId);
    if (roleBinding) {
      roleBinding.rhythmSystems.push({
        systemId: binding.rhythmSystemId,
        bindingId: binding.bindingId,
        priority: binding.priority,
      });
    }
  }

  // Process melody bindings
  for (const binding of song.bindings.roleMelodyBindings) {
    const roleBinding = roles.get(binding.roleId);
    if (roleBinding) {
      if (!roleBinding.melodySystems) {
        roleBinding.melodySystems = [];
      }
      roleBinding.melodySystems.push({
        systemId: binding.melodySystemId,
        bindingId: binding.bindingId,
        priority: binding.priority,
      });
    }
  }

  // Process harmony bindings
  for (const binding of song.bindings.roleHarmonyBindings) {
    const roleBinding = roles.get(binding.roleId);
    if (roleBinding) {
      if (!roleBinding.harmonySystems) {
        roleBinding.harmonySystems = [];
      }
      roleBinding.harmonySystems.push({
        systemId: binding.harmonySystemId,
        bindingId: binding.bindingId,
        priority: binding.priority,
      });

      // Harmony bindings have multiple voiceIds
      roleBinding.voiceIds.push(...binding.voiceIds);
    }
  }

  // Process ensemble bindings
  for (const binding of song.bindings.roleEnsembleBindings) {
    const roleBinding = roles.get(binding.roleId);
    if (roleBinding) {
      roleBinding.voiceIds.push(binding.voiceId);
    }
  }

  return { roles };
}
