cmake_minimum_required(VERSION 3.15)
project(PresetConverter)

# Find JUCE (or use system install)
set(JUCE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE")
if(NOT EXISTS ${JUCE_PATH})
    find_package(JUCE REQUIRED)
else()
    add_subdirectory(${JUCE_PATH})
endif()

# Preset converter executable
add_executable(preset-converter
    main.cpp
)

# Link JUCE core modules
target_link_libraries(preset-converter
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_core
)

# Install preset converter
install(TARGETS preset-converter
    RUNTIME DESTINATION bin
)
