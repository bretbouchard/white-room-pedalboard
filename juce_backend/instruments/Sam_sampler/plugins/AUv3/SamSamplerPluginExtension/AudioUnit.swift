//
//  AudioUnit.swift
//  SamSamplerPluginExtension
//
//  Main AUv3 audio unit implementation for Sam Sampler
//

import AudioToolbox

@objc(AudioUnit)
public class AudioUnit: AUAudioUnit {

    var dsp: SamSamplerDSPWrapper?
    var parameterTree: AUParameterTree!

    // Sam Sampler Parameters
    private let samplerParameters: [AUParameterIdentifier: (name: String, range: ClosedRange<Float>, unit: AUUnitParameterUnit)] = [
        // Global parameters
        "masterVolume": ("Master Volume", 0.0...1.5, .generic),
        "pitchBendRange": ("Pitch Bend Range", 0.0...24.0, .semitones),
        "basePitch": ("Base Pitch", 0.1...4.0, .generic),

        // Envelope parameters
        "envAttack": ("Attack", 0.001...5.0, .seconds),
        "envHold": ("Hold", 0.0...5.0, .seconds),
        "envDecay": ("Decay", 0.001...5.0, .seconds),
        "envSustain": ("Sustain", 0.0...1.0, .generic),
        "envRelease": ("Release", 0.001...5.0, .seconds),

        // Envelope curves
        "envAttackCurve": ("Attack Curve", 0.0...3.0, .indexed),
        "envDecayCurve": ("Decay Curve", 0.0...3.0, .indexed),
        "envReleaseCurve": ("Release Curve", 0.0...3.0, .indexed),

        // Filter parameters
        "filterCutoff": ("Filter Cutoff", 20.0...20000.0, .hertz),
        "filterResonance": ("Filter Resonance", 0.0...1.0, .generic),
        "filterEnabled": ("Filter Enabled", 0.0...1.0, .boolean),
        "filterType": ("Filter Type", 0.0...3.0, .indexed),

        // Effects
        "reverbMix": ("Reverb Mix", 0.0...1.0, .generic),
        "delayMix": ("Delay Mix", 0.0...1.0, .generic),
        "drive": ("Drive", 0.0...1.0, .generic),

        // Structure
        "structure": ("Structure", 0.0...1.0, .generic),

        // Stereo
        "stereoWidth": ("Stereo Width", 0.0...1.0, .generic)
    ]

    public override init(componentDescription: AudioComponentDescription,
                         options: AudioComponentInstantiationOptions) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Initialize DSP wrapper
        dsp = SamSamplerDSPWrapper()

        // Create parameter tree
        parameterTree = AUParameterTree()

        // Register parameters
        for (identifier, info) in samplerParameters {
            let parameter = AUParameter(
                identifier: identifier,
                name: info.name,
                address: AUParameterAddress(identifier.hashValue),
                range: info.range,
                unit: info.unit,
                flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
            )
            parameterTree.registerParameter(parameter)
        }

        // Set default values
        parameterTree.implementorValueProvider = { [weak self] address in
            guard let self = self else { return 0.0 }
            return self.dsp?.getParameter(forAddress: address) ?? 0.5
        }

        parameterTree.implementorValueObserver = { [weak self] address, value in
            self?.dsp?.setParameter(address, value: value)
        }

        parameterTree.implementorStringFromValueProvider = { parameter, value in
            if parameter?.identifier == "filterType" {
                let types = ["LP", "BP", "HP", "Notch"]
                let index = Int(value)
                if index >= 0 && index < types.count {
                    return types[index]
                }
            }
            if parameter?.identifier == "filterEnabled" {
                return value > 0.5 ? "On" : "Off"
            }
            return String(format: "%.2f", value)
        }
    }

    public override func allocateRenderResources() throws {
        try super.allocateRenderResources()

        // Initialize DSP with current format
        if let dsp = dsp {
            let format = self.outputBusses[0].format
            dsp.initialize(withSampleRate: format.sampleRate,
                          maximumFramesToRender: Int32(self.maximumFramesToRender))
        }
    }

    public override func deallocateRenderResources() {
        super.deallocateRenderResources()
    }

    public override var internalRenderBlock: AUInternalRenderBlock {
        return { [weak self] timestamp, frameCount, outputBusNumber, outputBufferList, inputBusNumber, events in
            guard let self = self else {
                return kAudioUnitErr_InvalidProperty
            }

            // Process events (MIDI, parameters)
            for event in events {
                self.handleEvent(event)
            }

            // Render audio
            self.dsp?.process(frameCount: frameCount,
                            outputBufferList: outputBufferList,
                            timestamp: timestamp)

            return noErr
        }
    }

    private func handleEvent(_ event: AURenderEvent) {
        switch event.head.eventType {
        case .MIDI:
            if let midiEvent = event.MIDI {
                self.handleMIDI(midiEvent)
            }
        case .parameter:
            if let parameterEvent = event.parameter {
                self.handleParameter(parameterEvent)
            }
        default:
            break
        }
    }

    private func handleMIDI(_ event: AUMIDIEvent) {
        var message = [UInt8](repeating: 0, count: Int(event.length))
        message.withMutableBufferPointer { buffer in
            if let baseAddress = buffer.baseAddress {
                event.getData(&baseAddress.pointee)
                self.dsp?.handleMIDIEvent(message, messageSize: UInt8(event.length))
            }
        }
    }

    private func handleParameter(_ event: AUParameterEvent) {
        parameterTree.parameter(forAddress: event.parameterAddress)?.value = event.value
    }
}
