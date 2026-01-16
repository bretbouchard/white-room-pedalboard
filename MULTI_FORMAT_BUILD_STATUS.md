# White Room Pedalboard - Multi-Format Build Status

## ✅ Successfully Built Formats

### 1. **Standalone App** ✅
- **Location**: `build_plugin/WhiteRoomPedalboard_artefacts/Release/Standalone/WhiteRoomPedalboard.app`
- **Status**: Complete and working
- **WebView UI**: Copied to app bundle
- **Installation**: Copy to `/Applications/`
- **Test**: `open build_plugin/WhiteRoomPedalboard_artefacts/Release/Standalone/WhiteRoomPedalboard.app`

### 2. **LV2 Plugin** ✅
- **Location**: `~/Library/Audio/Plug-Ins/LV2/WhiteRoomPedalboard.lv2/`
- **Status**: Built and automatically installed
- **Files**:
  - `libWhiteRoomPedalboard.so` - Plugin binary
  - `manifest.ttl` - LV2 manifest
  - `dsp.ttl` - DSP port description
  - `ui.ttl` - UI description
- **Supported DAWs**: Reaper, Bitwig Studio, Ardour, MusE, Carla
- **Note**: WebView UI needs to be manually embedded in LV2 bundle

## ⚠️ Partial Builds

### 3. **VST3 Plugin** ⚠️
- **Issue**: Parameter automation conflict error
- **Error**: `You may have a conflict with parameter automation between VST2 and VST3 versions`
- **Cause**: Missing or incorrect JUCE plugin parameter definitions
- **Fix Needed**: Add proper `JucePluginCharacteristics.h` with parameter IDs
- **Status**: Build failed, but close to working

### 4. **AU Plugin** ⚠️
- **Issue**: Missing `JucePlugin_AUMainType` definition
- **Error**: `expected expression` in juce_AU_Shared.h
- **Cause**: JucePluginCharacteristics.h not being picked up by build
- **Fix Needed**: Ensure JucePluginCharacteristics.h is in include path
- **Status**: Build failed, but framework compiles

## Build Configuration

Current CMakeLists_plugin.txt:
```cmake
juce_add_plugin("WhiteRoomPedalboard"
    FORMATS VST3 AU LV2 Standalone
    # ... other settings ...
)
```

## Installation Commands

### Install Standalone:
```bash
cp -R build_plugin/WhiteRoomPedalboard_artefacts/Standalone/WhiteRoomPedalboard.app \
   /Applications/
```

### Install VST3 (when fixed):
```bash
cp -R build_plugin/WhiteRoomPedalboard_artefacts/VST3/*.vst3 \
   ~/Library/Audio/Plug-Ins/VST3/
```

### Install AU (when fixed):
```bash
cp -R build_plugin/WhiteRoomPedalboard_artefacts/AU/*.component \
   ~/Library/Audio/Plug-Ins/Components/
```

### Install LV2 (already installed):
```bash
# Already at: ~/Library/Audio/Plug-Ins/LV2/WhiteRoomPedalboard.lv2/
```

## DAW Compatibility

| Format | Status | Compatible DAWs |
|--------|--------|-----------------|
| **Standalone** | ✅ Working | N/A (desktop app) |
| **LV2** | ✅ Built | Reaper, Bitwig, Ardour, Carla |
| **VST3** | ⚠️ Build error | Cubase, Reaper, Ableton, Bitwig |
| **AU** | ⚠️ Build error | Logic Pro, GarageBand, MainStage |

## Recommended Next Steps

### Option 1: Use Working Formats (Immediate)
1. Test **Standalone app** for live performance
2. Test **LV2 plugin** in Reaper or Bitwig
3. Document issues with VST3 and AU

### Option 2: Fix Build Errors (Development)
1. **Fix VST3**: Add proper parameter definitions
2. **Fix AU**: Ensure JucePluginCharacteristics.h is found
3. Test all formats in respective DAWs

### Option 3: Disable Problematic Formats (Quick)
```cmake
# Only build working formats
juce_add_plugin("WhiteRoomPedalboard"
    FORMATS LV2 Standalone
)
```

## Testing Instructions

### Test Standalone:
```bash
open build_plugin/WhiteRoomPedalboard_artefacts/Release/Standalone/WhiteRoomPedalboard.app
```

### Test LV2 in Reaper:
1. Open Reaper
2. Preferences → Plug-ins → Re-scan
3. Add new track → FX → LV2 → White Room Pedalboard
4. Test audio processing

### Test LV2 in Bitwig:
1. Open Bitwig Studio
2. Browser → Plugins → LV2
3. Find White Room Pedalboard
4. Load onto track

## What Works Right Now

✅ **Standalone App**: Ready for testing and live performance
✅ **LV2 Plugin**: Installed and ready for LV2-compatible DAWs
✅ **9 Effects**: All pedals working (except BiPhase which is excluded)
✅ **WebView UI**: Drag-and-drop interface

## What Needs Work

⚠️ **VST3**: Parameter automation conflict (needs JUCE plugin definitions)
⚠️ **AU**: Missing AU main type definition (needs proper include)
⏸️ **BiPhase**: Linking errors (use standalone BiPhase plugin instead)

## Conclusion

**2 out of 4 formats are working!** You have a functional Standalone app and LV2 plugin that can be used immediately. VST3 and AU have minor configuration issues that can be fixed with proper JUCE plugin definitions.

**Recommendation**: Test the working formats first, then decide if VST3 and AU are needed for your target DAWs.
