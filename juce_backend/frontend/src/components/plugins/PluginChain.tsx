import React, { useState, useCallback } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import Knob from '@/components/ui/Knob';
import PluginControl from './PluginControl';
import type { PluginChain as PluginChainType } from '@/types/plugins';

export interface PluginChainProps {
  chain: PluginChainType;
  trackId: string;
  className?: string;
  allowReorder?: boolean;
  showPerformanceMetrics?: boolean;
}

const PluginChain: React.FC<PluginChainProps> = ({
  chain,
  trackId,
  className,
  allowReorder = true,
  showPerformanceMetrics = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [draggedPlugin, setDraggedPlugin] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { sendMessage } = useWebSocket();
  const {
    updatePluginChain,
    deletePluginChain,
    reorderPluginsInChain,
  } = usePluginStore();

  const handleChainToggle = useCallback(() => {
    const newActiveState = !chain.is_active;
    updatePluginChain(chain.chain_id, { is_active: newActiveState });

    // Send to backend - bypass all plugins in chain
    chain.plugins.forEach(plugin => {
      sendMessage({
        type: 'plugin.bypass',
        data: {
          track_id: trackId,
          plugin_id: plugin.instance_id,
          bypassed: !newActiveState,
        },
      });
    });
  }, [chain, trackId, updatePluginChain, sendMessage]);

  const handleInputGainChange = useCallback((gain: number) => {
    updatePluginChain(chain.chain_id, { input_gain: gain });
  }, [chain.chain_id, updatePluginChain]);

  const handleOutputGainChange = useCallback((gain: number) => {
    updatePluginChain(chain.chain_id, { output_gain: gain });
  }, [chain.chain_id, updatePluginChain]);

  const handleDeleteChain = useCallback(() => {
    if (confirm(`Delete plugin chain "${chain.name}"?`)) {
      deletePluginChain(chain.chain_id);
    }
  }, [chain.chain_id, chain.name, deletePluginChain]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, pluginId: string) => {
    if (!allowReorder) return;
    setDraggedPlugin(pluginId);
    e.dataTransfer.effectAllowed = 'move';
  }, [allowReorder]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!allowReorder || !draggedPlugin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, [allowReorder, draggedPlugin]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    if (!allowReorder || !draggedPlugin) return;
    e.preventDefault();

    const dragIndex = chain.plugins.findIndex(p => p.instance_id === draggedPlugin);
    if (dragIndex === -1 || dragIndex === dropIndex) return;

    // Reorder plugins
    const newPlugins = [...chain.plugins];
    const [draggedItem] = newPlugins.splice(dragIndex, 1);
    newPlugins.splice(dropIndex, 0, draggedItem);

    const newPluginIds = newPlugins.map(p => p.instance_id);
    reorderPluginsInChain(chain.chain_id, newPluginIds);

    // Send reorder message to backend
    sendMessage({
      type: 'plugin.chain.reorder',
      data: {
        track_id: trackId,
        plugin_ids: newPluginIds,
      },
    });

    setDraggedPlugin(null);
    setDragOverIndex(null);
  }, [allowReorder, draggedPlugin, chain, trackId, reorderPluginsInChain, sendMessage]);

  const handleDragEnd = useCallback(() => {
    setDraggedPlugin(null);
    setDragOverIndex(null);
  }, []);

  const containerClasses = cn(
    'bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Chain Header */}
      <div className="flex items-center justify-between p-3 border-b border-daw-surface-tertiary">
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="secondary"
            size="sm"
            className="text-xs px-2 py-1"
          >
            {isExpanded ? '▼' : '▶'}
          </Button>
          
          <div>
            <div className="font-medium text-daw-text-primary">{chain.name}</div>
            <div className="text-xs text-daw-text-secondary">
              {chain.plugins.length} plugins • {chain.total_latency_samples} samples latency
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chain Controls */}
          <div className="flex items-center space-x-2">
            <Knob
              value={chain.input_gain}
              min={0}
              max={4}
              step={0.01}
              onChange={handleInputGainChange}
              label="In"
              unit=""
            />
            <Knob
              value={chain.output_gain}
              min={0}
              max={4}
              step={0.01}
              onChange={handleOutputGainChange}
              label="Out"
              unit=""
            />
          </div>

          {/* Chain Status */}
          <Button
            onClick={handleChainToggle}
            variant={chain.is_active ? 'accent' : 'secondary'}
            size="sm"
            className="text-xs px-3 py-1"
          >
            {chain.is_active ? 'Active' : 'Bypassed'}
          </Button>

          <Button
            onClick={handleDeleteChain}
            variant="danger"
            size="sm"
            className="text-xs px-2 py-1"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Chain Performance Metrics */}
      {isExpanded && showPerformanceMetrics && (
        <div className="p-3 border-b border-daw-surface-tertiary bg-daw-surface-primary">
          <div className="text-xs font-medium text-daw-text-secondary mb-2">Chain Performance</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-daw-text-tertiary">Total CPU</div>
              <div className="text-daw-text-primary">
                {(chain.estimated_cpu_usage * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-daw-text-tertiary">Total Latency</div>
              <div className="text-daw-text-primary">
                {chain.total_latency_samples} samples
              </div>
            </div>
            <div>
              <div className="text-daw-text-tertiary">Active Plugins</div>
              <div className="text-daw-text-primary">
                {chain.plugins.filter(p => p.is_active).length}/{chain.plugins.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plugin List */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {chain.plugins.length === 0 ? (
            <div className="text-center text-daw-text-tertiary py-8">
              <div className="text-sm mb-1">No plugins in chain</div>
              <div className="text-xs">Drag plugins here to add them</div>
            </div>
          ) : (
            chain.plugins.map((plugin, index) => (
              <div
                key={plugin.instance_id}
                className={cn(
                  'relative transition-all duration-200',
                  dragOverIndex === index && 'transform translate-y-1',
                  draggedPlugin === plugin.instance_id && 'opacity-50'
                )}
                draggable={allowReorder}
                onDragStart={(e) => handleDragStart(e, plugin.instance_id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* Drop indicator */}
                {dragOverIndex === index && draggedPlugin && (
                  <div className="absolute -top-1 left-0 right-0 h-0.5 bg-daw-accent-primary rounded" />
                )}

                {/* Plugin position indicator */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-daw-surface-tertiary rounded-full flex items-center justify-center text-xs text-daw-text-secondary">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <PluginControl
                      pluginInstance={plugin}
                      trackId={trackId}
                      compact={true}
                      showPerformanceMetrics={showPerformanceMetrics}
                    />
                  </div>

                  {/* Drag handle */}
                  {allowReorder && (
                    <div className="flex-shrink-0 cursor-move text-daw-text-tertiary hover:text-daw-text-secondary">
                      ⋮⋮
                    </div>
                  )}
                </div>

                {/* Signal flow arrow */}
                {index < chain.plugins.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="text-daw-text-tertiary text-xs">↓</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PluginChain;