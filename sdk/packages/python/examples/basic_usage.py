"""
Basic usage example for the Schillinger SDK.

This example demonstrates the core functionality of the SDK including
rhythm generation, harmony analysis, and melody creation.
"""

import asyncio
from schillinger_sdk import SchillingerSDK


async def main():
    """Run basic usage examples."""

    # Initialize the SDK
    async with SchillingerSDK(
        base_url="https://api.schillinger.io",
        api_key="your-api-key-here"
    ) as sdk:

        print("=== Schillinger SDK - Basic Usage ===\n")

        # Example 1: Generate a rhythmic resultant
        print("1. Generating rhythmic resultant...")
        generators = [
            {"strikes": [0, 3, 6], "period": 8},
            {"strikes": [0, 2, 4, 6], "period": 8}
        ]
        resultant = await sdk.rhythm.generate_resultant(generators)
        print(f"   Resultant strikes: {resultant.resultant.strikes}")
        print(f"   Balance: {resultant.balance:.2f}")
        print(f"   Density: {resultant.resultant.density:.2f}\n")

        # Example 2: Generate harmonic progression
        print("2. Generating harmonic progression...")
        progression = await sdk.harmony.generate_progression(
            key="C",
            length=8,
            options={"scale": "major", "complexity": 0.5}
        )
        print(f"   Key: {progression.key}")
        print(f"   Number of chords: {len(progression.chords)}")
        for i, chord in enumerate(progression.chords[:4], 1):
            print(f"   Chord {i}: {chord.root} {chord.quality}")
        print()

        # Example 3: Generate a melody
        print("3. Generating melody...")
        melody = await sdk.melody.generate_melody(
            length=16,
            scale=[0, 2, 4, 5, 7, 9, 11],  # C major scale
            options={"complexity": 0.5, "range": (60, 72)}
        )
        print(f"   Generated {len(melody.pitches)} notes")
        print(f"   First 8 pitches: {melody.pitches[:8]}")
        print(f"   First 8 durations: {melody.durations[:8]}\n")

        # Example 4: Analyze a rhythmic pattern
        print("4. Analyzing rhythmic pattern...")
        pattern = {"strikes": [0, 3, 6], "period": 8}
        analysis = await sdk.rhythm.analyze_pattern(pattern)
        print(f"   Complexity: {analysis.complexity:.2f}")
        print(f"   Classification: {analysis.classification}")
        print(f"   Fit quality: {analysis.fit_quality:.2f}\n")

        # Example 5: Create a composition
        print("5. Creating composition...")
        composition = await sdk.composition.create(
            title="Example Composition",
            metadata={"key": "C", "tempo": 120, "time_signature": "4/4"}
        )
        print(f"   Composition ID: {composition.id}")
        print(f"   Title: {composition.metadata.title}")
        print(f"   Tempo: {composition.metadata.tempo} BPM\n")

        print("=== Examples completed successfully ===")


if __name__ == "__main__":
    asyncio.run(main())
