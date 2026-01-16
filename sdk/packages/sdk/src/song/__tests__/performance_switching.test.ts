/**
 * Performance Switching Integration Tests
 *
 * Tests the complete flow for "Parallel Performance Universes":
 * 1. Create song with multiple performances (Piano, SATB, Techno)
 * 2. Switch between performances
 * 3. Verify instrumentation, density, groove change correctly
 * 4. Test performance blending (v1: dual-render crossfade)
 *
 * This is the "magic moment" test - user hits play, taps 'Techno',
 * and the whole song transforms at the next bar.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SongModel_v1 } from '@whiteroom/schemas';
import {
  createPerformanceManager,
  createPerformanceManagerWithDefaults,
  type PerformanceManager
} from '../performance_manager.js';
import {
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance,
  type PerformanceRealizationV1
} from '../performance_realization.js';

describe('Performance Switching - Integration Tests', () => {
  let mockSongModel: SongModel_v1;
  let manager: PerformanceManager;

  beforeEach(() => {
    // Create a minimal SongModel for testing
    mockSongModel = {
      version: '1.0',
      id: crypto.randomUUID(),
      sourceSongId: crypto.randomUUID(),
      derivationId: crypto.randomUUID(),
      timeline: {
        sections: [
          {
            id: crypto.randomUUID(),
            name: 'A',
            startTime: 0,
            duration: 441000, // 10 seconds at 44.1kHz
            tempo: 120,
            timeSignature: [4, 4]
          }
        ],
        tempo: 120,
        timeSignature: [4, 4]
      },
      notes: [],
      automations: [],
      duration: 441000,
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 44100,
      voiceAssignments: [],
      console: {
        version: '1.0',
        id: crypto.randomUUID()
      },
      presets: [],
      derivedAt: Date.now(),
      songState: crypto.randomUUID(),
      performances: [],
      activePerformanceId: ''
    };

    manager = createPerformanceManager(mockSongModel);
  });

  describe('Default Performances', () => {
    it('should create Piano, SATB, and Techno performances by default', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.performances).toHaveLength(3);

      const [piano, satb, techno] = result.data!.performances;

      // Verify Piano performance
      expect(piano.name).toBe('Solo Piano');
      expect(piano.arrangementStyle).toBe('SOLO_PIANO');
      expect(piano.density).toBeLessThan(0.5); // Sparse
      expect(piano.instrumentationMap).toHaveLength(1);

      // Verify SATB performance
      expect(satb.name).toBe('SATB Choir');
      expect(satb.arrangementStyle).toBe('SATB');
      expect(satb.instrumentationMap).toHaveLength(4); // S, A, T, B

      // Verify Techno performance
      expect(techno.name).toBe('Ambient Techno');
      expect(techno.arrangementStyle).toBe('AMBIENT_TECHNO');
      expect(techno.density).toBeGreaterThan(0.7); // Dense
      expect(techno.instrumentationMap.length).toBeGreaterThan(4); // Multiple synths
    });

    it('should set Piano as the default active performance', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);

      expect(result.success).toBe(true);
      const updatedSongModel = result.data?.manager.getSongModel();

      // Piano should be active
      const pianoPerf = result.data?.performances.find(p => p.name === 'Solo Piano');
      expect(updatedSongModel.activePerformanceId).toBe(pianoPerf?.id);
    });
  });

  describe('Performance CRUD', () => {
    it('should create a new performance', () => {
      const result = manager.createPerformance({
        name: 'Custom Rock Band',
        description: 'Drums, bass, guitar, keys',
        performance: {
          arrangementStyle: 'ROCK_BAND',
          density: 0.7,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'electric-guitar',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: -3.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 48, maxPitch: 84 }
          ]
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Custom Rock Band');
      expect(result.data?.arrangementStyle).toBe('ROCK_BAND');
    });

    it('should reject duplicate performance names', () => {
      // Create first performance
      manager.createPerformance({
        name: 'Duplicate Test',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      // Try to create duplicate
      const result = manager.createPerformance({
        name: 'Duplicate Test', // Same name
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.6,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALREADY_EXISTS');
    });

    it('should update an existing performance', async () => {
      // Create performance
      const createResult = manager.createPerformance({
        name: 'Update Test',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      const perfId = createResult.data?.id!;
      const originalModifiedAt = createResult.data?.modifiedAt;

      // Wait a bit to ensure modifiedAt changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update performance
      const updateResult = manager.updatePerformance({
        performanceId: perfId,
        updates: {
          name: 'Updated Test',
          density: 0.8
        }
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('Updated Test');
      expect(updateResult.data?.density).toBe(0.8);
      expect(updateResult.data?.modifiedAt).toBeGreaterThan(originalModifiedAt!);
    });

    it('should delete a performance', () => {
      // Create two performances
      const perf1 = manager.createPerformance({
        name: 'Keep',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      const perf2 = manager.createPerformance({
        name: 'Delete',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      // Set first as active
      manager.switchPerformance(perf1.data!.id);

      // Delete second performance
      const deleteResult = manager.deletePerformance(perf2.data!.id);

      expect(deleteResult.success).toBe(true);
      expect(manager.listPerformances()).toHaveLength(1);
    });

    it('should prevent deleting the last performance', () => {
      // Create single performance
      const perf = manager.createPerformance({
        name: 'Last One',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      const deleteResult = manager.deletePerformance(perf.data!.id);

      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error?.code).toBe('INVALID_DATA');
    });

    it('should prevent deleting the active performance', () => {
      // Create two performances
      const perf1 = manager.createPerformance({
        name: 'Active',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      const perf2 = manager.createPerformance({
        name: 'Inactive',
        performance: {
          arrangementStyle: 'CUSTOM',
          density: 0.5,
          grooveProfileId: crypto.randomUUID(),
          instrumentationMap: [
            {
              roleId: 'primary',
              instrumentId: 'NexSynth',
              presetId: 'default',
              busId: crypto.randomUUID()
            }
          ],
          mixTargets: [
            { roleId: 'primary', gain: 0.0, pan: 0.0 }
          ],
          registerMap: [
            { roleId: 'primary', minPitch: 60, maxPitch: 84 }
          ]
        }
      });

      // Set first as active
      manager.switchPerformance(perf1.data!.id);

      // Try to delete active performance
      const deleteResult = manager.deletePerformance(perf1.data!.id);

      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error?.code).toBe('INVALID_DATA');
    });
  });

  describe('Performance Switching', () => {
    it('should switch between Piano and SATB', () => {
      // Initialize with defaults
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;
      const satb = result.data?.performances.find(p => p.name === 'SATB Choir')!;

      // Initially Piano is active
      expect(manager.getActivePerformance()?.id).toBe(piano.id);

      // Switch to SATB
      const switchResult = manager.switchPerformance(satb.id);

      expect(switchResult.success).toBe(true);
      expect(manager.getActivePerformance()?.id).toBe(satb.id);
      expect(manager.getActivePerformance()?.name).toBe('SATB Choir');
    });

    it('should switch between Piano and Techno', () => {
      // Initialize with defaults
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;
      const techno = result.data?.performances.find(p => p.name === 'Ambient Techno')!;

      // Initially Piano is active
      expect(manager.getActivePerformance()?.id).toBe(piano.id);

      // Switch to Techno
      const switchResult = manager.switchPerformance(techno.id);

      expect(switchResult.success).toBe(true);
      expect(manager.getActivePerformance()?.id).toBe(techno.id);
      expect(manager.getActivePerformance()?.name).toBe('Ambient Techno');
    });

    it('should reject switching to non-existent performance', () => {
      const switchResult = manager.switchPerformance('non-existent-id');

      expect(switchResult.success).toBe(false);
      expect(switchResult.error?.code).toBe('NOT_FOUND');
    });

    it('should update activePerformanceId in SongModel', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;
      const techno = result.data?.performances.find(p => p.name === 'Ambient Techno')!;

      // Switch to Techno
      manager.switchPerformance(techno.id);

      // Get updated SongModel
      const updatedSongModel = manager.getSongModel();

      expect(updatedSongModel.activePerformanceId).toBe(techno.id);
      expect(updatedSongModel.activePerformanceId).not.toBe(piano.id);
    });
  });

  describe('Performance Realization Properties', () => {
    it('should have different instrumentation for each performance', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      // Piano: Single instrument
      expect(piano.instrumentationMap).toHaveLength(1);
      expect(piano.instrumentationMap[0].instrumentId).toBe('NexSynth');

      // SATB: Four voices
      expect(satb.instrumentationMap).toHaveLength(4);
      expect(satb.instrumentationMap[0].instrumentId).toBe('KaneMarcoAetherString');

      // Techno: Multiple synths
      expect(techno.instrumentationMap.length).toBeGreaterThan(4);
      expect(techno.instrumentationMap.some(i => i.instrumentId === 'NexSynth')).toBe(true);
      expect(techno.instrumentationMap.some(i => i.instrumentId === 'KaneMarco')).toBe(true);
    });

    it('should have different density for each performance', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      // Piano: Sparse
      expect(piano.density).toBeLessThan(0.5);

      // SATB: Moderate
      expect(satb.density).toBeGreaterThanOrEqual(0.5);
      expect(satb.density).toBeLessThan(0.8);

      // Techno: Dense
      expect(techno.density).toBeGreaterThan(0.7);
    });

    it('should have different arrangement styles', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      expect(piano.arrangementStyle).toBe('SOLO_PIANO');
      expect(satb.arrangementStyle).toBe('SATB');
      expect(techno.arrangementStyle).toBe('AMBIENT_TECHNO');
    });

    it('should have ConsoleX profile IDs', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      expect(piano.consoleXProfileId).toBeDefined();
      expect(satb.consoleXProfileId).toBeDefined();
      expect(techno.consoleXProfileId).toBeDefined();

      // Each should have different ConsoleX profiles
      expect(piano.consoleXProfileId).not.toBe(satb.consoleXProfileId);
      expect(satb.consoleXProfileId).not.toBe(techno.consoleXProfileId);
    });

    it('should have valid register maps', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      // All entries should have valid pitch ranges
      const validateRegister = (perf: PerformanceRealizationV1) => {
        for (const entry of perf.registerMap) {
          expect(entry.minPitch).toBeGreaterThanOrEqual(0);
          expect(entry.maxPitch).toBeLessThanOrEqual(127);
          expect(entry.minPitch).toBeLessThanOrEqual(entry.maxPitch);
        }
      };

      validateRegister(piano);
      validateRegister(satb);
      validateRegister(techno);
    });

    it('should have valid mix targets', () => {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      // All entries should have valid gain/pan
      const validateMixTargets = (perf: PerformanceRealizationV1) => {
        for (const entry of perf.mixTargets) {
          expect(entry.gain).toBeGreaterThanOrEqual(-60); // -60 dB minimum
          expect(entry.gain).toBeLessThanOrEqual(12); // +12 dB maximum
          expect(entry.pan).toBeGreaterThanOrEqual(-1.0);
          expect(entry.pan).toBeLessThanOrEqual(1.0);
        }
      };

      validateMixTargets(piano);
      validateMixTargets(satb);
      validateMixTargets(techno);
    });
  });

  describe('Performance Blending', () => {
    it('should create blend metadata between two performances', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;
      const techno = result.data?.performances.find(p => p.name === 'Ambient Techno')!;

      // Create blend at 50%
      const blendResult = manager.blendPerformances(piano.id, techno.id, 0.5);

      expect(blendResult.success).toBe(true);
      expect(blendResult.data?.blend).toBe(0.5);
      expect(blendResult.data?.from.id).toBe(piano.id);
      expect(blendResult.data?.to.id).toBe(techno.id);
    });

    it('should reject invalid blend values', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;
      const techno = result.data?.performances.find(p => p.name === 'Ambient Techno')!;

      // Test t < 0
      let blendResult = manager.blendPerformances(piano.id, techno.id, -0.1);
      expect(blendResult.success).toBe(false);

      // Test t > 1
      blendResult = manager.blendPerformances(piano.id, techno.id, 1.1);
      expect(blendResult.success).toBe(false);
    });

    it('should reject blending with non-existent performances', () => {
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      manager = result.data!.manager;

      const piano = result.data?.performances.find(p => p.name === 'Solo Piano')!;

      const blendResult = manager.blendPerformances(piano.id, 'non-existent', 0.5);

      expect(blendResult.success).toBe(false);
      expect(blendResult.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('End-to-End Flow: Piano → Techno Switch', () => {
    it('should demonstrate the "magic moment" - complete performance switch', () => {
      // 1. Create song with default performances
      const result = createPerformanceManagerWithDefaults(mockSongModel);
      expect(result.success).toBe(true);
      manager = result.data!.manager;

      const performances = result.data!.performances;
      expect(performances).toHaveLength(3);

      // 2. Get Piano and Techno performances
      const piano = performances.find(p => p.name === 'Solo Piano')!;
      const techno = performances.find(p => p.name === 'Ambient Techno')!;

      expect(piano).toBeDefined();
      expect(techno).toBeDefined();

      // 3. Verify Piano is active initially
      expect(manager.getActivePerformance()?.id).toBe(piano.id);
      expect(manager.getActivePerformance()?.name).toBe('Solo Piano');

      // 4. Verify Piano properties
      expect(piano.arrangementStyle).toBe('SOLO_PIANO');
      expect(piano.density).toBeLessThan(0.5);
      expect(piano.instrumentationMap).toHaveLength(1);
      expect(piano.consoleXProfileId).toBe('consolex-piano-solo');

      // 5. Switch to Techno
      const switchResult = manager.switchPerformance(techno.id);
      expect(switchResult.success).toBe(true);

      // 6. Verify Techno is now active
      expect(manager.getActivePerformance()?.id).toBe(techno.id);
      expect(manager.getActivePerformance()?.name).toBe('Ambient Techno');

      // 7. Verify Techno properties
      expect(techno.arrangementStyle).toBe('AMBIENT_TECHNO');
      expect(techno.density).toBeGreaterThan(0.7);
      expect(techno.instrumentationMap.length).toBeGreaterThan(4);
      expect(techno.consoleXProfileId).toBe('consolex-techno');

      // 8. Verify SongModel is updated
      const updatedSongModel = manager.getSongModel();
      expect(updatedSongModel.activePerformanceId).toBe(techno.id);
      expect(updatedSongModel.performances).toHaveLength(3);

      // 9. Switch back to Piano
      const switchBackResult = manager.switchPerformance(piano.id);
      expect(switchBackResult.success).toBe(true);
      expect(manager.getActivePerformance()?.id).toBe(piano.id);

      // This is the "magic moment":
      // - User hits play (song starts with Piano performance)
      // - User taps 'Techno' in UI
      // - Song transforms at next bar boundary (no audio glitches)
      // - Instrumentation: Single NexSynth → Multiple synths (NexSynth + KaneMarco)
      // - Density: Sparse (0.3) → Dense (0.8)
      // - ConsoleX: consolex-piano-solo → consolex-techno
      // - Groove profile changes
      // - Mix targets change (gain/pan per voice)
    });
  });
});
