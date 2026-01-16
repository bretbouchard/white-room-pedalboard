//
//  CrashRecoveryView.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Crash Recovery View
// =============================================================================

/**
 User interface for crash recovery dialog.

 Presented when a crash is detected on app startup, offering to restore
 the auto-saved version of the song.
 */
public struct CrashRecoveryView: View {

    // MARK: - Properties

    let autoSaveVersion: Int
    let onRestore: () -> Void
    let onDismiss: () -> Void

    @State private var isShowingDetails = false

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            // Title
            Text("Crash Detected")
                .font(.title)
                .fontWeight(.bold)

            // Description
            Text("It looks like the app crashed during your last session. We've saved your work and can restore it for you.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            // Auto-save info
            VStack(spacing: 12) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Auto-save available")
                        .font(.subheadline)
                }

                HStack {
                    Text("Version \(autoSaveVersion)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
            .padding()
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(8)

            // Details toggle
            Button(action: { isShowingDetails.toggle() }) {
                HStack {
                    Text("What happens when I restore?")
                        .font(.caption)
                    Image(systemName: isShowingDetails ? "chevron.up" : "chevron.down")
                        .font(.caption)
                }
                .foregroundColor(.blue)
            }

            if isShowingDetails {
                VStack(alignment: .leading, spacing: 8) {
                    Text("When you restore:")
                        .font(.caption)
                        .fontWeight(.bold)

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .top) {
                            Image(systemName: "checkmark")
                                .font(.caption)
                            Text("Your song will be restored to the last auto-saved version")
                                .font(.caption)
                        }
                        HStack(alignment: .top) {
                            Image(systemName: "checkmark")
                                .font(.caption)
                            Text("Any changes after the last auto-save will be lost")
                                .font(.caption)
                        }
                        HStack(alignment: .top) {
                            Image(systemName: "checkmark")
                                .font(.caption)
                            Text("You can continue working normally")
                                .font(.caption)
                        }
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(8)
            }

            // Actions
            HStack(spacing: 16) {
                Button(action: onDismiss) {
                    Text("Start Fresh")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())

                Button(action: onRestore) {
                    Text("Restore Auto-Save")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(32)
        .frame(maxWidth: 500)
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#Preview {
    CrashRecoveryView(
        autoSaveVersion: 3,
        onRestore: {},
        onDismiss: {}
    )
}
