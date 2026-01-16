//
//  Colors.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Shared Color Palette
// =============================================================================

/**
 Shared color palette for White Room UI

 Platform adaptations:
 - iOS: Standard system colors
 - macOS: Slightly muted for larger displays
 - tvOS: High contrast for 10-foot viewing
 */
public extension Color {

    // MARK: - Brand Colors

    /// Primary brand color (blue)
    static let brand = Color.blue

    /// Accent color for highlights
    static let accent = Color.purple

    /// Success state color
    static let success = Color.green

    /// Warning state color
    static let warning = Color.orange

    /// Error state color
    static let error = Color.red

    // MARK: - Semantic Colors

    /// Primary action color
    static let primaryAction = Color.blue

    /// Secondary action color
    static let secondaryAction = Color.gray

    /// Destructive action color
    static let destructive = Color.red

    // MARK: - Background Colors

    /// Primary background
    static let primaryBackground = Color(
        light: Color.white,
        dark: Color.black
    )

    /// Secondary background (cards, panels)
    static let secondaryBackground = Color(
        light: Color(red: 0.95, green: 0.95, blue: 0.97),
        dark: Color(red: 0.15, green: 0.15, blue: 0.17)
    )

    /// Tertiary background (nested elements)
    static let tertiaryBackground = Color(
        light: Color(red: 0.90, green: 0.90, blue: 0.92),
        dark: Color(red: 0.20, green: 0.20, blue: 0.22)
    )

    // MARK: - Text Colors

    /// Primary text color
    static let primaryText = Color.primary

    /// Secondary text color
    static let secondaryText = Color.secondary

    /// Tertiary text color (disabled, subtle)
    static let tertiaryText = Color(
        light: Color.gray,
        dark: Color.gray.opacity(0.6)
    )

    // MARK: - Border Colors

    /// Primary border color
    static let primaryBorder = Color(
        light: Color.gray.opacity(0.3),
        dark: Color.gray.opacity(0.2)
    )

    /// Focus border color (for accessibility)
    static let focusBorder = Color.blue

    // MARK: - Overlay Colors

    /// Standard overlay
    static let overlay = Color.black.opacity(0.4)

    /// Light overlay
    static let lightOverlay = Color.black.opacity(0.2)

    /// Heavy overlay
    static let heavyOverlay = Color.black.opacity(0.6)

    // MARK: - Performance Mode Colors

    /// Color for piano mode
    static let pianoMode = Color.blue

    /// Color for SATB mode
    static let satbMode = Color.green

    /// Color for techno mode
    static let technoMode = Color.orange

    /// Color for custom mode
    static let customMode = Color.purple

    // MARK: - Intent Colors

    /// Color for identity intent
    static let identityIntent = Color.purple

    /// Color for song intent
    static let songIntent = Color.blue

    /// Color for cue intent
    static let cueIntent = Color.red

    /// Color for ritual intent
    static let ritualIntent = Color.orange

    /// Color for loop intent
    static let loopIntent = Color.teal
}

// =============================================================================
// MARK: - Color Initializers
// =============================================================================

public extension Color {

    /**
     Create a color that adapts to light/dark mode
     - Parameters:
       - light: Color in light mode
       - dark: Color in dark mode
     */
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor(
            light: UIColor(light),
            dark: UIColor(dark)
        ))
    }
}

// =============================================================================
// MARK: - Platform-Specific Color Adjustments
// =============================================================================

public extension Color {

    /**
     Adjust color for current platform

     - tvOS: Increases contrast for 10-foot viewing
     - macOS: Slightly desaturates for larger displays
     - iOS: No adjustment (baseline)
     */
    func platformAdjusted() -> Color {
        #if os(tvOS)
        // Increase contrast for tvOS
        return self.opacity(1.2)
        #elseif os(macOS)
        // Slightly desaturate for macOS
        return self.opacity(0.9)
        #else
        // iOS - no adjustment
        return self
        #endif
    }
}

// =============================================================================
// MARK: - UIColor Extension
// =============================================================================

private extension UIColor {

    /**
     Create a UIColor that adapts to light/dark mode
     - Parameters:
       - light: Color in light mode
       - dark: Color in dark mode
     */
    convenience init(light: UIColor, dark: UIColor) {
        self.init { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? dark : light
        }
    }
}

// =============================================================================
// MARK: - Gradients
// =============================================================================

public extension LinearGradient {

    /// Brand gradient for primary actions
    static let brandGradient = LinearGradient(
        gradient: Gradient(colors: [.blue, .purple]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Subtle gradient for backgrounds
    static let subtleGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.secondaryBackground,
            Color.tertiaryBackground
        ]),
        startPoint: .top,
        endPoint: .bottom
    )

    /// Success gradient
    static let successGradient = LinearGradient(
        gradient: Gradient(colors: [.green, .teal]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Error gradient
    static let errorGradient = LinearGradient(
        gradient: Gradient(colors: [.red, .orange]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
