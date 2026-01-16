import { useCallback, useEffect } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useWebSocketStore } from '@/stores/websocketStore';
import type { AudioLevel, SpectrumData } from '@/types';

// Hook for transport controls
export const useTransport = () => {
  const transport = useAudioStore(state => state.transport);
  const play = useAudioStore(state => state.play);
  const stop = useAudioStore(state => state.stop);
  const record = useAudioStore(state => state.record);
  const seek = useAudioStore(state => state.seek);
  const setTempo = useAudioStore(state => state.setTempo);
  const setLoop = useAudioStore(state => state.setLoop);

  const sendMessage = useWebSocketStore(state => state.sendMessage);

  const handlePlay = useCallback(() => {
    play();
    sendMessage('transport_play', { timestamp: new Date().toISOString() });
  }, [play, sendMessage]);

  const handleStop = useCallback(() => {
    stop();
    sendMessage('transport_stop', { timestamp: new Date().toISOString() });
  }, [stop, sendMessage]);

  const handleRecord = useCallback(() => {
    record();
    sendMessage('transport_record', { timestamp: new Date().toISOString() });
  }, [record, sendMessage]);

  const handleSeek = useCallback(
    (time: number) => {
      seek(time);
      sendMessage('transport_seek', { time, timestamp: new Date().toISOString() });
    },
    [seek, sendMessage]
  );

  const handleSetTempo = useCallback(
    (tempo: number) => {
      setTempo(tempo);
      sendMessage('transport_tempo', { tempo, timestamp: new Date().toISOString() });
    },
    [setTempo, sendMessage]
  );

  const handleSetLoop = useCallback(
    (start: number, end: number, enabled: boolean) => {
      setLoop(start, end, enabled);
      sendMessage('transport_loop', {
        start,
        end,
        enabled,
        timestamp: new Date().toISOString(),
      });
    },
    [setLoop, sendMessage]
  );

  return {
    ...transport,
    play: handlePlay,
    stop: handleStop,
    record: handleRecord,
    seek: handleSeek,
    setTempo: handleSetTempo,
    setLoop: handleSetLoop,
  };
};

// Hook for mixer controls
export const useMixer = () => {
  const mixer = useAudioStore(state => state.mixer);
  const addTrack = useAudioStore(state => state.addTrack);
  const removeTrack = useAudioStore(state => state.removeTrack);
  const updateTrack = useAudioStore(state => state.updateTrack);
  const selectTrack = useAudioStore(state => state.selectTrack);
  const setTrackVolume = useAudioStore(state => state.setTrackVolume);
  const setTrackPan = useAudioStore(state => state.setTrackPan);
  const toggleTrackMute = useAudioStore(state => state.toggleTrackMute);
  const toggleTrackSolo = useAudioStore(state => state.toggleTrackSolo);
  const setMasterVolume = useAudioStore(state => state.setMasterVolume);
  const toggleMasterMute = useAudioStore(state => state.toggleMasterMute);

  const sendMessage = useWebSocketStore(state => state.sendMessage);
  const subscribe = useWebSocketStore(state => state.subscribe);

  // Subscribe to backend 'track_add' messages and update local store
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'track_add' && msg.data) {
        // Defensive: avoid duplicate tracks by checking if trackId exists
        const { trackId, type, name } = msg.data as any;
        if (!mixer.tracks[trackId]) {
          addTrack(type, name);
        }
      }
    });
    return () => unsubscribe();
  }, [subscribe, addTrack, mixer.tracks]);

  const handleAddTrack = useCallback(
    (type: 'audio' | 'midi' | 'instrument', name?: string) => {
      const trackId = addTrack(type, name);
      sendMessage('track_add', { trackId, type, name, timestamp: new Date().toISOString() });
      console.log('Track added:', { trackId, type, name });
      return trackId;
    },
    [addTrack, sendMessage]
  );

  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      removeTrack(trackId);
      sendMessage('track_remove', { trackId, timestamp: new Date().toISOString() });
    },
    [removeTrack, sendMessage]
  );

  const handleSetTrackVolume = useCallback(
    (trackId: string, volume: number) => {
      setTrackVolume(trackId, volume);
      sendMessage('track_volume', { trackId, volume, timestamp: new Date().toISOString() });
    },
    [setTrackVolume, sendMessage]
  );

  const handleSetTrackPan = useCallback(
    (trackId: string, pan: number) => {
      setTrackPan(trackId, pan);
      sendMessage('track_pan', { trackId, pan, timestamp: new Date().toISOString() });
    },
    [setTrackPan, sendMessage]
  );

  const handleToggleTrackMute = useCallback(
    (trackId: string) => {
      toggleTrackMute(trackId);
      const track = mixer.tracks[trackId];
      sendMessage('track_mute', {
        trackId,
        muted: !track?.muted,
        timestamp: new Date().toISOString(),
      });
    },
    [toggleTrackMute, mixer.tracks, sendMessage]
  );

  const handleToggleTrackSolo = useCallback(
    (trackId: string) => {
      toggleTrackSolo(trackId);
      const track = mixer.tracks[trackId];
      sendMessage('track_solo', {
        trackId,
        solo: !track?.solo,
        timestamp: new Date().toISOString(),
      });
    },
    [toggleTrackSolo, mixer.tracks, sendMessage]
  );

  const handleSetMasterVolume = useCallback(
    (volume: number) => {
      setMasterVolume(volume);
      sendMessage('master_volume', { volume, timestamp: new Date().toISOString() });
    },
    [setMasterVolume, sendMessage]
  );

  const handleToggleMasterMute = useCallback(() => {
    toggleMasterMute();
    sendMessage('master_mute', {
      muted: !mixer.masterMuted,
      timestamp: new Date().toISOString(),
    });
  }, [toggleMasterMute, mixer.masterMuted, sendMessage]);

  return {
    ...mixer,
    addTrack: handleAddTrack,
    removeTrack: handleRemoveTrack,
    updateTrack,
    selectTrack,
    setTrackVolume: handleSetTrackVolume,
    setTrackPan: handleSetTrackPan,
    toggleTrackMute: handleToggleTrackMute,
    toggleTrackSolo: handleToggleTrackSolo,
    setMasterVolume: handleSetMasterVolume,
    toggleMasterMute: handleToggleMasterMute,
  };
};

// Hook for audio analysis
export const useAudioAnalysis = () => {
  const analysis = useAudioStore(state => state.analysis);
  const updateMasterLevel = useAudioStore(state => state.updateMasterLevel);
  const updateTrackLevel = useAudioStore(state => state.updateTrackLevel);
  const updateSpectrumData = useAudioStore(state => state.updateSpectrumData);

  return {
    ...analysis,
    updateMasterLevel,
    updateTrackLevel,
    updateSpectrumData,
  };
};

// Hook for WebSocket connection management
export const useWebSocket = () => {
  const { status, lastError, connect, disconnect, sendMessage, clearQueue } =
    useWebSocketStore();

  // Auto-connect on mount
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  return {
    status,
    lastError,
    isConnected: status === 'connected',
    connect,
    disconnect,
    sendMessage,
    clearQueue,
  };
};

// Hook for real-time audio level updates
export const useRealTimeAudioLevels = () => {
  const { updateMasterLevel, updateTrackLevel } = useAudioAnalysis();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Simulate real-time audio level updates
    // In a real implementation, this would come from WebSocket messages
    const interval = setInterval(() => {
      // Generate mock audio levels
      const mockMasterLevel: AudioLevel = {
        peak: Math.random() * 0.9,
        rms: Math.random() * 0.6,
        lufs: -60 + Math.random() * 40,
      };

      updateMasterLevel(mockMasterLevel);

      // Update track levels for existing tracks
      // This would be driven by actual audio analysis in production
    }, 50); // 20fps update rate

    return () => clearInterval(interval);
  }, [isConnected, updateMasterLevel, updateTrackLevel]);
};

// Hook for real-time spectrum analysis
export const useRealTimeSpectrum = () => {
  const { updateSpectrumData } = useAudioAnalysis();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Simulate real-time spectrum updates
    const interval = setInterval(() => {
      const mockSpectrumData: SpectrumData = {
        frequencies: new Float32Array(512).map((_, i) => (i / 512) * 22050),
        magnitudes: new Float32Array(512).map(() => Math.random() * 0.8),
        binCount: 512,
      };

      updateSpectrumData(mockSpectrumData);
    }, 100); // 10fps update rate for spectrum

    return () => clearInterval(interval);
  }, [isConnected, updateSpectrumData]);
};
