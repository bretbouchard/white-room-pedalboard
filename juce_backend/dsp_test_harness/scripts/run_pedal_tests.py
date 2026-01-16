#!/usr/bin/env python3
"""
Pedal DSP Test Runner
Simple test script to verify all pedals compile and run basic tests
"""

import subprocess
import sys
import os
from pathlib import Path

# List of all pedals to test
PEDALS = [
    "NoiseGate",
    "Compressor",
    "EQ",
    "Reverb",
    "Volume",
    "BiPhase",
    "Overdrive",
    "Fuzz",
    "Chorus",
    "Delay"
]

# Test types
TESTS = ["silence", "impulse", "tone_220hz"]

def run_test(pedal, test_type, binary_path="./bin/pedal_test_host"):
    """Run a single test for a pedal"""
    cmd = [binary_path, "--pedal", pedal, "--test", test_type]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Test timed out"
    except FileNotFoundError:
        return False, "", f"Binary not found: {binary_path}"

def main():
    # Parse arguments
    binary_path = "./bin/pedal_test_host"
    pedals_to_test = PEDALS.copy()

    if len(sys.argv) > 1:
        binary_path = sys.argv[1]

    if len(sys.argv) > 2:
        pedals_to_test = sys.argv[2:]

    print("=" * 70)
    print("Pedal DSP Test Runner")
    print("=" * 70)
    print(f"Binary: {binary_path}")
    print(f"Pedals to test: {', '.join(pedals_to_test)}")
    print()

    # Check if binary exists
    if not os.path.exists(binary_path):
        print(f"❌ ERROR: Binary not found: {binary_path}")
        print(f"   Please build the test harness first:")
        print(f"   cd dsp_test_harness/build")
        print(f"   cmake .. && make pedal_test_host")
        return 1

    # Run tests
    total_tests = 0
    passed_tests = 0
    failed_tests = 0

    for pedal in pedals_to_test:
        print(f"\n{'=' * 70}")
        print(f"Testing: {pedal}")
        print(f"{'=' * 70}")

        pedal_passed = 0
        pedal_failed = 0

        for test_type in TESTS:
            total_tests += 1
            print(f"\n  Running: {test_type}...", end=" ")

            passed, stdout, stderr = run_test(pedal, test_type, binary_path)

            if passed:
                print("✅ PASS")
                pedal_passed += 1
                passed_tests += 1

                # Show metrics
                if "RMS:" in stdout:
                    for line in stdout.split('\n'):
                        if 'RMS:' in line or 'Peak:' in line or 'DC Offset:' in line:
                            print(f"    {line.strip()}")
            else:
                print("❌ FAIL")
                pedal_failed += 1
                failed_tests += 1

                # Show error
                if stderr:
                    print(f"    Error: {stderr.split(chr(10))[0][:100]}")

        print(f"\n  {pedal} Results: {pedal_passed} passed, {pedal_failed} failed")

    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success rate: {100.0 * passed_tests / total_tests:.1f}%")

    if failed_tests == 0:
        print("\n✅ ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n❌ {failed_tests} TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
