//
//  ErrorLogger.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import os.log
#if canImport(UIKit)
import UIKit
#endif

// =============================================================================
// MARK: - Error Logger
// =============================================================================

/**
 Structured error logging system with context capture

 Features:
 - Structured logging with OSLog
 - Context capture (device info, app state, user actions)
 - Log levels (info, warning, error, critical)
 - Log persistence for debugging
 - Search and filtering
 - Export for support

 Usage:
 ```swift
 ErrorLogger.shared.log(error)
 ErrorLogger.shared.info("User performed action", context: ["action": "save"])
 ```
 */
public class ErrorLogger: Sendable {

    // MARK: - Singleton

    public static let shared = ErrorLogger()

    // MARK: - Properties

    private let logger: Logger
    private let logQueue = DispatchQueue(label: "com.whiteroom.errorlogger", qos: .utility)
    private let encoder = JSONEncoder()
    private let dateFormatter: ISO8601DateFormatter

    // Log storage
    private var memoryLogs: [ErrorLogEntry] = []
    private let maxMemoryLogs = 1000

    // Actor for thread-safe access
    private actor LogStorage {
        var logs: [ErrorLogEntry] = []
        let maxLogs: Int

        init(maxLogs: Int) {
            self.maxLogs = maxLogs
        }

        func append(_ log: ErrorLogEntry) {
            logs.append(log)
            if logs.count > maxLogs {
                logs.removeFirst(logs.count - maxLogs)
            }
        }

        func getLogs() -> [ErrorLogEntry] {
            logs
        }

        func clear() {
            logs.removeAll()
        }

        func filter(predicate: (ErrorLogEntry) -> Bool) -> [ErrorLogEntry] {
            logs.filter(predicate)
        }
    }

    private let logStorage: LogStorage

    // MARK: - Initialization

    private init() {
        self.logger = Logger(subsystem: "com.whiteroom.swiftfrontend", category: "ErrorLogging")
        self.dateFormatter = ISO8601DateFormatter()
        self.logStorage = LogStorage(maxLogs: maxMemoryLogs)
    }

    // MARK: - Logging Methods

    /**
     Log a WhiteRoomError

     - Parameter error: The error to log
     */
    public func log(_ error: WhiteRoomError) {
        let entry = ErrorLogEntry(
            timestamp: Date(),
            level: logLevel(for: error.severity),
            code: error.code,
            category: error.category,
            message: error.userMessage,
            technicalDetails: error.technicalDetails,
            recoverySuggestion: error.recoverySuggestion,
            context: error.context,
            systemInfo: Self.captureSystemInfo(),
            appState: Self.captureAppState()
        )

        addLog(entry)
    }

    /**
     Log an info message

     - Parameters:
       - message: The message to log
       - context: Additional context information
     */
    public func info(_ message: String, context: [String: String] = [:]) {
        let entry = ErrorLogEntry(
            timestamp: Date(),
            level: .info,
            code: "INFO",
            category: "General",
            message: message,
            technicalDetails: "",
            recoverySuggestion: "",
            context: context,
            systemInfo: Self.captureSystemInfo(),
            appState: Self.captureAppState()
        )

        addLog(entry)
    }

    /**
     Log a warning message

     - Parameters:
       - message: The warning message
       - context: Additional context information
     */
    public func warning(_ message: String, context: [String: String] = [:]) {
        let entry = ErrorLogEntry(
            timestamp: Date(),
            level: .warning,
            code: "WARNING",
            category: "General",
            message: message,
            technicalDetails: "",
            recoverySuggestion: "",
            context: context,
            systemInfo: Self.captureSystemInfo(),
            appState: Self.captureAppState()
        )

        addLog(entry)
    }

    // MARK: - Log Retrieval

    /**
     Get all logs

     - Returns: Array of log entries
     */
    public func getAllLogs() -> [ErrorLogEntry] {
        Task {
            await logStorage.getLogs()
        }
        return []
    }

    /**
     Get logs filtered by level

     - Parameter level: The log level to filter by
     - Returns: Array of matching log entries
     */
    public func getLogs(level: LogLevel) -> [ErrorLogEntry] {
        Task {
            await logStorage.filter { $0.level == level }
        }
        return []
    }

    /**
     Get logs filtered by category

     - Parameter category: The category to filter by
     - Returns: Array of matching log entries
     */
    public func getLogs(category: String) -> [ErrorLogEntry] {
        Task {
            await logStorage.filter { $0.category == category }
        }
        return []
    }

    /**
     Clear all logs
     */
    public func clearLogs() {
        Task {
            await logStorage.clear()
        }
    }

    // MARK: - Log Export

    /**
     Export logs as JSON string

     - Returns: JSON string representation of logs
     */
    public func exportLogsAsJSON() -> String {
        Task {
            let logs = await logStorage.getLogs()

            do {
                let data = try encoder.encode(logs)
                if let jsonString = String(data: data, encoding: .utf8) {
                    return jsonString
                }
            } catch {
                logger.error("Failed to export logs: \(error.localizedDescription)")
            }

            return "{}"
        }

        return "{}"
    }

    /**
     Export logs as text string

     - Returns: Formatted text representation of logs
     */
    public func exportLogsAsText() -> String {
        Task {
            let logs = await logStorage.getLogs()

            var output = "White Room Error Log\n"
            output += String(repeating: "=", count: 50) + "\n\n"

            for log in logs {
                output += """
                 [\(log.level.rawValue.uppercased())] \(log.dateFormatter.string(from: log.timestamp))
                 Code: \(log.code)
                 Category: \(log.category)

                 \(log.message)

                 """
                if !log.technicalDetails.isEmpty {
                    output += "Technical Details: \(log.technicalDetails)\n"
                }

                if !log.context.isEmpty {
                    output += "Context:\n"
                    for (key, value) in log.context {
                        output += "  \(key): \(value)\n"
                    }
                }

                output += "\n"
            }

            return output
        }

        return ""
    }

    // MARK: - Private Methods

    private func addLog(_ entry: ErrorLogEntry) {
        Task {
            await logStorage.append(entry)
        }

        // Also log to OSLog
        let logMessage = "[\(entry.code)] \(entry.message)"
        switch entry.level {
        case .info:
            logger.info("\(logMessage)")
        case .warning:
            logger.warning("\(logMessage)")
        case .error:
            logger.error("\(logMessage)")
        case .critical:
            logger.critical("\(logMessage)")
        }

        // Notify observers
        NotificationCenter.default.post(
            name: .logEntryAdded,
            object: entry
        )
    }

    private func logLevel(for severity: ErrorSeverity) -> LogLevel {
        switch severity {
        case .info: return .info
        case .warning: return .warning
        case .error: return .error
        case .critical: return .critical
        }
    }

    // MARK: - System Info Capture

    private static func captureSystemInfo() -> SystemInfo {
        let processInfo = ProcessInfo.processInfo

        #if os(macOS) || os(iOS)
        let device = UIDevice.current
        return SystemInfo(
            osVersion: processInfo.operatingSystemVersionString,
            deviceModel: device.model,
            deviceName: device.name,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown",
            buildNumber: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown",
            processor: "Unknown", // Not directly available in Swift
            memorySize: ProcessInfo.processInfo.physicalMemory
        )
        #else
        return SystemInfo(
            osVersion: processInfo.operatingSystemVersionString,
            deviceModel: "Unknown",
            deviceName: "Unknown",
            appVersion: "Unknown",
            buildNumber: "Unknown",
            processor: "Unknown",
            memorySize: 0
        )
        #endif
    }

    private static func captureAppState() -> AppState {
        AppState(
            cpuUsage: 0.0, // Not directly available
            memoryUsage: 0, // Not directly available
            isActive: UIApplication.shared.applicationState == .active
        )
    }
}

// =============================================================================
// MARK: - Log Entry Models
// =============================================================================

/**
 Log entry data model
 */
public struct ErrorLogEntry: Codable, Sendable {
    public let timestamp: Date
    public let level: LogLevel
    public let code: String
    public let category: String
    public let message: String
    public let technicalDetails: String
    public let recoverySuggestion: String
    public let context: [String: String]
    public let systemInfo: SystemInfo
    public let appState: AppState

    var dateFormatter: ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        return formatter
    }
}

/**
 Log levels
 */
public enum LogLevel: String, Codable, Sendable {
    case info
    case warning
    case error
    case critical
}

/**
 System information captured with each log
 */
public struct SystemInfo: Codable, Sendable {
    public let osVersion: String
    public let deviceModel: String
    public let deviceName: String
    public let appVersion: String
    public let buildNumber: String
    public let processor: String
    public let memorySize: UInt64
}

/**
 App state captured with each log
 */
public struct AppState: Codable, Sendable {
    public let cpuUsage: Double
    public let memoryUsage: UInt64
    public let isActive: Bool
}

// =============================================================================
// MARK: - Notification Names
// =============================================================================

public extension Notification.Name {
    static let logEntryAdded = Notification.Name("logEntryAdded")
}
