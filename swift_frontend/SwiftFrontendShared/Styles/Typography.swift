//
//  Typography.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Typography System
// =============================================================================

/**
 Shared typography system for White Room UI

 Platform adaptations:
 - iOS: Standard system font sizes
 - macOS: Slightly larger for desktop viewing
 - tvOS: Significantly larger for 10-foot viewing
 */
public extension Font {

    // MARK: - Display Fonts

    /// Large display text (hero sections)
    static let displayLarge = platformFont(
        iOS: .system(size: 34, weight: .bold),
        macOS: .system(size: 40, weight: .bold),
        tvOS: .system(size: 60, weight: .bold)
    )

    /// Medium display text (section headers)
    static let displayMedium = platformFont(
        iOS: .system(size: 28, weight: .bold),
        macOS: .system(size: 32, weight: .bold),
        tvOS: .system(size: 50, weight: .bold)
    )

    /// Small display text (card titles)
    static let displaySmall = platformFont(
        iOS: .system(size: 22, weight: .semibold),
        macOS: .system(size: 24, weight: .semibold),
        tvOS: .system(size: 40, weight: .semibold)
    )

    // MARK: - Body Fonts

    /// Large body text (primary content)
    static let bodyLarge = platformFont(
        iOS: .system(size: 17, weight: .regular),
        macOS: .system(size: 18, weight: .regular),
        tvOS: .system(size: 28, weight: .regular)
    )

    /// Medium body text (secondary content)
    static let bodyMedium = platformFont(
        iOS: .system(size: 15, weight: .regular),
        macOS: .system(size: 16, weight: .regular),
        tvOS: .system(size: 24, weight: .regular)
    )

    /// Small body text (tertiary content)
    static let bodySmall = platformFont(
        iOS: .system(size: 13, weight: .regular),
        macOS: .system(size: 14, weight: .regular),
        tvOS: .system(size: 20, weight: .regular)
    )

    // MARK: - Label Fonts

    /// Large label (button text, form labels)
    static let labelLarge = platformFont(
        iOS: .system(size: 17, weight: .semibold),
        macOS: .system(size: 18, weight: .semibold),
        tvOS: .system(size: 28, weight: .semibold)
    )

    /// Medium label (secondary buttons)
    static let labelMedium = platformFont(
        iOS: .system(size: 15, weight: .medium),
        macOS: .system(size: 16, weight: .medium),
        tvOS: .system(size: 24, weight: .medium)
    )

    /// Small label (captions, metadata)
    static let labelSmall = platformFont(
        iOS: .system(size: 11, weight: .medium),
        macOS: .system(size: 12, weight: .medium),
        tvOS: .system(size: 18, weight: .medium)
    )

    // MARK: - Monospace Fonts

    /// Monospace font for code/data
    static let monoLarge = platformFont(
        iOS: Font.system(.body, design: .monospaced),
        macOS: Font.system(.body, design: .monospaced),
        tvOS: Font.system(.body, design: .monospaced)
    )

    /// Monospace font for small code/data
    static let monoSmall = platformFont(
        iOS: Font.system(.caption, design: .monospaced),
        macOS: Font.system(.caption, design: .monospaced),
        tvOS: Font.system(.caption, design: .monospaced)
    )
}

// =============================================================================
// MARK: - Font Helper
// =============================================================================

private extension Font {

    /**
     Create a font that adapts to the current platform
     - Parameters:
       - iOS: Font for iOS
       - macOS: Font for macOS
       - tvOS: Font for tvOS
     */
    static func platformFont(
        iOS: Font,
        macOS: Font,
        tvOS: Font
    ) -> Font {
        #if os(tvOS)
        return tvOS
        #elseif os(macOS)
        return macOS
        #else
        return iOS
        #endif
    }
}

// =============================================================================
// MARK: - Text Line Limits
// =============================================================================

public extension Text {

    /**
     Limit lines based on platform

     - tvOS: Fewer lines for larger text
     - macOS/iOS: Standard limits
     */
    func platformLineLimit(
        iOSLimit: Int,
        macOSLimit: Int? = nil,
        tvOSLimit: Int? = nil
    ) -> some View {
        #if os(tvOS)
        let limit = tvOSLimit ?? max(iOSLimit - 1, 1)
        #elseif os(macOS)
        let limit = macOSLimit ?? iOSLimit
        #else
        let limit = iOSLimit
        #endif

        return self.lineLimit(limit)
    }
}

// =============================================================================
// MARK: - Text Style Modifiers
// =============================================================================

public extension Text {

    /**
     Apply heading style
     */
    func headingStyle() -> some View {
        self
            .font(.displayMedium)
            .foregroundColor(.primaryText)
    }

    /**
     Apply subheading style
     */
    func subheadingStyle() -> some View {
        self
            .font(.displaySmall)
            .foregroundColor(.secondaryText)
    }

    /**
     Apply body style
     */
    func bodyStyle() -> some View {
        self
            .font(.bodyLarge)
            .foregroundColor(.primaryText)
    }

    /**
     Apply caption style
     */
    func captionStyle() -> some View {
        self
            .font(.labelSmall)
            .foregroundColor(.tertiaryText)
    }
}

// =============================================================================
// MARK: - Dynamic Type Support
// =============================================================================

public extension View {

    /**
     Enable dynamic type support for accessibility

     Automatically scales text based on user's accessibility settings
     */
    func supportsDynamicType() -> some View {
        self
            .font(.body)
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    }

    /**
     Ensure minimum touch target for Dynamic Type

     When text grows, touch targets should grow too
     - Parameter minimumSize: Minimum touch target size (44pt iOS, 80pt tvOS)
     */
    func accessibleWithTouchTarget(minimumSize: CGFloat = 44) -> some View {
        self
            .frame(minWidth: minimumSize, minHeight: minimumSize)
            .contentShape(Rectangle())
    }
}
