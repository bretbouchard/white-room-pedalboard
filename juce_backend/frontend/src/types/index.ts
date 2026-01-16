// Core type definitions for the DAW UI

export interface AudioLevel {
  peak: number;
  rms: number;
  lufs?: number;
}

export interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  onInteractionStart?: (value: number) => void;
  onInteractionEnd?: (value: number) => void;
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  onInteractionStart?: (value: number) => void;
  onInteractionEnd?: (value: number) => void;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  disabled?: boolean;
  className?: string;
}

export interface LevelMeterProps {
  level: AudioLevel;
  orientation?: 'horizontal' | 'vertical';
  height?: number;
  width?: number;
  showPeak?: boolean;
  showRMS?: boolean;
}

export interface WaveformData {
  peaks: Float32Array;
  length: number;
  sampleRate: number;
}

export interface SpectrumData {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  binCount: number;
}

// Component size variants
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';

// Component variants
export type ComponentVariant = 'primary' | 'secondary' | 'accent' | 'danger';

// Common component props
export interface BaseComponentProps {
  className: string;
  size?: ComponentSize;
  variant?: ComponentVariant;
  disabled?: boolean;
}

// Re-export plugin types
export * from './plugins';

// DJ-specific types
export interface CuePoint {
  id: string;
  time: number; // in seconds
  label: string;
  color: string;
  hotCueNumber?: number; // 1-8 for hot cues
}

export interface LoopRegion {
  id: string;
  startTime: number;
  endTime: number;
  enabled: boolean;
  beatLength: number; // length in beats
}

export interface BeatInfo {
  bpm: number;
  confidence: number;
  beatPositions: number[]; // array of beat positions in seconds
  downbeats: number[]; // array of downbeat positions in seconds
  timeSignature: [number, number];
}

export interface DJDeck {
  id: string;
  trackId: string | null;
  isPlaying: boolean;
  position: number; // playhead position in seconds
  tempo: {
    bpm: number;
    adjustment: number; // -50% to +50%
    keyLock: boolean;
    sync: boolean;
  };
  cuePoints: CuePoint[];
  activeLoop: LoopRegion | null;
  loops: LoopRegion[];
  gain: number; // 0-1
  eq: {
    high: number; // -1 to 1
    mid: number;
    low: number;
    highKill: boolean;
    midKill: boolean;
    lowKill: boolean;
  };
  filter: {
    cutoff: number; // 0-1
    resonance: number; // 0-1
    type: 'lowpass' | 'highpass' | 'bandpass';
  };
  effects: DJEffect[];
  waveformData: WaveformData | null;
  beatInfo: BeatInfo | null;
}

export interface DJEffect {
  id: string;
  type: 'echo' | 'flanger' | 'phaser' | 'reverb' | 'bitcrusher' | 'filter';
  enabled: boolean;
  beatSync: boolean;
  parameters: Record<string, number>;
  wet: number; // 0-1 dry/wet mix
}

export interface CrossfaderState {
  position: number; // -1 (A) to 1 (B)
  curve: 'linear' | 'logarithmic' | 'exponential';
  reverse: boolean;
}

export interface DJMixerState {
  deckA: DJDeck;
  deckB: DJDeck;
  crossfader: CrossfaderState;
  cue: {
    enabled: boolean;
    split: boolean; // true for split cue (A in left ear, B in right)
    volume: number; // 0-1
    activeDeck: 'A' | 'B' | 'both';
  };
  masterTempo: number;
  syncMode: 'off' | 'tempo' | 'beat' | 'bar';
}

// Re-export composition types
export * from './composition';
