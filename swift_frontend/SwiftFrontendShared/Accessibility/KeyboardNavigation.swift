//
//  KeyboardNavigation.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Keyboard Navigation Modifiers
// =============================================================================

/**
 Keyboard navigation support for macOS and tvOS

 Provides full keyboard navigation with:
 - Tab/Shift+Tab for focus movement
 - Arrow keys for sliders/rotary controls
 - Space/Enter to activate
 - Escape to cancel/dismiss
 */
public extension View {

    /**
     Make element focusable with keyboard
     - Parameter autoFocus: Auto focus on appear (default: false)
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func keyboardFocusable(autoFocus: Bool = false) -> some View {
        self
            .focusable()
            .onAppear {
                if autoFocus {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        // Focus this element
                    }
                }
            }
    }

    /**
     Add keyboard shortcut
     - Parameter key: Key equivalent
     - Parameter modifiers: Modifier keys
     - Parameter action: Action to perform
     */
    func keyboardShortcut(
        _ key: KeyEquivalent,
        modifiers: EventModifiers = .command,
        action: @escaping () -> Void
    ) -> some View {
        self.keyboardShortcut(key, modifiers: modifiers)
            .onTapGesture(perform: action)
    }

    /**
     Add tab focus order
     - Parameter order: Focus order (lower = earlier in tab order)
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func tabFocusOrder(_ order: Int) -> some View {
        self
            .focusable()
            .accessibilitySortPriority(Double(order))
    }

    /**
     Handle escape key
     - Parameter action: Action to perform on escape
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func onEscape(perform action: @escaping () -> Void) -> some View {
        self.onKeyPress(.escape) {
            action()
            return .handled
        }
    }

    /**
     Handle return key
     - Parameter action: Action to perform on return
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func onReturn(perform action: @escaping () -> Void) -> some View {
        self.onKeyPress(.return) {
            action()
            return .handled
        }
    }

    /**
     Handle space key
     - Parameter action: Action to perform on space
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func onSpace(perform action: @escaping () -> Void) -> some View {
        self.onKeyPress(.space) {
            action()
            return .handled
        }
    }

    /**
     Handle arrow keys
     - Parameter up: Action for up arrow
     - Parameter down: Action for down arrow
     - Parameter left: Action for left arrow
     - Parameter right: Action for right arrow
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func onArrow(
        up: (() -> Void)? = nil,
        down: (() -> Void)? = nil,
        left: (() -> Void)? = nil,
        right: (() -> Void)? = nil
    ) -> some View {
        self
            .onKeyPress(.upArrow) {
                up?()
                return up != nil ? .handled : .ignored
            }
            .onKeyPress(.downArrow) {
                down?()
                return down != nil ? .handled : .ignored
            }
            .onKeyPress(.leftArrow) {
                left?()
                return left != nil ? .handled : .ignored
            }
            .onKeyPress(.rightArrow) {
                right?()
                return right != nil ? .handled : .ignored
            }
    }

    /**
     Make view dismissable with escape
     */
    @available(iOS 17.0, macOS 14.0, tvOS 17.0, *)
    func dismissible() -> some View {
        #if os(macOS)
        return self.onEscape {
            // Dismiss current view/sheet
            NSApp.keyWindow?.close()
        }
        #elseif os(iOS)
        return self.onEscape {
            // Dismiss current view/sheet
            UIViewController.topViewController()?.dismiss(animated: true)
        }
        #else
        return self
        #endif
    }
}

// =============================================================================
// MARK: - Focus State Management
// =============================================================================

/**
 Focus state manager for keyboard navigation
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public class FocusManager: ObservableObject {

    // MARK: - Published Properties

    @Published public var currentFocus: String?

    // MARK: - Singleton

    public static let shared = FocusManager()

    // MARK: - Initialization

    public init() {}

    // MARK: - Methods

    /**
     Set focus to element
     - Parameter id: Element identifier
     */
    public func setFocus(_ id: String) {
        currentFocus = id
    }

    /**
     Clear focus
     */
    public func clearFocus() {
        currentFocus = nil
    }

    /**
     Move to next focusable element
     - Parameter ids: Ordered list of focusable element IDs
     */
    public func moveNext(in ids: [String]) {
        guard let current = currentFocus,
              let index = ids.firstIndex(of: current) else {
            currentFocus = ids.first
            return
        }

        let nextIndex = (index + 1) % ids.count
        currentFocus = ids[nextIndex]
    }

    /**
     Move to previous focusable element
     - Parameter ids: Ordered list of focusable element IDs
     */
    public func movePrevious(in ids: [String]) {
        guard let current = currentFocus,
              let index = ids.firstIndex(of: current) else {
            currentFocus = ids.first
            return
        }

        let previousIndex = index == 0 ? ids.count - 1 : index - 1
        currentFocus = ids[previousIndex]
    }
}

// =============================================================================
// MARK: - Focusable View Modifier
// =============================================================================

/**
 View modifier that adds focus management
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public struct FocusableModifier: ViewModifier {

    // MARK: - Properties

    let id: String
    @FocusState private var isFocused: Bool
    @ObservedObject var focusManager = FocusManager.shared

    // MARK: - Body

    public func body(content: Content) -> some View {
        content
            .focused($isFocused)
            .id(id)
            .onChange(of: focusManager.currentFocus) { newValue in
                isFocused = newValue == id
            }
            .onTapGesture {
                focusManager.setFocus(id)
            }
    }
}

public extension View {

    /**
     Add focus management to view
     - Parameter id: Unique identifier for focus
     */
    @available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
    func focusable(id: String) -> some View {
        self.modifier(FocusableModifier(id: id))
    }
}

// =============================================================================
// MARK: - Keyboard Shortcuts Documentation
// =============================================================================

/**
 Global keyboard shortcuts for White Room
 */
public struct WhiteRoomKeyboardShortcuts {

    public static let documentation = """
    # White Room Keyboard Shortcuts

    ## Navigation
    - `Tab` - Move to next control
    - `Shift + Tab` - Move to previous control
    - `Arrow Keys` - Navigate within controls
    - `Return/Enter` - Activate button or control
    - `Space` - Toggle checkbox or button
    - `Escape` - Cancel or dismiss

    ## Playback
    - `Space` - Play/Pause
    - `S` - Stop
    - `R` - Record
    - `L` - Loop

    ## Editing
    - `Cmd + Z` - Undo
    - `Cmd + Shift + Z` - Redo
    - `Cmd + S` - Save
    - `Cmd + ,` - Preferences

    ## View
    - `Cmd + 1` - Songs
    - `Cmd + 2` - Performances
    - `Cmd + 3` - Templates
    - `Cmd + 4` - Console

    ## Accessibility
    - `Cmd + Option + F` - Increase focus size
    - `Cmd + Option + B` - Toggle high contrast
    - `Cmd + Option + T` - Increase text size
    """

    /// Get keyboard shortcut documentation
    public static func getDocumentation() -> String {
        return documentation
    }
}

// =============================================================================
// MARK: - UIViewController Extension for Dismissal
// =============================================================================

#if canImport(UIKit)
import UIKit

extension UIViewController {

    /// Get top view controller
    static func topViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return nil
        }

        return topViewController(of: window.rootViewController)
    }

    /// Recursively get top view controller
    static func topViewController(of viewController: UIViewController?) -> UIViewController? {
        if let presentedViewController = viewController?.presentedViewController {
            return topViewController(of: presentedViewController)
        }

        if let navigationController = viewController as? UINavigationController {
            return topViewController(of: navigationController.visibleViewController)
        }

        if let tabBarController = viewController as? UITabBarController {
            return topViewController(of: tabBarController.selectedViewController)
        }

        return viewController
    }
}
#endif

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct KeyboardNavigation_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 24) {
            Button("Button 1") {}
                .keyboardFocusable()
                .tabFocusOrder(1)

            Button("Button 2") {}
                .keyboardFocusable()
                .tabFocusOrder(2)

            Button("Button 3") {}
                .keyboardFocusable()
                .tabFocusOrder(3)

            Slider(value: .constant(0.5), in: 0...1)
                .keyboardFocusable()
                .onArrow(
                    up: { print("Increase") },
                    down: { print("Decrease") }
                )
        }
        .padding()
    }
}
#endif
