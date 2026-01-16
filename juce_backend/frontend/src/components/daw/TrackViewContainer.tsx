import React, { useState, useCallback } from 'react';
import TrackView, { Selection } from './TrackView';
import SelectionTools from './SelectionTools';
import { cn } from '@/utils';
import { useAudioStore } from '@/stores/audioStore';

export const DEFAULT_TRACK_HEIGHT = 80;

interface TrackViewContainerProps {
  className?: string;
}

const TrackViewContainer: React.FC<TrackViewContainerProps> = ({ className }) => {
  // Use audio store for track data
  const {
    transport,
    mixer,
    seek,
    moveRegion,
    resizeRegion,
    splitRegion,
    removeRegion,
    removeTrack,
    selectTrack,
    initializeBackendSync,
  } = useAudioStore();

  // Initialize backend sync to load real tracks
  React.useEffect(() => {
    console.log('TrackViewContainer: Initializing backend sync...');
    initializeBackendSync();

    // Test WebSocket connection and real track loading after a short delay
    const timer = setTimeout(() => {
      console.log('TrackViewContainer: Current tracks in mixer:', Object.keys(mixer.tracks));
      console.log('TrackViewContainer: Mixer state:', mixer);

      // Check if we have real tracks (not fake sample data)
      const trackIds = Object.keys(mixer.tracks);
      const hasRealTracks = trackIds.length > 0 && !trackIds.some(id => id.includes('Drums') || id.includes('Bass') || id.includes('Piano'));

      if (!hasRealTracks) {
        console.log('TrackViewContainer: No real tracks found, initializing empty project state');
        // Don't create fake sample data - keep empty for real backend tracks
      } else {
        console.log('TrackViewContainer: Real tracks loaded successfully');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [initializeBackendSync, mixer.tracks]);

  // Convert store tracks to TrackView format
  const tracks = Object.values(mixer.tracks).map(track => {
    const parsedHeight = Number(track.height);
    const height = Number.isFinite(parsedHeight) && parsedHeight > 0
      ? parsedHeight
      : DEFAULT_TRACK_HEIGHT;

    return {
      ...track,
      height,
      audioRegions: Array.isArray(track.audioRegions) ? track.audioRegions : [],
      midiRegions: Array.isArray(track.midiRegions) ? track.midiRegions : [],
      selected: mixer.selectedTrackId === track.id,
    };
  });
  const [selection, setSelection] = useState<Selection>({
    trackIds: mixer.selectedTrackId ? [mixer.selectedTrackId] : [],
    regionIds: [],
  });
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1);

  const duration = 20; // 20 seconds - could be calculated from regions
  const sampleRate = 44100;

  // Handle seeking
  const handleSeek = useCallback((time: number) => {
    seek(Math.max(0, Math.min(duration, time)));
  }, [duration, seek]);

  // Handle track selection
  const handleTrackSelect = useCallback((trackId: string, multiSelect = false) => {
    console.log('Track selection triggered:', trackId, 'multiSelect:', multiSelect);
    if (multiSelect) {
      // For multi-select, we'd need to extend the store to support multiple selected tracks
      // For now, just select the single track
      selectTrack(trackId);
    } else {
      selectTrack(trackId);
    }

    setSelection(prev => ({
      ...prev,
      trackIds: [trackId]
    }));
  }, [selectTrack]);

  // Handle track deletion
  const handleTrackDelete = useCallback((trackId: string) => {
    console.log('Track deletion triggered:', trackId);
    removeTrack(trackId);
  }, [removeTrack]);

  // Handle region selection
  const handleRegionSelect = useCallback((regionId: string, regionType: 'audio' | 'midi', _trackId: string) => {
    void _trackId; // Mark as intentionally unused
    // Update region selection in store
    if (regionType === 'audio') {
      // We'd need to add region selection to the store
      // For now, just update local selection
    } else {
      // Same for MIDI regions
    }

    setSelection(prev => ({
      ...prev,
      regionIds: [regionId]
    }));
  }, []);

  // Handle region move
  const handleRegionMove = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, newStartTime: number) => {
    moveRegion(trackId, regionId, regionType, newStartTime);
  }, [moveRegion]);

  // Handle region resize
  const handleRegionResize = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, newDuration: number, resizeEnd: 'start' | 'end') => {
    resizeRegion(trackId, regionId, regionType, newDuration, resizeEnd);
  }, [resizeRegion]);

  // Handle region split
  const handleRegionSplit = useCallback((regionId: string, regionType: 'audio' | 'midi', trackId: string, splitTime: number) => {
    splitRegion(trackId, regionId, regionType, splitTime);
  }, [splitRegion]);

  // Selection tools handlers
  const handleCut = useCallback(() => {
    console.log('Cut operation');
  }, []);

  const handleCopy = useCallback(() => {
    console.log('Copy operation');
  }, []);

  const handlePaste = useCallback(() => {
    console.log('Paste operation');
  }, []);

  const handleDelete = useCallback(() => {
    const selectedRegionIds = selection.regionIds;
    if (selectedRegionIds.length === 0) return;

    // Find and delete selected regions
    tracks.forEach(track => {
      track.audioRegions.forEach(region => {
        if (selectedRegionIds.includes(region.id)) {
          removeRegion(track.id, region.id, 'audio');
        }
      });
      track.midiRegions.forEach(region => {
        if (selectedRegionIds.includes(region.id)) {
          removeRegion(track.id, region.id, 'midi');
        }
      });
    });

    setSelection(prev => ({ ...prev, regionIds: [] }));
  }, [selection.regionIds, tracks, removeRegion]);

  const handleSelectAll = useCallback(() => {
    const allRegionIds = tracks.flatMap(track => [
      ...track.audioRegions.map(r => r.id),
      ...track.midiRegions.map(r => r.id)
    ]);

    setSelection(prev => ({ ...prev, regionIds: allRegionIds }));
  }, [tracks]);

  const hasSelection = selection.regionIds.length > 0 || selection.trackIds.length > 0;

  const containerClasses = cn(
    'flex flex-col h-full min-h-0 bg-daw-surface-primary',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-daw-surface-secondary border-b border-daw-surface-tertiary">
        <SelectionTools
          hasSelection={hasSelection}
          canCut={hasSelection}
          canCopy={hasSelection}
          canPaste={true}
          canDelete={hasSelection}
          canTrim={hasSelection}
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleDelete}
          onTrim={() => console.log('Trim')}
          onSelectAll={handleSelectAll}
          onDeselectAll={() => setSelection({ trackIds: [], regionIds: [] })}
          onInvertSelection={() => console.log('Invert selection')}
          onSplitAtPlayhead={() => console.log('Split at playhead')}
          onCreateCrossfade={() => console.log('Create crossfade')}
        />

        {/* View controls */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1 text-xs text-daw-text-secondary">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="rounded"
            />
            <span>Snap</span>
          </label>
          
          <select
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded px-2 py-1"
          >
            <option value={0.25}>1/4</option>
            <option value={0.5}>1/2</option>
            <option value={1}>1s</option>
            <option value={2}>2s</option>
            <option value={4}>4s</option>
          </select>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPixelsPerSecond(Math.max(10, pixelsPerSecond - 10))}
              className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded hover:bg-daw-surface-tertiary"
            >
              -
            </button>
            <span className="text-xs text-daw-text-secondary min-w-12 text-center">
              {pixelsPerSecond}px/s
            </span>
            <button
              onClick={() => setPixelsPerSecond(Math.min(200, pixelsPerSecond + 10))}
              className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded hover:bg-daw-surface-tertiary"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Track View */}
      <div className="flex-1 min-h-0">
        <TrackView
          tracks={tracks}
          duration={duration}
          currentTime={transport.currentTime}
          sampleRate={sampleRate}
          pixelsPerSecond={pixelsPerSecond}
          onSeek={handleSeek}
          onTrackSelect={handleTrackSelect}
          onTrackDelete={handleTrackDelete}
          onRegionSelect={handleRegionSelect}
          onRegionMove={handleRegionMove}
          onRegionResize={handleRegionResize}
          onRegionSplit={handleRegionSplit}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          selection={selection}
          className="h-full min-h-0"
        />
      </div>
    </div>
  );
};

export default TrackViewContainer;
