/**
 * Reverse analysis for complete compositions
 */

import { Composition } from '@schillinger-sdk/shared';

export interface CompositionInference {
  structure: {
    form: string;
    sections: Array<{
      type: string;
      start: number;
      end: number;
      characteristics: string[];
    }>;
    keyStructure: {
      primaryKey: string;
      modulations: Array<{
        position: number;
        fromKey: string;
        toKey: string;
      }>;
    };
  };
  confidence: number;
  analysis: {
    formalCoherence: number;
    harmonicUnity: number;
    rhythmicConsistency: number;
    melodicDevelopment: number;
  };
}

export interface CompositionEncoding {
  bestMatch: CompositionInference;
  alternatives: CompositionInference[];
  confidence: number;
}

/**
 * Infer compositional structure from complete composition
 */
export function inferCompositionStructure(
  composition: Composition
  // options removed
): CompositionInference[] {
  // Validate composition
  if (!composition.sections || composition.sections.length === 0) {
    throw new Error('Invalid composition: no sections found');
  }

  // Analyze form
  const form = analyzeForm(composition);

  // Analyze key structure
  const keyStructure = analyzeKeyStructure(composition);

  // Analyze sections
  const sections = composition.sections.map(section => ({
    type: section.type,
    start: section.position,
    end: section.position + section.length,
    characteristics: analyzeSectionCharacteristics(section),
  }));

  const inference: CompositionInference = {
    structure: {
      form,
      sections,
      keyStructure,
    },
    confidence: 0.7,
    analysis: {
      formalCoherence: calculateFormalCoherence(composition),
      harmonicUnity: calculateHarmonicUnity(composition),
      rhythmicConsistency: calculateRhythmicConsistency(composition),
      melodicDevelopment: calculateMelodicDevelopment(composition),
    },
  };

  return [inference];
}

/**
 * Encode composition into Schillinger compositional parameters
 */
export function encodeComposition(
  composition: Composition,
  options: { includeAlternatives?: boolean } = {}
): CompositionEncoding {
  const inferences = inferCompositionStructure(composition);

  return {
    bestMatch: inferences[0]!,
    alternatives: options.includeAlternatives ? inferences.slice(1) : [],
    confidence: inferences[0]?.confidence || 0,
  };
}

// Helper functions

function analyzeForm(composition: Composition): string {
  const sectionTypes = composition.sections.map(s => s.type);
  const typeSequence = sectionTypes.join('-');

  // Simple form detection
  if (typeSequence.includes('verse') && typeSequence.includes('chorus')) {
    return 'verse-chorus';
  } else if (typeSequence.includes('intro') && typeSequence.includes('outro')) {
    return 'through-composed';
  } else if (sectionTypes.length <= 3) {
    return 'simple';
  } else {
    return 'complex';
  }
}

function analyzeKeyStructure(composition: Composition): {
  primaryKey: string;
  modulations: Array<{
    position: number;
    fromKey: string;
    toKey: string;
  }>;
} {
  const primaryKey = composition.key;
  const modulations: Array<{
    position: number;
    fromKey: string;
    toKey: string;
  }> = [];

  // Simplified modulation detection
  let currentKey = primaryKey;
  for (let i = 0; i < composition.sections.length; i++) {
    const section = composition.sections[i]!;
    if (section.harmony.key !== currentKey) {
      modulations.push({
        position: section.position,
        fromKey: currentKey,
        toKey: section.harmony.key,
      });
      currentKey = section.harmony.key;
    }
  }

  return {
    primaryKey,
    modulations,
  };
}

function analyzeSectionCharacteristics(section: any): string[] {
  const characteristics: string[] = [];

  // Analyze rhythm
  const rhythmDensity =
    section.rhythm.durations.filter((d: number) => d > 0).length /
    section.rhythm.durations.length;
  if (rhythmDensity > 0.7) characteristics.push('rhythmically-active');
  if (rhythmDensity < 0.3) characteristics.push('sparse');

  // Analyze harmony
  const uniqueChords = new Set(section.harmony.chords).size;
  if (uniqueChords > section.harmony.chords.length * 0.8)
    characteristics.push('harmonically-varied');
  if (uniqueChords < section.harmony.chords.length * 0.3)
    characteristics.push('harmonically-static');

  // Analyze length
  if (section.length > 32) characteristics.push('extended');
  if (section.length < 8) characteristics.push('brief');

  return characteristics;
}

function calculateFormalCoherence(composition: Composition): number {
  // Simplified coherence calculation based on section balance
  const sectionLengths = composition.sections.map(s => s.length);
  const avgLength =
    sectionLengths.reduce((sum, len) => sum + len, 0) / sectionLengths.length;

  const variance =
    sectionLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
    sectionLengths.length;
  const standardDeviation = Math.sqrt(variance);

  // Lower variance = higher coherence
  return Math.max(0, 1 - standardDeviation / avgLength);
}

function calculateHarmonicUnity(composition: Composition): number {
  // Calculate how often the primary key appears
  const primaryKey = composition.key;
  const sectionsInPrimaryKey = composition.sections.filter(
    s => s.harmony.key === primaryKey
  ).length;

  return sectionsInPrimaryKey / composition.sections.length;
}

function calculateRhythmicConsistency(composition: Composition): number {
  // Calculate similarity between rhythmic patterns across sections
  if (composition.sections.length < 2) return 1.0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < composition.sections.length - 1; i++) {
    for (let j = i + 1; j < composition.sections.length; j++) {
      const rhythm1 = composition.sections[i]!.rhythm?.durations;
      const rhythm2 = composition.sections[j]!.rhythm?.durations;

      if (rhythm1 && rhythm2) {
        const similarity = calculateRhythmSimilarity(rhythm1, rhythm2);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

function calculateMelodicDevelopment(composition: Composition): number {
  // Simplified melodic development analysis
  // In a real implementation, this would analyze motivic development,
  // melodic transformation, and thematic relationships

  const sectionsWithMelody = composition.sections.filter(s => s.melody).length;
  return sectionsWithMelody / composition.sections.length;
}

function calculateRhythmSimilarity(
  rhythm1: number[],
  rhythm2: number[]
): number {
  const maxLength = Math.max(rhythm1.length, rhythm2.length);
  const minLength = Math.min(rhythm1.length, rhythm2.length);

  let matches = 0;
  for (let i = 0; i < minLength; i++) {
    if (rhythm1[i] === rhythm2[i]) {
      matches++;
    }
  }

  return matches / maxLength;
}
