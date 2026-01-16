# Drum Machine Presets

Complete preset system for the Schill Drum Machine instrument.

## Directory Structure

```
DrumMachine/
├── patterns/          # Rhythm-only presets (beats, grooves)
│   └── 01_HipHop_Basic.json
├── kits/              # Drum sound-only presets (synth parameters)
│   └── 01_Classic_808.json
├── complete/          # Full presets (pattern + kit)
│   └── 01_808_HipHop.json
└── drill/             # Drill mode presets (IDM/breakbeat)
    ├── 01_Drill_Lite.json
    └── 02_Aphex_Snare_Hell.json
```

## Preset Format

Each preset contains four optional sections:

### 1. Global Parameters (always included)
- Tempo, swing, master volume
- Pattern length
- Role timing offsets (Pocket/Push/Pull)
- Dilla timing parameters

### 2. Pattern Section (rhythms)
```json
"pattern": {
  "tracks": [
    {
      "index": 0,
      "type": "Kick",
      "timing_role": "Pocket",
      "volume": 0.85,
      "pan": 0.0,
      "pitch": 0,
      "drill_override": {
        "use_override": false,
        "enabled": false,
        "amount": 0.5,
        // ... 13 drill mode parameters
      },
      "steps": [
        {
          "active": true,
          "velocity": 120,
          "probability": 1.0,
          "flam": false,
          "roll": false,
          "roll_notes": 4,
          "use_drill": false,
          "burst_count": 0,
          "burst_chaos": 0.0,
          "burst_dropout": 0.0,
          "drill_intent": 0.0
        }
        // ... 16 steps per track
      ]
    }
    // ... 16 tracks
  ]
}
```

### 3. Kit Section (drum sounds)
```json
"kit": {
  "voices": {
    "kick": {
      "pitch": 0.5,
      "decay": 0.5,
      "click": 0.3
    },
    "snare": {
      "tone": 0.7,
      "decay": 0.5,
      "snap": 0.5
    }
    // ... all 15 drum voices
  }
}
```

### 4. Drill Section (drill'n'bass / IDM mode)
```json
"drill": {
  "enabled": true,
  "amount": 0.5,
  "mutationRate": 0.3,
  "chaosAmount": 0.4,
  "gridDensity": 0.6,
  "gridChaos": 0.2,
  "burstSizeMin": 2,
  "burstSizeMax": 8,
  "burstSustain": 0.5,
  "burstDecay": 0.3,
  "microTiming": 0.4,
  "swingOverride": 0.0,
  "velocityChaos": 0.3,
  "rhythmFeelMode": "Drill",
  "barsPerPhrase": 4,
  "automation": {
    "points": [
      {"bar": 8, "amount": 0.7},
      {"bar": 16, "amount": 1.0}
    ]
  },
  "fillPolicy": {
    "enabled": true,
    "fillLengthSteps": 2,
    "triggerChance": 0.7,
    "fillAmount": 0.8,
    "decayPerStep": 0.15
  },
  "gatePolicy": {
    "enabled": false,
    "silenceChance": 0.25,
    "burstChance": 0.5,
    "minSilentSteps": 1,
    "maxSilentSteps": 3
  }
}
```

## API Usage

### Save/Load Complete Presets
```cpp
char buffer[65536];
drumMachine.savePreset(buffer, sizeof(buffer));  // Save all
drumMachine.loadPreset(jsonData);                 // Load all
```

### Save/Load Patterns Only
```cpp
drumMachine.savePattern(buffer, sizeof(buffer));  // Save rhythm only
drumMachine.loadPattern(jsonData);                 // Load rhythm only
```

### Save/Load Kits Only
```cpp
drumMachine.saveKit(buffer, sizeof(buffer));      // Save sounds only
drumMachine.loadKit(jsonData);                     // Load sounds only
```

### Selective Loading
```cpp
// Load only pattern and timing (skip kit)
drumMachine.loadPreset(jsonData, PRESET_GLOBAL | PRESET_PATTERN);

// Load only kit (skip pattern)
drumMachine.loadPreset(jsonData, PRESET_KIT);

// Load only drill settings
drumMachine.loadPreset(jsonData, PRESET_DRILL);
```

## Preset Sections

| Section  | Flag            | Description                        |
|----------|-----------------|------------------------------------|
| Global   | `PRESET_GLOBAL`  | Tempo, swing, timing parameters   |
| Pattern  | `PRESET_PATTERN` | Track data, steps, velocities      |
| Kit      | `PRESET_KIT`     | Drum voice synthesis parameters   |
| Drill    | `PRESET_DRILL`   | Drill mode settings                |
| All      | `PRESET_ALL`     | Combination of all sections       |

## Supported Drum Types

- Kick
- Snare
- HiHat Closed
- HiHat Open
- Clap
- Tom Low
- Tom Mid
- Tom High
- Crash
- Ride
- Cowbell
- Shaker
- Tambourine
- Percussion
- Special

## Timing Roles

- **Pocket**: Centered, steady timing
- **Push**: Slightly early (aggressive, forward)
- **Pull**: Slightly late (laid back, relaxed)

## Drill Mode Parameters

### Core Drill Settings
- `enabled` - Master on/off for drill mode
- `amount` - Overall drill intensity (0.0-1.0)
- `mutationRate` - How quickly drill patterns evolve
- `chaosAmount` - Randomization intensity
- `gridDensity` - Sub-division density
- `gridChaos` - Grid variation amount
- `burstSizeMin` - Minimum micro-burst count
- `burstSizeMax` - Maximum micro-burst count
- `burstSustain` - Burst duration
- `burstDecay` - Burst amplitude decay
- `microTiming` - Micro-timing deviation
- `swingOverride` - Override global swing
- `velocityChaos` - Velocity randomization

### Rhythm Feel
- `rhythmFeelMode` - "Groove" or "Drill"
- `barsPerPhrase` - Phrase length (4/8/16 bars)

### Automation Lane
- `automation.points[]` - Array of {bar, amount} for compositional sequencing

### Fill Policy
- `fillPolicy.enabled` - Enable automatic fills
- `fillPolicy.fillLengthSteps` - Steps in fill (1-4)
- `fillPolicy.triggerChance` - Fill probability per phrase
- `fillPolicy.fillAmount` - Drill amount during fill
- `fillPolicy.decayPerStep` - Fill intensity decay

### Gate Policy
- `gatePolicy.enabled` - Enable silence gating
- `gatePolicy.silenceChance` - Chance to start silent run
- `gatePolicy.burstChance` - Chance silence becomes burst
- `gatePolicy.minSilentSteps` - Minimum silent steps
- `gatePolicy.maxSilentSteps` - Maximum silent steps

### Per-Step Drill Parameters
- `use_drill` - Enable drill for this step
- `burst_count` - Override burst count
- `burst_chaos` - Override chaos amount
- `burst_dropout` - Probability of dropout
- `drill_intent` - How strongly this step wants drill

### Per-Track Drill Override
- `drill_override.use_override` - Enable track-specific drill
- `drill_override.drill.*` - Full 13-parameter drill override

## Factory Presets

### Patterns (`patterns/`)
- `01_HipHop_Basic.json` - Classic boom-bap beat

### Kits (`kits/`)
- `01_Classic_808.json` - Iconic TR-808 drum machine sounds

### Complete Presets (`complete/`)
- `01_808_HipHop.json` - Full hip hop preset (808 kit + basic pattern)

### Drill Presets (`drill/`)
- `01_Drill_Lite.json` - Subtle drill for gentle variation (140 BPM)
- `02_Aphex_Snare_Hell.json` - Aggressive Aphex Twin-style drill (172 BPM)

## Adding Custom Presets

1. Create pattern preset in `patterns/` directory
2. Create kit preset in `kits/` directory
3. Create complete preset in `complete/` directory
4. Create drill preset in `drill/` directory
5. Follow the JSON format shown above
6. Include metadata (name, author, category, tags)

## Notes

- All parameter values are normalized 0.0 to 1.0 unless otherwise noted
- Velocity is MIDI range 0-127
- Probability is 0.0 to 1.0 (1.0 = always plays)
- Steps array must have exactly 16 steps
- Track index must be 0-15 (16 tracks total)
- Drill mode is inspired by Aphex Twin, Venetian Snares, and IDM
- Use drill presets to understand different intensity levels
