//
//  WhiteRoomApp.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - White Room App (Cross-Platform)
// =============================================================================

/**
 Main app entry point that automatically selects the correct navigation
 for the current platform (iOS, macOS, or tvOS)

 This unified app:
 - Detects the current platform at compile time
 - Instantiates the appropriate navigation structure
 - Provides consistent deep linking across platforms
 - Ensures all features are accessible on all platforms
// DUPLICATE:  */
// DUPLICATE: @main
// DUPLICATE: public struct WhiteRoomApp: View {
// DUPLICATE: 
// DUPLICATE:     // MARK: - State
// DUPLICATE: 
// DUPLICATE:     @StateObject private var navigationManager = NavigationManager()
// DUPLICATE: 
// DUPLICATE:     // MARK: - Body
// DUPLICATE: 
// DUPLICATE:     public var body: some View {
// DUPLICATE:         // Platform-specific navigation
// DUPLICATE:         platformSpecificBody
// DUPLICATE:             .onOpenURL { url in
// DUPLICATE:                 handleDeepLink(url)
// DUPLICATE:             }
// DUPLICATE:             .environmentObject(navigationManager)
// DUPLICATE:     }
// DUPLICATE: 
// DUPLICATE:     // MARK: - Platform-Specific Body
// DUPLICATE: 
// DUPLICATE:     @ViewBuilder
// DUPLICATE:     private var platformSpecificBody: some View {
// DUPLICATE:         #if os(iOS)
// DUPLICATE:         PlatformNavigationiOS()
// DUPLICATE:         #elseif os(macOS)
// DUPLICATE:         PlatformNavigationMac()
// DUPLICATE:         #elseif os(tvOS)
// DUPLICATE:         PlatformNavigationTV()
// DUPLICATE:         #else
// DUPLICATE:         // Fallback for unsupported platforms
// DUPLICATE:         Text("Unsupported Platform")
// DUPLICATE:             .foregroundStyle(.secondary)
// DUPLICATE:         #endif
// DUPLICATE:     }
// DUPLICATE: 
// DUPLICATE:     // MARK: - Deep Link Handling
// DUPLICATE: 
// DUPLICATE:     private func handleDeepLink(_ url: URL) {
// DUPLICATE:         let handled = navigationManager.handleDeepLink(url)
// DUPLICATE: 
// DUPLICATE:         if !handled {
// DUPLICATE:             print("⚠️ Failed to handle deep link: \(url)")
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }

// =============================================================================
// MARK: - App Entry Points (Legacy Support)
// =============================================================================

/**
 Platform-specific app entry points for legacy Xcode project templates

 These can be used if you have separate app targets for each platform
 instead of a unified app target.
 */

// iOS App
#if os(iOS)
// DUPLICATE: @main
// DUPLICATE: struct WhiteRoomiOSApp: App {
// DUPLICATE:     var body: some Scene {
// DUPLICATE:         WindowGroup {
// DUPLICATE:             PlatformNavigationiOS()
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }
#endif

// macOS App
#if os(macOS)
// DUPLICATE: @main
// DUPLICATE: struct WhiteRoomMacApp: App {
// DUPLICATE:     var body: some Scene {
// DUPLICATE:         WindowGroup("White Room") {
// DUPLICATE:             PlatformNavigationMac()
// DUPLICATE:         }

// DUPLICATE:         // Settings window
// DUPLICATE:         Window("Settings", id: "settings") {
// DUPLICATE:             SettingsView()
// DUPLICATE:         }
// DUPLICATE: 
// DUPLICATE:         // Orchestration console window
// DUPLICATE:         Window("Orchestration", id: "orchestration") {
// DUPLICATE:             OrchestrationConsoleView()
// DUPLICATE:         }
// DUPLICATE: 
// DUPLICATE:         // Performance editor window
// DUPLICATE:         WindowGroup("Performance Editor", for: String.self) { $performanceId in
// DUPLICATE:             if let performanceId = performanceId {
// DUPLICATE:                 PerformanceEditorView(performanceId: performanceId)
// DUPLICATE:             } else {
// DUPLICATE:                 PerformanceEditorView(performanceId: "default")
// DUPLICATE:             }
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }
#endif

// tvOS App
#if os(tvOS)
// DUPLICATE: @main
// DUPLICATE: struct WhiteRoomTVApp: App {
// DUPLICATE:     var body: some Scene {
// DUPLICATE:         WindowGroup {
// DUPLICATE:             PlatformNavigationTV()
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }
#endif

// =============================================================================
// MARK: - Deep Link URL Scheme Documentation
// =============================================================================

/**
 White Room Deep Link URL Scheme

 Scheme: `whiteroom://`

 Supported Paths:

 1. Song Library
    `whiteroom://library`

 2. Performance Strip
    `whiteroom://performances`

 3. Order Song
    - New contract: `whiteroom://order`
    - Existing contract: `whiteroom://order/{contractId}`
    - With intent: `whiteroom://order?intent=tense`

 4. Performance Editor
    `whiteroom://performance/{performanceId}`

 5. Orchestration Console
    `whiteroom://orchestrate`

 6. Settings
    `whiteroom://settings`

 Query Parameters:

 - `intent`: Musical intent for order song (song, cue, loop, etc.)
 - `id`: Resource ID (contract ID, performance ID, etc.)

 Examples:

 ```
 // Create new tense song contract
 whiteroom://order?intent=tense

 // Edit specific performance
 whiteroom://performance/performance_123

 // Open orchestration console
 whiteroom://orchestrate

 // Go to song library
 whiteroom://library
 ```

 Platform Behavior:

 - iOS: Navigates in NavigationStack or presents as sheet
 - macOS: Opens in new window or activates existing window
 - tvOS: Shows slide-over panel or switches tabs
 */

// =============================================================================
// MARK: - Platform Feature Matrix
// =============================================================================

/**
 Feature Accessibility by Platform

 | Feature          | iOS          | macOS        | tvOS         |
 |------------------|--------------|--------------|--------------|
 | Song Library     | Secondary    | Primary      | Primary      |
 | Order Song       | Secondary    | Secondary    | Primary      |
 | Performance Strip| Primary      | Secondary    | Secondary    |
 | Performance Ed.  | Primary      | Secondary    | Secondary    |
 | Orchestration    | Secondary    | Primary      | Secondary    |
 | Settings         | Secondary    | Secondary    | Secondary    |

 Legend:
 - Primary: Main flow, always visible
 - Secondary: Accessible via tabs, menu, or panels
 */

// =============================================================================
// MARK: - Preview
// =============================================================================

// Preview disabled - WhiteRoomApp struct is commented out
// Platform-specific app entry points are used instead
