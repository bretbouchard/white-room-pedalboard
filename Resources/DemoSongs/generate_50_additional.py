#!/usr/bin/env python3
"""
Extended Demo Song Generator for White Room
Creating 50 additional songs to reach 80 total compositions
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import random

# Extended song templates
ADDITIONAL_SHOWCASE = [
    # Additional Showcase Songs (028-040)
    {"id": "showcase_028", "name": "Binary Pulse", "sequence": 28, "focus": ["Binary rhythm", "On/off patterns", "Digital aesthetics"], "agents": ["Rhythm", "Energy"]},
    {"id": "showcase_029", "name": "Fibonacci Flow", "sequence": 29, "focus": ["Fibonacci sequences", "Golden ratio", "Natural patterns"], "agents": ["Rhythm", "Pitch", "Structure"]},
    {"id": "showcase_030", "name": "Mirror Image", "sequence": 30, "focus": ["Retrograde inversion", "Symmetry", "Palindrome structures"], "agents": ["Pitch", "Structure"]},
    {"id": "showcase_031", "name": "Silence and Sound", "sequence": 31, "focus": ["Negative space", "Rest as rhythm", "Tactical silence"], "agents": ["Rhythm", "Structure"]},
    {"id": "showcase_032", "name": "Glitch Garden", "sequence": 32, "focus": ["Controlled chaos", "Micro-rhythms", "Digital artifacts"], "agents": ["Rhythm", "Pitch"]},
    {"id": "showcase_033", "name": "Temp elastic", "sequence": 33, "focus": ["Rubato patterns", "Flexible time", "Expressive timing"], "agents": ["Rhythm", "Energy"]},
    {"id": "showcase_034", "name": "Cluster Fields", "sequence": 34, "focus": ["Pitch clusters", "Chromatic density", "Mass effect"], "agents": ["Pitch", "Harmony"]},
    {"id": "showcase_035", "name": "Ostinato Odyssey", "sequence": 35, "focus": ["Minimal variation", "Pattern evolution", "Hypnotic repetition"], "agents": ["Rhythm", "Structure"]},
    {"id": "showcase_036", "name": "Call Response", "sequence": 36, "focus": ["Dialog structures", "Echo patterns", "Conversational forms"], "agents": ["Rhythm", "Pitch", "Structure"]},
    {"id": "showcase_037", "name": "Crescendo Core", "sequence": 37, "focus": ["Linear growth", "Continuous build", "Maximum impact"], "agents": ["Energy", "Structure"]},
    {"id": "showcase_038", "name": "Diminution Dance", "sequence": 38, "focus": ["Note values", "Compression", "Acceleration effects"], "agents": ["Rhythm", "Energy"]},
    {"id": "showcase_039", "name": "Texture Layers", "sequence": 39, "focus": ["Orchestral density", "Timbral evolution", "Surface depth"], "agents": ["Orchestration", "Energy"]},
    {"id": "showcase_040", "name": "Modulation Matrix", "sequence": 40, "focus": ["Parameter change", "Smooth transitions", "Morphing states"], "agents": ["Structure", "Energy"]}
]

# New Intermediate Category (041-060)
INTERMEDIATE_SONGS = [
    {"id": "intermediate_041", "name": "Quantum Leaps", "sequence": 41, "focus": ["Large intervals", "Register jumps", "Discontinuous pitch"], "agents": ["Pitch", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_042", "name": "Polyrhythm Palace", "sequence": 42, "focus": ["3 against 4", "5 against 7", "Complex layers"], "agents": ["Rhythm", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_043", "name": "Harmonic Motion", "sequence": 43, "focus": ["Root movement", "Progression logic", "Tonal journey"], "agents": ["Harmony", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_044", "name": "Melodic Morph", "sequence": 44, "focus": ["Contour transformation", "Shape shifting", "Line evolution"], "agents": ["Pitch", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_045", "name": "Rhythmic Complexity", "sequence": 45, "focus": ["Subdivision", "Cross-rhythms", "Grouping accents"], "agents": ["Rhythm", "Energy"], "complexity": "intermediate"},
    {"id": "intermediate_046", "name": "Form and Function", "sequence": 46, "focus": ["Structural design", "Sectional contrast", "Narrative arc"], "agents": ["Structure", "Energy"], "complexity": "intermediate"},
    {"id": "intermediate_047", "name": "Duo Dynamics", "sequence": 47, "focus": ["Two-part writing", "Counterpoint", "Independent lines"], "agents": ["Rhythm", "Pitch", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_048", "name": "Triple Threat", "sequence": 48, "focus": ["Three-part layers", "Triadic interplay", "Complex textures"], "agents": ["Rhythm", "Pitch", "Harmony"], "complexity": "intermediate"},
    {"id": "intermediate_049", "name": "Evolution Engine", "sequence": 49, "focus": ["Preset mutation", "Generative change", "Living music"], "agents": ["Structure", "Energy"], "complexity": "intermediate", "evolution": "enabled"},
    {"id": "intermediate_050", "name": "Predictability Play", "sequence": 50, "focus": ["PM manipulation", "Surprise design", "Expectation subversion"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "intermediate", "pm": "advanced"},
    {"id": "intermediate_051", "name": "Density Design", "sequence": 51, "focus": ["Note density", "Texture control", "Sonic saturation"], "agents": ["Rhythm", "Pitch", "Energy"], "complexity": "intermediate"},
    {"id": "intermediate_052", "name": "Spatial Audio", "sequence": 52, "focus": ["Stereo field", "Panning patterns", "Space perception"], "agents": ["Orchestration", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_053", "name": "Temporal Distortion", "sequence": 53, "focus": ["Time stretching", "Compression", "Elastic timing"], "agents": ["Rhythm", "Energy"], "complexity": "intermediate"},
    {"id": "intermediate_054", "name": "Spectral Layers", "sequence": 54, "focus": ["Frequency content", "Spectral evolution", "Timbral design"], "agents": ["Pitch", "Orchestration"], "complexity": "intermediate"},
    {"id": "intermediate_055", "name": "Dynamic Range", "sequence": 55, "focus": ["Extreme contrasts", "Whisper to roar", "Drama control"], "agents": ["Energy", "Orchestration"], "complexity": "intermediate"},
    {"id": "intermediate_056", "name": "Modulation Mastery", "sequence": 56, "focus": ["Key changes", "Seamless transitions", "Tonal center shift"], "agents": ["Harmony", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_057", "name": "Fragment Fusion", "sequence": 57, "focus": ["Motif combination", "Cellular interaction", "Modular assembly"], "agents": ["Pitch", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_058", "name": "Phase Patterns", "sequence": 58, "focus": ["Cyclic relationships", "Phase locking", "Interference cycles"], "agents": ["Rhythm", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_059", "name": "Energy Arcs", "sequence": 59, "focus": ["Tension curves", "Release timing", "Dramatic shape"], "agents": ["Energy", "Structure"], "complexity": "intermediate"},
    {"id": "intermediate_060", "name": "System Synthesis", "sequence": 60, "focus": ["Multi-agent integration", "Complex coordination", "Full feature use"], "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy"], "complexity": "intermediate_high"}
]

# Extended Advanced Category (061-080)
EXTENDED_ADVANCED = [
    {"id": "advanced_061", "name": "Chaos Theory", "sequence": 61, "focus": ["Deterministic chaos", "Strange attractors", "Butterfly effects"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "expert"},
    {"id": "advanced_062", "name": "Fractal Music", "sequence": 62, "focus": ["Self-similarity", "Recursive structures", "Mandelbrot patterns"], "agents": ["Pitch", "Structure"], "complexity": "expert"},
    {"id": "advanced_063", "name": "Stochastic Symphony", "sequence": 63, "focus": ["Probability distributions", "Randomness control", "Calculated chance"], "agents": ["Rhythm", "Pitch", "Energy"], "complexity": "expert"},
    {"id": "advanced_064", "name": "Cellular Automata", "sequence": 64, "focus": ["1D automation", "Game of Life", "Evolutionary rules"], "agents": ["Rhythm", "Pitch", "Structure"], "complexity": "expert"},
    {"id": "advanced_065", "name": "Neural Network", "sequence": 65, "focus": ["Pattern recognition", "Learning systems", "Adaptive behavior"], "agents": ["Structure", "Energy"], "complexity": "expert", "evolution": "advanced"},
    {"id": "advanced_066", "name": "Predictability Prime", "sequence": 66, "focus": ["PM optimization", "Surprise maximization", "Entropy control"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "expert", "pm": "expert"},
    {"id": "advanced_067", "name": "Generative Genome", "sequence": 67, "focus": ["DNA sequences", "Biological patterns", "Organic algorithms"], "agents": ["Pitch", "Structure"], "complexity": "expert"},
    {"id": "advanced_068", "name": "Quantum Computing", "sequence": 68, "focus": ["Superposition", "Entanglement", "Qubit states"], "agents": ["Rhythm", "Pitch", "Structure"], "complexity": "expert"},
    {"id": "advanced_069", "name": "Multi-Scale Mastery", "sequence": 69, "focus": ["Time scales", "Hierarchical rhythm", "Fractal time"], "agents": ["Rhythm", "Structure"], "complexity": "expert"},
    {"id": "advanced_070", "name": "Emergent Empire", "sequence": 70, "focus": ["Complex systems", "Emergence", "Self-organization"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "expert"},
    {"id": "advanced_071", "name": "Information Theory", "sequence": 71, "focus": ["Entropy metrics", "Information density", "Channel capacity"], "agents": ["Rhythm", "Pitch", "Energy"], "complexity": "expert"},
    {"id": "advanced_072", "name": "Network Theory", "sequence": 72, "focus": ["Graph structures", "Node connections", "Network topology"], "agents": ["Structure", "Energy"], "complexity": "expert"},
    {"id": "advanced_073", "name": "Cognitive Computing", "sequence": 73, "focus": ["Pattern matching", "Memory systems", "Learning algorithms"], "agents": ["Structure", "Energy"], "complexity": "expert", "evolution": "advanced"},
    {"id": "advanced_074", "name": "Algorithmic Art", "sequence": 74, "focus": ["Procedural generation", "Algorithmic beauty", "Code as music"], "agents": ["Rhythm", "Pitch", "Structure"], "complexity": "expert"},
    {"id": "advanced_075", "name": "System Singularity", "sequence": 75, "focus": ["Maximum complexity", "All features", "Boundary dissolution"], "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy"], "complexity": "ultimate"},
    {"id": "advanced_076", "name": "Predictability Paradox", "sequence": 76, "focus": ["PM manipulation", "Order from chaos", "Calculated randomness"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "ultimate", "pm": "master"},
    {"id": "advanced_077", "name": "Evolution Everest", "sequence": 77, "focus": ["Preset evolution", "Mutation mastery", "Lineage complexity"], "agents": ["Rhythm", "Pitch", "Structure", "Energy"], "complexity": "ultimate", "evolution": "master"},
    {"id": "advanced_078", "name": "Agent Orchestration", "sequence": 78, "focus": ["Multi-agent coordination", "Complex interaction", "System synergy"], "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy"], "complexity": "ultimate"},
    {"id": "advanced_079", "name": "Complexity Cathedral", "sequence": 79, "focus": ["Maximum expressivity", "Full system", "Ultimate demonstration"], "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy"], "complexity": "ultimate"},
    {"id": "advanced_080", "name": "White Room Magnum Opus", "sequence": 80, "focus": ["Everything everywhere", "Complete showcase", "System masterpiece"], "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy", "Evolution"], "complexity": "masterpiece"}
]

def generate_showcase_song(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate showcase song."""
    return {
        "id": template["id"],
        "name": template["name"],
        "category": "showcase",
        "difficulty": "intermediate",
        "focus": template["focus"],
        "duration_seconds": 120,
        "agents": template["agents"],
        "description": f"Demonstrates: {', '.join(template['focus'])}",
        "composer": "Claude (White Room System)",
        "date_added": "2026-01-16",
        "sequence": template["sequence"],
        "session_model": generate_session_model(template, "showcase")
    }

def generate_intermediate_song(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate intermediate song."""
    return {
        "id": template["id"],
        "name": template["name"],
        "category": "intermediate",
        "difficulty": "intermediate",
        "focus": template["focus"],
        "duration_seconds": 150,
        "agents": template["agents"],
        "description": f"Demonstrates: {', '.join(template['focus'])}",
        "composer": "Claude (White Room System)",
        "date_added": "2026-01-16",
        "sequence": template["sequence"],
        "session_model": generate_session_model(template, "intermediate")
    }

def generate_advanced_song(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate advanced song."""
    return {
        "id": template["id"],
        "name": template["name"],
        "category": "advanced",
        "difficulty": "advanced",
        "focus": template["focus"],
        "duration_seconds": 180,
        "agents": template["agents"],
        "description": f"Demonstrates: {', '.join(template['focus'])}",
        "composer": "Claude (White Room System)",
        "date_added": "2026-01-16",
        "sequence": template["sequence"],
        "session_model": generate_session_model(template, "advanced")
    }

def generate_session_model(template: Dict[str, Any], category: str) -> Dict[str, Any]:
    """Generate session model based on category and template."""

    complexity_multiplier = 1.0 + (template["sequence"] * 0.01)

    if category == "showcase":
        base_tempo = 90 + (template["sequence"] * 2)
        base_density = 0.5 + (template["sequence"] * 0.02)
        num_streams = 2
        num_layers = 2
        evolution = template.get("evolution") == "enabled"

    elif category == "intermediate":
        base_tempo = 85 + (template["sequence"] * 1.5)
        base_density = 0.55 + (template["sequence"] * 0.015)
        num_streams = 2 + (template["sequence"] % 2)
        num_layers = 2 + (template["sequence"] % 3)
        evolution = template.get("evolution") == "enabled"

    else:  # advanced
        base_tempo = 80 + template["sequence"]
        base_density = 0.6 + (template["sequence"] * 0.01)
        num_streams = 3 + (template["sequence"] % 2)
        num_layers = 3 + (template["sequence"] % 2)
        evolution = True

    model = {
        "tempo": base_tempo,
        "time_signature": [4, 4],
        "duration_bars": 32 if category == "showcase" else 48 if category == "intermediate" else 64,
        "rhythm": {
            "primary_pulse_streams": [
                {"period": 3 + template["sequence"], "phase_offset": 0, "weight": 1.0}
            ] + [
                {"period": 5 + template["sequence"] + i, "phase_offset": i, "weight": 0.8 - (i * 0.1)}
                for i in range(num_streams - 1)
            ],
            "resultant_pattern": f"{category}_{template['sequence']}",
            "density": min(base_density * complexity_multiplier, 0.9),
            "phase_resets": [{"target_stream": i % 3, "reset_point": 16 + (i * 8)} for i in range(num_streams)]
        },
        "pitch": {
            "primary_interval_seed": [2, 3, -5, 1, -3, 4][:3 + (template["sequence"] % 4)],
            "contour_type": "moderate" if category == "showcase" else "complex",
            "register_range": {
                "min": 48 - (template["sequence"] if category == "advanced" else 0),
                "max": 72 + (template["sequence"] if category == "advanced" else 12)
            },
            "scale": "chromatic" if category == "advanced" else "pentatonic_major",
            "permutation_enabled": category != "showcase",
            "poly_pitch": {"enabled": category == "advanced"}
        },
        "form": {
            "structure": [8, 8, 8, 8] if category == "showcase" else [12, 8, 12, 16] if category == "intermediate" else [16, 12, 16, 20],
            "section_types": ["A", "B", "A", "C"],
            "transitions": "hard_cuts" if category == "advanced" else "standard"
        },
        "orchestration": {
            "layers": [
                {"name": f"layer_{i}", "register": ["low", "mid", "mid_high", "high"][i % 4], "density_weight": 0.4 + (i * 0.15)}
                for i in range(num_layers)
            ]
        },
        "energy": {
            "curve": random.choice(["linear", "exponential", "triangle", "sine"]),
            "saturation_point": 0.7 + (template["sequence"] * 0.005)
        }
    }

    # Add evolution if enabled
    if evolution or template.get("evolution") == "enabled" or template.get("evolution") == "advanced":
        model["preset_evolution"] = {
            "enabled": True,
            "mutation_budget": {"max_mutations": 3 if category == "intermediate" else 4},
            "predictability_metric": {
                "thresholds": {"warn": 0.45, "intervene": 0.6, "force": 0.75}
            }
        }

    # Add PM if specified
    if template.get("pm"):
        if not "preset_evolution" in model:
            model["preset_evolution"] = {}
        model["preset_evolution"]["predictability_metric"] = {
            "thresholds": {"warn": 0.35, "intervene": 0.5, "force": 0.65},
            "optimization": template["pm"]
        }

    return model

def main():
    """Generate all 50 additional songs."""

    output_base = Path("/Users/bretbouchard/apps/schill/white_room/demo_songs")

    # Create intermediate directory
    (output_base / "intermediate").mkdir(exist_ok=True)

    all_songs = []

    # Generate additional showcase (028-040)
    print("Generating Additional Showcase Songs (028-040)...")
    for template in ADDITIONAL_SHOWCASE:
        song = generate_showcase_song(template)
        output_file = output_base / "showcase" / f"{template['sequence']:03d}_{template['name'].lower().replace(' ', '_')}.json"
        output_file.write_text(json.dumps(song, indent=2))
        all_songs.append(song)
        print(f"  ✓ {song['name']}")

    # Generate intermediate songs (041-060)
    print("\nGenerating Intermediate Songs (041-060)...")
    for template in INTERMEDIATE_SONGS:
        song = generate_intermediate_song(template)
        output_file = output_base / "intermediate" / f"{template['sequence']:03d}_{template['name'].lower().replace(' ', '_')}.json"
        output_file.write_text(json.dumps(song, indent=2))
        all_songs.append(song)
        print(f"  ✓ {song['name']}")

    # Generate extended advanced (061-080)
    print("\nGenerating Extended Advanced Songs (061-080)...")
    for template in EXTENDED_ADVANCED:
        song = generate_advanced_song(template)
        output_file = output_base / "advanced" / f"{template['sequence']:03d}_{template['name'].lower().replace(' ', '_')}.json"
        output_file.write_text(json.dumps(song, indent=2))
        all_songs.append(song)
        print(f"  ✓ {song['name']}")

    # Count total
    total_songs = sum([
        len(list((output_base / "converted").glob("*.json"))),
        len(list((output_base / "starter").glob("*.json"))),
        len(list((output_base / "showcase").glob("*.json"))),
        len(list((output_base / "intermediate").glob("*.json"))),
        len(list((output_base / "advanced").glob("*.json")))
    ])

    print(f"\n{'='*60}")
    print(f"✅ COMPLETE: Generated {len(all_songs)} additional songs")
    print(f"{'='*60}")
    print(f"Total library size: {total_songs} songs")
    print(f"\nBreakdown:")
    print(f"  Converted:  {len(list((output_base / 'converted').glob('*.json')))} songs")
    print(f"  Starter:    {len(list((output_base / 'starter').glob('*.json')))} songs")
    print(f"  Showcase:   {len(list((output_base / 'showcase').glob('*.json')))} songs")
    print(f"  Intermediate: {len(list((output_base / 'intermediate').glob('*.json')))} songs")
    print(f"  Advanced:   {len(list((output_base / 'advanced').glob('*.json')))} songs")

if __name__ == "__main__":
    main()
