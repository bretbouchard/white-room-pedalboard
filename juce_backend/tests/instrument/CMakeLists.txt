# CMakeLists.txt for Instrument Tests
cmake_minimum_required(VERSION 3.26)

# Find required packages
find_package(Juce CONFIG REQUIRED)

# Add the executable for instrument tests
add_executable(InstrumentManagerTests
    InstrumentManagerTests.cpp
)

# Link with JUCE libraries
target_link_libraries(InstrumentManagerTests
    PRIVATE
        juce::juce_audio_processors
        juce::juce_audio_basics
        juce::juce_dsp
        juce::juce_data_structures
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src/instrument/InstrumentManager.cpp
        ${CMAKE_SOURCE_DIR}/src/instrument/InstrumentInstance.cpp
        ${CMAKE_SOURCE_DIR}/src/instrument/CustomInstrumentBase.cpp
        ${CMAKE_SOURCE_DIR}/src/instrument/PluginManager.cpp
        ${CMAKE_SOURCE_DIR}/src/routing/AudioRoutingEngine.cpp
)

# Include directories
target_include_directories(InstrumentManagerTests
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src
        ${CMAKE_SOURCE_DIR}/external/JUCE/modules
)

# Compiler-specific options
if(MSVC)
    target_compile_options(InstrumentManagerTests PRIVATE /W4)
else()
    target_compile_options(InstrumentManagerTests PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Enable testing
enable_testing()

# Add test
add_test(NAME InstrumentManagerTests COMMAND InstrumentManagerTests)