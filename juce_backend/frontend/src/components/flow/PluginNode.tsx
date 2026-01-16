/**
 * Plugin Flow Node Component
 * Represents a VST/AU plugin in the flow workspace
 * Integrates with the plugin system for parameter control and automation
 */

import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Settings, Volume2, Power, PowerOff, Zap, Activity } from 'lucide-react';
import { usePluginStore } from '@/stores/pluginStore';
import { useAudioEngineStore } from '@/lib/audio-engine/AudioEngineStore';
import type { PluginInstance } from '@/types/plugins';
import type { PluginNodeData } from '@/types/flow';

interface PluginNodeProps extends NodeProps<any> {
  data: PluginNodeData;
}

export const PluginNode: React.FC<PluginNodeProps> = ({ id, data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pluginStore = usePluginStore();
  const audioEngineStore = useAudioEngineStore();

  const pluginInstance = data.pluginInstanceId
    ? pluginStore.pluginInstances[data.pluginInstanceId]
    : null;

  const isProcessing = audioEngineStore.nodes.get(id)?.state === 'active';

  // Node color based on plugin state
  const getNodeColor = () => {
    if (!pluginInstance) return '#e5e7eb';
    if (pluginInstance.state === 'error' || pluginInstance.state === 'crashed') return '#fca5a5';
    if (pluginInstance.is_bypassed) return '#fde68a';
    if (pluginInstance.state === 'active') return '#86efac';
    return '#d1d5db';
  };

  // Node icon based on plugin category
  const getCategoryIcon = () => {
    switch (pluginInstance?.plugin_metadata.category) {
      case 'eq':
        return <Settings className="w-4 h-4" />;
      case 'compressor':
      case 'limiter':
      case 'gate':
        return <Zap className="w-4 h-4" />;
      case 'reverb':
      case 'delay':
      case 'chorus':
        return <Activity className="w-4 h-4" />;
      case 'analyzer':
        return <Volume2 className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const handleBypassToggle = () => {
    if (pluginInstance) {
      pluginStore.bypassPlugin(pluginInstance.instance_id, !pluginInstance.is_bypassed);
    }
  };

  const handleNodeClick = () => {
    if (pluginInstance) {
      audioEngineStore.selectNode(id);
    }
  };

  const formatCpuUsage = (cpu: number) => {
    return `${(cpu * 100).toFixed(1)}%`;
  };

  const formatLatency = (latency: number) => {
    if (latency < 1000) {
      return `${latency} samples`;
    }
    return `${(latency / 44.1).toFixed(1)}ms`;
  };

  return (
    <div
      data-node-id={id}
      className={`min-w-[200px] rounded-lg border-2 shadow-sm cursor-pointer transition-all hover:shadow-md ${
        isProcessing ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      style={{
        backgroundColor: 'white',
        borderColor: getNodeColor(),
      }}
      onClick={handleNodeClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Main content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="text-blue-500">
              {getCategoryIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {data.label || pluginInstance?.plugin_metadata.name || 'Plugin'}
              </div>
              <div className="text-xs text-gray-500">
                {pluginInstance?.plugin_metadata.manufacturer || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Bypass button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBypassToggle();
            }}
            className={`p-1 rounded transition-colors ${
              pluginInstance?.is_bypassed
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={pluginInstance?.is_bypassed ? "Enable Plugin" : "Bypass Plugin"}
          >
            {pluginInstance?.is_bypassed ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
        </div>

        {/* Plugin status */}
        {pluginInstance && (
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              pluginInstance.state === 'active' ? 'bg-green-500' :
              pluginInstance.state === 'bypassed' ? 'bg-yellow-500' :
              pluginInstance.state === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            <span className="text-xs text-gray-600 capitalize">
              {pluginInstance.state.replace('_', ' ')}
            </span>

            {/* Performance indicators */}
            {(pluginInstance.cpu_usage > 0.1 || pluginInstance.latency_ms > 1) && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {pluginInstance.cpu_usage > 0.1 && (
                  <span className={`${
                    pluginInstance.cpu_usage > 0.5 ? 'text-red-500' :
                    pluginInstance.cpu_usage > 0.3 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {formatCpuUsage(pluginInstance.cpu_usage)}
                  </span>
                )}
                {pluginInstance.latency_ms > 1 && (
                  <span className="text-orange-500">
                    {formatLatency(pluginInstance.latency_ms)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable parameters section */}
        {pluginInstance && (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-full text-left text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isExpanded ? '▼' : '▶'} Parameters ({Object.keys(pluginInstance.parameters).length})
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {/* Show key parameters */}
                {Object.entries(pluginInstance.parameters)
                  .slice(0, 4) // Show first 4 parameters
                  .map(([paramId, param]) => (
                    <div key={paramId} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate flex-1 mr-2">
                        {param.display_name}
                      </span>
                      <span className="text-gray-900 font-mono">
                        {param.value.toFixed(2)}
                      </span>
                    </div>
                  ))}

                {Object.keys(pluginInstance.parameters).length > 4 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    ...and {Object.keys(pluginInstance.parameters).length - 4} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Current preset indicator */}
        {pluginInstance?.current_preset && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {pluginInstance.current_preset}
          </div>
        )}
      </div>
    </div>
  );
};

// Plugin node type for React Flow
export const pluginNodeType = 'plugin';

// Helper function to create plugin node data
export const createPluginNodeData = (
  pluginInstance: PluginInstance,
  position: { x: number; y: number }
): PluginNodeData => ({
  type: pluginNodeType,
  label: pluginInstance.plugin_metadata.name,
  description: `${pluginInstance.plugin_metadata.manufacturer} ${pluginInstance.plugin_metadata.category}`,
  pluginInstanceId: pluginInstance.instance_id,
  pluginName: pluginInstance.plugin_metadata.name,
  pluginCategory: pluginInstance.plugin_metadata.category,
  isBypassed: pluginInstance.is_bypassed,
  cpuUsage: pluginInstance.cpu_usage,
  latency: pluginInstance.latency_ms,
  position,
  color: '#3b82f6', // Blue color for plugin nodes
  order: 0,
  path: [],
});

export default PluginNode;