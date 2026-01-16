#!/usr/bin/env python3
"""
Generate 41 Factory Presets for Kane Marco Aether String (Week 5)

Categories:
1. Clean Guitar (6 presets)
2. Overdriven Guitar (6 presets)
3. Distorted Guitar (6 presets)
4. Lead Guitar (5 presets)
5. Ambient Guitar (5 presets)
6. Bass Guitar (5 presets)
7. Special Effects (5 presets)
8. Experimental (3 presets)
"""

import json
import os
from datetime import datetime

# Preset base template
PRESET_TEMPLATE = {
    "version": "1.0.0",
    "author": "Kane Marco Design Team",
    "creationDate": datetime.now().strftime("%Y-%m-%d")
}

def create_preset(name, description, category, tags, parameters):
    """Create a complete preset dictionary"""
    preset = PRESET_TEMPLATE.copy()
    preset.update({
        "name": name,
        "description": description,
        "category": category,
        "tags": tags,
        "parameters": parameters
    })
    return preset

def save_preset(preset, filename, output_dir):
    """Save preset to JSON file"""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(preset, f, indent=2)
    print(f"Created: {filepath}")
    return filepath

# ============================================================================
# CATEGORY 1: CLEAN GUITAR (6 presets)
# ============================================================================

def generate_clean_guitar_presets(output_dir):
    """Generate 6 clean guitar presets"""
    presets = []

    # 1. Clean Telecaster
    preset1 = create_preset(
        name="Clean Telecaster",
        description="Bright, spanky telecaster tone with crisp attack and clear highs",
        category="Clean Guitar",
        tags=["clean", "bright", "telecaster", "spanky", "country"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.996,
            "string_stiffness": 0.1,
            "string_brightness": 0.7,
            "bridge_coupling": 0.4,
            "bridge_nonlinearity": 0.1,
            "body_brightness": 0.8,
            "body_resonance": 0.5,
            "pedalboard_enable_0": False,  # Compressor
            "pedalboard_enable_1": False,  # Octaver
            "pedalboard_enable_2": False,  # Overdrive
            "pedalboard_enable_3": False,  # Distortion
            "pedalboard_enable_4": False,  # RAT
            "pedalboard_enable_5": True,   # Phaser
            "pedalboard_type_5": 5,        # Phaser
            "pedalboard_param1_5": 0.2,    # Rate
            "pedalboard_param2_5": 0.3,    # Depth
            "pedalboard_enable_6": True,   # Reverb
            "pedalboard_type_6": 6,        # Reverb
            "pedalboard_param1_6": 0.3,    # Room size
            "pedalboard_param2_6": 0.2,    # Damping
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset1, "01_Clean_Telecaster.json"))

    # 2. Clean Strat
    preset2 = create_preset(
        name="Clean Strat",
        description="Glassy, bell-like stratocaster tone with shimmering highs",
        category="Clean Guitar",
        tags=["clean", "glassy", "stratocaster", "bell-like", "funk"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.997,
            "string_stiffness": 0.15,
            "string_brightness": 0.75,
            "bridge_coupling": 0.35,
            "bridge_nonlinearity": 0.1,
            "body_brightness": 0.85,
            "body_resonance": 0.55,
            "pedalboard_enable_0": True,   # Compressor
            "pedalboard_type_0": 0,        # Compressor
            "pedalboard_param1_0": 0.4,    # Threshold
            "pedalboard_param2_0": 0.3,    # Ratio
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": False,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Reverb
            "pedalboard_type_5": 6,
            "pedalboard_param1_5": 0.4,
            "pedalboard_param2_5": 0.3,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset2, "02_Clean_Strat.json"))

    # 3. Clean Jazz Box
    preset3 = create_preset(
        name="Clean Jazz Box",
        description="Warm, smooth hollow-body tone for jazz chords",
        category="Clean Guitar",
        tags=["clean", "warm", "jazz", "hollow-body", "smooth"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.998,
            "string_stiffness": 0.2,
            "string_brightness": 0.3,
            "bridge_coupling": 0.5,
            "bridge_nonlinearity": 0.15,
            "body_brightness": 0.4,
            "body_resonance": 0.7,
            "pedalboard_enable_0": True,   # Compressor
            "pedalboard_type_0": 0,
            "pedalboard_param1_0": 0.3,    # Light compression
            "pedalboard_param2_0": 0.2,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": False,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Reverb
            "pedalboard_type_5": 6,
            "pedalboard_param1_5": 0.5,    # Larger room
            "pedalboard_param2_5": 0.4,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset3, "03_Clean_Jazz_Box.json"))

    # 4. Clean Acoustic
    preset4 = create_preset(
        name="Clean Acoustic",
        description="Natural, woody acoustic guitar tone",
        category="Clean Guitar",
        tags=["clean", "acoustic", "natural", "woody", "fingerstyle"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.995,
            "string_stiffness": 0.25,
            "string_brightness": 0.6,
            "bridge_coupling": 0.6,
            "bridge_nonlinearity": 0.1,
            "body_brightness": 0.5,
            "body_resonance": 0.8,
            "pedalboard_enable_0": False,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": False,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Reverb
            "pedalboard_type_5": 6,
            "pedalboard_param1_5": 0.3,
            "pedalboard_param2_5": 0.2,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset4, "04_Clean_Acoustic.json"))

    # 5. Clean 12-String
    preset5 = create_preset(
        name="Clean 12-String",
        description="Shimmering, chorus-like 12-string guitar tone",
        category="Clean Guitar",
        tags=["clean", "12-string", "shimmering", "chorus", "folk"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.996,
            "string_stiffness": 0.15,
            "string_brightness": 0.8,
            "bridge_coupling": 0.4,
            "bridge_nonlinearity": 0.1,
            "body_brightness": 0.7,
            "body_resonance": 0.6,
            "pedalboard_enable_0": True,   # Compressor
            "pedalboard_type_0": 0,
            "pedalboard_param1_0": 0.5,
            "pedalboard_param2_0": 0.4,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": False,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Phaser (for chorus effect)
            "pedalboard_type_5": 5,
            "pedalboard_param1_5": 0.3,
            "pedalboard_param2_5": 0.4,
            "pedalboard_enable_6": True,   # Reverb
            "pedalboard_type_6": 6,
            "pedalboard_param1_6": 0.4,
            "pedalboard_param2_6": 0.3,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset5, "05_Clean_12_String.json"))

    # 6. Clean Nylon
    preset6 = create_preset(
        name="Clean Nylon",
        description="Soft, mellow nylon-string classical guitar tone",
        category="Clean Guitar",
        tags=["clean", "nylon", "classical", "mellow", "soft"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.998,
            "string_stiffness": 0.05,
            "string_brightness": 0.4,
            "bridge_coupling": 0.5,
            "bridge_nonlinearity": 0.08,
            "body_brightness": 0.3,
            "body_resonance": 0.7,
            "pedalboard_enable_0": False,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": False,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Reverb
            "pedalboard_type_5": 6,
            "pedalboard_param1_5": 0.5,
            "pedalboard_param2_5": 0.3,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset6, "06_Clean_Nylon.json"))

    # Save all presets
    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 2: OVERDRIVEN GUITAR (6 presets)
# ============================================================================

def generate_overdriven_guitar_presets(output_dir):
    """Generate 6 overdriven guitar presets"""
    presets = []

    # 1. Crunch Vintage
    preset1 = create_preset(
        name="Crunch Vintage",
        description="Vintage amp breakup with warm, smooth overdrive",
        category="Overdriven Guitar",
        tags=["crunch", "vintage", "warm", "blues", "classic"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.994,
            "string_stiffness": 0.2,
            "string_brightness": 0.6,
            "bridge_coupling": 0.5,
            "bridge_nonlinearity": 0.2,
            "body_brightness": 0.5,
            "body_resonance": 0.6,
            "pedalboard_enable_0": True,   # Compressor
            "pedalboard_type_0": 0,
            "pedalboard_param1_0": 0.5,
            "pedalboard_param2_0": 0.4,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": True,   # Overdrive
            "pedalboard_type_2": 2,
            "pedalboard_param1_2": 0.6,    # Drive
            "pedalboard_param2_2": 0.5,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": False,
            "pedalboard_enable_5": True,   # Reverb
            "pedalboard_type_5": 6,
            "pedalboard_param1_5": 0.3,
            "pedalboard_param2_5": 0.3,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset1, "07_Crunch_Vintage.json"))

    # 2. Crunch Modern
    preset2 = create_preset(
        name="Crunch Modern",
        description="Modern high-gain crunch with tight low end",
        category="Overdriven Guitar",
        tags=["crunch", "modern", "high-gain", "tight", "rock"],
        parameters={
            "string_frequency": 0.5,
            "string_damping": 0.993,
            "string_stiffness": 0.25,
            "string_brightness": 0.7,
            "bridge_coupling": 0.55,
            "bridge_nonlinearity": 0.25,
            "body_brightness": 0.6,
            "body_resonance": 0.5,
            "pedalboard_enable_0": True,   # Compressor
            "pedalboard_type_0": 0,
            "pedalboard_param1_0": 0.6,
            "pedalboard_param2_0": 0.5,
            "pedalboard_enable_1": False,
            "pedalboard_enable_2": True,   # Overdrive
            "pedalboard_type_2": 2,
            "pedalboard_param1_2": 0.7,    # More drive
            "pedalboard_param2_2": 0.6,
            "pedalboard_enable_3": False,
            "pedalboard_enable_4": True,   # RAT
            "pedalboard_type_4": 4,
            "pedalboard_param1_4": 0.4,    # RAT drive
            "pedalboard_param2_4": 0.5,
            "pedalboard_enable_5": False,
            "pedalboard_enable_6": False,
            "pedalboard_enable_7": False
        }
    )
    presets.append((preset2, "08_Crunch_Modern.json"))

    # 3-6. More overdriven presets (simplified for space)
    for i, (name, desc, tags) in enumerate([
        ("Overdrive Blues", "Singing bluesy overdrive", ["overdrive", "blues", "singing", "soulful"]),
        ("Overdrive Rock", "Classic rock rhythm tone", ["overdrive", "rock", "classic", "rhythm"]),
        ("Overdrive Tube", "Warm tube amp overdrive", ["overdrive", "tube", "warm", "vintage"]),
        ("Overdrive Edge", "Edge of breakup crunch", ["overdrive", "edge", "dynamic", "touch-sensitive"])
    ], start=9):
        preset = create_preset(
            name=name,
            description=desc,
            category="Overdriven Guitar",
            tags=tags + ["overdriven"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.994,
                "string_stiffness": 0.2 + i * 0.02,
                "string_brightness": 0.6,
                "bridge_coupling": 0.5,
                "bridge_nonlinearity": 0.2 + i * 0.03,
                "body_brightness": 0.5,
                "body_resonance": 0.6,
                "pedalboard_enable_0": True,
                "pedalboard_type_0": 0,
                "pedalboard_param1_0": 0.5,
                "pedalboard_param2_0": 0.4,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": True,
                "pedalboard_type_2": 2,
                "pedalboard_param1_2": 0.5 + i * 0.05,
                "pedalboard_param2_2": 0.5,
                "pedalboard_enable_3": False,
                "pedalboard_enable_4": i % 2 == 0,  # Alternate RAT
                "pedalboard_type_4": 4,
                "pedalboard_param1_4": 0.3,
                "pedalboard_param2_4": 0.5,
                "pedalboard_enable_5": True,
                "pedalboard_type_5": 6,
                "pedalboard_param1_5": 0.3,
                "pedalboard_param2_5": 0.3,
                "pedalboard_enable_6": False,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 3: DISTORTED GUITAR (6 presets)
# ============================================================================

def generate_distorted_guitar_presets(output_dir):
    """Generate 6 distorted guitar presets"""
    presets = []

    distortion_presets = [
        ("Distortion Classic", "Classic distortion pedal tone", ["classic", "distortion", "pedal"], 2),
        ("Distortion Heavy", "Heavy metal high-gain distortion", ["heavy", "metal", "high-gain"], 3),
        ("Distortion Fuzzy", "Fuzzy saturated tone", ["fuzzy", "saturated", "thick"], 1),
        ("Distortion Modern", "Modern tight high-gain", ["modern", "tight", "aggressive"], 3),
        ("Distortion British", "British amp distortion", ["british", "marshall", "crunch"], 2),
        ("Distortion American", "American amp distortion", ["american", "mesa", "high-gain"], 3)
    ]

    for i, (name, desc, tags, drive_level) in enumerate(distortion_presets, start=13):
        preset = create_preset(
            name=name,
            description=desc,
            category="Distorted Guitar",
            tags=tags + ["distorted"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.992,
                "string_stiffness": 0.3,
                "string_brightness": 0.5,
                "bridge_coupling": 0.6,
                "bridge_nonlinearity": 0.35,
                "body_brightness": 0.4,
                "body_resonance": 0.5,
                "pedalboard_enable_0": True,
                "pedalboard_type_0": 0,
                "pedalboard_param1_0": 0.6,
                "pedalboard_param2_0": 0.5,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": drive_level >= 2,  # Overdrive for some
                "pedalboard_type_2": 2,
                "pedalboard_param1_2": 0.8,
                "pedalboard_param2_2": 0.6,
                "pedalboard_enable_3": drive_level >= 2,  # Distortion for most
                "pedalboard_type_3": 3,
                "pedalboard_param1_3": 0.7,
                "pedalboard_param2_3": 0.5,
                "pedalboard_enable_4": drive_level >= 3,  # RAT for high-gain
                "pedalboard_type_4": 4,
                "pedalboard_param1_4": 0.6,
                "pedalboard_param2_4": 0.5,
                "pedalboard_enable_5": False,
                "pedalboard_enable_6": False,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 4: LEAD GUITAR (5 presets)
# ============================================================================

def generate_lead_guitar_presets(output_dir):
    """Generate 5 lead guitar presets"""
    presets = []

    lead_presets = [
        ("Lead Smooth", "Smooth singing lead", ["smooth", "singing", "sustained"], 0.4),
        ("Lead Singing", "Expressive singing lead", ["expressive", "singing", "solo"], 0.5),
        ("Lead Shred", "Fast shred lead", ["shred", "fast", "aggressive"], 0.6),
        ("Lead Bluesy", "Bluesy lead tone", ["bluesy", "soulful", "dynamic"], 0.5),
        ("Lead Modern", "Modern high-tech lead", ["modern", "tight", "precise"], 0.6)
    ]

    for i, (name, desc, tags, gain) in enumerate(lead_presets, start=19):
        preset = create_preset(
            name=name,
            description=desc,
            category="Lead Guitar",
            tags=tags + ["lead"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.995,
                "string_stiffness": 0.2,
                "string_brightness": 0.7,
                "bridge_coupling": 0.5,
                "bridge_nonlinearity": 0.3,
                "body_brightness": 0.6,
                "body_resonance": 0.6,
                "pedalboard_enable_0": True,   # Compressor for sustain
                "pedalboard_type_0": 0,
                "pedalboard_param1_0": 0.7,
                "pedalboard_param2_0": 0.6,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": True,   # Overdrive
                "pedalboard_type_2": 2,
                "pedalboard_param1_2": gain,
                "pedalboard_param2_2": 0.6,
                "pedalboard_enable_3": gain > 0.5,  # Distortion for high gain
                "pedalboard_type_3": 3,
                "pedalboard_param1_3": gain * 0.8,
                "pedalboard_param2_3": 0.5,
                "pedalboard_enable_4": False,
                "pedalboard_enable_5": True,   # Delay/phaser
                "pedalboard_type_5": 5 if i % 2 == 0 else 6,
                "pedalboard_param1_5": 0.4,
                "pedalboard_param2_5": 0.5,
                "pedalboard_enable_6": True,   # Reverb
                "pedalboard_type_6": 6,
                "pedalboard_param1_6": 0.4,
                "pedalboard_param2_6": 0.3,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 5: AMBIENT GUITAR (5 presets)
# ============================================================================

def generate_ambient_guitar_presets(output_dir):
    """Generate 5 ambient guitar presets"""
    presets = []

    ambient_presets = [
        ("Ambient Pad", "Lush ambient pad", ["lush", "pad", "atmospheric"], 0.3),
        ("Ambient Swell", "Slow swell texture", ["swell", "slow", "evolving"], 0.4),
        ("Ambient Ebow", "Ebow-like sustain", ["ebow", "sustain", "infinite"], 0.2),
        ("Ambient Reverse", "Reverse-like effect", ["reverse", "unusual", "psychedelic"], 0.3),
        ("Ambient Texture", "Textural soundscape", ["textural", "soundscape", "ambient"], 0.35)
    ]

    for i, (name, desc, tags, stiffness) in enumerate(ambient_presets, start=24):
        preset = create_preset(
            name=name,
            description=desc,
            category="Ambient Guitar",
            tags=tags + ["ambient"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.998,  # Long decay
                "string_stiffness": stiffness,
                "string_brightness": 0.6,
                "bridge_coupling": 0.4,
                "bridge_nonlinearity": 0.15,
                "body_brightness": 0.5,
                "body_resonance": 0.7,
                "pedalboard_enable_0": False,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": False,
                "pedalboard_enable_3": False,
                "pedalboard_enable_4": False,
                "pedalboard_enable_5": True,   # Phaser
                "pedalboard_type_5": 5,
                "pedalboard_param1_5": 0.3,
                "pedalboard_param2_5": 0.6,
                "pedalboard_enable_6": True,   # Reverb (heavy)
                "pedalboard_type_6": 6,
                "pedalboard_param1_6": 0.8,    # Large room
                "pedalboard_param2_6": 0.2,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 6: BASS GUITAR (5 presets)
# ============================================================================

def generate_bass_guitar_presets(output_dir):
    """Generate 5 bass guitar presets"""
    presets = []

    bass_presets = [
        ("Bass Precision", "P-bass punchy tone", ["p-bass", "punchy", "vintage"], 0.3),
        ("Bass Jazz", "J-bass smooth tone", ["j-bass", "smooth", "round"], 0.25),
        ("Bass Fretless", "Fretless sustain", ["fretless", "sustain", "mwah"], 0.2),
        ("Bass Funky", "Funky punchy bass", ["funky", "slap", "percussive"], 0.4),
        ("Bass Dub", "Dub deep bass", ["dub", "deep", "sub"], 0.15)
    ]

    for i, (name, desc, tags, brightness) in enumerate(bass_presets, start=29):
        preset = create_preset(
            name=name,
            description=desc,
            category="Bass Guitar",
            tags=tags + ["bass"],
            parameters={
                "string_frequency": 0.2,  # Lower range
                "string_damping": 0.999,  # Heavy damping
                "string_stiffness": 0.15,
                "string_brightness": brightness,
                "bridge_coupling": 0.5,
                "bridge_nonlinearity": 0.1,
                "body_brightness": 0.3,
                "body_resonance": 0.8,
                "pedalboard_enable_0": True,   # Compressor (essential for bass)
                "pedalboard_type_0": 0,
                "pedalboard_param1_0": 0.6,
                "pedalboard_param2_0": 0.5,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": False,
                "pedalboard_enable_3": False,
                "pedalboard_enable_4": False,
                "pedalboard_enable_5": False,
                "pedalboard_enable_6": True,   # Light reverb
                "pedalboard_type_6": 6,
                "pedalboard_param1_6": 0.2,
                "pedalboard_param2_6": 0.3,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 7: SPECIAL EFFECTS (5 presets)
# ============================================================================

def generate_special_effects_presets(output_dir):
    """Generate 5 special effects presets"""
    presets = []

    fx_presets = [
        ("FX Sitar", "Sitar-like buzzing tone", ["sitar", "buzz", "drone"], 0.8, 0.1),
        ("FX Banjo", "Banjo-like plucky tone", ["banjo", "plucky", "country"], 0.9, 0.05),
        ("FX Ukulele", "Ukulele-like bright tone", ["ukulele", "bright", "small"], 0.85, 0.08),
        ("FX Mandolin", "Mandolin-like tremolo", ["mandolin", "tremolo", "folk"], 0.8, 0.1),
        ("FX Pedal Steel", "Pedal steel slide tone", ["pedal-steel", "slide", "country"], 0.6, 0.15)
    ]

    for i, (name, desc, tags, brightness, stiffness) in enumerate(fx_presets, start=34):
        preset = create_preset(
            name=name,
            description=desc,
            category="Special Effects",
            tags=tags + ["effect", "special"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.996,
                "string_stiffness": stiffness,
                "string_brightness": brightness,
                "bridge_coupling": 0.5,
                "bridge_nonlinearity": 0.12,
                "body_brightness": 0.7,
                "body_resonance": 0.6,
                "pedalboard_enable_0": False,
                "pedalboard_enable_1": False,
                "pedalboard_enable_2": False,
                "pedalboard_enable_3": False,
                "pedalboard_enable_4": False,
                "pedalboard_enable_5": i % 2 == 0,  # Alternate phaser
                "pedalboard_type_5": 5,
                "pedalboard_param1_5": 0.4,
                "pedalboard_param2_5": 0.5,
                "pedalboard_enable_6": True,   # Reverb
                "pedalboard_type_6": 6,
                "pedalboard_param1_6": 0.3,
                "pedalboard_param2_6": 0.3,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# CATEGORY 8: EXPERIMENTAL (3 presets)
# ============================================================================

def generate_experimental_presets(output_dir):
    """Generate 3 experimental presets"""
    presets = []

    exp_presets = [
        ("Exp Glitch", "Glitchy unstable tone", ["glitch", "unstable", "digital"], 0.9, 0.4),
        ("Exp Alien", "Alien texture", ["alien", "sci-fi", "unusual"], 0.7, 0.3),
        ("Exp Industrial", "Industrial noise", ["industrial", "noise", "harsh"], 0.5, 0.5)
    ]

    for i, (name, desc, tags, brightness, coupling) in enumerate(exp_presets, start=39):
        preset = create_preset(
            name=name,
            description=desc,
            category="Experimental",
            tags=tags + ["experimental", "weird"],
            parameters={
                "string_frequency": 0.5,
                "string_damping": 0.990,  # Less damping for instability
                "string_stiffness": 0.4,  # High stiffness
                "string_brightness": brightness,
                "bridge_coupling": coupling,
                "bridge_nonlinearity": 0.4,  # High nonlinearity
                "body_brightness": 0.6,
                "body_resonance": 0.5,
                "pedalboard_enable_0": False,
                "pedalboard_enable_1": i == 0,  # Octaver for glitch
                "pedalboard_type_1": 1,
                "pedalboard_param1_1": 0.7,
                "pedalboard_param2_1": 0.5,
                "pedalboard_enable_2": i == 2,  # Distortion for industrial
                "pedalboard_type_2": 3,
                "pedalboard_param1_2": 0.8,
                "pedalboard_param2_2": 0.6,
                "pedalboard_enable_3": False,
                "pedalboard_enable_4": i == 1,  # RAT for alien
                "pedalboard_type_4": 4,
                "pedalboard_param1_4": 0.7,
                "pedalboard_param2_4": 0.5,
                "pedalboard_enable_5": True,   # Phaser
                "pedalboard_type_5": 5,
                "pedalboard_param1_5": 0.7,
                "pedalboard_param2_5": 0.8,
                "pedalboard_enable_6": False,
                "pedalboard_enable_7": False
            }
        )
        presets.append((preset, f"{i:02d}_{name.replace(' ', '_')}.json"))

    for preset, filename in presets:
        save_preset(preset, filename, output_dir)

    return len(presets)

# ============================================================================
# MAIN GENERATION SCRIPT
# ============================================================================

def main():
    """Generate all 41 factory presets"""
    output_base_dir = "/Users/bretbouchard/apps/schill/juce_backend/presets/KaneMarcoAetherString"

    print("=" * 70)
    print(" Kane Marco Aether String - Factory Preset Generator")
    print(" Week 5: Creating 41 Factory Presets")
    print("=" * 70)
    print()

    total_presets = 0

    # Generate all 8 categories
    categories = [
        ("Clean Guitar", generate_clean_guitar_presets),
        ("Overdriven Guitar", generate_overdriven_guitar_presets),
        ("Distorted Guitar", generate_distorted_guitar_presets),
        ("Lead Guitar", generate_lead_guitar_presets),
        ("Ambient Guitar", generate_ambient_guitar_presets),
        ("Bass Guitar", generate_bass_guitar_presets),
        ("Special Effects", generate_special_effects_presets),
        ("Experimental", generate_experimental_presets)
    ]

    for category_name, generator_func in categories:
        print(f"\n📦 Generating {category_name} presets...")
        count = generator_func(output_base_dir)
        total_presets += count
        print(f"   ✅ Created {count} {category_name} presets")

    print()
    print("=" * 70)
    print(f" ✅ SUCCESS: Generated {total_presets} factory presets")
    print(f" 📁 Location: {output_base_dir}")
    print("=" * 70)
    print()

    # List all generated presets
    print("Generated Presets:")
    for root, dirs, files in os.walk(output_base_dir):
        for file in sorted(files):
            if file.endswith('.json'):
                print(f"  - {file}")

    return total_presets

if __name__ == "__main__":
    total = main()
    print(f"\n🎉 Total factory presets created: {total}")
    print("🎸 Kane Marco Aether String Week 5 complete!")
