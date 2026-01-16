/**
 * Real-time audio analysis with Schillinger pattern integration
 */

import { AudioProcessor, AudioFeatures } from "./processor";
import { RhythmPattern, ChordProgression } from "@schillinger-sdk/shared";

export interface AudioAnalysisResult {
  tempo?: number;
  key?: string;
  scale?: string;
  chords?: string[];
  rhythm?: RhythmPattern;
  harmony?: ChordProgression;
  generators?: [number, number];
  features?: AudioFeatures;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface StreamAnalysisOptions {
  analysisInterval?: number; // ms
  bufferSize?: number;
  sampleRate?: number;
  enableRhythmAnalysis?: boolean;
  enableHarmonyAnalysis?: boolean;
  enableFeatureExtraction?: boolean;
}

export interface FileAnalysisOptions {
  segmentDuration?: number; // seconds
  overlapRatio?: number;
  enableSchillingerInference?: boolean;
  outputFormat?: "summary" | "detailed" | "segments";
}

export interface AnalysisSegment {
  startTime: number;
  endTime: number;
  analysis: AudioAnalysisResult;
}

/**
 * Advanced real-time audio analyzer with Schillinger pattern detection
 */
export class AudioAnalyzer {
  private processor: AudioProcessor;
  private analysisHistory: AudioAnalysisResult[] = [];
  private isAnalyzing: boolean = false;
  private analysisCallbacks: Array<(result: AudioAnalysisResult) => void> = [];

  constructor(options: StreamAnalysisOptions = {}) {
    this.processor = new AudioProcessor({
      sampleRate: options.sampleRate || 44100,
      bufferSize: options.bufferSize || 1024,
    });
  }

  /**
   * Analyze audio stream in real-time with comprehensive pattern detection
   */
  async analyzeStream(
    stream: MediaStream,
    options: StreamAnalysisOptions = {},
  ): Promise<void> {
    const {
      analysisInterval = 100,
      enableRhythmAnalysis = true,
      enableHarmonyAnalysis = true,
      enableFeatureExtraction = true,
    } = options;

    if (this.isAnalyzing) {
      throw new Error("Analysis already in progress");
    }

    this.isAnalyzing = true;

    try {
      // Set up Web Audio API
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);

      analyser.fftSize = 2048;
      source.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      let lastAnalysisTime = 0;

      scriptProcessor.onaudioprocess = () => {
        const now = Date.now();

        if (now - lastAnalysisTime >= analysisInterval) {
          analyser.getFloatFrequencyData(dataArray);

          // Process audio buffer
          const processingResult = this.processor.processBuffer(dataArray, now);

          // Create analysis result
          const analysisResult: AudioAnalysisResult = {
            timestamp: now,
            confidence: 0,
          };

          // Add rhythm analysis
          if (enableRhythmAnalysis && processingResult.rhythm) {
            analysisResult.tempo = processingResult.rhythm.tempo;
            analysisResult.rhythm = processingResult.rhythm.rhythmPattern;
            analysisResult.generators = processingResult.rhythm.generators;
            analysisResult.confidence = Math.max(
              analysisResult.confidence,
              processingResult.rhythm.confidence,
            );
          }

          // Add harmony analysis
          if (enableHarmonyAnalysis && processingResult.harmony) {
            analysisResult.key = processingResult.harmony.key;
            analysisResult.scale = processingResult.harmony.scale;
            analysisResult.chords = processingResult.harmony.chords;
            analysisResult.harmony = processingResult.harmony.progression;
            analysisResult.confidence = Math.max(
              analysisResult.confidence,
              processingResult.harmony.confidence,
            );
          }

          // Add features
          if (enableFeatureExtraction && processingResult.features) {
            analysisResult.features = processingResult.features;
          }

          // Add metadata
          analysisResult.metadata = {
            spectral: processingResult.spectral,
            bufferSize: dataArray.length,
            sampleRate: audioContext.sampleRate,
          };

          // Store in history
          this.analysisHistory.push(analysisResult);
          if (this.analysisHistory.length > 100) {
            this.analysisHistory.shift(); // Keep only recent results
          }

          // Notify callbacks
          this.analysisCallbacks.forEach((callback) =>
            callback(analysisResult),
          );

          lastAnalysisTime = now;
        }
      };
    } catch (error) {
      this.isAnalyzing = false;
      throw new Error(`Stream analysis failed: ${error}`);
    }
  }

  /**
   * Stop real-time analysis
   */
  stopAnalysis(): void {
    this.isAnalyzing = false;
  }

  /**
   * Add callback for real-time analysis results
   */
  onAnalysis(callback: (result: AudioAnalysisResult) => void): void {
    this.analysisCallbacks.push(callback);
  }

  /**
   * Remove analysis callback
   */
  removeAnalysisCallback(
    callback: (result: AudioAnalysisResult) => void,
  ): void {
    const index = this.analysisCallbacks.indexOf(callback);
    if (index > -1) {
      this.analysisCallbacks.splice(index, 1);
    }
  }

  /**
   * Analyze audio file with comprehensive Schillinger pattern detection
   */
  async analyzeFile(
    file: File,
    options: FileAnalysisOptions = {},
  ): Promise<AudioAnalysisResult | AnalysisSegment[]> {
    const {
      segmentDuration = 10,
      overlapRatio = 0.5,
      enableSchillingerInference = true,
      outputFormat = "summary",
    } = options;

    try {
      // Decode audio file
      const audioBuffer = await this.decodeAudioFile(file);
      // const sampleRate = audioBuffer.sampleRate;
      // const duration = audioBuffer.duration;

      if (outputFormat === "segments") {
        return this.analyzeFileInSegments(audioBuffer, {
          segmentDuration,
          overlapRatio,
          enableSchillingerInference,
        });
      } else {
        return this.analyzeFullFile(audioBuffer, {
          enableSchillingerInference,
          detailed: outputFormat === "detailed",
        });
      }
    } catch (error) {
      throw new Error(`File analysis failed: ${error}`);
    }
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(maxResults: number = 50): AudioAnalysisResult[] {
    return this.analysisHistory.slice(-maxResults);
  }

  /**
   * Get current analysis statistics
   */
  getAnalysisStats(): {
    totalAnalyses: number;
    averageConfidence: number;
    mostCommonKey?: string;
    averageTempo?: number;
    mostCommonGenerators?: [number, number];
  } {
    if (this.analysisHistory.length === 0) {
      return { totalAnalyses: 0, averageConfidence: 0 };
    }

    const totalConfidence = this.analysisHistory.reduce(
      (sum, result) => sum + result.confidence,
      0,
    );
    const averageConfidence = totalConfidence / this.analysisHistory.length;

    // Find most common key
    const keyCount: Record<string, number> = {};
    const tempos: number[] = [];
    const generatorCount: Record<string, number> = {};

    for (const result of this.analysisHistory) {
      if (result.key) {
        keyCount[result.key] = (keyCount[result.key] || 0) + 1;
      }
      if (result.tempo) {
        tempos.push(result.tempo);
      }
      if (result.generators) {
        const key = `${result.generators[0]},${result.generators[1]}`;
        generatorCount[key] = (generatorCount[key] || 0) + 1;
      }
    }

    const mostCommonKey = Object.keys(keyCount).reduce(
      (a, b) => (keyCount[a] > keyCount[b] ? a : b),
      keyCount.length ? Object.keys(keyCount)[0] : "",
    );

    const averageTempo =
      tempos.length > 0
        ? tempos.reduce((sum, tempo) => sum + tempo, 0) / tempos.length
        : undefined;

    const mostCommonGeneratorKey = Object.keys(generatorCount).reduce(
      (a, b) => (generatorCount[a] > generatorCount[b] ? a : b),
      generatorCount.length ? Object.keys(generatorCount)[0] : "",
    );

    const mostCommonGenerators = mostCommonGeneratorKey
      ? (mostCommonGeneratorKey.split(",").map(Number) as [number, number])
      : undefined;

    return {
      totalAnalyses: this.analysisHistory.length,
      averageConfidence,
      mostCommonKey,
      averageTempo,
      mostCommonGenerators,
    };
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.analysisHistory = [];
  }

  // Private helper methods

  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    return audioContext.decodeAudioData(arrayBuffer);
  }

  private async analyzeFileInSegments(
    audioBuffer: AudioBuffer,
    options: {
      segmentDuration: number;
      overlapRatio: number;
      enableSchillingerInference: boolean;
    },
  ): Promise<AnalysisSegment[]> {
    const { segmentDuration, overlapRatio } = options;
    const sampleRate = audioBuffer.sampleRate;
    const segmentSamples = segmentDuration * sampleRate;
    const hopSamples = segmentSamples * (1 - overlapRatio);
    const segments: AnalysisSegment[] = [];

    const channelData = audioBuffer.getChannelData(0); // Use first channel

    for (
      let start = 0;
      start < channelData.length - segmentSamples;
      start += hopSamples
    ) {
      const end = Math.min(start + segmentSamples, channelData.length);
      const segmentData = channelData.slice(start, end);

      // Convert to Float32Array for processing
      const buffer = new Float32Array(segmentData);
      const timestamp = start / sampleRate;

      // Process segment
      const processingResult = this.processor.processBuffer(
        buffer,
        timestamp * 1000,
      );

      // Create analysis result
      const analysisResult: AudioAnalysisResult = {
        timestamp: timestamp * 1000,
        confidence: 0,
      };

      // Add rhythm analysis
      if (processingResult.rhythm) {
        analysisResult.tempo = processingResult.rhythm.tempo;
        analysisResult.rhythm = processingResult.rhythm.rhythmPattern;
        analysisResult.generators = processingResult.rhythm.generators;
        analysisResult.confidence = Math.max(
          analysisResult.confidence,
          processingResult.rhythm.confidence,
        );
      }

      // Add harmony analysis
      if (processingResult.harmony) {
        analysisResult.key = processingResult.harmony.key;
        analysisResult.scale = processingResult.harmony.scale;
        analysisResult.chords = processingResult.harmony.chords;
        analysisResult.harmony = processingResult.harmony.progression;
        analysisResult.confidence = Math.max(
          analysisResult.confidence,
          processingResult.harmony.confidence,
        );
      }

      // Add features
      if (processingResult.features) {
        analysisResult.features = processingResult.features;
      }

      segments.push({
        startTime: start / sampleRate,
        endTime: end / sampleRate,
        analysis: analysisResult,
      });
    }

    return segments;
  }

  private async analyzeFullFile(
    audioBuffer: AudioBuffer,
    options: {
      enableSchillingerInference: boolean;
      detailed: boolean;
    },
  ): Promise<AudioAnalysisResult> {
    const { enableSchillingerInference, detailed } = options;
    const channelData = audioBuffer.getChannelData(0);
    const buffer = new Float32Array(channelData);

    // Process entire file
    const processingResult = this.processor.processBuffer(buffer, 0);

    // Create comprehensive analysis result
    const analysisResult: AudioAnalysisResult = {
      timestamp: 0,
      confidence: 0,
    };

    // Add rhythm analysis
    if (processingResult.rhythm) {
      analysisResult.tempo = processingResult.rhythm.tempo;
      analysisResult.rhythm = processingResult.rhythm.rhythmPattern;
      analysisResult.generators = processingResult.rhythm.generators;
      analysisResult.confidence = Math.max(
        analysisResult.confidence,
        processingResult.rhythm.confidence,
      );
    }

    // Add harmony analysis
    if (processingResult.harmony) {
      analysisResult.key = processingResult.harmony.key;
      analysisResult.scale = processingResult.harmony.scale;
      analysisResult.chords = processingResult.harmony.chords;
      analysisResult.harmony = processingResult.harmony.progression;
      analysisResult.confidence = Math.max(
        analysisResult.confidence,
        processingResult.harmony.confidence,
      );
    }

    // Add features if detailed analysis requested
    if (detailed && processingResult.features) {
      analysisResult.features = processingResult.features;
    }

    // Add comprehensive metadata
    analysisResult.metadata = {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      spectral: processingResult.spectral,
      schillingerInference: enableSchillingerInference,
    };

    return analysisResult;
  }
}
