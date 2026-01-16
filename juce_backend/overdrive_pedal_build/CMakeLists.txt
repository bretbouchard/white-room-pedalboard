cmake_minimum_required(VERSION 3.22)
project(OverdrivePedalPlugin VERSION 1.0.0 LANGUAGES C CXX)

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
    set(CLAP_JUCE_EXTENSIONS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../external/clap-juice-extensions")
    if(EXISTS ${CLAP_JUCE_EXTENSIONS_PATH})
        add_subdirectory(${CLAP_JUCE_EXTENSIONS_PATH} ${CMAKE_CURRENT_BINARY_DIR}/clap-juice-extensions)
        include_directories(${CLAP_JUCE_EXTENSIONS_PATH}/include)
        message(STATUS "✓ Overdrive CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juice-extensions not found, CLAP disabled for Overdrive")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../effects/pedals/include
    ../effects/pedals/include/dsp
    ../effects/overdrive_pedal/include/plugin
    ../effects/overdrive_pedal/src/plugin
    ../include
    ../include/dsp
)

# Overdrive sources
set(OVERDRIVE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../effects/pedals/src/dsp/OverdrivePedalPureDSP.cpp")
set(OVERDRIVE_BASE "${CMAKE_CURRENT_SOURCE_DIR}/../effects/pedals/src/dsp/GuitarPedalPureDSP.cpp")
set(OVERDRIVE_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../effects/overdrive_pedal/src/plugin/OverdrivePluginProcessor.cpp")
set(OVERDRIVE_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../effects/overdrive_pedal/src/plugin/OverdrivePluginEditor.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  Overdrive Pedal Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(OVERDRIVE_FORMATS "")
if(BUILD_VST3)
    list(APPEND OVERDRIVE_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND OVERDRIVE_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND OVERDRIVE_FORMATS "CLAP")
    message(STATUS "✓ Overdrive will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND OVERDRIVE_FORMATS "Standalone")
endif()

juce_add_plugin("OverdrivePedal"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "Overdrive"
    PLUGIN_DESCRIPTION "Classic tube overdrive pedal emulation"
    PLUGIN_VERSION 1.0.0
    FORMATS ${OVERDRIVE_FORMATS}
    IS_SYNTH 0
    NEEDS_MIDI_INPUT 0
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aufx"
    VST3_CATEGORY "Fx|Distortion"
    BUNDLE_ID "com.whiteroom.overdrive"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(OverdrivePedal PRIVATE
    "${OVERDRIVE_DSP}"
    "${OVERDRIVE_BASE}"
    "${OVERDRIVE_PROCESSOR}"
    "${OVERDRIVE_EDITOR}"
)

message(STATUS "Adding Overdrive sources to plugin:")
message(STATUS "  ${OVERDRIVE_DSP}")
message(STATUS "  ${OVERDRIVE_BASE}")
message(STATUS "  ${OVERDRIVE_PROCESSOR}")
message(STATUS "  ${OVERDRIVE_EDITOR}")

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("OverdrivePedal"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET OverdrivePedal
        CLAP_ID "com.whiteroom.overdrive"
        CLAP_FEATURES "distortion;effect"
    )
    message(STATUS "✓ Overdrive CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ Overdrive Pedal plugin configured successfully")
message(STATUS "  Formats: ${OVERDRIVE_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juice-extensions)")
endif()
message(STATUS "")
