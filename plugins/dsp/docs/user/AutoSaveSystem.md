# Auto-Save System Documentation

## Overview

The White Room Auto-Save System is a comprehensive data safety feature that automatically saves your work at regular intervals, preventing data loss from crashes or unexpected closures.

## Features

### Core Features

- **Timer-based Auto-Save**: Automatically saves every 30 seconds (configurable)
- **Crash Recovery**: Detects app crashes and offers to restore your work
- **User Notifications**: Visual feedback showing when saves occur
- **Smart Triggers**: Saves on critical changes, idle detection, and memory pressure
- **Performance Optimized**: Asynchronous saves that never block the UI
- **Battery Aware**: Considers battery state on mobile platforms
- **Version History**: Keeps the last 10 auto-save versions (configurable)

### Safety Features

- **File Size Limits**: Won't auto-save files larger than 100 MB (configurable)
- **Data Validation**: Validates song structure before saving
- **Atomic Writes**: Uses atomic file operations to prevent corruption
- **Incremental Saves**: Only saves changed data for better performance

## Usage

### Basic Usage

```swift
import SwiftFrontendCore

// Start auto-save for a song
let song = /* your song */
AutoSaveManager.shared.startAutoSave(for: song)

// Stop auto-save
AutoSaveManager.shared.stopAutoSave()
```

### With Event Callback

```swift
AutoSaveManager.shared.startAutoSave(for: song) { event in
    switch event {
    case .saved(let timeInterval):
        print("Saved \(timeInterval) seconds ago")
    case .failed(let error):
        print("Save failed: \(error)")
    case .restored(let version):
        print("Restored version \(version)")
    case .crashDetected(let version):
        print("Crash detected, version \(version) available")
    }
}
```

### Custom Configuration

```swift
var config = AutoSaveManager.Configuration()
config.interval = 60.0 // Save every minute
config.maxVersions = 20 // Keep 20 versions
config.isEnabled = true

AutoSaveManager.shared.updateConfiguration(config)
```

### Immediate Save

```swift
// Trigger an immediate save (for critical changes)
try await AutoSaveManager.shared.triggerImmediateSave()
```

### Crash Recovery

```swift
// Restore from auto-save
let restoredSong = try await AutoSaveManager.shared.restoreFromAutoSave(version: 3)
```

## UI Components

### AutoSaveStatusIndicator

Shows the current auto-save status in the UI:

```swift
AutoSaveStatusIndicator(
    timeSinceLastSave: timeInterval,
    isSaving: false,
    onSaveError: nil
)
```

**Variants:**

- `AutoSaveStatusIndicator` - Full status with text
- `AutoSaveStatusIndicatorCompact` - Compact icon-only version
- `AutoSaveStatusIndicatorDetailed` - Detailed view with history

### CrashRecoveryView

Dialog shown when a crash is detected:

```swift
CrashRecoveryView(
    autoSaveVersion: 3,
    onRestore: {
        // Handle restore
    },
    onDismiss: {
        // Handle dismiss
    }
)
```

### AutoSaveSettingsView

Settings panel for auto-save configuration:

```swift
AutoSaveSettingsView(
    configuration: $configuration
)
```

## Configuration Options

### AutoSaveManager.Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `interval` | TimeInterval | 30.0 | Time between auto-saves (seconds) |
| `maxVersions` | Int | 10 | Maximum number of versions to keep |
| `maxFileSize` | Int | 100_000_000 | Maximum file size for auto-save (bytes) |
| `isEnabled` | Bool | true | Whether auto-save is enabled |
| `showNotifications` | Bool | true | Whether to show notifications |
| `conserveBattery` | Bool | true | Whether to consider battery state (iOS only) |

## Best Practices

### When to Use Auto-Save

- **Always enabled**: Keep auto-save enabled for all user-facing projects
- **Before critical operations**: Trigger immediate save before destructive operations
- **After important changes**: Let auto-save handle routine saves automatically

### Performance Considerations

- **File size**: Be aware of the 100 MB limit for large projects
- **Battery**: On mobile, auto-save reduces frequency in low power mode
- **Async operations**: All saves are asynchronous and never block the UI

### Crash Recovery Flow

1. **Crash occurs**: App crashes or is force-quit
2. **Marker written**: Auto-save marker is written before crash
3. **App restarts**: On next launch, crash marker is detected
4. **Recovery offered**: User is shown crash recovery dialog
5. **User decides**: User can restore auto-save or start fresh
6. **Work continues**: Restored song is loaded normally

## Integration

### Song Model Integration

The `Song+AutoSave` extension provides convenient methods:

```swift
// Validate song for auto-save
let validation = song.validateForAutoSave()

// Add auto-save metadata
let updatedSong = song.withAutoSaveMetadata(version: 5)

// Check if crash recovery
if song.isCrashRecovery {
    print("This is a crash recovery version")
}
```

### SongAutoSaveCoordinator

High-level coordinator for song lifecycle:

```swift
let coordinator = SongAutoSaveCoordinator.shared

// Start auto-save
coordinator.startAutoSave(for: song)

// Trigger immediate save
try await coordinator.triggerSave(for: song)

// Restore from auto-save
let restoredSong = try await coordinator.restore(version: 3)

// Get status
let status = await coordinator.getAutoSaveStatus()
```

## Testing

### Unit Tests

Comprehensive tests are provided in `AutoSaveManagerTests.swift`:

- Timer-based auto-save
- Crash detection and recovery
- File size limits
- Configuration management
- Save history management

### Running Tests

```bash
# Run all auto-save tests
swift test --filter AutoSaveManagerTests

# Run specific test
swift test --filter testAutoSaveStart
```

## Troubleshooting

### Auto-Save Not Working

1. Check if auto-save is enabled in configuration
2. Verify song has at least one section
3. Check file size (must be under 100 MB)
4. Look for error messages in console

### Crash Recovery Not Showing

1. Verify crash marker file exists
2. Check auto-save history has versions
3. Ensure app is launching from crash state

### Performance Issues

1. Reduce auto-save interval
2. Decrease max versions to keep
3. Check file size estimates
4. Enable battery conservation (mobile)

## API Reference

### AutoSaveManager

Main auto-save manager class.

**Methods:**

- `startAutoSave(for:interval:eventCallback:)` - Start auto-save
- `stopAutoSave()` - Stop auto-save
- `triggerImmediateSave()` - Trigger immediate save
- `restoreFromAutoSave(version:)` - Restore from version
- `clearAutoSaves(for:)` - Clear auto-saves
- `updateConfiguration(_:)` - Update configuration
- `getLastSaveTime()` - Get last save time
- `getTimeSinceLastSave()` - Get time since last save
- `getSaveHistory()` - Get save history

### AutoSaveManager.Configuration

Configuration for auto-save behavior.

**Properties:**

- `interval: TimeInterval` - Save interval (default: 30s)
- `maxVersions: Int` - Maximum versions (default: 10)
- `maxFileSize: Int` - Max file size (default: 100 MB)
- `isEnabled: Bool` - Enable/disable (default: true)
- `showNotifications: Bool` - Show notifications (default: true)
- `conserveBattery: Bool` - Conserve battery (default: true)

### AutoSaveManager.AutoSaveEvent

Events emitted by auto-save system.

**Cases:**

- `saved(TimeInterval)` - Successfully saved
- `failed(Error)` - Save failed
- `restored(Int)` - Restored from version
- `crashDetected(Int)` - Crash detected with version

## Technical Details

### File Structure

Auto-save files are stored in:

```
~/Library/Application Support/AutoSaves/
├── {songId}_autosave_v1.json
├── {songId}_autosave_v2.json
├── {songId}_autosave_v3.json
└── .crash_marker
```

### Crash Detection

Crash detection uses a marker file:

1. Marker is written before each auto-save
2. Marker is removed on clean shutdown
3. If marker exists on startup → crash detected
4. Auto-save version is read from marker

### Version Management

- Versions are incrementing integers (1, 2, 3, ...)
- Old versions are deleted when maxVersions is reached
- Versions are persisted across app launches
- Version metadata includes timestamp and file size

## Platform Differences

### iOS

- Battery conservation available
- Low power mode detection
- Haptic feedback on save

### macOS

- No battery conservation
- Same core functionality as iOS
- Keyboard shortcuts for manual save

## Future Enhancements

Potential future improvements:

- CloudKit sync for auto-saves
- Differential saves (only changes)
- Compression for large files
- Custom auto-save triggers
- Per-project settings
- Auto-save analytics and reporting

## Version History

- **1.0.0** (2026-01-15): Initial release
  - Timer-based auto-save
  - Crash recovery
  - User notifications
  - Configuration panel
  - Comprehensive tests

## Support

For issues or questions about the auto-save system:

1. Check this documentation
2. Review test cases for examples
3. Check console logs for errors
4. File an issue on GitHub

## License

Copyright © 2026 White Room. All rights reserved.
