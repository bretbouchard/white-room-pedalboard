/**
 * Melodic contour generation and transformation using Schillinger principles
 */

import { ValidationError as _ValidationError } from "../errors";
import { validateGenerators, calculateLCM, GeneratorPair } from "./generators";

export interface MelodicContour {
  notes: number[];
  intervals: number[];
  contour: ContourShape;
  generators?: GeneratorPair;
  key: string;
  scale: string;
  metadata: {
    range: [number, number];
    complexity: number;
    direction: "ascending" | "descending" | "mixed";
    phrases: PhraseStructure[];
    peaks: number[];
    valleys: number[];
  };
}

export interface ContourShape {
  type:
    | "arch"
    | "inverted_arch"
    | "ascending"
    | "descending"
    | "wave"
    | "zigzag"
    | "plateau";
  strength: number; // 0-1, how clearly defined the shape is
}

export interface PhraseStructure {
  start: number;
  end: number;
  direction: "ascending" | "descending" | "static";
  peak: number;
  contour: string;
}

export interface MelodicGenerationOptions {
  key?: string;
  scale?: string;
  range?: [number, number]; // MIDI note range
  length?: number;
  contourType?: ContourShape["type"];
  complexity?: "simple" | "moderate" | "complex";
  stepSize?: "small" | "medium" | "large" | "mixed";
  allowLeaps?: boolean;
  modalCharacter?: boolean;
}

/**
 * Scale patterns for different modes
 */
const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/**
 * Generate melodic contour using Schillinger generators
 */
export function generateMelodicContour(
  a: number,
  b: number,
  options: MelodicGenerationOptions = {},
): MelodicContour {
  // Validate generators
  const validation = validateGenerators(a, b);
  if (!validation.valid) {
    throw new _ValidationError("generators", { a, b }, "valid generator pair", {
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }

  const {
    key = "C",
    scale = "major",
    range = [60, 84], // C4 to C6
    length,
    contourType = "arch",
    complexity = "moderate",
    stepSize = "medium",
    allowLeaps = true,
    modalCharacter = false,
  } = options;

  const melodyLength = length || calculateLCM(a, b);
  const scalePattern = SCALE_PATTERNS[scale as keyof typeof SCALE_PATTERNS];

  if (!scalePattern) {
    throw new _ValidationError("scale", scale, "supported scale type", {
      supportedScales: Object.keys(SCALE_PATTERNS),
    });
  }

  // Generate base contour using generators
  const baseContour = generateBaseContour(a, b, melodyLength, contourType);

  // Convert contour to actual notes
  const notes = contourToNotes(baseContour, {
    key,
    scale: scalePattern,
    range,
    stepSize,
    allowLeaps,
    complexity,
    modalCharacter,
  });

  // Calculate intervals
  const intervals = calculateIntervals(notes);

  // Analyze contour shape
  const contour = analyzeContourShape(notes);

  // Analyze phrase structure
  const phrases = analyzePhraseStructure(notes);

  // Find peaks and valleys
  const { peaks, valleys } = findPeaksAndValleys(notes);

  return {
    notes,
    intervals,
    contour,
    generators: { a, b },
    key,
    scale,
    metadata: {
      range: [Math.min(...notes), Math.max(...notes)],
      complexity: calculateMelodicComplexity(notes, intervals),
      direction: determineOverallDirection(notes),
      phrases,
      peaks,
      valleys,
    },
  };
}

/**
 * Generate contour from template shape
 */
export function generateFromContourTemplate(
  template: number[],
  options: MelodicGenerationOptions = {},
): MelodicContour {
  const {
    key = "C",
    scale = "major",
    range = [60, 84],
    stepSize = "medium",
    allowLeaps = true,
    complexity = "moderate",
    modalCharacter = false,
  } = options;

  const scalePattern = SCALE_PATTERNS[scale as keyof typeof SCALE_PATTERNS];

  if (!scalePattern) {
    throw new _ValidationError("scale", scale, "supported scale type", {
      supportedScales: Object.keys(SCALE_PATTERNS),
    });
  }

  // Normalize template to 0-1 range
  const minVal = Math.min(...template);
  const maxVal = Math.max(...template);
  const normalizedTemplate = template.map(
    (val) => (val - minVal) / (maxVal - minVal),
  );

  // Convert to notes
  const notes = contourToNotes(normalizedTemplate, {
    key,
    scale: scalePattern,
    range,
    stepSize,
    allowLeaps,
    complexity,
    modalCharacter,
  });

  const intervals = calculateIntervals(notes);
  const contour = analyzeContourShape(notes);
  const phrases = analyzePhraseStructure(notes);
  const { peaks, valleys } = findPeaksAndValleys(notes);

  return {
    notes,
    intervals,
    contour,
    key,
    scale,
    metadata: {
      range: [Math.min(...notes), Math.max(...notes)],
      complexity: calculateMelodicComplexity(notes, intervals),
      direction: determineOverallDirection(notes),
      phrases,
      peaks,
      valleys,
    },
  };
}

/**
 * Apply melodic transformations
 */
export function applyMelodicTransformation(
  melody: MelodicContour,
  transformation:
    | "inversion"
    | "retrograde"
    | "augmentation"
    | "diminution"
    | "transposition"
    | "rotation",
  parameters?: any,
): MelodicContour {
  let transformedNotes: number[];

  switch (transformation) {
    case "inversion":
      transformedNotes = applyInversion(melody.notes, parameters?.axis);
      break;
    case "retrograde":
      transformedNotes = [...melody.notes].reverse();
      break;
    case "augmentation":
      transformedNotes = applyAugmentation(
        melody.notes,
        parameters?.factor || 2,
      );
      break;
    case "diminution":
      transformedNotes = applyDiminution(melody.notes, parameters?.factor || 2);
      break;
    case "transposition":
      transformedNotes = applyTransposition(
        melody.notes,
        parameters?.semitones || 0,
      );
      break;
    case "rotation":
      transformedNotes = applyRotation(melody.notes, parameters?.steps || 1);
      break;
    default:
      throw new _ValidationError(
        "transformation",
        transformation,
        "valid transformation type",
      );
  }

  // Recalculate metadata for transformed melody
  const intervals = calculateIntervals(transformedNotes);
  const contour = analyzeContourShape(transformedNotes);
  const phrases = analyzePhraseStructure(transformedNotes);
  const { peaks, valleys } = findPeaksAndValleys(transformedNotes);

  return {
    ...melody,
    notes: transformedNotes,
    intervals,
    contour,
    metadata: {
      range: [Math.min(...transformedNotes), Math.max(...transformedNotes)],
      complexity: calculateMelodicComplexity(transformedNotes, intervals),
      direction: determineOverallDirection(transformedNotes),
      phrases,
      peaks,
      valleys,
    },
  };
}

/**
 * Generate multiple melodic variations
 */
export function generateMelodicVariations(
  baseMelody: MelodicContour,
  variationTypes: string[] = ["rhythmic", "ornamental", "intervallic", "modal"],
): MelodicContour[] {
  const variations: MelodicContour[] = [];

  variationTypes.forEach((type) => {
    switch (type) {
      case "rhythmic":
        variations.push(createRhythmicVariation(baseMelody));
        break;
      case "ornamental":
        variations.push(createOrnamentalVariation(baseMelody));
        break;
      case "intervallic":
        variations.push(createIntervallicVariation(baseMelody));
        break;
      case "modal":
        variations.push(createModalVariation(baseMelody));
        break;
      case "sequential":
        variations.push(createSequentialVariation(baseMelody));
        break;
    }
  });

  return variations;
}

// Helper functions

function generateBaseContour(
  a: number,
  b: number,
  length: number,
  contourType: ContourShape["type"],
): number[] {
  const contour: number[] = [];

  switch (contourType) {
    case "arch":
      for (let i = 0; i < length; i++) {
        const progress = i / (length - 1);
        const archValue = Math.sin(progress * Math.PI);
        const generatorInfluence =
          (Math.sin((i / a) * 2 * Math.PI) + Math.sin((i / b) * 2 * Math.PI)) /
          2;
        contour.push(archValue * 0.7 + generatorInfluence * 0.3);
      }
      break;

    case "inverted_arch":
      for (let i = 0; i < length; i++) {
        const progress = i / (length - 1);
        const archValue = 1 - Math.sin(progress * Math.PI);
        const generatorInfluence =
          (Math.sin((i / a) * 2 * Math.PI) + Math.sin((i / b) * 2 * Math.PI)) /
          2;
        contour.push(archValue * 0.7 + generatorInfluence * 0.3);
      }
      break;

    case "ascending":
      for (let i = 0; i < length; i++) {
        const progress = i / (length - 1);
        const generatorInfluence =
          (Math.sin((i / a) * 2 * Math.PI) + Math.sin((i / b) * 2 * Math.PI)) /
          4;
        contour.push(progress + generatorInfluence);
      }
      break;

    case "descending":
      for (let i = 0; i < length; i++) {
        const progress = 1 - i / (length - 1);
        const generatorInfluence =
          (Math.sin((i / a) * 2 * Math.PI) + Math.sin((i / b) * 2 * Math.PI)) /
          4;
        contour.push(progress + generatorInfluence);
      }
      break;

    case "wave":
      for (let i = 0; i < length; i++) {
        const waveA = Math.sin((i / a) * 2 * Math.PI);
        const waveB = Math.sin((i / b) * 2 * Math.PI);
        contour.push((waveA + waveB) / 2);
      }
      break;

    case "zigzag":
      for (let i = 0; i < length; i++) {
        const zigzagA = (i % a) / a;
        const zigzagB = (i % b) / b;
        contour.push((zigzagA + zigzagB) / 2);
      }
      break;

    case "plateau": {
      const plateauHeight = 0.7;
      const plateauStart = Math.floor(length * 0.3);
      const plateauEnd = Math.floor(length * 0.7);

      for (let i = 0; i < length; i++) {
        if (i < plateauStart) {
          contour.push((i / plateauStart) * plateauHeight);
        } else if (i <= plateauEnd) {
          const generatorInfluence =
            (Math.sin((i / a) * 2 * Math.PI) +
              Math.sin((i / b) * 2 * Math.PI)) /
            8;
          contour.push(plateauHeight + generatorInfluence);
        } else {
          const descent = 1 - (i - plateauEnd) / (length - plateauEnd);
          contour.push(plateauHeight * descent);
        }
      }
      break;
    }

    default:
      // Default to wave pattern
      for (let i = 0; i < length; i++) {
        const waveA = Math.sin((i / a) * 2 * Math.PI);
        const waveB = Math.sin((i / b) * 2 * Math.PI);
        contour.push((waveA + waveB) / 2);
      }
  }

  return contour;
}

function contourToNotes(
  contour: number[],
  options: {
    key: string;
    scale: number[];
    range: [number, number];
    stepSize: string;
    allowLeaps: boolean;
    complexity: string;
    modalCharacter: boolean;
  },
): number[] {
  const { scale, range, stepSize, allowLeaps, complexity } = options;
  const [minNote, maxNote] = range;
  const notes: number[] = [];

  // Create scale notes within range
  const scaleNotes: number[] = [];
  for (
    let octave = Math.floor(minNote / 12);
    octave <= Math.floor(maxNote / 12);
    octave++
  ) {
    scale.forEach((degree) => {
      const note = octave * 12 + degree;
      if (note >= minNote && note <= maxNote) {
        scaleNotes.push(note);
      }
    });
  }

  scaleNotes.sort((a, b) => a - b);

  // Convert contour values to scale indices
  for (let i = 0; i < contour.length; i++) {
    const normalizedValue = Math.max(0, Math.min(1, (contour[i] + 1) / 2)); // Normalize to 0-1
    let targetIndex = Math.floor(normalizedValue * (scaleNotes.length - 1));

    // Apply step size constraints
    if (i > 0 && !allowLeaps) {
      const prevIndex = scaleNotes.indexOf(notes[i - 1]);
      const maxStep = getMaxStepSize(stepSize);

      if (Math.abs(targetIndex - prevIndex) > maxStep) {
        targetIndex = prevIndex + Math.sign(targetIndex - prevIndex) * maxStep;
      }
    }

    // Add complexity variations
    if (complexity === "complex" && Math.random() < 0.2) {
      targetIndex += Math.random() < 0.5 ? 1 : -1;
    }

    // Ensure index is within bounds
    targetIndex = Math.max(0, Math.min(scaleNotes.length - 1, targetIndex));

    notes.push(scaleNotes[targetIndex]);
  }

  return notes;
}

function getMaxStepSize(stepSize: string): number {
  switch (stepSize) {
    case "small":
      return 2;
    case "medium":
      return 4;
    case "large":
      return 7;
    case "mixed":
      return Math.floor(Math.random() * 7) + 1;
    default:
      return 4;
  }
}

function calculateIntervals(notes: number[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i] - notes[i - 1]);
  }
  return intervals;
}

function analyzeContourShape(notes: number[]): ContourShape {
  if (notes.length < 3) {
    return { type: "ascending", strength: 0 };
  }

  // Analyze overall shape
  const firstThird = notes.slice(0, Math.floor(notes.length / 3));
  const middleThird = notes.slice(
    Math.floor(notes.length / 3),
    Math.floor((2 * notes.length) / 3),
  );
  const lastThird = notes.slice(Math.floor((2 * notes.length) / 3));

  const firstAvg =
    firstThird.reduce((sum, note) => sum + note, 0) / firstThird.length;
  const middleAvg =
    middleThird.reduce((sum, note) => sum + note, 0) / middleThird.length;
  const lastAvg =
    lastThird.reduce((sum, note) => sum + note, 0) / lastThird.length;

  // Determine shape type
  let type: ContourShape["type"];
  let strength = 0;

  if (middleAvg > firstAvg && middleAvg > lastAvg) {
    type = "arch";
    strength = Math.min(middleAvg - firstAvg + (middleAvg - lastAvg), 12) / 12;
  } else if (middleAvg < firstAvg && middleAvg < lastAvg) {
    type = "inverted_arch";
    strength = Math.min(firstAvg - middleAvg + (lastAvg - middleAvg), 12) / 12;
  } else if (lastAvg > firstAvg) {
    type = "ascending";
    strength = Math.min(lastAvg - firstAvg, 12) / 12;
  } else if (lastAvg < firstAvg) {
    type = "descending";
    strength = Math.min(firstAvg - lastAvg, 12) / 12;
  } else {
    // Analyze for wave or zigzag patterns
    let directionChanges = 0;
    for (let i = 2; i < notes.length; i++) {
      const prev = notes[i - 1] - notes[i - 2];
      const curr = notes[i] - notes[i - 1];
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        directionChanges++;
      }
    }

    if (directionChanges > notes.length / 3) {
      type = "zigzag";
      strength = Math.min(directionChanges / (notes.length / 3), 1);
    } else {
      type = "wave";
      strength = 0.5;
    }
  }

  return { type, strength };
}

function analyzePhraseStructure(notes: number[]): PhraseStructure[] {
  const phrases: PhraseStructure[] = [];
  let phraseStart = 0;
  let currentDirection: "ascending" | "descending" | "static" = "static";

  for (let i = 1; i < notes.length; i++) {
    const interval = notes[i] - notes[i - 1];
    let newDirection: "ascending" | "descending" | "static";

    if (interval > 0) newDirection = "ascending";
    else if (interval < 0) newDirection = "descending";
    else newDirection = "static";

    // Detect phrase boundary (direction change)
    if (
      newDirection !== currentDirection &&
      currentDirection !== "static" &&
      i - phraseStart > 2
    ) {
      const phraseNotes = notes.slice(phraseStart, i);
      const peak =
        currentDirection === "ascending"
          ? Math.max(...phraseNotes)
          : Math.min(...phraseNotes);

      phrases.push({
        start: phraseStart,
        end: i - 1,
        direction: currentDirection,
        peak,
        contour: generatePhraseContour(phraseNotes),
      });

      phraseStart = i - 1;
    }

    if (newDirection !== "static") {
      currentDirection = newDirection;
    }
  }

  // Add final phrase
  if (phraseStart < notes.length - 1) {
    const phraseNotes = notes.slice(phraseStart);
    const peak =
      currentDirection === "ascending"
        ? Math.max(...phraseNotes)
        : Math.min(...phraseNotes);

    phrases.push({
      start: phraseStart,
      end: notes.length - 1,
      direction: currentDirection,
      peak,
      contour: generatePhraseContour(phraseNotes),
    });
  }

  return phrases;
}

function generatePhraseContour(notes: number[]): string {
  if (notes.length < 2) return "static";

  const intervals = calculateIntervals(notes);
  const avgInterval =
    intervals.reduce((sum, int) => sum + Math.abs(int), 0) / intervals.length;

  if (avgInterval < 2) return "stepwise";
  if (avgInterval < 4) return "moderate";
  return "leaping";
}

function findPeaksAndValleys(notes: number[]): {
  peaks: number[];
  valleys: number[];
} {
  const peaks: number[] = [];
  const valleys: number[] = [];

  for (let i = 1; i < notes.length - 1; i++) {
    if (notes[i] > notes[i - 1] && notes[i] > notes[i + 1]) {
      peaks.push(i);
    } else if (notes[i] < notes[i - 1] && notes[i] < notes[i + 1]) {
      valleys.push(i);
    }
  }

  return { peaks, valleys };
}

function calculateMelodicComplexity(
  notes: number[],
  intervals: number[],
): number {
  if (notes.length < 2) return 0;

  // Interval variety
  const uniqueIntervals = new Set(intervals.map(Math.abs)).size;
  const intervalVariety = uniqueIntervals / intervals.length;

  // Range factor
  const range = Math.max(...notes) - Math.min(...notes);
  const rangeFactor = Math.min(range / 24, 1); // Normalize to 2 octaves

  // Direction changes
  let directionChanges = 0;
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i] > 0 !== intervals[i - 1] > 0) {
      directionChanges++;
    }
  }
  const directionFactor = directionChanges / (intervals.length - 1);

  return (intervalVariety + rangeFactor + directionFactor) / 3;
}

function determineOverallDirection(
  notes: number[],
): "ascending" | "descending" | "mixed" {
  if (notes.length < 2) return "mixed";

  const firstNote = notes[0];
  const lastNote = notes[notes.length - 1];
  const difference = lastNote - firstNote;

  if (Math.abs(difference) < 3) return "mixed";
  return difference > 0 ? "ascending" : "descending";
}

// Transformation functions

function applyInversion(notes: number[], axis?: number): number[] {
  const inversionAxis = axis || (Math.max(...notes) + Math.min(...notes)) / 2;
  return notes.map((note) => Math.round(2 * inversionAxis - note));
}

function applyAugmentation(notes: number[], factor: number): number[] {
  // For melodic augmentation, we increase interval sizes
  const result = [notes[0]];

  for (let i = 1; i < notes.length; i++) {
    const interval = notes[i] - notes[i - 1];
    const augmentedInterval = Math.round(interval * factor);
    result.push(result[result.length - 1] + augmentedInterval);
  }

  return result;
}

function applyDiminution(notes: number[], factor: number): number[] {
  // For melodic diminution, we decrease interval sizes
  const result = [notes[0]];

  for (let i = 1; i < notes.length; i++) {
    const interval = notes[i] - notes[i - 1];
    const diminishedInterval = Math.round(interval / factor);
    result.push(result[result.length - 1] + diminishedInterval);
  }

  return result;
}

function applyTransposition(notes: number[], semitones: number): number[] {
  return notes.map((note) => note + semitones);
}

function applyRotation(notes: number[], steps: number): number[] {
  const normalizedSteps = steps % notes.length;
  return [...notes.slice(normalizedSteps), ...notes.slice(0, normalizedSteps)];
}

// Variation functions

function createRhythmicVariation(baseMelody: MelodicContour): MelodicContour {
  // Simplified rhythmic variation - in practice this would affect durations
  const notes = baseMelody.notes.map((note, index) => {
    if (index % 2 === 1) {
      return note + (Math.random() < 0.5 ? 1 : -1);
    }
    return note;
  });

  return { ...baseMelody, notes };
}

function createOrnamentalVariation(baseMelody: MelodicContour): MelodicContour {
  const notes: number[] = [];

  baseMelody.notes.forEach((note, index) => {
    notes.push(note);

    // Add ornaments occasionally
    if (Math.random() < 0.3 && index < baseMelody.notes.length - 1) {
      const nextNote = baseMelody.notes[index + 1];
      const ornament = note + (nextNote > note ? 1 : -1);
      notes.push(ornament);
    }
  });

  return { ...baseMelody, notes };
}

function createIntervallicVariation(
  baseMelody: MelodicContour,
): MelodicContour {
  const notes = [baseMelody.notes[0]];

  for (let i = 1; i < baseMelody.notes.length; i++) {
    const originalInterval = baseMelody.notes[i] - baseMelody.notes[i - 1];
    const modifiedInterval = originalInterval + (Math.random() < 0.5 ? 1 : -1);
    notes.push(notes[notes.length - 1] + modifiedInterval);
  }

  return { ...baseMelody, notes };
}

function createModalVariation(baseMelody: MelodicContour): MelodicContour {
  // Convert to a different mode (simplified)
  const notes = baseMelody.notes.map((note) => {
    // Flatten certain degrees for modal character
    if (note % 12 === 6) return note - 1; // Flatten 7th
    if (note % 12 === 3) return note - 1; // Flatten 3rd
    return note;
  });

  return { ...baseMelody, notes, scale: "dorian" };
}

function createSequentialVariation(baseMelody: MelodicContour): MelodicContour {
  // Create a sequence by repeating a pattern at different pitch levels
  const sequenceLength = Math.min(4, Math.floor(baseMelody.notes.length / 3));
  const pattern = baseMelody.notes.slice(0, sequenceLength);
  const notes: number[] = [];

  for (let i = 0; i < baseMelody.notes.length; i += sequenceLength) {
    const transposition = Math.floor(i / sequenceLength) * 2; // Step up by whole tone
    pattern.forEach((note) => {
      if (notes.length < baseMelody.notes.length) {
        notes.push(note + transposition);
      }
    });
  }

  return { ...baseMelody, notes };
}
