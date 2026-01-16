/**
 * Plugin Browser Modal for Flow Workspace
 * Provides plugin selection and addition functionality
 * Integrates with the existing plugin system
 */

import React, { useState, useCallback } from 'react';
import { X, Search, Zap, Settings, Activity } from 'lucide-react';
import { usePluginStore } from '@/stores/pluginStore';
import { useEnhancedPluginStore } from '@/stores/enhancedPluginStore';
import { RealPluginBrowser } from '@/components/plugins/RealPluginBrowser';
import type { PluginMetadata, PluginCategory, PluginFormat } from '@/types/plugins';

interface PluginBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPluginSelect?: (plugin: PluginMetadata) => void;
  trackId?: string;
}

export const PluginBrowserModal: React.FC<PluginBrowserModalProps> = ({
  isOpen,
  onClose,
  onPluginSelect,
  trackId,
}) => {
  const pluginStore = usePluginStore();
  const enhancedPluginStore = useEnhancedPluginStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | ''>('');
  const [selectedFormat, setSelectedFormat] = useState<PluginFormat | ''>('');
  const [showRealPluginBrowser, setShowRealPluginBrowser] = useState(false);

  // Get filtered plugins (try enhanced store first, fallback to basic store)
  const [filteredPlugins, setFilteredPlugins] = useState<PluginMetadata[]>([]);

  React.useEffect(() => {
    const performSearch = async () => {
      if (enhancedPluginStore.isRealPluginDatabaseEnabled && enhancedPluginStore.availablePlugins.length > 0) {
        try {
          const results = await enhancedPluginStore.searchRealPlugins({
            query: searchQuery,
            categories: selectedCategory ? [selectedCategory] : undefined,
            formats: selectedFormat ? [selectedFormat] : undefined,
          });
          setFilteredPlugins(results);
        } catch (error) {
          console.error('Error searching plugins:', error);
          setFilteredPlugins([]);
        }
      } else {
        const results = pluginStore.searchPlugins(searchQuery, {
          category: selectedCategory || undefined,
          format: selectedFormat || undefined,
        });
        setFilteredPlugins(results);
      }
    };

    performSearch();
  }, [searchQuery, selectedCategory, selectedFormat, enhancedPluginStore.isRealPluginDatabaseEnabled, enhancedPluginStore.availablePlugins]);

  const handlePluginSelect = useCallback((plugin: PluginMetadata) => {
    // Create a new plugin instance
    const instanceId = `plugin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Mock plugin instance creation (in real implementation, this would call the backend)
    const newInstance = {
      instance_id: instanceId,
      plugin_metadata: plugin,
      state: 'loaded' as const,
      is_bypassed: false,
      parameters: {}, // Would be populated from actual plugin
      available_presets: [],
      cpu_usage: plugin.cpu_usage_estimate,
      processing_time_ms: 0,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      is_active: false,
      latency_ms: (plugin.latency_samples / 44.1), // Convert samples to ms
    };

    // Add to plugin store
    if (trackId) {
      pluginStore.addPluginInstance(trackId, newInstance);
      enhancedPluginStore.addPluginInstance(trackId, newInstance);
    }

    // Track plugin usage in enhanced database
    enhancedPluginStore.trackPluginUsage(plugin.id, 0); // Initial selection

    // Call the callback
    onPluginSelect?.(plugin);

    // Close modal
    onClose();
  }, [pluginStore, enhancedPluginStore, onPluginSelect, onClose, trackId]);

  const getCategoryIcon = (category: PluginCategory) => {
    switch (category) {
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
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const categories: PluginCategory[] = [
    'eq', 'compressor', 'limiter', 'gate', 'expander', 'reverb', 'delay',
    'chorus', 'flanger', 'phaser', 'distortion', 'saturation', 'filter',
    'modulation', 'pitch', 'utility', 'analyzer', 'synthesizer', 'sampler',
    'drum_machine', 'bass', 'guitar', 'piano', 'orchestral', 'vintage',
    'channel_strip'
  ];

  const formats: PluginFormat[] = ['VST3', 'AU', 'AAX', 'WAM', 'CLAP', 'LV2'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Plugin Browser</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PluginCategory | '')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as PluginFormat | '')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Formats</option>
                {formats.map(format => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Real Plugin Database Toggle */}
        <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="real-plugin-db"
              checked={enhancedPluginStore.isRealPluginDatabaseEnabled}
              onChange={(e) => {
                if (e.target.checked) {
                  enhancedPluginStore.enableRealPluginDatabase();
                } else {
                  enhancedPluginStore.disableRealPluginDatabase();
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="real-plugin-db" className="text-sm font-medium text-gray-700">
              Use Real Plugin Database
            </label>
            {enhancedPluginStore.isRealPluginDatabaseEnabled && enhancedPluginStore.lastScanTime && (
              <span className="text-xs text-gray-500">
                Last scan: {enhancedPluginStore.lastScanTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {enhancedPluginStore.isRealPluginDatabaseEnabled && (
              <>
                <button
                  onClick={() => enhancedPluginStore.scanRealPlugins()}
                  disabled={enhancedPluginStore.scanProgress.isScanning}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {enhancedPluginStore.scanProgress.isScanning ? 'Scanning...' : 'Scan Plugins'}
                </button>
                <button
                  onClick={() => setShowRealPluginBrowser(!showRealPluginBrowser)}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  {showRealPluginBrowser ? 'Simple View' : 'Advanced View'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Plugin List */}
        <div className="flex-1 overflow-y-auto">
          {showRealPluginBrowser && enhancedPluginStore.isRealPluginDatabaseEnabled ? (
            <div className="h-full">
              <RealPluginBrowser
                onPluginSelect={(plugin) => {
                  handlePluginSelect(plugin);
                  setShowRealPluginBrowser(false); // Return to simple view after selection
                }}
                compact={true}
                showRecommendations={true}
              />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlugins.map((plugin) => (
              <div
                key={plugin.unique_id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                onClick={() => handlePluginSelect(plugin)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-blue-500">
                      {getCategoryIcon(plugin.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                      <p className="text-sm text-gray-500">{plugin.manufacturer}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {plugin.format}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-900 capitalize">
                      {plugin.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">I/O:</span>
                    <span className="text-gray-900">
                      {plugin.input_channels} → {plugin.output_channels}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CPU:</span>
                    <span className={`${
                      plugin.cpu_usage_estimate > 0.5 ? 'text-red-500' :
                      plugin.cpu_usage_estimate > 0.3 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {(plugin.cpu_usage_estimate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rating:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-gray-900">
                        {plugin.quality_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {plugin.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plugin.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {plugin.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{plugin.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredPlugins.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500">No plugins found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredPlugins.length} plugins found
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginBrowserModal;