cmake_minimum_required(VERSION 3.22)
project(DrumMachinePlugin VERSION 1.0.0 LANGUAGES C CXX)

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
    message(STATUS "✓ CLAP support enabled for Drum Machine")
endif()

# Include directories
include_directories(
    ../instruments/drummachine/include
    ../instruments/drummachine/include/dsp
    ../instruments/drummachine/src/shared
    ../include
    ../include/dsp
)

# Drum Machine sources
set(DRUM_MACHINE_DSP "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp")
set(DRUM_MACHINE_STEREO "${CMAKE_CURRENT_SOURCE_DIR}/../instruments/drummachine/src/dsp/DrumMachineStereo.cpp")

# NOTE: DrumMachinePluginProcessor.cpp needs to be created
# It should wrap DrumMachinePureDSP similar to how KaneMarcoAetherStringPluginProcessor wraps KaneMarcoAetherStringPureDSP
# For now, this CMakeLists.txt is configured but will fail until the plugin processor is created

#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" OFF)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  Drum Machine Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")

# Build format list
set(DRUM_MACHINE_FORMATS "")
if(BUILD_VST3)
    list(APPEND DRUM_MACHINE_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND DRUM_MACHINE_FORMATS "AU")
endif()
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    list(APPEND DRUM_MACHINE_FORMATS "CLAP")
endif()
if(BUILD_STANDALONE)
    list(APPEND DRUM_MACHINE_FORMATS "Standalone")
endif()

#==============================================================================
#  JUCE Plugin (VST3 + AU + CLAP + Standalone)
#==============================================================================

message(WARNING "⚠️  DrumMachinePluginProcessor.cpp not found - plugin wrapper needs to be created")
message(WARNING "    See: /Users/bretbouchard/apps/schill/white_room/juce_backend/instruments/drummachine/")
message(WARNING "    Reference: KaneMarcoAetherStringPluginProcessor for example implementation")

juce_add_plugin("DrumMachine"
    COMPANY_NAME "White Room"
    PLUGIN_NAME "Drum Machine"
    PLUGIN_DESCRIPTION "Step sequencer drum machine with synthesized voices and IDM drill mode"
    PLUGIN_VERSION 1.0.0
    FORMATS ${DRUM_MACHINE_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.whiteroom.drummachine"
    COPY_PLUGIN_AFTER_BUILD ON
)

# TODO: Add DrumMachinePluginProcessor.cpp when created
# For now, this will fail at link time
target_sources("DrumMachine"
    PRIVATE
        ${DRUM_MACHINE_DSP}
        ${DRUM_MACHINE_STEREO}
        # ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/drummachine/src/plugin/DrumMachinePluginProcessor.cpp  # NEEDS TO BE CREATED
)

target_include_directories("DrumMachine"
    PRIVATE
        ../instruments/drummachine/include
        ../instruments/drummachine/include/dsp
        ../instruments/drummachine/src/shared
)

# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("DrumMachine"
        PRIVATE
            juce::juce_audio_utils
            juce::juce_dsp
    )
endif()

# CLAP extension
if(TARGET clap_juce_extensions)
    clap_juce_extensions_plugin(TARGET DrumMachine
        CLAP_ID "com.whiteroom.drummachine"
        CLAP_FEATURES "synthesizer"
    )
    message(STATUS "✓ Drum Machine CLAP extension enabled")
endif()

#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ Drum Machine plugin configured (but incomplete)")
message(STATUS "  Formats: ${DRUM_MACHINE_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
message(STATUS "⚠️  ACTION REQUIRED: Create DrumMachinePluginProcessor.cpp")
message(STATUS "    Reference: instruments/kane_marco/src/plugin/KaneMarcoAetherStringPluginProcessor.cpp")
message(STATUS "")
