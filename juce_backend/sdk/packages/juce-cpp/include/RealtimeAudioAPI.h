/*
  ==============================================================================

    RealtimeAudioAPI.h
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <functional>
#include <atomic>

namespace Schillinger
{
    // Forward declarations
    class SchillingerSDK;
    
    //==============================================================================
    /** Real-time safe pattern generation parameters */
    struct RealtimePatternParams
    {
        int generatorA = 3;
        int generatorB = 2;
        double tempo = 120.0;
        std::pair<int, int> timeSignature {4, 4};
        double swing = 0.0;
        
        /** Validate parameters for real-time use */
        bool isValid() const noexcept
        {
            return generatorA > 0 && generatorB > 0 && 
                   tempo > 0 && tempo <= 300 &&
                   timeSignature.first > 0 && timeSignature.second > 0 &&
                   swing >= 0.0 && swing <= 1.0;
        }
    };

    //==============================================================================
    /** Real-time safe rhythm pattern data structure */
    struct RealtimeRhythmPattern
    {
        static constexpr int maxPatternLength = 64;
        
        std::array<float, maxPatternLength> durations;
        int patternLength = 0;
        double tempo = 120.0;
        std::pair<int, int> timeSignature {4, 4};
        double swing = 0.0;
        
        /** Clear the pattern */
        void clear() noexcept
        {
            durations.fill(0.0f);
            patternLength = 0;
        }
        
        /** Check if pattern is valid */
        bool isValid() const noexcept
        {
            return patternLength > 0 && patternLength <= maxPatternLength;
        }
    };

    //==============================================================================
    /** MIDI processing utilities for real-time pattern generation */
    class RealtimeMidiProcessor
    {
    public:
        RealtimeMidiProcessor() = default;
        ~RealtimeMidiProcessor() = default;
        
        /** Process incoming MIDI messages and generate pattern-based responses */
        void processMidiBuffer(juce::MidiBuffer& midiBuffer, 
                              const RealtimeRhythmPattern& pattern,
                              double sampleRate,
                              int numSamples) noexcept;
        
        /** Generate MIDI notes from rhythm pattern */
        void generateMidiFromPattern(juce::MidiBuffer& outputBuffer,
                                   const RealtimeRhythmPattern& pattern,
                                   int startSample,
                                   int numSamples,
                                   double sampleRate) noexcept;
        
        /** Set the MIDI channel for output */
        void setMidiChannel(int channel) noexcept { midiChannel = juce::jlimit(1, 16, channel); }
        
        /** Set the base note for pattern playback */
        void setBaseNote(int note) noexcept { baseNote = juce::jlimit(0, 127, note); }
        
        /** Set velocity for generated notes */
        void setVelocity(int vel) noexcept { velocity = juce::jlimit(1, 127, vel); }
        
    private:
        int midiChannel = 1;
        int baseNote = 60; // Middle C
        int velocity = 100;
        double currentPosition = 0.0;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealtimeMidiProcessor)
    };

    //==============================================================================
    /** Audio analysis tools using JUCE DSP for real-time processing */
    class RealtimeAudioAnalyzer
    {
    public:
        RealtimeAudioAnalyzer();
        ~RealtimeAudioAnalyzer() = default;
        
        /** Prepare the analyzer for processing */
        void prepare(const juce::dsp::ProcessSpec& spec);
        
        /** Analyze audio block and extract rhythm information */
        void analyzeAudioBlock(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept;
        
        /** Get the current tempo estimate */
        double getCurrentTempo() const noexcept { return currentTempo.load(); }
        
        /** Get the current beat phase (0.0 to 1.0) */
        double getCurrentBeatPhase() const noexcept { return currentBeatPhase.load(); }
        
        /** Check if a beat was detected in the last analysis */
        bool wasBeatDetected() const noexcept { return beatDetected.load(); }
        
        /** Get the current RMS level */
        float getCurrentRMS() const noexcept { return currentRMS.load(); }
        
        /** Reset the analyzer state */
        void reset() noexcept;
        
    private:
        // DSP processing chain
        juce::dsp::ProcessorChain<juce::dsp::Gain<float>, 
                                 juce::dsp::StateVariableTPTFilter<float>> processingChain;
        
        // Analysis state
        std::atomic<double> currentTempo{120.0};
        std::atomic<double> currentBeatPhase{0.0};
        std::atomic<bool> beatDetected{false};
        std::atomic<float> currentRMS{0.0f};
        
        // Internal processing variables
        double sampleRate = 44100.0;
        int blockSize = 512;
        
        // Beat detection
        juce::Array<float> onsetBuffer;
        double lastBeatTime = 0.0;
        double beatInterval = 0.5; // 120 BPM default
        
        // RMS calculation
        float rmsBuffer[1024];
        int rmsBufferIndex = 0;
        
        void updateTempo(double newTempo) noexcept;
        void detectOnsets(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept;
        void updateRMS(const juce::dsp::AudioBlock<const float>& audioBlock) noexcept;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealtimeAudioAnalyzer)
    };

    //==============================================================================
    /** Real-time safe pattern generator for audio thread usage */
    class RealtimePatternGenerator
    {
    public:
        RealtimePatternGenerator() = default;
        ~RealtimePatternGenerator() = default;
        
        /** Generate a rhythm pattern using Schillinger generators (real-time safe) */
        bool generateRhythmPattern(const RealtimePatternParams& params,
                                 RealtimeRhythmPattern& outputPattern) noexcept;
        
        /** Apply variation to existing pattern (real-time safe) */
        bool applyVariation(const RealtimeRhythmPattern& inputPattern,
                          RealtimeRhythmPattern& outputPattern,
                          int variationType) noexcept;
        
        /** Transform pattern with mathematical operations (real-time safe) */
        bool transformPattern(const RealtimeRhythmPattern& inputPattern,
                            RealtimeRhythmPattern& outputPattern,
                            int transformType) noexcept;
        
        /** Set random seed for pattern generation */
        void setSeed(int seed) noexcept { randomSeed = seed; }
        
    private:
        int randomSeed = 12345;
        
        // Real-time safe mathematical functions
        void calculateResultant(int a, int b, RealtimeRhythmPattern& pattern) noexcept;
        void applySwing(RealtimeRhythmPattern& pattern, double swingAmount) noexcept;
        void normalizePattern(RealtimeRhythmPattern& pattern) noexcept;
        
        // Simple random number generator for real-time use
        int nextRandom() noexcept
        {
            randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
            return randomSeed;
        }
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealtimePatternGenerator)
    };

    //==============================================================================
    /** Plugin parameter mapping for DAW integration */
    class PluginParameterMapper
    {
    public:
        /** Parameter types that can be mapped */
        enum class ParameterType
        {
            GeneratorA,
            GeneratorB,
            Tempo,
            Swing,
            TimeSignatureNumerator,
            TimeSignatureDenominator,
            VariationType,
            TransformType,
            MidiChannel,
            BaseNote,
            Velocity
        };
        
        PluginParameterMapper() = default;
        ~PluginParameterMapper() = default;
        
        /** Map a normalized parameter value (0.0-1.0) to pattern parameters */
        void setParameterValue(ParameterType type, float normalizedValue) noexcept;
        
        /** Get the current pattern parameters */
        const RealtimePatternParams& getPatternParams() const noexcept { return patternParams; }
        
        /** Get parameter value as normalized float */
        float getParameterValue(ParameterType type) const noexcept;
        
        /** Get parameter name for display */
        static juce::String getParameterName(ParameterType type) noexcept;
        
        /** Get parameter units for display */
        static juce::String getParameterUnits(ParameterType type) noexcept;
        
        /** Get parameter range */
        static juce::NormalisableRange<float> getParameterRange(ParameterType type) noexcept;
        
    private:
        RealtimePatternParams patternParams;
        int variationType = 0;
        int transformType = 0;
        int midiChannel = 1;
        int baseNote = 60;
        int velocity = 100;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginParameterMapper)
    };

    //==============================================================================
    /**
        Real-time audio processing API for the Schillinger SDK.
        
        This class provides real-time safe pattern generation algorithms,
        MIDI processing utilities, and audio analysis tools specifically
        designed for use in audio applications and plugins.
        
        All methods in this class are designed to be real-time safe and
        can be called from the audio thread without causing dropouts.
        
        Example usage in an audio plugin:
        @code
        void MyPlugin::processBlock(AudioBuffer<float>& buffer, MidiBuffer& midiMessages)
        {
            auto audioBlock = juce::dsp::AudioBlock<float>(buffer);
            
            // Analyze incoming audio
            realtimeAPI.getAnalyzer().analyzeAudioBlock(audioBlock);
            
            // Generate pattern based on analysis
            RealtimePatternParams params;
            params.tempo = realtimeAPI.getAnalyzer().getCurrentTempo();
            
            RealtimeRhythmPattern pattern;
            if (realtimeAPI.getPatternGenerator().generateRhythmPattern(params, pattern))
            {
                // Process MIDI with generated pattern
                realtimeAPI.getMidiProcessor().processMidiBuffer(midiMessages, pattern, 
                                                               getSampleRate(), buffer.getNumSamples());
            }
        }
        @endcode
    */
    class RealtimeAudioAPI
    {
    public:
        //==============================================================================
        /** Constructor */
        explicit RealtimeAudioAPI(SchillingerSDK* sdk);
        
        /** Destructor */
        ~RealtimeAudioAPI();

        //==============================================================================
        /** Prepare for real-time processing */
        void prepare(const juce::dsp::ProcessSpec& spec);
        
        /** Reset all processing state */
        void reset() noexcept;

        //==============================================================================
        /** Get the real-time pattern generator */
        RealtimePatternGenerator& getPatternGenerator() noexcept { return patternGenerator; }
        
        /** Get the MIDI processor */
        RealtimeMidiProcessor& getMidiProcessor() noexcept { return midiProcessor; }
        
        /** Get the audio analyzer */
        RealtimeAudioAnalyzer& getAnalyzer() noexcept { return audioAnalyzer; }
        
        /** Get the parameter mapper */
        PluginParameterMapper& getParameterMapper() noexcept { return parameterMapper; }

        //==============================================================================
        /** Process audio and MIDI in real-time */
        void processAudioAndMidi(juce::dsp::AudioBlock<float>& audioBlock,
                               juce::MidiBuffer& midiBuffer) noexcept;
        
        /** Generate pattern-based MIDI output */
        void generatePatternMidi(juce::MidiBuffer& outputBuffer,
                               int startSample,
                               int numSamples,
                               double sampleRate) noexcept;

        //==============================================================================
        /** Enable/disable real-time pattern generation */
        void setPatternGenerationEnabled(bool enabled) noexcept { patternGenerationEnabled = enabled; }
        
        /** Check if pattern generation is enabled */
        bool isPatternGenerationEnabled() const noexcept { return patternGenerationEnabled; }
        
        /** Set the current pattern parameters */
        void setPatternParams(const RealtimePatternParams& params) noexcept { currentParams = params; }
        
        /** Get the current pattern parameters */
        const RealtimePatternParams& getPatternParams() const noexcept { return currentParams; }

    private:
        //==============================================================================
        SchillingerSDK* parentSDK;
        
        // Real-time processing components
        RealtimePatternGenerator patternGenerator;
        RealtimeMidiProcessor midiProcessor;
        RealtimeAudioAnalyzer audioAnalyzer;
        PluginParameterMapper parameterMapper;
        
        // Current state
        RealtimePatternParams currentParams;
        RealtimeRhythmPattern currentPattern;
        std::atomic<bool> patternGenerationEnabled{true};
        
        // Processing specs
        double sampleRate = 44100.0;
        int maximumBlockSize = 512;
        int numChannels = 2;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealtimeAudioAPI)
    };

} // namespace Schillinger