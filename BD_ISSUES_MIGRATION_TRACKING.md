# Plugin Migration - BD Issues Tracking

**Date**: 2026-01-16
**Status**: Issues Created and Tracked in Beads
**Total Issues**: 5 migration issues + 1 architecture fix

---

## 📋 BD Issues Created

### Critical Architecture Fix

#### white_room-448: Execute Submodule Architecture Fix for ALL 20 plugins

**Priority**: P0 (CRITICAL)
**Status**: Open
**Labels**: architecture, critical, migration
**Estimated**: 5-6 hours

**Description**:
Per SUBMODULE_ARCHITECTURE_FIX_GUIDE.md, need to fix submodule structure for all 20 plugins (13 effects + 7 instruments).

Current structure (WRONG):
- All plugins are directories inside juce_backend submodule

Required structure (PER CONTRACT):
- Each plugin should be separate submodule of white_room

Fix Process:
1. Extract each effect to separate repository
2. Extract each instrument to separate repository
3. Remove plugin directories from juce_backend/
4. Add each plugin as separate submodule to white_room
5. Test all submodules work correctly
6. Update CI/CD
7. Update documentation

**Dependencies**: Discovered from white_room-419 (JWT security fix)

**Blocks**: All other migration issues (white_room-449, 450, 451, 452)

---

### Phase 1 Migration Issues

#### white_room-449: Migrate FilterGate to standard plugins/ structure (Phase 1.2)

**Priority**: P0
**Status**: Open (BLOCKED)
**Labels**: migration, filtergate, phase-1
**Estimated**: 0.5 day (after architecture fix)

**Description**:
Complete FilterGate migration after architecture fix is resolved.

Files Already Created:
- plugins/ folder structure ✅
- CMakeLists.txt ✅
- build_plugin.sh ✅
- README.md ✅

Remaining Work:
1. Wait for architecture fix (white_room-448)
2. Test all 7 format builds
3. Validate plugin in DAWs
4. Update migration status
5. Close this issue

**Dependencies**: Blocked by white_room-448

---

#### white_room-450: Migrate Pedalboard to separate repo with plugins/ structure (Phase 1.3)

**Priority**: P0
**Status**: Open (BLOCKED)
**Labels**: migration, pedalboard, phase-1
**Estimated**: 0.5-1 day (after architecture fix)

**Description**:
Migrate Pedalboard effect to standard plugins/ structure.

Required Work:
1. Create separate repository: white-room-pedalboard.git
2. Extract from juce_backend/effects/pedalboard/
3. Create plugins/ folder structure
4. Create CMakeLists.txt for multi-format builds
5. Create build_plugin.sh
6. Build all 7 formats
7. Test in DAWs

**Dependencies**: Blocked by white_room-448

---

#### white_room-451: Migrate Kane Marco Aether instrument to plugins/ structure (Phase 1.4)

**Priority**: P0
**Status**: Open (BLOCKED)
**Labels**: migration, instrument, kane-marco, phase-1
**Estimated**: 0.5-1 day (after architecture fix)

**Description**:
Migrate Kane Marco Aether instrument to standard plugins/ structure.

Required Work:
1. Create separate repository: kane-marco-aether.git
2. Extract from juce_backend/instruments/kane_marco/
3. Create plugins/ folder structure
4. Create CMakeLists.txt for multi-format builds
5. Create build_plugin.sh
6. Build all 7 formats
7. Test in DAWs

Components:
- Kane Marco Aether (main)
- Aether Giant Horns
- Aether Giant Voice
- Aether Giant Drums
- Kane Marco Aether String

**Dependencies**: Blocked by white_room-448

---

#### white_room-452: Migrate Giant Instruments to plugins/ structure (Phase 1.5)

**Priority**: P0
**Status**: Open (BLOCKED)
**Labels**: migration, instrument, giant-instruments, phase-1
**Estimated**: 0.5-1 day (after architecture fix)

**Description**:
Migrate Giant Instruments to standard plugins/ structure.

Required Work:
1. Create separate repository: aether-giant-instruments.git
2. Extract from juce_backend/instruments/giant_instruments/
3. Create plugins/ folder structure
4. Create CMakeLists.txt for multi-format builds
5. Create build_plugin.sh
6. Build all 7 formats
7. Test in DAWs

Components:
- Aether Giant Horns
- Aether Giant Voice
- Aether Giant Drums
- Aether Giant Percussion

**Dependencies**: Blocked by white_room-448

---

## 🔗 Issue Dependency Graph

```
white_room-448 (Architecture Fix)
    │
    ├─→ blocks → white_room-449 (FilterGate)
    ├─→ blocks → white_room-450 (Pedalboard)
    ├─→ blocks → white_room-451 (Kane Marco Aether)
    └─→ blocks → white_room-452 (Giant Instruments)
```

**Critical Path**:
1. **white_room-448** MUST be completed first
2. Once white_room-448 is complete, all 4 migration issues can proceed in parallel
3. Estimated time: 5-6 hours (architecture fix) + 2-3 days (4 plugins in parallel)

---

## 📊 Migration Progress Tracking

### Phase 1 Status

| Phase | Plugin | BD Issue | Status | Progress |
|-------|--------|----------|--------|----------|
| 1.1 | Bi-Phase | None (complete) | ✅ Complete | 100% |
| 1.2 | FilterGate | white_room-449 | ⏸️ Blocked | 80% (waiting on fix) |
| 1.3 | Pedalboard | white_room-450 | 🔴 Blocked | 0% (waiting on fix) |
| 1.4 | Kane Marco Aether | white_room-451 | 🔴 Blocked | 0% (waiting on fix) |
| 1.5 | Giant Instruments | white_room-452 | 🔴 Blocked | 0% (waiting on fix) |

**Phase 1 Progress**: 20% (1/5 plugins)

### Overall Migration Progress

| Phase | Type | Plugins | Issues | Status |
|-------|------|---------|--------|--------|
| 0 | Architecture Fix | 0 | white_room-448 | 🔴 Not Started |
| 1 | Effects (P0) | 5 | white_room-449,450 | ⏸️ 20% |
| 2 | Instruments (P0) | 5 | TBD | 🔴 Not Started |
| 3 | Effects (P1) | 3 | TBD | 🔴 Not Started |
| 4 | Instruments (P1) | 2 | TBD | 🔴 Not Started |
| 5 | Effects (P2) | 5 | TBD | 🔴 Not Started |

**Total Progress**: 5% (1/20 plugins)

---

## 🎯 Next Actions

### Immediate Priority

1. **Execute white_room-448** (Architecture Fix)
   - Follow SUBMODULE_ARCHITECTURE_FIX_GUIDE.md
   - Estimated: 5-6 hours
   - Priority: CRITICAL
   - Blocks all other migration work

2. **Complete Phase 1 Migration Issues** (After architecture fix)
   - white_room-449 (FilterGate) - 0.5 day
   - white_room-450 (Pedalboard) - 0.5-1 day
   - white_room-451 (Kane Marco Aether) - 0.5-1 day
   - white_room-452 (Giant Instruments) - 0.5-1 day

3. **Create BD Issues for Remaining Phases**
   - Phase 2: 5 instruments (3-5 issues)
   - Phase 3: 3 effects (3 issues)
   - Phase 4: 2 instruments (2 issues)
   - Phase 5: 5 effects (5 issues)

---

## 📈 BD Issue Statistics

### Issues Created This Session

- **Total Issues**: 5
- **Priority P0**: 5 (100%)
- **Status**: 1 blocked, 4 blocked
- **Labels Applied**: migration, phase-1, instrument, effects

### Issue Distribution

| Type | Count | Issues |
|------|-------|--------|
| Architecture Fix | 1 | white_room-448 |
| Effects Migration | 2 | white_room-449, 450 |
| Instruments Migration | 2 | white_room-451, 452 |

### Estimated Time

| Phase | Issues | Est. Time |
|-------|--------|-----------|
| Architecture Fix | 1 | 5-6 hours |
| Phase 1 Migration | 4 | 2-3 days (parallel) |
| **Total** | **5** | **~3-4 days** |

---

## 🔧 Working with BD Issues

### Check Issue Status

```bash
# Check all migration issues
bd list --labels "migration"

# Check specific issue
bd show white_room-448

# Check blocked issues
bd list --deps "blocks:white_room-448"
```

### Update Issue Status

```bash
# Start working on architecture fix
bd start white_room-448

# Mark as complete
bd close white_room-448 "Architecture fix complete - all 20 plugins now separate submodules"

# Start FilterGate migration
bd start white_room-449
```

### View Dependencies

```bash
# Show dependency graph
bd deps white_room-448

# Show what blocks this issue
bd blocks white_room-449
```

---

## 📝 Issue Templates

### Creating Future Migration Issues

**Template for Effects**:
```bash
bd create "Migrate [EFFECT_NAME] to plugins/ structure (Phase X.Y)" \
  --type task \
  --priority 0 \
  --labels "migration,effects,phase-X" \
  --description "Migrate [EFFECT_NAME] effect to standard plugins/ structure.

Required Work:
1. Create separate repository: [REPO_NAME].git
2. Extract from juce_backend/effects/[EFFECT_DIR]/
3. Create plugins/ folder structure
4. Create CMakeLists.txt for multi-format builds
5. Create build_plugin.sh
6. Build all 7 formats
7. Test in DAWs

Estimated: 0.5-1 day

Blocked by: Architecture fix (white_room-448)

See: PLUGIN_MIGRATION_PLAN.md Phase X.Y" \
  --deps "blocks:white_room-448"
```

**Template for Instruments**:
```bash
bd create "Migrate [INSTRUMENT_NAME] to plugins/ structure (Phase X.Y)" \
  --type task \
  --priority 0 \
  --labels "migration,instrument,phase-X" \
  --description "Migrate [INSTRUMENT_NAME] instrument to standard plugins/ structure.

Required Work:
1. Create separate repository: [REPO_NAME].git
2. Extract from juce_backend/instruments/[INSTRUMENT_DIR]/
3. Create plugins/ folder structure
4. Create CMakeLists.txt for multi-format builds
5. Create build_plugin.sh
6. Build all 7 formats
7. Test in DAWs

Components:
- [List components]

Estimated: 0.5-1 day

Blocked by: Architecture fix (white_room-448)

See: INSTRUMENT_MIGRATION_REQUIREMENTS.md" \
  --deps "blocks:white_room-448"
```

---

## ✅ Session Summary

### Achievements

- ✅ **5 BD issues created** for migration tracking
- ✅ **Dependencies established** (architecture fix blocks all migration)
- ✅ **Templates created** for future issues
- ✅ **All work tracked** in Beads system
- ✅ **Clear critical path** established

### Migration Tracking

- **Phase 1**: 5 issues created (4 pending architecture fix)
- **Phase 2-5**: Issues to be created after architecture fix
- **Total Issues Expected**: ~20 (1 architecture + 20 plugins)

---

**Document Created**: 2026-01-16
**Status**: ✅ **BD Issues Created and Tracked**
**Next Action**: Execute white_room-448 (Architecture Fix)

🎸 **Generated with [Claude Code](https://claude.com/claude-code)**
**via [Happy](https://happy.engineering)**

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
