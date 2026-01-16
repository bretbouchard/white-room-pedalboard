# CMakeListsPure.txt for Pure C++ Synth Tests
# No JUCE dependencies - works on tvOS, iOS, macOS, Linux, etc.

cmake_minimum_required(VERSION 3.26)
project(PureSynthTests)

# ============================================================================
# LocalGal Pure Test
# ============================================================================
add_executable(TestLocalGalPure
    SynthTestPure.cpp
)
target_sources(TestLocalGalPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestLocalGalPure
    PRIVATE
        SYNTH_UNDER_TEST=1
        SYNTH_NAME="LocalGal"
)
target_include_directories(TestLocalGalPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/localgal/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# KaneMarco Pure Test
# ============================================================================
add_executable(TestKaneMarcoPure
    SynthTestPure.cpp
)
target_sources(TestKaneMarcoPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestKaneMarcoPure
    PRIVATE
        SYNTH_UNDER_TEST=2
        SYNTH_NAME="KaneMarco"
)
target_include_directories(TestKaneMarcoPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# KaneMarcoAether Pure Test
# ============================================================================
add_executable(TestKaneMarcoAetherPure
    SynthTestPure.cpp
)
target_sources(TestKaneMarcoAetherPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestKaneMarcoAetherPure
    PRIVATE
        SYNTH_UNDER_TEST=3
        SYNTH_NAME="KaneMarcoAether"
)
target_include_directories(TestKaneMarcoAetherPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/kane_marco/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# DrumMachine Pure Test
# ============================================================================
add_executable(TestDrumMachinePure
    SynthTestPure.cpp
)
target_sources(TestDrumMachinePure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestDrumMachinePure
    PRIVATE
        SYNTH_UNDER_TEST=4
        SYNTH_NAME="DrumMachine"
)
target_include_directories(TestDrumMachinePure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/drummachine/include
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# NexSynth Pure Test
# ============================================================================
add_executable(TestNexSynthPure
    SynthTestPure.cpp
)
target_sources(TestNexSynthPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestNexSynthPure
    PRIVATE
        SYNTH_UNDER_TEST=5
        SYNTH_NAME="NexSynth"
)
target_include_directories(TestNexSynthPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Nex_synth/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# SamSampler Pure Test
# ============================================================================
add_executable(TestSamSamplerPure
    SynthTestPure.cpp
)
target_sources(TestSamSamplerPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include/dsp/LookupTables.cpp
)
target_compile_definitions(TestSamSamplerPure
    PRIVATE
        SYNTH_UNDER_TEST=6
        SYNTH_NAME="SamSampler"
)
target_include_directories(TestSamSamplerPure
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../instruments/Sam_sampler/include/dsp
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
)

# ============================================================================
# Common Settings
# ============================================================================
foreach(target TestLocalGalPure TestKaneMarcoPure TestKaneMarcoAetherPure TestDrumMachinePure TestNexSynthPure TestSamSamplerPure)
    if(TARGET ${target})
        target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
        set_target_properties(${target} PROPERTIES
            CXX_STANDARD 20
            CXX_STANDARD_REQUIRED ON
        )
    endif()
endforeach()

# ============================================================================
# macOS/iOS/tvOS specific settings
# ============================================================================
if(APPLE)
    foreach(target TestLocalGalPure TestKaneMarcoPure TestKaneMarcoAetherPure TestDrumMachinePure TestNexSynthPure TestSamSamplerPure)
        if(TARGET ${target})
            # Link CoreAudio framework for audio (needed on Apple platforms)
            find_library(COREAUDIO_FRAMEWORK CoreAudio REQUIRED)
            find_library(AUDIOTOOLBOX_FRAMEWORK AudioToolbox REQUIRED)
            target_link_libraries(${target} PRIVATE ${COREAUDIO_FRAMEWORK} ${AUDIOTOOLBOX_FRAMEWORK})
        endif()
    endforeach()
endif()
