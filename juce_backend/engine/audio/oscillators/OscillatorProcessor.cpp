#include "OscillatorProcessor.h"
#include <juce_dsp/juce_dsp.h>

OscillatorProcessor::OscillatorProcessor()
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       )
{
    // Initialize the DSP chain
    auto& oscillator = dspChain.get<0>();
    auto& gain = dspChain.get<1>();

    // Configure the oscillator
    oscillator.initialise([](float sample) {
        return std::sin(sample);
    });

    oscillator.setFrequency(440.0f);
    gain.setGainLinear(0.5f);
}

OscillatorProcessor::~OscillatorProcessor()
{
}

const juce::String OscillatorProcessor::getName() const
{
    return "OscillatorProcessor";
}

bool OscillatorProcessor::acceptsMidi() const
{
    return false;
}

bool OscillatorProcessor::producesMidi() const
{
    return false;
}

bool OscillatorProcessor::isMidiEffect() const
{
    return false;
}

bool OscillatorProcessor::hasEditor() const
{
    return false; // No GUI editor for this internal processor
}

juce::AudioProcessorEditor* OscillatorProcessor::createEditor()
{
    return nullptr; // No editor available
}

double OscillatorProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int OscillatorProcessor::getNumPrograms()
{
    return 1;   // NB: some hosts don't cope very well if you tell them there are 0 programs,
                // so this should be at least 1, even if you're not really implementing programs.
}

int OscillatorProcessor::getCurrentProgram()
{
    return 0;
}

void OscillatorProcessor::setCurrentProgram (int index)
{
}

const juce::String OscillatorProcessor::getProgramName (int index)
{
    return {};
}

void OscillatorProcessor::changeProgramName (int index, const juce::String& newName)
{
}

void OscillatorProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;

    // Update phase increment for current frequency
    double frequencyHz = frequency.get();
    phaseIncrement = (frequencyHz * 2.0 * juce::MathConstants<double>::pi) / currentSampleRate;

    // Prepare the DSP chain
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = samplesPerBlock;
    spec.numChannels = getTotalNumOutputChannels();

    dspChain.prepare(spec);

    // Update DSP parameters
    auto& osc = dspChain.get<0>();
    auto& gainProcessor = dspChain.get<1>();

    osc.setFrequency(frequencyHz);
    gainProcessor.setGainLinear(gain.get());
}

void OscillatorProcessor::releaseResources()
{
    // When playback stops, you can use this as an opportunity to free up any
    // spare memory, etc.
}

bool OscillatorProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    // Support any input/output layout as long as we have outputs
    if (layouts.getMainOutputChannelSet().size() == 0)
        return false;

    // For synthesis, we don't need input channels to match output channels
    return true;
}

void OscillatorProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear any unused output channels
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Use the more efficient DSP chain for simple sine waves
    if (waveformType.get() == Sine)
    {
        // Update DSP parameters
        auto& osc = dspChain.get<0>();
        auto& gainProcessor = dspChain.get<1>();

        osc.setFrequency(frequency.get());
        gainProcessor.setGainLinear(gain.get());

        // Create audio context
        juce::dsp::AudioBlock<float> block(buffer);
        juce::dsp::ProcessContextReplacing<float> context(block);

        // Process through DSP chain
        dspChain.process(context);
    }
    else
    {
        // Use custom waveforms for non-sine waveforms
        const int numSamples = buffer.getNumSamples();
        const double currentPhase = phase.get();
        const double currentPhaseIncrement = phaseIncrement.get();
        const float currentFrequency = frequency.get();
        const float currentGain = gain.get();
        const int currentWaveformType = waveformType.get();

        // Update phase increment if frequency changed
        if (std::abs(currentFrequency - frequency.get()) > 0.001f)
        {
            phaseIncrement = (frequency.get() * 2.0 * juce::MathConstants<double>::pi) / currentSampleRate;
        }

        double newPhase = currentPhase;
        const double newPhaseIncrement = phaseIncrement.get();

        for (int channel = 0; channel < totalNumOutputChannels; ++channel)
        {
            auto* channelData = buffer.getWritePointer(channel);

            // Reset phase for each channel to maintain phase coherence
            newPhase = currentPhase;

            for (int sample = 0; sample < numSamples; ++sample)
            {
                // Generate waveform based on selected type
                float sampleValue = 0.0f;
                switch (currentWaveformType)
                {
                    case Sine:
                        sampleValue = generateSineWave(newPhase);
                        break;
                    case Sawtooth:
                        sampleValue = generateSawtoothWave(newPhase);
                        break;
                    case Square:
                        sampleValue = generateSquareWave(newPhase);
                        break;
                    case Triangle:
                        sampleValue = generateTriangleWave(newPhase);
                        break;
                    default:
                        sampleValue = generateSineWave(newPhase);
                        break;
                }

                // Apply gain
                sampleValue *= currentGain;

                // Write to buffer (if this is an input channel, mix with input)
                if (channel < totalNumInputChannels)
                {
                    channelData[sample] = channelData[sample] + sampleValue; // Mix with input
                }
                else
                {
                    channelData[sample] = sampleValue; // Pure synthesis
                }

                // Advance phase
                newPhase += newPhaseIncrement;

                // Wrap phase to prevent overflow
                if (newPhase >= 2.0 * juce::MathConstants<double>::pi)
                    newPhase -= 2.0 * juce::MathConstants<double>::pi;
            }
        }

        // Store updated phase
        phase.set(newPhase);
    }
}

void OscillatorProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // Store oscillator state
    juce::MemoryOutputStream stream(destData, true);
    stream.writeFloat(frequency.get());
    stream.writeFloat(gain.get());
    stream.writeInt(waveformType.get());
}

void OscillatorProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // Restore oscillator state
    juce::MemoryInputStream stream(data, static_cast<size_t>(sizeInBytes), false);
    setFrequency(stream.readFloat());
    setGain(stream.readFloat());
    setWaveform(stream.readInt());
}

void OscillatorProcessor::setFrequency(float frequencyHz)
{
    frequency.set(juce::jlimit(20.0f, 20000.0f, frequencyHz));
    // Update phase increment for next audio callback
    phaseIncrement = (frequency.get() * 2.0 * juce::MathConstants<double>::pi) / currentSampleRate;
}

void OscillatorProcessor::setGain(float gainValue)
{
    gain.set(juce::jlimit(0.0f, 1.0f, gainValue));
}

void OscillatorProcessor::setWaveform(int waveform)
{
    waveformType.set(juce::jlimit(0, 3, waveform));
}

// Real-time safe waveform generation functions
float OscillatorProcessor::generateSineWave(double phase) const
{
    return std::sin(phase);
}

float OscillatorProcessor::generateSawtoothWave(double phase) const
{
    // Normalize phase from [0, 2π] to [-1, 1]
    double normalizedPhase = phase / (2.0 * juce::MathConstants<double>::pi);
    return static_cast<float>(2.0 * normalizedPhase - 1.0);
}

float OscillatorProcessor::generateSquareWave(double phase) const
{
    // Simple square wave: positive when sin(phase) > 0, negative otherwise
    return std::sin(phase) > 0.0f ? 1.0f : -1.0f;
}

float OscillatorProcessor::generateTriangleWave(double phase) const
{
    // Triangle wave using absolute value
    double normalizedPhase = phase / (2.0 * juce::MathConstants<double>::pi);
    if (normalizedPhase < 0.5)
        return static_cast<float>(4.0 * normalizedPhase - 1.0);
    else
        return static_cast<float>(-4.0 * normalizedPhase + 3.0);
}

