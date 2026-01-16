/**
 * Audio Engine Controls Component
 * Provides main controls for audio engine operations
 * Integrates with the flow workspace and audio store
 */

import React from 'react';
import { Play, Pause, Square, RotateCcw, Settings, Volume2, Activity } from 'lucide-react';
import { useAudioEngineStore, useAutoInitializeAudioEngine } from '@/lib/audio-engine/AudioEngineStore';
import { useAudioStore } from '@/stores/audioStore';

interface AudioEngineControlsProps {
  className?: string;
  compact?: boolean;
}

export const AudioEngineControls: React.FC<AudioEngineControlsProps> = ({
  className = '',
  compact = false
}) => {
  const engineStore = useAudioEngineStore();
  const audioStore = useAudioStore();
  const { isInitializing, isInitialized, error } = useAutoInitializeAudioEngine();

  const handlePlay = async () => {
    try {
      if (!engineStore.isInitialized) {
        await engineStore.initializeEngine();
      }
      await engineStore.startProcessing();
    } catch (error) {
      console.error('Failed to start playback:', error);
    }
  };

  const handleStop = async () => {
    try {
      await engineStore.stopProcessing();
      audioStore.stop();
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  };

  const handleReset = async () => {
    try {
      await engineStore.reset();
    } catch (error) {
      console.error('Failed to reset engine:', error);
    }
  };

  const getPlayButtonIcon = () => {
    if (isInitializing) {
      return <Activity className="w-4 h-4 animate-pulse" />;
    }
    if (engineStore.isProcessing) {
      return <Pause className="w-4 h-4" />;
    }
    return <Play className="w-4 h-4" />;
  };

  const getPlayButtonText = () => {
    if (isInitializing) return 'Initializing...';
    if (engineStore.isProcessing) return 'Pause';
    return 'Play';
  };

  const getPlayButtonDisabled = () => {
    return isInitializing || (!isInitialized && !engineStore.isInitialized);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={engineStore.isProcessing ? handleStop : handlePlay}
          disabled={getPlayButtonDisabled()}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          title={getPlayButtonText()}
        >
          {getPlayButtonIcon()}
        </button>

        <button
          onClick={handleStop}
          disabled={!engineStore.isProcessing}
          className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </button>

        {error && (
          <div className="text-xs text-red-500 max-w-32 truncate" title={error}>
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Audio Engine</h3>
        </div>

        <div className="flex items-center gap-2">
          {isInitialized && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                engineStore.isProcessing ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-xs text-gray-600">
                {engineStore.isProcessing ? 'Processing' : 'Ready'}
              </span>
            </div>
          )}

          <button
            onClick={handleReset}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Reset Engine"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={engineStore.isProcessing ? handleStop : handlePlay}
          disabled={getPlayButtonDisabled()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {getPlayButtonIcon()}
          <span className="text-sm font-medium">{getPlayButtonText()}</span>
        </button>

        <button
          onClick={handleStop}
          disabled={!engineStore.isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-4 h-4" />
          <span className="text-sm font-medium">Stop</span>
        </button>

        <div className="flex-1" />

        <div className="text-sm text-gray-600">
          <span className="font-mono">
            {Math.floor(audioStore.transport.currentTime / 60)}:
            {String(Math.floor(audioStore.transport.currentTime % 60)).padStart(2, '0')}.
            {String(Math.floor((audioStore.transport.currentTime % 1) * 100)).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Engine Status */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Sample Rate:</span>
          <span className="ml-2 font-medium">{engineStore.sampleRate} Hz</span>
        </div>
        <div>
          <span className="text-gray-500">Buffer Size:</span>
          <span className="ml-2 font-medium">{engineStore.bufferSize}</span>
        </div>
        <div>
          <span className="text-gray-500">Nodes:</span>
          <span className="ml-2 font-medium">{engineStore.nodes.size}</span>
        </div>
        <div>
          <span className="text-gray-500">Routes:</span>
          <span className="ml-2 font-medium">{engineStore.routes.size}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 font-medium">Engine Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Initialization Status */}
      {!isInitialized && !isInitializing && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-700 font-medium">Not Initialized</span>
          </div>
          <p className="text-xs text-yellow-600 mt-1">
            Click Play to initialize the audio engine
          </p>
        </div>
      )}
    </div>
  );
};

export default AudioEngineControls;