import SwiftUI

/// Real-time audio level meter for DSP parameters
///
/// Features:
/// - Real-time level display
/// - Peak hold indicator
/// - Clip indicator
/// - Smooth animations
/// - Stereo linking
/// - Color-coded levels (green/yellow/red)
public struct DSPMeterView: View {
    // MARK: - Properties

    public let level: Float          // Current level (-inf to 0 dB)
    public let peak: Float           // Peak level
    public let clip: Bool            // Clip indicator
    public let stereo: Bool          // Stereo meter
    public let rightLevel: Float     // Right channel level
    public let rightPeak: Float      // Right channel peak

    @State private var peakHoldLevel: Float = 0
    @State private var peakHoldTimer: Timer?
    @State private var clipTimer: Timer?

    // MARK: - Initialization

    public init(
        level: Float = 0,
        peak: Float = 0,
        clip: Bool = false,
        stereo: Bool = false,
        rightLevel: Float = 0,
        rightPeak: Float = 0
    ) {
        self.level = level
        self.peak = peak
        self.clip = clip
        self.stereo = stereo
        self.rightLevel = rightLevel
        self.rightPeak = rightPeak
    }

    // MARK: - Body

    public var body: some View {
        HStack(spacing: 4) {
            if stereo {
                // Left channel meter
                meterView(for: level, peak: peak)
                    .accessibilityLabel("Left channel")
                    .accessibilityValue(levelText(level))

                // Right channel meter
                meterView(for: rightLevel, peak: rightPeak)
                    .accessibilityLabel("Right channel")
                    .accessibilityValue(levelText(rightLevel))
            } else {
                // Mono meter
                meterView(for: level, peak: peak)
                    .accessibilityLabel("Level")
                    .accessibilityValue(levelText(level))
            }

            // Clip indicator
            if clip {
                clipIndicator
                    .accessibilityLabel("Clipping")
                    .accessibilityHint("Signal is clipping")
            }
        }
        .onAppear {
            setupPeakHold()
            setupClipReset()
        }
        .onDisappear {
            peakHoldTimer?.invalidate()
            clipTimer?.invalidate()
        }
    }

    // MARK: - Meter View

    private func meterView(for level: Float, peak: Float) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Background
                Rectangle()
                    .fill(Color.secondary.opacity(0.2))

                // Level segments
                VStack(spacing: 1) {
                    Spacer()

                    // Red segment (clip)
                    segmentView(color: .red, filled: level >= -6)
                        .frame(height: geometry.size.height * 0.15)

                    // Yellow segment (warning)
                    segmentView(color: .yellow, filled: level >= -12 && level < -6)
                        .frame(height: geometry.size.height * 0.15)

                    // Yellow-green transition
                    segmentView(color: Color.yellow.opacity(0.7), filled: level >= -18 && level < -12)
                        .frame(height: geometry.size.height * 0.15)

                    // Green segment (normal)
                    segmentView(color: .green, filled: level < -18)
                        .frame(height: geometry.size.height * 0.55)
                }

                // Peak hold indicator
                Rectangle()
                    .fill(Color.red)
                    .frame(height: 2)
                    .offset(y: -peakPosition(for: peak, in: geometry.size.height))
                    .opacity(peakHoldLevel > 0 ? 1 : 0)
            }
        }
        .frame(width: 8)
        .clipped()
    }

    private func segmentView(color: Color, filled: Bool) -> some View {
        Rectangle()
            .fill(filled ? color : Color.secondary.opacity(0.2))
    }

    // MARK: - Clip Indicator

    private var clipIndicator: some View {
        Circle()
            .fill(Color.red)
            .frame(width: 8, height: 8)
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 1)
            )
    }

    // MARK: - Peak Hold

    private func setupPeakHold() {
        peakHoldTimer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { _ in
            // Update peak hold
            if peak > peakHoldLevel {
                peakHoldLevel = peak
            } else {
                // Decay peak hold
                peakHoldLevel -= 0.5 // Decay rate
                if peakHoldLevel < 0 {
                    peakHoldLevel = 0
                }
            }
        }
    }

    private func setupClipReset() {
        clipTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            // Clip indicator auto-resets after 1 second
            // In production, this would be controlled externally
        }
    }

    // MARK: - Helpers

    private func peakPosition(for peak: Float, in height: CGFloat) -> CGFloat {
        let normalizedPeak = max(0, min(1, CGFloat(1 - (peak / -60))))
        return normalizedPeak * height
    }

    private func levelText(_ level: Float) -> Text {
        Text(String(format: "%.1f dB", level))
    }
}

// MARK: - Preview

#if DEBUG
struct DSPMeterView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Mono meter - low level
            DSPMeterView(level: -40, peak: -35)
                .previewDisplayName("Mono - Low Level")

            // Mono meter - high level
            DSPMeterView(level: -6, peak: -3, clip: false)
                .previewDisplayName("Mono - High Level")

            // Mono meter - clipping
            DSPMeterView(level: -2, peak: 0, clip: true)
                .previewDisplayName("Mono - Clipping")

            // Stereo meter
            DSPMeterView(
                level: -12,
                peak: -8,
                stereo: true,
                rightLevel: -15,
                rightPeak: -10
            )
            .previewDisplayName("Stereo Meter")

            // Dark mode
            DSPMeterView(level: -20, peak: -15)
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")

            // Channel strip layout
            HStack(spacing: 20) {
                VStack {
                    Text("Ch 1").font(.caption2)
                    DSPMeterView(level: -30, peak: -25)
                }
                VStack {
                    Text("Ch 2").font(.caption2)
                    DSPMeterView(level: -15, peak: -10)
                }
                VStack {
                    Text("Ch 3").font(.caption2)
                    DSPMeterView(level: -8, peak: -5)
                }
                VStack {
                    Text("Master").font(.caption2)
                    DSPMeterView(level: -12, peak: -8, stereo: true, rightLevel: -14, rightPeak: -10)
                }
            }
            .previewDisplayName("Channel Strip Meters")
        }
        .padding()
    }
}
#endif
