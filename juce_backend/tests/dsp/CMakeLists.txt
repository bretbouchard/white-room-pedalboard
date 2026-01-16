# tvOS DSP Instrument Tests
# TDD Test Suite for Pure DSP Implementations

cmake_minimum_required(VERSION 3.15)

# Set JUCE path (relative to parent directory)
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Check if JUCE exists
if(NOT EXISTS ${JUCE_PATH})
    message(FATAL_ERROR "JUCE not found at ${JUCE_PATH}")
endif()

# JUCE module includes (minimal setup for testing)
set(JUCE_INCLUDE_DIRS
    ${JUCE_PATH}/modules
    ${JUCE_PATH}/modules/juce_core
    ${JUCE_PATH}/modules/juce_audio_basics
    ${JUCE_PATH}/modules/juce_dsp
    ${JUCE_PATH}/modules/juce_audio_processors
)

message(STATUS "✓ JUCE includes configured for tests")

# Add test executable
add_executable(nex_synth_dsp_test
    NexSynthDSPTest.cpp
)

# Add include directories
target_include_directories(nex_synth_dsp_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${JUCE_INCLUDE_DIRS}
)

# Enable testing
enable_testing()
add_test(NAME NexSynthDSPTest COMMAND nex_synth_dsp_test)

# LocalGal DSP Test
add_executable(local_gal_dsp_test
    LocalGalDSPTest.cpp
)

target_link_libraries(local_gal_dsp_test
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(local_gal_dsp_test)

add_test(NAME LocalGalDSPTest COMMAND local_gal_dsp_test)

# SamSampler DSP Test
add_executable(sam_sampler_dsp_test
    SamSamplerDSPTest.cpp
)

target_link_libraries(sam_sampler_dsp_test
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(sam_sampler_dsp_test)

add_test(NAME SamSamplerDSPTest COMMAND sam_sampler_dsp_test)

# SF2 SoundFont Test
add_executable(sf2_test
    SF2Test.cpp
)

target_link_libraries(sf2_test
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(sf2_test)

add_test(NAME SF2Test COMMAND sf2_test)

# Kane Marco Aether String Test (NEW)
add_executable(kane_marco_aether_string_test
    KaneMarcoAetherStringTests.cpp
)

target_link_libraries(kane_marco_aether_string_test
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(kane_marco_aether_string_test)

add_test(NAME KaneMarcoAetherStringTest COMMAND kane_marco_aether_string_test)

# Aether String v2 Tests (NEW)
# Unit tests for "Giant Instruments" features
add_executable(aether_string_v2_tests
    AetherStringV2Tests.cpp
)

target_link_libraries(aether_string_v2_tests
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(aether_string_v2_tests)

add_test(NAME AetherStringV2Tests COMMAND aether_string_v2_tests)

# Aether String v2 Performance Benchmarks
add_executable(aether_string_v2_performance
    AetherStringV2Performance.cpp
)

target_link_libraries(aether_string_v2_performance
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(aether_string_v2_performance)

# Aether String v2 Integration & Validation Tests
add_executable(giant_instrument_validation
    GiantInstrumentValidation.cpp
)

target_link_libraries(giant_instrument_validation
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

juce_disable_warnings_by_default(giant_instrument_validation)

add_test(NAME GiantInstrumentValidation COMMAND giant_instrument_validation)

# Aether Giant Percussion Tests (NEW)
add_executable(aether_giant_percussion_tests
    AetherGiantPercussionTests.cpp
    ../../instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp
)

target_link_libraries(aether_giant_percussion_tests
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

target_include_directories(aether_giant_percussion_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/giant_instruments/include
    ${JUCE_INCLUDE_DIRS}
)

juce_disable_warnings_by_default(aether_giant_percussion_tests)

add_test(NAME AetherGiantPercussionTests COMMAND aether_giant_percussion_tests)

# Aether Giant Horns Tests (NEW)
add_executable(aether_giant_horns_tests
    AetherGiantHornsTests.cpp
)

target_link_libraries(aether_giant_horns_tests
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

target_include_directories(aether_giant_horns_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${JUCE_INCLUDE_DIRS}
)

juce_disable_warnings_by_default(aether_giant_horns_tests)

add_test(NAME AetherGiantHornsTests COMMAND aether_giant_horns_tests)

# Aether Giant Voice Tests (NEW)
add_executable(aether_giant_voice_tests
    AetherGiantVoiceTests.cpp
    ../../instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp
)

target_link_libraries(aether_giant_voice_tests
    PRIVATE
    juce::juce_recommended_config
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warnings_flags
)

target_include_directories(aether_giant_voice_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/giant_instruments/include
    ${JUCE_INCLUDE_DIRS}
)

juce_disable_warnings_by_default(aether_giant_voice_tests)

add_test(NAME AetherGiantVoiceTests COMMAND aether_giant_voice_tests)
