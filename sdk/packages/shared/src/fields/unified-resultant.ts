/**
 * Unified Resultant Implementation
 *
 * Unified resultants combine outputs from multiple generators into
 * coherent musical material with emergence and coherence properties.
 */

import {
  UnifiedResultant as IUnifiedResultant,
  MusicalMaterial,
  MusicalEvent,
  MusicalRole,
  CombinationStrategy,
  LayerContribution,
} from "../types/realization";

// Re-export types for backward compatibility
export type { CombinationStrategy, LayerContribution };

/**
 * Coherence analysis metrics
 */
export interface CoherenceMetrics {
  rhythmicCoherence: number; // How well rhythms align
  harmonicCoherence: number; // How well harmonies work together
  melodicCoherence: number; // Melodic consistency
  structuralCoherence: number; // Overall form
  emergentProperties: number; // Unexpected but good patterns
}

/**
 * Emergence detection results
 */
export interface EmergenceAnalysis {
  hasEmergence: boolean;
  emergenceScore: number; // 0.0 to 1.0
  emergentPatterns: Array<{
    type: string;
    description: string;
    confidence: number;
    location: number; // Time position
  }>;
  novelty: number; // How novel the pattern is
  musicality: number; // How musical it sounds
}

/**
 * Unified resultant implementation
 */
export class UnifiedResultant implements IUnifiedResultant {
  public readonly id: string;
  public readonly generatorIds: string[];
  public material: MusicalMaterial;
  public coherence: number;
  public emergence: number;
  public metadata: {
    dominantRole?: MusicalRole;
    intensity?: number;
    complexity?: number;
    generatorId?: string;
    role?: MusicalRole;
    originalLayers?: string[];
    originalEvents?: MusicalEvent[];
    hierarchicalRole?: MusicalRole;
    selectionProbability?: number;
    emergentFrom?: string[];
    strategy?: CombinationStrategy;
    layerContributions?: LayerContribution[];
  };

  private _strategy: CombinationStrategy;
  private _layers: Map<string, MusicalMaterial> = new Map();
  private _coherenceMetrics: CoherenceMetrics | null = null;
  private _emergenceAnalysis: EmergenceAnalysis | null = null;

  constructor(options: {
    id: string;
    generatorIds: string[];
    strategy?: CombinationStrategy;
    material?: MusicalMaterial;
  }) {
    this.id = options.id;
    this.generatorIds = options.generatorIds;
    this._strategy = options.strategy || "emergent";
    this.material = options.material || [];
    this.coherence = 0.5; // Default moderate coherence
    this.emergence = 0.3; // Default low emergence
    this.metadata = { strategy: this._strategy };
  }

  /**
   * Add layer material
   */
  addLayer(layerId: string, material: MusicalMaterial): void {
    this._layers.set(layerId, [...material]);
  }

  /**
   * Remove layer material
   */
  removeLayer(layerId: string): void {
    this._layers.delete(layerId);
  }

  /**
   * Generate unified resultant from layers
   */
  generate(): void {
    if (this._layers.size === 0) {
      this.material = [];
      this.coherence = 0;
      this.emergence = 0;
      return;
    }

    switch (this._strategy) {
      case "additive":
        this.generateAdditive();
        break;
      case "multiplicative":
        this.generateMultiplicative();
        break;
      case "convolution":
        this.generateConvolution();
        break;
      case "emergent":
        this.generateEmergent();
        break;
      case "hierarchical":
        this.generateHierarchical();
        break;
      case "probabilistic":
        this.generateProbabilistic();
        break;
    }

    // Analyze result
    this.analyzeCoherence();
    this.analyzeEmergence();
    this.analyzeLayerContributions();
  }

  /**
   * Get layer contribution analysis
   */
  getLayerContributions(): LayerContribution[] {
    return this.metadata.layerContributions || [];
  }

  /**
   * Get coherence metrics
   */
  getCoherenceMetrics(): CoherenceMetrics {
    return (
      this._coherenceMetrics || {
        rhythmicCoherence: 0,
        harmonicCoherence: 0,
        melodicCoherence: 0,
        structuralCoherence: 0,
        emergentProperties: 0,
      }
    );
  }

  /**
   * Get emergence analysis
   */
  getEmergenceAnalysis(): EmergenceAnalysis {
    return (
      this._emergenceAnalysis || {
        hasEmergence: false,
        emergenceScore: 0,
        emergentPatterns: [],
        novelty: 0,
        musicality: 0,
      }
    );
  }

  /**
   * Get hierarchical weight for this resultant or a specific layer
   */
  getHierarchicalWeight(
    layerId?: string,
    layerMaterial?: MusicalMaterial,
  ): number {
    // If called without arguments, return overall resultant weight
    if (!layerId || !layerMaterial) {
      const generatorCount = this.generatorIds.length;
      const coherenceWeight = this.coherence || 0.5;
      const emergenceWeight = this.emergence || 0;
      return Math.min(
        1.0,
        generatorCount * 0.2 + coherenceWeight * 0.4 + emergenceWeight * 0.4,
      );
    }

    // Calculate weight for specific layer based on its position in generator hierarchy
    const layerIndex = this.generatorIds.indexOf(layerId);
    if (layerIndex === -1) return 0.5; // Default weight if not found

    // Earlier generators (lower index) have higher weight
    const positionWeight = 1.0 - (layerIndex / this.generatorIds.length) * 0.5;
    const densityWeight = Math.min(1.0, layerMaterial.length / 10);

    return positionWeight * 0.7 + densityWeight * 0.3;
  }

  /**
   * Additive combination strategy
   */
  private generateAdditive(): void {
    const combined: MusicalMaterial = [];
    const layers = Array.from(this._layers.entries());

    // Sort layers by time alignment
    for (const [layerId, layerMaterial] of layers) {
      for (const event of layerMaterial) {
        // Check for conflicts with existing events
        const conflict = combined.find(
          (e) =>
            Math.abs(e.time - event.time) < 0.05 && // 50ms tolerance
            e.pitch === event.pitch,
        );

        if (!conflict) {
          combined.push({
            ...event,
            metadata: {
              ...event.metadata,
              generatorId: layerId,
            },
          });
        }
      }
    }

    this.material = combined.sort((a, b) => a.time - b.time);
  }

  /**
   * Multiplicative combination strategy
   */
  private generateMultiplicative(): void {
    const combined: MusicalMaterial = [];
    const layers = Array.from(this._layers.values());

    if (layers.length < 2) {
      this.material = layers[0] || [];
      return;
    }

    // Use first layer as base
    const baseLayer = layers[0];
    const otherLayers = layers.slice(1);

    for (const baseEvent of baseLayer) {
      // Find events in other layers at similar times
      const relatedEvents = otherLayers
        .map((layer) =>
          layer.find((e) => Math.abs(e.time - baseEvent.time) < 0.1),
        )
        .filter(Boolean) as MusicalEvent[];

      if (relatedEvents.length > 0) {
        // Create combined event
        const avgPitch = [baseEvent, ...relatedEvents]
          .filter((e) => e.pitch !== undefined)
          .reduce((sum, e, _, arr) => sum + (e.pitch || 0) / arr.length, 0);

        const avgAmplitude = [baseEvent, ...relatedEvents].reduce(
          (sum, e, _, arr) => sum + e.amplitude / arr.length,
          0,
        );

        const combinedDuration = Math.max(
          baseEvent.duration,
          ...relatedEvents.map((e) => e.duration),
        );

        combined.push({
          id: this.generateEventId(),
          time: baseEvent.time,
          duration: combinedDuration,
          pitch: Math.round(avgPitch),
          amplitude: avgAmplitude,
          articulation: {
            attack: Math.max(
              baseEvent.articulation?.attack || 0.5,
              ...relatedEvents.map((e) => e.articulation?.attack || 0.5),
            ),
            release: Math.max(
              baseEvent.articulation?.release || 0.5,
              ...relatedEvents.map((e) => e.articulation?.release || 0.5),
            ),
            sustain:
              (baseEvent.articulation?.sustain ||
                0.5 +
                  relatedEvents.reduce(
                    (sum, e) => sum + (e.articulation?.sustain || 0.5),
                    0,
                  )) /
              (relatedEvents.length + 1),
          },
          metadata: {
            generatorId: "multiplicative",
            originalLayers: [
              baseEvent.metadata?.generatorId,
              ...relatedEvents.map((e) => e.metadata?.generatorId),
            ].filter((id): id is string => Boolean(id)) as string[],
          },
        });
      } else {
        // Keep base event if no multiplication found
        combined.push(baseEvent);
      }
    }

    this.material = combined;
  }

  /**
   * Convolution combination strategy
   */
  private generateConvolution(): void {
    const layers = Array.from(this._layers.values());
    if (layers.length < 2) {
      this.material = layers[0] || [];
      return;
    }

    const pattern1 = layers[0];
    const pattern2 = layers[1];

    // Create convolution of two rhythmic patterns
    const convolved: MusicalMaterial = [];

    for (let i = 0; i < pattern1.length; i++) {
      for (let j = 0; j < pattern2.length; j++) {
        const event1 = pattern1[i];
        const event2 = pattern2[j];

        // Create convolution event
        const convolvedTime = event1.time + event2.time;
        const convolvedDuration = Math.min(event1.duration, event2.duration);

        // Use pitch from first pattern, modulated by second
        const pitchModulation = event2.pitch ? (event2.pitch - 60) / 12 : 0; // Semitone deviation
        const convolvedPitch = event1.pitch
          ? Math.round(event1.pitch + pitchModulation * 2)
          : undefined;

        // Multiply amplitudes
        const convolvedAmplitude = event1.amplitude * event2.amplitude;

        convolved.push({
          id: this.generateEventId(),
          time: convolvedTime,
          duration: convolvedDuration,
          pitch: convolvedPitch,
          amplitude: convolvedAmplitude,
          articulation: event1.articulation,
          metadata: {
            generatorId: "convolution",
            originalEvents: [event1, event2],
          },
        });
      }
    }

    this.material = convolved.sort((a, b) => a.time - b.time);
  }

  /**
   * Emergent combination strategy
   */
  private generateEmergent(): void {
    const layers = Array.from(this._layers.values());
    const combined: MusicalMaterial = [];

    // Analyze layer characteristics
    const layerAnalyses = layers.map((layer) => this.analyzeLayer(layer));

    // Find emergent patterns through layer interaction
    for (let i = 0; i < layers.length; i++) {
      const layer1 = layers[i];
      const analysis1 = layerAnalyses[i];

      // Add layer events with emergent modifications
      for (const event of layer1) {
        const modifiedEvent = this.applyEmergentModifications(event, layer1, i);
        combined.push(modifiedEvent);
      }

      // Check for cross-layer emergence
      for (let j = i + 1; j < layers.length; j++) {
        const layer2 = layers[j];
        const crossEmergents = this.findCrossLayerEmergence(
          layer1,
          layer2,
          analysis1,
          layerAnalyses[j],
        );
        combined.push(...crossEmergents);
      }
    }

    this.material = this.filterAndOptimize(combined);
  }

  /**
   * Hierarchical combination strategy
   */
  private generateHierarchical(): void {
    // Order layers by role importance
    const roleHierarchy: Record<MusicalRole, number> = {
      melody: 5,
      lead: 5,
      bass: 4,
      harmony: 3,
      "counter-melody": 2,
      rhythm: 2,
      texture: 1,
      ornament: 1,
      accompaniment: 1,
    };

    const layers = Array.from(this._layers.entries()).sort(([, a], [, b]) => {
      const roleA = this.inferLayerRole(a);
      const roleB = this.inferLayerRole(b);
      return (roleHierarchy[roleB] || 0) - (roleHierarchy[roleA] || 0);
    });

    const combined: MusicalMaterial = [];

    // Start with highest priority layer
    for (const [layerId, layerMaterial] of layers) {
      for (const event of layerMaterial) {
        // Check for conflicts with higher priority layers
        const conflict = combined.find(
          (e) =>
            Math.abs(e.time - event.time) < 0.05 &&
            this.calculatePitchConflict(e, event) > 0.7,
        );

        if (!conflict) {
          combined.push({
            ...event,
            amplitude:
              event.amplitude *
              this.getHierarchicalWeight(layerId, layerMaterial),
            metadata: {
              ...event.metadata,
              generatorId: layerId,
              hierarchicalRole: this.inferLayerRole(layerMaterial),
            },
          });
        }
      }
    }

    this.material = combined.sort((a, b) => a.time - b.time);
  }

  /**
   * Probabilistic combination strategy
   */
  private generateProbabilistic(): void {
    const layers = Array.from(this._layers.entries());
    const combined: MusicalMaterial = [];

    // Calculate probabilities for each layer
    const layerProbabilities = layers.map(([id, material]) => ({
      id,
      probability: this.calculateLayerProbability(material),
      material,
    }));

    // Normalize probabilities
    const totalProb = layerProbabilities.reduce(
      (sum, lp) => sum + lp.probability,
      0,
    );
    layerProbabilities.forEach((lp) => (lp.probability /= totalProb));

    // Stochastically select events
    for (const [layerId, layerMaterial] of layers) {
      const layerProb =
        layerProbabilities.find((lp) => lp.id === layerId)?.probability || 0;

      for (const event of layerMaterial) {
        if (Math.random() < layerProb) {
          combined.push({
            ...event,
            amplitude: event.amplitude * (1 + (Math.random() - 0.5) * 0.2), // Add small random variation
            metadata: {
              ...event.metadata,
              generatorId: layerId,
              selectionProbability: layerProb,
            },
          });
        }
      }
    }

    this.material = combined.sort((a, b) => a.time - b.time);
  }

  /**
   * Analyze coherence of the generated material
   */
  private analyzeCoherence(): void {
    if (this.material.length === 0) {
      this.coherence = 0;
      this._coherenceMetrics = {
        rhythmicCoherence: 0,
        harmonicCoherence: 0,
        melodicCoherence: 0,
        structuralCoherence: 0,
        emergentProperties: 0,
      };
      return;
    }

    const rhythmicCoherence = this.analyzeRhythmicCoherence();
    const harmonicCoherence = this.analyzeHarmonicCoherence();
    const melodicCoherence = this.analyzeMelodicCoherence();
    const structuralCoherence = this.analyzeStructuralCoherence();
    const emergentProperties = this.emergence;

    this._coherenceMetrics = {
      rhythmicCoherence,
      harmonicCoherence,
      melodicCoherence,
      structuralCoherence,
      emergentProperties,
    };

    this.coherence =
      (rhythmicCoherence +
        harmonicCoherence +
        melodicCoherence +
        structuralCoherence) /
      4;
  }

  /**
   * Analyze emergence in the material
   */
  private analyzeEmergence(): void {
    const emergentPatterns = this.findEmergentPatterns();
    const emergenceScore =
      emergentPatterns.reduce((sum, p) => sum + p.confidence, 0) /
      Math.max(emergentPatterns.length, 1);

    this._emergenceAnalysis = {
      hasEmergence: emergentPatterns.length > 0,
      emergenceScore,
      emergentPatterns,
      novelty: this.calculateNovelty(),
      musicality: this.calculateMusicality(),
    };

    this.emergence = emergenceScore;
  }

  /**
   * Analyze layer contributions
   */
  private analyzeLayerContributions(): void {
    const contributions: LayerContribution[] = [];

    for (const [layerId, layerMaterial] of this._layers.entries()) {
      const contribution = this.analyzeSingleLayerContribution(
        layerId,
        layerMaterial,
      );
      contributions.push(contribution);
    }

    this.metadata.layerContributions = contributions;

    // Find dominant role
    if (contributions.length > 0) {
      const dominant = contributions.reduce((max, current) =>
        (current.weight || 0) > (max.weight || 0) ? current : max,
      );
      this.metadata.dominantRole = dominant.role;
    }
  }

  // Helper methods (simplified implementations)

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private analyzeLayer(layer: MusicalMaterial): any {
    // Simplified layer analysis
    return {
      density:
        layer.length / Math.max(...layer.map((e) => e.time + e.duration), 1),
      complexity: this.calculateComplexity(layer),
      averagePitch:
        layer.reduce((sum, e) => sum + (e.pitch || 0), 0) / layer.length,
    };
  }

  private applyEmergentModifications(
    event: MusicalEvent,
    layer: MusicalMaterial,
    layerIndex: number,
  ): MusicalEvent {
    // Apply context-aware modifications
    const context = this.getEventContext(event, layer);
    const modifications = this.calculateEmergentModifications(
      context,
      layerIndex,
    );

    return {
      ...event,
      amplitude: Math.max(
        0,
        Math.min(1, event.amplitude * modifications.amplitude),
      ),
      articulation: {
        attack: Math.max(
          0,
          Math.min(
            1,
            (event.articulation?.attack || 0.5) + modifications.attack,
          ),
        ),
        release: Math.max(
          0,
          Math.min(
            1,
            (event.articulation?.release || 0.5) + modifications.release,
          ),
        ),
        sustain: Math.max(
          0,
          Math.min(
            1,
            (event.articulation?.sustain || 0.5) + modifications.sustain,
          ),
        ),
      },
    };
  }

  private findCrossLayerEmergence(
    layer1: MusicalMaterial,
    layer2: MusicalMaterial,
    _analysis1: any,
    _analysis2: any,
  ): MusicalMaterial {
    // Find patterns that emerge from layer interaction
    const emergent: MusicalMaterial = [];

    // Simple pattern matching between layers
    for (let i = 0; i < layer1.length - 1; i++) {
      for (let j = 0; j < layer2.length - 1; j++) {
        const pattern1 = [layer1[i], layer1[i + 1]];
        const pattern2 = [layer2[j], layer2[j + 1]];

        if (this.patternsAreRelated(pattern1, pattern2)) {
          emergent.push(this.createEmergentEvent(pattern1, pattern2));
        }
      }
    }

    return emergent;
  }

  private filterAndOptimize(material: MusicalMaterial): MusicalMaterial {
    // Remove duplicates and optimize performance
    const filtered: MusicalMaterial = [];
    const seen = new Set<string>();

    for (const event of material) {
      const key = `${event.time.toFixed(3)}-${event.pitch || "rest"}`;
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(event);
      }
    }

    return filtered.sort((a, b) => a.time - b.time);
  }

  private inferLayerRole(layer: MusicalMaterial): MusicalRole {
    // Simple role inference based on layer characteristics
    const pitches = layer
      .filter((e) => e.pitch !== undefined)
      .map((e) => e.pitch!);
    const avgPitch =
      pitches.length > 0
        ? pitches.reduce((sum, p) => sum + p, 0) / pitches.length
        : 60;

    if (avgPitch < 50) return "bass";
    if (avgPitch > 80) return "melody";
    return "harmony";
  }

  private calculateHierarchicalWeight(
    _layerId: string,
    _layer: MusicalMaterial,
  ): number {
    // Calculate weight based on layer characteristics
    return 0.8 + Math.random() * 0.2; // Simplified
  }

  private calculateLayerProbability(layer: MusicalMaterial): number {
    // Calculate selection probability based on layer quality
    return 0.5 + this.calculateComplexity(layer) * 0.5;
  }

  private calculatePitchConflict(
    event1: MusicalEvent,
    event2: MusicalEvent,
  ): number {
    if (event1.pitch === undefined || event2.pitch === undefined) return 0;
    const interval = Math.abs(event1.pitch - event2.pitch);
    // High conflict for dissonant intervals
    return interval <= 2 ? 1 : interval <= 7 ? 0.5 : 0.2;
  }

  private analyzeRhythmicCoherence(): number {
    // Simplified rhythmic coherence analysis
    const intervals = this.material
      .slice(1)
      .map((e, i) => e.time - this.material[i].time);
    const variance =
      intervals.reduce((sum, interval, _, arr) => {
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return sum + Math.pow(interval - mean, 2);
      }, 0) / intervals.length;
    return Math.max(0, 1 - variance / 4); // Normalize
  }

  private analyzeHarmonicCoherence(): number {
    // Simplified harmonic coherence analysis
    const pitches = this.material
      .filter((e) => e.pitch !== undefined)
      .map((e) => e.pitch!);
    if (pitches.length < 2) return 1;

    let consonantIntervals = 0;
    for (let i = 0; i < pitches.length - 1; i++) {
      const interval = Math.abs(pitches[i + 1] - pitches[i]) % 12;
      if ([0, 3, 4, 5, 7, 8, 9].includes(interval)) {
        consonantIntervals++;
      }
    }

    return consonantIntervals / (pitches.length - 1);
  }

  private analyzeMelodicCoherence(): number {
    // Simplified melodic coherence analysis
    const pitches = this.material
      .filter((e) => e.pitch !== undefined)
      .map((e) => e.pitch!);
    if (pitches.length < 2) return 1;

    const intervals = pitches.slice(1).map((p, i) => p - pitches[i]);
    const avgInterval =
      intervals.reduce((sum, interval) => sum + Math.abs(interval), 0) /
      intervals.length;

    // Prefer stepwise motion
    return Math.max(0, 1 - avgInterval / 12);
  }

  private analyzeStructuralCoherence(): number {
    // Simplified structural coherence analysis
    const duration = Math.max(...this.material.map((e) => e.time + e.duration));
    const density = this.material.length / duration;
    return Math.min(1, density / 5); // Normalize to reasonable density
  }

  private findEmergentPatterns(): Array<{
    type: string;
    description: string;
    confidence: number;
    location: number;
  }> {
    // Simplified emergent pattern detection
    const patterns = [];

    // Look for repeating patterns
    for (let length = 2; length <= 4; length++) {
      for (let i = 0; i <= this.material.length - length * 2; i++) {
        const pattern = this.material.slice(i, i + length);
        const nextPattern = this.material.slice(i + length, i + length * 2);

        if (this.patternsMatch(pattern, nextPattern)) {
          patterns.push({
            type: "repetition",
            description: `Repeating pattern of length ${length}`,
            confidence: 0.8,
            location: this.material[i].time,
          });
        }
      }
    }

    return patterns;
  }

  private calculateNovelty(): number {
    // Simplified novelty calculation
    return 0.3 + Math.random() * 0.4;
  }

  private calculateMusicality(): number {
    // Simplified musicality calculation
    return 0.6 + Math.random() * 0.3;
  }

  private analyzeSingleLayerContribution(
    layerId: string,
    layer: MusicalMaterial,
  ): LayerContribution {
    return {
      layerId,
      contribution: Math.random() * 0.5 + 0.25,
      weight: Math.random() * 0.5 + 0.25,
      dominance: Math.random() * 0.5 + 0.25,
      compatibility: Math.random() * 0.5 + 0.5,
      role: this.inferLayerRole(layer),
      characteristics: {
        density: layer.length / 10,
        complexity: this.calculateComplexity(layer),
        energy: layer.reduce((sum, e) => sum + e.amplitude, 0) / layer.length,
        register: { min: 40, max: 80, center: 60, width: 40 },
      },
    };
  }

  private calculateComplexity(_layer: MusicalMaterial): number {
    // Simplified complexity calculation
    return 0.3 + Math.random() * 0.5;
  }

  private getEventContext(event: MusicalEvent, layer: MusicalMaterial): any {
    return { event, layer };
  }

  private calculateEmergentModifications(
    _context: any,
    _layerIndex: number,
  ): any {
    return {
      amplitude: 1 + (Math.random() - 0.5) * 0.2,
      attack: (Math.random() - 0.5) * 0.1,
      release: (Math.random() - 0.5) * 0.1,
      sustain: (Math.random() - 0.5) * 0.1,
    };
  }

  private patternsAreRelated(
    pattern1: MusicalEvent[],
    pattern2: MusicalEvent[],
  ): boolean {
    // Simplified pattern relationship check
    if (pattern1.length !== pattern2.length) return false;

    const intervalPattern1 = pattern1
      .slice(1)
      .map((e, i) => e.time - pattern1[i].time);
    const intervalPattern2 = pattern2
      .slice(1)
      .map((e, i) => e.time - pattern2[i].time);

    return (
      JSON.stringify(intervalPattern1) === JSON.stringify(intervalPattern2)
    );
  }

  private createEmergentEvent(
    pattern1: MusicalEvent[],
    pattern2: MusicalEvent[],
  ): MusicalEvent {
    return {
      id: this.generateEventId(),
      time: (pattern1[0].time + pattern2[0].time) / 2,
      duration: Math.min(pattern1[0].duration, pattern2[0].duration),
      pitch: pattern1[0].pitch,
      amplitude: (pattern1[0].amplitude + pattern2[0].amplitude) / 2,
      metadata: {
        generatorId: "emergent",
        emergentFrom: [pattern1[0].id, pattern2[0].id],
      },
    };
  }

  private patternsMatch(
    pattern1: MusicalEvent[],
    pattern2: MusicalEvent[],
  ): boolean {
    if (pattern1.length !== pattern2.length) return false;

    return pattern1.every((event1, i) => {
      const event2 = pattern2[i];
      return (
        Math.abs(event1.time - event2.time) < 0.1 &&
        Math.abs(event1.duration - event2.duration) < 0.1 &&
        (event1.pitch === event2.pitch ||
          event1.pitch === undefined ||
          event2.pitch === undefined)
      );
    });
  }
}
