import React, { useCallback } from 'react';
import { cn } from '@/utils';

export interface NavigationControlsProps {
  // Timeline navigation
  currentTime: number;
  totalTime: number;
  onSeek: (time: number) => void;
  
  // Zoom controls
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  
  // View controls
  viewStart: number;
  viewEnd: number;
  onViewChange: (start: number, end: number) => void;
  
  // Grid and snap
  snapEnabled: boolean;
  gridSize: number;
  onSnapToggle: (enabled: boolean) => void;
  onGridSizeChange: (size: number) => void;
  
  className?: string;
}

const gridSizes = [
  { value: 1, label: '1 Bar' },
  { value: 0.5, label: '1/2 Note' },
  { value: 0.25, label: '1/4 Note' },
  { value: 0.125, label: '1/8 Note' },
  { value: 0.0625, label: '1/16 Note' },
  { value: 0.03125, label: '1/32 Note' },
];

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentTime,
  totalTime,
  onSeek,
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomChange,
  viewStart,
  viewEnd,
  onViewChange,
  snapEnabled,
  gridSize,
  onSnapToggle,
  onGridSizeChange,
  className,
}) => {


  // Format time display
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoomLevel * 1.5);
    onZoomChange(newZoom);
  }, [zoomLevel, maxZoom, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoomLevel / 1.5);
    onZoomChange(newZoom);
  }, [zoomLevel, minZoom, onZoomChange]);

  // Handle zoom to fit
  const handleZoomToFit = useCallback(() => {
    onZoomChange(1);
    onViewChange(0, totalTime);
  }, [onZoomChange, onViewChange, totalTime]);

  // Handle horizontal scroll
  const handleHorizontalScroll = useCallback((delta: number) => {
    const viewDuration = viewEnd - viewStart;
    const scrollAmount = viewDuration * 0.1 * delta;
    const newStart = Math.max(0, Math.min(totalTime - viewDuration, viewStart + scrollAmount));
    const newEnd = newStart + viewDuration;
    onViewChange(newStart, newEnd);
  }, [viewStart, viewEnd, totalTime, onViewChange]);

  // Handle timeline click
  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickTime = (clickX / timelineWidth) * totalTime;
    onSeek(clickTime);
  }, [totalTime, onSeek]);

  // Handle minimap navigation
  const handleMinimapClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const minimapWidth = rect.width;
    const clickTime = (clickX / minimapWidth) * totalTime;
    
    const viewDuration = viewEnd - viewStart;
    const newStart = Math.max(0, Math.min(totalTime - viewDuration, clickTime - viewDuration / 2));
    const newEnd = newStart + viewDuration;
    onViewChange(newStart, newEnd);
  }, [totalTime, viewStart, viewEnd, onViewChange]);

  const controlsClasses = cn(
    'flex items-center justify-between p-3 bg-daw-surface-secondary border-b border-daw-surface-tertiary',
    className
  );

  return (
    <div className={controlsClasses}>
      {/* Left Section - Time Display and Transport */}
      <div className="flex items-center space-x-4">
        {/* Time Display */}
        <div className="flex items-center space-x-2">
          <div className="text-sm font-mono text-daw-text-primary bg-daw-surface-primary px-2 py-1 rounded border border-daw-surface-tertiary">
            {formatTime(currentTime)}
          </div>
          <span className="text-daw-text-tertiary">/</span>
          <div className="text-sm font-mono text-daw-text-secondary">
            {formatTime(totalTime)}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSeek(0)}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
            title="Go to beginning"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button
            onClick={() => onSeek(totalTime)}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
            title="Go to end"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 18h2V6h-2zm-3.5-6L4 6v12z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Center Section - Timeline and Minimap */}
      <div className="flex-1 mx-6 space-y-2">
        {/* Main Timeline */}
        <button
          className="relative h-6 bg-daw-surface-primary border border-daw-surface-tertiary rounded cursor-pointer w-full"
          onClick={handleTimelineClick}
          role="slider"
          aria-label="Timeline position"
          aria-valuemin={0}
          aria-valuemax={totalTime}
          aria-valuenow={currentTime}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const delta = e.shiftKey ? 10 : 1;
              const direction = e.key === 'ArrowLeft' ? -1 : 1;
              const newTime = Math.max(0, Math.min(totalTime, currentTime + (direction * delta)));
              onSeek(newTime);
            }
          }}
        >
          {/* Timeline Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-daw-surface-primary to-daw-surface-secondary rounded" />
          
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-daw-accent-primary z-10"
            style={{ left: `${(currentTime / totalTime) * 100}%` }}
          />
          
          {/* Grid Lines */}
          {snapEnabled && (
            <div className="absolute inset-0">
              {Array.from({ length: Math.floor(totalTime / gridSize) }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-daw-surface-tertiary opacity-50"
                  style={{ left: `${((i * gridSize) / totalTime) * 100}%` }}
                />
              ))}
            </div>
          )}
        </button>

        {/* Minimap */}
        <button
          className="relative h-3 bg-daw-surface-primary border border-daw-surface-tertiary rounded cursor-pointer w-full"
          onClick={handleMinimapClick}
          role="slider"
          aria-label="Timeline minimap"
          aria-valuemin={0}
          aria-valuemax={totalTime}
          aria-valuenow={viewStart + (viewEnd - viewStart) / 2}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const delta = e.shiftKey ? 10 : 1;
              const direction = e.key === 'ArrowLeft' ? -1 : 1;
              handleHorizontalScroll(direction * delta);
            }
          }}
        >
          {/* View Window */}
          <div
            className="absolute top-0 bottom-0 bg-daw-accent-primary bg-opacity-30 border border-daw-accent-primary"
            style={{
              left: `${(viewStart / totalTime) * 100}%`,
              width: `${((viewEnd - viewStart) / totalTime) * 100}%`,
            }}
          />
          
          {/* Playhead in Minimap */}
          <div
            className="absolute top-0 bottom-0 w-px bg-daw-accent-primary z-10"
            style={{ left: `${(currentTime / totalTime) * 100}%` }}
          />
        </button>
      </div>

      {/* Right Section - Zoom and Grid Controls */}
      <div className="flex items-center space-x-4">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= minZoom}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          
          <div className="text-xs text-daw-text-secondary font-mono min-w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </div>
          
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= maxZoom}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          
          <button
            onClick={handleZoomToFit}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
            title="Zoom to fit"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* Grid and Snap Controls */}
        <div className="flex items-center space-x-2 border-l border-daw-surface-tertiary pl-4">
          {/* Snap Toggle */}
          <button
            onClick={() => onSnapToggle(!snapEnabled)}
            className={cn(
              'p-1 rounded transition-colors duration-150',
              snapEnabled 
                ? 'bg-daw-accent-primary text-white' 
                : 'hover:bg-daw-surface-tertiary text-daw-text-secondary'
            )}
            title="Toggle snap to grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>

          {/* Grid Size Selector */}
          <select
            value={gridSize}
            onChange={(e) => onGridSizeChange(Number(e.target.value))}
            className={cn(
              'text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded px-2 py-1',
              'text-daw-text-primary focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
            )}
            disabled={!snapEnabled}
          >
            {gridSizes.map(size => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Horizontal Scroll */}
        <div className="flex items-center space-x-1 border-l border-daw-surface-tertiary pl-4">
          <button
            onClick={() => handleHorizontalScroll(-1)}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
            title="Scroll left"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleHorizontalScroll(1)}
            className="p-1 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
            title="Scroll right"
          >
            <svg className="w-4 h-4 text-daw-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationControls;