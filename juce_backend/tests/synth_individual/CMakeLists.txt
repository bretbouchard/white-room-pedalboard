# CMakeLists.txt for Individual Synth Tests
# Tests each synth separately to avoid namespace conflicts

cmake_minimum_required(VERSION 3.26)
project(SynthTests)

# Set JUCE path
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Add JUCE subdirectory if it exists
if(EXISTS ${JUCE_PATH}/CMakeLists.txt)
    add_subdirectory(${JUCE_PATH} JUCE)
    message(STATUS "JUCE found and configured")
else()
    message(FATAL_ERROR "JUCE CMakeLists.txt not found at ${JUCE_PATH}")
endif()

# Platform-specific frameworks
if(APPLE)
    if(IOS)
        # iOS/tvOS need UIKit framework
        find_library(UIKit_FRAMEWORK UIKit REQUIRED)
        find_library(CoreGraphics_FRAMEWORK CoreGraphics REQUIRED)
        find_library(QuartzCore_FRAMEWORK QuartzCore REQUIRED)
        find_library(AudioToolbox_FRAMEWORK AudioToolbox REQUIRED)
        find_library(CoreAudio_FRAMEWORK CoreAudio REQUIRED)
    elseif(TVOS)
        # tvOS needs UIKit framework
        find_library(UIKit_FRAMEWORK UIKit REQUIRED)
        find_library(CoreGraphics_FRAMEWORK CoreGraphics REQUIRED)
        find_library(QuartzCore_FRAMEWORK QuartzCore REQUIRED)
        find_library(AudioToolbox_FRAMEWORK AudioToolbox REQUIRED)
        find_library(CoreAudio_FRAMEWORK CoreAudio REQUIRED)
    endif()
endif()

# Create individual tests for each synth to avoid namespace conflicts

# ============================================================================
# LocalGal Test
# ============================================================================
add_executable(TestLocalGal
    SynthTest.cpp
)
target_sources(TestLocalGal
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestLocalGal
    PRIVATE
        SYNTH_UNDER_TEST=1
        SYNTH_NAME="LocalGal"
)
target_link_libraries(TestLocalGal
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestLocalGal
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# KaneMarco Test
# ============================================================================
add_executable(TestKaneMarco
    SynthTest.cpp
)
target_sources(TestKaneMarco
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestKaneMarco
    PRIVATE
        SYNTH_UNDER_TEST=2
        SYNTH_NAME="KaneMarco"
)
target_link_libraries(TestKaneMarco
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestKaneMarco
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# KaneMarcoAether Test
# ============================================================================
add_executable(TestKaneMarcoAether
    SynthTest.cpp
)
target_sources(TestKaneMarcoAether
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestKaneMarcoAether
    PRIVATE
        SYNTH_UNDER_TEST=3
        SYNTH_NAME="KaneMarcoAether"
)
target_link_libraries(TestKaneMarcoAether
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestKaneMarcoAether
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# DrumMachine Test
# ============================================================================
add_executable(TestDrumMachine
    SynthTest.cpp
)
target_sources(TestDrumMachine
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestDrumMachine
    PRIVATE
        SYNTH_UNDER_TEST=4
        SYNTH_NAME="DrumMachine"
)
target_link_libraries(TestDrumMachine
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestDrumMachine
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# NexSynth Test
# ============================================================================
add_executable(TestNexSynth
    SynthTest.cpp
)
target_sources(TestNexSynth
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestNexSynth
    PRIVATE
        SYNTH_UNDER_TEST=5
        SYNTH_NAME="NexSynth"
)
target_link_libraries(TestNexSynth
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestNexSynth
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# SamSampler Test
# ============================================================================
add_executable(TestSamSampler
    SynthTest.cpp
)
target_sources(TestSamSampler
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestSamSampler
    PRIVATE
        SYNTH_UNDER_TEST=6
        SYNTH_NAME="SamSampler"
)
target_link_libraries(TestSamSampler
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)
target_include_directories(TestSamSampler
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# ============================================================================
# Common Settings
# ============================================================================
foreach(target TestLocalGal TestKaneMarco TestKaneMarcoAether TestDrumMachine TestNexSynth TestSamSampler)
    if(TARGET ${target})
        target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
        set_target_properties(${target} PROPERTIES
            CXX_STANDARD 20
            CXX_STANDARD_REQUIRED ON
        )

        # Platform-specific framework linking
        if(IOS OR TVOS)
            target_link_libraries(${target}
                PRIVATE
                    ${UIKit_FRAMEWORK}
                    ${CoreGraphics_FRAMEWORK}
                    ${QuartzCore_FRAMEWORK}
                    ${AudioToolbox_FRAMEWORK}
                    ${CoreAudio_FRAMEWORK}
            )
        endif()
    endif()
endforeach()

# Enable testing
enable_testing()

# Add tests
add_test(NAME TestLocalGal COMMAND TestLocalGal)
add_test(NAME TestKaneMarco COMMAND TestKaneMarco)
add_test(NAME TestKaneMarcoAether COMMAND TestKaneMarcoAether)
add_test(NAME TestDrumMachine COMMAND TestDrumMachine)
add_test(NAME TestNexSynth COMMAND TestNexSynth)
add_test(NAME TestSamSampler COMMAND TestSamSampler)

# Custom target to run all tests
add_custom_target(run_all_synth_tests
    COMMAND TestLocalGal
    COMMAND TestKaneMarco
    COMMAND TestKaneMarcoAether
    COMMAND TestDrumMachine
    COMMAND TestNexSynth
    COMMAND TestSamSampler
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all synth tests..."
)
