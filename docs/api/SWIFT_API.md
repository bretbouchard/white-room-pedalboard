# White Room Swift API

**Swift API reference for White Room frontend development.**

---

## Table of Contents

1. [UI Components](#ui-components)
2. [Models](#models)
3. [Managers](#managers)
4. [Extensions](#extensions)

---

## UI Components

### TimelineView

**`TimelineView`**

Main timeline editor view.

```swift
struct TimelineView: View {
    @StateObject var viewModel: TimelineViewModel
    @State private var zoom: Double = 1.0

    var body: some View {
        VStack {
            TimelineRuler()
            TimelineTracks(tracks: viewModel.tracks)
            TimelineRegions(regions: viewModel.regions)
        }
        .zoom(zoom)
        .onKeyPress { keyPress in
            handleKeyPress(keyPress)
        }
    }

    private func handleKeyPress(_ press: KeyPress) -> KeyPress.Result {
        switch press.key {
        case .space: viewModel.togglePlay(); return .handled
        case .delete: viewModel.deleteSelected(); return .handled
        default: return .ignored
        }
    }
}
```

**Properties**:
- `tracks: [Track]` - Array of tracks to display
- `regions: [Region]` - Array of regions to display
- `playheadPosition: Double` - Current playhead position in ticks
- `zoom: Double` - Current zoom level

**Methods**:
- `selectRegion(_ region: Region)` - Select a region
- `deleteSelected()` - Delete selected regions
- `splitSelected(at position: Double)` - Split selected regions

### PianoRollView

**`PianoRollView`**

Piano roll editor for MIDI regions.

```swift
struct PianoRollView: View {
    @StateObject var viewModel: PianoRollViewModel
    @State private var selectedTool: Tool = .pointer

    var body: some View {
        VStack {
            PianoKeyboard()
            PianoGrid(notes: viewModel.notes)
        }
        .tool(selectedTool)
    }

    enum Tool {
        case pointer, pencil, eraser, scissors
    }
}
```

**Properties**:
- `notes: [Note]` - Array of notes to display
- `keyRange: ClosedRange<Int>` - Pitch range (C2-C8)
- `selectedNotes: Set<Note>` - Currently selected notes

**Methods**:
- `addNote(at position: Point, pitch: Int, duration: Double)`
- `moveNote(_ note: Note, to position: Point)`
- `resizeNote(_ note: Note, duration: Double)`
- `deleteNotes(_ notes: Set<Note>)`

### MixerView

**`MixerView`**

Mixing console with channel strips.

```swift
struct MixerView: View {
    @StateObject var viewModel: MixerViewModel

    var body: some View {
        HStack {
            ForEach(viewModel.tracks) { track in
                ChannelStrip(track: track)
            }
        }
    }
}

struct ChannelStrip: View {
    @ObservedObject var track: Track

    var body: some View {
        VStack {
            Text(track.name)
            MuteSoloButtons(track: track)
            VolumeFader(volume: $track.volume)
            PanKnob(pan: $track.pan)
        }
    }
}
```

**Properties**:
- `tracks: [Track]` - Array of tracks with channel strips
- `masterVolume: Double` - Master output volume
- `masterPan: Double` - Master stereo pan

**Methods**:
- `setVolume(_ volume: Double, for track: Track)`
- `setPan(_ pan: Double, for track: Track)`
- `setMute(_ muted: Bool, for track: Track)`
- `setSolo(_ soloed: Bool, for track: Track)`

---

## Models

### Project

**`Project`**

Top-level project model.

```swift
@Model
final class Project {
    var name: String
    var tempo: Double
    var timeSignature: TimeSignature
    var keySignature: KeySignature
    var tracks: [Track]
    var metadata: ProjectMetadata

    init(name: String, tempo: Double = 120.0) {
        self.name = name
        self.tempo = tempo
        self.timeSignature = TimeSignature(numerator: 4, denominator: 4)
        self.keySignature = KeySignature(key: .C, scale: .major)
        self.tracks = []
        self.metadata = ProjectMetadata()
    }
}

struct TimeSignature {
    var numerator: Int
    var denominator: Int
}

struct KeySignature {
    var key: Note
    var scale: Scale
}

enum Note: Int, CaseIterable {
    case C, CSharp, D, DSharp, E, F, FSharp, G, GSharp, A, ASharp, B
}

enum Scale {
    case major, minor, harmonicMinor, melodicMinor
}
```

### Track

**`Track`**

Track model (software instrument, audio, MIDI, bus).

```swift
@Model
final class Track {
    var id: UUID
    var name: String
    var type: TrackType
    var volume: Double
    var pan: Double
    var muted: Bool
    var soloed: Bool
    var regions: [Region]
    var inserts: [Effect]
    var sends: [Send]

    init(name: String, type: TrackType) {
        self.id = UUID()
        self.name = name
        self.type = type
        self.volume = 1.0
        self.pan = 0.0
        self.muted = false
        self.soloed = false
        self.regions = []
        self.inserts = []
        self.sends = []
    }
}

enum TrackType {
    case softwareInstrument
    case audio
    case midi
    case bus
    case master
}
```

### Region

**`Region`**

Region model (MIDI or audio clip).

```swift
@Model
final class Region {
    var id: UUID
    var start: Double      // Start position in ticks
    var duration: Double   // Duration in ticks
    var content: RegionContent
    var muted: Bool

    init(start: Double, duration: Double, content: RegionContent) {
        self.id = UUID()
        self.start = start
        self.duration = duration
        self.content = content
        self.muted = false
    }
}

enum RegionContent {
    case midi(MIDIContent)
    case audio(AudioContent)
}

struct MIDIContent {
    var notes: [Note]
    var tempo: Double
    var timeSignature: TimeSignature
}

struct AudioContent {
    var url: URL
    var sampleRate: Int
    var channels: Int
    var duration: Double
}
```

### Note

**`Note`**

MIDI note model.

```swift
@Model
final class Note {
    var pitch: Int       // MIDI note number (0-127)
    var velocity: Int    // Velocity (0-127)
    var start: Double    // Start position in ticks
    var duration: Double // Duration in ticks

    init(pitch: Int, velocity: Int, start: Double, duration: Double) {
        self.pitch = pitch
        self.velocity = velocity
        self.start = start
        self.duration = duration
    }
}
```

---

## Managers

### AudioManager

**`AudioManager`**

Manages audio engine and FFI bridge.

```swift
@Observable
final class AudioManager {
    private let engine: JUCEEngine
    var isPlaying: Bool = false
    var playheadPosition: Double = 0.0

    init() {
        self.engine = JUCEEngine()
        setupAudioSession()
    }

    private func setupAudioSession() {
        // Configure audio session
        // Request microphone permission (if needed)
        // Set audio session category
    }

    func play() {
        engine.play()
        isPlaying = true
    }

    func pause() {
        engine.pause()
        isPlaying = false
    }

    func stop() {
        engine.stop()
        isPlaying = false
        playheadPosition = 0.0
    }

    func setPlayheadPosition(_ position: Double) {
        engine.setPlayheadPosition(position)
        playheadPosition = position
    }
}
```

### ProjectManager

**`ProjectManager`**

Manages project state and persistence.

```swift
@Observable
final class ProjectManager {
    var currentProject: Project?
    var recentProjects: [URL] = []

    func createProject(name: String) -> Project {
        let project = Project(name: name)
        currentProject = project
        return project
    }

    func openProject(url: URL) throws -> Project {
        let data = try Data(contentsOf: url)
        let project = try JSONDecoder().decode(Project.self, from: data)
        currentProject = project
        addToRecentProjects(url)
        return project
    }

    func saveProject(_ project: Project, to url: URL) throws {
        let data = try JSONEncoder().encode(project)
        try data.write(to: url)
        addToRecentProjects(url)
    }

    private func addToRecentProjects(_ url: URL) {
        recentProjects.removeAll { $0 == url }
        recentProjects.insert(url, at: 0)
        recentProjects = Array(recentProjects.prefix(10))
    }
}
```

### MIDIManager

**`MIDIManager`**

Manages MIDI input/output.

```swift
@Observable
final class MIDIManager {
    private var midiClient: MIDIClientRef = 0
    var availableDevices: [MIDIDevice] = []
    var connectedInputs: [MIDIInput] = []

    init() {
        setupMIDI()
    }

    private func setupMIDI() {
        MIDIClientCreate("White Room" as CFString, nil, nil, &midiClient)
        refreshDevices()
    }

    func refreshDevices() {
        // Scan for MIDI devices
        // Update availableDevices array
    }

    func connect(_ input: MIDIInput) {
        input.onMessage = { [weak self] message in
            self?.handleMIDIMessage(message)
        }
        connectedInputs.append(input)
    }

    private func handleMIDIMessage(_ message: MIDIMessage) {
        // Route to appropriate track
        // Trigger note on/off
        // Update UI if needed
    }
}
```

---

## Extensions

### Color Extensions

**`Color+WhiteRoom`**

Custom colors for White Room UI.

```swift
extension Color {
    static let whiteRoomBackground = Color(red: 0.11, green: 0.11, blue: 0.12)
    static let whiteRoomForeground = Color(red: 0.97, green: 0.97, blue: 0.97)
    static let whiteRoomAccent = Color(red: 0.0, green: 0.48, blue: 1.0)
    static let whiteRoomSecondary = Color(red: 0.55, green: 0.55, blue: 0.57)
    static let whiteRoomSuccess = Color(red: 0.2, green: 0.8, blue: 0.4)
    static let whiteRoomWarning = Color(red: 1.0, green: 0.6, blue: 0.0)
    static let whiteRoomError = Color(red: 1.0, green: 0.2, blue: 0.2)
}
```

### View Extensions

**`View+WhiteRoom`**

Custom view modifiers.

```swift
extension View {
    func zoom(_ level: Double) -> some View {
        self.scaleEffect(level)
    }

    func tool(_ tool: PianoRollView.Tool) -> some View {
        self.environment(\.currentTool, tool)
    }

    func inspector(isPresented: Binding<Bool>) -> some View {
        self.sheet(isPresented: isPresented) {
            InspectorView()
        }
    }
}
```

### String Extensions

**`String+WhiteRoom`**

Utility functions for strings.

```swift
extension String {
    var isNumeric: Bool {
        return Double(self) != nil
    }

    func truncated(to length: Int) -> String {
        if self.count <= length { return self }
        return String(self.prefix(length)) + "..."
    }

    func camelCaseToWords() -> String {
        return unicodeScalars.dropFirst().reduce(String(prefix(1))) {
            CharacterSet.uppercaseLetters.contains($1)
                ? $0 + " " + String($1)
                : $0 + String($1)
        }
    }
}
```

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Previous**: [SDK API](SDK_API.md)
**Next**: [C++ API](CPP_API.md)

---

*For Swift implementation details, see `/swift_frontend/`*
