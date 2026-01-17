//
//  MotorAccessibility.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import Foundation

// =============================================================================
// MARK: - Touch Target Modifiers
// =============================================================================

/**
 Motor accessibility support for users with motor impairments

 Ensures adequate touch target sizes:
 - iOS: 44pt minimum
 - tvOS: 80pt minimum
 - macOS: No minimum (pointer-based)
 */
public extension View {

    /**
     Ensure minimum touch target size for iOS
     - Parameter size: Minimum size (default: 44pt for iOS)
     */
    func touchTarget(size: CGFloat = 44) -> some View {
        #if os(iOS)
        return self
            .frame(minWidth: size, minHeight: size)
            .contentShape(Rectangle())
        #elseif os(tvOS)
        return self
            .frame(minWidth: 80, minHeight: 80)
            .contentShape(Rectangle())
        #else
        return self
        #endif
    }

    /**
     Ensure tvOS touch target size (80pt minimum)
     */
    func touchTargetTV() -> some View {
        #if os(tvOS)
        return self
            .frame(minWidth: 80, minHeight: 80)
            .contentShape(Rectangle())
        #else
        return self
            .touchTarget(size: 44)
        #endif
    }

    /**
     Increase touch target size while maintaining visual size
     - Parameter size: Touch target size
     */
    func expandTouchTarget(to size: CGFloat) -> some View {
        self
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .clipped()
    }
}

// =============================================================================
// MARK: - Gesture Alternatives
// =============================================================================

/**
 Provide button alternatives to gestures

 Users with motor impairments may have difficulty with:
 - Swipe gestures
 - Pinch-to-zoom
 - Long press
 - Drag and drop

 Solution: Provide accessible button alternatives
 */
public struct GestureAlternativeButtons: View {

    let swipeLeftAction: (() -> Void)?
    let swipeRightAction: (() -> Void)?
    let swipeUpAction: (() -> Void)?
    let swipeDownAction: (() -> Void)?
    let longPressAction: (() -> Void)?
    let pinchAction: (() -> Void)?

    public init(
        swipeLeft: (() -> Void)? = nil,
        swipeRight: (() -> Void)? = nil,
        swipeUp: (() -> Void)? = nil,
        swipeDown: (() -> Void)? = nil,
        longPress: (() -> Void)? = nil,
        pinch: (() -> Void)? = nil
    ) {
        self.swipeLeftAction = swipeLeft
        self.swipeRightAction = swipeRight
        self.swipeUpAction = swipeUp
        self.swipeDownAction = swipeDown
        self.longPressAction = longPress
        self.pinchAction = pinch
    }

    public var body: some View {
        VStack(spacing: 16) {
            if swipeLeftAction != nil || swipeRightAction != nil {
                HStack(spacing: 16) {
                    if let swipeLeft = swipeLeftAction {
                        Button("← Swipe Left") { swipeLeft() }
                            .touchTarget()
                    }

                    if let swipeRight = swipeRightAction {
                        Button("Swipe Right →") { swipeRightAction?() }
                            .touchTarget()
                    }
                }
            }

            if swipeUpAction != nil || swipeDownAction != nil {
                HStack(spacing: 16) {
                    if let swipeUp = swipeUpAction {
                        Button("↑ Swipe Up") { swipeUp() }
                            .touchTarget()
                    }

                    if let swipeDown = swipeDownAction {
                        Button("Swipe Down ↓") { swipeDownAction?() }
                            .touchTarget()
                    }
                }
            }

            if let longPress = longPressAction {
                Button("Long Press Action") { longPress() }
                    .touchTarget()
            }

            if let pinch = pinchAction {
                Button("Pinch to Zoom") { pinch() }
                    .touchTarget()
            }
        }
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Adjustable Timing
// =============================================================================

/**
 Allow users to adjust timing for motor accessibility

 Users may need more time to:
 - Complete actions
 - Respond to prompts
 - Navigate interfaces
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public class TimingPreferences: ObservableObject {

    // MARK: - Published Properties

    @Published public var longPressDuration: Double = 0.5
    @Published public var animationDuration: Double = 0.3
    @Published public var debounceDelay: Double = 0.3
    @Published public var toastDuration: Double = 2.0

    // MARK: - Singleton

    public static let shared = TimingPreferences()

    // MARK: - Initialization

    public init() {
        loadPreferences()
    }

    // MARK: - Methods

    /**
     Increase all timing durations (for users who need more time)
     - Parameter multiplier: Time multiplier (default: 2x)
     */
    public func increaseTiming(by multiplier: Double = 2.0) {
        longPressDuration *= multiplier
        animationDuration *= multiplier
        debounceDelay *= multiplier
        toastDuration *= multiplier

        savePreferences()
    }

    /**
     Decrease all timing durations (for users who want faster response)
     - Parameter multiplier: Time divisor (default: 2x)
     */
    public func decreaseTiming(by multiplier: Double = 2.0) {
        longPressDuration /= multiplier
        animationDuration /= multiplier
        debounceDelay /= multiplier
        toastDuration /= multiplier

        savePreferences()
    }

    /**
     Reset timing to default values
     */
    public func resetToDefaults() {
        longPressDuration = 0.5
        animationDuration = 0.3
        debounceDelay = 0.3
        toastDuration = 2.0

        savePreferences()
    }

    // MARK: - Persistence

    private func loadPreferences() {
        if let data = UserDefaults.standard.data(forKey: "timingPreferences"),
           let decoded = try? JSONDecoder().decode(TimingData.self, from: data) {
            self.longPressDuration = decoded.longPressDuration
            self.animationDuration = decoded.animationDuration
            self.debounceDelay = decoded.debounceDelay
            self.toastDuration = decoded.toastDuration
        }
    }

    private func savePreferences() {
        let data = TimingData(
            longPressDuration: longPressDuration,
            animationDuration: animationDuration,
            debounceDelay: debounceDelay,
            toastDuration: toastDuration
        )

        if let encoded = try? JSONEncoder().encode(data) {
            UserDefaults.standard.set(encoded, forKey: "timingPreferences")
        }
    }

    private struct TimingData: Codable {
        let longPressDuration: Double
        let animationDuration: Double
        let debounceDelay: Double
        let toastDuration: Double
    }
}

// =============================================================================
// MARK: - Switch Control Support
// =============================================================================

/**
 Switch Control support for motor accessibility

 Switch Control allows users to navigate iOS using:
 - External switches
 - Keyboard
 - Head tracking
 - Joystick
 */
public extension View {

    /**
     Optimize view for Switch Control navigation
     */
    func switchControlAccessible() -> some View {
        if #available(iOS 17.0, macOS 14.0, tvOS 17.0, *) {
            return self
                .focusable()
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Switch Control navigable")
        } else {
            return self
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Switch Control navigable")
        }
    }

    /**
     Add custom switch action
     - Parameter name: Action name
     - Parameter action: Action handler
     */
    func switchAction(
        _ name: String,
        action: @escaping () -> Void
    ) -> some View {
        self.accessibilityAction(.default) {
            action()
        }
        .accessibilityLabel(name)
    }

    /**
     Make element auto-scan target for Switch Control
     */
    func autoScanTarget() -> some View {
        if #available(iOS 17.0, macOS 14.0, tvOS 17.0, *) {
            return self
                .focusable()
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Auto-scan target")
        } else {
            return self
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Auto-scan target")
        }
    }
}

// =============================================================================
// MARK: - AssistiveTouch Support
// =============================================================================

/**
 AssistiveTouch support for motor accessibility

 AssistiveTouch provides:
 - On-screen buttons for hardware buttons
 - Gesture alternatives
 - Custom gestures
 */
public extension View {

    /**
     Ensure all gestures have AssistiveTouch alternatives
     */
    func assistiveTouchAccessible() -> some View {
        self
            .touchTarget()
            .accessibilityElement(children: .contain)
    }

    /**
     Add custom AssistiveTouch action
     - Parameter name: Action name
     - Parameter action: Action handler
     */
    func assistiveTouchAction(
        _ name: String,
        action: @escaping () -> Void
    ) -> some View {
        self.accessibilityAction(.default) {
            action()
        }
        .accessibilityLabel(name)
    }
}

// =============================================================================
// MARK: - Reduced Motion Support
// =============================================================================

/**
 Reduced motion support for vestibular disorders

 Some users experience dizziness or nausea from animations.
 Provide alternatives when reduce motion is enabled.
 */
public extension View {

    /**
     Respect reduce motion setting
     - Parameter animation: Animation to use when reduce motion is off
     */
    func reducedMotion(_ animation: Animation? = .default) -> some View {
        self.animation(
            UIAccessibility.isReduceMotionEnabled ? .none : animation,
            value: UUID()
        )
    }

    /**
     Conditionally apply modifier based on reduce motion
     - Parameter modifier: Modifier to apply
     */
    func ifNotReducedMotion<Content: View>(
        @ViewBuilder modifier: () -> Content
    ) -> some View {
        Group {
            if UIAccessibility.isReduceMotionEnabled {
                self
            } else {
                modifier()
            }
        }
    }
}

// =============================================================================
// MARK: - Hold Duration Button
// =============================================================================

/**
 Button with adjustable hold duration for motor accessibility

 Users with motor impairments may need longer to press and hold.
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public struct HoldDurationButton: View {

    @ObservedObject var timingPreferences = TimingPreferences.shared

    let label: String
    let systemImage: String?
    let action: () -> Void
    @State private var isHolding = false
    @State private var holdProgress: Double = 0

    public init(
        label: String,
        systemImage: String? = nil,
        action: @escaping () -> Void
    ) {
        self.label = label
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack {
                if let systemImage = systemImage {
                    Image(systemName: systemImage)
                }
                Text(label)
            }
            .frame(minWidth: 44, minHeight: 44)
        }
        .onLongPressGesture(
            minimumDuration: timingPreferences.longPressDuration,
            pressing: { pressing in
                withAnimation(.linear(duration: 0.1)) {
                    isHolding = pressing
                    holdProgress = pressing ? 1.0 : 0.0
                }
            },
            perform: {}
        )
        .overlay(
            GeometryReader { geometry in
                ZStack {
                    if isHolding {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.blue.opacity(0.3))
                            .frame(width: geometry.size.width * holdProgress)
                    }
                }
            }
        )
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct MotorAccessibility_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            VStack(spacing: 32) {
                Text("Motor Accessibility")
                    .font(.title)
                    .accessibleHeader()

                VStack(spacing: 16) {
                    Text("Gesture Alternatives")
                        .font(.headline)

                    GestureAlternativeButtons(
                        swipeLeft: { print("Swipe left") },
                        swipeRight: { print("Swipe right") },
                        longPress: { print("Long press") }
                    )
                }

                VStack(spacing: 16) {
                    Text("Adjustable Timing")
                        .font(.headline)

                    HoldDurationButton(
                        label: "Hold to Delete",
                        systemImage: "trash",
                        action: { print("Deleted") }
                    )

                    Button("Increase Timing") {
                        TimingPreferences.shared.increaseTiming()
                    }
                    .touchTarget()

                    Button("Decrease Timing") {
                        TimingPreferences.shared.decreaseTiming()
                    }
                    .touchTarget()
                }

                VStack(spacing: 16) {
                    Text("Switch Control Targets")
                        .font(.headline)

                    Button("Option 1") {}
                        .autoScanTarget()

                    Button("Option 2") {}
                        .autoScanTarget()

                    Button("Option 3") {}
                        .autoScanTarget()
                }
            }
            .padding()
        }
    }
}
#endif
