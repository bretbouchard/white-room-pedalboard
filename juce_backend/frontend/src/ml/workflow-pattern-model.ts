import * as tf from '@tensorflow/tfjs';
import type { FlowNode, FlowEdge } from '@/types/flow';

//================================================================================================
// Workflow Pattern Recognition Model
//================================================================================================

export interface WorkflowPattern {
  id: string;
  name: string;
  frequency: number;
  confidence: number;
  nodeTypes: string[];
  connectionPatterns: Array<{
    sourceType: string;
    targetType: string;
    frequency: number;
  }>;
  typicalContexts: string[];
  userPreferences: Record<string, any>;
}

export interface WorkflowFeatures {
  nodeCount: number;
  edgeCount: number;
  nodeTypeDistribution: Record<string, number>;
  connectionMatrix: number[][];
  cyclicalComplexity: number;
  avgPathLength: number;
  density: number;
  modularity: number;
  musicalStyle?: string;
  tempo?: number;
  key?: string;
}

export class WorkflowPatternModel {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private patternHistory: WorkflowPattern[] = [];
  private featureExtractor: FeatureExtractor;

  constructor() {
    this.featureExtractor = new FeatureExtractor();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create a neural network for pattern recognition
      this.model = tf.sequential({
        layers: [
          // Input layer - adjusted for our feature size
          tf.layers.dense({
            inputShape: [50], // Adjusted feature size
            units: 128,
            activation: 'relu',
            name: 'input_layer'
          }),

          // Hidden layers with dropout for regularization
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 64,
            activation: 'relu',
            name: 'hidden_layer_1'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'hidden_layer_2'
          }),

          // Output layer - pattern classification
          tf.layers.dense({
            units: 20, // Number of pattern categories
            activation: 'softmax',
            name: 'output_layer'
          })
        ]
      });

      // Compile the model
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      });

      this.isInitialized = true;
      console.log('Workflow pattern model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize workflow pattern model:', error);
      throw error;
    }
  }

  extractFeatures(nodes: FlowNode[], edges: FlowEdge[]): WorkflowFeatures {
    return this.featureExtractor.extract(nodes, edges);
  }

  async recognizePattern(features: WorkflowFeatures): Promise<WorkflowPattern[]> {
    if (!this.model || !this.isInitialized) {
      await this.initialize();
    }

    try {
      // Convert features to tensor
      const featureVector = this.featuresToTensor(features);

      // Make prediction
      const prediction = this.model!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data() as Float32Array;

      // Convert probabilities to pattern predictions
      const patterns = this.decodePredictions(probabilities, features);

      // Clean up tensors
      featureVector.dispose();
      prediction.dispose();

      return patterns;
    } catch (error) {
      console.error('Pattern recognition failed:', error);
      return [];
    }
  }

  async learnFromFeedback(
    features: WorkflowFeatures,
    userAccepted: boolean,
    patternId: string
  ): Promise<void> {
    // This would implement online learning from user feedback
    // For now, we'll store the feedback for later batch training
    const feedback = {
      features,
      userAccepted,
      patternId,
      timestamp: Date.now()
    };

    // Store feedback for later training
    this.storeFeedback(feedback);
  }

  private featuresToTensor(features: WorkflowFeatures): tf.Tensor {
    // Convert workflow features to a fixed-size tensor
    const vector = [
      // Basic graph metrics
      features.nodeCount / 50, // Normalized node count
      features.edgeCount / 100, // Normalized edge count
      features.density,
      features.cyclicalComplexity / 10,
      features.avgPathLength / 20,
      features.modularity,

      // Node type distribution (one-hot encoded for common types)
      ...this.encodeNodeTypes(features.nodeTypeDistribution),

      // Musical context features
      features.tempo ? features.tempo / 200 : 0,
      features.key ? this.encodeKey(features.key) : 0,

      // Padding to reach expected size
      ...new Array(50 - 20).fill(0) // Adjust based on actual vector size
    ];

    return tf.tensor2d([vector]);
  }

  private encodeNodeTypes(distribution: Record<string, number>): number[] {
    // Common node types in our system
    const nodeTypes = [
      'track', 'section', 'plugin', 'audio', 'midi',
      'effect', 'instrument', 'mixer', 'controller', 'analyzer'
    ];

    return nodeTypes.map(type => distribution[type] || 0);
  }

  private encodeKey(key: string): number {
    // Simple key encoding (0-11 for chromatic keys)
    const keyMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    return (keyMap[key] || 0) / 11; // Normalize to 0-1
  }

  private decodePredictions(
    probabilities: Float32Array,
    features: WorkflowFeatures
  ): WorkflowPattern[] {
    // Convert model output to pattern predictions
    const patterns: WorkflowPattern[] = [];

    // Define pattern templates (in a real system, these would be learned)
    const patternTemplates = [
      {
        name: 'Basic Recording Chain',
        nodeTypes: ['instrument', 'audio', 'effect', 'mixer'],
        contexts: ['recording', 'live_performance']
      },
      {
        name: 'Mixing Session',
        nodeTypes: ['track', 'plugin', 'effect', 'mixer', 'analyzer'],
        contexts: ['mixing', 'mastering']
      },
      {
        name: 'Electronic Production',
        nodeTypes: ['midi', 'instrument', 'plugin', 'effect'],
        contexts: ['electronic', 'edm', 'synthesis']
      },
      {
        name: 'Film Scoring',
        nodeTypes: ['section', 'instrument', 'controller', 'mixer'],
        contexts: ['film', 'orchestral', 'cinematic']
      }
    ];

    // Get top predictions
    const topIndices = Array.from(probabilities)
      .map((prob, index) => ({ prob, index }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);

    topIndices.forEach(({ prob, index }) => {
      if (prob > 0.1 && index < patternTemplates.length) {
        const template = patternTemplates[index];
        patterns.push({
          id: `pattern_${index}_${Date.now()}`,
          name: template.name,
          frequency: prob,
          confidence: prob,
          nodeTypes: template.nodeTypes,
          connectionPatterns: this.analyzeConnectionPatterns(features),
          typicalContexts: template.contexts,
          userPreferences: {}
        });
      }
    });

    return patterns;
  }

  private analyzeConnectionPatterns(features: WorkflowFeatures): Array<{
    sourceType: string;
    targetType: string;
    frequency: number;
  }> {
    // Simplified connection pattern analysis
    // In a real implementation, this would analyze the actual connection graph
    return [
      {
        sourceType: 'instrument',
        targetType: 'effect',
        frequency: features.density
      },
      {
        sourceType: 'effect',
        targetType: 'mixer',
        frequency: features.density * 0.8
      }
    ];
  }

  private storeFeedback(feedback: any): void {
    // Store feedback in localStorage for later training
    try {
      const existing = localStorage.getItem('workflow_ml_feedback') || '[]';
      const feedbackHistory = JSON.parse(existing);
      feedbackHistory.push(feedback);

      // Keep only last 1000 feedback entries
      if (feedbackHistory.length > 1000) {
        feedbackHistory.splice(0, feedbackHistory.length - 1000);
      }

      localStorage.setItem('workflow_ml_feedback', JSON.stringify(feedbackHistory));
    } catch (error) {
      console.warn('Failed to store ML feedback:', error);
    }
  }

  getModel(): tf.LayersModel | null {
    return this.model;
  }

  isModelReady(): boolean {
    return this.isInitialized && this.model !== null;
  }
}

//================================================================================================
// Feature Extraction Helper
//================================================================================================

class FeatureExtractor {
  extract(nodes: FlowNode[], edges: FlowEdge[]): WorkflowFeatures {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    // Node type distribution
    const nodeTypeDistribution: Record<string, number> = {};
    nodes.forEach(node => {
      nodeTypeDistribution[node.type] = (nodeTypeDistribution[node.type] || 0) + 1;
    });

    // Graph density
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Basic cyclical complexity estimation
    const cyclicalComplexity = this.calculateCyclicalComplexity(nodes, edges);

    // Average path length (simplified)
    const avgPathLength = this.calculateAveragePathLength(nodes, edges);

    // Modularity (simplified community detection)
    const modularity = this.calculateModularity(nodes, edges);

    return {
      nodeCount,
      edgeCount,
      nodeTypeDistribution,
      connectionMatrix: this.buildConnectionMatrix(nodes, edges),
      cyclicalComplexity,
      avgPathLength,
      density,
      modularity
    };
  }

  private calculateCyclicalComplexity(nodes: FlowNode[], edges: FlowEdge[]): number {
    // Simplified cycle detection - count potential cycles
    let cycleCount = 0;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    edges.forEach(edge => {
      // Look for back edges that could form cycles
      if (nodeMap.has(edge.target) && nodeMap.has(edge.source)) {
        const sourceNode = nodeMap.get(edge.source)!;
        const targetNode = nodeMap.get(edge.target)!;

        // Simple heuristic: if target appears before source in some ordering
        if (nodes.indexOf(targetNode) < nodes.indexOf(sourceNode)) {
          cycleCount++;
        }
      }
    });

    return cycleCount;
  }

  private calculateAveragePathLength(nodes: FlowNode[], edges: FlowEdge[]): number {
    // Simplified average path length calculation
    if (nodes.length < 2) return 0;

    let totalPathLength = 0;
    let pathCount = 0;

    // Sample a few node pairs and calculate shortest paths
    const sampleSize = Math.min(10, nodes.length);
    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        const pathLength = this.calculateShortestPath(
          nodes[i],
          nodes[j],
          edges,
          nodes
        );
        if (pathLength > 0) {
          totalPathLength += pathLength;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  private calculateShortestPath(
    source: FlowNode,
    target: FlowNode,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): number {
    // Simple BFS-based shortest path
    const visited = new Set<string>();
    const queue: Array<{node: FlowNode, distance: number}> = [
      {node: source, distance: 0}
    ];
    visited.add(source.id);

    while (queue.length > 0) {
      const {node, distance} = queue.shift()!;

      if (node.id === target.id) {
        return distance;
      }

      // Find neighbors
      const neighbors = edges
        .filter(e => e.source === node.id || e.target === node.id)
        .map(e => e.source === node.id ? e.target : e.source)
        .filter(id => !visited.has(id))
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean) as FlowNode[];

      neighbors.forEach(neighbor => {
        visited.add(neighbor.id);
        queue.push({node: neighbor, distance: distance + 1});
      });
    }

    return 0; // No path found
  }

  private calculateModularity(nodes: FlowNode[], edges: FlowEdge[]): number {
    // Simplified modularity calculation
    // In a real implementation, this would use proper community detection
    const nodeTypes = new Set(nodes.map(n => n.type));
    if (nodeTypes.size <= 1) return 0;

    let intraTypeEdges = 0;
    const totalEdges = edges.length;

    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode && sourceNode.type === targetNode.type) {
        intraTypeEdges++;
      }
    });

    return totalEdges > 0 ? intraTypeEdges / totalEdges : 0;
  }

  private buildConnectionMatrix(nodes: FlowNode[], edges: FlowEdge[]): number[][] {
    const size = nodes.length;
    const matrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));

    const nodeIndexMap = new Map(nodes.map((node, index) => [node.id, index]));

    edges.forEach(edge => {
      const sourceIndex = nodeIndexMap.get(edge.source);
      const targetIndex = nodeIndexMap.get(edge.target);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = 1;
      }
    });

    return matrix;
  }
}

export default WorkflowPatternModel;