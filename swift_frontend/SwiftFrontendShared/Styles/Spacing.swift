//
//  Spacing.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Spacing System
// =============================================================================

/**
 Shared spacing system for White Room UI

 Platform adaptations:
 - iOS: Standard spacing for touch interfaces
 - macOS: Slightly more spacing for mouse interaction
 - tvOS: Significantly more spacing for remote navigation
 */
public struct Spacing {

    // MARK: - Base Spacing Unit

    /// Base spacing unit (4pt)
    public static let base: CGFloat = 4.0

    // MARK: - Micro Spacing (0.5x - 2x base)

    /// XXSmall spacing (2pt) - tightest spacing
    public static let xxSmall: CGFloat = base * 0.5

    /// XSmall spacing (4pt) - very tight spacing
    public static let xSmall: CGFloat = base * 1.0

    /// Small spacing (8pt) - tight spacing
    public static let small: CGFloat = base * 2.0

    // MARK: - Standard Spacing (3x - 8x base)

    /// Medium spacing (12pt) - standard spacing
    public static let medium: CGFloat = base * 3.0

    /// Large spacing (16pt) - comfortable spacing
    public static let large: CGFloat = base * 4.0

    /// XLarge spacing (24pt) - section spacing
    public static let xLarge: CGFloat = base * 6.0

    /// XXLarge spacing (32pt) - major section spacing
    public static let xxLarge: CGFloat = base * 8.0

    // MARK: - Platform-Adjusted Spacing

    /**
     Get spacing adjusted for current platform

     - tvOS: 1.5x multiplier for larger touch targets
     - macOS: 1.2x multiplier for desktop comfort
     - iOS: 1.0x (baseline)
     */
    public static func platformAdjusted(_ baseSpacing: CGFloat) -> CGFloat {
        #if os(tvOS)
        return baseSpacing * 1.5
        #elseif os(macOS)
        return baseSpacing * 1.2
        #else
        return baseSpacing
        #endif
    }

    // MARK: - Touch Target Sizes

    /**
     Minimum touch target size

     Platform-specific minimums:
     - iOS: 44pt (Apple HIG)
     - macOS: 20pt (mouse interaction)
     - tvOS: 80pt (remote interaction)
     */
    public static let touchTargetMin: CGFloat = {
        #if os(tvOS)
        return 80.0
        #elseif os(macOS)
        return 20.0
        #else
        return 44.0
        #endif
    }()

    /**
     Comfortable touch target size

     Larger than minimum for better usability
     */
    public static let touchTargetComfortable: CGFloat = {
        #if os(tvOS)
        return 100.0
        #elseif os(macOS)
        return 32.0
        #else
        return 48.0
        #endif
    }()

    // MARK: - Corner Radius

    /// Small corner radius (4pt) - buttons, small cards
    public static let cornerRadiusSmall: CGFloat = base * 1.0

    /// Medium corner radius (8pt) - cards, panels
    public static let cornerRadiusMedium: CGFloat = base * 2.0

    /// Large corner radius (12pt) - large cards, modals
    public static let cornerRadiusLarge: CGFloat = base * 3.0

    /// Extra large corner radius (16pt) - hero elements
    public static let cornerRadiusXLarge: CGFloat = base * 4.0

    // MARK: - Border Width

    /// Thin border (1pt)
    public static let borderThin: CGFloat = 1.0

    /// Medium border (2pt)
    public static let borderMedium: CGFloat = 2.0

    /// Thick border (3pt)
    public static let borderThick: CGFloat = 3.0

    // MARK: - Shadow Offsets

    /// Small shadow offset
    public static let shadowSmall: CGFloat = 2.0

    /// Medium shadow offset
    public static let shadowMedium: CGFloat = 4.0

    /// Large shadow offset
    public static let shadowLarge: CGFloat = 8.0

    // MARK: - Grid System

    /// Number of columns in grid system
    public static let gridColumns: Int = {
        #if os(tvOS)
        return 4  // Fewer columns on tvOS
        #elseif os(macOS)
        return 6  // More columns on macOS
        #else
        return 4  // Standard on iOS
        #endif
    }()

    /// Grid spacing
    public static let gridSpacing: CGFloat = large

    /// Grid padding
    public static let gridPadding: CGFloat = medium
}

// =============================================================================
// MARK: - EdgeInsets Helpers
// =============================================================================

public extension EdgeInsets {

    /**
     Uniform padding on all edges
     - Parameter value: Padding value
     */
    static func uniform(_ value: CGFloat) -> EdgeInsets {
        EdgeInsets(top: value, leading: value, bottom: value, trailing: value)
    }

    /**
     Horizontal padding only
     - Parameter value: Padding value
     */
    static func horizontal(_ value: CGFloat) -> EdgeInsets {
        EdgeInsets(top: 0, leading: value, bottom: 0, trailing: value)
    }

    /**
     Vertical padding only
     - Parameter value: Padding value
     */
    static func vertical(_ value: CGFloat) -> EdgeInsets {
        EdgeInsets(top: value, leading: 0, bottom: value, trailing: 0)
    }

    /**
     Platform-adjusted padding
     - Parameter baseValue: Base padding value
     */
    static func platformAdjusted(_ baseValue: CGFloat) -> EdgeInsets {
        let adjusted = Spacing.platformAdjusted(baseValue)
        return .uniform(adjusted)
    }
}

// =============================================================================
// MARK: - View Modifiers
// =============================================================================

public extension View {

    /**
     Apply standard card padding
     */
    func cardPadding() -> some View {
        self.padding(.uniform(Spacing.medium))
    }

    /**
     Apply standard section padding
     */
    func sectionPadding() -> some View {
        self.padding(.uniform(Spacing.large))
    }

    /**
     Apply platform-adjusted padding
     - Parameter basePadding: Base padding value
     */
    func platformPadding(_ basePadding: CGFloat) -> some View {
        let adjusted = Spacing.platformAdjusted(basePadding)
        return self.padding(.uniform(adjusted))
    }

    /**
     Apply spacing between elements
     - Parameter spacing: Spacing value
     */
    func standardSpacing(_ spacing: CGFloat = Spacing.medium) -> some View {
        self.spacing(spacing)
    }
}

// =============================================================================
// MARK: - Layout Helpers
// =============================================================================

public struct HSpacings: Layout {
    let spacing: CGFloat

    public init(spacing: CGFloat = Spacing.medium) {
        self.spacing = spacing
    }

    @available(iOS 16.0, *)
    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        let totalWidth = sizes.reduce(0) { $0 + $1.width } + CGFloat(sizes.count - 1) * spacing
        let maxHeight = sizes.map(\.height).max() ?? 0
        return CGSize(width: totalWidth, height: maxHeight)
    }

    @available(iOS 16.0, *)
    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var xOffset = bounds.minX
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            subview.place(at: CGPoint(x: xOffset, y: bounds.minY), proposal: .unspecified)
            xOffset += size.width + spacing
        }
    }
}

public struct VSpacings: Layout {
    let spacing: CGFloat

    public init(spacing: CGFloat = Spacing.medium) {
        self.spacing = spacing
    }

    @available(iOS 16.0, *)
    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        let totalHeight = sizes.reduce(0) { $0 + $1.height } + CGFloat(sizes.count - 1) * spacing
        let maxWidth = sizes.map(\.width).max() ?? 0
        return CGSize(width: maxWidth, height: totalHeight)
    }

    @available(iOS 16.0, *)
    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var yOffset = bounds.minY
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            subview.place(at: CGPoint(x: bounds.minX, y: yOffset), proposal: .unspecified)
            yOffset += size.height + spacing
        }
    }
}
