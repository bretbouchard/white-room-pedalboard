cmake_minimum_required(VERSION 3.22)
project(GiantInstrumentsPlugin VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_C_STANDARD 11)

# JUCE VST2/VST3 compatibility fix
add_definitions(-DJUCE_VST3_CAN_REPLACE_VST2=0)

# Completely disable AU support (macOS SDK compatibility)
add_definitions(-DJUCE_PLUGINHOST_AU=0)

# JUCE directory
set(JUCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../external/JUCE")
add_subdirectory("${JUCE_DIR}" JUCE)

# CLAP Plugin Format Support
option(BUILD_CLAP "Build CLAP plugin format" ON)

# CLAP support
if(BUILD_CLAP)
    set(CLAP_JUCE_EXTENSIONS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../external/clap-juce-extensions")
    if(EXISTS ${CLAP_JUCE_EXTENSIONS_PATH})
        add_subdirectory(${CLAP_JUCE_EXTENSIONS_PATH} ${CMAKE_CURRENT_BINARY_DIR}/clap-juce-extensions)
        include_directories(${CLAP_JUCE_EXTENSIONS_PATH}/include)
        message(STATUS "✓ GiantInstruments CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juce-extensions not found, CLAP disabled for GiantInstruments")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../instruments/giant_instruments/include
    ../instruments/giant_instruments/include/dsp
    ../instruments/giant_instruments/src/plugin
    ../include
    ../include/dsp
    ../instruments/kane_marco/include
    ../instruments/kane_marco/include/dsp
)

# Giant Instruments sources
set(GIANT_PLUGIN_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/plugin/GiantInstrumentsPluginProcessor.cpp")
set(GIANT_PLUGIN_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/plugin/GiantInstrumentsPluginEditor.cpp")
set(GIANT_DRUMS_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp")
set(GIANT_HORNS_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantHornsPureDSP.cpp")
set(GIANT_PERCUSSION_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp")
set(GIANT_VOICE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp")
set(KANE_MARCO_STRING_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp")
set(KANE_MARCO_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  GiantInstruments Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(GIANT_INSTRUMENTS_FORMATS "")
if(BUILD_VST3)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "CLAP")
    message(STATUS "✓ GiantInstruments will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND GIANT_INSTRUMENTS_FORMATS "Standalone")
endif()

juce_add_plugin("GiantInstruments"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "Giant Instruments"
    PLUGIN_DESCRIPTION "Multi-instrument synthesizer with MPE and microtonal support"
    PLUGIN_VERSION 1.0.0
    FORMATS ${GIANT_INSTRUMENTS_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.GiantInstruments"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(GiantInstruments PRIVATE
    "${GIANT_PLUGIN_PROCESSOR}"
    "${GIANT_PLUGIN_EDITOR}"
    "${GIANT_DRUMS_DSP}"
    "${GIANT_HORNS_DSP}"
    "${GIANT_PERCUSSION_DSP}"
    "${GIANT_VOICE_DSP}"
    "${KANE_MARCO_STRING_DSP}"
    "${KANE_MARCO_DSP}"
    "${LOOKUP_TABLES}"
)

# Link JUCE DSP module explicitly
target_link_libraries(GiantInstruments
    PRIVATE
    juce::juce_dsp
)

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("GiantInstruments"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET GiantInstruments
        CLAP_ID "com.schillinger.GiantInstruments"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ GiantInstruments CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ GiantInstruments plugin configured successfully")
message(STATUS "  Formats: ${GIANT_INSTRUMENTS_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")

message(STATUS "Adding Giant Instruments sources to plugin:")
message(STATUS "  ${GIANT_PLUGIN_PROCESSOR}")
message(STATUS "  ${GIANT_PLUGIN_EDITOR}")
message(STATUS "  ${GIANT_DRUMS_DSP}")
message(STATUS "  ${GIANT_HORNS_DSP}")
message(STATUS "  ${GIANT_PERCUSSION_DSP}")
message(STATUS "  ${GIANT_VOICE_DSP}")
message(STATUS "  ${KANE_MARCO_STRING_DSP}")
message(STATUS "  ${KANE_MARCO_DSP}")
message(STATUS "  ${LOOKUP_TABLES}")
