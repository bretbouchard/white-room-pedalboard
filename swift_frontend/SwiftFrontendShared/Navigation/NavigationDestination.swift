//
//  NavigationDestination.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Navigation Destination
// =============================================================================

/**
 Represents all possible navigation destinations in the White Room app

 Each destination knows its preferred platform and accessibility level
 (primary vs secondary) for each platform.
 */
public enum NavigationDestination: Equatable, Hashable {
    // Root destinations
    case songLibrary
    case performanceStrip

    // Editor destinations
    case orderSong(contractId: String?)
    case performanceEditor(performanceId: String)
    case tablatureEditor
    case multiViewNotation

    // Platform-specific
    case orchestrationConsole
    case settings

    // Deep linking
    case deepLink(url: URL)

    // MARK: - Public Properties

    /// Display title for this destination
    public var title: String {
        switch self {
        case .songLibrary:
            return "Song Library"
        case .performanceStrip:
            return "Performances"
        case .orderSong:
            return "Order Song"
        case .performanceEditor:
            return "Performance Editor"
        case .tablatureEditor:
            return "Tablature Editor"
        case .multiViewNotation:
            return "Multi-View Notation"
        case .orchestrationConsole:
            return "Orchestration"
        case .settings:
            return "Settings"
        case .deepLink:
            return "Deep Link"
        }
    }

    /// Icon name for this destination (SF Symbol)
    public var iconName: String {
        switch self {
        case .songLibrary:
            return "music.note.list"
        case .performanceStrip:
            return "slider.horizontal.3"
        case .orderSong:
            return "plus.circle"
        case .performanceEditor:
            return "pianokeys"
        case .tablatureEditor:
            return "guitars"
        case .multiViewNotation:
            return "square.split.2x2"
        case .orchestrationConsole:
            return "mixer"
        case .settings:
            return "gearshape"
        case .deepLink:
            return "link"
        }
    }

    /// Whether this destination is primary for the current platform
    public func isPrimary(for platform: Platform) -> Bool {
        switch platform {
        case .iOS:
            switch self {
            case .performanceStrip, .performanceEditor, .tablatureEditor, .multiViewNotation:
                return true
            case .orderSong, .orchestrationConsole, .settings, .songLibrary:
                return false
            case .deepLink:
                return false
            }

        case .macOS:
            switch self {
            case .orchestrationConsole, .songLibrary:
                return true
            case .orderSong, .performanceStrip, .performanceEditor, .settings:
                return false
            case .deepLink:
                return false
            }

        case .tvOS:
            switch self {
            case .orderSong, .songLibrary:
                return true
            case .performanceEditor, .orchestrationConsole, .settings, .performanceStrip:
                return false
            case .deepLink:
                return false
            }
        }
    }

    /// Whether this destination is secondary (accessible but not primary)
    public func isSecondary(for platform: Platform) -> Bool {
        return !isPrimary(for: platform)
    }

    /// Navigation path for deep linking
    public var path: String {
        switch self {
        case .songLibrary:
            return "/library"
        case .performanceStrip:
            return "/performances"
        case .orderSong(let id):
            if let id = id {
                return "/order/\(id)"
            }
            return "/order"
        case .performanceEditor(let id):
            return "/performance/\(id)"
        case .tablatureEditor:
            return "/tablature"
        case .multiViewNotation:
            return "/multiview"
        case .orchestrationConsole:
            return "/orchestrate"
        case .settings:
            return "/settings"
        case .deepLink(let url):
            return url.absoluteString
        }
    }

    // MARK: - Initialization

    /// Create destination from path string (for deep linking)
    public static func from(path: String) -> NavigationDestination? {
        // Remove query parameters
        let basePath = path.components(separatedBy: "?").first ?? path

        switch basePath {
        case "/library":
            return .songLibrary
        case "/performances":
            return .performanceStrip
        case "/order":
            return .orderSong(contractId: nil)
        case "/orchestrate":
            return .orchestrationConsole
        case "/settings":
            return .settings
        case "/tablature":
            return .tablatureEditor
        case "/multiview":
            return .multiViewNotation

        case let path where path.hasPrefix("/order/"):
            let id = String(path.dropFirst("/order/".count))
            return .orderSong(contractId: id)

        case let path where path.hasPrefix("/performance/"):
            let id = String(path.dropFirst("/performance/".count))
            return .performanceEditor(performanceId: id)

        default:
            // Try parsing as URL
            if let url = URL(string: path) {
                return .deepLink(url: url)
            }
            return nil
        }
    }

    // MARK: - Equatable

    public static func == (lhs: NavigationDestination, rhs: NavigationDestination) -> Bool {
        switch (lhs, rhs) {
        case (.songLibrary, .songLibrary),
             (.performanceStrip, .performanceStrip),
             (.tablatureEditor, .tablatureEditor),
             (.multiViewNotation, .multiViewNotation),
             (.orchestrationConsole, .orchestrationConsole),
             (.settings, .settings):
            return true

        case (.orderSong(let lhsId), .orderSong(let rhsId)):
            return lhsId == rhsId

        case (.performanceEditor(let lhsId), .performanceEditor(let rhsId)):
            return lhsId == rhsId

        case (.deepLink(let lhsUrl), .deepLink(let rhsUrl)):
            return lhsUrl == rhsUrl

        default:
            return false
        }
    }
}

// =============================================================================
// MARK: - Platform
// =============================================================================

/**
 Represents the current platform
 */
public enum Platform {
    case iOS
    case macOS
    case tvOS

    #if os(iOS)
    public static var current: Platform { .iOS }
    #elseif os(macOS)
    public static var current: Platform { .macOS }
    #elseif os(tvOS)
    public static var current: Platform { .tvOS }
    #endif

    /// Human-readable platform name
    public var name: String {
        switch self {
        case .iOS: return "iOS"
        case .macOS: return "macOS"
        case .tvOS: return "tvOS"
        }
    }

    /// Whether this platform supports window-based navigation
    public var supportsWindowGroups: Bool {
        switch self {
        case .macOS: return true
        case .iOS, .tvOS: return false
        }
    }

    /// Whether this platform uses focus-based navigation
    public var usesFocusEngine: Bool {
        switch self {
        case .tvOS: return true
        case .iOS, .macOS: return false
        }
    }

    /// Whether this platform supports tab-based navigation
    public var supportsTabView: Bool {
        switch self {
        case .iOS, .tvOS: return true
        case .macOS: return false
        }
    }
}
