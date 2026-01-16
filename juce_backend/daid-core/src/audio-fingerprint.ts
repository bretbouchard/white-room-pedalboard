/**
 * AudioFingerprint class for DAID v2 integration with perceptual hashing
 * Provides robust audio content identification and fingerprinting capabilities
 */

export interface AudioFingerprintConfig {
  sampleRate: number;
  windowSize: number;
  hopSize: number;
  numBands: number;
  fingerprintSize: number;
  enableRobustHashing: boolean;
}

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate?: number;
  format: string;
}

export interface FingerprintResult {
  fingerprint: string;
  confidence: number;
  metadata: AudioMetadata;
  extractionTime: number;
  algorithm: string;
}

export interface FingerprintComparison {
  similarity: number;
  confidence: number;
  matches: number;
  totalComparisons: number;
  algorithm: string;
}

export class AudioFingerprint {
  private config: AudioFingerprintConfig;
  private static readonly DEFAULT_CONFIG: AudioFingerprintConfig = {
    sampleRate: 44100,
    windowSize: 2048,
    hopSize: 512,
    numBands: 32,
    fingerprintSize: 256,
    enableRobustHashing: true,
  };

  private static readonly SPECTRAL_BANDS = [
    { low: 0, high: 250 },      // Sub-bass
    { low: 250, high: 500 },    // Bass
    { low: 500, high: 2000 },   // Low-mids
    { low: 2000, high: 4000 },  // High-mids
    { low: 4000, high: 8000 },  // Presence
    { low: 8000, high: 20000 }, // Brilliance
  ];

  constructor(config?: Partial<AudioFingerprintConfig>) {
    this.config = { ...AudioFingerprint.DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate perceptual fingerprint from audio buffer data
   */
  async generateFingerprint(
    audioBuffer: Float32Array | Float32Array[],
    metadata?: Partial<AudioMetadata>
  ): Promise<FingerprintResult> {
    const startTime = performance.now();

    // Normalize audio input
    const normalizedData = this.normalizeAudioData(audioBuffer);

    // Extract spectral features
    const spectralFeatures = this.extractSpectralFeatures(normalizedData);

    // Generate perceptual hash
    const fingerprint = this.generatePerceptualHash(spectralFeatures);

    // Calculate confidence score
    const confidence = this.calculateConfidence(spectralFeatures, fingerprint);

    // Compile complete metadata
    const completeMetadata: AudioMetadata = {
      duration: metadata?.duration || this.estimateDuration(audioBuffer),
      sampleRate: metadata?.sampleRate || this.config.sampleRate,
      channels: Array.isArray(audioBuffer) ? audioBuffer.length : 1,
      bitrate: metadata?.bitrate,
      format: metadata?.format || 'raw',
    };

    const extractionTime = performance.now() - startTime;

    return {
      fingerprint,
      confidence,
      metadata: completeMetadata,
      extractionTime,
      algorithm: this.config.enableRobustHashing ? 'robust-perceptual-v2' : 'standard-perceptual-v2',
    };
  }

  /**
   * Compare two fingerprints and return similarity metrics
   */
  compareFingerprints(
    fingerprint1: string,
    fingerprint2: string
  ): FingerprintComparison {
    if (fingerprint1.length !== fingerprint2.length) {
      throw new Error('Fingerprints must have the same length for comparison');
    }

    let matches = 0;
    let totalComparisons = fingerprint1.length;

    for (let i = 0; i < fingerprint1.length; i++) {
      if (fingerprint1[i] === fingerprint2[i]) {
        matches++;
      }
    }

    const similarity = matches / totalComparisons;
    const confidence = this.calculateComparisonConfidence(similarity, totalComparisons);

    return {
      similarity,
      confidence,
      matches,
      totalComparisons,
      algorithm: this.config.enableRobustHashing ? 'hamming-distance-v2' : 'simple-comparison-v2',
    };
  }

  /**
   * Generate DAID-compatible hash from audio fingerprint
   */
  async generateDAIDHash(
    fingerprint: string,
    agentId: string,
    entityType: string,
    entityId: string,
    operation: string = 'create'
  ): Promise<string> {
    // Create provenance data for DAID hashing
    const provenanceData = {
      fingerprint,
      agentId,
      entityType,
      entityId,
      operation,
      timestamp: new Date().toISOString(),
      config: this.config,
    };

    // Generate SHA-256 hash and truncate for DAID compatibility
    const hashBuffer = new TextEncoder().encode(JSON.stringify(provenanceData));
    const buffer = await crypto.subtle.digest('SHA-256', hashBuffer);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Extract robust spectral features from audio data
   */
  private extractSpectralFeatures(audioData: Float32Array): number[] {
    const features: number[] = [];
    const numWindows = Math.floor(audioData.length / this.config.hopSize);

    for (let window = 0; window < numWindows; window++) {
      const start = window * this.config.hopSize;
      const end = Math.min(start + this.config.windowSize, audioData.length);
      const windowData = audioData.slice(start, end);

      // Apply window function (Hann window)
      const windowedData = this.applyWindowFunction(windowData);

      // Compute FFT (simplified for this implementation)
      const spectrum = this.computeFFT(windowedData);

      // Extract spectral features
      const spectralFeatures = this.extractWindowFeatures(spectrum);
      features.push(...spectralFeatures);
    }

    return features;
  }

  /**
   * Generate perceptual hash from spectral features
   */
  private generatePerceptualHash(features: number[]): string {
    if (features.length === 0) {
      throw new Error('No features available for fingerprint generation');
    }

    // Quantize features to create robust hash
    const quantizedFeatures = this.quantizeFeatures(features);

    // Generate binary fingerprint using median thresholding
    const median = this.calculateMedian(quantizedFeatures);
    const binaryFingerprint = quantizedFeatures.map(value =>
      value > median ? '1' : '0'
    );

    // Convert to hexadecimal for compact storage
    return this.binaryToHex(binaryFingerprint.join(''));
  }

  /**
   * Normalize audio data to consistent format
   */
  private normalizeAudioData(audioBuffer: Float32Array | Float32Array[]): Float32Array {
    // Convert multi-channel to mono by averaging channels
    if (Array.isArray(audioBuffer)) {
      const minLength = Math.min(...audioBuffer.map(channel => channel.length));
      const monoData = new Float32Array(minLength);

      for (let i = 0; i < minLength; i++) {
        let sum = 0;
        for (const channel of audioBuffer) {
          sum += channel[i];
        }
        monoData[i] = sum / audioBuffer.length;
      }

      return monoData;
    }

    return audioBuffer;
  }

  /**
   * Apply Hann window function to reduce spectral leakage
   */
  private applyWindowFunction(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);
    const windowSize = data.length;

    for (let i = 0; i < windowSize; i++) {
      const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
      windowed[i] = data[i] * hann;
    }

    return windowed;
  }

  /**
   * Simplified FFT computation (in production, use optimized FFT library)
   */
  private computeFFT(data: Float32Array): Float32Array {
    // This is a simplified DFT implementation
    // In production, replace with optimized FFT (e.g., FFTW, KissFFT)
    const N = data.length;
    const spectrum = new Float32Array(N / 2);

    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }

      // Magnitude spectrum
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  /**
   * Extract features from spectral window
   */
  private extractWindowFeatures(spectrum: Float32Array): number[] {
    const features: number[] = [];

    // Spectral band energy
    for (const band of AudioFingerprint.SPECTRAL_BANDS) {
      const bandEnergy = this.calculateBandEnergy(spectrum, band.low, band.high);
      features.push(bandEnergy);
    }

    // Spectral centroid
    const centroid = this.calculateSpectralCentroid(spectrum);
    features.push(centroid);

    // Spectral rolloff
    const rolloff = this.calculateSpectralRolloff(spectrum);
    features.push(rolloff);

    // Zero crossing rate
    const zcr = this.calculateZeroCrossingRate(spectrum);
    features.push(zcr);

    return features;
  }

  /**
   * Quantize features to discrete levels for robustness
   */
  private quantizeFeatures(features: number[]): number[] {
    const numLevels = 16; // 4-bit quantization
    const min = Math.min(...features);
    const max = Math.max(...features);
    const range = max - min || 1;

    return features.map(value =>
      Math.floor(((value - min) / range) * (numLevels - 1))
    );
  }

  /**
   * Calculate median value for thresholding
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Convert binary string to hexadecimal
   */
  private binaryToHex(binary: string): string {
    // Pad to multiple of 4
    const padded = binary.padEnd(Math.ceil(binary.length / 4) * 4, '0');
    let hex = '';

    for (let i = 0; i < padded.length; i += 4) {
      const nibble = padded.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }

    return hex;
  }

  /**
   * Calculate confidence score for fingerprint
   */
  private calculateConfidence(features: number[], fingerprint: string): number {
    // Confidence based on feature variance and fingerprint entropy
    const featureVariance = this.calculateVariance(features);
    const fingerprintEntropy = this.calculateEntropy(fingerprint);

    // Normalize to 0-1 range
    return Math.min(1, (featureVariance / 100 + fingerprintEntropy / 4) / 2);
  }

  /**
   * Calculate confidence for fingerprint comparison
   */
  private calculateComparisonConfidence(similarity: number, totalComparisons: number): number {
    // Higher confidence for more comparisons and higher similarity
    const lengthFactor = Math.min(1, totalComparisons / 64); // Normalize to minimum 64 bits
    return similarity * lengthFactor;
  }

  /**
   * Helper methods for feature extraction
   */
  private calculateBandEnergy(spectrum: Float32Array, lowFreq: number, highFreq: number): number {
    const nyquist = this.config.sampleRate / 2;
    const lowBin = Math.floor((lowFreq / nyquist) * spectrum.length);
    const highBin = Math.ceil((highFreq / nyquist) * spectrum.length);

    let energy = 0;
    for (let i = lowBin; i < highBin && i < spectrum.length; i++) {
      energy += spectrum[i] * spectrum[i];
    }

    return Math.sqrt(energy / (highBin - lowBin));
  }

  private calculateSpectralCentroid(spectrum: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < spectrum.length; i++) {
      weightedSum += i * spectrum[i];
      magnitudeSum += spectrum[i];
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(spectrum: Float32Array, threshold: number = 0.85): number {
    const totalEnergy = spectrum.reduce((sum, value) => sum + value * value, 0);
    const thresholdEnergy = totalEnergy * threshold;

    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i] * spectrum[i];
      if (cumulativeEnergy >= thresholdEnergy) {
        return i / spectrum.length;
      }
    }

    return 1.0;
  }

  private calculateZeroCrossingRate(spectrum: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < spectrum.length; i++) {
      if ((spectrum[i] >= 0) !== (spectrum[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / spectrum.length;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateEntropy(str: string): number {
    const charCounts = new Map<string, number>();
    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    const length = str.length;
    for (const count of charCounts.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private estimateDuration(audioBuffer: Float32Array | Float32Array[]): number {
    const samples = Array.isArray(audioBuffer)
      ? Math.max(...audioBuffer.map(channel => channel.length))
      : audioBuffer.length;
    return samples / this.config.sampleRate;
  }

  /**
   * Static utility methods for common operations
   */
  static async createFingerprint(
    audioData: Float32Array | Float32Array[],
    config?: Partial<AudioFingerprintConfig>
  ): Promise<FingerprintResult> {
    const fingerprinter = new AudioFingerprint(config);
    return fingerprinter.generateFingerprint(audioData);
  }

  static compareFingerprints(
    fp1: FingerprintResult,
    fp2: FingerprintResult
  ): FingerprintComparison {
    const fingerprinter = new AudioFingerprint();
    return fingerprinter.compareFingerprints(fp1.fingerprint, fp2.fingerprint);
  }

  static validateFingerprintFormat(fingerprint: string): boolean {
    // Check if fingerprint is valid hexadecimal string
    return /^[a-f0-9]+$/i.test(fingerprint) && fingerprint.length > 0;
  }
}