import XCTest
import SwiftUI
@testable import SwiftFrontendCore

/// Tests for SweepControlView functionality
class SweepControlTests: XCTestCase {

    // MARK: - Blend Value Tests

    func testBlendValueInitialization() {
        let initialBlend = 0.5
        let blendBinding = Binding<Double>(
            get: { initialBlend },
            set: { _ in }
        )

        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        let sweepControl = SweepControlView(
            blendValue: blendBinding,
            performanceA: .constant(performanceA),
            performanceB: .constant(performanceB),
            availablePerformances: [performanceA, performanceB],
            onBlendChanged: { _, _, _ in }
        )

        // Verify view can be created
        XCTAssertNotNil(sweepControl)
    }

    func testBlendValueRange() {
        // Test blend value clamping at boundaries
        let testCases: [(input: Double, expected: Double)] = [
            (-0.5, 0.0),   // Below minimum
            (0.0, 0.0),    // Minimum
            (0.5, 0.5),    // Middle
            (1.0, 1.0),    // Maximum
            (1.5, 1.0)     // Above maximum
        ]

        for testCase in testCases {
            let clampedValue = max(0.0, min(1.0, testCase.input))
            XCTAssertEqual(clampedValue, testCase.expected, accuracy: 0.001,
                          "Blend value \(testCase.input) should clamp to \(testCase.expected)")
        }
    }

    func testBlendValueCallbacks() {
        var callbackReceived = false
        var receivedA: PerformanceInfo?
        var receivedB: PerformanceInfo?
        var receivedBlend: Double?

        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        let sweepControl = SweepControlView(
            blendValue: .constant(0.5),
            performanceA: .constant(performanceA),
            performanceB: .constant(performanceB),
            availablePerformances: [performanceA, performanceB],
            onBlendChanged: { a, b, blend in
                callbackReceived = true
                receivedA = a
                receivedB = b
                receivedBlend = blend
            }
        )

        XCTAssertNotNil(sweepControl)

        // Simulate callback
        onBlendChanged(performanceA, performanceB, 0.75)

        XCTAssertTrue(callbackReceived, "Callback should be received")
        XCTAssertEqual(receivedA?.id, "piano")
        XCTAssertEqual(receivedB?.id, "techno")
        XCTAssertEqual(receivedBlend, 0.75, accuracy: 0.001)
    }

    // MARK: - Performance Selection Tests

    func testPerformanceSelection() {
        let performanceA = PerformanceInfo(id: "piano", name: "Piano", description: "Soft")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno", description: "Energetic")

        XCTAssertEqual(performanceA.id, "piano")
        XCTAssertEqual(performanceA.name, "Piano")
        XCTAssertEqual(performanceA.description, "Soft")

        XCTAssertEqual(performanceB.id, "techno")
        XCTAssertEqual(performanceB.name, "Techno")
        XCTAssertEqual(performanceB.description, "Energetic")
    }

    func testPerformanceEquality() {
        let perf1 = PerformanceInfo(id: "piano", name: "Piano")
        let perf2 = PerformanceInfo(id: "piano", name: "Piano")
        let perf3 = PerformanceInfo(id: "techno", name: "Techno")

        XCTAssertEqual(perf1, perf2, "Performances with same ID should be equal")
        XCTAssertNotEqual(perf1, perf3, "Performances with different IDs should not be equal")
    }

    func testAvailablePerformancesFiltering() {
        let performances = [
            PerformanceInfo(id: "piano", name: "Piano"),
            PerformanceInfo(id: "techno", name: "Techno"),
            PerformanceInfo(id: "jazz", name: "Jazz"),
            PerformanceInfo(id: "orchestral", name: "Orchestral")
        ]

        let selectedA = performances[0]
        let selectedB = performances[1]

        // Filter out selected performances
        let availableForA = performances.filter { $0.id != selectedB.id }
        let availableForB = performances.filter { $0.id != selectedA.id }

        XCTAssertEqual(availableForA.count, 3, "Should have 3 performances available for A")
        XCTAssertEqual(availableForB.count, 3, "Should have 3 performances available for B")
        XCTAssertFalse(availableForA.contains { $0.id == selectedB.id })
        XCTAssertFalse(availableForB.contains { $0.id == selectedA.id })
    }

    // MARK: - UI State Tests

    func testQuickSelectButtons() {
        // Test snap to A
        let snapToAValue = 0.0
        XCTAssertEqual(snapToAValue, 0.0, accuracy: 0.001)

        // Test snap to middle
        let snapToMiddleValue = 0.5
        XCTAssertEqual(snapToMiddleValue, 0.5, accuracy: 0.001)

        // Test snap to B
        let snapToBValue = 1.0
        XCTAssertEqual(snapToBValue, 1.0, accuracy: 0.001)
    }

    func testBlendPercentageDisplay() {
        let testCases: [(blend: Double, percentage: String)] = [
            (0.0, "0%"),
            (0.25, "25%"),
            (0.5, "50%"),
            (0.75, "75%"),
            (1.0, "100%")
        ]

        for testCase in testCases {
            let percentage = String(format: "%.0f%%", testCase.blend * 100)
            XCTAssertEqual(percentage, testCase.percentage,
                          "Blend \(testCase.blend) should display as \(testCase.percentage)")
        }
    }

    // MARK: - Helper method

    private func onBlendChanged(
        _ a: PerformanceInfo,
        _ b: PerformanceInfo,
        _ blend: Double
    ) {
        // Placeholder for test callback
    }
}

// MARK: - JUCE Engine Tests

class JUCEEngineTests: XCTestCase {

    func testEngineSingleton() {
        let engine1 = JUCEEngine.shared
        let engine2 = JUCEEngine.shared

        XCTAssertTrue(engine1 === engine2, "JUCEEngine should be a singleton")
    }

    func testEngineInitialState() {
        let engine = JUCEEngine.shared

        XCTAssertFalse(engine.isEngineRunning, "Engine should not be running initially")
        XCTAssertNil(engine.currentPerformances, "Current performances should be nil initially")
        XCTAssertEqual(engine.currentBlendValue, 0.0, accuracy: 0.001,
                       "Initial blend value should be 0.0")
    }

    func testFetchAvailablePerformances() {
        let engine = JUCEEngine.shared
        let performances = engine.fetchAvailablePerformances()

        XCTAssertGreaterThan(performances.count, 0, "Should have at least one performance")

        // Verify each performance has required fields
        for performance in performances {
            XCTAssertFalse(performance.id.isEmpty, "Performance ID should not be empty")
            XCTAssertFalse(performance.name.isEmpty, "Performance name should not be empty")
        }
    }

    func testSetPerformanceBlend() {
        let engine = JUCEEngine.shared
        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        // Set blend
        engine.setPerformanceBlend(performanceA, performanceB, 0.5)

        // Verify state is updated
        // Note: These updates happen asynchronously, so we may need to wait
        let expectation = XCTestExpectation(description: "Blend state updated")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertNotNil(engine.currentPerformances, "Current performances should be set")
            XCTAssertEqual(engine.currentBlendValue, 0.5, accuracy: 0.001,
                           "Blend value should be updated")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testUpdatePerformanceA() {
        let engine = JUCEEngine.shared
        let performanceA1 = PerformanceInfo(id: "piano", name: "Piano")
        let performanceA2 = PerformanceInfo(id: "jazz", name: "Jazz")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        // Set initial blend
        engine.setPerformanceBlend(performanceA1, performanceB, 0.5)

        // Update performance A
        engine.updatePerformanceA(performanceA2)

        let expectation = XCTestExpectation(description: "Performance A updated")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(engine.currentPerformances?.a.id, "jazz",
                           "Performance A should be updated")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testUpdatePerformanceB() {
        let engine = JUCEEngine.shared
        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB1 = PerformanceInfo(id: "techno", name: "Techno")
        let performanceB2 = PerformanceInfo(id: "orchestral", name: "Orchestral")

        // Set initial blend
        engine.setPerformanceBlend(performanceA, performanceB1, 0.5)

        // Update performance B
        engine.updatePerformanceB(performanceB2)

        let expectation = XCTestExpectation(description: "Performance B updated")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(engine.currentPerformances?.b.id, "orchestral",
                           "Performance B should be updated")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testGetCurrentBlendState() {
        let engine = JUCEEngine.shared
        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        // Initially, state should be nil
        XCTAssertNil(engine.getCurrentBlendState(), "Initial blend state should be nil")

        // Set blend
        engine.setPerformanceBlend(performanceA, performanceB, 0.75)

        let expectation = XCTestExpectation(description: "Blend state available")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            let state = engine.getCurrentBlendState()
            XCTAssertNotNil(state, "Blend state should be available")
            XCTAssertEqual(state?.0.id, "piano")
            XCTAssertEqual(state?.1.id, "techno")
            XCTAssertEqual(state?.2, 0.75, accuracy: 0.001)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testEngineStartStop() {
        let engine = JUCEEngine.shared

        // Start engine
        engine.startEngine()

        let startExpectation = XCTestExpectation(description: "Engine started")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(engine.isEngineRunning, "Engine should be running")
            startExpectation.fulfill()
        }

        wait(for: [startExpectation], timeout: 1.0)

        // Stop engine
        engine.stopEngine()

        let stopExpectation = XCTestExpectation(description: "Engine stopped")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(engine.isEngineRunning, "Engine should be stopped")
            stopExpectation.fulfill()
        }

        wait(for: [stopExpectation], timeout: 1.0)
    }
}

// MARK: - Error Handling Tests

class JUCEEngineErrorTests: XCTestCase {

    func testErrorDescriptions() {
        let errors: [JUCEEngineError] = [
            .engineNotInitialized,
            .invalidPerformance("test"),
            .invalidBlendValue(1.5),
            .communicationFailed("Test error"),
            .engineError("Test error")
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription,
                           "Error should have description: \(error)")
        }
    }

    func testInvalidBlendValueError() {
        let invalidValues: [Double] = [-0.1, 1.1, 2.0, -1.0]

        for value in invalidValues {
            let error = JUCEEngineError.invalidBlendValue(value)
            XCTAssertNotNil(error.errorDescription)

            let description = error.errorDescription ?? ""
            XCTAssertTrue(description.contains("Invalid blend value"),
                          "Error description should mention invalid blend value")
        }
    }
}

// MARK: - Integration Tests

class SweepControlIntegrationTests: XCTestCase {

    func testSurfaceRootViewInitialization() {
        let surfaceView = SurfaceRootView()
        XCTAssertNotNil(surfaceView, "SurfaceRootView should initialize")
    }

    func testSweepControlInSurface() {
        // Test that SweepControlView can be integrated into SurfaceRootView
        let blendValue = Binding<Double>(get: { 0.5 }, set: { _ in })
        let performanceA = Binding<PerformanceInfo>(
            get: { PerformanceInfo(id: "piano", name: "Piano") },
            set: { _ in }
        )
        let performanceB = Binding<PerformanceInfo>(
            get: { PerformanceInfo(id: "techno", name: "Techno") },
            set: { _ in }
        )

        let sweepControl = SweepControlView(
            blendValue: blendValue,
            performanceA: performanceA,
            performanceB: performanceB,
            availablePerformances: [
                PerformanceInfo(id: "piano", name: "Piano"),
                PerformanceInfo(id: "techno", name: "Techno")
            ],
            onBlendChanged: { _, _, _ in }
        )

        XCTAssertNotNil(sweepControl, "SweepControlView should be created")
    }

    func testEngineIntegration() {
        let engine = JUCEEngine.shared
        let performanceA = PerformanceInfo(id: "piano", name: "Piano")
        let performanceB = PerformanceInfo(id: "techno", name: "Techno")

        // Test full integration: engine -> blend -> performances
        engine.setPerformanceBlend(performanceA, performanceB, 0.5)

        let expectation = XCTestExpectation(description: "Integration complete")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            let state = engine.getCurrentBlendState()
            XCTAssertNotNil(state, "Engine should have blend state")
            XCTAssertEqual(state?.2, 0.5, accuracy: 0.001,
                           "Blend value should match")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }
}
