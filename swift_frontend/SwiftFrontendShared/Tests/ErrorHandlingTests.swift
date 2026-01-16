//
//  ErrorHandlingTests.swift
//  SwiftFrontendSharedTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendShared

// =============================================================================
// MARK: - White Room Error Tests
// =============================================================================

final class WhiteRoomErrorTests: XCTestCase {

    // MARK: - Audio Error Tests

    func testAudioErrorUserMessages() {
        let engineNotReady = WhiteRoomError.audio(.engineNotReady)
        XCTAssertEqual(engineNotReady.code, "AUDIO_001")
        XCTAssertEqual(engineNotReady.severity, .warning)
        XCTAssertTrue(engineNotReady.userMessage.contains("not ready"))

        let engineCrashed = WhiteRoomError.audio(.engineCrashed(reason: "Segmentation fault"))
        XCTAssertEqual(engineCrashed.code, "AUDIO_002")
        XCTAssertEqual(engineCrashed.severity, .critical)
        XCTAssertTrue(engineCrashed.userMessage.contains("crashed"))

        let dropout = WhiteRoomError.audio(.dropoutDetected(count: 5, duration: 2.5))
        XCTAssertEqual(dropout.code, "AUDIO_003")
        XCTAssertEqual(dropout.severity, .error)
        XCTAssertTrue(dropout.userMessage.contains("5"))
        XCTAssertTrue(dropout.userMessage.contains("2.5"))

        let xrun = WhiteRoomError.audio(.xrunDetected(count: 10))
        XCTAssertEqual(xrun.code, "AUDIO_004")
        XCTAssertEqual(xrun.severity, .warning)
        XCTAssertTrue(xrun.userMessage.contains("10"))
        XCTAssertTrue(xrun.userMessage.contains("xrun"))
    }

    func testAudioErrorRecoverySuggestions() {
        let engineNotReady = WhiteRoomError.audio(.engineNotReady)
        XCTAssertFalse(engineNotReady.recoverySuggestion.isEmpty)
        XCTAssertTrue(engineNotReady.recoverySuggestion.contains("Wait"))

        let xrun = WhiteRoomError.audio(.xrunDetected(count: 10))
        XCTAssertTrue(xrun.recoverySuggestion.contains("buffer size"))
        XCTAssertTrue(xrun.recoverySuggestion.contains("close other applications"))
    }

    // MARK: - FFI Error Tests

    func testFFIErrorCodes() {
        let notInitialized = WhiteRoomError.ffi(.notInitialized)
        XCTAssertEqual(notInitialized.code, "FFI_001")
        XCTAssertEqual(notInitialized.severity, .error)

        let timeout = WhiteRoomError.ffi(.timeout(function: "test_func", timeoutMs: 5000))
        XCTAssertEqual(timeout.code, "FFI_004")
        XCTAssertEqual(timeout.severity, .warning)
        XCTAssertTrue(timeout.userMessage.contains("5000ms"))

        let bridgeDisconnected = WhiteRoomError.ffi(.bridgeDisconnected)
        XCTAssertEqual(bridgeDisconnected.code, "FFI_007")
        XCTAssertEqual(bridgeDisconnected.severity, .critical)
    }

    func testFFIErrorContext() {
        let timeout = WhiteRoomError.ffi(.timeout(function: "sch_engine_set_performance_blend", timeoutMs: 5000))
        XCTAssertEqual(timeout.context["function"], "sch_engine_set_performance_blend")
        XCTAssertEqual(timeout.context["timeoutMs"], "5000")

        let versionMismatch = WhiteRoomError.ffi(.versionMismatch(expected: "1.0", actual: "0.9"))
        XCTAssertEqual(versionMismatch.context["expected"], "1.0")
        XCTAssertEqual(versionMismatch.context["actual"], "0.9")
    }

    // MARK: - File I/O Error Tests

    func testFileIOErrorMessages() {
        let notFound = WhiteRoomError.fileIO(.fileNotFound(path: "/path/to/file.wrs"))
        XCTAssertEqual(notFound.code, "FILE_001")
        XCTAssertTrue(notFound.userMessage.contains("/path/to/file.wrs"))

        let corrupted = WhiteRoomError.fileIO(.corruptedFile(path: "/path/to/file.wrs", reason: "Invalid header"))
        XCTAssertEqual(corrupted.code, "FILE_002")
        XCTAssertTrue(corrupted.userMessage.contains("corrupted"))

        let diskFull = WhiteRoomError.fileIO(.diskFull)
        XCTAssertEqual(diskFull.code, "FILE_005")
        XCTAssertEqual(diskFull.severity, .critical)
        XCTAssertTrue(diskFull.userMessage.contains("Disk"))
    }

    func testFileIOErrorRecovery() {
        let notFound = WhiteRoomError.fileIO(.fileNotFound(path: "/path/to/file.wrs"))
        XCTAssertTrue(notFound.recoverySuggestion.contains("exists"))
        XCTAssertTrue(notFound.recoverySuggestion.contains("path"))

        let incompatibleVersion = WhiteRoomError.fileIO(.incompatibleVersion(version: "2.0", supported: "1.0"))
        XCTAssertTrue(incompatibleVersion.recoverySuggestion.contains("Update"))
    }

    // MARK: - Schillinger Error Tests

    func testSchillingerErrorValidation() {
        let invalidGenerator = WhiteRoomError.schillinger(.invalidGenerator(period: 17, validRange: 1...16))
        XCTAssertEqual(invalidGenerator.code, "SCHILL_001")
        XCTAssertTrue(invalidGenerator.userMessage.contains("17"))
        XCTAssertTrue(invalidGenerator.userMessage.contains("1"))
        XCTAssertTrue(invalidGenerator.userMessage.contains("16"))

        let insufficientGenerators = WhiteRoomError.schillinger(.insufficientGenerators(actual: 2, minimum: 3))
        XCTAssertEqual(insufficientGenerators.code, "SCHILL_002")
        XCTAssertTrue(insufficientGenerators.userMessage.contains("2"))
        XCTAssertTrue(insufficientGenerators.userMessage.contains("3"))

        let harmonyViolation = WhiteRoomError.schillinger(.harmonyViolation(reason: "Parallel fifths"))
        XCTAssertEqual(harmonyViolation.code, "SCHILL_005")
        XCTAssertEqual(harmonyViolation.severity, .warning)
    }

    // MARK: - Performance Error Tests

    func testPerformanceErrorSeverity() {
        let cpuOverload = WhiteRoomError.performance(.cpuOverload(usage: 0.95, threshold: 0.80))
        XCTAssertEqual(cpuOverload.code, "PERF_001")
        XCTAssertEqual(cpuOverload.severity, .warning)
        XCTAssertTrue(cpuOverload.userMessage.contains("95%"))
        XCTAssertTrue(cpuOverload.userMessage.contains("80%"))

        let memoryLimit = WhiteRoomError.performance(.memoryLimitExceeded(used: 1024 * 1024 * 1024, limit: 512 * 1024 * 1024))
        XCTAssertEqual(memoryLimit.code, "PERF_002")
        XCTAssertEqual(memoryLimit.severity, .error)
        XCTAssertTrue(memoryLimit.userMessage.contains("1024"))
        XCTAssertTrue(memoryLimit.userMessage.contains("512"))
    }

    // MARK: - Error Codable Tests

    func testErrorEncodingDecoding() {
        let originalError = WhiteRoomError.audio(.engineCrashed(reason: "Test crash"))

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        do {
            let jsonData = try encoder.encode(originalError)
            let decodedError = try decoder.decode(WhiteRoomError.self, from: jsonData)

            XCTAssertEqual(originalError.code, decodedError.code)
            XCTAssertEqual(originalError.severity, decodedError.severity)
            XCTAssertEqual(originalError.userMessage, decodedError.userMessage)
            XCTAssertEqual(originalError.technicalDetails, decodedError.technicalDetails)
        } catch {
            XCTFail("Failed to encode/decode error: \(error)")
        }
    }

    func testAllErrorTypesCodable() {
        let errors: [WhiteRoomError] = [
            .audio(.engineNotReady),
            .ffi(.notInitialized),
            .fileIO(.fileNotFound(path: "/test")),
            .schillinger(.invalidGenerator(period: 17, validRange: 1...16)),
            .performance(.cpuOverload(usage: 0.95, threshold: 0.80)),
            .validation(.invalidSchema(reason: "Test")),
            .configuration(.invalidConfig(section: "audio", reason: "Test"))
        ]

        for error in errors {
            let encoder = JSONEncoder()
            let decoder = JSONDecoder()

            do {
                let jsonData = try encoder.encode(error)
                let decodedError = try decoder.decode(WhiteRoomError.self, from: jsonData)
                XCTAssertEqual(error.code, decodedError.code)
            } catch {
                XCTFail("Failed to encode/decode error: \(error.code) - \(error)")
            }
        }
    }
}

// =============================================================================
// MARK: - Error Logger Tests
// =============================================================================

final class ErrorLoggerTests: XCTestCase {

    func testLogError() {
        let logger = ErrorLogger.shared
        let error = WhiteRoomError.audio(.engineNotReady)

        // This should not throw
        logger.log(error)

        // Verify log was added
        let logs = logger.getAllLogs()
        XCTAssertTrue(logs.contains { $0.code == "AUDIO_001" })
    }

    func testLogInfo() {
        let logger = ErrorLogger.shared
        logger.info("Test info message", context: ["key": "value"])

        let logs = logger.getAllLogs()
        XCTAssertTrue(logs.contains { $0.message == "Test info message" })
    }

    func testLogWarning() {
        let logger = ErrorLogger.shared
        logger.warning("Test warning message")

        let logs = logger.getAllLogs()
        XCTAssertTrue(logs.contains { $0.message == "Test warning message" })
    }

    func testLogExport() {
        let logger = ErrorLogger.shared
        logger.info("Test export message")

        let jsonExport = logger.exportLogsAsJSON()
        XCTAssertFalse(jsonExport.isEmpty)

        let textExport = logger.exportLogsAsText()
        XCTAssertTrue(textExport.contains("White Room Error Log"))
    }

    func testClearLogs() {
        let logger = ErrorLogger.shared
        logger.info("Test clear message")
        logger.clearLogs()

        let logs = logger.getAllLogs()
        XCTAssertEqual(logs.count, 0)
    }
}

// =============================================================================
// MARK: - Error Recovery Tests
// =============================================================================

final class ErrorRecoveryTests: XCTestCase {

    func testSuccessfulRetry() async throws {
        let recovery = ErrorRecovery.shared
        var attemptCount = 0

        let result: String = try await recovery.attempt(
            {
                attemptCount += 1
                if attemptCount < 3 {
                    throw NSError(domain: "Test", code: -1)
                }
                return "Success"
            },
            config: .default
        )

        XCTAssertEqual(result, "Success")
        XCTAssertEqual(attemptCount, 3)
    }

    func testFailedRetry() async {
        let recovery = ErrorRecovery.shared

        do {
            _ = try await recovery.attempt(
                {
                    throw NSError(domain: "Test", code: -1)
                },
                config: RetryConfig(maxRetries: 2)
            )
            XCTFail("Should have thrown error")
        } catch {
            // Expected
        }
    }

    func testFallback() async throws {
        let recovery = ErrorRecovery.shared
        var primaryCalled = false
        var fallbackCalled = false

        let result: String = try await recovery.withFallback(
            primary: {
                primaryCalled = true
                throw NSError(domain: "Test", code: -1)
            },
            fallback: {
                fallbackCalled = true
                return "Fallback"
            }
        )

        XCTAssertTrue(primaryCalled)
        XCTAssertTrue(fallbackCalled)
        XCTAssertEqual(result, "Fallback")
    }

    func testNoFallbackOnSuccess() async throws {
        let recovery = ErrorRecovery.shared
        var fallbackCalled = false

        let result: String = try await recovery.withFallback(
            primary: {
                return "Primary"
            },
            fallback: {
                fallbackCalled = true
                return "Fallback"
            }
        )

        XCTAssertFalse(fallbackCalled)
        XCTAssertEqual(result, "Primary")
    }

    func testDegradation() async {
        let recovery = ErrorRecovery.shared

        let result = await recovery.withDegradation(
            {
                throw NSError(domain: "Test", code: -1)
            },
            degradedResult: {
                return "Degraded"
            }
        )

        XCTAssertEqual(result, "Degraded")
    }

    func testRecoveryStatistics() async throws {
        let recovery = ErrorRecovery.shared

        // Perform some operations
        for _ in 0..<5 {
            try? await recovery.attempt(
                {
                    throw NSError(domain: "Test", code: -1)
                },
                config: RetryConfig(maxRetries: 0)
            )
        }

        let stats = await recovery.getStatistics(for: "test operation")
        XCTAssertEqual(stats.attempts, 5)
        XCTAssertEqual(stats.successes, 0)
        XCTAssertEqual(stats.successRate, 0.0)

        // Reset statistics
        await recovery.resetStatistics(for: "test operation")
        let resetStats = await recovery.getStatistics(for: "test operation")
        XCTAssertEqual(resetStats.attempts, 0)
    }
}

// =============================================================================
// MARK: - Crash Reporting Tests
// =============================================================================

final class CrashReportingTests: XCTestCase {

    func testRecordError() {
        let crashReporting = CrashReporting.shared
        let error = WhiteRoomError.audio(.engineNotReady)

        // This should not throw
        crashReporting.record(error)
    }

    func testBreadcrumbs() {
        let crashReporting = CrashReporting.shared

        crashReporting.leaveBreadcrumb("Test breadcrumb", category: "test", level: .info)
        crashReporting.trackUserAction("saved_project", details: ["project": "test"])
        crashReporting.trackNavigation("screen_main", from: "screen_login")
        crashReporting.trackHTTPRequest("https://api.example.com/test", method: "GET", statusCode: 200)

        // All should complete without throwing
    }

    func testUserContext() {
        let crashReporting = CrashReporting.shared

        crashReporting.setUser(identifier: "user-123", email: "test@example.com", name: "Test User")

        // Update user
        crashReporting.setUser(identifier: "user-456")

        // Clear user
        crashReporting.clearUser()

        // All should complete without throwing
    }

    func testCustomContext() {
        let crashReporting = CrashReporting.shared

        crashReporting.setCustomValue("value", forKey: "key")

        // Should complete without throwing
    }
}
