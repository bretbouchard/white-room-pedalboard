#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/DualPhaser.h"
#include "dsp/FilterEngine.h"
#include "dsp/GateDetector.h"
#include "dsp/EnvelopeGenerator.h"
#include "dsp/EnvelopeFollower.h"
#include "dsp/ModulationMatrix.h"
#include "dsp/Mixer.h"
#include "dsp/DriveStage.h"
#include <memory>

namespace FilterGate {

/**
 * FilterGate: Multi-stage DSP effect processor
 *
 * Features:
 * - Dual phaser engines with independent LFOs
 * - Multi-model filter (SVF, Ladder, OTA, MS-20, Comb, Morph)
 * - Gate detector with envelope following
 * - Dual envelope generators (ADSR/ADR)
 * - Modulation matrix
 * - Pre/Post drive stages
 * - Wet/dry mixing
 *
 * Architecture:
 * - Realtime-safe (no allocations in audio thread)
 * - Sample-accurate parameter smoothing
 * - Stereo processing
 * - Swift-controlled via C ABI layer
 */
class FilterGateProcessor : public juce::AudioProcessor {
public:
    FilterGateProcessor();
    ~FilterGateProcessor() override;

    // AudioProcessor overrides
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    // Editor (not implemented - Swift UI only)
    juce::AudioProcessorEditor* createEditor() override { return nullptr; }
    bool hasEditor() const override { return false; }

    // Basic info
    const juce::String getName() const override { return "FilterGate"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }

    // Programs (presets managed by Swift layer)
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    // State (managed by Swift layer)
    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}

    // AudioProcessor metadata
    double getTailLengthSeconds() const override { return 0.0; }
    bool isBusesLayoutSupported(const BusesLayout&) const override { return true; }

    // Access DSP modules (for FFI layer and PresetManager)
    Mixer& getMixer() { return mixer; }
    ModulationMatrix& getModMatrix() { return modMatrix; }
    GateDetector& getGateDetector() { return gateDetector; }
    EnvelopeGenerator& getEnvelope1() { return envelope1; }
    EnvelopeGenerator& getEnvelope2() { return envelope2; }
    EnvelopeFollower& getEnvelopeFollower() { return envelopeFollower; }
    DriveStage& getPreDrive() { return preDrive; }
    DriveStage& getPostDrive() { return postDrive; }

private:
    double currentSampleRate = 48000.0;

    // DSP modules
    Mixer mixer;
    ModulationMatrix modMatrix;

    GateDetector gateDetector;
    EnvelopeGenerator envelope1;
    EnvelopeGenerator envelope2;
    EnvelopeFollower envelopeFollower;

    DriveStage preDrive;
    DriveStage postDrive;

    // Parameter smoothing
    float smoothedOutputLevel = 1.0f;
    float outputLevelSlewCoeff = 0.001f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FilterGateProcessor)
};

} // namespace FilterGate
