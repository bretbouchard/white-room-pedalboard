cmake_minimum_required(VERSION 3.22)
project(NexSynthPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
        message(STATUS "✓ NexSynth CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juce-extensions not found, CLAP disabled for NexSynth")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../instruments/Nex_synth/include
    ../instruments/Nex_synth/include/dsp
    ../instruments/Nex_synth/src/plugin
    ../include
    ../include/dsp
    ../src/frontend/telemetry
)

# NexSynth sources
set(NEX_PLUGIN_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Nex_synth/src/plugin/NexSynthPluginProcessor.cpp")
set(NEX_PLUGIN_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Nex_synth/src/plugin/NexSynthPluginEditor.cpp")
set(NEX_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")
# set(TELEMETRY "${CMAKE_CURRENT_SOURCE_DIR}/../src/frontend/telemetry/ParameterTelemetryRecorder.cpp") # Disabled for JUCE 7 compatibility

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  NexSynth Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(NEXSYNTH_FORMATS "")
if(BUILD_VST3)
    list(APPEND NEXSYNTH_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND NEXSYNTH_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND NEXSYNTH_FORMATS "CLAP")
    message(STATUS "✓ NexSynth will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND NEXSYNTH_FORMATS "Standalone")
endif()

juce_add_plugin("NexSynth"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "NexSynth FM"
    PLUGIN_DESCRIPTION "5-operator FM synthesizer with MPE and microtonal support"
    PLUGIN_VERSION 1.0.0
    FORMATS ${NEXSYNTH_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.NexSynth"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(NexSynth PRIVATE
    "${NEX_PLUGIN_PROCESSOR}"
    "${NEX_PLUGIN_EDITOR}"
    "${NEX_DSP}"
    "${LOOKUP_TABLES}"
    # "${TELEMETRY}" # Disabled for JUCE 7 compatibility
)

message(STATUS "Adding NexSynth sources to plugin:")
message(STATUS "  ${NEX_PLUGIN_PROCESSOR}")
message(STATUS "  ${NEX_PLUGIN_EDITOR}")
message(STATUS "  ${NEX_DSP}")
message(STATUS "  ${LOOKUP_TABLES}")
# message(STATUS "  ${TELEMETRY}") # Disabled for JUCE 7 compatibility

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("NexSynth"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET NexSynth
        CLAP_ID "com.schillinger.NexSynth"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ NexSynth CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ NexSynth plugin configured successfully")
message(STATUS "  Formats: ${NEXSYNTH_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
