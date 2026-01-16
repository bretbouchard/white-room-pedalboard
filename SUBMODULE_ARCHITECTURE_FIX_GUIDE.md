# Submodule Architecture Fix Guide

**Date**: 2026-01-16
**Priority**: 🚨 **CRITICAL BLOCKER**
**Status**: ⏳ **AWAITING RESOLUTION**

---

## Executive Summary

The White Room plugin migration has discovered a **critical architectural issue** that blocks the entire plugin architecture compliance effort. All effects are currently stored as **directories inside the `juce_backend` submodule**, when they should be **separate submodules** of the main `white_room` repository.

This document provides:
1. Clear explanation of the problem
2. Visual diagrams of current vs required architecture
3. Step-by-step fix instructions
4. Testing procedures
5. Rollback plan

---

## Problem Statement

### Current Architecture (WRONG)

```
white_room/                          (main repository)
├── juce_backend/                    ← SUBMODULE
│   └── effects/
│       ├── biPhase/                 ← DIRECTORY (should be submodule)
│       ├── filtergate/              ← DIRECTORY (should be submodule)
│       ├── pedalboard/              ← DIRECTORY (should be submodule)
│       ├── AetherDrive/             ← DIRECTORY (should be submodule)
│       ├── monument/                ← DIRECTORY (should be submodule)
│       ├── farfaraway/              ← DIRECTORY (should be submodule)
│       ├── dynamics/                ← DIRECTORY (should be submodule)
│       ├── localgal/                ← DIRECTORY (should be submodule)
│       └── [other effects]          ← DIRECTORIES (should be submodules)
└── .gitmodules                      (only lists juce_backend)
```

**Problems**:
- ❌ Effects cannot be versioned independently
- ❌ Effects cannot be released separately
- ❌ Effect changes require committing to juce_backend
- ❌ Violates Plugin Architecture Contract
- ❌ Prevents proper plugin ecosystem management

### Required Architecture (CORRECT)

```
white_room/                          (main repository)
├── juce_backend/                    ← SUBMODULE (shared code only)
│   └── [shared DSP, utilities, etc.]
├── effects/                         ← NEW TOP-LEVEL DIRECTORY
│   ├── biPhase/                     ← SUBMODULE (biPhase.git)
│   ├── filtergate/                  ← SUBMODULE (FilterGate.git)
│   ├── pedalboard/                  ← SUBMODULE (white-room-pedalboard.git)
│   ├── AetherDrive/                 ← SUBMODULE (aether-drive.git)
│   ├── monument/                    ← SUBMODULE (monument-phaser.git)
│   ├── farfaraway/                  ← SUBMODULE (far-far-away.git)
│   ├── dynamics/                    ← SUBMODULE (white-room-dynamics.git)
│   ├── localgal/                    ← SUBMODULE (local-galaxy.git)
│   └── [other effects]              ← SUBMODULES (each with own repo)
├── instruments/                     ← NEW TOP-LEVEL DIRECTORY
│   ├── kane_marco_aether/           ← SUBMODULE (kane-marco-aether.git)
│   ├── giant_instruments/           ← SUBMODULE (aether-giant-instruments.git)
│   ├── drum_machine/                ← SUBMODULE (white-room-drum-machine.git)
│   ├── nex_synth/                   ← SUBMODULE (white-room-nex-synth.git)
│   ├── sam_sampler/                 ← SUBMODULE (white-room-sam-sampler.git)
│   └── [other instruments]          ← SUBMODULES (each with own repo)
└── .gitmodules                      (lists ALL plugin submodules)
```

**Benefits**:
- ✅ Each plugin versioned independently
- ✅ Each plugin released separately
- ✅ Plugin changes don't affect juce_backend
- ✅ Complies with Plugin Architecture Contract
- ✅ Professional plugin ecosystem

---

## Fix Procedure

### Phase 1: Preparation (30 minutes)

#### 1.1 Backup Current State

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Create backup branch
git branch backup-before-submodule-fix

# Create tarball backup of entire repo
cd ..
tar -czf white_room_backup_$(date +%Y%m%d).tar.gz white_room/
cd white_room

# Verify backup
ls -lh ../white_room_backup_*.tar.gz
```

#### 1.2 Document Current Submodule Status

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Save submodule status
git submodule status > submodule_status_before_fix.txt

# Save .gitmodules
cp .gitmodules .gitmodules.backup

# List all effects
find juce_backend/effects -maxdepth 1 -type d | sort > effects_list.txt
```

#### 1.3 Create GitHub Repositories

For each effect/instrument that doesn't have a repository yet, create one:

```bash
# Repository naming convention:
# Effects: [name].git (lowercase, hyphens for spaces)
# Instruments: white-room-[name].git

# Examples:
# - biPhase.git ✅ (exists)
# - FilterGate.git ✅ (exists)
# - white-room-pedalboard.git
# - aether-drive.git
# - monument-phaser.git
# - far-far-away.git
# - white-room-dynamics.git
# - local-galaxy.git
# - kane-marco-aether.git
# - aether-giant-instruments.git
# - white-room-drum-machine.git
# - white-room-nex-synth.git
# - white-room-sam-sampler.git
```

Use GitHub CLI or web interface to create repositories:
```bash
gh repo create white-room-pedalboard --public --description "White Room Pedalboard Plugin"
gh repo create aether-drive --public --description "White Room AetherDrive Plugin"
# ... repeat for each plugin
```

---

### Phase 2: Extract Effects to Separate Repositories (2-3 hours)

#### 2.1 Extract Single Effect (Template)

Repeat this process for **EACH effect**:

```bash
# === CONFIGURATION ===
EFFECT_NAME="filtergate"
GITHUB_REPO="https://github.com/bretbouchard/FilterGate.git"
EFFECT_PATH="juce_backend/effects/${EFFECT_NAME}"

# === STEP 1: Create temporary extraction directory ===
cd /Users/bretbouchard/apps/schill
mkdir -p temp_extraction
cd temp_extraction

# === STEP 2: Clone the effect directory ===
# Note: We use git filter-repo or manual copy
mkdir ${EFFECT_NAME}
cd ${EFFECT_NAME}
git init

# === STEP 3: Copy files from current effect ===
cp -r ../../white_room/${EFFECT_PATH}/* .

# === STEP 4: Create plugins/ folder structure (if not exists) ===
mkdir -p plugins/{dsp,vst,au,clap,lv2,auv3,standalone}

# Copy DSP implementation to plugins/dsp/
cp -r include src tests presets docs plugins/dsp/ 2>/dev/null || true

# === STEP 5: Create CMakeLists.txt (if not exists) ===
if [ ! -f CMakeLists.txt ]; then
    # Use Bi-Phase CMakeLists.txt as template
    # Update all instances of "BiPhase" with "${EFFECT_NAME}"
    # Update plugin code, manufacturer code, etc.
fi

# === STEP 6: Create build_plugin.sh (if not exists) ===
if [ ! -f build_plugin.sh ]; then
    # Use Bi-Phase build_plugin.sh as template
fi

# === STEP 7: Create/update README.md ===
cat > README.md << 'EOF'
# [EFFECT_NAME] - Professional Audio Plugin

## Plugin Architecture Compliance

✅ **Separate Repository**: ${GITHUB_REPO}
✅ **Standard Folder Structure**: plugins/ with all 7 formats
✅ **Multi-Format Build**: VST3, AU, CLAP, LV2, AUv3, Standalone
✅ **Compliant**: Per `.claude/PLUGIN_ARCHITECTURE_CONTRACT.md`

## Quick Build

```bash
./build_plugin.sh
```

## Architecture

```
${EFFECT_NAME}/
├── plugins/              ← Standard structure per contract
│   ├── dsp/              ← Pure DSP
│   ├── vst/              ← VST3 build output
│   ├── au/               ← AU build output
│   ├── clap/             ← CLAP build output
│   ├── lv2/              ← LV2 build output
│   ├── auv3/             ← iOS AUv3 build output
│   └── standalone/       ← Standalone app
├── CMakeLists.txt        ← Multi-format build configuration
├── build_plugin.sh       ← One-command build script
└── README.md             ← This file
```

---

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
EOF

# === STEP 8: Create .claude directory ===
mkdir -p .claude
cat > .claude/PLUGIN_ARCHITECTURE_COMPLIANCE.md << 'EOF'
# Plugin Architecture Compliance Statement

This plugin complies with the White Room Plugin Architecture Contract:
https://github.com/bretbouchard/white_room_box/blob/main/.claude/PLUGIN_ARCHITECTURE_CONTRACT.md

## Compliance Checklist

- [x] Separate repository
- [x] plugins/ folder with all 7 format subfolders
- [x] Multi-format CMakeLists.txt
- [x] One-command build script
- [x] README with architecture documentation
- [x] Committed and pushed to own repository

## Repository

**URL**: ${GITHUB_REPO}
**Type**: Effect Plugin
**Formats**: DSP, VST3, AU, CLAP, LV2, AUv3, Standalone

---

Generated: $(date +%Y-%m-%d)
EOF

# === STEP 9: Initialize git and push ===
git add -A
git commit -m "feat: Initialize ${EFFECT_NAME} with standard plugins/ structure

Per White Room Plugin Architecture Contract:

✅ Separate repository: ${GITHUB_REPO}
✅ Standard plugins/ folder with all 7 formats
✅ Multi-format build configuration
✅ One-command build script
✅ Architecture compliance documentation

See: .claude/PLUGIN_ARCHITECTURE_CONTRACT.md

Generated with Claude Code via Happy"

git branch -M main
git remote add origin ${GITHUB_REPO}
git push -u origin main

# === STEP 10: Verify repository ===
echo "✅ ${EFFECT_NAME} extracted to ${GITHUB_REPO}"
echo "Repository URL: ${GITHUB_REPO}"
cd /Users/bretbouchard/apps/schill/white_room
```

#### 2.2 Extract All Effects

Create a script to automate extraction for all effects:

```bash
#!/bin/bash
# extract_all_effects.sh

EFFECTS=(
    "filtergate:FilterGate:https://github.com/bretbouchard/FilterGate.git"
    "pedalboard:White-Room-Pedalboard:https://github.com/bretbouchard/white-room-pedalboard.git"
    "AetherDrive:AetherDrive:https://github.com/bretbouchard/aether-drive.git"
    "monument:Monument:https://github.com/bretbouchard/monument-phaser.git"
    "farfaraway:FarFarAway:https://github.com/bretbouchard/far-far-away.git"
    "dynamics:Dynamics:https://github.com/bretbouchard/white-room-dynamics.git"
    "localgal:LocalGalaxy:https://github.com/bretbouchard/local-galaxy.git"
)

for effect in "${EFFECTS[@]}"; do
    IFS=':' read -r dirname reponame url <<< "$effect"
    echo "Extracting $dirname..."
    # Call extraction script here
done
```

---

### Phase 3: Update white_room Repository Structure (1 hour)

#### 3.1 Remove Effects from juce_backend

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Navigate to juce_backend
cd juce_backend

# Remove effect directories (they're now in separate repos)
for effect in biPhase filtergate pedalboard AetherDrive monument farfaraway dynamics localgal; do
    echo "Removing $effect from juce_backend/effects/..."
    rm -rf effects/$effect
done

# Go back to white_room root
cd ..

# Commit removal
git add juce_backend/effects
git commit -m "chore: Remove effect directories from juce_backend

Effects are now in separate repositories per Plugin Architecture Contract:
- biPhase → https://github.com/bretbouchard/biPhase.git
- filtergate → https://github.com/bretbouchard/FilterGate.git
- pedalboard → https://github.com/bretbouchard/white-room-pedalboard.git
[... etc]

This prepares for adding them as submodules."
```

#### 3.2 Create Effects Directory Structure

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Create effects/ directory at top level
mkdir -p effects

# Create instruments/ directory at top level
mkdir -p instruments

# Commit
git add effects instruments
git commit -m "chore: Create effects/ and instruments/ directories

Per Plugin Architecture Contract, each plugin will be a separate submodule:
- effects/ → Effect plugins
- instruments/ → Instrument plugins"
```

#### 3.3 Add Effects as Submodules

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Add each effect as a submodule
cd effects

# Bi-Phase
git submodule add https://github.com/bretbouchard/biPhase.git biPhase

# FilterGate
git submodule add https://github.com/bretbouchard/FilterGate.git filtergate

# Pedalboard
git submodule add https://github.com/bretbouchard/white-room-pedalboard.git pedalboard

# AetherDrive
git submodule add https://github.com/bretbouchard/aether-drive.git AetherDrive

# Monument
git submodule add https://github.com/bretbouchard/monument-phaser.git monument

# FarFarAway
git submodule add https://github.com/bretbouchard/far-far-away.git farfaraway

# Dynamics
git submodule add https://github.com/bretbouchard/white-room-dynamics.git dynamics

# Local Galaxy
git submodule add https://github.com/bretbouchard/local-galaxy.git localgal

# Go back to white_room root
cd ..

# Commit all submodules
git add effects/ .gitmodules
git commit -m "feat: Add all effect plugins as separate submodules

Per White Room Plugin Architecture Contract, each effect is now a separate submodule:

Effects:
- biPhase → https://github.com/bretbouchard/biPhase.git ✅
- filtergate → https://github.com/bretbouchard/FilterGate.git ✅
- pedalboard → https://github.com/bretbouchard/white-room-pedalboard.git ✅
- AetherDrive → https://github.com/bretbouchard/aether-drive.git ✅
- monument → https://github.com/bretbouchard/monument-phaser.git ✅
- farfaraway → https://github.com/bretbouchard/far-far-away.git ✅
- dynamics → https://github.com/bretbouchard/white-room-dynamics.git ✅
- localgal → https://github.com/bretbouchard/local-galaxy.git ✅

This enables:
- Independent versioning for each plugin
- Separate releases
- Clear ownership
- Scalable architecture

See: .claude/PLUGIN_ARCHITECTURE_CONTRACT.md"
```

#### 3.4 Add Instruments as Submodules

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

cd instruments

# Kane Marco Aether
git submodule add https://github.com/bretbouchard/kane-marco-aether.git kane_marco_aether

# Giant Instruments
git submodule add https://github.com/bretbouchard/aether-giant-instruments.git giant_instruments

# Drum Machine
git submodule add https://github.com/bretbouchard/white-room-drum-machine.git drum_machine

# Nex Synth
git submodule add https://github.com/bretbouchard/white-room-nex-synth.git nex_synth

# Sam Sampler
git submodule add https://github.com/bretbouchard/white-room-sam-sampler.git sam_sampler

# Go back to white_room root
cd ..

# Commit all instrument submodules
git add instruments/ .gitmodules
git commit -m "feat: Add all instrument plugins as separate submodules

Per White Room Plugin Architecture Contract, each instrument is now a separate submodule:

Instruments:
- kane_marco_aether → https://github.com/bretbouchard/kane-marco-aether.git ✅
- giant_instruments → https://github.com/bretbouchard/aether-giant-instruments.git ✅
- drum_machine → https://github.com/bretbouchard/white-room-drum-machine.git ✅
- nex_synth → https://github.com/bretbouchard/white-room-nex-synth.git ✅
- sam_sampler → https://github.com/bretbouchard/white-room-sam-sampler.git ✅

See: .claude/PLUGIN_ARCHITECTURE_CONTRACT.md"
```

---

### Phase 4: Testing and Validation (1 hour)

#### 4.1 Verify Submodule Structure

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Check submodule status
git submodule status

# Expected output:
# f7cda62... juce_backend (heads/feature/pedalboard-plugin)
# 07e24cb... effects/biPhase (heads/main)
# [commit]... effects/filtergate (heads/main)
# [commit]... effects/pedalboard (heads/main)
# ... etc for all plugins

# Verify .gitmodules
cat .gitmodules

# Should list ALL submodules
```

#### 4.2 Test Submodule Checkout

```bash
# Test fresh clone
cd /tmp
rm -rf test_white_room
git clone --recurse-submodules https://github.com/bretbouchard/white_room_box.git test_white_room
cd test_white_room

# Verify all submodules checked out
git submodule status

# Navigate to a plugin
cd effects/biPhase

# Verify plugin structure
ls -la plugins/

# Should show: dsp/ vst/ au/ clap/ lv2/ auv3/ standalone/

# Test build
./build_plugin.sh "VST3;AU;Standalone"

# Verify build outputs
ls -la build/
```

#### 4.3 Test Plugin Build

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Test building one plugin
cd effects/biPhase
./build_plugin.sh "VST3;AU;Standalone"

# Verify installation
ls -la ~/Library/Audio/Plug-Ins/VST3/ | grep -i bipphase
ls -la ~/Library/Audio/Plug-Ins/Components/ | grep -i bipphase

# Load plugin in DAW (manual test)
# Open Logic/Reaper/Bitwig and verify plugin loads
```

---

### Phase 5: Update CI/CD (30 minutes)

#### 5.1 Update GitHub Actions

Update workflow files to handle submodule structure:

```yaml
# .github/workflows/test-plugins.yml
name: Test All Plugins

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    strategy:
      matrix:
        plugin:
          - biPhase
          - filtergate
          - pedalboard
          # ... all plugins

    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive  # CRITICAL: Checkout submodules

      - name: Build ${{ matrix.plugin }}
        run: |
          cd effects/${{ matrix.plugin }}
          ./build_plugin.sh "VST3;AU;Standalone"

      - name: Test ${{ matrix.plugin }}
        run: |
          # Run plugin tests
          cd effects/${{ matrix.plugin }}
          ctest --test-dir build
```

---

### Phase 6: Documentation (30 minutes)

#### 6.1 Update Main README

Update `/Users/bretbouchard/apps/schill/white_room/README.md`:

```markdown
# White Room - Next-Generation Audio Plugin Suite

## Architecture

White Room follows a **modular submodule architecture** where each plugin is a separate repository:

### Effects
- **biPhase**: Professional phaser plugin ([Repository](https://github.com/bretbouchard/biPhase.git))
- **FilterGate**: Spectral gate with filter ([Repository](https://github.com/bretbouchard/FilterGate.git))
- **Pedalboard**: Virtual pedalboard ([Repository](https://github.com/bretbouchard/white-room-pedalboard.git))
- ... etc

### Instruments
- **Kane Marco Aether**: String ensemble ([Repository](https://github.com/bretbouchard/kane-marco-aether.git))
- **Giant Instruments**: Giant synth ensemble ([Repository](https://github.com/bretbouchard/aether-giant-instruments.git))
- ... etc

## Repository Structure

```
white_room/
├── effects/          ← All effect plugins (submodules)
├── instruments/      ← All instrument plugins (submodules)
├── juce_backend/     ← Shared JUCE backend (submodule)
├── sdk/              ← TypeScript SDK
└── swift_frontend/   ← SwiftUI interface
```

## Development

Each plugin is developed in its own repository following the [Plugin Architecture Contract](.claude/PLUGIN_ARCHITECTURE_CONTRACT.md).

### Adding a New Plugin

1. Create separate GitHub repository
2. Initialize with standard `plugins/` folder structure
3. Add as submodule to white_room:
   ```bash
   cd effects  # or instruments/
   git submodule add https://github.com/bretbouchard/[plugin].git [plugin]
   ```
4. Update .gitmodules
5. Commit and push

---

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**
```

#### 6.2 Create Migration Summary Document

Create `SUBMODULE_MIGRATION_COMPLETE.md`:

```markdown
# Submodule Architecture Migration Complete

**Date**: [COMPLETION DATE]
**Status**: ✅ **COMPLETE**

## Summary

Successfully migrated all plugins from monolithic juce_backend structure to modular submodule architecture.

## Changes

- **13 plugins** extracted to separate repositories
- **13 submodules** added to white_room
- **100% compliance** with Plugin Architecture Contract
- **Independent versioning** enabled for all plugins

## Results

✅ Each plugin versioned independently
✅ Each plugin releasable separately
✅ Professional plugin ecosystem established
✅ Scalable architecture for future plugins

## Migration Statistics

- **Effects Migrated**: 8/8 (100%)
- **Instruments Migrated**: 5/5 (100%)
- **Total Plugins**: 13/13 (100%)
- **Time**: [X hours]
- **Issues**: [List any issues encountered]

---

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**
```

---

## Rollback Plan

If anything goes wrong, rollback is straightforward:

```bash
# From white_room root
cd /Users/bretbouchard/apps/schill/white_room

# Rollback to backup branch
git checkout backup-before-submodule-fix

# OR rollback specific commits
git revert HEAD~N  # N = number of commits to revert

# Restore from tarball backup if needed
cd ..
rm -rf white_room
tar -xzf white_room_backup_20260116.tar.gz
```

---

## Success Criteria

Migration is complete when:

- [ ] All 13 plugins have separate GitHub repositories
- [ ] All 13 plugins are submodules of white_room
- [ ] All plugins have standard plugins/ folder structure
- [ ] All plugins build successfully with `./build_plugin.sh`
- [ ] All plugins load in DAWs (Logic, Reaper, Bitwig)
- [ ] CI/CD updated and passing
- [ ] Documentation updated
- [ ] Zero merge conflicts
- [ ] Fresh clone works: `git clone --recurse-submodules`

---

## Estimated Timeline

- **Phase 1** (Preparation): 30 minutes
- **Phase 2** (Extraction): 2-3 hours
- **Phase 3** (Update Structure): 1 hour
- **Phase 4** (Testing): 1 hour
- **Phase 5** (CI/CD): 30 minutes
- **Phase 6** (Documentation): 30 minutes

**Total**: 5-6 hours

---

## Next Steps

1. **Review this guide** with team
2. **Schedule migration window** (preferably during low-traffic period)
3. **Communicate changes** to team
4. **Execute migration** following phases
5. **Test thoroughly**
6. **Update team documentation**
7. **Merge to main**

---

## Questions?

Refer to:
- `FILTERGATE_MIGRATION_REPORT.md` - Detailed analysis of the issue
- `PLUGIN_MIGRATION_STATUS.md` - Current migration status
- `.claude/PLUGIN_ARCHITECTURE_CONTRACT.md` - Permanent architecture rules

---

**Guide Created**: 2026-01-16
**Status**: 🚨 **AWAITING EXECUTION**
**Priority**: CRITICAL BLOCKER

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
