//
// SchillingerWorkflowTests.swift
// tvOS Schillinger SDK Workflow Tests
//
// End-to-end workflow tests for plan generation
//

import XCTest
import Foundation
@testable import SchillingerHost

//================================================================================================
// Complete Workflow Tests
//================================================================================================

class SchillingerWorkflowTests: XCTestCase {

    var bridge: SchillingerBridge!
    var sessionId: String?

    override func setUp() {
        super.setUp()

        // Get bundle path from main app bundle
        guard let bundleURL = Bundle.main.url(forResource: "SchillingerSDK", withExtension: "bundle.js"),
              let bundlePath = bundleURL.path else {
            XCTFail("Could not find SchillingerSDK.bundle.js in main bundle")
            return
        }

        // Read actual SHA-256 hash
        guard let hashURL = Bundle.main.url(forResource: "SchillingerSDK.bundle", withExtension: "js.sha256"),
              let hashContent = try? String(contentsOf: hashURL, encoding: .utf8),
              let bundleHash = hashContent.components(separatedBy: " ").first else {
            XCTFail("Could not read bundle hash file")
            return
        }

        // Initialize bridge with test configuration
        let config = SchillingerConfig(
            bundlePath: bundlePath,
            bundleHash: bundleHash,
            schemaVersion: "2.0.0"
        )

        bridge = SchillingerBridge(config: config)
    }

    override func tearDown() {
        bridge = nil
        sessionId = nil
        super.tearDown()
    }

    //============================================================================================
    // Test: Complete Plan Generation Workflow
    //============================================================================================

    func testCompletePlanGenerationWorkflow() {
        print("🧪 Starting complete plan generation workflow test...")

        // Step 1: Initialize SDK
        let initExpectation = expectation(description: "SDK initialization")

        bridge.init(sessionSeed: 42, graphInstanceId: "workflow-test-001") { sessionId, sdkBuildHash, schemaVersion in
            print("✅ Step 1: SDK initialized")
            print("   Session ID: \(sessionId)")
            print("   SDK Build Hash: \(sdkBuildHash)")
            print("   Schema Version: \(schemaVersion)")

            self.sessionId = sessionId
            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)
        XCTAssertNotNil(sessionId, "Session ID should be created")

        guard let sid = sessionId else { return }

        // Step 2: Apply IR deltas to build a song
        let applyExpectation = expectation(description: "Apply IR delta")

        let irDeltas: [[String: Any]] = [
            [
                "type": "add",
                "path": "songGraph.id",
                "value": "test-song-001"
            ],
            [
                "type": "add",
                "path": "songGraph.tempo",
                "value": 120
            ],
            [
                "type": "add",
                "path": "songGraph.timeSignature",
                "value": ["numerator": 4, "denominator": 4]
            ]
        ]

        // Apply first delta
        bridge.applyIR(sessionId: sid, delta: irDeltas[0]) { ok, irHash in
            XCTAssertTrue(ok, "IR delta should apply successfully")
            print("✅ Step 2a: IR delta applied, hash: \(irHash)")
            applyExpectation.fulfill()
        }

        wait(for: [applyExpectation], timeout: 5.0)

        // Step 3: Generate plan for time window
        let planExpectation = expectation(description: "Generate plan")

        bridge.plan(sessionId: sid, from: 0, to: 48000) { ok, planHash, irHash, window in
            XCTAssertTrue(ok, "Plan should generate successfully")
            XCTAssertNotNil(planHash, "Plan should have hash")

            print("✅ Step 3: Plan generated successfully")
            print("   Plan Hash: \(planHash ?? "nil")")
            print("   IR Hash: \(irHash ?? "nil")")
            print("   Window: \(window.from) - \(window.to)")

            planExpectation.fulfill()
        }

        wait(for: [planExpectation], timeout: 10.0)

        print("✅ Complete workflow test passed!")
    }

    //============================================================================================
    // Test: Determinism (Same Seed = Same Output)
    //============================================================================================

    func testDeterminism() {
        print("🧪 Testing determinism (same seed = same output)...")

        var sessionId1: String?
        var sessionId2: String?

        // Initialize with seed 42 - Run 1
        let initExpectation1 = expectation(description: "SDK init 1")

        bridge.init(sessionSeed: 42, graphInstanceId: "determinism-test-1") { sessionId, _, _ in
            sessionId1 = sessionId
            initExpectation1.fulfill()
        }

        wait(for: [initExpectation1], timeout: 5.0)

        // Initialize with seed 42 - Run 2 (same seed!)
        let initExpectation2 = expectation(description: "SDK init 2")

        bridge.init(sessionSeed: 42, graphInstanceId: "determinism-test-2") { sessionId, _, _ in
            sessionId2 = sessionId
            initExpectation2.fulfill()
        }

        wait(for: [initExpectation2], timeout: 5.0)

        // Session IDs should be deterministic
        XCTAssertEqual(sessionId1, sessionId2, "Same seed should produce same session ID")
        print("✅ Determinism verified: session IDs match")
    }

    //============================================================================================
    // Test: Different Seeds Produce Different Results
    //============================================================================================

    func testDifferentSeeds() {
        print("🧪 Testing seed independence...")

        var sessionId1: String?
        var sessionId2: String?

        // Seed 1
        let initExpectation1 = expectation(description: "SDK init seed 1")

        bridge.init(sessionSeed: 1, graphInstanceId: "seed-test-1") { sessionId, _, _ in
            sessionId1 = sessionId
            initExpectation1.fulfill()
        }

        wait(for: [initExpectation1], timeout: 5.0)

        // Seed 2
        let initExpectation2 = expectation(description: "SDK init seed 2")

        bridge.init(sessionSeed: 2, graphInstanceId: "seed-test-2") { sessionId, _, _ in
            sessionId2 = sessionId
            initExpectation2.fulfill()
        }

        wait(for: [initExpectation2], timeout: 5.0)

        // Session IDs should be different
        XCTAssertNotEqual(sessionId1, sessionId2, "Different seeds should produce different session IDs")
        print("✅ Seed independence verified: session IDs differ")
    }

    //============================================================================================
    // Test: Error Handling
    //============================================================================================

    func testErrorHandling() {
        print("🧪 Testing error handling...")

        // Try to generate plan for non-existent session
        let planExpectation = expectation(description: "Generate plan for invalid session")

        bridge.plan(sessionId: "non-existent-session", from: 0, to: 48000) { ok, planHash, _, _ in
            XCTAssertFalse(ok, "Should return error for non-existent session")
            XCTAssertNil(planHash, "Plan hash should be nil on error")
            print("✅ Error handling works correctly")
            planExpectation.fulfill()
        }

        wait(for: [planExpectation], timeout: 5.0)
    }

    //============================================================================================
    // Test: Multiple Time Windows
    //============================================================================================

    func testMultipleTimeWindows() {
        print("���� Testing multiple time windows...")

        // Initialize
        let initExpectation = expectation(description: "SDK init for multi-window")

        bridge.init(sessionSeed: 100, graphInstanceId: "multi-window-test") { sessionId, _, _ in
            self.sessionId = sessionId
            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)

        guard let sid = sessionId else { XCTFail("No session ID"); return }

        // Generate plans for multiple windows
        let windows: [(from: Int64, to: Int64)] = [
            (0, 48000),       // 0-1 second
            (48000, 96000),   // 1-2 seconds
            (96000, 192000)   // 2-4 seconds
        ]

        var planHashes: [String] = []

        for (index, window) in windows.enumerated() {
            let planExpectation = expectation(description: "Plan for window \(index)")

            bridge.plan(sessionId: sid, from: window.from, to: window.to) { ok, planHash, _, _ in
                XCTAssertTrue(ok, "Plan \(index) should generate")
                XCTAssertNotNil(planHash, "Plan \(index) should have hash")

                if let hash = planHash {
                    planHashes.append(hash)
                    print("   ✅ Plan \(index): \(hash.prefix(8))...")
                }

                planExpectation.fulfill()
            }

            wait(for: [planExpectation], timeout: 10.0)
        }

        // Verify all plans were generated
        XCTAssertEqual(planHashes.count, 3, "Should generate 3 plans")
        print("✅ All \(planHashes.count) plans generated successfully")
    }
}

//================================================================================================
// Performance Tests
//================================================================================================

class SchillingerPerformanceTests: XCTestCase {

    var bridge: SchillingerBridge!

    override func setUp() {
        super.setUp()

        let config = SchillingerConfig(
            bundlePath: "/path/to/SchillingerSDK.bundle.js",
            bundleHash: "test-hash",
            schemaVersion: "2.0.0"
        )

        bridge = SchillingerBridge(config: config)
    }

    func testPlanGenerationPerformance() {
        print("🧪 Testing plan generation performance...")

        let initExpectation = expectation(description: "SDK init for performance test")

        bridge.init(sessionSeed: 999, graphInstanceId: "perf-test") { sessionId, _, _ in
            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)

        // Measure plan generation time
        measure {
            let planExpectation = self.expectation(description: "Plan generation")

            bridge.plan(sessionId: "perf-session", from: 0, to: 48000) { ok, _, _, _ in
                XCTAssertTrue(ok)
                planExpectation.fulfill()
            }

            self.wait(for: [planExpectation], timeout: 10.0)
        }
    }
}
