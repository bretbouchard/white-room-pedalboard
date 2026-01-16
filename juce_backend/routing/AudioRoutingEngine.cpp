#include "AudioRoutingEngine.h"
#include "../instrument/InstrumentInstance.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <algorithm>
#include <chrono>

namespace SchillingerEcosystem::Routing {

//==============================================================================
// EffectsChain Implementation
//==============================================================================

EffectsChain::EffectsChain(const juce::String& identifier, int maxChannels)
    : chainIdentifier(identifier), numChannels(maxChannels)
{
    dryBuffer.setSize(numChannels, 512);
    juce::Logger::writeToLog("Created effects chain: " + identifier);
}

EffectsChain::~EffectsChain()
{
    effects.clear();
    juce::Logger::writeToLog("Destroyed effects chain: " + chainIdentifier);
}

bool EffectsChain::addEffect(std::unique_ptr<juce::AudioProcessor> effect, const juce::String& name)
{
    if (!effect)
        return false;

    juce::String effectName = name.isEmpty() ? ("Effect " + juce::String(effects.size() + 1)) : name;

    // Prepare effect
    effect->prepareToPlay(currentSampleRate, currentBlockSize);
    effect->setPlayConfigDetails(numChannels, numChannels, currentSampleRate, currentBlockSize);

    effects.push_back(std::move(effect));
    effectNames.push_back(effectName);

    juce::Logger::writeToLog("Added effect to chain " + chainIdentifier + ": " + effectName);
    return true;
}

bool EffectsChain::removeEffect(int index)
{
    if (index < 0 || index >= static_cast<int>(effects.size()))
        return false;

    effects.erase(effects.begin() + index);
    effectNames.erase(effectNames.begin() + index);

    juce::Logger::writeToLog("Removed effect from chain " + chainIdentifier + " at index " + juce::String(index));
    return true;
}

bool EffectsChain::removeEffect(const juce::String& identifier)
{
    auto it = std::find(effectNames.begin(), effectNames.end(), identifier);
    if (it != effectNames.end())
    {
        int index = static_cast<int>(std::distance(effectNames.begin(), it));
        return removeEffect(index);
    }

    return false;
}

bool EffectsChain::moveEffect(int fromIndex, int toIndex)
{
    if (fromIndex < 0 || fromIndex >= static_cast<int>(effects.size()) ||
        toIndex < 0 || toIndex >= static_cast<int>(effects.size()))
        return false;

    if (fromIndex == toIndex)
        return true;

    // Move effects and names
    auto effectToMove = std::move(effects[fromIndex]);
    auto nameToMove = effectNames[fromIndex];

    effects.erase(effects.begin() + fromIndex);
    effectNames.erase(effectNames.begin() + fromIndex);

    effects.insert(effects.begin() + toIndex, std::move(effectToMove));
    effectNames.insert(effectNames.begin() + toIndex, nameToMove);

    juce::Logger::writeToLog("Moved effect in chain " + chainIdentifier + " from " +
                           juce::String(fromIndex) + " to " + juce::String(toIndex));
    return true;
}

juce::AudioProcessor* EffectsChain::getEffect(int index)
{
    if (index >= 0 && index < static_cast<int>(effects.size()))
        return effects[index].get();
    return nullptr;
}

const juce::AudioProcessor* EffectsChain::getEffect(int index) const
{
    if (index >= 0 && index < static_cast<int>(effects.size()))
        return effects[index].get();
    return nullptr;
}

juce::AudioProcessor* EffectsChain::getEffect(const juce::String& identifier)
{
    auto it = std::find(effectNames.begin(), effectNames.end(), identifier);
    if (it != effectNames.end())
    {
        int index = static_cast<int>(std::distance(effectNames.begin(), it));
        return getEffect(index);
    }
    return nullptr;
}

const juce::AudioProcessor* EffectsChain::getEffect(const juce::String& identifier) const
{
    auto it = std::find(effectNames.begin(), effectNames.end(), identifier);
    if (it != effectNames.end())
    {
        int index = static_cast<int>(std::distance(effectNames.begin(), it));
        return getEffect(index);
    }
    return nullptr;
}

void EffectsChain::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    if (bypassed || effects.empty())
        return;

    // Ensure buffer size is adequate
    if (buffer.getNumChannels() != numChannels)
        return;

    // Store dry signal if needed
    if (dryLevel > 0.0f)
    {
        dryBuffer.makeCopyOf(buffer);
    }

    // Process through effects chain
    for (auto& effect : effects)
    {
        if (effect && !effect->isSuspended())
        {
            effect->processBlock(buffer, midiMessages);
        }
    }

    // Mix wet and dry signals
    if (dryLevel > 0.0f)
    {
        for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
        {
            auto* wetData = buffer.getWritePointer(channel);
            const auto* dryData = dryBuffer.getReadPointer(channel);

            for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
            {
                wetData[sample] = wetData[sample] * wetLevel + dryData[sample] * dryLevel;
            }
        }
    }
}

void EffectsChain::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;
    currentBlockSize = samplesPerBlock;

    // Prepare all effects
    for (auto& effect : effects)
    {
        if (effect)
        {
            effect->prepareToPlay(sampleRate, samplesPerBlock);
            effect->setPlayConfigDetails(numChannels, numChannels, sampleRate, samplesPerBlock);
        }
    }

    // Prepare dry buffer
    dryBuffer.setSize(numChannels, samplesPerBlock);

    juce::Logger::writeToLog("Prepared effects chain " + chainIdentifier +
                           " for " + juce::String(sampleRate) + "Hz, " +
                           juce::String(samplesPerBlock) + " samples");
}

void EffectsChain::reset()
{
    for (auto& effect : effects)
    {
        if (effect)
            effect->reset();
    }
    dryBuffer.clear();
}

void EffectsChain::setBypassed(bool newBypassed)
{
    bypassed = newBypassed;
    juce::Logger::writeToLog("Effects chain " + chainIdentifier + " bypassed: " + juce::String(bypassed));
}

void EffectsChain::setWetDryMix(float newWetLevel, float newDryLevel)
{
    wetLevel = juce::jlimit(0.0f, 1.0f, newWetLevel);
    dryLevel = juce::jlimit(0.0f, 1.0f, newDryLevel);
}

//==============================================================================
// MixerBus Implementation
//==============================================================================

MixerBus::MixerBus(const juce::String& identifier, Type type, int channels)
    : identifier(identifier), busType(type), numChannels(channels)
{
    effectsChain = std::make_unique<EffectsChain>(identifier + "_effects", channels);
    mixBuffer.setSize(channels, 512);

    juce::Logger::writeToLog("Created mixer bus: " + identifier + " (" + juce::String(channels) + " channels)");
}

void MixerBus::processAudio(juce::AudioBuffer<float>& buffer)
{
    if (buffer.getNumChannels() < numChannels)
        return;

    std::lock_guard<std::mutex> lock(stateMutex);

    // Clear mix buffer
    mixBuffer.clear();

    // Apply gain
    float linearGain = RoutingUtils::dBToLinear(gain);
    buffer.applyGain(linearGain);

    // Apply pan (if stereo)
    if (numChannels >= 2)
    {
        auto [leftGain, rightGain] = RoutingUtils::panToStereoGains(pan);

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
        {
            buffer.setSample(0, sample, buffer.getSample(0, sample) * leftGain);
            buffer.setSample(1, sample, buffer.getSample(1, sample) * rightGain);
        }
    }

    // Apply effects if not bypassed
    if (!bypassed && effectsChain)
    {
        juce::MidiBuffer emptyMidi;
        effectsChain->processBlock(buffer, emptyMidi);
    }

    // Update monitoring
    for (int channel = 0; channel < numChannels && channel < 16; ++channel)
    {
        float peak = 0.0f;
        float rms = 0.0f;

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
        {
            float sampleValue = std::abs(buffer.getSample(channel, sample));
            peak = std::max(peak, sampleValue);
            rms += sampleValue * sampleValue;
        }

        rms = std::sqrt(rms / buffer.getNumSamples());

        currentState.peakLevel[channel] = peak;
        currentState.rmsLevel[channel] = rms;
        currentState.clipping[channel] = peak > 1.0f;
    }
}

void MixerBus::addInput(const juce::AudioBuffer<float>& input, float inputGain)
{
    std::lock_guard<std::mutex> lock(stateMutex);

    int channelsToMix = std::min(input.getNumChannels(), mixBuffer.getNumChannels());
    int samplesToMix = std::min(input.getNumSamples(), mixBuffer.getNumSamples());

    for (int channel = 0; channel < channelsToMix; ++channel)
    {
        auto* destData = mixBuffer.getWritePointer(channel);
        const auto* srcData = input.getReadPointer(channel);

        for (int sample = 0; sample < samplesToMix; ++sample)
        {
            destData[sample] += srcData[sample] * inputGain;
        }
    }

    currentState.activeInputs++;
}

void MixerBus::setGain(float gainDb)
{
    gain = gainDb;
    juce::Logger::writeToLog("Bus " + identifier + " gain: " + juce::String(gainDb, 1) + "dB");
}

void MixerBus::setPan(float panValue)
{
    pan = juce::jlimit(-1.0f, 1.0f, panValue);
}

void MixerBus::setMute(bool newMuted)
{
    muted = newMuted;
    juce::Logger::writeToLog("Bus " + identifier + " muted: " + juce::String(muted));
}

void MixerBus::setSolo(bool newSoloed)
{
    soloed = newSoloed;
    juce::Logger::writeToLog("Bus " + identifier + " soloed: " + juce::String(soloed));
}

void MixerBus::setBypass(bool newBypassed)
{
    bypassed = newBypassed;
    juce::Logger::writeToLog("Bus " + identifier + " bypassed: " + juce::String(bypassed));
}

void MixerBus::addSend(const juce::String& busIdentifier, float sendLevel)
{
    sends[busIdentifier] = sendLevel;
    juce::Logger::writeToLog("Added send from bus " + identifier + " to " + busIdentifier +
                           " level: " + juce::String(sendLevel, 2));
}

void MixerBus::removeSend(const juce::String& busIdentifier)
{
    auto it = sends.find(busIdentifier);
    if (it != sends.end())
    {
        sends.erase(it);
        juce::Logger::writeToLog("Removed send from bus " + identifier + " to " + busIdentifier);
    }
}

float MixerBus::getSendLevel(const juce::String& busIdentifier) const
{
    auto it = sends.find(busIdentifier);
    return (it != sends.end()) ? it->second : 0.0f;
}

float MixerBus::getPeakLevel(int channel) const
{
    if (channel >= 0 && channel < 16)
        return currentState.peakLevel[channel];
    return 0.0f;
}

float MixerBus::getRMSLevel(int channel) const
{
    if (channel >= 0 && channel < 16)
        return currentState.rmsLevel[channel];
    return 0.0f;
}

bool MixerBus::isClipping(int channel) const
{
    if (channel >= 0 && channel < 16)
        return currentState.clipping[channel];
    return false;
}

//==============================================================================
// AudioRoutingEngine Implementation
//==============================================================================

AudioRoutingEngine::AudioRoutingEngine()
{
    // Create master bus
    masterBus = std::make_unique<MixerBus>("master", MixerBus::Type::Master, 2);
    buses["master"] = std::make_unique<MixerBus>(*masterBus);

    // Initialize temporary buffers
    tempBuffers.reserve(16);
    masterBuffer.setSize(2, 512);

    juce::Logger::writeToLog("Audio routing engine initialized");
}

AudioRoutingEngine::~AudioRoutingEngine()
{
    reset();
    juce::Logger::writeToLog("Audio routing engine destroyed");
}

//==============================================================================
// NODE MANAGEMENT
//==============================================================================

bool AudioRoutingEngine::registerInstrument(const juce::String& identifier, std::shared_ptr<InstrumentInstance> instrument)
{
    if (identifier.isEmpty() || !instrument)
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Create node for instrument
    auto node = std::make_unique<AudioNode>();
    node->identifier = identifier;
    node->name = instrument->getName();
    node->type = AudioNode::Type::Instrument;
    node->state = AudioNode::State::Active;

    // Get audio format from instrument
    auto format = instrument->getAudioFormat();
    node->numInputChannels = format.numInputChannels;
    node->numOutputChannels = format.numOutputChannels;
    node->sampleRate = format.sampleRate;
    node->blockSize = format.preferredBlockSize;

    instrumentNodes[identifier] = instrument;
    nodes[identifier] = std::move(node);

    buildProcessingGraph();

    juce::Logger::writeToLog("Registered instrument node: " + identifier);
    return true;
}

bool AudioRoutingEngine::createNode(const juce::String& identifier, AudioNode::Type type, int channels)
{
    if (identifier.isEmpty())
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Check if node already exists
    if (nodes.find(identifier) != nodes.end())
        return false;

    auto node = std::make_unique<AudioNode>();
    node->identifier = identifier;
    node->name = identifier;
    node->type = type;
    node->state = AudioNode::State::Inactive;
    node->numInputChannels = channels;
    node->numOutputChannels = channels;
    node->sampleRate = currentSampleRate;
    node->blockSize = currentBlockSize;

    nodes[identifier] = std::move(node);
    buildProcessingGraph();

    juce::Logger::writeToLog("Created audio node: " + identifier + " (" + juce::String(channels) + " channels)");
    return true;
}

bool AudioRoutingEngine::registerEffectNode(const juce::String& identifier, std::unique_ptr<juce::AudioProcessor> processor)
{
    if (identifier.isEmpty() || !processor)
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Create node for effect
    auto node = std::make_unique<AudioNode>();
    node->identifier = identifier;
    node->name = identifier;
    node->type = AudioNode::Type::Effect;
    node->state = AudioNode::State::Active;
    node->processor = std::move(processor);

    // Configure processor
    if (node->processor)
    {
        node->processor->prepareToPlay(currentSampleRate, currentBlockSize);
        node->numInputChannels = node->processor->getTotalNumInputChannels();
        node->numOutputChannels = node->processor->getTotalNumOutputChannels();
    }

    nodes[identifier] = std::move(node);
    buildProcessingGraph();

    juce::Logger::writeToLog("Registered effect node: " + identifier);
    return true;
}

bool AudioRoutingEngine::removeNode(const juce::String& identifier)
{
    if (identifier.isEmpty())
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Remove all routes connected to this node
    auto routesToRemove = std::vector<juce::String>();
    for (const auto& [routeId, route] : routes)
    {
        if (route->sourceNodeId == identifier || route->destinationNodeId == identifier)
            routesToRemove.push_back(routeId);
    }

    for (const auto& routeId : routesToRemove)
    {
        routes.erase(routeId);
    }

    // Remove node
    nodes.erase(identifier);
    instrumentNodes.erase(identifier);

    buildProcessingGraph();

    juce::Logger::writeToLog("Removed audio node: " + identifier);
    return true;
}

AudioNode* AudioRoutingEngine::getNode(const juce::String& identifier)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = nodes.find(identifier);
    return (it != nodes.end()) ? it->second.get() : nullptr;
}

const AudioNode* AudioRoutingEngine::getNode(const juce::String& identifier) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = nodes.find(identifier);
    return (it != nodes.end()) ? it->second.get() : nullptr;
}

std::vector<AudioNode*> AudioRoutingEngine::getAllNodes()
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<AudioNode*> result;
    result.reserve(nodes.size());

    for (const auto& [id, node] : nodes)
        result.push_back(node.get());

    return result;
}

std::vector<const AudioNode*> AudioRoutingEngine::getAllNodes() const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const AudioNode*> result;
    result.reserve(nodes.size());

    for (const auto& [id, node] : nodes)
        result.push_back(node.get());

    return result;
}

std::vector<AudioNode*> AudioRoutingEngine::getNodesByType(AudioNode::Type type)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<AudioNode*> result;

    for (const auto& [id, node] : nodes)
    {
        if (node->type == type)
            result.push_back(node.get());
    }

    return result;
}

std::vector<const AudioNode*> AudioRoutingEngine::getNodesByType(AudioNode::Type type) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const AudioNode*> result;

    for (const auto& [id, node] : nodes)
    {
        if (node->type == type)
            result.push_back(node.get());
    }

    return result;
}

//==============================================================================
// ROUTING MANAGEMENT
//==============================================================================

juce::String AudioRoutingEngine::createRoute(const juce::String& sourceNode, const juce::String& destNode,
                                            int sourceChannel, int destChannel)
{
    if (sourceNode.isEmpty() || destNode.isEmpty() || sourceNode == destNode)
        return {};

    std::lock_guard<std::mutex> lock(routingMutex);

    // Check if nodes exist
    if (nodes.find(sourceNode) == nodes.end() || nodes.find(destNode) == nodes.end())
        return {};

    // Create unique route identifier
    juce::String routeId = sourceNode + "_to_" + destNode;
    if (sourceChannel >= 0)
        routeId += "_ch" + juce::String(sourceChannel);
    if (destChannel >= 0)
        routeId += "_ch" + juce::String(destChannel);

    // Check if route already exists
    if (routes.find(routeId) != routes.end())
        return routeId;

    // Create route
    auto route = std::make_unique<AudioRoute>();
    route->identifier = routeId;
    route->sourceNodeId = sourceNode;
    route->destinationNodeId = destNode;
    route->sourceChannel = sourceChannel;
    route->destinationChannel = destChannel;

    routes[routeId] = std::move(route);
    buildProcessingGraph();

    juce::Logger::writeToLog("Created audio route: " + routeId);
    return routeId;
}

bool AudioRoutingEngine::removeRoute(const juce::String& routeIdentifier)
{
    if (routeIdentifier.isEmpty())
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = routes.find(routeIdentifier);
    if (it == routes.end())
        return false;

    routes.erase(it);
    buildProcessingGraph();

    juce::Logger::writeToLog("Removed audio route: " + routeIdentifier);
    return true;
}

AudioRoute* AudioRoutingEngine::getRoute(const juce::String& routeIdentifier)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = routes.find(routeIdentifier);
    return (it != routes.end()) ? it->second.get() : nullptr;
}

const AudioRoute* AudioRoutingEngine::getRoute(const juce::String& routeIdentifier) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = routes.find(routeIdentifier);
    return (it != routes.end()) ? it->second.get() : nullptr;
}

std::vector<AudioRoute*> AudioRoutingEngine::getAllRoutes()
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<AudioRoute*> result;
    result.reserve(routes.size());

    for (const auto& [id, route] : routes)
        result.push_back(route.get());

    return result;
}

std::vector<const AudioRoute*> AudioRoutingEngine::getAllRoutes() const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const AudioRoute*> result;
    result.reserve(routes.size());

    for (const auto& [id, route] : routes)
        result.push_back(route.get());

    return result;
}

std::vector<AudioRoute*> AudioRoutingEngine::getRoutesFromNode(const juce::String& sourceNodeId)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<AudioRoute*> result;

    for (const auto& [id, route] : routes)
    {
        if (route->sourceNodeId == sourceNodeId)
            result.push_back(route.get());
    }

    return result;
}

std::vector<const AudioRoute*> AudioRoutingEngine::getRoutesFromNode(const juce::String& sourceNodeId) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const AudioRoute*> result;

    for (const auto& [id, route] : routes)
    {
        if (route->sourceNodeId == sourceNodeId)
            result.push_back(route.get());
    }

    return result;
}

std::vector<AudioRoute*> AudioRoutingEngine::getRoutesToNode(const juce::String& destNodeId)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<AudioRoute*> result;

    for (const auto& [id, route] : routes)
    {
        if (route->destinationNodeId == destNodeId)
            result.push_back(route.get());
    }

    return result;
}

std::vector<const AudioRoute*> AudioRoutingEngine::getRoutesToNode(const juce::String& destNodeId) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const AudioRoute*> result;

    for (const auto& [id, route] : routes)
    {
        if (route->destinationNodeId == destNodeId)
            result.push_back(route.get());
    }

    return result;
}

//==============================================================================
// MIXER BUS MANAGEMENT
//==============================================================================

MixerBus* AudioRoutingEngine::createBus(const juce::String& identifier, MixerBus::Type type, int channels)
{
    if (identifier.isEmpty())
        return nullptr;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Check if bus already exists
    if (buses.find(identifier) != buses.end())
        return nullptr;

    auto bus = std::make_unique<MixerBus>(identifier, type, channels);
    bus->prepareToPlay(currentSampleRate, currentBlockSize);

    MixerBus* busPtr = bus.get();
    buses[identifier] = std::move(bus);

    juce::Logger::writeToLog("Created mixer bus: " + identifier);
    return busPtr;
}

MixerBus* AudioRoutingEngine::getBus(const juce::String& identifier)
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = buses.find(identifier);
    return (it != buses.end()) ? it->second.get() : nullptr;
}

const MixerBus* AudioRoutingEngine::getBus(const juce::String& identifier) const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = buses.find(identifier);
    return (it != buses.end()) ? it->second.get() : nullptr;
}

std::vector<MixerBus*> AudioRoutingEngine::getAllBuses()
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<MixerBus*> result;
    result.reserve(buses.size());

    for (const auto& [id, bus] : buses)
        result.push_back(bus.get());

    return result;
}

std::vector<const MixerBus*> AudioRoutingEngine::getAllBuses() const
{
    std::lock_guard<std::mutex> lock(routingMutex);

    std::vector<const MixerBus*> result;
    result.reserve(buses.size());

    for (const auto& [id, bus] : buses)
        result.push_back(bus.get());

    return result;
}

bool AudioRoutingEngine::removeBus(const juce::String& identifier)
{
    if (identifier.isEmpty())
        return false;

    std::lock_guard<std::mutex> lock(routingMutex);

    auto it = buses.find(identifier);
    if (it == buses.end())
        return false;

    buses.erase(it);

    juce::Logger::writeToLog("Removed mixer bus: " + identifier);
    return true;
}

//==============================================================================
// AUDIO PROCESSING
//==============================================================================

void AudioRoutingEngine::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;
    currentBlockSize = samplesPerBlock;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Prepare all nodes
    for (const auto& [id, node] : nodes)
    {
        if (node->processor)
        {
            node->processor->prepareToPlay(sampleRate, samplesPerBlock);
        }
        node->sampleRate = sampleRate;
        node->blockSize = samplesPerBlock;
    }

    // Prepare all buses
    for (const auto& [id, bus] : buses)
    {
        bus->prepareToPlay(sampleRate, samplesPerBlock);
    }

    // Prepare master buffer
    masterBuffer.setSize(2, samplesPerBlock);

    // Prepare temporary buffers
    tempBuffers.clear();
    for (int i = 0; i < 16; ++i)
    {
        tempBuffers.emplace_back(32, samplesPerBlock); // Max 32 channels
    }

    juce::Logger::writeToLog("Audio routing engine prepared: " +
                           juce::String(sampleRate) + "Hz, " +
                           juce::String(samplesPerBlock) + " samples");
}

void AudioRoutingEngine::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    auto startTime = std::chrono::high_resolution_clock::now();

    std::lock_guard<std::mutex> lock(routingMutex);

    // Clear master buffer
    masterBuffer.clear();

    try
    {
        // Process audio through the routing graph
        processGraph();

        // Mix final output
        mixOutputs(buffer);

        // Update statistics
        updateNodeStates();
        updateBusStates();
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Audio routing error: " + juce::String(e.what()));
        buffer.clear();
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    cachedStats.processingTime = duration.count() / 1000.0;

    processingIteration.fetch_add(1);
}

void AudioRoutingEngine::reset()
{
    std::lock_guard<std::mutex> lock(routingMutex);

    // Reset all nodes
    for (const auto& [id, node] : nodes)
    {
        if (node->processor)
            node->processor->reset();
        node->state = AudioNode::State::Inactive;
    }

    // Reset all buses
    for (const auto& [id, bus] : buses)
    {
        bus->reset();
    }

    // Clear buffers
    masterBuffer.clear();
    for (auto& tempBuffer : tempBuffers)
        tempBuffer.clear();

    juce::Logger::writeToLog("Audio routing engine reset");
}

//==============================================================================
// ROUTING ENGINE CONFIGURATION
//==============================================================================

void AudioRoutingEngine::setAudioConfiguration(double sampleRate, int blockSize)
{
    currentSampleRate = sampleRate;
    currentBlockSize = blockSize;
    prepareToPlay(sampleRate, blockSize);
}

std::pair<double, int> AudioRoutingEngine::getAudioConfiguration() const
{
    return {currentSampleRate, currentBlockSize};
}

//==============================================================================
// MONITORING AND DIAGNOSTICS
//==============================================================================

AudioRoutingEngine::EngineStats AudioRoutingEngine::getStatistics() const
{
    // Update cached stats if needed
    auto now = juce::Time::getCurrentTime();
    if ((now - lastStatsUpdate).inMilliseconds() > 100) // Update every 100ms
    {
        std::lock_guard<std::mutex> lock(routingMutex);

        cachedStats.totalNodes = static_cast<int>(nodes.size());
        cachedStats.totalRoutes = static_cast<int>(routes.size());
        cachedStats.totalBuses = static_cast<int>(buses.size());

        // Count active components
        cachedStats.activeNodes = 0;
        cachedStats.activeRoutes = 0;
        cachedStats.activeBuses = 0;
        cachedStats.totalCpuUsage = 0.0;

        for (const auto& [id, node] : nodes)
        {
            if (node->state == AudioNode::State::Active)
            {
                cachedStats.activeNodes++;
                cachedStats.totalCpuUsage += node->cpuUsage;
            }
        }

        for (const auto& [id, route] : routes)
        {
            if (route->enabled && route->isActive)
                cachedStats.activeRoutes++;
        }

        for (const auto& [id, bus] : buses)
        {
            auto state = bus->getState();
            if (state.activeInputs > 0)
                cachedStats.activeBuses++;
            cachedStats.totalCpuUsage += state.cpuUsage;
        }

        // Calculate averages
        if (cachedStats.activeNodes + cachedStats.activeBuses > 0)
            cachedStats.totalCpuUsage /= (cachedStats.activeNodes + cachedStats.activeBuses);

        lastStatsUpdate = now;
    }

    return cachedStats;
}

juce::String AudioRoutingEngine::getDiagnosticInfo() const
{
    auto stats = getStatistics();

    juce::String info;
    info += "Audio Routing Engine Diagnostics\n";
    info += "==============================\n";
    info += "Sample Rate: " + juce::String(currentSampleRate) + " Hz\n";
    info += "Block Size: " + juce::String(currentBlockSize) + " samples\n";
    info += "Processing Time: " + juce::String(stats.processingTime, 2) + " ms\n";
    info += "Total Nodes: " + juce::String(stats.totalNodes) + "\n";
    info += "Active Nodes: " + juce::String(stats.activeNodes) + "\n";
    info += "Total Routes: " + juce::String(stats.totalRoutes) + "\n";
    info += "Active Routes: " + juce::String(stats.activeRoutes) + "\n";
    info += "Total Buses: " + juce::String(stats.totalBuses) + "\n";
    info += "Active Buses: " + juce::String(stats.activeBuses) + "\n";
    info += "Total CPU Usage: " + juce::String(stats.totalCpuUsage, 1) + "%\n";
    info += "Memory Usage: " + juce::String((int)stats.memoryUsage) + " bytes\n";
    info += "Clipping Detections: " + juce::String(stats.clippingDetections) + "\n";
    info += "Realtime Routing: " + juce::String(realtimeRoutingEnabled ? "Enabled" : "Disabled") + "\n";

    return info;
}

AudioRoutingEngine::ValidationResult AudioRoutingEngine::validateRouting()
{
    ValidationResult result;

    std::lock_guard<std::mutex> lock(routingMutex);

    // Check for orphaned nodes (nodes with no connections)
    for (const auto& [id, node] : nodes)
    {
        bool hasInput = false;
        bool hasOutput = false;

        for (const auto& [routeId, route] : routes)
        {
            if (route->destinationNodeId == id)
                hasInput = true;
            if (route->sourceNodeId == id)
                hasOutput = true;
        }

        if (!hasInput && !hasOutput && node->type == AudioNode::Type::Effect)
        {
            result.orphanedNodes.push_back(id);
            result.warnings.add("Orphaned effect node: " + id);
        }
    }

    // Check for invalid routes
    for (const auto& [routeId, route] : routes)
    {
        validateRoute(*route);
        if (nodes.find(route->sourceNodeId) == nodes.end() ||
            nodes.find(route->destinationNodeId) == nodes.end())
        {
            result.invalidRoutes.push_back(routeId);
            result.errors.add("Invalid route: " + routeId + " (missing node)");
            result.isValid = false;
        }
    }

    // Check for loops
    auto loops = detectLoops();
    if (!loops.empty())
    {
        for (const auto& loop : loops)
        {
            juce::String loopPath;
            for (const auto& nodeId : loop)
                loopPath += nodeId + " -> ";
            loopPath += loop[0];

            result.errors.add("Audio loop detected: " + loopPath);
            result.isValid = false;
        }
    }

    return result;
}

std::vector<std::vector<juce::String>> AudioRoutingEngine::detectLoops() const
{
    std::vector<std::vector<juce::String>> loops;

    // Build adjacency list
    std::unordered_map<juce::String, std::vector<juce::String>> adjacency;
    for (const auto& [routeId, route] : routes)
    {
        adjacency[route->sourceNodeId].push_back(route->destinationNodeId);
    }

    // DFS to detect cycles
    std::unordered_map<juce::String, int> visited;
    std::vector<juce::String> path;

    std::function<bool(const juce::String&)> dfs = [&](const juce::String& node) -> bool
    {
        if (visited[node] == 1) // Currently in recursion stack
        {
            // Found cycle - extract loop
            auto it = std::find(path.begin(), path.end(), node);
            if (it != path.end())
            {
                loops.push_back(std::vector<juce::String>(it, path.end()));
            }
            return true;
        }

        if (visited[node] == 2) // Already processed
            return false;

        visited[node] = 1;
        path.push_back(node);

        for (const auto& neighbor : adjacency[node])
        {
            if (dfs(neighbor))
                return true;
        }

        path.pop_back();
        visited[node] = 2;
        return false;
    };

    for (const auto& [nodeId, node] : nodes)
    {
        if (visited[nodeId] == 0)
        {
            dfs(nodeId);
        }
    }

    return loops;
}

//==============================================================================
// PRIVATE IMPLEMENTATION
//==============================================================================

void AudioRoutingEngine::processNodes()
{
    // Process instrument nodes first
    for (const auto& [id, instrument] : instrumentNodes)
    {
        if (auto node = getNode(id))
        {
            // Get appropriate temporary buffer
            int bufferIndex = 0;
            if (bufferIndex < static_cast<int>(tempBuffers.size()))
            {
                auto& buffer = tempBuffers[bufferIndex];
                buffer.clear();

                juce::MidiBuffer midiBuffer; // Would need to route MIDI here too
                instrument->processBlock(buffer, midiBuffer);

                node->state = AudioNode::State::Active;
            }
        }
    }

    // Process effect nodes
    for (const auto& [id, node] : nodes)
    {
        if (node->type == AudioNode::Type::Effect && node->processor)
        {
            // Process effect through its processor
            if (node->state == AudioNode::State::Active)
            {
                // Get input from routes and process
                // This is simplified - full implementation would handle complex routing
                node->processor->processBlock(masterBuffer, juce::MidiBuffer());
            }
        }
    }
}

void AudioRoutingEngine::processRoutes()
{
    for (const auto& [routeId, route] : routes)
    {
        if (!route->enabled)
            continue;

        auto sourceNode = getNode(route->sourceNodeId);
        auto destNode = getNode(route->destinationNodeId);

        if (!sourceNode || !destNode)
            continue;

        route->isActive = true;

        // Route audio from source to destination
        // This is simplified - full implementation would handle channel mapping and gain
        if (sourceNode->state == AudioNode::State::Active)
        {
            destNode->state = AudioNode::State::Active;
        }
    }
}

void AudioRoutingEngine::processBuses()
{
    for (const auto& [id, bus] : buses)
    {
        // Process each bus
        juce::AudioBuffer<float> busBuffer(bus->getNumChannels(), currentBlockSize);
        busBuffer.clear();

        // Add inputs from connected nodes/routes
        // This is simplified - full implementation would collect inputs properly
        bus->processAudio(busBuffer);
    }
}

void AudioRoutingEngine::mixOutputs(juce::AudioBuffer<float>& finalOutput)
{
    // Ensure final output buffer is the right size
    if (finalOutput.getNumChannels() < 2)
        finalOutput.setSize(2, finalOutput.getNumSamples(), true, false, false);

    finalOutput.clear();

    // Mix from master bus
    if (masterBus)
    {
        // Get audio from all nodes and routes to master
        for (const auto& [id, node] : nodes)
        {
            if (node->state == AudioNode::State::Active)
            {
                // Add node output to master mix
                // This is simplified - full implementation would collect actual audio
            }
        }

        // Process master bus
        masterBus->processAudio(finalOutput);
    }
}

void AudioRoutingEngine::validateRoute(const AudioRoute& route)
{
    // Check if nodes exist
    if (nodes.find(route.sourceNodeId) == nodes.end())
        return;

    if (nodes.find(route.destinationNodeId) == nodes.end())
        return;

    // Validate channel numbers
    auto sourceNode = nodes.at(route.sourceNodeId);
    auto destNode = nodes.at(route.destinationNodeId);

    if (route.sourceChannel >= sourceNode->numOutputChannels)
        return;

    if (route.destinationChannel >= destNode->numInputChannels)
        return;
}

void AudioRoutingEngine::updateNodeStates()
{
    for (const auto& [id, node] : nodes)
    {
        // Update CPU usage, latency, etc.
        // This is simplified - full implementation would track actual performance
        if (node->state == AudioNode::State::Active)
        {
            node->cpuUsage = 5.0; // Example value
            node->latency = 2.0;   // Example value
        }
    }
}

void AudioRoutingEngine::updateBusStates()
{
    // Bus states are updated in the bus processing
}

void AudioRoutingEngine::buildProcessingGraph()
{
    processingGraph.clear();
    processingOrder.clear();

    // Create processing nodes
    for (const auto& [id, node] : nodes)
    {
        auto procNode = std::make_unique<ProcessingNode>();
        procNode->node = node.get();
        processingGraph.push_back(std::move(procNode));
    }

    // Build connections
    for (auto& procNode : processingGraph)
    {
        for (const auto& [routeId, route] : routes)
        {
            if (route->sourceNodeId == procNode->node->identifier)
            {
                // Find destination processing node
                for (auto& destProcNode : processingGraph)
                {
                    if (destProcNode->node->identifier == route->destinationNodeId)
                    {
                        procNode->outputRoutes.push_back(route.get());
                        destProcNode->inputRoutes.push_back(route.get());
                        break;
                    }
                }
            }
        }
    }

    // Determine processing order (topological sort)
    std::unordered_set<ProcessingNode*> visited;
    std::function<void(ProcessingNode*)> visit = [&](ProcessingNode* node)
    {
        if (visited.count(node))
            return;

        // Visit dependencies first
        for (auto* inputRoute : node->inputRoutes)
        {
            for (auto* depNode : processingGraph)
            {
                if (depNode->node->identifier == inputRoute->sourceNodeId)
                {
                    visit(depNode);
                    break;
                }
            }
        }

        visited.insert(node);
        processingOrder.push_back(node);
    };

    for (auto& node : processingGraph)
    {
        if (!visited.count(node))
        {
            visit(node.get());
        }
    }
}

void AudioRoutingEngine::processGraph()
{
    // Process nodes in dependency order
    for (auto* procNode : processingOrder)
    {
        if (!procNode->node || procNode->node->state != AudioNode::State::Active)
            continue;

        // Collect input from input routes
        // Process node
        // Send to output routes
        // This is simplified - full implementation would handle actual audio buffers

        if (procNode->node->processor)
        {
            // Get appropriate buffer and process
            int bufferIndex = 0;
            if (bufferIndex < static_cast<int>(tempBuffers.size()))
            {
                auto& buffer = tempBuffers[bufferIndex];
                procNode->node->processor->processBlock(buffer, juce::MidiBuffer());
            }
        }
    }
}

//==============================================================================
// RoutingUtils Implementation
//==============================================================================

namespace RoutingUtils
{

std::pair<float, float> panToStereoGains(float pan)
{
    // Pan law: -3dB at center
    float panRadians = (pan + 1.0f) * juce::MathConstants<float>::halfPi * 0.5f;
    float leftGain = std::cos(panRadians) * std::sqrt(2.0f) * 0.5f;
    float rightGain = std::sin(panRadians) * std::sqrt(2.0f) * 0.5f;

    return {leftGain, rightGain};
}

float dBToLinear(float dB)
{
    return std::pow(10.0f, dB / 20.0f);
}

float linearToDB(float gain)
{
    return 20.0f * std::log10(std::max(gain, 1e-6f));
}

bool hasRoutingConflicts(const std::vector<AudioRoute*>& routes)
{
    // Check for multiple routes to same destination channel
    std::unordered_map<std::pair<juce::String, int>, int> destinationCounts;

    for (const auto* route : routes)
    {
        if (!route || !route->enabled)
            continue;

        auto destKey = std::make_pair(route->destinationNodeId, route->destinationChannel);
        destinationCounts[destKey]++;

        if (destinationCounts[destKey] > 1)
            return true;
    }

    return false;
}

std::vector<AudioRoute*> optimizeRoutingOrder(const std::vector<AudioRoute*>& routes)
{
    // Sort routes by priority (simplified)
    std::vector<AudioRoute*> sortedRoutes = routes;

    std::sort(sortedRoutes.begin(), sortedRoutes.end(),
              [](const AudioRoute* a, const AudioRoute* b)
              {
                  // Master routes first, then instruments, then effects
                  if (a->destinationNodeId == "master") return true;
                  if (b->destinationNodeId == "master") return false;

                  // Sort by gain (higher gain first)
                  return a->gain > b->gain;
              });

    return sortedRoutes;
}

double calculateRoutingLatency(const std::vector<AudioRoute*>& routes)
{
    double totalLatency = 0.0;

    for (const auto* route : routes)
    {
        if (route && route->enabled)
        {
            // Each route adds approximately 0.1ms latency (simplified)
            totalLatency += 0.1;
        }
    }

    return totalLatency;
}

} // namespace RoutingUtils

} // namespace SchillingerEcosystem::Routing