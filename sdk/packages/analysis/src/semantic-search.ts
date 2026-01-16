/**
 * Semantic search utilities for musical concepts and patterns
 */

import type { RhythmPattern, ChordProgression, MelodyLine } from "./types";

export interface SemanticSearchResult {
  concept: string;
  relevance: number;
  context: string;
  type: "rhythmic" | "harmonic" | "melodic" | "theoretical";
  metadata?: Record<string, any>;
}

export interface MusicalConcept {
  id: string;
  name: string;
  type: "rhythmic" | "harmonic" | "melodic" | "theoretical";
  description: string;
  keywords: string[];
  examples?: any[];
  relatedConcepts?: string[];
  complexity: number;
  style?: string;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  type?: "rhythmic" | "harmonic" | "melodic" | "theoretical";
  maxResults?: number;
  minRelevance?: number;
  includeExamples?: boolean;
  complexityRange?: [number, number];
  style?: string;
}

/**
 * Advanced semantic search engine for musical concepts and patterns
 */
export class SemanticSearchEngine {
  private concepts: MusicalConcept[] = [];
  private vectorIndex: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultConcepts();
    this.buildVectorIndex();
  }

  /**
   * Search for musical concepts using semantic matching
   */
  search(query: string, options: SearchOptions = {}): SemanticSearchResult[] {
    const {
      type,
      maxResults = 10,
      minRelevance = 0.3,
      includeExamples = false,
      complexityRange,
      style,
    } = options;

    const queryVector = this.textToVector(query.toLowerCase());
    const results: SemanticSearchResult[] = [];

    for (const concept of this.concepts) {
      // Filter by type if specified
      if (type && concept.type !== type) continue;

      // Filter by complexity range if specified
      if (
        complexityRange &&
        (concept.complexity < complexityRange[0] ||
          concept.complexity > complexityRange[1])
      ) {
        continue;
      }

      // Filter by style if specified
      if (style && concept.style && concept.style !== style) continue;

      // Calculate relevance
      const relevance = this.calculateRelevance(query, concept, queryVector);

      if (relevance >= minRelevance) {
        const result: SemanticSearchResult = {
          concept: concept.name,
          relevance,
          context: concept.description,
          type: concept.type,
          metadata: {
            id: concept.id,
            complexity: concept.complexity,
            style: concept.style,
            keywords: concept.keywords,
            relatedConcepts: concept.relatedConcepts,
          },
        };

        if (includeExamples && concept.examples) {
          result.metadata!.examples = concept.examples;
        }

        results.push(result);
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /**
   * Find similar patterns using vector similarity
   */
  findSimilar(
    pattern: RhythmPattern | ChordProgression | MelodyLine | any,
    options: SearchOptions = {},
  ): SemanticSearchResult[] {
    const {
      maxResults = 5,
      minRelevance = 0.5,
      includeExamples = false,
    } = options;

    // Convert pattern to searchable features
    const patternFeatures = this.extractPatternFeatures(pattern);
    const patternVector = this.featuresToVector(patternFeatures);

    const results: SemanticSearchResult[] = [];

    for (const concept of this.concepts) {
      if (!concept.examples || concept.examples.length === 0) continue;

      // Check each example in the concept
      for (const example of concept.examples) {
        const exampleFeatures = this.extractPatternFeatures(example);
        const exampleVector = this.featuresToVector(exampleFeatures);

        const similarity = this.calculateVectorSimilarity(
          patternVector,
          exampleVector,
        );

        if (similarity >= minRelevance) {
          results.push({
            concept: concept.name,
            relevance: similarity,
            context: `Similar to example: ${JSON.stringify(example).substring(0, 100)}...`,
            type: concept.type,
            metadata: {
              id: concept.id,
              complexity: concept.complexity,
              style: concept.style,
              similarExample: includeExamples ? example : undefined,
            },
          });
        }
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /**
   * Find concepts related to a given concept
   */
  findRelated(
    conceptId: string,
    maxResults: number = 5,
  ): SemanticSearchResult[] {
    const concept = this.concepts.find((c) => c.id === conceptId);
    if (!concept || !concept.relatedConcepts) {
      return [];
    }

    const results: SemanticSearchResult[] = [];

    for (const relatedId of concept.relatedConcepts) {
      const relatedConcept = this.concepts.find((c) => c.id === relatedId);
      if (relatedConcept) {
        results.push({
          concept: relatedConcept.name,
          relevance: 0.8, // High relevance for explicitly related concepts
          context: relatedConcept.description,
          type: relatedConcept.type,
          metadata: {
            id: relatedConcept.id,
            complexity: relatedConcept.complexity,
            style: relatedConcept.style,
            relationship: "explicit",
          },
        });
      }
    }

    // Fill remaining slots with semantically similar concepts
    if (results.length < maxResults) {
      const conceptVector = this.vectorIndex.get(concept.id);
      if (conceptVector) {
        for (const otherConcept of this.concepts) {
          if (
            otherConcept.id === conceptId ||
            results.some((r) => r.metadata?.id === otherConcept.id)
          ) {
            continue;
          }

          const otherVector = this.vectorIndex.get(otherConcept.id);
          if (otherVector) {
            const similarity = this.calculateVectorSimilarity(
              conceptVector,
              otherVector,
            );
            if (similarity > 0.6) {
              results.push({
                concept: otherConcept.name,
                relevance: similarity,
                context: otherConcept.description,
                type: otherConcept.type,
                metadata: {
                  id: otherConcept.id,
                  complexity: otherConcept.complexity,
                  style: otherConcept.style,
                  relationship: "semantic",
                },
              });
            }
          }
        }
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /**
   * Add a new concept to the search index
   */
  addConcept(concept: MusicalConcept): void {
    this.concepts.push(concept);
    this.updateVectorIndex(concept);
  }

  /**
   * Get concept by ID
   */
  getConcept(id: string): MusicalConcept | undefined {
    return this.concepts.find((c) => c.id === id);
  }

  /**
   * Get all concepts of a specific type
   */
  getConceptsByType(
    type: "rhythmic" | "harmonic" | "melodic" | "theoretical",
  ): MusicalConcept[] {
    return this.concepts.filter((c) => c.type === type);
  }

  /**
   * Get search statistics
   */
  getStats(): {
    totalConcepts: number;
    byType: Record<string, number>;
    averageComplexity: number;
  } {
    const byType: Record<string, number> = {};
    let totalComplexity = 0;

    for (const concept of this.concepts) {
      byType[concept.type] = (byType[concept.type] || 0) + 1;
      totalComplexity += concept.complexity;
    }

    return {
      totalConcepts: this.concepts.length,
      byType,
      averageComplexity:
        this.concepts.length > 0 ? totalComplexity / this.concepts.length : 0,
    };
  }

  // Private helper methods

  private calculateRelevance(
    query: string,
    concept: MusicalConcept,
    queryVector: number[],
  ): number {
    let relevance = 0;

    // Exact name match
    if (concept.name.toLowerCase().includes(query.toLowerCase())) {
      relevance += 0.8;
    }

    // Keyword matches
    const queryWords = query.toLowerCase().split(/\s+/);
    for (const word of queryWords) {
      for (const keyword of concept.keywords) {
        if (keyword.toLowerCase().includes(word)) {
          relevance += 0.3;
        }
      }
    }

    // Description match
    if (concept.description.toLowerCase().includes(query.toLowerCase())) {
      relevance += 0.4;
    }

    // Vector similarity
    const conceptVector = this.vectorIndex.get(concept.id);
    if (conceptVector) {
      const vectorSimilarity = this.calculateVectorSimilarity(
        queryVector,
        conceptVector,
      );
      relevance += vectorSimilarity * 0.5;
    }

    return Math.min(relevance, 1.0);
  }

  private textToVector(text: string): number[] {
    // Simple bag-of-words vectorization
    // In a real implementation, this would use more sophisticated NLP techniques
    const words = text.split(/\s+/);
    const vocabulary = this.getVocabulary();
    const vector = new Array(vocabulary.length).fill(0);

    for (const word of words) {
      const index = vocabulary.indexOf(word);
      if (index !== -1) {
        vector[index]++;
      }
    }

    // Normalize vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  private featuresToVector(features: Record<string, number>): number[] {
    // Convert pattern features to vector representation
    const featureKeys = [
      "complexity",
      "density",
      "variety",
      "syncopation",
      "range",
      "transitions",
    ];
    return featureKeys.map((key) => features[key] || 0);
  }

  private extractPatternFeatures(pattern: any): Record<string, number> {
    const features: Record<string, number> = {};

    if (pattern.durations || pattern.sequence) {
      // Rhythmic pattern
      const sequence = pattern.durations || pattern.sequence;
      features.complexity = this.calculateSequenceComplexity(sequence);
      features.density =
        sequence.filter((x: number) => x > 0).length / sequence.length;
      features.variety = new Set(sequence).size / sequence.length;
      features.syncopation = this.calculateSyncopation(sequence);
    } else if (pattern.chords) {
      // Harmonic pattern
      features.complexity = this.calculateHarmonicComplexity(pattern.chords);
      features.variety = new Set(pattern.chords).size / pattern.chords.length;
      features.density = 1.0; // Chords are always "dense"
    } else if (pattern.notes || pattern.intervals) {
      // Melodic pattern
      const notes = pattern.notes || pattern.intervals;
      features.complexity = this.calculateSequenceComplexity(notes);
      features.range =
        notes.length > 0 ? (Math.max(...notes) - Math.min(...notes)) / 24 : 0; // Normalize to 2 octaves
      features.variety = new Set(notes).size / notes.length;
      features.transitions = this.calculateTransitions(notes);
    }

    return features;
  }

  private calculateSequenceComplexity(sequence: number[]): number {
    if (sequence.length === 0) return 0;

    const uniqueValues = new Set(sequence).size;
    let transitions = 0;

    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] !== sequence[i - 1]) transitions++;
    }

    return (
      (uniqueValues / sequence.length + transitions / (sequence.length - 1)) / 2
    );
  }

  private calculateHarmonicComplexity(chords: string[]): number {
    return (
      chords.reduce((sum, chord) => {
        let complexity = 0.3;
        if (chord.includes("7")) complexity += 0.2;
        if (chord.includes("9")) complexity += 0.2;
        if (chord.includes("#") || chord.includes("b")) complexity += 0.1;
        return sum + Math.min(complexity, 1.0);
      }, 0) / chords.length
    );
  }

  private calculateSyncopation(sequence: number[]): number {
    // Simplified syncopation calculation
    let syncopated = 0;
    const strongBeats = [0, Math.floor(sequence.length / 2)];

    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] > 0 && !strongBeats.includes(i)) {
        syncopated++;
      }
    }

    return sequence.length > 0 ? syncopated / sequence.length : 0;
  }

  private calculateTransitions(sequence: number[]): number {
    if (sequence.length < 2) return 0;

    let transitions = 0;
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] !== sequence[i - 1]) transitions++;
    }

    return transitions / (sequence.length - 1);
  }

  private calculateVectorSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    return magnitude1 > 0 && magnitude2 > 0
      ? dotProduct / (magnitude1 * magnitude2)
      : 0;
  }

  private getVocabulary(): string[] {
    // Build vocabulary from all concept keywords and descriptions
    const words = new Set<string>();

    for (const concept of this.concepts) {
      // Add keywords
      for (const keyword of concept.keywords) {
        words.add(keyword.toLowerCase());
      }

      // Add words from description
      const descWords = concept.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (word.length > 2) {
          // Filter out very short words
          words.add(word);
        }
      }
    }

    return Array.from(words).sort();
  }

  private buildVectorIndex(): void {
    for (const concept of this.concepts) {
      this.updateVectorIndex(concept);
    }
  }

  private updateVectorIndex(concept: MusicalConcept): void {
    const text = `${concept.name} ${concept.description} ${concept.keywords.join(" ")}`;
    const vector = this.textToVector(text.toLowerCase());
    this.vectorIndex.set(concept.id, vector);
  }

  private initializeDefaultConcepts(): void {
    // Rhythmic concepts
    this.concepts.push({
      id: "rhythmic-resultant",
      name: "Rhythmic Resultant",
      type: "rhythmic",
      description:
        "A rhythmic pattern generated by combining two or more periodic generators according to Schillinger principles",
      keywords: [
        "rhythm",
        "generator",
        "resultant",
        "periodic",
        "mathematical",
      ],
      complexity: 0.6,
      style: "schillinger",
      relatedConcepts: ["polyrhythm", "cross-rhythm"],
      examples: [
        { generators: [3, 2], sequence: [2, 1, 0, 1, 2, 0] },
        { generators: [4, 3], sequence: [2, 0, 0, 1, 2, 0, 1, 0, 0, 1, 2, 0] },
      ],
    });

    this.concepts.push({
      id: "syncopation",
      name: "Syncopation",
      type: "rhythmic",
      description:
        "Rhythmic emphasis on weak beats or off-beats, creating rhythmic tension and interest",
      keywords: ["syncopation", "off-beat", "accent", "tension", "jazz"],
      complexity: 0.7,
      style: "jazz",
      relatedConcepts: ["rhythmic-resultant", "cross-rhythm"],
      examples: [
        { sequence: [0, 1, 0, 2, 0, 1, 0, 2] },
        { sequence: [1, 0, 2, 0, 1, 2, 0, 0] },
      ],
    });

    // Harmonic concepts
    this.concepts.push({
      id: "ii-V-I",
      name: "ii-V-I Progression",
      type: "harmonic",
      description:
        "A fundamental harmonic progression in jazz and classical music, creating strong tonal resolution",
      keywords: ["progression", "cadence", "jazz", "resolution", "functional"],
      complexity: 0.4,
      style: "jazz",
      relatedConcepts: ["circle-of-fifths", "dominant-resolution"],
      examples: [
        { chords: ["Dm7", "G7", "Cmaj7"], key: "C" },
        { chords: ["Am7", "D7", "Gmaj7"], key: "G" },
      ],
    });

    this.concepts.push({
      id: "circle-of-fifths",
      name: "Circle of Fifths",
      type: "harmonic",
      description:
        "Harmonic progression moving by perfect fifths, creating strong harmonic momentum",
      keywords: ["fifths", "progression", "momentum", "classical", "sequence"],
      complexity: 0.5,
      style: "classical",
      relatedConcepts: ["ii-V-I", "dominant-resolution"],
      examples: [
        { chords: ["C", "F", "Bb", "Eb"], key: "C" },
        { chords: ["Am", "Dm", "Gm", "Cm"], key: "Am" },
      ],
    });

    // Melodic concepts
    this.concepts.push({
      id: "scalar-motion",
      name: "Scalar Motion",
      type: "melodic",
      description: "Melodic movement by step, following scale patterns",
      keywords: ["scale", "stepwise", "motion", "linear", "smooth"],
      complexity: 0.2,
      style: "classical",
      relatedConcepts: ["arpeggiation", "sequence"],
      examples: [
        { intervals: [2, 2, 1, 2, 2, 2, 1] }, // Major scale
        { intervals: [2, 1, 2, 2, 1, 2, 2] }, // Natural minor scale
      ],
    });

    this.concepts.push({
      id: "arpeggiation",
      name: "Arpeggiation",
      type: "melodic",
      description: "Melodic movement outlining chord tones in succession",
      keywords: ["arpeggio", "chord", "outline", "broken", "harmony"],
      complexity: 0.3,
      style: "classical",
      relatedConcepts: ["scalar-motion", "chord-tones"],
      examples: [
        { intervals: [4, 3, 5] }, // Major triad
        { intervals: [3, 4, 5] }, // Minor triad
      ],
    });

    // Theoretical concepts
    this.concepts.push({
      id: "schillinger-system",
      name: "Schillinger System",
      type: "theoretical",
      description:
        "Mathematical approach to music composition developed by Joseph Schillinger",
      keywords: [
        "mathematical",
        "systematic",
        "composition",
        "theory",
        "generators",
      ],
      complexity: 0.8,
      style: "schillinger",
      relatedConcepts: ["rhythmic-resultant", "mathematical-composition"],
    });

    this.concepts.push({
      id: "functional-harmony",
      name: "Functional Harmony",
      type: "theoretical",
      description:
        "System of harmonic analysis based on chord function within a key",
      keywords: ["function", "tonic", "dominant", "subdominant", "analysis"],
      complexity: 0.6,
      style: "classical",
      relatedConcepts: ["ii-V-I", "circle-of-fifths"],
    });
  }
}
