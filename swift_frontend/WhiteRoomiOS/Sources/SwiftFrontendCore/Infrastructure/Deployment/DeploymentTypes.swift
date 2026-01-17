import Foundation

/// Shared deployment types to avoid conflicts with SwiftUI.Environment
public enum DeploymentEnvironment: String, Codable {
    case development = "development"
    case staging = "staging"
    case production = "production"
}

/// Deployment-specific validation result to avoid conflicts
public struct DeploymentCheckResult: Identifiable, Codable {
    public let id: UUID
    public let type: ValidationType
    public let passed: Bool
    public let message: String
    public let details: [String]
    public let timestamp: Date

    public init(
        id: UUID = UUID(),
        type: ValidationType,
        passed: Bool,
        message: String,
        details: [String],
        timestamp: Date = Date()
    ) {
        self.id = id
        self.type = type
        self.passed = passed
        self.message = message
        self.details = details
        self.timestamp = timestamp
    }

    public enum ValidationType: String, Codable {
        case healthCheck = "health_check"
        case smokeTest = "smoke_test"
        case integrationTest = "integration_test"
        case performanceTest = "performance_test"
        case securityScan = "security_scan"
        case userAcceptance = "user_acceptance"
    }
}

// Backward compatibility alias
@available(*, deprecated, message: "Use DeploymentCheckResult instead")
public typealias DeploymentValidationResult = DeploymentCheckResult

/// Deployment-specific notification severity
public enum DeploymentNotificationSeverity: String, Codable {
    case info = "info"
    case success = "success"
    case warning = "warning"
    case critical = "critical"
}
