# CMakeLists.txt for All Tests

cmake_minimum_required(VERSION 3.26)
project(AllTests)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimizations for real-time testing
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O3 -march=native -ffast-math)
endif()

# Find Google Test
find_package(GTest REQUIRED)

# Set JUCE path for tests
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../external/JUCE)

# Find and configure JUCE (only if it exists and has CMakeLists.txt)
if(EXISTS ${JUCE_PATH}/CMakeLists.txt)
    add_subdirectory(${JUCE_PATH} JUCE)
    message(STATUS "JUCE found and configured")
else()
    message(WARNING "JUCE CMakeLists.txt not found at ${JUCE_PATH}. JUCE-dependent tests will be disabled.")
    set(JUCE_FOUND FALSE)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${CMAKE_CURRENT_SOURCE_DIR}/..
    ${JUCE_PATH}/modules
)

# Success test executable
add_executable(RealtimeAudioSafetySuccessTest
    LockFreeMemoryPoolSuccessTest.cpp
    LockFreeMemoryPool_minimal.cpp
)

target_link_libraries(RealtimeAudioSafetySuccessTest
    GTest::gtest
    GTest::gtest_main
)

# Synthesizer Integration Test Executables
# Exclude if all required files don't exist (both .cpp and .h files)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/synthesis/NexSynthIntegrationTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/synthesis/NexSynthIntegration.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/CustomInstrumentBase.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/InstrumentInstance.h)
add_executable(NexSynthIntegrationTests
    synthesis/NexSynthIntegrationTests.cpp
)
endif()

if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/synthesis/SamSamplerIntegrationTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/synthesis/SamSamplerIntegration.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/CustomInstrumentBase.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/InstrumentInstance.h)
add_executable(SamSamplerIntegrationTests
    synthesis/SamSamplerIntegrationTests.cpp
)
endif()

if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/synthesis/LocalGalIntegrationTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/synthesis/LocalGalIntegration.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/CustomInstrumentBase.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/InstrumentInstance.h)
add_executable(LocalGalIntegrationTests
    synthesis/LocalGalIntegrationTests.cpp
)
endif()

# External Plugin Test Executable
# Exclude if all required files don't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/plugins/ExternalPluginTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/plugins/PluginInstance.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/plugins/PluginUIManager.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/plugins/ParameterBridge.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/plugins/MidiBridge.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/plugins/PluginBrowser.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/CustomInstrumentBase.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/instrument/InstrumentInstance.h)
add_executable(ExternalPluginTests
    plugins/ExternalPluginTests.cpp
)
endif()

# Airwindows Phase 0 Research & Planning Test Executable
# Exclude if airwindows sources don't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/airwindows/AirwindowsPhase0Tests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/airwindows/Density.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/airwindows/AirwindowsInventory.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/effects/AirwindowsInternalProcessor.cpp)
add_executable(AirwindowsPhase0Tests
    airwindows/AirwindowsPhase0Tests.cpp
    ../src/airwindows/Density.cpp
    ../src/airwindows/AirwindowsInventory.cpp
    ../src/effects/AirwindowsInternalProcessor.cpp
)
endif()

# Link JUCE libraries for synthesizer tests
foreach(target_name NexSynthIntegrationTests SamSamplerIntegrationTests LocalGalIntegrationTests)
    if(TARGET ${target_name})
        target_link_libraries(${target_name}
            PRIVATE
                GTest::gtest
                GTest::gtest_main
                # Core JUCE modules
                juce::juce_core
                juce::juce_data_structures
                juce::juce_events
                juce::juce_audio_basics
                juce::juce_audio_devices
                juce::juce_audio_formats
                juce::juce_audio_processors
                juce::juce_dsp
                juce::juce_graphics
                juce::juce_gui_basics
                # Required for testing
                pthread
        )
    endif()
endforeach()

# Link JUCE libraries for external plugin tests (requires additional modules)
if(TARGET ExternalPluginTests)
target_link_libraries(ExternalPluginTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
          # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Airwindows Phase 0 tests
if(TARGET AirwindowsPhase0Tests)
target_link_libraries(AirwindowsPhase0Tests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
          # Required for testing
        pthread
)
endif()

# CoreDSP Analyzer Test Executable
# Exclude if CoreDSPAnalyzer source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/CoreDSPAnalyzerTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/CoreDSPAnalyzer.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/CoreDSPAnalyzer.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/BaseAnalyzer.h)
add_executable(CoreDSPAnalyzerTests
    audio/CoreDSPAnalyzerTests.cpp
    ../src/audio/CoreDSPAnalyzer.cpp
    ../include/audio/CoreDSPAnalyzer.h
    ../include/audio/BaseAnalyzer.h
)
endif()

# Link JUCE libraries for CoreDSP Analyzer tests
if(TARGET CoreDSPAnalyzerTests)
target_link_libraries(CoreDSPAnalyzerTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Pitch Harmony Analyzer Test Executable
# Exclude if PitchDetector source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/PitchHarmonyTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/PitchDetector.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/PitchDetector.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/BaseAnalyzer.h)
add_executable(PitchHarmonyTests
    audio/PitchHarmonyTests.cpp
    ../src/audio/PitchDetector.cpp
    ../include/audio/PitchDetector.h
    ../include/audio/BaseAnalyzer.h
)
endif()

# Link JUCE libraries for Pitch Harmony tests
if(TARGET PitchHarmonyTests)
target_link_libraries(PitchHarmonyTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Dynamics Loudness Analyzer Test Executable
# Exclude if DynamicsAnalyzer source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/DynamicsLoudnessTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/DynamicsAnalyzer.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/DynamicsAnalyzer.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/BaseAnalyzer.h)
add_executable(DynamicsLoudnessTests
    audio/DynamicsLoudnessTests.cpp
    ../src/audio/DynamicsAnalyzer.cpp
    ../include/audio/DynamicsAnalyzer.h
    ../include/audio/BaseAnalyzer.h
)
endif()

# Spatial Analysis Test Executable
# Exclude if SpatialAnalyzer source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/SpatialAnalysisTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/SpatialAnalyzer.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/SpatialAnalyzer.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/BaseAnalyzer.h)
add_executable(SpatialAnalysisTests
    audio/SpatialAnalysisTests.cpp
    ../src/audio/SpatialAnalyzer.cpp
    ../include/audio/SpatialAnalyzer.h
    ../include/audio/BaseAnalyzer.h
)
endif()

# Link JUCE libraries for Dynamics Loudness tests
if(TARGET DynamicsLoudnessTests)
target_link_libraries(DynamicsLoudnessTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Spatial Analysis tests
if(TARGET SpatialAnalysisTests)
target_link_libraries(SpatialAnalysisTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Quality Detection Test Executable
# Exclude if QualityDetector source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/QualityDetectionTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/QualityDetector.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/QualityDetector.h AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/BaseAnalyzer.h)
add_executable(QualityDetectionTests
    audio/QualityDetectionTests.cpp
    ../src/audio/QualityDetector.cpp
    ../include/audio/QualityDetector.h
    ../include/audio/BaseAnalyzer.h
)
endif()

# Link JUCE libraries for Quality Detection tests
if(TARGET QualityDetectionTests)
target_link_libraries(QualityDetectionTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# SamSamplerDSP Test Executable (Phase 0 TDD)
# Exclude if SamSamplerDSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/SamSamplerDSPTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/SamSamplerDSP.cpp)
add_executable(SamSamplerDSPTest
    dsp/SamSamplerDSPTest.cpp
    ../src/dsp/SamSamplerDSP.cpp
)
endif()

# Link JUCE libraries for SamSamplerDSP tests
if(TARGET SamSamplerDSPTest)
target_link_libraries(SamSamplerDSPTest
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Kane Marco Aether String Test Executable (Week 1 TDD - 20 tests)
# Exclude if Kane Marco Aether String DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/KaneMarcoAetherStringTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/KaneMarcoAetherStringDSP.cpp)
add_executable(KaneMarcoAetherStringTest
    dsp/KaneMarcoAetherStringTests.cpp
    ../src/dsp/KaneMarcoAetherStringDSP.cpp
)
endif()

# Link JUCE libraries for Kane Marco Aether String tests
if(TARGET KaneMarcoAetherStringTest)
target_link_libraries(KaneMarcoAetherStringTest
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Kane Marco Aether Physical Modeling Test Executable (Week 1-2 TDD - 13 tests)
# Exclude if Kane Marco Aether DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/KaneMarcoAetherTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/KaneMarcoAetherDSP.cpp)
add_executable(KaneMarcoAetherTests
    dsp/KaneMarcoAetherTests.cpp
    ../src/dsp/KaneMarcoAetherDSP.cpp
)
endif()

# Kane Marco Aether Presets Test Executable (Week 4 - 20 factory presets validation)
# Exclude if test file doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/KaneMarcoAetherPresetsTest.cpp)
add_executable(KaneMarcoAetherPresetsTest
    KaneMarcoAetherPresetsTest.cpp
)
endif()

# Link JUCE libraries for Kane Marco Aether tests
if(TARGET KaneMarcoAetherTests)
target_link_libraries(KaneMarcoAetherTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link libraries for Kane Marco Aether Presets tests (JSON validation only)
if(TARGET KaneMarcoAetherPresetsTest)
target_link_libraries(KaneMarcoAetherPresetsTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
)
endif()

# Kane Marco Aether Performance Test Executable (Week 5 - Production profiling)
# Exclude if Kane Marco Aether DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/KaneMarcoAetherPerformanceTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/KaneMarcoAetherDSP.cpp)
add_executable(KaneMarcoAetherPerformanceTest
    dsp/KaneMarcoAetherPerformanceTest.cpp
    ../src/dsp/KaneMarcoAetherDSP.cpp
)
endif()

# Link JUCE libraries for Kane Marco Aether Performance tests
if(TARGET KaneMarcoAetherPerformanceTest)
target_link_libraries(KaneMarcoAetherPerformanceTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# SF2 SoundFont 2 Test Executable (18 tests for SF2 support)
# Exclude if SF2Reader DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/SF2Test.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/SamSamplerDSP.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/SF2Reader.cpp)
add_executable(SF2Test
    dsp/SF2Test.cpp
    ../src/dsp/SamSamplerDSP.cpp
    ../src/dsp/SF2Reader.cpp
)
endif()

# Kane Marco Hybrid Virtual Analog Synthesizer Test Executable (80-100 tests for complete coverage)
# Exclude if Kane Marco DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/KaneMarcoTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/KaneMarcoDSP.cpp)
add_executable(KaneMarcoTests
    dsp/KaneMarcoTests.cpp
    ../src/dsp/KaneMarcoDSP.cpp
)
endif()

# Kane Marco Performance Profiling Test Executable (Week 4 - Performance profiling and optimization)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/KaneMarcoPerformanceTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/dsp/KaneMarcoDSP.cpp)
add_executable(KaneMarcoPerformanceTests
    dsp/KaneMarcoPerformanceTests.cpp
    ../src/dsp/KaneMarcoDSP.cpp
)
endif()

# Link JUCE libraries for SF2 tests
if(TARGET SF2Test)
target_link_libraries(SF2Test
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Kane Marco tests
if(TARGET KaneMarcoTests)
target_link_libraries(KaneMarcoTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Kane Marco Performance tests
if(TARGET KaneMarcoPerformanceTests)
target_link_libraries(KaneMarcoPerformanceTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Aether Giant Drums Test Executable (Physical modeling drum synthesizer)
# Exclude if AetherGiantDrums DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/AetherGiantDrumsTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp)
add_executable(AetherGiantDrumsTests
    dsp/AetherGiantDrumsTests.cpp
    ../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp
    ../src/dsp/InstrumentFactory.cpp
    ../include/dsp/LookupTables.cpp
)

# Add include directories for Aether Giant Drums tests
target_include_directories(AetherGiantDrumsTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/include
)

# Link JUCE libraries for Aether Giant Drums tests
target_link_libraries(AetherGiantDrumsTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Aether Giant Voice Test Executable (Physical modeling vocal synthesizer)
# Exclude if AetherGiantVoice DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/AetherGiantVoiceTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp)
add_executable(AetherGiantVoiceTests
    dsp/AetherGiantVoiceTests.cpp
    ../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp
    ../include/dsp/LookupTables.cpp
)

# Add include directories for Aether Giant Voice tests
target_include_directories(AetherGiantVoiceTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/include
)

# Link JUCE libraries for Aether Giant Voice tests
target_link_libraries(AetherGiantVoiceTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Aether Giant Horns Test Executable (Physical modeling horn synthesizer)
# Exclude if AetherGiantHorns DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/AetherGiantHornsTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantHornsPureDSP.cpp)
add_executable(AetherGiantHornsTests
    dsp/AetherGiantHornsTests.cpp
    ../instruments/giant_instruments/src/dsp/AetherGiantHornsPureDSP.cpp
    ../src/dsp/InstrumentFactory.cpp
    ../include/dsp/LookupTables.cpp
)

# Add include directories for Aether Giant Horns tests
target_include_directories(AetherGiantHornsTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/include
)

# Link JUCE libraries for Aether Giant Horns tests
target_link_libraries(AetherGiantHornsTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Aether Giant Percussion Test Executable (Physical modeling percussion synthesizer)
# Exclude if AetherGiantPercussion DSP source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/AetherGiantPercussionTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp)
add_executable(AetherGiantPercussionTests
    dsp/AetherGiantPercussionTests.cpp
    ../instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp
    ../src/dsp/InstrumentFactory.cpp
    ../include/dsp/LookupTables.cpp
)

# Add include directories for Aether Giant Percussion tests
target_include_directories(AetherGiantPercussionTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/include
)

# Link JUCE libraries for Aether Giant Percussion tests
target_link_libraries(AetherGiantPercussionTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Aether Giant Drums Advanced Test Executable (Advanced membrane physics tests)
# Uses Google Test framework for internal component testing
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/dsp/AetherGiantDrumsAdvancedTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp)
add_executable(AetherGiantDrumsAdvancedTests
    dsp/AetherGiantDrumsAdvancedTests.cpp
    ../instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp
    ../src/dsp/InstrumentFactory.cpp
    ../include/dsp/LookupTables.cpp
)

# Add include directories for Aether Giant Drums Advanced tests
target_include_directories(AetherGiantDrumsAdvancedTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../instruments/giant_instruments/include
)

# Link JUCE libraries for Aether Giant Drums Advanced tests
target_link_libraries(AetherGiantDrumsAdvancedTests
    PRIVATE
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # Google Test
        GTest::gtest
        GTest::gtest_main
        # Required for testing
        pthread
)
endif()

# WebSocket Analysis Test Executable (EXCLUDED in tvOS local-only mode)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    # Check if all required files exist
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/websocket/AnalysisWebSocketTests.cpp AND
       EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/websocket/AnalysisWebSocketHandler.cpp AND
       EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/websocket/AnalysisWebSocketHandler.h)
        add_executable(AnalysisWebSocketTests
            websocket/AnalysisWebSocketTests.cpp
            ../src/websocket/AnalysisWebSocketHandler.cpp
            ../include/websocket/AnalysisWebSocketHandler.h
            ../include/websocket/InstrumentWebSocketAPI.h
            ../include/audio/CoreDSPAnalyzer.h
            ../include/audio/PitchDetector.h
        ../include/audio/DynamicsAnalyzer.h
        ../include/audio/SpatialAnalyzer.h
        ../include/audio/QualityDetector.h
        ../include/audio/BaseAnalyzer.h
    )
    endif()
else()
    message(STATUS "⏭️  AnalysisWebSocketTests excluded (tvOS local-only mode)")
endif()

# Link JUCE libraries for WebSocket Analysis tests
if(TARGET AnalysisWebSocketTests)
target_link_libraries(AnalysisWebSocketTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        # Required for testing
        pthread
)
endif()

# Audio Device Hot-Swap Test Executable (GREEN Phase Complete)
# Exclude from tvOS local-only builds (depends on backend server components)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/AudioDeviceHotSwapTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../engine/AudioEngine.cpp)
add_executable(AudioDeviceHotSwapTest
    audio/AudioDeviceHotSwapTest.cpp
    ../engine/AudioEngine.cpp
    ../include/audio/DropoutPrevention.h
    ../include/audio/CPUMonitor.h
)
endif()

# Plugin Hosting Integration Test Executable (GREEN Phase)
# Exclude from tvOS local-only builds (depends on backend server components)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/PluginHostingIntegrationTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../engine/AudioEngine.cpp)
add_executable(PluginHostingIntegrationTest
    audio/PluginHostingIntegrationTest.cpp
    ../engine/AudioEngine.cpp
    ../include/audio/DropoutPrevention.h
    ../include/audio/CPUMonitor.h
)
endif()

# Web API Integration Test Executable (GREEN Phase)
# Exclude from tvOS local-only builds (tests server-era WebSocket/REST functionality)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/WebAPIIntegrationTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../engine/AudioEngine.cpp)
add_executable(WebAPIIntegrationTest
    audio/WebAPIIntegrationTest.cpp
    ../engine/AudioEngine.cpp
    ../include/audio/DropoutPrevention.h
    ../include/audio/CPUMonitor.h
)
endif()

# Performance Load Test Executable (GREEN Phase)
# Exclude from tvOS local-only builds (depends on backend server components)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/PerformanceLoadTest.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../engine/AudioEngine.cpp)
add_executable(PerformanceLoadTest
    audio/PerformanceLoadTest.cpp
    ../engine/AudioEngine.cpp
    ../include/audio/DropoutPrevention.h
    ../include/audio/CPUMonitor.h
)
endif()

# Performance Analysis Test Executable (WebSocket disabled for RED phase)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/performance/AnalysisPerformanceTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/performance/PerformanceValidator.cpp)
add_executable(AnalysisPerformanceTests
    performance/AnalysisPerformanceTests.cpp
    ../src/performance/PerformanceValidator.cpp
    ../include/performance/PerformanceValidator.h
    ../src/audio/CoreDSPAnalyzer.cpp
    ../include/audio/CoreDSPAnalyzer.h
    ../src/audio/PitchDetector.cpp
    ../include/audio/PitchDetector.h
    ../src/audio/DynamicsAnalyzer.cpp
    ../include/audio/DynamicsAnalyzer.h
    ../src/audio/SpatialAnalyzer.cpp
    ../include/audio/SpatialAnalyzer.h
    ../src/audio/QualityDetector.cpp
    ../include/audio/QualityDetector.h
    # ../src/websocket/AnalysisWebSocketHandler.cpp  # DISABLED for RED phase
    # ../include/websocket/AnalysisWebSocketHandler.h     # DISABLED for RED phase
    # ../include/websocket/InstrumentWebSocketAPI.h     # DISABLED for RED phase
    ../include/audio/BaseAnalyzer.h
)
endif()

# Link JUCE libraries for Audio Device Hot-Swap tests
if(TARGET AudioDeviceHotSwapTest)
target_link_libraries(AudioDeviceHotSwapTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Plugin Hosting Integration tests
if(TARGET PluginHostingIntegrationTest)
target_link_libraries(PluginHostingIntegrationTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Web API Integration tests
if(TARGET WebAPIIntegrationTest)
target_link_libraries(WebAPIIntegrationTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Performance Load tests
if(TARGET PerformanceLoadTest)
target_link_libraries(PerformanceLoadTest
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        # Required for testing
        pthread
)
endif()

# Link JUCE libraries for Performance Analysis tests (WebSocket modules disabled for RED phase)
if(TARGET AnalysisPerformanceTests)
target_link_libraries(AnalysisPerformanceTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        # Core JUCE modules
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        # juce::juce_graphics  # DISABLED for RED phase (WebSocket dependency)
        # juce::juce_gui_basics # DISABLED for RED phase (WebSocket dependency)
        # Required for testing
        pthread
)
endif()

# Set properties
set_target_properties(RealtimeAudioSafetySuccessTest PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

if(TARGET AnalysisWebSocketTests)
    set_target_properties(AnalysisWebSocketTests PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

if(TARGET CoreDSPAnalyzerTests)
set_target_properties(CoreDSPAnalyzerTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
endif()

if(TARGET PitchHarmonyTests)
set_target_properties(PitchHarmonyTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
endif()

if(TARGET DynamicsLoudnessTests)
set_target_properties(DynamicsLoudnessTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
endif()

if(TARGET SpatialAnalysisTests)
set_target_properties(SpatialAnalysisTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
endif()

if(TARGET QualityDetectionTests)
set_target_properties(QualityDetectionTests PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
endif()

if(TARGET AudioDeviceHotSwapTest)
    set_target_properties(AudioDeviceHotSwapTest PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

if(TARGET AnalysisPerformanceTests)
    set_target_properties(AnalysisPerformanceTests PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

if(TARGET PluginHostingIntegrationTest)
    set_target_properties(PluginHostingIntegrationTest PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

if(TARGET WebAPIIntegrationTest)
    set_target_properties(WebAPIIntegrationTest PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

if(TARGET PerformanceLoadTest)
    set_target_properties(PerformanceLoadTest PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED ON
    )
endif()

# Phase 2: Critical Paths Tests (Test Coverage Enhancement)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/ProjectionEngineCriticalPathsTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/ProjectionEngine.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/ProjectionEngine.h)
add_executable(ProjectionEngineCriticalPathsTests
    audio/ProjectionEngineCriticalPathsTests.cpp
    ../src/audio/ProjectionEngine.cpp
    ../src/undo/UndoState.cpp
)

target_include_directories(ProjectionEngineCriticalPathsTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

target_link_libraries(ProjectionEngineCriticalPathsTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        pthread
)
endif()

if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/AudioLayerCriticalPathsTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/AudioLayer.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/AudioLayer.h)
add_executable(AudioLayerCriticalPathsTests
    audio/AudioLayerCriticalPathsTests.cpp
    ../src/audio/AudioLayer.cpp
    ../src/audio/Scheduler.cpp
    ../src/audio/VoiceManager.cpp
)

target_include_directories(AudioLayerCriticalPathsTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

target_link_libraries(AudioLayerCriticalPathsTests
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        pthread
)
endif()

# Phase 4: Performance Benchmarks
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/performance/JUCEBackendPerformanceBenchmarks.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/ProjectionEngine.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/Scheduler.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/VoiceManager.cpp)
add_executable(JUCEBackendPerformanceBenchmarks
    performance/JUCEBackendPerformanceBenchmarks.cpp
    ../src/audio/ProjectionEngine.cpp
    ../src/audio/Scheduler.cpp
    ../src/audio/VoiceManager.cpp
    ../src/undo/UndoState.cpp
)

target_include_directories(JUCEBackendPerformanceBenchmarks
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

target_link_libraries(JUCEBackendPerformanceBenchmarks
    PRIVATE
        GTest::gtest
        GTest::gtest_main
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_dsp
        pthread
)
endif()

foreach(target_name NexSynthIntegrationTests SamSamplerIntegrationTests LocalGalIntegrationTests ExternalPluginTests AirwindowsPhase0Tests CoreDSPAnalyzerTests PitchHarmonyTests DynamicsLoudnessTests SpatialAnalysisTests QualityDetectionTests AnalysisWebSocketTests AnalysisPerformanceTests AudioDeviceHotSwapTest PluginHostingIntegrationTest WebAPIIntegrationTest PerformanceLoadTest SamSamplerDSPTest KaneMarcoTests KaneMarcoPerformanceTests KaneMarcoAetherStringTest KaneMarcoAetherTests KaneMarcoAetherPresetsTest KaneMarcoAetherPerformanceTest SF2Test AetherGiantDrumsTests AetherGiantDrumsAdvancedTests AetherGiantVoiceTests AetherGiantHornsTests AetherGiantPercussionTests ProjectionEngineTests ProjectionEngineCriticalPathsTests AudioLayerCriticalPathsTests JUCEBackendPerformanceBenchmarks)
    if(TARGET ${target_name})
        set_target_properties(${target_name} PROPERTIES
            CXX_STANDARD 20
            CXX_STANDARD_REQUIRED ON
        )
    endif()
endforeach()

# Custom targets to run tests
add_custom_target(run_success_test
    COMMAND RealtimeAudioSafetySuccessTest
    DEPENDS RealtimeAudioSafetySuccessTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running GREEN PHASE real-time audio safety success tests"
)

add_custom_target(run_nex_tests
    COMMAND NexSynthIntegrationTests
    DEPENDS NexSynthIntegrationTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running NEX FM Synthesizer Integration Tests"
)

add_custom_target(run_sam_tests
    COMMAND SamSamplerIntegrationTests
    DEPENDS SamSamplerIntegrationTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Sam Sampler Integration Tests"
)

add_custom_target(run_localgal_tests
    COMMAND LocalGalIntegrationTests
    DEPENDS LocalGalIntegrationTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running LOCAL GAL Feel-Vector Synthesizer Integration Tests"
)

add_custom_target(run_plugin_tests
    COMMAND ExternalPluginTests
    DEPENDS ExternalPluginTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running External Plugin Integration Tests"
)

add_custom_target(run_airwindows_phase0_tests
    COMMAND AirwindowsPhase0Tests
    DEPENDS AirwindowsPhase0Tests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Airwindows Phase 0 Research & Planning Tests"
)

add_custom_target(run_samsampler_dsp_tests
    COMMAND SamSamplerDSPTest
    DEPENDS SamSamplerDSPTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running SamSamplerDSP Phase 0 TDD Tests"
)

add_custom_target(run_kane_marco_tests
    COMMAND KaneMarcoTests
    DEPENDS KaneMarcoTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Kane Marco Hybrid Synth Tests (80-100 tests)"
)

add_custom_target(run_kane_marco_performance_tests
    COMMAND KaneMarcoPerformanceTests
    DEPENDS KaneMarcoPerformanceTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Kane Marco Performance Profiling Tests (Week 4)"
)

add_custom_target(run_kane_marco_aether_presets_test
    COMMAND KaneMarcoAetherPresetsTest
    DEPENDS KaneMarcoAetherPresetsTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Kane Marco Aether Presets Validation Tests (Week 4 - 20 factory presets)"
)

add_custom_target(run_kane_marco_aether_performance_test
    COMMAND KaneMarcoAetherPerformanceTest
    DEPENDS KaneMarcoAetherPerformanceTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Kane Marco Aether Performance Profiling Tests (Week 5 - Production profiling)"
)

add_custom_target(run_sf2_tests
    COMMAND SF2Test
    DEPENDS SF2Test
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running SF2 SoundFont 2 Tests (18 tests)"
)

add_custom_target(run_aether_giant_drums_tests
    COMMAND AetherGiantDrumsTests
    DEPENDS AetherGiantDrumsTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Aether Giant Drums Physical Modeling Tests (21 tests)"
)

add_custom_target(run_aether_giant_drums_advanced_tests
    COMMAND AetherGiantDrumsAdvancedTests
    DEPENDS AetherGiantDrumsAdvancedTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Aether Giant Drums Advanced Physical Modeling Tests (SVF membrane physics)"
)

add_custom_target(run_aether_giant_voice_tests
    COMMAND AetherGiantVoiceTests
    DEPENDS AetherGiantVoiceTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Aether Giant Voice Physical Modeling Tests (14 tests)"
)

add_custom_target(run_aether_giant_horns_tests
    COMMAND AetherGiantHornsTests
    DEPENDS AetherGiantHornsTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Aether Giant Horns Physical Modeling Tests"
)

add_custom_target(run_aether_giant_percussion_tests
    COMMAND AetherGiantPercussionTests
    DEPENDS AetherGiantPercussionTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Aether Giant Percussion Physical Modeling Tests"
)

add_custom_target(run_coredsp_tests
    COMMAND CoreDSPAnalyzerTests
    DEPENDS CoreDSPAnalyzerTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running CoreDSP Analyzer Tests (RED Phase)"
)

add_custom_target(run_pitch_harmony_tests
    COMMAND PitchHarmonyTests
    DEPENDS PitchHarmonyTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Pitch Harmony Detection Tests (RED Phase)"
)

add_custom_target(run_dynamics_loudness_tests
    COMMAND DynamicsLoudnessTests
    DEPENDS DynamicsLoudnessTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Dynamics and Loudness Analysis Tests (RED Phase)"
)

add_custom_target(run_spatial_analysis_tests
    COMMAND SpatialAnalysisTests
    DEPENDS SpatialAnalysisTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Spatial Analysis Tests (RED Phase)"
)

add_custom_target(run_quality_detection_tests
    COMMAND QualityDetectionTests
    DEPENDS QualityDetectionTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Quality Detection Tests (RED Phase)"
)

# Projection Engine custom target (Phase 2.4 - Core projection functionality)
if(TARGET ProjectionEngineTests)
add_custom_target(run_projection_engine_tests
    COMMAND ProjectionEngineTests
    DEPENDS ProjectionEngineTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Projection Engine Tests (Phase 2.4)"
)
endif()

# WebSocket Analysis custom target (EXCLUDED in tvOS local-only mode)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    add_custom_target(run_websocket_analysis_tests
        COMMAND AnalysisWebSocketTests
        DEPENDS AnalysisWebSocketTests
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Running WebSocket Analysis Integration Tests (RED Phase)"
    )
endif()

add_custom_target(run_performance_analysis_tests
    COMMAND AnalysisPerformanceTests
    DEPENDS AnalysisPerformanceTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Performance Analysis Validation Tests (RED Phase)"
)

add_custom_target(run_audio_device_hotswap_tests
    COMMAND AudioDeviceHotSwapTest
    DEPENDS AudioDeviceHotSwapTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running Audio Device Hot-Swap Tests (RED Phase)"
)

# Target to run all synthesizer tests
add_custom_target(run_synthesis_tests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target NexSynthIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target LocalGalIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/NexSynthIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/LocalGalIntegrationTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all synthesizer integration tests"
)

# Target to run all instrument tests (synthesizers + external plugins)
add_custom_target(run_instrument_tests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target NexSynthIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target LocalGalIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target ExternalPluginTests
    COMMAND ${CMAKE_BINARY_DIR}/NexSynthIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/LocalGalIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/ExternalPluginTests
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all instrument integration tests (synthesizers + external plugins)"
)

# Add UI test subdirectory
# Exclude from tvOS local-only builds (GUI testing not needed for embedded audio)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    add_subdirectory(ui)
endif()

# Add integration test subdirectory
add_subdirectory(integration)

# Add performance test subdirectory (Phase 4A)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/performance/CMakeLists.txt)
    add_subdirectory(performance)
    message(STATUS "✓ Phase 4A Performance Tests enabled")
endif()

# Add regression test subdirectory (Phase 4D)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/regression/CMakeLists.txt)
    add_subdirectory(regression)
    message(STATUS "✓ Phase 4D Regression Tests enabled")
endif()

# ProjectionEngine Test Executable (Phase 2.4 - Core projection functionality)
# Exclude if ProjectionEngine source doesn't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/audio/ProjectionEngineTests.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../src/audio/ProjectionEngine.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../include/audio/ProjectionEngine.h)
    add_executable(ProjectionEngineTests
        audio/ProjectionEngineTests.cpp
        ../src/audio/ProjectionEngine.cpp
        ../src/undo/UndoState.cpp
    )

    # Add include directories for ProjectionEngine tests
    target_include_directories(ProjectionEngineTests
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/../include
    )

    # Link JUCE libraries for ProjectionEngine tests
    target_link_libraries(ProjectionEngineTests
        PRIVATE
            GTest::gtest
            GTest::gtest_main
            # Core JUCE modules
            juce::juce_core
            juce::juce_data_structures
            juce::juce_events
            juce::juce_audio_basics
            juce::juce_audio_devices
            juce::juce_audio_formats
            juce::juce_audio_processors
            juce::juce_dsp
            # Required for testing
            pthread
    )
endif()

# Target to run ALL tests
add_custom_target(run_all_tests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target RealtimeAudioSafetySuccessTest
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target NexSynthIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target LocalGalIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target ExternalPluginTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target CoreDSPAnalyzerTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target PitchHarmonyTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target DynamicsLoudnessTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SpatialAnalysisTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target QualityDetectionTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AnalysisWebSocketTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AnalysisPerformanceTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AudioDeviceHotSwapTest
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerDSPTest
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target UITestSuite
    COMMAND ${CMAKE_BINARY_DIR}/RealtimeAudioSafetySuccessTest
    COMMAND ${CMAKE_BINARY_DIR}/NexSynthIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/LocalGalIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/ExternalPluginTests
    COMMAND ${CMAKE_BINARY_DIR}/CoreDSPAnalyzerTests
    COMMAND ${CMAKE_BINARY_DIR}/PitchHarmonyTests
    COMMAND ${CMAKE_BINARY_DIR}/DynamicsLoudnessTests
    COMMAND ${CMAKE_BINARY_DIR}/SpatialAnalysisTests
    COMMAND ${CMAKE_BINARY_DIR}/QualityDetectionTests
    COMMAND ${CMAKE_BINARY_DIR}/AnalysisWebSocketTests
    COMMAND ${CMAKE_BINARY_DIR}/AnalysisPerformanceTests
    COMMAND ${CMAKE_BINARY_DIR}/AudioDeviceHotSwapTest
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerDSPTest
    COMMAND ui/UITestSuite
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running ALL test suites"
)

# Target to run core tests only (excluding UI tests)
add_custom_target(run_core_tests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target RealtimeAudioSafetySuccessTest
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target NexSynthIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target LocalGalIntegrationTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target ExternalPluginTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AirwindowsPhase0Tests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target CoreDSPAnalyzerTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target PitchHarmonyTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target DynamicsLoudnessTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SpatialAnalysisTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target QualityDetectionTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AnalysisWebSocketTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AnalysisPerformanceTests
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target AudioDeviceHotSwapTest
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target SamSamplerDSPTest
    COMMAND ${CMAKE_BINARY_DIR}/RealtimeAudioSafetySuccessTest
    COMMAND ${CMAKE_BINARY_DIR}/NexSynthIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/LocalGalIntegrationTests
    COMMAND ${CMAKE_BINARY_DIR}/ExternalPluginTests
    COMMAND ${CMAKE_BINARY_DIR}/AirwindowsPhase0Tests
    COMMAND ${CMAKE_BINARY_DIR}/CoreDSPAnalyzerTests
    COMMAND ${CMAKE_BINARY_DIR}/PitchHarmonyTests
    COMMAND ${CMAKE_BINARY_DIR}/DynamicsLoudnessTests
    COMMAND ${CMAKE_BINARY_DIR}/SpatialAnalysisTests
    COMMAND ${CMAKE_BINARY_DIR}/QualityDetectionTests
    COMMAND ${CMAKE_BINARY_DIR}/AnalysisWebSocketTests
    COMMAND ${CMAKE_BINARY_DIR}/AnalysisPerformanceTests
    COMMAND ${CMAKE_BINARY_DIR}/AudioDeviceHotSwapTest
    COMMAND ${CMAKE_BINARY_DIR}/SamSamplerDSPTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running core test suites (excluding UI tests)"
)