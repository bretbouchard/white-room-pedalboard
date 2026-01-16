/**
 * TransportManager.ts
 *
 * Transport state and controls for White Room audio playback.
 * Manages play/pause/stop, position seeking, tempo, and loop controls.
 *
 * Architecture:
 * - TypeScript SDK layer that communicates with JUCE backend via FFI
 * - Event-driven architecture with EventTarget for state changes
 * - Thread-safe atomic state reads from audio engine
 */

/**
 * Transport state representation
 */
export interface TransportState {
  /** Currently playing */
  isPlaying: boolean;
  /** Transport stopped (position reset) */
  isStopped: boolean;
  /** Transport paused (position maintained) */
  isPaused: boolean;
  /** Current position in beats */
  position: number;
  /** Tempo in BPM */
  tempo: number;
  /** Time signature */
  timeSignature: {
    /** Beats per measure */
    numerator: number;
    /** Beat unit (4 = quarter note, 8 = eighth note) */
    denominator: number;
  };
  /** Loop enabled */
  loopEnabled: boolean;
  /** Loop start position in beats */
  loopStart: number;
  /** Loop end position in beats */
  loopEnd: number;
}

/**
 * Transport state change event
 */
export interface TransportStateEvent extends Event {
  /** Previous state */
  previousState: TransportState;
  /** Current state */
  currentState: TransportState;
  /** What changed */
  changes: (keyof TransportState)[];
}

/**
 * Transport event types
 */
export type TransportEventType =
  | 'play'
  | 'pause'
  | 'stop'
  | 'seek'
  | 'tempo'
  | 'loop'
  | 'timeSignature'
  | 'state';

/**
 * Manages playback transport for White Room
 *
 * Features:
 * - Play/pause/stop controls
 * - Sample-accurate position seeking
 * - Tempo adjustment with validation
 * - Loop range control
 * - Time signature management
 * - Event-driven state updates
 * - Thread-safe atomic reads
 *
 * @example
 * ```typescript
 * const transport = new TransportManager(audioEngine);
 *
 * // Play/pause
 * transport.play();
 * transport.pause();
 *
 * // Seek to position
 * transport.setPosition(16.5); // beat 16.5
 *
 * // Adjust tempo
 * transport.setTempo(140.0); // 140 BPM
 *
 * // Enable looping
 * transport.setLoopEnabled(true);
 * transport.setLoopRange(0, 32);
 *
 * // Listen to state changes
 * transport.addEventListener('play', (event) => {
 *   console.log('Started playing');
 * });
 * ```
 */
export class TransportManager extends EventTarget {
  private state: TransportState;
  private audioEngine: any; // SchillingerEngine reference
  private stateUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private readonly STATE_UPDATE_INTERVAL = 16; // ~60fps

  // Timer functions (injected for testability)
  private timerSetInterval: (handler: () => void, timeout: number) => ReturnType<typeof setInterval>;
  private timerClearInterval: (handle: ReturnType<typeof setInterval>) => void;

  /**
   * Creates a new TransportManager
   * @param audioEngine SchillingerEngine instance
   * @param timerFunctions Optional timer functions for testing
   */
  constructor(audioEngine: any, timerFunctions?: {
    setInterval: (handler: () => void, timeout: number) => ReturnType<typeof setInterval>;
    clearInterval: (handle: ReturnType<typeof setInterval>) => void;
  }) {
    super();

    // Use injected timers or global timers
    this.timerSetInterval = timerFunctions?.setInterval || setInterval.bind(global);
    this.timerClearInterval = timerFunctions?.clearInterval || clearInterval.bind(global);

    this.audioEngine = audioEngine;
    this.state = {
      isPlaying: false,
      isStopped: true,
      isPaused: false,
      position: 0,
      tempo: 120.0,
      timeSignature: { numerator: 4, denominator: 4 },
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 32
    };

    // Start polling for state updates from audio engine
    this.startStateUpdates();
  }

  // ==========================================================================
  // Playback Controls
  // ==========================================================================

  /**
   * Start playback
   * @throws Error if audio engine not available
   */
  play(): void {
    if (!this.audioEngine) {
      throw new Error('Audio engine not available');
    }

    // Update local state
    const previousState = { ...this.state };
    this.state.isPlaying = true;
    this.state.isStopped = false;
    this.state.isPaused = false;

    // Send to audio engine via FFI
    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setTransportState('playing');
      console.log('[TransportManager] Play');
    } catch (error) {
      console.error('[TransportManager] Failed to play:', error);
      this.state = previousState; // Revert
      throw error;
    }

    // Dispatch event
    this.dispatchEvent(new Event('play'));
    this.notifyStateChange(previousState);
  }

  /**
   * Pause playback (maintains position)
   * @throws Error if audio engine not available
   */
  pause(): void {
    if (!this.audioEngine) {
      throw new Error('Audio engine not available');
    }

    const previousState = { ...this.state };
    this.state.isPlaying = false;
    this.state.isStopped = false;
    this.state.isPaused = true;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setTransportState('paused');
      console.log('[TransportManager] Pause');
    } catch (error) {
      console.error('[TransportManager] Failed to pause:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('pause'));
    this.notifyStateChange(previousState);
  }

  /**
   * Stop playback and reset position
   * @throws Error if audio engine not available
   */
  stop(): void {
    if (!this.audioEngine) {
      throw new Error('Audio engine not available');
    }

    const previousState = { ...this.state };
    this.state.isPlaying = false;
    this.state.isStopped = true;
    this.state.isPaused = false;
    this.state.position = 0;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setTransportState('stopped');
      console.log('[TransportManager] Stop');
    } catch (error) {
      console.error('[TransportManager] Failed to stop:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('stop'));
    this.notifyStateChange(previousState);
  }

  /**
   * Toggle play/pause
   * @returns New playing state
   */
  togglePlay(): boolean {
    if (this.state.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  // ==========================================================================
  // Position Controls
  // ==========================================================================

  /**
   * Set playback position
   * @param position Position in beats
   * @throws Error if position is negative
   */
  setPosition(position: number): void {
    if (position < 0) {
      throw new Error(`Position cannot be negative: ${position}`);
    }

    const previousState = { ...this.state };
    this.state.position = position;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setPosition(position);
      console.log(`[TransportManager] Set position: ${position}`);
    } catch (error) {
      console.error('[TransportManager] Failed to set position:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('seek'));
    this.notifyStateChange(previousState, ['position']);
  }

  /**
   * Seek to position (alias for setPosition)
   * @param position Position in beats
   */
  seekTo(position: number): void {
    this.setPosition(position);
  }

  /**
   * Move position by delta
   * @param delta Beats to move (positive = forward, negative = backward)
   */
  moveBy(delta: number): void {
    const newPosition = this.state.position + delta;
    this.setPosition(Math.max(0, newPosition));
  }

  // ==========================================================================
  // Tempo Controls
  // ==========================================================================

  /**
   * Set tempo
   * @param tempo Tempo in BPM (must be > 0)
   * @throws Error if tempo is invalid
   */
  setTempo(tempo: number): void {
    if (tempo <= 0) {
      throw new Error(`Tempo must be positive: ${tempo}`);
    }

    if (tempo > 999) {
      throw new Error(`Tempo too high: ${tempo} (max 999 BPM)`);
    }

    const previousState = { ...this.state };
    this.state.tempo = tempo;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setTempo(tempo);
      console.log(`[TransportManager] Set tempo: ${tempo} BPM`);
    } catch (error) {
      console.error('[TransportManager] Failed to set tempo:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('tempo'));
    this.notifyStateChange(previousState, ['tempo']);
  }

  /**
   * Adjust tempo by delta
   * @param delta BPM to adjust (positive = faster, negative = slower)
   */
  adjustTempo(delta: number): void {
    const newTempo = this.state.tempo + delta;
    this.setTempo(Math.max(1, Math.min(999, newTempo)));
  }

  /**
   * Get current tempo
   * @returns Tempo in BPM
   */
  getTempo(): number {
    return this.state.tempo;
  }

  // ==========================================================================
  // Loop Controls
  // ==========================================================================

  /**
   * Set loop enabled state
   * @param enabled Whether looping is enabled
   */
  setLoopEnabled(enabled: boolean): void {
    const previousState = { ...this.state };
    this.state.loopEnabled = enabled;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setLoopEnabled(enabled);
      console.log(`[TransportManager] Loop ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[TransportManager] Failed to set loop:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('loop'));
    this.notifyStateChange(previousState, ['loopEnabled']);
  }

  /**
   * Set loop range
   * @param start Loop start position in beats
   * @param end Loop end position in beats
   * @throws Error if range is invalid
   */
  setLoopRange(start: number, end: number): void {
    if (start < 0 || end < 0) {
      throw new Error(`Loop positions cannot be negative: ${start}, ${end}`);
    }

    if (start >= end) {
      throw new Error(`Loop start must be before end: ${start} >= ${end}`);
    }

    const previousState = { ...this.state };
    this.state.loopStart = start;
    this.state.loopEnd = end;

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setLoopRange(start, end);
      console.log(`[TransportManager] Set loop range: ${start} - ${end}`);
    } catch (error) {
      console.error('[TransportManager] Failed to set loop range:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('loop'));
    this.notifyStateChange(previousState, ['loopStart', 'loopEnd']);
  }

  /**
   * Toggle loop enabled state
   * @returns New loop state
   */
  toggleLoop(): boolean {
    this.setLoopEnabled(!this.state.loopEnabled);
    return this.state.loopEnabled;
  }

  // ==========================================================================
  // Time Signature
  // ==========================================================================

  /**
   * Set time signature
   * @param numerator Beats per measure (e.g., 4, 3, 6)
   * @param denominator Beat unit (e.g., 4 = quarter note, 8 = eighth note)
   * @throws Error if time signature is invalid
   */
  setTimeSignature(numerator: number, denominator: number): void {
    if (numerator < 1 || numerator > 32) {
      throw new Error(`Invalid numerator: ${numerator} (must be 1-32)`);
    }

    if (denominator !== 1 && denominator !== 2 && denominator !== 4 &&
        denominator !== 8 && denominator !== 16 && denominator !== 32) {
      throw new Error(`Invalid denominator: ${denominator} (must be 1, 2, 4, 8, 16, or 32)`);
    }

    const previousState = { ...this.state };
    this.state.timeSignature = { numerator, denominator };

    try {
      // TODO: Call FFI function when available
      // this.audioEngine.setTimeSignature(numerator, denominator);
      console.log(`[TransportManager] Set time signature: ${numerator}/${denominator}`);
    } catch (error) {
      console.error('[TransportManager] Failed to set time signature:', error);
      this.state = previousState;
      throw error;
    }

    this.dispatchEvent(new Event('timeSignature'));
    this.notifyStateChange(previousState, ['timeSignature']);
  }

  // ==========================================================================
  // State Accessors
  // ==========================================================================

  /**
   * Get current transport state
   * @returns Current state
   */
  getState(): TransportState {
    return { ...this.state };
  }

  /**
   * Check if currently playing
   * @returns Playing state
   */
  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * Check if stopped
   * @returns Stopped state
   */
  isStopped(): boolean {
    return this.state.isStopped;
  }

  /**
   * Check if paused
   * @returns Paused state
   */
  isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Get current position
   * @returns Position in beats
   */
  getPosition(): number {
    return this.state.position;
  }

  /**
   * Check if loop is enabled
   * @returns Loop state
   */
  isLoopEnabled(): boolean {
    return this.state.loopEnabled;
  }

  // ==========================================================================
  // Internal Methods
  // ==========================================================================

  /**
   * Start polling for state updates from audio engine
   * @private
   */
  private startStateUpdates(): void {
    this.stateUpdateTimer = this.timerSetInterval(() => {
      this.updateStateFromEngine();
    }, this.STATE_UPDATE_INTERVAL);
  }

  /**
   * Stop polling for state updates
   * @private
   */
  private stopStateUpdates(): void {
    if (this.stateUpdateTimer !== null) {
      this.timerClearInterval(this.stateUpdateTimer);
      this.stateUpdateTimer = null;
    }
  }

  /**
   * Update state from audio engine (atomic read)
   * @private
   */
  private updateStateFromEngine(): void {
    if (!this.audioEngine) {
      return;
    }

    try {
      // TODO: Poll atomic state from audio engine via FFI
      // const perfState = this.audioEngine.getPerformanceState();
      // if (perfState) {
      //   const previousState = { ...this.state };
      //   this.state.position = perfState.position;
      //   this.state.tempo = perfState.tempo;
      //   this.state.isPlaying = perfState.isPlaying;
      //   this.notifyStateChange(previousState);
      // }
    } catch (error) {
      console.error('[TransportManager] Failed to update state:', error);
    }
  }

  /**
   * Notify listeners of state change
   * @param previousState Previous state
   * @param changes What changed (auto-detected if not provided)
   * @private
   */
  private notifyStateChange(
    previousState: TransportState,
    changes?: (keyof TransportState)[]
  ): void {
    // Auto-detect changes if not provided
    if (!changes) {
      changes = Object.keys(this.state) as (keyof TransportState)[];
      changes = changes.filter(key => {
        const prevValue = previousState[key];
        const currValue = this.state[key];
        return JSON.stringify(prevValue) !== JSON.stringify(currValue);
      });
    }

    if (changes.length === 0) {
      return; // No actual changes
    }

    const event = new Event('state') as TransportStateEvent;
    event.previousState = previousState;
    event.currentState = this.getState();
    event.changes = changes;

    this.dispatchEvent(event);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStateUpdates();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default TransportManager;
