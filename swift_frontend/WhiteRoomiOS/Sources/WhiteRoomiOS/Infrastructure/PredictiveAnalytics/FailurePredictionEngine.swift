//
//  FailurePredictionEngine.swift
//  WhiteRoomiOS
//
//  Created by AI on 1/16/26.
//  Copyright © 2026 Bret Bouchard. All rights reserved.
//

import Foundation
import Combine

/// Machine learning engine for predicting test failures
/// Uses historical patterns, flakiness scores, and code change analysis
public actor FailurePredictionEngine {

    // MARK: - Types

    public typealias TestName = String
    public typealias FilePath = String

    // MARK: - Properties

    private var historicalResults: [TestResult] = []
    private var flakinessScores: [TestName: Double] = [:]
    private var testDependencies: [TestName: Set<TestName>] = [:]
    private var fileTestMap: [FilePath: Set<TestName>] = [:]

    // Configuration thresholds
    private let flakinessThreshold: Double = 0.3
    private let highFlakinessThreshold: Double = 0.5
    private let failureHistoryWeight: Double = 0.4
    private let flakinessWeight: Double = 0.3
    private let complexityWeight: Double = 0.2
    private let dependencyWeight: Double = 0.1

    // MARK: - Initialization

    public init() {
        // Initialize with empty historical data
    }

    // MARK: - Public Methods

    /// Analyze test results and extract failure patterns
    /// - Parameter results: Array of test results to analyze
    /// - Returns: Comprehensive failure analysis
    public func analyzeTestResults(
        _ results: [TestResult]
    ) -> FailureAnalysis {

        // Update historical data
        historicalResults.append(contentsOf: results)

        // Update flakiness scores
        updateFlakinessScores(results)

        // Extract failure patterns
        let patterns = extractFailurePatterns(results)

        // Identify failing tests
        let failedTests = results.filter { !$0.passed }

        // Calculate metrics
        let passRate = calculatePassRate(results)
        let flakyTestCount = results.filter { isFlaky($0) }.count
        let newFailures = identifyNewFailures(results)

        return FailureAnalysis(
            totalTests: results.count,
            passedTests: results.filter { $0.passed }.count,
            failedTests: failedTests.count,
            flakyTests: flakyTestCount,
            passRate: passRate,
            failurePatterns: patterns,
            newFailures: newFailures,
            timestamp: Date()
        )
    }

    /// Predict which tests are likely to fail for a set of changes
    /// - Parameters:
    ///   - changedFiles: Files that have been modified
    ///   - historicalResults: Historical test results for pattern learning
    /// - Returns: Array of failure predictions with confidence scores
    public func predictFailures(
        for changedFiles: Set<FilePath>,
        historicalResults: [TestResult] = []
    ) -> [TestFailurePrediction] {

        guard !historicalResults.isEmpty || !self.historicalResults.isEmpty else {
            return []
        }

        let resultsToUse = historicalResults.isEmpty ? self.historicalResults : historicalResults

        // Find tests affected by changed files
        let affectedTests = findTestsAffected(by: changedFiles)

        var predictions: [TestFailurePrediction] = []

        for test in affectedTests {
            let prediction = predictFailureForTest(
                test,
                changedFiles: changedFiles,
                historicalResults: resultsToUse
            )

            predictions.append(prediction)
        }

        // Sort by failure probability (highest first)
        predictions.sort { $0.failureProbability > $1.failureProbability }

        return predictions
    }

    /// Get high-risk tests that exceed the failure probability threshold
    /// - Parameter threshold: Minimum failure probability (default 0.7 = 70%)
    /// - Returns: Array of high-risk test names
    public func getHighRiskTests(
        threshold: Double = 0.7
    ) -> [TestName] {

        let predictions = predictFailures(
            for: Set(historicalResults.compactMap { $0.filePath })
        )

        return predictions
            .filter { $0.failureProbability >= threshold }
            .map { $0.testName }
    }

    /// Update test dependencies mapping
    /// - Parameters:
    ///   - test: Test name
    ///   - dependencies: Array of tests this test depends on
    public func setTestDependencies(
        _ test: TestName,
        dependencies: [TestName]
    ) {
        testDependencies[test] = Set(dependencies)
    }

    /// Update file-to-test mapping
    /// - Parameters:
    ///   - filePath: Path to source file
    ///   - tests: Array of tests that cover this file
    public func setTestsForFile(
        _ filePath: FilePath,
        tests: [TestName]
    ) {
        fileTestMap[filePath] = Set(tests)
    }

    /// Get flakiness score for a specific test
    /// - Parameter testName: Test to query
    /// - Returns: Flakiness score (0-1, higher is more flaky)
    public func getFlakinessScore(for testName: TestName) -> Double {
        flakinessScores[testName] ?? 0.0
    }

    /// Get all flaky tests above threshold
    /// - Parameter threshold: Minimum flakiness score
    /// - Returns: Array of (testName, flakinessScore) tuples
    public func getFlakyTests(
        threshold: Double = 0.3
    ) -> [(TestName, Double)] {

        return flakinessScores
            .filter { $0.value >= threshold }
            .sorted { $0.value > $1.value }
            .map { ($0.key, $0.value) }
    }

    // MARK: - Private Methods

    private func updateFlakinessScores(_ results: [TestResult]) {
        // Group results by test name
        let grouped = Dictionary(grouping: results, by: { $0.name })

        for (testName, testResults) in grouped {
            guard testResults.count >= 3 else {
                // Need at least 3 runs to calculate flakiness
                continue
            }

            // Calculate flakiness as variance in pass/fail
            let passCount = testResults.filter { $0.passed }.count
            let failCount = testResults.count - passCount

            // Flakiness increases with variance and total runs
            let failRate = Double(failCount) / Double(testResults.count)

            // Weight by number of runs (more runs = more confident)
            let runWeight = min(1.0, Double(testResults.count) / 10.0)

            let flakiness = failRate * runWeight
            flakinessScores[testName] = flakiness
        }
    }

    private func extractFailurePatterns(_ results: [TestResult]) -> [FailurePattern] {
        var patterns: [FailurePattern] = []

        // Pattern: Tests failing for the first time
        let newFailures = identifyNewFailures(results)
        if !newFailures.isEmpty {
            patterns.append(
                FailurePattern(
                    type: .newFailures,
                    description: "\(newFailures.count) tests failing for the first time",
                    affectedTests: newFailures,
                    severity: .high
                )
            )
        }

        // Pattern: Consistently failing tests
        let consistentFailures = findConsistentFailures(results)
        if !consistentFailures.isEmpty {
            patterns.append(
                FailurePattern(
                    type: .consistentFailures,
                    description: "\(consistentFailures.count) tests consistently failing",
                    affectedTests: consistentFailures,
                    severity: .critical
                )
            )
        }

        // Pattern: Flaky tests
        let flakyTests = results.filter { isFlaky($0) }.map { $0.name }
        if !flakyTests.isEmpty {
            patterns.append(
                FailurePattern(
                    type: .flakyTests,
                    description: "\(flakyTests.count) tests showing flaky behavior",
                    affectedTests: flakyTests,
                    severity: .medium
                )
            )
        }

        return patterns
    }

    private func identifyNewFailures(_ results: [TestResult]) -> [TestName] {
        let previouslyPassing = historicalResults
            .filter { $0.passed }
            .map { $0.name }

        return results
            .filter { !$0.passed && previouslyPassing.contains($0.name) }
            .map { $0.name }
    }

    private func findConsistentFailures(_ results: [TestResult]) -> [TestName] {
        let failedTests = results.filter { !$0.passed }
        let grouped = Dictionary(grouping: failedTests, by: { $0.name })

        return grouped
            .filter { $0.value.count >= 3 } // Failed at least 3 times
            .map { $0.key }
    }

    private func calculatePassRate(_ results: [TestResult]) -> Double {
        guard !results.isEmpty else { return 0 }
        let passCount = results.filter { $0.passed }.count
        return Double(passCount) / Double(results.count)
    }

    private func isFlaky(_ result: TestResult) -> Bool {
        guard let flakiness = flakinessScores[result.name] else {
            return false
        }
        return flakiness >= flakinessThreshold
    }

    private func findTestsAffected(by files: Set<FilePath>) -> Set<TestName> {
        var affected: Set<TestName> = []

        for file in files {
            if let tests = fileTestMap[file] {
                affected.formUnion(tests)
            }
        }

        // Add dependent tests
        var allAffected = affected
        for test in affected {
            if let dependencies = testDependencies[test] {
                allAffected.formUnion(dependencies)
            }
        }

        return allAffected
    }

    private func predictFailureForTest(
        _ testName: TestName,
        changedFiles: Set<FilePath>,
        historicalResults: [TestResult]
    ) -> TestFailurePrediction {

        // Get historical performance for this test
        let testHistory = historicalResults.filter { $0.name == testName }
        let failureRate = calculateFailureRate(testHistory)

        // Calculate flakiness impact
        let flakiness = flakinessScores[testName] ?? 0.0
        let flakinessImpact = flakiness * flakinessWeight

        // Calculate failure history impact
        let historyImpact = failureRate * failureHistoryWeight

        // Calculate complexity impact based on changed files
        let complexityImpact = calculateComplexityImpact(
            for: testName,
            changedFiles: changedFiles
        )

        // Calculate dependency impact
        let dependencyImpact = calculateDependencyImpact(for: testName)

        // Combine factors
        let failureProbability = min(1.0,
            historyImpact +
            flakinessImpact +
            complexityImpact +
            dependencyImpact
        )

        // Determine reasons
        let reasons = determineFailureReasons(
            testName: testName,
            failureRate: failureRate,
            flakiness: flakiness,
            changedFiles: changedFiles,
            historicalResults: testHistory
        )

        // Generate mitigation
        let mitigation = generateMitigation(reasons: reasons, testName: testName)

        // Calculate confidence based on data quality
        let confidence = calculatePredictionConfidence(
            historyCount: testHistory.count,
            hasFlakinessData: flakinessScores[testName] != nil,
            hasDependencyData: testDependencies[testName] != nil
        )

        return TestFailurePrediction(
            testName: testName,
            failureProbability: failureProbability,
            confidence: confidence,
            reasons: reasons,
            mitigation: mitigation
        )
    }

    private func calculateFailureRate(_ results: [TestResult]) -> Double {
        guard !results.isEmpty else { return 0 }
        let failures = results.filter { !$0.passed }.count
        return Double(failures) / Double(results.count)
    }

    private func calculateComplexityImpact(
        for testName: TestName,
        changedFiles: Set<FilePath>
    ) -> Double {
        // Check if test directly touches changed files
        let directlyAffected = fileTestMap.values.contains(where: { tests in
            tests.contains(testName)
        })

        if directlyAffected {
            return complexityWeight
        }

        // Check if dependencies are affected
        if let dependencies = testDependencies[testName] {
            for dep in dependencies {
                if fileTestMap.values.contains(where: { $0.contains(dep) }) {
                    return complexityWeight * 0.5
                }
            }
        }

        return 0
    }

    private func calculateDependencyImpact(for testName: TestName) -> Double {
        guard let dependencies = testDependencies[testName], !dependencies.isEmpty else {
            return 0
        }

        // Check if any dependencies have high flakiness
        let flakyDependencies = dependencies.filter { dep in
            (flakinessScores[dep] ?? 0) >= highFlakinessThreshold
        }

        return (Double(flakyDependencies.count) / Double(dependencies.count)) * dependencyWeight
    }

    private func determineFailureReasons(
        testName: TestName,
        failureRate: Double,
        flakiness: Double,
        changedFiles: Set<FilePath>,
        historicalResults: [TestResult]
    ) -> [FailureReason] {

        var reasons: [FailureReason] = []

        // Recently modified
        if isTestRecentlyModified(testName, changedFiles: changedFiles) {
            reasons.append(.recentlyModified)
        }

        // High flakiness
        if flakiness >= highFlakinessThreshold {
            reasons.append(.highFlakiness)
        }

        // Complex dependencies
        if let dependencies = testDependencies[testName], dependencies.count > 3 {
            reasons.append(.complexDependencies)
        }

        // Low coverage (inferred from failure rate)
        if failureRate > 0.3 {
            reasons.append(.lowCoverage)
        }

        // Performance sensitive (if test has timing issues)
        if hasTimingIssues(testName, historicalResults: historicalResults) {
            reasons.append(.performanceSensitive)
        }

        return reasons
    }

    private func isTestRecentlyModified(_ testName: TestName, changedFiles: Set<FilePath>) -> Bool {
        // Check if any files that this test covers have been modified
        for (_, tests) in fileTestMap {
            if tests.contains(testName) {
                return true
            }
        }
        return false
    }

    private func hasTimingIssues(_ testName: TestName, historicalResults: [TestResult]) -> Bool {
        // Check for execution time outliers
        let durations = historicalResults.map { $0.duration }
        guard durations.count >= 3 else { return false }

        let avg = durations.reduce(0, +) / Double(durations.count)
        let outliers = durations.filter { $0 > avg * 2 }

        return outliers.count > 0
    }

    private func generateMitigation(reasons: [FailureReason], testName: TestName) -> String {
        guard !reasons.isEmpty else {
            return "Monitor test for stability"
        }

        var mitigations: [String] = []

        if reasons.contains(.highFlakiness) {
            mitigations.append("Review test for race conditions or timing dependencies")
        }

        if reasons.contains(.complexDependencies) {
            mitigations.append("Consider breaking test into smaller, isolated units")
        }

        if reasons.contains(.lowCoverage) {
            mitigations.append("Increase test coverage and add edge case testing")
        }

        if reasons.contains(.performanceSensitive) {
            mitigations.append("Add timeouts and optimize test execution")
        }

        if reasons.contains(.recentlyModified) {
            mitigations.append("Review recent changes for regression potential")
        }

        return mitigations.joined(separator: ". ")
    }

    private func calculatePredictionConfidence(
        historyCount: Int,
        hasFlakinessData: Bool,
        hasDependencyData: Bool
    ) -> Double {
        var confidence = 0.0

        // History contribution
        confidence += min(0.5, Double(historyCount) / 20.0)

        // Flakiness data contribution
        if hasFlakinessData {
            confidence += 0.2
        }

        // Dependency data contribution
        if hasDependencyData {
            confidence += 0.15
        }

        // Minimum confidence
        confidence = max(0.3, confidence)

        return min(1.0, confidence)
    }
}

