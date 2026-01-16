/**
 * Enhanced Channel Strip Component
 *
 * Extended channel strip with plugin display capabilities
 */

import React, { useCallback, useState } from 'react';
import { cn } from '@/utils';
import { usePluginStore } from '@/stores/pluginStore';
import Slider from '../ui/Slider';
import Knob from '../ui/Knob';
import LevelMeter from '../ui/LevelMeter';
import TrackPlugins from '../plugins/TrackPlugins';
import PluginSlot from '../plugins/PluginSlot';
import Button from '../ui/Button';
import type { AudioLevel, PluginInstance } from '@/types';

export interface EnhancedChannelStripProps {
  trackId: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument';
  volume: number;
  pan: number;
  phaseInverted: boolean;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  selected: boolean;
  color: string;
  level?: AudioLevel;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onPhaseToggle: () => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onArmToggle: () => void;
  onSelect: () => void;
  onNameChange?: (name: string) => void;
  onPluginClick?: (plugin: PluginInstance) => void;
  onPluginRemove?: (pluginId: string) => void;
  className?: string;
  showPlugins?: boolean;
  pluginViewMode?: 'compact' | 'expanded' | 'slots';
  maxPluginSlots?: number;
  sends?: Array<{
    id: string;
    name: string;
    level: number;
    onLevelChange: (level: number) => void;
  }>;
}

const EnhancedChannelStrip: React.FC<EnhancedChannelStripProps> = ({
  trackId,
  name,
  type,
  volume,
  pan,
  phaseInverted,
  muted,
  solo,
  armed,
  selected,
  color,
  level,
  onVolumeChange,
  onPanChange,
  onPhaseToggle,
  onMuteToggle,
  onSoloToggle,
  onArmToggle,
  onSelect,
  onNameChange,
  onPluginClick,
  onPluginRemove,
  className,
  showPlugins = true,
  pluginViewMode = 'compact',
  maxPluginSlots = 5,
  sends = [],
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(name);

  const { getTrackPlugins } = usePluginStore();
  const trackPlugins = getTrackPlugins(trackId);

  const handleNameSubmit = useCallback(() => {
    if (onNameChange && editName.trim() !== name) {
      onNameChange(editName.trim());
    }
    setIsEditingName(false);
  }, [editName, name, onNameChange]);

  const handleNameKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleNameSubmit();
    } else if (event.key === 'Escape') {
      setEditName(name);
      setIsEditingName(false);
    }
  }, [handleNameSubmit, name]);

  const handlePluginSlotClick = useCallback((plugin: PluginInstance) => {
    if (onPluginClick) {
      onPluginClick(plugin);
    }
  }, [onPluginClick]);

  const handleAddPlugin = useCallback(() => {
    setShowPluginBrowser(true);
  }, []);

  // Convert volume (0-1) to dB for display
  const volumeDb = volume > 0 ? 20 * Math.log10(volume) : -60;

  const stripClasses = cn(
    'flex flex-col bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg p-2 space-y-2',
    showPlugins ? 'w-32 min-w-32 min-h-[28rem]' : 'w-24 min-w-24 min-h-96',
    'transition-all duration-150 flex-shrink-0',
    selected && 'ring-2 ring-daw-accent-primary ring-opacity-50',
    className
  );

  const buttonClasses = (active: boolean, variant: 'mute' | 'solo' | 'arm' | 'phase' = 'mute') => cn(
    'px-2 py-1 text-xs font-medium rounded transition-colors duration-150 cursor-pointer',
    'border border-daw-surface-tertiary',
    active ? {
      mute: 'bg-red-500 text-white border-red-400',
      solo: 'bg-yellow-500 text-black border-yellow-400',
      arm: 'bg-red-600 text-white border-red-500',
      phase: 'bg-blue-500 text-white border-blue-400',
    }[variant] : 'bg-daw-surface-secondary text-daw-text-secondary hover:bg-daw-surface-tertiary'
  );

  return (
    <div className={stripClasses} onClick={onSelect}>
      {/* Track Name */}
      <div className="text-center">
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className="w-full text-xs text-center bg-daw-surface-secondary border border-daw-surface-tertiary rounded px-1 py-0.5"
            autoFocus
          />
        ) : (
          <div
            className="text-xs font-medium text-daw-text-primary cursor-pointer hover:bg-daw-surface-tertiary rounded px-1 py-0.5 truncate"
            onClick={(e) => {
              e.stopPropagation();
              if (onNameChange) {
                setIsEditingName(true);
              }
            }}
            title={name}
          >
            {name}
          </div>
        )}
        <div className="text-xs text-daw-text-tertiary capitalize mt-1">
          {type}
        </div>
      </div>

      {/* Color Indicator */}
      <div
        className="h-1 rounded-full mx-2"
        style={{ backgroundColor: color }}
      />

      {/* Plugins Section */}
      {showPlugins && (
        <div className="space-y-1">
          {pluginViewMode === 'compact' && (
            <TrackPlugins
              trackId={trackId}
              showCompact={true}
              maxVisible={3}
              allowBypass={true}
              onPluginClick={handlePluginSlotClick}
              onPluginRemove={onPluginRemove}
            />
          )}

          {pluginViewMode === 'slots' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-daw-text-secondary">PLUGINS</div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-4 px-1 text-xs"
                  onClick={handleAddPlugin}
                >
                  +
                </Button>
              </div>

              <div className="flex flex-col space-y-1 max-h-32 overflow-y-auto">
                {trackPlugins.slice(0, maxPluginSlots).map((plugin) => (
                  <PluginSlot
                    key={plugin.instance_id}
                    plugin={plugin}
                    trackId={trackId}
                    isActive={selected}
                    onSlotClick={handlePluginSlotClick}
                  />
                ))}

                {trackPlugins.length > maxPluginSlots && (
                  <div className="text-center text-xs text-daw-text-tertiary py-1">
                    +{trackPlugins.length - maxPluginSlots} more
                  </div>
                )}

                {trackPlugins.length === 0 && (
                  <div className="text-center text-xs text-daw-text-tertiary py-2">
                    <div className="w-8 h-8 mx-auto mb-1 rounded bg-daw-surface-tertiary flex items-center justify-center">
                      <span className="text-lg">⊕</span>
                    </div>
                    Add Plugin
                  </div>
                )}
              </div>
            </div>
          )}

          {pluginViewMode === 'expanded' && (
            <TrackPlugins
              trackId={trackId}
              showCompact={false}
              onPluginClick={handlePluginSlotClick}
              onPluginRemove={onPluginRemove}
            />
          )}
        </div>
      )}

      
      {/* Sends Section */}
      {sends.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-daw-text-secondary text-center">SENDS</div>
          <div className="flex flex-col space-y-1">
            {sends.map((send) => (
              <div key={send.id} className="flex flex-col items-center">
                <Knob
                  value={send.level}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={send.onLevelChange}
                  label={send.name}
                  className="w-5 h-5"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pan Control */}
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs text-daw-text-secondary">PAN</div>
        <Knob
          value={pan}
          min={-1}
          max={1}
          step={0.01}
          onChange={onPanChange}
          className="w-8 h-8"
        />
        <div className="text-xs text-daw-text-tertiary font-mono">
          {pan === 0 ? 'C' : pan > 0 ? `R${Math.round(pan * 100)}` : `L${Math.round(-pan * 100)}`}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col space-y-1">
        <button
          className={buttonClasses(muted, 'mute')}
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle();
          }}
          title="Mute track"
        >
          MUTE
        </button>
        <button
          className={buttonClasses(solo, 'solo')}
          onClick={(e) => {
            e.stopPropagation();
            onSoloToggle();
          }}
          title="Solo track"
        >
          SOLO
        </button>
        <button
          className={buttonClasses(phaseInverted, 'phase')}
          onClick={(e) => {
            e.stopPropagation();
            onPhaseToggle();
          }}
          title="Phase invert"
        >
          Φ
        </button>
        {type === 'audio' && (
          <button
            className={buttonClasses(armed, 'arm')}
            onClick={(e) => {
              e.stopPropagation();
              onArmToggle();
            }}
            title="Arm for recording"
          >
            REC
          </button>
        )}
      </div>

      {/* Level Meter */}
      {level && (
        <div className="flex-1 flex justify-center items-end py-2">
          <LevelMeter
            level={level}
            orientation="vertical"
            height={100}
            width={10}
            showPeak
            showRMS
          />
        </div>
      )}

      {/* Volume Fader */}
      <div className="flex-1 flex flex-col items-center justify-end space-y-2">
        <div className="text-xs text-daw-text-secondary">VOL</div>
        <div className="flex-1 flex items-end">
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={onVolumeChange}
            orientation="vertical"
            className="h-24"
          />
        </div>
        <div className="text-xs text-daw-text-tertiary font-mono">
          {volumeDb > -60 ? `${volumeDb.toFixed(1)}dB` : '-∞'}
        </div>
      </div>

      {/* Input/Output Indicators */}
      <div className="flex justify-between text-xs">
        <div className={cn(
          'w-2 h-2 rounded-full',
          type === 'audio' && armed ? 'bg-red-500' : 'bg-daw-surface-tertiary'
        )} title="Input" />
        <div className={cn(
          'w-2 h-2 rounded-full',
          !muted ? 'bg-green-500' : 'bg-daw-surface-tertiary'
        )} title="Output" />
      </div>
    </div>
  );
};

export default EnhancedChannelStrip;