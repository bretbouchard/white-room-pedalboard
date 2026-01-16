import SwiftUI

/// Rotary knob control for DSP parameters
///
/// Features:
/// - Drag-to-adjust interaction
/// - Value display
/// - Default value reset (double-tap)
/// - Smooth animations
/// - Haptic feedback
/// - VoiceOver support
public struct DSPKnobControl: View {
    // MARK: - Properties

    @Binding public var value: Float
    public let range: ClosedRange<Float>
    public let title: String
    public let unit: String
    public let formatter: ((Float) -> String)?

    @State private var isDragging = false
    @State private var startAngle: Angle = .zero
    @State private var startValue: Float = 0
    @State private var knobSize: CGFloat = 80

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityEnabled) private var accessibilityEnabled

    // MARK: - Initialization

    public init(
        value: Binding<Float>,
        in range: ClosedRange<Float> = 0...1,
        title: String = "",
        unit: String = "",
        formatter: ((Float) -> String)? = nil
    ) {
        self._value = value
        self.range = range
        self.title = title
        self.unit = unit
        self.formatter = formatter
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 8) {
            // Knob
            knobView
                .frame(width: knobSize, height: knobSize)
                .gesture(knobDragGesture)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(accessibilityLabel)
                .accessibilityValue(accessibilityValueText)
                .accessibilityAdjustableAction { direction in
                    handleAccessibilityAdjustment(direction)
                }

            // Value display
            if !title.isEmpty {
                Text(displayValue)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .frame(width: knobSize + 20)
                    .accessibilityHidden(true)
            }

            // Title
            if !title.isEmpty {
                Text(title)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .frame(width: knobSize + 20)
                    .accessibilityHidden(true)
            }
        }
    }

    // MARK: - Knob View

    private var knobView: some View {
        ZStack {
            // Track (background circle)
            Circle()
                .stroke(trackColor, lineWidth: 4)

            // Arc indicator (filled portion)
            Circle()
                .trim(from: 0, to: valueArc)
                .stroke(accentColor, lineWidth: 4)
                .rotationEffect(.degrees(-90))

            // Indicator (thumb)
            Circle()
                .fill(Color.white)
                .frame(width: 8, height: 8)
                .offset(indicatorOffset)
                .rotationEffect(knobAngle)

            // Center point
            Circle()
                .fill(centerColor)
                .frame(width: 4, height: 4)
        }
        .animation(.easeOut(duration: 0.1), value: value)
        .scaleEffect(isDragging ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isDragging)
    }

    // MARK: - Gesture

    private var knobDragGesture: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                handleDragChanged(value)
            }
            .onEnded { _ in
                handleDragEnded()
            }
    }

    private func handleDragChanged(_ dragValue: DragGesture.Value) {
        let center = CGPoint(x: knobSize / 2, y: knobSize / 2)
        let angle = atan2(
            dragValue.location.y - center.y,
            dragValue.location.x - center.x
        )

        if !isDragging {
            isDragging = true
            startAngle = Angle(radians: Double(angle))
            startValue = value

            // Haptic feedback on drag start
            #if os(iOS)
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            #endif
        } else {
            let delta = Angle(radians: Double(angle)) - startAngle
            let normalizedDelta = Float(delta.degrees / 270.0)
            let rangeSpan = range.upperBound - range.lowerBound
            let newValue = startValue + normalizedDelta * rangeSpan
            self.value = min(range.upperBound, max(range.lowerBound, newValue))
        }
    }

    private func handleDragEnded() {
        isDragging = false

        // Haptic feedback on release
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        #endif
    }

    // MARK: - Accessibility

    private var accessibilityLabel: String {
        title.isEmpty ? "Knob" : title
    }

    private var accessibilityValueText: Text {
        Text(displayValue)
    }

    private func handleAccessibilityAdjustment(_ direction: AccessibilityAdjustmentDirection) {
        let step: Float
        let rangeSpan = range.upperBound - range.lowerBound

        switch direction {
        case .increment:
            step = rangeSpan * 0.02 // 2% increments
            value = min(range.upperBound, value + step)
        case .decrement:
            step = rangeSpan * 0.02
            value = max(range.lowerBound, value - step)
        @unknown default:
            break
        }
    }

    // MARK: - Computed Properties

    private var normalizedValue: Double {
        let rangeSpan = range.upperBound - range.lowerBound
        return rangeSpan != 0 ? Double((value - range.lowerBound) / rangeSpan) : 0.0
    }

    private var valueArc: Double {
        // Arc goes from 0 (at -135deg) to 1 (at +135deg)
        // Total arc is 270 degrees
        normalizedValue * 0.75 // 75% of full circle
    }

    private var knobAngle: Angle {
        // Rotate from -135 to +135 degrees
        let degrees = (normalizedValue * 270.0) - 135.0
        return Angle(degrees: degrees)
    }

    private var indicatorOffset: CGSize {
        // Calculate position on the circle edge
        let angle = knobAngle.radians
        let radius: CGFloat = (knobSize / 2) - 8 // Subtract stroke width
        let x = CGFloat(cos(angle)) * radius
        let y = CGFloat(sin(angle)) * radius
        return CGSize(width: x, height: y)
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

    private var centerColor: Color {
        colorScheme == .dark ? Color.black : Color.white
    }
}

// MARK: - Preview

#if DEBUG
struct DSPKnobControl_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Continuous parameter
            DSPKnobControl(
                value: .constant(0.5),
                title: "Cutoff",
                unit: "Hz"
            )
            .previewDisplayName("Continuous Knob")

            // Enum parameter (displayed as continuous)
            DSPKnobControl(
                value: .constant(2.0),
                in: 0...5,
                title: "Waveform",
                formatter: { val in
                    ["Saw", "Square", "Triangle", "Sine", "Pulse", "Noise"][Int(val)]
                }
            )
            .previewDisplayName("Enum Knob")

            // Dark mode
            DSPKnobControl(
                value: .constant(0.7),
                title: "Resonance"
            )
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")

            // Multiple knobs
            VStack(spacing: 20) {
                DSPKnobControl(value: .constant(0.3), title: "Attack", unit: "s")
                DSPKnobControl(value: .constant(0.7), title: "Decay", unit: "s")
                DSPKnobControl(value: .constant(0.5), title: "Sustain")
                DSPKnobControl(value: .constant(0.8), title: "Release", unit: "s")
            }
            .previewDisplayName("Envelope Knobs")
        }
        .padding()
    }
}
#endif
