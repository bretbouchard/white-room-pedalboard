# DAW Testing Quick Reference Card

## Emergency Quick Start (5 minutes)

```bash
# 1. Install plugins
cd /Users/bretbouchard/apps/schill/white_room/daw_compatibility_testing/automation_scripts
./install_plugins.sh

# 2. Open Reaper (download from reaper.fm)
# 3. Create new project
# 4. Track → Insert new track
# 5. FX → Add FX → Virtual instrument on new track
# 6. Navigate to: VSTi → White Room → NexSynth
# 7. Double-click to insert
# 8. Draw MIDI notes (C4, D4, E4)
# 9. Press Space to play
# 10. Document results in results/result_template.json
```

## Plugin Priority (Test in This Order)

### P0 - Critical (Test First)
1. **NexSynth** - FM synthesis flagship
2. **KaneMarcoAether** - Physical modeling flagship
3. **SamSampler** - Sample playback

### P1 - Important
4. **FilterGate** - Dynamics
5. **Monument** - Effects
6. **FarFarAway** - Spatial

### P2 - Specialized
7. **LocalGal** - Granular
8. **AetherGiantHorns** - Brass
9. **AetherGiantVoice** - Vocal
10. **KaneMarcoAetherString** - Strings

## Quick Test Checklist (Per Plugin)

### Loading (30 seconds)
- [ ] Plugin appears in FX browser
- [ ] UI opens without crash
- [ ] No console errors

### Basic (2 minutes)
- [ ] MIDI notes make sound
- [ ] Volume control works
- [ ] Presets load
- [ ] Play/pause works

### Advanced (5 minutes)
- [ ] Automation works
- [ ] State saves/loads
- [ ] Multiple instances OK
- [ ] Different sample rates OK
- [ ] Different buffer sizes OK

## Test Commands (Reaper)

### Insert Plugin
```
Track → Insert virtual instrument on new track
FX Browser → VSTi → White Room → [Plugin Name]
```

### Test Automation
```
Right-click parameter → Create automation envelope
Draw automation in arrangement view
Press Space to play
```

### Test State
```
Set parameters → File → Save project
Close Reaper → Reopen project
Verify parameters restored
```

## Issue Severity

### P0 - Critical (Blocker)
- ❌ Plugin crashes DAW
- ❌ No audio output
- ❌ UI fails to open
- ❌ Data loss

### P1 - Important (Fix Before Release)
- ⚠️ Major feature broken
- ⚠️ CPU > 50%
- ⚠️ Frequent crashes
- ⚠️ Memory leaks

### P2 - Nice to Have
- 📝 Minor UI glitches
- 📝 Workarounds needed
- 📝 Edge case failures

### P3 - Cosmetic
- 🎨 Visual issues
- 🎨 Text typos

## File Locations

### Plugins (Built)
```
/Users/bretbouchard/apps/schill/white_room/juce_backend/*_plugin_build/build/*_artefacts/Release/VST3/
```

### Installation Target
```
~/Library/Audio/Plug-Ins/VST3/
```

### Test Documentation
```
/Users/bretbouchard/apps/schill/white_room/daw_compatibility_testing/
```

### Results
```
daw_compatibility_testing/results/[daw]_[plugin]_[date].json
```

## Common Issues

### Plugin Not Found
**Fix:** Run `./install_plugins.sh` again

### Reaper Crashes
**Fix:** Check Console.app for crash log, document exact steps

### No Sound
**Fix:** Check track volume, plugin output, audio device settings

### UI Won't Open
**Fix:** Try clicking "Show UI" button, check display settings

## Testing Commands

### Install All Plugins
```bash
./install_plugins.sh
```

### Validate AU (macOS)
```bash
auval -v [component] [subtype] [manufacturer]
```

### Check Plugin Info (Reaper)
```
Right-click plugin → Plugin info
```

### Rescan Plugins (Reaper)
```
Preferences → Plug-ins → Re-scan
```

## Test Results Template

```json
{
  "plugin": "NexSynth",
  "daw": "Reaper 7.0",
  "date": "2026-01-15",
  "loading": "PASS",
  "ui": "PASS",
  "midi": "PASS",
  "audio": "PASS",
  "overall": "PASS",
  "issues": []
}
```

## Timeline Reference

### Week 1: VST3 Testing
- Day 1-2: Plugin loading tests
- Day 3-4: Basic functionality
- Day 5: Advanced features

### Week 2: AU Testing
- Day 1-2: Build AU versions
- Day 3-4: Test in Logic Pro
- Day 5: Test in GarageBand

### Week 3: Cross-Platform
- Day 1-3: Build universal/Windows
- Day 4-5: Test cross-platform

### Week 4: Finalization
- Day 1-2: Automated tests
- Day 3-4: Documentation
- Day 5: Production assessment

## Contact & Resources

### Documentation
- **Full Guide:** MANUAL_TESTING_GUIDE.md
- **Plan:** IMPLEMENTATION_PLAN.md
- **Plugins:** PLUGINS.md
- **DAWs:** DAWS.md

### Quick Help
- **Issues:** reports/compatibility_matrix.md
- **Results:** results/result_template.json
- **Install:** automation_scripts/install_plugins.sh

### External Resources
- **Reaper:** https://www.reaper.fm/
- **JUCE:** https://docs.juce.com/
- **AU Validation:** `man auval`

## Success Criteria (Quick Check)

### Minimum Viable (Week 1)
- ✅ All 10 plugins load in Reaper
- ✅ Basic functionality works
- ✅ No P0 crashes

### Production Ready (Week 4)
- ✅ All DAWs tested
- ✅ All formats work
- ✅ No P0/P1 issues
- ✅ Documentation complete

---

**Print this. Keep it handy. Test plugins.** 🎛️

**Version:** 1.0
**Date:** 2026-01-15
**For:** White Room DAW Compatibility Testing
