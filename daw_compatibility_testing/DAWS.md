# DAW Installation and Configuration Guide

## Target DAWs

### macOS (Apple Silicon + Intel)

#### 1. Logic Pro
- **Version:** 10.8+ (requires macOS 12.3+)
- **Plugin Format:** AU (Audio Unit)
- **Status:** ⚠️ Needs AU build
- **Installation:** Mac App Store
- **Plugin Path:** `~/Library/Audio/Plug-Ins/Components/`
- **Validation:** Use AU Lab (`/Developer/Applications/Audio/AU Lab.app`)

**Testing Requirements:**
- Create new project
- Add software instrument track
- Insert plugin
- Test parameter automation
- Save/load project state
- Test preset management

#### 2. Reaper
- **Version:** 7.0+ (latest stable)
- **Plugin Format:** VST3, AU
- **Status:** ✅ Ready for VST3 testing
- **Installation:** https://www.reaper.fm/download.php
- **Plugin Path:** `~/Library/Audio/Plug-Ins/VST3/`
- **Evaluation:** 60-day trial (fully functional)

**ReaScript Automation:**
```lua
-- Example: Load plugin and test basic functionality
function TestPlugin(plugin_name)
  local track = GetSelectedTrack(0, 0)
  local fx_index = TrackFX_AddByName(track, plugin_name, false, -1)
  if fx_index >= 0 then
    -- Plugin loaded successfully
    TrackFX_SetEnabled(track, fx_index, true)
    return true
  else
    -- Plugin not found
    return false
  end
end
```

**Testing Requirements:**
- Create new project
- Add VSTi/VI track
- Insert plugin via FX browser
- Test automation envelope creation
- Save/load project
- Test preset system

#### 3. Ableton Live
- **Version:** 11.3+ (requires macOS 11+)
- **Plugin Format:** VST3, AU
- **Status:** ✅ Ready for VST3 testing
- **Installation:** https://www.ableton.com/en/trial/
- **Plugin Path:** `~/Library/Audio/Plug-Ins/VST3/`
- **Evaluation:** 90-day trial (fully functional)
- **Plugin Rescan:** Options → Plug-ins → Rescan Plug-ins

**Testing Requirements:**
- Create new Set
- Add MIDI track
- Drag plugin onto track
- Test device chain
- Test automation in Arrangement view
- Save/open Set (.als file)
- Test preset browser

#### 4. GarageBand
- **Version:** 10.4+ (macOS 11+)
- **Plugin Format:** AU, AUv3
- **Status:** ⚠️ Needs AU build
- **Installation:** Mac App Store (Free)
- **Plugin Path:** `~/Library/Audio/Plug-Ins/Components/`
- **Limitations:** No automation as advanced as Logic

**Testing Requirements:**
- Create new project
- Track → New Track → Software Instrument
- Open Smart Controls
- Add AU instrument
- Test basic playback
- Save project

#### 5. Bitwig Studio
- **Version:** 5.0+ (requires macOS 11+)
- **Plugin Format:** VST3, AU
- **Status:** ✅ Ready for VST3 testing
- **Installation:** https://www.bitwig.com/download.php
- **Plugin Path:** `~/Library/Audio/Plug-Ins/VST3/`
- **Evaluation:** 30-day demo (fully functional)

**Testing Requirements:**
- Create new project
- Add instrument track
- Browse and insert plugin
- Test modulation system
- Test automation
- Save/load project

### Windows

#### 1. Reaper (Windows)
- **Version:** 7.0+
- **Plugin Format:** VST3
- **Status:** ❌ Needs Windows build
- **Installation:** https://www.reaper.fm/download.php
- **Plugin Path:** `C:\Program Files\Common Files\VST3\`

#### 2. Ableton Live (Windows)
- **Version:** 11.3+
- **Plugin Format:** VST3
- **Status:** ❌ Needs Windows build
- **Installation:** https://www.ableton.com/en/trial/
- **Plugin Path:** `C:\Program Files\Common Files\VST3\`

#### 3. FL Studio
- **Version:** 21.0+
- **Plugin Format:** VST3
- **Status:** ❌ Needs Windows build
- **Installation:** https://www.image-line.com/fl-studio-download/
- **Plugin Path:** `C:\Program Files\Common Files\VST3\`

#### 4. Studio One
- **Version:** 6.0+
- **Plugin Format:** VST3
- **Status:** ❌ Needs Windows build
- **Installation:** https://www.presonus.com/products/studio-one
- **Plugin Path:** `C:\Program Files\Common Files\VST3\`

## Quick Installation

### macOS VST3 Installation
```bash
# Install all VST3 plugins
cp -r /Users/bretbouchard/apps/schill/white_room/juce_backend/*_plugin_build/build/*_artefacts/Release/VST3/*.vst3 ~/Library/Audio/Plug-Ins/VST3/

# Verify installation
ls ~/Library/Audio/Plug-Ins/VST3/
```

### AU Installation (Not Yet Built)
```bash
# Install all AU components
cp -r /Users/bretbouchard/apps/schill/white_room/juce_backend/*_plugin_build/build/*_artefacts/Release/AU/*.component ~/Library/Audio/Plug-Ins/Components/

# Validate with AU Lab (requires Xcode)
open -a "AU Lab"
```

## Testing Environment Setup

### Audio Device Configuration
- **Interface:** Built-in audio (for basic testing)
- **Sample Rate:** 44.1kHz, 48kHz, 96kHz
- **Buffer Size:** 64, 128, 256, 512, 1024
- **Bit Depth:** 24-bit

### Test Files Required
- MIDI file with various note velocities
- Audio file for effect plugins
- Test project for each DAW
- Preset files for preset management tests

### Test System Requirements
- **macOS:** 10.15+ (Catalina or later)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 5GB free space for DAWs + plugins
- **CPU:** Apple Silicon (arm64) for current builds

## DAW-Specific Testing Notes

### Logic Pro
- **AU Validation Required:** Use `auval` tool before testing
- **Automation:** Test in Track Arrange and Piano Roll
- **Presets:** Save as Logic Patch (.patch)
- **State:** Save project and reload to test state persistence

### Reaper
- **Plugin Cache:** Delete if plugin doesn't appear
  ```bash
  rm ~/Library/Application Support/REAPER/reaper-vstplugins64.ini
  ```
- **Automation:** Right-click parameter → Create Automation Envelope
- **Presets:** Use FX Preset browser
- **ReaScript:** Use `automation_scripts/reaper_tests.lua`

### Ableton Live
- **Plugin Scan:** Hold ⌘+Option during launch to rescan
- **Automation:** Draw automation in Arrangement view
- **Presets:** Use Browser → Categories → Plugins
- **Compatibility Check:** View → Status → Plug-ins

### Bitwig Studio
- **Scan:** Preferences → Plug-ins → Rescan
- **Automation:** Test with modulators
- **Presets:** Use Browser panel
- **Crash Logs:** `~/Library/Logs/DiagnosticReports/`

## Common Issues

### Plugins Not Appearing
1. **Wrong Plugin Path:** Check DAW VST3/AU preferences
2. **Wrong Architecture:** arm64 plugin on x86_64 DAW (or vice versa)
3. **Invalid Plugin:** Run AU Validator (macOS) or Plugin Inspector (Reaper)
4. **Cache Issue:** Delete DAW plugin cache and rescan

### Crashes on Load
1. **Incompatible OS Version:** Check minimum OS requirements
2. **Missing Dependencies:** Verify all JUCE frameworks are present
3. **Corrupted Install:** Reinstall plugin
4. **DAW Version:** Update to latest DAW version

### No Sound Output
1. **MIDI Input:** Check DAW MIDI track is armed
2. **Audio Output:** Verify correct audio device selected
3. **Plugin Parameters:** Check volume/gain parameters
4. **Buffer Size:** Try larger buffer size (512-1024)

## Test System Matrix

| DAW | Version | macOS AS | macOS Intel | Windows | Tested |
|-----|---------|----------|-------------|---------|--------|
| Logic Pro | 10.8+ | ⚠️ Need AU | ⚠️ Need AU+Intel | N/A | ❌ |
| Reaper | 7.0+ | ✅ VST3 Ready | ⚠️ Need Intel | ⚠️ Need Win | ❌ |
| Ableton Live | 11.3+ | ✅ VST3 Ready | ⚠️ Need Intel | ⚠️ Need Win | ❌ |
| GarageBand | 10.4+ | ⚠️ Need AU | ⚠️ Need AU+Intel | N/A | ❌ |
| Bitwig Studio | 5.0+ | ✅ VST3 Ready | ⚠️ Need Intel | ⚠️ Need Win | ❌ |

## Next Steps

1. **Install Reaper** (easiest to test, supports VST3)
2. **Copy VST3 plugins** to user plugin path
3. **Create test project** in Reaper
4. **Test plugin loading** for all 10 plugins
5. **Document results** in `results/` directory
6. **Build AU versions** for Logic Pro/GarageBand testing

---

**Last Updated:** 2026-01-15
**Status:** Setup phase - VST3 plugins ready for testing
**Next Action:** Install Reaper and test plugin loading
