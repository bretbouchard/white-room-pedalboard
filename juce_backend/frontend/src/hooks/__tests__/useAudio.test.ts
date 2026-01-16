// jsdom environment is provided via Vitest config
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransport, useMixer, useAudioAnalysis } from '../useAudio';
import { useAudioStore } from '@/stores/audioStore';

// Mock WebSocket store
vi.mock('@/stores/websocketStore', () => {
  const sendMessage = vi.fn();
  const subscribe = vi.fn(() => vi.fn());
  const state = { sendMessage, subscribe };
  return {
    useWebSocketStore: (selector?: (s: any) => any) => (selector ? selector(state) : state),
  };
});

describe('useTransport', () => {
  beforeEach(() => {
    // Reset store state
    useAudioStore.setState({
      transport: {
        isPlaying: false,
        isRecording: false,
        currentTime: 0,
        loopStart: 0,
        loopEnd: 60,
        loopEnabled: false,
        tempo: 120,
        timeSignature: [4, 4],
      },
    });
  });

  it('should handle play action', () => {
    const { result } = renderHook(() => useTransport());

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isRecording).toBe(false);
  });

  it('should handle stop action', () => {
    const { result } = renderHook(() => useTransport());

    // Start playing first
    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    // Then stop
    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isRecording).toBe(false);
  });

  it('should handle record action', () => {
    const { result } = renderHook(() => useTransport());

    act(() => {
      result.current.record();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isRecording).toBe(true);
  });

  it('should handle tempo changes', () => {
    const { result } = renderHook(() => useTransport());

    act(() => {
      result.current.setTempo(140);
    });

    expect(result.current.tempo).toBe(140);
  });

  it('should handle seek', () => {
    const { result } = renderHook(() => useTransport());

    act(() => {
      result.current.seek(30.5);
    });

    expect(result.current.currentTime).toBe(30.5);
  });
});

describe('useMixer', () => {
  beforeEach(() => {
    // Reset store state
    useAudioStore.setState({
      mixer: {
        masterVolume: 0.8,
        masterMuted: false,
        tracks: {},
        selectedTrackId: null,
        soloedTracks: [],
        masterEQ: { highGain: 0, midGain: 0, lowGain: 0 },
        limiter: { enabled: false, threshold: -1, release: 100 },
      },
    });
  });

  it('should add tracks', async () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('audio', 'Test Track');
    });

    expect(Object.keys(result.current.tracks)).toHaveLength(1);
    expect(result.current.tracks[trackId!].name).toBe('Test Track');
    expect(result.current.tracks[trackId!].type).toBe('audio');
    expect(result.current.selectedTrackId).toBe(trackId);
  });

  it('should remove tracks', async () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('midi');
    });

    expect(Object.keys(result.current.tracks)).toHaveLength(1);

    act(() => {
      result.current.removeTrack(trackId);
    });

    expect(Object.keys(result.current.tracks)).toHaveLength(0);
    expect(result.current.selectedTrackId).toBe(null);
  });

  it('should handle track volume changes', async () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('audio');
    });

    act(() => {
      result.current.setTrackVolume(trackId, 0.5);
    });

    expect(result.current.tracks[trackId].volume).toBe(0.5);
  });

  it('should handle track mute toggle', async () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('audio');
    });

    expect(result.current.tracks[trackId].muted).toBe(false);

    act(() => {
      result.current.toggleTrackMute(trackId);
    });

    expect(result.current.tracks[trackId].muted).toBe(true);
  });

  it('should handle track solo toggle', async () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('audio');
    });

    expect(result.current.tracks[trackId].solo).toBe(false);
    expect(result.current.soloedTracks).toHaveLength(0);

    act(() => {
      result.current.toggleTrackSolo(trackId);
    });

    expect(result.current.tracks[trackId].solo).toBe(true);
    expect(result.current.soloedTracks).toContain(trackId);
  });

  it('should handle master volume changes', () => {
    const { result } = renderHook(() => useMixer());

    act(() => {
      result.current.setMasterVolume(0.6);
    });

    expect(result.current.masterVolume).toBe(0.6);
  });

  it('should clamp volume values', () => {
    const { result } = renderHook(() => useMixer());

    let trackId: string;
    await act(async () => {
      trackId = await result.current.addTrack('audio');
    });

    // Test upper bound
    act(() => {
      result.current.setTrackVolume(trackId, 1.5);
    });
    expect(result.current.tracks[trackId].volume).toBe(1);

    // Test lower bound
    act(() => {
      result.current.setTrackVolume(trackId, -0.5);
    });
    expect(result.current.tracks[trackId].volume).toBe(0);
  });
});

describe('useAudioAnalysis', () => {
  it('should update master level', () => {
    const { result } = renderHook(() => useAudioAnalysis());

    const testLevel = { peak: 0.8, rms: 0.5, lufs: -12.5 };

    act(() => {
      result.current.updateMasterLevel(testLevel);
    });

    expect(result.current.masterLevel).toEqual(testLevel);
    expect(result.current.lastAnalysisTime).toBeGreaterThan(0);
  });

  it('should update track levels', () => {
    const { result } = renderHook(() => useAudioAnalysis());

    const testLevel = { peak: 0.6, rms: 0.3, lufs: -18.2 };
    const trackId = 'test-track-1';

    act(() => {
      result.current.updateTrackLevel(trackId, testLevel);
    });

    expect(result.current.trackLevels[trackId]).toEqual(testLevel);
  });

  it('should update spectrum data', () => {
    const { result } = renderHook(() => useAudioAnalysis());

    const testSpectrum = {
      frequencies: new Float32Array([100, 200, 300]),
      magnitudes: new Float32Array([0.5, 0.3, 0.1]),
      binCount: 3,
    };

    act(() => {
      result.current.updateSpectrumData(testSpectrum);
    });

    expect(result.current.spectrumData).toEqual(testSpectrum);
  });
});
