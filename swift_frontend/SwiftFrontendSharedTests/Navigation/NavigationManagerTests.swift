//
//  NavigationManagerTests.swift
//  SwiftFrontendSharedTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendShared

// =============================================================================
// MARK: - Navigation Destination Tests
// =============================================================================

final class NavigationDestinationTests: XCTestCase {

    // MARK: - Platform Detection Tests

    func testPlatformPriorityiOS() {
        // Primary features on iOS
        XCTAssertTrue(NavigationDestination.performanceStrip.isPrimary(for: .iOS))
        XCTAssertTrue(NavigationDestination.performanceEditor(performanceId: "test").isPrimary(for: .iOS))

        // Secondary features on iOS
        XCTAssertFalse(NavigationDestination.songLibrary.isPrimary(for: .iOS))
        XCTAssertFalse(NavigationDestination.orderSong(contractId: nil).isPrimary(for: .iOS))
        XCTAssertFalse(NavigationDestination.orchestrationConsole.isPrimary(for: .iOS))
        XCTAssertFalse(NavigationDestination.settings.isPrimary(for: .iOS))
    }

    func testPlatformPriorityMac() {
        // Primary features on macOS
        XCTAssertTrue(NavigationDestination.songLibrary.isPrimary(for: .macOS))
        XCTAssertTrue(NavigationDestination.orchestrationConsole.isPrimary(for: .macOS))

        // Secondary features on macOS
        XCTAssertFalse(NavigationDestination.performanceStrip.isPrimary(for: .macOS))
        XCTAssertFalse(NavigationDestination.performanceEditor(performanceId: "test").isPrimary(for: .macOS))
        XCTAssertFalse(NavigationDestination.orderSong(contractId: nil).isPrimary(for: .macOS))
        XCTAssertFalse(NavigationDestination.settings.isPrimary(for: .macOS))
    }

    func testPlatformPriorityTV() {
        // Primary features on tvOS
        XCTAssertTrue(NavigationDestination.orderSong(contractId: nil).isPrimary(for: .tvOS))
        XCTAssertTrue(NavigationDestination.songLibrary.isPrimary(for: .tvOS))

        // Secondary features on tvOS
        XCTAssertFalse(NavigationDestination.performanceStrip.isPrimary(for: .tvOS))
        XCTAssertFalse(NavigationDestination.performanceEditor(performanceId: "test").isPrimary(for: .tvOS))
        XCTAssertFalse(NavigationDestination.orchestrationConsole.isPrimary(for: .tvOS))
        XCTAssertFalse(NavigationDestination.settings.isPrimary(for: .tvOS))
    }

    // MARK: - Path Tests

    func testDestinationPaths() {
        XCTAssertEqual(NavigationDestination.songLibrary.path, "/library")
        XCTAssertEqual(NavigationDestination.performanceStrip.path, "/performances")
        XCTAssertEqual(NavigationDestination.orderSong(contractId: nil).path, "/order")
        XCTAssertEqual(NavigationDestination.orchestrationConsole.path, "/orchestrate")
        XCTAssertEqual(NavigationDestination.settings.path, "/settings")
    }

    func testDestinationPathsWithID() {
        XCTAssertEqual(NavigationDestination.orderSong(contractId: "test123").path, "/order/test123")
        XCTAssertEqual(NavigationDestination.performanceEditor(performanceId: "perf456").path, "/performance/perf456")
    }

    // MARK: - Path Parsing Tests

    func testPathParsing() {
        XCTAssertEqual(NavigationDestination.from(path: "/library"), .songLibrary)
        XCTAssertEqual(NavigationDestination.from(path: "/performances"), .performanceStrip)
        XCTAssertEqual(NavigationDestination.from(path: "/order"), .orderSong(contractId: nil))
        XCTAssertEqual(NavigationDestination.from(path: "/orchestrate"), .orchestrationConsole)
        XCTAssertEqual(NavigationDestination.from(path: "/settings"), .settings)
    }

    func testPathParsingWithID() {
        XCTAssertEqual(NavigationDestination.from(path: "/order/test123"), .orderSong(contractId: "test123"))
        XCTAssertEqual(NavigationDestination.from(path: "/performance/perf456"), .performanceEditor(performanceId: "perf456"))
    }

    func testPathParsingInvalid() {
        XCTAssertNil(NavigationDestination.from(path: "/invalid"))
        XCTAssertNil(NavigationDestination.from(path: ""))
    }

    // MARK: - Equality Tests

    func testDestinationEquality() {
        XCTAssertEqual(NavigationDestination.songLibrary, .songLibrary)
        XCTAssertEqual(NavigationDestination.orderSong(contractId: "test"), .orderSong(contractId: "test"))

        XCTAssertNotEqual(NavigationDestination.songLibrary, .performanceStrip)
        XCTAssertNotEqual(NavigationDestination.orderSong(contractId: "test1"), .orderSong(contractId: "test2"))
    }

    // MARK: - Display Properties Tests

    func testDestinationTitles() {
        XCTAssertEqual(NavigationDestination.songLibrary.title, "Song Library")
        XCTAssertEqual(NavigationDestination.performanceStrip.title, "Performances")
        XCTAssertEqual(NavigationDestination.orderSong(contractId: nil).title, "Order Song")
        XCTAssertEqual(NavigationDestination.orchestrationConsole.title, "Orchestration")
        XCTAssertEqual(NavigationDestination.settings.title, "Settings")
    }

    func testDestinationIcons() {
        XCTAssertEqual(NavigationDestination.songLibrary.iconName, "music.note.list")
        XCTAssertEqual(NavigationDestination.performanceStrip.iconName, "slider.horizontal.3")
        XCTAssertEqual(NavigationDestination.orderSong(contractId: nil).iconName, "plus.circle")
        XCTAssertEqual(NavigationDestination.orchestrationConsole.iconName, "mixer")
        XCTAssertEqual(NavigationDestination.settings.iconName, "gearshape")
    }
}

// =============================================================================
// MARK: - Platform Tests
// =============================================================================

final class PlatformTests: XCTestCase {

    func testPlatformProperties() {
        XCTAssertEqual(Platform.iOS.name, "iOS")
        XCTAssertEqual(Platform.macOS.name, "macOS")
        XCTAssertEqual(Platform.tvOS.name, "tvOS")
    }

    func testPlatformCapabilities() {
        // macOS supports window groups
        XCTAssertTrue(Platform.macOS.supportsWindowGroups)
        XCTAssertFalse(Platform.iOS.supportsWindowGroups)
        XCTAssertFalse(Platform.tvOS.supportsWindowGroups)

        // tvOS uses focus engine
        XCTAssertTrue(Platform.tvOS.usesFocusEngine)
        XCTAssertFalse(Platform.iOS.usesFocusEngine)
        XCTAssertFalse(Platform.macOS.usesFocusEngine)

        // iOS and tvOS support tab view
        XCTAssertTrue(Platform.iOS.supportsTabView)
        XCTAssertTrue(Platform.tvOS.supportsTabView)
        XCTAssertFalse(Platform.macOS.supportsTabView)
    }
}

// =============================================================================
// MARK: - Navigation Manager Tests
// =============================================================================

final class NavigationManagerTests: XCTestCase {

    var manager: NavigationManager!

    override func setUp() {
        super.setUp()
        manager = NavigationManager()
    }

    override func tearDown() {
        manager = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialState() {
        XCTAssertNotNil(manager.platform)
        XCTAssertTrue(manager.path.isEmpty)
        XCTAssertNil(manager.presentedSheet)
        XCTAssertNil(manager.activeWindow)
    }

    func testDefaultTabByPlatform() {
        let manager = NavigationManager()

        switch manager.platform {
        case .iOS:
            XCTAssertEqual(manager.selectedTab, .performanceStrip)
        case .macOS:
            XCTAssertEqual(manager.selectedTab, .songLibrary)
        case .tvOS:
            XCTAssertEqual(manager.selectedTab, .orderSong(contractId: nil))
        }
    }

    // MARK: - Navigation Tests

    func testNavigation() {
        manager.navigate(to: .songLibrary)

        // Should update state based on platform
        // (exact behavior depends on platform implementation)
        XCTAssertNotNil(manager.selectedTab)
    }

    func testPop() {
        manager.path.append(NavigationDestination.songLibrary)
        manager.pop()

        XCTAssertTrue(manager.path.isEmpty)
    }

    func testPopToRoot() {
        manager.path.append(NavigationDestination.songLibrary)
        manager.path.append(NavigationDestination.performanceStrip)
        manager.popToRoot()

        XCTAssertTrue(manager.path.isEmpty)
    }

    func testDismissSheet() {
        manager.presentedSheet = SheetDestination(destination: .settings)
        manager.dismissSheet()

        XCTAssertNil(manager.presentedSheet)
    }

    func testCloseWindow() {
        manager.activeWindow = WindowDestination(destination: .orderSong(contractId: nil))
        manager.closeWindow()

        XCTAssertNil(manager.activeWindow)
    }

    // MARK: - Deep Link Tests

    func testDeepLinkGeneration() {
        let url = manager.deepLinkURL(for: .songLibrary)
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.scheme, "whiteroom")
        XCTAssertEqual(url?.path, "/library")
    }

    func testDeepLinkHandling() {
        let url = URL(string: "whiteroom://library")!
        let handled = manager.handleDeepLink(url)

        XCTAssertTrue(handled)
    }

    func testDeepLinkHandlingInvalid() {
        let url = URL(string: "invalid://library")!
        let handled = manager.handleDeepLink(url)

        XCTAssertFalse(handled)
    }

    func testDeepLinkWithQueryParameters() {
        let url = URL(string: "whiteroom://order?intent=tense")!
        let handled = manager.handleDeepLink(url)

        XCTAssertTrue(handled)
    }

    // MARK: - Destination Lists Tests

    func testPrimaryDestinations() {
        let primary = manager.primaryDestinations
        XCTAssertFalse(primary.isEmpty)

        // All primary destinations should be primary for current platform
        for destination in primary {
            XCTAssertTrue(destination.isPrimary(for: manager.platform))
        }
    }

    func testSecondaryDestinations() {
        let secondary = manager.secondaryDestinations
        XCTAssertFalse(secondary.isEmpty)

        // All secondary destinations should be secondary for current platform
        for destination in secondary {
            XCTAssertTrue(destination.isSecondary(for: manager.platform))
        }
    }
}

// =============================================================================
// MARK: - Deep Link Integration Tests
// =============================================================================

final class DeepLinkIntegrationTests: XCTestCase {

    func testDeepLinkRoundTrip() {
        let manager = NavigationManager()

        // Test all destinations
        let destinations: [NavigationDestination] = [
            .songLibrary,
            .performanceStrip,
            .orderSong(contractId: nil),
            .orderSong(contractId: "test"),
            .performanceEditor(performanceId: "perf123"),
            .orchestrationConsole,
            .settings
        ]

        for destination in destinations {
            // Generate URL
            let url = manager.deepLinkURL(for: destination)
            XCTAssertNotNil(url, "Failed to generate URL for \(destination)")

            // Parse URL back to destination
            if let url = url {
                let parsed = NavigationDestination.from(path: url.path)
                XCTAssertNotNil(parsed, "Failed to parse URL: \(url)")

                // Verify round trip (may not be exact equality for all cases)
                if let parsed = parsed {
                    switch (destination, parsed) {
                    case (.songLibrary, .songLibrary),
                         (.performanceStrip, .performanceStrip),
                         (.orchestrationConsole, .orchestrationConsole),
                         (.settings, .settings):
                        // Exact match
                        break
                    case (.orderSong(let destId), .orderSong(let parsedId)):
                        XCTAssertEqual(destId, parsedId)
                    case (.performanceEditor(let destId), .performanceEditor(let parsedId)):
                        XCTAssertEqual(destId, parsedId)
                    default:
                        XCTFail("Round trip failed: \(destination) -> \(parsed)")
                    }
                }
            }
        }
    }

    func testDeepLinkWithSpecialCharacters() {
        let manager = NavigationManager()

        // Test with special characters in ID
        let url = manager.deepLinkURL(for: .orderSong(contractId: "test-with_special.chars"))
        XCTAssertNotNil(url)

        if let url = url {
            let handled = manager.handleDeepLink(url)
            XCTAssertTrue(handled)
        }
    }
}

// =============================================================================
// MARK: - Platform-Specific Tests
// =============================================================================

#if os(iOS)
final class iOSTests: XCTestCase {
    func testiOSPrimaryFlow() {
        // Performance Strip should be primary
        XCTAssertTrue(NavigationDestination.performanceStrip.isPrimary(for: .iOS))
        XCTAssertTrue(NavigationDestination.performanceEditor(performanceId: "test").isPrimary(for: .iOS))
    }
}
#endif

#if os(macOS)
final class MacOSTests: XCTestCase {
    func testmacOSPrimaryFlow() {
        // Song Library and Orchestration should be primary
        XCTAssertTrue(NavigationDestination.songLibrary.isPrimary(for: .macOS))
        XCTAssertTrue(NavigationDestination.orchestrationConsole.isPrimary(for: .macOS))
    }
}
#endif

#if os(tvOS)
final class tvOSTests: XCTestCase {
    func testtvOSPrimaryFlow() {
        // Order Song and Song Library should be primary
        XCTAssertTrue(NavigationDestination.orderSong(contractId: nil).isPrimary(for: .tvOS))
        XCTAssertTrue(NavigationDestination.songLibrary.isPrimary(for: .tvOS))
    }
}
#endif
