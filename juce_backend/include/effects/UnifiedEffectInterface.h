#pragma once

#include <JuceHeader.h>
#include <memory>
#include <string>
#include <functional>

namespace schill {
namespace effects {

//==============================================================================
// Base Interface for All Effects (Internal + External)
//==============================================================================
class UnifiedEffect {
public:
    enum class Type {
        Internal,
        External,
        Hybrid
    };

    enum class EffectCategory {
        Dynamics,
        EQ,
        Reverb,
        Delay,
        Modulation,
        Distortion,
        PitchCorrection,
        Analysis,
        Utility
    };

    struct EffectInfo {
        std::string name;
        std::string manufacturer;
        std::string version;
        Type type;
        EffectCategory category;
        bool isInternal;
        bool supportsAutomation;
        bool supportsSidechain;
        int parameterCount;
        std::vector<std::string> parameters;
    };

    virtual ~UnifiedEffect() = default;

    // Core processing interface
    virtual void processBlock(juce::AudioBuffer<float>& buffer) = 0;
    virtual void processStereo(juce::AudioBuffer<float>& leftBuffer,
                              juce::AudioBuffer<float>& rightBuffer) {}
    virtual void processMono(juce::AudioBuffer<float>& buffer) {}
    virtual void processSidechainInput(const juce::AudioBuffer<float>& sidechainBuffer) {}

    // Parameter interface
    virtual float getParameter(const std::string& parameterName) const = 0;
    virtual void setParameter(const std::string& parameterName, float value) = 0;
    virtual void setParameterNormalized(const std::string& parameterName, float normalizedValue) = 0;
    virtual float getParameterNormalized(const std::string& parameterName) const = 0;

    // MIDI interface
    virtual void processMidiMessage(const juce::MidiMessage& message) {}
    virtual void setMidiController(int ccNumber, float normalizedValue) {}

    // State management
    virtual void reset() = 0;
    virtual void prepareToPlay(double sampleRate, int samplesPerBlock) = 0;
    virtual void setBypassed(bool bypassed) {}
    virtual bool isBypassed() const { return false; }

    // Effect information
    virtual EffectInfo getEffectInfo() const = 0;
    virtual Type getEffectType() const = 0;
    virtual EffectCategory getCategory() const = 0;

    // Automation interface (unique to internal effects)
    virtual void enableAutomation(bool enabled) {}
    virtual void automateParameter(const std::string& parameter, float targetValue, float timeMs) {}
    virtual float getParameterValue(const std::string& parameter) const { return 0.0f; }
    virtual void setParameterValue(const std::string& parameter, float value) {}

    // Timeline integration (unique to internal effects)
    virtual void setTransportState(bool isPlaying, double ppqPosition) {}
    virtual void setSongPosition(double ppqPosition) {}
    virtual void setTempo(double bpm) {}

    // Unique capabilities for internal effects
    virtual bool supportsTimelineIntegration() const { return false; }
    virtual bool supportsAIControl() const { return false; }
    virtual bool supportsRealTimeParameterAccess() const { return true; }

    // Plugin-specific interface (for external effects)
    virtual bool canBeAutomated(const std::string& parameter) const { return true; }
    virtual int getParameterIndex(const std::string& parameterName) const { return -1; }
    virtual juce::String getParameterName(int parameterIndex) const { return ""; }
    virtual juce::String getParameterLabel(int parameterIndex) const { return ""; }

protected:
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
    bool bypassed = false;
};

//==============================================================================
// Internal Effect Base Class
//==============================================================================
class InternalEffect : public UnifiedEffect {
public:
    Type getEffectType() const override { return Type::Internal; }
    bool isInternal() const override { return true; }

    // Internal effects have full automation capabilities
    void enableAutomation(bool enabled) override { automationEnabled = enabled; }
    void automateParameter(const std::string& parameter, float targetValue, float timeMs) override;
    float getParameterValue(const std::string& parameter) const override;
    void setParameterValue(const std::string& parameter, float value) override;

    // Timeline integration
    void setTransportState(bool isPlaying, double ppqPosition) override;
    void setSongPosition(double ppqPosition) override;
    void setTempo(double bpm) override;

    // Unique internal capabilities
    bool supportsTimelineIntegration() const override { return true; }
    bool supportsAIControl() const override { return true; }
    bool supportsRealTimeParameterAccess() const override { return true; }

protected:
    bool automationEnabled = true;
    std::map<std::string, float> parameterValues;
    std::map<std::string, std::unique_ptr<juce::SmoothedValue<float>>> parameterSmoothers;
    double currentTempo = 120.0;
    double currentSongPosition = 0.0;
    bool isTransportPlaying = false;
};

//==============================================================================
// External Effect Wrapper (Plugin)
//==============================================================================
class ExternalEffect : public UnifiedEffect {
public:
    ExternalEffect(std::unique_ptr<juce::AudioPluginInstance> pluginInstance)
        : plugin(std::move(pluginInstance)) {}

    Type getEffectType() const override { return Type::External; }
    bool isInternal() const override { return false; }

    // Processing interface - delegates to plugin
    void processBlock(juce::AudioBuffer<float>& buffer) override {
        if (plugin && !bypassed) {
            juce::MidiBuffer emptyMidi;
            plugin->processBlock(buffer, emptyMidi);
        }
    }

    // Parameter interface - delegates to plugin
    float getParameter(const std::string& parameterName) const override {
        int index = getParameterIndex(parameterName);
        return (index >= 0) ? plugin->getParameters()[index]->getValue() : 0.0f;
    }

    void setParameter(const std::string& parameterName, float value) override {
        int index = getParameterIndex(parameterName);
        if (index >= 0) {
            plugin->getParameters()[index]->setValue(value);
        }
    }

    void setParameterNormalized(const std::string& parameterName, float normalizedValue) override {
        setParameter(parameterName, normalizedValue);
    }

    float getParameterNormalized(const std::string& parameterName) const override {
        return getParameter(parameterName);
    }

    // Plugin-specific interface
    int getParameterIndex(const std::string& parameterName) const override {
        for (int i = 0; i < plugin->getParameters().size(); ++i) {
            if (plugin->getParameters()[i]->getName(100).toStdString() == parameterName) {
                return i;
            }
        }
        return -1;
    }

    juce::String getParameterName(int parameterIndex) const override {
        if (parameterIndex >= 0 && parameterIndex < plugin->getParameters().size()) {
            return plugin->getParameters()[parameterIndex]->getName(100);
        }
        return "";
    }

    juce::String getParameterLabel(int parameterIndex) const override {
        if (parameterIndex >= 0 && parameterIndex < plugin->getParameters().size()) {
            return plugin->getParameters()[parameterIndex]->getLabel();
        }
        return "";
    }

    bool canBeAutomated(const std::string& parameter) const override {
        int index = getParameterIndex(parameter);
        return (index >= 0) ? plugin->getParameters()[index]->isAutomatable() : false;
    }

    // State management
    void reset() override {
        if (plugin) {
            plugin->reset();
        }
    }

    void prepareToPlay(double newSampleRate, int newSamplesPerBlock) override {
        sampleRate = newSampleRate;
        samplesPerBlock = newSamplesPerBlock;

        if (plugin) {
            plugin->prepareToPlay(newSampleRate, newSamplesPerBlock);
            plugin->setPlayConfigDetails(newSamplesPerBlock, 2, newSampleRate, 2);
        }
    }

    void setBypassed(bool newBypassed) override {
        bypassed = newBypassed;
    }

    bool isBypassed() const override {
        return bypassed;
    }

    // External plugins have limited automation capabilities
    bool supportsTimelineIntegration() const override { return false; }
    bool supportsAIControl() const override { return false; }
    bool supportsRealTimeParameterAccess() const override { return false; }

    // Effect information
    EffectInfo getEffectInfo() const override {
        EffectInfo info;
        if (plugin) {
            info.name = plugin->getName().toStdString();
            info.manufacturer = "Unknown"; // Would need to get from plugin descriptor
            info.version = "1.0";
            info.type = Type::External;
            info.category = EffectCategory::Utility; // Would need detection logic
            info.isInternal = false;
            info.supportsAutomation = true;
            info.supportsSidechain = false; // Would need detection
            info.parameterCount = plugin->getParameters().size();

            for (int i = 0; i < plugin->getParameters().size(); ++i) {
                info.parameters.push_back(plugin->getParameters()[i]->getName(100).toStdString());
            }
        }
        return info;
    }

private:
    std::unique_ptr<juce::AudioPluginInstance> plugin;
};

//==============================================================================
// Airwindows Internal Implementation
//==============================================================================
class AirwindowsInternalProcessor : public InternalEffect {
public:
    AirwindowsInternalProcessor(const std::string& algorithmName)
        : algorithm(algorithmName) {}

    void processBlock(juce::AudioBuffer<float>& buffer) override {
        // Direct implementation of Airwindows algorithm
        switchToAlgorithm(algorithm);

        const int numChannels = buffer.getNumChannels();
        const int numSamples = buffer.getNumSamples();

        for (int ch = 0; ch < numChannels; ++ch) {
            float* channelData = buffer.getWritePointer(ch);

            for (int i = 0; i < numSamples; ++i) {
                channelData[i] = processSample(channelData[i]);
            }
        }
    }

    EffectInfo getEffectInfo() const override {
        EffectInfo info;
        info.name = "Airwindows " + algorithm;
        info.manufacturer = "Airwindows";
        info.version = "1.0";
        info.type = Type::Internal;
        info.category = EffectCategory::Dynamics; // Would vary by algorithm
        info.isInternal = true;
        info.supportsAutomation = true;
        info.supportsSidechain = false;
        info.parameterCount = static_cast<int>(parameters.size());

        for (const auto& param : parameters) {
            info.parameters.push_back(param.first);
        }

        return info;
    }

    EffectCategory getCategory() const override {
        // Return category based on algorithm
        if (algorithm == "Everglade" || algorithm == "GalacticReverb") {
            return EffectCategory::Reverb;
        } else if (algorithm == "Density" || algorithm == "Cabs") {
            return EffectCategory::Distortion;
        } else {
            return EffectCategory::Utility;
        }
    }

protected:
    void switchToAlgorithm(const std::string& algo) {
        algorithm = algo;
        // Initialize algorithm-specific parameters and state
        initializeAlgorithm();
    }

    void initializeAlgorithm() {
        // Airwindows algorithms typically have simple parameter sets
        parameters.clear();

        if (algorithm == "Everglade") {
            parameters["bypass"] = 0.0f;
            parameters["wet"] = 1.0f;
            parameters["size"] = 0.5f;
            parameters["delay"] = 0.5f;
            parameters["regen"] = 0.3f;
        } else if (algorithm == "Density") {
            parameters["bypass"] = 0.0f;
            parameters["drive"] = 0.5f;
            parameters["tone"] = 0.5f;
        }
        // ... add more algorithms
    }

    float processSample(float input) {
        // Direct implementation of the Airwindows algorithm
        // This would be the actual DSP code from Airwindows

        if (algorithm == "Density") {
            return processDensityAlgorithm(input);
        } else if (algorithm == "Everglade") {
            return processEvergladeAlgorithm(input);
        }

        return input; // Default pass-through
    }

private:
    std::string algorithm;
    std::map<std::string, float> parameters;

    // Algorithm-specific processing
    float processDensityAlgorithm(float input) {
        // Simplified Airwindows Density algorithm implementation
        float drive = parameters["drive"];
        float output = input * (1.0f + drive);

        // Airwindows-style soft saturation
        if (std::abs(output) > 1.0f) {
            output = std::copysign(1.0f + 0.1f * std::tanh(std::abs(output) - 1.0f), output);
        }

        return output;
    }

    float processEvergladeAlgorithm(float input) {
        // Simplified Airwindows Everglade reverb implementation
        // Real implementation would have delay lines, diffusion, etc.
        return input; // Placeholder
    }
};

//==============================================================================
// Unified Effect Factory
//==============================================================================
class UnifiedEffectFactory {
public:
    // Create internal effect
    static std::unique_ptr<UnifiedEffect> createInternal(const std::string& effectType,
                                                        const std::string& effectName) {
        if (effectType == "dynamics") {
            if (effectName == "compressor") {
                // Create internal compressor using existing DynamicsProcessor
                // ...
            } else if (effectName == "filtergate") {
                // Create internal filter gate using existing FilterGate
                // ...
            }
        } else if (effectType == "airwindows") {
            return std::make_unique<AirwindowsInternalProcessor>(effectName);
        }

        return nullptr;
    }

    // Load external effect (plugin)
    static std::unique_ptr<UnifiedEffect> loadExternal(juce::AudioPluginFormatManager& formatManager,
                                                       const juce::File& pluginFile,
                                                       double sampleRate, int blockSize) {
        auto plugin = loadPluginInstance(formatManager, pluginFile, sampleRate, blockSize);
        if (plugin) {
            return std::make_unique<ExternalEffect>(std::move(plugin));
        }
        return nullptr;
    }

    // Load effect by name (interchangeable)
    static std::unique_ptr<UnifiedEffect> loadEffect(juce::AudioPluginFormatManager& formatManager,
                                                     const std::string& effectName,
                                                     double sampleRate, int blockSize) {
        // Try internal first
        auto internal = createInternal("airwindows", effectName);
        if (internal) {
            return internal;
        }

        // Try external plugins
        auto knownPluginList = std::make_unique<juce::KnownPluginList>();
        // Scan and find plugin by name...

        return nullptr;
    }

private:
    static std::unique_ptr<juce::AudioPluginInstance> loadPluginInstance(
        juce::AudioPluginFormatManager& formatManager,
        const juce::File& pluginFile,
        double sampleRate, int blockSize) {

        juce::PluginDescription desc;
        for (int i = 0; i < formatManager.getNumFormats(); ++i) {
            auto* format = formatManager.getFormat(i);
            if (auto* plugin = format->loadPluginFrom(pluginFile, desc)) {
                plugin->prepareToPlay(sampleRate, blockSize);
                return std::unique_ptr<juce::AudioPluginInstance>(plugin);
            }
        }
        return nullptr;
    }
};

} // namespace effects
} // namespace schill