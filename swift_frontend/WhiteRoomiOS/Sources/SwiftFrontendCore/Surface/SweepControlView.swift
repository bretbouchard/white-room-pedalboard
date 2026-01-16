import SwiftUI

/// A control that allows blending between two performances like parallel universes.
///
/// The SweepControlView displays a slider/knob that controls the blend parameter t (0..1)
/// between two performances (A and B). It shows the selected performance names and provides
/// visual feedback of the current blend position.
/// Adapts layout for iPhone with touch-optimized controls.
public struct SweepControlView: View {

    // MARK: - State

    @Binding private var blendValue: Double
    @Binding private var performanceA: PerformanceInfo
    @Binding private var performanceB: PerformanceInfo
    @State private var isDragging: Bool = false

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private let availablePerformances: [PerformanceInfo]
    private let onBlendChanged: (PerformanceInfo, PerformanceInfo, Double) -> Void

    // MARK: - Computed Properties

    /// Whether the current layout is compact (iPhone portrait)
    private var isCompactWidth: Bool {
        horizontalSizeClass == .compact
    }

    /// Minimum touch target size for iOS (44pt recommended by HIG)
    private var touchTargetSize: CGFloat {
        isCompactWidth ? 44 : 36
    }

    /// Slider height for easier touch interaction
    private var sliderHeight: CGFloat {
        isCompactWidth ? 48 : 40
    }

    /// Thumb size for better touch visibility
    private var thumbSize: CGFloat {
        isCompactWidth ? 28 : 24
    }

    // MARK: - Initialization

    /// Creates a new SweepControlView
    /// - Parameters:
    ///   - blendValue: The current blend value (0.0 = A, 1.0 = B)
    ///   - performanceA: The selected A performance
    ///   - performanceB: The selected B performance
    ///   - availablePerformances: List of all available performances
    ///   - onBlendChanged: Callback when blend value changes
    public init(
        blendValue: Binding<Double>,
        performanceA: Binding<PerformanceInfo>,
        performanceB: Binding<PerformanceInfo>,
        availablePerformances: [PerformanceInfo],
        onBlendChanged: @escaping (PerformanceInfo, PerformanceInfo, Double) -> Void
    ) {
        self._blendValue = blendValue
        self._performanceA = performanceA
        self._performanceB = performanceB
        self.availablePerformances = availablePerformances
        self.onBlendChanged = onBlendChanged
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: isCompactWidth ? 16 : 20) {
            // Header
            HStack {
                Text("Sweep")
                    .font(isCompactWidth ? .subheadline : .headline)
                    .foregroundColor(.primary)
                Spacer()
                Text(String(format: "%.0f%%", blendValue * 100))
                    .font(isCompactWidth ? .caption : .caption)
                    .foregroundColor(.secondary)
                    .monospacedDigit()
            }

            // Performance Labels - Stack vertically on compact width
            if isCompactWidth {
                VStack(spacing: 8) {
                    PerformanceLabel(
                        label: "A",
                        performance: performanceA,
                        isSelected: true,
                        isCompact: true
                    )

                    HStack(spacing: 8) {
                        Text("↔")
                            .font(.title3)
                            .foregroundColor(.secondary)

                        Text(String(format: "%.0f%%", blendValue * 100))
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .monospacedDigit()
                    }

                    PerformanceLabel(
                        label: "B",
                        performance: performanceB,
                        isSelected: true,
                        isCompact: true
                    )
                }
            } else {
                HStack {
                    PerformanceLabel(
                        label: "A",
                        performance: performanceA,
                        isSelected: true,
                        isCompact: false
                    )

                    Spacer()

                    Text("↔")
                        .font(.title2)
                        .foregroundColor(.secondary)

                    Spacer()

                    PerformanceLabel(
                        label: "B",
                        performance: performanceB,
                        isSelected: true,
                        isCompact: false
                    )
                }
            }

            // Blend Slider
            VStack(spacing: isCompactWidth ? 16 : 12) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Track
                        RoundedRectangle(cornerRadius: isCompactWidth ? 6 : 4)
                            .fill(Color.secondary.opacity(0.2))
                            .frame(height: isCompactWidth ? 12 : 8)

                        // Fill (shows blend position)
                        RoundedRectangle(cornerRadius: isCompactWidth ? 6 : 4)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [.blue, .purple]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geometry.size.width * CGFloat(blendValue), height: isCompactWidth ? 12 : 8)

                        // Thumb - larger for touch on iPhone
                        Circle()
                            .fill(Color.white)
                            .shadow(color: .black.opacity(0.3), radius: isDragging ? 4 : 2, x: 0, y: isDragging ? 2 : 1)
                            .frame(width: thumbSize, height: thumbSize)
                            .offset(x: (geometry.size.width - thumbSize) * CGFloat(blendValue))
                            .scaleEffect(isDragging ? 1.1 : 1.0)
                            .animation(.easeInOut(duration: 0.1), value: isDragging)
                            .gesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { value in
                                        isDragging = true
                                        updateBlendValue(from: value.location.x, in: geometry.size.width)
                                    }
                                    .onEnded { _ in
                                        isDragging = false
                                    }
                            )
                    }
                }
                .frame(height: sliderHeight)

                // Quick select buttons - larger touch targets on iPhone
                HStack(spacing: isCompactWidth ? 16 : 12) {
                    Button(action: { snapToA() }) {
                        Text("A")
                            .font(isCompactWidth ? .body : .caption)
                            .fontWeight(.semibold)
                            .foregroundColor(blendValue < 0.1 ? .white : .primary)
                            .frame(width: touchTargetSize, height: touchTargetSize)
                            .background(blendValue < 0.1 ? Color.blue : Color.secondary.opacity(0.2))
                            .cornerRadius(isCompactWidth ? 8 : 6)
                    }
                    .buttonStyle(PlainButtonStyle())

                    Button(action: { snapToMiddle() }) {
                        Text("AB")
                            .font(isCompactWidth ? .body : .caption)
                            .fontWeight(.semibold)
                            .foregroundColor(abs(blendValue - 0.5) < 0.1 ? .white : .primary)
                            .frame(width: touchTargetSize, height: touchTargetSize)
                            .background(abs(blendValue - 0.5) < 0.1 ? Color.blue : Color.secondary.opacity(0.2))
                            .cornerRadius(isCompactWidth ? 8 : 6)
                    }
                    .buttonStyle(PlainButtonStyle())

                    Button(action: { snapToB() }) {
                        Text("B")
                            .font(isCompactWidth ? .body : .caption)
                            .fontWeight(.semibold)
                            .foregroundColor(blendValue > 0.9 ? .white : .primary)
                            .frame(width: touchTargetSize, height: touchTargetSize)
                            .background(blendValue > 0.9 ? Color.blue : Color.secondary.opacity(0.2))
                            .cornerRadius(isCompactWidth ? 8 : 6)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }

            // Performance selectors
            VStack(spacing: isCompactWidth ? 16 : 12) {
                PerformanceSelectorRow(
                    label: "Performance A",
                    selectedPerformance: $performanceA,
                    availablePerformances: availablePerformances.filter { $0.id != performanceB.id },
                    isCompact: isCompactWidth
                )

                PerformanceSelectorRow(
                    label: "Performance B",
                    selectedPerformance: $performanceB,
                    availablePerformances: availablePerformances.filter { $0.id != performanceA.id },
                    isCompact: isCompactWidth
                )
            }
        }
        .padding(isCompactWidth ? 12 : 16)
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(isCompactWidth ? 16 : 12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    // MARK: - Helper Methods

    private func updateBlendValue(from x: CGFloat, in width: CGFloat) {
        var newValue = Double(x / width)
        newValue = max(0.0, min(1.0, newValue))
        blendValue = newValue
        onBlendChanged(performanceA, performanceB, newValue)
    }

    private func snapToA() {
        withAnimation(.easeInOut(duration: 0.2)) {
            blendValue = 0.0
            onBlendChanged(performanceA, performanceB, 0.0)
        }
    }

    private func snapToMiddle() {
        withAnimation(.easeInOut(duration: 0.2)) {
            blendValue = 0.5
            onBlendChanged(performanceA, performanceB, 0.5)
        }
    }

    private func snapToB() {
        withAnimation(.easeInOut(duration: 0.2)) {
            blendValue = 1.0
            onBlendChanged(performanceA, performanceB, 1.0)
        }
    }
}

// MARK: - Supporting Types

/// Information about a performance
public struct PerformanceInfo: Identifiable, Equatable {
    public let id: String
    public let name: String
    public let description: String?

    public init(id: String, name: String, description: String? = nil) {
        self.id = id
        self.name = name
        self.description = description
    }

    public static func == (lhs: PerformanceInfo, rhs: PerformanceInfo) -> Bool {
        return lhs.id == rhs.id
    }
}

/// Performance label component
private struct PerformanceLabel: View {
    let label: String
    let performance: PerformanceInfo
    let isSelected: Bool
    let isCompact: Bool

    var body: some View {
        HStack(spacing: isCompact ? 8 : 4) {
            VStack(alignment: .leading, spacing: isCompact ? 2 : 4) {
                Text(label)
                    .font(isCompact ? .caption2 : .caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                Text(performance.name)
                    .font(isCompact ? .subheadline : .body)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundColor(isSelected ? .primary : .secondary)
                    .lineLimit(1)

                if !isCompact, let description = performance.description {
                    Text(description)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }

            if isCompact {
                Spacer()
            }
        }
        .frame(maxWidth: isCompact ? .infinity : 120, alignment: .leading)
    }
}

/// Performance selector row
private struct PerformanceSelectorRow: View {
    let label: String
    @Binding var selectedPerformance: PerformanceInfo
    let availablePerformances: [PerformanceInfo]
    let isCompact: Bool

    @State private var showingSelector: Bool = false

    var body: some View {
        Button(action: { showingSelector.toggle() }) {
            HStack(spacing: isCompact ? 8 : 12) {
                Text(label)
                    .font(isCompact ? .caption : .caption)
                    .foregroundColor(.secondary)
                    .frame(width: isCompact ? 70 : 80, alignment: .leading)

                Text(selectedPerformance.name)
                    .font(isCompact ? .subheadline : .body)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Spacer()

                Image(systemName: "chevron.down")
                    .font(isCompact ? .caption2 : .caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, isCompact ? 10 : 12)
            .padding(.vertical, isCompact ? 10 : 8)
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(isCompact ? 8 : 6)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingSelector) {
            PerformanceSelectorSheet(
                performances: availablePerformances,
                selectedPerformance: $selectedPerformance,
                onDismiss: { showingSelector = false },
                isCompact: isCompact
            )
        }
    }
}

/// Performance selector sheet
private struct PerformanceSelectorSheet: View {
    let performances: [PerformanceInfo]
    @Binding var selectedPerformance: PerformanceInfo
    let onDismiss: () -> Void
    let isCompact: Bool

    var body: some View {
        NavigationView {
            List(performances) { performance in
                Button(action: {
                    selectedPerformance = performance
                    onDismiss()
                }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(performance.name)
                                .font(isCompact ? .body : .body)
                                .foregroundColor(.primary)

                            if let description = performance.description {
                                Text(description)
                                    .font(isCompact ? .caption : .caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        if performance.id == selectedPerformance.id {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(PlainButtonStyle())
            }
            .navigationTitle("Select Performance")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: onDismiss) {
                        Text("Done")
                            .fontWeight(.semibold)
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct SweepControlView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPhone SE (compact)
            SweepControlView(
                blendValue: .constant(0.5),
                performanceA: .constant(PerformanceInfo(
                    id: "piano",
                    name: "Piano",
                    description: "Soft and melodic"
                )),
                performanceB: .constant(PerformanceInfo(
                    id: "techno",
                    name: "Techno",
                    description: "Energetic beats"
                )),
                availablePerformances: [
                    PerformanceInfo(id: "piano", name: "Piano", description: "Soft and melodic"),
                    PerformanceInfo(id: "techno", name: "Techno", description: "Energetic beats"),
                    PerformanceInfo(id: "jazz", name: "Jazz", description: "Smooth improvisation"),
                    PerformanceInfo(id: "orchestral", name: "Orchestral", description: "Full ensemble")
                ],
                onBlendChanged: { _, _, _ in }
            )
            .previewDevice("iPhone SE (3rd generation)")
            .previewDisplayName("iPhone SE")

            // iPhone 14 Pro (compact)
            SweepControlView(
                blendValue: .constant(0.75),
                performanceA: .constant(PerformanceInfo(
                    id: "piano",
                    name: "Piano",
                    description: "Soft and melodic"
                )),
                performanceB: .constant(PerformanceInfo(
                    id: "techno",
                    name: "Techno",
                    description: "Energetic beats"
                )),
                availablePerformances: [
                    PerformanceInfo(id: "piano", name: "Piano", description: "Soft and melodic"),
                    PerformanceInfo(id: "techno", name: "Techno", description: "Energetic beats"),
                    PerformanceInfo(id: "jazz", name: "Jazz", description: "Smooth improvisation"),
                    PerformanceInfo(id: "orchestral", name: "Orchestral", description: "Full ensemble")
                ],
                onBlendChanged: { _, _, _ in }
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iPhone 14 Pro")

            // iPad Pro (regular)
            SweepControlView(
                blendValue: .constant(0.25),
                performanceA: .constant(PerformanceInfo(
                    id: "piano",
                    name: "Piano",
                    description: "Soft and melodic"
                )),
                performanceB: .constant(PerformanceInfo(
                    id: "techno",
                    name: "Techno",
                    description: "Energetic beats"
                )),
                availablePerformances: [
                    PerformanceInfo(id: "piano", name: "Piano", description: "Soft and melodic"),
                    PerformanceInfo(id: "techno", name: "Techno", description: "Energetic beats"),
                    PerformanceInfo(id: "jazz", name: "Jazz", description: "Smooth improvisation"),
                    PerformanceInfo(id: "orchestral", name: "Orchestral", description: "Full ensemble")
                ],
                onBlendChanged: { _, _, _ in }
            )
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
            .previewDisplayName("iPad Pro")

            // Dark mode on iPhone
            SweepControlView(
                blendValue: .constant(0.5),
                performanceA: .constant(PerformanceInfo(
                    id: "piano",
                    name: "Piano",
                    description: "Soft and melodic"
                )),
                performanceB: .constant(PerformanceInfo(
                    id: "techno",
                    name: "Techno",
                    description: "Energetic beats"
                )),
                availablePerformances: [
                    PerformanceInfo(id: "piano", name: "Piano", description: "Soft and melodic"),
                    PerformanceInfo(id: "techno", name: "Techno", description: "Energetic beats")
                ],
                onBlendChanged: { _, _, _ in }
            )
            .previewDevice("iPhone 14 Pro")
            .preferredColorScheme(.dark)
            .previewDisplayName("iPhone 14 Pro - Dark")
        }
    }
}
#endif
