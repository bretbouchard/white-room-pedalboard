# Schillinger SDK for Swift

A comprehensive Swift SDK for iOS/macOS applications that provides access to the Schillinger System's mathematical music composition capabilities.

## Features

- **Native Swift Implementation**: Built with Swift 5.9+ using modern async/await patterns
- **Comprehensive API Coverage**: Full access to rhythm, harmony, melody, and composition tools
- **Secure Authentication**: Keychain-based credential storage for maximum security
- **Offline Support**: Core mathematical functions work without internet connectivity
- **Error Handling**: Comprehensive error handling with localized messages and recovery suggestions
- **Caching**: Intelligent caching system for improved performance
- **SwiftUI Integration**: ObservableObject support for reactive UI updates
- **Cross-Platform**: Supports iOS 15+, macOS 12+, watchOS 8+, and tvOS 15+

## Installation

### Swift Package Manager

Add the following to your `Package.swift` file:

```swift
dependencies: [
    .package(url: "https://github.com/schillinger/sdk-swift.git", from: "1.0.0")
]
```

Or add it through Xcode:

1. File → Add Package Dependencies
2. Enter the repository URL: `https://github.com/schillinger/sdk-swift.git`
3. Select the version and add to your target

## Quick Start

```swift
import SchillingerSDK

// Initialize the SDK
let sdk = SchillingerSDK()

// Authenticate
let credentials = AuthCredentials(apiKey: "your-api-key")
let authResult = await sdk.authenticate(credentials: credentials)

switch authResult {
case .success(let result):
    print("Authenticated successfully!")

    // Generate a rhythm pattern
    let rhythmResult = await sdk.rhythm.generateResultant(a: 3, b: 2)

    switch rhythmResult {
    case .success(let pattern):
        print("Generated rhythm: \(pattern.durations)")
    case .failure(let error):
        print("Error: \(error.localizedDescription)")
    }

case .failure(let error):
    print("Authentication failed: \(error.localizedDescription)")
}
```

## SwiftUI Integration

The SDK is designed to work seamlessly with SwiftUI:

```swift
import SwiftUI
import SchillingerSDK

struct ContentView: View {
    @StateObject private var sdk = SchillingerSDK()
    @State private var rhythmPattern: RhythmPattern?

    var body: some View {
        VStack {
            if sdk.isAuthenticated {
                Button("Generate Rhythm") {
                    Task {
                        let result = await sdk.rhythm.generateResultant(a: 3, b: 2)
                        if case .success(let pattern) = result {
                            rhythmPattern = pattern
                        }
                    }
                }

                if let pattern = rhythmPattern {
                    Text("Rhythm: \(pattern.durations.map(String.init).joined(separator: ", "))")
                }
            } else {
                Button("Authenticate") {
                    Task {
                        let credentials = AuthCredentials(apiKey: "your-api-key")
                        await sdk.authenticate(credentials: credentials)
                    }
                }
            }
        }
        .padding()
    }
}
```

## API Reference

### Authentication

```swift
// API Key authentication
let credentials = AuthCredentials(apiKey: "your-api-key")

// Clerk token authentication
let credentials = AuthCredentials(clerkToken: "your-clerk-token")

// Custom authentication
let credentials = AuthCredentials(customAuth: ["key": "value"])

// Authenticate
let result = await sdk.authenticate(credentials: credentials)
```

### Rhythm API

```swift
// Generate rhythmic resultant
let pattern = await sdk.rhythm.generateResultant(a: 3, b: 2)

// Generate variations
let variation = await sdk.rhythm.generateVariation(pattern: pattern, type: .augmentation)

// Analyze patterns
let analysis = await sdk.rhythm.analyzePattern(pattern: pattern)

// Reverse analysis - infer generators
let inference = await sdk.rhythm.inferGenerators(pattern: pattern)
```

### Harmony API

```swift
// Generate chord progression
let progression = await sdk.harmony.generateProgression(key: "C", scale: "major", length: 4)

// Analyze progression
let analysis = await sdk.harmony.analyzeProgression(chords: ["C", "Am", "F", "G"])

// Resolve chord in context
let context = HarmonicContext(key: "C", scale: "major")
let resolution = await sdk.harmony.resolveChord(chord: "G7", context: context)
```

### Melody API

```swift
// Generate melody
let params = MelodyGenerationParams(
    key: "C",
    scale: "major",
    length: 8,
    contour: .ascending
)
let melody = await sdk.melody.generateMelody(params: params)

// Generate variations
let variation = await sdk.melody.generateVariations(melody: melody, type: .inversion)

// Analyze melody
let analysis = await sdk.melody.analyzeMelody(melody: melody)
```

### Composition API

```swift
// Create composition
let params = CompositionParams(
    name: "My Composition",
    key: "C",
    scale: "major",
    tempo: 120,
    timeSignature: TimeSignature(numerator: 4, denominator: 4),
    length: 32
)
let composition = await sdk.composition.create(params: params)

// Analyze composition
let analysis = await sdk.composition.analyzeComposition(composition: composition)
```

## Configuration

```swift
let config = SDKConfiguration(
    apiUrl: "https://api.schillinger.ai/v1",
    timeout: 30.0,
    retries: 3,
    cacheEnabled: true,
    offlineMode: false,
    environment: .production,
    debug: false,
    autoRefreshToken: true,
    maxConcurrentRequests: 10
)

let sdk = SchillingerSDK(configuration: config)
```

## Error Handling

The SDK provides comprehensive error handling with localized messages:

```swift
let result = await sdk.rhythm.generateResultant(a: 3, b: 2)

switch result {
case .success(let pattern):
    // Handle success
    print("Generated pattern: \(pattern)")

case .failure(let error):
    // Handle different error types
    switch error.category {
    case .validation:
        print("Validation error: \(error.localizedDescription)")
        print("Suggestions: \(error.suggestions.joined(separator: ", "))")

    case .network:
        print("Network error: \(error.localizedDescription)")

    case .authentication:
        print("Authentication error: \(error.localizedDescription)")

    default:
        print("Error: \(error.localizedDescription)")
    }
}
```

## Offline Support

Many operations work offline:

```swift
// Enable offline mode
sdk.setOfflineMode(true)

// These operations work offline
let rhythmResult = await sdk.rhythm.generateResultant(a: 3, b: 2)
let variation = await sdk.rhythm.generateVariation(pattern: pattern, type: .augmentation)
let validation = await sdk.rhythm.validatePattern(pattern: pattern)
```

## Caching

The SDK includes intelligent caching:

```swift
// Cache is enabled by default
let result = await sdk.rhythm.generateResultant(a: 3, b: 2) // Cached automatically

// Clear cache when needed
sdk.clearCache()

// Get cache statistics
let metrics = sdk.getMetrics()
print("Cache entries: \(metrics.cache.totalEntries)")
```

## Event System

Subscribe to SDK events:

```swift
// Subscribe to authentication events
sdk.on(.auth) { event in
    print("Auth event: \(event.data)")
}

// Subscribe to error events
sdk.on(.error) { event in
    print("Error event: \(event.data)")
}

// Unsubscribe
sdk.off(.auth)
```

## Health Monitoring

Monitor SDK health:

```swift
let healthStatus = await sdk.getHealthStatus()

switch healthStatus.status {
case .healthy:
    print("SDK is healthy")
case .degraded:
    print("SDK is degraded")
case .unhealthy:
    print("SDK is unhealthy")
}

print("Checks: \(healthStatus.checks)")
```

## Requirements

- iOS 15.0+ / macOS 12.0+ / watchOS 8.0+ / tvOS 15.0+
- Swift 5.9+
- Xcode 15.0+

## License

This SDK is licensed under the MIT License. See LICENSE for details.

## Support

For support, please visit our [documentation](https://docs.schillinger.ai) or contact support@schillinger.ai.
