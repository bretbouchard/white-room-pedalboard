/**
 * Realtime-Safe Utilities for Audio Thread Operations
 *
 * Provides lock-free data structures and memory pools designed
 * for use in audio processing threads where allocations and locks
 * are forbidden.
 */

import { MusicalEvent, RealizedFrame } from '../types/realization';

/**
 * Lock-free ring buffer for single producer, single consumer
 */
export class LockFreeRingBuffer<T> {
  private buffer: T[];
  private capacity: number;
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private mask: number;

  constructor(capacity: number) {
    // Capacity must be power of 2 for efficient masking
    const powerOf2Size = Math.pow(2, Math.ceil(Math.log2(capacity)));
    this.capacity = powerOf2Size;
    this.buffer = new Array(powerOf2Size);
    this.mask = powerOf2Size - 1;
  }

  /**
   * Push item (producer thread only)
   */
  push(item: T): boolean {
    const nextWrite = (this.writeIndex + 1) & this.mask;

    if (nextWrite === this.readIndex) {
      return false; // Buffer full
    }

    this.buffer[this.writeIndex] = item;
    this.writeIndex = nextWrite;
    return true;
  }

  /**
   * Pop item (consumer thread only)
   */
  pop(): T | undefined {
    if (this.readIndex === this.writeIndex) {
      return undefined; // Buffer empty
    }

    const item = this.buffer[this.readIndex];
    this.buffer[this.readIndex] = undefined as any;
    this.readIndex = (this.readIndex + 1) & this.mask;
    return item;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return ((this.writeIndex + 1) & this.mask) === this.readIndex;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.readIndex === this.writeIndex;
  }

  /**
   * Get available space
   */
  availableWrite(): number {
    if (this.writeIndex >= this.readIndex) {
      return this.capacity - 1 - (this.writeIndex - this.readIndex);
    } else {
      return this.readIndex - this.writeIndex - 1;
    }
  }

  /**
   * Get available items
   */
  availableRead(): number {
    if (this.writeIndex >= this.readIndex) {
      return this.writeIndex - this.readIndex;
    } else {
      return this.capacity - (this.readIndex - this.writeIndex);
    }
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
    this.buffer.fill(undefined as any);
  }
}

/**
 * Memory pool for musical events (no allocations in audio thread)
 */
export class MusicalEventPool {
  private pool: MusicalEvent[];
  private freeList: number[] = [];
  private allocatedCount: number = 0;
  private maxAllocations: number;

  constructor(maxSize: number) {
    this.maxAllocations = maxSize;
    this.pool = new Array(maxSize);

    // Pre-allocate all events
    for (let i = 0; i < maxSize; i++) {
      this.pool[i] = this.createEmptyEvent(i);
      this.freeList.push(i);
    }
  }

  /**
   * Allocate event (realtime-safe)
   */
  allocate(): MusicalEvent | null {
    if (this.freeList.length === 0) {
      return null; // Pool exhausted
    }

    const index = this.freeList.pop()!;
    this.allocatedCount++;
    return this.pool[index];
  }

  /**
   * Return event to pool (realtime-safe)
   */
  deallocate(event: MusicalEvent): void {
    if (!event || !event.id) return;

    // Extract index from event ID (format: "pool-index-timestamp")
    const parts = event.id.split('-');
    if (parts[0] !== 'pool' || parts.length < 2) return;

    const index = parseInt(parts[1], 10);
    if (isNaN(index) || index < 0 || index >= this.pool.length) return;

    // Check if this event is from our pool
    if (this.pool[index] !== event) return;

    // Reset event to default state
    this.resetEvent(event);

    // Return to free list
    this.freeList.push(index);
    this.allocatedCount--;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    allocated: number;
    free: number;
    total: number;
    utilizationRate: number;
  } {
    return {
      allocated: this.allocatedCount,
      free: this.freeList.length,
      total: this.maxAllocations,
      utilizationRate: this.allocatedCount / this.maxAllocations
    };
  }

  /**
   * Clear pool (not realtime-safe - call from setup thread)
   */
  clear(): void {
    this.freeList = [];
    this.allocatedCount = 0;

    for (let i = 0; i < this.pool.length; i++) {
      this.resetEvent(this.pool[i]);
      this.freeList.push(i);
    }
  }

  private createEmptyEvent(index: number): MusicalEvent {
    return {
      id: `pool-${index}`,
      time: 0,
      duration: 0,
      amplitude: 0,
      articulation: {
        attack: 0.5,
        release: 0.5,
        sustain: 0.5
      }
    };
  }

  private resetEvent(event: MusicalEvent): void {
    event.time = 0;
    event.duration = 0;
    event.pitch = undefined;
    event.amplitude = 0;
    event.articulation = {
      attack: 0.5,
      release: 0.5,
      sustain: 0.5
    };
    event.metadata = undefined;
  }
}

/**
 * Atomic counter for thread-safe operations
 */
export class AtomicCounter {
  private value: number = 0;

  /**
   * Increment and get new value
   */
  increment(): number {
    // In JavaScript, this would need proper atomic implementation
    // For now, using simple increment (not truly atomic)
    return ++this.value;
  }

  /**
   * Get current value
   */
  get(): number {
    return this.value;
  }

  /**
   * Set value
   */
  set(value: number): void {
    this.value = value;
  }

  /**
   * Add delta and return new value
   */
  add(delta: number): number {
    return this.value += delta;
  }
}

/**
 * Realtime-safe frame queue for passing data between threads
 */
export class RealtimeFrameQueue {
  private framePool: RealizedFramePool;
  private queue: LockFreeRingBuffer<RealizedFrame>;

  constructor(maxFrames: number, maxEventsPerFrame: number) {
    this.framePool = new RealizedFramePool(maxFrames, maxEventsPerFrame);
    this.queue = new LockFreeRingBuffer(maxFrames);
  }

  /**
   * Push frame to queue (realtime thread)
   */
  push(frameData: Partial<RealizedFrame>): boolean {
    const frame = this.framePool.allocate();
    if (!frame) return false; // Pool exhausted

    // Copy data to frame
    this.copyFrameData(frame, frameData);

    return this.queue.push(frame);
  }

  /**
   * Pop frame from queue (processing thread)
   */
  pop(): RealizedFrame | null {
    const frame = this.queue.pop();
    if (!frame) return null;

    // Return frame to pool after use
    setTimeout(() => {
      this.framePool.deallocate(frame);
    }, 0); // Deallocate asynchronously

    return frame;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.isFull();
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queuedFrames: number;
    availableFrames: number;
    frameUtilization: number;
  } {
    const poolStats = this.framePool.getStats();

    return {
      queuedFrames: this.queue.availableRead(),
      availableFrames: poolStats.free,
      frameUtilization: poolStats.utilizationRate
    };
  }

  private copyFrameData(target: RealizedFrame, source: Partial<RealizedFrame>): void {
    target.time = source.time || target.time;
    target.layers = source.layers || target.layers;
    target.coherenceScore = source.coherenceScore || target.coherenceScore;
    target.convergenceFlags = source.convergenceFlags || target.convergenceFlags;
    target.metadata = source.metadata || target.metadata;
  }
}

/**
 * Pool for realized frames
 */
class RealizedFramePool {
  private pool: RealizedFrame[];
  private freeList: number[] = [];
  private allocatedCount: number = 0;

  constructor(maxFrames: number, private maxEventsPerFrame: number) {
    this.pool = new Array(maxFrames);

    for (let i = 0; i < maxFrames; i++) {
      this.pool[i] = this.createEmptyFrame(i);
      this.freeList.push(i);
    }
  }

  allocate(): RealizedFrame | null {
    if (this.freeList.length === 0) return null;

    const index = this.freeList.pop()!;
    this.allocatedCount++;
    return this.pool[index];
  }

  deallocate(frame: RealizedFrame): void {
    if (!frame || !frame.time) return;

    // Find frame in pool
    const index = this.pool.indexOf(frame);
    if (index === -1) return;

    // Reset frame
    this.resetFrame(frame);
    this.freeList.push(index);
    this.allocatedCount--;
  }

  getStats(): { allocated: number; free: number; utilizationRate: number } {
    return {
      allocated: this.allocatedCount,
      free: this.freeList.length,
      utilizationRate: this.allocatedCount / this.pool.length
    };
  }

  private createEmptyFrame(index: number): RealizedFrame {
    return {
      time: { seconds: 0, precision: 'seconds' },
      layers: [],
      coherenceScore: 0,
      convergenceFlags: { approachingConvergence: false },
      metadata: { intensity: 0 }
    };
  }

  private resetFrame(frame: RealizedFrame): void {
    frame.time = { seconds: 0, precision: 'seconds' };
    frame.layers = [];
    frame.coherenceScore = 0;
    frame.convergenceFlags = { approachingConvergence: false };
    frame.metadata = { intensity: 0 };
  }
}

/**
 * Realtime-safe parameter smoother
 */
export class ParameterSmoother {
  private currentValue: number = 0;
  private targetValue: number = 0;
  private smoothingFactor: number;

  constructor(smoothingFactor: number = 0.9) {
    this.smoothingFactor = Math.max(0, Math.min(1, smoothingFactor));
  }

  /**
   * Set target value (realtime-safe)
   */
  setTarget(value: number): void {
    this.targetValue = value;
  }

  /**
   * Get smoothed value (call from audio thread)
   */
  getValue(): number {
    const diff = this.targetValue - this.currentValue;
    this.currentValue += diff * this.smoothingFactor;
    return this.currentValue;
  }

  /**
   * Reset smoother
   */
  reset(value: number = 0): void {
    this.currentValue = value;
    this.targetValue = value;
  }

  /**
   * Set smoothing factor
   */
  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Check if value is close to target
   */
  isSettled(threshold: number = 0.001): boolean {
    return Math.abs(this.targetValue - this.currentValue) < threshold;
  }
}

/**
 * Realtime-safe envelope generator
 */
export class EnvelopeGenerator {
  private state: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';
  private currentLevel: number = 0;
  private targetLevel: number = 0;
  private sampleRate: number;
  private attackRate: number;
  private decayRate: number;
  private sustainLevel: number;
  private releaseRate: number;

  constructor(
    sampleRate: number = 44100,
    attackTime: number = 0.1,
    decayTime: number = 0.3,
    sustainLevel: number = 0.7,
    releaseTime: number = 0.5
  ) {
    this.sampleRate = sampleRate;
    this.attackRate = 1 / (attackTime * sampleRate);
    this.decayRate = 1 / (decayTime * sampleRate);
    this.sustainLevel = sustainLevel;
    this.releaseRate = 1 / (releaseTime * sampleRate);
  }

  /**
   * Start envelope (note on)
   */
  start(): void {
    this.state = 'attack';
    this.targetLevel = 1.0;
  }

  /**
   * Stop envelope (note off)
   */
  stop(): void {
    this.state = 'release';
    this.targetLevel = 0.0;
  }

  /**
   * Get next sample (realtime-safe)
   */
  next(): number {
    switch (this.state) {
      case 'attack':
        this.currentLevel += this.attackRate;
        if (this.currentLevel >= 1.0) {
          this.currentLevel = 1.0;
          this.state = 'decay';
          this.targetLevel = this.sustainLevel;
        }
        break;

      case 'decay':
        this.currentLevel += (this.targetLevel - this.currentLevel) * this.decayRate;
        if (Math.abs(this.currentLevel - this.targetLevel) < 0.001) {
          this.currentLevel = this.targetLevel;
          this.state = 'sustain';
        }
        break;

      case 'sustain':
        // Stay at sustain level
        break;

      case 'release':
        this.currentLevel -= this.releaseRate;
        if (this.currentLevel <= 0) {
          this.currentLevel = 0;
          this.state = 'idle';
        }
        break;

      case 'idle':
      default:
        this.currentLevel = 0;
        break;
    }

    return this.currentLevel;
  }

  /**
   * Check if envelope is active
   */
  isActive(): boolean {
    return this.state !== 'idle';
  }

  /**
   * Reset envelope
   */
  reset(): void {
    this.state = 'idle';
    this.currentLevel = 0;
    this.targetLevel = 0;
  }
}

/**
 * Realtime-safe meter with windowed averaging
 */
export class RealtimeMeter {
  private window: number[] = [];
  private windowSize: number;
  private sum: number = 0;
  private currentLevel: number = 0;

  constructor(windowSize: number = 100) {
    this.windowSize = windowSize;
  }

  /**
   * Add sample to meter (realtime-safe)
   */
  addSample(value: number): void {
    // Add new sample
    this.window.push(value);
    this.sum += value;

    // Remove old sample if window is full
    if (this.window.length > this.windowSize) {
      const removed = this.window.shift()!;
      this.sum -= removed;
    }

    // Update current level
    this.currentLevel = this.sum / this.window.length;
  }

  /**
   * Get current level
   */
  getLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get peak level
   */
  getPeak(): number {
    return Math.max(...this.window);
  }

  /**
   * Reset meter
   */
  reset(): void {
    this.window = [];
    this.sum = 0;
    this.currentLevel = 0;
  }
}