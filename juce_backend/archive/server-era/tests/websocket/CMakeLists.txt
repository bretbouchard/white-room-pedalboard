# CMakeLists.txt for WebSocket Analysis Tests

cmake_minimum_required(VERSION 3.26)
project(WebSocketAnalysisTests)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimizations for real-time testing
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O3 -march=native -ffast-math)
endif()

# Find Google Test
find_package(GTest REQUIRED)

# Set JUCE path for tests
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../../src
    ${CMAKE_CURRENT_SOURCE_DIR}/../..
    ${JUCE_PATH}/modules
)

# WebSocket Analysis Test Executable
add_executable(AnalysisWebSocketTests
    AnalysisWebSocketTests.cpp
    ../../src/websocket/AnalysisWebSocketHandler.cpp
    ../../include/websocket/AnalysisWebSocketHandler.h
    ../../include/websocket/InstrumentWebSocketAPI.h
    ../../include/audio/CoreDSPAnalyzer.h
    ../../include/audio/PitchDetector.h
    ../../include/audio/DynamicsAnalyzer.h
    ../../include/audio/SpatialAnalyzer.h
    ../../include/audio/QualityDetector.h
    ../../include/audio/BaseAnalyzer.h
)

# Link JUCE libraries for WebSocket Analysis tests
target_link_libraries(AnalysisWebSocketTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        # Required for testing
        pthread
)

# Set properties
set_target_properties(AnalysisWebSocketTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

# Custom target to run WebSocket tests
add_custom_target(run_websocket_analysis_tests
    COMMAND AnalysisWebSocketTests
    DEPENDS AnalysisWebSocketTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running WebSocket Analysis Integration Tests (RED Phase)"
)