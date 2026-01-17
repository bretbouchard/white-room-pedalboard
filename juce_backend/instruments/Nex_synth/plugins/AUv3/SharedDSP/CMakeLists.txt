cmake_minimum_required(VERSION 3.15)
project(NexSynthDSP CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../include
)

# Source files
set(SOURCES
    NexSynthDSP.cpp
    ../src/dsp/NexSynthDSP_Pure.cpp
)

# Header files
set(HEADERS
    NexSynthDSP.h
)

# Build static library
add_library(NexSynthDSP STATIC ${SOURCES} ${HEADERS})

# iOS specific settings
if (IOS)
    set_target_properties(NexSynthDSP PROPERTIES
        OSX_ARCHITECTURES "${CMAKE_OSX_ARCHITECTURES}"
    )
endif()

# Compiler flags
target_compile_options(NexSynthDSP PRIVATE
    -fvisibility=hidden
    -fPIC
)
