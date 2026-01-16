/**
 * Realization Engine - PRNG Wrapper
 *
 * Wrapper around DeterministicPRNG for realization-specific use.
 * Provides stream-based random generation for independent systems.
 */

import { DeterministicPRNG } from "../random";

/**
 * PRNG wrapper for realization
 *
 * Manages multiple independent streams for different systems
 * to ensure deterministic realization.
 */
export class RealizationPRNG {
  private mainPRNG: DeterministicPRNG;
  private streams: Map<string, DeterministicPRNG>;

  constructor(seed: number) {
    this.mainPRNG = new DeterministicPRNG(seed);
    this.streams = new Map();
  }

  /**
   * Get or create a stream for a specific system
   *
   * Each system gets its own independent stream to ensure
   * deterministic results regardless of execution order.
   */
  getStream(systemId: string): DeterministicPRNG {
    if (!this.streams.has(systemId)) {
      // Use main PRNG to generate stream seed
      const streamSeed = this.mainPRNG.next();
      this.streams.set(systemId, new DeterministicPRNG(streamSeed));
    }
    return this.streams.get(systemId)!;
  }

  /**
   * Get main PRNG (for global decisions)
   */
  getMain(): DeterministicPRNG {
    return this.mainPRNG;
  }

  /**
   * Get current state for reproducibility
   */
  getState(): {
    mainState: number;
    streams: Map<string, number>;
  } {
    return {
      mainState: this.mainPRNG.next(),
      streams: new Map(Array.from(this.streams.entries()).map(([id, prng]) => [id, prng.next()])),
    };
  }

  /**
   * Reset to initial state (for testing)
   */
  reset(): void {
    this.streams.clear();
  }
}
