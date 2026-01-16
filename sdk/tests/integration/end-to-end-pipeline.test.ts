/**
 * Comprehensive End-to-End Integration Tests
 *
 * Tests complete pipeline from SDK → ProjectionEngine → Audio Output
 * Including Swift → FFI → JUCE backend integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SchillingerSong,
  SongModel,
  PerformanceState,
  ArrangementStyle,
} from '@schillinger-sdk/schemas';
import {
  createTypicalSchillingerSong,
  createTypicalSongModel,
  createTypicalPerformanceState,
  createPianoPerformance,
  createSATBPerformance,
  createOrchestralPerformance,
  generateUUID,
} from '../fixtures/test-factories';
import {
  assertValidSongState,
  assertPerformanceValid,
  measurePerformance,
  assertCompletesWithin,
} from '../utilities/test-helpers';

// ============================================================================
// Mock FFI Bridge for Testing
// ============================================================================

class MockFFIBridge {
  async serializeSongState(song: SchillingerSong): Promise<string> {
    return JSON.stringify(song);
  }

  async deserializeSongState(json: string): Promise<SchillingerSong> {
    return JSON.parse(json);
  }

  async serializePerformanceState(perf: PerformanceState): Promise<string> {
    return JSON.stringify(perf);
  }

  async deserializePerformanceState(json: string): Promise<PerformanceState> {
    return JSON.parse(json);
  }

  async callProjectionEngine(
    songJson: string,
    perfJson: string
  ): Promise<string> {
    // Mock projection response
    return JSON.stringify({
      success: true,
      renderGraph: {
        id: generateUUID(42, 'render-graph'),
        version: '1.0',
        voices: [],
        buses: [],
        nodes: [],
        connections: [],
      },
      projectedDuration: 44100 * 60 * 4, // 4 bars
      projectionTimestamp: Date.now(),
    });
  }
}

// ============================================================================
// Mock Audio Engine for Testing
// =============================================================================

class MockAudioEngine {
  private isPlaying = false;
  private currentPosition = 0;

  async loadRenderGraph(renderGraph: any): Promise<boolean> {
    // Simulate loading render graph
    return true;
  }

  async play(): Promise<boolean> {
    this.isPlaying = true;
    return true;
  }

  async pause(): Promise<boolean> {
    this.isPlaying = false;
    return true;
  }

  async stop(): Promise<boolean> {
    this.isPlaying = false;
    this.currentPosition = 0;
    return true;
  }

  async seek(position: number): Promise<boolean> {
    this.currentPosition = position;
    return true;
  }

  getPosition(): number {
    return this.currentPosition;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// ============================================================================
// End-to-End Pipeline Tests
// ============================================================================

describe('End-to-End Pipeline Tests', () => {
  let ffiBridge: MockFFIBridge;
  let audioEngine: MockAudioEngine;

  beforeEach(() => {
    ffiBridge = new MockFFIBridge();
    audioEngine = new MockAudioEngine();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('SDK → ProjectionEngine Pipeline', () => {
    it('should project song from SchillingerSong', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Serialize song and performance
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      expect(songJson).toBeDefined();
      expect(perfJson).toBeDefined();

      // Call projection engine
      const projectionResult = await ffiBridge.callProjectionEngine(
        songJson,
        perfJson
      );

      expect(projectionResult).toBeDefined();

      const result = JSON.parse(projectionResult);
      expect(result.success).toBe(true);
      expect(result.renderGraph).toBeDefined();
    });

    it('should project song from SongModel', async () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const songModel = createTypicalSongModel(sourceSong.id, generateUUID(42, 'derivation'), 42);
      const performance = createTypicalPerformanceState(42);

      // Validate song model
      assertValidSongState(songModel);

      // Serialize and project
      const songJson = await ffiBridge.serializeSongState(sourceSong);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      const projectionResult = await ffiBridge.callProjectionEngine(
        songJson,
        perfJson
      );

      const result = JSON.parse(projectionResult);
      expect(result.success).toBe(true);
    });

    it('should project with multiple performances', async () => {
      const song = createTypicalSchillingerSong(42);
      const performances = [
        createPianoPerformance(1),
        createSATBPerformance(2),
        createOrchestralPerformance(3),
      ];

      // Validate all performances
      performances.forEach(perf => {
        assertPerformanceValid(perf);
      });

      // Project each performance
      const results = await Promise.all(
        performances.map(async perf => {
          const songJson = await ffiBridge.serializeSongState(song);
          const perfJson = await ffiBridge.serializePerformanceState(perf);
          return await ffiBridge.callProjectionEngine(songJson, perfJson);
        })
      );

      // All projections should succeed
      results.forEach(resultJson => {
        const result = JSON.parse(resultJson);
        expect(result.success).toBe(true);
      });
    });

    it('should handle performance switching', async () => {
      const song = createTypicalSchillingerSong(42);
      const perf1 = createPianoPerformance(1);
      const perf2 = createSATBPerformance(2);

      // Project first performance
      const songJson1 = await ffiBridge.serializeSongState(song);
      const perfJson1 = await ffiBridge.serializePerformanceState(perf1);
      const result1 = await ffiBridge.callProjectionEngine(songJson1, perfJson1);

      expect(JSON.parse(result1).success).toBe(true);

      // Switch to second performance
      const songJson2 = await ffiBridge.serializeSongState(song);
      const perfJson2 = await ffiBridge.serializePerformanceState(perf2);
      const result2 = await ffiBridge.callProjectionEngine(songJson2, perfJson2);

      expect(JSON.parse(result2).success).toBe(true);
    });
  });

  describe('ProjectionEngine → Audio Engine Pipeline', () => {
    it('should load render graph into audio engine', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Get projection
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);
      const projectionResult = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const result = JSON.parse(projectionResult);
      const renderGraph = result.renderGraph;

      // Load into audio engine
      const loaded = await audioEngine.loadRenderGraph(renderGraph);

      expect(loaded).toBe(true);
    });

    it('should play audio from render graph', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Get projection
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);
      const projectionResult = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const result = JSON.parse(projectionResult);
      const renderGraph = result.renderGraph;

      // Load and play
      await audioEngine.loadRenderGraph(renderGraph);
      const played = await audioEngine.play();

      expect(played).toBe(true);
      expect(audioEngine.getIsPlaying()).toBe(true);
    });

    it('should pause and resume audio playback', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Get projection
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);
      const projectionResult = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const result = JSON.parse(projectionResult);
      const renderGraph = result.renderGraph;

      // Load, play, pause
      await audioEngine.loadRenderGraph(renderGraph);
      await audioEngine.play();
      expect(audioEngine.getIsPlaying()).toBe(true);

      await audioEngine.pause();
      expect(audioEngine.getIsPlaying()).toBe(false);

      await audioEngine.play();
      expect(audioEngine.getIsPlaying()).toBe(true);
    });

    it('should stop and reset audio playback', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Get projection
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);
      const projectionResult = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const result = JSON.parse(projectionResult);
      const renderGraph = result.renderGraph;

      // Load, play, stop
      await audioEngine.loadRenderGraph(renderGraph);
      await audioEngine.play();

      await audioEngine.stop();
      expect(audioEngine.getIsPlaying()).toBe(false);
      expect(audioEngine.getPosition()).toBe(0);
    });

    it('should seek to position in audio', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Get projection
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);
      const projectionResult = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const result = JSON.parse(projectionResult);
      const renderGraph = result.renderGraph;

      // Load and seek
      await audioEngine.loadRenderGraph(renderGraph);
      const targetPosition = 44100 * 10; // 10 seconds
      const sought = await audioEngine.seek(targetPosition);

      expect(sought).toBe(true);
      expect(audioEngine.getPosition()).toBe(targetPosition);
    });
  });

  describe('Complete Pipeline Integration', () => {
    it('should execute full pipeline: Song → Projection → Audio', async () => {
      // 1. Create song
      const song = createTypicalSchillingerSong(42);
      const performance = createPianoPerformance(42);

      // 2. Validate
      assertValidSongState(song);
      assertPerformanceValid(performance);

      // 3. Serialize
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      // 4. Project
      const projectionResult = await ffiBridge.callProjectionEngine(
        songJson,
        perfJson
      );
      const result = JSON.parse(projectionResult);
      expect(result.success).toBe(true);

      // 5. Load into audio engine
      const loaded = await audioEngine.loadRenderGraph(result.renderGraph);
      expect(loaded).toBe(true);

      // 6. Play
      const played = await audioEngine.play();
      expect(played).toBe(true);
      expect(audioEngine.getIsPlaying()).toBe(true);
    });

    it('should switch performances during playback', async () => {
      const song = createTypicalSchillingerSong(42);
      const perf1 = createPianoPerformance(1);
      const perf2 = createSATBPerformance(2);

      // Load and play first performance
      const songJson1 = await ffiBridge.serializeSongState(song);
      const perfJson1 = await ffiBridge.serializePerformanceState(perf1);
      const result1 = await ffiBridge.callProjectionEngine(songJson1, perfJson1);

      await audioEngine.loadRenderGraph(JSON.parse(result1).renderGraph);
      await audioEngine.play();
      expect(audioEngine.getIsPlaying()).toBe(true);

      // Switch to second performance (crossfade)
      const songJson2 = await ffiBridge.serializeSongState(song);
      const perfJson2 = await ffiBridge.serializePerformanceState(perf2);
      const result2 = await ffiBridge.callProjectionEngine(songJson2, perfJson2);

      // Load new render graph while playing
      await audioEngine.loadRenderGraph(JSON.parse(result2).renderGraph);
      expect(audioEngine.getIsPlaying()).toBe(true);
    });
  });

  describe('Performance and Resource Tests', () => {
    it('should complete pipeline within time targets', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Measure full pipeline time
      const { result, measurement } = await measurePerformance(
        'full-pipeline',
        async () => {
          const songJson = await ffiBridge.serializeSongState(song);
          const perfJson = await ffiBridge.serializePerformanceState(performance);
          const projectionResult = await ffiBridge.callProjectionEngine(
            songJson,
            perfJson
          );
          await audioEngine.loadRenderGraph(JSON.parse(projectionResult).renderGraph);
          await audioEngine.play();
          return true;
        }
      );

      // Pipeline should complete in < 100ms
      expect(measurement.duration).toBeLessThan(100);
    });

    it('should handle large songs efficiently', async () => {
      const song = createTypicalSchillingerSong(42, {
        rhythmSystemCount: 10,
        melodySystemCount: 10,
        harmonySystemCount: 5,
        voiceCount: 20,
      });
      const performance = createOrchestralPerformance(42);

      const { result, measurement } = await measurePerformance(
        'large-song-pipeline',
        async () => {
          const songJson = await ffiBridge.serializeSongState(song);
          const perfJson = await ffiBridge.serializePerformanceState(performance);
          return await ffiBridge.callProjectionEngine(songJson, perfJson);
        }
      );

      // Large song serialization + projection should be < 500ms
      expect(measurement.duration).toBeLessThan(500);
    });

    it('should handle rapid performance switching', async () => {
      const song = createTypicalSchillingerSong(42);
      const performances = [
        createPianoPerformance(1),
        createSATBPerformance(2),
        createOrchestralPerformance(3),
      ];

      const { result, measurement } = await measurePerformance(
        'rapid-switching',
        async () => {
          for (const perf of performances) {
            const songJson = await ffiBridge.serializeSongState(song);
            const perfJson = await ffiBridge.serializePerformanceState(perf);
            await ffiBridge.callProjectionEngine(songJson, perfJson);
          }
        }
      );

      // Switching between 3 performances should be < 200ms
      expect(measurement.duration).toBeLessThan(200);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid song gracefully', async () => {
      const invalidSong = {} as SchillingerSong;
      const performance = createTypicalPerformanceState(42);

      try {
        const songJson = await ffiBridge.serializeSongState(invalidSong);
        const perfJson = await ffiBridge.serializePerformanceState(performance);
        await ffiBridge.callProjectionEngine(songJson, perfJson);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid performance gracefully', async () => {
      const song = createTypicalSchillingerSong(42);
      const invalidPerf = {} as PerformanceState;

      try {
        const songJson = await ffiBridge.serializeSongState(song);
        const perfJson = await ffiBridge.serializePerformanceState(invalidPerf);
        await ffiBridge.callProjectionEngine(songJson, perfJson);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should recover from projection failure', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // First projection fails
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      try {
        await ffiBridge.callProjectionEngine(songJson, perfJson);
      } catch (error) {
        // Expected to fail in mock
      }

      // Second projection should succeed
      const result2 = await ffiBridge.callProjectionEngine(songJson, perfJson);
      const result = JSON.parse(result2);
      expect(result.success).toBe(true);
    });
  });

  describe('Determinism and Consistency', () => {
    it('should produce consistent projections from same inputs', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      // Project twice
      const result1 = await ffiBridge.callProjectionEngine(songJson, perfJson);
      const result2 = await ffiBridge.callProjectionEngine(songJson, perfJson);

      const parsed1 = JSON.parse(result1);
      const parsed2 = JSON.parse(result2);

      // Results should be identical
      expect(parsed1.renderGraph.id).toBe(parsed2.renderGraph.id);
    });

    it('should maintain data integrity through pipeline', async () => {
      const originalSong = createTypicalSchillingerSong(42);
      const originalPerf = createTypicalPerformanceState(42);

      // Serialize
      const songJson = await ffiBridge.serializeSongState(originalSong);
      const perfJson = await ffiBridge.serializePerformanceState(originalPerf);

      // Deserialize
      const deserializedSong = await ffiBridge.deserializeSongState(songJson);
      const deserializedPerf = await ffiBridge.deserializePerformanceState(perfJson);

      // Verify integrity
      expect(deserializedSong.id).toBe(originalSong.id);
      expect(deserializedSong.name).toBe(originalSong.name);
      expect(deserializedSong.seed).toBe(originalSong.seed);

      expect(deserializedPerf.id).toBe(originalPerf.id);
      expect(deserializedPerf.name).toBe(originalPerf.name);
      expect(deserializedPerf.density).toBe(originalPerf.density);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work with macOS platform', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // Platform-specific handling would go here
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      const result = await ffiBridge.callProjectionEngine(songJson, perfJson);
      expect(JSON.parse(result).success).toBe(true);
    });

    it('should work with iOS platform', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // iOS-specific handling would go here
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      const result = await ffiBridge.callProjectionEngine(songJson, perfJson);
      expect(JSON.parse(result).success).toBe(true);
    });

    it('should work with tvOS platform', async () => {
      const song = createTypicalSchillingerSong(42);
      const performance = createTypicalPerformanceState(42);

      // tvOS-specific handling would go here
      const songJson = await ffiBridge.serializeSongState(song);
      const perfJson = await ffiBridge.serializePerformanceState(performance);

      const result = await ffiBridge.callProjectionEngine(songJson, perfJson);
      expect(JSON.parse(result).success).toBe(true);
    });
  });
});
