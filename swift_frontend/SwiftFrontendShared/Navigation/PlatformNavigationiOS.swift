//
//  PlatformNavigationiOS.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - iOS Navigation View
// =============================================================================

/**
 iOS-specific navigation using NavigationStack and TabView

 Primary Flow: Performance Editor
 Secondary: Order Song, Orchestration (via tabs)

 Features:
 - Tab bar for main sections
 - NavigationStack for hierarchical navigation
 - Sheet presentation for editors
 - Swipe back gesture support
 */
@available(iOS 16.0, *)
public struct PlatformNavigationiOS: View {

    // MARK: - State

    @StateObject private var navigationManager = NavigationManager()
    @State private var selectedTab: NavigationDestination = .performanceStrip

    // MARK: - Body

    public var body: some View {
        TabView(selection: $selectedTab) {
            // Performance Tab (Primary)
            NavigationStack(path: $navigationManager.path) {
                PerformanceStripView()
                    .navigationDestination(for: NavigationDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label("Performances", systemImage: NavigationDestination.performanceStrip.iconName)
            }
            .tag(NavigationDestination.performanceStrip)

            // Song Library Tab (Secondary)
            NavigationStack {
                SongLibraryView()
            }
            .tabItem {
                Label("Library", systemImage: NavigationDestination.songLibrary.iconName)
            }
            .tag(NavigationDestination.songLibrary)

            // Order Song Tab (Secondary)
            NavigationStack {
                OrderSongContainerView()
            }
            .tabItem {
                Label("Order", systemImage: NavigationDestination.orderSong(contractId: nil).iconName)
            }
            .tag(NavigationDestination.orderSong(contractId: nil))

            // Orchestration Tab (Secondary - menu only)
            NavigationStack {
                OrchestrationConsoleView()
            }
            .tabItem {
                Label("Orchestrate", systemImage: NavigationDestination.orchestrationConsole.iconName)
            }
            .tag(NavigationDestination.orchestrationConsole)
        }
        .sheet(item: $navigationManager.presentedSheet) { sheet in
            sheetView(for: sheet.destination)
        }
    }

    // MARK: - Destination Views

    @ViewBuilder
    private func destinationView(for destination: NavigationDestination) -> some View {
        switch destination {
        case .performanceEditor(let id):
            PerformanceEditorView(performanceId: id)
        case .orderSong(let id):
            OrderSongContainerView(contractId: id)
        case .orchestrationConsole:
            OrchestrationConsoleView()
        case .multiViewNotation:
            MultiViewNotationContainerView()
        default:
            Text("Unknown destination")
        }
    }

    @ViewBuilder
    private func sheetView(for destination: NavigationDestination) -> some View {
        switch destination {
        case .orderSong(let id):
            OrderSongContainerView(contractId: id)
        case .settings:
            SettingsView()
        default:
            Text("Unknown sheet")
        }
    }
}

// =============================================================================
// MARK: - Placeholder Views (To be implemented)
// =============================================================================

struct PerformanceStripView: View {
    var body: some View {
        Text("Performance Strip")
            .navigationTitle("Performances")
    }
}

struct SongLibraryView: View {
    var body: some View {
        Text("Song Library")
            .navigationTitle("Library")
    }
}

struct OrderSongContainerView: View {
    var contractId: String?

    init(contractId: String? = nil) {
        self.contractId = contractId
    }

    var body: some View {
        Text("Order Song")
            .navigationTitle("Order Song")
    }
}

struct PerformanceEditorView: View {
    var performanceId: String

    var body: some View {
        Text("Performance Editor")
            .navigationTitle("Editor")
    }
}

struct MultiViewNotationContainerView: View {
    var body: some View {
        if #available(iOS 16.0, *) {
            MultiViewNotationContainer()
                .navigationTitle("Multi-View Notation")
        } else {
            Text("Multi-view notation requires iOS 16+")
                .foregroundColor(.secondary)
        }
    }
}

struct OrchestrationConsoleView: View {
    var body: some View {
        Text("Orchestration Console")
            .navigationTitle("Orchestration")
    }
}

struct SettingsView: View {
    var body: some View {
        Text("Settings")
            .navigationTitle("Settings")
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
@available(iOS 16.0, *)
struct PlatformNavigationiOS_Previews: PreviewProvider {
    static var previews: some View {
        PlatformNavigationiOS()
    }
}
#endif
