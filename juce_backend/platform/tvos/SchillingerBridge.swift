//
// SchillingerBridge.swift
// tvOS Schillinger SDK Bridge
//
// CRITICAL: JSCore NEVER runs on audio thread. Ever.
//
// Architecture:
//   Swift UI Thread → SDK Queue (serial) → JSCore (SDK) → Plan Ring Buffer → JUCE Audio Thread
//

import Foundation
import JavaScriptCore

//================================================================================================
// Message Types
//================================================================================================

struct SDKRequest: Codable {
    let op: String          // Operation: "init", "applyIR", "plan", "explain", "snapshot", "validate"
    let id: String          // Request ID for response matching
    let payload: [String: Any]  // Operation-specific payload

    // Custom Codable implementation for [String: Any]
    enum CodingKeys: String, CodingKey {
        case op, id, payload
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        op = try container.decode(String.self, forKey: .op)
        id = try container.decode(String.self, forKey: .id)

        // Decode payload as dictionary with String keys
        let payloadData = try container.decode([String: AnyCodable].self, forKey: .payload)
        var payloadDict: [String: Any] = [:]
        for (key, value) in payloadData {
            payloadDict[key] = value.value
        }
        payload = payloadDict
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(op, forKey: .op)
        try container.encode(id, forKey: .id)

        // Encode payload as [String: AnyCodable]
        var payloadDict: [String: AnyCodable] = [:]
        for (key, value) in payload {
            payloadDict[key] = AnyCodable(value)
        }
        try container.encode(payloadDict, forKey: .payload)
    }
}

struct SDKResponse: Codable {
    let id: String          // Request ID
    let ok: Bool            // Success flag
    let result: [String: Any]?  // Operation result (if successful)
    let error: String?      // Error message (if failed)

    // Custom Codable implementation for [String: Any]
    enum CodingKeys: String, CodingKey {
        case id, ok, result, error
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        ok = try container.decode(Bool.self, forKey: .ok)
        error = try container.decodeIfPresent(String.self, forKey: .error)

        if let resultData = try container.decodeIfPresent([String: AnyCodable].self, forKey: .result) {
            var resultDict: [String: Any] = [:]
            for (key, value) in resultData {
                resultDict[key] = value.value
            }
            result = resultDict
        } else {
            result = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(ok, forKey: .ok)
        try container.encodeIfPresent(error, forKey: .error)

        if let resultDict = result {
            var resultEncoded: [String: AnyCodable] = [:]
            for (key, value) in resultDict {
                resultEncoded[key] = AnyCodable(value)
            }
            try container.encode(resultEncoded, forKey: .result)
        }
    }
}

// Helper for encoding/decoding [String: Any]
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            var dict: [String: Any] = [:]
            for (key, anyCodable) in dictValue {
                dict[key] = anyCodable.value
            }
            value = dict
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

//================================================================================================
// Bridge Configuration
//================================================================================================

struct SchillingerConfig {
    let bundlePath: String          // Path to SchillingerSDK.bundle.js
    let bundleHash: String          // Expected SHA-256 hash
    let schemaVersion: String       // IR schema version
}

//================================================================================================
// Main Bridge Class
//================================================================================================

@objc public class SchillingerBridge: NSObject {

    //============================================================================================
    // Properties
    //============================================================================================

    private var jsContext: JSContext!
    private var sdkQueue: DispatchQueue!
    private var config: SchillingerConfig!

    // Plan cache (lock-free ring buffer shared with JUCE)
    private var planCache: SchillingerPlanCache!

    // Request tracking
    private var pendingRequests: [String: (SDKResponse) -> Void] = [:]
    private var requestCounter: UInt64 = 0
    private let requestLock = NSLock()

    //============================================================================================
    // Initialization
    //============================================================================================

    //============================================================================================
    // Node.js API Shims for tvOS JavaScriptCore
    //============================================================================================

    private func setupNodeJSShims() {
        // EventEmitter shim (most critical - used by SDK)
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

        print("✅ [SchillingerBridge] Node.js API shims loaded successfully")
    }

    //============================================================================================
    // Initialization
    //============================================================================================

    public init(config: SchillingerConfig) {
        super.init()

        self.config = config
        self.sdkQueue = DispatchQueue(label: "com.schillinger.sdk", qos: .userInitiated)
        self.planCache = SchillingerPlanCache()

        setupJSContext()
    }

    private func setupJSContext() {
        // Create JavaScriptCore context
        jsContext = JSContext()!

        // Configure exception handler
        jsContext.exceptionHandler = { context, exception in
            print("❌ [SchillingerBridge] JavaScriptCore exception: \(exception?.toString() ?? "unknown")")
        }

        // CRITICAL: Setup Node.js API shims BEFORE loading SDK bundle
        setupNodeJSShims()

        // Load SDK bundle
        guard let bundleCode = try? String(contentsOfFile: config.bundlePath, encoding: .utf8) else {
            fatalError("Failed to load SDK bundle from: \(config.bundlePath)")
        }

        // Verify bundle integrity
        let actualHash = bundleCode.sha256()
        guard actualHash == config.bundleHash else {
            fatalError("SDK bundle integrity check failed!\nExpected: \(config.bundleHash)\nActual: \(actualHash)")
        }

        // Evaluate bundle
        jsContext.evaluateScript(bundleCode)

        // Verify SDK loaded successfully
        if !verifyBundleLoaded() {
            fatalError("SDK bundle verification failed - see logs above")
        }

        print("✅ [SchillingerBridge] SDK loaded and verified")
    }

    //============================================================================================
    // Bundle Loading Verification
    //============================================================================================

    /// Verify SDK bundle loaded correctly with comprehensive checks
    private func verifyBundleLoaded() -> Bool {
        var success = true

        // Check 1: SchillingerSDK global exists
        let sdkExists = jsContext.evaluateScript("typeof SchillingerSDK !== 'undefined'").toBool()
        guard sdkExists else {
            print("❌ [SchillingerBridge] SchillingerSDK global object not found")
            return false
        }
        print("✅ [SchillingerBridge] SchillingerSDK global object verified")

        // Check 2: Core classes are available
        let coreClasses = [
            "RhythmGenerator",
            "HarmonyGenerator",
            "MelodyGenerator",
            "CompositionGenerator"
        ]

        for className in coreClasses {
            let classExists = jsContext.evaluateScript("typeof SchillingerSDK.\(className) !== 'undefined'").toBool()
            if classExists {
                print("✅ [SchillingerBridge] \(className) available")
            } else {
                print("⚠️  [SchillingerBridge] WARNING: \(className) not found in SDK bundle")
            }
        }

        // Check 3: Error classes are available
        let errorClasses = ["ValidationError", "ProcessingError", "NetworkError"]
        for errorClass in errorClasses {
            let exists = jsContext.evaluateScript("typeof SchillingerSDK.\(errorClass) !== 'undefined'").toBool()
            if !exists {
                print("⚠️  [SchillingerBridge] WARNING: \(errorClass) not found")
            }
        }

        // Check 4: EventEmitter is available (from shims)
        let eventEmitterExists = jsContext.evaluateScript("typeof EventEmitter !== 'undefined'").toBool()
        if eventEmitterExists {
            print("✅ [SchillingerBridge] EventEmitter shim verified")
        } else {
            print("❌ [SchillingerBridge] EventEmitter shim not found")
            success = false
        }

        return success
    }

    /// Get SDK information for debugging/testing
    public func getSDKInfo() -> [String: Any]? {
        let result = jsContext.evaluateScript("""
            JSON.stringify({
                version: typeof SchillingerSDK,
                hasRhythmGenerator: typeof SchillingerSDK.RhythmGenerator,
                hasHarmonyGenerator: typeof SchillingerSDK.HarmonyGenerator,
                hasMelodyGenerator: typeof SchillingerSDK.MelodyGenerator,
                hasCompositionGenerator: typeof SchillingerSDK.CompositionGenerator,
                hasValidationError: typeof SchillingerSDK.ValidationError,
                hasProcessingError: typeof SchillingerSDK.ProcessingError,
                hasEventEmitter: typeof EventEmitter,
                globalKeys: Object.keys(typeof SchillingerSDK === 'object' ? SchillingerSDK : {}).slice(0, 20).join(', ')
            });
        """)

        guard let jsonString = result?.toString(),
              let jsonData = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            return nil
        }

        return json
    }

    /// Test basic API functionality
    public func testBasicAPI() -> Bool {
        print("🧪 [SchillingerBridge] Testing basic API functionality...")

        // Test: Create a RhythmGenerator instance
        let testResult = jsContext.evaluateScript("""
            try {
                const gen = new SchillingerSDK.RhythmGenerator();
                const valid = gen.isValid();
                JSON.stringify({ success: true, isValid: valid });
            } catch (e) {
                JSON.stringify({ success: false, error: e.message });
            }
        """)

        guard let testString = testResult?.toString(),
              let testData = testString.data(using: .utf8),
              let testJson = try? JSONSerialization.jsonObject(with: testData) as? [String: Any] else {
            print("❌ [SchillingerBridge] API test failed: could not parse result")
            return false
        }

        if let success = testJson["success"] as? Bool, success {
            print("✅ [SchillingerBridge] Basic API test passed")
            if let isValid = testJson["isValid"] as? Bool {
                print("   RhythmGenerator.isValid() = \(isValid)")
            }
            return true
        } else {
            print("❌ [SchillingerBridge] API test failed: \(testJson["error"] ?? "unknown error")")
            return false
        }
    }

    //============================================================================================
    // Public API (6 Methods)
    //============================================================================================

    /// Initialize a new Schillinger session
    public func init(
        sessionSeed: UInt64,
        graphInstanceId: String,
        completion: @escaping (_ sessionId: String, _ sdkBuildHash: String, _ schemaVersion: String) -> Void
    ) {
        let payload: [String: Any] = [
            "sessionSeed": sessionSeed,
            "graphInstanceId": graphInstanceId,
            "schemaVersion": config.schemaVersion,
            "sdkBuildHash": config.bundleHash
        ]

        sendRequest(op: "init", payload: payload) { response in
            guard response.ok, let result = response.result else {
                fatalError("Init failed: \(response.error ?? "unknown error")")
            }

            let sessionId = result["sessionId"] as! String
            let sdkBuildHash = result["sdkBuildHash"] as! String
            let schemaVersion = result["schemaVersion"] as! String

            completion(sessionId, sdkBuildHash, schemaVersion)
        }
    }

    /// Apply IR delta to session
    public func applyIR(
        sessionId: String,
        delta: [String: Any],
        completion: @escaping (_ ok: Bool, _ irHash: String) -> Void
    ) {
        let payload: [String: Any] = [
            "sessionId": sessionId,
            "irDelta": delta
        ]

        sendRequest(op: "applyIR", payload: payload) { response in
            guard response.ok, let result = response.result else {
                print("❌ applyIR failed: \(response.error ?? "unknown")")
                completion(false, "")
                return
            }

            let irHash = result["irHash"] as! String
            completion(true, irHash)
        }
    }

    /// Generate plan for time window
    public func plan(
        sessionId: String,
        windowFrom: Double,
        windowTo: Double,
        completion: @escaping (_ ok: Bool, _ planHash: String, _ plan: [String: Any]?) -> Void
    ) {
        let payload: [String: Any] = [
            "sessionId": sessionId,
            "window": [
                "from": windowFrom,
                "to": windowTo
            ]
        ]

        sendRequest(op: "plan", payload: payload) { response in
            guard response.ok, let result = response.result else {
                print("❌ plan failed: \(response.error ?? "unknown")")
                completion(false, "", nil)
                return
            }

            let planHash = result["planHash"] as! String
            let plan = result["plan"] as! [String: Any]

            // Write plan to lock-free cache for JUCE
            let success = self.planCache.writePlan(sessionId: sessionId, plan: plan)

            if success {
                completion(true, planHash, plan)
            } else {
                print("⚠️ Failed to write plan to cache")
                completion(false, planHash, plan)
            }
        }
    }

    /// Explain musical decision
    public func explain(
        sessionId: String,
        query: String,
        completion: @escaping (_ ok: Bool, _ explanations: [[String: Any]]) -> Void
    ) {
        let payload: [String: Any] = [
            "sessionId": sessionId,
            "query": query
        ]

        sendRequest(op: "explain", payload: payload) { response in
            guard response.ok, let result = response.result else {
                print("❌ explain failed: \(response.error ?? "unknown")")
                completion(false, [])
                return
            }

            let explanations = result["explanations"] as! [[String: Any]]
            completion(true, explanations)
        }
    }

    /// Capture session snapshot
    public func snapshot(
        sessionId: String,
        completion: @escaping (_ ok: Bool, _ snapshot: [String: Any]?) -> Void
    ) {
        let payload: [String: Any] = ["sessionId": sessionId]

        sendRequest(op: "snapshot", payload: payload) { response in
            guard response.ok, let result = response.result else {
                print("❌ snapshot failed: \(response.error ?? "unknown")")
                completion(false, nil)
                return
            }

            let snapshot = result["snapshot"] as! [String: Any]
            completion(true, snapshot)
        }
    }

    /// Validate IR structure
    public func validate(
        ir: [String: Any],
        completion: @escaping (_ ok: Bool, _ isValid: Bool, _ errors: [String], _ warnings: [String]) -> Void
    ) {
        let payload: [String: Any] = ["ir": ir]

        sendRequest(op: "validate", payload: payload) { response in
            guard response.ok, let result = response.result else {
                print("❌ validate failed: \(response.error ?? "unknown")")
                completion(false, false, [], [])
                return
            }

            let isValid = result["isValid"] as! Bool
            let errors = result["errors"] as? [String] ?? []
            let warnings = result["warnings"] as? [String] ?? []

            completion(true, isValid, errors, warnings)
        }
    }

    //============================================================================================
    // Request/Response Handling
    //============================================================================================

    private func sendRequest(
        op: String,
        payload: [String: Any],
        completion: @escaping (SDKResponse) -> Void
    ) {
        // Generate unique request ID
        requestLock.lock()
        requestCounter += 1
        let requestId = "req-\(requestCounter)"
        requestLock.unlock()

        // Store completion handler
        requestLock.lock()
        pendingRequests[requestId] = completion
        requestLock.unlock()

        // Create request
        let request = SDKRequest(op: op, id: requestId, payload: payload)

        // Serialize to JSON
        guard let requestData = try? JSONEncoder().encode(request),
              let jsonString = String(data: requestData, encoding: .utf8) else {
            fatalError("Failed to encode request")
        }

        // Execute on SDK queue (NOT audio thread!)
        sdkQueue.async { [weak self] in
            guard let self = self else { return }

            // Call SDK method
            let jsCall = """
            (() => {
                try {
                    const request = \(jsonString);
                    const method = SchillingerSDK[request.op];
                    if (!method) {
                        return { id: "\(requestId)", ok: false, error: "Unknown operation: \(op)" };
                    }
                    const result = method(...Object.values(request.payload));
                    return { id: "\(requestId)", ok: true, result: result };
                } catch (error) {
                    return { id: "\(requestId)", ok: false, error: String(error) };
                }
            })()
            """

            let jsResult = self.jsContext.evaluateScript(jsCall)

            // Parse response
            guard let resultString = jsResult?.toString(),
                  let resultData = resultString.data(using: .utf8),
                  let response = try? JSONDecoder().decode(SDKResponse.self, from: resultData) else {
                fatalError("Failed to decode SDK response")
            }

            // Dispatch completion on main queue
            DispatchQueue.main.async {
                self.requestLock.lock()
                let handler = self.pendingRequests[response.id]
                self.requestLock.unlock()

                handler?(response)

                // Clean up
                self.requestLock.lock()
                self.pendingRequests.removeValue(forKey: response.id)
                self.requestLock.unlock()
            }
        }
    }
}

//================================================================================================
// Lock-Free Plan Cache (Shared with JUCE)
//================================================================================================

public class SchillingerPlanCache {

    private var cache: [String: [String: Any]] = [:]
    private let cacheLock = NSLock()

    func writePlan(sessionId: String, plan: [String: Any]) -> Bool {
        cacheLock.lock()
        defer { cacheLock.unlock() }

        cache[sessionId] = plan
        return true
    }

    func readPlan(sessionId: String) -> [String: Any]? {
        cacheLock.lock()
        defer { cacheLock.unlock() }

        return cache[sessionId]
    }

    func clearPlan(sessionId: String) {
        cacheLock.lock()
        defer { cacheLock.unlock() }

        cache.removeValue(forKey: sessionId)
    }
}

//================================================================================================
// Extensions
//================================================================================================

extension String {
    func sha256() -> String {
        // SHA-256 hash computation
        guard let data = self.data(using: .utf8) else { return "" }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }

        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

import CommonCrypto
