//
//  AudioUnit.swift
//  NexSynthPluginExtension
//
//  Main AUv3 audio unit implementation for NexSynth FM synthesizer
//

import AudioToolbox

@objc(AudioUnit)
public class AudioUnit: AUAudioUnit {

    var dsp: NexSynthDSPWrapper?
    var parameterTree: AUParameterTree!

    // FM Synthesizer Parameters
    private let fmSynthParameters: [AUParameterIdentifier: (name: String, range: ClosedRange<Float>, unit: AUUnitParameterUnit, defaultValue: Float)] = [
        // Global parameters
        "masterVolume": ("Master Volume", 0.0...1.0, .generic, 0.8),
        "pitchBendRange": ("Pitch Bend Range", 0.0...24.0, .generic, 2.0),
        "algorithm": ("Algorithm", 1.0...32.0, .indexed, 1.0),
        "structure": ("Structure", 0.0...1.0, .generic, 0.5),
        "stereoWidth": ("Stereo Width", 0.0...1.0, .generic, 0.5),
        "stereoOperatorDetune": ("Stereo Detune", 0.0...0.1, .generic, 0.02),

        // Operator 1
        "op1_ratio": ("Op1 Ratio", 0.1...20.0, .generic, 1.0),
        "op1_detune": ("Op1 Detune", -100.0...100.0, .generic, 0.0),
        "op1_modIndex": ("Op1 Mod Index", 0.0...20.0, .generic, 1.0),
        "op1_outputLevel": ("Op1 Level", 0.0...1.0, .generic, 1.0),
        "op1_feedback": ("Op1 Feedback", 0.0...1.0, .generic, 0.0),
        "op1_attack": ("Op1 Attack", 0.001...5.0, .generic, 0.01),
        "op1_decay": ("Op1 Decay", 0.001...5.0, .generic, 0.1),
        "op1_sustain": ("Op1 Sustain", 0.0...1.0, .generic, 0.7),
        "op1_release": ("Op1 Release", 0.001...5.0, .generic, 0.2),

        // Operator 2
        "op2_ratio": ("Op2 Ratio", 0.1...20.0, .generic, 2.0),
        "op2_detune": ("Op2 Detune", -100.0...100.0, .generic, 0.0),
        "op2_modIndex": ("Op2 Mod Index", 0.0...20.0, .generic, 1.0),
        "op2_outputLevel": ("Op2 Level", 0.0...1.0, .generic, 0.5),
        "op2_feedback": ("Op2 Feedback", 0.0...1.0, .generic, 0.0),
        "op2_attack": ("Op2 Attack", 0.001...5.0, .generic, 0.01),
        "op2_decay": ("Op2 Decay", 0.001...5.0, .generic, 0.1),
        "op2_sustain": ("Op2 Sustain", 0.0...1.0, .generic, 0.7),
        "op2_release": ("Op2 Release", 0.001...5.0, .generic, 0.2),

        // Operator 3
        "op3_ratio": ("Op3 Ratio", 0.1...20.0, .generic, 3.0),
        "op3_detune": ("Op3 Detune", -100.0...100.0, .generic, 0.0),
        "op3_modIndex": ("Op3 Mod Index", 0.0...20.0, .generic, 1.0),
        "op3_outputLevel": ("Op3 Level", 0.0...1.0, .generic, 0.5),
        "op3_feedback": ("Op3 Feedback", 0.0...1.0, .generic, 0.0),
        "op3_attack": ("Op3 Attack", 0.001...5.0, .generic, 0.01),
        "op3_decay": ("Op3 Decay", 0.001...5.0, .generic, 0.1),
        "op3_sustain": ("Op3 Sustain", 0.0...1.0, .generic, 0.7),
        "op3_release": ("Op3 Release", 0.001...5.0, .generic, 0.2),

        // Operator 4
        "op4_ratio": ("Op4 Ratio", 0.1...20.0, .generic, 4.0),
        "op4_detune": ("Op4 Detune", -100.0...100.0, .generic, 0.0),
        "op4_modIndex": ("Op4 Mod Index", 0.0...20.0, .generic, 1.0),
        "op4_outputLevel": ("Op4 Level", 0.0...1.0, .generic, 0.3),
        "op4_feedback": ("Op4 Feedback", 0.0...1.0, .generic, 0.0),
        "op4_attack": ("Op4 Attack", 0.001...5.0, .generic, 0.01),
        "op4_decay": ("Op4 Decay", 0.001...5.0, .generic, 0.1),
        "op4_sustain": ("Op4 Sustain", 0.0...1.0, .generic, 0.7),
        "op4_release": ("Op4 Release", 0.001...5.0, .generic, 0.2),

        // Operator 5
        "op5_ratio": ("Op5 Ratio", 0.1...20.0, .generic, 5.0),
        "op5_detune": ("Op5 Detune", -100.0...100.0, .generic, 0.0),
        "op5_modIndex": ("Op5 Mod Index", 0.0...20.0, .generic, 1.0),
        "op5_outputLevel": ("Op5 Level", 0.0...1.0, .generic, 0.2),
        "op5_feedback": ("Op5 Feedback", 0.0...1.0, .generic, 0.0),
        "op5_attack": ("Op5 Attack", 0.001...5.0, .generic, 0.01),
        "op5_decay": ("Op5 Decay", 0.001...5.0, .generic, 0.1),
        "op5_sustain": ("Op5 Sustain", 0.0...1.0, .generic, 0.7),
        "op5_release": ("Op5 Release", 0.001...5.0, .generic, 0.2),
    ]

    public override init(componentDescription: AudioComponentDescription,
                         options: AudioComponentInstantiationOptions) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Initialize DSP wrapper
        dsp = NexSynthDSPWrapper()

        // Create parameter tree
        parameterTree = AUParameterTree()

        // Register FM synthesizer parameters
        for (identifier, info) in fmSynthParameters {
            let parameter = AUParameter(
                identifier: identifier,
                name: info.name,
                address: AUParameterAddress(identifier.hashValue),
                range: info.range,
                unit: info.unit,
                flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
            )
            parameter.value = info.defaultValue
            parameterTree.registerParameter(parameter)
        }

        // Default parameter values
        parameterTree.implementorValueProvider = { [weak self] address in
            guard let self = self else { return 0.0 }
            return self.dsp?.getParameter(forAddress: address) ?? 0.5
        }

        parameterTree.implementorValueObserver = { [weak self] address, value in
            self?.dsp?.setParameter(address, value: value)
        }

        parameterTree.implementorStringFromValueProvider = { parameter, value in
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
            var eventIterator = events.pointee
            while eventIterator.head != nil {
                let event = eventIterator.head.pointee
                self.handleEvent(event)
                eventIterator = eventIterator.tail
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
        dsp?.setParameter(event.parameterAddress, value: event.value)
    }
}
