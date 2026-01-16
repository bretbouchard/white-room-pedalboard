# White Room Pedalboard Plugin
# CMake Build Configuration

cmake_minimum_required(VERSION 3.15)
project(WhiteRoomPedalboard VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Get JUCE path from parent
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../external/JUCE)

# Pedalboard sources
set(PEDALBOARD_SOURCES
    src/PedalboardProcessor.cpp
    PedalboardEditor.cpp
)

# Include all individual pedal DSP from parent directory
set(PEDAL_DSP_SOURCES
    ../pedals/src/dsp/GuitarPedalPureDSP.cpp
    ../pedals/src/dsp/VolumePedalPureDSP.cpp
    ../pedals/src/dsp/FuzzPedalPureDSP.cpp
    ../pedals/src/dsp/OverdrivePedalPureDSP.cpp
    ../pedals/src/dsp/CompressorPedalPureDSP.cpp
    ../pedals/src/dsp/EQPedalPureDSP.cpp
    ../pedals/src/dsp/NoiseGatePedalPureDSP.cpp
    ../pedals/src/dsp/ChorusPedalPureDSP.cpp
    ../pedals/src/dsp/DelayPedalPureDSP.cpp
    ../pedals/src/dsp/ReverbPedalPureDSP.cpp
    ../pedals/src/dsp/BiPhasePedalPureDSP.cpp
)

# Include directories
set(PEDALBOARD_INCLUDE_DIRS
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../pedals/include
    ${JUCE_PATH}/modules
    /opt/homebrew/Cellar/nlohmann-json/3.12.0/include
)

# JUCE modules needed
set(JUCE_MODULE_SOURCES
    ${JUCE_PATH}/modules/juce_core/juce_core.cpp
    ${JUCE_PATH}/modules/juce_core/juce_core_CompilationTime.cpp
    ${JUCE_PATH}/modules/juce_data_structures/juce_data_structures.cpp
    ${JUCE_PATH}/modules/juce_events/juce_events.cpp
    ${JUCE_PATH}/modules/juce_audio_basics/juce_audio_basics.cpp
    ${JUCE_PATH}/modules/juce_audio_devices/juce_audio_devices.cpp
    ${JUCE_PATH}/modules/juce_audio_processors/juce_audio_processors.cpp
    ${JUCE_PATH}/modules/juce_audio_processors/format_types/juce_LegacyAudioParameter.cpp
    ${JUCE_PATH}/modules/juce_audio_formats/juce_audio_formats.cpp
    ${JUCE_PATH}/modules/juce_gui_basics/juce_gui_basics.cpp
    ${JUCE_PATH}/modules/juce_gui_extra/juce_gui_extra.cpp
    ${JUCE_PATH}/modules/juce_dsp/juce_dsp.cpp
)

# =============================================================================
# Standalone Application (Simplest Build)
# =============================================================================
# NOTE: This is only built when BUILD_PLUGIN is OFF
# When BUILD_PLUGIN is ON, the plugin CMakeLists creates proper plugin targets
# =============================================================================

if(NOT BUILD_PLUGIN)
    add_executable(WhiteRoomPedalboard_Standalone
        ${PEDALBOARD_SOURCES}
        ${PEDAL_DSP_SOURCES}
        ${JUCE_MODULE_SOURCES}
    )

    target_include_directories(WhiteRoomPedalboard_Standalone
        PRIVATE
            ${PEDALBOARD_INCLUDE_DIRS}
            ${CMAKE_CURRENT_BINARY_DIR}/WhiteRoomPedalboard_Standalone_artefacts
    )

    target_compile_definitions(WhiteRoomPedalboard_Standalone
        PRIVATE
            JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
            JUCE_WEB_BROWSER=1
            JUCE_USE_CURL=0
            JUCE_VST3_CAN_REPLACE_VST2=0
            JUCE_DISPLAY_SPLASH_SCREEN=0
            DEBUG=1
            JUCE_MODULE_AVAILABLE_juce_core=1
            JUCE_MODULE_AVAILABLE_juce_data_structures=1
            JUCE_MODULE_AVAILABLE_juce_events=1
            JUCE_MODULE_AVAILABLE_juce_audio_basics=1
            JUCE_MODULE_AVAILABLE_juce_audio_devices=1
            JUCE_MODULE_AVAILABLE_juce_audio_processors=1
            JUCE_MODULE_AVAILABLE_juce_audio_formats=1
            JUCE_MODULE_AVAILABLE_juce_gui_basics=1
            JUCE_MODULE_AVAILABLE_juce_gui_extra=1
            JUCE_MODULE_AVAILABLE_juce_dsp=1
            JUCE_STRICT_REFCOUNTED_POINTER=1
        PUBLIC
            JUCE_WEB_BROWSER=1
            JUCE_USE_CURL=0
            JUCE_VST3_CAN_REPLACE_VST2=0
    )

    if(APPLE)
        target_link_libraries(WhiteRoomPedalboard_Standalone
            PRIVATE
                "-framework Foundation"
                "-framework AppKit"
                "-framework CoreGraphics"
                "-framework QuartzCore"
                "-framework AudioToolbox"
                "-framework CoreAudio"
                "-framework CoreMIDI"
                "-framework IOKit"
                "-framework Carbon"
                "-framework Accelerate"
                "-framework WebKit"
        )

        # Force Objective-C++ compilation
        set_source_files_properties(
            ${PEDALBOARD_SOURCES}
            ${PEDAL_DSP_SOURCES}
            ${JUCE_MODULE_SOURCES}
            PROPERTIES
            COMPILE_FLAGS "-x objective-c++"
        )

        # Set up as macOS app bundle
        set_target_properties(WhiteRoomPedalboard_Standalone PROPERTIES
            MACOSX_BUNDLE TRUE
            MACOSX_BUNDLE_GUI_IDENTIFIER com.whiteroom.audio.pedalboard
            MACOSX_BUNDLE_BUNDLE_NAME "White Room Pedalboard"
            MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
            MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
        )
    endif()

    # =============================================================================
    # Embed WebView UI
    # =============================================================================
    function(embed_webview_ui target)
        # Copy WebView UI to build directory
        add_custom_command(TARGET ${target} POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_SOURCE_DIR}/web_ui
                $<TARGET_BUNDLE_DIR:${target}>/Contents/Resources/web_ui
            COMMENT "Copying WebView UI for ${target}"
        )
    endfunction()

    embed_webview_ui(WhiteRoomPedalboard_Standalone)
endif()

#==============================================================================
# Standalone Plugin Build (when BUILD_PLUGIN is ON)
#==============================================================================
# Build standalone VST3/AU/Standalone plugin for DAW testing
option(BUILD_PLUGIN "Build VST3/AU/Standalone plugin for DAW testing" OFF)

if(BUILD_PLUGIN)
    # Use standalone plugin CMakeLists
    set(PLUGIN_CMAKE "${CMAKE_CURRENT_SOURCE_DIR}/CMakeLists_plugin.txt")
    if(EXISTS "${PLUGIN_CMAKE}")
        # Include the plugin CMakeLists
        message(STATUS "✓ Building plugin (VST3/AU/Standalone)")
        include("${PLUGIN_CMAKE}")
        return()
    else()
        message(WARNING "Plugin CMakeLists not found at ${PLUGIN_CMAKE}")
    endif()
endif()

message(STATUS "✓ White Room Pedalboard standalone configured")
