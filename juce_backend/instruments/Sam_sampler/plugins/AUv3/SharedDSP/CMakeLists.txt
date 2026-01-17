cmake_minimum_required(VERSION 3.15)

# Sam Sampler DSP Static Library
project(SamSamplerDSP LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_OSX_DEPLOYMENT_TARGET "15.0" CACHE STRING "Minimum iOS version" FORCE)

# Source files
set(SAM_SAMPLER_DSP_SOURCES
    SamSamplerDSP.cpp
    # Add Sam Sampler DSP sources here
    ../../plugins/dsp/src/dsp/SamSamplerDSP_Pure.cpp
    # Include other necessary DSP files
)

set(SAM_SAMPLER_DSP_HEADERS
    SamSamplerDSP.h
    ../../plugins/dsp/include/dsp/SamSamplerDSP.h
    ../../plugins/dsp/include/dsp/InstrumentDSP.h
    ../../plugins/dsp/include/dsp/LookupTables.h
)

# Create static library
add_library(SamSamplerDSP STATIC ${SAM_SAMPLER_DSP_SOURCES} ${SAM_SAMPLER_DSP_HEADERS})

# Include directories
target_include_directories(SamSamplerDSP PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../plugins/dsp/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# Compile flags
target_compile_options(SamSamplerDSP PUBLIC
    -fobjc-arc
    -fmodules
)

# iOS specific
if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    set_target_properties(SamSamplerDSP PROPERTIES
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.whiteroom.samsampler dsp"
        MACOSX_BUNDLE_BUNDLE_VERSION "1.0.0"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "1.0.0"
    )
endif()
