/**
 * ConsoleX Profile Registry
 *
 * Stores and manages ConsoleX profiles. Provides preset profiles for
 * standard performance types (Piano, SATB, Techno).
 */

import type { ConsoleXProfile } from './profile.js';
import {
  validateConsoleXProfile,
  cloneConsoleXProfile
} from './profile.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ProfileRegistryOptions {
  readonly profiles?: readonly ConsoleXProfile[];
}

export interface GetProfileResult {
  readonly success: boolean;
  readonly profile?: ConsoleXProfile;
  readonly error?: {
    readonly code: 'NOT_FOUND' | 'INVALID_ID';
    readonly message: string;
  };
}

export interface AddProfileResult {
  readonly success: boolean;
  readonly profile?: ConsoleXProfile;
  readonly error?: {
    readonly code: 'ALREADY_EXISTS' | 'INVALID_DATA';
    readonly message: string;
    readonly details?: unknown;
  };
}

// =============================================================================
// REGISTRY IMPLEMENTATION
// =============================================================================

export class ConsoleXProfileRegistry {
  private profiles: Map<string, ConsoleXProfile>;

  constructor(options?: ProfileRegistryOptions) {
    this.profiles = new Map();

    // Initialize with presets if provided
    if (options?.profiles) {
      options.profiles.forEach(profile => {
        const validation = validateConsoleXProfile(profile);
        if (validation.valid) {
          this.profiles.set(profile.id, cloneConsoleXProfile(profile));
        }
      });
    }
  }

  /**
   * Get a profile by ID
   */
  getProfile(profileId: string): GetProfileResult {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `ConsoleX profile "${profileId}" not found`
        }
      };
    }

    return {
      success: true,
      profile: cloneConsoleXProfile(profile)
    };
  }

  /**
   * Add a new profile to the registry
   */
  addProfile(profile: ConsoleXProfile): AddProfileResult {
    // Validate profile
    const validation = validateConsoleXProfile(profile);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Invalid ConsoleX profile',
          details: validation.errors
        }
      };
    }

    // Check for duplicate ID
    if (this.profiles.has(profile.id)) {
      return {
        success: false,
        error: {
          code: 'ALREADY_EXISTS',
          message: `ConsoleX profile "${profile.id}" already exists`
        }
      };
    }

    // Add to registry
    this.profiles.set(profile.id, cloneConsoleXProfile(profile));

    return {
      success: true,
      profile: cloneConsoleXProfile(profile)
    };
  }

  /**
   * List all profile IDs and names
   */
  listProfiles(): Array<{ id: string; name: string; description?: string }> {
    return Array.from(this.profiles.values()).map(profile => ({
      id: profile.id,
      name: profile.name,
      description: profile.description
    }));
  }

  /**
   * Check if a profile exists
   */
  hasProfile(profileId: string): boolean {
    return this.profiles.has(profileId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ConsoleXProfile[] {
    return Array.from(this.profiles.values()).map(profile =>
      cloneConsoleXProfile(profile)
    );
  }
}

// =============================================================================
// PRESET PROFILES
// =============================================================================

/**
 * Create a solo piano ConsoleX profile
 *
 * Characteristics:
 * - Minimal effects (light reverb)
 * - Low CPU target (30%)
 * - High voice count (64 voices)
 * - Clean routing
 */
export function createSoloPianoConsoleXProfile(): ConsoleXProfile {
  return {
    id: 'consolex-solo-piano',
    name: 'Solo Piano ConsoleX',
    description: 'Clean, minimal mixing for solo piano performances',

    // Master bus: gentle limiting, light EQ
    masterBus: {
      id: 'master',
      name: 'Master',
      gain: 1.0,
      pan: 0.0,
      muted: false,
      soloed: false,
      inserts: [
        {
          id: 'master-limiter',
          type: 'limiter',
          enabled: true,
          parameters: {
            threshold: -0.3,
            ceiling: -0.1,
            release: 10
          }
        },
        {
          id: 'master-eq',
          type: 'eq',
          enabled: true,
          parameters: {
            lowShelfGain: 0,
            highShelfGain: -0.5,
            presence: 0
          }
        }
      ],
      sends: []
    },

    // Voice buses: melody and accompaniment
    voiceBusses: [
      {
        id: 'melody',
        name: 'Melody',
        gain: 0.9,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.15,  // Light reverb
            preFader: false
          }
        ]
      },
      {
        id: 'accompaniment',
        name: 'Accompaniment',
        gain: 0.7,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.12,  // Less reverb on accompaniment
            preFader: false
          }
        ]
      }
    ],

    // Mix buses: reverb only
    mixBusses: [
      {
        id: 'reverb',
        name: 'Reverb',
        gain: 0.8,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'reverb-unit',
            type: 'custom',
            enabled: true,
            parameters: {
              roomSize: 0.3,     // Small room
              decayTime: 1.5,    // Short decay
              damping: 0.5,
              preDelay: 20
            }
          }
        ],
        sends: []
      }
    ],

    // Performance settings
    performance: {
      targetCpuUsage: 30,    // Low CPU target
      maxVoices: 64,         // High polyphony
      voiceStealing: true,
      voiceStealFade: 50     // Fast fade
    },

    createdAt: Date.now(),
    modifiedAt: Date.now()
  };
}

/**
 * Create SATB choir ConsoleX profile
 *
 * Characteristics:
 * - Medium effects (chorus, reverb)
 * - Medium CPU (50%)
 * - Medium voice count (32 voices)
 * - Choir-specific routing
 */
export function createSATBConsoleXProfile(): ConsoleXProfile {
  return {
    id: 'consolex-satb',
    name: 'SATB Choir ConsoleX',
    description: 'Warm, spacious mixing for SATB choir performances',

    // Master bus: gentle compression, limiting
    masterBus: {
      id: 'master',
      name: 'Master',
      gain: 1.0,
      pan: 0.0,
      muted: false,
      soloed: false,
      inserts: [
        {
          id: 'master-compressor',
          type: 'compressor',
          enabled: true,
          parameters: {
            threshold: -12,
            ratio: 2.0,
            attack: 10,
            release: 200,
            makeupGain: 2
          }
        },
        {
          id: 'master-limiter',
          type: 'limiter',
          enabled: true,
          parameters: {
            threshold: -0.5,
            ceiling: -0.1,
            release: 10
          }
        }
      ],
      sends: []
    },

    // Voice buses: soprano, alto, tenor, bass
    voiceBusses: [
      {
        id: 'soprano',
        name: 'Soprano',
        gain: 0.85,
        pan: -0.15,   // Slight left
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.25,
            preFader: false
          },
          {
            busId: 'chorus',
            amount: 0.15,
            preFader: false
          }
        ]
      },
      {
        id: 'alto',
        name: 'Alto',
        gain: 0.85,
        pan: 0.1,    // Slight right
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.25,
            preFader: false
          },
          {
            busId: 'chorus',
            amount: 0.15,
            preFader: false
          }
        ]
      },
      {
        id: 'tenor',
        name: 'Tenor',
        gain: 0.9,
        pan: -0.1,   // Slight left
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.22,
            preFader: false
          },
          {
            busId: 'chorus',
            amount: 0.12,
            preFader: false
          }
        ]
      },
      {
        id: 'bass',
        name: 'Bass',
        gain: 0.95,
        pan: 0.15,   // Slight right
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.20,  // Less reverb on bass
            preFader: false
          },
          {
            busId: 'chorus',
            amount: 0.10,
            preFader: false
          }
        ]
      }
    ],

    // Mix buses: reverb and chorus
    mixBusses: [
      {
        id: 'reverb',
        name: 'Reverb',
        gain: 0.85,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'reverb-unit',
            type: 'custom',
            enabled: true,
            parameters: {
              roomSize: 0.6,     // Medium hall
              decayTime: 2.5,    // Medium decay
              damping: 0.4,
              preDelay: 25
            }
          }
        ],
        sends: []
      },
      {
        id: 'chorus',
        name: 'Chorus',
        gain: 0.7,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'chorus-unit',
            type: 'custom',
            enabled: true,
            parameters: {
              modRate: 0.3,
              modDepth: 0.15,
              mix: 0.5
            }
          }
        ],
        sends: []
      }
    ],

    // Performance settings
    performance: {
      targetCpuUsage: 50,    // Medium CPU target
      maxVoices: 32,         // Medium polyphony
      voiceStealing: true,
      voiceStealFade: 100
    },

    createdAt: Date.now(),
    modifiedAt: Date.now()
  };
}

/**
 * Create ambient techno ConsoleX profile
 *
 * Characteristics:
 * - Heavy effects (delay, reverb, saturation)
 * - High CPU (70%)
 * - Lower voice count (16 voices)
 * - Complex routing with sends
 */
export function createAmbientTechnoConsoleXProfile(): ConsoleXProfile {
  return {
    id: 'consolex-ambient-techno',
    name: 'Ambient Techno ConsoleX',
    description: 'Rich, effects-heavy mixing for ambient techno performances',

    // Master bus: saturation, compression, limiting
    masterBus: {
      id: 'master',
      name: 'Master',
      gain: 1.0,
      pan: 0.0,
      muted: false,
      soloed: false,
      inserts: [
        {
          id: 'master-saturation',
          type: 'saturation',
          enabled: true,
          parameters: {
            drive: 0.3,
            tone: 0.5,
            mix: 0.4
          }
        },
        {
          id: 'master-compressor',
          type: 'compressor',
          enabled: true,
          parameters: {
            threshold: -10,
            ratio: 4.0,
            attack: 5,
            release: 100,
            makeupGain: 4
          }
        },
        {
          id: 'master-limiter',
          type: 'limiter',
          enabled: true,
          parameters: {
            threshold: -0.3,
            ceiling: -0.1,
            release: 5
          }
        }
      ],
      sends: []
    },

    // Voice buses: lead, pad, bass, texture, drums
    voiceBusses: [
      {
        id: 'lead',
        name: 'Lead',
        gain: 0.8,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'lead-compressor',
            type: 'compressor',
            enabled: true,
            parameters: {
              threshold: -15,
              ratio: 3.0,
              attack: 3,
              release: 50,
              makeupGain: 6
            }
          }
        ],
        sends: [
          {
            busId: 'reverb',
            amount: 0.35,
            preFader: false
          },
          {
            busId: 'delay',
            amount: 0.25,
            preFader: false
          }
        ]
      },
      {
        id: 'pad',
        name: 'Pad',
        gain: 0.6,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.50,  // Heavy reverb on pads
            preFader: false
          },
          {
            busId: 'delay',
            amount: 0.20,
            preFader: false
          }
        ]
      },
      {
        id: 'bass',
        name: 'Bass',
        gain: 0.9,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'bass-compressor',
            type: 'compressor',
            enabled: true,
            parameters: {
              threshold: -12,
              ratio: 4.0,
              attack: 5,
              release: 80,
              makeupGain: 3
            }
          },
          {
            id: 'bass-saturation',
            type: 'saturation',
            enabled: true,
            parameters: {
              drive: 0.4,
              tone: 0.3,
              mix: 0.6
            }
          }
        ],
        sends: [
          {
            busId: 'reverb',
            amount: 0.10,  // Minimal reverb on bass
            preFader: false
          }
        ]
      },
      {
        id: 'texture',
        name: 'Texture',
        gain: 0.4,
        pan: 0.3,   // Offset right
        muted: false,
        soloed: false,
        inserts: [],
        sends: [
          {
            busId: 'reverb',
            amount: 0.60,  // Very heavy reverb
            preFader: false
          },
          {
            busId: 'delay',
            amount: 0.40,
            preFader: false
          }
        ]
      },
      {
        id: 'drums',
        name: 'Drums',
        gain: 0.7,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'drum-compressor',
            type: 'compressor',
            enabled: true,
            parameters: {
              threshold: -10,
              ratio: 6.0,
              attack: 1,
              release: 50,
              makeupGain: 4
            }
          }
        ],
        sends: [
          {
            busId: 'reverb',
            amount: 0.20,
            preFader: false
          },
          {
            busId: 'delay',
            amount: 0.15,
            preFader: false
          }
        ]
      }
    ],

    // Mix buses: reverb and delay
    mixBusses: [
      {
        id: 'reverb',
        name: 'Reverb',
        gain: 0.9,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'reverb-unit',
            type: 'custom',
            enabled: true,
            parameters: {
              roomSize: 0.9,     // Large space
              decayTime: 4.0,    // Long decay
              damping: 0.3,
              preDelay: 30
            }
          }
        ],
        sends: []
      },
      {
        id: 'delay',
        name: 'Delay',
        gain: 0.8,
        pan: 0.0,
        muted: false,
        soloed: false,
        inserts: [
          {
            id: 'delay-unit',
            type: 'custom',
            enabled: true,
            parameters: {
              time: 0.5,         // 500ms delay
              feedback: 0.6,
              mix: 0.5,
              sync: true         // Sync to tempo
            }
          }
        ],
        sends: [
          {
            busId: 'reverb',
            amount: 0.30,  // Send delay to reverb
            preFader: false
          }
        ]
      }
    ],

    // Performance settings
    performance: {
      targetCpuUsage: 70,    // High CPU target
      maxVoices: 16,         // Lower polyphony
      voiceStealing: true,
      voiceStealFade: 150    // Slower fade for smooth transitions
    },

    createdAt: Date.now(),
    modifiedAt: Date.now()
  };
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a ConsoleXProfileRegistry with preset profiles
 */
export function createConsoleXProfileRegistryWithPresets(): ConsoleXProfileRegistry {
  return new ConsoleXProfileRegistry({
    profiles: [
      createSoloPianoConsoleXProfile(),
      createSATBConsoleXProfile(),
      createAmbientTechnoConsoleXProfile()
    ]
  });
}

/**
 * Get the default ConsoleX profile ID for a performance name
 */
export function getDefaultConsoleXProfileId(performanceName: string): string {
  switch (performanceName.toLowerCase()) {
    case 'solo piano':
    case 'piano':
      return 'consolex-solo-piano';
    case 'satb':
    case 'choir':
      return 'consolex-satb';
    case 'ambient techno':
    case 'techno':
      return 'consolex-ambient-techno';
    default:
      return 'consolex-solo-piano'; // Default to piano
  }
}
