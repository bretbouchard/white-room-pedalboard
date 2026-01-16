# Schillinger SDK - Dart Package

[![pub package](https://img.shields.io/badge/pub-v2.1.0-blue)](https://pub.dev/packages/schillinger_sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-purple)](LICENSE)

Official Dart SDK for the [Schillinger System](https://schillinger.ai) of Musical Composition. Provides type-safe APIs for rhythm, harmony, melody, and composition generation using Schillinger's mathematical techniques.

## Features

- ✅ **Rhythm Generation**: Resultants, complex rhythms, rhythm analysis
- ✅ **Harmony Generation**: Chord progressions, harmonic analysis
- ✅ **Melody Generation**: Melodic patterns, contour-based generation
- ✅ **Composition Generation**: Full multi-layer composition
- ✅ **Type-Safe**: Full Dart type safety with null safety
- ✅ **Native Performance**: FFI-based for performance-critical operations
- ✅ **Flutter Ready**: Works seamlessly with Flutter applications

## Installation

Add this to your package's `pubspec.yaml`:

```yaml
dependencies:
  schillinger_sdk: ^2.1.0
```

Then run:

```bash
flutter pub get
# or
dart pub get
```

## Quick Start

```dart
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() async {
  // Create SDK instance
  final sdk = await SchillingerSDK.create(
    config: SchillingerConfig(
      apiUrl: 'https://api.schillinger.ai/v1',
      environment: SchillingerEnvironment.production,
    ),
  );

  // Authenticate
  await sdk.authenticate(
    credentials: SchillingerCredentials.apiKey('your-api-key'),
  );

  // Generate rhythm resultant
  final rhythm = await sdk.rhythm.generateResultant(3, 4);
  print('Generated rhythm: ${rhythm.pattern}');

  // Generate chord progression
  final harmony = await sdk.harmony.generateProgression(
    keyRoot: 'C',
    scaleType: 'major',
    length: 8,
  );
  print('Chords: ${harmony.progression.chords}');

  // Cleanup
  sdk.dispose();
}
```

## Usage

### SDK Configuration

```dart
// Development (local server)
final sdk = await SchillingerSDK.create(
  config: SchillingerConfig.development(),
);

// Production
final sdk = await SchillingerSDK.create(
  config: SchillingerConfig(
    apiUrl: 'https://api.schillinger.ai/v1',
    environment: SchillingerEnvironment.production,
    timeoutMs: 30000, // Custom timeout
  ),
);
```

### Rhythm Generation

```dart
// Generate resultant pattern (3 against 4)
final rhythm = await sdk.rhythm.generateResultant(3, 4);

// Generate complex rhythm
final complex = await sdk.rhythm.generateComplex(
  ComplexRhythmParams(
    generatorA: 5,
    generatorB: 7,
    complexity: 0.7,
    style: 'jazz',
  ),
);

// Analyze pattern
final analysis = await sdk.rhythm.analyzePattern(rhythm.pattern);
print('Complexity: ${analysis.complexity}');
```

### Harmony Generation

```dart
// Generate chord progression
final harmony = await sdk.harmony.generateProgression(
  keyRoot: 'F#',
  scaleType: 'minor',
  length: 12, // 12 bars
);

print('Progression: ${harmony.progression.chords.map((c) => c.symbol)}');
```

### Melody Generation

```dart
// Generate melody
final melody = await sdk.melody.generate(
  keyRoot: 'Bb',
  scaleType: 'major',
  lengthBars: 16,
);

print('Notes: ${melody.pattern.notes.length}');
```

### Composition Generation

```dart
// Generate full composition
final composition = await sdk.composition.generate(
  params: {
    'keyRoot': 'C',
    'scaleType': 'major',
    'lengthBars': 32,
    'tempo': 120,
  },
);
```

## Memory Management

The SDK uses explicit memory management. Always call `dispose()`:

```dart
final sdk = await SchillingerSDK.create();
try {
  // Use SDK
  final rhythm = await sdk.rhythm.generateResultant(3, 4);
} finally {
  sdk.dispose(); // Release native resources
}
```

## Error Handling

All SDK methods throw `SchillingerException`:

```dart
try {
  final rhythm = await sdk.rhythm.generateResultant(-1, 4);
} on SchillingerException catch (e) {
  print('Error: ${e.message}');
  print('Status: ${e.status}');
  print('Details: ${e.details}');
}
```

## Flutter Integration

### 1. Add to `pubspec.yaml`

```yaml
dependencies:
  flutter:
    sdk: flutter
  schillinger_sdk: ^2.1.0
```

### 2. Use in Flutter Widget

```dart
class RhythmGeneratorWidget extends StatefulWidget {
  @override
  _RhythmGeneratorWidgetState createState() => _RhythmGeneratorWidgetState();
}

class _RhythmGeneratorWidgetState extends State<RhythmGeneratorWidget> {
  SchillingerSDK? _sdk;
  RhythmPattern? _pattern;

  @override
  void initState() {
    super.initState();
    _initSDK();
  }

  Future<void> _initSDK() async {
    final sdk = await SchillingerSDK.create(
      config: SchillingerConfig.development(),
    );
    setState(() => _sdk = sdk);
  }

  Future<void> _generateRhythm() async {
    if (_sdk == null) return;

    final result = await _sdk!.rhythm.generateResultant(3, 4);
    setState(() => _pattern = result.pattern);
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
        ElevatedButton(
          onPressed: _generateRhythm,
          child: Text('Generate Rhythm'),
        ),
        if (_pattern != null)
          Text('Notes: ${_pattern!.notes.length}'),
      ],
    );
  }
}
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Supported | x64 and arm64 |
| Linux    | ✅ Supported | x64 |
| Windows  | ✅ Supported | x64 |
| Android  | 🟡 Planned | ARM64 |
| iOS      | 🟡 Planned | ARM64 |
| Web      | ⏳ Future | WASM compilation |

## Requirements

- Dart SDK: >=3.0.0
- Flutter SDK: >=3.0.0 (for Flutter apps)
- Native library: Included in package

## Examples

See the `example/` directory for complete examples:

- `basic/` - Basic SDK usage
- `flutter/` - Flutter integration
- `advanced/` - Advanced composition techniques

## Performance

Typical performance metrics:

| Operation | Time | Notes |
|-----------|------|-------|
| SDK Initialization | ~50ms | One-time cost |
| Rhythm Generation | ~10ms | FFI + native |
| Harmony Generation | ~15ms | FFI + native |
| Melody Generation | ~20ms | FFI + native |
| Composition Generation | ~50ms | Complex operation |

## Documentation

- [API Reference](https://pub.dev/documentation/schillinger_sdk)
- [Building from Source](BUILD.md)
- [Usage Examples](USAGE.md)
- [Migration Guide from TypeScript](MIGRATION.md)

## Contributing

Contributions are welcome! Please see:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Development Setup](DEVELOPMENT.md)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/schillinger/schillinger-sdk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/schillinger/schillinger-sdk/discussions)
- **Email**: support@schillinger.ai

## Acknowledgments

Based on the **Schillinger System of Musical Composition** by Joseph Schillinger.

Built with ❤️ using Dart FFI and native C++ integration.
