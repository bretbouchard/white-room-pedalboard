cmake_minimum_required(VERSION 3.26)

# Phase 4B: Stability Testing CMake Configuration
# Tests for memory leaks, crash resilience, long-running stability, and error recovery

# Find Google Test
find_package(GTest REQUIRED)

# Include Pure DSP headers
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
)

# Pure DSP source files (all 6 instruments)
set(PURE_DSP_SOURCES
    # NexSynth
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP.cpp

    # SamSampler
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP.cpp

    # LocalGal
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp

    # KaneMarco
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
)

# =============================================================================
# Test Executables
# =============================================================================

# Memory Leak Detection Test
add_executable(MemoryLeakTest
    MemoryLeakTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(MemoryLeakTest PRIVATE GTest::gtest GTest::gtest_main pthread m)
target_compile_options(MemoryLeakTest PRIVATE -g -O0 -fsanitize=address -fno-omit-frame-pointer)
target_link_options(MemoryLeakTest PRIVATE -fsanitize=address)

# Crash Resilience Test
add_executable(CrashResilienceTest
    CrashResilienceTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(CrashResilienceTest PRIVATE GTest::gtest GTest::gtest_main pthread m)

# Long Running Stability Test
add_executable(LongRunningStabilityTest
    LongRunningStabilityTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(LongRunningStabilityTest PRIVATE GTest::gtest GTest::gtest_main pthread m)

# Error Recovery Test
add_executable(ErrorRecoveryTest
    ErrorRecoveryTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(ErrorRecoveryTest PRIVATE GTest::gtest GTest::gtest_main pthread m)

# =============================================================================
# Custom Test Commands
# =============================================================================

# Memory Leak Test with ASan
add_test(NAME MemoryLeakTest_ASan COMMAND MemoryLeakTest)
set_tests_properties(MemoryLeakTest_ASan PROPERTIES
    TIMEOUT 300
    LABELS "stability;memory"
)

# Crash Resilience Test
add_test(NAME CrashResilienceTest COMMAND CrashResilienceTest)
set_tests_properties(CrashResilienceTest PROPERTIES
    TIMEOUT 600
    LABELS "stability;crash"
)

# Long Running Stability Test (short version for CI)
add_test(NAME LongRunningStabilityTest_Short COMMAND LongRunningStabilityTest --short)
set_tests_properties(LongRunningStabilityTest_Short PROPERTIES
    TIMEOUT 120
    LABELS "stability;long-running"
)

# Error Recovery Test
add_test(NAME ErrorRecoveryTest COMMAND ErrorRecoveryTest)
set_tests_properties(ErrorRecoveryTest PROPERTIES
    TIMEOUT 300
    LABELS "stability;error-recovery"
)

# =============================================================================
# Custom Targets for Manual Testing
# =============================================================================

# Run all stability tests
add_custom_target(run_stability_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure -L "stability"
    DEPENDS MemoryLeakTest CrashResilienceTest LongRunningStabilityTest ErrorRecoveryTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all Phase 4B stability tests..."
)

# Run full 24-hour stability test (manual)
add_custom_target(run_24h_stability_test
    COMMAND LongRunningStabilityTest
    DEPENDS LongRunningStabilityTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running 24-hour stability test (CTRL+C to stop early)..."
)

# Run Valgrind memory leak check
add_custom_target(run_valgrind_check
    COMMAND valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes --verbose --error-exitcode=1 $<TARGET_FILE:MemoryLeakTest>
    DEPENDS MemoryLeakTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Valgrind memory leak detection..."
)
