# White Room Error Handling System

## Overview

The White Room error handling system provides comprehensive error management across all layers of the application - from the JUCE C++ backend through the FFI bridge to the Swift frontend. This document serves as the complete reference for error handling patterns, best practices, and error codes.

## Table of Contents

1. [Architecture](#architecture)
2. [Error Categories](#error-categories)
3. [Error Severity Levels](#error-severity-levels)
4. [Platform-Specific Implementation](#platform-specific-implementation)
5. [Error Code Reference](#error-code-reference)
6. [Best Practices](#best-practices)
7. [Common Scenarios](#common-scenarios)
8. [Testing](#testing)

---

## Architecture

### Three-Layer Error Handling

```
┌─────────────────────────────────────────────────────────┐
│                    Swift Frontend                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ErrorBoundary (SwiftUI Component)                │  │
│  │  - Catches rendering errors                      │  │
│  │  - Displays user-friendly error UI                │  │
│  │  - Offers recovery actions                        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ErrorLogger (Structured Logging)                  │  │
│  │  - Captures error context                         │  │
│  │  - Stores in-memory logs                          │  │
│  │  - Exports for debugging                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ CrashReporting (Crashlytics/Sentry)              │  │
│  │  - Automatic crash reporting                      │  │
│  │  - Breadcrumbs for context                        │  │
│  │  - User identification                            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ErrorRecovery (Retry/Fallback)                    │  │
│  │  - Exponential backoff retry                      │  │
│  │  - Graceful degradation                           │  │
│  │  - Fallback strategies                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ FFI Bridge (Error Serialization)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    JUCE C++ Backend                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ErrorHandler (Centralized Logging)                │  │
│  │  - Structured error logging                       │  │
│  │  - Result<T, Error> pattern                       │  │
│  │  - Error JSON serialization                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Error Categories

### Audio Errors (AUDIO_XXX)

Errors related to audio engine operation, playback, and device management.

| Code | Severity | Description | Recovery |
|------|----------|-------------|----------|
| AUDIO_001 | Warning | Engine not ready | Wait for initialization |
| AUDIO_002 | Critical | Engine crashed | Restart engine |
| AUDIO_003 | Error | Dropout detected | Increase buffer size |
| AUDIO_004 | Warning | XRUN detected | Increase buffer size |
| AUDIO_005 | Error | Playback failed | Check device connections |
| AUDIO_006 | Error | Voice creation failed | Reduce voice count |
| AUDIO_007 | Error | Invalid buffer size | Use valid size |
| AUDIO_008 | Error | Unsupported sample rate | Change sample rate |
| AUDIO_009 | Error | Device not found | Check device settings |

### FFI Bridge Errors (FFI_XXX)

Errors related to communication between Swift and C++ layers.

| Code | Severity | Description | Recovery |
|------|----------|-------------|----------|
| FFI_001 | Error | Bridge not initialized | Restart application |
| FFI_002 | Error | Call failed | Retry or restart engine |
| FFI_003 | Critical | Version mismatch | Update application |
| FFI_004 | Warning | Timeout | Increase timeout |
| FFI_005 | Error | Serialization failed | Restart application |
| FFI_006 | Error | Deserialization failed | Restart application |
| FFI_007 | Critical | Bridge disconnected | Reconnect |
| FFI_008 | Error | Communication error | Restart engine |

### File I/O Errors (FILE_XXX)

Errors related to file operations and .wrs file format.

| Code | Severity | Description | Recovery |
|------|----------|-------------|----------|
| FILE_001 | Error | File not found | Check file path |
| FILE_002 | Error | Corrupted file | Restore from backup |
| FILE_003 | Error | Invalid format | Use correct format |
| FILE_004 | Error | Permission denied | Check permissions |
| FILE_005 | Critical | Disk full | Free disk space |
| FILE_006 | Error | Read failed | Check file integrity |
| FILE_007 | Error | Write failed | Check permissions/space |
| FILE_008 | Error | Incompatible version | Update application |

### Schillinger System Errors (SCHILL_XXX)

Errors related to Schillinger music theory system operations.

| Code | Severity | Description | Recovery |
|------|----------|-------------|----------|
| SCHILL_001 | Error | Invalid generator | Use valid period |
| SCHILL_002 | Error | Insufficient generators | Add more generators |
| SCHILL_003 | Error | Invalid pitch cycle | Fix pitch cycle |
| SCHILL_004 | Error | Invalid interval seed | Fix interval seed |
| SCHILL_005 | Warning | Harmony violation | Adjust harmony |
| SCHILL_006 | Error | Constraint satisfaction failed | Simplify constraints |
| SCHILL_007 | Error | System execution failed | Check system parameters |
| SCHILL_008 | Error | Derivation record failed | Reduce complexity |

### Performance Errors (PERF_XXX)

Errors related to system resource usage.

| Code | Severity | Description | Recovery |
|------|----------|-------------|----------|
| PERF_001 | Warning | CPU overload | Reduce CPU load |
| PERF_002 | Error | Memory limit exceeded | Free memory |
| PERF_003 | Warning | Slow realization | Reduce complexity |
| PERF_004 | Error | Compute limit exceeded | Increase resources |

---

## Error Severity Levels

### Info
- **Definition**: Informational message, operation can continue
- **Icon**: `info.circle.fill`
- **Color**: Blue
- **Action**: Log only, no user notification needed

### Warning
- **Definition**: Operation completed but with issues
- **Icon**: `exclamationmark.triangle.fill`
- **Color**: Orange
- **Action**: Log and optionally notify user

### Error
- **Definition**: Operation failed but system is stable
- **Icon**: `xmark.circle.fill`
- **Color**: Red
- **Action**: Log and notify user with recovery options

### Critical
- **Definition**: Operation failed and system may be unstable
- **Icon**: `exclamationmark.octagon.fill`
- **Color**: Red
- **Action**: Log, notify user, and attempt automatic recovery

---

## Platform-Specific Implementation

### Swift (iOS/macOS/tvOS)

#### Error Types
```swift
public enum WhiteRoomError: LocalizedError, Codable, Sendable {
    case audio(AudioError)
    case ffi(FFIError)
    case fileIO(FileIOError)
    case schillinger(SchillingerError)
    case performance(PerformanceError)
    case validation(ValidationError)
    case configuration(ConfigurationError)
}
```

#### Usage Example
```swift
// Create error
let error = WhiteRoomError.audio(.engineNotReady)

// Log error
ErrorLogger.shared.log(error)

// Show error boundary
ErrorBoundary(error: $error) {
    MyContentView()
}

// Record in crash reporting
CrashReporting.shared.record(error)
```

### C++ (JUCE Backend)

#### Error Types
```cpp
enum class ErrorCategory {
    Audio, FFI, FileIO, Schillinger, Performance, Validation, Configuration
};

struct WhiteRoomError {
    ErrorCategory category;
    ErrorSeverity severity;
    WhiteRoomErrorVariant error;
    juce::String code;
    juce::String userMessage;
    juce::String technicalDetails;
    juce::String recoverySuggestion;
    juce::Time timestamp;
};
```

#### Usage Example
```cpp
// Create error
auto error = WhiteRoomError::audioEngineNotReady();

// Log error
ErrorHandler::logError(error);

// Return failure
return ErrorHandler::createFailure(error);

// Convert to JSON for FFI
auto json = ErrorHandler::errorToJson(error);
```

### TypeScript (SDK)

#### Error Types
```typescript
export class WhiteRoomError extends Error {
    readonly code: string;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
    readonly context?: Record<string, unknown>;
}
```

---

## Error Code Reference

### Complete Error Code List

```
AUDIO_001 - Audio engine not ready
AUDIO_002 - Audio engine crashed
AUDIO_003 - Audio dropout detected
AUDIO_004 - XRUN detected
AUDIO_005 - Playback failed
AUDIO_006 - Voice creation failed
AUDIO_007 - Invalid buffer size
AUDIO_008 - Unsupported sample rate
AUDIO_009 - Device not found

FFI_001 - FFI bridge not initialized
FFI_002 - FFI call failed
FFI_003 - FFI version mismatch
FFI_004 - FFI timeout
FFI_005 - FFI serialization failed
FFI_006 - FFI deserialization failed
FFI_007 - FFI bridge disconnected
FFI_008 - FFI communication error

FILE_001 - File not found
FILE_002 - Corrupted file
FILE_003 - Invalid format
FILE_004 - Permission denied
FILE_005 - Disk full
FILE_006 - Read failed
FILE_007 - Write failed
FILE_008 - Incompatible version

SCHILL_001 - Invalid generator
SCHILL_002 - Insufficient generators
SCHILL_003 - Invalid pitch cycle
SCHILL_004 - Invalid interval seed
SCHILL_005 - Harmony violation
SCHILL_006 - Constraint satisfaction failed
SCHILL_007 - System execution failed
SCHILL_008 - Derivation record failed

PERF_001 - CPU overload
PERF_002 - Memory limit exceeded
PERF_003 - Slow realization
PERF_004 - Compute limit exceeded

VAL_001 - Invalid schema
VAL_002 - Validation failed
VAL_003 - Invalid voice count
VAL_004 - Invalid role pool
VAL_005 - Invalid balance rules

CFG_001 - Invalid configuration
CFG_002 - Missing configuration
CFG_003 - Configuration parse error
```

---

## Best Practices

### 1. Always Provide Context

❌ **Bad:**
```swift
throw NSError(domain: "WhiteRoom", code: -1, userInfo: nil)
```

✅ **Good:**
```swift
throw WhiteRoomError.audio(.playbackFailed(reason: "Device not connected"))
```

### 2. Use Appropriate Severity

❌ **Bad:**
```swift
// Using Critical for recoverable errors
WhiteRoomError.audio(.xrunDetected(count: 1), severity: .critical)
```

✅ **Good:**
```swift
// XRUNs are warnings, not critical
WhiteRoomError.audio(.xrunDetected(count: 1))
```

### 3. Provide Actionable Recovery Suggestions

❌ **Bad:**
```swift
recoverySuggestion = "Error occurred"
```

✅ **Good:**
```swift
recoverySuggestion = "Increase the buffer size in audio settings, close other applications, or reduce plugin CPU load."
```

### 4. Log All Errors

❌ **Bad:**
```swift
throw error // Don't just throw
```

✅ **Good:**
```swift
ErrorLogger.shared.log(error)
CrashReporting.shared.record(error)
throw error
```

### 5. Use Error Boundaries in SwiftUI

❌ **Bad:**
```swift
MyView() // Unhandled errors will crash
```

✅ **Good:**
```swift
ErrorBoundary(error: $viewModel.error) {
    MyView()
}
```

### 6. Implement Recovery Strategies

❌ **Bad:**
```swift
// Single attempt, no retry
do {
    try operation()
} catch {
    // Fail immediately
}
```

✅ **Good:**
```swift
let result = try await ErrorRecovery.shared.attempt(
    operation,
    config: .default
)
```

---

## Common Scenarios

### Scenario 1: Audio Engine Initialization

**Problem:** User starts playback before engine is ready

**Solution:**
```swift
// Swift
do {
    try await audioEngine.startPlayback()
} catch {
    let error = WhiteRoomError.audio(.engineNotReady)
    ErrorLogger.shared.log(error)
    viewModel.error = error
}
```

```cpp
// C++
auto result = engine->startPlayback();
if (!result.wasOk()) {
    auto error = WhiteRoomError::audioEngineNotReady();
    ErrorHandler::logError(error);
    return ErrorHandler::createFailure(error);
}
```

### Scenario 2: FFI Communication Failure

**Problem:** FFI bridge timeout during blend operation

**Solution:**
```swift
// Swift
let result = await ErrorRecovery.shared.retryFFI {
    try await ffiEngine.setPerformanceBlend(
        performanceA: idA,
        performanceB: idB,
        t: blendAmount
    )
}
```

### Scenario 3: Corrupted .wrs File

**Problem:** User tries to open corrupted file

**Solution:**
```swift
// Swift
do {
    try loadWRSFile(at: url)
} catch {
    let error = WhiteRoomError.fileIO(.corruptedFile(
        path: url.path,
        reason: "Invalid header"
    ))
    ErrorLogger.shared.log(error)
    viewModel.error = error
}
```

### Scenario 4: CPU Overload

**Problem:** CPU usage exceeds threshold

**Solution:**
```cpp
// C++
if (cpuUsage > threshold) {
    auto error = WhiteRoomError::cpuOverload(cpuUsage, threshold);
    ErrorHandler::logError(error);

    // Trigger graceful degradation
    reduceVoiceCount();
    return ErrorHandler::createFailure(error);
}
```

### Scenario 5: Incompatible File Version

**Problem:** User opens file created with newer version

**Solution:**
```swift
// Swift
if fileVersion > currentVersion {
    let error = WhiteRoomError.fileIO(.incompatibleVersion(
        version: fileVersion,
        supported: currentVersion
    ))
    ErrorLogger.shared.log(error)
    viewModel.error = error
}
```

---

## Testing

### Swift Tests

```swift
func testAudioErrorUserMessages() {
    let error = WhiteRoomError.audio(.engineNotReady)
    XCTAssertEqual(error.code, "AUDIO_001")
    XCTAssertEqual(error.severity, .warning)
    XCTAssertTrue(error.userMessage.contains("not ready"))
}

func testErrorRecoveryRetry() async throws {
    var attemptCount = 0
    let result = try await ErrorRecovery.shared.attempt({
        attemptCount += 1
        if attemptCount < 3 {
            throw NSError(domain: "Test", code: -1)
        }
        return "Success"
    })
    XCTAssertEqual(result, "Success")
    XCTAssertEqual(attemptCount, 3)
}
```

### C++ Tests

```cpp
TEST(ErrorHandling, AudioErrorCreation) {
    auto error = WhiteRoomError::audioEngineNotReady();
    EXPECT_EQ(error.code, "AUDIO_001");
    EXPECT_EQ(error.severity, ErrorSeverity::Warning);
    EXPECT_TRUE(error.userMessage.contains("not ready"));
}

TEST(ErrorHandling, ErrorLogging) {
    auto error = WhiteRoomError::audioDropout(5, 2.5);
    ErrorHandler::logError(error);
    // Verify log was created
}
```

---

## Integration Checklist

- [ ] Error boundaries implemented in all SwiftUI views
- [ ] Error logging enabled in production
- [ ] Crash reporting configured (Crashlytics/Sentry)
- [ ] Error recovery strategies tested
- [ ] User-facing error messages localized
- [ ] FFI error serialization tested
- [ ] Unit tests for all error types
- [ ] Error documentation complete
- [ ] Error monitoring dashboards set up
- [ ] User feedback mechanism in place

---

## Support and Troubleshooting

### Common Issues

**Issue:** Errors not appearing in crash reporting
**Solution:** Verify Crashlytics/Sentry initialization in app delegate

**Issue:** Error recovery not working
**Solution:** Check that retry configuration is appropriate for error type

**Issue:** User messages too technical
**Solution:** Review error message strings for technical jargon

**Issue:** Memory leaks in error logging
**Solution:** Ensure log limits are enforced (1000 entries max)

### Getting Help

- Review error logs in `ErrorLogger.shared.exportLogsAsText()`
- Check crash reports in Firebase Console or Sentry dashboard
- Verify error codes match documentation
- Test error recovery in development environment

---

## Changelog

### Version 1.0.0 (2026-01-15)
- Initial comprehensive error handling system
- SwiftUI ErrorBoundary component
- Structured error logging
- Crash reporting integration
- Error recovery strategies
- C++ error handling middleware
- FFI error serialization
- Complete test coverage
