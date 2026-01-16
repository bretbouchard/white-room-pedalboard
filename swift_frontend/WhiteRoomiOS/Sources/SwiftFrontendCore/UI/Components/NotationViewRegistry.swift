import SwiftUI

/// Registry for all available notation view types
///
/// Handles view creation, state management, and type resolution
/// for the multi-view notation system.
@available(iOS 16.0, *)
public class NotationViewRegistry: ObservableObject {

    // MARK: - Properties

    @Published var availableViews: [NotationViewType] = []

    // MARK: - Initialization

    public init() {
        loadAvailableViews()
    }

    // MARK: - Public Methods

    /// Create a new view instance for the given type
    public func createView(_ type: NotationViewType) -> AnyView {
        switch type {
        case .pianoRoll:
            return AnyView(PianoRollEditor_iOS())

        case .tablature:
            return AnyView(TablatureEditor())

        case .sheetMusic:
            return AnyView(
                Text("Sheet Music")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .drumGrid:
            return AnyView(
                Text("Drum Grid")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .eventList:
            return AnyView(
                Text("MIDI Event List")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .arrangement:
            return AnyView(
                Text("Arrangement")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .stepSequencer:
            return AnyView(
                Text("Step Sequencer")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .waveform:
            return AnyView(
                Text("Waveform")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .spectrogram:
            return AnyView(
                Text("Spectrogram")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )

        case .pluginUI:
            return AnyView(
                Text("Plugin UI")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
            )
        }
    }

    /// Check if a view type is available
    public func isAvailable(_ type: NotationViewType) -> Bool {
        availableViews.contains(type)
    }

    // MARK: - Private Methods

    private func loadAvailableViews() {
        // Start with available views
        availableViews = [
            .pianoRoll,
            .tablature,
            .drumGrid,
            .eventList,
            .arrangement
        ]

        // TODO: Load additional views from plugins
    }
}

// =============================================================================
// MARK: - Notation View Type
// =============================================================================

/// Types of notation views available in the system
public enum NotationViewType: String, CaseIterable, Codable {
    case pianoRoll
    case tablature
    case sheetMusic
    case drumGrid
    case eventList
    case arrangement
    case stepSequencer
    case waveform
    case spectrogram
    case pluginUI

    // MARK: - Public Properties

    /// Display name for this view type
    public var displayName: String {
        switch self {
        case .pianoRoll: return "Piano Roll"
        case .tablature: return "Tablature"
        case .sheetMusic: return "Sheet Music"
        case .drumGrid: return "Drum Grid"
        case .eventList: return "MIDI Event List"
        case .arrangement: return "Arrangement"
        case .stepSequencer: return "Step Sequencer"
        case .waveform: return "Waveform"
        case .spectrogram: return "Spectrogram"
        case .pluginUI: return "Plugin UI"
        }
    }

    /// Icon name (SF Symbol) for this view type
    public var icon: String {
        switch self {
        case .pianoRoll: return "music.note"
        case .tablature: return "guitars"
        case .sheetMusic: return "doc.text"
        case .drumGrid: return "square.grid.3x3"
        case .eventList: return "list.bullet"
        case .arrangement: return "rectangle.stack"
        case .stepSequencer: return "grid"
        case .waveform: return "waveform"
        case .spectrogram: return "waveform.path"
        case .pluginUI: return "rectangle.and.pencil.and.ellipsis"
        }
    }

    /// Short description of this view type
    public var description: String {
        switch self {
        case .pianoRoll: return "Visual note editing"
        case .tablature: return "Fretted instrument notation"
        case .sheetMusic: return "Standard musical notation"
        case .drumGrid: return "Drum pattern editor"
        case .eventList: return "Event-level editing"
        case .arrangement: return "Timeline view"
        case .stepSequencer: return "Grid-based sequencing"
        case .waveform: return "Audio waveform display"
        case .spectrogram: return "Frequency analysis"
        case .pluginUI: return "Instrument interface"
        }
    }

    /// Whether this view type is currently implemented
    public var isImplemented: Bool {
        switch self {
        case .pianoRoll, .tablature:
            return true
        default:
            return false
        }
    }
}

// =============================================================================
// MARK: - View Picker Sheet
// ===============================================================================

/// Sheet for selecting and adding notation views
@available(iOS 16.0, *)
public struct ViewPickerSheet: View {

    // MARK: - Properties

    let availableViews: [NotationViewType]
    let onAdd: (NotationViewType) -> Void

    @Environment(\.presentationMode) var presentationMode

    // MARK: - Body

    public var body: some View {
        NavigationView {
            List {
                ForEach(availableViews.filter { $0.isImplemented }, id: \.self) { viewType in
                    Button(action: {
                        onAdd(viewType)
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack(spacing: 16) {
                            // Icon
                            Image(systemName: viewType.icon)
                                .font(.title2)
                                .foregroundColor(.accentColor)
                                .frame(width: 44)

                            // Title and description
                            VStack(alignment: .leading, spacing: 4) {
                                Text(viewType.displayName)
                                    .font(.body)
                                    .foregroundColor(.primary)

                                Text(viewType.description)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            // Chevron
                            Image(systemName: "chevron.right")
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

    // MARK: - Initialization

    public init(
        availableViews: [NotationViewType],
        onAdd: @escaping (NotationViewType) -> Void
    ) {
        self.availableViews = availableViews
        self.onAdd = onAdd
    }
}

// =============================================================================
// MARK: - Split View Divider
// ===============================================================================

/// Draggable divider between split views
@available(iOS 16.0, *)
public struct SplitViewDivider: View {

    // MARK: - Properties

    let axis: Axis
    @Binding var isDragging: Bool
    @Binding var offset: CGFloat

    @State private var dragOffset: CGFloat = 0

    // MARK: - Body

    public var body: some View {
        Rectangle()
            .fill(Color.separator)
            .opacity(isDragging ? 0.8 : 0.5)
            .frame(
                width: axis == .horizontal ? nil : 12,
                height: axis == .vertical ? nil : 12
            )
            .overlay(
                Rectangle()
                    .fill(Color.accentColor)
                    .frame(
                        width: axis == .horizontal ? nil : 4,
                        height: axis == .vertical ? nil : 4
                    )
                    .opacity(isDragging ? 1 : 0)
            )
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        isDragging = true
                        dragOffset = axis == .horizontal ? value.translation.height : value.translation.width
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

    // MARK: - Helper Methods

    private func triggerHapticFeedback() {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        #endif
    }

    // MARK: - Initialization

    public init(
        axis: Axis,
        isDragging: Binding<Bool>,
        offset: Binding<CGFloat>
    ) {
        self.axis = axis
        self._isDragging = isDragging
        self._offset = offset
    }
}

// =============================================================================
// MARK: - Supporting Types
// ===============================================================================

extension Color {
    static let separator = Color(UIColor.separator)
}

// =============================================================================
// MARK: - Previews
// ===============================================================================

#if DEBUG
@available(iOS 16.0, *)
struct NotationViewRegistry_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ViewPickerSheet(availableViews: NotationViewType.allCases.filter { $0.isImplemented }) { _ in }
                .previewDevice("iPad Pro (12.9-inch)")
                .previewDisplayName("View Picker")

            SplitViewDivider(
                axis: .vertical,
                isDragging: .constant(false),
                offset: .constant(0.5)
            )
            .frame(width: 12, height: 200)
            .previewDisplayName("Vertical Divider")

            SplitViewDivider(
                axis: .horizontal,
                isDragging: .constant(true),
                offset: .constant(0.5)
            )
            .frame(width: 200, height: 12)
            .previewDisplayName("Horizontal Divider - Dragging")
        }
    }
}
#endif
