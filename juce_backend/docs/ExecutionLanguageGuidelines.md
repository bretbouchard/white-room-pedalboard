# Execution Language Guidelines

**Date:** December 31, 2025
**Purpose:** Define preferred terminology for tvOS local-only JUCE execution engine
**Status:** Phase 4a - New Code Standards

---

## Executive Summary

This document establishes the preferred terminology for the JUCE execution engine. **All new code must use execution language**, not musical language or DAW terminology.

---

## Terminology Mapping

### Core Concepts

| Deprecated (❌) | Preferred (✅) | Rationale |
|-----------------|----------------|-----------|
| **"track"** (noun) | **"voiceBus"** / **"executionLane"** | "Track" implies DAW timeline; "voiceBus" describes audio routing |
| **"composition"** (noun) | **"schedule"** / **"executionGraph"** | "Composition" is musical; "schedule" describes temporal ordering |
| **"DAW integration"** | **"audio host"** / **"plugin host"** | DAW-specific; JUCE is a general audio host |
| **"add track"** | **"add voice bus"** / **"register voice"** | Action-oriented language |
| **"malformed track"** | **"invalid schedule"** / **"corrupt event"** | Precise error descriptions |

### Acceptable Usage (✅)

The following uses are **NOT deprecated** when used in their standard English meaning:

| Term | Acceptable Context | Example |
|------|-------------------|---------|
| **"track"** (verb) | Monitoring/following | "Track active voices" |
| **"track"** (noun) | Physical media tracks | "CD track", "tape track" |
| **"composition"** | Musical works | "Bach composition" |
| **"DAW"** | Industry category | "DAW-style interface" |
| **"track"** | Signal path labels | "Input track", "output track" |

### Type and Method Naming

#### Core Types

```cpp
// ✅ Preferred (Execution Language)
class VoiceBusIndex;           // Index of a voice bus
class ExecutionLaneIndex;      // Index of an execution lane
class VoiceIndex;              // Index of a synthesis voice
class EventIndex;              // Index of a scheduled event

// ❌ Deprecated (Musical Language)
class TrackIndex;              // DAW-specific
class CompositionIndex;        // Musical, not technical
```

#### API Methods

```cpp
// ✅ Preferred (Execution Language)
voiceBusIndex.setVoiceBus(index);
voiceBusIndex.getVoiceBusIndex();
scheduler.addEvent(event);
graph.registerVoice(voice);

// ❌ Deprecated (Musical Language)
trackIndex.setTrack(index);
trackIndex.getTrackIndex();
composition.addTrack(track);
```

#### UI Components

```cpp
// ✅ Preferred (Execution Language)
auto header = ComponentFactory::createVoiceBusHeader("Bus 1");
auto lane = ComponentFactory::createExecutionLane("Lane A");

// ❌ Deprecated (DAW Language)
auto header = ComponentFactory::createTrackHeader("Track 1");
auto lane = ComponentFactory::createTrackLane("Track A");
```

---

## Code Review Checklist

### For All Code Changes

- [ ] **No "track" as a noun** (unless referring to signal paths or physical media)
- [ ] **No "composition" as a noun** (unless referring to musical works)
- [ ] **No "DAW integration"** (use "audio host" or "plugin host")
- [ ] **Method names use execution language** (addVoice, not addTrack)
- [ ] **Variable names use execution language** (voiceBus, not track)
- [ ] **Comments use execution language** (schedule, not composition)

### Specific Checks

**Public APIs:**
- [ ] Methods use `setVoiceBus()`, not `setTrack()`
- [ ] Types use `VoiceBusIndex`, not `TrackIndex`
- [ ] Parameters use `voiceBusName`, not `trackName`

**Internal Code:**
- [ ] Member variables use `voiceBusIndex_`, not `trackIndex_`
- [ ] Loop variables use `voiceBus`, not `track`
- [ ] Comments describe "execution lanes", not "tracks"

**Documentation:**
- [ ] README describes "execution engine", not "backend server"
- [ ] API docs use "voice bus", not "track"
- [ ] Comments describe "audio host", not "DAW integration"

---

## Linter Rules

### clang-tidy Configuration

Add to `.clang-tidy`:

```yaml
# Deprecated terminology checks
Checks: >
  -*,
  readability-identifier-naming,
  modernize-use-nullptr

CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.StructCase
    value: CamelCase
  - key: readability-identifier-naming.VariableCase
    value: camelBack
```

### Custom Linter Scripts

**Check for deprecated terms:**

```bash
#!/bin/bash
# check_terminology.sh

# Check for deprecated "track" usage in new code
grep -rn "\bTrackIndex\b\|\bsetTrack\b\|\bgetTrack\b" \
    --include="*.h" --include="*.cpp" include/ src/

# Check for deprecated "composition" usage
grep -rn "\bCompositionIndex\b\|\baddComposition\b" \
    --include="*.h" --include="*.cpp" include/ src/

# Check for "DAW integration" references
grep -rn "DAW integration\|DAW-specific" \
    --include="*.h" --include="*.cpp" include/ src/ | grep -v "DAW-style"
```

**Pre-commit hook:**

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for deprecated terminology in staged files
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(h|cpp)$')

if [ -n "$FILES" ]; then
    echo "Checking for deprecated terminology..."

    if grep -l "TrackIndex\|setTrack\|getTrackIndex" $FILES 2>/dev/null; then
        echo "❌ Found deprecated terminology (TrackIndex/setTrack/getTrackIndex)"
        echo "   Please use VoiceBusIndex/setVoiceBus/getVoiceBusIndex instead"
        exit 1
    fi

    if grep -l "createTrackHeader" $FILES 2>/dev/null; then
        echo "❌ Found deprecated terminology (createTrackHeader)"
        echo "   Please use createVoiceBusHeader instead"
        exit 1
    fi
fi
```

---

## Migration Patterns

### Pattern 1: Type Renaming

```cpp
// Before (❌)
class TrackIndex : public StrongType<int, TrackIndex> {
    static TrackIndex fromInt(int index);
    int toInt() const;
};

// After (✅)
class VoiceBusIndex : public StrongType<int, VoiceBusIndex> {
    static VoiceBusIndex fromInt(int index);
    int toInt() const;
};

// Deprecated alias (for backward compatibility)
using TrackIndex [[deprecated("Use VoiceBusIndex instead")]] = VoiceBusIndex;
```

### Pattern 2: Method Renaming

```cpp
// Before (❌)
class AudioClipParameters {
    AudioClipParameters& setTrack(TrackIndex track);
    TrackIndex getTrackIndex() const;

private:
    TrackIndex trackIndex_;
};

// After (✅)
class AudioClipParameters {
    AudioClipParameters& setVoiceBus(VoiceBusIndex voiceBus);
    VoiceBusIndex getVoiceBusIndex() const;

    // Deprecated aliases (for backward compatibility)
    [[deprecated("Use setVoiceBus() instead")]]
    AudioClipParameters& setTrack(TrackIndex track) {
        return setVoiceBus(voiceBus);
    }

    [[deprecated("Use getVoiceBusIndex() instead")]]
    TrackIndex getTrackIndex() const {
        return TrackIndex(getVoiceBusIndex());
    }

private:
    VoiceBusIndex voiceBusIndex_;
};
```

### Pattern 3: UI Component Renaming

```cpp
// Before (❌)
static std::unique_ptr<juce::Component> createTrackHeader(
    const juce::String& trackName = "",
    const ComponentConfig& config = ComponentConfig{});

// After (✅)
static std::unique_ptr<juce::Component> createVoiceBusHeader(
    const juce::String& voiceBusName = "",
    const ComponentConfig& config = ComponentConfig{});

// Deprecated alias (for backward compatibility)
[[deprecated("Use createVoiceBusHeader() instead")]]
static std::unique_ptr<juce::Component> createTrackHeader(
    const juce::String& trackName = "",
    const ComponentConfig& config = ComponentConfig{}) {
    return createVoiceBusHeader(voiceBusName, config);
}
```

---

## Documentation Standards

### README.md

**✅ Preferred:**
```markdown
# JUCE Audio Execution Engine

A real-time safe, lock-free audio execution engine for tvOS.
Provides plugin hosting, DSP processing, and voice management.
```

**❌ Deprecated:**
```markdown
# JUCE Backend Server

Backend server for Schillinger System with DAW integration
and track management.
```

### API Documentation

**✅ Preferred:**
```cpp
/**
 * @brief Index of a voice bus in the execution engine
 *
 * VoiceBusIndex provides type-safe indexing for voice buses,
 * which route audio output from synthesis voices to processing chains.
 */
```

**❌ Deprecated:**
```cpp
/**
 * @brief Index of a track in the DAW
 *
 * TrackIndex provides type-safe indexing for tracks,
 * which contain audio clips and automation.
 */
```

---

## Testing Considerations

### Unit Tests

**Test Names:**
```cpp
// ✅ Preferred
TEST(VoiceBusTest, AddVoiceToVoiceBusSucceeds) { }
TEST(ExecutionLaneTest, ScheduleEventAtCorrectTime) { }

// ❌ Deprecated
TEST(TrackTest, AddClipToTrackSucceeds) { }
TEST(CompositionTest, AddTrackToComposition) { }
```

### Test Variables

```cpp
// ✅ Preferred
VoiceBusIndex voiceBusIndex;
VoiceCount voiceCount;
EventQueue eventQueue;

// ❌ Deprecated
TrackIndex trackIndex;
TrackCount trackCount;
ClipQueue clipQueue;
```

---

## Glossary

### Execution Language Terms

| Term | Definition |
|------|------------|
| **voice** | Individual synthesis voice (oscillator, envelope, etc.) |
| **voiceBus** | Audio routing destination for one or more voices |
| **executionLane** | Scheduled sequence of audio events |
| **schedule** | Temporal ordering of audio events |
| **event** | Single audio event (note, parameter change, etc.) |
| **channel** | Audio output channel (left/right, etc.) |
| **timeline** | Scheduling timeline for event execution |
| **audio host** | Application hosting audio plugins (DAW, standalone, etc.) |
| **plugin host** | System for loading and managing audio plugins |

### Deprecated Terms

| Term | Why Deprecated |
|------|----------------|
| **track** | Implies DAW timeline context; not applicable to tvOS |
| **composition** | Musical terminology; not technical execution term |
| **DAW** | Too specific; JUCE hosts plugins in many contexts |
| **add track** | DAW-specific operation; not relevant to execution engine |
| **malformed track** | Vague error message; use precise technical terms |

---

## Enforcement

### Pre-Merge Requirements

1. **Code Review:** All PRs must be reviewed using this checklist
2. **Linter:** Must pass terminology linter checks
3. **Documentation:** API docs must use execution language
4. **Tests:** Test names and variables must use execution language

### Rollback Plan

If migration issues arise:
1. **Short-term:** Use deprecated aliases with `[[deprecated]]` warnings
2. **Medium-term:** Fix compilation errors in dependent code
3. **Long-term:** Remove deprecated aliases after 6-month grace period

---

## Success Metrics

### Quantitative

- ✅ 100% of new code uses execution language in type/method names
- ✅ 0% of new code uses deprecated "track/composition" terms
- ✅ Linter catches 100% of deprecated terminology in PRs

### Qualitative

- ✅ Codebase mental model aligned with tvOS local-only reality
- ✅ New contributors not confused by DAW terminology
- ✅ API documentation clearly describes execution engine behavior

---

## Related Documents

- `ServerEraDeprecationPlan.md` - Overall deprecation strategy
- `TvOSBuildChecklist.md` - Build validation checklist
- `Phase4TerminologyMigration.md` - Phase 4 implementation report

---

## Approval

**Status:** ✅ **APPROVED for Phase 4a Implementation**

**Next Steps:**
1. Add linter rules to CI/CD pipeline
2. Update code review checklist
3. Begin Phase 4b: Public API migration

---

**End of Execution Language Guidelines**
**Date:** December 31, 2025
**Version:** 1.0
