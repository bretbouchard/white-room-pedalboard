/**
 * Song State Derivation Tests
 *
 * Comprehensive tests for deriveSongState() function covering:
 * - Deterministic output with same seed
 * - Different output with different seeds
 * - All SongState fields derived correctly
 * - Validation of invalid contracts
 * - Performance (< 5 seconds for typical songs)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { deriveSongState, createSongFromContract } from '../song_factory.js';
import { createMinimalSongContract, validateSongContract } from '../song_contract.js';
import type { SongContractV1 } from '../song_contract.js';
import type { SongStateV1 } from '../song_state_v1.js';

describe('deriveSongState', () => {
  describe('determinism', () => {
    it('should produce identical SongState with same seed and contract', () => {
      const contract = createMinimalSongContract({
        id: 'contract-determinism-test',
        seed: 12345
      });

      const seed = 999;

      // Derive twice with same seed
      const songState1 = deriveSongState(contract, seed);
      const songState2 = deriveSongState(contract, seed);

      // Check all fields match
      expect(songState1.id).toBe(songState2.id);
      expect(songState1.sourceContractId).toBe(songState2.sourceContractId);
      expect(songState1.derivationId).toBe(songState2.derivationId);
      expect(songState1.notes).toEqual(songState2.notes);
      expect(songState1.timeline).toEqual(songState2.timeline);
      expect(songState1.duration).toBe(songState2.duration);
    });

    it('should produce different SongState with different seeds', () => {
      const contract = createMinimalSongContract({
        id: 'contract-seed-test',
        seed: 12345
      });

      // Derive with different seeds
      const songState1 = deriveSongState(contract, 100);
      const songState2 = deriveSongState(contract, 200);

      // Should have different IDs (due to different PRNG states)
      expect(songState1.id).not.toBe(songState2.id);
      expect(songState1.derivationId).not.toBe(songState2.derivationId);

      // Notes might also differ due to PRNG
      // (This depends on the actual generation logic)
    });

    it('should use contract seed when no seed provided', () => {
      const contract = createMinimalSongContract({
        id: 'contract-default-seed',
        seed: 54321
      });

      const songState1 = deriveSongState(contract);
      const songState2 = deriveSongState(contract);

      // Same contract seed should produce same results
      expect(songState1.id).toBe(songState2.id);
      expect(songState1.notes).toEqual(songState2.notes);
    });

    it('should produce different SongState for different contracts', () => {
      const contract1 = createMinimalSongContract({
        id: 'contract-1',
        seed: 12345
      });

      const contract2 = createMinimalSongContract({
        id: 'contract-2',
        seed: 12345 // Same seed, different contract
      });

      const seed = 999;

      const songState1 = deriveSongState(contract1, seed);
      const songState2 = deriveSongState(contract2, seed);

      // Different contracts should produce different results
      expect(songState1.sourceContractId).not.toBe(songState2.sourceContractId);
      expect(songState1.id).not.toBe(songState2.id);
    });
  });

  describe('SongState field derivation', () => {
    it('should derive timeline from form system', () => {
      const contract = createMinimalSongContract({
        formSystem: {
          id: 'form-1',
          name: 'Test Form',
          ratioTree: { ratios: [1, 1] },
          sections: [
            { id: 'section-1', name: 'Verse', ratioIndex: 0, durationBars: 8 },
            { id: 'section-2', name: 'Chorus', ratioIndex: 1, durationBars: 8 }
          ],
          periodicity: []
        }
      });

      const songState = deriveSongState(contract, 42);

      // Check timeline structure
      expect(songState.timeline).toBeDefined();
      expect(songState.timeline.sections).toBeDefined();
      expect(songState.timeline.sections.length).toBeGreaterThan(0);

      // Check section properties
      const firstSection = songState.timeline.sections[0];
      expect(firstSection.id).toBeDefined();
      expect(firstSection.name).toBeDefined();
      expect(firstSection.startTime).toBeGreaterThanOrEqual(0);
      expect(firstSection.duration).toBeGreaterThan(0);
      expect(firstSection.tempo).toBe(120); // Default tempo
      expect(firstSection.timeSignature).toEqual([4, 4]); // Default time signature
    });

    it('should derive notes from rhythm and melody systems', () => {
      const contract = createMinimalSongContract({
        rhythmSystems: [
          {
            id: 'rhythm-1',
            name: 'Basic Rhythm',
            generators: [
              { period: 4, phaseOffset: 0, weight: 1.0 },
              { period: 6, phaseOffset: 0, weight: 1.0 }
            ],
            resultants: [
              {
                generatorIndex1: 0,
                generatorIndex2: 1,
                method: 'interference'
              }
            ],
            permutations: [],
            density: {
              minDensity: 0.3,
              maxDensity: 0.7,
              gridResolution: 0.25
            }
          }
        ],
        melodySystems: [
          {
            id: 'melody-1',
            name: 'Basic Melody',
            pitchCycle: { modulus: 12, rotation: 0 },
            intervalSeeds: [
              {
                intervals: [2, 2, 1, 2, 2, 2, 1],
                ordered: true
              }
            ],
            contour: { direction: 'neutral', complexity: 0.5 },
            register: { minNote: 48, maxNote: 72 }
          }
        ]
      });

      const songState = deriveSongState(contract, 42);

      // Check notes array
      expect(songState.notes).toBeDefined();
      expect(Array.isArray(songState.notes)).toBe(true);

      // If notes are generated, check their structure
      if (songState.notes.length > 0) {
        const firstNote = songState.notes[0];
        expect(firstNote.id).toBeDefined();
        expect(firstNote.voiceId).toBeDefined();
        expect(firstNote.startTime).toBeGreaterThanOrEqual(0);
        expect(firstNote.duration).toBeGreaterThan(0);
        expect(firstNote.pitch).toBeGreaterThanOrEqual(0);
        expect(firstNote.pitch).toBeLessThanOrEqual(127);
        expect(firstNote.velocity).toBeGreaterThanOrEqual(0);
        expect(firstNote.velocity).toBeLessThanOrEqual(1);
      }
    });

    it('should set correct source contract ID', () => {
      const contract = createMinimalSongContract({
        id: 'test-contract-id-12345',
        seed: 42
      });

      const songState = deriveSongState(contract, 999);

      expect(songState.sourceContractId).toBe('test-contract-id-12345');
    });

    it('should generate unique derivation ID', () => {
      const contract = createMinimalSongContract();

      const songState1 = deriveSongState(contract, 100);
      const songState2 = deriveSongState(contract, 200);

      expect(songState1.derivationId).toBeDefined();
      expect(songState2.derivationId).toBeDefined();
      expect(songState1.derivationId).not.toBe(songState2.derivationId);
    });

    it('should set tempo and time signature correctly', () => {
      const contract = createMinimalSongContract();

      const songState = deriveSongState(contract, 42);

      expect(songState.tempo).toBe(120); // Default tempo
      expect(songState.timeSignature).toEqual([4, 4]); // Default time signature
      expect(songState.sampleRate).toBe(44100); // Default sample rate
    });

    it('should calculate duration correctly', () => {
      const contract = createMinimalSongContract();

      const songState = deriveSongState(contract, 42);

      expect(songState.duration).toBeDefined();
      expect(songState.duration).toBeGreaterThan(0);
      expect(songState.duration).toBeLessThanOrEqual(44100 * 10); // Should be reasonable
    });
  });

  describe('validation', () => {
    it('should throw error for contract with no rhythm systems', () => {
      const contract = createMinimalSongContract({
        rhythmSystems: []
      });

      expect(() => deriveSongState(contract, 42)).toThrow();
    });

    it('should throw error for contract with no melody systems', () => {
      const contract = createMinimalSongContract({
        melodySystems: []
      });

      expect(() => deriveSongState(contract, 42)).toThrow();
    });

    it('should throw error for contract with no form sections', () => {
      const contract = createMinimalSongContract({
        formSystem: {
          id: 'form-empty',
          name: 'Empty Form',
          ratioTree: { ratios: [] },
          sections: [],
          periodicity: []
        }
      });

      expect(() => deriveSongState(contract, 42)).toThrow();
    });

    it('should throw error for contract with no voices', () => {
      const contract = createMinimalSongContract({
        ensemble: { voices: [] }
      });

      expect(() => deriveSongState(contract, 42)).toThrow();
    });

    it('should accept valid contract', () => {
      const contract = createMinimalSongContract();

      expect(() => deriveSongState(contract, 42)).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete in less than 5 seconds for typical song', () => {
      const contract = createMinimalSongContract({
        formSystem: {
          id: 'form-perf',
          name: 'Performance Test Form',
          ratioTree: { ratios: [1, 1, 1] },
          sections: [
            { id: 'section-1', name: 'Verse', ratioIndex: 0, durationBars: 16 },
            { id: 'section-2', name: 'Chorus', ratioIndex: 1, durationBars: 16 },
            { id: 'section-3', name: 'Bridge', ratioIndex: 2, durationBars: 8 }
          ],
          periodicity: []
        }
      });

      const startTime = performance.now();
      const songState = deriveSongState(contract, 42);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(songState).toBeDefined();
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle multiple rapid derivations efficiently', () => {
      const contracts = Array.from({ length: 10 }, (_, i) =>
        createMinimalSongContract({ id: `perf-test-${i}` })
      );

      const startTime = performance.now();

      for (const contract of contracts) {
        deriveSongState(contract, 42);
      }

      const endTime = performance.now();
      const avgDuration = (endTime - startTime) / contracts.length;

      // Average should be less than 1 second per derivation
      expect(avgDuration).toBeLessThan(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle contract with single note', () => {
      const contract = createMinimalSongContract({
        rhythmSystems: [
          {
            id: 'rhythm-single',
            name: 'Single Note Rhythm',
            generators: [{ period: 1, phaseOffset: 0, weight: 1.0 }],
            resultants: [],
            permutations: [],
            density: {
              minDensity: 1.0,
              maxDensity: 1.0,
              gridResolution: 1.0
            }
          }
        ]
      });

      const songState = deriveSongState(contract, 42);

      expect(songState).toBeDefined();
      expect(songState.notes).toBeDefined();
    });

    it('should handle contract with very dense rhythm', () => {
      const contract = createMinimalSongContract({
        rhythmSystems: [
          {
            id: 'rhythm-dense',
            name: 'Dense Rhythm',
            generators: [
              { period: 2, phaseOffset: 0, weight: 1.0 },
              { period: 3, phaseOffset: 0, weight: 1.0 }
            ],
            resultants: [
              {
                generatorIndex1: 0,
                generatorIndex2: 1,
                method: 'interference'
              }
            ],
            permutations: [],
            density: {
              minDensity: 0.9,
              maxDensity: 1.0,
              gridResolution: 0.0625 // 64th notes
            }
          }
        ]
      });

      const songState = deriveSongState(contract, 42);

      expect(songState).toBeDefined();
      expect(songState.notes).toBeDefined();
    });

    it('should handle contract with extreme register', () => {
      const contract = createMinimalSongContract({
        melodySystems: [
          {
            id: 'melody-extreme',
            name: 'Extreme Register Melody',
            pitchCycle: { modulus: 12, rotation: 0 },
            intervalSeeds: [
              {
                intervals: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Chromatic
                ordered: true
              }
            ],
            contour: { direction: 'neutral', complexity: 1.0 },
            register: { minNote: 0, maxNote: 127 } // Full MIDI range
          }
        ]
      });

      const songState = deriveSongState(contract, 42);

      expect(songState).toBeDefined();
      expect(songState.notes).toBeDefined();

      // Check that notes are within valid range
      for (const note of songState.notes) {
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
      }
    });
  });

  describe('createSongFromContract', () => {
    it('should return success result for valid contract', () => {
      const contract = createMinimalSongContract();

      const result = createSongFromContract(contract, 42);

      expect(result.success).toBe(true);
      expect(result.songState).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error result for invalid contract', () => {
      const invalidContract = createMinimalSongContract({
        rhythmSystems: []
      });

      const result = createSongFromContract(invalidContract, 42);

      expect(result.success).toBe(false);
      expect(result.songState).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should include error message for validation failures', () => {
      const invalidContract = createMinimalSongContract({
        rhythmSystems: []
      });

      const result = createSongFromContract(invalidContract, 42);

      expect(result.error).toContain('rhythm');
    });
  });
});

describe('validateSongContract', () => {
  it('should validate correct contract', () => {
    const contract = createMinimalSongContract();
    const result = validateSongContract(contract);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing rhythm systems', () => {
    const contract = createMinimalSongContract({
      rhythmSystems: []
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('rhythm'))).toBe(true);
  });

  it('should detect missing melody systems', () => {
    const contract = createMinimalSongContract({
      melodySystems: []
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('melody'))).toBe(true);
  });

  it('should detect missing harmony systems', () => {
    const contract = createMinimalSongContract({
      harmonySystems: []
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('harmony'))).toBe(true);
  });

  it('should detect missing form sections', () => {
    const contract = createMinimalSongContract({
      formSystem: {
        id: 'form-empty',
        name: 'Empty',
        ratioTree: { ratios: [] },
        sections: [],
        periodicity: []
      }
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('form'))).toBe(true);
  });

  it('should detect missing orchestration systems', () => {
    const contract = createMinimalSongContract({
      orchestrationSystems: []
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('orchestration'))).toBe(true);
  });

  it('should detect missing voices', () => {
    const contract = createMinimalSongContract({
      ensemble: { voices: [] }
    });

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('voice'))).toBe(true);
  });

  it('should detect invalid version', () => {
    const contract = createMinimalSongContract();
    (contract as any).version = '2.0';

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('should detect invalid seed', () => {
    const contract = createMinimalSongContract();
    (contract as any).seed = -1;

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('seed'))).toBe(true);
  });

  it('should detect missing ID', () => {
    const contract = createMinimalSongContract();
    (contract as any).id = '';

    const result = validateSongContract(contract);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID'))).toBe(true);
  });
});
