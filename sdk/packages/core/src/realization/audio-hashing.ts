/**
 * AudioHasher - Hash audio buffers and event streams for regression testing
 *
 * @module realization/audio-hashing
 */

import type { ScheduledEvent } from "@schillinger-sdk/shared";

/**
 * Hash comparison result
 */
export interface HashComparison {
  /** Whether hashes are equal */
  areEqual: boolean;
  /** Difference metric (0 = identical) */
  difference: number;
  /** Similarity metric (0-1, 1 = identical) */
  similarity?: number;
}

/**
 * AudioHasher generates deterministic hashes for audio buffers and event streams
 */
export class AudioHasher {
  /**
   * Generate hash for audio buffer
   * @param leftChannel - Left channel audio data
   * @param rightChannel - Optional right channel for stereo
   * @returns Deterministic hash string
   */
  hashAudioBuffer(leftChannel: Float32Array, rightChannel?: Float32Array): string {
    // Simple hash implementation - convert buffer to string and hash
    const data = rightChannel
      ? `${Array.from(leftChannel).join(",")}|${Array.from(rightChannel).join(",")}`
      : Array.from(leftChannel).join(",");

    return this.simpleHash(data);
  }

  /**
   * Generate hash for event stream
   * @param events - Array of scheduled events
   * @returns Deterministic hash string
   */
  hashEventStream(events: ScheduledEvent[]): string {
    // Serialize events to JSON string and hash
    const serialized = JSON.stringify(
      events.map((e) => ({
        sampleTime: e.sampleTime,
        type: e.type,
        target: e.target,
        payload: e.payload,
        deterministicId: e.deterministicId,
      })),
    );

    return this.simpleHash(serialized);
  }

  /**
   * Compare two hashes
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Comparison result
   */
  compareHashes(hash1: string, hash2: string): HashComparison {
    if (!hash1 || !hash2) {
      throw new Error("Hashes cannot be empty or null");
    }

    const areEqual = hash1 === hash2;

    // Calculate similarity based on common prefix
    let similarity = 0;
    if (!areEqual) {
      const maxLen = Math.max(hash1.length, hash2.length);
      let commonPrefix = 0;
      for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
        if (hash1[i] === hash2[i]) {
          commonPrefix++;
        } else {
          break;
        }
      }
      similarity = commonPrefix / maxLen;
    } else {
      similarity = 1;
    }

    return {
      areEqual,
      difference: areEqual ? 0 : 1 - similarity,
      similarity,
    };
  }

  /**
   * Simple hash function for testing
   * @param data - String to hash
   * @returns Hash string
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
