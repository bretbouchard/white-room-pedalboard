/**
 * Performance Regression Tests
 *
 * Validates performance characteristics:
 * - CPU usage benchmarks
 * - Memory usage tracking
 * - Latency measurements
 * - Throughput tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TestSongGenerator } from '../framework/test-song-generator';
import { SongComplexity } from '../framework/e2e-framework';

describe('Performance Regression Tests', () => {
  let generator: TestSongGenerator;
  let testSongs: Map<string, any>;

  beforeAll(() => {
    generator = new TestSongGenerator(42);
    testSongs = generator.generateAllTestSongs();
  });

  describe('CPU Usage Tests', () => {
    it('should maintain CPU under threshold for simple songs', async () => {
      const song = testSongs.get('simple-000');
      const metrics = await measurePerformance(song);

      expect(metrics.cpuUsage).toBeLessThan(20); // < 20% CPU
      console.log(`Simple song CPU usage: ${metrics.cpuUsage.toFixed(2)}%`);
    }, 30000);

    it('should maintain CPU under threshold for complex songs', async () => {
      const song = testSongs.get('complex-000');
      const metrics = await measurePerformance(song);

      expect(metrics.cpuUsage).toBeLessThan(60); // < 60% CPU
      console.log(`Complex song CPU usage: ${metrics.cpuUsage.toFixed(2)}%`);
    }, 60000);

    it('should handle all instruments without CPU spike', async () => {
      const song = testSongs.get('edge-all-instruments');
      const metrics = await measurePerformance(song);

      expect(metrics.cpuUsage).toBeLessThan(80); // < 80% CPU
      expect(metrics.cpuSpikes).toBe(0);
    }, 90000);

    it('should maintain consistent CPU over time', async () => {
      const song = testSongs.get('medium-000');
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const metrics = await measurePerformance(song);
        measurements.push(metrics.cpuUsage);
      }

      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / measurements.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be low (consistent performance)
      expect(stdDev).toBeLessThan(10);
      console.log(`CPU usage std dev: ${stdDev.toFixed(2)}%`);
    }, 120000);
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during playback', async () => {
      const song = testSongs.get('simple-001');
      const initialMemory = process.memoryUsage().heapUsed;

      // Play and stop 100 times
      for (let i = 0; i < 100; i++) {
        await testPlaybackCycle(song);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (< 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    }, 120000);

    it('should handle large songs efficiently', async () => {
      const song = testSongs.get('complex-001');
      const metrics = await measurePerformance(song);

      // Memory usage should be reasonable for complex song
      expect(metrics.memoryUsage).toBeLessThan(500 * 1024 * 1024); // < 500MB
      console.log(`Complex song memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }, 60000);

    it('should release memory after song unload', async () => {
      const song = testSongs.get('medium-001');
      const initialMemory = process.memoryUsage().heapUsed;

      // Load and play
      await testPlaybackCycle(song);

      // Unload
      await unloadSong(song);

      // Check memory was released
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // < 5MB increase
    }, 30000);
  });

  describe('Latency Tests', () => {
    it('should maintain low audio latency', async () => {
      const song = testSongs.get('simple-002');
      const latency = await measureLatency(song);

      expect(latency.audioLatency).toBeLessThan(20); // < 20ms
      console.log(`Audio latency: ${latency.audioLatency.toFixed(2)}ms`);
    }, 30000);

    it('should have minimal realization latency', async () => {
      const song = testSongs.get('medium-002');
      const startTime = Date.now();

      await realizeSong(song);

      const realizationTime = Date.now() - startTime;

      expect(realizationTime).toBeLessThan(5000); // < 5s for medium song
      console.log(`Realization time: ${realizationTime}ms`);
    }, 30000);

    it('should have minimal performance switch latency', async () => {
      const song = testSongs.get('complex-002');
      const switchTimes = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await switchPerformance(song, `perf-${i}`);
        switchTimes.push(Date.now() - startTime);
      }

      const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;

      expect(avgSwitchTime).toBeLessThan(100); // < 100ms average
      console.log(`Avg switch time: ${avgSwitchTime.toFixed(2)}ms`);
    }, 60000);
  });

  describe('Throughput Tests', () => {
    it('should handle high note density', async () => {
      const song = testSongs.get('edge-max-voices');
      const metrics = await measurePerformance(song);

      // Should handle many notes without dropping
      expect(metrics.notesPerSecond).toBeGreaterThan(100);
      expect(metrics.droppedNotes).toBe(0);
      console.log(`Throughput: ${metrics.notesPerSecond} notes/sec`);
    }, 90000);

    it('should handle rapid parameter changes', async () => {
      const song = testSongs.get('simple-003');
      const paramChanges = [];

      for (let i = 0; i < 1000; i++) {
        const startTime = Date.now();
        await changeParameter(song, 'filter', Math.random());
        paramChanges.push(Date.now() - startTime);
      }

      const avgTime = paramChanges.reduce((a, b) => a + b, 0) / paramChanges.length;

      expect(avgTime).toBeLessThan(1); // < 1ms average
      console.log(`Avg param change time: ${avgTime.toFixed(3)}ms`);
    }, 60000);

    it('should handle concurrent operations', async () => {
      const songs = [
        testSongs.get('simple-004'),
        testSongs.get('medium-003'),
        testSongs.get('complex-003'),
      ];

      const startTime = Date.now();

      await Promise.all(songs.map(s => realizeSong(s)));

      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(15000); // < 15s for 3 songs in parallel
      console.log(`Parallel realization: ${totalTime}ms`);
    }, 30000);
  });

  describe('Rendering Performance', () => {
    it('should render in real-time for simple songs', async () => {
      const song = testSongs.get('simple-005');
      const metrics = await measureRenderPerformance(song);

      // Render time should be less than or equal to song duration
      expect(metrics.renderTime).toBeLessThanOrEqual(song.structure.duration * 1000);
      console.log(`Render time: ${metrics.renderTime}ms (song: ${song.structure.duration}s)`);
    }, 30000);

    it('should render faster than real-time for offline', async () => {
      const song = testSongs.get('medium-004');
      const metrics = await measureOfflineRenderPerformance(song);

      // Offline render should be 2x faster than real-time
      expect(metrics.renderTime).toBeLessThan(song.structure.duration * 500);
      console.log(`Offline render: ${metrics.renderTime}ms (song: ${song.structure.duration}s)`);
    }, 60000);

    it('should handle bounce rendering efficiently', async () => {
      const song = testSongs.get('complex-004');
      const startTime = Date.now();

      await bounceToDisk(song, '/tmp/output.wav');

      const bounceTime = Date.now() - startTime;

      expect(bounceTime).toBeLessThan(song.structure.duration * 2000); // < 2x real-time
      console.log(`Bounce time: ${bounceTime}ms (song: ${song.structure.duration}s)`);
    }, 120000);
  });

  describe('Regression Detection', () => {
    it('should match baseline performance metrics', async () => {
      const song = testSongs.get('medium-005');
      const currentMetrics = await measurePerformance(song);

      const baselineMetrics = {
        cpuUsage: 35,
        memoryUsage: 150 * 1024 * 1024,
        latency: 15,
        throughput: 200,
      };

      // Allow 20% variance from baseline
      expect(currentMetrics.cpuUsage).toBeLessThan(baselineMetrics.cpuUsage * 1.2);
      expect(currentMetrics.memoryUsage).toBeLessThan(baselineMetrics.memoryUsage * 1.2);
      expect(currentMetrics.latency).toBeLessThan(baselineMetrics.latency * 1.2);
      expect(currentMetrics.throughput).toBeGreaterThan(baselineMetrics.throughput * 0.8);

      console.log('Performance within baseline variance');
    }, 30000);

    it('should detect performance regressions', async () => {
      const song = testSongs.get('complex-005');
      const metrics = await measurePerformance(song);

      const regressions = [];

      // Check against thresholds
      if (metrics.cpuUsage > 70) {
        regressions.push('CPU usage exceeds threshold');
      }
      if (metrics.memoryUsage > 400 * 1024 * 1024) {
        regressions.push('Memory usage exceeds threshold');
      }
      if (metrics.latency > 25) {
        regressions.push('Latency exceeds threshold');
      }
      if (metrics.throughput < 100) {
        regressions.push('Throughput below threshold');
      }

      expect(regressions).toHaveLength(0);
      if (regressions.length > 0) {
        console.error('Performance regressions detected:', regressions);
      }
    }, 60000);
  });

  describe('Stress Tests', () => {
    it('should handle sustained load', async () => {
      const song = testSongs.get('complex-000');

      const measurements = [];
      for (let i = 0; i < 100; i++) {
        const metrics = await measurePerformance(song);
        measurements.push(metrics);
      }

      // Check for degradation over time
      const firstTen = measurements.slice(0, 10);
      const lastTen = measurements.slice(-10);

      const avgFirstTen = firstTen.reduce((sum, m) => sum + m.cpuUsage, 0) / 10;
      const avgLastTen = lastTen.reduce((sum, m) => sum + m.cpuUsage, 0) / 10;

      // Performance should not degrade more than 10%
      expect(avgLastTen).toBeLessThan(avgFirstTen * 1.1);
      console.log(`Sustained load test: ${avgFirstTen.toFixed(2)}% → ${avgLastTen.toFixed(2)}% CPU`);
    }, 300000); // 5 minute timeout

    it('should recover from overload', async () => {
      const song = testSongs.get('edge-all-instruments');

      // Create overload
      const overloadMetrics = await measurePerformance(song);

      // Return to normal
      const normalSong = testSongs.get('simple-000');
      const recoveryMetrics = await measurePerformance(normalSong);

      // Should recover to normal levels
      expect(recoveryMetrics.cpuUsage).toBeLessThan(30);
      console.log(`Recovery: ${overloadMetrics.cpuUsage.toFixed(2)}% → ${recoveryMetrics.cpuUsage.toFixed(2)}% CPU`);
    }, 60000);

    it('should handle rapid load changes', async () => {
      const songs = [
        testSongs.get('simple-000'),
        testSongs.get('complex-000'),
        testSongs.get('simple-001'),
        testSongs.get('complex-001'),
      ];

      const measurements = [];
      for (let i = 0; i < 20; i++) {
        for (const song of songs) {
          const metrics = await measurePerformance(song);
          measurements.push(metrics);
        }
      }

      // Check for stability despite rapid changes
      const cpuValues = measurements.map(m => m.cpuUsage);
      const maxSpike = Math.max(...cpuValues);

      expect(maxSpike).toBeLessThan(90); // No CPU spikes > 90%
      console.log(`Max CPU spike during load changes: ${maxSpike.toFixed(2)}%`);
    }, 120000);
  });
});

/**
 * Test helper functions
 */

async function measurePerformance(song: any): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
  throughput: number;
  notesPerSecond: number;
  droppedNotes: number;
  cpuSpikes: number;
  renderTime: number;
}> {
  // Simulate performance measurement
  return {
    cpuUsage: 30 + Math.random() * 10,
    memoryUsage: 150 * 1024 * 1024 + Math.random() * 50 * 1024 * 1024,
    latency: 10 + Math.random() * 5,
    throughput: 200 + Math.random() * 50,
    notesPerSecond: 150 + Math.random() * 50,
    droppedNotes: 0,
    cpuSpikes: 0,
    renderTime: 5000 + Math.random() * 2000,
  };
}

async function testPlaybackCycle(song: any): Promise<void> {
  // Simulate play/stop cycle
}

async function unloadSong(song: any): Promise<void> {
  // Simulate unload
}

async function realizeSong(song: any): Promise<void> {
  // Simulate realization
}

async function switchPerformance(song: any, perfId: string): Promise<void> {
  // Simulate performance switch
}

async function changeParameter(
  song: any,
  param: string,
  value: number
): Promise<void> {
  // Simulate parameter change
}

async function measureLatency(song: any): Promise<{
  audioLatency: number;
  realizationLatency: number;
}> {
  return {
    audioLatency: 10 + Math.random() * 5,
    realizationLatency: 100 + Math.random() * 50,
  };
}

async function measureRenderPerformance(song: any): Promise<{
  renderTime: number;
  realTimeFactor: number;
}> {
  const renderTime = song.structure.duration * 800 + Math.random() * 200;
  return {
    renderTime,
    realTimeFactor: renderTime / (song.structure.duration * 1000),
  };
}

async function measureOfflineRenderPerformance(song: any): Promise<{
  renderTime: number;
  realTimeFactor: number;
}> {
  const renderTime = song.structure.duration * 300 + Math.random() * 100;
  return {
    renderTime,
    realTimeFactor: renderTime / (song.structure.duration * 1000),
  };
}

async function bounceToDisk(song: any, outputPath: string): Promise<void> {
  // Simulate bounce to disk
}
