//
//  ViewModifiers.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Card Modifier
// =============================================================================

/**
 Apply card styling to a view

 Adds background, corner radius, shadow, and border
 */
public struct CardModifier: ViewModifier {

    public enum CardStyle {
        case primary
        case secondary
        case elevated
        case outlined
    }

    let style: CardStyle
    let isCompact: Bool

    public init(style: CardStyle = .primary, isCompact: Bool = false) {
        self.style = style
        self.isCompact = isCompact
    }

    public func body(content: Content) -> some View {
        content
            .padding(isCompact ? Spacing.small : Spacing.medium)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
            .overlay(border)
    }

    private var backgroundColor: Color {
        switch style {
        case .primary, .elevated:
            return .secondaryBackground
        case .secondary:
            return .tertiaryBackground
        case .outlined:
            return .clear
        }
    }

    private var cornerRadius: CGFloat {
        isCompact ? Spacing.cornerRadiusSmall : Spacing.cornerRadiusMedium
    }

    private var shadowColor: Color {
        switch style {
        case .elevated:
            return .black.opacity(0.15)
        case .primary, .secondary:
            return .black.opacity(0.08)
        case .outlined:
            return .clear
        }
    }

    private var shadowRadius: CGFloat {
        switch style {
        case .elevated:
            return Spacing.shadowLarge
        case .primary, .secondary:
            return Spacing.shadowMedium
        case .outlined:
            return 0
        }
    }

    private var shadowOffset: CGFloat {
        switch style {
        case .elevated:
            return Spacing.shadowMedium
        case .primary, .secondary:
            return Spacing.shadowSmall
        case .outlined:
            return 0
        }
    }

    @ViewBuilder
    private var border: some View {
        if style == .outlined {
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(Color.primaryBorder, lineWidth: Spacing.borderThin)
        }
    }
}

public extension View {

    /**
     Apply card styling
     - Parameters:
       - style: Card style to apply
       - isCompact: Whether to use compact sizing
     */
    func cardStyle(style: CardModifier.CardStyle = .primary, isCompact: Bool = false) -> some View {
        self.modifier(CardModifier(style: style, isCompact: isCompact))
    }
}

// =============================================================================
// MARK: - Button Modifier
// =============================================================================

/**
 Apply button styling to a view
 */
public struct ButtonModifier: ViewModifier {

    public enum ButtonStyle {
        case primary
        case secondary
        case destructive
        case success
    }

    let style: ButtonStyle
    let isCompact: Bool
    let isEnabled: Bool

    public init(style: ButtonStyle = .primary, isCompact: Bool = false, isEnabled: Bool = true) {
        self.style = style
        self.isCompact = isCompact
        self.isEnabled = isEnabled
    }

    public func body(content: Content) -> some View {
        content
            .font(isCompact ? .labelMedium : .labelLarge)
            .foregroundColor(textColor)
            .padding(.horizontal, isCompact ? Spacing.medium : Spacing.large)
            .padding(.vertical, isCompact ? Spacing.small : Spacing.medium)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
            .opacity(isEnabled ? 1.0 : 0.5)
            .disabled(!isEnabled)
    }

    private var textColor: Color {
        switch style {
        case .primary, .destructive, .success:
            return .white
        case .secondary:
            return .primaryText
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:
            return isEnabled ? .primaryAction : .secondary.opacity(0.3)
        case .secondary:
            return isEnabled ? .secondaryBackground : .tertiaryBackground
        case .destructive:
            return isEnabled ? .destructive : .secondary.opacity(0.3)
        case .success:
            return isEnabled ? .success : .secondary.opacity(0.3)
        }
    }

    private var cornerRadius: CGFloat {
        isCompact ? Spacing.cornerRadiusSmall : Spacing.cornerRadiusMedium
    }

    private var shadowColor: Color {
        isEnabled ? .black.opacity(0.1) : .clear
    }

    private var shadowRadius: CGFloat {
        isEnabled ? Spacing.shadowSmall : 0
    }

    private var shadowOffset: CGFloat {
        isEnabled ? Spacing.shadowSmall / 2 : 0
    }
}

public extension View {

    /**
     Apply button styling
     - Parameters:
       - style: Button style to apply
       - isCompact: Whether to use compact sizing
       - isEnabled: Whether button is enabled
     */
    func buttonStyle(
        _ style: ButtonModifier.ButtonStyle = .primary,
        isCompact: Bool = false,
        isEnabled: Bool = true
    ) -> some View {
        self.modifier(ButtonModifier(style: style, isCompact: isCompact, isEnabled: isEnabled))
    }
}

// =============================================================================
// MARK: - Form Field Modifier
// =============================================================================

/**
 Apply form field styling
 */
public struct FormFieldModifier: ViewModifier {

    let isFocused: Bool
    let isInvalid: Bool

    public init(isFocused: Bool = false, isInvalid: Bool = false) {
        self.isFocused = isFocused
        self.isInvalid = isInvalid
    }

    public func body(content: Content) -> some View {
        content
            .padding(.horizontal, Spacing.medium)
            .padding(.vertical, Spacing.small)
            .background(Color.secondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusSmall))
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.cornerRadiusSmall)
                    .stroke(borderColor, lineWidth: borderWidth)
            )
            .shadow(color: .black.opacity(0.05), radius: Spacing.shadowSmall, x: 0, y: Spacing.shadowSmall / 2)
    }

    private var borderColor: Color {
        if isInvalid {
            return .error
        } else if isFocused {
            return .focusBorder
        } else {
            return .primaryBorder
        }
    }

    private var borderWidth: CGFloat {
        (isFocused || isInvalid) ? Spacing.borderMedium : Spacing.borderThin
    }
}

public extension View {

    /**
     Apply form field styling
     - Parameters:
       - isFocused: Whether field is focused
       - isInvalid: Whether field has invalid input
     */
    func formFieldStyle(isFocused: Bool = false, isInvalid: Bool = false) -> some View {
        self.modifier(FormFieldModifier(isFocused: isFocused, isInvalid: isInvalid))
    }
}

// =============================================================================
// MARK: - Loading Modifier
// =============================================================================

/**
 Overlay loading indicator on a view
 */
public struct LoadingModifier: ViewModifier {

    let isLoading: Bool
    let message: String?

    public init(isLoading: Bool, message: String? = nil) {
        self.isLoading = isLoading
        self.message = message
    }

    public func body(content: Content) -> some View {
        ZStack {
            content

            if isLoading {
                overlayView
            }
        }
    }

    @ViewBuilder
    private var overlayView: some View {
        VStack(spacing: Spacing.medium) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.brand)

            if let message = message {
                Text(message)
                    .font(.bodyMedium)
                    .foregroundColor(.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.overlay)
        .transition(.opacity)
    }
}

public extension View {

    /**
     Overlay loading indicator
     - Parameters:
       - isLoading: Whether to show loading indicator
       - message: Optional message to display
     */
    func loading(isLoading: Bool, message: String? = nil) -> some View {
        self.modifier(LoadingModifier(isLoading: isLoading, message: message))
    }
}

// =============================================================================
// MARK: - Disabled Overlay Modifier
// =============================================================================

/**
 Apply disabled state to a view
 */
public struct DisabledOverlayModifier: ViewModifier {

    let isDisabled: Bool

    public init(isDisabled: Bool) {
        self.isDisabled = isDisabled
    }

    public func body(content: Content) -> some View {
        content
            .opacity(isDisabled ? 0.5 : 1.0)
            .disabled(isDisabled)
            .overlay(
                Group {
                    if isDisabled {
                        Color.black.opacity(0.1)
                            .allowsHitTesting(false)
                    }
                }
            )
    }
}

public extension View {

    /**
     Apply disabled overlay
     - Parameter isDisabled: Whether view is disabled
     */
    func disabledOverlay(isDisabled: Bool) -> some View {
        self.modifier(DisabledOverlayModifier(isDisabled: isDisabled))
    }
}

// =============================================================================
// MARK: - Shake Modifier
// ===============================================================================

/**
 Apply shake animation (for error feedback)
 */
public struct ShakeModifier: ViewModifier {

    @State private var offset: CGFloat = 0

    let trigger: Bool

    public init(trigger: Bool) {
        self.trigger = trigger
    }

    public func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .onChange(of: trigger) { _ in
                withAnimation(.easeInOut(duration: 0.1).repeatCount(3)) {
                    offset = 10
                }
                withAnimation(.easeInOut(duration: 0.1).delay(0.3)) {
                    offset = 0
                }
            }
    }
}

public extension View {

    /**
     Apply shake animation
     - Parameter trigger: Trigger shake when this value changes
     */
    func shake(trigger: Bool) -> some View {
        self.modifier(ShakeModifier(trigger: trigger))
    }
}

// =============================================================================
// MARK: - Pulse Modifier
// =============================================================================

/**
 Apply pulse animation (for attention)
 */
public struct PulseModifier: ViewModifier {

    @State private var isPulsing = false

    let isActive: Bool

    public init(isActive: Bool = true) {
        self.isActive = isActive
    }

    public func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.05 : 1.0)
            .opacity(isPulsing ? 0.8 : 1.0)
            .onAppear {
                guard isActive else { return }
                withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
    }
}

public extension View {

    /**
     Apply pulse animation
     - Parameter isActive: Whether pulse is active
     */
    func pulse(isActive: Bool = true) -> some View {
        self.modifier(PulseModifier(isActive: isActive))
    }
}
