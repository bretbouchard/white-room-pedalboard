//
//  AnomalyDetector.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/16/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation
import Combine

/// Detects anomalies in test results and performance metrics
/// Uses statistical analysis and machine learning for outlier detection
public actor AnomalyDetector {

    // MARK: - Types

    public typealias MetricName = String

    // MARK: - Properties

    private var baselineMetrics: [MetricName: [Double]] = [:]
    private var historicalBaselines: [TestBaseline] = []

    // Detection thresholds
    private let defaultStandardDeviationThreshold: Double = 3.0
    private let defaultPercentageThreshold: Double = 20.0 // 20% deviation
    private let minBaselineSamples = 5

    // MARK: - Initialization

    public init() {}

    // MARK: - Public Methods

    /// Detect anomalies in current test metrics compared to baseline
    /// - Parameters:
    ///   - metrics: Current test metrics to analyze
    ///   - baseline: Established baseline for comparison
    /// - Returns: Array of detected anomalies
    public func detectAnomalies(
        in metrics: [TestMetric],
        baseline: TestBaseline
    ) -> [Anomaly] {

        var anomalies: [Anomaly] = []

        for metric in metrics {
            // Get expected value from baseline
            guard let expectedValue = baseline.values[metric.name] else {
                continue
            }

            // Calculate deviation
            let actualValue = metric.value
            let deviationPercent = expectedValue > 0 ?
                abs((actualValue - expectedValue) / expectedValue) * 100 : 0

            // Check if deviation exceeds threshold
            let threshold = baseline.thresholds[metric.name] ?? defaultPercentageThreshold

            if deviationPercent > threshold {
                // Determine anomaly type
                let type = determineAnomalyType(
                    metricName: metric.name,
                    actualValue: actualValue,
                    expectedValue: expectedValue
                )

                // Determine severity
                let severity = determineSeverity(
                    deviationPercent: deviationPercent,
                    type: type
                )

                let anomaly = Anomaly(
                    type: type,
                    severity: severity,
                    description: generateDescription(
                        metricName: metric.name,
                        actualValue: actualValue,
                        expectedValue: expectedValue,
                        deviationPercent: deviationPercent
                    ),
                    metric: metric.name,
                    actualValue: actualValue,
                    expectedValue: expectedValue,
                    deviationPercent: deviationPercent,
                    recommendation: generateRecommendation(type: type, severity: severity)
                )

                anomalies.append(anomaly)
            }
        }

        return anomalies.sorted { $0.severity.rawValue > $1.severity.rawValue }
    }

    /// Detect sudden changes between consecutive test runs
    /// - Parameters:
    ///   - current: Current test run results
    ///   - previous: Previous test run results
    /// - Returns: Array of sudden changes detected
    public func detectSuddenChanges(
        current: TestRunResult,
        previous: TestRunResult
    ) -> [SuddenChange] {

        var changes: [SuddenChange] = []

        // Compare test results
        for testResult in current.testResults {
            let previousResult = previous.testResults.first { $0.name == testResult.name }

            guard let previous = previousResult else {
                // New test - not necessarily an anomaly
                continue
            }

            // Check for status change
            if testResult.passed != previous.passed {
                let changeType = testResult.passed ? SuddenChange.SuddenChangeType.fixed : SuddenChange.SuddenChangeType.regressed
                let severity = testResult.passed ? Anomaly.AnomalySeverity.info : Anomaly.AnomalySeverity.critical

                changes.append(
                    SuddenChange(
                        testName: testResult.name,
                        changeType: changeType,
                        previousValue: previous.passed ? 1.0 : 0.0,
                        newValue: testResult.passed ? 1.0 : 0.0,
                        percentChange: testResult.passed ? Double.infinity : -Double.infinity,
                        severity: severity,
                        timestamp: testResult.timestamp
                    )
                )
            }

            // Check for performance changes
            let durationChange = testResult.duration - previous.duration
            let durationPercentChange = previous.duration > 0 ?
                (durationChange / previous.duration) * 100 : 0

            if abs(durationPercentChange) > 30 { // 30% threshold
                let changeType = durationChange > 0 ? SuddenChange.SuddenChangeType.slowed : SuddenChange.SuddenChangeType.spedUp
                let severity = abs(durationPercentChange) > 50 ? Anomaly.AnomalySeverity.warning : Anomaly.AnomalySeverity.info

                changes.append(
                    SuddenChange(
                        testName: testResult.name,
                        changeType: changeType,
                        previousValue: previous.duration,
                        newValue: testResult.duration,
                        percentChange: durationPercentChange,
                        severity: severity,
                        timestamp: testResult.timestamp
                    )
                )
            }
        }

        return changes
    }

    /// Detect statistical outliers in a dataset
    /// - Parameters:
    ///   - dataPoints: Array of numerical values
    ///   - standardDeviations: Number of standard deviations for threshold (default 3)
    /// - Returns: Array of detected outliers
    public func detectOutliers(
        in dataPoints: [Double],
        standardDeviations: Double = 3.0
    ) -> [Outlier] {

        guard dataPoints.count >= 3 else { return [] }

        let mean = dataPoints.reduce(0, +) / Double(dataPoints.count)
        let variance = dataPoints.map { pow($0 - mean, 2) }.reduce(0, +) / Double(dataPoints.count)
        let stdDev = sqrt(variance)

        let threshold = standardDeviations * stdDev
        var outliers: [Outlier] = []

        for (index, value) in dataPoints.enumerated() {
            let deviation = abs(value - mean)

            if deviation > threshold {
                let severity = deviation > (2 * threshold) ? Outlier.OutlierSeverity.extreme : Outlier.OutlierSeverity.moderate

                outliers.append(
                    Outlier(
                        index: index,
                        value: value,
                        mean: mean,
                        deviation: deviation,
                        standardDeviations: deviation / stdDev,
                        severity: severity
                    )
                )
            }
        }

        return outliers
    }

    /// Build or update baseline metrics from historical data
    /// - Parameter metrics: Array of metric samples to establish baseline
    /// - Returns: Updated test baseline
    public func buildBaseline(
        from metrics: [[TestMetric]]
    ) -> TestBaseline {

        var aggregatedValues: [MetricName: [Double]] = [:]
        var thresholds: [MetricName: Double] = [:]

        // Aggregate all metric values
        for metricSet in metrics {
            for metric in metricSet {
                if aggregatedValues[metric.name] == nil {
                    aggregatedValues[metric.name] = []
                }
                aggregatedValues[metric.name]?.append(metric.value)
            }
        }

        // Calculate baseline values and thresholds
        var baselineValues: [MetricName: Double] = [:]

        for (metricName, values) in aggregatedValues {
            guard values.count >= minBaselineSamples else { continue }

            let mean = values.reduce(0, +) / Double(values.count)
            baselineValues[metricName] = mean

            // Calculate threshold based on standard deviation
            let variance = values.map { pow($0 - mean, 2) }.reduce(0, +) / Double(values.count)
            let stdDev = sqrt(variance)
            thresholds[metricName] = (stdDev / mean) * 100 * 2 // 2 std devs as percentage
        }

        let baseline = TestBaseline(
            values: baselineValues,
            thresholds: thresholds,
            sampleCount: metrics.count,
            timestamp: Date()
        )

        historicalBaselines.append(baseline)

        return baseline
    }

    /// Update baseline with new metrics using exponential smoothing
    /// - Parameters:
    ///   - baseline: Existing baseline
    ///   - newMetrics: New metrics to incorporate
    ///   - smoothingFactor: Alpha value for exponential smoothing (0-1)
    /// - Returns: Updated baseline
    public func updateBaseline(
        baseline: TestBaseline,
        with newMetrics: [TestMetric],
        smoothingFactor: Double = 0.2
    ) -> TestBaseline {

        var updatedValues = baseline.values
        var updatedThresholds = baseline.thresholds

        for metric in newMetrics {
            if let existingValue = updatedValues[metric.name] {
                // Apply exponential smoothing
                let smoothedValue = (smoothingFactor * metric.value) +
                                    ((1 - smoothingFactor) * existingValue)
                updatedValues[metric.name] = smoothedValue
            } else {
                // New metric
                updatedValues[metric.name] = metric.value
            }
        }

        return TestBaseline(
            values: updatedValues,
            thresholds: updatedThresholds,
            sampleCount: baseline.sampleCount + 1,
            timestamp: Date()
        )
    }

    /// Get baseline metrics history
    /// - Returns: Array of historical baselines
    public func getBaselineHistory() -> [TestBaseline] {
        return historicalBaselines
    }

    // MARK: - Private Methods

    private func determineAnomalyType(
        metricName: String,
        actualValue: Double,
        expectedValue: Double
    ) -> Anomaly.AnomalyType {

        let lowercased = metricName.lowercased()

        if lowercased.contains("duration") || lowercased.contains("time") || lowercased.contains("performance") {
            if actualValue > expectedValue {
                return .performanceDegradation
            } else {
                return .timingAnomaly
            }
        }

        if lowercased.contains("pass") || lowercased.contains("fail") {
            if actualValue < expectedValue {
                return .spikeInFailures
            } else {
                return .unusualPassRate
            }
        }

        if lowercased.contains("memory") {
            return .memoryLeak
        }

        return .performanceDegradation
    }

    private func determineSeverity(
        deviationPercent: Double,
        type: Anomaly.AnomalyType
    ) -> Anomaly.AnomalySeverity {

        // Critical types
        if type == .spikeInFailures || type == .memoryLeak {
            if deviationPercent > 50 {
                return .critical
            } else {
                return .warning
            }
        }

        // Severity based on deviation magnitude
        switch deviationPercent {
        case let d where d > 100:
            return .critical
        case let d where d > 50:
            return .warning
        default:
            return .info
        }
    }

    private func generateDescription(
        metricName: String,
        actualValue: Double,
        expectedValue: Double,
        deviationPercent: Double
    ) -> String {

        let direction = actualValue > expectedValue ? "higher" : "lower"
        return "\(metricName) is \(String(format: "%.1f", deviationPercent))% \(direction) than expected (\(String(format: "%.2f", actualValue)) vs \(String(format: "%.2f", expectedValue)))"
    }

    private func generateRecommendation(
        type: Anomaly.AnomalyType,
        severity: Anomaly.AnomalySeverity
    ) -> String {

        switch type {
        case .performanceDegradation:
            return "Profile and optimize performance bottlenecks"

        case .spikeInFailures:
            return "Investigate recent changes for regressions"

        case .unusualPassRate:
            return "Review test logic and assertions"

        case .memoryLeak:
            return "Run memory profiler and check for retain cycles"

        case .timingAnomaly:
            return "Check for timing dependencies and race conditions"
        }
    }
}

