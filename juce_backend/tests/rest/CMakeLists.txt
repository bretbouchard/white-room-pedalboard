# REST API Security Tests CMakeLists.txt

cmake_minimum_required(VERSION 3.15)

# Find required packages
find_package(GTest REQUIRED)
find_package(GMock REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(JSONCPP REQUIRED jsoncpp)

# REST API Security Test executable
add_executable(RestApiSecurityTests
    test_rest_api_security.cpp
    test_rest_api_security.h
)

# Include directories
target_include_directories(RestApiSecurityTests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../..
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/include
    ${GTEST_INCLUDE_DIRS}
    ${GMOCK_INCLUDE_DIRS}
    ${JSONCPP_INCLUDE_DIRS}
)

# Link libraries
target_link_libraries(RestApiSecurityTests PRIVATE
    ${GTEST_LIBRARIES}
    ${GMOCK_LIBRARIES}
    ${JSONCPP_LIBRARIES}
    pthread
)

# Add REST API server implementation (to be created)
target_link_libraries(RestApiSecurityTests PRIVATE
    RestApiServer
    RequestValidator
    JsonSecurityParser
    RateLimiter
)

# Compiler-specific options
if(MSVC)
    target_compile_options(RestApiSecurityTests PRIVATE /W4)
else()
    target_compile_options(RestApiSecurityTests PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Enable testing
enable_testing()

# Add test
add_test(NAME RestApiSecurityTest COMMAND RestApiSecurityTests)

# Set test properties
set_tests_properties(RestApiSecurityTests PROPERTIES
    TIMEOUT 300
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

# Custom target to run only failing (RED phase) tests
add_custom_target(RunRedPhaseTests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure -R "DISABLED_"
    DEPENDS RestApiSecurityTests
    COMMENT "Running RED phase tests (expected to fail initially)"
)

# Custom target to run enabled tests (GREEN phase)
add_custom_target(RunGreenPhaseTests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    DEPENDS RestApiSecurityTests
    COMMENT "Running GREEN phase tests (should pass after implementation)"
)