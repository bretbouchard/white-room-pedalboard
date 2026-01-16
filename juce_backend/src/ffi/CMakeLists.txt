# White Room JUCE FFI Server
# CMakeLists.txt for FFI server implementation

cmake_minimum_required(VERSION 3.15)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find nlohmann/json (single-header JSON library)
# Make it optional since parent CMakeLists.txt handles fallback
find_package(nlohmann_json 3.10.0 QUIET)

# Create FFI server library
add_library(white_room_ffi STATIC
  sch_engine.mm
  sch_engine_ffi.cpp
  src/ffi_server.cpp
  src/validator.cpp
  src/audio_engine_bridge.cpp
)

# Include directories
target_include_directories(white_room_ffi
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/external/JUCE/modules
)

# Link libraries
# Make nlohmann_json optional - header-only fallback will work
if(TARGET nlohmann_json::nlohmann_json)
  target_link_libraries(white_room_ffi
    PUBLIC
      nlohmann_json::nlohmann_json
      # JUCE libraries will be linked by parent CMakeLists.txt
  )
else()
  # Header-only nlohmann_json - no linking needed, just include path
  target_link_libraries(white_room_ffi
    PUBLIC
      # JUCE libraries will be linked by parent CMakeLists.txt
  )
  message(STATUS "Using header-only nlohmann_json (no target)")
endif()

# Compile definitions
target_compile_definitions(white_room_ffi
  PRIVATE
    JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_HOST=0
    JUCE_AU_HOST=0
)

# Platform-specific settings
if(APPLE)
  target_compile_options(white_room_ffi PRIVATE "-fobjc-arc")
elseif(WIN32)
  target_compile_definitions(white_room_ffi PRIVATE _WINDOWS)
elseif(UNIX)
  target_compile_options(white_room_ffi PRIVATE "-fPIC")
endif()

# Tests
if(BUILD_TESTING)
  enable_testing()

  # FFI tests
  add_executable(test_ffi
    ../../tests/ffi/test_ffi.cpp
  )

  target_link_libraries(test_ffi
    PRIVATE
      white_room_ffi
      GTest::GTest
      GTest::Main
  )

  target_include_directories(test_ffi
    PRIVATE
      ${CMAKE_CURRENT_SOURCE_DIR}/include
      ${GTEST_INCLUDE_DIRS}
  )

  add_test(NAME ffi_tests COMMAND test_ffi)

  # sch_engine_ffi tests
  add_executable(test_sch_engine_ffi
    ../../tests/ffi/test_sch_engine_ffi.cpp
  )

  target_link_libraries(test_sch_engine_ffi
    PRIVATE
      white_room_ffi
      GTest::GTest
      GTest::Main
  )

  target_include_directories(test_sch_engine_ffi
    PRIVATE
      ${CMAKE_CURRENT_SOURCE_DIR}/include
      ${GTEST_INCLUDE_DIRS}
  )

  add_test(NAME sch_engine_ffi_tests COMMAND test_sch_engine_ffi)
endif()

# Installation
install(TARGETS white_room_ffi
  ARCHIVE DESTINATION lib
  LIBRARY DESTINATION lib
  RUNTIME DESTINATION bin
)

install(FILES
  include/ffi_server.h
  sch_engine.hpp
  sch_engine_ffi.h
  sch_types.hpp
  sch_song_structs.hpp
  DESTINATION include/white_room/ffi
)
