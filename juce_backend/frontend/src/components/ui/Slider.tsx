import React, { useCallback, useRef } from 'react';
import { cn, clamp, mapRange } from '@/utils';
import type { SliderProps } from '@/types';

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  orientation = 'horizontal',
  label,
  disabled = false,
  className,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const isHorizontal = orientation === 'horizontal';

      const updateValue = (clientX: number, clientY: number) => {
        const position = isHorizontal
          ? (clientX - rect.left) / rect.width
          : 1 - (clientY - rect.top) / rect.height;

        const clampedPosition = clamp(position, 0, 1);
        const newValue = mapRange(clampedPosition, 0, 1, min, max);
        const steppedValue = Math.round(newValue / step) * step;
        onChange(clamp(steppedValue, min, max));
      };

      const handleMouseMove = (e: MouseEvent) => {
        updateValue(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        onInteractionEnd?.(value);
      };

      updateValue(event.clientX, event.clientY);
      onInteractionStart?.(value);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, orientation, min, max, step, onChange, onInteractionStart, onInteractionEnd, value]
  );

  const percentage = ((value - min) / (max - min)) * 100;

  const sliderClasses = cn(
    'relative cursor-pointer rounded-full bg-daw-surface-tertiary',
    orientation === 'horizontal' ? 'h-2 w-full' : 'h-full w-2',
    disabled && 'cursor-not-allowed opacity-50',
    className
  );

  const trackClasses = cn(
    'absolute rounded-full bg-daw-accent-primary transition-all duration-150',
    orientation === 'horizontal'
      ? 'h-full left-0 top-0'
      : 'w-full bottom-0 left-0'
  );

  const thumbClasses = cn(
    'absolute h-4 w-4 rounded-full bg-daw-accent-primary border-2 border-daw-bg-primary transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 hover:scale-110',
    disabled && 'hover:scale-100'
  );

  const trackStyle =
    orientation === 'horizontal'
      ? { width: `${percentage}%` }
      : { height: `${percentage}%` };

  const thumbStyle =
    orientation === 'horizontal'
      ? { left: `${percentage}%`, top: '50%' }
      : {
          left: '50%',
          bottom: `${percentage}%`,
          transform: 'translate(-50%, 50%)',
        };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-daw-text-primary">
          {label}: {value}
        </label>
      )}
      <div
        ref={sliderRef}
        className={sliderClasses}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
      >
        <div className={trackClasses} style={trackStyle} />
        <div className={thumbClasses} style={thumbStyle} />
      </div>
    </div>
  );
};

export default Slider;
