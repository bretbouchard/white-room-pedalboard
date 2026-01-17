//
//  ParameterBridge.swift
//  NexSynthPluginExtension
//
//  Bridges AUv3 parameters to C++ DSP layer
//

import Foundation
import AudioToolbox

class NexSynthDSPWrapper {
    private var dsp: NexSynthDSPHandle

    init() {
        dsp = NexSynthDSP_Create()
    }

    deinit {
        NexSynthDSP_Destroy(dsp)
    }

    func initialize(withSampleRate sampleRate: Double, maximumFramesToRender: Int32) {
        NexSynthDSP_Initialize(dsp, sampleRate, maximumFramesToRender)
    }

    func process(frameCount: UInt32,
                outputBufferList: UnsafeMutablePointer<AudioBufferList>,
                timestamp: UnsafePointer<AUEventSampleTime>) {
        NexSynthDSP_Process(dsp, frameCount, outputBufferList, timestamp)
    }

    func setParameter(_ address: AUParameterAddress, value: Float) {
        NexSynthDSP_SetParameter(dsp, address, value)
    }

    func getParameter(forAddress address: AUParameterAddress) -> Float {
        return NexSynthDSP_GetParameter(dsp, address)
    }

    func handleMIDIEvent(_ message: [UInt8], messageSize: UInt8) {
        message.withUnsafeBufferPointer { buffer in
            if let baseAddress = buffer.baseAddress {
                NexSynthDSP_HandleMIDI(dsp, baseAddress, messageSize)
            }
        }
    }

    func setState(_ stateData: String) {
        stateData.withCString { data in
            NexSynthDSP_SetState(dsp, data)
        }
    }

    func getState() -> String {
        guard let cString = NexSynthDSP_GetState(dsp) else { return "" }
        return String(cString: cString)
    }
}
