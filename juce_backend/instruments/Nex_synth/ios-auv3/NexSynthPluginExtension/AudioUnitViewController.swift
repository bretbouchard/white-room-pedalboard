//
//  AudioUnitViewController.swift
//  NexSynthPluginExtension
//
//  SwiftUI UI for NexSynth FM synthesizer
//

import SwiftUI
import AVFoundation

struct AudioUnitViewController: View {
    @State private var selectedOperator = 1
    @State private var currentAlgorithm = 1
    @State private var masterVolume: Double = 0.8
    @State private var structure: Double = 0.5

    // Operator parameters
    @State private var operatorParams: [[String: Double]] = Array(repeating: [
        "ratio": 1.0, "detune": 0.0, "modIndex": 1.0,
        "outputLevel": 1.0, "feedback": 0.0,
        "attack": 0.01, "decay": 0.1, "sustain": 0.7, "release": 0.2
    ], count: 5)

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header with master controls
                HeaderSection(masterVolume: $masterVolume, structure: $structure)

                // Algorithm selector
                AlgorithmSelector(selectedAlgorithm: $currentAlgorithm)

                // Operator matrix (visual representation)
                OperatorMatrixView(algorithm: currentAlgorithm)

                // Operator controls
                TabView(selection: $selectedOperator) {
                    ForEach(1...5, id: \.self) { opIndex in
                        OperatorControlsView(
                            operatorIndex: opIndex,
                            params: binding(for: opIndex - 1)
                        )
                        .tabItem {
                            Text("Op \(opIndex)")
                        }
                        .tag(opIndex)
                    }
                }
                .frame(height: 400)
            }
            .padding()
        }
        .background(Color.black)
    }

    private func binding(for index: Int) -> Binding<Double> {
        Binding(
            get: { self.operatorParams[index]["ratio"] ?? 1.0 },
            set: { self.operatorParams[index]["ratio"] = $0 }
        )
    }
}

struct HeaderSection: View {
    @Binding var masterVolume: Double
    @Binding var structure: Double

    var body: some View {
        VStack(spacing: 10) {
            Text("NEX FM SYNTH")
                .font(.headline)
                .foregroundColor(.white)

            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Master Volume")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Slider(value: $masterVolume, in: 0...1)
                        .frame(width: 150)
                }

                VStack(alignment: .leading, spacing: 5) {
                    Text("Structure")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Slider(value: $structure, in: 0...1)
                        .frame(width: 150)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.2))
        .cornerRadius(10)
    }
}

struct AlgorithmSelector: View {
    @Binding var selectedAlgorithm: Int

    let algorithms = [1, 2, 3, 16, 32] // Common algorithms

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("FM Algorithm")
                .font(.headline)
                .foregroundColor(.white)

            Picker("Algorithm", selection: $selectedAlgorithm) {
                ForEach(algorithms, id: \.self) { algo in
                    Text("Algorithm \(algo)")
                        .tag(algo)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
        }
        .padding()
        .background(Color.gray.opacity(0.2))
        .cornerRadius(10)
    }
}

struct OperatorMatrixView: View {
    let algorithm: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Operator Routing (Algorithm \(algorithm))")
                .font(.headline)
                .foregroundColor(.white)

            // Visual matrix representation
            VStack(spacing: 2) {
                ForEach(0..<5) { row in
                    HStack(spacing: 2) {
                        ForEach(0..<5) { col in
                            Rectangle()
                                .fill(modulationColor(row: row, col: col))
                                .frame(width: 30, height: 30)
                        }
                    }
                }
            }
            .padding()
        }
        .padding()
        .background(Color.gray.opacity(0.2))
        .cornerRadius(10)
    }

    private func modulationColor(row: Int, col: Int) -> Color {
        // Simplified visualization - would match actual algorithm
        if row == col {
            return Color.gray.opacity(0.3)
        }

        switch algorithm {
        case 1: // Series
            return row == col + 1 ? Color.blue : Color.gray.opacity(0.1)
        case 16: // 1 modulator -> all carriers
            return row > 0 && col == 0 ? Color.blue : Color.gray.opacity(0.1)
        case 32: // Additive (no modulation)
            return Color.gray.opacity(0.1)
        default:
            return Color.gray.opacity(0.1)
        }
    }
}

struct OperatorControlsView: View {
    let operatorIndex: Int
    @Binding var params: [String: Double]

    var body: some View {
        ScrollView {
            VStack(spacing: 15) {
                Text("Operator \(operatorIndex)")
                    .font(.headline)
                    .foregroundColor(.white)

                // Oscillator controls
                Group {
                    ParameterSlider(
                        name: "Frequency Ratio",
                        value: $params["ratio"] ?? 1.0,
                        range: 0.1...20.0,
                        format: "%.2f"
                    )

                    ParameterSlider(
                        name: "Detune (cents)",
                        value: $params["detune"] ?? 0.0,
                        range: -100...100,
                        format: "%.0f"
                    )

                    ParameterSlider(
                        name: "Modulation Index",
                        value: $params["modIndex"] ?? 1.0,
                        range: 0...20.0,
                        format: "%.2f"
                    )
                }

                Divider()
                    .background(.gray)

                // Output controls
                Group {
                    ParameterSlider(
                        name: "Output Level",
                        value: $params["outputLevel"] ?? 1.0,
                        range: 0...1.0,
                        format: "%.2f"
                    )

                    ParameterSlider(
                        name: "Feedback",
                        value: $params["feedback"] ?? 0.0,
                        range: 0...1.0,
                        format: "%.2f"
                    )
                }

                Divider()
                    .background(.gray)

                // Envelope controls
                Group {
                    ParameterSlider(
                        name: "Attack (s)",
                        value: $params["attack"] ?? 0.01,
                        range: 0.001...5.0,
                        format: "%.3f"
                    )

                    ParameterSlider(
                        name: "Decay (s)",
                        value: $params["decay"] ?? 0.1,
                        range: 0.001...5.0,
                        format: "%.3f"
                    )

                    ParameterSlider(
                        name: "Sustain",
                        value: $params["sustain"] ?? 0.7,
                        range: 0...1.0,
                        format: "%.2f"
                    )

                    ParameterSlider(
                        name: "Release (s)",
                        value: $params["release"] ?? 0.2,
                        range: 0.001...5.0,
                        format: "%.3f"
                    )
                }
            }
            .padding()
        }
        .background(Color.black)
    }
}

struct ParameterSlider: View {
    let name: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(name)
                    .font(.caption)
                    .foregroundColor(.gray)
                Spacer()
                Text(String(format: format, value))
                    .font(.caption)
                    .foregroundColor(.white)
            }
            Slider(value: $value, in: range)
                .accentColor(.blue)
        }
    }
}

// Preview
struct AudioUnitViewController_Previews: PreviewProvider {
    static var previews: some View {
        AudioUnitViewController()
    }
}
