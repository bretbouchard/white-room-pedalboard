import React, { useRef, useCallback, useState } from 'react';
import { cn } from '@/utils';
import Waveform from '../ui/Waveform';
import type { WaveformData } from '@/types';

export interface AudioRegion {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  waveformData?: WaveformData;
  color?: string;
  selected?: boolean;
  muted?: boolean;
  fadeIn?: number; // in seconds
  fadeOut?: number; // in seconds
  gain?: number; // in dB
}

export interface MidiRegion {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  notes: MidiNote[];
  color?: string;
  selected?: boolean;
  muted?: boolean;
}

export interface MidiNote {
  pitch: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  startTime: number; // in seconds, relative to region
  duration: number; // in seconds
}

export interface TrackLaneProps {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument';
  height: number;
  pixelsPerSecond: number;
  audioRegions?: AudioRegion[];
  midiRegions?: MidiRegion[];
  onRegionSelect?: (regionId: string, regionType: 'audio' | 'midi') => void;
  onRegionMove?: (regionId: string, regionType: 'audio' | 'midi', newStartTime: number) => void;
  onRegionResize?: (regionId: string, regionType: 'audio' | 'midi', newDuration: number, resizeEnd: 'start' | 'end') => void;
  onRegionSplit?: (regionId: string, regionType: 'audio' | 'midi', splitTime: number) => void;
  onTrackSelect?: (trackId: string) => void;
  onTrackDelete?: (trackId: string) => void;
  className?: string;
  selected?: boolean;
  muted?: boolean;
  solo?: boolean;
  armed?: boolean;
}

const TrackLane: React.FC<TrackLaneProps> = ({
  id,
  name,
  type,
  height,
  pixelsPerSecond,
  audioRegions = [],
  midiRegions = [],
  onRegionSelect,
  onRegionMove,
  onRegionResize,
  onRegionSplit,
  onTrackSelect,
  onTrackDelete,
  className,
  selected = false,
  muted = false,
  solo = false,
  armed = false,
}) => {
  // Defensive programming: ensure name and type are valid strings
  const safeName = name && typeof name === 'string' && !name.includes('NaN') ? name : 'Unknown Track';
  const safeType = type && typeof type === 'string' && !type.includes('NaN') ? type : 'audio';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'resize-start' | 'resize-end' | null;
    regionId: string | null;
    regionType: 'audio' | 'midi' | null;
    startX: number;
    startTime: number;
  }>({
    isDragging: false,
    dragType: null,
    regionId: null,
    regionType: null,
    startX: 0,
    startTime: 0,
  });

  // Render audio region
  const renderAudioRegion = useCallback((region: AudioRegion) => {
    const x = region.startTime * pixelsPerSecond;
    const width = region.duration * pixelsPerSecond;
    const regionHeight = height - 4; // Leave some padding

    const regionClasses = cn(
      'absolute border-2 rounded cursor-pointer transition-all duration-150',
      region.selected ? 'border-daw-accent-primary' : 'border-daw-surface-tertiary',
      region.muted && 'opacity-50',
      'hover:border-daw-accent-secondary'
    );

    const handleRegionMouseDown = (event: React.MouseEvent) => {
      event.stopPropagation();
      
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const resizeThreshold = 10; // pixels
      
      let dragType: 'move' | 'resize-start' | 'resize-end' = 'move';
      
      if (clickX < resizeThreshold) {
        dragType = 'resize-start';
      } else if (clickX > width - resizeThreshold) {
        dragType = 'resize-end';
      }

      setDragState({
        isDragging: true,
        dragType,
        regionId: region.id,
        regionType: 'audio',
        startX: event.clientX,
        startTime: region.startTime,
      });

      onRegionSelect?.(region.id, 'audio');
    };

    const handleDoubleClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const splitTime = region.startTime + (clickX / pixelsPerSecond);
      onRegionSplit?.(region.id, 'audio', splitTime);
    };

    return (
      <div
        key={region.id}
        className={regionClasses}
        style={{
          left: x,
          top: 2,
          width,
          height: regionHeight,
          backgroundColor: region.color || '#4ecdc4',
        }}
        onMouseDown={handleRegionMouseDown}
        onDoubleClick={handleDoubleClick}
        title={region.name}
      >
        {/* Waveform visualization */}
        {region.waveformData && width > 50 && (
          <Waveform
            data={region.waveformData}
            width={width - 4}
            height={regionHeight - 4}
            color="rgba(255, 255, 255, 0.8)"
            backgroundColor="transparent"
            className="absolute inset-1"
          />
        )}
        
        {/* Region name */}
        <div className="absolute top-1 left-2 text-xs text-white font-medium truncate max-w-full">
          {region.name}
        </div>
        
        {/* Fade handles */}
        {region.fadeIn && region.fadeIn > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-transparent to-white opacity-20"
            style={{ width: region.fadeIn * pixelsPerSecond }}
          />
        )}
        {region.fadeOut && region.fadeOut > 0 && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-transparent to-white opacity-20"
            style={{ width: region.fadeOut * pixelsPerSecond }}
          />
        )}
        
        {/* Resize handles */}
        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-20" />
        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-20" />
      </div>
    );
  }, [height, pixelsPerSecond, onRegionSelect, onRegionSplit]);

  // Render MIDI region
  const renderMidiRegion = useCallback((region: MidiRegion) => {
    const x = region.startTime * pixelsPerSecond;
    const width = region.duration * pixelsPerSecond;
    const regionHeight = height - 4;

    const regionClasses = cn(
      'absolute border-2 rounded cursor-pointer transition-all duration-150',
      region.selected ? 'border-daw-accent-primary' : 'border-daw-surface-tertiary',
      region.muted && 'opacity-50',
      'hover:border-daw-accent-secondary'
    );

    const handleRegionMouseDown = (event: React.MouseEvent) => {
      event.stopPropagation();
      
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const resizeThreshold = 10;
      
      let dragType: 'move' | 'resize-start' | 'resize-end' = 'move';
      
      if (clickX < resizeThreshold) {
        dragType = 'resize-start';
      } else if (clickX > width - resizeThreshold) {
        dragType = 'resize-end';
      }

      setDragState({
        isDragging: true,
        dragType,
        regionId: region.id,
        regionType: 'midi',
        startX: event.clientX,
        startTime: region.startTime,
      });

      onRegionSelect?.(region.id, 'midi');
    };

    // Simple MIDI note visualization
    const renderMidiNotes = () => {
      if (width < 20) return null; // Too small to show notes
      
      const noteHeight = Math.max(1, regionHeight / 128); // One pixel per MIDI note
      
      return region.notes.map((note, index) => {
        const noteX = note.startTime * pixelsPerSecond;
        const noteWidth = Math.max(2, note.duration * pixelsPerSecond);
        const noteY = regionHeight - (note.pitch * noteHeight);
        const opacity = note.velocity / 127;
        
        return (
          <div
            key={index}
            className="absolute bg-white"
            style={{
              left: noteX,
              top: noteY,
              width: noteWidth,
              height: Math.max(1, noteHeight),
              opacity: opacity * 0.8 + 0.2,
            }}
          />
        );
      });
    };

    return (
      <div
        key={region.id}
        className={regionClasses}
        style={{
          left: x,
          top: 2,
          width,
          height: regionHeight,
          backgroundColor: region.color || '#ff6b35',
        }}
        onMouseDown={handleRegionMouseDown}
        title={region.name}
      >
        {/* MIDI notes visualization */}
        {renderMidiNotes()}
        
        {/* Region name */}
        <div className="absolute top-1 left-2 text-xs text-white font-medium truncate max-w-full">
          {region.name}
        </div>
        
        {/* Resize handles */}
        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-20" />
        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-20" />
      </div>
    );
  }, [height, pixelsPerSecond, onRegionSelect]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !dragState.regionId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaTime = deltaX / pixelsPerSecond;

    if (dragState.dragType === 'move') {
      const newStartTime = Math.max(0, dragState.startTime + deltaTime);
      onRegionMove?.(dragState.regionId, dragState.regionType!, newStartTime);
    } else if (dragState.dragType === 'resize-start' || dragState.dragType === 'resize-end') {
      const region = dragState.regionType === 'audio' 
        ? audioRegions.find(r => r.id === dragState.regionId)
        : midiRegions.find(r => r.id === dragState.regionId);
      
      if (region) {
        if (dragState.dragType === 'resize-start') {
          const newDuration = region.duration - deltaTime;
          if (newDuration > 0.1) { // Minimum duration
            onRegionResize?.(dragState.regionId, dragState.regionType!, newDuration, 'start');
          }
        } else {
          const newDuration = region.duration + deltaTime;
          if (newDuration > 0.1) {
            onRegionResize?.(dragState.regionId, dragState.regionType!, newDuration, 'end');
          }
        }
      }
    }
  }, [dragState, pixelsPerSecond, audioRegions, midiRegions, onRegionMove, onRegionResize]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      regionId: null,
      regionType: null,
      startX: 0,
      startTime: 0,
    });
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const containerClasses = cn(
    'relative bg-daw-surface-secondary border-b border-daw-surface-tertiary cursor-pointer',
    selected && 'bg-daw-accent-primary bg-opacity-10 ring-1 ring-daw-accent-primary',
    muted && 'opacity-60',
    solo && 'ring-2 ring-daw-accent-secondary',
    armed && 'ring-2 ring-red-500',
    className
  );

  // Handle track click (when clicking on empty track area)
  const handleTrackClick = useCallback((event: React.MouseEvent) => {
    // Only handle clicks on the track container itself, not on regions
    if (event.target === event.currentTarget) {
      onTrackSelect?.(id);
    }
  }, [id, onTrackSelect]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Create custom context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-daw-surface-primary border border-daw-surface-tertiary rounded-md shadow-lg py-1 z-50 min-w-48';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;

    // Add delete option
    const deleteOption = document.createElement('button');
    deleteOption.className = 'w-full px-4 py-2 text-left text-sm text-daw-text-primary hover:bg-daw-surface-tertiary transition-colors duration-150';
    deleteOption.innerHTML = `Delete Track "${safeName}"`;
    deleteOption.onclick = () => {
      handleTrackDelete(event as any);
      document.body.removeChild(contextMenu);
    };

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'h-px bg-daw-surface-tertiary my-1';

    // Add close option
    const closeOption = document.createElement('button');
    closeOption.className = 'w-full px-4 py-2 text-left text-sm text-daw-text-primary hover:bg-daw-surface-tertiary transition-colors duration-150';
    closeOption.innerHTML = 'Close';
    closeOption.onclick = () => {
      document.body.removeChild(contextMenu);
    };

    contextMenu.appendChild(deleteOption);
    contextMenu.appendChild(separator);
    contextMenu.appendChild(closeOption);
    document.body.appendChild(contextMenu);

    // Close context menu when clicking outside
    const closeContextMenu = (e: MouseEvent) => {
      if (!contextMenu.contains(e.target as Node)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener('click', closeContextMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeContextMenu);
    }, 100);
  }, [id, safeName, handleTrackDelete]);

  // Handle track deletion with confirmation
  const handleTrackDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onTrackDelete) {
      if (window.confirm(`Are you sure you want to delete track "${safeName}"? This action cannot be undone.`)) {
        onTrackDelete(id);
      }
    }
  }, [id, safeName, onTrackDelete]);

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{ height }}
      data-track-id={id}
      onClick={handleTrackClick}
      onContextMenu={handleContextMenu}
    >
      {/* Track name overlay */}
      <div className="absolute left-2 top-2 right-8 flex items-center justify-between pointer-events-none z-10">
        <div className="text-xs text-daw-text-secondary font-medium">
          {safeName} ({safeType})
          {selected && <span className="ml-2 text-daw-accent-primary">●</span>}
        </div>
        {onTrackDelete && (
          <button
            onClick={handleTrackDelete}
            className="pointer-events-auto px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded transition-colors duration-150"
            title={`Delete track "${safeName}"`}
          >
            ✕
          </button>
        )}
      </div>

      {/* Audio regions */}
      {audioRegions.map(renderAudioRegion)}

      {/* MIDI regions */}
      {midiRegions.map(renderMidiRegion)}

      {/* Drop zone for new regions */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-10 bg-daw-accent-primary transition-opacity duration-150 cursor-pointer"
        onClick={() => onTrackSelect?.(id)}
      />
    </div>
  );
};

export default TrackLane;
