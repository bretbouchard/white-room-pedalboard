# Memory Safety Tests CMakeLists.txt
# Comprehensive test suite for memory safety validation

cmake_minimum_required(VERSION 3.16)

# Find required packages
find_package(GTest REQUIRED)
find_package(GMock REQUIRED)
find_package(JUCE CONFIG REQUIRED)

# Check for NUMA support
find_package(PkgConfig)
if(PkgConfig_FOUND)
    pkg_check_modules(NUMA libnuma)
endif()

# Common memory safety test configuration
set(MEMORY_Safety_SOURCES
    # Audio source files (memory-safe implementations)
    ../src/audio/MemorySafeAudioGraph.cpp
    ../src/audio/MemorySafePersistenceManager.cpp
    ../src/audio/MemorySafetyDebugger.cpp
    ../src/audio/LockFreeMemoryPool.cpp
    ../src/audio/OptimizedMemoryPool.cpp

    # JUCE components needed
    ${JUCE_LIBRARY_DIRS}
    ${JUCE_SOURCES}
)

# Common compile definitions
set(MEMORY_Safety_COMPILE_DEFS
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    DEBUG=1
    _GLIBCXX_USE_CXX11_ABI=1
)

# Check for sanitizer availability
option(ENABLE_MEMORY_SAFETY_SANITIZERS "Enable memory safety sanitizers" ON)
option(ENABLE_PERFORMANCE_PROFILING "Enable performance profiling" OFF)
option(ENABLE_NUMA_OPTIMIZATIONS "Enable NUMA optimizations" OFF)

# Sanitizer configuration
if(ENABLE_MEMORY_SAFETY_SANITIZERS)
    # AddressSanitizer
    option(ENABLE_ASAN "Enable AddressSanitizer" ON)
    if(ENABLE_ASAN)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=address)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fno-omit-frame-pointer)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fno-optimize-sibling-calls)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize-address-use-after-scope)
    endif()

    # ThreadSanitizer
    option(ENABLE_TSAN "Enable ThreadSanitizer" ON)
    if(ENABLE_TSAN)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=thread)
    endif()

    # UndefinedBehaviorSanitizer
    option(ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer" ON)
    if(ENABLE_UBSAN)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=undefined)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=integer)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=nullability)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=alignment)
    endif()

    # MemorySanitizer (Linux only)
    if(UNIX AND NOT APPLE)
        option(ENABLE_MSAN "Enable MemorySanitizer" OFF)
        if(ENABLE_MSAN)
            list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=memory)
            list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize-memory-track-origins)
        endif()
    endif()

    # LeakSanitizer (included with ASan)
    option(ENABLE_LSAN "Enable LeakSanitizer" ON)
    if(ENABLE_LSAN AND NOT ENABLE_ASAN)
        list(APPEND MEMORY_Safety_SANITIZER_FLAGS -fsanitize=leak)
    endif()
endif()

# Performance profiling
if(ENABLE_PERFORMANCE_PROFILING)
    list(APPEND MEMORY_Safety_COMPILE_DEFS ENABLE_PERFORMANCE_PROFILING=1)
endif()

# NUMA optimizations
if(ENABLE_NUMA_OPTIMIZATIONS AND NUMA_FOUND)
    list(APPEND MEMORY_Safety_COMPILE_DEFS ENABLE_NUMA=1)
    list(APPEND MEMORY_Safety_INCLUDE_DIRS ${NUMA_INCLUDE_DIRS})
    list(APPEND MEMORY_Safety_LIBRARIES ${NUMA_LIBRARIES})
endif()

# Additional optimizations
list(APPEND MEMORY_Safety_COMPILE_FLAGS
    -march=native  # Optimize for current CPU
    -mtune=native
    -O3
    -ffast-math
    -funroll-loops
    -finline-functions
    -fno-math-errno
    -fno-signed-zeros
    -fno-trapping-math
    -fcx-limited-range
)

# SIMD optimizations
list(APPEND MEMORY_Safety_COMPILE_FLAGS
    -mavx2  # Enable AVX2
    -mfma   # Enable FMA
)

# Thread safety
list(APPEND MEMORY_Safety_COMPILE_FLAGS
    -pthread
)

# Create include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${CMAKE_CURRENT_SOURCE_DIR}/../include
    ${JUCE_INCLUDE_DIRS}
    ${MEMORY_Safety_INCLUDE_DIRS}
)

#==============================================================================
# Test 1: Memory Safety Vulnerability Tests (RED Phase)
# These tests demonstrate the vulnerabilities - they should FAIL

add_executable(memory_safety_vulnerability_test
    MemorySafetyVulnerabilityTest.cpp
    ${MEMORY_Safety_SOURCES}
)

target_include_directories(memory_safety_vulnerability_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${JUCE_INCLUDE_DIRS}
)

target_compile_definitions(memory_safety_vulnerability_test PRIVATE
    ${MEMORY_Safety_COMPILE_DEFS}
    MEMORY_SAFETY_VULNERABILITY_TEST=1
)

target_compile_options(memory_safety_vulnerability_test PRIVATE
    ${MEMORY_Safety_SANITIZER_FLAGS}
    -O0  # No optimization for vulnerability detection
    -g3  # Maximum debug info
    -Wall
    -Wextra
    -Werror
)

target_link_libraries(memory_safety_vulnerability_test PRIVATE
    GTest::gtest
    GTest::gtest_main
    GTest::gmock
    pthread
    ${MEMORY_Safety_LIBRARIES}
    ${JUCE_LIBRARIES}
)

if(ENABLE_ASAN)
    target_link_options(memory_safety_vulnerability_test PRIVATE -fsanitize=address)
endif()
if(ENABLE_TSAN)
    target_link_options(memory_safety_vulnerability_test PRIVATE -fsanitize=thread)
endif()
if(ENABLE_UBSAN)
    target_link_options(memory_safety_vulnerability_test PRIVATE -fsanitize=undefined)
endif()

# Test should fail (demonstrating vulnerabilities)
add_test(NAME MemorySafetyVulnerabilityTest
         COMMAND memory_safety_vulnerability_test)
set_tests_properties(MemorySafetyVulnerabilityTest PROPERTIES
    WILL_FAIL TRUE
    TIMEOUT 300
)

#==============================================================================
# Test 2: Memory Safety Green Phase Tests
# These tests verify that fixes work - they should PASS

add_executable(memory_safety_green_phase_test
    MemorySafetyGreenPhaseTest.cpp
    ${MEMORY_Safety_SOURCES}
)

target_include_directories(memory_safety_green_phase_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${JUCE_INCLUDE_DIRS}
)

target_compile_definitions(memory_safety_green_phase_test PRIVATE
    ${MEMORY_Safety_COMPILE_DEFS}
    MEMORY_SAFETY_GREEN_PHASE_TEST=1
)

target_compile_options(memory_safety_green_phase_test PRIVATE
    ${MEMORY_Safety_SANITIZER_FLAGS}
    ${MEMORY_Safety_COMPILE_FLAGS}
)

target_link_libraries(memory_safety_green_phase_test PRIVATE
    GTest::gtest
    GTest::gtest_main
    GTest::gmock
    pthread
    ${MEMORY_Safety_LIBRARIES}
    ${JUCE_LIBRARIES}
)

if(ENABLE_ASAN)
    target_link_options(memory_safety_green_phase_test PRIVATE -fsanitize=address)
endif()
if(ENABLE_TSAN)
    target_link_options(memory_safety_green_phase_test PRIVATE -fsanitize=thread)
endif()
if(ENABLE_UBSAN)
    target_link_options(memory_safety_green_phase_test PRIVATE -fsanitize=undefined)
endif()

# Test should pass (demonstrating fixes work)
add_test(NAME MemorySafetyGreenPhaseTest
         COMMAND memory_safety_green_phase_test)
set_tests_properties(MemorySafetyGreenPhaseTest PROPERTIES
    TIMEOUT 600
)

#==============================================================================
# Test 3: Comprehensive Memory Safety Tests
# Complete validation of the entire memory safety implementation

add_executable(comprehensive_memory_safety_test
    ComprehensiveMemorySafetyTest.cpp
    ${MEMORY_Safety_SOURCES}
)

target_include_directories(comprehensive_memory_safety_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${JUCE_INCLUDE_DIRS}
)

target_compile_definitions(comprehensive_memory_safety_test PRIVATE
    ${MEMORY_Safety_COMPILE_DEFS}
    COMPREHENSIVE_MEMORY_SAFETY_TEST=1
)

target_compile_options(comprehensive_memory_safety_test PRIVATE
    ${MEMORY_Safety_SANITIZER_FLAGS}
    ${MEMORY_Safety_COMPILE_FLAGS}
)

target_link_libraries(comprehensive_memory_safety_test PRIVATE
    GTest::gtest
    GTest::gtest_main
    GTest::gmock
    pthread
    ${MEMORY_Safety_LIBRARIES}
    ${JUCE_LIBRARIES}
    # Math library for audio processing
    m
)

if(ENABLE_ASAN)
    target_link_options(comprehensive_memory_safety_test PRIVATE -fsanitize=address)
endif()
if(ENABLE_TSAN)
    target_link_options(comprehensive_memory_safety_test PRIVATE -fsanitize=thread)
endif()
if(ENABLE_UBSAN)
    target_link_options(comprehensive_memory_safety_test PRIVATE -fsanitize=undefined)
endif()

# Comprehensive test
add_test(NAME ComprehensiveMemorySafetyTest
         COMMAND comprehensive_memory_safety_test)
set_tests_properties(ComprehensiveMemorySafetyTest PROPERTIES
    TIMEOUT 1800  # 30 minutes for comprehensive testing
)

#==============================================================================
# Test 4: Performance Benchmarks
# Validate that memory safety doesn't significantly impact performance

add_executable(memory_safety_performance_test
    PerformanceBenchmarkTest.cpp
    ${MEMORY_Safety_SOURCES}
)

target_include_directories(memory_safety_performance_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${JUCE_INCLUDE_DIRS}
)

target_compile_definitions(memory_safety_performance_test PRIVATE
    ${MEMORY_Safety_COMPILE_DEFS}
    MEMORY_SAFETY_PERFORMANCE_TEST=1
)

target_compile_options(memory_safety_performance_test PRIVATE
    ${MEMORY_Safety_COMPILE_FLAGS}
)

target_link_libraries(memory_safety_performance_test PRIVATE
    GTest::gtest
    GTest::gtest_main
    GTest::gmock
    pthread
    ${MEMORY_Safety_LIBRARIES}
    ${JUCE_LIBRARIES}
)

# Performance test
add_test(NAME MemorySafetyPerformanceTest
         COMMAND memory_safety_performance_test)
set_tests_properties(MemorySafetyPerformanceTest PROPERTIES
    TIMEOUT 1200  # 20 minutes for performance testing
)

#==============================================================================
# Custom Targets for Memory Safety Testing

# Run all memory safety tests
add_custom_target(run_memory_safety_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure --parallel 4
    DEPENDS memory_safety_vulnerability_test
            memory_safety_green_phase_test
            comprehensive_memory_safety_test
            memory_safety_performance_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running all memory safety tests"
)

# Run tests with specific sanitizers
add_custom_target(run_memory_asan_tests
    COMMAND env ASAN_OPTIONS=detect_leaks=1:strict_string_checks=1:detect_stack_use_after_return=1
            ${CMAKE_CTEST_COMMAND} --output-on-failure -R "MemorySafety"
    DEPENDS memory_safety_vulnerability_test
            memory_safety_green_phase_test
            comprehensive_memory_safety_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running memory safety tests with AddressSanitizer"
)

add_custom_target(run_memory_tsan_tests
    COMMAND env TSAN_OPTIONS=report_atomic_races=1:halt_on_error=0
            ${CMAKE_CTEST_COMMAND} --output-on-failure -R "MemorySafety"
    DEPENDS memory_safety_vulnerability_test
            memory_safety_green_phase_test
            comprehensive_memory_safety_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running memory safety tests with ThreadSanitizer"
)

add_custom_target(run_memory_ubsan_tests
    COMMAND env UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=0
            ${CMAKE_CTEST_COMMAND} --output-on-failure -R "MemorySafety"
    DEPENDS memory_safety_vulnerability_test
            memory_safety_green_phase_test
            comprehensive_memory_safety_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running memory safety tests with UndefinedBehaviorSanitizer"
)

# Run stress tests
add_custom_target(run_memory_stress_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure -R "Comprehensive"
    DEPENDS comprehensive_memory_safety_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running comprehensive memory stress tests"
)

# Memory leak detection
add_custom_target(run_memory_leak_detection
    COMMAND env LSAN_OPTIONS=detect_leaks=1:suppressions=${CMAKE_CURRENT_SOURCE_DIR}/lsan_suppressions.txt
            valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all
            --track-origins=yes --verbose --log-file=valgrind_memory_leaks.log
            ${CMAKE_CURRENT_BINARY_DIR}/comprehensive_memory_safety_test
    DEPENDS comprehensive_memory_safety_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running Valgrind memory leak detection"
)

# Performance analysis
add_custom_target(run_performance_analysis
    COMMAND perf record -g ${CMAKE_CURRENT_BINARY_DIR}/memory_safety_performance_test
    COMMAND perf report > performance_report.txt
    DEPENDS memory_safety_performance_test
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running performance analysis with perf"
)

# Code coverage (if available)
option(ENABLE_COVERAGE "Enable code coverage for memory safety tests" OFF)
if(ENABLE_COVERAGE AND CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_custom_target(run_memory_coverage
        COMMAND lcov --capture --directory . --output-file coverage.info
        COMMAND lcov --remove coverage.info '/usr/*' --output-file coverage.info
        COMMAND lcov --list coverage.info
        COMMAND genhtml coverage.info --output-directory coverage_html
        DEPENDS memory_safety_vulnerability_test
                memory_safety_green_phase_test
                comprehensive_memory_safety_test
        WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
        COMMENT "Generating code coverage report for memory safety tests"
    )
endif()

#==============================================================================
# Documentation and Reporting

# Generate test report
add_custom_target(generate_memory_safety_report
    COMMAND python3 ${CMAKE_CURRENT_SOURCE_DIR}/generate_test_report.py
            --output-dir ${CMAKE_CURRENT_BINARY_DIR}/test_reports
            --test-dir ${CMAKE_CURRENT_BINARY_DIR}
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Generating memory safety test report"
)

# Memory safety documentation
add_custom_target(memory_safety_docs
    COMMAND doxygen ${CMAKE_CURRENT_SOURCE_DIR}/memory_safety.doxyfile
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Generating memory safety documentation"
)

#==============================================================================
# Installation and Packaging

# Install memory safety test binaries
install(TARGETS memory_safety_vulnerability_test
            memory_safety_green_phase_test
            comprehensive_memory_safety_test
            memory_safety_performance_test
        RUNTIME DESTINATION bin/memory_safety_tests
        LIBRARY DESTINATION lib
        ARCHIVE DESTINATION lib)

# Install test configuration files
install(FILES
        ${CMAKE_CURRENT_SOURCE_DIR}/test_config.json
        ${CMAKE_CURRENT_SOURCE_DIR}/memory_safety.rules
    DESTINATION share/memory_safety_tests)

#==============================================================================
# Configuration Summary

# Print configuration summary
message(STATUS "")
message(STATUS "Memory Safety Tests Configuration:")
message(STATUS "  AddressSanitizer: ${ENABLE_ASAN}")
message(STATUS "  ThreadSanitizer: ${ENABLE_TSAN}")
message(STATUS "  UndefinedBehaviorSanitizer: ${ENABLE_UBSAN}")
message(STATUS "  MemorySanitizer: ${ENABLE_MSAN}")
message(STATUS "  LeakSanitizer: ${ENABLE_LSAN}")
message(STATUS "  Performance Profiling: ${ENABLE_PERFORMANCE_PROFILING}")
message(STATUS "  NUMA Optimizations: ${ENABLE_NUMA_OPTIMIZATIONS}")
message(STATUS "  Code Coverage: ${ENABLE_COVERAGE}")
if(NUMA_FOUND)
    message(STATUS "  NUMA Library: ${NUMA_LIBRARIES}")
endif()
message(STATUS "")

# Add test to CTest
enable_testing()

# Create test suite
add_test(NAME MemorySafetyTestSuite
         COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure --parallel 4
                    -R "MemorySafety")
set_tests_properties(MemorySafetyTestSuite PROPERTIES
    LABELS "MemorySafety"
    TIMEOUT 3600  # 1 hour total
)

# Environment variables for testing
set_tests_properties(MemorySafetyVulnerabilityTest PROPERTIES
    ENVIRONMENT "MALLOC_CHECK_=2:MALLOC_PERTURB_=42"
)

set_tests_properties(MemorySafetyGreenPhaseTest PROPERTIES
    ENVIRONMENT "MALLOC_CHECK_=2:MALLOC_PERTURB_=42"
)

set_tests_properties(ComprehensiveMemorySafetyTest PROPERTIES
    ENVIRONMENT "MALLOC_CHECK_=2:MALLOC_PERTURB_=42"
)

set_tests_properties(MemorySafetyPerformanceTest PROPERTIES
    ENVIRONMENT "MALLOC_CHECK_=2:MALLOC_PERTURB_=42"
)