//
//  ParameterBridge.swift
//  AetherDrivePluginExtension
//
//  Bridges Swift parameters to C++ DSP engine
//

import Foundation

class AetherDriveDSPWrapper {
    private var dsp: AetherDriveDSP

    init() {
        dsp = AetherDriveDSP()
    }

    func initialize(withSampleRate sampleRate: Double, maximumFramesToRender: Int32) {
        dsp.initialize(sampleRate, maximumFramesToRender: Int(maximumFramesToRender))
    }

    func process(frameCount: UInt32,
                outputBufferList: UnsafeMutablePointer<AudioBufferList>,
                inputBufferList: UnsafeMutablePointer<AudioBufferList>?,
                timestamp: UnsafePointer<AUEventSampleTime>?) {

        if let inputList = inputBufferList {
            dsp.process(frameCount,
                       outputBufferList,
                       inputList,
                       timestamp)
        }
    }

    func setParameter(_ address: AUParameterAddress, value: Float) {
        dsp.setParameter(address, value: value)
    }

    func getParameter(forAddress address: AUParameterAddress) -> Float {
        return dsp.getParameter(address)
    }

    func setState(_ stateData: String) {
        stateData.withCString { ptr in
            dsp.setState(ptr)
        }
    }

    func getState() -> String {
        return String(cString: dsp.getState())
    }

    func loadFactoryPreset(_ index: Int) {
        dsp.loadFactoryPreset(Int32(index))
    }

    func getFactoryPresetName(_ index: Int) -> String {
        return String(cString: AetherDriveDSP.getFactoryPresetName(Int32(index)))
    }
}
