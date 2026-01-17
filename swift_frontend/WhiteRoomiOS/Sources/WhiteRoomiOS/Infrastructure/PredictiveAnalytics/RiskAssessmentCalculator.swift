//
//  RiskAssessmentCalculator.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/16/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation
import Combine

/// Calculates deployment risk based on multiple factors
/// Integrates quality scores, test results, and code change analysis
public actor RiskAssessmentCalculator {

    // MARK: - Types

    // MARK: - Properties

    private let qualityWeight: Double = 0.35
    private let performanceWeight: Double = 0.20
    private let coverageWeight: Double = 0.20
    private let securityWeight: Double = 0.15
    private let compatibilityWeight: Double = 0.10

    // Risk thresholds
    private let criticalScoreThreshold = 40
    private let highScoreThreshold = 60
    private let mediumScoreThreshold = 75

    // MARK: - Initialization

    public init() {}

    // MARK: - Public Methods

    /// Calculate comprehensive deployment risk
    /// - Parameters:
    ///   - changes: Code changes being deployed
    ///   - testResults: Test execution results
    ///   - qualityScore: Quality score from ML model
    /// - Returns: Detailed deployment risk assessment
    public func calculateDeploymentRisk(
        for changes: CodeChanges,
        testResults: TestResults,
        qualityScore: QualityScore
    ) -> DeploymentRisk {

        // Calculate individual risk factors
        let testCoverageRisk = calculateTestCoverageRisk(
            changes: changes,
            testResults: testResults
        )

        let performanceRisk = calculatePerformanceRisk(
            testResults: testResults
        )

        let securityRisk = calculateSecurityRisk(
            changes: changes
        )

        let compatibilityRisk = calculateCompatibilityRisk(
            changes: changes,
            testResults: testResults
        )

        // Calculate overall risk (weighted average)
        let overallScore = (
            testCoverageRisk.score * qualityWeight +
            performanceRisk.score * performanceWeight +
            securityRisk.score * securityWeight +
            compatibilityRisk.score * compatibilityWeight
        )

        let overall = RiskLevel(score: Int(overallScore))

        // Aggregate all risk factors
        var allFactors: [RiskFactor] = []
        allFactors.append(contentsOf: testCoverageRisk.factors)
        allFactors.append(contentsOf: performanceRisk.factors)
        allFactors.append(contentsOf: securityRisk.factors)
        allFactors.append(contentsOf: compatibilityRisk.factors)

        // Generate mitigations
        let mitigations = generateMitigations(
            overall: overall,
            factors: allFactors
        )

        // Add quality-based factor
        let qualityFactor = RiskFactor(
            name: "Code Quality",
            level: RiskLevel(score: qualityScore.overall),
            weight: qualityWeight,
            description: "Overall code quality score: \(qualityScore.overall)/100 (Grade: \(qualityScore.grade.letter))",
            impact: qualityScore.overall < 70 ?
                "Low quality may indicate technical debt and maintenance issues" :
                "Good quality score indicates maintainable code"
        )

        return DeploymentRisk(
            overall: overall,
            testCoverageRisk: testCoverageRisk.level,
            performanceRisk: performanceRisk.level,
            securityRisk: securityRisk.level,
            compatibilityRisk: compatibilityRisk.level,
            factors: allFactors + [qualityFactor],
            mitigations: mitigations
        )
    }

    /// Generate human-readable risk report
    /// - Parameter risk: Deployment risk assessment
    /// - Returns: Formatted risk report
    public func generateRiskReport(_ risk: DeploymentRisk) -> RiskReport {

        let summary = generateSummary(risk: risk)
        let riskMatrix = generateRiskMatrix(risk: risk)
        let recommendations = generateRecommendations(risk: risk)

        return RiskReport(
            overallRisk: risk.overall,
            summary: summary,
            riskMatrix: riskMatrix,
            factors: risk.factors,
            mitigations: risk.mitigations,
            recommendations: recommendations,
            generatedAt: Date()
        )
    }

    /// Quick risk assessment based on limited data
    /// - Parameters:
    ///   - coveragePercent: Test coverage percentage
    ///   - failureCount: Number of test failures
    ///   - linesChanged: Number of lines changed
    /// - Returns: Quick risk level
    public func quickRiskAssessment(
        coveragePercent: Double,
        failureCount: Int,
        linesChanged: Int
    ) -> RiskLevel {

        var riskScore = 100

        // Coverage penalty
        if coveragePercent < 50 {
            riskScore -= 30
        } else if coveragePercent < 70 {
            riskScore -= 15
        } else if coveragePercent < 80 {
            riskScore -= 5
        }

        // Failure penalty
        if failureCount > 10 {
            riskScore -= 30
        } else if failureCount > 5 {
            riskScore -= 20
        } else if failureCount > 0 {
            riskScore -= 10
        }

        // Change size penalty
        if linesChanged > 1000 {
            riskScore -= 20
        } else if linesChanged > 500 {
            riskScore -= 10
        } else if linesChanged > 100 {
            riskScore -= 5
        }

        return RiskLevel(score: max(0, riskScore))
    }

    // MARK: - Private Methods

    private func calculateTestCoverageRisk(
        changes: CodeChanges,
        testResults: TestResults
    ) -> RiskDimension {

        var factors: [RiskFactor] = []
        var score = 100.0

        // Coverage risk
        let coverage = testResults.coveragePercentage
        if coverage < 50 {
            score -= 40
            factors.append(
                RiskFactor(
                    name: "Low Test Coverage",
                    level: .critical,
                    weight: 0.4,
                    description: "Test coverage is only \(coverage)%",
                    impact: "Insufficient test coverage increases regression risk"
                )
            )
        } else if coverage < 70 {
            score -= 20
            factors.append(
                RiskFactor(
                    name: "Moderate Test Coverage",
                    level: .high,
                    weight: 0.3,
                    description: "Test coverage is \(coverage)%",
                    impact: "Consider increasing coverage to reduce risk"
                )
            )
        } else if coverage < 80 {
            score -= 10
        }

        // Test failure risk
        let failureRate = testResults.failureRate
        if failureRate > 0.1 {
            score -= 30
            factors.append(
                RiskFactor(
                    name: "High Test Failure Rate",
                    level: .critical,
                    weight: 0.3,
                    description: "\(Int(failureRate * 100))% of tests are failing",
                    impact: "Failing tests indicate unresolved issues"
                )
            )
        } else if failureRate > 0.05 {
            score -= 15
        }

        // Uncovered changed files
        let uncoveredFiles = changes.changedFiles.filter { file in
            !testResults.coveredFiles.contains(file)
        }

        if !uncoveredFiles.isEmpty {
            let penalty = min(20, Double(uncoveredFiles.count) * 5)
            score -= penalty

            factors.append(
                RiskFactor(
                    name: "Uncovered Changes",
                    level: .high,
                    weight: 0.2,
                    description: "\(uncoveredFiles.count) changed files lack test coverage",
                    impact: "Changes without tests are higher risk"
                )
            )
        }

        return RiskDimension(
            level: RiskLevel(score: Int(score)),
            score: score,
            factors: factors
        )
    }

    private func calculatePerformanceRisk(
        testResults: TestResults
    ) -> RiskDimension {

        var factors: [RiskFactor] = []
        var score = 100.0

        // Performance degradation
        if let performanceChange = testResults.performanceChange {
            if performanceChange < -20 {
                score -= 30
                factors.append(
                    RiskFactor(
                        name: "Performance Regression",
                        level: .critical,
                        weight: 0.4,
                        description: "Performance degraded by \(Int(abs(performanceChange)))%",
                        impact: "Significant performance impact on users"
                    )
                )
            } else if performanceChange < -10 {
                score -= 15
                factors.append(
                    RiskFactor(
                        name: "Performance Decline",
                        level: .medium,
                        weight: 0.3,
                        description: "Performance declined by \(Int(abs(performanceChange)))%",
                        impact: "Noticeable performance impact"
                    )
                )
            }
        }

        // Slow test execution
        if testResults.averageTestDuration > 5.0 {
            score -= 10
            factors.append(
                RiskFactor(
                    name: "Slow Test Execution",
                    level: .low,
                    weight: 0.1,
                    description: "Average test duration: \(String(format: "%.1f", testResults.averageTestDuration))s",
                    impact: "May indicate performance issues"
                )
            )
        }

        return RiskDimension(
            level: RiskLevel(score: Int(score)),
            score: score,
            factors: factors
        )
    }

    private func calculateSecurityRisk(
        changes: CodeChanges
    ) -> RiskDimension {

        var factors: [RiskFactor] = []
        var score = 100.0

        // Sensitive file changes
        let sensitiveFiles = changes.changedFiles.filter { file in
            file.contains("Auth") ||
            file.contains("Password") ||
            file.contains("Token") ||
            file.contains("Crypto") ||
            file.contains("Security")
        }

        if !sensitiveFiles.isEmpty {
            score -= 20
            factors.append(
                RiskFactor(
                    name: "Security-Sensitive Changes",
                    level: .high,
                    weight: 0.5,
                    description: "\(sensitiveFiles.count) security-sensitive files modified",
                    impact: "Changes to security code require careful review"
                )
            )
        }

        // Dependency changes
        if changes.dependencyChanges > 0 {
            score -= 10
            factors.append(
                RiskFactor(
                    name: "Dependency Updates",
                    level: .medium,
                    weight: 0.3,
                    description: "\(changes.dependencyChanges) dependencies updated",
                    impact: "Dependency changes may introduce vulnerabilities"
                )
            )
        }

        // Large changes increase risk
        if changes.linesChanged > 500 {
            score -= 10
            factors.append(
                RiskFactor(
                    name: "Large Change Set",
                    level: .medium,
                    weight: 0.2,
                    description: "\(changes.linesChanged) lines changed",
                    impact: "Large changes are harder to review thoroughly"
                )
            )
        }

        return RiskDimension(
            level: RiskLevel(score: Int(score)),
            score: score,
            factors: factors
        )
    }

    private func calculateCompatibilityRisk(
        changes: CodeChanges,
        testResults: TestResults
    ) -> RiskDimension {

        var factors: [RiskFactor] = []
        var score = 100.0

        // API changes
        if changes.apiChanges > 0 {
            score -= 25
            factors.append(
                RiskFactor(
                    name: "API Changes",
                    level: .high,
                    weight: 0.4,
                    description: "\(changes.apiChanges) API modifications",
                    impact: "Breaking changes may affect integrations"
                )
            )
        }

        // Platform-specific tests
        let platformCoverage = testResults.platformTestCoverage
        if platformCoverage < 0.8 {
            score -= 20
            factors.append(
                RiskFactor(
                    name: "Incomplete Platform Testing",
                    level: .medium,
                    weight: 0.3,
                    description: "Platform test coverage: \(Int(platformCoverage * 100))%",
                    impact: "May have platform-specific issues"
                )
            )
        }

        // Database migrations
        if changes.hasDatabaseMigrations {
            score -= 20
            factors.append(
                RiskFactor(
                    name: "Database Schema Changes",
                    level: .high,
                    weight: 0.3,
                    description: "Database migrations included",
                    impact: "Schema changes require careful deployment"
                )
            )
        }

        return RiskDimension(
            level: RiskLevel(score: Int(score)),
            score: score,
            factors: factors
        )
    }

    private func generateMitigations(
        overall: RiskLevel,
        factors: [RiskFactor]
    ) -> [String] {

        var mitigations: [String] = []

        // Overall mitigations
        switch overall {
        case .critical:
            mitigations.append("HALT: Do not deploy without addressing critical risks")
            mitigations.append("Schedule emergency review meeting")
            mitigations.append("Consider rollback plan")

        case .high:
            mitigations.append("Obtain explicit approval from tech lead")
            mitigations.append("Increase monitoring and alerting")
            mitigations.append("Prepare rollback procedure")

        case .medium:
            mitigations.append("Review with team before deploying")
            mitigations.append("Monitor metrics closely post-deployment")
            mitigations.append("Consider canary deployment")

        case .low:
            mitigations.append("Standard deployment process acceptable")
            mitigations.append("Monitor for anomalies")
        }

        // Factor-specific mitigations
        for factor in factors where factor.level == .critical || factor.level == .high {
            mitigations.append("Address: \(factor.name)")
        }

        return mitigations
    }

    private func generateSummary(risk: DeploymentRisk) -> String {

        let riskLabel = risk.overall.description

        var summary = "Deployment Risk: \(riskLabel)\n\n"

        summary += "Risk Breakdown:\n"
        summary += "- Test Coverage: \(risk.testCoverageRisk.description)\n"
        summary += "- Performance: \(risk.performanceRisk.description)\n"
        summary += "- Security: \(risk.securityRisk.description)\n"
        summary += "- Compatibility: \(risk.compatibilityRisk.description)\n"

        let criticalFactors = risk.factors.filter { $0.level == .critical }
        if !criticalFactors.isEmpty {
            summary += "\nCritical Factors:\n"
            for factor in criticalFactors {
                summary += "- \(factor.name): \(factor.description)\n"
            }
        }

        return summary
    }

    private func generateRiskMatrix(risk: DeploymentRisk) -> String {

        var matrix = """
        Risk Matrix:
        ┌─────────────────────────────────┐
        │ Test Coverage:    \(risk.testCoverageRisk.emoji) │
        │ Performance:      \(risk.performanceRisk.emoji) │
        │ Security:         \(risk.securityRisk.emoji) │
        │ Compatibility:    \(risk.compatibilityRisk.emoji) │
        └─────────────────────────────────┘
        Overall: \(risk.overall.emoji) \(risk.overall.description)
        """

        return matrix
    }

    private func generateRecommendations(risk: DeploymentRisk) -> [String] {

        var recommendations: [String] = []

        // Test coverage recommendations
        if risk.testCoverageRisk == .critical || risk.testCoverageRisk == .high {
            recommendations.append("Increase test coverage before deploying")
            recommendations.append("Fix failing tests before proceeding")
        }

        // Performance recommendations
        if risk.performanceRisk == .critical {
            recommendations.append("Profile and optimize performance bottlenecks")
        }

        // Security recommendations
        if risk.securityRisk == .critical || risk.securityRisk == .high {
            recommendations.append("Conduct security review of changes")
            recommendations.append("Verify dependency updates for vulnerabilities")
        }

        // Compatibility recommendations
        if risk.compatibilityRisk == .high {
            recommendations.append("Test on all target platforms")
            recommendations.append("Verify API compatibility with integrations")
        }

        return recommendations
    }
}

// MARK: - Internal Types

private struct RiskDimension {
    let level: RiskLevel
    let score: Double
    let factors: [RiskFactor]
}
