//
//  BiPhaseAudioUnit.swift
//  BiPhasePluginExtension
//
//  Core AUv3 Audio Unit implementation for BiPhase Phaser Effect
//

import AVFoundation
import CoreAudio

//==============================================================================
// BiPhase Audio Unit
//==============================================================================

class BiPhaseAudioUnit: AUAudioUnit {
    //==========================================================================
    // DSP Context
    //==========================================================================

    private var dspContext: BiPhaseDSPContext?

    //==========================================================================
    // Parameter Tree
    //==========================================================================

    private var parameterTree: AUParameterTree?

    //==========================================================================
    // Input/Output Busses
    //==========================================================================

    private var inputBus: AUAudioUnitBus?
    private var outputBus: AUAudioUnitBus?

    //==========================================================================
    // Initialization
    //==========================================================================

    override init(componentDescription: AudioComponentDescription,
                  options: AudioComponentInstantiationOptions = []) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Create DSP context
        let sampleRate = 48000.0  // Will be updated during allocateRenderResources
        dspContext = BiPhaseDSP_Create(sampleRate)

        guard dspContext != nil else {
            throw NSError(domain: "BiPhaseAudioUnit", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to create DSP context"
            ])
        }

        // Setup parameter tree
        setupParameterTree()

        // Setup busses
        setupBusses()
    }

    deinit {
        if let context = dspContext {
            BiPhaseDSP_Destroy(context)
        }
    }

    //==========================================================================
    // Setup Methods
    //==========================================================================

    private func setupParameterTree() {
        // Create parameters
        let rateAParam = AUParameter(
            identifier: "rateA",
            name: "Phasor A Rate",
            address: 0,
            min: 0.0,
            max: 1.0,
            unit: .hertz,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let depthAParam = AUParameter(
            identifier: "depthA",
            name: "Phasor A Depth",
            address: 1,
            min: 0.0,
            max: 1.0,
            unit: .percent,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let feedbackAParam = AUParameter(
            identifier: "feedbackA",
            name: "Phasor A Feedback",
            address: 2,
            min: 0.0,
            max: 1.0,
            unit: .percent,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let shapeAParam = AUParameter(
            identifier: "shapeA",
            name: "Phasor A Shape",
            address: 3,
            min: 0.0,
            max: 1.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        shapeAParam.valueStrings = ["Sine", "Square"]

        let rateBParam = AUParameter(
            identifier: "rateB",
            name: "Phasor B Rate",
            address: 4,
            min: 0.0,
            max: 1.0,
            unit: .hertz,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let depthBParam = AUParameter(
            identifier: "depthB",
            name: "Phasor B Depth",
            address: 5,
            min: 0.0,
            max: 1.0,
            unit: .percent,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let feedbackBParam = AUParameter(
            identifier: "feedbackB",
            name: "Phasor B Feedback",
            address: 6,
            min: 0.0,
            max: 1.0,
            unit: .percent,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        let shapeBParam = AUParameter(
            identifier: "shapeB",
            name: "Phasor B Shape",
            address: 7,
            min: 0.0,
            max: 1.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        shapeBParam.valueStrings = ["Sine", "Square"]

        let routingModeParam = AUParameter(
            identifier: "routingMode",
            name: "Routing Mode",
            address: 8,
            min: 0.0,
            max: 2.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        routingModeParam.valueStrings = ["Parallel", "Series", "Independent"]

        let sweepSyncParam = AUParameter(
            identifier: "sweepSync",
            name: "Sweep Sync",
            address: 9,
            min: 0.0,
            max: 1.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        sweepSyncParam.valueStrings = ["Normal", "Reverse"]

        let sourceAParam = AUParameter(
            identifier: "sourceA",
            name: "Phasor A Source",
            address: 10,
            min: 0.0,
            max: 1.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        sourceAParam.valueStrings = ["LFO 1", "LFO 2"]

        let sourceBParam = AUParameter(
            identifier: "sourceB",
            name: "Phasor B Source",
            address: 11,
            min: 0.0,
            max: 1.0,
            unit: .indexed,
            flags: [.flag_IsReadable, .flag_IsWritable]
        )
        sourceBParam.valueStrings = ["LFO 1", "LFO 2"]

        let mixParam = AUParameter(
            identifier: "mix",
            name: "Mix",
            address: 12,
            min: 0.0,
            max: 1.0,
            unit: .percent,
            flags: [.flag_IsReadable, .flag_IsWritable, .flag_CanRamp]
        )

        // Create parameter tree
        let parameterTree = AUParameterTree.createTree(withChildren: [
            rateAParam, depthAParam, feedbackAParam, shapeAParam,
            rateBParam, depthBParam, feedbackBParam, shapeBParam,
            routingModeParam, sweepSyncParam, sourceAParam, sourceBParam,
            mixParam
        ])

        self.parameterTree = parameterTree

        // Set parameter observer
        parameterTree.implementorValueObserver = { [weak self] parameter, value in
            guard let self = self else { return }

            DispatchQueue.main.async {
                switch parameter.address {
                case 0:  // rateA
                    BiPhaseDSP_SetRateA(self.dspContext, Float(value))
                case 1:  // depthA
                    BiPhaseDSP_SetDepthA(self.dspContext, Float(value))
                case 2:  // feedbackA
                    BiPhaseDSP_SetFeedbackA(self.dspContext, Float(value))
                case 3:  // shapeA
                    BiPhaseDSP_SetShapeA(self.dspContext, Int(value))
                case 4:  // rateB
                    BiPhaseDSP_SetRateB(self.dspContext, Float(value))
                case 5:  // depthB
                    BiPhaseDSP_SetDepthB(self.dspContext, Float(value))
                case 6:  // feedbackB
                    BiPhaseDSP_SetFeedbackB(self.dspContext, Float(value))
                case 7:  // shapeB
                    BiPhaseDSP_SetShapeB(self.dspContext, Int(value))
                case 8:  // routingMode
                    BiPhaseDSP_SetRoutingMode(self.dspContext, Int(value))
                case 9:  // sweepSync
                    BiPhaseDSP_SetSweepSync(self.dspContext, Int(value))
                case 10:  // sourceA
                    BiPhaseDSP_SetSourceA(self.dspContext, Int(value))
                case 11:  // sourceB
                    BiPhaseDSP_SetSourceB(self.dspContext, Int(value))
                case 12:  // mix
                    BiPhaseDSP_SetMix(self.dspContext, Float(value))
                default:
                    break
                }
            }
        }

        // Set parameter value provider
        parameterTree.implementorValueProvider = { [weak self] parameter in
            guard let self = self else { return 0.0 }

            switch parameter.address {
            case 0:  // rateA
                return Double(AUValue(address: 0))  // Placeholder
            case 1:  // depthA
                return Double(AUValue(address: 1))
            case 2:  // feedbackA
                return Double(AUValue(address: 2))
            case 3:  // shapeA
                return Double(AUValue(address: 3))
            case 4:  // rateB
                return Double(AUValue(address: 4))
            case 5:  // depthB
                return Double(AUValue(address: 5))
            case 6:  // feedbackB
                return Double(AUValue(address: 6))
            case 7:  // shapeB
                return Double(AUValue(address: 7))
            case 8:  // routingMode
                return Double(AUValue(address: 8))
            case 9:  // sweepSync
                return Double(AUValue(address: 9))
            case 10:  // sourceA
                return Double(AUValue(address: 10))
            case 11:  // sourceB
                return Double(AUValue(address: 11))
            case 12:  // mix
                return Double(AUValue(address: 12))
            default:
                return 0.0
            }
        }
    }

    private func setupBusses() {
        // Format: Stereo 2-channel
        let format = AVAudioFormat(standardFormatWithSampleRate: 48000.0, channels: 2)

        guard let format = format else { return }

        // Setup input bus
        inputBus = AUAudioUnitBus(format: format)
        inputBus?.maximumChannelCount = 2

        // Setup output bus
        outputBus = AUAudioUnitBus(format: format)
        outputBus?.maximumChannelCount = 2
    }

    //==========================================================================
    // Render Resources
    //==========================================================================

    override func allocateRenderResources() throws {
        try super.allocateRenderResources()

        guard let inputBus = inputBus,
              let outputBus = outputBus else {
            throw NSError(domain: "BiPhaseAudioUnit", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to setup busses"
            ])
        }

        // Update DSP with new sample rate
        let sampleRate = outputBus.format.sampleRate
        if let context = dspContext {
            BiPhaseDSP_Destroy(context)
        }
        dspContext = BiPhaseDSP_Create(sampleRate)

        guard dspContext != nil else {
            throw NSError(domain: "BiPhaseAudioUnit", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to recreate DSP context"
            ])
        }
    }

    override func deallocateRenderResources() {
        super.deallocateRenderResources()

        // Reset DSP
        if let context = dspContext {
            BiPhaseDSP_Reset(context)
        }
    }

    //==========================================================================
    // Render Block
    //==========================================================================

    private var internalRenderBlock: AUInternalRenderBlock = { [weak self] (
        _ actionFlagsUnsafe: UnsafeMutablePointer<AUAudioFrameActionFlags>?,
        _ timestamp: UnsafeAudioTimeStampPointer,
        _ frameCount: AUAudioFrameCount,
        _ inputBusNumber: Int,
        _ inputData: UnsafeMutablePointer<AudioBufferList>?,
        _ outputBusNumber: Int,
        _ outputData: UnsafeMutablePointer<AudioBufferList>?
    ) -> AUAudioUnitStatus in

        guard let self = self,
              let context = self.dspContext else {
            return -1
        }

        // Validate inputs
        guard let inputData = inputData,
              let outputData = outputData else {
            return -1
        }

        let inputBuffers = inputData.pointee
        let outputBuffers = outputData.pointee

        // Validate buffer pointers
        guard let inputLeft = inputBuffers.mBuffers.mData?.assumingMemoryBound(to: Float.self),
              let inputRight = inputBuffers.mBuffers.advanced(by: 1).pointee.mData?.assumingMemoryBound(to: Float.self),
              let outputLeft = outputBuffers.mBuffers.mData?.assumingMemoryBound(to: Float.self),
              let outputRight = outputBuffers.mBuffers.advanced(by: 1).pointee.mData?.assumingMemoryBound(to: Float.self) else {
            return -1
        }

        // Copy input to output (in-place processing)
        let bufferCount = Int(frameCount)
        for i in 0..<bufferCount {
            outputLeft[i] = inputLeft[i]
            outputRight[i] = inputRight[i]
        }

        // Process through DSP
        BiPhaseDSP_ProcessStereo(context, outputLeft, outputRight, Int32(bufferCount))

        return noErr
    }

    //==========================================================================
    // Properties
    //==========================================================================

    override var internalRenderBlock: AUInternalRenderBlock {
        return internalRenderBlock
    }

    override var inputBusses: AUAudioUnitBusArray {
        return AUAudioUnitBusArray(audioUnit: self, busType: .input, busses: [inputBus].compactMap { $0 })
    }

    override var outputBusses: AUAudioUnitBusArray {
        return AUAudioUnitBusArray(audioUnit: self, busType: .output, busses: [outputBus].compactMap { $0 })
    }

    override var parameterTree: AUParameterTree? {
        return self.parameterTree
    }
}
