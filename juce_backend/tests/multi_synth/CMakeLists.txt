# CMakeLists.txt for Multi-Synth Audio Pipeline Test
# Tests ALL synths in JUCE backend for audio output

cmake_minimum_required(VERSION 3.26)
project(MultiSynthTest)

# Set JUCE path
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Add JUCE subdirectory if it exists
if(EXISTS ${JUCE_PATH}/CMakeLists.txt)
    add_subdirectory(${JUCE_PATH} JUCE)
    message(STATUS "JUCE found and configured")
else()
    message(FATAL_ERROR "JUCE CMakeLists.txt not found at ${JUCE_PATH}")
endif()

# Add the executable for multi-synth test
add_executable(MultiSynthTest
    MultiSynthTest.cpp
)

# Link with JUCE libraries
target_link_libraries(MultiSynthTest
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)

# Add all synth source files
target_sources(MultiSynthTest
    PRIVATE
        # LocalGal
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp

        # KaneMarco
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp

        # NexSynth
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp

        # SamSampler
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp

        # DrumMachine
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp

        # Common
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)

# Include directories
target_include_directories(MultiSynthTest
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# Compiler-specific options
if(MSVC)
    target_compile_options(MultiSynthTest PRIVATE /W4)
else()
    target_compile_options(MultiSynthTest PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Enable testing
enable_testing()

# Add test
add_test(NAME MultiSynthTest COMMAND MultiSynthTest)
