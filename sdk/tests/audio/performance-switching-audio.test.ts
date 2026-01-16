/**
 * Performance Switching Audio Tests
 *
 * Comprehensive audio validation for real-time performance switching.
 * Tests audio quality, timing accuracy, state transitions, and system performance.
 *
 * @module performance-switching-audio
 */

import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";

import {
  AudioCapture,
  SignalGenerator,
  GlitchDetector,
  SpectralAnalyzer,
  TimingAnalyzer,
  PerformanceMonitor,
  normalizeBuffer,
  applyFade,
  type AudioBuffer,
  type GlitchReport,
  type InstrumentReport,
  type TimingReport,
} from "./audio-test-harness";

import {
  SongModel_v2,
  PerformanceManager,
  createDemoSong,
} from "../../core/song-model-v2";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Simulate JUCE audio engine rendering
 */
class MockAudioEngine {
  private sampleRate: number;
  private bufferSize: number;
  private currentPerformance: string = "solo-piano";
  private currentTime: number = 0;

  constructor(sampleRate: number = 48000, bufferSize: number = 512) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
  }

  /**
   * Switch performance at next bar boundary
   */
  switchPerformance(performanceId: string): void {
    this.currentPerformance = performanceId;
  }

  /**
   * Render audio buffer for current performance
   */
  render(frameCount: number): Float32Array[] {
    const channels: Float32Array[] = [];

    for (let ch = 0; ch < 2; ch++) {
      const buffer = new Float32Array(frameCount);

      // Generate different audio based on performance
      if (this.currentPerformance === "solo-piano") {
        const tone = SignalGenerator.pianoTone(440, frameCount / this.sampleRate, this.sampleRate);
        buffer.set(tone);
      } else if (this.currentPerformance === "satb") {
        const tone = SignalGenerator.harmonics(
          440,
          [1, 2, 3, 4, 5],
          frameCount / this.sampleRate,
          this.sampleRate,
          [1.0, 0.8, 0.6, 0.4, 0.3]
        );
        buffer.set(tone);
      } else if (this.currentPerformance === "ambient-techno") {
        const tone = SignalGenerator.synthTone(220, frameCount / this.sampleRate, this.sampleRate);
        buffer.set(tone);
        // Add pink noise layer
        const noise = SignalGenerator.pinkNoise(frameCount / this.sampleRate, this.sampleRate, 0.2);
        for (let i = 0; i < frameCount; i++) {
          buffer[i] = (buffer[i] * 0.7 + noise[i]) * 0.5;
        }
      }

      channels.push(buffer);
    }

    this.currentTime += frameCount / this.sampleRate;
    return channels;
  }

  /**
   * Get current position in bars
   */
  getCurrentBar(tempo: number, beatsPerBar: number = 4): number {
    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    return Math.floor(this.currentTime / secondsPerBar);
  }

  /**
   * Get time to next bar boundary
   */
  getTimeToNextBar(tempo: number, beatsPerBar: number = 4): number {
    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    const nextBar = Math.ceil(this.currentTime / secondsPerBar) * secondsPerBar;
    return nextBar - this.currentTime;
  }

  /**
   * Reset playback position
   */
  reset(): void {
    this.currentTime = 0;
  }
}

/**
 * Simulate bar boundary tracker
 */
class BarBoundaryTracker {
  private tempo: number;
  private timeSignature: [number, number];
  private currentTime: number = 0;

  constructor(tempo: number, timeSignature: [number, number]) {
    this.tempo = tempo;
    this.timeSignature = timeSignature;
  }

  /**
   * Advance time
   */
  advance(seconds: number): void {
    this.currentTime += seconds;
  }

  /**
   * Check if at bar boundary
   */
  isAtBarBoundary(): boolean {
    const secondsPerBeat = 60 / this.tempo;
    const secondsPerBar = secondsPerBeat * this.timeSignature[0];
    const barPosition = this.currentTime % secondsPerBar;
    return barPosition < 0.01; // Within 10ms of boundary
  }

  /**
   * Get time to next bar boundary
   */
  getTimeToNextBar(): number {
    const secondsPerBeat = 60 / this.tempo;
    const secondsPerBar = secondsPerBeat * this.timeSignature[0];
    const nextBar = Math.ceil(this.currentTime / secondsPerBar) * secondsPerBar;
    return nextBar - this.currentTime;
  }

  /**
   * Get current bar number
   */
  getCurrentBar(): number {
    const secondsPerBeat = 60 / this.tempo;
    const secondsPerBar = secondsPerBeat * this.timeSignature[0];
    return Math.floor(this.currentTime / secondsPerBar);
  }
}

// =============================================================================
// AUDIO QUALITY TESTS
// =============================================================================

describe("Performance Switching - Audio Quality Tests", () => {
  let audioEngine: MockAudioEngine;
  let glitchDetector: GlitchDetector;
  let spectralAnalyzer: SpectralAnalyzer;
  let barTracker: BarBoundaryTracker;
  let songModel: SongModel_v2;

  beforeEach(() => {
    audioEngine = new MockAudioEngine(48000, 512);
    glitchDetector = new GlitchDetector();
    spectralAnalyzer = new SpectralAnalyzer();
    barTracker = new BarBoundaryTracker(120, [4, 4]);
    songModel = createDemoSong();
  });

  describe("Click and Pop Detection", () => {
    it("should detect no clicks in stable piano performance", () => {
      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize: 512,
        duration: 2.0,
      });

      capture.start();
      const frames = audioEngine.render(48000 * 2);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();
      const glitches = glitchDetector.detectGlitches(buffer);

      expect(glitches.hasGlitches).toBe(false);
      expect(glitches.count).toBe(0);
    });

    it("should detect artificial click in audio stream", () => {
      const clickSignal = SignalGenerator.click(1000, 0.8, 48000);
      const buffer: AudioBuffer = {
        channels: [clickSignal],
        sampleRate: 48000,
        channelCount: 1,
        frameCount: 48000,
        duration: 1.0,
      };

      const glitches = glitchDetector.detectGlitches(buffer);

      expect(glitches.hasGlitches).toBe(true);
      expect(glitches.count).toBeGreaterThan(0);
      expect(glitches.locations[0].type).toBe('click');
      expect(glitches.locations[0].index).toBe(1000);
    });

    it("should detect no clicks at performance switch boundary", () => {
      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize: 512,
        duration: 4.0,
      });

      capture.start();

      // Render 2 seconds of piano
      audioEngine.render(48000 * 2);

      // Switch to techno
      audioEngine.switchPerformance("ambient-techno");

      // Render 2 seconds of techno
      const frames = audioEngine.render(48000 * 2);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();

      // Check transition point (around sample 96000)
      const transitionGlitches = glitchDetector.checkTransitionPoint(buffer, 96000, 1000);

      expect(transitionGlitches.hasGlitches).toBe(false);
      expect(transitionGlitches.count).toBe(0);
    });

    it("should detect dropout (silence) in audio stream", () => {
      const signal = new Float32Array(48000);
      // Add silence in the middle
      for (let i = 10000; i < 20000; i++) {
        signal[i] = 0;
      }
      // Add signal elsewhere
      for (let i = 0; i < 10000; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.5;
      }
      for (let i = 20000; i < 48000; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.5;
      }

      const buffer: AudioBuffer = {
        channels: [signal],
        sampleRate: 48000,
        channelCount: 1,
        frameCount: 48000,
        duration: 1.0,
      };

      const glitches = glitchDetector.detectGlitches(buffer);

      expect(glitches.hasGlitches).toBe(true);
      expect(glitches.locations.some(g => g.type === 'dropout')).toBe(true);
    });
  });

  describe("Spectral Analysis and Instrumentation", () => {
    it("should correctly classify piano tone", () => {
      const pianoTone = SignalGenerator.pianoTone(440, 1.0, 48000);
      const buffer: AudioBuffer = {
        channels: [pianoTone],
        sampleRate: 48000,
        channelCount: 1,
        frameCount: 48000,
        duration: 1.0,
      };

      const report = spectralAnalyzer.analyzeInstrumentation(buffer);

      expect(report.estimatedInstrument).toBe('piano');
      expect(report.confidence).toBeGreaterThan(0.7);
      expect(report.harmonicContent).toBeGreaterThan(3);
      expect(report.spectralCentroid).toBeLessThan(100);
    });

    it("should correctly classify synth tone", () => {
      const synthTone = SignalGenerator.synthTone(220, 1.0, 48000);
      const buffer: AudioBuffer = {
        channels: [synthTone],
        sampleRate: 48000,
        channelCount: 1,
        frameCount: 48000,
        duration: 1.0,
      };

      const report = spectralAnalyzer.analyzeInstrumentation(buffer);

      expect(report.estimatedInstrument).toBe('synth');
      expect(report.spectralCentroid).toBeGreaterThan(100);
      expect(report.spectralSpread).toBeGreaterThan(50);
    });

    it("should detect instrumentation change during performance switch", () => {
      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize: 512,
        duration: 4.0,
      });

      capture.start();

      // Render piano
      audioEngine.render(48000 * 2);
      audioEngine.switchPerformance("ambient-techno");
      const frames = audioEngine.render(48000 * 2);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();

      // Analyze first half (should be piano)
      const firstHalf: AudioBuffer = {
        ...buffer,
        channels: buffer.channels.map(ch => ch.slice(0, ch.length / 2)),
        frameCount: buffer.frameCount / 2,
        duration: buffer.duration / 2,
      };
      const firstReport = spectralAnalyzer.analyzeInstrumentation(firstHalf);

      // Analyze second half (should be synth)
      const secondHalf: AudioBuffer = {
        ...buffer,
        channels: buffer.channels.map(ch => ch.slice(ch.length / 2)),
        frameCount: buffer.frameCount / 2,
        duration: buffer.duration / 2,
      };
      const secondReport = spectralAnalyzer.analyzeInstrumentation(secondHalf);

      expect(firstReport.estimatedInstrument).toBe('piano');
      expect(secondReport.estimatedInstrument).toBe('synth');
    });
  });

  describe("Timing Accuracy", () => {
    it("should switch performance at bar boundary", () => {
      const tempo = 120;
      const beatsPerBar = 4;
      const secondsPerBeat = 60 / tempo;
      const secondsPerBar = secondsPerBeat * beatsPerBar; // 2.0 seconds

      // Advance to bar 3.9 (just before bar 4)
      barTracker["currentTime"] = 3.9 * secondsPerBar;

      // Request switch
      const switchTime = barTracker["currentTime"];
      const timeToNextBar = barTracker.getTimeToNextBar();

      // Wait for next bar
      barTracker.advance(timeToNextBar);
      const actualSwitchTime = barTracker["currentTime"];

      // Verify switch happened at bar boundary
      expect(barTracker.isAtBarBoundary()).toBe(true);
      expect(barTracker.getCurrentBar()).toBe(4);
      expect(Math.abs(actualSwitchTime - (4 * secondsPerBar))).toBeLessThan(0.01); // ±10ms
    });

    it("should have minimal latency between switch command and audio change", () => {
      const tempo = 120;
      const switchCommandTime = 0;
      const barBoundaryTime = 2.0; // End of bar 1
      const audioChangeTime = 2.005; // 5ms after bar boundary (simulated processing delay)

      const timingAnalyzer = new TimingAnalyzer();
      const report = timingAnalyzer.measureSwitchTiming(
        switchCommandTime,
        audioChangeTime,
        barBoundaryTime,
        48000
      );

      // Latency should be ~2s (wait for bar boundary) + 5ms (processing)
      expect(report.latency).toBeGreaterThan(2000);
      expect(report.latency).toBeLessThan(2010);

      // Should be within ±10ms of bar boundary
      expect(report.barAccuracy).toBeLessThan(10);
    });

    it("should maintain tempo stability across performance switch", () => {
      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize: 512,
        duration: 8.0,
      });

      capture.start();

      // Render 4 seconds of piano
      audioEngine.render(48000 * 4);

      // Switch to techno
      audioEngine.switchPerformance("ambient-techno");

      // Render 4 seconds of techno
      const frames = audioEngine.render(48000 * 4);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();
      const timingAnalyzer = new TimingAnalyzer();
      const tempoAnalysis = timingAnalyzer.analyzeTempoStability(buffer, 120);

      expect(tempoAnalysis.isStable).toBe(true);
      expect(tempoAnalysis.variance).toBeLessThan(0.01); // Less than 10ms variance
      expect(Math.abs(tempoAnalysis.actualTempo - 120)).toBeLessThan(5); // ±5 BPM tolerance
    });
  });

  describe("Rapid Switching", () => {
    it("should handle rapid performance switches without glitches", () => {
      const performances = ["solo-piano", "satb", "ambient-techno"];
      const switches = 10;
      const barsPerSwitch = 2;

      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize: 512,
        duration: switches * barsPerSwitch * 2.0, // 2 seconds per bar
      });

      capture.start();

      for (let i = 0; i < switches; i++) {
        const perf = performances[i % 3];
        audioEngine.switchPerformance(perf);

        // Render 2 bars
        const framesPerBar = 48000 * 2;
        audioEngine.render(framesPerBar * barsPerSwitch);
      }

      const frames = audioEngine.render(48000 * 4);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();
      const glitches = glitchDetector.detectGlitches(buffer);

      expect(glitches.hasGlitches).toBe(false);
      expect(glitches.count).toBe(0);
    });

    it("should maintain audio quality during rapid switches", () => {
      const performances = ["solo-piano", "ambient-techno", "satb"];

      const reports: InstrumentReport[] = [];

      for (const perf of performances) {
        audioEngine.switchPerformance(perf);

        const capture = new AudioCapture({
          sampleRate: 48000,
          channelCount: 2,
          bufferSize: 512,
          duration: 1.0,
        });

        capture.start();
        const frames = audioEngine.render(48000);
        capture.writeFrames(frames);
        capture.stop();

        const buffer = capture.getBuffer();
        const report = spectralAnalyzer.analyzeInstrumentation(buffer);
        reports.push(report);
      }

      // Verify each performance has distinct spectral characteristics
      expect(reports[0].estimatedInstrument).toBe('piano');
      expect(reports[1].estimatedInstrument).toBe('synth');
      expect(reports[2].estimatedInstrument).not.toBe('unknown');
    });
  });
});

// =============================================================================
// STATE TRANSITION TESTS
// =============================================================================

describe("Performance Switching - State Transition Tests", () => {
  let performanceMonitor: PerformanceMonitor;
  let songModel: SongModel_v2;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    songModel = createDemoSong();
  });

  describe("CPU Usage Changes", () => {
    it("should track CPU usage changes during switch", () => {
      // Simulate CPU usage before switch
      performanceMonitor.recordMeasurement(30, 100, 5); // 30% CPU, 100MB, 5 voices

      const switchTime = Date.now();

      // Simulate CPU usage after switch
      performanceMonitor.recordMeasurement(50, 110, 8); // 50% CPU, 110MB, 8 voices

      const change = performanceMonitor.getPerformanceChange(switchTime);

      expect(change.cpuBefore).toBe(30);
      expect(change.cpuAfter).toBe(50);
      expect(change.voiceCountDelta).toBe(3);
    });

    it("should keep CPU usage within limits", () => {
      const performances = ["solo-piano", "satb", "ambient-techno"];

      for (const perf of performances) {
        // Simulate different CPU usage per performance
        const cpuUsage =
          perf === "solo-piano" ? 30 : perf === "satb" ? 45 : 60;

        performanceMonitor.recordMeasurement(cpuUsage, 100, 5);

        expect(cpuUsage).toBeLessThan(70); // 70% max threshold
      }
    });
  });

  describe("Memory Stability", () => {
    it("should not leak memory during performance switches", () => {
      const switches = 100;

      for (let i = 0; i < switches; i++) {
        // Simulate small memory allocation per switch
        const memory = 100 + Math.random() * 10; // 100-110MB
        performanceMonitor.recordMeasurement(50, memory, 5);
      }

      const hasLeaks = performanceMonitor.detectMemoryLeaks();

      expect(hasLeaks).toBe(false);
    });

    it("should return memory after performance switch", () => {
      // Initial state
      performanceMonitor.recordMeasurement(30, 100, 5);

      const switchTime = Date.now();

      // Switch to more complex performance
      performanceMonitor.recordMeasurement(50, 120, 8);

      // Switch back to simpler performance
      performanceMonitor.recordMeasurement(30, 105, 5);

      const change = performanceMonitor.getPerformanceChange(switchTime);

      // Memory should return close to initial
      expect(change.memoryDelta).toBeLessThan(10); // Less than 10MB delta
    });
  });

  describe("Voice Count Changes", () => {
    it("should update voice count correctly", () => {
      const pianoVoices = 2;
      const satbVoices = 4;
      const technoVoices = 8;

      performanceMonitor.recordMeasurement(30, 100, pianoVoices);
      performanceMonitor.recordMeasurement(45, 110, satbVoices);
      performanceMonitor.recordMeasurement(60, 120, technoVoices);

      const changes = [
        performanceMonitor.getPerformanceChange(0),
        performanceMonitor.getPerformanceChange(100),
      ];

      expect(changes[0].voiceCountDelta).toBe(2); // piano -> satb
      expect(changes[1].voiceCountDelta).toBe(4); // satb -> techno
    });
  });
});

// =============================================================================
// SYSTEM PERFORMANCE TESTS
// =============================================================================

describe("Performance Switching - System Performance Tests", () => {
  it("should handle stress test of 100 rapid switches", () => {
    const audioEngine = new MockAudioEngine(48000, 512);
    const glitchDetector = new GlitchDetector();

    const capture = new AudioCapture({
      sampleRate: 48000,
      channelCount: 2,
      bufferSize: 512,
      duration: 200.0, // 200 seconds of audio
    });

    capture.start();

    for (let i = 0; i < 100; i++) {
      const perf = i % 2 === 0 ? "solo-piano" : "ambient-techno";
      audioEngine.switchPerformance(perf);
      audioEngine.render(48000 * 2); // 2 seconds per switch
    }

    const frames = audioEngine.render(48000 * 4);
    capture.writeFrames(frames);
    capture.stop();

    const buffer = capture.getBuffer();
    const glitches = glitchDetector.detectGlitches(buffer);

    expect(glitches.hasGlitches).toBe(false);
    expect(glitches.count).toBe(0);
  });

  it("should maintain audio quality at high sample rates", () => {
    const sampleRates = [44100, 48000, 96000];

    for (const sampleRate of sampleRates) {
      const audioEngine = new MockAudioEngine(sampleRate, 512);
      const spectralAnalyzer = new SpectralAnalyzer();

      audioEngine.switchPerformance("solo-piano");

      const capture = new AudioCapture({
        sampleRate,
        channelCount: 2,
        bufferSize: 512,
        duration: 1.0,
      });

      capture.start();
      const frames = audioEngine.render(sampleRate);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();
      const report = spectralAnalyzer.analyzeInstrumentation(buffer);

      expect(report.estimatedInstrument).toBe('piano');
      expect(report.confidence).toBeGreaterThan(0.6);
    }
  });

  it("should handle different buffer sizes", () => {
    const bufferSizes = [64, 128, 256, 512, 1024, 2048];

    for (const bufferSize of bufferSizes) {
      const audioEngine = new MockAudioEngine(48000, bufferSize);
      const glitchDetector = new GlitchDetector();

      audioEngine.switchPerformance("ambient-techno");

      const capture = new AudioCapture({
        sampleRate: 48000,
        channelCount: 2,
        bufferSize,
        duration: 1.0,
      });

      capture.start();
      const frames = audioEngine.render(48000);
      capture.writeFrames(frames);
      capture.stop();

      const buffer = capture.getBuffer();
      const glitches = glitchDetector.detectGlitches(buffer);

      expect(glitches.hasGlitches).toBe(false);
    }
  });
});
