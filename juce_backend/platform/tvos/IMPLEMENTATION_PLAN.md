# tvOS SDK Integration - Implementation Plan

**Date:** December 31, 2025
**Status:** READY FOR IMPLEMENTATION
**Owner:** JUCE Backend + Platform Teams

---

## Overview

Complete the tvOS SDK integration by implementing EventEmitter shim, testing bundle loading, verifying API accessibility, testing plan generation, and creating golden test fixtures.

**Estimated Total Time:** 4-6 hours
**Priority:** HIGH (unblocks Apple TV integration)

---

## Step 1: Add EventEmitter Shim to Swift Bridge

**Estimated Time:** 5-10 minutes
**Complexity:** LOW
**File:** `platform/tvos/SchillingerBridge.swift`

### Implementation

```swift
//================================================================================================
// Node.js API Shims for tvOS JavaScriptCore
//================================================================================================

private func setupNodeJSShims() {
    // EventEmitter shim (most critical)
    let eventEmitterShim = """
    class EventEmitter {
        constructor() {
            this._events = {};
        }

        on(event, listener) {
            if (!this._events[event]) {
                this._events[event] = [];
            }
            this._events[event].push(listener);
            return this;
        }

        off(event, listener) {
            if (!this._events[event]) return this;
            if (!listener) {
                delete this._events[event];
            } else {
                this._events[event] = this._events[event].filter(l => l !== listener);
            }
            return this;
        }

        emit(event, ...args) {
            if (!this._events[event]) return false;
            this._events[event].forEach(listener => listener(...args));
            return true;
        }

        addListener(event, listener) { return this.on(event, listener); }
        removeListener(event, listener) { return this.off(event, listener); }

        once(event, listener) {
            const onceWrapper = (...args) => {
                listener(...args);
                this.off(event, onceWrapper);
            };
            return this.on(event, onceWrapper);
        }
    }
    """

    // Process object shim
    let processShim = """
    const process = {
        env: {
            NODE_ENV: 'production'
        },
        nextTick: (fn) => setTimeout(fn, 0)
    };
    """

    // Buffer shim (minimal)
    let bufferShim = """
    const Buffer = {
        isBuffer: () => false,
        from: (data) => typeof data === 'string' ? data : String(data)
    };
    """

    // Evaluate shims BEFORE loading SDK bundle
    jsContext.evaluateScript(eventEmitterShim)
    jsContext.evaluateScript(processShim)
    jsContext.evaluateScript(bufferShim)

    print("✅ Node.js API shims loaded successfully")
}
```

### Integration

Update `setupJSContext()` method:

```swift
private func setupJSContext() {
    jsContext = JSContext()!

    // Enable exception handling
    jsContext.exceptionHandler = { context, exception in
        print("❌ JavaScriptCore Exception: \(exception.toString())")
    }

    // CRITICAL: Setup Node.js shims BEFORE loading SDK
    setupNodeJSShims()

    // Load SDK bundle
    loadSDKBundle()
}

private func loadSDKBundle() {
    guard let bundleURL = Bundle.main.url(forResource: "SchillingerSDK", withExtension: "bundle.js") else {
        print("❌ ERROR: Could not find SchillingerSDK.bundle.js")
        return
    }

    do {
        let bundleSource = try String(contentsOf: bundleURL)
        jsContext.evaluateScript(bundleSource)
        print("✅ SchillingerSDK bundle loaded successfully")

        // Verify SDK is accessible
        let sdkCheck = jsContext.evaluateScript("typeof SchillingerSDK")
        print("   SchillingerSDK type: \(sdkCheck.toString())")

    } catch {
        print("❌ ERROR: Failed to load SDK bundle: \(error)")
    }
}
```

### Success Criteria

- [ ] Shims are evaluated before SDK bundle loads
- [ ] No JavaScriptCore exceptions when loading bundle
- [ ] `SchillingerSDK` global object is accessible
- [ ] EventEmitter is available in JS context

### Testing

```swift
// In SchillingerBridge tests
func testEventEmitterShim() {
    let test = jsContext.evaluateScript("""
        const emitter = new EventEmitter();
        emitter.on('test', (data) => data);
        emitter.emit('test', 'success');
    """)
    XCTAssertNotNil(test)
}
```

---

## Step 2: Test Bundle Loading in JavaScriptCore

**Estimated Time:** 15-20 minutes
**Complexity:** LOW-MEDIUM
**File:** `platform/tvos/SchillingerBridge.swift` + Test Suite

### Implementation: Loading Tests

```swift
//================================================================================================
// Bundle Loading Verification
//================================================================================================

extension SchillingerBridge {

    /// Verify SDK bundle loaded correctly
    func verifyBundleLoaded() -> Bool {
        // Check 1: SchillingerSDK global exists
        let sdkExists = jsContext.evaluateScript("typeof SchillingerSDK !== 'undefined'").toBool()
        guard sdkExists else {
            print("❌ SchillingerSDK global object not found")
            return false
        }

        // Check 2: Core classes are available
        let coreClasses = [
            "RhythmGenerator",
            "HarmonyGenerator",
            "MelodyGenerator",
            "CompositionGenerator"
        ]

        for className in coreClasses {
            let classExists = jsContext.evaluateScript("typeof SchillingerSDK.\(className) !== 'undefined'").toBool()
            if !classExists {
                print("⚠️  WARNING: \(className) not found in SDK bundle")
            }
        }

        // Check 3: Error classes are available
        let errorClasses = ["ValidationError", "ProcessingError"]
        for errorClass in errorClasses {
            let exists = jsContext.evaluateScript("typeof SchillingerSDK.\(errorClass) !== 'undefined'").toBool()
            if !exists {
                print("⚠️  WARNING: \(errorClass) not found")
            }
        }

        // Check 4: No uncaught exceptions
        let hasErrors = jsContext.evaluateScript("typeof SchillingerSDK === 'object'").toBool()

        print("✅ Bundle loading verification complete")
        return hasErrors
    }

    /// Get SDK info
    func getSDKInfo() -> [String: Any]? {
        let result = jsContext.evaluateScript("""
            JSON.stringify({
                version: typeof SchillingerSDK,
                hasRhythmGenerator: typeof SchillingerSDK.RhythmGenerator,
                hasHarmonyGenerator: typeof SchillingerSDK.HarmonyGenerator,
                hasMelodyGenerator: typeof SchillingerSDK.MelodyGenerator,
                hasCompositionGenerator: typeof SchillingerSDK.CompositionGenerator,
                globalKeys: Object.keys(typeof SchillingerSDK === 'object' ? SchillingerSDK : {}).slice(0, 20)
            });
        """)

        guard let jsonString = result.toString(),
              let jsonData = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            return nil
        }

        return json
    }
}
```

### Unit Tests

```swift
// SchillingerBridgeTests.swift
import XCTest
@testable import SchillingerHost

class SchillingerBundleLoadingTests: XCTestCase {

    var bridge: SchillingerBridge!

    override func setUp() {
        super.setUp()
        bridge = SchillingerBridge()
    }

    func testBundleLoadsSuccessfully() {
        let success = bridge.verifyBundleLoaded()
        XCTAssertTrue(success, "SDK bundle should load without errors")
    }

    func testSchillingerSDKGlobalExists() {
        let result = bridge.jsContext.evaluateScript("typeof SchillingerSDK")
        XCTAssertEqual(result.toString(), "object", "SchillingerSDK should be an object")
    }

    func testCoreGeneratorsAvailable() {
        let generators = ["RhythmGenerator", "HarmonyGenerator", "MelodyGenerator", "CompositionGenerator"]

        for generator in generators {
            let result = bridge.jsContext.evaluateScript("typeof SchillingerSDK.\(generator)")
            XCTAssertNotEqual(result.toString(), "undefined", "\(generator) should be available")
        }
    }

    func testEventEmitterAvailable() {
        let result = bridge.jsContext.evaluateScript("typeof EventEmitter")
        XCTAssertEqual(result.toString(), "function", "EventEmitter should be available")
    }

    func testErrorClassesAvailable() {
        let errors = ["ValidationError", "ProcessingError", "NetworkError"]

        for errorClass in errors {
            let result = bridge.jsContext.evaluateScript("typeof SchillingerSDK.\(errorClass)")
            XCTAssertNotEqual(result.toString(), "undefined", "\(errorClass) should be available")
        }
    }

    func testNoUncaughtExceptions() {
        // Execute a simple operation and check for errors
        let result = bridge.jsContext.evaluateScript("""
            try {
                const gen = new SchillingerSDK.RhythmGenerator();
                gen.isValid();
                'success';
            } catch (e) {
                'error: ' + e.message;
            }
        """)
        XCTAssertEqual(result.toString(), "success", "Should not throw exceptions")
    }
}
```

### Success Criteria

- [ ] All unit tests pass
- [ ] Bundle loads in < 100ms
- [ ] No JavaScriptCore exceptions
- [ ] All core generators accessible
- [ ] EventEmitter and error classes available

---

## Step 3: Verify SDK API Accessibility from Swift

**Estimated Time:** 30-40 minutes
**Complexity:** MEDIUM
**Files:** `SchillingerBridge.swift` + Tests

### Implementation: Swift-JS Bridge Methods

```swift
//================================================================================================
// SDK API Methods (6 Core Methods)
//================================================================================================

extension SchillingerBridge {

    /// 1. Initialize SDK session
    func initSDK(config: [String: Any]) -> String? {
        guard let configData = try? JSONSerialization.data(withJSONObject: config),
              let configJSON = String(data: configData, encoding: .utf8) else {
            print("❌ Failed to serialize config")
            return nil
        }

        let result = jsContext.evaluateScript("""
            try {
                const config = \(configJSON);
                const sessionId = SchillingerSDK.SessionManager.createSession(config);
                JSON.stringify({
                    ok: true,
                    sessionId: sessionId,
                    sdkBuildHash: 'tvos-bundle-v1',
                    schemaVersion: config.schemaVersion || '2.0.0'
                });
            } catch (e) {
                JSON.stringify({
                    ok: false,
                    error: e.message
                });
            }
        """)

        return result.toString()
    }

    /// 2. Apply IR delta to session
    func applyIRDelta(sessionId: String, irDelta: [String: Any]) -> Bool {
        guard let deltaData = try? JSONSerialization.data(withJSONObject: irDelta),
              let deltaJSON = String(data: deltaData, encoding: .utf8) else {
            return false
        }

        let result = jsContext.evaluateScript("""
            try {
                const delta = \(deltaJSON);
                SchillingerSDK.SessionManager.updateSessionIR('\(sessionId)', delta);
                true;
            } catch (e) {
                console.error('applyIRDelta error:', e);
                false;
            }
        """)

        return result.toBool()
    }

    /// 3. Generate plan for time window
    func generatePlan(sessionId: String, window: [String: Any]) -> [String: Any]? {
        guard let windowData = try? JSONSerialization.data(withJSONObject: window),
              let windowJSON = String(data: windowData, encoding: .utf8) else {
            return nil
        }

        let result = jsContext.evaluateScript("""
            try {
                const win = \(windowJSON);
                const plan = SchillingerSDK.PlanGenerator.generatePlan('\(sessionId)', win);
                JSON.stringify({
                    ok: true,
                    planHash: plan.planHash,
                    irHash: plan.irHash,
                    generatedAt: plan.generatedAt,
                    window: plan.window,
                    operations: plan.operations
                });
            } catch (e) {
                JSON.stringify({
                    ok: false,
                    error: e.message
                });
            }
        """)

        guard let resultString = result.toString(),
              let resultData = resultString.data(using: .utf8),
              let resultJSON = try? JSONSerialization.jsonObject(with: resultData) as? [String: Any] else {
            return nil
        }

        return resultJSON
    }

    /// 4. Explain musical decision
    func explain(sessionId: String, query: String) -> [String: Any]? {
        // Implement explanation API
        let result = jsContext.evaluateScript("""
            try {
                const explanations = SchillingerSDK.ExplainabilityEngine.explain('\(sessionId)', '\(query)');
                JSON.stringify({
                    ok: true,
                    explanations: explanations
                });
            } catch (e) {
                JSON.stringify({
                    ok: false,
                    error: e.message
                });
            }
        """)

        guard let resultString = result.toString(),
              let resultData = resultString.data(using: .utf8),
              let resultJSON = try? JSONSerialization.jsonObject(with: resultData) as? [String: Any] else {
            return nil
        }

        return resultJSON
    }

    /// 5. Get session snapshot
    func getSnapshot(sessionId: String) -> [String: Any]? {
        let result = jsContext.evaluateScript("""
            try {
                const snapshot = SchillingerSDK.SessionManager.getSnapshot('\(sessionId)');
                JSON.stringify({
                    ok: true,
                    snapshot: snapshot
                });
            } catch (e) {
                JSON.stringify({
                    ok: false,
                    error: e.message
                });
            }
        """)

        guard let resultString = result.toString(),
              let resultData = resultString.data(using: .utf8),
              let resultJSON = try? JSONSerialization.jsonObject(with: resultData) as? [String: Any] else {
            return nil
        }

        return resultJSON
    }

    /// 6. Validate IR
    func validateIR(ir: [String: Any]) -> [String: Any]? {
        guard let irData = try? JSONSerialization.data(withJSONObject: ir),
              let irJSON = String(data: irData, encoding: .utf8) else {
            return nil
        }

        let result = jsContext.evaluateScript("""
            try {
                const ir = \(irJSON);
                const validation = SchillingerSDK.IRValidator.validate(ir);
                JSON.stringify({
                    ok: true,
                    isValid: validation.isValid,
                    errors: validation.errors || [],
                    warnings: validation.warnings || []
                });
            } catch (e) {
                JSON.stringify({
                    ok: false,
                    error: e.message
                });
            }
        """)

        guard let resultString = result.toString(),
              let resultData = resultString.data(using: .utf8),
              let resultJSON = try? JSONSerialization.jsonObject(with: resultData) as? [String: Any] else {
            return nil
        }

        return resultJSON
    }
}
```

### Integration Tests

```swift
// SchillingerAPIIntegrationTests.swift
import XCTest
@testable import SchillingerHost

class SchillingerAPIIntegrationTests: XCTestCase {

    var bridge: SchillingerBridge!
    var sessionId: String?

    override func setUp() {
        super.setUp()
        bridge = SchillingerBridge()

        // Initialize SDK
        let initResult = bridge.initSDK(config: [
            "sessionSeed": 12345,
            "graphInstanceId": "test-graph-001",
            "schemaVersion": "2.0.0",
            "sdkBuildHash": "test-bundle"
        ])

        XCTAssertNotNil(initResult, "SDK should initialize")

        if let json = initResult?.data(using: .utf8),
           let result = try? JSONSerialization.jsonObject(with: json) as? [String: Any],
           let sid = result["sessionId"] as? String {
            sessionId = sid
        }
    }

    func testInitSDK() {
        XCTAssertNotNil(sessionId, "Should receive valid session ID")
    }

    func testApplyIRDelta() {
        guard let sid = sessionId else { XCTFail("No session ID"); return }

        let success = bridge.applyIRDelta(sessionId: sid, irDelta: [
            "type": "add",
            "path": "test.value",
            "value": 42
        ])

        XCTAssertTrue(success, "IR delta should apply successfully")
    }

    func testGeneratePlan() {
        guard let sid = sessionId else { XCTFail("No session ID"); return }

        // First apply some IR
        bridge.applyIRDelta(sessionId: sid, irDelta: [
            "type": "add",
            "path": "rhythm.tempo",
            "value": 120
        ])

        // Generate plan
        let plan = bridge.generatePlan(sessionId: sid, window: [
            "from": 0,
            "to": 48000  // 1 second at 48kHz
        ])

        XCTAssertNotNil(plan, "Should generate plan")
        if let plan = plan {
            XCTAssertTrue(plan["ok"] as? Bool == true, "Plan should be valid")
            XCTAssertNotNil(plan["planHash"], "Plan should have hash")
        }
    }

    func testValidateIR() {
        let validation = bridge.validateIR(ir: [
            "type": "SongGraphIR",
            "id": "test-song",
            "sections": []
        ])

        XCTAssertNotNil(validation, "Should return validation result")
        if let result = validation {
            XCTAssertEqual(result["ok"] as? Bool, true)
        }
    }

    func testGetSnapshot() {
        guard let sid = sessionId else { XCTFail("No session ID"); return }

        let snapshot = bridge.getSnapshot(sessionId: sid)

        XCTAssertNotNil(snapshot, "Should return snapshot")
        if let result = snapshot, let data = result["snapshot"] as? [String: Any] {
            XCTAssertEqual(data["sessionId"] as? String, sid)
        }
    }

    func testExplain() {
        guard let sid = sessionId else { XCTFail("No session ID"); return }

        let explanation = bridge.explain(sessionId: sid, query: "Why this tempo?")

        XCTAssertNotNil(explanation, "Should return explanation")
    }
}
```

### Success Criteria

- [ ] All 6 API methods implemented
- [ ] All integration tests pass
- [ ] JSON serialization works correctly
- [ ] Error handling works properly
- [ ] Session management works

---

## Step 4: Test Plan Generation Workflow

**Estimated Time:** 1-2 hours
**Complexity:** MEDIUM-HIGH
**Files:** New test suite + Integration tests

### Implementation: End-to-End Workflow Test

```swift
//================================================================================================
// Plan Generation Workflow Tests
//================================================================================================

class SchillingerWorkflowTests: XCTestCase {

    var bridge: SchillingerBridge!
    var sessionId: String?

    override func setUp() {
        super.setUp()
        bridge = SchillingerBridge()
    }

    /// Complete workflow: Init → Apply IR → Generate Plan → Verify
    func testCompletePlanGenerationWorkflow() {
        // Step 1: Initialize
        let initResult = bridge.initSDK(config: [
            "sessionSeed": 42,
            "graphInstanceId": "workflow-test-001",
            "schemaVersion": "2.0.0",
            "sdkBuildHash": "tvos-test"
        ])

        guard let json = initResult?.data(using: .utf8),
              let result = try? JSONSerialization.jsonObject(with: json) as? [String: Any],
              let sid = result["sessionId"] as? String else {
            XCTFail("Failed to initialize SDK")
            return
        }

        sessionId = sid
        print("✅ Session created: \(sid)")

        // Step 2: Apply IR deltas to build a song
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
            ],
            [
                "type": "add",
                "path": "rhythm.pattern",
                "value": [
                    "durations": [1, 0.5, 0.5, 1, 1],
                    "accents": [true, false, true, true, false]
                ]
            ]
        ]

        for delta in irDeltas {
            let success = bridge.applyIRDelta(sessionId: sid, irDelta: delta)
            XCTAssertTrue(success, "IR delta should apply: \(delta)")
        }

        print("✅ IR deltas applied")

        // Step 3: Generate plans for multiple time windows
        let timeWindows: [[String: Any]] = [
            ["from": 0, "to": 48000],       // 0-1 seconds
            ["from": 48000, "to": 96000],   // 1-2 seconds
            ["from": 96000, "to": 192000],  // 2-4 seconds
            ["from": 192000, "to": 384000]  // 4-8 seconds
        ]

        var planHashes: [String] = []

        for window in timeWindows {
            let plan = bridge.generatePlan(sessionId: sid, window: window)

            XCTAssertNotNil(plan, "Plan should generate for window: \(window)")

            if let plan = plan,
               let ok = plan["ok"] as? Bool,
               ok,
               let hash = plan["planHash"] as? String {
                planHashes.append(hash)
                print("✅ Plan generated: \(hash.prefix(8))...")

                // Verify plan structure
                XCTAssertNotNil(plan["operations"], "Plan should have operations")
                XCTAssertNotNil(plan["window"], "Plan should have window")
            } else {
                XCTFail("Plan generation failed for window: \(window)")
            }
        }

        // Step 4: Verify determinism (same seed = same plans)
        print("✅ Generated \(planHashes.count) plans")

        // Re-initialize with same seed
        let initResult2 = bridge.initSDK(config: [
            "sessionSeed": 42,  // SAME SEED
            "graphInstanceId": "workflow-test-002",
            "schemaVersion": "2.0.0",
            "sdkBuildHash": "tvos-test"
        ])

        guard let json2 = initResult2?.data(using: .utf8),
              let result2 = try? JSONSerialization.jsonObject(with: json2) as? [String: Any],
              let sid2 = result2["sessionId"] as? String else {
            return
        }

        // Apply same IR
        for delta in irDeltas {
            _ = bridge.applyIRDelta(sessionId: sid2, irDelta: delta)
        }

        // Generate plan for same window
        let plan2 = bridge.generatePlan(sessionId: sid2, window: timeWindows[0])

        if let plan2 = plan2,
           let hash2 = plan2["planHash"] as? String {
            // Plans should be identical
            XCTAssertEqual(hash2, planHashes[0], "Same seed should produce same plan")
            print("✅ Determinism verified: plans match")
        }
    }

    /// Test plan generation with different seeds
    func testDifferentSeedsProduceDifferentPlans() {
        // Initialize with seed 1
        let init1 = bridge.initSDK(config: [
            "sessionSeed": 1,
            "graphInstanceId": "seed-test-1",
            "schemaVersion": "2.0.0"
        ])

        guard let sid1 = extractSessionId(from: init1) else { return }

        // Initialize with seed 2
        let init2 = bridge.initSDK(config: [
            "sessionSeed": 2,
            "graphInstanceId": "seed-test-2",
            "schemaVersion": "2.0.0"
        ])

        guard let sid2 = extractSessionId(from: init2) else { return }

        // Apply same IR
        let delta: [String: Any] = [
            "type": "add",
            "path": "test.value",
            "value": 100
        ]

        _ = bridge.applyIRDelta(sessionId: sid1, irDelta: delta)
        _ = bridge.applyIRDelta(sessionId: sid2, irDelta: delta)

        // Generate plans
        let plan1 = bridge.generatePlan(sessionId: sid1, window: ["from": 0, "to": 48000])
        let plan2 = bridge.generatePlan(sessionId: sid2, window: ["from": 0, "to": 48000])

        guard let hash1 = plan1?["planHash"] as? String,
              let hash2 = plan2?["planHash"] as? String else {
            XCTFail("Should generate plans")
            return
        }

        XCTAssertNotEqual(hash1, hash2, "Different seeds should produce different plans")
        print("✅ Seed independence verified")
    }

    /// Test error handling
    func testErrorHandling() {
        // Try to generate plan for non-existent session
        let plan = bridge.generatePlan(sessionId: "non-existent", window: ["from": 0, "to": 48000])

        XCTAssertNotNil(plan, "Should return error response")

        if let result = plan {
            let ok = result["ok"] as? Bool
            XCTAssertFalse(ok == true, "Should return error for invalid session")
        }
    }

    // Helper
    func extractSessionId(from json: String?) -> String? {
        guard let json = json,
              let data = json.data(using: .utf8),
              let result = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sessionId = result["sessionId"] as? String else {
            return nil
        }
        return sessionId
    }
}
```

### Success Criteria

- [ ] Complete workflow test passes
- [ ] Determinism verified (same seed = same output)
- [ ] Different seeds produce different results
- [ ] Error handling works correctly
- [ ] Multiple time windows work correctly

---

## Step 5: Create Golden Test Fixtures

**Estimated Time:** 2-4 hours
**Complexity:** MEDIUM
**Location:** `tests/schillinger/fixtures/`

### Fixture Structure

```
tests/schillinger/fixtures/
├── init_sequence/
│   ├── request.json
│   └── response.json
├── apply_ir_delta/
│   ├── request.json
│   └── response.json
├── generate_plan_window1/
│   ├── request.json
│   └── response.json
├── generate_plan_window2/
│   ├── request.json
│   └── response.json
├── determinism_test/
│   ├── request.json
│   └── response.json
└── README.md
```

### Implementation: Fixture Generator Script

```python
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

FIXTURES_DIR = Path(__file__).parent / "tests" / "schillinger" / "fixtures"

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
            "seed": 42  // Fixed seed for determinism
        }
    }

    response = {
        "id": "req-determinism-001",
        "ok": True,
        "result": {
            "planHash": "deterministic-hash-42",  // Will always be the same for seed 42
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

def main():
    """Generate all fixtures"""
    print("Generating golden test fixtures...")
    print("=" * 60)

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    generate_init_fixture()
    generate_apply_ir_fixture()
    generate_plan_fixtures()
    generate_determinism_fixture()

    print("=" * 60)
    print(f"✅ All fixtures generated in: {FIXTURES_DIR}")

if __name__ == "__main__":
    main()
```

### Fixture Validator

```swift
// GoldenFixtureTests.swift
import XCTest
@testable import SchillingerHost

class GoldenFixtureTests: XCTestCase {

    var bridge: SchillingerBridge!

    override func setUp() {
        super.setUp()
        bridge = SchillingerBridge()
    }

    func testInitFixture() {
        // Load request fixture
        guard let requestURL = Bundle.main.url(forResource: "init_sequence/request", withExtension: "json"),
              let requestData = try? Data(contentsOf: requestURL),
              let request = try? JSONSerialization.jsonObject(with: requestData) as? [String: Any] else {
            XCTFail("Could not load request fixture")
            return
        }

        // Execute request
        let response = bridge.initSDK(config: request["payload"] as? [String: Any] ?? [:])

        // Load expected response fixture
        guard let responseURL = Bundle.main.url(forResource: "init_sequence/response", withExtension: "json"),
              let expectedData = try? Data(contentsOf: responseURL),
              let expected = try? JSONSerialization.jsonObject(with: expectedData) as? [String: Any] else {
            XCTFail("Could not load response fixture")
            return
        }

        // Compare
        XCTAssertNotNil(response, "Should get response")

        if let responseJSON = response?.data(using: .utf8),
           let responseDict = try? JSONSerialization.jsonObject(with: responseJSON) as? [String: Any] {
            XCTAssertEqual(responseDict["ok"] as? Bool, expected["ok"] as? Bool)
            print("✅ Init fixture matches")
        }
    }

    func testDeterminismFixture() {
        // This test verifies the SDK produces the same output for the same seed
        // Critical for record/replay debugging

        let config = [
            "sessionSeed": 42,
            "graphInstanceId": "determinism-test",
            "schemaVersion": "2.0.0"
        ]

        // Run 1
        let response1 = bridge.initSDK(config: config)
        let sid1 = extractSessionId(from: response1)

        // Run 2 with same seed
        let response2 = bridge.initSDK(config: config)
        let sid2 = extractSessionId(from: response2)

        // Session IDs should be deterministic
        XCTAssertEqual(sid1, sid2, "Same seed should produce same session ID")
        print("✅ Determinism verified")
    }

    func extractSessionId(from json: String?) -> String? {
        guard let json = json,
              let data = json.data(using: .utf8),
              let result = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sessionId = result["sessionId"] as? String else {
            return nil
        }
        return sessionId
    }
}
```

### Success Criteria

- [ ] All fixtures generated successfully
- [ ] Fixture validator tests pass
- [ ] Determinism verified across multiple runs
- [ ] Fixtures are version controlled
- [ ] README.md explains fixture usage

---

## Testing Strategy

### Unit Tests
- EventEmitter shim works correctly
- Bundle loads without errors
- API methods serialize correctly

### Integration Tests
- Complete workflow works end-to-end
- Swift ↔ JavaScriptCore communication works
- Error handling is robust

### Golden Tests
- Fixtures match expected output
- Determinism is enforced
- Regression detection

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass (unit + integration + golden)
- [ ] Bundle verified on tvOS simulator
- [ ] Memory usage < 10 MB per session
- [ ] CPU usage < 20% for plan generation

### Deployment
- [ ] Bundle added to Xcode project as resource
- [ ] Swift bridge integrated
- [ ] Tests added to CI/CD pipeline

### Post-Deployment
- [ ] Monitor for JavaScriptCore exceptions
- [ ] Verify determinism in production
- [ ] Update documentation

---

## Timeline

**Day 1:** Steps 1-3 (Shim, Loading, API) - ~1 hour
**Day 2:** Step 4 (Plan Generation Tests) - ~2 hours
**Day 3:** Step 5 (Golden Fixtures) - ~3 hours
**Day 4:** Integration testing and bug fixes - ~4 hours
**Day 5:** tvOS hardware testing and validation - ~4 hours

**Total:** 14-16 hours of focused work

---

## Success Criteria

✅ **COMPLETE WHEN:**
1. EventEmitter shim working
2. Bundle loads in < 100ms
3. All 6 API methods working
4. Plan generation is deterministic
5. Golden tests pass 100%
6. Memory and CPU within limits
7. tvOS hardware verified

---

**Status:** READY FOR IMPLEMENTATION
**Next Action:** Begin with Step 1 (EventEmitter Shim)
**Owner:** JUCE Backend + Platform Teams
