cmake_minimum_required(VERSION 3.16)

# Fast Math Compilation Test
# Simple test to verify FastMath.h compiles correctly

# Find GTest
find_package(GTest QUIET)
if(NOT GTest_FOUND)
    find_path(GTEST_INCLUDE_DIR NAMES gtest/gtest.h
        PATHS /opt/homebrew/include /usr/local/include /usr/include)
    find_library(GTEST_LIBRARY NAMES gtest
        PATHS /opt/homebrew/lib /usr/local/lib /usr/lib)
    find_library(GTEST_MAIN_LIBRARY NAMES gtest_main
        PATHS /opt/homebrew/lib /usr/local/lib /usr/lib)

    if(GTEST_INCLUDE_DIR AND GTEST_LIBRARY AND GTEST_MAIN_LIBRARY)
        add_library(GTest::GTest IMPORTED STATIC)
        add_library(GTest::Main IMPORTED STATIC)
        set_target_properties(GTest::GTest PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${GTEST_INCLUDE_DIR}"
            IMPORTED_LOCATION "${GTEST_LIBRARY}")
        set_target_properties(GTest::Main PROPERTIES
            IMPORTED_LOCATION "${GTEST_MAIN_LIBRARY}")
        set(GTest_FOUND TRUE)
    endif()
endif()

if(GTest_FOUND)
    message(STATUS "Building FastMath compilation test")

    add_executable(FastMathCompilationTest
        FastMathCompilationTest.cpp
    )

    target_include_directories(FastMathCompilationTest PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    )

    target_link_libraries(FastMathCompilationTest PRIVATE
        GTest::GTest
        GTest::Main
    )

    message(STATUS "Building SIMD compilation test")

    add_executable(SIMDCompilationTest
        SIMDCompilationTest.cpp
    )

    target_include_directories(SIMDCompilationTest PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    )

    target_link_libraries(SIMDCompilationTest PRIVATE
        GTest::GTest
        GTest::Main
    )

    message(STATUS "Building AudioBufferPool test")

    add_executable(AudioBufferPoolTest
        AudioBufferPoolTest.cpp
    )

    target_include_directories(AudioBufferPoolTest PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    )

    target_link_libraries(AudioBufferPoolTest PRIVATE
        GTest::GTest
        GTest::Main
        juce::juce_audio_basics
    )

    message(STATUS "✓ Optimization tests configured successfully")
else()
    message(WARNING "GTest not found, skipping optimization tests")
endif()
