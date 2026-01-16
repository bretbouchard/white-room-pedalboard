/**
 * Plugin Slot Component
 *
 * Individual plugin slot for channel strips with minimal footprint
 */

import React from 'react';
import { cn } from '@/utils';
import { usePluginStore } from '@/stores/pluginStore';
import { PluginIcon } from './PluginIcon';
import type { PluginInstance } from '@/types/plugins';

export interface PluginSlotProps {
  plugin: PluginInstance;
  trackId: string;
  isActive?: boolean;
  showBypass?: boolean;
  onSlotClick?: (plugin: PluginInstance) => void;
  onBypassToggle?: (pluginId: string, bypassed: boolean) => void;
  className?: string;
}

const PluginSlot: React.FC<PluginSlotProps> = ({
  plugin,
  trackId,
  isActive = false,
  showBypass = true,
  onSlotClick,
  onBypassToggle,
  className,
}) => {
  const { bypassPlugin } = usePluginStore();

  const handleSlotClick = () => {
    if (onSlotClick) {
      onSlotClick(plugin);
    }
  };

  const handleBypassToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBypassToggle) {
      onBypassToggle(plugin.instance_id, !plugin.is_bypassed);
    } else {
      bypassPlugin(plugin.instance_id, !plugin.is_bypassed);
    }
  };

  const getPluginStatusColor = () => {
    if (plugin.state === 'error' || plugin.state === 'crashed') return 'border-red-500';
    if (plugin.is_bypassed) return 'border-daw-surface-tertiary bg-daw-surface-tertiary';
    if (isActive) return 'border-daw-accent-primary bg-daw-surface-secondary';
    return 'border-daw-surface-tertiary bg-daw-surface-primary';
  };

  const getStatusIndicator = () => {
    if (plugin.state === 'loading') return 'animate-pulse bg-yellow-500';
    if (plugin.state === 'error' || plugin.state === 'crashed') return 'bg-red-500';
    if (plugin.is_bypassed) return 'bg-daw-surface-tertiary';
    return 'bg-green-500';
  };

  return (
    <div
      className={cn(
        'relative group cursor-pointer transition-all duration-150',
        'border rounded p-2 hover:shadow-sm',
        getPluginStatusColor(),
        className
      )}
      onClick={handleSlotClick}
      title={`${plugin.plugin_metadata.name} - ${plugin.plugin_metadata.manufacturer}`}
    >
      {/* Plugin Icon */}
      <div className="flex justify-center mb-1">
        <PluginIcon
          category={plugin.plugin_metadata.category}
          size={24}
          customIconData={plugin.plugin_metadata.icon_data}
          customIconUrl={plugin.plugin_metadata.icon_url}
          fallbackToDefault={true}
        />
      </div>

      {/* Plugin Name */}
      <div className="text-xs text-daw-text-primary text-center truncate font-medium">
        {plugin.plugin_metadata.name.length > 12
          ? plugin.plugin_metadata.name.substring(0, 12) + '...'
          : plugin.plugin_metadata.name
        }
      </div>

      {/* Status Indicator */}
      <div className="flex justify-center mt-1">
        <div className={cn('w-1.5 h-1.5 rounded-full', getStatusIndicator())} />
      </div>

      {/* Hover Bypass Button */}
      {showBypass && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBypassToggle}
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
        </div>
      )}

      {/* Bypass Overlay */}
      {plugin.is_bypassed && (
        <div className="absolute inset-0 bg-daw-surface-tertiary bg-opacity-50 rounded flex items-center justify-center">
          <span className="text-xs text-daw-text-secondary font-medium">BYPASSED</span>
        </div>
      )}
    </div>
  );
};

export default PluginSlot;