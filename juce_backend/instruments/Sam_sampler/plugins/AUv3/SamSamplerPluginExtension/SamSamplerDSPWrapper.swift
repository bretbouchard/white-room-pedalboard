//
//  SamSamplerDSPWrapper.swift
//  SamSamplerPluginExtension
//
//  Swift wrapper for Sam Sampler C++ DSP
//

import Foundation

class SamSamplerDSPWrapper {

    private var dsp: SamSamplerDSP?

    init() {
        dsp = SamSamplerDSP()
    }

    func initialize(withSampleRate sampleRate: Double, maximumFramesToRender: Int32) {
        dsp?.initialize(withSampleRate: sampleRate, maximumFramesToRender: maximumFramesToRender)
    }

    func process(frameCount: AUAudioFrameCount,
                outputBufferList: UnsafeMutablePointer<AudioBufferList>,
                timestamp: UnsafePointer<AUEventSampleTime>) {

        dsp?.process(frameCount,
                    outputBufferList: outputBufferList,
                    timestamp: timestamp)
    }

    func setParameter(_ address: AUParameterAddress, value: Float) {
        dsp?.setParameter(address, value: value)
    }

    func getParameter(forAddress address: AUParameterAddress) -> Float {
        return dsp?.getParameter(address) ?? 0.0
    }

    func handleMIDIEvent(_ message: [UInt8], messageSize: UInt8) {
        var message = message
        message.withUnsafeMutableBytes { ptr in
            if let baseAddress = ptr.baseAddress {
                dsp?.handleMIDIEvent(baseAddress.assumingMemoryBound(to: UInt8.self),
                                   messageSize: messageSize)
            }
        }
    }

    func loadSoundFont(_ path: String) -> Bool {
        return dsp?.loadSoundFont(path) ?? false
    }

    func getSoundFontInstrumentCount() -> Int {
        return Int(dsp?.getSoundFontInstrumentCount() ?? 0)
    }

    func getSoundFontInstrumentName(at index: Int) -> String? {
        guard let cString = dsp?.getSoundFontInstrumentName(Int32(index)) else {
            return nil
        }
        return String(cString: cString)
    }

    func selectSoundFontInstrument(at index: Int) -> Bool {
        return dsp?.selectSoundFontInstrument(Int32(index)) ?? false
    }

    func setState(_ stateData: String) {
        stateData.withCString { cString in
            dsp?.setState(cString)
        }
    }

    func getState() -> String {
        guard let cString = dsp?.getState() else {
            return "{}"
        }
        return String(cString: cString)
    }
}
