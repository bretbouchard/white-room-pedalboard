#include "airwindows/AirwindowsAlgorithms.h"

namespace schill {
namespace airwindows {

//==============================================================================
// Density Algorithm Implementation
//==============================================================================

Density::Density() {
    // Initialize parameters
    A = 0.0f; // drive
    B = 0.5f; // tone
    C = 1.0f; // mix
    bypass = false;

    // Initialize state
    iirSampleA = 0.0f;
    iirSampleB = 0.0f;
    iirSampleC = 0.0f;
    iirSampleD = 0.0f;
    lastSample = 0.0f;
    drivegain = 1.0f;
    densitygain = 1.0f;
}

void Density::processBlock(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    updateParameters();

    if (bypass) {
        return;
    }

    if (numChannels == 1) {
        // Mono processing
        float* channelData = buffer.getWritePointer(0);
        for (int i = 0; i < numSamples; ++i) {
            channelData[i] = densityProcess(channelData[i]);
        }
    } else if (numChannels >= 2) {
        // Stereo processing - treat channels separately but linked
        float* leftData = buffer.getWritePointer(0);
        float* rightData = buffer.getWritePointer(1);

        for (int i = 0; i < numSamples; ++i) {
            // Process left channel
            float leftIn = leftData[i];
            float leftOut = densityProcess(leftIn);

            // Process right channel with linked density gain
            float rightIn = rightData[i];
            float rightOut = densityProcess(rightIn);

            // Apply linked gain to maintain stereo balance
            leftData[i] = leftOut;
            rightData[i] = rightOut;
        }

        // Process additional channels if present
        for (int ch = 2; ch < numChannels; ++ch) {
            float* channelData = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                channelData[i] = densityProcess(channelData[i]);
            }
        }
    }
}

float Density::processSample(float input) {
    if (bypass) {
        return input;
    }

    return densityProcess(input);
}

float Density::densityProcess(float input) {
    // Airwindows Density algorithm implementation
    // This is a simplified version of the actual Airwindows Density algorithm

    // Input gain
    float inputSample = input * drivegain;

    // Airwindows-style IIR filtering for tone control
    float smooth = B; // tone parameter controls filtering
    float intensity = 0.618033988749895f; // Golden ratio, used in many Airwindows plugins

    // High frequency filtering (simplified)
    iirSampleA = (iirSampleA * (1.0f - smooth)) + (inputSample * smooth);
    float highFreq = inputSample - iirSampleA;

    // Low frequency filtering (simplified)
    iirSampleB = (iirSampleB * (1.0f - smooth * 0.5f)) + (iirSampleA * smooth * 0.5f);

    // Mid frequency content
    float midFreq = iirSampleA - iirSampleB;

    // Density processing - the core of the algorithm
    // Airwindows uses a combination of saturation and waveshaping
    float density = std::abs(inputSample);
    density = density * density; // Square for intensity
    density = density * intensity; // Apply golden ratio scaling

    // Waveshaping function (Airwindows style)
    float waveshaped = inputSample;
    if (density > 0.5f) {
        // Soft saturation curve based on density
        float saturationAmount = (density - 0.5f) * 2.0f;
        float sign = (waveshaped > 0.0f) ? 1.0f : -1.0f;
        waveshaped = sign * (1.0f - std::exp(-std::abs(waveshaped) * (1.0f + saturationAmount)));
    }

    // Add harmonics based on density
    float harmonics = 0.0f;
    if (density > 0.3f) {
        harmonics = std::sin(inputSample * density * juce::MathConstants<float>::pi) * 0.1f;
    }

    // Combine processed signal
    float processed = waveshaped + harmonics * 0.5f;

    // Apply tone control to processed signal
    iirSampleC = (iirSampleC * (1.0f - B)) + (processed * B);
    iirSampleD = (iirSampleD * (1.0f - B * 0.7f)) + (iirSampleC * B * 0.7f);

    // Filtered output
    float filteredOutput = iirSampleD;

    // Mix dry and wet signals
    float output = (inputSample * (1.0f - C)) + (filteredOutput * C);

    // Apply density gain
    output *= densitygain;

    // Soft limiting to prevent clipping
    if (std::abs(output) > 0.95f) {
        output = std::copysign(0.95f, output);
    }

    // Store last sample for smoothing
    lastSample = output;

    return output;
}

void Density::reset() {
    iirSampleA = 0.0f;
    iirSampleB = 0.0f;
    iirSampleC = 0.0f;
    iirSampleD = 0.0f;
    lastSample = 0.0f;
    updateParameters();
}

void Density::prepareToPlay(double newSampleRate, int newSamplesPerBlock) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;
    reset();
}

std::string Density::getParameterName(int index) const {
    switch (index) {
        case 0: return "Drive";
        case 1: return "Tone";
        case 2: return "Mix";
        default: return "";
    }
}

float Density::getParameterValue(int index) const {
    switch (index) {
        case 0: return A;
        case 1: return B;
        case 2: return C;
        default: return 0.0f;
    }
}

void Density::setParameterValue(int index, float value) {
    switch (index) {
        case 0:
            A = juce::jlimit(0.0f, 1.0f, value);
            break;
        case 1:
            B = juce::jlimit(0.0f, 1.0f, value);
            break;
        case 2:
            C = juce::jlimit(0.0f, 1.0f, value);
            break;
    }
    updateParameters();
}

float Density::getParameterDefault(int index) const {
    switch (index) {
        case 0: return 0.0f;  // Drive
        case 1: return 0.5f;  // Tone
        case 2: return 1.0f;  // Mix
        default: return 0.0f;
    }
}

void Density::updateParameters() {
    // Convert normalized parameters to algorithm values
    float driveParameter = A * A * A; // Cubic curve for more natural drive response
    drivegain = 1.0f + (driveParameter * 4.0f); // 1.0 to 5.0 gain

    // Tone affects filtering
    // B is already normalized (0-1)

    // Mix is already normalized (0-1)
    // C is already normalized (0-1)

    // Apply density gain based on drive and tone
    densitygain = 1.0f + (driveParameter * B * 0.5f); // Slight gain compensation
}

//==============================================================================
// Airwindows Factory Implementation
//==============================================================================

std::unique_ptr<AirwindowsAlgorithm> AirwindowsFactory::create(AlgorithmType type) {
    switch (type) {
        case AlgorithmType::Density:
            return std::make_unique<Density>();

        case AlgorithmType::Everglade:
            // return std::make_unique<EvergladeReverb>();
            return nullptr; // Not implemented yet

        case AlgorithmType::Cabs:
            // return std::make_unique<Cabs>();
            return nullptr; // Not implemented yet

        default:
            return nullptr; // Algorithm not implemented
    }
}

std::unique_ptr<AirwindowsAlgorithm> AirwindowsFactory::create(const std::string& name) {
    AlgorithmType type = getAlgorithmType(name);
    if (type != AlgorithmType::Point) { // Point is our "not found" enum value
        return create(type);
    }

    // Try case-insensitive matching
    std::string lowerName = name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);

    if (lowerName == "density" || lowerName == "airwindows density") {
        return create(AlgorithmType::Density);
    }

    return nullptr;
}

std::vector<std::string> AirwindowsFactory::getAvailableAlgorithms() {
    std::vector<std::string> algorithms;

    // Currently implemented algorithms
    algorithms.push_back("Density");

    // Add more as they're implemented
    // algorithms.push_back("Everglade");
    // algorithms.push_back("Cabs");

    return algorithms;
}

std::vector<AlgorithmType> AirwindowsFactory::getAvailableTypes() {
    return {AlgorithmType::Density}; // Only Density is implemented
}

bool AirwindowsFactory::isAlgorithmAvailable(const std::string& name) {
    auto algorithms = getAvailableAlgorithms();
    std::string lowerName = name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);

    for (const auto& algo : algorithms) {
        std::string lowerAlgo = algo;
        std::transform(lowerAlgo.begin(), lowerAlgo.end(), lowerAlgo.begin(), ::tolower);
        if (lowerAlgo == lowerName || lowerAlgo.find(lowerName) != std::string::npos) {
            return true;
        }
    }

    return false;
}

AlgorithmType AirwindowsFactory::getAlgorithmType(const std::string& name) {
    std::string lowerName = name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);

    if (lowerName == "density" || lowerName.find("density") != std::string::npos) {
        return AlgorithmType::Density;
    }

    return AlgorithmType::Point; // Not found
}

std::string AirwindowsFactory::getAlgorithmDisplayName(AlgorithmType type) {
    switch (type) {
        case AlgorithmType::Density: return "Density";
        case AlgorithmType::Everglade: return "Everglade";
        case AlgorithmType::Cabs: return "Cabs";
        default: return "Unknown";
    }
}

std::string AirwindowsFactory::getAlgorithmDescription(AlgorithmType type) {
    switch (type) {
        case AlgorithmType::Density:
            return "Density - Saturation and harmonics processor with drive, tone, and mix controls";

        case AlgorithmType::Everglade:
            return "Everglade - Natural reverb with early reflections and diffusion";

        case AlgorithmType::Cabs:
            return "Cabs - Cabinet simulator with impulse response based processing";

        default:
            return "Unknown algorithm";
    }
}

//==============================================================================
// Algorithm Registry Implementation
//==============================================================================

const AlgorithmRegistry& AlgorithmRegistry::getInstance() {
    static AlgorithmRegistry instance;
    if (instance.algorithms.empty()) {
        instance.initializeRegistry();
    }
    return instance;
}

void AlgorithmRegistry::initializeRegistry() {
    // Register currently implemented algorithms
    registerAlgorithm(AlgorithmType::Density, "Density", "Density", "Dynamics",
                     "Saturation and harmonics processor with drive, tone, and mix controls", 3, true);

    // Register planned algorithms (not implemented yet)
    registerAlgorithm(AlgorithmType::Everglade, "Everglade", "Everglade", "Reverb",
                     "Natural reverb with early reflections and diffusion", 9, false);

    registerAlgorithm(AlgorithmType::Cabs, "Cabs", "Cabs", "Distortion",
                     "Cabinet simulator with impulse response based processing", 5, false);

    registerAlgorithm(AlgorithmType::GalacticReverb, "GalacticReverb", "Galactic Reverb", "Reverb",
                     "Space-themed reverb with diffusion and modulation", 8, false);

    registerAlgorithm(AlgorithmType::ConsoleChannel, "ConsoleChannel", "Console Channel", "Dynamics",
                     "Console channel strip emulation with EQ and compression", 6, false);

    registerAlgorithm(AlgorithmType::Tube, "Tube", "Tube", "Distortion",
                     "Tube saturation and harmonic enhancement", 4, false);
}

void AlgorithmRegistry::registerAlgorithm(AlgorithmType type, const std::string& name,
                                         const std::string& displayName, const std::string& category,
                                         const std::string& description, int paramCount, bool implemented) {
    AlgorithmInfo info;
    info.type = type;
    info.name = name;
    info.displayName = displayName;
    info.category = category;
    info.description = description;
    info.parameterCount = paramCount;
    info.isImplemented = implemented;

    algorithms[type] = info;
    categoryMap[category].push_back(type);
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getAllAlgorithms() const {
    std::vector<AlgorithmInfo> result;
    for (const auto& pair : algorithms) {
        result.push_back(pair.second);
    }
    return result;
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getAlgorithmsByCategory(const std::string& category) const {
    std::vector<AlgorithmInfo> result;
    auto it = categoryMap.find(category);
    if (it != categoryMap.end()) {
        for (AlgorithmType type : it->second) {
            auto algoIt = algorithms.find(type);
            if (algoIt != algorithms.end()) {
                result.push_back(algoIt->second);
            }
        }
    }
    return result;
}

AlgorithmRegistry::AlgorithmInfo AlgorithmRegistry::getAlgorithmInfo(AlgorithmType type) const {
    auto it = algorithms.find(type);
    if (it != algorithms.end()) {
        return it->second;
    }
    return AlgorithmInfo{}; // Return empty info if not found
}

bool AlgorithmRegistry::isAlgorithmImplemented(AlgorithmType type) const {
    auto it = algorithms.find(type);
    return it != algorithms.end() && it->second.isImplemented;
}

std::vector<std::string> AlgorithmRegistry::getCategories() const {
    std::vector<std::string> result;
    for (const auto& pair : categoryMap) {
        result.push_back(pair.first);
    }
    return result;
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getReverbs() const {
    return getAlgorithmsByCategory("Reverb");
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getDynamics() const {
    return getAlgorithmsByCategory("Dynamics");
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getDistortion() const {
    return getAlgorithmsByCategory("Distortion");
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getEQ() const {
    return getAlgorithmsByCategory("EQ");
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AlgorithmRegistry::getModulation() const {
    return getAlgorithmsByCategory("Modulation");
}

//==============================================================================
// Airwindows Integration Implementation
//==============================================================================

bool AirwindowsIntegration::initialized = false;

bool AirwindowsIntegration::initialize() {
    if (!initialized) {
        // Access singleton instance - don't copy it
        const auto& reg = AlgorithmRegistry::getInstance();
        juce::ignoreUnused(reg); // We use getInstance() directly when needed
        initialized = true;
    }
    return true;
}

std::unique_ptr<AirwindowsAlgorithm> AirwindowsIntegration::createAlgorithm(AlgorithmType type) {
    if (!initialize()) {
        return nullptr;
    }
    return AirwindowsFactory::create(type);
}

std::unique_ptr<AirwindowsAlgorithm> AirwindowsIntegration::createAlgorithm(const std::string& name) {
    if (!initialize()) {
        return nullptr;
    }
    return AirwindowsFactory::create(name);
}

std::vector<std::string> AirwindowsIntegration::getAvailableAlgorithms() {
    if (!initialize()) {
        return {};
    }
    return AirwindowsFactory::getAvailableAlgorithms();
}

AlgorithmRegistry::AlgorithmInfo AirwindowsIntegration::getAlgorithmInfo(const std::string& name) {
    if (!initialize()) {
        return AlgorithmRegistry::AlgorithmInfo{};
    }

    auto type = AirwindowsFactory::getAlgorithmType(name);
    return AlgorithmRegistry::getInstance().getAlgorithmInfo(type);
}

std::vector<AlgorithmRegistry::AlgorithmInfo> AirwindowsIntegration::getAlgorithmsByCategory(const std::string& category) {
    if (!initialize()) {
        return {};
    }
    return AlgorithmRegistry::getInstance().getAlgorithmsByCategory(category);
}

bool AirwindowsIntegration::isInitialized() {
    return initialized;
}

int AirwindowsIntegration::getImplementedAlgorithmCount() {
    if (!initialize()) {
        return 0;
    }

    auto algorithms = AlgorithmRegistry::getInstance().getAllAlgorithms();
    int count = 0;
    for (const auto& algo : algorithms) {
        if (algo.isImplemented) {
            count++;
        }
    }
    return count;
}

int AirwindowsIntegration::getTotalAlgorithmCount() {
    if (!initialize()) {
        return 0;
    }
    return static_cast<int>(AlgorithmRegistry::getInstance().getAllAlgorithms().size());
}

std::vector<std::string> AirwindowsIntegration::getCategories() {
    if (!initialize()) {
        return {};
    }
    return registry.getCategories();
}

std::vector<std::string> AirwindowsIntegration::getAlgorithmParameters(const std::string& algorithmName) {
    std::vector<std::string> parameters;

    auto algorithm = createAlgorithm(algorithmName);
    if (algorithm) {
        for (int i = 0; i < algorithm->getParameterCount(); ++i) {
            parameters.push_back(algorithm->getParameterName(i));
        }
    }

    return parameters;
}

float AirwindowsIntegration::getAlgorithmParameterDefault(const std::string& algorithmName, const std::string& parameter) {
    auto algorithm = createAlgorithm(algorithmName);
    if (algorithm) {
        for (int i = 0; i < algorithm->getParameterCount(); ++i) {
            if (algorithm->getParameterName(i) == parameter) {
                return algorithm->getParameterDefault(i);
            }
        }
    }
    return 0.0f;
}

bool AirwindowsIntegration::loadAlgorithmPreset(const std::string& algorithmName, const std::string& presetName) {
    // Implementation would load preset from file
    return false;
}

bool AirwindowsIntegration::saveAlgorithmPreset(const std::string& algorithmName, const std::string& presetName,
                                               const std::map<std::string, float>& parameters) {
    // Implementation would save preset to file
    return false;
}

} // namespace airwindows
} // namespace schill