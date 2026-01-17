//
//  QualityScoringModel.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/16/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation
import Combine

/// Machine learning model for predicting code quality scores (0-100)
/// Uses weighted scoring algorithm with confidence intervals
public actor QualityScoringModel {

    // MARK: - Weights Configuration

    /// Weight configuration for quality scoring components
    public struct Weights {
        public let testCoverage: Double
        public let stability: Double
        public let complexity: Double
        public let performance: Double
        public let accessibility: Double

        public init(
            testCoverage: Double = 0.30,
            stability: Double = 0.25,
            complexity: Double = 0.20,
            performance: Double = 0.15,
            accessibility: Double = 0.10
        ) {
            // Normalize weights to sum to 1.0
            let total = testCoverage + stability + complexity + performance + accessibility
            self.testCoverage = testCoverage / total
            self.stability = stability / total
            self.complexity = complexity / total
            self.performance = performance / total
            self.accessibility = accessibility / total
        }
    }

    // MARK: - Properties

    private let weights: Weights
    private var historicalScores: [QualityScore] = []

    // MARK: - Initialization

    public init(weights: Weights = Weights()) {
        self.weights = weights
    }

    // MARK: - Public Methods

    /// Calculate quality score based on multiple metrics
    /// - Parameters:
    ///   - coverage: Test coverage percentage (0-100)
    ///   - failureRate: Historical test failure rate (0-100)
    ///   - complexity: Code complexity score (0-100, higher is more complex)
    ///   - performance: Performance score (0-100)
    ///   - accessibility: Accessibility compliance score (0-100)
    /// - Returns: Calculated quality score with component breakdown
    public func calculateScore(
        coverage: Double,
        failureRate: Double,
        complexity: Double,
        performance: Double,
        accessibility: Double
    ) -> QualityScore {

        // Calculate component scores
        let testCoverageScore = normalizeCoverage(coverage)
        let stabilityScore = normalizeStability(failureRate)
        let complexityScore = normalizeComplexity(complexity)
        let performanceScore = normalizePerformance(performance)
        let accessibilityScore = normalizeAccessibility(accessibility)

        // Calculate weighted overall score
        let overall = (
            testCoverageScore * weights.testCoverage +
            stabilityScore * weights.stability +
            complexityScore * weights.complexity +
            performanceScore * weights.performance +
            accessibilityScore * weights.accessibility
        )

        // Calculate confidence based on data quality
        let confidence = calculateConfidence(
            coverage: coverage,
            failureRate: failureRate,
            complexity: complexity,
            performance: performance,
            accessibility: accessibility
        )

        let score = QualityScore(
            overall: Int(round(overall)),
            testCoverage: Int(round(testCoverageScore)),
            stability: Int(round(stabilityScore)),
            performance: Int(round(performanceScore)),
            accessibility: Int(round(accessibilityScore)),
            confidence: confidence,
            grade: calculateGrade(score: overall)
        )

        // Store for historical analysis
        historicalScores.append(score)

        return score
    }

    /// Predict score impact based on proposed code changes
    /// - Parameters:
    ///   - changedFiles: List of files being changed
    ///   - linesChanged: Number of lines changed
    ///   - testCoverageDelta: Expected change in test coverage (-100 to +100)
    /// - Returns: Quality prediction with impact assessment
    public func predictScoreImpact(
        changedFiles: [String],
        linesChanged: Int,
        testCoverageDelta: Double
    ) -> QualityPrediction {

        // Get current baseline score from historical data
        let baselineScore = historicalScores.last ?? QualityScore.empty

        // Calculate complexity impact based on file count and lines changed
        let complexityImpact = calculateComplexityImpact(
            fileCount: changedFiles.count,
            linesChanged: linesChanged
        )

        // Calculate new scores with projected changes
        let newCoverage = max(0, min(100, baselineScore.testCoverage + Int(testCoverageDelta)))
        let newStability = predictStabilityImpact(
            currentScore: baselineScore.stability,
            changes: linesChanged
        )

        let newScore = calculateScore(
            coverage: Double(newCoverage),
            failureRate: 100 - Double(newStability), // Convert stability to failure rate
            complexity: complexityImpact,
            performance: Double(baselineScore.performance),
            accessibility: Double(baselineScore.accessibility)
        )

        // Calculate impact metrics
        let scoreDelta = newScore.overall - baselineScore.overall
        let impact = determineImpact(scoreDelta: scoreDelta)

        return QualityPrediction(
            currentScore: baselineScore,
            predictedScore: newScore,
            scoreDelta: scoreDelta,
            impact: impact,
            confidence: calculatePredictionConfidence(
                linesChanged: linesChanged,
                coverageDelta: testCoverageDelta
            ),
            recommendations: generateRecommendations(
                currentScore: baselineScore,
                predictedScore: newScore
            )
        )
    }

    /// Get moving average of recent scores for trend analysis
    /// - Parameter windowSize: Number of recent scores to average
    /// - Returns: Average quality score over the window
    public func getMovingAverage(windowSize: Int = 5) -> Double? {
        guard !historicalScores.isEmpty else { return nil }

        let window = historicalScores.suffix(windowSize)
        let sum = window.reduce(0.0) { $0 + Double($1.overall) }
        return sum / Double(window.count)
    }

    /// Detect if quality trend is improving, stable, or declining
    /// - Returns: Trend direction and magnitude
    public func detectQualityTrend() -> QualityTrend {
        guard historicalScores.count >= 3 else {
            return QualityTrend(direction: .stable, magnitude: 0, confidence: 0)
        }

        let recent = historicalScores.suffix(5)
        let scores = recent.map { Double($0.overall) }

        // Simple linear regression to detect trend
        let n = Double(scores.count)
        let x = Array(1...scores.count).map { Double($0) }
        let y = scores

        let sumX = x.reduce(0, +)
        let sumY = y.reduce(0, +)
        let sumXY = zip(x, y).map(*).reduce(0, +)
        let sumX2 = x.map { $0 * $0 }.reduce(0, +)

        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

        // Determine direction and magnitude
        let direction: TrendDirection
        let magnitude: Double

        if abs(slope) < 0.5 {
            direction = .stable
            magnitude = 0
        } else if slope > 0 {
            direction = .improving
            magnitude = slope
        } else {
            direction = .declining
            magnitude = abs(slope)
        }

        // Calculate confidence based on R²
        let yMean = sumY / n
        let ssTotal = y.map { pow($0 - yMean, 2) }.reduce(0, +)
        let ssResidual = zip(x, y).map { xi, yi in
            let yPredicted = slope * xi + (sumY - slope * sumX) / n
            return pow(yi - yPredicted, 2)
        }.reduce(0.0, +)

        let rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0
        let confidence = max(0, min(1, rSquared))

        return QualityTrend(
            direction: direction,
            magnitude: magnitude,
            confidence: confidence
        )
    }

    // MARK: - Private Methods

    private func normalizeCoverage(_ coverage: Double) -> Double {
        // Coverage is directly proportional to quality
        return max(0, min(100, coverage))
    }

    private func normalizeStability(_ failureRate: Double) -> Double {
        // Stability is inverse of failure rate
        // Lower failure rate = higher stability score
        return max(0, min(100, 100 - failureRate))
    }

    private func normalizeComplexity(_ complexity: Double) -> Double {
        // Complexity is inversely proportional to quality
        // Lower complexity = higher score
        // Normalize from 0-100 (complex) to 0-100 (quality)
        return max(0, min(100, 100 - complexity))
    }

    private func normalizePerformance(_ performance: Double) -> Double {
        // Performance is directly proportional to quality
        return max(0, min(100, performance))
    }

    private func normalizeAccessibility(_ accessibility: Double) -> Double {
        // Accessibility is directly proportional to quality
        return max(0, min(100, accessibility))
    }

    private func calculateConfidence(
        coverage: Double,
        failureRate: Double,
        complexity: Double,
        performance: Double,
        accessibility: Double
    ) -> Double {
        // Confidence based on data completeness and consistency
        var factors: [Double] = []

        // Coverage confidence (higher coverage = higher confidence)
        factors.append(coverage / 100.0)

        // Stability confidence (consistent failure rate = higher confidence)
        factors.append(1.0 - (failureRate / 100.0))

        // Data completeness (all metrics provided = higher confidence)
        let allMetricsProvided = coverage >= 0 && failureRate >= 0 &&
                                  complexity >= 0 && performance >= 0 &&
                                  accessibility >= 0
        factors.append(allMetricsProvided ? 1.0 : 0.5)

        return factors.reduce(0, +) / Double(factors.count)
    }

    private func calculateGrade(score: Double) -> Grade {
        switch score {
        case 97...100:
            return .plus  // A+
        case 93..<97:
            return .standard  // A
        case 90..<93:
            return .minus  // A-
        case 87..<90:
            return .plus  // B+
        case 83..<87:
            return .standard  // B
        case 80..<83:
            return .minus  // B-
        case 77..<80:
            return .plus  // C+
        case 73..<77:
            return .standard  // C
        case 70..<73:
            return .minus  // C-
        case 67..<70:
            return .plus  // D+
        case 63..<67:
            return .standard  // D
        case 60..<63:
            return .minus  // D-
        default:
            return .standard  // F
        }
    }

    private func calculateComplexityImpact(fileCount: Int, linesChanged: Int) -> Double {
        // More files and lines = higher complexity penalty
        let baseComplexity = 50.0
        let fileFactor = min(20, Double(fileCount) * 2)
        let lineFactor = min(30, Double(linesChanged) / 100)

        return min(100, baseComplexity + fileFactor + lineFactor)
    }

    private func predictStabilityImpact(currentScore: Int, changes: Int) -> Int {
        // More changes typically reduce stability temporarily
        let changeImpact = min(10, Double(changes) / 50)
        return max(0, currentScore - Int(changeImpact))
    }

    private func calculatePredictionConfidence(
        linesChanged: Int,
        coverageDelta: Double
    ) -> Double {
        // Confidence decreases with larger changes
        let changeFactor = max(0, 1.0 - (Double(linesChanged) / 1000.0))
        let coverageFactor = max(0, 1.0 - (abs(coverageDelta) / 50.0))

        return (changeFactor + coverageFactor) / 2.0
    }

    private func determineImpact(scoreDelta: Int) -> ImpactLevel {
        switch scoreDelta {
        case let delta where delta > 10:
            return .significantImprovement
        case let delta where delta > 5:
            return .moderateImprovement
        case let delta where delta > 0:
            return .minorImprovement
        case let delta where delta < -10:
            return .significantDecline
        case let delta where delta < -5:
            return .moderateDecline
        case let delta where delta < 0:
            return .minorDecline
        default:
            return .neutral
        }
    }

    private func generateRecommendations(
        currentScore: QualityScore,
        predictedScore: QualityScore
    ) -> [String] {
        var recommendations: [String] = []

        if predictedScore.testCoverage < 80 {
            recommendations.append("Increase test coverage to at least 80%")
        }

        if predictedScore.stability < 75 {
            recommendations.append("Focus on reducing test failure rate")
        }

        if predictedScore.performance < 70 {
            recommendations.append("Optimize performance bottlenecks")
        }

        if predictedScore.accessibility < 80 {
            recommendations.append("Improve accessibility compliance")
        }

        if predictedScore.overall < currentScore.overall {
            recommendations.append("Consider breaking changes into smaller increments")
        }

        return recommendations
    }
}

