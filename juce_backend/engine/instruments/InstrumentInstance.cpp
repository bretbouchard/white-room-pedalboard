#include "InstrumentInstance.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <algorithm>
#include <chrono>

namespace SchillingerEcosystem::Instrument {

//==============================================================================
// InstrumentInstance Base Implementation
//==============================================================================

InstrumentInstance::InstrumentInstance(const juce::String& identifier, const juce::String& name)
    : identifier(identifier), name(name)
{
    juce::Logger::writeToLog("Created instrument instance: " + identifier + " (" + name + ")");
}

void InstrumentInstance::processAudioOnly(juce::AudioBuffer<float>& buffer)
{
    juce::MidiBuffer emptyMidi;
    processBlock(buffer, emptyMidi);
}

void InstrumentInstance::noteOn(int midiNote, float velocity, int channel)
{
    if (midiNote < 0 || midiNote > 127 || velocity < 0.0f || velocity > 1.0f)
        return;

    if (channel < 0 || channel > 15)
        channel = 0;

    // This will be implemented by derived classes
    // Base implementation does nothing
    if (debugMode)
    {
        juce::Logger::writeToLog("Note ON: " + juce::String(midiNote) +
                               " vel: " + juce::String(velocity, 2) +
                               " ch: " + juce::String(channel));
    }
}

void InstrumentInstance::noteOff(int midiNote, float velocity, int channel)
{
    if (midiNote < 0 || midiNote > 127 || velocity < 0.0f || velocity > 1.0f)
        return;

    if (channel < 0 || channel > 15)
        channel = 0;

    if (debugMode)
    {
        juce::Logger::writeToLog("Note OFF: " + juce::String(midiNote) +
                               " vel: " + juce::String(velocity, 2) +
                               " ch: " + juce::String(channel));
    }
}

void InstrumentInstance::allNotesOff(int channel)
{
    if (debugMode)
    {
        juce::Logger::writeToLog("All Notes OFF" +
                               ((channel >= 0 && channel <= 15) ? " ch: " + juce::String(channel) : " all channels"));
    }
}

void InstrumentInstance::pitchBend(float value, int channel)
{
    if (value < -1.0f || value > 1.0f)
        value = juce::jlimit(-1.0f, 1.0f, value);

    if (channel < 0 || channel > 15)
        channel = 0;

    if (debugMode)
    {
        juce::Logger::writeToLog("Pitch Bend: " + juce::String(value, 3) + " ch: " + juce::String(channel));
    }
}

void InstrumentInstance::controlChange(int controller, float value, int channel)
{
    if (controller < 0 || controller > 127)
        return;

    if (value < 0.0f || value > 1.0f)
        value = juce::jlimit(0.0f, 1.0f, value);

    if (channel < 0 || channel > 15)
        channel = 0;

    if (debugMode)
    {
        juce::Logger::writeToLog("CC " + juce::String(controller) +
                               ": " + juce::String(value, 2) + " ch: " + juce::String(channel));
    }
}

void InstrumentInstance::setParameterSmooth(const juce::String& address, float targetValue, double timeMs)
{
    std::lock_guard<std::mutex> lock(smoothingMutex);

    auto& target = smoothingTargets[address];
    target.address = address;
    target.targetValue = targetValue;
    target.smoothingTime = timeMs;
    target.currentTime = 0.0;
    target.isActive = true;

    // Get current value as starting point
    target.currentValue = getParameterValue(address);
}

std::unordered_map<juce::String, float> InstrumentInstance::getAllParameterValues() const
{
    std::unordered_map<juce::String, float> parameters;

    auto allParams = getAllParameters();
    for (const auto& param : allParams)
    {
        parameters[param.address] = param.currentValue;
    }

    return parameters;
}

void InstrumentInstance::setParameters(const std::unordered_map<juce::String, float>& parameters)
{
    for (const auto& [address, value] : parameters)
    {
        setParameterValue(address, value);
    }
}

InstrumentInstance::PerformanceStats InstrumentInstance::getPerformanceStats() const
{
    PerformanceStats stats;
    stats.cpuUsagePercent = 0.0; // Would need actual CPU measurement
    stats.activeVoices = activeVoiceCount.load();
    stats.maxVoices = 0; // To be implemented by derived classes
    stats.averageProcessingTime = processingTime.load();
    stats.bufferUnderruns = bufferUnderrunCount.load();
    stats.audioLatency = 0.0; // Would need actual latency measurement
    stats.memoryUsage = 0; // Would need actual memory measurement
    stats.midiMessagesProcessed = midiMessageCount.load();

    return stats;
}

void InstrumentInstance::resetPerformanceStats()
{
    activeVoiceCount.store(0);
    processingTime.store(0.0);
    bufferUnderrunCount.store(0);
    midiMessageCount.store(0);
}

juce::String InstrumentInstance::getDiagnosticInfo() const
{
    auto stats = getPerformanceStats();

    juce::String info;
    info += "Instrument: " + name + " (" + identifier + ")\n";
    info += "Type: " + getType() + "\n";
    info += "Version: " + getVersion() + "\n";
    info += "Initialized: " + juce::String(initialized ? "Yes" : "No") + "\n";
    info += "Active Voices: " + juce::String(stats.activeVoices) + "\n";
    info += "Processing Time: " + juce::String(stats.averageProcessingTime, 2) + "ms\n";
    info += "Buffer Underruns: " + juce::String(stats.bufferUnderruns) + "\n";
    info += "MIDI Messages: " + juce::String(stats.midiMessagesProcessed) + "\n";

    return info;
}

bool InstrumentInstance::validateState() const
{
    // Basic validation
    if (identifier.isEmpty() || name.isEmpty())
        return false;

    // Check if we have any parameters
    auto params = getAllParameters();
    if (params.empty())
        return false; // All instruments should have at least some parameters

    return initialized.load();
}

//==============================================================================
// PROTECTED IMPLEMENTATION
//==============================================================================

void InstrumentInstance::updateParameterSmoothing(double deltaTime)
{
    std::lock_guard<std::mutex> lock(smoothingMutex);

    for (auto& [address, target] : smoothingTargets)
    {
        if (!target.isActive)
            continue;

        target.currentTime += deltaTime;

        if (target.currentTime >= target.smoothingTime)
        {
            // Smoothing complete
            setParameterValue(address, target.targetValue);
            target.isActive = false;
        }
        else
        {
            // Interpolate value
            float smoothValue = smoothParameterValue(target, deltaTime);
            setParameterValue(address, smoothValue);
            target.currentValue = smoothValue;
        }
    }

    // Remove inactive targets
    for (auto it = smoothingTargets.begin(); it != smoothingTargets.end();)
    {
        if (!it->second.isActive)
            it = smoothingTargets.erase(it);
        else
            ++it;
    }
}

void InstrumentInstance::addMidiMessage(juce::MidiBuffer& buffer, const juce::MidiMessage& message)
{
    buffer.addEvent(message, 0);
    midiMessageCount.fetch_add(1);
}

void InstrumentInstance::updatePerformanceStats(double processingTimeMs, int voicesActive, int midiMessages)
{
    // Update running average for processing time
    double currentAvg = processingTime.load();
    double newAvg = (currentAvg * 0.9) + (processingTimeMs * 0.1); // Exponential moving average
    processingTime.store(newAvg);

    activeVoiceCount.store(voicesActive);

    if (processingTimeMs > 10.0) // Consider > 10ms as potential underrun
        bufferUnderrunCount.fetch_add(1);
}

float InstrumentInstance::linearInterpolate(float start, float end, float position) const
{
    position = juce::jlimit(0.0f, 1.0f, position);
    return start + (end - start) * position;
}

float InstrumentInstance::smoothParameterValue(const SmoothingTarget& target, double deltaTime) const
{
    if (target.smoothingTime <= 0.0)
        return target.targetValue;

    float progress = (float)(target.currentTime / target.smoothingTime);
    progress = juce::jlimit(0.0f, 1.0f, progress);

    // Use exponential smoothing for more natural parameter changes
    float smoothedProgress = 1.0f - std::exp(-3.0f * progress);

    return linearInterpolate(target.currentValue, target.targetValue, smoothedProgress);
}

//==============================================================================
// PluginInstrumentInstance Implementation
//==============================================================================

PluginInstrumentInstance::PluginInstrumentInstance(const juce::String& identifier,
                                                   std::unique_ptr<juce::AudioPluginInstance> plugin,
                                                   const juce::String& name)
    : InstrumentInstance(identifier, name.isEmpty() ? identifier : name)
    , plugin(std::move(plugin))
{
    if (this->plugin)
    {
        auto desc = this->plugin->getPluginDescription();
        pluginType = desc.pluginFormatName;
        buildParameterMaps();

        juce::Logger::writeToLog("Created plugin instance: " + desc.name +
                               " (" + desc.pluginFormatName + ")");
    }
}

bool PluginInstrumentInstance::initialize(double sampleRate, int bufferSize)
{
    if (!plugin)
        return false;

    try
    {
        plugin->prepareToPlay(sampleRate, bufferSize);
        initialized.store(true);

        juce::Logger::writeToLog("Initialized plugin: " + plugin->getName());
        return true;
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to initialize plugin: " + juce::String(e.what()));
        return false;
    }
}

void PluginInstrumentInstance::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    if (plugin)
    {
        plugin->prepareToPlay(sampleRate, samplesPerBlock);
    }
}

void PluginInstrumentInstance::releaseResources()
{
    if (plugin)
    {
        plugin->releaseResources();
    }
}

void PluginInstrumentInstance::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    if (!plugin || !initialized.load())
    {
        buffer.clear();
        return;
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    try
    {
        // Update parameter smoothing
        double deltaTime = buffer.getNumSamples() / plugin->getSampleRate();
        updateParameterSmoothing(deltaTime);

        // Process audio through plugin
        plugin->processBlock(buffer, midiMessages);

        // Update performance stats
        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
        double processingTimeMs = duration.count() / 1000.0;

        // Count active voices (simplified - plugins don't always expose voice count)
        int voicesActive = 0; // Could be estimated from MIDI activity

        updatePerformanceStats(processingTimeMs, voicesActive, midiMessages.getNumEvents());
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Plugin processing error: " + juce::String(e.what()));
        buffer.clear();
        bufferUnderrunCount.fetch_add(1);
    }
}

int PluginInstrumentInstance::getLatencySamples() const
{
    return plugin ? plugin->getLatencySamples() : 0;
}

double PluginInstrumentInstance::getTailLengthSeconds() const
{
    return plugin ? plugin->getTailLengthSeconds() : 0.0;
}

bool PluginInstrumentInstance::acceptsMidi() const
{
    return plugin ? plugin->acceptsMidi() : false;
}

bool PluginInstrumentInstance::producesMidi() const
{
    return plugin ? plugin->producesMidi() : false;
}

std::vector<InstrumentInstance::ParameterInfo> PluginInstrumentInstance::getAllParameters() const
{
    std::vector<ParameterInfo> parameters;

    if (!plugin)
        return parameters;

    for (int i = 0; i < plugin->getNumParameters(); ++i)
    {
        ParameterInfo info;
        info.address = getParameterAddress(i);
        info.name = plugin->getParameterName(i);
        info.category = "Plugin Parameter";
        info.minValue = 0.0f;
        info.maxValue = 1.0f;
        info.defaultValue = plugin->getParameterDefaultValue(i);
        info.currentValue = plugin->getParameter(i);
        info.isAutomatable = plugin->isParameterAutomatable(i);
        info.isDiscrete = false; // Most VST parameters are continuous
        info.numSteps = 0;
        info.unit = ""; // Plugin may not provide unit info
        info.description = "Plugin parameter " + juce::String(i);

        parameters.push_back(info);
    }

    return parameters;
}

const InstrumentInstance::ParameterInfo* PluginInstrumentInstance::getParameterInfo(const juce::String& address) const
{
    auto allParams = getAllParameters();
    for (const auto& param : allParams)
    {
        if (param.address == address)
            return &param;
    }
    return nullptr;
}

float PluginInstrumentInstance::getParameterValue(const juce::String& address) const
{
    if (!plugin)
        return 0.0f;

    int index = getParameterIndex(address);
    if (index >= 0 && index < plugin->getNumParameters())
        return plugin->getParameter(index);

    return 0.0f;
}

void PluginInstrumentInstance::setParameterValue(const juce::String& address, float value)
{
    if (!plugin)
        return;

    int index = getParameterIndex(address);
    if (index >= 0 && index < plugin->getNumParameters())
    {
        plugin->setParameter(index, juce::jlimit(0.0f, 1.0f, value));
    }
}

juce::MemoryBlock PluginInstrumentInstance::getStateInformation() const
{
    juce::MemoryBlock data;
    if (plugin)
    {
        plugin->getStateInformation(data);
    }
    return data;
}

void PluginInstrumentInstance::setStateInformation(const void* data, int sizeInBytes)
{
    if (plugin)
    {
        plugin->setStateInformation(data, sizeInBytes);
    }
}

bool PluginInstrumentInstance::loadPreset(const juce::MemoryBlock& presetData)
{
    if (!plugin || presetData.isEmpty())
        return false;

    try
    {
        setStateInformation(presetData.getData(), presetData.getSize());
        return true;
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to load plugin preset: " + juce::String(e.what()));
        return false;
    }
}

juce::MemoryBlock PluginInstrumentInstance::savePreset(const juce::String& name) const
{
    return getStateInformation();
}

bool PluginInstrumentInstance::hasCustomUI() const
{
    return plugin ? plugin->hasEditor() : false;
}

juce::String PluginInstrumentInstance::getCustomUIClassName() const
{
    if (!plugin)
        return "";

    auto desc = plugin->getPluginDescription();
    return desc.name + "Editor";
}

std::unique_ptr<juce::Component> PluginInstrumentInstance::createCustomUI()
{
    if (!plugin || !plugin->hasEditor())
        return nullptr;

    try
    {
        if (auto editor = plugin->createEditor())
        {
            // Transfer ownership to unique_ptr
            return std::unique_ptr<juce::Component>(editor);
        }
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to create plugin editor: " + juce::String(e.what()));
    }

    return nullptr;
}

juce::String PluginInstrumentInstance::getType() const
{
    if (!plugin)
        return "Unknown Plugin";

    return pluginType;
}

juce::String PluginInstrumentInstance::getVersion() const
{
    if (!plugin)
        return "Unknown";

    auto desc = plugin->getPluginDescription();
    return desc.version;
}

InstrumentInstance::AudioFormat PluginInstrumentInstance::getAudioFormat() const
{
    AudioFormat format;

    if (plugin)
    {
        format.numInputChannels = plugin->getTotalNumInputChannels();
        format.numOutputChannels = plugin->getTotalNumOutputChannels();
        format.sampleRate = plugin->getSampleRate();
        format.preferredBlockSize = plugin->getBlockSize();
        format.supportsDoublePrecision = plugin->supportsDoublePrecisionProcessing();
    }

    return format;
}

//==============================================================================
// PRIVATE PLUGIN IMPLEMENTATION
//==============================================================================

void PluginInstrumentInstance::buildParameterMaps()
{
    if (!plugin)
        return;

    parameterIndexToAddress.clear();
    addressToParameterIndex.clear();

    for (int i = 0; i < plugin->getNumParameters(); ++i)
    {
        juce::String address = "param_" + juce::String(i);
        juce::String name = plugin->getParameterName(i);

        // Use parameter name if available, otherwise use index
        if (!name.isEmpty())
            address = name.toLowerCase().replaceCharacters(" ", "_");

        parameterIndexToAddress[i] = address;
        addressToParameterIndex[address] = i;
    }
}

int PluginInstrumentInstance::getParameterIndex(const juce::String& address) const
{
    auto it = addressToParameterIndex.find(address);
    if (it != addressToParameterIndex.end())
        return it->second;

    // Try to parse as direct index (param_0, param_1, etc.)
    if (address.startsWith("param_"))
    {
        int index = address.substring(5).getIntValue();
        if (index >= 0 && index < plugin->getNumParameters())
            return index;
    }

    return -1;
}

juce::String PluginInstrumentInstance::getParameterAddress(int index) const
{
    auto it = parameterIndexToAddress.find(index);
    if (it != parameterIndexToAddress.end())
        return it->second;

    return "param_" + juce::String(index);
}

} // namespace SchillingerEcosystem::Instrument