# Schillinger Dart SDK - Usage Guide

Comprehensive usage guide for the Schillinger Dart SDK with practical examples.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Rhythm Generation](#rhythm-generation)
3. [Harmony Generation](#harmony-generation)
4. [Melody Generation](#melody-generation)
5. [Composition Generation](#composition-generation)
6. [Advanced Usage](#advanced-usage)
7. [Flutter Integration](#flutter-integration)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Basic Usage

### Initialize SDK

```dart
import 'package:schillinger_sdk/schillinger_sdk.dart';

Future<void> main() async {
  // Development configuration (local server)
  final sdk = await SchillingerSDK.create(
    config: SchillingerConfig.development(),
  );

  // Production configuration
  final prodSdk = await SchillingerSDK.create(
    config: SchillingerConfig(
      apiUrl: 'https://api.schillinger.ai/v1',
      environment: SchillingerEnvironment.production,
      timeoutMs: 30000,
    ),
  );

  // Always dispose when done
  sdk.dispose();
  prodSdk.dispose();
}
```

### Authentication

```dart
// Authenticate with API key
await sdk.authenticate(
  credentials: SchillingerCredentials.apiKey('your-api-key-here'),
);

// Authenticate with Clerk token
await sdk.authenticate(
  credentials: SchillingerCredentials.clerk('your-clerk-token'),
);

// Authenticate with custom token
await sdk.authenticate(
  credentials: SchillingerCredentials.custom('your-custom-token'),
);

// Check authentication status
if (sdk.isAuthenticated) {
  print('SDK is authenticated');
}
```

---

## Rhythm Generation

### Generate Resultant Pattern

The resultant is a fundamental Schillinger technique combining two rhythmic generators.

```dart
// Generate 3 against 4 resultant
final result = await sdk.rhythm.generateResultant(3, 4);

print('Pattern: ${result.pattern}');
print('Notes: ${result.pattern.notes}');
print('Tempo: ${result.pattern.tempo}');
print('Time Signature: ${result.pattern.timeSignature}');

// Access individual notes
for (final note in result.pattern.notes) {
  print('Duration: ${note.duration}, Accent: ${note.accent}');
}
```

### Generate Complex Rhythm

```dart
// Complex rhythm with custom parameters
final complex = await sdk.rhythm.generateComplex(
  ComplexRhythmParams(
    generatorA: 5,
    generatorB: 7,
    complexity: 0.7,  // 0.0 - 1.0
    style: 'jazz',    // classical, jazz, contemporary, experimental
    tempo: 140,
    timeSignature: [3, 4],  // 3/4 time
  ),
);

print('Complex rhythm: ${complex.pattern}');
```

### Analyze Rhythm Pattern

```dart
// Analyze a generated pattern
final analysis = await sdk.rhythm.analyzePattern(result.pattern);

print('Complexity: ${analysis.complexity}');
print('Density: ${analysis.density}');
print('Metadata: ${analysis.metadata}');
```

### Custom Generator Configuration

```dart
// Create generator with custom config
final sdk = await SchillingerSDK.create();

// Access generator with custom config (internal API)
final generator = await RhythmGenerator.create(
  sdk,
  config: RhythmGeneratorConfig(
    defaultTempo: 140,
    defaultComplexity: 0.8,
    defaultSwing: 0.3,  // Swing feel
    defaultTimeSigNum: 6,
    defaultTimeSigDen: 8,
  ),
);

final result = await generator.generateResultant(5, 8);
generator.dispose();
```

---

## Harmony Generation

### Generate Chord Progression

```dart
// Generate in C major, 8 bars
final harmony = await sdk.harmony.generateProgression(
  keyRoot: 'C',
  scaleType: 'major',
  length: 8,
);

print('Chords:');
for (final chord in harmony.progression.chords) {
  print('  ${chord.symbol}: ${chord.notes}');
  print('    Duration: ${chord.duration} bars');
}
```

### Different Keys and Scales

```dart
// F# minor
final harmony1 = await sdk.harmony.generateProgression(
  keyRoot: 'F#',
  scaleType: 'minor',
  length: 12,
);

// Bb major with extended progression
final harmony2 = await sdk.harmony.generateProgression(
  keyRoot: 'Bb',
  scaleType: 'major',
  length: 16,
);
```

---

## Melody Generation

### Generate Melody

```dart
// Generate melody in D major, 16 bars
final melody = await sdk.melody.generate(
  keyRoot: 'D',
  scaleType: 'major',
  lengthBars: 16,
);

print('Melody has ${melody.pattern.notes.length} notes');

// Access melody notes
for (final note in melody.pattern.notes) {
  print('MIDI pitch: ${note.midiPitch}');
  print('Duration: ${note.duration} beats');
  print('Velocity: ${note.velocity}');
}
```

### Melodic Range Control

```dart
// Generate melody and filter by range
final melody = await sdk.melody.generate(
  keyRoot: 'C',
  scaleType: 'major',
  lengthBars: 32,
);

// Filter notes within a specific range
final rangeNotes = melody.pattern.notes.where((note) =>
  note.midiPitch >= 60 && note.midiPitch <= 84  // Middle C to C6
).toList();

print('Notes in range: ${rangeNotes.length}');
```

---

## Composition Generation

### Generate Full Composition

```dart
// Generate multi-layer composition
final composition = await sdk.composition.generate(
  params: {
    'keyRoot': 'C',
    'scaleType': 'major',
    'lengthBars': 64,
    'tempo': 120,
    'timeSignature': [4, 4],
    'rhythmComplexity': 0.7,
    'harmonyDensity': 0.6,
    'melodyComplexity': 0.8,
  },
);

print('Composition generated:');
print('  Rhythm layers: ${composition.composition.rhythm.length}');
print('  Harmony layers: ${composition.composition.harmony.length}');
print('  Melody layers: ${composition.composition.melody.length}');
```

---

## Advanced Usage

### Reusable SDK Instance

```dart
class MusicService {
  SchillingerSDK? _sdk;

  Future<SchillingerSDK> getSDK() async {
    if (_sdk != null) return _sdk!;

    _sdk = await SchillingerSDK.create(
      config: SchillingerConfig.development(),
    );

    await _sdk!.authenticate(
      credentials: SchillingerCredentials.apiKey('key'),
    );

    return _sdk!;
  }

  void dispose() {
    _sdk?.dispose();
    _sdk = null;
  }
}
```

### Batch Processing

```dart
// Generate multiple rhythms efficiently
final sdk = await SchillingerSDK.create(
  config: SchillingerConfig.development(),
);

final generators = [
  [3, 4],
  [5, 7],
  [7, 8],
  [11, 13],
];

final results = await Future.wait(
  generators.map((pair) => sdk.rhythm.generateResultant(pair[0], pair[1])),
);

for (final result in results) {
  print('${result.pattern.metadata}');
}

sdk.dispose();
```

### Cancellation Handling

```dart
// Use timeout for long operations
try {
  final result = await sdk.rhythm.generateComplex(
    ComplexRhythmParams(
      generatorA: 17,
      generatorB: 23,
      complexity: 0.9,
    ),
  ).timeout(
    const Duration(seconds: 5),
    onTimeout: () => throw TimeoutException('Generation timed out'),
  );
} on TimeoutException catch (e) {
  print('Operation timed out: $e');
}
```

---

## Flutter Integration

### Stateful Widget Example

```dart
class SchillingerRhythmWidget extends StatefulWidget {
  @override
  _SchillingerRhythmWidgetState createState() => _SchillingerRhythmWidgetState();
}

class _SchillingerRhythmWidgetState extends State<SchillingerRhythmWidget> {
  SchillingerSDK? _sdk;
  RhythmPattern? _pattern;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializeSDK();
  }

  Future<void> _initializeSDK() async {
    setState(() => _isLoading = true);

    try {
      final sdk = await SchillingerSDK.create(
        config: SchillingerConfig.development(),
      );

      setState(() => _sdk = sdk);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _generateRhythm(int a, int b) async {
    if (_sdk == null) return;

    setState(() => _isLoading = true);

    try {
      final result = await _sdk!.rhythm.generateResultant(a, b);
      setState(() => _pattern = result.pattern);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _sdk?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_isLoading)
          const CircularProgressIndicator()
        else if (_error != null)
          Text('Error: $_error', style: TextStyle(color: Colors.red))
        else
          Column(
            children: [
              ElevatedButton(
                onPressed: () => _generateRhythm(3, 4),
                child: const Text('Generate 3:4 Resultant'),
              ),
              ElevatedButton(
                onPressed: () => _generateRhythm(5, 7),
                child: const Text('Generate 5:7 Resultant'),
              ),
              if (_pattern != null)
                Text('Notes: ${_pattern!.notes.length}'),
            ],
          ),
      ],
    );
  }
}
```

---

## Error Handling

### Comprehensive Error Handling

```dart
import 'package:schillinger_sdk/schillinger_sdk.dart';

Future<void> generateWithRetry() async {
  final sdk = await SchillingerSDK.create(
    config: SchillingerConfig.production(),
  );

  try {
    await sdk.authenticate(
      credentials: SchillingerCredentials.apiKey('key'),
    );

    final result = await sdk.rhythm.generateResultant(3, 4);
    print('Success: ${result.pattern}');

  } on SchillingerException catch (e) {
    switch (e.status) {
      case SchillingerStatus.authFailed:
        print('Authentication failed');
        break;
      case SchillingerStatus.network:
        print('Network error - check connection');
        break;
      case SchillingerStatus.rateLimited:
        print('Rate limited - retry later');
        break;
      case SchillingerStatus.quotaExceeded:
        print('Quota exceeded');
        break;
      default:
        print('Error: ${e.message}');
    }
  } finally {
    sdk.dispose();
  }
}
```

---

## Best Practices

### 1. Always Dispose SDK

```dart
final sdk = await SchillingerSDK.create();
try {
  // Use SDK
} finally {
  sdk.dispose(); // Always dispose
}
```

### 2. Reuse SDK Instances

```dart
// Good: Reuse SDK
final sdk = await SchillingerSDK.create();
final r1 = await sdk.rhythm.generateResultant(3, 4);
final r2 = await sdk.rhythm.generateResultant(5, 7);
sdk.dispose();

// Bad: Create multiple SDKs
final s1 = await SchillingerSDK.create();
final r1 = await s1.rhythm.generateResultant(3, 4);
s1.dispose();

final s2 = await SchillingerSDK.create();
final r2 = await s2.rhythm.generateResultant(5, 7);
s2.dispose();
```

### 3. Handle Errors Gracefully

```dart
try {
  final result = await sdk.rhythm.generateResultant(3, 4);
} on SchillingerException catch (e) {
  // Log error, show user-friendly message
  print('Failed: ${e.message}');
  // Provide fallback or retry
}
```

### 4. Use Appropriate Environment

```dart
// Development
final config = SchillingerConfig.development();

// Staging
final config = SchillingerConfig.staging();

// Production
final config = SchillingerConfig.production();
```

### 5. Authenticate Once

```dart
// Good: Authenticate once
await sdk.authenticate(credentials: creds);
final r1 = await sdk.rhythm.generateResultant(3, 4);
final r2 = await sdk.rhythm.generateResultant(5, 7);

// Bad: Re-authenticate for each call
await sdk.authenticate(credentials: creds);
final r1 = await sdk.rhythm.generateResultant(3, 4);
await sdk.authenticate(credentials: creds);
final r2 = await sdk.rhythm.generateResultant(5, 7);
```

---

## Additional Resources

- [API Documentation](https://pub.dev/documentation/schillinger_sdk)
- [Building from Source](BUILD.md)
- [Examples](../example/)
- [Troubleshooting](../TROUBLESHOOTING.md)
