//
//  AutoSaveSettingsView.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Auto Save Settings View
// =============================================================================

/**
 Settings panel for auto-save configuration.

 Allows users to:
 - Enable/disable auto-save
 - Configure save interval
 - Set maximum versions to keep
 - Toggle notifications
 - Enable battery conservation
 */
public struct AutoSaveSettingsView: View {

    // MARK: - Properties

    @Binding var configuration: AutoSaveManager.Configuration
    @SwiftUI.Environment(\.dismiss) private var dismiss: DismissAction

    @State private var isShowingDeleteConfirmation = false

    // MARK: - Body

    public var body: some View {
        NavigationView {
            List {
                // Enable/Disable
                Toggle("Enable Auto-Save", isOn: $configuration.isEnabled)
                    .onChange(of: configuration.isEnabled) { _ in
                        HapticManager.shared.notificationOccurred(.success)
                    }

                if configuration.isEnabled {
                    Text("Automatically save your work to prevent data loss")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Save Interval
                if configuration.isEnabled {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Every")
                            Spacer()
                            Text("\(Int(configuration.interval)) seconds")
                                .foregroundColor(.secondary)
                        }

                        Slider(
                            value: $configuration.interval,
                            in: 10...300,
                            step: 10
                        )
                        .onChange(of: configuration.interval) { _ in
                            HapticManager.shared.selectionChanged()
                        }

                        Text("How often to auto-save (10s - 5min)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Picker("Interval", selection: $configuration.interval) {
                        Text("10 seconds").tag(TimeInterval(10))
                        Text("30 seconds").tag(TimeInterval(30))
                        Text("1 minute").tag(TimeInterval(60))
                        Text("5 minutes").tag(TimeInterval(300))
                    }
                    .pickerStyle(.segmented)

                    // History
                    Text("History")
                        .font(.headline)
                        .padding(.top, 8)

                    Stepper(
                        "Maximum versions: \(configuration.maxVersions)",
                        value: $configuration.maxVersions,
                        in: 1...50
                    )
                    .onChange(of: configuration.maxVersions) { _ in
                        HapticManager.shared.selectionChanged()
                    }

                    Text("Older versions will be deleted automatically")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    // Notifications
                    Text("Notifications")
                        .font(.headline)
                        .padding(.top, 8)

                    Toggle("Show save notifications", isOn: $configuration.showNotifications)
                        .onChange(of: configuration.showNotifications) { _ in
                            HapticManager.shared.notificationOccurred(.success)
                        }

                    if configuration.showNotifications {
                        Text("Display \"Saved X seconds ago\" indicator")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    // Battery Conservation (iOS only)
                    #if os(iOS)
                    Text("Battery")
                        .font(.headline)
                        .padding(.top, 8)

                    Toggle("Conserve battery", isOn: $configuration.conserveBattery)
                        .onChange(of: configuration.conserveBattery) { _ in
                            HapticManager.shared.notificationOccurred(.success)
                        }

                    if configuration.conserveBattery {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "bolt.fill")
                                    .font(.caption)
                                Text("Reduce auto-save frequency in low power mode")
                                    .font(.caption)
                            }
                            .foregroundColor(.secondary)
                        }
                    }
                    #endif

                    // File Size Limit
                    Text("File Size Limit")
                        .font(.headline)
                        .padding(.top, 8)

                    HStack {
                        Text("Maximum file size")
                        Spacer()
                        Text("\(configuration.maxFileSize / 1_000_000) MB")
                            .foregroundColor(.secondary)
                    }

                    Text("Files larger than this won't be auto-saved")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Info
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.blue)
                        Text("About Auto-Save")
                            .font(.headline)
                    }

                    Text("Auto-save creates backup copies of your work at regular intervals. If the app crashes, you can restore from the last auto-save version.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Auto-Save Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// =============================================================================
// MARK: - Haptic Manager (Helper)
// =============================================================================

/**
 Simple haptic feedback manager for better UX
 */
private actor HapticManager {
    static let shared = HapticManager()

    private init() {}

    func notificationOccurred(_ notificationType: UINotificationFeedbackGenerator.FeedbackType) {
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(notificationType)
        #endif
    }

    func selectionChanged() {
        #if os(iOS)
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
        #endif
    }

    func impactOccurred(_ intensity: CGFloat = 1.0) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred(intensity: intensity)
        #endif
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#Preview {
    AutoSaveSettingsView(
        configuration: .constant(AutoSaveManager.Configuration())
    )
}
