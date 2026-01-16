/*
  ==============================================================================

    BaseInstrumentProcessor.h
    Created: January 7, 2026
    Updated: January 8, 2026 - Added MPE & Microtonal Support
    Author: Bret Bouchard

    Base class for instrument plugin processors with:
    - Automatic parameter management via APVTS
    - State serialization (presets)
    - Program management
    - Common audio processing setup
    - MIDI handling
    - MPE support (optional, per-instrument)
    - Microtonal tuning support (optional, per-instrument)

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include "ParameterBuilder.h"
#include "dsp/MPEUniversalSupport.h"
#include "dsp/MicrotonalTuning.h"

namespace PluginTemplates {

//==============================================================================
// MPE Support Levels
//==============================================================================

enum class MPESupportLevel
{
    None,           // No MPE support
    Lite,           // MPE-lite (pressure to filter/amp only)
    Partial,        // Partial MPE (gesture-focused, not melodic)
    Full            // Full MPE (per-note pitch, pressure, timbre)
};

//==============================================================================
// Base Instrument Processor
//==============================================================================

class BaseInstrumentProcessor : public juce::AudioProcessor {
public:
    //==========================================================================
    // Constructor
    //==========================================================================

    BaseInstrumentProcessor(
        const BusesProperties& buses,
        const juce::String& instrumentName,
        juce::AudioProcessorValueTreeState::ParameterLayout&& parameterLayout)
        : juce::AudioProcessor(buses)
        , instrumentName_(instrumentName)
        , parameters(*this, nullptr, juce::Identifier("State"), std::move(parameterLayout))
        , mpeSupportLevel_(MPESupportLevel::None)
        , microtonalEnabled_(false)
    {
        // Initialize parameter pointers
        initializeParameterPointers();
    }

    //==========================================================================
    // Destructor
    //==========================================================================

    ~BaseInstrumentProcessor() override = default;

    //==========================================================================
    // AudioProcessor Overrides (Must be implemented by subclasses)
    //==========================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override = 0;
    void releaseResources() override = 0;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override = 0;

    //==========================================================================
    // MPE Support Configuration
    //==========================================================================

    /**
     * Enable MPE support for this instrument
     * @param level - Support level (Lite/Partial/Full)
     * @param mapping - Gesture mapping configuration (optional, uses defaults)
     */
    void enableMPE(MPESupportLevel level, const MPEGestureMapping& mapping = MPEGestureMapping())
    {
        mpeSupportLevel_ = level;

        if (level != MPESupportLevel::None)
        {
            mpeSupport_ = std::make_unique<MPEUniversalSupport>();
            mpeSupport_->prepare(getSampleRate());
            mpeSupport_->setGestureMapping(mapping);
        }
    }

    /**
     * Check if MPE is enabled
     */
    bool isMPEEnabled() const { return mpeSupport_ != nullptr; }

    /**
     * Get MPE support level
     */
    MPESupportLevel getMPESupportLevel() const { return mpeSupportLevel_; }

    /**
     * Get gesture values for a specific note (call from voice handling)
     * @param noteNumber - MIDI note number
     * @param midiChannel - MIDI channel (for per-note MPE)
     * @return Gesture values (force, speed, contactArea, roughness)
     */
    MPENoteState::GestureValues getMPEGestures(int noteNumber, int midiChannel)
    {
        if (mpeSupport_)
        {
            return mpeSupport_->getGestureValues(noteNumber, midiChannel);
        }

        // Return default gestures if MPE not enabled
        MPENoteState::GestureValues defaults;
        return defaults;
    }

    /**
     * Process MIDI through MPE system (call from processBlock before handling notes)
     */
    void processMPE(const juce::MidiBuffer& midiMessages)
    {
        if (mpeSupport_)
        {
            mpeSupport_->processMIDI(midiMessages);
            mpeSupport_->updateSmoothing(getSampleRate(), getBlockSize());
        }
    }

    //==========================================================================
    // Microtonal Tuning Support
    //==========================================================================

    /**
     * Enable microtonal tuning support
     * @param initialTuning - Initial tuning (optional, defaults to 12-TET)
     */
    void enableMicrotonal(const MicrotonalTuning& initialTuning = MicrotonalTuning())
    {
        microtonalEnabled_ = true;
        tuningManager_ = std::make_unique<MicrotonalTuningManager>();

        if (initialTuning.isValid())
        {
            tuningManager_->setTuning(initialTuning);
        }
    }

    /**
     * Check if microtonal tuning is enabled
     */
    bool isMicrotonalEnabled() const { return microtonalEnabled_; }

    /**
     * Get the current tuning manager
     */
    MicrotonalTuningManager* getTuningManager()
    {
        return tuningManager_.get();
    }

    /**
     * Convert MIDI note to frequency (with microtonal tuning if enabled)
     * @param midiNote - MIDI note number
     * @return Frequency in Hz
     */
    float midiToFrequency(int midiNote)
    {
        if (microtonalEnabled_ && tuningManager_)
        {
            return tuningManager_->getTuning().midiToFrequency(midiNote);
        }

        // Default to standard 12-TET
        return 440.0f * std::pow(2.0f, (midiNote - 69) / 12.0f);
    }

    /**
     * Set tuning from Scala file
     * @param scalaFile - Path to .scl file
     * @return true if loaded successfully
     */
    bool loadScalaTuning(const juce::File& scalaFile)
    {
        if (microtonalEnabled_ && tuningManager_)
        {
            return tuningManager_->loadScalaFile(scalaFile);
        }
        return false;
    }

    //==========================================================================
    // Editor Creation
    //==========================================================================

    juce::AudioProcessorEditor* createEditor() override
    {
        // By default, create a generic editor
        // Subclasses can override to create custom editors
        return new juce::GenericAudioProcessorEditor(*this);
    }

    bool hasEditor() const override { return true; }

    //==========================================================================
    // Instrument Identification
    //==========================================================================

    const juce::String getName() const override { return instrumentName_; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    //==========================================================================
    // AudioProcessor Defaults
    //==========================================================================

    double getTailLengthSeconds() const override { return 0.0; }

    //==========================================================================
    // MPE Capability Declaration
    //==========================================================================

    bool supportsMPE() const override
    {
        return mpeSupportLevel_ != MPESupportLevel::None;
    }

    //==========================================================================
    // Parameter Access
    //==========================================================================

    // Get the AudioProcessorValueTreeState for editor attachment
    juce::AudioProcessorValueTreeState& getValueTreeState() { return parameters; }
    const juce::AudioProcessorValueTreeState& getValueTreeState() const { return parameters; }

    //==========================================================================
    // Program/Preset Management
    //==========================================================================

    int getNumPrograms() override
    {
        return static_cast<int>(factoryPresets_.size());
    }

    int getCurrentProgram() override
    {
        return currentProgramIndex_;
    }

    void setCurrentProgram(int index) override
    {
        if (juce::isPositiveAndBelow(index, factoryPresets_.size()))
        {
            currentProgramIndex_ = index;
            loadPreset(factoryPresets_[index].state);
        }
    }

    const juce::String getProgramName(int index) override
    {
        if (juce::isPositiveAndBelow(index, factoryPresets_.size()))
        {
            return factoryPresets_[index].name;
        }
        return {};
    }

    void changeProgramName(int index, const juce::String& newName) override
    {
        if (juce::isPositiveAndBelow(index, factoryPresets_.size()))
        {
            factoryPresets_[index].name = newName;
        }
    }

    //==========================================================================
    // State Serialization (Preset Save/Load)
    //==========================================================================

    void getStateInformation(juce::MemoryBlock& destData) override
    {
        // Save current state to XML
        auto state = parameters.copyState();
        std::unique_ptr<juce::XmlElement> xml(state.createXml());

        // Save MPE state if enabled
        if (mpeSupport_ && mpeSupportLevel_ != MPESupportLevel::None)
        {
            auto* mpeElement = new juce::XmlElement("MPEState");
            mpeElement->setAttribute("enabled", true);
            mpeElement->setAttribute("level", static_cast<int>(mpeSupportLevel_));

            auto mapping = mpeSupport_->getGestureMapping();
            mpeElement->setAttribute("pressureToForce", mapping.pressureToForce);
            mpeElement->setAttribute("timbreToSpeed", mapping.timbreToSpeed);
            mpeElement->setAttribute("pitchBendToRoughness", mapping.pitchBendToRoughness);

            xml->addChildElement(mpeElement);
        }

        // Save microtonal state if enabled
        if (microtonalEnabled_ && tuningManager_)
        {
            auto* microtonalElement = new juce::XmlElement("MicrotonalState");
            microtonalElement->setAttribute("enabled", true);

            auto tuning = tuningManager_->getTuning();
            microtonalElement->setAttribute("system", static_cast<int>(tuning.system));
            microtonalElement->setAttribute("divisions", tuning.divisions);
            microtonalElement->setAttribute("rootFrequency", tuning.rootFrequency);
            microtonalElement->setAttribute("rootNote", tuning.rootNote);
            microtonalElement->setAttribute("scaleName", tuning.scaleName);

            xml->addChildElement(microtonalElement);
        }

        // Add custom state if subclass provides it
        if (auto customState = getCustomState())
        {
            xml->addChildElement(customState.release());
        }

        copyXmlToBinary(*xml, destData);
    }

    void setStateInformation(const void* data, int sizeInBytes) override
    {
        std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

        if (xmlState != nullptr && xmlState->hasTagName(parameters.state.getType()))
        {
            // Restore parameters
            parameters.replaceState(juce::ValueTree::fromXml(*xmlState));

            // Restore MPE state if present
            if (auto* mpeElement = xmlState->getChildByName(juce::Identifier("MPEState")))
            {
                bool mpeEnabled = mpeElement->getBoolAttribute("enabled", false);
                if (mpeEnabled && mpeSupport_)
                {
                    int levelInt = mpeElement->getIntAttribute("level", static_cast<int>(MPESupportLevel::Full));
                    mpeSupportLevel_ = static_cast<MPESupportLevel>(levelInt);

                    MPEGestureMapping mapping;
                    mapping.pressureToForce = mpeElement->getDoubleAttribute("pressureToForce", 1.0f);
                    mapping.timbreToSpeed = mpeElement->getDoubleAttribute("timbreToSpeed", 0.5f);
                    mapping.pitchBendToRoughness = mpeElement->getDoubleAttribute("pitchBendToRoughness", 0.3f);

                    mpeSupport_->setGestureMapping(mapping);
                }
            }

            // Restore microtonal state if present
            if (auto* microtonalElement = xmlState->getChildByName(juce::Identifier("MicrotonalState")))
            {
                bool microtonalEnabled = microtonalElement->getBoolAttribute("enabled", false);
                if (microtonalEnabled && tuningManager_)
                {
                    MicrotonalTuning tuning;
                    int systemInt = microtonalElement->getIntAttribute("system", static_cast<int>(TuningSystem::EqualTemperament));
                    tuning.system = static_cast<TuningSystem>(systemInt);
                    tuning.divisions = microtonalElement->getIntAttribute("divisions", 12);
                    tuning.rootFrequency = microtonalElement->getDoubleAttribute("rootFrequency", 440.0);
                    tuning.rootNote = microtonalElement->getIntAttribute("rootNote", 69);
                    tuning.scaleName = microtonalElement->getStringAttribute("scaleName", "12-TET");

                    tuningManager_->setTuning(tuning);
                }
            }

            // Restore custom state if present
            if (auto* customStateElement = xmlState->getChildByName(juce::Identifier("CustomState")))
            {
                restoreCustomState(*customStateElement);
            }
        }
    }

    //==========================================================================
    // Preset Management
    //==========================================================================

    struct Preset {
        juce::String name;
        juce::String state; // XML state as string
    };

    void addFactoryPreset(const juce::String& name, const juce::String& xmlState)
    {
        factoryPresets_.push_back({ name, xmlState });
    }

    void loadPreset(const juce::String& xmlState)
    {
        if (auto xml = juce::XmlDocument::parse(xmlState))
        {
            if (xml->hasTagName(parameters.state.getType()))
            {
                parameters.replaceState(juce::ValueTree::fromXml(*xml));
            }
        }
    }

    juce::String getCurrentStateAsXml()
    {
        auto state = parameters.copyState();
        std::unique_ptr<juce::XmlElement> xml(state.createXml());
        return xml->toString();
    }

    //==========================================================================
    // Custom State Hooks (Optional for subclasses)
    //==========================================================================

    // Override to save additional state beyond parameters
    virtual std::unique_ptr<juce::XmlElement> getCustomState() const { return nullptr; }

    // Override to restore additional state beyond parameters
    virtual void restoreCustomState(const juce::XmlElement& element) {
        juce::ignoreUnused(element);
    }

protected:
    //==========================================================================
    // Protected Members
    //==========================================================================

    // APVTS for parameter management
    juce::AudioProcessorValueTreeState parameters;

    // Factory presets
    std::vector<Preset> factoryPresets_;
    int currentProgramIndex_ = 0;

    //==========================================================================
    // Parameter Access Helpers
    //==========================================================================

    // Get raw parameter pointer (be careful with thread safety)
    juce::AudioProcessorParameter* getParameter(const juce::String& parameterID)
    {
        return parameters.getParameter(parameterID);
    }

    // Get current parameter value (thread-safe via atomic)
    float getParameterValue(const juce::String& parameterID) const
    {
        if (auto* param = parameters.getParameter(parameterID))
        {
            return param->getValue();
        }
        return 0.0f;
    }

    // Set parameter value (will be smoothed by host)
    void setParameterValue(const juce::String& parameterID, float value)
    {
        if (auto* param = parameters.getParameter(parameterID))
        {
            param->setValueNotifyingHost(value);
        }
    }

    //==========================================================================
    // Add Parameter to Runtime Map (for quick access)
    //==========================================================================

    void registerParameterPointer(const juce::String& id, std::atomic<float>* pointer)
    {
        parameterPointers_[id] = pointer;
    }

    std::atomic<float>* getParameterPointer(const juce::String& id)
    {
        auto it = parameterPointers_.find(id);
        if (it != parameterPointers_.end())
        {
            return it->second;
        }
        return nullptr;
    }

    //==========================================================================
    // MPE & Microtonal Access (for subclasses)
    //==========================================================================

    MPEUniversalSupport* getMPESupport() { return mpeSupport_.get(); }
    MicrotonalTuningManager* getTuningManagerRaw() { return tuningManager_.get(); }

private:
    //==========================================================================
    // Private Members
    //==========================================================================

    juce::String instrumentName_;

    // Map of parameter IDs to atomic float pointers
    std::map<juce::String, std::atomic<float>*> parameterPointers_;

    // MPE Support
    MPESupportLevel mpeSupportLevel_;
    std::unique_ptr<MPEUniversalSupport> mpeSupport_;

    // Microtonal Support
    bool microtonalEnabled_;
    std::unique_ptr<MicrotonalTuningManager> tuningManager_;

    //==========================================================================
    // Initialize Parameter Pointers (Override in subclass)
    //==========================================================================

    virtual void initializeParameterPointers()
    {
        // Subclass should populate parameterPointers_ map
        // Example:
        // auto* param = parameters.getParameter("drillAmount");
        // drillAmountParam = dynamic_cast<juce::AudioParameterFloat*>(param);
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BaseInstrumentProcessor)
};

} // namespace PluginTemplates
