# CMakeLists.txt for SDK Integration Tests

cmake_minimum_required(VERSION 3.26)
project(SDKIntegrationTests)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Find Google Test - try both package and manual search
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

# Include directories (no JUCE dependency)
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../..
)

# Server-era integration tests - DISABLED for tvOS local-only builds
# Integration code has been moved to archive/server-era/integration/
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    message(STATUS "⏭️  Server-era integration tests excluded (tvOS local-only mode)")

    # Note: The following tests are disabled because integration/
    # directory has been moved to archive/server-era/integration/
    # These tests tested server-era WebSocket integration code
    # which is not part of the execution-only contract.

    # Legacy test sources (now archived):
    # - EngineControllerTest
    # - SongModelAdapter
    # - EventQueue
    # - EngineController

    # See JUCE_EXECUTION_ONLY.md for details on the execution-only contract.
else()
    message(STATUS "✅ Integration tests disabled - execution-only build")
endif()

# Note: All integration test targets removed - integration/ directory moved to archive/
# See archive/server-era/integration/ for the archived code
# These tests are no longer part of the execution-only build
