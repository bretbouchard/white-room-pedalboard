# CMakeLists.txt for Performance Tests (Phase 4A)

cmake_minimum_required(VERSION 3.26)
project(PerformanceTests)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimizations for realistic performance testing
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O2 -march=native)
endif()

# Find Google Test
find_package(GTest QUIET)

if(NOT GTest_FOUND)
    message(STATUS "GTest not found, searching manually...")
    find_path(GTEST_INCLUDE_DIR
        NAMES gtest/gtest.h
        PATHS
            /opt/homebrew/include
            /usr/local/include
            /usr/include
        DOC "GTest include directory"
    )
    find_library(GTEST_LIBRARY
        NAMES gtest libgtest.a
        PATHS
            /opt/homebrew/lib
            /usr/local/lib
            /usr/lib
        DOC "GTest library"
    )
    find_library(GTEST_MAIN_LIBRARY
        NAMES gtest_main libgtest_main.a
        PATHS
            /opt/homebrew/lib
            /usr/local/lib
            /usr/lib
        DOC "GTest main library"
    )

    if(GTEST_INCLUDE_DIR AND GTEST_LIBRARY AND GTEST_MAIN_LIBRARY)
        message(STATUS "Found GTest manually at: ${GTEST_LIBRARY}")
        add_library(GTest::GTest IMPORTED STATIC)
        add_library(GTest::Main IMPORTED STATIC)
        set_target_properties(GTest::GTest PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${GTEST_INCLUDE_DIR}"
            IMPORTED_LOCATION "${GTEST_LIBRARY}"
        )
        set_target_properties(GTest::Main PROPERTIES
            IMPORTED_LOCATION "${GTEST_MAIN_LIBRARY}"
        )
        set(GTest_FOUND TRUE)
    endif()
endif()

if(NOT GTest_FOUND)
    message(FATAL_ERROR "GTest not found. Please install with: brew install googletest")
endif()

# Include directories (no JUCE dependency for Pure DSP tests)
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../..
    ${CMAKE_CURRENT_SOURCE_DIR}/../../integration
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp
)

# ==============================================================================
# Phase 4A: Performance Test Executables
# ==============================================================================

# Instrument Performance Test (Per-instrument CPU profiling)
# Note: Integration layer sources removed - moved to archive/server-era/integration/
# Tests now use only pure DSP implementations
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/InstrumentPerformanceTest.cpp)

    add_executable(InstrumentPerformanceTest
        ${CMAKE_CURRENT_SOURCE_DIR}/InstrumentPerformanceTest.cpp
        # Pure DSP implementations (link all 6 instruments)
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
    )

    # Link libraries
    target_link_libraries(InstrumentPerformanceTest
        PRIVATE
            GTest::gtest
            GTest::gtest_main
            pthread
            m
    )

    # Set C++ standard
    set_target_properties(InstrumentPerformanceTest PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
    )

    message(STATUS "✓ InstrumentPerformanceTest configured")

else()
    message(WARNING "InstrumentPerformanceTest sources missing, skipping...")
endif()

# Load Performance Test (6 instruments simultaneously)
# Note: Integration layer sources removed - moved to archive/server-era/integration/
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/LoadPerformanceTest.cpp)

    add_executable(LoadPerformanceTest
        ${CMAKE_CURRENT_SOURCE_DIR}/LoadPerformanceTest.cpp
        # Pure DSP implementations
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
    )

    # Link libraries
    target_link_libraries(LoadPerformanceTest
        PRIVATE
            GTest::gtest
            GTest::gtest_main
            pthread
            m
    )

    # Set C++ standard
    set_target_properties(LoadPerformanceTest PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
    )

    message(STATUS "✓ LoadPerformanceTest configured")

else()
    message(WARNING "LoadPerformanceTest sources missing, skipping...")
endif()

# Stress Performance Test (Worst-case scenarios)
# Note: Integration layer sources removed - moved to archive/server-era/integration/
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/StressPerformanceTest.cpp)

    add_executable(StressPerformanceTest
        ${CMAKE_CURRENT_SOURCE_DIR}/StressPerformanceTest.cpp
        # Pure DSP implementations
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
    )

    # Link libraries
    target_link_libraries(StressPerformanceTest
        PRIVATE
            GTest::gtest
            GTest::gtest_main
            pthread
            m
    )

    # Set C++ standard
    set_target_properties(StressPerformanceTest PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
    )

    message(STATUS "✓ StressPerformanceTest configured")

else()
    message(WARNING "StressPerformanceTest sources missing, skipping...")
endif()

# ==============================================================================
# Custom Targets to Run Tests (Only if executables were created)
# ==============================================================================

if(TARGET InstrumentPerformanceTest)
    add_custom_target(run_instrument_performance_test
        COMMAND InstrumentPerformanceTest
        DEPENDS InstrumentPerformanceTest
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running Per-Instrument CPU Performance Tests (Phase 4A)"
    )
endif()

if(TARGET LoadPerformanceTest)
    add_custom_target(run_load_performance_test
        COMMAND LoadPerformanceTest
        DEPENDS LoadPerformanceTest
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running Multi-Instrument Load Performance Tests (Phase 4A)"
    )
endif()

if(TARGET StressPerformanceTest)
    add_custom_target(run_stress_performance_test
        COMMAND StressPerformanceTest
        DEPENDS StressPerformanceTest
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running Worst-Case Stress Performance Tests (Phase 4A)"
    )
endif()

# Run all Phase 4A performance tests (if all targets exist)
if(TARGET InstrumentPerformanceTest AND TARGET LoadPerformanceTest AND TARGET StressPerformanceTest)
    add_custom_target(run_performance_tests_4a
        DEPENDS InstrumentPerformanceTest LoadPerformanceTest StressPerformanceTest
        COMMAND ${CMAKE_BINARY_DIR}/InstrumentPerformanceTest
        COMMAND ${CMAKE_BINARY_DIR}/LoadPerformanceTest
        COMMAND ${CMAKE_BINARY_DIR}/StressPerformanceTest
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running ALL Phase 4A Performance Tests"
    )
endif()

message(STATUS "✓ Phase 4A Performance Tests configured")
