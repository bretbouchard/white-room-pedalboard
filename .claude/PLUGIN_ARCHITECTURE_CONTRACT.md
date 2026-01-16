# 🎸 White Room Plugin Architecture - PERMANENT CONTRACT

**Status**: 🔒 **PERMANENT ARCHITECTURE RULE - MUST BE FOLLOWED**
**Effective**: 2026-01-16
**Version**: 1.0.0

---

## 🚨 **CRITICAL ARCHITECTURE RULES**

These rules are **NON-NEGOTIABLE** and must be followed for **EVERY** instrument and effect implementation.

---

## 📁 **Repository Structure**

### **Every Instrument/Effect MUST Have**:

1. **Its Own Git Repository**
   - Separate repo for each instrument/effect
   - Named after the instrument/effect (e.g., `biPhase`, `FilterGate`, `KaneMarcoAether`)
   - Hosted on GitHub: `https://github.com/bretbouchard/[NAME].git`

2. **Standard Folder Structure**:
```
[NAME]/
├── plugins/              ← REQUIRED ROOT FOLDER
│   ├── dsp/              ← Pure DSP implementation (no plugin wrapper)
│   ├── vst/              ← VST3 plugin build output
│   ├── au/               ← Audio Units build output
│   ├── clap/             ← CLAP plugin build output
│   ├── lv2/              ← LV2 plugin build output
│   ├── auv3/             ← iOS AUv3 build output
│   └── standalone/       ← Standalone application build output
├── include/              ← DSP header files
├── src/                  ← DSP implementation files
├── tests/                ← DSP test harness
├── presets/              ← Factory presets
├── CMakeLists.txt        ← Build configuration
└── README.md             ← Documentation
```

---

## 🔗 **Repository Hierarchy**

### **Parent-Child Relationship**

```
juce_backend/ (audio_agent_juce)
├── effects/              ← Child repositories
│   ├── biPhase/          ← https://github.com/bretbouchard/biPhase.git
│   ├── filtergate/       ← https://github.com/bretbouchard/FilterGate.git
│   ├── pedalboard/       ← https://github.com/bretbouchard/white-room-pedalboard.git
│   └── [EFFECT_NAME]/    ← https://github.com/bretbouchard/[EFFECT_NAME].git
└── instruments/          ← Child repositories
    ├── kane_marco/       ← https://github.com/bretbouchard/kane-marco-aether.git
    ├── giant_instruments/← https://github.com/bretbouchard/aether-giant-instruments.git
    └── [INSTRUMENT_NAME]/← https://github.com/bretbouchard/[INSTRUMENT_NAME].git
```

### **Exception: Pedalboard Individual Pedals**
- Pedalboard is a multi-effects plugin
- Individual pedals (Overdrive, Fuzz, Delay, Chorus) are **PART OF Pedalboard**
- They do **NOT** have separate repositories
- Bi-Phase is the **ONLY** exception (can be standalone or in pedalboard)

---

## 📦 **Plugin Formats**

### **Required Formats for EVERY Instrument/Effect**

All 7 formats MUST be built:

1. **DSP** (`plugins/dsp/`)
   - Pure DSP implementation
   - No AudioProcessor wrapper
   - Testable in isolation
   - 100% test coverage required

2. **VST3** (`plugins/vst/`)
   - Cross-platform (Windows, Mac, Linux)
   - Steinberg format
   - Most widely supported

3. **AU** (`plugins/au/`)
   - Mac only
   - Apple format
   - Required for Logic Pro, GarageBand, MainStage

4. **CLAP** (`plugins/clap/`)
   - New format (growing support)
   - Bitwig, Reaper (future)

5. **LV2** (`plugins/lv2/`)
   - Linux standard
   - Cross-platform
   - Reaper, Bitwig on Linux

6. **AUv3** (`plugins/auv3/`)
   - iOS only
   - Required for GarageBand iOS, Auria
   - Separate iOS build

7. **Standalone** (`plugins/standalone/`)
   - Desktop application
   - Live performance use
   - No DAW required

---

## 🏗️ **Implementation Workflow**

### **For ANY New Instrument/Effect**

**Step 1: Create Repository**
```bash
# Create new repo on GitHub
# URL: https://github.com/bretbouchard/[NAME].git

# Clone locally
git clone https://github.com/bretbouchard/[NAME].git
cd [NAME]
```

**Step 2: Create Folder Structure**
```bash
mkdir -p plugins/{dsp,vst,au,clap,lv2,auv3,standalone}
mkdir -p include src tests presets docs
```

**Step 3: Implement DSP First**
```bash
# Pure DSP implementation
include/[NAME]PureDSP.h
src/[NAME]PureDSP.cpp

# Test harness
tests/[NAME]TestHarness.cpp

# ALL TESTS MUST PASS 100% before proceeding
```

**Step 4: Create Plugin Wrapper**
```bash
# AudioProcessor wrapper
include/[NAME]Plugin.h
src/[NAME]Plugin.cpp

# UI editor
include/[NAME]Editor.h
src/[NAME]Editor.cpp
```

**Step 5: Configure Build System**
```bash
# CMakeLists.txt must build ALL 7 formats
set([NAME]_FORMATS "VST3;AU;CLAP;LV2;AUv3;Standalone")

# Each format builds to plugins/[format]/
```

**Step 6: Build All Formats**
```bash
# Build script
./build_all_formats.sh

# Output:
# plugins/dsp/     ← Pure DSP (testable)
# plugins/vst/     ← VST3 plugin
# plugins/au/      ← AU plugin
# plugins/clap/    ← CLAP plugin
# plugins/lv2/     ← LV2 plugin
# plugins/auv3/    ← iOS AUv3
# plugins/standalone/ ← Standalone app
```

**Step 7: Test in DAWs**
```bash
# Test ALL formats in target DAWs
# VST3: Cubase, Ableton, Reaper
# AU: Logic Pro, GarageBand, MainStage
# CLAP: Bitwig, Reaper (future)
# LV2: Reaper, Bitwig (Linux)
# AUv3: GarageBand iOS
# Standalone: Desktop
```

**Step 8: Commit and Push**
```bash
# Commit to own repository
git add .
git commit -m "feat: [NAME] complete plugin implementation - all 7 formats"
git push origin main
```

---

## 📋 **Checklist for EVERY Plugin**

Before considering ANY instrument/effect complete, ALL of these MUST be done:

### **Repository**
- [ ] Separate GitHub repository created
- [ ] Repository named correctly (e.g., `biPhase`, `FilterGate`)
- [ ] Remote URL set to `https://github.com/bretbouchard/[NAME].git`
- [ ] NOT pointing to `audio_agent_juce` (unless it's the parent)

### **Folder Structure**
- [ ] `plugins/dsp/` exists (pure DSP)
- [ ] `plugins/vst/` exists (VST3 build output)
- [ ] `plugins/au/` exists (AU build output)
- [ ] `plugins/clap/` exists (CLAP build output)
- [ ] `plugins/lv2/` exists (LV2 build output)
- [ ] `plugins/auv3/` exists (iOS AUv3 build output)
- [ ] `plugins/standalone/` exists (standalone app)

### **Implementation**
- [ ] Pure DSP 100% tested (all tests passing)
- [ ] AudioProcessor wrapper created
- [ ] UI editor created
- [ ] All 7 plugin formats built
- [ ] Presets created (minimum 8 factory presets)
- [ ] Documentation written

### **Testing**
- [ ] VST3 tested in Cubase/Ableton/Reaper
- [ ] AU tested in Logic Pro/GarageBand
- [ ] CLAP tested in Bitwig/Reaper
- [ ] LV2 tested in Reaper/Bitwig (Linux)
- [ ] AUv3 tested in GarageBand iOS
- [ ] Standalone tested on desktop

---

## 🚫 **FORBIDDEN PATTERNS**

### **NEVER Do This**:

1. ❌ Add instrument/effect to `audio_agent_juce` repo
   - Each must have its own repo

2. ❌ Skip plugin formats
   - ALL 7 formats required (VST3, AU, CLAP, LV2, AUv3, Standalone, DSP)

3. ❌ Build plugins outside `plugins/` folder
   - Must use `plugins/[format]/` structure

4. ❌ Implement plugin wrapper before DSP is 100% tested
   - DSP must be complete first

5. ❌ Forget to create separate repo for new instrument/effect
   - Every instrument/effect needs own repo

---

## 🔧 **Development Rules**

### **When Modifying Existing Plugins**

1. **Always work in the plugin's own repository**
   - `cd effects/[NAME]/` or `cd instruments/[NAME]/`
   - NOT in `juce_backend` root

2. **Build all formats every time**
   - Can't just build VST3
   - Must build ALL 7 formats

3. **Test ALL formats after changes**
   - Changing DSP affects all formats
   - Must verify all still work

4. **Commit to plugin's own repo**
   - NOT to `audio_agent_juce`
   - Each plugin versions independently

---

## 📊 **Current Status Audit**

### **Effects Repository Status**

| Effect | Own Repo | plugins/ Folder | All 7 Formats |
|--------|----------|-----------------|---------------|
| **Bi-Phase** | ✅ biPhase.git | ✅ | ⚠️ Only VST3/AU/Standalone |
| **FilterGate** | ✅ FilterGate.git | ❌ | ❌ |
| **Pedalboard** | ✅ white-room-pedalboard.git | ❌ | ⚠️ AU/LV2/Standalone (no VST3) |
| **Overdrive** | ❌ | ❌ | ❌ |
| **Fuzz** | ❌ | ❌ | ❌ |
| **Delay** | ❌ | ❌ | ❌ |
| **Chorus** | ❌ | ❌ | ❌ |

### **Instruments Repository Status**

| Instrument | Own Repo | plugins/ Folder | All 7 Formats |
|------------|----------|-----------------|---------------|
| **Kane Marco Aether** | ❌ | ❌ | ❌ |
| **Giant Instruments** | ❌ | ❌ | ❌ |
| **Drum Machine** | ❌ | ❌ | ❌ |
| **Nex Synth** | ❌ | ❌ | ❌ |
| **Sam Sampler** | ❌ | ❌ | ❌ |

---

## 🎯 **Immediate Action Items**

### **Phase 1: Fix Repository Structure (URGENT)**

1. **Bi-Phase**: ✅ Already has own repo
   - Add missing formats: CLAP, LV2, AUv3
   - Create `plugins/` folder structure
   - Move builds to `plugins/[format]/`

2. **FilterGate**:
   - Already has own repo ✅
   - Add `plugins/` folder
   - Build missing formats
   - Reorganize to `plugins/[format]/`

3. **Pedalboard**:
   - Create own repo: `white-room-pedalboard.git`
   - Add `plugins/` folder
   - Fix VST3 build
   - Build missing formats: CLAP, LV2, AUv3

4. **Individual Pedals**:
   - Keep in Pedalboard repo
   - Add to Pedalboard's `plugins/` folder

5. **All Instruments**:
   - Create separate repos for each
   - Add `plugins/` folder structure
   - Build all 7 formats

---

## 📝 **Implementation Template**

### **Copy This for Every New Plugin**

```bash
# 1. Create repository
gh repo create [NAME] --public
git clone https://github.com/bretbouchard/[NAME].git
cd [NAME]

# 2. Create structure
mkdir -p plugins/{dsp,vst,au,clap,lv2,auv3,standalone}
mkdir -p include src tests presets docs

# 3. Initialize git
git remote set-url origin https://github.com/bretbouchard/[NAME].git

# 4. Create README
cat > README.md << 'EOF'
# [NAME] - [DESCRIPTION]

Professional [instrument/effect] plugin for White Room.

## Formats
- VST3, AU, CLAP, LV2, AUv3 (iOS), Standalone

## Build
./build_all_formats.sh

## Installation
See INSTALL.md

## Presets
See presets/ folder

## Repository
https://github.com/bretbouchard/[NAME].git
EOF

# 5. Commit structure
git add .
git commit -m "chore: Initialize [NAME] repository with standard structure"
git push -u origin main
```

---

## 🤖 **AI Instructions**

### **For Claude/ChatGPT/etc**

**MANDATORY INSTRUCTIONS**:

1. **ALWAYS** check if instrument/effect has own repo before starting work
2. **NEVER** add to `audio_agent_juce` repo
3. **ALWAYS** use `plugins/[format]/` folder structure
4. **NEVER** skip plugin formats (all 7 required)
5. **ALWAYS** implement DSP first, then plugin wrapper
6. **NEVER** consider plugin complete without all 7 formats
7. **ALWAYS** commit to plugin's own repo
8. **NEVER** modify parent repo unless updating submodule reference

### **Pre-Flight Checklist**

Before implementing ANY instrument/effect, verify:

```python
if has_own_repository == False:
    create_repository()
    create_plugins_folder_structure()

if "plugins/" not in folder_structure:
    create_plugins_folder()

if len(build_formats) != 7:
    raise Exception("ALL 7 FORMATS REQUIRED")

if dsp_test_coverage != 100:
    raise Exception("DSP MUST BE 100% TESTED FIRST")

return True  # Ready to implement
```

---

## 📖 **References**

- **JUCE Plugin Development**: https://juce.com/
- **VST3 SDK**: https://steinberg.net/vst3sdk
- **AU Documentation**: https://developer.apple.com/documentation/audiounits
- **CLAP Specification**: https://cleveraudio.org/clap/
- **LV2 Specification**: https://lv2plug.in/
- **AUv3 Documentation**: https://developer.apple.com/auv3/

---

## 🔒 **CONTRACT ACCEPTANCE**

By working on White Room plugins, you agree to:

1. ✅ Follow this architecture for EVERY instrument/effect
2. ✅ Create separate repos for each instrument/effect
3. ✅ Build ALL 7 plugin formats
4. ✅ Use `plugins/[format]/` folder structure
5. ✅ Test DSP to 100% before plugin wrapper
6. ✅ Commit to instrument/effect's own repo
7. ✅ Never violate these rules without explicit written permission

---

**This contract is PERMANENT and applies to ALL future work.**

**Violations will result in immediate architectural debt and technical debt.**

**Created**: 2026-01-16
**Last Updated**: 2026-01-16
**Status**: 🔒 **PERMANENT - DO NOT CHANGE**

---

**Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
