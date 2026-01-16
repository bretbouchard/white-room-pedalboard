#!/usr/bin/env python3
"""
GenerateGoldenReferences.py

Phase 4C: Golden reference generation script
Generates deterministic audio reference files for all instruments

Created: December 30, 2025
Author: Bret Bouchard

Usage:
    python generate_golden_references.py
    python generate_golden_references.py --instrument NexSynth
    python generate_golden_references.py --regenerate
"""

import argparse
import os
import struct
import subprocess
import sys
from pathlib import Path
from datetime import datetime


class WAVWriter:
    """Simple WAV file writer for golden references"""

    @staticmethod
    def write(filename, left_channel, right_channel, sample_rate=48000):
        """
        Write stereo audio data to WAV file

        Args:
            filename: Output WAV filename
            left_channel: Left channel float samples (-1.0 to 1.0)
            right_channel: Right channel float samples (-1.0 to 1.0)
            sample_rate: Sample rate in Hz

        Returns:
            True if successful, False otherwise
        """
        try:
            num_samples = len(left_channel)
            assert len(right_channel) == num_samples, "Channel lengths must match"

            with open(filename, "wb") as f:
                # Write WAV header
                f.write(b"RIFF")
                f.write(struct.pack("<I", 36 + num_samples * 2 * 2))  # File size
                f.write(b"WAVE")
                f.write(b"fmt ")
                f.write(struct.pack("<I", 16))  # fmt chunk size
                f.write(struct.pack("<H", 1))  # PCM audio format
                f.write(struct.pack("<H", 2))  # Stereo
                f.write(struct.pack("<I", sample_rate))
                f.write(struct.pack("<I", sample_rate * 2 * 2))  # Byte rate
                f.write(struct.pack("<H", 4))  # Block align
                f.write(struct.pack("<H", 16))  # Bits per sample
                f.write(b"data")
                f.write(struct.pack("<I", num_samples * 2 * 2))  # Data size

                # Write audio data (16-bit PCM)
                for i in range(num_samples):
                    # Clamp and convert to 16-bit integer
                    left_sample = max(-1.0, min(1.0, left_channel[i]))
                    right_sample = max(-1.0, min(1.0, right_channel[i]))

                    left_int = int(left_sample * 32767.0)
                    right_int = int(right_sample * 32767.0)

                    f.write(struct.pack("<h", left_int))
                    f.write(struct.pack("<h", right_int))

            return True

        except Exception as e:
            print(f"ERROR: Failed to write {filename}: {e}")
            return False


class GoldenReferenceGenerator:
    """Generates golden reference WAV files for all instruments"""

    def __init__(self, output_dir="tests/golden/reference"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Define golden reference specifications
        self.specs = [
            # NexSynth
            {
                "instrument": "NexSynth",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "NexSynth_C4_127.wav",
            },
            {
                "instrument": "NexSynth",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "NexSynth_C4_064.wav",
            },
            # SamSampler
            {
                "instrument": "SamSampler",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "SamSampler_C4_127.wav",
            },
            {
                "instrument": "SamSampler",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "SamSampler_C4_064.wav",
            },
            # LocalGal
            {
                "instrument": "LocalGal",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "LocalGal_C4_127.wav",
            },
            {
                "instrument": "LocalGal",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "LocalGal_C4_064.wav",
            },
            # KaneMarco
            {
                "instrument": "KaneMarco",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "KaneMarco_C4_127.wav",
            },
            {
                "instrument": "KaneMarco",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "KaneMarco_C4_064.wav",
            },
            # KaneMarcoAether
            {
                "instrument": "KaneMarcoAether",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "KaneMarcoAether_C4_127.wav",
            },
            {
                "instrument": "KaneMarcoAether",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "KaneMarcoAether_C4_064.wav",
            },
            # KaneMarcoAetherString
            {
                "instrument": "KaneMarcoAetherString",
                "note": 60,
                "velocity": 1.0,
                "blocks": 100,
                "filename": "KaneMarcoAetherString_C4_127.wav",
            },
            {
                "instrument": "KaneMarcoAetherString",
                "note": 60,
                "velocity": 0.5,
                "blocks": 100,
                "filename": "KaneMarcoAetherString_C4_064.wav",
            },
        ]

    def generate_all(self, instrument_filter=None):
        """Generate all golden reference files"""
        print("\n" + "=" * 50)
        print("  Golden Reference Generator")
        print("  Phase 4C: Deterministic Audio Validation")
        print("=" * 50 + "\n")

        print(f"Generation Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        success_count = 0
        total_count = 0

        for spec in self.specs:
            # Filter by instrument if specified
            if instrument_filter and spec["instrument"] != instrument_filter:
                continue

            total_count += 1
            output_path = self.output_dir / spec["filename"]

            if self.generate_reference(spec, output_path):
                success_count += 1

            print()  # Blank line between specs

        # Print summary
        print("=" * 50)
        print("Generation Summary")
        print("=" * 50)
        print(f"Total References: {total_count}")
        print(f"Successfully Generated: {success_count}")
        print(f"Failed: {total_count - success_count}")
        print(f"Success Rate: {100.0 * success_count / total_count:.1f}%")
        print("=" * 50 + "\n")

        if success_count == total_count:
            print("✅ All golden references generated successfully!")
            print("\nNext steps:")
            print("  1. Review generated WAV files in tests/golden/reference/")
            print("  2. Commit reference files to repository")
            print("  3. Run golden tests: ./GoldenTest")
            return 0
        else:
            print("⚠️  Some golden references failed to generate")
            return 1

    def generate_reference(self, spec, output_path):
        """Generate a single golden reference using C++ tool"""
        instrument = spec["instrument"]
        note = spec["note"]
        velocity = spec["velocity"]
        blocks = spec["blocks"]
        filename = spec["filename"]

        print(f"Generating golden reference: {filename}")

        # Check if GenerateGoldenReferences executable exists
        exe_path = Path("GenerateGoldenReferences")
        if not exe_path.exists():
            # Try in build directory
            exe_path = Path("../build_phase4c/GenerateGoldenReferences")

        if not exe_path.exists():
            print(f"  ⚠️  GenerateGoldenReferences executable not found")
            print(f"      Build it first: make GenerateGoldenReferences")
            return False

        # Run C++ tool to generate reference
        try:
            cmd = [str(exe_path)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            print(f"  ❌ Generation timed out")
            return False
        except Exception as e:
            print(f"  ❌ Failed to run generation: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate golden reference WAV files for deterministic audio testing"
    )
    parser.add_argument(
        "--instrument",
        type=str,
        help="Generate references for specific instrument only",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="tests/golden/reference",
        help="Output directory for reference files",
    )
    parser.add_argument(
        "--regenerate",
        action="store_true",
        help="Regenerate all references (overwrite existing)",
    )

    args = parser.parse_args()

    generator = GoldenReferenceGenerator(output_dir=args.output_dir)
    return generator.generate_all(instrument_filter=args.instrument)


if __name__ == "__main__":
    sys.exit(main())
