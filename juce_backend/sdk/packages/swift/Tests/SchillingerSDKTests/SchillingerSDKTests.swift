import XCTest
@testable import SchillingerSDK

@MainActor
final class SchillingerSDKTests: XCTestCase {

    var sdk: SchillingerSDK!

    override func setUp() async throws {
        try await super.setUp()

        // Initialize SDK with test configuration
        let config = SDKConfiguration(
            offlineMode: true, // Use offline mode for tests
            environment: .development,
            debug: true
        )
        sdk = SchillingerSDK(configuration: config)
    }

    override func tearDown() async throws {
        await sdk.logout()
        sdk = nil
        try await super.tearDown()
    }

    // MARK: - SDK Initialization Tests

    func testSDKInitialization() {
        XCTAssertNotNil(sdk)
        XCTAssertFalse(sdk.isAuthenticated)
        XCTAssertTrue(sdk.isOfflineMode)
    }

    func testSDKConfiguration() {
        let config = sdk.getConfiguration()
        XCTAssertEqual(config.environment, .development)
        XCTAssertTrue(config.debug)
        XCTAssertTrue(config.offlineMode)
    }

    // MARK: - Authentication Tests

    func testAuthenticationWithAPIKey() async {
        let credentials = AuthCredentials(apiKey: "test-api-key")

        // In offline mode, authentication should work with any valid credentials
        let result = await sdk.authenticate(credentials: credentials)

        switch result {
        case .success(let authResult):
            XCTAssertTrue(authResult.success)
        case .failure(let error):
            // In offline mode, we expect this to fail since we can't actually authenticate
            switch error {
            case .network, .offline:
                XCTAssertTrue(true)
            default:
                XCTFail("Expected network or offline error, got \(error)")
            }
        }
    }

    func testAuthenticationWithInvalidCredentials() async {
        let credentials = AuthCredentials() // Empty credentials

        let result = await sdk.authenticate(credentials: credentials)

        switch result {
        case .success:
            XCTFail("Authentication should fail with empty credentials")
        case .failure(let error):
            switch error {
            case .validation:
                XCTAssertTrue(true)
            default:
                XCTFail("Expected validation error, got \(error)")
            }
        }
    }

    // MARK: - Rhythm API Tests

    func testRhythmGenerateResultant() async {
        let result = await sdk.rhythm.generateResultant(a: 3, b: 2)

        switch result {
        case .success(let pattern):
            XCTAssertFalse(pattern.durations.isEmpty)
            XCTAssertEqual(pattern.timeSignature.numerator, 4)
            XCTAssertEqual(pattern.timeSignature.denominator, 4)
            XCTAssertEqual(pattern.metadata?.generators?.a, 3)
            XCTAssertEqual(pattern.metadata?.generators?.b, 2)
        case .failure(let error):
            XCTFail("Rhythm generation should succeed in offline mode: \(error)")
        }
    }

    func testRhythmGenerateResultantWithInvalidInput() async {
        let result = await sdk.rhythm.generateResultant(a: 0, b: 2)

        switch result {
        case .success:
            XCTFail("Should fail with invalid generator")
        case .failure(let error):
            switch error {
            case .validation:
                XCTAssertTrue(true)
            default:
                XCTFail("Expected validation error, got \(error)")
            }
        }
    }

    func testRhythmGenerateVariation() async {
        let originalPattern = RhythmPattern(
            durations: [1, 2, 1, 2],
            timeSignature: TimeSignature(numerator: 4, denominator: 4)
        )

        let result = await sdk.rhythm.generateVariation(pattern: originalPattern, type: .augmentation)

        switch result {
        case .success(let variatedPattern):
            XCTAssertEqual(variatedPattern.durations, [2, 4, 2, 4])
            XCTAssertEqual(variatedPattern.metadata?.variationType, "augmentation")
        case .failure(let error):
            XCTFail("Rhythm variation should succeed in offline mode: \(error)")
        }
    }

    func testRhythmPatternValidation() async {
        let validPattern = RhythmPattern(durations: [1, 2, 1, 2])
        let result = await sdk.rhythm.validatePattern(pattern: validPattern)

        switch result {
        case .success(let validation):
            XCTAssertTrue(validation.valid)
            XCTAssertTrue(validation.errors.isEmpty)
        case .failure(let error):
            XCTFail("Pattern validation should succeed: \(error)")
        }
    }

    func testRhythmPatternValidationWithInvalidPattern() async {
        let invalidPattern = RhythmPattern(durations: []) // Empty pattern
        let result = await sdk.rhythm.validatePattern(pattern: invalidPattern)

        switch result {
        case .success(let validation):
            XCTAssertFalse(validation.valid)
            XCTAssertFalse(validation.errors.isEmpty)
        case .failure(let error):
            XCTFail("Pattern validation should not fail: \(error)")
        }
    }

    // MARK: - Harmony API Tests

    func testHarmonyGenerateProgression() async {
        let result = await sdk.harmony.generateProgression(key: "C", scale: "major", length: 4)

        switch result {
        case .success(let progression):
            XCTAssertEqual(progression.chords.count, 4)
            XCTAssertEqual(progression.key, "C")
            XCTAssertEqual(progression.scale, "major")
        case .failure(let error):
            XCTFail("Harmony generation should succeed in offline mode: \(error)")
        }
    }

    func testHarmonyGenerateProgressionWithInvalidLength() async {
        let result = await sdk.harmony.generateProgression(key: "C", scale: "major", length: 0)

        switch result {
        case .success:
            XCTFail("Should fail with invalid length")
        case .failure(let error):
            switch error {
            case .validation:
                XCTAssertTrue(true)
            default:
                XCTFail("Expected validation error, got \(error)")
            }
        }
    }

    // MARK: - Melody API Tests

    func testMelodyGeneration() async {
        let params = MelodyGenerationParams(
            key: "C",
            scale: "major",
            length: 8,
            contour: .ascending
        )

        let result = await sdk.melody.generateMelody(params: params)

        switch result {
        case .success(let melody):
            XCTAssertEqual(melody.notes.count, 8)
            XCTAssertEqual(melody.key, "C")
            XCTAssertEqual(melody.scale, "major")
            XCTAssertEqual(melody.metadata?.contour, "ascending")
        case .failure(let error):
            XCTFail("Melody generation should succeed in offline mode: \(error)")
        }
    }

    func testMelodyVariation() async {
        let originalMelody = MelodyLine(
            notes: [60, 62, 64, 65],
            durations: [1, 1, 1, 1],
            key: "C",
            scale: "major"
        )

        let result = await sdk.melody.generateVariations(melody: originalMelody, type: .inversion)

        switch result {
        case .success(let variatedMelody):
            XCTAssertNotEqual(variatedMelody.notes, originalMelody.notes)
            XCTAssertEqual(variatedMelody.durations, originalMelody.durations)
        case .failure(let error):
            XCTFail("Melody variation should succeed in offline mode: \(error)")
        }
    }

    // MARK: - Composition API Tests

    func testCompositionCreation() async {
        let params = CompositionParams(
            name: "Test Composition",
            key: "C",
            scale: "major",
            tempo: 120,
            timeSignature: TimeSignature(numerator: 4, denominator: 4),
            length: 16
        )

        let result = await sdk.composition.create(params: params)

        switch result {
        case .success(let composition):
            XCTAssertEqual(composition.name, "Test Composition")
            XCTAssertEqual(composition.key, "C")
            XCTAssertEqual(composition.tempo, 120)
            XCTAssertFalse(composition.sections.isEmpty)
        case .failure(let error):
            XCTFail("Composition creation should succeed in offline mode: \(error)")
        }
    }

    // MARK: - Error Handling Tests

    func testErrorHandling() {
        let validationError = ValidationError(field: "test", value: nil, expected: "valid value")
        XCTAssertEqual(validationError.category, .validation)
        XCTAssertFalse(validationError.suggestions.isEmpty)

        let networkError = NetworkError(message: "Connection failed", statusCode: 500)
        XCTAssertEqual(networkError.category, .network)
        XCTAssertFalse(networkError.suggestions.isEmpty)

        let authError = AuthenticationError(message: "Invalid credentials")
        XCTAssertEqual(authError.category, .authentication)
        XCTAssertFalse(authError.suggestions.isEmpty)
    }

    // MARK: - Cache Tests

    func testCacheOperations() {
        sdk.clearCache()

        // Test that cache is cleared
        let metrics = sdk.getMetrics()
        XCTAssertEqual(metrics.cache.totalEntries, 0)
    }

    // MARK: - Health Status Tests

    func testHealthStatus() async {
        let healthStatus = await sdk.getHealthStatus()

        XCTAssertNotNil(healthStatus.status)
        XCTAssertFalse(healthStatus.checks.isEmpty)

        // In offline mode, API should be marked as healthy
        XCTAssertTrue(healthStatus.checks["api"] ?? false)
        XCTAssertTrue(healthStatus.checks["cache"] ?? false)
        XCTAssertTrue(healthStatus.checks["offline"] ?? false)
    }

    // MARK: - Metrics Tests

    func testMetrics() {
        let metrics = sdk.getMetrics()

        XCTAssertEqual(metrics.requests.active, 0)
        XCTAssertEqual(metrics.requests.queued, 0)
        XCTAssertFalse(metrics.auth.authenticated)
        XCTAssertEqual(metrics.auth.permissions, 0)
    }

    // MARK: - Event System Tests

    func testEventSystem() {
        var receivedEvents: [SDKEvent] = []

        sdk.on(.auth) { event in
            receivedEvents.append(event)
        }

        // Trigger an event
        let testEvent = SDKEvent(type: .auth, data: ["test": true])
        // Note: This would need to be triggered internally by the SDK

        sdk.off(.auth)

        // After unsubscribing, no more events should be received
    }

    // MARK: - Offline Mode Tests

    func testOfflineMode() {
        XCTAssertTrue(sdk.isOfflineMode)

        sdk.setOfflineMode(false)
        XCTAssertFalse(sdk.isOfflineMode)

        sdk.setOfflineMode(true)
        XCTAssertTrue(sdk.isOfflineMode)
    }
}