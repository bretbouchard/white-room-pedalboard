import React, { useCallback } from 'react';
import { cn } from '@/utils';
import { useDJStore } from '@/stores/djStore';
import { useAudioStore } from '@/stores/audioStore';
import Knob from '@/components/ui/Knob';
import Button from '@/components/ui/Button';
import DJWaveform from './DJWaveform';
import DJEffects from './DJEffects';
import type { DJDeck as DJDeckType } from '@/types';

export interface DJDeckProps {
  deckId: 'A' | 'B';
  className?: string;
  showWaveform?: boolean;
  showBeatInfo?: boolean;
  showEffects?: boolean;
}

const DJDeck: React.FC<DJDeckProps> = ({
  deckId,
  className,
  showWaveform = true,
  showBeatInfo = true,
  showEffects = true,
}) => {
  const deck = useDJStore(state => state[`deck${deckId}` as keyof typeof state]) as DJDeckType;
  const {
    playDeck,
    pauseDeck,
    cueDeck,
    seekDeck,
    adjustTempo,
    setBPM,
    toggleKeyLock,
    toggleSync,
    setDeckEQ,
    toggleEQKill,
    setDeckFilter,
    setDeckGain,
    addCuePoint,
    jumpToCuePoint,
    setLoop,
    toggleLoop,
    exitLoop,
    loadTrackToDeck,
  } = useDJStore();

  const { mixer } = useAudioStore();
  const availableTracks = Object.values(mixer.tracks).filter(track => track.type === 'audio');

  const handlePlayPause = useCallback(() => {
    if (deck.isPlaying) {
      pauseDeck(deckId);
    } else {
      playDeck(deckId);
    }
  }, [deck.isPlaying, deckId, playDeck, pauseDeck]);

  const handleCue = useCallback(() => {
    cueDeck(deckId);
  }, [deckId, cueDeck]);

  const handleTempoAdjust = useCallback((adjustment: number) => {
    adjustTempo(deckId, adjustment / 100); // Convert percentage to decimal
  }, [deckId, adjustTempo]);

  const handleBPMChange = useCallback((bpm: number) => {
    setBPM(deckId, bpm);
  }, [deckId, setBPM]);

  const handleEQChange = useCallback((band: 'high' | 'mid' | 'low', value: number) => {
    setDeckEQ(deckId, band, value);
  }, [deckId, setDeckEQ]);

  const handleEQKill = useCallback((band: 'high' | 'mid' | 'low') => {
    toggleEQKill(deckId, band);
  }, [deckId, toggleEQKill]);

  const handleFilterChange = useCallback((cutoff: number) => {
    setDeckFilter(deckId, cutoff);
  }, [deckId, setDeckFilter]);

  const handleGainChange = useCallback((gain: number) => {
    setDeckGain(deckId, gain);
  }, [deckId, setDeckGain]);

  const handleAddCuePoint = useCallback(() => {
    addCuePoint(deckId, deck.position, `Cue ${deck.cuePoints.length + 1}`);
  }, [deckId, deck.position, deck.cuePoints.length, addCuePoint]);

  const handleSetLoop = useCallback(() => {
    const loopLength = 4; // 4 beats
    const beatDuration = 60 / deck.tempo.bpm; // seconds per beat
    const loopDuration = loopLength * beatDuration;
    setLoop(deckId, deck.position, deck.position + loopDuration, loopLength);
  }, [deckId, deck.position, deck.tempo.bpm, setLoop]);

  const currentTrack = deck.trackId ? mixer.tracks[deck.trackId] : null;
  const effectiveBPM = deck.tempo.bpm * (1 + deck.tempo.adjustment);

  const containerClasses = cn(
    'flex flex-col bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 space-y-4',
    'min-w-80 max-w-96',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Deck Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white',
            deckId === 'A' ? 'bg-daw-accent-secondary' : 'bg-daw-accent-tertiary'
          )}>
            {deckId}
          </div>
          <div className="text-sm font-medium text-daw-text-primary">
            Deck {deckId}
          </div>
        </div>
        
        {/* Sync and Key Lock */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleSync(deckId)}
            className={cn(
              'px-2 py-1 text-xs rounded border transition-colors duration-150',
              deck.tempo.sync
                ? 'bg-daw-accent-primary text-daw-bg-primary border-daw-accent-primary'
                : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
            )}
          >
            SYNC
          </button>
          <button
            onClick={() => toggleKeyLock(deckId)}
            className={cn(
              'px-2 py-1 text-xs rounded border transition-colors duration-150',
              deck.tempo.keyLock
                ? 'bg-daw-accent-primary text-daw-bg-primary border-daw-accent-primary'
                : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
            )}
          >
            KEY
          </button>
        </div>
      </div>

      {/* Track Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-daw-text-secondary">Track</label>
        <select
          value={deck.trackId || ''}
          onChange={(e) => e.target.value && loadTrackToDeck(deckId, e.target.value)}
          className="w-full px-3 py-2 text-sm bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
        >
          <option value="">Select track...</option>
          {availableTracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
        {currentTrack && (
          <div className="text-xs text-daw-text-tertiary truncate">
            {currentTrack.name}
          </div>
        )}
      </div>

      {/* Waveform Display */}
      {showWaveform && (
        <DJWaveform
          waveformData={deck.waveformData}
          beatInfo={deck.beatInfo}
          cuePoints={deck.cuePoints}
          activeLoop={deck.activeLoop}
          currentPosition={deck.position}
          duration={currentTrack?.audioRegions[0]?.duration || 180} // Default 3 minutes
          onSeek={(position) => seekDeck(deckId, position)}
          onAddCuePoint={(position) => addCuePoint(deckId, position)}
          onSetLoop={(start, end) => {
            const beatDuration = 60 / deck.tempo.bpm;
            const beatLength = Math.round((end - start) / beatDuration);
            setLoop(deckId, start, end, beatLength);
          }}
          height={80}
          showBeatGrid={true}
          showCuePoints={true}
          showLoop={true}
          zoomLevel={1}
        />
      )}

      {/* Transport Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={handleCue}
          variant="secondary"
          size="sm"
          className="min-w-16"
        >
          CUE
        </Button>
        <Button
          onClick={handlePlayPause}
          variant={deck.isPlaying ? 'danger' : 'accent'}
          size="md"
          className="min-w-20"
        >
          {deck.isPlaying ? 'PAUSE' : 'PLAY'}
        </Button>
      </div>

      {/* Tempo and BPM Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Knob
            value={deck.tempo.adjustment * 100}
            min={-50}
            max={50}
            step={0.1}
            onChange={handleTempoAdjust}
            label="Tempo"
            unit="%"
          />
        </div>
        <div className="space-y-2">
          <Knob
            value={deck.tempo.bpm}
            min={60}
            max={200}
            step={0.1}
            onChange={handleBPMChange}
            label="BPM"
          />
          {showBeatInfo && (
            <div className="text-xs text-center text-daw-text-tertiary font-mono">
              {effectiveBPM.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* EQ Section */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-daw-text-secondary text-center">EQ</div>
        <div className="grid grid-cols-3 gap-2">
          {(['high', 'mid', 'low'] as const).map((band) => (
            <div key={band} className="flex flex-col items-center space-y-2">
              <button
                onClick={() => handleEQKill(band)}
                className={cn(
                  'px-2 py-1 text-xs rounded border transition-colors duration-150 min-w-12',
                  deck.eq[`${band}Kill` as keyof typeof deck.eq]
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-red-400'
                )}
              >
                {band.toUpperCase()}
              </button>
              <Knob
                value={deck.eq[band]}
                min={-1}
                max={1}
                step={0.01}
                onChange={(value) => handleEQChange(band, value)}
                label=""
              />
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Gain */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Knob
            value={deck.filter.cutoff}
            min={0}
            max={1}
            step={0.01}
            onChange={handleFilterChange}
            label="Filter"
          />
        </div>
        <div className="space-y-2">
          <Knob
            value={deck.gain}
            min={0}
            max={2}
            step={0.01}
            onChange={handleGainChange}
            label="Gain"
          />
        </div>
      </div>

      {/* Cue Points and Loops */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-daw-text-secondary">Cue Points</div>
          <Button
            onClick={handleAddCuePoint}
            variant="secondary"
            size="sm"
            className="text-xs px-2 py-1"
          >
            + CUE
          </Button>
        </div>
        
        {/* Hot Cue Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => {
            const hotCueNumber = i + 1;
            const cuePoint = deck.cuePoints.find(cp => cp.hotCueNumber === hotCueNumber);
            
            return (
              <button
                key={hotCueNumber}
                onClick={() => {
                  if (cuePoint) {
                    jumpToCuePoint(deckId, cuePoint.id);
                  } else {
                    addCuePoint(deckId, deck.position, `Hot ${hotCueNumber}`, hotCueNumber);
                  }
                }}
                className={cn(
                  'h-8 text-xs rounded border transition-colors duration-150',
                  cuePoint
                    ? 'bg-daw-accent-primary text-daw-bg-primary border-daw-accent-primary'
                    : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
                )}
              >
                {hotCueNumber}
              </button>
            );
          })}
        </div>

        {/* Loop Controls */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-daw-text-secondary">Loop</div>
          <div className="flex space-x-1">
            <Button
              onClick={handleSetLoop}
              variant="secondary"
              size="sm"
              className="text-xs px-2 py-1"
            >
              SET
            </Button>
            <Button
              onClick={() => toggleLoop(deckId)}
              variant={deck.activeLoop?.enabled ? 'accent' : 'secondary'}
              size="sm"
              className="text-xs px-2 py-1"
              disabled={!deck.activeLoop}
            >
              LOOP
            </Button>
            <Button
              onClick={() => exitLoop(deckId)}
              variant="secondary"
              size="sm"
              className="text-xs px-2 py-1"
              disabled={!deck.activeLoop}
            >
              EXIT
            </Button>
          </div>
        </div>
      </div>

      {/* DJ Effects */}
      {showEffects && (
        <DJEffects
          deckId={deckId}
          showPerformancePads={true}
          maxEffects={2} // Limit to 2 effects per deck to save space
        />
      )}

      {/* Position Display */}
      <div className="text-center">
        <div className="text-xs text-daw-text-tertiary font-mono">
          {Math.floor(deck.position / 60)}:{(deck.position % 60).toFixed(1).padStart(4, '0')}
        </div>
      </div>
    </div>
  );
};

export default DJDeck;