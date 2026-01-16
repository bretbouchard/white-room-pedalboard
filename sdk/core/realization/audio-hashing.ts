/**
 * AudioHasher - Audio buffer and event stream hashing
 *
 * Provides deterministic hashing for regression testing and validation.
 * Essential for ensuring output consistency across SDK versions.
 *
 * @module realization/audio-hashing
 */

import { ScheduledEvent } from "@schillinger-sdk/shared";

export interface HashComparison {
  areEqual: boolean;
  similarity: number; // 0.0 to 1.0
  difference: number; // Absolute difference
}

/**
 * AudioHasher generates deterministic hashes for regression testing
 *
 * Used to verify audio and event stream outputs remain consistent
 * across SDK versions and implementations.
 */
export class AudioHasher {
  private static readonly HASH_PRECISION = 6; // Decimal places for float quantization

  /**
   * Generate hash for audio buffer
   *
   * Quantizes audio data to ensure consistent hashing despite
   * minor floating-point differences.
   *
   * @param leftChannel - Left channel audio data
   * @param rightChannel - Optional right channel for stereo
   * @returns Hex hash string
   */
  hashAudioBuffer(
    leftChannel: Float32Array,
    rightChannel?: Float32Array,
  ): string {
    // Quantize audio data to hash precision
    const quantizedLeft = this.quantizeAudio(leftChannel);
    const quantizedRight = rightChannel ? this.quantizeAudio(rightChannel) : [];

    // Combine channels
    const combined = [...quantizedLeft, ...quantizedRight];

    // Generate hash
    return this.computeHash(combined);
  }

  /**
   * Generate hash for event stream
   *
   * Creates deterministic hash from event array, order-sensitive.
   *
   * @param events - Events to hash
   * @returns Hex hash string
   */
  hashEventStream(events: ScheduledEvent[]): string {
    // Create canonical representation
    const canonical = events.map((event) => ({
      sampleTime: event.sampleTime,
      musicalTime: event.musicalTime,
      type: event.type,
      target: {
        path: event.target.path,
        scope: event.target.scope,
        components: event.target.components || [],
      },
      payload: event.payload,
      deterministicId: event.deterministicId,
      sourceInfo: event.sourceInfo,
    }));

    // Sort and serialize
    const serialized = JSON.stringify(canonical, this.jsonStringifySort);

    // Generate hash
    return this.computeHash(serialized);
  }

  /**
   * Compare two hashes
   *
   * Provides detailed comparison metrics for regression testing.
   *
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Hash comparison result
   * @throws Error if hashes are invalid
   */
  compareHashes(hash1: string, hash2: string): HashComparison {
    // Validate inputs
    if (!hash1 || hash1.length === 0) {
      throw new Error("Hash 1 is empty or invalid");
    }
    if (!hash2 || hash2.length === 0) {
      throw new Error("Hash 2 is empty or invalid");
    }

    const areEqual = hash1 === hash2;

    // Calculate similarity (character-by-character match rate)
    let matches = 0;
    const maxLength = Math.max(hash1.length, hash2.length);

    for (let i = 0; i < maxLength; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }

    const similarity = matches / maxLength;

    // Calculate absolute difference (using character codes)
    let difference = 0;
    const minLength = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < minLength; i++) {
      difference += Math.abs(hash1.charCodeAt(i) - hash2.charCodeAt(i));
    }

    // Add penalty for length difference
    difference += Math.abs(hash1.length - hash2.length) * 256;

    return {
      areEqual,
      similarity,
      difference,
    };
  }

  /**
   * Quantize audio data for consistent hashing
   *
   * Reduces floating-point precision to eliminate noise.
   *
   * @param audio - Audio buffer to quantize
   * @returns Quantized audio array
   * @private
   */
  private quantizeAudio(audio: Float32Array): number[] {
    const quantized: number[] = [];

    for (let i = 0; i < audio.length; i++) {
      // Round to specified precision
      const value = Number(audio[i].toFixed(AudioHasher.HASH_PRECISION));
      quantized.push(value);
    }

    return quantized;
  }

  /**
   * Compute hash from data
   *
   * Uses a simple but effective hashing algorithm.
   * In production, consider using crypto.createHash.
   *
   * @param data - Data to hash (string or number array)
   * @returns Hex hash string
   * @private
   */
  private computeHash(data: string | number[]): string {
    const str = typeof data === "string" ? data : JSON.stringify(data);

    // FNV-1a hash algorithm
    let hash = 2166136261; // FNV offset basis

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    // Convert to hex
    return (hash >>> 0).toString(16);
  }

  /**
   * JSON stringify with sorted keys
   *
   * @param key - Object key
   * @param value - Object value
   * @returns Sorted value
   * @private
   */
  private jsonStringifySort(key: string, value: unknown): unknown {
    if (value instanceof Object && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = (value as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return value;
  }
}
