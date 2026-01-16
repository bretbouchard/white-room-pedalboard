/**
 * Real Plugin Browser Component
 *
 * This component provides a comprehensive interface for browsing real plugins,
 * with advanced search, filtering, and recommendations powered by the enhanced plugin database.
 */

import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Star, Cpu, HardDrive, Tag, TrendingUp, Settings } from 'lucide-react';

import { useEnhancedPluginStore } from '@/stores/enhancedPluginStore';
import { PluginIcon } from './PluginIcon';
import type { PluginMetadata, PluginCategory, PluginFormat } from '@/types/plugins';

interface RealPluginBrowserProps {
  onPluginSelect?: (plugin: PluginMetadata) => void;
  onPluginAdd?: (plugin: PluginMetadata) => void;
  showRecommendations?: boolean;
  compact?: boolean;
}

export const RealPluginBrowser: React.FC<RealPluginBrowserProps> = ({
  onPluginSelect,
  onPluginAdd,
  showRecommendations = true,
  compact = false,
}) => {
  const {
    // State
    searchResults,
    searchQuery,
    searchFilters,
    recommendations,
    selectedPlugin,
    isLoading,
    isRealPluginDatabaseEnabled,
    lastScanTime,
    scanProgress,
    databaseStats,
    advancedSearchFilters,

    // Actions
    setSearchQuery,
    setSearchFilters,
    setSelectedPlugin,
    scanRealPlugins,
    searchRealPlugins,
    getPersonalizedRecommendations,
    setAdvancedSearchFilters,
    searchWithAdvancedFilters,
    clearAdvancedFilters,
    getDatabaseStats,
    getQualityMetrics,
    trackPluginUsage,
  } = useEnhancedPluginStore();

  const [activeTab, setActiveTab] = useState<'browse' | 'recommendations' | 'stats'>('browse');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize database stats on mount
  useEffect(() => {
    if (isRealPluginDatabaseEnabled) {
      getDatabaseStats();
      getQualityMetrics();
      getPersonalizedRecommendations();
    }
  }, [isRealPluginDatabaseEnabled]);

  // Search with debounce
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (isRealPluginDatabaseEnabled) {
        searchRealPlugins({ query });
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  // Handle plugin selection
  const handlePluginClick = (plugin: PluginMetadata) => {
    setSelectedPlugin(plugin);
    onPluginSelect?.(plugin);

    // Track usage for analytics
    trackPluginUsage(plugin.id, 0); // Initial view
  };

  // Handle adding plugin to project
  const handleAddPlugin = (plugin: PluginMetadata) => {
    onPluginAdd?.(plugin);
    trackPluginUsage(plugin.id, 0); // Initial usage
  };

  
  // Refresh plugin database
  const handleRefreshDatabase = async () => {
    await scanRealPlugins();
  };

  // Quality indicator component
  const QualityIndicator: React.FC<{ rating: number }> = ({ rating }) => {
    let color = 'text-gray-400';
    let label = 'Basic';

    if (rating >= 0.9) {
      color = 'text-green-500';
      label = 'Excellent';
    } else if (rating >= 0.8) {
      color = 'text-blue-500';
      label = 'Good';
    } else if (rating >= 0.7) {
      color = 'text-yellow-500';
      label = 'Fair';
    }

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Star className="w-4 h-4 fill-current" />
        <span className="text-xs">{label}</span>
      </div>
    );
  };

  // Plugin card component
  const PluginCard: React.FC<{ plugin: PluginMetadata; isRecommendation?: boolean }> = ({
    plugin,
    isRecommendation = false
  }) => {
    const isSelected = selectedPlugin?.id === plugin.id;
    const cardClass = `p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`;

    return (
      <div className={cardClass} onClick={() => handlePluginClick(plugin)}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {/* Plugin Icon */}
              <PluginIcon
                category={plugin.category}
                size={32}
                customIconData={plugin.icon_data}
                customIconUrl={plugin.icon_url}
                fallbackToDefault={true}
              />
              <div>
                <h4 className="font-semibold text-sm">{plugin.name}</h4>
                <p className="text-xs text-gray-600">{plugin.manufacturer}</p>
              </div>
            </div>
          </div>
          <QualityIndicator rating={plugin.quality_rating} />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{plugin.category}</span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{plugin.format}</span>
          {plugin.supports_64bit && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">64-bit</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>{Math.round(plugin.cpu_usage_estimate * 100)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{Math.round(plugin.memory_usage_mb)}MB</span>
            </div>
          </div>

          {isRecommendation && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>Recommended</span>
            </div>
          )}
        </div>

        {plugin.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {plugin.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs bg-gray-50 text-gray-600 px-1 py-0.5 rounded">
                <Tag className="w-2 h-2 inline mr-1" />
                {tag}
              </span>
            ))}
            {plugin.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{plugin.tags.length - 3} more</span>
            )}
          </div>
        )}

        {onPluginAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddPlugin(plugin);
            }}
            className="mt-3 w-full bg-blue-500 text-white text-xs py-1.5 px-3 rounded hover:bg-blue-600 transition-colors"
          >
            Add to Project
          </button>
        )}
      </div>
    );
  };

  // Advanced filters panel
  const AdvancedFiltersPanel = () => (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Advanced Filters
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full p-2 border rounded text-sm"
            value={searchFilters.category || ''}
            onChange={(e) => setSearchFilters({ ...searchFilters, category: e.target.value as PluginCategory })}
          >
            <option value="">All Categories</option>
            <option value="eq">Equalizer</option>
            <option value="compressor">Compressor</option>
            <option value="reverb">Reverb</option>
            <option value="delay">Delay</option>
            <option value="synthesizer">Synthesizer</option>
            <option value="analyzer">Analyzer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Format</label>
          <select
            className="w-full p-2 border rounded text-sm"
            value={searchFilters.format || ''}
            onChange={(e) => setSearchFilters({ ...searchFilters, format: e.target.value as PluginFormat })}
          >
            <option value="">All Formats</option>
            <option value="VST3">VST3</option>
            <option value="AU">Audio Units</option>
            <option value="VST2">VST2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Min Quality</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={advancedSearchFilters.minQuality}
            onChange={(e) => setAdvancedSearchFilters({ ...advancedSearchFilters, minQuality: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center">{advancedSearchFilters.minQuality.toFixed(1)}</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max CPU Usage</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={advancedSearchFilters.maxCpuUsage || 1}
            onChange={(e) => setAdvancedSearchFilters({ ...advancedSearchFilters, maxCpuUsage: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center">
            {advancedSearchFilters.maxCpuUsage ? `${Math.round(advancedSearchFilters.maxCpuUsage * 100)}%` : 'No limit'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Min User Rating</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={advancedSearchFilters.minUserRating}
            onChange={(e) => setAdvancedSearchFilters({ ...advancedSearchFilters, minUserRating: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center">{advancedSearchFilters.minUserRating.toFixed(1)} ⭐</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={searchWithAdvancedFilters}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          Apply Filters
        </button>
        <button
          onClick={clearAdvancedFilters}
          className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>
    </div>
  );

  if (!isRealPluginDatabaseEnabled) {
    return (
      <div className="p-8 text-center">
        <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Real Plugin Database Disabled</h3>
        <p className="text-gray-600 mb-4">Enable the real plugin database to browse actual plugins on your system.</p>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Enable Real Plugin Database
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Plugin Browser</h2>
          {lastScanTime && (
            <p className="text-sm text-gray-500">
              Last scanned: {lastScanTime.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="p-2 border rounded hover:bg-gray-50"
            title="Advanced Filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefreshDatabase}
            disabled={scanProgress.isScanning}
            className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            title="Scan for Plugins"
          >
            <RefreshCw className={`w-4 h-4 ${scanProgress.isScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scan Progress */}
      {scanProgress.isScanning && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{scanProgress.currentStep}</span>
            <span className="text-sm text-blue-600">
              {scanProgress.scanned} / {scanProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(scanProgress.scanned / Math.max(scanProgress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plugins by name, manufacturer, or tags..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mb-6">
          <AdvancedFiltersPanel />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-2 px-1 font-medium text-sm ${
            activeTab === 'browse'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Browse Plugins ({searchResults.length})
        </button>
        {showRecommendations && (
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`pb-2 px-1 font-medium text-sm ${
              activeTab === 'recommendations'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Recommendations ({recommendations.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-2 px-1 font-medium text-sm ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {!isLoading && (
          <>
            {activeTab === 'browse' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} />
                ))}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div>
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendations.map((rec) => (
                      <div key={rec.plugin_name} className="relative">
                        <div className="border rounded p-4 bg-white">
                          <h3 className="font-medium">{rec.plugin_name}</h3>
                          <p className="text-sm text-gray-600">{rec.plugin_category} - {rec.plugin_format}</p>
                          <div className="mt-2">
                            <div className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              Confidence: {Math.round(rec.confidence * 100)}%
                            </div>
                            <p className="text-xs mt-1">{rec.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Recommendations Yet</h3>
                    <p className="text-gray-600">
                      Start using plugins to get personalized recommendations based on your workflow.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {databaseStats && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3">Database Overview</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Plugins:</span>
                          <span className="font-medium">{databaseStats.total_plugins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Quality:</span>
                          <span className="font-medium">{(databaseStats.avg_quality * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Rating:</span>
                          <span className="font-medium">{databaseStats.avg_user_rating.toFixed(1)} ⭐</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3">Quality Distribution</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Excellent:</span>
                          <span className="font-medium text-green-600">{databaseStats.quality_distribution.excellent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Good:</span>
                          <span className="font-medium text-blue-600">{databaseStats.quality_distribution.good}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fair:</span>
                          <span className="font-medium text-yellow-600">{databaseStats.quality_distribution.fair}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Basic:</span>
                          <span className="font-medium text-gray-600">{databaseStats.quality_distribution.basic}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};