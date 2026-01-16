# Platform - macOS (Desktop)

**Purpose:** macOS extensions and desktop-specific features

## Responsibilities

The macOS platform layer extends the tvOS platform with:
- File I/O for desktop workflows (save/load projects)
- Plugin hosting for DAW integration (optional)
- Advanced audio hardware support (multiple interfaces)
- Desktop UI integration
- Extended debugging tools

## Philosophy

**Additive, Not Disruptive:**
- ✅ Extend tvOS platform with macOS features
- ✅ Shared code stays in platform-agnostic layers
- ❌ Don't break tvOS compatibility
- ❌ Don't introduce platform-specific code in DSP

**Conditional Features:**
```cpp
#if TARGET_OS_MACOS
    // macOS-specific code
#else
    // tvOS fallback or assert
#endif
```

## macOS Extensions

### File I/O (Desktop Only)

```cpp
namespace Platform {
namespace macOS {

struct FileSystem {
    // Project save/load
    bool saveProject(const SongModel_v1& model, const char* filepath);
    bool loadProject(SongModel_v1& model, const char* filepath);

    // Preset management
    bool savePreset(const char* presetName, const char* jsonData);
    bool loadPreset(const char* presetName, char* jsonBuffer, size_t bufferSize);

    // Audio file export
    bool exportAudio(const char* filepath, const float* audio, size_t samples);
};

} // namespace macOS
} // namespace Platform
```

### Plugin Hosting (Optional)

```cpp
struct PluginHost {
    // VST3/AU hosting for DAW integration
    bool loadPlugin(const char* pluginPath);
    void processPlugin(AudioBuffer& buffer);
    void unloadPlugin();

    // NOT used on tvOS (compile-time guard)
#if TARGET_OS_MACOS
    // Implementation here
#endif
};
```

### Audio Hardware (Extended)

```cpp
struct AudioHardwareExtended : public Platform::tvOS::AudioHardware {
    // Multiple device support
    std::vector<std::string> listDevices();
    bool selectDevice(const char* deviceName);

    // Advanced configuration
    bool setBufferSize(size_t samples);
    bool setSampleRate(double sampleRate);

    // Low-latency mode
    bool enableLowLatencyMode(bool enable);
};
```

## Architecture

```
Platform/macos/
├── FileSystem.h              # File I/O (projects, presets, export)
├── FileSystem.cpp
├── PluginHost.h              # Optional plugin hosting
├── PluginHost.cpp
├── AudioHardwareExtended.h   # Extended hardware support
├── AudioHardwareExtended.cpp
├── DesktopIntegration.h      # UI glue, windowing
├── DesktopIntegration.cpp
├── DebugTools.h              # Advanced debugging
├── DebugTools.cpp
└── README.md
```

## Testing

Required tests (macOS only):
- Project save/load
- Preset browser functionality
- Audio export (WAV, FLAC)
- Plugin hosting (if implemented)
- Multi-device audio hardware

## Integration Points

**From tvOS platform:**
- Inherits AudioHardware base
- Extends with desktop features
- Falls back to tvOS behavior when feature not available

**From SDK:**
- File I/O for SongModel persistence
- Audio export for rendered output
- Plugin discovery for DAW integration

## Rules

- **Guard all platform-specific code** with `#if TARGET_OS_MACOS`
- **Don't break tvOS builds** - Platform code must compile for both targets
- **No platform logic in DSP** - Keep DSP pure
- **Test on both platforms** - Verify tvOS still works after macOS changes
- **Desktop features are optional** - Core audio path works the same on both platforms

## macOS Specifics

**Hardware:**
- Intel or Apple Silicon
- More memory available (can use larger buffers)
- Multiple audio interfaces supported
- Low-latency audio (64-128 samples)

**Audio:**
- Configurable sample rates (44.1kHz, 48kHz, 96kHz)
- Surround sound support (5.1, 7.1)
- Audio input available (microphone, line in)

**Features:**
- Project save/load
- Preset browser
- Plugin hosting (VST3, AU)
- Audio export/rendering
- Advanced UI (windows, menus)

## Status

- [ ] Folder structure created
- [ ] FileSystem interface designed
- [ ] PluginHost designed (optional)
- [ ] AudioHardwareExtended implemented
- [ ] Desktop integration implemented
- [ ] Tests passing
- [ ] tvOS compatibility verified

## Notes

macOS platform layer is NOT:
- Core DSP implementation (that's in instruments/, effects/, console/)
- Routing logic (that's in routing/)
- tvOS restrictions (that's in platform/tvos/)

macOS platform layer IS:
- Desktop extensions to tvOS platform
- File I/O for projects/presets
- Optional plugin hosting
- Advanced audio hardware
- Desktop UI integration

Created: December 30, 2025
Source: JUCE Backend Handoff Directive
