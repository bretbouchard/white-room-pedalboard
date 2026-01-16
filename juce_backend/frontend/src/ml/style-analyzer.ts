import * as tf from '@tensorflow/tfjs';
import { MusicalFeatures, MusicalStyle } from './musical-intelligence';

//================================================================================================
// Style and Genre Analysis System
//================================================================================================

export interface StyleFeatures {
  tempo: number;
  key: string;
  mode: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
  timeSignature: [number, number];
  harmonicComplexity: number;
  rhythmicComplexity: number;
  melodicComplexity: number;
  instrumentation: string[];
  dynamics: {
    range: number;
    variation: number;
    attackProfile: number[];
  };
  timbre: {
    brightness: number;
    warmth: number;
    roughness: number;
    spectral: {
      centroid: number;
      rolloff: number;
      flux: number;
    };
  };
  microtonal: {
    inflections: number;
    ornaments: number;
    bends: number;
  };
  stylistic: {
    swingRatio: number;
    syncopationLevel: number;
    ornamentationLevel: number;
    improvisationLevel: number;
  };
}

export interface GenreAnalysis {
  primaryGenre: {
    name: string;
    confidence: number;
    characteristics: string[];
  };
  secondaryGenres: Array<{
    name: string;
    confidence: number;
    influence: number;
  }>;
  subgenres: Array<{
    name: string;
    confidence: number;
    parentGenre: string;
  }>;
  fusion: Array<{
    genres: string[];
    blend: string;
    confidence: number;
  }>;
  era: {
    period: string;
    confidence: number;
  };
  cultural: {
    origin: string;
    influences: string[];
  };
  characteristics: {
    complexity: number;
    sophistication: number;
    popularity: number;
    innovation: number;
  };
}

export interface StyleClassification {
  id: string;
  genre: string;
  subgenre?: string;
  era?: string;
  culturalOrigin?: string;
  characteristics: {
    harmonicLanguage: string;
    rhythmicCharacteristics: string[];
    melodicTendencies: string[];
    instrumentalTexture: string;
    formalStructures: string[];
    performancePractice: string;
  };
  confidence: number;
  analysis: {
    keyIndicators: Array<{
      feature: string;
      weight: number;
      value: number;
    }>;
    discriminators: string[];
    ambiguities: Array<{
      alternative: string;
      confidence: number;
    }>;
  };
}

export interface StyleEvolution {
  originalStyle: StyleClassification;
  evolutionPath: Array<{
    style: string;
    probability: number;
    characteristics: string[];
  }>;
  innovations: Array<{
    aspect: string;
    description: string;
    impact: number;
  }>;
  influences: Array<{
    source: string;
    type: 'direct' | 'indirect' | 'historical';
    strength: number;
  }>;
}

export class StyleAnalyzer {
  private genreClassifier: tf.LayersModel | null = null;
  private subgenreClassifier: tf.LayersModel | null = null;
  private eraClassifier: tf.LayersModel | null = null;
  private isInitialized = false;
  private styleDatabase: StyleClassification[] = [];
  private featureWeights: Record<string, number> = {};

  constructor() {
    this.initializeStyleDatabase();
    this.initializeFeatureWeights();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize genre classification model
      this.genreClassifier = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [48], // Style feature vector
            units: 128,
            activation: 'relu',
            name: 'genre_input'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 64,
            activation: 'relu',
            name: 'genre_hidden_1'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'genre_hidden_2'
          }),
          tf.layers.dense({
            units: 15, // Number of main genres
            activation: 'softmax',
            name: 'genre_output'
          })
        ]
      });

      this.genreClassifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy', 'topKCategoricalAccuracy']
      });

      // Initialize subgenre classification model
      this.subgenreClassifier = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [48],
            units: 96,
            activation: 'relu',
            name: 'subgenre_input'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 48,
            activation: 'relu',
            name: 'subgenre_hidden'
          }),
          tf.layers.dense({
            units: 25, // Number of subgenres
            activation: 'softmax',
            name: 'subgenre_output'
          })
        ]
      });

      this.subgenreClassifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Initialize era classification model
      this.eraClassifier = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [48],
            units: 64,
            activation: 'relu',
            name: 'era_input'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'era_hidden'
          }),
          tf.layers.dense({
            units: 8, // Number of historical periods
            activation: 'softmax',
            name: 'era_output'
          })
        ]
      });

      this.eraClassifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.isInitialized = true;
      console.log('Style analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize style analyzer:', error);
      throw error;
    }
  }

  async analyzeMusicalStyle(
    features: MusicalFeatures,
    context: {
      location?: string;
      time?: string;
      cultural?: string;
    } = {}
  ): Promise<GenreAnalysis> {
    if (!this.genreClassifier || !this.isInitialized) {
      await this.initialize();
    }

    try {
      // Extract comprehensive style features
      const styleFeatures = this.extractStyleFeatures(features);

      // Classify primary genre
      const primaryGenre = await this.classifyGenre(styleFeatures);

      // Identify secondary genres and subgenres
      const secondaryGenres = await this.identifySecondaryGenres(styleFeatures, primaryGenre);
      const subgenres = await this.identifySubgenres(styleFeatures, primaryGenre);

      // Detect fusion styles
      const fusionStyles = await this.detectFusionStyles(styleFeatures);

      // Classify historical era
      const era = await this.classifyEra(styleFeatures);

      // Analyze cultural aspects
      const cultural = this.analyzeCulturalAspects(styleFeatures, context);

      // Calculate overall characteristics
      const characteristics = this.calculateStyleCharacteristics(styleFeatures);

      const analysis: GenreAnalysis = {
        primaryGenre,
        secondaryGenres,
        subgenres,
        fusion: fusionStyles,
        era,
        cultural,
        characteristics
      };

      return analysis;
    } catch (error) {
      console.error('Style analysis failed:', error);
      return this.createFallbackStyleAnalysis(features, context);
    }
  }

  async classifyGenreEvolution(
    currentStyle: StyleClassification,
    historicalContext: {
      era?: string;
      location?: string;
      influences?: string[];
    }
  ): Promise<StyleEvolution> {
    // Analyze potential evolution paths for the current style
    const evolutionPath = this.generateEvolutionPaths(currentStyle, historicalContext);
    const innovations = this.identifyPotentialInnovations(currentStyle);
    const influences = this.analyzeStyleInfluences(currentStyle, historicalContext);

    return {
      originalStyle: currentStyle,
      evolutionPath,
      innovations,
      influences
    };
  }

  async compareStyles(
    style1: MusicalFeatures,
    style2: MusicalFeatures,
    analysisDepth: 'basic' | 'detailed' = 'detailed'
  ): Promise<{
    similarity: number;
    differences: Array<{
      aspect: string;
      style1Value: number;
      style2Value: number;
      significance: number;
    }>;
    commonElements: string[];
    uniqueElements: {
      style1: string[];
      style2: string[];
    };
  }> {
    // Extract features for both styles
    const features1 = this.extractStyleFeatures(style1);
    const features2 = this.extractStyleFeatures(style2);

    // Calculate comprehensive similarity
    const similarity = this.calculateStyleSimilarity(features1, features2);

    // Analyze differences
    const differences = this.analyzeStyleDifferences(features1, features2);

    // Identify common elements
    const commonElements = this.identifyCommonElements(features1, features2);

    // Identify unique elements
    const uniqueElements = this.identifyUniqueElements(features1, features2, analysisDepth);

    return {
      similarity,
      differences,
      commonElements,
      uniqueElements
    };
  }

  private extractStyleFeatures(features: MusicalFeatures): StyleFeatures {
    // Extract comprehensive style features from musical data
    return {
      tempo: features.tempo,
      key: features.key,
      mode: this.inferMode(features),
      timeSignature: features.timeSignature,
      harmonicComplexity: features.harmonicComplexity,
      rhythmicComplexity: features.rhythmicComplexity,
      melodicComplexity: this.calculateMelodicComplexity(features),
      instrumentation: features.instrumentation,
      dynamics: {
        range: this.calculateDynamicRange(features),
        variation: this.calculateDynamicVariation(features),
        attackProfile: this.extractAttackProfile(features)
      },
      timbre: {
        brightness: features.timbre.brightness,
        warmth: features.timbre.warmth,
        roughness: features.timbre.roughness,
        spectral: {
          centroid: features.spectralCentroid || 0.5,
          rolloff: features.spectralRolloff || 0.5,
          flux: this.calculateSpectralFlux(features)
        }
      },
      microtonal: {
        inflections: this.countMicrotonalInflections(features),
        ornaments: this.countOrnaments(features),
        bends: this.countBends(features)
      },
      stylistic: {
        swingRatio: this.calculateSwingRatio(features),
        syncopationLevel: this.calculateSyncopationLevel(features),
        ornamentationLevel: this.calculateOrnamentationLevel(features),
        improvisationLevel: this.calculateImprovisationLevel(features)
      }
    };
  }

  private async classifyGenre(features: StyleFeatures): Promise<GenreAnalysis['primaryGenre']> {
    // Use neural network to classify primary genre
    const featureVector = this.styleFeaturesToTensor(features);

    try {
      const prediction = this.genreClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data();

      const genres = [
        'Classical', 'Jazz', 'Blues', 'Rock', 'Pop', 'Electronic',
        'Hip Hop', 'R&B', 'Country', 'Folk', 'Reggae', 'Latin',
        'Metal', 'Punk', 'Funk'
      ];

      const maxIndex = Array.from(probabilities).indexOf(Math.max(...probabilities));
      const genreName = genres[maxIndex];
      const confidence = probabilities[maxIndex];

      const characteristics = this.getGenreCharacteristics(genreName, features);

      featureVector.dispose();
      prediction.dispose();

      return {
        name: genreName,
        confidence,
        characteristics
      };
    } catch (error) {
      console.warn('Neural genre classification failed, using heuristic analysis:', error);
      return this.heuristicGenreClassification(features);
    }
  }

  private async identifySecondaryGenres(
    features: StyleFeatures,
    primaryGenre: GenreAnalysis['primaryGenre']
  ): Promise<GenreAnalysis['secondaryGenres']> {
    // Identify secondary genre influences
    const secondaryGenres: GenreAnalysis['secondaryGenres'] = [];

    // Get all genre probabilities
    const featureVector = this.styleFeaturesToTensor(features);

    try {
      const prediction = this.genreClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data();

      const genres = [
        'Classical', 'Jazz', 'Blues', 'Rock', 'Pop', 'Electronic',
        'Hip Hop', 'R&B', 'Country', 'Folk', 'Reggae', 'Latin',
        'Metal', 'Punk', 'Funk'
      ];

      // Get top 3-5 genres excluding primary
      const sortedGenres = Array.from(probabilities)
        .map((prob, index) => ({ genre: genres[index], probability: prob }))
        .filter(g => g.genre !== primaryGenre.name)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 4);

      sortedGenres.forEach(({ genre, probability }) => {
        if (probability > 0.1) { // Threshold for secondary influence
          secondaryGenres.push({
            name: genre,
            confidence: probability,
            influence: this.calculateGenreInfluence(genre, primaryGenre.name, features)
          });
        }
      })

      featureVector.dispose();
      prediction.dispose();
    } catch (error) {
      console.warn('Secondary genre analysis failed:', error);
    }

    return secondaryGenres;
  }

  private async identifySubgenres(
    features: StyleFeatures,
    primaryGenre: GenreAnalysis['primaryGenre']
  ): Promise<GenreAnalysis['subgenres']> {
    // Identify specific subgenres
    const subgenres: GenreAnalysis['subgenres'] = [];

    const subgenreMap: Record<string, string[]> = {
      'Jazz': ['Bebop', 'Cool Jazz', 'Hard Bop', 'Modal Jazz', 'Free Jazz', 'Fusion'],
      'Rock': ['Classic Rock', 'Hard Rock', 'Progressive Rock', 'Punk Rock', 'Alternative Rock', 'Indie Rock'],
      'Electronic': ['House', 'Techno', 'Trance', 'Drum & Bass', 'Ambient', 'Dubstep'],
      'Classical': ['Baroque', 'Classical', 'Romantic', 'Modern', 'Contemporary'],
      'Hip Hop': ['Old School', 'Boom Bap', 'Trap', 'Conscious', 'Alternative'],
      'Blues': ['Delta Blues', 'Chicago Blues', 'Electric Blues', 'Blues Rock'],
      'Country': ['Traditional', 'Country Rock', 'Outlaw', 'Nashville Sound', 'Alt-Country'],
      'Latin': ['Salsa', 'Bossa Nova', 'Tango', 'Reggaeton', 'Cumbia'],
      'Metal': ['Heavy Metal', 'Thrash Metal', 'Death Metal', 'Black Metal', 'Power Metal']
    };

    const possibleSubgenres = subgenreMap[primaryGenre.name] || [];

    // Use heuristic analysis for subgenre identification
    possibleSubgenres.forEach(subgenre => {
      const match = this.matchSubgenreCharacteristics(subgenre, features);
      if (match.confidence > 0.3) {
        subgenres.push({
          name: subgenre,
          confidence: match.confidence,
          parentGenre: primaryGenre.name
        });
      }
    });

    return subgenres.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private async detectFusionStyles(features: StyleFeatures): Promise<GenreAnalysis['fusion']> {
    // Detect fusion of multiple genres
    const fusionStyles: GenreAnalysis['fusion'] = [];

    // Get all genre probabilities
    const featureVector = this.styleFeaturesToTensor(features);

    try {
      const prediction = this.genreClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data();

      const genres = [
        'Classical', 'Jazz', 'Blues', 'Rock', 'Pop', 'Electronic',
        'Hip Hop', 'R&B', 'Country', 'Folk', 'Reggae', 'Latin',
        'Metal', 'Punk', 'Funk'
      ];

      // Find potential fusions (multiple high-probability genres)
      const significantGenres = Array.from(probabilities)
        .map((prob, index) => ({ genre: genres[index], probability: prob }))
        .filter(g => g.probability > 0.3)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 4);

      // Create fusion combinations
      for (let i = 0; i < significantGenres.length - 1; i++) {
        for (let j = i + 1; j < significantGenres.length; j++) {
          const combinedConfidence = (significantGenres[i].probability + significantGenres[j].probability) / 2;

          if (combinedConfidence > 0.5) {
            fusionStyles.push({
              genres: [significantGenres[i].genre, significantGenres[j].genre],
              blend: this.generateFusionBlendName(significantGenres[i].genre, significantGenres[j].genre),
              confidence: combinedConfidence
            });
          }
        }
      }

      featureVector.dispose();
      prediction.dispose();
    } catch (error) {
      console.warn('Fusion detection failed:', error);
    }

    return fusionStyles;
  }

  private async classifyEra(features: StyleFeatures): Promise<GenreAnalysis['era']> {
    // Classify historical era
    const featureVector = this.styleFeaturesToTensor(features);

    try {
      const prediction = this.eraClassifier!.predict(featureVector) as tf.Tensor;
      const probabilities = await prediction.data();

      const eras = [
        'Medieval', 'Renaissance', 'Baroque', 'Classical', 'Romantic',
        'Early 20th Century', 'Mid 20th Century', 'Late 20th Century'
      ];

      const maxIndex = Array.from(probabilities).indexOf(Math.max(...probabilities));
      const eraName = eras[maxIndex];
      const confidence = probabilities[maxIndex];

      featureVector.dispose();
      prediction.dispose();

      return {
        period: eraName,
        confidence
      };
    } catch (error) {
      console.warn('Era classification failed:', error);
      return {
        period: 'Contemporary',
        confidence: 0.5
      };
    }
  }

  private analyzeCulturalAspects(
    features: StyleFeatures,
    context: { location?: string; time?: string; cultural?: string }
  ): GenreAnalysis['cultural'] {
    // Analyze cultural origins and influences
    const culturalIndicators = this.extractCulturalIndicators(features);

    return {
      origin: context.cultural || this.inferCulturalOrigin(culturalIndicators, context.location),
      influences: this.identifyCulturalInfluences(culturalIndicators, features)
    };
  }

  private calculateStyleCharacteristics(features: StyleFeatures): GenreAnalysis['characteristics'] {
    // Calculate overall style characteristics
    return {
      complexity: this.calculateOverallComplexity(features),
      sophistication: this.calculateSophistication(features),
      popularity: this.inferPopularity(features),
      innovation: this.assessInnovation(features)
    };
  }

  private styleFeaturesToTensor(features: StyleFeatures): tf.Tensor {
    // Convert style features to tensor for neural network
    const vector = [
      // Tempo and timing
      features.tempo / 200, // Normalized tempo
      features.timeSignature[0] / 8, // Normalized upper signature
      features.timeSignature[1] / 8, // Normalized lower signature

      // Complexity measures
      features.harmonicComplexity,
      features.rhythmicComplexity,
      features.melodicComplexity,

      // Instrumentation encoding (simplified)
      ...this.encodeInstrumentation(features.instrumentation),

      // Dynamic characteristics
      features.dynamics.range,
      features.dynamics.variation,
      ...features.dynamics.attackProfile.slice(0, 3),

      // Timbre characteristics
      features.timbre.brightness,
      features.timbre.warmth,
      features.timbre.roughness,
      features.timbre.spectral.centroid,
      features.timbre.spectral.rolloff,
      features.timbre.spectral.flux,

      // Microtonal features
      features.microtonal.inflections,
      features.microtonal.ornaments,
      features.microtonal.bends,

      // Stylistic features
      features.stylistic.swingRatio,
      features.stylistic.syncopationLevel,
      features.stylistic.ornamentationLevel,
      features.stylistic.improvisationLevel,

      // Mode encoding
      ...this.encodeMode(features.mode),

      // Padding to reach expected size
      ...new Array(48 - 32).fill(0)
    ];

    return tf.tensor2d([vector]);
  }

  private encodeInstrumentation(instrumentation: string[]): number[] {
    // Encode instrumentation as feature vector
    const instrumentCategories = {
      'strings': ['violin', 'viola', 'cello', 'double bass', 'guitar', 'bass'],
      'woodwinds': ['flute', 'clarinet', 'oboe', 'saxophone'],
      'brass': ['trumpet', 'trombone', 'french horn', 'tuba'],
      'percussion': ['drums', 'timpani', 'xylophone'],
      'keyboard': ['piano', 'organ', 'synthesizer'],
      'electronic': ['synthesizer', 'drum machine', 'sampler'],
      'vocal': ['vocals', 'choir', 'singing']
    };

    const encoding: number[] = [];

    Object.values(instrumentCategories).forEach(category => {
      const hasInstrument = instrumentation.some(inst =>
        category.some(catInst => inst.toLowerCase().includes(catInst.toLowerCase()))
      );
      encoding.push(hasInstrument ? 1 : 0);
    });

    return encoding;
  }

  private encodeMode(mode: StyleFeatures['mode']): number[] {
    // One-hot encode musical mode
    const modes: StyleFeatures['mode'][] = [
      'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'
    ];

    return modes.map(m => m === mode ? 1 : 0);
  }

  private inferMode(features: MusicalFeatures): StyleFeatures['mode'] {
    // Infer musical mode from available features
    // This is a simplified inference - real implementation would analyze chord progressions
    return features.mode === 'minor' ? 'minor' : 'major';
  }

  private calculateMelodicComplexity(features: MusicalFeatures): number {
    // Calculate melodic complexity
    if (features.melodicContour.length < 2) return 0;

    let totalChange = 0;
    for (let i = 1; i < features.melodicContour.length; i++) {
      totalChange += Math.abs(features.melodicContour[i] - features.melodicContour[i - 1]);
    }

    return Math.min(1, totalChange / (features.melodicContour.length - 1) / 12);
  }

  private calculateDynamicRange(features: MusicalFeatures): number {
    // Calculate dynamic range
    return (features.dynamics.attack + features.dynamics.release) / 2;
  }

  private calculateDynamicVariation(features: MusicalFeatures): number {
    // Calculate dynamic variation
    const dynamics = [features.dynamics.attack, features.dynamics.decay, features.dynamics.sustain, features.dynamics.release];
    const mean = dynamics.reduce((a, b) => a + b, 0) / dynamics.length;
    const variance = dynamics.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dynamics.length;

    return Math.sqrt(variance);
  }

  private extractAttackProfile(features: MusicalFeatures): number[] {
    // Extract attack profile for dynamic analysis
    return [features.dynamics.attack, features.dynamics.decay, features.dynamics.sustain];
  }

  private calculateSpectralFlux(features: MusicalFeatures): number {
    // Calculate spectral flux (simplified)
    return (features.timbre.brightness + features.timbre.roughness) / 2;
  }

  private countMicrotonalInflections(features: MusicalFeatures): number {
    // Count microtonal inflections (simplified)
    return features.melodicContour.filter(val => val % 1 !== 0).length;
  }

  private countOrnaments(features: MusicalFeatures): number {
    // Count ornaments (simplified)
    // In real implementation, this would analyze actual ornamentation patterns
    return features.rhythmicComplexity > 0.7 ? 3 : 1;
  }

  private countBends(features: MusicalFeatures): number {
    // Count pitch bends (simplified)
    return features.melodicContour.filter((val, i) =>
      i > 0 && Math.abs(val - features.melodicContour[i - 1]) > 2
    ).length;
  }

  private calculateSwingRatio(features: MusicalFeatures): number {
    // Calculate swing ratio
    // Simplified calculation based on rhythmic complexity
    return features.rhythmicComplexity > 0.6 ? 0.67 : 0.5;
  }

  private calculateSyncopationLevel(features: MusicalFeatures): number {
    // Calculate syncopation level
    return Math.min(1, features.rhythmicComplexity * 1.2);
  }

  private calculateOrnamentationLevel(features: MusicalFeatures): number {
    // Calculate ornamentation level
    return features.harmonicComplexity > 0.7 ? 0.8 : 0.3;
  }

  private calculateImprovisationLevel(features: MusicalFeatures): number {
    // Calculate improvisation level
    // Simplified based on complexity indicators
    return (features.harmonicComplexity + features.rhythmicComplexity) / 2;
  }

  private getGenreCharacteristics(genre: string, features: StyleFeatures): string[] {
    // Get characteristic features for a genre
    const characteristics: Record<string, string[]> = {
      'Classical': ['Complex harmony', 'Formal structure', 'Acoustic instruments', 'Written composition'],
      'Jazz': ['Improvisation', 'Swing rhythm', 'Extended harmony', 'Blue notes'],
      'Blues': ['12-bar structure', 'Blue notes', 'Call and response', 'Guitar-driven'],
      'Rock': ['4/4 time', 'Electric guitar', 'Strong backbeat', 'Verse-chorus structure'],
      'Pop': ['Catchy melodies', 'Simple harmony', 'Commercial appeal', 'Radio-friendly'],
      'Electronic': ['Synthesized sounds', 'Programmed rhythms', 'Studio production', 'Genre fusion'],
      'Hip Hop': ['Rhythmic complexity', 'Sampling', 'Urban influences', 'Social commentary'],
      'R&B': ['Soulful vocals', 'Groove-oriented', 'Gospel influences', 'Smooth production'],
      'Country': ['Storytelling', 'Acoustic instruments', 'Rural themes', 'Vocal harmonies'],
      'Folk': ['Acoustic tradition', 'Cultural storytelling', 'Simple harmony', 'Community focus'],
      'Reggae': ['Off-beat rhythms', 'Social themes', 'Bass emphasis', 'Caribbean origins'],
      'Latin': ['Complex rhythms', 'Percussion emphasis', 'Dance orientation', 'Cultural fusion'],
      'Metal': ['Distorted guitar', 'Powerful vocals', 'Complex rhythms', 'Dark themes'],
      'Punk': ['Fast tempo', 'Simple structure', 'Anti-establishment', 'Raw energy'],
      'Funk': ['Groove emphasis', 'Complex basslines', 'Syncopation', 'Dance focus']
    };

    return characteristics[genre] || ['Unknown genre characteristics'];
  }

  private heuristicGenreClassification(features: StyleFeatures): GenreAnalysis['primaryGenre'] {
    // Fallback heuristic genre classification
    const scores: Record<string, number> = {};

    // Tempo-based classification
    if (features.tempo < 60) scores.Classical = 0.3;
    if (features.tempo > 120 && features.tempo < 140) scores['Rock'] = 0.3;
    if (features.tempo > 120) scores['Electronic'] = 0.2;
    if (features.tempo > 80 && features.tempo < 120) scores['Jazz'] = 0.2;

    // Instrumentation-based classification
    if (features.instrumentation.some(i => i.includes('violin') || i.includes('cello'))) {
      scores.Classical = (scores.Classical || 0) + 0.4;
    }
    if (features.instrumentation.some(i => i.includes('synthesizer'))) {
      scores.Electronic = (scores.Electronic || 0) + 0.4;
    }
    if (features.instrumentation.some(i => i.includes('saxophone'))) {
      scores.Jazz = (scores.Jazz || 0) + 0.3;
    }

    // Complexity-based classification
    if (features.harmonicComplexity > 0.8) {
      scores.Jazz = (scores.Jazz || 0) + 0.3;
      scores.Classical = (scores.Classical || 0) + 0.2;
    }
    if (features.rhythmicComplexity > 0.8) {
      scores.Latin = (scores.Latin || 0) + 0.3;
      scores.Funk = (scores.Funk || 0) + 0.2;
    }

    // Find best match
    const bestMatch = Object.entries(scores).reduce((best, [genre, score]) =>
      score > best.score ? { genre, score } : best, { genre: 'Pop', score: 0.5 }
    );

    return {
      name: bestMatch.genre,
      confidence: Math.min(0.8, bestMatch.score),
      characteristics: this.getGenreCharacteristics(bestMatch.genre, features)
    };
  }

  private calculateGenreInfluence(
    genre: string,
    primaryGenre: string,
    features: StyleFeatures
  ): number {
    // Calculate how much a secondary genre influences the primary style
    const influenceMatrix: Record<string, Record<string, number>> = {
      'Jazz': {
        'Rock': 0.7,  // Jazz-rock fusion
        'Electronic': 0.6,  // Electronic jazz
        'Classical': 0.4,  // Third stream
        'Latin': 0.8   // Latin jazz
      },
      'Rock': {
        'Blues': 0.8,   // Blues rock
        'Electronic': 0.5,  // Electronic rock
        'Folk': 0.6,    // Folk rock
        'Jazz': 0.7     // Jazz rock
      },
      'Electronic': {
        'Hip Hop': 0.7,  // Electronic hip hop
        'Jazz': 0.6,    // Electronic jazz
        'Rock': 0.5,    // Electronic rock
        'Pop': 0.8      // Electronic pop
      }
    };

    return influenceMatrix[primaryGenre]?.[genre] || 0.3;
  }

  private matchSubgenreCharacteristics(
    subgenre: string,
    features: StyleFeatures
  ): { confidence: number; characteristics: string[] } {
    // Match characteristics to subgenre patterns
    const patterns: Record<string, { features: Partial<StyleFeatures>; weight: number }> = {
      'Bebop': { features: { tempo: 200, harmonicComplexity: 0.9, melodicComplexity: 0.9 }, weight: 0.8 },
      'Cool Jazz': { features: { tempo: 120, harmonicComplexity: 0.7, melodicComplexity: 0.6 }, weight: 0.7 },
      'House': { features: { tempo: 128, rhythmicComplexity: 0.5, melodicComplexity: 0.6 }, weight: 0.8 },
      'Techno': { features: { tempo: 140, rhythmicComplexity: 0.8, melodicComplexity: 0.7 }, weight: 0.8 },
      'Hard Rock': { features: { tempo: 140, harmonicComplexity: 0.6, melodicComplexity: 0.7 }, weight: 0.7 },
      'Heavy Metal': {
        features: {
          harmonicComplexity: 0.8,
          rhythmicComplexity: 0.7,
          timbre: {
            brightness: 0.3,
            warmth: 0.2,
            roughness: 0.9,
            spectral: { centroid: 2000, rolloff: 5000, flux: 0.8 }
          }
        },
        weight: 0.8
      }
    };

    const pattern = patterns[subgenre];
    if (!pattern) return { confidence: 0.3, characteristics: [] };

    const match = this.calculatePatternMatch(features, pattern.features);
    return {
      confidence: match * pattern.weight,
      characteristics: this.getSubgenreCharacteristics(subgenre)
    };
  }

  private calculatePatternMatch(
    features: StyleFeatures,
    pattern: Partial<StyleFeatures>
  ): number {
    // Calculate how well features match a pattern
    let match = 0;
    let count = 0;

    Object.entries(pattern).forEach(([key, value]) => {
      if (key in features && typeof value === 'number' && typeof features[key as keyof StyleFeatures] === 'number') {
        const featureValue = features[key as keyof StyleFeatures] as number;
        const similarity = 1 - Math.abs(featureValue - value);
        match += similarity;
        count++;
      }
    });

    return count > 0 ? match / count : 0;
  }

  private getSubgenreCharacteristics(subgenre: string): string[] {
    // Get characteristics for subgenres
    const characteristics: Record<string, string[]> = {
      'Bebop': ['Fast tempo', 'Complex harmony', 'Improvisation', 'Small ensemble'],
      'Cool Jazz': ['Relaxed tempo', 'Smooth harmony', 'Less improvisation', 'Cool tone'],
      'House': ['4/4 time', 'Steady beat', 'Synthesizer bass', 'Dance-oriented'],
      'Techno': ['4/4 time', 'Repetitive patterns', 'Industrial sounds', 'High energy'],
      'Hard Rock': ['Distorted guitar', 'Power chords', 'Strong backbeat', 'High energy'],
      'Heavy Metal': ['Complex rhythms', 'Distorted guitar', 'Power vocals', 'Dark themes']
    };

    return characteristics[subgenre] || [];
  }

  private generateFusionBlendName(genre1: string, genre2: string): string {
    // Generate appropriate fusion blend names
    const fusionNames: Record<string, string> = {
      'Jazz-Rock': 'Jazz Rock',
      'Rock-Jazz': 'Jazz Rock',
      'Electronic-Hip Hop': 'Electronic Hip Hop',
      'Latin-Jazz': 'Latin Jazz',
      'Classical-Pop': 'Classical Pop',
      'Funk-Rock': 'Funk Rock'
    };

    const key1 = `${genre1}-${genre2}`;
    const key2 = `${genre2}-${genre1}`;

    return fusionNames[key1] || fusionNames[key2] || `${genre1}-${genre2} Fusion`;
  }

  private extractCulturalIndicators(features: StyleFeatures): Record<string, number> {
    // Extract cultural indicators from features
    return {
      'rhythmComplexity': features.rhythmicComplexity,
      'syncopationLevel': features.stylistic.syncopationLevel,
      'swingRatio': features.stylistic.swingRatio,
      'instrumentationDiversity': features.instrumentation.length,
      'harmonicComplexity': features.harmonicComplexity,
      'improvisationLevel': features.stylistic.improvisationLevel
    };
  }

  private inferCulturalOrigin(
    indicators: Record<string, number>,
    location?: string
  ): string {
    // Infer cultural origin from indicators
    if (indicators.swingRatio > 0.6 && indicators.syncopationLevel > 0.7) {
      return 'American (African influences)';
    }
    if (indicators.syncopationLevel > 0.8 && indicators.rhythmComplexity > 0.7) {
      return 'Latin American';
    }
    if (indicators.harmonicComplexity > 0.8 && indicators.improvisationLevel < 0.3) {
      return 'European Classical';
    }
    if (indicators.instrumentationDiversity > 8) {
      return 'World Music / Fusion';
    }

    return location ? `${location} Regional` : 'Contemporary Western';
  }

  private identifyCulturalInfluences(
    indicators: Record<string, number>,
    features: StyleFeatures
  ): string[] {
    // Identify cultural influences
    const influences: string[] = [];

    if (indicators.swingRatio > 0.5) influences.push('African American');
    if (indicators.syncopationLevel > 0.7) influences.push('Caribbean');
    if (indicators.harmonicComplexity > 0.8) influences.push('European Classical');
    if (features.instrumentation.some(i => i.includes('sitar') || i.includes('tabla'))) {
      influences.push('Indian');
    }

    return influences;
  }

  private calculateOverallComplexity(features: StyleFeatures): number {
    // Calculate overall musical complexity
    return (
      features.harmonicComplexity * 0.3 +
      features.rhythmicComplexity * 0.3 +
      features.melodicComplexity * 0.2 +
      features.stylistic.improvisationLevel * 0.2
    );
  }

  private calculateSophistication(features: StyleFeatures): number {
    // Calculate sophistication level
    return (
      features.harmonicComplexity * 0.4 +
      features.timbre.spectral.centroid * 0.3 +
      features.stylistic.ornamentationLevel * 0.3
    );
  }

  private inferPopularity(features: StyleFeatures): number {
    // Infer popularity based on characteristics
    // Simplified heuristic
    if (features.harmonicComplexity < 0.6 && features.rhythmicComplexity < 0.7) {
      return 0.8; // High popularity for simpler styles
    } else if (features.harmonicComplexity > 0.8) {
      return 0.3; // Lower popularity for complex styles
    }
    return 0.5; // Moderate popularity
  }

  private assessInnovation(features: StyleFeatures): number {
    // Assess innovation level
    return (
      features.stylistic.improvisationLevel * 0.4 +
      features.harmonicComplexity * 0.3 +
      features.microtonal.inflections * 0.3
    );
  }

  private createFallbackStyleAnalysis(
    features: MusicalFeatures,
    context: { location?: string; time?: string; cultural?: string }
  ): GenreAnalysis {
    // Create fallback style analysis when neural networks fail
    const styleFeatures = this.extractStyleFeatures(features);
    const primaryGenre = this.heuristicGenreClassification(styleFeatures);

    return {
      primaryGenre,
      secondaryGenres: [],
      subgenres: [],
      fusion: [],
      era: { period: 'Contemporary', confidence: 0.3 },
      cultural: {
        origin: context.cultural || 'Unknown',
        influences: []
      },
      characteristics: this.calculateStyleCharacteristics(styleFeatures)
    };
  }

  private generateEvolutionPaths(
    currentStyle: StyleClassification,
    historicalContext: { era?: string; location?: string; influences?: string[] }
  ): Array<{
    style: string;
    probability: number;
    characteristics: string[];
  }> {
    // Generate potential evolution paths for a style
    const paths: Array<{
      style: string;
      probability: number;
      characteristics: string[];
    }> = [];

    // Based on current style and historical context
    if (currentStyle.genre === 'Jazz') {
      paths.push(
        { style: 'Fusion', probability: 0.7, characteristics: ['Electronic integration', 'Cross-cultural elements'] },
        { style: 'Smooth Jazz', probability: 0.5, characteristics: ['Simplified harmony', 'Commercial appeal'] },
        { style: 'Free Jazz', probability: 0.3, characteristics: ['Experimental', 'Avant-garde'] }
      );
    }

    if (currentStyle.genre === 'Rock') {
      paths.push(
        { style: 'Progressive Rock', probability: 0.6, characteristics: ['Complex structures', 'Classical influences'] },
        { style: 'Alternative Rock', probability: 0.5, characteristics: ['DIY ethos', 'Experimental elements'] },
        { style: 'Electronic Rock', probability: 0.4, characteristics: ['Synthesizer integration', 'Studio production'] }
      );
    }

    return paths;
  }

  private identifyPotentialInnovations(currentStyle: StyleClassification): Array<{
    aspect: string;
    description: string;
    impact: number;
  }> {
    // Identify potential innovations for the style
    const innovations: Array<{
      aspect: string;
      description: string;
      impact: number;
    }> = [];

    // Based on current characteristics
    if (currentStyle.confidence < 0.7) {
      innovations.push({
        aspect: 'Style Definition',
        description: 'Opportunity to establish clear stylistic boundaries',
        impact: 0.8
      });
    }

    if (!currentStyle.analysis.discriminators.includes('Electronic elements')) {
      innovations.push({
        aspect: 'Technology Integration',
        description: 'Incorporate modern electronic production techniques',
        impact: 0.7
      });
    }

    return innovations;
  }

  private analyzeStyleInfluences(
    currentStyle: StyleClassification,
    historicalContext: { era?: string; location?: string; influences?: string[] }
  ): Array<{
    source: string;
    type: 'direct' | 'indirect' | 'historical';
    strength: number;
  }> {
    // Analyze style influences
    const influences: Array<{
      source: string;
      type: 'direct' | 'indirect' | 'historical';
      strength: number;
    }> = [];

    // Historical influences
    if (historicalContext.influences) {
      historicalContext.influences.forEach(influence => {
        influences.push({
          source: influence,
          type: 'historical',
          strength: 0.6
        });
      });
    }

    // Geographic influences
    if (historicalContext.location) {
      influences.push({
        source: `${historicalContext.location} Regional`,
        type: 'direct',
        strength: 0.7
      });
    }

    return influences;
  }

  private calculateStyleSimilarity(features1: StyleFeatures, features2: StyleFeatures): number {
    // Calculate similarity between two styles
    const weights = {
      tempo: 0.15,
      harmonicComplexity: 0.2,
      rhythmicComplexity: 0.2,
      melodicComplexity: 0.15,
      swingRatio: 0.1,
      syncopationLevel: 0.1,
      improvisationLevel: 0.1
    };

    let similarity = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([feature, weight]) => {
      const value1 = features1[feature as keyof StyleFeatures] as number;
      const value2 = features2[feature as keyof StyleFeatures] as number;
      const featureSimilarity = 1 - Math.abs(value1 - value2);

      similarity += featureSimilarity * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  private analyzeStyleDifferences(
    features1: StyleFeatures,
    features2: StyleFeatures
  ): Array<{
    aspect: string;
    style1Value: number;
    style2Value: number;
    significance: number;
  }> {
    // Analyze differences between two styles
    const aspects = [
      'tempo', 'harmonicComplexity', 'rhythmicComplexity', 'melodicComplexity',
      'swingRatio', 'syncopationLevel', 'improvisationLevel'
    ];

    return aspects.map(aspect => {
      const value1 = features1[aspect as keyof StyleFeatures] as number;
      const value2 = features2[aspect as keyof StyleFeatures] as number;
      const difference = Math.abs(value1 - value2);
      const significance = Math.min(1, difference * 2); // Scale to 0-1

      return {
        aspect,
        style1Value: value1,
        style2Value: value2,
        significance
      };
    }).sort((a, b) => b.significance - a.significance);
  }

  private identifyCommonElements(features1: StyleFeatures, features2: StyleFeatures): string[] {
    // Identify common elements between two styles
    const common: string[] = [];

    if (Math.abs(features1.tempo - features2.tempo) < 20) {
      common.push('Similar tempo range');
    }

    if (Math.abs(features1.harmonicComplexity - features2.harmonicComplexity) < 0.2) {
      common.push('Similar harmonic complexity');
    }

    if (Math.abs(features1.rhythmicComplexity - features2.rhythmicComplexity) < 0.2) {
      common.push('Similar rhythmic complexity');
    }

    // Check for common instruments
    const commonInstruments = features1.instrumentation.filter(inst =>
      features2.instrumentation.some(inst2 => inst.toLowerCase() === inst2.toLowerCase())
    );

    if (commonInstruments.length > 0) {
      common.push(`Common instruments: ${commonInstruments.join(', ')}`);
    }

    return common;
  }

  private identifyUniqueElements(
    features1: StyleFeatures,
    features2: StyleFeatures,
    depth: 'basic' | 'detailed'
  ): {
    style1: string[];
    style2: string[];
  } {
    // Identify unique elements for each style
    const unique1: string[] = [];
    const unique2: string[] = [];

    // Tempo differences
    if (Math.abs(features1.tempo - features2.tempo) > 20) {
      unique1.push(`Tempo: ${features1.tempo} BPM`);
      unique2.push(`Tempo: ${features2.tempo} BPM`);
    }

    // Complexity differences
    if (Math.abs(features1.harmonicComplexity - features2.harmonicComplexity) > 0.3) {
      unique1.push(`Harmonic complexity: ${features1.harmonicComplexity.toFixed(2)}`);
      unique2.push(`Harmonic complexity: ${features2.harmonicComplexity.toFixed(2)}`);
    }

    // Instrumentation differences
    const uniqueInstruments1 = features1.instrumentation.filter(inst =>
      !features2.instrumentation.some(inst2 => inst.toLowerCase() === inst2.toLowerCase())
    );

    const uniqueInstruments2 = features2.instrumentation.filter(inst =>
      !features1.instrumentation.some(inst1 => inst.toLowerCase() === inst1.toLowerCase())
    );

    if (uniqueInstruments1.length > 0) {
      unique1.push(`Unique instruments: ${uniqueInstruments1.join(', ')}`);
    }

    if (uniqueInstruments2.length > 0) {
      unique2.push(`Unique instruments: ${uniqueInstruments2.join(', ')}`);
    }

    return { style1: unique1, style2: unique2 };
  }

  private initializeStyleDatabase(): void {
    // Initialize with known style classifications
    this.styleDatabase = [];
  }

  private initializeFeatureWeights(): void {
    // Initialize weights for different style features
    this.featureWeights = {
      tempo: 0.15,
      harmony: 0.25,
      rhythm: 0.25,
      melody: 0.15,
      timbre: 0.1,
      dynamics: 0.1
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    if (this.genreClassifier) {
      this.genreClassifier.dispose();
    }
    if (this.subgenreClassifier) {
      this.subgenreClassifier.dispose();
    }
    if (this.eraClassifier) {
      this.eraClassifier.dispose();
    }
  }
}

export default StyleAnalyzer;