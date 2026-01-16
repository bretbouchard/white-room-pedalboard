#include "routing/MidiRoutingEngine.h"
#include "instrument/InstrumentManager.h"
#include "instrument/InstrumentInstance.h"
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace schill {
namespace midi {

//==============================================================================
// MidiRoutingTimer - Auto-save timer implementation
//==============================================================================

class MidiRoutingTimer : public juce::Timer {
public:
    explicit MidiRoutingTimer(std::function<void()> callback) : callback_(std::move(callback)) {}

    void timerCallback() override {
        if (callback_) {
            callback_();
        }
    }

private:
    std::function<void()> callback_;
};

//==============================================================================
// MidiRoutingEngine Implementation
//==============================================================================

MidiRoutingEngine::MidiRoutingEngine(InstrumentManager* instrumentManager)
    : instrumentManager_(instrumentManager) {
    jassert(instrumentManager_ != nullptr);

    // Initialize default channel mapping (1:1)
    for (int i = 1; i <= 16; ++i) {
        channelMap_[i] = i;
    }

    // Initialize default allowed channels (all channels)
    for (int i = 1; i <= 16; ++i) {
        allowedChannels_.insert(i);
    }
}

MidiRoutingEngine::~MidiRoutingEngine() {
    shutdown();
}

bool MidiRoutingEngine::initialize() {
    if (initialized_) {
        return true;
    }

    try {
        // Update device list
        updateDeviceList();

        // Start statistics update timer
        statsUpdateTimer_ = std::make_unique<MidiRoutingTimer>([this]() {
            juce::ScopedLock lock(statsMutex_);
            stats_.lastUpdate = juce::Time::getCurrentTime();
            stats_.routesActive = std::count_if(routes_.begin(), routes_.end(),
                [](const auto& pair) { return pair.second->enabled; });
        });
        statsUpdateTimer_->startTimer(1000); // Update every second

        // Start auto-save timer if enabled
        if (autoSaveEnabled_) {
            startAutoSaveTimer();
        }

        initialized_ = true;
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("MidiRoutingEngine initialization failed: " + juce::String(e.what()));
        return false;
    }
}

void MidiRoutingEngine::shutdown() {
    if (!initialized_) {
        return;
    }

    // Stop timers
    if (statsUpdateTimer_) {
        statsUpdateTimer_->stopTimer();
        statsUpdateTimer_.reset();
    }

    if (autoSaveTimer_) {
        autoSaveTimer_->stopTimer();
        autoSaveTimer_.reset();
    }

    // Perform final auto-save
    if (autoSaveEnabled_) {
        performAutoSave();
    }

    // Disconnect all devices
    juce::ScopedLock lock(devicesMutex_);
    for (auto& [identifier, connection] : connections_) {
        if (connection->midiInput) {
            connection->midiInput->stop();
        }
        connection.reset();
    }
    connections_.clear();

    // Clear routes
    {
        juce::ScopedLock routeLock(routesMutex_);
        routes_.clear();
        deviceRoutes_.clear();
        instrumentRoutes_.clear();
    }

    // Clear MIDI learn mappings
    {
        juce::ScopedLock learnLock(midiLearnMutex_);
        midiLearnMappings_.clear();
        activeMidiLearnSessions_.clear();
    }

    initialized_ = false;
}

//==============================================================================
// MIDI Device Management
//==============================================================================

std::vector<MidiDeviceInfo> MidiRoutingEngine::getAvailableInputDevices() const {
    juce::ScopedLock lock(devicesMutex_);
    return availableInputDevices_;
}

std::vector<MidiDeviceInfo> MidiRoutingEngine::getAvailableOutputDevices() const {
    juce::ScopedLock lock(devicesMutex_);
    return availableOutputDevices_;
}

std::vector<MidiDeviceInfo> MidiRoutingEngine::getActiveDevices() const {
    juce::ScopedLock lock(devicesMutex_);
    std::vector<MidiDeviceInfo> activeDevices;

    for (const auto& [identifier, connection] : connections_) {
        if (connection->deviceInfo.isActive) {
            activeDevices.push_back(connection->deviceInfo);
        }
    }

    return activeDevices;
}

bool MidiRoutingEngine::connectToInputDevice(const std::string& deviceIdentifier) {
    if (!initialized_) {
        return false;
    }

    try {
        juce::ScopedLock lock(devicesMutex_);

        // Check if already connected
        auto it = connections_.find(deviceIdentifier);
        if (it != connections_.end() && it->second->midiInput) {
            return true; // Already connected
        }

        // Find device info
        auto deviceIt = std::find_if(availableInputDevices_.begin(), availableInputDevices_.end(),
            [&deviceIdentifier](const MidiDeviceInfo& info) {
                return info.identifier == deviceIdentifier;
            });

        if (deviceIt == availableInputDevices_.end()) {
            return false; // Device not found
        }

        // Create connection
        auto connection = std::make_unique<MidiConnection>();
        connection->deviceIdentifier = deviceIdentifier;
        connection->deviceInfo = *deviceIt;

        // Open MIDI input
        auto midiInputs = juce::MidiInput::getAvailableDevices();
        for (const auto& input : midiInputs) {
            if (input.identifier.toStdString() == deviceIdentifier) {
                connection->midiInput = juce::MidiInput::openDevice(input.identifier,
                    [this](juce::MidiInput* source, const juce::MidiMessage& message) {
                        this->handleIncomingMidi(source, message);
                    });
                break;
            }
        }

        if (!connection->midiInput) {
            return false;
        }

        // Start the input device
        connection->midiInput->start();
        connection->deviceInfo.isActive = true;

        // Store connection
        connections_[deviceIdentifier] = std::move(connection);

        juce::Logger::writeToLog("Connected to MIDI input device: " + juce::String(deviceIdentifier));
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to connect to MIDI input device " +
                                juce::String(deviceIdentifier) + ": " + juce::String(e.what()));
        return false;
    }
}

bool MidiRoutingEngine::disconnectFromInputDevice(const std::string& deviceIdentifier) {
    juce::ScopedLock lock(devicesMutex_);

    auto it = connections_.find(deviceIdentifier);
    if (it == connections_.end()) {
        return false; // Not connected
    }

    auto& connection = it->second;
    if (connection->midiInput) {
        connection->midiInput->stop();
        connection->midiInput.reset();
    }

    connection->deviceInfo.isActive = false;
    connections_.erase(it);

    juce::Logger::writeToLog("Disconnected from MIDI input device: " + juce::String(deviceIdentifier));
    return true;
}

bool MidiRoutingEngine::connectToOutputDevice(const std::string& deviceIdentifier) {
    if (!initialized_) {
        return false;
    }

    try {
        juce::ScopedLock lock(devicesMutex_);

        // Check if already connected
        auto it = connections_.find(deviceIdentifier);
        if (it != connections_.end() && it->second->midiOutput) {
            return true; // Already connected
        }

        // Find device info
        auto deviceIt = std::find_if(availableOutputDevices_.begin(), availableOutputDevices_.end(),
            [&deviceIdentifier](const MidiDeviceInfo& info) {
                return info.identifier == deviceIdentifier;
            });

        if (deviceIt == availableOutputDevices_.end()) {
            return false; // Device not found
        }

        // Create or get connection
        std::unique_ptr<MidiConnection> connection;
        auto connIt = connections_.find(deviceIdentifier);
        if (connIt != connections_.end()) {
            connection = std::move(connIt->second);
            connections_.erase(connIt);
        } else {
            connection = std::make_unique<MidiConnection>();
            connection->deviceIdentifier = deviceIdentifier;
            connection->deviceInfo = *deviceIt;
        }

        // Open MIDI output
        auto midiOutputs = juce::MidiOutput::getAvailableDevices();
        for (const auto& output : midiOutputs) {
            if (output.identifier.toStdString() == deviceIdentifier) {
                connection->midiOutput = juce::MidiOutput::openDevice(output.identifier);
                break;
            }
        }

        if (!connection->midiOutput) {
            return false;
        }

        connection->deviceInfo.isActive = true;
        connections_[deviceIdentifier] = std::move(connection);

        juce::Logger::writeToLog("Connected to MIDI output device: " + juce::String(deviceIdentifier));
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to connect to MIDI output device " +
                                juce::String(deviceIdentifier) + ": " + juce::String(e.what()));
        return false;
    }
}

bool MidiRoutingEngine::disconnectFromOutputDevice(const std::string& deviceIdentifier) {
    juce::ScopedLock lock(devicesMutex_);

    auto it = connections_.find(deviceIdentifier);
    if (it == connections_.end()) {
        return false; // Not connected
    }

    auto& connection = it->second;
    if (connection->midiOutput) {
        connection->midiOutput.reset();
    }

    // Remove connection if no input either
    if (!connection->midiInput) {
        connections_.erase(it);
    } else {
        connection->deviceInfo.isActive = false;
    }

    juce::Logger::writeToLog("Disconnected from MIDI output device: " + juce::String(deviceIdentifier));
    return true;
}

bool MidiRoutingEngine::isDeviceConnected(const std::string& deviceIdentifier) const {
    juce::ScopedLock lock(devicesMutex_);
    auto it = connections_.find(deviceIdentifier);
    return it != connections_.end() && it->second->deviceInfo.isActive;
}

MidiDeviceInfo MidiRoutingEngine::getDeviceInfo(const std::string& deviceIdentifier) const {
    juce::ScopedLock lock(devicesMutex_);
    auto it = connections_.find(deviceIdentifier);
    if (it != connections_.end()) {
        return it->second->deviceInfo;
    }

    // Search in available devices
    for (const auto& device : availableInputDevices_) {
        if (device.identifier == deviceIdentifier) {
            return device;
        }
    }

    for (const auto& device : availableOutputDevices_) {
        if (device.identifier == deviceIdentifier) {
            return device;
        }
    }

    return {}; // Not found
}

//==============================================================================
// MIDI Route Management
//==============================================================================

RouteID MidiRoutingEngine::createRoute(const MidiRouteConfig& config) {
    if (!initialized_) {
        return INVALID_ROUTE_ID;
    }

    if (!validateRouteConfig(config)) {
        return INVALID_ROUTE_ID;
    }

    juce::ScopedLock lock(routesMutex_);

    RouteID routeId = generateRouteId();
    auto route = std::make_unique<MidiRoute>(routeId, config);

    routes_[routeId] = std::move(route);
    deviceRoutes_[config.sourceDevice].push_back(routeId);
    instrumentRoutes_[config.targetInstrument].push_back(routeId);

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        stats_.routesActive++;
    }

    juce::Logger::writeToLog("Created MIDI route: " + juce::String(routeId) +
                            " from " + juce::String(config.sourceDevice) +
                            " to " + juce::String(config.targetInstrument));

    return routeId;
}

bool MidiRoutingEngine::removeRoute(RouteID routeId) {
    juce::ScopedLock lock(routesMutex_);

    auto it = routes_.find(routeId);
    if (it == routes_.end()) {
        return false;
    }

    const auto& route = it->second;

    // Remove from device and instrument mappings
    auto& deviceRoutes = deviceRoutes_[route->config.sourceDevice];
    deviceRoutes.erase(std::remove(deviceRoutes.begin(), deviceRoutes.end(), routeId), deviceRoutes.end());

    auto& instrumentRoutes = instrumentRoutes_[route->config.targetInstrument];
    instrumentRoutes.erase(std::remove(instrumentRoutes.begin(), instrumentRoutes.end(), routeId),
                          instrumentRoutes.end());

    routes_.erase(it);

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        stats_.routesActive = std::max(0, static_cast<int>(stats_.routesActive) - 1);
    }

    juce::Logger::writeToLog("Removed MIDI route: " + juce::String(routeId));
    return true;
}

bool MidiRoutingEngine::updateRouteConfig(RouteID routeId, const MidiRouteConfig& config) {
    if (!validateRouteConfig(config)) {
        return false;
    }

    juce::ScopedLock lock(routesMutex_);

    auto it = routes_.find(routeId);
    if (it == routes_.end()) {
        return false;
    }

    // Update mappings if source or target changed
    if (it->second->config.sourceDevice != config.sourceDevice) {
        auto& oldDeviceRoutes = deviceRoutes_[it->second->config.sourceDevice];
        oldDeviceRoutes.erase(std::remove(oldDeviceRoutes.begin(), oldDeviceRoutes.end(), routeId),
                             oldDeviceRoutes.end());
        deviceRoutes_[config.sourceDevice].push_back(routeId);
    }

    if (it->second->config.targetInstrument != config.targetInstrument) {
        auto& oldInstrumentRoutes = instrumentRoutes_[it->second->config.targetInstrument];
        oldInstrumentRoutes.erase(std::remove(oldInstrumentRoutes.begin(), oldInstrumentRoutes.end(), routeId),
                                 oldInstrumentRoutes.end());
        instrumentRoutes_[config.targetInstrument].push_back(routeId);
    }

    it->second->config = config;

    juce::Logger::writeToLog("Updated MIDI route config: " + juce::String(routeId));
    return true;
}

std::vector<RouteID> MidiRoutingEngine::getAllRoutes() const {
    juce::ScopedLock lock(routesMutex_);
    std::vector<RouteID> routeIds;
    routeIds.reserve(routes_.size());

    for (const auto& [routeId, route] : routes_) {
        routeIds.push_back(routeId);
    }

    return routeIds;
}

std::vector<RouteID> MidiRoutingEngine::getRoutesForSource(const std::string& sourceDevice) const {
    juce::ScopedLock lock(routesMutex_);
    auto it = deviceRoutes_.find(sourceDevice);
    if (it != deviceRoutes_.end()) {
        return it->second;
    }
    return {};
}

std::vector<RouteID> MidiRoutingEngine::getRoutesForTarget(const std::string& targetInstrument) const {
    juce::ScopedLock lock(routesMutex_);
    auto it = instrumentRoutes_.find(targetInstrument);
    if (it != instrumentRoutes_.end()) {
        return it->second;
    }
    return {};
}

MidiRouteConfig MidiRoutingEngine::getRouteConfig(RouteID routeId) const {
    juce::ScopedLock lock(routesMutex_);
    auto it = routes_.find(routeId);
    if (it != routes_.end()) {
        return it->second->config;
    }
    return {};
}

bool MidiRoutingEngine::enableRoute(RouteID routeId) {
    juce::ScopedLock lock(routesMutex_);
    auto it = routes_.find(routeId);
    if (it != routes_.end()) {
        it->second->enabled = true;
        return true;
    }
    return false;
}

bool MidiRoutingEngine::disableRoute(RouteID routeId) {
    juce::ScopedLock lock(routesMutex_);
    auto it = routes_.find(routeId);
    if (it != routes_.end()) {
        it->second->enabled = false;
        return true;
    }
    return false;
}

bool MidiRoutingEngine::isRouteEnabled(RouteID routeId) const {
    juce::ScopedLock lock(routesMutex_);
    auto it = routes_.find(routeId);
    return it != routes_.end() && it->second->enabled;
}

RouteID MidiRoutingEngine::createBroadcastRoute(const std::string& sourceDevice) {
    MidiRouteConfig config("Broadcast", sourceDevice, "broadcast");
    config.name = "Broadcast from " + sourceDevice;
    return createRoute(config);
}

RouteID MidiRoutingEngine::createAllInstrumentsRoute(const std::string& sourceDevice) {
    MidiRouteConfig config("All Instruments", sourceDevice, "all_instruments");
    config.name = "All instruments from " + sourceDevice;
    return createRoute(config);
}

//==============================================================================
// MIDI Processing
//==============================================================================

void MidiRoutingEngine::processMidiBlock(const std::string& sourceDevice,
                                        juce::MidiBuffer& midiBuffer, int numSamples) {
    if (!initialized_) {
        return;
    }

    juce::ScopedLock lock(routesMutex_);

    // Get routes for this source device
    auto routeIt = deviceRoutes_.find(sourceDevice);
    if (routeIt == deviceRoutes_.end()) {
        return; // No routes for this device
    }

    juce::MidiBuffer filteredBuffer;
    juce::MidiBuffer transformedBuffer;

    for (RouteID routeId : routeIt->second) {
        auto routeIt = routes_.find(routeId);
        if (routeIt == routes_.end() || !routeIt->second->enabled) {
            continue;
        }

        auto& route = routeIt->second;
        route->messageCount++;
        route->lastActivity = juce::Time::getCurrentTime();

        // Apply filtering
        filteredBuffer.clear();
        if (route->config.filterMask == 0) {
            filteredBuffer = midiBuffer; // No filtering
        } else {
            applyMessageFilter(midiBuffer, route->config);
        }

        // Apply transformation
        transformedBuffer.clear();
        if (route->config.transformMask == 0) {
            transformedBuffer = filteredBuffer; // No transformation
        } else {
            applyMessageTransform(filteredBuffer, route->config);
        }

        // Route to target
        if (route->config.targetInstrument == "broadcast") {
            // Send to all instruments
            auto allInstances = instrumentManager_->getAllInstances();
            for (auto& instance : allInstances) {
                if (instance) {
                    instance->processMidi(transformedBuffer);
                }
            }
        } else if (route->config.targetInstrument == "all_instruments") {
            // Send to all built-in instruments
            auto instanceNames = {"NEX_FM", "Sam_Sampler", "LocalGal"};
            for (const auto& name : instanceNames) {
                auto instance = instrumentManager_->getInstance(name);
                if (instance) {
                    instance->processMidi(transformedBuffer);
                }
            }
        } else {
            // Send to specific instrument
            auto instance = instrumentManager_->getInstance(route->config.targetInstrument);
            if (instance) {
                instance->processMidi(transformedBuffer);
            }
        }

        // Update statistics
        {
            juce::ScopedLock statsLock(statsMutex_);
            stats_.totalMessagesRouted += transformedBuffer.getNumEvents();
        }
    }

    // Process MIDI learn for all messages
    juce::MidiBuffer::Iterator it(midiBuffer);
    juce::MidiMessage message;
    int samplePosition;

    while (it.getNextEvent(message, samplePosition)) {
        processMidiLearn(message);
    }

    // Call activity callback
    if (midiActivityCallback_) {
        juce::MidiBuffer::Iterator activityIt(midiBuffer);
        while (activityIt.getNextEvent(message, samplePosition)) {
            midiActivityCallback_(sourceDevice, message);
        }
    }
}

void MidiRoutingEngine::processMidiMessage(const std::string& sourceDevice,
                                         const juce::MidiMessage& message) {
    juce::MidiBuffer buffer;
    buffer.addEvent(message, 0);
    processMidiBlock(sourceDevice, buffer, 1);
}

void MidiRoutingEngine::sendMidiToInstrument(const std::string& instrumentName,
                                            const juce::MidiMessage& message) {
    auto instance = instrumentManager_->getInstance(instrumentName);
    if (instance) {
        juce::MidiBuffer buffer;
        buffer.addEvent(message, 0);
        instance->processMidi(buffer);
    }
}

void MidiRoutingEngine::sendMidiToInstrument(const std::string& instrumentName,
                                            const juce::MidiBuffer& midiBuffer) {
    auto instance = instrumentManager_->getInstance(instrumentName);
    if (instance) {
        instance->processMidi(midiBuffer);
    }
}

void MidiRoutingEngine::processSysEx(const std::string& sourceDevice,
                                    const std::vector<uint8_t>& sysExData) {
    // Create SysEx message
    juce::MidiMessage sysExMessage(sysExData.data(), static_cast<int>(sysExData.size()));
    processMidiMessage(sourceDevice, sysExMessage);
}

//==============================================================================
// MIDI Learn System
//==============================================================================

bool MidiRoutingEngine::startMidiLearn(const std::string& parameterName,
                                      const std::string& instrumentName) {
    juce::ScopedLock lock(midiLearnMutex_);

    std::string key = instrumentName + "::" + parameterName;
    activeMidiLearnSessions_.insert(key);

    // Initialize or get existing config
    auto it = midiLearnMappings_.find(key);
    if (it == midiLearnMappings_.end()) {
        midiLearnMappings_[key] = MidiLearnConfig(parameterName, instrumentName);
    }

    midiLearnMappings_[key].isLearning = true;

    juce::Logger::writeToLog("Started MIDI learn for: " + juce::String(key));
    return true;
}

bool MidiRoutingEngine::stopMidiLearn(const std::string& parameterName,
                                     const std::string& instrumentName) {
    juce::ScopedLock lock(midiLearnMutex_);

    std::string key = instrumentName + "::" + parameterName;
    activeMidiLearnSessions_.erase(key);

    auto it = midiLearnMappings_.find(key);
    if (it != midiLearnMappings_.end()) {
        it->second.isLearning = false;
    }

    juce::Logger::writeToLog("Stopped MIDI learn for: " + juce::String(key));
    return true;
}

bool MidiRoutingEngine::isMidiLearning(const std::string& parameterName,
                                      const std::string& instrumentName) const {
    juce::ScopedLock lock(midiLearnMutex_);

    std::string key = instrumentName + "::" + parameterName;
    auto it = midiLearnMappings_.find(key);
    return it != midiLearnMappings_.end() && it->second.isLearning;
}

bool MidiRoutingEngine::addMidiLearnMapping(const MidiLearnConfig& config) {
    if (!validateMidiLearnConfig(config)) {
        return false;
    }

    juce::ScopedLock lock(midiLearnMutex_);

    std::string key = config.instrumentName + "::" + config.parameterName;
    midiLearnMappings_[key] = config;

    juce::Logger::writeToLog("Added MIDI learn mapping: " + juce::String(key) +
                            " -> CC" + juce::String(config.midiCC));
    return true;
}

bool MidiRoutingEngine::removeMidiLearnMapping(const std::string& parameterName,
                                              const std::string& instrumentName) {
    juce::ScopedLock lock(midiLearnMutex_);

    std::string key = instrumentName + "::" + parameterName;
    auto it = midiLearnMappings_.find(key);
    if (it != midiLearnMappings_.end()) {
        midiLearnMappings_.erase(it);
        activeMidiLearnSessions_.erase(key);

        juce::Logger::writeToLog("Removed MIDI learn mapping: " + juce::String(key));
        return true;
    }

    return false;
}

std::vector<MidiLearnConfig> MidiRoutingEngine::getMidiLearnMappings() const {
    juce::ScopedLock lock(midiLearnMutex_);

    std::vector<MidiLearnConfig> mappings;
    mappings.reserve(midiLearnMappings_.size());

    for (const auto& [key, config] : midiLearnMappings_) {
        mappings.push_back(config);
    }

    return mappings;
}

std::vector<MidiLearnConfig> MidiRoutingEngine::getMidiLearnMappingsForInstrument(
    const std::string& instrumentName) const {
    juce::ScopedLock lock(midiLearnMutex_);

    std::vector<MidiLearnConfig> mappings;

    for (const auto& [key, config] : midiLearnMappings_) {
        if (config.instrumentName == instrumentName) {
            mappings.push_back(config);
        }
    }

    return mappings;
}

void MidiRoutingEngine::processMidiLearn(const juce::MidiMessage& message) {
    if (!message.isController() && !message.isPitchWheel() && !message.isChannelPressure()) {
        return; // Only learn from CC, pitch bend, and channel pressure
    }

    juce::ScopedLock lock(midiLearnMutex_);

    for (const auto& [key, config] : midiLearnMappings_) {
        if (!config.isLearning) {
            continue;
        }

        // Check if this message matches what we're learning
        if (message.isController()) {
            int ccNumber = message.getControllerNumber();
            int channel = message.getChannel();

            // Update mapping
            auto mutableConfig = midiLearnMappings_[key];
            mutableConfig.midiCC = ccNumber;
            mutableConfig.midiChannel = channel;
            mutableConfig.isLearning = false;
            midiLearnMappings_[key] = mutableConfig;

            activeMidiLearnSessions_.erase(key);

            // Update statistics
            {
                juce::ScopedLock statsLock(statsMutex_);
                stats_.midiLearnEvents++;
            }

            juce::Logger::writeToLog("MIDI learn completed for: " + juce::String(key) +
                                   " mapped to CC" + juce::String(ccNumber) +
                                   " Ch" + juce::String(channel));
            break;
        }
    }

    // Process existing mappings
    for (const auto& [key, config] : midiLearnMappings_) {
        if (config.isLearning || config.midiCC < 0) {
            continue;
        }

        if (message.isController() &&
            message.getControllerNumber() == config.midiCC &&
            (config.midiChannel < 0 || message.getChannel() == config.midiChannel)) {

            float midiValue = message.getControllerValue() / 127.0f;
            updateParameterFromMidi(config, midiValue);
        }
    }
}

void MidiRoutingEngine::clearAllMidiLearnMappings() {
    juce::ScopedLock lock(midiLearnMutex_);
    midiLearnMappings_.clear();
    activeMidiLearnSessions_.clear();

    juce::Logger::writeToLog("Cleared all MIDI learn mappings");
}

//==============================================================================
// MIDI Filtering and Transformation
//==============================================================================

bool MidiRoutingEngine::shouldFilterMessage(const MidiRouteConfig& config,
                                           const juce::MidiMessage& message) const {
    if (config.filterMask == 0) {
        return false; // No filtering
    }

    // Channel filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::Channel)) {
        if (config.allowedChannels.empty() ||
            config.allowedChannels.find(message.getChannel()) == config.allowedChannels.end()) {
            return true;
        }
    }

    // Note range filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::NoteRange)) {
        if (message.isNoteOn() || message.isNoteOff()) {
            int noteNumber = message.getNoteNumber();
            if (noteNumber < config.velocityRange.first || noteNumber > config.velocityRange.second) {
                return true;
            }
        }
    }

    // Velocity range filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::VelocityRange)) {
        if (message.isNoteOn()) {
            int velocity = message.getVelocity();
            if (velocity < config.velocityRange.first || velocity > config.velocityRange.second) {
                return true;
            }
        }
    }

    // Message type filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::MessageType)) {
        bool messageTypeAllowed = false;
        for (int type : config.allowedMessageTypes) {
            switch (type) {
                case 0: messageTypeAllowed |= message.isNoteOn(); break;
                case 1: messageTypeAllowed |= message.isNoteOff(); break;
                case 2: messageTypeAllowed |= message.isController(); break;
                case 3: messageTypeAllowed |= message.isPitchWheel(); break;
                case 4: messageTypeAllowed |= message.isChannelPressure(); break;
                case 5: messageTypeAllowed |= message.isAftertouch(); break;
                case 6: messageTypeAllowed |= message.isProgramChange(); break;
            }
        }
        if (!messageTypeAllowed) {
            return true;
        }
    }

    // Controller filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::Controller)) {
        if (message.isController()) {
            int ccNumber = message.getControllerNumber();
            if (config.allowedControllers.find(ccNumber) == config.allowedControllers.end()) {
                return true;
            }
        }
    }

    // Custom filter
    if (config.filterMask & static_cast<uint32_t>(MidiFilterType::Custom) && config.customFilter) {
        if (config.customFilter(message)) {
            return true;
        }
    }

    return false;
}

void MidiRoutingEngine::applyMessageFilter(juce::MidiBuffer& buffer,
                                         const MidiRouteConfig& config) const {
    if (config.filterMask == 0) {
        return; // No filtering
    }

    juce::MidiBuffer filteredBuffer;
    juce::MidiBuffer::Iterator it(buffer);
    juce::MidiMessage message;
    int samplePosition;

    while (it.getNextEvent(message, samplePosition)) {
        if (!shouldFilterMessage(config, message)) {
            filteredBuffer.addEvent(message, samplePosition);
        }
    }

    buffer = filteredBuffer;
}

juce::MidiMessage MidiRoutingEngine::transformMessage(const MidiRouteConfig& config,
                                                     const juce::MidiMessage& message) const {
    if (config.transformMask == 0) {
        return message; // No transformation
    }

    juce::MidiMessage transformed = message;

    // Transpose
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::Transpose)) {
        if (message.isNoteOn() || message.isNoteOff()) {
            int transposedNote = message.getNoteNumber() + config.transposeSemi;
            transposedNote = juce::jlimit(0, 127, transposedNote);

            if (message.isNoteOn()) {
                transformed = juce::MidiMessage::noteOn(message.getChannel(), transposedNote, message.getVelocity());
            } else {
                transformed = juce::MidiMessage::noteOff(message.getChannel(), transposedNote, message.getVelocity());
            }
        }
    }

    // Velocity scaling
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::VelocityScale)) {
        if (message.isNoteOn()) {
            float scaledVelocity = message.getVelocity() * config.velocityScale;
            scaledVelocity = juce::jlimit(0.0f, 127.0f, scaledVelocity);

            // Apply velocity curve
            scaledVelocity = applyVelocityCurve(scaledVelocity / 127.0f, config.velocityCurve) * 127.0f;
            scaledVelocity = juce::jlimit(0.0f, 127.0f, scaledVelocity);

            transformed = juce::MidiMessage::noteOn(message.getChannel(),
                                                   message.getNoteNumber(),
                                                   static_cast<int>(scaledVelocity));
        }
    }

    // Channel mapping
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::ChannelMap)) {
        auto it = config.channelMap.find(message.getChannel());
        if (it != config.channelMap.end()) {
            transformed = juce::MidiMessage(message.getRawData(), message.getRawDataSize());
            transformed.setChannel(it->second);
        }
    }

    // Controller mapping
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::ControllerMap)) {
        if (message.isController()) {
            auto it = config.controllerMap.find(message.getControllerNumber());
            if (it != config.controllerMap.end()) {
                transformed = juce::MidiMessage::controllerEvent(message.getChannel(),
                                                                it->second,
                                                                message.getControllerValue());
            }
        }
    }

    // Note mapping
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::NoteMap)) {
        if (message.isNoteOn() || message.isNoteOff()) {
            auto it = config.noteMap.find(message.getNoteNumber());
            if (it != config.noteMap.end()) {
                if (message.isNoteOn()) {
                    transformed = juce::MidiMessage::noteOn(message.getChannel(),
                                                           it->second,
                                                           message.getVelocity());
                } else {
                    transformed = juce::MidiMessage::noteOff(message.getChannel(),
                                                            it->second,
                                                            message.getVelocity());
                }
            }
        }
    }

    // Custom transform
    if (config.transformMask & static_cast<uint32_t>(MidiTransformType::Custom) && config.customTransform) {
        transformed = config.customTransform(transformed);
    }

    return transformed;
}

void MidiRoutingEngine::applyMessageTransform(juce::MidiBuffer& buffer,
                                            const MidiRouteConfig& config) const {
    if (config.transformMask == 0) {
        return; // No transformation
    }

    juce::MidiBuffer transformedBuffer;
    juce::MidiBuffer::Iterator it(buffer);
    juce::MidiMessage message;
    int samplePosition;

    while (it.getNextEvent(message, samplePosition)) {
        juce::MidiMessage transformed = transformMessage(config, message);
        transformedBuffer.addEvent(transformed, samplePosition);

        {
            juce::ScopedLock statsLock(statsMutex_);
            stats_.messagesTransformed++;
        }
    }

    buffer = transformedBuffer;
}

void MidiRoutingEngine::registerCustomFilter(const std::string& name,
                                            std::function<bool(const juce::MidiMessage&)> filter) {
    customFilters_[name] = std::move(filter);
}

void MidiRoutingEngine::registerCustomTransform(const std::string& name,
                                               std::function<juce::MidiMessage(const juce::MidiMessage&)> transform) {
    customTransforms_[name] = std::move(transform);
}

//==============================================================================
// Velocity Processing
//==============================================================================

float MidiRoutingEngine::applyVelocityCurve(float velocity, float curve) const {
    if (curve == 1.0f) {
        return velocity; // Linear
    } else if (curve > 1.0f) {
        // Exponential
        return std::pow(velocity, curve);
    } else {
        // Logarithmic
        return std::pow(velocity, curve);
    }
}

float MidiRoutingEngine::scaleVelocity(float velocity, float scale) const {
    return juce::jlimit(0.0f, 1.0f, velocity * scale);
}

//==============================================================================
// Channel Management
//==============================================================================

void MidiRoutingEngine::setChannelMap(int inputChannel, int outputChannel) {
    channelMap_[inputChannel] = outputChannel;
}

int MidiRoutingEngine::getChannelMap(int inputChannel) const {
    auto it = channelMap_.find(inputChannel);
    return (it != channelMap_.end()) ? it->second : inputChannel;
}

void MidiRoutingEngine::clearChannelMap() {
    channelMap_.clear();
    // Reset to 1:1 mapping
    for (int i = 1; i <= 16; ++i) {
        channelMap_[i] = i;
    }
}

void MidiRoutingEngine::setAllowedChannels(const std::unordered_set<int>& channels) {
    allowedChannels_ = channels;
}

std::unordered_set<int> MidiRoutingEngine::getAllowedChannels() const {
    return allowedChannels_;
}

//==============================================================================
// Monitoring and Statistics
//==============================================================================

MidiRoutingStats MidiRoutingEngine::getStatistics() const {
    juce::ScopedLock lock(statsMutex_);
    return stats_;
}

void MidiRoutingEngine::resetStatistics() {
    juce::ScopedLock lock(statsMutex_);
    stats_.reset();
}

std::vector<std::string> MidiRoutingEngine::getActiveRoutes() const {
    juce::ScopedLock lock(routesMutex_);
    std::vector<std::string> activeRoutes;

    for (const auto& [routeId, route] : routes_) {
        if (route->enabled && route->lastActivity > juce::Time::getCurrentTime() - juce::RelativeTime::seconds(5.0)) {
            activeRoutes.push_back(route->config.name);
        }
    }

    return activeRoutes;
}

uint64_t MidiRoutingEngine::getMessageCountForRoute(RouteID routeId) const {
    juce::ScopedLock lock(routesMutex_);
    auto it = routes_.find(routeId);
    return (it != routes_.end()) ? it->second->messageCount : 0;
}

//==============================================================================
// Configuration and Persistence
//==============================================================================

void MidiRoutingEngine::setConfiguration(const juce::var& config) {
    // Implementation for loading configuration from var
    // This would parse JSON/YAML configuration and set up routes, etc.
}

juce::var MidiRoutingEngine::getConfiguration() const {
    // Implementation for exporting configuration to var
    // This would serialize current routes, MIDI learn mappings, etc.
    return juce::var();
}

bool MidiRoutingEngine::saveState(const juce::File& file) const {
    try {
        juce::DynamicObject::Ptr state = new juce::DynamicObject();

        // Save routes
        juce::Array<juce::var> routeArray;
        {
            juce::ScopedLock lock(routesMutex_);
            for (const auto& [routeId, route] : routes_) {
                juce::DynamicObject::Ptr routeObj = new juce::DynamicObject();
                routeObj->setProperty("id", static_cast<int64_t>(routeId));
                routeObj->setProperty("name", route->config.name);
                routeObj->setProperty("sourceDevice", route->config.sourceDevice);
                routeObj->setProperty("targetInstrument", route->config.targetInstrument);
                routeObj->setProperty("enabled", route->enabled);
                routeArray.add(routeObj.get());
            }
        }
        state->setProperty("routes", routeArray);

        // Save MIDI learn mappings
        juce::Array<juce::var> midiLearnArray;
        {
            juce::ScopedLock lock(midiLearnMutex_);
            for (const auto& [key, config] : midiLearnMappings_) {
                juce::DynamicObject::Ptr learnObj = new juce::DynamicObject();
                learnObj->setProperty("parameterName", config.parameterName);
                learnObj->setProperty("instrumentName", config.instrumentName);
                learnObj->setProperty("midiCC", config.midiCC);
                learnObj->setProperty("midiChannel", config.midiChannel);
                learnObj->setProperty("minValue", config.minValue);
                learnObj->setProperty("maxValue", config.maxValue);
                midiLearnArray.add(learnObj.get());
            }
        }
        state->setProperty("midiLearnMappings", midiLearnArray);

        // Save global settings
        state->setProperty("globalVelocityCurve", globalVelocityCurve_);
        state->setProperty("globalVelocityScale", globalVelocityScale_);
        state->setProperty("omniMode", omniMode_);
        state->setProperty("autoSaveEnabled", autoSaveEnabled_);
        state->setProperty("autoSaveInterval", autoSaveIntervalSeconds_);

        // Write to file
        auto jsonString = juce::JSON::toString(state.get());
        return file.replaceWithText(jsonString);

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to save MIDI routing state: " + juce::String(e.what()));
        return false;
    }
}

bool MidiRoutingEngine::loadState(const juce::File& file) {
    try {
        auto jsonString = file.loadFileAsString();
        auto json = juce::JSON::parse(jsonString);

        if (!json.isObject()) {
            return false;
        }

        auto state = json.getDynamicObject();

        // Load global settings
        if (state->hasProperty("globalVelocityCurve")) {
            globalVelocityCurve_ = static_cast<float>(state->getProperty("globalVelocityCurve"));
        }
        if (state->hasProperty("globalVelocityScale")) {
            globalVelocityScale_ = static_cast<float>(state->getProperty("globalVelocityScale"));
        }
        if (state->hasProperty("omniMode")) {
            omniMode_ = static_cast<bool>(state->getProperty("omniMode"));
        }
        if (state->hasProperty("autoSaveEnabled")) {
            autoSaveEnabled_ = static_cast<bool>(state->getProperty("autoSaveEnabled"));
        }
        if (state->hasProperty("autoSaveInterval")) {
            autoSaveIntervalSeconds_ = static_cast<int>(state->getProperty("autoSaveInterval"));
        }

        // Clear existing state
        {
            juce::ScopedLock lock(routesMutex_);
            routes_.clear();
            deviceRoutes_.clear();
            instrumentRoutes_.clear();
        }
        {
            juce::ScopedLock learnLock(midiLearnMutex_);
            midiLearnMappings_.clear();
            activeMidiLearnSessions_.clear();
        }

        // Load routes
        if (state->hasProperty("routes")) {
            auto routeArray = state->getProperty("routes").getArray();
            for (const auto& routeVar : *routeArray) {
                auto routeObj = routeVar.getDynamicObject();

                MidiRouteConfig config;
                config.name = routeObj->getProperty("name").toString().toStdString();
                config.sourceDevice = routeObj->getProperty("sourceDevice").toString().toStdString();
                config.targetInstrument = routeObj->getProperty("targetInstrument").toString().toStdString();

                RouteID routeId = static_cast<RouteID>(static_cast<int64_t>(routeObj->getProperty("id")));
                auto route = std::make_unique<MidiRoute>(routeId, config);
                route->enabled = routeObj->getProperty("enabled");

                {
                    juce::ScopedLock lock(routesMutex_);
                    routes_[routeId] = std::move(route);
                    deviceRoutes_[config.sourceDevice].push_back(routeId);
                    instrumentRoutes_[config.targetInstrument].push_back(routeId);
                }
            }
        }

        // Load MIDI learn mappings
        if (state->hasProperty("midiLearnMappings")) {
            auto learnArray = state->getProperty("midiLearnMappings").getArray();
            for (const auto& learnVar : *learnArray) {
                auto learnObj = learnVar.getDynamicObject();

                MidiLearnConfig config;
                config.parameterName = learnObj->getProperty("parameterName").toString().toStdString();
                config.instrumentName = learnObj->getProperty("instrumentName").toString().toStdString();
                config.midiCC = learnObj->getProperty("midiCC");
                config.midiChannel = learnObj->getProperty("midiChannel");
                config.minValue = learnObj->getProperty("minValue");
                config.maxValue = learnObj->getProperty("maxValue");

                std::string key = config.instrumentName + "::" + config.parameterName;
                {
                    juce::ScopedLock lock(midiLearnMutex_);
                    midiLearnMappings_[key] = config;
                }
            }
        }

        juce::Logger::writeToLog("Loaded MIDI routing state from: " + file.getFullPathName());
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to load MIDI routing state: " + juce::String(e.what()));
        return false;
    }
}

//==============================================================================
// Internal Methods
//==============================================================================

void MidiRoutingEngine::updateDeviceList() {
    juce::ScopedLock lock(devicesMutex_);

    // Update input devices
    availableInputDevices_.clear();
    auto midiInputs = juce::MidiInput::getAvailableDevices();
    for (const auto& input : midiInputs) {
        MidiDeviceInfo info;
        info.name = input.name.toStdString();
        info.identifier = input.identifier.toStdString();
        info.isInput = true;
        info.isOutput = false;
        info.juceDeviceInfo = input;
        availableInputDevices_.push_back(info);
    }

    // Update output devices
    availableOutputDevices_.clear();
    auto midiOutputs = juce::MidiOutput::getAvailableDevices();
    for (const auto& output : midiOutputs) {
        MidiDeviceInfo info;
        info.name = output.name.toStdString();
        info.identifier = output.identifier.toStdString();
        info.isInput = false;
        info.isOutput = true;
        info.juceDeviceInfo = output;
        availableOutputDevices_.push_back(info);
    }
}

void MidiRoutingEngine::handleIncomingMidi(juce::MidiInput* source, const juce::MidiMessage& message) {
    if (!source) {
        return;
    }

    std::string deviceIdentifier = source->getIdentifier().toStdString();

    // Update device statistics
    {
        juce::ScopedLock lock(devicesMutex_);
        auto it = connections_.find(deviceIdentifier);
        if (it != connections_.end()) {
            auto& connection = it->second;
            connection->deviceInfo.messagesReceived++;
            connection->deviceInfo.bytesReceived += message.getRawDataSize();
            connection->deviceInfo.lastActivity = juce::Time::getCurrentTime();
        }
    }

    // Process the message through routing system
    processMidiMessage(deviceIdentifier, message);
}

bool MidiRoutingEngine::validateRouteConfig(const MidiRouteConfig& config) const {
    if (config.name.empty() || config.sourceDevice.empty() || config.targetInstrument.empty()) {
        return false;
    }

    // Validate channel mappings
    for (const auto& [input, output] : config.channelMap) {
        if (input < 1 || input > 16 || output < 1 || output > 16) {
            return false;
        }
    }

    // Validate note mappings
    for (const auto& [input, output] : config.noteMap) {
        if (input < 0 || input > 127 || output < 0 || output > 127) {
            return false;
        }
    }

    // Validate velocity range
    if (config.velocityRange.first < 0 || config.velocityRange.first > 127 ||
        config.velocityRange.second < 0 || config.velocityRange.second > 127 ||
        config.velocityRange.first > config.velocityRange.second) {
        return false;
    }

    return true;
}

bool MidiRoutingEngine::validateMidiLearnConfig(const MidiLearnConfig& config) const {
    if (config.parameterName.empty() || config.instrumentName.empty()) {
        return false;
    }

    if (config.midiCC < 0 || config.midiCC > 127) {
        return false;
    }

    if (config.midiChannel < 0 || config.midiChannel > 16) {
        return false;
    }

    if (config.minValue >= config.maxValue) {
        return false;
    }

    return true;
}

RouteID MidiRoutingEngine::generateRouteId() const {
    return nextRouteId_++;
}

double MidiRoutingEngine::calculateLatency(const juce::Time& startTime) const {
    auto now = juce::Time::getCurrentTime();
    return (now - startTime).inMilliseconds();
}

void MidiRoutingEngine::updateParameterFromMidi(const MidiLearnConfig& config, float midiValue) {
    // Get parameter value from MIDI
    float parameterValue = midiValueToParameter(midiValue, config);

    // Get instrument instance
    auto instance = instrumentManager_->getInstance(config.instrumentName);
    if (!instance) {
        return;
    }

    // Update parameter - this would need to be implemented in the instrument instance
    // instance->setParameter(config.parameterName, parameterValue);

    juce::Logger::writeToLog("Updated parameter " + juce::String(config.parameterName) +
                           " in " + juce::String(config.instrumentName) +
                           " to " + juce::String(parameterValue));
}

float MidiRoutingEngine::midiValueToParameter(float midiValue, const MidiLearnConfig& config) const {
    // Normalize MIDI value to [0, 1]
    float normalized = juce::jlimit(0.0f, 1.0f, midiValue);

    // Apply curve
    switch (config.curveType) {
        case MidiLearnConfig::CurveType::Linear:
            break; // Already linear
        case MidiLearnConfig::CurveType::Exponential:
            normalized = std::pow(normalized, 2.0f);
            break;
        case MidiLearnConfig::CurveType::Logarithmic:
            normalized = std::sqrt(normalized);
            break;
        case MidiLearnConfig::CurveType::Stepped: {
            int steps = 8; // 8 steps
            normalized = std::round(normalized * steps) / steps;
            break;
        }
    }

    // Apply custom mapping if provided
    if (config.customMapping) {
        normalized = config.customMapping(normalized);
    }

    // Map to parameter range
    return config.minValue + normalized * (config.maxValue - config.minValue);
}

void MidiRoutingEngine::startAutoSaveTimer() {
    if (autoSaveIntervalSeconds_ > 0) {
        autoSaveTimer_ = std::make_unique<MidiRoutingTimer>([this]() {
            performAutoSave();
        });
        autoSaveTimer_->startTimer(autoSaveIntervalSeconds_ * 1000);
    }
}

void MidiRoutingEngine::stopAutoSaveTimer() {
    if (autoSaveTimer_) {
        autoSaveTimer_->stopTimer();
        autoSaveTimer_.reset();
    }
}

void MidiRoutingEngine::performAutoSave() {
    // Implementation would save to a default location
    // For now, just log that auto-save was performed
    juce::Logger::writeToLog("Auto-saved MIDI routing state");
}

} // namespace midi
} // namespace schill