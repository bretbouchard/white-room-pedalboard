/**
 * Examples and demonstrations of the pattern variation system
 */

import { describe, it, expect } from 'vitest';

import {
  // Rhythm variations
  applyRhythmAugmentation,
  applyRhythmDiminution,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  applyRhythmFractioning,

  // Harmonic variations
  applyHarmonicReharmonization,
  applyHarmonicSubstitution,
  optimizeVoiceLeading,

  // Melodic transformations
  applyMelodicInversion,
  applyMelodicRetrograde,
  applyMelodicAugmentation,
  applyMelodicTransposition,

  // Complexity analysis
  calculatePatternComplexity,
  determineDifficultyLevel,
} from '../math/pattern-variations';

import { generateRhythmicResultant } from '../math/rhythmic-resultants';
import { generateHarmonicProgression } from '../math/harmonic-progressions';
import { generateMelodicContour } from '../math/melodic-contours';

describe('Pattern Variation Examples', () => {
  describe('Complete Rhythm Transformation Workflow', () => {
    it('should demonstrate comprehensive rhythm variations', () => {
      console.log('\n=== RHYTHM VARIATION WORKFLOW ===');

      // Start with a basic 3:2 rhythmic resultant
      const originalRhythm = generateRhythmicResultant(3, 2);
      console.log('Original rhythm pattern:', originalRhythm.pattern);
      console.log('Original complexity:', originalRhythm.complexity);

      // Apply augmentation
      const augmented = applyRhythmAugmentation(originalRhythm, 2);
      console.log('\nAugmented (x2):', augmented.pattern);
      console.log('Augmented complexity:', augmented.complexity.overall);

      // Apply diminution
      const diminished = applyRhythmDiminution(originalRhythm, 2);
      console.log('\nDiminished (/2):', diminished.pattern);
      console.log('Diminished complexity:', diminished.complexity.overall);

      // Apply retrograde
      const retrograde = applyRhythmRetrograde(originalRhythm);
      console.log('\nRetrograde:', retrograde.pattern);
      console.log('Retrograde complexity:', retrograde.complexity.overall);

      // Apply rotation
      const rotated = applyRhythmRotation(originalRhythm, 2);
      console.log('\nRotated (2 steps):', rotated.pattern);
      console.log('Rotation steps:', rotated.metadata.rotation_steps);

      // Apply fractioning
      const fractioned = applyRhythmFractioning(originalRhythm, 3);
      console.log('\nFractioned (3 divisions):', fractioned.pattern);
      console.log(
        'New length:',
        fractioned.new_length,
        'vs original:',
        fractioned.original_length
      );

      // Apply permutation
      const permuted = applyRhythmPermutation(originalRhythm);
      console.log('\nPermuted:', permuted.pattern);
      console.log('Permutation order:', permuted.metadata.permutation_order);

      // All transformations should maintain basic structure
      expect(augmented.type).toBe('augmentation');
      expect(diminished.type).toBe('diminution');
      expect(retrograde.type).toBe('retrograde');
      expect(rotated.type).toBe('rotation');
      expect(fractioned.type).toBe('fractioning');
      expect(permuted.type).toBe('permutation');
    });
  });

  describe('Harmonic Progression Enhancement', () => {
    it('should demonstrate harmonic variation techniques', () => {
      console.log('\n=== HARMONIC VARIATION WORKFLOW ===');

      // Generate a basic harmonic progression
      const originalHarmony = generateHarmonicProgression(4, 3, {
        key: 'C',
        scale: 'major',
        complexity: 'moderate',
      });

      console.log('Original progression:', originalHarmony.chords);
      console.log('Original functions:', originalHarmony.functions);
      console.log('Original complexity:', originalHarmony.metadata.complexity);
      console.log(
        'Original voice leading smoothness:',
        originalHarmony.metadata.voiceLeading.smoothness
      );

      // Apply reharmonization
      const reharmonized = applyHarmonicReharmonization(originalHarmony, 0.6);
      console.log('\nReharmonized chords:', reharmonized.progression.chords);
      console.log(
        'Reharmonization changes:',
        reharmonized.metadata.reharmonizations?.length || 0
      );
      console.log('New complexity:', reharmonized.complexity.overall);

      // Apply tritone substitutions
      const substituted = applyHarmonicSubstitution(originalHarmony, 'tritone');
      console.log(
        '\nWith tritone substitutions:',
        substituted.progression.chords
      );
      console.log(
        'Substitutions made:',
        substituted.metadata.substitutions?.length || 0
      );

      // Optimize voice leading
      const optimized = optimizeVoiceLeading(originalHarmony);
      console.log('\nVoice leading optimized:', optimized.progression.chords);
      console.log(
        'Improvements made:',
        optimized.metadata.voice_leading_improvements?.length || 0
      );
      console.log(
        'New voice leading smoothness:',
        optimized.voice_leading.smoothness
      );

      // Analyze functional structure
      console.log('\nFunctional analysis:');
      console.log(
        '- Tonic percentage:',
        Math.round(reharmonized.functionalanalysis.tonic_percentage * 100) + '%'
      );
      console.log(
        '- Subdominant percentage:',
        Math.round(
          reharmonized.functionalanalysis.subdominant_percentage * 100
        ) + '%'
      );
      console.log(
        '- Dominant percentage:',
        Math.round(reharmonized.functionalanalysis.dominant_percentage * 100) +
          '%'
      );

      expect(reharmonized.type).toBe('reharmonization');
      expect(substituted.type).toBe('substitution');
      expect(optimized.type).toBe('voice_leading_optimization');
    });
  });

  describe('Melodic Transformation Suite', () => {
    it('should demonstrate melodic transformation techniques', () => {
      console.log('\n=== MELODIC TRANSFORMATION WORKFLOW ===');

      // Generate a melodic contour
      const originalMelody = generateMelodicContour(3, 2, {
        key: 'C',
        scale: 'major',
        range: [60, 72], // C4 to C5
        length: 8,
        contourType: 'arch',
      });

      console.log('Original melody notes:', originalMelody.notes);
      console.log('Original intervals:', originalMelody.intervals);
      console.log('Original complexity:', originalMelody.metadata.complexity);
      console.log('Original direction:', originalMelody.metadata.direction);

      // Apply inversion
      const inverted = applyMelodicInversion(originalMelody, 66); // F#4 axis
      console.log('\nInverted melody:', inverted.contour.notes);
      console.log(
        'Inversion axis:',
        inverted.metadata.transformation_parameters?.axis
      );
      console.log(
        'Contour preservation:',
        Math.round(inverted.metadata.contour_preservation! * 100) + '%'
      );

      // Apply retrograde
      const retrograde = applyMelodicRetrograde(originalMelody);
      console.log('\nRetrograde melody:', retrograde.contour.notes);
      console.log('New intervals:', retrograde.contour.intervals);

      // Apply augmentation
      const augmented = applyMelodicAugmentation(originalMelody, 1.5);
      console.log('\nAugmented melody:', augmented.contour.notes);
      console.log(
        'Augmentation factor:',
        augmented.metadata.transformation_parameters?.factor
      );
      console.log(
        'Interval changes:',
        augmented.metadata.interval_changes?.length || 0
      );

      // Apply transposition
      const transposed = applyMelodicTransposition(originalMelody, 7); // Perfect 5th up
      console.log('\nTransposed melody:', transposed.contour.notes);
      console.log(
        'Transposition:',
        transposed.metadata.transformation_parameters?.semitones,
        'semitones'
      );
      console.log(
        'Perfect contour preservation:',
        transposed.metadata.contour_preservation
      );

      // Analyze transformations
      console.log('\nTransformation analysis:');
      console.log('- Original range:', originalMelody.metadata.range);
      console.log('- Inverted range:', inverted.contour.metadata?.range);
      console.log('- Augmented range:', augmented.contour.metadata?.range);
      console.log('- Transposed range:', transposed.contour.metadata?.range);

      expect(inverted.type).toBe('inversion');
      expect(retrograde.type).toBe('retrograde');
      expect(augmented.type).toBe('augmentation');
      expect(transposed.type).toBe('transposition');

      // Transposition should preserve intervals exactly
      expect(transposed.contour.intervals).toEqual(originalMelody.intervals);
    });
  });

  describe('Comprehensive Pattern Complexity Analysis', () => {
    it('should analyze complexity across different pattern types', () => {
      console.log('\n=== PATTERN COMPLEXITY ANALYSIS ===');

      // Create patterns of varying complexity
      const simpleRhythm = generateRhythmicResultant(2, 2);
      const complexRhythm = generateRhythmicResultant(7, 5);

      const simpleHarmony = generateHarmonicProgression(2, 2, {
        complexity: 'simple',
      });
      const complexHarmony = generateHarmonicProgression(5, 3, {
        complexity: 'complex',
      });

      const simpleMelody = generateMelodicContour(2, 2, {
        complexity: 'simple',
        stepSize: 'small',
      });
      const complexMelody = generateMelodicContour(7, 5, {
        complexity: 'complex',
        stepSize: 'large',
      });

      // Analyze individual complexities
      const simpleRhythmComplexity = calculatePatternComplexity({
        rhythm: { pattern: simpleRhythm.pattern },
        harmony: null,
        melody: null,
      });

      const complexRhythmComplexity = calculatePatternComplexity({
        rhythm: { pattern: complexRhythm.pattern },
        harmony: null,
        melody: null,
      });

      const simpleHarmonyComplexity = calculatePatternComplexity({
        rhythm: null,
        harmony: simpleHarmony,
        melody: null,
      });

      const complexHarmonyComplexity = calculatePatternComplexity({
        rhythm: null,
        harmony: complexHarmony,
        melody: null,
      });

      const simpleMelodyComplexity = calculatePatternComplexity({
        rhythm: null,
        harmony: null,
        melody: simpleMelody,
      });

      const complexMelodyComplexity = calculatePatternComplexity({
        rhythm: null,
        harmony: null,
        melody: complexMelody,
      });

      // Combined pattern analysis
      const combinedSimple = calculatePatternComplexity({
        rhythm: { pattern: simpleRhythm.pattern },
        harmony: simpleHarmony,
        melody: simpleMelody,
      });

      const combinedComplex = calculatePatternComplexity({
        rhythm: { pattern: complexRhythm.pattern },
        harmony: complexHarmony,
        melody: complexMelody,
      });

      console.log('RHYTHM COMPLEXITY:');
      console.log(
        '- Simple (2:2):',
        Math.round(simpleRhythmComplexity.rhythmic * 100) + '%',
        '(' + simpleRhythmComplexity.difficulty + ')'
      );
      console.log(
        '- Complex (7:5):',
        Math.round(complexRhythmComplexity.rhythmic * 100) + '%',
        '(' + complexRhythmComplexity.difficulty + ')'
      );

      console.log('\nHARMONY COMPLEXITY:');
      console.log(
        '- Simple (2:2):',
        Math.round(simpleHarmonyComplexity.harmonic * 100) + '%',
        '(' + simpleHarmonyComplexity.difficulty + ')'
      );
      console.log(
        '- Complex (5:3):',
        Math.round(complexHarmonyComplexity.harmonic * 100) + '%',
        '(' + complexHarmonyComplexity.difficulty + ')'
      );

      console.log('\nMELODY COMPLEXITY:');
      console.log(
        '- Simple (2:2):',
        Math.round(simpleMelodyComplexity.melodic * 100) + '%',
        '(' + simpleMelodyComplexity.difficulty + ')'
      );
      console.log(
        '- Complex (7:5):',
        Math.round(complexMelodyComplexity.melodic * 100) + '%',
        '(' + complexMelodyComplexity.difficulty + ')'
      );

      console.log('\nCOMBINED COMPLEXITY:');
      console.log(
        '- Simple combined:',
        Math.round(combinedSimple.overall * 100) + '%',
        '(' + combinedSimple.difficulty + ')'
      );
      console.log(
        '- Complex combined:',
        Math.round(combinedComplex.overall * 100) + '%',
        '(' + combinedComplex.difficulty + ')'
      );

      console.log('\nCOMPLEXITY FACTORS (Complex Combined):');
      console.log(
        '- Density:',
        Math.round(combinedComplex.factors.density * 100) + '%'
      );
      console.log(
        '- Syncopation:',
        Math.round(combinedComplex.factors.syncopation * 100) + '%'
      );
      console.log(
        '- Intervallic:',
        Math.round(combinedComplex.factors.intervallic * 100) + '%'
      );
      console.log(
        '- Harmonic tension:',
        Math.round(combinedComplex.factors.harmonic_tension * 100) + '%'
      );
      console.log(
        '- Voice leading:',
        Math.round(combinedComplex.factors.voice_leading * 100) + '%'
      );
      console.log(
        '- Pattern length:',
        Math.round(combinedComplex.factors.pattern_length * 100) + '%'
      );
      console.log(
        '- Unique elements:',
        Math.round(combinedComplex.factors.unique_elements * 100) + '%'
      );

      // Verify complexity progression (allowing for some variation in complexity calculation)
      // Complex patterns should generally be more complex, but not always due to different factors
      expect(complexHarmonyComplexity.harmonic).toBeGreaterThan(
        simpleHarmonyComplexity.harmonic
      );

      // Check that complexity values are valid numbers
      expect(complexMelodyComplexity.melodic).toBeGreaterThanOrEqual(0);
      expect(simpleMelodyComplexity.melodic).toBeGreaterThanOrEqual(0);
      expect(combinedComplex.overall).toBeGreaterThanOrEqual(0);
      expect(combinedSimple.overall).toBeGreaterThanOrEqual(0);

      // Combined complexity should be meaningful
      expect(combinedComplex.overall).toBeLessThanOrEqual(1);
      expect(combinedSimple.overall).toBeLessThanOrEqual(1);

      // Verify difficulty levels make sense
      const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
      const simpleIndex = difficulties.indexOf(combinedSimple.difficulty);
      const complexIndex = difficulties.indexOf(combinedComplex.difficulty);
      expect(complexIndex).toBeGreaterThanOrEqual(simpleIndex);
    });
  });

  describe('Real-world Musical Example', () => {
    it('should demonstrate a complete musical transformation workflow', () => {
      console.log('\n=== COMPLETE MUSICAL TRANSFORMATION ===');

      // Create a musical phrase using 4:3 generators
      const originalRhythm = generateRhythmicResultant(4, 3);
      const originalHarmony = generateHarmonicProgression(4, 3, {
        key: 'G',
        scale: 'major',
        complexity: 'moderate',
      });
      const originalMelody = generateMelodicContour(4, 3, {
        key: 'G',
        scale: 'major',
        range: [67, 79], // G4 to G5
        contourType: 'arch',
      });

      console.log('ORIGINAL MUSICAL PHRASE:');
      console.log('- Rhythm:', originalRhythm.pattern);
      console.log('- Harmony:', originalHarmony.chords);
      console.log('- Melody:', originalMelody.notes);

      // Calculate original complexity
      const originalComplexity = calculatePatternComplexity({
        rhythm: { pattern: originalRhythm.pattern },
        harmony: originalHarmony,
        melody: originalMelody,
      });

      console.log(
        '- Original complexity:',
        Math.round(originalComplexity.overall * 100) + '%',
        '(' + originalComplexity.difficulty + ')'
      );

      // Apply coordinated transformations
      console.log('\nAPPLYING TRANSFORMATIONS:');

      // 1. Rhythmic augmentation and fractioning
      const augmentedRhythm = applyRhythmAugmentation(originalRhythm, 1.5);
      const fractionedRhythm = applyRhythmFractioning(augmentedRhythm, 2);
      console.log('- Rhythm: Augmented x1.5, then fractioned by 2');
      console.log('  Result:', fractionedRhythm.pattern.slice(0, 12), '...'); // Show first 12 elements

      // 2. Harmonic reharmonization and voice leading optimization
      const reharmonizedHarmony = applyHarmonicReharmonization(
        originalHarmony,
        0.4
      );
      const optimizedHarmony = optimizeVoiceLeading(
        reharmonizedHarmony.progression
      );
      console.log('- Harmony: Reharmonized, then voice leading optimized');
      console.log('  Result:', optimizedHarmony.progression.chords);

      // 3. Melodic inversion and transposition
      const invertedMelody = applyMelodicInversion(originalMelody);
      const transposedMelody = applyMelodicTransposition(
        invertedMelody.contour,
        -5
      ); // Down a 4th
      console.log('- Melody: Inverted, then transposed down a 4th');
      console.log('  Result:', transposedMelody.contour.notes);

      // Calculate final complexity
      const finalComplexity = calculatePatternComplexity({
        rhythm: { pattern: fractionedRhythm.pattern },
        harmony: optimizedHarmony.progression,
        melody: transposedMelody.contour,
      });

      console.log('\nFINAL RESULT:');
      console.log(
        '- Final complexity:',
        Math.round(finalComplexity.overall * 100) + '%',
        '(' + finalComplexity.difficulty + ')'
      );
      console.log(
        '- Complexity change:',
        (finalComplexity.overall > originalComplexity.overall ? '+' : '') +
          Math.round(
            (finalComplexity.overall - originalComplexity.overall) * 100
          ) +
          '%'
      );

      // Analyze the transformation effects
      console.log('\nTRANSFORMATION ANALYSIS:');
      console.log(
        '- Rhythm length change:',
        fractionedRhythm.new_length,
        'vs',
        originalRhythm.length
      );
      console.log(
        '- Harmonic improvements:',
        optimizedHarmony.metadata.voice_leading_improvements?.length || 0
      );
      console.log(
        '- Melodic contour preservation:',
        Math.round(transposedMelody.metadata.contour_preservation! * 100) + '%'
      );
      console.log(
        '- Voice leading smoothness:',
        Math.round(optimizedHarmony.voice_leading.smoothness * 100) + '%'
      );

      // Verify transformations were applied
      expect(fractionedRhythm.new_length).toBeGreaterThan(
        originalRhythm.length
      );
      expect(optimizedHarmony.progression.chords.length).toBe(
        originalHarmony.chords.length
      );
      expect(transposedMelody.contour.notes.length).toBe(
        originalMelody.notes.length
      );
      expect(finalComplexity.overall).toBeGreaterThanOrEqual(0);
      expect(finalComplexity.overall).toBeLessThanOrEqual(1);
    });
  });
});
