import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/utils';
import { useDJStore } from '@/stores/djStore';
import Button from '@/components/ui/Button';

export interface BeatSyncProps {
  className?: string;
  showAdvancedControls?: boolean;
}

const BeatSync: React.FC<BeatSyncProps> = ({
  className,
  showAdvancedControls = true,
}) => {
  const {
    deckA,
    deckB,
    syncMode,
    masterTempo,
    syncDecks,
    adjustTempo,
    setBPM,
    toggleSync,
  } = useDJStore();

  const [syncStatus, setSyncStatus] = useState<{
    bpmDifference: number;
    phaseDifference: number;
    canSync: boolean;
    recommendation: string;
  }>({
    bpmDifference: 0,
    phaseDifference: 0,
    canSync: false,
    recommendation: 'Load tracks to enable sync',
  });

  // Calculate sync status
  useEffect(() => {
    if (!deckA.beatInfo || !deckB.beatInfo) {
      setSyncStatus({
        bpmDifference: 0,
        phaseDifference: 0,
        canSync: false,
        recommendation: 'Load tracks with beat detection to enable sync',
      });
      return;
    }

    const deckABPM = deckA.tempo.bpm * (1 + deckA.tempo.adjustment);
    const deckBBPM = deckB.tempo.bpm * (1 + deckB.tempo.adjustment);
    const bpmDifference = Math.abs(deckABPM - deckBBPM);
    
    // Calculate phase difference (simplified)
    const deckABeatPosition = deckA.position % (60 / deckABPM);
    const deckBBeatPosition = deckB.position % (60 / deckBBPM);
    const phaseDifference = Math.abs(deckABeatPosition - deckBBeatPosition);
    
    const canSync = bpmDifference < 10 && deckA.beatInfo.confidence > 0.7 && deckB.beatInfo.confidence > 0.7;
    
    let recommendation = '';
    if (bpmDifference > 10) {
      recommendation = 'BPM difference too large for sync';
    } else if (deckA.beatInfo.confidence < 0.7 || deckB.beatInfo.confidence < 0.7) {
      recommendation = 'Beat detection confidence too low';
    } else if (bpmDifference < 0.5) {
      recommendation = 'Tracks are in sync';
    } else {
      recommendation = `Adjust tempo by ${bpmDifference.toFixed(1)} BPM`;
    }

    setSyncStatus({
      bpmDifference,
      phaseDifference,
      canSync,
      recommendation,
    });
  }, [deckA, deckB]);

  const handleAutoSync = useCallback(() => {
    if (!syncStatus.canSync) return;
    
    // Determine which deck to sync to which
    const masterDeck = deckA.tempo.sync ? deckB : deckA;
    const slaveDeck = deckA.tempo.sync ? deckA : deckB;
    const slaveId = deckA.tempo.sync ? 'A' : 'B';
    
    // Calculate required tempo adjustment
    const masterBPM = masterDeck.tempo.bpm * (1 + masterDeck.tempo.adjustment);
    const requiredAdjustment = (masterBPM - slaveDeck.tempo.bpm) / slaveDeck.tempo.bpm;
    
    // Apply the adjustment
    adjustTempo(slaveId, requiredAdjustment);
  }, [syncStatus.canSync, deckA, deckB, adjustTempo]);

  const handleTapTempo = useCallback((deckId: 'A' | 'B') => {
    // Simple tap tempo implementation
    const now = Date.now();
    const tapKey = `lastTap${deckId}`;
    const lastTap = localStorage.getItem(tapKey);
    
    if (lastTap) {
      const timeDiff = now - parseInt(lastTap);
      if (timeDiff > 300 && timeDiff < 2000) { // Valid tap range
        const bpm = 60000 / timeDiff; // Convert to BPM
        setBPM(deckId, bpm);
      }
    }
    
    localStorage.setItem(tapKey, now.toString());
  }, [setBPM]);

  const getSyncStatusColor = () => {
    if (!syncStatus.canSync) return 'text-red-400';
    if (syncStatus.bpmDifference < 0.5) return 'text-green-400';
    if (syncStatus.bpmDifference < 2) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const containerClasses = cn(
    'bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 space-y-4',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-daw-text-primary">Beat Sync</h3>
        <div className="text-xs text-daw-text-secondary">
          Mode: {syncMode.toUpperCase()}
        </div>
      </div>

      {/* Sync Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-daw-text-secondary">Status:</span>
          <span className={cn('text-xs font-medium', getSyncStatusColor())}>
            {syncStatus.recommendation}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-daw-text-secondary">BPM Difference</div>
            <div className={cn('font-mono', getSyncStatusColor())}>
              {syncStatus.bpmDifference.toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-daw-text-secondary">Phase Diff</div>
            <div className={cn('font-mono', getSyncStatusColor())}>
              {(syncStatus.phaseDifference * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Deck BPM Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center space-y-1">
          <div className="text-xs text-daw-text-secondary">Deck A BPM</div>
          <div className="text-lg font-mono text-daw-text-primary">
            {(deckA.tempo.bpm * (1 + deckA.tempo.adjustment)).toFixed(1)}
          </div>
          {deckA.beatInfo && (
            <div className="text-xs text-daw-text-tertiary">
              Confidence: {(deckA.beatInfo.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs text-daw-text-secondary">Deck B BPM</div>
          <div className="text-lg font-mono text-daw-text-primary">
            {(deckB.tempo.bpm * (1 + deckB.tempo.adjustment)).toFixed(1)}
          </div>
          {deckB.beatInfo && (
            <div className="text-xs text-daw-text-tertiary">
              Confidence: {(deckB.beatInfo.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Sync Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <Button
            onClick={handleAutoSync}
            disabled={!syncStatus.canSync}
            variant={syncStatus.canSync ? 'accent' : 'secondary'}
            size="sm"
          >
            Auto Sync
          </Button>
          <Button
            onClick={syncDecks}
            variant="secondary"
            size="sm"
          >
            Manual Sync
          </Button>
        </div>

        {/* Individual Deck Sync Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => toggleSync('A')}
            variant={deckA.tempo.sync ? 'accent' : 'secondary'}
            size="sm"
            className="text-xs"
          >
            Sync A {deckA.tempo.sync ? 'ON' : 'OFF'}
          </Button>
          <Button
            onClick={() => toggleSync('B')}
            variant={deckB.tempo.sync ? 'accent' : 'secondary'}
            size="sm"
            className="text-xs"
          >
            Sync B {deckB.tempo.sync ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && (
        <div className="space-y-3 pt-3 border-t border-daw-surface-tertiary">
          <div className="text-xs font-medium text-daw-text-secondary text-center">
            Advanced Controls
          </div>
          
          {/* Tap Tempo */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleTapTempo('A')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Tap A
            </Button>
            <Button
              onClick={() => handleTapTempo('B')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Tap B
            </Button>
          </div>

          {/* Master Tempo */}
          <div className="flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-xs text-daw-text-secondary">Master Tempo</div>
              <div className="text-sm font-mono text-daw-text-primary">
                {masterTempo} BPM
              </div>
            </div>
          </div>

          {/* Beat Matching Indicators */}
          <div className="space-y-2">
            <div className="text-xs text-daw-text-secondary text-center">Beat Phase</div>
            <div className="flex items-center justify-center space-x-4">
              {/* Deck A Beat Indicator */}
              <div className="flex flex-col items-center space-y-1">
                <div className="text-xs text-daw-text-tertiary">A</div>
                <div className={cn(
                  'w-3 h-3 rounded-full transition-all duration-150',
                  deckA.isPlaying ? 'bg-daw-accent-secondary animate-pulse' : 'bg-daw-surface-tertiary'
                )} />
              </div>
              
              {/* Sync Status Indicator */}
              <div className="flex flex-col items-center space-y-1">
                <div className="text-xs text-daw-text-tertiary">SYNC</div>
                <div className={cn(
                  'w-4 h-4 rounded-full transition-all duration-300',
                  syncStatus.canSync && syncStatus.bpmDifference < 0.5
                    ? 'bg-green-400 animate-pulse'
                    : syncStatus.canSync
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                )} />
              </div>
              
              {/* Deck B Beat Indicator */}
              <div className="flex flex-col items-center space-y-1">
                <div className="text-xs text-daw-text-tertiary">B</div>
                <div className={cn(
                  'w-3 h-3 rounded-full transition-all duration-150',
                  deckB.isPlaying ? 'bg-daw-accent-tertiary animate-pulse' : 'bg-daw-surface-tertiary'
                )} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeatSync;