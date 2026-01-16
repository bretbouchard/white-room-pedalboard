cmake_minimum_required(VERSION 3.16)

project(PluginValidationTests)

# ============================================================================
# Plugin Validation Tests (PFS Integration)
# ============================================================================

message(STATUS "")
message(STATUS "=================================================================")
message(STATUS "  Plugin Validation Tests")
message(STATUS "=================================================================")
message(STATUS "")

# Find pluginval
find_program(PLUGINVALExecutable
    NAMES pluginval
    PATHS "/Applications/pluginval.app/Contents/MacOS"
    NO_DEFAULT_PATH
)

if(NOT PLUGINVALExecutable)
    message(WARNING "pluginval not found. Install with: brew install --cask pluginval")
    message(WARNING "Plugin validation tests will be skipped.")
    set(PLUGINVAL_FOUND FALSE)
else()
    message(STATUS "✓ Found pluginval: ${PLUGINVALExecutable}")
    set(PLUGINVAL_FOUND TRUE)
endif()

# ============================================================================
# Test Suite 1: Parameter Stability Tests
# ============================================================================

add_executable(ParameterStabilityTest
    ParameterStabilityTest.cpp
    ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ../../include/dsp/LookupTables.cpp
)

target_include_directories(ParameterStabilityTest PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
)

target_compile_features(ParameterStabilityTest PRIVATE cxx_std_17)

target_link_libraries(ParameterStabilityTest PRIVATE
    "-framework Accelerate"
    "-framework CoreFoundation"
)

# ============================================================================
# Test Suite 2: State Save/Restore Tests
# ============================================================================

add_executable(StateSaveRestoreTest
    StateSaveRestoreTest.cpp
    ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ../../include/dsp/LookupTables.cpp
)

target_include_directories(StateSaveRestoreTest PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
)

target_compile_features(StateSaveRestoreTest PRIVATE cxx_std_17)

target_link_libraries(StateSaveRestoreTest PRIVATE
    "-framework Accelerate"
    "-framework CoreFoundation"
)

# ============================================================================
# Test Suite 3: Thread Safety Tests
# ============================================================================

add_executable(ThreadSafetyTest
    ThreadSafetyTest.cpp
    ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ../../include/dsp/LookupTables.cpp
)

target_include_directories(ThreadSafetyTest PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
)

target_compile_features(ThreadSafetyTest PRIVATE cxx_std_17)

target_link_libraries(ThreadSafetyTest PRIVATE
    "-framework Accelerate"
    "-framework CoreFoundation"
)

# ============================================================================
# Test Suite 4: Processing Stability Tests
# ============================================================================

add_executable(ProcessingStabilityTest
    ProcessingStabilityTest.cpp
    ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ../../include/dsp/LookupTables.cpp
)

target_include_directories(ProcessingStabilityTest PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
)

target_compile_features(ProcessingStabilityTest PRIVATE cxx_std_17)

target_link_libraries(ProcessingStabilityTest PRIVATE
    "-framework Accelerate"
    "-framework CoreFoundation"
)

# ============================================================================
# Custom test target for running all validation tests
# ============================================================================

add_custom_target(run_validation_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    DEPENDS ParameterStabilityTest StateSaveRestoreTest ThreadSafetyTest ProcessingStabilityTest
    COMMENT "Running all plugin validation tests..."
)

# ============================================================================
# Summary
# ============================================================================

message(STATUS "")
message(STATUS "=================================================================")
message(STATUS "  Plugin Validation Tests Configured")
message(STATUS "=================================================================")
message(STATUS "")
message(STATUS "  Test Suites:")
message(STATUS "    1. Parameter Stability    - Tests all parameter combinations")
message(STATUS "    2. State Save/Restore     - Tests preset save/load")
message(STATUS "    3. Thread Safety          - Tests concurrent access")
message(STATUS "    4. Processing Stability   - Tests buffer sizes, sample rates")
message(STATUS "")
message(STATUS "  Pluginval Validation:")
if(PLUGINVAL_FOUND)
    message(STATUS "    ✓ pluginval found at: ${PLUGINVALExecutable}")
    message(STATUS "    Run: ctest -R pluginval -V")
else()
    message(STATUS "    ✗ pluginval not found - install with: brew install --cask pluginval")
endif()
message(STATUS "")
message(STATUS "  To run all tests:")
message(STATUS "    make -C build run_validation_tests")
message(STATUS "")
message(STATUS "=================================================================")
message(STATUS "")
