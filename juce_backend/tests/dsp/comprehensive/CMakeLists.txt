cmake_minimum_required(VERSION 3.16)

project(ComprehensiveFeatureTests)

# ============================================================================
# Kane Marco Comprehensive Feature Tests (120 tests)
# ============================================================================

set(KANE_MARCO_SRC ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp)
set(LOOKUP_TABLES_SRC ${CMAKE_CURRENT_SOURCE_DIR}/../../../include/dsp/LookupTables.cpp)

if(EXISTS ${KANE_MARCO_SRC})
    add_executable(KaneMarcoFeaturesTest
        KaneMarcoFeaturesTest.cpp
        ${KANE_MARCO_SRC}
        ${LOOKUP_TABLES_SRC}
    )

    target_include_directories(KaneMarcoFeaturesTest PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/kane_marco/include/dsp
    )

    target_compile_features(KaneMarcoFeaturesTest PRIVATE cxx_std_17)

    target_link_libraries(KaneMarcoFeaturesTest PRIVATE
        "-framework Accelerate"
        "-framework CoreFoundation"
        "-framework CoreMIDI"
        "-framework CoreAudio"
    )
else()
    message(STATUS "Kane Marco Pure DSP not found, skipping Kane Marco tests")
endif()

# ============================================================================
# DrumMachine Comprehensive Feature Tests (131 tests)
# ============================================================================

set(DRUMMACHINE_SRC ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp)

if(EXISTS ${DRUMMACHINE_SRC})
    add_executable(DrumMachineFeaturesTest
        DrumMachineFeaturesTest.cpp
        ${DRUMMACHINE_SRC}
        ${LOOKUP_TABLES_SRC}
    )

    target_include_directories(DrumMachineFeaturesTest PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/drummachine/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../instruments/drummachine/include/dsp
    )

    target_compile_features(DrumMachineFeaturesTest PRIVATE cxx_std_17)

    target_link_libraries(DrumMachineFeaturesTest PRIVATE
        "-framework Accelerate"
        "-framework CoreFoundation"
    )
else()
    message(STATUS "DrumMachine Pure DSP not found, skipping DrumMachine tests")
endif()

# ============================================================================
# Other Tests (skeleton implementations)
# ============================================================================

add_executable(NexSynthFeaturesTest NexSynthFeaturesTest.cpp)
target_include_directories(NexSynthFeaturesTest PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../../include)
target_compile_features(NexSynthFeaturesTest PRIVATE cxx_std_17)

add_executable(SamSamplerFeaturesTest SamSamplerFeaturesTest.cpp)
target_include_directories(SamSamplerFeaturesTest PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../../include)
target_compile_features(SamSamplerFeaturesTest PRIVATE cxx_std_17)

add_executable(LocalGalFeaturesTest LocalGalFeaturesTest.cpp)
target_include_directories(LocalGalFeaturesTest PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../../include)
target_compile_features(LocalGalFeaturesTest PRIVATE cxx_std_17)

add_executable(GiantInstrumentsFeaturesTest GiantInstrumentsFeaturesTest.cpp)
target_include_directories(GiantInstrumentsFeaturesTest PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../../include)
target_compile_features(GiantInstrumentsFeaturesTest PRIVATE cxx_std_17)

add_executable(KaneMarcoAetherFeaturesTest KaneMarcoAetherFeaturesTest.cpp)
target_include_directories(KaneMarcoAetherFeaturesTest PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../../include)
target_compile_features(KaneMarcoAetherFeaturesTest PRIVATE cxx_std_17)

# ============================================================================
# Summary
# ============================================================================

message(STATUS "")
message(STATUS "=================================================================")
message(STATUS "  Comprehensive Feature Tests")
message(STATUS "=================================================================")
message(STATUS "")
message(STATUS "  Test Suites:")
message(STATUS "    Kane Marco:       120 tests")
message(STATUS "    NexSynth:         130 tests")
message(STATUS "    DrumMachine:      131 tests")
message(STATUS "    SamSampler:        73 tests")
message(STATUS "    LocalGal:          64 tests")
message(STATUS "    Giant Instruments:  83 tests")
message(STATUS "    Kane Marco Aether:  65 tests")
message(STATUS "")
message(STATUS "  Total: 666 comprehensive feature tests")
message(STATUS "")
message(STATUS "=================================================================")
message(STATUS "")
