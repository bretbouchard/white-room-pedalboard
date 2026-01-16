#include "dynamics/DynamicsProcessor.h"

namespace schill {
namespace dynamics {

//==============================================================================
// EnvelopeFollower Implementation
//==============================================================================

EnvelopeFollower::EnvelopeFollower() {
    historyBuffer.resize(historySize);
    smoothedEnvelope.reset(44100.0, 0.01f);
    smoothedPeak.reset(44100.0, 0.01f);
}

void EnvelopeFollower::configure(const EnvelopeConfig& newConfig) {
    config = newConfig;
    updateRates();
}

void EnvelopeFollower::reset() {
    currentEnvelope = 0.0f;
    targetEnvelope = 0.0f;
    currentPeak = 0.0f;
    currentRMS = 0.0f;
    holdTimer = 0.0f;

    smoothedEnvelope.setCurrentAndTargetValue(0.0f);
    smoothedPeak.setCurrentAndTargetValue(0.0f);

    std::fill(historyBuffer.begin(), historyBuffer.end(), 0.0f);
}

void EnvelopeFollower::prepareToPlay(double newSampleRate, int samplesPerBlock) {
    sampleRate = newSampleRate;
    updateRates();

    smoothedEnvelope.reset(sampleRate, config.smoothingTime * 0.001f);
    smoothedPeak.reset(sampleRate, config.smoothingTime * 0.001f);
}

float EnvelopeFollower::processSample(float input) noexcept {
    float processedInput = input * preGain;

    // Update history buffer
    historyBuffer.push_back(processedInput);

    // Detect level based on mode
    float detectedLevel = detectLevel(historyBuffer.data(), std::min(historySize, static_cast<int>(sampleRate * 0.001f)));

    // Apply post gain
    detectedLevel *= postGain;

    // Update envelope with attack/release
    if (detectedLevel > currentEnvelope) {
        targetEnvelope = detectedLevel;
        currentEnvelope += (targetEnvelope - currentEnvelope) * attackRate;
    } else {
        targetEnvelope = detectedLevel;
        currentEnvelope += (targetEnvelope - currentEnvelope) * releaseRate;
    }

    // Apply hold timer
    if (holdTimer > 0.0f) {
        holdTimer -= 1.0f / sampleRate;
    }

    // Logarithmic detection if enabled
    if (config.logDetection) {
        currentEnvelope = juce::Decibels::gainToDecibels(currentEnvelope * 0.2f + 1e-8f) * 0.05f + 1.0f;
    }

    // Apply smoothing
    smoothedEnvelope.setCurrentAndTargetValue(currentEnvelope);
    return smoothedEnvelope.getNextValue();
}

void EnvelopeFollower::processBlock(const float* input, float* output, int numSamples) noexcept {
    for (int i = 0; i < numSamples; ++i) {
        output[i] = processSample(input[i]);
    }
}

void EnvelopeFollower::processStereo(const float* leftInput, const float* rightInput,
                                    float* leftOutput, float* rightOutput,
                                    int numSamples) noexcept {
    for (int i = 0; i < numSamples; ++i) {
        float stereoInput = (leftInput[i] + rightInput[i]) * 0.5f;
        float output = processSample(stereoInput);
        leftOutput[i] = output;
        rightOutput[i] = output;
    }
}

void EnvelopeFollower::setAttackTime(float attackMs) {
    config.attackTime = attackMs;
    updateRates();
}

void EnvelopeFollower::setReleaseTime(float releaseMs) {
    config.releaseTime = releaseMs;
    updateRates();
}

void EnvelopeFollower::setHoldTime(float holdMs) {
    config.holdTime = holdMs;
}

void EnvelopeFollower::updateRates() {
    attackRate = std::exp(-1.0 / (sampleRate * config.attackTime * 0.001));
    releaseRate = std::exp(-1.0 / (sampleRate * config.releaseTime * 0.001));
    smoothingFactor = std::exp(-1.0 / (sampleRate * config.smoothingTime * 0.001));
}

void EnvelopeFollower::updatePeakAndRMS(const float* samples, int numSamples) {
    float peak = 0.0f;
    float rmsSum = 0.0f;

    for (int i = 0; i < numSamples; ++i) {
        float absSample = std::abs(samples[i]);
        peak = std::max(peak, absSample);
        rmsSum += absSample * absSample;
    }

    currentPeak = peak;
    currentRMS = std::sqrt(rmsSum / numSamples);

    smoothedPeak.setCurrentAndTargetValue(currentPeak);
}

float EnvelopeFollower::detectLevel(const float* samples, int numSamples) {
    switch (config.mode) {
        case DetectionMode::Peak: {
            float peak = 0.0f;
            for (int i = 0; i < numSamples; ++i) {
                peak = std::max(peak, std::abs(samples[i]));
            }
            return peak;
        }

        case DetectionMode::RMS: {
            float sum = 0.0f;
            for (int i = 0; i < numSamples; ++i) {
                float sample = samples[i];
                sum += sample * sample;
            }
            return std::sqrt(sum / numSamples);
        }

        case DetectionMode::TruePeak: {
            // Oversample for true peak detection
            float peak = 0.0f;
            for (int i = 0; i < numSamples - 1; ++i) {
                float interpolated1 = (samples[i] + samples[i + 1]) * 0.5f;
                peak = std::max(peak, std::max(std::abs(samples[i]), std::abs(interpolated1)));
            }
            return peak;
        }

        case DetectionMode::LUFS: {
            // Simplified LUFS calculation
            float sum = 0.0f;
            for (int i = 0; i < numSamples; ++i) {
                float sample = samples[i];
                // Apply K-weighting filter (simplified)
                float filtered = sample;
                sum += filtered * filtered;
            }
            float rms = std::sqrt(sum / numSamples);
            return juce::Decibels::gainToDecibels(rms * 0.891f) * 0.1f + 1.0f;
        }

        default:
            return 0.0f;
    }
}

//==============================================================================
// DynamicsProcessor Implementation
//==============================================================================

DynamicsProcessor::DynamicsProcessor() : currentType(DynamicsProcessorType::Compressor), bypassed(false) {
    envelopeFollower = std::make_unique<EnvelopeFollower>();

    // Initialize FFT for analysis
    fft = std::make_unique<juce::dsp::FFT>(11); // 2048 samples
    fftBuffer.resize(2048 * 2); // Complex buffer
    magnitudeBuffer.resize(1024);
    analysisBuffer.resize(2048);

    // Initialize processing chains
    for (int i = 0; i < 2; ++i) { // Stereo
        auto duplicator = std::make_unique<juce::dsp::ProcessorDuplicator<float,
            juce::dsp::Gain<float>>>();
        auto gainStage = std::make_unique<juce::dsp::Gain<float>>();

        duplicators.push_back(std::move(duplicator));
        gainStages.push_back(std::move(gainStage));
    }

    // Initialize character processing
    saturator = std::make_unique<juce::dsp::WaveShaper<float>>(
        [](float sample) {
            // Soft saturation curve
            if (sample > 0.0f) {
                return 1.0f - std::exp(-sample);
            } else {
                return -1.0f + std::exp(sample);
            }
        });

    characterChain = std::make_unique<juce::dsp::ProcessorChain<float, juce::dsp::ProcessorBase>>();
    characterChain->add<juce::dsp::Gain<float>>();
    characterChain->add<juce::dsp::WaveShaper<float>>(*saturator);
    characterChain->add<juce::dsp::Gain<float>>();

    reset();
}

DynamicsProcessor::~DynamicsProcessor() = default;

bool DynamicsProcessor::initialize(DynamicsProcessorType type) {
    currentType = type;

    switch (type) {
        case DynamicsProcessorType::Compressor:
            return initializeCompressor(CompressorConfig{});

        case DynamicsProcessorType::Limiter:
            return initializeLimiter(LimiterConfig{});

        case DynamicsProcessorType::Gate:
            return initializeGate(CompressorConfig{});

        case DynamicsProcessorType::Expander:
            return initializeExpander(CompressorConfig{});

        case DynamicsProcessorType::DeEsser:
            return initializeDeEsser(CompressorConfig{});

        default:
            jassertfalse; // Unsupported type
            return false;
    }
}

void DynamicsProcessor::reset() {
    processingState = ProcessingState{};
    totalSamplesProcessed = 0;
    statsResetTime = juce::Time::getCurrentTime();

    // Reset envelope follower
    if (envelopeFollower) {
        envelopeFollower->reset();
    }

    // Reset processing chains
    for (auto& duplicator : duplicators) {
        duplicator->reset();
    }

    for (auto& gainStage : gainStages) {
        gainStage->reset();
    }

    // Reset character chain
    if (characterChain) {
        characterChain->reset();
    }

    // Reset multiband filters
    if (multibandEnabled) {
        for (auto& filter : crossoverFilters) {
            filter->reset();
        }
        std::fill(bandOutputs.begin(), bandOutputs.end(), 0.0f);
    }

    // Reset sidechain
    sidechainBuffer.setSize(2, 512);
    sidechainBuffer.clear();

    if (sidechainFilter) {
        sidechainFilter->reset();
    }
}

void DynamicsProcessor::prepareToPlay(double newSampleRate, int newSamplesPerBlock) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;

    // Prepare envelope follower
    if (envelopeFollower) {
        envelopeFollower->prepareToPlay(sampleRate, samplesPerBlock);
    }

    // Prepare processing chains
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = samplesPerBlock;
    spec.numChannels = 2;

    for (auto& duplicator : duplicators) {
        duplicator->prepare(spec);
    }

    for (auto& gainStage : gainStages) {
        gainStage->prepare(spec);
    }

    // Prepare character chain
    if (characterChain) {
        characterChain->prepare(spec);
    }

    // Prepare multiband filters
    if (multibandEnabled) {
        setupMultibandFilters();
    }

    // Prepare sidechain
    sidechainBuffer.setSize(2, samplesPerBlock);
    sidechainFilter = std::make_unique<juce::dsp::IIR::Filter<float>>();
    sidechainFilter->prepare(spec);

    // Initialize wet/dry mixer
    wetDryMix.reset(sampleRate, 0.05f);
    wetDryMix.setCurrentAndTargetValue(0.5f);

    // Prepare FFT for analysis
    if (fft && fftBuffer.size() != samplesPerBlock * 2) {
        fftBuffer.resize(samplesPerBlock * 2);
        magnitudeBuffer.resize(samplesPerBlock);
        analysisBuffer.resize(samplesPerBlock);
    }
}

bool DynamicsProcessor::initializeCompressor(const CompressorConfig& config) {
    currentType = DynamicsProcessorType::Compressor;
    compressorConfig = config;

    // Configure envelope follower for compression
    EnvelopeFollower::EnvelopeConfig envConfig;
    envConfig.mode = (config.mode == CompressorMode::RMS) ?
        EnvelopeFollower::DetectionMode::RMS :
        EnvelopeFollower::DetectionMode::Peak;
    envConfig.attackTime = config.attackTime;
    envConfig.releaseTime = config.releaseTime;
    envConfig.holdTime = 0.0f;
    envConfig.smoothingTime = config.automationSmoothTime;
    envConfig.preGain = 0.0f;
    envConfig.postGain = 0.0f;

    envelopeFollower->configure(envConfig);

    return true;
}

bool DynamicsProcessor::initializeLimiter(const LimiterConfig& config) {
    currentType = DynamicsProcessorType::Limiter;
    limiterConfig = config;

    // Configure envelope follower for limiting
    EnvelopeFollower::EnvelopeConfig envConfig;
    envConfig.mode = config.truePeakMode ?
        EnvelopeFollower::DetectionMode::TruePeak :
        EnvelopeFollower::DetectionMode::Peak;
    envConfig.attackTime = config.lookaheadTime;
    envConfig.releaseTime = config.releaseTime;
    envConfig.holdTime = 0.0f;
    envConfig.smoothingTime = 10.0f;
    envConfig.preGain = 0.0f;
    envConfig.postGain = 0.0f;

    envelopeFollower->configure(envConfig);

    return true;
}

bool DynamicsProcessor::initializeGate(const CompressorConfig& config) {
    currentType = DynamicsProcessorType::Gate;
    compressorConfig = config;

    // Configure envelope follower for gating
    EnvelopeFollower::EnvelopeConfig envConfig;
    envConfig.mode = EnvelopeFollower::DetectionMode::Peak;
    envConfig.attackTime = config.attackTime;
    envConfig.releaseTime = config.releaseTime;
    envConfig.holdTime = 0.0f;
    envConfig.smoothingTime = 5.0f;

    envelopeFollower->configure(envConfig);

    return true;
}

bool DynamicsProcessor::initializeExpander(const CompressorConfig& config) {
    currentType = DynamicsProcessorType::Expander;
    compressorConfig = config;

    // Configure envelope follower for expansion
    EnvelopeFollower::EnvelopeConfig envConfig;
    envConfig.mode = EnvelopeFollower::DetectionMode::RMS;
    envConfig.attackTime = config.attackTime;
    envConfig.releaseTime = config.releaseTime;
    envConfig.holdTime = 0.0f;
    envConfig.smoothingTime = 20.0f;

    envelopeFollower->configure(envConfig);

    return true;
}

bool DynamicsProcessor::initializeDeEsser(const CompressorConfig& config) {
    currentType = DynamicsProcessorType::DeEsser;
    compressorConfig = config;

    // Configure envelope follower for de-essing
    EnvelopeFollower::EnvelopeConfig envConfig;
    envConfig.mode = EnvelopeFollower::DetectionMode::Peak;
    envConfig.attackTime = 1.0f;
    envConfig.releaseTime = 50.0f;
    envConfig.holdTime = 0.0f;
    envConfig.smoothingTime = 5.0f;

    envelopeFollower->configure(envConfig);

    // Setup sidechain filter for de-essing (high-frequency detection)
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = samplesPerBlock;
    spec.numChannels = 1;

    sidechainFilter->prepare(spec);
    *sidechainFilter->coefficients = juce::dsp::IIR::Coefficients<float>::makeHighPass(
        sampleRate, 3000.0f, 2.0f);

    return true;
}

void DynamicsProcessor::processBlock(juce::AudioBuffer<float>& buffer) {
    if (bypassed) {
        return;
    }

    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (numSamples == 0) {
        return;
    }

    juce::AudioBuffer<float> dryBuffer = buffer;

    // Process based on type
    switch (currentType) {
        case DynamicsProcessorType::Compressor:
            processCompressor(buffer);
            break;

        case DynamicsProcessorType::Limiter:
            processLimiter(buffer);
            break;

        case DynamicsProcessorType::Gate:
            processGate(buffer);
            break;

        case DynamicsProcessorType::Expander:
            processExpander(buffer);
            break;

        case DynamicsProcessorType::DeEsser:
            processDeEsser(buffer);
            break;

        default:
            break;
    }

    // Apply character processing if enabled
    if (saturationAmount > 0.0f || tubeDriveAmount > 0.0f) {
        applyCharacter(buffer);
    }

    // Apply wet/dry mix
    if (parallelMode) {
        juce::AudioBuffer<float> parallelBuffer = dryBuffer;
        processParallel(buffer, parallelBuffer);
    } else {
        float wetAmount = wetDryMix.getNextValue();
        for (int ch = 0; ch < numChannels; ++ch) {
            float* channelData = buffer.getWritePointer(ch);
            const float* dryData = dryBuffer.getReadPointer(ch);

            for (int i = 0; i < numSamples; ++i) {
                channelData[i] = dryData[i] * (1.0f - wetAmount) + channelData[i] * wetAmount;
            }
        }
    }

    // Apply Mid/Side processing if enabled
    if (midSideMode && numChannels >= 2) {
        processMidSide(buffer);
    }

    // Update statistics
    totalSamplesProcessed += numSamples;
    updateStats(dryBuffer, buffer);
}

void DynamicsProcessor::processStereo(juce::AudioBuffer<float>& buffer) {
    processBlock(buffer); // Stereo processing is handled in processBlock
}

void DynamicsProcessor::processMono(juce::AudioBuffer<float>& buffer) {
    processBlock(buffer); // Mono processing is handled in processBlock
}

void DynamicsProcessor::processSidechainInput(const juce::AudioBuffer<float>& sidechainBufferInput) {
    sidechainBuffer.setSize(sidechainBufferInput.getNumChannels(), sidechainBufferInput.getNumSamples());
    sidechainBuffer.copyFrom(0, 0, sidechainBufferInput, 0, 0, sidechainBufferInput.getNumSamples());

    if (sidechainBuffer.getNumChannels() == 1 && sidechainBufferInput.getNumChannels() > 1) {
        sidechainBuffer.copyFrom(1, 0, sidechainBufferInput, 1, 0, sidechainBufferInput.getNumSamples());
    }

    sidechainEnabled = true;
}

void DynamicsProcessor::processSidechainInput(const float* sidechainData, int numSamples) {
    sidechainBuffer.setSize(2, numSamples);
    sidechainBuffer.copyFrom(0, 0, sidechainData, numSamples);
    sidechainBuffer.copyFrom(1, 0, sidechainData, numSamples);

    sidechainEnabled = true;
}

void DynamicsProcessor::processCompressor(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Process envelope follower
    if (sidechainEnabled) {
        envelopeFollower->processStereo(sidechainBuffer.getReadPointer(0),
                                      sidechainBuffer.getReadPointer(1),
                                      analysisBuffer.data(),
                                      analysisBuffer.data() + numSamples/2,
                                      numSamples);
    } else {
        // Use input signal as sidechain
        if (numChannels >= 2) {
            envelopeFollower->processStereo(buffer.getReadPointer(0),
                                          buffer.getReadPointer(1),
                                          analysisBuffer.data(),
                                          analysisBuffer.data() + numSamples/2,
                                          numSamples);
        } else {
            envelopeFollower->processBlock(buffer.getReadPointer(0),
                                         analysisBuffer.data(),
                                         numSamples);
        }
    }

    // Apply compression
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            float envelopeValue = (i < numSamples/2) ? analysisBuffer[i] : analysisBuffer[i];
            float inputLevel = juce::Decibels::gainToDecibels(std::abs(channelData[i]) + 1e-8f);

            // Calculate gain reduction
            float gainReduction = computeGainReduction(inputLevel, compressorConfig.threshold,
                                                      compressorConfig.ratio, compressorConfig.kneeWidth);

            // Apply soft knee
            gainReduction = applySoftKnee(gainReduction, compressorConfig.threshold,
                                         compressorConfig.kneeWidth);

            // Convert to linear gain
            float gainLinear = juce::Decibels::decibelsToGain(-gainReduction);

            // Apply makeup gain
            gainLinear *= juce::Decibels::decibelsToGain(compressorConfig.makeupGain);

            // Apply gain
            channelData[i] *= gainLinear;

            // Update processing state
            processingState.currentGainReduction = gainReduction;
            processingState.currentlyProcessing = true;
        }
    }
}

void DynamicsProcessor::processLimiter(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Process envelope follower
    if (sidechainEnabled) {
        envelopeFollower->processStereo(sidechainBuffer.getReadPointer(0),
                                      sidechainBuffer.getReadPointer(1),
                                      analysisBuffer.data(),
                                      analysisBuffer.data() + numSamples/2,
                                      numSamples);
    } else {
        // Use input signal as sidechain
        if (numChannels >= 2) {
            envelopeFollower->processStereo(buffer.getReadPointer(0),
                                          buffer.getReadPointer(1),
                                          analysisBuffer.data(),
                                          analysisBuffer.data() + numSamples/2,
                                          numSamples);
        } else {
            envelopeFollower->processBlock(buffer.getReadPointer(0),
                                         analysisBuffer.data(),
                                         numSamples);
        }
    }

    // Apply limiting
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            float sample = channelData[i];
            float outputSample = limitOutput(sample, limiterConfig.ceiling, std::numeric_limits<float>::infinity());
            channelData[i] = outputSample;

            // Update processing state
            processingState.currentGainReduction = juce::Decibels::gainToDecibels(std::abs(outputSample)) - limiterConfig.ceiling;
            processingState.currentlyProcessing = std::abs(outputSample) >= juce::Decibels::decibelsToGain(limiterConfig.ceiling - 0.1f);
        }
    }
}

void DynamicsProcessor::processGate(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Process envelope follower
    if (sidechainEnabled) {
        envelopeFollower->processStereo(sidechainBuffer.getReadPointer(0),
                                      sidechainBuffer.getReadPointer(1),
                                      analysisBuffer.data(),
                                      analysisBuffer.data() + numSamples/2,
                                      numSamples);
    } else {
        // Use input signal as sidechain
        if (numChannels >= 2) {
            envelopeFollower->processStereo(buffer.getReadPointer(0),
                                          buffer.getReadPointer(1),
                                          analysisBuffer.data(),
                                          analysisBuffer.data() + numSamples/2,
                                          numSamples);
        } else {
            envelopeFollower->processBlock(buffer.getReadPointer(0),
                                         analysisBuffer.data(),
                                         numSamples);
        }
    }

    float thresholdLinear = juce::Decibels::decibelsToGain(compressorConfig.threshold);
    float rangeLinear = juce::Decibels::decibelsToGain(-compressorConfig.range);

    // Apply gating
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            float envelopeValue = (i < numSamples/2) ? analysisBuffer[i] : analysisBuffer[i];

            if (envelopeValue < thresholdLinear) {
                // Below threshold - apply gain reduction
                float gainReduction = rangeLinear * (1.0f - (envelopeValue / thresholdLinear));
                channelData[i] *= gainReduction;
                processingState.currentGainReduction = juce::Decibels::gainToDecibels(gainReduction);
            } else {
                processingState.currentGainReduction = 0.0f;
            }

            processingState.currentlyProcessing = (envelopeValue < thresholdLinear);
        }
    }
}

void DynamicsProcessor::processExpander(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Process envelope follower
    if (sidechainEnabled) {
        envelopeFollower->processStereo(sidechainBuffer.getReadPointer(0),
                                      sidechainBuffer.getReadPointer(1),
                                      analysisBuffer.data(),
                                      analysisBuffer.data() + numSamples/2,
                                      numSamples);
    } else {
        // Use input signal as sidechain
        if (numChannels >= 2) {
            envelopeFollower->processStereo(buffer.getReadPointer(0),
                                          buffer.getReadPointer(1),
                                          analysisBuffer.data(),
                                          analysisBuffer.data() + numSamples/2,
                                          numSamples);
        } else {
            envelopeFollower->processBlock(buffer.getReadPointer(0),
                                         analysisBuffer.data(),
                                         numSamples);
        }
    }

    // Apply expansion (ratio < 1:1)
    float expansionRatio = 1.0f / juce::jmax(1.0f, compressorConfig.ratio);

    // Apply expansion
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            float envelopeValue = (i < numSamples/2) ? analysisBuffer[i] : analysisBuffer[i];
            float inputLevel = juce::Decibels::gainToDecibels(std::abs(channelData[i]) + 1e-8f);

            if (inputLevel < compressorConfig.threshold) {
                // Below threshold - expand (reduce gain more)
                float gainReduction = computeGainReduction(inputLevel, compressorConfig.threshold,
                                                          expansionRatio, compressorConfig.kneeWidth);
                float gainLinear = juce::Decibels::decibelsToGain(-gainReduction);
                channelData[i] *= gainLinear;
                processingState.currentGainReduction = gainReduction;
            } else {
                processingState.currentGainReduction = 0.0f;
            }

            processingState.currentlyProcessing = (inputLevel < compressorConfig.threshold);
        }
    }
}

void DynamicsProcessor::processDeEsser(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // For de-essing, we need to filter the high frequencies and use that as sidechain
    juce::AudioBuffer<float> filteredBuffer = buffer;

    // Apply high-pass filter to extract sibilance frequencies
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = filteredBuffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            channelData[i] = sidechainFilter->processSample(channelData[i]);
        }
    }

    // Process envelope follower on filtered signal
    if (numChannels >= 2) {
        envelopeFollower->processStereo(filteredBuffer.getReadPointer(0),
                                      filteredBuffer.getReadPointer(1),
                                      analysisBuffer.data(),
                                      analysisBuffer.data() + numSamples/2,
                                      numSamples);
    } else {
        envelopeFollower->processBlock(filteredBuffer.getReadPointer(0),
                                     analysisBuffer.data(),
                                     numSamples);
    }

    // Apply compression only when sibilance is detected
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            float sibilanceLevel = (i < numSamples/2) ? analysisBuffer[i] : analysisBuffer[i];
            float thresholdLinear = juce::Decibels::decibelsToGain(compressorConfig.threshold);

            if (sibilanceLevel > thresholdLinear) {
                // Sibilance detected - apply gain reduction
                float gainReduction = (sibilanceLevel - thresholdLinear) * compressorConfig.ratio;
                float gainLinear = juce::Decibels::decibelsToGain(-gainReduction);
                channelData[i] *= gainLinear;
                processingState.currentGainReduction = gainReduction;
            } else {
                processingState.currentGainReduction = 0.0f;
            }

            processingState.currentlyProcessing = (sibilanceLevel > thresholdLinear);
        }
    }
}

void DynamicsProcessor::processMultiband(juce::AudioBuffer<float>& buffer) {
    if (!multibandEnabled || crossoverFrequencies.empty()) {
        return;
    }

    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();
    const int numBands = static_cast<int>(crossoverFrequencies.size()) + 1;

    // Ensure band outputs array is properly sized
    if (bandOutputs.size() != numBands * numChannels * numSamples) {
        bandOutputs.resize(numBands * numChannels * numSamples);
    }

    // Split into bands and process each separately
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        // Process through crossover filters
        std::vector<float*> bandPointers(numBands);
        for (int band = 0; band < numBands; ++band) {
            bandPointers[band] = bandOutputs.data() + (band * numChannels + ch) * numSamples;
            std::copy(channelData, channelData + numSamples, bandPointers[band]);
        }

        // Apply crossover filtering
        for (int i = 0; i < numSamples; ++i) {
            // This is a simplified implementation - real crossover filtering would be more complex
            // For now, we'll just copy the signal to all bands
            for (int band = 0; band < numBands; ++band) {
                bandPointers[band][i] = channelData[i];
            }
        }

        // Process each band (simplified - real implementation would process each band separately)
        for (int band = 0; band < numBands; ++band) {
            juce::AudioBuffer<float> bandBuffer(bandPointers[band], 1, numSamples);
            processCompressor(bandBuffer); // Apply compression to each band
        }

        // Mix bands back together
        std::fill(channelData, channelData + numSamples, 0.0f);
        for (int band = 0; band < numBands; ++band) {
            for (int i = 0; i < numSamples; ++i) {
                channelData[i] += bandPointers[band][i] / numBands;
            }
        }
    }
}

void DynamicsProcessor::processParallel(juce::AudioBuffer<float>& buffer, juce::AudioBuffer<float>& dryBuffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    float wetAmount = wetDryMix.getNextValue();

    for (int ch = 0; ch < numChannels; ++ch) {
        float* wetData = buffer.getWritePointer(ch);
        const float* dryData = dryBuffer.getReadPointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            // Parallel processing: mix dry signal with processed signal
            wetData[i] = dryData[i] + wetData[i] * wetAmount;
        }
    }
}

void DynamicsProcessor::processMidSide(juce::AudioBuffer<float>& buffer) {
    if (buffer.getNumChannels() < 2) {
        return;
    }

    const int numSamples = buffer.getNumSamples();
    float* leftData = buffer.getWritePointer(0);
    float* rightData = buffer.getWritePointer(1);

    for (int i = 0; i < numSamples; ++i) {
        float left = leftData[i];
        float right = rightData[i];

        // Encode to Mid/Side
        float mid = (left + right) * 0.5f;
        float side = (left - right) * 0.5f;

        // Apply processing to Mid channel (or Side channel based on midSideAmount)
        if (midSideAmount > 0.5f) {
            // Process Side channel more
            side *= (1.0f + midSideAmount);
        } else {
            // Process Mid channel more
            mid *= (1.0f + (1.0f - midSideAmount));
        }

        // Decode back to Left/Right
        leftData[i] = mid + side;
        rightData[i] = mid - side;
    }
}

void DynamicsProcessor::applyCharacter(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (saturationAmount <= 0.0f && tubeDriveAmount <= 0.0f) {
        return;
    }

    // Update character chain parameters
    auto& inputGain = characterChain->get<0>();
    auto& outputGain = characterChain->get<2>();

    inputGain.setGainLinear(1.0f + tubeDriveAmount);
    outputGain.setGainLinear(1.0f + saturationAmount * 0.2f);

    // Process through character chain
    for (int ch = 0; ch < numChannels; ++ch) {
        float* channelData = buffer.getWritePointer(ch);

        for (int i = 0; i < numSamples; ++i) {
            // Apply tube drive (simple approximation)
            if (tubeDriveAmount > 0.0f) {
                float input = channelData[i] * (1.0f + tubeDriveAmount);
                float sign = (input > 0.0f) ? 1.0f : -1.0f;
                channelData[i] = sign * (1.0f - std::exp(-std::abs(input))) * 2.0f;
            }

            // Apply saturation
            if (saturationAmount > 0.0f) {
                float input = channelData[i];
                if (std::abs(input) > 0.707f) {
                    channelData[i] = std::copysign(0.707f + 0.293f * std::tanh((std::abs(input) - 0.707f) / 0.293f), input);
                }
            }
        }
    }
}

void DynamicsProcessor::setupMultibandFilters() {
    crossoverFilters.clear();

    for (float freq : crossoverFrequencies) {
        auto filter = std::make_unique<juce::dsp::LinkwitzRileyFilter<float>>();
        filter->setType(juce::dsp::LinkwitzRileyFilterType::lowpass);

        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = samplesPerBlock;
        spec.numChannels = 1;

        filter->prepare(spec);
        filter->setCutoffFrequency(freq);
        crossoverFilters.push_back(std::move(filter));
    }
}

float DynamicsProcessor::computeGainReduction(float inputLevel, float threshold, float ratio, float kneeWidth) {
    if (inputLevel <= threshold - kneeWidth * 0.5f) {
        return 0.0f; // No gain reduction
    } else if (inputLevel >= threshold + kneeWidth * 0.5f) {
        // Above knee - full compression
        return (inputLevel - threshold) * (1.0f - 1.0f / ratio);
    } else {
        // Within knee - soft compression
        float kneeStart = threshold - kneeWidth * 0.5f;
        float kneeRange = kneeWidth;
        float kneePosition = (inputLevel - kneeStart) / kneeRange;
        return kneePosition * kneePosition * 0.5f * (inputLevel - threshold) * (1.0f - 1.0f / ratio);
    }
}

float DynamicsProcessor::applySoftKnee(float gain, float threshold, float kneeWidth) {
    return gain; // Knee is already applied in computeGainReduction
}

float DynamicsProcessor::limitOutput(float input, float ceiling, float ratio) {
    float ceilingLinear = juce::Decibels::decibelsToGain(ceiling);

    if (std::abs(input) <= ceilingLinear) {
        return input;
    }

    float sign = (input > 0.0f) ? 1.0f : -1.0f;
    float overshoot = std::abs(input) - ceilingLinear;

    // Apply limiting with soft clip or hard clip based on limiter type
    if (limiterConfig.type == LimiterType::SoftClip) {
        // Soft clipping curve
        float limited = sign * ceilingLinear * std::tanh(std::abs(input) / ceilingLinear);
        return limited;
    } else {
        // Hard limiting
        return sign * ceilingLinear;
    }
}

void DynamicsProcessor::updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output) {
    if (totalSamplesProcessed % 1024 == 0) { // Update stats periodically
        stats.inputLevel = computeRMSLevel(input);
        stats.outputLevel = computeRMSLevel(output);
        stats.gainReduction = processingState.currentGainReduction;
        stats.compressionRatio = compressorConfig.ratio;
        stats.threshold = compressorConfig.threshold;
        stats.ceiling = limiterConfig.ceiling;
        stats.currentlyLimiting = processingState.currentlyProcessing;
        stats.sidechainLevel = sidechainEnabled ? envelopeFollower->getCurrentValue() : 0.0f;
        stats.rmsLevel = computeRMSLevel(output);
        stats.peakLevel = computePeakLevel(output);
        stats.crestFactor = computeCrestFactor(stats.rmsLevel, stats.peakLevel);
        stats.samplesProcessed = totalSamplesProcessed;
        stats.lastUpdate = juce::Time::getCurrentTime();

        // Estimate CPU usage (simplified)
        static auto lastUpdateTime = juce::Time::getCurrentTime();
        auto now = juce::Time::getCurrentTime();
        double timeDiff = now.toMilliseconds() - lastUpdateTime.toMilliseconds();
        if (timeDiff > 0) {
            stats.cpuUsage = (1024.0 / sampleRate) / (timeDiff / 1000.0);
        }
        lastUpdateTime = now;
    }
}

float DynamicsProcessor::computeRMSLevel(const juce::AudioBuffer<float>& buffer) {
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

float DynamicsProcessor::computePeakLevel(const juce::AudioBuffer<float>& buffer) {
    float peak = 0.0f;

    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        const float* channelData = buffer.getReadPointer(ch);
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            peak = std::max(peak, std::abs(channelData[i]));
        }
    }

    return juce::Decibels::gainToDecibels(peak + 1e-8f);
}

float DynamicsProcessor::computeCrestFactor(float rms, float peak) {
    return peak - rms;
}

void DynamicsProcessor::setCompressorConfig(const CompressorConfig& config) {
    compressorConfig = config;
    if (currentType == DynamicsProcessorType::Compressor) {
        initializeCompressor(config);
    }
}

void DynamicsProcessor::setLimiterConfig(const LimiterConfig& config) {
    limiterConfig = config;
    if (currentType == DynamicsProcessorType::Limiter) {
        initializeLimiter(config);
    }
}

void DynamicsProcessor::setThreshold(float thresholdDb) {
    processingState.currentThreshold = thresholdDb;
    compressorConfig.threshold = thresholdDb;
}

void DynamicsProcessor::setRatio(float ratio) {
    processingState.currentRatio = ratio;
    compressorConfig.ratio = ratio;
}

void DynamicsProcessor::setAttackTime(float attackMs) {
    compressorConfig.attackTime = attackMs;
    if (envelopeFollower) {
        envelopeFollower->setAttackTime(attackMs);
    }
}

void DynamicsProcessor::setReleaseTime(float releaseMs) {
    compressorConfig.releaseTime = releaseMs;
    if (envelopeFollower) {
        envelopeFollower->setReleaseTime(releaseMs);
    }
}

void DynamicsProcessor::setMakeupGain(float makeupDb) {
    processingState.currentMakeup = makeupDb;
    compressorConfig.makeupGain = makeupDb;
}

void DynamicsProcessor::setKneeWidth(float kneeDb) {
    compressorConfig.kneeWidth = kneeDb;
}

void DynamicsProcessor::setCeiling(float ceilingDb) {
    limiterConfig.ceiling = ceilingDb;
}

void DynamicsProcessor::enableMultiband(bool enabled) {
    multibandEnabled = enabled;
}

void DynamicsProcessor::setCrossoverFrequencies(const std::vector<float>& frequencies) {
    crossoverFrequencies = frequencies;
    setupMultibandFilters();
}

void DynamicsProcessor::setBandConfig(int bandIndex, const CompressorConfig& config) {
    // This would require storing separate configs for each band
    // For simplicity, we'll just update the main compressor config
    setCompressorConfig(config);
}

void DynamicsProcessor::setSaturationAmount(float amount, float drive) {
    saturationAmount = juce::jlimit(0.0f, 1.0f, amount);
    tubeDriveAmount = juce::jlimit(0.0f, 1.0f, drive);
}

void DynamicsProcessor::setWarmthAmount(float amount) {
    // Warmth is implemented as a type of saturation
    saturationAmount = juce::jlimit(0.0f, 1.0f, amount);
}

DynamicsProcessor::DynamicsStats DynamicsProcessor::getStats() const {
    return stats;
}

void DynamicsProcessor::resetStats() {
    stats = DynamicsStats{};
    totalSamplesProcessed = 0;
    statsResetTime = juce::Time::getCurrentTime();
}

void DynamicsProcessor::enableAutomation(bool enabled) {
    compressorConfig.automationEnabled = enabled;
}

void DynamicsProcessor::automateParameter(const juce::String& parameter, float targetValue, float time) {
    // Implementation would require parameter smoothing over time
    // For now, just set the parameter directly
    if (parameter == "threshold") {
        setThreshold(targetValue);
    } else if (parameter == "ratio") {
        setRatio(targetValue);
    } else if (parameter == "attack") {
        setAttackTime(targetValue);
    } else if (parameter == "release") {
        setReleaseTime(targetValue);
    } else if (parameter == "makeupGain") {
        setMakeupGain(targetValue);
    } else if (parameter == "ceiling") {
        setCeiling(targetValue);
    }
}

void DynamicsProcessor::setBypassed(bool newBypassed) {
    bypassed = newBypassed;
}

void DynamicsProcessor::setWetDryMix(float wetAmount) {
    wetDryMix.setCurrentAndTargetValue(juce::jlimit(0.0f, 1.0f, wetAmount));
}

void DynamicsProcessor::enableParallelProcessing(bool enabled) {
    parallelMode = enabled;
}

void DynamicsProcessor::enableMidSideProcessing(bool enabled) {
    midSideMode = enabled;
}

void DynamicsProcessor::setMidSideAmount(float amount) {
    midSideAmount = juce::jlimit(0.0f, 1.0f, amount);
}

void DynamicsProcessor::switchToCompressor(const CompressorConfig& config, float crossfadeTimeMs) {
    currentType = DynamicsProcessorType::Compressor;
    initializeCompressor(config);
}

void DynamicsProcessor::switchToLimiter(const LimiterConfig& config, float crossfadeTimeMs) {
    currentType = DynamicsProcessorType::Limiter;
    initializeLimiter(config);
}

//==============================================================================
// DynamicsProcessor Factory Implementation
//==============================================================================

std::unique_ptr<DynamicsProcessor> DynamicsProcessorFactory::create(DynamicsProcessorType type) {
    auto processor = std::make_unique<DynamicsProcessor>();
    processor->initialize(type);
    return processor;
}

CompressorConfig DynamicsProcessorFactory::createVocalCompressorPreset() {
    CompressorConfig config;
    config.threshold = -18.0f;
    config.ratio = 3.0f;
    config.attackTime = 3.0f;
    config.releaseTime = 100.0f;
    config.makeupGain = 6.0f;
    config.kneeWidth = 4.0f;
    config.mode = CompressorMode::RMS;
    config.autoMakeup = true;
    config.lookaheadEnabled = true;
    config.stereoLink = true;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createDrumCompressorPreset() {
    CompressorConfig config;
    config.threshold = -12.0f;
    config.ratio = 4.0f;
    config.attackTime = 5.0f;
    config.releaseTime = 200.0f;
    config.makeupGain = 4.0f;
    config.kneeWidth = 6.0f;
    config.mode = CompressorMode::Peak;
    config.autoMakeup = false;
    config.stereoLink = false;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createMasterCompressorPreset() {
    CompressorConfig config;
    config.threshold = -6.0f;
    config.ratio = 2.0f;
    config.attackTime = 10.0f;
    config.releaseTime = 500.0f;
    config.makeupGain = 2.0f;
    config.kneeWidth = 8.0f;
    config.mode = CompressorMode::RMS;
    config.autoMakeup = true;
    config.stereoLink = true;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createBusCompressorPreset() {
    CompressorConfig config;
    config.threshold = -10.0f;
    config.ratio = 3.0f;
    config.attackTime = 2.0f;
    config.releaseTime = 200.0f;
    config.makeupGain = 4.0f;
    config.kneeWidth = 6.0f;
    config.mode = CompressorMode::RMS;
    config.autoMakeup = true;
    config.stereoLink = true;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createExpanderPreset() {
    CompressorConfig config;
    config.threshold = -30.0f;
    config.ratio = 0.5f; // Expansion ratio
    config.attackTime = 20.0f;
    config.releaseTime = 1000.0f;
    config.makeupGain = 0.0f;
    config.kneeWidth = 0.0f;
    config.mode = CompressorMode::RMS;
    config.autoMakeup = false;
    config.stereoLink = true;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createGatePreset() {
    CompressorConfig config;
    config.threshold = -40.0f;
    config.ratio = 10.0f; // High ratio for gating
    config.attackTime = 1.0f;
    config.releaseTime = 100.0f;
    config.makeupGain = 0.0f;
    config.kneeWidth = 0.0f;
    config.mode = CompressorMode::Peak;
    config.autoMakeup = false;
    config.stereoLink = false;
    config.range = 60.0f;
    return config;
}

CompressorConfig DynamicsProcessorFactory::createDeEsserPreset() {
    CompressorConfig config;
    config.threshold = -6.0f;
    config.ratio = 8.0f;
    config.attackTime = 1.0f;
    config.releaseTime = 50.0f;
    config.makeupGain = 0.0f;
    config.kneeWidth = 2.0f;
    config.mode = CompressorMode::Peak;
    config.autoMakeup = false;
    config.stereoLink = false;
    config.sidechainFrequency = 5000.0f;
    config.sidechainQ = 2.0f;
    return config;
}

LimiterConfig DynamicsProcessorFactory::createLimiterPreset() {
    LimiterConfig config;
    config.ceiling = -0.1f;
    config.releaseTime = 10.0f;
    config.type = LimiterType::Brickwall;
    config.kneeWidth = 1.0f;
    config.lookaheadTime = 0.5f;
    config.overshootProtection = true;
    return config;
}

LimiterConfig DynamicsProcessorFactory::createBrickwallLimiterPreset() {
    LimiterConfig config;
    config.ceiling = -0.3f;
    config.releaseTime = 5.0f;
    config.type = LimiterType::Brickwall;
    config.kneeWidth = 0.0f;
    config.lookaheadTime = 0.1f;
    config.overshootProtection = true;
    return config;
}

LimiterConfig DynamicsProcessorFactory::createLoudnessLimiterPreset() {
    LimiterConfig config;
    config.ceiling = -1.0f;
    config.releaseTime = 50.0f;
    config.type = LimiterType::Loudness;
    config.kneeWidth = 2.0f;
    config.lookaheadTime = 2.0f;
    config.overshootProtection = true;
    config.kSystemMode = true;
    config.targetLUFS = -14.0f;
    return config;
}

LimiterConfig DynamicsProcessorFactory::createTruePeakLimiterPreset() {
    LimiterConfig config;
    config.ceiling = -0.1f;
    config.releaseTime = 10.0f;
    config.type = LimiterType::TruePeak;
    config.kneeWidth = 0.5f;
    config.lookaheadTime = 1.0f;
    config.overshootProtection = true;
    config.truePeakMode = true;
    config.oversamplingFactor = 4.0f;
    return config;
}

std::vector<DynamicsProcessor::Preset> DynamicsProcessorFactory::getCompressorPresets() {
    std::vector<DynamicsProcessor::Preset> presets;

    DynamicsProcessor::Preset vocal;
    vocal.name = "Vocal Compressor";
    vocal.description = "Gentle vocal compression with automatic makeup gain";
    vocal.type = DynamicsProcessorType::Compressor;
    vocal.compressorData = juce::var(createVocalCompressorPreset());
    presets.push_back(vocal);

    DynamicsProcessor::Preset drum;
    drum.name = "Drum Compressor";
    drum.description = "Aggressive drum compression with fast attack";
    drum.type = DynamicsProcessorType::Compressor;
    drum.compressorData = juce::var(createDrumCompressorPreset());
    presets.push_back(drum);

    DynamicsProcessor::Preset master;
    master.name = "Master Compressor";
    master.description = "Gentle mastering compression";
    master.type = DynamicsProcessorType::Compressor;
    master.compressorData = juce::var(createMasterCompressorPreset());
    presets.push_back(master);

    return presets;
}

std::vector<DynamicsProcessor::Preset> DynamicsProcessorFactory::getLimiterPresets() {
    std::vector<DynamicsProcessor::Preset> presets;

    DynamicsProcessor::Preset brickwall;
    brickwall.name = "Brickwall Limiter";
    brickwall.description = "Hard limiting with overshoot protection";
    brickwall.type = DynamicsProcessorType::Limiter;
    brickwall.limiterData = juce::var(createBrickwallLimiterPreset());
    presets.push_back(brickwall);

    DynamicsProcessor::Preset truePeak;
    truePeak.name = "True Peak Limiter";
    truePeak.description = "ITU-1770 compliant true peak limiting";
    truePeak.type = DynamicsProcessorType::Limiter;
    truePeak.limiterData = juce::var(createTruePeakLimiterPreset());
    presets.push_back(truePeak);

    DynamicsProcessor::Preset loudness;
    loudness.name = "Loudness Limiter";
    loudness.description = "K-14 loudness normalization";
    loudness.type = DynamicsProcessorType::Limiter;
    loudness.limiterData = juce::var(createLoudnessLimiterPreset());
    presets.push_back(loudness);

    return presets;
}

std::vector<DynamicsProcessor::Preset> DynamicsProcessorFactory::getAllPresets() {
    std::vector<DynamicsProcessor::Preset> allPresets = getCompressorPresets();
    std::vector<DynamicsProcessor::Preset> limiterPresets = getLimiterPresets();
    allPresets.insert(allPresets.end(), limiterPresets.begin(), limiterPresets.end());
    return allPresets;
}

CompressorConfig DynamicsProcessorFactory::createConfigFromPreset(const DynamicsProcessor::Preset& preset) {
    if (preset.type == DynamicsProcessorType::Compressor && preset.compressorData.isObject()) {
        return createVocalCompressorPreset(); // Simplified - would parse from preset data
    }
    return CompressorConfig{};
}

LimiterConfig DynamicsProcessorFactory::createLimiterConfigFromPreset(const DynamicsProcessor::Preset& preset) {
    if (preset.type == DynamicsProcessorType::Limiter && preset.limiterData.isObject()) {
        return createLimiterPreset(); // Simplified - would parse from preset data
    }
    return LimiterConfig{};
}

juce::String DynamicsProcessorFactory::getPresetCategory(const DynamicsProcessor::Preset& preset) {
    switch (preset.type) {
        case DynamicsProcessorType::Compressor:
            return "Compressors";
        case DynamicsProcessorType::Limiter:
            return "Limiters";
        case DynamicsProcessorType::Gate:
            return "Gates";
        case DynamicsProcessorType::Expander:
            return "Expanders";
        case DynamicsProcessorType::DeEsser:
            return "De-Essers";
        default:
            return "Other";
    }
}

} // namespace dynamics
} // namespace schill