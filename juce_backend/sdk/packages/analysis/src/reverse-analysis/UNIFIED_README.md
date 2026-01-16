# Unified Pattern Encoding System

The unified pattern encoding system is the culmination of the Schillinger reverse analysis engine, providing a comprehensive way to encode any musical input (rhythm, melody, harmony) into Schillinger parameters with multi-interpretation ranking and validation.

## Overview

This system combines the individual reverse analysis engines for rhythm, melody, and harmony into a unified interface that can:

- Analyze complex musical structures with multiple components
- Provide multi-interpretation ranking with confidence scores
- Validate that encoded parameters work with existing Schillinger tools
- Offer structural analysis and recommendations for improvement

## Key Features

### 🎵 Multi-Component Analysis

- **Rhythm Analysis**: Infer generators from rhythmic patterns
- **Melody Analysis**: Extract contour parameters and scale relationships
- **Harmony Analysis**: Analyze chord progressions and functional relationships
- **Combined Analysis**: Unified interpretation of all components together

### 🎯 Intelligent Ranking

- **Confidence Scoring**: Reliable confidence metrics for all inferences
- **Alternative Interpretations**: Multiple valid Schillinger interpretations
- **Component Weighting**: Adjustable weights for different musical elements
- **Consistency Analysis**: How well different components agree on generators

### ✅ Parameter Validation

- **Generation Testing**: Verify parameters work with Schillinger generation tools
- **Error Detection**: Identify potential issues with inferred parameters
- **Warning System**: Alert users to potential problems
- **Compatibility Checking**: Ensure parameters are valid across all components

### 📊 Structural Analysis

- **Pattern Complexity**: Analyze overall complexity of musical structures
- **Component Interaction**: How rhythm, melody, and harmony interact
- **Coherence Metrics**: Measure structural unity of the musical input
- **Recommendations**: Actionable suggestions for improvement

## Basic Usage

### Simple Pattern Encoding

```typescript
import { encodeMusicalPattern } from '@schillinger-sdk/analysis';

// Encode a complete musical pattern
const input = {
  rhythm: [3, 1, 2, 1, 3, 1, 2, 1],
  melody: [60, 64, 67, 65, 62, 64, 67, 60],
  harmony: ['C', 'F', 'G', 'C'],
  metadata: {
    key: 'C',
    scale: 'major',
    timeSignature: [4, 4],
    tempo: 120,
  },
};

const encoding = encodeMusicalPattern(input);

console.log('Best generators:', encoding.bestMatch.generators);
console.log('Confidence:', encoding.confidence);
console.log('Components analyzed:', encoding.metadata.componentsAnalyzed);
console.log('Recommendations:', encoding.structuralAnalysis.recommendations);
```

### Single Component Analysis

```typescript
// Analyze just rhythm
const rhythmInput = {
  rhythm: [1, 0, 1, 0, 1, 0, 1, 0],
};

const rhythmEncoding = encodeMusicalPattern(rhythmInput);

// Analyze just melody
const melodyInput = {
  melody: [60, 62, 64, 67, 69, 67, 64, 60],
};

const melodyEncoding = encodeMusicalPattern(melodyInput);

// Analyze just harmony
const harmonyInput = {
  harmony: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
};

const harmonyEncoding = encodeMusicalPattern(harmonyInput);
```

### Advanced Options

```typescript
const encoding = encodeMusicalPattern(input, {
  maxGenerator: 12, // Limit generator search space
  minConfidence: 0.3, // Only return high-confidence results
  maxResults: 5, // Limit number of alternatives
  componentWeights: {
    // Adjust component importance
    rhythm: 0.4,
    melody: 0.35,
    harmony: 0.25,
  },
  analysisDepth: 'comprehensive', // Level of analysis detail
  validateParameters: true, // Test parameters with generation tools
});
```

## Multi-Interpretation Ranking

### Finding Best Fits

```typescript
import { findBestFitWithRanking } from '@schillinger-sdk/analysis';

const input = {
  rhythm: [3, 1, 2, 0, 1, 3, 0, 2],
  melody: [60, 67, 55, 72, 48, 76, 52, 69],
};

const inferences = findBestFitWithRanking(input, { maxResults: 5 });

inferences.forEach((inference, index) => {
  console.log(`Interpretation ${index + 1}:`);
  console.log(
    `  Generators: ${inference.generators.a}:${inference.generators.b}`
  );
  console.log(`  Confidence: ${inference.confidence.toFixed(3)}`);
  console.log(
    `  Dominant component: ${inference.combinedAnalysis.dominantComponent}`
  );
  console.log(
    `  Consistency: ${inference.combinedAnalysis.consistency.toFixed(3)}`
  );
});
```

### Understanding Results

Each inference includes:

- **Generators**: The inferred Schillinger generator pair
- **Confidence**: Overall confidence in the inference (0-1)
- **Match Quality**: How well the generators match the input
- **Components**: Individual component analyses
- **Combined Analysis**: How components work together
- **Detected Parameters**: Key, scale, complexity, style

## Pattern Combination Analysis

### Analyzing Complex Structures

```typescript
import { analyzePatternCombination } from '@schillinger-sdk/analysis';

const complexInput = {
  rhythm: [3, 1, 2, 0, 1, 3, 0, 2, 1, 3, 2, 0],
  melody: [60, 67, 55, 72, 48, 76, 52, 69, 44, 80, 36, 84],
  harmony: ['Cmaj7#11', 'F#m7b5', 'G7alt', 'Cmaj7'],
};

const analysis = analyzePatternCombination(complexInput);

console.log('Generator combinations:', analysis.combinations);
console.log('Component interactions:', analysis.interactions);
console.log('Recommendations:', analysis.recommendations);
```

### Component Interactions

The system analyzes how different musical components interact:

```typescript
// Rhythm-Melody interaction
if (analysis.interactions.rhythmMelody) {
  console.log(
    'Rhythm-Melody correlation:',
    analysis.interactions.rhythmMelody.correlation
  );
  console.log(
    'Phase relationship:',
    analysis.interactions.rhythmMelody.phaseRelationship
  );
}

// Melody-Harmony interaction
if (analysis.interactions.melodyHarmony) {
  console.log(
    'Harmonic support:',
    analysis.interactions.melodyHarmony.harmonicSupport
  );
  console.log(
    'Voice leading quality:',
    analysis.interactions.melodyHarmony.voiceLeadingQuality
  );
}
```

## Parameter Validation

### Ensuring Compatibility

```typescript
import { validateSchillingerParameters } from '@schillinger-sdk/analysis';

const encoding = encodeMusicalPattern(input);
const validation = validateSchillingerParameters(encoding.bestMatch, input);

if (validation.isValid) {
  console.log('Parameters are valid!');
  console.log('Validation tests:', validation.validationTests);
} else {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Validation Tests

The system tests parameters by actually generating patterns:

- **Rhythm Generation**: Tests if generators can produce valid rhythmic resultants
- **Melody Generation**: Tests if parameters can generate melodic contours
- **Harmony Generation**: Tests if parameters can create harmonic progressions

## Working with Results

### Using Inferred Parameters

```typescript
import {
  generateRhythmicResultant,
  generateMelodicContour,
  generateHarmonicProgression,
} from '@schillinger-sdk/shared';

const encoding = encodeMusicalPattern(input);
const { generators } = encoding.bestMatch;
const { key, scale } = encoding.bestMatch.detectedParameters;

// Generate new patterns using inferred parameters
const newRhythm = generateRhythmicResultant(generators.a, generators.b);
const newMelody = generateMelodicContour(generators.a, generators.b, {
  key,
  scale,
});
const newHarmony = generateHarmonicProgression(generators.a, generators.b, {
  key,
  scale,
});

console.log('Generated rhythm:', newRhythm.pattern);
console.log('Generated melody:', newMelody.notes);
console.log('Generated harmony:', newHarmony.chords);
```

### Structural Analysis

```typescript
const { structuralAnalysis } = encoding;

console.log('Pattern complexity:', structuralAnalysis.patternComplexity);
console.log('Overall coherence:', structuralAnalysis.overallCoherence);

// Component interactions
if (structuralAnalysis.componentInteraction.rhythmMelody) {
  console.log(
    'Rhythm-melody interaction strength:',
    structuralAnalysis.componentInteraction.rhythmMelody
  );
}

// Recommendations for improvement
structuralAnalysis.recommendations.forEach(rec => {
  console.log('Recommendation:', rec);
});
```

## Advanced Features

### Custom Component Weights

```typescript
// Emphasize harmonic analysis
const harmonyFocused = encodeMusicalPattern(input, {
  componentWeights: {
    rhythm: 0.2,
    melody: 0.2,
    harmony: 0.6,
  },
});

// Emphasize rhythmic analysis
const rhythmFocused = encodeMusicalPattern(input, {
  componentWeights: {
    rhythm: 0.7,
    melody: 0.2,
    harmony: 0.1,
  },
});
```

### Analysis Depth Control

```typescript
// Basic analysis (fastest)
const basicAnalysis = encodeMusicalPattern(input, {
  analysisDepth: 'basic',
});

// Detailed analysis (balanced)
const detailedAnalysis = encodeMusicalPattern(input, {
  analysisDepth: 'detailed',
});

// Comprehensive analysis (most thorough)
const comprehensiveAnalysis = encodeMusicalPattern(input, {
  analysisDepth: 'comprehensive',
});
```

### Performance Optimization

```typescript
// For real-time applications
const quickAnalysis = encodeMusicalPattern(input, {
  maxGenerator: 8, // Smaller search space
  maxResults: 3, // Fewer results
  minConfidence: 0.4, // Higher threshold
  validateParameters: false, // Skip validation
});
```

## Error Handling

### Common Error Scenarios

```typescript
try {
  const encoding = encodeMusicalPattern(input);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.log('Input validation failed:', error.message);
    console.log('Suggestions:', error.suggestions);
  }
}
```

### Handling Low Confidence Results

```typescript
const encoding = encodeMusicalPattern(input, { minConfidence: 0.1 });

if (encoding.confidence < 0.5) {
  console.log('Low confidence result - consider:');
  encoding.structuralAnalysis.recommendations.forEach(rec => {
    console.log(`- ${rec}`);
  });
}
```

## Integration Examples

### With Composition Tools

```typescript
// Analyze existing composition
const existingComposition = {
  rhythm: [3, 1, 2, 1, 3, 1, 2, 1],
  melody: [60, 64, 67, 65, 62, 64, 67, 60],
  harmony: ['C', 'F', 'G', 'C'],
};

const encoding = encodeMusicalPattern(existingComposition);

// Create variations using inferred parameters
const variation1 = generateRhythmicResultant(
  encoding.bestMatch.generators.b, // Swap generators
  encoding.bestMatch.generators.a
);

const variation2 = generateMelodicContour(
  encoding.bestMatch.generators.a,
  encoding.bestMatch.generators.b,
  {
    key: encoding.bestMatch.detectedParameters.key,
    scale: 'dorian', // Change mode
    contourType: 'inverted_arch',
  }
);
```

### With Analysis Tools

```typescript
// Combine with other analysis tools
import { PatternRecognizer } from '@schillinger-sdk/analysis';

const recognizer = new PatternRecognizer();
const encoding = encodeMusicalPattern(input);

// Find similar patterns
const rhythmPatterns = recognizer.findRhythmicPatterns(
  encoding.componentAnalyses.rhythm?.originalPattern || []
);

// Analyze complexity
const complexityAnalysis = analyzeMelodicComplexity(
  encoding.componentAnalyses.melody?.originalMelody || []
);
```

## Best Practices

### Input Preparation

1. **Clean Data**: Ensure input patterns are clean and consistent
2. **Appropriate Length**: Use patterns of reasonable length (4-16 elements)
3. **Clear Structure**: Provide patterns with clear musical structure
4. **Metadata**: Include key, scale, and timing information when available

### Parameter Selection

1. **Generator Range**: Use appropriate `maxGenerator` values (8-16 for most cases)
2. **Confidence Thresholds**: Start with 0.3-0.5 for `minConfidence`
3. **Component Weights**: Adjust based on which aspects are most important
4. **Validation**: Enable parameter validation for critical applications

### Result Interpretation

1. **Check Confidence**: Higher confidence results are more reliable
2. **Review Alternatives**: Consider multiple interpretations
3. **Validate Results**: Test inferred parameters with generation tools
4. **Follow Recommendations**: Use structural analysis suggestions

### Performance Considerations

1. **Limit Search Space**: Use reasonable `maxGenerator` values
2. **Reduce Results**: Limit `maxResults` for faster processing
3. **Skip Validation**: Disable validation for non-critical applications
4. **Cache Results**: Store encodings for repeated analysis

## Troubleshooting

### Low Confidence Results

If you're getting low confidence results:

1. Simplify the input patterns
2. Ensure patterns have clear structure
3. Check for consistent timing/rhythm
4. Verify key and scale information
5. Try different component weights

### No Results Found

If no results are returned:

1. Lower the `minConfidence` threshold
2. Increase the `maxGenerator` range
3. Check input data validity
4. Simplify complex patterns
5. Analyze components individually first

### Validation Failures

If parameter validation fails:

1. Check the validation error messages
2. Try alternative interpretations
3. Verify input data consistency
4. Consider pattern simplification
5. Review the warnings for guidance

## API Reference

### Main Functions

- `encodeMusicalPattern(input, options)` - Main encoding function
- `findBestFitWithRanking(input, options)` - Get ranked interpretations
- `analyzePatternCombination(input, options)` - Analyze complex structures
- `validateSchillingerParameters(inference, input)` - Validate parameters

### Types

- `UnifiedMusicalInput` - Input structure for musical patterns
- `UnifiedEncoding` - Complete encoding result
- `UnifiedInference` - Single interpretation result
- `UnifiedFitOptions` - Configuration options
- `PatternValidationResult` - Validation result structure

For detailed type definitions and API documentation, see the TypeScript definitions in the source code.
