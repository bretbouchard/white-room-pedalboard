# Test Coverage Enhancement Plan
**Project**: White Room Audio Plugin Development Environment
**Target**: >85% overall test coverage
**Current Baseline**: ~45% overall
**Timeline**: 2-3 weeks

## Executive Summary

This plan outlines a systematic approach to increase test coverage from ~45% to >85% across all components of the White Room project. The strategy prioritizes critical paths, uses property-based testing for edge cases, and implements performance regression detection.

## Current Coverage Analysis

### By Component

| Component | Current | Target | Gap | Priority |
|-----------|---------|--------|-----|----------|
| **SDK (TypeScript)** | 75% | 90% | +15% | HIGH |
| **JUCE Backend (C++)** | 0% | 80% | +80% | CRITICAL |
| **Swift Frontend** | 0% | 85% | +85% | HIGH |
| **Integration Tests** | 60% | 85% | +25% | HIGH |
| **Property-Based Tests** | 5% | 70% | +65% | MEDIUM |

### Critical Path Coverage

**High Priority (Production Blocking):**
- ProjectionEngine (C++) - 0% → 85%
- Audio Layer (Scheduler, VoiceManager, Console) - 0% → 80%
- FFI Bridge (Swift ↔ C++) - 0% → 85%
- Schema Validation (TypeScript) - 70% → 90%

**Medium Priority (Quality Assurance):**
- DSP Instruments (NexSynth, SamSampler, KaneMarco) - 40% → 75%
- UI Components (Swift) - 0% → 80%
- State Management (Swift) - 0% → 85%

**Lower Priority (Enhancement):**
- Plugin Hosting - 20% → 70%
- Analysis Pipeline - 50% → 80%
- Performance Profiling - 30% → 75%

## Implementation Strategy

### Phase 1: Enable Existing Tests (Week 1, Days 1-2)

**Objective**: Fix build configurations and measure true baseline

**Tasks**:
1. **C++ Test Build Configuration**
   - Fix JUCE module linking in tests/CMakeLists.txt
   - Enable GTest integration
   - Fix compilation errors in existing test files
   - Verify all test executables build successfully

2. **Swift Package Test Configuration**
   - Fix Package.swift test dependencies
   - Resolve XCTest configuration issues
   - Enable test discovery for Swift packages
   - Verify Swift tests run successfully

3. **Baseline Measurement**
   - Run all test suites
   - Generate coverage reports (C++: gcov/lcov, Swift: llvm-cov, TS: vitest)
   - Document actual baseline coverage
   - Identify low-hanging fruit (quick wins)

**Expected Outcome**: Baseline coverage increases to ~55-60% simply by enabling existing tests

**Success Criteria**:
- [ ] All test executables build without errors
- [ ] All test suites run successfully
- [ ] Coverage reports generated for all components
- [ ] Baseline documented

---

### Phase 2: Cover Critical Paths (Week 1, Days 3-7)

**Objective**: Achieve 70-75% coverage by testing critical business logic

#### 2.1 SDK Edge Case Tests (TypeScript)

**Target**: 75% → 90% (+15%)

**Files to Test**:
- `packages/sdk/src/schillinger/` - Schillinger system edge cases
- `packages/sdk/src/validation/` - Schema validation boundary conditions
- `packages/sdk/src/undo/` - Undo stack edge cases
- `packages/sdk/src/projection/` - Projection calculation errors

**Test Strategy**:
```typescript
// Example: Edge case testing for Schillinger system
describe('SchillingerSystem Edge Cases', () => {
  describe('Boundary Conditions', () => {
    it('handles zero density correctly', () => {
      const result = system.calculateDensity(0, 1);
      expect(result).toBe(0);
    });

    it('handles maximum density without overflow', () => {
      const result = system.calculateDensity(Number.MAX_SAFE_INTEGER, 1);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('handles negative inputs gracefully', () => {
      expect(() => system.calculateDensity(-1, 1)).toThrow();
    });
  });

  describe('Error Paths', () => {
    it('throws on invalid rhythm pattern', () => {
      expect(() => system.validateRhythm([])).toThrow();
    });

    it('recovers from calculation errors', () => {
      const invalidInput = { pattern: 'invalid' };
      expect(() => system.calculate(invalidInput)).toThrow();
      expect(() => system.calculate({ pattern: [1, 2, 3] })).not.toThrow();
    });
  });
});
```

**Estimated Effort**: 2 days

---

#### 2.2 JUCE Backend Tests (C++)

**Target**: 0% → 80% (+80%)

**Priority Order**:

1. **ProjectionEngine** (CRITICAL - 2 days)
   ```cpp
   // tests/audio/ProjectionEngineEdgeCasesTest.cpp
   TEST(ProjectionEngineEdgeCases, HandlesNullInput) {
       ProjectionEngine engine;
       EXPECT_THROW(engine.project(nullptr), std::invalid_argument);
   }

   TEST(ProjectionEngineEdgeCases, HandlesEmptyPattern) {
       ProjectionEngine engine;
       Pattern pattern = {};
       auto result = engine.project(pattern);
       EXPECT_EQ(result.voiceCount, 0);
   }

   TEST(ProjectionEngineEdgeCases, HandlesLargePolyphony) {
       ProjectionEngine engine;
       Pattern pattern = generatePattern(1000); // 1000 notes
       auto result = engine.project(pattern);
       EXPECT_LE(result.cpuUsage, 100.0);
   }
   ```

2. **Audio Layer** (HIGH - 2 days)
   - Scheduler: Edge cases (zero tempo, maximum tempo)
   - VoiceManager: Voice stealing, overflow, underflow
   - ConsoleSystem: Bus routing, signal flow validation

3. **FFI Bridge** (CRITICAL - 1 day)
   - Memory management (leaks, double-free)
   - Error translation (C++ → Swift)
   - Type safety across boundary

**Estimated Effort**: 5 days

---

#### 2.3 Swift Frontend Tests (Swift)

**Target**: 0% → 85% (+85%)

**Files to Test**:
- `SwiftFrontendShared/` - State management, error handling
- `WhiteRoomiOS/Audio/` - Projection integration, audio graph
- `WhiteRoomiOS/Surface/` - UI components, user interaction

**Test Strategy**:
```swift
// Example: Swift UI component edge case testing
class ProjectionEngineViewModelTests: XCTestCase {
    func testProjectionEngineInitialization() {
        let viewModel = ProjectionEngineViewModel()
        XCTAssertNotNil(viewModel.engine)
        XCTAssertEqual(viewModel.state, .idle)
    }

    func testProjectionEngineErrorHandling() {
        let viewModel = ProjectionEngineViewModel()
        let invalidPattern = Pattern(notes: [])

        XCTAssertThrowsError(
            try viewModel.project(invalidPattern)
        ) { error in
            XCTAssertTrue(error is ProjectionError)
        }
    }

    func testProjectionEngineStateTransitions() {
        let viewModel = ProjectionEngineViewModel()
        let pattern = generateTestPattern()

        XCTAssertEqual(viewModel.state, .idle)

        viewModel.project(pattern) { result in
            XCTAssertEqual(viewModel.state, .projecting)
        }

        wait(for: [expectation(description: "projection completes")], timeout: 1.0)
        XCTAssertEqual(viewModel.state, .completed)
    }
}
```

**Estimated Effort**: 3 days

---

#### 2.4 Integration Test Enhancement

**Target**: 60% → 85% (+25%)

**Scenarios to Add**:
1. **Cross-Language Data Flow** (TS → C++ → Swift)
2. **Error Propagation Across Boundaries**
3. **Memory Management (No Leaks)**
4. **Performance Under Load**
5. **Concurrent Access (Thread Safety)**

**Example**:
```typescript
// tests/integration/cross-language-data-flow.test.ts
describe('Cross-Language Data Flow', () => {
  it('correctly projects pattern from TypeScript through C++ to Swift', async () => {
    // TypeScript input
    const pattern = generateTestPattern();

    // Project through C++ backend
    const cppResult = await projectionEngine.project(pattern);
    expect(cppResult.success).toBe(true);

    // Verify Swift integration
    const swiftResult = await swiftBridge.processProjection(cppResult);
    expect(swiftResult.voiceCount).toBe(pattern.notes.length);
  });

  it('propagates errors correctly across language boundaries', async () => {
    const invalidPattern = { notes: [] };

    await expectAsync(
      projectionEngine.project(invalidPattern)
    ).toBeRejected();

    // Verify error translation
    try {
      await swiftBridge.processProjection(invalidPattern);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('Invalid pattern');
    }
  });
});
```

**Estimated Effort**: 2 days

---

### Phase 3: Cover Edge Cases with Property-Based Testing (Week 2, Days 1-4)

**Objective**: Find hidden bugs through automated property-based testing

#### 3.1 TypeScript Property-Based Tests

**Tool**: FastCheck (already available)

**Properties to Test**:
```typescript
// tests/property-based/schillinger-properties.test.ts
import fc from 'fast-check';

describe('Schillinger System Properties', () => {
  it('should always produce valid density values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 16 })),
        fc.integer({ min: 1, max: 1000 }),
        (pattern, tempo) => {
          const result = schillinger.calculateDensity(pattern, tempo);
          return result >= 0 && result <= 1;
        }
      )
    );
  });

  it('should maintain associativity in rhythm calculations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 16 })),
        fc.array(fc.integer({ min: 1, max: 16 })),
        (pattern1, pattern2) => {
          const r1 = schillinger.combineRhythms(pattern1, pattern2);
          const r2 = schillinger.combineRhythms(pattern2, pattern1);
          return JSON.stringify(r1) === JSON.stringify(r2);
        }
      )
    );
  });
});
```

**Estimated Effort**: 1 day

---

#### 3.2 C++ Property-Based Tests

**Tool**: RapidCheck (need to integrate)

**Properties to Test**:
```cpp
// tests/property-based/ProjectionEngineProperties.cpp
#include <rapidcheck.h>

RC_GTEST_PROP(ProjectionEngineProperties,
              VoiceCountNeverExceedsMaximum,
              (const std::vector<Note>& pattern)) {
    ProjectionEngine engine;
    auto result = engine.project(pattern);

    RC_ASSERT(result.voiceCount <= engine.getMaxVoices());
}

RC_GTEST_PROP(ProjectionEngineProperties,
              CPUUsageIsMonotonicallyIncreasing,
              (const std::vector<Note>& pattern1,
               const std::vector<Note>& pattern2)) {
    ProjectionEngine engine;

    auto result1 = engine.project(pattern1);
    auto result2 = engine.project(pattern1 + pattern2);

    RC_ASSERT(result2.cpuUsage >= result1.cpuUsage);
}
```

**Estimated Effort**: 2 days (includes tool integration)

---

#### 3.3 Swift Property-Based Tests

**Tool**: SwiftCheck (need to integrate)

**Properties to Test**:
```swift
// tests/property-based/ProjectionEngineProperties.swift
import SwiftCheck
import XCTest

class ProjectionEnginePropertiesTests: XCTestCase {
    func testVoiceCountNeverExceedsMaximum() {
        property("Voice count never exceeds maximum") <- forAll {
            (pattern: [Note]) in
            let engine = ProjectionEngine()
            let result = engine.project(pattern)

            return result.voiceCount <= engine.maxVoices
        }
    }

    func testProjectionIsIdempotent() {
        property("Projection is idempotent") <- forAll {
            (pattern: [Note]) in
            let engine = ProjectionEngine()
            let result1 = engine.project(pattern)
            let result2 = engine.project(pattern)

            return result1.voiceCount == result2.voiceCount
        }
    }
}
```

**Estimated Effort**: 1 day

---

### Phase 4: Performance Regression Tests (Week 2, Day 5)

**Objective**: Ensure performance doesn't degrade

**Benchmarks to Add**:

1. **ProjectionEngine Performance**
   ```typescript
   // tests/performance/projection-engine.bench.ts
   import { benchmark } from 'vitest';

   benchmark('ProjectionEngine: simple pattern', () => {
     const pattern = generateTestPattern(10); // 10 notes
     projectionEngine.project(pattern);
   });

   benchmark('ProjectionEngine: complex pattern', () => {
     const pattern = generateTestPattern(1000); // 1000 notes
     projectionEngine.project(pattern);
   });
   ```

2. **Audio Layer Performance**
   ```cpp
   // tests/performance/AudioLayerBenchmark.cpp
   #include <benchmark/benchmark.h>

   static void BM_ScheduleVoices(benchmark::State& state) {
       Scheduler scheduler;
       Pattern pattern = generatePattern(state.range(0));

       for (auto _ : state) {
           scheduler.schedule(pattern);
       }
   }
   BENCHMARK(BM_ScheduleVoices)->Range(1, 1000);
   ```

3. **Swift UI Performance**
   ```swift
   // tests/performance/ProjectionEngineViewBenchmarks.swift
   import XCTest

   class ProjectionEngineViewBenchmarks: XCTestCase {
       func testProjectionViewRendering() {
           measure {
               let view = ProjectionEngineView()
               view.pattern = generateTestPattern(100)
               view.layoutIfNeeded()
           }
       }
   }
   ```

**Success Criteria**:
- [ ] All benchmarks execute successfully
- [ ] Baseline performance metrics recorded
- [ ] CI fails on performance regression >10%

**Estimated Effort**: 1 day

---

### Phase 5: Verify & Optimize (Week 3, Days 1-2)

**Objective**: Achieve >85% coverage and optimize test execution

**Tasks**:

1. **Coverage Analysis**
   ```bash
   # Generate comprehensive coverage report
   cd sdk && npm run test:coverage
   cd juce_backend && llvm-cov report --format=html
   cd swift_frontend && swift test --enable-code-coverage
   ```

2. **Identify Remaining Gaps**
   - Use coverage reports to find untested code
   - Prioritize gaps by risk and usage
   - Create targeted tests for remaining gaps

3. **Optimize Slow Tests**
   - Identify tests taking >1 second
   - Parallelize independent tests
   - Use test doubles for slow dependencies
   - Implement test caching

4. **Final Verification**
   ```bash
   # Run full test suite
   npm run test:all
   cmake --build build --target run_all_tests
   swift test --parallel

   # Verify coverage
   # (automated script to check >85% threshold)
   ./scripts/verify_coverage.sh
   ```

**Success Criteria**:
- [ ] Overall coverage >85%
- [ ] No component <80% coverage
- [ ] Test execution time <10 minutes
- [ ] All critical paths covered

**Estimated Effort**: 2 days

---

## Coverage Targets Summary

| Component | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Final Target |
|-----------|---------|---------|---------|---------|---------|--------------|
| SDK Core | 75% | 85% | 88% | 88% | 90% | **90%** |
| SDK Validation | 70% | 80% | 83% | 83% | 85% | **85%** |
| JUCE ProjectionEngine | 0% → 30% | 60% | 75% | 75% | 85% | **85%** |
| JUCE Audio Layer | 0% → 20% | 50% | 70% | 70% | 80% | **80%** |
| JUCE FFI Bridge | 0% → 25% | 60% | 75% | 75% | 85% | **85%** |
| Swift UI Components | 0% → 20% | 50% | 70% | 70% | 80% | **80%** |
| Swift State Management | 0% → 25% | 60% | 75% | 75% | 85% | **85%** |
| Integration Tests | 60% → 65% | 75% | 80% | 80% | 85% | **85%** |
| **Overall** | **55-60%** | **70-75%** | **78-82%** | **78-82%** | **>85%** | **>85%** |

---

## Testing Best Practices

### DO's ✅

1. **Test Critical Paths First**
   - Prioritize business logic over utilities
   - Test error paths thoroughly
   - Cover edge cases and boundary conditions

2. **Use Property-Based Testing**
   - Find hidden bugs through randomization
   - Test invariants and properties
   - Complement example-based tests

3. **Measure Coverage Continuously**
   - Generate reports on every test run
   - Track coverage trends over time
   - Set minimum coverage thresholds in CI

4. **Optimize Test Execution**
   - Parallelize independent tests
   - Use test doubles for slow dependencies
   - Implement test caching and fixtures

### DON'Ts ❌

1. **Don't Test Getters/Setters**
   - Low value, high maintenance
   - Focus on behavior, not implementation

2. **Don't Test Generated Code**
   - Auto-generated files don't need tests
   - Test the generator instead

3. **Don't Accept Slow Tests**
   - Optimize or mock slow dependencies
   - Target: <10 minutes for full suite

4. **Don't Ignore Coverage Gaps**
   - Every gap is potential bug territory
   - Document intentional exclusions

---

## Success Metrics

### Coverage Metrics
- **Overall Coverage**: >85%
- **Critical Path Coverage**: 100%
- **Error Path Coverage**: >90%
- **Component Minimum**: >80%

### Quality Metrics
- **Test Pass Rate**: 100%
- **Test Execution Time**: <10 minutes
- **Flaky Test Rate**: 0%
- **Performance Regression**: 0%

### Process Metrics
- **Tests Run per Commit**: 100%
- **Coverage Trend**: Increasing
- **Bug Escape Rate**: <5%
- **Mean Time to Detection**: <1 hour

---

## Risk Mitigation

### Risk 1: Test Maintenance Burden
**Mitigation**: Use property-based tests to reduce manual test case creation

### Risk 2: Slow Test Execution
**Mitigation**: Parallelize tests, use test doubles, implement caching

### Risk 3: Flaky Tests
**Mitigation**: Avoid time-based assertions, use deterministic randomness

### Risk 4: Coverage Without Quality
**Mitigation**: Focus on critical paths, use mutation testing to verify effectiveness

---

## Next Steps

1. **Immediate (Today)**
   - Fix C++ test build configuration
   - Fix Swift package test configuration
   - Run all test suites and measure baseline

2. **Week 1**
   - Complete Phase 1 (enable existing tests)
   - Complete Phase 2 (critical paths)

3. **Week 2**
   - Complete Phase 3 (property-based testing)
   - Complete Phase 4 (performance regression)

4. **Week 3**
   - Complete Phase 5 (verify & optimize)
   - Generate final coverage report
   - Document lessons learned

---

## Conclusion

This plan provides a structured approach to achieving >85% test coverage across the White Room project. By prioritizing critical paths, using property-based testing for edge cases, and implementing performance regression detection, we'll build a comprehensive test suite that ensures product quality while maintaining development velocity.

**Key Success Factors**:
- Disciplined focus on critical paths first
- Property-based testing to find hidden bugs
- Continuous coverage measurement
- Performance regression detection
- Test execution optimization

**Expected Outcome**:
- >85% overall coverage
- 100% critical path coverage
- <10 minute test execution time
- Zero performance regressions
- High confidence in releases

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Owner**: Test Results Analyzer Agent
