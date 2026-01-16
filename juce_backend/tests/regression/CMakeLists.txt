# Regression Test Suite - Phase 4D
# Detects performance and audio regressions in instrument DSP code

cmake_minimum_required(VERSION 3.16)

# Define DSP sources (same as other test suites)
set(PURE_DSP_SOURCES
    # NexSynth
    ../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp

    # LocalGal
    ../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp

    # KaneMarco
    ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp

    # SamSampler
    ../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
)

# Find required packages
find_package(GTest REQUIRED)

# Enable testing
enable_testing()

# ==============================================================================
# Regression Test Executable
# ==============================================================================

add_executable(RegressionSuite
    RegressionSuite.cpp
    PerformanceRegressionTest.cpp
    AudioRegressionTest.cpp
    ${PURE_DSP_SOURCES}
)

target_include_directories(RegressionSuite PRIVATE
    ${CMAKE_SOURCE_DIR}/../include
    ${CMAKE_SOURCE_DIR}/../../instruments/Nex_synth/include
    ${CMAKE_SOURCE_DIR}/../../instruments/localgal/include
    ${CMAKE_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_SOURCE_DIR}/../../instruments/Sam_sampler/include
    ${CMAKE_SOURCE_DIR}/../../external/JUCE/modules
)

target_link_libraries(RegressionSuite PRIVATE
    GTest::gtest
    GTest::gtest_main
    pthread
    m
)

# ==============================================================================
# Individual Test Executables (for CI/CD parallel execution)
# ==============================================================================

add_executable(PerformanceRegressionTest
    PerformanceRegressionTest.cpp
    ${PURE_DSP_SOURCES}
)

target_include_directories(PerformanceRegressionTest PRIVATE
    ${CMAKE_SOURCE_DIR}/../include
    ${CMAKE_SOURCE_DIR}/../../instruments/Nex_synth/include
    ${CMAKE_SOURCE_DIR}/../../instruments/localgal/include
    ${CMAKE_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_SOURCE_DIR}/../../instruments/Sam_sampler/include
    ${CMAKE_SOURCE_DIR}/../../external/JUCE/modules
)

target_link_libraries(PerformanceRegressionTest PRIVATE
    GTest::gtest
    GTest::gtest_main
    pthread
    m
)

add_executable(AudioRegressionTest
    AudioRegressionTest.cpp
    ${PURE_DSP_SOURCES}
)

target_include_directories(AudioRegressionTest PRIVATE
    ${CMAKE_SOURCE_DIR}/../include
    ${CMAKE_SOURCE_DIR}/../../instruments/Nex_synth/include
    ${CMAKE_SOURCE_DIR}/../../instruments/localgal/include
    ${CMAKE_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_SOURCE_DIR}/../../instruments/Sam_sampler/include
    ${CMAKE_SOURCE_DIR}/../../external/JUCE/modules
)

target_link_libraries(AudioRegressionTest PRIVATE
    GTest::gtest
    GTest::gtest_main
    pthread
    m
)

# ==============================================================================
# Register Tests with CTest
# ==============================================================================

include(GoogleTest)

# Tests will be discovered automatically when built
# No manual discovery needed at configure time

# ==============================================================================
# Custom Targets
# ==============================================================================

# Run all regression tests
add_custom_target(run_regression_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-fail -L "regression"
    DEPENDS RegressionSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all Phase 4D regression tests..."
)

# Run performance regression tests
add_custom_target(run_regression_performance_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-fail -R "Performance"
    DEPENDS PerformanceRegressionTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running performance regression tests..."
)

# Run audio regression tests
add_custom_target(run_regression_audio_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-fail -R "Audio"
    DEPENDS AudioRegressionTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running audio regression tests..."
)

# ==============================================================================
# Installation (Optional - for CI/CD artifacts)
# ==============================================================================

install(TARGETS RegressionSuite PerformanceRegressionTest AudioRegressionTest
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
)

# ==============================================================================
# Documentation
# ==============================================================================

message(STATUS "")
message(STATUS "╔═══════════════════════════════════════════════════════════════╗")
message(STATUS "║          Phase 4D: Regression Test Suite                          ║")
message(STATUS "╠═══════════════════════════════════════════════════════════════╣")
message(STATUS "║  Targets:                                                        ║")
message(STATUS "║    - RegressionSuite        : Main regression test executable    ║")
message(STATUS "║    - PerformanceRegressionTest : Performance-specific tests      ║")
message(STATUS "║    - AudioRegressionTest      : Audio-specific tests             ║")
message(STATUS "╠═══════════════════════════════════════════════════════════════╣")
message(STATUS "║  Custom Targets:                                                 ║")
message(STATUS "║    - run_regression_tests            : Run all regression tests   ║")
message(STATUS "║    - run_regression_performance_tests : Run only performance      ║")
message(STATUS "║    - run_regression_audio_tests      : Run only audio tests       ║")
message(STATUS "╠═══════════════════════════════════════════════════════════════╣")
message(STATUS "║  Usage:                                                          ║")
message(STATUS "║    make RegressionSuite              # Build all regression tests ║")
message(STATUS "║    ./RegressionSuite                  # Run all tests             ║")
message(STATUS "║    make run_regression_tests          # Run via CMake            ║")
message(STATUS "╚═══════════════════════════════════════════════════════════════╝")
message(STATUS "")
