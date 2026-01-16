/**
 * Test Song Generator for E2E Testing
 *
 * Generates test songs covering the full complexity matrix:
 * - Simple: 1 voice, 1 system, 10 seconds
 * - Medium: 4 voices, 2-3 systems, 30 seconds
 * - Complex: 8+ voices, 5+ systems, 60+ seconds
 * - Edge Cases: Empty songs, single note, maximum voices
 * - Instrumentation: Each of 7 DSP instruments
 * - Console: Various routing configurations
 * - Performance: Multiple performances, blends
 */

import { SongComplexity, TestSongMetadata } from './e2e-framework';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Schillinger Song structure
 */
export interface SchillingerSong {
  version: '1.0';
  metadata: {
    name: string;
    description: string;
    author: 'E2E-Test-Generator';
    createdAt: string;
    tags: string[];
  };
  structure: {
    tempo: number;
    timeSignature: [number, number];
    duration: number;
    key: number;
    scale: string;
  };
  systems: System[];
  voices: Voice[];
  console: ConsoleConfig;
}

/**
 * System configuration
 */
export interface System {
  id: string;
  name: string;
  type: 'rhythm' | 'harmony' | 'melody' | 'counterpoint';
  parameters: Record<string, any>;
}

/**
 * Voice configuration
 */
export interface Voice {
  id: string;
  name: string;
  systemId: string;
  role: string;
  instrument: InstrumentConfig;
  settings: Record<string, any>;
}

/**
 * Instrument configuration
 */
export interface InstrumentConfig {
  type: string;
  preset?: string;
  parameters: Record<string, number>;
}

/**
 * Console configuration
 */
export interface ConsoleConfig {
  channels: ConsoleChannel[];
  buses: ConsoleBus[];
  sends: ConsoleSend[];
  master: ConsoleMaster;
}

/**
 * Console channel
 */
export interface ConsoleChannel {
  id: string;
  name: string;
  voiceId: string;
  volume: number;
  pan: number;
  inserts: InsertEffect[];
  sends: string[];
}

/**
 * Console bus
 */
export interface ConsoleBus {
  id: string;
  name: string;
  volume: number;
  inserts: InsertEffect[];
}

/**
 * Console send
 */
export interface ConsoleSend {
  id: string;
  fromChannel: string;
  toBus: string;
  amount: number;
}

/**
 * Console master
 */
export interface ConsoleMaster {
  volume: number;
  inserts: InsertEffect[];
}

/**
 * Insert effect
 */
export interface InsertEffect {
  type: string;
  parameters: Record<string, number>;
  enabled: boolean;
}

/**
 * Test song generator
 */
export class TestSongGenerator {
  private seed: number;
  private rng: () => number;

  constructor(seed: number = 42) {
    this.seed = seed;
    this.rng = this.seededRandom(seed);
  }

  /**
   * Generate test song with specified complexity
   */
  generateSong(
    id: string,
    complexity: SongComplexity,
    options?: {
      instrumentType?: string;
      systemCount?: number;
      voiceCount?: number;
      duration?: number;
    }
  ): SchillingerSong {
    const config = this.getComplexityConfig(complexity, options);

    const song: SchillingerSong = {
      version: '1.0',
      metadata: {
        name: `Test Song ${id}`,
        description: `E2E test song - ${complexity} complexity`,
        author: 'E2E-Test-Generator',
        createdAt: new Date().toISOString(),
        tags: [complexity, 'e2e-test', config.instrumentType],
      },
      structure: {
        tempo: 120 + Math.floor(this.rng() * 60), // 120-180 BPM
        timeSignature: [4, 4],
        duration: config.duration,
        key: Math.floor(this.rng() * 12), // 0-11 (C to B)
        scale: this.pickRandom(['major', 'minor', 'dorian', 'mixolydian']),
      },
      systems: this.generateSystems(config),
      voices: this.generateVoices(config),
      console: this.generateConsole(config),
    };

    return song;
  }

  /**
   * Generate all 100 test songs
   */
  generateAllTestSongs(): Map<string, SchillingerSong> {
    const songs = new Map<string, SchillingerSong>();

    let songIndex = 0;

    // Simple songs (20)
    for (let i = 0; i < 20; i++) {
      const id = `simple-${String(i).padStart(3, '0')}`;
      songs.set(id, this.generateSong(id, SongComplexity.SIMPLE));
      songIndex++;
    }

    // Medium songs (30)
    for (let i = 0; i < 30; i++) {
      const id = `medium-${String(i).padStart(3, '0')}`;
      songs.set(id, this.generateSong(id, SongComplexity.MEDIUM));
      songIndex++;
    }

    // Complex songs (25)
    for (let i = 0; i < 25; i++) {
      const id = `complex-${String(i).padStart(3, '0')}`;
      songs.set(id, this.generateSong(id, SongComplexity.COMPLEX));
      songIndex++;
    }

    // Edge cases (10)
    const edgeCases = [
      'empty',
      'single-note',
      'single-voice',
      'max-voices',
      'max-systems',
      'minimum-duration',
      'maximum-duration',
      'all-instruments',
      'complex-routing',
      'extreme-tempo',
    ];

    for (let i = 0; i < edgeCases.length; i++) {
      const id = `edge-${edgeCases[i]}`;
      songs.set(id, this.generateEdgeCaseSong(id, edgeCases[i]));
      songIndex++;
    }

    // Instrument-specific songs (7 instruments × 1 song = 7)
    const instrumentTypes = [
      'localgal',
      'kanemarco',
      'nexsynth',
      'samsampler',
      'drummachine',
      'basssynth',
      'padgenerator',
    ];

    for (const instrument of instrumentTypes) {
      const id = `instrument-${instrument}`;
      songs.set(
        id,
        this.generateSong(id, SongComplexity.MEDIUM, {
          instrumentType: instrument,
        })
      );
      songIndex++;
    }

    // Console routing tests (8)
    const routingConfigs = [
      'basic-routing',
      'parallel-buses',
      'series-effects',
      'send-effects',
      'automation',
      'group-channels',
      'external-send',
      'master-chain',
    ];

    for (const config of routingConfigs) {
      const id = `console-${config}`;
      songs.set(id, this.generateConsoleTestSong(id, config));
      songIndex++;
    }

    console.log(`Generated ${songs.size} test songs`);

    return songs;
  }

  /**
   * Save test songs to disk
   */
  async saveTestSongs(
    songs: Map<string, SchillingerSong>,
    outputDir: string
  ): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    for (const [id, song] of songs) {
      const filePath = path.join(outputDir, `${id}.json`);
      const content = JSON.stringify(song, null, 2);

      // Save song
      await fs.writeFile(filePath, content, 'utf-8');

      // Save metadata
      const metadata: TestSongMetadata = {
        id,
        name: song.metadata.name,
        complexity: this.determineComplexity(song),
        duration: song.structure.duration,
        voiceCount: song.voices.length,
        systemCount: song.systems.length,
        instrumentTypes: [
          ...new Set(song.voices.map(v => v.instrument.type)),
        ],
        tags: song.metadata.tags,
        path: filePath,
      };

      const metadataPath = path.join(outputDir, `${id}.metadata.json`);
      await fs.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
    }

    console.log(`Saved ${songs.size} test songs to ${outputDir}`);
  }

  /**
   * Get complexity configuration
   */
  private getComplexityConfig(
    complexity: SongComplexity,
    options?: {
      instrumentType?: string;
      systemCount?: number;
      voiceCount?: number;
      duration?: number;
    }
  ): {
    voiceCount: number;
    systemCount: number;
    duration: number;
    instrumentType: string;
  } {
    const baseConfig = {
      [SongComplexity.SIMPLE]: {
        voiceCount: 1,
        systemCount: 1,
        duration: 10,
      },
      [SongComplexity.MEDIUM]: {
        voiceCount: 4,
        systemCount: 2,
        duration: 30,
      },
      [SongComplexity.COMPLEX]: {
        voiceCount: 8,
        systemCount: 5,
        duration: 60,
      },
      [SongComplexity.EDGE_CASE]: {
        voiceCount: 1,
        systemCount: 1,
        duration: 10,
      },
    };

    const config = baseConfig[complexity];

    return {
      voiceCount: options?.voiceCount ?? config.voiceCount,
      systemCount: options?.systemCount ?? config.systemCount,
      duration: options?.duration ?? config.duration,
      instrumentType:
        options?.instrumentType ?? this.pickRandom(this.getAllInstrumentTypes()),
    };
  }

  /**
   * Generate systems
   */
  private generateSystems(config: {
    systemCount: number;
    voiceCount: number;
    duration: number;
    instrumentType: string;
  }): System[] {
    const systems: System[] = [];
    const systemTypes = ['rhythm', 'harmony', 'melody', 'counterpoint'];

    for (let i = 0; i < config.systemCount; i++) {
      systems.push({
        id: `system-${i}`,
        name: `System ${i}`,
        type: systemTypes[i % systemTypes.length] as any,
        parameters: this.generateSystemParameters(),
      });
    }

    return systems;
  }

  /**
   * Generate voices
   */
  private generateVoices(config: {
    systemCount: number;
    voiceCount: number;
    duration: number;
    instrumentType: string;
  }): Voice[] {
    const voices: Voice[] = [];
    const roles = ['lead', 'harmony', 'bass', 'pad', 'rhythm'];

    for (let i = 0; i < config.voiceCount; i++) {
      voices.push({
        id: `voice-${i}`,
        name: `Voice ${i}`,
        systemId: `system-${i % config.systemCount}`,
        role: roles[i % roles.length],
        instrument: {
          type: config.instrumentType,
          preset: this.getRandomPreset(config.instrumentType),
          parameters: this.generateInstrumentParameters(),
        },
        settings: this.generateVoiceSettings(),
      });
    }

    return voices;
  }

  /**
   * Generate console configuration
   */
  private generateConsole(config: {
    systemCount: number;
    voiceCount: number;
    duration: number;
    instrumentType: string;
  }): ConsoleConfig {
    const channels: ConsoleChannel[] = [];
    const buses: ConsoleBus[] = [];
    const sends: ConsoleSend[] = [];

    // Create channels for each voice
    for (let i = 0; i < config.voiceCount; i++) {
      channels.push({
        id: `channel-${i}`,
        name: `Channel ${i}`,
        voiceId: `voice-${i}`,
        volume: 0.75 + this.rng() * 0.25, // 0.75 to 1.0
        pan: -1.0 + this.rng() * 2.0, // -1.0 to 1.0
        inserts: this.generateInserts(),
        sends: [],
      });
    }

    // Create buses
    const busCount = Math.min(config.voiceCount, 4);
    for (let i = 0; i < busCount; i++) {
      buses.push({
        id: `bus-${i}`,
        name: `Bus ${i}`,
        volume: 0.75 + this.rng() * 0.25,
        inserts: this.generateInserts(),
      });
    }

    // Create sends
    for (let i = 0; i < config.voiceCount; i++) {
      for (let j = 0; j < busCount; j++) {
        if (this.rng() > 0.7) {
          // 30% chance of send
          sends.push({
            id: `send-${i}-${j}`,
            fromChannel: `channel-${i}`,
            toBus: `bus-${j}`,
            amount: this.rng() * 0.5,
          });
        }
      }
    }

    return {
      channels,
      buses,
      sends,
      master: {
        volume: 0.8,
        inserts: this.generateInserts(),
      },
    };
  }

  /**
   * Generate system parameters
   */
  private generateSystemParameters(): Record<string, any> {
    return {
      density: 0.5 + this.rng() * 0.5,
      complexity: this.rng(),
      register: Math.floor(this.rng() * 3), // 0-2
    };
  }

  /**
   * Generate instrument parameters
   */
  private generateInstrumentParameters(): Record<string, number> {
    return {
      attack: this.rng() * 0.5,
      decay: this.rng() * 0.5,
      sustain: 0.5 + this.rng() * 0.5,
      release: this.rng() * 1.0,
      filter: this.rng(),
      resonance: this.rng() * 0.5,
    };
  }

  /**
   * Generate voice settings
   */
  private generateVoiceSettings(): Record<string, any> {
    return {
      octave: Math.floor(this.rng() * 3) - 1, // -1 to 1
      velocityRange: Math.floor(this.rng() * 40) + 80, // 80-120
      timingOffset: (this.rng() - 0.5) * 0.1, // -0.05 to 0.05
    };
  }

  /**
   * Generate insert effects
   */
  private generateInserts(): InsertEffect[] {
    const effectTypes = ['compressor', 'eq', 'reverb', 'delay'];
    const inserts: InsertEffect[] = [];

    // Random chance of each effect
    for (const type of effectTypes) {
      if (this.rng() > 0.6) {
        // 40% chance
        inserts.push({
          type,
          parameters: this.generateEffectParameters(type),
          enabled: true,
        });
      }
    }

    return inserts;
  }

  /**
   * Generate effect parameters
   */
  private generateEffectParameters(type: string): Record<string, number> {
    const baseParams: Record<string, () => number> = {
      compressor: () => this.rng() * 10 + 5, // threshold
      eq: () => this.rng() * 2 - 1, // frequency
      reverb: () => this.rng() * 0.5, // mix
      delay: () => this.rng() * 0.5, // feedback
    };

    return {
      mix: this.rng() * 0.5,
      [type]: baseParams[type] ? baseParams[type]() : this.rng(),
    };
  }

  /**
   * Generate edge case song
   */
  private generateEdgeCaseSong(id: string, edgeCase: string): SchillingerSong {
    const baseSong = this.generateSong(id, SongComplexity.EDGE_CASE);

    switch (edgeCase) {
      case 'empty':
        return {
          ...baseSong,
          systems: [],
          voices: [],
          console: { ...baseSong.console, channels: [], buses: [], sends: [] },
        };

      case 'single-note':
        return {
          ...baseSong,
          structure: { ...baseSong.structure, duration: 0.5 },
        };

      case 'single-voice':
        return this.generateSong(id, SongComplexity.SIMPLE);

      case 'max-voices':
        return this.generateSong(id, SongComplexity.COMPLEX, {
          voiceCount: 100,
        });

      case 'max-systems':
        return this.generateSong(id, SongComplexity.COMPLEX, {
          systemCount: 20,
        });

      case 'minimum-duration':
        return {
          ...baseSong,
          structure: { ...baseSong.structure, duration: 1.0 },
        };

      case 'maximum-duration':
        return {
          ...baseSong,
          structure: { ...baseSong.structure, duration: 300 },
        };

      case 'all-instruments':
        return this.generateSong(id, SongComplexity.COMPLEX, {
          voiceCount: 7,
          systemCount: 7,
        });

      case 'complex-routing':
        return this.generateSong(id, SongComplexity.COMPLEX);

      case 'extreme-tempo':
        return {
          ...baseSong,
          structure: { ...baseSong.structure, tempo: 200 + Math.random() * 80 },
        };

      default:
        return baseSong;
    }
  }

  /**
   * Generate console test song
   */
  private generateConsoleTestSong(id: string, config: string): SchillingerSong {
    const song = this.generateSong(id, SongComplexity.MEDIUM);

    // Modify console based on test type
    switch (config) {
      case 'basic-routing':
        // Simple voice → master routing
        song.console.channels.forEach(ch => {
          ch.sends = [];
          ch.inserts = [];
        });
        break;

      case 'parallel-buses':
        // Multiple parallel buses
        song.console.buses.push(
          {
            id: 'bus-par1',
            name: 'Parallel Bus 1',
            volume: 0.8,
            inserts: [],
          },
          {
            id: 'bus-par2',
            name: 'Parallel Bus 2',
            volume: 0.8,
            inserts: [],
          }
        );
        break;

      case 'series-effects':
        // Multiple inserts in series
        song.console.channels.forEach(ch => {
          ch.inserts = [
            { type: 'compressor', parameters: {}, enabled: true },
            { type: 'eq', parameters: {}, enabled: true },
            { type: 'reverb', parameters: {}, enabled: true },
          ];
        });
        break;

      case 'send-effects':
        // Multiple send effects
        song.console.sends = song.console.channels.flatMap(ch =>
          song.console.buses.map(bus => ({
            id: `send-${ch.id}-${bus.id}`,
            fromChannel: ch.id,
            toBus: bus.id,
            amount: 0.3,
          }))
        );
        break;

      case 'automation':
        // Automation configuration
        song.console.channels.forEach(ch => {
          ch.volume = 0.5; // Start at 0.5 for automation
        });
        break;

      case 'group-channels':
        // Grouped channels
        song.console.buses.push({
          id: 'bus-group',
          name: 'Group Bus',
          volume: 0.8,
          inserts: [],
        });
        break;

      case 'external-send':
        // External send effect
        song.console.buses.push({
          id: 'bus-external',
          name: 'External Bus',
          volume: 1.0,
          inserts: [],
        });
        break;

      case 'master-chain':
        // Master chain effects
        song.console.master.inserts = [
          { type: 'compressor', parameters: {}, enabled: true },
          { type: 'eq', parameters: {}, enabled: true },
          { type: 'limiter', parameters: {}, enabled: true },
        ];
        break;
    }

    return song;
  }

  /**
   * Get all instrument types
   */
  private getAllInstrumentTypes(): string[] {
    return [
      'localgal',
      'kanemarco',
      'nexsynth',
      'samsampler',
      'drummachine',
      'basssynth',
      'padgenerator',
    ];
  }

  /**
   * Get random preset for instrument
   */
  private getRandomPreset(instrumentType: string): string {
    const presets: Record<string, string[]> = {
      localgal: ['init', 'pluck', 'pad', 'lead'],
      kanemarco: ['init', 'bass', 'lead', 'pluck'],
      nexsynth: ['init', 'pad', 'lead', 'pluck', 'bass'],
      samsampler: ['piano', 'strings', 'choir', 'percussion'],
      drummachine: ['808', '909', 'acoustic', 'electronic'],
      basssynth: ['sub', 'acid', 'fm', 'simple'],
      padgenerator: ['ambient', 'warm', 'bright', 'dark'],
    };

    const instrumentPresets = presets[instrumentType] || ['init'];
    return this.pickRandom(instrumentPresets);
  }

  /**
   * Pick random item from array
   */
  private pickRandom<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * Determine song complexity from structure
   */
  private determineComplexity(song: SchillingerSong): SongComplexity {
    const voiceCount = song.voices.length;
    const systemCount = song.systems.length;
    const duration = song.structure.duration;

    if (voiceCount === 0 || systemCount === 0) return SongComplexity.EDGE_CASE;
    if (voiceCount === 1 && systemCount === 1 && duration <= 15)
      return SongComplexity.SIMPLE;
    if (voiceCount <= 4 && systemCount <= 3 && duration <= 45)
      return SongComplexity.MEDIUM;
    if (voiceCount >= 8 || systemCount >= 5 || duration >= 60)
      return SongComplexity.COMPLEX;
    return SongComplexity.EDGE_CASE;
  }
}
