#include "effects/InterchangeableEffectsChain.h"

namespace schill {
namespace effects {

//==============================================================================
// InterchangeableEffectSlot Implementation
//==============================================================================

InterchangeableEffectSlot::InterchangeableEffectSlot(int slotIndex, const SlotConfig& config,
                                                     juce::AudioPluginFormatManager& formatManager)
    : slotIndex(slotIndex), currentConfig(config), formatManager(formatManager),
      preferredType(PreferredType::Auto), statsResetTime(juce::Time::getCurrentTime()) {

    sidechainBuffer.setSize(2, 512);
    smoothedMasterGain = std::make_unique<juce::SmoothedValue<float>>();
    smoothedMasterGain->reset(44100.0, 0.01f);

    resetStats();
}

bool InterchangeableEffectSlot::initialize(double sampleRate, int blockSize) {
    this->sampleRate = sampleRate;
    this->samplesPerBlock = blockSize;

    // Update buffer sizes
    sidechainBuffer.setSize(2, blockSize);

    // Initialize parameter smoothers
    smoothedMasterGain->reset(sampleRate, smoothingTimeMs * 0.001f);
    initializeParameterSmoothers();

    // Load the effect
    if (!currentConfig.effectName.empty()) {
        return loadEffect(currentConfig.effectName, preferredType);
    }

    return true;
}

bool InterchangeableEffectSlot::loadEffect(const std::string& effectName, PreferredType preference) {
    preferredType = preference;
    bool loaded = false;

    switch (preference) {
        case PreferredType::Auto:
            loaded = tryLoadInternal(effectName);
            if (!loaded) {
                loaded = tryLoadExternal(effectName);
            }
            if (!loaded) {
                loaded = tryLoadHybrid(effectName);
            }
            break;

        case PreferredType::InternalOnly:
            loaded = tryLoadInternal(effectName);
            break;

        case PreferredType::ExternalOnly:
            loaded = tryLoadExternal(effectName);
            break;

        case PreferredType::Hybrid:
            loaded = tryLoadHybrid(effectName);
            break;
    }

    if (loaded) {
        currentConfig.effectName = effectName;
        currentEffect->prepareToPlay(sampleRate, samplesPerBlock);
        stats.effectInfo = currentEffect->getEffectInfo();
    }

    return loaded;
}

bool InterchangeableEffectSlot::loadInternalEffect(const std::string& effectName, const std::string& effectType) {
    auto effect = UnifiedEffectFactory::createInternal(effectType, effectName);
    if (effect) {
        currentEffect = std::move(effect);
        return true;
    }
    return false;
}

bool InterchangeableEffectSlot::loadExternalPlugin(const juce::File& pluginFile) {
    auto effect = UnifiedEffectFactory::loadExternal(formatManager, pluginFile, sampleRate, samplesPerBlock);
    if (effect) {
        currentEffect = std::move(effect);
        return true;
    }
    return false;
}

bool InterchangeableEffectSlot::loadExternalByName(const std::string& pluginName) {
    // This would search known plugins by name
    // For now, simplified implementation
    return false;
}

void InterchangeableEffectSlot::processBlock(juce::AudioBuffer<float>& buffer) {
    if (!currentEffect || bypassed || !enabled) {
        return;
    }

    // Store input for statistics
    const int numSamples = buffer.getNumSamples();
    juce::AudioBuffer<float> inputCopy = buffer;

    // Process sidechain if available
    if (sidechainBuffer.getNumSamples() == numSamples) {
        currentEffect->processSidechainInput(sidechainBuffer);
    }

    // Apply parameter smoothing
    applyParameterSmoothing();

    // Process the effect
    currentEffect->processBlock(buffer);

    // Apply output gain
    if (currentConfig.outputGain != 0.0f) {
        float gainLinear = juce::Decibels::decibelsToGain(currentConfig.outputGain);
        buffer.applyGain(gainLinear);
    }

    // Update statistics
    updateStats(inputCopy, buffer);
}

void InterchangeableEffectSlot::processStereo(juce::AudioBuffer<float>& leftBuffer,
                                           juce::AudioBuffer<float>& rightBuffer) {
    if (!currentEffect || bypassed || !enabled) {
        return;
    }

    currentEffect->processStereo(leftBuffer, rightBuffer);

    // Apply output gain
    if (currentConfig.outputGain != 0.0f) {
        float gainLinear = juce::Decibels::decibelsToGain(currentConfig.outputGain);
        leftBuffer.applyGain(gainLinear);
        rightBuffer.applyGain(gainLinear);
    }
}

void InterchangeableEffectSlot::processSidechainInput(const juce::AudioBuffer<float>& sidechainBufferInput) {
    sidechainBuffer.makeCopyOf(sidechainBufferInput);
}

float InterchangeableEffectSlot::getParameter(const std::string& parameterName) const {
    if (currentEffect) {
        return currentEffect->getParameter(parameterName);
    }
    return 0.0f;
}

void InterchangeableEffectSlot::setParameter(const std::string& parameterName, float value) {
    if (currentEffect) {
        if (parameterSmoothingEnabled && currentEffect->getEffectType() == UnifiedEffect::Type::External) {
            updateParameterSmoothing(parameterName, value);
        } else {
            currentEffect->setParameter(parameterName, value);
        }

        // Store in config
        currentConfig.parameters[parameterName] = value;
    }
}

float InterchangeableEffectSlot::getParameterNormalized(const std::string& parameterName) const {
    if (currentEffect) {
        return currentEffect->getParameterNormalized(parameterName);
    }
    return 0.0f;
}

void InterchangeableEffectSlot::setParameterNormalized(const std::string& parameterName, float normalizedValue) {
    if (currentEffect) {
        if (parameterSmoothingEnabled && currentEffect->getEffectType() == UnifiedEffect::Type::External) {
            updateParameterSmoothing(parameterName, normalizedValue);
        } else {
            currentEffect->setParameterNormalized(parameterName, normalizedValue);
        }

        // Store in config
        currentConfig.parameters[parameterName] = normalizedValue;
    }
}

void InterchangeableEffectSlot::reset() {
    if (currentEffect) {
        currentEffect->reset();
    }

    sidechainBuffer.clear();
    bypassed = false;
    enabled = true;

    // Reset parameter smoothers
    for (auto& smoother : parameterSmoothers) {
        smoother.second->setCurrentAndTargetValue(smoother.second->getTargetValue());
    }

    resetStats();
}

void InterchangeableEffectSlot::setBypassed(bool newBypassed) {
    bypassed = newBypassed;
    if (currentEffect) {
        currentEffect->setBypassed(bypassed);
    }
    currentConfig.bypassed = bypassed;
}

bool InterchangeableEffectSlot::isBypassed() const {
    return bypassed;
}

bool InterchangeableEffectSlot::isEnabled() const {
    return enabled && currentEffect != nullptr;
}

void InterchangeableEffectSlot::setConfig(const SlotConfig& config) {
    currentConfig = config;
    enabled = config.enabled;
    bypassed = config.bypassed;

    // Apply parameter values
    for (const auto& param : config.parameters) {
        setParameter(param.first, param.second);
    }

    // Load effect if name changed
    if (currentEffect == nullptr || currentEffect->getEffectName() != config.effectName) {
        loadEffect(config.effectName, preferredType);
    }
}

InterchangeableEffectSlot::SlotConfig InterchangeableEffectSlot::getConfig() const {
    return currentConfig;
}

std::string InterchangeableEffectSlot::getEffectName() const {
    if (currentEffect) {
        return currentEffect->getEffectInfo().name;
    }
    return currentConfig.effectName;
}

std::string InterchangeableEffectSlot::getManufacturer() const {
    if (currentEffect) {
        return currentEffect->getEffectInfo().manufacturer;
    }
    return "Unknown";
}

UnifiedEffect::Type InterchangeableEffectSlot::getEffectType() const {
    if (currentEffect) {
        return currentEffect->getEffectType();
    }
    return UnifiedEffect::Type::Internal;
}

UnifiedEffect::EffectCategory InterchangeableEffectSlot::getCategory() const {
    if (currentEffect) {
        return currentEffect->getCategory();
    }
    return UnifiedEffect::EffectCategory::Utility;
}

bool InterchangeableEffectSlot::isInternal() const {
    return getEffectType() == UnifiedEffect::Type::Internal;
}

bool InterchangeableEffectSlot::isExternal() const {
    return getEffectType() == UnifiedEffect::Type::External;
}

bool InterchangeableEffectSlot::isHybrid() const {
    return getEffectType() == UnifiedEffect::Type::Hybrid;
}

bool InterchangeableEffectSlot::supportsAutomation() const {
    if (currentEffect) {
        return currentEffect->getEffectInfo().supportsAutomation;
    }
    return currentConfig.supportsAutomation;
}

bool InterchangeableEffectSlot::supportsSidechain() const {
    if (currentEffect) {
        return currentEffect->getEffectInfo().supportsSidechain;
    }
    return currentConfig.supportsSidechain;
}

bool InterchangeableEffectSlot::supportsTimelineIntegration() const {
    if (currentEffect) {
        return currentEffect->supportsTimelineIntegration();
    }
    return false;
}

bool InterchangeableEffectSlot::supportsAIControl() const {
    if (currentEffect) {
        return currentEffect->supportsAIControl();
    }
    return false;
}

bool InterchangeableEffectSlot::supportsRealTimeParameterAccess() const {
    if (currentEffect) {
        return currentEffect->supportsRealTimeParameterAccess();
    }
    return true; // Assume internal effects support this
}

void InterchangeableEffectSlot::enableAutomation(bool enabled) {
    if (currentEffect) {
        currentEffect->enableAutomation(enabled);
    }
}

void InterchangeableEffectSlot::automateParameter(const std::string& parameter, float targetValue, float timeMs) {
    if (currentEffect) {
        currentEffect->automateParameter(parameter, targetValue, timeMs);
    }
}

void InterchangeableEffectSlot::setTransportState(bool isPlaying, double ppqPosition) {
    if (currentEffect) {
        currentEffect->setTransportState(isPlaying, ppqPosition);
    }
}

void InterchangeableEffectSlot::setSongPosition(double ppqPosition) {
    if (currentEffect) {
        currentEffect->setSongPosition(ppqPosition);
    }
}

void InterchangeableEffectSlot::setTempo(double bpm) {
    if (currentEffect) {
        currentEffect->setTempo(bpm);
    }
}

void InterchangeableEffectSlot::processMidiMessage(const juce::MidiMessage& message) {
    if (currentEffect) {
        currentEffect->processMidiMessage(message);
    }
}

void InterchangeableEffectSlot::setMidiController(int ccNumber, float normalizedValue) {
    if (currentEffect) {
        currentEffect->setMidiController(ccNumber, normalizedValue);
    }
}

bool InterchangeableEffectSlot::loadPreset(const std::string& presetName) {
    // Implementation would depend on the specific effect
    // For internal effects, would load from preset library
    // For external effects, would use plugin preset system
    return false;
}

bool InterchangeableEffectSlot::savePreset(const std::string& presetName, const std::string& description) {
    // Implementation would save current parameters as a preset
    return false;
}

std::vector<std::string> InterchangeableEffectSlot::getAvailablePresets() const {
    // Implementation would return available presets for current effect
    return {};
}

InterchangeableEffectSlot::SlotStats InterchangeableEffectSlot::getStats() const {
    std::lock_guard<juce::CriticalSection> lock(statsMutex);
    return stats;
}

void InterchangeableEffectSlot::resetStats() {
    std::lock_guard<juce::CriticalSection> lock(statsMutex);
    stats = SlotStats{};
    totalSamplesProcessed = 0;
    statsResetTime = juce::Time::getCurrentTime();
}

// Private methods

bool InterchangeableEffectSlot::tryLoadInternal(const std::string& effectName) {
    // Try Airwindows first (most common internal effects)
    if (effectName.find("Airwindows") != std::string::npos || effectName == "Everglade" ||
        effectName == "Density" || effectName == "Cabs" || effectName == "GalacticReverb") {
        std::string algorithm = effectName;
        if (algorithm.find("Airwindows") != std::string::npos) {
            algorithm = algorithm.substr(12); // Remove "Airwindows " prefix
        }

        auto internalEffect = std::make_unique<AirwindowsInternalProcessor>(algorithm);
        if (internalEffect) {
            currentEffect = std::move(internalEffect);
            return true;
        }
    }

    // Try dynamics effects
    if (effectName == "FilterGate" || effectName == "Compressor" || effectName == "Limiter") {
        return loadInternalEffect(effectName, "dynamics");
    }

    // Try other internal effect types
    std::vector<std::string> internalTypes = {"reverb", "delay", "eq", "distortion"};
    for (const std::string& type : internalTypes) {
        if (loadInternalEffect(effectName, type)) {
            return true;
        }
    }

    return false;
}

bool InterchangeableEffectSlot::tryLoadExternal(const std::string& effectName) {
    // Search plugin registry for matching effect
    auto* registered = EffectRegistry::findEffect(effectName);
    if (registered && registered->isAvailable && registered->type == UnifiedEffect::Type::External) {
        return loadExternalPlugin(registered->pluginFile);
    }

    // Try common plugin names with variations
    std::vector<std::string> variations = {
        effectName,
        effectName + " VST3",
        effectName + ".vst3",
        effectName + ".component",  // AU on macOS
        effectName + ".so"          // LV2 on Linux
    };

    for (const std::string& variation : variations) {
        if (loadExternalByName(variation)) {
            return true;
        }
    }

    return false;
}

bool InterchangeableEffectSlot::tryLoadHybrid(const std::string& effectName) {
    // Hybrid effects would use both internal and external implementations
    // For now, prefer internal for Airwindows algorithms
    return tryLoadInternal(effectName);
}

void InterchangeableEffectSlot::updateParameterSmoothing(const std::string& parameterName, float targetValue) {
    auto it = parameterSmoothers.find(parameterName);
    if (it != parameterSmoothers.end()) {
        it->second->setTargetValue(targetValue);
    } else {
        // Create new smoother for this parameter
        auto smoother = std::make_unique<juce::SmoothedValue<float>>();
        smoother->reset(sampleRate, smoothingTimeMs * 0.001f);
        smoother->setCurrentAndTargetValue(targetValue);
        parameterSmoothers[parameterName] = std::move(smoother);
    }
}

void InterchangeableEffectSlot::initializeParameterSmoothers() {
    parameterSmoothers.clear();

    if (currentEffect) {
        const auto& effectInfo = currentEffect->getEffectInfo();
        for (const std::string& param : effectInfo.parameters) {
            auto smoother = std::make_unique<juce::SmoothedValue<float>>();
            smoother->reset(sampleRate, smoothingTimeMs * 0.001f);

            // Initialize with current parameter value
            float currentValue = currentEffect->getParameter(param);
            smoother->setCurrentAndTargetValue(currentValue);

            parameterSmoothers[param] = std::move(smoother);
        }
    }
}

void InterchangeableEffectSlot::applyParameterSmoothing() {
    if (!currentEffect || parameterSmoothers.empty()) {
        return;
    }

    // This would typically be called per sample in a real implementation
    // For now, simplified version that just applies smoothed values once
    for (const auto& smoother : parameterSmoothers) {
        float smoothedValue = smoother.second->getNextValue();
        currentEffect->setParameter(smoother.first, smoothedValue);
    }
}

void InterchangeableEffectSlot::updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    std::lock_guard<juce::CriticalSection> lock(statsMutex);

    if (totalSamplesProcessed % 1024 == 0) { // Update stats periodically
        stats.inputLevel = calculateRMSLevel(input);
        stats.outputLevel = calculateRMSLevel(output);
        stats.isActive = isEnabled() && !bypassed;
        stats.isProcessing = stats.isActive;
        stats.samplesProcessed += input.getNumSamples() * input.getNumChannels();
        stats.lastUpdate = juce::Time::getCurrentTime();

        // Estimate CPU usage (simplified)
        static auto lastUpdateTime = juce::Time::getCurrentTime();
        auto now = juce::Time::getCurrentTime();
        double timeDiff = now.toMilliseconds() - lastUpdateTime.toMilliseconds();
        if (timeDiff > 0) {
            stats.cpuUsage = static_cast<int>((input.getNumSamples() / sampleRate) / (timeDiff / 1000.0));
        }
        lastUpdateTime = now;
    }

    totalSamplesProcessed += input.getNumSamples() * input.getNumChannels();
}

float InterchangeableEffectSlot::calculateRMSLevel(const juce::AudioBuffer<float>& buffer) const {
    float sum = 0.0f;
    int totalSamples = 0;

    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        const float* channelData = buffer.getReadPointer(ch);
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            float sample = channelData[i];
            sum += sample * sample;
        }
        totalSamples += buffer.getNumSamples();
    }

    if (totalSamples > 0) {
        float rms = std::sqrt(sum / totalSamples);
        return juce::Decibels::gainToDecibels(rms + 1e-8f);
    }

    return -100.0f;
}

} // namespace effects
} // namespace schill