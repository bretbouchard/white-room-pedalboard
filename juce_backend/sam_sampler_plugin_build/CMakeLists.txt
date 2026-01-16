cmake_minimum_required(VERSION 3.22)
project(SamSamplerPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
        message(STATUS "✓ SamSampler CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juce-extensions not found, CLAP disabled for SamSampler")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../instruments/Sam_sampler/include
    ../instruments/Sam_sampler/include/dsp
    ../instruments/Sam_sampler/src/plugin
    ../include
    ../include/dsp
)

# SamSampler sources
set(SAM_PLUGIN_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Sam_sampler/src/plugin/SamSamplerPluginProcessor.cpp")
set(SAM_PLUGIN_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Sam_sampler/src/plugin/SamSamplerPluginEditor.cpp")
set(SAM_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  SamSampler Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(SAM_SAMPLER_FORMATS "")
if(BUILD_VST3)
    list(APPEND SAM_SAMPLER_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND SAM_SAMPLER_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND SAM_SAMPLER_FORMATS "CLAP")
    message(STATUS "✓ SamSampler will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND SAM_SAMPLER_FORMATS "Standalone")
endif()

juce_add_plugin("SamSampler"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "Sam Sampler"
    PLUGIN_DESCRIPTION "SF2-based sampler with MPE and microtonal support"
    PLUGIN_VERSION 1.0.0
    FORMATS ${SAM_SAMPLER_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.SamSampler"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(SamSampler PRIVATE
    "${SAM_PLUGIN_PROCESSOR}"
    "${SAM_PLUGIN_EDITOR}"
    "${SAM_DSP}"
    "${LOOKUP_TABLES}"
)

message(STATUS "Adding SamSampler sources to plugin:")
message(STATUS "  ${SAM_PLUGIN_PROCESSOR}")
message(STATUS "  ${SAM_PLUGIN_EDITOR}")
message(STATUS "  ${SAM_DSP}")
message(STATUS "  ${LOOKUP_TABLES}")

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("SamSampler"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET SamSampler
        CLAP_ID "com.schillinger.SamSampler"
        CLAP_FEATURES "synthesizer;sampler"
    )
    message(STATUS "✓ SamSampler CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ SamSampler plugin configured successfully")
message(STATUS "  Formats: ${SAM_SAMPLER_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
