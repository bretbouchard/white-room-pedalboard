/**
 * @fileoverview Hybrid Intelligence System Integration
 * Unified interface combining Schillinger OS, ML engine, and AGUI bridge
 * Complete AI-powered musical intelligence system
 */

import { SchillingerSystem } from './index';
import { SchillingerMLIntegration } from '../ml/schillinger-ml-integration';
import type {
  SchillingerConfig,
  AGUISchillingerConfig,
  HybridFeatures,
  HybridAnalysis,
  HybridRecommendation
} from '../ml/schillinger-ml-integration';
import type { AGUIBridge } from '../agui/agui-bridge';

//================================================================================================
// Hybrid Intelligence System Types
//================================================================================================

export interface HybridIntelligenceConfig {
  schillinger: Partial<SchillingerConfig>;
  agui: Partial<AGUISchillingerConfig>;
  ml: {
    enableLearning: boolean;
    modelUpdateFrequency: number;
    confidenceThreshold: number;
    maxRecommendations: number;
  };
}

export interface UnifiedRequest {
  userMessage: string;
  context: {
    currentNodes?: any[];
    currentEdges?: any[];
    musicalData?: any;
    audioData?: any;
    userId?: string;
    sessionId?: string;
    userIntent?: string;
    skillLevel?: string;
    preferences?: any;
  };
  options?: {
    includeMLAnalysis?: boolean;
    includeSchillingerAnalysis?: boolean;
    includeHybridRecommendations?: boolean;
    maxRecommendations?: number;
    confidenceThreshold?: number;
  };
}

export interface UnifiedResponse {
  // Natural language response
  textResponse: string;

  // Multi-layer analysis
  analysis?: {
    ml: any;
    schillinger: any;
    hybrid: HybridAnalysis;
  };

  // Intelligent recommendations
  recommendations: HybridRecommendation[];

  // Suggested actions
  suggestedActions: Array<{
    type: string;
    description: string;
    parameters: any;
    confidence: number;
    musicalImpact: string;
    executionSteps: string[];
  }>;

  // Learning and adaptation
  insights: {
    userSkillLevel: string;
    detectedPatterns: string[];
    learningOpportunities: string[];
    efficiencyTips: string[];
  };

  // System metadata
  metadata: {
    confidence: number;
    processingTime: number;
    modelsUsed: string[];
    learningOccurred: boolean;
    recommendationsCount: number;
  };
}

//================================================================================================
// Hybrid Intelligence System Implementation
//================================================================================================

export class HybridIntelligenceSystem {
  private schillingerSystem: SchillingerSystem;
  private mlIntegration: SchillingerMLIntegration;
  private config: HybridIntelligenceConfig;
  private isInitialized = false;

  constructor(config: Partial<HybridIntelligenceConfig> = {}) {
    this.config = {
      schillinger: {
        complexityLevel: 'moderate',
        preserveOriginal: true,
        generateVariations: true
      },
      agui: {
        enableMusicalIntelligence: true,
        autoExecuteOperations: false,
        explainSchillingerConcepts: true,
        adaptToUserSkill: true,
        confidenceThreshold: 0.6
      },
      ml: {
        enableLearning: true,
        modelUpdateFrequency: 10,
        confidenceThreshold: 0.5,
        maxRecommendations: 8
      },
      ...config
    };
  }

  async initialize(aguiBridge?: AGUIBridge): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Hybrid Intelligence System...');

      // Initialize Schillinger System
      this.schillingerSystem = new SchillingerSystem(
        this.config.schillinger,
        this.config.agui
      );
      await this.schillingerSystem.initialize(aguiBridge);

      // Initialize ML Integration
      const schillingerOS = this.schillingerSystem as any;
      this.mlIntegration = new SchillingerMLIntegration(
        schillingerOS.schillingerOS,
        schillingerOS.intentionProcessor,
        schillingerOS.dynamicBridge
      );
      await this.mlIntegration.initialize();

      this.isInitialized = true;
      console.log('✅ Hybrid Intelligence System initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Hybrid Intelligence System:', error);
      throw error;
    }
  }

  // Main intelligence processing method
  async processRequest(request: UnifiedRequest): Promise<UnifiedResponse> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Intelligence System not initialized');
    }

    const startTime = Date.now();

    try {
      console.log(`🧠 Processing request: "${request.userMessage}"`);

      // Determine analysis level based on options
      const includeML = request.options?.includeMLAnalysis !== false;
      const includeSchillinger = request.options?.includeSchillingerAnalysis !== false;
      const includeHybrid = request.options?.includeHybridRecommendations !== false;

      let analysis: any;
      let recommendations: HybridRecommendation[] = [];

      // Perform hybrid analysis if requested
      if (includeHybrid) {
        analysis = await this.performHybridAnalysis(request);
        recommendations = analysis.recommendedActions || [];
      } else {
        // Perform individual analyses
        if (includeSchillinger) {
          const schillingerAnalysis = await this.performSchillingerAnalysis(request);
          analysis = { schillinger: schillingerAnalysis };
        }

        if (includeML) {
          const mlAnalysis = await this.performMLAnalysis(request);
          analysis = { ...analysis, ml: mlAnalysis };
        }

        // Generate basic recommendations
        recommendations = await this.generateBasicRecommendations(request, analysis);
      }

      // Filter recommendations by confidence threshold
      const confidenceThreshold = request.options?.confidenceThreshold || this.config.ml.confidenceThreshold;
      const filteredRecommendations = recommendations
        .filter(rec => rec.combinedConfidence >= confidenceThreshold)
        .slice(0, request.options?.maxRecommendations || this.config.ml.maxRecommendations);

      // Generate natural language response
      const textResponse = await this.generateTextResponse(request, analysis, filteredRecommendations);

      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(filteredRecommendations, request.context);

      // Extract insights
      const insights = await this.extractInsights(analysis, request.context);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      const response: UnifiedResponse = {
        textResponse,
        analysis: includeHybrid ? analysis : undefined,
        recommendations: filteredRecommendations,
        suggestedActions,
        insights,
        metadata: {
          confidence: this.calculateOverallConfidence(filteredRecommendations),
          processingTime,
          modelsUsed: this.getModelsUsed(includeML, includeSchillinger, includeHybrid),
          learningOccurred: false, // Would be updated if learning occurred
          recommendationsCount: filteredRecommendations.length
        }
      };

      console.log(`✅ Request processed in ${processingTime}ms, ${filteredRecommendations.length} recommendations`);
      return response;

    } catch (error) {
      console.error('Error processing request:', error);
      return this.createErrorResponse(request.userMessage, error);
    }
  }

  private async performHybridAnalysis(request: UnifiedRequest): Promise<HybridAnalysis> {
    // Prepare musical input for analysis
    const musicalInput = this.prepareMusicalInput(request.context);

    // Prepare analysis context
    const analysisContext = {
      userId: request.context.userId,
      currentNodes: request.context.currentNodes,
      workflow: { edges: request.context.currentEdges },
      userIntent: request.userIntent || request.context.userIntent
    };

    // Perform hybrid analysis
    return this.mlIntegration.analyzeWithHybridIntelligence(musicalInput, analysisContext);
  }

  private async performSchillingerAnalysis(request: UnifiedRequest): Promise<any> {
    // Process user intention through Schillinger system
    const musicalInput = this.prepareMusicalInput(request.context);

    return this.schillingerSystem.processMusicalIntention(
      request.userMessage,
      musicalInput,
      request.context
    );
  }

  private async performMLAnalysis(request: UnifiedRequest): Promise<any> {
    // This would integrate with existing ML components
    // For now, return a placeholder structure
    return {
      workflowPatterns: [],
      userProfile: null,
      styleAnalysis: [],
      userRecommendations: []
    };
  }

  private prepareMusicalInput(context: any): any {
    const input: any = {
      type: 'unknown',
      nodes: context.currentNodes || [],
      edges: context.currentEdges || []
    };

    // Detect input type from context
    if (context.currentNodes) {
      const nodeTypes = context.currentNodes.map((n: any) => n.type);
      if (nodeTypes.includes('rhythm')) input.type = 'rhythm';
      else if (nodeTypes.includes('chord') || nodeTypes.includes('harmony')) input.type = 'harmony';
      else if (nodeTypes.includes('melody')) input.type = 'melody';
    }

    // Add audio data if available
    if (context.audioData) {
      input.audioData = context.audioData;
    }

    // Add musical data if available
    if (context.musicalData) {
      input.musicalData = context.musicalData;
    }

    return input;
  }

  private async generateBasicRecommendations(
    request: UnifiedRequest,
    analysis: any
  ): Promise<HybridRecommendation[]> {
    const recommendations: HybridRecommendation[] = [];

    // Generate recommendations from Schillinger analysis
    if (analysis.schillinger && analysis.schillinger.suggestedOperations) {
      for (const operation of analysis.schillinger.suggestedOperations) {
        recommendations.push({
          id: `schillinger_${Date.now()}_${Math.random()}`,
          type: 'musical_suggestion',
          title: `Schillinger: ${operation.operation}`,
          description: this.describeSchillingerOperation(operation),
          confidence: analysis.schillinger.confidence || 0.7,
          reasoning: 'Based on Schillinger musical theory analysis',
          priority: 'medium',
          estimatedImpact: 'moderate',
          data: { operation },
          actionItems: [{
            type: 'apply_schillinger_operation',
            target: operation.target,
            parameters: operation.parameters
          }],
          metadata: {
            modelUsed: 'schillinger_os',
            timestamp: Date.now()
          },
          mlConfidence: 0.5,
          schillingerConfidence: analysis.schillinger.confidence || 0.7,
          combinedConfidence: (0.5 + (analysis.schillinger.confidence || 0.7)) / 2
        });
      }
    }

    return recommendations;
  }

  private describeSchillingerOperation(operation: any): string {
    const descriptions = {
      'accelerate': 'Increase rhythmic energy and forward momentum',
      'increase_tension': 'Build harmonic tension and create anticipation',
      'add_syncopation': 'Add rhythmic syncopation for enhanced groove',
      'resolve': 'Create satisfying harmonic resolution and release',
      'variation': 'Generate musical variations while maintaining essence',
      'simplify': 'Reduce complexity for improved clarity',
      'complexify': 'Add sophisticated musical elements and depth',
      'transform': 'Transform material across musical dimensions'
    };

    return descriptions[operation.operation] || `Apply ${operation.operation} operation`;
  }

  private async generateTextResponse(
    request: UnifiedRequest,
    analysis: any,
    recommendations: HybridRecommendation[]
  ): Promise<string> {
    let response = '';

    // Start with acknowledgment
    if (recommendations.length > 0) {
      const topRec = recommendations[0];
      if (topRec.combinedConfidence > 0.8) {
        response = `I understand exactly what you're looking for. `;
      } else if (topRec.combinedConfidence > 0.6) {
        response = `I think I understand what you want to achieve. `;
      } else {
        response = `I have some ideas that might help. `;
      }
    } else {
      response = `Let me help you with that. `;
    }

    // Add analytical insights
    if (analysis?.hybrid?.synthesizedInsights) {
      const insights = analysis.hybrid.synthesizedInsights;
      if (insights.coreConcepts.length > 0) {
        response += `I'm detecting ${insights.coreConcepts.slice(0, 2).join(' and ')} in your music. `;
      }

      if (insights.opportunities.length > 0) {
        response += `There's an opportunity to ${insights.opportunities[0].toLowerCase()}. `;
      }
    }

    // Add recommendations preview
    if (recommendations.length > 0) {
      response += `I have ${recommendations.length} recommendation${recommendations.length > 1 ? 's' : ''} that could help: `;

      if (recommendations.length === 1) {
        response += recommendations[0].title.toLowerCase();
      } else {
        const topRecs = recommendations.slice(0, 3);
        response += topRecs.map((rec, index) =>
          `${index + 1}. ${rec.title.toLowerCase()}`
        ).join(', ');
      }

      response += '. ';
    }

    // Add confidence and next steps
    if (recommendations.length > 0) {
      const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.combinedConfidence, 0) / recommendations.length;
      if (avgConfidence > 0.8) {
        response += 'I\'m confident these will work well for your music.';
      } else if (avgConfidence > 0.6) {
        response += 'These should provide good results with some refinement.';
      } else {
        response += 'You might want to experiment with these and see what works best.';
      }
    }

    return response;
  }

  private async generateSuggestedActions(
    recommendations: HybridRecommendation[],
    context: any
  ): Promise<Array<any>> {
    const actions: Array<any> = [];

    for (const rec of recommendations) {
      if (rec.actionItems && rec.actionItems.length > 0) {
        for (const actionItem of rec.actionItems) {
          actions.push({
            type: actionItem.type,
            description: rec.description,
            parameters: actionItem.parameters,
            confidence: rec.combinedConfidence,
            musicalImpact: rec.musicalOutcome?.expectedChange || 'Musical enhancement',
            executionSteps: this.generateExecutionSteps(rec, context)
          });
        }
      }
    }

    return actions;
  }

  private generateExecutionSteps(recommendation: HybridRecommendation, context: any): string[] {
    const steps: string[] = [];

    switch (recommendation.type) {
      case 'musical_suggestion':
        steps.push('Analyze current musical material');
        steps.push('Apply suggested Schillinger operation');
        steps.push('Review and refine results');
        break;

      case 'workflow_optimization':
        steps.push('Review current workflow patterns');
        steps.push('Implement suggested improvements');
        steps.push('Test new workflow efficiency');
        break;

      default:
        steps.push('Review recommendation details');
        steps.push('Apply suggested changes');
        steps.push('Evaluate results');
    }

    return steps;
  }

  private async extractInsights(analysis: any, context: any): Promise<any> {
    const insights = {
      userSkillLevel: 'intermediate', // Would be detected from user behavior
      detectedPatterns: [] as string[],
      learningOpportunities: [] as string[],
      efficiencyTips: [] as string[]
    };

    // Extract patterns from analysis
    if (analysis?.hybrid?.synthesizedInsights) {
      const synthesized = analysis.hybrid.synthesizedInsights;
      insights.detectedPatterns = synthesized.coreConcepts || [];
      insights.learningOpportunities = synthesized.opportunities || [];
    }

    // Add efficiency tips based on recommendations
    if (analysis?.recommendedActions) {
      insights.efficiencyTips = analysis.recommendedActions
        .slice(0, 2)
        .map((rec: any) => rec.title);
    }

    return insights;
  }

  private calculateOverallConfidence(recommendations: HybridRecommendation[]): number {
    if (recommendations.length === 0) return 0;

    const totalConfidence = recommendations.reduce((sum, rec) => sum + rec.combinedConfidence, 0);
    return totalConfidence / recommendations.length;
  }

  private getModelsUsed(includeML: boolean, includeSchillinger: boolean, includeHybrid: boolean): string[] {
    const models: string[] = [];

    if (includeHybrid) {
      models.push('hybrid_intelligence', 'schillinger_os', 'workflow_patterns', 'user_behavior_analysis');
    } else {
      if (includeSchillinger) models.push('schillinger_os');
      if (includeML) models.push('workflow_patterns', 'user_behavior_analysis');
    }

    return models;
  }

  private createErrorResponse(userMessage: string, error: any): UnifiedResponse {
    return {
      textResponse: 'I encountered an error processing your request. Let me try a different approach to help you.',
      recommendations: [],
      suggestedActions: [{
        type: 'clarification',
        description: 'Could you provide more specific details about what you\'d like to achieve?',
        parameters: { requestClarification: true },
        confidence: 0.3,
        musicalImpact: 'Improved understanding and more accurate recommendations',
        executionSteps: ['Provide additional context', 'Clarify musical goals', 'Refine request']
      }],
      insights: {
        userSkillLevel: 'unknown',
        detectedPatterns: [],
        learningOpportunities: ['Provide clearer musical intentions'],
        efficiencyTips: ['Use specific musical terminology']
      },
      metadata: {
        confidence: 0.2,
        processingTime: 0,
        modelsUsed: ['error_handling'],
        learningOccurred: false,
        recommendationsCount: 0
      }
    };
  }

  // Learning and feedback methods
  async recordFeedback(
    originalRequest: UnifiedRequest,
    appliedRecommendation: HybridRecommendation,
    outcome: 'success' | 'partial' | 'failure',
    userFeedback?: number
  ): Promise<void> {
    try {
      // Record feedback with ML integration
      await this.mlIntegration.recordFeedback(
        originalRequest.context,
        appliedRecommendation,
        outcome,
        userFeedback
      );

      // Also record with Schillinger system
      this.schillingerSystem.recordFeedback(
        originalRequest.userMessage,
        [appliedRecommendation.data?.operation],
        outcome
      );

      console.log(`📚 Recorded feedback: ${outcome} (confidence: ${userFeedback})`);

    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  // System status and utilities
  getSystemStatus(): any {
    return {
      initialized: this.isInitialized,
      schillingerSystem: this.schillingerSystem?.getSystemInfo(),
      mlIntegration: this.mlIntegration?.getSystemStatus(),
      config: this.config,
      capabilities: {
        hybridAnalysis: true,
        schillingerAnalysis: true,
        mlAnalysis: true,
        crossDimensionalTransform: true,
        naturalLanguageUnderstanding: true,
        adaptiveLearning: true
      }
    };
  }

  async performCrossDimensionalTransform(
    fromDimension: string,
    toDimension: string,
    sourceMaterial: any,
    parameters: any = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Intelligence System not initialized');
    }

    return this.schillingerSystem.transformBetweenDimensions(
      fromDimension,
      toDimension,
      sourceMaterial,
      parameters
    );
  }

  // Configuration updates
  updateConfig(newConfig: Partial<HybridIntelligenceConfig>): void {
    this.config = {
      schillinger: { ...this.config.schillinger, ...newConfig.schillinger },
      agui: { ...this.config.agui, ...newConfig.agui },
      ml: { ...this.config.ml, ...newConfig.ml }
    };
  }

  // Cleanup
  dispose(): void {
    this.schillingerSystem?.dispose();
    this.mlIntegration?.dispose();
    this.isInitialized = false;
  }
}

//================================================================================================
// Global Instance and Convenience Functions
//================================================================================================

let globalHybridSystem: HybridIntelligenceSystem | null = null;

export async function initializeHybridIntelligence(
  config?: Partial<HybridIntelligenceConfig>,
  aguiBridge?: any
): Promise<HybridIntelligenceSystem> {
  if (globalHybridSystem) {
    console.warn('Hybrid Intelligence System already initialized');
    return globalHybridSystem;
  }

  globalHybridSystem = new HybridIntelligenceSystem(config);
  await globalHybridSystem.initialize(aguiBridge);

  return globalHybridSystem;
}

export function getHybridIntelligenceSystem(): HybridIntelligenceSystem | null {
  return globalHybridSystem;
}

// Convenience function for processing requests
export async function processMusicalRequest(
  userMessage: string,
  context: any = {},
  options: any = {}
): Promise<UnifiedResponse> {
  const system = getHybridIntelligenceSystem();
  if (!system) {
    throw new Error('Hybrid Intelligence System not initialized. Call initializeHybridIntelligence() first.');
  }

  return system.processRequest({
    userMessage,
    context,
    options
  });
}

export default HybridIntelligenceSystem;