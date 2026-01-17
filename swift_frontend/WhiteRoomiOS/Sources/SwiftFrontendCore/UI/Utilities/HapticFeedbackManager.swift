//
//  HapticFeedbackManager.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import UIKit
import Foundation
import SwiftUI

// =============================================================================
// MARK: - Haptic Feedback Manager
// =============================================================================

/**
 Centralized haptic feedback manager for iOS touch interactions.

 Provides consistent haptic feedback across the app with different
 intensity levels and feedback types.
 */
public class HapticFeedbackManager {

    // MARK: - Singleton

    public static let shared = HapticFeedbackManager()

    // MARK: - Generators

    private let impactLight: UIImpactFeedbackGenerator
    private let impactMedium: UIImpactFeedbackGenerator
    private let impactHeavy: UIImpactFeedbackGenerator
    private let notificationGenerator: UINotificationFeedbackGenerator
    private let selectionGenerator: UISelectionFeedbackGenerator

    // MARK: - Initialization

    private init() {
        impactLight = UIImpactFeedbackGenerator(style: .light)
        impactMedium = UIImpactFeedbackGenerator(style: .medium)
        impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
        notificationGenerator = UINotificationFeedbackGenerator()
        selectionGenerator = UISelectionFeedbackGenerator()

        // Prepare generators for reduced latency
        impactLight.prepare()
        impactMedium.prepare()
        impactHeavy.prepare()
        notificationGenerator.prepare()
        selectionGenerator.prepare()
    }

    // MARK: - Impact Feedback

    /**
     Light impact feedback for subtle interactions
     */
    public func lightImpact() {
        impactLight.impactOccurred()
    }

    /**
     Medium impact feedback for standard interactions
     */
    public func mediumImpact() {
        impactMedium.impactOccurred()
    }

    /**
     Heavy impact feedback for significant interactions
     */
    public func heavyImpact() {
        impactHeavy.impactOccurred()
    }

    /**
     Custom intensity impact feedback
     - Parameter intensity: Intensity from 0.0 to 1.0
     */
    public func impact(intensity: CGFloat) {
        let generator: UIImpactFeedbackGenerator

        if intensity < 0.33 {
            generator = impactLight
        } else if intensity < 0.66 {
            generator = impactMedium
        } else {
            generator = impactHeavy
        }

        generator.impactOccurred(intensity: intensity)
    }

    // MARK: - Notification Feedback

    /**
     Success notification feedback
     */
    public func success() {
        notificationGenerator.notificationOccurred(.success)
    }

    /**
     Warning notification feedback
     */
    public func warning() {
        notificationGenerator.notificationOccurred(.warning)
    }

    /**
     Error notification feedback
     */
    public func error() {
        notificationGenerator.notificationOccurred(.error)
    }

    // MARK: - Selection Feedback

    /**
     Selection feedback for changing values
     */
    public func selection() {
        selectionGenerator.selectionChanged()
    }

    // MARK: - Patterned Feedback

    /**
     Play a custom haptic pattern
     - Parameter pattern: Array of delay (seconds) and intensity pairs
     */
    public func playPattern(_ pattern: [(delay: TimeInterval, intensity: CGFloat)]) {
        Task {
            for (delay, intensity) in pattern {
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                await MainActor.run {
                    impact(intensity: intensity)
                }
            }
        }
    }

    // MARK: - Preset Patterns

    /**
     Heartbeat pattern
     */
    public func heartbeat() {
        playPattern([
            (0.0, 0.7),
            (0.1, 0.5),
            (0.15, 0.0),
            (0.3, 0.7),
            (0.1, 0.5)
        ])
    }

    /**
     Ascending pattern
     */
    public func ascending() {
        playPattern([
            (0.0, 0.3),
            (0.1, 0.5),
            (0.1, 0.7),
            (0.1, 1.0)
        ])
    }

    /**
     Descending pattern
     */
    public func descending() {
        playPattern([
            (0.0, 1.0),
            (0.1, 0.7),
            (0.1, 0.5),
            (0.1, 0.3)
        ])
    }

    /**
     Rhythm pattern for beat matching
     */
    public func rhythm(beats: Int = 4) {
        var pattern: [(TimeInterval, CGFloat)] = []
        for i in 0..<beats {
            pattern.append((TimeInterval(i) * 0.5, i == 0 ? 1.0 : 0.7))
        }
        playPattern(pattern)
    }
}

// =============================================================================
// MARK: - SwiftUI View Modifier
// =============================================================================

public extension View {

    /**
     Add haptic feedback on tap
     - Parameter intensity: Haptic intensity (default: medium)
     */
    func hapticTap(intensity: CGFloat = 0.5) -> some View {
        self.onTapGesture {
            HapticFeedbackManager.shared.impact(intensity: intensity)
        }
    }

    /**
     Add haptic feedback on change
     - Parameter intensity: Haptic intensity (default: light)
     */
    func hapticChange(intensity: CGFloat = 0.3) -> some View {
        self.onChange(of: self.body) { _ in
            HapticFeedbackManager.shared.selection()
        }
    }
}

// =============================================================================
// MARK: - Accessibility Enhancements
// =============================================================================

/**
 Accessibility helpers for the Moving Sidewalk interface
 */
public struct AccessibilityHelpers {

    /**
     Create accessibility label for song state
     */
    public static func songStateLabel(
        name: String,
        isPlaying: Bool,
        isMuted: Bool,
        isSolo: Bool,
        tempo: Double
    ) -> String {
        var parts: [String] = []

        parts.append(name)

        if isPlaying {
            parts.append("playing")
        } else {
            parts.append("paused")
        }

        if isMuted {
            parts.append("muted")
        }

        if isSolo {
            parts.append("solo")
        }

        parts.append(String(format: "%.1fx tempo", tempo))

        return parts.joined(separator: ", ")
    }

    /**
     Create accessibility hint for transport controls
     */
    public static func transportHint(isPlaying: Bool) -> String {
        if isPlaying {
            return "Double-tap to pause playback"
        } else {
            return "Double-tap to start playback"
        }
    }

    /**
     Create accessibility value for sliders
     */
    public static func sliderValue(
        value: Double,
        min: Double,
        max: Double,
        unit: String
    ) -> String {
        let percentage = Int((value - min) / (max - min) * 100)
        return "\(percentage)% \(unit)"
    }

    /**
     Create accessibility hint for sync modes
     */
    public static func syncModeHint(mode: SyncMode) -> String {
        switch mode {
        case .independent:
            return "Songs play at their own tempo independently"
        case .locked:
            return "All songs locked to master tempo"
        case .ratio:
            return "Songs maintain tempo ratio to master"
        }
    }
}

// =============================================================================
// MARK: - VoiceOver Focus Engine
// =============================================================================

/**
 Helper for managing VoiceOver focus in complex interfaces
 */
public class VoiceOverFocusEngine {

    // MARK: - Focus Order

    /**
     Suggested focus order for song card elements
     */
    public static func songCardFocusOrder() -> [String] {
        [
            "Play/Pause",
            "Song Name",
            "Progress",
            "Tempo",
            "Volume",
            "Mute",
            "Solo",
            "Expand"
        ]
    }

    /**
     Suggested focus order for master controls
     */
    public static func masterControlsFocusOrder() -> [String] {
        [
            "Master Play/Pause",
            "Stop",
            "Loop",
            "Sync Mode",
            "Master Tempo",
            "Master Volume",
            "Add Song",
            "Save Preset"
        ]
    }

    // MARK: - Focus Management

    /**
     Announce important state changes to VoiceOver
     */
    public static func announceStateChange(_ message: String) {
        UIAccessibility.post(notification: .announcement, argument: message)
    }

    /**
     Announce screen change
     */
    public static func announceScreenChange(_ message: String) {
        UIAccessibility.post(notification: .screenChanged, argument: message)
    }

    /**
     Announce layout change
     */
    public static func announceLayoutChanged() {
        UIAccessibility.post(notification: .layoutChanged, argument: nil)
    }
}

// =============================================================================
// MARK: - Custom Accessibility Actions
// =============================================================================

public extension View {

    /**
     Add custom accessibility actions for song controls

     NOTE: SongPlayerState type was deleted in git reset. This function is commented out
     until the type is restored or a replacement is implemented.
     */
    /*
    func songAccessibilityActions(
        song: SongPlayerState,
        onTogglePlay: @escaping () -> Void,
        onToggleMute: @escaping () -> Void,
        onToggleSolo: @escaping () -> Void,
        onAdjustTempo: @escaping (Double) -> Void
    ) -> some View {
        self.accessibilityActions {
            Button(song.isPlaying ? "Pause" : "Play") {
                onTogglePlay()
            }

            Button(song.isMuted ? "Unmute" : "Mute") {
                onToggleMute()
            }

            Button(song.isSolo ? "Unsolo" : "Solo") {
                onToggleSolo()
            }

            Menu("Tempo") {
                Button("Slow (0.5x)") { onAdjustTempo(0.5) }
                Button("Normal (1.0x)") { onAdjustTempo(1.0) }
                Button("Fast (2.0x)") { onAdjustTempo(2.0) }
            }
        }
    }
    */

    /**
     Add accessibility rotor for navigation
     */
    func accessibilityRotor(
        name: String,
        items: [String],
        action: @escaping (String) -> Void
    ) -> some View {
        self.accessibilityRotorEntry(name: name) { _ in
            items.enumerated().map { index, item in
                UIAccessibilityCustomRotorItem(
                    name: item,
                    attributedName: NSAttributedString(string: item),
                    targetRange: NSRange(location: index, length: 1)
                ) { _ in
                    action(item)
                    return UIAccessibilityLocationDescriptor(
                        location: .zero,
                        carrierRange: nil
                    )
                }
            }
        }
    }
}

// =============================================================================
// MARK: - Dynamic Type Support
// =============================================================================

/**
 Dynamic type helpers for responsive text sizing
 */
public struct DynamicTypeHelpers {

    /**
     Scaled font for accessibility
     */
    public static func scaledFont(
        style: Font.TextStyle,
        maxSize: CGFloat? = nil
    ) -> Font {
        if let maxSize = maxSize {
            return Font(style)
                .size(style == .largeTitle ? 34 : style == .title ? 28 : style == .title2 ? 22 : style == .title3 ? 20 : style == .headline ? 17 : style == .body ? 17 : style == .callout ? 16 : style == .subheadline ? 15 : style == .footnote ? 13 : style == .caption ? 12 : style == .caption2 ? 11 : 17)
                .weighted(.regular)
        } else {
            return Font(style)
        }
    }

    /**
     Scaled spacing for accessibility
     */
    public static func scaledSpacing(_ base: CGFloat) -> CGFloat {
        let category = UIApplication.shared.preferredContentSizeCategory
        let multiplier: CGFloat

        switch category {
        case UIContentSizeCategory.extraSmall, UIContentSizeCategory.small:
            multiplier = 0.8
        case UIContentSizeCategory.medium:
            multiplier = 0.9
        case UIContentSizeCategory.large:
            multiplier = 1.0
        case UIContentSizeCategory.extraLarge, UIContentSizeCategory.extraExtraLarge:
            multiplier = 1.1
        case UIContentSizeCategory.extraExtraExtraLarge:
            multiplier = 1.2
        case UIContentSizeCategory.accessibilityMedium, UIContentSizeCategory.accessibilityLarge:
            multiplier = 1.3
        case UIContentSizeCategory.accessibilityExtraLarge, UIContentSizeCategory.accessibilityExtraExtraLarge, UIContentSizeCategory.accessibilityExtraExtraExtraLarge:
            multiplier = 1.4
        default:
            multiplier = 1.0
        }

        return base * multiplier
    }
}

// =============================================================================
// MARK: - Reduced Motion Support
// =============================================================================

public extension View {

    /**
     Conditionally apply animation based on reduced motion setting
     */
    func adaptiveAnimation(
        _ animation: Animation?,
        value: some Equatable
    ) -> some View {
        self.animation(
            UIAccessibility.isReduceMotionEnabled ? .none : animation,
            value: value
        )
    }

    /**
     Conditionally apply spring animation
     */
    func adaptiveSpring(
        response: Double = 0.3,
        dampingFraction: Double = 0.7,
        value: some Equatable
    ) -> some View {
        let animation = UIAccessibility.isReduceMotionEnabled
            ? Animation.easeInOut(duration: 0.2)
            : Animation.spring(response: response, dampingFraction: dampingFraction)

        return self.animation(animation, value: value)
    }
}
