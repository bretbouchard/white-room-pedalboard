//
//  CrashReporting.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Crash Reporting Service
// =============================================================================

/**
 Crash reporting integration service

 Supports multiple crash reporting backends:
 - Firebase Crashlytics
 - Sentry

 Features:
 - Automatic crash reporting
 - Custom error recording
 - Breadcrumbs (user actions leading to error)
 - User identification
 - Context attachment (device info, app state)

 Usage:
 ```swift
 CrashReporting.shared.recordError(error)
 CrashReporting.shared.leaveBreadcrumb("User saved project")
 CrashReporting.shared.setUser(identifier: "user-123")
 ```
 */
public class CrashReporting: Sendable {

    // MARK: - Singleton

    public static let shared = CrashReporting()

    // MARK: - Properties

    private let enabled: Bool
    private let backend: CrashReportingBackend

    // User context
    private var currentUserId: String?
    private var currentUserEmail: String?
    private var currentUserName: String?

    // Breadcrumbs
    private actor BreadcrumbStorage {
        var breadcrumbs: [Breadcrumb] = []
        let maxBreadcrumbs: Int

        init(maxBreadcrumbs: Int = 100) {
            self.maxBreadcrumbs = maxBreadcrumbs
        }

        func append(_ breadcrumb: Breadcrumb) {
            breadcrumbs.append(breadcrumb)
            if breadcrumbs.count > maxBreadcrumbs {
                breadcrumbs.removeFirst(breadcrumbs.count - maxBreadcrumbs)
            }
        }

        func getBreadcrumbs() -> [Breadcrumb] {
            breadcrumbs
        }

        func clear() {
            breadcrumbs.removeAll()
        }
    }

    private let breadcrumbStorage: BreadcrumbStorage

    // MARK: - Initialization

    private init() {
        // Determine which backend to use
        #if canImport(FirebaseCrashlytics)
        self.backend = FirebaseCrashlyticsBackend()
        self.enabled = true
        #elseif canImport(Sentry)
        self.backend = SentryBackend()
        self.enabled = true
        #else
        self.backend = NoOpBackend()
        self.enabled = false
        #endif

        self.breadcrumbStorage = BreadcrumbStorage()

        // Setup crash reporting
        setup()
    }

    // MARK: - Setup

    private func setup() {
        guard enabled else { return }

        // Initialize backend
        backend.setup()

        // Setup global exception handler
        setupExceptionHandler()

        // Setup signal handlers for crashes
        setupSignalHandlers()
    }

    private func setupExceptionHandler() {
        NSSetUncaughtExceptionHandler { exception in
            Task { @MainActor in
                CrashReporting.shared.recordException(
                    exception,
                    fatalError: true
                )
            }
        }
    }

    private func setupSignalHandlers() {
        // Setup signal handlers for fatal signals
        let signals = [SIGABRT, SIGILL, SIGSEGV, SIGFPE, SIGBUS, SIGPIPE]

        for signalId in signals {
            _ = signal(signalId) { sig in
                let signalName = self.signalToString(sig)
                Task { @MainActor in
                    CrashReporting.shared.recordFatalSignal(
                        name: signalName,
                        signal: sig
                    )
                }
                // Restore default signal handler and re-raise
                signal(sig, SIG_DFL)
                raise(sig)
            }
        }
    }

    // MARK: - Public Methods

    /**
     Record a non-fatal error

     - Parameters:
       - error: The error to record
       - context: Additional context information
     */
    public func recordError(
        _ error: Error,
        context: [String: Any] = [:]
    ) {
        guard enabled else { return }

        Task {
            var augmentedContext = context

            // Add breadcrumbs to context
            if let breadcrumbsData = try? await self.getBreadcrumbsData() {
                augmentedContext["breadcrumbs"] = breadcrumbsData
            }

            self.backend.recordError(
                error,
                context: augmentedContext
            )
        }
    }

    /**
     Record an exception

     - Parameters:
       - exception: The exception to record
       - fatalError: Whether this is a fatal exception
     */
    public func recordException(
        _ exception: NSException,
        fatalError: Bool = false
    ) {
        guard enabled else { return }

        Task {
            self.backend.recordException(
                exception,
                context: [:],
                fatalError: fatalError
            )
        }
    }

    /**
     Record a fatal signal

     - Parameters:
       - name: Signal name
       - signal: Signal number
     */
    public func recordFatalSignal(
        name: String,
        signal: Int32
    ) {
        guard enabled else { return }

        Task {
            var context: [String: Any] = [
                "signal_name": name,
                "signal_number": signal
            ]

            // Add breadcrumbs
            if let breadcrumbsData = try? await self.getBreadcrumbsData() {
                context["breadcrumbs"] = breadcrumbsData
            }

            self.backend.recordError(
                NSError(
                    domain: "com.whiteroom.fatal",
                    code: Int(signal),
                    userInfo: [NSLocalizedDescriptionKey: "Fatal signal: \(name)"]
                ),
                context: context
            )
        }
    }

    /**
     Leave a breadcrumb for context

     - Parameters:
       - message: Breadcrumb message
       - category: Breadcrumb category (user, navigation, http, etc.)
       - level: Breadcrumb level (info, warning, error)
       - data: Additional data
     */
    public func leaveBreadcrumb(
        _ message: String,
        category: String = "user",
        level: BreadcrumbLevel = .info,
        data: [String: String] = [:]
    ) {
        Task {
            let breadcrumb = Breadcrumb(
                timestamp: Date(),
                message: message,
                category: category,
                level: level,
                data: data
            )

            await breadcrumbStorage.append(breadcrumb)

            // Also add to backend if supported
            if enabled {
                self.backend.addBreadcrumb(message, category: category, level: level.rawValue, data: data)
            }
        }
    }

    /**
     Set user information for crash reports

     - Parameters:
       - identifier: Unique user identifier
       - email: User email (optional)
       - name: User name (optional)
     */
    public func setUser(
        identifier: String,
        email: String? = nil,
        name: String? = nil
    ) {
        self.currentUserId = identifier
        self.currentUserEmail = email
        self.currentUserName = name

        guard enabled else { return }

        backend.setUser(
            identifier: identifier,
            email: email,
            name: name
        )
    }

    /**
     Clear user information
     */
    public func clearUser() {
        self.currentUserId = nil
        self.currentUserEmail = nil
        self.currentUserName = nil

        guard enabled else { return }

        backend.clearUser()
    }

    /**
     Set custom key-value context

     - Parameters:
       - key: Context key
       - value: Context value
     */
    public func setCustomValue(_ value: Any, forKey key: String) {
        guard enabled else { return }

        backend.setCustomValue(value, forKey: key)
    }

    // MARK: - Private Methods

    private func getBreadcrumbsData() async throws -> [String: Any] {
        let breadcrumbs = await breadcrumbStorage.getBreadcrumbs()

        return [
            "count": breadcrumbs.count,
            "recent": breadcrumbs.suffix(10).map { breadcrumb in
                [
                    "timestamp": ISO8601DateFormatter().string(from: breadcrumb.timestamp),
                    "message": breadcrumb.message,
                    "category": breadcrumb.category,
                    "level": breadcrumb.level.rawValue,
                    "data": breadcrumb.data
                ]
            }
        ]
    }

    private func signalToString(_ signal: Int32) -> String {
        switch signal {
        case SIGABRT: return "SIGABRT"
        case SIGILL: return "SIGILL"
        case SIGSEGV: return "SIGSEGV"
        case SIGFPE: return "SIGFPE"
        case SIGBUS: return "SIGBUS"
        case SIGPIPE: return "SIGPIPE"
        default: return "SIGUNKNOWN"
        }
    }
}

// =============================================================================
// MARK: - Crash Reporting Backend Protocol
// =============================================================================

protocol CrashReportingBackend {
    func setup()
    func recordError(_ error: Error, context: [String: Any])
    func recordException(_ exception: NSException, context: [String: Any], fatalError: Bool)
    func addBreadcrumb(_ message: String, category: String, level: String, data: [String: String])
    func setUser(identifier: String, email: String?, name: String?)
    func clearUser()
    func setCustomValue(_ value: Any, forKey key: String)
}

// =============================================================================
// MARK: - No-Op Backend (Fallback)
// =============================================================================

final class NoOpBackend: CrashReportingBackend {
    func setup() {}
    func recordError(_ error: Error, context: [String: Any]) {}
    func recordException(_ exception: NSException, context: [String: Any], fatalError: Bool) {}
    func addBreadcrumb(_ message: String, category: String, level: String, data: [String: String]) {}
    func setUser(identifier: String, email: String?, name: String?) {}
    func clearUser() {}
    func setCustomValue(_ value: Any, forKey key: String) {}
}

// =============================================================================
// MARK: - Firebase Crashlytics Backend
// =============================================================================

#if canImport(FirebaseCrashlytics)
import FirebaseCrashlytics

final class FirebaseCrashlyticsBackend: CrashReportingBackend {
    private let crashlytics = Crashlytics.crashlytics()

    func setup() {
        // Firebase is configured separately
    }

    func recordError(_ error: Error, context: [String: Any]) {
        crashlytics.record(error: error)

        // Add custom keys
        for (key, value) in context {
            crashlytics.setCustomValue(value, forKey: key)
        }
    }

    func recordException(_ exception: NSException, context: [String: Any], fatalError: Bool) {
        crashlytics.record(exceptionModel: ExceptionModel(
            name: exception.name.rawValue,
            reason: exception.reason
        ))

        if fatalError {
            crashlytics.crash()
        }
    }

    func addBreadcrumb(_ message: String, category: String, level: String, data: [String: String]) {
        crashlytics.log("\(category): \(message)")
    }

    func setUser(identifier: String, email: String?, name: String?) {
        crashlytics.setUserID(identifier)
    }

    func clearUser() {
        // Not directly supported in Crashlytics
    }

    func setCustomValue(_ value: Any, forKey key: String) {
        crashlytics.setCustomValue(value, forKey: key)
    }
}
#endif

// =============================================================================
// MARK: - Sentry Backend
// =============================================================================

#if canImport(Sentry)
import Sentry

final class SentryBackend: CrashReportingBackend {
    func setup() {
        // Sentry is configured separately
    }

    func recordError(_ error: Error, context: [String: Any]) {
        SentrySDK.capture(error: error) { scope in
            for (key, value) in context {
                scope.setExtra(value: value, key: key)
            }
            return scope
        }
    }

    func recordException(_ exception: NSException, context: [String: Any], fatalError: Bool) {
        SentrySDK.capture(exception: exception) { scope in
            for (key, value) in context {
                scope.setExtra(value: value, key: key)
            }
            return scope
        }

        if fatalError {
            fatalError("Fatal exception: \(exception.name)")
        }
    }

    func addBreadcrumb(_ message: String, category: String, level: String, data: [String: String]) {
        let breadcrumb = Breadcrumb(
            level: SentryLevel(rawValue: level) ?? .info,
            category: category
        )
        breadcrumb.message = message
        breadcrumb.data = data

        SentrySDK.addBreadcrumb(breadcrumb)
    }

    func setUser(identifier: String, email: String?, name: String?) {
        let user = User(userId: identifier)
        user.email = email
        user.username = name
        SentrySDK.setUser(user)
    }

    func clearUser() {
        SentrySDK.setUser(nil)
    }

    func setCustomValue(_ value: Any, forKey key: String) {
        SentrySDK.configureScope { scope in
            scope.setExtra(value: value, key: key)
        }
    }
}
#endif

// =============================================================================
// MARK: - Breadcrumb Models
// =============================================================================

/**
 Breadcrumb data model
 */
public struct Breadcrumb: Codable, Sendable {
    public let timestamp: Date
    public let message: String
    public let category: String
    public let level: BreadcrumbLevel
    public let data: [String: String]
}

/**
 Breadcrumb levels
 */
public enum BreadcrumbLevel: String, Codable {
    case debug
    case info
    case warning
    case error
}

// =============================================================================
// MARK: - Convenience Extensions
// =============================================================================

public extension CrashReporting {

    /**
     Record a WhiteRoomError with automatic context extraction
     */
    func record(_ error: WhiteRoomError) {
        var context: [String: Any] = [
            "code": error.code,
            "category": error.category,
            "severity": error.severity.rawValue
        ]

        // Add error context
        for (key, value) in error.context {
            context["context_\(key)"] = value
        }

        recordError(error, context: context)
    }

    /**
     Leave a breadcrumb for user action
     */
    func trackUserAction(_ action: String, details: [String: String] = [:]) {
        leaveBreadcrumb(
            "User action: \(action)",
            category: "user",
            level: .info,
            data: details
        )
    }

    /**
     Leave a breadcrumb for navigation
     */
    func trackNavigation(_ screen: String, from: String? = nil) {
        var data = ["screen": screen]
        if let from = from {
            data["from"] = from
        }

        leaveBreadcrumb(
            "Navigated to \(screen)",
            category: "navigation",
            level: .info,
            data: data
        )
    }

    /**
     Leave a breadcrumb for HTTP request
     */
    func trackHTTPRequest(_ url: String, method: String, statusCode: Int) {
        leaveBreadcrumb(
            "HTTP \(method) \(url)",
            category: "http",
            level: statusCode >= 400 ? .error : .info,
            data: [
                "url": url,
                "method": method,
                "status_code": String(statusCode)
            ]
        )
    }
}
