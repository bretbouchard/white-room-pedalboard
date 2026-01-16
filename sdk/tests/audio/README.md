# Audio Tests

Real-time audio validation for performance switching in White Room.

## Test Files

- **`audio-test-harness.ts`** - Core audio testing utilities
  - Audio capture and signal generation
  - Glitch detection (clicks, pops, dropouts)
  - Spectral analysis and instrumentation validation
  - Timing accuracy measurement
  - Performance monitoring

- **`performance-switching-audio.test.ts`** - Audio quality tests
  - Click/pop detection
  - Spectral analysis
  - Timing accuracy
  - Rapid switching
  - System performance

- **`e2e-performance-switching.test.ts`** - End-to-end scenarios
  - Piano → Techno switch
  - Loop boundary switch
  - Rapid successive switches
  - Real-world user workflows
  - Stress testing

## Running Tests

```bash
# Run all audio tests
npm test -- audio

# Run specific test suite
npm test -- audio -- --grep="Audio Quality"
npm test -- audio -- --grep="Timing Accuracy"
npm test -- audio -- --grep="E2E"

# Run with coverage
npm test -- audio -- --coverage

# Generate report
npm test -- audio -- --reporter=json --outputFile=test-results/audio-results.json
```

## Test Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Audio Test Harness                  │
│  (capture, generation, detection, analysis, monitoring) │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Mock Audio Engine                    │
│              (simulates JUCE backend)                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Test Suites                        │
│  • Audio Quality  • Timing  • State  • Performance  • E2E │
└─────────────────────────────────────────────────────────┘
```

## Success Criteria

- ✅ Zero clicks/pops in 100+ test scenarios
- ✅ Switch timing within ±10ms of bar boundary
- ✅ No dropouts during rapid switching
- ✅ CPU usage <70% max
- ✅ No memory leaks
- ✅ All instrumentation changes validated

## Coverage

- **Audio Quality**: 95%+ coverage
- **Timing Accuracy**: 90%+ coverage
- **State Transitions**: 95%+ coverage
- **System Performance**: 90%+ coverage
- **E2E Scenarios**: 85%+ coverage

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

See `.github/workflows/audio-tests.yml` for configuration.

## Documentation

See [Audio Testing Guide](../../../docs/audio-testing-guide.md) for comprehensive documentation.
