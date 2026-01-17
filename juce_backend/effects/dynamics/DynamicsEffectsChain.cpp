#include "dynamics/DynamicsEffectsChain.h"

namespace schill {
namespace dynamics {

//==============================================================================
// ChainSlot Implementation
//==============================================================================

ChainSlot::ChainSlot(int slotIndex, const SlotConfig& config) :
    slotIndex(slotIndex),
    currentConfig(config),
    targetConfig(config),
    currentBypassMode(BypassMode::Normal),
    soloActive(false),
    muteActive(false),
    configurationChanged(false) {

    // Initialize smoothed parameters
    smoothedWetDryMix.reset(44100.0, 0.01f);
    smoothedOutputGain.reset(44100.0, 0.01f);
    smoothedWetDryMix.setCurrentAndTargetValue(config.wetDryMix * 0.01f);
    smoothedOutputGain.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(config.outputGain));

    // Initialize buffers
    dryBuffer.setSize(2, 512);
    wetBuffer.setSize(2, 512);
    dryBuffer.clear();
    wetBuffer.clear();

    // Initialize stats
    resetStats();
}

bool ChainSlot::initialize() {
    updateEffectForType();
    return true;
}

void ChainSlot::reset() {
    if (filterGate) {
        filterGate->reset();
    }
    if (dynamicsProcessor) {
        dynamicsProcessor->reset();
    }

    dryBuffer.clear();
    wetBuffer.clear();

    // Reset smoothed parameters
    smoothedWetDryMix.setCurrentAndTargetValue(currentConfig.wetDryMix * 0.01f);
    smoothedOutputGain.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(currentConfig.outputGain));

    // Reset crossfade state
    isCrossfading = false;
    crossfadeProgress = 0.0f;
    previousConfig.reset();

    resetStats();
}

void ChainSlot::prepareToPlay(double newSampleRate, int newSamplesPerBlock) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;

    // Update buffer sizes
    dryBuffer.setSize(2, samplesPerBlock);
    wetBuffer.setSize(2, samplesPerBlock);

    // Update smoothed parameters sample rates
    smoothedWetDryMix.reset(sampleRate, 0.01f);
    smoothedOutputGain.reset(sampleRate, 0.01f);
    crossfadeGain.reset(sampleRate, 0.001f);

    // Prepare effects
    if (filterGate) {
        filterGate->prepareToPlay(sampleRate, samplesPerBlock);
    }
    if (dynamicsProcessor) {
        dynamicsProcessor->prepareToPlay(sampleRate, samplesPerBlock);
    }

    // Initialize FFT for analysis if needed
    if (!fft) {
        fft = std::make_unique<juce::dsp::FFT>(11); // 2048 samples
        analysisBuffer.resize(2048);
    }
}

void ChainSlot::processBlock(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (numSamples == 0) {
        return;
    }

    // Update crossfade if active
    if (isCrossfading) {
        updateCrossfade();
    }

    // Store dry signal for wet/dry mixing
    if (currentConfig.wetDryMix < 100.0f) {
        dryBuffer.makeCopyOf(buffer);
    }

    // Handle bypass modes
    applyBypassMode(buffer);

    // Process effect if not bypassed or in solo mode
    if (currentBypassMode == BypassMode::Normal || currentBypassMode == BypassMode::Solo) {
        processEffect(buffer);
    }

    // Apply wet/dry mixing
    processWetDryMix(buffer);

    // Apply output gain
    float outputGainLinear = smoothedOutputGain.getNextValue();
    buffer.applyGain(outputGainLinear);

    // Update solo/mute states
    updateSoloMuteStates();

    // Update statistics
    updateStats(buffer, buffer);
}

void ChainSlot::processSidechain(const juce::AudioBuffer<float>& sidechainBuffer) {
    if (filterGate) {
        filterGate->processSidechainInput(sidechainBuffer);
    }
    if (dynamicsProcessor) {
        dynamicsProcessor->processSidechainInput(sidechainBuffer);
    }
}

void ChainSlot::processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer) {
    // Combine buffers for processing
    juce::AudioBuffer<float> stereoBuffer(2, leftBuffer.getNumSamples());
    stereoBuffer.copyFrom(0, 0, leftBuffer, 0, 0, leftBuffer.getNumSamples());
    stereoBuffer.copyFrom(1, 0, rightBuffer, 0, 0, rightBuffer.getNumSamples());

    processBlock(stereoBuffer);

    // Copy back to individual buffers
    leftBuffer.copyFrom(0, 0, stereoBuffer, 0, 0, leftBuffer.getNumSamples());
    rightBuffer.copyFrom(0, 0, stereoBuffer, 1, 0, rightBuffer.getNumSamples());
}

void ChainSlot::setConfig(const SlotConfig& config) {
    targetConfig = config;

    // Start crossfade if type or major parameters changed
    if (config.type != currentConfig.type ||
        std::abs(config.wetDryMix - currentConfig.wetDryMix) > 10.0f) {
        startCrossfade(config, 50.0f); // 50ms crossfade
    } else {
        currentConfig = config;
        updateEffectForType();
    }

    // Update smoothed parameters
    smoothedWetDryMix.setTargetValue(config.wetDryMix * 0.01f);
    smoothedOutputGain.setTargetValue(juce::Decibels::decibelsToGain(config.outputGain));

    configurationChanged = true;
}

void ChainSlot::setBypassMode(BypassMode mode) {
    currentBypassMode = mode;
}

void ChainSlot::setWetDryMix(float mixPercent) {
    currentConfig.wetDryMix = juce::jlimit(0.0f, 100.0f, mixPercent);
    smoothedWetDryMix.setTargetValue(currentConfig.wetDryMix * 0.01f);
}

void ChainSlot::setOutputGain(float gainDb) {
    currentConfig.outputGain = gainDb;
    smoothedOutputGain.setTargetValue(juce::Decibels::decibelsToGain(gainDb));
}

void ChainSlot::setFilterGateConfig(const FilterGateConfig& config) {
    if (filterGate) {
        filterGate->setConfig(config);
    }
}

FilterGateConfig ChainSlot::getFilterGateConfig() const {
    return filterGate ? filterGate->getConfig() : FilterGateConfig{};
}

void ChainSlot::setCompressorConfig(const CompressorConfig& config) {
    if (dynamicsProcessor) {
        dynamicsProcessor->setCompressorConfig(config);
    }
}

CompressorConfig ChainSlot::getCompressorConfig() const {
    return dynamicsProcessor ? dynamicsProcessor->getCompressorConfig() : CompressorConfig{};
}

void ChainSlot::setLimiterConfig(const LimiterConfig& config) {
    if (dynamicsProcessor) {
        dynamicsProcessor->setLimiterConfig(config);
    }
}

LimiterConfig ChainSlot::getLimiterConfig() const {
    return dynamicsProcessor ? dynamicsProcessor->getLimiterConfig() : LimiterConfig{};
}

ChainSlot::SlotStats ChainSlot::getStats() const {
    return stats;
}

void ChainSlot::resetStats() {
    stats = SlotStats{};
    statsResetTime = juce::Time::getCurrentTime();
    samplesProcessed = 0;
}

void ChainSlot::setSoloGroup(int group) {
    currentConfig.soloGroup = group;
}

void ChainSlot::setMuteGroup(int group) {
    currentConfig.muteGroup = group;
}

bool ChainSlot::loadPreset(const std::string& presetName) {
    // Implementation would load from preset file
    return false;
}

bool ChainSlot::savePreset(const std::string& presetName, const std::string& description) {
    // Implementation would save to preset file
    return false;
}

std::vector<std::string> ChainSlot::getAvailablePresets() const {
    return {
        "Default Filter Gate",
        "Sidechain Ducker",
        "Vocal Compressor",
        "Drum Compressor",
        "Master Limiter"
    };
}

void ChainSlot::processMidiMessage(const juce::MidiMessage& message) {
    if (filterGate) {
        filterGate->processMidiMessage(message);
    }
}

void ChainSlot::setMidiController(int ccNumber, float normalizedValue) {
    if (filterGate) {
        filterGate->setMidiController(ccNumber, normalizedValue);
    }
}

void ChainSlot::enableAutomation(bool enabled) {
    currentConfig.automationEnabled = enabled;
}

void ChainSlot::automateParameter(const std::string& parameter, float targetValue, float time) {
    if (dynamicsProcessor) {
        dynamicsProcessor->automateParameter(juce::String(parameter), targetValue, time);
    }
}

float ChainSlot::getParameterValue(const std::string& parameter) const {
    // Implementation would return current parameter value
    return 0.0f;
}

void ChainSlot::setParameterValue(const std::string& parameter, float value) {
    // Implementation would set parameter value
}

void ChainSlot::processEffect(juce::AudioBuffer<float>& buffer) {
    switch (currentConfig.type) {
        case SlotType::FilterGate:
            if (filterGate) {
                filterGate->processBlock(buffer);
            }
            break;

        case SlotType::Compressor:
        case SlotType::Limiter:
        case SlotType::Gate:
        case SlotType::Expander:
        case SlotType::DeEsser:
        case SlotType::CharacterProcessor:
        case SlotType::MultibandCompressor:
        case SlotType::TransientShaper:
            if (dynamicsProcessor) {
                dynamicsProcessor->processBlock(buffer);
            }
            break;

        default:
            break;
    }
}

void ChainSlot::processWetDryMix(juce::AudioBuffer<float>& buffer) {
    if (currentConfig.wetDryMix >= 100.0f || dryBuffer.getNumSamples() != buffer.getNumSamples()) {
        return; // No wet/dry mixing needed
    }

    float wetAmount = smoothedWetDryMix.getNextValue();
    float dryAmount = 1.0f - wetAmount;

    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    for (int ch = 0; ch < numChannels; ++ch) {
        float* wetData = buffer.getWritePointer(ch);
        const float* dryData = dryBuffer.getReadPointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            wetData[i] = wetData[i] * wetAmount + dryData[i] * dryAmount;
        }
    }
}

void ChainSlot::applyBypassMode(juce::AudioBuffer<float>& buffer) {
    switch (currentBypassMode) {
        case BypassMode::Normal:
            // Process normally
            break;

        case BypassMode::Bypassed:
            // Skip processing, signal passes through unchanged
            break;

        case BypassMode::Muted:
            buffer.clear();
            break;

        case BypassMode::Solo:
            // Process normally (solo is handled at chain level)
            break;
    }
}

void ChainSlot::startCrossfade(const SlotConfig& newConfig, float crossfadeTimeMs) {
    previousConfig = std::make_unique<SlotConfig>(currentConfig);
    targetConfig = newConfig;
    isCrossfading = true;
    crossfadeProgress = 0.0f;
    crossfadeGain.setCurrentAndTargetValue(1.0f);

    // Set up crossfade rate
    float crossfadeRate = 1.0f / (crossfadeTimeMs * 0.001f * sampleRate);
    crossfadeGain.reset(sampleRate, crossfadeRate);
}

void ChainSlot::updateCrossfade() {
    if (!isCrossfading) {
        return;
    }

    crossfadeProgress += 1.0f / samplesPerBlock;
    float fadeGain = crossfadeGain.getNextValue();

    if (crossfadeProgress >= 1.0f) {
        // Crossfade complete
        isCrossfading = false;
        currentConfig = targetConfig;
        previousConfig.reset();
        updateEffectForType();
    }
}

void ChainSlot::updateEffectForType() {
    // Reinitialize effect based on current type
    switch (currentConfig.type) {
        case SlotType::FilterGate:
            if (!filterGate) {
                filterGate = std::make_unique<FilterGate>();
                filterGate->prepareToPlay(sampleRate, samplesPerBlock);
            }
            dynamicsProcessor.reset();
            break;

        case SlotType::Compressor:
            if (!dynamicsProcessor) {
                dynamicsProcessor = std::make_unique<DynamicsProcessor>();
                dynamicsProcessor->prepareToPlay(sampleRate, samplesPerBlock);
                dynamicsProcessor->initialize(DynamicsProcessorType::Compressor);
            }
            filterGate.reset();
            break;

        case SlotType::Limiter:
            if (!dynamicsProcessor) {
                dynamicsProcessor = std::make_unique<DynamicsProcessor>();
                dynamicsProcessor->prepareToPlay(sampleRate, samplesPerBlock);
                dynamicsProcessor->initialize(DynamicsProcessorType::Limiter);
            }
            filterGate.reset();
            break;

        default:
            // Create generic dynamics processor for other types
            if (!dynamicsProcessor) {
                dynamicsProcessor = std::make_unique<DynamicsProcessor>();
                dynamicsProcessor->prepareToPlay(sampleRate, samplesPerBlock);
            }
            filterGate.reset();
            break;
    }

    reinitializeEffect();
}

void ChainSlot::reinitializeEffect() {
    // Reinitialize with current configuration
    switch (currentConfig.type) {
        case SlotType::FilterGate:
            if (filterGate) {
                FilterGateConfig config;
                // Apply configuration from preset if available
                if (!currentConfig.preset.empty()) {
                    // Load preset configuration
                    config = FilterGateFactory::createLowFreqGatePreset();
                }
                filterGate->initialize(config);
            }
            break;

        case SlotType::Compressor:
            if (dynamicsProcessor) {
                CompressorConfig config;
                if (!currentConfig.preset.empty()) {
                    config = DynamicsProcessorFactory::createVocalCompressorPreset();
                }
                dynamicsProcessor->initializeCompressor(config);
            }
            break;

        case SlotType::Limiter:
            if (dynamicsProcessor) {
                LimiterConfig config;
                if (!currentConfig.preset.empty()) {
                    config = DynamicsProcessorFactory::createLimiterPreset();
                }
                dynamicsProcessor->initializeLimiter(config);
            }
            break;

        default:
            break;
    }
}

void ChainSlot::processSidechainForEffect(juce::AudioBuffer<float>& buffer) {
    // Sidechain routing is handled by the parent chain
    // This method could apply sidechain filtering if needed
}

void ChainSlot::updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    if (samplesProcessed % 1024 == 0) { // Update stats periodically
        // Calculate RMS levels
        float inputRMS = 0.0f;
        float outputRMS = 0.0f;
        int totalSamples = 0;

        for (int ch = 0; ch < input.getNumChannels(); ++ch) {
            const float* inChannel = input.getReadPointer(ch);
            const float* outChannel = output.getReadPointer(ch);

            for (int i = 0; i < input.getNumSamples(); ++i) {
                inputRMS += inChannel[i] * inChannel[i];
                outputRMS += outChannel[i] * outChannel[i];
            }
            totalSamples += input.getNumSamples();
        }

        if (totalSamples > 0) {
            inputRMS = std::sqrt(inputRMS / totalSamples);
            outputRMS = std::sqrt(outputRMS / totalSamples);

            stats.inputLevel = juce::Decibels::gainToDecibels(inputRMS + 1e-8f);
            stats.outputLevel = juce::Decibels::gainToDecibels(outputRMS + 1e-8f);
        }

        stats.wetDryMix = currentConfig.wetDryMix;
        stats.outputGain = currentConfig.outputGain;
        stats.latency = 0.0f; // Would be calculated from actual processing
        stats.isActive = currentConfig.enabled && (currentBypassMode == BypassMode::Normal || currentBypassMode == BypassMode::Solo);
        stats.hasSidechainInput = false; // Would be tracked from actual sidechain routing

        // Estimate CPU usage (simplified)
        static auto lastUpdateTime = juce::Time::getCurrentTime();
        auto now = juce::Time::getCurrentTime();
        double timeDiff = now.toMilliseconds() - lastUpdateTime.toMilliseconds();
        if (timeDiff > 0) {
            stats.cpuUsage = (input.getNumSamples() / sampleRate) / (timeDiff / 1000.0);
        }
        lastUpdateTime = now;
    }

    samplesProcessed += input.getNumSamples();
}

void ChainSlot::analyzeAudio(const juce::AudioBuffer<float>& buffer) {
    if (!fft || buffer.getNumSamples() > fft->getSize()) {
        return;
    }

    const float* channelData = buffer.getReadPointer(0);
    std::copy(channelData, channelData + buffer.getNumSamples(), analysisBuffer.begin());
    std::fill(analysisBuffer.begin() + buffer.getNumSamples(), analysisBuffer.end(), 0.0f);

    // Perform FFT
    fft->performFrequencyOnlyForwardTransform(analysisBuffer.data());
}

void ChainSlot::updateSoloMuteStates() {
    // Solo and mute logic is handled at the chain level
    // This slot would respond to chain-level solo/mute commands
}

//==============================================================================
// DynamicsEffectsChain Implementation
//==============================================================================

DynamicsEffectsChain::DynamicsEffectsChain() {
    // Initialize master gain
    smoothedMasterGain.reset(44100.0, 0.1f);

    // Initialize FFT for analysis
    fft = std::make_unique<juce::dsp::FFT>(11); // 2048 samples
    spectrumBuffer.resize(2048);
    analysisBuffer.resize(2048);

    // Initialize processing buffers
    parallelBuffer.setSize(2, 512);
    dryBuffer.setSize(2, 512);

    reset();
}

DynamicsEffectsChain::~DynamicsEffectsChain() = default;

bool DynamicsEffectsChain::initialize(const EffectsChainConfig& config) {
    currentConfig = config;
    sampleRate = config.sampleRate;
    samplesPerBlock = config.blockSize;

    // Create slots based on configuration
    clearAllSlots();
    for (const auto& slotConfig : config.slots) {
        addSlot(slotConfig);
    }

    // Initialize processing modes
    parallelMode = config.enableParallel;
    midSideMode = config.enableMidSide;
    sidechainEnabled = config.enableSidechain;
    autoGainEnabled = config.enableAutoGain;
    loudnessNormalization = config.enableLoudnessNormalization;

    // Setup multiband filters if needed
    if (midSideMode) {
        msEncoder = std::make_unique<juce::dsp::MidSideEncoder<float>>();
        msDecoder = std::make_unique<juce::dsp::MidSideDecoder<float>>();

        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = samplesPerBlock;
        spec.numChannels = 2;

        msEncoder->prepare(spec);
        msDecoder->prepare(spec);
    }

    return true;
}

void DynamicsEffectsChain::reset() {
    // Reset all slots
    for (auto& slot : slots) {
        slot->reset();
    }

    // Reset processing state
    parallelBuffer.clear();
    dryBuffer.clear();
    masterOutputGain = 0.0f;
    smoothedMasterGain.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(masterOutputGain));

    // Reset sidechain routing
    sidechainRouting.clear();
    sidechainBuffers.clear();

    // Reset statistics
    totalSamplesProcessed = 0;
    statsResetTime = juce::Time::getCurrentTime();
    stats = ChainStats{};
}

void DynamicsEffectsChain::prepareToPlay(double newSampleRate, int newSamplesPerBlock) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;

    // Update buffer sizes
    parallelBuffer.setSize(2, samplesPerBlock);
    dryBuffer.setSize(2, samplesPerBlock);

    // Update smoothed parameters
    smoothedMasterGain.reset(sampleRate, 0.1f);
    smoothedMasterGain.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(masterOutputGain));

    // Prepare all slots
    for (auto& slot : slots) {
        slot->prepareToPlay(sampleRate, samplesPerBlock);
    }

    // Prepare Mid/Side processing if enabled
    if (midSideMode && msEncoder && msDecoder) {
        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = samplesPerBlock;
        spec.numChannels = 2;

        msEncoder->prepare(spec);
        msDecoder->prepare(spec);
    }

    // Update analysis buffer sizes
    if (fft && spectrumBuffer.size() != samplesPerBlock) {
        spectrumBuffer.resize(samplesPerBlock);
        analysisBuffer.resize(samplesPerBlock);
    }
}

void DynamicsEffectsChain::processBlock(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (numSamples == 0 || slots.empty()) {
        return;
    }

    // Store original buffer for parallel processing if needed
    if (parallelMode) {
        dryBuffer.makeCopyOf(buffer);
        parallelBuffer.makeCopyOf(buffer);
    }

    // Apply sidechain routing first
    processSidechainRouting(buffer);

    // Process based on mode
    if (parallelMode) {
        processParallelMode(buffer);
    } else {
        processSeriesMode(buffer);
    }

    // Apply Mid/Side processing if enabled
    if (midSideMode && numChannels >= 2) {
        processMidSideMode(buffer);
    }

    // Apply master output gain
    applyMasterOutput(buffer);

    // Apply auto gain compensation if enabled
    if (autoGainEnabled) {
        updateAutoGain(dryBuffer, buffer);
    }

    // Apply loudness normalization if enabled
    if (loudnessNormalization) {
        applyLoudnessNormalization(buffer);
    }

    // Update statistics
    updateStats(buffer, buffer);
}

void DynamicsEffectsChain::processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer) {
    // Combine buffers for processing
    juce::AudioBuffer<float> stereoBuffer(2, leftBuffer.getNumSamples());
    stereoBuffer.copyFrom(0, 0, leftBuffer, 0, 0, leftBuffer.getNumSamples());
    stereoBuffer.copyFrom(1, 0, rightBuffer, 0, 0, rightBuffer.getNumSamples());

    processBlock(stereoBuffer);

    // Copy back to individual buffers
    leftBuffer.copyFrom(0, 0, stereoBuffer, 0, 0, leftBuffer.getNumSamples());
    rightBuffer.copyFrom(0, 0, stereoBuffer, 1, 0, rightBuffer.getNumSamples());
}

void DynamicsEffectsChain::processMultichannel(juce::AudioBuffer<float>& buffer, int numChannels) {
    // For now, limit to stereo processing
    if (numChannels > 2) {
        juce::AudioBuffer<float> stereoBuffer(2, buffer.getNumSamples());
        stereoBuffer.copyFrom(0, 0, buffer, 0, 0, buffer.getNumSamples());
        stereoBuffer.copyFrom(1, 0, buffer, 1, 0, buffer.getNumSamples());

        processBlock(stereoBuffer);

        buffer.copyFrom(0, 0, stereoBuffer, 0, 0, buffer.getNumSamples());
        buffer.copyFrom(1, 0, stereoBuffer, 1, 0, buffer.getNumSamples());
    } else {
        processBlock(buffer);
    }
}

void DynamicsEffectsChain::processSidechainInput(const std::string& sourceName, const juce::AudioBuffer<float>& sidechainBuffer) {
    sidechainBuffers[sourceName] = sidechainBuffer;
    routeSidechainToSlots();
}

void DynamicsEffectsChain::processSidechainInput(const juce::String& sourceName, const float* sidechainData, int numSamples) {
    juce::AudioBuffer<float> buffer(1, numSamples);
    buffer.copyFrom(0, 0, sidechainData, numSamples);
    processSidechainInput(sourceName.toStdString(), buffer);
}

void DynamicsEffectsChain::setConfig(const EffectsChainConfig& config) {
    currentConfig = config;

    // Update slots configuration
    clearAllSlots();
    for (const auto& slotConfig : config.slots) {
        addSlot(slotConfig);
    }

    // Update processing modes
    parallelMode = config.enableParallel;
    midSideMode = config.enableMidSide;
    sidechainEnabled = config.enableSidechain;
    autoGainEnabled = config.enableAutoGain;
    loudnessNormalization = config.enableLoudnessNormalization;

    // Update master settings
    masterOutputGain = config.masterOutputGain;
    smoothedMasterGain.setTargetValue(juce::Decibels::decibelsToGain(masterOutputGain));
}

int DynamicsEffectsChain::addSlot(const SlotConfig& config) {
    int slotIndex = static_cast<int>(slots.size());
    auto slot = std::make_unique<ChainSlot>(slotIndex, config);
    slot->initialize();
    slot->prepareToPlay(sampleRate, samplesPerBlock);
    slots.push_back(std::move(slot));
    return slotIndex;
}

bool DynamicsEffectsChain::removeSlot(int slotIndex) {
    if (!isValidSlotIndex(slotIndex)) {
        return false;
    }

    slots.erase(slots.begin() + slotIndex);

    // Reindex remaining slots
    for (size_t i = 0; i < slots.size(); ++i) {
        slots[i]->slotIndex = static_cast<int>(i);
    }

    reorganizeSlots();
    return true;
}

bool DynamicsEffectsChain::insertSlot(int slotIndex, const SlotConfig& config) {
    if (slotIndex < 0 || slotIndex > static_cast<int>(slots.size())) {
        return false;
    }

    auto slot = std::make_unique<ChainSlot>(slotIndex, config);
    slot->initialize();
    slot->prepareToPlay(sampleRate, samplesPerBlock);

    slots.insert(slots.begin() + slotIndex, std::move(slot));

    // Reindex subsequent slots
    for (int i = slotIndex; i < static_cast<int>(slots.size()); ++i) {
        slots[i]->slotIndex = i;
    }

    return true;
}

bool DynamicsEffectsChain::swapSlots(int slotIndex1, int slotIndex2) {
    if (!isValidSlotIndex(slotIndex1) || !isValidSlotIndex(slotIndex2)) {
        return false;
    }

    std::swap(slots[slotIndex1], slots[slotIndex2]);
    slots[slotIndex1]->slotIndex = slotIndex1;
    slots[slotIndex2]->slotIndex = slotIndex2;

    return true;
}

void DynamicsEffectsChain::clearAllSlots() {
    slots.clear();
}

ChainSlot* DynamicsEffectsChain::getSlot(int slotIndex) {
    return isValidSlotIndex(slotIndex) ? slots[slotIndex].get() : nullptr;
}

const ChainSlot* DynamicsEffectsChain::getSlot(int slotIndex) const {
    return isValidSlotIndex(slotIndex) ? slots[slotIndex].get() : nullptr;
}

std::vector<ChainSlot*> DynamicsEffectsChain::getEnabledSlots() {
    std::vector<ChainSlot*> enabled;
    for (auto& slot : slots) {
        if (slot->isEnabled()) {
            enabled.push_back(slot.get());
        }
    }
    return enabled;
}

std::vector<ChainSlot*> DynamicsEffectsChain::getAllSlots() {
    std::vector<ChainSlot*> all;
    for (auto& slot : slots) {
        all.push_back(slot.get());
    }
    return all;
}

void DynamicsEffectsChain::setProcessingMode(const std::string& mode) {
    if (mode == "parallel") {
        parallelMode = true;
    } else if (mode == "series") {
        parallelMode = false;
    } else if (mode == "midside") {
        midSideMode = true;
    }
}

void DynamicsEffectsChain::enableParallelProcessing(bool enabled) {
    parallelMode = enabled;
}

void DynamicsEffectsChain::enableMidSideProcessing(bool enabled) {
    midSideMode = enabled;
}

void DynamicsEffectsChain::registerSidechainSource(const std::string& name, std::function<void(juce::AudioBuffer<float>&)> callback) {
    sidechainSources[name] = callback;
}

void DynamicsEffectsChain::unregisterSidechainSource(const std::string& name) {
    sidechainSources.erase(name);
}

std::vector<std::string> DynamicsEffectsChain::getAvailableSidechainSources() const {
    std::vector<std::string> sources;
    for (const auto& pair : sidechainSources) {
        sources.push_back(pair.first);
    }
    return sources;
}

void DynamicsEffectsChain::setSoloGroupSolo(int group) {
    for (auto& slot : slots) {
        if (slot->getSoloGroup() == group) {
            slot->setBypassMode(ChainSlot::BypassMode::Solo);
        }
    }
}

void DynamicsEffectsChain::setMuteGroupMute(int group) {
    for (auto& slot : slots) {
        if (slot->getMuteGroup() == group) {
            // Mute implementation would be handled in processing
        }
    }
}

void DynamicsEffectsChain::clearAllSoloMuteGroups() {
    for (auto& slot : slots) {
        if (slot->getBypassMode() == ChainSlot::BypassMode::Solo) {
            slot->setBypassMode(ChainSlot::BypassMode::Normal);
        }
    }
}

bool DynamicsEffectsChain::anySlotSoloed() const {
    for (const auto& slot : slots) {
        if (slot->isSolo()) {
            return true;
        }
    }
    return false;
}

void DynamicsEffectsChain::setMasterOutputGain(float gainDb) {
    masterOutputGain = gainDb;
    smoothedMasterGain.setTargetValue(juce::Decibels::decibelsToGain(gainDb));
}

float DynamicsEffectsChain::getMasterOutputGain() const {
    return masterOutputGain;
}

void DynamicsEffectsChain::enableAutoGainCompensation(bool enabled) {
    autoGainEnabled = enabled;
}

void DynamicsEffectsChain::enableLoudnessNormalization(bool enabled) {
    loudnessNormalization = enabled;
}

DynamicsEffectsChain::ChainStats DynamicsEffectsChain::getStats() const {
    return stats;
}

void DynamicsEffectsChain::resetStats() {
    stats = ChainStats{};
    totalSamplesProcessed = 0;
    statsResetTime = juce::Time::getCurrentTime();
}

void DynamicsEffectsChain::updateStats() {
    calculateChainStatistics();
}

bool DynamicsEffectsChain::loadChainPreset(const std::string& presetName) {
    // Implementation would load preset from file
    return false;
}

bool DynamicsEffectsChain::saveChainPreset(const std::string& presetName, const std::string& description) {
    // Implementation would save preset to file
    return false;
}

bool DynamicsEffectsChain::deleteChainPreset(const std::string& presetName) {
    // Implementation would delete preset file
    return false;
}

std::vector<DynamicsEffectsChain::ChainPreset> DynamicsEffectsChain::getAvailablePresets() const {
    return {
        {
            "Vocal Chain",
            "Complete vocal processing chain",
            "System",
            {},
            EffectsChainConfig{},
            juce::Time::getCurrentTime(),
            juce::Time::getCurrentTime(),
            "1.0"
        }
    };
}

std::vector<DynamicsEffectsChain::ChainPreset> DynamicsEffectsChain::getRecentPresets(int maxCount) const {
    return getAvailablePresets(); // Simplified - would track recent usage
}

std::vector<DynamicsEffectsChain::ChainTemplate> DynamicsEffectsChain::getAvailableTemplates() const {
    return {
        {
            "Vocal Template",
            "Template for vocal processing",
            {},
            EffectsChainConfig{},
            "Vocals"
        },
        {
            "Drum Bus Template",
            "Template for drum bus processing",
            {},
            EffectsChainConfig{},
            "Drums"
        }
    };
}

bool DynamicsEffectsChain::loadTemplate(const std::string& templateName) {
    // Implementation would load template
    return false;
}

bool DynamicsEffectsChain::saveTemplate(const std::string& templateName, const std::vector<SlotConfig>& slotConfigs, const std::string& category) {
    // Implementation would save template
    return false;
}

void DynamicsEffectsChain::processMidiMessage(const juce::MidiMessage& message) {
    for (auto& slot : slots) {
        slot->processMidiMessage(message);
    }
}

void DynamicsEffectsChain::setMidiController(const std::string& slotName, const std::string& parameter, int ccNumber) {
    for (auto& slot : slots) {
        if (slot->currentConfig.name == slotName) {
            slot->setMidiController(ccNumber, 0.0f); // Simplified
            break;
        }
    }
}

void DynamicsEffectsChain::setGlobalMidiController(int ccNumber, const std::string& parameter) {
    // Implementation would route MIDI to all applicable slots
}

void DynamicsEffectsChain::enableChainAutomation(bool enabled) {
    currentConfig.automationEnabled = enabled;
}

void DynamicsEffectsChain::automateSlotParameter(int slotIndex, const std::string& parameter, float targetValue, float time) {
    if (isValidSlotIndex(slotIndex)) {
        slots[slotIndex]->automateParameter(parameter, targetValue, time);
    }
}

void DynamicsEffectsChain::automateChainParameter(const std::string& parameter, float targetValue, float time) {
    if (parameter == "masterGain") {
        setMasterOutputGain(targetValue);
    }
}

void DynamicsEffectsChain::setMaximumLatency(int maxLatencyMs) {
    maxLatencyMs = maxLatencyMs;
}

int DynamicsEffectsChain::getMaximumLatency() const {
    return maxLatencyMs;
}

void DynamicsEffectsChain::enableLatencyCompensation(bool enabled) {
    latencyCompensation = enabled;
}

bool DynamicsEffectsChain::isLatencyCompensated() const {
    return latencyCompensation;
}

DynamicsEffectsChain::ValidationResult DynamicsEffectsChain::validateConfiguration() const {
    ValidationResult result;
    result.isValid = true;

    // Check for valid slot configurations
    for (const auto& slot : slots) {
        const auto& config = slot->getConfig();

        if (config.name.empty()) {
            result.errors.push_back("Slot " + std::to_string(slot->slotIndex) + " has empty name");
            result.isValid = false;
        }

        if (config.wetDryMix < 0.0f || config.wetDryMix > 100.0f) {
            result.errors.push_back("Slot " + config.name + " has invalid wet/dry mix");
            result.isValid = false;
        }
    }

    // Check for looped routing (simplified)
    for (size_t i = 0; i < slots.size(); ++i) {
        for (size_t j = i + 1; j < slots.size(); ++j) {
            if (slots[i]->currentConfig.name == slots[j]->currentConfig.name) {
                result.warnings.push_back("Duplicate slot name: " + slots[i]->currentConfig.name);
            }
        }
    }

    return result;
}

std::vector<std::string> DynamicsEffectsChain::getConfigurationWarnings() const {
    ValidationResult validation = validateConfiguration();
    return validation.warnings;
}

bool DynamicsEffectsChain::copySlot(int slotIndex) {
    if (!isValidSlotIndex(slotIndex)) {
        return false;
    }

    clipboardSlot = slots[slotIndex]->getConfig();
    clipboardValid = true;
    return true;
}

bool DynamicsEffectsChain::pasteSlot(int targetSlotIndex) {
    if (!clipboardValid || !isValidSlotIndex(targetSlotIndex)) {
        return false;
    }

    slots[targetSlotIndex]->setConfig(clipboardSlot);
    return true;
}

bool DynamicsEffectsChain::canPaste() const {
    return clipboardValid;
}

void DynamicsEffectsChain::clearClipboard() {
    clipboardValid = false;
}

void DynamicsEffectsChain::beginEdit(const std::string& description) {
    if (!isEditing) {
        isEditing = true;
        saveEditState(description);
    }
}

void DynamicsEffectsChain::endEdit() {
    if (isEditing) {
        isEditing = false;
    }
}

void DynamicsEffectsChain::undo() {
    if (!undoStack.empty() && !isEditing) {
        EditState state = undoStack.back();
        undoStack.pop_back();

        restoreEditState(state);
        clearRedoStack();
    }
}

void DynamicsEffectsChain::redo() {
    if (!redoStack.empty() && !isEditing) {
        EditState state = redoStack.back();
        redoStack.pop_back();

        saveEditState("Before redo");
        restoreEditState(state);
    }
}

bool DynamicsEffectsChain::canUndo() const {
    return !undoStack.empty() && !isEditing;
}

bool DynamicsEffectsChain::canRedo() const {
    return !redoStack.empty() && !isEditing;
}

std::vector<std::string> DynamicsEffectsChain::getUndoHistory() const {
    std::vector<std::string> history;
    for (const auto& state : undoStack) {
        history.push_back(state.description);
    }
    return history;
}

std::vector<std::string> DynamicsEffectsChain::getRedoHistory() const {
    std::vector<std::string> history;
    for (const auto& state : redoStack) {
        history.push_back(state.description);
    }
    return history;
}

bool DynamicsEffectsChain::exportChain(const juce::File& file) {
    std::string jsonData = exportChainAsJSON();
    return exportToFile(file, jsonData);
}

bool DynamicsEffectsChain::importChain(const juce::File& file) {
    std::string jsonData;
    if (importFromFile(file, jsonData)) {
        return importChainFromJSON(jsonData);
    }
    return false;
}

std::string DynamicsEffectsChain::exportChainAsJSON() const {
    // Simplified JSON export
    return "{\n  \"chain\": {\n    \"name\": \"" + currentConfig.name + "\"\n  }\n}";
}

bool DynamicsEffectsChain::importChainFromJSON(const std::string& jsonString) {
    // Simplified JSON import
    return true;
}

DynamicsEffectsChain::UIState DynamicsEffectsChain::getUIState() const {
    UIState state;
    for (const auto& slot : slots) {
        if (slot->currentConfig.showGUI) {
            state.openSlots.push_back(slot->currentConfig.name);
        }
    }
    return state;
}

void DynamicsEffectsChain::setUIState(const UIState& state) {
    for (const auto& slotName : state.openSlots) {
        for (auto& slot : slots) {
            if (slot->currentConfig.name == slotName) {
                slot->currentConfig.showGUI = true;
            }
        }
    }
}

void DynamicsEffectsChain::processSeriesMode(juce::AudioBuffer<float>& buffer) {
    juce::AudioBuffer<float> currentBuffer = buffer;

    for (auto& slot : slots) {
        if (!slot->isEnabled()) {
            continue;
        }

        // Handle solo/mute logic
        if (anySlotSoloed() && !slot->isSolo()) {
            continue; // Skip non-solo slots when any slot is soloed
        }

        if (slot->isMuted()) {
            continue; // Skip muted slots
        }

        slot->processBlock(currentBuffer);
    }
}

void DynamicsEffectsChain::processParallelMode(juce::AudioBuffer<float>& buffer) {
    std::vector<juce::AudioBuffer<float>> slotBuffers;

    // Process each enabled slot independently
    for (auto& slot : slots) {
        if (!slot->isEnabled()) {
            continue;
        }

        if (anySlotSoloed() && !slot->isSolo()) {
            continue;
        }

        if (slot->isMuted()) {
            continue;
        }

        juce::AudioBuffer<float> slotBuffer = buffer;
        slot->processBlock(slotBuffer);
        slotBuffers.push_back(slotBuffer);
    }

    // Mix all slot outputs
    if (!slotBuffers.empty()) {
        buffer.clear();
        float mixGain = 1.0f / slotBuffers.size(); // Equal power mixing

        for (const auto& slotBuffer : slotBuffers) {
            buffer.addFrom(0, 0, slotBuffer, 0, 0, buffer.getNumSamples(), mixGain);
            if (buffer.getNumChannels() > 1) {
                buffer.addFrom(1, 0, slotBuffer, 1, 0, buffer.getNumSamples(), mixGain);
            }
        }
    }
}

void DynamicsEffectsChain::processMidSideMode(juce::AudioBuffer<float>& buffer) {
    if (!msEncoder || !msDecoder || buffer.getNumChannels() < 2) {
        return;
    }

    // Encode to Mid/Side
    juce::AudioBuffer<float> msBuffer(2, buffer.getNumSamples());
    msEncoder->processBlock(buffer, msBuffer);

    // Process Mid and Side channels separately
    for (auto& slot : slots) {
        if (!slot->isEnabled()) {
            continue;
        }

        // Process Mid channel
        juce::AudioBuffer<float> midBuffer(1, buffer.getNumSamples());
        midBuffer.copyFrom(0, 0, msBuffer, 0, 0, buffer.getNumSamples());
        slot->processBlock(midBuffer);
        msBuffer.copyFrom(0, 0, midBuffer, 0, 0, buffer.getNumSamples());

        // Process Side channel
        juce::AudioBuffer<float> sideBuffer(1, buffer.getNumSamples());
        sideBuffer.copyFrom(0, 0, msBuffer, 1, 0, buffer.getNumSamples());
        slot->processBlock(sideBuffer);
        msBuffer.copyFrom(1, 0, sideBuffer, 0, 0, buffer.getNumSamples());
    }

    // Decode back to Left/Right
    msDecoder->processBlock(msBuffer, buffer);
}

void DynamicsEffectsChain::processSidechainRouting(juce::AudioBuffer<float>& buffer) {
    if (!sidechainEnabled) {
        return;
    }

    // Update sidechain buffers from registered sources
    updateSidechainBuffers();

    // Route sidechain to slots that need it
    routeSidechainToSlots();
}

void DynamicsEffectsChain::updateSidechainBuffers() {
    for (auto& pair : sidechainSources) {
        const std::string& name = pair.first;
        auto& callback = pair.second;

        juce::AudioBuffer<float> sidechainBuffer(2, samplesPerBlock);
        callback(sidechainBuffer);
        sidechainBuffers[name] = sidechainBuffer;
    }
}

void DynamicsEffectsChain::routeSidechainToSlots() {
    for (auto& slot : slots) {
        // Check if this slot needs sidechain
        if (slot->currentConfig.type == SlotType::Compressor ||
            slot->currentConfig.type == SlotType::Gate ||
            slot->currentConfig.type == SlotType::DeEsser) {

            // Find appropriate sidechain source
            for (const auto& pair : sidechainBuffers) {
                slot->processSidechain(pair.second);
                break; // Use first available sidechain
            }
        }
    }
}

void DynamicsEffectsChain::applyMasterOutput(juce::AudioBuffer<float>& buffer) {
    float gainLinear = smoothedMasterGain.getNextValue();
    buffer.applyGain(gainLinear);
}

void DynamicsEffectsChain::updateSoloMuteStates() {
    // Solo logic: if any slot is soloed, only soloed slots should be audible
    bool hasSolo = anySlotSoloed();
    for (auto& slot : slots) {
        if (hasSolo && !slot->isSolo()) {
            // This slot should be silent
            slot->currentBypassMode = ChainSlot::BypassMode::Muted;
        } else if (slot->isMuted()) {
            slot->currentBypassMode = ChainSlot::BypassMode::Muted;
        } else {
            slot->currentBypassMode = ChainSlot::BypassMode::Normal;
        }
    }
}

void DynamicsEffectsChain::applySoloMuteToBuffer(juce::AudioBuffer<float>& buffer) {
    // Solo/mute is applied during slot processing
}

void DynamicsEffectsChain::updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    if (totalSamplesProcessed % 1024 == 0) { // Update stats periodically
        // Calculate chain-level statistics
        stats.inputLevel = calculateRMSLevel(input);
        stats.outputLevel = calculateRMSLevel(output);

        // Aggregate slot statistics
        stats.totalGainReduction = 0.0f;
        stats.totalLatency = 0.0f;
        stats.activeEffects = 0;
        stats.bypassedEffects = 0;
        stats.totalEffects = static_cast<int>(slots.size());
        stats.slotStats.clear();

        for (const auto& slot : slots) {
            auto slotStats = slot->getStats();
            stats.slotStats.push_back(slotStats);

            if (slot->isEnabled()) {
                stats.activeEffects++;
                stats.totalGainReduction += slotStats.outputGain - slotStats.inputLevel;
            } else {
                stats.bypassedEffects++;
            }

            stats.totalLatency += slotStats.latency;
        }

        // Calculate total CPU usage (simplified)
        static auto lastUpdateTime = juce::Time::getCurrentTime();
        auto now = juce::Time::getCurrentTime();
        double timeDiff = now.toMilliseconds() - lastUpdateTime.toMilliseconds();
        if (timeDiff > 0) {
            stats.totalCPUUsage = static_cast<int>((input.getNumSamples() / sampleRate) / (timeDiff / 1000.0));
        }
        lastUpdateTime = now;

        stats.totalSamplesProcessed = totalSamplesProcessed;
        stats.lastUpdate = juce::Time::getCurrentTime();
        stats.isProcessing = true;
    }

    totalSamplesProcessed += input.getNumSamples();
}

void DynamicsEffectsChain::analyzeFrequencyContent(const juce::AudioBuffer<float>& buffer) {
    if (!fft || buffer.getNumSamples() > fft->getSize()) {
        return;
    }

    const float* channelData = buffer.getReadPointer(0);
    std::copy(channelData, channelData + buffer.getNumSamples(), analysisBuffer.begin());
    std::fill(analysisBuffer.begin() + buffer.getNumSamples(), analysisBuffer.end(), 0.0f);

    fft->performFrequencyOnlyForwardTransform(analysisBuffer.data());
}

void DynamicsEffectsChain::calculateChainStatistics() {
    // Additional analysis and calculations
    analyzeFrequencyContent(dryBuffer);
}

void DynamicsEffectsChain::updateAutoGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    float compensationGain = calculateCompensationGain(input, output);
    juce::Decibels::decibelsToGain(compensationGain);
}

float DynamicsEffectsChain::calculateCompensationGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    float inputRMS = calculateRMSLevel(input);
    float outputRMS = calculateRMSLevel(output);

    return inputRMS - outputRMS; // Gain needed to compensate
}

float DynamicsEffectsChain::calculateLoudness(const juce::AudioBuffer<float>& buffer) {
    // Simplified loudness calculation (LUFS)
    float rms = calculateRMSLevel(buffer);
    return rms - 3.0f; // Rough RMS to LUFS conversion
}

void DynamicsEffectsChain::applyLoudnessNormalization(juce::AudioBuffer<float>& buffer) {
    float currentLoudness = calculateLoudness(buffer);
    float targetLoudness = -14.0f; // K-14 target
    float loudnessDiff = targetLoudness - currentLoudness;

    if (std::abs(loudnessDiff) > 0.1f) {
        buffer.applyGain(juce::Decibels::decibelsToGain(loudnessDiff));
    }
}

void DynamicsEffectsChain::saveEditState(const std::string& description) {
    EditState state;
    state.slotConfigs.clear();
    for (const auto& slot : slots) {
        state.slotConfigs.push_back(slot->getConfig());
    }
    state.chainConfig = currentConfig;
    state.description = description;
    state.timestamp = juce::Time::getCurrentTime();

    undoStack.push_back(state);

    // Limit undo stack size
    while (undoStack.size() > maxUndoLevels) {
        undoStack.erase(undoStack.begin());
    }
}

void DynamicsEffectsChain::restoreEditState(const EditState& state) {
    currentConfig = state.chainConfig;
    clearAllSlots();

    for (const auto& slotConfig : state.slotConfigs) {
        addSlot(slotConfig);
    }
}

void DynamicsEffectsChain::clearRedoStack() {
    redoStack.clear();
}

bool DynamicsEffectsChain::savePresetToFile(const std::string& filename, const ChainPreset& preset) {
    // Implementation would save preset to file
    return false;
}

bool DynamicsEffectsChain::loadPresetFromFile(const std::string& filename, ChainPreset& preset) {
    // Implementation would load preset from file
    return false;
}

bool DynamicsEffectsChain::exportToFile(const juce::File& file, const std::string& jsonData) {
    juce::FileOutputStream stream(file);
    if (stream.openedOk()) {
        stream.writeText(jsonData, false, false, nullptr);
        return true;
    }
    return false;
}

bool DynamicsEffectsChain::importFromFile(const juce::File& file, std::string& jsonData) {
    juce::FileInputStream stream(file);
    if (stream.openedOk()) {
        jsonData = stream.readEntireStreamAsString().toStdString();
        return true;
    }
    return false;
}

void DynamicsEffectsChain::updateSampleRate(double newSampleRate) {
    sampleRate = newSampleRate;
    prepareToPlay(sampleRate, samplesPerBlock);
}

void DynamicsEffectsChain::updateBlockSize(int newBlockSize) {
    samplesPerBlock = newBlockSize;
    prepareToPlay(sampleRate, samplesPerBlock);
}

int DynamicsEffectsChain::findNextAvailableSlot() const {
    return static_cast<int>(slots.size());
}

bool DynamicsEffectsChain::isValidSlotIndex(int slotIndex) const {
    return slotIndex >= 0 && slotIndex < static_cast<int>(slots.size());
}

void DynamicsEffectsChain::reorganizeSlots() {
    // Reorganize slots to maintain proper order after insertions/deletions
    for (size_t i = 0; i < slots.size(); ++i) {
        slots[i]->slotIndex = static_cast<int>(i);
    }
}

float DynamicsEffectsChain::calculateRMSLevel(const juce::AudioBuffer<float>& buffer) {
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

//==============================================================================
// DynamicsEffectsChain Factory Implementation
//==============================================================================

std::unique_ptr<DynamicsEffectsChain> DynamicsEffectsChainFactory::create() {
    return std::make_unique<DynamicsEffectsChain>();
}

EffectsChainConfig DynamicsEffectsChainFactory::createVocalChainPreset() {
    EffectsChainConfig config;
    config.name = "Vocal Chain";
    config.description = "Complete vocal processing chain with de-essing, compression, and limiting";

    SlotConfig gate;
    gate.type = SlotType::Gate;
    gate.name = "Noise Gate";
    gate.preset = "Vocal Gate";
    config.slots.push_back(gate);

    SlotConfig deesser;
    deesser.type = SlotType::DeEsser;
    deesser.name = "De-Esser";
    deesser.preset = "Vocal DeEsser";
    config.slots.push_back(deesser);

    SlotConfig compressor;
    compressor.type = SlotType::Compressor;
    compressor.name = "Vocal Compressor";
    compressor.preset = "Vocal Compressor";
    config.slots.push_back(compressor);

    SlotConfig limiter;
    limiter.type = SlotType::Limiter;
    limiter.name = "Vocal Limiter";
    limiter.preset = "Vocal Limiter";
    config.slots.push_back(limiter);

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createDrumBusPreset() {
    EffectsChainConfig config;
    config.name = "Drum Bus";
    config.description = "Drum bus processing with parallel compression";

    SlotConfig compressor;
    compressor.type = SlotType::Compressor;
    compressor.name = "Drum Compressor";
    compressor.preset = "Drum Compressor";
    config.slots.push_back(compressor);

    config.enableParallel = true;
    config.masterOutputGain = -2.0f;

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createMasterBusPreset() {
    EffectsChainConfig config;
    config.name = "Master Bus";
    config.description = "Master bus processing with multiband compression and limiting";

    SlotConfig multiband;
    multiband.type = SlotType::MultibandCompressor;
    multiband.name = "Multiband Compressor";
    config.slots.push_back(multiband);

    SlotConfig limiter;
    limiter.type = SlotType::Limiter;
    limiter.name = "Master Limiter";
    limiter.preset = "Master Limiter";
    config.slots.push_back(limiter);

    config.enableLoudnessNormalization = true;
    config.masterOutputGain = 0.0f;

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createMixBusPreset() {
    EffectsChainConfig config;
    config.name = "Mix Bus";
    config.description = "Mix bus processing with gentle compression";

    SlotConfig compressor;
    compressor.type = SlotType::Compressor;
    compressor.name = "Mix Bus Compressor";
    compressor.preset = "Bus Compressor";
    config.slots.push_back(compressor);

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createBroadcastPreset() {
    EffectsChainConfig config;
    config.name = "Broadcast";
    config.description = "Broadcast-ready processing with loudness normalization";

    SlotConfig limiter;
    limiter.type = SlotType::Limiter;
    limiter.name = "Broadcast Limiter";
    limiter.preset = "Loudness Limiter";
    config.slots.push_back(limiter);

    config.enableLoudnessNormalization = true;
    config.masterOutputGain = -1.0f;

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createLivePerformancePreset() {
    EffectsChainConfig config;
    config.name = "Live Performance";
    config.description = "Live performance processing with fast dynamics";

    SlotConfig gate;
    gate.type = SlotType::Gate;
    gate.name = "Live Gate";
    config.slots.push_back(gate);

    SlotConfig compressor;
    compressor.type = SlotType::Compressor;
    compressor.name = "Live Compressor";
    config.slots.push_back(compressor);

    SlotConfig limiter;
    limiter.type = SlotType::Limiter;
    limiter.name = "Live Limiter";
    limiter.preset = "Brickwall Limiter";
    config.slots.push_back(limiter);

    return config;
}

EffectsChainConfig DynamicsEffectsChainFactory::createStudioPreset() {
    EffectsChainConfig config;
    config.name = "Studio";
    config.description = "High-quality studio processing chain";

    return createVocalChainPreset(); // Reuse vocal chain as studio example
}

EffectsChainConfig DynamicsEffectsChainFactory::createMinimalPreset() {
    EffectsChainConfig config;
    config.name = "Minimal";
    config.description = "Minimal processing with just limiting";

    SlotConfig limiter;
    limiter.type = SlotType::Limiter;
    limiter.name = "Minimal Limiter";
    limiter.preset = "Brickwall Limiter";
    config.slots.push_back(limiter);

    return config;
}

SlotConfig DynamicsEffectsChainFactory::createVocalCompressorSlot() {
    SlotConfig slot;
    slot.type = SlotType::Compressor;
    slot.name = "Vocal Compressor";
    slot.preset = "Vocal Compressor";
    slot.enabled = true;
    slot.wetDryMix = 100.0f;
    return slot;
}

SlotConfig DynamicsEffectsChainFactory::createDrumCompressorSlot() {
    SlotConfig slot;
    slot.type = SlotType::Compressor;
    slot.name = "Drum Compressor";
    slot.preset = "Drum Compressor";
    slot.enabled = true;
    slot.wetDryMix = 80.0f;
    return slot;
}

SlotConfig DynamicsEffectsChainFactory::createBassCompressorSlot() {
    SlotConfig slot;
    slot.type = SlotType::Compressor;
    slot.name = "Bass Compressor";
    slot.preset = "Bass Compressor";
    slot.enabled = true;
    slot.wetDryMix = 90.0f;
    return slot;
}

SlotConfig DynamicsEffectsChainFactory::createMasterLimiterSlot() {
    SlotConfig slot;
    slot.type = SlotType::Limiter;
    slot.name = "Master Limiter";
    slot.preset = "Master Limiter";
    slot.enabled = true;
    slot.wetDryMix = 100.0f;
    return slot;
}

SlotConfig DynamicsEffectsChainFactory::createFilterGateSlot() {
    SlotConfig slot;
    slot.type = SlotType::FilterGate;
    slot.name = "Filter Gate";
    slot.preset = "Low Frequency Gate";
    slot.enabled = true;
    slot.wetDryMix = 100.0f;
    return slot;
}

SlotConfig DynamicsEffectsChainFactory::createExpanderSlot() {
    SlotConfig slot;
    slot.type = SlotType::Expander;
    slot.name = "Expander";
    slot.preset = "Noise Expander";
    slot.enabled = true;
    slot.wetDryMix = 100.0f;
    return slot;
}

ChainSlot DynamicsEffectsChainFactory::createSlot(const SlotConfig& config, int index) {
    ChainSlot slot(index, config);
    slot.initialize();
    return slot;
}

std::vector<DynamicsEffectsChain::ChainTemplate> DynamicsEffectsChainFactory::getTemplatesByCategory(const std::string& category) {
    std::vector<DynamicsEffectsChain::ChainTemplate> templates;

    if (category == "Vocals") {
        DynamicsEffectsChain::ChainTemplate vocalTemplate;
        vocalTemplate.name = "Vocal Processing";
        vocalTemplate.description = "Complete vocal chain with gate, de-esser, compressor, and limiter";
        vocalTemplate.slotTemplate = {
            createFilterGateSlot(),
            createVocalCompressorSlot(),
            createMasterLimiterSlot()
        };
        vocalTemplate.category = "Vocals";
        templates.push_back(vocalTemplate);
    }

    return templates;
}

std::vector<std::string> DynamicsEffectsChainFactory::getAvailableCategories() const {
    return {"Vocals", "Drums", "Master", "Broadcast", "Live", "Studio"};
}

bool DynamicsEffectsChainFactory::validateConfig(const EffectsChainConfig& config) {
    if (config.slots.empty()) {
        return false; // Chain must have at least one slot
    }

    for (const auto& slot : config.slots) {
        if (slot.name.empty()) {
            return false; // All slots must have names
        }

        if (slot.wetDryMix < 0.0f || slot.wetDryMix > 100.0f) {
            return false; // Invalid wet/dry mix
        }
    }

    return true;
}

bool DynamicsEffectsChainFactory::testConfiguration(const EffectsChainConfig& config) {
    auto chain = std::make_unique<DynamicsEffectsChain>();
    return chain->initialize(config);
}

std::string DynamicsEffectsChainFactory::exportConfigAsJSON(const EffectsChainConfig& config) {
    // Simplified JSON export
    std::string json = "{\n";
    json += "  \"name\": \"" + config.name + "\",\n";
    json += "  \"description\": \"" + config.description + "\",\n";
    json += "  \"slots\": [\n";

    for (size_t i = 0; i < config.slots.size(); ++i) {
        const auto& slot = config.slots[i];
        json += "    {\n";
        json += "      \"name\": \"" + slot.name + "\",\n";
        json += "      \"type\": \"" + std::to_string(static_cast<int>(slot.type)) + "\",\n";
        json += "      \"enabled\": " + (slot.enabled ? "true" : "false") + "\n";
        json += "    }";
        if (i < config.slots.size() - 1) {
            json += ",";
        }
        json += "\n";
    }

    json += "  ]\n";
    json += "}\n";

    return json;
}

EffectsChainConfig DynamicsEffectsChainFactory::importConfigFromJSON(const std::string& jsonString) {
    EffectsChainConfig config;
    // Simplified JSON import
    config.name = "Imported Chain";
    return config;
}

bool DynamicsEffectsChainFactory::validateJSON(const std::string& jsonString) {
    // Simplified JSON validation
    return !jsonString.empty() && jsonString.find("{") == 0;
}

} // namespace dynamics
} // namespace schill