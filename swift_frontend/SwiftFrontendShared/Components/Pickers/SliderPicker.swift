//
//  SliderPicker.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Slider Picker
// =============================================================================

/**
 A value slider with labeled ticks and platform-adaptive controls

 Platform adaptations:
 - iOS: Touch slider with haptic feedback at key values
 - macOS: Slider with keyboard support (arrow keys)
 - tvOS: Focusable slider with remote swipe

 - Parameters:
   - Value: Binding to double value
   - Range: Closed range for valid values
   - Label: Optional label
   - TickMarks: Optional array of (value, label) pairs
   - Step: Optional step size for discrete values
 */
public struct SliderPicker: View {

    // MARK: - Properties

    @Binding private var value: Double
    private let range: ClosedRange<Double>
    private let label: String?
    private let tickMarks: [(value: Double, label: String)]?
    private let step: Double?

    @State private var isDragging = false
    @FocusState private var isFocused: Bool

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        value: Binding<Double>,
        in range: ClosedRange<Double>,
        label: String? = nil,
        tickMarks: [(value: Double, label: String)]? = nil,
        step: Double? = nil
    ) {
        self._value = value
        self.range = range
        self.label = label
        self.tickMarks = tickMarks
        self.step = step
    }

    // MARK: - Body

    public var body: some View {
        if let label = label {
            VStack(alignment: .leading, spacing: Spacing.small) {
                headerView

                sliderView

                if let tickMarks = tickMarks {
                    tickMarksView(tickMarks)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: Spacing.small) {
                sliderView

                if let tickMarks = tickMarks {
                    tickMarksView(tickMarks)
                }
            }
        }
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack {
            Text(label ?? "")
                .font(.labelMedium)
                .foregroundColor(.secondaryText)

            Spacer()

            Text(valueLabel)
                .font(.labelMedium)
                .fontWeight(.semibold)
                .foregroundColor(.brand)
        }
    }

    private var valueLabel: String {
        if let step = step {
            // Discrete values - show as integer/decimal
            let formatter = NumberFormatter()
            formatter.minimumFractionDigits = step < 1.0 ? 1 : 0
            formatter.maximumFractionDigits = step < 1.0 ? 1 : 0
            return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
        } else {
            // Continuous values - show percentage
            return String(format: "%.0f%%", (value - range.lowerBound) / (range.upperBound - range.lowerBound) * 100)
        }
    }

    // MARK: - Slider View

    private var sliderView: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track
                trackView(frame: geometry.frame(in: .local))

                // Fill
                fillView(frame: geometry.frame(in: .local))

                // Thumb
                thumbView(frame: geometry.frame(in: .local))
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        isDragging = true
                        updateValue(from: value.location.x, in: geometry.size.width)
                    }
                    .onEnded { _ in
                        isDragging = false

                        #if os(iOS)
                        // Haptic feedback on release
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        #endif
                    }
            )
        }
        .frame(height: thumbSize)
        .tvFocusable()
        .focused($isFocused)
        #if os(macOS)
        .onKeyPress { keyPress in
            // Keyboard support on macOS
            switch keyPress.key {
            case .leftArrow:
                adjustValue(by: -stepAmount)
                return .handled
            case .rightArrow:
                adjustValue(by: stepAmount)
                return .handled
            default:
                return .ignored
            }
        }
        #endif
    }

    // MARK: - Track View

    private func trackView(frame: CGRect) -> some View {
        RoundedRectangle(cornerRadius: trackHeight / 2)
            .fill(Color.secondaryBackground)
            .frame(height: trackHeight)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, thumbSize / 2)
    }

    // MARK: - Fill View

    private func fillView(frame: CGRect) -> some View {
        let progress = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        let width = (frame.width - thumbSize) * progress

        return RoundedRectangle(cornerRadius: trackHeight / 2)
            .fill(Color.brand)
            .frame(height: trackHeight)
            .frame(width: width)
            .padding(.leading, thumbSize / 2)
    }

    // MARK: - Thumb View

    private func thumbView(frame: CGRect) -> some View {
        let progress = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        let xPosition = (frame.width - thumbSize) * progress

        return Circle()
            .fill(isDragging || isFocused ? Color.white : Color.brand)
            .frame(width: thumbSize, height: thumbSize)
            .shadow(
                color: isDragging ? .brand.opacity(0.4) : .black.opacity(0.2),
                radius: isDragging ? Spacing.shadowMedium : Spacing.shadowSmall,
                x: 0,
                y: isDragging ? Spacing.shadowSmall / 2 : Spacing.shadowSmall / 4
            )
            .overlay(
                Circle()
                    .stroke(Color.brand, lineWidth: Spacing.borderThin)
            )
            .offset(x: xPosition)
    }

    // MARK: - Tick Marks View

    private func tickMarksView(_ marks: [(value: Double, label: String)]) -> some View {
        HStack {
            ForEach(Array(marks.enumerated()), id: \.offset) { index, mark in
                VStack(spacing: Spacing.xSmall) {
                    // Tick mark
                    RoundedRectangle(cornerRadius: 1)
                        .fill(value >= mark.value ? Color.brand : Color.tertiaryText)
                        .frame(width: 2, height: value >= mark.value ? 8 : 4)

                    // Label
                    Text(mark.label)
                        .font(isCompact ? .caption2 : .caption)
                        .foregroundColor(value >= mark.value ? .brand : .tertiaryText)
                }

                if index < marks.count - 1 {
                    Spacer()
                }
            }
        }
        .padding(.top, Spacing.small)
    }

    // MARK: - Size Helpers

    private var thumbSize: CGFloat {
        #if os(tvOS)
        return 60  // Larger for tvOS
        #elseif os(macOS)
        return 20  // Smaller for macOS
        #else
        return isCompact ? 28 : 32
        #endif
    }

    private var trackHeight: CGFloat {
        #if os(tvOS)
        return 8
        #elseif os(macOS)
        return 4
        #else
        return 6
        #endif
    }

    // MARK: - Value Updates

    private func updateValue(from xPosition: CGFloat, in width: CGFloat) {
        let adjustedX = max(0, min(xPosition, width))
        let progress = adjustedX / (width - thumbSize)
        let newValue = range.lowerBound + progress * (range.upperBound - range.lowerBound)

        if let step = step {
            // Snap to step
            let steppedValue = round(newValue / step) * step
            value = max(range.lowerBound, min(range.upperBound, steppedValue))
        } else {
            // Continuous
            value = max(range.lowerBound, min(range.upperBound, newValue))
        }

        // Haptic feedback at tick marks
        if let tickMarks = tickMarks {
            for tick in tickMarks {
                if abs(value - tick.value) < (step ?? 0.05) {
                    #if os(iOS)
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    #endif
                    break
                }
            }
        }
    }

    private func adjustValue(by amount: Double) {
        let newValue = value + amount
        value = max(range.lowerBound, min(range.upperBound, newValue))
    }

    private var stepAmount: Double {
        step ?? ((range.upperBound - range.lowerBound) / 100)
    }
}

// =============================================================================
// MARK: - Convenience Initializers
// =============================================================================

public extension SliderPicker {

    /**
     Create slider for normalized values (0-1)

     - Parameters:
       - value: Binding to double value (0-1)
       - label: Optional label
       - tickMarks: Optional tick marks
     */
    init(
        normalizedValue value: Binding<Double>,
        label: String? = nil,
        tickMarks: [(value: Double, label: String)]? = nil
    ) {
        self.init(
            value: value,
            in: 0...1,
            label: label,
            tickMarks: tickMarks,
            step: nil
        )
    }

    /**
     Create slider for percentage values (0-100)

     - Parameters:
       - value: Binding to double value (0-100)
       - label: Optional label
       - tickMarks: Optional tick marks
     */
    init(
        percentageValue value: Binding<Double>,
        label: String? = nil,
        tickMarks: [(value: Double, label: String)]? = nil
    ) {
        self.init(
            value: value,
            in: 0...100,
            label: label,
            tickMarks: tickMarks,
            step: 1.0
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct SliderPicker_Previews: PreviewProvider {
    @State static var continuousValue: Double = 0.5
    @State static var discreteValue: Double = 3
    @State static var percentageValue: Double = 75

    static var previews: some View {
        Group {
            // Continuous slider
            SliderPicker(
                value: $continuousValue,
                in: 0...1,
                label: "Continuous Value",
                tickMarks: [
                    (0.0, "0%"),
                    (0.25, "25%"),
                    (0.5, "50%"),
                    (0.75, "75%"),
                    (1.0, "100%")
                ]
            )
            .previewDisplayName("Continuous")

            // Discrete slider
            SliderPicker(
                value: $discreteValue,
                in: 1...5,
                label: "Discrete Value",
                tickMarks: [
                    (1, "1"),
                    (2, "2"),
                    (3, "3"),
                    (4, "4"),
                    (5, "5")
                ],
                step: 1
            )
            .previewDisplayName("Discrete")

            // Percentage slider
            SliderPicker(
                percentageValue: $percentageValue,
                label: "Percentage",
                tickMarks: [
                    (0, "0%"),
                    (25, "25%"),
                    (50, "50%"),
                    (75, "75%"),
                    (100, "100%")
                ]
            )
            .previewDisplayName("Percentage")
        }
        .padding()
    }
}
#endif
