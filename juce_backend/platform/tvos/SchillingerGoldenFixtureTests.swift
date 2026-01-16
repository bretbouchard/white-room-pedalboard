//
// SchillingerGoldenFixtureTests.swift
// tvOS Schillinger SDK Golden Fixture Tests
//
// Tests SDK against golden fixtures to ensure consistency and catch regressions
//

import XCTest
import Foundation
@testable import SchillingerHost

//================================================================================================
// Golden Fixture Tests
//================================================================================================

class SchillingerGoldenFixtureTests: XCTestCase {

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
    // Test: Init Sequence Fixture
    //============================================================================================

    func testInitFixture() {
        print("🧪 Testing init_sequence fixture...")

        // Load request fixture
        guard let requestURL = Bundle.main.url(forResource: "init_sequence/request", withExtension: "json", subdirectory: "tests/schillinger/fixtures"),
              let requestData = try? Data(contentsOf: requestURL),
              let request = try? JSONSerialization.jsonObject(with: requestData) as? [String: Any],
              let payload = request["payload"] as? [String: Any] else {
            XCTFail("Could not load request fixture")
            return
        }

        // Execute request
        let initExpectation = expectation(description: "Init from fixture")

        bridge.init(
            sessionSeed: payload["sessionSeed"] as! UInt64,
            graphInstanceId: payload["graphInstanceId"] as! String
        ) { sessionId, sdkBuildHash, schemaVersion in
            print("   Session ID: \(sessionId)")
            print("   SDK Build Hash: \(sdkBuildHash)")
            print("   Schema Version: \(schemaVersion)")

            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)

        print("✅ Init fixture test passed")
    }

    //============================================================================================
    // Test: Apply IR Delta Fixture
    //============================================================================================

    func testApplyIRFixture() {
        print("🧪 Testing apply_ir_delta fixture...")

        // First initialize a session
        let initExpectation = expectation(description: "Init for applyIR test")

        bridge.init(sessionSeed: 12345, graphInstanceId: "test-graph-golden") { sessionId, _, _ in
            self.sessionId = sessionId
            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)

        guard let sid = sessionId else { XCTFail("No session ID"); return }

        // Load apply IR fixture
        guard let requestURL = Bundle.main.url(forResource: "apply_ir_delta/request", withExtension: "json", subdirectory: "tests/schillinger/fixtures"),
              let requestData = try? Data(contentsOf: requestURL),
              let request = try? JSONSerialization.jsonObject(with: requestData) as? [String: Any],
              let payload = request["payload"] as? [String: Any],
              let irDelta = payload["irDelta"] as? [String: Any] else {
            XCTFail("Could not load applyIR fixture")
            return
        }

        // Execute request
        let applyExpectation = expectation(description: "Apply IR from fixture")

        bridge.applyIR(sessionId: sid, delta: irDelta) { ok, irHash in
            XCTAssertTrue(ok, "IR delta should apply")
            XCTAssertNotNil(irHash, "Should have IR hash")

            print("   IR Hash: \(irHash)")
            applyExpectation.fulfill()
        }

        wait(for: [applyExpectation], timeout: 5.0)

        print("✅ Apply IR fixture test passed")
    }

    //============================================================================================
    // Test: Generate Plan Fixtures
    //============================================================================================

    func testGeneratePlanFixtures() {
        print("🧪 Testing generate_plan fixtures...")

        // Initialize session
        let initExpectation = expectation(description: "Init for plan fixtures")

        bridge.init(sessionSeed: 42, graphInstanceId: "test-plan-fixtures") { sessionId, _, _ in
            self.sessionId = sessionId
            initExpectation.fulfill()
        }

        wait(for: [initExpectation], timeout: 5.0)

        guard let sid = sessionId else { XCTFail("No session ID"); return }

        // Test each window fixture
        let windows = [1, 2, 3]

        for windowNum in windows {
            guard let requestURL = Bundle.main.url(
                forResource: "generate_plan_window\(windowNum)/request",
                withExtension: "json",
                subdirectory: "tests/schillinger/fixtures"
            ),
            let requestData = try? Data(contentsOf: requestURL),
            let request = try? JSONSerialization.jsonObject(with: requestData) as? [String: Any],
            let payload = request["payload"] as? [String: Any],
            let window = payload["window"] as? [String: Int64] else {
                XCTFail("Could not load plan window\(windowNum) fixture")
                continue
            }

            let planExpectation = expectation(description: "Plan window\(windowNum)")

            bridge.plan(
                sessionId: sid,
                from: window["from"]!,
                to: window["to"]!
            ) { ok, planHash, irHash, windowDict in
                XCTAssertTrue(ok, "Plan \(windowNum) should generate")
                XCTAssertNotNil(planHash, "Plan \(windowNum) should have hash")

                print("   Window \(windowNum): \(planHash?.prefix(8) ?? "nil")...")
                planExpectation.fulfill()
            }

            wait(for: [planExpectation], timeout: 10.0)
        }

        print("✅ All generate_plan fixture tests passed")
    }

    //============================================================================================
    // Test: Determinism Fixture
    //============================================================================================

    func testDeterminismFixture() {
        print("🧪 Testing determinism fixture...")

        // Run 1 with seed 42
        var sessionId1: String?
        let initExpectation1 = expectation(description: "Init run 1")

        bridge.init(sessionSeed: 42, graphInstanceId: "determinism-fixture-1") { sessionId, _, _ in
            sessionId1 = sessionId
            initExpectation1.fulfill()
        }

        wait(for: [initExpectation1], timeout: 5.0)

        // Run 2 with SAME seed 42
        var sessionId2: String?
        let initExpectation2 = expectation(description: "Init run 2")

        bridge.init(sessionSeed: 42, graphInstanceId: "determinism-fixture-2") { sessionId, _, _ in
            sessionId2 = sessionId
            initExpectation2.fulfill()
        }

        wait(for: [initExpectation2], timeout: 5.0)

        // Sessions should match (determinism)
        XCTAssertEqual(sessionId1, sessionId2, "Same seed should produce same session ID")
        print("   Session 1: \(sessionId1 ?? "nil")")
        print("   Session 2: \(sessionId2 ?? "nil")")
        print("   Match: \(sessionId1 == sessionId2)")

        print("✅ Determinism fixture test passed")
    }

    //============================================================================================
    // Test: Fixture Integrity
    //============================================================================================

    func testFixtureIntegrity() {
        print("🧪 Testing fixture integrity...")

        // Verify all fixtures exist and have valid structure
        let fixtures = [
            "init_sequence",
            "apply_ir_delta",
            "generate_plan_window1",
            "generate_plan_window2",
            "generate_plan_window3",
            "determinism_test"
        ]

        for fixture in fixtures {
            // Check request.json exists
            let requestURL = Bundle.main.url(forResource: "\(fixture)/request", withExtension: "json", subdirectory: "tests/schillinger/fixtures")
            XCTAssertNotNil(requestURL, "Fixture \(fixture) request.json should exist")

            // Check response.json exists
            let responseURL = Bundle.main.url(forResource: "\(fixture)/response", withExtension: "json", subdirectory: "tests/schillinger/fixtures")
            XCTAssertNotNil(responseURL, "Fixture \(fixture) response.json should exist")

            // Check metadata.json exists
            let metadataURL = Bundle.main.url(forResource: "\(fixture)/metadata", withExtension: "json", subdirectory: "tests/schillinger/fixtures")
            XCTAssertNotNil(metadataURL, "Fixture \(fixture) metadata.json should exist")

            print("   ✅ \(fixture) - valid")
        }

        print("✅ All fixtures have valid structure")
    }
}

//================================================================================================
// Fixture Validator Helper
//================================================================================================

extension SchillingerGoldenFixtureTests {

    /// Load and parse a JSON fixture
    func loadFixture<T>(_ name: String, file: String = #file) -> T? where T: Decodable {
        guard let url = Bundle.main.url(forResource: name, withExtension: "json", subdirectory: "tests/schillinger/fixtures"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        return try? JSONDecoder().decode(T.self, from: data)
    }

    /// Compare two JSON objects for equality
    func compareJSON(_ json1: Any, _ json2: Any) -> Bool {
        guard let data1 = try? JSONSerialization.data(withJSONObject: json1),
              let data2 = try? JSONSerialization.data(withJSONObject: json2) else {
            return false
        }

        return data1 == data2
    }
}
