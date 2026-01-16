# Plugin Security Test Suite
# Comprehensive security vulnerability testing for plugin loading system

cmake_minimum_required(VERSION 3.16)
project(PluginSecurityTests)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)
find_package(OpenSSL REQUIRED)

# Find JUCE
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE JUCE)

# Find GTest and GMock
find_package(GTest REQUIRED)
find_package(GMock REQUIRED)

# Define test sources
set(SECURITY_TEST_SOURCES
    PluginSecurityTest.cpp
    ArbitraryPathLoadingTest.cpp
    SignatureVerificationTest.cpp
    SandboxingTest.cpp
    WhitelistValidationTest.cpp
    IntegrityValidationTest.cpp
    # Additional test files will be added as we implement them
    # PermissionSystemTest.cpp
    # SecurityLoggingTest.cpp
    # QuarantineSystemTest.cpp
)

set(SECURITY_TEST_HEADERS
    PluginSecurityTest.h
)

# Create the security test library
add_library(PluginSecurityTestLib STATIC
    ${SECURITY_TEST_SOURCES}
    ${SECURITY_TEST_HEADERS}
)

# Set include directories
target_include_directories(PluginSecurityTestLib PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${JUCE_MODULE_DIRS}
)

# Link JUCE modules
target_link_libraries(PluginSecurityTestLib PRIVATE
    juce::juce_audio_basics
    juce::juce_audio_devices
    juce::juce_audio_processors
    juce::juce_core
    juce::juce_data_structures
    juce::juce_events
    juce::juce_gui_basics
    juce::juce_gui_extra
)

# Link OpenSSL for cryptographic operations
target_link_libraries(PluginSecurityTestLib PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto
)

# Link Google Test
target_link_libraries(PluginSecurityTestLib PRIVATE
    GTest::GTest
    GTest::Main
    GMock::GMock
)

# Compiler-specific options
if(MSVC)
    target_compile_options(PluginSecurityTestLib PRIVATE /W4)
else()
    target_compile_options(PluginSecurityTestLib PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Define security test macros
target_compile_definitions(PluginSecurityTestLib PRIVATE
    SECURITY_TEST_MODE=1
    RED_PHASE_TESTS=1
    VULNERABILITY_DEMONSTRATION=1
)

# Create individual test executables for each test category
foreach(TEST_SOURCE IN ITEMS ArbitraryPathLoadingTest SignatureVerificationTest SandboxingTest WhitelistValidationTest IntegrityValidationTest)
    get_filename_component(TEST_NAME ${TEST_SOURCE} NAME_WE)

    add_executable(${TEST_NAME} ${TEST_SOURCE}.cpp)

    target_include_directories(${TEST_NAME} PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    )

    target_link_libraries(${TEST_NAME} PRIVATE
        PluginSecurityTestLib
        GTest::GTest
        GTest::Main
    )

    # Add test to CTest
    add_test(NAME ${TEST_NAME} COMMAND ${TEST_NAME})

    # Set test properties
    set_tests_properties(${TEST_NAME} PROPERTIES
        TIMEOUT 300  # 5 minutes timeout for security tests
        PASS_REGULAR_EXPRESSION "PASSED"
        FAIL_REGULAR_EXPRESSION "FAILED|CRITICAL|SECURITY BREACH"
    )
endforeach()

# Create comprehensive security test executable
add_executable(PluginSecurityTests
    main_security_test.cpp
)

target_link_libraries(PluginSecurityTests PRIVATE
    PluginSecurityTestLib
    GTest::GTest
    GTest::Main
)

# Add comprehensive test to CTest
add_test(NAME ComprehensiveSecurityTest COMMAND PluginSecurityTests)

# Set test properties for comprehensive test
set_tests_properties(ComprehensiveSecurityTest PROPERTIES
    TIMEOUT 600  # 10 minutes timeout for comprehensive test
    PASS_REGULAR_EXPRESSION "PASSED"
    FAIL_REGULAR_EXPRESSION "FAILED|CRITICAL|SECURITY BREACH"
    LABELS "security;critical;plugin;vulnerability"
)

# Create a custom target for running all security tests
add_custom_target(run_security_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure --label-regex "security"
    DEPENDS PluginSecurityTestLib
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all plugin security tests"
)

# Create a custom target for running vulnerability demonstration tests
add_custom_target(demonstrate_vulnerabilities
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure --label-regex "security" --verbose
    DEPENDS PluginSecurityTestLib
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Demonstrating plugin security vulnerabilities (RED PHASE)"
)

# Install targets
install(TARGETS PluginSecurityTestLib
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(FILES ${SECURITY_TEST_HEADERS}
    DESTINATION include/plugin_security
)

# Custom commands for test data
add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/test_data_created
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_CURRENT_BINARY_DIR}/test_data
    COMMAND ${CMAKE_COMMAND} -E touch ${CMAKE_CURRENT_BINARY_DIR}/test_data_created
    COMMENT "Creating test data directory"
)

# Make sure test data is created before tests run
foreach(TEST_SOURCE IN ITEMS ArbitraryPathLoadingTest SignatureVerificationTest SandboxingTest)
    get_filename_component(TEST_NAME ${TEST_SOURCE} NAME_WE)
    add_dependencies(${TEST_NAME} ${CMAKE_CURRENT_BINARY_DIR}/test_data_created)
endforeach()

# Add coverage support if available
option(ENABLE_COVERAGE "Enable code coverage for security tests" OFF)
if(ENABLE_COVERAGE AND CMAKE_BUILD_TYPE STREQUAL "Debug")
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        target_compile_options(PluginSecurityTestLib PRIVATE --coverage)
        target_link_libraries(PluginSecurityTestLib PRIVATE --coverage)

        # Add coverage target
        add_custom_target(coverage
            COMMAND lcov --capture --directory ${CMAKE_CURRENT_BINARY_DIR} --output-file coverage.info
            COMMAND lcov --remove coverage.info '/usr/*' --output-file coverage.info
            COMMAND lcov --remove coverage.info '*/external/*' --output-file coverage.info
            COMMAND lcov --remove coverage.info '*/tests/*' --output-file coverage.info
            COMMAND genhtml coverage.info --output-directory coverage_html
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating code coverage report for security tests"
        )
    endif()
endif()

# Add static analysis support
option(ENABLE_CLANG_TIDY "Enable clang-tidy static analysis" OFF)
if(ENABLE_CLANG_TIDY)
    find_program(CLANG_TIDY_COMMAND NAMES clang-tidy)
    if(CLANG_TIDY_COMMAND)
        set_target_properties(PluginSecurityTestLib PROPERTIES
            CXX_CLANG_TIDY "${CLANG_TIDY_COMMAND}")
    endif()
endif()

# Add address sanitizer for debugging
option(ENABLE_ASAN "Enable AddressSanitizer for security tests" OFF)
if(ENABLE_ASAN AND CMAKE_BUILD_TYPE STREQUAL "Debug")
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        target_compile_options(PluginSecurityTestLib PRIVATE -fsanitize=address)
        target_link_libraries(PluginSecurityTestLib PRIVATE -fsanitize=address)
    endif()
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "Plugin Security Test Suite Configuration:")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  OpenSSL Found: ${OPENSSL_FOUND}")
message(STATUS "  Google Test Found: ${GTEST_FOUND}")
message(STATUS "  Google Mock Found: ${GMOCK_FOUND}")
message(STATUS "")
message(STATUS "Security Testing Features:")
message(STATUS "  Coverage Analysis: ${ENABLE_COVERAGE}")
message(STATUS "  Static Analysis: ${ENABLE_CLANG_TIDY}")
message(STATUS "  Address Sanitizer: ${ENABLE_ASAN}")
message(STATUS "")
message(STATUS "Available Targets:")
message(STATUS "  run_security_tests          - Run all security tests")
message(STATUS "  demonstrate_vulnerabilities - Demonstrate plugin vulnerabilities")
message(STATUS "  coverage                    - Generate coverage report (if enabled)")
message(STATUS "")