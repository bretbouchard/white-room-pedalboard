/*
  ==============================================================================

    SamSamplerPluginProcessor.cpp
    Created: January 8, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor wrapper implementation for Sam Sampler

  ==============================================================================
*/

#include "SamSamplerPluginProcessor.h"
#include "SamSamplerPluginEditor.h"

//==============================================================================
// SamSamplerPluginProcessor Implementation
//==============================================================================

SamSamplerPluginProcessor::SamSamplerPluginProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : juce::AudioProcessor(BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       )
#endif
{
    // Initialize parameter tree
    setupParameters();
    setupParameterCallbacks();

    // Initialize MPE Support (Lite - pressure to filter/amp only)
    mpeSupport = std::make_unique<MPEUniversalSupport>();

    // Configure MPE gesture mapping for Sampler (MPE-Lite)
    // Samples are baked, so pressure only affects filter/amplitude
    MPEGestureMapping samplerMapping;
    samplerMapping.pressureToForce = 0.5f;        // Filter cutoff or amplitude
    samplerMapping.timbreToSpeed = 0.0f;          // Not used (samples fixed)
    samplerMapping.pitchBendToRoughness = 0.0f;   // Not used (samples fixed pitch)
    mpeSupport->setGestureMapping(samplerMapping);

    // Initialize Microtonal Tuning Manager
    // Limited utility since samples are baked, but available for mapping
    tuningManager = std::make_unique<MicrotonalTuningManager>();
}

SamSamplerPluginProcessor::~SamSamplerPluginProcessor() = default;

void SamSamplerPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    // Prepare the sampler
    samSampler.prepare(sampleRate, samplesPerBlock);

    // Prepare MPE support
    if (mpeSupport && mpeEnabled) {
        mpeSupport->prepare(sampleRate);
    }
}

void SamSamplerPluginProcessor::releaseResources() {
    // Reset the sampler
    samSampler.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool SamSamplerPluginProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    #if JucePlugin_IsMidiEffect
    juce::ignoreUnused(layouts);
    return true;
    #else
    // Support mono and stereo layouts
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    #if ! JucePlugin_IsSynth
    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;
    #endif

    return true;
    #endif
}
#endif

void SamSamplerPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                              juce::MidiBuffer& midiMessages) {
    juce::ScopedNoDenormals noDenormals;

    // Update sampler parameters from JUCE parameters
    updateSamSamplerParameters();

    // Process MPE first (before note handling)
    if (mpeSupport && mpeEnabled) {
        processMPE(midiMessages);
    }

    // Process MIDI events
    for (const auto metadata : midiMessages) {
        const auto message = metadata.getMessage();
        int samplePosition = metadata.samplePosition;

        if (message.isNoteOn()) {
            int midiNote = message.getNoteNumber();
            int channel = message.getChannel();
            float velocity = message.getVelocity() / 127.0f;

            // Apply MPE gestures if available
            if (mpeSupport && mpeEnabled) {
                applyMPEToNote(midiNote, channel);
            }

            samSampler.noteOn(midiNote, velocity);
        } else if (message.isNoteOff()) {
            samSampler.noteOff(message.getNoteNumber());
        } else if (message.isPitchWheel()) {
            // Samples are baked, so pitch bend has limited effect
            // But we still pass it through for sample pitch shifting if supported
            float pitchBendValue = (message.getPitchWheelValue() - 8192) / 8192.0f;
            DSP::ScheduledEvent event;
            event.type = DSP::ScheduledEvent::PITCH_BEND;
            event.time = 0.0;
            event.sampleOffset = samplePosition;
            event.data.pitchBend.bendValue = pitchBendValue;
            samSampler.handleEvent(event);
        } else if (message.isController()) {
            // Handle CC messages
            DSP::ScheduledEvent event;
            event.type = DSP::ScheduledEvent::CONTROL_CHANGE;
            event.time = 0.0;
            event.sampleOffset = samplePosition;
            event.data.controlChange.controllerNumber = message.getControllerNumber();
            event.data.controlChange.value = message.getControllerValue() / 127.0f;
            samSampler.handleEvent(event);
        } else if (message.isChannelPressure()) {
            DSP::ScheduledEvent event;
            event.type = DSP::ScheduledEvent::CHANNEL_PRESSURE;
            event.time = 0.0;
            event.sampleOffset = samplePosition;
            event.data.channelPressure.pressure = message.getChannelPressureValue() / 127.0f;
            samSampler.handleEvent(event);
        }
    }

    // Clear output buffer
    buffer.clear();

    // Process audio through sampler
    float* outputs[2] = { buffer.getWritePointer(0), buffer.getWritePointer(1) };
    samSampler.process(outputs, buffer.getNumChannels(), buffer.getNumSamples());
}

juce::AudioProcessorEditor* SamSamplerPluginProcessor::createEditor() {
    return new SamSamplerPluginEditor(*this);
}

bool SamSamplerPluginProcessor::hasEditor() const {
    return true;
}

const juce::String SamSamplerPluginProcessor::getName() const {
    return JucePlugin_Name;
}

bool SamSamplerPluginProcessor::acceptsMidi() const {
    return JucePlugin_WantsMidiInput;
}

bool SamSamplerPluginProcessor::producesMidi() const {
    return JucePlugin_ProducesMidiOutput;
}

bool SamSamplerPluginProcessor::isMidiEffect() const {
    return JucePlugin_IsMidiEffect;
}

double SamSamplerPluginProcessor::getTailLengthSeconds() const {
    return 0.0;
}

int SamSamplerPluginProcessor::getNumPrograms() {
    return 1;
}

int SamSamplerPluginProcessor::getCurrentProgram() {
    return 0;
}

void SamSamplerPluginProcessor::setCurrentProgram(int index) {
    juce::ignoreUnused(index);
}

const juce::String SamSamplerPluginProcessor::getProgramName(int index) {
    juce::ignoreUnused(index);
    return {};
}

void SamSamplerPluginProcessor::changeProgramName(int index, const juce::String& newName) {
    juce::ignoreUnused(index, newName);
}

void SamSamplerPluginProcessor::getStateInformation(juce::MemoryBlock& destData) {
    // Create main XML element
    std::unique_ptr<juce::XmlElement> mainXml = std::make_unique<juce::XmlElement>("SamSamplerState");

    // Save JUCE parameters
    if (parameters) {
        std::unique_ptr<juce::XmlElement> paramXml(parameters->state.createXml());
        mainXml->addChildElement(paramXml.release());
    }

    // Save MPE state
    juce::XmlElement* mpeXml = new juce::XmlElement("MPEState");
    mpeXml->setAttribute("enabled", mpeEnabled);
    if (mpeSupport) {
        auto mapping = mpeSupport->getGestureMapping();
        mpeXml->setAttribute("pressureToForce", mapping.pressureToForce);
        mpeXml->setAttribute("timbreToSpeed", mapping.timbreToSpeed);
        mpeXml->setAttribute("pitchBendToRoughness", mapping.pitchBendToRoughness);
    }
    mainXml->addChildElement(mpeXml);

    // Save Microtonal state (limited utility for samples)
    juce::XmlElement* microtonalXml = new juce::XmlElement("MicrotonalState");
    microtonalXml->setAttribute("enabled", microtonalEnabled);
    if (tuningManager) {
        auto tuning = tuningManager->getTuning();
        microtonalXml->setAttribute("tuningSystem", static_cast<int>(tuning.system));
        microtonalXml->setAttribute("referenceFreq", tuning.rootFrequency);
        microtonalXml->setAttribute("referenceNote", tuning.rootNote);
    }
    mainXml->addChildElement(microtonalXml);

    // Write to memory block
    juce::MemoryOutputStream stream(destData, false);
    mainXml->writeTo(stream);
}

void SamSamplerPluginProcessor::setStateInformation(const void* data, int sizeInBytes) {
    if (sizeInBytes <= 0) return;

    // Parse XML
    std::unique_ptr<juce::XmlElement> mainXml(juce::XmlDocument::parse(
        juce::String::fromUTF8(static_cast<const char*>(data), sizeInBytes)));

    if (!mainXml || !mainXml->hasTagName("SamSamplerState")) {
        // Try legacy format (just parameters)
        if (parameters) {
            std::unique_ptr<juce::XmlElement> xml(juce::XmlDocument::parse(
                juce::String::fromUTF8(static_cast<const char*>(data), sizeInBytes)));
            if (xml && xml->hasTagName(parameters->state.getType())) {
                parameters->replaceState(juce::ValueTree::fromXml(*xml));
            }
        }
        return;
    }

    // Load JUCE parameters
    if (parameters) {
        juce::XmlElement* paramXml = mainXml->getChildByName(parameters->state.getType());
        if (paramXml) {
            parameters->replaceState(juce::ValueTree::fromXml(*paramXml));
        }
    }

    // Load MPE state
    juce::XmlElement* mpeXml = mainXml->getChildByName("MPEState");
    if (mpeXml) {
        mpeEnabled = mpeXml->getBoolAttribute("enabled", true);
        if (mpeSupport) {
            MPEGestureMapping mapping;
            mapping.pressureToForce = mpeXml->getDoubleAttribute("pressureToForce", 0.5);
            mapping.timbreToSpeed = mpeXml->getDoubleAttribute("timbreToSpeed", 0.0);
            mapping.pitchBendToRoughness = mpeXml->getDoubleAttribute("pitchBendToRoughness", 0.0);
            mpeSupport->setGestureMapping(mapping);
        }
    }

    // Load Microtonal state
    juce::XmlElement* microtonalXml = mainXml->getChildByName("MicrotonalState");
    if (microtonalXml) {
        microtonalEnabled = microtonalXml->getBoolAttribute("enabled", true);
        if (tuningManager) {
            MicrotonalTuning tuning;
            tuning.system = static_cast<TuningSystem>(
                microtonalXml->getIntAttribute("tuningSystem",
                static_cast<int>(TuningSystem::EqualTemperament)));
            tuning.rootFrequency = microtonalXml->getDoubleAttribute("referenceFreq", 440.0);
            tuning.rootNote = microtonalXml->getIntAttribute("referenceNote", 69);
            tuningManager->setTuning(tuning);
        }
    }
}

void SamSamplerPluginProcessor::setupParameters() {
    // Create parameter layout for JUCE 8
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Global parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("masterVolume", "Master Volume",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.7f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("pitchBendRange", "Pitch Bend Range",
        juce::NormalisableRange<float>(0.0f, 24.0f, 0.5f), 2.0f));

    // Sample playback parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("basePitch", "Base Pitch",
        juce::NormalisableRange<float>(0.1f, 4.0f, 0.01f), 1.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("sampleStart", "Sample Start",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("sampleEnd", "Sample End",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 1.0f));
    layout.add(std::make_unique<juce::AudioParameterBool>("loopEnabled", "Loop Enabled", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>("loopStart", "Loop Start",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("loopEnd", "Loop End",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 1.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("crossfade", "Loop Crossfade",
        juce::NormalisableRange<float>(0.0f, 0.5f, 0.001f), 0.01f));

    // Envelope parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("envAttack", "Attack",
        juce::NormalisableRange<float>(0.001f, 5.0f, 0.001f, 0.3f), 0.01f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("envDecay", "Decay",
        juce::NormalisableRange<float>(0.001f, 5.0f, 0.001f, 0.3f), 0.1f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("envSustain", "Sustain",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.7f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("envRelease", "Release",
        juce::NormalisableRange<float>(0.001f, 5.0f, 0.001f, 0.3f), 0.2f));

    // Filter parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("filterCutoff", "Filter Cutoff",
        juce::NormalisableRange<float>(20.0f, 20000.0f, 1.0f, 0.5f), 20000.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("filterResonance", "Filter Resonance",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterBool>("filterEnabled", "Filter Enabled", false));

    // Effects parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("reverbMix", "Reverb Mix",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("delayMix", "Delay Mix",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("drive", "Drive",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));

    // Create AudioProcessorValueTreeState with ParameterLayout
    parameters = std::make_unique<juce::AudioProcessorValueTreeState>(*this, nullptr, "SamSampler", std::move(layout));

    // Get parameter pointers for fast access
    masterVolumeParam = parameters->getRawParameterValue("masterVolume");
    pitchBendRangeParam = parameters->getRawParameterValue("pitchBendRange");

    basePitchParam = parameters->getRawParameterValue("basePitch");
    sampleStartParam = parameters->getRawParameterValue("sampleStart");
    sampleEndParam = parameters->getRawParameterValue("sampleEnd");
    loopEnabledParam = parameters->getRawParameterValue("loopEnabled");
    loopStartParam = parameters->getRawParameterValue("loopStart");
    loopEndParam = parameters->getRawParameterValue("loopEnd");
    crossfadeParam = parameters->getRawParameterValue("crossfade");

    envAttackParam = parameters->getRawParameterValue("envAttack");
    envDecayParam = parameters->getRawParameterValue("envDecay");
    envSustainParam = parameters->getRawParameterValue("envSustain");
    envReleaseParam = parameters->getRawParameterValue("envRelease");

    filterCutoffParam = parameters->getRawParameterValue("filterCutoff");
    filterResonanceParam = parameters->getRawParameterValue("filterResonance");
    filterEnabledParam = parameters->getRawParameterValue("filterEnabled");

    reverbMixParam = parameters->getRawParameterValue("reverbMix");
    delayMixParam = parameters->getRawParameterValue("delayMix");
    driveParam = parameters->getRawParameterValue("drive");
}

void SamSamplerPluginProcessor::setupParameterCallbacks() {
    // Add parameter change listeners if needed
    // This allows for immediate parameter updates without polling
}

void SamSamplerPluginProcessor::updateSamSamplerParameters() {
    if (!parameters) return;

    // Update global parameters
    if (masterVolumeParam) {
        samSampler.setParameter("masterVolume", masterVolumeParam->load());
    }

    if (pitchBendRangeParam) {
        samSampler.setParameter("pitchBendRange", pitchBendRangeParam->load());
    }

    // Update sample playback parameters
    if (basePitchParam) {
        samSampler.setParameter("basePitch", basePitchParam->load());
    }

    // Note: sampleStart, sampleEnd, loop parameters are not directly exposed in the DSP interface
    // They would need to be added to SamSamplerDSP::setParameter()

    // Update envelope parameters
    if (envAttackParam) {
        samSampler.setParameter("envAttack", envAttackParam->load());
    }

    if (envDecayParam) {
        samSampler.setParameter("envDecay", envDecayParam->load());
    }

    if (envSustainParam) {
        samSampler.setParameter("envSustain", envSustainParam->load());
    }

    if (envReleaseParam) {
        samSampler.setParameter("envRelease", envReleaseParam->load());
    }

    // Note: Filter and effects parameters are not directly exposed in the DSP interface
    // They would need to be added to SamSamplerDSP::setParameter()
}

juce::String SamSamplerPluginProcessor::floatToString(float value, int maxDecimalPlaces) {
    return juce::String(value, maxDecimalPlaces);
}

//==============================================================================
// MPE & Microtonal Helper Methods (MPE-Lite)
//==============================================================================

void SamSamplerPluginProcessor::processMPE(const juce::MidiBuffer& midiMessages) {
    if (!mpeSupport) return;

    // Process MPE messages to extract per-note gestures
    for (const auto metadata : midiMessages) {
        const auto message = metadata.getMessage();

        // Process MPE-specific messages
        if (message.isPitchWheel() || message.isChannelPressure()) {
            mpeSupport->processMIDI(midiMessages);
        }
    }
}

void SamSamplerPluginProcessor::applyMPEToNote(int noteNumber, int midiChannel) {
    if (!mpeSupport) return;

    // Get MPE gestures for this note
    auto gestures = mpeSupport->getGestureValues(noteNumber, midiChannel);

    // Apply gestures to sampler parameters (MPE-Lite - filter/amp only)
    // Force (pressure) → Filter cutoff + amplitude
    if (gestures.force >= 0.0f) {
        // Modulate filter cutoff based on pressure
        float cutoffMod = gestures.force * 15000.0f; // 0 to 15000 Hz modulation
        samSampler.setParameter("mpe_filter_mod", cutoffMod);

        // Modulate amplitude based on pressure (brightness/energy)
        float ampMod = gestures.force * 0.3f; // Add up to 30% gain
        samSampler.setParameter("mpe_amp_mod", ampMod);
    }

    // Timbre and pitch bend not used for sampler (samples are baked)
    juce::ignoreUnused(gestures.speed);
    juce::ignoreUnused(gestures.contactArea);
    juce::ignoreUnused(gestures.roughness);
}

//==============================================================================
// This creates new instances of the plugin
//==============================================================================

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new SamSamplerPluginProcessor();
}
