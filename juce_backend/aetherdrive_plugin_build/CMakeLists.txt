cmake_minimum_required(VERSION 3.22)
project(AetherDrivePlugin VERSION 1.0.0 LANGUAGES C CXX)

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
        message(STATUS "✓ AetherDrive CLAP support enabled")
    else()
        message(WARNING "⚠️  clap-juice-extensions not found, CLAP disabled for AetherDrive")
        set(BUILD_CLAP OFF)
    endif()
endif()

# Include directories
include_directories(
    ../effects/AetherDrive/include
    ../effects/AetherDrive/include/dsp
    ../effects/AetherDrive/src/plugin
    ../include
    ../include/dsp
)

# AetherDrive sources
set(AETHERDRIVE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../effects/AetherDrive/src/dsp/AetherDrivePureDSP.cpp")
set(AETHERDRIVE_PROCESSOR "${CMAKE_CURRENT_SOURCE_DIR}/../effects/AetherDrive/src/plugin/AetherDrivePluginProcessor.cpp")
set(AETHERDRIVE_EDITOR "${CMAKE_CURRENT_SOURCE_DIR}/../effects/AetherDrive/src/plugin/AetherDrivePluginEditor.cpp")
set(LOOKUP_TABLES "${CMAKE_CURRENT_SOURCE_DIR}/../include/dsp/LookupTables.cpp")

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  AetherDrive Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(AETHERDRIVE_FORMATS "")
if(BUILD_VST3)
    list(APPEND AETHERDRIVE_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND AETHERDRIVE_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND AETHERDRIVE_FORMATS "CLAP")
    message(STATUS "✓ AetherDrive will build CLAP format")
endif()
if(BUILD_STANDALONE)
    list(APPEND AETHERDRIVE_FORMATS "Standalone")
endif()

juce_add_plugin("AetherDrive"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "Aether Drive"
    PLUGIN_DESCRIPTION "Guitar effects pedal emulator with bridge nonlinearity and body resonator"
    PLUGIN_VERSION 1.0.0
    FORMATS ${AETHERDRIVE_FORMATS}
    IS_SYNTH 0
    NEEDS_MIDI_INPUT 0
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aufx"
    VST3_CATEGORY "Fx|Distortion"
    BUNDLE_ID "com.whiteroom.aetherdrive"
    COPY_PLUGIN_AFTER_BUILD ON
)

# Add sources after plugin creation
target_sources(AetherDrive PRIVATE
    "${AETHERDRIVE_DSP}"
    "${AETHERDRIVE_PROCESSOR}"
    "${AETHERDRIVE_EDITOR}"
    "${LOOKUP_TABLES}"
)

message(STATUS "Adding AetherDrive sources to plugin:")
message(STATUS "  ${AETHERDRIVE_DSP}")
message(STATUS "  ${AETHERDRIVE_PROCESSOR}")
message(STATUS "  ${AETHERDRIVE_EDITOR}")
message(STATUS "  ${LOOKUP_TABLES}")

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("AetherDrive"
        PRIVATE
            juce::juce_audio_utils
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET AetherDrive
        CLAP_ID "com.whiteroom.aetherdrive"
        CLAP_FEATURES "distortion;effect"
    )
    message(STATUS "✓ AetherDrive CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ AetherDrive plugin configured successfully")
message(STATUS "  Formats: ${AETHERDRIVE_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juice-extensions)")
endif()
message(STATUS "")
