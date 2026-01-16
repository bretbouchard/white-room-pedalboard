//
//  AccessibilityModifiers.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Accessibility Modifiers
// =============================================================================

/**
 Comprehensive accessibility modifiers for White Room UI

 Provides VoiceOver support, Dynamic Type, high contrast, keyboard navigation,
 and assistive technology support across iOS, tvOS, and macOS.
 */

public extension View {

    // MARK: - VoiceOver Labels

    /**
     Add accessibility label with context
     - Parameter label: Descriptive label for VoiceOver
     - Parameter context: Additional context (e.g., value, state)
     */
    func accessibleLabel(
        _ label: String,
        context: String? = nil
    ) -> some View {
        let fullLabel = context != nil ? "\(label), \(context!)" : label
        return self.accessibilityLabel(fullLabel)
    }

    /**
     Add accessibility value for controls
     - Parameter value: Current value to announce
     */
    func accessibleValue(_ value: String) -> some View {
        self.accessibilityValue(value)
    }

    /**
     Add accessibility hint for actions
     - Parameter hint: Action hint (e.g., "Double tap to adjust")
     */
    func accessibleHint(_ hint: String) -> some View {
        self.accessibilityHint(hint)
    }

    // MARK: - Accessibility Traits

    /**
     Make element a button
     */
    func accessibleButton() -> some View {
        self.accessibilityAddTraits(.isButton)
    }

    /**
     Make element a header
     */
    func accessibleHeader() -> some View {
        self.accessibilityAddTraits(.isHeader)
    }

    /**
     Make element a selectable element
     */
    func accessibleSelectable() -> some View {
        self.accessibilityAddTraits(.isSelected)
    }

    /**
     Make element a summary/overview
     */
    func accessibleSummary() -> some View {
        self.accessibilityAddTraits(.isSummaryElement)
    }

    /**
     Make element static text (not interactive)
     */
    func accessibleStatic() -> some View {
        self.accessibilityRemoveTraits(.isButton)
    }

    /**
     Make element an adjustable control (slider, rotary)
     */
    func accessibleAdjustable() -> some View {
        self.accessibilityAddTraits(.updatesFrequently)
    }

    // MARK: - Accessibility Actions

    /**
     Add custom accessibility action
     - Parameter name: Action name
     - Parameter handler: Action handler
     */
    func accessibleAction(
        _ name: String,
        handler: @escaping () -> Void
    ) -> some View {
        // TODO: Implement custom accessibility actions when available
        return self
    }

    /**
     Add default tap action
     */
    func accessibleTapAction(
        named: String,
        handler: @escaping () -> Void
    ) -> some View {
        // TODO: Implement tap accessibility actions when available
        return self
    }

    // MARK: - Accessibility Identification

    /**
     Add accessibility identifier for testing
     - Parameter identifier: Unique identifier
     */
    func accessibleIdentifier(_ identifier: String) -> some View {
        self.accessibilityIdentifier(identifier)
    }

    // MARK: - Accessibility Groups

    /**
     Group related elements for VoiceOver
//      - Parameter label: Group label
     */
    func accessibleGroup(label: String) -> some View {
        self
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
    }

    /**
     Group related elements but keep children accessible
     - Parameter label: Group label
     */
    func accessibleGroupMerge(label: String) -> some View {
        self
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
    }

    /**
     Ignore element for VoiceOver (decorative)
     */
    func accessibleIgnore() -> some View {
        self.accessibilityHidden(true)
    }

    /**
     Make element accessible (override parent)
     */
    func accessibleVisible() -> some View {
        self.accessibilityHidden(false)
    }

    // MARK: - Focus Management

    /**
     Make element focusable for keyboard navigation
     */
    func accessibleFocusable() -> some View {
        if #available(iOS 17.0, *) {
            return self.focusable()
        } else {
            return self
        }
    }

    /**
     Set accessibility focus order
     - Parameter order: Focus order (lower = earlier)
     */
    func accessibleFocusOrder(_ order: Int) -> some View {
        self.accessibilitySortPriority(Double(order))
    }

    // MARK: - Dynamic Type

    /**
     Enable dynamic type support
     - Parameter supportsAccessibility: Support accessibility sizes (default: true)
     */
    func accessibleDynamicType(
        supportsAccessibility: Bool = true
    ) -> some View {
        self
            .font(.body)
            .dynamicTypeSize(
                supportsAccessibility
                    ? ...DynamicTypeSize.accessibility1
                    : ...DynamicTypeSize.xxxLarge
            )
            .lineLimit(nil)
    }

    // MARK: - Semantic Colors

    /**
     Use semantic color for accessibility
     - Parameter color: Semantic color
     */
    func accessibleColor(_ color: Color) -> some View {
        self.foregroundColor(color)
    }

    // MARK: - Screen State

    /**
     Announce screen change to VoiceOver
     - Parameter message: Screen announcement
     */
    func accessibleScreenChange(_ message: String) -> some View {
        self.onAppear {
            UIAccessibility.post(notification: .screenChanged, argument: message)
        }
    }

    /**
     Announce layout change to VoiceOver
     - Parameter message: Layout announcement
     */
    func accessibleLayoutChange(_ message: String) -> some View {
        self.onAppear {
            UIAccessibility.post(notification: .layoutChanged, argument: message)
        }
    }

    /**
     Announce focused element to VoiceOver
     */
    func accessibleAnnounceFocus() -> some View {
        // TODO: Implement accessibilityActivate when available
        return self
    }

    // MARK: - Additional Accessibility Modifiers

    /**
     Accessible text style
     */
    func accessibleTextStyle(_ style: Font.TextStyle) -> some View {
        self.font(.system(style))
    }

    /**
     Accessible touch target (minimum 44x44)
     */
    func accessibleTouchTarget() -> some View {
        self.frame(minWidth: 44, minHeight: 44)
    }
}

// =============================================================================
// MARK: - Accessibility Helpers
// =============================================================================

public enum AccessibilityHelper {

    /// Check if VoiceOver is running
    public static var isVoiceOverRunning: Bool {
        UIAccessibility.isVoiceOverRunning
    }

    /// Check if high contrast is enabled
    public static var isHighContrastEnabled: Bool {
        UIAccessibility.isDarkerSystemColorsEnabled
    }

    /// Check if reduce motion is enabled
    public static var isReduceMotionEnabled: Bool {
        UIAccessibility.isReduceMotionEnabled
    }

    /// Check if guided access is enabled
    public static var isGuidedAccessEnabled: Bool {
        UIAccessibility.isGuidedAccessEnabled
    }

    /// Check if switch control is running
    public static var isSwitchControlRunning: Bool {
        UIAccessibility.isSwitchControlRunning
    }

    /**
     Announce message to VoiceOver
     - Parameter message: Message to announce
     */
    public static func announce(_ message: String) {
        UIAccessibility.post(notification: .announcement, argument: message)
    }

    /**
     Announce screen change
     - Parameter message: Screen change message
     */
    public static func announceScreenChange(_ message: String) {
        UIAccessibility.post(notification: .screenChanged, argument: message)
    }

    /**
     Announce layout change
     - Parameter message: Layout change message
     */
    public static func announceLayoutChange(_ message: String) {
        UIAccessibility.post(notification: .layoutChanged, argument: message)
    }
}
