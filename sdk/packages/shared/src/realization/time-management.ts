/**
 * Time Management Utilities for Realization Layer
 *
 * Provides utilities for handling musical time, time ranges, and
 * tempo/meter calculations for the "moving sidewalk" system.
 */

import { RealizationTime, TimeRange } from "../types/realization";

/**
 * Tempo and meter information
 */
export interface TempoMeter {
  tempo: number; // BPM
  meter: [number, number]; // [beats per measure, beat unit]
  pickup?: number; // Pickup beats
}

/**
 * Time conversion utilities
 */
export class TimeConverter {
  /**
   * Convert seconds to musical beats
   */
  static secondsToBeats(seconds: number, tempo: number): number {
    return (seconds * tempo) / 60;
  }

  /**
   * Convert beats to seconds
   */
  static beatsToSeconds(beats: number, tempo: number): number {
    return (beats * 60) / tempo;
  }

  /**
   * Convert seconds to measures
   */
  static secondsToMeasures(seconds: number, tempoMeter: TempoMeter): number {
    const beats = this.secondsToBeats(seconds, tempoMeter.tempo);
    const beatsPerMeasure = tempoMeter.meter[0];
    return beats / beatsPerMeasure;
  }

  /**
   * Convert measures to seconds
   */
  static measuresToSeconds(measures: number, tempoMeter: TempoMeter): number {
    const beats = measures * tempoMeter.meter[0];
    return this.beatsToSeconds(beats, tempoMeter.tempo);
  }

  /**
   * Get measure and beat position from time
   */
  static getMeasureBeat(
    time: RealizationTime,
    tempoMeter: TempoMeter,
  ): {
    measure: number;
    beat: number;
    beatPosition: number; // Position within beat 0.0-1.0
  } {
    const totalBeats =
      time.beats || this.secondsToBeats(time.seconds, tempoMeter.tempo);
    const beatsPerMeasure = tempoMeter.meter[0];

    const totalMeasures = Math.floor(totalBeats / beatsPerMeasure);
    const beatInMeasure = totalBeats % beatsPerMeasure;
    const beatPosition = beatInMeasure % 1;

    return {
      measure: totalMeasures,
      beat: Math.floor(beatInMeasure),
      beatPosition,
    };
  }
}

/**
 * Time range implementation with musical awareness
 */
export class MusicalTimeRange implements TimeRange {
  public start: RealizationTime;
  public end: RealizationTime;
  public duration: number;

  constructor(start: RealizationTime, end: RealizationTime) {
    if (end.seconds < start.seconds) {
      throw new Error("End time must be after start time");
    }

    this.start = start;
    this.end = end;
    this.duration = end.seconds - start.seconds;

    // Ensure beats are calculated
    if (this.start.beats === undefined && this.start.tempo) {
      this.start.beats = TimeConverter.secondsToBeats(
        this.start.seconds,
        this.start.tempo,
      );
    }
    if (this.end.beats === undefined && this.end.tempo) {
      this.end.beats = TimeConverter.secondsToBeats(
        this.end.seconds,
        this.end.tempo,
      );
    }
  }

  /**
   * Check if a time point falls within this range
   */
  contains(time: RealizationTime): boolean {
    return (
      time.seconds >= this.start.seconds && time.seconds <= this.end.seconds
    );
  }

  /**
   * Get the overlap with another time range
   */
  overlap(other: TimeRange): TimeRange | null {
    const overlapStart = Math.max(this.start.seconds, other.start.seconds);
    const overlapEnd = Math.min(this.end.seconds, other.end.seconds);

    if (overlapStart >= overlapEnd) {
      return null; // No overlap
    }

    return new MusicalTimeRange(
      { seconds: overlapStart, precision: "seconds" },
      { seconds: overlapEnd, precision: "seconds" },
    );
  }

  /**
   * Slide this window by a delta time
   */
  slide(delta: number): MusicalTimeRange {
    return new MusicalTimeRange(
      {
        seconds: this.start.seconds + delta,
        beats: this.start.beats
          ? this.start.beats + TimeConverter.secondsToBeats(delta, 120)
          : undefined,
        precision: "seconds",
      },
      {
        seconds: this.end.seconds + delta,
        beats: this.end.beats
          ? this.end.beats + TimeConverter.secondsToBeats(delta, 120)
          : undefined,
        precision: "seconds",
      },
    );
  }

  /**
   * Resize the range while maintaining center
   */
  resize(newDuration: number): MusicalTimeRange {
    const center = this.start.seconds + this.duration / 2;
    const halfDuration = newDuration / 2;

    return new MusicalTimeRange(
      {
        seconds: center - halfDuration,
        precision: "seconds",
      },
      {
        seconds: center + halfDuration,
        precision: "seconds",
      },
    );
  }

  /**
   * Split range into smaller chunks
   */
  split(chunkDuration: number): MusicalTimeRange[] {
    const chunks: MusicalTimeRange[] = [];
    let currentTime = this.start.seconds;

    while (currentTime < this.end.seconds) {
      const chunkEnd = Math.min(currentTime + chunkDuration, this.end.seconds);

      chunks.push(
        new MusicalTimeRange(
          {
            seconds: currentTime,
            precision: "seconds",
          },
          {
            seconds: chunkEnd,
            precision: "seconds",
          },
        ),
      );

      currentTime = chunkEnd;
    }

    return chunks;
  }

  /**
   * Get human-readable description
   */
  toString(): string {
    return `${this.duration.toFixed(2)}s range from ${this.start.seconds.toFixed(2)}s`;
  }
}

/**
 * Time-based event scheduler
 */
export class TimeScheduler {
  private events: Array<{
    time: number;
    callback: () => void;
    id: string;
  }> = [];
  private nextId: number = 0;

  /**
   * Schedule an event at specific time
   */
  schedule(time: number, callback: () => void): string {
    const id = `event-${this.nextId++}`;
    this.events.push({ time, callback, id });
    this.events.sort((a, b) => a.time - b.time);
    return id;
  }

  /**
   * Schedule recurring event
   */
  scheduleRecurring(
    startTime: number,
    interval: number,
    callback: () => void,
  ): string {
    const id = `recurring-${this.nextId++}`;

    const createNextEvent = (time: number) => {
      this.events.push({
        time,
        callback: () => {
          callback();
          createNextEvent(time + interval);
        },
        id,
      });
    };

    createNextEvent(startTime);
    this.events.sort((a, b) => a.time - b.time);
    return id;
  }

  /**
   * Process events up to current time
   */
  process(currentTime: number): string[] {
    const processedEvents: string[] = [];

    while (this.events.length > 0 && this.events[0].time <= currentTime) {
      const event = this.events.shift()!;
      try {
        event.callback();
        processedEvents.push(event.id);
      } catch (error) {
        console.error(`Error processing scheduled event ${event.id}:`, error);
      }
    }

    return processedEvents;
  }

  /**
   * Cancel scheduled event
   */
  cancel(id: string): boolean {
    const index = this.events.findIndex((event) => event.id === id);
    if (index >= 0) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all scheduled events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get next scheduled time
   */
  getNextTime(): number | null {
    return this.events.length > 0 ? this.events[0].time : null;
  }

  /**
   * Get count of scheduled events
   */
  getCount(): number {
    return this.events.length;
  }
}

/**
 * Time-based animation controller
 */
export class TimeAnimator {
  private startTime: number = 0;
  private currentTime: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  /**
   * Start animation
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = performance.now();
    this.tick();
  }

  /**
   * Stop animation
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset animation
   */
  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.startTime = 0;
  }

  /**
   * Get current time in seconds
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Get elapsed time since start
   */
  getElapsedTime(): number {
    return this.isRunning ? this.currentTime : this.currentTime;
  }

  /**
   * Set time position
   */
  setTime(time: number): void {
    this.currentTime = Math.max(0, time);
    if (!this.isRunning) {
      this.startTime = performance.now() - time * 1000;
    }
  }

  /**
   * Animation tick callback
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.currentTime = (now - this.startTime) / 1000;

    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}

/**
 * Utility functions for time calculations
 */
export class TimeUtils {
  /**
   * Clamp time to range
   */
  static clampTime(
    time: RealizationTime,
    min: number,
    max: number,
  ): RealizationTime {
    return {
      ...time,
      seconds: Math.max(min, Math.min(max, time.seconds)),
    };
  }

  /**
   * Lerp between two times
   */
  static lerpTime(
    time1: RealizationTime,
    time2: RealizationTime,
    t: number,
  ): RealizationTime {
    return {
      seconds: time1.seconds + (time2.seconds - time1.seconds) * t,
      beats:
        time1.beats && time2.beats
          ? time1.beats + (time2.beats - time1.beats) * t
          : undefined,
      precision: time1.precision,
    };
  }

  /**
   * Check if time is approximately equal
   */
  static timeEquals(
    time1: RealizationTime,
    time2: RealizationTime,
    tolerance: number = 0.001,
  ): boolean {
    return Math.abs(time1.seconds - time2.seconds) <= tolerance;
  }

  /**
   * Format time for display
   */
  static formatTime(time: RealizationTime, showBeats: boolean = false): string {
    const minutes = Math.floor(time.seconds / 60);
    const seconds = (time.seconds % 60).toFixed(2);
    const base = `${minutes}:${seconds.padStart(5, "0")}`;

    if (showBeats && time.beats !== undefined) {
      return `${base} (${time.beats.toFixed(2)} beats)`;
    }

    return base;
  }

  /**
   * Create time from seconds
   */
  static fromSeconds(seconds: number, tempo?: number): RealizationTime {
    return {
      seconds,
      beats: tempo ? TimeConverter.secondsToBeats(seconds, tempo) : undefined,
      precision: "seconds",
    };
  }

  /**
   * Create time from beats
   */
  static fromBeats(beats: number, tempo: number): RealizationTime {
    return {
      seconds: TimeConverter.beatsToSeconds(beats, tempo),
      beats,
      precision: "beats",
      tempo,
    };
  }
}

/**
 * Metronome for musical timing
 */
export class Metronome {
  private tempo: number;
  private meter: [number, number];
  private currentBeat: number = 0;
  private currentMeasure: number = 0;
  private nextBeatTime: number = 0;
  private isRunning: boolean = false;
  private callbacks: Array<() => void> = [];

  constructor(tempo: number = 120, meter: [number, number] = [4, 4]) {
    this.tempo = tempo;
    this.meter = meter;
  }

  /**
   * Start metronome
   */
  start(startTime: number = 0): void {
    this.isRunning = true;
    this.currentBeat = 0;
    this.currentMeasure = 0;
    this.nextBeatTime = startTime;
  }

  /**
   * Stop metronome
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Update metronome state
   */
  update(currentTime: number): boolean {
    if (!this.isRunning) return false;

    const beatDuration = 60 / this.tempo;

    if (currentTime >= this.nextBeatTime) {
      // Trigger beat
      this.currentBeat++;

      if (this.currentBeat >= this.meter[0]) {
        this.currentBeat = 0;
        this.currentMeasure++;
      }

      this.nextBeatTime += beatDuration;

      // Notify callbacks
      this.callbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error("Metronome callback error:", error);
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Add beat callback
   */
  onBeat(callback: () => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Get current position
   */
  getPosition(): { measure: number; beat: number; isDownbeat: boolean } {
    return {
      measure: this.currentMeasure,
      beat: this.currentBeat,
      isDownbeat: this.currentBeat === 0,
    };
  }

  /**
   * Set tempo
   */
  setTempo(tempo: number): void {
    this.tempo = tempo;
  }

  /**
   * Get tempo
   */
  getTempo(): number {
    return this.tempo;
  }

  /**
   * Set meter
   */
  setMeter(meter: [number, number]): void {
    this.meter = meter;
    this.currentBeat = Math.min(this.currentBeat, meter[0] - 1);
  }

  /**
   * Get meter
   */
  getMeter(): [number, number] {
    return this.meter;
  }
}
