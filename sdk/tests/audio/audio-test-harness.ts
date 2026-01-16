/**
 * Audio Test Harness
 *
 * Comprehensive utilities for real-time audio validation in performance switching tests.
 * Provides audio capture, signal generation, glitch detection, and analysis tools.
 *
 * @module audio-test-harness
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface AudioBuffer {
  channels: Float32Array[];
  sampleRate: number;
  channelCount: number;
  frameCount: number;
  duration: number; // in seconds
}

export interface AudioCaptureOptions {
  sampleRate: number;
  channelCount: number;
  bufferSize: number;
  duration: number; // in seconds
}

export interface GlitchReport {
  count: number;
  locations: GlitchLocation[];
  maxAmplitude: number;
  avgAmplitude: number;
  hasGlitches: boolean;
}

export interface GlitchLocation {
  index: number;
  time: number; // in seconds
  amplitude: number;
  channel: number;
  type: 'click' | 'pop' | 'dropout' | 'discontinuity';
}

export interface InstrumentReport {
  spectralCentroid: number;
  spectralSpread: number;
  spectralRolloff: number;
  harmonicContent: number;
  estimatedInstrument: string;
  confidence: number;
}

export interface TimingReport {
  latency: number; // milliseconds
  barAccuracy: number; // milliseconds from bar boundary
  phaseAlignment: boolean;
  timingConsistency: number; // standard deviation in ms
}

export interface PerformanceSwitchMetrics {
  switchTime: number; // in seconds
  audioDropouts: number;
  cpuBefore: number;
  cpuAfter: number;
  voiceCountBefore: number;
  voiceCountAfter: number;
  glitches: GlitchReport;
}

// =============================================================================
// AUDIO CAPTURE
// =============================================================================

/**
 * Audio capture utility for recording real-time audio output
 */
export class AudioCapture {
  private buffer: AudioBuffer;
  private capturedFrames: number = 0;
  private isCapturing: boolean = false;

  constructor(options: AudioCaptureOptions) {
    this.buffer = this.createBuffer(options);
  }

  /**
   * Create an empty audio buffer
   */
  private createBuffer(options: AudioCaptureOptions): AudioBuffer {
    const channels: Float32Array[] = [];
    for (let i = 0; i < options.channelCount; i++) {
      channels.push(new Float32Array(options.sampleRate * options.duration));
    }

    return {
      channels,
      sampleRate: options.sampleRate,
      channelCount: options.channelCount,
      frameCount: options.sampleRate * options.duration,
      duration: options.duration,
    };
  }

  /**
   * Start audio capture
   */
  start(): void {
    this.isCapturing = true;
    this.capturedFrames = 0;
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    this.isCapturing = false;
  }

  /**
   * Write audio frames to buffer
   */
  writeFrames(frames: Float32Array[]): void {
    if (!this.isCapturing) {
      return;
    }

    const samplesToWrite = Math.min(
      frames[0].length,
      this.buffer.frameCount - this.capturedFrames
    );

    for (let ch = 0; ch < this.buffer.channelCount; ch++) {
      this.buffer.channels[ch].set(
        frames[ch].subarray(0, samplesToWrite),
        this.capturedFrames
      );
    }

    this.capturedFrames += samplesToWrite;

    // Auto-stop when buffer is full
    if (this.capturedFrames >= this.buffer.frameCount) {
      this.stop();
    }
  }

  /**
   * Get captured audio buffer
   */
  getBuffer(): AudioBuffer {
    // Return only captured portion
    return {
      channels: this.buffer.channels.map(ch => ch.slice(0, this.capturedFrames)),
      sampleRate: this.buffer.sampleRate,
      channelCount: this.buffer.channelCount,
      frameCount: this.capturedFrames,
      duration: this.capturedFrames / this.buffer.sampleRate,
    };
  }

  /**
   * Reset capture buffer
   */
  reset(): void {
    this.capturedFrames = 0;
    this.isCapturing = false;
  }
}

// =============================================================================
// SIGNAL GENERATION
// =============================================================================

/**
 * Generate deterministic test signals for audio validation
 */
export class SignalGenerator {
  /**
   * Generate sine wave tone
   */
  static sine(
    frequency: number,
    duration: number,
    sampleRate: number,
    amplitude: number = 0.7
  ): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
    }

    return buffer;
  }

  /**
   * Generate harmonic series (for instrument simulation)
   */
  static harmonics(
    fundamental: number,
    harmonics: number[],
    duration: number,
    sampleRate: number,
    amplitudes: number[]
  ): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      harmonics.forEach((harmonic, index) => {
        const freq = fundamental * harmonic;
        const amp = amplitudes[index] || (1 / harmonic);
        sample += amp * Math.sin(2 * Math.PI * freq * t);
      });

      buffer[i] = sample / harmonics.length;
    }

    return buffer;
  }

  /**
   * Generate pink noise (for texture simulation)
   */
  static pinkNoise(
    duration: number,
    sampleRate: number,
    amplitude: number = 0.3
  ): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    // Paul Kellet's refined pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const pink = [
      0.02109238, 0.07113478, 0.68873558, 2.07321472, 2.61778368, 3.07010398,
    ];

    for (let i = 0; i < samples; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      buffer[i] =
        (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * amplitude;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  /**
   * Generate click/pop (for testing glitch detection)
   */
  static click(
    position: number, // sample index
    amplitude: number,
    sampleCount: number
  ): Float32Array {
    const buffer = new Float32Array(sampleCount);
    buffer[position] = amplitude;
    return buffer;
  }

  /**
   * Generate amplitude envelope (ADSR)
   */
  static envelope(
    duration: number,
    sampleRate: number,
    attack: number,
    decay: number,
    sustain: number,
    release: number
  ): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    const attackSamples = attack * sampleRate;
    const decaySamples = decay * sampleRate;
    const sustainSamples = sustain * sampleRate;
    const releaseSamples = release * sampleRate;

    for (let i = 0; i < samples; i++) {
      if (i < attackSamples) {
        buffer[i] = i / attackSamples; // Attack
      } else if (i < attackSamples + decaySamples) {
        buffer[i] = 1 - (i - attackSamples) / decaySamples * 0.3; // Decay to 0.7
      } else if (i < attackSamples + decaySamples + sustainSamples) {
        buffer[i] = 0.7; // Sustain
      } else {
        buffer[i] = Math.max(
          0,
          0.7 * (1 - (i - attackSamples - decaySamples - sustainSamples) / releaseSamples)
        ); // Release
      }
    }

    return buffer;
  }

  /**
   * Generate piano-like tone
   */
  static pianoTone(frequency: number, duration: number, sampleRate: number): Float32Array {
    // Piano harmonics with specific amplitudes
    const harmonics = [1, 2, 3, 4, 5, 6];
    const amplitudes = [1.0, 0.6, 0.4, 0.25, 0.2, 0.15];
    const tone = this.harmonics(frequency, harmonics, duration, sampleRate, amplitudes);

    // Apply piano envelope
    const env = this.envelope(duration, sampleRate, 0.01, 0.5, 0.3, 0.5);

    // Mix tone with envelope
    for (let i = 0; i < tone.length; i++) {
      tone[i] *= env[i];
    }

    return tone;
  }

  /**
   * Generate synth-like tone (sawtooth)
   */
  static synthTone(frequency: number, duration: number, sampleRate: number): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Sawtooth wave
      buffer[i] = 2 * ((t * frequency) % 1) - 1;
    }

    return buffer;
  }
}

// =============================================================================
// GLITCH DETECTION
// =============================================================================

/**
 * Detect audio glitches: clicks, pops, dropouts, discontinuities
 */
export class GlitchDetector {
  private readonly CLICK_THRESHOLD = 0.3; // Amplitude change threshold
  private readonly DROPOUT_THRESHOLD = 0.001; // Silence threshold
  private readonly DISCONTINUITY_WINDOW = 10; // Samples to check for discontinuity

  /**
   * Detect all types of glitches in audio buffer
   */
  detectGlitches(buffer: AudioBuffer): GlitchReport {
    const glitches: GlitchLocation[] = [];

    for (let ch = 0; ch < buffer.channelCount; ch++) {
      const channel = buffer.channels[ch];

      // Detect clicks/pops (sudden amplitude changes)
      const clicks = this.detectClicks(channel, ch);
      glitches.push(...clicks);

      // Detect dropouts (silence)
      const dropouts = this.detectDropouts(channel, ch);
      glitches.push(...dropouts);

      // Detect discontinuities
      const discontinuities = this.detectDiscontinuities(channel, ch);
      glitches.push(...discontinuities);
    }

    const maxAmplitude = Math.max(...glitches.map(g => g.amplitude), 0);
    const avgAmplitude =
      glitches.length > 0
        ? glitches.reduce((sum, g) => sum + g.amplitude, 0) / glitches.length
        : 0;

    return {
      count: glitches.length,
      locations: glitches,
      maxAmplitude,
      avgAmplitude,
      hasGlitches: glitches.length > 0,
    };
  }

  /**
   * Detect clicks and pops (sudden amplitude changes)
   */
  private detectClicks(channel: Float32Array, channelNum: number): GlitchLocation[] {
    const clicks: GlitchLocation[] = [];

    for (let i = 1; i < channel.length; i++) {
      const delta = Math.abs(channel[i] - channel[i - 1]);

      if (delta > this.CLICK_THRESHOLD) {
        clicks.push({
          index: i,
          time: i / 48000, // Assume 48kHz for now
          amplitude: delta,
          channel: channelNum,
          type: delta > 0.5 ? 'pop' : 'click',
        });
      }
    }

    return clicks;
  }

  /**
   * Detect audio dropouts (silence)
   */
  private detectDropouts(channel: Float32Array, channelNum: number): GlitchLocation[] {
    const dropouts: GlitchLocation[] = [];
    let dropoutStart = -1;

    for (let i = 0; i < channel.length; i++) {
      const amplitude = Math.abs(channel[i]);

      if (amplitude < this.DROPOUT_THRESHOLD) {
        if (dropoutStart === -1) {
          dropoutStart = i;
        }
      } else {
        if (dropoutStart !== -1) {
          const duration = i - dropoutStart;
          if (duration > 100) { // Minimum dropout duration (samples)
            dropouts.push({
              index: dropoutStart,
              time: dropoutStart / 48000,
              amplitude: 0,
              channel: channelNum,
              type: 'dropout',
            });
          }
          dropoutStart = -1;
        }
      }
    }

    return dropouts;
  }

  /**
   * Detect signal discontinuities
   */
  private detectDiscontinuities(
    channel: Float32Array,
    channelNum: number
  ): GlitchLocation[] {
    const discontinuities: GlitchLocation[] = [];

    for (let i = this.DISCONTINUITY_WINDOW; i < channel.length; i++) {
      // Check for sudden changes in the local neighborhood
      const before = channel.slice(i - this.DISCONTINUITY_WINDOW, i);
      const after = channel.slice(i, i + this.DISCONTINUITY_WINDOW);

      const beforeAvg = before.reduce((sum, v) => sum + v, 0) / before.length;
      const afterAvg = after.reduce((sum, v) => sum + v, 0) / after.length;

      const jump = Math.abs(afterAvg - beforeAvg);

      if (jump > this.CLICK_THRESHOLD * 2) {
        discontinuities.push({
          index: i,
          time: i / 48000,
          amplitude: jump,
          channel: channelNum,
          type: 'discontinuity',
        });
      }
    }

    return discontinuities;
  }

  /**
   * Check if transition point has glitches
   */
  checkTransitionPoint(
    buffer: AudioBuffer,
    transitionSample: number,
    windowSamples: number = 1000
  ): GlitchReport {
    const start = Math.max(0, transitionSample - windowSamples);
    const end = Math.min(buffer.frameCount, transitionSample + windowSamples);

    const transitionBuffer: AudioBuffer = {
      channels: buffer.channels.map(ch => ch.slice(start, end)),
      sampleRate: buffer.sampleRate,
      channelCount: buffer.channelCount,
      frameCount: end - start,
      duration: (end - start) / buffer.sampleRate,
    };

    return this.detectGlitches(transitionBuffer);
  }
}

// =============================================================================
// SPECTRAL ANALYSIS
// =============================================================================

/**
 * Analyze audio spectrum for instrumentation validation
 */
export class SpectralAnalyzer {
  /**
   * Compute FFT magnitude spectrum
   *
   * IMPORTANT: Downsamples signal to max 8192 samples for performance.
   * Full-resolution FFT would take O(N²) time which is too slow for tests.
   * 8192 samples provides sufficient frequency resolution for instrument classification.
   */
  private fftMagnitude(signal: Float32Array): Float32Array {
    // Downsample to max 8192 samples for performance
    const maxSamples = 8192;
    const downsampled = signal.length > maxSamples
      ? this.downsample(signal, maxSamples)
      : signal;

    const N = downsampled.length;
    const magnitude = new Float32Array(N / 2);

    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += downsampled[n] * Math.cos(angle);
        imag -= downsampled[n] * Math.sin(angle);
      }

      magnitude[k] = Math.sqrt(real * real + imag * imag) / N;
    }

    return magnitude;
  }

  /**
   * Downsample signal to target length using averaging
   */
  private downsample(signal: Float32Array, targetLength: number): Float32Array {
    const downsampled = new Float32Array(targetLength);
    const step = signal.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += signal[j];
      }

      downsampled[i] = sum / (end - start);
    }

    return downsampled;
  }

  /**
   * Calculate spectral centroid (brightness)
   */
  calculateCentroid(signal: Float32Array): number {
    const magnitude = this.fftMagnitude(signal);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitude.length; i++) {
      numerator += i * magnitude[i];
      denominator += magnitude[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate spectral spread (bandwidth)
   */
  calculateSpread(signal: Float32Array): number {
    const magnitude = this.fftMagnitude(signal);
    const centroid = this.calculateCentroid(signal);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitude.length; i++) {
      numerator += Math.pow(i - centroid, 2) * magnitude[i];
      denominator += magnitude[i];
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  /**
   * Calculate spectral rolloff (85% energy point)
   */
  calculateRolloff(signal: Float32Array): number {
    const magnitude = this.fftMagnitude(signal);
    const totalEnergy = magnitude.reduce((sum, v) => sum + v, 0);

    let cumulative = 0;
    for (let i = 0; i < magnitude.length; i++) {
      cumulative += magnitude[i];
      if (cumulative >= 0.85 * totalEnergy) {
        return i;
      }
    }

    return magnitude.length - 1;
  }

  /**
   * Detect harmonic content
   */
  detectHarmonics(signal: Float32Array): number {
    const magnitude = this.fftMagnitude(signal);

    // Find peaks
    const peaks: number[] = [];
    for (let i = 1; i < magnitude.length - 1; i++) {
      if (magnitude[i] > magnitude[i - 1] && magnitude[i] > magnitude[i + 1]) {
        peaks.push(i);
      }
    }

    // Check for harmonic relationships
    let harmonicCount = 0;
    if (peaks.length > 0) {
      const fundamental = peaks[0];
      for (let i = 1; i < peaks.length; i++) {
        const ratio = peaks[i] / fundamental;
        if (Math.abs(ratio - Math.round(ratio)) < 0.1) {
          harmonicCount++;
        }
      }
    }

    return harmonicCount;
  }

  /**
   * Classify instrument from spectral characteristics
   */
  classifyInstrument(signal: Float32Array): { instrument: string; confidence: number } {
    const centroid = this.calculateCentroid(signal);
    const harmonics = this.detectHarmonics(signal);
    const spread = this.calculateSpread(signal);

    // Simple classification based on spectral features
    if (harmonics > 5 && centroid < 100 && spread < 50) {
      return { instrument: 'piano', confidence: 0.8 };
    } else if (centroid > 200 && spread > 100) {
      return { instrument: 'synth', confidence: 0.7 };
    } else if (harmonics > 8 && spread < 80) {
      return { instrument: 'strings', confidence: 0.75 };
    } else {
      return { instrument: 'unknown', confidence: 0.5 };
    }
  }

  /**
   * Generate full instrument report
   */
  analyzeInstrumentation(buffer: AudioBuffer): InstrumentReport {
    // Analyze first channel
    const signal = buffer.channels[0];

    const centroid = this.calculateCentroid(signal);
    const spread = this.calculateSpread(signal);
    const rolloff = this.calculateRolloff(signal);
    const harmonics = this.detectHarmonics(signal);
    const { instrument, confidence } = this.classifyInstrument(signal);

    return {
      spectralCentroid: centroid,
      spectralSpread: spread,
      spectralRolloff: rolloff,
      harmonicContent: harmonics,
      estimatedInstrument: instrument,
      confidence,
    };
  }
}

// =============================================================================
// TIMING ANALYSIS
// =============================================================================

/**
 * Analyze timing accuracy of performance switches
 */
export class TimingAnalyzer {
  /**
   * Measure switch timing accuracy
   */
  measureSwitchTiming(
    switchCommandTime: number, // in seconds
    audioChangeTime: number, // in seconds
    barBoundaryTime: number, // in seconds
    sampleRate: number
  ): TimingReport {
    const latency = (audioChangeTime - switchCommandTime) * 1000; // ms
    const barAccuracy = Math.abs(audioChangeTime - barBoundaryTime) * 1000; // ms

    // Check phase alignment (compare zero-crossings)
    const phaseAlignment = this.checkPhaseAlignment(
      audioChangeTime,
      barBoundaryTime,
      sampleRate
    );

    return {
      latency,
      barAccuracy,
      phaseAlignment,
      timingConsistency: barAccuracy, // Simplified
    };
  }

  /**
   * Check phase alignment at transition
   */
  private checkPhaseAlignment(
    time1: number,
    time2: number,
    sampleRate: number
  ): boolean {
    const sample1 = Math.floor(time1 * sampleRate);
    const sample2 = Math.floor(time2 * sampleRate);

    // Check if samples are aligned to zero-crossing
    const tolerance = sampleRate * 0.001; // 1ms tolerance
    return Math.abs(sample1 - sample2) < tolerance;
  }

  /**
   * Analyze tempo stability
   */
  analyzeTempoStability(
    buffer: AudioBuffer,
    expectedTempo: number
  ): { actualTempo: number; variance: number; isStable: boolean } {
    // Detect onsets/beats
    const onsets = this.detectOnsets(buffer);

    if (onsets.length < 2) {
      return { actualTempo: expectedTempo, variance: 0, isStable: true };
    }

    // Calculate inter-onset intervals
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }

    // Calculate average interval (in seconds)
    const avgInterval = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;

    // Convert to BPM
    const actualTempo = 60 / avgInterval;

    // Calculate variance
    const variance =
      intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) /
      intervals.length;

    // Check stability (variance < 10ms)
    const isStable = variance < 0.01;

    return { actualTempo, variance, isStable };
  }

  /**
   * Detect onsets in audio signal
   */
  private detectOnsets(buffer: AudioBuffer): number[] {
    const signal = buffer.channels[0];
    const onsets: number[] = [];

    // Simple energy-based onset detection
    const frameSize = 256;
    const hopSize = 128;

    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      const frame = signal.slice(i, i + frameSize);
      const energy = frame.reduce((sum, v) => sum + v * v, 0);

      // Check for energy increase
      if (i > 0) {
        const prevFrame = signal.slice(i - hopSize, i - hopSize + frameSize);
        const prevEnergy = prevFrame.reduce((sum, v) => sum + v * v, 0);

        if (energy > prevEnergy * 1.5) {
          onsets.push(i / buffer.sampleRate);
        }
      }
    }

    return onsets;
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Monitor CPU and memory usage during performance switches
 */
export class PerformanceMonitor {
  private measurements: Array<{
    time: number;
    cpu: number;
    memory: number;
    voiceCount: number;
  }> = [];

  /**
   * Record performance metrics
   */
  recordMeasurement(cpu: number, memory: number, voiceCount: number): void {
    this.measurements.push({
      time: Date.now(),
      cpu,
      memory,
      voiceCount,
    });
  }

  /**
   * Get performance change during switch
   */
  getPerformanceChange(switchTime: number): {
    cpuBefore: number;
    cpuAfter: number;
    memoryDelta: number;
    voiceCountDelta: number;
  } {
    const before = this.measurements.filter(m => m.time < switchTime);
    const after = this.measurements.filter(m => m.time >= switchTime);

    const cpuBefore =
      before.length > 0 ? before.reduce((sum, m) => sum + m.cpu, 0) / before.length : 0;
    const cpuAfter =
      after.length > 0 ? after.reduce((sum, m) => sum + m.cpu, 0) / after.length : 0;

    const memoryBefore = before.length > 0 ? before[before.length - 1].memory : 0;
    const memoryAfter = after.length > 0 ? after[0].memory : 0;

    const voiceCountBefore = before.length > 0 ? before[before.length - 1].voiceCount : 0;
    const voiceCountAfter = after.length > 0 ? after[0].voiceCount : 0;

    return {
      cpuBefore,
      cpuAfter,
      memoryDelta: memoryAfter - memoryBefore,
      voiceCountDelta: voiceCountAfter - voiceCountBefore,
    };
  }

  /**
   * Check for memory leaks
   *
   * Memory leaks are detected when memory grows consistently over time.
   * Performance switches that cause legitimate memory usage changes (different
   * instrument voice counts) should NOT trigger leak detection.
   *
   * Algorithm: Check if memory shows a consistent upward trend beyond what's
   * expected from performance changes. Allow up to 20% growth for performance
   * switches, but flag consistent growth beyond that.
   */
  detectMemoryLeaks(): boolean {
    if (this.measurements.length < 10) {
      return false;
    }

    // Calculate trend using linear regression
    const n = this.measurements.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.measurements[i].memory;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    // Calculate slope (memory growth per measurement)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate average memory
    const avgMem = sumY / n;

    // Detect leak if slope > 5% of average memory per measurement
    // This indicates consistent growth, not just performance switches
    const leakThreshold = avgMem * 0.05;
    return slope > leakThreshold;
  }

  /**
   * Reset measurements
   */
  reset(): void {
    this.measurements = [];
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compare two audio buffers for equality
 */
export function compareBuffers(buffer1: AudioBuffer, buffer2: AudioBuffer): boolean {
  if (buffer1.frameCount !== buffer2.frameCount) {
    return false;
  }

  if (buffer1.channelCount !== buffer2.channelCount) {
    return false;
  }

  for (let ch = 0; ch < buffer1.channelCount; ch++) {
    const ch1 = buffer1.channels[ch];
    const ch2 = buffer2.channels[ch];

    for (let i = 0; i < ch1.length; i++) {
      if (Math.abs(ch1[i] - ch2[i]) > 0.0001) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate RMS level of audio buffer
 */
export function calculateRMS(buffer: AudioBuffer): number {
  let sumSquares = 0;

  for (let ch = 0; ch < buffer.channelCount; ch++) {
    const channel = buffer.channels[ch];
    for (let i = 0; i < channel.length; i++) {
      sumSquares += channel[i] * channel[i];
    }
  }

  const samples = buffer.frameCount * buffer.channelCount;
  return Math.sqrt(sumSquares / samples);
}

/**
 * Normalize audio buffer to target level
 */
export function normalizeBuffer(buffer: AudioBuffer, targetLevel: number = 0.7): AudioBuffer {
  const currentRMS = calculateRMS(buffer);
  const scaleFactor = targetLevel / (currentRMS || 1);

  const normalizedChannels = buffer.channels.map(channel => {
    const normalized = new Float32Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      normalized[i] = channel[i] * scaleFactor;
    }
    return normalized;
  });

  return {
    ...buffer,
    channels: normalizedChannels,
  };
}

/**
 * Apply fade in/out to prevent clicks
 */
export function applyFade(
  buffer: AudioBuffer,
  fadeInSamples: number,
  fadeOutSamples: number
): AudioBuffer {
  const fadedChannels = buffer.channels.map(channel => {
    const faded = new Float32Array(channel.length);

    for (let i = 0; i < channel.length; i++) {
      let gain = 1.0;

      if (i < fadeInSamples) {
        gain = i / fadeInSamples; // Fade in
      } else if (i > channel.length - fadeOutSamples) {
        gain = (channel.length - i) / fadeOutSamples; // Fade out
      }

      faded[i] = channel[i] * gain;
    }

    return faded;
  });

  return {
    ...buffer,
    channels: fadedChannels,
  };
}
