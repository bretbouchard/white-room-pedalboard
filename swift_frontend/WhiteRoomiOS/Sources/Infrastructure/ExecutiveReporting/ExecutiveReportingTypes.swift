import Foundation
import SwiftUI

// MARK: - ExecutiveReporting Central Type Definitions
//
// This file contains all shared types used across the ExecutiveReporting module.
// These types are defined once here to avoid ambiguity and duplication.
//
// All types use the "ER" prefix to clearly indicate they belong to the
// ExecutiveReporting domain and to prevent naming conflicts.

// MARK: - Quality Grades

/// Executive reporting grade for quality assessment
public enum ERGrade: Int, Comparable {
    case plus = 4      // A+ (97-100%)
    case standard = 3  // A  (93-97%)
    case minus = 2     // A- (90-93%)
    case F = 0         // F  (<90%)

    public static func < (lhs: ERGrade, rhs: ERGrade) -> Bool {
        return lhs.rawValue < rhs.rawValue
    }

    public var letter: String {
        switch self {
        case .plus: return "A+"
        case .standard: return "A"
        case .minus: return "A-"
        case .F: return "F"
        }
    }

    public var description: String {
        switch self {
        case .plus: return "Excellent"
        case .standard: return "Good"
        case .minus: return "Acceptable"
        case .F: return "Failing"
        }
    }
}

// MARK: - Trend Directions

/// Direction of a quality or performance trend
public enum ERTrendDirection {
    case improving
    case stable
    case declining

    public var icon: String {
        switch self {
        case .improving: return "arrow.up.right"
        case .stable: return "minus"
        case .declining: return "arrow.down.right"
        }
    }

    public var color: Color {
        switch self {
        case .improving: return .green
        case .stable: return .blue
        case .declining: return .red
        }
    }
}

// MARK: - Quality Trend Data

/// Represents quality metrics at a specific point in time
public struct ERQualityTrend: Identifiable {
    public let id = UUID()
    public let date: Date
    public let metric: ERQualityMetric
    public let value: Double
    public let context: ERTrendContext?

    public init(date: Date, metric: ERQualityMetric, value: Double, context: ERTrendContext? = nil) {
        self.date = date
        self.metric = metric
        self.value = value
        self.context = context
    }
}

/// Quality metrics that can be tracked over time
public enum ERQualityMetric: String, CaseIterable {
    case passRate = "Pass Rate"
    case coverage = "Code Coverage"
    case buildTime = "Build Time"
    case testTime = "Test Time"
    case flakiness = "Flakiness Rate"
    case mttr = "Mean Time To Recovery"

    public var unit: String {
        switch self {
        case .passRate, .coverage, .flakiness: return "%"
        case .buildTime, .testTime: return "s"
        case .mttr: return "min"
        }
    }

    public var target: Double {
        switch self {
        case .passRate: return 95.0
        case .coverage: return 80.0
        case .buildTime: return 300.0  // 5 minutes
        case .testTime: return 180.0   // 3 minutes
        case .flakiness: return 5.0
        case .mttr: return 30.0
        }
    }
}

/// Contextual information about a trend data point
public struct ERTrendContext {
    public let notes: [String]
    public let significantEvents: [String]

    public init(notes: [String] = [], significantEvents: [String] = []) {
        self.notes = notes
        self.significantEvents = significantEvents
    }
}

// MARK: - Deployment Risk

/// Assessment of deployment risk factors
public struct DeploymentRisk {
    public let score: Int              // 0-100 (higher = riskier)
    public let level: RiskLevel
    public let factors: [RiskFactor]

    public init(score: Int, level: RiskLevel, factors: [RiskFactor]) {
        self.score = score
        self.level = level
        self.factors = factors
    }

    public enum RiskLevel: String {
        case low = "Low"
        case medium = "Medium"
        case high = "High"
        case critical = "Critical"

        public var color: Color {
            switch self {
            case .low: return .green
            case .medium: return .orange
            case .high: return .red
            case .critical: return .purple
            }
        }
    }
}

/// Individual risk factor contributing to deployment risk
public struct RiskFactor: Identifiable {
    public let id = UUID()
    public let description: String
    public let impact: Impact
    public let likelihood: Likelihood

    public init(description: String, impact: Impact, likelihood: Likelihood) {
        self.description = description
        self.impact = impact
        self.likelihood = likelihood
    }

    public enum Impact: String {
        case low = "Low"
        case medium = "Medium"
        case high = "High"
        case critical = "Critical"

        public var color: Color {
            switch self {
            case .low: return .green
            case .medium: return .orange
            case .high: return .red
            case .critical: return .purple
            }
        }
    }

    public enum Likelihood: String {
        case low = "Low"
        case medium = "Medium"
        case high = "High"
    }
}

// MARK: - Test Results

/// Summary of test execution results
public struct ERTestResults {
    public let totalTests: Int
    public let passedTests: Int
    public let failedTests: Int
    public let skippedTests: Int
    public let passRate: Double

    public init(totalTests: Int, passedTests: Int, failedTests: Int, skippedTests: Int) {
        self.totalTests = totalTests
        self.passedTests = passedTests
        self.failedTests = failedTests
        self.skippedTests = skippedTests
        self.passRate = totalTests > 0 ? Double(passedTests) / Double(totalTests) * 100 : 0
    }

    public var successRate: Double {
        return passRate
    }

    public var hasFailures: Bool {
        return failedTests > 0
    }
}

// MARK: - Quality Data Points

/// Quality metrics data point for trend visualization
public struct ERQualityDataPoint: Identifiable {
    public let id = UUID()
    public let date: Date
    public let passRate: Double
    public let coverage: Double

    public init(date: Date, passRate: Double, coverage: Double) {
        self.date = date
        self.passRate = passRate
        self.coverage = coverage
    }

    func toChartData() -> ChartData {
        ChartData(
            x: formatDate(date),
            y: passRate,
            series: "Pass Rate"
        )
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

/// Performance metrics data point for trend visualization
public struct ERPerformanceDataPoint: Identifiable {
    public let id = UUID()
    public let date: Date
    public let buildTime: Double
    public let testTime: Double

    public init(date: Date, buildTime: Double, testTime: Double) {
        self.date = date
        self.buildTime = buildTime
        self.testTime = testTime
    }

    func toChartData() -> ChartData {
        ChartData(
            x: formatDate(date),
            y: buildTime,
            series: "Build Time"
        )
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Supporting Types

/// Chart data structure for visualization
public struct ChartData {
    public let x: String
    public let y: Double
    public let series: String

    public init(x: String, y: Double, series: String) {
        self.x = x
        self.y = y
        self.series = series
    }
}

/// Module coverage information
public struct ModuleCoverage: Identifiable {
    public let id = UUID()
    public let module: String
    public let coverage: Double
    public let linesCovered: Int
    public let totalLines: Int

    public init(module: String, coverage: Double, linesCovered: Int, totalLines: Int) {
        self.module = module
        self.coverage = coverage
        self.linesCovered = linesCovered
        self.totalLines = totalLines
    }

    func toChartData() -> ChartData {
        ChartData(
            x: module,
            y: coverage,
            series: "Coverage"
        )
    }
}

/// Performance baseline for comparison
public struct ERPerformanceBaseline {
    public let averageBuildTime: TimeInterval
    public let averageTestTime: TimeInterval
    public let memoryUsage: Int64

    public init(
        averageBuildTime: TimeInterval,
        averageTestTime: TimeInterval,
        memoryUsage: Int64
    ) {
        self.averageBuildTime = averageBuildTime
        self.averageTestTime = averageTestTime
        self.memoryUsage = memoryUsage
    }
}

// MARK: - Type Aliases for Common Combinations

/// Alias for test results with quality metrics
public typealias QualityTestResults = (testResults: ERTestResults, qualityMetrics: QualityMetrics)

/// Quality metrics summary
public struct QualityMetrics {
    public let coverage: Double
    public let passRate: Double
    public let flakyTests: Int

    public init(coverage: Double, passRate: Double, flakyTests: Int) {
        self.coverage = coverage
        self.passRate = passRate
        self.flakyTests = flakyTests
    }
}

// Note: Color type is a placeholder - should be SwiftUI.Color in actual usage
// This file needs to import SwiftUI for Color to work properly
