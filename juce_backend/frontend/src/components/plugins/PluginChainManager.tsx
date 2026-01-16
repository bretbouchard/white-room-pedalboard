import React, { useState, useCallback } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import PluginChain from './PluginChain';

export interface PluginChainManagerProps {
  trackId: string;
  className?: string;
  showTemplates?: boolean;
  allowParallelRouting?: boolean;
}

interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  pluginTypes: string[];
  category: 'mixing' | 'mastering' | 'creative' | 'utility';
  tags: string[];
}

const defaultChainTemplates: ChainTemplate[] = [
  {
    id: 'vocal-chain',
    name: 'Vocal Processing Chain',
    description: 'Complete vocal processing with EQ, compression, and reverb',
    pluginTypes: ['eq', 'compressor', 'gate', 'reverb'],
    category: 'mixing',
    tags: ['vocal', 'processing'],
  },
  {
    id: 'master-chain',
    name: 'Mastering Chain',
    description: 'Professional mastering chain with EQ, compression, and limiting',
    pluginTypes: ['eq', 'compressor', 'limiter', 'analyzer'],
    category: 'mastering',
    tags: ['mastering', 'final'],
  },
  {
    id: 'guitar-chain',
    name: 'Guitar Effects Chain',
    description: 'Guitar effects processing with distortion, modulation, and delay',
    pluginTypes: ['distortion', 'chorus', 'delay', 'reverb'],
    category: 'creative',
    tags: ['guitar', 'effects'],
  },
  {
    id: 'drum-chain',
    name: 'Drum Processing Chain',
    description: 'Drum processing with gating, compression, and EQ',
    pluginTypes: ['gate', 'compressor', 'eq', 'saturation'],
    category: 'mixing',
    tags: ['drums', 'rhythm'],
  },
];

/**
 * Plugin Chain Manager component with drag-and-drop, templates, and routing
 */
const PluginChainManager: React.FC<PluginChainManagerProps> = ({
  trackId,
  className,
  showTemplates = true,
  allowParallelRouting = false,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [routingMode, setRoutingMode] = useState<'serial' | 'parallel'>('serial');
  const [chainTemplates] = useState<ChainTemplate[]>(defaultChainTemplates);
  const [searchTerm, setSearchTerm] = useState('');

  const { sendMessage } = useWebSocket();
  const {
    pluginChains,
    trackPlugins,
    getTrackPlugins,
    createPluginChain,
    updatePluginChain,
  } = usePluginStore();

  // Get chains for this track
  const trackChains = Object.values(pluginChains).filter(chain =>
    chain.plugins.some(plugin => trackPlugins[trackId]?.includes(plugin.instance_id))
  );

  const trackPluginInstances = getTrackPlugins(trackId);

  // Handle creating new chain
  const handleCreateChain = useCallback((name: string, pluginIds: string[] = []) => {
    const chainId = createPluginChain(trackId, name, pluginIds);
    setSelectedChainId(chainId);

    // Send to backend
    sendMessage({
      type: 'plugin.chain.create',
      data: {
        track_id: trackId,
        chain_id: chainId,
        name,
        plugin_ids: pluginIds,
        routing_mode: routingMode,
      },
    });

    return chainId;
  }, [trackId, routingMode, createPluginChain, sendMessage]);

  // Handle creating chain from template
  const handleCreateFromTemplate = useCallback(async (template: ChainTemplate) => {
    const chainName = `${template.name} - ${new Date().toLocaleTimeString()}`;
    const chainId = handleCreateChain(chainName);

    // Send template application request to backend
    sendMessage({
      type: 'plugin.chain.apply_template',
      data: {
        track_id: trackId,
        chain_id: chainId,
        template_id: template.id,
        plugin_types: template.pluginTypes,
      },
    });

    setShowTemplateModal(false);
  }, [trackId, handleCreateChain, sendMessage]);

  
  // Filter templates by search
  const filteredTemplates = chainTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const containerClasses = cn(
    'plugin-chain-manager bg-daw-surface-secondary rounded-lg p-4',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-daw-text-primary">Plugin Chains</h3>
        
        <div className="flex items-center space-x-2">
          {allowParallelRouting && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-daw-text-secondary">Routing:</span>
              <select
                value={routingMode}
                onChange={(e) => setRoutingMode(e.target.value as 'serial' | 'parallel')}
                className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
              >
                <option value="serial">Serial</option>
                <option value="parallel">Parallel</option>
              </select>
            </div>
          )}
          
          <Button
            onClick={() => handleCreateChain('New Chain')}
            variant="accent"
            size="sm"
            className="text-xs px-3 py-1"
          >
            + New Chain
          </Button>
          
          {showTemplates && (
            <Button
              onClick={() => setShowTemplateModal(true)}
              variant="secondary"
              size="sm"
              className="text-xs px-3 py-1"
            >
              Templates
            </Button>
          )}
        </div>
      </div>

      {/* Chain List */}
      <div className="space-y-4">
        {trackChains.length === 0 ? (
          <div className="text-center py-8 text-daw-text-tertiary">
            <div className="text-sm mb-2">No plugin chains created</div>
            <div className="text-xs mb-4">Create chains to organize your plugins</div>
            <Button
              onClick={() => handleCreateChain('My First Chain')}
              variant="accent"
              size="sm"
            >
              Create First Chain
            </Button>
          </div>
        ) : (
          trackChains.map(chain => (
            <PluginChain
              key={chain.chain_id}
              chain={chain}
              trackId={trackId}
              allowReorder={true}
              showPerformanceMetrics={true}
              className={cn(
                selectedChainId === chain.chain_id && 'ring-2 ring-daw-accent-primary'
              )}
            />
          ))
        )}
      </div>

      {/* Unassigned Plugins */}
      {trackPluginInstances.length > 0 && (
        <div className="mt-6 p-4 bg-daw-surface-primary rounded border">
          <h4 className="text-sm font-medium text-daw-text-secondary mb-3">
            Unassigned Plugins
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {trackPluginInstances
              .filter(plugin => !trackChains.some(chain => 
                chain.plugins.some(p => p.instance_id === plugin.instance_id)
              ))
              .map(plugin => (
                <div
                  key={plugin.instance_id}
                  className="flex items-center justify-between p-2 bg-daw-surface-secondary rounded border"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', plugin.instance_id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-daw-text-primary truncate">
                      {plugin.plugin_metadata.name}
                    </div>
                    <div className="text-xs text-daw-text-secondary">
                      {plugin.plugin_metadata.manufacturer}
                    </div>
                  </div>
                  <div className="text-xs text-daw-text-tertiary cursor-move">
                    ⋮⋮
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-daw-surface-secondary rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-daw-text-primary">Chain Templates</h3>
              <Button
                onClick={() => setShowTemplateModal(false)}
                variant="secondary"
                size="sm"
                className="text-xs px-2 py-1"
              >
                ×
              </Button>
            </div>

            {/* Template Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
              />
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="p-4 bg-daw-surface-primary rounded border hover:border-daw-accent-primary transition-colors cursor-pointer"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-daw-text-primary">
                      {template.name}
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs rounded',
                      template.category === 'mixing' && 'bg-blue-900/30 text-blue-400',
                      template.category === 'mastering' && 'bg-purple-900/30 text-purple-400',
                      template.category === 'creative' && 'bg-green-900/30 text-green-400',
                      template.category === 'utility' && 'bg-gray-900/30 text-gray-400'
                    )}>
                      {template.category}
                    </span>
                  </div>
                  
                  <div className="text-xs text-daw-text-secondary mb-3">
                    {template.description}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.pluginTypes.slice(0, 3).map(type => (
                        <span
                          key={type}
                          className="px-1 py-0.5 text-xs bg-daw-surface-tertiary text-daw-text-tertiary rounded"
                        >
                          {type}
                        </span>
                      ))}
                      {template.pluginTypes.length > 3 && (
                        <span className="text-xs text-daw-text-tertiary">
                          +{template.pluginTypes.length - 3}
                        </span>
                      )}
                    </div>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFromTemplate(template);
                      }}
                      variant="accent"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-daw-text-tertiary">
                <div className="text-sm">No templates found</div>
                <div className="text-xs mt-1">Try adjusting your search</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginChainManager;