# Golden Test Fixtures

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
