# Schillinger SDK C ABI Build Configuration
# CMakeLists.txt

cmake_minimum_required(VERSION 3.15)
project(schillinger_cabi VERSION 2.1.0 LANGUAGES C CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Build options
option(BUILD_SHARED_LIBS "Build shared library" ON)
option(BUILD_TESTS "Build test suite" OFF)
option(ENABLE_NODEAPI "Enable Node-API integration" ON)

# Platform-specific settings
if(WIN32)
  set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)
  set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
else()
  set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
  set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
  set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
endif()

# Include directories
include_directories(
  ${CMAKE_SOURCE_DIR}/include
  ${CMAKE_SOURCE_DIR}/src
)

# Source files
set(CABI_SOURCES
  src/schillinger_cabi.cpp
)

set(CABI_HEADERS
  include/schillinger_cabi.h
)

# Build shared library
add_library(schillinger_cabi SHARED ${CABI_SOURCES})

# Set library properties
set_target_properties(schillinger_cabi PROPERTIES
  VERSION ${PROJECT_VERSION}
  SOVERSION 2
  PUBLIC_HEADER "${CABI_HEADERS}"
)

# Installation
include(GNUInstallDirs)
install(TARGETS schillinger_cabi
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
  PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/schillinger_cabi
)

# Node-API integration (optional)
if(ENABLE_NODEAPI)
  find_package(node-addon-api CONFIG REQUIRED)

  # Create Node.js native module
  node_addon_api(schillinger_cabi_node ${CABI_SOURCES})

  # Install Node.js binding
  if(NOT WIN32)
    install(TARGETS schillinger_cabi_node
      LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}/node_modules/@schillinger-sdk/native/build/Release
    )
  endif()
endif()

# Testing
if(BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "Schillinger SDK C ABI Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build shared libs: ${BUILD_SHARED_LIBS}")
message(STATUS "  Build tests: ${BUILD_TESTS}")
message(STATUS "  Node-API enabled: ${ENABLE_NODEAPI}")
message(STATUS "")
