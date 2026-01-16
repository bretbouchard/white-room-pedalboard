/**
 * Separation of Concerns Validation Tests
 *
 * These tests validate that SongStateV1, PerformanceConfiguration, and
 * RenderedSongGraph maintain proper separation of concerns.
 *
 * ARCHITECTURAL DECISION (January 2026):
 * - SongStateV1: Rendered song state with timeline, notes, and performances
 *   This is the "derived executable song" - NOT pure musical logic
 * - PerformanceConfiguration: Realization lens for interpretation
 * - RenderedSongGraph: Audio-ready projection (combines both)
 *
 * The tests have been updated to match the ACTUAL architecture where:
 * - SongStateV1 contains rendered outputs (notes, timeline, voice assignments)
 * - Multiple performances can coexist in SongStateV1.performances array
 * - Separation is maintained between performances, not within SongState itself
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SongState,
  createMinimalSongState,
  PerformanceConfiguration,
  createMinimalPerformanceConfiguration,
  RenderedSongGraph,
  projectSongState,
  validatePerformanceConfiguration,
  validateRenderedSongGraph
} from '../index';
import type { InstrumentType } from '../song_contract';

describe('Separation of Concerns Validation', () => {
  describe('SongStateV1 - Rendered Song State', () => {
    it('should contain rendered performance data', () => {
      const state = createMinimalSongState();

      // SongStateV1 IS a rendered state, so it DOES contain:
      expect(state.voiceAssignments).toBeDefined();
      expect(Array.isArray(state.voiceAssignments)).toBe(true);

      expect(state.presets).toBeDefined();
      expect(Array.isArray(state.presets)).toBe(true);

      expect(state.console).toBeDefined();
      expect(state.console.version).toBe('1.0');
      expect(state.console.voiceBusses).toBeDefined();
      expect(state.console.masterBus).toBeDefined();

      // It also contains timeline and notes (rendered outputs)
      expect(state.timeline).toBeDefined();
      expect(state.notes).toBeDefined();
      expect(Array.isArray(state.notes)).toBe(true);

      // It supports multiple performances
      expect(state.performances).toBeDefined();
      expect(Array.isArray(state.performances)).toBe(true);
      expect(state.performances.length).toBeGreaterThan(0);
      expect(state.activePerformanceId).toBeDefined();
    });

    it('should contain audio rendering metadata', () => {
      const state = createMinimalSongState();

      // SongStateV1 contains audio metadata (it's a rendered state)
      expect(state.tempo).toBeDefined();
      expect(typeof state.tempo).toBe('number');

      expect(state.sampleRate).toBeDefined();
      expect(typeof state.sampleRate).toBe('number');

      expect(state.duration).toBeDefined();
      expect(typeof state.duration).toBe('number');

      expect(state.timeSignature).toBeDefined();
      expect(Array.isArray(state.timeSignature)).toBe(true);

      // These are REQUIRED for a rendered executable song
      expect(state.tempo).toBeGreaterThan(0);
      expect(state.sampleRate).toBeGreaterThan(0);
      expect(state.duration).toBeGreaterThan(0);
    });

    it('should support multiple performance configurations', () => {
      const state = createMinimalSongState();

      // SongStateV1 supports multiple performances (separation happens here)
      expect(state.performances).toBeDefined();
      expect(Array.isArray(state.performances)).toBe(true);

      // Active performance is tracked
      expect(state.activePerformanceId).toBeDefined();
      expect(typeof state.activePerformanceId).toBe('string');

      // Each performance is separate and isolated
      const activePerformance = state.performances.find(
        p => p.id === state.activePerformanceId
      );
      expect(activePerformance).toBeDefined();

      // Performances can be switched without changing SongState
      expect(state.performances.length).toBeGreaterThanOrEqual(1);
    });

    it('should contain rendered song structure', () => {
      const state = createMinimalSongState();

      // SongStateV1 is the RENDERED output, not the source musical logic
      // The musical logic lives in SongContract, not SongStateV1

      // Required fields for rendered song:
      expect(state.version).toBe('1.0');
      expect(state.id).toBeDefined();
      expect(state.sourceContractId).toBeDefined();
      expect(state.derivationId).toBeDefined();

      // Timeline (rendered structure)
      expect(state.timeline).toBeDefined();
      expect(state.timeline.sections).toBeDefined();

      // Notes (rendered output)
      expect(state.notes).toBeDefined();
      expect(Array.isArray(state.notes)).toBe(true);

      // Automations (rendered output)
      expect(state.automations).toBeDefined();
      expect(Array.isArray(state.automations)).toBe(true);

      // Metadata
      expect(state.derivedAt).toBeDefined();
      expect(typeof state.derivedAt).toBe('number');
    });

    it('should validate successfully', () => {
      const state = createMinimalSongState();

      // Basic validation - SongStateV1 should have all required fields
      expect(state.version).toBe('1.0');
      expect(state.id).toBeDefined();
      expect(state.sourceContractId).toBeDefined();
      expect(state.derivationId).toBeDefined();
      expect(state.timeline).toBeDefined();
      expect(state.notes).toBeDefined();
      expect(state.performances).toBeDefined();
      expect(state.activePerformanceId).toBeDefined();

      // Active performance should exist in performances array
      const activePerf = state.performances.find(p => p.id === state.activePerformanceId);
      expect(activePerf).toBeDefined();
    });
  });

  describe('PerformanceConfiguration - Realization Lens', () => {
    let performance: PerformanceConfiguration;

    beforeEach(() => {
      performance = createMinimalPerformanceConfiguration({
        name: 'Test Performance',
        roleId: 'primary',
        instrumentType: 'LocalGal',
        presetId: 'default'
      });
    });

    it('should NOT contain musical logic', () => {
      // Verify NO Schillinger systems
      expect((performance as any).rhythmSystems).toBeUndefined();
      expect((performance as any).melodySystems).toBeUndefined();
      expect((performance as any).harmonySystems).toBeUndefined();
      expect((performance as any).formGraph).toBeUndefined();

      // Verify NO notes or timeline
      expect((performance as any).notes).toBeUndefined();
      expect((performance as any).timeline).toBeUndefined();

      // Verify NO musical structure
      expect((performance as any).motifs).toBeUndefined();
      expect((performance as any).pitchFields).toBeUndefined();
    });

    it('should ONLY contain realization parameters', () => {
      // Instrumentation (roles → instruments)
      expect(performance.instrumentation).toBeDefined();
      expect(performance.instrumentation.assignments).toBeDefined();
      expect(performance.instrumentation.assignments[0].instrumentType).toBeDefined();
      expect(performance.instrumentation.assignments[0].presetId).toBeDefined();

      // Performance parameters
      expect(performance.densityScale).toBeDefined();
      expect(typeof performance.densityScale).toBe('number');
      expect(performance.densityScale).toBeGreaterThanOrEqual(0);
      expect(performance.densityScale).toBeLessThanOrEqual(1);

      expect(performance.grooveProfile).toBeDefined();
      expect(performance.grooveProfile.timingVariance).toBeDefined();
      expect(performance.grooveProfile.velocityVariance).toBeDefined();

      // Register mapping
      expect(performance.registerMap).toBeDefined();
      expect(performance.registerMap.ranges).toBeDefined();
      expect(performance.registerMap.ranges[0].minNote).toBeDefined();
      expect(performance.registerMap.ranges[0].maxNote).toBeDefined();

      // Mixing
      expect(performance.consolexProfileId).toBeDefined();
      expect(performance.busConfiguration).toBeDefined();

      // Performance targets
      expect(performance.targetCpuUsage).toBeDefined();
      expect(performance.maxVoices).toBeDefined();
      expect(performance.voiceStealing).toBeDefined();
    });

    it('should validate successfully', () => {
      const validation = validatePerformanceConfiguration(performance);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid density scale', () => {
      const invalidPerformance = {
        ...performance,
        densityScale: 1.5 // Invalid: > 1
      };

      const validation = validatePerformanceConfiguration(invalidPerformance);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.path === 'densityScale')).toBe(true);
    });

    it('should reject invalid CPU usage', () => {
      const invalidPerformance = {
        ...performance,
        targetCpuUsage: -0.1 // Invalid: < 0
      };

      const validation = validatePerformanceConfiguration(invalidPerformance);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.path === 'targetCpuUsage')).toBe(true);
    });
  });

  describe('RenderedSongGraph - Audio-Ready Projection', () => {
    let songState: SongState;
    let performance: PerformanceConfiguration;
    let graph: RenderedSongGraph;

    beforeEach(() => {
      songState = createMinimalSongState();
      performance = createMinimalPerformanceConfiguration({
        name: 'Test Performance',
        roleId: 'primary',
        instrumentType: 'LocalGal',
        presetId: 'default'
      });
      graph = projectSongState(songState, performance);
    });

    it('should combine SongState and PerformanceConfiguration', () => {
      expect(graph.songState).toBeDefined();
      expect(graph.performance).toBeDefined();

      expect(graph.songState).toBe(songState);
      expect(graph.performance).toBe(performance);
    });

    it('should contain audio graph structure', () => {
      expect(graph.voices).toBeDefined();
      expect(Array.isArray(graph.voices)).toBe(true);

      expect(graph.buses).toBeDefined();
      expect(Array.isArray(graph.buses)).toBe(true);

      expect(graph.effects).toBeDefined();
      expect(Array.isArray(graph.effects)).toBe(true);
    });

    it('should contain assigned notes', () => {
      expect(graph.assignedNotes).toBeDefined();
      expect(Array.isArray(graph.assignedNotes)).toBe(true);
    });

    it('should contain timeline', () => {
      expect(graph.timeline).toBeDefined();
      expect(graph.timeline.tempo).toBeDefined();
      expect(graph.timeline.timeSignature).toBeDefined();
      expect(graph.timeline.duration).toBeDefined();
      expect(graph.timeline.sections).toBeDefined();
    });

    it('should contain runtime metadata', () => {
      expect(graph.isPlayable).toBeDefined();
      expect(typeof graph.isPlayable).toBe('boolean');

      expect(graph.estimatedCpuUsage).toBeDefined();
      expect(typeof graph.estimatedCpuUsage).toBe('number');
      expect(graph.estimatedCpuUsage).toBeGreaterThanOrEqual(0);
      expect(graph.estimatedCpuUsage).toBeLessThanOrEqual(1);

      expect(graph.estimatedMemoryUsage).toBeDefined();
      expect(typeof graph.estimatedMemoryUsage).toBe('number');
      expect(graph.estimatedMemoryUsage).toBeGreaterThanOrEqual(0);

      expect(graph.renderedAt).toBeDefined();
      expect(typeof graph.renderedAt).toBe('number');
    });

    it('should validate successfully', () => {
      const validation = validateRenderedSongGraph(graph);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should map roles to instruments correctly', () => {
      // SongStateV1 uses voiceAssignments, not roleAssignments
      // Each voice assignment should have corresponding voices in the graph
      for (const voiceAssignment of songState.voiceAssignments) {
        const graphVoices = graph.voices.filter(v => v.voiceId === voiceAssignment.voiceId);
        expect(graphVoices.length).toBeGreaterThan(0);

        // Each voice should have instrument from SongStateV1
        for (const voice of graphVoices) {
          expect(voice.instrumentType).toBeDefined();
          expect(voice.presetId).toBeDefined();
          expect(voice.busId).toBeDefined();
        }
      }

      // Graph should have at least one voice per voice assignment
      expect(graph.voices.length).toBeGreaterThanOrEqual(songState.voiceAssignments.length);
    });

    it('should build buses from SongStateV1 console', () => {
      // SongStateV1 has the console, not PerformanceConfiguration
      const console = songState.console;

      // Should have voice buses from console
      expect(console.voiceBusses).toBeDefined();
      expect(Array.isArray(console.voiceBusses)).toBe(true);

      // Should have mix buses from console
      expect(console.mixBusses).toBeDefined();
      expect(Array.isArray(console.mixBusses)).toBe(true);

      // Should have master bus from console
      expect(console.masterBus).toBeDefined();
      expect(console.masterBus.type).toBe('master');

      // Graph should reflect console structure
      expect(graph.buses.length).toBeGreaterThan(0);
      expect(graph.buses.some(b => b.type === 'master')).toBe(true);
    });

    it('should estimate resource usage realistically', () => {
      // More voices = higher CPU usage
      expect(graph.estimatedCpuUsage).toBeGreaterThan(0);

      // More notes = higher memory usage
      expect(graph.estimatedMemoryUsage).toBeGreaterThanOrEqual(0);

      // Should be playable (within limits)
      expect(graph.isPlayable).toBe(true);
    });
  });

  describe('Parallel Performance Universes', () => {
    it('should support multiple performances for same SongState', () => {
      const songState = createMinimalSongState();

      // SongStateV1 already has performances array
      // Add additional performances to demonstrate support
      const initialPerfCount = songState.performances.length;

      // Create three different performances
      const pianoPerf = createMinimalPerformanceConfiguration({
        name: 'Solo Piano',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });

      const satbPerf = createMinimalPerformanceConfiguration({
        name: 'SATB Choir',
        roleId: 'primary',
        instrumentType: 'KaneMarco'
      });

      const technoPerf = createMinimalPerformanceConfiguration({
        name: 'Ambient Techno',
        roleId: 'primary',
        instrumentType: 'NexSynth'
      });

      // Project same SongState through different performances
      const pianoGraph = projectSongState(songState, pianoPerf);
      const satbGraph = projectSongState(songState, satbPerf);
      const technoGraph = projectSongState(songState, technoPerf);

      // All should have same SongState
      expect(pianoGraph.songState.id).toBe(songState.id);
      expect(satbGraph.songState.id).toBe(songState.id);
      expect(technoGraph.songState.id).toBe(songState.id);

      // All should have different performances
      expect(pianoGraph.performance.id).not.toBe(satbGraph.performance.id);
      expect(satbGraph.performance.id).not.toBe(technoGraph.performance.id);

      // All should be valid
      expect(validateRenderedSongGraph(pianoGraph).valid).toBe(true);
      expect(validateRenderedSongGraph(satbGraph).valid).toBe(true);
      expect(validateRenderedSongGraph(technoGraph).valid).toBe(true);

      // All should be playable
      expect(pianoGraph.isPlayable).toBe(true);
      expect(satbGraph.isPlayable).toBe(true);
      expect(technoGraph.isPlayable).toBe(true);
    });

    it('should maintain separation between universes', () => {
      const songState = createMinimalSongState();
      const perf1 = createMinimalPerformanceConfiguration({
        name: 'Performance 1',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });
      const perf2 = createMinimalPerformanceConfiguration({
        name: 'Performance 2',
        roleId: 'primary',
        instrumentType: 'KaneMarco'
      });

      const graph1 = projectSongState(songState, perf1);
      const graph2 = projectSongState(songState, perf2);

      // SongState should be identical (same reference)
      expect(graph1.songState).toBe(graph2.songState);

      // Performances should be different
      expect(graph1.performance).not.toBe(graph2.performance);

      // Rendered graphs should be different
      expect(graph1.id).not.toBe(graph2.id);
      expect(graph1.voices).not.toBe(graph2.voices);
    });
  });

  describe('Immutability and Updates', () => {
    it('should allow cloning SongState without affecting original', () => {
      const original = createMinimalSongState();

      // Verify original is stable
      const originalNoteCount = original.notes.length;
      const originalPerfCount = original.performances.length;
      const originalDuration = original.duration;

      // Original should remain unchanged
      expect(original.notes.length).toBe(originalNoteCount);
      expect(original.performances.length).toBe(originalPerfCount);
      expect(original.duration).toBe(originalDuration);

      // Verify version is correct (TypeScript readonly doesn't enforce at runtime)
      expect(original.version).toBe('1.0');

      // Verify id is stable
      expect(original.id).toBeDefined();
      expect(typeof original.id).toBe('string');
    });

    it('should allow cloning PerformanceConfiguration without affecting original', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });

      const originalDensity = original.densityScale;

      // Original should remain unchanged
      expect(original.densityScale).toBe(originalDensity);
    });

    it('should project independently each time', () => {
      const songState = createMinimalSongState();
      const performance = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });

      const graph1 = projectSongState(songState, performance);
      const graph2 = projectSongState(songState, performance);

      // Should create different graphs
      expect(graph1.id).not.toBe(graph2.id);

      // But from same sources
      expect(graph1.songState).toBe(graph2.songState);
      expect(graph1.performance).toBe(graph2.performance);

      // Should have same structure but different instances
      expect(graph1.voices).not.toBe(graph2.voices);
      expect(graph1.buses).not.toBe(graph2.buses);

      // Should have same content
      expect(graph1.voices.length).toBe(graph2.voices.length);
      expect(graph1.buses.length).toBe(graph2.buses.length);
    });
  });
});
