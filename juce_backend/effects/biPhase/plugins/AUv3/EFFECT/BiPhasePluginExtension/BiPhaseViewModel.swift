//
//  BiPhaseViewModel.swift
//  BiPhasePluginExtension
//
//  View model for BiPhase effect parameters
//

import Foundation
import Combine
import AVFoundation

class BiPhaseViewModel: ObservableObject {
    //==========================================================================
    // Published Properties
    //==========================================================================

    // Phasor A parameters
    @Published var rateA: Double = 0.5
    @Published var depthA: Double = 0.5
    @Published var feedbackA: Double = 0.5
    @Published var shapeA: Int = 0  // 0=Sine, 1=Square

    // Phasor B parameters
    @Published var rateB: Double = 0.5
    @Published var depthB: Double = 0.5
    @Published var feedbackB: Double = 0.5
    @Published var shapeB: Int = 0  // 0=Sine, 1=Square

    // Routing parameters
    @Published var routingMode: Int = 1  // 0=Parallel, 1=Series, 2=Independent
    @Published var sweepSync: Int = 0    // 0=Normal, 1=Reverse
    @Published var sourceA: Int = 0      // 0=LFO 1, 1=LFO 2
    @Published var sourceB: Int = 1      // 0=LFO 1, 1=LFO 2

    // Mix
    @Published var mix: Double = 1.0

    //==========================================================================
    // Audio Unit Reference
    //==========================================================================

    private var audioUnit: AUAudioUnit?

    //==========================================================================
    // Initialization
    //==========================================================================

    init() {
        // Load default values
        loadDefaultParameters()
    }

    func setAudioUnit(_ audioUnit: AUAudioUnit?) {
        self.audioUnit = audioUnit
        loadParametersFromAudioUnit()
    }

    //==========================================================================
    // Parameter Update Methods
    //==========================================================================

    func updateRateA(_ value: Double) {
        rateA = value
        setParameter("rateA", value: Float(value))
    }

    func updateDepthA(_ value: Double) {
        depthA = value
        setParameter("depthA", value: Float(value))
    }

    func updateFeedbackA(_ value: Double) {
        feedbackA = value
        setParameter("feedbackA", value: Float(value))
    }

    func updateShapeA(_ value: Int) {
        shapeA = value
        setParameter("shapeA", value: Float(value))
    }

    func updateRateB(_ value: Double) {
        rateB = value
        setParameter("rateB", value: Float(value))
    }

    func updateDepthB(_ value: Double) {
        depthB = value
        setParameter("depthB", value: Float(value))
    }

    func updateFeedbackB(_ value: Double) {
        feedbackB = value
        setParameter("feedbackB", value: Float(value))
    }

    func updateShapeB(_ value: Int) {
        shapeB = value
        setParameter("shapeB", value: Float(value))
    }

    func updateRoutingMode(_ value: Int) {
        routingMode = value
        setParameter("routingMode", value: Float(value))
    }

    func updateSweepSync(_ value: Int) {
        sweepSync = value
        setParameter("sweepSync", value: Float(value))
    }

    func updateSourceA(_ value: Int) {
        sourceA = value
        setParameter("sourceA", value: Float(value))
    }

    func updateSourceB(_ value: Int) {
        sourceB = value
        setParameter("sourceB", value: Float(value))
    }

    func updateMix(_ value: Double) {
        mix = value
        setParameter("mix", value: Float(value))
    }

    //==========================================================================
    // Preset Loading
    //==========================================================================

    func loadPreset(_ preset: BiPhasePreset) {
        rateA = preset.rateA
        depthA = preset.depthA
        feedbackA = preset.feedbackA
        shapeA = preset.shapeA

        rateB = preset.rateB
        depthB = preset.depthB
        feedbackB = preset.feedbackB
        shapeB = preset.shapeB

        routingMode = preset.routingMode
        sweepSync = preset.sweepSync
        sourceA = preset.sourceA
        sourceB = preset.sourceB
        mix = preset.mix

        // Update audio unit
        updateRateA(rateA)
        updateDepthA(depthA)
        updateFeedbackA(feedbackA)
        updateShapeA(shapeA)
        updateRateB(rateB)
        updateDepthB(depthB)
        updateFeedbackB(feedbackB)
        updateShapeB(shapeB)
        updateRoutingMode(routingMode)
        updateSweepSync(sweepSync)
        updateSourceA(sourceA)
        updateSourceB(sourceB)
        updateMix(mix)
    }

    //==========================================================================
    // Private Methods
    //==========================================================================

    private func loadDefaultParameters() {
        // Default parameters already set in property initializers
    }

    private func loadParametersFromAudioUnit() {
        guard let audioUnit = audioUnit,
              let parameterTree = audioUnit.parameterTree else {
            return
        }

        // Load parameters from audio unit
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "rateA" }) {
            rateA = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "depthA" }) {
            depthA = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "feedbackA" }) {
            feedbackA = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "shapeA" }) {
            shapeA = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "rateB" }) {
            rateB = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "depthB" }) {
            depthB = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "feedbackB" }) {
            feedbackB = Double(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "shapeB" }) {
            shapeB = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "routingMode" }) {
            routingMode = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "sweepSync" }) {
            sweepSync = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "sourceA" }) {
            sourceA = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "sourceB" }) {
            sourceB = Int(param.value)
        }
        if let param = parameterTree.allParameters.first(where: { $0.identifier == "mix" }) {
            mix = Double(param.value)
        }
    }

    private func setParameter(_ identifier: String, value: Float) {
        guard let audioUnit = audioUnit,
              let parameterTree = audioUnit.parameterTree else {
            return
        }

        if let param = parameterTree.allParameters.first(where: { $0.identifier == identifier }) {
            param.value = value
        }
    }
}
