/*
  ==============================================================================

    SchillingerPluginProcessor.cpp
    Created: January 13, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor implementation for Schillinger System Composition

  ==============================================================================
*/

#include "SchillingerPluginProcessor.h"
#include "SchillingerPluginEditor.h"

//==============================================================================
// JavaScriptCore Wrapper Implementation
//==============================================================================

class SchillingerPluginProcessor::JavaScriptCoreWrapper {
public:
    JavaScriptCoreWrapper() {
        // Initialize JavaScriptCore
        // Platform-specific implementation will be added
        // For now, this is a placeholder
    }

    ~JavaScriptCoreWrapper() = default;

    /**
     * Create SchillingerSong from parameters
     * Returns JSON string of SchillingerSong
     */
    juce::String createSchillingerSong(const SchillingerPluginProcessor::UIParameterState& params) {
        // TODO: Implement JavaScriptCore integration
        // For now, return placeholder JSON
        return R"({"songId": "placeholder", "globals": {"tempo": 120}})";
    }

    /**
     * Realize SchillingerSong into notes
     * Returns JSON string of note array
     */
    juce::String realizeSong(const juce::String& songJson, int seed) {
        // TODO: Implement JavaScriptCore integration
        // For now, return placeholder notes
        return R"([{"midi": 60, "velocity": 0.8, "startTime": 0.0, "duration": 1.0}])";
    }

private:
    // JavaScriptCore context will be stored here
    void* jsContext_ = nullptr;  // Opaque pointer for platform-specific JS context
};

//==============================================================================
// Constructor
//==============================================================================

SchillingerPluginProcessor::SchillingerPluginProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withOutput("MIDI", juce::AudioChannelSet::disabled(), false))  // MIDI-only output
    , parameters(*this, nullptr, juce::Identifier("State"), createParameterLayout())
{
    // Initialize JavaScriptCore wrapper
    jsCore_ = std::make_unique<JavaScriptCoreWrapper>();

    // Initialize parameter pointers
    initializeParameterPointers();

    // Initialize factory presets
    initializeFactoryPresets();
}

SchillingerPluginProcessor::~SchillingerPluginProcessor() {}

//==============================================================================
// Parameter Layout Creation
//==============================================================================

juce::AudioProcessorValueTreeState::ParameterLayout SchillingerPluginProcessor::createParameterLayout()
{
    using PB = PluginTemplates::ParameterBuilder;

    //==========================================================================
    // Song Definition Parameters (5)
    //==========================================================================

    auto tempo = PB::createFloatParameter("tempo", "Tempo", 60.0f, 200.0f, 120.0f,
        PluginTemplates::ParameterCategory::generic, "bpm");
    auto timeSigNum = PB::createIntParameter("time_sig_num", "Time Signature Num", 2, 16, 4);
    auto timeSigDen = PB::createIntParameter("time_sig_den", "Time Signature Den", 2, 16, 4);
    auto scale = PB::createChoiceParameter("scale", "Scale",
        juce::StringArray("Major", "Minor", "Pentatonic", "Blues", "Chromatic", "Dorian", "Mixolydian"), 0);
    auto rootNote = PB::createIntParameter("root_note", "Root Note", 0, 127, 60);

    //==========================================================================
    // Rhythm Parameters (9)
    //==========================================================================

    auto resultantType = PB::createChoiceParameter("resultant_type", "Resultant Type",
        juce::StringArray("resultant", "interference", "rhythmic_field", "permutation"), 0);
    auto periodicityA = PB::createIntParameter("periodicity_a", "Periodicity A", 2, 16, 3);
    auto periodicityB = PB::createIntParameter("periodicity_b", "Periodicity B", 2, 16, 4);
    auto periodicityC = PB::createIntParameter("periodicity_c", "Periodicity C", 0, 16, 0);
    auto density = PB::createFloatParameter("density", "Density", 0.0f, 1.0f, 0.5f);
    auto complexity = PB::createFloatParameter("complexity", "Complexity", 0.0f, 1.0f, 0.5f);
    auto rhythmicDensity = PB::createFloatParameter("rhythmic_density", "Rhythmic Density", 0.0f, 1.0f, 0.5f);
    auto syncopation = PB::createFloatParameter("syncopation", "Syncopation", 0.0f, 1.0f, 0.3f);

    //==========================================================================
    // Melody Parameters (5)
    //==========================================================================

    auto melodyContour = PB::createFloatParameter("melody_contour", "Melody Contour", 0.0f, 1.0f, 0.5f);
    auto intervalRange = PB::createFloatParameter("interval_range", "Interval Range", 0.0f, 1.0f, 0.5f);
    auto stepLeaping = PB::createFloatParameter("step_leaping", "Step/Leaping", 0.0f, 1.0f, 0.5f);
    auto repetition = PB::createFloatParameter("repetition", "Repetition", 0.0f, 1.0f, 0.5f);
    auto sequenceLength = PB::createIntParameter("sequence_length", "Sequence Length", 4, 32, 8);

    //==========================================================================
    // Harmony Parameters (5)
    //==========================================================================

    auto harmonyType = PB::createChoiceParameter("harmony_type", "Harmony Type",
        juce::StringArray("functional", "modal", "free", "resultant"), 0);
    auto harmonicRhythm = PB::createFloatParameter("harmonic_rhythm", "Harmonic Rhythm", 0.0f, 1.0f, 0.5f);
    auto chordDensity = PB::createFloatParameter("chord_density", "Chord Density", 0.0f, 1.0f, 0.5f);
    auto voiceLeading = PB::createFloatParameter("voice_leading", "Voice Leading", 0.0f, 1.0f, 0.7f);
    auto tension = PB::createFloatParameter("tension", "Tension", 0.0f, 1.0f, 0.5f);

    //==========================================================================
    // Structure Parameters (4)
    //==========================================================================

    auto sections = PB::createIntParameter("sections", "Sections", 1, 8, 1);
    auto sectionLength = PB::createIntParameter("section_length", "Section Length", 4, 64, 16);
    auto transitionType = PB::createChoiceParameter("transition_type", "Transition Type",
        juce::StringArray("abrupt", "gradual", "modulation", "bridge"), 0);
    auto development = PB::createFloatParameter("development", "Development", 0.0f, 1.0f, 0.5f);

    //==========================================================================
    // Orchestration Parameters (5)
    //==========================================================================

    auto registerParam = PB::createFloatParameter("register", "Register", 0.0f, 1.0f, 0.5f);
    auto texture = PB::createFloatParameter("texture", "Texture", 0.0f, 1.0f, 0.5f);
    auto articulation = PB::createFloatParameter("articulation", "Articulation", 0.0f, 1.0f, 0.5f);
    auto dynamics = PB::createFloatParameter("dynamics", "Dynamics", 0.0f, 1.0f, 0.7f);
    auto timbre = PB::createFloatParameter("timbre", "Timbre", 0.0f, 1.0f, 0.5f);

    //==========================================================================
    // Generation Parameters (3)
    //==========================================================================

    auto seed = PB::createIntParameter("seed", "Seed", 0, 1000000, 42);
    auto trigger = PB::createFloatParameter("trigger", "Generate", 0.0f, 1.0f, 0.0f);
    auto length = PB::createIntParameter("length", "Length (bars)", 1, 128, 16);

    return juce::AudioProcessorValueTreeState::ParameterLayout(
        std::move(tempo),
        std::move(timeSigNum),
        std::move(timeSigDen),
        std::move(scale),
        std::move(rootNote),
        std::move(resultantType),
        std::move(periodicityA),
        std::move(periodicityB),
        std::move(periodicityC),
        std::move(density),
        std::move(complexity),
        std::move(rhythmicDensity),
        std::move(syncopation),
        std::move(melodyContour),
        std::move(intervalRange),
        std::move(stepLeaping),
        std::move(repetition),
        std::move(sequenceLength),
        std::move(harmonyType),
        std::move(harmonicRhythm),
        std::move(chordDensity),
        std::move(voiceLeading),
        std::move(tension),
        std::move(sections),
        std::move(sectionLength),
        std::move(transitionType),
        std::move(development),
        std::move(registerParam),
        std::move(texture),
        std::move(articulation),
        std::move(dynamics),
        std::move(timbre),
        std::move(seed),
        std::move(trigger),
        std::move(length)
    );
}

//==============================================================================
// Initialize Parameter Pointers
//==============================================================================

void SchillingerPluginProcessor::initializeParameterPointers()
{
    // Song Definition
    tempoParam = parameters.getRawParameterValue("tempo");
    timeSignatureNumParam = parameters.getRawParameterValue("time_sig_num");
    timeSignatureDenParam = parameters.getRawParameterValue("time_sig_den");
    scaleParam = parameters.getRawParameterValue("scale");
    rootNoteParam = parameters.getRawParameterValue("root_note");

    // Rhythm
    resultantTypeParam = parameters.getRawParameterValue("resultant_type");
    periodicityAParam = parameters.getRawParameterValue("periodicity_a");
    periodicityBParam = parameters.getRawParameterValue("periodicity_b");
    periodicityCParam = parameters.getRawParameterValue("periodicity_c");
    densityParam = parameters.getRawParameterValue("density");
    complexityParam = parameters.getRawParameterValue("complexity");
    rhythmicDensityParam = parameters.getRawParameterValue("rhythmic_density");
    syncopationParam = parameters.getRawParameterValue("syncopation");

    // Melody
    melodyContourParam = parameters.getRawParameterValue("melody_contour");
    intervalRangeParam = parameters.getRawParameterValue("interval_range");
    stepLeapingParam = parameters.getRawParameterValue("step_leaping");
    repetitionParam = parameters.getRawParameterValue("repetition");
    sequenceLengthParam = parameters.getRawParameterValue("sequence_length");

    // Harmony
    harmonyTypeParam = parameters.getRawParameterValue("harmony_type");
    harmonicRhythmParam = parameters.getRawParameterValue("harmonic_rhythm");
    chordDensityParam = parameters.getRawParameterValue("chord_density");
    voiceLeadingParam = parameters.getRawParameterValue("voice_leading");
    tensionParam = parameters.getRawParameterValue("tension");

    // Structure
    sectionsParam = parameters.getRawParameterValue("sections");
    sectionLengthParam = parameters.getRawParameterValue("section_length");
    transitionTypeParam = parameters.getRawParameterValue("transition_type");
    developmentParam = parameters.getRawParameterValue("development");

    // Orchestration
    registerParam = parameters.getRawParameterValue("register");
    textureParam = parameters.getRawParameterValue("texture");
    articulationParam = parameters.getRawParameterValue("articulation");
    dynamicsParam = parameters.getRawParameterValue("dynamics");
    timbreParam = parameters.getRawParameterValue("timbre");

    // Generation
    seedParam = parameters.getRawParameterValue("seed");
    triggerParam = parameters.getRawParameterValue("trigger");
    lengthParam = parameters.getRawParameterValue("length");
}

//==============================================================================
// Get Current Parameter State
//==============================================================================

SchillingerPluginProcessor::UIParameterState SchillingerPluginProcessor::getCurrentParameterState()
{
    UIParameterState state;

    // Song Definition
    state.tempo = tempoParam->load();
    state.timeSignatureNumerator = static_cast<int>(timeSignatureNumParam->load());
    state.timeSignatureDenominator = static_cast<int>(timeSignatureDenParam->load());

    // Scale choice parameter
    auto* scaleChoice = dynamic_cast<juce::AudioParameterChoice*>(parameters.getParameter("scale"));
    if (scaleChoice) {
        state.scale = scaleChoice->getCurrentChoiceName();
    }

    state.rootNote = static_cast<int>(rootNoteParam->load());

    // Rhythm
    auto* resultantChoice = dynamic_cast<juce::AudioParameterChoice*>(parameters.getParameter("resultant_type"));
    if (resultantChoice) {
        state.resultantType = resultantChoice->getCurrentChoiceName();
    }

    state.periodicityA = static_cast<int>(periodicityAParam->load());
    state.periodicityB = static_cast<int>(periodicityBParam->load());
    state.periodicityC = static_cast<int>(periodicityCParam->load());
    state.density = densityParam->load();
    state.complexity = complexityParam->load();
    state.rhythmicDensity = rhythmicDensityParam->load();
    state.syncopation = syncopationParam->load();

    // Melody
    state.melodyContour = melodyContourParam->load();
    state.intervalRange = intervalRangeParam->load();
    state.stepLeaping = stepLeapingParam->load();
    state.repetition = repetitionParam->load();
    state.sequenceLength = static_cast<int>(sequenceLengthParam->load());

    // Harmony
    auto* harmonyChoice = dynamic_cast<juce::AudioParameterChoice*>(parameters.getParameter("harmony_type"));
    if (harmonyChoice) {
        state.harmonyType = harmonyChoice->getCurrentChoiceName();
    }

    state.harmonicRhythm = harmonicRhythmParam->load();
    state.chordDensity = chordDensityParam->load();
    state.voiceLeading = voiceLeadingParam->load();
    state.tension = tensionParam->load();

    // Structure
    state.sections = static_cast<int>(sectionsParam->load());
    state.sectionLength = static_cast<int>(sectionLengthParam->load());

    auto* transitionChoice = dynamic_cast<juce::AudioParameterChoice*>(parameters.getParameter("transition_type"));
    if (transitionChoice) {
        state.transitionType = transitionChoice->getCurrentChoiceName();
    }

    state.development = developmentParam->load();

    // Orchestration
    state.registerValue = registerParam->load();
    state.texture = textureParam->load();
    state.articulation = articulationParam->load();
    state.dynamics = dynamicsParam->load();
    state.timbre = timbreParam->load();

    // Generation
    state.seed = static_cast<int>(seedParam->load());
    state.lengthBars = static_cast<int>(lengthParam->load());

    return state;
}

//==============================================================================
// AudioProcessor Implementation
//==============================================================================

void SchillingerPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    sampleRate_ = sampleRate;
    samplesPerBlock_ = samplesPerBlock;

    // Trigger generation on first prepare if needed
    if (needsGeneration_) {
        generateComposition();
        needsGeneration_ = false;
    }
}

void SchillingerPluginProcessor::releaseResources()
{
    compositionNotes_.clear();
    playbackPosition_ = 0.0;
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool SchillingerPluginProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    // We're a MIDI effect, we don't support audio buses
    return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::disabled();
}
#endif

void SchillingerPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    // Clear audio buffer (we don't produce audio)
    buffer.clear();

    // Check for trigger button press
    if (triggerParam->load() > 0.5f) {
        generateComposition();
        // Reset trigger
        triggerParam->store(0.0f);
    }

    // Schedule MIDI events from composition
    scheduleMIDIEvents(midiMessages, buffer.getNumSamples());
}

//==============================================================================
// Composition Generation
//==============================================================================

void SchillingerPluginProcessor::generateComposition()
{
    if (isGenerating_) {
        return;  // Already generating
    }

    isGenerating_ = true;

    // Get current parameter state
    auto params = getCurrentParameterState();

    // Create SchillingerSong via SDK
    auto songJson = jsCore_->createSchillingerSong(params);

    // Realize song into notes
    auto notesJson = jsCore_->realizeSong(songJson, params.seed);

    // Parse notes into composition
    parseSDKNotes(notesJson);

    // Reset playback position
    playbackPosition_ = 0.0;

    isGenerating_ = false;
}

void SchillingerPluginProcessor::parseSDKNotes(const juce::String& sdkJson)
{
    // TODO: Parse JSON and populate compositionNotes_
    // For now, add a placeholder note
    compositionNotes_.clear();

    SchillingerNote note;
    note.midiNote = 60;
    note.velocity = 0.8f;
    note.startTime = 0.0;
    note.duration = 1.0;
    note.pitch = 0;

    compositionNotes_.push_back(note);
}

void SchillingerPluginProcessor::scheduleMIDIEvents(juce::MidiBuffer& midiMessages, int numSamples)
{
    // Calculate time range for this block
    double blockDuration = static_cast<double>(numSamples) / sampleRate_;
    double blockEndTime = playbackPosition_ + blockDuration;

    // Find notes that start within this block
    for (const auto& note : compositionNotes_) {
        if (note.startTime >= playbackPosition_ && note.startTime < blockEndTime) {
            // Calculate sample offset
            double offsetSeconds = note.startTime - playbackPosition_;
            int sampleOffset = static_cast<int>(offsetSeconds * sampleRate_);

            // Add Note On message
            midiMessages.addEvent(juce::MidiMessage::noteOn(
                1,  // MIDI channel
                note.midiNote,
                static_cast<float>(note.velocity * 127.0f)
            ), sampleOffset);

            // Add Note Off message
            int noteOffSample = sampleOffset + static_cast<int>(note.duration * sampleRate_);
            if (noteOffSample < numSamples) {
                midiMessages.addEvent(juce::MidiMessage::noteOff(
                    1,
                    note.midiNote
                ), noteOffSample);
            }
        }
    }

    // Advance playback position
    playbackPosition_ = blockEndTime;

    // Loop if we've reached the end
    double totalDuration = 0.0;
    for (const auto& note : compositionNotes_) {
        totalDuration = std::max(totalDuration, note.startTime + note.duration);
    }

    if (playbackPosition_ >= totalDuration && !compositionNotes_.empty()) {
        playbackPosition_ = 0.0;
    }
}

void SchillingerPluginProcessor::resetComposition()
{
    compositionNotes_.clear();
    playbackPosition_ = 0.0;
}

//==============================================================================
// Editor
//==============================================================================

juce::AudioProcessorEditor* SchillingerPluginProcessor::createEditor()
{
    return new SchillingerPluginEditor(*this);
}

//==============================================================================
// Program/Preset Management
//==============================================================================

int SchillingerPluginProcessor::getNumPrograms()
{
    return static_cast<int>(factoryPresets_.size());
}

int SchillingerPluginProcessor::getCurrentProgram()
{
    return currentProgramIndex_;
}

void SchillingerPluginProcessor::setCurrentProgram(int index)
{
    if (juce::isPositiveAndBelow(index, factoryPresets_.size())) {
        currentProgramIndex_ = index;
        loadPreset(factoryPresets_[index].state);
    }
}

const juce::String SchillingerPluginProcessor::getProgramName(int index)
{
    if (juce::isPositiveAndBelow(index, factoryPresets_.size())) {
        return factoryPresets_[index].name;
    }
    return {};
}

void SchillingerPluginProcessor::changeProgramName(int index, const juce::String& newName)
{
    if (juce::isPositiveAndBelow(index, factoryPresets_.size())) {
        factoryPresets_[index].name = newName;
    }
}

void SchillingerPluginProcessor::loadPreset(const juce::String& xmlState)
{
    if (auto xml = juce::XmlDocument::parse(xmlState)) {
        if (xml->hasTagName(parameters.state.getType())) {
            parameters.replaceState(juce::ValueTree::fromXml(*xml));
        }
    }
}

void SchillingerPluginProcessor::initializeFactoryPresets()
{
    // TODO: Add factory presets for common Schillinger configurations
    // For now, just add a default preset
    factoryPresets_.push_back({
        "Default",
        ""  // State will be generated from default parameter values
    });
}

//==============================================================================
// State Serialization
//==============================================================================

void SchillingerPluginProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = parameters.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void SchillingerPluginProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

    if (xmlState != nullptr && xmlState->hasTagName(parameters.state.getType())) {
        parameters.replaceState(juce::ValueTree::fromXml(*xmlState));
    }
}

//==============================================================================
// Plugin Factory
//==============================================================================

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new SchillingerPluginProcessor();
}
