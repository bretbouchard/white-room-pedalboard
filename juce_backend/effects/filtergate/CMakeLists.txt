cmake_minimum_required(VERSION 3.28)
project(FilterGate VERSION 1.0.0 LANGUAGES CXX)

# ============================================================================
# FilterGate Plugin - Multi-Format Build Configuration
# ============================================================================
# Builds: VST3, AU, CLAP, LV2, AUv3, Standalone
#
# Author: Bret Bouchard
# Date: 2026-01-16
# ============================================================================

# ============================================================================
# CMake Configuration
# ============================================================================

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# JUCE module path
set(JUCE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE/modules" CACHE PATH "")

# Add JUCE modules
add_subdirectory(${JUCE_MODULE_PATH} juce-modules EXCLUDE_FROM_ALL)

# ============================================================================
# Plugin Format Selection
# ============================================================================

# Set default formats (can be overridden)
set(FILTERGATE_FORMATS "VST3;AU;Standalone" CACHE STRING "Semicolon-separated list of formats to build")

message(STATUS "Building FilterGate plugin formats: ${FILTERGATE_FORMATS}")

# ============================================================================
# Source Files
# ============================================================================

set(FILTERGATE_SOURCES
    src/plugin/FilterGateProcessor.cpp
    src/dsp/FilterGatePureDSP.cpp
)

set(FILTERGATE_HEADERS
    include/plugin/FilterGateProcessor.h
    include/dsp/FilterGatePureDSP_v2.h
    include/dsp/FilterGatePureDSP.h
)

# ============================================================================
# Main Plugin Target
# ============================================================================

add_juce_plugin(FilterGate
    SOURCES ${FILTERGATE_SOURCES}
    HEADERS ${FILTERGATE_HEADERS}
    FORMAT_STRING "${FILTERGATE_FORMATS}"
    PRODUCT_NAME "FilterGate"
    COMPANY_NAME "White Room"
    COMPANY_WEBSITE "https://github.com/bretbouchard/white_room_box"
    COMPANY_EMAIL "bret@example.com"
    VERSION_MAJOR ${PROJECT_VERSION_MAJOR}
    VERSION_MINOR ${PROJECT_VERSION_MINOR}
    VERSION_PATCH ${PROJECT_VERSION_PATCH}
    PLUGIN_MANUFACTURER_CODE "WTRM"
    PLUGIN_CODE "FlGt"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    LV2_URI "https://white_room.com/plugins/FilterGate"
    LV2_BINARY_URI "https://white_room.com/plugins/FilterGate#FilterGate"
)

# ============================================================================
# Format-Specific Configuration
# ============================================================================

# VST3 Configuration
if("VST3" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring VST3 format")

    target_compile_definitions(FilterGate_VST3 PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# AU Configuration
if("AU" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring AU format")

    target_compile_definitions(FilterGate_AU PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# CLAP Configuration
if("CLAP" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring CLAP format")

    target_compile_definitions(FilterGate_CLAP PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# LV2 Configuration
if("LV2" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring LV2 format")

    target_compile_definitions(FilterGate_LV2 PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# AUv3 Configuration
if("AUv3" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring AUv3 format")

    target_compile_definitions(FilterGate_AUv3 PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# Standalone Configuration
if("Standalone" IN_LIST FILTERGATE_FORMATS)
    message(STATUS "Configuring Standalone format")

    target_compile_definitions(FilterGate_Standalone PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_TRACK_CONTENT=0
    )
endif()

# ============================================================================
# Installation
# ============================================================================

# Install VST3
if(TARGET FilterGate_VST3 AND "VST3" IN_LIST FILTERGATE_FORMATS)
    install(TARGETS FilterGate_VST3
        DESTINATION "$ENV{HOME}/Library/Audio/Plug-Ins/VST3"
        PLUGIN_DESTINATION "VST3"
    )
    message(STATUS "VST3 will be installed to: ~/Library/Audio/Plug-Ins/VST3/")
endif()

# Install AU
if(TARGET FilterGate_AU AND "AU" IN_LIST FILTERGATE_FORMATS)
    install(TARGETS FilterGate_AU
        DESTINATION "$ENV{HOME}/Library/Audio/Plug-Ins/Components"
        PLUGIN_DESTINATION "AU"
    )
    message(STATUS "AU will be installed to: ~/Library/Audio/Plug-Ins/Components/")
endif()

# Install CLAP
if(TARGET FilterGate_CLAP AND "CLAP" IN_LIST FILTERGATE_FORMATS)
    install(TARGETS FilterGate_CLAP
        DESTINATION "$ENV{HOME}/Library/Audio/Plug-Ins/CLAP"
        PLUGIN_DESTINATION "CLAP"
    )
    message(STATUS "CLAP will be installed to: ~/Library/Audio/Plug-Ins/CLAP/")
endif()

# Install LV2
if(TARGET FilterGate_LV2 AND "LV2" IN_LIST FILTERGATE_FORMATS)
    install(TARGETS FilterGate_LV2
        DESTINATION "$ENV{HOME}/Library/Audio/Plug-Ins/LV2"
        PLUGIN_DESTINATION "LV2"
    )
    message(STATUS "LV2 will be installed to: ~/Library/Audio/Plug-Ins/LV2/")
endif()

# Install Standalone
if(TARGET FilterGate_Standalone AND "Standalone" IN_LIST FILTERGATE_FORMATS)
    install(TARGETS FilterGate_Standalone
        DESTINATION "/Applications"
        PLUGIN_DESTINATION "Standalone"
    )
    message(STATUS "Standalone will be installed to: /Applications/")
endif()

# ============================================================================
# Summary
# ============================================================================

message(STATUS "")
message(STATUS "=====================================")
message(STATUS "FilterGate Plugin Configuration")
message(STATUS "=====================================")
message(STATUS "Formats: ${FILTERGATE_FORMATS}")
message(STATUS "Version: ${PROJECT_VERSION}")
message(STATUS "Install Prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "=====================================")
message(STATUS "")
