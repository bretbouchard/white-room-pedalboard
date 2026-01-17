/*
  ==============================================================================

    NexSynthPluginProcessor.cpp
    Created: January 8, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor wrapper for NexSynth FM Synthesizer

  ==============================================================================
*/

#include "NexSynthPluginProcessor.h"
#include "NexSynthPluginEditor.h"

//==============================================================================
// NexSynthPluginProcessor Implementation
//==============================================================================

NexSynthPluginProcessor::NexSynthPluginProcessor()
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

    // Initialize MPE Support (will be enabled when mpe_enabled parameter is set)
    mpeSupport = std::make_unique<MPEUniversalSupport>();

    // Configure MPE gesture mapping for FM Synthesis
    // FM synthesis benefits from MPE control over modulation indices
    MPEGestureMapping fmMapping;
    fmMapping.pressureToForce = 0.9f;        // Modulation index (brightness)
    fmMapping.timbreToSpeed = 0.6f;          // Operator envelope times
    fmMapping.pitchBendToRoughness = 0.2f;   // Operator detune + ratio shift
    mpeSupport->setGestureMapping(fmMapping);

    // Initialize Microtonal Tuning Manager
    // FM synthesis works well with experimental scales
    tuningManager = std::make_unique<MicrotonalTuningManager>();
}

NexSynthPluginProcessor::~NexSynthPluginProcessor() = default;

void NexSynthPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    // Prepare the NexSynth
    nexSynth.prepare(sampleRate, samplesPerBlock);

    // Prepare MPE support if enabled
    if (mpeSupport && mpeEnabledParam && mpeEnabledParam->load() > 0.5f) {
        mpeSupport->prepare(sampleRate);
        mpeSupportInitialized = true;
    }
}

void NexSynthPluginProcessor::releaseResources() {
    // Reset the NexSynth
    nexSynth.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool NexSynthPluginProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
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

void NexSynthPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                           juce::MidiBuffer& midiMessages) {
    juce::ScopedNoDenormals noDenormals;

    // Clear output buffers
    buffer.clear();

    // Update NexSynth parameters from JUCE parameters
    updateNexSynthParameters();

    // Check if MPE is enabled (preset-based)
    bool mpeEnabled = mpeEnabledParam && mpeEnabledParam->load() > 0.5f;

    // Process MPE first if enabled
    if (mpeEnabled && mpeSupport) {
        processMPE(midiMessages);
    }

    // Process MIDI events
    for (const auto metadata : midiMessages) {
        const auto message = metadata.getMessage();

        if (message.isNoteOn()) {
            int midiNote = message.getNoteNumber();
            int channel = message.getChannel();
            float velocity = message.getVelocity() / 127.0f;

            // Apply MPE gestures if enabled
            if (mpeEnabled && mpeSupport) {
                applyMPEToNote(midiNote, channel);
            }

            // Use microtonal frequency if enabled
            if (tuningManager && microtonalEnabledParam && microtonalEnabledParam->load() > 0.5f) {
                float frequency = getMicrotonalFrequency(midiNote);
                nexSynth.setParameter("note_frequency", frequency);
            }

            // Create note-on event
            DSP::ScheduledEvent event;
            event.time = 0.0;
            event.type = DSP::ScheduledEvent::NOTE_ON;
            event.data.note.midiNote = midiNote;
            event.data.note.velocity = velocity;
            event.sampleOffset = metadata.samplePosition;

            nexSynth.handleEvent(event);

        } else if (message.isNoteOff()) {
            int midiNote = message.getNoteNumber();
            float velocity = message.getVelocity() / 127.0f;

            // Create note-off event
            DSP::ScheduledEvent event;
            event.time = 0.0;
            event.type = DSP::ScheduledEvent::NOTE_OFF;
            event.data.note.midiNote = midiNote;
            event.data.note.velocity = velocity;
            event.sampleOffset = metadata.samplePosition;

            nexSynth.handleEvent(event);

        } else if (message.isPitchWheel()) {
            // Only process pitch wheel if MPE is not enabled (MPE handles per-note pitch)
            if (!mpeEnabled) {
                int pitchWheelValue = message.getPitchWheelValue();
                float pitchBendNormalized = (pitchWheelValue - 8192) / 8192.0f;

                // Create pitch bend event
                DSP::ScheduledEvent event;
                event.time = 0.0;
                event.type = DSP::ScheduledEvent::PITCH_BEND;
                event.data.pitchBend.bendValue = pitchBendNormalized;
                event.sampleOffset = metadata.samplePosition;

                nexSynth.handleEvent(event);
            }
        }
    }

    // Process audio through NexSynth
    float* outputs[2] = { buffer.getWritePointer(0), buffer.getWritePointer(1) };
    nexSynth.process(outputs, buffer.getNumChannels(), buffer.getNumSamples());
}

juce::AudioProcessorEditor* NexSynthPluginProcessor::createEditor() {
    // Generic editor for pluginval testing
    return new juce::GenericAudioProcessorEditor(*this);
}

bool NexSynthPluginProcessor::hasEditor() const {
    return true;
}

const juce::String NexSynthPluginProcessor::getName() const {
    return JucePlugin_Name;
}

bool NexSynthPluginProcessor::acceptsMidi() const {
    return JucePlugin_WantsMidiInput;
}

bool NexSynthPluginProcessor::producesMidi() const {
    return JucePlugin_ProducesMidiOutput;
}

bool NexSynthPluginProcessor::isMidiEffect() const {
    return JucePlugin_IsMidiEffect;
}

double NexSynthPluginProcessor::getTailLengthSeconds() const {
    return 0.0;
}

int NexSynthPluginProcessor::getNumPrograms() {
    return 1;
}

int NexSynthPluginProcessor::getCurrentProgram() {
    return 0;
}

void NexSynthPluginProcessor::setCurrentProgram(int index) {
    juce::ignoreUnused(index);
}

const juce::String NexSynthPluginProcessor::getProgramName(int index) {
    juce::ignoreUnused(index);
    return {};
}

void NexSynthPluginProcessor::changeProgramName(int index, const juce::String& newName) {
    juce::ignoreUnused(index, newName);
}

void NexSynthPluginProcessor::getStateInformation(juce::MemoryBlock& destData) {
    // Create main XML element
    std::unique_ptr<juce::XmlElement> mainXml = std::make_unique<juce::XmlElement>("NexSynthState");

    // Save JUCE parameters (includes mpe_enabled and microtonal_enabled)
    if (parameters) {
        std::unique_ptr<juce::XmlElement> paramXml(parameters->state.createXml());
        mainXml->addChildElement(paramXml.release());
    }

    // Save MPE gesture mapping (if MPE support exists)
    if (mpeSupport) {
        juce::XmlElement* mpeXml = new juce::XmlElement("MPEState");
        auto mapping = mpeSupport->getGestureMapping();
        mpeXml->setAttribute("pressureToForce", mapping.pressureToForce);
        mpeXml->setAttribute("timbreToSpeed", mapping.timbreToSpeed);
        mpeXml->setAttribute("pitchBendToRoughness", mapping.pitchBendToRoughness);
        mainXml->addChildElement(mpeXml);
    }

    // Save Microtonal state
    juce::XmlElement* microtonalXml = new juce::XmlElement("MicrotonalState");
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

void NexSynthPluginProcessor::setStateInformation(const void* data, int sizeInBytes) {
    if (sizeInBytes <= 0) return;

    // Parse XML
    std::unique_ptr<juce::XmlElement> mainXml(juce::XmlDocument::parse(
        juce::String::fromUTF8(static_cast<const char*>(data), sizeInBytes)));

    if (!mainXml || !mainXml->hasTagName("NexSynthState")) {
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

    // Load JUCE parameters (includes mpe_enabled and microtonal_enabled)
    if (parameters) {
        juce::XmlElement* paramXml = mainXml->getChildByName(parameters->state.getType());
        if (paramXml) {
            parameters->replaceState(juce::ValueTree::fromXml(*paramXml));
        }
    }

    // Load MPE gesture mapping
    juce::XmlElement* mpeXml = mainXml->getChildByName("MPEState");
    if (mpeXml && mpeSupport) {
        MPEGestureMapping mapping;
        mapping.pressureToForce = mpeXml->getDoubleAttribute("pressureToForce", 0.9);
        mapping.timbreToSpeed = mpeXml->getDoubleAttribute("timbreToSpeed", 0.6);
        mapping.pitchBendToRoughness = mpeXml->getDoubleAttribute("pitchBendToRoughness", 0.2);
        mpeSupport->setGestureMapping(mapping);
    }

    // Load Microtonal state
    juce::XmlElement* microtonalXml = mainXml->getChildByName("MicrotonalState");
    if (microtonalXml && tuningManager) {
        MicrotonalTuning tuning;
        tuning.system = static_cast<TuningSystem>(
            microtonalXml->getIntAttribute("tuningSystem",
            static_cast<int>(TuningSystem::EqualTemperament)));
        tuning.rootFrequency = microtonalXml->getDoubleAttribute("referenceFreq", 440.0);
        tuning.rootNote = microtonalXml->getIntAttribute("referenceNote", 69);
        tuningManager->setTuning(tuning);
    }
}

void NexSynthPluginProcessor::setupParameters() {
    // Create parameter layout for JUCE 8
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Global parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>("masterVolume", "Master Volume",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.7f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("pitchBendRange", "Pitch Bend Range",
        juce::NormalisableRange<float>(0.0f, 24.0f, 1.0f), 2.0f));

    // MPE & Microtonal parameters (preset-based)
    layout.add(std::make_unique<juce::AudioParameterBool>("mpe_enabled", "MPE Enabled", false));
    layout.add(std::make_unique<juce::AudioParameterBool>("microtonal_enabled", "Microtonal Enabled", true));

    // FM Operator parameters (5 operators)
    for (int i = 0; i < 5; ++i) {
        juce::String opPrefix = "op" + juce::String(i + 1) + "_";

        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "ratio", "Op " + juce::String(i + 1) + " Ratio",
            juce::NormalisableRange<float>(0.25f, 16.0f, 0.25f), (i == 0) ? 1.0f : (float)(i + 1)));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "detune", "Op " + juce::String(i + 1) + " Detune",
            juce::NormalisableRange<float>(-100.0f, 100.0f, 1.0f), 0.0f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "modIndex", "Op " + juce::String(i + 1) + " Mod Index",
            juce::NormalisableRange<float>(0.0f, 20.0f, 0.1f), 1.0f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "outputLevel", "Op " + juce::String(i + 1) + " Output",
            juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), (i == 0) ? 1.0f : 0.5f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "feedback", "Op " + juce::String(i + 1) + " Feedback",
            juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "attack", "Op " + juce::String(i + 1) + " Attack",
            juce::NormalisableRange<float>(0.001f, 5.0f, 0.001f, 0.5f), 0.01f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "decay", "Op " + juce::String(i + 1) + " Decay",
            juce::NormalisableRange<float>(0.01f, 5.0f, 0.01f, 0.5f), 0.1f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "sustain", "Op " + juce::String(i + 1) + " Sustain",
            juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.7f));
        layout.add(std::make_unique<juce::AudioParameterFloat>(opPrefix + "release", "Op " + juce::String(i + 1) + " Release",
            juce::NormalisableRange<float>(0.01f, 5.0f, 0.01f, 0.5f), 0.2f));
    }

    // Modulation matrix parameters (key routes)
    layout.add(std::make_unique<juce::AudioParameterFloat>("mod2to1", "Mod 2->1",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 1.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("mod3to2", "Mod 3->2",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 1.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("mod4to2", "Mod 4->2",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));
    layout.add(std::make_unique<juce::AudioParameterFloat>("mod5to3", "Mod 5->3",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.0f));

    // Create AudioProcessorValueTreeState with ParameterLayout
    parameters = std::make_unique<juce::AudioProcessorValueTreeState>(*this, nullptr, "NexSynth", std::move(layout));

    // Get global parameter pointers
    masterVolumeParam = parameters->getRawParameterValue("masterVolume");
    pitchBendRangeParam = parameters->getRawParameterValue("pitchBendRange");
    mpeEnabledParam = parameters->getRawParameterValue("mpe_enabled");
    microtonalEnabledParam = parameters->getRawParameterValue("microtonal_enabled");

    // Get operator parameter pointers
    for (int i = 0; i < 5; ++i) {
        juce::String opPrefix = "op" + juce::String(i + 1) + "_";
        operatorParams[i].ratioParam = parameters->getRawParameterValue(opPrefix + "ratio");
        operatorParams[i].detuneParam = parameters->getRawParameterValue(opPrefix + "detune");
        operatorParams[i].modulationIndexParam = parameters->getRawParameterValue(opPrefix + "modIndex");
        operatorParams[i].outputLevelParam = parameters->getRawParameterValue(opPrefix + "outputLevel");
        operatorParams[i].feedbackParam = parameters->getRawParameterValue(opPrefix + "feedback");
        operatorParams[i].attackParam = parameters->getRawParameterValue(opPrefix + "attack");
        operatorParams[i].decayParam = parameters->getRawParameterValue(opPrefix + "decay");
        operatorParams[i].sustainParam = parameters->getRawParameterValue(opPrefix + "sustain");
        operatorParams[i].releaseParam = parameters->getRawParameterValue(opPrefix + "release");
    }

    // Get modulation matrix parameter pointers
    mod2to1Param = parameters->getRawParameterValue("mod2to1");
    mod3to2Param = parameters->getRawParameterValue("mod3to2");
    mod4to2Param = parameters->getRawParameterValue("mod4to2");
    mod5to3Param = parameters->getRawParameterValue("mod5to3");
}

void NexSynthPluginProcessor::setupParameterCallbacks() {
    // Telemetry disabled for JUCE 7 compatibility
    /*
    // Create telemetry recorder with lock-free queue (256 events)
    // Queue size is power of 2 as required by juce::AbstractFifo
    telemetryRecorder = std::make_unique<ParameterTelemetryRecorder>(256);

    // Add listener to capture parameter changes
    // This will be called from the audio thread when parameters change
    if (parameters) {
        parameters->addListener(telemetryRecorder.get());
    }

    // Log initialization
    DBG("ParameterTelemetryRecorder: Listening for parameter changes");
    DBG("  Queue capacity: 256 events");
    DBG("  Thread-safe: Yes (lock-free)");
    */
}

void NexSynthPluginProcessor::updateNexSynthParameters() {
    if (!parameters) return;

    // Update global parameters
    if (masterVolumeParam) {
        nexSynth.setParameter("masterVolume", masterVolumeParam->load());
    }

    if (pitchBendRangeParam) {
        nexSynth.setParameter("pitchBendRange", pitchBendRangeParam->load());
    }

    // Update operator parameters
    for (int i = 0; i < 5; ++i) {
        char paramId[64];

        if (operatorParams[i].ratioParam) {
            snprintf(paramId, sizeof(paramId), "op%d_ratio", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].ratioParam->load());
        }

        if (operatorParams[i].detuneParam) {
            snprintf(paramId, sizeof(paramId), "op%d_detune", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].detuneParam->load());
        }

        if (operatorParams[i].modulationIndexParam) {
            snprintf(paramId, sizeof(paramId), "op%d_modIndex", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].modulationIndexParam->load());
        }

        if (operatorParams[i].outputLevelParam) {
            snprintf(paramId, sizeof(paramId), "op%d_outputLevel", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].outputLevelParam->load());
        }

        if (operatorParams[i].feedbackParam) {
            snprintf(paramId, sizeof(paramId), "op%d_feedback", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].feedbackParam->load());
        }

        if (operatorParams[i].attackParam) {
            snprintf(paramId, sizeof(paramId), "op%d_attack", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].attackParam->load());
        }

        if (operatorParams[i].decayParam) {
            snprintf(paramId, sizeof(paramId), "op%d_decay", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].decayParam->load());
        }

        if (operatorParams[i].sustainParam) {
            snprintf(paramId, sizeof(paramId), "op%d_sustain", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].sustainParam->load());
        }

        if (operatorParams[i].releaseParam) {
            snprintf(paramId, sizeof(paramId), "op%d_release", i + 1);
            nexSynth.setParameter(paramId, operatorParams[i].releaseParam->load());
        }
    }

    // Update modulation matrix
    if (mod2to1Param) {
        nexSynth.setParameter("mod_2to1", mod2to1Param->load());
    }

    if (mod3to2Param) {
        nexSynth.setParameter("mod_3to2", mod3to2Param->load());
    }

    if (mod4to2Param) {
        nexSynth.setParameter("mod_4to2", mod4to2Param->load());
    }

    if (mod5to3Param) {
        nexSynth.setParameter("mod_5to3", mod5to3Param->load());
    }
}

juce::String NexSynthPluginProcessor::floatToString(float value, int maxDecimalPlaces) {
    return juce::String(value, maxDecimalPlaces);
}

//==============================================================================
// MPE & Microtonal Helper Methods
//==============================================================================

void NexSynthPluginProcessor::processMPE(const juce::MidiBuffer& midiMessages) {
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

void NexSynthPluginProcessor::applyMPEToNote(int noteNumber, int midiChannel) {
    if (!mpeSupport) return;

    // Get MPE gestures for this note
    auto gestures = mpeSupport->getGestureValues(noteNumber, midiChannel);

    // Apply gestures to FM synthesis parameters
    // Force (pressure) → Modulation index (FM brightness)
    if (gestures.force >= 0.0f) {
        float modIndexMod = gestures.force * 10.0f; // Add to modulation index
        nexSynth.setParameter("mpe_mod_index", modIndexMod);
    }

    // Speed (timbre) → Operator envelope times
    if (gestures.speed >= 0.0f) {
        float envTimeMod = 1.0f - (gestures.speed * 0.6f); // Faster with higher timbre
        nexSynth.setParameter("mpe_env_time", envTimeMod);
    }

    // Roughness (pitch bend) → Operator detune + ratio shift
    if (gestures.roughness >= -1.0f) {
        float detuneMod = gestures.roughness * 100.0f; // +/- 100 cents
        nexSynth.setParameter("mpe_detune", detuneMod);

        // Subtle ratio modulation for pitch bend
        float ratioMod = 1.0f + (gestures.roughness * 0.1f);
        nexSynth.setParameter("mpe_ratio_mod", ratioMod);
    }
}

float NexSynthPluginProcessor::getMicrotonalFrequency(int midiNote) {
    if (!tuningManager) {
        // Fall back to standard 12-TET calculation
        return 440.0f * std::pow(2.0f, (midiNote - 69) / 12.0f);
    }

    // Get microtonal frequency from tuning manager
    auto tuning = tuningManager->getTuning();
    return tuning.midiToFrequency(midiNote);
}

//==============================================================================
// This creates new instances of the plugin
//==============================================================================

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new NexSynthPluginProcessor();
}
