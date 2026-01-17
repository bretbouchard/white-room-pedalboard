//
//  AudioUnitViewController.swift
//  AetherDrivePluginExtension
//
//  SwiftUI view controller for AetherDrive effect plugin
//

import UIKit
import SwiftUI

class AudioUnitViewController: AUViewController {

    private var hostingController: UIHostingController<AetherDriveEffectView>!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Create SwiftUI view
        let contentView = AetherDriveEffectView()
        hostingController = UIHostingController(rootView: contentView)
        hostingController.view.backgroundColor = .clear

        // Add as child view controller
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        hostingController.didMove(toParent: self)
    }
}

// SwiftUI Effect View
struct AetherDriveEffectView: View {
    @State private var drive: Double = 0.5
    @State private var bass: Double = 0.5
    @State private var mid: Double = 0.5
    @State private var treble: Double = 0.5
    @State private var bodyResonance: Double = 0.5
    @State private var resonanceDecay: Double = 0.5
    @State private var mix: Double = 0.5
    @State private var outputLevel: Double = 0.8
    @State private var cabinetSimulation: Double = 0.3
    @State private var selectedPreset = 0

    let presets = [
        "Clean Boost", "Crunch", "Overdrive", "Distortion",
        "Fuzz", "Warm Tube", "Acoustic Body", "Bass Warmth"
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                Text("Aether Drive")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)

                Text("Guitar Effects Pedal")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Divider()

                // Preset Selector
                VStack(alignment: .leading, spacing: 8) {
                    Text("Preset")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Picker("", selection: $selectedPreset) {
                        ForEach(0..<presets.count, id: \.self) { index in
                            Text(presets[index]).tag(index)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: selectedPreset) { _, newValue in
                        loadPreset(newValue)
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)

                // Drive Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Drive")
                        .font(.headline)
                        .foregroundColor(.primary)

                    HStack {
                        Text("Clean")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Slider(value: $drive, in: 0...1)
                        Text("Hot")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)

                // EQ Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Tone")
                        .font(.headline)
                        .foregroundColor(.primary)

                    VStack(spacing: 8) {
                        HStack {
                            Text("Bass")
                                .frame(width: 60, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $bass, in: 0...1)
                        }
                        HStack {
                            Text("Mid")
                                .frame(width: 60, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $mid, in: 0...1)
                        }
                        HStack {
                            Text("Treble")
                                .frame(width: 60, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $treble, in: 0...1)
                        }
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)

                // Resonance Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Body Resonance")
                        .font(.headline)
                        .foregroundColor(.primary)

                    VStack(spacing: 8) {
                        HStack {
                            Text("Amount")
                                .frame(width: 80, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $bodyResonance, in: 0...1)
                        }
                        HStack {
                            Text("Decay")
                                .frame(width: 80, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $resonanceDecay, in: 0...1)
                        }
                        HStack {
                            Text("Cabinet")
                                .frame(width: 80, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $cabinetSimulation, in: 0...1)
                        }
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)

                // Mix & Output Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Output")
                        .font(.headline)
                        .foregroundColor(.primary)

                    VStack(spacing: 8) {
                        HStack {
                            Text("Mix")
                                .frame(width: 60, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $mix, in: 0...1)
                            Text("\(Int(mix * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .frame(width: 40)
                        }
                        HStack {
                            Text("Level")
                                .frame(width: 60, alignment: .leading)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Slider(value: $outputLevel, in: 0...1)
                        }
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)

                // Level Meters (Visual only - would need actual metering)
                HStack(spacing: 20) {
                    VStack {
                        Text("Input")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.green.opacity(0.6))
                            .frame(width: 20, height: 100)
                    }
                    VStack {
                        Text("Output")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.green.opacity(0.8))
                            .frame(width: 20, height: 100)
                    }
                }
                .padding(.vertical)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }

    private func loadPreset(_ index: Int) {
        // Load preset values (simplified - in real implementation would query DSP)
        switch index {
        case 0: // Clean Boost
            drive = 0.2
            bass = 0.5
            mid = 0.5
            treble = 0.6
            bodyResonance = 0.3
            resonanceDecay = 0.4
            mix = 0.3
            outputLevel = 0.8
            cabinetSimulation = 0.2
        case 1: // Crunch
            drive = 0.5
            bass = 0.6
            mid = 0.5
            treble = 0.5
            bodyResonance = 0.5
            resonanceDecay = 0.5
            mix = 0.6
            outputLevel = 0.8
            cabinetSimulation = 0.3
        case 2: // Overdrive
            drive = 0.7
            bass = 0.6
            mid = 0.6
            treble = 0.5
            bodyResonance = 0.6
            resonanceDecay = 0.6
            mix = 0.8
            outputLevel = 0.7
            cabinetSimulation = 0.4
        case 3: // Distortion
            drive = 0.9
            bass = 0.5
            mid = 0.7
            treble = 0.6
            bodyResonance = 0.4
            resonanceDecay = 0.3
            mix = 1.0
            outputLevel = 0.6
            cabinetSimulation = 0.5
        case 4: // Fuzz
            drive = 1.0
            bass = 0.4
            mid = 0.8
            treble = 0.7
            bodyResonance = 0.2
            resonanceDecay = 0.2
            mix = 1.0
            outputLevel = 0.5
            cabinetSimulation = 0.6
        case 5: // Warm Tube
            drive = 0.6
            bass = 0.7
            mid = 0.5
            treble = 0.4
            bodyResonance = 0.8
            resonanceDecay = 0.7
            mix = 0.7
            outputLevel = 0.7
            cabinetSimulation = 0.4
        case 6: // Acoustic Body
            drive = 0.3
            bass = 0.8
            mid = 0.5
            treble = 0.6
            bodyResonance = 0.9
            resonanceDecay = 0.8
            mix = 0.5
            outputLevel = 0.8
            cabinetSimulation = 0.3
        case 7: // Bass Warmth
            drive = 0.4
            bass = 0.9
            mid = 0.6
            treble = 0.4
            bodyResonance = 0.7
            resonanceDecay = 0.6
            mix = 0.6
            outputLevel = 0.8
            cabinetSimulation = 0.5
        default:
            break
        }
    }
}
