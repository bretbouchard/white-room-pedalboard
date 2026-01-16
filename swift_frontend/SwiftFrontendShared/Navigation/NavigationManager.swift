//
//  NavigationManager.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2025 White Room. All rights reserved.
//

import SwiftUI
import Combine

// =============================================================================
// MARK: - Navigation Manager
// =============================================================================

/**
 Unified navigation manager that handles cross-platform navigation

 This manager:
 - Detects the current platform
 - Provides platform-appropriate navigation
 - Supports deep linking
 - Manages navigation state
 - Handles primary vs secondary UI paths
 */
@available(iOS 16.0, macOS 13.0, tvOS 16.0, *)
public class NavigationManager: ObservableObject {

    // MARK: - Published State

    /// Current navigation path
    @Published public var path = NavigationPath()

    /// Currently selected tab (for platforms with tab bars)
    @Published public var selectedTab: NavigationDestination

    /// Whether we're presenting a sheet
    @Published public var presentedSheet: SheetDestination?

    /// Currently active window (macOS)
    @Published public var activeWindow: WindowDestination?

    // MARK: - Properties

    /// Current platform
    public let platform: Platform

    /// Deep link URL scheme
    public let deepLinkScheme = "whiteroom"

    // MARK: - Initialization

    public init() {
        self.platform = Platform.current
        self.path = NavigationPath()

        // Set default tab based on platform
        switch platform {
        case .iOS:
            self.selectedTab = .performanceStrip
        case .macOS:
            self.selectedTab = .songLibrary
        case .tvOS:
            self.selectedTab = .orderSong(contractId: nil)
        }

        self.presentedSheet = nil
        self.activeWindow = nil
    }

    // MARK: - Navigation Actions

    /// Navigate to a destination
    public func navigate(to destination: NavigationDestination) {
        switch platform {
        case .iOS:
            navigateiOS(to: destination)
        case .macOS:
            navigatemacOS(to: destination)
        case .tvOS:
            navigatetvOS(to: destination)
        }
    }

    /// Pop back in navigation stack
    public func pop() {
        path.removeLast()
    }

    /// Pop to root
    public func popToRoot() {
        path = NavigationPath()
    }

    /// Dismiss presented sheet
    public func dismissSheet() {
        presentedSheet = nil
    }

    /// Close active window (macOS)
    public func closeWindow() {
        activeWindow = nil
    }

    // MARK: - Platform-Specific Navigation

    private func navigateiOS(to destination: NavigationDestination) {
        // iOS uses NavigationStack for editors, TabView for main sections
        if destination.isPrimary(for: .iOS) {
            // Primary destinations use tab switching
            selectedTab = destination
        } else {
            // Secondary destinations use sheet presentation or navigation
            switch destination {
            case .orderSong, .settings:
                // Present as sheet
                presentedSheet = SheetDestination(destination: destination)
            case .orchestrationConsole:
                // Navigate in stack
                path.append(destination)
            default:
                // Use tab switching
                selectedTab = destination
            }
        }
    }

    private func navigatemacOS(to destination: NavigationDestination) {
        // macOS uses window groups and sidebar navigation
        if destination.isPrimary(for: .macOS) {
            // Primary destinations use tab switching in sidebar
            selectedTab = destination
        } else {
            // Secondary destinations open in new windows or sheets
            switch destination {
            case .orderSong, .performanceEditor:
                // Open in new window
                activeWindow = WindowDestination(destination: destination)
            case .settings:
                // Present as sheet
                presentedSheet = SheetDestination(destination: destination)
            default:
                // Use sidebar navigation
                selectedTab = destination
            }
        }
    }

    private func navigatetvOS(to destination: NavigationDestination) {
        // tvOS uses focus engine with tab bar
        if destination.isPrimary(for: .tvOS) {
            // Primary destinations use tab switching
            selectedTab = destination
        } else {
            // Secondary destinations use slide-over panels
            switch destination {
            case .performanceEditor, .orchestrationConsole, .settings:
                // Present as slide-over
                presentedSheet = SheetDestination(destination: destination)
            default:
                // Use tab switching
                selectedTab = destination
            }
        }
    }

    // MARK: - Deep Linking

    /// Handle deep link URL
    public func handleDeepLink(_ url: URL) -> Bool {
        // Verify URL scheme
        guard url.scheme == deepLinkScheme else {
            return false
        }

        // Parse path
        guard let pathString = url.pathComponents.first,
              let destination = NavigationDestination.from(path: pathString) else {
            return false
        }

        // Parse query parameters
        var destination = destination
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let queryItems = components.queryItems {
            for item in queryItems {
                switch item.name {
                case "intent":
                    if let value = item.value {
                        destination = applyIntent(value, to: destination)
                    }
                case "id":
                    if let value = item.value {
                        destination = applyId(value, to: destination)
                    }
                default:
                    break
                }
            }
        }

        // Navigate to destination
        navigate(to: destination)
        return true
    }

    private func applyIntent(_ intent: String, to destination: NavigationDestination) -> NavigationDestination {
        // Apply intent parameter to destination
        switch destination {
        case .orderSong:
            // Intent parameter for order song
            // Could pre-fill contract with intent
            return destination
        default:
            return destination
        }
    }

    private func applyId(_ id: String, to destination: NavigationDestination) -> NavigationDestination {
        // Apply id parameter to destination
        switch destination {
        case .orderSong:
            return .orderSong(contractId: id)
        case .performanceEditor:
            return .performanceEditor(performanceId: id)
        default:
            return destination
        }
    }

    // MARK: - Utility

    /// Generate deep link URL for a destination
    public func deepLinkURL(for destination: NavigationDestination) -> URL? {
        var components = URLComponents()
        components.scheme = deepLinkScheme
        components.path = destination.path

        return components.url
    }

    /// Get all primary destinations for current platform
    public var primaryDestinations: [NavigationDestination] {
        NavigationDestination.allCases.filter { $0.isPrimary(for: platform) }
    }

    /// Get all secondary destinations for current platform
    public var secondaryDestinations: [NavigationDestination] {
        NavigationDestination.allCases.filter { $0.isSecondary(for: platform) }
    }
}

// =============================================================================
// MARK: - Sheet Destination
// =============================================================================

/**
 Represents a sheet presentation
 */
public struct SheetDestination: Identifiable {
    public let id = UUID()
    public let destination: NavigationDestination
}

// =============================================================================
// MARK: - Window Destination
// =============================================================================

/**
 Represents a window presentation (macOS)
 */
public struct WindowDestination: Identifiable {
    public let id = UUID()
    public let destination: NavigationDestination
}

// =============================================================================
// MARK: - NavigationDestination Extensions
// =============================================================================

public extension Array where Element == NavigationDestination {

    /// All possible navigation destinations
    static var allCases: [NavigationDestination] {
        return [
            .songLibrary,
            .performanceStrip,
            .orderSong(contractId: nil),
            .performanceEditor(performanceId: "default"),
            .orchestrationConsole,
            .settings
        ]
    }
}
