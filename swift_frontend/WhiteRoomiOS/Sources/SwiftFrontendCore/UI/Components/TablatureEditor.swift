import SwiftUI

/// Adjustable tablature editor for fretted instruments
///
/// Features:
/// - Configurable string count (4-12 strings)
/// - Adjustable tuning per string
/// - Dynamic fret rendering based on zoom
/// - Note entry via tap/drag
/// - Technique notation (hammer-ons, pull-offs, slides, bends)
/// - Multiple instrument presets
/// - iPad-optimized with Apple Pencil support
/// - Split-view compatible
public struct TablatureEditor: View {

    // MARK: - State

    @State private var selectedString: Int = 0
    @State private var selectedFret: Int = 0
    @State private var notes: [TabNote] = []
    @State private var zoomLevel: Double = 1.0
    @State private var selectedNotes: Set<UUID> = []
    @State private var isDrawing: Bool = false
    @State private var currentDragStart: CGPoint = .zero
    @State private var scrollOffset: CGFloat = 0
    @State private var showTechniqueMenu: Bool = false
    @State private var showTuningMenu: Bool = false
    @State private var showInstrumentMenu: Bool = false
    @State private var currentTechnique: NoteTechnique? = nil
    @State private var instrumentPreset: InstrumentPreset = .guitarStandard

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass: UserInterfaceSizeClass?
    @Environment(\.verticalSizeClass) private var verticalSizeClass: UserInterfaceSizeClass?

    // MARK: - Computed Properties

    private var isCompactWidth: Bool {
        horizontalSizeClass == .compact
    }

    private var isCompactHeight: Bool {
        verticalSizeClass == .compact
    }

    private var isPhone: Bool {
        isCompactWidth && isCompactHeight
    }

    private var isIPad: Bool {
        !isPhone
    }

    // MARK: - Constants (iPad-optimized)

    private let stringHeight: CGFloat = 60  // iPad touch target
    private let stringHeightCompact: CGFloat = 44  // iPhone touch target
    private let fretWidth: CGFloat = 50
    private let fretWidthCompact: CGFloat = 40
    private let minFrets: Int = 12
    private let maxFrets: Int = 24
    private let headerHeight: CGFloat = 60
    private let headerHeightCompact: CGFloat = 50

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Header with toolbar
            headerView

            // Main tablature area
            tablatureView
        }
        .background(Color(UIColor.systemBackground))
        .actionSheet(isPresented: $showTechniqueMenu) {
            techniqueActionSheet
        }
        .actionSheet(isPresented: $showTuningMenu) {
            tuningActionSheet
        }
        .actionSheet(isPresented: $showInstrumentMenu) {
            instrumentActionSheet
        }
        .onAppear {
            loadSampleNotes()
        }
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack {
            Text("Tablature")
                .font(isPhone ? .subheadline : .headline)
                .fontWeight(.semibold)

            Spacer()

            // Instrument selector
            Button(action: { showInstrumentMenu.toggle() }) {
                HStack(spacing: 4) {
                    Image(systemName: "guitars")
                    Text(instrumentPreset.name)
                        .font(isPhone ? .caption2 : .caption)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
            }

            // Tuning button
            Button(action: { showTuningMenu.toggle() }) {
                HStack(spacing: 4) {
                    Image(systemName: "tuningfork")
                    Text(formatTuning())
                        .font(isPhone ? .caption2 : .caption)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
            }

            // Technique button
            Button(action: { showTechniqueMenu.toggle() }) {
                Image(systemName: "wand.and.stars")
                    .font(isPhone ? .body : .body)
                    .foregroundColor(.primary)
                    .frame(width: isPhone ? 44 : 60, height: isPhone ? 44 : 60)
            }

            // Zoom controls
            HStack(spacing: 8) {
                Button(action: { zoomOut() }) {
                    Image(systemName: "minus.magnifyingglass")
                        .font(isPhone ? .body : .body)
                        .foregroundColor(.primary)
                        .frame(width: isPhone ? 44 : 60, height: isPhone ? 44 : 60)
                }

                Text("\(Int(zoomLevel * 100))%")
                    .font(isPhone ? .caption : .caption)
                    .foregroundColor(.secondary)
                    .frame(width: 50)

                Button(action: { zoomIn() }) {
                    Image(systemName: "plus.magnifyingglass")
                        .font(isPhone ? .body : .body)
                        .foregroundColor(.primary)
                        .frame(width: isPhone ? 44 : 60, height: isPhone ? 44 : 60)
                }
            }
        }
        .padding(isPhone ? 12 : 16)
        .background(Color(UIColor.secondarySystemBackground))
    }

    // MARK: - Tablature View

    private var tablatureView: some View {
        GeometryReader { geometry in
            ScrollView([.horizontal, .vertical], showsIndicators: false) {
                ZStack {
                    // Tablature canvas
                    Canvas { context, size in
                        drawTablature(in: context, size: size)
                        drawNotes(in: context)
                        drawSelection(in: context)
                    }
                    .frame(
                        width: max(geometry.size.width * zoomLevel, geometry.size.width),
                        height: CGFloat(instrumentPreset.stringCount) * currentStringHeight
                    )
                    .background(Color(UIColor.systemBackground))
                    .gesture(
                        SimultaneousGesture(
                            // Tap to add/select note
                            TapGesture(count: 1)
                                .onEnded { value in
                                    handleTap(at: value)
                                },

                            // Drag to draw notes
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    handleDrawGesture(value)
                                }
                                .onEnded { value in
                                    handleDrawEnd(value)
                                },

                            // Long press for context menu
                            LongPressGesture(minimumDuration: 0.5)
                                .sequenced(before: DragGesture(minimumDistance: 0))
                                .onEnded { value in
                                    handleLongPress(value)
                                }
                        )
                    )
                }
            }
        }
    }

    // MARK: - Canvas Drawing

    private func drawTablature(in context: GraphicsContext, size: CGSize) {
        let currentStringHeight = currentStringHeight
        let currentFretWidth = currentFretWidth

        // Draw strings (horizontal lines)
        for stringIndex in 0..<instrumentPreset.stringCount {
            let y = CGFloat(stringIndex) * currentStringHeight + (currentStringHeight / 2)

            context.stroke(
                Path { path in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                },
                with: .color(stringIndex == 0 ? Color.primary : Color.gray.opacity(0.5)),
                lineWidth: stringIndex == 0 ? 2.0 : 1.5
            )

            // Draw string label (tuning note)
            let tuningNote = instrumentPreset.tuning.strings[stringIndex]
            let noteName = midiToNoteName(tuningNote)
            let stringNum = instrumentPreset.stringCount - stringIndex

            var textPosition = CGPoint(x: 10, y: y)
            context.draw(
                Text("\(stringNum)")
                    .font(.system(size: isPhone ? 10 : 12, weight: .medium))
                    .foregroundColor(.secondary),
                at: textPosition
            )

            textPosition.x += 15
            context.draw(
                Text(noteName)
                    .font(.system(size: isPhone ? 10 : 12, weight: .semibold))
                    .foregroundColor(.primary),
                at: textPosition
            )
        }

        // Draw frets (vertical lines)
        let numFrets = visibleFretCount
        for fret in 0...numFrets {
            let x = CGFloat(fret) * currentFretWidth + 30  // Offset for string labels

            context.stroke(
                Path { path in
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                },
                with: .color(fret == 0 ? Color.primary : Color.gray.opacity(0.3)),
                lineWidth: fret == 0 ? 2.0 : 1.0
            )

            // Draw fret number (except for fret 0, which is open string)
            if fret > 0 {
                let fretTextPosition = CGPoint(
                    x: x - (currentFretWidth / 2),
                    y: CGFloat(instrumentPreset.stringCount) * currentStringHeight - 10
                )

                context.draw(
                    Text("\(fret)")
                        .font(.system(size: isPhone ? 9 : 10, weight: .regular))
                        .foregroundColor(.secondary),
                    at: fretTextPosition
                )
            }
        }
    }

    private func drawNotes(in context: GraphicsContext) {
        let currentStringHeight = currentStringHeight
        let currentFretWidth = currentFretWidth

        for note in notes {
            let y = CGFloat(note.stringIndex) * currentStringHeight + (currentStringHeight / 2)
            let x = CGFloat(note.fret) * currentFretWidth + 30 + (currentFretWidth / 2)

            // Draw fret number
            context.draw(
                Text("\(note.fret)")
                    .font(.system(size: isPhone ? 14 : 18, weight: .bold))
                    .foregroundColor(selectedNotes.contains(note.id) ? .white : .primary),
                at: CGPoint(x: x, y: y)
            )

            // Draw background circle if selected
            if selectedNotes.contains(note.id) {
                context.fill(
                    Path { path in
                        path.addEllipse(in: CGRect(
                            x: x - 15,
                            y: y - 12,
                            width: 30,
                            height: 24
                        ))
                    },
                    with: .color(Color.accentColor)
                )
            }

            // Draw technique indicators
            if let technique = note.technique {
                drawTechnique(technique, at: CGPoint(x: x + 20, y: y), in: context)
            }
        }
    }

    private func drawTechnique(_ technique: NoteTechnique, at position: CGPoint, in context: GraphicsContext) {
        let symbolName: String
        switch technique {
        case .hammerOn:
            symbolName = "arrow.up.circle"
        case .pullOff:
            symbolName = "arrow.down.circle"
        case .slide:
            symbolName = "arrow.right.circle"
        case .bend:
            symbolName = "arrow.up.right.circle"
        case .vibrato:
            symbolName = "waveform.path"
        case .letRing:
            symbolName = "ellipsis"
        }

        context.draw(
            Text(Image(systemName: symbolName))
                .font(.system(size: 12))
                .foregroundColor(.blue),
            at: position
        )
    }

    private func drawSelection(in context: GraphicsContext) {
        // Draw selection rectangle if needed
    }

    // MARK: - Gesture Handlers

    private func handleDrawGesture(_ value: DragGesture.Value) {
        guard !isDrawing else { return }

        let location = value.location
        guard let (string, fret) = stringAndFret(at: location) else { return }

        isDrawing = true
        currentDragStart = location

        // Create new note at this position
        let newNote = TabNote(
            stringIndex: string,
            fret: fret,
            technique: currentTechnique
        )

        if !notes.contains(where: { $0.stringIndex == string && $0.fret == fret }) {
            notes.append(newNote)
            triggerHapticFeedback(.light)
        }
    }

    private func handleDrawEnd(_ value: DragGesture.Value) {
        isDrawing = false
    }

    private func handleTap(at location: CGPoint) {
        guard let (string, fret) = stringAndFret(at: location) else { return }

        // Check if tapping on existing note
        if let existingNoteIndex = notes.firstIndex(where: { $0.stringIndex == string && $0.fret == fret }) {
            let note = notes[existingNoteIndex]
            if selectedNotes.contains(note.id) {
                selectedNotes.remove(note.id)
            } else {
                selectedNotes.insert(note.id)
            }
        } else {
            // Add new note
            let newNote = TabNote(
                stringIndex: string,
                fret: fret,
                technique: currentTechnique
            )
            notes.append(newNote)
            selectedNotes.insert(newNote.id)
            triggerHapticFeedback(.light)
        }
    }

    private func handleLongPress(_ value: SequenceGesture<LongPressGesture, DragGesture>.Value) {
        switch value {
        case .first(true):
            triggerHapticFeedback(.medium)
            showTechniqueMenu = true
        case .second(true, let drag):
            break
        default:
            break
        }
    }

    // MARK: - Helper Methods

    private func stringAndFret(at location: CGPoint) -> (Int, Int)? {
        let currentStringHeight = currentStringHeight
        let currentFretWidth = currentFretWidth

        // Determine which string
        let stringIndex = Int(location.y / currentStringHeight)
        guard stringIndex >= 0 && stringIndex < instrumentPreset.stringCount else { return nil }

        // Determine which fret (account for string label offset)
        let adjustedX = location.x - 30
        guard adjustedX > 0 else { return (stringIndex, 0) }  // Open string
        let fret = Int(adjustedX / currentFretWidth)
        guard fret >= 0 && fret <= visibleFretCount else { return nil }

        return (stringIndex, fret)
    }

    private var currentStringHeight: CGFloat {
        isPhone ? stringHeightCompact : stringHeight
    }

    private var currentFretWidth: CGFloat {
        isPhone ? fretWidthCompact : fretWidth
    }

    private var visibleFretCount: Int {
        let baseFrets = isPhone ? 12 : 15
        return Int(Double(baseFrets) * zoomLevel)
    }

    private func midiToNoteName(_ midi: Int) -> String {
        let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        let noteName = noteNames[midi % 12]
        let octave = midi / 12 - 1
        return "\(noteName)\(octave)"
    }

    private func formatTuning() -> String {
        let noteNames = instrumentPreset.tuning.strings.map { midiToNoteName($0) }
        return noteNames.joined(separator: " - ")
    }

    private func zoomIn() {
        let newZoom = min(zoomLevel * 1.2, 3.0)
        if newZoom != zoomLevel {
            zoomLevel = newZoom
            triggerHapticFeedback(.medium)
        }
    }

    private func zoomOut() {
        let newZoom = max(zoomLevel / 1.2, 0.5)
        if newZoom != zoomLevel {
            zoomLevel = newZoom
            triggerHapticFeedback(.medium)
        }
    }

    private func triggerHapticFeedback(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
        #endif
    }

    private func loadSampleNotes() {
        notes = [
            TabNote(stringIndex: 0, fret: 0, technique: nil),  // Open high E
            TabNote(stringIndex: 1, fret: 2, technique: nil),
            TabNote(stringIndex: 2, fret: 2, technique: nil),
            TabNote(stringIndex: 3, fret: 1, technique: nil),
            TabNote(stringIndex: 4, fret: 0, technique: nil),  // Open A
            TabNote(stringIndex: 5, fret: 0, technique: nil),  // Open low E
        ]
    }

    // MARK: - Action Sheets

    private var techniqueActionSheet: ActionSheet {
        ActionSheet(
            title: Text("Select Technique"),
            buttons: [
                .default(Text("None")) { currentTechnique = nil },
                .default(Text("Hammer-On")) { currentTechnique = .hammerOn },
                .default(Text("Pull-Off")) { currentTechnique = .pullOff },
                .default(Text("Slide")) { currentTechnique = .slide },
                .default(Text("Bend")) { currentTechnique = .bend },
                .default(Text("Vibrato")) { currentTechnique = .vibrato },
                .default(Text("Let Ring")) { currentTechnique = .letRing },
                .cancel()
            ]
        )
    }

    private var tuningActionSheet: ActionSheet {
        ActionSheet(
            title: Text("Select Tuning"),
            buttons: InstrumentPreset.allCases.map { preset in
                .default(Text(preset.name)) {
                    instrumentPreset = preset
                    notes.removeAll()  // Clear notes when changing tuning
                }
            } + [.cancel()]
        )
    }

    private var instrumentActionSheet: ActionSheet {
        ActionSheet(
            title: Text("Select Instrument"),
            buttons: InstrumentPreset.allCases.map { preset in
                .default(Text(preset.name)) {
                    instrumentPreset = preset
                    notes.removeAll()  // Clear notes when changing instrument
                }
            } + [.cancel()]
        )
    }

    // MARK: - Initialization

    public init() {}
}

// MARK: - Previews

#if DEBUG
struct TablatureEditor_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPad Pro 12.9"
            TablatureEditor()
                .previewDevice("iPad Pro (12.9-inch) (6th generation)")
                .previewDisplayName("iPad Pro 12.9\"")

            // iPad Pro 11"
            TablatureEditor()
                .previewDevice("iPad Pro (11-inch) (4th generation)")
                .previewDisplayName("iPad Pro 11\"")

            // iPad mini
            TablatureEditor()
                .previewDevice("iPad mini (6th generation)")
                .previewDisplayName("iPad mini")

            // iPhone 14 Pro
            TablatureEditor()
                .previewDevice("iPhone 14 Pro")
                .previewDisplayName("iPhone 14 Pro")

            // Dark mode
            TablatureEditor()
                .previewDevice("iPad Pro (12.9-inch) (6th generation)")
                .preferredColorScheme(.dark)
                .previewDisplayName("iPad Pro - Dark")
        }
    }
}
#endif
