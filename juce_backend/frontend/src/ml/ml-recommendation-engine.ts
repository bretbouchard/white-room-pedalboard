import { useState, useEffect, useCallback } from 'react';
import type { FlowNode, FlowEdge, FlowNodeType } from '@/types/flow';
import { useFlowStore } from '@/stores/flowStore';
import WorkflowPatternModel, { WorkflowPattern, WorkflowFeatures } from './workflow-pattern-model';
import UserBehaviorAnalyzer, {
  UserBehaviorProfile,
  PersonalizedRecommendation,
  UserAction
} from './user-behavior-analyzer';
import MusicalIntelligence, {
  MusicalFeatures,
  MusicalStyle,
  CompositionSuggestion
} from './musical-intelligence';

//================================================================================================
// ML-Powered Recommendation Engine
//================================================================================================

export interface MLPrediction {
  id: string;
  type: 'node_suggestion' | 'connection_prediction' | 'parameter_optimization' |
        'workflow_improvement' | 'musical_suggestion' | 'collaboration_enhancement';
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'transformative';
  data: any;
  actionItems: Array<{
    type: string;
    target: string;
    parameters: Record<string, any>;
  }>;
  metadata: {
    modelUsed: string;
    timestamp: number;
    userContext: Record<string, any>;
    musicalContext?: Record<string, any>;
  };
}

export interface MLEngineConfig {
  enableWorkflowPatterns: boolean;
  enableUserBehaviorAnalysis: boolean;
  enableMusicalIntelligence: boolean;
  enableRealTimePrediction: boolean;
  learningRate: number;
  updateFrequency: number;
  maxRecommendations: number;
  confidenceThreshold: number;
}

export class MLRecommendationEngine {
  private workflowModel: WorkflowPatternModel;
  private behaviorAnalyzer: UserBehaviorAnalyzer;
  private musicalIntelligence: MusicalIntelligence;
  private config: MLEngineConfig;
  private isInitialized = false;
  private predictionHistory: MLPrediction[] = [];
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MLEngineConfig> = {}) {
    this.config = {
      enableWorkflowPatterns: true,
      enableUserBehaviorAnalysis: true,
      enableMusicalIntelligence: true,
      enableRealTimePrediction: true,
      learningRate: 0.001,
      updateFrequency: 5000, // 5 seconds
      maxRecommendations: 5,
      confidenceThreshold: 0.6,
      ...config
    };

    this.workflowModel = new WorkflowPatternModel();
    this.behaviorAnalyzer = new UserBehaviorAnalyzer();
    this.musicalIntelligence = new MusicalIntelligence();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize all ML models
      const initPromises: Promise<void>[] = [];

      if (this.config.enableWorkflowPatterns) {
        initPromises.push(this.workflowModel.initialize());
      }

      if (this.config.enableUserBehaviorAnalysis) {
        initPromises.push(this.behaviorAnalyzer.initialize());
      }

      if (this.config.enableMusicalIntelligence) {
        initPromises.push(this.musicalIntelligence.initialize());
      }

      await Promise.all(initPromises);

      this.isInitialized = true;
      console.log('ML Recommendation Engine initialized successfully');

      // Start real-time prediction if enabled
      if (this.config.enableRealTimePrediction) {
        this.startRealTimePrediction();
      }
    } catch (error) {
      console.error('Failed to initialize ML Recommendation Engine:', error);
      throw error;
    }
  }

  async generateRecommendations(
    userId: string,
    context: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      currentView: 'daw' | 'theory';
      sessionDuration: number;
      musicalFeatures?: MusicalFeatures;
    }
  ): Promise<MLPrediction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const recommendations: MLPrediction[] = [];

      // Generate workflow pattern recommendations
      if (this.config.enableWorkflowPatterns && context.nodes.length > 0) {
        const workflowRecs = await this.generateWorkflowRecommendations(context);
        recommendations.push(...workflowRecs);
      }

      // Generate personalized user recommendations
      if (this.config.enableUserBehaviorAnalysis) {
        const userRecs = await this.generatePersonalizedRecommendations(userId, context);
        recommendations.push(...userRecs);
      }

      // Generate musical intelligence recommendations
      if (this.config.enableMusicalIntelligence && context.musicalFeatures) {
        const musicalRecs = await this.generateMusicalRecommendations(context);
        recommendations.push(...musicalRecs);
      }

      // Generate connection predictions
      if (context.nodes.length > 1) {
        const connectionRecs = await this.generateConnectionPredictions(context);
        recommendations.push(...connectionRecs);
      }

      // Filter by confidence threshold and limit results
      const filteredRecs = recommendations
        .filter(rec => rec.confidence >= this.config.confidenceThreshold)
        .sort((a, b) => {
          // Sort by priority and confidence
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.confidence - a.confidence;
        })
        .slice(0, this.config.maxRecommendations);

      // Store prediction history
      this.predictionHistory.push(...filteredRecs);
      this.predictionHistory = this.predictionHistory.slice(-100); // Keep last 100

      return filteredRecs;
    } catch (error) {
      console.error('Failed to generate ML recommendations:', error);
      return [];
    }
  }

  async predictNextNode(
    userId: string,
    context: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      lastAction?: UserAction;
    }
  ): Promise<MLPrediction | null> {
    if (!this.isInitialized || this.config.enableWorkflowPatterns) {
      return null;
    }

    try {
      // Analyze current workflow state
      const features = this.workflowModel.extractFeatures(context.nodes, context.edges);
      const patterns = await this.workflowModel.recognizePattern(features);

      if (patterns.length === 0) return null;

      const topPattern = patterns[0];

      // Predict next likely node based on pattern
      const nextNodeSuggestion = this.predictNextNodeFromPattern(topPattern, context);

      if (!nextNodeSuggestion) return null;

      return {
        id: this.generatePredictionId(),
        type: 'node_suggestion',
        title: `Add ${nextNodeSuggestion.nodeType}`,
        description: `Based on your workflow pattern, consider adding a ${nextNodeSuggestion.nodeType}`,
        confidence: topPattern.confidence,
        reasoning: `Your current workflow matches the "${topPattern.name}" pattern (${Math.round(topPattern.confidence * 100)}% confidence)`,
        priority: 'medium',
        estimatedImpact: 'moderate',
        data: nextNodeSuggestion,
        actionItems: [
          {
            type: 'add_node',
            target: nextNodeSuggestion.nodeType,
            parameters: nextNodeSuggestion.parameters
          }
        ],
        metadata: {
          modelUsed: 'workflow-pattern-model',
          timestamp: Date.now(),
          userContext: { userId },
          musicalContext: { pattern: topPattern }
        }
      };
    } catch (error) {
      console.error('Failed to predict next node:', error);
      return null;
    }
  }

  async predictConnections(
    nodes: FlowNode[],
    existingEdges: FlowEdge[]
  ): Promise<Array<{source: string, target: string, confidence: number, reason: string}>> {
    if (!this.isInitialized || !this.config.enableWorkflowPatterns) {
      return [];
    }

    try {
      const features = this.workflowModel.extractFeatures(nodes, existingEdges);
      const patterns = await this.workflowModel.recognizePattern(features);

      const connections: Array<{source: string, target: string, confidence: number, reason: string}> = [];

      // Analyze potential connections based on patterns
      nodes.forEach(sourceNode => {
        nodes.forEach(targetNode => {
          if (sourceNode.id === targetNode.id) return;

          // Check if connection already exists
          const exists = existingEdges.some(edge =>
            (edge.source === sourceNode.id && edge.target === targetNode.id) ||
            (edge.source === targetNode.id && edge.target === sourceNode.id)
          );

          if (exists) return;

          // Predict connection likelihood
          const connectionLikelihood = this.calculateConnectionLikelihood(
            sourceNode,
            targetNode,
            patterns,
            features
          );

          if (connectionLikelihood.confidence > this.config.confidenceThreshold) {
            connections.push(connectionLikelihood);
          }
        });
      });

      return connections.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Failed to predict connections:', error);
      return [];
    }
  }

  recordUserAction(userId: string, action: Omit<UserAction, 'id'>): void {
    if (!this.config.enableUserBehaviorAnalysis) return;

    this.behaviorAnalyzer.recordAction({
      ...action,
      userId
    });

    // Trigger real-time update if enabled
    if (this.config.enableRealTimePrediction) {
      this.scheduleUpdate();
    }
  }

  recordUserFeedback(
    userId: string,
    predictionId: string,
    feedback: 'accepted' | 'rejected' | 'modified' | 'applied'
  ): void {
    if (!this.config.enableUserBehaviorAnalysis) return;

    // Find the prediction and record feedback
    const prediction = this.predictionHistory.find(p => p.id === predictionId);
    if (prediction) {
      this.behaviorAnalyzer.updateUserFeedback(userId, predictionId, feedback);

      // Update model weights based on feedback
      this.updateFromFeedback(prediction, feedback);
    }
  }

  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.behaviorAnalyzer.getUserProfile(userId);
  }

  getPredictionHistory(limit = 50): MLPrediction[] {
    return this.predictionHistory.slice(-limit);
  }

  updateConfig(newConfig: Partial<MLEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart real-time prediction if settings changed
    if (newConfig.enableRealTimePrediction !== undefined) {
      if (newConfig.enableRealTimePrediction) {
        this.startRealTimePrediction();
      } else {
        this.stopRealTimePrediction();
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getModelStatus(): {
    workflowModel: boolean;
    behaviorAnalyzer: boolean;
    musicalIntelligence: boolean;
  } {
    return {
      workflowModel: this.workflowModel.isModelReady(),
      behaviorAnalyzer: this.behaviorAnalyzer.isReady(),
      musicalIntelligence: this.musicalIntelligence.isReady()
    };
  }

  // Private methods
  private async generateWorkflowRecommendations(context: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    currentView: 'daw' | 'theory';
    sessionDuration: number;
  }): Promise<MLPrediction[]> {
    const recommendations: MLPrediction[] = [];

    try {
      const features = this.workflowModel.extractFeatures(context.nodes, context.edges);
      const patterns = await this.workflowModel.recognizePattern(features);

      patterns.forEach(pattern => {
        if (pattern.confidence > this.config.confidenceThreshold) {
          recommendations.push({
            id: this.generatePredictionId(),
            type: 'workflow_improvement',
            title: `Workflow Pattern: ${pattern.name}`,
            description: `Your workflow matches the "${pattern.name}" pattern with ${Math.round(pattern.confidence * 100)}% confidence`,
            confidence: pattern.confidence,
            reasoning: `Pattern recognition identified ${pattern.nodeTypes.length} node types and ${pattern.connectionPatterns.length} connection patterns`,
            priority: pattern.confidence > 0.8 ? 'high' : 'medium',
            estimatedImpact: 'moderate',
            data: pattern,
            actionItems: this.generatePatternActionItems(pattern),
            metadata: {
              modelUsed: 'workflow-pattern-model',
              timestamp: Date.now(),
              userContext: { view: context.currentView }
            }
          });
        }
      });
    } catch (error) {
      console.error('Failed to generate workflow recommendations:', error);
    }

    return recommendations;
  }

  private async generatePersonalizedRecommendations(
    userId: string,
    context: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      currentView: 'daw' | 'theory';
      sessionDuration: number;
    }
  ): Promise<MLPrediction[]> {
    const recommendations: MLPrediction[] = [];

    try {
      const personalizedRecs = await this.behaviorAnalyzer.generatePersonalizedRecommendations(
        userId,
        context
      );

      personalizedRecs.forEach(rec => {
        recommendations.push({
          id: this.generatePredictionId(),
          type: this.mapRecommendationType(rec.type),
          title: rec.title,
          description: rec.description,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
          priority: this.mapPriority(rec.priority),
          estimatedImpact: this.mapImpact(rec.estimatedImpact),
          data: rec,
          actionItems: rec.actionItems,
          metadata: {
            modelUsed: 'user-behavior-analyzer',
            timestamp: Date.now(),
            userContext: { userId, skillLevel: this.behaviorAnalyzer.analyzeSkillLevel(userId) }
          }
        });
      });
    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
    }

    return recommendations;
  }

  private async generateMusicalRecommendations(context: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    currentView: 'daw' | 'theory';
    sessionDuration: number;
    musicalFeatures?: MusicalFeatures;
  }): Promise<MLPrediction[]> {
    const recommendations: MLPrediction[] = [];

    if (!context.musicalFeatures) return recommendations;

    try {
      // Generate musical style analysis
      const styles = await this.musicalIntelligence.analyzeMusicalStyle(context.musicalFeatures);

      styles.forEach(style => {
        if (style.confidence > this.config.confidenceThreshold) {
          recommendations.push({
            id: this.generatePredictionId(),
            type: 'musical_suggestion',
            title: `Musical Style: ${style.name}`,
            description: `Your music shows characteristics of ${style.name} style`,
            confidence: style.confidence,
            reasoning: `Based on tempo, key, harmony, and instrumentation analysis`,
            priority: 'medium',
            estimatedImpact: 'moderate',
            data: style,
            actionItems: this.generateMusicalActionItems(style),
            metadata: {
              modelUsed: 'musical-intelligence',
              timestamp: Date.now(),
              userContext: {},
              musicalContext: context.musicalFeatures
            }
          });
        }
      });

      // Generate composition suggestions
      const harmonySuggestions = await this.musicalIntelligence.generateHarmonySuggestions(
        context.musicalFeatures,
        { key: context.musicalFeatures.key }
      );

      harmonySuggestions.forEach(suggestion => {
        recommendations.push({
          id: this.generatePredictionId(),
          type: 'musical_suggestion',
          title: suggestion.title,
          description: suggestion.description,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          priority: this.mapDifficultyToPriority(suggestion.difficulty),
          estimatedImpact: 'significant',
          data: suggestion,
          actionItems: [
            {
              type: 'apply_harmony',
              target: 'flow',
              parameters: suggestion.suggestion
            }
          ],
          metadata: {
            modelUsed: 'musical-intelligence',
            timestamp: Date.now(),
            userContext: {},
            musicalContext: context.musicalFeatures
          }
        });
      });
    } catch (error) {
      console.error('Failed to generate musical recommendations:', error);
    }

    return recommendations;
  }

  private async generateConnectionPredictions(context: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    currentView: 'daw' | 'theory';
    sessionDuration: number;
  }): Promise<MLPrediction[]> {
    const recommendations: MLPrediction[] = [];

    try {
      const connections = await this.predictConnections(context.nodes, context.edges);

      connections.slice(0, 3).forEach(conn => {
        recommendations.push({
          id: this.generatePredictionId(),
          type: 'connection_prediction',
          title: 'Suggested Connection',
          description: `Connect ${conn.source} to ${conn.target}`,
          confidence: conn.confidence,
          reasoning: conn.reason,
          priority: 'medium',
          estimatedImpact: 'moderate',
          data: conn,
          actionItems: [
            {
              type: 'add_edge',
              target: 'flow',
              parameters: { source: conn.source, target: conn.target }
            }
          ],
          metadata: {
            modelUsed: 'workflow-pattern-model',
            timestamp: Date.now(),
            userContext: { connectionType: 'predicted' }
          }
        });
      });
    } catch (error) {
      console.error('Failed to generate connection predictions:', error);
    }

    return recommendations;
  }

  private predictNextNodeFromPattern(
    pattern: WorkflowPattern,
    context: { nodes: FlowNode[]; edges: FlowEdge[] }
  ): { nodeType: string; parameters: Record<string, any> } | null {
    // Simple prediction based on pattern common nodes
    const commonNodeTypes: FlowNodeType[] = ['plugin', 'effect', 'track', 'analyzer'];
    const existingTypes = new Set(context.nodes.map(n => n.type));

    for (const nodeType of commonNodeTypes) {
      if (!existingTypes.has(nodeType) && pattern.nodeTypes.includes(nodeType)) {
        return {
          nodeType,
          parameters: {
            position: this.suggestPosition(context.nodes),
            suggestedBy: 'ml-pattern'
          }
        };
      }
    }

    return null;
  }

  private calculateConnectionLikelihood(
    sourceNode: FlowNode,
    targetNode: FlowNode,
    patterns: WorkflowPattern[],
    features: WorkflowFeatures
  ): { source: string; target: string; confidence: number; reason: string } {
    let confidence = 0;
    let reason = '';

    // Check if connection type is common in patterns
    patterns.forEach(pattern => {
      const matchingConnection = pattern.connectionPatterns.find(
        cp => (cp.sourceType === sourceNode.type && cp.targetType === targetNode.type) ||
              (cp.sourceType === targetNode.type && cp.targetType === sourceNode.type)
      );

      if (matchingConnection) {
        confidence += matchingConnection.frequency;
        reason = `Common in ${pattern.name} pattern`;
      }
    });

    // Add graph-based likelihood
    if (features.density < 0.3) {
      confidence += 0.2; // Encourage connections in sparse graphs
      reason += reason ? '; sparse graph' : 'Sparse graph';
    }

    return {
      source: sourceNode.id,
      target: targetNode.id,
      confidence: Math.min(1, confidence),
      reason: reason || 'Potential connection'
    };
  }

  private suggestPosition(existingNodes: FlowNode[]): { x: number; y: number } {
    if (existingNodes.length === 0) {
      return { x: 400, y: 300 };
    }

    // Simple positioning - find empty space
    const lastNode = existingNodes[existingNodes.length - 1];
    return {
      x: (lastNode.position?.x || 400) + 150,
      y: (lastNode.position?.y || 300) + (Math.random() - 0.5) * 100
    };
  }

  private generatePatternActionItems(pattern: WorkflowPattern): Array<{
    type: string;
    target: string;
    parameters: Record<string, any>;
  }> {
    const items: Array<{ type: string; target: string; parameters: Record<string, any> }> = [];

    // Suggest adding missing node types from the pattern
    pattern.nodeTypes.forEach(nodeType => {
      items.push({
        type: 'add_node',
        target: 'flow',
        parameters: { nodeType, suggestedBy: 'ml-pattern' }
      });
    });

    return items;
  }

  private generateMusicalActionItems(style: MusicalStyle): Array<{
    type: string;
    target: string;
    parameters: Record<string, any>;
  }> {
    const items: Array<{ type: string; target: string; parameters: Record<string, any> }> = [];

    // Suggest adding instruments typical for the style
    style.characteristics.typicalInstrumentation.forEach(instrument => {
      items.push({
        type: 'add_instrument',
        target: 'flow',
        parameters: { instrument, style: style.name }
      });
    });

    return items;
  }

  private mapRecommendationType(type: string): MLPrediction['type'] {
    const typeMap: Record<string, MLPrediction['type']> = {
      'node_suggestion': 'node_suggestion',
      'parameter_optimization': 'parameter_optimization',
      'workflow_improvement': 'workflow_improvement',
      'learning_resource': 'collaboration_enhancement'
    };

    return typeMap[type] || 'workflow_improvement';
  }

  private mapPriority(priority: string): MLPrediction['priority'] {
    return priority as MLPrediction['priority'];
  }

  private mapImpact(impact: string): MLPrediction['estimatedImpact'] {
    return impact as MLPrediction['estimatedImpact'];
  }

  private mapDifficultyToPriority(difficulty: string): MLPrediction['priority'] {
    switch (difficulty) {
      case 'beginner': return 'low';
      case 'intermediate': return 'medium';
      case 'advanced': return 'high';
      default: return 'medium';
    }
  }

  private updateFromFeedback(prediction: MLPrediction, feedback: string): void {
    // In a real implementation, this would update model weights
    console.log(`Updating model based on feedback: ${feedback} for prediction ${prediction.id}`);
  }

  private startRealTimePrediction(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      // Trigger periodic updates
      console.log('ML models: Real-time prediction update');
    }, this.config.updateFrequency);
  }

  private stopRealTimePrediction(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private scheduleUpdate(): void {
    // Debounced update scheduling
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      console.log('ML models: Triggering update due to user action');
    }, 1000);
  }

  private generatePredictionId(): string {
    return `ml_pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose(): void {
    this.stopRealTimePrediction();
    this.predictionHistory = [];
  }
}

//================================================================================================
// React Hook for ML Recommendations
//================================================================================================

export function useMLRecommendations(config?: Partial<MLEngineConfig>) {
  const [engine] = useState(() => new MLRecommendationEngine(config));
  const [recommendations, setRecommendations] = useState<MLPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { daw, theory, activeView } = useFlowStore();
  const currentView = activeView === 'daw' ? daw : theory;
  const { nodes, edges } = currentView;

  const generateRecommendations = useCallback(async (userId: string) => {
    if (!engine.isReady()) {
      try {
        setIsLoading(true);
        await engine.initialize();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize ML engine');
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const context = {
        nodes,
        edges,
        currentView: activeView,
        sessionDuration: Date.now() - (window as any).sessionStartTime || Date.now()
      };

      const recs = await engine.generateRecommendations(userId, context);
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [engine, nodes, edges, activeView]);

  const recordAction = useCallback((userId: string, action: Omit<UserAction, 'id'>) => {
    engine.recordUserAction(userId, action);
  }, [engine]);

  const recordFeedback = useCallback((userId: string, predictionId: string, feedback: 'accepted' | 'rejected' | 'modified' | 'applied') => {
    engine.recordUserFeedback(userId, predictionId, feedback);
  }, [engine]);

  const predictNextNode = useCallback(async (userId: string, lastAction?: UserAction) => {
    if (!engine.isReady()) return null;

    try {
      return await engine.predictNextNode(userId, {
        nodes,
        edges,
        lastAction
      });
    } catch (err) {
      console.error('Failed to predict next node:', err);
      return null;
    }
  }, [engine, nodes, edges]);

  useEffect(() => {
    // Initialize engine on mount
    engine.initialize().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to initialize ML engine');
    });

    return () => {
      engine.dispose();
    };
  }, [engine]);

  return {
    recommendations,
    isLoading,
    error,
    generateRecommendations,
    recordAction,
    recordFeedback,
    predictNextNode,
    engine,
    isReady: engine.isReady(),
    modelStatus: engine.getModelStatus()
  };
}

export default MLRecommendationEngine;