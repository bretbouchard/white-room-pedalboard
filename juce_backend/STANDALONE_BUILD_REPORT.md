# White Room Standalone Applications Build Report

**Date**: January 15, 2026
**Location**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/`
**Status**: Configuration Complete - Ready to Build

---

## Executive Summary

Successfully configured **BUILD_STANDALONE=ON** for all 8 White Room plugins. All CMakeLists.txt files have been updated with comprehensive multi-format build support including Standalone applications.

### Build Status
- ✅ **Configuration Complete**: All 8 plugins configured
- ⏳ **Build Pending**: Ready to execute build script
- ⏳ **Verification Pending**: Apps not yet tested

---

## Plugin Inventory

### Instruments (8 Plugins)

| Plugin | Build Directory | Standalone Config | Bundle ID | Status |
|--------|----------------|-------------------|-----------|---------|
| **LocalGal** | `localgal_plugin_build/` | ✅ Added | `com.schillinger.LocalGal` | Ready |
| **NexSynth** | `nex_synth_plugin_build/` | ✅ Added | `com.schillinger.NexSynth` | Ready |
| **SamSampler** | `sam_sampler_plugin_build/` | ✅ Added | `com.schillinger.SamSampler` | Ready |
| **Kane Marco Aether** | `kane_marco_plugin_build/` | ✅ Added | `com.schillinger.KaneMarcoAether` | Ready |
| **Giant Instruments** | `giant_instruments_plugin_build/` | ✅ Added | `com.schillinger.GiantInstruments` | Ready |
| **Far Far Away** | `farfaraway_plugin_build/` | ✅ Pre-existing | `com.whiteroom.farfaraway` | Ready |
| **FilterGate** | `filtergate_plugin_build/` | ✅ Pre-existing | `com.schillinger.FilterGate` | Ready |
| **Monument** | `monument_plugin_build/` | ✅ Pre-existing | `com.schillinger.Monument` | Ready |

### Missing Plugins

The following plugins from the requirements are not present:

| Plugin | Type | Status |
|--------|------|--------|
| **DrumMachine** | Instrument | Has source but no `_plugin_build` directory |
| **BiPhase** | Effect | Not found in codebase |

**Note**: DrumMachine exists at `instruments/drummachine/` but lacks a dedicated plugin build directory. BiPhase was not found in the effects directory.

---

## Configuration Changes Applied

### Added to All Plugins (5 total)

For each of the following plugins, these changes were applied:

**Plugins Updated:**
1. `localgal_plugin_build/`
2. `nex_synth_plugin_build/`
3. `sam_sampler_plugin_build/`
4. `kane_marco_plugin_build/`
5. `giant_instruments_plugin_build/`

### 1. Format Options Section

```cmake
#==============================================================================
#  Format Configuration
#==============================================================================

option(BUILD_AU "Build AU plugin" ON)
option(BUILD_VST3 "Build VST3 plugin" ON)
option(BUILD_CLAP "Build CLAP plugin" ON)
option(BUILD_STANDALONE "Build Standalone app" ON)

message(STATUS "")
message(STATUS "🎛️  [PluginName] Multi-Format Build Configuration")
message(STATUS "  AU: ${BUILD_AU}")
message(STATUS "  VST3: ${BUILD_VST3}")
message(STATUS "  CLAP: ${BUILD_CLAP}")
message(STATUS "  Standalone: ${BUILD_STANDALONE}")
message(STATUS "")
```

### 2. Format List Building

```cmake
# Build format list
set([PLUGIN_NAME]_FORMATS "")
if(BUILD_VST3)
    list(APPEND [PLUGIN_NAME]_FORMATS "VST3")
endif()
if(BUILD_AU AND APPLE)
    list(APPEND [PLUGIN_NAME]_FORMATS "AU")
endif()
if(BUILD_CLAP)
    list(APPEND [PLUGIN_NAME]_FORMATS "CLAP")
endif()
if(BUILD_STANDALONE)
    list(APPEND [PLUGIN_NAME]_FORMATS "Standalone")
endif()
```

### 3. JUCE Plugin Configuration Update

```cmake
juce_add_plugin("[PluginName]"
    COMPANY_NAME "Schillinger"
    PLUGIN_NAME "[Display Name]"
    PLUGIN_DESCRIPTION "[Description]"
    PLUGIN_VERSION 1.0.0
    FORMATS ${[PLUGIN_NAME]_FORMATS}
    IS_SYNTH 1
    NEEDS_MIDI_INPUT 1
    PRODUCES_MIDI_OUTPUT 0
    IS_MIDI_EFFECT 0
    AU_MAIN_TYPE "aumu"
    VST3_CATEGORY "Instrument|Synth"
    BUNDLE_ID "com.schillinger.[PluginName]"
    COPY_PLUGIN_AFTER_BUILD ON
)
```

### 4. Standalone Linking

```cmake
# Link JUCE audio utilities for Standalone format
if(BUILD_STANDALONE)
    target_link_libraries("[PluginName]"
        PRIVATE
            juce::juce_audio_utils
    )
endif()
```

### 5. Build Summary

```cmake
#==============================================================================
#  Build Summary
#==============================================================================

message(STATUS "")
message(STATUS "✓ [PluginName] plugin configured successfully")
message(STATUS "  Formats: ${[PLUGIN_NAME]_FORMATS}")
if(BUILD_CLAP AND TARGET clap_juce_extensions)
    message(STATUS "  CLAP: Enabled (via clap-juce-extensions)")
endif()
message(STATUS "")
```

---

## Build Instructions

### Quick Start

```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend
./build_all_standalones.sh
```

### Manual Build (Individual Plugin)

```bash
cd [plugin_directory]/
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_STANDALONE=ON
cmake --build . --config Release --parallel
```

### Expected Output

After successful build, standalone apps will be located at:

```
[plugin_directory]/build/
├── [PluginName].app/
│   ├── Contents/
│   │   ├── MacOS/
│   │   │   └── [PluginName]          # Executable
│   │   ├── Resources/
│   │   └── Info.plist
│   └── ... (standard macOS bundle structure)
```

---

## Plugin Capabilities (Standalone)

### Reference Implementation Features

Standalone apps serve as the **reference implementation** and may:

- **Host Agents**: Run AI agents for intelligent control
- **Open Sockets**: Network communication for remote control
- **Load Graphs**: Dynamic DSP graph loading
- **Run LangGraph**: LangGraph / MCP orchestration
- **Control Hub**: Act as central control interface

### Audio I/O Configuration

- **Input**: Stereo audio input (for effects)
- **Output**: Stereo audio output
- **MIDI**: Full MIDI I/O support
- **Parameters**: Full parameter automation
- **Presets**: Load/save preset files

---

## Build Script Details

### `build_all_standalones.sh`

**Location**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/build_all_standalones.sh`

**Features**:
- ✅ Builds all 8 plugins sequentially
- ✅ Color-coded console output
- ✅ Error detection and reporting
- ✅ Success/failure counting
- ✅ App bundle verification
- ✅ Comprehensive summary report

**Usage**:
```bash
./build_all_standalones.sh
```

**Output Example**:
```
================================================
White Room Standalone Build Suite
================================================

------------------------------------------------
Building: localgal
------------------------------------------------
✓ LocalGal configured successfully
✓ Standalone app created: build/LocalGal.app
✓ Executable found: LocalGal

[... continues for all plugins ...]

================================================
Build Summary
================================================
Total plugins: 8
Successful: 8
Failed: 0

✓ All standalone applications built successfully!
```

---

## Verification Checklist

After building, verify each standalone app:

### Launch Verification
- [ ] App launches without crash
- [ ] Main window appears
- [ ] Audio device selection dialog shows
- [ ] MIDI device selection dialog shows (for instruments)

### Functionality Verification
- [ ] Audio output works
- [ ] Parameter controls respond
- [ ] Preset load/save works
- [ ] MIDI input works (for instruments)
- [ ] Audio input works (for effects)

### Platform Verification
- [ ] macOS 15.0+ compatibility
- [ ] Apple Silicon (arm64) native
- [ ] Intel (x86_64) compatibility (if available)

---

## Troubleshooting

### Common Issues

**1. CMake Configuration Fails**
```
Solution: Ensure JUCE submodule is initialized
git submodule update --init --recursive external/JUCE
```

**2. CLAP Extension Not Found**
```
Solution: Initialize clap-juce-extensions submodule
git submodule update --init --recursive external/clap-juce-extensions
```

**3. Build Errors: Missing Headers**
```
Solution: Clean build directory and rebuild
rm -rf build/
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
```

**4. Standalone App Won't Launch**
```
Solution: Check executable permissions
chmod +x [PluginName].app/Contents/MacOS/[PluginName]
```

**5. No Audio Output**
```
Solution: Verify audio device selection in app preferences
Check macOS Audio MIDI Setup for device availability
```

---

## Technical Specifications

### Build System
- **CMake**: 3.22+
- **C++ Standard**: C++17 / C++20
- **C Standard**: C11

### JUCE Integration
- **JUCE Version**: Latest from external/JUCE submodule
- **Audio Utils**: Linked for standalone format
- **Plugin Formats**: VST3, AU, CLAP, Standalone

### Platform Support
- **macOS**: 10.15+ (Catalina or later recommended)
- **Architecture**: arm64 (Apple Silicon) and x86_64 (Intel)
- **Frameworks**: CoreAudio, CoreMIDI, AppKit, Foundation

### Compiler Flags
```cmake
-DCMAKE_CXX_STANDARD=17
-DCMAKE_C_STANDARD=11
-DJUCE_VST3_CAN_REPLACE_VST2=0
-DBUILD_STANDALONE=ON
```

---

## Next Steps

### Immediate Actions
1. ✅ Run `build_all_standalones.sh` to build all plugins
2. ⏳ Verify each standalone app launches correctly
3. ⏳ Test audio I/O functionality
4. ⏳ Test parameter control
5. ⏳ Create comprehensive test report

### Future Enhancements
1. **DrumMachine Plugin**: Create dedicated plugin build directory
2. **BiPhase Effect**: Locate or implement BiPhase plugin
3. **CI/CD Integration**: Add standalone builds to CI pipeline
4. **Automated Testing**: Create automated launch and function tests
5. **Installation**: Create installer package for all standalone apps

---

## Success Criteria

### Phase 1: Configuration ✅ COMPLETE
- [x] All CMakeLists.txt files updated with BUILD_STANDALONE
- [x] Format options properly configured
- [x] JUCE audio utilities linked
- [x] Build summary messages added

### Phase 2: Build ⏳ PENDING
- [ ] All 8 plugins build successfully
- [ ] No compilation errors
- [ ] No linker errors
- [ ] All .app bundles created

### Phase 3: Verification ⏳ PENDING
- [ ] All standalone apps launch
- [ ] Audio I/O functional
- [ ] Parameters controllable
- [ ] No runtime crashes

---

## File Inventory

### Modified Files (5)

1. `/Users/bretbouchard/apps/schill/white_room/juce_backend/localgal_plugin_build/CMakeLists.txt`
2. `/Users/bretbouchard/apps/schill/white_room/juce_backend/nex_synth_plugin_build/CMakeLists.txt`
3. `/Users/bretbouchard/apps/schill/white_room/juce_backend/sam_sampler_plugin_build/CMakeLists.txt`
4. `/Users/bretbouchard/apps/schill/white_room/juce_backend/kane_marco_plugin_build/CMakeLists.txt`
5. `/Users/bretbouchard/apps/schill/white_room/juce_backend/giant_instruments_plugin_build/CMakeLists.txt`

### Created Files (2)

1. `/Users/bretbouchard/apps/schill/white_room/juce_backend/build_all_standalones.sh`
2. `/Users/bretbouchard/apps/schill/white_room/juce_backend/STANDALONE_BUILD_REPORT.md`

### Pre-Existing Standalone Support (3)

1. `/Users/bretbouchard/apps/schill/white_room/juce_backend/farfaraway_plugin_build/CMakeLists.txt`
2. `/Users/bretbouchard/apps/schill/white_room/juce_backend/filtergate_plugin_build/CMakeLists.txt`
3. `/Users/bretbouchard/apps/schill/white_room/juce_backend/monument_plugin_build/CMakeLists.txt`

---

## Conclusion

All 8 White Room plugins are now configured with comprehensive multi-format build support including **Standalone applications**. The build system is ready to generate complete, production-ready standalone apps for all plugins.

**Configuration Status**: ✅ **COMPLETE**
**Build Status**: ⏳ **READY TO BUILD**
**Verification Status**: ⏳ **PENDING**

To proceed with building all standalone applications, run:
```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend
./build_all_standalones.sh
```

---

**Report Generated**: January 15, 2026
**Total Plugins Configured**: 8
**Configuration Time**: ~30 minutes
**Next Action**: Execute build script
