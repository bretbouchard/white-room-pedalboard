#include "InstrumentManager.h"
#include "InstrumentInstance.h"
#include "PluginManager.h"
#include "../plugins/PluginInstance.h"
#include <juce_core/juce_core.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <algorithm>

namespace SchillingerEcosystem::Instrument {

//==============================================================================
// InstrumentManager Implementation
//==============================================================================

InstrumentManager::InstrumentManager()
{
    // Initialize default audio configuration
    currentSampleRate = 44100.0;
    currentBlockSize = 512;
    poolingEnabled = true;

    // Set up preset directory
    presetDirectory = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory)
                        .getChildFile("SchillingerEcosystem")
                        .getChildFile("Presets");

    // Initialize subsystems
    initializePluginManager();
    initializeBuiltInSynths();
    loadPresetsDatabase();

    // Update initial statistics
    updateStatistics();
}

InstrumentManager::~InstrumentManager()
{
    // Save presets database
    savePresetsDatabase();

    // Clean up all active instances
    std::lock_guard<std::mutex> lock(instrumentMutex);
    activeInstances.clear();
    instruments.clear();
    aiInterfaces.clear();
}

//==============================================================================
// INSTRUMENT REGISTRATION
//==============================================================================

bool InstrumentManager::registerBuiltInSynth(const juce::String& identifier,
                                            std::function<std::unique_ptr<InstrumentInstance>()> factory,
                                            const InstrumentInfo& info)
{
    if (identifier.isEmpty() || !factory)
        return false;

    if (!validateInstrumentInfo(info))
        return false;

    std::lock_guard<std::mutex> lock(instrumentMutex);

    // Check if already registered
    if (instruments.find(identifier) != instruments.end())
    {
        juce::Logger::writeToLog("Instrument already registered: " + identifier);
        return false;
    }

    // Create new entry
    auto entry = std::make_shared<InstrumentEntry>();
    entry->info = info;
    entry->factory = factory;
    entry->isLoaded = true;

    instruments[identifier] = entry;

    juce::Logger::writeToLog("Registered built-in synth: " + identifier);
    updateStatistics();

    return true;
}

InstrumentManager::ScanResults InstrumentManager::scanExternalPlugins(const juce::StringArray& directories)
{
    ScanResults results;

    if (!pluginManager)
    {
        results.errors.add("Plugin manager not initialized");
        return results;
    }

    for (const auto& directory : directories)
    {
        juce::File dir(directory);
        if (!dir.exists() || !dir.isDirectory())
        {
            results.errors.add("Invalid directory: " + directory);
            continue;
        }

        try
        {
            juce::StringArray directories;
            directories.add(directory);
            auto scanResult = pluginManager->scanPlugins(directories);
            results.pluginsFound += scanResult.totalPluginsFound;
            results.pluginsLoaded += scanResult.validPluginsLoaded;
            results.pluginsFailed += scanResult.invalidPluginsSkipped;

            for (const auto& error : scanResult.errors)
                results.errors.add(error);
        }
        catch (const std::exception& e)
        {
            results.errors.add("Exception scanning " + directory + ": " + e.what());
        }
    }

    updateStatistics();
    return results;
}

bool InstrumentManager::loadExternalPlugin(const juce::String& filePath)
{
    if (!pluginManager)
        return false;

    try
    {
        juce::File pluginFile(filePath);
        if (!pluginFile.existsAsFile())
            return false;

        auto pluginInstance = pluginManager->loadPlugin(filePath);
        if (!pluginInstance)
            return false;

        // Create instrument info for the plugin
        InstrumentInfo info;
        info.identifier = pluginFile.getFileNameWithoutExtension();
        auto pluginState = pluginInstance->getPluginState();
        info.name = pluginState.pluginName;
        info.category = "External Plugin";
        info.manufacturer = pluginState.manufacturerName;
        info.version = pluginState.version;
        info.type = InstrumentType::ExternalPlugin;
        info.isInstrument = pluginInstance->acceptsMidi();
        info.supportsMIDI = pluginInstance->acceptsMidi();
        info.hasCustomUI = pluginInstance->hasNativeEditor();
        info.numInputs = 0; // Would need to access underlying plugin
        info.numOutputs = 0; // Would need to access underlying plugin

        // Create factory function for plugin
        auto factory = [this, filePath, identifier = info.identifier]() -> std::unique_ptr<InstrumentInstance> {
            auto plugin = pluginManager->loadPlugin(filePath);
            if (plugin)
            {
                plugin->prepareToPlay(currentSampleRate, currentBlockSize);
                return plugin;  // PluginInstance already inherits from InstrumentInstance
            }
            return nullptr;
        };

        return registerBuiltInSynth(info.identifier, factory, info);
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to load external plugin " + filePath + ": " + e.what());
        return false;
    }
}

//==============================================================================
// INSTRUMENT DISCOVERY
//==============================================================================

std::vector<InstrumentInfo> InstrumentManager::getAvailableInstruments() const
{
    std::lock_guard<std::mutex> lock(instrumentMutex);

    std::vector<InstrumentInfo> result;
    result.reserve(instruments.size());

    for (const auto& [identifier, entry] : instruments)
    {
        if (entry->isLoaded)
            result.push_back(entry->info);
    }

    return result;
}

std::vector<InstrumentInfo> InstrumentManager::getInstrumentsByCategory(const juce::String& category) const
{
    auto allInstruments = getAvailableInstruments();
    std::vector<InstrumentInfo> result;

    std::copy_if(allInstruments.begin(), allInstruments.end(),
                 std::back_inserter(result),
                 [&category](const InstrumentInfo& info) {
                     return info.category.equalsIgnoreCase(category);
                 });

    return result;
}

std::vector<InstrumentInfo> InstrumentManager::getInstrumentsByType(InstrumentType type) const
{
    auto allInstruments = getAvailableInstruments();
    std::vector<InstrumentInfo> result;

    std::copy_if(allInstruments.begin(), allInstruments.end(),
                 std::back_inserter(result),
                 [type](const InstrumentInfo& info) {
                     return info.type == type;
                 });

    return result;
}

std::vector<InstrumentInfo> InstrumentManager::searchInstruments(const juce::String& query) const
{
    auto allInstruments = getAvailableInstruments();
    std::vector<InstrumentInfo> result;

    if (query.isEmpty())
        return result;

    juce::String lowercaseQuery = query.toLowerCase();

    std::copy_if(allInstruments.begin(), allInstruments.end(),
                 std::back_inserter(result),
                 [&lowercaseQuery](const InstrumentInfo& info) {
                     return info.name.toLowerCase().contains(lowercaseQuery) ||
                            info.description.toLowerCase().contains(lowercaseQuery) ||
                            info.manufacturer.toLowerCase().contains(lowercaseQuery) ||
                            std::any_of(info.tags.begin(), info.tags.end(),
                                       [&lowercaseQuery](const juce::String& tag) {
                                           return tag.toLowerCase().contains(lowercaseQuery);
                                       });
                 });

    return result;
}

std::shared_ptr<InstrumentInfo> InstrumentManager::getInstrumentInfo(const juce::String& identifier) const
{
    auto entry = findInstrumentEntry(identifier);
    if (!entry || !entry->isLoaded)
        return nullptr;

    return std::make_shared<InstrumentInfo>(entry->info);
}

//==============================================================================
// INSTANCE MANAGEMENT
//==============================================================================

std::unique_ptr<InstrumentInstance> InstrumentManager::createInstance(const juce::String& identifier)
{
    auto entry = findInstrumentEntry(identifier);
    if (!entry || !entry->isLoaded)
        return nullptr;

    // Check instance limits
    if (entry->maxInstances > 0)
    {
        int activeCount = getInstanceCount(identifier);
        if (activeCount >= entry->maxInstances)
        {
            juce::Logger::writeToLog("Maximum instances reached for: " + identifier);
            return nullptr;
        }
    }

    try
    {
        std::unique_ptr<InstrumentInstance> instance;

        if (entry->factory)
        {
            instance = entry->factory();
        }
        else if (entry->pluginInstance)
        {
            // Create plugin instance using PluginManager
            // TODO: Store plugin file path in InstrumentEntry for proper reloading
            juce::Logger::writeToLog("Cannot create plugin instance - need plugin file path");
        }

        if (instance)
        {
            // Configure instance
            instance->prepareToPlay(currentSampleRate, currentBlockSize);

            // Track instance
            std::lock_guard<std::mutex> lock(instrumentMutex);
            activeInstances.push_back(std::shared_ptr<InstrumentInstance>(instance.get(), [](auto*) {}));
            entry->activeInstances.push_back(std::shared_ptr<InstrumentInstance>(instance.get(), [](auto*) {}));

            totalInstanceCount++;
            juce::Logger::writeToLog("Created instance of: " + identifier);

            return instance;
        }
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to create instance of " + identifier + ": " + e.what());
    }

    return nullptr;
}

std::vector<InstrumentInstance*> InstrumentManager::getActiveInstances() const
{
    std::lock_guard<std::mutex> lock(instrumentMutex);

    std::vector<InstrumentInstance*> result;

    for (const auto& weakInstance : activeInstances)
    {
        if (auto shared = weakInstance.lock())
        {
            result.push_back(shared.get());
        }
    }

    return result;
}

int InstrumentManager::getInstanceCount(const juce::String& identifier) const
{
    auto entry = findInstrumentEntry(identifier);
    if (!entry)
        return 0;

    int count = 0;
    for (auto it = entry->activeInstances.begin(); it != entry->activeInstances.end();)
    {
        if (it->lock())
        {
            ++count;
            ++it;
        }
        else
        {
            it = entry->activeInstances.erase(it);
        }
    }

    return count;
}

bool InstrumentManager::isInstrumentAvailable(const juce::String& identifier) const
{
    auto entry = findInstrumentEntry(identifier);
    return entry && entry->isLoaded;
}

//==============================================================================
// PRESET MANAGEMENT
//==============================================================================

bool InstrumentManager::savePreset(InstrumentInstance* instance,
                                   const juce::String& name,
                                   const juce::String& category)
{
    if (!instance || name.isEmpty())
        return false;

    try
    {
        // Get instrument state
        auto state = instance->getStateInformation();

        // Create preset entry
        PresetEntry preset;
        preset.instrumentIdentifier = instance->getIdentifier();
        preset.name = name;
        preset.category = category;
        preset.data = state;
        preset.createdTime = juce::Time::getCurrentTime();

        // Add to presets
        std::lock_guard<std::mutex> lock(instrumentMutex);
        presets.push_back(preset);

        // Save to file
        auto presetFile = presetDirectory
            .getChildFile(instance->getIdentifier())
            .getChildFile(name + ".preset");

        presetFile.createDirectory();
        presetFile.replaceWithData(preset.data.getData(), preset.data.getSize());

        juce::Logger::writeToLog("Saved preset: " + name + " for " + instance->getIdentifier());
        return true;
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to save preset " + name + ": " + e.what());
        return false;
    }
}

juce::MemoryBlock InstrumentManager::loadPreset(const juce::String& identifier,
                                                const juce::String& presetName)
{
    auto presetFile = presetDirectory
        .getChildFile(identifier)
        .getChildFile(presetName + ".preset");

    if (!presetFile.existsAsFile())
        return juce::MemoryBlock();

    juce::MemoryBlock data;
    presetFile.loadFileAsData(data);

    return data;
}

juce::StringArray InstrumentManager::getAvailablePresets(const juce::String& identifier) const
{
    juce::StringArray result;

    auto instrumentDir = presetDirectory.getChildFile(identifier);
    if (!instrumentDir.exists() || !instrumentDir.isDirectory())
        return result;

    for (const auto& file : instrumentDir.findChildFiles(juce::File::findFiles, false, "*.preset"))
    {
        result.add(file.getFileNameWithoutExtension());
    }

    return result;
}

//==============================================================================
// AI AGENT INTEGRATION
//==============================================================================

bool InstrumentManager::registerWithAIAgent(const juce::String& identifier, const juce::String& agentName)
{
    if (!isInstrumentAvailable(identifier))
        return false;

    std::lock_guard<std::mutex> lock(instrumentMutex);

    auto interface = std::make_unique<AIAgentInterface>(identifier, *this);
    aiInterfaces[identifier] = std::move(interface);

    juce::Logger::writeToLog("Registered " + identifier + " with AI agent: " + agentName);
    return true;
}

AIAgentInterface* InstrumentManager::getAIAgentInterface(const juce::String& identifier)
{
    std::lock_guard<std::mutex> lock(instrumentMutex);

    auto it = aiInterfaces.find(identifier);
    return (it != aiInterfaces.end()) ? it->second.get() : nullptr;
}

//==============================================================================
// CONFIGURATION AND SETTINGS
//==============================================================================

void InstrumentManager::setAudioConfiguration(double sampleRate, int blockSize)
{
    currentSampleRate = sampleRate;
    currentBlockSize = blockSize;

    // Update all active instances
    for (auto* instance : getActiveInstances())
    {
        instance->prepareToPlay(sampleRate, blockSize);
    }
}

std::pair<double, int> InstrumentManager::getAudioConfiguration() const
{
    return {currentSampleRate, currentBlockSize};
}

void InstrumentManager::setMaxInstances(const juce::String& identifier, int maxInstances)
{
    auto entry = findInstrumentEntry(identifier);
    if (entry)
    {
        entry->maxInstances = maxInstances;
        juce::Logger::writeToLog("Set max instances for " + identifier + ": " + juce::String(maxInstances));
    }
}

void InstrumentManager::setInstrumentPoolingEnabled(bool enabled)
{
    poolingEnabled = enabled;
    juce::Logger::writeToLog("Instrument pooling: " + juce::String(enabled ? "enabled" : "disabled"));
}

//==============================================================================
// MONITORING AND DIAGNOSTICS
//==============================================================================

InstrumentManager::ManagerStats InstrumentManager::getStatistics() const
{
    // Update if cache is stale (more than 1 second old)
    auto now = juce::Time::getCurrentTime();
    if ((now - lastStatsUpdate).inMilliseconds() > 1000)
    {
        updateStatistics();
    }

    return cachedStats;
}

juce::String InstrumentManager::getDiagnosticInfo() const
{
    auto stats = getStatistics();

    juce::String json;
    json += "{\n";
    json += "  \"totalInstruments\": " + juce::String(stats.totalInstruments) + ",\n";
    json += "  \"builtinSynths\": " + juce::String(stats.builtinSynths) + ",\n";
    json += "  \"externalPlugins\": " + juce::String(stats.externalPlugins) + ",\n";
    json += "  \"activeInstances\": " + juce::String(stats.activeInstances) + ",\n";
    json += "  \"pooledInstances\": " + juce::String(stats.pooledInstances) + ",\n";
    json += "  \"cpuUsage\": " + juce::String(stats.cpuUsage, 2) + ",\n";
    json += "  \"memoryUsage\": " + juce::String((int)stats.memoryUsage) + ",\n";
    json += "  \"loadedPresets\": " + juce::String(stats.loadedPresets) + ",\n";
    json += "  \"sampleRate\": " + juce::String(currentSampleRate) + ",\n";
    json += "  \"blockSize\": " + juce::String(currentBlockSize) + ",\n";
    json += "  \"poolingEnabled\": " + juce::String(poolingEnabled ? "true" : "false") + "\n";
    json += "}";

    return json;
}

InstrumentManager::ValidationResult InstrumentManager::validateAllInstruments()
{
    ValidationResult result;

    std::lock_guard<std::mutex> lock(instrumentMutex);

    for (const auto& [identifier, entry] : instruments)
    {
        if (!entry->isLoaded)
        {
            result.errors.add("Instrument not loaded: " + identifier);
            result.failedInstruments.push_back(identifier);
            result.isValid = false;
            continue;
        }

        // Validate instrument info
        if (!validateInstrumentInfo(entry->info))
        {
            result.errors.add("Invalid instrument info: " + identifier);
            result.failedInstruments.push_back(identifier);
            result.isValid = false;
        }

        // Test factory function
        if (entry->factory)
        {
            try
            {
                auto testInstance = entry->factory();
                if (!testInstance)
                {
                    result.errors.add("Factory function returned null: " + identifier);
                    result.failedInstruments.push_back(identifier);
                    result.isValid = false;
                }
            }
            catch (const std::exception& e)
            {
                result.errors.add("Factory function exception for " + identifier + ": " + e.what());
                result.failedInstruments.push_back(identifier);
                result.isValid = false;
            }
        }
    }

    return result;
}

//==============================================================================
// INTERNAL METHODS
//==============================================================================

void InstrumentManager::initializeBuiltInSynths()
{
    // This will be implemented when we create the integration files
    // For now, just log that we're initializing
    juce::Logger::writeToLog("Initializing built-in synthesizers...");

    // TODO: Register NEX FM, Sam Sampler, and LOCAL GAL when integration files are ready
}

void InstrumentManager::initializePluginManager()
{
    try
    {
        pluginManager = std::make_unique<PluginManager>();
        juce::Logger::writeToLog("Plugin manager initialized");
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to initialize plugin manager: " + juce::String(e.what()));
    }
}

void InstrumentManager::loadPresetsDatabase()
{
    if (!presetDirectory.exists())
    {
        presetDirectory.createDirectory();
        return;
    }

    // Load preset metadata from JSON file
    auto presetDbFile = presetDirectory.getChildFile("presets.json");
    if (presetDbFile.existsAsFile())
    {
        try
        {
            auto json = juce::JSON::parse(presetDbFile);
            // TODO: Parse JSON and populate presets vector
        }
        catch (const std::exception& e)
        {
            juce::Logger::writeToLog("Failed to load presets database: " + juce::String(e.what()));
        }
    }
}

void InstrumentManager::savePresetsDatabase()
{
    try
    {
        juce::DynamicObject::Ptr json = new juce::DynamicObject();
        juce::Array<juce::var> presetArray;

        for (const auto& preset : presets)
        {
            juce::DynamicObject::Ptr presetObj = new juce::DynamicObject();
            presetObj->setProperty("instrument", preset.instrumentIdentifier);
            presetObj->setProperty("name", preset.name);
            presetObj->setProperty("category", preset.category);
            presetObj->setProperty("createdTime", preset.createdTime.toMilliseconds());

            presetArray.add(presetObj.get());
        }

        json->setProperty("presets", presetArray);

        auto presetDbFile = presetDirectory.getChildFile("presets.json");
        presetDbFile.deleteFile();
        presetDbFile.create();
        presetDbFile.appendText(juce::JSON::toString(juce::var(json.get())));
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Failed to save presets database: " + juce::String(e.what()));
    }
}

bool InstrumentManager::createPluginInstance(const juce::String& identifier,
                                           std::unique_ptr<juce::AudioPluginInstance>& instance)
{
    // TODO: This function needs to be refactored to work with the new PluginInstance architecture
    // The proper way to create plugin instances is through createInstance() which returns InstrumentInstance*
    // This function is trying to return raw juce::AudioPluginInstance, but our architecture wraps everything
    juce::Logger::writeToLog("createPluginInstance() needs refactoring for new PluginInstance architecture");
    return false;
}

void InstrumentManager::cleanupStaleInstances()
{
    std::lock_guard<std::mutex> lock(instrumentMutex);

    // Clean up global active instances
    for (auto it = activeInstances.begin(); it != activeInstances.end();)
    {
        if (it->expired())
        {
            it = activeInstances.erase(it);
            totalInstanceCount--;
        }
        else
        {
            ++it;
        }
    }

    // Clean up instrument-specific instances
    for (auto& [identifier, entry] : instruments)
    {
        for (auto it = entry->activeInstances.begin(); it != entry->activeInstances.end();)
        {
            if (it->expired())
            {
                it = entry->activeInstances.erase(it);
            }
            else
            {
                ++it;
            }
        }
    }
}

void InstrumentManager::updateStatistics() const
{
    std::lock_guard<std::mutex> lock(instrumentMutex);

    cachedStats.totalInstruments = 0;
    cachedStats.builtinSynths = 0;
    cachedStats.externalPlugins = 0;
    cachedStats.activeInstances = 0;
    cachedStats.pooledInstances = 0;
    cachedStats.loadedPresets = presets.size();

    for (const auto& [identifier, entry] : instruments)
    {
        if (!entry->isLoaded)
            continue;

        cachedStats.totalInstruments++;

        if (entry->info.type == InstrumentType::BuiltInSynthesizer)
            cachedStats.builtinSynths++;
        else
            cachedStats.externalPlugins++;

        // Count active instances
        int activeCount = 0;
        for (auto it = entry->activeInstances.begin(); it != entry->activeInstances.end();)
        {
            if (it->lock())
            {
                activeCount++;
                ++it;
            }
            else
            {
                it = entry->activeInstances.erase(it);
            }
        }

        cachedStats.activeInstances += activeCount;
    }

    // Calculate CPU usage and memory usage (simplified)
    cachedStats.cpuUsage = 0.0; // TODO: Implement actual CPU measurement
    cachedStats.memoryUsage = 0; // TODO: Implement actual memory measurement

    lastStatsUpdate = juce::Time::getCurrentTime();
}

std::shared_ptr<InstrumentManager::InstrumentEntry> InstrumentManager::findInstrumentEntry(const juce::String& identifier) const
{
    auto it = instruments.find(identifier);
    return (it != instruments.end()) ? it->second : nullptr;
}

bool InstrumentManager::validateInstrumentInfo(const InstrumentInfo& info) const
{
    return !info.identifier.isEmpty() &&
           !info.name.isEmpty() &&
           info.numInputs >= 0 &&
           info.numOutputs >= 0 &&
           info.sampleRate > 0.0 &&
           info.blockSize > 0;
}

//==============================================================================
// AIAgentInterface Implementation
//==============================================================================

AIAgentInterface::AIAgentInterface(const juce::String& instrumentId,
                                                      InstrumentManager& mgr)
    : instrumentIdentifier(instrumentId), manager(mgr)
{
}

AIAgentInterface::~AIAgentInterface() = default;

std::vector<AIAgentInterface::ParameterInfo>
AIAgentInterface::getAllParameters() const
{
    std::lock_guard<std::mutex> lock(controlMutex);

    std::vector<ParameterInfo> parameters;

    // Get all active instances of this instrument
    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            auto instanceParams = instance->getAllParameters();
            for (const auto& param : instanceParams)
            {
                ParameterInfo info;
                info.address = param.address;
                info.name = param.name;
                info.minValue = param.minValue;
                info.maxValue = param.maxValue;
                info.defaultValue = param.defaultValue;
                info.isAutomatable = param.isAutomatable;
                info.unit = param.unit;

                parameters.push_back(info);
            }
            break; // Found our instrument
        }
    }

    return parameters;
}

float AIAgentInterface::getParameter(const juce::String& address) const
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            return instance->getParameterValue(address);
        }
    }

    return 0.0f;
}

bool AIAgentInterface::setParameter(const juce::String& address, float value)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    bool success = false;
    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->setParameterValue(address, value);
            success = true;
        }
    }

    return success;
}

bool AIAgentInterface::setParameterSmooth(const juce::String& address,
                                                              float value, double timeMs)
{
    // TODO: Implement smooth parameter interpolation
    return setParameter(address, value);
}

void AIAgentInterface::noteOn(int midiNote, float velocity, int channel)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->noteOn(midiNote, velocity, channel);
        }
    }
}

void AIAgentInterface::noteOff(int midiNote, float velocity, int channel)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->noteOff(midiNote, velocity, channel);
        }
    }
}

void AIAgentInterface::allNotesOff(int channel)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->allNotesOff(channel);
        }
    }
}

void AIAgentInterface::pitchBend(float value, int channel)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->pitchBend(value, channel);
        }
    }
}

void AIAgentInterface::controlChange(int controller, float value, int channel)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            instance->controlChange(controller, value, channel);
        }
    }
}

bool AIAgentInterface::loadPreset(const juce::String& presetName)
{
    auto presetData = manager.loadPreset(instrumentIdentifier, presetName);
    if (presetData.isEmpty())
        return false;

    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            // Try to set state if it's a PluginInstance
            if (auto* pluginInstance = dynamic_cast<SchillingerEcosystem::Plugins::PluginInstance*>(instance))
            {
                pluginInstance->setState(presetData);
                return true;
            }
            break;
        }
    }

    return false;
}

bool AIAgentInterface::savePreset(const juce::String& presetName, const juce::String& category)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            return manager.savePreset(instance, presetName, category);
        }
    }

    return false;
}

juce::StringArray AIAgentInterface::getPresets() const
{
    return manager.getAvailablePresets(instrumentIdentifier);
}

juce::MemoryBlock AIAgentInterface::getCurrentState() const
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            return instance->getStateInformation();
        }
    }

    return juce::MemoryBlock();
}

bool AIAgentInterface::setState(const juce::MemoryBlock& state)
{
    std::lock_guard<std::mutex> lock(controlMutex);

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            // Try to set state if it's a PluginInstance
            if (auto* pluginInstance = dynamic_cast<SchillingerEcosystem::Plugins::PluginInstance*>(instance))
            {
                pluginInstance->setState(state);
                return true;
            }
            break;
        }
    }

    return false;
}

AIAgentInterface::AudioAnalysis AIAgentInterface::analyzeAudio() const
{
    std::lock_guard<std::mutex> lock(controlMutex);

    AudioAnalysis analysis;

    // TODO: Implement audio analysis for instruments
    // This requires real-time audio analysis which is not yet implemented
    analysis.hasActivity = false;

    return analysis;
}

AIAgentInterface::PerformanceInfo AIAgentInterface::getPerformanceInfo() const
{
    std::lock_guard<std::mutex> lock(controlMutex);

    PerformanceInfo info;

    auto instances = manager.getActiveInstances();
    for (auto* instance : instances)
    {
        if (instance->getIdentifier() == instrumentIdentifier)
        {
            auto instanceStats = instance->getPerformanceStats();
            info.cpuUsage = instanceStats.cpuUsagePercent;
            info.activeVoices = instanceStats.activeVoices;
            info.voiceCount = instanceStats.maxVoices;
            info.averageProcessingTime = instanceStats.averageProcessingTime;
            break;
        }
    }

    return info;
}

} // namespace SchillingerEcosystem::Instrument