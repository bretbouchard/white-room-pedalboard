//
//  WhiteRoomiOSApp.swift
//  WhiteRoomiOS
//
//  Created by White Room Team
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

@main
struct WhiteRoomiOSApp: App {
    @StateObject private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(themeManager)
                .onAppear {
                    // Set initial theme based on system appearance
                    themeManager.updateTheme()
                }
        }
    }
}

// =============================================================================
// MARK: - Theme Manager
// =============================================================================

/**
 Manages app theme switching between light and dark modes
 */
class ThemeManager: ObservableObject {
    @Published var currentTheme: Theme = .light

    init() {
        // Observe system appearance changes
        NotificationCenter.default.addObserver(
            forName: UIScene.didActivateNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.updateTheme()
        }
    }

    func updateTheme() {
        let userInterfaceStyle = UITraitCollection.current.userInterfaceStyle
        currentTheme = userInterfaceStyle == .dark ? .dark : .light
    }

    func toggleTheme() {
        currentTheme = currentTheme == .light ? .dark : .light
    }
}

// =============================================================================
// MARK: - Content View
// =============================================================================

struct ContentView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Moving Sidewalk Tab
            NavigationView {
                MovingSidewalkView()
            }
            .tabItem {
                Label("Moving Sidewalk", systemImage: "music.note")
            }
            .tag(0)

            // Song Library Tab
            NavigationView {
                SongLibraryView()
            }
            .tabItem {
                Label("Library", systemImage: "books.vertical")
            }
            .tag(1)

            // Performance Editor Tab
            NavigationView {
                PerformanceEditorView()
            }
            .tabItem {
                Label("Editor", systemImage: "slider.horizontal.3")
            }
            .tag(2)

            // Settings Tab
            NavigationView {
                SettingsView(themeManager: themeManager)
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
            .tag(3)
        }
        .accentColor(themeManager.currentTheme.palette.accent.primary)
        .theme(themeManager.currentTheme)
    }
}

// =============================================================================
// MARK: - Performance Editor View
// =============================================================================

struct PerformanceEditorView: View {
    @Environment(\.theme) var theme
    @StateObject private var viewModel = PerformanceEditorViewModel()

    var body: some View {
        VStack(spacing: 20) {
            // Welcome message
            VStack(spacing: 12) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 50))
                    .foregroundColor(theme.palette.accent.primary)

                Text("Performance Editor")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(theme.palette.text.primary)

                Text("Create and edit performances")
                    .font(.body)
                    .foregroundColor(theme.palette.text.secondary)
            }
            .padding(.top, 40)

            // Quick actions
            VStack(spacing: 12) {
                Button {
                    // Create new performance
                } label: {
                    Label("Create New Performance", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(theme.palette.accent.primary)
                        .cornerRadius(12)
                }

                Button {
                    // Browse performances
                } label: {
                    Label("Browse Performances", systemImage: "folder")
                        .font(.headline)
                        .foregroundColor(theme.palette.accent.primary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(theme.palette.accent.primary.opacity(0.1))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("Editor")
    }
}

// =============================================================================
// MARK: - Settings View
// =============================================================================

struct SettingsView: View {
    @Environment(\.theme) var theme
    @ObservedObject var themeManager: ThemeManager

    var body: some View {
        List {
            Section {
                HStack {
                    Text("Theme")
                        .foregroundColor(theme.palette.text.primary)
                    Spacer()
                    Text(themeManager.currentTheme == .light ? "Light" : "Dark")
                        .foregroundColor(theme.palette.text.secondary)
                    Image(systemName: themeManager.currentTheme == .light ? "sun.max.fill" : "moon.fill")
                        .foregroundColor(theme.palette.accent.primary)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation {
                        themeManager.toggleTheme()
                    }
                }
            } header: {
                Text("Appearance")
                    .foregroundColor(theme.palette.text.secondary)
            }

            Section {
                HStack {
                    Text("Version")
                        .foregroundColor(theme.palette.text.primary)
                    Spacer()
                    Text("0.1.0")
                        .foregroundColor(theme.palette.text.secondary)
                }

                HStack {
                    Text("Build")
                        .foregroundColor(theme.palette.text.primary)
                    Spacer()
                    Text("Development")
                        .foregroundColor(theme.palette.text.secondary)
                }
            } header: {
                Text("About")
                    .foregroundColor(theme.palette.text.secondary)
            }
        }
        .navigationTitle("Settings")
        .accessibilityIdentifier("SettingsView")
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(ThemeManager())
    }
}
