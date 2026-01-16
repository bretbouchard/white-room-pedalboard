//
//  PlatformNavigationMac.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(macOS)
import SwiftUI

// =============================================================================
// MARK: - macOS Navigation View
// =============================================================================

/**
 macOS-specific navigation using WindowGroup and Sidebar

 Primary Flow: Orchestration Console
 Secondary: Order Song, Performance Editor (via menu/shortcuts)

 Features:
 - Window groups for multiple documents
 - Sidebar navigation
 - Menu bar integration
 - Tabbed windows
 - Keyboard shortcuts
 */
@available(macOS 13.0, *)
public struct PlatformNavigationMac: View {

    // MARK: - State

    @StateObject private var navigationManager = NavigationManager()
    @State private var selectedSidebarItem: NavigationDestination = .songLibrary
    @State private var windowOpenSettings: Bool = false

    // MARK: - Body

    public var body: some View {
        NavigationSplitView {
            // Sidebar
            List(selection: $selectedSidebarItem) {
                Label("Song Library", systemImage: NavigationDestination.songLibrary.iconName)
                    .tag(NavigationDestination.songLibrary)

                Label("Orchestration", systemImage: NavigationDestination.orchestrationConsole.iconName)
                    .tag(NavigationDestination.orchestrationConsole)

                Divider()

                Label("Performances", systemImage: NavigationDestination.performanceStrip.iconName)
                    .tag(NavigationDestination.performanceStrip)

                Label("Order Song", systemImage: NavigationDestination.orderSong(contractId: nil).iconName)
                    .tag(NavigationDestination.orderSong(contractId: nil))
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 200)
        } detail: {
            // Detail view
            detailView(for: selectedSidebarItem)
        }
        .sheet(isPresented: $windowOpenSettings) {
            SettingsView()
        }
        .commands {
            // File menu
            CommandMenu("File") {
                Button("New Song Contract") {
                    navigationManager.navigate(to: .orderSong(contractId: nil))
                }
                .keyboardShortcut("n", modifiers: [.command, .shift])

                Button("Open Performance Editor") {
                    navigationManager.navigate(to: .performanceEditor(performanceId: "default"))
                }
                .keyboardShortcut("e", modifiers: [.command])
            }

            // View menu
            CommandMenu("View") {
                Button("Show Song Library") {
                    selectedSidebarItem = .songLibrary
                }
                .keyboardShortcut("1", modifiers: [.command])

                Button("Show Orchestration") {
                    selectedSidebarItem = .orchestrationConsole
                }
                .keyboardShortcut("2", modifiers: [.command])

                Button("Show Performances") {
                    selectedSidebarItem = .performanceStrip
                }
                .keyboardShortcut("3", modifiers: [.command])
            }

            // Window menu
            CommandGroup(replacing: .windowSize) {
                Button("Show Settings") {
                    windowOpenSettings = true
                }
                .keyboardShortcut(",", modifiers: [.command])
            }
        }
    }

    // MARK: - Detail Views

    @ViewBuilder
    private func detailView(for destination: NavigationDestination) -> some View {
        switch destination {
        case .songLibrary:
            SongLibraryView()
        case .orchestrationConsole:
            OrchestrationConsoleView()
        case .performanceStrip:
            PerformanceStripView()
        case .orderSong(let id):
            OrderSongContainerView(contractId: id)
        default:
            Text("Select an item from the sidebar")
        }
    }
}

// =============================================================================
// MARK: - macOS App Window Group
// =============================================================================

/**
 macOS app structure with multiple window support
 */
@available(macOS 13.0, *)
public struct WhiteRoomMacApp: View {

    @State private var windowOpenSettings: Bool = false

    public var body: some View {
        WindowGroup("White Room") {
            PlatformNavigationMac()
        }

        // Settings window
        Window("Settings", id: "settings") {
            SettingsView()
        }

        // Orchestration console window
        Window("Orchestration", id: "orchestration") {
            OrchestrationConsoleView()
        }

        // Performance editor window
        WindowGroup("Performance Editor", for: String.self) { $performanceId in
            if let performanceId = performanceId {
                PerformanceEditorView(performanceId: performanceId)
            } else {
                PerformanceEditorView(performanceId: "default")
            }
        }
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
@available(macOS 13.0, *)
struct PlatformNavigationMac_Previews: PreviewProvider {
    static var previews: some View {
        PlatformNavigationMac()
    }
}
#endif

#endif // os(macOS)
