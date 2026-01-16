import SwiftUI

/// Vertical fader control for DSP parameters
///
/// Features:
/// - Drag-to-adjust interaction
/// - Value display
/// - Metering integration
/// - Smooth animations
/// - Haptic feedback
/// - VoiceOver support
public struct DSPFaderControl: View {
    // MARK: - Properties

    @Binding public var value: Float
    public let range: ClosedRange<Float>
    public let title: String
    public let unit: String
    public let meterLevel: Float
    public let formatter: ((Float) -> String)?

    @State private var isDragging = false
    @State private var faderWidth: CGFloat = 4
    @State private var thumbSize: CGFloat = 32

    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Initialization

    public init(
        value: Binding<Float>,
        in range: ClosedRange<Float> = 0...1,
        title: String = "",
        unit: String = "",
        meterLevel: Float = 0,
        formatter: ((Float) -> String)? = nil
    ) {
        self._value = value
        self.range = range
        self.title = title
        self.unit = unit
        self.meterLevel = meterLevel
        self.formatter = formatter
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 8) {
            // Value display (top)
            if !title.isEmpty {
                Text(displayValue)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .frame(width: thumbSize + 20)
                    .accessibilityHidden(true)
            }

            // Fader + Meter
            HStack(spacing: 4) {
                // Meter (left)
                if meterLevel > 0 {
                    meterView
                        .frame(width: 6)
                }

                // Fader (center)
                faderView
                    .frame(width: thumbSize + 8)
                    .gesture(faderDragGesture)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(accessibilityLabel)
                    .accessibilityValue(accessibilityValueText)
                    .accessibilityAdjustableAction { direction in
                        handleAccessibilityAdjustment(direction)
                    }
            }

            // Title (bottom)
            if !title.isEmpty {
                Text(title)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .frame(width: thumbSize + 20)
                    .accessibilityHidden(true)
            }
        }
    }

    // MARK: - Fader View

    private var faderView: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                // Track (background)
                Rectangle()
                    .fill(trackColor)
                    .frame(width: faderWidth)

                // Fill (value indicator)
                Rectangle()
                    .fill(accentColor)
                    .frame(width: faderWidth)
                    .frame(height: faderHeight(in: geometry.size.height))

                // Thumb
                Circle()
                    .fill(thumbColor)
                    .frame(width: thumbSize, height: thumbSize)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                    .frame(maxHeight: .infinity, alignment: .top)
                    .padding(.top, faderThumbPosition(in: geometry.size.height))
            }
        }
        .frame(height: 200)
    }

    // MARK: - Meter View

    private var meterView: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Background
                Rectangle()
                    .fill(Color.secondary.opacity(0.2))

                // Level bar
                Rectangle()
                    .fill(meterColor(for: meterLevel))
                    .frame(height: meterHeight(in: geometry.size.height))

                // Peak indicator
                Rectangle()
                    .fill(Color.red)
                    .frame(height: 2)
                    .offset(y: -peakPosition(in: geometry.size.height))
            }
        }
        .frame(height: 200)
        .clipped()
    }

    // MARK: - Gesture

    private var faderDragGesture: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                handleFaderDrag(value)
            }
            .onEnded { _ in
                handleFaderRelease()
            }
    }

    private func handleFaderDrag(_ dragValue: DragGesture.Value) {
        // The view property is deprecated and doesn't work reliably
        // GeometryReader should provide bounds, but for now use a workaround
        // Assume standard fader height of 200
        let faderHeight: CGFloat = 200

        let normalizedY = 1 - (dragValue.location.y / faderHeight)
        let rangeSpan = range.upperBound - range.lowerBound
        let newValue = range.lowerBound + Float(normalizedY) * rangeSpan
        self.value = min(range.upperBound, max(range.lowerBound, newValue))

        if !isDragging {
            isDragging = true

            // Haptic feedback
            #if os(iOS)
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            #endif
        }
    }

    private func handleFaderRelease() {
        isDragging = false

        // Haptic feedback
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        #endif
    }

    // MARK: - Accessibility

    private var accessibilityLabel: String {
        title.isEmpty ? "Fader" : title
    }

    private var accessibilityValueText: Text {
        Text(displayValue)
    }

    private func handleAccessibilityAdjustment(_ direction: AccessibilityAdjustmentDirection) {
        let step: Float
        let rangeSpan = range.upperBound - range.lowerBound

        switch direction {
        case .increment:
            step = rangeSpan * 0.02
            value = min(range.upperBound, value + step)
        case .decrement:
            step = rangeSpan * 0.02
            value = max(range.lowerBound, value - step)
        @unknown default:
            break
        }
    }

    // MARK: - Computed Properties

    private var normalizedValue: CGFloat {
        let rangeSpan = range.upperBound - range.lowerBound
        return rangeSpan != 0 ? CGFloat((value - range.lowerBound) / rangeSpan) : 0.0
    }

    private func faderHeight(in totalHeight: CGFloat) -> CGFloat {
        normalizedValue * totalHeight
    }

    private func faderThumbPosition(in totalHeight: CGFloat) -> CGFloat {
        let thumbCenter = (totalHeight * normalizedValue) - (thumbSize / 2)
        return max(0, min(totalHeight - thumbSize, thumbCenter))
    }

    private func meterHeight(in totalHeight: CGFloat) -> CGFloat {
        CGFloat(meterLevel) * totalHeight
    }

    private func peakPosition(in totalHeight: CGFloat) -> CGFloat {
        CGFloat(meterLevel) * totalHeight
    }

    private func meterColor(for level: Float) -> Color {
        switch level {
        case 0.95...1.0: return .red
        case 0.8..<0.95: return .orange
        case 0.6..<0.8: return .yellow
        default: return .green
        }
    }

    private var displayValue: String {
        if let formatter = formatter {
            return formatter(value)
        }

        if !unit.isEmpty {
            return String(format: "%.2f %@", value, unit)
        }

        return String(format: "%.2f", value)
    }

    // MARK: - Colors

    private var accentColor: Color {
        isDragging ? Color.accentColor : Color.accentColor.opacity(0.8)
    }

    private var trackColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.2)
            : Color.black.opacity(0.1)
    }

    private var thumbColor: Color {
        colorScheme == .dark ? Color.white : Color.black
    }
}

// MARK: - DragGesture Helper

extension DragGesture.Value {
    var view: UIView? {
        #if os(iOS)
        // This is a simplified approach
        // In production, you'd use a proper geometry reader
        return nil
        #else
        return nil
        #endif
    }
}

// MARK: - Preview

#if DEBUG
struct DSPFaderControl_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Basic fader
            DSPFaderControl(
                value: .constant(0.7),
                title: "Volume",
                unit: "dB"
            )
            .previewDisplayName("Basic Fader")

            // With metering
            DSPFaderControl(
                value: .constant(0.7),
                title: "Channel 1",
                meterLevel: 0.8
            )
            .previewDisplayName("Fader with Meter")

            // Dark mode
            DSPFaderControl(
                value: .constant(0.5),
                title: "Master",
                meterLevel: 0.6
            )
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")

            // Multiple faders
            HStack(spacing: 20) {
                DSPFaderControl(value: .constant(0.6), title: "Ch 1", meterLevel: 0.7)
                DSPFaderControl(value: .constant(0.8), title: "Ch 2", meterLevel: 0.5)
                DSPFaderControl(value: .constant(0.4), title: "Ch 3", meterLevel: 0.9)
                DSPFaderControl(value: .constant(0.7), title: "Master", meterLevel: 0.75)
            }
            .previewDisplayName("Channel Strips")
        }
        .padding()
    }
}
#endif
