# White Room Pedals Plugin Suite
# CMake Build Configuration
# Supports: VST3, AU, Standalone, AAX (optional)

cmake_minimum_required(VERSION 3.15)
project(WhiteRoomPedals VERSION 1.0.0)

# Setup JUCE
find_package(JUCE REQUIRED CONFIG)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Pedal sources
set(PEDAL_DSP_SOURCES
    # Pure DSP implementations
    src/dsp/GuitarPedalPureDSP.cpp
    src/dsp/BoostPedalPureDSP.cpp
    src/dsp/FuzzPedalPureDSP.cpp
    src/dsp/OverdrivePedalPureDSP.cpp
    src/dsp/CompressorPedalPureDSP.cpp
    src/dsp/EQPedalPureDSP.cpp
    src/dsp/ChorusPedalPureDSP.cpp
    src/dsp/DelayPedalPureDSP.cpp
    src/dsp/ReverbPedalPureDSP.cpp
    src/dsp/BiPhasePedalPureDSP.cpp
    src/dsp/NoiseGatePedalPureDSP.cpp
    src/dsp/VolumePedalPureDSP.cpp
)

set(PEDAL_PROCESSOR_SOURCES
    # JUCE AudioProcessor wrappers
    src/processors/GuitarPedalProcessor.cpp
    src/processors/BoostProcessor.cpp
    src/processors/FuzzProcessor.cpp
    src/processors/OverdriveProcessor.cpp
    src/processors/CompressorProcessor.cpp
    src/processors/EQProcessor.cpp
    src/processors/ChorusProcessor.cpp
    src/processors/DelayProcessor.cpp
    src/processors/ReverbProcessor.cpp
    src/processors/BiPhaseProcessor.cpp
    src/processors/NoiseGateProcessor.cpp
    src/processors/VolumeProcessor.cpp
)

# Create shared library with all pedal DSP
add_library(WhiteRoomPedalDSP STATIC
    ${PEDAL_DSP_SOURCES}
)

target_include_directories(WhiteRoomPedalDSP
    PUBLIC
        include
        ${JUCE_INCLUDE_DIRS}
)

target_link_libraries(WhiteRoomPedalDSP
    PUBLIC
        ${JUCE_LIBRARIES}
)

# Main plugin processor (factory pattern)
add_library(WhiteRoomPedalsCore STATIC
    src/processors/WhiteRoomProcessorFactory.cpp
    src/processors/WhiteRoomProcessor.cpp
    ${PEDAL_PROCESSOR_SOURCES}
)

target_include_directories(WhiteRoomPedalsCore
    PUBLIC
        include
        ${JUCE_INCLUDE_DIRS}
)

target_link_libraries(WhiteRoomPedalsCore
    PUBLIC
        WhiteRoomPedalDSP
        ${JUCE_LIBRARIES}
)

# =============================================================================
# VST3 Plugin
# =============================================================================
juce_add_plugin(WhiteRoomPedals_VST3
    PRODUCT_NAME "WhiteRoomPedals"
    FORMATS VST3
    PLUGIN_MANUFACTURER "White Room Audio"
    PLUGIN_CODE "WHTP"
    PLUGIN_DESCRIPTION "Professional guitar effects suite"
    PLUGIN_IS_SYNTH 0
    PLUGIN_NEEDS_MIDI_INPUT 0
    PLUGIN_PRODUCES_MIDI_OUTPUT 0
    PLUGIN_EDITOR_REQUIRES_KEYBOARD 0
    PLUGIN_EDITOR_REQUIRES_MOUSE 1
)

target_link_libraries(WhiteRoomPedals_VST3
    PRIVATE
        WhiteRoomPedalsCore
)

# VST3 specific settings
if(APPLE)
    set_target_properties(WhiteRoomPedals_VST3 PROPERTIES
        BUNDLE_EXTENSION "vst3"
        MACOSX_BUNDLE_INFO_STRING "White Room Pedals VST3"
        MACOSX_BUNDLE_ICON_FILE "WhiteRoom.icns"
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
    )
endif()

# =============================================================================
# AU Plugin (macOS only)
# =============================================================================
if(APPLE)
    juce_add_plugin(WhiteRoomPedals_AU
        PRODUCT_NAME "WhiteRoomPedals"
        FORMATS AU
        PLUGIN_MANUFACTURER "White Room Audio"
        PLUGIN_CODE "WHTP"
        PLUGIN_DESCRIPTION "Professional guitar effects suite"
        PLUGIN_IS_SYNTH 0
        PLUGIN_NEEDS_MIDI_INPUT 0
        PLUGIN_PRODUCES_MIDI_OUTPUT 0
        PLUGIN_EDITOR_REQUIRES_KEYBOARD 0
        PLUGIN_EDITOR_REQUIRES_MOUSE 1
    )

    target_link_libraries(WhiteRoomPedals_AU
        PRIVATE
            WhiteRoomPedalsCore
    )

    # AU specific settings
    set_target_properties(WhiteRoomPedals_AU PROPERTIES
        BUNDLE_EXTENSION "component"
        MACOSX_BUNDLE_INFO_STRING "White Room Pedals AU"
        MACOSX_BUNDLE_ICON_FILE "WhiteRoom.icns"
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
        XCODE_ATTRIBUTE_CODE_SIGN_ENTITLEMENTS "${CMAKE_SOURCE_DIR}/entitlements.au.plist"
    )
endif()

# =============================================================================
# Standalone Application
# =============================================================================
juce_add_plugin(WhiteRoomPedals_Standalone
    PRODUCT_NAME "WhiteRoomPedals"
    FORMATS Standalone
    PLUGIN_MANUFACTURER "White Room Audio"
    PLUGIN_CODE "WHTP"
    PLUGIN_DESCRIPTION "Professional guitar effects suite"
    PLUGIN_IS_SYNTH 0
    PLUGIN_NEEDS_MIDI_INPUT 0
    PLUGIN_PRODUCES_MIDI_OUTPUT 0
    PLUGIN_EDITOR_REQUIRES_KEYBOARD 0
    PLUGIN_EDITOR_REQUIRES_MOUSE 1
)

target_link_libraries(WhiteRoomPedals_Standalone
    PRIVATE
        WhiteRoomPedalsCore
)

# Standalone specific settings
if(APPLE)
    set_target_properties(WhiteRoomPedals_Standalone PROPERTIES
        MACOSX_BUNDLE_INFO_STRING "White Room Pedals Standalone"
        MACOSX_BUNDLE_ICON_FILE "WhiteRoom.icns"
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.whiteroom.audio.pedals.standalone"
    )
endif()

# =============================================================================
# Testing
# =============================================================================
option(WHITEROOM_BUILD_TESTS "Build test suite" ON)

if(WHITEROOM_BUILD_TESTS)
    enable_testing()

    # DSP Test Harness
    add_subdirectory(../dsp_test_harness ${CMAKE_BINARY_DIR}/dsp_test_harness)

    # Add tests
    add_test(NAME DSPTestHarness COMMAND comprehensive_pedal_test_host)
endif()

# =============================================================================
# Installation
# =============================================================================
include(GNUInstallDirs)

# VST3 installation
install(TARGETS WhiteRoomPedals_VST3
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/VST3
    COMPONENT Plugin
)

# AU installation (macOS only)
if(APPLE)
    install(TARGETS WhiteRoomPedals_AU
        DESTINATION /Library/Audio/Plug-Ins/Components
        COMPONENT Plugin
    )
endif()

# Standalone installation
install(TARGETS WhiteRoomPedals_Standalone
    DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT Application
)

# Presets installation
install(DIRECTORY ${CMAKE_SOURCE_DIR}/presets/
    DESTINATION ${CMAKE_INSTALL_DATADIR}/WhiteRoomPedals/Presets
    COMPONENT Presets
)

# =============================================================================
# CPack Configuration
# =============================================================================
set(CPACK_PACKAGE_NAME "WhiteRoomPedals")
set(CPACK_PACKAGE_VENDOR "White Room Audio")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Professional guitar effects suite")
set(CPACK_PACKAGE_HOMEPAGE_URL "https://whiteroom.audio")

if(APPLE)
    set(CPACK_GENERATOR "DragNDrop")
    set(CPACK_DMG_VOLUME_NAME "WhiteRoom Pedals")
    set(CPACK_DMG_FORMAT "UDBZ")
elseif(WIN32)
    set(CPACK_GENERATOR "NSIS")
endif()

include(CPack)
