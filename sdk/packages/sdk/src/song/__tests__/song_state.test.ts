/**
 * Comprehensive SongState Tests
 *
 * Tests for SongStateV1 validation, structure, and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  SongStateV1,
  createMinimalSongState,
  Timeline,
  NoteEvent,
  Automation,
  VoiceAssignment,
  ConsoleModel,
  Bus,
  BusType,
  RoutingMatrix,
  MeteringConfig
} from '../song_state_v1.js';

describe('SongStateV1', () => {
  describe('Creation', () => {
    it('creates minimal song state', () => {
      const state = createMinimalSongState('contract-123');

      expect(state.version).toBe('1.0');
      expect(state.id).toBeDefined();
      expect(state.sourceContractId).toBe('contract-123');
      expect(state.derivationId).toBeDefined();
      expect(state.timeline).toBeDefined();
      expect(state.notes).toEqual([]);
      expect(state.automations).toEqual([]);
      expect(state.duration).toBeGreaterThan(0);
      expect(state.tempo).toBe(120);
      expect(state.timeSignature).toEqual([4, 4]);
      expect(state.sampleRate).toBe(44100);
      expect(state.voiceAssignments).toEqual([]);
      expect(state.console).toBeDefined();
      expect(state.presets).toEqual([]);
      expect(state.derivedAt).toBeDefined();
    });

    it('creates unique IDs for multiple states', async () => {
      const state1 = createMinimalSongState('contract-1');

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const state2 = createMinimalSongState('contract-1');

      expect(state1.id).not.toBe(state2.id);
      expect(state1.derivationId).not.toBe(state2.derivationId);
    });

    it('accepts field overrides', () => {
      const state = createMinimalSongState('contract-1', {
        tempo: 140,
        timeSignature: [3, 4] as [number, number],
        sampleRate: 48000
      });

      expect(state.tempo).toBe(140);
      expect(state.timeSignature).toEqual([3, 4]);
      expect(state.sampleRate).toBe(48000);
    });
  });

  describe('Timeline Validation', () => {
    it('accepts empty timeline', () => {
      const state = createMinimalSongState('contract-1', {
        timeline: {
          sections: [],
          tempo: 120,
          timeSignature: [4, 4]
        }
      });

      expect(state.timeline.sections).toHaveLength(0);
    });

    it('accepts timeline with sections', () => {
      const state = createMinimalSongState('contract-1', {
        timeline: {
          sections: [
            {
              id: 'section-1',
              name: 'Intro',
              startTime: 0,
              duration: 4,
              tempo: 120,
              timeSignature: [4, 4]
            },
            {
              id: 'section-2',
              name: 'Verse',
              startTime: 4,
              duration: 8,
              tempo: 120,
              timeSignature: [4, 4]
            }
          ],
          tempo: 120,
          timeSignature: [4, 4]
        }
      });

      expect(state.timeline.sections).toHaveLength(2);
      expect(state.timeline.sections[0].name).toBe('Intro');
      expect(state.timeline.sections[1].startTime).toBe(4);
    });

    it('accepts various time signatures', () => {
      const timeSignatures: Array<[number, number]> = [
        [2, 4],
        [3, 4],
        [4, 4],
        [6, 8],
        [7, 8],
        [12, 8]
      ];

      timeSignatures.forEach(ts => {
        const state = createMinimalSongState('contract-1', {
          timeline: {
            sections: [],
            tempo: 120,
            timeSignature: ts
          }
        });

        expect(state.timeline.timeSignature).toEqual(ts);
      });
    });

    it('accepts tempo changes', () => {
      const state = createMinimalSongState('contract-1', {
        timeline: {
          sections: [
            {
              id: 'section-1',
              name: 'Slow',
              startTime: 0,
              duration: 4,
              tempo: 60,
              timeSignature: [4, 4]
            },
            {
              id: 'section-2',
              name: 'Fast',
              startTime: 4,
              duration: 4,
              tempo: 180,
              timeSignature: [4, 4]
            }
          ],
          tempo: 120,
          timeSignature: [4, 4]
        }
      });

      expect(state.timeline.sections[0].tempo).toBe(60);
      expect(state.timeline.sections[1].tempo).toBe(180);
    });
  });

  describe('Note Events', () => {
    it('accepts single note', () => {
      const note: NoteEvent = {
        id: 'note-1',
        voiceId: 'voice-1',
        startTime: 0,
        duration: 1,
        pitch: 60,
        velocity: 127
      };

      const state = createMinimalSongState('contract-1', {
        notes: [note]
      });

      expect(state.notes).toHaveLength(1);
      expect(state.notes[0].pitch).toBe(60);
    });

    it('accepts note with derivation', () => {
      const note: NoteEvent = {
        id: 'note-1',
        voiceId: 'voice-1',
        startTime: 0,
        duration: 1,
        pitch: 60,
        velocity: 100,
        derivation: {
          systemType: 'rhythm',
          systemId: 'rhythm-1',
          confidence: 0.95,
          metadata: { generatorIndex: 0 }
        }
      };

      const state = createMinimalSongState('contract-1', {
        notes: [note]
      });

      expect(state.notes[0].derivation).toBeDefined();
      expect(state.notes[0].derivation?.systemType).toBe('rhythm');
      expect(state.notes[0].derivation?.confidence).toBe(0.95);
    });

    it('accepts all derivation types', () => {
      const types: Array<'rhythm' | 'melody' | 'harmony'> = [
        'rhythm',
        'melody',
        'harmony'
      ];

      types.forEach(type => {
        const note: NoteEvent = {
          id: `note-${type}`,
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 60,
          velocity: 100,
          derivation: {
            systemType: type,
            systemId: `${type}-1`,
            confidence: 0.9
          }
        };

        const state = createMinimalSongState('contract-1', {
          notes: [note]
        });

        expect(state.notes[0].derivation?.systemType).toBe(type);
      });
    });

    it('accepts notes across full MIDI range', () => {
      const notes: NoteEvent[] = [
        {
          id: 'note-low',
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 0,
          velocity: 100
        },
        {
          id: 'note-middle',
          voiceId: 'voice-1',
          startTime: 1,
          duration: 1,
          pitch: 60,
          velocity: 100
        },
        {
          id: 'note-high',
          voiceId: 'voice-1',
          startTime: 2,
          duration: 1,
          pitch: 127,
          velocity: 100
        }
      ];

      const state = createMinimalSongState('contract-1', {
        notes
      });

      expect(state.notes).toHaveLength(3);
      expect(state.notes[0].pitch).toBe(0);
      expect(state.notes[1].pitch).toBe(60);
      expect(state.notes[2].pitch).toBe(127);
    });

    it('accepts full velocity range', () => {
      const velocities = [0, 64, 127];

      velocities.forEach((vel, i) => {
        const note: NoteEvent = {
          id: `note-${i}`,
          voiceId: 'voice-1',
          startTime: i,
          duration: 1,
          pitch: 60,
          velocity: vel
        };

        const state = createMinimalSongState('contract-1', {
          notes: [note]
        });

        expect(state.notes[0].velocity).toBe(vel);
      });
    });

    it('handles polyphonic notes (same time, different pitches)', () => {
      const notes: NoteEvent[] = [
        {
          id: 'note-1',
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 60,
          velocity: 100
        },
        {
          id: 'note-2',
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 64,
          velocity: 100
        },
        {
          id: 'note-3',
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 67,
          velocity: 100
        }
      ];

      const state = createMinimalSongState('contract-1', {
        notes
      });

      expect(state.notes).toHaveLength(3);
      expect(state.notes[0].startTime).toBe(0);
      expect(state.notes[1].startTime).toBe(0);
      expect(state.notes[2].startTime).toBe(0);
    });

    it('handles multiple voices', () => {
      const notes: NoteEvent[] = [
        {
          id: 'note-1',
          voiceId: 'voice-1',
          startTime: 0,
          duration: 1,
          pitch: 60,
          velocity: 100
        },
        {
          id: 'note-2',
          voiceId: 'voice-2',
          startTime: 0,
          duration: 1,
          pitch: 48,
          velocity: 100
        },
        {
          id: 'note-3',
          voiceId: 'voice-3',
          startTime: 0,
          duration: 1,
          pitch: 72,
          velocity: 100
        }
      ];

      const state = createMinimalSongState('contract-1', {
        notes
      });

      expect(state.notes).toHaveLength(3);
      expect(state.notes[0].voiceId).toBe('voice-1');
      expect(state.notes[1].voiceId).toBe('voice-2');
      expect(state.notes[2].voiceId).toBe('voice-3');
    });
  });

  describe('Automation', () => {
    it('accepts automation with linear curve', () => {
      const automation: Automation = {
        id: 'auto-1',
        parameter: 'volume',
        points: [
          { time: 0, value: 0, curve: 'linear' },
          { time: 1, value: 1, curve: 'linear' }
        ]
      };

      const state = createMinimalSongState('contract-1', {
        automations: [automation]
      });

      expect(state.automations).toHaveLength(1);
      expect(state.automations[0].points[0].curve).toBe('linear');
    });

    it('accepts all curve types', () => {
      const curves: Array<'linear' | 'exponential' | 'step'> = [
        'linear',
        'exponential',
        'step'
      ];

      curves.forEach(curve => {
        const automation: Automation = {
          id: `auto-${curve}`,
          parameter: 'volume',
          points: [
            { time: 0, value: 0, curve },
            { time: 1, value: 1, curve }
          ]
        };

        const state = createMinimalSongState('contract-1', {
          automations: [automation]
        });

        expect(state.automations[0].points[0].curve).toBe(curve);
      });
    });

    it('accepts points without curve (default)', () => {
      const automation: Automation = {
        id: 'auto-1',
        parameter: 'volume',
        points: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ]
      };

      const state = createMinimalSongState('contract-1', {
        automations: [automation]
      });

      expect(state.automations[0].points[0].curve).toBeUndefined();
    });

    it('accepts multi-point automation', () => {
      const automation: Automation = {
        id: 'auto-1',
        parameter: 'filter',
        points: [
          { time: 0, value: 0, curve: 'linear' },
          { time: 1, value: 0.5, curve: 'linear' },
          { time: 2, value: 1, curve: 'linear' },
          { time: 3, value: 0.5, curve: 'linear' },
          { time: 4, value: 0, curve: 'linear' }
        ]
      };

      const state = createMinimalSongState('contract-1', {
        automations: [automation]
      });

      expect(state.automations[0].points).toHaveLength(5);
    });
  });

  describe('Voice Assignments', () => {
    it('accepts single voice assignment', () => {
      const assignment: VoiceAssignment = {
        voiceId: 'voice-1',
        instrumentId: 'LocalGal',
        presetId: 'piano-preset',
        busId: 'bus-1'
      };

      const state = createMinimalSongState('contract-1', {
        voiceAssignments: [assignment]
      });

      expect(state.voiceAssignments).toHaveLength(1);
      expect(state.voiceAssignments[0].instrumentId).toBe('LocalGal');
    });

    it('accepts multiple voice assignments', () => {
      const assignments: VoiceAssignment[] = [
        {
          voiceId: 'voice-1',
          instrumentId: 'LocalGal',
          presetId: 'piano-preset',
          busId: 'bus-1'
        },
        {
          voiceId: 'voice-2',
          instrumentId: 'KaneMarco',
          presetId: 'synth-preset',
          busId: 'bus-2'
        },
        {
          voiceId: 'voice-3',
          instrumentId: 'SamSampler',
          presetId: 'strings-preset',
          busId: 'bus-3'
        }
      ];

      const state = createMinimalSongState('contract-1', {
        voiceAssignments: assignments
      });

      expect(state.voiceAssignments).toHaveLength(3);
    });
  });

  describe('Console Model', () => {
    it('creates minimal console', () => {
      const state = createMinimalSongState('contract-1');

      expect(state.console.version).toBe('1.0');
      expect(state.console.id).toBeDefined();
      expect(state.console.voiceBusses).toEqual([]);
      expect(state.console.mixBusses).toEqual([]);
      expect(state.console.masterBus).toBeDefined();
      expect(state.console.sendEffects).toEqual([]);
      expect(state.console.routing).toBeDefined();
      expect(state.console.metering).toBeDefined();
    });

    it('accepts voice buses', () => {
      const voiceBusses: Bus[] = [
        {
          id: 'voice-1',
          name: 'Voice 1',
          type: 'voice' as BusType,
          inserts: [],
          gain: 0,
          pan: 0,
          muted: false,
          solo: false
        },
        {
          id: 'voice-2',
          name: 'Voice 2',
          type: 'voice' as BusType,
          inserts: [],
          gain: -3,
          pan: 0.2,
          muted: false,
          solo: false
        }
      ];

      const state = createMinimalSongState('contract-1', {
        console: {
          ...state => state.console,
          voiceBusses
        }
      } as any);

      expect(state.console.voiceBusses).toHaveLength(2);
    });

    it('accepts mix buses', () => {
      const mixBusses: Bus[] = [
        {
          id: 'mix-1',
          name: 'Mix Bus 1',
          type: 'mix' as BusType,
          inserts: [],
          gain: 0,
          pan: 0,
          muted: false,
          solo: false
        },
        {
          id: 'mix-2',
          name: 'Mix Bus 2',
          type: 'mix' as BusType,
          inserts: [],
          gain: 0,
          pan: 0,
          muted: false,
          solo: false
        }
      ];

      const state = createMinimalSongState('contract-1', {
        console: {
          ...state => state.console,
          mixBusses
        }
      } as any);

      expect(state.console.mixBusses).toHaveLength(2);
    });

    it('accepts buses with effects', () => {
      const bus: Bus = {
        id: 'voice-1',
        name: 'Voice 1',
        type: 'voice' as BusType,
        inserts: [
          {
            id: 'eq-1',
            effectType: 'equalizer',
            enabled: true,
            bypassed: false,
            parameters: {
              low: 0,
              mid: 0,
              high: 0
            }
          },
          {
            id: 'comp-1',
            effectType: 'compressor',
            enabled: true,
            bypassed: false,
            parameters: {
              threshold: -20,
              ratio: 4,
              makeup: 0
            }
          }
        ],
        gain: 0,
        pan: 0,
        muted: false,
        solo: false
      };

      const state = createMinimalSongState('contract-1', {
        console: {
          ...state => state.console,
          voiceBusses: [bus]
        }
      } as any);

      expect(state.console.voiceBusses[0].inserts).toHaveLength(2);
    });

    it('accepts routing matrix', () => {
      const routing: RoutingMatrix = {
        routes: [
          {
            sourceBusId: 'voice-1',
            destinationBusId: 'mix-1',
            level: 0.8,
            enabled: true
          },
          {
            sourceBusId: 'voice-2',
            destinationBusId: 'mix-1',
            level: 0.6,
            enabled: true
          },
          {
            sourceBusId: 'mix-1',
            destinationBusId: 'master',
            level: 1.0,
            enabled: true
          }
        ]
      };

      const state = createMinimalSongState('contract-1', {
        console: {
          ...state => state.console,
          routing
        }
      } as any);

      expect(state.console.routing.routes).toHaveLength(3);
    });

    it('accepts send effects', () => {
      const sendEffects = [
        {
          id: 'reverb-1',
          busId: 'mix-1',
          effectType: 'reverb',
          enabled: true,
          parameters: {
            roomSize: 0.7,
            decay: 2.5
          },
          sends: [
            {
              sourceBusId: 'voice-1',
              level: 0.3,
              pan: 0
            },
            {
              sourceBusId: 'voice-2',
              level: 0.2,
              pan: 0
            }
          ]
        }
      ];

      const state = createMinimalSongState('contract-1', {
        console: {
          ...state => state.console,
          sendEffects
        }
      } as any);

      expect(state.console.sendEffects).toHaveLength(1);
      expect(state.console.sendEffects[0].sends).toHaveLength(2);
    });

    it('accepts all metering types', () => {
      const meterTypes: Array<'peak' | 'rms' | 'both'> = [
        'peak',
        'rms',
        'both'
      ];

      meterTypes.forEach(type => {
        const metering: MeteringConfig = {
          enabled: true,
          refreshRate: 30,
          meterType: type,
          holdTime: 1000
        };

        const state = createMinimalSongState('contract-1', {
          console: {
            ...state => state.console,
            metering
          }
        } as any);

        expect(state.console.metering.meterType).toBe(type);
      });
    });
  });

  describe('Serialization', () => {
    it('serializes to JSON', () => {
      const state = createMinimalSongState('contract-1');
      const json = JSON.stringify(state);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json) as SongStateV1;
      expect(parsed.version).toBe('1.0');
      expect(parsed.id).toBe(state.id);
      expect(parsed.sourceContractId).toBe('contract-1');
    });

    it('deserializes from JSON', () => {
      const original = createMinimalSongState('contract-1');
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as SongStateV1;

      expect(parsed.version).toBe(original.version);
      expect(parsed.id).toBe(original.id);
      expect(parsed.sourceContractId).toBe(original.sourceContractId);
    });

    it('preserves all fields through serialization', () => {
      const original = createMinimalSongState('contract-1', {
        notes: [
          {
            id: 'note-1',
            voiceId: 'voice-1',
            startTime: 0,
            duration: 1,
            pitch: 60,
            velocity: 100,
            derivation: {
              systemType: 'rhythm',
              systemId: 'rhythm-1',
              confidence: 0.95
            }
          }
        ],
        tempo: 140,
        timeSignature: [3, 4] as [number, number]
      });

      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as SongStateV1;

      expect(parsed.notes).toEqual(original.notes);
      expect(parsed.tempo).toBe(original.tempo);
      expect(parsed.timeSignature).toEqual(original.timeSignature);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty song (no notes)', () => {
      const state = createMinimalSongState('contract-1', {
        notes: []
      });

      expect(state.notes).toHaveLength(0);
    });

    it('handles large number of notes', () => {
      const notes: NoteEvent[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `note-${i}`,
        voiceId: 'voice-1',
        startTime: i * 0.1,
        duration: 0.5,
        pitch: 60 + (i % 12),
        velocity: 100
      }));

      const state = createMinimalSongState('contract-1', {
        notes
      });

      expect(state.notes).toHaveLength(10000);
    });

    it('handles long duration song', () => {
      const duration = 44100 * 60 * 10; // 10 minutes at 44.1kHz

      const state = createMinimalSongState('contract-1', {
        duration
      });

      expect(state.duration).toBe(duration);
    });

    it('handles different sample rates', () => {
      const sampleRates = [44100, 48000, 96000, 192000];

      sampleRates.forEach(sr => {
        const state = createMinimalSongState('contract-1', {
          sampleRate: sr
        });

        expect(state.sampleRate).toBe(sr);
      });
    });

    it('handles extreme tempo values', () => {
      const tempos = [40, 60, 120, 180, 240, 300];

      tempos.forEach(tempo => {
        const state = createMinimalSongState('contract-1', {
          tempo
        });

        expect(state.tempo).toBe(tempo);
      });
    });

    it('handles note with zero duration', () => {
      const note: NoteEvent = {
        id: 'note-zero',
        voiceId: 'voice-1',
        startTime: 0,
        duration: 0,
        pitch: 60,
        velocity: 100
      };

      const state = createMinimalSongState('contract-1', {
        notes: [note]
      });

      expect(state.notes[0].duration).toBe(0);
    });

    it('handles very long note duration', () => {
      const note: NoteEvent = {
        id: 'note-long',
        voiceId: 'voice-1',
        startTime: 0,
        duration: 1000,
        pitch: 60,
        velocity: 100
      };

      const state = createMinimalSongState('contract-1', {
        notes: [note]
      });

      expect(state.notes[0].duration).toBe(1000);
    });

    it('handles automation with single point', () => {
      const automation: Automation = {
        id: 'auto-single',
        parameter: 'volume',
        points: [
          { time: 0, value: 0.5 }
        ]
      };

      const state = createMinimalSongState('contract-1', {
        automations: [automation]
      });

      expect(state.automations[0].points).toHaveLength(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('handles full orchestration with all components', () => {
      const notes: NoteEvent[] = [
        {
          id: 'note-1',
          voiceId: 'soprano',
          startTime: 0,
          duration: 1,
          pitch: 72,
          velocity: 100
        },
        {
          id: 'note-2',
          voiceId: 'alto',
          startTime: 0,
          duration: 1,
          pitch: 67,
          velocity: 90
        },
        {
          id: 'note-3',
          voiceId: 'tenor',
          startTime: 0,
          duration: 1,
          pitch: 60,
          velocity: 90
        },
        {
          id: 'note-4',
          voiceId: 'bass',
          startTime: 0,
          duration: 1,
          pitch: 48,
          velocity: 100
        }
      ];

      const voiceAssignments: VoiceAssignment[] = [
        {
          voiceId: 'soprano',
          instrumentId: 'NexSynth',
          presetId: 'choir-soprano',
          busId: 'voice-soprano'
        },
        {
          voiceId: 'alto',
          instrumentId: 'NexSynth',
          presetId: 'choir-alto',
          busId: 'voice-alto'
        },
        {
          voiceId: 'tenor',
          instrumentId: 'NexSynth',
          presetId: 'choir-tenor',
          busId: 'voice-tenor'
        },
        {
          voiceId: 'bass',
          instrumentId: 'NexSynth',
          presetId: 'choir-bass',
          busId: 'voice-bass'
        }
      ];

      const automations: Automation[] = [
        {
          id: 'auto-tempo',
          parameter: 'tempo',
          points: [
            { time: 0, value: 60, curve: 'linear' },
            { time: 10, value: 120, curve: 'linear' }
          ]
        }
      ];

      const state = createMinimalSongState('contract-1', {
        notes,
        voiceAssignments,
        automations,
        tempo: 90,
        timeSignature: [4, 4]
      });

      expect(state.notes).toHaveLength(4);
      expect(state.voiceAssignments).toHaveLength(4);
      expect(state.automations).toHaveLength(1);
      expect(state.tempo).toBe(90);
    });
  });
});
