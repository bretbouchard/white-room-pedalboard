import * as tf from '@tensorflow/tfjs';
import { MusicalFeatures, MusicalStyle } from './musical-intelligence';

//================================================================================================
// Structural and Form Analysis System
//================================================================================================

export interface MusicalSection {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
  duration: number;
  type: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro' | 'instrumental' | 'solo' | 'breakdown';
  characteristics: {
    harmonicStability: number;
    melodicComplexity: number;
    rhythmicIntensity: number;
    dynamicProfile: number;
    orchestralDensity: number;
  };
  key?: string;
  tempo?: number;
  timeSignature?: [number, number];
  confidence: number;
}

export interface MusicalForm {
  id: string;
  name: string;
  type: 'binary' | 'ternary' | 'sonata' | 'rondo' | 'verse-chorus' | 'strophic' | 'theme-variations' | 'through-composed';
  sections: MusicalSection[];
  structure: string[];
  characteristics: {
    complexity: number;
    predictability: number;
    balance: number;
    coherence: number;
  };
  confidence: number;
  analysis: {
    repetitionPatterns: Array<{
      pattern: string[];
      locations: number[][];
      strength: number;
    }>;
    harmonicProgression: string[];
    keyChanges: Array<{
      fromKey: string;
      toKey: string;
      location: number;
      type: 'direct' | 'pivot' | 'relative';
    }>;
    developmentalTechniques: string[];
  };
}

export interface StructuralFeatures {
  sectionBoundaries: number[];
  repetitionMatrix: number[][];
  harmonicTrajectory: number[];
  melodicMotifs: Array<{
    motif: number[];
    occurrences: number[][];
    variation: number;
  }>;
  rhythmicPatterns: Array<{
    pattern: number[];
    frequency: number;
    locations: number[];
  }>;
  tonalStability: number[];
  dynamicProfile: number[];
  orchestralChanges: number[];
}

export class StructuralAnalyzer {
  private formClassifier: tf.LayersModel | null = null;
  private sectionDetector: tf.LayersModel | null = null;
  private isInitialized = false;
  private formDatabase: MusicalForm[] = [];
  private knownForms: Record<string, any> = {};

  constructor() {
    this.initializeFormDatabase();
    this.initializeKnownForms();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize form classification model
      this.formClassifier = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [64], // Structural feature vector
            units: 128,
            activation: 'relu',
            name: 'form_input'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 64,
            activation: 'relu',
            name: 'form_hidden_1'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'form_hidden_2'
          }),
          tf.layers.dense({
            units: 8, // Number of form types
            activation: 'softmax',
            name: 'form_output'
          })
        ]
      });

      this.formClassifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Initialize section detection model
      this.sectionDetector = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 64,
            returnSequences: true,
            inputShape: [null, 32], // Variable length sequence
            name: 'section_lstm_1'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({
            units: 32,
            returnSequences: true,
            name: 'section_lstm_2'
          }),
          tf.layers.timeDistributed({
            layer: tf.layers.dense({
              units: 9, // Number of section types
              activation: 'softmax',
              name: 'section_output'
            })
          })
        ]
      });

      this.sectionDetector.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.isInitialized = true;
      console.log('Structural analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize structural analyzer:', error);
      throw error;
    }
  }

  async analyzeMusicalForm(
    features: MusicalFeatures[],
    context: {
      key?: string;
      tempo?: number;
      timeSignature?: [number, number];
      style?: string;
    }
  ): Promise<MusicalForm> {
    if (!this.formClassifier || !this.isInitialized) {
      await this.initialize();
    }

    try {
      // Extract structural features
      const structuralFeatures = this.extractStructuralFeatures(features);

      // Analyze form using neural network
      const formType = await this.classifyForm(structuralFeatures);

      // Detect sections
      const sections = await this.detectSections(features, structuralFeatures);

      // Analyze form characteristics
      const formCharacteristics = this.analyzeFormCharacteristics(sections, structuralFeatures);

      // Create comprehensive form analysis
      const form: MusicalForm = {
        id: this.generateFormId(),
        name: this.inferFormName(formType, sections),
        type: formType,
        sections,
        structure: this.extractStructurePattern(sections),
        characteristics: formCharacteristics,
        confidence: this.calculateFormConfidence(formType, sections),
        analysis: this.performDetailedAnalysis(sections, structuralFeatures, context)
      };

      return form;
    } catch (error) {
      console.error('Musical form analysis failed:', error);
      return this.createFallbackForm(features, context);
    }
  }

  private extractStructuralFeatures(features: MusicalFeatures[]): StructuralFeatures {
    // Extract comprehensive structural features from the musical data
    const sectionBoundaries = this.detectSectionBoundaries(features);
    const repetitionMatrix = this.buildRepetitionMatrix(features);
    const harmonicTrajectory = this.extractHarmonicTrajectory(features);
    const melodicMotifs = this.extractMelodicMotifs(features);
    const rhythmicPatterns = this.extractRhythmicPatterns(features);
    const tonalStability = this.calculateTonalStability(features);
    const dynamicProfile = this.extractDynamicProfile(features);
    const orchestralChanges = this.detectOrchestralChanges(features);

    return {
      sectionBoundaries,
      repetitionMatrix,
      harmonicTrajectory,
      melodicMotifs,
      rhythmicPatterns,
      tonalStability,
      dynamicProfile,
      orchestralChanges
    };
  }

  private async classifyForm(features: StructuralFeatures): Promise<MusicalForm['type']> {
    // Use neural network to classify the overall form
    const featureVector = this.structuralFeaturesToTensor(features);

    try {
      const prediction = this.formClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data();

      const formTypes: MusicalForm['type'][] = [
        'binary', 'ternary', 'sonata', 'rondo', 'verse-chorus',
        'strophic', 'theme-variations', 'through-composed'
      ];

      const maxIndex = Array.from(probabilities).indexOf(Math.max(...probabilities));
      const formType = formTypes[maxIndex] || 'verse-chorus';

      featureVector.dispose();
      prediction.dispose();

      return formType;
    } catch (error) {
      console.warn('Neural form classification failed, using heuristic analysis:', error);
      return this.heuristicFormClassification(features);
    }
  }

  private async detectSections(
    features: MusicalFeatures[],
    structuralFeatures: StructuralFeatures
  ): Promise<MusicalSection[]> {
    // Use neural network to detect section boundaries
    const sectionSequence = this.prepareSectionSequence(features);
    const sectionFeatures = this.sequenceToTensor(sectionSequence);

    try {
      const prediction = this.sectionDetector!.predict(sectionFeatures) as tf.Tensor;
      const output = await prediction.data() as Float32Array;

      const sections = this.decodeSectionPredictions(output, features, structuralFeatures);

      sectionFeatures.dispose();
      prediction.dispose();

      return sections;
    } catch (error) {
      console.warn('Neural section detection failed, using boundary detection:', error);
      return this.detectSectionsFromBoundaries(structuralFeatures.sectionBoundaries, features);
    }
  }

  private structuralFeaturesToTensor(features: StructuralFeatures): tf.Tensor {
    // Convert structural features to fixed-size tensor for neural network
    const vector = [
      // Repetition patterns (first 16 values from matrix)
      ...features.repetitionMatrix.flat().slice(0, 16),

      // Harmonic trajectory statistics
      this.calculateHarmonicStats(features.harmonicTrajectory),

      // Motif complexity metrics
      this.calculateMotifComplexity(features.melodicMotifs),

      // Rhythmic regularity
      this.calculateRhythmicRegularity(features.rhythmicPatterns),

      // Tonal stability profile
      this.calculateTonalStabilityProfile(features.tonalStability),

      // Dynamic variation
      this.calculateDynamicVariation(features.dynamicProfile),

      // Orchestral changes
      features.orchestralChanges.length,

      // Form complexity indicators
      this.calculateFormComplexity(features),

      // Padding to reach expected size
      ...new Array(64 - 16).fill(0)
    ];

    return tf.tensor2d([vector]);
  }

  private detectSectionBoundaries(features: MusicalFeatures[]): number[] {
    // Detect potential section boundaries using change point detection
    const boundaries: number[] = [0]; // Always start with boundary at beginning

    if (features.length < 2) return boundaries;

    // Analyze changes in various musical parameters
    const changes = this.calculateParameterChanges(features);

    // Find significant change points
    for (let i = 1; i < features.length - 1; i++) {
      if (this.isSignificantChange(changes[i])) {
        boundaries.push(i);
      }
    }

    // Add final boundary
    boundaries.push(features.length - 1);

    return boundaries;
  }

  private calculateParameterChanges(features: MusicalFeatures[]): number[] {
    const changes: number[] = [0]; // No change at start

    for (let i = 1; i < features.length; i++) {
      const prev = features[i - 1];
      const curr = features[i];

      // Calculate overall change magnitude
      const tempoChange = Math.abs(curr.tempo - prev.tempo) / prev.tempo;
      const harmonicChange = Math.abs(curr.harmonicComplexity - prev.harmonicComplexity);
      const rhythmicChange = Math.abs(curr.rhythmicComplexity - prev.rhythmicComplexity);
      const dynamicChange = Math.abs(curr.dynamics.attack - prev.dynamics.attack);

      // Key change detection (simplified)
      const keyChange = curr.key !== prev.key ? 1 : 0;

      // Time signature change
      const meterChange = (curr.timeSignature[0] !== prev.timeSignature[0] ||
                          curr.timeSignature[1] !== prev.timeSignature[1]) ? 1 : 0;

      const overallChange = (
        tempoChange * 0.3 +
        harmonicChange * 0.3 +
        rhythmicChange * 0.2 +
        dynamicChange * 0.1 +
        keyChange * 0.05 +
        meterChange * 0.05
      );

      changes.push(overallChange);
    }

    return changes;
  }

  private isSignificantChange(changeMagnitude: number): boolean {
    // Determine if a change is significant enough to mark a section boundary
    return changeMagnitude > 0.15; // Threshold for significant change
  }

  private buildRepetitionMatrix(features: MusicalFeatures[]): number[][] {
    // Build a repetition matrix showing similarities between different time points
    const size = Math.min(features.length, 16); // Limit to 16x16 for memory
    const matrix: number[][] = [];

    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        matrix[i][j] = this.calculateSimilarity(features[i], features[j]);
      }
    }

    return matrix;
  }

  private calculateSimilarity(feat1: MusicalFeatures, feat2: MusicalFeatures): number {
    // Calculate similarity between two musical feature sets
    const tempoSimilarity = 1 - Math.abs(feat1.tempo - feat2.tempo) / Math.max(feat1.tempo, feat2.tempo);
    const harmonicSimilarity = 1 - Math.abs(feat1.harmonicComplexity - feat2.harmonicComplexity);
    const rhythmicSimilarity = 1 - Math.abs(feat1.rhythmicComplexity - feat2.rhythmicComplexity);

    // Melodic contour similarity
    const contourSimilarity = this.calculateContourSimilarity(feat1.melodicContour, feat2.melodicContour);

    // Instrumentation similarity
    const instrumentationSimilarity = this.calculateInstrumentationSimilarity(feat1.instrumentation, feat2.instrumentation);

    return (
      tempoSimilarity * 0.25 +
      harmonicSimilarity * 0.25 +
      rhythmicSimilarity * 0.2 +
      contourSimilarity * 0.15 +
      instrumentationSimilarity * 0.15
    );
  }

  private calculateContourSimilarity(contour1: number[], contour2: number[]): number {
    // Calculate similarity between melodic contours
    const minLength = Math.min(contour1.length, contour2.length);
    if (minLength === 0) return 1;

    let similarity = 0;
    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(contour1[i] - contour2[i]);
      similarity += 1 - Math.min(diff / 12, 1); // Normalize to octave range
    }

    return similarity / minLength;
  }

  private calculateInstrumentationSimilarity(inst1: string[], inst2: string[]): number {
    // Calculate similarity between instrument sets
    const set1 = new Set(inst1.map(i => i.toLowerCase()));
    const set2 = new Set(inst2.map(i => i.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private extractHarmonicTrajectory(features: MusicalFeatures[]): number[] {
    // Extract harmonic development over time
    return features.map(f => f.harmonicComplexity);
  }

  private extractMelodicMotifs(features: MusicalFeatures[]): Array<{
    motif: number[];
    occurrences: number[][];
    variation: number;
  }> {
    // Extract repeating melodic motifs using pattern matching
    const motifs: Array<{
      motif: number[];
      occurrences: number[][];
      variation: number;
    }> = [];

    for (let i = 0; i < features.length; i++) {
      const contour = features[i].melodicContour;
      if (contour.length < 3) continue;

      // Find similar contours elsewhere
      const occurrences: number[][] = [];
      for (let j = i + 1; j < features.length; j++) {
        const similarity = this.calculateContourSimilarity(contour, features[j].melodicContour);
        if (similarity > 0.7) {
          occurrences.push([i, j]);
        }
      }

      if (occurrences.length > 0) {
        motifs.push({
          motif: contour,
          occurrences,
          variation: this.calculateMotifVariation(contour, occurrences, features)
        });
      }
    }

    return motifs;
  }

  private calculateMotifVariation(
    motif: number[],
    occurrences: number[][],
    features: MusicalFeatures[]
  ): number {
    // Calculate how much the motif varies across its occurrences
    if (occurrences.length < 2) return 0;

    const variations = occurrences.map(([i, j]) => {
      return this.calculateContourSimilarity(
        features[i].melodicContour,
        features[j].melodicContour
      );
    });

    // Return variation as 1 - average similarity
    return 1 - (variations.reduce((a, b) => a + b, 0) / variations.length);
  }

  private extractRhythmicPatterns(features: MusicalFeatures[]): Array<{
    pattern: number[];
    frequency: number;
    locations: number[];
  }> {
    // Extract recurring rhythmic patterns
    const patterns: Array<{
      pattern: number[];
      frequency: number;
      locations: number[];
    }> = [];

    // Create rhythmic vectors from features (simplified)
    const rhythmicVectors = features.map(f => [
      f.rhythmicComplexity,
      f.timeSignature[0] / f.timeSignature[1],
      f.dynamics.attack,
      f.dynamics.decay
    ]);

    // Find patterns using similarity clustering
    for (let i = 0; i < rhythmicVectors.length; i++) {
      const pattern = rhythmicVectors[i];
      const locations = [i];

      // Find similar patterns
      for (let j = i + 1; j < rhythmicVectors.length; j++) {
        const similarity = this.calculateVectorSimilarity(pattern, rhythmicVectors[j]);
        if (similarity > 0.8) {
          locations.push(j);
        }
      }

      if (locations.length > 1) {
        patterns.push({
          pattern,
          frequency: locations.length / rhythmicVectors.length,
          locations
        });
      }
    }

    return patterns;
  }

  private calculateVectorSimilarity(vec1: number[], vec2: number[]): number {
    // Calculate cosine similarity between two vectors
    if (vec1.length !== vec2.length) return 0;

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private calculateTonalStability(features: MusicalFeatures[]): number[] {
    // Calculate tonal stability over time
    return features.map(f => {
      // Simplified tonal stability calculation
      const chordComplexity = f.chordProgression.length > 0 ?
        1 - (f.chordProgression.length / 8) : 0.5;
      const harmonicComplexity = 1 - f.harmonicComplexity;

      return (chordComplexity + harmonicComplexity) / 2;
    });
  }

  private extractDynamicProfile(features: MusicalFeatures[]): number[] {
    // Extract dynamic changes over time
    return features.map(f => (f.dynamics.attack + f.dynamics.sustain) / 2);
  }

  private detectOrchestralChanges(features: MusicalFeatures[]): number[] {
    // Detect points where instrumentation changes significantly
    const changes: number[] = [];

    for (let i = 1; i < features.length; i++) {
      const similarity = this.calculateInstrumentationSimilarity(
        features[i - 1].instrumentation,
        features[i].instrumentation
      );

      if (similarity < 0.7) {
        changes.push(i);
      }
    }

    return changes;
  }

  private calculateHarmonicStats(trajectory: number[]): number[] {
    // Calculate statistical features of harmonic trajectory
    if (trajectory.length === 0) return [0, 0, 0, 0];

    const mean = trajectory.reduce((a, b) => a + b, 0) / trajectory.length;
    const variance = trajectory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / trajectory.length;
    const min = Math.min(...trajectory);
    const max = Math.max(...trajectory);

    return [mean, variance, min, max];
  }

  private calculateMotifComplexity(motifs: Array<{
    motif: number[];
    occurrences: number[][];
    variation: number;
  }>): number[] {
    // Calculate complexity metrics for motifs
    const totalMotifs = motifs.length;
    const avgVariation = totalMotifs > 0 ?
      motifs.reduce((sum, m) => sum + m.variation, totalMotifs) / totalMotifs : 0;
    const avgLength = totalMotifs > 0 ?
      motifs.reduce((sum, m) => sum + m.motif.length, totalMotifs) / totalMotifs : 0;
    const avgRepetitions = totalMotifs > 0 ?
      motifs.reduce((sum, m) => sum + m.occurrences.length, totalMotifs) / totalMotifs : 0;

    return [totalMotifs, avgVariation, avgLength, avgRepetitions];
  }

  private calculateRhythmicRegularity(patterns: Array<{
    pattern: number[];
    frequency: number;
    locations: number[];
  }>): number[] {
    // Calculate rhythmic regularity metrics
    const totalPatterns = patterns.length;
    const avgFrequency = totalPatterns > 0 ?
      patterns.reduce((sum, p) => sum + p.frequency, totalPatterns) / totalPatterns : 0;
    const mostFrequent = Math.max(...patterns.map(p => p.frequency), 0);
    const patternSpread = totalPatterns > 0 ?
      this.calculatePatternSpread(patterns) : 0;

    return [totalPatterns, avgFrequency, mostFrequent, patternSpread];
  }

  private calculatePatternSpread(patterns: Array<{
    pattern: number[];
    frequency: number;
    locations: number[];
  }>): number {
    // Calculate how evenly distributed patterns are across the piece
    if (patterns.length === 0) return 0;

    const allLocations = patterns.flatMap(p => p.locations);
    const maxLocation = Math.max(...allLocations);
    const minLocation = Math.min(...allLocations);

    return maxLocation > minLocation ? (maxLocation - minLocation) / allLocations.length : 0;
  }

  private calculateTonalStabilityProfile(stability: number[]): number[] {
    // Calculate profile of tonal stability
    if (stability.length === 0) return [0, 0, 0, 0];

    const mean = stability.reduce((a, b) => a + b, 0) / stability.length;
    const variance = stability.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stability.length;
    const min = Math.min(...stability);
    const max = Math.max(...stability);

    return [mean, variance, min, max];
  }

  private calculateDynamicVariation(profile: number[]): number[] {
    // Calculate dynamic variation metrics
    if (profile.length === 0) return [0, 0];

    const mean = profile.reduce((a, b) => a + b, 0) / profile.length;
    const variance = profile.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / profile.length;
    const range = Math.max(...profile) - Math.min(...profile);

    return [mean, variance, range];
  }

  private calculateFormComplexity(features: StructuralFeatures): number[] {
    // Calculate overall form complexity metrics
    const repetitionComplexity = this.calculateRepetitionComplexity(features.repetitionMatrix);
    const sectionComplexity = features.sectionBoundaries.length;
    const motifComplexity = features.melodicMotifs.length;
    const harmonicComplexity = this.calculateHarmonicProgressionComplexity(features.harmonicTrajectory);

    return [repetitionComplexity, sectionComplexity, motifComplexity, harmonicComplexity];
  }

  private calculateRepetitionComplexity(matrix: number[][]): number {
    // Calculate complexity based on repetition patterns
    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix[i].length; j++) {
        totalSimilarity += matrix[i][j];
        count++;
      }
    }

    return count > 0 ? 1 - (totalSimilarity / count) : 0;
  }

  private calculateHarmonicProgressionComplexity(trajectory: number[]): number {
    // Calculate complexity of harmonic progression
    if (trajectory.length < 2) return 0;

    let totalChange = 0;
    for (let i = 1; i < trajectory.length; i++) {
      totalChange += Math.abs(trajectory[i] - trajectory[i - 1]);
    }

    return totalChange / (trajectory.length - 1);
  }

  private heuristicFormClassification(features: StructuralFeatures): MusicalForm['type'] {
    // Fallback heuristic form classification
    const sectionCount = features.sectionBoundaries.length;
    const repetitionLevel = this.calculateOverallRepetition(features.repetitionMatrix);

    if (sectionCount === 2) return 'binary';
    if (sectionCount === 3) return 'ternary';
    if (repetitionLevel > 0.7) return 'verse-chorus';
    if (sectionCount > 5) return 'through-composed';
    if (features.melodicMotifs.length > 3) return 'theme-variations';
    return 'strophic';
  }

  private calculateOverallRepetition(matrix: number[][]): number {
    // Calculate overall repetition level
    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix[i].length; j++) {
        totalSimilarity += matrix[i][j];
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  private prepareSectionSequence(features: MusicalFeatures[]): number[][] {
    // Prepare sequence data for section detection
    return features.map(f => [
      f.tempo / 200, // Normalized tempo
      f.harmonicComplexity,
      f.rhythmicComplexity,
      f.dynamics.attack,
      f.dynamics.decay,
      f.dynamics.sustain,
      f.timeSignature[0] / 8, // Normalized upper signature
      f.timeSignature[1] / 8, // Normalized lower signature
      f.timbre.brightness,
      f.timbre.warmth,
      f.timbre.roughness,
      // Add harmonic features
      ...(f.chordProgression.length > 0 ? [0.8] : [0.2]),
      // Add melodic features
      f.melodicContour.length > 0 ? f.melodicContour[0] / 12 : 0.5,
      f.melodicContour.length > 1 ? f.melodicContour[1] / 12 : 0.5,
      // Padding
      ...new Array(32 - 14).fill(0)
    ]);
  }

  private sequenceToTensor(sequence: number[][]): tf.Tensor {
    // Convert sequence to tensor for neural network
    return tf.tensor3d([sequence]);
  }

  private decodeSectionPredictions(
    output: Float32Array,
    features: MusicalFeatures[],
    structuralFeatures: StructuralFeatures
  ): MusicalSection[] {
    // Decode neural network output into section predictions
    const sectionTypes: MusicalSection['type'][] = [
      'intro', 'verse', 'pre-chorus', 'chorus', 'bridge',
      'outro', 'instrumental', 'solo', 'breakdown'
    ];

    const sections: MusicalSection[] = [];
    const sequenceLength = features.length;

    for (let i = 0; i < sequenceLength; i++) {
      const startIndex = i * sectionTypes.length;
      const sectionScores = Array.from(output.slice(startIndex, startIndex + sectionTypes.length));

      // Find most likely section type
      const maxScore = Math.max(...sectionScores);
      const sectionTypeIndex = sectionScores.indexOf(maxScore);

      if (maxScore > 0.5) { // Confidence threshold
        const sectionType = sectionTypes[sectionTypeIndex];

        // Check if this is a new section or continuation
        const lastSection = sections[sections.length - 1];

        if (!lastSection || lastSection.type !== sectionType ||
            (i - lastSection.endIndex) > 4) { // Gap threshold

          sections.push({
            id: this.generateSectionId(),
            name: this.generateSectionName(sectionType, sections.length),
            startIndex: i,
            endIndex: i, // Will be updated later
            duration: 1,
            type: sectionType,
            characteristics: this.calculateSectionCharacteristics(features[i]),
            key: features[i].key,
            tempo: features[i].tempo,
            timeSignature: features[i].timeSignature,
            confidence: maxScore
          });
        } else {
          // Extend existing section
          lastSection.endIndex = i;
          lastSection.duration = i - lastSection.startIndex + 1;
        }
      }
    }

    // Merge very short sections with neighbors
    return this.mergeShortSections(sections);
  }

  private calculateSectionCharacteristics(features: MusicalFeatures): MusicalSection['characteristics'] {
    // Calculate characteristics for a section
    return {
      harmonicStability: this.calculateLocalHarmonicStability(features),
      melodicComplexity: this.calculateLocalMelodicComplexity(features),
      rhythmicIntensity: features.rhythmicComplexity,
      dynamicProfile: (features.dynamics.attack + features.dynamics.sustain) / 2,
      orchestralDensity: features.instrumentation.length / 10 // Normalize
    };
  }

  private calculateLocalHarmonicStability(features: MusicalFeatures): number {
    // Calculate harmonic stability for a single feature set
    if (features.chordProgression.length === 0) return 0.5;

    // Simple stability based on chord progression
    return Math.max(0, 1 - (features.chordProgression.length / 8));
  }

  private calculateLocalMelodicComplexity(features: MusicalFeatures): number {
    // Calculate melodic complexity for a single feature set
    if (features.melodicContour.length < 2) return 0;

    let totalChange = 0;
    for (let i = 1; i < features.melodicContour.length; i++) {
      totalChange += Math.abs(features.melodicContour[i] - features.melodicContour[i - 1]);
    }

    return totalChange / (features.melodicContour.length - 1);
  }

  private mergeShortSections(sections: MusicalSection[]): MusicalSection[] {
    // Merge sections that are too short
    const minLength = 4; // Minimum section length
    const merged: MusicalSection[] = [];

    for (let i = 0; i < sections.length; i++) {
      const current = sections[i];

      if (current.duration < minLength && merged.length > 0) {
        // Merge with previous section
        const previous = merged[merged.length - 1];
        previous.endIndex = current.endIndex;
        previous.duration = current.endIndex - previous.startIndex + 1;
        previous.confidence = Math.max(previous.confidence, current.confidence);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  private detectSectionsFromBoundaries(
    boundaries: number[],
    features: MusicalFeatures[]
  ): MusicalSection[] {
    // Fallback section detection using boundaries
    const sections: MusicalSection[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const startIndex = boundaries[i];
      const endIndex = boundaries[i + 1];

      sections.push({
        id: this.generateSectionId(),
        name: `Section ${i + 1}`,
        startIndex,
        endIndex,
        duration: endIndex - startIndex + 1,
        type: this.inferSectionType(features.slice(startIndex, endIndex + 1)),
        characteristics: this.calculateAverageCharacteristics(features.slice(startIndex, endIndex + 1)),
        key: features[startIndex].key,
        tempo: features[startIndex].tempo,
        timeSignature: features[startIndex].timeSignature,
        confidence: 0.7 // Default confidence for boundary detection
      });
    }

    return sections;
  }

  private inferSectionType(sectionFeatures: MusicalFeatures[]): MusicalSection['type'] {
    // Infer section type based on characteristics
    const avgComplexity = sectionFeatures.reduce((sum, f) =>
      sum + f.harmonicComplexity + f.rhythmicComplexity, 0) / (sectionFeatures.length * 2);

    const avgDynamic = sectionFeatures.reduce((sum, f) =>
      sum + (f.dynamics.attack + f.dynamics.sustain) / 2, 0) / sectionFeatures.length;

    if (avgComplexity > 0.7 && avgDynamic > 0.7) return 'chorus';
    if (avgComplexity > 0.5) return 'verse';
    if (avgComplexity < 0.3) return 'intro';
    if (avgDynamic < 0.3) return 'outro';
    return 'bridge';
  }

  private calculateAverageCharacteristics(features: MusicalFeatures[]): MusicalSection['characteristics'] {
    // Calculate average characteristics for a section
    const characteristics = features.reduce((acc, f) => ({
      harmonicStability: acc.harmonicStability + this.calculateLocalHarmonicStability(f),
      melodicComplexity: acc.melodicComplexity + this.calculateLocalMelodicComplexity(f),
      rhythmicIntensity: acc.rhythmicIntensity + f.rhythmicComplexity,
      dynamicProfile: acc.dynamicProfile + (f.dynamics.attack + f.dynamics.sustain) / 2,
      orchestralDensity: acc.orchestralDensity + (f.instrumentation.length / 10)
    }), {
      harmonicStability: 0,
      melodicComplexity: 0,
      rhythmicIntensity: 0,
      dynamicProfile: 0,
      orchestralDensity: 0
    });

    const count = features.length;
    return {
      harmonicStability: characteristics.harmonicStability / count,
      melodicComplexity: characteristics.melodicComplexity / count,
      rhythmicIntensity: characteristics.rhythmicIntensity / count,
      dynamicProfile: characteristics.dynamicProfile / count,
      orchestralDensity: characteristics.orchestralDensity / count
    };
  }

  private analyzeFormCharacteristics(
    sections: MusicalSection[],
    features: StructuralFeatures
  ): MusicalForm['characteristics'] {
    // Analyze overall form characteristics
    return {
      complexity: this.calculateFormComplexityFromSections(sections),
      predictability: this.calculatePredictability(features),
      balance: this.calculateBalance(sections),
      coherence: this.calculateCoherence(sections, features)
    };
  }

  private calculateFormComplexityFromSections(sections: MusicalSection[]): number {
    // Calculate complexity based on section variety
    const uniqueTypes = new Set(sections.map(s => s.type)).size;
    const sectionCount = sections.length;
    const avgDuration = sections.reduce((sum, s) => sum + s.duration, 0) / sectionCount;

    return (uniqueTypes / 9) * (sectionCount / 10) * (1 / avgDuration);
  }

  private calculatePredictability(features: StructuralFeatures): number {
    // Calculate how predictable the form is based on repetition
    return this.calculateOverallRepetition(features.repetitionMatrix);
  }

  private calculateBalance(sections: MusicalSection[]): number {
    // Calculate formal balance
    const midpoint = sections.length / 2;
    const firstHalf = sections.slice(0, Math.ceil(midpoint));
    const secondHalf = sections.slice(Math.floor(midpoint));

    // Simple balance calculation based on duration similarity
    const firstHalfDuration = firstHalf.reduce((sum, s) => sum + s.duration, 0);
    const secondHalfDuration = secondHalf.reduce((sum, s) => sum + s.duration, 0);

    const totalDuration = firstHalfDuration + secondHalfDuration;
    return totalDuration > 0 ? 1 - Math.abs(firstHalfDuration - secondHalfDuration) / totalDuration : 1;
  }

  private calculateCoherence(
    sections: MusicalSection[],
    features: StructuralFeatures
  ): number {
    // Calculate how coherent the form is
    const tonalCoherence = this.calculateTonalCoherence(features);
    const structuralCoherence = this.calculateStructuralCoherence(sections);

    return (tonalCoherence + structuralCoherence) / 2;
  }

  private calculateTonalCoherence(features: StructuralFeatures): number {
    // Calculate tonal coherence across the piece
    const stabilityVariance = this.calculateVariance(features.tonalStability);
    return Math.max(0, 1 - stabilityVariance);
  }

  private calculateStructuralCoherence(sections: MusicalSection[]): number {
    // Calculate structural coherence based on section relationships
    if (sections.length < 2) return 1;

    let coherence = 0;
    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1];
      const curr = sections[i];

      // Check for logical transitions
      if (this.isLogicalTransition(prev.type, curr.type)) {
        coherence += 1;
      }
    }

    return coherence / (sections.length - 1);
  }

  private isLogicalTransition(fromType: MusicalSection['type'], toType: MusicalSection['type']): boolean {
    // Define logical transitions between section types
    const logicalTransitions: Record<MusicalSection['type'], MusicalSection['type'][]> = {
      'intro': ['verse', 'instrumental'],
      'verse': ['pre-chorus', 'chorus', 'bridge'],
      'pre-chorus': ['chorus'],
      'chorus': ['verse', 'bridge', 'outro'],
      'bridge': ['verse', 'chorus', 'solo'],
      'solo': ['verse', 'chorus', 'outro'],
      'instrumental': ['verse', 'chorus', 'bridge'],
      'breakdown': ['chorus', 'outro'],
      'outro': []
    };

    return logicalTransitions[fromType]?.includes(toType) || false;
  }

  private calculateVariance(values: number[]): number {
    // Calculate variance of an array of numbers
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private inferFormName(formType: MusicalForm['type'], sections: MusicalSection[]): string {
    // Generate appropriate form name
    const typeNames: Record<MusicalSection['type'], string> = {
      'intro': 'Introduction',
      'verse': 'Verse',
      'pre-chorus': 'Pre-Chorus',
      'chorus': 'Chorus',
      'bridge': 'Bridge',
      'outro': 'Outro',
      'instrumental': 'Instrumental',
      'solo': 'Solo',
      'breakdown': 'Breakdown'
    };

    const formNames: Record<MusicalForm['type'], string> = {
      'binary': 'Binary Form',
      'ternary': 'Ternary Form',
      'sonata': 'Sonata Form',
      'rondo': 'Rondo Form',
      'verse-chorus': 'Verse-Chorus Form',
      'strophic': 'Strophic Form',
      'theme-variations': 'Theme and Variations',
      'through-composed': 'Through-Composed'
    };

    const structure = sections.map(s => typeNames[s.type]).join(' - ');
    return `${formNames[formType]} (${structure})`;
  }

  private extractStructurePattern(sections: MusicalSection[]): string[] {
    // Extract the pattern of section types
    return sections.map(s => s.type);
  }

  private calculateFormConfidence(
    formType: MusicalForm['type'],
    sections: MusicalSection[]
  ): number {
    // Calculate confidence in the form analysis
    const sectionConfidence = sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length;
    const structureCoherence = this.calculateStructuralCoherence(sections);

    return (sectionConfidence + structureCoherence) / 2;
  }

  private performDetailedAnalysis(
    sections: MusicalSection[],
    features: StructuralFeatures,
    context: { key?: string; tempo?: number; timeSignature?: [number, number]; style?: string }
  ): MusicalForm['analysis'] {
    // Perform detailed analysis of the form
    return {
      repetitionPatterns: this.analyzeRepetitionPatterns(features),
      harmonicProgression: this.extractHarmonicProgression(sections, context),
      keyChanges: this.detectKeyChanges(sections),
      developmentalTechniques: this.identifyDevelopmentalTechniques(sections, features)
    };
  }

  private analyzeRepetitionPatterns(features: StructuralFeatures): Array<{
    pattern: string[];
    locations: number[][];
    strength: number;
  }> {
    // Analyze repetition patterns in the music
    const patterns: Array<{
      pattern: string[];
      locations: number[][];
      strength: number;
    }> = [];

    // Find patterns in motifs
    features.melodicMotifs.forEach((motif, index) => {
      if (motif.occurrences.length > 1) {
        patterns.push({
          pattern: motif.motif.map(n => `n${n}`),
          locations: motif.occurrences,
          strength: 1 - motif.variation
        });
      }
    });

    return patterns;
  }

  private extractHarmonicProgression(
    sections: MusicalSection[],
    context: { key?: string; style?: string }
  ): string[] {
    // Extract harmonic progression through sections
    const progression: string[] = [];
    const baseKey = context.key || 'C';

    sections.forEach((section, index) => {
      if (section.key && section.key !== baseKey) {
        progression.push(`${section.key} (${section.type})`);
      } else {
        progression.push(section.type);
      }
    });

    return progression;
  }

  private detectKeyChanges(sections: MusicalSection[]): Array<{
    fromKey: string;
    toKey: string;
    location: number;
    type: 'direct' | 'pivot' | 'relative';
  }> {
    // Detect key changes between sections
    const keyChanges: Array<{
      fromKey: string;
      toKey: string;
      location: number;
      type: 'direct' | 'pivot' | 'relative';
    }> = [];

    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1];
      const curr = sections[i];

      if (prev.key && curr.key && prev.key !== curr.key) {
        keyChanges.push({
          fromKey: prev.key,
          toKey: curr.key,
          location: i,
          type: this.classifyKeyChange(prev.key, curr.key)
        });
      }
    }

    return keyChanges;
  }

  private classifyKeyChange(fromKey: string, toKey: string): 'direct' | 'pivot' | 'relative' {
    // Classify the type of key change
    // Simplified classification - in a real implementation, this would use music theory
    return 'direct'; // Simplified
  }

  private identifyDevelopmentalTechniques(
    sections: MusicalSection[],
    features: StructuralFeatures
  ): string[] {
    // Identify developmental techniques used in the music
    const techniques: string[] = [];

    // Check for variation techniques
    if (features.melodicMotifs.some(m => m.variation > 0.3)) {
      techniques.push('Melodic Variation');
    }

    // Check for repetition techniques
    if (features.rhythmicPatterns.some(p => p.frequency > 0.3)) {
      techniques.push('Rhythmic Repetition');
    }

    // Check for development techniques
    if (sections.length > 4) {
      techniques.push('Structural Development');
    }

    return techniques;
  }

  private createFallbackForm(
    features: MusicalFeatures[],
    context: { key?: string; tempo?: number; timeSignature?: [number, number]; style?: string }
  ): MusicalForm {
    // Create a fallback form when analysis fails
    const sectionCount = Math.min(features.length, 8);
    const sections: MusicalSection[] = [];

    // Create equal sections
    const sectionSize = Math.ceil(features.length / sectionCount);

    for (let i = 0; i < sectionCount; i++) {
      const startIndex = i * sectionSize;
      const endIndex = Math.min(startIndex + sectionSize - 1, features.length - 1);
      const sectionFeatures = features.slice(startIndex, endIndex + 1);

      sections.push({
        id: this.generateSectionId(),
        name: `Section ${i + 1}`,
        startIndex,
        endIndex,
        duration: endIndex - startIndex + 1,
        type: 'verse', // Default type
        characteristics: this.calculateAverageCharacteristics(sectionFeatures),
        key: context.key,
        tempo: context.tempo,
        timeSignature: context.timeSignature,
        confidence: 0.5 // Low confidence for fallback
      });
    }

    return {
      id: this.generateFormId(),
      name: 'Fallback Analysis',
      type: 'strophic',
      sections,
      structure: sections.map(s => s.type),
      characteristics: {
        complexity: 0.5,
        predictability: 0.5,
        balance: 0.5,
        coherence: 0.5
      },
      confidence: 0.3,
      analysis: {
        repetitionPatterns: [],
        harmonicProgression: [],
        keyChanges: [],
        developmentalTechniques: []
      }
    };
  }

  private generateFormId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSectionId(): string {
    return `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSectionName(type: MusicalSection['type'], index: number): string {
    const typeNames: Record<MusicalSection['type'], string> = {
      'intro': 'Introduction',
      'verse': `Verse ${index + 1}`,
      'pre-chorus': 'Pre-Chorus',
      'chorus': 'Chorus',
      'bridge': 'Bridge',
      'outro': 'Outro',
      'instrumental': 'Instrumental',
      'solo': 'Solo',
      'breakdown': 'Breakdown'
    };

    return typeNames[type];
  }

  private initializeFormDatabase(): void {
    // Initialize with known forms (could be expanded with real data)
    this.formDatabase = [];
  }

  private initializeKnownForms(): void {
    // Initialize known form patterns
    this.knownForms = {
      'verse-chorus': ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'],
      'binary': ['A', 'B'],
      'ternary': ['A', 'B', 'A'],
      'sonata': ['exposition', 'development', 'recapitulation']
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    if (this.formClassifier) {
      this.formClassifier.dispose();
    }
    if (this.sectionDetector) {
      this.sectionDetector.dispose();
    }
  }
}

export default StructuralAnalyzer;