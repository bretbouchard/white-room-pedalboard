//
//  WhiteRoomiOSApp.swift
//  WhiteRoomiOSApp
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

@main
struct WhiteRoomiOSApp: App {
    // @StateObject private var autoSaveManager = AutoSaveManager.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                // .environmentObject(autoSaveManager)
                .onAppear {
                    // Mark pending changes when app becomes active
                    NSLog("White Room: App appeared")
                }
                .onChange(of: scenePhase) { newPhase in
                    handleScenePhaseChange(newPhase)
                }
        }
    }

    // MARK: - Lifecycle Handling

    private func handleScenePhaseChange(_ newPhase: ScenePhase) {
        switch newPhase {
        case .active:
            NSLog("White Room: App became active")
            // App is now active - mark pending changes if needed

        case .background:
            NSLog("White Room: App entering background - triggering save")
            // Perform final save when app goes to background
            Task {
                do {
                    try await AutoSaveManager.shared.triggerImmediateSave()
                    NSLog("White Room: Background save completed successfully")
                } catch {
                    NSLog("White Room: Background save failed - \(error)")
                }
            }

        case .inactive:
            NSLog("White Room: App becoming inactive")

        @unknown default:
            NSLog("White Room: Unknown scene phase: \(String(describing: newPhase))")
        }
    }
}

struct ContentView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Moving Sidewalk Tab - REAL VIEW
            NavigationView {
                MovingSidewalkView()
            }
            .tabItem {
                Label("Moving Sidewalk", systemImage: "music.note")
            }
            .tag(0)

            // Song Library Tab - REAL VIEW
            NavigationView {
                SongLibraryView()
            }
            .tabItem {
                Label("Library", systemImage: "books.vertical")
            }
            .tag(1)

            // Performance Editor Tab - REAL VIEW
            NavigationView {
                PerformanceEditor()
            }
            .tabItem {
                Label("Editor", systemImage: "slider.horizontal.3")
            }
            .tag(2)

            // Settings Tab
            NavigationView {
                SimpleSettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
            .tag(3)
        }
    }
}

struct SimpleSettingsView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "gearshape")
                .font(.system(size: 50))
                .foregroundStyle(.tint)

            Text("Settings")
                .font(.largeTitle)
                .fontWeight(.bold)

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("0.1.0")
                        .foregroundStyle(.secondary)
                }
                HStack {
                    Text("Build")
                    Spacer()
                    Text("Development")
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            Spacer()
        }
        .padding()
        .navigationTitle("Settings")
    }
}

#Preview {
    ContentView()
}
