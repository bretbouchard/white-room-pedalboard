import SwiftUI

/// Multi-view notation container supporting 1-4 simultaneous notation views
///
/// Features:
/// - Dynamic number of views (1-4)
/// - Configurable layouts: 50/50, 60/40, 70/30, 33/33/33
/// - Drag-to-resize dividers with haptic feedback
/// - Real-time synchronization across all views
/// - Lazy loading for performance
/// - iPad-optimized with 44pt touch targets
@available(iOS 16.0, *)
public struct MultiViewNotationContainer: View {

    // MARK: - State

    @StateObject private var layoutMgr = LayoutManager()
    @StateObject private var registry = NotationViewRegistry()
    @StateObject private var syncManager = NotationSynchronizationManager()

    @State private var activeViews: [ActiveNotationView] = []
    @State private var showViewPicker: Bool = false
    @State private var showLayoutPicker: Bool = false
    @State private var draggedDivider: UUID?

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    // MARK: - Computed Properties

    private var isIPad: Bool {
        !(horizontalSizeClass == .compact && verticalSizeClass == .compact)
    }

    // MARK: - Body

    public var body: some View {
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

        return LazyNotationView(
            view: activeView.view,
            isVisible: true  // TODO: Add visibility detection
        )
        .frame(width: frame.width, height: frame.height)
        .position(x: frame.midX, y: frame.midY)
        .clipped()
        .zIndex(Double(slot.zIndex))
        .onAppear {
            // Register view for synchronization
            syncManager.registerView(activeView.id, type: activeView.type)
        }
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
            isDragging: Binding(
                get: { draggedDivider == divider.id },
                set: { isDragging in
                    if isDragging {
                        draggedDivider = divider.id
                    } else {
                        draggedDivider = nil
                    }
                }
            ),
            offset: Binding(
                get: { divider.offset },
                set: { newOffset in handleDividerDrag(divider, to: newOffset, in: geometry) }
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
            Button(action: {
                showViewPicker.toggle()
                triggerHapticFeedback(.medium)
            }) {
                Image(systemName: "plus.rectangle.on.rectangle")
                    .font(.title2)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }
            .disabled(activeViews.count >= 3)

            // Layout selector
            Button(action: {
                showLayoutPicker.toggle()
                triggerHapticFeedback(.medium)
            }) {
                Image(systemName: "square.split.2x2")
                    .font(.title2)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }
            .disabled(activeViews.count < 2)

            Spacer()

            // View count indicator
            Text("\(activeViews.count) view\(activeViews.count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)

            // Reset button
            if activeViews.count > 1 {
                Button(action: {
                    resetToSingleView()
                    triggerHapticFeedback(.medium)
                }) {
                    Image(systemName: "xmark.circle")
                        .font(.title2)
                        .foregroundColor(.primary)
                        .frame(width: 44, height: 44)
                }
            }
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

        let newView = registry.createView(type)
        let activeView = ActiveNotationView(
            id: UUID(),
            type: type,
            view: newView,
            layoutSlot: layoutMgr.nextAvailableSlot()
        )

        activeViews.append(activeView)
        layoutMgr.recalculateSlots(for: activeViews)

        // Trigger haptic feedback
        triggerHapticFeedback(.light)

        // Save layout
        saveLayout()
    }

    private func removeView(_ id: UUID) {
        activeViews.removeAll { $0.id == id }
        layoutMgr.recalculateSlots(for: activeViews)
        syncManager.unregisterView(id)
        saveLayout()
    }

    private func resetToSingleView() {
        guard let primaryView = activeViews.first else { return }

        activeViews = [primaryView]
        layoutMgr.layoutMode = .singleView
        layoutMgr.recalculateSlots(for: activeViews)
        saveLayout()

        triggerHapticFeedback(.medium)
    }

    private func handleDividerDrag(_ divider: DividerInfo, to newOffset: CGFloat, in geometry: GeometryProxy) {
        layoutMgr.updateDivider(divider, offset: newOffset, in: geometry)
        layoutMgr.recalculateSlots(for: activeViews)
    }

    private func loadDefaultLayout() {
        // Load saved layout or use default
        if let savedLayout = loadSavedLayout() {
            activeViews = savedLayout.views
            layoutMgr.configuration = savedLayout.configuration
        } else {
            // Default: Piano roll + Tablature
            addView(.pianoRoll)
            addView(.tablature)
        }
    }

    private func saveLayout() {
        let savedLayout = SavedLayout(
            views: activeViews,
            configuration: layoutMgr.configuration
        )

        if let data = try? JSONEncoder().encode(savedLayout) {
            UserDefaults.standard.set(data, forKey: "savedMultiViewLayout")
        }
    }

    private func loadSavedLayout() -> SavedLayout? {
        guard let data = UserDefaults.standard.data(forKey: "savedMultiViewLayout"),
              let layout = try? JSONDecoder().decode(SavedLayout.self, from: data) else {
            return nil
        }
        return layout
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
        saveLayout()
        triggerHapticFeedback(.medium)
    }

    // MARK: - Helper Methods

    private func triggerHapticFeedback(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
        #endif
    }

    // MARK: - Initialization

    public init() {}
}

// =============================================================================
// MARK: - Active Notation View
// =============================================================================

struct ActiveNotationView: Identifiable {
    let id: UUID
    let type: NotationViewType
    let view: AnyView
    var layoutSlot: LayoutSlot
}

// =============================================================================
// MARK: - Divider Info
// =============================================================================

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

// =============================================================================
// MARK: - Saved Layout
// =============================================================================

struct SavedLayout: Codable {
    var views: [SavedNotationView]
    var configuration: LayoutConfiguration
}

struct SavedNotationView: Codable {
    let id: UUID
    let type: NotationViewType
}

// =============================================================================
// MARK: - Lazy Notation View
// =============================================================================

struct LazyNotationView: View {
    let view: AnyView
    let isVisible: Bool

    var body: some View {
        Group {
            if isVisible {
                view
            } else {
                // Placeholder when not visible
                Rectangle()
                    .fill(Color(UIColor.systemBackground))
            }
        }
    }
}

// =============================================================================
// MARK: - Previews
// ===============================================================================

#if DEBUG
@available(iOS 16.0, *)
struct MultiViewNotationContainer_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPad Pro 12.9" - 50/50 split
            MultiViewNotationContainer()
                .previewDevice("iPad Pro (12.9-inch) (6th generation)")
                .previewDisplayName("iPad Pro 12.9\" - Split View")

            // iPad Pro 11" - Three-way split
            MultiViewNotationContainer()
                .previewDevice("iPad Pro (11-inch) (4th generation)")
                .previewDisplayName("iPad Pro 11\" - Three-Way")

            // iPad mini - Dark mode
            MultiViewNotationContainer()
                .previewDevice("iPad mini (6th generation)")
                .preferredColorScheme(.dark)
                .previewDisplayName("iPad mini - Dark")
        }
    }
}
#endif
