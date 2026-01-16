# Routing & Mix Bus

**Purpose:** Audio routing, bus topology, and send/return logic

## Responsibilities

This folder contains all audio routing logic:

- **Bus Topology** - Mix bus architecture (master, aux, groups)
- **Send Routing** - Pre/post fader sends to buses
- **Return Routing** - Bus effects return to mix
- **Graph Processing** - Audio graph execution order
- **Connection Management** - Track→Bus connections

## Core Types

```cpp
// Bus type
enum class BusType {
    MASTER,      // Final output (always index 0)
    AUX,         // Effects bus (reverb, delay, etc.)
    GROUP,       // Submix bus (drums, vocals, etc.)
    OUTPUT       // Direct output (no processing)
};

// Bus definition
struct BusInfo {
    std::string id;
    std::string name;
    int busIndex;
    BusType type;
    double volume;  // dB
};

// Send connection
struct SendConnection {
    std::string sourceTrackId;
    std::string destinationBusId;
    double amount;   // 0.0 to 1.0
    bool preFader;   // true = pre-fader, false = post-fader
};
```

## Audio Graph

The audio graph defines the processing order:

```
Tracks (instruments)
    ↓
[Insert Effects]
    ↓
[Sends → Aux Buses → Effects → Returns]
    ↓
[Group Buses]
    ↓
[Master Bus → Master Effects]
    ↓
Output
```

## Design Principles

- **No cycles**: Graph must be acyclic (directed)
- **Deterministic order**: Same topology = same processing order
- **Real-time safe**: Graph changes between process() calls only
- **Explicit connections**: All routing explicit (no hidden paths)

## Constraints

### Bus Restrictions
- Master bus always at index 0
- No sends TO master (only FROM master)
- Aux buses can chain (aux → aux)
- Groups cannot send to groups (prevent cycles)

### Send Limits
- Max 8 sends per track (configurable)
- Pre-fader sends processed before volume
- Post-fader sends processed after volume

## Files

- `include/routing/AudioGraph.h` - Graph structure
- `include/routing/BusTypes.h` - Bus type definitions
- `src/routing/AudioGraphBuilder.cpp` - Graph construction
- `src/routing/BusProcessor.cpp` - Bus processing logic
- `tests/routing/AudioGraphTest.cpp` - Unit tests

## Dependencies

- `include/console/ConsoleChannelDSP.h` - Channel strips
- `include/effects/EffectDSP.h` - Bus effects
- `integration/SongModelAdapter.h` - SongModel routing info

## Platform Notes

- tvOS: Simplified routing (master + 4 aux buses max)
- macOS: Full routing (unlimited buses)
- All platforms: Same graph validation

## Performance

- Graph processing: O(n) where n = number of active nodes
- Send processing: O(s) where s = number of sends
- No allocations during process()

---

**Owner:** DSP Team
**Status:** 🟡 Design Phase (topology not yet defined)
**Priority:** HIGH
