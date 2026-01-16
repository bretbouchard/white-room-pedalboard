/**
 * DAID (Digital Audio Identification and Documentation) types for provenance tracking
 */

export enum EntityType {
  TRACK = 'track',
  PLUGIN = 'plugin',
  PARAMETER = 'parameter',
  AUTOMATION = 'automation',
  PROJECT = 'project',
  AUDIO_FILE = 'audio_file',
  MIDI_DATA = 'midi_data',
  MIX = 'mix',
  ANALYSIS = 'analysis',
  AI_SUGGESTION = 'ai_suggestion',
  USER_ACTION = 'user_action',
  COMPOSITION = 'composition',
  PATTERN = 'pattern'
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  TRANSFORM = 'transform',
  ANALYZE = 'analyze',
  PROCESS = 'process',
  EXPORT = 'export',
  IMPORT = 'import',
  AI_DECISION = 'ai_decision',
  USER_INTERACTION = 'user_interaction'
}

export interface DAIDRecord {
  daid: string;
  entity_type: EntityType;
  entity_id: string;
  operation: OperationType;
  operation_metadata: Record<string, any>;
  
  // Provenance chain information
  parent_daids: string[];
  depth: number;
  
  // User and system context
  user_id?: string;
  system_component: string;
  
  // Timestamps and integrity
  created_at: string;
  content_hash: string;
  signature?: string;
  
  // Additional metadata
  tags: string[];
  privacy_level: string;
}

export interface ProvenanceChain {
  entity_type: EntityType;
  entity_id: string;
  chain_length: number;
  provenance_chain: DAIDRecord[];
  
  // Chain metadata
  created_at: string;
  last_updated: string;
  
  // Integrity verification
  chain_hash: string;
}

export interface DAIDQuery {
  entity_type?: EntityType;
  entity_id?: string;
  operation?: OperationType;
  user_id?: string;
  system_component?: string;
  
  // Time range
  created_after?: string;
  created_before?: string;
  
  // Provenance chain filters
  min_depth?: number;
  max_depth?: number;
  parent_daid?: string;
  
  // Metadata filters
  tags?: string[];
  privacy_level?: string;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DAIDValidationResult {
  is_valid: boolean;
  validation_errors: string[];
  integrity_check_passed: boolean;
  chain_consistency_passed: boolean;
  
  // Performance metrics
  validation_time_ms: number;
  records_validated: number;
}

export interface ProvenanceVisualizationNode {
  id: string;
  daid: string;
  entity_type: EntityType;
  entity_id: string;
  operation: OperationType;
  timestamp: string;
  user_id?: string;
  depth: number;
  
  // Visualization properties
  x: number;
  y: number;
  color: string;
  size: number;
  
  // Metadata for display
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export interface ProvenanceVisualizationEdge {
  id: string;
  source: string;
  target: string;
  type: 'parent' | 'child' | 'sibling';
  
  // Visualization properties
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface ProvenanceVisualization {
  nodes: ProvenanceVisualizationNode[];
  edges: ProvenanceVisualizationEdge[];
  
  // Layout information
  width: number;
  height: number;
  scale: number;
  
  // Interaction state
  selected_node?: string;
  highlighted_path?: string[];
  filter_options: {
    entity_types: EntityType[];
    operations: OperationType[];
    time_range: {
      start: string;
      end: string;
    };
    users: string[];
  };
}

export interface ProvenanceExportOptions {
  format: 'json' | 'csv' | 'xml' | 'pdf';
  include_metadata: boolean;
  anonymize: boolean;
  include_integrity_proof: boolean;
  compression: boolean;
}

export interface ProvenancePrivacySettings {
  default_privacy_level: 'private' | 'shared' | 'public';
  allow_anonymization: boolean;
  retention_days: number;
  auto_delete_enabled: boolean;
  
  // Granular tracking controls
  track_user_actions: boolean;
  track_ai_decisions: boolean;
  track_parameter_changes: boolean;
  track_project_operations: boolean;
  
  // Sharing controls
  allow_provenance_sharing: boolean;
  require_explicit_consent: boolean;
  anonymize_shared_data: boolean;
}

export interface DAIDSearchResult {
  records: DAIDRecord[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
  
  // Search metadata
  query_time_ms: number;
  filters_applied: string[];
  sort_applied: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface ProvenanceInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  
  // Supporting data
  affected_entities: string[];
  time_range: {
    start: string;
    end: string;
  };
  
  // Visualization data
  chart_data?: any;
  
  // Actions
  suggested_actions: {
    action: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }[];
}

export interface DAIDIntegrationConfig {
  enabled: boolean;
  server_url: string;
  api_key?: string;
  
  // Tracking configuration
  batch_size: number;
  batch_timeout_ms: number;
  auto_flush_enabled: boolean;
  
  // Privacy settings
  privacy_settings: ProvenancePrivacySettings;
  
  // Performance settings
  cache_enabled: boolean;
  cache_ttl_minutes: number;
  validation_enabled: boolean;
  
  // UI settings
  show_provenance_indicators: boolean;
  enable_provenance_tooltips: boolean;
  visualization_theme: 'light' | 'dark' | 'auto';
}

// WebSocket message types for DAID integration
export interface DAIDWebSocketMessage {
  type: 'daid.provenance.created' | 'daid.chain.updated' | 'daid.validation.result';
  data: {
    daid?: string;
    entity_type?: EntityType;
    entity_id?: string;
    operation?: OperationType;
    validation_result?: DAIDValidationResult;
    chain_update?: {
      added_records: number;
      updated_records: number;
    };
  };
}

// React component props interfaces
export interface ProvenanceTimelineProps {
  entity_type: EntityType;
  entity_id: string;
  max_depth?: number;
  show_ai_operations?: boolean;
  show_user_actions?: boolean;
  interactive?: boolean;
  height?: number;
  onRecordSelect?: (record: DAIDRecord) => void;
}

export interface ProvenanceGraphProps {
  provenance_chain: ProvenanceChain;
  layout?: 'hierarchical' | 'force' | 'circular';
  show_metadata?: boolean;
  interactive?: boolean;
  width?: number;
  height?: number;
  onNodeClick?: (node: ProvenanceVisualizationNode) => void;
  onEdgeClick?: (edge: ProvenanceVisualizationEdge) => void;
}

export interface ProvenanceInspectorProps {
  record: DAIDRecord;
  show_raw_data?: boolean;
  show_integrity_info?: boolean;
  editable?: boolean;
  onUpdate?: (updated_record: DAIDRecord) => void;
}

export interface ProvenanceSearchProps {
  initial_query?: DAIDQuery;
  show_advanced_filters?: boolean;
  max_results?: number;
  onResultSelect?: (record: DAIDRecord) => void;
  onQueryChange?: (query: DAIDQuery) => void;
}

export interface ProvenancePrivacyControlsProps {
  settings: ProvenancePrivacySettings;
  editable?: boolean;
  show_compliance_info?: boolean;
  onSettingsChange?: (settings: ProvenancePrivacySettings) => void;
}