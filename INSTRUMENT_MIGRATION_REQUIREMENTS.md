# Instrument Migration Requirements

**Date**: 2026-01-16
**Status**: 🚨 **Requires Migration**
**Priority**: **HIGH** (same as effects)

---

## 🎹 Instruments Requiring Migration

Per the **Plugin Architecture Contract**, ALL instruments must follow the same rules as effects:

### ✅ Required Structure (Per Contract)

```
[INSTRUMENT_NAME]/
├── plugins/              ← REQUIRED ROOT FOLDER
│   ├── dsp/              ← Pure DSP (no wrapper)
│   ├── vst/              ← VST3 build output
│   ├── au/               ← AU build output
│   ├── clap/             ← CLAP build output
│   ├── lv2/              ← LV2 build output
│   ├── auv3/             ← iOS AUv3 build output
│   └── standalone/       ← Standalone app
├── include/              ← Headers
├── src/                  ← Implementation
├── tests/                ← 100% test coverage
├── presets/              ← Factory presets
├── CMakeLists.txt        ← Multi-format build config
├── build_plugin.sh       ← One-command build script
└── README.md             ← Architecture compliance notice
```

### ✅ Required Formats

ALL 7 formats MUST be built:
1. **DSP** - Pure, testable DSP implementation
2. **VST3** - Cross-platform (Steinberg)
3. **AU** - macOS (Logic/GarageBand)
4. **CLAP** - New format (Bitwig/Reaper)
5. **LV2** - Linux (Ardour/Mixbus)
6. **AUv3** - iOS (GarageBand iOS)
7. **Standalone** - Desktop app

---

## 📋 Current Instrument Inventory

### 1. **Kane Marco Aether** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/kane_marco/`

**Components**:
- Kane Marco Aether (main)
- Aether Giant Horns
- Aether Giant Voice
- Aether Giant Drums
- Kane Marco Aether String

**Current Plugin Formats**: AU + VST3 (partial)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/kane-marco-aether.git`

---

### 2. **Giant Instruments** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/giant_instruments/`

**Components**:
- Aether Giant Horns
- Aether Giant Voice
- Aether Giant Drums
- Aether Giant Percussion

**Current Plugin Formats**: AU + VST3 (partial)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/aether-giant-instruments.git`

---

### 3. **Drum Machine** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/drummachine/`

**Features**:
- Drum synthesis
- Pattern sequencer
- Preset kits

**Current Plugin Formats**: Unknown (needs verification)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/white-room-drum-machine.git`

---

### 4. **Nex Synth** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/Nex_synth/`

**Features**:
- Subtractive synthesis
- Multi-oscillator architecture

**Current Plugin Formats**: Unknown (needs verification)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/white-room-nex-synth.git`

---

### 5. **Sam Sampler** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/Sam_sampler/`

**Features**:
- Sample playback
- Multi-sample mapping

**Current Plugin Formats**: Unknown (needs verification)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/white-room-sam-sampler.git`

---

### 6. **Local Galaxy** (Complete - Needs Migration)

**Status**: Production Ready (needs architecture compliance)

**Current Location**: `juce_backend/instruments/localgal/`

**Features**:
- Granular synthesis
- Texture generation

**Current Plugin Formats**: Unknown (needs verification)

**Migration Required**:
- ❌ Separate repository
- ❌ plugins/ folder structure
- ❌ Multi-format CMakeLists.txt
- ❌ build_plugin.sh
- ❌ All 7 formats

**Target Repository**: `https://github.com/bretbouchard/local-galaxy.git`

---

## 🔄 Updated Migration Plan

### Original Plan (Effects Only)

| Phase | Plugin Type | Count | Priority |
|-------|-------------|-------|----------|
| Phase 1 | Effects | 5 | Priority 0 |
| Phase 2 | Effects | 3 | Priority 1 |
| Phase 3 | Effects | 5 | Priority 2 |

**Total Effects**: 13

### Updated Plan (Effects + Instruments)

| Phase | Type | Plugins | Priority | Estimated Time |
|-------|------|---------|----------|----------------|
| **Phase 0** | Architecture Fix | 0 | CRITICAL | 5-6 hours |
| **Phase 1** | Effects | 5 | Priority 0 | 2-3 days |
| **Phase 2** | Instruments | 5 | Priority 0 | 2-3 days |
| **Phase 3** | Effects | 3 | Priority 1 | 1-2 days |
| **Phase 4** | Instruments | 2 | Priority 1 | 1 day |
| **Phase 5** | Effects | 5 | Priority 2 | 2-3 days |

**Total Plugins**: 13 effects + 7 instruments = **20 plugins**

**Total Estimated Time**: ~12-18 days (after architecture fix)

---

## 📊 Instrument Migration Status

### Current State

| Instrument | Repository | plugins/ Folder | All 7 Formats | Status |
|------------|-----------|-----------------|---------------|--------|
| **Kane Marco Aether** | ❌ None | ❌ None | ⏳ 2/7 built | 🔴 0% |
| **Giant Instruments** | ❌ None | ❌ None | ⏳ 2/7 built | 🔴 0% |
| **Drum Machine** | ❌ None | ❌ None | ❓ Unknown | 🔴 0% |
| **Nex Synth** | ❌ None | ❌ None | ❓ Unknown | 🔴 0% |
| **Sam Sampler** | ❌ None | ❌ None | ❓ Unknown | 🔴 0% |
| **Local Galaxy** | ❌ None | ❌ None | ❓ Unknown | 🔴 0% |

**Instrument Migration Progress**: 0% (0/6 instruments)

---

## 🚨 Critical Architecture Issue (Same as Effects)

### Current Structure (WRONG)

```
white_room/
└── juce_backend/                    (submodule)
    └── instruments/
        ├── kane_marco/               (directory ❌)
        ├── giant_instruments/        (directory ❌)
        ├── drummachine/              (directory ❌)
        ├── Nex_synth/                (directory ❌)
        ├── Sam_sampler/              (directory ❌)
        └── localgal/                 (directory ❌)
```

### Required Structure (PER CONTRACT)

```
white_room/
├── juce_backend/                    (submodule - shared code only)
└── instruments/
    ├── kane_marco_aether/           (separate submodule ✅)
    ├── giant_instruments/           (separate submodule ✅)
    ├── drum_machine/                (separate submodule ✅)
    ├── nex_synth/                   (separate submodule ✅)
    ├── sam_sampler/                 (separate submodule ✅)
    └── local_galaxy/                (separate submodule ✅)
```

**Impact**:
- ❌ Cannot version instruments independently
- ❌ Cannot release instruments separately
- ❌ Instrument changes require committing to juce_backend
- ❌ Violates Plugin Architecture Contract

---

## 🔧 Instrument Migration Procedure

### Step 1: Extract Instrument to Separate Repository

```bash
# === CONFIGURATION ===
INSTRUMENT_NAME="kane_marco_aether"
INSTRUMENT_DIR="kane_marco"
GITHUB_REPO="https://github.com/bretbouchard/kane-marco-aether.git"

# === STEP 1: Create repository ===
cd /Users/bretbouchard/apps/schill
mkdir -p temp_instrument_extraction
cd temp_instrument_extraction

# === STEP 2: Clone and copy ===
mkdir ${INSTRUMENT_NAME}
cd ${INSTRUMENT_NAME}
git init

# Copy files
cp -r ../../white_room/juce_backend/instruments/${INSTRUMENT_DIR}/* .

# === STEP 3: Create plugins/ folder ===
mkdir -p plugins/{dsp,vst,au,clap,lv2,auv3,standalone}

# Copy DSP to plugins/dsp/
cp -r include src tests presets docs plugins/dsp/

# === STEP 4: Create CMakeLists.txt ===
# (Use Bi-Phase or FilterGate as template)
# Update for instrument-specific parameters

# === STEP 5: Create build_plugin.sh ===
# (Use Bi-Phase or FilterGate as template)

# === STEP 6: Update README.md ===
# Add architecture compliance notice

# === STEP 7: Commit and push ===
git add -A
git commit -m "feat: Initialize ${INSTRUMENT_NAME} with standard plugins/ structure

Per White Room Plugin Architecture Contract:

✅ Separate repository: ${GITHUB_REPO}
✅ Standard plugins/ folder with all 7 formats
✅ Multi-format build configuration
✅ One-command build script

See: .claude/PLUGIN_ARCHITECTURE_CONTRACT.md

Generated with Claude Code via Happy"

git branch -M main
git remote add origin ${GITHUB_REPO}
git push -u origin main

cd /Users/bretbouchard/apps/schill/white_room
```

### Step 2: Add as Submodule (After Architecture Fix)

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Create instruments/ directory (if not exists)
mkdir -p instruments

cd instruments

# Add instrument as submodule
git submodule add ${GITHUB_REPO} ${INSTRUMENT_NAME}

# Commit
cd ..
git add instruments/ .gitmodules
git commit -m "feat: Add ${INSTRUMENT_NAME} as separate submodule

Per White Room Plugin Architecture Contract, ${INSTRUMENT_NAME} is now a separate submodule.

Repository: ${GITHUB_REPO}"
```

---

## 📝 Migration Template

For each instrument, follow this checklist:

### Pre-Migration Checklist
- [ ] Verify instrument has DSP implementation
- [ ] Verify instrument has 100% test coverage
- [ ] Create GitHub repository
- [ ] Document current plugin formats

### Migration Checklist
- [ ] Extract to separate repository
- [ ] Create plugins/ folder structure
- [ ] Copy DSP to plugins/dsp/
- [ ] Create CMakeLists.txt (multi-format)
- [ ] Create build_plugin.sh
- [ ] Update README.md with architecture compliance
- [ ] Create .claude/PLUGIN_ARCHITECTURE_COMPLIANCE.md
- [ ] Commit and push to main

### Post-Migration Checklist
- [ ] Add as submodule to white_room
- [ ] Update .gitmodules
- [ ] Test all 7 format builds
- [ ] Test plugin loading in DAWs
- [ ] Validate with pluginval
- [ ] Update PLUGIN_MIGRATION_STATUS.md

---

## 🎯 Instrument Migration Timeline

### After Architecture Fix Complete

**Week 1**: Instrument Phase 1 (Priority 0)
- Day 1-2: Kane Marco Aether
- Day 3-4: Giant Instruments
- Day 5: Drum Machine

**Week 2**: Instrument Phase 2 (Priority 1)
- Day 1: Nex Synth
- Day 2: Sam Sampler
- Day 3: Local Galaxy
- Day 4-5: Testing and validation

**Estimated Total**: 6-8 instruments in ~7-9 days

---

## 📚 Documentation to Update

After each instrument migration, update:

1. **PLUGIN_MIGRATION_STATUS.md**
   - Add instrument to tracking table
   - Update progress percentage

2. **INSTRUMENTS_EFFECTS_STATUS_REPORT.md**
   - Update instrument status
   - Note architecture compliance

3. **Create Individual Instrument Report**
   - `[INSTRUMENT_NAME]_MIGRATION_COMPLETE.md`
   - Document implementation details
   - List all 7 formats built

---

## 🎉 Success Criteria

Instrument migration is complete when:

- [ ] All 6 instruments have separate GitHub repositories
- [ ] All 6 instruments are submodules of white_room
- [ ] All 6 instruments have standard plugins/ folder structure
- [ ] All 6 instruments build successfully with ./build_plugin.sh
- [ ] All 6 instruments load in DAWs (Logic, Reaper, Bitwig)
- [ ] All 6 instruments pass plugin validation
- [ ] All 6 instruments have 100% test coverage
- [ ] Zero merge conflicts
- [ ] Fresh clone works: git clone --recurse-submodules

---

## 🚀 Next Steps

1. **⏸️ PAUSE** instrument migration
2. **🔧 EXECUTE** Submodule Architecture Fix (5-6 hours)
3. **✅ VERIFY** architecture fix works
4. **▶️ RESUME** with Instrument Phase 1 (Kane Marco Aether first)

---

**Document Created**: 2026-01-16
**Status**: 🚨 **READY FOR MIGRATION** (after architecture fix)
**Priority**: **HIGH** (same as effects)

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
