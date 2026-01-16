/*
==============================================================================
White Room Pedalboard Processor Implementation
==============================================================================
*/

#include "PedalboardProcessor.h"
#include "PedalboardEditor.h"

//==============================================================================
PedalboardProcessor::PedalboardProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
    : AudioProcessor(BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true))
#endif
{
    // Initialize all pedal DSP instances
    volumeDSP = std::make_unique<VolumePedalPureDSP>();
    fuzzDSP = std::make_unique<FuzzPedalPureDSP>();
    overdriveDSP = std::make_unique<OverdrivePedalPureDSP>();
    compressorDSP = std::make_unique<CompressorPedalPureDSP>();
    eqDSP = std::make_unique<EQPedalPureDSP>();
    noiseGateDSP = std::make_unique<NoiseGatePedalPureDSP>();
    chorusDSP = std::make_unique<ChorusPedalPureDSP>();
    delayDSP = std::make_unique<DelayPedalPureDSP>();
    reverbDSP = std::make_unique<ReverbPedalPureDSP>();
    // phaserDSP = std::make_unique<BiPhasePedalPureDSP>();  // TODO: Fix BiPhaseDSP linking issues

    // Prepare all pedals with default settings
    double defaultSampleRate = 48000.0;
    int defaultBlockSize = 512;
    volumeDSP->prepare(defaultSampleRate, defaultBlockSize);
    fuzzDSP->prepare(defaultSampleRate, defaultBlockSize);
    overdriveDSP->prepare(defaultSampleRate, defaultBlockSize);
    compressorDSP->prepare(defaultSampleRate, defaultBlockSize);
    eqDSP->prepare(defaultSampleRate, defaultBlockSize);
    noiseGateDSP->prepare(defaultSampleRate, defaultBlockSize);
    chorusDSP->prepare(defaultSampleRate, defaultBlockSize);
    delayDSP->prepare(defaultSampleRate, defaultBlockSize);
    reverbDSP->prepare(defaultSampleRate, defaultBlockSize);
    // phaserDSP->prepare(defaultSampleRate, defaultBlockSize);  // TODO: Fix BiPhaseDSP linking issues

    // Create default pedal chain
    addPedal("Compressor", 0);
    addPedal("EQ", 1);
    addPedal("Chorus", 2);
    addPedal("Delay", 3);
    addPedal("Reverb", 4);
}

PedalboardProcessor::~PedalboardProcessor()
{
}

//==============================================================================
void PedalboardProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    // Prepare all DSP pedals with new sample rate and block size
    volumeDSP->prepare(sampleRate, samplesPerBlock);
    fuzzDSP->prepare(sampleRate, samplesPerBlock);
    overdriveDSP->prepare(sampleRate, samplesPerBlock);
    compressorDSP->prepare(sampleRate, samplesPerBlock);
    eqDSP->prepare(sampleRate, samplesPerBlock);
    noiseGateDSP->prepare(sampleRate, samplesPerBlock);
    chorusDSP->prepare(sampleRate, samplesPerBlock);
    delayDSP->prepare(sampleRate, samplesPerBlock);
    reverbDSP->prepare(sampleRate, samplesPerBlock);
    // phaserDSP->prepare(sampleRate, samplesPerBlock);  // TODO: Fix BiPhaseDSP linking issues

    // Reset all pedals
    volumeDSP->reset();
    fuzzDSP->reset();
    overdriveDSP->reset();
    compressorDSP->reset();
    eqDSP->reset();
    noiseGateDSP->reset();
    chorusDSP->reset();
    delayDSP->reset();
    reverbDSP->reset();
    // phaserDSP->reset();  // TODO: Fix BiPhaseDSP linking issues
}

void PedalboardProcessor::releaseResources()
{
    // Reset all pedals
    for (auto& pedal : pedalChain)
    {
        pedal->getDSP()->reset();
    }
}

//==============================================================================
void PedalboardProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear output if in bypass mode
    if (totalNumInputChannels != totalNumOutputChannels)
    {
        buffer.clear();
        return;
    }

    // Apply input level
    buffer.applyGain(inputLevel);

    // Process through pedal chain
    float* inputs[2];
    float* outputs[2];

    // Temporary buffers for processing
    juce::AudioBuffer<float> tempBuffer = buffer;

    for (auto& pedal : pedalChain)
    {
        inputs[0] = tempBuffer.getWritePointer(0);
        inputs[1] = totalNumInputChannels > 1 ? tempBuffer.getWritePointer(1) : inputs[0];
        outputs[0] = buffer.getWritePointer(0);
        outputs[1] = totalNumInputChannels > 1 ? buffer.getWritePointer(1) : outputs[0];

        pedal->process(inputs, outputs, totalNumInputChannels, buffer.getNumSamples());

        // Copy output back to temp buffer for next pedal
        tempBuffer.makeCopyOf(buffer);
    }

    // Apply dry/wet mix
    if (dryWetMix < 1.0f)
    {
        buffer.applyGain(dryWetMix);
    }

    // Apply output level
    buffer.applyGain(outputLevel);
}

//==============================================================================
juce::AudioProcessorEditor* PedalboardProcessor::createEditor()
{
    return new PedalboardEditor(*this);
}

//==============================================================================
void PedalboardProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    nlohmann::json state;

    // Save global parameters
    state["inputLevel"] = inputLevel;
    state["outputLevel"] = outputLevel;
    state["dryWetMix"] = dryWetMix;
    state["globalTempo"] = globalTempo;
    state["presetName"] = currentPresetName;

    // Save pedal chain
    state["pedals"] = nlohmann::json::array();
    for (const auto& pedal : pedalChain)
    {
        nlohmann::json pedalData;
        pedalData["type"] = pedal->getName();
        pedalData["parameters"] = pedal->getParameters();
        state["pedals"].push_back(pedalData);
    }

    // Save scenes
    state["scenes"] = nlohmann::json::array();
    for (const auto& scene : scenes)
    {
        state["scenes"].push_back(scene);
    }

    // Serialize to string
    std::string stateString = state.dump();

    // Copy to destData
    destData.append(stateString.data(), stateString.size());
}

void PedalboardProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    // Deserialize from string
    std::string stateString(static_cast<const char*>(data), sizeInBytes);
    nlohmann::json state = nlohmann::json::parse(stateString);

    // Load global parameters
    if (state.contains("inputLevel"))
        inputLevel = state["inputLevel"];
    if (state.contains("outputLevel"))
        outputLevel = state["outputLevel"];
    if (state.contains("dryWetMix"))
        dryWetMix = state["dryWetMix"];
    if (state.contains("globalTempo"))
        globalTempo = state["globalTempo"];
    if (state.contains("presetName"))
        currentPresetName = state["presetName"];

    // Load pedal chain
    if (state.contains("pedals"))
    {
        pedalChain.clear();

        for (const auto& pedalData : state["pedals"])
        {
            std::string pedalType = pedalData["type"];
            addPedal(pedalType);

            // Set parameters
            if (pedalChain.size() > 0)
            {
                pedalChain.back()->setParameters(pedalData["parameters"]);
            }
        }
    }

    // Load scenes
    if (state.contains("scenes"))
    {
        for (size_t i = 0; i < scenes.size() && i < state["scenes"].size(); ++i)
        {
            scenes[i] = state["scenes"][i];
        }
    }
}

//==============================================================================
std::unique_ptr<PedalInstance> PedalboardProcessor::createPedalInstance(const std::string& pedalType)
{
    if (pedalType == "Volume")
        return std::make_unique<PedalInstance>(volumeDSP.get(), "Volume");
    else if (pedalType == "Fuzz")
        return std::make_unique<PedalInstance>(fuzzDSP.get(), "Fuzz");
    else if (pedalType == "Overdrive")
        return std::make_unique<PedalInstance>(overdriveDSP.get(), "Overdrive");
    else if (pedalType == "Compressor")
        return std::make_unique<PedalInstance>(compressorDSP.get(), "Compressor");
    else if (pedalType == "EQ")
        return std::make_unique<PedalInstance>(eqDSP.get(), "EQ");
    else if (pedalType == "Noise Gate")
        return std::make_unique<PedalInstance>(noiseGateDSP.get(), "Noise Gate");
    else if (pedalType == "Chorus")
        return std::make_unique<PedalInstance>(chorusDSP.get(), "Chorus");
    else if (pedalType == "Delay")
        return std::make_unique<PedalInstance>(delayDSP.get(), "Delay");
    else if (pedalType == "Reverb")
        return std::make_unique<PedalInstance>(reverbDSP.get(), "Reverb");
    // else if (pedalType == "Phaser")
    //     return std::make_unique<PedalInstance>(phaserDSP.get(), "Phaser");  // TODO: Fix BiPhaseDSP linking issues
    else
        return nullptr;
}

//==============================================================================
void PedalboardProcessor::addPedal(const std::string& pedalType, int position)
{
    auto pedal = createPedalInstance(pedalType);

    if (pedal)
    {
        if (position < 0 || position >= (int)pedalChain.size())
        {
            pedalChain.push_back(std::move(pedal));
        }
        else
        {
            pedalChain.insert(pedalChain.begin() + position, std::move(pedal));
        }
    }
}

void PedalboardProcessor::removePedal(int position)
{
    if (position >= 0 && position < (int)pedalChain.size())
    {
        pedalChain.erase(pedalChain.begin() + position);
    }
}

void PedalboardProcessor::movePedal(int fromPosition, int toPosition)
{
    if (fromPosition >= 0 && fromPosition < (int)pedalChain.size() &&
        toPosition >= 0 && toPosition < (int)pedalChain.size())
    {
        auto pedal = std::move(pedalChain[fromPosition]);
        pedalChain.erase(pedalChain.begin() + fromPosition);
        pedalChain.insert(pedalChain.begin() + toPosition, std::move(pedal));
    }
}

//==============================================================================
void PedalboardProcessor::savePreset(const std::string& presetName)
{
    nlohmann::json preset;
    preset["name"] = presetName;
    preset["pedals"] = nlohmann::json::array();

    for (const auto& pedal : pedalChain)
    {
        nlohmann::json pedalData;
        pedalData["type"] = pedal->getName();
        pedalData["parameters"] = pedal->getParameters();
        preset["pedals"].push_back(pedalData);
    }

    // Save to file
    auto presetFile = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory)
        .getChildFile("WhiteRoomPedalboard")
        .getChildFile("Presets")
        .getChildFile(presetName + ".json");

    presetFile.create();
    presetFile.replaceWithText(preset.dump(4));

    currentPresetName = presetName;
}

void PedalboardProcessor::loadPreset(const std::string& presetName)
{
    // Load from file
    auto presetFile = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory)
        .getChildFile("WhiteRoomPedalboard")
        .getChildFile("Presets")
        .getChildFile(presetName + ".json");

    if (!presetFile.existsAsFile())
        return;

    std::string presetContent = presetFile.loadFileAsString().toStdString();
    nlohmann::json preset = nlohmann::json::parse(presetContent);

    // Load pedal chain
    if (preset.contains("pedals"))
    {
        pedalChain.clear();

        for (const auto& pedalData : preset["pedals"])
        {
            std::string pedalType = pedalData["type"];
            addPedal(pedalType);

            // Set parameters
            if (pedalChain.size() > 0)
            {
                pedalChain.back()->setParameters(pedalData["parameters"]);
            }
        }
    }

    currentPresetName = presetName;
}

//==============================================================================
void PedalboardProcessor::saveScene(int sceneNumber, const std::string& sceneName)
{
    if (sceneNumber < 0 || sceneNumber >= 8)
        return;

    nlohmann::json scene;
    scene["name"] = sceneName;
    scene["pedals"] = nlohmann::json::array();

    for (const auto& pedal : pedalChain)
    {
        nlohmann::json pedalData;
        pedalData["type"] = pedal->getName();
        pedalData["parameters"] = pedal->getParameters();
        scene["pedals"].push_back(pedalData);
    }

    scenes[sceneNumber] = scene;
}

void PedalboardProcessor::loadScene(int sceneNumber)
{
    if (sceneNumber < 0 || sceneNumber >= 8)
        return;

    const nlohmann::json& scene = scenes[sceneNumber];

    if (!scene.contains("pedals"))
        return;

    // Load pedal chain
    pedalChain.clear();

    for (const auto& pedalData : scene["pedals"])
    {
        std::string pedalType = pedalData["type"];
        addPedal(pedalType);

        // Set parameters
        if (pedalChain.size() > 0)
        {
            pedalChain.back()->setParameters(pedalData["parameters"]);
        }
    }
}

//==============================================================================
// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PedalboardProcessor();
}
