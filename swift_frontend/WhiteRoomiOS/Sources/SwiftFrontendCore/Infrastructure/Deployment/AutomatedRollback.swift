import Foundation
import Combine

// Type alias for compatibility
public typealias NotificationSeverity = DeploymentNotificationSeverity

/// Manages automated rollback operations for failed deployments
public class AutomatedRollback: ObservableObject {
    // MARK: - Published Properties
    @Published public var rollbackHistory: [RollbackRecord] = []
    @Published public var rollbackTriggers: [RollbackTrigger] = []
    @Published public var isMonitoring: Bool = false

    // MARK: - Private Properties
    private var rollbackConfig: RollbackConfig
    private var deploymentManager: DeploymentManagerProtocol
    private var metricsCollector: RollbackMetricsCollectorImpl
    private var notificationService: RollbackNotificationServiceImpl
    private var monitoringTimer: Timer?
    private var rollbackCooldown: Date?
    private var rollbackCount: Int = 0

    // MARK: - Initialization
    public init(
        config: RollbackConfig = .default,
        deploymentManager: DeploymentManagerProtocol = DeploymentManager.shared,
        metricsCollector: RollbackMetricsCollectorImpl = .shared,
        notificationService: RollbackNotificationServiceImpl = .shared
    ) {
        self.rollbackConfig = config
        self.deploymentManager = deploymentManager
        self.metricsCollector = metricsCollector
        self.notificationService = notificationService
        loadRollbackHistory()
        loadRollbackTriggers()
    }

    // MARK: - Public Methods

    /// Execute a rollback operation
    public func executeRollback(_ deployment: Deployment) async throws -> RollbackResult {
        NSLog("[Rollback] Executing rollback for deployment \(deployment.version)")

        // Check cooldown period
        if let cooldown = rollbackCooldown, Date() < cooldown {
            throw RollbackError.cooldownPeriodActive
        }

        // Check max rollbacks limit
        if rollbackCount >= rollbackConfig.maxRollbacks {
            throw RollbackError.maxRollbacksReached
        }

        let startTime = Date()

        // Determine rollback version
        let rollbackVersion = try await determineRollbackVersion(deployment)

        // Execute rollback
        do {
            try await deploymentManager.rollbackToVersion(
                rollbackVersion,
                environment: deployment.environment
            )

            let duration = Date().timeIntervalSince(startTime)

            // Validate rollback
            let validation = try await validateRollbackResult(deployment, rollbackVersion: rollbackVersion)

            // Create rollback record
            let record = RollbackRecord(
                deployment: DeploymentInfo(
                    version: deployment.version,
                    environment: deployment.environment,
                    deployedAt: deployment.deployedAt,
                    deploymentType: deployment.deploymentType
                ),
                rollbackVersion: rollbackVersion,
                trigger: determineTrigger(deployment),
                reason: "Automated rollback triggered",
                startedAt: startTime,
                completedAt: Date(),
                duration: duration,
                successful: validation.passed,
                postRollbackValidation: validation,
                userImpact: await assessUserImpact(deployment)
            )

            // Update state
            rollbackHistory.append(record)
            rollbackCount += 1

            if rollbackConfig.cooldownPeriod > 0 {
                rollbackCooldown = Date().addingTimeInterval(rollbackConfig.cooldownPeriod)
            }

            // Notify stakeholders
            await notifyRollback(record)

            // Check if auto-recover is enabled
            if !validation.passed && rollbackConfig.autoRecover {
                try await attemptAutoRecover(record)
            }

            return RollbackResult(
                success: validation.passed,
                previousVersion: deployment.version,
                currentVersion: rollbackVersion,
                duration: duration,
                userImpact: record.userImpact,
                validationPassed: validation.passed,
                notes: validation.details
            )

        } catch {
            NSLog("[Rollback] Rollback failed: \(error.localizedDescription)")

            // Notify about rollback failure
            await notificationService.sendCriticalNotification(
                title: "Rollback Failed",
                message: "Failed to rollback from \(deployment.version): \(error.localizedDescription)"
            )

            throw error
        }
    }

    /// Configure automatic rollback triggers
    public func configureAutomaticRollback(_ config: RollbackConfig) {
        NSLog("[Rollback] Configuring automatic rollback")

        self.rollbackConfig = config

        if config.enabled {
            startAutomaticMonitoring()
        } else {
            stopAutomaticMonitoring()
        }

        saveRollbackConfig(config)
    }

    /// Validate that a rollback was successful
    public func validateRollback(_ result: RollbackResult) async throws {
        NSLog("[Rollback] Validating rollback result")

        // Verify current version
        let currentVersion = try await deploymentManager.getCurrentVersion(
            environment: result.previousVersion == rollbackHistory.last?.rollbackVersion ?
                .production : .production
        )

        guard currentVersion == result.currentVersion else {
            throw RollbackError.validationFailed(
                "Expected version \(result.currentVersion), but got \(currentVersion)"
            )
        }

        // Verify system health
        let health = try await metricsCollector.checkSystemHealth()

        guard health.isHealthy else {
            throw RollbackError.validationFailed(
                "System health check failed: \(health.message)"
            )
        }

        NSLog("[Rollback] Rollback validation successful")
    }

    /// Generate a comprehensive rollback report
    public func generateRollbackReport(_ record: RollbackRecord) throws -> RollbackReport {
        NSLog("[Rollback] Generating rollback report for \(record.deployment.version)")

        // Build timeline
        let timeline = buildTimeline(record)

        // Root cause analysis
        let rootCause = performRootCauseAnalysis(record)

        // Generate recommendations
        let recommendations = generateRecommendations(record, rootCause: rootCause)

        // Preventive actions
        let preventiveActions = generatePreventiveActions(record, rootCause: rootCause)

        return RollbackReport(
            rollback: record,
            timeline: timeline,
            rootCauseAnalysis: rootCause,
            recommendations: recommendations,
            preventiveActions: preventiveActions
        )
    }

    // MARK: - Private Methods

    private func startAutomaticMonitoring() {
        guard !isMonitoring else { return }

        isMonitoring = true

        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { [weak self] in
                guard let self = self else { return }

                await self.checkRollbackTriggers()
            }
        }

        NSLog("[Rollback] Automatic monitoring started")
    }

    private func stopAutomaticMonitoring() {
        monitoringTimer?.invalidate()
        monitoringTimer = nil
        isMonitoring = false
        NSLog("[Rollback] Automatic monitoring stopped")
    }

    private func checkRollbackTriggers() async {
        guard rollbackConfig.enabled else { return }

        // Check each enabled trigger
        for trigger in rollbackTriggers where trigger.enabled {
            do {
                let triggered = try await evaluateTrigger(trigger)

                if triggered {
                    NSLog("[Rollback] Trigger '\(trigger.name)' activated")

                    // Execute rollback
                    let deployment = try await getCurrentDeployment()

                    switch trigger.severity {
                    case .immediate:
                        try? await executeRollback(deployment)
                    case .urgent:
                        try? await Task.sleep(nanoseconds: UInt64(30 * 1_000_000_000)) // 30 seconds
                        try? await executeRollback(deployment)
                    case .normal:
                        try? await Task.sleep(nanoseconds: UInt64(60 * 1_000_000_000)) // 1 minute
                        try? await executeRollback(deployment)
                    case .gradual:
                        // Gradual rollback - notify first
                        await notificationService.sendWarningNotification(
                            title: "Rollback Triggered",
                            message: "Trigger '\(trigger.name)' activated, rollback in 5 minutes"
                        )
                        try? await Task.sleep(nanoseconds: UInt64(300 * 1_000_000_000)) // 5 minutes
                        try? await executeRollback(deployment)
                    }

                    // Stop monitoring after rollback
                    if rollbackConfig.cooldownPeriod > 0 {
                        stopAutomaticMonitoring()
                        DispatchQueue.main.asyncAfter(deadline: .now() + rollbackConfig.cooldownPeriod) {
                            self.startAutomaticMonitoring()
                        }
                    }

                    break
                }
            } catch {
                NSLog("[Rollback] Error evaluating trigger '\(trigger.name)': \(error.localizedDescription)")
            }
        }
    }

    private func evaluateTrigger(_ trigger: RollbackTrigger) async throws -> Bool {
        let metrics = try await metricsCollector.collectRollbackMetrics()

        switch trigger.type {
        case .errorRate:
            if case .threshold(let threshold) = trigger.condition {
                return metrics.errorRate >= threshold
            }
        case .latency:
            if case .threshold(let threshold) = trigger.condition {
                if case .p95(let latencyValue) = metrics.latency {
                    return latencyValue >= threshold
                }
                return false
            }
        case .crashRate:
            if case .threshold(let threshold) = trigger.condition {
                return metrics.crashRate >= threshold
            }
        case .healthCheck:
            let health = await metricsCollector.checkSystemHealth()
            return !health.isHealthy
        case .manual:
            return false // Manual triggers are activated externally
        case .customMetric:
            if case .custom(let metricName) = trigger.condition {
                return metrics.customMetrics[metricName] ?? 0 >= 1.0
            }
        }

        return false
    }

    private func determineRollbackVersion(_ deployment: Deployment) async throws -> String {
        // Get previous successful deployment
        let previousDeployments = await deploymentManager.getDeploymentHistory(
            environment: deployment.environment,
            limit: 10
        )

        // Find the most recent successful deployment that's not the current one
        for previousDeployment in previousDeployments {
            if previousDeployment.version != deployment.version &&
               previousDeployment.status == .successful {
                return previousDeployment.version
            }
        }

        throw RollbackError.noValidRollbackVersion
    }

    private func determineTrigger(_ deployment: Deployment) -> RollbackTrigger {
        // Determine which trigger caused the rollback
        return RollbackTrigger(
            name: "Automatic Detection",
            type: .errorRate,
            condition: .threshold(0.05),
            severity: .immediate,
            enabled: true
        )
    }

    private func validateRollbackResult(
        _ deployment: Deployment,
        rollbackVersion: String
    ) async throws -> RollbackValidationResult {
        NSLog("[Rollback] Validating rollback to \(rollbackVersion)")

        var details: [String] = []

        // Check version
        let currentVersion = try await deploymentManager.getCurrentVersion(
            environment: deployment.environment
        )

        if currentVersion == rollbackVersion {
            details.append("Version rollback successful: \(rollbackVersion)")
        } else {
            details.append("Version mismatch: expected \(rollbackVersion), got \(currentVersion)")
        }

        // Health check
        let health = await metricsCollector.checkSystemHealth()

        if health.isHealthy {
            details.append("System health: OK")
        } else {
            details.append("System health: \(health.message)")
        }

        // Performance check
        let performance = try await metricsCollector.collectPerformanceMetrics()
        details.append("Error rate: \(performance.errorRate)")
        details.append("Latency p95: \(performance.latency)p95")

        // User impact assessment
        let impact = await assessUserImpact(deployment)
        details.append("Users affected: \(impact.affectedUsers)")
        details.append("Downtime: \(impact.downtimeSeconds)s")

        let passed = currentVersion == rollbackVersion && health.isHealthy

        return RollbackValidationResult(
            type: .userAcceptance,
            passed: passed,
            message: passed ? "Rollback validation successful" : "Rollback validation failed",
            details: details,
            timestamp: Date()
        )
    }

    private func assessUserImpact(_ deployment: Deployment) async -> UserImpact {
        // In production, collect real user impact metrics
        return UserImpact(
            affectedUsers: Int.random(in: 0...1000),
            downtimeSeconds: Date().timeIntervalSince(deployment.deployedAt),
            errorCount: Int.random(in: 0...100),
            complaints: 0,
            impact: .low
        )
    }

    private func attemptAutoRecover(_ record: RollbackRecord) async throws {
        NSLog("[Rollback] Attempting auto-recover")

        // Implement auto-recovery logic
        // This could include retrying the deployment with different config,
        // scaling resources, clearing caches, etc.

        await notificationService.sendInfoNotification(
            title: "Auto-Recovery Attempted",
            message: "Attempting to recover from failed rollback"
        )
    }

    private func getCurrentDeployment() async throws -> Deployment {
        // In production, get current deployment from deployment manager
        return Deployment(
            version: "1.0.0",
            environment: DeploymentEnvironment.production,
            deployedAt: Date().addingTimeInterval(-3600),
            deploymentType: .blueGreen
        )
    }

    private func buildTimeline(_ record: RollbackRecord) -> [TimelineEvent] {
        var events: [TimelineEvent] = []

        // Deployment started
        events.append(TimelineEvent(
            timestamp: record.deployment.deployedAt,
            event: "Deployment Started",
            details: "Version \(record.deployment.version) deployed"
        ))

        // Issues detected
        events.append(TimelineEvent(
            timestamp: record.startedAt.addingTimeInterval(-300),
            event: "Issues Detected",
            details: record.trigger.name
        ))

        // Rollback initiated
        events.append(TimelineEvent(
            timestamp: record.startedAt,
            event: "Rollback Initiated",
            details: "Rolling back to \(record.rollbackVersion)"
        ))

        // Rollback completed
        events.append(TimelineEvent(
            timestamp: record.completedAt,
            event: "Rollback Completed",
            details: "Duration: \(record.duration)s"
        ))

        return events
    }

    private func performRootCauseAnalysis(_ record: RollbackRecord) -> RootCauseAnalysis {
        // Analyze metrics to determine root cause
        let likelyCauses: [String] = [
            "High error rate detected",
            "Performance degradation",
            "Memory leak detected"
        ]

        return RootCauseAnalysis(
            likelyCauses: likelyCauses,
            contributingFactors: [
                "Insufficient testing in staging",
                "Missing performance validation"
            ],
            confidenceLevel: 0.7,
            requiresInvestigation: true
        )
    }

    private func generateRecommendations(
        _ record: RollbackRecord,
        rootCause: RootCauseAnalysis
    ) -> [String] {
        var recommendations: [String] = []

        recommendations.append("Increase staging environment testing duration")
        recommendations.append("Add performance regression tests")
        recommendations.append("Implement gradual rollout for this feature")

        if record.userImpact.impact == .high || record.userImpact.impact == .critical {
            recommendations.append("Review incident response procedures")
            recommendations.append("Consider adding circuit breakers")
        }

        return recommendations
    }

    private func generatePreventiveActions(
        _ record: RollbackRecord,
        rootCause: RootCauseAnalysis
    ) -> [String] {
        var actions: [String] = []

        actions.append("Add automated test coverage for this scenario")
        actions.append("Update rollback triggers based on lessons learned")
        actions.append("Document this incident in runbook")

        if record.duration > 120 {
            actions.append("Optimize rollback process to reduce downtime")
        }

        return actions
    }

    private func notifyRollback(_ record: RollbackRecord) async {
        let severity: NotificationSeverity = switch record.userImpact.impact {
        case .none, .low: .warning
        case .medium: .warning
        case .high, .critical: .critical
        }

        await notificationService.sendNotification(
            title: "Rollback Executed",
            message: "Rolled back from \(record.deployment.version) to \(record.rollbackVersion). Duration: \(record.duration)s",
            severity: severity
        )

        if rollbackConfig.notifyStakeholders {
            await notificationService.sendNotification(
                title: "Rollback Notification",
                message: "Version \(record.deployment.version) rolled back due to \(record.trigger.name)",
                severity: severity
            )
        }
    }

    private func saveRollbackConfig(_ config: RollbackConfig) {
        // In production, save config to persistent storage
        NSLog("[Rollback] Saved rollback config")
    }

    private func loadRollbackHistory() {
        // In production, load from CoreData or backend
        rollbackHistory = []
    }

    private func loadRollbackTriggers() {
        // In production, load from config
        rollbackTriggers = [
            RollbackTrigger(
                name: "High Error Rate",
                type: .errorRate,
                condition: .threshold(0.05), // 5% error rate
                severity: .immediate,
                enabled: true
            ),
            RollbackTrigger(
                name: "High Latency",
                type: .latency,
                condition: .threshold(1.0), // 1 second p95
                severity: .urgent,
                enabled: true
            ),
            RollbackTrigger(
                name: "High Crash Rate",
                type: .crashRate,
                condition: .threshold(0.01), // 1% crash rate
                severity: .immediate,
                enabled: true
            ),
            RollbackTrigger(
                name: "Health Check Failure",
                type: .healthCheck,
                condition: .threshold(0),
                severity: .immediate,
                enabled: true
            )
        ]
    }
}

// MARK: - Supporting Types

public struct RollbackConfig: Codable {
    public let enabled: Bool
    public let triggers: [RollbackTrigger]
    public let cooldownPeriod: TimeInterval
    public let maxRollbacks: Int
    public let autoRecover: Bool
    public let notifyStakeholders: Bool

    public init(
        enabled: Bool,
        triggers: [RollbackTrigger],
        cooldownPeriod: TimeInterval,
        maxRollbacks: Int,
        autoRecover: Bool,
        notifyStakeholders: Bool
    ) {
        self.enabled = enabled
        self.triggers = triggers
        self.cooldownPeriod = cooldownPeriod
        self.maxRollbacks = maxRollbacks
        self.autoRecover = autoRecover
        self.notifyStakeholders = notifyStakeholders
    }

    public static let `default` = RollbackConfig(
        enabled: true,
        triggers: [],
        cooldownPeriod: 300, // 5 minutes
        maxRollbacks: 3,
        autoRecover: false,
        notifyStakeholders: true
    )
}

public struct RollbackTrigger: Identifiable, Codable {
    public let id: UUID
    public let name: String
    public let type: TriggerType
    public let condition: TriggerCondition
    public let severity: RollbackSeverity
    public var enabled: Bool

    public init(
        id: UUID = UUID(),
        name: String,
        type: TriggerType,
        condition: TriggerCondition,
        severity: RollbackSeverity,
        enabled: Bool
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.condition = condition
        self.severity = severity
        self.enabled = enabled
    }

    public enum TriggerType: String, Codable {
        case errorRate = "error_rate"
        case latency = "latency"
        case crashRate = "crash_rate"
        case healthCheck = "health_check"
        case manual = "manual"
        case customMetric = "custom_metric"
    }

    public enum TriggerCondition: Codable {
        case threshold(Double)
        case percentageIncrease(Double)
        case absoluteIncrease(Double)
        case custom(String)

        public init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()

            if let doubleValue = try? container.decode(Double.self) {
                self = .threshold(doubleValue)
            } else if let stringValue = try? container.decode(String.self) {
                self = .custom(stringValue)
            } else {
                throw DecodingError.dataCorruptedError(
                    in: container,
                    debugDescription: "TriggerCondition cannot be decoded"
                )
            }
        }

        public func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()

            switch self {
            case .threshold(let value):
                try container.encode(value)
            case .percentageIncrease(let value):
                try container.encode(value)
            case .absoluteIncrease(let value):
                try container.encode(value)
            case .custom(let value):
                try container.encode(value)
            }
        }
    }

    public enum RollbackSeverity: String, Codable {
        case immediate = "immediate"
        case urgent = "urgent"
        case normal = "normal"
        case gradual = "gradual"
    }
}

public struct RollbackRecord: Identifiable, Codable {
    public let id: UUID
    public let deployment: DeploymentInfo
    public let rollbackVersion: String
    public let trigger: RollbackTrigger
    public let reason: String
    public let startedAt: Date
    public let completedAt: Date
    public let duration: TimeInterval
    public let successful: Bool
    public let postRollbackValidation: RollbackValidationResult
    public let userImpact: UserImpact

    public init(
        id: UUID = UUID(),
        deployment: DeploymentInfo,
        rollbackVersion: String,
        trigger: RollbackTrigger,
        reason: String,
        startedAt: Date,
        completedAt: Date,
        duration: TimeInterval,
        successful: Bool,
        postRollbackValidation: RollbackValidationResult,
        userImpact: UserImpact
    ) {
        self.id = id
        self.deployment = deployment
        self.rollbackVersion = rollbackVersion
        self.trigger = trigger
        self.reason = reason
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.duration = duration
        self.successful = successful
        self.postRollbackValidation = postRollbackValidation
        self.userImpact = userImpact
    }
}

public struct DeploymentInfo: Codable {
    public let version: String
    public let environment: DeploymentEnvironment
    public let deployedAt: Date
    public let deploymentType: DeploymentType

    public enum DeploymentType: String, Codable {
        case canary = "canary"
        case blueGreen = "blue_green"
        case rolling = "rolling"
        case bigBang = "big_bang"
    }
}

public struct RollbackResult {
    public let success: Bool
    public let previousVersion: String
    public let currentVersion: String
    public let duration: TimeInterval
    public let userImpact: UserImpact
    public let validationPassed: Bool
    public let notes: [String]
}

public struct UserImpact: Codable {
    public let affectedUsers: Int
    public let downtimeSeconds: TimeInterval
    public let errorCount: Int
    public let complaints: Int
    public let impact: ImpactLevel

    public enum ImpactLevel: String, Codable {
        case none = "none"
        case low = "low"
        case medium = "medium"
        case high = "high"
        case critical = "critical"
    }
}

public struct RollbackReport {
    public let rollback: RollbackRecord
    public let timeline: [TimelineEvent]
    public let rootCauseAnalysis: RootCauseAnalysis
    public let recommendations: [String]
    public let preventiveActions: [String]
}

public struct TimelineEvent: Identifiable, Codable {
    public let id: UUID
    public let timestamp: Date
    public let event: String
    public let details: String

    public init(
        id: UUID = UUID(),
        timestamp: Date,
        event: String,
        details: String
    ) {
        self.id = id
        self.timestamp = timestamp
        self.event = event
        self.details = details
    }
}

public struct RootCauseAnalysis: Codable {
    public let likelyCauses: [String]
    public let contributingFactors: [String]
    public let confidenceLevel: Double
    public let requiresInvestigation: Bool
}

public enum RollbackError: LocalizedError {
    case cooldownPeriodActive
    case maxRollbacksReached
    case noValidRollbackVersion
    case validationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .cooldownPeriodActive:
            return "Rollback is in cooldown period"
        case .maxRollbacksReached:
            return "Maximum number of rollbacks reached"
        case .noValidRollbackVersion:
            return "No valid rollback version found"
        case .validationFailed(let message):
            return "Rollback validation failed: \(message)"
        }
    }
}

// MARK: - Supporting Protocols

public protocol DeploymentManagerProtocol {
    func rollbackToVersion(_ version: String, environment: DeploymentEnvironment) async throws
    func getCurrentVersion(environment: DeploymentEnvironment) async throws -> String
    func getDeploymentHistory(environment: DeploymentEnvironment, limit: Int) async -> [Deployment]
}

public struct Deployment {
    let version: String
    let environment: DeploymentEnvironment
    let deployedAt: Date
    let deploymentType: DeploymentInfo.DeploymentType
    let status: DeploymentStatus

    init(
        version: String,
        environment: DeploymentEnvironment,
        deployedAt: Date,
        deploymentType: DeploymentInfo.DeploymentType,
        status: DeploymentStatus = .successful
    ) {
        self.version = version
        self.environment = environment
        self.deployedAt = deployedAt
        self.deploymentType = deploymentType
        self.status = status
    }

    enum DeploymentStatus {
        case successful
        case failed
        case rolledBack
    }
}

public class DeploymentManager: DeploymentManagerProtocol {
    public static let shared = DeploymentManager()

    private init() {}

    public func rollbackToVersion(_ version: String, environment: DeploymentEnvironment) async throws {
        NSLog("[DeploymentManager] Rolling back to \(version) in \(environment)")
        // In production, execute actual rollback
    }

    public func getCurrentVersion(environment: DeploymentEnvironment) async throws -> String {
        return "1.0.0"
    }

    public func getDeploymentHistory(environment: DeploymentEnvironment, limit: Int) async -> [Deployment] {
        return [
            Deployment(
                version: "1.0.0",
                environment: environment,
                deployedAt: Date().addingTimeInterval(-86400),
                deploymentType: .blueGreen
            ),
            Deployment(
                version: "0.9.0",
                environment: environment,
                deployedAt: Date().addingTimeInterval(-172800),
                deploymentType: .blueGreen
            )
        ]
    }
}

public protocol RollbackMetricsCollectorProtocol {
    func collectRollbackMetrics() async throws -> RollbackMetrics
    func checkSystemHealth() async -> SystemHealth
    func collectPerformanceMetrics() async throws -> PerformanceMetrics
}

public struct RollbackMetrics {
    let errorRate: Double
    let latency: LatencyMetric
    let crashRate: Double
    let customMetrics: [String: Double]
}

public struct SystemHealth {
    let isHealthy: Bool
    let message: String
}

public struct PerformanceMetrics {
    let errorRate: Double
    let latency: Double
}

public enum LatencyMetric {
    case p95(Double)
    case average(Double)
}

public class RollbackMetricsCollectorImpl: RollbackMetricsCollectorProtocol {
    public static let shared = RollbackMetricsCollectorImpl()

    private init() {}

    public func collectRollbackMetrics() async throws -> RollbackMetrics {
        return RollbackMetrics(
            errorRate: 0.001,
            latency: .p95(0.150),
            crashRate: 0.0,
            customMetrics: [:]
        )
    }

    public func checkSystemHealth() async -> SystemHealth {
        return SystemHealth(isHealthy: true, message: "All systems operational")
    }

    public func collectPerformanceMetrics() async throws -> PerformanceMetrics {
        return PerformanceMetrics(errorRate: 0.001, latency: 0.150)
    }
}

public protocol RollbackNotificationServiceProtocol {
    func sendNotification(title: String, message: String, severity: NotificationSeverity) async
    func sendCriticalNotification(title: String, message: String) async
    func sendWarningNotification(title: String, message: String) async
    func sendInfoNotification(title: String, message: String) async
}

public class RollbackNotificationServiceImpl: RollbackNotificationServiceProtocol {
    public static let shared = RollbackNotificationServiceImpl()

    private init() {}

    public func sendNotification(title: String, message: String, severity: NotificationSeverity) async {
        NSLog("[NotificationService] [\(severity)] \(title): \(message)")
    }

    public func sendCriticalNotification(title: String, message: String) async {
        await sendNotification(title: title, message: message, severity: .critical)
    }

    public func sendWarningNotification(title: String, message: String) async {
        await sendNotification(title: title, message: message, severity: .warning)
    }

    public func sendInfoNotification(title: String, message: String) async {
        await sendNotification(title: title, message: message, severity: .info)
    }
}

// MARK: - Rollback Validation Result

/// Rollback-specific validation result
public struct RollbackValidationResult: Identifiable, Codable {
    public let id: UUID
    public let type: DeploymentCheckResult.ValidationType
    public let passed: Bool
    public let message: String
    public let details: [String]
    public let timestamp: Date

    public init(
        id: UUID = UUID(),
        type: DeploymentCheckResult.ValidationType,
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
}
