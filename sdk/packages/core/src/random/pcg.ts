/**
 * PCG-Random (Permuted Congruential Generator) Implementation
 *
 * Deterministic PRNG for cross-platform consistency.
 * Based on PCG-XSH-RR 64/32 variant:
 * - 64-bit state
 * - 32-bit output
 * - XOR-shift + random rotation output function
 *
 * Algorithm: http://www.pcg-random.org/pdf/toms-oneill-pcg-random-v1.pdf
 *
 * Ensures bit-for-bit identical results across:
 * - TypeScript (Node.js, browsers)
 * - Dart (mobile, desktop via FFI)
 * - Any platform with IEEE 754 double precision
 */

/**
 * PCG Random Number Generator
 *
 * Implements PCG-XSH-RR 64/32 for deterministic cross-platform results.
 */
export class PCGRandom {
  private state: bigint;
  private increment: bigint;

  /**
   * Create a new PCG-Random generator
   *
   * @param seed - 32-bit seed value (0 to 2^32 - 1)
   * @param stream - Optional stream id (defaults to 0)
   */
  constructor(seed: number, stream: number = 0) {
    // Validate seed is within 32-bit range
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new Error(`Seed must be a 32-bit unsigned integer (0 to 2^32-1), got: ${seed}`);
    }

    if (!Number.isInteger(stream) || stream < 0 || stream > 0xffffffff) {
      throw new Error(`Stream must be a 32-bit unsigned integer (0 to 2^32-1), got: ${stream}`);
    }

    // Initialize increment
    // Use a well-chosen odd number that avoids fixed points
    // Based on PCG reference implementation: 0x14057fc70d8f4faf
    // We XOR in the stream to differentiate different streams
    const DEFAULT_INCREMENT = BigInt("0x14057fc70d8f4faf");
    const streamMask = BigInt(stream) << BigInt(32);
    this.increment = DEFAULT_INCREMENT ^ streamMask;

    // Initialize state using seed
    this.state = BigInt(0);

    // Step the generator once to mix in the increment
    this.step();

    // Add seed to state
    this.state = this.state + BigInt(seed);

    // Step again to mix in the seed
    this.step();
  }

  /**
   * Advance the internal state
   *
   * Uses PCG's recommended multiplier: 0x5851f42d4c95bc1d
   * State transition: state = state * MULT + INC
   * State is masked to 64 bits to match unsigned 64-bit overflow behavior.
   *
   * @private
   */
  private step(): void {
    // Use hex string to avoid precision loss with large numbers
    const MULTIPLIER = BigInt("0x5851f42d4c95bc1d");
    const MASK_64 = BigInt("0xffffffffffffffff");

    this.state = (this.state * MULTIPLIER + this.increment) & MASK_64;
  }

  /**
   * Generate next random integer
   *
   * Uses XSH-RR (xor-shift high bits, random rotation) output function.
   * Returns 32-bit unsigned integer (0 to 2^32 - 1).
   *
   * @returns Random 32-bit integer
   */
  nextInt(): number {
    // Save current state for output function
    const oldState = this.state;

    // Advance state for next call
    this.step();

    // Output function: XSH-RR
    // 1. XOR high 16 bits into low 16 bits
    const xorShifted = Number(((oldState >> BigInt(18)) ^ oldState) >> BigInt(27));

    // 2. Rotate by high 5 bits of old state
    const rot = Number((oldState >> BigInt(59)) & BigInt(31));

    // 3. Perform rotation
    const rotated = this.rotate32(xorShifted, rot);

    // Ensure unsigned 32-bit
    return rotated >>> 0;
  }

  /**
   * Rotate a 32-bit integer
   *
   * @param x - Value to rotate
   * @param r - Rotation amount (0-31)
   * @returns Rotated value
   * @private
   */
  private rotate32(x: number, r: number): number {
    // Ensure rotation is within 0-31
    r = r & 31;

    // Perform rotation: (x >>> r) | (x << (32 - r))
    return (x >>> r) | (x << (32 - r));
  }

  /**
   * Generate next random float in [0, 1)
   *
   * Divides 32-bit integer by 2^32 to get uniform [0, 1) distribution.
   * Uses division for precision (bitwise shift would exclude 1.0 boundary).
   *
   * @returns Random float in [0, 1)
   */
  nextFloat(): number {
    const int = this.nextInt();
    return int / 0x100000000; // Divide by 2^32
  }

  /**
   * Generate random integer in range [min, max]
   *
   * Uses unbiased modulo rejection sampling for uniform distribution.
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range
   */
  range(min: number, max: number): number {
    if (min > max) {
      throw new Error(`min (${min}) cannot be greater than max (${max})`);
    }

    const range = max - min + 1;
    const maxUint32 = 0x100000000; // 2^32

    // Unbiased rejection sampling
    // Only accept values < (2^32 - (2^32 % range))
    const bucketSize = Math.floor(maxUint32 / range);
    const limit = bucketSize * range;

    let value: number;
    do {
      value = this.nextInt();
    } while (value >= limit);

    return min + Math.floor(value / bucketSize);
  }

  /**
   * Generate random float in range [min, max)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float in range
   */
  rangeFloat(min: number, max: number): number {
    if (min >= max) {
      throw new Error(`min (${min}) must be less than max (${max})`);
    }

    return min + this.nextFloat() * (max - min);
  }

  /**
   * Get current state (for serialization)
   *
   * Returns current state as 64-bit hexadecimal string.
   * Useful for saving/restoring generator state.
   *
   * @returns State as hex string
   */
  getState(): string {
    return this.state.toString(16).padStart(16, "0");
  }

  /**
   * Set state (for deserialization)
   *
   * Restores generator from previously saved state.
   *
   * @param stateHex - State as hex string (16 chars)
   */
  setState(stateHex: string): void {
    // Check string length (16 hex chars = 64 bits)
    if (stateHex.length !== 16) {
      throw new Error(
        `Invalid state: must be exactly 16 hex characters (64 bits), got: ${stateHex.length} characters`
      );
    }

    const state = BigInt("0x" + stateHex);

    if (state < BigInt(0) || state >= BigInt(2) ** BigInt(64)) {
      throw new Error(`Invalid state: must be 64-bit unsigned integer, got: 0x${stateHex}`);
    }

    this.state = state;
  }

  /**
   * Clone the generator
   *
   * Creates a new generator with identical state.
   * Both will produce the same sequence from this point.
   *
   * @returns New PCGRandom instance with identical state
   */
  clone(): PCGRandom {
    const cloned = Object.create(PCGRandom.prototype);
    cloned.state = this.state;
    cloned.increment = this.increment;
    return cloned;
  }
}

/**
 * Create a PCG-Random generator with a seed
 *
 * Convenience function for creating generators.
 *
 * @param seed - 32-bit seed value
 * @param stream - Optional stream id
 * @returns New PCGRandom instance
 *
 * @example
 * ```typescript
 * const rng = createPCG(12345);
 * console.log(rng.nextInt()); // Always same output for same seed
 * ```
 */
export function createPCG(seed: number, stream?: number): PCGRandom {
  return new PCGRandom(seed, stream);
}

/**
 * Seed value constants for common use cases
 */
export const SEED = {
  /**
   * Zero seed (useful for testing)
   */
  ZERO: 0,

  /**
   * Maximum 32-bit seed value
   */
  MAX: 0xffffffff,

  /**
   * Arbitrary seed for development
   */
  DEFAULT: 42,
} as const;
