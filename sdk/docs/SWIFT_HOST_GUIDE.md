# Swift Host/Bridge Layer for tvOS

**⚠️ IMPORTANT**: This is NOT an SDK. Swift is a **host and bridge layer** that loads TypeScript via JSCore and passes IR to JUCE.

## Architecture Role

```
Swift (Host & UI)
    ↓ loads JS bundle
TypeScript SDK (via JSCore)
    ↓ emits IR
Swift (Bridge)
    ↓ passes JSON IR
JUCE (Audio Engine)
    ↓ renders
Audio Output
```

**What Swift does:**
- ✅ Load JavaScript bundle via JSCore
- ✅ Manage UI and user interactions
- ✅ Call TypeScript SDK functions
- ✅ Receive IR as JSON
- ✅ Pass IR to JUCE for audio rendering
- ✅ Handle app lifecycle

**What Swift does NOT do (on tvOS):**
- ❌ Implement music generation logic
- ❌ Make network calls
- ❌ Use authentication
- ❌ Make compositional decisions
- ❌ Expose "RhythmAPI", "HarmonyAPI", etc.

---

## Platform Support

### tvOS (Primary Target - Local-Only)

- ✅ JSCore embedding
- ✅ IR bridging to JUCE
- ✅ SwiftUI for UI
- ❌ No networking
- ❌ No authentication
- ❌ No cloud features

### macOS / iOS (Full Features - Optional)

For non-tvOS platforms, Swift can optionally include:
- ✅ Networking (REST API)
- ✅ Authentication (OAuth, API keys)
- ✅ Real-time collaboration (WebSockets)
- ✅ Cloud sync

**Use compile-time flags to gate these features:**

```swift
#if !os(tvOS)
  // Networking code only on macOS/iOS
  import Networking
#endif
```

---

## Quick Start (tvOS)

### 1. Basic Setup

```swift
import SwiftUI
import JavaScriptCore

struct ContentView: View {
    @StateObject private var musicHost = SchillingerMusicHost()

    var body: some View {
        VStack {
            Button("Generate Pattern") {
                musicHost.generateAndPlay()
            }

            Text(musicHost.statusText)
        }
        .onAppear {
            musicHost.initialize()
        }
    }
}
```

### 2. Host Class

```swift
import Foundation
import JavaScriptCore

@MainActor
class SchillingerMusicHost: ObservableObject {
    @Published var statusText = "Ready"
    @Published var isPlaying = false

    private var jsHost: SchillingerHost?
    private var juceEngine: JUCEAudioEngine?

    func initialize() {
        // Initialize JSCore host
        guard let host = SchillingerHost() else {
            statusText = "Failed to initialize JSCore"
            return
        }
        self.jsHost = host

        // Initialize JUCE audio
        self.juceEngine = JUCEAudioEngine()
        juceEngine?.initialize()

        statusText = "Ready to play"
    }

    func generateAndPlay() {
        guard let host = jsHost else { return }

        // 1. Generate pattern IR from TypeScript
        guard let irJson = host.generatePattern(
            primary: 3,
            secondary: 4,
            bars: 16
        ) else {
            statusText = "Failed to generate pattern"
            return
        }

        // 2. Parse IR
        guard let ir = host.parsePatternIR(jsonString: irJson) else {
            statusText = "Failed to parse IR"
            return
        }

        // 3. Pass to JUCE
        guard let engine = juceEngine else { return }

        let success = engine.loadPattern(ir)
        if !success {
            statusText = "JUCE failed to load pattern"
            return
        }

        // 4. Start playback
        engine.start()
        isPlaying = true
        statusText = "Playing: \(ir.id)"
    }
}
```

---

## Core Components

### 1. SchillingerHost (JSCore Loader)

```swift
import Foundation
import JavaScriptCore

class SchillingerHost {
    private let context: JSContext
    private var sdkObject: JSValue?

    init?() {
        // Create JS context
        self.context = JSContext()!

        // Set up exception handler
        context.exceptionHandler = { context, exception in
            print("[JSCore] Exception: \(exception?.toString() ?? "unknown")")
        }

        // Load bundled JavaScript
        guard let bundlePath = Bundle.main.path(
            forResource: "schillinger-sdk",
            ofType: "js"
        ) else {
            print("[Host] Failed to find bundle")
            return nil
        }

        guard let bundle = try? String(contentsOfFile: bundlePath) else {
            print("[Host] Failed to load bundle")
            return nil
        }

        // Evaluate bundle
        let result = context.evaluateScript(bundle)
        if result?.isNull ?? true {
            print("[Host] Failed to evaluate bundle")
            return nil
        }

        // Get SDK reference
        setupSDKReferences()
    }

    private func setupSDKReferences() {
        self.sdkObject = context.objectForKeyedSubscript("SchillingerSDK")
    }

    // MARK: - Public API

    /// Generate pattern using TypeScript SDK
    func generatePattern(
        primary: Int,
        secondary: Int,
        bars: Int
    ) -> String? {
        guard let sdk = sdkObject else { return nil }

        // Get rhythm API
        let rhythm = sdk.objectForKeyedSubscript("rhythm")
        guard let rhythmAPI = rhythm, !rhythmAPI.isUndefined else {
            print("[Host] Rhythm API not found")
            return nil
        }

        // Get generateResultant method
        let generate = rhythmAPI.objectForKeyedSubscript("generateResultant")
        guard let generateFn = generate, !generateFn.isUndefined else {
            print("[Host] generateResultant not found")
            return nil
        }

        // Build params
        let params: [String: Any] = [
            "generator": "resultant",
            "primary": primary,
            "secondary": secondary,
            "bars": bars,
        ]

        let jsParams = JSValue(object: params, in: context)!

        // Call method
        let result = generateFn.call(withArguments: [jsParams])

        // Return IR as JSON string
        return result?.toString()
    }

    /// Parse IR JSON into Swift struct
    func parsePatternIR(jsonString: String) -> PatternIR? {
        guard let data = jsonString.data(using: .utf8) else {
            return nil
        }

        do {
            return try JSONDecoder().decode(PatternIR.self, from: data)
        } catch {
            print("[Host] Failed to decode IR: \(error)")
            return nil
        }
    }
}
```

### 2. PatternIR Model

```swift
struct PatternIR: Codable {
    let version: String
    let id: String
    let type: String
    let events: [Event]

    struct Event: Codable {
        let time: Double
        let pitch: Int
        let velocity: Int
        let duration: Double
    }
}
```

### 3. JUCE Audio Engine Bridge

```swift
import Foundation

class JUCEAudioEngine {
    private var engineRef: OpaquePointer?

    func initialize() {
        // Initialize JUCE audio engine
        // This would call into the JUCE C++ API
        // Implementation depends on your JUCE setup
    }

    func loadPattern(_ ir: PatternIR) -> Bool {
        // Serialize IR to JSON
        guard let irData = try? JSONEncoder().encode(ir),
              let irJson = String(data: irData, encoding: .utf8) else {
            return false
        }

        // Pass IR to JUCE
        // Assuming C API:
        // let patternRef = SchillingerLoadPatternIR(irJson)
        // engineRef = SchillingerCreateEngine(patternRef)

        return true
    }

    func start() {
        // Start audio playback
    }

    func stop() {
        // Stop audio playback
    }
}
```

---

## SwiftUI Integration

### Observable Pattern

```swift
import SwiftUI

@MainActor
class MusicViewModel: ObservableObject {
    @Published var generatedPattern: PatternIR?
    @Published var isPlaying = false
    @Published var errorMessage: String?

    private let host = SchillingerHost()
    private let audio = JUCEAudioEngine()

    func generatePattern() {
        Task {
            do {
                // Generate from TypeScript
                guard let irJson = host.generatePattern(
                    primary: 3,
                    secondary: 4,
                    bars: 16
                ) else {
                    throw HostError.generationFailed
                }

                // Parse IR
                guard let ir = host.parsePatternIR(jsonString: irJson) else {
                    throw HostError.parseFailed
                }

                // Update UI
                await MainActor.run {
                    self.generatedPattern = ir
                }

            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }

    func playPattern() {
        guard let ir = generatedPattern else { return }

        let success = audio.loadPattern(ir)
        if success {
            audio.start()
            isPlaying = true
        }
    }
}
```

### UI Example

```swift
struct MusicGeneratorView: View {
    @StateObject private var viewModel = MusicViewModel()

    var body: some View {
        VStack(spacing: 20) {
            // Pattern Display
            if let pattern = viewModel.generatedPattern {
                Text("Pattern: \(pattern.id)")
                    .font(.headline)
                Text("Events: \(pattern.events.count)")
                    .font(.caption)
            }

            // Controls
            Button("Generate Pattern") {
                viewModel.generatePattern()
            }
            .buttonStyle(.borderedProminent)

            Button("Play") {
                viewModel.playPattern()
            }
            .disabled(viewModel.generatedPattern == nil || viewModel.isPlaying)

            // Status
            if viewModel.isPlaying {
                Text("Playing...")
                    .foregroundColor(.green)
            }

            // Error Display
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }
        }
        .padding()
    }
}
```

---

## Compile-Time Platform Gates

### tvOS vs Other Platforms

```swift
import Foundation

enum PlatformFeatures {
    static var isTVOS: Bool {
        #if os(tvOS)
        return true
        #else
        return false
        #endif
    }

    static var supportsNetworking: Bool {
        !isTVOS  // Networking disabled on tvOS
    }

    static var supportsAuthentication: Bool {
        !isTVOS  // Auth disabled on tvOS
    }
}

// Usage
class NetworkManager {
    func fetchData() async throws {
        guard PlatformFeatures.supportsNetworking else {
            throw PlatformError.networkingDisabled
        }

        // Networking code here...
    }
}
```

### Build Configuration

Add to your Xcode project:

**tvOS Target (Debug + Release):**
- ❌ Exclude: Networking, Auth, Collaboration modules
- ✅ Include: JSCore loading, IR parsing, UI

**macOS/iOS Target (Optional):**
- ✅ Include: All modules including networking

---

## Testing

### Unit Tests

```swift
import XCTest
@testable import SchillingerHost

class SchillingerHostTests: XCTestCase {
    func testJSCoreInitialization() {
        let host = SchillingerHost()
        XCTAssertNotNil(host)
    }

    func testPatternGeneration() {
        let host = SchillingerHost()
        let result = host.generatePattern(
            primary: 3,
            secondary: 4,
            bars: 16
        )

        XCTAssertNotNil(result)

        // Verify it's valid JSON
        if let data = result?.data(using: .utf8) {
            let json = try? JSONSerialization.jsonObject(with: data)
            XCTAssertNotNil(json)
        }
    }

    func testIRParsing() {
        let host = SchillingerHost()

        let json = """
        {
            "version": "1.0",
            "id": "test-123",
            "type": "resultant",
            "events": []
        }
        """

        let ir = host.parsePatternIR(jsonString: json)
        XCTAssertNotNil(ir)
        XCTAssertEqual(ir?.id, "test-123")
    }
}
```

### Integration Tests

```swift
class IntegrationTests: XCTestCase {
    func testEndToEndFlow() {
        let expectation = XCTestExpectation(description: "Generate and play")

        let host = SchillingerHost()
        let audio = JUCEAudioEngine()

        // Generate
        guard let irJson = host.generatePattern(
            primary: 3,
            secondary: 4,
            bars: 8
        ) else {
            XCTFail("Failed to generate IR")
            return
        }

        // Parse
        guard let ir = host.parsePatternIR(jsonString: irJson) else {
            XCTFail("Failed to parse IR")
            return
        }

        // Load into JUCE
        let success = audio.loadPattern(ir)
        XCTAssertTrue(success)

        expectation.fulfill()
        wait(for: [expectation], timeout: 5.0)
    }
}
```

---

## Migration from Old "SDK" Pattern

If you have code using the old Swift SDK:

**OLD (deprecated):**
```swift
let sdk = SchillingerSDK()
sdk.authenticate(apiKey: "key")
let pattern = sdk.rhythm.generateResultant(a: 3, b: 4)
```

**NEW (correct):**
```swift
// Load TypeScript SDK via JSCore
let host = SchillingerHost()

// Get IR from TypeScript
let irJson = host.generatePattern(primary: 3, secondary: 4, bars: 16)
let ir = host.parsePatternIR(jsonString: irJson)

// Pass IR to JUCE for rendering
let audio = JUCEAudioEngine()
audio.loadPattern(ir)
audio.start()
```

---

## Performance Best Practices

### 1. Reuse JSCore Context

```swift
class SchillingerHost {
    static let shared = SchillingerHost()

    private init?() {
        // Expensive initialization
        // Only done once
    }
}
```

### 2. Background Processing

```swift
func generatePatternAsync(
    primary: Int,
    secondary: Int,
    bars: Int
) async throws -> PatternIR {
    return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                guard let irJson = self.generatePattern(
                    primary: primary,
                    secondary: secondary,
                    bars: bars
                ) else {
                    throw HostError.generationFailed
                }

                guard let ir = self.parsePatternIR(jsonString: irJson) else {
                    throw HostError.parseFailed
                }

                continuation.resume(returning: ir)
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}
```

### 3. IR Caching

```swift
class IRCache {
    private var cache: [String: PatternIR] = [:]

    func get(_ key: String) -> PatternIR? {
        return cache[key]
    }

    func set(_ key: String, ir: PatternIR) {
        cache[key] = ir
    }
}
```

---

## Common Patterns

### Async/Await Integration

```swift
// TypeScript SDK exports async-compatible functions
// (Returns promises that Swift can await)

func generateAndAwait() async throws -> PatternIR {
    let host = SchillingerHost()

    // Wrap synchronous call in async context
    return try await withCheckedThrowingContinuation { continuation in
        guard let irJson = host.generatePattern(
            primary: 3,
            secondary: 4,
            bars: 16
        ) else {
            continuation.resume(throwing: HostError.generationFailed)
            return
        }

        guard let ir = host.parsePatternIR(jsonString: irJson) else {
            continuation.resume(throwing: HostError.parseFailed)
            return
        }

        continuation.resume(returning: ir)
    }
}
```

### Combine Integration

```swift
import Combine

class MusicGenerator: ObservableObject {
    @Published var pattern: PatternIR?
    @Published var error: Error?

    private let host = SchillingerHost()
    private var cancellables = Set<AnyCancellable>()

    func generate(pattern: PatternParams) {
        // Use Future for async wrapping
        let future = Future<PatternIR, Error> { promise in
            guard let irJson = self.host.generatePattern(
                primary: pattern.primary,
                secondary: pattern.secondary,
                bars: pattern.bars
            ) else {
                promise(.failure(HostError.generationFailed))
                return
            }

            guard let ir = self.host.parsePatternIR(jsonString: irJson) else {
                promise(.failure(HostError.parseFailed))
                return
            }

            promise(.success(ir))
        }

        future
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        self.error = error
                    }
                },
                receiveValue: { [weak self] ir in
                    guard let self = self else { return }
                    self.pattern = ir
                }
            )
            .store(in: &cancellables)
    }
}
```

---

## Error Handling

### Swift Errors

```swift
enum HostError: LocalizedError {
    case initializationFailed
    case generationFailed
    case parseFailed
    case juceUnavailable
    case networkingDisabled

    var errorDescription: String? {
        switch self {
        case .initializationFailed:
            return "Failed to initialize JSCore"
        case .generationFailed:
            return "Failed to generate pattern"
        case .parseFailed:
            return "Failed to parse IR"
        case .juceUnavailable:
            return "JUCE audio engine unavailable"
        case .networkingDisabled:
            return "Networking is disabled on tvOS"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .initializationFailed:
            return "Ensure JavaScript bundle is included in app"
        case .generationFailed:
            return "Check TypeScript SDK is properly bundled"
        case .parseFailed:
            return "Verify IR format matches expected schema"
        case .juceUnavailable:
            return "Check JUCE framework is linked"
        case .networkingDisabled:
            return "This feature requires macOS/iOS (not available on tvOS)"
        }
    }
}
```

---

## Security Considerations

### 1. No Arbitrary Code Execution

Only load JavaScript that was bundled with the app:

```swift
guard Bundle.main.path(forResource: "schillinger-sdk", ofType: "js") != nil else {
    fatalError("Missing required JavaScript bundle")
}
```

### 2. Validate IR

```swift
func validateIR(_ ir: PatternIR) -> Bool {
    // Check version
    guard ir.version == "1.0" else {
        print("[Security] Unknown IR version: \(ir.version)")
        return false
    }

    // Check event count (prevent DoS)
    guard ir.events.count <= 10000 else {
        print("[Security] Suspiciously large event count")
        return false
    }

    // Validate event data
    for event in ir.events {
        guard event.time >= 0,
              event.pitch >= 0 && event.pitch <= 127,
              event.velocity >= 0 && event.velocity <= 127,
              event.duration > 0 else {
            print("[Security] Invalid event data")
            return false
        }
    }

    return true
}
```

---

## Troubleshooting

### "JavaScript bundle not found"

**Problem**: App can't find the .js bundle.

**Solutions**:
1. Add `schillinger-sdk.js` to app bundle in "Build Phases"
2. Verify file is in "Copy Bundle Resources"
3. Check file is in target membership

### "Function not found in JSCore"

**Problem**: Swift can't find the TypeScript SDK function.

**Solutions**:
1. Verify TypeScript SDK is properly exported to global scope
2. Check JavaScript bundle evaluation succeeded
3. Use Safari Web Inspector to debug JSCore

### "IR parsing failed"

**Problem**: JSON from TypeScript doesn't match Swift struct.

**Solutions**:
1. Log raw JSON to verify structure
2. Compare TypeScript IR types with Swift Codable structs
3. Use `JSONSerialization.jsonObject` to inspect

---

## Related Documentation

- **Architecture Authority**: [ARCHITECTURE_AUTHORITY.md](ARCHITECTURE_AUTHORITY.md)
- **JSCore Embedding**: [JSCORE_EMBEDDING.md](JSCORE_EMBEDDING.md)
- **Build Guide**: [TVOS_BUILD_GUIDE.md](TVOS_BUILD_GUIDE.md)

---

## Migration Checklist

When updating Swift code to tvOS host/bridge pattern:

- [ ] Remove all "SDK" branding
- [ ] Add JSCore loading
- [ ] Remove network/auth calls (tvOS only)
- [ ] Implement IR parsing
- [ ] Add JUCE bridge
- [ ] Update SwiftUI to use host pattern
- [ ] Add compile-time gates for platform features
- [ ] Write tests for JSCore integration
- [ ] Test end-to-end flow (TS → Swift → JUCE)

---

**Status**: Active Development
**Last Updated**: 2025-12-31
**Branch**: tvOS
