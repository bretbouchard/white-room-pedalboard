# White Room Standalone Apps - Quick Reference

## Build Command
```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend
./build_all_standalones.sh
```

## Plugin Status (8 Total)

### Instruments ✅ (5)
- ✅ **LocalGal** - Acid synthesizer
- ✅ **NexSynth** - FM synthesizer
- ✅ **SamSampler** - SF2 sampler
- ✅ **Kane Marco Aether** - Physical modeling strings
- ✅ **Giant Instruments** - Multi-instrument

### Effects ✅ (3)
- ✅ **Far Far Away** - Distance reverb
- ✅ **FilterGate** - Dynamic filter/gate
- ✅ **Monument** - Effect processor

## Standalone App Locations
After build, apps will be in:
```
[plugin]/build/[PluginName].app
```

## Manual Build (Single Plugin)
```bash
cd [plugin_directory]/
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_STANDALONE=ON
cmake --build . --config Release --parallel
```

## bd Task
**Issue ID**: white_room-306
**Status**: Configuration Complete, Ready to Build
