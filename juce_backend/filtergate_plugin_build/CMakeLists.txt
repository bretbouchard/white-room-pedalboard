cmake_minimum_required(VERSION 3.22)
project(FilterGatePlugin VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_C_STANDARD 11)

# JUCE VST2/VST3 compatibility fix
add_definitions(-DJUCE_VST3_CAN_REPLACE_VST2=0)

# Completely disable AU support (macOS SDK compatibility)
add_definitions(-DJUCE_PLUGINHOST_AU=0)

# JUCE directory
set(JUCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../juce_backend/external/JUCE")
add_subdirectory("${JUCE_DIR}" JUCE)

# CLAP support
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../../juce_backend/external/clap-juce-extensions)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../juce_backend/external/clap-juce-extensions clap-juce-extensions)
    message(STATUS "✓ CLAP support enabled for FilterGate")
endif()

# Include directories
include_directories(
    ../../juce_backend/effects/filtergate/include
    ../../juce_backend/effects/filtergate/include/dsp
    ../../juce_backend/effects/filtergate/include/plugin
    ../../juce_backend/include
)

# FilterGate sources
set(FILTERGATE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../../juce_backend/effects/filtergate/src/dsp/FilterGatePureDSP.cpp")
set(FILTERGATE_PLUGIN "${CMAKE_CURRENT_SOURCE_DIR}/../../juce_backend/effects/filtergate/src/plugin/FilterGateProcessor.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  FilterGate Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(FILTERGATE_FORMATS "")
if(BUILD_VST3)
    list(APPEND FILTERGATE_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND FILTERGATE_FORMATS "AU")
endif()
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    list(APPEND FILTERGATE_FORMATS "CLAP")
endif()
if(BUILD_STANDALONE)
    list(APPEND FILTERGATE_FORMATS "Standalone")
endif()

#==============================================================================
#  JUCE Plugin (VST3 + AU + CLAP + Standalone)
#==============================================================================

juce_add_plugin("FilterGate"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "FilterGate"
    PLUGIN_DESCRIPTION "Spectral-Aware Gate with Filter - Frequency-aware, musically intelligent gate with spectral processing capabilities"
    PLUGIN_VERSION 1.0.0
    FORMATS ${FILTERGATE_FORMATS}
    IS_SYNTH 0
    NEEDS_MIDI_INPUT 0
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aufx"
    VST3_CATEGORY "Fx|Gate"
    BUNDLE_ID "com.whiteroom.filtergate"
    COPY_PLUGIN_AFTER_BUILD ON
)

target_sources("FilterGate"
    PRIVATE
        ${FILTERGATE_DSP}
        ${FILTERGATE_PLUGIN}
)

target_include_directories("FilterGate"
    PRIVATE
        ../../juce_backend/effects/filtergate/include
        ../../juce_backend/effects/filtergate/include/dsp
        ../../juce_backend/effects/filtergate/include/plugin
)

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("FilterGate"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET FilterGate
        CLAP_ID "com.whiteroom.filtergate"
        CLAP_FEATURES "audio-effect;gate"
    )
    message(STATUS "✓ FilterGate CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ FilterGate plugin configured successfully")
message(STATUS "  Formats: ${FILTERGATE_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
