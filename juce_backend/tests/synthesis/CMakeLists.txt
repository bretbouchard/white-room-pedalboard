cmake_minimum_required(VERSION 3.26)
project(NexSynthesisTests VERSION 1.0.0)

# C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add JUCE as subdirectory (out-of-tree)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE JUCE)

# Create main synthesis test executable
add_executable(NexSynthesisTests)

# Add test source files
target_sources(NexSynthesisTests
    PRIVATE
        NexAlphaTests.cpp
        NexBetaTests.cpp
        NexGammaTests.cpp
        NexDeltaTests.cpp
        NexEpsilonTests.cpp
        NexZetaTests.cpp
        NexZetaOptimizedTests.cpp
        ../../src/synthesis/NexSynthEngine_Simple.cpp
)

# Create parameter stream API test executable
add_executable(NexParameterStreamAPITests)

target_sources(NexParameterStreamAPITests
    PRIVATE
        NexParameterStreamAPITests.cpp
)

# Include directories
target_include_directories(NexSynthesisTests PRIVATE
    ../../src
    ../../external/JUCE/modules
)

# Link JUCE modules
target_link_libraries(NexSynthesisTests PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_core
    juce::juce_audio_basics
)

# Parameter stream tests are self-contained, no JUCE dependencies needed for testing core functionality

# Enable testing
enable_testing()

# Google Test integration
find_package(GTest REQUIRED)
target_link_libraries(NexSynthesisTests PRIVATE GTest::gtest GTest::gtest_main)
target_link_libraries(NexParameterStreamAPITests PRIVATE
    GTest::gtest
    GTest::gtest_main
    /opt/homebrew/Cellar/googletest/1.17.0/lib/libgmock.a
    /opt/homebrew/Cellar/googletest/1.17.0/lib/libgmock_main.a
)

# Test-specific compiler flags
if(MSVC)
    target_compile_options(NexSynthesisTests PRIVATE /W4)
    target_compile_options(NexParameterStreamAPITests PRIVATE /W4)
else()
    target_compile_options(NexSynthesisTests PRIVATE -Wall -Wextra -Wpedantic)
    target_compile_options(NexParameterStreamAPITests PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Add tests
add_test(NAME NexAlphaTests COMMAND NexSynthesisTests)
add_test(NAME NexParameterStreamAPITests COMMAND NexParameterStreamAPITests)