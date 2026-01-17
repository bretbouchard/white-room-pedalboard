import Foundation
import Combine

/// Manages canary release deployments with gradual traffic shifting and automated monitoring
public class CanaryReleaseController: ObservableObject {
    // MARK: - Published Properties
    @Published public var activeCanary: CanaryRelease?
    @Published public var canaryHistory: [CanaryRelease] = []
    @Published public var isMonitoring: Bool = false

    // MARK: - Private Properties
    private var monitoringTimer: Timer?
    private var metricsCollector: CanaryMetricsCollector
    private var deploymentClient: CanaryDeploymentClient
    private var notificationService: CanaryNotificationService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    public init(
        metricsCollector: CanaryMetricsCollector = .shared,
        deploymentClient: CanaryDeploymentClient = .shared,
        notificationService: CanaryNotificationService = .shared
    ) {
        self.metricsCollector = metricsCollector
        self.deploymentClient = deploymentClient
        self.notificationService = notificationService
        loadCanaryHistory()
    }

    // MARK: - Public Methods

    /// Start a new canary release with the specified configuration
    public func startCanary(_ config: CanaryConfig) async throws -> CanaryRelease {
        NSLog("[CanaryRelease] Starting canary release for version \(config.version)")

        // Validate configuration
        try validateCanaryConfig(config)

        // Create canary release object
        var canary = CanaryRelease(
            version: config.version,
            baselineVersion: config.baselineVersion,
            status: .pending,
            currentTrafficPercentage: 0,
            trafficSchedule: config.trafficSchedule,
            currentStep: 0,
            metrics: CanaryMetrics.empty,
            startedAt: Date(),
            estimatedCompletion: calculateEstimatedCompletion(schedule: config.trafficSchedule),
            completedAt: nil
        )

        // Deploy canary version
        try await deployCanaryVersion(canary, config: config)

        // Start with initial traffic percentage
        canary.currentTrafficPercentage = config.initialTrafficPercentage
        canary.status = .running

        // Save canary release
        activeCanary = canary
        await saveCanaryRelease(canary)

        // Start monitoring
        startMonitoring(canary: canary, config: config)

        // Notify stakeholders
        await notificationService.sendNotification(
            title: "Canary Release Started",
            message: "Version \(config.version) deployed with \(config.initialTrafficPercentage)% traffic",
            severity: .info
        )

        NSLog("[CanaryRelease] Canary release \(canary.id) started successfully")
        return canary
    }

    /// Monitor canary release metrics and adjust traffic accordingly
    public func monitorCanary(_ canary: CanaryRelease) async throws -> CanaryStatus {
        NSLog("[CanaryRelease] Monitoring canary \(canary.id)")

        // Collect current metrics
        let currentMetrics = try await metricsCollector.collectMetrics(
            canaryVersion: canary.version,
            baselineVersion: canary.baselineVersion
        )

        // Update canary with new metrics
        var updatedCanary = canary
        updatedCanary.metrics = currentMetrics

        // Check if we should advance to next traffic step
        if shouldAdvanceTraffic(updatedCanary) {
            try await advanceTrafficStep(&updatedCanary)
        }

        // Check rollback thresholds
        if shouldRollback(updatedCanary) {
            NSLog("[CanaryRelease] Rollback thresholds exceeded")
            try await rollbackCanary(updatedCanary)
            return .failed
        }

        // Check if canary is complete
        if updatedCanary.currentStep >= updatedCanary.trafficSchedule.count {
            updatedCanary.status = .successful
            updatedCanary.completedAt = Date()
            try await promoteCanary(updatedCanary)
            return .successful
        }

        // Save updated state
        activeCanary = updatedCanary
        await saveCanaryRelease(updatedCanary)

        return updatedCanary.status
    }

    /// Adjust traffic percentage for the canary release
    public func adjustTraffic(_ canary: CanaryRelease, percentage: Int) async throws {
        NSLog("[CanaryRelease] Adjusting traffic to \(percentage)% for canary \(canary.id)")

        guard (0...100).contains(percentage) else {
            throw CanaryError.invalidTrafficPercentage(percentage)
        }

        // Update traffic split
        try await deploymentClient.updateTrafficSplit(
            canaryVersion: canary.version,
            baselineVersion: canary.baselineVersion,
            canaryPercentage: percentage
        )

        // Update canary state
        var updatedCanary = canary
        updatedCanary.currentTrafficPercentage = percentage
        activeCanary = updatedCanary

        await saveCanaryRelease(updatedCanary)

        NSLog("[CanaryRelease] Traffic adjusted to \(percentage)%")
    }

    /// Promote canary to full traffic (100%)
    public func promoteCanary(_ canary: CanaryRelease) async throws {
        NSLog("[CanaryRelease] Promoting canary \(canary.id) to full traffic")

        // Gradually increase to 100%
        let steps = [75, 90, 100]
        for percentage in steps where percentage > canary.currentTrafficPercentage {
            try await adjustTraffic(canary, percentage: percentage)
            try await Task.sleep(nanoseconds: UInt64(60 * 1_000_000_000)) // 1 minute between steps
        }

        // Update canary status
        var promotedCanary = canary
        promotedCanary.status = .successful
        promotedCanary.completedAt = Date()
        promotedCanary.currentTrafficPercentage = 100

        activeCanary = promotedCanary
        await saveCanaryRelease(promotedCanary)

        // Add to history
        canaryHistory.append(promotedCanary)

        // Notify stakeholders
        await notificationService.sendNotification(
            title: "Canary Release Completed",
            message: "Version \(canary.version) promoted to 100% traffic",
            severity: .success
        )

        NSLog("[CanaryRelease] Canary promoted successfully")
    }

    /// Rollback canary release to baseline
    public func rollbackCanary(_ canary: CanaryRelease) async throws {
        NSLog("[CanaryRelease] Rolling back canary \(canary.id)")

        // Immediately route all traffic to baseline
        try await deploymentClient.updateTrafficSplit(
            canaryVersion: canary.version,
            baselineVersion: canary.baselineVersion,
            canaryPercentage: 0
        )

        // Update canary status
        var rolledBackCanary = canary
        rolledBackCanary.status = .rolledBack
        rolledBackCanary.completedAt = Date()

        activeCanary = nil
        await saveCanaryRelease(rolledBackCanary)

        // Add to history
        canaryHistory.append(rolledBackCanary)

        // Stop monitoring
        stopMonitoring()

        // Notify stakeholders
        await notificationService.sendNotification(
            title: "Canary Rollback Executed",
            message: "Version \(canary.version) rolled back to \(canary.baselineVersion)",
            severity: .critical
        )

        NSLog("[CanaryRelease] Canary rolled back successfully")
    }

    // MARK: - Private Methods

    private func validateCanaryConfig(_ config: CanaryConfig) throws {
        guard !config.version.isEmpty else {
            throw CanaryError.invalidVersion
        }

        guard !config.baselineVersion.isEmpty else {
            throw CanaryError.invalidBaselineVersion
        }

        guard config.version != config.baselineVersion else {
            throw CanaryError.sameVersionAndBaseline
        }

        guard (0...100).contains(config.initialTrafficPercentage) else {
            throw CanaryError.invalidTrafficPercentage(config.initialTrafficPercentage)
        }

        guard !config.trafficSchedule.isEmpty else {
            throw CanaryError.emptyTrafficSchedule
        }

        // Verify traffic schedule is monotonically increasing
        for i in 1..<config.trafficSchedule.count {
            if config.trafficSchedule[i].percentage <= config.trafficSchedule[i-1].percentage {
                throw CanaryError.invalidTrafficSchedule
            }
        }
    }

    private func deployCanaryVersion(_ canary: CanaryRelease, config: CanaryConfig) async throws {
        NSLog("[CanaryRelease] Deploying canary version \(config.version)")

        // Deploy to canary environment
        try await deploymentClient.deployVersion(
            version: config.version,
            environment: DeploymentEnvironment.production
        )

        // Run smoke tests
        let smokeTestResults = try await deploymentClient.runSmokeTests(version: config.version)

        guard smokeTestResults.allSatisfy({ $0.passed }) else {
            let failedResults = smokeTestResults.filter { !$0.passed }
            let testResults = failedResults.map { result in
                TestResult(
                    name: result.message,
                    passed: result.passed,
                    duration: 0,
                    timestamp: Date(),
                    filePath: nil,
                    errorMessage: result.details.isEmpty ? "Test failed" : result.details.joined(separator: ", ")
                )
            }
            throw CanaryError.smokeTestFailed(testResults)
        }

        NSLog("[CanaryRelease] Canary version deployed and validated")
    }

    private func startMonitoring(canary: CanaryRelease, config: CanaryConfig) {
        isMonitoring = true

        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            Task { [weak self] in
                guard let self = self else { return }

                do {
                    let status = try await self.monitorCanary(canary)

                    if status == .successful || status == .failed || status == .rolledBack {
                        self.stopMonitoring()
                    }
                } catch {
                    NSLog("[CanaryRelease] Monitoring error: \(error.localizedDescription)")

                    if config.autoRollback {
                        try? await self.rollbackCanary(canary)
                    }
                }
            }
        }

        NSLog("[CanaryRelease] Monitoring started")
    }

    private func stopMonitoring() {
        monitoringTimer?.invalidate()
        monitoringTimer = nil
        isMonitoring = false
        NSLog("[CanaryRelease] Monitoring stopped")
    }

    private func shouldAdvanceTraffic(_ canary: CanaryRelease) -> Bool {
        guard canary.currentStep < canary.trafficSchedule.count else {
            return false
        }

        let currentStep = canary.trafficSchedule[canary.currentStep]

        // Check if current step has completed its duration
        let timeSinceStart = Date().timeIntervalSince(canary.startedAt)
        let timeInCurrentStep = timeSinceStart - totalDuration(for: canary, upToStep: canary.currentStep)

        guard timeInCurrentStep >= currentStep.waitTime else {
            return false
        }

        // Check success criteria
        return meetsSuccessCriteria(canary)
    }

    private func shouldRollback(_ canary: CanaryRelease) -> Bool {
        let metrics = canary.metrics

        // Check error rate
        if metrics.errorRate > metrics.baselineErrorRate * 2.0 {
            return true
        }

        // Check latency
        if metrics.latency.p95 > metrics.baselineLatency.p95 * 1.5 {
            return true
        }

        // Check crash rate
        if metrics.crashRate > 0.01 { // 1% crash rate threshold
            return true
        }

        return false
    }

    private func meetsSuccessCriteria(_ canary: CanaryRelease) -> Bool {
        let metrics = canary.metrics

        // Error rate should not be significantly higher than baseline
        let errorRateIncrease = (metrics.errorRate - metrics.baselineErrorRate) / metrics.baselineErrorRate
        if errorRateIncrease > 0.5 { // 50% increase threshold
            return false
        }

        // Latency should not be significantly higher
        let latencyIncrease = (metrics.latency.p95 - metrics.baselineLatency.p95) / metrics.baselineLatency.p95
        if latencyIncrease > 0.3 { // 30% increase threshold
            return false
        }

        return true
    }

    private func advanceTrafficStep(_ canary: inout CanaryRelease) async throws {
        let nextStep = canary.trafficSchedule[canary.currentStep]

        NSLog("[CanaryRelease] Advancing to traffic step \(canary.currentStep + 1): \(nextStep.percentage)%")

        try await adjustTraffic(canary, percentage: nextStep.percentage)
        canary.currentStep += 1
    }

    private func totalDuration(for canary: CanaryRelease, upToStep step: Int) -> TimeInterval {
        var total: TimeInterval = 0
        for i in 0..<min(step, canary.trafficSchedule.count) {
            total += canary.trafficSchedule[i].duration
        }
        return total
    }

    private func calculateEstimatedCompletion(schedule: [TrafficStep]) -> Date? {
        let totalDuration = schedule.reduce(0) { $0 + $1.duration + $1.waitTime }
        return Date().addingTimeInterval(totalDuration)
    }

    private func saveCanaryRelease(_ canary: CanaryRelease) async {
        // In production, save to CoreData or backend
        NSLog("[CanaryRelease] Saved canary release \(canary.id)")
    }

    private func loadCanaryHistory() {
        // In production, load from CoreData or backend
        canaryHistory = []
    }
}

// MARK: - Supporting Types

public enum CanaryStatus: String, Codable {
    case pending
    case running
    case paused
    case successful
    case failed
    case rolledBack
}

public struct CanaryRelease: Identifiable, Codable {
    public let id: UUID
    public let version: String
    public let baselineVersion: String
    public var status: CanaryStatus
    public var currentTrafficPercentage: Int
    public let trafficSchedule: [TrafficStep]
    public var currentStep: Int
    public var metrics: CanaryMetrics
    public let startedAt: Date
    public var estimatedCompletion: Date?
    public var completedAt: Date?

    public init(
        id: UUID = UUID(),
        version: String,
        baselineVersion: String,
        status: CanaryStatus,
        currentTrafficPercentage: Int,
        trafficSchedule: [TrafficStep],
        currentStep: Int,
        metrics: CanaryMetrics,
        startedAt: Date,
        estimatedCompletion: Date?,
        completedAt: Date?
    ) {
        self.id = id
        self.version = version
        self.baselineVersion = baselineVersion
        self.status = status
        self.currentTrafficPercentage = currentTrafficPercentage
        self.trafficSchedule = trafficSchedule
        self.currentStep = currentStep
        self.metrics = metrics
        self.startedAt = startedAt
        self.estimatedCompletion = estimatedCompletion
        self.completedAt = completedAt
    }
}

public struct CanaryConfig {
    public let version: String
    public let baselineVersion: String
    public let initialTrafficPercentage: Int
    public let trafficSchedule: [TrafficStep]
    public let successCriteria: SuccessCriteria
    public let rollbackThresholds: RollbackThresholds
    public let autoPromote: Bool
    public let autoRollback: Bool

    public init(
        version: String,
        baselineVersion: String,
        initialTrafficPercentage: Int,
        trafficSchedule: [TrafficStep],
        successCriteria: SuccessCriteria,
        rollbackThresholds: RollbackThresholds,
        autoPromote: Bool = true,
        autoRollback: Bool = true
    ) {
        self.version = version
        self.baselineVersion = baselineVersion
        self.initialTrafficPercentage = initialTrafficPercentage
        self.trafficSchedule = trafficSchedule
        self.successCriteria = successCriteria
        self.rollbackThresholds = rollbackThresholds
        self.autoPromote = autoPromote
        self.autoRollback = autoRollback
    }
}

public struct TrafficStep: Identifiable, Codable {
    public let id: UUID
    public let percentage: Int
    public let duration: TimeInterval
    public let waitTime: TimeInterval
    public let description: String

    public init(
        id: UUID = UUID(),
        percentage: Int,
        duration: TimeInterval,
        waitTime: TimeInterval,
        description: String
    ) {
        self.id = id
        self.percentage = percentage
        self.duration = duration
        self.waitTime = waitTime
        self.description = description
    }
}

public struct SuccessCriteria: Codable {
    public let errorRateThreshold: Double
    public let latencyThreshold: TimeInterval
    public let cpuThreshold: Double
    public let memoryThreshold: Double
    public let customMetrics: [String: Double]

    public init(
        errorRateThreshold: Double,
        latencyThreshold: TimeInterval,
        cpuThreshold: Double,
        memoryThreshold: Double,
        customMetrics: [String: Double] = [:]
    ) {
        self.errorRateThreshold = errorRateThreshold
        self.latencyThreshold = latencyThreshold
        self.cpuThreshold = cpuThreshold
        self.memoryThreshold = memoryThreshold
        self.customMetrics = customMetrics
    }
}

public struct RollbackThresholds: Codable {
    public let errorRate: Double
    public let latency: TimeInterval
    public let crashRate: Double
    public let userComplaints: Int
    public let timeToRollback: TimeInterval

    public init(
        errorRate: Double,
        latency: TimeInterval,
        crashRate: Double,
        userComplaints: Int,
        timeToRollback: TimeInterval
    ) {
        self.errorRate = errorRate
        self.latency = latency
        self.crashRate = crashRate
        self.userComplaints = userComplaints
        self.timeToRollback = timeToRollback
    }
}

public struct CanaryMetrics: Codable {
    public let totalRequests: Int
    public let errorRate: Double
    public let baselineErrorRate: Double
    public let latency: LatencyMetrics
    public let baselineLatency: LatencyMetrics
    public let cpuUsage: Double
    public let memoryUsage: Double
    public let crashRate: Double
    public let userFeedback: UserFeedback

    public static let empty = CanaryMetrics(
        totalRequests: 0,
        errorRate: 0,
        baselineErrorRate: 0,
        latency: LatencyMetrics.empty,
        baselineLatency: LatencyMetrics.empty,
        cpuUsage: 0,
        memoryUsage: 0,
        crashRate: 0,
        userFeedback: UserFeedback.empty
    )

    public init(
        totalRequests: Int,
        errorRate: Double,
        baselineErrorRate: Double,
        latency: LatencyMetrics,
        baselineLatency: LatencyMetrics,
        cpuUsage: Double,
        memoryUsage: Double,
        crashRate: Double,
        userFeedback: UserFeedback
    ) {
        self.totalRequests = totalRequests
        self.errorRate = errorRate
        self.baselineErrorRate = baselineErrorRate
        self.latency = latency
        self.baselineLatency = baselineLatency
        self.cpuUsage = cpuUsage
        self.memoryUsage = memoryUsage
        self.crashRate = crashRate
        self.userFeedback = userFeedback
    }
}

public struct LatencyMetrics: Codable {
    public let p50: Double
    public let p90: Double
    public let p95: Double
    public let p99: Double
    public let average: Double

    public static let empty = LatencyMetrics(
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        average: 0
    )

    public init(
        p50: Double,
        p90: Double,
        p95: Double,
        p99: Double,
        average: Double
    ) {
        self.p50 = p50
        self.p90 = p90
        self.p95 = p95
        self.p99 = p99
        self.average = average
    }
}

public struct UserFeedback: Codable {
    public let positive: Int
    public let negative: Int
    public let neutral: Int
    public let complaints: [String]

    public static let empty = UserFeedback(
        positive: 0,
        negative: 0,
        neutral: 0,
        complaints: []
    )

    public init(
        positive: Int,
        negative: Int,
        neutral: Int,
        complaints: [String]
    ) {
        self.positive = positive
        self.negative = negative
        self.neutral = neutral
        self.complaints = complaints
    }
}

public enum CanaryError: LocalizedError {
    case invalidVersion
    case invalidBaselineVersion
    case sameVersionAndBaseline
    case invalidTrafficPercentage(Int)
    case emptyTrafficSchedule
    case invalidTrafficSchedule
    case smokeTestFailed([TestResult])
    case deploymentFailed(String)

    public var errorDescription: String? {
        switch self {
        case .invalidVersion:
            return "Version cannot be empty"
        case .invalidBaselineVersion:
            return "Baseline version cannot be empty"
        case .sameVersionAndBaseline:
            return "Version and baseline version must be different"
        case .invalidTrafficPercentage(let percentage):
            return "Traffic percentage must be between 0 and 100, got \(percentage)"
        case .emptyTrafficSchedule:
            return "Traffic schedule cannot be empty"
        case .invalidTrafficSchedule:
            return "Traffic schedule must be monotonically increasing"
        case .smokeTestFailed(let results):
            return "Smoke tests failed: \(results.map { $0.errorMessage ?? "Unknown error" }.joined(separator: ", "))"
        case .deploymentFailed(let reason):
            return "Deployment failed: \(reason)"
        }
    }
}

// MARK: - Supporting Services

public class CanaryMetricsCollector {
    public static let shared = CanaryMetricsCollector()

    private init() {}

    public func collectMetrics(
        canaryVersion: String,
        baselineVersion: String
    ) async throws -> CanaryMetrics {
        // In production, collect real metrics from monitoring system
        return CanaryMetrics(
            totalRequests: 10000,
            errorRate: 0.001,
            baselineErrorRate: 0.0008,
            latency: LatencyMetrics(
                p50: 50,
                p90: 120,
                p95: 150,
                p99: 200,
                average: 80
            ),
            baselineLatency: LatencyMetrics(
                p50: 45,
                p90: 110,
                p95: 140,
                p99: 180,
                average: 75
            ),
            cpuUsage: 45.0,
            memoryUsage: 512,
            crashRate: 0.0,
            userFeedback: UserFeedback(
                positive: 95,
                negative: 2,
                neutral: 3,
                complaints: []
            )
        )
    }
}

public class CanaryDeploymentClient {
    public static let shared = CanaryDeploymentClient()

    private init() {}

    public func deployVersion(version: String, environment: DeploymentEnvironment) async throws {
        NSLog("[DeploymentClient] Deploying version \(version) to \(environment)")
        // In production, execute actual deployment
    }

    public func updateTrafficSplit(
        canaryVersion: String,
        baselineVersion: String,
        canaryPercentage: Int
    ) async throws {
        NSLog("[DeploymentClient] Updating traffic split: \(canaryVersion)=\(canaryPercentage)%, \(baselineVersion)=\(100-canaryPercentage)%")
        // In production, update load balancer configuration
    }

    public func runSmokeTests(version: String) async throws -> [DeploymentValidationResult] {
        NSLog("[DeploymentClient] Running smoke tests for version \(version)")
        return [
            DeploymentValidationResult(
                type: .healthCheck,
                passed: true,
                message: "Health Check",
                details: ["OK"]
            ),
            DeploymentValidationResult(
                type: .integrationTest,
                passed: true,
                message: "API Connectivity",
                details: ["OK"]
            ),
            DeploymentValidationResult(
                type: .integrationTest,
                passed: true,
                message: "Database Connection",
                details: ["OK"]
            )
        ]
    }
}

public class CanaryNotificationService {
    public static let shared = CanaryNotificationService()

    private init() {}

    public func sendNotification(title: String, message: String, severity: DeploymentNotificationSeverity) async {
        NSLog("[NotificationService] [\(severity)] \(title): \(message)")
        // In production, send to Slack, email, PagerDuty, etc.
    }
}
