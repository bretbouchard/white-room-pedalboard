# White Room Error Handling System

Comprehensive error handling infrastructure for the White Room audio plugin development environment.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Error Taxonomy](#error-taxonomy)
4. [Usage Guide](#usage-guide)
5. [Validation Guards](#validation-guards)
6. [Swift Integration](#swift-integration)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

## Overview

The White Room Error Handling System provides:

- **Centralized Error Management**: Single point for all error handling
- **Comprehensive Error Taxonomy**: Categorized error types with severity levels
- **User-Friendly Messaging**: Clear, actionable error messages
- **Recovery Strategies**: Automatic and manual recovery actions
- **Structured Logging**: Detailed error logs for debugging
- **Swift Integration**: Native iOS/macOS error handling
- **Validation Guards**: Preventive error checking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  TypeScript SDK              │   Swift UI                    │
│  ├── ErrorTypes.ts           │   ├── WhiteRoomErrorHandler.swift
│  ├── ErrorHandler.ts         │   ├── ErrorSheetView
│  └── Validation.ts           │   └── ErrorAlertView
├─────────────────────────────────────────────────────────────┤
│                     Error Handling Core                      │
│  ├── Error Taxonomy          │   ├── Severity Levels         │
│  ├── Recovery Actions        │   ├── Error Logging          │
│  └── Listener System         │   └── Statistics              │
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure                          │
│  ├── File Logging            │   ├── Console Logging        │
│  └── Error Reporting         │   └── Crash Detection         │
└─────────────────────────────────────────────────────────────┘
```

## Error Taxonomy

### Error Categories

Errors are organized by category for proper handling:

- **AUDIO_ENGINE**: Critical audio engine failures
- **AUDIO_DEVICE**: Audio device configuration issues
- **FILE_NOT_FOUND**: Missing files
- **FILE_CORRUPTED**: Damaged or invalid files
- **FILE_PERMISSION**: Access denied errors
- **NETWORK_ERROR**: Network operation failures
- **TIMEOUT**: Operation timeouts
- **VALIDATION_ERROR**: Input validation failures
- **INVALID_STATE**: Invalid state transitions
- **OUT_OF_MEMORY**: Memory allocation failures
- **DISK_FULL**: Storage space exhausted

### Severity Levels

Each error has a severity level that determines handling:

- **DEBUG**: Information only, no user impact
- **INFO**: User notification, no action needed
- **WARNING**: Potential issue, user should be aware
- **ERROR**: Operation failed, user action may be needed
- **CRITICAL**: App may crash, immediate attention required
- **FATAL**: App must terminate, unrecoverable

### Error Types

#### Base Error Class

```typescript
const error = new WhiteRoomError(
  ErrorCategory.AUDIO_ENGINE,
  ErrorSeverity.CRITICAL,
  'ENGINE_FAILED',
  'Audio engine failed to start',
  'Technical details for debugging',
  { deviceId: 'default' },
  recoveryActions
)
```

#### Specialized Error Types

```typescript
// Audio Engine Error
const error = new AudioEngineError(
  'DEVICE_FAILED',
  'Audio device disconnected',
  'Device no longer available'
)

// File Not Found
const error = new FileNotFoundError('/path/to/project.whiteroom')

// Validation Error
const error = new ValidationError('sampleRate', 0, 'Must be positive')

// Timeout Error
const error = new TimeoutError('loadProject', 30000)
```

## Usage Guide

### Basic Error Handling

```typescript
import { ErrorHandler } from './errors/ErrorHandler'
import { AudioEngineError, ValidationError } from './errors/ErrorTypes'

const errorHandler = ErrorHandler.getInstance()

// Handle errors
try {
  // Your code here
} catch (error) {
  await errorHandler.handleError(error)
}
```

### Creating Custom Errors

```typescript
import { WhiteRoomError, ErrorCategory, ErrorSeverity } from './errors/ErrorTypes'

const error = new WhiteRoomError(
  ErrorCategory.AUDIO_ENGINE,
  ErrorSeverity.ERROR,
  'CUSTOM_ERROR_CODE',
  'User-friendly message',
  'Technical details',
  { context: 'data' },
  [
    {
      title: 'Recovery Action',
      action: async () => {
        // Recovery logic
      },
      description: 'Optional description',
      isAutomatic: false,
      isRecommended: true
    }
  ]
)
```

### Error Listeners

```typescript
// Register error listener
const unsubscribe = errorHandler.onError((error) => {
  console.log('Error occurred:', error.userMessage)

  // Update UI, send to monitoring, etc.
})

// Unsubscribe when done
unsubscribe()
```

### Error Logging

```typescript
// Get error log
const log = errorHandler.getErrorLog({
  category: ErrorCategory.AUDIO_ENGINE,
  severity: ErrorSeverity.ERROR,
  limit: 100
})

// Get statistics
const stats = errorHandler.getErrorStatistics()
console.log('Total errors:', stats.totalErrors)
console.log('By category:', stats.errorsByCategory)
console.log('Most frequent:', stats.mostFrequentErrors)

// Export error report
const report = await errorHandler.exportErrorReport()
console.log(report)

// Or export to file
await errorHandler.exportErrorReportToFile('/path/to/error-report.json')
```

### Error Recovery

```typescript
// Errors with automatic recovery
if (error.hasAutomaticRecovery()) {
  // Handler will attempt automatic recovery
}

// Get recommended recovery
const recommended = error.getRecommendedRecovery()
if (recommended) {
  await recommended.action()
}

// Execute specific recovery action
for (const action of error.recoveryActions) {
  if (action.title === 'Retry') {
    await action.action()
  }
}
```

## Validation Guards

Prevent errors before they occur with validation guards:

### Basic Guards

```typescript
import {
  validateNotNull,
  validateRange,
  validatePositive,
  validateNotEmpty,
  validateFileExists
} from './errors/Validation'

// Validate not null
const value = validateNotNull(param, 'paramName')

// Validate range
const sampleRate = validateRange(rate, 8000, 192000, 'sampleRate')

// Validate positive
const bufferSize = validatePositive(size, 'bufferSize')

// Validate not empty
const name = validateNotEmpty(projectName, 'projectName')

// Validate file exists
validateFileExists('/path/to/file')
```

### Audio-Specific Guards

```typescript
import {
  validateAudioBuffer,
  validateAudioDevice
} from './errors/Validation'

// Validate audio buffer
validateAudioBuffer(sampleRate, channels, frames)

// Validate audio device
validateAudioDevice(deviceId, sampleRate, bufferSize)
```

### Batch Validation

```typescript
import { validateBatch } from './errors/Validation'

validateBatch([
  () => validatePositive(sampleRate, 'sampleRate'),
  () => validateRange(channels, 1, 128, 'channels'),
  () => validatePowerOfTwo(bufferSize, 'bufferSize')
])
```

### Conditional Validation

```typescript
import { validateIf } from './errors/Validation'

validateIf(needsValidation, () => {
  validatePositive(value, 'value')
})
```

## Swift Integration

The Swift error handler provides native iOS/macOS error handling:

### Basic Usage

```swift
import SwiftUI

// Handle errors
Task {
    await WhiteRoomErrorHandler.shared.handleAsync(error)
}

// With error sheet modifier
struct ContentView: View {
    var body: some View {
        MainView()
            .withErrorHandling()
    }
}
```

### Creating Errors

```swift
// Audio engine error
let error = AudioEngineError.create(
    code: "DEVICE_FAILED",
    userMessage: "Audio device disconnected",
    technicalDetails: "Device no longer available"
)

// File not found error
let error = FileNotFoundError.create(
    path: "/path/to/project.whiteroom"
)

// Validation error
let error = ValidationError.create(
    field: "sampleRate",
    value: 0,
    reason: "Must be positive"
)
```

### Error UI Components

```swift
// Error sheet (included with withErrorHandling modifier)
ErrorSheetView()

// Error alert
ErrorAlertView()

// Custom error handling
struct CustomErrorView: View {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared

    var body: some View {
        if let error = errorHandler.currentError {
            VStack {
                Image(systemName: error.severity.icon)
                    .foregroundColor(error.severity.color)

                Text(error.userMessage)

                ForEach(error.recoveryActions) { action in
                    Button(action.title) {
                        Task {
                            await errorHandler.executeRecoveryAction(action)
                        }
                    }
                }
            }
        }
    }
}
```

### Error Statistics

```swift
let stats = WhiteRoomErrorHandler.shared.getErrorStatistics()

print("Total errors: \(stats.totalErrors)")
print("By category: \(stats.errorsByCategory)")
print("Most frequent: \(stats.mostFrequentErrors)")

// Export report
let report = try await WhiteRoomErrorHandler.shared.exportErrorReport()
```

## Testing

The error handling system is fully tested:

```bash
# Run error handling tests
npm test -- ErrorHandler.test.ts

# Run with coverage
npm test -- --coverage ErrorHandler.test.ts
```

### Test Coverage

- ✅ Error type creation and properties
- ✅ Error handler functionality
- ✅ Validation guards
- ✅ Error recovery
- ✅ Error logging and reporting
- ✅ Swift error handling

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good
throw new AudioEngineError('DEVICE_FAILED', 'Device disconnected')

// ❌ Bad
throw new Error('Something went wrong')
```

### 2. Provide Context

```typescript
// ✅ Good
throw new ValidationError('sampleRate', value, 'Must be positive', {
  provided: value,
  min: 1,
  component: 'AudioEngine'
})

// ❌ Bad
throw new ValidationError('sampleRate', value, 'Invalid')
```

### 3. Include Recovery Actions

```typescript
// ✅ Good
throw new FileNotFoundError(path, {}, [
  {
    title: 'Browse for File',
    action: async () => { /* recovery logic */ },
    description: 'Locate the file manually',
    isRecommended: true
  }
])

// ❌ Bad
throw new FileNotFoundError(path)
```

### 4. Use Validation Guards

```typescript
// ✅ Good
function setSampleRate(rate: number) {
  validateRange(rate, 8000, 192000, 'sampleRate')
  // Implementation
}

// ❌ Bad
function setSampleRate(rate: number) {
  if (rate < 8000 || rate > 192000) {
    throw new Error('Invalid sample rate')
  }
  // Implementation
}
```

### 5. Log Errors Properly

```typescript
// ✅ Good
try {
  await operation()
} catch (error) {
  await errorHandler.handleError(error)
}

// ❌ Bad
try {
  await operation()
} catch (error) {
  console.error(error)
}
```

### 6. Handle Errors at Appropriate Levels

```typescript
// ✅ Good - Handle at component level
class AudioEngine {
  async start() {
    try {
      await this.initialize()
    } catch (error) {
      throw new AudioEngineError('INIT_FAILED', 'Failed to start', error.message)
    }
  }
}

// ❌ Bad - Swallow errors
class AudioEngine {
  async start() {
    try {
      await this.initialize()
    } catch (error) {
      console.error(error)
      // Continue anyway
    }
  }
}
```

### 7. Provide User-Friendly Messages

```typescript
// ✅ Good
throw new AudioEngineError(
  'DEVICE_FAILED',
  'The audio device "Built-in Output" is not available',
  'Device open failed: Device busy'
)

// ❌ Bad
throw new AudioEngineError(
  'DEVICE_FAILED',
  'Error: -63 in AudioDeviceOpen()',
  'Error code -63'
)
```

### 8. Test Error Paths

```typescript
// ✅ Good - Test error handling
describe('AudioEngine', () => {
  it('should throw when device not found', async () => {
    await expect(engine.start('invalid-device'))
      .rejects.toThrow(AudioDeviceError)
  })
})

// ❌ Bad - Only test success paths
describe('AudioEngine', () => {
  it('should start successfully', async () => {
    await engine.start('default')
    expect(engine.isRunning).toBe(true)
  })
})
```

## Error Handling Flow

```
User Action
    │
    ▼
┌─────────────┐
│ Validation  │  ← Prevent errors with guards
│  Guards     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Operation  │
└──────┬──────┘
       │
       ▼ (error occurs)
┌─────────────┐
│   Catch     │
│   Block     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  ErrorHandler       │  ← Centralized handling
│  - Convert to       │
│    WhiteRoomError   │
│  - Log error        │
│  - Notify listeners │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Severity Handler   │
│  - FATAL/Critical:  │
│    Auto-recovery    │
│  - ERROR:           │
│    User action      │
│  - WARNING/INFO:    │
│    Notification     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Recovery           │  ← Automatic or manual
│  - Execute action   │
│  - Update state     │
│  - Retry operation  │
└─────────────────────┘
```

## Contributing

When adding new error types:

1. Add error category to `ErrorCategory` enum
2. Create specialized error class extending `WhiteRoomError`
3. Add appropriate recovery actions
4. Update this documentation
5. Add tests for new error type
6. Update Swift handler if needed

## Support

For issues or questions about the error handling system:

1. Check this documentation
2. Review test files for examples
3. Check error logs for context
4. Create bd issue with error details

---

**Last Updated**: 2026-01-16
**Version**: 1.0.0
**Status**: Production Ready
