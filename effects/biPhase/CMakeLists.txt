# BiPhase Dual Phaser Effect
# Mu-Tron Bi-Phase Clone - JUCE Plugin

cmake_minimum_required(VERSION 3.22)

project(BiPhase VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

#==============================================================================
# BiPhase Effect - Mu-Tron Bi-Phase Clone
#==============================================================================
# Dual phaser effect with independent LFOs, feedback, and stereo processing
# Total: 2 DSP units, 15 factory presets, 100% Pure C++ implementation
#==============================================================================

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

#==============================================================================
# DSP Library (Pure C++, no JUCE dependencies)
#==============================================================================

add_library(biphase_DSP STATIC
    src/dsp/BiPhasePureDSP.cpp
)

target_include_directories(biphase_DSP
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

target_compile_features(biphase_DSP PUBLIC cxx_std_20)

set_target_properties(biphase_DSP PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib
)

#==============================================================================
# JUCE Plugin Processor (optional, for DAW integration)
#==============================================================================

option(BUILD_PLUGIN_PROCESSOR "Build BiPhase JUCE plugin processor" OFF)

if(BUILD_PLUGIN_PROCESSOR)
    # Find JUCE
    set(JUCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../external/JUCE")
    if(NOT EXISTS "${JUCE_DIR}")
        message(WARNING "JUCE not found at ${JUCE_DIR}, plugin processor will not be built")
        set(BUILD_PLUGIN_PROCESSOR OFF)
    else()
        add_subdirectory(${JUCE_DIR} ${CMAKE_CURRENT_BINARY_DIR}/JUCE)

        add_library(biphase_processor STATIC
            src/plugin/BiPhaseProcessor.cpp
        )

        target_include_directories(biphase_processor
            PRIVATE
                ${CMAKE_CURRENT_SOURCE_DIR}/include
                ${JUCE_DIR}/modules
        )

        target_link_libraries(biphase_processor
            PUBLIC
                biphase_DSP
                juce::juce_audio_utils
                juce::juce_audio_processors
                juce::juce_audio_devices
                juce::juce_audio_formats
                juce::juce_audio_basics
                juce::juce_core
                juce::juce_data_structures
                juce::juce_events
                juce::juce_graphics
                juce::juce_gui_basics
                juce::juce_gui_extra
        )

        target_compile_definitions(biphase_processor
            PUBLIC
                JucePlugin_IsSynth=0
                JucePlugin_WantsMidiInput=0
                JucePlugin_ProducesMidiOutput=0
                JucePlugin_IsMidiEffect=0
                JucePlugin_PreferredChannelConfigurations=0
        )
    endif()
endif()

#==============================================================================
# Tests
#==============================================================================

option(BUILD_TESTS "Build BiPhase unit tests" ON)

if(BUILD_TESTS)
    enable_testing()

    # Find Google Test
    find_package(GTest QUIET)

    if(GTest_FOUND)
        # Original BiPhase tests
        add_executable(BiPhaseDSPTests
            tests/BiPhaseDSPTests.cpp
        )

        target_link_libraries(BiPhaseDSPTests
            PRIVATE
                biphase_DSP
                GTest::GTest
                GTest::Main
        )

        add_test(NAME BiPhaseDSPTests COMMAND BiPhaseDSPTests)

        # New features tests (8 new features)
        add_executable(BiPhaseNewFeaturesTests
            tests/BiPhaseNewFeaturesTests.cpp
        )

        target_link_libraries(BiPhaseNewFeaturesTests
            PRIVATE
                biphase_DSP
                GTest::GTest
                GTest::Main
        )

        add_test(NAME BiPhaseNewFeaturesTests COMMAND BiPhaseNewFeaturesTests)

        message(STATUS "✓ BiPhase DSP tests enabled (GTest)")
        message(STATUS "✓ BiPhase 8 New Features tests enabled (GTest)")
    else()
        # Standalone test binary - original
        add_executable(BiPhaseDSPTests
            tests/BiPhaseDSPTests.cpp
        )

        target_link_libraries(BiPhaseDSPTests
            PRIVATE
                biphase_DSP
        )

        # Standalone test binary - new features
        add_executable(BiPhaseNewFeaturesTests
            tests/BiPhaseNewFeaturesTests.cpp
        )

        target_link_libraries(BiPhaseNewFeaturesTests
            PRIVATE
                biphase_DSP
        )

        message(WARNING "GTest not found, tests built but not linked to test framework")
    endif()
endif()

#==============================================================================
# Presets (install target)
#==============================================================================

install(DIRECTORY presets/
    DESTINATION share/biphase/presets
    FILES_MATCHING PATTERN "*.json"
)

install(TARGETS biphase_DSP
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

#==============================================================================
# Include in parent build
#==============================================================================

# Export library for use by other targets (only if effect_library exists)
if(TARGET effect_library)
    target_link_libraries(effect_library INTERFACE biphase_DSP)
endif()

#==============================================================================
# Standalone Plugin Build (when BUILD_PLUGIN is ON)
#==============================================================================
# Build standalone VST3/AU plugin for DAW testing
option(BUILD_PLUGIN "Build VST3/AU plugin for DAW testing" OFF)

if(BUILD_PLUGIN)
    # Use standalone plugin CMakeLists
    set(PLUGIN_CMAKE "${CMAKE_CURRENT_SOURCE_DIR}/CMakeLists_plugin.txt")
    if(EXISTS "${PLUGIN_CMAKE}")
        # Include the plugin CMakeLists
        include("${PLUGIN_CMAKE}")
        return()
    else()
        message(WARNING "Plugin CMakeLists not found at ${PLUGIN_CMAKE}")
    endif()
endif()

#==============================================================================
# Project Summary
#==============================================================================

message(STATUS "")
message(STATUS "============================================================================")
message(STATUS "  BiPhase Dual Phaser Effect")
message(STATUS "============================================================================")
message(STATUS "")
message(STATUS "  Mu-Tron Bi-Phase Clone - Dual Phaser with Independent LFOs")
message(STATUS "")
message(STATUS "  Features:")
message(STATUS "    - Dual phase shifters with independent LFOs")
message(STATUS "    - Stereo processing with optional channel link")
message(STATUS "    - Feedback control for resonance")
message(STATUS "    - 15 factory presets")
message(STATUS "    - Pure C++ DSP (no JUCE dependencies)")
message(STATUS "")
message(STATUS "  Build Options:")
message(STATUS "    - BUILD_PLUGIN_PROCESSOR=${BUILD_PLUGIN_PROCESSOR} (JUCE processor)")
message(STATUS "    - BUILD_TESTS=${BUILD_TESTS}")
message(STATUS "    - BUILD_PLUGIN=${BUILD_PLUGIN} (standalone VST3/AU)")
message(STATUS "")
message(STATUS "============================================================================")
message(STATUS "")
