# CMakeLists.txt for SDK → Synth → Audio Pipeline Test
# Proves: Schillinger SDK → Synth DSP → Audio Output
# Platforms: macOS, iOS, tvOS, Linux (Raspberry Pi)

cmake_minimum_required(VERSION 3.26)
project(SdkSynthPipelineTest)

# Set JUCE path
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Add JUCE subdirectory if it exists
if(EXISTS ${JUCE_PATH}/CMakeLists.txt)
    add_subdirectory(${JUCE_PATH} JUCE)
    message(STATUS "JUCE found and configured")
else()
    message(FATAL_ERROR "JUCE CMakeLists.txt not found at ${JUCE_PATH}")
endif()

# Add the executable for SDK-Synth pipeline test
add_executable(SdkSynthPipelineTest
    SdkSynthPipelineTest.cpp
)

# Link with JUCE libraries and DSP sources
target_link_libraries(SdkSynthPipelineTest
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)

# Add DSP source files directly to target
target_sources(SdkSynthPipelineTest
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)

# Include directories
target_include_directories(SdkSynthPipelineTest
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/common/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
        ${JUCE_PATH}/modules
)

# Compiler-specific options
if(MSVC)
    target_compile_options(SdkSynthPipelineTest PRIVATE /W4)
else()
    target_compile_options(SdkSynthPipelineTest PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Enable testing
enable_testing()

# Add test
add_test(NAME SdkSynthPipelineTest COMMAND SdkSynthPipelineTest)
