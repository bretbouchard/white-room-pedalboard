/**
 * Stable ID Generation for Ensemble Members
 *
 * Generates deterministic, content-based IDs for ensemble members that:
 * - Remain stable across regenerations (same seed + same musical identity)
 * - Change when musical identity changes
 * - Are collision-resistant (different identities → different IDs)
 *
 * @module utils/stable-id
 */

/**
 * Musical function - semantic role of an ensemble member
 *
 * Maps to Role.functionalClass from Book V orchestration:
 * - foundation → harmonic/rhythmic foundation
 * - motion → melodic/contrapuntal motion
 * - ornament → decorative/embellishment material
 * - texture → reinforcement/doubling material
 * - voice → fallback for unclassified roles
 */
export type MusicalFunction = "foundation" | "motion" | "ornament" | "texture" | "voice";

// =============================================================================
// MEMBER FINGERPRINT
// =============================================================================

/**
 * MemberFingerprint - Unique identity of an ensemble member
 *
 * This fingerprint captures the essential musical identity that should
 * cause an ID to change if any of these fields differ.
 */
export interface MemberFingerprint {
  /** Role ID from SchillingerSong orchestration */
  roleId: string;

  /** Musical function (semantic role) */
  function: MusicalFunction;

  /** Voice index (for multiple voices with same role/function) */
  voiceIndex: number;

  /** Orchestration key (register, doubling, etc.) */
  orchestrationKey: string;
}

// =============================================================================
// STABLE ID GENERATION
// =============================================================================

/**
 * Generate a stable, deterministic ID for an ensemble member
 *
 * The ID is a content-based hash that:
 * - Same seed + same fingerprint → same ID (deterministic)
 * - Different fingerprint → different ID (collision-resistant)
 * - Fast to compute, short to store
 *
 * @param seed - Random seed for realization
 * @param memberIdentity - Member fingerprint (role, function, index, orchestration)
 * @returns Stable member ID in format `member_[a-f0-9]{8}`
 *
 * @example
 * ```typescript
 * const id1 = generateMemberId(12345, {
 *   roleId: 'bass',
 *   function: 'foundation',
 *   voiceIndex: 0,
 *   orchestrationKey: 'low_1'
 * });
 * // Returns: "member_3a7f2c9e"
 *
 * // Same seed + same identity → same ID
 * const id2 = generateMemberId(12345, {
 *   roleId: 'bass',
 *   function: 'foundation',
 *   voiceIndex: 0,
 *   orchestrationKey: 'low_1'
 * });
 * // Returns: "member_3a7f2c9e" (same as id1)
 *
 * // Different identity → different ID
 * const id3 = generateMemberId(12345, {
 *   roleId: 'bass',
 *   function: 'foundation',
 *   voiceIndex: 1,  // different voiceIndex
 *   orchestrationKey: 'low_1'
 * });
 * // Returns: "member_7b2e4f1a" (different from id1)
 * ```
 */
export function generateMemberId(seed: number, memberIdentity: MemberFingerprint): string {
  const hash = hashFingerprint(seed, memberIdentity);
  return `member_${hash.slice(0, 8)}`;
}

/**
 * Hash a member fingerprint into a stable hex string
 *
 * Uses a simple but effective hash function that combines:
 * - Seed (for per-realization uniqueness)
 * - Role ID (user-defined identity)
 * - Function (semantic role)
 * - Voice index (disambiguation)
 * - Orchestration key (deployment)
 *
 * @param seed - Random seed
 * @param fingerprint - Member identity
 * @returns Hexadecimal hash string
 *
 * @internal
 */
function hashFingerprint(seed: number, fingerprint: MemberFingerprint): string {
  // Create a deterministic string representation
  const identityString = JSON.stringify({
    seed,
    roleId: fingerprint.roleId,
    function: fingerprint.function,
    voiceIndex: fingerprint.voiceIndex,
    orchestrationKey: fingerprint.orchestrationKey,
  });

  // Simple hash function (djb2 variant)
  let hash = 5381;
  for (let i = 0; i < identityString.length; i++) {
    hash = ((hash << 5) + hash + identityString.charCodeAt(i)) & 0xffffffff;
  }

  // Convert to hex
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// =============================================================================
// IDENTITY COMPARISON
// =============================================================================

/**
 * Compare two ensemble members to determine if they represent the same musical identity
 *
 * Used to preserve IDs across regenerations. If two members have the same
 * fingerprint, they should have the same ID.
 *
 * @param a - First member fingerprint
 * @param b - Second member fingerprint
 * @returns True if both members represent the same musical identity
 *
 * @example
 * ```typescript
 * const identity1: MemberFingerprint = {
 *   roleId: 'bass',
 *   function: 'foundation',
 *   voiceIndex: 0,
 *   orchestrationKey: 'low_1'
 * };
 *
 * const identity2: MemberFingerprint = {
 *   roleId: 'bass',
 *   function: 'foundation',
 *   voiceIndex: 0,
 *   orchestrationKey: 'low_1'
 * };
 *
 * isSameMusicalIdentity(identity1, identity2);
 * // Returns: true (same identity → should preserve ID)
 *
 * const identity3: MemberFingerprint = {
 *   roleId: 'bass',
 *   function: 'motion',  // different function
 *   voiceIndex: 0,
 *   orchestrationKey: 'low_1'
 * };
 *
 * isSameMusicalIdentity(identity1, identity3);
 * // Returns: false (different identity → new ID)
 * ```
 */
export function isSameMusicalIdentity(a: MemberFingerprint, b: MemberFingerprint): boolean {
  return (
    a.roleId === b.roleId &&
    a.function === b.function &&
    a.voiceIndex === b.voiceIndex &&
    a.orchestrationKey === b.orchestrationKey
  );
}

// =============================================================================
// ORCHESTRATION KEY GENERATION
// =============================================================================

/**
 * Generate an orchestration key from orchestration parameters
 *
 * The orchestration key captures deployment details that affect identity:
 * - Register (low/mid/high)
 * - Doubling count
 * - Spatial hint (optional)
 *
 * This ensures that changing orchestration creates a new identity.
 *
 * @param register - Register classification
 * @param doubling - Doubling count
 * @param spatialHint - Optional spatial hint
 * @returns Orchestration key string
 *
 * @example
 * ```typescript
 * generateOrchestrationKey('low', 1, 'mono');
 * // Returns: "low_1_mono"
 *
 * generateOrchestrationKey('mid', 2);
 * // Returns: "mid_2" (no spatial hint)
 * ```
 */
export function generateOrchestrationKey(
  register: "low" | "mid" | "high",
  doubling: number,
  spatialHint?: "mono" | "wide" | "cluster"
): string {
  const parts = [register, doubling.toString()];
  if (spatialHint) {
    parts.push(spatialHint);
  }
  return parts.join("_");
}

// =============================================================================
// UUID GENERATION
// =============================================================================

/**
 * Generate a UUID for ensemble-level identification
 *
 * Unlike member IDs, ensemble IDs are not content-based.
 * They are simple UUIDs that identify a specific realization output.
 *
 * @param songId - Source song ID
 * @param seed - Realization seed
 * @returns UUID string
 *
 * @example
 * ```typescript
 * generateEnsembleId('song_abc123', 54321);
 * // Returns: "ensemble_a7b3c9d2e1f4"
 * ```
 */
export function generateEnsembleId(songId: string, seed: number): string {
  // Simple hash-based UUID generation
  const input = `${songId}_${seed}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) & 0xffffffff;
  }

  // Generate 8-character hex suffix
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `ensemble_${hex}`;
}
