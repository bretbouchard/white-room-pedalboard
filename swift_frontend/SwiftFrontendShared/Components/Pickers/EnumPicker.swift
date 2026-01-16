//
//  EnumPicker.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Enum Picker
// =============================================================================

/**
 A generic enum picker with platform-appropriate UI

 Platform adaptations:
 - iOS: Wheel picker in compact, segmented control in regular
 - macOS: Popup button picker
 - tvOS: Focusable segmented control

 - Parameters:
   - Selection: Binding to enum value
   - Options: Array of enum cases
   - Label: Optional label for the picker
 */
public struct EnumPicker<T: Hashable & CaseIterable>: View where T.AllCases.Element == T {

    // MARK: - Properties

    @Binding private var selection: T
    private let options: [T]
    private let label: String?

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        selection: Binding<T>,
        options: [T] = Array(T.allCases),
        label: String? = nil
    ) {
        self._selection = selection
        self.options = options
        self.label = label
    }

    // MARK: - Body

    public var body: some View {
        if let label = label {
            VStack(alignment: .leading, spacing: Spacing.xSmall) {
                Text(label)
                    .font(.labelMedium)
                    .foregroundColor(.secondaryText)

                pickerContent
            }
        } else {
            pickerContent
        }
    }

    @ViewBuilder
    private var pickerContent: some View {
        #if os(tvOS)
        // tvOS: Segmented control
        tvPicker
        #elseif os(macOS)
        // macOS: Popup button
        macPicker
        #else
        // iOS: Adaptive based on size class
        if isCompact {
            iosWheelPicker
        } else {
            iosSegmentedPicker
        }
        #endif
    }

    // MARK: - iOS Wheel Picker

    private var iosWheelPicker: some View {
        Picker("", selection: $selection) {
            ForEach(options, id: \.self) { option in
                Text(displayName(for: option))
                    .tag(option)
            }
        }
        .pickerStyle(.wheel)
        .frame(height: 120)
    }

    // MARK: - iOS Segmented Picker

    private var iosSegmentedPicker: some View {
        Picker("", selection: $selection) {
            ForEach(options, id: \.self) { option in
                Text(displayName(for: option))
                    .tag(option)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - macOS Picker

    private var macPicker: some View {
        Picker("", selection: $selection) {
            ForEach(options, id: \.self) { option in
                Text(displayName(for: option))
                    .tag(option)
            }
        }
        .pickerStyle(.menu)
        .frame(height: Spacing.touchTargetComfortable)
    }

    // MARK: - tvOS Picker

    private var tvPicker: some View {
        HStack(spacing: Spacing.medium) {
            ForEach(options, id: \.self) { option in
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selection = option
                    }
                }) {
                    Text(displayName(for: option))
                        .font(.labelLarge)
                        .foregroundColor(selection == option ? .white : .primaryText)
                        .padding(.horizontal, Spacing.large)
                        .padding(.vertical, Spacing.medium)
                        .background(
                            RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
                                .fill(selection == option ? Color.brand : Color.secondaryBackground)
                        )
                }
                .buttonStyle(PlainButtonStyle())
                .tvFocusable()
            }
        }
    }

    // MARK: - Display Name

    private func displayName(for option: T) -> String {
        // Try to use displayName property if available
        let mirror = Mirror(reflecting: option)

        for child in mirror.children {
            if child.label == "displayName", let string = child.value as? String {
                return string
            }
        }

        // Fallback to string representation
        return String(describing: option)
    }
}

// =============================================================================
// MARK: - Convenience Initializers
// =============================================================================

public extension EnumPicker {

    /**
     Create enum picker with raw string values

     - Parameters:
       - selection: Binding to enum value
       - label: Optional label
     */
    init(
        selection: Binding<T>,
        label: String? = nil
    ) where T: RawRepresentable, T.RawValue == String {
        self.init(selection: selection, options: Array(T.allCases), label: label)
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct EnumPicker_Previews: PreviewProvider {
    enum TestEnum: String, CaseIterable {
        case option1 = "Option 1"
        case option2 = "Option 2"
        case option3 = "Option 3"

        var displayName: String {
            rawValue
        }
    }

    @State static var selection: TestEnum = .option1

    static var previews: some View {
        Group {
            // iOS - Compact
            EnumPicker(
                selection: $selection,
                label: "Select Option"
            )
            .previewDevice("iPhone SE (3rd generation)")
            .previewDisplayName("iOS - Compact")

            // iOS - Regular
            EnumPicker(
                selection: $selection,
                label: "Select Option"
            )
            .previewDevice("iPad Pro (12.9-inch)")
            .previewDisplayName("iOS - Regular")

            // macOS
            EnumPicker(
                selection: $selection,
                label: "Select Option"
            )
            .previewDevice("Mac Pro")
            .previewDisplayName("macOS")

            // tvOS
            EnumPicker(
                selection: $selection,
                label: "Select Option"
            )
            .previewDevice("Apple TV")
            .previewDisplayName("tvOS")
        }
        .padding()
    }
}
#endif
