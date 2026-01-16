//
//  ErrorAlert.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Error Alert
// =============================================================================

/**
 A user-friendly error display component

 Platform adaptations:
 - iOS: Alert with action buttons
 - macOS: Alert with detail text
 - tvOS: Simple alert with large text

 - Parameters:
   - Error: Error to display
   - Message: Optional custom message
   - OnDismiss: Optional dismiss callback
 */
public struct ErrorAlert: View {

    // MARK: - Properties

    let error: Error
    let message: String?
    let onDismiss: (() -> Void)?

    @State private var isPresented = true

    // MARK: - Initialization

    public init(
        error: Error,
        message: String? = nil,
        onDismiss: (() -> Void)? = nil
    ) {
        self.error = error
        self.message = message
        self.onDismiss = onDismiss
    }

    // MARK: - Body

    public var body: some View {
        #if os(tvOS)
        // tvOS uses custom alert
        tvCustomAlert
        #else
        // iOS/macOS use standard alert
        standardAlert
        #endif
    }

    // MARK: - Standard Alert

    private var standardAlert: some View {
        EmptyView()
            .alert(
                errorTitle,
                isPresented: $isPresented,
                presenting: error
            ) { _ in
                Button("OK") {
                    dismiss()
                }
            } message: { _ in
                if let message = message ?? errorMessage {
                    Text(message)
                }
            }
    }

    // MARK: - tvOS Custom Alert

    private var tvCustomAlert: some View {
        ZStack {
            // Background
            Color.black.opacity(0.8)
                .ignoresSafeArea()

            // Content
            VStack(spacing: Spacing.xLarge) {
                // Error icon
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.error)

                // Title
                Text(errorTitle)
                    .font(.displayLarge)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                // Message
                if let message = message ?? errorMessage {
                    Text(message)
                        .font(.bodyLarge)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(5)
                }

                // Dismiss button
                Button(action: dismiss) {
                    Text("OK")
                        .font(.labelLarge)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.xxLarge)
                        .padding(.vertical, Spacing.large)
                        .background(Color.brand)
                        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium))
                }
                .tvFocusable()
            }
            .padding(.uniform(Spacing.xxLarge))
            .background(Color.secondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge))
            .padding(.uniform(Spacing.xxLarge))
        }
        .transition(.opacity)
    }

    // MARK: - Computed Properties

    private var errorTitle: String {
        // Try to extract localized description
        let nsError = error as NSError
        return nsError.localizedFailureReason ?? "Error"
    }

    private var errorMessage: String? {
        // Try to extract user-friendly message
        let nsError = error as NSError
        return nsError.localizedDescription
    }

    // MARK: - Actions

    private func dismiss() {
        isPresented = false
        onDismiss?()
    }
}

// =============================================================================
// MARK: - View Extension
// =============================================================================

public extension View {

    /**
     Present error alert

     - Parameters:
       - error: Error to display
       - message: Optional custom message
       - onDismiss: Optional dismiss callback
     */
    func errorAlert(
        error: Error,
        message: String? = nil,
        onDismiss: (() -> Void)? = nil
    ) -> some View {
        self.overlay(
            ErrorAlert(
                error: error,
                message: message,
                onDismiss: onDismiss
            )
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct ErrorAlert_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Standard error
            ErrorAlert(
                error: NSError(
                    domain: "TestDomain",
                    code: 1,
                    userInfo: [
                        NSLocalizedDescriptionKey: "Something went wrong",
                        NSLocalizedFailureReasonErrorKey: "Network Error"
                    ]
                ),
                message: "Please check your connection and try again."
            )
            .previewDisplayName("Standard Error")

            // Simple error
            ErrorAlert(
                error: NSError(
                    domain: "TestDomain",
                    code: 2,
                    userInfo: [
                        NSLocalizedDescriptionKey: "File not found"
                    ]
                )
            )
            .previewDisplayName("Simple Error")
        }
    }
}
#endif
