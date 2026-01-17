//
//  PredictiveAnalyticsTypes.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/17/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation

// MARK: - Common Types for PredictiveAnalytics Module

/// Basic metric data point for analysis
public struct TestMetric: Codable, Sendable {
    let name: String
    let value: Double
    let unit: String?
    let timestamp: Date

    public init(
        name: String,
        value: Double,
        unit: String? = nil,
        timestamp: Date = Date()
    ) {
        self.name = name
        self.value = value
        self.unit = unit
        self.timestamp = timestamp
    }
}

/// Baseline values for comparison
public struct TestBaseline: Codable, Sendable {
    let values: [String: Double] // Expected values for each metric
    let thresholds: [String: Double] // Percentage deviation thresholds
    let sampleCount: Int
    let timestamp: Date

    public init(
        values: [String: Double],
        thresholds: [String: Double],
        sampleCount: Int,
        timestamp: Date
    ) {
        self.values = values
        self.thresholds = thresholds
        self.sampleCount = sampleCount
        self.timestamp = timestamp
    }
}

/// Test result for anomaly detection
public struct AnomalyTestResult: Codable, Sendable {
    let name: String
    let passed: Bool
    let duration: TimeInterval
    let timestamp: Date

    public init(
        name: String,
        passed: Bool,
        duration: TimeInterval,
        timestamp: Date = Date()
    ) {
        self.name = name
        self.passed = passed
        self.duration = duration
        self.timestamp = timestamp
    }
}

/// Generic test result with error information
public struct TestResult: Codable, Sendable {
    let name: String
    let passed: Bool
    let duration: TimeInterval
    let timestamp: Date
    let filePath: String?
    let errorMessage: String?

    public init(
        name: String,
        passed: Bool,
        duration: TimeInterval,
        timestamp: Date = Date(),
        filePath: String? = nil,
        errorMessage: String? = nil
    ) {
        self.name = name
        self.passed = passed
        self.duration = duration
        self.timestamp = timestamp
        self.filePath = filePath
        self.errorMessage = errorMessage
    }
}

/// Test run result collection
public struct TestRunResult: Codable, Sendable {
    let testResults: [AnomalyTestResult]
    let timestamp: Date
    let duration: TimeInterval

    public init(
        testResults: [AnomalyTestResult],
        timestamp: Date = Date(),
        duration: TimeInterval
    ) {
        self.testResults = testResults
        self.timestamp = timestamp
        self.duration = duration
    }
}

// MARK: - Anomaly Detection Types

/// Detected anomaly with severity and recommendations
public struct Anomaly: Codable, Sendable, Identifiable {
    public let id = UUID()
    let type: AnomalyType
    let severity: AnomalySeverity
    let description: String
    let metric: String
    let actualValue: Double
    let expectedValue: Double
    let deviationPercent: Double
    let recommendation: String

    public enum AnomalyType: String, Codable, Sendable {
        case performanceDegradation
        case spikeInFailures
        case unusualPassRate
        case memoryLeak
        case timingAnomaly
    }

    public enum AnomalySeverity: Int, Codable, Sendable {
        case critical = 3
        case warning = 2
        case info = 1
    }
}

/// Sudden change between consecutive test runs
public struct SuddenChange: Codable, Sendable, Identifiable {
    public let id = UUID()
    let testName: String
    let changeType: SuddenChangeType
    let previousValue: Double
    let newValue: Double
    let percentChange: Double
    let severity: Anomaly.AnomalySeverity
    let timestamp: Date

    public enum SuddenChangeType: String, Codable, Sendable {
        case regressed
        case fixed
        case slowed
        case spedUp
    }
}

/// Statistical outlier in a dataset
public struct Outlier: Codable, Sendable, Identifiable {
    public let id = UUID()
    let index: Int
    let value: Double
    let mean: Double
    let deviation: Double
    let standardDeviations: Double
    let severity: OutlierSeverity

    public enum OutlierSeverity: String, Codable, Sendable {
        case moderate
        case extreme
    }
}

// MARK: - Failure Prediction Types

/// Prediction of test failure with confidence
public struct TestFailurePrediction: Codable, Sendable {
    let testName: String
    let failureProbability: Double
    let confidence: Double
    let reasons: [FailureReason]
    let mitigation: String
}

/// Reasons for predicted failure
public enum FailureReason: String, Codable, Sendable {
    case recentlyModified
    case highFlakiness
    case complexDependencies
    case lowCoverage
    case performanceSensitive

    public var description: String {
        switch self {
        case .recentlyModified: return "Test or dependencies recently modified"
        case .highFlakiness: return "Test has high flakiness score"
        case .complexDependencies: return "Test has complex dependency chain"
        case .lowCoverage: return "Low code coverage in tested area"
        case .performanceSensitive: return "Test has performance/timing sensitivity"
        }
    }
}

/// Analysis of test failures
public struct FailureAnalysis: Codable, Sendable {
    let totalTests: Int
    let passedTests: Int
    let failedTests: Int
    let flakyTests: Int
    let passRate: Double
    let failurePatterns: [FailurePattern]
    let newFailures: [String]
    let timestamp: Date
}

/// Pattern of test failures
public struct FailurePattern: Codable, Sendable {
    let type: FailurePatternType
    let description: String
    let affectedTests: [String]
    let severity: PatternSeverity

    public enum FailurePatternType: String, Codable, Sendable {
        case newFailures
        case consistentFailures
        case flakyTests
        case performanceDegradation
    }

    public enum PatternSeverity: String, Codable, Sendable {
        case low
        case medium
        case high
        case critical
    }
}

// MARK: - Quality Scoring Types

/// Quality score with component breakdown
public struct QualityScore: Codable, Sendable {
    let overall: Int
    let testCoverage: Int
    let stability: Int
    let performance: Int
    let accessibility: Int
    let confidence: Double
    let grade: Grade

    public static let empty = QualityScore(
        overall: 0,
        testCoverage: 0,
        stability: 0,
        performance: 0,
        accessibility: 0,
        confidence: 0,
        grade: .standard
    )
}

/// Letter grade modifier
public enum Grade: String, Codable, Sendable {
    case plus
    case standard
    case minus

    public var letter: String {
        switch self {
        case .plus: return "+"
        case .standard: return ""
        case .minus: return "-"
        }
    }
}

/// Quality score prediction
public struct QualityPrediction: Codable, Sendable {
    let currentScore: QualityScore
    let predictedScore: QualityScore
    let scoreDelta: Int
    let impact: ImpactLevel
    let confidence: Double
    let recommendations: [String]
}

/// Level of impact from changes
public enum ImpactLevel: String, Codable, Sendable {
    case significantImprovement
    case moderateImprovement
    case minorImprovement
    case neutral
    case minorDecline
    case moderateDecline
    case significantDecline

    public var description: String {
        switch self {
        case .significantImprovement: return "Significant Improvement"
        case .moderateImprovement: return "Moderate Improvement"
        case .minorImprovement: return "Minor Improvement"
        case .neutral: return "Neutral"
        case .minorDecline: return "Minor Decline"
        case .moderateDecline: return "Moderate Decline"
        case .significantDecline: return "Significant Decline"
        }
    }
}

/// Quality trend over time
public struct QualityTrend: Codable, Sendable {
    let direction: TrendDirection
    let magnitude: Double
    let confidence: Double
}

/// Direction of quality trend
public enum TrendDirection: String, Codable, Sendable {
    case improving
    case stable
    case declining
}

// MARK: - Coverage Analysis Types

/// Coverage snapshot at a point in time
public struct CoverageSnapshot: Codable, Sendable {
    let date: Date
    let overallCoverage: Double
    let moduleCoverage: [String: Double]
    let fileCoverage: [String: Double]

    public init(
        date: Date,
        overallCoverage: Double,
        moduleCoverage: [String: Double],
        fileCoverage: [String: Double]
    ) {
        self.date = date
        self.overallCoverage = overallCoverage
        self.moduleCoverage = moduleCoverage
        self.fileCoverage = fileCoverage
    }
}

/// Detailed coverage trend analysis
public struct CoverageTrend: Codable, Sendable {
    let overallTrend: TrendDirection
    let rateOfChange: Double // % per day
    let projectedDate: Date? // When target will be reached
    let riskAreas: [CodeArea]
    let confidence: Double // 0-1
}

/// Coverage prediction with confidence interval
public struct CoveragePrediction: Codable, Sendable {
    let date: Date
    let predictedCoverage: Double
    let confidenceInterval: ConfidenceInterval
    let confidence: Double

    public struct ConfidenceInterval: Codable, Sendable {
        let lower: Double
        let upper: Double

        public init(lower: Double, upper: Double) {
            self.lower = lower
            self.upper = upper
        }
    }
}

/// Code area with coverage information
public struct CodeArea: Codable, Sendable {
    let name: String
    let type: AreaType
    let oldCoverage: Double
    let newCoverage: Double
    let change: Double // Negative for decline
    let severity: DeclineSeverity

    public enum AreaType: String, Codable, Sendable {
        case module
        case file
    }
}

/// Severity of coverage decline
public enum DeclineSeverity: String, Codable, Sendable {
    case low
    case medium
    case high
    case critical
}

/// Module coverage statistics
public struct ModuleCoverageStatistics: Codable, Sendable {
    let moduleName: String
    let averageCoverage: Double
    let minCoverage: Double
    let maxCoverage: Double
    let trend: TrendDirection
}

/// Comparison between two time periods
public struct PeriodComparison: Codable, Sendable {
    let period1Average: Double
    let period2Average: Double
    let absoluteChange: Double
    let percentChange: Double
    let improved: Bool
}

// MARK: - Risk Assessment Types

/// Code changes for risk assessment
public struct CodeChanges: Codable, Sendable {
    let changedFiles: [String]
    let linesChanged: Int
    let filesAdded: Int
    let filesDeleted: Int
    let apiChanges: Int
    let dependencyChanges: Int
    let hasDatabaseMigrations: Bool

    public init(
        changedFiles: [String],
        linesChanged: Int,
        filesAdded: Int = 0,
        filesDeleted: Int = 0,
        apiChanges: Int = 0,
        dependencyChanges: Int = 0,
        hasDatabaseMigrations: Bool = false
    ) {
        self.changedFiles = changedFiles
        self.linesChanged = linesChanged
        self.filesAdded = filesAdded
        self.filesDeleted = filesDeleted
        self.apiChanges = apiChanges
        self.dependencyChanges = dependencyChanges
        self.hasDatabaseMigrations = hasDatabaseMigrations
    }
}

/// Test results for risk assessment
public struct TestResults: Codable, Sendable {
    let coveragePercentage: Double
    let coveredFiles: Set<String>
    let failureRate: Double
    let averageTestDuration: TimeInterval
    let performanceChange: Double? // Percentage change from baseline
    let platformTestCoverage: Double

    public init(
        coveragePercentage: Double,
        coveredFiles: Set<String>,
        failureRate: Double,
        averageTestDuration: TimeInterval,
        performanceChange: Double? = nil,
        platformTestCoverage: Double = 1.0
    ) {
        self.coveragePercentage = coveragePercentage
        self.coveredFiles = coveredFiles
        self.failureRate = failureRate
        self.averageTestDuration = averageTestDuration
        self.performanceChange = performanceChange
        self.platformTestCoverage = platformTestCoverage
    }
}

/// Deployment risk assessment
public struct DeploymentRisk: Codable, Sendable {
    let overall: RiskLevel
    let testCoverageRisk: RiskLevel
    let performanceRisk: RiskLevel
    let securityRisk: RiskLevel
    let compatibilityRisk: RiskLevel
    let factors: [RiskFactor]
    let mitigations: [String]
}

/// Risk level with description and emoji
public enum RiskLevel: Int, Codable, Sendable {
    case low = 1
    case medium = 2
    case high = 3
    case critical = 4

    public init(score: Int) {
        switch score {
        case let s where s <= 40:
            self = .critical
        case let s where s <= 60:
            self = .high
        case let s where s <= 75:
            self = .medium
        default:
            self = .low
        }
    }

    public var description: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .critical: return "Critical"
        }
    }

    public var emoji: String {
        switch self {
        case .low: return "🟢"
        case .medium: return "🟡"
        case .high: return "🟠"
        case .critical: return "🔴"
        }
    }
}

/// Individual risk factor
public struct RiskFactor: Codable, Sendable, Identifiable {
    public let id = UUID()
    let name: String
    let level: RiskLevel
    let weight: Double
    let description: String
    let impact: String
}

/// Risk report with detailed analysis
public struct RiskReport: Codable, Sendable {
    let overallRisk: RiskLevel
    let summary: String
    let riskMatrix: String
    let factors: [RiskFactor]
    let mitigations: [String]
    let recommendations: [String]
    let generatedAt: Date
}

/// Overall risk assessment
public struct RiskAssessment: Codable, Sendable {
    let overallRisk: RiskLevel
    let factors: [RiskFactor]
    let recommendations: [String]
    let confidence: Double
    let timestamp: Date
}
