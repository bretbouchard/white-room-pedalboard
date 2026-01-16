import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/utils';
import { usePlugins } from '@/hooks/usePlugins';
import { usePluginLoader } from '@/hooks/usePluginLoader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PluginIcon } from './PluginIcon';
import type { PluginMetadata, PluginCategory, PluginFormat } from '@/types/plugins';

export interface PluginBrowserProps {
  className?: string;
  onPluginSelect?: (plugin: PluginMetadata) => void;
  onPluginAdd?: (plugin: PluginMetadata, trackId?: string) => void;
  showRecommendations?: boolean;
  trackId?: string; // For context-aware recommendations
}

interface PluginSearchFilters {
  category?: PluginCategory;
  format?: PluginFormat;
  manufacturer?: string;
  tags?: string[];
  minRating?: number;
  maxCpuUsage?: number;
}

const PluginBrowser: React.FC<PluginBrowserProps> = ({
  className,
  onPluginSelect,
  onPluginAdd,
  trackId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PluginSearchFilters>({});
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use the REST API hooks
  const { plugins, loading, refetch } = usePlugins({
    limit: 100,
    formatFilter: filters.format,
    categoryFilter: filters.category,
  });

  const { loadPlugin, loading: loadingPlugin } = usePluginLoader();

  // Plugin categories for filtering
  const categories = [
    'eq', 'compressor', 'limiter', 'gate', 'expander', 'reverb', 'delay',
    'chorus', 'flanger', 'phaser', 'distortion', 'saturation', 'filter',
    'modulation', 'pitch', 'utility', 'analyzer', 'synthesizer', 'sampler',
    'drum_machine', 'bass', 'guitar', 'piano', 'orchestral', 'vintage',
    'channel_strip'
  ];

  const formats = ['VST3', 'AU', 'AAX', 'WAM', 'CLAP', 'LV2'];

  // Update plugins when filters or search changes
  useEffect(() => {
    // The usePlugins hook already handles fetching when dependencies change
    refetch();
  }, [searchQuery, filters, refetch]);

  const handlePluginSelect = useCallback((plugin: PluginMetadata) => {
    setSelectedPlugin(plugin);
    onPluginSelect?.(plugin);
  }, [onPluginSelect]);

  const handlePluginAdd = useCallback(async (plugin: PluginMetadata) => {
    try {
      const result = await loadPlugin({
        plugin_id: plugin.id || plugin.unique_id,
        track_id: trackId || 'default',
      });

      if (result.success) {
        console.log(`Successfully loaded ${result.plugin_name} as instance ${result.instance_id}`);
        onPluginAdd?.(plugin, trackId);
      } else {
        console.error(`Failed to load plugin: ${result.error}`);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error loading plugin:', error);
    }
  }, [loadPlugin, onPluginAdd, trackId]);

  const handleFilterChange = useCallback((key: keyof PluginSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  // Filter plugins based on search and filters
  const filteredPlugins = useMemo(() => {
    let filtered = plugins;

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plugin =>
        plugin.name.toLowerCase().includes(query) ||
        plugin.manufacturer.toLowerCase().includes(query) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(plugin => plugin.category === filters.category);
    }

    if (filters.format) {
      filtered = filtered.filter(plugin => plugin.format === filters.format);
    }

    if (filters.manufacturer) {
      filtered = filtered.filter(plugin =>
        plugin.manufacturer.toLowerCase().includes(filters.manufacturer!.toLowerCase())
      );
    }

    if (filters.minRating) {
      filtered = filtered.filter(plugin => plugin.quality_rating >= filters.minRating!);
    }

    if (filters.maxCpuUsage) {
      filtered = filtered.filter(plugin => plugin.cpu_usage_estimate <= filters.maxCpuUsage!);
    }

    return filtered;
  }, [plugins, searchQuery, filters]);

  const containerClasses = cn(
    'flex flex-col h-full bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-daw-surface-tertiary">
        <h2 className="text-lg font-semibold text-daw-text-primary">Plugin Browser</h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="secondary"
            size="sm"
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </Button>
          <Button
            onClick={clearFilters}
            variant="secondary"
            size="sm"
            disabled={Object.keys(filters).length === 0 && !searchQuery}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-4 border-b border-daw-surface-tertiary">
        {/* Search Input */}
        <Input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Filter Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-daw-text-secondary mb-1">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm bg-daw-surface-secondary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Format Filter */}
          <div>
            <label className="block text-xs font-medium text-daw-text-secondary mb-1">
              Format
            </label>
            <select
              value={filters.format || ''}
              onChange={(e) => handleFilterChange('format', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm bg-daw-surface-secondary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
            >
              <option value="">All Formats</option>
              {formats.map(format => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-daw-text-secondary mb-1">
              Min Rating
            </label>
            <select
              value={filters.minRating || ''}
              onChange={(e) => handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-sm bg-daw-surface-secondary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
            >
              <option value="">Any Rating</option>
              <option value="0.8">4+ Stars</option>
              <option value="0.6">3+ Stars</option>
              <option value="0.4">2+ Stars</option>
            </select>
          </div>

          {/* CPU Usage Filter */}
          <div>
            <label className="block text-xs font-medium text-daw-text-secondary mb-1">
              Max CPU
            </label>
            <select
              value={filters.maxCpuUsage || ''}
              onChange={(e) => handleFilterChange('maxCpuUsage', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-sm bg-daw-surface-secondary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
            >
              <option value="">Any CPU Usage</option>
              <option value="0.2">Low (20%)</option>
              <option value="0.5">Medium (50%)</option>
              <option value="0.8">High (80%)</option>
            </select>
          </div>
        </div>
      </div>

  
      {/* Plugin List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-daw-text-secondary">Loading plugins...</div>
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-daw-text-secondary">
              <div className="text-lg mb-2">No plugins found</div>
              <div className="text-sm">Try adjusting your search or filters</div>
            </div>
          </div>
        ) : (
          <div className={cn(
            'p-4',
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          )}>
            {filteredPlugins.map((plugin) => (
              <PluginCard
                key={plugin.unique_id}
                plugin={plugin}
                viewMode={viewMode}
                isSelected={selectedPlugin?.unique_id === plugin.unique_id}
                onSelect={() => handlePluginSelect(plugin)}
                onAdd={() => handlePluginAdd(plugin)}
                loadingPlugin={loadingPlugin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Plugin Details Panel */}
      {selectedPlugin && (
        <div className="border-t border-daw-surface-tertiary p-4">
          <PluginDetails
            plugin={selectedPlugin}
            onAdd={() => handlePluginAdd(selectedPlugin)}
            loadingPlugin={loadingPlugin}
          />
        </div>
      )}
    </div>
  );
};

interface PluginCardProps {
  plugin: PluginMetadata;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
  loadingPlugin: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  viewMode,
  isSelected,
  onSelect,
  onAdd,
  loadingPlugin,
}) => {
  const cardClasses = cn(
    'border rounded-lg cursor-pointer transition-all duration-150',
    isSelected
      ? 'border-daw-accent-primary bg-daw-surface-secondary'
      : 'border-daw-surface-tertiary bg-daw-surface-primary hover:border-daw-accent-primary hover:bg-daw-surface-secondary',
    viewMode === 'grid' ? 'p-4' : 'p-3 flex items-center space-x-4'
  );

  const formatCategoryName = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderStars = (rating: number) => {
    const stars = Math.round(rating * 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  if (viewMode === 'list') {
    return (
      <div className={cardClasses} onClick={onSelect}>
        <div className="flex items-center space-x-3">
          {/* Plugin Icon in list view */}
          <PluginIcon
            category={plugin.category}
            size={32}
            customIconData={plugin.icon_data}
            customIconUrl={plugin.icon_url}
            fallbackToDefault={true}
          />

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-daw-text-primary">{plugin.name}</span>
              <span className="text-xs px-2 py-1 bg-daw-surface-tertiary rounded text-daw-text-secondary">
                {plugin.format}
              </span>
            </div>
            <div className="text-sm text-daw-text-secondary mt-1">
              {plugin.manufacturer} • {formatCategoryName(plugin.category)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-xs text-daw-text-tertiary">
            {renderStars(plugin.quality_rating)}
          </div>
          <div className="text-xs text-daw-text-tertiary">
            CPU: {(plugin.cpu_usage_estimate * 100).toFixed(0)}%
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            variant="accent"
            size="sm"
            disabled={loadingPlugin}
          >
            {loadingPlugin ? 'Loading...' : 'Add'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses} onClick={onSelect}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs px-2 py-1 bg-daw-surface-tertiary rounded text-daw-text-secondary">
          {plugin.format}
        </span>
        <div className="text-xs text-daw-text-tertiary">
          {renderStars(plugin.quality_rating)}
        </div>
      </div>

      {/* Plugin Icon */}
      <div className="flex justify-center mb-3">
        <PluginIcon
          category={plugin.category}
          size={48}
          customIconData={plugin.icon_data}
          customIconUrl={plugin.icon_url}
          fallbackToDefault={true}
        />
      </div>

      <div className="mb-2">
        <div className="font-medium text-daw-text-primary truncate" title={plugin.name}>
          {plugin.name}
        </div>
        <div className="text-sm text-daw-text-secondary truncate" title={plugin.manufacturer}>
          {plugin.manufacturer}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-daw-text-tertiary mb-1">
          {formatCategoryName(plugin.category)}
        </div>
        <div className="text-xs text-daw-text-tertiary">
          CPU: {(plugin.cpu_usage_estimate * 100).toFixed(0)}% •
          Latency: {plugin.latency_samples}smp
        </div>
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        variant="accent"
        size="sm"
        className="w-full"
        disabled={loadingPlugin}
      >
        {loadingPlugin ? 'Loading...' : 'Add Plugin'}
      </Button>
    </div>
  );
};

interface PluginDetailsProps {
  plugin: PluginMetadata;
  onAdd: () => void;
  loadingPlugin: boolean;
}

const PluginDetails: React.FC<PluginDetailsProps> = ({ plugin, onAdd, loadingPlugin }) => {
  const formatCategoryName = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderStars = (rating: number) => {
    const stars = Math.round(rating * 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Plugin Icon in details view */}
          <PluginIcon
            category={plugin.category}
            size={64}
            customIconData={plugin.icon_data}
            customIconUrl={plugin.icon_url}
            fallbackToDefault={true}
          />

          <div>
            <h3 className="text-lg font-semibold text-daw-text-primary">{plugin.name}</h3>
            <p className="text-sm text-daw-text-secondary">{plugin.manufacturer} • v{plugin.version}</p>
          </div>
        </div>
        <Button onClick={onAdd} variant="accent" disabled={loadingPlugin}>
          {loadingPlugin ? 'Loading...' : 'Add to Track'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">Category</div>
          <div className="text-sm text-daw-text-primary">{formatCategoryName(plugin.category)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">Format</div>
          <div className="text-sm text-daw-text-primary">{plugin.format}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">Quality</div>
          <div className="text-sm text-daw-text-primary">{renderStars(plugin.quality_rating)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">CPU Usage</div>
          <div className="text-sm text-daw-text-primary">{(plugin.cpu_usage_estimate * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">I/O Channels</div>
          <div className="text-sm text-daw-text-primary">
            {plugin.input_channels} in → {plugin.output_channels} out
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-1">Latency</div>
          <div className="text-sm text-daw-text-primary">{plugin.latency_samples} samples</div>
        </div>
      </div>

      {plugin.tags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-daw-text-secondary mb-2">Tags</div>
          <div className="flex flex-wrap gap-1">
            {plugin.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-daw-surface-tertiary text-daw-text-secondary rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginBrowser;