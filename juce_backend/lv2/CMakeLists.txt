cmake_minimum_required(VERSION 3.16)
project(FilterGate_LV2 VERSION 1.0.0 LANGUAGES C CXX)

#==============================================================================
# LV2 Plugin Build Configuration
#==============================================================================

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

#==============================================================================
# Paths
#==============================================================================

set(LV2_ROOT "${CMAKE_CURRENT_SOURCE_DIR}")
set(LV2_INCLUDE "${LV2_ROOT}/include")
set(LV2_SRC "${LV2_ROOT}/src")
set(LV2_TTL "${LV2_ROOT}/ttl")
set(DSP_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../effects/filtergate")
set(DSP_INCLUDE "${DSP_ROOT}/include")
set(DSP_SRC "${DSP_ROOT}/src")

#==============================================================================
# Build Options
#==============================================================================

option(BUILD_LV2 "Build LV2 plugin" ON)
option(INSTALL_LV2 "Install LV2 bundle to system path" OFF)

#==============================================================================
# Source Files
#==============================================================================

set(LV2_SOURCES
    "${LV2_SRC}/FilterGate_LV2.cpp"
)

set(DSP_SOURCES
    "${DSP_SRC}/dsp/FilterGatePureDSP.cpp"
)

#==============================================================================
# Include Directories
#==============================================================================

include_directories(
    "${LV2_INCLUDE}"
    "${DSP_INCLUDE}"
)

#==============================================================================
# LV2 Plugin Library
#==============================================================================

if(BUILD_LV2)
    # Create shared library for LV2 plugin
    add_library(FilterGate_LV2 SHARED
        ${LV2_SOURCES}
        ${DSP_SOURCES}
    )

    # Set output name
    set_target_properties(FilterGate_LV2 PROPERTIES
        PREFIX ""
        OUTPUT_NAME "FilterGate_LV2"
        VERSION ${PROJECT_VERSION}
        SOVERSION 1
    )

    # Compiler flags
    target_compile_options(FilterGate_LV2 PRIVATE
        -fPIC
        -fvisibility=hidden
        -fdata-sections
        -ffunction-sections
        $<$<CONFIG:Release>:-O3 -DNDEBUG>
    )

    # Linker flags
    target_link_options(FilterGate_LV2 PRIVATE
        -Wl,--no-undefined
        -Wl,--as-needed
    )

    # Strip symbols on release
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        target_link_options(FilterGate_LV2 PRIVATE
            -Wl,--strip-all
        )
    endif()

    # Platform-specific settings
    if(APPLE)
        target_link_libraries(FilterGate_LV2 PRIVATE
            "-Wl,-dead_strip"
        )
    elseif(UNIX AND NOT APPLE)
        target_link_libraries(FilterGate_LV2 PRIVATE
            -Wl,--gc-sections
            -lm
        )
    endif()

    # Install to LV2 bundle
    if(INSTALL_LV2)
        install(TARGETS FilterGate_LV2
            LIBRARY DESTINATION lib/lv2/FilterGate.lv2
        )

        # Install TTL files
        install(FILES
            "${LV2_TTL}/manifest.ttl"
            "${LV2_TTL}/FilterGate.ttl"
            DESTINATION lib/lv2/FilterGate.lv2
        )
    endif()
endif()

#==============================================================================
# LV2 Bundle Creation
#==============================================================================

add_custom_command(TARGET FilterGate_LV2 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "${CMAKE_BINARY_DIR}/FilterGate.lv2"
    COMMAND ${CMAKE_COMMAND} -E copy
        "$<TARGET_FILE:FilterGate_LV2>"
        "${CMAKE_BINARY_DIR}/FilterGate.lv2/"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${LV2_TTL}/manifest.ttl"
        "${CMAKE_BINARY_DIR}/FilterGate.lv2/"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${LV2_TTL}/FilterGate.ttl"
        "${CMAKE_BINARY_DIR}/FilterGate.lv2/"
    COMMENT "Creating FilterGate.lv2 bundle"
)

#==============================================================================
# TTL Validation
#==============================================================================

find_program(LV2_VALIDATE lv2-validate)

if(LV2_VALIDATE)
    add_custom_target(validate_ttl
        COMMAND ${LV2_VALIDATE}
            "${CMAKE_BINARY_DIR}/FilterGate.lv2/manifest.ttl"
        COMMAND ${LV2_VALIDATE}
            "${CMAKE_BINARY_DIR}/FilterGate.lv2/FilterGate.ttl"
        DEPENDS FilterGate_LV2
        COMMENT "Validating TTL files"
    )
else()
    message(WARNING "lv2-validate not found, skipping TTL validation")
endif()

#==============================================================================
# Testing
#==============================================================================

option(TEST_LV2 "Build LV2 plugin tests" OFF)

if(TEST_LV2)
    enable_testing()

    # Basic functionality test
    add_executable(test_filtergate_lv2
        tests/LV2Test.cpp
    )

    target_link_libraries(test_filtergate_lv2 PRIVATE
        FilterGate_LV2
    )

    add_test(NAME LV2_BasicTest
        COMMAND test_filtergate_lv2
    )
endif()

#==============================================================================
# Summary
#==============================================================================

message(STATUS "")
message(STATUS "LV2 Plugin Configuration:")
message(STATUS "  Plugin Name: FilterGate")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Bundle: FilterGate.lv2")
message(STATUS "  Install: ${INSTALL_LV2}")
message(STATUS "  Test: ${TEST_LV2}")
message(STATUS "")
