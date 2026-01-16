/**
 * Realized Layer Implementation
 *
 * Represents functional musical roles with material that emerges
 * from the interaction of generators and fields in the realization plane.
 */

import {
  RealizedLayer as IRealizedLayer,
  MusicalRole,
  RegisterRange,
  MusicalMaterial,
  MusicalEvent,
  ConvergenceHints,
  RealizationTime,
} from "../types/realization";

/**
 * Layer generation context
 */
export interface LayerContext {
  currentTime: RealizationTime;
  timeWindow: {
    start: RealizationTime;
    end: RealizationTime;
    duration: number;
  };
  intensity: number;
  convergence: ConvergenceHints;
  globalTempo: number;
  globalMeter: [number, number];
}

/**
 * Layer processing options
 */
export interface LayerProcessingOptions {
  enableSmoothing: boolean;
  smoothingFactor: number;
  enableFiltering: boolean;
  minEventDuration: number;
  maxEventDuration: number;
  enableQuantization: boolean;
  quantizationGrid: number; // in seconds
  enableDynamicRange: boolean;
  dynamicRangeCompress: number; // 0.0 to 1.0
}

/**
 * Realized layer implementation with processing capabilities
 */
export class RealizedLayer implements IRealizedLayer {
  public readonly id: string;
  public readonly role: MusicalRole;
  public readonly generatorId: string;
  public material: MusicalMaterial;
  public register: RegisterRange;
  public energy: number;
  public coherence: number;
  public emergence: number;
  public metadata: {
    intensity?: number;
    complexity?: number;
    convergenceHints?: ConvergenceHints;
    processingHistory?: Array<{
      timestamp: number;
      operation: string;
      parameters?: Record<string, any>;
    }>;
  };

  private processingOptions: LayerProcessingOptions;
  private lastUpdateTime: number = 0;

  constructor(options: {
    id: string;
    role: MusicalRole;
    generatorId: string;
    material: MusicalMaterial;
    register: RegisterRange;
    energy: number;
    coherence: number;
    emergence: number;
    metadata?: any;
    processingOptions?: Partial<LayerProcessingOptions>;
  }) {
    this.id = options.id;
    this.role = options.role;
    this.generatorId = options.generatorId;
    this.material = options.material || [];
    this.register = options.register;
    this.energy = options.energy;
    this.coherence = options.coherence;
    this.emergence = options.emergence;
    this.metadata = options.metadata || {};

    this.processingOptions = {
      enableSmoothing: true,
      smoothingFactor: 0.7,
      enableFiltering: true,
      minEventDuration: 0.05,
      maxEventDuration: 10.0,
      enableQuantization: false,
      quantizationGrid: 0.25, // 16th notes at 60 BPM
      enableDynamicRange: true,
      dynamicRangeCompress: 0.3,
      ...options.processingOptions,
    };

    this.lastUpdateTime = Date.now();
  }

  /**
   * Process layer material with current options
   */
  process(context: LayerContext): void {
    let processedMaterial = [...this.material];

    // Apply processing steps in order
    if (this.processingOptions.enableFiltering) {
      processedMaterial = this.applyFiltering(processedMaterial);
    }

    if (this.processingOptions.enableQuantization) {
      processedMaterial = this.applyQuantization(processedMaterial);
    }

    if (this.processingOptions.enableDynamicRange) {
      this.applyDynamicRange(processedMaterial, context.intensity);
    }

    if (this.processingOptions.enableSmoothing) {
      processedMaterial = this.applySmoothing(processedMaterial);
    }

    // Update material
    this.material = processedMaterial;

    // Update metadata
    this.updateMetadata(context);

    // Record processing history
    this.recordProcessing("process", {
      contextIntensity: context.intensity,
      materialCount: processedMaterial.length,
    });

    this.lastUpdateTime = Date.now();
  }

  /**
   * Add new events to layer
   */
  addEvents(events: MusicalEvent[]): void {
    const filteredEvents = events.filter((event) => this.isValidEvent(event));

    if (this.processingOptions.enableSmoothing) {
      // Blend with existing material
      this.material = this.blendMaterials(this.material, filteredEvents);
    } else {
      this.material.push(...filteredEvents);
    }

    // Sort by time
    this.material.sort((a, b) => a.time - b.time);

    // Record processing
    this.recordProcessing("addEvents", {
      count: events.length,
      valid: filteredEvents.length,
    });
  }

  /**
   * Remove events from layer
   */
  removeEvents(eventIds: string[]): void {
    const originalCount = this.material.length;
    this.material = this.material.filter(
      (event) => !eventIds.includes(event.id),
    );

    this.recordProcessing("removeEvents", {
      requested: eventIds.length,
      removed: originalCount - this.material.length,
    });
  }

  /**
   * Clear all material
   */
  clear(): void {
    this.material = [];
    this.recordProcessing("clear");
  }

  /**
   * Get events within time range
   */
  getEventsInRange(startTime: number, endTime: number): MusicalEvent[] {
    return this.material.filter(
      (event) => event.time >= startTime && event.time < endTime,
    );
  }

  /**
   * Get layer statistics
   */
  getStatistics(): {
    eventCount: number;
    duration: number;
    density: number; // events per second
    averageAmplitude: number;
    averageDuration: number;
    pitchRange?: { min: number; max: number; range: number };
    registerUtilization: number; // How well the material uses the register
  } {
    if (this.material.length === 0) {
      return {
        eventCount: 0,
        duration: 0,
        density: 0,
        averageAmplitude: 0,
        averageDuration: 0,
        registerUtilization: 0,
      };
    }

    const startTime = this.material[0].time;
    const endTime = Math.max(...this.material.map((e) => e.time + e.duration));
    const duration = endTime - startTime;

    const pitches = this.material
      .filter((e) => e.pitch !== undefined)
      .map((e) => e.pitch!);

    const pitchRange =
      pitches.length > 0
        ? {
            min: Math.min(...pitches),
            max: Math.max(...pitches),
            range: Math.max(...pitches) - Math.min(...pitches),
          }
        : undefined;

    const registerUtilization = pitchRange
      ? Math.min(1, pitchRange.range / (this.register.width || 24))
      : 0;

    return {
      eventCount: this.material.length,
      duration,
      density: this.material.length / Math.max(duration, 1),
      averageAmplitude:
        this.material.reduce((sum, e) => sum + e.amplitude, 0) /
        this.material.length,
      averageDuration:
        this.material.reduce((sum, e) => sum + e.duration, 0) /
        this.material.length,
      pitchRange,
      registerUtilization,
    };
  }

  /**
   * Validate layer coherence
   */
  validateCoherence(): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check register compliance
    const outOfRegisterEvents = this.material.filter((event) => {
      if (!event.pitch) return false;
      return event.pitch < this.register.min || event.pitch > this.register.max;
    });

    if (outOfRegisterEvents.length > 0) {
      issues.push(
        `${outOfRegisterEvents.length} events outside register range`,
      );
      suggestions.push("Consider transposing events or adjusting register");
    }

    // Check for very short events
    const shortEvents = this.material.filter(
      (event) => event.duration < this.processingOptions.minEventDuration,
    );
    if (shortEvents.length > 0) {
      issues.push(
        `${shortEvents.length} events too short for practical performance`,
      );
      suggestions.push("Increase minimum event duration or merge short events");
    }

    // Check for very long events
    const longEvents = this.material.filter(
      (event) => event.duration > this.processingOptions.maxEventDuration,
    );
    if (longEvents.length > 0) {
      issues.push(
        `${longEvents.length} events may be too long for musical context`,
      );
      suggestions.push("Consider breaking long events into smaller phrases");
    }

    // Check amplitude consistency
    const amplitudes = this.material.map((e) => e.amplitude);
    const avgAmplitude =
      amplitudes.reduce((sum, a) => sum + a, 0) / amplitudes.length;
    const amplitudeVariance =
      amplitudes.reduce((sum, a) => sum + Math.pow(a - avgAmplitude, 2), 0) /
      amplitudes.length;

    if (amplitudeVariance > 0.3) {
      issues.push("High amplitude variance may cause balance issues");
      suggestions.push("Apply dynamic range compression or adjust amplitudes");
    }

    const isValid = issues.length === 0;

    return { isValid, issues, suggestions };
  }

  /**
   * Clone layer
   */
  clone(): RealizedLayer {
    return new RealizedLayer({
      id: `${this.id}-clone-${Date.now()}`,
      role: this.role,
      generatorId: this.generatorId,
      material: this.material.map((event) => ({ ...event })),
      register: { ...this.register },
      energy: this.energy,
      coherence: this.coherence,
      emergence: this.emergence,
      metadata: { ...this.metadata },
      processingOptions: this.processingOptions,
    });
  }

  /**
   * Export layer to MIDI-compatible format
   */
  exportToMIDI(): Array<{
    pitch: number;
    velocity: number;
    startTime: number; // in seconds
    duration: number; // in seconds
    channel: number;
  }> {
    return this.material
      .filter((event) => event.pitch !== undefined)
      .map((event) => ({
        pitch: event.pitch!,
        velocity: Math.round(event.amplitude * 127),
        startTime: event.time,
        duration: event.duration,
        channel: this.getRoleMidiChannel(),
      }));
  }

  // Private processing methods

  private applyFiltering(material: MusicalMaterial): MusicalMaterial {
    return material.filter((event) => this.isValidEvent(event));
  }

  private applyQuantization(material: MusicalMaterial): MusicalMaterial {
    const grid = this.processingOptions.quantizationGrid;

    return material.map((event) => ({
      ...event,
      time: Math.round(event.time / grid) * grid,
      duration: Math.max(
        this.processingOptions.minEventDuration,
        Math.round(event.duration / grid) * grid,
      ),
    }));
  }

  private applyDynamicRange(
    material: MusicalMaterial,
    contextIntensity: number,
  ): void {
    const compress = this.processingOptions.dynamicRangeCompress;

    // Apply compression based on context intensity
    for (const event of material) {
      const targetAmplitude = event.amplitude * contextIntensity;
      const compressedAmplitude =
        targetAmplitude * (1 - compress) + 0.5 * compress;

      event.amplitude = Math.max(0, Math.min(1, compressedAmplitude));
    }
  }

  private applySmoothing(material: MusicalMaterial): MusicalMaterial {
    if (material.length <= 1) return material;

    const smoothed: MusicalEvent[] = [material[0]]; // Keep first event

    for (let i = 1; i < material.length; i++) {
      const prev = material[i - 1];
      const current = material[i];

      // Smooth amplitude transitions
      const smoothedAmplitude =
        prev.amplitude * this.processingOptions.smoothingFactor +
        current.amplitude * (1 - this.processingOptions.smoothingFactor);

      // Create smoothed event
      smoothed.push({
        ...current,
        amplitude: smoothedAmplitude,
        // Optionally smooth other parameters
        articulation: current.articulation
          ? {
              ...current.articulation,
              attack: prev.articulation?.attack
                ? prev.articulation.attack *
                    this.processingOptions.smoothingFactor +
                  current.articulation.attack *
                    (1 - this.processingOptions.smoothingFactor)
                : current.articulation.attack,
            }
          : undefined,
      });
    }

    return smoothed;
  }

  private blendMaterials(
    existing: MusicalEvent[],
    newEvents: MusicalEvent[],
  ): MusicalEvent[] {
    const blended = [...existing];

    for (const newEvent of newEvents) {
      // Find overlapping events
      const overlappingIndex = blended.findIndex(
        (existing) =>
          Math.abs(existing.time - newEvent.time) < 0.1 && // 100ms tolerance
          existing.pitch === newEvent.pitch,
      );

      if (overlappingIndex >= 0) {
        // Blend with existing event
        const existing = blended[overlappingIndex];
        blended[overlappingIndex] = {
          ...existing,
          amplitude: (existing.amplitude + newEvent.amplitude) / 2,
          duration: Math.max(existing.duration, newEvent.duration),
        };
      } else {
        // Add new event
        blended.push(newEvent);
      }
    }

    return blended.sort((a, b) => a.time - b.time);
  }

  private isValidEvent(event: MusicalEvent): boolean {
    // Time validation
    if (event.time < 0 || !Number.isFinite(event.time)) return false;
    if (event.duration <= 0 || !Number.isFinite(event.duration)) return false;

    // Duration validation
    if (
      event.duration < this.processingOptions.minEventDuration ||
      event.duration > this.processingOptions.maxEventDuration
    ) {
      return false;
    }

    // Amplitude validation
    if (
      event.amplitude < 0 ||
      event.amplitude > 1 ||
      !Number.isFinite(event.amplitude)
    ) {
      return false;
    }

    // Pitch validation (if present)
    if (event.pitch !== undefined) {
      if (
        !Number.isInteger(event.pitch) ||
        event.pitch < 0 ||
        event.pitch > 127
      ) {
        return false;
      }
    }

    return true;
  }

  private updateMetadata(context: LayerContext): void {
    this.metadata.intensity = context.intensity;
    this.metadata.convergenceHints = context.convergence;

    // Update complexity based on current material
    const stats = this.getStatistics();
    this.metadata.complexity = this.calculateComplexity(stats);
  }

  private calculateComplexity(stats: any): number {
    // Simple complexity calculation based on various factors
    const densityFactor = Math.min(1, stats.density / 10); // Normalize to 0-1
    const pitchRangeFactor = stats.pitchRange
      ? Math.min(1, stats.pitchRange.range / 24)
      : 0;
    const durationVariance = this.calculateDurationVariance();

    return (densityFactor + pitchRangeFactor + durationVariance) / 3;
  }

  private calculateDurationVariance(): number {
    if (this.material.length === 0) return 0;

    const durations = this.material.map((e) => e.duration);
    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
      durations.length;

    return Math.min(1, variance / 4); // Normalize to 0-1
  }

  private getRoleMidiChannel(): number {
    const channels: Record<MusicalRole, number> = {
      melody: 0,
      lead: 0,
      bass: 1,
      harmony: 2,
      "counter-melody": 3,
      rhythm: 9, // Channel 10 for percussion
      texture: 4,
      ornament: 5,
      accompaniment: 6,
    };

    return channels[this.role] || 0;
  }

  private recordProcessing(
    operation: string,
    parameters?: Record<string, any>,
  ): void {
    if (!this.metadata.processingHistory) {
      this.metadata.processingHistory = [];
    }

    this.metadata.processingHistory.push({
      timestamp: Date.now(),
      operation,
      parameters,
    });

    // Limit history size
    if (this.metadata.processingHistory.length > 100) {
      this.metadata.processingHistory.shift();
    }
  }

  /**
   * Get processing history
   */
  getProcessingHistory(): Array<{
    timestamp: number;
    operation: string;
    parameters?: Record<string, any>;
  }> {
    return this.metadata.processingHistory || [];
  }

  /**
   * Configure processing options
   */
  configureProcessing(options: Partial<LayerProcessingOptions>): void {
    this.processingOptions = { ...this.processingOptions, ...options };
    this.recordProcessing("configureProcessing", options);
  }

  /**
   * Get current processing options
   */
  getProcessingOptions(): LayerProcessingOptions {
    return { ...this.processingOptions };
  }

  /**
   * Get age of layer in milliseconds
   */
  getAge(): number {
    return Date.now() - this.lastUpdateTime;
  }

  /**
   * Check if layer is stale (hasn't been updated recently)
   */
  isStale(thresholdMs: number = 5000): boolean {
    return this.getAge() > thresholdMs;
  }
}
