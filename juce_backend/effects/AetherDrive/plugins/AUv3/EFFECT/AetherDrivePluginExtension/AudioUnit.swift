//
//  AudioUnit.swift
//  AetherDrivePluginExtension
//
//  Main AUv3 EFFECT audio unit implementation (aufx type)
//

import AudioToolbox

@objc(AudioUnit)
public class AudioUnit: AUAudioUnit {

    var dsp: AetherDriveDSPWrapper?
    var parameterTree: AUParameterTree!

    // AetherDrive Effect Parameters (9 parameters)
    private let effectParameters: [AUParameterIdentifier: (name: String, range: ClosedRange<Float>, unit: AUUnitParameterUnit)] = [
        "drive": ("Drive", 0.0...1.0, .generic),
        "bass": ("Bass", 0.0...1.0, .generic),
        "mid": ("Mid", 0.0...1.0, .generic),
        "treble": ("Treble", 0.0...1.0, .generic),
        "body_resonance": ("Body Resonance", 0.0...1.0, .generic),
        "resonance_decay": ("Resonance Decay", 0.0...1.0, .generic),
        "mix": ("Mix", 0.0...1.0, .percent),
        "output_level": ("Output Level", 0.0...1.0, .generic),
        "cabinet_simulation": ("Cabinet", 0.0...1.0, .generic)
    ]

    public override init(componentDescription: AudioComponentDescription,
                         options: AudioComponentInstantiationOptions) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Initialize DSP wrapper
        dsp = AetherDriveDSPWrapper()

        // Create parameter tree
        parameterTree = AUParameterTree()

        // Register effect parameters
        for (identifier, info) in effectParameters {
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

        // Default parameter values
        parameterTree.implementorValueProvider = { [weak self] address in
            guard let self = self else { return 0.0 }
            return self.dsp?.getParameter(forAddress: address) ?? 0.5
        }

        parameterTree.implementorValueObserver = { [weak self] address, value in
            self?.dsp?.setParameter(address, value: value)
        }

        parameterTree.implementorStringFromValueProvider = { parameter, value in
            if let param = parameter {
                switch param.identifier {
                case "mix":
                    return String(format: "%.0f%%", value * 100)
                default:
                    return String(format: "%.2f", value)
                }
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

            // Process events (parameters only - effects don't handle MIDI)
            for event in events {
                self.handleEvent(event)
            }

            // Render audio (EFFECT: process input to output)
            self.dsp?.process(frameCount: frameCount,
                            outputBufferList: outputBufferList,
                            inputBufferList: inputBufferNumber >= 0 ? self.inputBusses[Int(inputBusNumber)].mutableAudioBufferList : nil,
                            timestamp: timestamp)

            return noErr
        }
    }

    private func handleEvent(_ event: AURenderEvent) {
        switch event.head.eventType {
        case .parameter:
            if let parameterEvent = event.parameter {
                self.handleParameter(parameterEvent)
            }
        case .MIDI:
            // Effects ignore MIDI events
            break
        default:
            break
        }
    }

    private func handleParameter(_ event: AUParameterEvent) {
        dsp?.setParameter(event.parameterAddress, value: event.value)
    }
}
