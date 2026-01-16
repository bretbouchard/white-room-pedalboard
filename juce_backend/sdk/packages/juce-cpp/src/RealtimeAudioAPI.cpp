/*
  ==============================================================================

    RealtimeAudioAPI.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/RealtimeAudioAPI.h"
#include "../include/SchillingerSDK.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <algorithm>
#include <cmath>

namespace Schillinger
{
    //==============================================================================
    // RealtimeMidiProcessor implementation
    void RealtimeMidiProcessor::processMidiBuffer(juce::MidiBuffer& midiBuffer,
                                                const RealtimeRhythmPattern& pattern,
                                                double sampleRate,
                                                int numSamples) noexcept
    {
        if (!pattern.isValid() || sampleRate <= 0.0 || numSamples <= 0)
            return;
        
        // Process incoming MIDI messages
        for (const auto metadata : midiBuffer)
        {
            const auto message = metadata.getMessage();
            
            // Handle note-on messages by triggering pattern-based responses
            if (message.isNoteOn())
            {
                // Generate complementary pattern notes
                generateMidiFromPattern(midiBuffer, pattern, metadata.samplePosition, 
                                      numSamples - metadata.samplePosition, sampleRate);
            }
        }
    }

    void RealtimeMidiProcessor::generateMidiFromPattern(juce::MidiBuffer& outputBuffer,
                                                      const RealtimeRhythmPattern& pattern,
                                                      int startSample,
                                                      int numSamples,
                                                      double sampleRate) noexcept
    {
        if (!pattern.isValid() || sampleRate <= 0.0 || numSamples <= 0)
            return;
        
        const double samplesPerBeat = (60.0 / pattern.tempo) * sampleRate;
        const double totalPatternDuration = samplesPerBeat * 4.0; // Assume 4/4 for now
        
        for (int i = 0; i < pattern.patternLength; ++i)
        {
            if (pattern.durations[i] <= 0.0f)
                continue;
                
            // Calculate timing for this pattern element
            double elementStart = (static_cast<double>(i) / pattern.patternLength) * totalPatternDuration;
            double elementDuration = pattern.durations[i] * samplesPerBeat;
            
            int noteOnSample = startSample + static_cast<int>(elementStart);
            int noteOffSample = noteOnSample + static_cast<int>(elementDuration * 0.8); // 80% duration
            
            // Ensure samples are within the current block
            if (noteOnSample >= startSample && noteOnSample < startSample + numSamples)
            {
                auto noteOnMessage = juce::MidiMessage::noteOn(midiChannel, baseNote, 
                                                             static_cast<juce::uint8>(velocity));
                outputBuffer.addEvent(noteOnMessage, noteOnSample);
            }
            
            if (noteOffSample >= startSample && noteOffSample < startSample + numSamples)
            {
                auto noteOffMessage = juce::MidiMessage::noteOff(midiChannel, baseNote);
                outputBuffer.addEvent(noteOffMessage, noteOffSample);
            }
        }
    }

    //==============================================================================
    // RealtimeAudioAnalyzer implementation
    RealtimeAudioAnalyzer::RealtimeAudioAnalyzer()
    {
        // Initialize RMS buffer
        std::fill(std::begin(rmsBuffer), std::end(rmsBuffer), 0.0f);
        
        // Setup processing chain
        auto& gain = processingChain.template get<0>();
        auto& filter = processingChain.template get<1>();
        
        gain.setGainDecibels(0.0f);
        filter.setType(juce::dsp::StateVariableTPTFilterType::highpass);
        filter.setCutoffFrequency(80.0f); // High-pass for beat detection
    }

    void RealtimeAudioAnalyzer::prepare(const juce::dsp::ProcessSpec& spec)
    {
        sampleRate = spec.sampleRate;
        blockSize = static_cast<int>(spec.maximumBlockSize);
        
        processingChain.prepare(spec);
        
        // Initialize onset buffer
        onsetBuffer.clearQuick();
        onsetBuffer.resize(static_cast<int>(spec.maximumBlockSize));
        
        reset();
    }

    void RealtimeAudioAnalyzer::analyzeAudioBlock(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept
    {
        if (audioBlock.getNumSamples() == 0)
            return;
        
        // Update RMS
        updateRMS(audioBlock);
        
        // Detect onsets for tempo estimation
        detectOnsets(audioBlock);
    }

    void RealtimeAudioAnalyzer::reset() noexcept
    {
        processingChain.reset();
        currentTempo.store(120.0);
        currentBeatPhase.store(0.0);
        beatDetected.store(false);
        currentRMS.store(0.0f);
        lastBeatTime = 0.0;
        rmsBufferIndex = 0;
        std::fill(std::begin(rmsBuffer), std::end(rmsBuffer), 0.0f);
    }

    void RealtimeAudioAnalyzer::updateTempo(double newTempo) noexcept
    {
        // Simple tempo smoothing
        double smoothedTempo = currentTempo.load() * 0.9 + newTempo * 0.1;
        currentTempo.store(juce::jlimit(60.0, 200.0, smoothedTempo));
        beatInterval = 60.0 / currentTempo.load();
    }

    void RealtimeAudioAnalyzer::detectOnsets(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept
    {
        // Simple onset detection using energy differences
        float blockEnergy = 0.0f;
        
        for (size_t channel = 0; channel < audioBlock.getNumChannels(); ++channel)
        {
            auto* channelData = audioBlock.getChannelPointer(channel);
            for (size_t sample = 0; sample < audioBlock.getNumSamples(); ++sample)
            {
                blockEnergy += channelData[sample] * channelData[sample];
            }
        }
        
        blockEnergy /= static_cast<float>(audioBlock.getNumChannels() * audioBlock.getNumSamples());
        
        // Simple beat detection threshold
        const float threshold = currentRMS.load() * 1.5f;
        
        if (blockEnergy > threshold)
        {
            double currentTime = juce::Time::getMillisecondCounterHiRes() / 1000.0;
            
            if (currentTime - lastBeatTime > 0.2) // Minimum 200ms between beats
            {
                double interval = currentTime - lastBeatTime;
                if (lastBeatTime > 0.0 && interval > 0.3 && interval < 2.0) // Valid tempo range
                {
                    double detectedTempo = 60.0 / interval;
                    updateTempo(detectedTempo);
                }
                
                lastBeatTime = currentTime;
                beatDetected.store(true);
                
                // Update beat phase
                double phase = std::fmod(currentTime, beatInterval) / beatInterval;
                currentBeatPhase.store(phase);
            }
        }
        else
        {
            beatDetected.store(false);
        }
    }

    void RealtimeAudioAnalyzer::updateRMS(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept
    {
        float blockRMS = 0.0f;
        
        for (size_t channel = 0; channel < audioBlock.getNumChannels(); ++channel)
        {
            auto* channelData = audioBlock.getChannelPointer(channel);
            for (size_t sample = 0; sample < audioBlock.getNumSamples(); ++sample)
            {
                blockRMS += channelData[sample] * channelData[sample];
            }
        }
        
        blockRMS = std::sqrt(blockRMS / (audioBlock.getNumChannels() * audioBlock.getNumSamples()));
        
        // Update circular buffer
        rmsBuffer[rmsBufferIndex] = blockRMS;
        rmsBufferIndex = (rmsBufferIndex + 1) % 1024;
        
        // Calculate running average
        float avgRMS = 0.0f;
        for (int i = 0; i < 1024; ++i)
            avgRMS += rmsBuffer[i];
        avgRMS /= 1024.0f;
        
        currentRMS.store(avgRMS);
    }

    //==============================================================================
    // RealtimePatternGenerator implementation
    bool RealtimePatternGenerator::generateRhythmPattern(const RealtimePatternParams& params,
                                                       RealtimeRhythmPattern& outputPattern) noexcept
    {
        if (!params.isValid())
            return false;
        
        outputPattern.clear();
        outputPattern.tempo = params.tempo;
        outputPattern.timeSignature = params.timeSignature;
        outputPattern.swing = params.swing;
        
        // Generate Schillinger resultant pattern
        calculateResultant(params.generatorA, params.generatorB, outputPattern);
        
        // Apply swing if specified
        if (params.swing > 0.0)
            applySwing(outputPattern, params.swing);
        
        // Normalize pattern durations
        normalizePattern(outputPattern);
        
        return outputPattern.isValid();
    }

    bool RealtimePatternGenerator::applyVariation(const RealtimeRhythmPattern& inputPattern,
                                                RealtimeRhythmPattern& outputPattern,
                                                int variationType) noexcept
    {
        if (!inputPattern.isValid())
            return false;
        
        outputPattern = inputPattern;
        
        switch (variationType)
        {
            case 0: // Augmentation
                for (int i = 0; i < outputPattern.patternLength; ++i)
                    outputPattern.durations[i] *= 2.0f;
                break;
                
            case 1: // Diminution
                for (int i = 0; i < outputPattern.patternLength; ++i)
                    outputPattern.durations[i] *= 0.5f;
                break;
                
            case 2: // Retrograde
                std::reverse(outputPattern.durations.begin(), 
                           outputPattern.durations.begin() + outputPattern.patternLength);
                break;
                
            case 3: // Rotation
                if (outputPattern.patternLength > 1)
                {
                    float first = outputPattern.durations[0];
                    for (int i = 0; i < outputPattern.patternLength - 1; ++i)
                        outputPattern.durations[i] = outputPattern.durations[i + 1];
                    outputPattern.durations[outputPattern.patternLength - 1] = first;
                }
                break;
                
            default:
                break;
        }
        
        normalizePattern(outputPattern);
        return true;
    }

    bool RealtimePatternGenerator::transformPattern(const RealtimeRhythmPattern& inputPattern,
                                                  RealtimeRhythmPattern& outputPattern,
                                                  int transformType) noexcept
    {
        if (!inputPattern.isValid())
            return false;
        
        outputPattern = inputPattern;
        
        switch (transformType)
        {
            case 0: // Inversion
                for (int i = 0; i < outputPattern.patternLength; ++i)
                {
                    if (outputPattern.durations[i] > 0.0f)
                        outputPattern.durations[i] = 2.0f - outputPattern.durations[i];
                }
                break;
                
            case 1: // Fragmentation
                for (int i = 0; i < outputPattern.patternLength && i < RealtimeRhythmPattern::maxPatternLength - 1; ++i)
                {
                    if (outputPattern.durations[i] > 1.0f)
                    {
                        float half = outputPattern.durations[i] * 0.5f;
                        outputPattern.durations[i] = half;
                        // Insert the other half if there's space
                        if (outputPattern.patternLength < RealtimeRhythmPattern::maxPatternLength - 1)
                        {
                            // Shift elements right
                            for (int j = outputPattern.patternLength; j > i + 1; --j)
                                outputPattern.durations[j] = outputPattern.durations[j - 1];
                            outputPattern.durations[i + 1] = half;
                            outputPattern.patternLength++;
                        }
                    }
                }
                break;
                
            case 2: // Randomization
                for (int i = 0; i < outputPattern.patternLength; ++i)
                {
                    float randomFactor = static_cast<float>(nextRandom()) / 0x7fffffff;
                    outputPattern.durations[i] *= (0.5f + randomFactor * 0.5f); // 50-100% of original
                }
                break;
                
            default:
                break;
        }
        
        normalizePattern(outputPattern);
        return true;
    }

    void RealtimePatternGenerator::calculateResultant(int a, int b, RealtimeRhythmPattern& pattern) noexcept
    {
        if (a <= 0 || b <= 0)
            return;
        
        // Calculate LCM for pattern length
        int gcd = a;
        int temp_b = b;
        while (temp_b != 0)
        {
            int temp = temp_b;
            temp_b = gcd % temp_b;
            gcd = temp;
        }
        int lcm = (a * b) / gcd;
        
        pattern.patternLength = juce::jmin(lcm, RealtimeRhythmPattern::maxPatternLength);
        
        // Generate resultant pattern
        for (int i = 0; i < pattern.patternLength; ++i)
        {
            bool aHit = (i % (pattern.patternLength / a)) == 0;
            bool bHit = (i % (pattern.patternLength / b)) == 0;
            
            if (aHit && bHit)
                pattern.durations[i] = 2.0f; // Strong beat
            else if (aHit || bHit)
                pattern.durations[i] = 1.0f; // Regular beat
            else
                pattern.durations[i] = 0.5f; // Weak beat
        }
    }

    void RealtimePatternGenerator::applySwing(RealtimeRhythmPattern& pattern, double swingAmount) noexcept
    {
        if (swingAmount <= 0.0 || pattern.patternLength < 2)
            return;
        
        // Apply swing to off-beats
        for (int i = 1; i < pattern.patternLength; i += 2)
        {
            float swingFactor = 1.0f + static_cast<float>(swingAmount * 0.3); // Max 30% swing
            pattern.durations[i] *= swingFactor;
        }
    }

    void RealtimePatternGenerator::normalizePattern(RealtimeRhythmPattern& pattern) noexcept
    {
        if (pattern.patternLength <= 0)
            return;
        
        // Find maximum duration
        float maxDuration = 0.0f;
        for (int i = 0; i < pattern.patternLength; ++i)
            maxDuration = juce::jmax(maxDuration, pattern.durations[i]);
        
        // Normalize to 0.1 - 2.0 range
        if (maxDuration > 0.0f)
        {
            float scale = 2.0f / maxDuration;
            for (int i = 0; i < pattern.patternLength; ++i)
            {
                pattern.durations[i] *= scale;
                pattern.durations[i] = juce::jmax(0.1f, pattern.durations[i]); // Minimum duration
            }
        }
    }

    //==============================================================================
    // PluginParameterMapper implementation
    void PluginParameterMapper::setParameterValue(ParameterType type, float normalizedValue) noexcept
    {
        normalizedValue = juce::jlimit(0.0f, 1.0f, normalizedValue);
        
        switch (type)
        {
            case ParameterType::GeneratorA:
                patternParams.generatorA = static_cast<int>(1 + normalizedValue * 15); // 1-16
                break;
                
            case ParameterType::GeneratorB:
                patternParams.generatorB = static_cast<int>(1 + normalizedValue * 15); // 1-16
                break;
                
            case ParameterType::Tempo:
                patternParams.tempo = 60.0 + normalizedValue * 180.0; // 60-240 BPM
                break;
                
            case ParameterType::Swing:
                patternParams.swing = normalizedValue; // 0.0-1.0
                break;
                
            case ParameterType::TimeSignatureNumerator:
                patternParams.timeSignature.first = static_cast<int>(1 + normalizedValue * 15); // 1-16
                break;
                
            case ParameterType::TimeSignatureDenominator:
                {
                    int denomValues[] = {1, 2, 4, 8, 16};
                    int index = static_cast<int>(normalizedValue * 4.99f);
                    patternParams.timeSignature.second = denomValues[index];
                }
                break;
                
            case ParameterType::VariationType:
                variationType = static_cast<int>(normalizedValue * 3.99f); // 0-3
                break;
                
            case ParameterType::TransformType:
                transformType = static_cast<int>(normalizedValue * 2.99f); // 0-2
                break;
                
            case ParameterType::MidiChannel:
                midiChannel = static_cast<int>(1 + normalizedValue * 15); // 1-16
                break;
                
            case ParameterType::BaseNote:
                baseNote = static_cast<int>(normalizedValue * 127); // 0-127
                break;
                
            case ParameterType::Velocity:
                velocity = static_cast<int>(1 + normalizedValue * 126); // 1-127
                break;
        }
    }

    float PluginParameterMapper::getParameterValue(ParameterType type) const noexcept
    {
        switch (type)
        {
            case ParameterType::GeneratorA:
                return (patternParams.generatorA - 1) / 15.0f;
                
            case ParameterType::GeneratorB:
                return (patternParams.generatorB - 1) / 15.0f;
                
            case ParameterType::Tempo:
                return (patternParams.tempo - 60.0) / 180.0;
                
            case ParameterType::Swing:
                return static_cast<float>(patternParams.swing);
                
            case ParameterType::TimeSignatureNumerator:
                return (patternParams.timeSignature.first - 1) / 15.0f;
                
            case ParameterType::TimeSignatureDenominator:
                {
                    int denomValues[] = {1, 2, 4, 8, 16};
                    for (int i = 0; i < 5; ++i)
                        if (denomValues[i] == patternParams.timeSignature.second)
                            return i / 4.0f;
                    return 0.5f; // Default to 4
                }
                
            case ParameterType::VariationType:
                return variationType / 3.0f;
                
            case ParameterType::TransformType:
                return transformType / 2.0f;
                
            case ParameterType::MidiChannel:
                return (midiChannel - 1) / 15.0f;
                
            case ParameterType::BaseNote:
                return baseNote / 127.0f;
                
            case ParameterType::Velocity:
                return (velocity - 1) / 126.0f;
                
            default:
                return 0.0f;
        }
    }

    juce::String PluginParameterMapper::getParameterName(ParameterType type) noexcept
    {
        switch (type)
        {
            case ParameterType::GeneratorA: return "Generator A";
            case ParameterType::GeneratorB: return "Generator B";
            case ParameterType::Tempo: return "Tempo";
            case ParameterType::Swing: return "Swing";
            case ParameterType::TimeSignatureNumerator: return "Time Sig Num";
            case ParameterType::TimeSignatureDenominator: return "Time Sig Den";
            case ParameterType::VariationType: return "Variation";
            case ParameterType::TransformType: return "Transform";
            case ParameterType::MidiChannel: return "MIDI Channel";
            case ParameterType::BaseNote: return "Base Note";
            case ParameterType::Velocity: return "Velocity";
            default: return "Unknown";
        }
    }

    juce::String PluginParameterMapper::getParameterUnits(ParameterType type) noexcept
    {
        switch (type)
        {
            case ParameterType::Tempo: return "BPM";
            case ParameterType::Swing: return "%";
            case ParameterType::BaseNote: return "Note";
            case ParameterType::Velocity: return "Vel";
            default: return "";
        }
    }

    juce::NormalisableRange<float> PluginParameterMapper::getParameterRange(ParameterType type) noexcept
    {
        switch (type)
        {
            case ParameterType::GeneratorA:
            case ParameterType::GeneratorB:
            case ParameterType::TimeSignatureNumerator:
                return juce::NormalisableRange<float>(1.0f, 16.0f, 1.0f);
                
            case ParameterType::Tempo:
                return juce::NormalisableRange<float>(60.0f, 240.0f, 1.0f);
                
            case ParameterType::Swing:
                return juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f);
                
            case ParameterType::MidiChannel:
                return juce::NormalisableRange<float>(1.0f, 16.0f, 1.0f);
                
            case ParameterType::BaseNote:
                return juce::NormalisableRange<float>(0.0f, 127.0f, 1.0f);
                
            case ParameterType::Velocity:
                return juce::NormalisableRange<float>(1.0f, 127.0f, 1.0f);
                
            default:
                return juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f);
        }
    }

    //==============================================================================
    // RealtimeAudioAPI implementation
    RealtimeAudioAPI::RealtimeAudioAPI(SchillingerSDK* sdk)
        : parentSDK(sdk)
    {
        jassert(parentSDK != nullptr);
    }

    RealtimeAudioAPI::~RealtimeAudioAPI() = default;

    void RealtimeAudioAPI::prepare(const juce::dsp::ProcessSpec& spec)
    {
        sampleRate = spec.sampleRate;
        maximumBlockSize = static_cast<int>(spec.maximumBlockSize);
        numChannels = static_cast<int>(spec.numChannels);
        
        audioAnalyzer.prepare(spec);
        
        reset();
    }

    void RealtimeAudioAPI::reset() noexcept
    {
        audioAnalyzer.reset();
        currentPattern.clear();
    }

    void RealtimeAudioAPI::processAudioAndMidi(juce::dsp::AudioBlock<float>& audioBlock,
                                             juce::MidiBuffer& midiBuffer) noexcept
    {
        // Analyze incoming audio
        audioAnalyzer.analyzeAudioBlock(audioBlock);
        
        // Generate pattern if enabled
        if (patternGenerationEnabled.load())
        {
            // Update pattern parameters from analyzer if needed
            if (audioAnalyzer.wasBeatDetected())
            {
                RealtimePatternParams updatedParams = currentParams;
                updatedParams.tempo = audioAnalyzer.getCurrentTempo();
                
                // Generate new pattern
                patternGenerator.generateRhythmPattern(updatedParams, currentPattern);
            }
            
            // Process MIDI with current pattern
            if (currentPattern.isValid())
            {
                midiProcessor.processMidiBuffer(midiBuffer, currentPattern, 
                                              sampleRate, static_cast<int>(audioBlock.getNumSamples()));
            }
        }
    }

    void RealtimeAudioAPI::generatePatternMidi(juce::MidiBuffer& outputBuffer,
                                             int startSample,
                                             int numSamples,
                                             double sampleRate) noexcept
    {
        if (currentPattern.isValid() && patternGenerationEnabled.load())
        {
            midiProcessor.generateMidiFromPattern(outputBuffer, currentPattern, 
                                                startSample, numSamples, sampleRate);
        }
    }

} // namespace Schillinger