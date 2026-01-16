cmake_minimum_required(VERSION 3.26)

# Phase 4C: Golden Testing CMake Configuration
# Tests for deterministic audio output and regression detection

# Find Google Test
find_package(GTest REQUIRED)

# Find sndfile for WAV file I/O
find_package(PkgConfig)
if(PkgConfig_FOUND)
    pkg_check_modules(SNDFILE REQUIRED sndfile)
endif()

# Include Pure DSP headers
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include/dsp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/include/dsp
    ${SNDFILE_INCLUDE_DIRS}
)

# Pure DSP source files (all 7 instruments)
set(PURE_DSP_SOURCES
    # NexSynth
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp

    # SamSampler
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp

    # LocalGal
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp

    # KaneMarco
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp

    # DrumMachine
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp
)

# =============================================================================
# Test Executables
# =============================================================================

# Golden Test - Determinism validation
add_executable(GoldenTest
    GoldenTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(GoldenTest PRIVATE GTest::gtest GTest::gtest_main ${SNDFILE_LIBRARIES} pthread m)

# Generate Golden References Tool
add_executable(GenerateGoldenReferences
    GenerateGoldenReferences.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(GenerateGoldenReferences PRIVATE ${SNDFILE_LIBRARIES} pthread m)

# LocalGal Improvements Test - TPT SVF and Bandlimited Sawtooth
add_executable(TestLocalGalImprovements
    TestLocalGalImprovements.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(TestLocalGalImprovements PRIVATE ${SNDFILE_LIBRARIES} pthread m)

# Parameter Golden Test - Knob feel and response curves
add_executable(ParameterGoldenTest
    ParameterGoldenTest.cpp
    ${PURE_DSP_SOURCES}
)
target_link_libraries(ParameterGoldenTest PRIVATE GTest::gtest GTest::gtest_main ${SNDFILE_LIBRARIES} pthread m)

# =============================================================================
# Custom Targets
# =============================================================================

# Generate all golden reference files
add_custom_target(generate_references
    COMMAND GenerateGoldenReferences
    DEPENDS GenerateGoldenReferences
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Generating golden reference WAV files for all instruments..."
)

# Run golden tests
add_custom_target(run_golden_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure -L "golden"
    DEPENDS GoldenTest
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running all Phase 4C golden tests..."
)

# =============================================================================
# Custom Test Commands
# =============================================================================

add_test(NAME GoldenTest_Determinism COMMAND GoldenTest)
set_tests_properties(GoldenTest_Determinism PROPERTIES
    TIMEOUT 300
    LABELS "golden;determinism"
)

# Parameter Golden Tests
add_test(NAME ParameterGoldenTest_KnobFeel COMMAND ParameterGoldenTest)
set_tests_properties(ParameterGoldenTest_KnobFeel PROPERTIES
    TIMEOUT 300
    LABELS "golden;parameter;knob_feel"
)

add_test(NAME ParameterGoldenTest_ResponseCurves COMMAND ParameterGoldenTest --gtest_filter=*ResponseCurve*)
set_tests_properties(ParameterGoldenTest_ResponseCurves PROPERTIES
    TIMEOUT 300
    LABELS "golden;parameter;response_curves"
)

add_test(NAME ParameterGoldenTest_GenerateReferences COMMAND ParameterGoldenTest --gtest_filter=*GenerateGoldenReferences*)
set_tests_properties(ParameterGoldenTest_GenerateReferences PROPERTIES
    TIMEOUT 600
    LABELS "golden;parameter;generate"
)

# =============================================================================
# Reference File Generation
# =============================================================================

# Define reference file paths
set(REF_DIR ${CMAKE_CURRENT_SOURCE_DIR}/reference)
set(REF_FILES
    ${REF_DIR}/NexSynth_C4_127.wav
    ${REF_DIR}/NexSynth_C4_064.wav
    ${REF_DIR}/SamSampler_C4_127.wav
    ${REF_DIR}/SamSampler_C4_064.wav
    ${REF_DIR}/LocalGal_C4_127.wav
    ${REF_DIR}/LocalGal_C4_064.wav
    ${REF_DIR}/KaneMarco_C4_127.wav
    ${REF_DIR}/KaneMarco_C4_064.wav
    ${REF_DIR}/KaneMarcoAether_C4_127.wav
    ${REF_DIR}/KaneMarcoAether_C4_064.wav
    ${REF_DIR}/KaneMarcoAetherString_C4_127.wav
    ${REF_DIR}/KaneMarcoAetherString_C4_064.wav
)

# Create custom target to verify all references exist
add_custom_target(verify_references
    COMMAND ${CMAKE_COMMAND} -E touch ${REF_FILES}
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMENT "Verifying golden reference files exist..."
)
