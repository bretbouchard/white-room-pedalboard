cmake_minimum_required(VERSION 3.22)
project(KaneMarcoAetherPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
        message(STATUS "✓ KaneMarco CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juce-extensions not found, CLAP disabled for KaneMarco")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../instruments/kane_marco/include
    ../instruments/kane_marco/include/dsp
    ../include
    ../include/dsp
)

# Kane Marco sources
set(KANE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp")
set(KANE_PLUGIN "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/kane_marco/src/plugin/KaneMarcoPluginProcessor.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  KaneMarcoAether Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(KANE_MARCO_FORMATS "")
if(BUILD_VST3)
    list(APPEND KANE_MARCO_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND KANE_MARCO_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND KANE_MARCO_FORMATS "CLAP")
    message(STATUS "✓ KaneMarco will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND KANE_MARCO_FORMATS "Standalone")
endif()

juce_add_plugin("KaneMarcoAether"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "Kane Marco Aether"
    PLUGIN_DESCRIPTION "Physical modeling string synthesizer"
    PLUGIN_VERSION 1.0.0
    FORMATS ${KANE_MARCO_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.KaneMarcoAether"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(KaneMarcoAether PRIVATE
    "${KANE_DSP}"
    "${KANE_PLUGIN}"
    "${LOOKUP_TABLES}"
)

message(STATUS "Adding Kane Marco sources to plugin:")
message(STATUS "  ${KANE_DSP}")
message(STATUS "  ${KANE_PLUGIN}")
message(STATUS "  ${LOOKUP_TABLES}")

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("KaneMarcoAether"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET KaneMarcoAether
        CLAP_ID "com.schillinger.KaneMarcoAether"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ KaneMarco CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ KaneMarcoAether plugin configured successfully")
message(STATUS "  Formats: ${KANE_MARCO_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
