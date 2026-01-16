cmake_minimum_required(VERSION 3.15)

project(SchillingerSDK VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find JUCE
find_package(PkgConfig REQUIRED)
find_path(JUCE_INCLUDE_DIR 
    NAMES juce_core/juce_core.h
    PATHS 
        /usr/local/include
        /opt/homebrew/include
        ${CMAKE_PREFIX_PATH}/include
)

if(NOT JUCE_INCLUDE_DIR)
    message(FATAL_ERROR "JUCE not found. Please install JUCE framework.")
endif()

# Add JUCE modules
add_subdirectory(${JUCE_INCLUDE_DIR}/../share/juce/cmake ${CMAKE_BINARY_DIR}/juce EXCLUDE_FROM_ALL)

# Create the SDK library
add_library(SchillingerSDK STATIC
    src/SchillingerSDK.cpp
    src/AuthManager.cpp
    src/RhythmAPI.cpp
    src/HarmonyAPI.cpp
    src/CompositionAPI.cpp
    src/RealtimeAudioAPI.cpp
    src/ErrorHandling.cpp
    src/NetworkManager.cpp
)

# Link JUCE modules
target_link_libraries(SchillingerSDK
    PRIVATE
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_audio_basics
        juce::juce_dsp
)

# Set include directories
target_include_directories(SchillingerSDK
    PUBLIC
        include
    PRIVATE
        src
)

# Compiler-specific options
target_compile_definitions(SchillingerSDK
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_APPLICATION_NAME_STRING="$<TARGET_PROPERTY:SchillingerSDK,JUCE_PRODUCT_NAME>"
        JUCE_APPLICATION_VERSION_STRING="$<TARGET_PROPERTY:SchillingerSDK,JUCE_VERSION>"
)

# Create example executables
add_executable(SchillingerSDKExample
    examples/basic_usage.cpp
)

target_link_libraries(SchillingerSDKExample
    PRIVATE
        SchillingerSDK
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
)

add_executable(SchillingerRealtimeExample
    examples/realtime_audio_example.cpp
)

target_link_libraries(SchillingerRealtimeExample
    PRIVATE
        SchillingerSDK
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_dsp
)

# Install targets
install(TARGETS SchillingerSDK
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)