import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/utils';
import Timeline from './Timeline';
import TrackLane, { AudioRegion, MidiRegion } from './TrackLane';

export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument';
  height: number;
  selected: boolean;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  audioRegions: AudioRegion[];
  midiRegions: MidiRegion[];
  color?: string;
}

export interface Selection {
  trackIds: string[];
  regionIds: string[];
  timeRange?: {
    start: number;
    end: number;
  };
}

export interface TrackViewProps {
  tracks: Track[];
  duration: number; // in seconds
  currentTime: number; // in seconds
  sampleRate: number;
  pixelsPerSecond: number;
  onSeek: (time: number) => void;
  onTrackSelect?: (trackId: string, multiSelect?: boolean) => void;
  onTrackDelete?: (trackId: string) => void;
  onRegionSelect?: (regionId: string, regionType: 'audio' | 'midi', trackId: string) => void;
  onRegionMove?: (regionId: string, regionType: 'audio' | 'midi', trackId: string, newStartTime: number) => void;
  onRegionResize?: (regionId: string, regionType: 'audio' | 'midi', trackId: string, newDuration: number, resizeEnd: 'start' | 'end') => void;
  onRegionSplit?: (regionId: string, regionType: 'audio' | 'midi', trackId: string, splitTime: number) => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: (time: number, trackId?: string) => void;
  onDelete?: () => void;
  className?: string;
  snapToGrid?: boolean;
  gridSize?: number; // in seconds
  showRuler?: boolean;
  selection?: Selection;
}

const TrackView: React.FC<TrackViewProps> = ({
  tracks,
  duration,
  currentTime,
  sampleRate,
  pixelsPerSecond,
  onSeek,
  onTrackSelect,
  onTrackDelete,
  onRegionSelect,
  onRegionMove,
  onRegionResize,
  onRegionSplit,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  className,
  snapToGrid = false,
  gridSize = 1,
  showRuler = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  const timelineHeight = 60;
  const totalHeight = tracks.reduce((sum, track) => sum + track.height, 0) + timelineHeight;
  const totalWidth = duration * pixelsPerSecond;

  // Handle horizontal scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!containerRef.current?.contains(document.activeElement)) return;

    const { ctrlKey, metaKey, key } = event;
    const modifier = ctrlKey || metaKey;

    switch (key) {
      case 'x':
        if (modifier) {
          event.preventDefault();
          onCut?.();
        }
        break;
      case 'c':
        if (modifier) {
          event.preventDefault();
          onCopy?.();
        }
        break;
      case 'v':
        if (modifier) {
          event.preventDefault();
          onPaste?.(currentTime);
        }
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        onDelete?.();
        break;
      case 'a':
        if (modifier) {
          event.preventDefault();
          // Select all regions - would need to be handled by parent component
          console.log('Select all regions not implemented');
        }
        break;
      case ' ':
        event.preventDefault();
        // This would typically trigger play/pause
        break;
    }
  }, [currentTime, onCut, onCopy, onPaste, onDelete, tracks]);

  // Handle selection box
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target !== event.currentTarget) return; // Only on empty space
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = event.clientX - rect.left + scrollLeft;
    const startY = event.clientY - rect.top + scrollTop;

    setIsSelecting(true);
    setSelectionBox({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
  }, [scrollLeft, scrollTop]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const endX = event.clientX - rect.left + scrollLeft;
    const endY = event.clientY - rect.top + scrollTop;

    setSelectionBox(prev => prev ? {
      ...prev,
      endX,
      endY,
    } : null);
  }, [isSelecting, selectionBox, scrollLeft, scrollTop]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionBox) {
      // Selection box logic would need to be implemented
      console.log('Region selection not implemented');
    }

    setIsSelecting(false);
    setSelectionBox(null);
  }, [isSelecting, selectionBox]);

  // Handle track selection
  const handleTrackClick = useCallback((trackId: string, event: React.MouseEvent) => {
    const multiSelect = event.ctrlKey || event.metaKey;
    onTrackSelect?.(trackId, multiSelect);
  }, [onTrackSelect]);

  // Handle region operations
  const handleRegionSelect = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string) => {
    onRegionSelect?.(regionId, regionType, trackId);
  }, [onRegionSelect]);

  const handleRegionMove = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, newStartTime: number) => {
    // Snap to grid if enabled
    const snappedTime = snapToGrid && gridSize > 0 
      ? Math.round(newStartTime / gridSize) * gridSize 
      : newStartTime;
    
    onRegionMove?.(regionId, regionType, trackId, snappedTime);
  }, [onRegionMove, snapToGrid, gridSize]);

  const handleRegionResize = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, newDuration: number, resizeEnd: 'start' | 'end') => {
    onRegionResize?.(regionId, regionType, trackId, newDuration, resizeEnd);
  }, [onRegionResize]);

  const handleRegionSplit = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, splitTime: number) => {
    onRegionSplit?.(regionId, regionType, trackId, splitTime);
  }, [onRegionSplit]);

  const containerClasses = cn(
    'relative bg-daw-surface-primary border border-daw-surface-tertiary overflow-auto',
    'min-h-0',
    'focus:outline-none focus:ring-2 focus:ring-daw-accent-primary',
    className
  );

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      tabIndex={0}
      role="region"
      aria-label="Track view"
    >
      {/* Timeline - sticky at top */}
      <div 
        className="sticky top-0 z-20 bg-daw-surface-primary border-b border-daw-surface-tertiary"
        style={{ marginLeft: -scrollLeft }}
      >
        <Timeline
          duration={duration}
          currentTime={currentTime}
          sampleRate={sampleRate}
          pixelsPerSecond={pixelsPerSecond}
          onSeek={onSeek}
          height={timelineHeight}
          showRuler={showRuler}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
        />
      </div>

      {/* Track lanes */}
      <div 
        className="relative min-h-full"
        style={{ 
          width: totalWidth,
          height: totalHeight - timelineHeight,
        }}
      >
        {tracks.map((track, index) => {
          const trackTop = tracks.slice(0, index).reduce((sum, t) => sum + t.height, 0);
          
          return (
            <div
              key={track.id}
              className="absolute left-0 right-0"
              style={{ 
                top: trackTop,
                height: track.height,
              }}
              onClick={(e) => handleTrackClick(track.id, e)}
            >
              <TrackLane
                id={track.id}
                name={track.name}
                type={track.type}
                height={track.height}
                pixelsPerSecond={pixelsPerSecond}
                audioRegions={track.audioRegions}
                midiRegions={track.midiRegions}
                onRegionSelect={(regionId, regionType) => handleRegionSelect(regionId, regionType, track.id)}
                onRegionMove={(regionId, regionType, newStartTime) => handleRegionMove(regionId, regionType, track.id, newStartTime)}
                onRegionResize={(regionId, regionType, newDuration, resizeEnd) => handleRegionResize(regionId, regionType, track.id, newDuration, resizeEnd)}
                onRegionSplit={(regionId, regionType, splitTime) => handleRegionSplit(regionId, regionType, track.id, splitTime)}
                onTrackSelect={() => handleTrackClick(track.id, {} as React.MouseEvent)}
                onTrackDelete={onTrackDelete}
                selected={track.selected}
                muted={track.muted}
                solo={track.solo}
                armed={track.armed}
              />
            </div>
          );
        })}

        {/* Grid lines */}
        {snapToGrid && gridSize > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.ceil(duration / gridSize) }, (_, i) => {
                  const rawLeft = i * gridSize * pixelsPerSecond;
                  const leftPos = Number.isFinite(rawLeft) ? rawLeft : 0;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-daw-surface-tertiary opacity-30"
                      style={{ left: leftPos }}
                    />
                  );
                })}
          </div>
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-daw-accent-primary z-10 pointer-events-none"
          style={{ left: Number.isFinite(currentTime * pixelsPerSecond) ? currentTime * pixelsPerSecond : 0 }}
        />

        {/* Selection box */}
        {isSelecting && selectionBox && (
            <div
            className="absolute border-2 border-daw-accent-primary bg-daw-accent-primary bg-opacity-20 pointer-events-none z-30"
            style={{
              left: (() => { const v = Math.min(selectionBox.startX, selectionBox.endX); return Number.isFinite(v) ? v : 0; })(),
              top: (() => { const v = Math.min(selectionBox.startY, selectionBox.endY); return Number.isFinite(v) ? v : 0; })(),
              width: (() => { const v = Math.abs(selectionBox.endX - selectionBox.startX); return Number.isFinite(v) ? v : 0; })(),
              height: (() => { const v = Math.abs(selectionBox.endY - selectionBox.startY); return Number.isFinite(v) ? v : 0; })(),
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="sticky bottom-0 left-0 right-0 h-6 bg-daw-surface-secondary border-t border-daw-surface-tertiary text-xs text-daw-text-secondary flex items-center justify-between px-2 z-20">
        <div>
          Tracks: {tracks.length} | 
          Regions: {tracks.reduce((sum, track) => sum + track.audioRegions.length + track.midiRegions.length, 0)} |
          Duration: {Math.floor(duration / 60)}:{(duration % 60).toFixed(2).padStart(5, '0')}
        </div>
        <div>
          Zoom: {Math.round(pixelsPerSecond * 10) / 10}px/s |
          Grid: {snapToGrid ? `${gridSize}s` : 'Off'}
        </div>
      </div>
    </div>
  );
};

export default TrackView;
