#!/usr/bin/env python3
"""
generate_golden_fixtures.py

Generates golden test fixtures for tvOS SDK integration testing.
These fixtures capture request/response pairs for deterministic testing.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime

FIXTURES_DIR = Path(__file__).parent.parent / "tests" / "schillinger" / "fixtures"

def generate_fixture(name, request, response):
    """Generate a golden test fixture"""
    fixture_dir = FIXTURES_DIR / name
    fixture_dir.mkdir(parents=True, exist_ok=True)

    # Write request
    with open(fixture_dir / "request.json", "w") as f:
        json.dump(request, f, indent=2)

    # Write response
    with open(fixture_dir / "response.json", "w") as f:
        json.dump(response, f, indent=2)

    # Add metadata
    metadata = {
        "generatedAt": datetime.now().isoformat(),
        "requestHash": hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest(),
        "responseHash": hashlib.sha256(json.dumps(response, sort_keys=True).encode()).hexdigest()
    }

    with open(fixture_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"✅ Generated fixture: {name}")

def generate_init_fixture():
    """Fixture 1: SDK Initialization"""
    request = {
        "op": "init",
        "id": "req-init-001",
        "payload": {
            "sessionSeed": 12345,
            "graphInstanceId": "test-graph-golden",
            "schemaVersion": "2.0.0",
            "sdkBuildHash": "tvos-bundle-test"
        }
    }

    response = {
        "id": "req-init-001",
        "ok": True,
        "result": {
            "sessionId": "session-test-001",
            "sdkBuildHash": "tvos-bundle-v1",
            "schemaVersion": "2.0.0"
        }
    }

    generate_fixture("init_sequence", request, response)

def generate_apply_ir_fixture():
    """Fixture 2: Apply IR Delta"""
    request = {
        "op": "applyIR",
        "id": "req-apply-001",
        "payload": {
            "sessionId": "session-test-001",
            "irDelta": {
                "type": "add",
                "path": "songGraph.tempo",
                "value": 120
            }
        }
    }

    response = {
        "id": "req-apply-001",
        "ok": True,
        "result": {
            "irHash": "abc123def456"
        }
    }

    generate_fixture("apply_ir_delta", request, response)

def generate_plan_fixtures():
    """Fixture 3 & 4: Generate Plan for multiple windows"""
    windows = [
        (0, 48000),
        (48000, 96000),
        (96000, 192000)
    ]

    for i, (start, end) in enumerate(windows, 1):
        request = {
            "op": "plan",
            "id": f"req-plan-00{i}",
            "payload": {
                "sessionId": "session-test-001",
                "window": {
                    "from": start,
                    "to": end
                }
            }
        }

        response = {
            "id": f"req-plan-00{i}",
            "ok": True,
            "result": {
                "planHash": f"plan-hash-{i:03d}",
                "irHash": "abc123def456",
                "generatedAt": 1234567890,
                "window": {"from": start, "to": end},
                "operations": [
                    {"type": "note", "time": start, "pitch": 60, "duration": 0.5},
                    {"type": "note", "time": start + 24000, "pitch": 64, "duration": 0.5}
                ]
            }
        }

        generate_fixture(f"generate_plan_window{i}", request, response)

def generate_determinism_fixture():
    """Fixture 5: Determinism test"""
    request = {
        "op": "plan",
        "id": "req-determinism-001",
        "payload": {
            "sessionId": "session-test-001",
            "window": {"from": 0, "to": 48000},
            "seed": 42  # Fixed seed for determinism
        }
    }

    response = {
        "id": "req-determinism-001",
        "ok": True,
        "result": {
            "planHash": "deterministic-hash-42",  # Will always be the same for seed 42
            "irHash": "abc123def456",
            "generatedAt": 1234567890,
            "window": {"from": 0, "to": 48000},
            "operations": [
                {"type": "note", "time": 0, "pitch": 60, "duration": 1.0},
                {"type": "note", "time": 12000, "pitch": 64, "duration": 0.5}
            ]
        }
    }

    generate_fixture("determinism_test", request, response)

def generate_readme():
    """Generate README for fixtures"""
    readme = """# Golden Test Fixtures

This directory contains golden test fixtures for tvOS SDK integration testing.

## Fixture Structure

Each fixture directory contains:
- `request.json` - Request payload
- `response.json` - Expected response
- `metadata.json` - Hashes and timestamps

## Fixtures

### 1. init_sequence
Tests SDK initialization with basic configuration.

### 2. apply_ir_delta
Tests applying an IR delta to a session.

### 3. generate_plan_window1
Tests plan generation for time window 0-1 second.

### 4. generate_plan_window2
Tests plan generation for time window 1-2 seconds.

### 5. generate_plan_window3
Tests plan generation for time window 2-4 seconds.

### 6. determinism_test
Tests that the same seed produces the same output (determinism).

## Usage

These fixtures are used by `SchillingerGoldenFixtureTests.swift` to verify:
1. Request/response serialization works correctly
2. SDK produces consistent output
3. Determinism is enforced
4. Regression detection

## Regenerating Fixtures

To regenerate all fixtures:
```bash
cd /Users/bretbouchard/apps/schill/juce_backend
python3 scripts/generate_golden_fixtures.py
```

## Verification

Run golden fixture tests:
```bash
xcodebuild test -scheme SchillingerHost -destination 'platform=tvOS Simulator,name=Apple TV'
```
"""

    with open(FIXTURES_DIR / "README.md", "w") as f:
        f.write(readme)

    print("✅ Generated README.md")

def main():
    """Generate all fixtures"""
    print("Generating golden test fixtures...")
    print("=" * 60)

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    generate_init_fixture()
    generate_apply_ir_fixture()
    generate_plan_fixtures()
    generate_determinism_fixture()
    generate_readme()

    print("=" * 60)
    print(f"✅ All fixtures generated in: {FIXTURES_DIR}")
    print("\nGenerated fixtures:")
    print("  1. init_sequence/")
    print("  2. apply_ir_delta/")
    print("  3. generate_plan_window1/")
    print("  4. generate_plan_window2/")
    print("  5. generate_plan_window3/")
    print("  6. determinism_test/")
    print("  7. README.md")

if __name__ == "__main__":
    main()
