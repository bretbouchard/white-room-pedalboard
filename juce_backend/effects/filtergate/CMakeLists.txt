cmake_minimum_required(VERSION 3.15)
project(FilterGate VERSION 0.1.0 LANGUAGES C CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Platform detection
if(APPLE)
    if(IOS)
        set(PLATFORM_NAME "iOS")
    elseif(TVOS)
        set(PLATFORM_NAME "tvOS")
    else()
        set(PLATFORM_NAME "macOS")
    endif()
elseif(WIN32)
    set(PLATFORM_NAME "Windows")
elseif(UNIX AND NOT APPLE)
    set(PLATFORM_NAME "Linux")
endif()

message(STATUS "Building FilterGate for ${PLATFORM_NAME}")

# JUCE module path
set(JUCE_ROOT "${CMAKE_SOURCE_DIR}/external/JUCE")
set(JUCE_MODULES_DIR "${JUCE_ROOT}/modules")

# Compiler flags
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wno-missing-field-initializers)
endif()

# Compile definitions for all targets
add_compile_definitions(
    JUCE_GLOBAL_MODULE_SETTINGS=1
    JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_ALLOW_STATIC_NULL_VARIABLES=0
    JUCE_STRICT_REFCOUNTEDPOINTER=1
    JUCE_USE_DARK_SENSING_WINDOW=0
    DEBUG=1
    _DEBUG=1
)

# Main FilterGate library
add_library(FilterGate STATIC
    src/FilterGateProcessor.cpp
    src/JUCECompilationInfo.cpp
    src/dsp/GateDetector.cpp
    src/dsp/EnvelopeGenerator.cpp
    src/dsp/EnvelopeFollower.cpp
    src/dsp/filters/StateVariableFilter.cpp
    src/dsp/filters/LadderFilter.cpp
    src/dsp/FilterEngine.cpp
    src/dsp/AllPassFilter.cpp
    src/dsp/PhaserEngine.cpp
    src/dsp/DualPhaser.cpp
    src/dsp/Mixer.cpp
    src/dsp/ModulationMatrix.cpp
    src/dsp/DriveStage.cpp
    src/ffi/filtergate_ffi.cpp
    src/PresetManager.cpp
)

target_include_directories(FilterGate PUBLIC
    ${CMAKE_SOURCE_DIR}/include
    ${JUCE_MODULES_DIR}
)

# For Apple platforms, we need to compile JUCE modules as Objective-C++
if(APPLE)
    # Set compile flag for Objective-C++ for all source files
    target_compile_options(FilterGate PRIVATE
        $<$<COMPILE_LANGUAGE:CXX>:-x objective-c++>
    )
endif()

# Add JUCE module sources directly - each module will be compiled separately
target_sources(FilterGate PRIVATE
    ${JUCE_MODULES_DIR}/juce_audio_basics/juce_audio_basics.cpp
    ${JUCE_MODULES_DIR}/juce_audio_devices/juce_audio_devices.cpp
    ${JUCE_MODULES_DIR}/juce_audio_formats/juce_audio_formats.cpp
    ${JUCE_MODULES_DIR}/juce_audio_processors/juce_audio_processors.cpp
    ${JUCE_MODULES_DIR}/juce_audio_utils/juce_audio_utils.cpp
    ${JUCE_MODULES_DIR}/juce_core/juce_core.cpp
    ${JUCE_MODULES_DIR}/juce_data_structures/juce_data_structures.cpp
    ${JUCE_MODULES_DIR}/juce_dsp/juce_dsp.cpp
    ${JUCE_MODULES_DIR}/juce_events/juce_events.cpp
    ${JUCE_MODULES_DIR}/juce_graphics/juce_graphics.cpp
    ${JUCE_MODULES_DIR}/juce_gui_basics/juce_gui_basics.cpp
    ${JUCE_MODULES_DIR}/juce_gui_extra/juce_gui_extra.cpp
    # SheenBidi for bi-directional text support
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBAlgorithm.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBBase.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBCodepointSequence.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBLine.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBParagraph.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBScriptLocator.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SheenBidi.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/BidiChain.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/BidiTypeLookup.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/BracketQueue.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/GeneralCategoryLookup.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/IsolatingRun.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/LevelRun.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/PairingLookup.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/RunQueue.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBMirrorLocator.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/SBLog.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/ScriptLookup.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/ScriptStack.c
    ${JUCE_MODULES_DIR}/juce_graphics/unicode/sheenbidi/Source/StatusStack.c
)

# Frameworks for Apple platforms
if(APPLE)
    find_library(COREAUDIO_FRAMEWORK CoreAudio)
    find_library(COREMIDI_FRAMEWORK CoreMidi)
    find_library(AUDIOUNIT_FRAMEWORK AudioUnit)
    find_library(COCOA_FRAMEWORK Cocoa)
    find_library(COREFOUNDATION_FRAMEWORK CoreFoundation)
    find_library(CORESERVICES_FRAMEWORK CoreServices)
    find_library(ACCELERATE_FRAMEWORK Accelerate)
    find_library(AUDIOBOX_FRAMEWORK AudioToolbox)
    find_library(QUARTZCORE_FRAMEWORK QuartzCore)
    find_library(IOKIT_FRAMEWORK IOKit)
    find_library(APPKIT_FRAMEWORK AppKit)
    find_library(FOUNDATION_FRAMEWORK Foundation)
    find_library(SECURITY_FRAMEWORK Security)
    find_library(CORESERVICES_FRAMEWORK CoreServices)
    find_library(APPLICATIONSERVICES_FRAMEWORK ApplicationServices)

    target_link_libraries(FilterGate PUBLIC
        ${COREAUDIO_FRAMEWORK}
        ${COREMIDI_FRAMEWORK}
        ${AUDIOUNIT_FRAMEWORK}
        ${COCOA_FRAMEWORK}
        ${COREFOUNDATION_FRAMEWORK}
        ${CORESERVICES_FRAMEWORK}
        ${ACCELERATE_FRAMEWORK}
        ${AUDIOBOX_FRAMEWORK}
        ${QUARTZCORE_FRAMEWORK}
        ${IOKIT_FRAMEWORK}
        ${APPKIT_FRAMEWORK}
        ${FOUNDATION_FRAMEWORK}
        ${SECURITY_FRAMEWORK}
        ${APPLICATIONSERVICES_FRAMEWORK}
        /opt/homebrew/opt/harfbuzz/lib/libharfbuzz.dylib
        /opt/homebrew/opt/icu4c@78/lib/libicuuc.dylib
        /opt/homebrew/opt/icu4c@78/lib/libicui18n.dylib
        -licucore
    )
endif()

# Find GoogleTest
find_package(GTest REQUIRED)

# Test executables
add_executable(FilterGateTests
    tests/FilterGateTests.cpp
)

target_link_libraries(FilterGateTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

add_executable(GateAndEnvelopeTests
    tests/GateAndEnvelopeTests.cpp
)

target_link_libraries(GateAndEnvelopeTests PRIVATE
    FilterGate
    GTest::GTest
)

add_executable(PhaserTests
    tests/dsp/PhaserTests.cpp
    src/dsp/AllPassFilter.cpp
    src/dsp/PhaserEngine.cpp
    src/dsp/DualPhaser.cpp
)

target_link_libraries(PhaserTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

# Filter Engine tests
add_executable(StateVariableFilterTests
    tests/StateVariableFilterTests.cpp
)

target_link_libraries(StateVariableFilterTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

add_executable(LadderFilterTests
    tests/LadderFilterTests.cpp
)

target_link_libraries(LadderFilterTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

add_executable(FilterEngineTests
    tests/FilterEngineTests.cpp
)

target_link_libraries(FilterEngineTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

# Agent 5 Integration tests
add_executable(IntegrationTests
    tests/IntegrationTests.cpp
    src/dsp/Mixer.cpp
    src/dsp/ModulationMatrix.cpp
    src/dsp/DriveStage.cpp
    src/dsp/DualPhaser.cpp
    src/dsp/PhaserEngine.cpp
    src/dsp/AllPassFilter.cpp
    src/dsp/FilterEngine.cpp
    src/dsp/filters/StateVariableFilter.cpp
    src/dsp/filters/LadderFilter.cpp
    src/dsp/GateDetector.cpp
    src/dsp/EnvelopeGenerator.cpp
    src/dsp/EnvelopeFollower.cpp
)

target_link_libraries(IntegrationTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

# Agent 6 FFI tests
add_executable(FFITests
    tests/FFITests.cpp
    src/ffi/filtergate_ffi.cpp
    src/dsp/ModulationMatrix.cpp
    src/dsp/EnvelopeGenerator.cpp
    src/dsp/EnvelopeFollower.cpp
    src/dsp/GateDetector.cpp
)

target_link_libraries(FFITests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

# Agent 7 Preset Manager tests
add_executable(PresetManagerTests
    tests/PresetManagerTests.cpp
    src/PresetManager.cpp
    src/FilterGateProcessor.cpp
    src/JUCECompilationInfo.cpp
    src/dsp/GateDetector.cpp
    src/dsp/EnvelopeGenerator.cpp
    src/dsp/EnvelopeFollower.cpp
    src/dsp/filters/StateVariableFilter.cpp
    src/dsp/filters/LadderFilter.cpp
    src/dsp/FilterEngine.cpp
    src/dsp/AllPassFilter.cpp
    src/dsp/PhaserEngine.cpp
    src/dsp/DualPhaser.cpp
    src/dsp/Mixer.cpp
    src/dsp/ModulationMatrix.cpp
    src/dsp/DriveStage.cpp
)

target_link_libraries(PresetManagerTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)

# Enable testing
enable_testing()
add_test(NAME FilterGateTestSuite COMMAND FilterGateTests)
add_test(NAME GateAndEnvelopeTestSuite COMMAND GateAndEnvelopeTests)
add_test(NAME PhaserTestSuite COMMAND PhaserTests)
add_test(NAME StateVariableFilterTestSuite COMMAND StateVariableFilterTests)
add_test(NAME LadderFilterTestSuite COMMAND LadderFilterTests)
add_test(NAME FilterEngineTestSuite COMMAND FilterEngineTests)
add_test(NAME IntegrationTestSuite COMMAND IntegrationTests)
add_test(NAME FFITestSuite COMMAND FFITests)
add_test(NAME PresetManagerTestSuite COMMAND PresetManagerTests)

# Print configuration summary
message(STATUS "")
message(STATUS "FilterGate Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Platform: ${PLATFORM_NAME}")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "")

# Agent 8 Performance tests
add_executable(PerformanceTests
    tests/PerformanceTests.cpp
    src/FilterGateProcessor.cpp
)

target_link_libraries(PerformanceTests PRIVATE
    FilterGate
    GTest::GTest
    GTest::Main
)
