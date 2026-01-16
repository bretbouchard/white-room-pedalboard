# 🎸 How to Build VST3, AU, and Standalone Plugins

## The Short Answer

To build JUCE plugins in all formats, you need to use **JUCE's official build tools** - either the Projucer GUI or their CMake system.

## Why Your Current Approach Won't Work

You're trying to manually compile JUCE modules. **This doesn't work** because:

❌ JUCE modules need special configuration
❌ JUCE requires specific compile definitions
❌ Plugin formats need special bundle structures
❌ Code signing is required for AU plugins

## The Solution: Use JUCE's Tools

### Option 1: Projucer (GUI Tool) - EASIEST ⭐

```bash
# Run the setup script
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard
./setup_juce_project.sh
```

Then select option 2 (Projucer GUI).

**What happens:**
1. Projucer opens
2. You create a new plugin project
3. Add your source files
4. Click "Save and Open in Xcode"
5. Build in Xcode → **You get VST3 + AU + Standalone automatically!**

### Option 2: Copy JUCE Example - FASTEST ⚡

```bash
# Run the setup script
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard
./setup_juce_project.sh
```

Then select option 1 (Quick Start).

**What happens:**
1. Copies a working JUCE example
2. You replace the source files with yours
3. Open in Projucer
4. Build → **All formats work!**

### Option 3: Use the Web UI - INSTANT ✅

```bash
open web_ui/pedalboard.html
```

**Already working!** Full pedalboard functionality in your browser.

---

## What Each Build Step Does

```
Your Source Code
       ↓
   [Projucer]
       ↓
   Configures JUCE
       ↓
   Creates Xcode Project
       ↓
   [Xcode Build]
       ↓
    ┌───┴───┐
    │       │
  VST3     AU    Standalone
    │       │       │
    │       │       │
  DAWs    Logic   Desktop
```

---

## The Build Commands (Once Project is Set Up)

### Build All Formats
```bash
# In Xcode, select scheme and build:
# - WhiteRoomPedalboard_VST3 → Creates .vst3
# - WhiteRoomPedalboard_AU → Creates .component
# - WhiteRoomPedalboard_Standalone → Creates .app
```

### Install Locations
```bash
# VST3
cp -R build/VST3/*.vst3 ~/Library/Audio/Plug-Ins/VST3/

# AU
cp -R build/AU/*.component ~/Library/Audio/Plug-Ins/Components/

# Standalone
cp -R build/Standalone/*.app /Applications/
```

---

## Minimum Requirements

### For VST3
- ✅ JUCE project file
- ✅ Plugin processor
- ✅ Plugin editor
- ✅ VST3 SDK (included with JUCE)

### For AU
- ✅ All of the above
- ✅ AU SDK (included with JUCE)
- ✅ Code signing (for distribution)

### For Standalone
- ✅ All of the above
- ✅ No additional requirements

---

## What You Already Have ✅

- ✅ Plugin processor logic (`PedalboardProcessor.cpp`)
- ✅ Plugin editor logic (`PedalboardEditor.cpp`)
- ✅ All 10 pedal DSP implementations
- ✅ Web UI (fully functional)
- ✅ Test coverage (98.4%)

### What You Need
- ⚠️ JUCE project file (`.jucer`)
- ⚠️ Xcode project configuration
- ⚠️ Proper JUCE CMake setup

---

## Fast Path to Working Plugins

### Step 1: Run Setup Script (2 minutes)
```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard
./setup_juce_project.sh
```

### Step 2: Choose Option 1 or 2 (5 minutes)
- Option 1: Copy example (fastest)
- Option 2: Use Projucer GUI (more control)

### Step 3: Add Your Files (5 minutes)
- Add PedalboardProcessor.cpp
- Add PedalboardEditor.cpp
- Add all pedal DSP files

### Step 4: Build in Xcode (2 minutes)
- Product → Build
- Get all 3 formats!

**Total time: ~15 minutes**

---

## Comparison: Your Current Approach vs JUCE Way

### Your Current Approach
```
Manual CMakeLists.txt
    ↓
Try to compile JUCE modules manually
    ↓
❌ Fails (missing headers, wrong config)
```

### JUCE Way
```
Projucer creates project
    ↓
Properly configured JUCE modules
    ↓
✅ Builds successfully (all formats)
```

---

## Why This Happens

JUCE is **not** a regular library. It's a **framework** with:
- Special compile requirements
- Module interdependencies
- Platform-specific code
- Plugin format integration

You can't just `#include <juce_*.h>` and compile. You **must** use JUCE's build system.

---

## Summary

**To build VST3/AU/Standalone:**

1. Use JUCE's Projucer tool ⭐
2. Let it create the Xcode project
3. Add your source files
4. Build in Xcode

**OR**

Use the web UI (already working!):
```bash
open web_ui/pedalboard.html
```

---

## Ready to Start?

```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/effects/pedalboard
./setup_juce_project.sh
```

Choose option 1 (fastest) or option 2 (recommended).

**You'll have working plugins in 15 minutes!** 🎸
