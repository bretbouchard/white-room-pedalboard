# Safe Parameter Migration Guide

This document outlines the migration from easily swappable parameters to strong, type-safe APIs in the audio processing system.

## Problem Statement

The original codebase had several clang-tidy warnings about "easily swappable parameters" - functions with adjacent parameters of similar types that could be accidentally swapped during calls, leading to subtle bugs.

### Examples of Problematic Function Signatures:

```cpp
// Original - swappable double parameters
void setPosition(double startTime, double endTime);
void setGlobalPosition(double globalStartTime, double globalEndTime);
void setSourceRange(double sourceStart, double sourceEnd);

// Original - convertible types that could be swapped
double interpolateSample(double exactSamplePosition, int channel);
void processAudio(double startTime, double endTime, int numSamples, double currentSampleRate);

// Original - multiple similar parameters
void applyFade(double timeInClip, double sample);
juce::Range<int> getSampleRangeForTimeRange(double startTime, double endTime, double targetSampleRate);
```

## Solution: Strong Types and Parameter Grouping

### 1. Strong Type Definitions

We've created a comprehensive set of strong types in `include/core/SafeTypes.h`:

```cpp
// Time-related types
class TimePosition;      // Prevents start/end time confusion
class TimeDuration;      // Distinguished from TimePosition
class SampleRate;        // Sample rate in Hz
class SampleCount;       // Number of samples

// Index and identification types
class ChannelIndex;      // Audio channel index
class TrackIndex;        // Track index
class ClipTimePosition;  // Position within a clip

// Audio processing types
class GainLinear;        // Gain values (linear scale)
class PanPosition;       // Pan positions (-1.0 to 1.0)
class AudioLevel;        // Audio levels
class Frequency;         // Frequency values in Hz

// Sample interpolation types
class SamplePosition;    // Position for interpolation
```

### 2. Composite Types for Related Parameters

```cpp
// Groups related parameters to prevent swapping
struct TimeRange {
    TimePosition start;
    TimePosition end;
    // ... helper methods
};

struct AudioProcessingContext {
    TimeRange timeRange;
    SampleCount sampleCount;
    SampleRate sampleRate;
    // ... helper methods
};
```

## Migration Examples

### Before (Unsafe):
```cpp
// Easy to accidentally swap parameters
clip.setPosition(endTime, startTime);  // Wrong! Compiles but causes bugs
clip.processAudio(buffer, startTime, endTime, numSamples, sampleRate);

// Interpolation - easy to swap position and channel
double sample = interpolateSample(channelIndex, exactPosition);  // Wrong!
```

### After (Safe):
```cpp
// Impossible to swap - compiler catches the error
clip.setPosition(TimeRange(endTime, startTime));  // Compilation error!
clip.processAudio(buffer, AudioProcessingContext{timeRange, sampleCount, sampleRate});

// Interpolation - types prevent swapping
double sample = interpolateSample(
    SamplePosition::fromDouble(channelIndex),  // Type error!
    ChannelIndex::fromInt(exactPosition)       // Type error!
);
```

## Key Benefits

### 1. **Compile-Time Safety**
- Swappable parameter errors are caught at compile time
- Type mismatches prevent accidental parameter reordering
- Clear intent through self-documenting types

### 2. **API Self-Documentation**
```cpp
// Clear intent through types
void setPosition(const TimeRange& position);  // Clear: sets a time range
void setGain(GainLinear gain);               // Clear: sets linear gain
void setPan(PanPosition pan);                // Clear: sets pan position
```

### 3. **Parameter Validation**
```cpp
void setGain(GainLinear newGain) {
    if (ParameterValidator::isValidGain(newGain)) {
        gain = newGain.toLinear();
    }
}
```

### 4. **Convenient Construction**
```cpp
// Named constructors for common values
TimePosition::fromSeconds(5.0);
SampleRate::cd44_1kHz();
GainLinear::fromDecibels(-6.0);
PanPosition::center();
```

## Migration Strategy

### Phase 1: Core Infrastructure ✅
- [x] Create strong type definitions (`SafeTypes.h`)
- [x] Update class declarations
- [x] Create example implementations

### Phase 2: Gradual Migration
1. **Start with most critical functions** (audio processing, interpolation)
2. **Maintain backward compatibility** where possible
3. **Update callers gradually** to use new APIs
4. **Remove old overloads** once migration is complete

### Phase 3: Extension
1. Apply patterns to other audio processing classes
2. Add validation and error handling
3. Create utility functions and helpers
4. Add unit tests for type safety

## Usage Examples

### Creating Safe Parameters
```cpp
// Time ranges
auto range = TimeRange(
    TimePosition::fromSeconds(1.0),
    TimePosition::fromSeconds(5.0)
);

// Audio parameters
auto gain = GainLinear::fromDecibels(-3.0);
auto pan = PanPosition::fromNormalized(-0.5);  // Left pan
auto sampleRate = SampleRate::studio48kHz();

// Processing context
auto context = AudioProcessingContext{
    range,
    SampleCount::fromInt64(512),
    sampleRate
};
```

### Function Calls
```cpp
// Safe function calls
clip.setPosition(range);
clip.setGain(gain);
clip.setPan(pan);
clip.processAudio(buffer, context);

// No more parameter confusion!
auto sample = interpolateSample(
    SamplePosition::fromDouble(123.45),
    ChannelIndex::left()
);
```

### Validation
```cpp
// Built-in validation
if (ParameterValidator::isValidTimeRange(range)) {
    clip.setPosition(range);
}

if (ParameterValidator::isValidGain(gain)) {
    clip.setGain(gain);
}
```

## Impact on clang-tidy Warnings

The strong typing approach eliminates the following clang-tidy warnings:

- `cppcoreguidelines-avoid-magic-numbers` - Replaced with named constructors
- `readability-avoid-swappable-parameters` - Types prevent swapping
- `bugprone-swappable-parameters` - Compile-time protection

## Performance Considerations

- **Zero overhead**: Strong types are optimized away at compile time
- **Inlined operations**: All conversions and checks are inlined
- **No runtime cost**: Type safety is purely compile-time

## Future Enhancements

1. **More specialized types** for specific audio processing domains
2. **Template-based validation** for custom parameter constraints
3. **Automatic conversion utilities** for migrating legacy code
4. **IDE integration** for better autocompletion and documentation

## Conclusion

The strong typing approach provides:

- **Elimination of swappable parameter bugs**
- **Self-documenting APIs**
- **Compile-time safety**
- **Zero runtime overhead**
- **Better developer experience**

This migration makes the audio processing APIs more robust, easier to use correctly, and harder to use incorrectly.