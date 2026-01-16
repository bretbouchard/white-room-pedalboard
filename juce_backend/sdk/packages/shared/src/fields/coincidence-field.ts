/**
 * Coincidence Field Implementation
 *
 * Coincidence fields detect and predict moments where multiple musical
 * elements converge, creating climaxes, cadences, and emergent structures.
 */

import {
  CoincidenceField as ICoincidenceField,
  ConvergencePoint,
  MusicalRole,
} from '../types/realization';

/**
 * Convergence detection algorithms
 */
export type ConvergenceAlgorithm =
  | 'peak-alignment'
  | 'energy-threshold'
  | 'phase-correlation'
  | 'pattern-synchronization';

/**
 * Convergence type classification
 */
export type ConvergenceType =
  | 'climax'
  | 'cadence'
  | 'transition'
  | 'emergence'
  | 'tension'
  | 'release';

/**
 * Layer synchronization data
 */
export interface LayerSynchronization {
  layerId: string;
  role: MusicalRole;
  phase: number; // 0 to 2π
  frequency: number;
  amplitude: number;
  phaseVelocity: number; // Rate of phase change
  energy: number;
}

/**
 * Convergence prediction data
 */
export interface ConvergencePrediction {
  time: number;
  strength: number;
  confidence: number;
  participatingLayers: string[];
  type: ConvergenceType;
  factors: {
    phaseAlignment: number;
    energyAlignment: number;
    patternAlignment: number;
  };
}

/**
 * Coincidence field implementation
 */
export class CoincidenceField implements ICoincidenceField {
  public readonly id: string;
  public convergencePoints: Array<{
    time: number;
    strength: number;
    participatingLayers: string[];
  }>;

  private _algorithm: ConvergenceAlgorithm;
  private _layers: Map<string, LayerSynchronization> = new Map();
  private _predictions: ConvergencePrediction[] = [];
  private _sensitivity: number = 0.7;
  private _lookaheadWindow: number = 5.0; // seconds
  private _cache: Map<string, any> = new Map();

  constructor(options: {
    id: string;
    algorithm?: ConvergenceAlgorithm;
    sensitivity?: number;
    lookaheadWindow?: number;
  }) {
    this.id = options.id;
    this._algorithm = options.algorithm || 'phase-correlation';
    this._sensitivity = options.sensitivity ?? 0.7;
    this._lookaheadWindow = options.lookaheadWindow ?? 5.0;
    this.convergencePoints = [];
  }

  /**
   * Register a layer for convergence tracking
   */
  registerLayer(synchronization: LayerSynchronization): void {
    this._layers.set(synchronization.layerId, synchronization);
    this._cache.clear(); // Clear cache since layer data changed
  }

  /**
   * Unregister a layer from tracking
   */
  unregisterLayer(layerId: string): void {
    this._layers.delete(layerId);
    this._cache.clear();
  }

  /**
   * Update layer synchronization data
   */
  updateLayer(layerId: string, updates: Partial<LayerSynchronization>): void {
    const existing = this._layers.get(layerId);
    if (existing) {
      this._layers.set(layerId, { ...existing, ...updates });
      this._cache.clear();
    }
  }

  /**
   * Check for convergence at specific time
   */
  hasConvergence(time: number, tolerance: number = 0.5): boolean {
    const cacheKey = `conv_${time.toFixed(3)}_${tolerance.toFixed(3)}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // Check existing convergence points
    for (const point of this.convergencePoints) {
      if (Math.abs(point.time - time) <= tolerance && point.strength >= this._sensitivity) {
        this._cache.set(cacheKey, true);
        return true;
      }
    }

    // Check predictions
    for (const prediction of this._predictions) {
      if (Math.abs(prediction.time - time) <= tolerance &&
          prediction.strength >= this._sensitivity &&
          prediction.confidence >= 0.5) {
        this._cache.set(cacheKey, true);
        return true;
      }
    }

    // Analyze current layer states
    const hasCurrentConvergence = this.analyzeCurrentConvergence(time, tolerance);
    this._cache.set(cacheKey, hasCurrentConvergence);
    return hasCurrentConvergence;
  }

  /**
   * Get nearest convergence point
   */
  getNearestConvergence(time: number): ConvergencePoint | null {
    let nearest: ConvergencePoint | null = null;
    let minDistance = Infinity;

    // Check existing points
    for (const point of this.convergencePoints) {
      const distance = Math.abs(point.time - time);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          time: point.time,
          strength: point.strength,
          layers: point.participatingLayers,
          type: this.classifyConvergenceType(point)
        };
      }
    }

    // Check predictions
    for (const prediction of this._predictions) {
      const distance = Math.abs(prediction.time - time);
      if (distance < minDistance && prediction.confidence >= 0.5) {
        minDistance = distance;
        nearest = {
          time: prediction.time,
          strength: prediction.strength,
          layers: prediction.participatingLayers,
          type: prediction.type
        };
      }
    }

    return nearest;
  }

  /**
   * Analyze and predict future convergence points
   */
  predictConvergence(currentTime: number): ConvergencePrediction[] {
    this._predictions = [];

    if (this._layers.size < 2) {
      return this._predictions; // Need at least 2 layers for convergence
    }

    const layers = Array.from(this._layers.values());
    const endTime = currentTime + this._lookaheadWindow;

    switch (this._algorithm) {
      case 'phase-correlation':
        this._predictions = this.predictPhaseCorrelation(layers, currentTime, endTime);
        break;
      case 'peak-alignment':
        this._predictions = this.predictPeakAlignment(layers, currentTime, endTime);
        break;
      case 'energy-threshold':
        this._predictions = this.predictEnergyThreshold(layers, currentTime, endTime);
        break;
      case 'pattern-synchronization':
        this._predictions = this.predictPatternSynchronization(layers, currentTime, endTime);
        break;
    }

    // Sort by strength and filter by sensitivity
    this._predictions = this._predictions
      .filter(p => p.strength >= this._sensitivity)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10); // Keep top 10 predictions

    return this._predictions;
  }

  /**
   * Add detected convergence point
   */
  addConvergencePoint(
    time: number,
    strength: number,
    participatingLayers: string[],
    type?: ConvergenceType
  ): void {
    // Remove any existing points too close to this time
    this.convergencePoints = this.convergencePoints.filter(
      point => Math.abs(point.time - time) > 0.1
    );

    // Add new convergence point
    this.convergencePoints.push({
      time,
      strength,
      participatingLayers: [...participatingLayers]
    });

    // Sort by time
    this.convergencePoints.sort((a, b) => a.time - b.time);

    // Limit to prevent memory bloat
    if (this.convergencePoints.length > 1000) {
      this.convergencePoints = this.convergencePoints.slice(-500);
    }

    this._cache.clear();
  }

  /**
   * Get convergence statistics
   */
  getStatistics(): {
    totalConvergences: number;
    averageStrength: number;
    averageInterval: number;
    typeDistribution: Record<ConvergenceType, number>;
  } {
    if (this.convergencePoints.length === 0) {
      return {
        totalConvergences: 0,
        averageStrength: 0,
        averageInterval: 0,
        typeDistribution: {} as Record<ConvergenceType, number>
      };
    }

    const totalStrength = this.convergencePoints.reduce((sum, p) => sum + p.strength, 0);
    const averageStrength = totalStrength / this.convergencePoints.length;

    let totalInterval = 0;
    if (this.convergencePoints.length > 1) {
      for (let i = 1; i < this.convergencePoints.length; i++) {
        totalInterval += this.convergencePoints[i].time - this.convergencePoints[i - 1].time;
      }
      totalInterval /= (this.convergencePoints.length - 1);
    }

    const typeDistribution: Record<string, number> = {};
    for (const point of this.convergencePoints) {
      const type = this.classifyConvergenceType(point);
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    }

    return {
      totalConvergences: this.convergencePoints.length,
      averageStrength,
      averageInterval: totalInterval,
      typeDistribution: typeDistribution as Record<ConvergenceType, number>
    };
  }

  /**
   * Analyze current convergence at time
   */
  private analyzeCurrentConvergence(time: number, tolerance: number): boolean {
    const layers = Array.from(this._layers.values());
    if (layers.length < 2) return false;

    // Calculate layer states at current time
    const layerStates = layers.map(layer => ({
      ...layer,
      currentPhase: (layer.phase + layer.phaseVelocity * time) % (2 * Math.PI),
      currentEnergy: layer.energy * Math.sin(layer.currentPhase)
    }));

    // Check for phase alignment
    const phaseAlignment = this.calculatePhaseAlignment(layerStates);
    const energyAlignment = this.calculateEnergyAlignment(layerStates);

    const combinedStrength = (phaseAlignment + energyAlignment) / 2;

    return combinedStrength >= this._sensitivity;
  }

  /**
   * Predict convergence using phase correlation
   */
  private predictPhaseCorrelation(
    layers: LayerSynchronization[],
    startTime: number,
    endTime: number
  ): ConvergencePrediction[] {
    const predictions: ConvergencePrediction[] = [];
    const timeStep = 0.1; // 100ms resolution
    const steps = Math.floor((endTime - startTime) / timeStep);

    for (let step = 0; step <= steps; step++) {
      const time = startTime + step * timeStep;

      // Calculate future phases
      const layerPhases = layers.map(layer => ({
        layerId: layer.layerId,
        phase: (layer.phase + layer.phaseVelocity * time) % (2 * Math.PI),
        energy: layer.energy,
        role: layer.role
      }));

      // Check for phase alignment
      const phaseAlignment = this.calculatePhaseAlignment(layerPhases);
      const energyAlignment = this.calculateEnergyAlignment(layerPhases);

      if (phaseAlignment >= this._sensitivity) {
        const strength = (phaseAlignment + energyAlignment) / 2;
        const confidence = Math.min(1.0, (time - startTime) / this._lookaheadWindow);

        predictions.push({
          time,
          strength,
          confidence,
          participatingLayers: layers.map(l => l.layerId),
          type: this.predictConvergenceType(layerPhases, strength),
          factors: {
            phaseAlignment,
            energyAlignment,
            patternAlignment: 0.5 // Default for phase correlation
          }
        });
      }
    }

    // Merge nearby predictions
    return this.mergeNearbyPredictions(predictions, 0.5);
  }

  /**
   * Predict convergence using peak alignment
   */
  private predictPeakAlignment(
    layers: LayerSynchronization[],
    startTime: number,
    endTime: number
  ): ConvergencePrediction[] {
    const predictions: ConvergencePrediction[] = [];

    // Calculate individual peak times for each layer
    const layerPeaks = layers.map(layer => {
      const peaks: number[] = [];
      const period = (2 * Math.PI) / layer.frequency;
      let currentTime = startTime;

      while (currentTime <= endTime) {
        const phase = (layer.phase + layer.phaseVelocity * currentTime) % (2 * Math.PI);
        if (Math.abs(phase - Math.PI / 2) < 0.1) { // Near peak
          peaks.push(currentTime);
        }
        currentTime += 0.1;
      }

      return { layerId: layer.layerId, peaks };
    });

    // Find overlapping peaks
    for (const peak1 of layerPeaks[0]?.peaks || []) {
      const overlappingLayers = [layerPeaks[0]?.layerId].filter(Boolean);

      for (let i = 1; i < layerPeaks.length; i++) {
        const hasOverlap = layerPeaks[i].peaks.some(peak2 =>
          Math.abs(peak1 - peak2) < 0.2
        );

        if (hasOverlap) {
          overlappingLayers.push(layerPeaks[i].layerId);
        }
      }

      if (overlappingLayers.length >= 2) {
        const strength = overlappingLayers.length / layers.length;
        predictions.push({
          time: peak1,
          strength,
          confidence: 0.8,
          participatingLayers: overlappingLayers,
          type: 'climax',
          factors: {
            phaseAlignment: strength,
            energyAlignment: strength,
            patternAlignment: strength
          }
        });
      }
    }

    return predictions;
  }

  /**
   * Predict convergence using energy threshold
   */
  private predictEnergyThreshold(
    layers: LayerSynchronization[],
    startTime: number,
    endTime: number
  ): ConvergencePrediction[] {
    const predictions: ConvergencePrediction[] = [];
    const threshold = this._sensitivity;

    // Calculate combined energy curve
    const timeStep = 0.1;
    const steps = Math.floor((endTime - startTime) / timeStep);

    for (let step = 0; step <= steps; step++) {
      const time = startTime + step * timeStep;

      let totalEnergy = 0;
      const activeLayers: string[] = [];

      for (const layer of layers) {
        const phase = (layer.phase + layer.phaseVelocity * time) % (2 * Math.PI);
        const energy = layer.energy * Math.abs(Math.sin(phase));

        if (energy > threshold) {
          totalEnergy += energy;
          activeLayers.push(layer.layerId);
        }
      }

      if (activeLayers.length >= 2) {
        const normalizedEnergy = totalEnergy / layers.length;

        predictions.push({
          time,
          strength: normalizedEnergy,
          confidence: 0.7,
          participatingLayers: activeLayers,
          type: normalizedEnergy > 0.8 ? 'climax' : 'tension',
          factors: {
            phaseAlignment: 0.6,
            energyAlignment: normalizedEnergy,
            patternAlignment: 0.5
          }
        });
      }
    }

    return this.mergeNearbyPredictions(predictions, 0.3);
  }

  /**
   * Predict convergence using pattern synchronization
   */
  private predictPatternSynchronization(
    layers: LayerSynchronization[],
    startTime: number,
    endTime: number
  ): ConvergencePrediction[] {
    // Simplified pattern synchronization based on frequency ratios
    const predictions: ConvergencePrediction[] = [];

    if (layers.length < 2) return predictions;

    // Find common multiples of layer periods
    const basePeriod = (2 * Math.PI) / layers[0].frequency;

    for (let i = 1; i < layers.length; i++) {
      const layerPeriod = (2 * Math.PI) / layers[i].frequency;
      const lcm = this.calculateLCM(basePeriod, layerPeriod);

      if (lcm <= this._lookaheadWindow) {
        const syncTime = startTime + lcm;

        if (syncTime <= endTime) {
          const strength = this.calculatePhaseAlignment(
            layers.map(layer => ({
              ...layer,
              phase: (layer.phase + layer.phaseVelocity * syncTime) % (2 * Math.PI)
            }))
          );

          if (strength >= this._sensitivity) {
            predictions.push({
              time: syncTime,
              strength,
              confidence: 0.9,
              participatingLayers: layers.map(l => l.layerId),
              type: 'emergence',
              factors: {
                phaseAlignment: strength,
                energyAlignment: 0.7,
                patternAlignment: strength
              }
            });
          }
        }
      }
    }

    return predictions;
  }

  /**
   * Calculate phase alignment between layers
   */
  private calculatePhaseAlignment(layers: Array<{ phase: number; energy?: number }>): number {
    if (layers.length < 2) return 0;

    // Calculate circular variance
    let sumX = 0;
    let sumY = 0;

    for (const layer of layers) {
      const weight = layer.energy || 1;
      sumX += weight * Math.cos(layer.phase);
      sumY += weight * Math.sin(layer.phase);
    }

    const totalWeight = layers.reduce((sum, layer) => sum + (layer.energy || 1), 0);
    const magnitude = Math.sqrt(sumX * sumX + sumY * sumY) / totalWeight;

    return magnitude; // 0 = no alignment, 1 = perfect alignment
  }

  /**
   * Calculate energy alignment between layers
   */
  private calculateEnergyAlignment(layers: Array<{ phase: number; energy: number }>): number {
    if (layers.length < 2) return 0;

    // Calculate similarity of energy states
    const energyStates = layers.map(layer => Math.abs(Math.sin(layer.phase)));
    const meanEnergy = energyStates.reduce((sum, e) => sum + e, 0) / energyStates.length;

    // Calculate variance (lower variance = better alignment)
    const variance = energyStates.reduce((sum, e) => sum + Math.pow(e - meanEnergy, 2), 0) / energyStates.length;

    // Convert to alignment score (0 = no alignment, 1 = perfect alignment)
    return Math.max(0, 1 - (variance * 4));
  }

  /**
   * Classify convergence type based on characteristics
   */
  private classifyConvergenceType(point: {
    time: number;
    strength: number;
    participatingLayers: string[];
  }): ConvergenceType {
    const layerCount = point.participatingLayers.length;
    const strength = point.strength;

    if (layerCount >= 4 && strength > 0.9) {
      return 'climax';
    } else if (strength > 0.7 && layerCount >= 3) {
      return 'cadence';
    } else if (strength > 0.6) {
      return 'transition';
    } else if (strength > 0.4) {
      return 'tension';
    } else {
      return 'emergence';
    }
  }

  /**
   * Predict convergence type based on layer characteristics
   */
  private predictConvergenceType(
    layers: Array<{ layerId: string; phase: number; energy: number; role: MusicalRole }>,
    strength: number
  ): ConvergenceType {
    const hasMelody = layers.some(l => l.role === 'melody' || l.role === 'lead');
    const hasHarmony = layers.some(l => l.role === 'harmony');
    const hasRhythm = layers.some(l => l.role === 'rhythm' || l.role === 'bass');

    if (hasMelody && hasHarmony && hasRhythm && strength > 0.8) {
      return 'climax';
    } else if (hasHarmony && hasRhythm && strength > 0.6) {
      return 'cadence';
    } else if (hasMelody && hasHarmony) {
      return 'transition';
    } else if (strength > 0.7) {
      return 'tension';
    } else {
      return 'emergence';
    }
  }

  /**
   * Merge nearby predictions to avoid duplicates
   */
  private mergeNearbyPredictions(predictions: ConvergencePrediction[], tolerance: number): ConvergencePrediction[] {
    if (predictions.length === 0) return predictions;

    const merged: ConvergencePrediction[] = [];
    const sorted = [...predictions].sort((a, b) => a.time - b.time);

    for (const prediction of sorted) {
      const existingIndex = merged.findIndex(p => Math.abs(p.time - prediction.time) <= tolerance);

      if (existingIndex >= 0) {
        // Merge with existing prediction
        const existing = merged[existingIndex];
        existing.participatingLayers = [...new Set([...existing.participatingLayers, ...prediction.participatingLayers])];
        existing.strength = Math.max(existing.strength, prediction.strength);
        existing.confidence = (existing.confidence + prediction.confidence) / 2;
      } else {
        merged.push({ ...prediction });
      }
    }

    return merged;
  }

  /**
   * Calculate least common multiple for periods
   */
  private calculateLCM(a: number, b: number): number {
    const gcd = (x: number, y: number): number => {
      while (y !== 0) {
        const temp = y;
        y = x % y;
        x = temp;
      }
      return x;
    };

    return Math.abs(a * b) / gcd(a, b);
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this._cache.clear();
  }
}