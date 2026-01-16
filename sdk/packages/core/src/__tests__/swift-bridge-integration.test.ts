/**
 * Swift Bridge Integration Tests
 *
 * Tests the SDK functions that will be bundled for JavaScriptCore.
 * Validates createSchillingerSong and realizeSong functions.
 *
 * **Test Strategy:**
 * - Test createSchillingerSong with UI parameters
 * - Test realizeSong with seed
 * - Validate JSON structures match Swift expectations
 * - Verify Note structure matches Swift bridge
 *
 * Created by Claude on 2026-01-13.
 */

import { describe, it, expect } from 'vitest';
import { createSchillingerSong, realizeSong, getVersion } from '../sdk-bundle';

// Types matching Swift bridge expectations
interface SwiftNote {
  noteId: string;
  voiceId: string;
  startTime: number;
  duration: number;
  pitch: number;
  velocity: number;
  derivationSource: string;
}

interface SwiftSongModel {
  schemaVersion: string;
  songId: string;
  derivationId: string;
  notes: SwiftNote[];
  events: any[];
  voiceAssignments: any[];
  duration: number;
  tempoChanges: any[];
  sections: SwiftSection[];
}

interface SwiftSection {
  sectionId: string;
  name: string;
  startTime: number;
  duration: number;
}

describe('Swift Bridge Integration', () => {
  describe('SDK Functions', () => {
    it('should export createSchillingerSong function', () => {
      expect(typeof createSchillingerSong).toBe('function');
    });

    it('should export realizeSong function', () => {
      expect(typeof realizeSong).toBe('function');
    });

    it('should export getVersion function', () => {
      expect(typeof getVersion).toBe('function');
    });

    it('should return correct version', () => {
      const version = getVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('createSchillingerSong', () => {
    it('should create SchillingerSong from UI parameters', () => {
      const params = {
        tempo: 120,
        timeSignatureNumerator: 4,
        timeSignatureDenominator: 4,
        scale: 'Major',
        rootNote: 0,
        resultantType: 'resultant',
        periodicityA: 3,
        periodicityB: 4,
        periodicityC: 0,
        density: 0.5,
        complexity: 0.5,
        rhythmicDensity: 0.5,
        syncopation: 0,
        melodyContour: 0.5,
        intervalRange: 0.5,
        stepLeaping: 0.5,
        repetition: 0.5,
        sequenceLength: 8,
        harmonyType: 'functional',
        harmonicRhythm: 1.0,
        chordDensity: 0.5,
        voiceLeading: 0.5,
        tension: 0.5,
        sections: 1,
        sectionLength: 8,
        transitionType: 'crossfade',
        development: 0.5,
        register: 0.5,
        texture: 0.5,
        articulation: 0.5,
        dynamics: 0.5,
        timbre: 0.5,
      };

      const songJson = createSchillingerSong(params);

      expect(typeof songJson).toBe('string');

      const song = JSON.parse(songJson);

      // Validate SchillingerSong structure
      expect(song.schemaVersion).toBe('1.0');
      expect(song.songId).toBeDefined();
      expect(typeof song.songId).toBe('string');
      expect(song.globals).toBeDefined();
      expect(song.globals.tempo).toBe(120);
      expect(song.globals.timeSignature).toEqual([4, 4]);
      expect(song.globals.key).toBe(0);

      // Validate systems
      expect(song.bookI_rhythmSystems).toBeDefined();
      expect(Array.isArray(song.bookI_rhythmSystems)).toBe(true);
      expect(song.bookI_rhythmSystems.length).toBeGreaterThan(0);

      expect(song.bookII_melodySystems).toBeDefined();
      expect(Array.isArray(song.bookII_melodySystems)).toBe(true);

      expect(song.bookIII_harmonySystems).toBeDefined();
      expect(Array.isArray(song.bookIII_harmonySystems)).toBe(true);

      expect(song.bookV_orchestration).toBeDefined();
      expect(song.ensembleModel).toBeDefined();

      // Validate bindings
      expect(song.bindings).toBeDefined();
      expect(song.bindings.roleRhythmBindings).toBeDefined();
      expect(song.bindings.roleMelodyBindings).toBeDefined();
      expect(song.bindings.roleHarmonyBindings).toBeDefined();
      expect(song.bindings.roleEnsembleBindings).toBeDefined();

      // Validate provenance
      expect(song.provenance).toBeDefined();
      expect(song.provenance.createdAt).toBeDefined();
      expect(song.provenance.createdBy).toBeDefined();
    });

    it('should handle different scales', () => {
      const scales = ['Major', 'Minor', 'Pentatonic', 'Blues', 'Chromatic'];

      scales.forEach((scale) => {
        const params = {
          tempo: 120,
          timeSignatureNumerator: 4,
          timeSignatureDenominator: 4,
          scale,
          rootNote: 0,
          resultantType: 'resultant',
          periodicityA: 3,
          periodicityB: 4,
          periodicityC: 0,
          density: 0.5,
          complexity: 0.5,
          rhythmicDensity: 0.5,
          syncopation: 0,
          melodyContour: 0.5,
          intervalRange: 0.5,
          stepLeaping: 0.5,
          repetition: 0.5,
          sequenceLength: 8,
          harmonyType: 'functional',
          harmonicRhythm: 1.0,
          chordDensity: 0.5,
          voiceLeading: 0.5,
          tension: 0.5,
          sections: 1,
          sectionLength: 8,
          transitionType: 'crossfade',
          development: 0.5,
          register: 0.5,
          texture: 0.5,
          articulation: 0.5,
          dynamics: 0.5,
          timbre: 0.5,
        };

        const songJson = createSchillingerSong(params);
        const song = JSON.parse(songJson);

        expect(song.globals.key).toBe(0);
      });
    });

    it('should handle default parameters', () => {
      const minimalParams = {
        tempo: 140,
        timeSignatureNumerator: 3,
        timeSignatureDenominator: 4,
        scale: 'Minor',
        rootNote: 7,
      };

      const songJson = createSchillingerSong(minimalParams);
      const song = JSON.parse(songJson);

      expect(song.globals.tempo).toBe(140);
      expect(song.globals.timeSignature).toEqual([3, 4]);
      expect(song.globals.key).toBe(7);
    });
  });

  describe('realizeSong', () => {
    it('should realize SchillingerSong into notes', async () => {
      // First create a song
      const params = {
        tempo: 120,
        timeSignatureNumerator: 4,
        timeSignatureDenominator: 4,
        scale: 'Major',
        rootNote: 0,
        resultantType: 'resultant',
        periodicityA: 3,
        periodicityB: 4,
        periodicityC: 0,
        density: 0.5,
        complexity: 0.5,
        rhythmicDensity: 0.5,
        syncopation: 0,
        melodyContour: 0.5,
        intervalRange: 0.5,
        stepLeaping: 0.5,
        repetition: 0.5,
        sequenceLength: 8,
        harmonyType: 'functional',
        harmonicRhythm: 1.0,
        chordDensity: 0.5,
        voiceLeading: 0.5,
        tension: 0.5,
        sections: 1,
        sectionLength: 8,
        transitionType: 'crossfade',
        development: 0.5,
        register: 0.5,
        texture: 0.5,
        articulation: 0.5,
        dynamics: 0.5,
        timbre: 0.5,
      };

      const songJson = createSchillingerSong(params);

      // Then realize it
      const seed = 42;
      const songModelJson = await realizeSong(songJson, seed);

      expect(typeof songModelJson).toBe('string');

      const songModel = JSON.parse(songModelJson) as SwiftSongModel;

      // Validate SongModel structure
      expect(songModel.schemaVersion).toBe('1.0');
      expect(songModel.songId).toBeDefined();
      expect(songModel.derivationId).toBeDefined();
      expect(Array.isArray(songModel.notes)).toBe(true);
      expect(Array.isArray(songModel.events)).toBe(true);
      expect(Array.isArray(songModel.voiceAssignments)).toBe(true);
      expect(typeof songModel.duration).toBe('number');
      expect(Array.isArray(songModel.tempoChanges)).toBe(true);
      expect(Array.isArray(songModel.sections)).toBe(true);

      // Validate notes exist
      expect(songModel.notes.length).toBeGreaterThan(0);

      // Validate first note structure
      const firstNote = songModel.notes[0];
      expect(firstNote.noteId).toBeDefined();
      expect(typeof firstNote.noteId).toBe('string');
      expect(firstNote.voiceId).toBeDefined();
      expect(typeof firstNote.voiceId).toBe('string');
      expect(typeof firstNote.startTime).toBe('number');
      expect(typeof firstNote.duration).toBe('number');
      expect(typeof firstNote.pitch).toBe('number');
      expect(typeof firstNote.velocity).toBe('number');
      expect(firstNote.derivationSource).toBeDefined();

      // Validate pitch range (MIDI note numbers)
      expect(firstNote.pitch).toBeGreaterThanOrEqual(0);
      expect(firstNote.pitch).toBeLessThanOrEqual(127);

      // Validate velocity range
      expect(firstNote.velocity).toBeGreaterThanOrEqual(0);
      expect(firstNote.velocity).toBeLessThanOrEqual(127);

      // Validate timing
      expect(firstNote.startTime).toBeGreaterThanOrEqual(0);
      expect(firstNote.duration).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', async () => {
      const params = {
        tempo: 120,
        timeSignatureNumerator: 4,
        timeSignatureDenominator: 4,
        scale: 'Major',
        rootNote: 0,
        resultantType: 'resultant',
        periodicityA: 3,
        periodicityB: 4,
        periodicityC: 0,
        density: 0.5,
        complexity: 0.5,
        rhythmicDensity: 0.5,
        syncopation: 0,
        melodyContour: 0.5,
        intervalRange: 0.5,
        stepLeaping: 0.5,
        repetition: 0.5,
        sequenceLength: 8,
        harmonyType: 'functional',
        harmonicRhythm: 1.0,
        chordDensity: 0.5,
        voiceLeading: 0.5,
        tension: 0.5,
        sections: 1,
        sectionLength: 8,
        transitionType: 'crossfade',
        development: 0.5,
        register: 0.5,
        texture: 0.5,
        articulation: 0.5,
        dynamics: 0.5,
        timbre: 0.5,
      };

      const songJson = createSchillingerSong(params);
      const seed = 12345;

      const result1 = await realizeSong(songJson, seed);
      const result2 = await realizeSong(songJson, seed);

      const songModel1 = JSON.parse(result1) as SwiftSongModel;
      const songModel2 = JSON.parse(result2) as SwiftSongModel;

      // Same seed should produce identical results
      expect(songModel1.notes.length).toBe(songModel2.notes.length);

      songModel1.notes.forEach((note, i) => {
        const note2 = songModel2.notes[i];
        expect(note.noteId).toBe(note2.noteId);
        expect(note.voiceId).toBe(note2.voiceId);
        expect(note.startTime).toBe(note2.startTime);
        expect(note.duration).toBe(note2.duration);
        expect(note.pitch).toBe(note2.pitch);
        expect(note.velocity).toBe(note2.velocity);
      });
    });

    it('should produce different results with different seeds', async () => {
      const params = {
        tempo: 120,
        timeSignatureNumerator: 4,
        timeSignatureDenominator: 4,
        scale: 'Major',
        rootNote: 0,
        resultantType: 'resultant',
        periodicityA: 3,
        periodicityB: 4,
        periodicityC: 0,
        density: 0.5,
        complexity: 0.5,
        rhythmicDensity: 0.5,
        syncopation: 0,
        melodyContour: 0.5,
        intervalRange: 0.5,
        stepLeaping: 0.5,
        repetition: 0.5,
        sequenceLength: 8,
        harmonyType: 'functional',
        harmonicRhythm: 1.0,
        chordDensity: 0.5,
        voiceLeading: 0.5,
        tension: 0.5,
        sections: 1,
        sectionLength: 8,
        transitionType: 'crossfade',
        development: 0.5,
        register: 0.5,
        texture: 0.5,
        articulation: 0.5,
        dynamics: 0.5,
        timbre: 0.5,
      };

      const songJson = createSchillingerSong(params);

      const result1 = await realizeSong(songJson, 1);
      const result2 = await realizeSong(songJson, 99999);

      const songModel1 = JSON.parse(result1) as SwiftSongModel;
      const songModel2 = JSON.parse(result2) as SwiftSongModel;

      // Different seeds should produce different results
      // Check if at least some notes differ
      let hasDifference = false;
      const minLength = Math.min(songModel1.notes.length, songModel2.notes.length);

      for (let i = 0; i < minLength; i++) {
        const note1 = songModel1.notes[i];
        const note2 = songModel2.notes[i];

        if (
          note1.pitch !== note2.pitch ||
          note1.startTime !== note2.startTime ||
          note1.duration !== note2.duration
        ) {
          hasDifference = true;
          break;
        }
      }

      expect(hasDifference).toBe(true);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full composition workflow', async () => {
      // This test simulates the complete workflow from Swift frontend
      const uiParameters = {
        tempo: 140,
        timeSignatureNumerator: 3,
        timeSignatureDenominator: 4,
        scale: 'Dorian',
        rootNote: 5, // F
        resultantType: 'interference',
        periodicityA: 5,
        periodicityB: 7,
        periodicityC: 0,
        density: 0.7,
        complexity: 0.6,
        rhythmicDensity: 0.7,
        syncopation: 0.3,
        melodyContour: 0.6,
        intervalRange: 0.7,
        stepLeaping: 0.4,
        repetition: 0.3,
        sequenceLength: 12,
        harmonyType: 'functional',
        harmonicRhythm: 0.5,
        chordDensity: 0.6,
        voiceLeading: 0.7,
        tension: 0.4,
        sections: 2,
        sectionLength: 16,
        transitionType: 'crossfade',
        development: 0.6,
        register: 0.6,
        texture: 0.5,
        articulation: 0.6,
        dynamics: 0.7,
        timbre: 0.5,
      };

      // Step 1: Create SchillingerSong
      const songJson = createSchillingerSong(uiParameters);
      const song = JSON.parse(songJson);

      expect(song.globals.tempo).toBe(140);
      expect(song.globals.timeSignature).toEqual([3, 4]);
      expect(song.globals.key).toBe(5);

      // Step 2: Realize song
      const seed = 42;
      const songModelJson = await realizeSong(songJson, seed);
      const songModel = JSON.parse(songModelJson) as SwiftSongModel;

      // Validate realization
      expect(songModel.notes.length).toBeGreaterThan(0);
      expect(songModel.songId).toBe(song.songId);

      // Validate sections
      if (songModel.sections.length > 0) {
        expect(songModel.sections.length).toBeGreaterThanOrEqual(1);
        expect(songModel.sections[0].name).toBeDefined();
        expect(songModel.sections[0].startTime).toBeDefined();
        expect(songModel.sections[0].duration).toBeGreaterThan(0);
      }

      // Validate voice assignments
      if (songModel.voiceAssignments.length > 0) {
        const assignment = songModel.voiceAssignments[0];
        expect(assignment.voiceId).toBeDefined();
        expect(assignment.roleId).toBeDefined();
        expect(assignment.systemIds).toBeDefined();
        expect(Array.isArray(assignment.systemIds)).toBe(true);
      }

      // Validate notes are sorted by time
      for (let i = 1; i < songModel.notes.length; i++) {
        expect(songModel.notes[i].startTime).toBeGreaterThanOrEqual(
          songModel.notes[i - 1].startTime
        );
      }

      // Calculate total duration
      const totalDuration = songModel.duration;
      expect(totalDuration).toBeGreaterThan(0);

      // Validate no notes extend beyond duration
      const lastNote = songModel.notes[songModel.notes.length - 1];
      expect(lastNote.startTime + lastNote.duration).toBeLessThanOrEqual(
        totalDuration + 0.01 // Allow small floating point error
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid song JSON gracefully', async () => {
      const invalidJson = '{ invalid json }';

      await expect(
        realizeSong(invalidJson, 42)
      ).rejects.toThrow();
    });

    it('should handle missing parameters', () => {
      // Should not crash with minimal parameters
      const minimalParams = {};

      expect(() => {
        createSchillingerSong(minimalParams);
      }).not.toThrow();
    });
  });
});
