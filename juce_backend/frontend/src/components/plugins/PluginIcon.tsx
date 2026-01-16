/**
 * Plugin Icon Component
 *
 * Provides standardized icons for different plugin categories using Lucide React icons
 * Supports custom icons, extracted icons, and default category-based icons
 */

import React from 'react';
import {
  // Audio processing icons
  Sliders,
  Volume2,
  VolumeX,
  Activity,
  BarChart3,

  // Effects icons
  Waves,
  Radio,
  Zap,
  Wind,
  Shuffle,

  // Synthesis icons
  Piano,
  Music,
  Drum,
  Guitar,

  // Utility icons
  Settings,
  Package,

  // Generic icons
  Star,
  Zap as Lightning
} from 'lucide-react';

import type { PluginCategory } from '@/types/plugins';

export interface PluginIconProps {
  category: PluginCategory;
  size?: number | string;
  className?: string;
  color?: string;
  customIconUrl?: string;
  customIconData?: string;
  fallbackToDefault?: boolean;
}

// Category to icon mapping
const CATEGORY_ICONS: Record<PluginCategory, React.ComponentType<any>> = {
  eq: Sliders,
  compressor: Activity,
  limiter: VolumeX,
  gate: Volume2,
  expander: Volume2,
  reverb: Waves,
  delay: Radio,
  chorus: Shuffle,
  flanger: Wind,
  phaser: Zap,
  distortion: Lightning,
  saturation: Activity,
  filter: Sliders,
  modulation: Shuffle,
  pitch: Music,
  utility: Settings,
  analyzer: BarChart3,
  synthesizer: Piano,
  sampler: Package,
  drum_machine: Drum,
  bass: Guitar,
  guitar: Guitar,
  piano: Piano,
  orchestral: Music,
  vintage: Star,
  channel_strip: Sliders
};

// Category to color mapping
const CATEGORY_COLORS: Record<PluginCategory, string> = {
  eq: '#3B82F6',
  compressor: '#EF4444',
  limiter: '#DC2626',
  gate: '#F59E0B',
  expander: '#F59E0B',
  reverb: '#8B5CF6',
  delay: '#06B6D4',
  chorus: '#10B981',
  flanger: '#10B981',
  phaser: '#8B5CF6',
  distortion: '#EF4444',
  saturation: '#F97316',
  filter: '#3B82F6',
  modulation: '#8B5CF6',
  pitch: '#06B6D4',
  utility: '#6B7280',
  analyzer: '#3B82F6',
  synthesizer: '#10B981',
  sampler: '#F59E0B',
  drum_machine: '#EF4444',
  bass: '#F97316',
  guitar: '#F59E0B',
  piano: '#06B6D4',
  orchestral: '#8B5CF6',
  vintage: '#F59E0B',
  channel_strip: '#6B7280'
};

/**
 * Plugin Icon Component
 */
export const PluginIcon: React.FC<PluginIconProps> = ({
  category,
  size = 24,
  className = '',
  color,
  customIconUrl,
  customIconData,
  fallbackToDefault = true
}) => {
  const IconComponent = CATEGORY_ICONS[category];
  const finalColor = color || CATEGORY_COLORS[category] || '#6B7280';

  // If custom icon data is provided, render it
  if (customIconData) {
    return (
      <img
        src={`data:image/svg+xml;base64,${customIconData}`}
        alt={`${category} icon`}
        className={className}
        style={{
          width: size,
          height: size
        }}
      />
    );
  }

  // If custom icon URL is provided, render it
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={`${category} icon`}
        className={className}
        style={{
          width: size,
          height: size
        }}
      />
    );
  }

  // If no icon component available and fallback is disabled, render nothing
  if (!IconComponent && !fallbackToDefault) {
    return null;
  }

  // Render the category icon or fallback
  const FinalIconComponent = IconComponent || Package;

  return (
    <FinalIconComponent
      className={className}
      size={typeof size === 'number' ? size : parseInt(size) || 24}
      style={{
        width: size,
        height: size,
        color: finalColor
      }}
    />
  );
};

export default PluginIcon;