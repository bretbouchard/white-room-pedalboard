# White Room Pedalboard - Plugin Formats Guide

## Supported Plugin Formats

The White Room Pedalboard now supports **4 major plugin formats**:

### 1. **VST3** (Virtual Studio Technology 3)
- **Developer**: Steinberg
- **Platform**: Cross-platform (macOS, Windows, Linux)
- **DAW Support**: Most modern DAWs (Cubase, Reaper, Ableton Live, Bitwig Studio, Studio One, etc.)
- **File Extension**: `.vst3` (macOS: bundle, Windows: folder)
- **Installation**: `~/Library/Audio/Plug-Ins/VST3/`
- **Advantages**:
  - Modern, actively maintained
  - Better parameter automation than VST2
  - Supports side-chaining
  - Note expression
- **Status**: ✅ Supported

### 2. **AU** (Audio Units)
- **Developer**: Apple
- **Platform**: macOS only
- **DAW Support**: Logic Pro, GarageBand, MainStage, Reaper, Ableton Live (macOS)
- **File Extension**: `.component` (bundle)
- **Installation**: `~/Library/Audio/Plug-Ins/Components/`
- **Advantages**:
  - Native macOS format
  - Low latency
  - Tight integration with Apple DAWs
  - Supports AUv3 (iOS) with additional work
- **Status**: ✅ Supported

### 3. **LV2** (LADSPA Version 2)
- **Developer**: Linux Audio Community (open source)
- **Platform**: Cross-platform (macOS, Linux, Windows)
- **DAW Support**: Reaper, Bitwig Studio, Ardour, MusE, Carla, etc.
- **File Extension**: `.lv2` (bundle)
- **Installation**: `~/Library/Audio/Plug-Ins/LV2/`
- **Advantages**:
  - Open source, royalty-free
  - Extensible plugin format
  - Supports UI scaling
  - Good for Linux audio production
- **Status**: ✅ Supported

### 4. **Standalone**
- **Platform**: Cross-platform
- **File Type**: Desktop application
- **File Extension**: `.app` (macOS), `.exe` (Windows)
- **Installation**: `/Applications/` (macOS)
- **Use Case**:
  - Live performance without DAW
  - Testing and development
  - Processing audio files
- **Status**: ✅ Supported

## AUv3 (Audio Units version 3)

**What is AUv3?**
- Extension of AU format for iOS and modern macOS
- Required for iOS apps (GarageBand, Auria, etc.)
- Supports:
  - iOS sandboxing
  - Multiple plugin instances per AU
  - MIDI over Bluetooth LE
  - Inter-app audio (IAA)

**Why not AUv3 by default?**
- AUv3 requires different build configuration
- AUv3 is iOS-focused (though supported on macOS 10.11+)
- Requires additional code signing for iOS
- Different parameter handling (uses `AUAudioUnit` v3 API)

**How to add AUv3 support:**
```cmake
juce_add_plugin("WhiteRoomPedalboard"
    # ... other settings ...
    FORMATS VST3 AU AUv3 LV2 Standalone
)
```

**Note**: AUv3 builds may fail if not properly configured for iOS. Best to build AUv3 separately.

## VST2 (Legacy)

**What is VST2?**
- Older Steinberg format (deprecated since 2018)
- No longer officially supported by JUCE
- Requires special SDK license from Steinberg

**Why not VST2?**
- ❌ Deprecated and no longer supported
- ❌ Requires proprietary SDK
- ❌ Not future-proof
- ✅ VST3 is the replacement

**Recommendation**: Use VST3 instead

## Format Comparison

| Format | DAW Support | Performance | Future-Proof | iOS Support |
|--------|-------------|-------------|--------------|-------------|
| VST3   | ✅ Excellent | ✅ Excellent | ✅ Yes       | ❌ No       |
| AU     | ✅ Good (macOS) | ✅ Excellent | ✅ Yes       | ✅ AUv3     |
| LV2    | ⚠️ Limited  | ✅ Good      | ✅ Yes       | ❌ No       |
| Standalone | N/A    | ✅ Excellent | ✅ Yes       | ❌ No       |

## Build Configuration

Our current build setup:
```cmake
juce_add_plugin("WhiteRoomPedalboard"
    # ...
    FORMATS VST3 AU LV2 Standalone
)
```

### To add AUv3 (iOS):
```cmake
if(IOS)
    juce_add_plugin("WhiteRoomPedalboard"
        # ...
        FORMATS AUv3
    )
endif()
```

### To build all formats:
```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard
./build_plugin.sh clean
```

## Installation

### Automatic Installation (after build):
```bash
# VST3
cp -R build_plugin/WhiteRoomPedalboard_artefacts/VST3/*.vst3 \
   ~/Library/Audio/Plug-Ins/VST3/

# AU
cp -R build_plugin/WhiteRoomPedalboard_artefacts/AU/*.component \
   ~/Library/Audio/Plug-Ins/Components/

# LV2
cp -R build_plugin/WhiteRoomPedalboard_artefacts/LV2/*.lv2 \
   ~/Library/Audio/Plug-Ins/LV2/

# Standalone
cp -R build_plugin/WhiteRoomPedalboard_artefacts/Standalone/*.app \
   /Applications/
```

### Manual Installation:
1. Open `~/Library/Audio/Plug-Ins/`
2. Copy respective plugin bundles to format folders
3. Restart DAW to rescan plugins

## DAW Compatibility Matrix

| DAW                    | VST3 | AU | LV2 | Standalone |
|------------------------|------|----|----|-----------|
| Ableton Live           | ✅   | ✅ | ❌  | ❌         |
| Logic Pro              | ❌   | ✅ | ❌  | ❌         |
| GarageBand             | ❌   | ✅ | ❌  | ❌         |
| Reaper                 | ✅   | ✅ | ✅  | ✅         |
| Cubase                 | ✅   | ❌ | ❌  | ❌         |
| Studio One             | ✅   | ✅ | ❌  | ❌         |
| Bitwig Studio          | ✅   | ✅ | ✅  | ❌         |
| FL Studio              | ✅   | ✅ | ❌  | ❌         |
| Ardour                 | ✅   | ✅ | ✅  | ❌         |

## Testing

### Validate VST3:
```bash
pluginval --validate-in-place \
  build_plugin/WhiteRoomPedalboard_artefacts/VST3/WhiteRoomPedalboard.vst3
```

### Test Standalone:
```bash
open build_plugin/WhiteRoomPedalboard_artefacts/Standalone/WhiteRoomPedalboard.app
```

### Test in DAW:
1. Scan for new plugins
2. Load White Room Pedalboard
3. Test audio processing
4. Test parameter automation
5. Test preset save/load

## Recommendations

### For macOS Users:
- **Primary Format**: AU (for Logic/GarageBand)
- **Secondary Format**: VST3 (for Reaper, Ableton, Bitwig)
- **Tertiary Format**: Standalone (for live performance)

### For Windows Users:
- **Primary Format**: VST3
- **Secondary Format**: Standalone

### For Linux Users:
- **Primary Format**: LV2
- **Secondary Format**: VST3

## Troubleshooting

### Plugin not appearing in DAW:
1. Check installation path
2. Rescan plugins in DAW
3. Check DAW's plugin manager
4. Verify plugin format compatibility

### AU validation errors:
```bash
auval -v aufx WHTR WhTr
```

### VST3 validation errors:
```bash
pluginval --validate-in-place path/to/plugin.vst3
```

---

**Summary**: Your White Room Pedalboard now supports all major plugin formats (VST3, AU, LV2, Standalone) for maximum DAW compatibility!
