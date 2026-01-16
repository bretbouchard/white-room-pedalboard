/**
 * JUCEHeadlessHarness
 *
 * Headless JUCE test harness for integration testing without requiring
 * actual JUCE installation. Enables offline rendering and event stream
 * verification for SongModel_v1 instances.
 *
 * TDD Phase: GREEN - Implementation skeleton, tests will drive completion
 *
 * This component provides:
 * - Model loading and validation
 * - Offline audio rendering (mocked for testing)
 * - Event stream verification
 * - Audio export (mocked for testing)
 *
 * Created by Agent 4 after Agents 1-3 create core types.
 */

// Types from Agent 1
interface SongModel_v1 {
  version: "1.0";
  id: string;
  createdAt: number;
  metadata: any;
  transport: any;
  sections: any[];
  roles: any[];
  projections: any[];
  mixGraph: any;
  realizationPolicy: any;
  determinismSeed: string;
}

interface ScheduledEvent {
  sampleTime: bigint;
  musicalTime?: any;
  type: string;
  target: any;
  payload: any;
  deterministicId: string;
  sourceInfo: any;
}

// Render configuration
export interface RenderConfig {
  duration: number; // seconds
  sampleRate: number;
  bufferSize: number;
  offline: boolean;
}

// Render result
export interface RenderResult {
  audio: AudioBufferMock;
  events: ScheduledEvent[];
  determinismHash: string;
  renderTime: number; // milliseconds
}

// Mock audio buffer
class AudioBufferMock {
  constructor(
    public numChannels: number,
    public numSamples: number,
    public sampleRate: number,
  ) {
    this.data = [];
    for (let ch = 0; ch < numChannels; ch++) {
      this.data.push(new Float32Array(numSamples));
    }
  }

  private data: Float32Array[];

  getChannel(channel: number): Float32Array {
    if (channel < 0 || channel >= this.data.length) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    return this.data[channel];
  }

  clear(): void {
    this.data.forEach((channel) => channel.fill(0));
  }

  getNumChannels(): number {
    return this.data.length;
  }

  getNumSamples(): number {
    return this.numSamples;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }
}

/**
 * Headless JUCE test harness
 *
 * Simulates JUCE audio processor behavior without requiring actual JUCE installation.
 * Enables deterministic testing of SongModel → Event → Audio pipeline.
 */
export class JUCEHeadlessHarness {
  private model: SongModel_v1 | null;
  private sampleRate: number;
  private bufferSize: number;
  private events: ScheduledEvent[];
  private audioBuffer: AudioBufferMock | null;
  private isInitialized: boolean;

  constructor() {
    this.model = null;
    this.sampleRate = 48000;
    this.bufferSize = 512;
    this.events = [];
    this.audioBuffer = null;
    this.isInitialized = false;
  }

  /**
   * Load SongModel into harness
   */
  loadModel(model: SongModel_v1): void {
    // Validate model version
    if (model.version !== "1.0") {
      throw new Error(
        `Invalid SongModel version: ${model.version}, expected '1.0'`,
      );
    }

    // Validate determinism seed
    if (!model.determinismSeed || model.determinismSeed.length === 0) {
      throw new Error("SongModel must have non-empty determinismSeed");
    }

    this.model = model;
    this.events = [];
    this.audioBuffer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize audio processor (simulates JUCE initialization)
   */
  private initialize(sampleRate: number, bufferSize: number): void {
    if (!this.model) {
      throw new Error("Cannot initialize: no model loaded");
    }

    this.sampleRate = this.validateSampleRate(sampleRate);
    this.bufferSize = this.validateBufferSize(bufferSize);

    // Create audio buffer for rendering
    const numChannels = this.model.mixGraph?.tracks?.length || 2;
    const numSamples = Math.ceil(this.sampleRate * this.getModelDuration());
    this.audioBuffer = new AudioBufferMock(
      Math.max(2, numChannels),
      numSamples,
      this.sampleRate,
    );

    this.isInitialized = true;
  }

  /**
   * Render audio offline (simulates JUCE offline rendering)
   */
  renderOffline(config: RenderConfig): RenderResult {
    if (!this.model) {
      throw new Error("Cannot render: no model loaded");
    }

    // Validate config
    this.validateRenderConfig(config);

    // Initialize processor
    this.initialize(config.sampleRate, config.bufferSize);

    const startTime = Date.now();

    // Generate events (will be replaced by Agent 2's DeterministicEventEmitter)
    this.events = this.generateMockEvents(config);

    // Render audio (mock for now)
    if (this.audioBuffer) {
      this.renderMockAudio(config);
    }

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Generate determinism hash
    const determinismHash = this.generateEventHash(this.events);

    return {
      audio: this.audioBuffer!,
      events: this.events,
      determinismHash,
      renderTime,
    };
  }

  /**
   * Verify event stream matches expected
   */
  verifyEventStream(expected: ScheduledEvent[]): boolean {
    if (this.events.length !== expected.length) {
      return false;
    }

    for (let i = 0; i < this.events.length; i++) {
      if (!this.eventsEqual(this.events[i], expected[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Export audio as buffer (mock implementation)
   */
  exportAudio(format: "wav" | "flac"): Buffer {
    if (!this.audioBuffer) {
      throw new Error("No audio rendered. Call renderOffline() first.");
    }

    if (format !== "wav" && format !== "flac") {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // Mock: return empty buffer with header
    const mockData = {
      format,
      sampleRate: this.audioBuffer.getSampleRate(),
      numChannels: this.audioBuffer.getNumChannels(),
      numSamples: this.audioBuffer.getNumSamples(),
      duration:
        this.audioBuffer.getNumSamples() / this.audioBuffer.getSampleRate(),
    };

    return Buffer.from(JSON.stringify(mockData));
  }

  /**
   * Get loaded model
   */
  getLoadedModel(): SongModel_v1 | null {
    return this.model;
  }

  /**
   * Get current sample rate
   */
  getSampleRate(): number {
    return this.sampleRate;
  }

  /**
   * Set sample rate
   */
  setSampleRate(sampleRate: number): void {
    this.sampleRate = this.validateSampleRate(sampleRate);
  }

  /**
   * Get rendered events
   */
  getEvents(): ScheduledEvent[] {
    return [...this.events];
  }

  /**
   * Get rendered audio buffer
   */
  getAudioBuffer(): AudioBufferMock | null {
    return this.audioBuffer;
  }

  /**
   * Reset harness state
   */
  reset(): void {
    this.model = null;
    this.events = [];
    this.audioBuffer = null;
    this.isInitialized = false;
  }

  /**
   * Validate sample rate
   */
  private validateSampleRate(sampleRate: number): number {
    const validRates = [44100, 48000, 88200, 96000, 176400, 192000];
    if (!validRates.includes(sampleRate)) {
      throw new Error(
        `Invalid sample rate: ${sampleRate}. Must be one of: ${validRates.join(", ")}`,
      );
    }
    return sampleRate;
  }

  /**
   * Validate buffer size
   */
  private validateBufferSize(bufferSize: number): number {
    if (bufferSize <= 0 || (bufferSize & (bufferSize - 1)) !== 0) {
      throw new Error(
        `Invalid buffer size: ${bufferSize}. Must be power of 2.`,
      );
    }
    return bufferSize;
  }

  /**
   * Validate render config
   */
  private validateRenderConfig(config: RenderConfig): void {
    if (!config) {
      throw new Error("Render config is required");
    }

    if (config.duration <= 0) {
      throw new Error(
        `Invalid duration: ${config.duration}. Must be positive.`,
      );
    }

    this.validateSampleRate(config.sampleRate);

    this.validateBufferSize(config.bufferSize);

    if (config.duration > this.getModelDuration()) {
      throw new Error(
        `Render duration (${config.duration}s) exceeds model duration (${this.getModelDuration()}s)`,
      );
    }
  }

  /**
   * Get model duration from sections or transport
   */
  private getModelDuration(): number {
    if (!this.model) {
      return 0;
    }

    // Try to get duration from sections
    if (this.model.sections && this.model.sections.length > 0) {
      const lastSection = this.model.sections[this.model.sections.length - 1];
      if (lastSection.end?.seconds) {
        return lastSection.end.seconds;
      }
    }

    // Try to get duration from transport loop policy
    if (this.model.transport?.loopPolicy?.end) {
      return this.model.transport.loopPolicy.end;
    }

    // Default to 30 seconds
    return 30.0;
  }

  /**
   * Generate mock events (placeholder for Agent 2's DeterministicEventEmitter)
   */
  private generateMockEvents(config: RenderConfig): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];
    const numSamples = Math.floor(config.duration * config.sampleRate);

    // Generate a few mock events for testing
    const eventCount = 10;

    for (let i = 0; i < eventCount; i++) {
      events.push({
        sampleTime: BigInt((numSamples / eventCount) * i),
        type: "NOTE_ON",
        target: {},
        payload: {},
        deterministicId: `mock-event-${i}`,
        sourceInfo: {},
      });
    }

    return events;
  }

  /**
   * Render mock audio (placeholder for actual audio rendering)
   */
  private renderMockAudio(config: RenderConfig): void {
    if (!this.audioBuffer) {
      return;
    }

    // Generate silent audio (placeholder)
    const numChannels = this.audioBuffer.getNumChannels();
    const numSamples = this.audioBuffer.getNumSamples();

    for (let ch = 0; ch < numChannels; ch++) {
      const channel = this.audioBuffer.getChannel(ch);
      channel.fill(0.0);
    }
  }

  /**
   * Generate hash from event stream (for determinism verification)
   */
  private generateEventHash(events: ScheduledEvent[]): string {
    // Simple hash for placeholder
    // Will be replaced by proper hashing implementation
    const eventSum = events.reduce((sum, event) => {
      return sum + Number(event.sampleTime) + event.type.length;
    }, 0);

    return `${events.length}-events-${eventSum}-mock-hash`;
  }

  /**
   * Compare two events for equality
   */
  private eventsEqual(event1: ScheduledEvent, event2: ScheduledEvent): boolean {
    return (
      event1.sampleTime === event2.sampleTime &&
      event1.type === event2.type &&
      event1.deterministicId === event2.deterministicId
    );
  }
}

/**
 * Factory function for convenient harness creation
 */
export function createJUCEHarness(): JUCEHeadlessHarness {
  return new JUCEHeadlessHarness();
}
