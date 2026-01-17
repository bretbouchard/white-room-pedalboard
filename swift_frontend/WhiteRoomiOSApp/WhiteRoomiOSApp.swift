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
    // @EnvironmentObject private var autoSaveManager: AutoSaveManager
    @State private var timeSinceLastSave: TimeInterval? = nil
    @State private var isSaving = false
    @State private var saveError: Error? = nil
    @State private var showCrashRecovery = false
    @State private var crashVersion = 0
    @State private var showSettings = false
    @State private var showDemoSongs = false

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "music.note")
                .imageScale(.large)
                .foregroundStyle(.tint)

            Text("White Room")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Schillinger DAW System")
                .font(.headline)
                .foregroundStyle(.secondary)

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("JUCE Audio Backend")
                }
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("SwiftUI Frontend")
                }
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Schillinger Music Theory")
                }
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("TypeScript SDK")
                }
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Demo Songs (83)")
                }
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Auto-Save System")
                }
            }
            .font(.body)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Demo Songs Button
            Button(action: { showDemoSongs = true }) {
                HStack {
                    Image(systemName: "music.note.list")
                    Text("Browse Demo Songs")
                }
                .font(.callout)
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.accentColor.opacity(0.1))
                .foregroundStyle(.accent)
                .cornerRadius(12)
            }
            .padding(.horizontal)

            // Auto-Save Status Indicator
            AutoSaveStatusIndicator(
                timeSinceLastSave: timeSinceLastSave,
                isSaving: isSaving,
                onSaveError: saveError
            )
            .padding(.horizontal)

            // Settings Button
            Button(action: { showSettings = true }) {
                HStack {
                    Image(systemName: "gearshape")
                    Text("Auto-Save Settings")
                }
                .font(.caption)
                .foregroundColor(.blue)
            }

            Text("App is ready to build!")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .onAppear {
            // setupAutoSave()
        }
        .sheet(isPresented: $showSettings) {
            // AutoSaveSettingsView()
            Text("Auto-save settings coming soon!")
        }
        .sheet(isPresented: $showDemoSongs) {
            DemoSongBrowserView()
        }
        .overlay(crashRecoveryOverlay)
    }

    // MARK: - Auto-Save Setup

    private func setupAutoSave() {
        // Create a test song for demonstration
        let testSong = Song(
            id: "demo-song",
            name: "Demo Song",
            version: "1.0",
            metadata: SongMetadata(
                tempo: 120.0,
                timeSignature: [4, 4],
                duration: nil,
                key: nil,
                tags: []
            ),
            sections: [],
            roles: [],
            projections: [],
            mixGraph: MixGraph(
                tracks: [],
                buses: [],
                sends: [],
                master: MixMasterConfig(
                    volume: 0.8,
                    sampleRate: 44100,
                    bufferSize: 512
                )
            ),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(seconds: 4.0),
                lookaheadDuration: MusicalTime(seconds: 2.0),
                determinismMode: .seeded
            ),
            determinismSeed: "demo-seed",
            createdAt: Date(),
            updatedAt: Date()
        )

        // Start auto-save with event callback
        /*
        Task {
            await autoSaveManager.startAutoSave(
                for: testSong,
                interval: 30,
                eventCallback: { event in
                    handleAutoSaveEvent(event)
                }
            )
        }
         */
    }

    /*
    private func handleAutoSaveEvent(_ event: AutoSaveManager.AutoSaveEvent) {
        switch event {
        case .saved(let timeInterval):
            DispatchQueue.main.async {
                self.timeSinceLastSave = timeInterval
                self.isSaving = false
                self.saveError = nil
                NSLog("AutoSave: Saved successfully - \(timeInterval)s ago")
            }

        case .failed(let error):
            DispatchQueue.main.async {
                self.isSaving = false
                self.saveError = error
                NSLog("AutoSave: Save failed - \(error)")
            }

        case .restored(let version):
            NSLog("AutoSave: Restored version \(version)")

        case .crashDetected(let version):
            DispatchQueue.main.async {
                self.crashVersion = version
                self.showCrashRecovery = true
                NSLog("AutoSave: Crash detected - version \(version)")
            }
        }
    }
    */
    // MARK: - Crash Recovery Overlay

    @ViewBuilder
    private var crashRecoveryOverlay: some View {
        if showCrashRecovery {
            ZStack {
                // Semi-transparent background
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        // Prevent dismissal by tapping outside
                    }

                // Crash recovery dialog
                /*
                CrashRecoveryView(
                    autoSaveVersion: crashVersion,
                    onRestore: {
                        NSLog("AutoSave: User chose to restore from crash")
                        Task {
                            do {
                                _ = try await autoSaveManager.restoreFromAutoSave(version: crashVersion)
                                DispatchQueue.main.async {
                                    showCrashRecovery = false
                                }
                            } catch {
                                NSLog("AutoSave: Restore failed - \(error)")
                            }
                        }
                    },
                    onDismiss: {
                        NSLog("AutoSave: User chose to dismiss crash recovery")
                        showCrashRecovery = false
                    }
                )
                .padding()
                 */
                Text("Crash recovery coming soon!")
                    .padding()
            }
            .transition(.opacity)
        }
    }
}

#Preview {
    ContentView()
}
