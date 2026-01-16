cmake_minimum_required(VERSION 3.22)
project(AetherGiantVoicePlugin VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_C_STANDARD 11)

# JUCE VST2/VST3 compatibility fix
add_definitions(-DJUCE_VST3_CAN_REPLACE_VST2=0)

# Completely disable AU support (macOS SDK compatibility)
add_definitions(-DJUCE_PLUGINHOST_AU=0)

# JUCE directory
set(JUCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../external/JUCE")
add_subdirectory("${JUCE_DIR}" JUCE)

# CLAP support
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../external/clap-juce-extensions)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../external/clap-juce-extensions clap-juce-extensions)
    message(STATUS "✓ CLAP support enabled for Aether Giant Voice")
endif()

# Include directories
include_directories(
    ../instruments/giant_instruments/include
    ../instruments/giant_instruments/include/dsp
    ../instruments/giant_instruments/src/plugin
    ../instruments/giant_instruments/src/shared
    ../include
    ../include/dsp
)

# Aether Giant Voice sources
set(GIANT_VOICE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp")
set(GIANT_PLUGIN_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/plugin/GiantInstrumentsPluginProcessor.cpp")
set(GIANT_PLUGIN_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/plugin/GiantInstrumentsPluginEditor.cpp")
set(GIANT_STEREO "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/GiantInstrumentStereo.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  Aether Giant Voice Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(AETHER_GIANT_VOICE_FORMATS "")
if(BUILD_VST3)
    list(APPEND AETHER_GIANT_VOICE_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND AETHER_GIANT_VOICE_FORMATS "AU")
endif()
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    list(APPEND AETHER_GIANT_VOICE_FORMATS "CLAP")
endif()
if(BUILD_STANDALONE)
    list(APPEND AETHER_GIANT_VOICE_FORMATS "Standalone")
endif()

#==============================================================================
#  JUCE Plugin (VST3 + AU + CLAP + Standalone)
#==============================================================================

juce_add_plugin("AetherGiantVoice"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "Aether Giant Voice"
    PLUGIN_DESCRIPTION "Giant vocal formant synthesizer with MPE support and microtonal tuning"
    PLUGIN_VERSION 1.0.0
    FORMATS ${AETHER_GIANT_VOICE_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.whiteroom.aethergiantvoice"
    COPY_PLUGIN_AFTER_BUILD ON
)

target_sources("AetherGiantVoice"
    PRIVATE
        ${GIANT_VOICE_DSP}
        ${GIANT_PLUGIN_PROCESSOR}
        ${GIANT_PLUGIN_EDITOR}
        ${GIANT_STEREO}
)

target_include_directories("AetherGiantVoice"
    PRIVATE
        ../instruments/giant_instruments/include
        ../instruments/giant_instruments/include/dsp
        ../instruments/giant_instruments/src/plugin
        ../instruments/giant_instruments/src/shared
)

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("AetherGiantVoice"
        PRIVATE
            juce::juce_audio_utils
            juce::juce_dsp
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET AetherGiantVoice
        CLAP_ID "com.whiteroom.aethergiantvoice"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ Aether Giant Voice CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ Aether Giant Voice plugin configured successfully")
message(STATUS "  Formats: ${AETHER_GIANT_VOICE_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
