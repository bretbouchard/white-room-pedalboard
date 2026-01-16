import * as tf from '@tensorflow/tfjs';
import type { FlowNode, FlowEdge } from '@/types/flow';

//================================================================================================
// User Behavior Analysis System
//================================================================================================

export interface UserAction {
  id: string;
  userId: string;
  type: 'node_add' | 'node_remove' | 'node_update' | 'edge_add' | 'edge_remove' | 'parameter_change' | 'selection_change';
  timestamp: number;
  targetId: string;
  targetType: 'node' | 'edge' | 'parameter';
  data: Record<string, any>;
  context: {
    sessionDuration: number;
    totalNodes: number;
    currentView: 'daw' | 'theory';
    musicalContext?: Record<string, any>;
  };
}

export interface UserBehaviorProfile {
  userId: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredNodeTypes: Array<{
    nodeType: string;
    frequency: number;
    confidence: number;
  }>;
  workflowPatterns: Array<{
    pattern: string;
    frequency: number;
    avgCompletionTime: number;
  }>;
  parameterTendencies: Record<string, {
    averageValue: number;
    variance: number;
    preferredRange: [number, number];
  }>;
  collaborationStyle: {
    prefersGuidance: boolean;
    sharesWork: boolean;
    acceptsSuggestions: number; // 0-1
  };
  learningProgress: {
    areas: string[];
    improvementRate: number;
    recentMilestones: string[];
  };
  // Musical preferences
  preferredGenres?: string[];
  workingStyles?: string[];
  lastUpdated: number;
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'node_suggestion' | 'parameter_optimization' | 'workflow_improvement' | 'learning_resource';
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'transformative';
  actionItems: Array<{
    type: string;
    target: string;
    parameters: Record<string, any>;
  }>;
  learningOutcomes?: string[];
}

export class UserBehaviorAnalyzer {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private actionHistory: UserAction[] = [];
  private clusteringModel: tf.LayersModel | null = null;

  constructor() {
    this.loadStoredData();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize behavior prediction model
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [30], // Feature vector size
            units: 64,
            activation: 'relu',
            name: 'behavior_input'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'behavior_hidden'
          }),
          tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'behavior_bottleneck'
          }),
          tf.layers.dense({
            units: 10, // Output features
            activation: 'sigmoid',
            name: 'behavior_output'
          })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Initialize clustering model for workflow pattern discovery
      this.clusteringModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [20], // Reduced feature set for clustering
            units: 15,
            activation: 'relu',
            name: 'cluster_input'
          }),
          tf.layers.dense({
            units: 8,
            activation: 'relu',
            name: 'cluster_hidden'
          }),
          tf.layers.dense({
            units: 5, // Cluster centers
            activation: 'softmax',
            name: 'cluster_output'
          })
        ]
      });

      this.isInitialized = true;
      console.log('User behavior analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize user behavior analyzer:', error);
      throw error;
    }
  }

  recordAction(action: Omit<UserAction, 'id'>): void {
    const fullAction: UserAction = {
      ...action,
      id: this.generateActionId()
    };

    this.actionHistory.push(fullAction);
    this.updateUserProfile(action.userId, fullAction);

    // Keep only recent actions (last 1000 per user)
    const userActions = this.actionHistory.filter(a => a.userId === action.userId);
    if (userActions.length > 1000) {
      this.actionHistory = this.actionHistory.filter(a => a.userId !== action.userId)
        .concat(userActions.slice(-1000));
    }

    this.saveToStorage();
  }

  async generatePersonalizedRecommendations(
    userId: string,
    currentContext: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      sessionDuration: number;
      currentView: 'daw' | 'theory';
    }
  ): Promise<PersonalizedRecommendation[]> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return this.generateBeginnerRecommendations(currentContext);
    }

    try {
      // Extract features from current context
      const features = this.extractContextFeatures(currentContext, profile);

      // Predict user needs and preferences
      const predictions = await this.predictUserNeeds(features);

      // Generate recommendations based on predictions and profile
      const recommendations = await this.createRecommendations(
        profile,
        predictions,
        currentContext
      );

      return recommendations.sort((a, b) => {
        // Sort by priority and confidence
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });
    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
      return [];
    }
  }

  analyzeSkillLevel(userId: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 'beginner';

    const userActions = this.actionHistory.filter(a => a.userId === userId);
    if (userActions.length < 10) return 'beginner';

    // Analyze various factors
    const diversityScore = this.calculateActionDiversity(userActions);
    const efficiencyScore = this.calculateEfficiency(userActions);
    const complexityScore = this.calculateComplexityHandling(userActions);
    const learningScore = profile.learningProgress.improvementRate;

    const totalScore = (diversityScore + efficiencyScore + complexityScore + learningScore) / 4;

    if (totalScore >= 0.8) return 'expert';
    if (totalScore >= 0.6) return 'advanced';
    if (totalScore >= 0.4) return 'intermediate';
    return 'beginner';
  }

  updateUserFeedback(
    userId: string,
    recommendationId: string,
    feedback: 'accepted' | 'rejected' | 'modified' | 'applied'
  ): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Update collaboration style based on feedback
    switch (feedback) {
      case 'accepted':
      case 'applied':
        profile.collaborationStyle.acceptsSuggestions =
          Math.min(1, profile.collaborationStyle.acceptsSuggestions + 0.05);
        break;
      case 'rejected':
        profile.collaborationStyle.acceptsSuggestions =
          Math.max(0, profile.collaborationStyle.acceptsSuggestions - 0.02);
        break;
    }

    profile.lastUpdated = Date.now();
    this.userProfiles.set(userId, profile);
    this.saveToStorage();
  }

  private updateUserProfile(userId: string, action: UserAction): void {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = this.createInitialProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Update various aspects of the profile
    this.updateSkillLevel(profile, action);
    this.updatePreferredNodeTypes(profile, action);
    this.updateWorkflowPatterns(profile, action);
    this.updateParameterTendencies(profile, action);
    this.updateLearningProgress(profile, action);

    profile.lastUpdated = Date.now();
  }

  private createInitialProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      skillLevel: 'beginner',
      preferredNodeTypes: [],
      workflowPatterns: [],
      parameterTendencies: {},
      collaborationStyle: {
        prefersGuidance: true,
        sharesWork: false,
        acceptsSuggestions: 0.5
      },
      learningProgress: {
        areas: [],
        improvementRate: 0,
        recentMilestones: []
      },
      lastUpdated: Date.now()
    };
  }

  private updateSkillLevel(profile: UserBehaviorProfile, action: UserAction): void {
    // Simple heuristic-based skill level updates
    const complexActions = [
      'parameter_change',
      'edge_add',
      'edge_remove'
    ];

    if (complexActions.includes(action.type)) {
      // User is performing complex actions, might be ready for skill level upgrade
      const recentActions = this.actionHistory.filter(
        a => a.userId === profile.userId &&
        Date.now() - a.timestamp < 3600000 // Last hour
      );

      if (recentActions.length > 20) {
        // User is very active, likely improving
        if (profile.skillLevel === 'beginner') {
          profile.skillLevel = 'intermediate';
          profile.learningProgress.recentMilestones.push('Reached Intermediate Level');
        } else if (profile.skillLevel === 'intermediate' && recentActions.length > 50) {
          profile.skillLevel = 'advanced';
          profile.learningProgress.recentMilestones.push('Reached Advanced Level');
        }
      }
    }
  }

  private updatePreferredNodeTypes(profile: UserBehaviorProfile, action: UserAction): void {
    if (action.targetType === 'node' && action.data.nodeType) {
      const nodeType = action.data.nodeType;
      let preference = profile.preferredNodeTypes.find(p => p.nodeType === nodeType);

      if (!preference) {
        preference = {
          nodeType,
          frequency: 0,
          confidence: 0
        };
        profile.preferredNodeTypes.push(preference);
      }

      preference.frequency += 1;
      preference.confidence = Math.min(1, preference.frequency / 10);

      // Keep only top preferences
      profile.preferredNodeTypes.sort((a, b) => b.frequency - a.frequency);
      profile.preferredNodeTypes = profile.preferredNodeTypes.slice(0, 10);
    }
  }

  private updateWorkflowPatterns(profile: UserBehaviorProfile, action: UserAction): void {
    // Analyze sequences of actions to identify workflow patterns
    const recentActions = this.actionHistory.filter(
      a => a.userId === profile.userId &&
      Date.now() - a.timestamp < 300000 // Last 5 minutes
    );

    if (recentActions.length >= 3) {
      const pattern = this.identifyWorkflowPattern(recentActions);
      if (pattern) {
        let existingPattern = profile.workflowPatterns.find(p => p.pattern === pattern);

        if (!existingPattern) {
          existingPattern = {
            pattern,
            frequency: 0,
            avgCompletionTime: 0
          };
          profile.workflowPatterns.push(existingPattern);
        }

        existingPattern.frequency += 1;
        existingPattern.avgCompletionTime =
          (existingPattern.avgCompletionTime + action.context.sessionDuration) / 2;
      }
    }
  }

  private updateParameterTendencies(profile: UserBehaviorProfile, action: UserAction): void {
    if (action.type === 'parameter_change' && action.data.parameter) {
      const param = action.data.parameter;
      const value = action.data.value;

      if (!profile.parameterTendencies[param]) {
        profile.parameterTendencies[param] = {
          averageValue: value,
          variance: 0,
          preferredRange: [value * 0.8, value * 1.2]
        };
      } else {
        const tendency = profile.parameterTendencies[param];
        const newAverage = (tendency.averageValue + value) / 2;
        const newVariance = Math.pow(value - tendency.averageValue, 2);

        tendency.averageValue = newAverage;
        tendency.variance = (tendency.variance + newVariance) / 2;
        tendency.preferredRange = [
          newAverage - Math.sqrt(tendency.variance),
          newAverage + Math.sqrt(tendency.variance)
        ];
      }
    }
  }

  private updateLearningProgress(profile: UserBehaviorProfile, action: UserAction): void {
    // Track areas where user is active and improving
    const learningAreas = [
      'plugin_usage',
      'signal_routing',
      'automation',
      'mixing',
      'music_theory',
      'collaboration'
    ];

    learningAreas.forEach(area => {
      if (this.actionInvolvesArea(action, area)) {
        if (!profile.learningProgress.areas.includes(area)) {
          profile.learningProgress.areas.push(area);
        }
      }
    });

    // Calculate improvement rate
    const recentActions = this.actionHistory.filter(
      a => a.userId === profile.userId &&
      Date.now() - a.timestamp < 86400000 // Last 24 hours
    );

    profile.learningProgress.improvementRate = Math.min(1, recentActions.length / 50);
  }

  private actionInvolvesArea(action: UserAction, area: string): boolean {
    // Simple heuristic to determine if an action involves a learning area
    switch (area) {
      case 'plugin_usage':
        return action.data.nodeType === 'plugin' || action.data.pluginId;
      case 'signal_routing':
        return action.type === 'edge_add' || action.type === 'edge_remove';
      case 'automation':
        return action.type === 'parameter_change';
      case 'mixing':
        return action.data.nodeType === 'mixer' || action.data.category === 'mixing';
      case 'music_theory':
        return action.context.currentView === 'theory';
      case 'collaboration':
        return action.data.collaborative === true;
      default:
        return false;
    }
  }

  private async predictUserNeeds(features: number[]): Promise<number[]> {
    if (!this.model || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const featureTensor = tf.tensor2d([features]);
      const prediction = this.model!.predict(featureTensor) as tf.Tensor;
      const result = await prediction.data();

      featureTensor.dispose();
      prediction.dispose();

      return Array.from(result);
    } catch (error) {
      console.error('Failed to predict user needs:', error);
      return new Array(10).fill(0);
    }
  }

  private extractContextFeatures(
    context: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      sessionDuration: number;
      currentView: 'daw' | 'theory';
    },
    profile: UserBehaviorProfile
  ): number[] {
    const nodeCount = context.nodes.length;
    const edgeCount = context.edges.length;
    const sessionDuration = context.sessionDuration;
    const skillLevel = this.skillLevelToNumber(profile.skillLevel);

    // Node type distribution
    const nodeTypes = new Set(context.nodes.map(n => n.type));

    // Parameter complexity
    const parameterComplexity = context.nodes.reduce((sum, node) => {
      return sum + Object.keys(node.data.parameters || {}).length;
    }, 0);

    // Graph complexity metrics
    const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1) / 2) : 0;

    return [
      nodeCount / 20, // Normalized
      edgeCount / 30, // Normalized
      sessionDuration / 3600000, // Hours
      context.currentView === 'daw' ? 1 : 0,
      nodeTypes.size / 10, // Normalized diversity
      parameterComplexity / 50, // Normalized
      density,
      skillLevel / 3, // Normalized skill level
      profile.collaborationStyle.acceptsSuggestions,
      profile.learningProgress.improvementRate
    ];
  }

  private skillLevelToNumber(skillLevel: string): number {
    switch (skillLevel) {
      case 'beginner': return 0;
      case 'intermediate': return 1;
      case 'advanced': return 2;
      case 'expert': return 3;
      default: return 0;
    }
  }

  private async createRecommendations(
    profile: UserBehaviorProfile,
    predictions: number[],
    context: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      sessionDuration: number;
      currentView: 'daw' | 'theory';
    }
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze predictions to generate recommendations
    const needsComplexity = predictions[0] > 0.6;
    const needsGuidance = predictions[1] > 0.7;
    const needsOptimization = predictions[2] > 0.5;
    const needsLearning = predictions[3] > 0.8;

    if (needsGuidance && profile.skillLevel === 'beginner') {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'learning_resource',
        title: 'Get Started with Basic Workflows',
        description: 'Learn the fundamentals of creating your first audio workflow',
        confidence: predictions[1],
        reasoning: 'Based on your beginner status and recent activity',
        priority: 'high',
        estimatedImpact: 'significant',
        actionItems: [
          {
            type: 'tutorial',
            target: 'basic_workflow',
            parameters: { interactive: true }
          }
        ],
        learningOutcomes: ['Basic node creation', 'Signal routing', 'Plugin usage']
      });
    }

    if (needsComplexity && context.nodes.length < 5) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'node_suggestion',
        title: 'Expand Your Workflow',
        description: 'Add more nodes to create a more complex and interesting audio chain',
        confidence: predictions[0],
        reasoning: 'Your current workflow is simple and could benefit from more complexity',
        priority: 'medium',
        estimatedImpact: 'moderate',
        actionItems: [
          {
            type: 'add_node',
            target: 'plugin',
            parameters: { category: 'effect', suggestedType: 'reverb' }
          }
        ]
      });
    }

    if (needsOptimization && profile.preferredNodeTypes.length > 0) {
      const favoriteType = profile.preferredNodeTypes[0];
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'parameter_optimization',
        title: `Optimize Your ${favoriteType.nodeType} Settings`,
        description: `Based on your usage patterns, here are some optimized parameters for ${favoriteType.nodeType}`,
        confidence: predictions[2],
        reasoning: `You frequently use ${favoriteType.nodeType} - these settings can improve your workflow`,
        priority: 'medium',
        estimatedImpact: 'moderate',
        actionItems: [
          {
            type: 'parameter_change',
            target: favoriteType.nodeType,
            parameters: this.getOptimizedParameters(favoriteType.nodeType, profile)
          }
        ]
      });
    }

    if (needsLearning && profile.learningProgress.areas.length > 0) {
      const nextArea = this.suggestNextLearningArea(profile);
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'learning_resource',
        title: `Learn ${this.formatLearningArea(nextArea)}`,
        description: `Expand your skills by learning about ${this.formatLearningArea(nextArea)}`,
        confidence: predictions[3],
        reasoning: `You've shown progress in current areas and are ready for new challenges`,
        priority: 'low',
        estimatedImpact: 'significant',
        actionItems: [
          {
            type: 'tutorial',
            target: nextArea,
            parameters: { level: profile.skillLevel }
          }
        ],
        learningOutcomes: [this.formatLearningArea(nextArea)]
      });
    }

    return recommendations;
  }

  private generateBeginnerRecommendations(context: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    sessionDuration: number;
    currentView: 'daw' | 'theory';
  }): PersonalizedRecommendation[] {
    return [
      {
        id: this.generateRecommendationId(),
        type: 'node_suggestion',
        title: 'Start with a Simple Audio Chain',
        description: 'Create your first workflow by adding an instrument and effect',
        confidence: 0.9,
        reasoning: 'Perfect starting point for learning the basics',
        priority: 'high',
        estimatedImpact: 'significant',
        actionItems: [
          {
            type: 'add_node',
            target: 'instrument',
            parameters: { category: 'synthesizer' }
          },
          {
            type: 'add_node',
            target: 'effect',
            parameters: { category: 'reverb' }
          }
        ]
      }
    ];
  }

  private identifyWorkflowPattern(actions: UserAction[]): string | null {
    // Simple pattern recognition based on action sequences
    const actionSequence = actions.slice(-5).map(a => a.type).join('->');

    const patterns = {
      'node_add->parameter_change->edge_add->parameter_change': 'building_chain',
      'node_add->node_add->edge_add->edge_add': 'connecting_nodes',
      'parameter_change->parameter_change->parameter_change': 'fine_tuning',
      'edge_add->node_add->edge_add->node_add': 'expanding_network'
    };

    return patterns[actionSequence as keyof typeof patterns] || null;
  }

  private calculateActionDiversity(actions: UserAction[]): number {
    const actionTypes = new Set(actions.map(a => a.type));
    const targetTypes = new Set(actions.map(a => a.targetType));

    return (actionTypes.size / 6 + targetTypes.size / 3) / 2; // Normalized 0-1
  }

  private calculateEfficiency(actions: UserAction[]): number {
    // Simple efficiency metric based on action-to-result ratio
    const successfulActions = actions.filter(a => !a.data.error).length;
    return actions.length > 0 ? successfulActions / actions.length : 0;
  }

  private calculateComplexityHandling(actions: UserAction[]): number {
    // Measure how well user handles complex operations
    const complexActions = actions.filter(a => {
      return a.type === 'edge_add' || a.type === 'parameter_change' ||
             (a.data.parameters && Object.keys(a.data.parameters).length > 3);
    });

    return actions.length > 0 ? complexActions.length / actions.length : 0;
  }

  private suggestNextLearningArea(profile: UserBehaviorProfile): string {
    const allAreas = [
      'plugin_usage',
      'signal_routing',
      'automation',
      'mixing',
      'music_theory',
      'collaboration'
    ];

    const unexploredAreas = allAreas.filter(area =>
      !profile.learningProgress.areas.includes(area)
    );

    return unexploredAreas.length > 0 ? unexploredAreas[0] : 'advanced_techniques';
  }

  private formatLearningArea(area: string): string {
    return area.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getOptimizedParameters(nodeType: string, profile: UserBehaviorProfile): Record<string, any> {
    // Return optimized parameters based on user's historical preferences
    const tendencies = profile.parameterTendencies;

    const commonOptimizations: Record<string, Record<string, any>> = {
      'reverb': {
        decay: tendencies.reverb_decay?.averageValue || 2.5,
        mix: tendencies.reverb_mix?.averageValue || 0.3,
        preDelay: tendencies.reverb_predelay?.averageValue || 0.02
      },
      'delay': {
        time: tendencies.delay_time?.averageValue || 0.25,
        feedback: tendencies.delay_feedback?.averageValue || 0.4,
        mix: tendencies.delay_mix?.averageValue || 0.2
      },
      'compressor': {
        threshold: tendencies.compressor_threshold?.averageValue || -12,
        ratio: tendencies.compressor_ratio?.averageValue || 4,
        attack: tendencies.compressor_attack?.averageValue || 0.003,
        release: tendencies.compressor_release?.averageValue || 0.1
      }
    };

    return commonOptimizations[nodeType] || {};
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredData(): void {
    try {
      // Load user profiles
      const profilesData = localStorage.getItem('user_behavior_profiles');
      if (profilesData) {
        const profiles = JSON.parse(profilesData);
        profiles.forEach((profile: UserBehaviorProfile) => {
          this.userProfiles.set(profile.userId, profile);
        });
      }

      // Load action history (limited to recent actions)
      const actionsData = localStorage.getItem('user_action_history');
      if (actionsData) {
        this.actionHistory = JSON.parse(actionsData);
      }
    } catch (error) {
      console.warn('Failed to load stored user behavior data:', error);
    }
  }

  private saveToStorage(): void {
    try {
      // Save user profiles
      const profiles = Array.from(this.userProfiles.values());
      localStorage.setItem('user_behavior_profiles', JSON.stringify(profiles));

      // Save action history (limited to recent actions)
      const recentActions = this.actionHistory.slice(-5000); // Keep last 5000 actions
      localStorage.setItem('user_action_history', JSON.stringify(recentActions));
    } catch (error) {
      console.warn('Failed to save user behavior data:', error);
    }
  }

  // Public methods for accessing data
  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }

  getUserActions(userId: string, limit = 100): UserAction[] {
    return this.actionHistory
      .filter(action => action.userId === userId)
      .slice(-limit);
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default UserBehaviorAnalyzer;