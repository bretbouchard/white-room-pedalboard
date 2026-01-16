//
//  SuccessToast.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Success Toast
// =============================================================================

/**
 A non-intrusive success notification

 Platform adaptations:
 - iOS: Bottom toast with swipe-to-dismiss
 - macOS: Top-right notification
 - tvOS: Top-center banner with auto-dismiss

 - Parameters:
   - Message: Success message to display
   - Icon: Optional SF Symbol name
   - Duration: How long to show toast (seconds)
 */
public struct SuccessToast: View {

    // MARK: - Properties

    let message: String
    let icon: String?
    let duration: TimeInterval

    @State private var isVisible = false
    @State private var offset: CGFloat = 0

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        message: String,
        icon: String? = "checkmark.circle.fill",
        duration: TimeInterval = 3.0
    ) {
        self.message = message
        self.icon = icon
        self.duration = duration
    }

    // MARK: - Body

    public var body: some View {
        if isVisible {
            toastContent
                .onAppear {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        isVisible = true
                        offset = 0
                    }

                    // Auto-dismiss
                    DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isVisible = false
                            offset = toastOffset
                        }
                    }
                }
        }
    }

    // MARK: - Toast Content

    @ViewBuilder
    private var toastContent: some View {
        #if os(tvOS)
        tvToast
        #elseif os(macOS)
        macToast
        #else
        iosToast
        #endif
    }

    // MARK: - iOS Toast

    private var iosToast: some View {
        HStack(spacing: Spacing.medium) {
            // Icon
            if let icon = icon {
                Image(systemName: icon)
                    .font(isCompact ? .title3 : .title2)
                    .foregroundColor(.success)
            }

            // Message
            Text(message)
                .font(isCompact ? .bodyMedium : .bodyLarge)
                .foregroundColor(.white)

            Spacer()
        }
        .padding(.horizontal, Spacing.large)
        .padding(.vertical, Spacing.medium)
        .background(
            RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
                .fill(Color.success)
                .shadow(color: .success.opacity(0.3), radius: Spacing.shadowMedium, x: 0, y: Spacing.shadowSmall)
        )
        .padding(.horizontal, Spacing.medium)
        .padding(.bottom, Spacing.xLarge)
        .offset(y: offset)
        .gesture(
            DragGesture()
                .onEnded { value in
                    if value.translation.height < -50 {
                        dismiss()
                    }
                }
        )
    }

    // MARK: - macOS Toast

    private var macToast: some View {
        HStack(spacing: Spacing.medium) {
            // Icon
            if let icon = icon {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.success)
            }

            // Message
            Text(message)
                .font(.bodyLarge)
                .foregroundColor(.primaryText)

            Spacer()

            // Dismiss button
            Button(action: dismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(PlainButtonStyle())
            .macOSHover()
        }
        .padding(.horizontal, Spacing.large)
        .padding(.vertical, Spacing.medium)
        .background(
            RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
                .fill(Color.secondaryBackground)
                .shadow(color: .black.opacity(0.1), radius: Spacing.shadowMedium, x: 0, y: Spacing.shadowSmall)
        )
        .padding(.horizontal, Spacing.xLarge)
        .padding(.vertical, Spacing.medium)
        .frame(maxWidth: 400, alignment: .trailing)
        .offset(x: offset)
    }

    // MARK: - tvOS Toast

    private var tvToast: some View {
        VStack(spacing: Spacing.medium) {
            // Icon
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 60))
                    .foregroundColor(.success)
            }

            // Message
            Text(message)
                .font(.displayMedium)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .padding(.uniform(Spacing.xLarge))
        .background(
            RoundedRectangle(cornerRadius: Spacing.cornerRadiusLarge)
                .fill(Color.success)
                .shadow(color: .success.opacity(0.5), radius: Spacing.shadowLarge, x: 0, y: Spacing.shadowMedium)
        )
        .padding(.uniform(Spacing.xLarge))
        .offset(y: offset)
    }

    // MARK: - Offsets

    private var toastOffset: CGFloat {
        #if os(tvOS)
        return -100  // Slide up on tvOS
        #elseif os(macOS)
        return 400  // Slide out right on macOS
        #else
        return 150  // Slide down on iOS
        #endif
    }

    // MARK: - Dismiss

    private func dismiss() {
        withAnimation(.easeInOut(duration: 0.2)) {
            isVisible = false
            offset = toastOffset
        }
    }
}

// =============================================================================
// MARK: - View Extension
// =============================================================================

public extension View {

    /**
     Show success toast

     - Parameters:
       - message: Success message
       - icon: Optional SF Symbol
       - duration: Display duration in seconds
     */
    func successToast(
        message: String,
        icon: String? = "checkmark.circle.fill",
        duration: TimeInterval = 3.0
    ) -> some View {
        self.overlay(
            SuccessToast(
                message: message,
                icon: icon,
                duration: duration
            )
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct SuccessToast_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iOS toast
            SuccessToast(
                message: "Performance saved successfully"
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS")

            // macOS toast
            SuccessToast(
                message: "Export completed"
            )
            .previewDevice("Mac Pro")
            .previewDisplayName("macOS")

            // tvOS toast
            SuccessToast(
                message: "Song ordered successfully"
            )
            .previewDevice("Apple TV")
            .previewDisplayName("tvOS")
        }
    }
}
#endif
