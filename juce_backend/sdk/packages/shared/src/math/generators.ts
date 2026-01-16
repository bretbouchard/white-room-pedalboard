/**
 * Generator utilities for Schillinger mathematical operations
 */

import { ValidationError as _ValidationError } from '../errors';

export interface GeneratorPair {
  a: number;
  b: number;
}

export interface GeneratorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Common generator pairs used in Schillinger composition
 */
export const COMMON_GENERATOR_PAIRS: GeneratorPair[] = [
  // Simple ratios
  { a: 2, b: 1 },
  { a: 3, b: 1 },
  { a: 4, b: 1 },
  { a: 5, b: 1 },
  { a: 3, b: 2 },
  { a: 4, b: 3 },
  { a: 5, b: 3 },
  { a: 5, b: 4 },

  // Complex ratios
  { a: 6, b: 5 },
  { a: 7, b: 5 },
  { a: 7, b: 6 },
  { a: 8, b: 5 },
  { a: 8, b: 7 },
  { a: 9, b: 7 },
  { a: 9, b: 8 },
  { a: 11, b: 9 },

  // Extended ratios for complex patterns
  { a: 12, b: 7 },
  { a: 13, b: 8 },
  { a: 15, b: 11 },
  { a: 16, b: 9 },
  { a: 17, b: 12 },
  { a: 19, b: 13 },
  { a: 21, b: 16 },
  { a: 23, b: 17 },
];

/**
 * Maximum recommended generator values for practical use
 */
export const MAX_GENERATOR_VALUE = 32;
export const MIN_GENERATOR_VALUE = 1;

/**
 * Validate generator pair for mathematical operations
 */
export function validateGenerators(
  a: number,
  b: number
): GeneratorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Immediate rejection for NaN or Infinity
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    errors.push('Generators must be finite numbers (not NaN or Infinity)');
    return { valid: false, errors, warnings };
  }

  // Basic validation
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    errors.push('Generators must be integers');
  }

  if (a < MIN_GENERATOR_VALUE || b < MIN_GENERATOR_VALUE) {
    errors.push(`Generators must be at least ${MIN_GENERATOR_VALUE}`);
  }

  if (a > MAX_GENERATOR_VALUE || b > MAX_GENERATOR_VALUE) {
    errors.push(
      `Generators should not exceed ${MAX_GENERATOR_VALUE} for practical use`
    );
  }

  // Mathematical validity
  if (a === b) {
    warnings.push('Equal generators will produce simple repetitive patterns');
  }

  // Practical considerations
  const gcd = calculateGCD(a, b);
  if (gcd > 1) {
    warnings.push(
      `Generators have common factor ${gcd}, consider using ${a / gcd}:${b / gcd} for simpler equivalent pattern`
    );
  }

  const lcm = calculateLCM(a, b);
  if (lcm > 64) {
    warnings.push(
      `Pattern length will be ${lcm} beats, which may be impractical for most musical contexts`
    );
  }

  // Complexity assessment
  const ratio = Math.max(a, b) / Math.min(a, b);
  if (ratio > 3) {
    warnings.push(
      'High ratio between generators may create very uneven patterns'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate greatest common divisor
 */
export function calculateGCD(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

/**
 * Calculate least common multiple
 */
export function calculateLCM(a: number, b: number): number {
  return Math.abs(a * b) / calculateGCD(a, b);
}

/**
 * Find optimal generator pairs for a target pattern length
 */
export function findGeneratorsForLength(
  targetLength: number,
  maxGenerator: number = 16
): GeneratorPair[] {
  const pairs: GeneratorPair[] = [];

  for (let a = MIN_GENERATOR_VALUE; a <= maxGenerator; a++) {
    for (let b = MIN_GENERATOR_VALUE; b < a; b++) {
      if (calculateLCM(a, b) === targetLength) {
        pairs.push({ a, b });
      }
    }
  }

  return pairs.sort((x, y) => {
    // Sort by simplicity (lower sum of generators first)
    const sumX = x.a + x.b;
    const sumY = y.a + y.b;
    return sumX - sumY;
  });
}

/**
 * Get recommended generator pairs based on musical context
 */
export function getRecommendedGenerators(context: {
  complexity?: 'simple' | 'moderate' | 'complex';
  maxLength?: number;
  style?: 'classical' | 'jazz' | 'contemporary' | 'experimental';
}): GeneratorPair[] {
  const {
    complexity = 'moderate',
    maxLength = 32,
    style = 'contemporary',
  } = context;

  let candidates = COMMON_GENERATOR_PAIRS.filter(pair => {
    const lcm = calculateLCM(pair.a, pair.b);
    return lcm <= maxLength;
  });

  // Filter by complexity
  switch (complexity) {
    case 'simple':
      candidates = candidates.filter(pair => {
        const ratio = Math.max(pair.a, pair.b) / Math.min(pair.a, pair.b);
        return ratio <= 2 && calculateLCM(pair.a, pair.b) <= 12;
      });
      break;

    case 'complex':
      candidates = candidates.filter(pair => {
        const ratio = Math.max(pair.a, pair.b) / Math.min(pair.a, pair.b);
        return ratio >= 1.5 && calculateLCM(pair.a, pair.b) >= 8;
      });
      break;

    case 'moderate':
    default:
      candidates = candidates.filter(pair => {
        return (
          calculateLCM(pair.a, pair.b) >= 6 &&
          calculateLCM(pair.a, pair.b) <= 24
        );
      });
      break;
  }

  // Filter by style
  switch (style) {
    case 'classical':
      candidates = candidates.filter(pair => {
        const ratio = Math.max(pair.a, pair.b) / Math.min(pair.a, pair.b);
        return ratio <= 2.5; // More conservative ratios
      });
      break;

    case 'jazz':
      candidates = candidates.filter(pair => {
        const lcm = calculateLCM(pair.a, pair.b);
        return lcm >= 8 && lcm <= 16; // Good for swing and syncopation
      });
      break;

    case 'experimental':
      // No additional filtering - allow all complex patterns
      break;

    case 'contemporary':
    default:
      candidates = candidates.filter(pair => {
        const lcm = calculateLCM(pair.a, pair.b);
        return lcm >= 4 && lcm <= 20;
      });
      break;
  }

  return candidates.slice(0, 10); // Return top 10 recommendations
}

/**
 * Calculate pattern complexity score for generator pair
 */
export function calculateGeneratorComplexity(a: number, b: number): number {
  const validation = validateGenerators(a, b);
  if (!validation.valid) {
    throw new _ValidationError('generators', { a, b }, 'valid generator pair');
  }

  const lcm = calculateLCM(a, b);
  const gcd = calculateGCD(a, b);
  const ratio = Math.max(a, b) / Math.min(a, b);

  // Complexity factors
  const lengthFactor = Math.min(lcm / 16, 1); // Normalize to 16-beat patterns
  const ratioFactor = Math.min((ratio - 1) / 2, 1); // Normalize ratio complexity
  const gcdFactor = 1 - (gcd - 1) / Math.min(a, b); // Lower GCD = higher complexity

  return (lengthFactor + ratioFactor + gcdFactor) / 3;
}

/**
 * Generate all possible generator combinations up to a maximum value
 */
export function generateAllCombinations(
  maxValue: number = 16
): GeneratorPair[] {
  const combinations: GeneratorPair[] = [];

  for (let a = MIN_GENERATOR_VALUE; a <= maxValue; a++) {
    for (let b = MIN_GENERATOR_VALUE; b <= a; b++) {
      const validation = validateGenerators(a, b);
      if (validation.valid) {
        combinations.push({ a, b });
      }
    }
  }

  return combinations.sort((x, y) => {
    const complexityX = calculateGeneratorComplexity(x.a, x.b);
    const complexityY = calculateGeneratorComplexity(y.a, y.b);
    return complexityX - complexityY;
  });
}

/**
 * Find the closest generator pair to a target ratio
 */
export function findClosestRatio(
  targetRatio: number,
  maxGenerator: number = 16
): GeneratorPair[] {
  const combinations = generateAllCombinations(maxGenerator);

  return combinations
    .map(pair => ({
      pair,
      ratio: Math.max(pair.a, pair.b) / Math.min(pair.a, pair.b),
      difference: Math.abs(
        Math.max(pair.a, pair.b) / Math.min(pair.a, pair.b) - targetRatio
      ),
    }))
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 5)
    .map(item => item.pair);
}
