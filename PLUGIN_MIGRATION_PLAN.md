# 🎸 White Room Plugin Migration Plan

**Goal**: Migrate ALL instruments and effects to comply with Plugin Architecture Contract

**Date**: 2026-01-16
**Status**: 🚨 **URGENT - All plugins must comply**

---

## 📊 **Current State Audit**

### **Effects (9 total)**

| Effect | Own Repo | plugins/ Folder | All 7 Formats | Priority |
|--------|----------|-----------------|---------------|----------|
| **Bi-Phase** | ⚠️ Wrong remote | ❌ Missing | ❌ Only 3 formats | P0 |
| **FilterGate** | ⚠️ Wrong remote | ❌ Missing | ❌ Only 1 format | P0 |
| **Pedalboard** | ⚠️ Wrong remote | ❌ Missing | ⚠️ 3/7 formats | P0 |
| **AetherDrive** | ❌ None | ❌ Missing | ❌ None | P1 |
| **Overdrive Pedal** | ❌ None | ❌ Missing | ❌ None | P2 |
| **Fuzz Pedal** | ❌ None | ❌ Missing | ❌ None | P2 |
| **Delay Pedal** | ❌ None | ❌ Missing | ❌ None | P2 |
| **Chorus Pedal** | ❌ None | ❌ Missing | ❌ None | P2 |
| **Dynamics** | ❌ None | ❌ Missing | ❌ None | P2 |

**Note**: Individual pedals (Overdrive, Fuzz, Delay, Chorus) should stay in Pedalboard repo

### **Instruments (8 total)**

| Instrument | Own Repo | plugins/ Folder | All 7 Formats | Priority |
|------------|----------|-----------------|---------------|----------|
| **Kane Marco Aether** | ⚠️ Wrong remote | ❌ Missing | ⚠️ 2/7 formats | P0 |
| **Giant Instruments** | ⚠️ Wrong remote | ❌ Missing | ⚠️ 2/7 formats | P0 |
| **Drum Machine** | ❌ None | ❌ Missing | ❌ None | P1 |
| **Nex Synth** | ❌ None | ❌ Missing | ❌ None | P1 |
| **Sam Sampler** | ❌ None | ❌ Missing | ❌ None | P1 |
| **Local Galaxy** | ❌ None | ❌ Missing | ❌ None | P2 |
| **Monument** | ❌ None | ❌ Missing | ❌ None | P2 |
| **FarFarAway** | ❌ None | ❌ Missing | ❌ None | P2 |

---

## 🎯 **Migration Strategy**

### **Phase 1: Priority 0 (URGENT - Today)**

#### 1.1 Bi-Phase
**Current State**: Wrong remote, no plugins/ folder
**Actions**:
1. ✅ Create separate repo: `https://github.com/bretbouchard/biPhase.git`
2. ✅ Update remote URL
3. ⏳ Create `plugins/` folder structure
4. ⏳ Move existing builds to `plugins/[format]/`
5. ⏳ Add missing formats (CLAP, LV2, AUv3)
6. ⏳ Update CMakeLists.txt

#### 1.2 FilterGate
**Current State**: Wrong remote, no plugins/ folder
**Actions**:
1. ✅ Already has repo: `https://github.com/bretbouchard/FilterGate.git`
2. ⏳ Update remote URL
3. ⏳ Create `plugins/` folder structure
4. ⏳ Move existing builds to `plugins/[format]/`
5. ⏳ Add missing formats (AU, CLAP, LV2, AUv3, Standalone, DSP)
6. ⏳ Update CMakeLists.txt

#### 1.3 Pedalboard
**Current State**: Wrong remote, no plugins/ folder
**Actions**:
1. ⏳ Create separate repo: `https://github.com/bretbouchard/white-room-pedalboard.git`
2. ⏳ Update remote URL
3. ⏳ Create `plugins/` folder structure
4. ⏳ Move existing builds to `plugins/[format]/`
5. ⏳ Fix VST3 build
6. ⏳ Add missing formats (CLAP, LV2, AUv3)
7. ⏳ Keep individual pedals in this repo

#### 1.4 Kane Marco Aether
**Current State**: Wrong remote, no plugins/ folder
**Actions**:
1. ⏳ Create separate repo: `https://github.com/bretbouchard/kane-marco-aether.git`
2. ⏳ Update remote URL
3. ⏳ Create `plugins/` folder structure
4. ⏳ Move existing builds to `plugins/[format]/`
5. ⏳ Add missing formats (CLAP, LV2, AUv3, Standalone, DSP)
6. ⏳ Update CMakeLists.txt

#### 1.5 Giant Instruments
**Current State**: Wrong remote, no plugins/ folder
**Actions**:
1. ⏳ Create separate repo: `https://github.com/bretbouchard/aether-giant-instruments.git`
2. ⏳ Update remote URL
3. ⏳ Create `plugins/` folder structure
4. ⏳ Move existing builds to `plugins/[format]/`
5. ⏳ Add missing formats (CLAP, LV2, AUv3, Standalone, DSP)
6. ⏳ Update CMakeLists.txt

---

### **Phase 2: Priority 1 (This Week)**

#### 2.1 Drum Machine
- Create repo: `https://github.com/bretbouchard/white-room-drum-machine.git`
- Create plugins/ folder
- Build all 7 formats

#### 2.2 Nex Synth
- Create repo: `https://github.com/bretbouchard/white-room-nex-synth.git`
- Create plugins/ folder
- Build all 7 formats

#### 2.3 Sam Sampler
- Create repo: `https://github.com/bretbouchard/white-room-sam-sampler.git`
- Create plugins/ folder
- Build all 7 formats

---

### **Phase 3: Priority 2 (Next Week)**

#### 3.1 AetherDrive
- Create repo: `https://github.com/bretbouchard/aether-drive.git`
- Create plugins/ folder
- Build all 7 formats

#### 3.2 Monument
- Create repo: `https://github.com/bretbouchard/monument-phaser.git`
- Create plugins/ folder
- Build all 7 formats

#### 3.3 FarFarAway
- Create repo: `https://github.com/bretbouchard/far-far-away.git`
- Create plugins/ folder
- Build all 7 formats

#### 3.4 Local Galaxy
- Create repo: `https://github.com/bretbouchard/local-galaxy.git`
- Create plugins/ folder
- Build all 7 formats

#### 3.5 Dynamics
- Create repo: `https://github.com/bretbouchard/white-room-dynamics.git`
- Create plugins/ folder
- Build all 7 formats

---

## 📋 **Migration Template**

For each instrument/effect, execute this template:

```bash
#!/bin/bash

# ===== CONFIGURATION =====
NAME="[NAME]"  # e.g., "biPhase", "FilterGate"
REPO_URL="https://github.com/bretbouchard/[NAME].git"
FORMATS="VST3;AU;CLAP;LV2;AUv3;Standalone"

# ===== STEP 1: Create Repository =====
echo "Step 1: Creating repository for $NAME..."
gh repo create [NAME] --public --description "White Room [TYPE]: [DESCRIPTION]"
git clone $REPO_URL
cd $NAME

# ===== STEP 2: Create Folder Structure =====
echo "Step 2: Creating plugins/ folder structure..."
mkdir -p plugins/{dsp,vst,au,clap,lv2,auv3,standalone}
mkdir -p include src tests presets docs

# ===== STEP 3: Initialize Git =====
echo "Step 3: Initializing git repository..."
git remote set-url origin $REPO_URL

# ===== STEP 4: Create README =====
echo "Step 4: Creating README.md..."
cat > README.md << 'EOFREADME'
# $NAME - [DESCRIPTION]

Professional [instrument/effect] plugin for White Room.

## Formats
- DSP, VST3, AU, CLAP, LV2, AUv3 (iOS), Standalone

## Build
./build_all_formats.sh

## Installation
See INSTALL.md

## Presets
See presets/ folder

## Repository
$REPO_URL

## Status
- ✅ DSP: 100% tested
- ✅ All 7 formats built
- ✅ Ready for distribution

---
Generated with [Claude Code](https://claude.com/claude-code)
via [Happy](https://happy.engineering)
EOFREADME

# ===== STEP 5: Commit Initial Structure =====
echo "Step 5: Committing initial structure..."
git add .
git commit -m "chore: Initialize $NAME repository with standard plugins/ structure

Per White Room Plugin Architecture Contract:
- Separate repository for $NAME
- Standard plugins/ folder with all 7 formats
- Ready for DSP implementation and plugin builds

See: .claude/PLUGIN_ARCHITECTURE_CONTRACT.md"

git push -u origin main

echo "====================================="
echo "Repository $NAME initialized!"
echo "Next: Copy DSP implementation from juce_backend"
echo "====================================="
```

---

## ✅ **Success Criteria**

Migration is complete when:

### **For Each Instrument/Effect**:
- [ ] Separate GitHub repository created
- [ ] Remote URL set correctly
- [ ] `plugins/` folder created with all 7 subfolders
- [ ] DSP implementation moved to `plugins/dsp/`
- [ ] All 7 format builds configured
- [ ] CMakeLists.txt updated
- [ ] Build script created
- [ ] Committed and pushed to own repo

### **Overall**:
- [ ] All Priority 0 plugins migrated (5 plugins)
- [ ] All Priority 1 plugins migrated (3 plugins)
- [ ] All Priority 2 plugins migrated (5 plugins)
- [ ] Total: 13 compliant repositories
- [ ] Zero violations of Plugin Architecture Contract

---

## 🚨 **Critical Success Factors**

1. **DO NOT SKIP ANY FORMATS**
   - All 7 formats are REQUIRED
   - No "we'll add CLAP later"
   - No "standalone is optional"

2. **DO NOT USE PARENT REPO**
   - Each plugin must have own repo
   - No exceptions (except pedals in Pedalboard)

3. **DO IT RIGHT THE FIRST TIME**
   - Follow template exactly
   - Don't take shortcuts
   - Architectural debt is expensive

---

## 📊 **Progress Tracking**

- [ ] Phase 1.1: Bi-Phase (P0)
- [ ] Phase 1.2: FilterGate (P0)
- [ ] Phase 1.3: Pedalboard (P0)
- [ ] Phase 1.4: Kane Marco Aether (P0)
- [ ] Phase 1.5: Giant Instruments (P0)
- [ ] Phase 2.1: Drum Machine (P1)
- [ ] Phase 2.2: Nex Synth (P1)
- [ ] Phase 2.3: Sam Sampler (P1)
- [ ] Phase 3.1: AetherDrive (P2)
- [ ] Phase 3.2: Monument (P2)
- [ ] Phase 3.3: FarFarAway (P2)
- [ ] Phase 3.4: Local Galaxy (P2)
- [ ] Phase 3.5: Dynamics (P2)

**Total**: 13 plugins to migrate

---

**Created**: 2026-01-16
**Status**: 🚨 **ACTIVE MIGRATION IN PROGRESS**
**Target**: 100% compliance by end of week

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
