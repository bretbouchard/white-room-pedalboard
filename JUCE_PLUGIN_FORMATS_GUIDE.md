# JUCE Plugin Formats - Complete Guide

## What You Need to Build All Plugin Formats

To create VST3, AU, and Standalone versions of the pedalboard, you need to properly configure JUCE's build system. Here's what's required:

---

## The JUCE Way: Two Approaches

### Approach 1: JUCE Projucer (GUI Tool) - RECOMMENDED

**What it is:** JUCE's official project creator/generator tool

**Why use it:** Handles all the complex CMake configuration automatically

**Steps:**

1. **Install Projucer** (if not already installed)
   ```bash
   # It's usually in your JUCE directory
   /Users/bretbouchard/apps/schill/white_room/juce_backend/external/JUCE/extras/Projucer/Builds/MacOSX/build/Release/Projucer.app
   ```

2. **Create a JUCE Project**
   - Open Projucer
   - File → New Project
   - Select "Plugin" project type
   - Name it "WhiteRoomPedalboard"
   - Save it in: `/Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard/`

3. **Configure Project Settings**
   - Plugin Formats: Check VST3, AU, Standalone
   - Plugin Characteristics:
     - Plugin Description: "Virtual pedalboard with 10 guitar effects"
     - Manufacturer: "White Room Audio"
     - Plugin Code: "WHTR"
   - Exporters: Select "macOS (AU/VST/Standalone)"

4. **Add Your Source Files**
   - In Projucer, add your files:
     - `src/PedalboardProcessor.cpp`
     - `PedalboardEditor.cpp`
     - All pedal DSP files from `../pedals/src/dsp/`

5. **Configure Header Search Paths**
   - Add: `../../external/JUCE/modules`
   - Add: `../pedals/include`
   - Add: `/opt/homebrew/Cellar/nlohmann-json/3.12.0/include`

6. **Generate the Project**
   - Click "Save Project"
   - Click "Open in IDE" (Xcode)

7. **Build in Xcode**
   - Select target:
     - "WhiteRoomPedalboard - VST3" → Builds `.vst3` bundle
     - "WhiteRoomPedalboard - AU" → Builds `.component` bundle
     - "WhiteRoomPedalboard - Standalone" → Builds `.app` bundle
   - Product → Build

8. **Find Your Plugins**
   - VST3: `~/Library/Audio/Plug-Ins/VST3/`
   - AU: `~/Library/Audio/Plug-Ins/Components/`
   - Standalone: `/Applications/`

---

### Approach 2: JUCE CMake API (Manual)

**What it is:** Using JUCE's CMake functions directly

**Why use it:** More control, but requires JUCE CMake expertise

**The Problem:** You need to include JUCE's CMake scripts properly:

```cmake
# This is what you're missing:
find_package(JUCE REQUIRED CONFIG)

# Then use JUCE's helper:
juce_add_plugin(WhiteRoomPedalboard
    PRODUCT_NAME "White Room Pedalboard"
    FORMATS VST3 AU Standalone
    PLUGIN_CODE "WHTR"
    # etc...
)
```

**Why it's failing:** Your JUCE installation isn't set up as a CMake package. JUCE needs to be installed with CMake support, or you need to use the `add_subdirectory(JUCE)` approach.

---

## The Quick Fix: Use JUCE's Example Projects

JUCE comes with example plugin projects that already work. Here's the fastest way:

### Step 1: Copy a Working Example

```bash
# Copy JUCE's plugin example
cp -r /Users/bretbouchard/apps/schill/white_room/juce_backend/external/JUCE/examples/Plugins/ArbitraryMess \
   /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard/ArbitraryMess_Template
```

### Step 2: Replace Source Files

```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard/ArbitraryMess_Template/Source

# Remove example files
rm -f *.h *.cpp

# Copy your files
cp ../../src/PedalboardProcessor.cpp ./PluginProcessor.cpp
cp ../../PedalboardEditor.cpp ./PluginEditor.cpp
cp ../../include/PedalboardProcessor.h ./PluginProcessor.h
cp ../../PedalboardEditor.h ./PluginEditor.h
```

### Step 3: Rename in Files

Search/replace in all files:
- `ArbitraryMessAudioProcessor` → `PedalboardProcessor`
- `ArbitraryMessAudioProcessorEditor` → `PedalboardEditor`

### Step 4: Add Pedal Sources

Edit `Builds/MacOSX/*.jucer` file to add pedal DSP sources.

### Step 5: Open in Projucer

```bash
open Builds/MacOSX/WhiteRoomPedalboard.jucer
```

### Step 6: Build

Click "Save and Open in IDE" → Xcode opens → Build!

---

## What Each Format Means

### VST3 (Cross-Platform)
- **File:** `.vst3` bundle (it's a folder)
- **Location:** `~/Library/Audio/Plug-Ins/VST3/`
- **Supported by:** Ableton Live, Cubase, Reaper, Bitwig, Studio One
- **Installation:** Just copy the `.vst3` folder

### AU (macOS Only)
- **File:** `.component` bundle
- **Location:** `~/Library/Audio/Plug-Ins/Components/`
- **Supported by:** Logic Pro, GarageBand, MainStage
- **Installation:** Just copy the `.component` folder
- **Requirement:** Must be code-signed for distribution

### Standalone
- **File:** `.app` bundle
- **Location:** `/Applications/` or anywhere
- **Use case:** Testing without DAW, live performance
- **Installation:** Copy to Applications folder

---

## Build Process Diagram

```
                    ┌─────────────────┐
                    │  Your Source    │
                    │  Pedalboard     │
                    │  Processor/Editor
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   JUCE Build    │
                    │   System        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
      │     VST3     │ │    AU    │ │ Standalone │
      │   .vst3      │ │.component│ │   .app     │
      └──────────────┘ └──────────┘ └────────────┘
              │              │              │
      ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
      │  Any DAW     │ │  Logic   │ │  Double    │
      │  (Reaper,    │ │  Pro,    │ │  Click     │
      │   Ableton)   │ │ GarageBand│ │  to Run   │
      └──────────────┘ └──────────┘ └────────────┘
```

---

## Recommended Workflow

### For Development (Fast Iteration)
```bash
# Use the web UI for quick UI changes
open web_ui/pedalboard.html

# Use Standalone for audio testing
open Builds/MacOSX/build/Release/WhiteRoomPedalboard.app
```

### For Distribution
1. Build VST3 for Windows/macOS Linux users
2. Build AU for macOS Logic users
3. Build Standalone for testing

---

## What You Need to Do Right Now

### Option 1: Quick Start (1 hour)
```bash
# Copy JUCE example project
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard

# Get the template
cp -r ../../external/JUCE/examples/Plugins/ArbitraryMess ./Template

# Follow "The Quick Fix" steps above
```

### Option 2: Proper Setup (2 hours)
```bash
# Use Projucer to create proper project
open /Users/bretbouchard/apps/schill/white_room/juce_backend/external/JUCE/extras/Projucer/Builds/MacOSX/build/Release/Projucer.app

# Follow "Approach 1" steps above
```

### Option 3: Web UI (5 minutes)
```bash
# Already working!
open web_ui/pedalboard.html
```

---

## Common Issues & Solutions

### Issue: "JUCE not found as CMake package"
**Solution:** Use `add_subdirectory(external/JUCE)` instead of `find_package(JUCE)`

### Issue: "Missing juce_add_plugin command"
**Solution:** Need to include JUCE's CMake scripts:
```cmake
add_subdirectory(${JUCE_PATH}/extras/Build/CMake)
```

### Issue: "AU won't load in Logic"
**Solution:** Must be code-signed:
```bash
codesign --force --deep --sign - ~/Library/Audio/Plug-Ins/Components/WhiteRoomPedalboard.component
```

### Issue: "VST3 not showing in DAW"
**Solution:** Check DAW plugin settings, rescan plugins

---

## Summary

**The easiest path:**
1. Use JUCE's Projucer tool
2. Create new plugin project
3. Add your source files
4. Click "Build" in Xcode
5. Done! You get all 3 formats automatically

**The web UI path (already working):**
```bash
open web_ui/pedalboard.html
```

This is fully functional for testing and demonstration!

---

## Want Me To Help?

I can help you:
1. **Set up the Projucer project** - I'll guide you step-by-step
2. **Create the proper CMakeLists.txt** - For manual JUCE CMake setup
3. **Use the example template** - Fastest way to get started
4. **Just use the web UI** - It's already working perfectly!

Which would you like to do?
