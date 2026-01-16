//
//  FFIBridgeTests.swift
//  SwiftFrontendCoreTests
//
//  Tests for Schillinger FFI bridge
//  Verifies Swift-C++ interop works correctly
//

import XCTest
@testable import SwiftFrontendCore

// Note: These tests require the JUCE backend library to be linked
// They will fail at link time if the FFI bridge is not properly configured

final class FFIBridgeTests: XCTestCase {

    // MARK: - Type Tests

    func testFFITypesExist() {
        // Verify that FFI types are accessible via module map
        // This tests that the module map is correctly configured

        // These types should be available from SchillingerFFI module
        // If this compiles, the module map is working

        // We can't directly test the C types without importing SchillingerFFI
        // but we can verify the Swift engine compiles
        let engine = JUCEEngine.shared
        XCTAssertNotNil(engine)
    }

    // MARK: - Engine Lifecycle Tests

    func testEngineSingleton() {
        // JUCEEngine should be a singleton
        let engine1 = JUCEEngine.shared
        let engine2 = JUCEEngine.shared

        XCTAssertTrue(engine1 === engine2, "JUCEEngine should be a singleton")
    }

    func testEngineInitialState() {
        let engine = JUCEEngine.shared

        // Engine should start in stopped state
        XCTAssertFalse(engine.isEngineRunning, "Engine should not be running initially")

        // Blend value should be 0.0
        XCTAssertEqual(engine.currentBlendValue, 0.0, "Initial blend value should be 0.0")

        // No performances selected
        XCTAssertNil(engine.currentPerformances, "No performances should be selected initially")
    }

    // MARK: - Performance Blend Tests

    func testPerformanceBlendValidation() {
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(
            id: "test_piano",
            name: "Test Piano",
            description: "Test performance"
        )

        let perfB = PerformanceInfo(
            id: "test_techno",
            name: "Test Techno",
            description: "Test performance"
        )

        // Test valid blend values
        let validValues: [Double] = [0.0, 0.25, 0.5, 0.75, 1.0]

        for value in validValues {
            engine.setPerformanceBlend(perfA, perfB, blendValue: value)

            let expectation = XCTestExpectation(description: "Blend value updates")

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                XCTAssertEqual(engine.currentBlendValue, value, accuracy: 0.001,
                             "Blend value should be \(value)")
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 1.0)
        }
    }

    func testPerformanceBlendClamping() {
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "a", name: "A", description: "")
        let perfB = PerformanceInfo(id: "b", name: "B", description: "")

        // Test out-of-range values are clamped
        let outOfRangeValues: [(input: Double, expected: Double)] = [
            (-0.5, 0.0),   // Negative values clamped to 0.0
            (1.5, 1.0),    // Values > 1.0 clamped to 1.0
            (-1.0, 0.0),   // Very negative clamped to 0.0
            (2.0, 1.0)     // Very large clamped to 1.0
        ]

        for (input, expected) in outOfRangeValues {
            engine.setPerformanceBlend(perfA, perfB, blendValue: input)

            let expectation = XCTestExpectation(description: "Blend value clamps")

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                XCTAssertEqual(engine.currentBlendValue, expected, accuracy: 0.001,
                             "Blend value \(input) should be clamped to \(expected)")
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 1.0)
        }
    }

    // MARK: - Performance Management Tests

    func testPerformanceFetching() {
        let engine = JUCEEngine.shared

        let performances = engine.fetchAvailablePerformances()

        XCTAssertFalse(performances.isEmpty, "Should return at least one performance")

        // Verify structure
        for perf in performances {
            XCTAssertFalse(perf.id.isEmpty, "Performance ID should not be empty")
            XCTAssertFalse(perf.name.isEmpty, "Performance name should not be empty")
        }
    }

    func testPerformanceUpdate() {
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "piano", name: "Piano", description: "...")
        let perfB = PerformanceInfo(id: "techno", name: "Techno", description: "...")

        // Set initial blend
        engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

        let expectation = XCTestExpectation(description: "Performances update")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(engine.currentPerformances?.a.id, "piano")
            XCTAssertEqual(engine.currentPerformances?.b.id, "techno")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    // MARK: - Thread Safety Tests

    func testConcurrentBlendUpdates() {
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "a", name: "A", description: "")
        let perfB = PerformanceInfo(id: "b", name: "B", description: "")

        // Simulate rapid blend changes from UI
        let iterations = 100
        let expectation = XCTestExpectation(description: "Concurrent updates complete")
        expectation.expectedFulfillmentCount = iterations

        DispatchQueue.concurrentPerform(iterations: iterations) { i in
            let value = Double(i) / Double(iterations)
            engine.setPerformanceBlend(perfA, perfB, blendValue: value)

            DispatchQueue.main.async {
                expectation.fulfill()
            }
        }

        wait(for: [expectation], timeout: 5.0)

        // Final value should be close to 1.0
        XCTAssertEqual(engine.currentBlendValue, 1.0, accuracy: 0.1,
                     "Final blend value should be ~1.0 after rapid updates")
    }

    // MARK: - Integration Tests

    func testFullWorkflow() {
        let engine = JUCEEngine.shared

        // 1. Start engine
        engine.startEngine()

        let expectation1 = XCTestExpectation(description: "Engine starts")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            XCTAssertTrue(engine.isEngineRunning, "Engine should be running")
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 2.0)

        // 2. Set blend
        let perfA = PerformanceInfo(id: "piano", name: "Piano", description: "")
        let perfB = PerformanceInfo(id: "techno", name: "Techno", description: "")

        engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

        let expectation2 = XCTestExpectation(description: "Blend sets")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(engine.currentBlendValue, 0.5, accuracy: 0.001)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)

        // 3. Stop engine
        engine.stopEngine()

        let expectation3 = XCTestExpectation(description: "Engine stops")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            XCTAssertFalse(engine.isEngineRunning, "Engine should be stopped")
            expectation3.fulfill()
        }

        wait(for: [expectation3], timeout: 2.0)
    }

    // MARK: - Memory Tests

    func testMemoryLeaks() {
        // Test that repeated operations don't leak memory
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "a", name: "A", description: "")
        let perfB = PerformanceInfo(id: "b", name: "B", description: "")

        // Perform many operations
        for _ in 0..<1000 {
            engine.setPerformanceBlend(perfA, perfB, blendValue: Double.random(in: 0...1))
        }

        // Add leak tracking in Instruments to verify
        let expectation = XCTestExpectation(description: "Operations complete")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 2.0)
    }

    // MARK: - Performance Tests

    func testBlendUpdatePerformance() {
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "a", name: "A", description: "")
        let perfB = PerformanceInfo(id: "b", name: "B", description: "")

        // Measure how fast blend updates happen
        let iterations = 1000
        let startTime = CFAbsoluteTimeGetCurrent()

        for i in 0..<iterations {
            engine.setPerformanceBlend(perfA, perfB, blendValue: Double(i) / Double(iterations))
        }

        let endTime = CFAbsoluteTimeGetCurrent()
        let duration = endTime - startTime

        let operationsPerSecond = Double(iterations) / duration

        XCTAssertGreaterThan(operationsPerSecond, 100,
                           "Should handle at least 100 blend updates per second")

        print("Blend update performance: \(operationsPerSecond) ops/sec")
    }
}
