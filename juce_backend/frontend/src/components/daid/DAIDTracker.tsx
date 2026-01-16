import React from 'react';
import { useDAID, useAudioDAID } from '@/lib/daid';
import Button from '@/components/ui/Button';

interface DAIDTrackerProps {
  className?: string;
}

/**
 * Example component showing DAID integration
 */
export default function DAIDTracker({ className }: DAIDTrackerProps) {
  const { daid, isLoading, generateDAID, components } = useDAID();

  const { trackAudioOperation } = useAudioDAID();

  const handleTrackAudioEvent = async () => {
    try {
      const audioDaid = await trackAudioOperation('play', {
        trackId: 'track_001',
        duration: 120,
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        user_action: 'manual_play',
        timestamp: new Date().toISOString()
      });
      
      console.log('Audio operation tracked:', audioDaid);
    } catch (error) {
      console.error('Failed to track audio operation:', error);
    }
  };

  const handleGenerateNewDAID = async () => {
    try {
      await generateDAID({
        entityType: 'audio_session',
        metadata: {
          component: 'DAIDTracker',
          version: '1.0.0'
        }
      });
    } catch (error) {
      console.error('Failed to generate DAID:', error);
    }
  };

  return (
    <div className={`p-4 bg-daw-bg-secondary rounded-lg border border-daw-border ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-daw-text-primary">
        DAID Tracking
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-daw-text-secondary mb-2">
            Current Session DAID:
          </label>
          <div className="p-2 bg-daw-bg-primary rounded border font-mono text-xs text-daw-text-primary break-all">
            {isLoading ? 'Generating...' : daid || 'No DAID generated'}
          </div>
        </div>

        {components && (
          <div>
            <label className="block text-sm font-medium text-daw-text-secondary mb-2">
              DAID Components:
            </label>
            <div className="p-2 bg-daw-bg-primary rounded border text-xs space-y-1">
              <div><span className="text-daw-text-secondary">Version:</span> <span className="text-daw-text-primary">{components.version}</span></div>
              <div><span className="text-daw-text-secondary">Agent:</span> <span className="text-daw-text-primary">{components.agentId}</span></div>
              <div><span className="text-daw-text-secondary">Entity:</span> <span className="text-daw-text-primary">{components.entityType}:{components.entityId}</span></div>
              <div><span className="text-daw-text-secondary">Hash:</span> <span className="text-daw-text-primary font-mono">{components.provenanceHash}</span></div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateNewDAID}
            disabled={isLoading}
          >
            Generate New DAID
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTrackAudioEvent}
          >
            Track Audio Event
          </Button>
        </div>

        <div className="text-xs text-daw-text-secondary">
          <p>This component demonstrates DAID integration:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Automatic DAID generation on mount</li>
            <li>Manual DAID generation</li>
            <li>Audio operation tracking</li>
            <li>DAID component parsing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
