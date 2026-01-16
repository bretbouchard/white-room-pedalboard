//
//  LoadingOverlay.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Loading Overlay
// =============================================================================

/**
 A full-screen overlay showing loading indicator with optional message

 Platform adaptations:
 - iOS: Centered spinner with blur background
 - macOS: Sheet-style loading indicator
 - tvOS: Large spinner with high contrast

 - Parameters:
   - IsLoading: Whether to show overlay
   - Message: Optional message to display
   - Progress: Optional progress value (0-1)
 */
public struct LoadingOverlay: View {

    // MARK: - Properties

    let isLoading: Bool
    let message: String?
    let progress: Double?

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        isLoading: Bool,
        message: String? = nil,
        progress: Double? = nil
    ) {
        self.isLoading = isLoading
        self.message = message
        self.progress = progress
    }

    // MARK: - Body

    public var body: some View {
        if isLoading {
            ZStack {
                // Background
                backgroundView

                // Content
                contentView
            }
            .transition(.opacity)
        }
    }

    // MARK: - Background View

    private var backgroundView: some View {
        #if os(tvOS)
        // tvOS - High contrast overlay
        Color.black.opacity(0.8)
        #elseif os(macOS)
        // macOS - Frosted glass
        Color.black.opacity(0.4)
            .background(.ultraThinMaterial)
        #else
        // iOS - Blur overlay
        Color.black.opacity(0.4)
            .blur(radius: 5)
        #endif
    }

    // MARK: - Content View

    private var contentView: some View {
        VStack(spacing: Spacing.large) {
            // Progress indicator
            if let progress = progress {
                progressView(progress)
            } else {
                spinnerView
            }

            // Message
            if let message = message {
                messageView(message)
            }
        }
        .padding(.uniform(Spacing.xLarge))
        .background(contentBackground)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge))
        .shadow(radius: Spacing.shadowLarge)
        .padding(.uniform(Spacing.xLarge))
    }

    // MARK: - Spinner View

    private var spinnerView: some View {
        ProgressView()
            .scaleEffect(spinnerScale)
            .tint(.brand)
    }

    private var spinnerScale: CGFloat {
        #if os(tvOS)
        return 3.0  // Much larger on tvOS
        #elseif os(macOS)
        return 1.5  // Slightly larger on macOS
        #else
        return isCompact ? 1.5 : 2.0
        #endif
    }

    // MARK: - Progress View

    private func progressView(_ progress: Double) -> some View {
        VStack(spacing: Spacing.small) {
            ZStack {
                Circle()
                    .stroke(Color.secondaryBackground, lineWidth: progressWidth)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        Color.brand,
                        style: StrokeStyle(lineWidth: progressWidth, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut, value: progress)
            }
            .frame(width: progressSize, height: progressSize)

            // Percentage
            Text("\(Int(progress * 100))%")
                .font(isCompact ? .displaySmall : .displayMedium)
                .fontWeight(.semibold)
                .foregroundColor(.brand)
        }
    }

    private var progressWidth: CGFloat {
        #if os(tvOS)
        return 12
        #elseif os(macOS)
        return 8
        #else
        return isCompact ? 6 : 8
        #endif
    }

    private var progressSize: CGFloat {
        #if os(tvOS)
        return 120
        #elseif os(macOS)
        return 80
        #else
        return isCompact ? 60 : 80
        #endif
    }

    // MARK: - Message View

    private func messageView(_ message: String) -> some View {
        Text(message)
            .font(isCompact ? .bodyLarge : .displaySmall)
            .foregroundColor(.primaryText)
            .multilineTextAlignment(.center)
            .lineLimit(3)
    }

    // MARK: - Content Background

    private var contentBackground: some View {
        #if os(tvOS)
        // tvOS - High contrast
        Color.black
        #elseif os(macOS)
        // macOS - Frosted glass
        Color.secondaryBackground.opacity(0.9)
            .background(.regularMaterial)
        #else
        // iOS - Semi-transparent
        Color.secondaryBackground.opacity(0.95)
        #endif
    }
}

// =============================================================================
// MARK: - View Extension
// =============================================================================

public extension View {

    /**
     Overlay loading indicator

     - Parameters:
       - isLoading: Whether to show overlay
       - message: Optional message
       - progress: Optional progress (0-1)
     */
    func loadingOverlay(
        isLoading: Bool,
        message: String? = nil,
        progress: Double? = nil
    ) -> some View {
        self.overlay(
            LoadingOverlay(
                isLoading: isLoading,
                message: message,
                progress: progress
            )
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct LoadingOverlay_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Basic loading
            LoadingOverlay(
                isLoading: true,
                message: "Loading performances..."
            )
            .previewDisplayName("Basic Loading")

            // Progress loading
            LoadingOverlay(
                isLoading: true,
                message: "Rendering audio...",
                progress: 0.65
            )
            .previewDisplayName("Progress Loading")

            // No message
            LoadingOverlay(
                isLoading: true
            )
            .previewDisplayName("No Message")
        }
    }
}
#endif
