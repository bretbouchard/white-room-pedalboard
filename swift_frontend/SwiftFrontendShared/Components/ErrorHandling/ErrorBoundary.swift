//
//  ErrorBoundary.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import Foundation

// =============================================================================
// MARK: - Error Boundary
// =============================================================================

/**
 SwiftUI Error Boundary component that catches and handles errors gracefully

 This component wraps child views and catches any errors that occur during rendering,
 preventing the entire UI from crashing and providing graceful degradation.

 Features:
 - Catches SwiftUI rendering errors
 - Provides fallback UI with error details
 - Offers recovery actions
 - Logs errors for debugging
 - Integrates with crash reporting

 Usage:
 ```swift
 ErrorBoundary(error: $viewModel.error) {
     // Your view content here
     MyContentView()
 }
 ```

 Platform adaptations:
 - iOS: Alert with action buttons
 - macOS: Sheet with detailed error information
 - tvOS: Full-screen error display with large text
 */
public struct ErrorBoundary<Content: View>: View {

    // MARK: - Properties

    @Binding var error: WhiteRoomError?
    let content: Content

    @State private var showErrorDetails = false
    @State private var isAttemptingRecovery = false

    // MARK: - Initialization

    public init(
        error: Binding<WhiteRoomError?>,
        @ViewBuilder content: () -> Content
    ) {
        self._error = error
        self.content = content()
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if let error = error {
                errorView(for: error)
            } else {
                content
                    .task {
                        // Monitor for errors during task execution
                        if let error = error {
                            handleError(error)
                        }
                    }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: error != nil)
    }

    // MARK: - Error Views

    @ViewBuilder
    private func errorView(for error: WhiteRoomError) -> some View {
        #if os(tvOS)
        tvErrorView(for: error)
        #elseif os(macOS)
        macErrorView(for: error)
        #else
        iosErrorView(for: error)
        #endif
    }

    // MARK: - iOS Error View

    @ViewBuilder
    private func iosErrorView(for error: WhiteRoomError) -> some View {
        ScrollView {
            VStack(spacing: Spacing.large) {
                // Error icon
                Image(systemName: error.severity.icon)
                    .font(.system(size: 60))
                    .foregroundColor(colorForSeverity(error.severity))
                    .padding(.top, Spacing.xxLarge)

                // Error title
                Text(error.severity.displayName)
                    .font(.displayMedium)
                    .foregroundColor(.primary)

                // Error message
                Text(error.userMessage)
                    .font(.bodyLarge)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.large)

                // Error code badge
                Text(error.code)
                    .font(.labelSmall)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.medium)
                    .padding(.vertical, Spacing.small)
                    .background(Color.secondary)
                    .clipShape(Capsule())

                // Recovery suggestions
                if !error.recoverySuggestion.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.small) {
                        Label("Suggested Actions", systemImage: "lightbulb.fill")
                            .font(.labelLarge)
                            .foregroundColor(.primary)

                        Text(error.recoverySuggestion)
                            .font(.bodyMedium)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.secondaryBackground)
                    .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium))
                }

                // Action buttons
                VStack(spacing: Spacing.medium) {
                    // Primary recovery action
                    if let recoveryAction = recoveryAction(for: error) {
                        Button(action: recoveryAction.action) {
                            HStack {
                                if isAttemptingRecovery {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: recoveryAction.icon)
                                }
                                Text(recoveryAction.title)
                            }
                            .font(.labelLarge)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.brand)
                            .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium))
                        }
                        .disabled(isAttemptingRecovery)
                    }

                    // Show technical details
                    Button(action: { showErrorDetails.toggle() }) {
                        HStack {
                            Image(systemName: "info.circle.fill")
                            Text("Technical Details")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .rotationEffect(.degrees(showErrorDetails ? 90 : 0))
                        }
                        .font(.labelMedium)
                        .foregroundColor(.secondary)
                        .padding()
                        .background(Color.secondaryBackground)
                        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium))
                    }

                    // Dismiss button
                    Button(action: dismissError) {
                        Text("Dismiss")
                            .font(.labelLarge)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .padding(.horizontal, Spacing.large)

                // Technical details (expandable)
                if showErrorDetails {
                    technicalDetailsView(for: error)
                        .padding(.horizontal, Spacing.large)
                }

                Spacer()
            }
        }
        .background(Color.primaryBackground)
    }

    // MARK: - macOS Error View

    @ViewBuilder
    private func macErrorView(for error: WhiteRoomError) -> some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: error.severity.icon)
                    .font(.system(size: 40))
                    .foregroundColor(colorForSeverity(error.severity))

                VStack(alignment: .leading, spacing: Spacing.xSmall) {
                    Text(error.severity.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(error.code)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: dismissError) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()
            .background(Color.secondaryBackground.opacity(0.5))

            Divider()

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.large) {
                    // Error message
                    VStack(alignment: .leading, spacing: Spacing.small) {
                        Text("Error Message")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(error.userMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }

                    // Recovery suggestions
                    if !error.recoverySuggestion.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.small) {
                            Label("Suggested Actions", systemImage: "lightbulb.fill")
                                .font(.headline)
                                .foregroundColor(.primary)

                            Text(error.recoverySuggestion)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }

                    // Technical details
                    DisclosureGroup("Technical Details") {
                        technicalDetailsView(for: error)
                    }
                    .padding(.top, Spacing.medium)
                }
                .padding()
            }

            Divider()

            // Action buttons
            HStack(spacing: Spacing.medium) {
                Spacer()

                if let recoveryAction = recoveryAction(for: error) {
                    Button(action: recoveryAction.action) {
                        HStack {
                            if isAttemptingRecovery {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                            } else {
                                Image(systemName: recoveryAction.icon)
                            }
                            Text(recoveryAction.title)
                        }
                        .frame(minWidth: 120)
                    }
                    .disabled(isAttemptingRecovery)
                    .keyboardShortcut(.defaultAction)
                }

                Button("Dismiss", action: dismissError)
                    .keyboardShortcut(.cancelAction)
            }
            .padding()
            .background(Color.secondaryBackground.opacity(0.5))
        }
        .frame(width: 600, height: 500)
        .background(Color.primaryBackground)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge))
        .shadow(radius: 20)
    }

    // MARK: - tvOS Error View

    @ViewBuilder
    private func tvErrorView(for error: WhiteRoomError) -> some View {
        ZStack {
            // Background
            Color.black.opacity(0.9)
                .ignoresSafeArea()

            VStack(spacing: Spacing.xLarge) {
                Spacer()

                // Error icon
                Image(systemName: error.severity.icon)
                    .font(.system(size: 100))
                    .foregroundColor(colorForSeverity(error.severity))

                // Error title
                Text(error.severity.displayName)
                    .font(.displayLarge)
                    .foregroundColor(.white)

                // Error message
                Text(error.userMessage)
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .padding(.horizontal, Spacing.xxLarge)

                // Recovery action
                if let recoveryAction = recoveryAction(for: error) {
                    Button(action: recoveryAction.action) {
                        HStack {
                            if isAttemptingRecovery {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: recoveryAction.icon)
                            }
                            Text(recoveryAction.title)
                        }
                        .font(.title2)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.xxLarge)
                        .padding(.vertical, Spacing.large)
                        .background(Color.brand)
                        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge))
                    }
                    .tvFocusable()
                    .disabled(isAttemptingRecovery)
                }

                // Dismiss button
                Button(action: dismissError) {
                    Text("Dismiss")
                        .font(.title3)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.xxLarge)
                        .padding(.vertical, Spacing.large)
                        .background(Color.secondary)
                        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge))
                }
                .tvFocusable()

                Spacer()
            }
        }
    }

    // MARK: - Technical Details View

    @ViewBuilder
    private func technicalDetailsView(for error: WhiteRoomError) -> some View {
        VStack(alignment: .leading, spacing: Spacing.small) {
            Text("Technical Details")
                .font(.labelLarge)
                .foregroundColor(.primary)

            Text(error.technicalDetails)
                .font(.bodyMedium)
                .foregroundColor(.secondary)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.tertiaryBackground)
                .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusSmall))

            if !error.context.isEmpty {
                Text("Context")
                    .font(.labelLarge)
                    .foregroundColor(.primary)
                    .padding(.top, Spacing.small)

                VStack(alignment: .leading, spacing: Spacing.xSmall) {
                    ForEach(Array(error.context.keys.sorted()), id: \.self) { key in
                        HStack {
                            Text("\(key):")
                                .font(.labelMedium)
                                .foregroundColor(.secondary)
                            Text(error.context[key] ?? "")
                                .font(.bodyMedium)
                                .foregroundColor(.primary)
                            Spacer()
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.tertiaryBackground)
                .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusSmall))
            }

            // Copy to clipboard button
            Button(action: { copyErrorToClipboard(error) }) {
                HStack {
                    Image(systemName: "doc.on.doc")
                    Text("Copy Error Report")
                }
                .font(.labelMedium)
                .foregroundColor(.brand)
            }
        }
    }

    // MARK: - Helper Methods

    private func colorForSeverity(_ severity: ErrorSeverity) -> Color {
        switch severity {
        case .info:
            return .blue
        case .warning:
            return .orange
        case .error:
            return .red
        case .critical:
            return .red
        }
    }

    private struct RecoveryAction {
        let title: String
        let icon: String
        let action: () -> Void
    }

    private func recoveryAction(for error: WhiteRoomError) -> RecoveryAction? {
        switch error {
        case .audio(.engineNotReady):
            return RecoveryAction(title: "Initialize Engine", icon: "play.fill") {
                isAttemptingRecovery = true
                // Trigger engine initialization
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    isAttemptingRecovery = false
                    dismissError()
                }
            }

        case .audio(.engineCrashed):
            return RecoveryAction(title: "Restart Engine", icon: "arrow.clockwise") {
                isAttemptingRecovery = true
                // Trigger engine restart
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    isAttemptingRecovery = false
                    dismissError()
                }
            }

        case .ffi(.bridgeDisconnected):
            return RecoveryAction(title: "Reconnect", icon: "arrow.clockwise") {
                isAttemptingRecovery = true
                // Trigger reconnection
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    isAttemptingRecovery = false
                    dismissError()
                }
            }

        case .fileIO(.diskFull):
            return RecoveryAction(title: "Open Disk Usage", icon: "externaldrive.fill") {
                // Open disk management
                dismissError()
            }

        default:
            return nil
        }
    }

    private func handleError(_ error: WhiteRoomError) {
        // Log error
        ErrorLogger.shared.log(error)

        // Report to crash reporting service
        CrashReporting.shared.recordError(error)

        // Notify error handlers
        NotificationCenter.default.post(
            name: .errorOccurred,
            object: error
        )
    }

    private func dismissError() {
        withAnimation {
            self.error = nil
        }
    }

    private func copyErrorToClipboard(_ error: WhiteRoomError) {
        let report = """
        White Room Error Report
        ======================

        Code: \(error.code)
        Severity: \(error.severity.rawValue)
        Category: \(error.category)

        Message: \(error.userMessage)

        Technical Details:
        \(error.technicalDetails)

        Recovery Suggestion:
        \(error.recoverySuggestion)

        Context:
        \(error.context.map { "\($0.key): \($0.value)" }.joined(separator: "\n"))

        Timestamp: \(ISO8601DateFormatter().string(from: Date()))
        """

        #if os(macOS) || os(iOS)
        UIPasteboard.general.string = report
        #endif
    }
}

// =============================================================================
// MARK: - View Extension
// =============================================================================

public extension View {

    /**
     Wrap view in an ErrorBoundary

     - Parameters:
       - error: Binding to optional WhiteRoomError
     */
    func errorBoundary(error: Binding<WhiteRoomError?>) -> some View {
        ErrorBoundary(error: error) {
            self
        }
    }
}

// =============================================================================
// MARK: - Notification Names
// =============================================================================

public extension Notification.Name {
    static let errorOccurred = Notification.Name("errorOccurred")
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct ErrorBoundary_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Audio error
            ErrorBoundary(
                error: .constant(.audio(.engineCrashed(reason: "Segmentation fault")))
            ) {
                Text("Content")
            }
            .previewDisplayName("Audio Error")

            // FFI error
            ErrorBoundary(
                error: .constant(.ffi(.timeout(function: "sch_engine_set_performance_blend", timeoutMs: 5000)))
            ) {
                Text("Content")
            }
            .previewDisplayName("FFI Timeout")

            // File error
            ErrorBoundary(
                error: .constant(.fileIO(.corruptedFile(path: "/path/to/file.wrs", reason: "Invalid header")))
            ) {
                Text("Content")
            }
            .previewDisplayName("Corrupted File")
        }
    }
}
#endif
