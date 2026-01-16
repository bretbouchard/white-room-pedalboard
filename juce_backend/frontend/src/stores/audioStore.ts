import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AudioLevel, SpectrumData, WaveformData } from '@/types';
import { getAudioEngineClient } from '@/lib/audio-engine/AudioEngineClient';

interface AudioRegion {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  waveformData?: WaveformData;
  color?: string;
  selected?: boolean;
  muted?: boolean;
  fadeIn?: number; // in seconds
  fadeOut?: number; // in seconds
  gain?: number; // in dB
  file?: {
    path: string;
    sampleRate: number;
    channels: number;
  };
}

interface MidiNote {
  pitch: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  startTime: number; // in seconds, relative to region
  duration: number; // in seconds
}

interface MidiRegion {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  notes: MidiNote[];
  color?: string;
  selected?: boolean;
  muted?: boolean;
}

interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument';
  muted: boolean;
  solo: boolean;
  volume: number; // 0-1
  pan: number; // -1 to 1
  color: string;
  plugins: string[];
  armed: boolean;
  height: number; // UI display height in pixels
  audioRegions: AudioRegion[];
  midiRegions: MidiRegion[];
  // New properties for AI control
  eq: { highGain: number; midGain: number; lowGain: number };
  compression: { threshold: number; ratio: number; attack: number; release: number };
  reverb: { sendLevel: number; decayTime: number };
}

interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number; // in seconds
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  tempo: number;
  timeSignature: [number, number]; // [numerator, denominator]
}

interface MixerState {
  masterVolume: number;
  masterMuted: boolean;
  tracks: Record<string, Track>;
  selectedTrackId: string | null;
  soloedTracks: string[];
  // New properties for AI control
  masterEQ: { highGain: number; midGain: number; lowGain: number };
  limiter: { enabled: boolean; threshold: number; release: number };
}

interface AudioAnalysisState {
  masterLevel: AudioLevel;
  trackLevels: Record<string, AudioLevel>;
  spectrumData: SpectrumData | null;
  lastAnalysisTime: number;
}

interface AudioState {
  currentProjectFile: string | null;
  transport: TransportState;
  mixer: MixerState;
  analysis: AudioAnalysisState;

  // Project actions
  setCurrentProjectFile: (path: string | null) => void;

  // Transport actions
  play: () => void;
  stop: () => void;
  record: () => void;
  seek: (time: number) => void;
  setTempo: (tempo: number) => void;
  setTimeSignature: (numerator: number, denominator: number) => void;
  setLoop: (start: number, end: number, enabled: boolean) => void;

  // Mixer actions
  addTrack: (type: Track['type'], name?: string) => Promise<string>;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  selectTrack: (trackId: string | null) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  setMasterVolume: (volume: number) => void;
  toggleMasterMute: () => void;

  // New Mixer actions for AI control
  setTrackEQ: (trackId: string, eq: { highGain?: number; midGain?: number; lowGain?: number }) => void;
  setTrackCompression: (trackId: string, compression: { threshold?: number; ratio?: number; attack?: number; release?: number }) => void;
  setTrackReverb: (trackId: string, reverb: { sendLevel?: number; decayTime?: number }) => void;
  setMasterEQ: (eq: { highGain?: number; midGain?: number; lowGain?: number }) => void;
  setLimiter: (limiter: { enabled?: boolean; threshold?: number; release?: number }) => void;

  // Region actions
  addAudioRegion: (trackId: string, region: Omit<AudioRegion, 'id'>) => Promise<string>;
  addMidiRegion: (trackId: string, region: Omit<MidiRegion, 'id'>) => string;
  removeRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi') => void;
  updateAudioRegion: (trackId: string, regionId: string, updates: Partial<AudioRegion>) => void;
  updateMidiRegion: (trackId: string, regionId: string, updates: Partial<MidiRegion>) => void;
  moveRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', newStartTime: number) => void;
  resizeRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', newDuration: number, resizeEnd: 'start' | 'end') => void;
  splitRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', splitTime: number) => void;

  // Analysis actions
  updateMasterLevel: (level: AudioLevel) => void;
  updateTrackLevel: (trackId: string, level: AudioLevel) => void;
  updateSpectrumData: (data: SpectrumData) => void;

  // Development/Demo actions
  initializeSampleData: () => void;

  // Backend synchronization actions
  initializeBackendSync: () => void;
  syncTrackWithBackend: (trackId: string) => void;

  // Export actions
  exportProject: (projectId: string, format?: string, quality?: string) => Promise<{success: boolean, export_path?: string, error?: string}>;
  exportFile: (fileId: string, format?: string) => Promise<{success: boolean, export_path?: string, error?: string}>;
  getExportProgress: (exportId: string) => Promise<{progress: number, status: string, current_step: string, error_message?: string, output_path?: string}>;
  cancelExport: (exportId: string) => Promise<{success: boolean}>;
  getSupportedFormats: () => Promise<{formats: Array<{format: string, name: string, description: string, extension: string}>}>;

  // Performance optimization actions
  optimizeWorkflow: (workflowData: any) => Promise<any>;
  getPerformanceStatus: () => Promise<any>;
  getPerformanceDashboard: () => Promise<any>;
  cacheWorkflow: (workflowId: string, workflowData: any, ttlSeconds?: number) => Promise<{success: boolean}>;
  getCachedWorkflow: (workflowId: string) => Promise<any>;
  startPerformanceMonitoring: (intervalSeconds?: number) => Promise<{success: boolean}>;
  stopPerformanceMonitoring: () => Promise<{success: boolean}>;
}

const initialTransportState: TransportState = {
  isPlaying: false,
  isRecording: false,
  currentTime: 0,
  loopStart: 0,
  loopEnd: 60,
  loopEnabled: false,
  tempo: 120,
  timeSignature: [4, 4],
};

const initialMixerState: MixerState = {
  masterVolume: 0.8,
  masterMuted: false,
  tracks: {},
  selectedTrackId: null,
  soloedTracks: [],
  masterEQ: { highGain: 0, midGain: 0, lowGain: 0 }, // Initialize Master EQ
  limiter: { enabled: false, threshold: -1, release: 100 }, // Initialize Limiter
};

const initialAnalysisState: AudioAnalysisState = {
  masterLevel: { peak: 0, rms: 0, lufs: -60 },
  trackLevels: {},
  spectrumData: null,
  lastAnalysisTime: 0,
};

export const useAudioStore = create<AudioState>()(
  devtools(
    persist(
      (set, get) => ({
        currentProjectFile: null,
        transport: initialTransportState,
        mixer: initialMixerState,
        analysis: initialAnalysisState,

        // Project actions
        setCurrentProjectFile: (path: string | null) => {
          set({ currentProjectFile: path }, false, 'project/setFile');
        },

        // Transport actions
        play: () => {
          set(
            state => ({
              transport: {
                ...state.transport,
                isPlaying: true,
                isRecording: false,
              },
            }),
            false,
            'transport/play'
          );
        },

        stop: () => {
          set(
            state => ({
              transport: {
                ...state.transport,
                isPlaying: false,
                isRecording: false,
              },
            }),
            false,
            'transport/stop'
          );
        },

        record: () => {
          set(
            state => ({
              transport: {
                ...state.transport,
                isRecording: true,
                isPlaying: true,
              },
            }),
            false,
            'transport/record'
          );
        },

        seek: (time: number) => {
          set(
            state => ({
              transport: { ...state.transport, currentTime: time },
            }),
            false,
            'transport/seek'
          );
        },

        setTempo: (tempo: number) => {
          set(
            state => ({
              transport: { ...state.transport, tempo },
            }),
            false,
            'transport/setTempo'
          );
        },

        setTimeSignature: (numerator: number, denominator: number) => {
          set(
            state => ({
              transport: { ...state.transport, timeSignature: [numerator, denominator] },
            }),
            false,
            'transport/setTimeSignature'
          );
        },

        setLoop: (start: number, end: number, enabled: boolean) => {
          set(
            state => ({
              transport: {
                ...state.transport,
                loopStart: start,
                loopEnd: end,
                loopEnabled: enabled,
              },
            }),
            false,
            'transport/setLoop'
          );
        },

        // Mixer actions
        addTrack: async (type: Track['type'], name?: string) => {
          const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const trackName =
            name ||
            `${type.charAt(0).toUpperCase() + type.slice(1)} ${Object.keys(get().mixer.tracks).length + 1}`;

          const newTrack: Track = {
            id,
            name: trackName,
            type,
            muted: false,
            solo: false,
            volume: 0.8,
            pan: 0,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            plugins: [],
            armed: false,
            height: 80, // Default track height
            audioRegions: [],
            midiRegions: [],
            eq: { highGain: 0, midGain: 0, lowGain: 0 }, // Initialize EQ
            compression: { threshold: -18, ratio: 3, attack: 20, release: 100 }, // Initialize Compression
            reverb: { sendLevel: 0, decayTime: 1.5 }, // Initialize Reverb
          };

          // Update local state immediately for responsiveness
          set(
            state => ({
              mixer: {
                ...state.mixer,
                tracks: { ...state.mixer.tracks, [id]: newTrack },
                selectedTrackId: id,
              },
            }),
            false,
            'mixer/addTrack'
          );

          // Persist to backend via WebSocket
          try {
            const audioClient = getAudioEngineClient();
            console.log('Sending WebSocket track_add message:', {
              track_id: id,
              type,
              name: trackName
            });
            await audioClient.sendWebSocketRequest('track_add', {
              track_id: id,  // Backend expects track_id field
              type,
              name: trackName
            });
            console.log('WebSocket track_add message sent successfully');
          } catch (error) {
            console.error('Failed to persist track to backend:', error);
            // Keep the local track even if backend sync fails
          }

          return id;
        },

        removeTrack: (trackId: string) => {
          // Update local state immediately for responsiveness
          set(
            state => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [trackId]: _removed, ...remainingTracks } =
                state.mixer.tracks;
              return {
                mixer: {
                  ...state.mixer,
                  tracks: remainingTracks,
                  selectedTrackId:
                    state.mixer.selectedTrackId === trackId
                      ? null
                      : state.mixer.selectedTrackId,
                  soloedTracks: state.mixer.soloedTracks.filter(
                    id => id !== trackId
                  ),
                },
                analysis: {
                  ...state.analysis,
                  trackLevels: Object.fromEntries(
                    Object.entries(state.analysis.trackLevels).filter(
                      ([id]) => id !== trackId
                    )
                  ),
                },
              };
            },
            false,
            'mixer/removeTrack'
          );

          // Send delete request to backend via WebSocket
          try {
            const audioClient = getAudioEngineClient();
            audioClient.sendWebSocketRequest('track_remove', {
              track_id: trackId
            }).catch(error => {
              console.error('Failed to delete track from backend:', error);
              // Could optionally rollback local state on failure
            });
          } catch (error) {
            console.error('Failed to send track delete request:', error);
          }
        },

        updateTrack: (trackId: string, updates: Partial<Track>) => {
          set(
            state => {
              const existingTrack = state.mixer.tracks[trackId];
              if (!existingTrack) return state;

              return {
                ...state,
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: { ...existingTrack, ...updates },
                  },
                },
              };
            },
            false,
            'mixer/updateTrack'
          );
        },

        selectTrack: (trackId: string | null) => {
          set(
            state => ({
              mixer: { ...state.mixer, selectedTrackId: trackId },
            }),
            false,
            'mixer/selectTrack'
          );
        },

        setTrackVolume: (trackId: string, volume: number) => {
          get().updateTrack(trackId, {
            volume: Math.max(0, Math.min(1, volume)),
          });
        },

        setTrackPan: (trackId: string, pan: number) => {
          get().updateTrack(trackId, { pan: Math.max(-1, Math.min(1, pan)) });
        },

        toggleTrackMute: (trackId: string) => {
          const track = get().mixer.tracks[trackId];
          if (track) {
            get().updateTrack(trackId, { muted: !track.muted });
          }
        },

        toggleTrackSolo: (trackId: string) => {
          const track = get().mixer.tracks[trackId];
          if (!track) return;

          set(
            state => {
              const soloedTracks = track.solo
                ? state.mixer.soloedTracks.filter(id => id !== trackId)
                : [...state.mixer.soloedTracks, trackId];

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: { ...track, solo: !track.solo },
                  },
                  soloedTracks,
                },
              };
            },
            false,
            'mixer/toggleTrackSolo'
          );
        },

        setMasterVolume: (volume: number) => {
          set(
            state => ({
              mixer: {
                ...state.mixer,
                masterVolume: Math.max(0, Math.min(1, volume)),
              },
            }),
            false,
            'mixer/setMasterVolume'
          );
        },

        toggleMasterMute: () => {
          set(
            state => ({
              mixer: { ...state.mixer, masterMuted: !state.mixer.masterMuted },
            }),
            false,
            'mixer/toggleMasterMute'
          );
        },

        setTrackEQ: (trackId: string, eq: { highGain?: number; midGain?: number; lowGain?: number; }) => {
          set(state => {
            const track = state.mixer.tracks[trackId];
            if (!track) return state;
            return {
              mixer: {
                ...state.mixer,
                tracks: {
                  ...state.mixer.tracks,
                  [trackId]: {
                    ...track,
                    eq: { ...track.eq, ...eq },
                  },
                },
              },
            };
          }, false, 'mixer/setTrackEQ');
        },

        setTrackCompression: (trackId: string, compression: { threshold?: number; ratio?: number; attack?: number; release?: number; }) => {
          set(state => {
            const track = state.mixer.tracks[trackId];
            if (!track) return state;
            return {
              mixer: {
                ...state.mixer,
                tracks: {
                  ...state.mixer.tracks,
                  [trackId]: {
                    ...track,
                    compression: { ...track.compression, ...compression },
                  },
                },
              },
            };
          }, false, 'mixer/setTrackCompression');
        },

        setTrackReverb: (trackId: string, reverb: { sendLevel?: number; decayTime?: number; }) => {
          set(state => {
            const track = state.mixer.tracks[trackId];
            if (!track) return state;
            return {
              mixer: {
                ...state.mixer,
                tracks: {
                  ...state.mixer.tracks,
                  [trackId]: {
                    ...track,
                    reverb: { ...track.reverb, ...reverb },
                  },
                },
              },
            };
          }, false, 'mixer/setTrackReverb');
        },

        setMasterEQ: (eq: { highGain?: number; midGain?: number; lowGain?: number; }) => {
          set(state => ({
            mixer: {
              ...state.mixer,
              masterEQ: { ...state.mixer.masterEQ, ...eq },
            },
          }), false, 'mixer/setMasterEQ');
        },

        setLimiter: (limiter: { enabled?: boolean; threshold?: number; release?: number; }) => {
          set(state => ({
            mixer: {
              ...state.mixer,
              limiter: { ...state.mixer.limiter, ...limiter },
            },
          }), false, 'mixer/setLimiter');
        },

        // Region actions
        addAudioRegion: async (trackId: string, region: Omit<AudioRegion, 'id'>) => {
          const id = `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newRegion: AudioRegion = { ...region, id };

          // Update local state immediately for responsiveness
          set(
            state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      audioRegions: [...track.audioRegions, newRegion],
                    },
                  },
                },
              };
            },
            false,
            'mixer/addAudioRegion'
          );

          // Persist to backend if it's a real audio region with file
          if (region.file && region.file.path) {
            try {
              const audioClient = getAudioEngineClient();
              // Extract fileId from file path or use a placeholder for now
              // This would need to be enhanced to handle actual file uploads
              await audioClient.createAudioRegion(trackId, 'placeholder_file_id', region.startTime, region.duration, {
                name: region.name,
                gain: region.gain || 1,
              });
            } catch (error) {
              console.error('Failed to persist audio region to backend:', error);
            }
          }

          return id;
        },

        addMidiRegion: (trackId: string, region: Omit<MidiRegion, 'id'>) => {
          const id = `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newRegion: MidiRegion = { ...region, id };

          set(
            state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      midiRegions: [...track.midiRegions, newRegion],
                    },
                  },
                },
              };
            },
            false,
            'mixer/addMidiRegion'
          );

          return id;
        },

        removeRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi') => {
          set(
            state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      audioRegions: regionType === 'audio' 
                        ? track.audioRegions.filter(r => r.id !== regionId)
                        : track.audioRegions,
                      midiRegions: regionType === 'midi'
                        ? track.midiRegions.filter(r => r.id !== regionId)
                        : track.midiRegions,
                    },
                  },
                },
              };
            },
            false,
            'mixer/removeRegion'
          );
        },

        updateAudioRegion: (trackId: string, regionId: string, updates: Partial<AudioRegion>) => {
          set(
            state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      audioRegions: track.audioRegions.map(region =>
                        region.id === regionId ? { ...region, ...updates } : region
                      ),
                    },
                  },
                },
              };
            },
            false,
            'mixer/updateAudioRegion'
          );
        },

        updateMidiRegion: (trackId: string, regionId: string, updates: Partial<MidiRegion>) => {
          set(
            state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      midiRegions: track.midiRegions.map(region =>
                        region.id === regionId ? { ...region, ...updates } : region
                      ),
                    },
                  },
                },
              };
            },
            false,
            'mixer/updateMidiRegion'
          );
        },

        moveRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', newStartTime: number) => {
          if (regionType === 'audio') {
            get().updateAudioRegion(trackId, regionId, { startTime: newStartTime });
          } else {
            get().updateMidiRegion(trackId, regionId, { startTime: newStartTime });
          }
        },

        resizeRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', newDuration: number, resizeEnd: 'start' | 'end') => {
          const track = get().mixer.tracks[trackId];
          if (!track) return;

          if (regionType === 'audio') {
            const region = track.audioRegions.find(r => r.id === regionId);
            if (!region) return;

            if (resizeEnd === 'start') {
              const newStartTime = region.startTime + (region.duration - newDuration);
              get().updateAudioRegion(trackId, regionId, { 
                startTime: newStartTime, 
                duration: newDuration 
              });
            } else {
              get().updateAudioRegion(trackId, regionId, { duration: newDuration });
            }
          } else {
            const region = track.midiRegions.find(r => r.id === regionId);
            if (!region) return;

            if (resizeEnd === 'start') {
              const newStartTime = region.startTime + (region.duration - newDuration);
              const splitPoint = region.duration - newDuration;
              const filteredNotes = region.notes
                .filter(note => note.startTime >= splitPoint)
                .map(note => ({ ...note, startTime: note.startTime - splitPoint }));
              
              get().updateMidiRegion(trackId, regionId, { 
                startTime: newStartTime, 
                duration: newDuration,
                notes: filteredNotes
              });
            } else {
              const filteredNotes = region.notes.filter(note => note.startTime < newDuration);
              get().updateMidiRegion(trackId, regionId, { 
                duration: newDuration,
                notes: filteredNotes
              });
            }
          }
        },

        splitRegion: (trackId: string, regionId: string, regionType: 'audio' | 'midi', splitTime: number) => {
          const track = get().mixer.tracks[trackId];
          if (!track) return;

          if (regionType === 'audio') {
            const region = track.audioRegions.find(r => r.id === regionId);
            if (!region) return;

            const splitPoint = splitTime - region.startTime;
            if (splitPoint <= 0 || splitPoint >= region.duration) return;

            // Update original region
            get().updateAudioRegion(trackId, regionId, { duration: splitPoint });

            // Create new region
            get().addAudioRegion(trackId, {
              name: `${region.name} (2)`,
              startTime: splitTime,
              duration: region.duration - splitPoint,
              color: region.color || '#3b82f6',
              waveformData: region.waveformData,
              fadeIn: 0,
              fadeOut: region.fadeOut || 0,
              gain: region.gain || 1,
              file: region.file || { path: '', sampleRate: 44100, channels: 2 },
            });
          } else {
            const region = track.midiRegions.find(r => r.id === regionId);
            if (!region) return;

            const splitPoint = splitTime - region.startTime;
            if (splitPoint <= 0 || splitPoint >= region.duration) return;

            // Update original region
            const firstHalfNotes = region.notes.filter(note => note.startTime < splitPoint);
            get().updateMidiRegion(trackId, regionId, { 
              duration: splitPoint,
              notes: firstHalfNotes
            });

            // Create new region
            const secondHalfNotes = region.notes
              .filter(note => note.startTime >= splitPoint)
              .map(note => ({ ...note, startTime: note.startTime - splitPoint }));

            get().addMidiRegion(trackId, {
              name: `${region.name} (2)`,
              startTime: splitTime,
              duration: region.duration - splitPoint,
              notes: secondHalfNotes,
              color: region.color || '#3b82f6',
            });
          }
        },

        // Analysis actions
        updateMasterLevel: (level: AudioLevel) => {
          set(
            state => ({
              analysis: {
                ...state.analysis,
                masterLevel: level,
                lastAnalysisTime: Date.now(),
              },
            }),
            false,
            'analysis/updateMasterLevel'
          );
        },

        updateTrackLevel: (trackId: string, level: AudioLevel) => {
          set(
            state => ({
              analysis: {
                ...state.analysis,
                trackLevels: {
                  ...state.analysis.trackLevels,
                  [trackId]: level,
                },
                lastAnalysisTime: Date.now(),
              },
            }),
            false,
            'analysis/updateTrackLevel'
          );
        },

        updateSpectrumData: (data: SpectrumData) => {
          set(
            state => ({
              analysis: {
                ...state.analysis,
                spectrumData: data,
                lastAnalysisTime: Date.now(),
              },
            }),
            false,
            'analysis/updateSpectrumData'
          );
        },

        // Development/Demo actions - DISABLED for real backend integration
        initializeSampleData: async () => {
          console.log('initializeSampleData: Disabled - using real backend data instead');
          // Real tracks should be loaded through WebSocket events from the backend
          // This function is kept for compatibility but does not create fake data
        },

        // Backend synchronization actions
        initializeBackendSync: () => {
          const audioClient = getAudioEngineClient();

          // Set up WebSocket message handlers for incoming backend updates
          audioClient.on('track.add', (data: { trackId: string; track: any }) => {
            set(state => ({
              mixer: {
                ...state.mixer,
                tracks: {
                  ...state.mixer.tracks,
                  [data.trackId]: { ...data.track, audioRegions: [], midiRegions: [] },
                },
                selectedTrackId: data.trackId,
              },
            }), false, 'backend/trackAdded');
          });

          audioClient.on('track.remove', (data: { trackId: string }) => {
            set(state => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [data.trackId]: _removed, ...remainingTracks } = state.mixer.tracks;
              return {
                mixer: {
                  ...state.mixer,
                  tracks: remainingTracks,
                  selectedTrackId: state.mixer.selectedTrackId === data.trackId ? null : state.mixer.selectedTrackId,
                  soloedTracks: state.mixer.soloedTracks.filter(id => id !== data.trackId),
                },
                analysis: {
                  ...state.analysis,
                  trackLevels: Object.fromEntries(
                    Object.entries(state.analysis.trackLevels).filter(([id]) => id !== data.trackId)
                  ),
                },
              };
            }, false, 'backend/trackRemoved');
          });

          audioClient.on('track.update', (data: { trackId: string; updates: any }) => {
            set(state => {
              const existingTrack = state.mixer.tracks[data.trackId];
              if (!existingTrack) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [data.trackId]: { ...existingTrack, ...data.updates },
                  },
                },
              };
            }, false, 'backend/trackUpdated');
          });

          audioClient.on('audio.region.created', (data: { region_id: string; region: any }) => {
            set(state => {
              const track = state.mixer.tracks[data.region.track_id];
              if (!track) return state;

              const newRegion = {
                id: data.region_id,
                ...data.region,
                startTime: data.region.start_time,
                duration: data.region.duration,
              };

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [data.region.track_id]: {
                      ...track,
                      audioRegions: [...track.audioRegions, newRegion],
                    },
                  },
                },
              };
            }, false, 'backend/audioRegionCreated');
          });

          audioClient.on('audio.region.removed', (data: { region_id: string }) => {
            set(state => {
              const updatedTracks = { ...state.mixer.tracks };

              for (const trackId in updatedTracks) {
                const track = updatedTracks[trackId];
                updatedTracks[trackId] = {
                  ...track,
                  audioRegions: track.audioRegions.filter(r => r.id !== data.region_id),
                };
              }

              return {
                mixer: {
                  ...state.mixer,
                  tracks: updatedTracks,
                },
              };
            }, false, 'backend/audioRegionRemoved');
          });

          audioClient.on('audio.region.updated', (data: { region_id: string; updates: any }) => {
            set(state => {
              const updatedTracks = { ...state.mixer.tracks };

              for (const trackId in updatedTracks) {
                const track = updatedTracks[trackId];
                const regionIndex = track.audioRegions.findIndex(r => r.id === data.region_id);

                if (regionIndex !== -1) {
                  const updatedRegion = {
                    ...track.audioRegions[regionIndex],
                    ...data.updates
                  };

                  // Convert start_time and duration back to startTime and duration for frontend
                  if (data.updates.start_time !== undefined) {
                    updatedRegion.startTime = data.updates.start_time;
                  }
                  if (data.updates.duration !== undefined) {
                    updatedRegion.duration = data.updates.duration;
                  }

                  track.audioRegions[regionIndex] = updatedRegion;
                }
              }

              return {
                mixer: {
                  ...state.mixer,
                  tracks: updatedTracks,
                },
              };
            }, false, 'backend/audioRegionUpdated');
          });
        },

        syncTrackWithBackend: async (trackId: string) => {
          const audioClient = getAudioEngineClient();
          try {
            const result = await audioClient.getAudioRegions(trackId);
            // Update local state with backend regions
            set(state => {
              const track = state.mixer.tracks[trackId];
              if (!track) return state;

              return {
                mixer: {
                  ...state.mixer,
                  tracks: {
                    ...state.mixer.tracks,
                    [trackId]: {
                      ...track,
                      audioRegions: result.regions.map((region: any) => ({
                        id: region.id,
                        name: region.name,
                        startTime: region.start_time,
                        duration: region.duration,
                        waveformData: region.waveform_data,
                        color: region.color,
                        selected: region.selected,
                        muted: region.muted,
                        fadeIn: region.fade_in,
                        fadeOut: region.fade_out,
                        gain: region.gain,
                        file: region.file,
                      })),
                    },
                  },
                },
              };
            }, false, 'backend/syncTrackRegions');
          } catch (error) {
            console.error('Failed to sync track with backend:', error);
          }
        },

        // Export actions
        exportProject: async (projectId: string, format = 'wav', quality = 'high') => {
          try {
            const response = await fetch(`/api/export/project/${projectId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ format, quality }),
            });

            if (!response.ok) {
              throw new Error(`Export failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, export_path: result.export_path };
          } catch (error) {
            console.error('Project export error:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },

        exportFile: async (fileId: string, format = 'wav') => {
          try {
            const response = await fetch(`/api/export/file/${fileId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ format }),
            });

            if (!response.ok) {
              throw new Error(`Export failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, export_path: result.export_path };
          } catch (error) {
            console.error('File export error:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },

        getExportProgress: async (exportId: string) => {
          try {
            const response = await fetch(`/api/export/progress/${exportId}`);

            if (!response.ok) {
              throw new Error(`Failed to get progress: ${response.statusText}`);
            }

            const result = await response.json();
            return {
              progress: result.progress,
              status: result.status,
              current_step: result.current_step,
              error_message: result.error_message,
              output_path: result.output_path,
            };
          } catch (error) {
            console.error('Get export progress error:', error);
            return {
              progress: 0,
              status: 'failed',
              current_step: 'Error fetching progress',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },

        cancelExport: async (exportId: string) => {
          try {
            const response = await fetch(`/api/export/cancel/${exportId}`, {
              method: 'POST',
            });

            if (!response.ok) {
              throw new Error(`Cancel failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: result.success };
          } catch (error) {
            console.error('Cancel export error:', error);
            return { success: false };
          }
        },

        getSupportedFormats: async () => {
          try {
            const response = await fetch('/api/export/formats');

            if (!response.ok) {
              throw new Error(`Failed to get formats: ${response.statusText}`);
            }

            const result = await response.json();
            return { formats: result.formats };
          } catch (error) {
            console.error('Get supported formats error:', error);
            return { formats: [] };
          }
        },

        // Performance optimization actions
        optimizeWorkflow: async (workflowData: any) => {
          try {
            const response = await fetch('/api/performance/optimize-workflow', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(workflowData),
            });

            if (!response.ok) {
              throw new Error(`Workflow optimization failed: ${response.statusText}`);
            }

            return await response.json();
          } catch (error) {
            console.error('Workflow optimization error:', error);
            throw error;
          }
        },

        getPerformanceStatus: async () => {
          try {
            const response = await fetch('/api/performance/status');

            if (!response.ok) {
              throw new Error(`Failed to get performance status: ${response.statusText}`);
            }

            return await response.json();
          } catch (error) {
            console.error('Get performance status error:', error);
            throw error;
          }
        },

        getPerformanceDashboard: async () => {
          try {
            const response = await fetch('/api/performance/dashboard');

            if (!response.ok) {
              throw new Error(`Failed to get performance dashboard: ${response.statusText}`);
            }

            return await response.json();
          } catch (error) {
            console.error('Get performance dashboard error:', error);
            throw error;
          }
        },

        cacheWorkflow: async (workflowId: string, workflowData: any, ttlSeconds?: number) => {
          try {
            const requestBody: any = {
              workflow_data: workflowData,
            };

            if (ttlSeconds !== undefined) {
              requestBody.ttl_seconds = ttlSeconds;
            }

            const response = await fetch(`/api/performance/cache-workflow/${workflowId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              throw new Error(`Failed to cache workflow: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: result.success };
          } catch (error) {
            console.error('Cache workflow error:', error);
            return { success: false };
          }
        },

        getCachedWorkflow: async (workflowId: string) => {
          try {
            const response = await fetch(`/api/performance/cached-workflow/${workflowId}`);

            if (!response.ok) {
              if (response.status === 404) {
                return null;
              }
              throw new Error(`Failed to get cached workflow: ${response.statusText}`);
            }

            return await response.json();
          } catch (error) {
            console.error('Get cached workflow error:', error);
            return null;
          }
        },

        startPerformanceMonitoring: async (intervalSeconds = 1.0) => {
          try {
            const response = await fetch('/api/performance/monitoring/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ interval_seconds: intervalSeconds }),
            });

            if (!response.ok) {
              throw new Error(`Failed to start monitoring: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: result.success };
          } catch (error) {
            console.error('Start performance monitoring error:', error);
            return { success: false };
          }
        },

        stopPerformanceMonitoring: async () => {
          try {
            const response = await fetch('/api/performance/monitoring/stop', {
              method: 'POST',
            });

            if (!response.ok) {
              throw new Error(`Failed to stop monitoring: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: result.success };
          } catch (error) {
            console.error('Stop performance monitoring error:', error);
            return { success: false };
          }
        },
      }),
      {
        name: 'daw-audio-store',
        version: 2, // Increment version to clear old persisted data
        migrate: (persistedState: any, version: number) => {
          // Clear old tracks from version 1 or undefined
          if (version === 0 || version === 1) {
            console.log('Migrating audioStore from version', version, '- clearing old tracks');
            if (persistedState.state?.mixer) {
              persistedState.state.mixer.tracks = {};
            }
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          console.log('AudioStore rehydrated, tracks:', Object.keys(state?.mixer?.tracks || {}));
          // Clear any remaining fake tracks as a safety measure
          if (state?.mixer?.tracks) {
            const trackIds = Object.keys(state.mixer.tracks);
            const fakeTrackIds = trackIds.filter(id => id.startsWith('track_') && id.includes('_'));
            if (fakeTrackIds.length > 0) {
              console.log('Clearing fake tracks:', fakeTrackIds);
              state.mixer.tracks = {};
            }
          }
        },
        partialize: state => ({
          transport: {
            tempo: state.transport.tempo,
            timeSignature: state.transport.timeSignature,
            loopStart: state.transport.loopStart,
            loopEnd: state.transport.loopEnd,
            loopEnabled: state.transport.loopEnabled,
          },
          mixer: {
            masterVolume: state.mixer.masterVolume,
            // Don't persist tracks - get them from backend
            tracks: {},
          },
        }),
      }
    ),
    { name: 'AudioStore' }
  )
);
