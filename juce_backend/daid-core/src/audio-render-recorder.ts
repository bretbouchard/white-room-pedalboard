/**
 * Audio Render Recording Infrastructure for DAID v2
 * Captures and records audio data for fingerprinting and analysis
 */

export interface AudioRenderConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  format: 'float32' | 'int16' | 'int24';
  enableRealTimeProcessing: boolean;
  maxRecordingTime: number; // in seconds
  autoGenerateFingerprints: boolean;
}

export interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
  size: number; // bytes
  metadata: RecordingMetadata;
  fingerprints?: string[];
}

export interface RecordingMetadata {
  sessionId: string;
  agentId: string;
  entityType: string;
  entityId: string;
  operation: string;
  pluginChain?: string[];
  parameters?: Record<string, any>;
  notes?: string;
}

export interface AudioChunk {
  data: Float32Array[];
  timestamp: number;
  channelCount: number;
  sampleRate: number;
}

export interface RecordingStats {
  totalSessions: number;
  totalDuration: number;
  totalSize: number;
  averageFingerprintTime: number;
  successRate: number;
  errorCount: number;
}

export class AudioRenderRecorder {
  private config: AudioRenderConfig;
  private activeSessions: Map<string, RecordingSession> = new Map();
  private recordingBuffers: Map<string, Float32Array[][]> = new Map();
  private isRecording = false;
  private recordingStats: RecordingStats = {
    totalSessions: 0,
    totalDuration: 0,
    totalSize: 0,
    averageFingerprintTime: 0,
    successRate: 0,
    errorCount: 0,
  };

  private static readonly DEFAULT_CONFIG: AudioRenderConfig = {
    sampleRate: 44100,
    bufferSize: 512,
    channels: 2,
    format: 'float32',
    enableRealTimeProcessing: true,
    maxRecordingTime: 300, // 5 minutes
    autoGenerateFingerprints: true,
  };

  constructor(config?: Partial<AudioRenderConfig>) {
    this.config = { ...AudioRenderRecorder.DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a new recording session
   */
  startRecording(metadata: RecordingMetadata): string {
    const sessionId = this.generateSessionId();

    const session: RecordingSession = {
      id: sessionId,
      startTime: new Date(),
      duration: 0,
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      format: this.config.format,
      size: 0,
      metadata,
    };

    this.activeSessions.set(sessionId, session);
    this.recordingBuffers.set(sessionId, []);

    this.recordingStats.totalSessions++;
    this.isRecording = true;

    return sessionId;
  }

  /**
   * Stop recording session and generate fingerprint
   */
  async stopRecording(sessionId: string): Promise<RecordingSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    session.endTime = new Date();
    session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;

    // Get recorded audio data
    const audioChunks = this.recordingBuffers.get(sessionId) || [];
    const combinedAudio = this.combineAudioChunks(audioChunks);

    // Update session size
    session.size = combinedAudio.reduce((total, channel) => total + channel.length * 4, 0); // 4 bytes per float32

    // Generate fingerprint if enabled
    if (this.config.autoGenerateFingerprints && combinedAudio.length > 0) {
      try {
        const { AudioFingerprint } = await import('./audio-fingerprint');
        const fingerprinter = new AudioFingerprint({
          sampleRate: this.config.sampleRate,
        });

        const fingerprintResult = await fingerprinter.generateFingerprint(combinedAudio, {
          duration: session.duration,
          sampleRate: this.config.sampleRate,
          channels: this.config.channels,
          format: this.config.format,
        });

        session.fingerprints = [fingerprintResult.fingerprint];

        // Update fingerprint timing stats
        const fingerprintTime = fingerprintResult.extractionTime;
        this.updateFingerprintStats(fingerprintTime);

      } catch (error) {
        console.error('Failed to generate fingerprint:', error);
        this.recordingStats.errorCount++;
      }
    }

    // Update stats
    this.recordingStats.totalDuration += session.duration;
    this.recordingStats.totalSize += session.size;
    this.updateSuccessRate();

    // Clean up
    this.activeSessions.delete(sessionId);
    this.recordingBuffers.delete(sessionId);

    if (this.activeSessions.size === 0) {
      this.isRecording = false;
    }

    return session;
  }

  /**
   * Process audio chunk during recording
   */
  processAudioChunk(sessionId: string, chunk: AudioChunk): void {
    if (!this.activeSessions.has(sessionId)) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    const session = this.activeSessions.get(sessionId)!;
    const currentTime = Date.now();

    // Check max recording time
    const currentDuration = (currentTime - session.startTime.getTime()) / 1000;
    if (currentDuration > this.config.maxRecordingTime) {
      this.stopRecording(sessionId);
      return;
    }

    // Add chunk to recording buffer
    const buffers = this.recordingBuffers.get(sessionId)!;
    buffers.push(chunk.data);

    // Real-time processing if enabled
    if (this.config.enableRealTimeProcessing) {
      this.processRealTimeAudio(sessionId, chunk);
    }
  }

  /**
   * Get all active recording sessions
   */
  getActiveSessions(): RecordingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get recording statistics
   */
  getRecordingStats(): RecordingStats {
    return { ...this.recordingStats };
  }

  /**
   * Export recording session data
   */
  async exportSession(sessionId: string, format: 'wav' | 'raw' | 'json' = 'wav'): Promise<Blob> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    const audioChunks = this.recordingBuffers.get(sessionId) || [];
    const combinedAudio = this.combineAudioChunks(audioChunks);

    switch (format) {
      case 'wav':
        return this.exportAsWAV(combinedAudio, session);
      case 'raw':
        return this.exportAsRaw(combinedAudio);
      case 'json':
        return this.exportAsJSON(combinedAudio, session);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Find recordings by metadata
   */
  findRecordings(filter: Partial<RecordingMetadata>): RecordingSession[] {
    const allSessions = Array.from(this.activeSessions.values());

    return allSessions.filter(session => {
      const metadata = session.metadata;
      return Object.keys(filter).every(key => {
        const filterValue = filter[key as keyof RecordingMetadata];
        const sessionValue = metadata[key as keyof RecordingMetadata];

        if (Array.isArray(filterValue) && Array.isArray(sessionValue)) {
          return filterValue.every(item => sessionValue.includes(item));
        }

        return sessionValue === filterValue;
      });
    });
  }

  /**
   * Generate DAID for recording session
   */
  async generateDAIDForSession(sessionId: string): Promise<string | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.fingerprints || session.fingerprints.length === 0) {
      return null;
    }

    try {
      const { AudioFingerprint } = await import('./audio-fingerprint');
      const fingerprinter = new AudioFingerprint({
        sampleRate: this.config.sampleRate,
      });

      const daidHash = await fingerprinter.generateDAIDHash(
        session.fingerprints[0],
        session.metadata.agentId,
        session.metadata.entityType,
        session.metadata.entityId,
        session.metadata.operation
      );

      // Create DAID string using existing generator
      const { DAIDGenerator } = await import('./generator');
      const timestamp = session.startTime.toISOString().replace(/:/g, '-');

      return DAIDGenerator.generateV2({
        agentId: session.metadata.agentId,
        entityType: session.metadata.entityType,
        entityId: session.metadata.entityId,
        operation: session.metadata.operation,
        fingerprint: session.fingerprints[0],
        audioMetadata: {
          duration: session.duration,
          sampleRate: session.sampleRate,
          channels: session.channels,
          format: session.format,
        },
      });

    } catch (error) {
      console.error('Failed to generate DAID for session:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private generateSessionId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private combineAudioChunks(chunks: Float32Array[][]): Float32Array[] {
    if (chunks.length === 0) {
      return [];
    }

    const channelCount = chunks[0].length;
    const combinedData: Float32Array[] = [];

    for (let channel = 0; channel < channelCount; channel++) {
      let totalLength = 0;
      for (const chunk of chunks) {
        totalLength += chunk[channel].length;
      }

      const combinedChannel = new Float32Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        combinedChannel.set(chunk[channel], offset);
        offset += chunk[channel].length;
      }

      combinedData.push(combinedChannel);
    }

    return combinedData;
  }

  private processRealTimeAudio(sessionId: string, chunk: AudioChunk): void {
    // Real-time audio analysis and monitoring
    // This could include level monitoring, clip detection, etc.

    const levels = this.calculateAudioLevels(chunk.data);
    if (levels.some(level => level > 0.95)) {
      console.warn(`Clipping detected in session ${sessionId}`);
    }
  }

  private calculateAudioLevels(audioData: Float32Array[]): number[] {
    return audioData.map(channel => {
      let sum = 0;
      for (let i = 0; i < channel.length; i++) {
        sum += Math.abs(channel[i]);
      }
      return sum / channel.length;
    });
  }

  private updateFingerprintStats(extractionTime: number): void {
    const currentAvg = this.recordingStats.averageFingerprintTime;
    const totalSessions = this.recordingStats.totalSessions;

    this.recordingStats.averageFingerprintTime =
      (currentAvg * (totalSessions - 1) + extractionTime) / totalSessions;
  }

  private updateSuccessRate(): void {
    const totalOperations = this.recordingStats.totalSessions;
    const successfulOperations = totalOperations - this.recordingStats.errorCount;

    this.recordingStats.successRate = totalOperations > 0
      ? successfulOperations / totalOperations
      : 0;
  }

  private async exportAsWAV(audioData: Float32Array[], session: RecordingSession): Promise<Blob> {
    // WAV file header (44 bytes)
    const sampleRate = session.sampleRate;
    const channels = session.channels;
    const bitsPerSample = 32;
    const bytesPerSample = bitsPerSample / 8;

    const totalSamples = audioData.reduce((total, channel) => total + channel.length, 0);
    const dataSize = totalSamples * bytesPerSample;
    const fileSize = 36 + dataSize;

    const header = new ArrayBuffer(44);
    let headerView = new DataView(header);

    // RIFF header
    headerView.setUint32(0, 0x46464952, false); // "RIFF"
    headerView.setUint32(4, fileSize, true); // File size
    headerView.setUint32(8, 0x45564157, false); // "WAVE"

    // Format chunk
    headerView.setUint32(12, 0x20746d66, false); // "fmt "
    headerView.setUint32(16, 16, true); // Chunk size
    headerView.setUint16(20, 3, true); // Audio format (3 = IEEE float)
    headerView.setUint16(22, channels, true); // Number of channels
    headerView.setUint32(24, sampleRate, true); // Sample rate
    headerView.setUint32(28, sampleRate * channels * bytesPerSample, true); // Byte rate
    headerView.setUint16(32, channels * bytesPerSample, true); // Block align
    headerView.setUint16(34, bitsPerSample, true); // Bits per sample

    // Data chunk
    headerView.setUint32(36, 0x61746164, false); // "data"
    headerView.setUint32(40, dataSize, true); // Data size

    // Convert audio data to bytes
    const audioBytes = new Uint8Array(dataSize);
    let offset = 0;

    for (let sample = 0; sample < totalSamples; sample++) {
      for (let channel = 0; channel < channels; channel++) {
        if (channel < audioData.length && sample < audioData[channel].length) {
          const value = audioData[channel][sample];
          const sampleView = new DataView(audioBytes.buffer, offset, 4);
          sampleView.setFloat32(0, value, true);
          offset += 4;
        }
      }
    }

    const fullFile = new Uint8Array(44 + dataSize);
    fullFile.set(new Uint8Array(header), 0);
    fullFile.set(audioBytes, 44);

    return new Blob([fullFile], { type: 'audio/wav' });
  }

  private async exportAsRaw(audioData: Float32Array[]): Promise<Blob> {
    const totalSamples = audioData.reduce((total, channel) => total + channel.length, 0);
    const rawBytes = new Uint8Array(totalSamples * 4);

    let offset = 0;
    for (let sample = 0; sample < totalSamples; sample++) {
      for (let channel = 0; channel < audioData.length; channel++) {
        if (sample < audioData[channel].length) {
          const sampleView = new DataView(rawBytes.buffer, offset, 4);
          sampleView.setFloat32(0, audioData[channel][sample], true);
          offset += 4;
        }
      }
    }

    return new Blob([rawBytes], { type: 'application/octet-stream' });
  }

  private async exportAsJSON(audioData: Float32Array[], session: RecordingSession): Promise<Blob> {
    const exportData = {
      session,
      audioData: audioData.map(channel => Array.from(channel)),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Static factory methods
   */
  static createDefaultRecorder(): AudioRenderRecorder {
    return new AudioRenderRecorder();
  }

  static createHighQualityRecorder(): AudioRenderRecorder {
    return new AudioRenderRecorder({
      sampleRate: 96000,
      bufferSize: 256,
      channels: 2,
      format: 'float32',
      enableRealTimeProcessing: true,
      maxRecordingTime: 600, // 10 minutes
      autoGenerateFingerprints: true,
    });
  }

  static createLowLatencyRecorder(): AudioRenderRecorder {
    return new AudioRenderRecorder({
      sampleRate: 44100,
      bufferSize: 64,
      channels: 2,
      format: 'float32',
      enableRealTimeProcessing: true,
      maxRecordingTime: 120, // 2 minutes
      autoGenerateFingerprints: false, // Disable for low latency
    });
  }
}