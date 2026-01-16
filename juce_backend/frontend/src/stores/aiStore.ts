import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  AISuggestion,
  AIExplanation,
  AIFeedback,
  AILearningMetrics,
  AIPreferences,
  AudioAnalysisData,
  CompositionContext,
  AISystemStatus,
  AIAgentState,
} from '@/types/ai';

interface AISuggestionHistory {
  suggestion: AISuggestion;
  feedback?: AIFeedback;
  applied: boolean;
  timestamp: number;
}

interface AIState {
  // Current suggestions
  suggestions: AISuggestion[];
  activeSuggestion: AISuggestion | null;
  
  // Explanations
  explanations: Record<string, AIExplanation>;
  
  // User feedback and learning
  feedback: AIFeedback[];
  learningMetrics: AILearningMetrics;
  preferences: AIPreferences;
  
  // History
  suggestionHistory: AISuggestionHistory[];
  
  // System status
  systemStatus: AISystemStatus;
  
  // Current analysis data
  currentAnalysis: AudioAnalysisData | null;
  compositionContext: CompositionContext | null;
  
  // UI state
  showSuggestionPanel: boolean;
  showExplanationPanel: boolean;
  showLearningDashboard: boolean;
  selectedSuggestionId: string | null;
  
  // Actions - Suggestions
  addSuggestion: (suggestion: AISuggestion) => void;
  removeSuggestion: (suggestionId: string) => void;
  updateSuggestion: (suggestionId: string, updates: Partial<AISuggestion>) => void;
  acceptSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  applySuggestion: (suggestionId: string) => void;
  setActiveSuggestion: (suggestion: AISuggestion | null) => void;
  clearSuggestions: () => void;
  
  // Actions - Explanations
  addExplanation: (explanation: AIExplanation) => void;
  getExplanation: (suggestionId: string) => AIExplanation | null;
  
  // Actions - Feedback and Learning
  submitFeedback: (feedback: AIFeedback) => void;
  updateLearningMetrics: (metrics: Partial<AILearningMetrics>) => void;
  updatePreferences: (preferences: Partial<AIPreferences>) => void;
  
  // Actions - System Status
  updateSystemStatus: (status: Partial<AISystemStatus>) => void;
  updateAgentState: (agentType: string, state: Partial<AIAgentState>) => void;
  
  // Actions - Analysis Data
  updateAnalysisData: (data: AudioAnalysisData) => void;
  updateCompositionContext: (context: CompositionContext) => void;
  
  // Actions - UI
  toggleSuggestionPanel: () => void;
  toggleExplanationPanel: () => void;
  toggleLearningDashboard: () => void;
  selectSuggestion: (suggestionId: string | null) => void;
  
  // Actions - History
  getSuggestionHistory: (limit?: number) => AISuggestionHistory[];
  clearHistory: () => void;
  
  // Actions - Utilities
  getSuggestionsByType: (type: AISuggestion['type']) => AISuggestion[];
  getSuggestionsByAgent: (agentType: AISuggestion['agentType']) => AISuggestion[];
  getHighConfidenceSuggestions: (threshold?: number) => AISuggestion[];
}

const initialPreferences: AIPreferences = {
  userId: '', // Will be set when user logs in
  suggestionFrequency: 'medium',
  explanationLevel: 'intermediate',
  autoApplyHighConfidence: false,
  confidenceThreshold: 0.8,
  preferredAgents: [],
  disabledSuggestionTypes: [],
  learningEnabled: true,
};

const initialLearningMetrics: AILearningMetrics = {
  totalSuggestions: 0,
  acceptedSuggestions: 0,
  rejectedSuggestions: 0,
  averageConfidence: 0,
  averageRating: 0,
  improvementTrend: 0,
  lastUpdated: Date.now(),
};

const initialSystemStatus: AISystemStatus = {
  isConnected: false,
  agents: {},
  lastHeartbeat: 0,
  processingQueue: 0,
  systemLoad: 0,
};

export const useAIStore = create<AIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        suggestions: [],
        activeSuggestion: null,
        explanations: {},
        feedback: [],
        learningMetrics: initialLearningMetrics,
        preferences: initialPreferences,
        suggestionHistory: [],
        systemStatus: initialSystemStatus,
        currentAnalysis: null,
        compositionContext: null,
        showSuggestionPanel: true,
        showExplanationPanel: false,
        showLearningDashboard: false,
        selectedSuggestionId: null,

        // Suggestion actions
        addSuggestion: (suggestion: AISuggestion) => {
          set(
            state => {
              // Check if suggestion already exists
              const existingIndex = state.suggestions.findIndex(s => s.id === suggestion.id);
              
              if (existingIndex >= 0) {
                // Update existing suggestion
                const updatedSuggestions = [...state.suggestions];
                updatedSuggestions[existingIndex] = suggestion;
                return { suggestions: updatedSuggestions };
              } else {
                // Add new suggestion
                return { suggestions: [...state.suggestions, suggestion] };
              }
            },
            false,
            'ai/addSuggestion'
          );
          
          // Update learning metrics
          const metrics = get().learningMetrics;
          get().updateLearningMetrics({
            totalSuggestions: metrics.totalSuggestions + 1,
            averageConfidence: (metrics.averageConfidence * metrics.totalSuggestions + suggestion.confidence) / (metrics.totalSuggestions + 1),
            lastUpdated: Date.now(),
          });
        },

        removeSuggestion: (suggestionId: string) => {
          set(
            state => ({
              suggestions: state.suggestions.filter(s => s.id !== suggestionId),
              activeSuggestion: state.activeSuggestion?.id === suggestionId ? null : state.activeSuggestion,
              selectedSuggestionId: state.selectedSuggestionId === suggestionId ? null : state.selectedSuggestionId,
            }),
            false,
            'ai/removeSuggestion'
          );
        },

        updateSuggestion: (suggestionId: string, updates: Partial<AISuggestion>) => {
          set(
            state => ({
              suggestions: state.suggestions.map(s =>
                s.id === suggestionId ? { ...s, ...updates } : s
              ),
              activeSuggestion: state.activeSuggestion?.id === suggestionId
                ? { ...state.activeSuggestion, ...updates }
                : state.activeSuggestion,
            }),
            false,
            'ai/updateSuggestion'
          );
        },

        acceptSuggestion: (suggestionId: string) => {
          const suggestion = get().suggestions.find(s => s.id === suggestionId);
          if (!suggestion) return;

          get().updateSuggestion(suggestionId, { status: 'accepted' });
          
          // Add to history
          set(
            state => ({
              suggestionHistory: [
                ...state.suggestionHistory,
                {
                  suggestion: { ...suggestion, status: 'accepted' },
                  applied: false,
                  timestamp: Date.now(),
                },
              ],
            }),
            false,
            'ai/acceptSuggestion'
          );

          // Update learning metrics
          const metrics = get().learningMetrics;
          get().updateLearningMetrics({
            acceptedSuggestions: metrics.acceptedSuggestions + 1,
            lastUpdated: Date.now(),
          });
        },

        rejectSuggestion: (suggestionId: string) => {
          const suggestion = get().suggestions.find(s => s.id === suggestionId);
          if (!suggestion) return;

          get().updateSuggestion(suggestionId, { status: 'rejected' });
          
          // Add to history
          set(
            state => ({
              suggestionHistory: [
                ...state.suggestionHistory,
                {
                  suggestion: { ...suggestion, status: 'rejected' },
                  applied: false,
                  timestamp: Date.now(),
                },
              ],
            }),
            false,
            'ai/rejectSuggestion'
          );

          // Update learning metrics
          const metrics = get().learningMetrics;
          get().updateLearningMetrics({
            rejectedSuggestions: metrics.rejectedSuggestions + 1,
            lastUpdated: Date.now(),
          });
        },

        applySuggestion: (suggestionId: string) => {
          const suggestion = get().suggestions.find(s => s.id === suggestionId);
          if (!suggestion) return;

          get().updateSuggestion(suggestionId, { status: 'applied' });
          
          // Update history
          set(
            state => ({
              suggestionHistory: state.suggestionHistory.map(h =>
                h.suggestion.id === suggestionId
                  ? { ...h, applied: true, timestamp: Date.now() }
                  : h
              ),
            }),
            false,
            'ai/applySuggestion'
          );
        },

        setActiveSuggestion: (suggestion: AISuggestion | null) => {
          set(
            () => ({ activeSuggestion: suggestion }),
            false,
            'ai/setActiveSuggestion'
          );
        },

        clearSuggestions: () => {
          set(
            () => ({
              suggestions: [],
              activeSuggestion: null,
              selectedSuggestionId: null,
            }),
            false,
            'ai/clearSuggestions'
          );
        },

        // Explanation actions
        addExplanation: (explanation: AIExplanation) => {
          set(
            state => ({
              explanations: {
                ...state.explanations,
                [explanation.suggestionId]: explanation,
              },
            }),
            false,
            'ai/addExplanation'
          );
        },

        getExplanation: (suggestionId: string) => {
          return get().explanations[suggestionId] || null;
        },

        // Feedback and learning actions
        submitFeedback: (feedback: AIFeedback) => {
          set(
            state => ({
              feedback: [...state.feedback, feedback],
              suggestionHistory: state.suggestionHistory.map(h =>
                h.suggestion.id === feedback.suggestionId
                  ? { ...h, feedback }
                  : h
              ),
            }),
            false,
            'ai/submitFeedback'
          );

          // Update learning metrics
          const metrics = get().learningMetrics;
          const allRatings = [...get().feedback, feedback].map(f => f.rating);
          const averageRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
          
          get().updateLearningMetrics({
            averageRating,
            lastUpdated: Date.now(),
          });
        },

        updateLearningMetrics: (metrics: Partial<AILearningMetrics>) => {
          set(
            state => ({
              learningMetrics: { ...state.learningMetrics, ...metrics },
            }),
            false,
            'ai/updateLearningMetrics'
          );
        },

        updatePreferences: (preferences: Partial<AIPreferences>) => {
          set(
            state => ({
              preferences: { ...state.preferences, ...preferences },
            }),
            false,
            'ai/updatePreferences'
          );
        },

        // System status actions
        updateSystemStatus: (status: Partial<AISystemStatus>) => {
          set(
            state => ({
              systemStatus: { ...state.systemStatus, ...status },
            }),
            false,
            'ai/updateSystemStatus'
          );
        },

        updateAgentState: (agentType: string, agentState: Partial<AIAgentState>) => {
          set(
            state => ({
              systemStatus: {
                ...state.systemStatus,
                agents: {
                  ...state.systemStatus.agents,
                  [agentType]: {
                    ...state.systemStatus.agents[agentType],
                    ...agentState,
                  },
                },
              },
            }),
            false,
            'ai/updateAgentState'
          );
        },

        // Analysis data actions
        updateAnalysisData: (data: AudioAnalysisData) => {
          set(
            state => ({ currentAnalysis: data }),
            false,
            'ai/updateAnalysisData'
          );
        },

        updateCompositionContext: (context: CompositionContext) => {
          set(
            state => ({ compositionContext: context }),
            false,
            'ai/updateCompositionContext'
          );
        },

        // UI actions
        toggleSuggestionPanel: () => {
          set(
            state => ({ showSuggestionPanel: !state.showSuggestionPanel }),
            false,
            'ai/toggleSuggestionPanel'
          );
        },

        toggleExplanationPanel: () => {
          set(
            state => ({ showExplanationPanel: !state.showExplanationPanel }),
            false,
            'ai/toggleExplanationPanel'
          );
        },

        toggleLearningDashboard: () => {
          set(
            state => ({ showLearningDashboard: !state.showLearningDashboard }),
            false,
            'ai/toggleLearningDashboard'
          );
        },

        selectSuggestion: (suggestionId: string | null) => {
          set(
            state => ({ selectedSuggestionId: suggestionId }),
            false,
            'ai/selectSuggestion'
          );
        },

        // History actions
        getSuggestionHistory: (limit = 50) => {
          return get().suggestionHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        },

        clearHistory: () => {
          set(
            state => ({ suggestionHistory: [] }),
            false,
            'ai/clearHistory'
          );
        },

        // Utility actions
        getSuggestionsByType: (type: AISuggestion['type']) => {
          return get().suggestions.filter(s => s.type === type);
        },

        getSuggestionsByAgent: (agentType: AISuggestion['agentType']) => {
          return get().suggestions.filter(s => s.agentType === agentType);
        },

        getHighConfidenceSuggestions: (threshold = 0.8) => {
          return get().suggestions.filter(s => s.confidence >= threshold);
        },
      }),
      {
        name: 'daw-ai-store',
        partialize: state => ({
          preferences: state.preferences,
          learningMetrics: state.learningMetrics,
          suggestionHistory: state.suggestionHistory.slice(-100), // Keep last 100 items
        }),
      }
    ),
    { name: 'AIStore' }
  )
);