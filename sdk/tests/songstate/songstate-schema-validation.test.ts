/**
 * Comprehensive SongState Schema Validation Tests
 *
 * Tests all aspects of SongState schema validation:
 * - Required fields
 * - Type validation
 * - Range validation
 * - Reference validation
 * - Performance state support
 * - Edge cases and error scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateSongState,
  validateSchillingerSong,
  validatePerformanceState,
  SongModel,
  SchillingerSong,
  PerformanceState,
  ArrangementStyle,
} from '@schillinger-sdk/schemas';
import {
  createMinimalSchillingerSong,
  createTypicalSchillingerSong,
  createInvalidSchillingerSong,
  createTypicalSongModel,
  createMinimalSongModel,
  createMinimalPerformanceState,
  createTypicalPerformanceState,
  createPianoPerformance,
  createSATBPerformance,
  createOrchestralPerformance,
} from '../fixtures/test-factories';
import {
  assertValidSongState,
  assertInvalidSongState,
  assertPerformanceValid,
} from '../utilities/test-helpers';

describe('SongState Schema Validation', () => {
  describe('Required Fields', () => {
    it('should validate SongState with all required fields', () => {
      const song = createTypicalSchillingerSong(42);
      const result = validateSchillingerSong(song);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject SongState without version', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).version;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without id', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).id;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without createdAt timestamp', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).createdAt;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without seed', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).seed;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without ensemble', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).ensemble;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without form system (book4)', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).book4;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SongState without console', () => {
      const song = createTypicalSchillingerSong(42);
      delete (song as Partial<SchillingerSong>).console;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Type Validation', () => {
    it('should reject SongState with invalid version type', () => {
      const song = createTypicalSchillingerSong(42);
      (song as any).version = '2.0';

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject SongState with invalid id type', () => {
      const song = createTypicalSchillingerSong(42);
      (song as any).id = 12345;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject SongState with invalid seed type', () => {
      const song = createTypicalSchillingerSong(42);
      (song as any).seed = '42';

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject SongState with invalid timestamp type', () => {
      const song = createTypicalSchillingerSong(42);
      (song as any).createdAt = '2024-01-01';

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject SongState with invalid voiceCount type', () => {
      const song = createTypicalSchillingerSong(42);
      (song as any).ensemble.voiceCount = '4';

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });
  });

  describe('Range Validation', () => {
    it('should reject seed value outside valid range', () => {
      const song = createTypicalSchillingerSong(42);
      song.seed = -1;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject voiceCount less than 1', () => {
      const song = createTypicalSchillingerSong(42);
      song.ensemble.voiceCount = 0;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject voiceCount greater than 100', () => {
      const song = createTypicalSchillingerSong(42);
      song.ensemble.voiceCount = 101;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject maxVoices less than 1', () => {
      const song = createTypicalSchillingerSong(42);
      song.ensemble.balance!.limits!.maxVoices = 0;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject maxPolyphony less than 1', () => {
      const song = createTypicalSchillingerSong(42);
      song.ensemble.balance!.limits!.maxPolyphony = 0;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should reject maxPolyphony greater than 200', () => {
      const song = createTypicalSchillingerSong(42);
      song.ensemble.balance!.limits!.maxPolyphony = 201;

      const result = validateSchillingerSong(song);

      expect(result.success).toBe(false);
    });

    it('should accept valid boundary values for seed', () => {
      const song1 = createTypicalSchillingerSong(0);
      const song2 = createTypicalSchillingerSong(Math.pow(2, 32) - 1);

      const result1 = validateSchillingerSong(song1);
      const result2 = validateSchillingerSong(song2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should accept valid boundary values for voiceCount', () => {
      const song1 = createTypicalSchillingerSong(42);
      const song2 = createTypicalSchillingerSong(43);

      song1.ensemble.voiceCount = 1;
      song2.ensemble.voiceCount = 100;

      const result1 = validateSchillingerSong(song1);
      const result2 = validateSchillingerSong(song2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Reference Validation', () => {
    it('should validate consistent voice group references', () => {
      const song = createTypicalSchillingerSong(42);

      // All voice IDs in groups should exist in ensemble
      song.ensemble.groups?.forEach(group => {
        group.voiceIds.forEach(voiceId => {
          const voiceExists = song.ensemble.voices.some(v => v.id === voiceId);
          expect(voiceExists).toBe(true);
        });
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should detect orphaned voice group references', () => {
      const song = createTypicalSchillingerSong(42);

      // Add a voice ID that doesn't exist
      if (song.ensemble.groups && song.ensemble.groups.length > 0) {
        song.ensemble.groups[0].voiceIds.push('non-existent-voice-id');
      }

      const result = validateSchillingerSong(song);

      // This should either fail validation or be caught by reference checks
      // The exact behavior depends on the validation implementation
      expect(result.success).toBe(false);
    });

    it('should validate console routing references', () => {
      const song = createTypicalSchillingerSong(42);

      // All source and destination bus IDs should exist
      song.console.routing.routes.forEach(route => {
        const sourceExists =
          route.sourceBusId === song.console.masterBus.id ||
          song.console.voiceBusses.some(b => b.id === route.sourceBusId) ||
          song.console.mixBusses.some(b => b.id === route.sourceBusId);

        const destExists =
          route.destinationBusId === song.console.masterBus.id ||
          song.console.voiceBusses.some(b => b.id === route.destinationBusId) ||
          song.console.mixBusses.some(b => b.id === route.destinationBusId);

        expect(sourceExists).toBe(true);
        expect(destExists).toBe(true);
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });
  });

  describe('Book System Validation', () => {
    it('should accept song with all book systems', () => {
      const song = createTypicalSchillingerSong(42, {
        rhythmSystemCount: 2,
        melodySystemCount: 2,
        harmonySystemCount: 1,
        orchestrationSystemCount: 1,
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should accept song with only required book systems', () => {
      const song = createMinimalSchillingerSong(42);

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate rhythm system structure', () => {
      const song = createTypicalSchillingerSong(42);

      song.book1?.forEach(rhythm => {
        expect(rhythm.id).toBeDefined();
        expect(rhythm.type).toBeDefined();
        expect(rhythm.generators).toBeDefined();
        expect(rhythm.generators.length).toBeGreaterThan(0);

        // Check generators
        rhythm.generators.forEach(gen => {
          expect(gen.period).toBeGreaterThanOrEqual(1);
          expect(gen.phaseOffset).toBeGreaterThanOrEqual(0);
        });
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate melody system structure', () => {
      const song = createTypicalSchillingerSong(42);

      song.book2?.forEach(melody => {
        expect(melody.id).toBeDefined();
        expect(melody.type).toBeDefined();

        if (melody.type === 'pitch_cycle') {
          expect(melody.cycleLength).toBeGreaterThanOrEqual(1);
        }

        if (melody.type === 'interval_seed') {
          expect(melody.intervalSeeds).toBeDefined();
        }
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate form system structure', () => {
      const song = createTypicalSchillingerSong(42);

      expect(song.book4.id).toBeDefined();
      expect(song.book4.ratioTree).toBeDefined();
      expect(song.book4.ratioTree.length).toBeGreaterThan(0);

      if (song.book4.sections) {
        song.book4.sections.forEach(section => {
          expect(section.id).toBeDefined();
          expect(section.name).toBeDefined();
          expect(section.ratio).toBeGreaterThan(0);
        });
      }

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate orchestration system structure', () => {
      const song = createTypicalSchillingerSong(42);

      song.book5?.forEach(orch => {
        expect(orch.id).toBeDefined();
        expect(orch.type).toBeDefined();
        expect(orch.functionalClasses).toBeDefined();
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });
  });

  describe('Ensemble Model Validation', () => {
    it('should validate voice structure', () => {
      const song = createTypicalSchillingerSong(42);

      song.ensemble.voices.forEach(voice => {
        expect(voice.id).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.rolePools).toBeDefined();
        expect(voice.rolePools.length).toBeGreaterThan(0);

        // Check role pools
        voice.rolePools.forEach(pool => {
          expect(['primary', 'secondary', 'tertiary']).toContain(pool.role);
          expect(['foundation', 'motion', 'ornament', 'reinforcement']).toContain(
            pool.functionalClass
          );
          expect(typeof pool.enabled).toBe('boolean');
        });
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate voice group structure', () => {
      const song = createTypicalSchillingerSong(42);

      song.ensemble.groups?.forEach(group => {
        expect(group.id).toBeDefined();
        expect(group.name).toBeDefined();
        expect(group.voiceIds).toBeDefined();
        expect(group.voiceIds.length).toBeGreaterThan(0);
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate balance rules', () => {
      const song = createTypicalSchillingerSong(42);

      if (song.ensemble.balance) {
        if (song.ensemble.balance.priority) {
          expect(song.ensemble.balance.priority.length).toBeGreaterThan(0);
        }

        if (song.ensemble.balance.limits) {
          expect(song.ensemble.balance.limits.maxVoices).toBeGreaterThanOrEqual(1);
          expect(song.ensemble.balance.limits.maxPolyphony).toBeGreaterThanOrEqual(1);
        }
      }

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate voiceCount matches voices array', () => {
      const song = createTypicalSchillingerSong(42);

      expect(song.ensemble.voiceCount).toBe(song.ensemble.voices.length);

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });
  });

  describe('Console Model Validation', () => {
    it('should validate bus structure', () => {
      const song = createTypicalSchillingerSong(42);

      const allBuses = [
        ...song.console.voiceBusses,
        ...song.console.mixBusses,
        song.console.masterBus,
      ];

      allBuses.forEach(bus => {
        expect(bus.id).toBeDefined();
        expect(bus.name).toBeDefined();
        expect(bus.type).toBeDefined();
        expect(['voice', 'mix', 'master']).toContain(bus.type);
        expect(typeof bus.gain).toBe('number');
        expect(bus.pan).toBeGreaterThanOrEqual(-1);
        expect(bus.pan).toBeLessThanOrEqual(1);
        expect(typeof bus.muted).toBe('boolean');
        expect(typeof bus.solo).toBe('boolean');
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate effect slot structure', () => {
      const song = createTypicalSchillingerSong(42);

      const allBuses = [
        ...song.console.voiceBusses,
        ...song.console.mixBusses,
        song.console.masterBus,
      ];

      allBuses.forEach(bus => {
        bus.inserts.forEach(slot => {
          expect(slot.id).toBeDefined();
          expect(slot.effectType).toBeDefined();
          expect(typeof slot.enabled).toBe('boolean');
          expect(typeof slot.bypassed).toBe('boolean');
          expect(slot.parameters).toBeDefined();
        });
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate routing matrix', () => {
      const song = createTypicalSchillingerSong(42);

      song.console.routing.routes.forEach(route => {
        expect(route.sourceBusId).toBeDefined();
        expect(route.destinationBusId).toBeDefined();
        expect(typeof route.level).toBe('number');
        expect(typeof route.enabled).toBe('boolean');
      });

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });

    it('should validate metering configuration', () => {
      const song = createTypicalSchillingerSong(42);

      if (song.console.metering) {
        if (song.console.metering.refreshRate) {
          expect(song.console.metering.refreshRate).toBeGreaterThanOrEqual(10);
          expect(song.console.metering.refreshRate).toBeLessThanOrEqual(60);
        }

        if (song.console.metering.meterType) {
          expect(['peak', 'rms', 'both']).toContain(song.console.metering.meterType);
        }
      }

      const result = validateSchillingerSong(song);
      expect(result.success).toBe(true);
    });
  });
});

describe('PerformanceState Schema Validation', () => {
  describe('Required Fields', () => {
    it('should validate PerformanceState with all required fields', () => {
      const performance = createTypicalPerformanceState(42);
      const result = validatePerformanceState(performance);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject PerformanceState without id', () => {
      const performance = createTypicalPerformanceState(42);
      delete (performance as Partial<PerformanceState>).id;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject PerformanceState without name', () => {
      const performance = createTypicalPerformanceState(42);
      delete (performance as Partial<PerformanceState>).name;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject PerformanceState without arrangementStyle', () => {
      const performance = createTypicalPerformanceState(42);
      delete (performance as Partial<PerformanceState>).arrangementStyle;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject PerformanceState without density', () => {
      const performance = createTypicalPerformanceState(42);
      delete (performance as Partial<PerformanceState>).density;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Type Validation', () => {
    it('should reject invalid arrangementStyle', () => {
      const performance = createTypicalPerformanceState(42);
      (performance as any).arrangementStyle = 'INVALID_STYLE';

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });

    it('should reject invalid density type', () => {
      const performance = createTypicalPerformanceState(42);
      (performance as any).density = '0.5';

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const performance = createTypicalPerformanceState(42);
      (performance as any).createdAt = 1234567890;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });
  });

  describe('Range Validation', () => {
    it('should reject density less than 0', () => {
      const performance = createTypicalPerformanceState(42);
      performance.density = -0.1;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });

    it('should reject density greater than 1', () => {
      const performance = createTypicalPerformanceState(42);
      performance.density = 1.1;

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });

    it('should accept valid boundary values for density', () => {
      const perf1 = createTypicalPerformanceState(42);
      const perf2 = createTypicalPerformanceState(43);

      perf1.density = 0;
      perf2.density = 1;

      const result1 = validatePerformanceState(perf1);
      const result2 = validatePerformanceState(perf2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject mix target gain out of range', () => {
      const performance = createTypicalPerformanceState(42);
      performance.mixTargets.primary = { gain: -100, pan: 0 };

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });

    it('should reject mix target pan out of range', () => {
      const performance = createTypicalPerformanceState(42);
      performance.mixTargets.primary = { gain: -6, pan: 2 };

      const result = validatePerformanceState(performance);

      expect(result.success).toBe(false);
    });
  });

  describe('Arrangement Styles', () => {
    it('should validate SOLO_PIANO arrangement', () => {
      const performance = createPianoPerformance(42);
      assertPerformanceValid(performance);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should validate SATB arrangement', () => {
      const performance = createSATBPerformance(42);
      assertPerformanceValid(performance);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should validate FULL_ORCHESTRA arrangement', () => {
      const performance = createOrchestralPerformance(42);
      assertPerformanceValid(performance);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should validate all arrangement styles', () => {
      const styles = Object.values(ArrangementStyle);

      styles.forEach(style => {
        const performance = createTypicalPerformanceState(42, {
          arrangementStyle: style,
        });

        const result = validatePerformanceState(performance);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Instrumentation Map', () => {
    it('should validate instrumentation map structure', () => {
      const performance = createTypicalPerformanceState(42);

      Object.entries(performance.instrumentationMap).forEach(([role, assignment]) => {
        expect(assignment.instrumentId).toBeDefined();
        expect(typeof assignment.instrumentId).toBe('string');

        if (assignment.presetId) {
          expect(typeof assignment.presetId).toBe('string');
        }

        if (assignment.parameters) {
          expect(typeof assignment.parameters).toBe('object');
        }
      });

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should accept empty instrumentation map', () => {
      const performance = createMinimalPerformanceState(42);

      expect(Object.keys(performance.instrumentationMap).length).toBe(0);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });
  });

  describe('Mix Targets', () => {
    it('should validate mix target structure', () => {
      const performance = createTypicalPerformanceState(42);

      Object.entries(performance.mixTargets).forEach(([role, target]) => {
        expect(typeof target.gain).toBe('number');
        expect(target.gain).toBeGreaterThanOrEqual(-60);
        expect(target.gain).toBeLessThanOrEqual(0);

        expect(typeof target.pan).toBe('number');
        expect(target.pan).toBeGreaterThanOrEqual(-1);
        expect(target.pan).toBeLessThanOrEqual(1);

        if (target.stereo !== undefined) {
          expect(typeof target.stereo).toBe('boolean');
        }
      });

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should accept empty mix targets', () => {
      const performance = createMinimalPerformanceState(42);

      expect(Object.keys(performance.mixTargets).length).toBe(0);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate ISO 8601 timestamp format', () => {
      const performance = createTypicalPerformanceState(42);

      expect(performance.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(performance.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should reject non-ISO timestamp format', () => {
      const performance = createTypicalPerformanceState(42);
      performance.createdAt = 'not-a-timestamp';

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(false);
    });
  });

  describe('Metadata Validation', () => {
    it('should accept valid metadata object', () => {
      const performance = createTypicalPerformanceState(42);
      performance.metadata = {
        customField: 'value',
        number: 42,
        nested: { object: true },
      };

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });

    it('should accept performance without metadata', () => {
      const performance = createMinimalPerformanceState(42);
      delete performance.metadata;

      const result = validatePerformanceState(performance);
      expect(result.success).toBe(true);
    });
  });
});

describe('SongModel Schema Validation', () => {
  describe('Required Fields', () => {
    it('should validate SongModel with all required fields', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      expect(() => validateSongState(songModel)).not.toThrow();
    });

    it('should reject SongModel without version', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).version;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject SongModel without sourceSongId', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).sourceSongId;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject SongModel without timeline', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).timeline;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject SongModel without notes', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).notes;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject SongModel without voiceAssignments', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).voiceAssignments;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject SongModel without performances array', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      delete (songModel as Partial<SongModel>).performances;

      expect(() => validateSongState(songModel)).toThrow();
    });
  });

  describe('Range Validation', () => {
    it('should reject tempo less than or equal to 0', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      songModel.tempo = 0;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject tempo greater than 500', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      songModel.tempo = 501;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should reject invalid sample rate', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      songModel.sampleRate = 48001;

      expect(() => validateSongState(songModel)).toThrow();
    });

    it('should accept valid sample rates', () => {
      const sourceSong = createTypicalSchillingerSong(42);

      [44100, 48000, 96000].forEach(sampleRate => {
        const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
        songModel.sampleRate = sampleRate;

        expect(() => validateSongState(songModel)).not.toThrow();
      });
    });
  });

  describe('Performance Support', () => {
    it('should validate SongModel with performances array', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      songModel.performances = [
        createPianoPerformance(1),
        createSATBPerformance(2),
        createOrchestralPerformance(3),
      ];

      expect(() => validateSongState(songModel)).not.toThrow();
      expect(songModel.performances).toHaveLength(3);
    });

    it('should validate SongModel with empty performances array', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      songModel.performances = [];

      expect(() => validateSongState(songModel)).not.toThrow();
    });

    it('should validate activePerformanceId reference', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      const perf1 = createPianoPerformance(1);
      const perf2 = createSATBPerformance(2);

      songModel.performances = [perf1, perf2];
      songModel.activePerformanceId = perf2.id;

      expect(() => validateSongState(songModel)).not.toThrow();
    });

    it('should reject invalid activePerformanceId', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      songModel.performances = [createPianoPerformance(1)];
      songModel.activePerformanceId = 'non-existent-performance-id';

      expect(() => validateSongState(songModel)).toThrow();
    });
  });

  describe('Timeline Validation', () => {
    it('should validate timeline structure', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      expect(songModel.timeline.sections).toBeDefined();
      expect(songModel.timeline.sections.length).toBeGreaterThan(0);
      expect(songModel.timeline.tempo).toBeGreaterThan(0);
      expect(songModel.timeline.timeSignature).toHaveLength(2);

      songModel.timeline.sections.forEach(section => {
        expect(section.id).toBeDefined();
        expect(section.name).toBeDefined();
        expect(section.startTime).toBeGreaterThanOrEqual(0);
        expect(section.duration).toBeGreaterThan(0);
        expect(section.tempo).toBeGreaterThan(0);
        expect(section.timeSignature).toHaveLength(2);
      });

      expect(() => validateSongState(songModel)).not.toThrow();
    });

    it('should reject timeline with zero sections', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);
      songModel.timeline.sections = [];

      expect(() => validateSongState(songModel)).toThrow();
    });
  });

  describe('Note Validation', () => {
    it('should validate note structure', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      songModel.notes.forEach(note => {
        expect(note.id).toBeDefined();
        expect(note.voiceId).toBeDefined();
        expect(note.startTime).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThanOrEqual(0);
        expect(note.velocity).toBeLessThanOrEqual(1);
      });

      expect(() => validateSongState(songModel)).not.toThrow();
    });

    it('should reject note with invalid pitch', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      if (songModel.notes.length > 0) {
        songModel.notes[0].pitch = 128;

        expect(() => validateSongState(songModel)).toThrow();
      }
    });

    it('should reject note with invalid velocity', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      if (songModel.notes.length > 0) {
        songModel.notes[0].velocity = 1.5;

        expect(() => validateSongState(songModel)).toThrow();
      }
    });
  });

  describe('Console Validation', () => {
    it('should validate console structure in SongModel', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, 'derivation-id', 42);

      expect(songModel.console).toBeDefined();
      expect(songModel.console.version).toBeDefined();
      expect(songModel.console.id).toBeDefined();
      expect(songModel.console.masterBus).toBeDefined();

      expect(() => validateSongState(songModel)).not.toThrow();
    });
  });
});
