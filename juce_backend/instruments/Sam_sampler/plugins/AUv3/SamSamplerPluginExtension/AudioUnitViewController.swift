//
//  AudioUnitViewController.swift
//  SamSamplerPluginExtension
//
//  SwiftUI view controller for Sam Sampler AUv3 plugin
//

import SwiftUI
import AVFoundation

struct AudioUnitViewController: View {

    @StateObject private var viewModel = SamplerViewModel()

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // SoundFont File Picker
                SoundFontPicker(viewModel: viewModel)

                // Instrument Browser
                InstrumentBrowser(viewModel: viewModel)
                    .frame(height: 150)

                // Envelope Controls
                EnvelopeControls(viewModel: viewModel)
                    .frame(height: 200)

                // Filter Controls
                FilterControls(viewModel: viewModel)
                    .frame(height: 150)

                // Keyboard
                PianoKeyboard(viewModel: viewModel)
                    .frame(height: 120)

                Spacer()
            }
            .padding()
            .navigationTitle("Sam Sampler")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save Preset") {
                        viewModel.savePreset()
                    }
                }
            }
        }
    }
}

// MARK: - SoundFont Picker
struct SoundFontPicker: View {
    @ObservedObject var viewModel: SamplerViewModel
    @State private var showFilePicker = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SoundFont File")
                .font(.headline)

            Button(action: {
                showFilePicker = true
            }) {
                HStack {
                    Image(systemName: "doc.fill")
                    Text(viewModel.soundFontName.isEmpty ? "Load SF2 File" : viewModel.soundFontName)
                        .foregroundColor(viewModel.soundFontName.isEmpty ? .gray : .primary)
                    Spacer()
                    Image(systemName: "chevron.down")
                }
                .padding()
                .background(Color.gray.opacity(0.2))
                .cornerRadius(8)
            }
            .buttonStyle(PlainButtonStyle())
            .sheet(isPresented: $showFilePicker) {
                DocumentPicker(viewModel: viewModel)
            }
        }
    }
}

struct DocumentPicker: UIViewControllerRepresentable {
    @ObservedObject var viewModel: SamplerViewModel
    @Environment(\.presentationMode) var presentationMode

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(documentTypes: ["public.audio"], in: .open)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(viewModel: viewModel, presentationMode: presentationMode)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        @ObservedObject var viewModel: SamplerViewModel
        var presentationMode: PresentationMode

        init(viewModel: SamplerViewModel, presentationMode: PresentationMode) {
            self.viewModel = viewModel
            self.presentationMode = presentationMode
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            if let url = urls.first {
                viewModel.loadSoundFont(from: url)
                presentationMode.dismiss()
            }
        }
    }
}

// MARK: - Instrument Browser
struct InstrumentBrowser: View {
    @ObservedObject var viewModel: SamplerViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Instruments")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.instruments, id: \.self) { instrument in
                        Button(action: {
                            viewModel.selectInstrument(instrument)
                        }) {
                            Text(instrument)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(viewModel.selectedInstrument == instrument ? Color.blue : Color.gray.opacity(0.2))
                                .foregroundColor(viewModel.selectedInstrument == instrument ? .white : .primary)
                                .cornerRadius(16)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Envelope Controls
struct EnvelopeControls: View {
    @ObservedObject var viewModel: SamplerViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Envelope (ADSR)")
                .font(.headline)

            HStack(spacing: 16) {
                EnvelopeSlider(name: "A", value: $viewModel.attack, range: 0.001...5.0)
                EnvelopeSlider(name: "H", value: $viewModel.hold, range: 0.0...5.0)
                EnvelopeSlider(name: "D", value: $viewModel.decay, range: 0.001...5.0)
                EnvelopeSlider(name: "S", value: $viewModel.sustain, range: 0.0...1.0)
                EnvelopeSlider(name: "R", value: $viewModel.release, range: 0.001...5.0)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct EnvelopeSlider: View {
    let name: String
    @Binding var value: Double
    let range: ClosedRange<Double>

    var body: some View {
        VStack(spacing: 4) {
            Text(name)
                .font(.caption)
                .foregroundColor(.secondary)

            VStack {
                Slider(value: $value, in: range) { _ in
                    // Update DSP
                }
                .rotationEffect(.degrees(-90))
                .frame(width: 80, height: 80)

                Text(String(format: "%.3f", value))
                    .font(.caption2)
                    .frame(width: 60)
            }
        }
    }
}

// MARK: - Filter Controls
struct FilterControls: View {
    @ObservedObject var viewModel: SamplerViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Filter")
                    .font(.headline)

                Toggle("", isOn: $viewModel.filterEnabled)
                    .labelsHidden()
            }

            HStack(spacing: 20) {
                VStack(alignment: .leading) {
                    Text("Cutoff")
                        .font(.caption)
                    Slider(value: $viewModel.filterCutoff, in: 20...20000) { _ in
                        viewModel.updateFilter()
                    }
                    Text("\(Int(viewModel.filterCutoff)) Hz")
                        .font(.caption2)
                }

                VStack(alignment: .leading) {
                    Text("Resonance")
                        .font(.caption)
                    Slider(value: $viewModel.filterResonance, in: 0...1) { _ in
                        viewModel.updateFilter()
                    }
                    Text(String(format: "%.2f", viewModel.filterResonance))
                        .font(.caption2)
                }
            }
            .disabled(!viewModel.filterEnabled)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Piano Keyboard
struct PianoKeyboard: View {
    @ObservedObject var viewModel: SamplerViewModel

    let whiteKeys = [0, 2, 4, 5, 7, 9, 11]  // C, D, E, F, G, A, B
    let blackKeys = [1, 3, 6, 8, 10]       // C#, D#, F#, G#, A#

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                // White keys
                HStack(spacing: 2) {
                    ForEach(whiteKeys, id: \.self) { key in
                        KeyButton(note: 60 + key, isBlack: false, viewModel: viewModel)
                    }
                }

                // Black keys (overlay)
                HStack(spacing: 0) {
                    ForEach(Array(blackKeys.enumerated()), id: \.offset) { _, key in
                        if key < 6 {
                            KeyButton(note: 60 + key, isBlack: true, viewModel: viewModel)
                                .offset(x: -12, y: 0)
                        }
                        if key < 5 {
                            Spacer()
                                .frame(width: 28)
                        }
                    }
                }
            }
        }
    }
}

struct KeyButton: View {
    let note: UInt8
    let isBlack: Bool
    @ObservedObject var viewModel: SamplerViewModel
    @State private var isPressed = false

    var body: some View {
        Button(action: {}) {
            Rectangle()
                .fill(isBlack ? .black : .white)
                .frame(width: isBlack ? 30 : 40, height: isBlack ? 60 : 100)
                .border(Color.gray, width: 1)
                .opacity(isPressed ? 0.7 : 1.0)
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isPressed {
                        isPressed = true
                        viewModel.noteOn(note, velocity: 80)
                    }
                }
                .onEnded { _ in
                    isPressed = false
                    viewModel.noteOff(note)
                }
        )
    }
}

// MARK: - View Model
class SamplerViewModel: ObservableObject {
    @Published var soundFontName = ""
    @Published var instruments: [String] = []
    @Published var selectedInstrument = ""

    // Envelope
    @Published var attack: Double = 0.01
    @Published var hold: Double = 0.0
    @Published var decay: Double = 0.1
    @Published var sustain: Double = 0.7
    @Published var release: Double = 0.2

    // Filter
    @Published var filterEnabled = false
    @Published var filterCutoff: Double = 20000
    @Published var filterResonance: Double = 0.0

    private var audioUnit: AUAudioUnit?

    func setAudioUnit(_ audioUnit: AUAudioUnit?) {
        self.audioUnit = audioUnit
    }

    func loadSoundFont(from url: URL) {
        soundFontName = url.lastPathComponent
        // Load SF2 in DSP
        // Update instruments list
        instruments = ["Grand Piano", "Electric Piano", "Strings", "Choir"]  // Placeholder
    }

    func selectInstrument(_ instrument: String) {
        selectedInstrument = instrument
        // Select instrument in DSP
    }

    func noteOn(_ note: UInt8, velocity: UInt8) {
        // Send MIDI note on
    }

    func noteOff(_ note: UInt8) {
        // Send MIDI note off
    }

    func updateFilter() {
        // Update filter parameters in DSP
    }

    func savePreset() {
        // Save current state as preset
    }
}
