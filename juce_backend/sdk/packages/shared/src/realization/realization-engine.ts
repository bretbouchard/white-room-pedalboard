/**
 * Realization Engine Implementation
 *
 * Coordinates the entire realization process, managing time progression,
 * layer generation, and output streaming for both real-time and batch processing.
 */

import {
  RealizationEngine as IRealizationEngine,
  RealizationPlane,
  RealizedFrame,
  ConvergencePoint,
  MusicalTime,
  TimeRange,
} from '../types/realization';

/**
 * Engine configuration
 */
export interface RealizationEngineConfig {
  mode: 'realtime' | 'batch' | 'streaming';
  target?: string;
  bufferSize: number;
  updateRate: number; // Hz for realtime mode
  latency: number; // seconds for realtime mode
  enableHistory: boolean;
  enablePrediction: boolean;
}

/**
 * Frame buffer for managing frame flow
 */
export class FrameBuffer {
  private frames: RealizedFrame[] = [];
  private capacity: number;
  private readIndex: number = 0;
  private writeIndex: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.frames = new Array(capacity);
  }

  /**
   * Add frame to buffer (realtime thread)
   */
  write(frame: RealizedFrame): boolean {
    if (this.isFull()) {
      return false; // Buffer full
    }

    this.frames[this.writeIndex] = frame;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    return true;
  }

  /**
   * Read frame from buffer (processing thread)
   */
  read(): RealizedFrame | null {
    if (this.isEmpty()) {
      return null; // Buffer empty
    }

    const frame = this.frames[this.readIndex];
    this.frames[this.readIndex] = null as any; // Clear reference
    this.readIndex = (this.readIndex + 1) % this.capacity;
    return frame;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return (this.writeIndex + 1) % this.capacity === this.readIndex;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.readIndex === this.writeIndex;
  }

  /**
   * Get current fill level
   */
  fillLevel(): number {
    if (this.writeIndex >= this.readIndex) {
      return this.writeIndex - this.readIndex;
    } else {
      return this.capacity - this.readIndex + this.writeIndex;
    }
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.frames.fill(null as any);
  }
}

/**
 * Realization engine implementation
 */
export class RealizationEngine implements IRealizationEngine {
  public readonly id: string;
  public plane: RealizationPlane;
  public output: {
    format: 'realtime' | 'batch' | 'streaming';
    target?: string;
  };

  private config: RealizationEngineConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private currentTime: number = 0;
  private frameBuffer: FrameBuffer;
  private frameHistory: RealizedFrame[] = [];
  private convergenceCallbacks: Array<(point: ConvergencePoint) => void> = [];
  private frameUpdateCallbacks: Array<(frame: RealizedFrame) => void> = [];
  private animationFrameId: number | null = null;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    plane: RealizationPlane,
    options: {
      id?: string;
      output?: {
        format: 'realtime' | 'batch' | 'streaming';
        target?: string;
      };
      config?: Partial<RealizationEngineConfig>;
    } = {}
  ) {
    this.id = options.id || `engine-${Date.now()}`;
    this.plane = plane;
    this.output = options.output || { format: 'realtime' };

    this.config = {
      mode: this.output.format as any,
      bufferSize: 100,
      updateRate: 30,
      latency: 0.1,
      enableHistory: true,
      enablePrediction: true,
      ...options.config
    };

    this.frameBuffer = new FrameBuffer(this.config.bufferSize);
  }

  /**
   * Start realization process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Realization engine is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.currentTime = 0;

    switch (this.config.mode) {
      case 'realtime':
        this.startRealtimeMode();
        break;
      case 'batch':
        await this.startBatchMode();
        break;
      case 'streaming':
        await this.startStreamingMode();
        break;
    }

    console.log(`Realization engine started in ${this.config.mode} mode`);
  }

  /**
   * Stop realization process
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Realization engine is not running');
      return;
    }

    this.isRunning = false;

    // Stop mode-specific processes
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.processingInterval !== null) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Clear buffers
    this.frameBuffer.clear();

    console.log('Realization engine stopped');
  }

  /**
   * Get current frame
   */
  getCurrentFrame(): RealizedFrame {
    const currentTime = this.getCurrentMusicalTime();
    return this.plane.realize(currentTime);
  }

  /**
   * Subscribe to frame updates (for real-time UI)
   */
  onFrameUpdate(callback: (frame: RealizedFrame) => void): void {
    this.frameUpdateCallbacks.push(callback);
  }

  /**
   * Subscribe to convergence events
   */
  onConvergence(callback: (point: ConvergencePoint) => void): void {
    this.convergenceCallbacks.push(callback);
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    uptime: number;
    framesGenerated: number;
    framesProcessed: number;
    bufferUtilization: number;
    averageFrameRate: number;
    convergencesDetected: number;
  } {
    const uptime = this.isRunning ? (performance.now() - this.startTime) / 1000 : 0;
    const framesGenerated = this.frameHistory.length;
    const framesProcessed = this.frameBuffer.fillLevel();
    const bufferUtilization = framesProcessed / this.config.bufferSize;
    const averageFrameRate = framesGenerated / Math.max(uptime, 1);

    return {
      uptime,
      framesGenerated,
      framesProcessed,
      bufferUtilization,
      averageFrameRate,
      convergencesDetected: this.countConvergences()
    };
  }

  /**
   * Configure engine parameters
   */
  configure(config: Partial<RealizationEngineConfig>): void {
    this.config = { ...this.config, ...config };

    // Resize buffer if needed
    if (config.bufferSize && config.bufferSize !== this.frameBuffer['capacity']) {
      const oldBuffer = this.frameBuffer;
      this.frameBuffer = new FrameBuffer(config.bufferSize);
      oldBuffer.clear();
    }
  }

  /**
   * Export current state
   */
  exportState(): {
    plane: any;
    currentTime: MusicalTime;
    frameHistory: RealizedFrame[];
    statistics: any;
  } {
    return {
      plane: this.plane.getState(),
      currentTime: this.getCurrentMusicalTime(),
      frameHistory: [...this.frameHistory],
      statistics: this.getStatistics()
    };
  }

  // Private implementation methods

  /**
   * Start real-time mode
   */
  private startRealtimeMode(): void {
    const targetFrameTime = 1000 / this.config.updateRate;

    const renderFrame = (timestamp: number) => {
      if (!this.isRunning) return;

      // Calculate current musical time
      this.currentTime = (timestamp - this.startTime) / 1000;
      const musicalTime = this.getCurrentMusicalTime();

      // Generate frame
      const frame = this.plane.realize(musicalTime);

      // Add to buffer
      if (!this.frameBuffer.write(frame)) {
        console.warn('Frame buffer full, dropping frame');
      }

      // Update history if enabled
      if (this.config.enableHistory) {
        this.updateFrameHistory(frame);
      }

      // Check for convergences
      this.checkConvergences(frame);

      // Notify frame update callbacks
      this.notifyFrameUpdate(frame);

      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    this.animationFrameId = requestAnimationFrame(renderFrame);

    // Start frame processing
    this.startFrameProcessing();
  }

  /**
   * Start batch mode
   */
  private async startBatchMode(): Promise<void> {
    // Generate all frames for the duration
    const duration = this.plane.timeWindow.duration || 30; // Default 30 seconds
    const frameRate = this.config.updateRate;
    const totalFrames = Math.floor(duration * frameRate);

    console.log(`Generating ${totalFrames} frames in batch mode`);

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (!this.isRunning) break;

      const frameTime = (frameIndex / frameRate);
      const musicalTime: MusicalTime = {
        seconds: frameTime,
        beats: (frameTime * 2), // Assuming 120 BPM
        precision: 'seconds'
      };

      const frame = this.plane.realize(musicalTime);

      // Add to buffer
      this.frameBuffer.write(frame);

      // Update history
      if (this.config.enableHistory) {
        this.updateFrameHistory(frame);
      }

      // Check for convergences
      this.checkConvergences(frame);

      // Progress reporting
      if (frameIndex % Math.floor(totalFrames / 10) === 0) {
        console.log(`Batch progress: ${Math.round((frameIndex / totalFrames) * 100)}%`);
      }
    }

    console.log('Batch processing complete');
    await this.stop();
  }

  /**
   * Start streaming mode
   */
  private async startStreamingMode(): Promise<void> {
    // Similar to realtime but with network output
    this.startRealtimeMode();

    // Additional streaming setup would go here
    console.log(`Streaming mode started, target: ${this.output.target}`);
  }

  /**
   * Start frame processing thread
   */
  private startFrameProcessing(): void {
    const processingInterval = 1000 / this.config.updateRate;

    this.processingInterval = setInterval(() => {
      if (!this.isRunning) return;

      // Process frames from buffer
      const frame = this.frameBuffer.read();
      if (frame) {
        this.processFrame(frame);
      }
    }, processingInterval);
  }

  /**
   * Process a single frame
   */
  private processFrame(frame: RealizedFrame): void {
    // Apply any post-processing
    const processedFrame = this.postProcessFrame(frame);

    // Send to output
    this.sendToOutput(processedFrame);
  }

  /**
   * Post-process frame
   */
  private postProcessFrame(frame: RealizedFrame): RealizedFrame {
    // Apply smoothing, effects, etc.
    // This is where you could apply audio processing, visual effects, etc.

    return frame;
  }

  /**
   * Send frame to output destination
   */
  private sendToOutput(frame: RealizedFrame): void {
    switch (this.output.format) {
      case 'realtime':
        // Send to audio/MIDI output
        this.sendToRealtimeOutput(frame);
        break;
      case 'batch':
        // Store for later export
        this.storeForBatchExport(frame);
        break;
      case 'streaming':
        // Send over network
        this.sendToStreamingOutput(frame);
        break;
    }
  }

  /**
   * Send to real-time output
   */
  private sendToRealtimeOutput(frame: RealizedFrame): void {
    // This would interface with audio/MIDI APIs
    // For now, just log the frame info
    if (Math.random() < 0.01) { // Log 1% of frames to avoid spam
      console.log(`Realtime frame: ${frame.layers.length} layers, coherence: ${frame.coherenceScore.toFixed(2)}`);
    }
  }

  /**
   * Store frame for batch export
   */
  private storeForBatchExport(frame: RealizedFrame): void {
    // Store frame for later export
    // Implementation depends on export format
  }

  /**
   * Send frame to streaming output
   */
  private sendToStreamingOutput(frame: RealizedFrame): void {
    // Serialize and send frame over network
    if (this.output.target) {
      // Network streaming implementation
    }
  }

  /**
   * Get current musical time
   */
  private getCurrentMusicalTime(): MusicalTime {
    const seconds = this.currentTime;
    const tempo = 120; // Default tempo
    const beats = (seconds * tempo) / 60;

    return {
      seconds,
      beats,
      precision: 'seconds'
    };
  }

  /**
   * Update frame history
   */
  private updateFrameHistory(frame: RealizedFrame): void {
    this.frameHistory.push(frame);

    // Limit history size
    const maxHistorySize = 1000;
    if (this.frameHistory.length > maxHistorySize) {
      this.frameHistory.shift();
    }
  }

  /**
   * Check for convergences in frame
   */
  private checkConvergences(frame: RealizedFrame): void {
    if (frame.convergenceFlags.approachingConvergence && frame.convergenceFlags.convergenceTime) {
      const convergencePoint: ConvergencePoint = {
        time: frame.convergenceFlags.convergenceTime,
        strength: frame.convergenceFlags.convergenceStrength || 0,
        layers: frame.layers.map(l => l.id),
        type: frame.convergenceFlags.convergenceType || 'emergence'
      };

      this.notifyConvergence(convergencePoint);
    }
  }

  /**
   * Notify convergence callbacks
   */
  private notifyConvergence(point: ConvergencePoint): void {
    for (const callback of this.convergenceCallbacks) {
      try {
        callback(point);
      } catch (error) {
        console.error('Error in convergence callback:', error);
      }
    }
  }

  /**
   * Notify frame update callbacks
   */
  private notifyFrameUpdate(frame: RealizedFrame): void {
    for (const callback of this.frameUpdateCallbacks) {
      try {
        callback(frame);
      } catch (error) {
        console.error('Error in frame update callback:', error);
      }
    }
  }

  /**
   * Count convergences in history
   */
  private countConvergences(): number {
    return this.frameHistory.filter(frame =>
      frame.convergenceFlags.approachingConvergence
    ).length;
  }
}

/**
 * Engine factory for creating pre-configured engines
 */
export class RealizationEngineFactory {
  /**
   * Create real-time performance engine
   */
  static createRealtimeEngine(
    plane: RealizationPlane,
    options: {
      outputLatency?: number;
      frameRate?: number;
      bufferSize?: number;
    } = {}
  ): RealizationEngine {
    return new RealizationEngine(plane, {
      output: { format: 'realtime' },
      config: {
        mode: 'realtime',
        latency: options.outputLatency || 0.1,
        updateRate: options.frameRate || 30,
        bufferSize: options.bufferSize || 100
      }
    });
  }

  /**
   * Create batch rendering engine
   */
  static createBatchEngine(
    plane: RealizationPlane,
    options: {
      duration?: number;
      frameRate?: number;
      enableHistory?: boolean;
    } = {}
  ): RealizationEngine {
    return new RealizationEngine(plane, {
      output: { format: 'batch' },
      config: {
        mode: 'batch',
        updateRate: options.frameRate || 60,
        enableHistory: options.enableHistory ?? true
      }
    });
  }

  /**
   * Create streaming engine
   */
  static createStreamingEngine(
    plane: RealizationPlane,
    target: string,
    options: {
      frameRate?: number;
      bufferSize?: number;
      compression?: boolean;
    } = {}
  ): RealizationEngine {
    return new RealizationEngine(plane, {
      output: { format: 'streaming', target },
      config: {
        mode: 'streaming',
        updateRate: options.frameRate || 30,
        bufferSize: options.bufferSize || 50
      }
    });
  }

  /**
   * Create engine for DAW integration
   */
  static createDAWEngine(
    plane: RealizationPlane,
    dawFormat: 'ableton' | 'logic' | 'protools' | 'cubase',
    options: {
      frameRate?: number;
      enableMidiOutput?: boolean;
    } = {}
  ): RealizationEngine {
    return new RealizationEngine(plane, {
      output: { format: 'realtime', target: dawFormat },
      config: {
        mode: 'realtime',
        updateRate: options.frameRate || 30,
        enableHistory: true,
        enablePrediction: true
      }
    });
  }
}