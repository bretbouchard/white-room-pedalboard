import { beforeEach, afterEach, vi, describe, it, expect } from "vitest";

// Hardware simulation and testing configuration
export interface HardwareConfig {
  mockHardware: boolean;
  enableRealHardware: boolean;
  hardwarePort?: string;
  responseDelayMs: number;
  failureRate?: number; // For failure simulation
}

// ACK05 Control Deck interface
export interface ACK05ControlDeck {
  // Hardware state
  connected: boolean;
  calibrated: boolean;
  firmwareVersion: string;
  serialNumber: string;

  // Control surfaces
  faders: number[]; // 0-127 MIDI values
  knobs: number[]; // 0-127 MIDI values
  buttons: boolean[]; // true/false states
  encoders: number[]; // relative values
  display: {
    backlight: boolean;
    brightness: number; // 0-100%
    text?: string;
  };

  // Audio I/O
  audioInputs: number[];
  audioOutputs: number[];
  sampleRate: number;
  bufferSize: number;

  // MIDI I/O
  midiInputActive: boolean;
  midiOutputActive: boolean;
  midiClockActive: boolean;
}

// Hardware test utilities
export class HardwareSimulator {
  private config: HardwareConfig;
  private mockHardware: ACK05ControlDeck;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: HardwareConfig) {
    this.config = config;
    this.initializeMockHardware();
  }

  private initializeMockHardware(): ACK05ControlDeck {
    this.mockHardware = {
      connected: false,
      calibrated: false,
      firmwareVersion: "1.0.0",
      serialNumber: "SIM-ACK05-001",

      // 8 faders, 8 knobs, 16 buttons, 4 encoders
      faders: new Array(8).fill(64), // Center position
      knobs: new Array(8).fill(64),
      buttons: new Array(16).fill(false),
      encoders: new Array(4).fill(0),

      display: {
        backlight: true,
        brightness: 80,
      },

      // 8 audio inputs, 8 audio outputs
      audioInputs: new Array(8).fill(0),
      audioOutputs: new Array(8).fill(0),
      sampleRate: 44100,
      bufferSize: 128,

      midiInputActive: false,
      midiOutputActive: false,
      midiClockActive: false,
    };

    return this.mockHardware;
  }

  // Hardware control methods
  async connect(): Promise<boolean> {
    if (this.config.responseDelayMs > 0) {
      await this.delay(this.config.responseDelayMs);
    }

    // Simulate occasional connection failures
    if (this.config.failureRate && Math.random() < this.config.failureRate) {
      throw new Error("Hardware connection failed");
    }

    this.mockHardware.connected = true;
    this.emit("connected", this.mockHardware);
    return true;
  }

  async disconnect(): Promise<boolean> {
    if (this.config.responseDelayMs > 0) {
      await this.delay(this.config.responseDelayMs);
    }

    this.mockHardware.connected = false;
    this.emit("disconnected", this.mockHardware);
    return true;
  }

  async calibrate(): Promise<boolean> {
    if (!this.mockHardware.connected) {
      throw new Error("Cannot calibrate: hardware not connected");
    }

    if (this.config.responseDelayMs > 0) {
      await this.delay(this.config.responseDelayMs * 2); // Calibration takes longer
    }

    this.mockHardware.calibrated = true;
    this.emit("calibrated", this.mockHardware);
    return true;
  }

  // Control surface methods
  async setFader(index: number, value: number): Promise<void> {
    this.validateFaderIndex(index);
    this.validateMidiValue(value);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.faders[index] = value;
    this.emit("faderChanged", { index, value });
  }

  async setKnob(index: number, value: number): Promise<void> {
    this.validateKnobIndex(index);
    this.validateMidiValue(value);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.knobs[index] = value;
    this.emit("knobChanged", { index, value });
  }

  async setButton(index: number, pressed: boolean): Promise<void> {
    this.validateButtonIndex(index);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.buttons[index] = pressed;
    this.emit("buttonChanged", { index, pressed });
  }

  async setEncoder(index: number, delta: number): Promise<void> {
    this.validateEncoderIndex(index);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.encoders[index] += delta;
    this.emit("encoderChanged", {
      index,
      delta,
      value: this.mockHardware.encoders[index],
    });
  }

  // Display methods
  async setDisplayText(text: string): Promise<void> {
    await this.delay(this.config.responseDelayMs);
    this.mockHardware.display.text = text.slice(0, 32); // Limit display length
    this.emit("displayChanged", { text: this.mockHardware.display.text });
  }

  async setDisplayBrightness(brightness: number): Promise<void> {
    this.validateBrightness(brightness);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.display.brightness = brightness;
    this.emit("brightnessChanged", { brightness });
  }

  // Audio I/O methods
  async setAudioInput(index: number, value: number): Promise<void> {
    this.validateAudioInputIndex(index);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.audioInputs[index] = value;
    this.emit("audioInputChanged", { index, value });
  }

  async setAudioOutput(index: number, value: number): Promise<void> {
    this.validateAudioOutputIndex(index);

    await this.delay(this.config.responseDelayMs);
    this.mockHardware.audioOutputs[index] = value;
    this.emit("audioOutputChanged", { index, value });
  }

  // MIDI methods
  async startMidiClock(): Promise<void> {
    await this.delay(this.config.responseDelayMs);
    this.mockHardware.midiClockActive = true;
    this.emit("midiClockStarted", {});
  }

  async stopMidiClock(): Promise<void> {
    await this.delay(this.config.responseDelayMs);
    this.mockHardware.midiClockActive = false;
    this.emit("midiClockStopped", {});
  }

  // Utility methods
  getState(): ACK05ControlDeck {
    return { ...this.mockHardware };
  }

  isHealthy(): boolean {
    return this.mockHardware.connected && this.mockHardware.calibrated;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // Validation methods
  private validateFaderIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.faders.length) {
      throw new Error(`Invalid fader index: ${index}`);
    }
  }

  private validateKnobIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.knobs.length) {
      throw new Error(`Invalid knob index: ${index}`);
    }
  }

  private validateButtonIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.buttons.length) {
      throw new Error(`Invalid button index: ${index}`);
    }
  }

  private validateEncoderIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.encoders.length) {
      throw new Error(`Invalid encoder index: ${index}`);
    }
  }

  private validateAudioInputIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.audioInputs.length) {
      throw new Error(`Invalid audio input index: ${index}`);
    }
  }

  private validateAudioOutputIndex(index: number): void {
    if (index < 0 || index >= this.mockHardware.audioOutputs.length) {
      throw new Error(`Invalid audio output index: ${index}`);
    }
  }

  private validateMidiValue(value: number): void {
    if (value < 0 || value > 127) {
      throw new Error(`Invalid MIDI value: ${value} (must be 0-127)`);
    }
  }

  private validateBrightness(brightness: number): void {
    if (brightness < 0 || brightness > 100) {
      throw new Error(`Invalid brightness: ${brightness} (must be 0-100)`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Hardware test helpers
export class HardwareTestHelpers {
  static createSimulator(
    config: Partial<HardwareConfig> = {},
  ): HardwareSimulator {
    const defaultConfig: HardwareConfig = {
      mockHardware: true,
      enableRealHardware: false,
      responseDelayMs: 10, // 10ms default delay for tests
      failureRate: 0, // No failures by default
    };

    return new HardwareSimulator({ ...defaultConfig, ...config });
  }

  static async assertHardwareConnection(
    simulator: HardwareSimulator,
  ): Promise<void> {
    const connected = await simulator.connect();
    expect(connected).toBe(true);
    expect(simulator.getState().connected).toBe(true);
  }

  static async assertHardwareCalibration(
    simulator: HardwareSimulator,
  ): Promise<void> {
    if (!simulator.getState().connected) {
      await this.assertHardwareConnection(simulator);
    }

    const calibrated = await simulator.calibrate();
    expect(calibrated).toBe(true);
    expect(simulator.getState().calibrated).toBe(true);
  }

  static async assertControlSurfaceOperation<T>(
    operation: () => Promise<T>,
    expectedState: Partial<ACK05ControlDeck>,
    simulator: HardwareSimulator,
  ): Promise<T> {
    const result = await operation();
    const state = simulator.getState();

    // Check expected state matches
    Object.entries(expectedState).forEach(([key, value]) => {
      const stateValue = (state as any)[key];
      expect(stateValue).toEqual(value);
    });

    return result;
  }

  static async simulateHardwareFailure<T>(
    operation: () => Promise<T>,
    simulator: HardwareSimulator,
  ): Promise<{ error?: Error; result?: T }> {
    try {
      const result = await operation();
      return { result };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static generateHardwareSequence(
    iterations: number,
    operation: (index: number) => Promise<void>,
  ): Promise<void[]> {
    const promises = Array.from({ length: iterations }, (_, index) =>
      operation(index),
    );
    return Promise.all(promises);
  }
}

// Test data generators for hardware tests
export const HardwareTestDataGenerators = {
  // Generate random control surface states
  randomFaderState: () =>
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 128)),
  randomKnobState: () =>
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 128)),
  randomButtonState: () =>
    Array.from({ length: 16 }, () => Math.random() < 0.5),

  // Generate audio test signals
  generateSineWave: (frequency: number, amplitude: number, samples: number) =>
    Array.from(
      { length: samples },
      (_, i) => amplitude * Math.sin((2 * Math.PI * frequency * i) / 44100),
    ),

  generateWhiteNoise: (amplitude: number, samples: number) =>
    Array.from(
      { length: samples },
      () => (Math.random() - 0.5) * 2 * amplitude,
    ),

  // Generate MIDI test data
  randomMidiNote: () => Math.floor(Math.random() * 128),
  randomMidiVelocity: () => Math.floor(Math.random() * 128),
  randomMidiControlValue: () => Math.floor(Math.random() * 128),
};

// Global hardware test setup
let hardwareSimulator: HardwareSimulator;

beforeEach(() => {
  // Create a fresh hardware simulator for each test
  hardwareSimulator = HardwareTestHelpers.createSimulator({
    mockHardware: true,
    enableRealHardware: false,
    responseDelayMs: 1, // Minimal delay for unit tests
    failureRate: 0,
  });

  // Mock hardware detection
  vi.mock("../../src/hardware/ack05", () => ({
    ACK05ControlDeck: hardwareSimulator,
  }));
});

afterEach(() => {
  // Clean up hardware connections
  if (hardwareSimulator && hardwareSimulator.getState().connected) {
    hardwareSimulator.disconnect();
  }

  vi.restoreAllMocks();
});

export default {
  HardwareSimulator,
  HardwareTestHelpers,
  HardwareTestDataGenerators,
  getSimulator: () => hardwareSimulator,
};
