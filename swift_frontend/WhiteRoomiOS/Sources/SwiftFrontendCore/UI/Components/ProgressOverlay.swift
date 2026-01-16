//
//  ProgressOverlay.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

/**
 Full-screen loading overlay for async operations.
 */
public struct ProgressOverlay: View {
    public init() {}

    public var body: some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            // Progress indicator
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))

                Text("Loading...")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.8))
            )
        }
    }
}

#if DEBUG
struct ProgressOverlay_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.gray

            ProgressOverlay()
        }
    }
}
#endif
