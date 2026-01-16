/*
  ParameterBridge.swift - AU Parameter to DSP Mapping

  Maps AUAudioUnit parameters to DSP parameters and handles value conversion.
  Provides normalized 0-1 interface for UI controls.
*/

import Foundation
import AVFoundation

class ParameterBridge {
    private weak var audioUnit: LocalGalAudioUnit?

    init(audioUnit: LocalGalAudioUnit) {
        self.audioUnit = audioUnit
    }

    // MARK: - Parameter Value Mapping

    func getParameterValue(_ identifier: String) -> Float {
        guard let param = audioUnit?.parameterTree?.parameter(withAddress: getAddress(for: identifier)) else {
            return 0.0
        }
        return param.value
    }

    func setParameterValue(_ identifier: String, value: Float) {
        guard let param = audioUnit?.parameterTree?.parameter(withAddress: getAddress(for: identifier)) else {
            return
        }
        param.value = value
    }

    // MARK: - Feel Vector

    func getFeelVector() -> FeelVector {
        return FeelVector(
            rubber: getParameterValue("feel_rubber"),
            bite: getParameterValue("feel_bite"),
            hollow: getParameterValue("feel_hollow"),
            growl: getParameterValue("feel_growl"),
            wet: getParameterValue("feel_wet")
        )
    }

    func setFeelVector(_ feelVector: FeelVector) {
        setParameterValue("feel_rubber", value: feelVector.rubber)
        setParameterValue("feel_bite", value: feelVector.bite)
        setParameterValue("feel_hollow", value: feelVector.hollow)
        setParameterValue("feel_growl", value: feelVector.growl)
        setParameterValue("feel_wet", value: feelVector.wet)
    }

    // MARK: - Preset Management

    func loadFactoryPreset(index: Int) -> Bool {
        guard let au = audioUnit else { return false }

        // Load preset via AU preset mechanism
        if index < au.factoryPresets.count {
            au.currentPreset = au.factoryPresets[index]
            return true
        }

        return false
    }

    func getFactoryPresetName(index: Int) -> String? {
        guard let au = audioUnit,
              index < au.factoryPresets.count else {
            return nil
        }
        return au.factoryPresets[index].name
    }

    func getFactoryPresetCount() -> Int {
        return audioUnit?.factoryPresets.count ?? 0
    }

    // MARK: - Parameter Address Mapping

    private func getAddress(for identifier: String) -> AUParameterAddress {
        switch identifier {
        case "master_volume": return 0
        case "osc_waveform": return 1
        case "filter_cutoff": return 2
        case "filter_resonance": return 3
        case "feel_rubber": return 4
        case "feel_bite": return 5
        case "feel_hollow": return 6
        case "feel_growl": return 7
        default: return 0
        }
    }
}

// MARK: - Feel Vector Model

struct FeelVector {
    var rubber: Float = 0.5
    var bite: Float = 0.5
    var hollow: Float = 0.5
    var growl: Float = 0.3
    var wet: Float = 0.0

    // Presets
    static let presets: [String: FeelVector] = [
        "Init": FeelVector(rubber: 0.5, bite: 0.5, hollow: 0.5, growl: 0.3, wet: 0.0),
        "Soft": FeelVector(rubber: 0.7, bite: 0.3, hollow: 0.4, growl: 0.1, wet: 0.2),
        "Bright": FeelVector(rubber: 0.3, bite: 0.8, hollow: 0.7, growl: 0.2, wet: 0.1),
        "Warm": FeelVector(rubber: 0.6, bite: 0.4, hollow: 0.3, growl: 0.3, wet: 0.3),
        "Aggressive": FeelVector(rubber: 0.2, bite: 0.9, hollow: 0.8, growl: 0.8, wet: 0.5),
    ]

    static func getPreset(name: String) -> FeelVector? {
        return presets[name]
    }
}

// MARK: - Parameter Display Names

extension ParameterBridge {
    func getParameterDisplayName(_ identifier: String) -> String {
        switch identifier {
        case "master_volume": return "Master"
        case "osc_waveform": return "Waveform"
        case "filter_cutoff": return "Cutoff"
        case "filter_resonance": return "Resonance"
        case "feel_rubber": return "Rubber"
        case "feel_bite": return "Bite"
        case "feel_hollow": return "Hollow"
        case "feel_growl": return "Growl"
        default: return identifier
        }
    }

    func getWaveformName(_ value: Float) -> String {
        switch Int(value) {
        case 0: return "Sine"
        case 1: return "Sawtooth"
        case 2: return "Square"
        case 3: return "Triangle"
        case 4: return "Noise"
        default: return "Sawtooth"
        }
    }
}
