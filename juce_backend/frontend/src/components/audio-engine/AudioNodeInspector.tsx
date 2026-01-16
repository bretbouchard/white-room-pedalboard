/**
 * Audio Node Inspector Component
 * Provides detailed controls for individual audio nodes
 * Shows parameters, analysis, and connection information
 */

import React, { useState } from 'react';
import { Settings, Activity, Volume2, Mic, MicOff, Trash2 } from 'lucide-react';
import { useAudioEngineStore } from '@/lib/audio-engine/AudioEngineStore';

interface AudioNodeInspectorProps {
  nodeId: string;
  className?: string;
}

export const AudioNodeInspector: React.FC<AudioNodeInspectorProps> = ({
  nodeId,
  className = ''
}) => {
  const engineStore = useAudioEngineStore();
  const node = engineStore.nodes.get(nodeId);
  const analysisData = engineStore.getNodeAnalysis(nodeId);
  const [isEditingParameters, setIsEditingParameters] = useState(false);

  const handleParameterChange = async (parameter: string, value: number) => {
    try {
      await engineStore.setNodeParameter(nodeId, parameter, value);
    } catch (error) {
      console.error(`Failed to set parameter ${parameter}:`, error);
    }
  };

  const handleRemoveNode = async () => {
    try {
      await engineStore.removeNode(nodeId);
    } catch (error) {
      console.error('Failed to remove node:', error);
    }
  };

  const toggleMute = async () => {
    if (node) {
      const isMuted = node.parameters.muted === 1;
      await handleParameterChange('muted', isMuted ? 0 : 1);
    }
  };

  const getLevelColor = (level: number) => {
    if (level > -3) return 'text-red-500';
    if (level > -12) return 'text-yellow-500';
    if (level > -24) return 'text-green-500';
    return 'text-gray-400';
  };

  const getLevelHeight = (level: number) => {
    // Convert dB to percentage (0-100%)
    const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
    return `${normalized * 100}%`;
  };

  if (!node) {
    return (
      <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <Settings className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Node not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            node.state === 'active' ? 'bg-green-500' :
            node.state === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <h3 className="font-semibold text-gray-900">{node.name}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {node.type}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {node.type === 'input' && (
            <button
              onClick={toggleMute}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={node.parameters.muted === 1 ? 'Unmute' : 'Mute'}
            >
              {node.parameters.muted === 1 ? (
                <MicOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Mic className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}

          <button
            onClick={() => setIsEditingParameters(!isEditingParameters)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Edit Parameters"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={handleRemoveNode}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Remove Node"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Level Meters */}
        {analysisData && (node.type === 'input' || node.type === 'output') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Levels</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Peak Level */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Peak</span>
                  <span className={getLevelColor(analysisData.levels.peak)}>
                    {analysisData.levels.peak.toFixed(1)} dB
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${getLevelColor(analysisData.levels.peak)}`}
                    style={{
                      width: getLevelHeight(analysisData.levels.peak),
                      backgroundColor: 'currentColor'
                    }}
                  />
                </div>
              </div>

              {/* RMS Level */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>RMS</span>
                  <span className={getLevelColor(analysisData.levels.rms)}>
                    {analysisData.levels.rms.toFixed(1)} dB
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${getLevelColor(analysisData.levels.rms)}`}
                    style={{
                      width: getLevelHeight(analysisData.levels.rms),
                      backgroundColor: 'currentColor'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* LUFS Meter */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>LUFS</span>
                <span className={getLevelColor(analysisData.levels.lufs)}>
                  {analysisData.levels.lufs.toFixed(1)} LUFS
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-100 bg-blue-500"
                  style={{
                    width: getLevelHeight(analysisData.levels.lufs),
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Parameters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Parameters</span>
            </div>
            {node.parameters && Object.keys(node.parameters).length > 0 && (
              <button
                onClick={() => setIsEditingParameters(!isEditingParameters)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {isEditingParameters ? 'Done' : 'Edit'}
              </button>
            )}
          </div>

          {node.parameters && Object.keys(node.parameters).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(node.parameters).map(([param, value]) => (
                <div key={param} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {param.replace(/_/g, ' ')}
                  </span>
                  {isEditingParameters ? (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={value}
                      onChange={(e) => handleParameterChange(param, parseFloat(e.target.value))}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {typeof value === 'number' ? value.toFixed(3) : value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No parameters available</p>
          )}
        </div>

        {/* Connections */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Connections</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Inputs:</span>
              <div className="mt-1 space-y-1">
                {node.inputs.filter(input => input.connected).map(input => (
                  <div key={input.id} className="text-gray-700">
                    {input.name}
                  </div>
                ))}
                {node.inputs.filter(input => input.connected).length === 0 && (
                  <span className="text-gray-400">None</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-gray-500">Outputs:</span>
              <div className="mt-1 space-y-1">
                {node.outputs.filter(output => output.connected).map(output => (
                  <div key={output.id} className="text-gray-700">
                    {output.name}
                  </div>
                ))}
                {node.outputs.filter(output => output.connected).length === 0 && (
                  <span className="text-gray-400">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Position Info */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Position</span>
          <div className="text-sm text-gray-600">
            X: {node.position.x.toFixed(0)}, Y: {node.position.y.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioNodeInspector;