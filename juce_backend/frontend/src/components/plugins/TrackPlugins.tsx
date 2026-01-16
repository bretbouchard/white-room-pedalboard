/**
 * Track Plugins Component
 *
 * Displays the plugins assigned to a specific track in a compact format
 * suitable for the channel strip view.
 */

import React, { useState } from 'react';
import { cn } from '@/utils';
import { usePluginStore } from '@/stores/pluginStore';
import { PluginIcon } from './PluginIcon';
import Button from '@/components/ui/Button';
import type { PluginInstance } from '@/types/plugins';

export interface TrackPluginsProps {
  trackId: string;
  className?: string;
  maxVisible?: number;
  showCompact?: boolean;
  allowBypass?: boolean;
  onPluginClick?: (plugin: PluginInstance) => void;
  onPluginRemove?: (pluginId: string) => void;
}

const TrackPlugins: React.FC<TrackPluginsProps> = ({
  trackId,
  className,
  maxVisible = 3,
  showCompact = true,
  allowBypass = true,
  onPluginClick,
  onPluginRemove,
}) => {
  const [showAll, setShowAll] = useState(false);
  const {
    getTrackPlugins,
    bypassPlugin,
    removePluginInstance,
  } = usePluginStore();

  const trackPlugins = getTrackPlugins(trackId);

  if (!trackPlugins || trackPlugins.length === 0) {
    return (
      <div className={cn(
        'text-center text-daw-text-tertiary text-xs',
        className
      )}>
        {showCompact ? (
          <div className="py-1">
            <div className="w-8 h-8 mx-auto mb-1 rounded bg-daw-surface-tertiary flex items-center justify-center">
              <span className="text-lg">⊕</span>
            </div>
            <div>No Plugins</div>
          </div>
        ) : (
          <div className="py-2 text-center">
            <div className="text-daw-text-secondary mb-1">No plugins assigned</div>
            <Button size="sm" variant="secondary" className="text-xs">
              Add Plugin
            </Button>
          </div>
        )}
      </div>
    );
  }

  const displayPlugins = showAll ? trackPlugins : trackPlugins.slice(0, maxVisible);
  const hasMore = trackPlugins.length > maxVisible;

  const handlePluginBypass = (pluginId: string, bypassed: boolean) => {
    if (allowBypass) {
      bypassPlugin(pluginId, bypassed);
    }
  };

  const handlePluginRemove = (pluginId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPluginRemove) {
      onPluginRemove(pluginId);
    } else {
      removePluginInstance(trackId, pluginId);
    }
  };

  const handlePluginClick = (plugin: PluginInstance, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPluginClick) {
      onPluginClick(plugin);
    }
  };

  if (showCompact) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="text-xs text-daw-text-secondary text-center">PLUGINS</div>
        <div className="flex flex-col space-y-1">
          {displayPlugins.map((plugin) => (
            <div
              key={plugin.instance_id}
              className={cn(
                'relative group cursor-pointer transition-all duration-150',
                plugin.is_bypassed && 'opacity-50'
              )}
              onClick={(e) => handlePluginClick(plugin, e)}
              title={`${plugin.plugin_metadata.name} - ${plugin.plugin_metadata.manufacturer}`}
            >
              {/* Plugin Icon */}
              <div className="flex justify-center mb-1">
                <PluginIcon
                  category={plugin.plugin_metadata.category}
                  size={20}
                  customIconData={plugin.plugin_metadata.icon_data}
                  customIconUrl={plugin.plugin_metadata.icon_url}
                  fallbackToDefault={true}
                  className={cn(
                    'transition-all duration-150',
                    plugin.is_active && !plugin.is_bypassed && 'scale-110'
                  )}
                />
              </div>

              {/* Plugin Status Indicator */}
              <div className="flex justify-center">
                <div className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  plugin.state === 'error' || plugin.state === 'crashed'
                    ? 'bg-red-500'
                    : plugin.is_bypassed || !plugin.is_active
                    ? 'bg-daw-surface-tertiary'
                    : plugin.state === 'loading'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-green-500'
                )} />
              </div>

              {/* Hover Controls */}
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  {allowBypass && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePluginBypass(plugin.instance_id, !plugin.is_bypassed);
                      }}
                      className={cn(
                        'w-4 h-4 rounded text-xs flex items-center justify-center transition-colors',
                        plugin.is_bypassed
                          ? 'bg-yellow-500 text-black'
                          : 'bg-daw-surface-tertiary text-daw-text-secondary hover:bg-daw-surface-tertiary'
                      )}
                      title={plugin.is_bypassed ? 'Enable plugin' : 'Bypass plugin'}
                    >
                      {plugin.is_bypassed ? '◯' : '◉'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-daw-text-secondary hover:text-daw-text-primary py-1"
              title={showAll ? 'Show fewer' : `Show ${trackPlugins.length - maxVisible} more`}
            >
              {showAll ? '▲' : `+${trackPlugins.length - maxVisible}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-daw-text-secondary font-medium">
          PLUGINS ({trackPlugins.length})
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="text-xs h-6 px-2"
          onClick={() => {}} // Would open plugin browser
        >
          + Add
        </Button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {displayPlugins.map((plugin) => (
          <div
            key={plugin.instance_id}
            className={cn(
              'flex items-center space-x-2 p-2 rounded border cursor-pointer transition-all duration-150',
              'border-daw-surface-tertiary bg-daw-surface-primary',
              'hover:border-daw-accent-primary hover:bg-daw-surface-secondary',
              plugin.is_bypassed && 'opacity-50',
              plugin.state === 'error' && 'border-red-500 bg-red-50'
            )}
            onClick={(e) => handlePluginClick(plugin, e)}
          >
            {/* Plugin Icon */}
            <PluginIcon
              category={plugin.plugin_metadata.category}
              size={24}
              customIconData={plugin.plugin_metadata.icon_data}
              customIconUrl={plugin.plugin_metadata.icon_url}
              fallbackToDefault={true}
            />

            {/* Plugin Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-daw-text-primary truncate">
                {plugin.plugin_metadata.name}
              </div>
              <div className="text-xs text-daw-text-secondary truncate">
                {plugin.plugin_metadata.manufacturer}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                plugin.state === 'error' || plugin.state === 'crashed'
                  ? 'bg-red-500'
                  : plugin.is_bypassed || !plugin.is_active
                  ? 'bg-daw-surface-tertiary'
                  : plugin.state === 'loading'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-green-500'
              )} />

              {/* Controls */}
              {allowBypass && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePluginBypass(plugin.instance_id, !plugin.is_bypassed);
                  }}
                  className={cn(
                    'w-5 h-5 rounded text-xs flex items-center justify-center',
                    plugin.is_bypassed
                      ? 'bg-yellow-500 text-black'
                      : 'bg-daw-surface-tertiary text-daw-text-secondary hover:bg-daw-surface-tertiary'
                  )}
                  title={plugin.is_bypassed ? 'Enable plugin' : 'Bypass plugin'}
                >
                  {plugin.is_bypassed ? '◯' : '◉'}
                </button>
              )}

              <button
                onClick={(e) => handlePluginRemove(plugin.instance_id, e)}
                className="w-5 h-5 rounded text-xs flex items-center justify-center bg-daw-surface-tertiary text-daw-text-secondary hover:bg-red-500 hover:text-white transition-colors"
                title="Remove plugin"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-daw-text-secondary hover:text-daw-text-primary w-full py-1 text-center"
        >
          {showAll ? 'Show fewer' : `Show ${trackPlugins.length - maxVisible} more plugins`}
        </button>
      )}
    </div>
  );
};

export default TrackPlugins;