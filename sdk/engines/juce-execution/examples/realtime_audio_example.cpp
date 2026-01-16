/*
  ==============================================================================

    realtime_audio_example.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/SchillingerSDK.h"
#include "../include/RealtimeAudioAPI.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <iostream>

using namespace Schillinger;

/**
 * Example demonstrating real-time audio processing with the Schillinger SDK.
 * This shows how to use the RealtimeAudioAPI for pattern generation,
 * MIDI processing, and audio analysis in a real-time context.
 */
class RealtimeAudioExample
{
public:
    RealtimeAudioExample()
    {
        // Initialize the SDK
        sdk = std::make_unique<SchillingerSDK>();
        
        // Configure SDK options
        SDKOptions options;
        options.apiBaseUrl = "https://api.schillinger.com";
        options.enableOfflineMode = true; // Enable offline mode for real-time use
        
        auto result = sdk->configure(options);
        if (!result.wasOk())
        {
            std::cout << "Failed to configure SDK: " << result.getErrorMessage() << std::endl;
            return;
        }
        
        // Get the real-time audio API
        realtimeAPI = &sdk->getRealtimeAudioAPI();
        
        std::cout << "Schillinger SDK Real-time Audio Example" << std::endl;
        std::cout << "=======================================" << std::endl;
    }
    
    void demonstrateRealtimeProcessing()
    {
        std::cout << "\n1. Setting up real-time processing..." << std::endl;
        
        // Setup processing specifications
        juce::dsp::ProcessSpec spec;
        spec.sampleRate = 44100.0;
        spec.maximumBlockSize = 512;
        spec.numChannels = 2;
        
        // Prepare the real-time API
        realtimeAPI->prepare(spec);
        
        std::cout << "   - Sample rate: " << spec.sampleRate << " Hz" << std::endl;
        std::cout << "   - Block size: " << spec.maximumBlockSize << " samples" << std::endl;
        std::cout << "   - Channels: " << spec.numChannels << std::endl;
        
        // Configure pattern parameters
        RealtimePatternParams params;
        params.generatorA = 3;
        params.generatorB = 2;
        params.tempo = 120.0;
        params.timeSignature = {4, 4};
        params.swing = 0.1;
        
        realtimeAPI->setPatternParams(params);
        
        std::cout << "   - Pattern generators: " << params.generatorA << ":" << params.generatorB << std::endl;
        std::cout << "   - Tempo: " << params.tempo << " BPM" << std::endl;
        std::cout << "   - Time signature: " << params.timeSignature.first << "/" << params.timeSignature.second << std::endl;
        std::cout << "   - Swing: " << (params.swing * 100) << "%" << std::endl;
    }
    
    void demonstratePatternGeneration()
    {
        std::cout << "\n2. Generating real-time patterns..." << std::endl;
        
        auto& patternGenerator = realtimeAPI->getPatternGenerator();
        
        // Generate a basic rhythm pattern
        RealtimePatternParams params = realtimeAPI->getPatternParams();
        RealtimeRhythmPattern pattern;
        
        if (patternGenerator.generateRhythmPattern(params, pattern))
        {
            std::cout << "   - Generated pattern with " << pattern.patternLength << " elements:" << std::endl;
            std::cout << "     Durations: ";
            for (int i = 0; i < pattern.patternLength; ++i)
            {
                std::cout << std::fixed << std::setprecision(2) << pattern.durations[i];
                if (i < pattern.patternLength - 1) std::cout << ", ";
            }
            std::cout << std::endl;
            
            // Apply variations
            RealtimeRhythmPattern variationPattern;
            
            // Augmentation
            if (patternGenerator.applyVariation(pattern, variationPattern, 0))
            {
                std::cout << "   - Augmentation: ";
                for (int i = 0; i < variationPattern.patternLength; ++i)
                {
                    std::cout << std::fixed << std::setprecision(2) << variationPattern.durations[i];
                    if (i < variationPattern.patternLength - 1) std::cout << ", ";
                }
                std::cout << std::endl;
            }
            
            // Retrograde
            if (patternGenerator.applyVariation(pattern, variationPattern, 2))
            {
                std::cout << "   - Retrograde: ";
                for (int i = 0; i < variationPattern.patternLength; ++i)
                {
                    std::cout << std::fixed << std::setprecision(2) << variationPattern.durations[i];
                    if (i < variationPattern.patternLength - 1) std::cout << ", ";
                }
                std::cout << std::endl;
            }
        }
        else
        {
            std::cout << "   - Failed to generate pattern" << std::endl;
        }
    }
    
    void demonstrateMidiProcessing()
    {
        std::cout << "\n3. MIDI processing capabilities..." << std::endl;
        
        auto& midiProcessor = realtimeAPI->getMidiProcessor();
        
        // Configure MIDI settings
        midiProcessor.setMidiChannel(1);
        midiProcessor.setBaseNote(60); // Middle C
        midiProcessor.setVelocity(100);
        
        std::cout << "   - MIDI Channel: 1" << std::endl;
        std::cout << "   - Base Note: 60 (Middle C)" << std::endl;
        std::cout << "   - Velocity: 100" << std::endl;
        
        // Create a sample MIDI buffer
        juce::MidiBuffer midiBuffer;
        
        // Add a note-on message
        auto noteOnMessage = juce::MidiMessage::noteOn(1, 60, static_cast<juce::uint8>(100));
        midiBuffer.addEvent(noteOnMessage, 0);
        
        std::cout << "   - Added sample MIDI note-on message" << std::endl;
        
        // Generate pattern-based MIDI
        juce::MidiBuffer outputBuffer;
        realtimeAPI->generatePatternMidi(outputBuffer, 0, 512, 44100.0);
        
        int midiEventCount = 0;
        for (const auto metadata : outputBuffer)
            midiEventCount++;
        
        std::cout << "   - Generated " << midiEventCount << " MIDI events from pattern" << std::endl;
    }
    
    void demonstrateParameterMapping()
    {
        std::cout << "\n4. Plugin parameter mapping..." << std::endl;
        
        auto& paramMapper = realtimeAPI->getParameterMapper();
        
        // Set some parameters
        paramMapper.setParameterValue(PluginParameterMapper::ParameterType::GeneratorA, 0.5f); // Should be 8
        paramMapper.setParameterValue(PluginParameterMapper::ParameterType::Tempo, 0.25f); // Should be 105 BPM
        paramMapper.setParameterValue(PluginParameterMapper::ParameterType::Swing, 0.3f); // 30% swing
        
        const auto& params = paramMapper.getPatternParams();
        
        std::cout << "   - Generator A: " << params.generatorA << " (from normalized 0.5)" << std::endl;
        std::cout << "   - Tempo: " << params.tempo << " BPM (from normalized 0.25)" << std::endl;
        std::cout << "   - Swing: " << (params.swing * 100) << "% (from normalized 0.3)" << std::endl;
        
        // Show parameter names and units
        std::cout << "   - Available parameters:" << std::endl;
        auto paramTypes = {
            PluginParameterMapper::ParameterType::GeneratorA,
            PluginParameterMapper::ParameterType::GeneratorB,
            PluginParameterMapper::ParameterType::Tempo,
            PluginParameterMapper::ParameterType::Swing,
            PluginParameterMapper::ParameterType::MidiChannel,
            PluginParameterMapper::ParameterType::BaseNote,
            PluginParameterMapper::ParameterType::Velocity
        };
        
        for (auto paramType : paramTypes)
        {
            auto name = PluginParameterMapper::getParameterName(paramType);
            auto units = PluginParameterMapper::getParameterUnits(paramType);
            std::cout << "     * " << name.toStdString();
            if (units.isNotEmpty())
                std::cout << " (" << units.toStdString() << ")";
            std::cout << std::endl;
        }
    }
    
    void simulateRealtimeProcessing()
    {
        std::cout << "\n5. Simulating real-time audio processing..." << std::endl;
        
        // Create sample audio data
        const int blockSize = 512;
        const int numChannels = 2;
        
        juce::AudioBuffer<float> audioBuffer(numChannels, blockSize);
        juce::MidiBuffer midiBuffer;
        
        // Fill with some sample audio data (sine wave)
        for (int channel = 0; channel < numChannels; ++channel)
        {
            auto* channelData = audioBuffer.getWritePointer(channel);
            for (int sample = 0; sample < blockSize; ++sample)
            {
                float sineValue = std::sin(2.0f * juce::MathConstants<float>::pi * 440.0f * sample / 44100.0f);
                channelData[sample] = sineValue * 0.1f; // Quiet sine wave
            }
        }
        
        // Create audio block for DSP processing
        auto audioBlock = juce::dsp::AudioBlock<float>(audioBuffer);
        
        // Process the audio and MIDI
        realtimeAPI->processAudioAndMidi(audioBlock, midiBuffer);
        
        // Check analyzer results
        auto& analyzer = realtimeAPI->getAnalyzer();
        
        std::cout << "   - Current RMS level: " << analyzer.getCurrentRMS() << std::endl;
        std::cout << "   - Estimated tempo: " << analyzer.getCurrentTempo() << " BPM" << std::endl;
        std::cout << "   - Beat phase: " << (analyzer.getCurrentBeatPhase() * 100) << "%" << std::endl;
        std::cout << "   - Beat detected: " << (analyzer.wasBeatDetected() ? "Yes" : "No") << std::endl;
        
        // Count generated MIDI events
        int midiEventCount = 0;
        for (const auto metadata : midiBuffer)
            midiEventCount++;
        
        std::cout << "   - Generated MIDI events: " << midiEventCount << std::endl;
    }
    
    void run()
    {
        if (!sdk)
        {
            std::cout << "SDK initialization failed!" << std::endl;
            return;
        }
        
        demonstrateRealtimeProcessing();
        demonstratePatternGeneration();
        demonstrateMidiProcessing();
        demonstrateParameterMapping();
        simulateRealtimeProcessing();
        
        std::cout << "\nReal-time audio processing example completed!" << std::endl;
        std::cout << "\nThis example demonstrates:" << std::endl;
        std::cout << "- Real-time safe pattern generation" << std::endl;
        std::cout << "- MIDI processing and generation" << std::endl;
        std::cout << "- Audio analysis and tempo detection" << std::endl;
        std::cout << "- Plugin parameter mapping" << std::endl;
        std::cout << "- Integration with JUCE DSP framework" << std::endl;
    }

private:
    std::unique_ptr<SchillingerSDK> sdk;
    RealtimeAudioAPI* realtimeAPI = nullptr;
};

int main()
{
    // Initialize JUCE
    juce::initialiseJuce_GUI();
    
    try
    {
        RealtimeAudioExample example;
        example.run();
    }
    catch (const std::exception& e)
    {
        std::cout << "Exception: " << e.what() << std::endl;
        return 1;
    }
    
    // Cleanup JUCE
    juce::shutdownJuce_GUI();
    
    return 0;
}