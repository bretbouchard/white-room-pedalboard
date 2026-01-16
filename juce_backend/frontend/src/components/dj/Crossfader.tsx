import React, { useCallback, useRef, useState } from 'react';
import { cn, clamp, mapRange } from '@/utils';
import { useDJStore } from '@/stores/djStore';
import type { CrossfaderState } from '@/types';

export interface CrossfaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCurveControl?: boolean;
  showReverseControl?: boolean;
}

const Crossfader: React.FC<CrossfaderProps> = ({
  className,
  size = 'md',
  showCurveControl = true,
  showReverseControl = true,
}) => {
  const {
    crossfader,
    setCrossfaderPosition,
    setCrossfaderCurve,
    toggleCrossfaderReverse,
  } = useDJStore();

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!sliderRef.current) return;

      setIsDragging(true);
      const rect = sliderRef.current.getBoundingClientRect();

      const updatePosition = (clientX: number) => {
        const position = (clientX - rect.left) / rect.width;
        const clampedPosition = clamp(position, 0, 1);
        const crossfaderValue = mapRange(clampedPosition, 0, 1, -1, 1);
        setCrossfaderPosition(crossfaderValue);
      };

      const handleMouseMove = (e: MouseEvent) => {
        updatePosition(e.clientX);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      updatePosition(event.clientX);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [setCrossfaderPosition]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = 0.1;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setCrossfaderPosition(crossfader.position - step);
          break;
        case 'ArrowRight':
          event.preventDefault();
          setCrossfaderPosition(crossfader.position + step);
          break;
        case 'Home':
          event.preventDefault();
          setCrossfaderPosition(-1);
          break;
        case 'End':
          event.preventDefault();
          setCrossfaderPosition(1);
          break;
        case ' ':
          event.preventDefault();
          setCrossfaderPosition(0);
          break;
      }
    },
    [crossfader.position, setCrossfaderPosition]
  );

  // Calculate position percentage for display
  const positionPercentage = mapRange(crossfader.position, -1, 1, 0, 100);
  const displayPosition = crossfader.reverse ? 100 - positionPercentage : positionPercentage;

  // Size-based styling
  const sizeClasses = {
    sm: {
      container: 'h-16 w-48',
      track: 'h-2',
      thumb: 'h-6 w-3',
      label: 'text-xs',
    },
    md: {
      container: 'h-20 w-64',
      track: 'h-3',
      thumb: 'h-8 w-4',
      label: 'text-sm',
    },
    lg: {
      container: 'h-24 w-80',
      track: 'h-4',
      thumb: 'h-10 w-5',
      label: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  const containerClasses = cn(
    'flex flex-col items-center space-y-3 p-4 bg-daw-surface-secondary rounded-lg border border-daw-surface-tertiary',
    currentSize.container,
    className
  );

  const trackClasses = cn(
    'relative w-full rounded-full bg-daw-surface-tertiary cursor-pointer',
    currentSize.track
  );

  const thumbClasses = cn(
    'absolute rounded-sm bg-daw-accent-primary border-2 border-daw-bg-primary transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 shadow-lg',
    currentSize.thumb,
    isDragging && 'scale-110 shadow-xl',
    'hover:scale-105'
  );

  const labelClasses = cn(
    'font-medium text-daw-text-primary',
    currentSize.label
  );

  return (
    <div className={containerClasses}>
      {/* Crossfader Label */}
      <div className="flex items-center justify-between w-full">
        <span className={cn(labelClasses, 'text-daw-accent-secondary')}>A</span>
        <span className={cn(labelClasses, 'font-bold')}>CROSSFADER</span>
        <span className={cn(labelClasses, 'text-daw-accent-tertiary')}>B</span>
      </div>

      {/* Crossfader Track */}
      <div
        ref={sliderRef}
        className={trackClasses}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={crossfader.position}
        aria-label="Crossfader"
        tabIndex={0}
      >
        {/* Track gradient to show A/B sides */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-daw-accent-secondary via-daw-surface-primary to-daw-accent-tertiary opacity-30" />
        
        {/* Crossfader thumb */}
        <div
          className={thumbClasses}
          style={{
            left: `${displayPosition}%`,
            top: '50%',
          }}
        />
      </div>

      {/* Position indicator */}
      <div className={cn(labelClasses, 'text-daw-text-tertiary font-mono')}>
        {crossfader.position.toFixed(2)}
      </div>

      {/* Controls */}
      {(showCurveControl || showReverseControl) && (
        <div className="flex items-center space-x-4 mt-2">
          {showCurveControl && (
            <div className="flex flex-col items-center space-y-1">
              <label className="text-xs text-daw-text-secondary">Curve</label>
              <select
                value={crossfader.curve}
                onChange={(e) => setCrossfaderCurve(e.target.value as CrossfaderState['curve'])}
                className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
              >
                <option value="linear">Linear</option>
                <option value="logarithmic">Log</option>
                <option value="exponential">Exp</option>
              </select>
            </div>
          )}

          {showReverseControl && (
            <div className="flex flex-col items-center space-y-1">
              <label className="text-xs text-daw-text-secondary">Reverse</label>
              <button
                onClick={toggleCrossfaderReverse}
                className={cn(
                  'px-3 py-1 text-xs rounded border transition-colors duration-150',
                  crossfader.reverse
                    ? 'bg-daw-accent-primary text-daw-bg-primary border-daw-accent-primary'
                    : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
                )}
              >
                {crossfader.reverse ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Crossfader;