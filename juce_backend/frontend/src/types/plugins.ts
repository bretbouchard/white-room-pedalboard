// Plugin-related type definitions for the frontend

export type PluginFormat = 'VST3' | 'AU' | 'AAX' | 'WAM' | 'CLAP' | 'LV2';

export type PluginCategory = 
  | 'eq'
  | 'compressor'
  | 'limiter'
  | 'gate'
  | 'expander'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'flanger'
  | 'phaser'
  | 'distortion'
  | 'saturation'
  | 'filter'
  | 'modulation'
  | 'pitch'
  | 'utility'
  | 'analyzer'
  | 'synthesizer'
  | 'sampler'
  | 'drum_machine'
  | 'bass'
  | 'guitar'
  | 'piano'
  | 'orchestral'
  | 'vintage'
  | 'channel_strip';

export type PluginState = 
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'active'
  | 'bypassed'
  | 'error'
  | 'crashed';

export type ParameterType = 'continuous' | 'discrete' | 'boolean' | 'enum' | 'meter' | 'trigger';

export type ParameterUnit = '' | 'dB' | 'Hz' | 'kHz' | '%' | 's' | 'ms' | 'beats' | 'notes' | 'st' | 'cents' | 'bpm' | 'deg' | 'ratio' | 'pan';

export interface ParameterGroup {
  name: string;
  display_name: string;
  parameters: string[];
  is_collapsed: boolean;
}

export interface EnhancedParameterMetadata {
  // Basic identification
  id: string;
  name: string;
  display_name: string;
  short_name?: string;
  description?: string;

  // Value properties
  value: number;
  default_value: number;
  min_value: number;
  max_value: number;

  // Type and behavior
  parameter_type: ParameterType;
  is_automatable: boolean;
  is_periodic: boolean;
  is_bipolar: boolean;

  // Units and display
  unit: ParameterUnit;
  unit_label?: string;
  step_size: number;

  // Categorization
  group?: string;
  category?: string;
  tags: string[];

  // Additional metadata
  parameter_index?: number;
  midi_cc?: number;
  cv_enabled: boolean;

  // Normalized values (0-1)
  normalized_value: number;
  normalized_default: number;
}

export interface PluginParameter {
  name: string;
  display_name: string;
  value: number;
  min_value: number;
  max_value: number;
  default_value: number;
  unit?: string;
  is_automatable: boolean;
  parameter_type: string;
  normalized_value: number;

  // Enhanced metadata (optional for backward compatibility)
  short_name?: string;
  description?: string;
  is_periodic?: boolean;
  is_bipolar?: boolean;
  step_size?: number;
  group?: string;
  category?: string;
  tags?: string[];
  parameter_index?: number;
  midi_cc?: number;
  cv_enabled?: boolean;
}

export interface EnhancedParameterDiscoveryResult {
  parameters: Record<string, EnhancedParameterMetadata>;
  groups: Record<string, ParameterGroup>;
  discovery_info: {
    parameter_count: number;
    discovery_time_seconds: number;
    plugin_format: PluginFormat;
  };
}

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ValidationIssue {
  parameter_name: string;
  issue_type: string;
  severity: ValidationSeverity;
  message: string;
  suggested_value?: number;
  suggested_min?: number;
  suggested_max?: number;
}

export interface ParameterValidationResult {
  is_valid: boolean;
  issues: ValidationIssue[];
  corrected_parameters: Record<string, number>;
  summary: {
    warnings_count: number;
    errors_count: number;
    critical_count: number;
  };
}

export interface PluginPreset {
  name: string;
  description?: string;
  parameters: Record<string, number>;
  tags: string[];
  author?: string;
  created_at: string;
}

export interface PluginMetadata {
  // Basic identification
  name: string;
  manufacturer: string;
  version: string;
  unique_id: string;
  id: string; // Alias for unique_id for compatibility

  // Categorization
  category: PluginCategory;
  format: PluginFormat;
  tags: string[];

  // Technical specifications
  input_channels: number;
  output_channels: number;
  latency_samples: number;

  // Performance characteristics
  cpu_usage_estimate: number;
  memory_usage_mb: number;

  // Quality and ratings
  quality_rating: number;
  user_rating: number;

  // Compatibility
  supported_sample_rates: number[];
  supports_64bit: boolean;

  // Icon support
  icon_path?: string; // Local file path to plugin icon
  icon_url?: string; // Remote URL for plugin icon
  icon_data?: string; // Base64 encoded icon image data
  icon_type?: 'default' | 'custom' | 'extracted'; // Type of icon
  icon_color?: string; // Hex color for default icon styling
  custom_icon_assigned?: boolean; // Whether a custom icon has been manually assigned
}

export interface PluginInstance {
  // Instance identification
  instance_id: string;
  plugin_metadata: PluginMetadata;

  // Instance state
  state: PluginState;
  is_bypassed: boolean;

  // Parameters and presets
  parameters: Record<string, PluginParameter>;
  current_preset?: string;
  available_presets: PluginPreset[];

  // Performance monitoring
  cpu_usage: number;
  processing_time_ms: number;

  // Instance metadata
  created_at: string;
  last_used: string;

  // Computed properties
  is_active: boolean;
  latency_ms: number;
}

export interface PluginRecommendation {
  // User context
  clerk_user_id?: string;

  // Recommendation details
  plugin_id: string;
  plugin_name: string;
  plugin_category: PluginCategory;
  plugin_format: PluginFormat;

  // Recommendation scoring
  confidence: number;
  relevance_score: number;

  // Context and reasoning
  reasoning: string;
  style_context: string;
  audio_context?: string;

  // Alternative recommendations
  alternative_plugins: string[];

  // Recommendation metadata
  recommended_at: string;
  recommender_agent: string;

  // Computed properties
  overall_score: number;
}

export interface PluginChain {
  chain_id: string;
  name: string;
  plugins: PluginInstance[];
  is_active: boolean;

  // Chain-level controls
  input_gain: number;
  output_gain: number;

  // Computed properties
  total_latency_samples: number;
  estimated_cpu_usage: number;
}

export interface PluginSearchFilters {
  category?: PluginCategory;
  format?: PluginFormat;
  manufacturer?: string;
  tags?: string[];
  minRating?: number;
  maxCpuUsage?: number;
}

export interface PluginSearchResult {
  plugins: PluginMetadata[];
  total_count: number;
  recommendations?: PluginRecommendation[];
}

// WebSocket message types for plugin operations
export interface PluginSearchMessage {
  type: 'plugin.search';
  data: {
    query?: string;
    filters?: PluginSearchFilters;
    limit?: number;
    offset?: number;
  };
}

export interface PluginRecommendationMessage {
  type: 'plugin.recommendations';
  data: {
    trackId?: string;
    category?: PluginCategory;
    maxRecommendations?: number;
    context?: {
      style?: string;
      tempo?: number;
      key?: string;
    };
  };
}

export interface PluginAddMessage {
  type: 'plugin.add';
  data: {
    track_id: string;
    plugin_id: string;
    plugin_name?: string;
    position?: number;
  };
}

export interface PluginRemoveMessage {
  type: 'plugin.remove';
  data: {
    track_id: string;
    plugin_id: string;
  };
}

export interface PluginParameterMessage {
  type: 'plugin.parameter';
  data: {
    track_id: string;
    plugin_id: string;
    parameter_id: string;
    parameter_value: number;
  };
}

export interface PluginBypassMessage {
  type: 'plugin.bypass';
  data: {
    track_id: string;
    plugin_id: string;
    bypassed: boolean;
  };
}

export interface PluginPresetMessage {
  type: 'plugin.preset';
  data: {
    track_id: string;
    plugin_id: string;
    preset_name: string;
  };
}

export interface PluginChainReorderMessage {
  type: 'plugin.chain.reorder';
  data: {
    track_id: string;
    plugin_ids: string[];
  };
}

// Plugin performance metrics
export interface PluginPerformanceMetrics {
  session_id: string;
  plugin_instance_id: string;
  
  // Performance data
  cpu_usage_samples: number[];
  memory_usage_samples: number[];
  processing_time_samples: number[];
  sample_timestamps: string[];

  // Aggregated metrics
  avg_cpu_usage: number;
  max_cpu_usage: number;
  avg_memory_usage: number;
  max_memory_usage: number;
  avg_processing_time: number;
  max_processing_time: number;

  // Metrics metadata
  collection_started: string;
  last_updated: string;
  sample_count: number;
  collection_duration_minutes: number;
}

// Plugin state management
export interface PluginStateSnapshot {
  snapshot_id: string;
  session_id: string;
  plugin_instances: PluginInstance[];
  plugin_chains: PluginChain[];
  created_at: string;
  description?: string;
  tags: string[];
  total_plugins: number;
  active_plugins: number;
  estimated_cpu_usage: number;
}

export interface PluginSessionState {
  session_id: string;
  project_id?: string;
  current_plugins: PluginInstance[];
  current_chains: PluginChain[];
  snapshots: PluginStateSnapshot[];
  current_snapshot_index: number;
  created_at: string;
  last_modified: string;
  is_active: boolean;
  auto_save_enabled: boolean;
  auto_save_interval_seconds: number;
  max_undo_steps: number;
  
  // Computed properties
  total_plugins: number;
  active_plugins: number;
  can_undo: boolean;
  can_redo: boolean;
}