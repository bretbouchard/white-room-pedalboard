cmake_minimum_required(VERSION 3.15)

project(KaneMarcoDSP)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add kane_marco DSP source
set(KANE_MARCO_DSP_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../..")
set(KANE_MARCO_DSP_SRC "${KANE_MARCO_DSP_ROOT}/plugins/dsp/src/dsp")
set(KANE_MARCO_DSP_INCLUDE "${KANE_MARCO_DSP_ROOT}/plugins/dsp/include")

# Create static library
add_library(KaneMarcoDSP STATIC

    # Wrapper files
    KaneMarcoDSP.cpp
    KaneMarcoDSP.h

    # Kane Marco DSP implementation
    ${KANE_MARCO_DSP_SRC}/KaneMarcoPureDSP.cpp
)

# Include paths
target_include_directories(KaneMarcoDSP PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${KANE_MARCO_DSP_INCLUDE}
    "${CMAKE_CURRENT_SOURCE_DIR}/../../../../include/dsp"
)

# Compiler flags for iOS
target_compile_options(KaneMarcoDSP PUBLIC
    -fobjc-arc
    -fembed-bitcode
)

# Architecture settings for iOS
if(IOS_PLATFORM)
    set(CMAKE_OSX_ARCHITECTURES "arm64")
    set(CMAKE_XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "15.0")
endif()
