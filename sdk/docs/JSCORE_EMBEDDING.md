# JavaScriptCore Embedding Guide

**Platform**: Apple tvOS (macOS, iOS compatible)
**Last Updated**: 2025-12-31
**Branch**: tvOS

---

## Overview

JavaScriptCore (JSCore) is the embedded JavaScript engine that powers WebKit on Apple platforms. For tvOS, we use JSCore to execute the TypeScript SDK and bridge between Swift, TypeScript, and JUCE.

## Architecture Flow

```
Swift (Host Layer)
    ↓ loads JS bundle
JavaScriptCore (Execution Engine)
    ↓ executes TypeScript SDK
TypeScript SDK (Generates IR)
    ↓ serializes to JSON
Swift (Bridge Layer)
    ↓ passes JSON to C++
JUCE (Audio Engine)
    ↓ renders audio
Audio Output
```

---

## Setup: Swift Side

### 1. Import JavaScriptCore

```swift
import JavaScriptCore
```

### 2. Create JSCore Host Class

```swift
import Foundation
import JavaScriptCore

class SchillingerHost: NSObject {
    // JS context
    private let context: JSContext!

    // Loaded JS bundle
    private let jsBundle: String

    // Reference to TS SDK object
    private var sdkObject: JSValue?

    init?(bundleFile: String = "schillinger-sdk") {
        super.init()

        // Create JS context
        self.context = JSContext()!

        // Configure exception handling
        self.context.exceptionHandler = { context, exception in
            print("[JSCore] Exception: \(exception?.toString() ?? "unknown")")
        }

        // Load bundled JS
        guard let bundlePath = Bundle.main.path(forResource: bundleFile, ofType: "js") else {
            print("[JSCore] Failed to find bundle: \(bundleFile).js")
            return nil
        }

        do {
            self.jsBundle = try String(contentsOfFile: bundlePath)
        } catch {
            print("[JSCore] Failed to load bundle: \(error)")
            return nil
        }

        // Evaluate the bundle
        let evalResult = context.evaluateScript(jsBundle)
        if evalResult?.isNull ?? true {
            print("[JSCore] Failed to evaluate bundle")
            return nil
        }

        // Get reference to SDK object
        setupSDKReferences()
    }

    private func setupSDKReferences() {
        // Get the SchillingerSDK object from global scope
        self.sdkObject = context.objectForKeyedSubscript("SchillingerSDK")

        if sdkObject?.isNull ?? true {
            print("[JSCore] Warning: SchillingerSDK not found in global scope")
        }
    }
}
```

---

## Calling TypeScript SDK from Swift

### Pattern 1: Direct Function Call

```swift
// TypeScript SDK exposes global function
// generatePattern(primary: number, secondary: number, bars: number): PatternIR

func generatePattern(primary: Int, secondary: Int, bars: Int) -> String? {
    guard let context = self.context else { return nil }

    // Get the function
    let generateFn = context.objectForKeyedSubscript("generatePattern")
    guard let fn = generateFn, !fn.isUndefined else {
        print("[JSCore] Function 'generatePattern' not found")
        return nil
    }

    // Call with arguments
    let result = fn.call(withArguments: [primary, secondary, bars])

    // Convert result to JSON string
    return result?.toString()
}
```

### Pattern 2: SDK Method Call

```swift
// TypeScript SDK class instance method
// sdk.rhythm.generateResultant(params): ResultantIR

func generateResultant(params: ResultantParams) -> String? {
    guard let sdk = sdkObject else { return nil }

    // Get rhythm API
    let rhythm = sdk.objectForKeyedSubscript("rhythm")
    guard let rhythmAPI = rhythm, !rhythmAPI.isUndefined else {
        print("[JSCore] Rhythm API not found")
        return nil
    }

    // Get generateResultant method
    let generate = rhythmAPI.objectForKeyedSubscript("generateResultant")
    guard let generateFn = generate, !generateFn.isUndefined else {
        print("[JSCore] Method 'generateResultant' not found")
        return nil
    }

    // Convert params to JS object
    let jsParams = convertToJS(params)

    // Call method
    let result = generateFn.call(withArguments: [jsParams])

    return result?.toString()
}

private func convertToJS(_ value: Any) -> JSValue {
    let dict = value as? [String: Any] ?? [:]
    return JSValue(object: dict, in: context)!
}
```

---

## Receiving IR from TypeScript

### IR Deserialization

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

func parsePatternIR(jsonString: String) -> PatternIR? {
    guard let data = jsonString.data(using: .utf8) else {
        print("[JSCore] Failed to convert JSON to data")
        return nil
    }

    do {
        return try JSONDecoder().decode(PatternIR.self, from: data)
    } catch {
        print("[JSCore] Failed to decode IR: \(error)")
        return nil
    }
}
```

---

## Passing IR to JUCE

### C++ Bridge

```swift
// Swift → C++ Bridge
// Assuming JUCE exposes C functions with C API

// In Swift:
typealias PatternIRRef = OpaquePointer

@_silgen_name("SchillingerLoadPatternIR")
func SchillingerLoadPatternIR(_ json: CString) -> PatternIRRef

@_silgen_name("SchillingerStartPlayback")
func SchillingerStartPlayback(_ patternRef: PatternIRRef)

func loadPatternIntoJUCE(ir: PatternIR) -> Bool {
    // Serialize IR to JSON
    guard let irData = try? JSONEncoder().encode(ir),
          let irJson = String(data: irData, encoding: .utf8) else {
        print("[JSCore] Failed to encode IR")
        return false
    }

    // Pass to JUCE
    let patternRef = SchillingerLoadPatternIR(irJson)

    if patternRef == nil {
        print("[JSCore] JUCE failed to load IR")
        return false
    }

    // Start playback
    SchillingerStartPlayback(patternRef)

    return true
}
```

---

## Complete Example: End-to-End Flow

```swift
import Foundation
import JavaScriptCore

class TvOSMusicEngine {
    private let host: SchillingerHost
    private let juceAudio: JUCEAudioEngine

    init() {
        // Initialize JSCore host
        guard let host = SchillingerHost(bundleFile: "schillinger-sdk") else {
            fatalError("Failed to initialize SchillingerHost")
        }
        self.host = host

        // Initialize JUCE audio
        self.juceAudio = JUCEAudioEngine()
    }

    func generateAndPlay() {
        // 1. Generate pattern IR from TypeScript SDK
        guard let irJson = host.generatePattern(
            primary: 3,
            secondary: 4,
            bars: 16
        ) else {
            print("[Engine] Failed to generate pattern")
            return
        }

        // 2. Parse IR
        guard let ir = host.parsePatternIR(jsonString: irJson) else {
            print("[Engine] Failed to parse IR")
            return
        }

        // 3. Pass IR to JUCE
        let success = juceAudio.loadPattern(ir)
        if !success {
            print("[Engine] JUCE failed to load pattern")
            return
        }

        // 4. Start playback
        juceAudio.start()

        print("[Engine] Playing: \(ir.id)")
    }
}
```

---

## Error Handling

### Swift Side

```swift
enum JSCoreError: Error {
    case bundleLoadFailed
    case evaluationFailed
    case functionNotFound(String)
    case runtimeError(String)
    case invalidIR
}

class SchillingerHost {
    func callFunction(_ name: String, arguments: [Any]) throws -> JSValue {
        guard let context = self.context else {
            throw JSCoreError.evaluationFailed
        }

        let fn = context.objectForKeyedSubscript(name)
        guard let function = fn, !function.isUndefined else {
            throw JSCoreError.functionNotFound(name)
        }

        let result = function.call(withArguments: arguments)

        if let error = result?.objectForKeyedSubscript("error"), !error.isUndefined {
            let errorMessage = error.toString()
            throw JSCoreError.runtimeError(errorMessage)
        }

        return result!
    }
}
```

### TypeScript Side

```typescript
// packages/core/src/tvos-errors.ts

export interface JSCoreResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function wrapForJSCore<T>(
  fn: () => T
): JSCoreResponse<T> {
  try {
    return {
      success: true,
      data: fn(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage in exported functions
(global as any).generatePattern = (
  primary: number,
  secondary: number,
  bars: number
): JSCoreResponse<PatternIR> => {
  return wrapForJSCore(() => {
    const sdk = new SchillingerSDK();
    return sdk.rhythm.generateResultant({
      generator: 'resultant',
      primary,
      secondary,
      bars,
    });
  });
};
```

---

## Memory Management

### Object Lifecycle

```swift
class SchillingerHost {
    private var managedObjects: Set<JSManagedValue> = []

    func retainJSValue(_ value: JSValue) {
        // Use JSManagedValue to keep JS objects alive
        let managed = JSManagedValue(value: value)
        managedObjects.insert(managed)
    }

    func cleanup() {
        // Release retained objects
        managedObjects.removeAll()

        // Clear context
        context = nil
        sdkObject = nil
    }

    deinit {
        cleanup()
    }
}
```

---

## Performance Optimization

### 1. Bundle Caching

```swift
class SchillingerHost {
    private static var cachedBundle: String?

    init?(bundleFile: String = "schillinger-sdk") {
        // Use cached bundle if available
        if let cached = Self.cachedBundle {
            self.jsBundle = cached
        } else {
            // Load and cache
            guard let bundlePath = Bundle.main.path(forResource: bundleFile, ofType: "js") else {
                return nil
            }

            guard let bundle = try? String(contentsOfFile: bundlePath) else {
                return nil
            }

            Self.cachedBundle = bundle
            self.jsBundle = bundle
        }

        // Continue initialization...
    }
}
```

### 2. Lazy Initialization

```swift
class SchillingerHost {
    private lazy var sdkObject: JSValue? = {
        return self.context.objectForKeyedSubscript("SchillingerSDK")
    }()

    // Use sdkObject - it will only be created once
}
```

### 3. Reuse JSContext

```swift
class SchillingerHost {
    // Singleton pattern
    static let shared = SchillingerHost()

    // Reuse same context across app lifecycle
    private let context: JSContext = {
        let ctx = JSContext()!
        // Configure...
        return ctx
    }()
}
```

---

## Debugging

### Console Logging from JavaScript

```swift
class SchillingerHost {
    private func setupLogging() {
        // Override console.log
        let consoleLog: @convention(block) (JSValue) -> Void = { args in
            print("[JS Console]", args.toString())
        }

        let consoleLogFn = JSValue(object: consoleLog, in: context)
        context.objectForKeyedSubscript("console")?.objectForKeyedSubscript("log") = consoleLogFn

        // Override console.error
        let consoleError: @convention(block) (JSValue) -> Void = { args in
            print("[JS Error]", args.toString())
        }

        let consoleErrorFn = JSValue(object: consoleError, in: context)
        context.objectForKeyedSubscript("console")?.objectForKeyedSubscript("error") = consoleErrorFn
    }
}
```

### Script Evaluation Timing

```swift
func evaluateWithTiming(_ script: String) -> JSValue? {
    let start = CFAbsoluteTimeGetCurrent()

    let result = context.evaluateScript(script)

    let elapsed = CFAbsoluteTimeGetCurrent() - start
    print("[JSCore] Evaluated script in \(elapsed * 1000)ms")

    return result
}
```

---

## Testing JSCore Integration

### Unit Tests

```swift
import XCTest
@testable import tvOSApp

class JSCoreTests: XCTestCase {
    func testJSContextCreation() {
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

        let irJson = """
        {
            "version": "1.0",
            "id": "test-123",
            "type": "resultant",
            "events": [
                {
                    "time": 0.0,
                    "pitch": 60,
                    "velocity": 127,
                    "duration": 0.5
                }
            ]
        }
        """

        let ir = host.parsePatternIR(jsonString: irJson)
        XCTAssertNotNil(ir)
        XCTAssertEqual(ir?.id, "test-123")
        XCTAssertEqual(ir?.events.count, 1)
    }
}
```

---

## Common Patterns

### Async Operations

```swift
func generatePatternAsync(
    primary: Int,
    secondary: Int,
    bars: Int,
    completion: @escaping (Result<String, Error>) -> Void
) {
    DispatchQueue.global(qos: .userInitiated).async {
        do {
            let result = try self.generatePattern(
                primary: primary,
                secondary: secondary,
                bars: bars
            )

            DispatchQueue.main.async {
                completion(.success(result))
            }
        } catch {
            DispatchQueue.main.async {
                completion(.failure(error))
            }
        }
    }
}
```

### Event Streaming

```typescript
// TypeScript SDK side
export interface EventStream {
  start(): void;
  stop(): void;
  onEvent(callback: (event: PatternEvent) => void): void;
}

// Create event stream for JSCore
(global as any).createEventStream = (): EventStream => {
  const sdk = new SchillingerSDK();
  return sdk.realtime.createEmitter();
};
```

```swift
// Swift side
class SchillingerHost {
    func createEventStream() -> EventStreamHandle? {
        let createStreamFn = context.objectForKeyedSubscript("createEventStream")
        guard let fn = createStreamFn, !fn.isUndefined else {
            return nil
        }

        let stream = fn.call(withArguments: [])
        return EventStreamHandle(jsValue: stream)
    }
}

class EventStreamHandle {
    private let jsValue: JSValue

    init(jsValue: JSValue) {
        self.jsValue = jsValue
    }

    func start() {
        jsValue?.invokeMethod("start", withArguments: [])
    }

    func stop() {
        jsValue?.invokeMethod("stop", withArguments: [])
    }

    func onEvent(callback: @escaping (PatternEvent) -> Void) {
        let callbackFn: @convention(block) (JSValue) -> Void = { event in
            guard let data = event.toData() else { return }
            let event = try? JSONDecoder().decode(PatternEvent.self, from: data)
            if let event = event {
                callback(event)
            }
        }

        let jsCallback = JSValue(object: callbackFn, in: jsValue?.context)
        jsValue?.invokeMethod("onEvent", withArguments: [jsCallback])
    }
}
```

---

## Security Considerations

### 1. Code Signing

JSCore bundles should be signed and validated:

```swift
func validateBundleSignature(_ bundlePath: String) -> Bool {
    // Implement code signature verification
    // This prevents tampering with the bundled JS
    return true  // Placeholder
}
```

### 2. Sandbox Restrictions

tvOS has strict sandboxing. JSCore cannot:

- ❌ Access network directly
- ❌ Access file system (except app container)
- ❌ Spawn processes
- ❌ Access camera/microphone without permission

### 3. Memory Limits

Monitor memory usage:

```swift
func checkMemoryPressure() {
    let memory = context.objectForKeyedSubscript("getMemoryUsage")?
        .call(withArguments: [])

    if let usage = memory?.toNumber() {
        print("[JSCore] Memory usage: \(usage) bytes")

        if usage > 50_000_000 {  // 50MB
            print("[JSCore] WARNING: High memory usage")
        }
    }
}
```

---

## Best Practices

### ✅ DO

- ✅ Cache JSCore context for reuse
- ✅ Use typed JSON for IR exchange
- ✅ Handle errors on both Swift and JS sides
- ✅ Test with realistic IR payloads
- ✅ Monitor memory usage
- ✅ Use JSManagedValue for object retention

### ❌ DON'T

- ❌ Create new JSCore contexts frequently
- ❌ Pass Swift objects directly to JS (use JSON)
- ❌ Ignore error handling
- ❌ Assume JS functions exist (check first)
- ❌ Block main thread with JS evaluation
- ❌ Forget to release retained JS values

---

## Troubleshooting

### "Function not found in JSCore"

**Problem**: Swift can't find the JavaScript function.

**Solutions**:
1. Check function is exported in TypeScript:
   ```typescript
   (global as any).myFunction = () => { ... };
   ```
2. Verify bundle evaluation succeeded
3. Check console for JavaScript errors

### "IR parsing failed"

**Problem**: JSON from TypeScript doesn't match Swift struct.

**Solutions**:
1. Verify JSON structure matches TypeScript types
2. Add logging to see actual JSON
3. Use `JSONSerialization.jsonObject` to inspect

### "Memory usage increasing"

**Problem**: JSCore memory keeps growing.

**Solutions**:
1. Release unused JSManagedValue references
2. Don't create new JSCore contexts repeatedly
3. Clear unused variables in JS:
   ```javascript
   delete largeVariable;
   ```

---

## Related Documentation

- **Architecture Authority**: [ARCHITECTURE_AUTHORITY.md](ARCHITECTURE_AUTHORITY.md)
- **Build Guide**: [TVOS_BUILD_GUIDE.md](TVOS_BUILD_GUIDE.md)
- **Swift Integration**: [SWIFT_HOST_GUIDE.md](SWIFT_HOST_GUIDE.md) (to be created)

---

## References

- [Apple JavaScriptCore Framework](https://developer.apple.com/documentation/javascriptcore)
- [JSContext Class Reference](https://developer.apple.com/documentation/javascriptcore/jscontext)
- [Working with JavaScript in Swift](https://developer.apple.com/documentation/swift/1419-working-with-javascript-in-swift)

---

**Status**: Active Development
**Last Updated**: 2025-12-31
**Branch**: tvOS
