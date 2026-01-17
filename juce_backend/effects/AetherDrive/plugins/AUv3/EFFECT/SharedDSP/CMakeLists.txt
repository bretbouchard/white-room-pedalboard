cmake_minimum_required(VERSION 3.15)

project(AetherDriveDSP LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(DSP_SOURCES
    AetherDriveDSP.cpp
)

# Include parent directory to access AetherDrivePureDSP
include_directories(../..)

# Build static library
add_library(AetherDriveDSP STATIC ${DSP_SOURCES})

# iOS specific settings
if (IOS)
    set_target_properties(AetherDriveDSP PROPERTIES
        MACOSX_BUNDLE ON
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.whiteroom.aetherdrive"
        MACOSX_BUNDLE_BUNDLE_VERSION "1.0.0"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "1.0"
    )
endif()

# Link with parent DSP code
target_include_directories(AetherDriveDSP PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../..
)

# Compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|AppleClang")
    target_compile_options(AetherDriveDSP PRIVATE
        -fobjc-arc
        -fmodules
    )
endif()
