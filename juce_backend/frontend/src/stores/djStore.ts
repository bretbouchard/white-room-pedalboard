import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  DJDeck, 
  DJMixerState, 
  CrossfaderState, 
  CuePoint, 
  LoopRegion, 
  DJEffect, 
  BeatInfo 
} from '@/types';

interface DJState extends DJMixerState {
  // DJ-specific actions
  loadTrackToDeck: (deckId: 'A' | 'B', trackId: string) => void;
  playDeck: (deckId: 'A' | 'B') => void;
  pauseDeck: (deckId: 'A' | 'B') => void;
  cueDeck: (deckId: 'A' | 'B') => void;
  seekDeck: (deckId: 'A' | 'B', position: number) => void;
  
  // Tempo and sync
  adjustTempo: (deckId: 'A' | 'B', adjustment: number) => void;
  setBPM: (deckId: 'A' | 'B', bpm: number) => void;
  toggleKeyLock: (deckId: 'A' | 'B') => void;
  toggleSync: (deckId: 'A' | 'B') => void;
  syncDecks: () => void;
  
  // Crossfader
  setCrossfaderPosition: (position: number) => void;
  setCrossfaderCurve: (curve: CrossfaderState['curve']) => void;
  toggleCrossfaderReverse: () => void;
  
  // EQ and Filter
  setDeckEQ: (deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', value: number) => void;
  toggleEQKill: (deckId: 'A' | 'B', band: 'high' | 'mid' | 'low') => void;
  setDeckFilter: (deckId: 'A' | 'B', cutoff: number, resonance?: number) => void;
  setDeckGain: (deckId: 'A' | 'B', gain: number) => void;
  
  // Cue Points and Loops
  addCuePoint: (deckId: 'A' | 'B', time: number, label?: string, hotCueNumber?: number) => string;
  removeCuePoint: (deckId: 'A' | 'B', cuePointId: string) => void;
  jumpToCuePoint: (deckId: 'A' | 'B', cuePointId: string) => void;
  setLoop: (deckId: 'A' | 'B', startTime: number, endTime: number, beatLength: number) => void;
  toggleLoop: (deckId: 'A' | 'B') => void;
  exitLoop: (deckId: 'A' | 'B') => void;
  
  // Effects
  addEffect: (deckId: 'A' | 'B', effectType: DJEffect['type']) => string;
  removeEffect: (deckId: 'A' | 'B', effectId: string) => void;
  toggleEffect: (deckId: 'A' | 'B', effectId: string) => void;
  setEffectParameter: (deckId: 'A' | 'B', effectId: string, parameter: string, value: number) => void;
  setEffectWet: (deckId: 'A' | 'B', effectId: string, wet: number) => void;
  
  // Cue/Monitor
  setCueVolume: (volume: number) => void;
  toggleCueSplit: () => void;
  setCueActiveDeck: (deck: 'A' | 'B' | 'both') => void;
  
  // Beat detection and analysis
  updateBeatInfo: (deckId: 'A' | 'B', beatInfo: BeatInfo) => void;
  
  // Utility actions
  resetDeck: (deckId: 'A' | 'B') => void;
  initializeDJMode: () => void;
}

const createInitialDeck = (id: string): DJDeck => ({
  id,
  trackId: null,
  isPlaying: false,
  position: 0,
  tempo: {
    bpm: 120,
    adjustment: 0,
    keyLock: false,
    sync: false,
  },
  cuePoints: [],
  activeLoop: null,
  loops: [],
  gain: 0.8,
  eq: {
    high: 0,
    mid: 0,
    low: 0,
    highKill: false,
    midKill: false,
    lowKill: false,
  },
  filter: {
    cutoff: 1,
    resonance: 0,
    type: 'lowpass',
  },
  effects: [],
  waveformData: null,
  beatInfo: null,
});

const initialDJState: DJMixerState = {
  deckA: createInitialDeck('A'),
  deckB: createInitialDeck('B'),
  crossfader: {
    position: 0,
    curve: 'logarithmic',
    reverse: false,
  },
  cue: {
    enabled: false,
    split: false,
    volume: 0.8,
    activeDeck: 'both',
  },
  masterTempo: 120,
  syncMode: 'off',
};

export const useDJStore = create<DJState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialDJState,

        // Track loading
        loadTrackToDeck: (deckId: 'A' | 'B', trackId: string) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                trackId,
                position: 0,
                isPlaying: false,
                cuePoints: [],
                loops: [],
                activeLoop: null,
              },
            }),
            false,
            `dj/loadTrack${deckId}`
          );
        },

        // Playback control
        playDeck: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                isPlaying: true,
              },
            }),
            false,
            `dj/play${deckId}`
          );
        },

        pauseDeck: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                isPlaying: false,
              },
            }),
            false,
            `dj/pause${deckId}`
          );
        },

        cueDeck: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                position: 0,
                isPlaying: false,
              },
            }),
            false,
            `dj/cue${deckId}`
          );
        },

        seekDeck: (deckId: 'A' | 'B', position: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                position: Math.max(0, position),
              },
            }),
            false,
            `dj/seek${deckId}`
          );
        },

        // Tempo and sync
        adjustTempo: (deckId: 'A' | 'B', adjustment: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                tempo: {
                  ...state[deckKey].tempo,
                  adjustment: Math.max(-0.5, Math.min(0.5, adjustment)),
                },
              },
            }),
            false,
            `dj/adjustTempo${deckId}`
          );
        },

        setBPM: (deckId: 'A' | 'B', bpm: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                tempo: {
                  ...state[deckKey].tempo,
                  bpm: Math.max(60, Math.min(200, bpm)),
                },
              },
            }),
            false,
            `dj/setBPM${deckId}`
          );
        },

        toggleKeyLock: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                tempo: {
                  ...state[deckKey].tempo,
                  keyLock: !state[deckKey].tempo.keyLock,
                },
              },
            }),
            false,
            `dj/toggleKeyLock${deckId}`
          );
        },

        toggleSync: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                tempo: {
                  ...state[deckKey].tempo,
                  sync: !state[deckKey].tempo.sync,
                },
              },
            }),
            false,
            `dj/toggleSync${deckId}`
          );
        },

        syncDecks: () => {
          set(
            state => {
              const { deckA, deckB } = state;
              const masterDeck = deckA.tempo.sync ? deckB : deckA;
              const slaveDeck = deckA.tempo.sync ? deckA : deckB;
              const slaveKey = deckA.tempo.sync ? 'deckA' : 'deckB';

              return {
                [slaveKey]: {
                  ...slaveDeck,
                  tempo: {
                    ...slaveDeck.tempo,
                    bpm: masterDeck.tempo.bpm,
                    adjustment: masterDeck.tempo.adjustment,
                  },
                },
              };
            },
            false,
            'dj/syncDecks'
          );
        },

        // Crossfader
        setCrossfaderPosition: (position: number) => {
          set(
            state => ({
              crossfader: {
                ...state.crossfader,
                position: Math.max(-1, Math.min(1, position)),
              },
            }),
            false,
            'dj/setCrossfaderPosition'
          );
        },

        setCrossfaderCurve: (curve: CrossfaderState['curve']) => {
          set(
            state => ({
              crossfader: {
                ...state.crossfader,
                curve,
              },
            }),
            false,
            'dj/setCrossfaderCurve'
          );
        },

        toggleCrossfaderReverse: () => {
          set(
            state => ({
              crossfader: {
                ...state.crossfader,
                reverse: !state.crossfader.reverse,
              },
            }),
            false,
            'dj/toggleCrossfaderReverse'
          );
        },

        // EQ and Filter
        setDeckEQ: (deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', value: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                eq: {
                  ...state[deckKey].eq,
                  [band]: Math.max(-1, Math.min(1, value)),
                },
              },
            }),
            false,
            `dj/setEQ${deckId}`
          );
        },

        toggleEQKill: (deckId: 'A' | 'B', band: 'high' | 'mid' | 'low') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          const killKey = `${band}Kill` as keyof DJDeck['eq'];
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                eq: {
                  ...state[deckKey].eq,
                  [killKey]: !state[deckKey].eq[killKey],
                },
              },
            }),
            false,
            `dj/toggleEQKill${deckId}`
          );
        },

        setDeckFilter: (deckId: 'A' | 'B', cutoff: number, resonance?: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                filter: {
                  ...state[deckKey].filter,
                  cutoff: Math.max(0, Math.min(1, cutoff)),
                  ...(resonance !== undefined && {
                    resonance: Math.max(0, Math.min(1, resonance)),
                  }),
                },
              },
            }),
            false,
            `dj/setFilter${deckId}`
          );
        },

        setDeckGain: (deckId: 'A' | 'B', gain: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                gain: Math.max(0, Math.min(2, gain)),
              },
            }),
            false,
            `dj/setGain${deckId}`
          );
        },

        // Cue Points and Loops
        addCuePoint: (deckId: 'A' | 'B', time: number, label?: string, hotCueNumber?: number) => {
          const id = `cue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          
          const newCuePoint: CuePoint = {
            id,
            time,
            label: label || `Cue ${hotCueNumber || 'Point'}`,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            hotCueNumber: hotCueNumber || 0,
          };

          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                cuePoints: [...state[deckKey].cuePoints, newCuePoint],
              },
            }),
            false,
            `dj/addCuePoint${deckId}`
          );

          return id;
        },

        removeCuePoint: (deckId: 'A' | 'B', cuePointId: string) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                cuePoints: state[deckKey].cuePoints.filter(cp => cp.id !== cuePointId),
              },
            }),
            false,
            `dj/removeCuePoint${deckId}`
          );
        },

        jumpToCuePoint: (deckId: 'A' | 'B', cuePointId: string) => {
          const deck = get()[`deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>];
          const cuePoint = deck.cuePoints.find(cp => cp.id === cuePointId);
          if (cuePoint) {
            get().seekDeck(deckId, cuePoint.time);
          }
        },

        setLoop: (deckId: 'A' | 'B', startTime: number, endTime: number, beatLength: number) => {
          const id = `loop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          
          const newLoop: LoopRegion = {
            id,
            startTime,
            endTime,
            enabled: true,
            beatLength,
          };

          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                activeLoop: newLoop,
                loops: [...state[deckKey].loops, newLoop],
              },
            }),
            false,
            `dj/setLoop${deckId}`
          );
        },

        toggleLoop: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => {
              const deck = state[deckKey];
              if (deck.activeLoop) {
                return {
                  [deckKey]: {
                    ...deck,
                    activeLoop: {
                      ...deck.activeLoop,
                      enabled: !deck.activeLoop.enabled,
                    },
                  },
                };
              }
              return state;
            },
            false,
            `dj/toggleLoop${deckId}`
          );
        },

        exitLoop: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                activeLoop: null,
              },
            }),
            false,
            `dj/exitLoop${deckId}`
          );
        },

        // Effects
        addEffect: (deckId: 'A' | 'B', effectType: DJEffect['type']) => {
          const id = `effect_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          
          const newEffect: DJEffect = {
            id,
            type: effectType,
            enabled: false,
            beatSync: false,
            parameters: {},
            wet: 0.5,
          };

          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                effects: [...state[deckKey].effects, newEffect],
              },
            }),
            false,
            `dj/addEffect${deckId}`
          );

          return id;
        },

        removeEffect: (deckId: 'A' | 'B', effectId: string) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                effects: state[deckKey].effects.filter(e => e.id !== effectId),
              },
            }),
            false,
            `dj/removeEffect${deckId}`
          );
        },

        toggleEffect: (deckId: 'A' | 'B', effectId: string) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                effects: state[deckKey].effects.map(effect =>
                  effect.id === effectId
                    ? { ...effect, enabled: !effect.enabled }
                    : effect
                ),
              },
            }),
            false,
            `dj/toggleEffect${deckId}`
          );
        },

        setEffectParameter: (deckId: 'A' | 'B', effectId: string, parameter: string, value: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                effects: state[deckKey].effects.map(effect =>
                  effect.id === effectId
                    ? {
                        ...effect,
                        parameters: { ...effect.parameters, [parameter]: value },
                      }
                    : effect
                ),
              },
            }),
            false,
            `dj/setEffectParameter${deckId}`
          );
        },

        setEffectWet: (deckId: 'A' | 'B', effectId: string, wet: number) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                effects: state[deckKey].effects.map(effect =>
                  effect.id === effectId
                    ? { ...effect, wet: Math.max(0, Math.min(1, wet)) }
                    : effect
                ),
              },
            }),
            false,
            `dj/setEffectWet${deckId}`
          );
        },

        // Cue/Monitor
        setCueVolume: (volume: number) => {
          set(
            state => ({
              cue: {
                ...state.cue,
                volume: Math.max(0, Math.min(1, volume)),
              },
            }),
            false,
            'dj/setCueVolume'
          );
        },

        toggleCueSplit: () => {
          set(
            state => ({
              cue: {
                ...state.cue,
                split: !state.cue.split,
              },
            }),
            false,
            'dj/toggleCueSplit'
          );
        },

        setCueActiveDeck: (deck: 'A' | 'B' | 'both') => {
          set(
            state => ({
              cue: {
                ...state.cue,
                activeDeck: deck,
              },
            }),
            false,
            'dj/setCueActiveDeck'
          );
        },

        // Beat detection and analysis
        updateBeatInfo: (deckId: 'A' | 'B', beatInfo: BeatInfo) => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            state => ({
              [deckKey]: {
                ...state[deckKey],
                beatInfo,
                tempo: {
                  ...state[deckKey].tempo,
                  bpm: beatInfo.bpm,
                },
              },
            }),
            false,
            `dj/updateBeatInfo${deckId}`
          );
        },

        // Utility actions
        resetDeck: (deckId: 'A' | 'B') => {
          const deckKey = `deck${deckId}` as keyof Pick<DJMixerState, 'deckA' | 'deckB'>;
          set(
            () => ({
              [deckKey]: createInitialDeck(deckId),
            }),
            false,
            `dj/resetDeck${deckId}`
          );
        },

        initializeDJMode: () => {
          set(
            () => ({
              ...initialDJState,
            }),
            false,
            'dj/initializeDJMode'
          );
        },
      }),
      {
        name: 'daw-dj-store',
        partialize: state => ({
          crossfader: state.crossfader,
          cue: state.cue,
          masterTempo: state.masterTempo,
          syncMode: state.syncMode,
        }),
      }
    ),
    { name: 'DJStore' }
  )
);