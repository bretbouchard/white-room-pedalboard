# Phase 10 Execution Backlog

**Status**: NOT STARTED
**Priority**: BLOCKER (Phases 11-13 depend on this)
**Target**: Working playhead + section boundaries + loop state

---

## What Phase 10 Actually Does

### Engine Must Implement
1. Playhead state (bars, beats, absolute time)
2. Section boundaries as first-class data
3. Loop boundaries
4. "Applies next loop" timing signals

### Swift Must Implement
1. Playhead overlay (render playhead position)
2. Section highlight binding (show current section)
3. Deferred-apply badges (show pending edits)
4. Panic integrated into transport

### Acceptance Criteria
- ✅ You can see section changes
- ✅ You can see deferred edits arm and apply
- ✅ UI reacts to engine time, not mock state

---

## Execution Order (Engine → Swift → Integration)

### STAGE 1: Engine Data Structures (C++)

**File**: `include/engine/PlayheadState.h`
```cpp
#pragma once

#include <cstdint>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/// Playhead position in musical time
typedef struct {
    double absolute_time;      // Seconds since engine start
    int32_t bar;               // Current bar (1-based)
    int32_t beat;              // Current beat within bar (1-based)
    double tick;               // Tick position within beat (0.0-1.0)
    double tempo;              // Current BPM
    int32_t numerator;         // Time signature numerator
    int32_t denominator;       // Time signature denominator
} schillinger_playhead_t;

/// Section boundary (first-class data)
typedef struct {
    char id[64];               // Unique section ID
    char name[128];            // Display name
    double start_time;         // Start time in seconds
    double end_time;           // End time in seconds (0 = infinite)
    int32_t start_bar;         // Start bar
    int32_t end_bar;           // End bar (0 = infinite)
    bool is_loop;              // Is this a loop section?
} schillinger_section_t;

/// Loop state
typedef struct {
    bool is_active;            // Is a loop currently active?
    char section_id[64];       // Active loop section ID
    int32_t loop_count;        // How many loops completed
    int32_t max_loops;         // Max loops (0 = infinite)
    double exit_time;          // When to exit loop (absolute time)
} schillinger_loop_state_t;

#ifdef __cplusplus
}
#endif
```

**Task**: Create header file
**Acceptance**: Compiles without errors
**Time**: 10 minutes

---

### STAGE 2: Engine State Machine (C++)

**File**: `src/engine/PlayheadEngine.cpp`
```cpp
#include "engine/PlayheadState.h"
#include <vector>
#include <string>

class PlayheadEngine {
public:
    // Current playhead state (READ ONLY to Swift)
    schillinger_playhead_t current_playhead;

    // Registered sections
    std::vector<schillinger_section_t> sections;

    // Current loop state
    schillinger_loop_state_t loop_state;

    // Update playhead for this audio buffer
    void update(double sample_rate, uint32_t num_samples);

    // Register a section boundary
    void add_section(const schillinger_section_t& section);

    // Clear all sections
    void clear_sections();

    // Enter loop mode
    void enter_loop(const char* section_id, int32_t max_loops);

    // Exit loop mode
    void exit_loop();

private:
    double absolute_time_ = 0.0;
    double tempo_ = 120.0;
    int32_t numerator_ = 4;
    int32_t denominator_ = 4;

    // Calculate current bar/beat from absolute time
    void calculate_musical_time();

    // Check if we need to exit loop
    void check_loop_exit();

    // Find current section
    schillinger_section_t* find_current_section();
};
```

**Task**: Implement state machine
**Acceptance**: Compiles, unit tests pass
**Time**: 2 hours

---

### STAGE 3: Engine FFI Bridge (C++)

**File**: `src/ffi/PlayheadFFI.cpp`
```cpp
#include "JuceFFI.h"
#include "engine/PlayheadEngine.h"

// Global engine instance
static PlayheadEngine g_playhead_engine;

// Get current playhead state
extern "C" {
    schillinger_error_t schillinger_playhead_get_state(
        schillinger_engine_t engine,
        schillinger_playhead_t* out_state
    ) {
        if (!out_state) {
            return SCHILLINGER_ERROR_INVALID_ARGUMENT;
        }

        *out_state = g_playhead_engine.current_playhead;
        return SCHILLINGER_ERROR_NONE;
    }

    schillinger_error_t schillinger_sections_add(
        schillinger_engine_t engine,
        const schillinger_section_t* section
    ) {
        if (!section) {
            return SCHILLINGER_ERROR_INVALID_ARGUMENT;
        }

        g_playhead_engine.add_section(*section);
        return SCHILLINGER_ERROR_NONE;
    }

    schillinger_error_t schillinger_sections_clear(
        schillinger_engine_t engine
    ) {
        g_playhead_engine.clear_sections();
        return SCHILLINGER_ERROR_NONE;
    }

    schillinger_error_t schillinger_loop_enter(
        schillinger_engine_t engine,
        const char* section_id,
        int32_t max_loops
    ) {
        if (!section_id) {
            return SCHILLINGER_ERROR_INVALID_ARGUMENT;
        }

        g_playhead_engine.enter_loop(section_id, max_loops);
        return SCHILLINGER_ERROR_NONE;
    }

    schillinger_error_t schillinger_loop_exit(
        schillinger_engine_t engine
    ) {
        g_playhead_engine.exit_loop();
        return SCHILLINGER_ERROR_NONE;
    }
}
```

**Task**: Add FFI functions to JuceFFI.h
**Acceptance**: Swift can call these functions
**Time**: 30 minutes

---

### STAGE 4: Update FFI Header

**File**: `include/ffi/JuceFFI.h`
```c
// Add to existing header

/// Playhead position
typedef struct {
    double absolute_time;
    int32_t bar;
    int32_t beat;
    double tick;
    double tempo;
    int32_t numerator;
    int32_t denominator;
} schillinger_playhead_t;

/// Section boundary
typedef struct {
    char id[64];
    char name[128];
    double start_time;
    double end_time;
    int32_t start_bar;
    int32_t end_bar;
    bool is_loop;
} schillinger_section_t;

/// Loop state
typedef struct {
    bool is_active;
    char section_id[64];
    int32_t loop_count;
    int32_t max_loops;
    double exit_time;
} schillinger_loop_state_t;

// New API functions
schillinger_error_t schillinger_playhead_get_state(
    schillinger_engine_t engine,
    schillinger_playhead_t* out_state
);

schillinger_error_t schillinger_sections_add(
    schillinger_engine_t engine,
    const schillinger_section_t* section
);

schillinger_error_t schillinger_sections_clear(
    schillinger_engine_t engine
);

schillinger_error_t schillinger_loop_enter(
    schillinger_engine_t engine,
    const char* section_id,
    int32_t max_loops
);

schillinger_error_t schillinger_loop_exit(
    schillinger_engine_t engine
);
```

**Task**: Update header
**Acceptance**: Swift can import and compile
**Time**: 15 minutes

---

### STAGE 5: Swift Data Models

**File**: `swift_frontend/src/SwiftFrontendCore/Engine/Models/PlayheadState.swift`
```swift
import Foundation

@MainActor
public struct PlayheadState: Sendable, Equatable {
    public let absoluteTime: TimeInterval
    public let bar: Int
    public let beat: Int
    public let tick: Double
    public let tempo: Double
    public let timeSignatureNumerator: Int
    public let timeSignatureDenominator: Int

    public init(
        absoluteTime: TimeInterval,
        bar: Int,
        beat: Int,
        tick: Double,
        tempo: Double,
        timeSignatureNumerator: Int,
        timeSignatureDenominator: Int
    ) {
        self.absoluteTime = absoluteTime
        self.bar = bar
        self.beat = beat
        self.tick = tick
        self.tempo = tempo
        self.timeSignatureNumerator = timeSignatureNumerator
        self.timeSignatureDenominator = timeSignatureDenominator
    }
}

@MainActor
public struct Section: Sendable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let startTime: TimeInterval
    public let endTime: TimeInterval
    public let startBar: Int
    public let endBar: Int
    public let isLoop: Bool

    public init(
        id: String,
        name: String,
        startTime: TimeInterval,
        endTime: TimeInterval,
        startBar: Int,
        endBar: Int,
        isLoop: Bool
    ) {
        self.id = id
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.startBar = startBar
        self.endBar = endBar
        self.isLoop = isLoop
    }
}

@MainActor
public struct LoopState: Sendable, Equatable {
    public let isActive: Bool
    public let sectionId: String
    public let loopCount: Int
    public let maxLoops: Int
    public let exitTime: TimeInterval

    public init(
        isActive: Bool,
        sectionId: String,
        loopCount: Int,
        maxLoops: Int,
        exitTime: TimeInterval
    ) {
        self.isActive = isActive
        self.sectionId = sectionId
        self.loopCount = loopCount
        self.maxLoops = maxLoops
        self.exitTime = exitTime
    }
}
```

**Task**: Create Swift models
**Acceptance**: Compiles, matches C structs
**Time**: 30 minutes

---

### STAGE 6: Swift Engine Client Extension

**File**: `swift_frontend/src/SwiftFrontendCore/Integration/RealEngineClient+Phase10.swift`
```swift
import Foundation

extension RealEngineClient {
    nonisolated(unsafe) public func getPlayheadState() async throws -> PlayheadState {
        var state = schillinger_playhead_t()
        let error = schillinger_playhead_get_state(engine_, &state)

        guard error == SCHILLINGER_ERROR_NONE else {
            throw EngineError.engineFailed("Failed to get playhead state")
        }

        return PlayheadState(
            absoluteTime: state.absolute_time,
            bar: Int(state.bar),
            beat: Int(state.beat),
            tick: state.tick,
            tempo: state.tempo,
            timeSignatureNumerator: Int(state.numerator),
            timeSignatureDenominator: Int(state.denominator)
        )
    }

    nonisolated(unsafe) public func addSection(_ section: Section) async throws {
        var cSection = schillinger_section_t()
        strncpy(&cSection.id, section.id, 64)
        strncpy(&cSection.name, section.name, 128)
        cSection.start_time = section.startTime
        cSection.end_time = section.endTime
        cSection.start_bar = Int32(section.startBar)
        cSection.end_bar = Int32(section.endBar)
        cSection.is_loop = section.isLoop

        let error = schillinger_sections_add(engine_, &cSection)
        guard error == SCHILLINGER_ERROR_NONE else {
            throw EngineError.engineFailed("Failed to add section")
        }
    }

    nonisolated(unsafe) public func clearSections() async throws {
        let error = schillinger_sections_clear(engine_)
        guard error == SCHILLINGER_ERROR_NONE else {
            throw EngineError.engineFailed("Failed to clear sections")
        }
    }

    nonisolated(unsafe) public func enterLoop(sectionId: String, maxLoops: Int) async throws {
        let error = schillinger_loop_enter(engine_, sectionId, Int32(maxLoops))
        guard error == SCHILLINGER_ERROR_NONE else {
            throw EngineError.engineFailed("Failed to enter loop")
        }
    }

    nonisolated(unsafe) public func exitLoop() async throws {
        let error = schillinger_loop_exit(engine_)
        guard error == SCHILLINGER_ERROR_NONE else {
            throw EngineError.engineFailed("Failed to exit loop")
        }
    }
}
```

**Task**: Extend engine client
**Acceptance**: Swift can call FFI functions
**Time**: 45 minutes

---

### STAGE 7: Swift Playhead Store

**File**: `swift_frontend/src/SwiftFrontendCore/Surface/State/PlayheadStore.swift`
```swift
import Foundation
import Combine

@MainActor
public final class PlayheadStore: ObservableObject {
    @Published public private(set) var playheadState: PlayheadState?
    @Published public private(set) var sections: [Section] = []
    @Published public private(set) var loopState: LoopState?

    private let engineClient: EngineClient
    private var updateTimer: Timer?

    public init(engineClient: EngineClient) {
        self.engineClient = engineClient
    }

    public func startPolling() {
        // Poll at 60 FPS
        updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0/60.0, repeats: true) { [weak self] _ in
            Task { [weak self] in
                await self?.update()
            }
        }
    }

    public func stopPolling() {
        updateTimer?.invalidate()
        updateTimer = nil
    }

    private func update() async {
        do {
            let state = try await engineClient.getPlayheadState()
            self.playheadState = state
        } catch {
            print("Failed to update playhead: \(error)")
        }
    }

    public func addSection(_ section: Section) async {
        do {
            try await engineClient.addSection(section)
            sections.append(section)
        } catch {
            print("Failed to add section: \(error)")
        }
    }

    public func clearSections() async {
        do {
            try await engineClient.clearSections()
            sections.removeAll()
        } catch {
            print("Failed to clear sections: \(error)")
        }
    }

    public func enterLoop(sectionId: String, maxLoops: Int) async {
        do {
            try await engineClient.enterLoop(sectionId: sectionId, maxLoops: maxLoops)
            // Update loop state on next poll
        } catch {
            print("Failed to enter loop: \(error)")
        }
    }

    public func exitLoop() async {
        do {
            try await engineClient.exitLoop()
            // Update loop state on next poll
        } catch {
            print("Failed to exit loop: \(error)")
        }
    }
}
```

**Task**: Create playhead store
**Acceptance**: Polls engine, updates state
**Time**: 45 minutes

---

### STAGE 8: Swift Playhead Overlay View

**File**: `swift_frontend/src/SwiftFrontendCore/Surface/Components/PlayheadOverlay.swift`
```swift
import SwiftUI

@MainActor
public struct PlayheadOverlay: View {
    @ObservedObject var playheadStore: PlayheadStore
    @ObservedObject var layoutStore: SurfaceLayoutStore

    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Playhead line
                if let state = playheadStore.playheadState {
                    playheadLine(state: state, in: geometry)
                }

                // Section highlights
                ForEach(playheadStore.sections) { section in
                    sectionHighlight(section, in: geometry)
                }
            }
        }
    }

    private func playheadLine(state: PlayheadState, in geometry: GeometryProxy) -> some View {
        let xPosition = calculateXPosition(state: state, in: geometry)

        return Rectangle()
            .fill(Color.red)
            .frame(width: 2)
            .position(x: xPosition, y: geometry.size.height / 2)
    }

    private func sectionHighlight(_ section: Section, in geometry: GeometryProxy) -> some View {
        let startX = calculateXPosition(time: section.startTime, in: geometry)
        let endX = calculateXPosition(time: section.endTime, in: geometry)
        let width = endX - startX

        return Rectangle()
            .fill(Color.blue.opacity(0.2))
            .frame(width: width)
            .position(x: startX + width / 2, y: geometry.size.height / 2)
            .overlay(
                Text(section.name)
                    .font(.caption)
                    .foregroundColor(.white)
                    .position(x: startX + 10, y: 20)
            )
    }

    private func calculateXPosition(state: PlayheadState, in geometry: GeometryProxy) -> CGFloat {
        return calculateXPosition(time: state.absoluteTime, in: geometry)
    }

    private func calculateXPosition(time: TimeInterval, in geometry: GeometryProxy) -> CGFloat {
        // TODO: Map time to X position based on timeline zoom
        return CGFloat(time) * 10.0 // Placeholder
    }
}
```

**Task**: Create playhead overlay
**Acceptance**: Shows playhead line and section highlights
**Time**: 1 hour

---

### STAGE 9: Integrate Playhead into Surface

**File**: Modify `swift_frontend/src/SwiftFrontendCore/Surface/SingleContinuousSongSurface.swift`
```swift
// Add to surface state
@StateObject private var playheadStore: PlayheadStore

// Initialize in init()
self._playheadStore = StateObject(wrappedValue: PlayheadStore(engineClient: engineClient))

// Add to body
ZStack {
    // Existing surface content...

    // Playhead overlay
    PlayheadOverlay(playheadStore: playheadStore, layoutStore: layoutStore)
}

// Start polling on appear
.onAppear {
    playheadStore.startPolling()

    // Add test sections
    Task {
        await playheadStore.addSection(Section(
            id: "section-1",
            name: "Verse",
            startTime: 0.0,
            endTime: 30.0,
            startBar: 1,
            endBar: 8,
            isLoop: false
        ))

        await playheadStore.addSection(Section(
            id: "section-2",
            name: "Chorus",
            startTime: 30.0,
            endTime: 60.0,
            startBar: 9,
            endBar: 16,
            isLoop: true
        ))
    }
}
.onDisappear {
    playheadStore.stopPolling()
}
```

**Task**: Integrate into surface
**Acceptance**: Playhead visible on surface
**Time**: 30 minutes

---

### STAGE 10: Testing & Validation

**File**: `swift_frontend/tests/SurfaceTests/PlayheadTests.swift`
```swift
import XCTest
@testable import SwiftFrontendCore

@MainActor
final class PlayheadTests: XCTestCase {
    func testPlayheadAdvances() async throws {
        let engineClient = MockEngineClient()
        let store = PlayheadStore(engineClient: engineClient)

        store.startPolling()

        // Wait a few frames
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds

        XCTAssertNotNil(store.playheadState)
        XCTAssertTrue(store.playheadState!.absoluteTime > 0)
    }

    func testSectionHighlight() async throws {
        let engineClient = MockEngineClient()
        let store = PlayheadStore(engineClient: engineClient)

        await store.addSection(Section(
            id: "test-section",
            name: "Test",
            startTime: 0.0,
            endTime: 10.0,
            startBar: 1,
            endBar: 4,
            isLoop: false
        ))

        XCTAssertEqual(store.sections.count, 1)
        XCTAssertEqual(store.sections.first?.id, "test-section")
    }
}
```

**Task**: Write tests
**Acceptance**: All tests pass
**Time**: 1 hour

---

## Total Time Estimate

- Stage 1 (Data structures): 10 min
- Stage 2 (Engine state machine): 2 hours
- Stage 3 (FFI bridge): 30 min
- Stage 4 (Update header): 15 min
- Stage 5 (Swift models): 30 min
- Stage 6 (Engine client): 45 min
- Stage 7 (Playhead store): 45 min
- Stage 8 (Playhead overlay): 1 hour
- Stage 9 (Surface integration): 30 min
- Stage 10 (Testing): 1 hour

**Total: ~7 hours** of focused work

---

## Binary Acceptance Criteria

Phase 10 is COMPLETE when:

1. ✅ You can run the tvOS app
2. ✅ You see a red playhead line moving across the screen
3. ✅ You see blue section highlights labeled "Verse" and "Chorus"
4. ✅ The playhead advances as audio plays (or mock time advances)
5. ✅ Sections highlight when playhead enters them
6. ✅ No mock data - real engine state

**If these 6 things work, Phase 10 is done.** Everything else is optimization.
