/*
  AudioUnit.swift - LocalGal AUv3 Instrument Extension

  Main audio unit implementation for iOS AUv3 extension.
  Handles DSP rendering, parameter management, and MIDI input.
*/

import AVFoundation
import CoreAudio

class LocalGalAudioUnit: AUAudioUnit {
    // DSP instance handle (C++)
    private var dspInstance: OpaquePointer?

    // Parameter tree
    private var parameterTree: AUParameterTree!

    // Factory presets
    private var factoryPresets = [AUAudioUnitPreset]()

    // Input/output bus
    private var inputBus: AUAudioUnitBus!
    private var outputBus: AUAudioUnitBus!
    private var internalRenderBlock: AUInternalRenderBlock!

    // MARK: - Lifecycle

    override init(componentDescription: AudioComponentDescription,
                  options: AudioComponentInstantiationOptions = []) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Create DSP instance
        dspInstance = localgal_create()
        guard dspInstance != nil else {
            throw NSError(domain: "LocalGalAudioUnit", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Failed to create DSP instance"])
        }

        // Setup parameter tree
        setupParameters()

        // Setup factory presets
        setupFactoryPresets()

        // Setup audio bus format
        let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 2)!
        inputBus = AUAudioUnitBus(format: format)
        outputBus = AUAudioUnitBus(format: format)
        inputBus.isEnabled = false  // Instrument (no audio input)

        // Setup render block
        setupRenderBlock()
    }

    deinit {
        if let dsp = dspInstance {
            localgal_destroy(dsp)
        }
    }

    // MARK: - Setup

    private func setupParameters() {
        let parameterDefinitions = [
            // Master
            AUParameterNode(identifier: "master_volume",
                           name: "Master Volume",
                           address: 0,
                           range: 0.0...1.0,
                           unit: .linearGain,
                           flags: .flag_DefaultValue),

            // Oscillator
            AUParameterNode(identifier: "osc_waveform",
                           name: "Waveform",
                           address: 1,
                           range: 0.0...4.0,
                           unit: .indexed,
                           flags: .flag_DefaultValue),

            // Filter
            AUParameterNode(identifier: "filter_cutoff",
                           name: "Filter Cutoff",
                           address: 2,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),

            AUParameterNode(identifier: "filter_resonance",
                           name: "Filter Resonance",
                           address: 3,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),

            // Feel Vector
            AUParameterNode(identifier: "feel_rubber",
                           name: "Rubber",
                           address: 4,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),

            AUParameterNode(identifier: "feel_bite",
                           name: "Bite",
                           address: 5,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),

            AUParameterNode(identifier: "feel_hollow",
                           name: "Hollow",
                           address: 6,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),

            AUParameterNode(identifier: "feel_growl",
                           name: "Growl",
                           address: 7,
                           range: 0.0...1.0,
                           unit: .generic,
                           flags: .flag_DefaultValue),
        ]

        // Create parameter tree
        parameterTree = AUParameterTree.createTree(withChildren: parameterDefinitions)

        // Set default values
        if let dsp = dspInstance {
            for param in parameterDefinitions {
                let defaultValue = localgal_get_parameter_default(dsp, param.identifier)
                param.value = defaultValue
            }
        }

        // Observe parameter changes
        parameterTree.implementorValueObserver = { [weak self] param, value in
            guard let self = self, let dsp = self.dspInstance else { return }
            localgal_set_parameter_value(dsp, param.identifier, value)
        }

        parameterTree.implementorValueProvider = { [weak self] param in
            guard let self = self, let dsp = self.dspInstance else { return 0.0 }
            return localgal_get_parameter_value(dsp, param.identifier)
        }
    }

    private func setupFactoryPresets() {
        guard let dsp = dspInstance else { return }

        let presetCount = localgal_get_factory_preset_count(dsp)

        for i in 0..<presetCount {
            var nameBuffer = [Int8](repeating: 0, count: 256)
            if localgal_get_factory_preset_name(dsp, i, &nameBuffer, 256) {
                let name = String(cString: nameBuffer)
                let preset = AUAudioUnitPreset(number: i,
                                              name: name,
                                              auAudioUnit: self)
                factoryPresets.append(preset)
            }
        }
    }

    private func setupRenderBlock() {
        internalRenderBlock = { [weak self] (
            _ actionFlags: UnsafeMutablePointer<AudioUnitRenderActionFlags>,
            _ timestamp: UnsafePointer<AudioTimeStamp>,
            _ frameCount: AUAudioFrameCount,
            _ outputBusNumber: Int,
            outputBuffers: UnsafeMutablePointer<AudioBufferList>,
            _ renderEvents: AURenderEvent?,
            _ pullInputBlock: AURenderPullInputBlock?
        ) -> AUAudioUnitStatus in

            guard let self = self else {
                return kAudioUnitErr_NoConnection
            }

            guard let dsp = self.dspInstance else {
                return kAudioUnitErr_FatalError
            }

            let bufferList = outputBuffers.pointee
            guard bufferList.mNumberBuffers >= 2 else {
                return kAudioUnitErr_FormatNotSupported
            }

            let leftChannel = bufferList.mBuffers.0.mData?.assumingMemoryBound(to: Float.self)
            let rightChannel = bufferList.mBuffers.1.mData?.assumingMemoryBound(to: Float.self)

            guard let left = leftChannel, let right = rightChannel else {
                return kAudioUnitErr_FatalError
            }

            // Process audio through DSP
            localgal_process(dsp, left, right, Int(frameCount))

            return noErr
        }
    }

    // MARK: - AUAudioUnit Overrides

    override var parameterTree: AUParameterTree? {
        get { return self.parameterTree }
        set { }
    }

    override var factoryPresets: [AUAudioUnitPreset] {
        return factoryPresets
    }

    override var internalRenderBlock: AUInternalRenderBlock {
        return internalRenderBlock
    }

    override func allocateRenderResources() throws {
        try super.allocateRenderResources()

        guard let dsp = dspInstance else {
            throw NSError(domain: "LocalGalAudioUnit", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "DSP instance not available"])
        }

        // Initialize DSP
        let initialized = localgal_initialize(dsp,
                                              Double(outputBus.format.sampleRate),
                                              Int(maximumFramesToRender))
        guard initialized else {
            throw NSError(domain: "LocalGalAudioUnit", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Failed to initialize DSP"])
        }
    }

    override func deallocateRenderResources() {
        super.deallocateRenderResources()
        // Reset DSP if needed
    }

    // MARK: - MIDI

    func handleMIDIEvent(_ event: MIDIEvent) {
        guard let dsp = dspInstance else { return }

        switch event.status {
        case 0x90: // Note On
            if event.data1 > 0 && event.data2 > 0 {
                localgal_note_on(dsp, Int(event.data1), Float(event.data2) / 127.0)
            }
        case 0x80: // Note Off
            localgal_note_off(dsp, Int(event.data1))
        case 0xE0: // Pitch Bend
            break // TODO: Implement pitch bend
        default:
            break
        }
    }

    // MARK: - State

    override func fullState(for presetName: String?) throws -> AUAudioUnitState {
        guard let dsp = dspInstance else {
            throw NSError(domain: "LocalGalAudioUnit", code: -1,
                         userInfo: nil)
        }

        var jsonBuffer = [Int8](repeating: 0, count: 4096)
        let result = localgal_save_preset(dsp, &jsonBuffer, 4096)

        guard result > 0 else {
            throw NSError(domain: "LocalGalAudioUnit", code: -1,
                         userInfo: nil)
        }

        let presetData = String(cString: jsonBuffer)
        return ["presetData": presetData]
    }

    override func setFullState(_ state: AUAudioUnitState) throws {
        guard let dsp = dspInstance,
              let presetData = state["presetData"] as? String else {
            return
        }

        localgal_load_preset(dsp, presetData)
    }
}

// MARK: - MIDI Event

struct MIDIEvent {
    let status: UInt8
    let data1: UInt8
    let data2: UInt8
}
