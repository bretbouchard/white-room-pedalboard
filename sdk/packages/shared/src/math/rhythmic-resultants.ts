/**
 * Rhythmic resultant generation algorithms for Schillinger composition
 */

import { ValidationError as _ValidationError } from "../errors";
import { validateGenerators, calculateLCM, GeneratorPair } from "./generators";

export interface RhythmicResultant {
  pattern: number[];
  generators: GeneratorPair;
  length: number;
  complexity: number;
  metadata: {
    accents: number[];
    strongBeats: number[];
    syncopation: number;
    density: number;
  };
}

export interface ResultantOptions {
  accentStrength?: number;
  normalStrength?: number;
  restValue?: number;
  includeMetadata?: boolean;
}

/**
 * Generate rhythmic resultant from two generators
 */
export function generateRhythmicResultant(
  a: number,
  b: number,
  options: ResultantOptions = {},
): RhythmicResultant {
  // Validate generators
  const validation = validateGenerators(a, b);
  if (!validation.valid) {
    throw new _ValidationError("generators", { a, b }, "valid generator pair", {
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }

  const {
    accentStrength = 3,
    normalStrength = 1,
    restValue = 0,
    includeMetadata = true,
  } = options;

  const lcm = calculateLCM(a, b);
  const pattern: number[] = [];
  const accents: number[] = [];
  const strongBeats: number[] = [];

  // Generate the resultant pattern
  for (let i = 0; i < lcm; i++) {
    const hitA = i % a === 0;
    const hitB = i % b === 0;

    if (hitA && hitB) {
      // Both generators hit - create accent
      pattern.push(accentStrength);
      accents.push(i);
      strongBeats.push(i);
    } else if (hitA || hitB) {
      // One generator hits - normal beat
      pattern.push(normalStrength);
      if (hitA && i % (a * 2) === 0) strongBeats.push(i);
      if (hitB && i % (b * 2) === 0) strongBeats.push(i);
    } else {
      // Neither hits - rest or continuation
      pattern.push(restValue);
    }
  }

  // Calculate metadata
  let metadata = {
    accents: [] as number[],
    strongBeats: [] as number[],
    syncopation: 0,
    density: 0,
  };

  if (includeMetadata) {
    metadata = {
      accents,
      strongBeats,
      syncopation: calculateSyncopation(pattern, { a, b }),
      density: calculateDensity(pattern),
    };
  }

  return {
    pattern,
    generators: { a, b },
    length: lcm,
    complexity: calculatePatternComplexity(pattern),
    metadata,
  };
}

/**
 * Generate multiple resultants for comparison
 */
export function generateMultipleResultants(
  generators: GeneratorPair[],
  options: ResultantOptions = {},
): RhythmicResultant[] {
  return generators.map(({ a, b }) => generateRhythmicResultant(a, b, options));
}

/**
 * Generate resultant with custom accent pattern
 */
export function generateCustomAccentResultant(
  a: number,
  b: number,
  accentPattern: number[],
  options: ResultantOptions = {},
): RhythmicResultant {
  const baseResultant = generateRhythmicResultant(a, b, options);

  if (accentPattern.length !== baseResultant.length) {
    throw new _ValidationError(
      "accentPattern",
      accentPattern,
      `array of length ${baseResultant.length}`,
      {
        expectedLength: baseResultant.length,
        actualLength: accentPattern.length,
      },
    );
  }

  // Apply custom accent pattern
  const customPattern = baseResultant.pattern.map((value, index) => {
    if (value > 0) {
      return accentPattern[index] || value;
    }
    return value;
  });

  return {
    ...baseResultant,
    pattern: customPattern,
    complexity: calculatePatternComplexity(customPattern),
  };
}

/**
 * Generate polyrhythmic resultant (multiple generator pairs combined)
 */
export function generatePolyrhythmicResultant(
  generatorPairs: GeneratorPair[],
  options: ResultantOptions = {},
): RhythmicResultant {
  if (generatorPairs.length < 2) {
    throw new _ValidationError(
      "generatorPairs",
      generatorPairs,
      "at least 2 generator pairs",
      { minLength: 2, actualLength: generatorPairs.length },
    );
  }

  // Generate individual resultants
  const resultants = generatorPairs.map(({ a, b }) =>
    generateRhythmicResultant(a, b, { ...options, includeMetadata: true }),
  );

  // Find common length (LCM of all pattern lengths)
  const commonLength = resultants.reduce(
    (lcm, resultant) => calculateLCM(lcm, resultant.length),
    1,
  );

  // Combine patterns
  const combinedPattern: number[] = new Array(commonLength).fill(0);
  const allAccents: number[] = [];
  const allStrongBeats: number[] = [];

  resultants.forEach((resultant) => {
    const repetitions = commonLength / resultant.length;

    for (let rep = 0; rep < repetitions; rep++) {
      const offset = rep * resultant.length;

      resultant.pattern.forEach((value, index) => {
        const position = offset + index;
        if (value > 0) {
          combinedPattern[position] = Math.max(
            combinedPattern[position],
            value,
          );
        }
      });

      // Collect accents and strong beats
      resultant.metadata.accents.forEach((accent) => {
        const position = offset + accent;
        if (!allAccents.includes(position)) {
          allAccents.push(position);
        }
      });

      resultant.metadata.strongBeats.forEach((beat) => {
        const position = offset + beat;
        if (!allStrongBeats.includes(position)) {
          allStrongBeats.push(position);
        }
      });
    }
  });

  return {
    pattern: combinedPattern,
    generators: generatorPairs[0], // Primary generator pair
    length: commonLength,
    complexity: calculatePatternComplexity(combinedPattern),
    metadata: {
      accents: allAccents.sort((a, b) => a - b),
      strongBeats: allStrongBeats.sort((a, b) => a - b),
      syncopation: calculateSyncopation(combinedPattern, generatorPairs[0]),
      density: calculateDensity(combinedPattern),
    },
  };
}

/**
 * Generate resultant with swing feel
 */
export function generateSwingResultant(
  a: number,
  b: number,
  swingRatio: number = 0.67,
  options: ResultantOptions = {},
): RhythmicResultant {
  const baseResultant = generateRhythmicResultant(a, b, options);

  if (swingRatio < 0.5 || swingRatio > 1) {
    throw new _ValidationError(
      "swingRatio",
      swingRatio,
      "number between 0.5 and 1",
      { min: 0.5, max: 1 },
    );
  }

  // Apply swing timing (this is a simplified representation)
  // In practice, this would affect timing rather than pattern values
  const swingPattern = baseResultant.pattern.map((value, index) => {
    if (value > 0 && index % 2 === 1) {
      // Slightly emphasize off-beats for swing feel
      return Math.min(value * 1.2, options.accentStrength || 3);
    }
    return value;
  });

  return {
    ...baseResultant,
    pattern: swingPattern,
    complexity: calculatePatternComplexity(swingPattern),
    metadata: {
      ...baseResultant.metadata,
      syncopation: baseResultant.metadata.syncopation * 1.3, // Swing increases syncopation feel
    },
  };
}

/**
 * Calculate syncopation level in a rhythmic pattern
 */
function calculateSyncopation(
  pattern: number[],
  generators: GeneratorPair,
): number {
  const { a, b } = generators;
  const strongPositions = new Set<number>();

  // Define strong positions based on generators
  for (let i = 0; i < pattern.length; i += a) {
    strongPositions.add(i);
  }
  for (let i = 0; i < pattern.length; i += b) {
    strongPositions.add(i);
  }

  let syncopatedBeats = 0;
  let totalBeats = 0;

  pattern.forEach((value, index) => {
    if (value > 0) {
      totalBeats++;
      if (!strongPositions.has(index)) {
        syncopatedBeats++;
      }
    }
  });

  return totalBeats > 0 ? syncopatedBeats / totalBeats : 0;
}

/**
 * Calculate density (ratio of non-rest beats to total beats)
 */
function calculateDensity(pattern: number[]): number {
  const nonRestBeats = pattern.filter((value) => value > 0).length;
  return pattern.length > 0 ? nonRestBeats / pattern.length : 0;
}

/**
 * Calculate pattern complexity based on various factors
 */
function calculatePatternComplexity(pattern: number[]): number {
  if (pattern.length === 0) return 0;

  // Unique values count
  const uniqueCount = new Set(pattern).size;

  // Transition count
  let transitions = 0;
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i] !== pattern[i - 1]) {
      transitions++;
    }
  }

  // Accent count
  const accentCount = pattern.filter((value) => value > 2).length;

  // Length factor (logarithmic, strong weight)
  const lengthFactor = Math.log2(pattern.length + 1) * 2;

  // Direct sum: longer and more varied patterns are always higher
  return transitions + uniqueCount + accentCount + lengthFactor;
}

/**
 * Find optimal resultant for target characteristics
 */
export function findOptimalResultant(
  targetCharacteristics: {
    length?: number;
    complexity?: number;
    density?: number;
    syncopation?: number;
  },
  maxGenerator: number = 16,
): RhythmicResultant[] {
  const candidates: RhythmicResultant[] = [];

  for (let a = 1; a <= maxGenerator; a++) {
    for (let b = 1; b < a; b++) {
      try {
        const resultant = generateRhythmicResultant(a, b);
        candidates.push(resultant);
      } catch (error) {
        // Skip invalid generator pairs
        continue;
      }
    }
  }

  // Score candidates based on how well they match target characteristics
  const scoredCandidates = candidates.map((resultant) => {
    let score = 0;
    let factors = 0;

    if (targetCharacteristics.length !== undefined) {
      score +=
        1 -
        Math.abs(resultant.length - targetCharacteristics.length) /
          targetCharacteristics.length;
      factors++;
    }

    if (targetCharacteristics.complexity !== undefined) {
      score +=
        1 - Math.abs(resultant.complexity - targetCharacteristics.complexity);
      factors++;
    }

    if (targetCharacteristics.density !== undefined) {
      score +=
        1 -
        Math.abs(resultant.metadata.density - targetCharacteristics.density);
      factors++;
    }

    if (targetCharacteristics.syncopation !== undefined) {
      score +=
        1 -
        Math.abs(
          resultant.metadata.syncopation - targetCharacteristics.syncopation,
        );
      factors++;
    }

    return {
      resultant,
      score: factors > 0 ? score / factors : 0,
    };
  });

  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.resultant);
}
