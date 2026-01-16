import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import type { PluginInstance, PluginPreset } from '@/types/plugins';

export interface PluginPresetBrowserProps {
  pluginInstance: PluginInstance;
  trackId: string;
  className?: string;
  showPreview?: boolean;
  onPresetLoad?: (preset: PluginPreset) => void;
}

/**
 * Plugin Preset Browser component with preview functionality
 */
const PluginPresetBrowser: React.FC<PluginPresetBrowserProps> = ({
  pluginInstance,
  trackId,
  className,
  showPreview = true,
  onPresetLoad,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<PluginPreset | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewState, setPreviewState] = useState<Record<string, number> | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'author' | 'created'>('name');

  const { sendMessage } = useWebSocket();
  const { loadPluginPreset, updatePluginInstance } = usePluginStore();

  // Get all available tags from presets
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    pluginInstance.available_presets.forEach(preset => {
      preset.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [pluginInstance.available_presets]);

  // Filter and sort presets
  const filteredPresets = React.useMemo(() => {
    let presets = pluginInstance.available_presets;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      presets = presets.filter(preset =>
        preset.name.toLowerCase().includes(search) ||
        preset.description?.toLowerCase().includes(search) ||
        preset.author?.toLowerCase().includes(search) ||
        preset.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Filter by tag
    if (selectedTag !== 'all') {
      presets = presets.filter(preset =>
        preset.tags.includes(selectedTag)
      );
    }

    // Sort presets
    presets.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return presets;
  }, [pluginInstance.available_presets, searchTerm, selectedTag, sortBy]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: PluginPreset) => {
    setSelectedPreset(preset);
  }, []);

  // Handle preset preview
  const handlePresetPreview = useCallback(async (preset: PluginPreset) => {
    if (!showPreview) return;

    try {
      // Store current state for restoration
      const currentState: Record<string, number> = {};
      Object.entries(pluginInstance.parameters).forEach(([id, param]) => {
        currentState[id] = param.value;
      });
      setPreviewState(currentState);

      // Apply preset parameters temporarily
      setIsPreviewMode(true);
      
      // Send preview message to backend
      sendMessage('plugin.preset.preview', {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        preset_parameters: preset.parameters,
      });

      // Update local state for UI feedback
      const updatedParameters = { ...pluginInstance.parameters };
      Object.entries(preset.parameters).forEach(([paramName, paramValue]) => {
        if (updatedParameters[paramName]) {
          updatedParameters[paramName] = {
            ...updatedParameters[paramName],
            value: paramValue,
          };
        }
      });

      updatePluginInstance(pluginInstance.instance_id, {
        parameters: updatedParameters,
      });

    } catch (error) {
      console.error('Failed to preview preset:', error);
    }
  }, [pluginInstance, trackId, showPreview, sendMessage, updatePluginInstance]);

  // Handle preset load (permanent)
  const handlePresetLoad = useCallback(async (preset: PluginPreset) => {
    try {
      // Exit preview mode
      setIsPreviewMode(false);
      setPreviewState(null);

      // Load preset permanently
      loadPluginPreset(pluginInstance.instance_id, preset.name);

      // Send to backend
      sendMessage('plugin.preset', {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        preset_name: preset.name,
      });

      // Call callback if provided
      onPresetLoad?.(preset);

    } catch (error) {
      console.error('Failed to load preset:', error);
    }
  }, [pluginInstance.instance_id, trackId, loadPluginPreset, sendMessage, onPresetLoad]);

  // Handle preview cancel
  const handlePreviewCancel = useCallback(async () => {
    if (!isPreviewMode || !previewState) return;

    try {
      // Restore original parameters
      const updatedParameters = { ...pluginInstance.parameters };
      Object.entries(previewState).forEach(([paramId, paramValue]) => {
        if (updatedParameters[paramId]) {
          updatedParameters[paramId] = {
            ...updatedParameters[paramId],
            value: paramValue,
          };
        }
      });

      updatePluginInstance(pluginInstance.instance_id, {
        parameters: updatedParameters,
      });

      // Send restore message to backend
      sendMessage('plugin.preset.restore', {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        parameters: previewState,
      });

      setIsPreviewMode(false);
      setPreviewState(null);

    } catch (error) {
      console.error('Failed to cancel preview:', error);
    }
  }, [isPreviewMode, previewState, pluginInstance.instance_id, trackId, updatePluginInstance, sendMessage]);

  // Auto-cancel preview after timeout
  useEffect(() => {
    if (!isPreviewMode) return;

    const timeout = setTimeout(() => {
      handlePreviewCancel();
    }, 30000); // 30 second preview timeout

    return () => clearTimeout(timeout);
  }, [isPreviewMode, handlePreviewCancel]);

  const containerClasses = cn(
    'plugin-preset-browser bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-daw-text-primary">
          Preset Browser
        </h3>
        {isPreviewMode && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-yellow-400">Preview Mode</span>
            <Button
              onClick={handlePreviewCancel}
              variant="secondary"
              size="sm"
              className="text-xs px-2 py-1"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search presets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="author">Sort by Author</option>
            <option value="created">Sort by Date</option>
          </select>
        </div>

        {availableTags.length > 0 && (
          <div className="flex items-center space-x-1 flex-wrap">
            <span className="text-xs text-daw-text-tertiary">Tags:</span>
            <button
              onClick={() => setSelectedTag('all')}
              className={cn(
                'px-2 py-1 text-xs rounded',
                selectedTag === 'all'
                  ? 'bg-daw-accent-primary text-white'
                  : 'bg-daw-surface-primary text-daw-text-secondary hover:bg-daw-surface-tertiary'
              )}
            >
              All
            </button>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  selectedTag === tag
                    ? 'bg-daw-accent-primary text-white'
                    : 'bg-daw-surface-primary text-daw-text-secondary hover:bg-daw-surface-tertiary'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preset List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredPresets.map((preset) => (
          <PresetItem
            key={preset.name}
            preset={preset}
            isSelected={selectedPreset?.name === preset.name}
            isCurrentPreset={pluginInstance.current_preset === preset.name}
            showPreview={showPreview}
            onSelect={handlePresetSelect}
            onPreview={handlePresetPreview}
            onLoad={handlePresetLoad}
          />
        ))}

        {filteredPresets.length === 0 && (
          <div className="text-center py-8 text-daw-text-tertiary">
            <div className="text-sm">No presets found</div>
            {searchTerm && (
              <div className="text-xs mt-1">
                Try adjusting your search or tag filter
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Preset Details */}
      {selectedPreset && (
        <div className="mt-4 p-3 bg-daw-surface-primary rounded border">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-sm text-daw-text-primary">
                {selectedPreset.name}
              </div>
              {selectedPreset.author && (
                <div className="text-xs text-daw-text-secondary">
                  by {selectedPreset.author}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {showPreview && (
                <Button
                  onClick={() => handlePresetPreview(selectedPreset)}
                  variant="secondary"
                  size="sm"
                  className="text-xs px-2 py-1"
                  disabled={isPreviewMode}
                >
                  Preview
                </Button>
              )}
              <Button
                onClick={() => handlePresetLoad(selectedPreset)}
                variant="accent"
                size="sm"
                className="text-xs px-2 py-1"
              >
                Load
              </Button>
            </div>
          </div>

          {selectedPreset.description && (
            <div className="text-xs text-daw-text-tertiary mb-2">
              {selectedPreset.description}
            </div>
          )}

          {selectedPreset.tags.length > 0 && (
            <div className="flex items-center space-x-1 flex-wrap">
              {selectedPreset.tags.map(tag => (
                <span
                  key={tag}
                  className="px-1 py-0.5 text-xs bg-daw-surface-tertiary text-daw-text-tertiary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PresetItemProps {
  preset: PluginPreset;
  isSelected: boolean;
  isCurrentPreset: boolean;
  showPreview: boolean;
  onSelect: (preset: PluginPreset) => void;
  onPreview: (preset: PluginPreset) => void;
  onLoad: (preset: PluginPreset) => void;
}

const PresetItem: React.FC<PresetItemProps> = ({
  preset,
  isSelected,
  isCurrentPreset,
  showPreview,
  onSelect,
  onPreview,
  onLoad,
}) => {
  const handleClick = useCallback(() => {
    onSelect(preset);
  }, [preset, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onLoad(preset);
  }, [preset, onLoad]);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(preset);
  }, [preset, onPreview]);

  const handleLoadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onLoad(preset);
  }, [preset, onLoad]);

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'preset-item p-2 rounded cursor-pointer transition-colors',
        isSelected
          ? 'bg-daw-accent-primary/20 border border-daw-accent-primary'
          : 'bg-daw-surface-primary hover:bg-daw-surface-tertiary',
        isCurrentPreset && 'ring-1 ring-green-400'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className="font-medium text-sm text-daw-text-primary truncate">
              {preset.name}
            </div>
            {isCurrentPreset && (
              <span className="text-xs text-green-400">●</span>
            )}
          </div>
          {preset.author && (
            <div className="text-xs text-daw-text-secondary truncate">
              by {preset.author}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-2">
          {showPreview && (
            <button
              onClick={handlePreviewClick}
              className="px-1 py-0.5 text-xs text-daw-text-secondary hover:text-daw-text-primary transition-colors"
              title="Preview preset"
            >
              👁
            </button>
          )}
          <button
            onClick={handleLoadClick}
            className="px-1 py-0.5 text-xs text-daw-text-secondary hover:text-daw-text-primary transition-colors"
            title="Load preset"
          >
            ▶
          </button>
        </div>
      </div>

      {preset.tags.length > 0 && (
        <div className="flex items-center space-x-1 mt-1 flex-wrap">
          {preset.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-1 py-0.5 text-xs bg-daw-surface-tertiary text-daw-text-tertiary rounded"
            >
              {tag}
            </span>
          ))}
          {preset.tags.length > 3 && (
            <span className="text-xs text-daw-text-tertiary">
              +{preset.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginPresetBrowser;