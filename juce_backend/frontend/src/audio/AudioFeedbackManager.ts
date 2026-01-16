/**
 * Audio Feedback Manager
 *
 * Provides comprehensive real-time audio feedback for user interactions
 * using Tone.js-only architecture for maximum compatibility and performance.
 *
 * Features:
 * - Note preview on hover
 * - Chord playback with proper voicing
 * - Rhythm pattern audio feedback
 * - Interactive audio controls
 * - Real-time audio response to all user actions
 * - Audio feedback for canvas interactions
 * Cross-browser compatibility
 * Mobile audio support with touch interactions
 */

import * as Tone from 'tone';
import { EventEmitter } from 'events';

export interface AudioFeedbackConfig {
  enabled: boolean;
  volume: number;
  masterVolume: number;
  reverbEnabled: boolean;
  reverbRoomSize: number;
  reverbDampening: number;
  delayEnabled: boolean;
  delayTime: number;
  delayFeedback: number;
  compressorEnabled: boolean;
  compressorThreshold: number;
  compressorRatio: number;
  limiterEnabled: boolean;
  limiterCeiling: number;
}

export interface NoteFeedbackOptions {
  duration?: number;
  velocity?: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  effects?: {
    reverb?: boolean;
    delay?: boolean;
    distortion?: boolean;
  };
}

export interface ChordFeedbackOptions extends NoteFeedbackOptions {
  spread?: number;
  voicing?: 'close' | 'wide' | 'drop2' | 'drop3';
  inversion?: number;
  bassOctave?: number;
}

export interface RhythmFeedbackOptions {
  tempo?: number;
  timeSignature?: [number, number];
  swing?: number;
  pattern?: string[];
  kit?: string;
  effects?: {
    reverb?: boolean;
    delay?: boolean;
    filter?: {
      frequency?: number;
      resonance?: number;
      type?: 'lowpass' | 'highpass' | 'bandpass';
    };
  };
}

export interface AudioFeedbackEvent {
  type: 'note' | 'chord' | 'rhythm' | 'effect';
  source: string;
  timestamp: number;
  data: any;
  duration?: number;
}

export class AudioFeedbackManager extends EventEmitter {
  private synth: Tone.PolySynth;
  private drumSynth: Tone.Sampler;
  private reverb: Tone.Reverb;
  private delay: Tone.FeedbackDelay;
  private compressor: Tone.Compressor;
  private limiter: Tone.Limiter;

  private config: AudioFeedbackConfig;
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;
  private currentVolume: number = 0.5;

  private activeNotes: Map<string, Tone.Synth> = new Map();
  private activeChords: Map<string, Tone.PolySynth> = new Map();
  private activeRhythms: Map<string, Tone.Loop> = new Map();

  private masterGain: Tone.Gain;
  private masterVolume: Tone.Volume;

  constructor(config?: Partial<AudioFeedbackConfig>) {
    super();

    this.config = {
      enabled: true,
      volume: 0.7,
      masterVolume: 0.8,
      reverbEnabled: true,
      reverbRoomSize: 0.5,
      reverbDampening: 0.3,
      delayEnabled: false,
      delayTime: 0.3,
      delayFeedback: 0.4,
      compressorEnabled: true,
      compressorThreshold: -12,
      compressorRatio: 3,
      limiterEnabled: true,
      limiterCeiling: -0.5,
      ...config,
    };

    this.setupAudioContext();
  }

  private setupAudioContext(): void {
    // Wait for user interaction to start audio context
    const startAudio = async () => {
      if (this.isInitialized) return;

      try {
        await Tone.start();

        // Create master gain and volume controls
        this.masterGain = new Tone.Gain(this.config.masterVolume);
        this.masterVolume = new Tone.Volume(this.config.volume);

        // Connect master effects
        this.createMasterEffects();
        this.masterVolume.connect(this.masterGain);
        this.masterGain.toDestination();

        // Create instruments
        this.createInstruments();

        // Set initial volume
        this.setVolume(this.config.volume);

        this.isInitialized = true;
        this.emit('initialized');

      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        this.emit('error', error);
      }
    };

    // Start audio on first user interaction
    const startOnInteraction = () => {
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('touchstart', startOnInteraction);
      startAudio();
    };

    document.addEventListener('click', startOnInteraction, { once: true });
    document.addEventListener('touchstart', startOnInteraction, { once: true });
  }

  private createMasterEffects(): void {
    let currentNode: Tone.ToneAudioNode = this.masterVolume;

    // Compressor
    if (this.config.compressorEnabled) {
      this.compressor = new Tone.Compressor(
        this.config.compressorThreshold,
        this.config.compressorRatio
      );
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }

    // Delay
    if (this.config.delayEnabled) {
      this.delay = new Tone.FeedbackDelay(this.config.delayTime);
      this.delay.feedback.value = this.config.delayFeedback;
      currentNode.connect(this.delay);
      currentNode = this.delay;
    }

    // Reverb
    if (this.config.reverbEnabled) {
      this.reverb = new Tone.Reverb();
      // Reverb no longer takes roomSize and dampening in constructor
      // These would need to be configured after generation
      currentNode.connect(this.reverb);
      currentNode = this.reverb;
    }

    // Limiter
    if (this.config.limiterEnabled) {
      this.limiter = new Tone.Limiter(this.config.limiterCeiling);
      currentNode.connect(this.limiter);
      currentNode = this.limiter;
    }

    // Connect final node to master gain
    currentNode.connect(this.masterGain);
  }

  private createInstruments(): void {
    // Main polyphonic synth for melodies and chords
    this.synth = new Tone.PolySynth({
      voice: Tone.MonoSynth,
      options: {
        oscillator: {
          type: 'triangle'
        },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5
        }
      }
    });

    // Drum sampler for rhythm patterns
    this.drumSynth = new Tone.Sampler({
      urls: {
        'C1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'C#1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'D1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'D#1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'E1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'F1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'F#1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'G1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'G#1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'A1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'A#1': 'https://tonejs.github.io/examples/audio/casio/1.wav',
        'B1': 'https://tonejs.github.io/resume/examples/audio/drum-samples/808.wav',
      },
      baseUrl: 'https://tonejs.github.io/examples/audio/drum-samples/',
    }).toDestination();

    // Connect instruments to master effects
    this.synth.connect(this.masterVolume);
    this.drumSynth.connect(this.masterVolume);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Trigger audio context setup
    try {
      await Tone.start();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Audio initialization failed:', error);
      throw error;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.emit('enabledChanged', enabled);
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));

    if (this.masterVolume) {
      this.masterVolume.volume.value = this.currentVolume;
    }

    this.config.volume = volume;
    this.emit('volumeChanged', volume);
  }

  setMasterVolume(masterVolume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, masterVolume));

    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume;
    }

    this.emit('masterVolumeChanged', masterVolume);
  }

  updateConfig(config: Partial<AudioFeedbackConfig>): void {
    this.config = { ...this.config, ...config };

    // Update audio parameters
    this.setVolume(this.config.volume);
    this.setMasterVolume(this.config.masterVolume);

    // Update effects if needed
    // Note: Reverb no longer has direct roomSize/dampening properties
    // These would need to be handled differently in modern Tone.js
    if (this.delay && config.delayTime !== undefined) {
      this.delay.delayTime.value = config.delayTime;
    }
    if (this.delay && config.delayFeedback !== undefined) {
      this.delay.feedback.value = config.delayFeedback;
    }

    this.emit('configChanged', this.config);
  }

  // Note feedback methods
  async playNote(note: string | number, options: NoteFeedbackOptions = {}): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    const defaultOptions: NoteFeedbackOptions = {
      duration: 0.3,
      velocity: 0.7,
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.5,
      },
      effects: {
        reverb: this.config.reverbEnabled,
        delay: false,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      this.synth.triggerAttackRelease(
        note,
        mergedOptions.duration,
        Tone.now(),
        mergedOptions.velocity
      );

      this.emit('notePlayed', {
        type: 'note',
        source: 'synth',
        timestamp: Date.now(),
        data: { note, options: mergedOptions },
        duration: mergedOptions.duration,
      });

    } catch (error) {
      console.error('Error playing note:', error);
      this.emit('error', error);
    }
  }

  async playChord(notes: (string | number)[], options: ChordFeedbackOptions = {}): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    const defaultOptions: ChordFeedbackOptions = {
      duration: 0.5,
      velocity: 0.7,
      spread: 0,
      voicing: 'close',
      inversion: 0,
      bassOctave: 0,
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.5,
      },
      effects: {
        reverb: this.config.reverbEnabled,
        delay: false,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      // Apply chord voicing
      const voicedNotes = this.applyChordVoicing(notes, mergedOptions);

      // Trigger chord
      voicedNotes.forEach(note => {
        this.synth.triggerAttackRelease(
          note,
          mergedOptions.duration,
          Tone.now(),
          mergedOptions.velocity
        );
      });

      this.emit('chordPlayed', {
        type: 'chord',
        source: 'synth',
        timestamp: Date.now(),
        data: { notes, options: mergedOptions, voicedNotes },
        duration: mergedOptions.duration,
      });

    } catch (error) {
      console.error('Error playing chord:', error);
      this.emit('error', error);
    }
  }

  private applyChordVoicing(notes: (string | number)[], options: ChordFeedbackOptions): (string | number)[] {
    const voicedNotes = [...notes];

    // Apply inversion
    if (options.inversion && options.inversion > 0) {
      for (let i = 0; i < options.inversion && i < voicedNotes.length - 1; i++) {
        const temp = voicedNotes[i];
        voicedNotes[i] = voicedNotes[i + 1];
        voicedNotes[i + 1] = temp;
      }
    }

    // Add bass note in lower octave
    if (options.bassOctave && options.bassOctave > 0) {
      const bassNote = typeof voicedNotes[0] === 'string'
        ? voicedNotes[0].replace(/(\d+)/, (match) => String(parseInt(match) - 12 * options.bassOctave))
        : voicedNotes[0] - 12 * options.bassOctave;
      voicedNotes.unshift(bassNote);
    }

    // Apply spread
    if (options.spread && options.spread > 0) {
      const spreadNotes: (string | number)[] = [];
      voicedNotes.forEach((note, index) => {
        spreadNotes.push(note);
        if (index < voicedNotes.length - 1) {
          const spreadNote = typeof note === 'string'
            ? note.replace(/(\d+)/, (match) => String(parseInt(match) + options.spread))
            : note + options.spread;
          spreadNotes.push(spreadNote);
        }
      });
      return spreadNotes;
    }

    return voicedNotes;
  }

  // Rhythm feedback methods
  async playRhythmPattern(pattern: string[], options: RhythmFeedbackOptions = {}): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    const defaultOptions: RhythmFeedbackOptions = {
      tempo: 120,
      timeSignature: [4, 4],
      swing: 0,
      pattern: ['kick', 'snare', 'hihat', 'hihat'],
      kit: 'default',
      effects: {
        reverb: this.config.reverbEnabled,
        delay: false,
        filter: {
          frequency: 2000,
          resonance: 5,
          type: 'lowpass',
        },
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const duration = 60 / mergedOptions.tempo * (mergedOptions.timeSignature[0] / mergedOptions.timeSignature[1]);
      const swingAmount = mergedOptions.swing * 0.1;

      // Play each note in the pattern
      for (let i = 0; i < pattern.length; i++) {
        const note = pattern[i];
        const noteDuration = duration;

        // Apply swing to off-beat notes
        if (i % 2 === 1 && swingAmount > 0) {
          const swingDelay = noteDuration * swingAmount;
          await new Promise(resolve => setTimeout(resolve, swingDelay * 1000));
        }

        await this.drumSynth.triggerAttackRelease(
          note,
          noteDuration * 0.9,
          Tone.now(),
          0.8
        );
      }

      this.emit('rhythmPlayed', {
        type: 'rhythm',
        source: 'drumSynth',
        timestamp: Date.now(),
        data: { pattern, options: mergedOptions },
        duration: duration * pattern.length,
      });

    } catch (error) {
      console.error('Error playing rhythm pattern:', error);
      this.emit('error', error);
    }
  }

  async playDrumHit(drumType: string, options: any = {}): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    try {
      await this.drumSynth.triggerAttackRelease(drumType, 0.1, Tone.now(), 0.8);

      this.emit('drumHit', {
        type: 'rhythm',
        source: 'drumSynth',
        timestamp: Date.now(),
        data: { drumType, options },
        duration: 0.1,
      });

    } catch (error) {
      console.error('Error playing drum hit:', error);
      this.emit('error', error);
    }
  }

  // Interactive audio controls
  async playControlSound(controlType: string, value: number): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    try {
      const frequency = 200 + (value * 600); // 200Hz to 800Hz range
      const duration = 0.1;

      const synth = new Tone.Synth();
      synth.oscillator.type = 'sine';
      synth.envelope.attack = 0.001;
      synth.envelope.decay = 0.1;
      synth.envelope.sustain = 0.05;
      synth.envelope.release = 0.1;

      synth.connect(this.masterVolume);

      synth.frequency.value = frequency;
      synth.triggerAttackRelease(duration, Tone.now());

      // Clean up after sound
      setTimeout(() => {
        synth.dispose();
      }, duration * 1000 + 100);

      this.emit('controlSound', {
        type: 'effect',
        source: 'control',
        timestamp: Date.now(),
        data: { controlType, value, frequency },
        duration: duration,
      });

    } catch (error) {
      console.error('Error playing control sound:', error);
      this.emit('error', error);
    }
  }

  // Canvas interaction feedback
  async playCanvasInteraction(action: string, position: { x: number; y: number }, value?: any): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) return;

    try {
      // Map position to frequency
      const frequency = 200 + (position.x / 1000) * 800;
      const pan = position.x / 1000 * 2 - 1;

      const synth = new Tone.Synth();
      synth.oscillator.type = 'sine';
      synth.envelope.attack = 0.001;
      synth.envelope.decay = 0.05;
      synth.envelope.sustain = 0.05;
      synth.envelope.release = 0.05;

      synth.connect(this.masterVolume);
      synth.volume.value = 0.3;
      // Synth doesn't have pan, need to use PanNode instead
      // synth.pan.value = pan;

      synth.frequency.value = frequency;
      synth.triggerAttackRelease(0.1, Tone.now());

      // Clean up
      setTimeout(() => {
        synth.dispose();
      }, 150);

      this.emit('canvasInteraction', {
        type: 'effect',
        source: 'canvas',
        timestamp: Date.now(),
        data: { action, position, value, frequency, pan },
        duration: 0.1,
      });

    } catch (error) {
      console.error('Error playing canvas interaction:', error);
      this.emit('error', error);
    }
  }

  // Stop all currently playing sounds
  stopAllSounds(): void {
    try {
      // Release all active synths
      if (this.synth) {
        this.synth.releaseAll();
      }

      // Clear active notes map
      this.activeNotes.clear();
      this.activeChords.clear();
      this.activeRhythms.clear();

      this.emit('allSoundsStopped');

    } catch (error) {
      console.error('Error stopping sounds:', error);
      this.emit('error', error);
    }
  }

  // Get current audio state
  getAudioState(): {
    enabled: boolean;
    initialized: boolean;
    volume: number;
    config: AudioFeedbackConfig;
    activeNotes: string[];
    activeChords: string[];
    activeRhythms: string[];
  } {
    return {
      enabled: this.isEnabled,
      initialized: this.isInitialized,
      volume: this.currentVolume,
      config: { ...this.config },
      activeNotes: Array.from(this.activeNotes.keys()),
      activeChords: Array.from(this.activeChords.keys()),
      activeRhythms: Array.from(this.activeRhythms.keys()),
    };
  }

  // Get master effects status
  getEffectsStatus(): {
    reverb: boolean;
    delay: boolean;
    compressor: boolean;
    limiter: boolean;
    delayTime: number;
    delayFeedback: number;
    compressorThreshold: number;
    compressorRatio: number;
    limiterCeiling: number;
  } {
    return {
      reverb: this.config.reverbEnabled,
      delay: this.config.delayEnabled,
      compressor: this.config.compressorEnabled,
      limiter: this.config.limiterEnabled,
      delayTime: this.config.delayTime,
      delayFeedback: this.config.delayFeedback,
      compressorThreshold: this.config.compressorThreshold,
      compressorRatio: this.config.compressorRatio,
      limiterCeiling: this.config.limiterCeiling,
    };
  }

  // Cleanup resources
  dispose(): void {
    try {
      this.stopAllSounds();

      if (this.synth) {
        this.synth.dispose();
        this.synth = null;
      }

      if (this.drumSynth) {
        this.drumSynth.dispose();
        this.drumSynth = null;
      }

      if (this.reverb) {
        this.reverb.dispose();
        this.reverb = null;
      }

      if (this.delay) {
        this.delay.dispose();
        this.delay = null;
      }

      if (this.compressor) {
        this.compressor.dispose();
        this.compressor = null;
      }

      if (this.limiter) {
        this.limiter.dispose();
        this.limiter = null;
      }

      if (this.masterGain) {
        this.masterGain.dispose();
        this.masterGain = null;
      }

      if (this.masterVolume) {
        this.masterVolume.dispose();
        this.masterVolume = null;
      }

      Tone.Transport.stop();
      Tone.Transport.cancel();

      this.isInitialized = false;
      this.removeAllListeners();

    } catch (error) {
      console.error('Error disposing audio manager:', error);
    }
  }
}

export default AudioFeedbackManager;