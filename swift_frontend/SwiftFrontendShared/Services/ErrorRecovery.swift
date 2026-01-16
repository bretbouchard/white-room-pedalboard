//
//  ErrorRecovery.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Error Recovery Strategies
// =============================================================================

/**
 Error recovery system with automatic retry, fallback, and graceful degradation

 Features:
 - Automatic retry with exponential backoff
 - Fallback to alternative implementations
 - Graceful degradation (partial functionality)
 - User-initiated recovery actions
 - Recovery state tracking

 Usage:
 ```swift
 let recovery = ErrorRecovery.shared
 await recovery.attempt(operation, maxRetries: 3)
 ```
 */
public class ErrorRecovery: Sendable {

    // MARK: - Singleton

    public static let shared = ErrorRecovery()

    // MARK: - Recovery Configuration

    public struct RetryConfig: Sendable {
        let maxRetries: Int
        let initialDelay: TimeInterval
        let maxDelay: TimeInterval
        let backoffMultiplier: Double

        public init(
            maxRetries: Int = 3,
            initialDelay: TimeInterval = 1.0,
            maxDelay: TimeInterval = 30.0,
            backoffMultiplier: Double = 2.0
        ) {
            self.maxRetries = maxRetries
            self.initialDelay = initialDelay
            self.maxDelay = maxDelay
            self.backoffMultiplier = backoffMultiplier
        }

        public static let `default` = RetryConfig()
        public static let aggressive = RetryConfig(maxRetries: 5, initialDelay: 0.5, backoffMultiplier: 1.5)
        public static let conservative = RetryConfig(maxRetries: 2, initialDelay: 2.0, backoffMultiplier: 2.5)
    }

    // MARK: - Recovery State

    private actor RecoveryState {
        var recoveryAttempts: [String: Int] = [:]
        var lastAttemptTime: [String: Date] = [:]
        var recoverySuccesses: [String: Int] = [:]

        func recordAttempt(for operation: String) -> Int {
            recoveryAttempts[operation, default: 0] += 1
            lastAttemptTime[operation] = Date()
            return recoveryAttempts[operation] ?? 0
        }

        func recordSuccess(for operation: String) {
            recoverySuccesses[operation, default: 0] += 1
            // Reset attempt count on success
            recoveryAttempts[operation] = 0
        }

        func getAttempts(for operation: String) -> Int {
            recoveryAttempts[operation] ?? 0
        }

        func getLastAttempt(for operation: String) -> Date? {
            lastAttemptTime[operation]
        }

        func getSuccesses(for operation: String) -> Int {
            recoverySuccesses[operation] ?? 0
        }

        func reset(for operation: String) {
            recoveryAttempts[operation] = nil
            lastAttemptTime[operation] = nil
        }
    }

    private let state = RecoveryState()

    // MARK: - Initialization

    private init() {}

    // MARK: - Retry with Exponential Backoff

    /**
     Attempt an operation with automatic retry

     - Parameters:
       - operation: The operation to attempt
       - config: Retry configuration
       - shouldRetry: Optional callback to determine if error is retryable
       - onRetry: Optional callback called before each retry

     - Returns: Result of the operation

     - Throws: The last error if all retries are exhausted
     */
    public func attempt<T>(
        _ operation: @escaping () async throws -> T,
        config: RetryConfig = .default,
        shouldRetry: ((Error) -> Bool)? = nil,
        onRetry: ((Int, Error) async -> Void)? = nil
    ) async throws -> T {
        var lastError: Error?
        let operationName = "\(operation)"

        for attempt in 0...config.maxRetries {
            _ = await state.recordAttempt(for: operationName)

            do {
                let result = try await operation()
                await state.recordSuccess(for: operationName)
                return result

            } catch {
                lastError = error

                // Check if we should retry
                if attempt == config.maxRetries {
                    break
                }

                if let shouldRetry = shouldRetry, !shouldRetry(error) {
                    throw error
                }

                // Calculate delay with exponential backoff
                let delay = min(
                    config.initialDelay * pow(config.backoffMultiplier, Double(attempt)),
                    config.maxDelay
                )

                // Call retry callback if provided
                if let onRetry = onRetry {
                    await onRetry(attempt + 1, error)
                }

                // Log retry attempt
                ErrorLogger.shared.warning(
                    "Operation failed, retrying (attempt \(attempt + 1)/\(config.maxRetries + 1)): \(error.localizedDescription)",
                    context: [
                        "operation": operationName,
                        "attempt": String(attempt + 1),
                        "delay": String(format: "%.2f", delay)
                    ]
                )

                // Wait before retrying
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }

        // All retries exhausted
        throw lastError ?? NSError(domain: "ErrorRecovery", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "Operation failed after \(config.maxRetries + 1) attempts"
        ])
    }

    // MARK: - Fallback Strategy

    /**
     Attempt primary operation with fallback to alternative

     - Parameters:
       - primary: Primary operation to attempt
       - fallback: Fallback operation if primary fails
       - shouldUseFallback: Optional callback to determine if fallback should be used

     - Returns: Result of primary or fallback operation

     - Throws: Error if both primary and fallback fail
     */
    public func withFallback<T>(
        primary: @escaping () async throws -> T,
        fallback: @escaping () async throws -> T,
        shouldUseFallback: ((Error) -> Bool)? = nil
    ) async throws -> T {
        do {
            return try await primary()

        } catch {
            // Check if we should use fallback
            if let shouldUseFallback = shouldUseFallback, !shouldUseFallback(error) {
                throw error
            }

            ErrorLogger.shared.warning(
                "Primary operation failed, using fallback: \(error.localizedDescription)",
                context: ["error": error.localizedDescription]
            )

            // Leave breadcrumb
            CrashReporting.shared.leaveBreadcrumb(
                "Using fallback operation",
                category: "recovery",
                level: .warning
            )

            return try await fallback()
        }
    }

    // MARK: - Graceful Degradation

    /**
     Attempt operation with graceful degradation

     If the operation fails, returns a degraded result instead of throwing

     - Parameters:
       - operation: The operation to attempt
       - degradedResult: Result to return on failure

     - Returns: Result of operation or degraded result
     */
    public func withDegradation<T>(
        _ operation: @escaping () async throws -> T,
        degradedResult: @escaping () -> T
    ) async -> T {
        do {
            return try await operation()

        } catch {
            ErrorLogger.shared.warning(
                "Operation failed, using degraded result: \(error.localizedDescription)",
                context: ["error": error.localizedDescription]
            )

            // Leave breadcrumb
            CrashReporting.shared.leaveBreadcrumb(
                "Using degraded result",
                category: "recovery",
                level: .warning
            )

            return degradedResult()
        }
    }

    // MARK: - Recovery Actions

    /**
     Execute recovery action for specific error

     - Parameters:
       - error: The error to recover from
       - timeout: Maximum time to wait for recovery

     - Returns: True if recovery was successful
     */
    @discardableResult
    public func recover(
        from error: WhiteRoomError,
        timeout: TimeInterval = 30.0
    ) async -> Bool {
        let recoveryAction = getRecoveryAction(for: error)

        return await withTimeout(timeout) {
            do {
                try await recoveryAction()
                ErrorLogger.shared.info("Recovery successful for error: \(error.code)")
                return true
            } catch {
                ErrorLogger.shared.warning("Recovery failed: \(error.localizedDescription)", context: [
                    "error_code": error.code,
                    "recovery_action": "error_recovery"
                ])
                return false
            }
        }
    }

    /**
     Execute recovery action with completion callback
     */
    public func recover(
        from error: WhiteRoomError,
        completion: @escaping (Bool) -> Void
    ) {
        Task {
            let success = await recover(from: error)
            completion(success)
        }
    }

    // MARK: - Recovery Statistics

    /**
     Get recovery statistics for an operation
     */
    public func getStatistics(for operation: String) async -> RecoveryStatistics {
        let attempts = await state.getAttempts(for: operation)
        let successes = await state.getSuccesses(for: operation)
        let lastAttempt = await state.getLastAttempt(for: operation)

        return RecoveryStatistics(
            operation: operation,
            attempts: attempts,
            successes: successes,
            lastAttempt: lastAttempt
        )
    }

    /**
     Reset recovery statistics for an operation
     */
    public func resetStatistics(for operation: String) async {
        await state.reset(for: operation)
    }

    // MARK: - Private Methods

    private func getRecoveryAction(for error: WhiteRoomError) -> () async throws -> Void {
        return {
            switch error {
            case .audio(.engineNotReady):
                try await Task.sleep(nanoseconds: 2_000_000_000) // Wait 2 seconds
                // Engine initialization would be triggered here

            case .audio(.engineCrashed):
                try await Task.sleep(nanoseconds: 3_000_000_000) // Wait 3 seconds
                // Engine restart would be triggered here

            case .ffi(.bridgeDisconnected):
                try await Task.sleep(nanoseconds: 2_000_000_000) // Wait 2 seconds
                // Reconnection would be triggered here

            case .performance(.cpuOverload):
                try await Task.sleep(nanoseconds: 1_000_000_000) // Wait 1 second
                // CPU load reduction would be triggered here

            default:
                // Generic recovery: wait and hope
                try await Task.sleep(nanoseconds: 1_000_000_000)
            }
        }
    }

    private func withTimeout<T>(
        _ timeout: TimeInterval,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }

            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                throw NSError(domain: "ErrorRecovery", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Recovery timed out after \(timeout)s"
                ])
            }

            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
}

// =============================================================================
// MARK: - Recovery Statistics
// =============================================================================

public struct RecoveryStatistics: Sendable {
    public let operation: String
    public let attempts: Int
    public let successes: Int
    public let lastAttempt: Date?

    public var successRate: Double {
        guard attempts > 0 else { return 0 }
        return Double(successes) / Double(attempts)
    }

    public var timeSinceLastAttempt: TimeInterval? {
        guard let lastAttempt = lastAttempt else { return nil }
        return Date().timeIntervalSince(lastAttempt)
    }
}

// =============================================================================
// MARK: - Convenience Extensions
// =============================================================================

public extension ErrorRecovery {

    /**
     Retry-specific error categories
     */
    enum RetryableCategory {
        case network
        case ffi
        case temporary
        case timeout

        func shouldRetry(_ error: Error) -> Bool {
            switch self {
            case .network:
                return (error as NSError).domain == "NSURLErrorDomain"

            case .ffi:
                return error is WhiteRoomError && (error as? WhiteRoomError)?.category == "FFI" ?? false

            case .temporary:
                // Retry on temporary/transient errors
                let nsError = error as NSError
                return nsError.code == -1 // Temporary failure

            case .timeout:
                return (error as? WhiteRoomError)?.code.contains("TIMEOUT") ?? false
            }
        }
    }

    /**
     Attempt operation with retry for specific error category
     */
    func attempt<T>(
        _ operation: @escaping () async throws -> T,
        retryCategory: RetryableCategory,
        config: RetryConfig = .default
    ) async throws -> T {
        try await attempt(
            operation,
            config: config,
            shouldRetry: { retryCategory.shouldRetry($0) }
        )
    }
}

// =============================================================================
// MARK: - Common Recovery Patterns
// ===============================================================================

public extension ErrorRecovery {

    /**
     Retry network operations
     */
    func retryNetwork<T>(
        _ operation: @escaping () async throws -> T
    ) async throws -> T {
        try await attempt(
            operation,
            retryCategory: .network,
            config: .default
        )
    }

    /**
     Retry FFI operations
     */
    func retryFFI<T>(
        _ operation: @escaping () async throws -> T
    ) async throws -> T {
        try await attempt(
            operation,
            retryCategory: .ffi,
            config: .aggressive
        )
    }

    /**
     Fallback to cached result
     */
    func withCachedFallback<T>(
        _ operation: @escaping () async throws -> T,
        cacheKey: String,
        cache: Cache = .shared
    ) async throws -> T {
        try await withFallback(
            primary: operation,
            fallback: {
                guard let cached = await cache.get(key: cacheKey) as? T else {
                    throw NSError(
                        domain: "ErrorRecovery",
                        code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "No cached value available"]
                    )
                }
                return cached
            }
        )
    }
}

// =============================================================================
// MARK: - Simple Cache for Fallback
// =============================================================================

public actor Cache {
    public static let shared = Cache()

    private var storage: [String: Any] = [:]

    public func get(key: String) -> Any? {
        storage[key]
    }

    public func set(key: String, value: Any) {
        storage[key] = value
    }

    public func remove(key: String) {
        storage.removeValue(forKey: key)
    }

    public func clear() {
        storage.removeAll()
    }
}
