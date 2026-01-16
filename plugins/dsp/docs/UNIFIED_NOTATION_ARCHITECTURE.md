# Unified Notation Architecture - White Room DAW

## Executive Summary

The Unified Notation Architecture provides a flexible, extensible system for viewing and editing music in multiple notation formats simultaneously. This architecture enables White Room to display piano roll, tablature, sheet music, and other notation views in any combination, with real-time synchronization across all views.

## Core Design Principles

1. **View-Data Separation**: Universal music data model independent of view representation
2. **Bidirectional Synchronization**: Changes in any view immediately reflect in all others
3. **Pluggable Views**: Easy to add new notation types without modifying core system
4. **Performance-First**: Optimized rendering for smooth 60fps interaction
5. **Multi-Layout Support**: Split-screen, tabs, floating windows, full-screen
6. **Device Responsive**: Adapts to iPhone, iPad, Mac, and future platforms

---

## 1. Core Data Model

### 1.1 Universal Note Representation

The fundamental unit of music data, independent of notation view:

```swift
/// Universal musical event representation
struct UniversalNote {
    let id: UUID
    var pitch: Int              // MIDI pitch (0-127)
    var startTime: TimeInterval // Seconds from song start
    var duration: TimeInterval  // Length in seconds
    var velocity: UInt8         // 0-127
    var channel: UInt8          // MIDI channel 0-15
    var metadata: NoteMetadata  // Extended information
}

struct NoteMetadata {
    var articulations: Set<Articulation>  // Staccato, accent, tenuto, etc.
    var dynamics: Dynamics                // pp, p, mp, mf, f, ff
    var ornaments: Set<Ornament>          // Trill, mordent, turn, etc.
    var techniques: Set<Technique>        // Hammer-on, pull-off, slide, bend
    var lyrics: [LyricEvent]              // Text + timing
    var expressions: [Expression]         // Crescendo, diminuendo, etc.
    var fretPosition: FretInfo?           // For tablature: string + fret
    var voice: Int                        // Polyphonic voice 0-3
    var tieTo: UUID?                      // ID of note this ties to
    var tieFrom: UUID?                    // ID of note this ties from
}
```

### 1.2 Song Structure

```swift
struct Song {
    var id: UUID
    var name: String
    var tempo: TempoMap                  // Tempo changes over time
    var timeSignature: TimeSignatureMap  // 4/4, 3/4, 6/8, etc.
    var keySignature: KeySignatureMap    // Key changes over time
    var tracks: [Track]                  // Audio/MIDI tracks
    var markers: [Marker]                // Song sections, rehearsal marks
    var metadata: SongMetadata
}

struct Track {
    let id: UUID
    var name: String
    var type: TrackType                  // MIDI, audio, instrument, bus
    var notes: [UniversalNote]           // All notes in track
    var instrument: InstrumentPreset     // Sound to use
    var mixing: MixParameters            // Volume, pan, sends, etc.
    var notationViewSettings: ViewSettings // Per-track view preferences
}
```

### 1.3 Rhythm and Timing

```swift
struct TempoMap {
    var events: [TempoEvent]  // Tempo changes at specific times
}

struct TempoEvent {
    var time: TimeInterval
    var bpm: Double
}

struct TimeSignatureMap {
    var events: [TimeSignatureEvent]
}

struct TimeSignatureEvent {
    var time: TimeInterval
    var numerator: Int       // 3, 4, 6, etc.
    var denominator: Int     // 4, 8, 16, etc.
}
```

### 1.4 Instrument and Tuning Information

```swift
struct InstrumentPreset {
    var name: String
    var category: InstrumentCategory  // Guitar, piano, drums, etc.
    var midiProgram: UInt8?           // GM program 0-127
    var tuning: Tuning?               // For fretted instruments
    var range: NoteRange?             // Min/max playable notes
}

struct Tuning {
    var name: String                  // "Standard", "Drop D", etc.
    var strings: [Int]                // MIDI pitch of each string (high to low)
    var capo: Int                     // Capo position (0 = none)

    static let guitarStandard = Tuning(name: "Guitar Standard", strings: [64, 59, 55, 50, 45, 40], capo: 0)
    static let bassStandard = Tuning(name: "Bass Standard", strings: [43, 38, 33, 28], capo: 0)
    static let dropD = Tuning(name: "Drop D", strings: [64, 59, 55, 50, 45, 38], capo: 0)
    static let openD = Tuning(name: "Open D", strings: [62, 57, 50, 45, 38, 38], capo: 0)
    static let ukulele = Tuning(name: "Ukulele", strings: [67, 60, 52, 43], capo: 0)
}
```

---

## 2. View Abstraction Layer

### 2.1 NotationView Protocol

All notation views must conform to this protocol:

```swift
protocol NotationView: View {
    associatedtype Renderer: NotationRenderer

    /// View type identifier
    static var viewType: NotationViewType { get }

    /// Human-readable name
    static var displayName: String { get }

    /// Icon for UI
    static var icon: String { get }

    /// Renderer for drawing notation
    var renderer: Renderer { get }

    /// Current viewport (visible time range and pitch/position range)
    var viewport: Viewport { get set }

    /// Selected notes in this view
    var selectedNotes: Set<UUID> { get set }

    /// Current zoom level
    var zoomLevel: Double { get set }

    /// Convert universal note to view-specific representation
    func convertFromUniversal(_ note: UniversalNote) -> Renderer.NoteType

    /// Convert view-specific representation to universal note
    func convertToUniversal(_ note: Renderer.NoteType) -> UniversalNote

    /// Handle note addition/edit from this view
    func handleNoteEdit(_ edit: NoteEdit) -> UniversalNote

    /// Render the view
    func render() -> some View
}
```

### 2.2 NotationRenderer Protocol

```swift
protocol NotationRenderer {
    associatedtype NoteType

    /// Draw a single note
    func drawNote(_ note: NoteType, in context: GraphicsContext, viewport: Viewport)

    /// Draw background grid/lines
    func drawGrid(in context: GraphicsContext, viewport: Viewport)

    /// Draw selection indicator
    func drawSelection(_ notes: Set<NoteType>, in context: GraphicsContext, viewport: Viewport)

    /// Convert screen coordinates to note position
    func screenToNotePosition(_ point: CGPoint, viewport: Viewport) -> NotePosition?

    /// Convert note position to screen coordinates
    func notePositionToScreen(_ position: NotePosition, viewport: Viewport) -> CGPoint
}
```

### 2.3 Viewport System

```swift
struct Viewport {
    var timeRange: ClosedRange<TimeInterval>  // Visible time range
    var pitchRange: ClosedRange<Int>?         // For pitch-based views (piano roll)
    var stringRange: ClosedRange<Int>?        // For tablature
    var fretRange: ClosedRange<Int>?          // For tablature
    var staffRange: ClosedRange<Int>?         // For sheet music

    var zoomHorizontal: Double
    var zoomVertical: Double

    var scrollOffset: CGPoint
}
```

---

## 3. View Registry System

### 3.1 NotationViewRegistry

```swift
class NotationViewRegistry: ObservableObject {
    @Published var availableViews: [NotationViewType: AnyNotationView] = [:]
    @Published var activeViews: [ActiveNotationView] = []

    /// Register a new notation view type
    func register<V: NotationView>(_ viewType: V.Type) {
        let view = AnyNotationView(viewType)
        availableViews[view.viewType] = view
    }

    /// Create an instance of a view type
    func createView(_ type: NotationViewType, track: Track) -> AnyView {
        guard let viewWrapper = availableViews[type] else {
            fatalError("View type \(type) not registered")
        }
        return viewWrapper.createView(track: track)
    }

    /// Activate a view (show it in UI)
    func activateView(_ type: NotationViewType, track: Track, layoutSlot: LayoutSlot) {
        let view = createView(type, track: track)
        let activeView = ActiveNotationView(
            id: UUID(),
            type: type,
            view: view,
            track: track,
            layoutSlot: layoutSlot
        )
        activeViews.append(activeView)
    }

    /// Deactivate a view
    func deactivateView(_ id: UUID) {
        activeViews.removeAll { $0.id == id }
    }
}

/// Type-erased wrapper for notation views
struct AnyNotationView {
    let viewType: NotationViewType
    let displayName: String
    let icon: String
    let createView: (Track) -> AnyView

    init<V: NotationView>(_ viewType: V.Type) {
        self.viewType = V.viewType
        self.displayName = V.displayName
        self.icon = V.icon
        self.createView = { track in AnyView(V(track: track)) }
    }
}

/// Active view instance in the UI
struct ActiveNotationView {
    let id: UUID
    let type: NotationViewType
    let view: AnyView
    let track: Track
    var layoutSlot: LayoutSlot
}
```

### 3.2 NotationViewType Enum

```swift
enum NotationViewType: String, CaseIterable, Identifiable {
    case pianoRoll = "piano_roll"
    case tablature = "tablature"
    case sheetMusic = "sheet_music"
    case drumGrid = "drum_grid"
    case midiEventList = "midi_event_list"
    case arrangement = "arrangement"
    case stepSequencer = "step_sequencer"
    case waveform = "waveform"
    case spectrogram = "spectrogram"
    case pluginUI = "plugin_ui"

    var id: String { rawValue }
}
```

---

## 4. Layout Engine

### 4.1 LayoutManager

```swift
class LayoutManager: ObservableObject {
    @Published var layoutMode: LayoutMode = .singleView
    @Published var customLayouts: [CustomLayout] = []

    /// Current layout configuration
    func currentLayout(for views: [ActiveNotationView]) -> LayoutConfiguration {
        switch layoutMode {
        case .singleView:
            return singleViewLayout(views)
        case .splitView(let preset):
            return splitViewLayout(views, preset: preset)
        case .tabs:
            return tabLayout(views)
        case .custom:
            return customLayout(views)
        }
    }

    private func singleViewLayout(_ views: [ActiveNotationView]) -> LayoutConfiguration {
        guard let primaryView = views.first else {
            return LayoutConfiguration(slots: [])
        }
        return LayoutConfiguration(slots: [
            LayoutSlot(
                id: primaryView.id,
                frame: CGRect(x: 0, y: 0, width: 1, height: 1),
                zIndex: 0
            )
        ])
    }

    private func splitViewLayout(_ views: [ActiveNotationView], preset: SplitPreset) -> LayoutConfiguration {
        let slots = preset.calculateSlots(count: views.count)
        return LayoutConfiguration(slots: slots)
    }

    private func tabLayout(_ views: [ActiveNotationView]) -> LayoutConfiguration {
        // Show only first view, add tab bar for switching
        guard let primaryView = views.first else {
            return LayoutConfiguration(slots: [])
        }
        return LayoutConfiguration(
            slots: [
                LayoutSlot(
                    id: primaryView.id,
                    frame: CGRect(x: 0, y: 0, width: 1, height: 0.9), // Leave room for tabs
                    zIndex: 0
                )
            ],
            tabBar: TabBarConfiguration(items: views.map { TabItem(view: $0) })
        )
    }

    private func customLayout(_ views: [ActiveNotationView]) -> LayoutConfiguration {
        // Use saved custom layout
        guard let custom = customLayouts.first(where: { $0.name == "Current" }) else {
            return singleViewLayout(views)
        }
        return custom.configuration
    }
}
```

### 4.2 Layout Types

```swift
enum LayoutMode {
    case singleView
    case splitView(SplitPreset)
    case tabs
    case custom

    enum SplitPreset {
        case fiftyFifty              // 50% | 50%
        case sixtyForty              // 60% | 40%
        case seventyThirty           // 70% | 30%
        case threeWayEqual           // 33% | 33% | 33%
        case threeWayPrimary         // 50% | 25% | 25%

        func calculateSlots(count: Int) -> [LayoutSlot] {
            // Calculate frame rectangles based on preset
            switch (self, count) {
            case (.fiftyFifty, 2):
                return [
                    LayoutSlot(id: UUID(), frame: CGRect(x: 0, y: 0, width: 0.5, height: 1), zIndex: 0),
                    LayoutSlot(id: UUID(), frame: CGRect(x: 0.5, y: 0, width: 0.5, height: 1), zIndex: 0)
                ]
            case (.sixtyForty, 2):
                return [
                    LayoutSlot(id: UUID(), frame: CGRect(x: 0, y: 0, width: 0.6, height: 1), zIndex: 0),
                    LayoutSlot(id: UUID(), frame: CGRect(x: 0.6, y: 0, width: 0.4, height: 1), zIndex: 0)
                ]
            // ... more cases
            default:
                return []
            }
        }
    }
}

struct LayoutConfiguration {
    var slots: [LayoutSlot]
    var tabBar: TabBarConfiguration?
}

struct LayoutSlot {
    var id: UUID
    var frame: CGRect  // Normalized (0-1)
    var zIndex: Int
}

struct TabBarConfiguration {
    var items: [TabItem]
    var position: TabPosition = .bottom

    enum TabPosition {
        case top, bottom, left, right
    }
}

struct TabItem {
    var id: UUID
    var title: String
    var icon: String
}

struct CustomLayout {
    var name: String
    var configuration: LayoutConfiguration
}
```

---

## 5. Synchronization System

### 5.1 NotationSyncManager

```swift
class NotationSyncManager: ObservableObject {
    @Published var tracks: [Track]
    private var registry: NotationViewRegistry

    /// User made a change in one view
    func handleEdit(_ edit: NoteEdit, in viewId: UUID, track: Track) {
        // Convert edit to universal note
        let universalNote = applyEdit(edit, to: track)

        // Update track data
        updateTrack(track, with: universalNote)

        // Broadcast to all other views
        broadcastChange(universalNote, to: track, excluding: viewId)
    }

    private func applyEdit(_ edit: NoteEdit, to track: Track) -> UniversalNote {
        switch edit.type {
        case .add:
            return edit.note
        case .modify(let existingNote):
            return mergeEdit(edit, into: existingNote)
        case .delete(let noteToDelete):
            deleteNote(noteToDelete, from: track)
            return noteToDelete
        }
    }

    private func updateTrack(_ track: Track, with note: UniversalNote) {
        if let index = track.notes.firstIndex(where: { $0.id == note.id }) {
            track.notes[index] = note
        } else {
            track.notes.append(note)
        }
    }

    private func broadcastChange(_ note: UniversalNote, to track: Track, excluding excludedViewId: UUID) {
        // Find all active views showing this track
        let viewsToNotify = registry.activeViews.filter { view in
            view.track.id == track.id && view.id != excludedViewId
        }

        // Notify each view
        for view in viewsToNotify {
            NotificationCenter.default.post(
                name: .noteDidChange,
                object: NoteDidChangeNotification(
                    viewId: view.id,
                    note: note,
                    track: track
                )
            )
        }
    }
}

struct NoteEdit {
    var type: EditType
    var note: UniversalNote
    var viewport: Viewport

    enum EditType {
        case add
        case modify(UniversalNote)  // The existing note being modified
        case delete
    }
}

struct NoteDidChangeNotification {
    var viewId: UUID
    var note: UniversalNote
    var track: Track
}

extension Notification.Name {
    static let noteDidChange = Notification.Name("noteDidChange")
}
```

### 5.2 Real-Time Coordination

```swift
/// Combine publisher for note changes
extension NotationSyncManager {
    var noteChanges: AnyPublisher<NoteDidChangeNotification, Never> {
        NotificationCenter.default.publisher(for: .noteDidChange)
            .compactMap { $0.object as? NoteDidChangeNotification }
            .eraseToAnyPublisher()
    }
}

/// View subscribes to changes
struct SomeNotationView: View {
    @StateObject private var syncManager: NotationSyncManager
    let track: Track

    var body: some View {
        // ... view content
        .onReceive(syncManager.noteChanges) { notification in
            if notification.track.id == track.id {
                // Update view to reflect change
                refreshView()
            }
        }
    }

    private func refreshView() {
        // Re-render with updated data
    }
}
```

---

## 6. Performance Optimization

### 6.1 Virtualization

Only render visible portion of notation:

```swift
protocol VirtualizedNotationView {
    /// Visible viewport
    var viewport: Viewport { get }

    /// Total extent of notation
    var totalExtent: NotationExtent { get }

    /// Render only visible items
    func renderVisible() -> some View
}

struct NotationExtent {
    var timeRange: ClosedRange<TimeInterval>
    var pitchRange: ClosedRange<Int>
}
```

### 6.2 Caching

Cache rendered notation for performance:

```swift
class NotationCache {
    private var cache: NSCache<NSString, CachedNotationImage>

    func getCachedRendering(for viewport: Viewport, type: NotationViewType) -> Image? {
        let key = cacheKey(for: viewport, type: type)
        return cache.object(forKey: key as NSString)?.image
    }

    func setCachedRendering(_ image: Image, for viewport: Viewport, type: NotationViewType) {
        let key = cacheKey(for: viewport, type: type)
        let cached = CachedNotationImage(image: image, viewport: viewport, timestamp: Date())
        cache.setObject(cached, forKey: key as NSString)
    }

    private func cacheKey(for viewport: Viewport, type: NotationViewType) -> String {
        "\(type.rawValue)-\(viewport.timeRange.lowerBound)-\(viewport.timeRange.upperBound)"
    }
}

struct CachedNotationImage {
    var image: Image
    var viewport: Viewport
    var timestamp: Date
}
```

### 6.3 Lazy Loading

```swift
struct LazyNotationView: View {
    let track: Track
    let viewport: Viewport

    var body: some View {
        VStack {
            // Load visible range only
            ForEach(visibleNotes, id: \.id) { note in
                NoteRenderer(note: note)
            }
        }
        .onAppear {
            loadVisibleNotes()
        }
    }

    private var visibleNotes: [UniversalNote] {
        track.notes.filter { note in
            viewport.timeRange.contains(note.startTime)
        }
    }

    private func loadVisibleNotes() {
        // Pre-fetch adjacent regions
    }
}
```

---

## 7. iPad Split-View Integration

### 7.1 Multi-View Container

```swift
struct MultiViewNotationContainer: View {
    @StateObject private var layoutMgr = LayoutManager()
    @StateObject private var registry = NotationViewRegistry()
    @State private var selectedTrack: Track

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                // Render each active view in its slot
                ForEach(layoutMgr.currentActiveViews) { activeView in
                    let slot = layoutMgr.slotFor(activeView)

                    activeView.view
                        .frame(width: geometry.size.width * slot.frame.width,
                               height: geometry.size.height * slot.frame.height)
                        .position(x: geometry.size.width * slot.frame.midX,
                                  y: geometry.size.height * slot.frame.midY)
                }
            }
        }
    }
}
```

### 7.2 Resize Handles

```swift
struct SplitViewDivider: View {
    var axis: Axis
    @Binding var offset: CGFloat

    var body: some View {
        Rectangle()
            .fill(Color.separator)
            .frame(width: axis == .horizontal ? nil : 8,
                   height: axis == .vertical ? nil : 8)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation.width
                    }
            )
    }
}
```

---

## 8. Extensibility

### 8.1 Adding a New View Type

```swift
// 1. Conform to protocols
struct MyCustomNotationView: NotationView {
    static var viewType: NotationViewType = .custom("my_custom")
    static var displayName: String = "My Custom View"
    static var icon: String = "star.fill"

    // Implement required protocol methods
    // ...
}

// 2. Register it
registry.register(MyCustomNotationView.self)

// 3. Use it
registry.activateView(.custom("my_custom"), track: track, layoutSlot: slot)
```

### 8.2 Plugin Architecture

```swift
protocol NotationViewPlugin {
    var viewType: NotationViewType { get }
    var displayName: String { get }
    var icon: String { get }

    func createView(track: Track) -> AnyView
    func validateTrack(_ track: Track) -> Bool  // Can this view show this track?
}

class PluginManager {
    private var plugins: [NotationViewPlugin] = []

    func loadPlugin(_ plugin: NotationViewPlugin) {
        plugins.append(plugin)
    }

    func availableViews(for track: Track) -> [NotationViewPlugin] {
        plugins.filter { $0.validateTrack(track) }
    }
}
```

---

## 9. Migration Path

### Phase 1: Core Architecture (Current)
- [x] Universal note data model
- [x] NotationView protocol
- [x] View registry system
- [ ] Basic layout manager

### Phase 2: Piano Roll Expansion (Immediate)
- [ ] 88-key range (C0-B7)
- [ ] iPad-responsive layout
- [ ] Optimized touch targets

### Phase 3: Tablature View (Weeks 1-2)
- [ ] Adjustable strings/tuning
- [ ] Note entry/editing
- [ ] Technique notation

### Phase 4: Sheet Music (Weeks 3-6)
- [ ] Rendering engine selection
- [ ] Basic staff rendering
- [ ] Note/rest rendering
- [ ] Time/key signatures

### Phase 5: Split-View (Weeks 7-8)
- [ ] Multi-view container
- [ ] Resize handles
- [ ] Layout presets

---

## 10. Testing Strategy

### Unit Tests
- Note conversions between views
- Sync manager change propagation
- Layout calculations

### Integration Tests
- Multi-view synchronization
- Performance with large note counts
- Memory management

### UI Tests
- Note editing in different views
- Layout switching
- Resize handle dragging

---

## 11. Documentation

### For Developers
- How to add a new notation view
- View plugin API
- Sync system architecture

### For Users
- Available notation views
- How to use split-screen
- Keyboard shortcuts

---

## 12. Success Metrics

- **Performance**: 60fps rendering with 1000+ notes
- **Latency**: <16ms from edit to sync across views
- **Memory**: <200MB with 3 active views
- **User Satisfaction**: 4.5+ stars for notation editing

---

## Conclusion

This architecture provides a solid foundation for White Room's unified notation system. It's designed to be extensible, performant, and user-friendly, enabling musicians to work in the notation views that suit their workflow while maintaining perfect synchronization across all views.
