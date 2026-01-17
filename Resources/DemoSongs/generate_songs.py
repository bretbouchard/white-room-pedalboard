#!/usr/bin/env python3
"""
Demo Song Generator for White Room

Generates 20 original compositions showcasing the full capabilities
of the Schillinger Engine system.
"""

import json
from pathlib import Path
from typing import Dict, List, Any

# Song templates
SONG_TEMPLATES = {
    "starter": [
        {
            "id": "starter_001",
            "name": "First Steps",
            "sequence": 1,
            "focus": ["Basic resultant rhythm", "Simple melodic contour", "Binary form"],
            "pulse_streams": [3, 5],
            "resultant": "3-2",
            "intervals": [3, -2, -1],
            "form": [8, 8]
        },
        {
            "id": "starter_002",
            "name": "Pulse Dance",
            "sequence": 2,
            "focus": ["7-8 interference", "Melodic repetition", "Call and response"],
            "pulse_streams": [7, 8],
            "resultant": "7-8 syncopation",
            "intervals": [2, 2, -3],
            "form": [4, 4, 4, 4]
        },
        {
            "id": "starter_003",
            "name": "Three Friends",
            "sequence": 3,
            "focus": ["Triple pulse streams", "Harmonic thirds", "Simple ABA"],
            "pulse_streams": [2, 3, 5],
            "resultant": "complex triplet",
            "intervals": [3, 4, -5],
            "form": [8, 4, 8]
        },
        {
            "id": "starter_004",
            "name": "Wandering Path",
            "sequence": 4,
            "focus": ["Phase offsets", "Stepwise melody", "Through-composed"],
            "pulse_streams": [4, 7],
            "resultant": "asymmetric 4-7",
            "intervals": [1, 2, 1, -2],
            "form": [6, 6, 4]
        },
        {
            "id": "starter_005",
            "name": "Heartbeat",
            "sequence": 5,
            "focus": ["2-3 groove", "Ostinato", "Minimal variation"],
            "pulse_streams": [2, 3],
            "resultant": "2-3 basic",
            "intervals": [0, 0, -5],
            "form": [16],
            "note": "Single pulse that evolves"
        }
    ],
    "showcase": [
        {
            "id": "showcase_006",
            "name": "Fractal Waltz",
            "sequence": 6,
            "focus": ["3-4 resultant", "Rotational symmetry", "Ternary form"],
            "agents": ["Rhythm", "Pitch", "Structure"],
            "complexity": "intermediate"
        },
        {
            "id": "showcase_007",
            "name": "Geometric Storm",
            "sequence": 7,
            "focus": ["5-7 interference", "Density ramps", "Energy curves"],
            "agents": ["Rhythm", "Energy"],
            "complexity": "intermediate"
        },
        {
            "id": "showcase_008",
            "name": "Permutation Garden",
            "sequence": 8,
            "focus": ["Fragment permutation", "Interval rotation", "Cellular form"],
            "agents": ["Pitch", "Structure"],
            "complexity": "intermediate"
        },
        {
            "id": "showcase_009",
            "name": "Crystal Lattice",
            "sequence": 9,
            "focus": ["Polyrhythmic layers", "Perfect intervals", "Static harmony"],
            "agents": ["Rhythm", "Harmony"],
            "complexity": "intermediate"
        },
        {
            "id": "showcase_010",
            "name": "Morphing Seasons",
            "sequence": 10,
            "focus": ["Parameter rebinding", "Gradual transformation", "Cycle forms"],
            "agents": ["Structure", "Energy"],
            "complexity": "intermediate"
        },
        {
            "id": "showcase_011",
            "name": "Predictability Dance",
            "sequence": 11,
            "focus": ["PM monitoring", "Agent intervention", "Dynamic balance"],
            "agents": ["Rhythm", "Pitch", "Structure", "Energy"],
            "complexity": "advanced_showcase"
        },
        {
            "id": "showcase_012",
            "name": "Dual Streams",
            "sequence": 12,
            "focus": ["Multi-stream output", "Independent pitch fields", "Interweaving"],
            "agents": ["Rhythm", "Pitch"],
            "complexity": "advanced_showcase"
        },
        {
            "id": "showcase_013",
            "name": "Block Collision",
            "sequence": 13,
            "focus": ["Hard cuts", "Juxtaposition", "Non-developmental form"],
            "agents": ["Structure", "Rhythm"],
            "complexity": "advanced_showcase"
        },
        {
            "id": "showcase_014",
            "name": "Saturation Point",
            "sequence": 14,
            "focus": ["Energy accumulation", "Layer saturation", "Climax logic"],
            "agents": ["Energy", "Orchestration"],
            "complexity": "advanced_showcase"
        },
        {
            "id": "showcase_015",
            "name": "Evolving Preset",
            "sequence": 15,
            "focus": ["Preset evolution", "Mutation logic", "Lineage tracking"],
            "agents": ["Rhythm", "Pitch", "Structure"],
            "complexity": "advanced_showcase"
        }
    ],
    "advanced": [
        {
            "id": "advanced_016",
            "name": "Missed Symphony",
            "sequence": 16,
            "focus": ["7-9-5 layers", "Contour expansion", "Phrygian dominant"],
            "agents": ["Rhythm", "Pitch", "Harmony", "Structure"],
            "complexity": "full_system"
        },
        {
            "id": "advanced_017",
            "name": "Ritual Mode",
            "sequence": 17,
            "focus": ["Non-isochronous cells", "Fragment tokens", "PM-driven"],
            "agents": ["Rhythm", "Pitch", "Structure", "Energy"],
            "complexity": "full_system"
        },
        {
            "id": "advanced_018",
            "name": "Inevitable Arrival",
            "sequence": 18,
            "focus": ["Monotonic acceleration", "Harmonic unveiling", "Directed form"],
            "agents": ["Rhythm", "Structure", "Energy"],
            "complexity": "full_system"
        },
        {
            "id": "advanced_019",
            "name": "Predictability Management",
            "sequence": 19,
            "focus": ["PM orchestration", "Multi-agent coordination", "Complex thresholds"],
            "agents": ["Rhythm", "Pitch", "Structure", "Energy"],
            "complexity": "expert"
        },
        {
            "id": "advanced_020",
            "name": "System Limits",
            "sequence": 20,
            "focus": ["Maximum complexity", "All agents active", "Boundary pushing"],
            "agents": ["Rhythm", "Pitch", "Harmony", "Structure", "Energy"],
            "complexity": "expert"
        }
    ]
}

def generate_song(template: Dict[str, Any], category: str) -> Dict[str, Any]:
    """Generate a complete song from template."""

    base_song = {
        "id": template["id"],
        "name": template["name"],
        "category": category,
        "difficulty": "beginner" if category == "starter" else "intermediate" if category == "showcase" else "advanced",
        "focus": template["focus"],
        "duration_seconds": 60 if category == "starter" else 120 if category == "showcase" else 180,
        "agents": template.get("agents", ["Rhythm", "Pitch"]),
        "description": f"Demonstrates: {', '.join(template['focus'])}",
        "composer": "Claude (White Room System)",
        "date_added": "2026-01-16",
        "sequence": template["sequence"]
    }

    # Add session model based on category
    if category == "starter":
        base_song["session_model"] = generate_starter_model(template)
    elif category == "showcase":
        base_song["session_model"] = generate_showcase_model(template)
    else:  # advanced
        base_song["session_model"] = generate_advanced_model(template)

    return base_song

def generate_starter_model(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate starter song model."""

    return {
        "tempo": 100 + (template["sequence"] * 10),
        "time_signature": [4, 4],
        "duration_bars": 16,
        "rhythm": {
            "primary_pulse_streams": [
                {"period": template["pulse_streams"][0], "phase_offset": 0, "weight": 1.0},
                {"period": template["pulse_streams"][1], "phase_offset": 0, "weight": 0.8}
            ],
            "resultant_pattern": template["resultant"],
            "density": 0.3 + (template["sequence"] * 0.05)
        },
        "pitch": {
            "primary_interval_seed": template["intervals"],
            "contour_type": "simple",
            "register_range": {"min": 60, "max": 72 + template["sequence"]},
            "scale": "pentatonic_major"
        },
        "form": {
            "structure": template["form"],
            "section_types": ["A"] * len(template["form"])
        },
        "orchestration": {
            "layers": [{"name": "melody", "register": "mid_high", "density_weight": 1.0}]
        }
    }

def generate_showcase_model(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate showcase song model."""

    # Base structure
    base_model = {
        "tempo": 90 + (template["sequence"] * 5),
        "time_signature": [4, 4],
        "duration_bars": 32,
        "rhythm": {
            "primary_pulse_streams": [
                {"period": 3 + template["sequence"], "phase_offset": 0, "weight": 1.0},
                {"period": 5 + template["sequence"], "phase_offset": 1, "weight": 0.8}
            ],
            "resultant_pattern": f"complex_{template['sequence']}",
            "density": 0.5 + (template["sequence"] * 0.03),
            "phase_resets": [{"target_stream": 0, "reset_point": 16}]
        },
        "pitch": {
            "primary_interval_seed": [2, 3, -5, 1],
            "contour_type": "moderate",
            "register_range": {"min": 48, "max": 84},
            "scale": "pentatonic_major"
        },
        "form": {
            "structure": [8, 8, 8, 8],
            "section_types": ["A", "A", "B", "A"]
        },
        "orchestration": {
            "layers": [
                {"name": "lead", "register": "mid_high", "density_weight": 0.7},
                {"name": "counter", "register": "mid", "density_weight": 0.5}
            ]
        }
    }

    # Add complexity based on focus
    if "Permutation" in template["name"]:
        base_model["pitch"] = {
            **base_model["pitch"],
            "permutation_enabled": True,
            "permutation_rules": ["rotation", "inversion"]
        }

    if "Energy" in " ".join(template["focus"]):
        base_model["energy"] = {
            "curve": "triangle" if template["sequence"] % 2 == 0 else "exponential",
            "saturation_point": 0.7 + (template["sequence"] * 0.02)
        }

    if "PM" in " ".join(template["focus"]):
        base_model["preset_evolution"] = {
            "enabled": True,
            "predictability_metric": {"threshold": 0.5}
        }

    return base_model

def generate_advanced_model(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate advanced song model."""

    # Maximum complexity structure
    base_model = {
        "tempo": 80 + (template["sequence"] * 3),
        "time_signature": [4, 4],
        "duration_bars": 64,
        "rhythm": {
            "primary_pulse_streams": [
                {"period": 7 + template["sequence"], "phase_offset": 0, "weight": 1.0},
                {"period": 9 + template["sequence"], "phase_offset": 2, "weight": 0.8},
                {"period": 5, "phase_offset": 1, "weight": 0.6}
            ],
            "resultant_pattern": f"advanced_{template['sequence']}",
            "density": 0.6 + (template["sequence"] * 0.02),
            "phase_resets": [
                {"target_stream": 0, "reset_point": 16},
                {"target_stream": 1, "reset_point": 32}
            ],
            "density_ramp": {"enabled": True, "rate": 0.1}
        },
        "pitch": {
            "primary_interval_seed": [1, 3, 5, 7, -2],
            "contour_type": "complex",
            "register_range": {"min": 36, "max": 84},
            "scale": "chromatic",
            "poly_pitch": {"enabled": True},
            "fragment_tokens": [{"intervals": [1, 3, 5]}],
            "permutation_enabled": True,
            "permutation_rules": ["rotation", "inversion", "truncation"]
        },
        "form": {
            "structure": [12, 8, 12, 16, 16],
            "section_types": ["A", "B", "A", "C", "D"],
            "transitions": "hard_cuts"
        },
        "orchestration": {
            "layers": [
                {"name": "lead", "register": "high", "density_weight": 0.8},
                {"name": "counter1", "register": "mid_high", "density_weight": 0.6},
                {"name": "counter2", "register": "mid", "density_weight": 0.5},
                {"name": "foundation", "register": "low", "density_weight": 0.4}
            ]
        },
        "energy": {
            "curve": "exponential",
            "saturation_point": 0.8 + (template["sequence"] * 0.01)
        }
    }

    # Add evolution for most advanced
    if template["sequence"] >= 19:
        base_model["preset_evolution"] = {
            "enabled": True,
            "mutation_budget": {"max_mutations": 3},
            "predictability_metric": {
                "thresholds": {"warn": 0.4, "intervene": 0.6, "force": 0.7}
            }
        }

    return base_model

def main():
    """Generate all songs."""

    output_dir = Path("/Users/bretbouchard/apps/schill/white_room/demo_songs")

    for category, templates in SONG_TEMPLATES.items():
        category_dir = output_dir / category
        category_dir.mkdir(exist_ok=True)

        for template in templates:
            song = generate_song(template, category)

            output_file = category_dir / f"{template['sequence']:03d}_{template['name'].lower().replace(' ', '_')}.json"

            with open(output_file, 'w') as f:
                json.dump(song, f, indent=2)

            print(f"Generated: {output_file}")

    print("\n✅ All demo songs generated successfully!")

if __name__ == "__main__":
    main()
