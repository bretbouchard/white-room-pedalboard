import React, { useCallback, useState } from 'react';
import { cn } from '@/utils';
import Slider from '../ui/Slider';
import Knob from '../ui/Knob';
import LevelMeter from '../ui/LevelMeter';
import type { AudioLevel } from '@/types';
import {
  useControlTelemetry,
  useButtonTelemetry,
} from '@/telemetry/useTelemetry';

export interface ChannelStripProps {
  trackId: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument';
  volume: number; // 0-1
  pan: number; // -1 to 1
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
  className?: string;
  sends?: Array<{
    id: string;
    name: string;
    level: number;
    onLevelChange: (level: number) => void;
  }>;
}

const ChannelStrip: React.FC<ChannelStripProps> = ({
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
  className,
  sends = [],
}) => {
  // Telemetry hooks
  const volumeTelemetry = useControlTelemetry({ controlID: `${trackId}-volume` });
  const panTelemetry = useControlTelemetry({ controlID: `${trackId}-pan` });
  const trackMuteTelemetry = useButtonTelemetry(`${trackId}-mute`);
  const trackSoloTelemetry = useButtonTelemetry(`${trackId}-solo`);
  const trackPhaseTelemetry = useButtonTelemetry(`${trackId}-phase`);
  const trackArmTelemetry = useButtonTelemetry(`${trackId}-arm`);

  // Telemetry for send controls
  const sendTelemetryMap = sends.reduce((acc, send) => {
    acc[send.id] = useControlTelemetry({ controlID: `${trackId}-send-${send.id}` });
    return acc;
  }, {} as Record<string, ReturnType<typeof useControlTelemetry>>);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(name);

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

  // Convert volume (0-1) to dB for display
  const volumeDb = volume > 0 ? 20 * Math.log10(volume) : -60;

  const stripClasses = cn(
    'flex flex-col bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg p-2 space-y-2',
    'w-24 min-w-24 min-h-96 transition-all duration-150 flex-shrink-0',
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

      
      {/* Sends Section */}
      {sends.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-daw-text-secondary text-center">SENDS</div>
          <div className="flex flex-col space-y-1">
            {sends.map((send) => {
              const sendTelemetry = sendTelemetryMap[send.id];
              return (
                <div key={send.id} className="flex flex-col items-center">
                  <Knob
                    value={send.level}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => {
                      sendTelemetry?.trackValueChange(value);
                      send.onLevelChange(value);
                    }}
                    onInteractionStart={(value) => sendTelemetry?.trackInteraction(value)}
                    onInteractionEnd={(value) => sendTelemetry?.endInteraction(value)}
                    label={send.name}
                    className="w-6 h-6"
                  />
                </div>
              );
            })}
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
          onChange={(value) => {
            panTelemetry.trackValueChange(value);
            onPanChange(value);
          }}
          onInteractionStart={(value) => panTelemetry.trackInteraction(value)}
          onInteractionEnd={(value) => panTelemetry.endInteraction(value)}
          className="w-10 h-10"
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
            trackMuteTelemetry();
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
            trackSoloTelemetry();
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
            trackPhaseTelemetry();
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
              trackArmTelemetry();
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
            height={120}
            width={12}
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
            onChange={(value) => {
              volumeTelemetry.trackValueChange(value);
              onVolumeChange(value);
            }}
            onInteractionStart={(value) => volumeTelemetry.trackInteraction(value)}
            onInteractionEnd={(value) => volumeTelemetry.endInteraction(value)}
            orientation="vertical"
            className="h-32"
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

export default ChannelStrip;