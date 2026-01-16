# PluginInstance Pure Virtual Methods Implementation Plan

## Overview
PluginInstance class is currently abstract because it's missing implementations of 11 pure virtual methods from InstrumentInstance base class. This plan details how to implement each method.

## Missing Methods Analysis

### 1. Audio Processing Methods (2 methods)

#### 1.1 `int getLatencySamples() const override`
- **Purpose**: Return plugin's latency in samples
- **Implementation**: Delegate to wrapped juce::AudioPluginInstance
- **Code**: `return plugin->getLatencySamples();`

#### 1.2 `double getTailLengthSeconds() const override`
- **Purpose**: Return plugin's tail/reverb time in seconds
- **Implementation**: Delegate to wrapped juce::AudioPluginInstance
- **Code**: `return plugin->getTailLengthSeconds();`

### 2. State Management Methods (2 methods)

**STATUS**: Already declared but need `override` keyword
- Line 202: `juce::MemoryBlock getStateInformation() const` - NEEDS `override`
- Line 203: `void setStateInformation(const void* data, int sizeInBytes)` - NEEDS `override`

### 3. Preset Management Methods (2 methods)

#### 3.1 `bool loadPreset(const juce::MemoryBlock& presetData) override`
- **Purpose**: Load preset from memory block
- **Implementation**: Use setStateInformation() internally
- **Code**:
  ```cpp
  setStateInformation(presetData.getData(), presetData.getSize());
  return true;
  ```

#### 3.2 `juce::MemoryBlock savePreset(const juce::String& name) const override`
- **Purpose**: Save current state as preset with name
- **Implementation**: Use getStateInformation() internally
- **Code**:
  ```cpp
  juce::MemoryBlock preset;
  getStateInformation().copyTo(preset);
  return preset;
  ```
- **Note**: The `name` parameter could be stored in metadata for future use

### 4. UI-Related Methods (3 methods)

#### 4.1 `bool hasCustomUI() const override`
- **Purpose**: Check if plugin has custom UI
- **Implementation**: Use existing `hasNativeEditor()` method
- **Code**: `return hasNativeEditor();`

#### 4.2 `juce::String getCustomUIClassName() const override`
- **Purpose**: Get class name of custom UI
- **Implementation**: Return plugin's name or identifier
- **Code**: `return pluginIdentifier;`

#### 4.3 `std::unique_ptr<juce::Component> createCustomUI() override`
- **Purpose**: Create custom UI component
- **Implementation**: Return nullptr for now (plugin editors are handled separately)
- **Code**: `return nullptr;`
- **Future**: Could wrap juce::AudioProcessorEditor in a juce::Component

### 5. Metadata Methods (3 methods)

#### 5.1 `juce::String getType() const override`
- **Purpose**: Get instrument type description
- **Implementation**: Return format-specific type string
- **Code**:
  ```cpp
  switch (pluginFormat) {
      case PluginFormat::VST3: return "VST3 Plugin";
      case PluginFormat::AudioUnit: return "AudioUnit Plugin";
      case PluginFormat::AAX: return "AAX Plugin";
      default: return "External Plugin";
  }
  ```

#### 5.2 `juce::String getVersion() const override`
- **Purpose**: Get plugin version string
- **Implementation**: Get from plugin's state
- **Code**:
  ```cpp
  auto state = getPluginState();
  return state.version;
  ```

#### 5.3 `AudioFormat getAudioFormat() const override`
- **Purpose**: Get audio format configuration
- **Implementation**: Return current format based on plugin capabilities
- **Code**:
  ```cpp
  AudioFormat format;
  format.sampleRate = currentSampleRate;
  format.bufferSize = currentBufferSize;
  format.numChannels = plugin->getMainBusNumOutputChannels();
  format.bitDepth = 32; // Float
  return format;
  ```

## Implementation Order

### Phase 1: Add Method Declarations to Header
1. Add all 11 missing method declarations to PluginInstance.h
2. Mark all with `override` keyword
3. Add appropriate documentation comments

### Phase 2: Create Implementation File
1. Create `src/plugins/PluginInstance.cpp`
2. Implement all methods following the patterns above
3. Add necessary includes and error handling
4. Ensure thread-safety where needed

### Phase 3: Testing and Validation
1. Build to verify no compilation errors
2. Verify PluginInstance is no longer abstract
3. Test that plugin instances can be created successfully
4. Validate that methods return sensible values

## Implementation Details

### Thread Safety
- Most methods are const and just delegate to wrapped plugin
- No additional mutex locking needed (juce::AudioPluginInstance handles it)
- Exception: methods that modify internal state

### Error Handling
- Add nullptr checks for plugin pointer
- Return sensible defaults if plugin is null
- Log errors when appropriate

### Performance Considerations
- All methods should be fast (no blocking calls)
- Cache frequently accessed values if needed
- Avoid unnecessary allocations

## Files to Modify

1. **src/plugins/PluginInstance.h** - Add method declarations
2. **src/plugins/PluginInstance.cpp** - CREATE NEW FILE with implementations
3. **CMakeLists.txt** - Add PluginInstance.cpp to build

## Success Criteria

- [ ] All 11 methods declared with `override` in PluginInstance.h
- [ ] PluginInstance.cpp created with all implementations
- [ ] Build completes with no "abstract class" errors
- [ ] Plugin instances can be created successfully
- [ ] All methods return valid, non-crashing values

## Notes

- Many methods simply delegate to the wrapped juce::AudioPluginInstance
- Some methods (UI-related) may need enhancement in the future
- The `name` parameter in `savePreset` is not immediately useful but kept for API compatibility
- Consider adding preset metadata (name, author, tags) in future iterations
