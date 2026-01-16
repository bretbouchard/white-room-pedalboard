import React, { useCallback, useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import ChannelStrip from './ChannelStrip';
import MasterSection from './MasterSection';
import { useAudioStore } from '@/stores/audioStore';
import { useFocusTelemetry, useButtonTelemetry } from '@/telemetry/useTelemetry';

export interface MixingConsoleProps {
  className?: string;
  showMasterEQ?: boolean;
  showLimiter?: boolean;
  showSpectrum?: boolean;
}

const MixingConsole: React.FC<MixingConsoleProps> = ({
  className,
  showMasterEQ = true,
  showLimiter = true,
  showSpectrum = true,
}) => {
  const {
    mixer,
    analysis,
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,
    toggleTrackSolo,
    updateTrack,
    selectTrack,
    setMasterVolume,
    toggleMasterMute,
  } = useAudioStore();

  // Telemetry hooks
  const trackFocusTelemetry = useFocusTelemetry();
  const addAudioTrackTelemetry = useButtonTelemetry('add-audio-track');
  const addMidiTrackTelemetry = useButtonTelemetry('add-midi-track');
  const addInstrumentTrackTelemetry = useButtonTelemetry('add-instrument-track');

  // Track previous selected track for focus tracking
  const previousSelectedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentSelectedTrackId = mixer.selectedTrackId;
    const previousSelectedTrackId = previousSelectedTrackIdRef.current;

    // Track focus change when selection changes
    if (currentSelectedTrackId !== previousSelectedTrackId) {
      if (previousSelectedTrackId) {
        trackFocusTelemetry(previousSelectedTrackId, currentSelectedTrackId || 'none');
      }
      previousSelectedTrackIdRef.current = currentSelectedTrackId;
    }
  }, [mixer.selectedTrackId, trackFocusTelemetry]);

  const [masterEQ, setMasterEQ] = useState({
    highGain: 0,
    midGain: 0,
    lowGain: 0,
  });

  const [limiter, setLimiter] = useState({
    enabled: false,
    threshold: -1,
    release: 100,
  });

  const [sends] = useState<Array<{
    id: string;
    name: string;
    level: number;
  }>>([
    { id: 'reverb', name: 'REV', level: 0 },
    { id: 'delay', name: 'DLY', level: 0 },
  ]);






  // Handle track name changes
  const handleTrackNameChange = useCallback((trackId: string, newName: string) => {
    updateTrack(trackId, { name: newName });
  }, [updateTrack]);

  // Handle track arm toggle
  const handleTrackArmToggle = useCallback((trackId: string) => {
    const track = mixer.tracks[trackId];
    if (track) {
      updateTrack(trackId, { armed: !track.armed });
    }
  }, [mixer.tracks, updateTrack]);

  const handleMasterEQChange = useCallback((eqType: 'highGain' | 'midGain' | 'lowGain', value: number) => {
    setMasterEQ(prev => ({ ...prev, [eqType]: value }));
  }, []);

  // Handle send changes
  const handleSendChange = useCallback((trackId: string, sendId: string, level: number) => {
    // This would integrate with the plugin/effects system
    console.log(`Track ${trackId} send ${sendId} changed to ${level}`);
  }, []);

  // Handle limiter changes
  const handleLimiterToggle = useCallback(() => {
    setLimiter(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const handleLimiterThresholdChange = useCallback((threshold: number) => {
    setLimiter(prev => ({ ...prev, threshold }));
  }, []);

  const handleLimiterReleaseChange = useCallback((release: number) => {
    setLimiter(prev => ({ ...prev, release }));
  }, []);

  const tracks = Object.values(mixer.tracks);

  const consoleClasses = cn(
    'flex bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 gap-x-3 overflow-x-auto',
    'min-h-96',
    className
  );

  return (
    <div className={consoleClasses}>
      {/* Channel Strips */}
      <div className="flex gap-x-2 flex-shrink-0">
        {tracks.map((track) => {
          const trackLevel = analysis.trackLevels[track.id];
          
          return (
            <ChannelStrip
              key={track.id}
              trackId={track.id}
              name={track.name}
              type={track.type}
              volume={track.volume}
              pan={track.pan}
              phaseInverted={false}
              muted={track.muted}
              solo={track.solo}
              armed={track.armed}
              selected={mixer.selectedTrackId === track.id}
              color={track.color}
              level={trackLevel}
              onVolumeChange={(volume) => setTrackVolume(track.id, volume)}
              onPanChange={(pan) => setTrackPan(track.id, pan)}
              onPhaseToggle={() => console.log('Phase toggle for track', track.id)}
              onMuteToggle={() => toggleTrackMute(track.id)}
              onSoloToggle={() => toggleTrackSolo(track.id)}
              onArmToggle={() => handleTrackArmToggle(track.id)}
              onSelect={() => selectTrack(track.id)}
              onNameChange={(name) => handleTrackNameChange(track.id, name)}
              sends={sends.map(send => ({
                ...send,
                level: 0, // Would come from plugin system
                onLevelChange: (level) => handleSendChange(track.id, send.id, level),
              }))}
            />
          );
        })}
      </div>

      {/* Separator */}
      {tracks.length > 0 && (
        <div className="w-px bg-daw-surface-tertiary mx-4" />
      )}

      {/* Master Section */}
      <MasterSection
        volume={mixer.masterVolume}
        muted={mixer.masterMuted}
        level={analysis.masterLevel}
        spectrumData={showSpectrum ? analysis.spectrumData : undefined}
        onVolumeChange={setMasterVolume}
        onMuteToggle={toggleMasterMute}
        showSpectrum={showSpectrum}
        masterEQ={showMasterEQ ? {
          highGain: masterEQ.highGain,
          midGain: masterEQ.midGain,
          lowGain: masterEQ.lowGain,
          onHighGainChange: (gain) => handleMasterEQChange('highGain', gain),
          onMidGainChange: (gain) => handleMasterEQChange('midGain', gain),
          onLowGainChange: (gain) => handleMasterEQChange('lowGain', gain),
        } : undefined}
        limiter={showLimiter ? {
          enabled: limiter.enabled,
          threshold: limiter.threshold,
          release: limiter.release,
          onEnabledToggle: handleLimiterToggle,
          onThresholdChange: handleLimiterThresholdChange,
          onReleaseChange: handleLimiterReleaseChange,
        } : undefined}
      />

      {/* Add Track Button */}
      <div className="flex flex-col justify-center">
        <div className="space-y-2">
          <button
            onClick={async () => {
              addAudioTrackTelemetry();
              const trackId = await useAudioStore.getState().addTrack('audio');
              selectTrack(trackId);
            }}
            className="px-3 py-2 text-sm bg-daw-accent-primary text-white rounded hover:bg-daw-accent-primary hover:bg-opacity-80 transition-colors duration-150"
            title="Add audio track"
          >
            + Audio
          </button>
          <button
            onClick={async () => {
              addMidiTrackTelemetry();
              const trackId = await useAudioStore.getState().addTrack('midi');
              selectTrack(trackId);
            }}
            className="px-3 py-2 text-sm bg-daw-accent-secondary text-white rounded hover:bg-daw-accent-secondary hover:bg-opacity-80 transition-colors duration-150"
            title="Add MIDI track"
          >
            + MIDI
          </button>
          <button
            onClick={async () => {
              addInstrumentTrackTelemetry();
              const trackId = await useAudioStore.getState().addTrack('instrument');
              selectTrack(trackId);
            }}
            className="px-3 py-2 text-sm bg-daw-accent-tertiary text-white rounded hover:bg-daw-accent-tertiary hover:bg-opacity-80 transition-colors duration-150"
            title="Add instrument track"
          >
            + Inst
          </button>
        </div>
      </div>

      {/* Empty State */}
      {tracks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-daw-text-tertiary">
            <div className="text-lg mb-2">No tracks</div>
            <div className="text-sm">Add tracks to start mixing</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MixingConsole;
