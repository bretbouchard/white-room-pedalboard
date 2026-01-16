import SwiftUI

/// Manages layout calculations and slot allocation for split-view notation system
///
/// Handles:
/// - Layout mode transitions (single, split, three-way)
/// - Slot calculations based on preset ratios
/// - Divider positioning and drag handling
/// - Frame normalization to 0-1 coordinate space
@available(iOS 16.0, *)
public class LayoutManager: ObservableObject {

    // MARK: - Published Properties

    @Published var layoutMode: LayoutMode = .splitView(.fiftyFifty)
    @Published var configuration: LayoutConfiguration = .default

    // MARK: - Public Methods

    /// Get the layout slot for a specific active view
    public func slotFor(_ activeView: ActiveNotationView) -> LayoutSlot? {
        configuration.slots.first { $0.id == activeView.id }
    }

    /// Get all dividers for current layout mode
    public var dividers: [DividerInfo] {
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

    /// Recalculate slots based on current layout mode and active views
    public func recalculateSlots(for views: [ActiveNotationView]) {
        configuration = currentLayout(for: views)
    }

    /// Get the next available slot for a new view
    public func nextAvailableSlot() -> LayoutSlot {
        LayoutSlot(
            id: UUID(),
            frame: CGRect(x: 0, y: 0, width: 1, height: 1),
            zIndex: 0
        )
    }

    /// Update divider position and recalculate affected slots
    public func updateDivider(_ divider: DividerInfo, offset: CGFloat, in geometry: GeometryProxy) {
        // Update slot positions based on divider offset
        // This is a simplified implementation - full version would
        // need to handle min/max constraints and slot boundaries
        switch layoutMode {
        case .splitView(let preset):
            updateSplitViewDivider(preset: preset, divider: divider, offset: offset)
        default:
            break
        }
    }

    // MARK: - Private Methods

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
                    offset: preset.ratios[0],
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: preset.ratios[0], y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                )
            ]
        case .threeWayEqual, .threeWayPrimary:
            return [
                DividerInfo(
                    axis: .vertical,
                    offset: preset.ratios[0],
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: preset.ratios[0], y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                ),
                DividerInfo(
                    axis: .vertical,
                    offset: preset.ratios[0] + preset.ratios[1],
                    slot: LayoutSlot(
                        id: UUID(),
                        frame: CGRect(x: preset.ratios[0] + preset.ratios[1], y: 0, width: 0, height: 1),
                        zIndex: 1000
                    )
                )
            ]
        }
    }

    private func updateSplitViewDivider(preset: LayoutMode.SplitPreset, divider: DividerInfo, offset: CGFloat) {
        // Simplified implementation - full version would:
        // - Clamp offset to valid range (0.2-0.8)
        // - Update affected slots based on new divider position
        // - Emit notification for view recalculation
        // For now, this is a placeholder for the drag-to-resize functionality
    }

    // MARK: - Initialization

    public init() {}
}

// =============================================================================
// MARK: - Layout Mode
// ===============================================================================

/// Defines the overall layout mode for the multi-view container
public enum LayoutMode: Equatable {
    case singleView
    case splitView(SplitPreset)
    case tabs
    case custom

    /// Predefined split-view layouts
    public enum SplitPreset: Equatable {
        case fiftyFifty        // [0.5, 0.5]
        case sixtyForty        // [0.6, 0.4]
        case seventyThirty     // [0.7, 0.3]
        case threeWayEqual     // [0.33, 0.33, 0.33]
        case threeWayPrimary   // [0.5, 0.25, 0.25]

        /// Width ratios for each view slot
        public var ratios: [Double] {
            switch self {
            case .fiftyFifty:
                return [0.5, 0.5]
            case .sixtyForty:
                return [0.6, 0.4]
            case .seventyThirty:
                return [0.7, 0.3]
            case .threeWayEqual:
                return [0.33, 0.33, 0.33]
            case .threeWayPrimary:
                return [0.5, 0.25, 0.25]
            }
        }

        /// Calculate layout slots for given views
        public func calculateSlots(for views: [ActiveNotationView]) -> [LayoutSlot] {
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
                // Fallback to single view if view count doesn't match preset
                guard let primaryView = views.first else {
                    return []
                }
                return [
                    LayoutSlot(id: primaryView.id, frame: CGRect(x: 0, y: 0, width: 1, height: 1), zIndex: 0)
                ]
            }
        }

        /// Display name for this preset
        public var displayName: String {
            switch self {
            case .fiftyFifty: return "50/50"
            case .sixtyForty: return "60/40"
            case .seventyThirty: return "70/30"
            case .threeWayEqual: return "33/33/33"
            case .threeWayPrimary: return "50/25/25"
            }
        }

        /// Minimum number of views required for this preset
        public var minViews: Int {
            switch self {
            case .fiftyFifty, .sixtyForty, .seventyThirty:
                return 2
            case .threeWayEqual, .threeWayPrimary:
                return 3
            }
        }

        /// Maximum number of views supported by this preset
        public var maxViews: Int {
            switch self {
            case .fiftyFifty, .sixtyForty, .seventyThirty:
                return 2
            case .threeWayEqual, .threeWayPrimary:
                return 3
            }
        }
    }
}

// =============================================================================
// MARK: - Layout Configuration
// ===============================================================================

/// Complete layout configuration including slots and optional tab bar
public struct LayoutConfiguration: Equatable {
    var slots: [LayoutSlot]
    var tabBar: TabBarConfiguration?

    static let `default` = LayoutConfiguration(slots: [
        LayoutSlot(id: UUID(), frame: CGRect(x: 0, y: 0, width: 1, height: 1), zIndex: 0)
    ])
}

/// Layout slot defining position and z-index for a view
public struct LayoutSlot: Identifiable, Equatable {
    var id: UUID
    var frame: CGRect  // Normalized (0-1)
    var zIndex: Int
}

/// Tab bar configuration for tab-based layouts
public struct TabBarConfiguration: Equatable {
    var items: [TabItem]
    var position: TabPosition = .bottom

    public enum TabPosition {
        case top, bottom, left, right
    }
}

/// Tab item for tab bar
public struct TabItem: Identifiable, Equatable {
    var id: UUID
    var title: String
    var icon: String

    init(view: ActiveNotationView) {
        self.id = view.id
        self.title = view.type.displayName
        self.icon = view.type.icon
    }
}

// =============================================================================
// MARK: - Previews
// ===============================================================================

#if DEBUG
@available(iOS 16.0, *)
struct LayoutManager_Previews: PreviewProvider {
    static var previews: some View {
        Text("LayoutManager Preview")
            .previewDisplayName("Layout Manager")
    }
}
#endif
