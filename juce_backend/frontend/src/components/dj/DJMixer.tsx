import React, { useCallback } from 'react';
import { cn } from '@/utils';
import { useDJStore } from '@/stores/djStore';
import DJDeck from './DJDeck';
import Crossfader from './Crossfader';
import BeatSync from './BeatSync';
import Knob from '@/components/ui/Knob';
import Button from '@/components/ui/Button';
import LevelMeter from '@/components/ui/LevelMeter';
import type { AudioLevel } from '@/types';

export interface DJMixerProps {
  className?: string;
  showMasterSection?: boolean;
  showCueSection?: boolean;
  showEffects?: boolean;
}

const DJMixer: React.FC<DJMixerProps> = ({
  className,
  showMasterSection = true,
  showCueSection = true,
  showEffects = true,
}) => {
  const {
    deckA,
    deckB,
    crossfader,
    cue,
    masterTempo,
    setCueVolume,
    toggleCueSplit,
    setCueActiveDeck,
    syncDecks,
    initializeDJMode,
  } = useDJStore();

  // Mock audio levels for demonstration
  const masterLevel: AudioLevel = { peak: 0.7, rms: 0.5, lufs: -12 };
  const deckALevel: AudioLevel = { peak: 0.6, rms: 0.4, lufs: -15 };
  const deckBLevel: AudioLevel = { peak: 0.8, rms: 0.6, lufs: -10 };

  const handleSyncDecks = useCallback(() => {
    syncDecks();
  }, [syncDecks]);

  const handleResetMixer = useCallback(() => {
    initializeDJMode();
  }, [initializeDJMode]);

  const containerClasses = cn(
    'flex flex-col bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg p-6 space-y-6',
    'min-h-screen',
    className
  );

  return (
    <div className={containerClasses}>
      {/* DJ Mixer Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-daw-text-primary">DJ Mixer</h2>
          <div className="text-sm text-daw-text-secondary">
            Master: {masterTempo} BPM
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleSyncDecks}
            variant="accent"
            size="sm"
          >
            Sync Decks
          </Button>
          <Button
            onClick={handleResetMixer}
            variant="secondary"
            size="sm"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main Mixer Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Side - Deck A */}
        <div className="flex-1">
          <DJDeck
            deckId="A"
            showWaveform={true}
            showBeatInfo={true}
            showEffects={showEffects}
          />
        </div>

        {/* Center - Crossfader and Master Controls */}
        <div className="flex flex-col items-center space-y-6 min-w-80">
          {/* Master Section */}
          {showMasterSection && (
            <div className="bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 w-full">
              <div className="text-sm font-medium text-daw-text-primary text-center mb-4">
                Master Section
              </div>
              
              <div className="flex items-center justify-center space-x-6">
                {/* Master Level Meters */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-xs text-daw-text-secondary">Master</div>
                  <LevelMeter
                    level={masterLevel}
                    orientation="vertical"
                    height={120}
                    width={20}
                    showPeak={true}
                    showRMS={true}
                  />
                </div>

                {/* Deck Level Meters */}
                <div className="flex space-x-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-xs text-daw-text-secondary">Deck A</div>
                    <LevelMeter
                      level={deckALevel}
                      orientation="vertical"
                      height={100}
                      width={16}
                      showPeak={true}
                    />
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-xs text-daw-text-secondary">Deck B</div>
                    <LevelMeter
                      level={deckBLevel}
                      orientation="vertical"
                      height={100}
                      width={16}
                      showPeak={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crossfader Section */}
          <div className="w-full">
            <Crossfader
              size="lg"
              showCurveControl={true}
              showReverseControl={true}
            />
          </div>

          {/* Cue/Monitor Section */}
          {showCueSection && (
            <div className="bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 w-full">
              <div className="text-sm font-medium text-daw-text-primary text-center mb-4">
                Cue / Monitor
              </div>
              
              <div className="space-y-4">
                {/* Cue Volume */}
                <div className="flex items-center justify-center">
                  <Knob
                    value={cue.volume}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setCueVolume}
                    label="Cue Vol"
                  />
                </div>

                {/* Cue Controls */}
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCueActiveDeck('A')}
                    className={cn(
                      'px-3 py-2 text-sm rounded border transition-colors duration-150',
                      cue.activeDeck === 'A'
                        ? 'bg-daw-accent-secondary text-white border-daw-accent-secondary'
                        : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-secondary'
                    )}
                  >
                    CUE A
                  </button>
                  <button
                    onClick={() => setCueActiveDeck('both')}
                    className={cn(
                      'px-3 py-2 text-sm rounded border transition-colors duration-150',
                      cue.activeDeck === 'both'
                        ? 'bg-daw-accent-primary text-white border-daw-accent-primary'
                        : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
                    )}
                  >
                    BOTH
                  </button>
                  <button
                    onClick={() => setCueActiveDeck('B')}
                    className={cn(
                      'px-3 py-2 text-sm rounded border transition-colors duration-150',
                      cue.activeDeck === 'B'
                        ? 'bg-daw-accent-tertiary text-white border-daw-accent-tertiary'
                        : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-tertiary'
                    )}
                  >
                    CUE B
                  </button>
                </div>

                {/* Split Cue */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={toggleCueSplit}
                    className={cn(
                      'px-4 py-2 text-sm rounded border transition-colors duration-150',
                      cue.split
                        ? 'bg-daw-accent-primary text-white border-daw-accent-primary'
                        : 'bg-daw-surface-primary text-daw-text-secondary border-daw-surface-tertiary hover:border-daw-accent-primary'
                    )}
                  >
                    SPLIT CUE {cue.split ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Beat Sync Section */}
          <BeatSync showAdvancedControls={true} />
        </div>

        {/* Right Side - Deck B */}
        <div className="flex-1">
          <DJDeck
            deckId="B"
            showWaveform={true}
            showBeatInfo={true}
            showEffects={showEffects}
          />
        </div>
      </div>



      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-daw-text-tertiary bg-daw-surface-secondary rounded p-2">
        <div className="flex items-center space-x-4">
          <div>Deck A: {deckA.trackId ? 'Loaded' : 'Empty'}</div>
          <div>Deck B: {deckB.trackId ? 'Loaded' : 'Empty'}</div>
        </div>
        <div className="flex items-center space-x-4">
          <div>Crossfader: {crossfader.position.toFixed(2)}</div>
          <div>Cue: {cue.activeDeck.toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
};

export default DJMixer;