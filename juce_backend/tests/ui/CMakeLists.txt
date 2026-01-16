# CMakeLists.txt for UI Test Suite

cmake_minimum_required(VERSION 3.26)
project(UITests)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimizations for UI testing
if(MSVC)
    add_compile_options(/W4 /O2 /bigobj)
else()
    add_compile_options(-Wall -Wextra -O3 -march=native)
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

# UI Test Suite executable
# Only create if all source files exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/UITestSuite.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/ThemeSystemTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/LayoutEngineTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/AccessibilityTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/AnimationTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/UserPreferenceTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/VisualRegressionTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/PerformanceTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/CrossPlatformTests.cpp)
add_executable(UITestSuite
    UITestSuite.cpp
    ThemeSystemTests.cpp
    LayoutEngineTests.cpp
    AccessibilityTests.cpp
    AnimationTests.cpp
    UserPreferenceTests.cpp
    VisualRegressionTests.cpp
    PerformanceTests.cpp
    CrossPlatformTests.cpp
)

# Create alias for consistent naming
add_executable(ui_tests ALIAS UITestSuite)
endif()

# Link libraries for UI Test Suite
if(TARGET UITestSuite)
target_link_libraries(UITestSuite
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
        juce::juce_gui_extra
        # UI specific modules
        juce::juce_audio_utils
        # Required for testing
        pthread
        ${CMAKE_DL_LIBS}
)

# Set properties
set_target_properties(UITestSuite PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

# Platform-specific libraries
if(WIN32)
    target_link_libraries(UITestSuite PRIVATE
        winmm
        ws2_32
        ole32
        uuid
        gdi32
        user32
        kernel32
        shell32
    )
elseif(APPLE)
    find_library(COREAUDIO_LIB CoreAudio)
    find_library(AUDIOUNIT_LIB AudioUnit)
    find_library(AUDIOFILE_LIB AudioToolbox)
    find_library(COREMIDI_LIB CoreMIDI)
    find_library(FOUNDATION_LIB Foundation)
    find_library(COREGRAPHICS_LIB CoreGraphics)
    find_library(COREFOUNDATION_LIB CoreFoundation)
    find_library(QUARTZCORE_LIB QuartzCore)
    find_library(IOKIT_LIB IOKit)
    find_library(CARBON_LIB Carbon)

    target_link_libraries(UITestSuite PRIVATE
        ${COREAUDIO_LIB}
        ${AUDIOUNIT_LIB}
        ${AUDIOFILE_LIB}
        ${COREMIDI_LIB}
        ${FOUNDATION_LIB}
        ${COREGRAPHICS_LIB}
        ${COREFOUNDATION_LIB}
        ${QUARTZCORE_LIB}
        ${IOKIT_LIB}
        ${CARBON_LIB}
    )
elseif(UNIX)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(ALSA alsa)
    pkg_check_modules(JACK jack)
    pkg_check_modules(PULSEAUDIO libpulse)

    target_link_libraries(UITestSuite PRIVATE
        ${ALSA_LIBRARIES}
        ${JACK_LIBRARIES}
        ${PULSEAUDIO_LIBRARIES}
        X11
        Xext
        Xcursor
        Xinerama
        Xi
        Xrandr
        Xrender
        GL
        GLU
        asound
        dl
        pthread
    )
endif()
endif()  # Close if(TARGET UITestSuite)

# Test data directory
set(UI_TEST_DATA_DIR ${CMAKE_CURRENT_SOURCE_DIR}/test_data)
file(MAKE_DIRECTORY ${UI_TEST_DATA_DIR})

# Add test data to build
configure_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/test_data/README.md
    ${CMAKE_BINARY_DIR}/test_data/README.md
    COPYONLY
)

# Custom targets to run individual test suites
add_custom_target(run_ui_tests
    COMMAND UITestSuite
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Test Suite"
)

add_custom_target(run_theme_tests
    COMMAND UITestSuite --gtest_filter="ThemeSystemTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Theme System Tests"
)

add_custom_target(run_layout_tests
    COMMAND UITestSuite --gtest_filter="LayoutEngineTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Layout Engine Tests"
)

add_custom_target(run_accessibility_tests
    COMMAND UITestSuite --gtest_filter="AccessibilityTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Accessibility Tests"
)

add_custom_target(run_animation_tests
    COMMAND UITestSuite --gtest_filter="AnimationTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Animation Tests"
)

add_custom_target(run_preference_tests
    COMMAND UITestSuite --gtest_filter="UserPreferenceTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running User Preference Tests"
)

add_custom_target(run_visual_regression_tests
    COMMAND UITestSuite --gtest_filter="VisualRegressionTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Visual Regression Tests"
)

add_custom_target(run_performance_tests
    COMMAND UITestSuite --gtest_filter="UIPerformanceTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Performance Tests"
)

add_custom_target(run_cross_platform_tests
    COMMAND UITestSuite --gtest_filter="CrossPlatformTest.*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Cross-Platform Tests"
)

# Test categories for different environments
add_custom_target(run_ui_unit_tests
    COMMAND UITestSuite --gtest_filter="-*Performance*:*VisualRegression*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Unit Tests (excluding performance and visual regression)"
)

add_custom_target(run_ui_integration_tests
    COMMAND UITestSuite --gtest_filter="*Performance*:*VisualRegression*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Integration Tests (performance and visual regression)"
)

# Test with different configurations
add_custom_target(run_ui_tests_debug
    COMMAND UITestSuite --gtest_throw_on_failure
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Tests with debug output"
)

add_custom_target(run_ui_tests_xml
    COMMAND UITestSuite --gtest_output=xml:${CMAKE_BINARY_DIR}/ui_test_results.xml
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Tests with XML output"
)

add_custom_target(run_ui_tests_json
    COMMAND UITestSuite --gtest_output=json:${CMAKE_BINARY_DIR}/ui_test_results.json
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Tests with JSON output"
)

# Performance benchmarking
add_custom_target(run_ui_benchmarks
    COMMAND UITestSuite --gtest_filter="*Performance*" --gtest_also_run_disabled_tests
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running UI Performance Benchmarks"
)

# Memory leak detection (Valgrind integration)
find_program(VALGRIND_EXECUTABLE valgrind)
if(VALGRIND_EXECUTABLE)
    add_custom_target(run_ui_tests_valgrind
        COMMAND ${VALGRIND_EXECUTABLE} --leak-check=full --show-leak-kinds=all --track-origins=yes --verbose --log-file=${CMAKE_BINARY_DIR}/valgrind_ui_tests.log UITestSuite --gtest_filter="-*Performance*"
        DEPENDS UITestSuite
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running UI Tests with Valgrind memory leak detection"
    )
endif()

# Coverage analysis (if supported)
option(ENABLE_UI_TEST_COVERAGE "Enable coverage analysis for UI tests" OFF)
if(ENABLE_UI_TEST_COVERAGE AND CMAKE_BUILD_TYPE STREQUAL "Debug")
    find_program(GCOV_EXECUTABLE gcov)
    find_program(LCOV_EXECUTABLE lcov)
    find_program(GENHTML_EXECUTABLE genhtml)

    if(GCOV_EXECUTABLE AND LCOV_EXECUTABLE AND GENHTML_EXECUTABLE)
        # Enable coverage flags
        target_compile_options(UITestSuite PRIVATE --coverage)
        target_link_options(UITestSuite PRIVATE --coverage)

        # Coverage target
        add_custom_target(ui_test_coverage
            COMMAND ${LCOV_EXECUTABLE} --capture --directory ${CMAKE_CURRENT_BINARY_DIR} --output-file ${CMAKE_BINARY_DIR}/ui_test_coverage.info
            COMMAND ${GENHTML_EXECUTABLE} -o ${CMAKE_BINARY_DIR}/ui_test_coverage ${CMAKE_BINARY_DIR}/ui_test_coverage.info
            DEPENDS UITestSuite
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating UI test coverage report"
        )
    endif()
endif()

# Continuous integration friendly target
add_custom_target(run_ci_ui_tests
    COMMAND UITestSuite --gtest_output=xml:${CMAKE_BINARY_DIR}/ci_ui_test_results.xml --gtest_filter="-*VisualRegression*"
    DEPENDS UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running CI-friendly UI Tests (excluding visual regression)"
)

# Help target for UI tests
add_custom_target(ui_tests_help
    COMMAND ${CMAKE_COMMAND} -E echo "UI Test Suite Targets:"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_ui_tests              - Run all UI tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_theme_tests           - Run theme system tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_layout_tests           - Run layout engine tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_accessibility_tests    - Run accessibility tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_animation_tests        - Run animation tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_preference_tests       - Run user preference tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_visual_regression_tests - Run visual regression tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_performance_tests      - Run UI performance tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_cross_platform_tests  - Run cross-platform tests"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_ui_unit_tests         - Run unit tests only"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_ui_integration_tests  - Run integration tests only"
    COMMAND ${CMAKE_COMMAND} -E echo "  run_ci_ui_tests           - CI-friendly test run"
    VERBATIM
    COMMENT "Display UI test targets help"
)

# Installation (optional)
option(INSTALL_UI_TESTS "Install UI test executables" OFF)
if(INSTALL_UI_TESTS)
    install(TARGETS UITestSuite
        RUNTIME DESTINATION bin/tests
        LIBRARY DESTINATION lib/tests
        ARCHIVE DESTINATION lib/tests
    )

    install(DIRECTORY ${UI_TEST_DATA_DIR}
        DESTINATION share/ui_tests/test_data
    )
endif()

# Documentation generation
find_program(DOXYGEN_EXECUTABLE doxygen)
if(DOXYGEN_EXECUTABLE)
    configure_file(
        ${CMAKE_CURRENT_SOURCE_DIR}/Doxyfile.in
        ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile
        @ONLY
    )

    add_custom_target(ui_tests_docs
        COMMAND ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile
        WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
        COMMENT "Generating UI test documentation"
    )
endif()