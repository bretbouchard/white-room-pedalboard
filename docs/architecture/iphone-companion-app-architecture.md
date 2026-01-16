# iPhone Companion App - Architecture Diagrams

**Visual representation of the iPhone Companion App architecture**

---

## Component Hierarchy

```mermaid
graph TB
    App[WhiteRoomApp<br/>SwiftUI Entry Point]
    Root[RootView<br/>Tab Navigation]
    TabView[TabView<br/>4 Main Tabs]

    TabView --> PianoRoll[PianoRollFeature<br/>Note Editing]
    TabView --> Mixing[MixingConsoleFeature<br/>Audio Mixing]
    TabView --> Instruments[InstrumentParamsFeature<br/>Parameter Editing]
    TabView --> Settings[SettingsFeature<br/>App Configuration]

    PianoRoll --> NoteCanvas[NoteCanvas<br/>Canvas Rendering]
    PianoRoll --> Keyboard[PianoKeyboard<br/>Touch Keyboard]
    PianoRoll --> Timeline[TimelineView<br/>Playhead + Zoom]
    PianoRoll --> Velocity[VelocityEditor<br/>Gesture Control]

    Mixing --> ChannelStrips[ChannelStripsView<br/>Vertical Layout]
    Mixing --> Faders[FadersView<br/>Haptic Feedback]
    Mixing --> Meters[LevelMetersView<br/>60Hz Updates]
    Mixing --> PanKnobs[PanKnobsView<br/>Gesture Control]

    Instruments --> Presets[PresetManager<br/>CRUD Operations]
    Instruments --> ParameterKnobs[ParameterKnobs<br/>Rotary Controls]
    Instruments --> Sliders[ParameterSliders<br/>Linear Controls]
    Instruments --> Automation[AutomationView<br/>Curve Editor]

    style App fill:#4CAF50,stroke:#2E7D32,stroke-width:3px
    style PianoRoll fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Mixing fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Instruments fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
    style Settings fill:#607D8B,stroke:#455A64,stroke-width:2px
```

---

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant UI as SwiftUI View
    participant TCA as TCA Store<br/>(State Management)
    participant Repo as SongRepository<br/>(Data Layer)
    participant Cache as LocalCache<br/>(CoreData)
    participant FFI as FFI Bridge<br/>(JUCE Communication)
    participant Engine as JUCE Engine<br/>(Audio Backend)

    Note over UI,Engine: User taps note
    UI->>TCA: .noteTapped(noteId)
    TCA->>TCA: Reducer processes action
    TCA->>TCA: Update state: selectedNotes = [noteId]
    TCA->>UI: State update (published)
    UI->>UI: Re-render with selection

    Note over UI,Engine: User drags fader
    UI->>TCA: .faderChanged(channelId, newValue)
    TCA->>TCA: Reducer processes action
    TCA->>TCA: Update state: channels[id].fader = newValue
    TCA->>Repo: saveFader(channelId, newValue)

    Note over UI,Engine: Optimistic update
    Repo->>Cache: Update local cache immediately
    Cache-->>Repo: Success
    Repo-->>TCA: Confirmation (optimistic)
    TCA->>UI: State update (instant feedback)

    Note over UI,Engine: Background sync to JUCE
    Repo->>FFI: sch_engine_set_fader(channelId, newValue)
    FFI->>Engine: Engine mutation
    Engine-->>FFI: Success/Error
    FFI-->>Repo: Result
    Repo-->>TCA: Async confirmation

    Note over UI,Engine: Real-time audio updates (60Hz)
    Engine->>FFI: Audio state poll
    FFI->>Repo: AudioStateUpdate
    Repo->>TCA: .audioStateUpdated(update)
    TCA->>UI: State update (60Hz)
    UI->>UI: Re-render meters/levels
```

---

## State Management (TCA)

```mermaid
graph LR
    Action[User Action] --> Reducer[Reducer<br/>Pure Function]
    Reducer --> State[New State]
    Reducer --> Effect[Effect<br/>Async Operation]
    Effect --> Environment[Environment<br/>Dependencies]
    Environment --> Action2[New Action]
    State --> View[SwiftUI View]
    View --> Action

    style State fill:#4CAF50,stroke:#2E7D32,stroke-width:3px
    style Reducer fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Effect fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Environment fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
```

### TCA Feature Structure

```mermaid
graph TB
    Feature[PianoRollFeature]
    State[State<br/>notes: [NoteEvent]<br/>selectedNotes: Set<UUID><br/>zoomLevel: Double<br/>scrollOffset: CGPoint]
    Action[Action<br/>noteTapped(UUID)<br/>noteDragged(UUID, CGPoint)<br/>zoomChanged(Double)<br/>recordingToggled(Bool)]
    Environment[Environment<br/>songRepository: SongRepository<br/>mainQueue: DispatchQueue<br/>audioPoller: AudioStatePoller]
    Reducer[Reducer<br/>Pure Function]
    Store[Store<br/>Runtime State Machine]

    State --> Reducer
    Action --> Reducer
    Environment --> Reducer
    Reducer --> Store
    Store --> View[SwiftUI View]

    style State fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Action fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Environment fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
    style Reducer fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Store fill:#F44336,stroke:#C62828,stroke-width:2px
```

---

## Repository Pattern

```mermaid
graph TB
    Client[TCA Feature]
    Protocol[SongRepository<br/>Protocol]
    Cached[CachedSongRepository<br/>Offline-First Implementation]
    Local[LocalSongCache<br/>CoreData]
    Remote[JUCESongRepository<br/>FFI Bridge]
    Resolver[ConflictResolver<br/>Merge Strategy]

    Client --> Protocol
    Protocol --> Cached
    Cached --> Local
    Cached --> Remote
    Cached --> Resolver

    Protocol -.->|Mock| Mock[MockSongRepository<br/>Testing]

    style Client fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Cached fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Local fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Remote fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
    style Resolver fill:#F44336,stroke:#C62828,stroke-width:2px
    style Mock fill:#9E9E9E,stroke:#616161,stroke-width:2px,stroke-dasharray: 5 5
```

---

## Offline Sync Strategy

```mermaid
sequenceDiagram
    participant User as User Action
    participant UI as SwiftUI UI
    participant Cache as Local Cache<br/>(CoreData)
    participant Queue as Sync Queue<br/>(Pending Operations)
    participant Network as Network Monitor
    participant FFI as FFI Bridge
    participant JUCE as JUCE Engine

    Note over User,JUCE: Online Mode
    User->>UI: Edit note
    UI->>Cache: Save note immediately
    Cache-->>UI: Success (optimistic)
    UI->>UI: Update UI (instant)
    UI->>FFI: Sync to JUCE in background
    FFI->>JUCE: sch_engine_update_note()
    JUCE-->>FFI: Success

    Note over User,JUCE: Offline Mode
    User->>UI: Edit note
    UI->>Cache: Save note immediately
    Cache-->>UI: Success (optimistic)
    UI->>UI: Update UI (instant)
    UI->>Queue: Add to pending sync queue

    Note over User,JUCE: Reconnection
    Network->>Queue: Network available
    Queue->>FFI: Process pending operations
    loop For each pending operation
        FFI->>JUCE: sch_engine_update_note()
        JUCE-->>FFI: Success/Error
        FFI-->>Queue: Mark as synced
    end
    Queue->>Cache: Clear synced operations
```

---

## Real-time Updates

```mermaid
sequenceDiagram
    participant Engine as JUCE Engine
    participant Poller as AudioStatePoller<br/>(60Hz)
    participant Stream as AsyncStream
    participant Effect as TCA Effect
    participant Reducer as TCA Reducer
    participant UI as SwiftUI View

    Engine->>Poller: Audio state changes
    Poller->>Poller: Poll at 60Hz (16ms intervals)
    Poller->>Stream: yield(AudioStateUpdate)
    Stream->>Effect: Receive update
    Effect->>Effect: Throttle to 16ms (60Hz)
    Effect->>Reducer: .audioStateUpdated(update)
    Reducer->>Reducer: Update state: channels[id].level = newValue
    Reducer->>UI: State published
    UI->>UI: Re-render level meters

    Note over Engine,UI: Continuous loop while app is active
```

---

## Performance Optimization

```mermaid
graph TB
    Input[1000+ Notes]
    Canvas[Canvas Rendering]
    Filter[Visibility Filter<br/>Only Visible Notes]
    Batch[Batch Drawing<br/>Group by Color]
    Optimize[Optimized Paths<br/>Reuse Paths]
    Render[GPU Rendering<br/>60fps Target]

    Input --> Filter
    Filter --> Batch
    Batch --> Optimize
    Optimize --> Render

    Input2[60Hz Updates]
    Throttle[Throttle to 16ms<br/>Debounce Duplicates]
    Diff[State Diff<br/>Only Update Changed]
    Render2[Efficient Re-render<br/>SwiftUI Optimizations]

    Input2 --> Throttle
    Throttle --> Diff
    Diff --> Render2

    style Filter fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Batch fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Throttle fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Diff fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
    style Render fill:#4CAF50,stroke:#2E7D32,stroke-width:3px
```

---

## Component Reusability

```mermaid
graph TB
    Shared[SwiftFrontendShared<br/>Cross-Platform Components]
    Theme[Theme System<br/>Pro/Studio/Live/HighContrast]
    Colors[Colors<br/>Typography<br/>Spacing]
    Cards[Cards<br/>Song/Performance/Template]
    Pickers[Pickers<br/>Enum/Slider]
    Feedback[Feedback<br/>Loading/Error/Success]
    Nav[Navigation<br/>Manager]

    Shared --> Theme
    Shared --> Colors
    Shared --> Cards
    Shared --> Pickers
    Shared --> Feedback
    Shared --> Nav

    iPhone[iPhone Companion App<br/>Platform-Specific]
    PianoRoll[Piano Roll<br/>Canvas + Gestures]
    Mixing[Mixing Console<br/>Faders + Meters]
    Params[Instrument Parameters<br/>Knobs + Sliders]

    Shared -->|Reuses| iPhone
    iPhone --> PianoRoll
    iPhone --> Mixing
    iPhone --> Params

    TV[Apple TV Composer<br/>Existing App]
    TV -->|Reuses| Shared

    style Shared fill:#4CAF50,stroke:#2E7D32,stroke-width:3px
    style iPhone fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style TV fill:#FF9800,stroke:#EF6C00,stroke-width:2px
```

---

## FFI Bridge Integration

```mermaid
graph LR
    Swift[Swift Frontend<br/>iPhone App]
    FFI[FFI Bridge<br/>C Interface]
    JUCE[JUCE Engine<br/>C++ Backend]

    Swift -->|sch_engine_create| FFI
    Swift -->|sch_engine_load_song| FFI
    Swift -->|sch_engine_note_on| FFI
    Swift -->|sch_engine_set_fader| FFI
    Swift -->|sch_engine_set_parameter| FFI

    FFI -->|Engine Handle| JUCE
    FFI -->|JSON Serialization| JUCE
    FFI -->|Memory Management| JUCE

    JUCE -->|Audio State| FFI
    JUCE -->|Error Codes| FFI

    FFI -->|sch_result_t| Swift
    FFI -->|JSON Response| Swift
    FFI -->|C Strings| Swift

    style Swift fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style FFI fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style JUCE fill:#FF9800,stroke:#EF6C00,stroke-width:2px
```

---

## Testing Architecture

```mermaid
graph TB
    Unit[Unit Tests<br/>80%+ Coverage]
    Integration[Integration Tests<br/>Repository + FFI]
    UI[UI Tests<br/>SwiftUI Testing]
    Perf[Performance Tests<br/>60fps Targets]

    Unit --> Reducer[TCA Reducers<br/>Pure Functions]
    Unit --> Logic[Business Logic<br/>Conflict Resolution]
    Unit --> Util[Utilities<br/>Formatting, Parsing]

    Integration --> Repo[Repository<br/>Cache + FFI]
    Integration --> Sync[Offline Sync<br/>Queue Processing]
    Integration --> FFI[FFI Bridge<br/>C Integration]

    UI --> PianoRoll[Piano Roll<br/>Draw, Select, Edit]
    UI --> Mixing[Mixing Console<br/>Faders, Meters]
    UI --> Params[Parameters<br/>Knobs, Sliders]

    Perf --> Canvas[Canvas Rendering<br/>1000+ Notes]
    Perf --> Updates[60Hz Updates<br/>Real-time Polling]
    Perf --> Memory[Memory Usage<br/><100MB Target]

    style Unit fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Integration fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style UI fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Perf fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
```

---

## Navigation Flow

```mermaid
graph TB
    Start[App Launch]
    Auth[Authentication<br/>(Future)]
    Main[Main Tab View]

    Start --> Auth
    Auth --> Main

    Main --> Piano[Piano Roll Tab]
    Main --> Mix[Mixing Console Tab]
    Main --> Inst[Instrument Params Tab]
    Main --> Set[Settings Tab]

    Piano --> Editor[Note Editor]
    Piano --> Velocity[Velocity Editor<br/>Sheet Modal]
    Piano --> Quantize[Quantization Menu<br/>Action Sheet]

    Mix --> Channel[Channel Detail<br/>Push Navigation]
    Mix --> Master[Master Fader<br/>Bottom Sheet]

    Inst --> Preset[Preset Manager<br/>Sheet Modal]
    Inst --> Automate[Automation Editor<br/>Push Navigation]
    Inst --> Learn[MIDI Learn<br/>Long-press Gesture]

    Set --> Theme[Theme Picker]
    Set --> About[About Screen]

    style Start fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Main fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Piano fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Mix fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
    style Inst fill:#F44336,stroke:#C62828,stroke-width:2px
```

---

## Parallel Work Tracks

```mermaid
gantt
    title Parallel Development Tracks
    dateFormat YYYY-MM-DD
    section Track A
    TCA Setup + SwiftFrontendShared    :done, 2026-01-15, 1w
    Canvas Rendering + Gestures        :active, 2026-01-29, 1w
    Channel Strips + Faders             :2026-02-19, 1w
    Knobs + Sliders Components          :2026-03-05, 1w
    Performance Optimization            :2026-03-19, 1w

    section Track B
    Repository + FFI Bridge             :done, 2026-01-22, 1w
    Piano Keyboard + Velocity           :2026-02-05, 1w
    Level Meters + Pan Knobs            :2026-02-26, 1w
    Preset Manager + Automation         :2026-03-12, 1w
    Accessibility Testing               :2026-03-19, 1w

    section Track C
    Theme + Navigation                  :done, 2026-01-15, 1w
    JUCE Integration + Testing          :2026-02-12, 1w
    Real-time Updates + TCA Feature     :2026-02-26, 1w
    MIDI Learn + TCA Feature            :2026-03-12, 1w
    Documentation + Release             :2026-03-19, 1w
```

---

## Risk Mitigation

```mermaid
graph TB
    Risk[Risk Identification]
    FFI_Latency[FFI Bridge Latency]
    Canvas_Perf[Canvas Performance]
    Realtime_Sync[Real-time Sync Issues]
    Learning_Curve[TCA Learning Curve]

    Risk --> FFI_Latency
    Risk --> Canvas_Perf
    Risk --> Realtime_Sync
    Risk --> Learning_Curve

    FFI_Latency --> Cache[Aggressive Caching]
    FFI_Latency --> Optimistic[Optimistic UI Updates]
    FFI_Latency --> Mock[Mock Data Fallback]

    Canvas_Perf --> Optimize[Optimize Rendering]
    Canvas_Perf --> Visible[Only Draw Visible]
    Canvas_Perf --> Test[Test on Older Devices]

    Realtime_Sync --> Conflict[Conflict Resolution]
    Realtime_Sync --> Offline[Offline-First]
    Realtime_Sync --> Retry[Retry with Backoff]

    Learning_Curve --> Training[Team Training]
    Learning_Curve --> Generation[Code Generation]
    Learning_Curve --> Pairing[Pair Programming]

    style Risk fill:#F44336,stroke:#C62828,stroke-width:3px
    style Cache fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Optimize fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Conflict fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style Training fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
```

---

## Deployment Pipeline

```mermaid
graph LR
    Dev[Development<br/>Local Machine]
    CI[Continuous Integration<br/>GitHub Actions]
    Test[TestFlight<br/>Beta Testing]
    Prod[App Store<br/>Production Release]

    Dev -->|Push| CI
    CI -->|Build + Test| CI
    CI -->|Pass| Test
    CI -->|Fail| Dev

    Test -->|Beta Testing| Test
    Test -->|Approve| Prod
    Test -->|Reject| Dev

    Prod -->|Release| Prod

    style Dev fill:#4CAF50,stroke:#2E7D32,stroke-width:2px
    style CI fill:#2196F3,stroke:#1565C0,stroke-width:2px
    style Test fill:#FF9800,stroke:#EF6C00,stroke-width:2px
    style Prod fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px
```

---

**Document Version**: 1.0
**Created**: 2026-01-15
**Author**: Claude (Mobile App Builder Agent)
**Related**: `plans/iphone-companion-app-implementation.md`, `docs/iphone-companion-app-summary.md`
