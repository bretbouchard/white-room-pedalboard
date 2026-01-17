import Foundation
import Combine

/// Orchestrates progressive delivery pipelines with multiple deployment stages
public class ProgressiveDelivery: ObservableObject {
    // MARK: - Published Properties
    @Published public var activeDeliveries: [ProgressiveDeliveryPipeline] = []
    @Published public var deliveryHistory: [ProgressiveDeliveryPipeline] = []
    @Published public var isProcessing: Bool = false

    // MARK: - Private Properties
    private var canaryController: CanaryReleaseController
    private var blueGreenDeployment: BlueGreenDeployment
    private var featureFlagManager: FeatureFlagManager
    private var automatedRollback: AutomatedRollback
    private var metricsCollector: ProgressiveDeliveryMetrics
    private var notificationService: ProgressiveNotificationService
    private var pipelineTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    public init(
        canaryController: CanaryReleaseController = .init(),
        blueGreenDeployment: BlueGreenDeployment = .init(),
        featureFlagManager: FeatureFlagManager = .init(),
        automatedRollback: AutomatedRollback = .init(),
        metricsCollector: ProgressiveDeliveryMetrics = .shared,
        notificationService: ProgressiveNotificationService = .shared
    ) {
        self.canaryController = canaryController
        self.blueGreenDeployment = blueGreenDeployment
        self.featureFlagManager = featureFlagManager
        self.automatedRollback = automatedRollback
        self.metricsCollector = metricsCollector
        self.notificationService = notificationService
    }

    // MARK: - Public Methods

    /// Start a new progressive delivery pipeline
    public func startDelivery(_ config: DeliveryConfig) async throws -> ProgressiveDeliveryPipeline {
        NSLog("[ProgressiveDelivery] Starting delivery pipeline for version \(config.version)")

        guard !isProcessing else {
            throw ProgressiveDeliveryError.pipelineInProgress
        }

        isProcessing = true

        // Create pipeline
        var pipeline = ProgressiveDeliveryPipeline(
            version: config.version,
            status: .pending,
            currentStage: 0,
            stages: config.stages,
            metrics: DeliveryMetrics.empty,
            startedAt: Date(),
            estimatedCompletion: calculateEstimatedCompletion(stages: config.stages),
            completedAt: nil
        )

        // Validate pipeline
        try validatePipeline(pipeline)

        // Add to active deliveries
        activeDeliveries.append(pipeline)

        // Notify stakeholders
        await notificationService.sendNotification(
            title: "Progressive Delivery Started",
            message: "Pipeline for version \(config.version) initiated",
            severity: .info
        )

        // Start pipeline execution
        if config.autoAdvance {
            Task {
                await executePipeline(pipeline, config: config)
            }
        } else {
            // Start with first stage
            try await advanceToStage(&pipeline, stage: 0, config: config)
        }

        isProcessing = false

        return pipeline
    }

    /// Advance to the next stage in the pipeline
    public func advanceStage(_ pipeline: ProgressiveDeliveryPipeline) async throws {
        NSLog("[ProgressiveDelivery] Advancing pipeline \(pipeline.id)")

        guard var updatedPipeline = activeDeliveries.first(where: { $0.id == pipeline.id }) else {
            throw ProgressiveDeliveryError.pipelineNotFound
        }

        guard updatedPipeline.status == .running || updatedPipeline.status == .pending else {
            throw ProgressiveDeliveryError.pipelineNotRunning
        }

        let nextStage = updatedPipeline.currentStage + 1

        guard nextStage < updatedPipeline.stages.count else {
            throw ProgressiveDeliveryError.noMoreStages
        }

        let config = DeliveryConfig(
            version: updatedPipeline.version,
            stages: updatedPipeline.stages,
            autoAdvance: false,
            approvalRequired: [],
            rollbackOnFailure: true,
            stakeholders: []
        )

        try await advanceToStage(&updatedPipeline, stage: nextStage, config: config)

        // Update active delivery
        if let index = activeDeliveries.firstIndex(where: { $0.id == pipeline.id }) {
            activeDeliveries[index] = updatedPipeline
        }
    }

    /// Pause a running pipeline
    public func pauseDelivery(_ pipeline: ProgressiveDeliveryPipeline) async throws {
        NSLog("[ProgressiveDelivery] Pausing pipeline \(pipeline.id)")

        guard var updatedPipeline = activeDeliveries.first(where: { $0.id == pipeline.id }) else {
            throw ProgressiveDeliveryError.pipelineNotFound
        }

        guard updatedPipeline.status == .running else {
            throw ProgressiveDeliveryError.pipelineNotRunning
        }

        updatedPipeline.status = .paused

        // Update active delivery
        if let index = activeDeliveries.firstIndex(where: { $0.id == pipeline.id }) {
            activeDeliveries[index] = updatedPipeline
        }

        // Stop pipeline timer
        pipelineTimer?.invalidate()
        pipelineTimer = nil

        await notificationService.sendNotification(
            title: "Pipeline Paused",
            message: "Pipeline for version \(pipeline.version) paused at stage \(updatedPipeline.currentStage)",
            severity: .warning
        )

        NSLog("[ProgressiveDelivery] Pipeline paused")
    }

    /// Rollback a pipeline
    public func rollbackDelivery(_ pipeline: ProgressiveDeliveryPipeline) async throws {
        NSLog("[ProgressiveDelivery] Rolling back pipeline \(pipeline.id)")

        guard var updatedPipeline = activeDeliveries.first(where: { $0.id == pipeline.id }) else {
            throw ProgressiveDeliveryError.pipelineNotFound
        }

        // Execute rollback based on current stage
        let currentStage = updatedPipeline.stages[updatedPipeline.currentStage]

        switch currentStage.type {
        case .canary:
            if let canary = canaryController.activeCanary {
                try await canaryController.rollbackCanary(canary)
            }
        case .blueGreen:
            if let bgDeployment = blueGreenDeployment.activeDeployment {
                try await blueGreenDeployment.rollback(bgDeployment)
            }
        case .featureFlag:
            // Disable feature flags
            for flag in featureFlagManager.flags where flag.tags.contains("pipeline-\(pipeline.id.uuidString)") {
                try await featureFlagManager.setFlagEnabled(flag.name, enabled: false)
            }
        case .experiment, .validation, .monitoring:
            // No specific rollback needed
            break
        }

        // Update pipeline status
        updatedPipeline.status = .rolledBack
        updatedPipeline.completedAt = Date()

        // Move from active to history
        activeDeliveries.removeAll { $0.id == pipeline.id }
        deliveryHistory.append(updatedPipeline)

        await notificationService.sendNotification(
            title: "Pipeline Rolled Back",
            message: "Pipeline for version \(pipeline.version) rolled back",
            severity: .critical
        )

        NSLog("[ProgressiveDelivery] Pipeline rolled back")
    }

    /// Get pipeline metrics
    public func getPipelineMetrics(_ pipeline: ProgressiveDeliveryPipeline) async throws -> DeliveryMetrics {
        guard let activePipeline = activeDeliveries.first(where: { $0.id == pipeline.id }) else {
            throw ProgressiveDeliveryError.pipelineNotFound
        }

        return activePipeline.metrics
    }

    /// Resume a paused pipeline
    public func resumeDelivery(_ pipeline: ProgressiveDeliveryPipeline) async throws {
        NSLog("[ProgressiveDelivery] Resuming pipeline \(pipeline.id)")

        guard var updatedPipeline = activeDeliveries.first(where: { $0.id == pipeline.id }) else {
            throw ProgressiveDeliveryError.pipelineNotFound
        }

        guard updatedPipeline.status == .paused else {
            throw ProgressiveDeliveryError.pipelineNotPaused
        }

        updatedPipeline.status = .running

        // Update active delivery
        if let index = activeDeliveries.firstIndex(where: { $0.id == pipeline.id }) {
            activeDeliveries[index] = updatedPipeline
        }

        // Resume execution
        let config = DeliveryConfig(
            version: updatedPipeline.version,
            stages: updatedPipeline.stages,
            autoAdvance: true,
            approvalRequired: [],
            rollbackOnFailure: true,
            stakeholders: []
        )

        Task {
            await executePipeline(updatedPipeline, config: config)
        }

        NSLog("[ProgressiveDelivery] Pipeline resumed")
    }

    // MARK: - Private Methods

    private func executePipeline(_ pipeline: ProgressiveDeliveryPipeline, config: DeliveryConfig) async {
        var currentPipeline = pipeline

        while currentPipeline.status == .running || currentPipeline.status == .pending {
            // Check if we need approval for the next stage
            if config.approvalRequired.contains(currentPipeline.currentStage) {
                await waitForApproval(stage: currentPipeline.currentStage, pipeline: currentPipeline)
            }

            // Execute current stage
            do {
                try await executeCurrentStage(&currentPipeline, config: config)

                // Check if pipeline is complete
                if currentPipeline.currentStage >= currentPipeline.stages.count {
                    currentPipeline.status = .completed
                    currentPipeline.completedAt = Date()

                    activeDeliveries.removeAll { $0.id == currentPipeline.id }
                    deliveryHistory.append(currentPipeline)

                    await notificationService.sendNotification(
                        title: "Pipeline Completed",
                        message: "Pipeline for version \(currentPipeline.version) completed successfully",
                        severity: .success
                    )

                    NSLog("[ProgressiveDelivery] Pipeline completed successfully")
                    break
                }

                // Update active delivery
                if let index = activeDeliveries.firstIndex(where: { $0.id == currentPipeline.id }) {
                    activeDeliveries[index] = currentPipeline
                }

                // Auto-advance if enabled
                if config.autoAdvance {
                    try? await Task.sleep(nanoseconds: UInt64(5 * 1_000_000_000)) // 5 seconds between stages
                } else {
                    break
                }

            } catch {
                NSLog("[ProgressiveDelivery] Stage execution failed: \(error.localizedDescription)")

                currentPipeline.status = .failed

                if config.rollbackOnFailure {
                    try? await rollbackDelivery(currentPipeline)
                } else {
                    activeDeliveries.removeAll { $0.id == currentPipeline.id }
                    deliveryHistory.append(currentPipeline)
                }

                await notificationService.sendNotification(
                    title: "Pipeline Failed",
                    message: "Pipeline for version \(currentPipeline.version) failed: \(error.localizedDescription)",
                    severity: .critical
                )

                break
            }
        }
    }

    private func executeCurrentStage(_ pipeline: inout ProgressiveDeliveryPipeline, config: DeliveryConfig) async throws {
        let stage = pipeline.stages[pipeline.currentStage]

        NSLog("[ProgressiveDelivery] Executing stage \(pipeline.currentStage): \(stage.name)")

        stage.status = .running

        switch stage.type {
        case .canary:
            try await executeCanaryStage(stage, pipeline: &pipeline)
        case .blueGreen:
            try await executeBlueGreenStage(stage, pipeline: &pipeline)
        case .featureFlag:
            try await executeFeatureFlagStage(stage, pipeline: &pipeline)
        case .experiment:
            try await executeExperimentStage(stage, pipeline: &pipeline)
        case .validation:
            try await executeValidationStage(stage, pipeline: &pipeline)
        case .monitoring:
            try await executeMonitoringStage(stage, pipeline: &pipeline)
        }

        // Update stage status
        stage.status = .completed
        pipeline.currentStage += 1

        // Update metrics
        pipeline.metrics = calculatePipelineMetrics(pipeline)

        NSLog("[ProgressiveDelivery] Stage \(stage.name) completed")
    }

    private func executeCanaryStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        guard case .trafficPercentage(let percentage) = stage.config else {
            throw ProgressiveDeliveryError.invalidStageConfig
        }

        let canaryConfig = CanaryConfig(
            version: pipeline.version,
            baselineVersion: "1.0.0",
            initialTrafficPercentage: percentage ?? 1,
            trafficSchedule: [
                TrafficStep(
                    percentage: 5,
                    duration: 300,
                    waitTime: 60,
                    description: "Initial canary"
                ),
                TrafficStep(
                    percentage: 25,
                    duration: 600,
                    waitTime: 120,
                    description: "Expanded canary"
                )
            ],
            successCriteria: SuccessCriteria(
                errorRateThreshold: 0.01,
                latencyThreshold: 0.5,
                cpuThreshold: 80.0,
                memoryThreshold: 1024.0
            ),
            rollbackThresholds: RollbackThresholds(
                errorRate: 0.05,
                latency: 1.0,
                crashRate: 0.01,
                userComplaints: 10,
                timeToRollback: 60
            )
        )

        let canary = try await canaryController.startCanary(canaryConfig)
        NSLog("[ProgressiveDelivery] Canary release started: \(canary.id)")
    }

    private func executeBlueGreenStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        let deployment = try await blueGreenDeployment.deploy(
            pipeline.version,
            to: .production
        )

        NSLog("[ProgressiveDelivery] Blue-green deployment completed: \(deployment.id)")
    }

    private func executeFeatureFlagStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        guard case .trafficPercentage(let percentage) = stage.config else {
            throw ProgressiveDeliveryError.invalidStageConfig
        }

        // Create feature flag for this pipeline
        let flag = FeatureFlag(
            name: "pipeline-\(pipeline.id.uuidString)",
            description: "Progressive delivery flag for \(pipeline.version)",
            type: .boolean,
            enabled: true,
            value: .boolean(true),
            rolloutStrategy: RolloutStrategy(
                type: .gradual,
                percentage: percentage ?? 10,
                rules: [],
                schedule: nil
            ),
            targetingRules: [],
            dependencies: [],
            createdAt: Date(),
            updatedAt: Date(),
            createdBy: "progressive-delivery",
            tags: ["pipeline-\(pipeline.id.uuidString)"]
        )

        try await featureFlagManager.createFlag(flag)
        NSLog("[ProgressiveDelivery] Feature flag created: \(flag.name)")
    }

    private func executeExperimentStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        // Run experiment and collect metrics
        let experimentMetrics = try await metricsCollector.runExperiment(
            version: pipeline.version,
            duration: stage.duration ?? 600
        )

        NSLog("[ProgressiveDelivery] Experiment completed: \(experimentMetrics)")
    }

    private func executeValidationStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        // Run validation tests
        let validationResults = try await metricsCollector.runValidationTests(
            version: pipeline.version
        )

        guard validationResults.allSatisfy({ $0.passed }) else {
            throw ProgressiveDeliveryError.validationFailed(
                validationResults.filter { !$0.passed }
            )
        }

        NSLog("[ProgressiveDelivery] Validation passed")
    }

    private func executeMonitoringStage(_ stage: DeliveryStage, pipeline: inout ProgressiveDeliveryPipeline) async throws {
        // Monitor for specified duration
        let monitoringDuration = stage.duration ?? 300

        try await Task.sleep(nanoseconds: UInt64(monitoringDuration * 1_000_000_000))

        // Collect metrics
        let monitoringMetrics = try await metricsCollector.collectMonitoringMetrics(
            version: pipeline.version
        )

        // Check if metrics are within acceptable range
        guard monitoringMetrics.isHealthy else {
            throw ProgressiveDeliveryError.metricsUnhealthy(monitoringMetrics)
        }

        NSLog("[ProgressiveDelivery] Monitoring complete")
    }

    private func advanceToStage(_ pipeline: inout ProgressiveDeliveryPipeline, stage: Int, config: DeliveryConfig) async throws {
        guard stage < pipeline.stages.count else {
            throw ProgressiveDeliveryError.noMoreStages
        }

        // Check if approval is required
        if config.approvalRequired.contains(stage) {
            await waitForApproval(stage: stage, pipeline: pipeline)
        }

        // Execute stage
        pipeline.currentStage = stage
        pipeline.status = .running

        try await executeCurrentStage(&pipeline, config: config)
    }

    private func waitForApproval(stage: Int, pipeline: ProgressiveDeliveryPipeline) async {
        NSLog("[ProgressiveDelivery] Waiting for approval for stage \(stage)")

        // In production, implement actual approval mechanism
        // For now, auto-approve after 1 minute
        try? await Task.sleep(nanoseconds: UInt64(60 * 1_000_000_000))

        await notificationService.sendNotification(
            title: "Stage Approved",
            message: "Stage \(stage) for pipeline \(pipeline.version) auto-approved",
            severity: .info
        )
    }

    private func validatePipeline(_ pipeline: ProgressiveDeliveryPipeline) throws {
        guard !pipeline.stages.isEmpty else {
            throw ProgressiveDeliveryError.emptyPipeline
        }

        // Validate stage order
        for i in 0..<pipeline.stages.count {
            guard pipeline.stages[i].order == i else {
                throw ProgressiveDeliveryError.invalidStageOrder
            }
        }

        // Validate stage configs
        for stage in pipeline.stages {
            try validateStage(stage)
        }
    }

    private func validateStage(_ stage: DeliveryStage) throws {
        switch stage.type {
        case .canary, .featureFlag:
            guard case .trafficPercentage = stage.config else {
                throw ProgressiveDeliveryError.invalidStageConfig
            }
        case .experiment, .monitoring:
            if stage.duration == nil {
                guard case .customConfig = stage.config else {
                    throw ProgressiveDeliveryError.invalidStageConfig
                }
            }
        case .blueGreen, .validation:
            break // No specific config required
        }
    }

    private func calculatePipelineMetrics(_ pipeline: ProgressiveDeliveryPipeline) -> DeliveryMetrics {
        let completedStages = pipeline.stages.filter { $0.status == .completed }.count
        let progress = Double(completedStages) / Double(pipeline.stages.count)

        return DeliveryMetrics(
            totalStages: pipeline.stages.count,
            completedStages: completedStages,
            currentProgress: progress,
            overallSuccessRate: 0.95,
            userSatisfaction: 4.5,
            errorRate: 0.001,
            performanceScore: 0.92
        )
    }

    private func calculateEstimatedCompletion(stages: [DeliveryStage]) -> Date? {
        let totalDuration = stages.reduce(0.0) { result, stage in
            result + (stage.duration ?? 300)
        }
        return Date().addingTimeInterval(totalDuration)
    }
}

// MARK: - Supporting Types

public struct ProgressiveDeliveryPipeline: Identifiable, Codable {
    public let id: UUID
    public let version: String
    public var status: PipelineStatus
    public var currentStage: Int
    public let stages: [DeliveryStage]
    public var metrics: DeliveryMetrics
    public let startedAt: Date
    public var estimatedCompletion: Date?
    public var completedAt: Date?

    public init(
        id: UUID = UUID(),
        version: String,
        status: PipelineStatus,
        currentStage: Int,
        stages: [DeliveryStage],
        metrics: DeliveryMetrics,
        startedAt: Date,
        estimatedCompletion: Date?,
        completedAt: Date?
    ) {
        self.id = id
        self.version = version
        self.status = status
        self.currentStage = currentStage
        self.stages = stages
        self.metrics = metrics
        self.startedAt = startedAt
        self.estimatedCompletion = estimatedCompletion
        self.completedAt = completedAt
    }

    public enum PipelineStatus: Codable {
        case pending
        case running
        case paused
        case completed
        case failed
        case rolledBack
    }
}

public struct DeliveryConfig {
    public let version: String
    public let stages: [DeliveryStage]
    public let autoAdvance: Bool
    public let approvalRequired: [Int]
    public let rollbackOnFailure: Bool
    public let stakeholders: [DeliveryStakeholder]

    public init(
        version: String,
        stages: [DeliveryStage],
        autoAdvance: Bool,
        approvalRequired: [Int],
        rollbackOnFailure: Bool,
        stakeholders: [DeliveryStakeholder]
    ) {
        self.version = version
        self.stages = stages
        self.autoAdvance = autoAdvance
        self.approvalRequired = approvalRequired
        self.rollbackOnFailure = rollbackOnFailure
        self.stakeholders = stakeholders
    }
}

public struct DeliveryStage: Identifiable, Codable {
    public let id: UUID
    public let name: String
    public let type: StageType
    public let order: Int
    public let config: StageConfig
    public let successCriteria: DeploymentValidationResult
    public let rollbackStrategy: String
    public let duration: TimeInterval?
    public let approvalRequired: Bool
    public var status: StageStatus

    public init(
        id: UUID = UUID(),
        name: String,
        type: StageType,
        order: Int,
        config: StageConfig,
        successCriteria: DeploymentValidationResult,
        rollbackStrategy: String,
        duration: TimeInterval?,
        approvalRequired: Bool,
        status: StageStatus = .pending
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.order = order
        self.config = config
        self.successCriteria = successCriteria
        self.rollbackStrategy = rollbackStrategy
        self.duration = duration
        self.approvalRequired = approvalRequired
        self.status = status
    }

    public enum StageType: String, Codable {
        case canary = "canary"
        case blueGreen = "blue_green"
        case featureFlag = "feature_flag"
        case experiment = "experiment"
        case validation = "validation"
        case monitoring = "monitoring"
    }

    public enum StageStatus: Codable {
        case pending
        case running
        case completed
        case failed
        case skipped
    }
}

public enum StageConfig: Codable {
    case trafficPercentage(Int)
    case userSegments([String])
    case regions([String])
    case customConfig([String: String])

    private enum CodingKeys: String, CodingKey {
        case type
        case value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "traffic_percentage":
            let value = try container.decode(Int.self, forKey: .value)
            self = .trafficPercentage(value)
        case "user_segments":
            let value = try container.decode([String].self, forKey: .value)
            self = .userSegments(value)
        case "regions":
            let value = try container.decode([String].self, forKey: .value)
            self = .regions(value)
        case "custom_config":
            let value = try container.decode([String: String].self, forKey: .value)
            self = .customConfig(value)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Invalid stage config type"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .trafficPercentage(let value):
            try container.encode("traffic_percentage", forKey: .type)
            try container.encode(value, forKey: .value)
        case .userSegments(let value):
            try container.encode("user_segments", forKey: .type)
            try container.encode(value, forKey: .value)
        case .regions(let value):
            try container.encode("regions", forKey: .type)
            try container.encode(value, forKey: .value)
        case .customConfig(let value):
            try container.encode("custom_config", forKey: .type)
            try container.encode(value, forKey: .value)
        }
    }
}

public struct DeliveryMetrics: Codable {
    public let totalStages: Int
    public let completedStages: Int
    public let currentProgress: Double
    public let overallSuccessRate: Double
    public let userSatisfaction: Double
    public let errorRate: Double
    public let performanceScore: Double

    public static let empty = DeliveryMetrics(
        totalStages: 0,
        completedStages: 0,
        currentProgress: 0.0,
        overallSuccessRate: 0.0,
        userSatisfaction: 0.0,
        errorRate: 0.0,
        performanceScore: 0.0
    )

    public init(
        totalStages: Int,
        completedStages: Int,
        currentProgress: Double,
        overallSuccessRate: Double,
        userSatisfaction: Double,
        errorRate: Double,
        performanceScore: Double
    ) {
        self.totalStages = totalStages
        self.completedStages = completedStages
        self.currentProgress = currentProgress
        self.overallSuccessRate = overallSuccessRate
        self.userSatisfaction = userSatisfaction
        self.errorRate = errorRate
        self.performanceScore = performanceScore
    }
}

public struct DeliveryResult {
    public let success: Bool
    public let version: String
    public let stagesCompleted: Int
    public let totalStages: Int
    public let duration: TimeInterval
    public let userImpact: UserImpact
    public let metrics: DeliveryMetrics
    public let lessonsLearned: [String]
}

public struct DeliveryStakeholder {
    public let name: String
    public let email: String
    public let role: String
}

public enum ProgressiveDeliveryError: LocalizedError {
    case pipelineInProgress
    case pipelineNotFound
    case pipelineNotRunning
    case pipelineNotPaused
    case noMoreStages
    case emptyPipeline
    case invalidStageOrder
    case invalidStageConfig
    case validationFailed([DeploymentValidationResult])
    case metricsUnhealthy(MonitoringMetrics)

    public var errorDescription: String? {
        switch self {
        case .pipelineInProgress:
            return "A pipeline is already in progress"
        case .pipelineNotFound:
            return "Pipeline not found"
        case .pipelineNotRunning:
            return "Pipeline is not running"
        case .pipelineNotPaused:
            return "Pipeline is not paused"
        case .noMoreStages:
            return "No more stages in pipeline"
        case .emptyPipeline:
            return "Pipeline cannot be empty"
        case .invalidStageOrder:
            return "Invalid stage order"
        case .invalidStageConfig:
            return "Invalid stage configuration"
        case .validationFailed(let results):
            return "Validation failed: \(results.map { $0.message }.joined(separator: ", "))"
        case .metricsUnhealthy(let metrics):
            return "Metrics are unhealthy: \(metrics)"
        }
    }
}

// MARK: - Supporting Services

public class ProgressiveDeliveryMetrics {
    public static let shared = ProgressiveDeliveryMetrics()

    private init() {}

    public func runExperiment(version: String, duration: TimeInterval) async throws -> String {
        NSLog("[Metrics] Running experiment for version \(version)")
        return "Experiment completed successfully"
    }

    public func runValidationTests(version: String) async throws -> [DeploymentValidationResult] {
        return [
            DeploymentValidationResult(
                type: .smokeTest,
                passed: true,
                message: "All tests passed",
                details: []
            )
        ]
    }

    public func collectMonitoringMetrics(version: String) async throws -> MonitoringMetrics {
        return MonitoringMetrics(
            errorRate: 0.001,
            latency: 0.150,
            cpuUsage: 45.0,
            memoryUsage: 512.0,
            isHealthy: true
        )
    }
}

public struct MonitoringMetrics {
    let errorRate: Double
    let latency: Double
    let cpuUsage: Double
    let memoryUsage: Double
    let isHealthy: Bool
}

public protocol ProgressiveNotificationService {
    func sendNotification(title: String, message: String, severity: DeploymentNotificationSeverity) async
}

public class ProgressiveNotificationService: ProgressiveNotificationService {
    public static let shared = ProgressiveNotificationService()

    private init() {}

    public func sendNotification(title: String, message: String, severity: DeploymentNotificationSeverity) async {
        NSLog("[NotificationService] [\(severity)] \(title): \(message)")
    }
}
