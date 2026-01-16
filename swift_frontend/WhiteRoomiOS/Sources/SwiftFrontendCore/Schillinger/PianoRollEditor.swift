import SwiftUI

/// A piano roll editor for the Schillinger timeline UI
///
/// PianoRollEditor provides a visual piano roll interface for editing
/// note events on a timeline, with proper support for both white and black keys.
/// Adapts layout for iPhone with compact keyboard and touch-optimized controls.
public struct PianoRollEditor: View {

    // MARK: - State

    @State private var selectedPitch: Int = 60 // Middle C
    @State private var notes: [NoteEvent] = []
    @State private var zoomLevel: Double = 1.0

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    /// Whether the current layout is compact (iPhone portrait)
    private var isCompactWidth: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Constants

    private let keyWidth: CGFloat = 40
    private let keyWidthCompact: CGFloat = 32
    private let keyHeight: CGFloat = 20
    private let keyHeightCompact: CGFloat = 24
    private let octaveCount = 5
    private let octaveCountCompact = 3 // Show fewer octaves on iPhone

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Piano roll header
            headerView

            // Split view: keyboard + timeline
            HStack(spacing: 0) {
                // Piano keyboard (left side)
                keyboardView
                    .frame(width: isCompactWidth ? keyWidthCompact : keyWidth)

                // Timeline grid (right side)
                timelineView
            }
        }
        .background(Color(NSColor.textBackgroundColor))
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack {
            Text("Piano Roll")
                .font(isCompactWidth ? .subheadline : .headline)
                .foregroundColor(.primary)

            Spacer()

            // Zoom controls - larger touch targets on iPhone
            HStack(spacing: isCompactWidth ? 12 : 8) {
                Button(action: { zoomOut() }) {
                    Image(systemName: "minus.magnifyingglass")
                        .font(isCompactWidth ? .body : .body)
                        .foregroundColor(.primary)
                        .frame(width: isCompactWidth ? 44 : 32, height: isCompactWidth ? 44 : 32)
                }
                .buttonStyle(PlainButtonStyle())

                Text("\(Int(zoomLevel * 100))%")
                    .font(isCompactWidth ? .caption : .caption)
                    .foregroundColor(.secondary)
                    .frame(width: isCompactWidth ? 40 : 50)

                Button(action: { zoomIn() }) {
                    Image(systemName: "plus.magnifyingglass")
                        .font(isCompactWidth ? .body : .body)
                        .foregroundColor(.primary)
                        .frame(width: isCompactWidth ? 44 : 32, height: isCompactWidth ? 44 : 32)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(isCompactWidth ? 10 : 12)
        .background(Color.secondary.opacity(0.1))
    }

    // MARK: - Keyboard View

    private var keyboardView: some View {
        ScrollView([.vertical]) {
            VStack(spacing: 0) {
                ForEach(0..<((isCompactWidth ? octaveCountCompact : octaveCount) * 12), id: \.self) { midiPitch in
                    keyRow(pitch: midiPitch, isBlackKey: isBlackKey(pitch: midiPitch))
                }
            }
        }
    }

    /// Creates a single piano key row
    ///
    /// - Parameters:
    ///   - pitch: The MIDI pitch value for this key
    ///   - isBlackKey: Whether this is a black key
    /// - Returns: A view representing the piano key
    private func keyRow(pitch: Int, isBlackKey: Bool) -> some View {
        let currentKeyWidth = isCompactWidth ? keyWidthCompact : keyWidth
        let currentKeyHeight = isCompactWidth ? keyHeightCompact : keyHeight

        return HStack(spacing: 0) {
            Text(pitchName(for: pitch))
                .font(isCompactWidth ? .caption2 : .caption)
                .foregroundColor(isBlackKey ? .white : .primary)
                .frame(width: currentKeyWidth - 8, height: currentKeyHeight)
                .background(isBlackKey ? Color.black : Color.white)
                .border(Color.gray.opacity(0.3), width: 0.5)
                .contentShape(Rectangle())
                .onTapGesture {
                    selectedPitch = pitch
                }
        }
    }

    // MARK: - Timeline View

    private var timelineView: some View {
        GeometryReader { geometry in
            ScrollView([.horizontal, .vertical]) {
                Canvas { context, size in
                    // Draw grid lines
                    drawGrid(in: context, size: size)

                    // Draw notes
                    drawNotes(in: context)
                }
                .frame(
                    width: geometry.size.width * zoomLevel,
                    height: CGFloat((isCompactWidth ? octaveCountCompact : octaveCount) * 12) * (isCompactWidth ? keyHeightCompact : keyHeight)
                )
                .background(Color(NSColor.controlBackgroundColor))
            }
        }
    }

    // MARK: - Canvas Drawing

    /// Draws the timeline grid
    private func drawGrid(in context: GraphicsContext, size: CGSize) {
        let currentKeyHeight = isCompactWidth ? keyHeightCompact : keyHeight
        let currentOctaveCount = isCompactWidth ? octaveCountCompact : octaveCount

        // Horizontal lines (pitch rows)
        for pitch in 0..<(currentOctaveCount * 12) {
            let y = CGFloat(pitch) * currentKeyHeight
            let startPoint = CGPoint(x: 0, y: y)
            let endPoint = CGPoint(x: size.width, y: y)

            context.stroke(
                Path { path in
                    path.move(to: startPoint)
                    path.addLine(to: endPoint)
                },
                with: .color(.gray.opacity(0.3)),
                lineWidth: 0.5
            )
        }

        // Vertical lines (time divisions)
        let beatsPerBar = 4
        let pixelsPerBeat = 100.0 * zoomLevel
        let totalBeats = Int(size.width / pixelsPerBeat)

        for beat in 0...totalBeats {
            let x = CGFloat(beat) * pixelsPerBeat
            let startPoint = CGPoint(x: x, y: 0)
            let endPoint = CGPoint(x: x, y: size.height)

            let isBarLine = beat % beatsPerBar == 0
            let lineWidth: CGFloat = isBarLine ? 1.5 : 0.5
            let opacity = isBarLine ? 0.6 : 0.2

            context.stroke(
                Path { path in
                    path.move(to: startPoint)
                    path.addLine(to: endPoint)
                },
                with: .color(.gray.opacity(opacity)),
                lineWidth: lineWidth
            )
        }
    }

    /// Draws note events on the timeline
    private func drawNotes(in context: GraphicsContext) {
        let currentKeyHeight = isCompactWidth ? keyHeightCompact : keyHeight
        let pixelsPerBeat = 100.0 * zoomLevel

        for note in notes {
            let x = CGFloat(note.startBeat) * pixelsPerBeat
            let y = CGFloat(note.pitch) * currentKeyHeight
            let width = CGFloat(note.duration) * pixelsPerBeat
            let height = currentKeyHeight

            let rect = CGRect(x: x, y: y, width: width, height: height)

            // Note background
            context.fill(
                Path { path in
                    path.addRect(rect)
                },
                with: .color(note.color)
            )

            // Note border
            context.stroke(
                Path { path in
                    path.addRect(rect)
                },
                with: .color(.primary),
                lineWidth: 1.0
            )
        }
    }

    // MARK: - Helper Methods

    /// Determines if a MIDI pitch is a black key
    private func isBlackKey(pitch: Int) -> Bool {
        let noteInOctave = pitch % 12
        return [1, 3, 6, 8, 10].contains(noteInOctave)
    }

    /// Gets the note name for a MIDI pitch
    private func pitchName(for pitch: Int) -> String {
        let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        let octave = pitch / 12 - 1
        let noteName = noteNames[pitch % 12]
        return "\(noteName)\(octave)"
    }

    private func zoomIn() {
        zoomLevel = min(zoomLevel * 1.2, 5.0)
    }

    private func zoomOut() {
        zoomLevel = max(zoomLevel / 1.2, 0.2)
    }

    // MARK: - Initialization

    public init() {}
}

// MARK: - Note Event Model

// DUPLICATE: struct NoteEvent: Identifiable {
// DUPLICATE:     let id = UUID()
// DUPLICATE:     let pitch: Int
// DUPLICATE:     let startBeat: Double
// DUPLICATE:     let duration: Double
// DUPLICATE:     let color: Color
// DUPLICATE: 
// DUPLICATE:     init(pitch: Int, startBeat: Double, duration: Double, color: Color = .blue) {
// DUPLICATE:         self.pitch = pitch
// DUPLICATE:         self.startBeat = startBeat
// DUPLICATE:         self.duration = duration
// DUPLICATE:         self.color = color
// DUPLICATE:     }
// DUPLICATE: }

// MARK: - Preview

#if DEBUG
struct PianoRollEditor_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPhone SE (compact)
            PianoRollEditor()
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")

            // iPhone 14 Pro (compact)
            PianoRollEditor()
                .previewDevice("iPhone 14 Pro")
                .previewDisplayName("iPhone 14 Pro")

            // iPhone 14 Pro Max landscape (regular)
            PianoRollEditor()
                .previewDevice("iPhone 14 Pro Max")
                .previewInterfaceOrientation(.landscapeLeft)
                .previewDisplayName("iPhone 14 Pro Max - Landscape")

            // iPad Pro (regular)
            PianoRollEditor()
                .previewDevice("iPad Pro (12.9-inch) (6th generation)")
                .previewDisplayName("iPad Pro")

            // Dark mode on iPhone
            PianoRollEditor()
                .previewDevice("iPhone 14 Pro")
                .preferredColorScheme(.dark)
                .previewDisplayName("iPhone 14 Pro - Dark")
        }
    }
}
#endif
