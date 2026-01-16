import SwiftUI

/// The root view for the White Room surface interface
///
/// SurfaceRootView is the main interface for the White Room audio plugin,
/// containing all controls for performance manipulation including the Sweep control.
/// Adapts layout for iPhone (compact) and iPad/Mac (regular) size classes.
public struct SurfaceRootView: View {

    // MARK: - State

    @StateObject private var engine = JUCEEngine.shared
    @State private var blendValue: Double = 0.5
    @State private var performanceA: PerformanceInfo = PerformanceInfo(
        id: "piano",
        name: "Piano",
        description: "Soft and melodic"
    )
    @State private var performanceB: PerformanceInfo = PerformanceInfo(
        id: "techno",
        name: "Techno",
        description: "Energetic beats"
    )
    @State private var availablePerformances: [PerformanceInfo] = []

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    // MARK: - Computed Properties

    /// Whether the current layout is compact (iPhone portrait)
    private var isCompactLayout: Bool {
        horizontalSizeClass == .compact
    }

    /// Whether the current layout is regular (iPad/Mac or iPhone landscape)
    private var isRegularLayout: Bool {
        horizontalSizeClass == .regular
    }

    // MARK: - Body

    public var body: some View {
        ScrollView {
            VStack(spacing: isCompactLayout ? 16 : 24) {
                // Header
                HeaderView()

                // Engine Status
                EngineStatusView(engine: engine)

                // Sweep Control
                SweepControlSection(
                    blendValue: $blendValue,
                    performanceA: $performanceA,
                    performanceB: $performanceB,
                    availablePerformances: availablePerformances
                )

                // Additional controls can be added here
                // Transport controls, mixer, etc.
            }
            .padding(isCompactLayout ? 12 : 16)
        }
        .onAppear {
            loadAvailablePerformances()
            startEngine()
        }
        .onDisappear {
            stopEngine()
        }
    }

    // MARK: - Helper Views

    private func HeaderView() -> some View {
        VStack(spacing: isCompactLayout ? 4 : 8) {
            Text("White Room")
                .font(isCompactLayout ? .title : .largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            Text("Parallel Performance Universes")
                .font(isCompactLayout ? .caption : .subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.bottom, isCompactLayout ? 4 : 8)
    }

    private func EngineStatusView(engine: JUCEEngine) -> some View {
        HStack(spacing: isCompactLayout ? 8 : 12) {
            Circle()
                .fill(engine.isEngineRunning ? Color.green : Color.red)
                .frame(width: isCompactLayout ? 10 : 12, height: isCompactLayout ? 10 : 12)

            Text(engine.isEngineRunning ? "Running" : "Stopped")
                .font(isCompactLayout ? .caption2 : .caption)
                .foregroundColor(.secondary)

            Spacer()

            if engine.isEngineRunning {
                Button(action: { stopEngine() }) {
                    Text("Stop")
                        .font(isCompactLayout ? .caption2 : .caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, isCompactLayout ? 10 : 12)
                        .padding(.vertical, isCompactLayout ? 5 : 6)
                        .background(Color.red)
                        .cornerRadius(6)
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                Button(action: { startEngine() }) {
                    Text("Start")
                        .font(isCompactLayout ? .caption2 : .caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, isCompactLayout ? 10 : 12)
                        .padding(.vertical, isCompactLayout ? 5 : 6)
                        .background(Color.green)
                        .cornerRadius(6)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(isCompactLayout ? 10 : 12)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
    }

    private func SweepControlSection(
        blendValue: Binding<Double>,
        performanceA: Binding<PerformanceInfo>,
        performanceB: Binding<PerformanceInfo>,
        availablePerformances: [PerformanceInfo]
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Performance Sweep")
                .font(.headline)
                .foregroundColor(.primary)

            Text("Blend between two performances like parallel universes")
                .font(.caption)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            SweepControlView(
                blendValue: blendValue,
                performanceA: performanceA,
                performanceB: performanceB,
                availablePerformances: availablePerformances,
                onBlendChanged: { a, b, t in
                    handleBlendChanged(a, b, t)
                }
            )
        }
    }

    // MARK: - Actions

    private func loadAvailablePerformances() {
        availablePerformances = engine.fetchAvailablePerformances()

        // Set default performances if not already set
        if availablePerformances.count >= 2 {
            if performanceA.id.isEmpty {
                performanceA = availablePerformances[0]
            }
            if performanceB.id.isEmpty {
                performanceB = availablePerformances[1]
            }
        }
    }

    private func startEngine() {
        engine.startEngine()
    }

    private func stopEngine() {
        engine.stopEngine()
    }

    private func handleBlendChanged(
        _ performanceA: PerformanceInfo,
        _ performanceB: PerformanceInfo,
        _ blendValue: Double
    ) {
        // Send blend command to engine
        engine.setPerformanceBlend(performanceA, performanceB, blendValue: blendValue)

        // Log for debugging
        NSLog("[SurfaceRootView] Blend changed: \(performanceA.name) (\(String(format: "%.0f%%", blendValue * 100))) ↔ \(performanceB.name)")
    }

    // MARK: - Initialization

    public init() {}
}

// MARK: - Preview

#if DEBUG
struct SurfaceRootView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPhone SE (compact)
            SurfaceRootView()
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE - Portrait")

            // iPhone 14 Pro (compact)
            SurfaceRootView()
                .previewDevice("iPhone 14 Pro")
                .previewDisplayName("iPhone 14 Pro - Portrait")

            // iPhone 14 Pro Max landscape (regular)
            SurfaceRootView()
                .previewDevice("iPhone 14 Pro Max")
                .previewInterfaceOrientation(.landscapeLeft)
                .previewDisplayName("iPhone 14 Pro Max - Landscape")

            // iPad Pro (regular)
            SurfaceRootView()
                .previewDevice("iPad Pro (12.9-inch) (6th generation)")
                .previewDisplayName("iPad Pro")

            // Dark mode
            SurfaceRootView()
                .previewDevice("iPhone 14 Pro")
                .preferredColorScheme(.dark)
                .previewDisplayName("iPhone 14 Pro - Dark Mode")
        }
    }
}
#endif
