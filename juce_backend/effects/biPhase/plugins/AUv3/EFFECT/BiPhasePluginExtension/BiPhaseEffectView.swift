//
//  BiPhaseEffectView.swift
//  BiPhasePluginExtension
//
//  SwiftUI UI for BiPhase Phaser Effect AUv3
//

import SwiftUI
import Combine

struct BiPhaseEffectView: View {
    @StateObject private var viewModel = BiPhaseViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                Text("Bi-Phase")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top)

                // Phasor A Section
                PhasorControlSection(
                    title: "Phasor A",
                    rate: $viewModel.rateA,
                    depth: $viewModel.depthA,
                    feedback: $viewModel.feedbackA,
                    shape: $viewModel.shapeA,
                    onRateChanged: { viewModel.updateRateA($0) },
                    onDepthChanged: { viewModel.updateDepthA($0) },
                    onFeedbackChanged: { viewModel.updateFeedbackA($0) },
                    onShapeChanged: { viewModel.updateShapeA($0) }
                )

                Divider()

                // Phasor B Section
                PhasorControlSection(
                    title: "Phasor B",
                    rate: $viewModel.rateB,
                    depth: $viewModel.depthB,
                    feedback: $viewModel.feedbackB,
                    shape: $viewModel.shapeB,
                    onRateChanged: { viewModel.updateRateB($0) },
                    onDepthChanged: { viewModel.updateDepthB($0) },
                    onFeedbackChanged: { viewModel.updateFeedbackB($0) },
                    onShapeChanged: { viewModel.updateShapeB($0) }
                )

                Divider()

                // Routing Section
                RoutingControlsView(
                    routingMode: $viewModel.routingMode,
                    sweepSync: $viewModel.sweepSync,
                    sourceA: $viewModel.sourceA,
                    sourceB: $viewModel.sourceB,
                    onRoutingChanged: { viewModel.updateRoutingMode($0) },
                    onSyncChanged: { viewModel.updateSweepSync($0) },
                    onSourceAChanged: { viewModel.updateSourceA($0) },
                    onSourceBChanged: { viewModel.updateSourceB($0) }
                )

                Divider()

                // Mix Control
                MixControlView(mix: $viewModel.mix) { value in
                    viewModel.updateMix(value)
                }

                // Preset Browser
                PresetBrowserView(onPresetSelected: { preset in
                    viewModel.loadPreset(preset)
                })

                Spacer()
            }
            .padding()
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
}

//==============================================================================
// Phasor Control Section
//==============================================================================

struct PhasorControlSection: View {
    let title: String
    @Binding var rate: Double
    @Binding var depth: Double
    @Binding var feedback: Double
    @Binding var shape: Int
    let onRateChanged: (Double) -> Void
    let onDepthChanged: (Double) -> Void
    let onFeedbackChanged: (Double) -> Void
    let onShapeChanged: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)

            HStack(spacing: 15) {
                // Rate Control
                KnobControl(
                    title: "Rate",
                    value: $rate,
                    range: 0.0...1.0,
                    unit: "Hz"
                ) { value in
                    onRateChanged(value)
                }

                // Depth Control
                KnobControl(
                    title: "Depth",
                    value: $depth,
                    range: 0.0...1.0,
                    unit: "%"
                ) { value in
                    onDepthChanged(value)
                }

                // Feedback Control
                KnobControl(
                    title: "Feedback",
                    value: $feedback,
                    range: 0.0...1.0,
                    unit: "%"
                ) { value in
                    onFeedbackChanged(value)
                }
            }

            // Shape Picker
            Picker("LFO Shape", selection: $shape) {
                Text("Sine").tag(0)
                Text("Square").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .onChange(of: shape) { newValue in
                onShapeChanged(newValue)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

//==============================================================================
// Routing Controls
//==============================================================================

struct RoutingControlsView: View {
    @Binding var routingMode: Int
    @Binding var sweepSync: Int
    @Binding var sourceA: Int
    @Binding var sourceB: Int
    let onRoutingChanged: (Int) -> Void
    let onSyncChanged: (Int) -> Void
    let onSourceAChanged: (Int) -> Void
    let onSourceBChanged: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Routing")
                .font(.headline)
                .foregroundColor(.primary)

            // Routing Mode
            Picker("Mode", selection: $routingMode) {
                Text("Parallel").tag(0)
                Text("Series").tag(1)
                Text("Independent").tag(2)
            }
            .pickerStyle(SegmentedPickerStyle())
            .onChange(of: routingMode) { newValue in
                onRoutingChanged(newValue)
            }

            // Sweep Sync
            Picker("Sweep Sync", selection: $sweepSync) {
                Text("Normal").tag(0)
                Text("Reverse").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .onChange(of: sweepSync) { newValue in
                onSyncChanged(newValue)
            }

            HStack(spacing: 15) {
                // Source A
                VStack {
                    Text("Phasor A Source")
                        .font(.caption)
                    Picker("", selection: $sourceA) {
                        Text("LFO 1").tag(0)
                        Text("LFO 2").tag(1)
                    }
                    .pickerStyle(MenuPickerStyle())
                    .onChange(of: sourceA) { newValue in
                        onSourceAChanged(newValue)
                    }
                }

                // Source B
                VStack {
                    Text("Phasor B Source")
                        .font(.caption)
                    Picker("", selection: $sourceB) {
                        Text("LFO 1").tag(0)
                        Text("LFO 2").tag(1)
                    }
                    .pickerStyle(MenuPickerStyle())
                    .onChange(of: sourceB) { newValue in
                        onSourceBChanged(newValue)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

//==============================================================================
// Mix Control
//==============================================================================

struct MixControlView: View {
    @Binding var mix: Double
    let onMixChanged: (Double) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Mix")
                .font(.headline)
                .foregroundColor(.primary)

            HStack {
                Text("Dry")
                    .font(.caption)

                Slider(value: $mix, in: 0...1) { _ in
                    onMixChanged(mix)
                }

                Text("Wet")
                    .font(.caption)
            }

            Text("\(Int(mix * 100))%")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

//==============================================================================
// Knob Control
//==============================================================================

struct KnobControl: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let unit: String
    let onValueChanged: (Double) -> Void

    @State private var isDragging = false
    @GestureState private var dragOffset: CGFloat = 0

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                    .frame(width: 60, height: 60)

                Circle()
                    .trim(from: 0, to: value)
                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 60, height: 60)
                    .rotationEffect(.degrees(-90))
            }
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        isDragging = true
                        let sensitivity: CGFloat = 0.003
                        let delta = gesture.translation.height * sensitivity
                        let newValue = (value - delta).inRange(range)
                        value = newValue
                        onValueChanged(newValue)
                    }
                    .onEnded { _ in
                        isDragging = false
                    }
            )

            Text(title)
                .font(.caption)
                .foregroundColor(.primary)

            Text("\(formattedValue)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    private var formattedValue: String {
        let displayValue: Double
        if unit == "Hz" {
            displayValue = 0.1 + value * 17.9
        } else {
            displayValue = value * 100
        }
        return String(format: "%.1f %@", displayValue, unit)
    }
}

//==============================================================================
// Preset Browser
//==============================================================================

struct PresetBrowserView: View {
    let onPresetSelected: (BiPhasePreset) -> Void

    private let presets: [BiPhasePreset] = [
        BiPhasePreset(name: "Classic 12-Stage",
                      rateA: 0.3, depthA: 0.6, feedbackA: 0.5,
                      rateB: 0.3, depthB: 0.6, feedbackB: 0.5,
                      routingMode: 1, sweepSync: 0,
                      shapeA: 0, shapeB: 0,
                      sourceA: 0, sourceB: 1),

        BiPhasePreset(name: "Subtle Sweep",
                      rateA: 0.2, depthA: 0.3, feedbackA: 0.2,
                      rateB: 0.2, depthB: 0.3, feedbackB: 0.2,
                      routingMode: 1, sweepSync: 0,
                      shapeA: 0, shapeB: 0,
                      sourceA: 0, sourceB: 0),

        BiPhasePreset(name: "Aggressive Phaser",
                      rateA: 0.7, depthA: 0.8, feedbackA: 0.9,
                      rateB: 0.7, depthB: 0.8, feedbackB: 0.9,
                      routingMode: 1, sweepSync: 1,
                      shapeA: 1, shapeB: 1,
                      sourceA: 0, sourceB: 1),

        BiPhasePreset(name: "Stereo Widener",
                      rateA: 0.4, depthA: 0.5, feedbackA: 0.4,
                      rateB: 0.4, depthB: 0.5, feedbackB: 0.4,
                      routingMode: 0, sweepSync: 1,
                      shapeA: 0, shapeB: 0,
                      sourceA: 0, sourceB: 0),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Presets")
                .font(.headline)
                .foregroundColor(.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(presets) { preset in
                        Button(preset.name) {
                            onPresetSelected(preset)
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

//==============================================================================
// Preset Model
//==============================================================================

struct BiPhasePreset: Identifiable {
    let id = UUID()
    let name: String
    let rateA: Double
    let depthA: Double
    let feedbackA: Double
    let rateB: Double
    let depthB: Double
    let feedbackB: Double
    let routingMode: Int
    let sweepSync: Int
    let shapeA: Int
    let shapeB: Int
    let sourceA: Int
    let sourceB: Int
    let mix: Double = 1.0
}

//==============================================================================
// Preview
//==============================================================================

struct BiPhaseEffectView_Previews: PreviewProvider {
    static var previews: some View {
        BiPhaseEffectView()
    }
}

//==============================================================================
// Helper Extensions
//==============================================================================

extension Double {
    func inRange(_ range: ClosedRange<Double>) -> Double {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
