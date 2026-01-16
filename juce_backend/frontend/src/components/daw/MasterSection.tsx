import React from 'react';
import { cn } from '@/utils';
import Slider from '../ui/Slider';
import LevelMeter from '../ui/LevelMeter';
import SpectrumAnalyzer from '../ui/SpectrumAnalyzer';
import type { AudioLevel, SpectrumData } from '@/types';
import {
  useControlTelemetry,
  useButtonTelemetry,
} from '@/telemetry/useTelemetry';

export interface MasterSectionProps {
  volume: number; // 0-1
  muted: boolean;
  level?: AudioLevel;
  spectrumData?: SpectrumData;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  className?: string;
  showSpectrum?: boolean;
  masterEQ?: {
    highGain: number;
    midGain: number;
    lowGain: number;
    onHighGainChange: (gain: number) => void;
    onMidGainChange: (gain: number) => void;
    onLowGainChange: (gain: number) => void;
  };
  limiter?: {
    enabled: boolean;
    threshold: number;
    release: number;
    onEnabledToggle: () => void;
    onThresholdChange: (threshold: number) => void;
    onReleaseChange: (release: number) => void;
  };
}

const MasterSection: React.FC<MasterSectionProps> = ({
  volume,
  muted,
  level,
  spectrumData,
  onVolumeChange,
  onMuteToggle,
  className,
  showSpectrum = true,
  masterEQ,
  limiter,
}) => {
  // Telemetry hooks
  const masterVolumeTelemetry = useControlTelemetry({ controlID: 'master-volume' });
  const masterMuteTelemetry = useButtonTelemetry('master-mute');
  const eqHighTelemetry = useControlTelemetry({ controlID: 'master-eq-high' });
  const eqMidTelemetry = useControlTelemetry({ controlID: 'master-eq-mid' });
  const eqLowTelemetry = useControlTelemetry({ controlID: 'master-eq-low' });
  const limiterEnableTelemetry = useButtonTelemetry('master-limiter-enable');
  const limiterThresholdTelemetry = useControlTelemetry({ controlID: 'master-limiter-threshold' });
  const limiterReleaseTelemetry = useControlTelemetry({ controlID: 'master-limiter-release' });

  // Convert volume (0-1) to dB for display
  const volumeDb = volume > 0 ? 20 * Math.log10(volume) : -60;

  const sectionClasses = cn(
    'flex flex-col bg-daw-surface-primary border-2 border-daw-accent-primary rounded-lg p-4 space-y-4',
    'w-32 min-h-96',
    className
  );

  const buttonClasses = (active: boolean) => cn(
    'px-3 py-2 text-sm font-medium rounded transition-colors duration-150 cursor-pointer',
    'border border-daw-surface-tertiary',
    active 
      ? 'bg-red-500 text-white border-red-400' 
      : 'bg-daw-surface-secondary text-daw-text-secondary hover:bg-daw-surface-tertiary'
  );

  return (
    <div className={sectionClasses}>
      {/* Master Label */}
      <div className="text-center">
        <div className="text-lg font-bold text-daw-accent-primary">MASTER</div>
        <div className="text-xs text-daw-text-tertiary">Main Output</div>
      </div>

      {/* Spectrum Analyzer */}
      {showSpectrum && spectrumData && (
        <div className="space-y-2">
          <div className="text-xs text-daw-text-secondary text-center">SPECTRUM</div>
          <SpectrumAnalyzer
            data={spectrumData}
            width={100}
            height={80}
            className="mx-auto"
          />
        </div>
      )}

      {/* Master EQ */}
      {masterEQ && (
        <div className="space-y-2">
          <div className="text-xs text-daw-text-secondary text-center">MASTER EQ</div>
          <div className="grid grid-cols-3 gap-1">
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs text-daw-text-tertiary">HI</div>
              <Slider
                value={masterEQ.highGain}
                min={-12}
                max={12}
                step={0.1}
                onChange={(value) => {
                  eqHighTelemetry.trackValueChange(value);
                  masterEQ.onHighGainChange(value);
                }}
                onInteractionStart={(value) => eqHighTelemetry.trackInteraction(value)}
                onInteractionEnd={(value) => eqHighTelemetry.endInteraction(value)}
                orientation="vertical"
                className="h-16"
              />
              <div className="text-xs text-daw-text-tertiary font-mono">
                {masterEQ.highGain.toFixed(1)}
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs text-daw-text-tertiary">MID</div>
              <Slider
                value={masterEQ.midGain}
                min={-12}
                max={12}
                step={0.1}
                onChange={(value) => {
                  eqMidTelemetry.trackValueChange(value);
                  masterEQ.onMidGainChange(value);
                }}
                onInteractionStart={(value) => eqMidTelemetry.trackInteraction(value)}
                onInteractionEnd={(value) => eqMidTelemetry.endInteraction(value)}
                orientation="vertical"
                className="h-16"
              />
              <div className="text-xs text-daw-text-tertiary font-mono">
                {masterEQ.midGain.toFixed(1)}
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs text-daw-text-tertiary">LO</div>
              <Slider
                value={masterEQ.lowGain}
                min={-12}
                max={12}
                step={0.1}
                onChange={(value) => {
                  eqLowTelemetry.trackValueChange(value);
                  masterEQ.onLowGainChange(value);
                }}
                onInteractionStart={(value) => eqLowTelemetry.trackInteraction(value)}
                onInteractionEnd={(value) => eqLowTelemetry.endInteraction(value)}
                orientation="vertical"
                className="h-16"
              />
              <div className="text-xs text-daw-text-tertiary font-mono">
                {masterEQ.lowGain.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limiter */}
      {limiter && (
        <div className="space-y-2">
          <div className="text-xs text-daw-text-secondary text-center">LIMITER</div>
          <div className="space-y-2">
            <button
              className={cn(
                'w-full px-2 py-1 text-xs font-medium rounded transition-colors duration-150',
                'border border-daw-surface-tertiary',
                limiter.enabled
                  ? 'bg-daw-accent-primary text-white border-daw-accent-primary'
                  : 'bg-daw-surface-secondary text-daw-text-secondary hover:bg-daw-surface-tertiary'
              )}
              onClick={() => {
                limiterEnableTelemetry();
                limiter.onEnabledToggle();
              }}
            >
              {limiter.enabled ? 'ON' : 'OFF'}
            </button>
            
            <div className="space-y-1">
              <div className="text-xs text-daw-text-tertiary">Threshold</div>
              <Slider
                value={limiter.threshold}
                min={-20}
                max={0}
                step={0.1}
                onChange={(value) => {
                  limiterThresholdTelemetry.trackValueChange(value);
                  limiter.onThresholdChange(value);
                }}
                onInteractionStart={(value) => limiterThresholdTelemetry.trackInteraction(value)}
                onInteractionEnd={(value) => limiterThresholdTelemetry.endInteraction(value)}
                orientation="vertical"
                className="h-12 mx-auto"
                disabled={!limiter.enabled}
              />
              <div className="text-xs text-daw-text-tertiary font-mono text-center">
                {limiter.threshold.toFixed(1)}dB
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-daw-text-tertiary">Release</div>
              <Slider
                value={limiter.release}
                min={1}
                max={1000}
                step={1}
                onChange={(value) => {
                  limiterReleaseTelemetry.trackValueChange(value);
                  limiter.onReleaseChange(value);
                }}
                onInteractionStart={(value) => limiterReleaseTelemetry.trackInteraction(value)}
                onInteractionEnd={(value) => limiterReleaseTelemetry.endInteraction(value)}
                orientation="vertical"
                className="h-12 mx-auto"
                disabled={!limiter.enabled}
              />
              <div className="text-xs text-daw-text-tertiary font-mono text-center">
                {limiter.release}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Level Meters */}
      {level && (
        <div className="space-y-2">
          <div className="text-xs text-daw-text-secondary text-center">LEVELS</div>
          <div className="flex justify-center space-x-2">
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs text-daw-text-tertiary">L</div>
              <LevelMeter
                level={{ peak: level.peak, rms: level.rms }}
                orientation="vertical"
                height={100}
                width={8}
                showPeak
                showRMS
              />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs text-daw-text-tertiary">R</div>
              <LevelMeter
                level={{ peak: level.peak, rms: level.rms }}
                orientation="vertical"
                height={100}
                width={8}
                showPeak
                showRMS
              />
            </div>
          </div>
          
          {/* LUFS Display */}
          {level.lufs !== undefined && (
            <div className="text-center">
              <div className="text-xs text-daw-text-tertiary">LUFS</div>
              <div className="text-sm font-mono text-daw-text-primary">
                {level.lufs.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Master Mute Button */}
      <button
        className={buttonClasses(muted)}
        onClick={() => {
          masterMuteTelemetry();
          onMuteToggle();
        }}
        title="Mute master output"
      >
        MUTE
      </button>

      {/* Master Volume Fader */}
      <div className="flex-1 flex flex-col items-center justify-end space-y-2">
        <div className="text-xs text-daw-text-secondary">MASTER</div>
        <div className="flex-1 flex items-end">
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => {
              masterVolumeTelemetry.trackValueChange(value);
              onVolumeChange(value);
            }}
            onInteractionStart={(value) => masterVolumeTelemetry.trackInteraction(value)}
            onInteractionEnd={(value) => masterVolumeTelemetry.endInteraction(value)}
            orientation="vertical"
            className="h-40"
          />
        </div>
        <div className="text-xs text-daw-text-tertiary font-mono">
          {volumeDb > -60 ? `${volumeDb.toFixed(1)}dB` : '-∞'}
        </div>
      </div>

      {/* Output Indicators */}
      <div className="flex justify-center space-x-2">
        <div className={cn(
          'w-3 h-3 rounded-full',
          !muted && level && level.peak > 0.01 ? 'bg-green-500' : 'bg-daw-surface-tertiary'
        )} title="Left Output" />
        <div className={cn(
          'w-3 h-3 rounded-full',
          !muted && level && level.peak > 0.01 ? 'bg-green-500' : 'bg-daw-surface-tertiary'
        )} title="Right Output" />
      </div>

      {/* Peak Warning */}
      {level && level.peak > 0.95 && (
        <div className="text-center">
          <div className="text-xs text-red-500 font-bold animate-pulse">
            CLIP!
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterSection;