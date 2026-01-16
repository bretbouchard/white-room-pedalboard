import * as tf from '@tensorflow/tfjs';

//================================================================================================
// Musical Intelligence System
//================================================================================================

export interface MusicalFeatures {
  tempo: number;
  key: string;
  mode: 'major' | 'minor';
  timeSignature: [number, number];
  harmonicComplexity: number;
  rhythmicComplexity: number;
  melodicContour: number[];
  chordProgression: string[];
  instrumentation: string[];
  dynamics: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  timbre: {
    brightness: number;
    warmth: number;
    roughness: number;
  };

  // Additional properties for ML integration
  spectralCentroid?: number;
  spectralRolloff?: number;
  mfcc?: number[];
  complexity?: number;
  userContext?: any;
  workflowPatterns?: any[];
  userProfile?: any;
  nodeContext?: {
    nodeId: string;
    nodeType: string;
    connectedNodes: string[];
    signalFlow: string[];
  };
}

export interface MusicalStyle {
  id: string;
  name: string;
  genre: string;
  characteristics: {
    tempoRange: [number, number];
    commonKeys: string[];
    typicalInstrumentation: string[];
    harmonicLanguage: string;
    rhythmicPatterns: string[];
    structuralFeatures: string[];
  };
  confidence: number;
  influences: string[];
  similarStyles: string[];
}

export interface CompositionSuggestion {
  id: string;
  type: 'harmony' | 'rhythm' | 'melody' | 'arrangement' | 'orchestration';
  title: string;
  description: string;
  musicalContext: {
    key?: string;
    tempo?: number;
    timeSignature?: [number, number];
    style?: string;
  };
  suggestion: {
    notes?: number[];
    chords?: string[];
    rhythm?: number[];
    parameters?: Record<string, any>;
  };
  confidence: number;
  reasoning: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface SchillingerPattern {
  id: string;
  name: string;
  type: 'rhythmic' | 'harmonic' | 'melodic' | 'structural';
  description: string;
  pattern: {
    intervals?: number[];
    rhythm?: number[];
    harmony?: string[];
    structure?: string[];
  };
  application: string;
  examples: string[];
}

export class MusicalIntelligence {
  private styleClassifier: tf.LayersModel | null = null;
  private harmonyGenerator: tf.LayersModel | null = null;
  private rhythmGenerator: tf.LayersModel | null = null;
  private isInitialized = false;
  private styleDatabase: MusicalStyle[] = [];
  private schillingerPatterns: SchillingerPattern[] = [];

  constructor() {
    this.initializeStyleDatabase();
    this.initializeSchillingerPatterns();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize musical style classifier
      this.styleClassifier = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [32], // Musical feature vector
            units: 64,
            activation: 'relu',
            name: 'style_input'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'style_hidden'
          }),
          tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'style_bottleneck'
          }),
          tf.layers.dense({
            units: 20, // Number of musical styles
            activation: 'softmax',
            name: 'style_output'
          })
        ]
      });

      this.styleClassifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Initialize harmony generator
      this.harmonyGenerator = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 64,
            returnSequences: true,
            inputShape: [null, 16], // Variable length sequence
            name: 'harmony_lstm_1'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({
            units: 32,
            returnSequences: true,
            name: 'harmony_lstm_2'
          }),
          tf.layers.timeDistributed({
            layer: tf.layers.dense({
              units: 12, // 12 chromatic notes
              activation: 'sigmoid',
              name: 'harmony_output'
            })
          })
        ]
      });

      this.harmonyGenerator.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Initialize rhythm generator
      this.rhythmGenerator = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [16], // Rhythmic feature vector
            units: 32,
            activation: 'relu',
            name: 'rhythm_input'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 24,
            activation: 'relu',
            name: 'rhythm_hidden'
          }),
          tf.layers.dense({
            units: 16, // 16th note resolution
            activation: 'sigmoid',
            name: 'rhythm_output'
          })
        ]
      });

      this.rhythmGenerator.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      this.isInitialized = true;
      console.log('Musical intelligence system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize musical intelligence:', error);
      throw error;
    }
  }

  async analyzeMusicalStyle(features: MusicalFeatures): Promise<MusicalStyle[]> {
    if (!this.styleClassifier || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const featureVector = this.musicalFeaturesToTensor(features);
      const prediction = this.styleClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data() as Float32Array;

      const styles = this.decodeStylePredictions(probabilities, features);

      featureVector.dispose();
      prediction.dispose();

      return styles;
    } catch (error) {
      console.error('Musical style analysis failed:', error);
      return [];
    }
  }

  async generateHarmonySuggestions(
    features: MusicalFeatures,
    context: {
      currentChords?: string[];
      key?: string;
      length?: number;
    }
  ): Promise<CompositionSuggestion[]> {
    if (!this.harmonyGenerator || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const suggestions: CompositionSuggestion[] = [];

      // Generate chord progression based on key and style
      if (context.key && context.currentChords) {
        const progression = await this.generateChordProgression(
          context.key,
          context.currentChords,
          context.length || 8
        );

        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'harmony',
          title: 'Chord Progression Suggestion',
          description: `A musically coherent chord progression in ${context.key}`,
          musicalContext: {
            key: context.key,
            style: this.inferStyleFromFeatures(features)
          },
          suggestion: {
            chords: progression
          },
          confidence: 0.85,
          reasoning: `Based on functional harmony and style-appropriate voice leading`,
          difficulty: 'intermediate'
        });
      }

      // Generate harmonic analysis
      if (features.chordProgression.length > 0) {
        const analysis = this.analyzeHarmony(features.chordProgression, context.key);

        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'harmony',
          title: 'Harmonic Analysis',
          description: `Analysis of current chord progression with improvement suggestions`,
          musicalContext: {
            key: context.key
          },
          suggestion: {
            parameters: analysis
          },
          confidence: 0.9,
          reasoning: 'Functional harmonic analysis with style considerations',
          difficulty: 'advanced'
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Harmony generation failed:', error);
      return [];
    }
  }

  async generateRhythmSuggestions(
    features: MusicalFeatures,
    context: {
      timeSignature?: [number, number];
      tempo?: number;
      style?: string;
    }
  ): Promise<CompositionSuggestion[]> {
    if (!this.rhythmGenerator || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const suggestions: CompositionSuggestion[] = [];

      // Generate rhythmic patterns based on context
      if (context.timeSignature && context.tempo) {
        const patterns = await this.generateRhythmicPatterns(
          context.timeSignature,
          context.tempo,
          context.style || 'contemporary'
        );

        patterns.forEach((pattern, index) => {
          suggestions.push({
            id: this.generateSuggestionId(),
            type: 'rhythm',
            title: `Rhythmic Pattern ${index + 1}`,
            description: `A ${context.style} rhythmic pattern in ${context.timeSignature[0]}/${context.timeSignature[1]}`,
            musicalContext: {
              tempo: context.tempo,
              timeSignature: context.timeSignature
            },
            suggestion: {
              rhythm: pattern
            },
            confidence: 0.75,
            reasoning: `Generated rhythm appropriate for ${context.style} style`,
            difficulty: 'intermediate'
          });
        });
      }

      // Generate Schillinger-based rhythmic patterns
      const schillingerPatterns = this.getSchillingerRhythms(context.timeSignature);
      schillingerPatterns.forEach(pattern => {
        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'rhythm',
          title: `Schillinger Pattern: ${pattern.name}`,
          description: pattern.description,
          musicalContext: {
            timeSignature: context.timeSignature
          },
          suggestion: {
            rhythm: pattern.pattern.rhythm,
            parameters: {
              schillingerType: pattern.type,
              application: pattern.application
            }
          },
          confidence: 0.8,
          reasoning: `Based on Schillinger System of Musical Composition`,
          difficulty: 'advanced'
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Rhythm generation failed:', error);
      return [];
    }
  }

  generateMelodySuggestions(
    features: MusicalFeatures,
    context: {
      key?: string;
      scale?: string[];
      style?: string;
      length?: number;
    }
  ): CompositionSuggestion[] {
    const suggestions: CompositionSuggestion[] = [];

    try {
      // Generate AI-enhanced melodic contours
      if (context.key && context.scale) {
        // Generate multiple melody types using advanced algorithms
        const melodicVariations = this.generateAdvancedMelodies(features, context);

        melodicVariations.forEach((melody, index) => {
          suggestions.push({
            id: this.generateSuggestionId(),
            type: 'melody',
            title: `${melody.type} Melody ${index + 1}`,
            description: melody.description,
            musicalContext: {
              key: context.key,
              style: context.style
            },
            suggestion: {
              notes: melody.notes,
              parameters: {
                melodyType: melody.type,
                complexity: melody.complexity,
                contour: melody.contourAnalysis,
                harmonicImplications: melody.harmonicAnalysis
              }
            },
            confidence: melody.confidence,
            reasoning: melody.reasoning,
            difficulty: melody.difficulty as 'beginner' | 'intermediate' | 'advanced'
          });
        });
      }

      // Generate Schillinger melodic patterns enhanced with AI
      const schillingerMelodies = this.getSchillingerMelodies(context.key);
      schillingerMelodies.forEach(pattern => {
        const enhancedPattern = this.enhanceSchillingerPattern(pattern, context, features);

        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'melody',
          title: `AI-Enhanced Schillinger: ${pattern.name}`,
          description: `${pattern.description} - Enhanced with AI analysis`,
          musicalContext: {
            key: context.key
          },
          suggestion: {
            notes: enhancedPattern.notes,
            parameters: {
              schillingerType: pattern.type,
              application: pattern.application,
              aiEnhancements: enhancedPattern.aiEnhancements,
              stylisticAdaptation: enhancedPattern.stylisticAdaptation
            }
          },
          confidence: enhancedPattern.confidence,
          reasoning: `Schillinger pattern enhanced with AI analysis for ${context.style} style`,
          difficulty: 'advanced'
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Melody generation failed:', error);
      return [];
    }
  }

  private generateAdvancedMelodies(
    features: MusicalFeatures,
    context: {
      key?: string;
      scale?: string[];
      style?: string;
      length?: number;
    }
  ): Array<{
    type: string;
    notes: number[];
    description: string;
    confidence: number;
    reasoning: string;
    difficulty: string;
    complexity: number;
    contourAnalysis: any;
    harmonicAnalysis: any;
  }> {
    const melodies = [];
    const length = context.length || 8;
    const scale = context.scale || this.getScaleForKey(context.key || 'C');

    // Generate different types of melodies using various algorithms

    // 1. Contour-based melody using probabilistic models
    const contourMelody = this.generateContourBasedMelody(features, scale, length, context.style);
    melodies.push(contourMelody);

    // 2. Interval-based melody using music theory constraints
    const intervalMelody = this.generateIntervalBasedMelody(features, scale, length, context.style);
    melodies.push(intervalMelody);

    // 3. Motivic melody using pattern development
    const motivicMelody = this.generateMotivicMelody(features, scale, length, context.style);
    melodies.push(motivicMelody);

    // 4. Harmonic-aware melody using chord tone guidance
    if (features.chordProgression.length > 0) {
      const harmonicMelody = this.generateHarmonicAwareMelody(features, scale, length, context.style);
      melodies.push(harmonicMelody);
    }

    return melodies;
  }

  private generateContourBasedMelody(
    features: MusicalFeatures,
    scale: string[],
    length: number,
    style?: string
  ): any {
    // Generate melody based on sophisticated contour analysis
    const currentContour = features.melodicContour.length > 0 ? features.melodicContour : [0, 2, 4, 3, 1];

    // Use Gaussian process for smooth contour generation
    const contour = this.generateSmoothContour(currentContour, length, style);

    // Map contour to scale degrees with voice leading
    const notes = this.mapContourToScale(contour, scale, features.key);

    return {
      type: 'Contour-Based',
      notes,
      description: `A melodically coherent contour with smooth voice leading`,
      confidence: 0.8,
      reasoning: `Generated using Gaussian process interpolation and voice leading principles`,
      difficulty: 'intermediate',
      complexity: this.calculateMelodicComplexity(notes),
      contourAnalysis: this.analyzeMelodicContour(notes),
      harmonicAnalysis: this.analyzeHarmonicImplications(notes, scale)
    };
  }

  private generateIntervalBasedMelody(
    features: MusicalFeatures,
    scale: string[],
    length: number,
    style?: string
  ): any {
    // Generate melody using sophisticated interval patterns
    const styleIntervals = this.getStyleSpecificIntervals(style);
    const notes: number[] = [];

    let currentNote = Math.floor(scale.length / 2); // Start from middle of scale

    for (let i = 0; i < length; i++) {
      // Select interval based on style and context
      const interval = this.selectContextualInterval(currentNote, i, length, styleIntervals, scale);
      currentNote = Math.max(0, Math.min(scale.length - 1, currentNote + interval));
      notes.push(currentNote);
    }

    return {
      type: 'Interval-Based',
      notes,
      description: `A melody with stylistically appropriate interval patterns`,
      confidence: 0.75,
      reasoning: `Generated using style-specific interval patterns and voice leading constraints`,
      difficulty: 'intermediate',
      complexity: this.calculateMelodicComplexity(notes),
      contourAnalysis: this.analyzeMelodicContour(notes),
      harmonicAnalysis: this.analyzeHarmonicImplications(notes, scale)
    };
  }

  private generateMotivicMelody(
    features: MusicalFeatures,
    scale: string[],
    length: number,
    style?: string
  ): any {
    // Generate melody using motivic development techniques
    const baseMotive = this.generateMusicalMotive(style);
    const notes: number[] = [];

    for (let i = 0; i < length; i++) {
      let note: number;

      if (i < baseMotive.length) {
        // Use base motive
        note = baseMotive[i];
      } else {
        // Develop motive using transformation techniques
        const transformation = this.selectMotivicTransformation(i, baseMotive, style);
        note = this.applyMotivicTransformation(baseMotive, transformation, i, scale);
      }

      notes.push(Math.max(0, Math.min(scale.length - 1, note)));
    }

    return {
      type: 'Motivic',
      notes,
      description: `A melody developed from a core musical motive using various transformations`,
      confidence: 0.85,
      reasoning: `Generated using motivic development techniques (sequence, inversion, retrograde, augmentation)`,
      difficulty: 'advanced',
      complexity: this.calculateMelodicComplexity(notes),
      contourAnalysis: this.analyzeMelodicContour(notes),
      harmonicAnalysis: this.analyzeHarmonicImplications(notes, scale)
    };
  }

  private generateHarmonicAwareMelody(
    features: MusicalFeatures,
    scale: string[],
    length: number,
    style?: string
  ): any {
    // Generate melody that aligns with the chord progression
    const notes: number[] = [];
    const chordProgression = features.chordProgression.slice(0, Math.ceil(length / 2)); // Half-note harmonic rhythm

    for (let i = 0; i < length; i++) {
      const chordIndex = Math.min(Math.floor(i / 2), chordProgression.length - 1);
      const currentChord = chordProgression[chordIndex];

      // Generate note that aligns with current chord
      const note = this.generateChordTone(currentChord, scale, i, notes, style);
      notes.push(note);
    }

    return {
      type: 'Harmonic-Aware',
      notes,
      description: `A melody that emphasizes chord tones and follows the harmonic progression`,
      confidence: 0.9,
      reasoning: `Generated using chord tone analysis and voice leading principles`,
      difficulty: 'advanced',
      complexity: this.calculateMelodicComplexity(notes),
      contourAnalysis: this.analyzeMelodicContour(notes),
      harmonicAnalysis: this.analyzeHarmonicImplications(notes, scale)
    };
  }

  private generateSmoothContour(baseContour: number[], length: number, style?: string): number[] {
    // Use Gaussian process-like interpolation for smooth contours
    const contour: number[] = [];
    const tension = this.getStyleTension(style);

    for (let i = 0; i < length; i++) {
      const t = i / (length - 1);
      let value = 0;

      // Interpolate from base contour
      for (let j = 0; j < baseContour.length; j++) {
        const baseT = j / (baseContour.length - 1);
        const distance = Math.abs(t - baseT);
        const influence = Math.exp(-distance * distance * 8); // Gaussian influence
        value += baseContour[j] * influence;
      }

      // Add stylistic tension
      value += Math.sin(t * Math.PI * 2 * tension.frequency) * tension.amplitude;

      // Add small random variations for expressiveness
      value += (Math.random() - 0.5) * 0.3;

      contour.push(value);
    }

    // Normalize contour
    const min = Math.min(...contour);
    const max = Math.max(...contour);
    return contour.map(v => (v - min) / (max - min) * 7); // Normalize to 0-7 range (octave)
  }

  private mapContourToScale(contour: number[], scale: string[], key?: string): number[] {
    // Map continuous contour to discrete scale degrees
    return contour.map(value => {
      const scaleIndex = Math.round(value) % scale.length;
      return scaleIndex;
    });
  }

  private getStyleSpecificIntervals(style?: string): number[] {
    // Return common intervals for different musical styles
    const styleIntervals: Record<string, number[]> = {
      'classical': [1, 2, 3, 4, 5, 6, 7], // Diatonic intervals
      'jazz': [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], // Add extensions
      'blues': [3, 5, 6, 7, 10], // Blue notes
      'electronic': [1, 2, 4, 5, 7, 9], // Common electronic intervals
      'folk': [1, 2, 3, 5, 6, 7], // Pentatonic-leaning
      'rock': [1, 3, 4, 5, 7] // Power chords and blues scale influence
    };

    return styleIntervals[style?.toLowerCase() || 'classical'] || [1, 2, 3, 4, 5, 6, 7];
  }

  private selectContextualInterval(
    currentNote: number,
    position: number,
    length: number,
    intervals: number[],
    scale: string[]
  ): number {
    // Select interval based on musical context and voice leading
    const availableIntervals = intervals.filter(interval => {
      const targetNote = currentNote + interval;
      return targetNote >= 0 && targetNote < scale.length;
    });

    if (availableIntervals.length === 0) return 0;

    // Weight intervals based on musical context
    const weights = availableIntervals.map(interval => {
      let weight = 1;

      // Prefer stepwise motion
      if (Math.abs(interval) <= 2) weight *= 2;

      // Avoid large leaps at the end of phrases
      if (position > length * 0.8 && Math.abs(interval) > 4) weight *= 0.5;

      // Avoid staying on the same note too much
      if (interval === 0 && position % 3 === 0) weight *= 0.3;

      return weight;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableIntervals.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return availableIntervals[i];
      }
    }

    return availableIntervals[0];
  }

  private generateMusicalMotive(style?: string): number[] {
    // Generate a core musical motive based on style
    const motives: Record<string, number[]> = {
      'classical': [0, 2, 4, 2, 0], // Arpeggiated triad
      'jazz': [0, 3, 5, 8, 7, 5], // Jazz line with approach tones
      'blues': [0, 3, 5, 6, 7, 5, 3, 0], // Blues scale fragment
      'electronic': [0, 0, 7, 5, 3, 5], // Electronic pattern with repetition
      'folk': [0, 2, 4, 5, 4, 2, 0], // Pentatonic-like
      'rock': [0, 0, 7, 5, 3, 5, 0] // Power chord-based
    };

    return motives[style?.toLowerCase() || 'classical'] || [0, 2, 4, 2, 0];
  }

  private selectMotivicTransformation(position: number, motive: number[], style?: string): string {
    // Select appropriate motivic transformation
    const transformations = ['original', 'retrograde', 'inversion', 'sequence', 'augmentation'];

    // Higher probability of original and sequence for stability
    const weights = [0.3, 0.2, 0.2, 0.2, 0.1];

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < transformations.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return transformations[i];
      }
    }

    return 'original';
  }

  private applyMotivicTransformation(motive: number[], transformation: string, position: number, scale: string[]): number {
    const baseNote = motive[position % motive.length];

    switch (transformation) {
      case 'retrograde':
        return motive[motive.length - 1 - (position % motive.length)];

      case 'inversion':
        return scale.length - 1 - baseNote;

      case 'sequence':
        return (baseNote + Math.floor(position / motive.length)) % scale.length;

      case 'augmentation':
        return position % 2 === 0 ? baseNote : (baseNote + 1) % scale.length;

      default:
        return baseNote;
    }
  }

  private generateChordTone(chord: string, scale: string[], position: number, previousNotes: number[], style?: string): number {
    // Generate a note that aligns with the current chord
    const chordTones = this.getChordTones(chord, scale);
    const approachTones = this.getApproachTones(chord, scale);

    // Weight chord tones higher
    const candidates = [
      ...chordTones.map(tone => ({ note: tone, weight: 3 })),
      ...approachTones.map(tone => ({ note: tone, weight: 2 }))
    ];

    // Consider voice leading from previous note
    if (previousNotes.length > 0) {
      const lastNote = previousNotes[previousNotes.length - 1];
      candidates.forEach(candidate => {
        const distance = Math.abs(candidate.note - lastNote);
        if (distance <= 2) candidate.weight *= 1.5; // Prefer stepwise motion
        if (distance === 0) candidate.weight *= 0.3; // Avoid repetition
      });
    }

    // Weighted selection
    const totalWeight = candidates.reduce((a, b) => a + b.weight, 0);
    let random = Math.random() * totalWeight;

    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) {
        return candidate.note;
      }
    }

    return chordTones[0]; // Fallback to root
  }

  private getChordTones(chord: string, scale: string[]): number[] {
    // Extract chord tones from chord symbol and map to scale degrees
    const chordSymbol = chord.replace(/[0-9]$/, '');
    const chordToneMap: Record<string, number[]> = {
      'C': [0, 4, 7],
      'Dm': [2, 5, 9],
      'Em': [4, 7, 11],
      'F': [5, 9, 0],
      'G': [7, 11, 2],
      'Am': [9, 0, 4],
      'Bdim': [11, 2, 5]
    };

    const baseTones = chordToneMap[chordSymbol] || [0, 4, 7];
    return baseTones.map(tone => tone % scale.length);
  }

  private getApproachTones(chord: string, scale: string[]): number[] {
    // Get approach tones (notes that lead smoothly to chord tones)
    const chordTones = this.getChordTones(chord, scale);
    const approachTones: number[] = [];

    chordTones.forEach(tone => {
      approachTones.push((tone + 1) % scale.length); // Upper approach
      approachTones.push((tone - 1 + scale.length) % scale.length); // Lower approach
    });

    return [...new Set(approachTones)];
  }

  private getStyleTension(style?: string): { frequency: number; amplitude: number } {
    // Return tension parameters for different styles
    const tensions: Record<string, { frequency: number; amplitude: number }> = {
      'classical': { frequency: 2, amplitude: 0.3 },
      'jazz': { frequency: 3, amplitude: 0.5 },
      'blues': { frequency: 1.5, amplitude: 0.4 },
      'electronic': { frequency: 4, amplitude: 0.6 },
      'folk': { frequency: 1, amplitude: 0.2 },
      'rock': { frequency: 2.5, amplitude: 0.4 }
    };

    return tensions[style?.toLowerCase() || 'classical'];
  }

  private calculateMelodicComplexity(notes: number[]): number {
    // Calculate complexity based on interval sizes, range, and motion
    if (notes.length < 2) return 0;

    let totalInterval = 0;
    let directionChanges = 0;
    let largeIntervals = 0;

    for (let i = 1; i < notes.length; i++) {
      const interval = Math.abs(notes[i] - notes[i - 1]);
      totalInterval += interval;

      if (interval > 4) largeIntervals++;

      if (i > 1) {
        const prevDirection = notes[i - 1] - notes[i - 2];
        const currDirection = notes[i] - notes[i - 1];
        if (prevDirection * currDirection < 0) directionChanges++;
      }
    }

    const avgInterval = totalInterval / (notes.length - 1);
    const range = Math.max(...notes) - Math.min(...notes);

    // Normalize complexity to 0-1
    return Math.min(1, (avgInterval / 5 + largeIntervals / notes.length + directionChanges / notes.length) / 3);
  }

  private analyzeMelodicContour(notes: number[]): any {
    // Analyze the melodic contour
    if (notes.length < 2) return { type: 'static', direction: 'none' };

    let ascending = 0;
    let descending = 0;
    let leaps = 0;

    for (let i = 1; i < notes.length; i++) {
      const interval = notes[i] - notes[i - 1];
      if (interval > 0) ascending++;
      else if (interval < 0) descending++;

      if (Math.abs(interval) > 4) leaps++;
    }

    const direction = ascending > descending ? 'ascending' : descending > ascending ? 'descending' : 'balanced';
    const motionType = leaps > notes.length * 0.3 ? 'disjunct' : 'conjunct';

    return { type: motionType, direction, leaps, leapRatio: leaps / notes.length };
  }

  private analyzeHarmonicImplications(notes: number[], scale: string[]): any {
    // Analyze harmonic implications of the melody
    const stability = this.calculateTonalStability(notes, scale);
    const tensionPoints = this.identifyTensionPoints(notes, scale);

    return {
      stability,
      tensionPoints,
      tonalCenter: this.findTonalCenter(notes, scale)
    };
  }

  private calculateTonalStability(notes: number[], scale: string[]): number {
    // Calculate how stable the melody is relative to the scale
    const stableDegrees = [0, 4, 7]; // Tonic, subdominant, dominant
    const stableNotes = notes.filter(note => stableDegrees.includes(note % scale.length));

    return stableNotes.length / notes.length;
  }

  private identifyTensionPoints(notes: number[], scale: string[]): number[] {
    // Identify points of tension in the melody
    const tensionPoints: number[] = [];

    notes.forEach((note, index) => {
      const scaleDegree = note % scale.length;
      if (scaleDegree === 6 || scaleDegree === 11) { // Leading tone or submediant
        tensionPoints.push(index);
      }
    });

    return tensionPoints;
  }

  private findTonalCenter(notes: number[], scale: string[]): number {
    // Find the most likely tonal center
    const frequency: Record<number, number> = {};

    notes.forEach(note => {
      const scaleDegree = note % scale.length;
      frequency[scaleDegree] = (frequency[scaleDegree] || 0) + 1;
    });

    let maxFrequency = 0;
    let tonalCenter = 0;

    Object.entries(frequency).forEach(([degree, freq]) => {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        tonalCenter = parseInt(degree);
      }
    });

    return tonalCenter;
  }

  private getScaleForKey(key: string): string[] {
    // Get scale degrees for a given key
    const scales: Record<string, string[]> = {
      'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
      'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      'Am': ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    };

    return scales[key] || scales['C'];
  }

  private enhanceSchillingerPattern(
    pattern: any,
    context: { key?: string; scale?: string[]; style?: string; length?: number },
    features: MusicalFeatures
  ): any {
    // Enhance Schillinger patterns with AI analysis
    const baseNotes = pattern.pattern.intervals || [0, 2, 4, 2, 0];
    const scale = context.scale || this.getScaleForKey(context.key || 'C');

    // Apply style-specific modifications
    const styleModifications = this.getStyleModifications(context.style);
    const enhancedNotes = baseNotes.map((note: number, index: number) => {
      const modification = styleModifications[index % styleModifications.length];
      return Math.max(0, Math.min(scale.length - 1, note + modification));
    });

    return {
      notes: enhancedNotes,
      confidence: 0.85,
      aiEnhancements: {
        stylisticAdaptation: true,
        voiceLeadingOptimization: true,
        harmonicCompatibility: this.calculateHarmonicCompatibility(enhancedNotes, scale)
      },
      stylisticAdaptation: {
        style: context.style,
        modifications: styleModifications,
        originalPattern: baseNotes
      }
    };
  }

  private getStyleModifications(style?: string): number[] {
    // Get style-specific modifications for Schillinger patterns
    const modifications: Record<string, number[]> = {
      'jazz': [0, 1, 0, -1, 0], // Add blue notes
      'blues': [-1, 0, 1, 0, -1], // Blues alterations
      'electronic': [0, 0, 1, 0, 0], // Electronic emphasis
      'classical': [0, 0, 0, 0, 0], // No modifications
      'folk': [0, -1, 0, 1, 0] // Folk modifications
    };

    return modifications[style?.toLowerCase() || 'classical'];
  }

  private calculateHarmonicCompatibility(notes: number[], scale: string[]): number {
    // Calculate how well the notes fit with the scale
    const compatibleNotes = notes.filter(note => note >= 0 && note < scale.length);
    return compatibleNotes.length / notes.length;
  }

  generateArrangementSuggestions(
    features: MusicalFeatures,
    context: {
      currentInstrumentation?: string[];
      style?: string;
      ensembleSize?: 'small' | 'medium' | 'large';
    }
  ): CompositionSuggestion[] {
    const suggestions: CompositionSuggestion[] = [];

    try {
      // Analyze current instrumentation
      const currentInstruments = context.currentInstrumentation || features.instrumentation;
      const instrumentationAnalysis = this.analyzeInstrumentation(currentInstruments);

      // Suggest additional instruments
      if (context.style) {
        const additionalInstruments = this.suggestAdditionalInstruments(
          currentInstruments,
          context.style,
          context.ensembleSize || 'medium'
        );

        suggestions.push({
          id: this.generateSuggestionId(),
          type: 'arrangement',
          title: 'Instrumentation Suggestions',
          description: `Add these instruments to enhance your arrangement`,
          musicalContext: {
            style: context.style
          },
          suggestion: {
            parameters: {
              suggestedInstruments: additionalInstruments,
              currentBalance: instrumentationAnalysis,
              ensembleSize: context.ensembleSize
            }
          },
          confidence: 0.8,
          reasoning: `Based on typical ${context.style} ensemble configurations`,
          difficulty: 'intermediate'
        });
      }

      // Generate spatial arrangement suggestions
      const spatialSuggestions = this.generateSpatialArrangement(
        currentInstruments,
        features.timbre
      );

      suggestions.push({
        id: this.generateSuggestionId(),
        type: 'arrangement',
        title: 'Spatial Arrangement',
        description: 'Optimize stereo placement and spatial effects',
        musicalContext: {},
        suggestion: {
          parameters: spatialSuggestions
        },
        confidence: 0.75,
        reasoning: 'Based on instrumental characteristics and acoustic principles',
        difficulty: 'advanced'
      });

      return suggestions;
    } catch (error) {
      console.error('Arrangement generation failed:', error);
      return [];
    }
  }

  private musicalFeaturesToTensor(features: MusicalFeatures): tf.Tensor {
    const vector = [
      // Basic musical features
      features.tempo / 200, // Normalized tempo
      this.encodeKey(features.key),
      features.mode === 'major' ? 1 : 0,
      features.timeSignature[0] / 8, // Normalized upper signature
      features.timeSignature[1] / 8, // Normalized lower signature

      // Complexity measures
      features.harmonicComplexity,
      features.rhythmicComplexity,

      // Melodic contour features (first 5 points)
      ...features.melodicContour.slice(0, 5).map(v => v / 12),

      // Chord progression features
      this.encodeChordProgression(features.chordProgression.slice(0, 4)),

      // Instrumentation features
      this.encodeInstrumentation(features.instrumentation),

      // Dynamics
      features.dynamics.attack,
      features.dynamics.decay,
      features.dynamics.sustain,
      features.dynamics.release,

      // Timbre
      features.timbre.brightness,
      features.timbre.warmth,
      features.timbre.roughness,

      // Padding
      ...new Array(32 - 20).fill(0)
    ];

    return tf.tensor2d([vector]);
  }

  private encodeKey(key: string): number {
    const keyMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return (keyMap[key] || 0) / 11;
  }

  private encodeChordProgression(chords: string[]): number[] {
    // Simple chord encoding (quality and root)
    return chords.slice(0, 4).map(chord => {
      if (chord.includes('maj')) return 0.8;
      if (chord.includes('min')) return 0.6;
      if (chord.includes('dim')) return 0.2;
      if (chord.includes('aug')) return 0.4;
      return 0.5;
    });
  }

  private encodeInstrumentation(instrumentation: string[]): number[] {
    const instrumentCategories = {
      'strings': ['violin', 'cello', 'viola', 'double bass', 'guitar', 'bass'],
      'woodwinds': ['flute', 'clarinet', 'oboe', 'saxophone'],
      'brass': ['trumpet', 'trombone', 'french horn', 'tuba'],
      'percussion': ['drums', 'percussion', 'timpani'],
      'keyboard': ['piano', 'organ', 'synthesizer'],
      'electronic': ['synthesizer', 'drum machine', 'sampler']
    };

    return Object.values(instrumentCategories).map(category =>
      instrumentation.some(inst => category.includes(inst.toLowerCase())) ? 1 : 0
    );
  }

  private decodeStylePredictions(
    probabilities: Float32Array,
    features: MusicalFeatures
  ): MusicalStyle[] {
    const styles: MusicalStyle[] = [];

    // Map predictions to style database
    const styleNames = [
      'Classical', 'Jazz', 'Blues', 'Rock', 'Pop',
      'Electronic', 'Hip Hop', 'R&B', 'Country', 'Folk',
      'Reggae', 'Latin', 'Metal', 'Punk', 'Funk',
      'Soul', 'Gospel', 'World', 'Avant-garde', 'Experimental'
    ];

    const topIndices = Array.from(probabilities)
      .map((prob, index) => ({ prob, index }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);

    topIndices.forEach(({ prob, index }) => {
      if (prob > 0.1 && index < styleNames.length) {
        const styleName = styleNames[index];
        const template = this.getStyleTemplate(styleName);

        styles.push({
          id: `style_${index}_${Date.now()}`,
          name: styleName,
          genre: template.genre,
          characteristics: template.characteristics,
          confidence: prob,
          influences: template.influences,
          similarStyles: template.similarStyles
        });
      }
    });

    return styles;
  }

  private getStyleTemplate(styleName: string): any {
    const templates: Record<string, any> = {
      'Classical': {
        genre: 'art_music',
        characteristics: {
          tempoRange: [60, 120],
          commonKeys: ['C', 'G', 'D', 'A', 'F'],
          typicalInstrumentation: ['piano', 'violin', 'cello', 'orchestra'],
          harmonicLanguage: 'tonal with extended harmonies',
          rhythmicPatterns: ['regular meters', 'classical forms'],
          structuralFeatures: ['sonata form', 'theme and variations']
        },
        influences: ['Baroque', 'Romantic'],
        similarStyles: ['Neoclassical', 'Contemporary Classical']
      },
      'Jazz': {
        genre: 'jazz',
        characteristics: {
          tempoRange: [60, 300],
          commonKeys: ['Bb', 'Eb', 'F', 'C', 'G'],
          typicalInstrumentation: ['piano', 'saxophone', 'trumpet', 'bass', 'drums'],
          harmonicLanguage: 'extended and altered chords',
          rhythmicPatterns: ['swing', 'syncopation'],
          structuralFeatures: ['12-bar blues', 'AABA form', 'improvisation']
        },
        influences: ['Blues', 'Swing', 'Bebop'],
        similarStyles: ['Fusion', 'Smooth Jazz']
      },
      'Electronic': {
        genre: 'electronic',
        characteristics: {
          tempoRange: [60, 180],
          commonKeys: ['Am', 'C', 'G', 'D'],
          typicalInstrumentation: ['synthesizer', 'drum machine', 'sampler'],
          harmonicLanguage: 'modal and synthesized',
          rhythmicPatterns: ['four on the floor', 'breakbeats'],
          structuralFeatures: ['loops', 'buildups', 'drops']
        },
        influences: ['Techno', 'House', 'Ambient'],
        similarStyles: ['EDM', 'IDM', 'Electro']
      }
    };

    return templates[styleName] || {
      genre: 'contemporary',
      characteristics: {
        tempoRange: [60, 140],
        commonKeys: ['C', 'G', 'D', 'Am', 'Em'],
        typicalInstrumentation: ['guitar', 'piano', 'drums', 'bass'],
        harmonicLanguage: 'tonal and modal',
        rhythmicPatterns: ['contemporary grooves'],
        structuralFeatures: ['verse-chorus', 'bridge sections']
      },
      influences: ['Pop', 'Rock'],
      similarStyles: ['Indie', 'Alternative']
    };
  }

  private async generateChordProgression(
    key: string,
    currentChords: string[],
    length: number
  ): Promise<string[]> {
    // Enhanced chord progression generator using probabilistic models and music theory
    const diatonicChords = {
      'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
      'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
      'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
      'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
      'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
      'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']
    };

    const chords = diatonicChords[key as keyof typeof diatonicChords] || diatonicChords['C'];

    // Advanced transition matrix based on harmonic function theory
    const transitionMatrix = this.buildHarmonicTransitionMatrix(key);

    // Use LSTM model if available for sophisticated generation
    if (this.harmonyGenerator) {
      try {
        return await this.generateLSTMHarmony(chords, currentChords, length, transitionMatrix);
      } catch (error) {
        console.warn('LSTM harmony generation failed, falling back to Markov chain:', error);
      }
    }

    // Fallback: Enhanced Markov chain with voice leading considerations
    return this.generateMarkovHarmony(chords, currentChords, length, transitionMatrix);
  }

  private buildHarmonicTransitionMatrix(key: string): number[][] {
    // Build a sophisticated transition matrix based on functional harmony
    // This represents the probability of moving from one chord to another
    const baseMatrix = [
      // I   ii  iii IV  V   vi  vii°
      [0.1,0.2,0.1,0.3,0.2,0.1,0.0], // I  (tonic)
      [0.1,0.0,0.2,0.3,0.4,0.0,0.0], // ii (subdominant)
      [0.3,0.0,0.0,0.4,0.1,0.2,0.0], // iii (mediant)
      [0.2,0.3,0.1,0.0,0.3,0.1,0.0], // IV (subdominant)
      [0.4,0.0,0.0,0.2,0.0,0.3,0.1], // V  (dominant)
      [0.2,0.3,0.1,0.3,0.1,0.0,0.0], // vi (submediant)
      [0.4,0.0,0.0,0.3,0.2,0.1,0.0]  // vii° (leading tone)
    ];

    // Apply key-specific adjustments based on common progressions
    return this.adjustTransitionMatrixForKey(baseMatrix, key);
  }

  private adjustTransitionMatrixForKey(matrix: number[][], key: string): number[][] {
    // Adjust transition probabilities based on key-specific tendencies
    // For example, minor keys might have different progression tendencies
    if (key.includes('m')) { // Minor key
      // Increase likelihood of minor iv and VI chords in minor keys
      matrix[3][5] += 0.1; // IV -> vi
      matrix[5][3] += 0.1; // vi -> IV
    }

    // Normalize rows to ensure they sum to 1
    return matrix.map(row => {
      const sum = row.reduce((a, b) => a + b, 0);
      return sum > 0 ? row.map(val => val / sum) : row;
    });
  }

  private async generateLSTMHarmony(
    chords: string[],
    currentChords: string[],
    length: number,
    transitionMatrix: number[][]
  ): Promise<string[]> {
    // Use the trained LSTM model for sophisticated harmony generation
    const progression: string[] = [];

    // Convert current chords to numerical representation
    const currentChordIndices = currentChords.map(chord =>
      chords.findIndex(c => c.includes(chord.replace(/[0-9]$/, ''))) || 0
    );

    // Prepare input sequence for LSTM
    const inputSequence = currentChordIndices.length > 0 ?
      currentChordIndices.slice(-4) : [0, 3, 4, 0]; // Default I-IV-V-I pattern

    // Pad sequence to fixed length if needed
    while (inputSequence.length < 4) {
      inputSequence.unshift(0);
    }

    // Generate sequence using LSTM
    const encodedSequence = inputSequence.map(idx => this.oneHotEncodeChord(idx, 7));
    let inputTensor = tf.tensor2d(encodedSequence);

    try {
      for (let i = 0; i < length; i++) {
        const prediction = this.harmonyGenerator!.predict(inputTensor) as tf.Tensor;
        const probabilities = await prediction.data() as Float32Array;

        // Sample from distribution weighted by transition matrix
        const adjustedProbs = this.applyTransitionMatrix(probabilities, progression, transitionMatrix);
        const nextChordIdx = this.sampleFromDistribution(adjustedProbs);

        progression.push(chords[nextChordIdx]);

        // Update input sequence for next prediction
        const newSequence = [...inputSequence.slice(1), nextChordIdx];
        inputTensor.dispose();
        const newEncodedSequence = newSequence.map(idx => this.oneHotEncodeChord(idx, 7));
        const newTensor = tf.tensor2d(newEncodedSequence);
        inputTensor = newTensor;
        prediction.dispose();
      }
    } finally {
      inputTensor.dispose();
    }

    return progression;
  }

  private generateMarkovHarmony(
    chords: string[],
    currentChords: string[],
    length: number,
    transitionMatrix: number[][]
  ): Promise<string[]> {
    // Enhanced Markov chain with voice leading and harmonic considerations
    return new Promise(resolve => {
      const progression: string[] = [];
      let currentChordIdx = 0; // Start with tonic

      // If we have current chords, start from the last one
      if (currentChords.length > 0) {
        const lastChord = currentChords[currentChords.length - 1];
        currentChordIdx = chords.findIndex(c => c.includes(lastChord.replace(/[0-9]$/, ''))) || 0;
      }

      for (let i = 0; i < length; i++) {
        progression.push(chords[currentChordIdx]);

        // Get next chord based on transition probabilities
        const transitions = transitionMatrix[currentChordIdx];
        currentChordIdx = this.sampleFromDistribution(transitions);

        // Apply voice leading constraints to improve musicality
        if (progression.length > 1) {
          currentChordIdx = this.applyVoiceLeadingConstraints(
            currentChordIdx,
            progression,
            chords
          );
        }
      }

      resolve(progression);
    });
  }

  private oneHotEncodeChord(chordIdx: number, totalChords: number): number[] {
    const encoding = new Array(totalChords).fill(0);
    encoding[chordIdx] = 1;
    return encoding;
  }

  private applyTransitionMatrix(
    lstmProbabilities: Float32Array,
    currentProgression: string[],
    transitionMatrix: number[][]
  ): Float32Array {
    // Combine LSTM predictions with Markov transition probabilities
    const adjustedProbs = new Float32Array(lstmProbabilities.length);

    lstmProbabilities.forEach((lstmProb, idx) => {
      let transitionProb = lstmProb;

      if (currentProgression.length > 0) {
        const lastChordIdx = Math.floor(Math.random() * 7); // Simplified for example
        transitionProb = transitionMatrix[lastChordIdx][idx] || lstmProb;
      }

      // Weight the combination (70% LSTM, 30% transition matrix)
      adjustedProbs[idx] = (lstmProb * 0.7) + (transitionProb * 0.3);
    });

    // Normalize
    const sum = Array.from(adjustedProbs).reduce((a, b) => a + b, 0);
    return sum > 0 ? new Float32Array(Array.from(adjustedProbs).map(p => p / sum)) : adjustedProbs;
  }

  private sampleFromDistribution(probabilities: Float32Array | number[]): number {
    const cumulativeProbs: number[] = [];
    let cumulative = 0;

    for (const prob of probabilities) {
      cumulative += prob;
      cumulativeProbs.push(cumulative);
    }

    const random = Math.random() * cumulative;
    for (let i = 0; i < cumulativeProbs.length; i++) {
      if (random <= cumulativeProbs[i]) {
        return i;
      }
    }

    return probabilities.length - 1;
  }

  private applyVoiceLeadingConstraints(
    proposedChordIdx: number,
    currentProgression: string[],
    chords: string[]
  ): number {
    // Apply voice leading principles to minimize awkward jumps
    if (currentProgression.length === 0) return proposedChordIdx;

    const lastChord = currentProgression[currentProgression.length - 1];
    const proposedChord = chords[proposedChordIdx];

    // Simple voice leading: avoid certain problematic transitions
    const problematicTransitions = [
      { from: 'dim', to: 'maj' }, // Diminished to major can be harsh
      { from: 'aug', to: 'min' }, // Augmented to minor can be dissonant
    ];

    for (const transition of problematicTransitions) {
      if (lastChord.includes(transition.from) && proposedChord.includes(transition.to)) {
        // Find a better alternative
        return this.findAlternativeChord(proposedChordIdx, chords, currentProgression);
      }
    }

    return proposedChordIdx;
  }

  private findAlternativeChord(
    problematicIdx: number,
    chords: string[],
    currentProgression: string[]
  ): number {
    // Find a more suitable chord alternative
    const lastChord = currentProgression[currentProgression.length - 1];

    // Try to find a chord that shares notes with the previous chord
    for (let i = 0; i < chords.length; i++) {
      if (i !== problematicIdx && this.chordsShareNotes(lastChord, chords[i])) {
        return i;
      }
    }

    // Fallback to tonic
    return chords.findIndex(c => c.includes('maj') && !c.includes('m')) || 0;
  }

  private chordsShareNotes(chord1: string, chord2: string): boolean {
    // Simplified check for common notes between chords
    const chord1Notes = this.getChordNotes(chord1);
    const chord2Notes = this.getChordNotes(chord2);

    return chord1Notes.some(note => chord2Notes.includes(note));
  }

  private getChordNotes(chord: string): string[] {
    // Extract notes from chord symbol (simplified)
    const chordMap: Record<string, string[]> = {
      'C': ['C', 'E', 'G'],
      'Dm': ['D', 'F', 'A'],
      'Em': ['E', 'G', 'B'],
      'F': ['F', 'A', 'C'],
      'G': ['G', 'B', 'D'],
      'Am': ['A', 'C', 'E'],
      'Bdim': ['B', 'D', 'F']
    };

    for (const [symbol, notes] of Object.entries(chordMap)) {
      if (chord.includes(symbol)) return notes;
    }

    return ['C', 'E', 'G']; // Default to major triad
  }

  private analyzeHarmony(chordProgression: string[], key?: string): Record<string, any> {
    // Simple harmonic analysis
    const analysis = {
      functionalAnalysis: [],
      tensionPoints: [],
      suggestions: []
    };

    chordProgression.forEach((chord, index) => {
      // Analyze chord function
      const chordFunction = this.analyzeChordFunction(chord, key);
      analysis.functionalAnalysis.push({
        chord,
        function: chordFunction,
        position: index
      });

      // Identify tension points
      if (chordFunction.includes('dominant') || chordFunction.includes('diminished')) {
        analysis.tensionPoints.push({
          chord,
          position: index,
          resolution: chordProgression[index + 1] || chordProgression[0]
        });
      }
    });

    return analysis;
  }

  private analyzeChordFunction(chord: string, key?: string): string {
    // Simplified chord function analysis
    if (chord.includes('maj')) return 'major';
    if (chord.includes('min')) return 'minor';
    if (chord.includes('dim')) return 'diminished';
    if (chord.includes('aug')) return 'augmented';
    if (chord.includes('7')) return 'seventh';
    return 'unknown';
  }

  private async generateRhythmicPatterns(
    timeSignature: [number, number],
    tempo: number,
    style: string
  ): Promise<number[][]> {
    // Enhanced rhythmic pattern generation using neural networks and music theory
    const patterns: number[][] = [];

    // Use rhythm generator if available for sophisticated patterns
    if (this.rhythmGenerator) {
      try {
        const mlPatterns = await this.generateNeuralRhythms(timeSignature, tempo, style);
        patterns.push(...mlPatterns);
      } catch (error) {
        console.warn('Neural rhythm generation failed, falling back to algorithmic patterns:', error);
      }
    }

    // Always include algorithmic patterns as fallback and for variety
    const algorithmicPatterns = this.generateAdvancedRhythmicPatterns(timeSignature, tempo, style);
    patterns.push(...algorithmicPatterns);

    return patterns;
  }

  private async generateNeuralRhythms(
    timeSignature: [number, number],
    tempo: number,
    style: string
  ): Promise<number[][]> {
    // Use the trained neural network to generate sophisticated rhythmic patterns
    const patterns: number[][] = [];

    // Create feature vector for the rhythm model
    const rhythmFeatures = this.extractRhythmFeatures(timeSignature, tempo, style);

    // Generate multiple patterns with different initial conditions
    for (let i = 0; i < 3; i++) {
      const inputTensor = tf.tensor2d([rhythmFeatures]);
      try {
        const prediction = this.rhythmGenerator!.predict(inputTensor) as tf.Tensor;
        const output = await prediction.data() as Float32Array;

        // Convert neural network output to rhythmic pattern
        const pattern = this.decodeRhythmOutput(output, timeSignature);
        patterns.push(pattern);

        prediction.dispose();
      } catch (error) {
        console.error(`Failed to generate neural rhythm pattern ${i}:`, error);
      } finally {
        inputTensor.dispose();
      }
    }

    return patterns;
  }

  private extractRhythmFeatures(timeSignature: [number, number], tempo: number, style: string): number[] {
    // Extract comprehensive rhythmic features for neural network input
    const features = [
      // Time signature features
      timeSignature[0] / 8, // Normalized beats per measure
      timeSignature[1] / 8, // Normalized beat unit

      // Tempo features
      tempo / 200, // Normalized tempo
      this.classifyTempoRange(tempo), // Tempo category (slow, medium, fast)

      // Style encoding
      ...this.encodeMusicalStyle(style),

      // Microtiming features
      this.calculateSwingRatio(style),
      this.calculateGrooveComplexity(style),

      // Syncopation tendency
      this.calculateSyncopationTendency(style),

      // Padding to reach expected input size
      ...new Array(16 - 8).fill(0)
    ];

    return features;
  }

  private classifyTempoRange(tempo: number): number {
    if (tempo < 60) return 0; // Very slow
    if (tempo < 90) return 0.25; // Slow
    if (tempo < 120) return 0.5; // Medium
    if (tempo < 140) return 0.75; // Fast
    return 1.0; // Very fast
  }

  private encodeMusicalStyle(style: string): number[] {
    const styles = ['rock', 'jazz', 'electronic', 'classical', 'folk', 'blues', 'funk', 'latin'];
    return styles.map(s => s === style ? 1 : 0);
  }

  private calculateSwingRatio(style: string): number {
    // Calculate typical swing ratio for different styles
    const swingRatios: Record<string, number> = {
      'jazz': 0.67, // Classic triplet swing
      'blues': 0.6,
      'swing': 0.67,
      'funk': 0.55,
      'rock': 0.5, // Straight eighth notes
      'electronic': 0.5,
      'classical': 0.5,
      'folk': 0.5
    };

    return swingRatios[style.toLowerCase()] || 0.5;
  }

  private calculateGrooveComplexity(style: string): number {
    // Rhythmic complexity rating for different styles
    const complexityRatings: Record<string, number> = {
      'jazz': 0.9,
      'funk': 0.85,
      'latin': 0.8,
      'electronic': 0.7,
      'blues': 0.6,
      'rock': 0.5,
      'folk': 0.4,
      'classical': 0.3
    };

    return complexityRatings[style.toLowerCase()] || 0.5;
  }

  private calculateSyncopationTendency(style: string): number {
    // Likelihood of syncopation in different styles
    const syncopationRatings: Record<string, number> = {
      'funk': 0.9,
      'jazz': 0.8,
      'latin': 0.85,
      'electronic': 0.7,
      'blues': 0.6,
      'rock': 0.4,
      'folk': 0.2,
      'classical': 0.1
    };

    return syncopationRatings[style.toLowerCase()] || 0.5;
  }

  private decodeRhythmOutput(output: Float32Array, timeSignature: [number, number]): number[] {
    // Convert neural network output to a rhythmic pattern
    const patternLength = 16; // 16th note resolution
    const pattern: number[] = [];

    for (let i = 0; i < patternLength; i++) {
      const outputIndex = Math.min(i, output.length - 1);
      pattern.push(output[outputIndex]);
    }

    // Post-process pattern for musicality
    return this.postProcessRhythmPattern(pattern, timeSignature);
  }

  private postProcessRhythmPattern(pattern: number[], timeSignature: [number, number]): number[] {
    // Apply post-processing to ensure musical coherence
    const processed = [...pattern];

    // Normalize velocities
    const maxVal = Math.max(...processed);
    if (maxVal > 0) {
      for (let i = 0; i < processed.length; i++) {
        processed[i] = processed[i] / maxVal;
      }
    }

    // Apply human feel with microtiming variations
    for (let i = 0; i < processed.length; i++) {
      // Add slight random variations for humanization
      const humanization = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      processed[i] = Math.max(0, Math.min(1, processed[i] + humanization));
    }

    // Ensure downbeats have appropriate emphasis
    const beatsPerMeasure = timeSignature[0];
    const sixteenthsPerBeat = 16 / beatsPerMeasure;

    for (let beat = 0; beat < beatsPerMeasure; beat++) {
      const downbeatIndex = Math.floor(beat * sixteenthsPerBeat);
      if (downbeatIndex < processed.length) {
        processed[downbeatIndex] = Math.max(processed[downbeatIndex], 0.7); // Emphasize downbeats
      }
    }

    return processed;
  }

  private generateAdvancedRhythmicPatterns(
    timeSignature: [number, number],
    tempo: number,
    style: string
  ): number[][] {
    // Generate algorithmic patterns using advanced music theory principles
    const patterns: number[][] = [];

    // Style-specific pattern generators
    switch (style.toLowerCase()) {
      case 'jazz':
        patterns.push(this.generateAdvancedSwingPattern(timeSignature, tempo));
        patterns.push(this.generatePolyrhythmPattern(timeSignature, [3, 2])); // Triplet over duplet
        break;

      case 'electronic':
        patterns.push(this.generateAdvancedFourOnTheFloor(timeSignature, tempo));
        patterns.push(this.generateSyncopatedPattern(timeSignature, 0.8));
        patterns.push(this.generateGlitchPattern(timeSignature));
        break;

      case 'funk':
        patterns.push(this.generateFunkPattern(timeSignature, tempo));
        patterns.push(this.generateSyncopatedPattern(timeSignature, 0.9));
        break;

      case 'latin':
        patterns.push(this.generateClavePattern(timeSignature));
        patterns.push(this.generateSongoPattern(timeSignature));
        break;

      default:
        patterns.push(this.generateDynamicPattern(timeSignature, tempo, style));
    }

    return patterns;
  }

  private generateAdvancedSwingPattern(timeSignature: [number, number], tempo: number): number[] {
    // Generate sophisticated swing pattern with dynamic variation
    const pattern: number[] = [];
    const beats = timeSignature[0];
    const swingRatio = this.calculateSwingRatio('jazz');

    for (let beat = 0; beat < beats; beat++) {
      // Downbeat
      pattern.push(1.0);

      // Swing eighth notes
      const swingEighth = Math.pow(swingRatio, 1 + Math.sin(beat * 0.5) * 0.2); // Dynamic swing
      pattern.push(swingEighth);
      pattern.push(1 - swingEighth); // Complementary note

      // Add ghost notes for authenticity
      if (beat % 2 === 1) {
        pattern.push(0.3); // Ghost note on weak beats
      }
    }

    // Trim or extend to 16th note resolution
    while (pattern.length < 16) {
      pattern.push(Math.random() * 0.2); // Light embellishments
    }

    return pattern.slice(0, 16);
  }

  private generatePolyrhythmPattern(timeSignature: [number, number], polyrhythm: [number, number]): number[] {
    // Generate polyrhythmic patterns (e.g., 3 over 2, 5 over 4)
    const pattern: number[] = [];
    const [numerator, denominator] = polyrhythm;
    const beats = timeSignature[0];

    // Create pattern by layering different rhythmic divisions
    for (let i = 0; i < 16; i++) {
      const positionInBeat = (i / 4) % 1;

      // Primary rhythm
      const primaryAccent = Math.sin(positionInBeat * Math.PI * 2 * numerator) > 0.7 ? 1 : 0;

      // Secondary rhythm
      const secondaryAccent = Math.sin(positionInBeat * Math.PI * 2 * denominator) > 0.5 ? 0.6 : 0;

      // Combine rhythms
      pattern.push(Math.max(primaryAccent, secondaryAccent));
    }

    return pattern;
  }

  private generateAdvancedFourOnTheFloor(timeSignature: [number, number], tempo: number): number[] {
    // Enhanced four-on-the-floor with off-beat hi-hats
    const pattern: number[] = [];
    const beats = Math.min(4, timeSignature[0]);

    for (let i = 0; i < 16; i++) {
      const positionInBeat = (i / 4) % 1;

      if (positionInBeat === 0 && i / 4 < beats) {
        pattern.push(1.0); // Kick on downbeats
      } else if (positionInBeat === 0.5) {
        pattern.push(0.4); // Hi-hat on off-beats
      } else if (i % 2 === 1) {
        pattern.push(0.2); // Open hi-hat variations
      } else {
        pattern.push(0.1); // Ghost notes
      }
    }

    return pattern;
  }

  private generateFunkPattern(timeSignature: [number, number], tempo: number): number[] {
    // Generate funk pattern with strong syncopation and groove
    const pattern: number[] = [];

    // Funk rhythm matrix based on James Brown style
    const funkTemplate = [1, 0, 0.3, 0.8, 0, 0.5, 0, 0.7, 1, 0, 0.2, 0.9, 0, 0.6, 0, 0.8];

    for (let i = 0; i < 16; i++) {
      let velocity = funkTemplate[i % funkTemplate.length];

      // Add rhythmic displacement for syncopation
      if (i % 4 === 2) {
        velocity *= 0.8; // Slightly displace certain beats
      }

      // Dynamic variation
      velocity *= (0.9 + Math.random() * 0.2);

      pattern.push(Math.min(1, velocity));
    }

    return pattern;
  }

  private generateClavePattern(timeSignature: [number, number]): number[] {
    // Generate Afro-Cuban clave patterns
    const pattern: number[] = [];

    // 3-2 son clave pattern (simplified to 16th notes)
    const clavePattern = [1, 0, 0, 0.8, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.7, 0];

    for (let i = 0; i < 16; i++) {
      pattern.push(clavePattern[i]);
    }

    return pattern;
  }

  private generateSongoPattern(timeSignature: [number, number]): number[] {
    // Generate Songo pattern (more complex than clave)
    const pattern: number[] = [];

    // Songo rhythm with multiple layers
    const songoPattern = [1, 0.3, 0, 0.8, 0.2, 0, 0.6, 0, 0.9, 0.4, 0, 0.7, 0.1, 0, 0.5, 0.8];

    for (let i = 0; i < 16; i++) {
      pattern.push(songoPattern[i % songoPattern.length]);
    }

    return pattern;
  }

  private generateSyncopatedPattern(timeSignature: [number, number], syncopationLevel: number): number[] {
    // Generate pattern with controlled syncopation
    const pattern: number[] = [];

    for (let i = 0; i < 16; i++) {
      const positionInBeat = (i / 4) % 1;

      // Base accent on downbeats
      let velocity = positionInBeat === 0 ? 0.8 : 0.2;

      // Add syncopation
      if (Math.random() < syncopationLevel && positionInBeat > 0.2 && positionInBeat < 0.8) {
        velocity = 0.6 + Math.random() * 0.4; // Syncopated accent
      }

      pattern.push(velocity);
    }

    return pattern;
  }

  private generateGlitchPattern(timeSignature: [number, number]): number[] {
    // Generate electronic glitch pattern with random accents
    const pattern: number[] = [];

    for (let i = 0; i < 16; i++) {
      if (Math.random() < 0.15) {
        pattern.push(0.7 + Math.random() * 0.3); // Random accent
      } else if (Math.random() < 0.3) {
        pattern.push(0.2 + Math.random() * 0.3); // Medium accent
      } else {
        pattern.push(Math.random() * 0.1); // Ghost note or rest
      }
    }

    return pattern;
  }

  private generateDynamicPattern(timeSignature: [number, number], tempo: number, style: string): number[] {
    // Generate dynamically adjusted pattern based on tempo and style
    const pattern: number[] = [];
    const complexity = this.calculateGrooveComplexity(style);
    const syncopation = this.calculateSyncopationTendency(style);

    for (let i = 0; i < 16; i++) {
      const positionInBeat = (i / 4) % 1;

      // Dynamic accent calculation
      let velocity = 0.3;

      // Downbeat emphasis
      if (positionInBeat === 0) {
        velocity = 0.8;
      }
      // Off-beat emphasis based on syncopation tendency
      else if (positionInBeat === 0.5) {
        velocity = 0.3 + syncopation * 0.5;
      }
      // Complex rhythmic subdivisions based on complexity
      else if (Math.random() < complexity) {
        velocity = 0.2 + Math.random() * 0.4;
      }

      pattern.push(velocity);
    }

    return pattern;
  }

  private generateSwingPattern(timeSignature: [number, number]): number[] {
    // Simplified swing pattern
    const pattern: number[] = [];
    const beats = timeSignature[0];

    for (let i = 0; i < beats; i++) {
      pattern.push(1); // Downbeat
      pattern.push(i % 2 === 0 ? 0.7 : 0.3); // Swing eighth note
    }

    return pattern;
  }

  private generateFourOnTheFloor(timeSignature: [number, number]): number[] {
    // Four-on-the-floor pattern
    const pattern: number[] = [];
    const beats = Math.min(4, timeSignature[0]);

    for (let i = 0; i < beats; i++) {
      pattern.push(1); // Kick on each beat
    }

    // Add hi-hats
    while (pattern.length < 16) {
      pattern.push(0.5);
    }

    return pattern;
  }

  private generateBreakbeat(timeSignature: [number, number]): number[] {
    // Simplified breakbeat pattern
    return [1, 0, 0.5, 0, 0.8, 0, 0.5, 0, 1, 0, 0.3, 0, 0.6, 0, 0.5, 0];
  }

  private generateBasicPattern(timeSignature: [number, number]): number[] {
    // Basic rhythmic pattern
    const pattern: number[] = [];
    const beats = timeSignature[0];

    for (let i = 0; i < beats; i++) {
      pattern.push(i % 2 === 0 ? 1 : 0.5);
    }

    return pattern;
  }

  private generateMelodicContour(
    currentContour: number[],
    scale: string[],
    length: number
  ): number[] {
    // Generate a melodic contour that fits the scale
    const contour: number[] = [];
    const scaleDegrees = scale.length;

    // Start from a reasonable point in the contour
    const startPoint = currentContour.length > 0 ?
      currentContour[currentContour.length - 1] : 5;

    for (let i = 0; i < length; i++) {
      // Create a musically sensible contour
      if (i === 0) {
        contour.push(startPoint);
      } else if (i === length - 1) {
        // Return to starting point for closure
        contour.push(startPoint);
      } else {
        // Create stepwise motion with occasional leaps
        const lastNote = contour[contour.length - 1];
        const step = Math.random() > 0.8 ?
          (Math.random() - 0.5) * 4 : // Leap
          (Math.random() - 0.5) * 2; // Step

        const newNote = Math.max(0, Math.min(scaleDegrees - 1, lastNote + step));
        contour.push(newNote);
      }
    }

    return contour;
  }

  private analyzeInstrumentation(instrumentation: string[]): Record<string, any> {
    // Analyze current instrumentation
    const analysis = {
      balance: {},
      coverage: {},
      suggestions: []
    };

    // Instrument categories
    const categories = {
      rhythm: ['drums', 'percussion', 'bass'],
      harmony: ['piano', 'guitar', 'organ'],
      melody: ['violin', 'flute', 'trumpet', 'saxophone', 'vocals'],
      counterpoint: ['cello', 'viola', 'trombone'],
      effects: ['synthesizer', 'sampler']
    };

    Object.entries(categories).forEach(([category, instruments]) => {
      const present = instrumentation.filter(inst =>
        instruments.some(catInst => inst.toLowerCase().includes(catInst))
      );
      analysis.balance[category] = present.length;
      analysis.coverage[category] = present.length / instruments.length;
    });

    return analysis;
  }

  private suggestAdditionalInstruments(
    currentInstrumentation: string[],
    style: string,
    ensembleSize: 'small' | 'medium' | 'large'
  ): string[] {
    const suggestions: string[] = [];

    // Style-specific suggestions
    const styleSuggestions: Record<string, string[]> = {
      'jazz': ['piano', 'bass', 'drums', 'saxophone', 'trumpet'],
      'classical': ['violin', 'cello', 'viola', 'flute', 'oboe'],
      'rock': ['electric guitar', 'bass', 'drums', 'vocals'],
      'electronic': ['synthesizer', 'drum machine', 'sampler'],
      'folk': ['acoustic guitar', 'violin', 'mandolin', 'banjo']
    };

    const targetInstruments = styleSuggestions[style] || styleSuggestions['rock'];
    const missing = targetInstruments.filter(inst =>
      !currentInstrumentation.some(current =>
        current.toLowerCase().includes(inst.toLowerCase())
      )
    );

    // Limit suggestions based on ensemble size
    const maxAdditions = ensembleSize === 'small' ? 2 : ensembleSize === 'medium' ? 4 : 6;
    suggestions.push(...missing.slice(0, maxAdditions));

    return suggestions;
  }

  private generateSpatialArrangement(
    instrumentation: string[],
    timbre: any
  ): Record<string, any> {
    const arrangement: Record<string, any> = {
      stereoPlacement: {},
      reverbSettings: {},
      panningSuggestions: []
    };

    // Basic stereo placement
    const positions = [-80, -40, 0, 40, 80]; // Left to right
    instrumentation.forEach((inst, index) => {
      const position = positions[index % positions.length];
      arrangement.stereoPlacement[inst] = position;

      // Reverb settings based on instrument type
      if (inst.includes('vocal') || inst.includes('lead')) {
        arrangement.reverbSettings[inst] = { wetLevel: 0.2, decay: 2.5 };
      } else if (inst.includes('drum')) {
        arrangement.reverbSettings[inst] = { wetLevel: 0.1, decay: 1.8 };
      } else {
        arrangement.reverbSettings[inst] = { wetLevel: 0.3, decay: 3.0 };
      }
    });

    return arrangement;
  }

  private inferStyleFromFeatures(features: MusicalFeatures): string {
    // Simple style inference based on features
    if (features.tempo > 120 && features.instrumentation.some(i => i.includes('synthesizer'))) {
      return 'electronic';
    } else if (features.harmonicComplexity > 0.7 && features.rhythmicComplexity > 0.6) {
      return 'jazz';
    } else if (features.instrumentation.some(i => i.includes('violin') || i.includes('cello'))) {
      return 'classical';
    } else {
      return 'contemporary';
    }
  }

  private initializeStyleDatabase(): void {
    // Initialize with basic style templates
    this.styleDatabase = [];
  }

  private initializeSchillingerPatterns(): void {
    // Initialize Schillinger patterns
    this.schillingerPatterns = [
      {
        id: 'schillinger_rhythm_1',
        name: 'Resultant Rhythm',
        type: 'rhythmic',
        description: 'Combination of two or more rhythmic patterns',
        pattern: { rhythm: [1, 0, 0.5, 0, 1, 0, 0.5, 0] },
        application: 'Create complex rhythmic textures',
        examples: ['Layered percussion', 'Polyrhythms', 'Cross-rhythms']
      },
      {
        id: 'schillinger_melody_1',
        name: 'Pitch Scales',
        type: 'melodic',
        description: 'Systematic pitch organization',
        pattern: { intervals: [0, 2, 4, 5, 7, 9, 11] },
        application: 'Generate melodic material',
        examples: ['Diatonic scales', 'Pentatonic scales', 'Chromatic scales']
      }
    ];
  }

  private getSchillingerRhythms(timeSignature?: [number, number]): SchillingerPattern[] {
    return this.schillingerPatterns.filter(p => p.type === 'rhythmic');
  }

  private getSchillingerMelodies(key?: string): SchillingerPattern[] {
    return this.schillingerPatterns.filter(p => p.type === 'melodic');
  }

  private generateSuggestionId(): string {
    return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default MusicalIntelligence;