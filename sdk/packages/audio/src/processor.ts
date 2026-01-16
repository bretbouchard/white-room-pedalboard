/**
 * Real-time audio processing utilities for Schillinger patterns
 */

import { RhythmPattern, ChordProgression } from "@schillinger-sdk/shared";

export interface AudioProcessingOptions {
  sampleRate?: number;
  bufferSize?: number;
  channels?: number;
  windowType?: "hann" | "hamming" | "blackman" | "rectangular";
  hopSize?: number;
  fftSize?: number;
}

export interface AudioAnalysisResult {
  timestamp: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface RhythmAnalysisResult extends AudioAnalysisResult {
  tempo: number;
  beats: number[];
  onsets: number[];
  rhythmPattern?: RhythmPattern;
  generators?: [number, number];
}

export interface HarmonyAnalysisResult extends AudioAnalysisResult {
  chords: string[];
  key: string;
  scale: string;
  progression?: ChordProgression;
  chromaticity: number;
}

export interface SpectralAnalysisResult extends AudioAnalysisResult {
  frequencies: number[];
  magnitudes: number[];
  phases: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
}

export interface AudioFeatures {
  rms: number;
  zcr: number; // Zero crossing rate
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  mfcc: number[]; // Mel-frequency cepstral coefficients
  chroma: number[];
  tonnetz: number[];
}

/**
 * Advanced audio processor for real-time analysis and Schillinger pattern integration
 */
export class AudioProcessor {
  private options: Required<AudioProcessingOptions>;
  private window: Float32Array;
  private previousSpectrum: Float32Array | null = null;
  private beatTracker: BeatTracker;
  private chordDetector: ChordDetector;
  private onsetDetector: OnsetDetector;

  constructor(options: AudioProcessingOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate || 44100,
      bufferSize: options.bufferSize || 1024,
      channels: options.channels || 2,
      windowType: options.windowType || "hann",
      hopSize: options.hopSize || 512,
      fftSize: options.fftSize || 2048,
    };

    // Removed unused fftBuffer assignment
    this.window = this.createWindow(
      this.options.windowType,
      this.options.fftSize,
    );
    this.beatTracker = new BeatTracker();
    this.chordDetector = new ChordDetector();
    this.onsetDetector = new OnsetDetector(this.options.sampleRate);
  }

  /**
   * Process audio buffer with comprehensive analysis
   */
  processBuffer(
    buffer: Float32Array,
    timestamp: number = Date.now(),
  ): {
    processed: Float32Array;
    rhythm?: RhythmAnalysisResult;
    harmony?: HarmonyAnalysisResult;
    spectral?: SpectralAnalysisResult;
    features?: AudioFeatures;
  } {
    // Ensure buffer is the right size
    const processedBuffer = this.normalizeBuffer(buffer);

    // Extract audio features
    const features = this.extractFeatures(processedBuffer);

    // Perform spectral analysis
    const spectral = this.analyzeSpectrum(processedBuffer, timestamp);

    // Analyze rhythm
    const rhythm = this.analyzeRhythm(processedBuffer, timestamp);

    // Analyze harmony
    const harmony = this.analyzeHarmony(processedBuffer, timestamp);

    return {
      processed: processedBuffer,
      rhythm,
      harmony,
      spectral,
      features,
    };
  }

  /**
   * Analyze audio for rhythmic content with Schillinger pattern detection
   */
  analyzeRhythm(
    buffer: Float32Array,
    timestamp: number = Date.now(),
  ): RhythmAnalysisResult {
    // Detect onsets
    const onsets = this.onsetDetector.detectOnsets(buffer);

    // Track beats
    const beatInfo = this.beatTracker.trackBeats(
      buffer,
      onsets,
      this.options.sampleRate,
    );

    // Try to infer Schillinger generators from detected rhythm
    let generators: [number, number] | undefined;
    let rhythmPattern: RhythmPattern | undefined;

    if (beatInfo.beats.length > 4) {
      try {
        // Convert beat times to duration pattern
        const durations = this.beatsToPattern(beatInfo.beats);
        rhythmPattern = {
          durations,
          timeSignature: [4, 4],
          tempo: beatInfo.tempo,
        };

        // Try to infer generators (simplified)
        generators = this.inferGeneratorsFromPattern(durations);
      } catch (error) {
        // Ignore inference errors
      }
    }

    return {
      timestamp,
      tempo: beatInfo.tempo,
      beats: beatInfo.beats,
      onsets,
      rhythmPattern,
      generators,
      confidence: beatInfo.confidence,
      metadata: {
        beatStrength: beatInfo.strength,
        regularity: beatInfo.regularity,
      },
    };
  }

  /**
   * Extract harmonic content from audio with chord progression analysis
   */
  analyzeHarmony(
    buffer: Float32Array,
    timestamp: number = Date.now(),
  ): HarmonyAnalysisResult {
    // Extract chroma features
    const chroma = this.extractChroma(buffer);

    // Input validation: ensure chroma is a valid array of finite numbers
    const safeChroma =
      Array.isArray(chroma) &&
      chroma.every((x) => typeof x === "number" && Number.isFinite(x))
        ? chroma
        : new Array(12).fill(0);

    // Detect chords
    const chordInfo = this.chordDetector.detectChords(safeChroma);

    // Analyze key
    const keyInfo = this.analyzeKey(safeChroma);

    // Calculate chromaticity (how chromatic vs diatonic) with safe division
    let chromaticity = 0;
    try {
      chromaticity = this.calculateChromaticity(safeChroma);
      if (!Number.isFinite(chromaticity)) chromaticity = 0;
    } catch {
      chromaticity = 0;
    }

    // Create chord progression if we have enough chords
    let progression: ChordProgression | undefined;
    if (chordInfo.chords.length > 0) {
      progression = {
        chords: chordInfo.chords,
        key: keyInfo.key,
        scale: keyInfo.scale,
      };
    }

    return {
      timestamp,
      chords: chordInfo.chords,
      key: keyInfo.key,
      scale: keyInfo.scale,
      progression,
      chromaticity,
      confidence: Math.min(
        Number.isFinite(chordInfo.confidence) ? chordInfo.confidence : 0,
        Number.isFinite(keyInfo.confidence) ? keyInfo.confidence : 0,
      ),
      metadata: {
        chordStrength: Number.isFinite(chordInfo.strength)
          ? chordInfo.strength
          : 0,
        keyStrength: Number.isFinite(keyInfo.strength) ? keyInfo.strength : 0,
        harmonicComplexity: (() => {
          try {
            const hc = this.calculateHarmonicComplexity(safeChroma);
            return Number.isFinite(hc) ? hc : 0;
          } catch {
            return 0;
          }
        })(),
      },
    };
  }

  /**
   * Perform detailed spectral analysis
   */
  analyzeSpectrum(
    buffer: Float32Array,
    timestamp: number = Date.now(),
  ): SpectralAnalysisResult {
    // Apply window and compute FFT
    const windowed = this.applyWindow(buffer);
    const spectrum = this.computeFFT(windowed);

    const frequencies = this.getFrequencyBins();
    const magnitudes = spectrum.map((complex) =>
      Math.sqrt(complex.real * complex.real + complex.imag * complex.imag),
    );
    const phases = spectrum.map((complex) =>
      Math.atan2(complex.imag, complex.real),
    );

    // Calculate spectral features
    const spectralCentroid = this.calculateSpectralCentroid(
      frequencies,
      magnitudes,
    );
    const spectralRolloff = this.calculateSpectralRolloff(
      frequencies,
      magnitudes,
    );
    const spectralFlux = this.calculateSpectralFlux(magnitudes);

    return {
      timestamp,
      frequencies,
      magnitudes,
      phases,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      confidence: 0.9, // Spectral analysis is generally reliable
      metadata: {
        peakFrequency: frequencies[magnitudes.indexOf(Math.max(...magnitudes))],
        spectralSpread: this.calculateSpectralSpread(
          frequencies,
          magnitudes,
          spectralCentroid,
        ),
        spectralSkewness: this.calculateSpectralSkewness(
          frequencies,
          magnitudes,
          spectralCentroid,
        ),
      },
    };
  }

  /**
   * Extract comprehensive audio features
   */
  extractFeatures(buffer: Float32Array): AudioFeatures {
    // Time-domain features
    const rms = this.calculateRMS(buffer);
    const zcr = this.calculateZCR(buffer);

    // Frequency-domain features
    const windowed = this.applyWindow(buffer);
    const spectrum = this.computeFFT(windowed);
    const magnitudes = spectrum.map((complex) =>
      Math.sqrt(complex.real * complex.real + complex.imag * complex.imag),
    );
    const frequencies = this.getFrequencyBins();

    const spectralCentroid = this.calculateSpectralCentroid(
      frequencies,
      magnitudes,
    );
    const spectralRolloff = this.calculateSpectralRolloff(
      frequencies,
      magnitudes,
    );
    const spectralFlux = this.calculateSpectralFlux(magnitudes);

    // Advanced features
    const mfcc = this.calculateMFCC(magnitudes);
    const chroma = this.extractChroma(buffer);
    const tonnetz = this.calculateTonnetz(chroma);

    return {
      rms,
      zcr,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      mfcc,
      chroma,
      tonnetz,
    };
  }

  /**
   * Apply real-time effects based on Schillinger patterns
   */
  applySchillingerEffect(
    buffer: Float32Array,
    pattern: RhythmPattern,
    effectType:
      | "rhythmic-gate"
      | "harmonic-filter"
      | "dynamic-modulation" = "rhythmic-gate",
  ): Float32Array {
    // const output = new Float32Array(buffer.length);

    switch (effectType) {
      case "rhythmic-gate":
        return this.applyRhythmicGate(buffer, pattern);
      case "harmonic-filter":
        return this.applyHarmonicFilter(buffer, pattern);
      case "dynamic-modulation":
        return this.applyDynamicModulation(buffer, pattern);
      default:
        return buffer;
    }
  }

  // Private helper methods

  private normalizeBuffer(buffer: Float32Array): Float32Array {
    if (buffer.length === this.options.bufferSize) {
      return buffer;
    }

    const normalized = new Float32Array(this.options.bufferSize);
    const ratio = buffer.length / this.options.bufferSize;

    for (let i = 0; i < this.options.bufferSize; i++) {
      const sourceIndex = Math.floor(i * ratio);
      normalized[i] = buffer[sourceIndex] || 0;
    }

    return normalized;
  }

  private createWindow(type: string, size: number): Float32Array {
    const window = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      switch (type) {
        case "hann":
          window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
          break;
        case "hamming":
          window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
          break;
        case "blackman":
          window[i] =
            0.42 -
            0.5 * Math.cos((2 * Math.PI * i) / (size - 1)) +
            0.08 * Math.cos((4 * Math.PI * i) / (size - 1));
          break;
        default: // rectangular
          window[i] = 1.0;
      }
    }

    return window;
  }

  private applyWindow(buffer: Float32Array): Float32Array {
    const windowed = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      windowed[i] = buffer[i] * (this.window[i] || 1.0);
    }
    return windowed;
  }

  private computeFFT(
    buffer: Float32Array,
  ): Array<{ real: number; imag: number }> {
    // Simplified FFT implementation (in practice, would use a proper FFT library)
    const N = buffer.length;
    const spectrum: Array<{ real: number; imag: number }> = [];

    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += buffer[n] * Math.cos(angle);
        imag += buffer[n] * Math.sin(angle);
      }

      spectrum.push({ real, imag });
    }

    return spectrum;
  }

  private getFrequencyBins(): number[] {
    const bins: number[] = [];
    const nyquist = this.options.sampleRate / 2;
    const binCount = this.options.fftSize / 2;

    for (let i = 0; i < binCount; i++) {
      bins.push((i * nyquist) / binCount);
    }

    return bins;
  }

  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private calculateZCR(buffer: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i] >= 0 !== buffer[i - 1] >= 0) {
        crossings++;
      }
    }
    return crossings / (buffer.length - 1);
  }

  private calculateSpectralCentroid(
    frequencies: number[],
    magnitudes: number[],
  ): number {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frequencies.length; i++) {
      weightedSum += frequencies[i] * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(
    frequencies: number[],
    magnitudes: number[],
    threshold: number = 0.85,
  ): number {
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    const targetEnergy = totalEnergy * threshold;

    let cumulativeEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i] * magnitudes[i];
      if (cumulativeEnergy >= targetEnergy) {
        return frequencies[i];
      }
    }

    return frequencies[frequencies.length - 1];
  }

  private calculateSpectralFlux(magnitudes: number[]): number {
    if (!this.previousSpectrum) {
      this.previousSpectrum = new Float32Array(magnitudes);
      return 0;
    }

    let flux = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      const diff = magnitudes[i] - this.previousSpectrum[i];
      flux += diff > 0 ? diff : 0;
    }

    // Update previous spectrum
    for (let i = 0; i < magnitudes.length; i++) {
      this.previousSpectrum[i] = magnitudes[i];
    }

    return flux;
  }

  private calculateSpectralSpread(
    frequencies: number[],
    magnitudes: number[],
    centroid: number,
  ): number {
    let weightedVariance = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = frequencies[i] - centroid;
      weightedVariance += deviation * deviation * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }

    return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0;
  }

  private calculateSpectralSkewness(
    frequencies: number[],
    magnitudes: number[],
    centroid: number,
  ): number {
    // Simplified skewness calculation
    let weightedSkew = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = frequencies[i] - centroid;
      weightedSkew += deviation * deviation * deviation * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }

    return magnitudeSum > 0 ? weightedSkew / magnitudeSum : 0;
  }

  private calculateMFCC(magnitudes: number[]): number[] {
    // Simplified MFCC calculation (normally would use mel filter banks)
    const mfcc: number[] = [];
    const numCoeffs = 13;

    for (let i = 0; i < numCoeffs; i++) {
      let coeff = 0;
      for (let j = 0; j < magnitudes.length; j++) {
        coeff +=
          Math.log(magnitudes[j] + 1e-10) *
          Math.cos((Math.PI * i * (j + 0.5)) / magnitudes.length);
      }
      mfcc.push(coeff);
    }

    return mfcc;
  }

  private extractChroma(buffer: Float32Array): number[] {
    // Simplified chroma extraction
    const chroma = new Array(12).fill(0);
    const windowed = this.applyWindow(buffer);
    const spectrum = this.computeFFT(windowed);
    const frequencies = this.getFrequencyBins();

    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = Math.sqrt(
        spectrum[i].real * spectrum[i].real +
          spectrum[i].imag * spectrum[i].imag,
      );
      const frequency = frequencies[i];

      if (frequency > 80 && frequency < 2000) {
        // Focus on musical range
        const pitch = this.frequencyToPitch(frequency);
        const chromaIndex = pitch % 12;
        chroma[chromaIndex] += magnitude;
      }
    }

    // Normalize
    const sum = chroma.reduce((a, b) => a + b, 0);
    return sum > 0 ? chroma.map((c) => c / sum) : chroma;
  }

  private calculateTonnetz(chroma: number[]): number[] {
    // Simplified tonnetz calculation (tonal centroid features)
    const tonnetz: number[] = [];

    // Major third circle
    let majorThird = 0;
    for (let i = 0; i < 12; i++) {
      majorThird += chroma[i] * Math.cos((2 * Math.PI * i * 4) / 12);
    }
    tonnetz.push(majorThird);

    // Minor third circle
    let minorThird = 0;
    for (let i = 0; i < 12; i++) {
      minorThird += chroma[i] * Math.cos((2 * Math.PI * i * 3) / 12);
    }
    tonnetz.push(minorThird);

    // Perfect fifth circle
    let perfectFifth = 0;
    for (let i = 0; i < 12; i++) {
      perfectFifth += chroma[i] * Math.cos((2 * Math.PI * i * 7) / 12);
    }
    tonnetz.push(perfectFifth);

    return tonnetz;
  }

  private frequencyToPitch(frequency: number): number {
    // Convert frequency to MIDI pitch number
    return Math.round(12 * Math.log2(frequency / 440) + 69);
  }

  private beatsToPattern(beats: number[]): number[] {
    // Convert beat times to duration pattern
    const durations: number[] = [];

    for (let i = 1; i < beats.length; i++) {
      const duration = Math.round((beats[i] - beats[i - 1]) * 4); // Quantize to 16th notes
      durations.push(Math.max(1, duration));
    }

    return durations;
  }

  private inferGeneratorsFromPattern(
    durations: number[],
  ): [number, number] | undefined {
    // Simplified generator inference
    const patternLength = durations.length;

    // Try common generator pairs
    const commonPairs: [number, number][] = [
      [3, 2],
      [4, 3],
      [5, 3],
      [5, 4],
      [7, 4],
      [7, 5],
    ];

    for (const [a, b] of commonPairs) {
      const lcm = (a * b) / this.gcd(a, b);
      if (Math.abs(lcm - patternLength) <= 2) {
        // Allow some tolerance
        return [a, b];
      }
    }

    return undefined;
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }
  private analyzeKey(chroma: number[]): {
    key: string;
    scale: string;
    confidence: number;
    strength: number;
  } {
    // Simplified key detection using chroma profiles
    const majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // C major
    const minorProfile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]; // C minor
    const keys = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];

    let bestKey = "C";
    let bestScale = "major";
    let bestScore = -1;

    for (let i = 0; i < 12; i++) {
      // Test major
      let majorScore = 0;
      for (let j = 0; j < 12; j++) {
        majorScore += chroma[j] * majorProfile[(j - i + 12) % 12];
      }

      if (majorScore > bestScore) {
        bestScore = majorScore;
        bestKey = keys[i];
        bestScale = "major";
      }

      // Test minor
      let minorScore = 0;
      for (let j = 0; j < 12; j++) {
        minorScore += chroma[j] * minorProfile[(j - i + 12) % 12];
      }

      if (minorScore > bestScore) {
        bestScore = minorScore;
        bestKey = keys[i];
        bestScale = "minor";
      }
    }

    const confidence = Math.min(
      bestScore / (chroma.reduce((a, b) => a + b, 0) || 1),
      1.0,
    );

    return {
      key: bestKey,
      scale: bestScale,
      confidence,
      strength: bestScore,
    };
  }

  private calculateChromaticity(chroma: number[]): number {
    // Calculate how chromatic (vs diatonic) the content is
    const diatonicIndices = [0, 2, 4, 5, 7, 9, 11]; // C major scale indices

    let diatonicSum = 0;
    let chromaticSum = 0;

    for (let i = 0; i < 12; i++) {
      if (diatonicIndices.includes(i)) {
        diatonicSum += chroma[i];
      } else {
        chromaticSum += chroma[i];
      }
    }

    const total = diatonicSum + chromaticSum;
    return total > 0 ? chromaticSum / total : 0;
  }

  private calculateHarmonicComplexity(chroma: number[]): number {
    // Calculate harmonic complexity based on chroma distribution
    const entropy = chroma.reduce((sum, value) => {
      return value > 0 ? sum - value * Math.log2(value) : sum;
    }, 0);

    return entropy / Math.log2(12); // Normalize to 0-1 range
  }

  private applyRhythmicGate(
    buffer: Float32Array,
    pattern: RhythmPattern,
  ): Float32Array {
    const output = new Float32Array(buffer.length);
    const patternLength = pattern.durations.length;
    const samplesPerBeat = Math.floor(buffer.length / patternLength);

    for (let i = 0; i < buffer.length; i++) {
      const beatIndex = Math.floor(i / samplesPerBeat);
      const gateValue = pattern.durations[beatIndex % patternLength];
      output[i] = buffer[i] * (gateValue > 0 ? 1.0 : 0.1); // Gate or attenuate
    }

    return output;
  }

  private applyHarmonicFilter(
    buffer: Float32Array,
    pattern: RhythmPattern,
  ): Float32Array {
    // Simplified harmonic filtering based on pattern complexity
    const complexity = pattern.metadata?.complexity || 0.5;
    const cutoff = 1000 + complexity * 3000; // Variable cutoff based on complexity

    // Simple low-pass filter (in practice, would use proper filter design)
    const output = new Float32Array(buffer.length);
    let prev = 0;
    const alpha = Math.exp((-2 * Math.PI * cutoff) / this.options.sampleRate);

    for (let i = 0; i < buffer.length; i++) {
      output[i] = prev + alpha * (buffer[i] - prev);
      prev = output[i];
    }

    return output;
  }

  private applyDynamicModulation(
    buffer: Float32Array,
    pattern: RhythmPattern,
  ): Float32Array {
    const output = new Float32Array(buffer.length);
    const patternLength = pattern.durations.length;
    const samplesPerBeat = Math.floor(buffer.length / patternLength);

    for (let i = 0; i < buffer.length; i++) {
      const beatIndex = Math.floor(i / samplesPerBeat);
      const amplitude = pattern.durations[beatIndex % patternLength] / 3.0; // Normalize to 0-1
      output[i] = buffer[i] * amplitude;
    }

    return output;
  }
}

// Helper classes for audio analysis

class BeatTracker {
  // private previousOnsets: number[] = [];
  // No constructor needed

  trackBeats(
    buffer: Float32Array,
    onsets: number[],
    sampleRate: number,
  ): {
    tempo: number;
    beats: number[];
    confidence: number;
    strength: number;
    regularity: number;
  } {
    // Simplified beat tracking
    if (onsets.length < 2) {
      return {
        tempo: 120,
        beats: [],
        confidence: 0,
        strength: 0,
        regularity: 0,
      };
    }

    // Calculate inter-onset intervals
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }

    // Find most common interval (simplified tempo detection)
    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const tempo = 60 / (avgInterval / sampleRate);

    // Generate beat times
    const beats: number[] = [];
    let currentBeat = onsets[0];
    while (currentBeat < buffer.length / sampleRate) {
      beats.push(currentBeat);
      currentBeat += avgInterval / sampleRate;
    }

    // Calculate confidence and regularity
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0,
      ) / intervals.length;
    const regularity = Math.max(0, 1 - Math.sqrt(variance) / avgInterval);
    const confidence = Math.min(regularity * (onsets.length / 10), 1.0);

    return {
      tempo: Math.max(60, Math.min(200, tempo)),
      beats,
      confidence,
      strength: onsets.length / (buffer.length / sampleRate), // Onsets per second
      regularity,
    };
  }
}

class ChordDetector {
  constructor() {
    // No-op
  }

  detectChords(chroma: number[]): {
    chords: string[];
    confidence: number;
    strength: number;
  } {
    // Simplified chord detection using chroma templates
    const chordTemplates = {
      C: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      Dm: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      Em: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
      F: [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      G: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      Am: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    };

    let bestChord = "C";
    let bestScore = -1;

    for (const [chord, template] of Object.entries(chordTemplates)) {
      let score = 0;
      for (let i = 0; i < 12; i++) {
        score += chroma[i] * template[i];
      }

      if (score > bestScore) {
        bestScore = score;
        bestChord = chord;
      }
    }

    const totalChroma = chroma.reduce((sum, val) => sum + val, 0);
    const confidence = totalChroma > 0 ? bestScore / totalChroma : 0;

    return {
      chords: confidence > 0.3 ? [bestChord] : [],
      confidence,
      strength: bestScore,
    };
  }
}

class OnsetDetector {
  private sampleRate: number;
  private previousEnergy: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  detectOnsets(buffer: Float32Array): number[] {
    const onsets: number[] = [];
    const hopSize = 512;
    const threshold = 0.1;

    for (let i = 0; i < buffer.length - hopSize; i += hopSize) {
      const frame = buffer.slice(i, i + hopSize);
      const energy =
        frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;

      // Simple onset detection based on energy increase
      if (energy > this.previousEnergy * (1 + threshold)) {
        onsets.push(i / this.sampleRate);
      }

      this.previousEnergy = energy;
    }

    return onsets;
  }
}
