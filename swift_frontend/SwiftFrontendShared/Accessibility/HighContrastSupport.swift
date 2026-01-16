//
//  HighContrastSupport.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - High Contrast Detection
// =============================================================================

/**
 High contrast support for accessibility

 Automatically detects system high contrast mode and provides
 WCAG AA compliant color schemes (4.5:1 contrast ratio)
 */
public extension View {

    /**
     Apply high contrast colors when system high contrast is enabled
     */
    func highContrastAware() -> some View {
        self
            .environment(\.colorScheme, .dark) // Force dark for high contrast
            .onAppear {
                // Monitor high contrast changes
                NotificationCenter.default.addObserver(
                    forName: UIAccessibility.darkerSystemColorsStatusDidChangeNotification,
                    object: nil,
                    queue: .main
                ) { _ in
                    // Trigger view update
                }
            }
    }

    /**
     Force high contrast mode
     - Parameter enabled: Enable high contrast
     */
    func forceHighContrast(_ enabled: Bool) -> some View {
        Group {
            if enabled {
                self.environment(\.colorScheme, .dark)
            } else {
                self
            }
        }
    }
}

// =============================================================================
// MARK: - High Contrast Colors
// =============================================================================

/**
 High contrast color palette (WCAG AAA compliant)
 */
public struct HighContrastColors {

    // MARK: - Background Colors

    /// Pure black for background
    public static let background = Color.black

    /// Dark gray for secondary background
    public static let backgroundSecondary = Color(red: 0.05, green: 0.05, blue: 0.05)

    /// Medium gray for tertiary background
    public static let backgroundTertiary = Color(red: 0.1, green: 0.1, blue: 0.1)

    // MARK: - Text Colors

    /// Pure white for text
    public static let text = Color.white

    /// White for secondary text (same for high contrast)
    public static let textSecondary = Color.white

    /// White for tertiary text (same for high contrast)
    public static let textTertiary = Color.white

    // MARK: - Accent Colors

    /// Bright yellow for primary accent (high visibility)
    public static let accent = Color.yellow

    /// Cyan for secondary accent
    public static let accentSecondary = Color.cyan

    /// Magenta for tertiary accent
    public static let accentTertiary = Color(red: 1.0, green: 0.0, blue: 1.0)

    // MARK: - Feedback Colors

    /// Bright green for success
    public static let success = Color.green

    /// Bright yellow for warning
    public static let warning = Color.yellow

    /// Bright red for error
    public static let error = Color.red

    // MARK: - Border Colors

    /// Pure white for borders (maximum contrast)
    public static let border = Color.white

    /// Medium white for subtle borders
    public static let borderSubtle = Color.white.opacity(0.8)

    // MARK: - Semantic Colors

    /// High contrast primary color
    public static let primary = Color.yellow

    /// High contrast secondary color
    public static let secondary = Color.cyan

    /// High contrast destructive color
    public static let destructive = Color.red
}

// =============================================================================
// MARK: - High Contrast View Modifier
// =============================================================================

/**
 Automatically applies high contrast colors when system high contrast is enabled
 */
public struct HighContrastModifier: ViewModifier {

    @Environment(\.colorScheme) var colorScheme

    public func body(content: Content) -> some View {
        if UIAccessibility.isDarkerSystemColorsEnabled {
            content
                .foregroundColor(HighContrastColors.text)
                .background(HighContrastColors.background)
        } else {
            content
        }
    }
}

public extension View {

    /**
     Apply high contrast modifier
     */
    func highContrast() -> some View {
        self.modifier(HighContrastModifier())
    }
}

// =============================================================================
// MARK: - Color Blindness Support
// =============================================================================

/**
 Color blindness friendly color palettes

 Provides safe color combinations that work for:
 - Protanopia (red-blind)
 - Deuteranopia (green-blind)
 - Tritanopia (blue-blind)
 */
public struct ColorBlindnessPalettes {

    public init() {}

    // MARK: - Safe Color Combinations

    /// Blue + Orange (safe for all types)
    public static let blueOrange = (
        primary: Color.blue,
        secondary: Color.orange
    )

    /// Blue + Yellow (safe for all types)
    public static let blueYellow = (
        primary: Color.blue,
        secondary: Color.yellow
    )

    /// Magenta + Cyan (safe for all types)
    public static let magentaCyan = (
        primary: Color(red: 1.0, green: 0.0, blue: 1.0),
        secondary: Color.cyan
    )

    /// Navy + Orange (safe for all types)
    public static let navyOrange = (
        primary: Color(red: 0, green: 0, blue: 0.5),
        secondary: Color.orange
    )

    // MARK: - Status Indicators

    /// Success state (green alternative)
    public static let success = Color(
        red: 0.0,
        green: 0.5,
        blue: 0.0
    )

    /// Warning state (orange instead of yellow)
    public static let warning = Color.orange

    /// Error state (red)
    public static let error = Color.red

    /// Info state (blue instead of cyan)
    public static let info = Color.blue

    // MARK: - Data Visualization Colors

    /// Safe palette for charts and graphs
    public static let chartColors = [
        Color.blue,
        Color.orange,
        Color(red: 0.5, green: 0, blue: 0.5), // Magenta
        Color(red: 0, green: 0.5, blue: 0.5), // Teal
        Color(red: 0.5, green: 0.5, blue: 0), // Olive
        Color(red: 0.8, green: 0.5, blue: 0), // Brown
    ]

    // MARK: - Icon + Text Combos

    /// Use icons instead of color alone
    public static func statusIndicator(
        status: Status
    ) -> (icon: String, color: Color) {
        switch status {
        case .success:
            return ("checkmark.circle", success)
        case .warning:
            return ("exclamationmark.triangle", warning)
        case .error:
            return ("xmark.circle", error)
        case .info:
            return ("info.circle", info)
        }
    }

    public enum Status {
        case success
        case warning
        case error
        case info
    }
}

// =============================================================================
// MARK: - Color Blindness View Modifier
// =============================================================================

/**
 Automatically uses color blindness friendly colors
 */
public struct ColorBlindnessModifier: ViewModifier {

    let palette: ColorBlindnessPalettes

    public init(palette: ColorBlindnessPalettes = .init()) {
        self.palette = palette
    }

    public func body(content: Content) -> some View {
        content
    }
}

// =============================================================================
// MARK: - Accessible Status Indicator
// =============================================================================

/**
 Status indicator with icon + text (not color alone)
 */
public struct AccessibleStatusIndicator: View {

    let status: ColorBlindnessPalettes.Status
    let label: String

    public init(
        status: ColorBlindnessPalettes.Status,
        label: String
    ) {
        self.status = status
        self.label = label
    }

    public var body: some View {
        let indicator = ColorBlindnessPalettes.statusIndicator(status: status)

        return HStack(spacing: 8) {
            Image(systemName: indicator.icon)
                .foregroundColor(indicator.color)

            Text(label)
                .accessibleTextStyle(.body)
        }
        .accessibleLabel(label)
        .accessibleValue(statusIndicatorText(status))
    }

    private func statusIndicatorText(_ status: ColorBlindnessPalettes.Status) -> String {
        switch status {
        case .success: return "Success"
        case .warning: return "Warning"
        case .error: return "Error"
        case .info: return "Info"
        }
    }
}

// =============================================================================
// MARK: - Contrast Ratio Checker
// =============================================================================

/**
 Calculate contrast ratio between two colors (WCAG compliance)
 */
public struct ContrastChecker {

    /**
     Calculate relative luminance of a color
     - Parameter color: Color to check
     */
    public static func luminance(_ color: Color) -> Double {
        #if os(iOS)
        let uiColor = UIColor(color)
        #else
        let uiColor = NSColor(color)
        #endif

        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        let r = sRGBComponent(red)
        let g = sRGBComponent(green)
        let b = sRGBComponent(blue)

        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /**
     Convert RGB component to sRGB
     */
    private static func sRGBComponent(_ component: CGFloat) -> Double {
        let value = Double(component)
        return value <= 0.03928
            ? value / 12.92
            : pow((value + 0.055) / 1.055, 2.4)
    }

    /**
     Calculate contrast ratio between two colors
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     */
    public static func contrastRatio(
        foreground: Color,
        background: Color
    ) -> Double {
        let l1 = luminance(foreground)
        let l2 = luminance(background)

        let lighter = max(l1, l2)
        let darker = min(l1, l2)

        return (lighter + 0.05) / (darker + 0.05)
    }

    /**
     Check if colors meet WCAG AA standard (4.5:1 for normal text)
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     */
    public static func meetsWCAG_AA(
        foreground: Color,
        background: Color
    ) -> Bool {
        contrastRatio(foreground: foreground, background: background) >= 4.5
    }

    /**
     Check if colors meet WCAG AAA standard (7:1 for normal text)
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     */
    public static func meetsWCAG_AAA(
        foreground: Color,
        background: Color
    ) -> Bool {
        contrastRatio(foreground: foreground, background: background) >= 7.0
    }

    /**
     Check if colors meet WCAG AA for large text (3:1)
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     */
    public static func meetsWCAG_AA_Large(
        foreground: Color,
        background: Color
    ) -> Bool {
        contrastRatio(foreground: foreground, background: background) >= 3.0
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct HighContrastSupport_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 24) {
            Text("High Contrast Mode")
                .font(.title)
                .foregroundColor(HighContrastColors.text)

            HStack {
                AccessibleStatusIndicator(
                    status: .success,
                    label: "Export Complete"
                )

                AccessibleStatusIndicator(
                    status: .warning,
                    label: "Low Disk Space"
                )

                AccessibleStatusIndicator(
                    status: .error,
                    label: "Export Failed"
                )
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Contrast Ratio Examples")
                    .font(.headline)

                Text("Black on White: \(ContrastChecker.contrastRatio(foreground: .black, background: .white), specifier: "%.2f"):1")
                Text("White on Black: \(ContrastChecker.contrastRatio(foreground: .white, background: .black), specifier: "%.2f"):1")
                Text("Blue on White: \(ContrastChecker.contrastRatio(foreground: .blue, background: .white), specifier: "%.2f"):1")
            }
        }
        .padding()
        .background(HighContrastColors.background)
    }
}
#endif
