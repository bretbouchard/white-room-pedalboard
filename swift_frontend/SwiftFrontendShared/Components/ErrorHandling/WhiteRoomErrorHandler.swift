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

/// Centralized error handler (MainActor)
@MainActor
class WhiteRoomErrorHandler: ObservableObject {
    static let shared = WhiteRoomErrorHandler()

    @Published var currentError: SwiftFrontendShared.WhiteRoomError?
    @Published var showErrorSheet = false
    @Published var showErrorAlert = false
    @Published var errorHistory: [SwiftFrontendShared.WhiteRoomError] = []

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
        let whiteRoomError = error as? SwiftFrontendShared.WhiteRoomError ?? convertToWhiteRoomError(error)

        // Log error
        logError(whiteRoomError)

        // Add to history
        addToHistory(whiteRoomError)

        // Set current error
        currentError = whiteRoomError
        showErrorSheet = true

        // Take action based on severity
        switch whiteRoomError.severity {
        case .critical:
            await handleCritical(whiteRoomError)
        case .error:
            await handleError(whiteRoomError)
        case .warning, .info:
            showWarning(whiteRoomError)
        }
    }

    /// Convert standard Error to WhiteRoomError
    private func convertToWhiteRoomError(_ error: Error) -> SwiftFrontendShared.WhiteRoomError {
        let nsError = error as NSError

        // Analyze error domain and code
        if nsError.domain == NSCocoaErrorDomain {
            switch nsError.code {
            case NSFileNoSuchFileError:
                let path = nsError.userInfo["NSPath"] as? String ?? "unknown"
                return .fileIO(.fileNotFound(path: path))
            case NSFileReadNoPermissionError:
                let path = nsError.userInfo["NSPath"] as? String ?? "unknown"
                return .fileIO(.permissionDenied(path: path))
            default:
                break
            }
        }

        // Default to user error
        return .validation(.validationFailed(field: "unknown", reason: error.localizedDescription))
    }

    /// Log error to console and file
    private func logError(_ error: SwiftFrontendShared.WhiteRoomError) {
        var logMessage = "[\(error.severity.rawValue.uppercased())] \(error.code)"
        logMessage += "\nMessage: \(error.userMessage)"
        logMessage += "\nDetails: \(error.technicalDetails)"

        if !error.context.isEmpty {
            logMessage += "\nContext: \(error.context)"
        }

        switch error.severity {
        case .critical:
            logger.fault("%{public}@", logMessage)
        case .error:
            logger.error("%{public}@", logMessage)
        case .warning:
            logger.warning("%{public}@", logMessage)
        case .info:
            logger.info("%{public}@", logMessage)
        }
    }

    /// Add error to history
    private func addToHistory(_ error: SwiftFrontendShared.WhiteRoomError) {
        errorHistory.append(error)

        // Trim history if too large
        if errorHistory.count > maxHistorySize {
            errorHistory.removeFirst(errorHistory.count - maxHistorySize)
        }
    }

    /// Handle critical errors
    private func handleCritical(_ error: SwiftFrontendShared.WhiteRoomError) async {
        logger.error("%{public}@", "CRITICAL ERROR - App may be unstable")

        // Show alert to user
        showErrorAlert = true

        // Save state if possible
        // TODO: Implement state saving

        // Report to crash service
        // TODO: Implement crash reporting
    }

    /// Handle error severity
    private func handleError(_ error: SwiftFrontendShared.WhiteRoomError) async {
        logger.error("%{public}@", "ERROR - Operation failed")

        // Show error to user
        showErrorSheet = true
    }

    /// Show warning
    private func showWarning(_ error: SwiftFrontendShared.WhiteRoomError) {
        logger.warning("%{public}@", "WARNING - Potential issue")

        // Show warning to user (less intrusive)
        // Could use a banner or toast notification
        showErrorSheet = true
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
                    "category": error.category,
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
    let errorsByCategory: [String: Int]
    let errorsBySeverity: [SwiftFrontendShared.ErrorSeverity: Int]
    let mostFrequentErrors: [(code: String, count: Int)]
    let recentErrors: [SwiftFrontendShared.WhiteRoomError]
}

// MARK: - SwiftUI Views

/// Error sheet view
struct ErrorSheetView: View {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared
    @Environment(\.dismiss) private var dismiss: DismissAction

    var body: some View {
        VStack(spacing: 20) {
            if let error = errorHandler.currentError {
                // Icon
                Image(systemName: error.severity.icon)
                    .font(.system(size: 60))
                    .foregroundColor(color(for: error.severity))

                // Title
                Text(error.severity.displayName.uppercased())
                    .font(.headline)
                    .foregroundColor(color(for: error.severity))

                // Message
                Text(error.userMessage)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .padding()

                // Recovery suggestion
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recovery Suggestion")
                        .font(.headline)

                    Text(error.recoverySuggestion)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding()

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

                            ForEach(Array(error.context.keys.sorted()), id: \.self) { key in
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

    private func color(for severity: SwiftFrontendShared.ErrorSeverity) -> Color {
        switch severity {
        case .info: return .cyan
        case .warning: return .yellow
        case .error: return .orange
        case .critical: return .red
        }
    }
}

/// Error alert view
struct ErrorAlertView: View {
    @ObservedObject var errorHandler = WhiteRoomErrorHandler.shared

    var body: some View {
        if let error = errorHandler.currentError {
            Alert(
                title: Text(error.severity.displayName.uppercased()),
                message: Text(error.userMessage),
                primaryButton: .default(Text("OK")) {
                    errorHandler.clearError()
                },
                secondaryButton: .default(Text("More Info")) {
                    // Show sheet with more info
                    errorHandler.showErrorSheet = true
                }
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
