# CMakeLists.txt for SchemaValidator tests

cmake_minimum_required(VERSION 3.15)

# Find required packages
find_package(GTest REQUIRED)

# Include GoogleTest macros
include_directories(${GTEST_INCLUDE_DIRS})

# SchemaValidator test executable
add_executable(SchemaValidatorTest
    SchemaValidatorTest.cpp
)

# Link against validation library and GTest
target_link_libraries(SchemaValidatorTest
    ${GTEST_LIBRARIES}
    ${GTEST_MAIN_LIBRARIES}
    pthread
)

# Include directories
target_include_directories(SchemaValidatorTest PRIVATE
    ${CMAKE_SOURCE_DIR}/../../include
)

# Enable testing
enable_testing()

# Add test
add_test(NAME SchemaValidatorTest COMMAND SchemaValidatorTest)
