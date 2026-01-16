//
//  AccessibleControls.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Accessible Slider
// =============================================================================

/**
 Accessible slider with VoiceOver support
 */
public struct AccessibleSlider: View {

    // MARK: - Properties

    @Binding private var value: Double
    private let range: ClosedRange<Double>
    private let label: String
    private let format: String

    // MARK: - Initialization

    public init(
        value: Binding<Double>,
        in range: ClosedRange<Double>,
        label: String,
        format: String = "%.2f"
    ) {
        self._value = value
        self.range = range
        self.label = label
        self.format = format
    }

    // MARK: - Body

    public var body: some View {
        HStack {
            Text(label)
                .accessibleTextStyle(.body)

            Spacer()

            Slider(value: $value, in: range)
                .accessibleLabel(label)
                .accessibleValue(String(format: format, value))
                .accessibleHint("Swipe up or down to adjust")
                .accessibleAdjustable()

            Text(String(format: format, value))
                .accessibleTextStyle(.body)
                .accessibleIgnore()
        }
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Accessible Toggle
// =============================================================================

/**
 Accessible toggle with VoiceOver support
 */
public struct AccessibleToggle: View {

    // MARK: - Properties

    @Binding private var isOn: Bool
    private let label: String

    // MARK: - Initialization

    public init(
        isOn: Binding<Bool>,
        label: String
    ) {
        self._isOn = isOn
        self.label = label
    }

    // MARK: - Body

    public var body: some View {
        Toggle(isOn: $isOn) {
            Text(label)
                .accessibleTextStyle(.body)
        }
        .accessibleLabel(label)
        .accessibleValue(isOn ? "On" : "Off")
        .accessibleHint("Double tap to toggle")
        .accessibleDynamicType()
        .accessibleTouchTarget()
    }
}

// =============================================================================
// MARK: - Accessible Picker
// =============================================================================

/**
 Accessible picker with VoiceOver support
 */
public struct AccessiblePicker: View {

    // MARK: - Properties

    @Binding private var selection: String
    private let label: String
    private let options: [String]

    // MARK: - Initialization

    public init(
        selection: Binding<String>,
        label: String,
        options: [String]
    ) {
        self._selection = selection
        self.label = label
        self.options = options
    }

    // MARK: - Body

    public var body: some View {
        Picker(label, selection: $selection) {
            ForEach(options, id: \.self) { option in
                Text(option).tag(option)
            }
        }
        .accessibleLabel(label)
        .accessibleValue(selection)
        .accessibleHint("Double tap to change selection")
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Accessible Button
// =============================================================================

/**
 Accessible button with VoiceOver support
 */
public struct AccessibleButton: View {

    // MARK: - Properties

    private let label: String
    private let hint: String?
    private let action: () -> Void
    private let systemImage: String?

    // MARK: - Initialization

    public init(
        label: String,
        hint: String? = nil,
        systemImage: String? = nil,
        action: @escaping () -> Void
    ) {
        self.label = label
        self.hint = hint
        self.action = action
        self.systemImage = systemImage
    }

    // MARK: - Body

    public var body: some View {
        Button(action: action) {
            HStack {
                if let systemImage = systemImage {
                    Image(systemName: systemImage)
                }
                Text(label)
            }
            .accessibleDynamicType()
        }
        .accessibleLabel(label)
        .accessibilityHint(hint ?? "Double tap to activate")
        .accessibleButton()
        .accessibleTouchTarget()
    }
}

// =============================================================================
// MARK: - Accessible Progress View
// =============================================================================

/**
 Accessible progress view with VoiceOver support
 */
public struct AccessibleProgressView: View {

    // MARK: - Properties

    private let value: Double?
    private let total: Double?
    private let label: String

    // MARK: - Initialization

    public init(
        value: Double? = nil,
        total: Double? = nil,
        label: String
    ) {
        self.value = value
        self.total = total
        self.label = label
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if let value = value, let total = total {
                ProgressView(value: value, total: total)
                    .accessibleLabel(label)
                    .accessibleValue("\(Int((value / total) * 100)) percent")
                    .accessibleHint("Loading")
            } else {
                ProgressView()
                    .accessibleLabel(label)
                    .accessibleHint("Loading")
            }
        }
        .accessibleAdjustable()
    }
}

// =============================================================================
// MARK: - Accessible Stepper
// =============================================================================

/**
 Accessible stepper with VoiceOver support
 */
public struct AccessibleStepper: View {

    // MARK: - Properties

    @Binding private var value: Int
    private let range: ClosedRange<Int>
    private let label: String

    // MARK: - Initialization

    public init(
        value: Binding<Int>,
        in range: ClosedRange<Int>,
        label: String
    ) {
        self._value = value
        self.range = range
        self.label = label
    }

    // MARK: - Body

    public var body: some View {
        Stepper(value: $value, in: range) {
            Text("\(label): \(value)")
                .accessibleTextStyle(.body)
        }
        .accessibleLabel(label)
        .accessibleValue("\(value)")
        .accessibleHint("Double tap to adjust")
        .accessibleDynamicType()
        .accessibleTouchTarget()
    }
}

// =============================================================================
// MARK: - Accessible Segmented Control
// =============================================================================

/**
 Accessible segmented control with VoiceOver support
 */
public struct AccessibleSegmentedControl: View {

    // MARK: - Properties

    @Binding private var selection: String
    private let label: String
    private let options: [String]

    // MARK: - Initialization

    public init(
        selection: Binding<String>,
        label: String,
        options: [String]
    ) {
        self._selection = selection
        self.label = label
        self.options = options
    }

    // MARK: - Body

    public var body: some View {
        Picker(label, selection: $selection) {
            ForEach(options, id: \.self) { option in
                Text(option).tag(option)
            }
        }
        .pickerStyle(.segmented)
        .accessibleLabel(label)
        .accessibleValue(selection)
        .accessibleHint("Swipe left or right to change selection")
        .accessibleDynamicType()
        .accessibleTouchTarget()
    }
}

// =============================================================================
// MARK: - Accessible Text Field
// =============================================================================

/**
 Accessible text field with VoiceOver support
 */
public struct AccessibleTextField: View {

    // MARK: - Properties

    @Binding private var text: String
    private let label: String
    private let placeholder: String
    private let isSecure: Bool

    // MARK: - Initialization

    public init(
        text: Binding<String>,
        label: String,
        placeholder: String = "",
        isSecure: Bool = false
    ) {
        self._text = text
        self.label = label
        self.placeholder = placeholder
        self.isSecure = isSecure
    }

    // MARK: - Body

    public var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
            }
        }
        .accessibleLabel(label)
        .accessibleValue(text.isEmpty ? "Empty" : text)
        .accessibleHint("Double tap to edit")
        .accessibleDynamicType()
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
    }
}

// =============================================================================
// MARK: - Accessible Navigation Link
// =============================================================================

/**
 Accessible navigation link with VoiceOver support
 */
public struct AccessibleNavigationLink<Destination: View>: View {

    // MARK: - Properties

    private let label: String
    private let destination: Destination
    private let hint: String?
    private let systemImage: String?

    // MARK: - Initialization

    public init(
        label: String,
        destination: Destination,
        hint: String? = nil,
        systemImage: String? = nil
    ) {
        self.label = label
        self.destination = destination
        self.hint = hint
        self.systemImage = systemImage
    }

    // MARK: - Body

    public var body: some View {
        NavigationLink(destination: destination) {
            HStack {
                if let systemImage = systemImage {
                    Image(systemName: systemImage)
                }
                Text(label)
                Spacer()
                Image(systemName: "chevron.right")
                    .accessibleIgnore()
            }
            .accessibleDynamicType()
        }
        .accessibleLabel(label)
        .accessibilityHint(hint ?? "Double tap to navigate")
        .accessibleButton()
        .accessibleTouchTarget()
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct AccessibleControls_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 32) {
            AccessibleSlider(
                value: .constant(0.5),
                in: 0...1,
                label: "Reverb Decay"
            )

            AccessibleToggle(
                isOn: .constant(true),
                label: "Enable Reverb"
            )

            AccessiblePicker(
                selection: .constant("Piano"),
                label: "Performance Mode",
                options: ["Piano", "SATB", "Techno", "Custom"]
            )

            AccessibleButton(
                label: "Save",
                hint: "Save current settings",
                systemImage: "square.and.arrow.down",
                action: {}
            )

            AccessibleProgressView(
                value: 0.7,
                total: 1.0,
                label: "Loading Project"
            )

            AccessibleStepper(
                value: .constant(4),
                in: 1...8,
                label: "Bar Count"
            )

            AccessibleSegmentedControl(
                selection: .constant("Piano"),
                label: "Mode",
                options: ["Piano", "SATB", "Techno"]
            )
        }
        .padding()
    }
}
#endif
