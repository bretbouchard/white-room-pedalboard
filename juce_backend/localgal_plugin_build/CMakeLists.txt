cmake_minimum_required(VERSION 3.22)
project(LocalGalPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
        message(STATUS "✓ LocalGal CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juce-extensions not found, CLAP disabled for LocalGal")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../instruments/localgal/include
    ../instruments/localgal/include/dsp
    ../instruments/localgal/src/plugin
    ../include
    ../include/dsp
)

# LocalGal sources
set(LOCALGAL_PLUGIN_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/localgal/src/plugin/LOCAL_GALPluginProcessor.cpp")
set(LOCALGAL_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/localgal/src/dsp/LocalGalPureDSP.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  LocalGal Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(LOCALGAL_FORMATS "")
if(BUILD_VST3)
    list(APPEND LOCALGAL_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND LOCALGAL_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND LOCALGAL_FORMATS "CLAP")
    message(STATUS "✓ LocalGal will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND LOCALGAL_FORMATS "Standalone")
endif()

juce_add_plugin("LocalGal"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "LOCAL GAL"
    PLUGIN_DESCRIPTION "Acid synthesizer with feel vector control and MPE support"
    PLUGIN_VERSION 1.0.0
    FORMATS ${LOCALGAL_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.LocalGal"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(LocalGal PRIVATE
    "${LOCALGAL_PLUGIN_PROCESSOR}"
    "${LOCALGAL_DSP}"
    "${LOOKUP_TABLES}"
)

message(STATUS "Adding LocalGal sources to plugin:")
message(STATUS "  ${LOCALGAL_PLUGIN_PROCESSOR}")
message(STATUS "  ${LOCALGAL_DSP}")
message(STATUS "  ${LOOKUP_TABLES}")

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("LocalGal"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET LocalGal
        CLAP_ID "com.schillinger.LocalGal"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ LocalGal CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ LocalGal plugin configured successfully")
message(STATUS "  Formats: ${LOCALGAL_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
