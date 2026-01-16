#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

/**
 * Real-time oscillator processor for AudioEngine TDD implementation
 *
 * This replaces the fake "simple passthrough node" with a real,
 * production-ready oscillator that generates audio signals.
 */
class OscillatorProcessor : public juce::AudioProcessor
{
public:
    OscillatorProcessor();
    ~OscillatorProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    bool hasEditor() const override;
    juce::AudioProcessorEditor* createEditor() override;
    double getTailLengthSeconds() const override;

    //==============================================================================
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    //==============================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // Oscillator-specific parameters
    void setFrequency(float frequency);
    float getFrequency() const { return frequency.get(); }

    void setGain(float gain);
    float getGain() const { return gain.get(); }

    void setWaveform(int waveformType);
    int getWaveform() const { return waveformType.get(); }

    enum WaveformType
    {
        Sine = 0,
        Sawtooth = 1,
        Square = 2,
        Triangle = 3
    };

private:
    // Phase accumulator for waveform generation
    juce::Atomic<float> frequency { 440.0f };
    juce::Atomic<float> gain { 0.5f };
    juce::Atomic<int> waveformType { Sine };

    double currentSampleRate = 44100.0;
    juce::Atomic<double> phase { 0.0 };
    juce::Atomic<double> phaseIncrement { 0.0 };

    // DSP processing chain for more advanced oscillators
    juce::dsp::ProcessorChain<juce::dsp::Oscillator<float>, juce::dsp::Gain<float>> dspChain;

    // Real-time safe waveform generation
    float generateSineWave(double phase) const;
    float generateSawtoothWave(double phase) const;
    float generateSquareWave(double phase) const;
    float generateTriangleWave(double phase) const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (OscillatorProcessor)
};