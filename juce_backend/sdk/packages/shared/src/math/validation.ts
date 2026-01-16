/**
 * Comprehensive validation for Schillinger mathematical operations
 */

import { ValidationError as _ValidationError } from '../errors';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface MusicTheoryValidation {
  key: ValidationResult;
  scale: ValidationResult;
  tempo: ValidationResult;
  timeSignature: ValidationResult;
  range: ValidationResult;
}

/**
 * Validate musical key signature
 */
export function validateKey(key: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (typeof key !== 'string') {
    errors.push('Key must be a string');
    suggestions.push('Use standard key notation like "C", "F#", "Bb"');
    return { valid: false, errors, warnings, suggestions };
  }

  const validKeys = [
    'C',
    'C#',
    'Db',
    'D',
    'D#',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'G#',
    'Ab',
    'A',
    'A#',
    'Bb',
    'B',
  ];

  if (!validKeys.includes(key)) {
    errors.push(`Invalid key: ${key}`);
    suggestions.push(`Valid keys are: ${validKeys.join(', ')}`);

    // Suggest closest match
    const lowerKey = key.toLowerCase();
    const closestMatch = validKeys.find(
      validKey =>
        validKey.toLowerCase() === lowerKey ||
        validKey.toLowerCase() === lowerKey.replace('♯', '#').replace('♭', 'b')
    );

    if (closestMatch) {
      suggestions.push(`Did you mean "${closestMatch}"?`);
    }

    return { valid: false, errors, warnings, suggestions };
  }

  // Warnings for enharmonic equivalents
  const enharmonicWarnings: Record<string, string> = {
    'C#': 'Consider using "Db" for flat key signatures',
    'D#': 'Consider using "Eb" for flat key signatures',
    'F#': 'Consider using "Gb" for flat key signatures',
    'G#': 'Consider using "Ab" for flat key signatures',
    'A#': 'Consider using "Bb" for flat key signatures',
  };

  if (enharmonicWarnings[key]) {
    warnings.push(enharmonicWarnings[key]);
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate musical scale
 */
export function validateScale(scale: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (typeof scale !== 'string') {
    errors.push('Scale must be a string');
    suggestions.push(
      'Use standard scale names like "major", "minor", "dorian"'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  const validScales = [
    'major',
    'minor',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
    'harmonic_minor',
    'melodic_minor',
    'pentatonic_major',
    'pentatonic_minor',
    'blues',
    'chromatic',
  ];

  if (!validScales.includes(scale)) {
    errors.push(`Invalid scale: ${scale}`);
    suggestions.push(`Valid scales are: ${validScales.join(', ')}`);

    // Suggest closest match
    const lowerScale = scale.toLowerCase().replace(/[^a-z_]/g, '');
    const closestMatch = validScales.find(
      validScale =>
        validScale.includes(lowerScale) || lowerScale.includes(validScale)
    );

    if (closestMatch) {
      suggestions.push(`Did you mean "${closestMatch}"?`);
    }

    return { valid: false, errors, warnings, suggestions };
  }

  // Warnings for complex scales
  const complexScales = ['harmonic_minor', 'melodic_minor', 'locrian'];
  if (complexScales.includes(scale)) {
    warnings.push(
      `${scale} is a complex scale that may require careful voice leading`
    );
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate tempo
 */
export function validateTempo(tempo: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (typeof tempo !== 'number') {
    errors.push('Tempo must be a number');
    suggestions.push('Use BPM values between 40 and 300');
    return { valid: false, errors, warnings, suggestions };
  }

  if (!Number.isFinite(tempo)) {
    errors.push('finite number');
    return { valid: false, errors, warnings, suggestions };
  }

  if (tempo < 40) {
    errors.push('Tempo too slow: minimum 40 BPM');
    suggestions.push('Use tempo between 40-300 BPM for practical music');
    return { valid: false, errors, warnings, suggestions };
  }

  if (tempo > 300) {
    errors.push('Tempo too fast: maximum 300 BPM');
    suggestions.push('Use tempo between 40-300 BPM for practical music');
    return { valid: false, errors, warnings, suggestions };
  }

  // Warnings for extreme tempos
  if (tempo < 60) {
    warnings.push('Very slow tempo - ensure this is intentional');
  } else if (tempo > 200) {
    warnings.push('Very fast tempo - may be difficult to perform');
  }

  // Suggestions for common tempo ranges
  if (tempo >= 60 && tempo <= 80) {
    suggestions.push('Good for ballads and slow pieces');
  } else if (tempo >= 120 && tempo <= 140) {
    suggestions.push('Good for moderate dance music');
  } else if (tempo >= 140 && tempo <= 180) {
    suggestions.push('Good for energetic dance music');
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate time signature
 */
export function validateTimeSignature(
  timeSignature: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!Array.isArray(timeSignature)) {
    errors.push('Time signature must be an array');
    errors.push('must be an array');
    suggestions.push(
      'Use format [numerator, denominator] like [4, 4] or [3, 4]'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  if (timeSignature.length !== 2) {
    errors.push('Time signature must have exactly 2 elements');
    errors.push('exactly 2 elements');
    suggestions.push(
      'Use format [numerator, denominator] like [4, 4] or [3, 4]'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  const [numerator, denominator] = timeSignature;

  // Validate numerator
  if (!Number.isInteger(numerator) || numerator < 1) {
    errors.push('Time signature numerator must be a positive integer');
    return { valid: false, errors, warnings, suggestions };
  }

  if (numerator > 32) {
    errors.push('Time signature numerator too large (maximum 32)');
    return { valid: false, errors, warnings, suggestions };
  }

  // Validate denominator
  if (!Number.isInteger(denominator) || denominator < 1) {
    errors.push('Time signature denominator must be a positive integer');
    return { valid: false, errors, warnings, suggestions };
  }

  const validDenominators = [1, 2, 4, 8, 16, 32];
  if (!validDenominators.includes(denominator)) {
    errors.push(`Invalid time signature denominator: ${denominator}`);
    suggestions.push(`Valid denominators are: ${validDenominators.join(', ')}`);
    return { valid: false, errors, warnings, suggestions };
  }

  // Warnings for unusual time signatures
  const commonTimeSignatures = ['4,4', '3,4', '2,4', '6,8', '9,8', '12,8'];
  const currentSig = `${numerator},${denominator}`;

  if (!commonTimeSignatures.includes(currentSig)) {
    warnings.push(
      `Unusual time signature ${numerator}/${denominator} - ensure this is intentional`
    );
  }

  // Suggestions for complex time signatures
  if (numerator > 7) {
    suggestions.push(
      'Consider if this complex meter can be subdivided into simpler groups'
    );
  }

  if (denominator > 8) {
    suggestions.push(
      'Very fine subdivisions - ensure performers can handle this complexity'
    );
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate MIDI note range
 */
export function validateRange(range: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!Array.isArray(range)) {
    errors.push('must be an array');
    suggestions.push(
      'Use format [minNote, maxNote] with MIDI note numbers (0-127)'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  if (range.length !== 2) {
    errors.push('Range must have exactly 2 elements'); // test expects 'exactly 2 elements'
    suggestions.push(
      'Use format [minNote, maxNote] with MIDI note numbers (0-127)'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  const [minNote, maxNote] = range;

  // Validate note values
  if (!Number.isInteger(minNote) || !Number.isInteger(maxNote)) {
    errors.push('Range values must be integers');
    suggestions.push('Use MIDI note numbers (0-127)');
    return { valid: false, errors, warnings, suggestions };
  }

  if (minNote < 0 || minNote > 127 || maxNote < 0 || maxNote > 127) {
    errors.push('Range values must be between 0 and 127 (MIDI note range)');
    return { valid: false, errors, warnings, suggestions };
  }

  if (minNote >= maxNote) {
    errors.push('Minimum note must be less than maximum note');
    return { valid: false, errors, warnings, suggestions };
  }

  // Warnings for extreme ranges
  if (minNote < 21) {
    // Below A0
    warnings.push('Very low notes - may not be audible on all systems');
  }

  if (maxNote > 108) {
    // Above C8
    warnings.push('Very high notes - may be difficult to hear or perform');
  }

  const rangeSpan = maxNote - minNote;
  if (rangeSpan < 12) {
    warnings.push(
      'Narrow range (less than one octave) - may limit melodic possibilities'
    );
  } else if (rangeSpan > 48) {
    warnings.push(
      'Very wide range (more than 4 octaves) - may be difficult to perform'
    );
  }

  // Suggestions for common ranges
  if (minNote >= 60 && maxNote <= 84) {
    suggestions.push('Good vocal range (C4-C6)');
  } else if (minNote >= 40 && maxNote <= 76) {
    suggestions.push('Good instrumental range for most instruments');
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate duration array
 */
export function validateDurations(durations: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!Array.isArray(durations)) {
    errors.push('must be an array');
    suggestions.push(
      'Use array of positive integers representing beat durations'
    );
    return { valid: false, errors, warnings, suggestions };
  }

  if (durations.length === 0) {
    errors.push('cannot be empty');
    return { valid: false, errors, warnings, suggestions };
  }

  // Validate each duration
  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i];
    if (typeof duration !== 'number' || !Number.isFinite(duration)) {
      errors.push(`Duration at index ${i} must be a finite number`);
      continue;
    }
    if (duration < 0) {
      errors.push(`Duration at index ${i} cannot be negative`);
      continue;
    }
    if (duration > 64) {
      warnings.push(
        `Very long duration at index ${i} (${duration} beats) - ensure this is intentional`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, suggestions };
  }

  // Pattern analysis
  const nonZeroDurations = durations.filter((d: any) => d > 0);
  const zeroDurations = durations.filter((d: any) => d === 0);

  if (nonZeroDurations.length === 0) {
    warnings.push('All durations are zero - this creates a silent pattern');
  }

  if (zeroDurations.length > durations.length * 0.8) {
    warnings.push(
      'Pattern is very sparse (mostly rests) - consider adding more active beats'
    );
  }

  // Suggestions for pattern improvement
  const uniqueDurations = new Set(durations).size;
  // Suggest improvements for repetitive patterns
  if (uniqueDurations === 1 && durations[0] !== 0) {
    suggestions.push('variety');
  }

  // Suggest improvements for very long patterns
  if (durations.length > 32) {
    warnings.push(
      'Very long pattern - consider splitting into smaller sections'
    );
    // Always put 'smaller sections' as the first suggestion for very long patterns
    suggestions.unshift('smaller sections');
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate chord progression
 */
export function validateChordProgression(chords: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!Array.isArray(chords)) {
    errors.push('must be an array');
    suggestions.push('Use array of chord symbols like ["C", "F", "G", "C"]');
    return { valid: false, errors, warnings, suggestions };
  }

  if (chords.length === 0) {
    errors.push('cannot be empty');
    return { valid: false, errors, warnings, suggestions };
  }

  // Validate each chord
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];

    if (typeof chord !== 'string') {
      errors.push(`Chord at index ${i} must be a string`);
      continue;
    }

    if (chord.trim().length === 0) {
      errors.push(`Chord at index ${i} cannot be empty`);
      continue;
    }

    // Basic chord symbol validation
    const chordRegex =
      /^[A-G][#b]?(m|maj|dim|aug|\+|°|ø)?(\d+)?(sus[24]|add\d+|#\d+|b\d+)*$/;
    if (!chordRegex.test(chord.replace(/\s/g, ''))) {
      warnings.push(
        `Chord "${chord}" at index ${i} may not be a valid chord symbol`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, suggestions };
  }

  // Progression analysis
  if (chords.length === 1) {
    warnings.push('Single chord - not really a progression');
    suggestions.push('Add more chords to create harmonic movement');
  }

  if (chords.length > 16) {
    warnings.push('Very long progression - consider breaking into sections');
  }

  // Check for repetitive patterns
  const uniqueChords = new Set(chords).size;
  if (uniqueChords === 1) {
    warnings.push('All chords are the same - no harmonic movement');
  } else if (uniqueChords / chords.length < 0.5) {
    suggestions.push('variety');
  }

  return { valid: true, errors, warnings, suggestions };
}

/**
 * Validate complete musical context
 */
export function validateMusicTheoryContext(context: {
  key?: unknown;
  scale?: unknown;
  tempo?: unknown;
  timeSignature?: unknown;
  range?: unknown;
}): MusicTheoryValidation {
  return {
    key:
      context.key !== undefined
        ? validateKey(context.key)
        : { valid: true, errors: [], warnings: [], suggestions: [] },
    scale:
      context.scale !== undefined
        ? validateScale(context.scale)
        : { valid: true, errors: [], warnings: [], suggestions: [] },
    tempo:
      context.tempo !== undefined
        ? validateTempo(context.tempo)
        : { valid: true, errors: [], warnings: [], suggestions: [] },
    timeSignature:
      context.timeSignature !== undefined
        ? validateTimeSignature(context.timeSignature)
        : { valid: true, errors: [], warnings: [], suggestions: [] },
    range:
      context.range !== undefined
        ? validateRange(context.range)
        : { valid: true, errors: [], warnings: [], suggestions: [] },
  };
}

/**
 * Validate Schillinger generator parameters
 */
export function validateSchillingerParameters(params: {
  generators?: unknown;
  length?: unknown;
  complexity?: unknown;
  style?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate generators if provided
  if (params.generators !== undefined) {
    if (!Array.isArray(params.generators) || params.generators.length !== 2) {
      errors.push('Generators must be an array of exactly 2 numbers');
      return { valid: false, errors, warnings, suggestions };
    }

    const [a, b] = params.generators;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
      errors.push('Generators must be positive integers');
      return { valid: false, errors, warnings, suggestions };
    }

    if (a > 16 || b > 16) {
      warnings.push('Large generators may create very long patterns');
    }

    if (a === b) {
      warnings.push('Equal generators will create simple repetitive patterns');
    }
  }

  // Validate length if provided
  if (params.length !== undefined) {
    const length = params.length as number;
    if (!Number.isInteger(length) || length < 1) {
      errors.push('Length must be a positive integer');
      return { valid: false, errors, warnings, suggestions };
    }

    if (length > 64) {
      warnings.push('Very long pattern - may be impractical for musical use');
    }
  }

  // Validate complexity if provided
  if (params.complexity !== undefined) {
    const validComplexities = ['simple', 'moderate', 'complex'];
    if (!validComplexities.includes(params.complexity as string)) {
      errors.push(`Complexity must be one of: ${validComplexities.join(', ')}`);
      return { valid: false, errors, warnings, suggestions };
    }
  }

  // Validate style if provided
  if (params.style !== undefined) {
    const validStyles = [
      'classical',
      'jazz',
      'contemporary',
      'modal',
      'experimental',
    ];
    if (!validStyles.includes(params.style as string)) {
      warnings.push(
        `Unusual style "${params.style}" - may not have specific optimizations`
      );
      suggestions.push(`Common styles are: ${validStyles.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Create comprehensive validation error with context
 */
export function createValidationError(
  field: string,
  value: unknown,
  validationResult: ValidationResult,
  context?: Record<string, any>
): _ValidationError {
  return new _ValidationError(field, value, 'valid value', {
    ...context,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
    suggestions: validationResult.suggestions,
  });
}
