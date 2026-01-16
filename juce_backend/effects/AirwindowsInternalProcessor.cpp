#include "effects/UnifiedEffectInterface.h"
#include "airwindows/AirwindowsAlgorithms.h"

namespace schill {
namespace effects {

//==============================================================================
// Airwindows Internal Implementation - Using Real Algorithms
//==============================================================================

AirwindowsInternalProcessor::AirwindowsInternalProcessor(const std::string& algorithmName) {
    algorithmName = algorithmName;
    switchToAlgorithm(algorithmName);
}

void AirwindowsInternalProcessor::processBlock(juce::AudioBuffer<float>& buffer) {
    if (!algorithm || !algorithmLoaded) {
        return;
    }

    algorithm->processBlock(buffer);
}

float AirwindowsInternalProcessor::processSample(float input) {
    if (!algorithm || !algorithmLoaded) {
        return input;
    }

    return algorithm->processSample(input);
}

void AirwindowsInternalProcessor::reset() {
    if (algorithm) {
        algorithm->reset();
    }
}

void AirwindowsInternalProcessor::prepareToPlay(double newSampleRate, int newSamplesPerBlock) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;

    if (algorithm) {
        algorithm->prepareToPlay(sampleRate, samplesPerBlock);
    }
}

UnifiedEffect::EffectInfo AirwindowsInternalProcessor::getEffectInfo() const {
    EffectInfo info;
    info.name = "Airwindows " + algorithmName;
    info.manufacturer = "Airwindows";
    info.version = "1.0";
    info.type = UnifiedEffect::Type::Internal;
    info.isInternal = true;
    info.supportsAutomation = true;
    info.supportsSidechain = false;

    if (algorithm) {
        // Get category based on algorithm info
        auto airwindowsInfo = schill::airwindows::AirwindowsIntegration::getAlgorithmInfo(algorithmName);
        switch (airwindowsInfo.type) {
            case schill::airwindows::AlgorithmType::Everglade:
            case schill::airwindows::AlgorithmType::GalacticReverb:
            case schill::airwindows::AlgorithmType::Capacitor:
            case schill::airwindows::AlgorithmType::Verbity:
                info.category = UnifiedEffect::EffectCategory::Reverb;
                break;

            case schill::airwindows::AlgorithmType::Density:
            case schill::airwindows::AlgorithmType::ConsoleChannel:
            case schill::airwindows::AlgorithmType::ConsoleBuss:
            case schill::airwindows::AlgorithmType::Pop:
            case schill::airwindows::AlgorithmType::Punch:
                info.category = UnifiedEffect::EffectCategory::Dynamics;
                break;

            case schill::airwindows::AlgorithmType::Cabs:
            case schill::airwindows::AlgorithmType::IronOxide:
            case schill::airwindows::AlgorithmType::Tube:
            case schill::airwindows::AlgorithmType::Drive:
            case schill::airwindows::AlgorithmType::StarChild:
                info.category = UnifiedEffect::EffectCategory::Distortion;
                break;

            case schill::airwindows::AlgorithmType::Capacitor2:
            case schill::airwindows::AlgorithmType::ConsoleEQ:
            case schill::airwindows::AlgorithmType::Herbalizer:
                info.category = UnifiedEffect::EffectCategory::EQ;
                break;

            case schill::airwindows::AlgorithmType::AngelHalo:
            case schill::airwindows::AlgorithmType::Bias:
            case schill::airwindows::AlgorithmType::Chorus:
            case schill::airwindows::AlgorithmType::DeEss:
                info.category = UnifiedEffect::EffectCategory::Modulation;
                break;

            case schill::airwindows::AlgorithmType::Delay:
            case schill::airwindows::AlgorithmType::Echo:
            case schill::airwindows::AlgorithmType::TapeDelay:
                info.category = UnifiedEffect::EffectCategory::Delay;
                break;

            default:
                info.category = UnifiedEffect::EffectCategory::Utility;
                break;
        }

        info.parameterCount = algorithm->getParameterCount();

        // Get parameter names
        for (int i = 0; i < algorithm->getParameterCount(); ++i) {
            info.parameters.push_back(algorithm->getParameterName(i));
        }
    } else {
        info.category = UnifiedEffect::EffectCategory::Utility;
        info.parameterCount = 0;
    }

    return info;
}

UnifiedEffect::EffectCategory AirwindowsInternalProcessor::getCategory() const {
    return getEffectInfo().category;
}

float AirwindowsInternalProcessor::getParameter(const std::string& parameterName) const {
    if (!algorithm) {
        return 0.0f;
    }

    // Find parameter by name
    for (int i = 0; i < algorithm->getParameterCount(); ++i) {
        if (algorithm->getParameterName(i) == parameterName) {
            return algorithm->getParameterValue(i);
        }
    }

    return 0.0f;
}

void AirwindowsInternalProcessor::setParameter(const std::string& parameterName, float value) {
    if (!algorithm) {
        return;
    }

    // Find and set parameter by name
    for (int i = 0; i < algorithm->getParameterCount(); ++i) {
        if (algorithm->getParameterName(i) == parameterName) {
            algorithm->setParameterValue(i, value);
            return;
        }
    }
}

std::string AirwindowsInternalProcessor::getParameterName(int index) const {
    if (!algorithm || index < 0 || index >= algorithm->getParameterCount()) {
        return "";
    }
    return algorithm->getParameterName(index);
}

int AirwindowsInternalProcessor::getParameterCount() const {
    return algorithm ? algorithm->getParameterCount() : 0;
}

float AirwindowsInternalProcessor::getParameterValue(int index) const {
    if (!algorithm || index < 0 || index >= algorithm->getParameterCount()) {
        return 0.0f;
    }
    return algorithm->getParameterValue(index);
}

void AirwindowsInternalProcessor::setParameterValue(int index, float value) {
    if (!algorithm || index < 0 || index >= algorithm->getParameterCount()) {
        return;
    }
    algorithm->setParameterValue(index, value);
}

float AirwindowsInternalProcessor::getParameterDefault(int index) const {
    if (!algorithm || index < 0 || index >= algorithm->getParameterCount()) {
        return 0.0f;
    }
    return algorithm->getParameterDefault(index);
}

void AirwindowsInternalProcessor::switchToAlgorithm(const std::string& algo) {
    // Create new algorithm
    algorithm = schill::airwindows::AirwindowsIntegration::createAlgorithm(algo);

    if (algorithm) {
        algorithmLoaded = true;

        // Initialize with sample rate if already set
        if (sampleRate > 0) {
            algorithm->prepareToPlay(sampleRate, samplesPerBlock);
        }

        // Store current parameters in internal effect base class
        for (int i = 0; i < algorithm->getParameterCount(); ++i) {
            std::string paramName = algorithm->getParameterName(i);
            float paramValue = algorithm->getParameterValue(i);
            parameterValues[paramName] = paramValue;
        }
    } else {
        algorithmLoaded = false;
    }
}

void AirwindowsInternalProcessor::initializeAlgorithm() {
    // This is handled in switchToAlgorithm now
    if (!algorithmLoaded && !algorithmName.empty()) {
        switchToAlgorithm(algorithmName);
    }
}

//==============================================================================
// Updated UnifiedEffectFactory to use Real Airwindows
//==============================================================================

std::unique_ptr<UnifiedEffect> UnifiedEffectFactory::createInternal(const std::string& effectType,
                                                                  const std::string& effectName) {
    if (effectType == "dynamics") {
        if (effectName == "compressor") {
            // Create internal compressor using existing DynamicsProcessor
            auto processor = std::make_unique<schill::dynamics::DynamicsProcessor>();
            processor->initialize(schill::dynamics::DynamicsProcessorType::Compressor);
            return std::move(processor);
        } else if (effectName == "filtergate") {
            // TODO: Re-integrate FilterGatePureDSP from effects/filtergate/
            // Old schill::dynamics::FilterGate removed (duplication)
            // New FilterGatePureDSP_v2 uses different API (DSP:: namespace)
            // Needs adapter layer or integration work
            // return nullptr;  // Disabled until integration complete
        } else if (effectName == "limiter") {
            // Create internal limiter using existing DynamicsProcessor
            auto processor = std::make_unique<schill::dynamics::DynamicsProcessor>();
            processor->initialize(schill::dynamics::DynamicsProcessorType::Limiter);
            return std::move(processor);
        }
    } else if (effectType == "airwindows" || effectName.find("Airwindows") != std::string::npos) {
        std::string cleanName = effectName;

        // Remove "Airwindows " prefix if present
        if (cleanName.find("Airwindows ") == 0) {
            cleanName = cleanName.substr(12);
        }

        // Create real Airwindows internal processor
        return std::make_unique<AirwindowsInternalProcessor>(cleanName);
    }

    return nullptr;
}

// Enhanced loadEffect method that prioritizes internal Airwindows
std::unique_ptr<UnifiedEffect> UnifiedEffectFactory::loadEffect(juce::AudioPluginFormatManager& formatManager,
                                                               const std::string& effectName,
                                                               double sampleRate, int blockSize) {
    // Try internal Airwindows first (highest priority)
    auto internal = createInternal("airwindows", effectName);
    if (internal) {
        return internal;
    }

    // Try other internal effects
    internal = createInternal("dynamics", effectName);
    if (internal) {
        return internal;
    }

    // Try external plugins (fallback)
    auto knownPluginList = std::make_unique<juce::KnownPluginList>();
    // This would need plugin scanning and discovery implementation

    return nullptr;
}

} // namespace effects
} // namespace schill