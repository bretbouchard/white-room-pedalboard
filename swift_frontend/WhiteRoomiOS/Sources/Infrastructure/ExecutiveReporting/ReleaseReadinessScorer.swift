import Foundation

/// Calculates release readiness scores and generates go/no-go recommendations
public class ReleaseReadinessScorer {

    // MARK: - Public API

    /// Calculates overall release readiness
    public func calculateReadiness(for release: ReleaseInfo) -> ReleaseReadiness {
        let scorecard = generateScorecard(release)
        let blockers = assessBlockers(release)

        let recommendation: ReleaseReadiness.Recommendation
        if !blockers.isEmpty {
            recommendation = .blocked
        } else if scorecard.blockers.count > 0 {
            recommendation = .notReady
        } else if scorecard.warnings.count > 3 {
            recommendation = .notReady
        } else if scorecard.warnings.count > 0 {
            recommendation = .readyWithWarnings
        } else {
            recommendation = .readyForRelease
        }

        return ReleaseReadiness(
            overallScore: scorecard.overallScore,
            testGrade: scorecard.grade,
            recommendation: recommendation,
            blockers: scorecard.blockers.map { $0.issue },
            warnings: scorecard.warnings.map { $0.description }
        )
    }

    /// Generates detailed scorecard
    public func generateScorecard(_ release: ReleaseInfo) -> Scorecard {
        var categories: [CategoryScore] = []

        // Test Coverage
        categories.append(calculateTestCoverageScore(release))

        // Test Quality
        categories.append(calculateTestQualityScore(release))

        // Performance
        categories.append(calculatePerformanceScore(release))

        // Security
        categories.append(calculateSecurityScore(release))

        // Accessibility
        categories.append(calculateAccessibilityScore(release))

        // Documentation
        categories.append(calculateDocumentationScore(release))

        // Stability
        categories.append(calculateStabilityScore(release))

        // Calculate overall score
        let overallScore = calculateOverallScore(categories)
        let grade = calculateGrade(overallScore)
        let recommendation = generateRecommendation(categories)

        // Collect blockers and warnings
        var blockers: [Blocker] = []
        var warnings: [Warning] = []
        var strengths: [String] = []
        var weaknesses: [String] = []

        for category in categories {
            blockers.append(contentsOf: category.blockers)
            warnings.append(contentsOf: category.warnings)

            if category.score >= 90 {
                strengths.append("\(category.category.rawValue): \(category.score)%")
            } else if category.score < 70 {
                weaknesses.append("\(category.category.rawValue): \(category.score)%")
            }
        }

        return Scorecard(
            overallScore: overallScore,
            categories: categories,
            grade: grade,
            recommendation: recommendation,
            blockers: blockers,
            warnings: warnings,
            strengths: strengths,
            weaknesses: weaknesses
        )
    }

    /// Assesses release blockers
    public func assessBlockers(_ release: ReleaseInfo) -> [Blocker] {
        var blockers: [Blocker] = []

        // Check for critical security vulnerabilities
        if release.securityScan.criticalVulnerabilities > 0 {
            blockers.append(Blocker(
                category: .security,
                issue: "Critical security vulnerabilities detected (\(release.securityScan.criticalVulnerabilities))",
                severity: .critical,
                estimatedFixTime: 24 * 3600, // 1 day
                assignee: nil,
                jiraTicket: nil
            ))
        }

        // Check test coverage
        if release.qualityMetrics.coverage < 60.0 {
            blockers.append(Blocker(
                category: .testCoverage,
                issue: "Test coverage below minimum (60%): \(String(format: "%.1f", release.qualityMetrics.coverage))%",
                severity: .critical,
                estimatedFixTime: 3 * 24 * 3600, // 3 days
                assignee: nil,
                jiraTicket: nil
            ))
        }

        // Check pass rate
        if release.qualityMetrics.passRate < 90.0 {
            blockers.append(Blocker(
                category: .testQuality,
                issue: "Test pass rate below minimum (90%): \(String(format: "%.1f", release.qualityMetrics.passRate))%",
                severity: .critical,
                estimatedFixTime: 2 * 24 * 3600, // 2 days
                assignee: nil,
                jiraTicket: nil
            ))
        }

        // Check for failed tests
        if release.testResults.failedTests > 0 {
            blockers.append(Blocker(
                category: .testQuality,
                issue: "\(release.testResults.failedTests) tests failing",
                severity: .high,
                estimatedFixTime: 24 * 3600, // 1 day
                assignee: nil,
                jiraTicket: nil
            ))
        }

        // Check performance baseline
        let performanceScore = calculatePerformanceScore(release)
        if performanceScore.score < 60 {
            blockers.append(Blocker(
                category: .performance,
                issue: "Performance significantly degraded",
                severity: .high,
                estimatedFixTime: 5 * 24 * 3600, // 5 days
                assignee: nil,
                jiraTicket: nil
            ))
        }

        return blockers
    }

    /// Generates go/no-go recommendation
    public func generateGoNoGoRecommendation(_ release: ReleaseInfo) -> GoNoGoRecommendation {
        let scorecard = generateScorecard(release)
        let blockers = assessBlockers(release)

        let decision: GoNoGoDecision
        var reasoning: [String] = []

        if !blockers.isEmpty {
            decision = .noGo
            reasoning.append("Release has \(blockers.count) critical blockers")
            for blocker in blockers {
                reasoning.append("- \(blocker.issue)")
            }
        } else if scorecard.overallScore >= 90 {
            decision = .go
            reasoning.append("Strong quality score: \(scorecard.overallScore)/100")
            reasoning.append("All quality gates passed")
        } else if scorecard.overallScore >= 75 {
            decision = .goWithWarnings
            reasoning.append("Acceptable quality score: \(scorecard.overallScore)/100")
            if !scorecard.warnings.isEmpty {
                reasoning.append("Consider addressing \(scorecard.warnings.count) warnings")
            }
        } else {
            decision = .noGo
            reasoning.append("Quality score below threshold: \(scorecard.overallScore)/100 (required: 75)")
            reasoning.append("Address warnings before release")
        }

        return GoNoGoRecommendation(
            decision: decision,
            scorecard: scorecard,
            blockers: blockers,
            reasoning: reasoning,
            suggestedActions: generateSuggestedActions(scorecard, blockers: blockers)
        )
    }

    // MARK: - Category Score Calculations

    private func calculateTestCoverageScore(_ release: ReleaseInfo) -> CategoryScore {
        let coverage = release.qualityMetrics.coverage
        var score = 0
        var status: CategoryScore.Status = .critical
        var notes: [String] = []
        var blockers: [Blocker] = []
        var warnings: [Warning] = []

        // Score calculation
        switch coverage {
        case 90...100:
            score = 100
            status = .excellent
            notes.append("Excellent test coverage")
        case 80..<90:
            score = 85
            status = .good
            notes.append("Good test coverage")
        case 70..<80:
            score = 70
            status = .acceptable
            warnings.append(Warning(
                description: "Test coverage could be improved",
                category: .testCoverage
            ))
        case 60..<70:
            score = 50
            status = .needsImprovement
            warnings.append(Warning(
                description: "Test coverage below recommended threshold",
                category: .testCoverage
            ))
        default:
            score = 25
            status = .critical
            blockers.append(Blocker(
                category: .testCoverage,
                issue: "Unacceptably low test coverage",
                severity: .critical,
                estimatedFixTime: 5 * 24 * 3600,
                assignee: nil,
                jiraTicket: nil
            ))
        }

        return CategoryScore(
            category: .testCoverage,
            score: score,
            weight: 0.20,
            weightedScore: Double(score) * 0.20,
            status: status,
            notes: notes,
            blockers: blockers,
            warnings: warnings
        )
    }

    private func calculateTestQualityScore(_ release: ReleaseInfo) -> CategoryScore {
        let passRate = release.qualityMetrics.passRate
        let flakyTests = release.qualityMetrics.flakyTests

        var score = 0
        var status: CategoryScore.Status = .acceptable
        var notes: [String] = []
        var blockers: [Blocker] = []
        var warnings: [Warning] = []

        // Pass rate score
        let passRateScore: Int
        switch passRate {
        case 98...100:
            passRateScore = 50
        case 95..<98:
            passRateScore = 45
        case 90..<95:
            passRateScore = 40
        case 80..<90:
            passRateScore = 30
        default:
            passRateScore = 10
        }

        // Flaky tests penalty
        let flakyPenalty = min(flakyTests * 5, 25)
        score = passRateScore - flakyPenalty

        // Determine status
        if passRate >= 95 && flakyTests == 0 {
            status = .excellent
            notes.append("Excellent test quality with zero flaky tests")
        } else if passRate >= 90 && flakyTests <= 2 {
            status = .good
            notes.append("Good test quality")
        } else if passRate >= 80 {
            status = .acceptable
            if flakyTests > 0 {
                warnings.append(Warning(
                    description: "\(flakyTests) flaky tests detected",
                    category: .testQuality
                ))
            }
        } else {
            status = .needsImprovement
            warnings.append(Warning(
                description: "Low pass rate: \(String(format: "%.1f", passRate))%",
                category: .testQuality
            ))
        }

        if passRate < 90 {
            blockers.append(Blocker(
                category: .testQuality,
                issue: "Pass rate below 90% threshold",
                severity: .high,
                estimatedFixTime: 2 * 24 * 3600,
                assignee: nil,
                jiraTicket: nil
            ))
        }

        return CategoryScore(
            category: .testQuality,
            score: score,
            weight: 0.25,
            weightedScore: Double(score) * 0.25,
            status: status,
            notes: notes,
            blockers: blockers,
            warnings: warnings
        )
    }

    private func calculatePerformanceScore(_ release: ReleaseInfo) -> CategoryScore {
        let buildTime = release.performanceBaseline.averageBuildTime
        let memoryUsage = release.performanceBaseline.memoryUsage

        var score = 0
        var status: CategoryScore.Status = .good
        var notes: [String] = []
        var warnings: [Warning] = []

        // Build time score (target: < 5 minutes)
        let buildTimeScore: Int
        switch buildTime {
        case 0..<180: // < 3 minutes
            buildTimeScore = 50
        case 180..<300: // 3-5 minutes
            buildTimeScore = 45
        case 300..<600: // 5-10 minutes
            buildTimeScore = 35
        case 600..<900: // 10-15 minutes
            buildTimeScore = 25
        default: // > 15 minutes
            buildTimeScore = 15
        }

        // Memory usage score (target: < 500MB)
        let memoryScore: Int
        switch memoryUsage {
        case 0..<500_000_000: // < 500MB
            memoryScore = 50
        case 500_000_000..<1_000_000_000: // 500MB-1GB
            memoryScore = 40
        case 1_000_000_000..<2_000_000_000: // 1-2GB
            memoryScore = 30
        default: // > 2GB
            memoryScore = 20
        }

        score = buildTimeScore + memoryScore / 2

        if buildTime > 600 {
            warnings.append(Warning(
                description: "Build time exceeds 10 minutes",
                category: .performance
            ))
            status = .needsImprovement
        }

        if memoryUsage > 1_000_000_000 {
            warnings.append(Warning(
                description: "Memory usage exceeds 1GB",
                category: .performance
            ))
            status = .needsImprovement
        }

        if score >= 80 {
            status = .excellent
            notes.append("Excellent performance")
        } else if score >= 60 {
            status = .good
            notes.append("Good performance")
        }

        return CategoryScore(
            category: .performance,
            score: score,
            weight: 0.15,
            weightedScore: Double(score) * 0.15,
            status: status,
            notes: notes,
            blockers: [],
            warnings: warnings
        )
    }

    private func calculateSecurityScore(_ release: ReleaseInfo) -> CategoryScore {
        let critical = release.securityScan.criticalVulnerabilities
        let high = release.securityScan.highVulnerabilities
        let medium = release.securityScan.mediumVulnerabilities

        var score = 0
        var status: CategoryScore.Status = .excellent
        var blockers: [Blocker] = []
        var warnings: [Warning] = []

        // Score calculation
        if critical > 0 {
            score = 0
            status = .critical
            blockers.append(Blocker(
                category: .security,
                issue: "\(critical) critical vulnerabilities",
                severity: .critical,
                estimatedFixTime: 3 * 24 * 3600,
                assignee: nil,
                jiraTicket: nil
            ))
        } else if high > 0 {
            score = 40
            status = .needsImprovement
            warnings.append(Warning(
                description: "\(high) high severity vulnerabilities",
                category: .security
            ))
        } else if medium > 5 {
            score = 60
            status = .acceptable
            warnings.append(Warning(
                description: "\(medium) medium severity vulnerabilities",
                category: .security
            ))
        } else if medium > 0 {
            score = 80
            status = .good
        } else {
            score = 100
            status = .excellent
        }

        return CategoryScore(
            category: .security,
            score: score,
            weight: 0.20,
            weightedScore: Double(score) * 0.20,
            status: status,
            notes: [],
            blockers: blockers,
            warnings: warnings
        )
    }

    private func calculateAccessibilityScore(_ release: ReleaseInfo) -> CategoryScore {
        // Placeholder - would need accessibility test results
        return CategoryScore(
            category: .accessibility,
            score: 75,
            weight: 0.05,
            weightedScore: 75 * 0.05,
            status: .acceptable,
            notes: ["Accessibility testing not yet implemented"],
            blockers: [],
            warnings: []
        )
    }

    private func calculateDocumentationScore(_ release: ReleaseInfo) -> CategoryScore {
        // Placeholder - would need documentation coverage metrics
        return CategoryScore(
            category: .documentation,
            score: 70,
            weight: 0.05,
            weightedScore: 70 * 0.05,
            status: .acceptable,
            notes: ["Documentation coverage could be improved"],
            blockers: [],
            warnings: []
        )
    }

    private func calculateStabilityScore(_ release: ReleaseInfo) -> CategoryScore {
        // Placeholder - would need stability metrics (MTTR, flakiness, etc.)
        return CategoryScore(
            category: .stability,
            score: 80,
            weight: 0.10,
            weightedScore: 80 * 0.10,
            status: .good,
            notes: ["System appears stable"],
            blockers: [],
            warnings: []
        )
    }

    // MARK: - Helper Methods

    private func calculateOverallScore(_ categories: [CategoryScore]) -> Int {
        let totalWeightedScore = categories.reduce(0) { $0 + $1.weightedScore }
        return Int(totalWeightedScore)
    }

    private func calculateGrade(_ score: Int) -> ERGrade {
        switch score {
        case 97...100: return .plus
        case 93..<97: return .standard
        case 90..<93: return .minus
        case 80..<90: return .standard
        case 70..<80: return .minus
        default: return .F
        }
    }

    private func generateRecommendation(_ categories: [CategoryScore]) -> Recommendation {
        let hasBlockers = categories.contains { !$0.blockers.isEmpty }
        let manyWarnings = categories.reduce(0) { $0 + $1.warnings.count } > 5
        let poorScore = categories.contains { $0.score < 60 }

        if hasBlockers {
            return .blocked
        } else if poorScore {
            return .notReady
        } else if manyWarnings {
            return .notReady
        } else {
            return .readyForRelease
        }
    }

    private func generateSuggestedActions(_ scorecard: Scorecard, blockers: [Blocker]) -> [String] {
        var actions: [String] = []

        // Blocker actions
        if !blockers.isEmpty {
            actions.append("Address all critical blockers before release")
        }

        // Warning actions
        if !scorecard.warnings.isEmpty {
            actions.append("Review and address \(scorecard.warnings.count) warnings")
        }

        // Weakness actions
        for weakness in scorecard.weaknesses {
            actions.append("Improve \(weakness)")
        }

        // Strength actions
        if !scorecard.strengths.isEmpty {
            actions.append("Maintain current standards for: \(scorecard.strengths.joined(separator: ", "))")
        }

        return actions
    }
}

// MARK: - Supporting Types

public struct ReleaseInfo {
    public let version: String
    public let targetDate: Date
    public let features: [Feature]
    public let testResults: TestResults
    public let qualityMetrics: QualityMetrics
    public let securityScan: SecurityScanResults
    public let performanceBaseline: ERPerformanceBaseline

    public init(
        version: String,
        targetDate: Date,
        features: [Feature],
        testResults: TestResults,
        qualityMetrics: QualityMetrics,
        securityScan: SecurityScanResults,
        performanceBaseline: ERPerformanceBaseline
    ) {
        self.version = version
        self.targetDate = targetDate
        self.features = features
        self.testResults = testResults
        self.qualityMetrics = qualityMetrics
        self.securityScan = securityScan
        self.performanceBaseline = performanceBaseline
    }
}

public struct Scorecard {
    public let overallScore: Int
    public let categories: [CategoryScore]
    public let grade: ERGrade
    public let recommendation: Recommendation
    public let blockers: [Blocker]
    public let warnings: [Warning]
    public let strengths: [String]
    public let weaknesses: [String]

    public init(
        overallScore: Int,
        categories: [CategoryScore],
        grade: ERGrade,
        recommendation: Recommendation,
        blockers: [Blocker],
        warnings: [Warning],
        strengths: [String],
        weaknesses: [String]
    ) {
        self.overallScore = overallScore
        self.categories = categories
        self.grade = grade
        self.recommendation = recommendation
        self.blockers = blockers
        self.warnings = warnings
        self.strengths = strengths
        self.weaknesses = weaknesses
    }
}

public struct CategoryScore {
    public let category: ScoreCategory
    public let score: Int
    public let weight: Double
    public let weightedScore: Double
    public let status: Status
    public let notes: [String]
    public let blockers: [Blocker]
    public let warnings: [Warning]

    public init(
        category: ScoreCategory,
        score: Int,
        weight: Double,
        weightedScore: Double,
        status: Status,
        notes: [String],
        blockers: [Blocker],
        warnings: [Warning]
    ) {
        self.category = category
        self.score = score
        self.weight = weight
        self.weightedScore = weightedScore
        self.status = status
        self.notes = notes
        self.blockers = blockers
        self.warnings = warnings
    }

    public enum ScoreCategory: String, CaseIterable {
        case testCoverage = "Test Coverage"
        case testQuality = "Test Quality"
        case performance = "Performance"
        case security = "Security"
        case accessibility = "Accessibility"
        case documentation = "Documentation"
        case stability = "Stability"
    }

    public enum Status {
        case excellent
        case good
        case acceptable
        case needsImprovement
        case critical
    }
}

public struct Blocker {
    public let category: CategoryScore.ScoreCategory
    public let issue: String
    public let severity: BlockerSeverity
    public let estimatedFixTime: TimeInterval?
    public let assignee: String?
    public let jiraTicket: String?

    public enum BlockerSeverity {
        case critical
        case high
        case medium
    }
}

public struct Warning {
    public let description: String
    public let category: CategoryScore.ScoreCategory
}

public struct GoNoGoRecommendation {
    public let decision: GoNoGoDecision
    public let scorecard: Scorecard
    public let blockers: [Blocker]
    public let reasoning: [String]
    public let suggestedActions: [String]

    public init(
        decision: GoNoGoDecision,
        scorecard: Scorecard,
        blockers: [Blocker],
        reasoning: [String],
        suggestedActions: [String]
    ) {
        self.decision = decision
        self.scorecard = scorecard
        self.blockers = blockers
        self.reasoning = reasoning
        self.suggestedActions = suggestedActions
    }
}

public enum GoNoGoDecision {
    case go
    case goWithWarnings
    case noGo
}

public enum Recommendation {
    case readyForRelease
    case readyWithWarnings
    case notReady
    case blocked
}

// MARK: - Supporting Types (from other files)

public struct Feature {
    public let name: String
    public let description: String
    public let status: FeatureStatus

    public enum FeatureStatus {
        case planned
        case inProgress
        case completed
        case blocked
    }
}

public struct TestResults {
    public let totalTests: Int
    public let passedTests: Int
    public let failedTests: Int
    public let skippedTests: Int

    public init(
        totalTests: Int,
        passedTests: Int,
        failedTests: Int,
        skippedTests: Int
    ) {
        self.totalTests = totalTests
        self.passedTests = passedTests
        self.failedTests = failedTests
        self.skippedTests = skippedTests
    }
}

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

public struct SecurityScanResults {
    public let criticalVulnerabilities: Int
    public let highVulnerabilities: Int
    public let mediumVulnerabilities: Int
    public let lowVulnerabilities: Int

    public init(
        criticalVulnerabilities: Int,
        highVulnerabilities: Int,
        mediumVulnerabilities: Int,
        lowVulnerabilities: Int
    ) {
        self.criticalVulnerabilities = criticalVulnerabilities
        self.highVulnerabilities = highVulnerabilities
        self.mediumVulnerabilities = mediumVulnerabilities
        self.lowVulnerabilities = lowVulnerabilities
    }
}

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

public enum ERGrade: Int, Comparable {
    case plus = 4
    case standard = 3
    case minus = 2
    case F = 0

    public static func < (lhs: ERGrade, rhs: ERGrade) -> Bool {
        return lhs.rawValue < rhs.rawValue
    }
}
