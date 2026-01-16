# Monument Reverb - Multi-Format Plugin Build
# Exterior/Open-Air Reverb System

cmake_minimum_required(VERSION 3.22)
project(MonumentPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
    message(STATUS "✓ CLAP support enabled for Monument")
endif()

# Include directories
include_directories(
    ../effects/monument/include
    ../effects/monument/include/dsp
    ../include
)

# Monument sources
set(MONUMENT_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../effects/monument/src/dsp/MonumentReverbPureDSP.cpp")
set(MONUMENT_PLUGIN "${CMAKE_CURRENT_SOURCE_DIR}/../effects/monument/src/plugin/MonumentReverbProcessor.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  Monument Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(MONUMENT_FORMATS "")
if(BUILD_VST3)
    list(APPEND MONUMENT_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND MONUMENT_FORMATS "AU")
endif()
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    list(APPEND MONUMENT_FORMATS "CLAP")
endif()
if(BUILD_STANDALONE)
    list(APPEND MONUMENT_FORMATS "Standalone")
endif()

#==============================================================================
#  JUCE Plugin (VST3 + AU + CLAP + Standalone)
#==============================================================================

juce_add_plugin("Monument"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "Monument"
    PLUGIN_DESCRIPTION "Monument Reverb - Exterior/Open-Air Reverb System with ground surface simulation, vegetation absorption, and atmospheric modeling"
    PLUGIN_VERSION 1.0.0
    FORMATS ${MONUMENT_FORMATS}
    IS_SYNTH 0
    NEEDS_MIDI_INPUT 0
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aufx"
    VST3_CATEGORY "Fx|Reverb"
    BUNDLE_ID "com.whiteroom.monument"
    COPY_PLUGIN_AFTER_BUILD ON
)

target_sources("Monument"
    PRIVATE
        ${MONUMENT_DSP}
        ${MONUMENT_PLUGIN}
)

target_include_directories("Monument"
    PRIVATE
        ../effects/monument/include
        ../effects/monument/include/dsp
)

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("Monument"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET Monument
        CLAP_ID "com.whiteroom.monument"
    )
    message(STATUS "✓ Monument CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ Monument plugin configured successfully")
message(STATUS "  Formats: ${MONUMENT_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
