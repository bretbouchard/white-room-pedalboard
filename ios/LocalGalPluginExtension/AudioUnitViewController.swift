/*
  AudioUnitViewController.swift - LocalGal SwiftUI Interface

  Main UI view controller for AUv3 extension using SwiftUI.
  Provides touch-optimized controls for LocalGal synth parameters.
*/

import UIKit
import SwiftUI
import AVFoundation

class AudioUnitViewController: AUViewController {
    private var audioUnit: LocalGalAudioUnit?
    private var parameterBridge: ParameterBridge?
    private var hostingController: UIHostingController<LocalGalView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
    }

    // MARK: - AU Integration

    override func connect(_ au: AUAudioUnit) {
        guard let audioUnit = au as? LocalGalAudioUnit else {
            fatalError("Unexpected AU type")
        }

        self.audioUnit = audioUnit
        self.parameterBridge = ParameterBridge(audioUnit: audioUnit)

        // Create SwiftUI view
        let contentView = LocalGalView(
            parameterBridge: parameterBridge!,
            audioUnit: audioUnit
        )

        hostingController = UIHostingController(rootView: contentView)
        hostingController?.view.translatesAutoresizingMaskIntoConstraints = false

        if let hostView = hostingController?.view {
            view.addSubview(hostView)

            NSLayoutConstraint.activate([
                hostView.topAnchor.constraint(equalTo: view.topAnchor),
                hostView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                hostView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                hostView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            ])
        }
    }
}

// MARK: - SwiftUI View

struct LocalGalView: View {
    @ObservedObject var parameterBridge: ParameterBridge
    var audioUnit: LocalGalAudioUnit

    @State private var selectedTab = 0
    @State private var feelVector = FeelVector()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HeaderView()

            // Tab selection
            Picker("", selection: $selectedTab) {
                Text("Main").tag(0)
                Text("Feel").tag(1)
                Text("Presets").tag(2)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()

            // Content
            ScrollView {
                switch selectedTab {
                case 0:
                    MainControlsView(parameterBridge: parameterBridge)
                case 1:
                    FeelVectorView(feelVector: $feelVector) { newVector in
                        feelVector = newVector
                        parameterBridge.setFeelVector(newVector)
                    }
                case 2:
                    PresetsView(parameterBridge: parameterBridge)
                default:
                    EmptyView()
                }
            }
        }
        .onAppear {
            feelVector = parameterBridge.getFeelVector()
        }
    }
}

// MARK: - Header View

struct HeaderView: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("LOCAL GAL")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            Text("16-Voice Polyphonic Synthesizer")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(uiColor: .secondarySystemBackground))
    }
}

// MARK: - Main Controls

struct MainControlsView: View {
    @ObservedObject var parameterBridge: ParameterBridge

    var body: some View {
        VStack(spacing: 20) {
            // Master Volume
            ParameterSlider(
                name: "Master",
                value: Binding(
                    get: { parameterBridge.getParameterValue("master_volume") },
                    set: { parameterBridge.setParameterValue("master_volume", value: $0) }
                ),
                range: 0...1
            )

            Divider()

            // Oscillator
            VStack(alignment: .leading, spacing: 10) {
                Text("Oscillator")
                    .font(.headline)
                    .foregroundColor(.secondary)

                Picker("Waveform", selection: Binding(
                    get: { parameterBridge.getParameterValue("osc_waveform") },
                    set: { parameterBridge.setParameterValue("osc_waveform", value: $0) }
                )) {
                    Text("Sine").tag(0.0)
                    Text("Sawtooth").tag(1.0)
                    Text("Square").tag(2.0)
                    Text("Triangle").tag(3.0)
                    Text("Noise").tag(4.0)
                }
                .pickerStyle(MenuPickerStyle())
            }
            .padding()
            .background(Color(uiColor: .secondarySystemBackground))
            .cornerRadius(10)

            Divider()

            // Filter
            VStack(alignment: .leading, spacing: 15) {
                Text("Filter")
                    .font(.headline)
                    .foregroundColor(.secondary)

                ParameterSlider(
                    name: "Cutoff",
                    value: Binding(
                        get: { parameterBridge.getParameterValue("filter_cutoff") },
                        set: { parameterBridge.setParameterValue("filter_cutoff", value: $0) }
                    ),
                    range: 0...1
                )

                ParameterSlider(
                    name: "Resonance",
                    value: Binding(
                        get: { parameterBridge.getParameterValue("filter_resonance") },
                        set: { parameterBridge.setParameterValue("filter_resonance", value: $0) }
                    ),
                    range: 0...1
                )
            }
            .padding()
            .background(Color(uiColor: .secondarySystemBackground))
            .cornerRadius(10)
        }
        .padding()
    }
}

// MARK: - Feel Vector View

struct FeelVectorView: View {
    @Binding var feelVector: FeelVector
    let onUpdate: (FeelVector) -> Void

    var body: some View {
        VStack(spacing: 20) {
            Text("Feel Vector")
                .font(.title2)
                .fontWeight(.semibold)
                .padding()

            VStack(spacing: 15) {
                FeelParameterSlider(
                    name: "Rubber",
                    description: "Glide & timing",
                    value: $feelVector.rubber
                )

                FeelParameterSlider(
                    name: "Bite",
                    description: "Brightness & resonance",
                    value: $feelVector.bite
                )

                FeelParameterSlider(
                    name: "Hollow",
                    description: "Warmth & fundamental",
                    value: $feelVector.hollow
                )

                FeelParameterSlider(
                    name: "Growl",
                    description: "Drive & saturation",
                    value: $feelVector.growl
                )

                FeelParameterSlider(
                    name: "Wet",
                    description: "Effects mix",
                    value: $feelVector.wet
                )
            }
            .padding()
        }
        .onChange(of: feelVector) { newVector in
            onUpdate(newVector)
        }
    }
}

// MARK: - Presets View

struct PresetsView: View {
    @ObservedObject var parameterBridge: ParameterBridge

    var body: some View {
        VStack(spacing: 15) {
            Text("Factory Presets")
                .font(.title2)
                .fontWeight(.semibold)
                .padding()

            let presetCount = parameterBridge.getFactoryPresetCount()

            ForEach(0..<presetCount, id: \.self) { index in
                if let name = parameterBridge.getFactoryPresetName(index: index) {
                    PresetButton(
                        name: name,
                        action: {
                            parameterBridge.loadFactoryPreset(index: index)
                        }
                    )
                }
            }
        }
        .padding()
    }
}

// MARK: - Custom Controls

struct ParameterSlider: View {
    let name: String
    @Binding var value: Float
    let range: ClosedRange<Float>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(name)
                .font(.subheadline)
                .fontWeight(.medium)

            Slider(value: $value, in: range)
                .accentColor(.blue)
        }
    }
}

struct FeelParameterSlider: View {
    let name: String
    let description: String
    @Binding var value: Float

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Text(String(format: "%.2f", value))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(description)
                .font(.caption)
                .foregroundColor(.secondary)

            Slider(value: $value, in: 0...1)
                .accentColor(.purple)
        }
        .padding()
        .background(Color(uiColor: .tertiarySystemBackground))
        .cornerRadius(8)
    }
}

struct PresetButton: View {
    let name: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(name)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(uiColor: .secondarySystemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// Preview
struct LocalGalView_Previews: PreviewProvider {
    static var previews: some View {
        LocalGalView(
            parameterBridge: ParameterBridge(audioUnit: LocalGalAudioUnit(
                componentDescription: AudioComponentDescription(
                    componentType: kAudioUnitType_MusicDevice,
                    componentSubType: 0x6c6f6361,
                    componentManufacturer: 0x6c6f6361,
                    componentFlags: 0,
                    componentFlagsMask: 0
                )
            )!),
            audioUnit: LocalGalAudioUnit(
                componentDescription: AudioComponentDescription(
                    componentType: kAudioUnitType_MusicDevice,
                    componentSubType: 0x6c6f6361,
                    componentManufacturer: 0x6c6f6361,
                    componentFlags: 0,
                    componentFlagsMask: 0
                )
            )!
        )
    }
}
