// AI-related type definitions

export interface AISuggestion {
  id: string;
  type: 'plugin' | 'eq' | 'compression' | 'reverb' | 'arrangement' | 'mixing';
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning: string;
  alternatives?: AISuggestion[];
  parameters?: Record<string, unknown>;
  targetTrackId?: string;
  targetPluginId?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'applied';
  agentType: 'eq_specialist' | 'dynamics_specialist' | 'spatial_specialist' | 'arrangement_specialist' | 'coordinator';
}

export interface AIExplanation {
  id: string;
  suggestionId: string;
  title: string;
  content: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  visualizations?: AIVisualization[];
  relatedConcepts?: string[];
  timestamp: number;
}

export interface AIVisualization {
  id: string;
  type: 'frequency_response' | 'waveform' | 'spectrum' | 'dynamics' | 'spatial';
  title: string;
  data: unknown; // Specific to visualization type
  annotations?: AIAnnotation[];
}

export interface AIAnnotation {
  id: string;
  type: 'highlight' | 'arrow' | 'text' | 'range';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  text?: string;
  color?: string;
}

export interface AIFeedback {
  suggestionId: string;
  rating: number; // 1-5 stars
  helpful: boolean;
  comment?: string;
  timestamp: number;
  userId: string;
}

export interface AILearningMetrics {
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  averageConfidence: number;
  averageRating: number;
  improvementTrend: number; // -1 to 1, negative means getting worse
  lastUpdated: number;
}

export interface AIPreferences {
  userId: string;
  suggestionFrequency: 'low' | 'medium' | 'high';
  explanationLevel: 'beginner' | 'intermediate' | 'advanced';
  autoApplyHighConfidence: boolean;
  confidenceThreshold: number; // 0-1
  preferredAgents: string[];
  disabledSuggestionTypes: string[];
  learningEnabled: boolean;
}

export interface AudioAnalysisData {
  spectral: {
    centroid: number;
    rolloff: number;
    flux: number;
    mfcc: number[];
  };
  dynamic: {
    rms: number;
    peak: number;
    dynamicRange: number;
    transientDensity: number;
  };
  harmonic: {
    pitch: number;
    harmonics: number[];
    inharmonicity: number;
  };
  perceptual: {
    loudness: number;
    brightness: number;
    warmth: number;
  };
  spatial: {
    stereoWidth: number;
    phaseCorrelation: number;
  };
  frequencyBalance: {
    bass: number;
    lowMid: number;
    mid: number;
    highMid: number;
    treble: number;
  };
}

export interface CompositionContext {
  tempo: number;
  key: string;
  timeSignature: [number, number];
  style: string;
  genre: string;
  mood: string;
  energy: number; // 0-1
  complexity: number; // 0-1
}

export interface AIAgentState {
  agentType: string;
  isActive: boolean;
  lastActivity: number;
  currentTask?: string;
  performance: {
    successRate: number;
    averageResponseTime: number;
    totalRequests: number;
  };
  memory: {
    recentDecisions: Array<{
      timestamp: number;
      decision: string;
      context: unknown;
    }>;
    userFeedback: AIFeedback[];
  };
}

export interface AISystemStatus {
  isConnected: boolean;
  agents: Record<string, AIAgentState>;
  lastHeartbeat: number;
  processingQueue: number;
  systemLoad: number; // 0-1
}