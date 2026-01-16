/**
 * Example Enhanced Mixing Console
 *
 * Shows how to integrate plugin display into the existing mixing console
 */

import React, { useCallback, useState } from 'react';
import { cn } from '@/utils';
import ChannelStrip from './ChannelStrip';
import EnhancedChannelStrip from './EnhancedChannelStrip';
import MasterSection from './MasterSection';
import PluginBrowserModal from '../flow/PluginBrowserModal';
import { useAudioStore } from '@/stores/audioStore';
import { usePluginStore } from '@/stores/pluginStore';
import type { PluginInstance } from '@/types/plugins';

export interface MixingConsoleExampleProps {
  className?: string;
  showMasterEQ?: boolean;
  showLimiter?: boolean;
  showSpectrum?: boolean;
  enablePluginDisplay?: boolean;
  pluginViewMode?: 'compact' | 'expanded' | 'slots';
}

const MixingConsoleExample: React.FC<MixingConsoleExampleProps> = ({
  className,
  showLimiter = true,
  showSpectrum = true,
  enablePluginDisplay = true,
  pluginViewMode = 'compact',
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

  const {
    addPluginInstance,
    removePluginInstance,
  } = usePluginStore();

  // Local state for track phase
  const [trackPhases, setTrackPhases] = useState<Record<string, boolean>>({});

  // Plugin browser state
  const [showPluginBrowser, setShowPluginBrowser] = useState(false);
  const [selectedTrackForPlugin, setSelectedTrackForPlugin] = useState<string | null>(null);

  const [sends] = useState<Array<{
    id: string;
    name: string;
    level: number;
  }>>([
    { id: 'reverb', name: 'REV', level: 0 },
    { id: 'delay', name: 'DLY', level: 0 },
  ]);

  const tracks = Object.values(mixer.tracks);

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

  // Handle phase changes
  const handleTrackPhaseToggle = useCallback((trackId: string) => {
    setTrackPhases(prev => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  }, []);

  // Handle send changes
  const handleSendChange = useCallback((trackId: string, sendId: string, level: number) => {
    console.log(`Track ${trackId} send ${sendId} changed to ${level}`);
  }, []);

  // Plugin management handlers
  const handlePluginClick = useCallback((plugin: PluginInstance) => {
    // Open plugin control panel or show plugin details
    console.log('Plugin clicked:', plugin);
  }, []);

  const handlePluginRemove = useCallback((trackId: string, pluginId: string) => {
    removePluginInstance(trackId, pluginId);
  }, [removePluginInstance]);

  
  const handlePluginSelect = useCallback((plugin: any) => {
    if (selectedTrackForPlugin) {
      // Add plugin to track
      addPluginInstance(selectedTrackForPlugin, {
        instance_id: `${selectedTrackForPlugin}-${Date.now()}`,
        plugin_metadata: plugin,
        state: 'loaded',
        is_bypassed: false,
        parameters: {},
        available_presets: [],
        cpu_usage: 0,
        processing_time_ms: 0,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        is_active: true,
        latency_ms: 0,
      });

      setShowPluginBrowser(false);
      setSelectedTrackForPlugin(null);
    }
  }, [selectedTrackForPlugin, addPluginInstance]);

  const getTrackLevel = (trackId: string) => {
    return analysis.trackLevels[trackId] || { peak: 0, rms: 0 };
  };

  const consoleClasses = cn(
    'flex bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4',
    'overflow-x-auto',
    className
  );

  return (
    <div className={consoleClasses}>
      {/* Channel Strips */}
      <div className="flex space-x-2">
        {tracks.map((track) => {
          const trackLevel = getTrackLevel(track.id);

          if (enablePluginDisplay) {
            return (
              <EnhancedChannelStrip
                key={track.id}
                trackId={track.id}
                name={track.name}
                type={track.type}
                volume={track.volume}
                pan={track.pan}
                phaseInverted={trackPhases[track.id] || false}
                muted={track.muted}
                solo={track.solo}
                armed={track.armed}
                selected={mixer.selectedTrackId === track.id}
                color={track.color}
                level={trackLevel}
                showPlugins={true}
                pluginViewMode={pluginViewMode}
                maxPluginSlots={4}
                onVolumeChange={(volume) => setTrackVolume(track.id, volume)}
                onPanChange={(pan) => setTrackPan(track.id, pan)}
                onPhaseToggle={() => handleTrackPhaseToggle(track.id)}
                onMuteToggle={() => toggleTrackMute(track.id)}
                onSoloToggle={() => toggleTrackSolo(track.id)}
                onArmToggle={() => handleTrackArmToggle(track.id)}
                onSelect={() => selectTrack(track.id)}
                onNameChange={(name) => handleTrackNameChange(track.id, name)}
                onPluginClick={handlePluginClick}
                onPluginRemove={(pluginId) => handlePluginRemove(track.id, pluginId)}
                sends={sends.map(send => ({
                  ...send,
                  level: 0,
                  onLevelChange: (level) => handleSendChange(track.id, send.id, level),
                }))}
              />
            );
          } else {
            // Original ChannelStrip without plugins
            return (
              <ChannelStrip
                key={track.id}
                trackId={track.id}
                name={track.name}
                type={track.type}
                volume={track.volume}
                pan={track.pan}
                phaseInverted={trackPhases[track.id] || false}
                muted={track.muted}
                solo={track.solo}
                armed={track.armed}
                selected={mixer.selectedTrackId === track.id}
                color={track.color}
                level={trackLevel}
                onVolumeChange={(volume) => setTrackVolume(track.id, volume)}
                onPanChange={(pan) => setTrackPan(track.id, pan)}
                onPhaseToggle={() => handleTrackPhaseToggle(track.id)}
                onMuteToggle={() => toggleTrackMute(track.id)}
                onSoloToggle={() => toggleTrackSolo(track.id)}
                onArmToggle={() => handleTrackArmToggle(track.id)}
                onSelect={() => selectTrack(track.id)}
                onNameChange={(name) => handleTrackNameChange(track.id, name)}
                sends={sends.map(send => ({
                  ...send,
                  level: 0,
                  onLevelChange: (level) => handleSendChange(track.id, send.id, level),
                }))}
              />
            );
          }
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
        limiter={showLimiter ? {
          enabled: false,
          threshold: -1,
          release: 100,
          onEnabledToggle: () => console.log('Toggle limiter'),
          onThresholdChange: (threshold) => console.log('Limiter threshold:', threshold),
          onReleaseChange: (release) => console.log('Limiter release:', release),
        } : undefined}
      />

      {/* Plugin Browser Modal */}
      {showPluginBrowser && selectedTrackForPlugin && (
        <PluginBrowserModal
          isOpen={showPluginBrowser}
          onClose={() => {
            setShowPluginBrowser(false);
            setSelectedTrackForPlugin(null);
          }}
          onPluginSelect={handlePluginSelect}
          trackId={selectedTrackForPlugin}
        />
      )}
    </div>
  );
};

export default MixingConsoleExample;