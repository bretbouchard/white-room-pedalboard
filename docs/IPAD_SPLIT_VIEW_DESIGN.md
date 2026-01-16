# iPad Split-View System Design - White Room DAW

## Executive Summary

This document describes the iPad split-view system that allows users to view and edit music notation in multiple views simultaneously. The system supports flexible layouts including 50/50 splits, 60/40, three-way views, and custom user-defined ratios.

---

## 1. Architecture Overview

### 1.1 Design Goals

- **Flexible Layouts:** Support 2-way and 3-way splits
- **User Customization:** Drag to resize, preset layouts
- **Performance:** 60fps rendering with multiple views
- **Intuitive:** Familiar iPad split-screen behavior
- **Extensible:** Easy to add new view types

### 1.2 System Components

```
MultiViewContainer
├── LayoutManager (coordinates view placement)
├── ViewRegistry (manages available notation views)
├── SplitViewDivider (resize handles)
└── ActiveNotationViews (current view instances)
```

---

## 2. SwiftUI Implementation

### 2.1 Multi-View Container

```swift
import SwiftUI

/// Main container for split-view notation editing
struct MultiViewNotationContainer: View {
    @StateObject private var layoutMgr = LayoutManager()
    @StateObject private var registry = NotationViewRegistry()
    @State private var activeViews: [ActiveNotationView] = []
    @State private var selectedTrack: Track

    @State private var showViewPicker: Bool = false
    @State private var showLayoutPicker: Bool = false

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                // Background
                Color(UIColor.systemBackground)

                // Render each active view in its slot
                ForEach(activeViews) { activeView in
                    if let slot = layoutMgr.slotFor(activeView) {
                        viewFor(activeView, in: slot, geometry: geometry)
                    }
                }

                // Render dividers between views
                ForEach(layoutMgr.dividers, id: \.id) { divider in
                    dividerView(for: divider, in: geometry)
                }

                // Toolbar overlay
                VStack {
                    toolbarView
                    Spacer()
                }
            }
        }
        .sheet(isPresented: $showViewPicker) {
            ViewPickerSheet(
                availableViews: registry.availableViews,
                selectedTrack: selectedTrack,
                onAdd: { viewType in
                    addView(viewType)
                }
            )
        }
        .actionSheet(isPresented: $showLayoutPicker) {
            layoutActionSheet
        }
        .onAppear {
            loadDefaultLayout()
        }
    }

    // MARK: - View Rendering

    private func viewFor(
        _ activeView: ActiveNotationView,
        in slot: LayoutSlot,
        geometry: GeometryProxy
    ) -> some View {
        let frame = calculateFrame(for: slot, in: geometry)

        return activeView.view
            .frame(width: frame.width, height: frame.height)
            .position(x: frame.midX, y: frame.midY)
            .clipped()
            .zIndex(slot.zIndex)
    }

    private func calculateFrame(for slot: LayoutSlot, in geometry: GeometryProxy) -> CGRect {
        CGRect(
            x: geometry.size.width * slot.frame.minX,
            y: geometry.size.height * slot.frame.minY,
            width: geometry.size.width * slot.frame.width,
            height: geometry.size.height * slot.frame.height
        )
    }

    // MARK: - Divider Views

    private func dividerView(for divider: DividerInfo, in geometry: GeometryProxy) -> some View {
        let frame = calculateFrame(for: divider.slot, in: geometry)

        return SplitViewDivider(
            axis: divider.axis,
            offset: Binding(
                get: { divider.offset },
                set: { newOffset in handleDividerDrag(divider, to: newOffset) }
            )
        )
        .frame(width: frame.width, height: frame.height)
        .position(x: frame.midX, y: frame.midY)
        .zIndex(1000)  // Always on top
    }

    // MARK: - Toolbar

    private var toolbarView: some View {
        HStack(spacing: 12) {
            // Add view button
            Button(action: { showViewPicker.toggle() }) {
                Image(systemName: "plus.rectangle.on.rectangle")
                    .font(.title2)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }

            // Layout selector
            Button(action: { showLayoutPicker.toggle() }) {
                Image(systemName: "square.split.2x2")
                    .font(.title2)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }

            Spacer()

            // View count indicator
            Text("\(activeViews.count) views")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(UIColor.systemBackground).opacity(0.9))
        .cornerRadius(12)
        .shadow(radius: 4)
        .padding()
    }

    // MARK: - Actions

    private func addView(_ type: NotationViewType) {
        guard activeViews.count < 3 else { return }  // Max 3 views

        let newView = registry.createView(type, track: selectedTrack)
        let activeView = ActiveNotationView(
            id: UUID(),
            type: type,
            view: newView,
            track: selectedTrack,
            layoutSlot: layoutMgr.nextAvailableSlot()
        )

        activeViews.append(activeView)
        layoutMgr.recalculateSlots(for: activeViews)
    }

    private func removeView(_ id: UUID) {
        activeViews.removeAll { $0.id == id }
        layoutMgr.recalculateSlots(for: activeViews)
    }

    private func handleDividerDrag(_ divider: DividerInfo, to newOffset: CGFloat) {
        layoutMgr.updateDivider(divider, offset: newOffset)
        layoutMgr.recalculateSlots(for: activeViews)
    }

    private func loadDefaultLayout() {
        // Load saved layout or use default
        if let savedLayout = UserDefaults.standard.savedLayout {
            activeViews = savedLayout.views
            layoutMgr.configuration = savedLayout.configuration
        } else {
            // Default: Piano roll + Tablature
            addView(.pianoRoll)
            addView(.tablature)
        }
    }

    // MARK: - Layout Action Sheet

    private var layoutActionSheet: ActionSheet {
        ActionSheet(
            title: Text("Select Layout"),
            buttons: [
                .default(Text("Single View")) {
                    applyLayout(.singleView)
                },
                .default(Text("50/50 Split")) {
                    applyLayout(.splitView(.fiftyFifty))
                },
                .default(Text("60/40 Split")) {
                    applyLayout(.splitView(.sixtyForty))
                },
                .default(Text("70/30 Split")) {
                    applyLayout(.splitView(.seventyThirty))
                },
                .default(Text("Three-Way (33/33/33)")) {
                    applyLayout(.splitView(.threeWayEqual))
                },
                .default(Text("Three-Way (50/25/25)")) {
                    applyLayout(.splitView(.threeWayPrimary))
                },
                .cancel()
            ]
        )
    }

    private func applyLayout(_ mode: LayoutMode) {
        layoutMgr.layoutMode = mode
        layoutMgr.recalculateSlots(for: activeViews)
    }
}

// MARK: - Active Notation View

struct ActiveNotationView: Identifiable {
    let id: UUID
    let type: NotationViewType
    let view: AnyView
    let track: Track
    var layoutSlot: LayoutSlot
}

// MARK: - Divider Info

struct DividerInfo: Identifiable {
    let id = UUID()
    let axis: Axis
    var offset: CGFloat
    let slot: LayoutSlot
}

enum Axis {
    case horizontal
    case vertical
}
```

### 2.2 Layout Manager

```swift
import SwiftUI

class LayoutManager: ObservableObject {
    @Published var layoutMode: LayoutMode = .splitView(.fiftyFifty)
    @Published var configuration: LayoutConfiguration = .default

    func slotFor(_ activeView: ActiveNotationView) -> LayoutSlot? {
        configuration.slots.first { $0.id == activeView.id }
    }

    var dividers: [DividerInfo] {
        switch layoutMode {
        case .singleView:
            return []
        case .splitView(let preset):
            return createDividers(for: preset)
        case .tabs:
            return []
        case .custom:
            return []
        }
    }

    func recalculateSlots(for views: [ActiveNotationView]) {
        configuration = currentLayout(for: views)
    }

    func nextAvailableSlot() -> LayoutSlot {
        LayoutSlot(
            id: UUID(),
            frame: CGRect(x: 0, y: 0, width: 1, height: 1),
            zIndex: 0
        )
    }

    func updateDivider(_ divider: DividerInfo, offset: CGFloat) {
        // Update slot positions based on divider offset
        // Implementation depends on preset
    }

    private func currentLayout(for views: [ActiveNotationView]) -> LayoutConfiguration {
        switch layoutMode {
        case .singleView:
            return singleViewLayout(views)
        case .splitView(let preset):
            return splitViewLayout(views, preset: preset)
        case .tabs:
            return tabLayout(views)
        case .custom:
            return configuration
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

    private func splitViewLayout(_ views: [ActiveNotationView], preset: LayoutMode.SplitPreset) -> LayoutConfiguration {
        let slots = preset.calculateSlots(for: views)
        return LayoutConfiguration(slots: slots)
    }

    private func tabLayout(_ views: [ActiveNotationView]) -> LayoutConfiguration {
        guard let primaryView = views.first else {
            return LayoutConfiguration(slots: [])
        }

        return LayoutConfiguration(
            slots: [
                LayoutSlot(
                    id: primaryView.id,
                    frame: CGRect(x: 0, y: 0, width: 1, height: 0.9),
                    zIndex: 0
                )
            ],
            tabBar: TabBarConfiguration(
                items: views.map { TabItem(view: $0) },
                position: .bottom
            )
        )
    }

    private func createDividers(for preset: LayoutMode.SplitPreset) -> [DividerInfo] {
        switch preset {
        case .fiftyFifty, .sixtyForty, .seventyThirty:
            return [
                DividerInfo(
                    axis: .vertical,
                    offset: 0.5,
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: 0.5, y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                )
            ]
        case .threeWayEqual, .threeWayPrimary:
            return [
                DividerInfo(
                    axis: .vertical,
                    offset: 0.33,
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: 0.33, y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                ),
                DividerInfo(
                    axis: .vertical,
                    offset: 0.66,
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: 0.66, y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                )
            ]
        }
    }
}

// MARK: - Layout Mode

enum LayoutMode {
    case singleView
    case splitView(SplitPreset)
    case tabs
    case custom

    enum SplitPreset {
        case fiftyFifty
        case sixtyForty
        case seventyThirty
        case threeWayEqual
        case threeWayPrimary

        func calculateSlots(for views: [ActiveNotationView]) -> [LayoutSlot] {
            switch (self, views.count) {
            case (.fiftyFifty, 2):
                return [
                    LayoutSlot(id: views[0].id, frame: CGRect(x: 0, y: 0, width: 0.5, height: 1), zIndex: 0),
                    LayoutSlot(id: views[1].id, frame: CGRect(x: 0.5, y: 0, width: 0.5, height: 1), zIndex: 0)
                ]
            case (.sixtyForty, 2):
                return [
                    LayoutSlot(id: views[0].id, frame: CGRect(x: 0, y: 0, width: 0.6, height: 1), zIndex: 0),
                    LayoutSlot(id: views[1].id, frame: CGRect(x: 0.6, y: 0, width: 0.4, height: 1), zIndex: 0)
                ]
            case (.seventyThirty, 2):
                return [
                    LayoutSlot(id: views[0].id, frame: CGRect(x: 0, y: 0, width: 0.7, height: 1), zIndex: 0),
                    LayoutSlot(id: views[1].id, frame: CGRect(x: 0.7, y: 0, width: 0.3, height: 1), zIndex: 0)
                ]
            case (.threeWayEqual, 3):
                return [
                    LayoutSlot(id: views[0].id, frame: CGRect(x: 0, y: 0, width: 0.333, height: 1), zIndex: 0),
                    LayoutSlot(id: views[1].id, frame: CGRect(x: 0.333, y: 0, width: 0.333, height: 1), zIndex: 0),
                    LayoutSlot(id: views[2].id, frame: CGRect(x: 0.666, y: 0, width: 0.334, height: 1), zIndex: 0)
                ]
            case (.threeWayPrimary, 3):
                return [
                    LayoutSlot(id: views[0].id, frame: CGRect(x: 0, y: 0, width: 0.5, height: 1), zIndex: 0),
                    LayoutSlot(id: views[1].id, frame: CGRect(x: 0.5, y: 0, width: 0.25, height: 1), zIndex: 0),
                    LayoutSlot(id: views[2].id, frame: CGRect(x: 0.75, y: 0, width: 0.25, height: 1), zIndex: 0)
                ]
            default:
                return []
            }
        }
    }
}

// MARK: - Layout Configuration

struct LayoutConfiguration {
    var slots: [LayoutSlot]
    var tabBar: TabBarConfiguration?

    static let `default` = LayoutConfiguration(slots: [
        LayoutSlot(id: UUID(), frame: CGRect(x: 0, y: 0, width: 1, height: 1), zIndex: 0)
    ])
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

struct TabItem: Identifiable {
    var id: UUID
    var title: String
    var icon: String

    init(view: ActiveNotationView) {
        self.id = view.id
        self.title = view.type.displayName
        self.icon = view.type.icon
    }
}
```

### 2.3 Split View Divider

```swift
import SwiftUI

struct SplitViewDivider: View {
    let axis: Axis
    @Binding var offset: CGFloat

    @State private var isDragging: Bool = false
    @State private var dragOffset: CGFloat = 0

    var body: some View {
        Rectangle()
            .fill(Color.separator)
            .opacity(isDragging ? 0.8 : 0.5)
            .frame(width: axis == .horizontal ? nil : 12, height: axis == .vertical ? nil : 12)
            .overlay(
                Rectangle()
                    .fill(Color.accentColor)
                    .frame(width: axis == .horizontal ? nil : 4, height: axis == .vertical ? nil : 4)
                    .opacity(isDragging ? 1 : 0)
            )
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        dragOffset = axis == .horizontal ? value.translation.height : value.translation.width
                        triggerHapticFeedback()
                    }
                    .onEnded { value in
                        isDragging = false
                        let finalOffset = axis == .horizontal ? value.translation.height : value.translation.width
                        offset += finalOffset
                        dragOffset = 0
                        triggerHapticFeedback()
                    }
            )
            .animation(.easeInOut(duration: 0.2), value: isDragging)
    }

    private func triggerHapticFeedback() {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        #endif
    }
}

extension Color {
    static let separator = Color(UIColor.separator)
}
```

---

## 3. Layout Presets

### 3.1 Two-Way Splits

#### 50/50 Split (Equal)
```
+------------------+------------------+
|                  |                  |
|   Piano Roll     |   Tablature      |
|   (50%)          |   (50%)          |
|                  |                  |
+------------------+------------------+
```

#### 60/40 Split (Primary-Secondary)
```
+--------------------+----------------+
|                    |                |
|   Piano Roll       |   Tablature    |
|   (60%)            |   (40%)        |
|                    |                |
+--------------------+----------------+
```

#### 70/30 Split (Focus-Context)
```
+------------------------+------------+
|                        |            |
|   Sheet Music          |   Piano    |
|   (70%)                |   Roll     |
|                        |   (30%)    |
+------------------------+------------+
```

### 3.2 Three-Way Splits

#### Three-Way Equal (33/33/33)
```
+------------+------------+------------+
|            |            |            |
|  Piano     |  Tab       |  Sheet     |
|  Roll      |  (33%)     |  Music     |
|  (33%)     |            |  (33%)     |
|            |            |            |
+------------+------------+------------+
```

#### Three-Way Primary (50/25/25)
```
+--------------+----------+----------+
|              |          |          |
|  Piano       |  Tab     |  Sheet   |
|  Roll        |  (25%)   |  Music   |
|  (50%)       |          |  (25%)   |
|              |          |          |
+--------------+----------+----------+
```

---

## 4. View Picker Sheet

```swift
struct ViewPickerSheet: View {
    let availableViews: [NotationViewType]
    let selectedTrack: Track
    let onAdd: (NotationViewType) -> Void

    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            List {
                ForEach(availableViews, id: \.self) { viewType in
                    Button(action: {
                        onAdd(viewType)
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Image(systemName: viewType.icon)
                                .font(.title2)
                                .foregroundColor(.accentColor)
                                .frame(width: 44)

                            Text(viewType.displayName)
                                .font(.body)

                            Spacer()

                            Text(viewType.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .navigationTitle("Add Notation View")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

extension NotationViewType {
    var displayName: String {
        switch self {
        case .pianoRoll: return "Piano Roll"
        case .tablature: return "Tablature"
        case .sheetMusic: return "Sheet Music"
        case .drumGrid: return "Drum Grid"
        case .midiEventList: return "MIDI Event List"
        case .arrangement: return "Arrangement"
        case .stepSequencer: return "Step Sequencer"
        case .waveform: return "Waveform"
        case .spectrogram: return "Spectrogram"
        case .pluginUI: return "Plugin UI"
        }
    }

    var icon: String {
        switch self {
        case .pianoRoll: return "music.note"
        case .tablature: return "guitars"
        case .sheetMusic: return "doc.text"
        case .drumGrid: return "square.grid.3x3"
        case .midiEventList: return "list.bullet"
        case .arrangement: return "rectangle.stack"
        case .stepSequencer: return "grid"
        case .waveform: return "waveform"
        case .spectrogram: return "waveform.path"
        case .pluginUI: return "rectangle.and.pencil.and.ellipsis"
        }
    }

    var description: String {
        switch self {
        case .pianoRoll: return "Visual note editing"
        case .tablature: return "Fretted instrument notation"
        case .sheetMusic: return "Standard musical notation"
        case .drumGrid: return "Drum pattern editor"
        case .midiEventList: return "Event-level editing"
        case .arrangement: return "Timeline view"
        case .stepSequencer: return "Grid-based sequencing"
        case .waveform: return "Audio waveform display"
        case .spectrogram: return "Frequency analysis"
        case .pluginUI: return "Instrument interface"
        }
    }
}
```

---

## 5. State Management

### 5.1 View State Synchronization

```swift
class NotationViewStateManager: ObservableObject {
    @Published var activeViews: [ActiveNotationView] = []
    @Published var selectedNotes: Set<UUID> = []
    @Published var playbackPosition: TimeInterval = 0

    /// Sync note selection across all views
    func syncSelection(_ newSelection: Set<UUID>, from viewId: UUID) {
        selectedNotes = newSelection

        // Notify all views except the source
        for view in activeViews where view.id != viewId {
            NotificationCenter.default.post(
                name: .selectionDidChange,
                object: SelectionChange(
                    viewId: view.id,
                    selectedNotes: newSelection
                )
            )
        }
    }

    /// Sync playback position across all views
    func syncPlaybackPosition(_ position: TimeInterval) {
        playbackPosition = position

        NotificationCenter.default.post(
            name: .playbackPositionDidChange,
            object: position
        )
    }
}

struct SelectionChange {
    var viewId: UUID
    var selectedNotes: Set<UUID>
}

extension Notification.Name {
    static let selectionDidChange = Notification.Name("selectionDidChange")
    static let playbackPositionDidChange = Notification.Name("playbackPositionDidChange")
}
```

### 5.2 Layout Persistence

```swift
extension UserDefaults {
    private static let layoutKey = "savedLayout"

    var savedLayout: SavedLayout? {
        get {
            guard let data = data(forKey: Self.layoutKey),
                  let layout = try? JSONDecoder().decode(SavedLayout.self, from: data) else {
                return nil
            }
            return layout
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                set(data, forKey: Self.layoutKey)
            }
        }
    }
}

struct SavedLayout: Codable {
    var views: [ActiveNotationView]
    var configuration: LayoutConfiguration
}
```

---

## 6. Performance Optimization

### 6.1 Lazy Loading

```swift
struct LazyNotationView: View {
    let activeView: ActiveNotationView
    let isVisible: Bool

    var body: some View {
        Group {
            if isVisible {
                activeView.view
            } else {
                // Placeholder when not visible
                Rectangle()
                    .fill(Color(UIColor.systemBackground))
            }
        }
    }
}
```

### 6.2 View Recycling

```swift
class ViewRecycler {
    private var recycledViews: [NotationViewType: AnyView] = [:]

    func dequeueView(for type: NotationViewType) -> AnyView? {
        recycledViews.removeValue(forKey: type)
    }

    func enqueueView(_ view: AnyView, for type: NotationViewType) {
        recycledViews[type] = view
    }
}
```

---

## 7. Integration Points

### 7.1 Navigation Integration

```swift
struct NotationEditorView: View {
    @State private var showingSplitView: Bool = false

    var body: some View {
        NavigationView {
            List {
                NavigationLink("Single View", destination: SingleViewEditor())
                NavigationLink("Split View", destination: MultiViewNotationContainer())
            }
            .navigationTitle("Notation Editor")
        }
    }
}
```

### 7.2 Track Context

```swift
struct TrackNotationEditor: View {
    let track: Track

    var body: some View {
        MultiViewNotationContainer(selectedTrack: track)
    }
}
```

---

## 8. Testing Strategy

### Unit Tests
- Layout calculation accuracy
- Divider drag handling
- State synchronization

### UI Tests
- View switching
- Layout preset application
- Divider dragging
- Multi-view editing

### Performance Tests
- Frame rate with 3 views
- Memory usage
- View transition smoothness

---

## 9. Accessibility

### 9.1 VoiceOver Support

```swift
struct AccessibleSplitView: View {
    var body: some View {
        MultiViewNotationContainer()
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Notation editor with \(activeViews.count) views")
            .accessibilityHint("Swipe between views, double tap to edit")
    }
}
```

### 9.2 Keyboard Navigation

```swift
.keyboardShortcut(.defaultAction)
.keyboardShortcut("1", modifiers: [.command])  // Switch to view 1
.keyboardShortcut("2", modifiers: [.command])  // Switch to view 2
.keyboardShortcut("3", modifiers: [.command])  // Switch to view 3
```

---

## 10. Success Metrics

- **Performance:** 60fps with 3 active views
- **Memory:** <250MB with 3 views
- **Latency:** <16ms to propagate edits across views
- **User Satisfaction:** 4.5+ stars for split-view workflow

---

## 11. Future Enhancements

- Floating windows (iPadOS 15+)
- Custom user-defined layouts
- Layout templates
- View minimization
- Drag-and-drop reordering
- External display support
- Keyboard shortcuts

---

## Conclusion

The iPad split-view system provides flexible, performant multi-view notation editing. The SwiftUI implementation delivers native iPad experience with familiar split-screen behavior, while the extensible architecture allows easy addition of new notation view types.
