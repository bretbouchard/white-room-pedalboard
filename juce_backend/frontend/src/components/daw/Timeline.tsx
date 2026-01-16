import React, { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/utils';

export interface TimelineProps {
  duration: number; // in seconds
  currentTime: number; // in seconds
  sampleRate: number;
  pixelsPerSecond: number;
  onSeek: (time: number) => void;
  onTimeRangeChange?: (start: number, end: number) => void;
  className?: string;
  height?: number;
  showRuler?: boolean;
  snapToGrid?: boolean;
  gridSize?: number; // in seconds
}

interface TimeMarker {
  time: number;
  label: string;
  type: 'major' | 'minor' | 'beat';
}

const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  sampleRate,
  pixelsPerSecond,
  onSeek,
  className,
  height = 60,
  showRuler = true,
  snapToGrid = false,
  gridSize = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const width = duration * pixelsPerSecond;

  // Generate time markers
  const generateTimeMarkers = useCallback((): TimeMarker[] => {
    const markers: TimeMarker[] = [];
    const majorInterval = Math.max(1, Math.floor(10 / pixelsPerSecond)); // Major marks every ~10 pixels minimum
    const minorInterval = majorInterval / 4;

    for (let time = 0; time <= duration; time += minorInterval) {
      const isMajor = time % majorInterval === 0;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const centiseconds = Math.floor((time % 1) * 100);

      markers.push({
        time,
        label: isMajor ? `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}` : '',
        type: isMajor ? 'major' : 'minor',
      });
    }

    return markers;
  }, [duration, pixelsPerSecond]);

  // Draw timeline
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);

    if (!showRuler) return;

    const markers = generateTimeMarkers();

    // Draw time markers
    markers.forEach(marker => {
      const x = marker.time * pixelsPerSecond;
      
      if (marker.type === 'major') {
        // Major tick
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, height - 20);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Time label
        if (marker.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(marker.label, x, height - 25);
        }
      } else {
        // Minor tick
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, height - 10);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    });

    // Draw grid lines if snap is enabled
    if (snapToGrid && gridSize > 0) {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      for (let time = 0; time <= duration; time += gridSize) {
        const x = time * pixelsPerSecond;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }

    // Draw playhead
    const playheadX = currentTime * pixelsPerSecond;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

  }, [width, height, showRuler, generateTimeMarkers, pixelsPerSecond, currentTime, snapToGrid, gridSize, duration]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  // Handle mouse interactions
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / pixelsPerSecond;

    setIsDragging(true);
    setDragStart(time);

    // Snap to grid if enabled
    const snappedTime = snapToGrid && gridSize > 0 
      ? Math.round(time / gridSize) * gridSize 
      : time;

    onSeek(Math.max(0, Math.min(duration, snappedTime)));
  }, [pixelsPerSecond, snapToGrid, gridSize, duration, onSeek]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / pixelsPerSecond;

    // Snap to grid if enabled
    const snappedTime = snapToGrid && gridSize > 0 
      ? Math.round(time / gridSize) * gridSize 
      : time;

    onSeek(Math.max(0, Math.min(duration, snappedTime)));
  }, [isDragging, pixelsPerSecond, snapToGrid, gridSize, duration, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!containerRef.current?.contains(document.activeElement)) return;

    const step = snapToGrid && gridSize > 0 ? gridSize : 0.1;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        onSeek(Math.max(0, currentTime - step));
        break;
      case 'ArrowRight':
        event.preventDefault();
        onSeek(Math.min(duration, currentTime + step));
        break;
      case 'Home':
        event.preventDefault();
        onSeek(0);
        break;
      case 'End':
        event.preventDefault();
        onSeek(duration);
        break;
    }
  }, [currentTime, duration, onSeek, snapToGrid, gridSize]);

  const containerClasses = cn(
    'relative bg-daw-surface-primary border border-daw-surface-tertiary',
    'focus:outline-none focus:ring-2 focus:ring-daw-accent-primary',
    className
  );

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Timeline"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="block cursor-pointer"
      />
      
      {/* Sample-accurate position indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-daw-surface-secondary text-xs text-daw-text-secondary flex items-center justify-center">
        Sample: {Math.floor(currentTime * sampleRate).toLocaleString()}
      </div>
    </div>
  );
};

export default Timeline;
