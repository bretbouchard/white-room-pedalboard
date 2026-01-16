import React, { useMemo } from 'react';
import { cn, clamp, linearToDb } from '@/utils';
import type { LevelMeterProps } from '@/types';

const LevelMeter: React.FC<LevelMeterProps> = ({
  level,
  orientation = 'vertical',
  height = 128,
  width = 16,
  showPeak = true,
  showRMS = true,
}) => {
  // Convert linear values to dB for display
  const peakDb = useMemo(() => linearToDb(level.peak), [level.peak]);
  const rmsDb = useMemo(() => linearToDb(level.rms), [level.rms]);

  // Map dB values to percentage (assuming -60dB to 0dB range)
  const peakPercentage = clamp(((peakDb + 60) / 60) * 100, 0, 100);
  const rmsPercentage = clamp(((rmsDb + 60) / 60) * 100, 0, 100);

  // Determine colors based on dB levels
  const getPeakColor = (db: number) => {
    if (db > -3) return 'bg-audio-level-red';
    if (db > -12) return 'bg-audio-level-yellow';
    return 'bg-audio-level-green';
  };

  const getRMSColor = (db: number) => {
    if (db > -6) return 'bg-audio-level-red opacity-70';
    if (db > -18) return 'bg-audio-level-yellow opacity-70';
    return 'bg-audio-level-green opacity-70';
  };

  const containerClasses = cn(
    'relative bg-daw-surface-tertiary rounded-sm overflow-hidden',
    orientation === 'vertical' ? 'flex flex-col-reverse' : 'flex flex-row'
  );

  const containerStyle = {
    width: orientation === 'vertical' ? width : height,
    height: orientation === 'vertical' ? height : width,
  };

  const peakBarClasses = cn(
    'transition-all duration-75 ease-out',
    getPeakColor(peakDb)
  );

  const rmsBarClasses = cn(
    'absolute transition-all duration-100 ease-out',
    getRMSColor(rmsDb),
    orientation === 'vertical'
      ? 'bottom-0 left-0 right-0'
      : 'top-0 left-0 bottom-0'
  );

  const peakBarStyle =
    orientation === 'vertical'
      ? { height: `${peakPercentage}%`, width: '100%' }
      : { width: `${peakPercentage}%`, height: '100%' };

  const rmsBarStyle =
    orientation === 'vertical'
      ? { height: `${rmsPercentage}%`, width: '100%' }
      : { width: `${rmsPercentage}%`, height: '100%' };

  // Scale markings for professional meters
  const scaleMarks = [-60, -48, -36, -24, -18, -12, -6, -3, 0];

  return (
    <div className="flex items-center space-x-2">
      {/* Scale markings (left side for vertical, top for horizontal) */}
      {orientation === 'vertical' && (
        <div
          className="flex flex-col-reverse justify-between text-xs text-daw-text-tertiary font-mono"
          style={{ height }}
        >
          {scaleMarks.map(mark => (
            <div key={mark} className="leading-none">
              {mark === 0 ? '0' : mark.toString()}
            </div>
          ))}
        </div>
      )}

      {/* Meter container */}
      <div className={containerClasses} style={containerStyle}>
        {/* Peak level bar */}
        {showPeak && <div className={peakBarClasses} style={peakBarStyle} />}

        {/* RMS level bar (overlay) */}
        {showRMS && <div className={rmsBarClasses} style={rmsBarStyle} />}

        {/* Clip indicator */}
        {peakDb > -0.1 && (
          <div
            className={cn(
              'absolute bg-red-500 animate-pulse',
              orientation === 'vertical'
                ? 'top-0 left-0 right-0 h-1'
                : 'top-0 right-0 bottom-0 w-1'
            )}
          />
        )}
      </div>

      {/* Digital readout */}
      <div className="flex flex-col text-xs font-mono text-daw-text-tertiary">
        {showPeak && (
          <div
            className={cn(
              'text-right',
              peakDb > -3 && 'text-red-400',
              peakDb > -12 && peakDb <= -3 && 'text-yellow-400'
            )}
          >
            {peakDb > -60 ? peakDb.toFixed(1) : '-∞'}
          </div>
        )}
        {showRMS && (
          <div className="text-right opacity-70">
            {rmsDb > -60 ? rmsDb.toFixed(1) : '-∞'}
          </div>
        )}
        {level.lufs !== undefined && (
          <div className="text-right text-blue-400">
            {level.lufs.toFixed(1)}L
          </div>
        )}
      </div>

      {/* Scale markings (right side for vertical, bottom for horizontal) */}
      {orientation === 'horizontal' && (
        <div
          className="flex justify-between text-xs text-daw-text-tertiary font-mono"
          style={{ width: height }}
        >
          {scaleMarks.map(mark => (
            <div key={mark} className="leading-none transform -rotate-90">
              {mark === 0 ? '0' : mark.toString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LevelMeter;
