//
//  WhiteRoomErrorHandler.swift
//  White Room
//
//  Comprehensive error handling system with user-friendly messaging,
//  recovery actions, and integration with SwiftUI.
//

import Foundation
import SwiftUI
import os.log

/// Error severity levels
enum ErrorSeverity: String, Codable {
    case debug       // Information only
    case info        // User notification
    case warning     // Potential issue
    case error       // Operation failed
    case critical    // App may crash
    case fatal       // App must terminate

    var color: Color {
        switch self {
        case .debug: return .blue
        case .info: return .cyan
        case .warning: return .yellow
        case .error: return .orange
        case .critical: return .red
        case .fatal: return .red.opacity(0.8)
        }
    }

    var icon: String {
        switch self {
        case .debug: return "info.circle"
        case .info: return "info.circle.fill"
        case .warning: return "exclamationmark.triangle"
        case .error: return "xmark.circle"
        case .critical: return "exclamationmark.octagon.fill"
        case .fatal: return "xmark.octagon.fill"
        }
    }
}

/// Error categories
enum ErrorCategory: String, Codable {
    case audioEngine = "audio_engine"
    case audioDevice = "audio_device"
    case audioBuffer = "audio_buffer"
    case fileNotFound = "file_not_found"
    case fileCorrupted = "file_corrupted"
    case filePermission = "file_permission"
    case networkError = "network_error"
    case timeout = "timeout"
    case validationError = "validation_error"
    case invalidParameter = "invalid_parameter"
    case invalidState = "invalid_state"
    case notInitialized = "not_initialized"
    case outOfMemory = "out_of_memory"
    case diskFull = "disk_full"
    case userCancelled = "user_cancelled"
    case userError = "user_error"
}

/// Recovery action for error resolution
struct RecoveryAction: Identifiable {
    let id = UUID()
    let title: String
    let description: String?
    let isAutomatic: Bool
    let isRecommended: Bool
    let action: () async -> Void

    init(
        title: String,
        description: String? = nil,
        isAutomatic: Bool = false,
        isRecommended: Bool = false,
        action: @escaping () async -> Void
    ) {
        self.title = title
        self.description = description
        self.isAutomatic = isAutomatic
        self.isRecommended = isRecommended
        self.action = action
    }
}

/// White Room error base class
struct WhiteRoomError: Error, Identifiable {
    let id = UUID()
    let category: ErrorCategory
    let severity: ErrorSeverity
    let code: String
    let userMessage: String
    let technicalDetails: String
    let context: [String: Any]
    let recoveryActions: [RecoveryAction]
    let timestamp: Date

    init(
        category: ErrorCategory,
        severity: ErrorSeverity,
        code: String,
        userMessage: String,
        technicalDetails: String? = nil,
        context: [String: Any] = [:],
        recoveryActions: [RecoveryAction] = []
    ) {
        self.category = category
        self.severity = severity
        self.code = code
        self.userMessage = userMessage
        self.technicalDetails = technicalDetails ?? userMessage
        self.context = context
        self.recoveryActions = recoveryActions
        self.timestamp = Date()
    }

    /// Get recommended recovery action
    var recommendedRecovery: RecoveryAction? {
        recoveryActions.first { $0.isRecommended }
    }

    /// Get automatic recovery actions
    var automaticRecoveries: [RecoveryAction] {
        recoveryActions.filter { $0.isAutomatic }
    }
}

/// Specific error types
struct AudioEngineError {
    static func create(
        code: String,
        userMessage: String,
        technicalDetails: String? = nil,
        context: [String: Any] = [:]
    ) -> WhiteRoomError {
        WhiteRoomError(
            category: .audioEngine,
            severity: .critical,
            code: "AUDIO_ENGINE_\(code)",
            userMessage: userMessage,
            technicalDetails: technicalDetails,
            context: context,
            recoveryActions: [
                RecoveryAction(
                    title: "Restart Audio Engine",
                    description: "Attempt to restart the audio engine",
                    isRecommended: true
                ) {
                    // Trigger engine restart
                    await AudioManager.shared.restartEngine()
                },
                RecoveryAction(
                    title: "Reset Audio Settings",
                    description: "Reset audio settings to defaults"
                ) {
                    // Reset to defaults
                    await AudioManager.shared.resetSettings()
                }
            ]
        )
    }
}

struct FileNotFoundError {
    static func create(path: String, context: [String: Any] = [:]) -> WhiteRoomError {
        WhiteRoomError(
            category: .fileNotFound,
            severity: .error,
            code: "FILE_NOT_FOUND",
            userMessage: "The file \"\(path)\" could not be found.",
            technicalDetails: "File not found: \(path)",
            context: ["path": path, merging: context],
            recoveryActions: [
                RecoveryAction(
                    title: "Browse for File",
                    description: "Locate the file manually",
                    isRecommended: true
                ) {
                    // Open file browser
                    await FileManager.shared.browseForFile()
                },
                RecoveryAction(
                    title: "Create New File",
                    description: "Create a new file with default settings"
                ) {
                    // Create new file
                    await FileManager.shared.createNewFile()
                }
            ]
        )
    }
}

struct ValidationError {
    static func create(
        field: String,
        value: Any,
        reason: String,
        context: [String: Any] = [:]
    ) -> WhiteRoomError {
        WhiteRoomError(
            category: .validationError,
            severity: .warning,
            code: "VALIDATION_ERROR",
            userMessage: "Invalid value for \(field): \(reason)",
            technicalDetails: "Validation failed: \(field) = \(value) - \(reason)",
            context: ["field": field, "value": value, "reason": reason, merging: context],
            recoveryActions: [
                RecoveryAction(
                    title: "Fix Value",
                    description: "Correct the invalid value",
                    isRecommended: true
                ) {
                    // Open field editor
                    await ValidationManager.shared.openFieldEditor(field)
                },
                RecoveryAction(
                    title: "Reset to Default",
                    description: "Reset to the default value"
                ) {
                    // Reset field
                    await ValidationManager.shared.resetToDefault(field)
                }
            ]
        )
    }
}

/// Centralized error handler (MainActor)
@MainActor
class WhiteRoomErrorHandler: ObservableObject {
    static let shared = WhiteRoomErrorHandler()

    @Published var currentError: WhiteRoomError?
    @Published var showErrorSheet = false
    @Published var showErrorAlert = false
    @Published var errorHistory: [WhiteRoomError] = []

    private let logger = Logger(subsystem: "com.whiteroom.audio", category: "ErrorHandler")
    private let maxHistorySize = 100

    private init() {}

    /// Handle an error
    func handle(_ error: Error) {
        Task {
            await handleAsync(error)
        }
    }

    /// Handle an error asynchronously
    func handleAsync(_ error: Error) async {
        let whiteRoomError = error as? WhiteRoomError ?? convertToWhiteRoomError(error)

        // Log error
        logError(whiteRoomError)

        // Add to history
        addToHistory(whiteRoomError)

        // Set current error
        currentError = whiteRoomError
        showErrorSheet = true

        // Take action based on severity
        switch whiteRoomError.severity {
        case .fatal, .critical:
            await handleCritical(whiteRoomError)
        case .error:
            await handleError(whiteRoomError)
        case .warning, .info:
            showWarning(whiteRoomError)
        case .debug:
            break // Just log
        }
    }

    /// Convert standard Error to WhiteRoomError
    private func convertToWhiteRoomError(_ error: Error) -> WhiteRoomError {
        let nsError = error as NSError

        // Analyze error domain and code
        if nsError.domain == NSCocoaErrorDomain {
            switch nsError.code {
            case NSFileNoSuchFileError:
                let path = nsError.userInfo["NSPath"] as? String ?? "unknown"
                return FileNotFoundError.create(path: path)
            case NSFileReadNoPermissionError:
                let path = nsError.userInfo["NSPath"] as? String ?? "unknown"
                return WhiteRoomError(
                    category: .filePermission,
                    severity: .error,
                    code: "FILE_PERMISSION",
                    userMessage: "Permission denied to access \"\(path)\""
                )
            default:
                break
            }
        }

        // Default to user error
        return WhiteRoomError(
            category: .userError,
            severity: .error,
            code: "UNKNOWN_ERROR",
            userMessage: error.localizedDescription,
            technicalDetails: error.localizedDescription
        )
    }

    /// Log error to console and file
    private func logError(_ error: WhiteRoomError) {
        var logMessage = "[\(error.severity.rawValue.uppercased())] \(error.code)"
        logMessage += "\nMessage: \(error.userMessage)"
        logMessage += "\nDetails: \(error.technicalDetails)"

        if !error.context.isEmpty {
            logMessage += "\nContext: \(error.context)"
        }

        switch error.severity {
        case .fatal, .critical:
            logger.fault("%{public}@", logMessage)
        case .error:
            logger.error("%{public}@", logMessage)
        case .warning:
            logger.warning("%{public}@", logMessage)
        case .info:
            logger.info("%{public}@", logMessage)
        case .debug:
            logger.debug("%{public}@", logMessage)
        }
    }

    /// Add error to history
    private func addToHistory(_ error: WhiteRoomError) {
        errorHistory.append(error)

        // Trim history if too large
        if errorHistory.count > maxHistorySize {
            errorHistory.removeFirst(errorHistory.count - maxHistorySize)
        }
    }

    /// Handle critical errors
    private func handleCritical(_ error: WhiteRoomError) async {
        logger.error("CRITICAL ERROR - App may be unstable")

        // Attempt automatic recovery if available
        if let automaticRecovery = error.automaticRecoveries.first {
            logger.info("Attempting automatic recovery: \(automaticRecovery.title)")
            await automaticRecovery.action()
        }

        // Show alert to user
        showErrorAlert = true

        // Save state if possible
        // TODO: Implement state saving

        // Report to crash service
        // TODO: Implement crash reporting
    }

    /// Handle error severity
    private func handleError(_ error: WhiteRoomError) async {
        logger.error("ERROR - Operation failed")

        // Attempt automatic recovery if available
        if let automaticRecovery = error.automaticRecoveries.first {
            logger.info("Attempting automatic recovery: \(automaticRecovery.title)")
            await automaticRecovery.action()
        }

        // Show error to user
        showErrorSheet = true
    }

    /// Show warning
    private func showWarning(_ error: WhiteRoomError) {
        logger.warning("WARNING - Potential issue")

        // Show warning to user (less intrusive)
        // Could use a banner or toast notification
        showErrorSheet = true
    }

    /// Execute recovery action
    func executeRecoveryAction(_ action: RecoveryAction) async {
        logger.info("Executing recovery action: \(action.title)")

        do {
            await action.action()
            logger.info("Recovery action completed: \(action.title)")

            // Dismiss error sheet on successful recovery
            showErrorSheet = false
            currentError = nil
        } catch {
            logger.error("Recovery action failed: \(action.title) - \(error)")
        }
    }

    /// Clear current error
    func clearError() {
        currentError = nil
        showErrorSheet = false
        showErrorAlert = false
    }

    /// Get error statistics
    func getErrorStatistics() -> ErrorStatistics {
        let totalErrors = errorHistory.count

        let errorsByCategory = Dictionary(
            grouping: errorHistory,
            by: { $0.category }
        ).mapValues { $0.count }

        let errorsBySeverity = Dictionary(
            grouping: errorHistory,
            by: { $0.severity }
        ).mapValues { $0.count }

        let mostFrequentErrors = Dictionary(
            grouping: errorHistory,
            by: { $0.code }
        )
        .mapValues { $0.count }
        .sorted { $0.value > $1.value }
        .prefix(10)
        .map { code, count in
            (code: code, count: count)
        }

        return ErrorStatistics(
            totalErrors: totalErrors,
            errorsByCategory: errorsByCategory,
            errorsBySeverity: errorsBySeverity,
            mostFrequentErrors: mostFrequentErrors,
            recentErrors: Array(errorHistory.suffix(10))
        )
    }

    /// Export error report
    func exportErrorReport() async throws -> String {
        let statistics = getErrorStatistics()

        let report: [String: Any] = [
            "generatedAt": ISO8601DateFormatter().string(from: Date()),
            "summary": [
                "totalErrors": statistics.totalErrors,
                "errorsByCategory": statistics.errorsByCategory,
                "errorsBySeverity": statistics.errorsBySeverity
            ],
            "mostFrequentErrors": statistics.mostFrequentErrors.map { error in
                [
                    "code": error.code,
                    "count": error.count
                ]
            },
            "recentErrors": statistics.recentErrors.map { error in
                [
                    "timestamp": ISO8601DateFormatter().string(from: error.timestamp),
                    "category": error.category.rawValue,
                    "severity": error.severity.rawValue,
                    "code": error.code,
                    "message": error.userMessage,
                    "details": error.technicalDetails,
                    "context": error.context
                ]
            }
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: report, options: .prettyPrinted)
        return String(data: jsonData, encoding: .utf8) ?? ""
    }

    /// Clear error history
    func clearHistory() {
        errorHistory.removeAll()
    }
}

/// Error statistics
struct ErrorStatistics {
    let totalErrors: Int
    let errorsByCategory: [ErrorCategory: Int]
    let errorsBySeverity: [ErrorSeverity: Int]
    let mostFrequentErrors: [(code: String, count: Int)]
    let recentErrors: [WhiteRoomError]
}

// MARK: - SwiftUI Views

/// Error sheet view
struct ErrorSheetView: View {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            if let error = errorHandler.currentError {
                // Icon
                Image(systemName: error.severity.icon)
                    .font(.system(size: 60))
                    .foregroundColor(error.severity.color)

                // Title
                Text(error.severity.rawValue.uppercased())
                    .font(.headline)
                    .foregroundColor(error.severity.color)

                // Message
                Text(error.userMessage)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .padding()

                // Recovery actions
                if !error.recoveryActions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("What would you like to do?")
                            .font(.headline)

                        ForEach(error.recoveryActions) { action in
                            Button(action: {
                                Task {
                                    await errorHandler.executeRecoveryAction(action)
                                }
                            }) {
                                HStack {
                                    Image(systemName: action.isRecommended ? "star.circle.fill" : "circle")
                                        .foregroundColor(action.isRecommended ? .yellow : .gray)

                                    VStack(alignment: .leading) {
                                        Text(action.title)
                                            .font(.body)

                                        if let description = action.description {
                                            Text(description)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(action.isRecommended ? Color.yellow.opacity(0.2) : Color.gray.opacity(0.1))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                }

                // Technical details (expandable)
                DisclosureGroup("Technical Details") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(error.technicalDetails)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("Code: \(error.code)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if !error.context.isEmpty {
                            Text("Context:")
                                .font(.caption)
                                .fontWeight(.semibold)

                            ForEach(error.context.keys.sorted(), id: \.self) { key in
                                HStack {
                                    Text("\(key):")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("\(error.context[key] ?? "")")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                }

                // Dismiss button
                Button("Dismiss") {
                    errorHandler.clearError()
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .frame(width: 500, height: 600)
    }
}

/// Error alert view
struct ErrorAlertView: View {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared

    var body: some View {
        if let error = errorHandler.currentError {
            Alert(
                title: Text(error.severity.rawValue.uppercased()),
                message: Text(error.userMessage),
                primaryButton: .default(Text("OK")) {
                    errorHandler.clearError()
                },
                secondaryButton: error.recommendedRecovery != nil ? .default(Text("Recover")) {
                    if let action = error.recommendedRecovery {
                        Task {
                            await errorHandler.executeRecoveryAction(action)
                        }
                    }
                } : nil
            )
        } else {
            Alert(title: Text("Error"))
        }
    }
}

/// View modifier for error handling
struct ErrorHandlingModifier: ViewModifier {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared

    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $errorHandler.showErrorSheet) {
                ErrorSheetView()
            }
            .alert(isPresented: $errorHandler.showErrorAlert) {
                ErrorAlertView()
            }
    }
}

extension View {
    /// Apply error handling to a view
    func withErrorHandling() -> some View {
        self.modifier(ErrorHandlingModifier())
    }
}

// MARK: - Dictionary Merging Helper
private extension Dictionary {
    func merging(_ other: [Key: Value]) -> [Key: Value] {
        var result = self
        other.forEach { key, value in
            result[key] = value
        }
        return result
    }
}
