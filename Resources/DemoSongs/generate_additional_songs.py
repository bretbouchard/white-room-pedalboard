#!/usr/bin/env python3
"""
Additional Demo Songs for White Room
Creating 7 more showcase songs to reach 30 total
"""

import json
from pathlib import Path
from typing import Dict, List, Any

ADDITIONAL_SHOWCASE = [
    {
        "id": "showcase_021",
        "name": "Rotational Symmetry",
        "sequence": 21,
        "focus": ["Interval rotation", "Axis mirroring", "Symmetrical forms"],
        "agents": ["Pitch", "Structure"]
    },
    {
        "id": "showcase_022",
        "name": "Density Waves",
        "sequence": 22,
        "focus": ["Density oscillation", "Wave patterns", "Rhythmic breathing"],
        "agents": ["Rhythm", "Energy"]
    },
    {
        "id": "showcase_023",
        "name": "Fragment Garden",
        "sequence": 23,
        "focus": ["Motif fragmentation", "Recombination", "Cellular growth"],
        "agents": ["Pitch", "Structure"]
    },
    {
        "id": "showcase_024",
        "name": "Phase Drift",
        "sequence": 24,
        "focus": ["Phase offset evolution", "Gradual misalignment", "Resynchronization"],
        "agents": ["Rhythm", "Structure"]
    },
    {
        "id": "showcase_025",
        "name": "Harmonic Fields",
        "sequence": 25,
        "focus": ["Static harmony", "Pitch field navigation", "Non-functional harmony"],
        "agents": ["Pitch", "Harmony"]
    },
    {
        "id": "showcase_026",
        "name": "Energy Architecture",
        "sequence": 26,
        "focus": ["Energy curves", "Climax design", "Tension arcs"],
        "agents": ["Energy", "Structure"]
    },
    {
        "id": "showcase_027",
        "name": "Predictability Play",
        "sequence": 27,
        "focus": ["PM manipulation", "Expectation subversion", "Surprise design"],
        "agents": ["Rhythm", "Pitch", "Structure", "Energy"]
    }
]

def generate_song(template: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a complete song from template."""

    return {
        "id": template["id"],
        "name": template["name"],
        "category": "showcase",
        "difficulty": "intermediate",
        "focus": template["focus"],
        "duration_seconds": 120,
        "agents": template["agents"],
        "description": f"Demonstrates: {', '.join(template['focus'])}",
        "performance_notes": f"Focus on {template['focus'][0].lower()} and how it interacts with other system elements.",
        "composer": "Claude (White Room System)",
        "date_added": "2026-01-16",
        "sequence": template["sequence"],
        "session_model": {
            "tempo": 85 + (template["sequence"] * 3),
            "time_signature": [4, 4],
            "duration_bars": 32,
            "rhythm": {
                "primary_pulse_streams": [
                    {"period": 3 + template["sequence"], "phase_offset": 0, "weight": 1.0},
                    {"period": 5 + template["sequence"], "phase_offset": template["sequence"] % 3, "weight": 0.8}
                ],
                "resultant_pattern": f"showcase_{template['sequence']}",
                "density": 0.5 + (template["sequence"] * 0.025),
                "phase_drift": {
                    "enabled": "phase" in template["name"].lower(),
                    "rate": 0.05 if "phase" in template["name"].lower() else 0
                }
            },
            "pitch": {
                "primary_interval_seed": [2, 3, -5, 1, -3],
                "contour_type": "moderate",
                "register_range": {"min": 48, "max": 84},
                "scale": "pentatonic_major",
                "rotation": {
                    "enabled": "rotation" in template["name"].lower(),
                    "axis": "median",
                    "period": 8 if "rotation" in template["name"].lower() else 0
                }
            },
            "form": {
                "structure": [8, 8, 8, 8],
                "section_types": ["A", "B", "A", "C"],
                "transitions": "hard_cuts" if "fragment" in template["name"].lower() else "standard"
            },
            "orchestration": {
                "layers": [
                    {"name": "lead", "register": "mid_high", "density_weight": 0.7},
                    {"name": "texture", "register": "mid", "density_weight": 0.5}
                ]
            },
            "energy": {
                "curve": "sine" if "wave" in template["name"].lower() else "exponential",
                "saturation_point": 0.75,
                "oscillation": {
                    "enabled": "wave" in template["name"].lower(),
                    "period": 4
                }
            }
        },
        "preset_evolution": {
            "enabled": "predictability" in template["name"].lower() or "play" in template["name"].lower(),
            "predictability_metric": {
                "threshold": 0.5,
                "manipulation": "subversion" if "predictability" in template["name"].lower() else "standard"
            }
        }
    }

def main():
    """Generate additional showcase songs."""

    output_dir = Path("/Users/bretbouchard/apps/schill/white_room/demo_songs/showcase")

    for template in ADDITIONAL_SHOWCASE:
        song = generate_song(template)
        output_file = output_dir / f"{template['sequence']:03d}_{template['name'].lower().replace(' ', '_')}.json"

        with open(output_file, 'w') as f:
            json.dump(song, f, indent=2)

        print(f"Generated: {output_file}")

    # Update count
    total_songs = sum([
        len(list(Path("/Users/bretbouchard/apps/schill/white_room/demo_songs/converted").glob("*.json"))),
        len(list(Path("/Users/bretbouchard/apps/schill/white_room/demo_songs/starter").glob("*.json"))),
        len(list(Path("/Users/bretbouchard/apps/schill/white_room/demo_songs/showcase").glob("*.json"))),
        len(list(Path("/Users/bretbouchard/apps/schill/white_room/demo_songs/advanced").glob("*.json")))
    ])

    print(f"\n✅ Total songs in library: {total_songs}")

if __name__ == "__main__":
    main()
