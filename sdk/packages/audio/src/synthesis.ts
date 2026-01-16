/**
 * Audio synthesis integration with Schillinger patterns
 */

import {
  RhythmPattern,
  ChordProgression,
  MelodyLine,
  Composition,
  ValidationUtils,
} from "@schillinger-sdk/shared";

export interface SynthesisOptions {
  instrument?: InstrumentType;
  effects?: EffectConfig[];
  volume?: number;
  tempo?: number;
  sampleRate?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface InstrumentConfig {
  type: InstrumentType;
  parameters: Record<string, number>;
}

export interface EffectConfig {
  type: EffectType;
  parameters: Record<string, number>;
  enabled: boolean;
}

export type InstrumentType =
  | "sine"
  | "square"
  | "sawtooth"
  | "triangle"
  | "kick"
  | "snare"
  | "hihat"
  | "cymbal"
  | "piano"
  | "organ"
  | "strings"
  | "brass"
  | "bass"
  | "lead"
  | "pad"
  | "pluck";

export type EffectType =
  | "reverb"
  | "delay"
  | "chorus"
  | "flanger"
  | "distortion"
  | "filter"
  | "compressor"
  | "eq";

export interface AudioExportOptions {
  format: "wav" | "mp3" | "ogg";
  quality?: number;
  normalize?: boolean;
  metadata?: Record<string, string>;
}

export interface PluginInfo {
  id: string;
  name: string;
  type: "instrument" | "effect";
  parameters: Array<{
    name: string;
    type: "number" | "boolean" | "enum";
    min?: number;
    max?: number;
    default: any;
    options?: string[];
  }>;
  presets?: Array<{
    name: string;
    parameters: Record<string, any>;
  }>;
}

/**
 * Advanced audio synthesis engine for Schillinger patterns with plugin support
 */
export class AudioSynthesizer {
  private audioContext: AudioContext;
  private plugins: Map<string, PluginInfo> = new Map();
  // private loadedPlugins: Map<string, any> = new Map();

  constructor(sampleRate: number = 44100) {
    this.audioContext = new AudioContext({ sampleRate });
    this.initializeBuiltInInstruments();
  }

  /**
   * Synthesize rhythm pattern to audio with drum sounds
   */
  async synthesizeRhythm(
    pattern: RhythmPattern,
    options: SynthesisOptions = {},
  ): Promise<AudioBuffer> {
    if (!ValidationUtils.isValidDurations(pattern.durations)) {
      throw new Error("Invalid rhythm pattern");
    }

    const {
      instrument = "kick",
      volume = 0.7,
      tempo = pattern.tempo || 120,
      sampleRate = this.audioContext.sampleRate,
      duration,
      effects = [],
    } = options;

    // Calculate timing
    const beatsPerSecond = tempo / 60;
    const totalBeats = pattern.durations.length;
    const patternDuration = duration || totalBeats / beatsPerSecond;
    const beatDuration = patternDuration / totalBeats;

    // Create audio buffer
    const bufferLength = Math.floor(patternDuration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(
      1,
      bufferLength,
      sampleRate,
    );
    const channelData = audioBuffer.getChannelData(0);

    // Generate rhythm sounds
    let currentTime = 0;
    for (let i = 0; i < pattern.durations.length; i++) {
      const duration = pattern.durations[i];

      if (duration > 0) {
        // Generate drum hit
        const hitBuffer = await this.generateDrumHit(
          instrument as InstrumentType,
          duration,
          sampleRate,
        );

        // Mix into main buffer
        const startSample = Math.floor(currentTime * sampleRate);
        const endSample = Math.min(
          startSample + hitBuffer.length,
          bufferLength,
        );

        for (let j = startSample; j < endSample; j++) {
          const hitIndex = j - startSample;
          if (hitIndex < hitBuffer.length) {
            channelData[j] += hitBuffer[hitIndex] * volume;
          }
        }
      }

      currentTime += beatDuration;
    }

    // Apply effects
    let processedBuffer = audioBuffer;
    for (const effect of effects) {
      processedBuffer = await this.applyEffect(processedBuffer, effect);
    }

    return processedBuffer;
  }

  /**
   * Synthesize chord progression to audio
   */
  async synthesizeHarmony(
    progression: ChordProgression,
    options: SynthesisOptions = {},
  ): Promise<AudioBuffer> {
    if (!ValidationUtils.isValidChordProgression(progression.chords)) {
      throw new Error("Invalid chord progression");
    }

    const {
      instrument = "piano",
      volume = 0.6,
      tempo = 120,
      sampleRate = this.audioContext.sampleRate,
      duration,
      effects = [],
    } = options;

    // Calculate timing
    const beatsPerSecond = tempo / 60;
    // const chordsPerBeat = 1; // Assume one chord per beat
    const chordDuration = duration
      ? duration / progression.chords.length
      : 1 / beatsPerSecond;
    const totalDuration = chordDuration * progression.chords.length;

    // Create audio buffer
    const bufferLength = Math.floor(totalDuration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(
      2,
      bufferLength,
      sampleRate,
    );
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    // Generate chord sounds
    let currentTime = 0;
    for (const chord of progression.chords) {
      const chordNotes = this.parseChord(chord);
      const chordBuffer = await this.generateChord(
        chordNotes,
        chordDuration,
        instrument as InstrumentType,
        sampleRate,
      );

      // Mix into main buffer
      const startSample = Math.floor(currentTime * sampleRate);
      const endSample = Math.min(
        startSample + chordBuffer.length,
        bufferLength,
      );

      for (let i = startSample; i < endSample; i++) {
        const chordIndex = i - startSample;
        if (chordIndex < chordBuffer.length) {
          leftChannel[i] += chordBuffer[chordIndex] * volume;
          rightChannel[i] += chordBuffer[chordIndex] * volume * 0.9; // Slight stereo spread
        }
      }

      currentTime += chordDuration;
    }

    // Apply effects
    let processedBuffer = audioBuffer;
    for (const effect of effects) {
      processedBuffer = await this.applyEffect(processedBuffer, effect);
    }

    return processedBuffer;
  }

  /**
   * Synthesize melody to audio
   */
  async synthesizeMelody(
    melody: MelodyLine,
    options: SynthesisOptions = {},
  ): Promise<AudioBuffer> {
    if (
      !Array.isArray(melody.notes) ||
      melody.notes.some((note) => typeof note !== "number")
    ) {
      throw new Error("Invalid melody notes");
    }

    const {
      instrument = "lead",
      volume = 0.5,
      tempo = 120,
      sampleRate = this.audioContext.sampleRate,
      duration,
      effects = [],
    } = options;

    // Calculate timing
    const beatsPerSecond = tempo / 60;
    const noteDurations = melody.durations || melody.notes.map(() => 1); // Default to quarter notes
    const totalBeats = noteDurations.reduce((sum, dur) => sum + dur, 0);
    const totalDuration = duration || totalBeats / beatsPerSecond;

    // Create audio buffer
    const bufferLength = Math.floor(totalDuration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(
      1,
      bufferLength,
      sampleRate,
    );
    const channelData = audioBuffer.getChannelData(0);

    // Generate melody
    let currentTime = 0;
    for (let i = 0; i < melody.notes.length; i++) {
      const note = melody.notes[i];
      const noteDuration = noteDurations[i] / beatsPerSecond;

      if (note > 0) {
        // Skip rests (note = 0)
        const frequency = this.midiToFrequency(note);
        const noteBuffer = await this.generateNote(
          frequency,
          noteDuration,
          instrument as InstrumentType,
          sampleRate,
        );

        // Mix into main buffer
        const startSample = Math.floor(currentTime * sampleRate);
        const endSample = Math.min(
          startSample + noteBuffer.length,
          bufferLength,
        );

        for (let j = startSample; j < endSample; j++) {
          const noteIndex = j - startSample;
          if (noteIndex < noteBuffer.length) {
            channelData[j] += noteBuffer[noteIndex] * volume;
          }
        }
      }

      currentTime += noteDuration;
    }

    // Apply effects
    let processedBuffer = audioBuffer;
    for (const effect of effects) {
      processedBuffer = await this.applyEffect(processedBuffer, effect);
    }

    return processedBuffer;
  }

  /**
   * Synthesize complete composition
   */
  async synthesizeComposition(
    composition: Composition,
    options: SynthesisOptions = {},
  ): Promise<AudioBuffer> {
    const { sampleRate = this.audioContext.sampleRate, volume = 0.6 } = options;

    // Calculate total duration
    const totalDuration = composition.sections.reduce(
      (sum, section) => sum + section.length,
      0,
    );
    const bufferLength = Math.floor(totalDuration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(
      2,
      bufferLength,
      sampleRate,
    );
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    // Synthesize each section
    let currentPosition = 0;
    for (const section of composition.sections) {
      // Synthesize rhythm
      const rhythmBuffer = await this.synthesizeRhythm(section.rhythm, {
        ...options,
        instrument: "kick",
        volume: volume * 0.8,
        duration: section.length,
      });

      // Synthesize harmony
      const harmonyBuffer = await this.synthesizeHarmony(section.harmony, {
        ...options,
        instrument: "piano",
        volume: volume * 0.6,
        duration: section.length,
      });

      // Synthesize melody if present
      let melodyBuffer: AudioBuffer | null = null;
      if (section.melody) {
        melodyBuffer = await this.synthesizeMelody(section.melody, {
          ...options,
          instrument: "lead",
          volume: volume * 0.7,
          duration: section.length,
        });
      }

      // Mix section into main buffer
      const startSample = Math.floor(currentPosition * sampleRate);
      const sectionLength = Math.floor(section.length * sampleRate);

      for (let i = 0; i < sectionLength; i++) {
        const bufferIndex = startSample + i;
        if (bufferIndex < bufferLength) {
          // Mix rhythm (mono to stereo)
          if (i < rhythmBuffer.getChannelData(0).length) {
            const rhythmSample = rhythmBuffer.getChannelData(0)[i];
            leftChannel[bufferIndex] += rhythmSample;
            rightChannel[bufferIndex] += rhythmSample;
          }

          // Mix harmony (stereo)
          if (i < harmonyBuffer.getChannelData(0).length) {
            leftChannel[bufferIndex] += harmonyBuffer.getChannelData(0)[i];
            rightChannel[bufferIndex] += harmonyBuffer.getChannelData(1)[i];
          }

          // Mix melody (mono to stereo with slight pan)
          if (melodyBuffer && i < melodyBuffer.getChannelData(0).length) {
            const melodySample = melodyBuffer.getChannelData(0)[i];
            leftChannel[bufferIndex] += melodySample * 0.7;
            rightChannel[bufferIndex] += melodySample * 1.0;
          }
        }
      }

      currentPosition += section.length;
    }

    return audioBuffer;
  }

  /**
   * Export audio buffer to file format
   */
  async exportAudio(
    audioBuffer: AudioBuffer,
    options: AudioExportOptions,
  ): Promise<Blob> {
    const { format, normalize = true } = options;

    // Normalize audio if requested
    let processedBuffer = audioBuffer;
    if (normalize) {
      processedBuffer = this.normalizeAudioBuffer(audioBuffer);
    }

    switch (format) {
      case "wav":
        return this.exportWAV(processedBuffer);
      case "mp3":
        return this.exportMP3(); // TODO: Implement MP3 export with encoder library
      case "ogg":
        return this.exportOGG(); // TODO: Implement OGG export with encoder library
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Load audio plugin
   */
  async loadPlugin(/*pluginUrl: string*/): Promise<PluginInfo> {
    try {
      // In a real implementation, this would load actual audio plugins
      // For now, return a mock plugin info
      const pluginInfo: PluginInfo = {
        id: "mock-plugin",
        name: "Mock Plugin",
        type: "instrument",
        parameters: [
          { name: "volume", type: "number", min: 0, max: 1, default: 0.7 },
          { name: "enabled", type: "boolean", default: true },
        ],
        presets: [
          { name: "Default", parameters: { volume: 0.7, enabled: true } },
        ],
      };

      this.plugins.set(pluginInfo.id, pluginInfo);
      return pluginInfo;
    } catch (error) {
      throw new Error(`Failed to load plugin: ${error}`);
    }
  }

  /**
   * Get available plugins
   */
  getAvailablePlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id: string): PluginInfo | undefined {
    return this.plugins.get(id);
  }

  // Private helper methods

  private async generateDrumHit(
    instrument: InstrumentType,
    intensity: number,
    sampleRate: number,
  ): Promise<Float32Array> {
    const duration = 0.1; // 100ms drum hit
    const length = Math.floor(duration * sampleRate);
    // const buffer = new Float32Array(length);

    switch (instrument) {
      case "kick":
        return this.generateKick(length, sampleRate, intensity);
      case "snare":
        return this.generateSnare(length, sampleRate, intensity);
      case "hihat":
        return this.generateHiHat(length, sampleRate, intensity);
      default:
        return this.generateKick(length, sampleRate, intensity);
    }
  }

  private generateKick(
    length: number,
    sampleRate: number,
    intensity: number,
  ): Float32Array {
    const buffer = new Float32Array(length);
    const frequency = 60; // Low frequency for kick

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30); // Quick decay
      const oscillator = Math.sin(2 * Math.PI * frequency * t * (1 - t * 2));
      buffer[i] = oscillator * envelope * intensity;
    }

    return buffer;
  }

  private generateSnare(
    length: number,
    sampleRate: number,
    intensity: number,
  ): Float32Array {
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      const noise = (Math.random() * 2 - 1) * 0.5;
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
      buffer[i] = (noise + tone) * envelope * intensity;
    }

    return buffer;
  }

  private generateHiHat(
    length: number,
    sampleRate: number,
    intensity: number,
  ): Float32Array {
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 50); // Very quick decay
      const noise = Math.random() * 2 - 1;
      buffer[i] = noise * envelope * intensity * 0.3;
    }

    return buffer;
  }

  private async generateNote(
    frequency: number,
    duration: number,
    instrument: InstrumentType,
    sampleRate: number,
  ): Promise<Float32Array> {
    const length = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = this.generateEnvelope(t, duration); // instrument param not used in definition
      const oscillator = this.generateOscillator(t, frequency, instrument);
      buffer[i] = oscillator * envelope;
    }

    return buffer;
  }

  private async generateChord(
    notes: number[],
    duration: number,
    instrument: InstrumentType,
    sampleRate: number,
  ): Promise<Float32Array> {
    const length = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(length);

    // Generate each note and mix them
    for (const note of notes) {
      const frequency = this.midiToFrequency(note);
      const noteBuffer = await this.generateNote(
        frequency,
        duration,
        instrument,
        sampleRate,
      );

      for (let i = 0; i < length; i++) {
        if (i < noteBuffer.length) {
          buffer[i] += noteBuffer[i] / notes.length; // Normalize by number of notes
        }
      }
    }

    return buffer;
  }

  private generateOscillator(
    t: number,
    frequency: number,
    instrument: InstrumentType,
  ): number {
    const phase = 2 * Math.PI * frequency * t;

    switch (instrument) {
      case "sine":
      case "piano":
      case "pad":
        return Math.sin(phase);
      case "square":
      case "lead":
        return Math.sign(Math.sin(phase));
      case "sawtooth":
      case "bass":
        return (
          2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5))
        );
      case "triangle":
      case "pluck":
        return (
          2 *
            Math.abs(
              2 *
                (phase / (2 * Math.PI) -
                  Math.floor(phase / (2 * Math.PI) + 0.5)),
            ) -
          1
        );
      default:
        return Math.sin(phase);
    }
  }

  private generateEnvelope(
    t: number,
    duration: number /*, instrument: InstrumentType*/,
  ): number {
    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.7;
    const release = 0.2;

    if (t < attack) {
      return t / attack;
    } else if (t < attack + decay) {
      return 1 - ((1 - sustain) * (t - attack)) / decay;
    } else if (t < duration - release) {
      return sustain;
    } else {
      return (sustain * (duration - t)) / release;
    }
  }

  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  private parseChord(chord: string): number[] {
    // Simplified chord parsing - in practice would be more sophisticated
    const baseNote = this.noteNameToMidi(chord.charAt(0));

    if (chord.includes("m")) {
      // Minor chord
      return [baseNote, baseNote + 3, baseNote + 7];
    } else if (chord.includes("7")) {
      // Dominant 7th chord
      return [baseNote, baseNote + 4, baseNote + 7, baseNote + 10];
    } else {
      // Major chord
      return [baseNote, baseNote + 4, baseNote + 7];
    }
  }

  private noteNameToMidi(noteName: string /*, key: string*/): number {
    // Simplified note name to MIDI conversion
    const noteMap: Record<string, number> = {
      C: 60,
      D: 62,
      E: 64,
      F: 65,
      G: 67,
      A: 69,
      B: 71,
    };

    return noteMap[noteName] || 60;
  }

  private async applyEffect(
    audioBuffer: AudioBuffer,
    effect: EffectConfig,
  ): Promise<AudioBuffer> {
    if (!effect.enabled) return audioBuffer;

    // Simplified effect processing - in practice would use proper DSP
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);

      switch (effect.type) {
        case "reverb":
          this.applyReverb(inputData, outputData, effect.parameters);
          break;
        case "delay":
          this.applyDelay(inputData, outputData, effect.parameters);
          break;
        case "filter":
          this.applyFilter(inputData, outputData, effect.parameters);
          break;
        default:
          // Copy input to output if effect not implemented
          outputData.set(inputData);
      }
    }

    return processedBuffer;
  }

  private applyReverb(
    input: Float32Array,
    output: Float32Array,
    params: Record<string, number>,
  ): void {
    const roomSize = params.roomSize || 0.5;
    // const damping = params.damping || 0.5;

    // Simplified reverb - just copy with some delay and feedback
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i];
      if (i > 1000) {
        output[i] += input[i - 1000] * roomSize * 0.3;
      }
    }
  }

  private applyDelay(
    input: Float32Array,
    output: Float32Array,
    params: Record<string, number>,
  ): void {
    const delayTime = params.delayTime || 0.3;
    const feedback = params.feedback || 0.4;
    const delaySamples = Math.floor(delayTime * 44100);

    for (let i = 0; i < input.length; i++) {
      output[i] = input[i];
      if (i >= delaySamples) {
        output[i] += output[i - delaySamples] * feedback;
      }
    }
  }

  private applyFilter(
    input: Float32Array,
    output: Float32Array,
    params: Record<string, number>,
  ): void {
    const cutoff = params.cutoff || 0.5;

    // Simple low-pass filter
    let prev = 0;
    for (let i = 0; i < input.length; i++) {
      output[i] = prev + cutoff * (input[i] - prev);
      prev = output[i];
    }
  }

  private normalizeAudioBuffer(audioBuffer: AudioBuffer): AudioBuffer {
    const normalizedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = normalizedBuffer.getChannelData(channel);

      // Find peak
      let peak = 0;
      for (let i = 0; i < inputData.length; i++) {
        peak = Math.max(peak, Math.abs(inputData[i]));
      }

      // Normalize
      const scale = peak > 0 ? 0.95 / peak : 1;
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * scale;
      }
    }

    return normalizedBuffer;
  }

  private exportWAV(audioBuffer: AudioBuffer): Blob {
    // Simplified WAV export
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, audioBuffer.numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(
      28,
      audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2,
      true,
    );
    view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, audioBuffer.getChannelData(channel)[i]),
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  private exportMP3(/*audioBuffer: AudioBuffer, quality: number*/): Blob {
    // MP3 export would require a proper encoder library
    throw new Error("MP3 export not implemented - requires encoder library");
  }

  private exportOGG(/*audioBuffer: AudioBuffer, quality: number*/): Blob {
    // OGG export would require a proper encoder library
    throw new Error("OGG export not implemented - requires encoder library");
  }

  private initializeBuiltInInstruments(): void {
    // Initialize built-in instrument plugins
    const builtInInstruments: PluginInfo[] = [
      {
        id: "sine-synth",
        name: "Sine Synthesizer",
        type: "instrument",
        parameters: [
          { name: "volume", type: "number", min: 0, max: 1, default: 0.7 },
          { name: "attack", type: "number", min: 0, max: 2, default: 0.01 },
          { name: "decay", type: "number", min: 0, max: 2, default: 0.1 },
          { name: "sustain", type: "number", min: 0, max: 1, default: 0.7 },
          { name: "release", type: "number", min: 0, max: 2, default: 0.2 },
        ],
        presets: [
          {
            name: "Default",
            parameters: {
              volume: 0.7,
              attack: 0.01,
              decay: 0.1,
              sustain: 0.7,
              release: 0.2,
            },
          },
          {
            name: "Pad",
            parameters: {
              volume: 0.5,
              attack: 0.5,
              decay: 0.3,
              sustain: 0.8,
              release: 1.0,
            },
          },
        ],
      },
      {
        id: "drum-kit",
        name: "Drum Kit",
        type: "instrument",
        parameters: [
          { name: "volume", type: "number", min: 0, max: 1, default: 0.8 },
          { name: "kickVolume", type: "number", min: 0, max: 1, default: 1.0 },
          { name: "snareVolume", type: "number", min: 0, max: 1, default: 0.8 },
          { name: "hihatVolume", type: "number", min: 0, max: 1, default: 0.6 },
        ],
        presets: [
          {
            name: "Standard",
            parameters: {
              volume: 0.8,
              kickVolume: 1.0,
              snareVolume: 0.8,
              hihatVolume: 0.6,
            },
          },
          {
            name: "Quiet",
            parameters: {
              volume: 0.5,
              kickVolume: 0.7,
              snareVolume: 0.5,
              hihatVolume: 0.3,
            },
          },
        ],
      },
    ];

    for (const instrument of builtInInstruments) {
      this.plugins.set(instrument.id, instrument);
    }
  }
}
