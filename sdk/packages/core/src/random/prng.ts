/**
 * Deterministic PRNG Implementation
 *
 * PCG-random (Permuted Congruential Generator) for cross-platform
 * deterministic random number generation.
 *
 * Key features:
 * - Deterministic: Same seed → identical sequence across all platforms
 * - Fast: Simple arithmetic operations
 * - Good statistical properties
 * - Seedable from 64-bit integers
 *
 * Based on: O'Neill 2014, "PCG: A Family of Simple Fast Space-Efficient
 * Statistically Good Algorithms for Random Number Generation"
 *
 * @see http://www.pcg-random.org/
 */

/**
 * PCG-random state
 */
export interface PCGState {
  state: bigint; // Current state (128-bit internally, using 64-bit for simplicity)
  increment: bigint; // Increment for advanced usage (normally constant)
}

/**
 * Deterministic Random Number Generator using PCG-random
 *
 * This class provides deterministic random number generation that produces
 * identical sequences across different platforms (TypeScript/JavaScript, Dart, etc.)
 * when initialized with the same seed.
 */
export class DeterministicPRNG {
  private state: PCGState;
  private readonly multiplier: bigint = 6364136223846793005n;

  /**
   * Create PRNG with seed
   *
   * @param seed - 64-bit seed value
   * @param stream - Optional stream identifier (for multiple independent streams)
   */
  constructor(seed: number, stream: number = 0) {
    // Initialize state with seed
    this.state = {
      state: BigInt(seed),
      increment: (BigInt(stream) << 1n) | 1n, // Ensure odd increment
    };

    // Warm up the generator (discard first output to improve statistical properties)
    this.next();
  }

  /**
   * Generate next random 32-bit integer
   *
   * @returns Random integer in range [0, 2^32)
   */
  next(): number {
    const { state, increment } = this.state;

    // Advance state (PCG-XSH-RR algorithm)
    const newState = (state * this.multiplier + increment) & 0xffffffffffffffffn;
    this.state.state = newState;

    // Output function (XSH-RR: xorshift high, random rotation)
    const xorshifted = Number(((newState >> 18n) ^ newState) >> 27n);
    const rot = Number(newState >> 59n);

    // Rotate and return
    return Number((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
  }

  /**
   * Generate random integer in range [min, max]
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range
   */
  nextInt(min: number, max: number): number {
    const range = max - min + 1;
    return Math.floor(this.nextFloat() * range) + min;
  }

  /**
   * Generate random float in range [0, 1)
   *
   * @returns Random float in [0, 1)
   */
  nextFloat(): number {
    // Divide by 2^32 to get [0, 1)
    return this.next() / 0x100000000;
  }

  /**
   * Generate random float in range [min, max)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float in range
   */
  nextFloatRange(min: number, max: number): number {
    return this.nextFloat() * (max - min) + min;
  }

  /**
   * Randomly select element from array
   *
   * @param array - Array to select from
   * @returns Random element
   */
  pick<T>(array: T[]): T {
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   *
   * @param array - Array to shuffle
   * @returns Shuffled array (same reference)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get current state (for serialization/debugging)
   *
   * @returns Current PRNG state
   */
  getState(): PCGState {
    return {
      state: this.state.state,
      increment: this.state.increment,
    };
  }

  /**
   * Set state (for serialization/reproducibility)
   *
   * @param state - State to restore
   */
  setState(state: PCGState): void {
    this.state = {
      state: state.state,
      increment: state.increment,
    };
  }

  /**
   * Clone PRNG (creates independent copy)
   *
   * @returns New PRNG with same state
   */
  clone(): DeterministicPRNG {
    const cloned = new DeterministicPRNG(0);
    cloned.setState(this.getState());
    return cloned;
  }

  /**
   * Generate array of N random numbers
   *
   * @param n - Number of values to generate
   * @returns Array of random floats in [0, 1)
   */
  nextArray(n: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < n; i++) {
      result.push(this.nextFloat());
    }
    return result;
  }
}

/**
 * Create seeded PRNG
 *
 * Convenience function to create a PRNG with a seed.
 *
 * @param seed - Seed value
 * @param stream - Optional stream identifier
 * @returns New PRNG instance
 */
export function createSeededPRNG(seed: number, stream: number = 0): DeterministicPRNG {
  return new DeterministicPRNG(seed, stream);
}

/**
 * Generate consistent seed from string
 *
 * Creates a deterministic numeric seed from a string input.
 * Useful for creating reproducible sessions from names.
 *
 * @param str - Input string
 * @returns Numeric seed
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate seed from multiple values
 *
 * Combines multiple values into a single seed using
 * a deterministic hash function.
 *
 * @param values - Values to combine
 * @returns Numeric seed
 */
export function combineSeeds(...values: number[]): number {
  let combined = 0;
  for (const value of values) {
    combined = (combined << 5) - combined + value;
    combined = combined & combined; // Convert to 32-bit integer
  }
  return Math.abs(combined);
}

/**
 * Validate seed is in valid range
 *
 * @param seed - Seed to validate
 * @returns True if seed is valid
 */
export function isValidSeed(seed: number): boolean {
  return Number.isSafeInteger(seed) && seed >= 0;
}

/**
 * Generate random seed
 *
 * Creates a random seed using crypto.getRandomValues() when available,
 * falls back to Math.random() otherwise.
 *
 * @returns Random seed value
 */
export function generateRandomSeed(): number {
  // Use crypto if available for better randomness
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0];
  }

  // Fallback to Math.random() (not cryptographically secure but sufficient)
  return Math.floor(Math.random() * 0x100000000);
}
