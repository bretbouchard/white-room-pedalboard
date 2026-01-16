// runtime analysis helpers (reverse-analysis package)
import {
  ValidationError as _ValidationError,
  ProcessingError as _ProcessingError,
} from '@schillinger-sdk/shared';
import type { SchillingerSDK } from './client';
import type { HarmonicAnalysis, ChordProgression } from '@schillinger-sdk/shared';

// Re-export ChordProgression for use by other modules
export type { ChordProgression } from '@schillinger-sdk/shared';

// Local fallback for rounding floats used by analysis normalization.
function roundFloat(v: number, precision: number = 3): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(v * factor) / factor;
}

// Small, deterministic suggestion generator used by HarmonyAPI when producing
// human-readable suggestions for a progression analysis. Keep implementation
// minimal and deterministic so tests don't depend on heavy heuristics.
function generateAnalysisSuggestions(progressionAnalysis: any): string[] {
  const suggestions: string[] = [];
  try {
    const funcs = Array.isArray(progressionAnalysis.functions)
      ? progressionAnalysis.functions
      : [];
    if (funcs.length === 0) return suggestions;
    // If the progression is heavily tonic-centric, suggest adding movement.
    const tonicCount = funcs.filter((f: string) => f === 'tonic').length;
    const tonicRatio = tonicCount / Math.max(1, funcs.length);
    if (tonicRatio > 0.6)
      suggestions.push(
        'Consider adding more functional movement to reduce tonic repetition.'
      );

    // If tension curve peaks exist, suggest resolving tensions on cadence points.
    if (
      Array.isArray(progressionAnalysis.tensionCurve) &&
      progressionAnalysis.tensionCurve.some((t: number) => t > 0.7)
    ) {
      suggestions.push(
        'Some sections show high tension -- consider stronger cadential resolutions.'
      );
    }

    // Fallback generic suggestion
    if (suggestions.length === 0)
      suggestions.push(
        'Progression looks balanced -- try reharmonization variations for interest.'
      );
  } catch (e) {
    // keep suggestions empty on error
  }
  return suggestions;
}

// ... (rest of file unchanged) ...

export class HarmonyAPI {
  constructor(private sdk: SchillingerSDK) {}

  /**
   * Analyze chord progression with functional analysis and voice leading quality
   */
  async analyzeProgression(chords: string[]): Promise<HarmonicAnalysis> {
    try {
      // Validate input
      if (!Array.isArray(chords) || chords.length === 0) {
        throw new _ValidationError(
          'chords',
          chords,
          'non-empty array of chord symbols'
        );
      }

      // Validate chord symbols
      for (let i = 0; i < chords.length; i++) {
        if (typeof chords[i] !== 'string' || chords[i].trim().length === 0) {
          throw new _ValidationError(
            `chords[${i}]`,
            chords[i],
            'valid chord symbol string'
          );
        }
      }

      const cacheKey = `harmony_analysis_${JSON.stringify(chords)}`;
      const cached = await this.sdk.cache.get<HarmonicAnalysis>(cacheKey);
      if (
        cached &&
        typeof cached === 'object' &&
        'key_stability' in cached &&
        'tension_curve' in cached
      ) {
        // Defensive: ensure tension_curve is always an array
        if (!Array.isArray(cached.tension_curve)) {
          cached.tension_curve = [];
        }
        // Normalize outputs
        cached.key_stability = roundFloat(cached.key_stability);
        cached.voice_leading_quality = roundFloat(cached.voice_leading_quality);
        cached.tension_curve = cached.tension_curve.map((t: number) =>
          roundFloat(t)
        );
        return cached;
      }

      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        const offline = this.analyzeProgressionOffline(chords);
        offline.key_stability = roundFloat(offline.key_stability);
        offline.voice_leading_quality = roundFloat(
          offline.voice_leading_quality
        );
        offline.tension_curve = offline.tension_curve.map((t: number) =>
          roundFloat(t)
        );
        return offline;
      }

      // Perform analysis using reverse analysis engine (dynamic import so tests can mock)
      const { analyzeProgression } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      const analysisResult: any = analyzeProgression
        ? analyzeProgression(chords)
        : { voiceLeading: [], functions: [], tensionCurve: [], cadences: [] };

      const progressionAnalysis: any = {
        voiceLeading: analysisResult.voiceLeading || {},
        functions: Array.isArray(analysisResult.functions)
          ? analysisResult.functions
          : [],
        tensionCurve: Array.isArray(analysisResult.tensionCurve)
          ? analysisResult.tensionCurve
          : [],
        cadences: Array.isArray(analysisResult.cadences)
          ? analysisResult.cadences
          : [],
      };

      const tonicCount = progressionAnalysis.functions.filter(
        (f: string) => f === 'tonic'
      ).length;
      const key_stability =
        progressionAnalysis.functions.length > 0
          ? tonicCount / progressionAnalysis.functions.length
          : 0;

      // Extract tension curve, always ensure array
      const tension_curve = Array.isArray(progressionAnalysis.tensionCurve)
        ? progressionAnalysis.tensionCurve
        : [];

      // Get functional analysis
      const functionalanalysis = progressionAnalysis.functions;

      // Calculate voice leading quality
      const vl = progressionAnalysis.voiceLeading || {};
      const voice_leading_quality =
        (typeof vl.smoothness === 'number' ? vl.smoothness : 0) * 0.4 +
        (typeof vl.stepwiseMotion === 'number' ? vl.stepwiseMotion : 0) * 0.3 +
        (typeof vl.contraryMotion === 'number' ? vl.contraryMotion : 0) * 0.2 +
        (1 - (typeof vl.parallelMotion === 'number' ? vl.parallelMotion : 0)) * 0.1;

      // Generate suggestions
      const suggestions = generateAnalysisSuggestions(progressionAnalysis);

      const result: HarmonicAnalysis = {
        key_stability: roundFloat(key_stability),
        tension_curve: tension_curve.map((t: number) => roundFloat(t)),
        functionalanalysis,
        voice_leading_quality: roundFloat(voice_leading_quality),
        suggestions,
      };

      // Ensure all outputs are finite numbers
      if (
        !Number.isFinite(result.key_stability) ||
        !Number.isFinite(result.voice_leading_quality) ||
        result.tension_curve.some((t: number) => !Number.isFinite(t))
      ) {
        throw new Error(
          'Harmonic analysis produced non-finite (NaN or Infinity) values'
        );
      }

  // Cache the result
  await this.sdk.cache.set(cacheKey, result, 1800); // Cache for 30 minutes

      return result;
    } catch (error: any) {
      if (error instanceof _ValidationError) throw error;
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  }

  // Enhanced offline analyzer with sophisticated harmonic analysis
  private analyzeProgressionOffline(chords: string[]): HarmonicAnalysis {
    try {
      // Parse chord symbols to extract harmonic information
      const chordAnalyses = chords.map(chord => this.parseChordSymbol(chord));

      // Determine functional analysis using music theory principles
      const functions = this.inferHarmonicFunctions(chordAnalyses);

      // Calculate tension curve based on chord qualities and voice leading
      const tensionCurve = this.calculateTensionCurve(chordAnalyses, functions);

      // Calculate key stability based on functional distribution
      const tonicCount = functions.filter(f => f === 'tonic').length;
      const dominantCount = functions.filter(f => f === 'dominant').length;
      const subdominantCount = functions.filter(f => f === 'subdominant').length;

      const key_stability = functions.length > 0 ?
        (tonicCount * 0.6 + subdominantCount * 0.3 + dominantCount * 0.1) / functions.length
        : 0.5;

      // Calculate voice leading quality using interval analysis
      const voice_leading_quality = this.calculateVoiceLeadingQuality(chordAnalyses);

      // Generate meaningful suggestions based on analysis
      const suggestions = this.generateProgressionSuggestions(functions, tensionCurve, key_stability);

      return {
        key_stability: Math.max(0, Math.min(1, key_stability)),
        tension_curve: tensionCurve.map(t => Math.max(0, Math.min(1, t))),
        functionalanalysis: functions,
        voice_leading_quality: Math.max(0, Math.min(1, voice_leading_quality)),
        suggestions,
      };
    } catch (error) {
      // Fallback to basic analysis if enhanced analysis fails
      return {
        key_stability: 0.5,
        tension_curve: chords.map(() => 0.3),
        functionalanalysis: chords.map(() => 'tonic'),
        voice_leading_quality: 0.6,
        suggestions: ['Enhanced offline analysis failed, using basic fallback.'],
      };
    }
  }

  // Helper methods for enhanced offline analysis
  private parseChordSymbol(chord: string): any {
    const cleanChord = chord.trim().toUpperCase();

    // Extract root, quality, and extensions
    const rootMatch = cleanChord.match(/^([A-G][#b]?)/);
    const root = rootMatch ? rootMatch[1] : 'C';

    // Determine chord quality
    let quality = 'major';
    let extensions: string[] = [];

    if (cleanChord.includes('M7') || cleanChord.includes('MAJ7')) {
      quality = 'major7';
      extensions.push('7');
    } else if (cleanChord.includes('m7') || cleanChord.includes('min7')) {
      quality = 'minor7';
      extensions.push('7');
    } else if (cleanChord.includes('m') || cleanChord.includes('min')) {
      quality = 'minor';
    } else if (cleanChord.includes('7') && !cleanChord.includes('MAJ')) {
      quality = 'dominant7';
      extensions.push('7');
    } else if (cleanChord.includes('dim') || cleanChord.includes('°')) {
      quality = 'diminished';
    } else if (cleanChord.includes('aug') || cleanChord.includes('+')) {
      quality = 'augmented';
    }

    // Extract other extensions
    const extensionMatch = cleanChord.match(/(9|11|13|b9|#9|#11|b13|sus2|sus4)/g);
    if (extensionMatch) {
      extensions.push(...extensionMatch);
    }

    return { root, quality, extensions, symbol: chord };
  }

  private inferHarmonicFunctions(chordAnalyses: any[]): string[] {
    const functions: string[] = [];
    const diatonicRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    chordAnalyses.forEach((chord, index) => {
      const root = chord.root;
      const quality = chord.quality;

      // Simple diatonic function inference (can be enhanced with key detection)
      if (quality.includes('major') || quality === 'augmented') {
        if (root === 'C' || root === 'G') functions.push('tonic');
        else if (root === 'F') functions.push('subdominant');
        else if (root === 'G' || root === 'D') functions.push('dominant');
        else functions.push('tonic'); // Default to tonic for ambiguous cases
      } else if (quality.includes('minor')) {
        if (root === 'A' || root === 'E') functions.push('tonic');
        else if (root === 'D') functions.push('subdominant');
        else if (root === 'E' || root === 'B') functions.push('dominant');
        else functions.push('subdominant');
      } else if (quality.includes('diminished')) {
        functions.push('dominant'); // Leading tone function
      } else if (quality.includes('dominant7')) {
        functions.push('dominant');
      } else {
        functions.push('tonic'); // Default fallback
      }
    });

    return functions;
  }

  private calculateTensionCurve(chordAnalyses: any[], functions: string[]): number[] {
    return chordAnalyses.map((chord, index) => {
      let tension = 0.3; // Base tension

      // Adjust based on chord quality
      if (chord.quality.includes('dominant7')) tension += 0.3;
      if (chord.quality.includes('diminished')) tension += 0.4;
      if (chord.quality.includes('augmented')) tension += 0.3;
      if (chord.extensions.includes('b9') || chord.extensions.includes('#9')) tension += 0.2;
      if (chord.extensions.includes('#11') || chord.extensions.includes('b13')) tension += 0.1;

      // Adjust based on function
      if (functions[index] === 'dominant') tension += 0.2;
      if (functions[index] === 'subdominant') tension += 0.1;

      // Consider context - create tension curve
      const positionInPhrase = index / Math.max(chordAnalyses.length - 1, 1);
      if (positionInPhrase > 0.75 && functions[index] === 'dominant') {
        tension += 0.2; // Increase tension near cadence
      }

      return Math.max(0, Math.min(1, tension));
    });
  }

  private calculateVoiceLeadingQuality(chordAnalyses: any[]): number {
    if (chordAnalyses.length < 2) return 0.7;

    let totalSmoothness = 0;
    let totalConnections = 0;

    for (let i = 1; i < chordAnalyses.length; i++) {
      const prevChord = chordAnalyses[i - 1];
      const currChord = chordAnalyses[i];

      // Calculate root movement distance
      const rootDistance = this.calculateRootDistance(prevChord.root, currChord.root);

      // Favor stepwise motion (interval of 2nd)
      if (rootDistance === 1 || rootDistance === 2) {
        totalSmoothness += 0.8;
      } else if (rootDistance === 3 || rootDistance === 4) {
        totalSmoothness += 0.6; // Thirds and fourths
      } else if (rootDistance === 5) {
        totalSmoothness += 0.4; // Fifths
      } else {
        totalSmoothness += 0.2; // Larger intervals
      }

      // Favor contrary motion between roots and qualities
      const qualityChange = prevChord.quality !== currChord.quality ? 0.1 : 0;
      totalSmoothness += qualityChange;

      totalConnections++;
    }

    return totalConnections > 0 ? totalSmoothness / totalConnections : 0.7;
  }

  private calculateRootDistance(root1: string, root2: string): number {
    const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const idx1 = chromaticScale.indexOf(root1.replace('#', '#').replace('b', '#'));
    const idx2 = chromaticScale.indexOf(root2.replace('#', '#').replace('b', '#'));

    if (idx1 === -1 || idx2 === -1) return 5; // Default distance

    const distance = Math.abs(idx2 - idx1);
    return Math.min(distance, 12 - distance); // Return smallest interval
  }

  private generateProgressionSuggestions(functions: string[], tensionCurve: number[], keyStability: number): string[] {
    const suggestions: string[] = [];

    // Analyze functional balance
    const tonicRatio = functions.filter(f => f === 'tonic').length / functions.length;
    const dominantRatio = functions.filter(f => f === 'dominant').length / functions.length;

    if (tonicRatio > 0.6) {
      suggestions.push('Consider adding more dominant chords for forward motion.');
    } else if (dominantRatio > 0.4) {
      suggestions.push('Strong dominant presence - ensure proper resolutions to tonic.');
    } else if (tonicRatio < 0.3) {
      suggestions.push('Limited tonic stability - add more tonic chords for grounding.');
    }

    // Analyze tension curve
    const maxTension = Math.max(...tensionCurve);
    const minTension = Math.min(...tensionCurve);
    const tensionRange = maxTension - minTension;

    if (tensionRange < 0.2) {
      suggestions.push('Tension curve is relatively flat - consider more dynamic harmonic movement.');
    } else if (maxTension > 0.8) {
      suggestions.push('High tension detected - ensure strong resolutions for musical satisfaction.');
    }

    // Analyze overall stability
    if (keyStability > 0.7) {
      suggestions.push('Very stable progression - suitable for sections requiring harmonic grounding.');
    } else if (keyStability < 0.4) {
      suggestions.push('Lower stability - consider where this progression fits in the larger musical structure.');
    }

    // Add contextual suggestions based on progression length
    if (functions.length === 2) {
      suggestions.push('Two-chord progression - consider using for basic harmonic frameworks or pedal points.');
    } else if (functions.length >= 8) {
      suggestions.push('Extended progression - ensure clear phrases and cadential points.');
    }

    return suggestions.length > 0 ? suggestions : ['Progression appears well-balanced.'];
  }

  private generateChordResolutions(chord: string, chordAnalysis: any, context: { key: string; scale: string }): Array<{target: string, type: string, probability: number}> {
    const resolutions: Array<{target: string, type: string, probability: number}> = [];
    const chordParse = this.parseChordSymbol(chord);
    const chordFunction = chordAnalysis.function || 'I';
    const chordQuality = chordAnalysis.quality || 'major';

    // Generate resolution targets based on function and quality
    switch (chordFunction) {
      case 'V':
      case 'dominant':
        // Strong resolution to tonic
        resolutions.push({
          target: context.key,
          type: 'authentic',
          probability: 0.8
        });
        // Deceptive resolution to vi
        const deceptiveChord = this.getRelativeMinor(context.key);
        resolutions.push({
          target: deceptiveChord,
          type: 'deceptive',
          probability: 0.2
        });
        break;

      case 'vi':
      case 'vi°':
        // Resolution to IV or ii
        const subdominantChord = this.getSubdominant(context.key, context.scale);
        resolutions.push({
          target: subdominantChord,
          type: 'plagal',
          probability: 0.6
        });
        const supertonicChord = this.getSupertonic(context.key, context.scale);
        resolutions.push({
          target: supertonicChord,
          type: 'pre-dominant',
          probability: 0.4
        });
        break;

      case 'IV':
      case 'ii':
        // Resolution to V or I
        const dominantChord = this.getDominant(context.key, context.scale);
        resolutions.push({
          target: dominantChord,
          type: 'pre-dominant',
          probability: 0.7
        });
        resolutions.push({
          target: context.key,
          type: 'plagal',
          probability: 0.3
        });
        break;

      case 'I':
      case 'tonic':
        // Can move to any function, with preferences
        resolutions.push({
          target: this.getSubdominant(context.key, context.scale),
          type: 'plagal',
          probability: 0.4
        });
        resolutions.push({
          target: this.getDominant(context.key, context.scale),
          type: 'tonic-dominant',
          probability: 0.4
        });
        resolutions.push({
          target: this.getSubmediant(context.key, context.scale),
          type: 'tonic-relative',
          probability: 0.2
        });
        break;

      default:
        // Generic resolution patterns
        resolutions.push({
          target: context.key,
          type: 'generic',
          probability: 0.6
        });
        resolutions.push({
          target: this.getDominant(context.key, context.scale),
          type: 'generic',
          probability: 0.4
        });
    }

    // Adjust probabilities based on chord quality
    if (chordQuality.includes('7') || chordQuality.includes('9')) {
      // Extended chords have stronger resolution tendencies
      resolutions.forEach(res => {
        if (res.type === 'authentic' || res.type === 'deceptive') {
          res.probability = Math.min(1.0, res.probability + 0.1);
        }
      });
    }

    if (chordQuality.includes('dim') || chordQuality.includes('°')) {
      // Diminished chords strongly resolve to tonic
      const dominantResolution = resolutions.find(r => r.type === 'authentic');
      if (dominantResolution) {
        dominantResolution.probability = Math.min(1.0, dominantResolution.probability + 0.2);
      }
    }

    // Normalize probabilities
    const totalProb = resolutions.reduce((sum, res) => sum + res.probability, 0);
    if (totalProb > 0) {
      resolutions.forEach(res => {
        res.probability = res.probability / totalProb;
      });
    }

    return resolutions;
  }

  // Helper methods for chord resolution generation
  private getRelativeMinor(key: string): string {
    const majorToRelative: {[key: string]: string} = {
      'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m',
      'E': 'C#m', 'B': 'G#m', 'F#': 'D#m', 'C#': 'A#m',
      'F': 'Dm', 'Bb': 'Gm', 'Eb': 'Cm', 'Ab': 'Fm',
      'Db': 'Bbm', 'Gb': 'Ebm', 'Cb': 'Abm'
    };
    return majorToRelative[key] || 'Am';
  }

  private getSubdominant(key: string, scale: string): string {
    const subdominants: {[key: string]: string} = {
      'C': 'F', 'G': 'C', 'D': 'G', 'A': 'D',
      'E': 'A', 'B': 'E', 'F#': 'B', 'C#': 'F#',
      'F': 'Bb', 'Bb': 'Eb', 'Eb': 'Ab', 'Ab': 'Db',
      'Db': 'Gb', 'Gb': 'Cb', 'Cb': 'Fb'
    };
    return subdominants[key] || 'F';
  }

  private getDominant(key: string, scale: string): string {
    const dominants: {[key: string]: string} = {
      'C': 'G', 'G': 'D', 'D': 'A', 'A': 'E',
      'E': 'B', 'B': 'F#', 'F#': 'C#', 'C#': 'G#',
      'F': 'C', 'Bb': 'F', 'Eb': 'Bb', 'Ab': 'Eb',
      'Db': 'Ab', 'Gb': 'Db', 'Cb': 'Gb'
    };
    return dominants[key] || 'G';
  }

  private getSupertonic(key: string, scale: string): string {
    const supertonics: {[key: string]: string} = {
      'C': 'Dm', 'G': 'Am', 'D': 'Em', 'A': 'F#m',
      'E': 'C#m', 'B': 'G#m', 'F#': 'A#m', 'C#': 'D#m',
      'F': 'Gm', 'Bb': 'Cm', 'Eb': 'Fm', 'Ab': 'Bbm',
      'Db': 'Ebm', 'Gb': 'Abm', 'Cb': 'Dm'
    };
    return supertonics[key] || 'Dm';
  }

  private getSubmediant(key: string, scale: string): string {
    const submediants: {[key: string]: string} = {
      'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m',
      'E': 'C#m', 'B': 'G#m', 'F#': 'D#m', 'C#': 'A#m',
      'F': 'Dm', 'Bb': 'Gm', 'Eb': 'Cm', 'Ab': 'Fm',
      'Db': 'Bbm', 'Gb': 'Ebm', 'Cb': 'Abm'
    };
    return submediants[key] || 'Am';
  }

  /**
   * Generate a chord progression using shared harmonic generators
   */
  async generateProgression(
    key: string,
    scale: string,
    length: number,
    options: any = {}
  ): Promise<ChordProgression> {
    if (!key || typeof key !== 'string')
      throw new _ValidationError('key', key, 'valid key string (e.g., "C")');
    if (!scale || typeof scale !== 'string')
      throw new _ValidationError(
        'scale',
        scale,
        'valid scale string (e.g., "major")'
      );
    if (!length || typeof length !== 'number' || length < 1 || length > 32)
      throw new _ValidationError('length', length, 'number between 1 and 32');

    const cacheKey = `harmony_progression_${key}_${scale}_${length}_${JSON.stringify(options)}`;
    const cached = await this.sdk.cache.get(cacheKey);
    if (cached) return cached as ChordProgression;

    const generators = (options && options.generators) || { a: 3, b: 2 };
    const generationOptions = {
      key,
      scale,
      length,
      complexity: options.complexity || 'moderate',
      style: options.style || 'contemporary',
      allowExtensions: options.allowExtensions !== false,
      allowAlterations: options.allowAlterations || false,
      ...options,
    };
    const { generateHarmonicProgression } = await import(
      '@schillinger-sdk/shared/math/harmonic-progressions'
    );
    const harmonicProgression = generateHarmonicProgression(
      generators.a,
      generators.b,
      generationOptions as any
    );
      const meta: any = {
        generators: (harmonicProgression as any).generators,
        functions: (harmonicProgression as any).functions,
        tensions: (harmonicProgression as any).tensions,
        complexity: (harmonicProgression as any).metadata?.complexity,
        stability: (harmonicProgression as any).metadata?.stability,
        movement: (harmonicProgression as any).metadata?.movement,
      };
      // Ensure voiceLeading is present in camelCase (tests expect this shape)
      meta.voiceLeading =
        (harmonicProgression as any).metadata?.voiceLeading ||
        (harmonicProgression as any).metadata?.voice_leading;

      const result: ChordProgression = {
        chords: harmonicProgression.chords,
        key: harmonicProgression.key,
        scale: harmonicProgression.scale,
        metadata: meta as any,
      };

    await this.sdk.cache.set(cacheKey, result, 3600);
    return result;
  }

  async generateVariations(
    progression: ChordProgression,
    variationTypes: string[] = ['reharmonization', 'substitution', 'extension']
  ): Promise<ChordProgression[]> {
    if (!progression || !Array.isArray(progression.chords))
      throw new _ValidationError(
        'progression',
        progression,
        'valid ChordProgression object'
      );
    const harmonicProgression = {
      chords: progression.chords,
      functions: progression.metadata?.functions || [],
      tensions: progression.metadata?.tensions || [],
      key: progression.key,
      scale: progression.scale,
      generators: (progression.metadata as any)?.generators,
      metadata: progression.metadata || {},
    } as any;

    const { generateProgressionVariations } = await import(
      '@schillinger-sdk/shared/math/harmonic-progressions'
    );
    const variations = generateProgressionVariations(
      harmonicProgression,
      variationTypes as any
    );
    return variations.map((v: any) => ({
      chords: v.chords,
      key: v.key,
      scale: v.scale,
      metadata: {
        generators: v.generators,
        functions: v.functions,
        tensions: v.tensions,
        complexity: v.metadata?.complexity,
        stability: v.metadata?.stability,
        movement: v.metadata?.movement,
        voiceLeading: v.metadata?.voiceLeading,
      },
    }));
  }

  async resolveChord(
    chord: string,
    context: { key: string; scale: string }
  ): Promise<any> {
    if (!chord || typeof chord !== 'string')
      throw new _ValidationError('chord', chord, 'valid chord symbol string');
    if (!context || !context.key || !context.scale)
      throw new _ValidationError(
        'context',
        context,
        'HarmonicContext with key and scale'
      );
    const { analyzeChord } = await import(
      '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
    );
    const chordAnalysis: any = analyzeChord
      ? analyzeChord(chord, context.key, context.scale)
      : { notes: [], intervals: [], quality: 'major', function: 'I', complexity: 0 };

    // Generate dynamic resolutions based on chord analysis
    const resolutions = this.generateChordResolutions(chord, chordAnalysis, context);
    return {
      chord,
      resolutions,
      context: {
        key: context.key,
        scale: context.scale,
        function: chordAnalysis.function,
        tension:
          typeof chordAnalysis.complexity === 'number'
            ? chordAnalysis.complexity
            : 0,
      },
    };
  }

  async inferHarmonicStructure(chords: string[]): Promise<any> {
    if (!Array.isArray(chords) || chords.length === 0)
      throw new _ValidationError(
        'chords',
        chords,
        'non-empty array of chord symbols'
      );
    const { inferHarmonicGenerators } = await import(
      '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
    );
    const inferences: any[] = inferHarmonicGenerators
      ? inferHarmonicGenerators(chords, {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 1,
          includeAlternatives: false,
        } as any)
      : [];
    if (!inferences || inferences.length === 0)
      throw new _ProcessingError(
        'infer harmonic structure',
        'No suitable Schillinger generators found for this progression'
      );
    return inferences[0];
  }

  async encodeProgression(
    inputChords: string[] | ChordProgression
  ): Promise<any> {
    const progression = Array.isArray(inputChords)
      ? { chords: inputChords, key: 'C', scale: 'major' }
      : inputChords;
    if (!Array.isArray(progression.chords) || progression.chords.length === 0)
      throw new _ValidationError(
        'inputChords',
        inputChords,
        'non-empty array of chord symbols or ChordProgression object'
      );
    const { encodeProgression } = await import(
      '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
    );
    const encoding: any = encodeProgression
      ? encodeProgression(progression.chords, {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 5,
          includeAlternatives: true,
        } as any)
      : { generators: [], patterns: [] };
    return encoding;
  }

  async findHarmonicMatches(
    targetProgression: ChordProgression,
    options: any = {}
  ): Promise<any[]> {
    if (!targetProgression || !Array.isArray(targetProgression.chords))
      throw new _ValidationError(
        'targetProgression',
        targetProgression,
        'valid ChordProgression object'
      );
    const { inferHarmonicGenerators } = await import(
      '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
    );
    const matches: any[] = inferHarmonicGenerators
      ? inferHarmonicGenerators(targetProgression.chords, {
          maxGenerator: 16,
          minConfidence: options.minConfidence || 0.1,
          maxResults: options.maxResults || 10,
          includeAlternatives: true,
          ...options,
        } as any)
      : [];
    return matches;
  }

  async generateFromTemplate(
    template: string[],
    options: any = {}
  ): Promise<ChordProgression> {
    if (!Array.isArray(template) || template.length === 0)
      throw new _ValidationError(
        'template',
        template,
        'non-empty array of Roman numeral strings'
      );
    const { generateFromTemplate } = await import(
      '@schillinger-sdk/shared/math/harmonic-progressions'
    );
    const harmonicProgression = generateFromTemplate(template, options as any);
    return {
      chords: harmonicProgression.chords,
      key: harmonicProgression.key,
      scale: harmonicProgression.scale,
      metadata: {
        functions: harmonicProgression.functions,
        tensions: harmonicProgression.tensions,
        generators: harmonicProgression.generators as unknown as [
          number,
          number,
        ],
        template,
        complexity: harmonicProgression.metadata?.complexity,
        stability: harmonicProgression.metadata?.stability,
        movement: harmonicProgression.metadata?.movement,
        voiceLeading: harmonicProgression.metadata?.voiceLeading,
      },
    } as ChordProgression;
  }

  async analyzeVoiceLeadingAndRhythm(
    chords: string[] | ChordProgression
  ): Promise<any> {
    const input = Array.isArray(chords) ? { chords } : chords;
    if (!input || !Array.isArray(input.chords) || input.chords.length === 0) {
      throw new _ValidationError(
        'progression',
        chords,
        'non-empty array of chord symbols or ChordPattern object'
      );
    }
    // Use the reverse-analysis implementation so tests that mock it receive
    // the call and return their mock results. If the implementation isn't
    // available, fall back to a minimal safe shape.
    try {
      const { analyzeVoiceLeadingAndRhythm } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      if (typeof analyzeVoiceLeadingAndRhythm === 'function') {
        const analysis =
          (input as any).key && (input as any).scale
            ? analyzeVoiceLeadingAndRhythm(input as any)
            : analyzeVoiceLeadingAndRhythm(input.chords as any);
        return analysis;
      }
    } catch (e) {
      // ignore and fallthrough to safe fallback
    }

    // Safe minimal fallback used when analysis module isn't available.
    return {
      voiceLeading: {
        smoothness: 0,
        parallelMotion: 0,
        contraryMotion: 0,
        stepwiseMotion: 0,
        voiceRanges: {
          bass: { min: 40, max: 60 },
          tenor: { min: 48, max: 67 },
          alto: { min: 55, max: 74 },
          soprano: { min: 60, max: 81 },
        },
      },
      harmonicRhythm: {
        changes: [],
        density: 0,
        acceleration: [],
        patterns: [],
      },
      rhythm: { complexity: 0, syncopation: 0 },
    };
  }
}
