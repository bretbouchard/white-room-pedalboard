//
//  CoverageTrendAnalyzer.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/16/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation
import Combine

/// Analyzes code coverage trends over time and predicts future coverage
/// Uses linear regression and statistical analysis for trend detection
public actor CoverageTrendAnalyzer {

    // MARK: - Types

    public typealias ModuleName = String
    public typealias FilePath = String

    // MARK: - Properties

    private var historicalSnapshots: [CoverageSnapshot] = []
    private let minimumSnapshotsForTrend = 3
    private let predictionConfidenceWindow = 5 // Number of days for confidence interval

    // MARK: - Initialization

    public init() {}

    // MARK: - Public Methods

    /// Analyze coverage trend from historical snapshots
    /// - Parameter historicalSnapshots: Array of coverage snapshots over time
    /// - Returns: Detailed trend analysis with predictions
    public func analyzeTrend(
        historicalSnapshots: [CoverageSnapshot]
    ) -> CoverageTrend {

        guard historicalSnapshots.count >= minimumSnapshotsForTrend else {
            return CoverageTrend(
                overallTrend: .stable,
                rateOfChange: 0,
                projectedDate: nil,
                riskAreas: [],
                confidence: 0
            )
        }

        // Store for future predictions
        self.historicalSnapshots = historicalSnapshots.sorted { $0.date < $1.date }

        // Analyze overall coverage trend
        let overallTrend = calculateTrendDirection(
            snapshots: self.historicalSnapshots
        )

        // Calculate rate of change (% per day)
        let rateOfChange = calculateRateOfChange(
            snapshots: self.historicalSnapshots
        )

        // Project when target coverage will be reached
        let projectedDate = predictTargetDate(
            currentCoverage: self.historicalSnapshots.last!.overallCoverage,
            rateOfChange: rateOfChange,
            targetCoverage: 80.0 // Standard target
        )

        // Identify declining areas
        let riskAreas = identifyDecliningAreas(
            threshold: 5.0
        )

        // Calculate confidence in trend prediction
        let confidence = calculateTrendConfidence()

        return CoverageTrend(
            overallTrend: overallTrend,
            rateOfChange: rateOfChange,
            projectedDate: projectedDate,
            riskAreas: riskAreas,
            confidence: confidence
        )
    }

    /// Predict future coverage based on historical trends
    /// - Parameter daysAhead: Number of days to predict ahead
    /// - Returns: Coverage prediction with confidence interval
    public func predictFutureCoverage(
        daysAhead: Int = 7
    ) -> CoveragePrediction {

        guard let latest = historicalSnapshots.last else {
            return CoveragePrediction(
                date: Date().addingTimeInterval(Double(daysAhead) * 86400),
                predictedCoverage: 0,
                confidenceInterval: CoveragePrediction.ConfidenceInterval(lower: 0, upper: 0),
                confidence: 0
            )
        }

        let trend = analyzeTrend(historicalSnapshots: historicalSnapshots)

        // Calculate predicted coverage
        let predictedCoverage = latest.overallCoverage + (trend.rateOfChange * Double(daysAhead))
        let clampedCoverage = max(0, min(100, predictedCoverage))

        // Calculate confidence interval based on historical variance
        let variance = calculateHistoricalVariance()
        let standardError = sqrt(variance / Double(historicalSnapshots.count))
        let margin = 1.96 * standardError * Double(daysAhead) // 95% confidence

        let lowerBound = max(0, clampedCoverage - margin)
        let upperBound = min(100, clampedCoverage + margin)

        return CoveragePrediction(
            date: Date().addingTimeInterval(Double(daysAhead) * 86400),
            predictedCoverage: clampedCoverage,
            confidenceInterval: CoveragePrediction.ConfidenceInterval(lower: lowerBound, upper: upperBound),
            confidence: trend.confidence
        )
    }

    /// Identify code areas with declining coverage
    /// - Parameter threshold: Minimum coverage decline percentage to flag
    /// - Returns: Array of declining code areas
    public func identifyDecliningAreas(
        threshold: Double = 5.0
    ) -> [CodeArea] {

        guard historicalSnapshots.count >= 2 else { return [] }

        let oldest = historicalSnapshots.first!
        let latest = historicalSnapshots.last!

        var decliningAreas: [CodeArea] = []

        // Check module-level coverage
        for (module, oldCoverage) in oldest.moduleCoverage {
            if let newCoverage = latest.moduleCoverage[module] {
                let decline = oldCoverage - newCoverage
                if decline >= threshold {
                    decliningAreas.append(
                        CodeArea(
                            name: module,
                            type: .module,
                            oldCoverage: oldCoverage,
                            newCoverage: newCoverage,
                            change: -decline,
                            severity: determineSeverity(decline: decline)
                        )
                    )
                }
            }
        }

        // Check file-level coverage
        for (file, oldCoverage) in oldest.fileCoverage {
            if let newCoverage = latest.fileCoverage[file] {
                let decline = oldCoverage - newCoverage
                if decline >= threshold {
                    decliningAreas.append(
                        CodeArea(
                            name: file,
                            type: .file,
                            oldCoverage: oldCoverage,
                            newCoverage: newCoverage,
                            change: -decline,
                            severity: determineSeverity(decline: decline)
                        )
                    )
                }
            }
        }

        // Sort by severity and decline amount
        return decliningAreas.sorted { $0.change < $1.change }
    }

    /// Add a new coverage snapshot to historical data
    /// - Parameter snapshot: Coverage snapshot to add
    public func addSnapshot(_ snapshot: CoverageSnapshot) {
        historicalSnapshots.append(snapshot)
        historicalSnapshots.sort { $0.date < $1.date }
    }

    /// Get coverage statistics for a specific module
    /// - Parameter moduleName: Module to query
    /// - Returns: Coverage statistics if available
    public func getModuleStatistics(
        for moduleName: ModuleName
    ) -> ModuleCoverageStatistics? {

        let moduleCoverages = historicalSnapshots
            .compactMap { $0.moduleCoverage[moduleName] }

        guard !moduleCoverages.isEmpty else { return nil }

        let average = moduleCoverages.reduce(0, +) / Double(moduleCoverages.count)
        let min = moduleCoverages.min() ?? 0
        let max = moduleCoverages.max() ?? 0

        // Calculate trend for this module
        let trend = calculateTrendDirection(values: moduleCoverages)

        return ModuleCoverageStatistics(
            moduleName: moduleName,
            averageCoverage: average,
            minCoverage: min,
            maxCoverage: max,
            trend: trend
        )
    }

    /// Get coverage growth rate per week
    /// - Returns: Average weekly coverage growth percentage
    public func getWeeklyGrowthRate() -> Double? {
        guard historicalSnapshots.count >= 2 else { return nil }

        let first = historicalSnapshots.first!
        let last = historicalSnapshots.last!

        let daysBetween = last.date.timeIntervalSince(first.date) / 86400
        let weeksBetween = daysBetween / 7.0

        guard weeksBetween > 0 else { return nil }

        let coverageChange = last.overallCoverage - first.overallCoverage
        return coverageChange / weeksBetween
    }

    /// Compare coverage between two time periods
    /// - Parameters:
    ///   - period1Days: Number of days for first period
    ///   - period2Days: Number of days for second period
    /// - Returns: Comparison result
    public func comparePeriods(
        period1Days: Int,
        period2Days: Int
    ) -> PeriodComparison? {

        let now = Date()
        let period1Start = now.addingTimeInterval(-Double(period1Days) * 86400)
        let period2Start = now.addingTimeInterval(-Double(period1Days + period2Days) * 86400)
        let period2End = period1Start

        let period1Snapshots = historicalSnapshots.filter { snapshot in
            snapshot.date >= period1Start && snapshot.date <= now
        }

        let period2Snapshots = historicalSnapshots.filter { snapshot in
            snapshot.date >= period2Start && snapshot.date <= period2End
        }

        guard !period1Snapshots.isEmpty, !period2Snapshots.isEmpty else {
            return nil
        }

        let period1Avg = period1Snapshots
            .map { $0.overallCoverage }
            .reduce(0, +) / Double(period1Snapshots.count)

        let period2Avg = period2Snapshots
            .map { $0.overallCoverage }
            .reduce(0, +) / Double(period2Snapshots.count)

        let change = period1Avg - period2Avg
        let percentChange = period2Avg > 0 ? (change / period2Avg) * 100 : 0

        return PeriodComparison(
            period1Average: period1Avg,
            period2Average: period2Avg,
            absoluteChange: change,
            percentChange: percentChange,
            improved: change > 0
        )
    }

    // MARK: - Private Methods

    private func calculateTrendDirection(
        snapshots: [CoverageSnapshot]
    ) -> TrendDirection {

        guard snapshots.count >= 2 else {
            return .stable
        }

        let values = snapshots.map { $0.overallCoverage }
        return calculateTrendDirection(values: values)
    }

    private func calculateTrendDirection(values: [Double]) -> TrendDirection {
        guard values.count >= 2 else { return .stable }

        // Simple linear regression to determine trend
        let n = Double(values.count)
        let x = Array(1...values.count).map { Double($0) }
        let y = values

        let sumX = x.reduce(0, +)
        let sumY = y.reduce(0, +)
        let sumXY = zip(x, y).map(*).reduce(0, +)
        let sumX2 = x.map { $0 * $0 }.reduce(0, +)

        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

        // Classify trend based on slope magnitude
        if abs(slope) < 0.1 {
            return .stable
        } else if slope > 0 {
            return .improving
        } else {
            return .declining
        }
    }

    private func calculateRateOfChange(
        snapshots: [CoverageSnapshot]
    ) -> Double {

        guard snapshots.count >= 2 else { return 0 }

        let first = snapshots.first!
        let last = snapshots.last!

        let daysBetween = last.date.timeIntervalSince(first.date) / 86400
        guard daysBetween > 0 else { return 0 }

        let coverageChange = last.overallCoverage - first.overallCoverage
        return coverageChange / daysBetween // % per day
    }

    private func predictTargetDate(
        currentCoverage: Double,
        rateOfChange: Double,
        targetCoverage: Double
    ) -> Date? {

        guard rateOfChange > 0 else {
            return nil // Not improving
        }

        guard currentCoverage < targetCoverage else {
            return nil // Already reached target
        }

        let remainingCoverage = targetCoverage - currentCoverage
        let daysUntilTarget = remainingCoverage / rateOfChange

        return Date().addingTimeInterval(daysUntilTarget * 86400)
    }

    private func calculateTrendConfidence() -> Double {
        guard historicalSnapshots.count >= 3 else { return 0 }

        // Calculate R² for trend line fit
        let values = historicalSnapshots.map { $0.overallCoverage }
        let n = Double(values.count)
        let x = Array(1...values.count).map { Double($0) }
        let y = values

        let sumX = x.reduce(0, +)
        let sumY = y.reduce(0, +)
        let sumXY = zip(x, y).map(*).reduce(0, +)
        let sumX2 = x.map { $0 * $0 }.reduce(0, +)

        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        let intercept = (sumY - slope * sumX) / n

        let yMean = sumY / n
        let ssTotal = y.map { pow($0 - yMean, 2) }.reduce(0, +)
        let ssResidual = zip(x, y).map { xi, yi in
            let yPredicted = slope * xi + intercept
            return pow(yi - yPredicted, 2)
        }.reduce(0.0, +)

        let rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0

        return max(0, min(1, rSquared))
    }

    private func calculateHistoricalVariance() -> Double {
        guard historicalSnapshots.count >= 2 else { return 0 }

        let values = historicalSnapshots.map { $0.overallCoverage }
        let mean = values.reduce(0, +) / Double(values.count)

        let variance = values.map { pow($0 - mean, 2) }.reduce(0, +) / Double(values.count)
        return variance
    }

    private func determineSeverity(decline: Double) -> DeclineSeverity {
        switch decline {
        case let d where d >= 20:
            return .critical
        case let d where d >= 10:
            return .high
        case let d where d >= 5:
            return .medium
        default:
            return .low
        }
    }
}

