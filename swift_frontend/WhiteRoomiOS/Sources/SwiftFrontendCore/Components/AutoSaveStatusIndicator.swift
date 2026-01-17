//
//  AutoSaveStatusIndicator.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Auto Save Status Indicator
// =============================================================================

/**
 Visual indicator showing auto-save status.

 Displays "Last saved X seconds ago" with visual feedback when auto-save occurs.
 Can be integrated into the main song editor view.
 */
public struct AutoSaveStatusIndicator: View {

    // MARK: - Properties

    let timeSinceLastSave: TimeInterval?
    let isSaving: Bool
    let onSaveError: (Error?)?

    @State private var isPulsing = false

    // MARK: - Computed Properties

    private var statusText: String {
        if isSaving {
            return "Saving..."
        } else if let error = onSaveError, let unwrappedError = error {
            return "Save failed: \(unwrappedError.localizedDescription)"
        } else if let timeInterval = timeSinceLastSave {
            if timeInterval < 60 {
                return "Saved \(Int(timeInterval))s ago"
            } else if timeInterval < 3600 {
                let minutes = Int(timeInterval / 60)
                return "Saved \(minutes)m ago"
            } else {
                let hours = Int(timeInterval / 3600)
                return "Saved \(hours)h ago"
            }
        } else {
            return "Not saved"
        }
    }

    private var statusColor: Color {
        if isSaving {
            return .blue
        } else if onSaveError != nil {
            return .red
        } else if let timeInterval = timeSinceLastSave, timeInterval < 60 {
            return .green
        } else {
            return .secondary
        }
    }

    private var iconName: String {
        if isSaving {
            return "arrow.triangle.2.circlepath"
        } else if onSaveError != nil {
            return "exclamationmark.circle.fill"
        } else if let timeInterval = timeSinceLastSave, timeInterval < 60 {
            return "checkmark.circle.fill"
        } else {
            return "clock"
        }
    }

    // MARK: - Body

    public var body: some View {
        HStack(spacing: 8) {
            Image(systemName: iconName)
                .font(.caption)
                .foregroundColor(statusColor)
                .modifier(SymbolEffectModifier(isActive: isSaving))
                .animation(.easeInOut(duration: 0.3), value: isSaving)

            Text(statusText)
                .font(.caption)
                .foregroundColor(statusColor)

            // Pulsing dot when saving
            if isSaving {
                Circle()
                    .fill(statusColor)
                    .frame(width: 6, height: 6)
                    .opacity(isPulsing ? 1 : 0.3)
                    .animation(.easeInOut(duration: 0.8).repeatForever(), value: isPulsing)
                    .onAppear {
                        isPulsing = true
                    }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.1))
        .cornerRadius(12)
        .transition(.opacity)
    }
}

// =============================================================================
// MARK: - Compact Variant
// =============================================================================

/**
 Compact version of the auto-save indicator for use in tight spaces.
 */
public struct AutoSaveStatusIndicatorCompact: View {

    let timeSinceLastSave: TimeInterval?
    let isSaving: Bool

    private var iconName: String {
        if isSaving {
            return "arrow.triangle.2.circlepath"
        } else if let timeInterval = timeSinceLastSave, timeInterval < 60 {
            return "checkmark.circle.fill"
        } else {
            return "clock"
        }
    }

    private var statusColor: Color {
        if isSaving {
            return .blue
        } else if let timeInterval = timeSinceLastSave, timeInterval < 60 {
            return .green
        } else {
            return .secondary
        }
    }

    public var body: some View {
        Image(systemName: iconName)
            .font(.caption)
            .foregroundColor(statusColor)
            .modifier(SymbolEffectModifier(isActive: isSaving))
    }
}

// =============================================================================
// MARK: - Detailed Variant
// =============================================================================

/**
 Detailed version showing full auto-save history.
 */
public struct AutoSaveStatusIndicatorDetailed: View {

    let saveHistory: [AutoSaveManager.AutoSaveState]
    let isSaving: Bool

    @State private var isShowingHistory = false

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Current status
            AutoSaveStatusIndicator(
                timeSinceLastSave: saveHistory.last.map { state in Date().timeIntervalSince(state.savedAt) },
                isSaving: isSaving,
                onSaveError: nil
            )

            // History button
            if !saveHistory.isEmpty {
                Button(action: { isShowingHistory.toggle() }) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                        Text("View History (\(saveHistory.count))")
                            .font(.caption)
                    }
                    .foregroundColor(.blue)
                }
            }
        }
        .sheet(isPresented: $isShowingHistory) {
            AutoSaveHistoryView(saveHistory: saveHistory)
        }
    }
}

// =============================================================================
// MARK: - Auto Save History View
// =============================================================================

/**
 Modal view showing auto-save history with restore options.
 */
public struct AutoSaveHistoryView: View {

    let saveHistory: [AutoSaveManager.AutoSaveState]
    @SwiftUI.Environment(\.dismiss) private var dismiss

    public var body: some View {
        NavigationView {
            List {
                if saveHistory.isEmpty {
                    Text("No auto-save history")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(saveHistory.reversed(), id: \.version) { state in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("Version \(state.version)")
                                    .font(.headline)
                                Spacer()
                                Text(formatDate(state.savedAt))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Text("\(state.fileSize / 1024) KB")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            if state.isCrashRecovery {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                    Text("Crash recovery")
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Auto-Save History")
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

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// =============================================================================
// MARK: - Previews
// =============================================================================

#Preview("Normal Status") {
    VStack(spacing: 16) {
        AutoSaveStatusIndicator(
            timeSinceLastSave: 15,
            isSaving: false,
            onSaveError: nil
        )

        AutoSaveStatusIndicator(
            timeSinceLastSave: 90,
            isSaving: false,
            onSaveError: nil
        )

        AutoSaveStatusIndicator(
            timeSinceLastSave: nil,
            isSaving: false,
            onSaveError: nil
        )
    }
    .padding()
}

#Preview("Saving Status") {
    AutoSaveStatusIndicator(
        timeSinceLastSave: 30,
        isSaving: true,
        onSaveError: nil
    )
    .padding()
}

#Preview("Error Status") {
    AutoSaveStatusIndicator(
        timeSinceLastSave: 45,
        isSaving: false,
        onSaveError: NSError(domain: "AutoSave", code: 1, userInfo: [NSLocalizedDescriptionKey: "Disk full"])
    )
    .padding()
}

#Preview("Compact") {
    HStack(spacing: 20) {
        AutoSaveStatusIndicatorCompact(
            timeSinceLastSave: 15,
            isSaving: false
        )

        AutoSaveStatusIndicatorCompact(
            timeSinceLastSave: 90,
            isSaving: false
        )

        AutoSaveStatusIndicatorCompact(
            timeSinceLastSave: nil,
            isSaving: true
        )
    }
    .padding()
}

#Preview("Detailed") {
    AutoSaveStatusIndicatorDetailed(
        saveHistory: [
            AutoSaveManager.AutoSaveState(
                songId: "song1",
                autoSavePath: "/tmp/song1_v1.json",
                savedAt: Date().addingTimeInterval(-3600),
                fileSize: 1024 * 50,
                version: 1
            ),
            AutoSaveManager.AutoSaveState(
                songId: "song1",
                autoSavePath: "/tmp/song1_v2.json",
                savedAt: Date().addingTimeInterval(-1800),
                fileSize: 1024 * 55,
                version: 2
            ),
            AutoSaveManager.AutoSaveState(
                songId: "song1",
                autoSavePath: "/tmp/song1_v3.json",
                savedAt: Date().addingTimeInterval(-60),
                fileSize: 1024 * 60,
                version: 3
            )
        ],
        isSaving: false
    )
    .padding()
}

// =============================================================================
// MARK: - iOS 17+ Symbol Effect Wrapper
// =============================================================================

/**
 iOS 17+ symbol effect wrapper with fallback for iOS 15+
 */
private struct SymbolEffectModifier: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.symbolEffect(.bounce, value: isActive)
        } else {
            content
        }
    }
}
