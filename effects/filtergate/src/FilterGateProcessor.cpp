// Include ALL JUCE module headers first to satisfy header guards
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <juce_dsp/juce_dsp.h>
#include <juce_events/juce_events.h>
#include <juce_graphics/juce_graphics.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include "FilterGateProcessor.h"

namespace FilterGate {

//==============================================================================
FilterGateProcessor::FilterGateProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    // Register modulation sources with modulation matrix
    modMatrix.registerEnv1(&envelope1);
    modMatrix.registerEnv2(&envelope2);
    modMatrix.registerEnvelopeFollower(&envelopeFollower);
    modMatrix.registerGate(&gateDetector);
}

//==============================================================================
FilterGateProcessor::~FilterGateProcessor()
{
}

//==============================================================================
void FilterGateProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    (void)samplesPerBlock; // Unused in current implementation
    currentSampleRate = sampleRate;

    // Prepare all DSP modules
    mixer.prepare(currentSampleRate);
    modMatrix.prepare(currentSampleRate);

    gateDetector.prepare(currentSampleRate, samplesPerBlock);
    envelope1.prepare(currentSampleRate, samplesPerBlock);
    envelope2.prepare(currentSampleRate, samplesPerBlock);
    envelopeFollower.prepare(currentSampleRate, samplesPerBlock);

    preDrive.prepare(currentSampleRate);
    postDrive.prepare(currentSampleRate);

    // Calculate output level slew coefficient
    // 10ms smoothing time
    float slewTimeSamples = 10.0f * 0.001f * static_cast<float>(currentSampleRate);
    outputLevelSlewCoeff = 1.0f / std::max(1.0f, slewTimeSamples);
}

//==============================================================================
void FilterGateProcessor::releaseResources()
{
    // Reset all DSP modules
    mixer.reset();
    modMatrix.reset();

    gateDetector.reset();
    envelope1.reset();
    envelope2.reset();
    envelopeFollower.reset();

    preDrive.reset();
    postDrive.reset();
}

//==============================================================================
void FilterGateProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midi)
{
    (void)midi; // MIDI not processed in current implementation
    juce::ScopedNoDenormals noDenormals;

    const int numSamples = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();

    // Get channel pointers (or use mono for single channel)
    auto* leftIn = buffer.getReadPointer(0);
    auto* leftOut = buffer.getWritePointer(0);

    const bool isStereo = (numChannels >= 2);
    auto* rightIn = isStereo ? buffer.getReadPointer(1) : nullptr;
    auto* rightOut = isStereo ? buffer.getWritePointer(1) : nullptr;

    // Process each sample
    for (int i = 0; i < numSamples; ++i) {
        float leftSample = leftIn[i];
        float rightSample = isStereo ? rightIn[i] : leftSample;

        // ===== PRE DRIVE =====
        leftSample = preDrive.processSample(leftSample);
        if (isStereo) {
            rightSample = preDrive.processSample(rightSample);
        }

        // ===== ENVELOPE FOLLOWER =====
        // Track input envelope for modulation
        float monoInput = (leftSample + (isStereo ? rightSample : 0.0f)) * 0.5f;
        envelopeFollower.processSample(monoInput);

        // ===== GATE DETECTOR =====
        // Detect if signal exceeds threshold
        gateDetector.processSample(monoInput);

        // Trigger envelopes based on gate
        if (gateDetector.getGateState() > 0.5f && gateDetector.justOpened()) {
            envelope1.trigger();
            envelope2.trigger();
        }

        // ===== ENVELOPES =====
        envelope1.processSample();
        envelope2.processSample();

        // ===== MODULATION MATRIX =====
        modMatrix.processSample();

        // ===== MIXER / ROUTER =====
        // Process through phaser(s) and filter
        float leftMixed = mixer.processSample(leftSample);
        float rightMixed = isStereo ? mixer.processSample(rightSample) : leftMixed;

        // ===== POST DRIVE =====
        leftMixed = postDrive.processSample(leftMixed);
        if (isStereo) {
            rightMixed = postDrive.processSample(rightMixed);
        }

        // ===== OUTPUT LEVEL SMOOTHING =====
        // Apply VCA level from modulation matrix
        float vcaMod = modMatrix.getModulation(ModDestination::VCA_LEVEL);
        float targetLevel = juce::jlimit(0.0f, 2.0f, 1.0f + vcaMod);
        smoothedOutputLevel += outputLevelSlewCoeff * (targetLevel - smoothedOutputLevel);

        leftOut[i] = leftMixed * smoothedOutputLevel;
        if (isStereo) {
            rightOut[i] = rightMixed * smoothedOutputLevel;
        }
    }

    // Clear any remaining output channels
    for (int ch = 2; ch < numChannels; ++ch) {
        buffer.clear(ch, 0, numSamples);
    }
}

//==============================================================================
} // namespace FilterGate
