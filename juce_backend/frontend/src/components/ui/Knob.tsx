import React, { useCallback, useRef, useState } from 'react';
import { cn, clamp, mapRange } from '@/utils';
import type { KnobProps } from '@/types';

const Knob: React.FC<KnobProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  label,
  unit,
  disabled = false,
  className,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert value to rotation angle (-135° to +135°, 270° total range)
  const angle = mapRange(value, min, max, -135, 135);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled || !knobRef.current) return;

      setIsDragging(true);
      const startY = event.clientY;
      const startValue = value;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY; // Inverted for natural feel
        const sensitivity = (max - min) / 200; // Adjust sensitivity
        const newValue = startValue + deltaY * sensitivity;
        const steppedValue = Math.round(newValue / step) * step;
        onChange(clamp(steppedValue, min, max));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        onInteractionEnd?.(value);
      };

      onInteractionStart?.(value);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, value, min, max, step, onChange, onInteractionStart, onInteractionEnd]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (disabled) return;
      event.preventDefault();

      const delta = -event.deltaY;
      const sensitivity = step;
      const newValue = value + (delta > 0 ? sensitivity : -sensitivity);
      const steppedValue = Math.round(newValue / step) * step;
      onChange(clamp(steppedValue, min, max));
    },
    [disabled, value, min, max, step, onChange]
  );

  const knobClasses = cn(
    'relative w-12 h-12 rounded-full border-2 cursor-pointer select-none transition-all duration-150',
    'bg-daw-surface-secondary border-daw-surface-tertiary',
    'hover:border-daw-accent-primary focus:border-daw-accent-primary focus:outline-none',
    isDragging && 'border-daw-accent-primary scale-105',
    disabled &&
      'cursor-not-allowed opacity-50 hover:border-daw-surface-tertiary'
  );

  const indicatorClasses = cn(
    'absolute w-0.5 h-4 bg-daw-accent-primary rounded-full',
    'top-1 left-1/2 transform -translate-x-1/2 origin-bottom transition-transform duration-150'
  );

  const displayValue = unit ? `${value}${unit}` : value.toString();

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      {label && (
        <label className="text-xs font-medium text-daw-text-secondary">
          {label}
        </label>
      )}
      <div
        ref={knobRef}
        className={knobClasses}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
      >
        <div
          className={indicatorClasses}
          style={{ transform: `translate(-50%, 0) rotate(${angle}deg)` }}
        />
      </div>
      <div className="text-xs text-daw-text-tertiary font-mono min-w-[3rem] text-center">
        {displayValue}
      </div>
    </div>
  );
};

export default Knob;
