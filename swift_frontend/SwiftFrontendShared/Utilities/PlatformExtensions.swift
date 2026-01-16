//
//  PlatformExtensions.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Platform Detection
// =============================================================================

/**
 Platform detection utilities
 */
public enum PlatformDetector {

    /// Current platform
    public static var current: PlatformType {
        #if os(tvOS)
        return .tvOS
        #elseif os(macOS)
        return .macOS
        #else
        return .iOS
        #endif
    }

    /// Whether current platform is iOS
    public static var isiOS: Bool {
        current == .iOS
    }

    /// Whether current platform is macOS
    public static var ismacOS: Bool {
        current == .macOS
    }

    /// Whether current platform is tvOS
    public static var istvOS: Bool {
        current == .tvOS
    }
}

/**
 Platform type enum
 */
public enum PlatformType {
    case iOS
    case macOS
    case tvOS
}

// =============================================================================
// MARK: - View Platform Extensions
// =============================================================================

public extension View {

    /**
     Apply modifier only on specific platform
     - Parameter platform: Platform to apply on
     - Parameter transform: Transform to apply
     */
    @ViewBuilder
    func platform<Content: View>(
        _ platform: PlatformType,
        transform: (Self) -> Content
    ) -> some View {
        if PlatformDetector.current == platform {
            transform(self)
        } else {
            self
        }
    }

    /**
     Apply modifier only on iOS
     - Parameter transform: Transform to apply
     */
    @ViewBuilder
    func iOS<Content: View>(
        _ transform: (Self) -> Content
    ) -> some View {
        if PlatformDetector.isiOS {
            transform(self)
        } else {
            self
        }
    }

    /**
     Apply modifier only on macOS
     - Parameter transform: Transform to apply
     */
    @ViewBuilder
    func macOS<Content: View>(
        _ transform: (Self) -> Content
    ) -> some View {
        PlatformDetector.ismacOS ? transform(self) : self
    }

    /**
     Apply modifier only on tvOS
     - Parameter transform: Transform to apply
     */
    @ViewBuilder
    func tvOS<Content: View>(
        _ transform: (Self) -> Content
    ) -> some View {
        PlatformDetector.istvOS ? transform(self) : self
    }
}

// =============================================================================
// MARK: - Environment Extensions
// =============================================================================

public extension EnvironmentValues {

    /**
     Current platform type
     */
    var platform: PlatformType {
        #if os(tvOS)
        return .tvOS
        #elseif os(macOS)
        return .macOS
        #else
        return .iOS
        #endif
    }

    /**
     Whether device is in compact size class
     */
    var isCompactWidth: Bool {
        horizontalSizeClass == .compact
    }

    /**
     Whether device is in regular size class
     */
    var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }
}

// =============================================================================
// MARK: - Size Class Extensions
// =============================================================================

public extension View {

    /**
     Check if horizontal size class is compact
     */
    var isCompactWidth: Bool {
        #if os(tvOS)
        return false  // tvOS is always regular
        #elseif os(macOS)
        return false  // macOS is always regular
        #else
        return Environment(\.horizontalSizeClass).wrappedValue == .compact
        #endif
    }

    /**
     Check if horizontal size class is regular
     */
    var isRegularWidth: Bool {
        !isCompactWidth
    }
}

// =============================================================================
// MARK: - Focus Management (tvOS)
// =============================================================================

public extension View {

    /**
     Apply focusable style for tvOS

     On tvOS, makes view focusable with visual feedback
     On other platforms, no-op
     */
    @ViewBuilder
    func tvFocusable() -> some View {
        #if os(tvOS)
        self.focusable()
        #else
        self
        #endif
    }

    /**
     Apply default focus for tvOS

     On tvOS, sets this view as default focus
     On other platforms, no-op
     */
    @ViewBuilder
    func tvDefaultFocus() -> some View {
        #if os(tvOS)
        self.prefersDefaultFocus(true)
        #else
        self
        #endif
    }
}

// =============================================================================
// MARK: - Hover Effects (macOS)
// =============================================================================

public extension View {

    /**
     Apply hover effect for macOS

     On macOS, shows cursor change and optional visual effect
     On other platforms, no-op
     */
    @ViewBuilder
    func macOSHover(
        isEnabled: Bool = true,
        effect: HoverEffect = .highlight
    ) -> some View {
        #if os(macOS)
        self.hoverEffect(isEnabled ? effect : .automatic)
        #else
        self
        #endif
    }
}

// =============================================================================
// MARK: - Haptic Feedback (iOS)
// =============================================================================

public extension View {

    /**
     Trigger haptic feedback on iOS

     On iOS, provides haptic feedback
     On other platforms, no-op
     - Parameter style: Haptic style to trigger
     */
    @ViewBuilder
    func hapticFeedback(_ style: HapticStyle = .medium) -> some View {
        self.onAppear {
            #if os(iOS)
            let generator: UINotificationFeedbackGenerator

            switch style {
            case .light:
                generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)
            case .medium:
                generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.warning)
            case .heavy:
                generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.error)
            case .success:
                let gen = UINotificationFeedbackGenerator()
                gen.notificationOccurred(.success)
            case .warning:
                let gen = UINotificationFeedbackGenerator()
                gen.notificationOccurred(.warning)
            case .error:
                let gen = UINotificationFeedbackGenerator()
                gen.notificationOccurred(.error)
            }
            #endif
        }
    }
}

/**
 Haptic feedback styles
 */
public enum HapticStyle {
    case light
    case medium
    case heavy
    case success
    case warning
    case error
}

// =============================================================================
// MARK: - Keyboard Shortcuts (macOS)
// =============================================================================

public extension View {

    /**
     Apply keyboard shortcut for macOS

     On macOS, adds keyboard shortcut
     On other platforms, no-op
     */
    @ViewBuilder
    func macOSKeyboardShortcut(
        _ key: KeyEquivalent,
        modifiers: EventModifiers = .command
    ) -> some View {
        #if os(macOS)
        self.keyboardShortcut(key, modifiers: modifiers)
        #else
        self
        #endif
    }
}

// =============================================================================
// MARK: - Gesture Adaptations
// =============================================================================

public extension View {

    /**
     Platform-appropriate tap gesture

     - iOS: Tap gesture
     - macOS: Click gesture (via onTapGesture)
     - tvOS: Select button press
     */
    @ViewBuilder
    func platformTapGesture(perform action: @escaping () -> Void) -> some View {
        #if os(tvOS)
        self.onTapGesture {
            // On tvOS, tap is select button
            action()
        }
        #else
        self.onTapGesture {
            action()
        }
        #endif
    }

    /**
     Platform-appropriate long press gesture

     - iOS: Long press gesture with haptic feedback
     - macOS: Right-click (context menu)
     - tvOS: Long press on select button
     */
    @ViewBuilder
    func platformLongPressGesture(
        minimumDuration: Double = 0.5,
        perform action: @escaping () -> Void
    ) -> some View {
        #if os(tvOS)
        self.onLongPressGesture(minimumDuration: minimumDuration) {
            action()
        }
        #elseif os(iOS)
        self.onLongPressGesture(minimumDuration: minimumDuration) {
            #if os(iOS)
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            #endif
            action()
        }
        #else
        // macOS - use context menu
        self.contextMenu {
            Button(action: action) {
                Text("More Options")
            }
        }
        #endif
    }
}

// =============================================================================
// MARK: - Cursor Adjustment (macOS)
// =============================================================================

public extension View {

    /**
     Set cursor shape on macOS

     On macOS, changes cursor when hovering
     On other platforms, no-op
     - Parameter cursor: Cursor shape
     */
    @ViewBuilder
    func macCursors(_ cursor: macCursors) -> some View {
        #if os(macOS)
        self.onHover { isHovering in
            if isHovering {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
        }
        #else
        self
        #endif
    }
}

/**
 Cursor shapes for macOS
 */
public enum macCursors {
    case pointingHand
    case arrow
    case IBeam
}
