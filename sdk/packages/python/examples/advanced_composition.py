"""
Advanced composition example.

This example demonstrates creating a complete composition with
multiple sections, using all major SDK features.
"""

import asyncio
from schillinger_sdk import SchillingerSDK


async def main():
    """Run advanced composition example."""

    async with SchillingerSDK(
        base_url="https://api.schillinger.io",
        api_key="your-api-key-here",
        enable_cache=True
    ) as sdk:

        print("=== Advanced Composition Example ===\n")

        # Step 1: Create composition
        print("1. Creating new composition...")
        composition = await sdk.composition.create(
            title="Summer Dream",
            metadata={
                "key": "C",
                "tempo": 120,
                "time_signature": "4/4",
                "tags": ["upbeat", "major", "contemporary"]
            }
        )
        print(f"   Created: {composition.id}")
        print(f"   Title: {composition.metadata.title}\n")

        # Step 2: Generate Verse 1
        print("2. Generating Verse 1...")
        verse1 = await sdk.composition.generate_section(
            composition_id=composition.id,
            section_name="Verse 1",
            bars=16,
            parameters={
                "generate_melody": True,
                "generate_harmony": True,
                "energy": 0.5,
                "mood": "gentle"
            }
        )
        print(f"   Section ID: {verse1.id}")
        print(f"   Bars: {verse1.bars}")
        if verse1.melody:
            print(f"   Melody notes: {len(verse1.melody.pitches)}")
        if verse1.harmony:
            print(f"   Harmony chords: {len(verse1.harmony.chords)}")
        print()

        # Step 3: Generate Chorus
        print("3. Generating Chorus...")
        chorus = await sdk.composition.generate_section(
            composition_id=composition.id,
            section_name="Chorus",
            bars=16,
            parameters={
                "generate_melody": True,
                "generate_harmony": True,
                "energy": 0.8,
                "mood": "uplifting"
            }
        )
        print(f"   Section ID: {chorus.id}")
        print(f"   Bars: {chorus.bars}")
        if chorus.melody:
            print(f"   Melody notes: {len(chorus.melody.pitches)}")
        print()

        # Step 4: Generate Verse 2 with variation
        print("4. Generating Verse 2 (variation of Verse 1)...")
        if verse1.melody:
            variations = await sdk.melody.generate_variations(
                melody={
                    "pitches": verse1.melody.pitches,
                    "durations": verse1.melody.durations
                },
                techniques=["ornamentation", "sequence"],
                count=2
            )
            print(f"   Generated {len(variations)} variations")
            for i, var in enumerate(variations, 1):
                print(f"   Variation {i}: {var.technique}")
        print()

        # Step 5: Generate Bridge
        print("5. Generating Bridge...")
        bridge = await sdk.composition.generate_section(
            composition_id=composition.id,
            section_name="Bridge",
            bars=8,
            parameters={
                "generate_melody": True,
                "generate_harmony": True,
                "energy": 0.6,
                "mood": "transitional"
            }
        )
        print(f"   Section ID: {bridge.id}")
        print(f"   Bars: {bridge.bars}\n")

        # Step 6: Analyze complete composition
        print("6. Analyzing composition...")
        analysis = await sdk.composition.analyze_composition(composition.id)
        print(f"   Coherence score: {analysis.coherence_score:.2f}")
        print(f"   Sections analyzed: {len(analysis.formal_structure)}")
        print()

        # Step 7: Export to MIDI
        print("7. Exporting to MIDI...")
        midi_data = await sdk.composition.export_composition(
            composition_id=composition.id,
            format="midi"
        )

        # Save to file
        output_file = "summer_dream.mid"
        with open(output_file, "wb") as f:
            f.write(midi_data)
        print(f"   Exported to: {output_file}")
        print()

        # Step 8: User input encoding example
        print("8. Encoding user melody idea...")
        user_contour = [2, 2, -1, 2, -2, 2, -1, 2]
        encoded = await sdk.composition.encode_user_input(
            input_type="contour",
            data=user_contour
        )
        print(f"   Encoding type: {encoded.encoding_type}")
        print(f"   Confidence: {encoded.confidence:.2f}")
        print()

        # Step 9: Decode back to melody
        print("9. Decoding to MusicXML...")
        decoded = await sdk.composition.decode_encoding(
            encoding=encoded,
            output_format="musicxml"
        )
        print(f"   Decoded format: musicxml")
        print()

        print("=== Advanced composition completed ===")
        print(f"Composition '{composition.metadata.title}' created with 4 sections")
        print(f"Total analysis coherence: {analysis.coherence_score:.2%}")


if __name__ == "__main__":
    asyncio.run(main())
