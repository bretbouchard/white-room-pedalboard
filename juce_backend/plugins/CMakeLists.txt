cmake_minimum_required(VERSION 3.16)

project(SchillingerInstrumentPlugins VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# JUCE path - use the external/JUCE submodule
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../external/JUCE)

if(NOT EXISTS "${JUCE_PATH}")
    message(FATAL_ERROR "JUCE not found at ${JUCE_PATH}. Please initialize git submodules with: git submodule update --init --recursive")
endif()

# Add JUCE
add_subdirectory(${JUCE_PATH} JUCE)

# ============================================================================
# Plugin Configuration
# ============================================================================

# Build both AU and VST3 by default
option(BUILD_AU "Build AU plugins" ON)
option(BUILD_VST3 "Build VST3 plugins" ON)

message(STATUS "")
message(STATUS "🎛️  Schillinger Instrument Plugins Configuration")
message(STATUS "  Build AU: ${BUILD_AU}")
message(STATUS "  Build VST3: ${BUILD_VST3}")
message(STATUS "")

# ============================================================================
# LOCAL_GAL Acid Synthesizer
# ============================================================================

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/localgal/src")
    message(STATUS "✓ LOCAL_GAL Acid Synthesizer")

    # Create plugin processor source files list
    set(LOCAL_GAL_SOURCES
        LOCAL_GALPlugin/LOCAL_GALPluginProcessor.cpp
        ../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ../include/dsp/LookupTables.cpp
    )

    # Build list of plugin formats
    set(LOCAL_GAL_FORMATS "")
    if(BUILD_VST3)
        list(APPEND LOCAL_GAL_FORMATS "VST3")
    endif()
    if(BUILD_AU AND APPLE)
        list(APPEND LOCAL_GAL_FORMATS "AU")
    endif()

    # Create LOCAL_GAL plugin target using JUCE's helper
    juce_add_plugin("LOCAL_GAL"
        SOURCES
            ${LOCAL_GAL_SOURCES}
        COMPANY_NAME "SchillingerEcosystem"
        BUNDLE_ID "com.schillingerEcosystem.localgal"
        FORMATS "${LOCAL_GAL_FORMATS}"
        PLUGIN_IS_SYNTH TRUE
        NEEDS_WEB_BROWSER FALSE
        NEEDS_CURL FALSE
        JUCE_STANDARD_PLUGINKINDS=1
    )

    # Disable agent system (requires jsoncpp dependency)
    target_compile_definitions(LOCAL_GAL
        PRIVATE
            LOCAL_GAL_NO_AGENTS
            JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
    )

    # Link JUCE modules
    target_link_libraries(LOCAL_GAL
        PRIVATE
            juce::juce_audio_processors
            juce::juce_audio_utils
            juce::juce_dsp
            juce::juce_gui_basics
            juce::juce_gui_extra
    )

    # Include directories
    target_include_directories(LOCAL_GAL
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/LOCAL_GALPlugin
            ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/localgal/include
            ${CMAKE_CURRENT_SOURCE_DIR}/../include
    )

    # Explicitly add source files to target
    target_sources(LOCAL_GAL
        PRIVATE
            ${LOCAL_GAL_SOURCES}
    )

    message(STATUS "  ✓ LOCAL_GAL plugin configured")
endif()

# ============================================================================
# Sam Sampler
# ============================================================================

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Sam_sampler/src")
    message(STATUS "✓ Sam Sampler")

    # Create plugin processor wrapper if it doesn't exist
    set(SAM_SAMPLER_PLUGIN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/SamSamplerPlugin")
    file(MAKE_DIRECTORY ${SAM_SAMPLER_PLUGIN_DIR})

    # Check if plugin processor exists, create minimal one if not
    if(NOT EXISTS "${SAM_SAMPLER_PLUGIN_DIR}/SamSamplerPluginProcessor.cpp")
        message(STATUS "  Creating SamSampler plugin processor wrapper...")

        file(WRITE "${SAM_SAMPLER_PLUGIN_DIR}/SamSamplerPluginProcessor.h"
"#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include \"../../Nex_synth/src/synthesis/SamSamplerIntegration.h\"

using namespace SchillingerEcosystem::Synthesis;

class SamSamplerPluginProcessor : public juce::AudioProcessor {
public:
    SamSamplerPluginProcessor();
    ~SamSamplerPluginProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    double getTailLengthSeconds() const override;
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    const juce::String getName() const override { return \"Sam Sampler\"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

private:
    std::unique_ptr<SamSamplerIntegration> sampler;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SamSamplerPluginProcessor)
};
")

        file(WRITE "${SAM_SAMPLER_PLUGIN_DIR}/SamSamplerPluginProcessor.cpp"
"#include \"SamSamplerPluginProcessor.h\"

using namespace SchillingerEcosystem::Synthesis;

SamSamplerPluginProcessor::SamSamplerPluginProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withOutput(\"Output\", juce::AudioChannelSet::stereo(), true))
{
    sampler = std::make_unique<SamSamplerIntegration>();
}

SamSamplerPluginProcessor::~SamSamplerPluginProcessor() {}

void SamSamplerPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    sampler->prepareToPlay(sampleRate, samplesPerBlock);
}

void SamSamplerPluginProcessor::releaseResources()
{
    sampler->releaseResources();
}

void SamSamplerPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    sampler->processBlock(buffer, midiMessages);
}

juce::AudioProcessorEditor* SamSamplerPluginProcessor::createEditor()
{
    return new juce::GenericAudioProcessorEditor(*this);
}

double SamSamplerPluginProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int SamSamplerPluginProcessor::getNumPrograms()
{
    return 1;
}

int SamSamplerPluginProcessor::getCurrentProgram()
{
    return 0;
}

void SamSamplerPluginProcessor::setCurrentProgram(int index)
{
    juce::ignoreUnused(index);
}

const juce::String SamSamplerPluginProcessor::getProgramName(int index)
{
    juce::ignoreUnused(index);
    return {};
}

void SamSamplerPluginProcessor::changeProgramName(int index, const juce::String& newName)
{
    juce::ignoreUnused(index, newName);
}

void SamSamplerPluginProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    // TODO: Implement state save
}

void SamSamplerPluginProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    // TODO: Implement state restore
}

// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new SamSamplerPluginProcessor();
}
")

        file(WRITE "${SAM_SAMPLER_PLUGIN_DIR}/SamSamplerPluginEditor.h"
"#pragma once
#include <juce_audio_processors/juce_audio_processors.h>

class SamSamplerPluginEditor : public juce::AudioProcessorEditor {
public:
    SamSamplerPluginEditor(juce::AudioProcessor& p);
    ~SamSamplerPluginEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SamSamplerPluginEditor)
};
")

        file(WRITE "${SAM_SAMPLER_PLUGIN_DIR}/SamSamplerPluginEditor.cpp"
"#include \"SamSamplerPluginEditor.h\"

SamSamplerPluginEditor::SamSamplerPluginEditor(juce::AudioProcessor& p)
    : juce::AudioProcessorEditor(p)
{
    setSize(400, 300);
}

SamSamplerPluginEditor::~SamSamplerPluginEditor() {}

void SamSamplerPluginEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::darkgrey);
    g.setColour(juce::Colours::white);
    g.drawFittedText(\"Sam Sampler\", getLocalBounds(), juce::Justification::centred, 1);
}

void SamSamplerPluginEditor::resized() {}
")
    endif()

    # Build list of plugin formats
    set(SAMSAMPLER_FORMATS "")
    if(BUILD_VST3)
        list(APPEND SAMSAMPLER_FORMATS "VST3")
    endif()
    if(BUILD_AU AND APPLE)
        list(APPEND SAMSAMPLER_FORMATS "AU")
    endif()

    # Create SamSampler plugin target
    juce_add_plugin("SamSampler"
        COMPANY_NAME "SchillingerEcosystem"
        BUNDLE_ID "com.schillingerEcosystem.samsampler"
        FORMATS "${SAMSAMPLER_FORMATS}"
        PLUGIN_IS_SYNTH TRUE
        NEEDS_WEB_BROWSER FALSE
        NEEDS_CURL FALSE
    )

    # Add source files to plugin target
    target_sources(SamSampler
        PRIVATE
            SamSamplerPlugin/SamSamplerPluginProcessor.cpp
            SamSamplerPlugin/SamSamplerPluginEditor.cpp
            ../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
            ../include/dsp/LookupTables.cpp
    )

    target_link_libraries(SamSampler
        PRIVATE
            juce::juce_audio_processors
            juce::juce_audio_utils
            juce::juce_audio_formats
            juce::juce_dsp
            juce::juce_gui_basics
    )

    # Ignore VST3/VST2 parameter ID warning
    target_compile_definitions(SamSampler
        PRIVATE
            JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
    )

    target_include_directories(SamSampler
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Sam_sampler/include
            ${CMAKE_CURRENT_SOURCE_DIR}/../include
            ${SAM_SAMPLER_PLUGIN_DIR}
    )

    message(STATUS "  ✓ SamSampler plugin configured")
endif()

# ============================================================================
# Nex Synth (FM Synthesizer)
# ============================================================================

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Nex_synth/src")
    message(STATUS "✓ Nex FM Synth")

    # Create plugin processor wrapper
    set(NEX_SYNTH_PLUGIN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/NexSynthPlugin")
    file(MAKE_DIRECTORY ${NEX_SYNTH_PLUGIN_DIR})

    if(NOT EXISTS "${NEX_SYNTH_PLUGIN_DIR}/NexSynthPluginProcessor.cpp")
        message(STATUS "  Creating NexSynth plugin processor wrapper...")

        file(WRITE "${NEX_SYNTH_PLUGIN_DIR}/NexSynthPluginProcessor.h"
"#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include \"../../Nex_synth/src/synthesis/NexSynthIntegration.h\"

using namespace SchillingerEcosystem::Synthesis;

class NexSynthPluginProcessor : public juce::AudioProcessor {
public:
    NexSynthPluginProcessor();
    ~NexSynthPluginProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    double getTailLengthSeconds() const override;
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    const juce::String getName() const override { return \"Nex FM Synth\"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

private:
    std::unique_ptr<NexSynthIntegration> fmSynth;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NexSynthPluginProcessor)
};
")

        file(WRITE "${NEX_SYNTH_PLUGIN_DIR}/NexSynthPluginProcessor.cpp"
"#include \"NexSynthPluginProcessor.h\"

using namespace SchillingerEcosystem::Synthesis;

NexSynthPluginProcessor::NexSynthPluginProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withOutput(\"Output\", juce::AudioChannelSet::stereo(), true))
{
    fmSynth = std::make_unique<NexSynthIntegration>();
}

NexSynthPluginProcessor::~NexSynthPluginProcessor() {}

void NexSynthPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    fmSynth->prepareToPlay(sampleRate, samplesPerBlock);
}

void NexSynthPluginProcessor::releaseResources()
{
    fmSynth->releaseResources();
}

void NexSynthPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    fmSynth->processBlock(buffer, midiMessages);
}

juce::AudioProcessorEditor* NexSynthPluginProcessor::createEditor()
{
    return new juce::GenericAudioProcessorEditor(*this);
}

double NexSynthPluginProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int NexSynthPluginProcessor::getNumPrograms()
{
    return 1;
}

int NexSynthPluginProcessor::getCurrentProgram()
{
    return 0;
}

void NexSynthPluginProcessor::setCurrentProgram(int index)
{
    juce::ignoreUnused(index);
}

const juce::String NexSynthPluginProcessor::getProgramName(int index)
{
    juce::ignoreUnused(index);
    return {};
}

void NexSynthPluginProcessor::changeProgramName(int index, const juce::String& newName)
{
    juce::ignoreUnused(index, newName);
}

void NexSynthPluginProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    // TODO: Implement state save
}

void NexSynthPluginProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    // TODO: Implement state restore
}

// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new NexSynthPluginProcessor();
}
")

        file(WRITE "${NEX_SYNTH_PLUGIN_DIR}/NexSynthPluginEditor.h"
"#pragma once
#include <juce_audio_processors/juce_audio_processors.h>

class NexSynthPluginEditor : public juce::AudioProcessorEditor {
public:
    NexSynthPluginEditor(juce::AudioProcessor& p);
    ~NexSynthPluginEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NexSynthPluginEditor)
};
")

        file(WRITE "${NEX_SYNTH_PLUGIN_DIR}/NexSynthPluginEditor.cpp"
"#include \"NexSynthPluginEditor.h\"

NexSynthPluginEditor::NexSynthPluginEditor(juce::AudioProcessor& p)
    : juce::AudioProcessorEditor(p)
{
    setSize(400, 300);
}

NexSynthPluginEditor::~NexSynthPluginEditor() {}

void NexSynthPluginEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::darkblue);
    g.setColour(juce::Colours::white);
    g.drawFittedText(\"Nex FM Synth\", getLocalBounds(), juce::Justification::centred, 1);
}

void NexSynthPluginEditor::resized() {}
")
    endif()

    # Build list of plugin formats
    set(NEXSYNTH_FORMATS "")
    if(BUILD_VST3)
        list(APPEND NEXSYNTH_FORMATS "VST3")
    endif()
    if(BUILD_AU AND APPLE)
        list(APPEND NEXSYNTH_FORMATS "AU")
    endif()

    # Create NexSynth plugin target
    juce_add_plugin("NexSynth"
        COMPANY_NAME "SchillingerEcosystem"
        BUNDLE_ID "com.schillingerEcosystem.nexsynth"
        FORMATS "${NEXSYNTH_FORMATS}"
        PLUGIN_IS_SYNTH TRUE
        NEEDS_WEB_BROWSER FALSE
        NEEDS_CURL FALSE
    )

    # Add source files to plugin target
    target_sources(NexSynth
        PRIVATE
            NexSynthPlugin/NexSynthPluginProcessor.cpp
            NexSynthPlugin/NexSynthPluginEditor.cpp
            ../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
    )

    target_link_libraries(NexSynth
        PRIVATE
            juce::juce_audio_processors
            juce::juce_audio_utils
            juce::juce_dsp
            juce::juce_gui_basics
    )

    # Ignore VST3/VST2 parameter ID warning
    target_compile_definitions(NexSynth
        PRIVATE
            JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
    )

    target_include_directories(NexSynth
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Nex_synth/include
            ${CMAKE_CURRENT_SOURCE_DIR}/../include
            ${NEX_SYNTH_PLUGIN_DIR}
    )

    message(STATUS "  ✓ NexSynth plugin configured")
endif()

# ============================================================================
# Giant Instruments Plugin
# ============================================================================

message(STATUS "✓ Giant Instruments (All 5 Giants in One Plugin)")

# Create plugin processor wrapper if it doesn't exist
set(GIANT_INSTRUMENTS_PLUGIN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/GiantInstrumentsPlugin")

# Build list of plugin formats
set(GIANT_INSTRUMENTS_FORMATS "")
if(BUILD_VST3)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "AU")
endif()

# Create GiantInstruments plugin target
juce_add_plugin("GiantInstruments"
    COMPANY_NAME "SchillingerEcosystem"
    BUNDLE_ID "com.schillingerEcosystem.giantinstruments"
    FORMATS "${GIANT_INSTRUMENTS_FORMATS}"
    PLUGIN_IS_SYNTH TRUE
    NEEDS_WEB_BROWSER FALSE
    NEEDS_CURL FALSE
    JUCE_STANDARD_PLUGINKINDS=1
)

# Add source files to plugin target
target_sources(GiantInstruments
    PRIVATE
        GiantInstrumentsPlugin/GiantInstrumentsPluginProcessor.cpp
        GiantInstrumentsPlugin/GiantInstrumentsPluginEditor.cpp
        ../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp
        ../instruments/giant_instruments/src/dsp/AetherGiantHornsPureDSP.cpp
        ../instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp
        ../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp
        ../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
        ../include/dsp/LookupTables.cpp
)

target_link_libraries(GiantInstruments
    PRIVATE
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_dsp
        juce::juce_gui_basics
        juce::juce_gui_extra
)

# Ignore VST3/VST2 parameter ID warning since we only build VST3
target_compile_definitions(GiantInstruments
    PRIVATE
        JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
)

target_include_directories(GiantInstruments
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/..
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${GIANT_INSTRUMENTS_PLUGIN_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/src/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp
)

message(STATUS "  ✓ GiantInstruments plugin configured (5 giants in one)")

# ============================================================================
# Schillinger Composition Plugin (MIDI Generator)
# ============================================================================

message(STATUS "✓ Schillinger Composition System")

# Build list of plugin formats
set(SCHILLINGER_FORMATS "")
if(BUILD_VST3)
    list(APPEND SCHILLINGER_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND SCHILLINGER_FORMATS "AU")
endif()

# Create Schillinger plugin target
juce_add_plugin("Schillinger"
    COMPANY_NAME "SchillingerEcosystem"
    BUNDLE_ID "com.schillingerEcosystem.schillinger"
    FORMATS "${SCHILLINGER_FORMATS}"
    PLUGIN_IS_SYNTH FALSE  # MIDI effect, not a synth
    NEEDS_WEB_BROWSER FALSE
    NEEDS_CURL FALSE
    JUCE_STANDARD_PLUGINKINDS=1
)

# Add source files to plugin target
target_sources(Schillinger
    PRIVATE
        SchillingerPlugin/SchillingerPluginProcessor.cpp
        SchillingerPlugin/SchillingerPluginEditor.cpp
)

target_link_libraries(Schillinger
    PRIVATE
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_gui_basics
        juce::juce_gui_extra
)

# Ignore VST3/VST2 parameter ID warning
target_compile_definitions(Schillinger
    PRIVATE
        JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
)

target_include_directories(Schillinger
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/SchillingerPlugin
)

message(STATUS "  ✓ Schillinger plugin configured (MIDI generator)")

# ============================================================================
# Single Note Test Plugin (Phase 1: Foundation)
# ============================================================================

message(STATUS "✓ Single Note Test (Foundation Test)")

# Build list of plugin formats
set(SINGLENOTE_TEST_FORMATS "")
if(BUILD_VST3)
    list(APPEND SINGLENOTE_TEST_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND SINGLENOTE_TEST_FORMATS "AU")
endif()

# Create SingleNoteTest plugin target
juce_add_plugin("SingleNoteTest"
    COMPANY_NAME "SchillingerEcosystem"
    BUNDLE_ID "com.schillingerEcosystem.singlenotetest"
    FORMATS "${SINGLENOTE_TEST_FORMATS}"
    PLUGIN_IS_SYNTH FALSE  # MIDI effect, not a synth
    NEEDS_WEB_BROWSER FALSE
    NEEDS_CURL FALSE
    JUCE_STANDARD_PLUGINKINDS=1
)

# Add source files to plugin target
target_sources(SingleNoteTest
    PRIVATE
        ../src/audio/SingleNoteTestProcessor.cpp
        ../src/audio/SingleNoteTestEditor.cpp
)

target_link_libraries(SingleNoteTest
    PRIVATE
    juce::juce_audio_processors
    juce::juce_audio_utils
    juce::juce_gui_basics
    juce::juce_gui_extra
)

# Ignore VST3/VST2 parameter ID warning
target_compile_definitions(SingleNoteTest
    PRIVATE
        JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
)

target_include_directories(SingleNoteTest
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio
)

message(STATUS "  ✓ SingleNoteTest plugin configured (Foundation test)")

# ============================================================================
# Installation and Summary
# ============================================================================

message(STATUS "")
message(STATUS "✅ Plugin Build Configuration Complete")
message(STATUS "")
message(STATUS "To build plugins:")
message(STATUS "  mkdir build && cd build")
message(STATUS "  cmake ..")
message(STATUS "  cmake --build . --config Release")
message(STATUS "")
message(STATUS "Output formats:")
if(BUILD_VST3)
    message(STATUS "  ✓ VST3: .vst3 bundles")
endif()
if(BUILD_AU AND APPLE)
    message(STATUS "  ✓ AU:   .component bundles")
endif()
message(STATUS "")
