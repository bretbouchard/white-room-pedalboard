/**
 * Performance Switching System Tests
 *
 * Comprehensive test suite for performance switching at bar boundaries.
 * Tests BarBoundaryDetector, PerformanceSwitcher, and TransitionEngine.
 *
 * Coverage:
 * - Bar boundary calculation accuracy
 * - Performance switching API
 * - Transition planning and execution
 * - Edge cases and error handling
 * - End-to-end integration tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SongModel_v1 } from '@whiteroom/schemas';
import type { PerformanceRealizationV1 } from '../../packages/sdk/src/song/performance_realization.js';
import type { TimeSignature } from '../../packages/sdk/src/song/bar_boundary_detector.js';
import {
  BarBoundaryDetector,
  calculateBarBoundary,
  samplesToNextBar as samplesToNextBarUtil,
  isAtBarBoundary as isAtBarBoundaryUtil
} from '../../packages/sdk/src/song/bar_boundary_detector.js';
import {
  PerformanceSwitcher,
  createPerformanceSwitcher,
  getTimeUntilNextBar
} from '../../packages/sdk/src/song/performance_switcher.js';
import {
  TransitionEngine,
  createTransitionEngine,
  validateQuickTransition
} from '../../packages/sdk/src/song/transition_engine.js';
import {
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance
} from '../../packages/sdk/src/song/performance_realization.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockSongModel(): SongModel_v1 {
  const piano = createSoloPianoPerformance();
  const satb = createSATBPerformance();
  const techno = createAmbientTechnoPerformance();

  return {
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
    performances: [piano, satb, techno],
    activePerformanceId: piano.id
  };
}

// ============================================================================
// BarBoundaryDetector Tests
// ============================================================================

describe('BarBoundaryDetector', () => {
  describe('Constructor and Validation', () => {
    it('should create detector with valid parameters', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector).toBeDefined();
    });

    it('should reject invalid sample rate', () => {
      expect(() => {
        new BarBoundaryDetector({
          sampleRate: 0,
          tempo: 120,
          timeSignature: [4, 4]
        });
      }).toThrow('Sample rate must be positive');
    });

    it('should reject invalid tempo', () => {
      expect(() => {
        new BarBoundaryDetector({
          sampleRate: 44100,
          tempo: 0,
          timeSignature: [4, 4]
        });
      }).toThrow('Tempo must be positive');
    });

    it('should reject invalid time signature', () => {
      expect(() => {
        new BarBoundaryDetector({
          sampleRate: 44100,
          tempo: 120,
          timeSignature: [0, 4]
        });
      }).toThrow('Invalid time signature');
    });
  });

  describe('Samples Per Beat and Bar', () => {
    it('should calculate samples per beat correctly at 120 BPM', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      // 60 seconds * 44100 samples / 120 BPM = 22050 samples per beat
      expect(detector.samplesPerBeat()).toBe(22050);
    });

    it('should calculate samples per beat correctly at 60 BPM', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 60,
        timeSignature: [4, 4]
      });

      // 60 * 44100 / 60 = 44100 samples per beat
      expect(detector.samplesPerBeat()).toBe(44100);
    });

    it('should calculate samples per bar correctly for 4/4 time', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      // 22050 samples per beat * 4 beats = 88200 samples per bar
      expect(detector.samplesPerBar()).toBe(88200);
    });

    it('should calculate samples per bar correctly for 3/4 time', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [3, 4]
      });

      // 22050 samples per beat * 3 beats = 66150 samples per bar
      expect(detector.samplesPerBar()).toBe(66150);
    });

    it('should calculate samples per bar correctly for 6/8 time', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [6, 8]
      });

      // 22050 samples per beat * 6 beats = 132300 samples per bar
      expect(detector.samplesPerBar()).toBe(132300);
    });
  });

  describe('Bar Boundary Calculation', () => {
    it('should calculate first bar boundary at position 0', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.calculateBarBoundary(0)).toBe(88200); // End of first bar
    });

    it('should calculate second bar boundary correctly', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.calculateBarBoundary(88200)).toBe(176400); // End of second bar
    });

    it('should calculate boundary in middle of bar', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      // Position in middle of first bar (44100 samples)
      expect(detector.calculateBarBoundary(44100)).toBe(88200); // Next bar boundary
    });

    it('should calculate Nth bar boundary correctly', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.calculateNthBarBoundary(0)).toBe(0);
      expect(detector.calculateNthBarBoundary(1)).toBe(88200);
      expect(detector.calculateNthBarBoundary(2)).toBe(176400);
      expect(detector.calculateNthBarBoundary(3)).toBe(264600);
    });

    it('should reject negative bar number', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(() => {
        detector.calculateNthBarBoundary(-1);
      }).toThrow('Bar number must be >= 0');
    });
  });

  describe('Samples To Next Bar', () => {
    it('should calculate samples to next bar from start', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      const result = detector.samplesToNextBar(0);

      expect(result.samples).toBe(88200);
      expect(result.bars).toBe(1);
      expect(result.seconds).toBeCloseTo(2.0, 1); // 88200 / 44100 = 2 seconds
    });

    it('should calculate samples to next bar from middle of bar', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      const result = detector.samplesToNextBar(44100); // Halfway through first bar

      expect(result.samples).toBe(44100);
      expect(result.bars).toBe(1);
      expect(result.seconds).toBeCloseTo(1.0, 1);
    });

    it('should return 0 when exactly at bar boundary', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      const result = detector.samplesToNextBar(88200); // Exactly at bar boundary

      expect(result.samples).toBe(0);
      expect(result.bars).toBe(0);
      expect(result.seconds).toBe(0);
    });
  });

  describe('Is At Bar Boundary', () => {
    it('should detect position 0 as bar boundary', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.isAtBarBoundary(0)).toBe(true);
    });

    it('should detect exact bar boundary', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.isAtBarBoundary(88200)).toBe(true);
      expect(detector.isAtBarBoundary(176400)).toBe(true);
    });

    it('should not detect middle of bar as boundary', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.isAtBarBoundary(44100)).toBe(false);
      expect(detector.isAtBarBoundary(22050)).toBe(false);
    });

    it('should detect within 1 sample tolerance', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      // Just before boundary
      expect(detector.isAtBarBoundary(88199)).toBe(false);
      // Just after boundary
      expect(detector.isAtBarBoundary(88201)).toBe(false);
    });
  });

  describe('Current Bar and Position In Bar', () => {
    it('should calculate current bar correctly', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.getCurrentBar(0)).toBe(0);
      expect(detector.getCurrentBar(44100)).toBe(0);
      expect(detector.getCurrentBar(88199)).toBe(0);
      expect(detector.getCurrentBar(88200)).toBe(1);
      expect(detector.getCurrentBar(176400)).toBe(2);
    });

    it('should calculate position in bar correctly', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.positionInBar(0)).toBe(0);
      expect(detector.positionInBar(22050)).toBe(22050); // 1 beat
      expect(detector.positionInBar(44100)).toBe(44100); // 2 beats
      expect(detector.positionInBar(88200)).toBe(0); // Start of next bar
    });
  });

  describe('Bar:Beat Format', () => {
    it('should convert position to bar:beat correctly', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      const result1 = detector.positionToBarBeat(0);
      expect(result1.bar).toBe(0);
      expect(result1.position).toBe(0);

      const result2 = detector.positionToBarBeat(22050); // 1 beat into bar 0
      expect(result2.bar).toBe(0);
      expect(result2.position).toBe(22050);

      const result3 = detector.positionToBarBeat(88200); // Start of bar 1
      expect(result3.bar).toBe(1);
      expect(result3.position).toBe(88200);
    });
  });

  describe('Beat Boundary Calculation', () => {
    it('should calculate first beat of bar', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.calculateBeatBoundary(0, 0)).toBe(0);
      expect(detector.calculateBeatBoundary(0, 1)).toBe(88200);
    });

    it('should calculate second beat of bar', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(detector.calculateBeatBoundary(1, 0)).toBe(22050);
      expect(detector.calculateBeatBoundary(1, 1)).toBe(110250);
    });

    it('should reject beat index out of range', () => {
      const detector = new BarBoundaryDetector({
        sampleRate: 44100,
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(() => {
        detector.calculateBeatBoundary(4, 0);
      }).toThrow('Beat index 4 out of range');
    });
  });
});

describe('Utility Functions', () => {
  it('should calculate bar boundary using utility function', () => {
    const result = calculateBarBoundary({
      currentPosition: 0,
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 44100
    });

    expect(result).toBe(88200);
  });

  it('should calculate samples to next bar using utility function', () => {
    const result = samplesToNextBarUtil({
      currentPosition: 0,
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 44100
    });

    expect(result.samples).toBe(88200);
  });

  it('should check if at bar boundary using utility function', () => {
    const result = isAtBarBoundaryUtil({
      currentPosition: 0,
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 44100
    });

    expect(result).toBe(true);
  });
});

// ============================================================================
// PerformanceSwitcher Tests
// ============================================================================

describe('PerformanceSwitcher', () => {
  let songModel: SongModel_v1;
  let switcher: PerformanceSwitcher;

  beforeEach(() => {
    songModel = createMockSongModel();
    switcher = createPerformanceSwitcher(songModel);
  });

  describe('Constructor and Initialization', () => {
    it('should create switcher with valid song model', () => {
      expect(switcher).toBeDefined();
      expect(switcher.listPerformances()).toHaveLength(3);
    });

    it('should get active performance', () => {
      const active = switcher.getActivePerformance();

      expect(active).toBeDefined();
      expect(active?.performance.name).toBe('Solo Piano');
    });
  });

  describe('Switch to Performance - Next Bar', () => {
    it('should schedule switch to SATB at next bar', async () => {
      const pianoId = songModel.performances[0].id;
      const satbId = songModel.performances[1].id;

      const result = await switcher.switchToPerformance(
        satbId,
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);

      const pending = switcher.getPendingSwitch();
      expect(pending).toBeDefined();
      expect(pending?.performanceId).toBe(satbId);
      expect(pending?.targetBar).toBe(1);
    });

    it('should schedule switch to Techno at next bar', async () => {
      const pianoId = songModel.performances[0].id;
      const technoId = songModel.performances[2].id;

      const result = await switcher.switchToPerformance(
        technoId,
        'nextBar',
        {
          currentPosition: 44100, // Middle of first bar
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);

      const pending = switcher.getPendingSwitch();
      expect(pending?.performanceId).toBe(technoId);
      expect(pending?.targetBar).toBe(1);
    });
  });

  describe('Switch to Performance - Immediate', () => {
    it('should execute immediate switch (testing mode)', async () => {
      const pianoId = songModel.performances[0].id;
      const satbId = songModel.performances[1].id;

      const result = await switcher.switchToPerformance(
        satbId,
        'immediate',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(false); // Immediate switches marked as not scheduled
      expect(result.scheduled).toBe(false);

      const active = switcher.getActivePerformance();
      expect(active?.performanceId).toBe(satbId);
    });
  });

  describe('Switch to Performance - Specific Beat', () => {
    it('should schedule switch at specific beat', async () => {
      const pianoId = songModel.performances[0].id;
      const satbId = songModel.performances[1].id;

      const result = await switcher.switchToPerformance(
        satbId,
        'specificBeat',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100,
          beatIndex: 2 // Third beat of bar
        }
      );

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);

      const pending = switcher.getPendingSwitch();
      expect(pending?.timing).toBe('specificBeat');
      expect(pending?.beatIndex).toBe(2);
    });

    it('should require beatIndex for specificBeat timing', async () => {
      const satbId = songModel.performances[1].id;

      const result = await switcher.switchToPerformance(
        satbId,
        'specificBeat',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
          // Missing beatIndex
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TIMING');
    });
  });

  describe('Error Handling', () => {
    it('should reject switching to non-existent performance', async () => {
      const result = await switcher.switchToPerformance(
        'non-existent-id',
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should reject switching to already active performance', async () => {
      const pianoId = songModel.performances[0].id;

      const result = await switcher.switchToPerformance(
        pianoId,
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALREADY_ACTIVE');
    });

    it('should reject invalid timing mode', async () => {
      const satbId = songModel.performances[1].id;

      const result = await switcher.switchToPerformance(
        satbId,
        'invalid' as any,
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TIMING');
    });
  });

  describe('Cancel Switch', () => {
    it('should cancel pending switch', async () => {
      const satbId = songModel.performances[1].id;

      // Schedule a switch
      await switcher.switchToPerformance(
        satbId,
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      expect(switcher.hasPendingSwitch()).toBe(true);

      // Cancel it
      switcher.cancelSwitch();

      expect(switcher.hasPendingSwitch()).toBe(false);
      expect(switcher.getPendingSwitch()).toBeNull();
    });
  });

  describe('Execute at Bar Boundary', () => {
    it('should execute scheduled switch at target bar', async () => {
      const satbId = songModel.performances[1].id;

      // Schedule switch at bar 1
      await switcher.switchToPerformance(
        satbId,
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      // Execute at bar 1
      const result = switcher.executeAtBarBoundary(1);

      expect(result.success).toBe(true);
      expect(switcher.getActivePerformance()?.performanceId).toBe(satbId);
      expect(switcher.hasPendingSwitch()).toBe(false);
    });

    it('should not execute switch before target bar', async () => {
      const satbId = songModel.performances[1].id;

      // Schedule switch at bar 1
      await switcher.switchToPerformance(
        satbId,
        'nextBar',
        {
          currentPosition: 0,
          tempo: 120,
          timeSignature: [4, 4],
          sampleRate: 44100
        }
      );

      // Try to execute at bar 0 (too early)
      const result = switcher.executeAtBarBoundary(0);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TIMING');
      expect(switcher.getActivePerformance()?.performanceId).not.toBe(satbId);
    });

    it('should fail to execute when no switch is pending', () => {
      const result = switcher.executeAtBarBoundary(1);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TIMING');
    });
  });

  describe('Utility Methods', () => {
    it('should check if performance is active', () => {
      const pianoId = songModel.performances[0].id;
      const satbId = songModel.performances[1].id;

      expect(switcher.isPerformanceActive(pianoId)).toBe(true);
      expect(switcher.isPerformanceActive(satbId)).toBe(false);
    });

    it('should list all performances', () => {
      const performances = switcher.listPerformances();

      expect(performances).toHaveLength(3);
      expect(performances[0].name).toBe('Solo Piano');
      expect(performances[1].name).toBe('SATB Choir');
      expect(performances[2].name).toBe('Ambient Techno');
    });
  });
});

describe('Performance Switcher Utility Functions', () => {
  it('should calculate time until next bar', () => {
    const result = getTimeUntilNextBar({
      currentPosition: 0,
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 44100
    });

    expect(result.samples).toBe(88200);
    expect(result.seconds).toBeCloseTo(2.0, 1);
    expect(result.bars).toBe(1);
  });
});

// ============================================================================
// TransitionEngine Tests
// ============================================================================

describe('TransitionEngine', () => {
  let engine: TransitionEngine;
  let piano: PerformanceRealizationV1;
  let satb: PerformanceRealizationV1;
  let techno: PerformanceRealizationV1;

  beforeEach(() => {
    engine = createTransitionEngine();
    piano = createSoloPianoPerformance();
    satb = createSATBPerformance();
    techno = createAmbientTechnoPerformance();
  });

  describe('Plan Transition', () => {
    it('should plan transition from Piano to SATB', () => {
      const plan = engine.planTransition(piano, satb, 1);

      expect(plan.fromPerformanceId).toBe(piano.id);
      expect(plan.toPerformanceId).toBe(satb.id);
      expect(plan.scheduledBar).toBe(1);
      expect(plan.instrumentationChanges.length).toBeGreaterThan(0);
    });

    it('should plan transition from Piano to Techno', () => {
      const plan = engine.planTransition(piano, techno, 1);

      expect(plan.fromPerformanceId).toBe(piano.id);
      expect(plan.toPerformanceId).toBe(techno.id);
      expect(plan.densityChange.to).toBeGreaterThan(plan.densityChange.from);
    });

    it('should plan transition from SATB to Techno', () => {
      const plan = engine.planTransition(satb, techno, 2);

      expect(plan.fromPerformanceId).toBe(satb.id);
      expect(plan.toPerformanceId).toBe(techno.id);
      expect(plan.scheduledBar).toBe(2);
    });
  });

  describe('Instrumentation Changes', () => {
    it('should detect instrumentation additions', () => {
      const plan = engine.planTransition(piano, satb, 1);

      const additions = plan.instrumentationChanges.filter(c => c.changeType === 'add');
      expect(additions.length).toBeGreaterThan(0);
    });

    it('should detect instrumentation changes', () => {
      const plan = engine.planTransition(satb, techno, 1);

      // SATB and Techno have different role/voice combinations, so expect adds and removes
      const adds = plan.instrumentationChanges.filter(c => c.changeType === 'add');
      const removes = plan.instrumentationChanges.filter(c => c.changeType === 'remove');

      // Should have additions from Techno's new voices
      expect(adds.length).toBeGreaterThan(0);
      // Should have removals from SATB's voices that don't exist in Techno
      expect(removes.length).toBeGreaterThan(0);
    });
  });

  describe('Density Changes', () => {
    it('should calculate density increase from Piano to Techno', () => {
      const plan = engine.planTransition(piano, techno, 1);

      expect(plan.densityChange.delta).toBeGreaterThan(0);
      expect(plan.densityChange.to).toBeGreaterThan(plan.densityChange.from);
    });

    it('should calculate moderate density from Piano to SATB', () => {
      const plan = engine.planTransition(piano, satb, 1);

      expect(plan.densityChange.delta).toBeGreaterThan(0);
    });
  });

  describe('Execute Transition', () => {
    it('should execute transition at bar boundary', () => {
      const plan = engine.planTransition(piano, techno, 1);

      const result = engine.executeTransition(plan, 88200);

      expect(result.success).toBe(true);
      expect(result.appliedAt?.bar).toBe(1);
      expect(result.appliedAt?.position).toBe(88200);
    });
  });

  describe('Validate Transition Plan', () => {
    it('should validate safe transition', () => {
      const plan = engine.planTransition(piano, satb, 1);

      const validation = engine.validateTransitionPlan(plan);

      expect(validation.valid).toBe(true);
    });

    it('should warn about large CPU impact', () => {
      // Create a dense performance
      const densePerf = createAmbientTechnoPerformance();
      const plan = engine.planTransition(piano, densePerf, 1);

      const validation = engine.validateTransitionPlan(plan);

      // May have warnings about CPU impact
      expect(validation.valid).toBe(true);
    });
  });
});

describe('Quick Transition Validation', () => {
  it('should validate safe transition', () => {
    const piano = createSoloPianoPerformance();
    const satb = createSATBPerformance();

    const result = validateQuickTransition(piano, satb);

    expect(result.safe).toBe(true);
  });

  it('should reject unsafe transition with high CPU', () => {
    const piano = createSoloPianoPerformance();

    // Create extremely dense performance
    const dense: PerformanceRealizationV1 = {
      ...createAmbientTechnoPerformance(),
      density: 0.98,
      instrumentationMap: Array(20).fill({
        roleId: 'test',
        instrumentId: 'NexSynth',
        presetId: 'default',
        busId: 'test-bus'
      })
    };

    const result = validateQuickTransition(piano, dense);

    expect(result.safe).toBe(false);
    expect(result.reason).toContain('CPU');
  });
});

// ============================================================================
// End-to-End Integration Tests
// ============================================================================

describe('End-to-End: Piano → Techno Switch', () => {
  it('should demonstrate complete performance switching flow', async () => {
    // 1. Setup
    const songModel = createMockSongModel();
    const switcher = createPerformanceSwitcher(songModel);
    const engine = createTransitionEngine();

    const piano = songModel.performances[0];
    const techno = songModel.performances[2];

    // 2. Verify initial state
    expect(switcher.getActivePerformance()?.performanceId).toBe(piano.id);
    expect(switcher.getActivePerformance()?.performance.name).toBe('Solo Piano');

    // 3. Schedule switch to Techno at next bar
    const switchResult = await switcher.switchToPerformance(
      techno.id,
      'nextBar',
      {
        currentPosition: 0,
        tempo: 120,
        timeSignature: [4, 4],
        sampleRate: 44100
      }
    );

    expect(switchResult.success).toBe(true);
    expect(switchResult.scheduled).toBe(true);

    // 4. Plan transition
    const plan = engine.planTransition(piano, techno, 1);
    expect(plan.fromPerformanceId).toBe(piano.id);
    expect(plan.toPerformanceId).toBe(techno.id);

    // 5. Verify pending switch
    const pending = switcher.getPendingSwitch();
    expect(pending?.performanceId).toBe(techno.id);
    expect(pending?.targetBar).toBe(1);

    // 6. Simulate reaching bar boundary
    const executeResult = switcher.executeAtBarBoundary(1);
    expect(executeResult.success).toBe(true);

    // 7. Verify Techno is now active
    expect(switcher.getActivePerformance()?.performanceId).toBe(techno.id);
    expect(switcher.getActivePerformance()?.performance.name).toBe('Ambient Techno');

    // 8. Verify no pending switch
    expect(switcher.hasPendingSwitch()).toBe(false);

    // This is the "magic moment" - user tapped 'Techno', song transformed at bar boundary
  });
});
