/**
 * ACK05 Hardware Simulator for Schillinger SDK
 *
 * This module provides comprehensive hardware simulation for the ACK05 audio interface:
 * - MIDI input/output simulation
 * - Audio interface simulation
 * - DSP processing simulation
 * - Real-time performance monitoring
 * - Hardware error simulation
 * - Latency measurement
 * - Sample rate conversion
 * - Buffer management
 */

import { EventEmitter } from 'events';
import type { Note, TimeSignature } from '../property-based/generators/musical-generators';

// Hardware specifications
const ACK05_SPECIFICATIONS = {
  // Audio specifications
  sampleRate: [44100, 48000, 88200, 96000, 192000],
  bitDepth: [16, 24, 32],
  bufferSize: [32, 64, 128, 256, 512, 1024],
  channels: {
    input: 8,
    output: 8,
    analog: 4,
    digital: 8,
  },

  // MIDI specifications
  midiChannels: 16,
  midiInputPorts: 2,
  midiOutputPorts: 2,

  // Performance specifications
  maxLatency: 10, // milliseconds
  supportedSampleRates: [44100, 48000, 88200, 96000, 192000],
  clockAccuracy: 0.001, // ppm (parts per million)

  // DSP capabilities
  dspProcessingTime: 0.5, // milliseconds per buffer
  maxConcurrentEffects: 32,
  supportedFormats: ['wav', 'aiff', 'flac', 'mp3'],

  // Physical specifications
  gainRange: [-60, 18], // dB
    phantomPower: [48, 24], // V
    temperatureRange: [0, 50], // Celsius
    humidityRange: [20, 80], // % relative humidity
} as const;

export interface AudioConfig {
  sampleRate: number;
  bitDepth: number;
  bufferSize: number;
  inputChannels: number;
  outputChannels: number;
  clockSource: 'internal' | 'external' | 'wordclock';
}

export interface MidiMessage {
  timestamp: number;
  port: number;
  channel: number;
  status: number; // MIDI status byte
  data1: number;
  data2?: number;
}

export interface AudioBuffer {
  data: Float32Array[]; // Interleaved audio data per channel
  sampleRate: number;
  channels: number;
  frames: number;
  timestamp: number;
}

export interface HardwareStatus {
  connected: boolean;
  sampleRate: number;
  clockLocked: boolean;
  underruns: number;
  overruns: number;
  cpuUsage: number; // 0-100%
  temperature: number; // Celsius
  dspLoad: number; // 0-100%
}

export interface DspEffect {
  id: string;
  type: 'reverb' | 'delay' | 'eq' | 'compressor' | 'distortion' | 'chorus';
  parameters: Record<string, number>;
  enabled: boolean;
  bypass: boolean;
  cpuUsage: number; // percentage of DSP resources
}

/**
 * Main ACK05 Hardware Simulator
 */
export class Ack05Simulator extends EventEmitter {
  private config: AudioConfig;
  private status: HardwareStatus;
  private midiBuffers: Map<number, MidiMessage[]> = new Map();
  private audioInputBuffer: AudioBuffer | null = null;
  private audioOutputBuffer: AudioBuffer | null = null;
  private dspEffects: Map<string, DspEffect> = new Map();
  private isRunning: boolean = false;
  private simulationStartTime: number = 0;
  private errorInjectionEnabled: boolean = false;

  // Performance tracking
  private performanceMetrics = {
    totalMidiMessages: 0,
    totalAudioFrames: 0,
    averageLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    droppedFrames: 0,
  };

  constructor(config?: Partial<AudioConfig>) {
    super();

    this.config = {
      sampleRate: 48000,
      bitDepth: 24,
      bufferSize: 256,
      inputChannels: 8,
      outputChannels: 8,
      clockSource: 'internal',
      ...config,
    };

    this.status = {
      connected: false,
      sampleRate: this.config.sampleRate,
      clockLocked: false,
      underruns: 0,
      overruns: 0,
      cpuUsage: 0,
      temperature: 25,
      dspLoad: 0,
    };

    this.initializeBuffers();
  }

  /**
   * Initialize audio buffers
   */
  private initializeBuffers(): void {
    const frames = this.config.bufferSize;

    this.audioInputBuffer = {
      data: Array.from({ length: this.config.inputChannels }, () => new Float32Array(frames)),
      sampleRate: this.config.sampleRate,
      channels: this.config.inputChannels,
      frames,
      timestamp: 0,
    };

    this.audioOutputBuffer = {
      data: Array.from({ length: this.config.outputChannels }, () => new Float32Array(frames)),
      sampleRate: this.config.sampleRate,
      channels: this.config.outputChannels,
      frames,
      timestamp: 0,
    };
  }

  /**
   * Connect to simulated hardware
   */
  async connect(): Promise<void> {
    console.log('🔌 Connecting to ACK05 simulator...');

    // Simulate connection delay
    await this.delay(100);

    this.status.connected = true;
    this.status.clockLocked = this.config.clockSource === 'internal';

    // Initialize MIDI buffers
    for (let port = 0; port < ACK05_SPECIFICATIONS.midiInputPorts; port++) {
      this.midiBuffers.set(port, []);
    }

    this.simulationStartTime = Date.now();
    this.isRunning = true;

    this.emit('connected');
    console.log('✅ ACK05 simulator connected');

    // Start monitoring loop
    this.startMonitoringLoop();
  }

  /**
   * Disconnect from simulated hardware
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from ACK05 simulator...');

    this.isRunning = false;
    this.status.connected = false;
    this.status.clockLocked = false;

    // Clear buffers
    this.midiBuffers.clear();
    this.audioInputBuffer = null;
    this.audioOutputBuffer = null;

    this.emit('disconnected');
    console.log('✅ ACK05 simulator disconnected');
  }

  /**
   * Send MIDI message to simulated input
   */
  sendMidi(message: Omit<MidiMessage, 'timestamp'>): void {
    if (!this.status.connected) {
      throw new Error('ACK05 not connected');
    }

    const timestamp = this.getCurrentTime();
    const fullMessage: MidiMessage = { ...message, timestamp };

    // Add to appropriate MIDI buffer
    const buffer = this.midiBuffers.get(message.port);
    if (buffer) {
      buffer.push(fullMessage);
      this.performanceMetrics.totalMidiMessages++;
    }

    this.emit('midiReceived', fullMessage);

    // Simulate MIDI processing delay
    if (this.errorInjectionEnabled && Math.random() < 0.001) {
      // Inject occasional MIDI timing errors
      setTimeout(() => {
        this.emit('midiError', { type: 'timing', message: fullMessage });
      }, Math.random() * 5);
    }
  }

  /**
   * Get MIDI messages from buffer
   */
  getMidiMessages(port: number, since?: number): MidiMessage[] {
    const buffer = this.midiBuffers.get(port) || [];
    const cutoff = since || 0;

    const messages = buffer.filter(msg => msg.timestamp >= cutoff);

    // Clear processed messages
    const remaining = buffer.filter(msg => msg.timestamp < cutoff);
    this.midiBuffers.set(port, remaining);

    return messages;
  }

  /**
   * Process audio buffer (simulate real-time DSP)
   */
  async processAudio(inputBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.status.connected || !this.audioOutputBuffer) {
      throw new Error('ACK05 not connected or output buffer not initialized');
    }

    const startTime = performance.now();

    // Copy input to input buffer
    if (this.audioInputBuffer) {
      for (let ch = 0; ch < Math.min(inputBuffer.channels, this.config.inputChannels); ch++) {
        this.audioInputBuffer.data[ch].set(inputBuffer.data[ch].slice(0, this.config.bufferSize));
      }
    }

    // Apply DSP effects
    await this.applyDspEffects();

    // Add some simulated processing characteristics
    if (this.audioOutputBuffer) {
      for (let ch = 0; ch < this.config.outputChannels; ch++) {
        const channel = this.audioOutputBuffer.data[ch];

        // Simulate noise floor
        this.addNoiseFloor(channel);

        // Simulate subtle harmonic distortion
        if (Math.random() < 0.01) {
          this.addHarmonicDistortion(channel);
        }

        // Simulate channel crosstalk
        if (ch > 0 && Math.random() < 0.001) {
          this.addCrosstalk(channel, this.audioOutputBuffer.data[ch - 1]);
        }
      }
    }

    const processingTime = performance.now() - startTime;
    this.updatePerformanceMetrics(processingTime);

    // Check for underruns/overruns
    if (processingTime > (this.config.bufferSize / this.config.sampleRate) * 1000) {
      this.status.underruns++;
      this.emit('audioError', { type: 'underrun', processingTime });
    }

    return this.audioOutputBuffer!;
  }

  /**
   * Add DSP effect
   */
  addDspEffect(effect: Omit<DspEffect, 'id'>): string {
    const id = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEffect: DspEffect = { ...effect, id };

    this.dspEffects.set(id, fullEffect);
    this.updateDspLoad();

    this.emit('effectAdded', fullEffect);
    return id;
  }

  /**
   * Remove DSP effect
   */
  removeDspEffect(id: string): boolean {
    const removed = this.dspEffects.delete(id);
    if (removed) {
      this.updateDspLoad();
      this.emit('effectRemoved', id);
    }
    return removed;
  }

  /**
   * Update DSP effect parameters
   */
  updateDspEffect(id: string, parameters: Partial<DspEffect['parameters']>): void {
    const effect = this.dspEffects.get(id);
    if (effect) {
      effect.parameters = { ...effect.parameters, ...parameters };
      this.emit('effectUpdated', effect);
    }
  }

  /**
   * Get current hardware status
   */
  getStatus(): HardwareStatus {
    return { ...this.status };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Enable/disable error injection for testing
   */
  setErrorInjection(enabled: boolean): void {
    this.errorInjectionEnabled = enabled;
  }

  /**
   * Simulate hardware stress test
   */
  async runStressTest(duration: number, complexity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    if (!this.status.connected) {
      throw new Error('ACK05 not connected');
    }

    console.log(`🏃 Running stress test: ${duration}ms, complexity: ${complexity}`);
    const startTime = Date.now();
    const endTime = startTime + duration;

    // Determine test parameters based on complexity
    const midiMessageRate = complexity === 'low' ? 10 : complexity === 'medium' ? 100 : 1000;
    const dspEffectCount = complexity === 'low' ? 4 : complexity === 'medium' ? 16 : 32;

    // Add DSP effects
    const effectIds: string[] = [];
    for (let i = 0; i < dspEffectCount; i++) {
      const effectId = this.addDspEffect({
        type: 'reverb',
        parameters: { roomSize: Math.random(), damping: Math.random() },
        enabled: true,
        bypass: false,
        cpuUsage: 2 + Math.random() * 3,
      });
      effectIds.push(effectId);
    }

    // Stress test loop
    const stressInterval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime >= endTime) {
        clearInterval(stressInterval);
        return;
      }

      // Send MIDI messages
      for (let i = 0; i < midiMessageRate; i++) {
        this.sendMidi({
          port: Math.floor(Math.random() * ACK05_SPECIFICATIONS.midiInputPorts),
          channel: Math.floor(Math.random() * ACK05_SPECIFICATIONS.midiChannels),
          status: 0x90, // Note on
          data1: Math.floor(Math.random() * 128),
          data2: Math.floor(Math.random() * 128),
        });
      }

      // Update CPU load simulation
      this.status.cpuUsage = Math.min(100, this.status.cpuUsage + (Math.random() - 0.3) * 5);
      this.status.temperature = 25 + (this.status.cpuUsage / 100) * 20;

      // Randomly update effect parameters
      if (effectIds.length > 0 && Math.random() < 0.1) {
        const randomEffectId = effectIds[Math.floor(Math.random() * effectIds.length)];
        this.updateDspEffect(randomEffectId, {
          roomSize: Math.random(),
          damping: Math.random(),
        });
      }
    }, 10);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(stressInterval);

        // Clean up effects
        effectIds.forEach(id => this.removeDspEffect(id));

        console.log('✅ Stress test completed');
        resolve();
      }, duration);
    });
  }

  /**
   * Private helper methods
   */

  private getCurrentTime(): number {
    return Date.now() - this.simulationStartTime;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startMonitoringLoop(): void {
    const monitorInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitorInterval);
        return;
      }

      // Update status
      this.status.cpuUsage = Math.max(0, this.status.cpuUsage + (Math.random() - 0.5) * 2);
      this.status.temperature = 25 + (this.status.cpuUsage / 100) * 15 + (Math.random() - 0.5) * 2;

      // Simulate clock stability
      if (this.config.clockSource === 'internal') {
        this.status.clockLocked = Math.random() > 0.001; // 99.9% lock rate
      }

      this.emit('statusUpdate', this.getStatus());
    }, 1000);
  }

  private async applyDspEffects(): Promise<void> {
    if (!this.audioInputBuffer || !this.audioOutputBuffer) return;

    // Copy input to output initially
    for (let ch = 0; ch < Math.min(this.config.inputChannels, this.config.outputChannels); ch++) {
      this.audioOutputBuffer.data[ch].set(this.audioInputBuffer.data[ch]);
    }

    // Apply enabled DSP effects
    for (const effect of this.dspEffects.values()) {
      if (effect.enabled && !effect.bypass) {
        await this.applyDspEffect(effect);
      }
    }
  }

  private async applyDspEffect(effect: DspEffect): Promise<void> {
    if (!this.audioOutputBuffer) return;

    const startTime = performance.now();

    switch (effect.type) {
      case 'reverb':
        this.applyReverb(effect);
        break;
      case 'delay':
        this.applyDelay(effect);
        break;
      case 'eq':
        this.applyEq(effect);
        break;
      case 'compressor':
        this.applyCompressor(effect);
        break;
      case 'distortion':
        this.applyDistortion(effect);
        break;
      case 'chorus':
        this.applyChorus(effect);
        break;
    }

    const processingTime = performance.now() - startTime;

    // Simulate DSP processing delay
    const expectedTime = effect.cpuUsage * this.config.bufferSize / this.config.sampleRate;
    if (processingTime < expectedTime) {
      await this.delay(expectedTime - processingTime);
    }
  }

  private applyReverb(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const roomSize = effect.parameters.roomSize || 0.5;
    const damping = effect.parameters.damping || 0.5;

    // Simple reverb simulation (early reflections)
    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      const delaySamples = Math.floor(roomSize * this.config.sampleRate * 0.1); // Max 100ms delay

      for (let i = delaySamples; i < channel.length; i++) {
        const wet = channel[i - delaySamples] * damping * 0.3;
        channel[i] = channel[i] * 0.7 + wet; // Mix dry and wet
      }
    }
  }

  private applyDelay(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const delayTime = (effect.parameters.delayTime || 0.25) * this.config.sampleRate;
    const feedback = effect.parameters.feedback || 0.3;
    const mix = effect.parameters.mix || 0.3;

    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      const delaySamples = Math.floor(delayTime);

      for (let i = delaySamples; i < channel.length; i++) {
        const delayed = channel[i - delaySamples] * feedback;
        channel[i] = channel[i] * (1 - mix) + delayed * mix;
      }
    }
  }

  private applyEq(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const frequency = effect.parameters.frequency || 1000;
    const gain = effect.parameters.gain || 0;
    const q = effect.parameters.q || 1;

    // Simple EQ simulation ( shelving filter )
    const shelvingGain = Math.pow(10, gain / 20);

    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      for (let i = 0; i < channel.length; i++) {
        channel[i] *= shelvingGain;
      }
    }
  }

  private applyCompressor(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const threshold = effect.parameters.threshold || -20;
    const ratio = effect.parameters.ratio || 4;
    const makeupGain = effect.parameters.makeupGain || 0;

    const thresholdLinear = Math.pow(10, threshold / 20);
    const makeupLinear = Math.pow(10, makeupGain / 20);

    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      for (let i = 0; i < channel.length; i++) {
        const abs = Math.abs(channel[i]);
        if (abs > thresholdLinear) {
          const excess = abs - thresholdLinear;
          const reducedExcess = excess / ratio;
          channel[i] = Math.sign(channel[i]) * (thresholdLinear + reducedExcess) * makeupLinear;
        } else {
          channel[i] *= makeupLinear;
        }
      }
    }
  }

  private applyDistortion(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const drive = effect.parameters.drive || 5;
    const mix = effect.parameters.mix || 0.5;

    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      for (let i = 0; i < channel.length; i++) {
        const dry = channel[i];
        const wet = Math.tanh(dry * drive) / Math.tanh(drive);
        channel[i] = dry * (1 - mix) + wet * mix;
      }
    }
  }

  private applyChorus(effect: DspEffect): void {
    if (!this.audioOutputBuffer) return;

    const rate = effect.parameters.rate || 1.5;
    const depth = effect.parameters.depth || 0.02;
    const mix = effect.parameters.mix || 0.3;

    for (let ch = 0; ch < this.audioOutputBuffer.channels; ch++) {
      const channel = this.audioOutputBuffer.data[ch];
      for (let i = 0; i < channel.length; i++) {
        const modulation = Math.sin(2 * Math.PI * rate * i / this.config.sampleRate) * depth;
        const delaySamples = Math.floor(modulation * this.config.sampleRate);

        const delayed = i >= delaySamples ? channel[i - delaySamples] : 0;
        channel[i] = channel[i] * (1 - mix) + delayed * mix;
      }
    }
  }

  private addNoiseFloor(channel: Float32Array): void {
    const noiseLevel = 1e-6; // -120dB noise floor
    for (let i = 0; i < channel.length; i++) {
      channel[i] += (Math.random() - 0.5) * noiseLevel;
    }
  }

  private addHarmonicDistortion(channel: Float32Array): void {
    for (let i = 0; i < channel.length; i++) {
      // Add subtle 2nd and 3rd harmonics
      channel[i] += channel[i] * channel[i] * 0.001; // 2nd harmonic
      channel[i] += channel[i] * channel[i] * channel[i] * 0.0001; // 3rd harmonic
    }
  }

  private addCrosstalk(channel: Float32Array, adjacentChannel: Float32Array): void {
    const crosstalkLevel = 0.001; // -60dB crosstalk
    for (let i = 0; i < Math.min(channel.length, adjacentChannel.length); i++) {
      channel[i] += adjacentChannel[i] * crosstalkLevel;
    }
  }

  private updatePerformanceMetrics(processingTime: number): void {
    this.performanceMetrics.totalAudioFrames += this.config.bufferSize;

    if (processingTime > this.performanceMetrics.maxLatency) {
      this.performanceMetrics.maxLatency = processingTime;
    }

    if (processingTime < this.performanceMetrics.minLatency) {
      this.performanceMetrics.minLatency = processingTime;
    }

    // Update running average
    const total = this.performanceMetrics.totalAudioFrames / this.config.bufferSize;
    this.performanceMetrics.averageLatency =
      (this.performanceMetrics.averageLatency * (total - 1) + processingTime) / total;
  }

  private updateDspLoad(): void {
    const totalCpuUsage = Array.from(this.dspEffects.values())
      .reduce((sum, effect) => sum + (effect.enabled ? effect.cpuUsage : 0), 0);

    this.status.dspLoad = Math.min(100, totalCpuUsage);
  }
}

/**
 * Factory function for creating ACK05 simulators
 */
export function createAck05Simulator(config?: Partial<AudioConfig>): Ack05Simulator {
  return new Ack05Simulator(config);
}

/**
 * Utility functions for ACK05 testing
 */
export const Ack05TestUtils = {
  /**
   * Generate test audio buffer
   */
  generateTestAudioBuffer(config: AudioConfig, duration: number): AudioBuffer {
    const frames = Math.floor(duration * config.sampleRate);
    const data = Array.from({ length: config.inputChannels }, () => {
      const buffer = new Float32Array(frames);
      // Generate sine wave test signal
      for (let i = 0; i < frames; i++) {
        buffer[i] = Math.sin(2 * Math.PI * 440 * i / config.sampleRate) * 0.5;
      }
      return buffer;
    });

    return {
      data,
      sampleRate: config.sampleRate,
      channels: config.inputChannels,
      frames,
      timestamp: Date.now(),
    };
  },

  /**
   * Generate test MIDI message
   */
  generateTestMidiMessage(note: Note): MidiMessage {
    return {
      timestamp: Date.now(),
      port: 0,
      channel: 0,
      status: 0x90, // Note on
      data1: note.pitch,
      data2: note.velocity,
    };
  },

  /**
   * Validate ACK05 specifications
   */
  validateConfig(config: AudioConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ACK05_SPECIFICATIONS.sampleRate.includes(config.sampleRate)) {
      errors.push(`Unsupported sample rate: ${config.sampleRate}`);
    }

    if (!ACK05_SPECIFICATIONS.bitDepth.includes(config.bitDepth)) {
      errors.push(`Unsupported bit depth: ${config.bitDepth}`);
    }

    if (!ACK05_SPECIFICATIONS.bufferSize.includes(config.bufferSize)) {
      warnings.push(`Non-standard buffer size: ${config.bufferSize}`);
    }

    if (config.inputChannels > ACK05_SPECIFICATIONS.channels.input) {
      errors.push(`Too many input channels: ${config.inputChannels}`);
    }

    if (config.outputChannels > ACK05_SPECIFICATIONS.channels.output) {
      errors.push(`Too many output channels: ${config.outputChannels}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// Export types
export type { AudioConfig, MidiMessage, AudioBuffer, HardwareStatus, DspEffect };