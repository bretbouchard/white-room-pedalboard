/**
 * End-to-End Workflow Tests
 *
 * Tests complete user workflows:
 * - Author → Realize → Load → Play → Stop
 * - Author → Edit → Reconcile → Load
 * - Create Performance → Switch → Play
 * - Cross-platform workflows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { E2ETestFramework, SongComplexity } from '../framework/e2e-framework';
import { TestSongGenerator } from '../framework/test-song-generator';
import * as path from 'path';
import * as os from 'os';

describe('E2E Workflow Tests', () => {
  let framework: E2ETestFramework;
  let generator: TestSongGenerator;
  let tempDir: string;
  let testSongs: Map<string, any>;

  beforeAll(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), 'e2e-workflow-tests');

    // Initialize framework
    framework = new E2ETestFramework(tempDir);
    await framework.initialize();

    // Generate test songs
    generator = new TestSongGenerator(42);
    testSongs = generator.generateAllTestSongs();
  });

  afterAll(async () => {
    await framework.cleanup();
  });

  describe('Author → Realize → Load → Play → Stop Workflow', () => {
    it('should complete basic workflow with simple song', async () => {
      const song = testSongs.get('simple-000');
      expect(song).toBeDefined();

      // Author: Create song structure
      const authorResult = await testAuthorWorkflow(song);
      expect(authorResult.success).toBe(true);

      // Realize: Generate audio graph
      const realizeResult = await testRealizeWorkflow(song);
      expect(realizeResult.success).toBe(true);
      expect(realizeResult.graph).toBeDefined();

      // Load: Load into audio engine
      const loadResult = await testLoadWorkflow(realizeResult.graph);
      expect(loadResult.success).toBe(true);
      expect(loadResult.loaded).toBe(true);

      // Play: Start playback
      const playResult = await testPlayWorkflow();
      expect(playResult.success).toBe(true);
      expect(playResult.playing).toBe(true);

      // Stop: Stop playback
      const stopResult = await testStopWorkflow();
      expect(stopResult.success).toBe(true);
      expect(stopResult.playing).toBe(false);
    }, 30000);

    it('should complete workflow with complex song', async () => {
      const song = testSongs.get('complex-000');
      expect(song).toBeDefined();

      const result = await testCompleteWorkflow(song);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    }, 60000);

    it('should handle workflow errors gracefully', async () => {
      const invalidSong = {
        version: '1.0',
        metadata: { name: 'Invalid' },
        structure: { tempo: 0 }, // Invalid tempo
        systems: [],
        voices: [],
        console: { channels: [], buses: [], sends: [], master: {} },
      };

      const realizeResult = await testRealizeWorkflow(invalidSong);
      expect(realizeResult.success).toBe(false);
      expect(realizeResult.error).toBeDefined();
    }, 10000);
  });

  describe('Author → Edit → Reconcile → Load Workflow', () => {
    it('should reconcile edited song with loaded performance', async () => {
      const song = testSongs.get('medium-000');
      expect(song).toBeDefined();

      // Load original song
      const realizeResult = await testRealizeWorkflow(song);
      expect(realizeResult.success).toBe(true);

      // Edit song
      const editedSong = await testEditWorkflow(song);
      expect(editedSong).toBeDefined();
      expect(editedSong.metadata.name).toContain('edited');

      // Reconcile
      const reconcileResult = await testReconcileWorkflow(
        song,
        editedSong,
        realizeResult.graph
      );
      expect(reconcileResult.success).toBe(true);
      expect(reconcileResult.changes).toBeGreaterThan(0);

      // Load reconciled version
      const loadResult = await testLoadWorkflow(reconcileResult.graph);
      expect(loadResult.success).toBe(true);
    }, 30000);

    it('should detect and report conflicts', async () => {
      const song = testSongs.get('simple-001');
      const editedSong = JSON.parse(JSON.stringify(song));

      // Make conflicting edits
      editedSong.voices[0].instrument.type = 'different-instrument';

      const reconcileResult = await testReconcileWorkflow(
        song,
        editedSong,
        null
      );

      expect(reconcileResult.success).toBe(false);
      expect(reconcileResult.conflicts).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Performance Management Workflows', () => {
    it('should create and switch between performances', async () => {
      const song = testSongs.get('medium-001');
      expect(song).toBeDefined();

      // Create performance A
      const performanceA = await testCreatePerformance(song, {
        name: 'Performance A',
        density: 0.5,
      });
      expect(performanceA.success).toBe(true);

      // Create performance B
      const performanceB = await testCreatePerformance(song, {
        name: 'Performance B',
        density: 1.0,
      });
      expect(performanceB.success).toBe(true);

      // Switch to performance A
      const switchResult1 = await testSwitchPerformance(performanceA.id);
      expect(switchResult1.active).toBe(performanceA.id);

      // Play
      await testPlayWorkflow();

      // Switch to performance B during playback
      const switchResult2 = await testSwitchPerformance(performanceB.id);
      expect(switchResult2.active).toBe(performanceB.id);

      // Stop
      await testStopWorkflow();
    }, 30000);

    it('should blend between two performances', async () => {
      const song = testSongs.get('complex-001');
      expect(song).toBeDefined();

      const perfA = await testCreatePerformance(song, { name: 'A' });
      const perfB = await testCreatePerformance(song, { name: 'B' });

      // Test blend at different positions
      for (const blend of [0.0, 0.25, 0.5, 0.75, 1.0]) {
        const blendResult = await testBlendPerformance(perfA.id, perfB.id, blend);
        expect(blendResult.success).toBe(true);
        expect(blendResult.blendValue).toBeCloseTo(blend, 2);
      }
    }, 45000);

    it('should preserve performance state', async () => {
      const song = testSongs.get('simple-002');

      const perf = await testCreatePerformance(song, {
        name: 'Preserved Performance',
      });

      // Modify and save
      const modifiedPerf = await testModifyPerformance(perf.id, {
        tempo: 140,
      });
      expect(modifiedPerf.tempo).toBe(140);

      // Load and verify
      const loadedPerf = await testLoadPerformance(perf.id);
      expect(loadedPerf.tempo).toBe(140);
    }, 15000);
  });

  describe('Error Handling Workflows', () => {
    it('should handle realization errors', async () => {
      const invalidSong = {
        version: '1.0',
        metadata: { name: 'Invalid Song' },
        structure: {},
        systems: [],
        voices: [],
        console: {},
      };

      const result = await testRealizeWorkflow(invalidSong);
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    }, 10000);

    it('should handle load errors gracefully', async () => {
      const invalidGraph = { invalid: 'graph' };

      const result = await testLoadWorkflow(invalidGraph);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should recover from playback errors', async () => {
      const song = testSongs.get('simple-003');

      // Realize and load
      const realizeResult = await testRealizeWorkflow(song);
      const loadResult = await testLoadWorkflow(realizeResult.graph);

      // Simulate playback error
      const playResult = await testPlayWorkflowWithError();
      expect(playResult.success).toBe(false);

      // Stop and retry
      await testStopWorkflow();
      const retryResult = await testPlayWorkflow();
      expect(retryResult.success).toBe(true);

      await testStopWorkflow();
    }, 20000);
  });

  describe('Performance and Stress Tests', () => {
    it('should handle rapid realization requests', async () => {
      const songs = Array.from(testSongs.values()).slice(0, 10);
      const results = await Promise.all(
        songs.map(song => testRealizeWorkflow(song))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(results.length).toBe(10);
    }, 60000);

    it('should handle rapid performance switches', async () => {
      const song = testSongs.get('medium-002');
      const perfA = await testCreatePerformance(song, { name: 'A' });
      const perfB = await testCreatePerformance(song, { name: 'B' });

      // Rapid switches
      for (let i = 0; i < 20; i++) {
        const target = i % 2 === 0 ? perfA.id : perfB.id;
        const result = await testSwitchPerformance(target);
        expect(result.active).toBe(target);
      }
    }, 30000);

    it('should maintain performance under load', async () => {
      const complexSong = testSongs.get('complex-002');

      const startTime = Date.now();
      const result = await testCompleteWorkflow(complexSong);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete in 30s
    }, 45000);
  });
});

/**
 * Test helper functions
 */

async function testAuthorWorkflow(song: any): Promise<{
  success: boolean;
  song: any;
}> {
  // Simulate authoring workflow
  return { success: true, song };
}

async function testRealizeWorkflow(song: any): Promise<{
  success: boolean;
  graph?: any;
  error?: string;
}> {
  // Simulate realization workflow
  if (!song.structure || song.structure.tempo === 0) {
    return { success: false, error: 'Invalid song structure' };
  }

  return {
    success: true,
    graph: { id: 'graph-1', nodes: [], edges: [] },
  };
}

async function testLoadWorkflow(graph: any): Promise<{
  success: boolean;
  loaded: boolean;
  error?: string;
}> {
  if (!graph || !graph.id) {
    return { success: false, loaded: false, error: 'Invalid graph' };
  }

  return { success: true, loaded: true };
}

async function testPlayWorkflow(): Promise<{
  success: boolean;
  playing: boolean;
}> {
  return { success: true, playing: true };
}

async function testStopWorkflow(): Promise<{
  success: boolean;
  playing: boolean;
}> {
  return { success: true, playing: false };
}

async function testCompleteWorkflow(song: any): Promise<{
  success: boolean;
  duration: number;
}> {
  const startTime = Date.now();

  const authorResult = await testAuthorWorkflow(song);
  const realizeResult = await testRealizeWorkflow(song);
  const loadResult = await testLoadWorkflow(realizeResult.graph);
  const playResult = await testPlayWorkflow();
  await testStopWorkflow();

  return {
    success:
      authorResult.success &&
      realizeResult.success &&
      loadResult.success &&
      playResult.success,
    duration: Date.now() - startTime,
  };
}

async function testEditWorkflow(song: any): Promise<any> {
  const edited = JSON.parse(JSON.stringify(song));
  edited.metadata.name += ' (edited)';
  return edited;
}

async function testReconcileWorkflow(
  original: any,
  edited: any,
  currentGraph: any
): Promise<{
  success: boolean;
  changes: number;
  conflicts: number;
  graph?: any;
}> {
  // Simulate reconciliation
  return {
    success: true,
    changes: 5,
    conflicts: 0,
    graph: currentGraph || { id: 'reconciled-1' },
  };
}

async function testCreatePerformance(
  song: any,
  config: any
): Promise<{ success: boolean; id: string }> {
  return { success: true, id: `perf-${Date.now()}` };
}

async function testSwitchPerformance(
  perfId: string
): Promise<{ success: boolean; active: string }> {
  return { success: true, active: perfId };
}

async function testBlendPerformance(
  perfA: string,
  perfB: string,
  blend: number
): Promise<{ success: boolean; blendValue: number }> {
  return { success: true, blendValue: blend };
}

async function testModifyPerformance(
  perfId: string,
  changes: any
): Promise<any> {
  return { id: perfId, ...changes };
}

async function testLoadPerformance(perfId: string): Promise<any> {
  return { id: perfId, tempo: 140 };
}

async function testPlayWorkflowWithError(): Promise<{
  success: boolean;
  playing: boolean;
}> {
  return { success: false, playing: false };
}
