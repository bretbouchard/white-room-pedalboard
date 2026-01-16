# Undo/Redo System Tests
# Comprehensive test suite for thread-safe undo state management

cmake_minimum_required(VERSION 3.16)

# Find Google Test
find_package(GTest REQUIRED)

# Undo State Tests
add_executable(UndoStateTests
    UndoStateTests.cpp
    # Undo system sources
    ../../src/undo/UndoState.cpp
    # JUCE modules
    ../../external/JUCE/modules/juce_core/juce_core.cpp
    ../../external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
    ../../external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
)

target_include_directories(UndoStateTests
    PRIVATE
        ../../include
        ../../external/JUCE/modules
)

target_link_libraries(UndoStateTests
    PRIVATE
        GTest::GTest
        GTest::Main
)

target_compile_definitions(UndoStateTests
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
        JUCE_MODULE_AVAILABLE_juce_core=1
        JUCE_MODULE_AVAILABLE_juce_audio_basics=1
        JUCE_MODULE_AVAILABLE_juce_data_structures=1
)

if(APPLE)
    target_link_libraries(UndoStateTests
        PRIVATE
            pthread
    )
endif()

add_test(NAME UndoStateTests COMMAND UndoStateTests)

# Audio Engine Undo Tests
add_executable(AudioEngineUndoTests
    AudioEngineUndoTests.cpp
    # Undo system sources
    ../../src/undo/AudioEngineUndo.cpp
    ../../src/audio/PerformanceRenderer.cpp
    # JUCE modules
    ../../external/JUCE/modules/juce_core/juce_core.cpp
    ../../external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
    ../../external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
    ../../external/JUCE/modules/juce_dsp/juce_dsp.cpp
)

target_include_directories(AudioEngineUndoTests
    PRIVATE
        ../../include
        ../../external/JUCE/modules
)

target_link_libraries(AudioEngineUndoTests
    PRIVATE
        GTest::GTest
        GTest::Main
)

target_compile_definitions(AudioEngineUndoTests
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
        JUCE_MODULE_AVAILABLE_juce_core=1
        JUCE_MODULE_AVAILABLE_juce_audio_basics=1
        JUCE_MODULE_AVAILABLE_juce_data_structures=1
        JUCE_MODULE_AVAILABLE_juce_dsp=1
)

if(APPLE)
    target_link_libraries(AudioEngineUndoTests
        PRIVATE
            pthread
    )
endif()

add_test(NAME AudioEngineUndoTests COMMAND AudioEngineUndoTests)

# Undo Commands Tests (FFI)
add_executable(UndoCommandsTests
    UndoCommandsTests.cpp
    # Undo system sources
    ../../src/undo/UndoCommands.cpp
    ../../src/undo/JUCEUndoBridge.cpp
    ../../src/undo/UndoState.cpp
    # JUCE modules
    ../../external/JUCE/modules/juce_core/juce_core.cpp
    ../../external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
    ../../external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
)

target_include_directories(UndoCommandsTests
    PRIVATE
        ../../include
        ../../external/JUCE/modules
)

target_link_libraries(UndoCommandsTests
    PRIVATE
        GTest::GTest
        GTest::Main
)

target_compile_definitions(UndoCommandsTests
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
        JUCE_MODULE_AVAILABLE_juce_core=1
        JUCE_MODULE_AVAILABLE_juce_audio_basics=1
        JUCE_MODULE_AVAILABLE_juce_data_structures=1
)

if(APPLE)
    target_link_libraries(UndoCommandsTests
        PRIVATE
            pthread
    )
endif()

add_test(NAME UndoCommandsTests COMMAND UndoCommandsTests)

message(STATUS "✅ Undo/Redo System Tests configured")
message(STATUS "  - UndoStateTests: Thread-safe state management")
message(STATUS "  - AudioEngineUndoTests: Real-time diff application")
message(STATUS "  - UndoCommandsTests: FFI interface tests")
