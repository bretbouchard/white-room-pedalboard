# Schillinger SDK Frontend Integration

This directory contains React components and hooks for integrating the Schillinger SDK into the frontend application.

## Quick Start

### 1. Provider Setup

Wrap your application with the `SchillingerProvider`:

```tsx
import { SchillingerProvider } from '@/components/schillinger';

function App() {
  return (
    <SchillingerProvider>
      <YourApp />
    </SchillingerProvider>
  );
}
```

### 2. Using Hooks

```tsx
import { usePatternGeneration } from '@/components/schillinger';

function MyComponent() {
  const { generatePattern, isGenerating, lastResult } = usePatternGeneration();

  const handleGenerate = async () => {
    try {
      const result = await generatePattern({
        key: 'C',
        scale: 'MAJOR',
        length: 4,
        complexity: 5,
      });
      console.log('Generated pattern:', result);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate Pattern'}
    </button>
  );
}
```

### 3. Using Components

```tsx
import { SchillingerPatternGenerator, SchillingerMusicAnalyzer } from '@/components/schillinger';

function MusicWorkspace() {
  return (
    <div>
      <SchillingerPatternGenerator
        onPatternGenerated={(pattern) => console.log(pattern)}
      />
      <SchillingerMusicAnalyzer
        onAnalysisComplete={(analysis) => console.log(analysis)}
      />
    </div>
  );
}
```

## Available Hooks

### Core Hooks

- `useSchillingerSDK()` - Main SDK hook for initialization and health checks
- `useSchillingerGeneration()` - Generation operations
- `useSchillingerAnalysis()` - Analysis operations
- `useSchillingerComplete()` - Combined generation and analysis

### Specialized Hooks

- `usePatternGeneration()` - Pattern generation with typed parameters
- `useChordProgressionGeneration()` - Chord progression generation
- `useMelodyGeneration()` - Melody generation

## Available Components

### UI Components

- `SchillingerProvider` - Context provider for SDK initialization
- `SchillingerPatternGenerator` - Full-featured pattern generation UI
- `SchillingerMusicAnalyzer` - Music analysis interface

### Example Usage

See `SchillingerDemo.tsx` for a comprehensive example of how to use all components together.

## Service Integration

For advanced usage, you can use the service directly:

```tsx
import { schillingerService } from '@/services/schillingerService';

// Initialize the service
await schillingerService.initialize();

// Generate a pattern
const result = await schillingerService.generatePattern({
  key: 'C',
  scale: 'MAJOR',
  length: 4,
});

// Analyze music
const analysis = await schillingerService.analyze({
  type: 'comprehensive',
  input: {
    content: { notes: [...] }
  }
});
```

## Error Handling

All hooks and services provide proper error handling:

```tsx
const { generatePattern, error } = usePatternGeneration();

if (error) {
  console.error('SDK Error:', error);
  // Handle error appropriately
}
```

## Caching

The SDK service includes intelligent caching:

```tsx
import { schillingerService } from '@/services/schillingerService';

// Check cache stats
const stats = schillingerService.getCacheStats();
console.log('Cached items:', stats.size);

// Clear cache if needed
schillingerService.clearCache();
```

## Configuration

You can configure the SDK through the provider:

```tsx
<SchillingerProvider
  config={{
    mode: 'offline',
    daid: {
      agentId: 'my-app',
    }
  }}
  serviceConfig={{
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    retryAttempts: 3,
  }}
>
  <App />
</SchillingerProvider>
```

## Generation Types

The SDK supports these generation types:

- `pattern` - Rhythmic and melodic patterns
- `chord_progression` - Chord progressions with harmonic analysis
- `melody` - Melodic lines with contour control
- `rhythm` - Rhythmic patterns and grooves
- `sequence` - Musical sequences and phrases
- `accompaniment` - Accompaniment patterns
- `composition` - Full musical compositions

## Analysis Types

The SDK supports these analysis types:

- `harmony` - Harmonic analysis and key detection
- `melody` - Melodic contour and interval analysis
- `rhythm` - Rhythmic pattern and meter analysis
- `structure` - Musical form and structure analysis
- `pattern` - Pattern detection and analysis
- `style` - Musical style and genre classification
- `emotion` - Emotional content analysis
- `comprehensive` - Complete musical analysis

## TypeScript Support

The SDK provides full TypeScript support with typed interfaces:

```tsx
import type { UnifiedGenerationRequest, UnifiedResponse } from '@schillinger-sdk/core';

const request: UnifiedGenerationRequest = {
  type: 'pattern',
  parameters: { /* ... */ },
};

const response: UnifiedResponse = await generate(request);
```

## Integration with Existing Frontend

The SDK integrates seamlessly with existing frontend patterns:

- Works with React Query for data fetching
- Compatible with existing state management
- Supports React Server Components
- Includes proper loading states and error boundaries
- Follows accessibility best practices

## Performance Considerations

- SDK operations are asynchronous and non-blocking
- Caching reduces redundant API calls
- Lazy initialization prevents unnecessary overhead
- Components use React.memo for optimization
- Service includes retry logic for reliability

## Troubleshooting

### Common Issues

1. **SDK not initializing**: Check that the Python DAID core is available
2. **Generation failing**: Verify request parameters are valid
3. **Analysis errors**: Ensure input content is properly formatted
4. **Performance issues**: Enable caching and adjust timeout settings

### Debug Mode

Enable debug logging:

```tsx
<SchillingerProvider
  config={{
    logging: {
      level: 'debug',
      console: true,
    }
  }}
>
  <App />
</SchillingerProvider>
```