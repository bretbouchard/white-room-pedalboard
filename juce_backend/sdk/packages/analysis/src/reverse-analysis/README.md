# Rhythm Reverse Analysis

The rhythm reverse analysis engine allows you to infer Schillinger generators from existing rhythm patterns. This is useful for analyzing existing music and understanding how it can be represented using Schillinger's mathematical principles.

## Features

- **Generator Inference**: Automatically infer the most likely Schillinger generator pairs that could produce a given rhythm pattern
- **Pattern Encoding**: Convert any rhythm pattern into Schillinger parameters with confidence scores
- **Complex Rhythm Analysis**: Analyze polyrhythmic patterns with multiple generator combinations
- **Confidence Scoring**: Get reliability scores for all inferences and alternative interpretations

## Basic Usage

### Inferring Generators

```typescript
import { inferGenerators } from '@schillinger-sdk/analysis';

// Simple rhythm pattern
const pattern = [3, 1, 0, 1, 0, 3]; // Strong-weak-rest-weak-rest-strong

// Infer possible generators
const inferences = inferGenerators(pattern, {
  maxGenerator: 8, // Don't test generators larger than 8
  minConfidence: 0.3, // Only return matches with 30%+ confidence
  maxResults: 5, // Return top 5 matches
});

console.log('Best match:', inferences[0]);
// Output: { generators: { a: 3, b: 2 }, confidence: 0.85, ... }
```

### Encoding Patterns

```typescript
import { encodePattern } from '@schillinger-sdk/analysis';

const rhythmPattern = {
  durations: [1, 0, 1, 0, 1, 0],
  timeSignature: [4, 4],
  tempo: 120,
};

const encoding = encodePattern(rhythmPattern);

console.log('Original pattern:', encoding.originalPattern);
console.log('Best Schillinger match:', encoding.bestMatch.generators);
console.log('Confidence:', encoding.confidence);
console.log('Alternative interpretations:', encoding.alternatives.length);
```

### Finding Best Fit

```typescript
import { findBestFit } from '@schillinger-sdk/analysis';

const targetPattern = [1, 0, 1, 0, 1, 0, 1, 0];

const bestFits = findBestFit(targetPattern, {
  minConfidence: 0.5, // Only high-confidence matches
  maxResults: 3, // Top 3 results
});

bestFits.forEach((fit, index) => {
  console.log(
    `Match ${index + 1}:`,
    fit.generators,
    `(${fit.confidence.toFixed(2)})`
  );
});
```

### Analyzing Complex Rhythms

```typescript
import { analyzeComplexRhythm } from '@schillinger-sdk/analysis';

const complexPattern = [3, 1, 2, 0, 1, 2, 0, 3, 1, 0, 2, 1];

const analysis = analyzeComplexRhythm(complexPattern);

console.log('Primary generators:', analysis.primaryGenerators);
console.log('Is polyrhythmic:', analysis.combinedAnalysis.isPolyrhythmic);
console.log('Complexity score:', analysis.combinedAnalysis.complexityScore);
console.log(
  'Dominant generators:',
  analysis.combinedAnalysis.dominantGenerators
);
```

## Advanced Options

### Custom Weighting

You can adjust how different aspects of pattern matching are weighted:

```typescript
const inferences = inferGenerators(pattern, {
  weightAccents: 0.5, // 50% weight on accent matching
  weightDensity: 0.3, // 30% weight on density matching
  weightLength: 0.2, // 20% weight on length matching
});
```

### Performance Tuning

For large patterns or real-time applications:

```typescript
const quickAnalysis = inferGenerators(pattern, {
  maxGenerator: 6, // Limit search space
  maxResults: 3, // Fewer results
  minConfidence: 0.4, // Higher threshold
});
```

## Understanding Results

### Confidence Scores

- **0.8-1.0**: Excellent match, very likely correct
- **0.6-0.8**: Good match, probably correct
- **0.4-0.6**: Fair match, possibly correct
- **0.2-0.4**: Poor match, unlikely to be correct
- **0.0-0.2**: Very poor match, probably incorrect

### Analysis Components

Each inference includes detailed analysis:

```typescript
const inference = inferences[0];

console.log('Pattern similarity:', inference.analysis.patternSimilarity);
console.log('Length match:', inference.analysis.lengthMatch);
console.log('Accent match:', inference.analysis.accentMatch);
console.log('Density match:', inference.analysis.densityMatch);
```

### Complex Rhythm Analysis

For polyrhythmic patterns:

```typescript
const analysis = analyzeComplexRhythm(pattern);

if (analysis.combinedAnalysis.isPolyrhythmic) {
  console.log('This pattern combines multiple rhythmic layers');
  console.log('Primary generators:', analysis.primaryGenerators[0].generators);
  console.log('Secondary patterns found:', analysis.secondaryGenerators.length);
}
```

## Error Handling

The reverse analysis engine includes comprehensive error handling:

```typescript
try {
  const encoding = encodePattern(invalidPattern);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.log('Invalid pattern:', error.message);
    console.log('Suggestion:', error.details.suggestion);
  }
}
```

## Performance Considerations

- **Pattern Length**: Longer patterns take more time to analyze
- **Generator Range**: Larger `maxGenerator` values increase computation time
- **Result Count**: More results require more computation
- **Confidence Threshold**: Lower thresholds require testing more combinations

For optimal performance in real-time applications, use:

- `maxGenerator: 8` or less
- `maxResults: 5` or less
- `minConfidence: 0.4` or higher

## Integration with Schillinger Tools

The reverse analysis results can be used directly with other Schillinger SDK tools:

```typescript
import { generateRhythmicResultant } from '@schillinger-sdk/shared';

// Analyze existing pattern
const encoding = encodePattern(existingPattern);
const bestMatch = encoding.bestMatch;

// Generate variations using inferred generators
const variation = generateRhythmicResultant(
  bestMatch.generators.a,
  bestMatch.generators.b,
  { accentStrength: 2 }
);

console.log('Original pattern:', encoding.originalPattern);
console.log('Schillinger variation:', variation.pattern);
```
