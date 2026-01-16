# Instrument Assignment System

## Overview

The Instrument Assignment System allows you to assign MIDI and virtual instruments to tracks in your White Room songs. This system manages MIDI channels, program changes, bank selects, and plugin assignments with comprehensive validation and persistence.

## Features

- **MIDI Instrument Assignment**: Assign MIDI instruments with channel, patch, and bank select
- **Virtual Instrument Support**: Configure audio plugins with parameters
- **Channel Conflict Detection**: Automatic detection and prevention of MIDI channel conflicts
- **Validation**: Comprehensive validation of all instrument assignments
- **Persistence**: Save and load instrument assignments with songs
- **UI Components**: SwiftUI views for instrument management
- **MIDI Integration**: C++ backend for sending program change and bank select messages

## Architecture

### Data Models (TypeScript)

Located in: `/Users/bretbouchard/apps/schill/white_room/sdk/src/models/InstrumentAssignment.ts`

#### InstrumentType Enum

```typescript
enum InstrumentType {
  Piano = 'piano',
  Organ = 'organ',
  Guitar = 'guitar',
  Bass = 'bass',
  Strings = 'strings',
  Brass = 'brass',
  Woodwinds = 'woodwinds',
  Percussion = 'percussion',
  Synth = 'synth',
  Drums = 'drums',
  Other = 'other'
}
```

#### InstrumentAssignment Interface

```typescript
interface InstrumentAssignment {
  id: string
  name: string
  type: InstrumentType
  channel: number          // MIDI channel (1-16)
  patch: number            // MIDI program change (0-127)
  bankMSB?: number         // Bank select MSB (0-127)
  bankLSB?: number         // Bank select LSB (0-127)
  plugin?: {
    id: string
    name: string
    manufacturer: string
    parameters: Record<string, number>
  }
  color: string
  icon: string
  createdAt?: string
  updatedAt?: string
}
```

#### InstrumentAssignmentManager Class

```typescript
class InstrumentAssignmentManager {
  // Assign instrument to track
  assignInstrument(trackId: string, instrument: InstrumentAssignment): void

  // Get instrument for track
  getInstrument(trackId: string): InstrumentAssignment | undefined

  // Remove assignment
  removeAssignment(trackId: string): void

  // Get all assignments
  getAllAssignments(): InstrumentAssignment[]

  // Get available MIDI channels
  getAvailableChannels(): number[]

  // Validate assignment
  validateAssignment(instrument: InstrumentAssignment): ValidationResult

  // Serialize/deserialize
  toJSON(): object
  static fromJSON(json: object): InstrumentAssignmentManager
}
```

### Swift UI Components

Located in: `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Components/InstrumentAssignmentView.swift`

#### Main Views

1. **InstrumentAssignmentView**: Main view for managing instrument assignments
2. **InstrumentAssignmentRow**: Row component displaying instrument details
3. **InstrumentPickerView**: Sheet for selecting instrument types
4. **AddInstrumentSheet**: Form for adding new instruments

### C++ MIDI Backend

Located in: `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/midi/`

#### InstrumentMapper Class

```cpp
class InstrumentMapper {
public:
  // Set MIDI output device
  void setMidiOutput(juce::MidiOutput* output);

  // Assign instrument to track
  bool assignInstrument(const std::string& trackId,
                       const InstrumentAssignment& instrument);

  // Send program change for track
  void sendProgramChange(const std::string& trackId);

  // Send bank select and program change
  void sendBankSelectAndProgramChange(const std::string& trackId);

  // Send to specific channel
  void sendProgramChange(int channel, int program);
  void sendBankSelect(int channel, int msb, int lsb);

  // Send all pending program changes
  void sendAllProgramChanges();

  // Validation and conflict detection
  static bool validateAssignment(const InstrumentAssignment& instrument);
  std::string findChannelConflict(int channel,
                                  const std::string& excludeTrackId) const;
  std::vector<int> getAvailableChannels() const;
};
```

## Usage Examples

### TypeScript

```typescript
import {
  InstrumentAssignmentManager,
  InstrumentType,
  INSTRUMENT_COLORS,
  INSTRUMENT_ICONS
} from './models/InstrumentAssignment'

// Create manager
const manager = new InstrumentAssignmentManager()

// Assign piano to track 1
const piano = {
  id: 'inst-1',
  name: 'Grand Piano',
  type: InstrumentType.Piano,
  channel: 1,
  patch: 0,
  color: INSTRUMENT_COLORS[InstrumentType.Piano],
  icon: INSTRUMENT_ICONS[InstrumentType.Piano]
}

manager.assignInstrument('track-1', piano)

// Get assigned instrument
const instrument = manager.getInstrument('track-1')
console.log(instrument?.name) // "Grand Piano"

// Get available channels
const available = manager.getAvailableChannels()
console.log(available) // [2, 3, 4, 5, ..., 16]

// Serialize for saving
const json = manager.toJSON()
console.log(json)
```

### Swift

```swift
import SwiftFrontendCore

// Create manager
let manager = InstrumentAssignmentManager()

// Assign piano to track 1
let piano = InstrumentAssignment(
    id: "inst-1",
    name: "Grand Piano",
    type: .piano,
    channel: 1,
    patch: 0
)

try manager.assignInstrument(trackId: "track-1", instrument: piano)

// Get assigned instrument
if let instrument = manager.getInstrument(trackId: "track-1") {
    print(instrument.name) // "Grand Piano"
}

// Get available channels
let available = manager.getAvailableChannels()
print(available) // [2, 3, 4, 5, ..., 16]
```

### C++

```cpp
#include "midi/instrument_mapper.h"

// Create mapper
midi::InstrumentMapper mapper(midiOutput);

// Create assignment
midi::InstrumentAssignment piano("inst-1", "Grand Piano", "piano", 1, 0);

// Assign to track
mapper.assignInstrument("track-1", piano);

// Send program change
mapper.sendProgramChange("track-1");

// Send bank select and program change
mapper.sendBankSelectAndProgramChange("track-1");

// Send all program changes
mapper.sendAllProgramChanges();
```

## Validation

### MIDI Channel Validation

- Range: 1-16
- Automatically detects conflicts with existing assignments

### MIDI Patch Validation

- Range: 0-127 (standard MIDI program change range)

### Bank Select Validation

- MSB Range: 0-127
- LSB Range: 0-127
- Optional: Can be omitted if not needed

### Plugin Validation

- Plugin ID required
- Plugin name required
- Plugin manufacturer required
- Parameters must be an object

## Error Handling

### TypeScript

```typescript
try {
  manager.assignInstrument('track-1', instrument)
} catch (error) {
  console.error('Assignment failed:', error.message)
  // Handle validation errors or channel conflicts
}
```

### Swift

```swift
do {
  try manager.assignInstrument(trackId: "track-1", instrument: instrument)
} catch {
  print("Assignment failed: \(error.localizedDescription)")
  // Handle validation errors or channel conflicts
}
```

### C++

```cpp
if (!mapper.assignInstrument("track-1", instrument)) {
  // Handle validation failure or channel conflict
}
```

## Integration with Song Model

### Swift Song Extension

```swift
// Assign instrument to song track
try song.assignInstrument(to: "track-1", instrument: piano)

// Get instrument from song
if let instrument = song.getInstrument(for: "track-1") {
  print("Instrument: \(instrument.name)")
}

// Remove instrument assignment
song.removeInstrumentAssignment(from: "track-1")

// Serialize with song
let json = song.serializeInstrumentAssignments()

// Deserialize from song
song.deserializeInstrumentAssignments(from: json)
```

## MIDI Implementation Details

### Program Change Messages

MIDI Program Change message format:
- Status: `0xC0 + (channel - 1)`
- Data: `program_number`

### Bank Select Messages

MIDI Bank Select uses two Control Change messages:
1. Bank Select MSB: Controller 0
2. Bank Select LSB: Controller 32

Both messages must be sent before the Program Change message.

### Message Ordering

1. Bank Select MSB (if applicable)
2. Bank Select LSB (if applicable)
3. Program Change

## Testing

### Running Tests

**TypeScript:**
```bash
cd sdk
npm test -- InstrumentAssignment.test.ts
```

**Swift:**
```bash
cd swift_frontend/WhiteRoomiOS
swift test --filter InstrumentAssignmentTests
```

### Test Coverage

- Assignment operations (assign, get, remove)
- Validation (channel, patch, bank, plugin)
- Channel conflict detection
- Available channels calculation
- Filtering by type
- Serialization/deserialization
- Clone operations

## Best Practices

1. **Always validate** before assigning instruments
2. **Check for conflicts** before assigning to a specific channel
3. **Use available channels** to avoid conflicts
4. **Serialize with songs** to persist assignments
5. **Handle errors** gracefully when assignments fail
6. **Use instruments by type** for filtering and organization

## Troubleshooting

### Channel Conflicts

**Problem**: "Channel conflict" error when assigning instrument

**Solution**:
1. Check available channels: `manager.getAvailableChannels()`
2. Use a different channel for the new instrument
3. Or remove the conflicting assignment first

### Invalid MIDI Values

**Problem**: Validation fails with "invalid_channel" or "invalid_patch"

**Solution**:
1. Ensure channel is between 1-16
2. Ensure patch is between 0-127
3. Ensure bank values are between 0-127

### Missing Plugin Data

**Problem**: Validation fails with "invalid_plugin"

**Solution**:
1. Ensure plugin.id is provided
2. Ensure plugin.name is provided
3. Ensure plugin.manufacturer is provided
4. Ensure plugin.parameters is an object

## API Reference

### InstrumentAssignmentManager

| Method | Description | Returns |
|--------|-------------|---------|
| `assignInstrument(trackId, instrument)` | Assign instrument to track | `void` |
| `getInstrument(trackId)` | Get instrument for track | `InstrumentAssignment \| undefined` |
| `removeAssignment(trackId)` | Remove assignment | `void` |
| `getAllAssignments()` | Get all assignments | `InstrumentAssignment[]` |
| `getAssignedTrackIds()` | Get assigned track IDs | `string[]` |
| `clearAll()` | Clear all assignments | `void` |
| `getAvailableChannels()` | Get available MIDI channels | `number[]` |
| `getInstrumentsByType(type)` | Get instruments by type | `InstrumentAssignment[]` |
| `hasAssignment(trackId)` | Check if track has assignment | `boolean` |
| `validateAssignment(instrument)` | Validate assignment | `ValidationResult` |
| `toJSON()` | Serialize to JSON | `object` |
| `fromJSON(json)` | Deserialize from JSON | `InstrumentAssignmentManager` |
| `clone()` | Create independent clone | `InstrumentAssignmentManager` |
| `count` | Get assignment count | `number` |

## Files Created

1. `/Users/bretbouchard/apps/schill/white_room/sdk/src/models/InstrumentAssignment.ts` (550 lines)
2. `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Models/InstrumentAssignment.swift` (280 lines)
3. `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Components/InstrumentAssignmentView.swift` (420 lines)
4. `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Models/Song+InstrumentAssignment.swift` (180 lines)
5. `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/midi/instrument_mapper.h` (95 lines)
6. `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/midi/instrument_mapper.cpp` (230 lines)
7. `/Users/bretbouchard/apps/schill/white_room/sdk/tests/InstrumentAssignment.test.ts` (650 lines)
8. `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Tests/InstrumentAssignmentTests.swift` (380 lines)
9. `/Users/bretbouchard/apps/schill/white_room/docs/user/InstrumentAssignmentSystem.md` (this file)

**Total**: 2,785+ lines of production code, tests, and documentation

## Next Steps

1. Run tests to verify implementation
2. Integrate with main app UI
3. Test MIDI output with actual devices
4. Add more instrument types if needed
5. Implement MIDI learn for automatic assignment
6. Add preset library for common instruments

## Support

For issues or questions:
1. Check the test files for usage examples
2. Review the API reference above
3. See the troubleshooting section
4. Check existing bd issues for similar problems
