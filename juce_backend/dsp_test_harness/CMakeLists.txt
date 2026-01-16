cmake_minimum_required(VERSION 3.16)
project(DspTestHarness VERSION 1.0.0 LANGUAGES CXX)

# C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Output directories
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/../include  # For InstrumentDSP.h
    ${CMAKE_SOURCE_DIR}/../instruments/Sam_sampler/include
    ${CMAKE_SOURCE_DIR}/../instruments/drummachine/include
    ${CMAKE_SOURCE_DIR}/../instruments/localgal/include
    ${CMAKE_SOURCE_DIR}/../effects/biphase/include  # BiPhase effect DSP
    ${CMAKE_SOURCE_DIR}/../effects/filtergate/include  # FilterGate effect DSP
    ${CMAKE_SOURCE_DIR}/../effects/pedals/include  # Guitar pedals
    # Add other instruments/effects as needed
)

#==============================================================================
# DspOfflineHost Library
#==============================================================================

add_library(dsp_offline_host STATIC
    src/DspOfflineHost.cpp
)

target_include_directories(dsp_offline_host PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)

#==============================================================================
# Test Host Binary
#==============================================================================

add_executable(dsp_test_host
    src/dsp_test_host.cpp
    # Instrument sources
    ../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
    ../instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp
    ../instruments/localgal/src/dsp/LocalGalPureDSP.cpp
    # Effect sources
    # ../effects/biphase/src/dsp/BiPhasePureDSP.cpp  # TEMPORARILY DISABLED
    ../effects/filtergate/src/dsp/FilterGatePureDSP.cpp
    # Shared DSP utilities
    ../include/dsp/LookupTables.cpp
)

target_link_libraries(dsp_test_host
    dsp_offline_host
)

# Platform-specific libraries
if(APPLE)
    target_link_libraries(dsp_test_host
        "-framework Accelerate"
    )
elseif(UNIX)
    target_link_libraries(dsp_test_host
        m
        pthread
    )
endif()

#==============================================================================
# Python Scripts
#==============================================================================

# Install Python scripts
install(FILES
    scripts/run_dsp_tests.py
    scripts/inspect_audio.py
    DESTINATION bin
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE
)

#==============================================================================
# Testing
#==============================================================================

enable_testing()

# Add tests for each instrument
add_test(NAME SamSampler_Silence
    COMMAND dsp_test_host --instrument SamSampler --test silence
)

add_test(NAME SamSampler_Impulse
    COMMAND dsp_test_host --instrument SamSampler --test impulse
)

add_test(NAME SamSampler_Tone220
    COMMAND dsp_test_host --instrument SamSampler --test tone_220hz
)

add_test(NAME DrumMachine_Silence
    COMMAND dsp_test_host --instrument DrumMachine --test silence
)

add_test(NAME DrumMachine_Impulse
    COMMAND dsp_test_host --instrument DrumMachine --test impulse
)

add_test(NAME DrumMachine_Tone220
    COMMAND dsp_test_host --instrument DrumMachine --test tone_220hz
)

#==============================================================================
# Add tests for each effect
#==============================================================================

add_test(NAME BiPhase_Silence
    COMMAND dsp_test_host --effect BiPhase --test silence)

add_test(NAME BiPhase_Impulse
    COMMAND dsp_test_host --effect BiPhase --test impulse)

add_test(NAME BiPhase_Tone220
    COMMAND dsp_test_host --effect BiPhase --test tone_220hz)

add_test(NAME FilterGate_Silence
    COMMAND dsp_test_host --effect FilterGate --test silence)

add_test(NAME FilterGate_Impulse
    COMMAND dsp_test_host --effect FilterGate --test impulse)

add_test(NAME FilterGate_Tone220
    COMMAND dsp_test_host --effect FilterGate --test tone_220hz)

add_test(NAME FilterGate_Tone440
    COMMAND dsp_test_host --effect FilterGate --test tone_440hz)

#==============================================================================
# Pedal Test Host Binary
#==============================================================================

add_executable(pedal_test_host
    src/pedal_test_host.cpp
    # Pedal sources
    ../effects/pedals/src/dsp/GuitarPedalPureDSP.cpp
    ../effects/pedals/src/dsp/NoiseGatePedalPureDSP.cpp
    ../effects/pedals/src/dsp/CompressorPedalPureDSP.cpp
    ../effects/pedals/src/dsp/EQPedalPureDSP.cpp
    ../effects/pedals/src/dsp/ReverbPedalPureDSP.cpp
    ../effects/pedals/src/dsp/VolumePedalPureDSP.cpp
    ../effects/pedals/src/dsp/BiPhasePedalPureDSP.cpp
    ../effects/pedals/src/dsp/OverdrivePedalPureDSP.cpp
    ../effects/pedals/src/dsp/FuzzPedalPureDSP.cpp
    ../effects/pedals/src/dsp/ChorusPedalPureDSP.cpp
    ../effects/pedals/src/dsp/DelayPedalPureDSP.cpp
    # BiPhase effect (for wrapped pedal)
    ../effects/biPhase/src/dsp/BiPhasePureDSP.cpp
    # Shared DSP utilities
    ../include/dsp/LookupTables.cpp
)

target_link_libraries(pedal_test_host
    dsp_offline_host
)

# Platform-specific libraries
if(APPLE)
    target_link_libraries(pedal_test_host
        "-framework Accelerate"
    )
elseif(UNIX)
    target_link_libraries(pedal_test_host
        m
        pthread
    )
endif()

#==============================================================================
# Add tests for each pedal
#==============================================================================

# New pedals
add_test(NAME NoiseGate_Silence
    COMMAND pedal_test_host --pedal NoiseGate --test silence)

add_test(NAME NoiseGate_Impulse
    COMMAND pedal_test_host --pedal NoiseGate --test impulse)

add_test(NAME NoiseGate_Tone220
    COMMAND pedal_test_host --pedal NoiseGate --test tone_220hz)

add_test(NAME Compressor_Silence
    COMMAND pedal_test_host --pedal Compressor --test silence)

add_test(NAME Compressor_Impulse
    COMMAND pedal_test_host --pedal Compressor --test impulse)

add_test(NAME Compressor_Tone220
    COMMAND pedal_test_host --pedal Compressor --test tone_220hz)

add_test(NAME EQ_Silence
    COMMAND pedal_test_host --pedal EQ --test silence)

add_test(NAME EQ_Impulse
    COMMAND pedal_test_host --pedal EQ --test impulse)

add_test(NAME EQ_Tone220
    COMMAND pedal_test_host --pedal EQ --test tone_220hz)

add_test(NAME Reverb_Silence
    COMMAND pedal_test_host --pedal Reverb --test silence)

add_test(NAME Reverb_Impulse
    COMMAND pedal_test_host --pedal Reverb --test impulse)

add_test(NAME Reverb_Tone220
    COMMAND pedal_test_host --pedal Reverb --test tone_220hz)

add_test(NAME Volume_Silence
    COMMAND pedal_test_host --pedal Volume --test silence)

add_test(NAME Volume_Impulse
    COMMAND pedal_test_host --pedal Volume --test impulse)

add_test(NAME Volume_Tone220
    COMMAND pedal_test_host --pedal Volume --test tone_220hz)

add_test(NAME BiPhasePedal_Silence
    COMMAND pedal_test_host --pedal BiPhase --test silence)

add_test(NAME BiPhasePedal_Impulse
    COMMAND pedal_test_host --pedal BiPhase --test impulse)

add_test(NAME BiPhasePedal_Tone220
    COMMAND pedal_test_host --pedal BiPhase --test tone_220hz)

# Enhanced pedals (already completed)
add_test(NAME Overdrive_Silence
    COMMAND pedal_test_host --pedal Overdrive --test silence)

add_test(NAME Overdrive_Impulse
    COMMAND pedal_test_host --pedal Overdrive --test impulse)

add_test(NAME Overdrive_Tone220
    COMMAND pedal_test_host --pedal Overdrive --test tone_220hz)

add_test(NAME Fuzz_Silence
    COMMAND pedal_test_host --pedal Fuzz --test silence)

add_test(NAME Fuzz_Impulse
    COMMAND pedal_test_host --pedal Fuzz --test impulse)

add_test(NAME Fuzz_Tone220
    COMMAND pedal_test_host --pedal Fuzz --test tone_220hz)

add_test(NAME Chorus_Silence
    COMMAND pedal_test_host --pedal Chorus --test silence)

add_test(NAME Chorus_Impulse
    COMMAND pedal_test_host --pedal Chorus --test impulse)

add_test(NAME Chorus_Tone220
    COMMAND pedal_test_host --pedal Chorus --test tone_220hz)

add_test(NAME Delay_Silence
    COMMAND pedal_test_host --pedal Delay --test silence)

add_test(NAME Delay_Impulse
    COMMAND pedal_test_host --pedal Delay --test impulse)

add_test(NAME Delay_Tone220
    COMMAND pedal_test_host --pedal Delay --test tone_220hz)

#==============================================================================
# Comprehensive Pedal Test Host Binary
#==============================================================================

add_executable(comprehensive_pedal_test_host
    src/comprehensive_pedal_test_host.cpp
    # Pedal sources
    ../effects/pedals/src/dsp/GuitarPedalPureDSP.cpp
    ../effects/pedals/src/dsp/NoiseGatePedalPureDSP.cpp
    ../effects/pedals/src/dsp/CompressorPedalPureDSP.cpp
    ../effects/pedals/src/dsp/EQPedalPureDSP.cpp
    ../effects/pedals/src/dsp/ReverbPedalPureDSP.cpp
    ../effects/pedals/src/dsp/VolumePedalPureDSP.cpp
    ../effects/pedals/src/dsp/BiPhasePedalPureDSP.cpp
    ../effects/pedals/src/dsp/OverdrivePedalPureDSP.cpp
    ../effects/pedals/src/dsp/FuzzPedalPureDSP.cpp
    ../effects/pedals/src/dsp/ChorusPedalPureDSP.cpp
    ../effects/pedals/src/dsp/DelayPedalPureDSP.cpp
    # BiPhase effect (for wrapped pedal)
    ../effects/biPhase/src/dsp/BiPhasePureDSP.cpp
    # Shared DSP utilities
    ../include/dsp/LookupTables.cpp
)

target_link_libraries(comprehensive_pedal_test_host
    dsp_offline_host
)

# Platform-specific libraries
if(APPLE)
    target_link_libraries(comprehensive_pedal_test_host
        "-framework Accelerate"
    )
elseif(UNIX)
    target_link_libraries(comprehensive_pedal_test_host
        m
        pthread
    )
endif()

#==============================================================================
# Installation
#==============================================================================

install(TARGETS dsp_test_host pedal_test_host comprehensive_pedal_test_host
    RUNTIME DESTINATION bin
)

install(TARGETS dsp_offline_host
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(DIRECTORY include/
    DESTINATION include
)

#==============================================================================
# Documentation
#==============================================================================

# Print summary
message(STATUS "")
message(STATUS "DSP Test Harness Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "")
message(STATUS "Build targets:")
message(STATUS "  dsp_offline_host  - Static library")
message(STATUS "  dsp_test_host     - Instrument/Effect test executable")
message(STATUS "  pedal_test_host   - Guitar pedal test executable")
message(STATUS "")
message(STATUS "Supported DSP modules:")
message(STATUS "  Instruments: SamSampler, DrumMachine, LocalGal")
message(STATUS "  Effects:    BiPhase, FilterGate")
message(STATUS "  Pedals:     NoiseGate, Compressor, EQ, Reverb, Volume, BiPhase, Overdrive, Fuzz, Chorus, Delay")
message(STATUS "")
message(STATUS "Usage:")
message(STATUS "  ./bin/dsp_test_host --instrument <name> --test <type> --output <path>")
message(STATUS "  ./bin/pedal_test_host --pedal <name> --test <type> --output <path>")
message(STATUS "  python scripts/run_dsp_tests.py --bin ./bin/dsp_test_host --instrument <name>")
message(STATUS "")
