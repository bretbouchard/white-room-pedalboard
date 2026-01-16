//
//  Theme.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Theme Environment
// =============================================================================

/**
 Universal theming system for White Room DSP UI

 Supports runtime theme switching with platform adaptations and accessibility support.
 */
public class Theme: ObservableObject {

    // MARK: - Published Properties

    @Published public var currentTheme: ThemeDefinition

    // MARK: - Singleton

    public static let shared = Theme()

    // MARK: - Initialization

    public init(theme: ThemeDefinition = .pro) {
        self.currentTheme = theme
    }

    // MARK: - Theme Switching

    /**
     Switch to a different theme
     - Parameter theme: Theme to switch to
     */
    public func switchTheme(_ theme: ThemeDefinition) {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentTheme = theme
        }
    }

    /**
     Create a custom theme
     - Parameters:
       - name: Theme name
       - colors: Custom color palette
       - fonts: Custom font scaling
       - spacing: Custom spacing multiplier
     */
    public func createCustomTheme(
        name: String,
        colors: ColorPalette,
        fonts: FontScaling = .medium,
        spacing: SpacingScaling = .medium
    ) -> ThemeDefinition {
        return ThemeDefinition(
            name: name,
            palette: colors,
            fontScaling: fonts,
            spacingScaling: spacing
        )
    }

    // MARK: - High Contrast Support

    /**
     Check if high contrast mode should be used
     */
    public var useHighContrast: Bool {
        currentTheme.isHighContrast
    }

    /**
     Enable/disable high contrast mode
     */
    public func setHighContrast(_ enabled: Bool) {
        if enabled {
            switchTheme(.highContrast)
        } else if currentTheme.isHighContrast {
            switchTheme(.pro)
        }
    }
}

// =============================================================================
// MARK: - Theme Definition
// =============================================================================

/**
 Complete theme definition with colors, fonts, and spacing
 */
public struct ThemeDefinition: Equatable {

    // MARK: - Properties

    public let name: String
    public let palette: ColorPalette
    public let fontScaling: FontScaling
    public let spacingScaling: SpacingScaling

    public var isHighContrast: Bool {
        name == "High Contrast"
    }

    // MARK: - Initialization

    public init(
        name: String,
        palette: ColorPalette,
        fontScaling: FontScaling = .medium,
        spacingScaling: SpacingScaling = .medium
    ) {
        self.name = name
        self.palette = palette
        self.fontScaling = fontScaling
        self.spacingScaling = spacingScaling
    }

    // MARK: - Computed Properties

    /**
     Font multiplier based on scaling
     */
    public var fontMultiplier: CGFloat {
        fontScaling.multiplier
    }

    /**
     Spacing multiplier based on scaling
     */
    public var spacingMultiplier: CGFloat {
        spacingScaling.multiplier
    }

    // MARK: - Equatable

    public static func == (lhs: ThemeDefinition, rhs: ThemeDefinition) -> Bool {
        lhs.name == rhs.name &&
        lhs.fontScaling == rhs.fontScaling &&
        lhs.spacingScaling == rhs.spacingScaling
    }
}

// =============================================================================
// MARK: - Built-in Themes
// =============================================================================

public extension ThemeDefinition {

    /**
     Pro theme - Professional studio aesthetic
     Dark, high contrast, precise controls
     */
    static var pro: ThemeDefinition {
        ThemeDefinition(
            name: "Pro",
            palette: ColorPalette(
                background: .init(
                    primary: Color(red: 0.11, green: 0.11, blue: 0.12),
                    secondary: Color(red: 0.16, green: 0.16, blue: 0.18),
                    tertiary: Color(red: 0.22, green: 0.22, blue: 0.24)
                ),
                text: .init(
                    primary: .white,
                    secondary: Color.white.opacity(0.7),
                    tertiary: Color.white.opacity(0.5)
                ),
                accent: .init(
                    primary: Color.blue,
                    secondary: Color.purple,
                    tertiary: Color.cyan
                ),
                feedback: .init(
                    success: .green,
                    warning: .orange,
                    error: .red
                ),
                borders: .init(
                    subtle: Color.white.opacity(0.1),
                    medium: Color.white.opacity(0.2),
                    strong: Color.white.opacity(0.3)
                )
            ),
            fontScaling: .medium,
            spacingScaling: .medium
        )
    }

    /**
     Studio theme - Classic console aesthetic
     Warm, vintage, hardware-inspired
     */
    static var studio: ThemeDefinition {
        ThemeDefinition(
            name: "Studio",
            palette: ColorPalette(
                background: .init(
                    primary: Color(red: 0.18, green: 0.15, blue: 0.12),
                    secondary: Color(red: 0.22, green: 0.18, blue: 0.15),
                    tertiary: Color(red: 0.26, green: 0.22, blue: 0.18)
                ),
                text: .init(
                    primary: Color(white: 0.95),
                    secondary: Color(white: 0.75),
                    tertiary: Color(white: 0.55)
                ),
                accent: .init(
                    primary: Color.orange,
                    secondary: Color.yellow,
                    tertiary: Color.amber
                ),
                feedback: .init(
                    success: .green,
                    warning: .orange,
                    error: .red
                ),
                borders: .init(
                    subtle: Color.white.opacity(0.08),
                    medium: Color.white.opacity(0.15),
                    strong: Color.white.opacity(0.25)
                )
            ),
            fontScaling: .medium,
            spacingScaling: .large
        )
    }

    /**
     Live theme - Performance optimized
     High contrast, large targets, clear indicators
     */
    static var live: ThemeDefinition {
        ThemeDefinition(
            name: "Live",
            palette: ColorPalette(
                background: .init(
                    primary: Color.black,
                    secondary: Color(red: 0.08, green: 0.08, blue: 0.08),
                    tertiary: Color(red: 0.12, green: 0.12, blue: 0.12)
                ),
                text: .init(
                    primary: .white,
                    secondary: Color.white.opacity(0.8),
                    tertiary: Color.white.opacity(0.6)
                ),
                accent: .init(
                    primary: Color.green,
                    secondary: Color.cyan,
                    tertiary: Color.lime
                ),
                feedback: .init(
                    success: .green,
                    warning: .yellow,
                    error: .red
                ),
                borders: .init(
                    subtle: Color.white.opacity(0.15),
                    medium: Color.white.opacity(0.3),
                    strong: Color.white.opacity(0.5)
                )
            ),
            fontScaling: .large,
            spacingScaling: .large
        )
    }

    /**
     High Contrast theme - Accessibility focused
     Maximum contrast, clear boundaries
     */
    static var highContrast: ThemeDefinition {
        ThemeDefinition(
            name: "High Contrast",
            palette: ColorPalette(
                background: .init(
                    primary: .black,
                    secondary: Color(red: 0.05, green: 0.05, blue: 0.05),
                    tertiary: Color(red: 0.1, green: 0.1, blue: 0.1)
                ),
                text: .init(
                    primary: .white,
                    secondary: .white,
                    tertiary: .white
                ),
                accent: .init(
                    primary: .yellow,
                    secondary: .cyan,
                    tertiary: .magenta
                ),
                feedback: .init(
                    success: .green,
                    warning: .yellow,
                    error: .red
                ),
                borders: .init(
                    subtle: .white,
                    medium: .white,
                    strong: .white
                )
            ),
            fontScaling: .large,
            spacingScaling: .large
        )
    }

    /**
     Light theme - Alternative aesthetic
     Clean, bright, modern
     */
    static var light: ThemeDefinition {
        ThemeDefinition(
            name: "Light",
            palette: ColorPalette(
                background: .init(
                    primary: .white,
                    secondary: Color(red: 0.95, green: 0.95, blue: 0.97),
                    tertiary: Color(red: 0.90, green: 0.90, blue: 0.92)
                ),
                text: .init(
                    primary: .black,
                    secondary: Color.black.opacity(0.7),
                    tertiary: Color.black.opacity(0.5)
                ),
                accent: .init(
                    primary: .blue,
                    secondary: .purple,
                    tertiary: .cyan
                ),
                feedback: .init(
                    success: .green,
                    warning: .orange,
                    error: .red
                ),
                borders: .init(
                    subtle: Color.black.opacity(0.1),
                    medium: Color.black.opacity(0.2),
                    strong: Color.black.opacity(0.3)
                )
            ),
            fontScaling: .medium,
            spacingScaling: .medium
        )
    }
}

// =============================================================================
// MARK: - Color Palette
// =============================================================================

/**
 Complete color palette for a theme
 */
public struct ColorPalette: Equatable {

    public struct BackgroundColors: Equatable {
        public let primary: Color
        public let secondary: Color
        public let tertiary: Color

        public init(primary: Color, secondary: Color, tertiary: Color) {
            self.primary = primary
            self.secondary = secondary
            self.tertiary = tertiary
        }
    }

    public struct TextColors: Equatable {
        public let primary: Color
        public let secondary: Color
        public let tertiary: Color

        public init(primary: Color, secondary: Color, tertiary: Color) {
            self.primary = primary
            self.secondary = secondary
            self.tertiary = tertiary
        }
    }

    public struct AccentColors: Equatable {
        public let primary: Color
        public let secondary: Color
        public let tertiary: Color

        public init(primary: Color, secondary: Color, tertiary: Color) {
            self.primary = primary
            self.secondary = secondary
            self.tertiary = tertiary
        }
    }

    public struct FeedbackColors: Equatable {
        public let success: Color
        public let warning: Color
        public let error: Color

        public init(success: Color, warning: Color, error: Color) {
            self.success = success
            self.warning = warning
            self.error = error
        }
    }

    public struct BorderColors: Equatable {
        public let subtle: Color
        public let medium: Color
        public let strong: Color

        public init(subtle: Color, medium: Color, strong: Color) {
            self.subtle = subtle
            self.medium = medium
            self.strong = strong
        }
    }

    public let background: BackgroundColors
    public let text: TextColors
    public let accent: AccentColors
    public let feedback: FeedbackColors
    public let borders: BorderColors

    public init(
        background: BackgroundColors,
        text: TextColors,
        accent: AccentColors,
        feedback: FeedbackColors,
        borders: BorderColors
    ) {
        self.background = background
        self.text = text
        self.accent = accent
        self.feedback = feedback
        self.borders = borders
    }
}

// =============================================================================
// MARK: - Font Scaling
// =============================================================================

/**
 Font scaling options for accessibility
 */
public enum FontScaling: Equatable {
    case small
    case medium
    case large
    case xLarge
    case xxLarge

    public var multiplier: CGFloat {
        switch self {
        case .small: return 0.85
        case .medium: return 1.0
        case .large: return 1.15
        case .xLarge: return 1.3
        case .xxLarge: return 1.5
        }
    }
}

// =============================================================================
// MARK: - Spacing Scaling
// =============================================================================

/**
 Spacing scaling options for accessibility
 */
public enum SpacingScaling: Equatable {
    case small
    case medium
    case large
    case xLarge

    public var multiplier: CGFloat {
        switch self {
        case .small: return 0.85
        case .medium: return 1.0
        case .large: return 1.2
        case .xLarge: return 1.4
        }
    }
}

// =============================================================================
// MARK: - Theme Environment Key
// =============================================================================

private struct ThemeEnvironmentKey: EnvironmentKey {
    static let defaultValue: ThemeDefinition = .pro
}

public extension EnvironmentValues {

    /**
     Current theme
     */
    var theme: ThemeDefinition {
        get { self[ThemeEnvironmentKey.self] }
        set { self[ThemeEnvironmentKey.self] = newValue }
    }
}

// =============================================================================
// MARK: - Theme View Modifier
// =============================================================================

public extension View {

    /**
     Apply theme to view hierarchy
     - Parameter theme: Theme to apply
     */
    func themed(_ theme: ThemeDefinition) -> some View {
        self.environment(\.theme, theme)
    }

    /**
     Observe shared theme
     */
    func observeTheme() -> some View {
        self.onReceive(Theme.shared.$currentTheme) { theme in
            // Theme updates will propagate through environment
        }
    }
}

// =============================================================================
// MARK: - Theme Preview Helper
// =============================================================================

#if DEBUG
public extension ThemeDefinition {

    /**
     All built-in themes for preview
     */
    static let allThemes: [ThemeDefinition] = [
        .pro, .studio, .live, .highContrast, .light
    ]

    /**
     Theme preview grid
     */
    struct ThemePreviewGrid: View {
        public init() {}

        public var body: some View {
            ScrollView {
                VStack(spacing: 32) {
                    ForEach(ThemeDefinition.allThemes, id: \.name) { theme in
                        ThemePreviewCard(theme: theme)
                    }
                }
                .padding()
            }
            .background(Color.black)
        }
    }

    /**
     Theme preview card
     */
    struct ThemePreviewCard: View {
        let theme: ThemeDefinition

        public var body: some View {
            VStack(alignment: .leading, spacing: 16) {
                Text(theme.name)
                    .font(.headline)
                    .foregroundColor(theme.palette.text.primary)

                HStack(spacing: 12) {
                    ThemeColorSwatch(
                        color: theme.palette.background.primary,
                        name: "BG Primary"
                    )
                    ThemeColorSwatch(
                        color: theme.palette.background.secondary,
                        name: "BG Secondary"
                    )
                    ThemeColorSwatch(
                        color: theme.palette.accent.primary,
                        name: "Accent"
                    )
                    ThemeColorSwatch(
                        color: theme.palette.feedback.success,
                        name: "Success"
                    )
                    ThemeColorSwatch(
                        color: theme.palette.feedback.error,
                        name: "Error"
                    )
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Sample Text")
                        .font(.body)
                        .foregroundColor(theme.palette.text.primary)

                    Text("Secondary text")
                        .font(.subheadline)
                        .foregroundColor(theme.palette.text.secondary)

                    Text("Tertiary text")
                        .font(.caption)
                        .foregroundColor(theme.palette.text.tertiary)
                }
            }
            .padding()
            .background(theme.palette.background.primary)
            .cornerRadius(12)
        }
    }

    /**
     Color swatch for preview
     */
    struct ThemeColorSwatch: View {
        let color: Color
        let name: String

        public var body: some View {
            VStack(spacing: 4) {
                Rectangle()
                    .fill(color)
                    .frame(width: 44, height: 44)
                    .cornerRadius(8)

                Text(name)
                    .font(.caption2)
                    .foregroundColor(.white)
            }
        }
    }
}
#endif
