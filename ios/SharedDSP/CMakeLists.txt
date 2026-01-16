cmake_minimum_required(VERSION 3.15)
project(SharedDSP C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# iOS platform settings
if (IOS_PLATFORM)
    set(CMAKE_SYSTEM_NAME iOS)
    set(CMAKE_OSX_ARCHITECTURES arm64)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "15.0")
endif()

# Static library target
add_library(SharedDSP STATIC
    DSPBridge.cpp
    DSPBridge.h
)

# Include directories
target_include_directories(SharedDSP PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Compile flags
target_compile_options(SharedDSP PRIVATE
    -fPIC
    -O3
    -ffast-math
)

# Frameworks (iOS)
if (IOS_PLATFORM)
    target_link_libraries(SharedDSP
        "-framework Foundation"
        "-framework CoreAudio"
        "-framework AudioToolbox"
    )
endif()

# Install
install(TARGETS SharedDSP
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)
