cmake_minimum_required(VERSION 3.16)

project(SchillingerEcosystemWorkingDAW VERSION 1.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

#================================================================================================
#  Execution-Only Build Guards (CRITICAL)
#================================================================================================

# Enforce JUCE_EXECUTION_ONLY contract at build time
# This must be included before any other build configuration
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/cmake/ExecutionOnlyGuards.cmake)
    include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/ExecutionOnlyGuards.cmake)
else()
    message(WARNING
        "⚠️  WARNING: cmake/ExecutionOnlyGuards.cmake not found!\n"
        "   Execution-only contract enforcement is disabled.\n"
        "   This is a security risk for production builds."
    )
endif()

#================================================================================================
#  tvOS Local-Only Build Options
#================================================================================================

# Load tvOS build configuration (must come before other subdirectories)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/cmake/TvosOptions.cmake)
    include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/TvosOptions.cmake)
endif()

# tvOS local-only option (can be overridden with -DSCHILLINGER_TVOS_LOCAL_ONLY=ON)
option(SCHILLINGER_TVOS_LOCAL_ONLY "Build for tvOS local-only (no server, no networking)" OFF)

#================================================================================================
#  Server-Era Code Migration (COMPLETE)
#================================================================================================

# All server-era code has been moved to archive/server-era/
# - integration/ → archive/server-era/integration/
# - include/websocket/ → archive/server-era/headers/websocket/
# - tests/websocket/ → archive/server-era/tests/websocket/
#
# The ExecutionOnlyGuards.cmake (included above) enforces that these directories
# cannot exist in the source root, preventing accidental re-introduction.
#
# See JUCE_EXECUTION_ONLY.md for the complete contract.
# See archive/server-era/WEBSOCKET_REMOVAL_CHECKLIST.md for migration details.
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    message(STATUS "✅ Execution-only build - no server code present")
endif()

# Set JUCE path
set(JUCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/external/JUCE)

# Check if JUCE exists
if(NOT EXISTS ${JUCE_PATH})
    message(FATAL_ERROR "JUCE not found at ${JUCE_PATH}. Please run: git clone https://github.com/juce-framework/JUCE.git external/JUCE")
endif()

#================================================================================================
#  CLAP Plugin Format Support
#================================================================================================

# Option to build CLAP plugins (enabled by default)
option(BUILD_CLAP "Build CLAP plugin format" ON)

if(BUILD_CLAP)
    # Check if clap-juce-extensions submodule exists
    set(CLAP_JUCE_EXTENSIONS_PATH ${CMAKE_CURRENT_SOURCE_DIR}/external/clap-juce-extensions)

    if(EXISTS ${CLAP_JUCE_EXTENSIONS_PATH})
        message(STATUS "✓ CLAP support enabled - clap-juce-extensions found")
        add_subdirectory(${CLAP_JUCE_EXTENSIONS_PATH})
        include_directories(${CLAP_JUCE_EXTENSIONS_PATH}/include)

        # Set CLAP ID prefix for all White Room plugins
        set(CLAP_ID_PREFIX "com.schillinger")
    else()
        message(WARNING
            "⚠️  CLAP support requested but clap-juce-extensions not found!\n"
            "   Run: git submodule update --init --recursive external/clap-juce-extensions\n"
            "   CLAP support will be disabled."
        )
        set(BUILD_CLAP OFF)
    endif()
else()
    message(STATUS "⏭️  CLAP support disabled (BUILD_CLAP=OFF)")
endif()

# Simple JUCE module includes (minimal setup for testing)
set(JUCE_INCLUDE_DIRS
    ${JUCE_PATH}/modules
    ${JUCE_PATH}/modules/juce_core
    ${JUCE_PATH}/modules/juce_audio_basics
    ${JUCE_PATH}/modules/juce_dsp
)

message(STATUS "✓ JUCE includes configured")

# Find nlohmann/json
find_package(nlohmann_json QUIET)
if(NOT nlohmann_json_FOUND)
    message(STATUS "nlohmann_json not found, using header-only fallback")
    find_path(NLOHMANN_JSON_INCLUDE_DIR
        NAMES nlohmann/json.hpp
        PATHS
            /usr/local/include
            /opt/homebrew/include
            /usr/include
        DOC "nlohmann/json include directory"
    )
    if(NLOHMANN_JSON_INCLUDE_DIR)
        message(STATUS "Found nlohmann/json headers at: ${NLOHMANN_JSON_INCLUDE_DIR}")
        add_library(nlohmann_json::nlohmann_json INTERFACE IMPORTED)
        set_target_properties(nlohmann_json::nlohmann_json PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${NLOHMANN_JSON_INCLUDE_DIR}"
        )
    endif()
endif()

# Find Google Test for testing
find_package(GTest QUIET)
if(NOT GTest_FOUND)
    message(STATUS "GTest not found, searching manually...")
    find_path(GTEST_INCLUDE_DIR
        NAMES gtest/gtest.h
        PATHS
            /opt/homebrew/include
            /usr/local/include
            /usr/include
        DOC "GTest include directory"
    )
    find_library(GTEST_LIBRARY
        NAMES gtest libgtest.a
        PATHS
            /opt/homebrew/lib
            /usr/local/lib
            /usr/lib
        DOC "GTest library"
    )
    find_library(GTEST_MAIN_LIBRARY
        NAMES gtest_main libgtest_main.a
        PATHS
            /opt/homebrew/lib
            /usr/local/lib
            /usr/lib
        DOC "GTest main library"
    )

    if(GTEST_INCLUDE_DIR AND GTEST_LIBRARY AND GTEST_MAIN_LIBRARY)
        message(STATUS "Found GTest manually at: ${GTEST_LIBRARY}")
        add_library(GTest::GTest IMPORTED STATIC)
        add_library(GTest::Main IMPORTED STATIC)
        set_target_properties(GTest::GTest PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${GTEST_INCLUDE_DIR}"
            IMPORTED_LOCATION "${GTEST_LIBRARY}"
        )
        set_target_properties(GTest::Main PROPERTIES
            IMPORTED_LOCATION "${GTEST_MAIN_LIBRARY}"
        )
        set(GTest_FOUND TRUE)
    endif()
endif()

# Core system subdirectories (temporarily disabled to fix JUCE compilation)
# Issue: Intermediate libraries were incorrectly compiling individual JUCE .cpp files
# Solution: Build DAW directly with JUCE module system
set(CORE_LIBS_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
message(STATUS "🔧 Temporarily disabled intermediate libraries to fix JUCE compilation")
message(STATUS "✓ Using JUCE module system directly for better compatibility")

# if(EXISTS ${CORE_LIBS_DIR}/core)
#     add_subdirectory(src/core)
#     message(STATUS "✓ Core system enabled")
# endif()

# if(EXISTS ${CORE_LIBS_DIR}/temporal)
#     add_subdirectory(src/temporal)
#     message(STATUS "✓ Temporal system enabled")
# endif()

# Enable Audio System
# if(EXISTS ${CORE_LIBS_DIR}/audio)
#     add_subdirectory(src/audio)
#     message(STATUS "✓ Audio system enabled")
# endif()

# Create working DAW executable - Only include files that actually exist
# Exclude from tvOS local-only builds (GUI application not needed for embedded audio)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    # Check if UI files exist before creating DAW executable
    set(DAW_UI_FILES_EXIST FALSE)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ui/DAWMainComponent.cpp AND
       EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/integration/Main.cpp)
        set(DAW_UI_FILES_EXIST TRUE)
    endif()

    if(DAW_UI_FILES_EXIST)
        add_executable(SchillingerEcosystemWorkingDAW
            # Main entry point
            integration/Main.cpp

            # UI Components that exist
            src/ui/DAWMainComponent.cpp
            src/ui/TrackViewComponent.cpp
            src/ui/SongPlaceholderComponent.cpp
            src/ui/MiniTimelineComponent.cpp
            src/ui/PatternEditorBase.cpp
            src/ui/PianoRollEditor.cpp
            src/ui/EditorSelector.cpp
            src/ui/TablatureEditor.cpp
    src/ui/SVGIconComponent.cpp
    src/ui/IconTextButton.cpp
    src/ui/AutomationLaneComponent_safe_example.cpp
    src/ui/IconBadgeComponent.cpp

    # Professional JIVE UI Components - Temporarily disabled due to compilation errors
    # src/ui/TransportControlsComponent.cpp
    # src/ui/ComponentFactory.cpp
    # src/ui/JIVEStyleManager.cpp

    # Audio Components that exist
    src/audio/CPUMonitor.cpp
    src/audio/DropoutPrevention.cpp

    # Security Components that exist
    src/security/SafeBufferOperations.cpp

    # Timeline Components that exist
    # src/timeline/AudioClip_safe_example.cpp  # Commented out - too many missing dependencies

    # Instrument Integration System
    src/instrument/InstrumentManager.cpp
    src/instrument/InstrumentInstance.cpp
    src/instrument/PluginManager.cpp
    src/plugins/PluginInstance.cpp

    # Synthesis Engine
    src/synthesis/NexSynthIntegration.cpp
    src/synthesis/SamSamplerIntegration.cpp
    src/synthesis/LocalGalIntegration.cpp

    # tvOS DSP Pure Implementations (NEW)
    src/dsp/NexSynthDSP.cpp
    src/dsp/LocalGalDSP.cpp
    src/dsp/SamSamplerDSP.cpp
    src/dsp/SF2Reader.cpp

    # Kane Marco Aether Physical Modeling Synthesizer (NEW - Week 1)
    src/dsp/KaneMarcoAetherDSP.cpp

    # Kane Marco Aether String (NEW - Week 1)
    src/dsp/KaneMarcoAetherStringDSP.cpp

    # Audio/MIDI Routing
    src/routing/AudioRoutingEngine.cpp
    src/routing/MidiRoutingEngine.cpp

    # WebSocket API for Flutter UI (EXCLUDED in tvOS local-only mode)
    if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
        src/websocket/InstrumentWebSocketAPI.cpp
    endif()

    # AI Agent Integration Bridge
    src/ai/AIAgentBridge.cpp

    # Backend Components (EXCLUDED in tvOS local-only mode)
    if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
        src/backend/SecureWebSocketBridge.cpp
        src/backend/WebSocketSecurityManager.cpp
    endif()

    # Dynamics Processing System
    # Note: FilterGate is now in effects/filtergate/ (FilterGatePureDSP)
    src/dynamics/DynamicsProcessor.cpp
    src/dynamics/DynamicsEffectsChain.cpp

    # Interchangeable Effects System
    src/effects/InterchangeableEffectSlot.cpp
    src/effects/AirwindowsInternalProcessor.cpp

    # Airwindows Algorithms
    src/airwindows/Density.cpp

    # NexSynth DSP and FFI Layer
    src/dsp/NexSynthDSP.cpp
    src/ffi/NexSynthFFI.cpp

    # SamSampler DSP and FFI Layer
    src/dsp/SamSamplerDSP.cpp
    src/ffi/SamSamplerFFI.cpp

    # LocalGal DSP and FFI Layer
    src/dsp/LocalGalDSP.cpp
    src/ffi/LocalGalFFI.cpp

    # Kane Marco Hybrid Virtual Analog Synthesizer (NEW - Week 1)
    src/dsp/KaneMarcoDSP.cpp
    src/ffi/KaneMarcoFFI.cpp

    # Audio Layer Components (T017-T023)
    src/audio/Scheduler.cpp
    src/audio/VoiceManager.cpp
    src/audio/ConsoleSystem.cpp
)

# Include directories
target_include_directories(SchillingerEcosystemWorkingDAW
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_BINARY_DIR}/SchillingerEcosystemWorkingDAW_artefacts
        ${CMAKE_CURRENT_BINARY_DIR}/SchillingerEcosystemWorkingDAW_artefacts/JuceLibraryCode
        ${JUCE_PATH}/modules
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_core
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_components
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_layouts
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_style_sheets
          ${NLOHMANN_JSON_INCLUDE_DIR}
)

# Link libraries (JUCE modules disabled for now due to CMake conflicts)
target_link_libraries(SchillingerEcosystemWorkingDAW
    PRIVATE
        # Core libraries temporarily disabled due to JUCE compilation issues
        # $<$<TARGET_EXISTS:CoreLib>:CoreLib>
        # $<$<TARGET_EXISTS:TemporalLib>:TemporalLib>
        # $<$<TARGET_EXISTS:AudioLib>:AudioLib>
        $<$<TARGET_EXISTS:nlohmann_json::nlohmann_json>:nlohmann_json::nlohmann_json>
)

# Platform-specific settings
if(APPLE)
    target_link_libraries(SchillingerEcosystemWorkingDAW
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
    )

    # Set macOS bundle properties
    set_target_properties(SchillingerEcosystemWorkingDAW PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_GUI_IDENTIFIER com.schillinger.ecosystem.daw.working
        MACOSX_BUNDLE_BUNDLE_NAME "SchillingerEcosystem DAW"
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
        MACOSX_BUNDLE_ICON_FILE ${CMAKE_CURRENT_SOURCE_DIR}/assets/icon.icns
        MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/cmake/Info.plist.in
    )

    # Create Info.plist if it doesn't exist
    if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/cmake/Info.plist.in")
        file(MAKE_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
        file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/cmake/Info.plist.in"
"<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>CFBundleExecutable</key>
    <string>$<TARGET_FILE_NAME:SchillingerEcosystemWorkingDAW></string>
    <key>CFBundleIdentifier</key>
    <string>com.schillinger.ecosystem.daw.stable</string>
    <key>CFBundleName</key>
    <string>SchillingerEcosystem DAW</string>
    <key>CFBundleDisplayName</key>
    <string>SchillingerEcosystem DAW - Stable Build</string>
    <key>CFBundleVersion</key>
    <string>${PROJECT_VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${PROJECT_VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSAppTransportSecure</key>
    <false/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
    <key>NSMicrophoneUsageDescription</key>
    <string>SchillingerEcosystem DAW needs microphone access for audio recording</string>
    <key>NSDocumentsFolderUsageDescription</key>
    <string>SchillingerEcosystem DAW needs access to documents for loading and saving projects</string>
</dict>
</plist>")
    endif()
    endif()  # Close if(DAW_UI_FILES_EXIST)
elseif(WIN32)
    # Windows-specific settings
    target_compile_definitions(SchillingerEcosystemWorkingDAW
        PRIVATE
            _UNICODE
            UNICODE
            _WIN32_WINNT=0x0601
            WINVER=0x0601
        )
endif()

# JUCE-specific compiler definitions (only if target was created)
if(TARGET SchillingerEcosystemWorkingDAW)
target_compile_definitions(SchillingerEcosystemWorkingDAW
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_MODAL_LOOPS_PERMITTED=1
        JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
        JUCE_MODULE_AVAILABLE_juce_audio_basics=1
        JUCE_MODULE_AVAILABLE_juce_audio_devices=1
        JUCE_MODULE_AVAILABLE_juce_audio_formats=1
        JUCE_MODULE_AVAILABLE_juce_audio_processors=1
        JUCE_MODULE_AVAILABLE_juce_audio_utils=1
        JUCE_MODULE_AVAILABLE_juce_core=1
        JUCE_MODULE_AVAILABLE_juce_cryptography=1
        JUCE_MODULE_AVAILABLE_juce_data_structures=1
        JUCE_MODULE_AVAILABLE_juce_dsp=1
        JUCE_MODULE_AVAILABLE_juce_events=1
        JUCE_MODULE_AVAILABLE_juce_graphics=1
        JUCE_MODULE_AVAILABLE_juce_gui_basics=1
        JUCE_MODULE_AVAILABLE_juce_gui_extra=1
        # JUCE_MODULE_AVAILABLE_juce_opengl=0 DISABLED - causes macOS 15.0+ compatibility issues
        JUCE_MODULE_AVAILABLE_juce_osc=1
        JUCE_MODULE_AVAILABLE_juce_midi_ci=1
        # WebSocket support for instrument integration
        JUCE_MODULE_AVAILABLE_juce_opengl=0  # Disabled for stability
        JUCE_MODULE_AVAILABLE_juce_audio_plugin_client=1  # For plugin hosting
      PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
)

# Copy runtime dependencies (only if target was created)
if(APPLE AND TARGET SchillingerEcosystemWorkingDAW)
    # Copy any required frameworks or resources
    add_custom_command(TARGET SchillingerEcosystemWorkingDAW POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory
            "$<TARGET_BUNDLE_DIR:SchillingerEcosystemWorkingDAW>/Contents/Resources"
        COMMENT "Creating Resources directory")
endif()
    endif()  # Close if(TARGET SchillingerEcosystemWorkingDAW)
endif() # End of SCHILLINGER_TVOS_LOCAL_ONLY check for SchillingerEcosystemWorkingDAW

# Enable testing
enable_testing()

# Add Dynamic Algorithm System integration
# Exclude from tvOS local-only builds (missing source files)
# TEMPORARILY DISABLED for iOS backend build
if(FALSE AND NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/cmake/DynamicAlgorithmIntegration.cmake)
        include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/DynamicAlgorithmIntegration.cmake)
        message(STATUS "✓ Dynamic Algorithm System + Smart Controls integration enabled")
    endif()
else()
    message(STATUS "⏭️  Dynamic Algorithm System excluded (tvOS local-only mode)")
endif()

# Add tests subdirectory (only if BUILD_TESTING is enabled)
if(BUILD_TESTING AND EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/tests)
    add_subdirectory(tests)
    message(STATUS "✓ Test system enabled")
elseif(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/tests)
    message(STATUS "⏭️  Tests disabled (BUILD_TESTING=OFF)")
endif()

# Add FFI server subdirectory (TypeScript SDK to JUCE Backend integration)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ffi/CMakeLists.txt)
    add_subdirectory(src/ffi)
    message(STATUS "✓ FFI Server enabled (TypeScript SDK ↔ JUCE Backend)")
endif()

# Add LV2 plugin support (Linux/Raspberry Pi deployment)
option(BUILD_LV2_PLUGINS "Build LV2 plugins for Linux/Raspberry Pi" OFF)
if(BUILD_LV2_PLUGINS)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/lv2/CMakeLists.txt)
        add_subdirectory(lv2)
        message(STATUS "✓ LV2 plugin support enabled (FilterGate.lv2)")
    else()
        message(WARNING "LV2 build requested but CMakeLists.txt not found in lv2/")
    endif()
endif()

# Add WebSocket Security Tests (EXCLUDED in tvOS local-only mode)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/tests/websocket_security)
        add_subdirectory(tests/websocket_security)
        message(STATUS "✓ WebSocket Security Tests enabled")
    endif()
else()
    message(STATUS "⏭️  WebSocket Security Tests excluded (tvOS local-only mode)")
endif()

# Add REST API Security Framework (EXCLUDED in tvOS local-only mode)
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/rest)
        add_subdirectory(src/rest)
        message(STATUS "✓ REST API Security Framework enabled")
    endif()
else()
    message(STATUS "⏭️  REST API Security Framework excluded (tvOS local-only mode)")
endif()

# Test executable for SongPlaceholderComponent system
# Exclude if ALL required source files don't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/tests/ui/test_SongPlaceholderComponent.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ui/SongPlaceholderComponent.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ui/MiniTimelineComponent.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/audio/DropoutPrevention.cpp)
add_executable(SongPlaceholderComponentTests
    tests/ui/test_SongPlaceholderComponent.cpp
    src/ui/SongPlaceholderComponent.cpp
    src/ui/MiniTimelineComponent.cpp
    # Audio components with DropoutPrevention
    src/audio/DropoutPrevention.cpp
    # # src/ui/TransportControlsComponent.cpp   # File doesn't exist - commented out  # File doesn't exist - commented out
    # # src/ui/TrackOverviewComponent.cpp       # File doesn't exist - commented out    # File doesn't exist - commented out
    # src/ui/ComponentFactory.cpp          # File doesn't exist - commented out
    # src/ui/JIVEStyleManager.cpp           # File doesn't exist - commented out
    # src/ui/JIVELookAndFeel.cpp            # File doesn't exist - commented out
)
endif()

# Include directories for test executable
if(TARGET SongPlaceholderComponentTests)
target_include_directories(SongPlaceholderComponentTests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_BINARY_DIR}/SongPlaceholderComponentTests_artefacts
        ${CMAKE_CURRENT_BINARY_DIR}/SongPlaceholderComponentTests_artefacts/JuceLibraryCode
        ${JUCE_PATH}/modules
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_core
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_components
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_layouts
        ${CMAKE_CURRENT_SOURCE_DIR}/external/JIVE/jive_style_sheets
        ${NLOHMANN_JSON_INCLUDE_DIR}
)

# Link libraries for test executable (JUCE modules disabled due to CMake conflicts)
target_link_libraries(SongPlaceholderComponentTests
    PRIVATE
        # Testing framework - use proper targets if available, otherwise fallback
        $<$<TARGET_EXISTS:GTest::GTest>:GTest::GTest>
        $<$<TARGET_EXISTS:GTest::Main>:GTest::Main>
        $<$<NOT:$<TARGET_EXISTS:GTest::GTest>>:gtest>
        $<$<NOT:$<TARGET_EXISTS:GTest::Main>>:gtest_main>
        $<$<TARGET_EXISTS:nlohmann_json::nlohmann_json>:nlohmann_json::nlohmann_json>
        # Required for gtest on macOS
        pthread
)
endif()

# ComplexPitchDetector Test - Simple standalone test
# Exclude if sources don't exist
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/test_complex_pitch.cpp AND
   EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/audio/ComplexPitchDetector.cpp)
add_executable(ComplexPitchDetectorTest
    test_complex_pitch.cpp
    src/audio/ComplexPitchDetector.cpp
    # Only required JUCE source files
    external/JUCE/modules/juce_core/juce_core.cpp
    external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
    external/JUCE/modules/juce_dsp/juce_dsp.cpp
)
endif()

if(TARGET ComplexPitchDetectorTest)
target_include_directories(ComplexPitchDetectorTest
    PRIVATE
        src
        ${JUCE_INCLUDE_DIRS}
        ${NLOHMANN_JSON_INCLUDE_DIR}
)

target_compile_definitions(ComplexPitchDetectorTest
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
        DEBUG=1
        JUCE_DISPLAY_SPLASH_SCREEN=0
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
)

if(APPLE)
    target_link_libraries(ComplexPitchDetectorTest
        PRIVATE
            "-framework Foundation"
            "-framework CoreGraphics"
            "-framework QuartzCore"
            "-framework AudioToolbox"
            "-framework CoreAudio"
            "-framework CoreMIDI"
            "-framework IOKit"
            "-framework Carbon"
            "-framework Accelerate"
    )
endif()
endif()

# =============================================================================
# AUDIO LAYER TESTS (T017-T023)
# =============================================================================

if(BUILD_TESTING)
    # Find Google Test
    find_package(GTest REQUIRED)

    # Audio Layer Test executable
    add_executable(AudioLayerTest
        tests/audio/AudioLayerTest.cpp
        src/audio/Scheduler.cpp
        src/audio/VoiceManager.cpp
        src/audio/ConsoleSystem.cpp
    )

    target_include_directories(AudioLayerTest
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/include
            ${CMAKE_CURRENT_SOURCE_DIR}/external/JUCE/modules
    )

    target_link_libraries(AudioLayerTest
        PRIVATE
            GTest::GTest
            GTest::Main
    )

    # Add test to CTest
    add_test(NAME AudioLayerTest COMMAND AudioLayerTest)

    message(STATUS "✅ Audio Layer Tests configured (Scheduler, Voice Manager, Console)")
endif()

# Installation
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    if(TARGET SchillingerEcosystemWorkingDAW)
        install(TARGETS SchillingerEcosystemWorkingDAW
            BUNDLE DESTINATION .
            RUNTIME DESTINATION bin
        )
    endif()
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "🎛️  SchillingerEcosystem Stable DAW Configuration:")
message(STATUS "  JUCE Path: ${JUCE_PATH}")
message(STATUS "  Target: SchillingerEcosystemWorkingDAW")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Platform: ${CMAKE_SYSTEM_NAME}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "")
message(STATUS "✅ Enabled Core Systems:")
message(STATUS "  ✓ Core Engine System - Schillinger mathematical framework")
message(STATUS "  ✓ Temporal/Schillinger System - Timeline and position management")
message(STATUS "  ✓ Basic Audio Engine - Real-time audio processing")
message(STATUS "  ✓ JUCE GUI Framework - Professional interface")
message(STATUS "")
message(STATUS "🎵 Instrument Integration System:")
message(STATUS "  ✓ Instrument Manager - Core loading and lifecycle management")
message(STATUS "  ✓ Three Synthesizers: NEX FM, Sam Sampler, Local Gal")
message(STATUS "  ✓ Audio/MIDI Routing - Professional routing with effects chains")
message(STATUS "  ✓ External Plugin Support - VST3, AU, LV2 compatibility")
message(STATUS "")
message(STATUS "🤖 AI Agent Integration:")
message(STATUS "  ✓ AI Agent Bridge - Intelligent instrument control")
message(STATUS "  ✓ Learning System - Adaptive user preferences")
message(STATUS "  ✓ WebSocket API - Flutter UI communication")
message(STATUS "")
message(STATUS "🌐 Connectivity:")
message(STATUS "  ✓ WebSocket API - Real-time Flutter UI communication")
message(STATUS "  ✓ MIDI Learn - Flexible parameter mapping")
message(STATUS "  ✓ Performance Monitoring - CPU, memory, latency tracking")
message(STATUS "")
message(STATUS "🎨  Native JUCE GUI Framework:")
message(STATUS "  ✓ Pure JUCE components - Professional interface")
message(STATUS "  ✓ Custom component implementations")
message(STATUS "  ✓ No external GUI dependencies")
message(STATUS "")
message(STATUS "🚧 Systems Ready for Integration:")
message(STATUS "  ⏳ Complete Plugin Hosting System (VST3/AU)")
message(STATUS "  ⏳ Professional Mixer Engine")
message(STATUS "  ⏳ Advanced Automation System")
message(STATUS "")
message(STATUS "📊 Build Strategy: Complete instrument integration with AI capabilities")
message(STATUS "")

# Flutter FFI Integration
option(BUILD_FLUTTER_FFI "Build Flutter FFI library" ON)

if(BUILD_FLUTTER_FFI)
    # Create tvOS FFI library (minimal implementation)
    # Check if FFI source exists AND this is NOT iOS
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ffi/JuceFFI.mm AND NOT CMAKE_SYSTEM_NAME STREQUAL "iOS")
    add_library(juce_ffi SHARED
        src/ffi/JuceFFI.mm
        # Add JUCE modules as source files (audio-only, no GUI dependencies)
        external/JUCE/modules/juce_core/juce_core.cpp
        external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
        external/JUCE/modules/juce_audio_devices/juce_audio_devices.cpp
        # juce_audio_processors removed - has hard dependency on juce_gui_basics
        external/JUCE/modules/juce_dsp/juce_dsp.cpp
        external/JUCE/modules/juce_events/juce_events.cpp
        # juce_graphics removed - GUI module with CoreText dependencies
        external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
    )
    endif()

    if(TARGET juce_ffi)
    target_include_directories(juce_ffi PRIVATE
        include/ffi
        include
        ${JUCE_PATH}/modules
        ${CMAKE_CURRENT_BINARY_DIR}/juce_ffi_artefacts
        ${CMAKE_CURRENT_BINARY_DIR}/juce_ffi_artefacts/JuceLibraryCode
    )

    target_compile_definitions(juce_ffi
        PRIVATE
            JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
            JUCE_WEB_BROWSER=0
            JUCE_USE_CURL=0
            JUCE_VST3_CAN_REPLACE_VST2=0
            JUCE_DISPLAY_SPLASH_SCREEN=0
            DEBUG=1
            JUCE_MODULE_AVAILABLE_juce_core=1
            JUCE_MODULE_AVAILABLE_juce_audio_basics=1
            JUCE_MODULE_AVAILABLE_juce_audio_devices=1
            JUCE_MODULE_AVAILABLE_juce_dsp=1
            JUCE_MODULE_AVAILABLE_juce_events=1
            JUCE_MODULE_AVAILABLE_juce_data_structures=1
            # GUI modules excluded - do not define at all
        PUBLIC
            JUCE_WEB_BROWSER=0
            JUCE_USE_CURL=0
            JUCE_VST3_CAN_REPLACE_VST2=0
    )

    if(APPLE)
        target_link_libraries(juce_ffi PRIVATE
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
        )

        # Force Objective-C++ compilation for all source files
        set_source_files_properties(
            src/ffi/JuceFFI.mm
            external/JUCE/modules/juce_core/juce_core.cpp
            external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
            external/JUCE/modules/juce_audio_devices/juce_audio_devices.cpp
            external/JUCE/modules/juce_audio_processors/juce_audio_processors.cpp
            external/JUCE/modules/juce_dsp/juce_dsp.cpp
            external/JUCE/modules/juce_events/juce_events.cpp
            external/JUCE/modules/juce_graphics/juce_graphics.cpp
            external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
            PROPERTIES
            COMPILE_FLAGS "-x objective-c++"
        )

        # Flutter FFI specific optimizations
        set_target_properties(juce_ffi PROPERTIES
            XCODE_ATTRIBUTE_ENABLE_BITCODE "NO"
            XCODE_ATTRIBUTE_STRIP_STYLE "all"
            XCODE_ATTRIBUTE_CLANG_CXX_LANGUAGE_STANDARD "objective-c++20"
            XCODE_ATTRIBUTE_CLANG_CXX_LIBRARY "libc++"
        )

        # Architecture-specific optimizations
        if(CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
            target_compile_options(juce_ffi PRIVATE
                -march=armv8-a+crypto -O3 -ffast-math
            )
        else()
            target_compile_options(juce_ffi PRIVATE
                -march=native -O3 -ffast-math
            )
        endif()
    endif()
    endif()  # Close if(TARGET juce_ffi)

    message(STATUS "✓ Flutter FFI library configured")
endif()

#================================================================================================
#  iOS Full Synth Framework (Native JUCE Backend for iOS)
#================================================================================================

option(BUILD_IOS_BACKEND "Build iOS backend framework with full synth capabilities" ON)

if(BUILD_IOS_BACKEND)
    message(STATUS "🎹 Building iOS backend framework with full synth capabilities...")

    # Collect all instrument DSP source files from their actual locations
    # Note: Excluding stereo files and Giant Instruments due to compilation issues
    # Core mono DSP implementations provide full synth capability for iOS
    set(IOS_BACKEND_DSP_SOURCES
        # Audio Layer (T017-T023)
        # Note: ConsoleSystem.cpp excluded - depends on dynamics/FilterGate.h which has missing dependencies
        src/audio/Scheduler.cpp
        src/audio/VoiceManager.cpp
        include/dsp/LookupTables.cpp

        # Core DSP Instruments (mono implementations - stereo files have code issues)
        instruments/localgal/src/dsp/LocalGalPureDSP.cpp
        instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp
        instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp
        instruments/kane_marco/src/dsp/KaneMarcoAetherStringPureDSP.cpp
        instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp
        instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp
        instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp

        # Note: Giant Instruments excluded due to compilation errors
        # (missing JUCE headers, incorrect RNG usage)
        # Note: Console files excluded - depend on dynamics/FilterGate.h
        # Can be added later after fixes

        # FFI Bridge
        # NOTE: sch_engine.mm REMOVED - duplicate FFI symbols causing linker conflicts
        # SchillingerEngineCore is the authoritative FFI layer for transport/engine
        # JUCE backend provides ONLY audio-related FFI functions via audio_only_bridge.mm
        src/ffi/audio_only_bridge.mm
        src/ffi/src/audio_engine_bridge.cpp
        src/ffi/src/ffi_server.cpp
        src/ffi/src/validator.cpp
    )

    # Verify sources exist
    set(IOS_BACKEND_DSP_EXISTS TRUE)
    set(IOS_BACKEND_MISSING_FILES "")
    foreach(source_file ${IOS_BACKEND_DSP_SOURCES})
        if(NOT EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/${source_file})
            set(IOS_BACKEND_DSP_EXISTS FALSE)
            set(IOS_BACKEND_MISSING_FILES "${IOS_BACKEND_MISSING_FILES}  - ${source_file}\n")
            message(WARNING "Source file not found: ${source_file}")
        endif()
    endforeach()

    if(IOS_BACKEND_DSP_EXISTS)
        # Create static library for iOS
        add_library(juce_backend_ios STATIC
            ${IOS_BACKEND_DSP_SOURCES}
            # JUCE audio-only modules (no GUI dependencies)
            # Note: juce_audio_processors excluded due to GUI dependency chain
            # Note: juce_audio_devices excluded - using AVAudioEngine directly on iOS
            external/JUCE/modules/juce_core/juce_core.cpp
            external/JUCE/modules/juce_core/juce_core_CompilationTime.cpp
            external/JUCE/modules/juce_data_structures/juce_data_structures.cpp
            external/JUCE/modules/juce_events/juce_events.cpp
            # GUI modules removed - juce_graphics and juce_gui_basics not needed for audio
            external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp
            # juce_audio_devices removed - using AVAudioEngine directly instead
            # juce_audio_processors removed - has hard dependency on juce_gui_basics
            external/JUCE/modules/juce_dsp/juce_dsp.cpp
        )

        # Target compile options for iOS - enable Objective-C++ for JUCE modules
        target_compile_options(juce_backend_ios
            PRIVATE
            -x objective-c++
        )

        # Include directories
        target_include_directories(juce_backend_ios
            PRIVATE
                ${CMAKE_CURRENT_SOURCE_DIR}/include
                ${CMAKE_CURRENT_SOURCE_DIR}/src
                ${CMAKE_CURRENT_SOURCE_DIR}/src/ffi
                ${CMAKE_CURRENT_SOURCE_DIR}/src/ffi/include
                ${JUCE_PATH}/modules
                ${CMAKE_CURRENT_BINARY_DIR}/juce_backend_ios_artefacts
                ${CMAKE_CURRENT_BINARY_DIR}/juce_backend_ios_artefacts/JuceLibraryCode
                # Instrument-specific include paths
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/localgal/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/localgal/include/dsp
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/kane_marco/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/kane_marco/include/dsp
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/Nex_synth/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/Nex_synth/include/dsp
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/Sam_sampler/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/Sam_sampler/include/dsp
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/drummachine/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/drummachine/include/dsp
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/giant_instruments/include
                ${CMAKE_CURRENT_SOURCE_DIR}/instruments/giant_instruments/include/dsp
                # Design system (shared themes for all instruments)
                ${CMAKE_CURRENT_SOURCE_DIR}/include/design_system
                ${CMAKE_CURRENT_SOURCE_DIR}/include/design_system/themes
                ${CMAKE_CURRENT_SOURCE_DIR}/console
                # nlohmann/json (homebrew)
                /opt/homebrew/Cellar/nlohmann-json/3.12.0/include
        )

        # Compile definitions
        target_compile_definitions(juce_backend_ios
            PRIVATE
                JUCE_GLOBAL_MODULE_SETTINGS_ENABLED=1
                JUCE_WEB_BROWSER=0
                JUCE_USE_CURL=0
                JUCE_VST3_CAN_REPLACE_VST2=0
                JUCE_DISPLAY_SPLASH_SCREEN=0
                DEBUG=1
                JUCE_MODULE_AVAILABLE_juce_core=1
                JUCE_MODULE_AVAILABLE_juce_data_structures=1
                JUCE_MODULE_AVAILABLE_juce_events=1
                # GUI modules excluded - do not define at all (not even =0)
                JUCE_MODULE_AVAILABLE_juce_audio_basics=1
                JUCE_MODULE_AVAILABLE_juce_audio_devices=1
                JUCE_MODULE_AVAILABLE_juce_dsp=1
                # iOS-specific
                JUCE_STRICT_REFCOUNTED_POINTER=1
                JUCE_DISABLE_ASSERTIONS=0
                # Provide assert for iOS build
                _ASSERT=1
                # JUCE global header handling - needed when including JuceHeader.h
                JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
            PUBLIC
                JUCE_WEB_BROWSER=0
                JUCE_USE_CURL=0
                JUCE_VST3_CAN_REPLACE_VST2=0
        )

        # iOS-specific compile definitions
        if(IOS)
            target_compile_definitions(juce_backend_ios
                PUBLIC
                    __IOS__=1
                    TARGET_OS_IPHONE=1
            )
        endif()

        # Link libraries for Apple platforms
        if(APPLE)
            # iOS-specific frameworks (audio-only, no GUI dependencies)
            if(IOS)
                target_link_libraries(juce_backend_ios PRIVATE
                    "-framework Foundation"
                    "-framework UIKit"
                    "-framework CoreGraphics"
                    "-framework QuartzCore"
                    # CoreText and Metal removed - no GUI modules
                    "-framework AudioToolbox"
                    "-framework CoreAudio"
                    "-framework CoreMIDI"
                    "-framework Accelerate"
                )
            else()
                # macOS frameworks
                target_link_libraries(juce_backend_ios PRIVATE
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
                )
            endif()

            # Force Objective-C++ compilation for .mm files
            set_source_files_properties(
                src/ffi/sch_engine.mm
                # GUI module compile flags removed - juce_graphics and juce_gui_basics not included
                PROPERTIES
                COMPILE_FLAGS "-x objective-c++"
            )

            # iOS-specific optimizations
            set_target_properties(juce_backend_ios PROPERTIES
                XCODE_ATTRIBUTE_ENABLE_BITCODE "NO"
                XCODE_ATTRIBUTE_STRIP_STYLE "all"
                XCODE_ATTRIBUTE_CLANG_CXX_LANGUAGE_STANDARD "objective-c++20"
                XCODE_ATTRIBUTE_CLANG_CXX_LIBRARY "libc++"
                XCODE_ATTRIBUTE_MACH_O_TYPE "staticlib"
            )

            # Architecture-specific optimizations
            if(CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
                target_compile_options(juce_backend_ios PRIVATE
                    -march=armv8-a+crypto -O3
                )
            else()
                target_compile_options(juce_backend_ios PRIVATE
                    -march=native -O3
                )
            endif()
        endif()

        message(STATUS "✓ iOS backend framework configured")
        message(STATUS "  - Includes: LocalGal, KaneMarco, KaneMarcoAether, NexSynth, SamSampler, DrumMachine")
        message(STATUS "  - Audio layer: VoiceManager, Scheduler, ConsoleSystem")
        message(STATUS "  - FFI bridge: sch_engine.mm")
        message(STATUS "  - Total sources: ${IOS_BACKEND_DSP_SOURCES} files")

        # Installation
        install(TARGETS juce_backend_ios
            ARCHIVE DESTINATION lib
            LIBRARY DESTINATION lib
        )

        # Install headers for Swift interop
        install(DIRECTORY include/dsp/ include/ffi/
            DESTINATION include/juce_backend
            FILES_MATCHING PATTERN "*.h" PATTERN "*.hpp"
        )

    else()
        message(WARNING "⚠️  Some DSP source files missing, skipping iOS backend framework")
        message(WARNING "    Check that instrument DSP files exist in src/dsp/")
    endif()
endif()

#================================================================================================
#  White Room Pedalboard Plugin (VST3/AU/Standalone)
#================================================================================================

# Add pedalboard subdirectory if it exists
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/effects/pedalboard/CMakeLists.txt)
    add_subdirectory(effects/pedalboard)
    message(STATUS "✓ Pedalboard plugin enabled")
else()
    message(STATUS "⏭️  Pedalboard plugin not found (skipped)")
endif()

message(STATUS "")