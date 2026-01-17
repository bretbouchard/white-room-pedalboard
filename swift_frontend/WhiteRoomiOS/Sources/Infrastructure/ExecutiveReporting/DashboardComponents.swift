import SwiftUI
import Charts

// MARK: - Key Metrics Section

public struct KeyMetricsSection: View {
    let metrics: KeyMetrics

    public var body: some View {
        VStack(spacing: 15) {
            Text("Key Metrics")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 15) {
                MetricCard(
                    title: "Total Tests",
                    value: "\(metrics.totalTests)",
                    subtitle: "tests"
                )

                MetricCard(
                    title: "Pass Rate",
                    value: "\(metrics.passRate, specifier: "%.1f")%",
                    subtitle: "passing",
                    color: passRateColor(metrics.passRate)
                )

                MetricCard(
                    title: "Coverage",
                    value: "\(metrics.coverage, specifier: "%.1f")%",
                    subtitle: "covered",
                    color: coverageColor(metrics.coverage)
                )

                MetricCard(
                    title: "Flaky Tests",
                    value: "\(metrics.flakyTests)",
                    subtitle: "unstable",
                    color: metrics.flakyTests == 0 ? .green : .orange
                )

                MetricCard(
                    title: "Open Issues",
                    value: "\(metrics.openIssues)",
                    subtitle: "issues"
                )

                MetricCard(
                    title: "Build Time",
                    value: formatDuration(metrics.buildTime),
                    subtitle: "duration"
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func passRateColor(_ rate: Double) -> Color {
        rate >= 95 ? .green : rate >= 90 ? .blue : .orange
    }

    private func coverageColor(_ coverage: Double) -> Color {
        coverage >= 80 ? .green : coverage >= 70 ? .blue : .orange
    }

    private func formatDuration(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return "\(minutes)m \(seconds)s"
    }
}

// MARK: - Metric Card

public struct MetricCard: View {
    let title: String
    let value: String
    let subtitle: String
    var color: Color = .blue

    public init(title: String, value: String, subtitle: String, color: Color = .blue) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.color = color
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title2)
                .bold()
                .foregroundColor(color)

            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Quick Stat Card

public struct QuickStatCard: View {
    let title: String
    let value: String
    let trend: ERTrendDirection
    let color: Color

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Image(systemName: trend.icon)
                    .font(.caption)
                    .foregroundColor(trend.color)
            }

            Text(value)
                .font(.title3)
                .bold()
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Quality Trend Chart

public struct QualityTrendChart: View {
    let data: [ERQualityDataPoint]

    public init(data: [ERQualityDataPoint]) {
        self.data = data
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Quality Trend")
                .font(.headline)

            Chart(data) { point in
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Pass Rate", point.passRate)
                )
                .foregroundStyle(.green)
                .interpolationMethod(.catmullRom)

                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Coverage", point.coverage)
                )
                .foregroundStyle(.blue.opacity(0.3))
                .interpolationMethod(.catmullRom)
            }
            .frame(height: 200)
            .chartXAxis {
                AxisMarks(position: .bottom)
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// MARK: - Performance Trend Chart

public struct PerformanceTrendChart: View {
    let data: [ERPerformanceDataPoint]

    public init(data: [ERPerformanceDataPoint]) {
        self.data = data
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Performance Trend")
                .font(.headline)

            Chart(data) { point in
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Build Time", point.buildTime)
                )
                .foregroundStyle(.orange)
                .interpolationMethod(.catmullRom)
            }
            .frame(height: 200)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// MARK: - Coverage Heatmap

public struct CoverageHeatmap: View {
    let coverage: [ModuleCoverage]

    public init(coverage: [ModuleCoverage]) {
        self.coverage = coverage
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Coverage by Module")
                .font(.headline)

            ForEach(coverage) { module in
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(module.module)
                            .font(.subheadline)

                        Spacer()

                        Text("\(module.coverage, specifier: "%.1f")%")
                            .font(.caption)
                            .foregroundColor(colorForCoverage(module.coverage))
                    }

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color(.systemGray6))

                            Rectangle()
                                .fill(colorForCoverage(module.coverage))
                                .frame(width: geometry.size.width * (module.coverage / 100))
                        }
                    }
                    .frame(height: 8)
                    .cornerRadius(4)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func colorForCoverage(_ coverage: Double) -> Color {
        coverage >= 80 ? .green : coverage >= 60 ? .blue : coverage >= 40 ? .orange : .red
    }
}

// MARK: - Coverage Breakdown View

public struct CoverageBreakdownView: View {
    let coverage: [ModuleCoverage]

    public init(coverage: [ModuleCoverage]) {
        self.coverage = coverage
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Coverage Breakdown")
                .font(.headline)

            Chart(coverage) { module in
                BarMark(
                    x: .value("Coverage", module.coverage),
                    y: .value("Module", module.module)
                )
                .foregroundStyle(colorForCoverage(module.coverage))
            }
            .frame(height: CGFloat(coverage.count * 40))
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func colorForCoverage(_ coverage: Double) -> Color {
        coverage >= 80 ? .green : coverage >= 60 ? .blue : coverage >= 40 ? .orange : .red
    }
}

// MARK: - Risk Assessment Gauge

public struct RiskAssessmentGauge: View {
    let risk: DeploymentRisk

    public init(risk: DeploymentRisk) {
        self.risk = risk
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Deployment Risk")
                .font(.headline)

            HStack(spacing: 30) {
                Gauge(value: Double(risk.score), in: 0...100) {
                    Text("\(risk.score)")
                        .font(.title)
                        .bold()
                }
                .gaugeStyle(.accessoryCircular)
                .frame(width: 150, height: 150)

                VStack(alignment: .leading, spacing: 10) {
                    Text("Risk Level")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(risk.level.rawValue)
                        .font(.title3)
                        .bold()
                        .foregroundColor(colorForRiskLevel(risk.level))

                    if !risk.factors.isEmpty {
                        Text("Factors:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        ForEach(risk.factors.indices, id: \.self) { index in
                            let factor = risk.factors[index]
                            HStack(spacing: 5) {
                                Circle()
                                    .fill(colorForImpact(factor.impact))
                                    .frame(width: 6, height: 6)

                                Text(factor.description)
                                    .font(.caption)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func colorForRiskLevel(_ level: DeploymentRisk.RiskLevel) -> Color {
        switch level {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        case .critical: return .purple
        }
    }

    private func colorForImpact(_ impact: RiskFactor.Impact) -> Color {
        switch impact {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        case .critical: return .purple
        }
    }
}

// MARK: - Recent Failures List

public struct RecentFailuresList: View {
    let failures: [TestFailure]

    public init(failures: [TestFailure]) {
        self.failures = failures
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Text("Recent Failures")
                    .font(.headline)

                Spacer()

                Text("\(failures.count)")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(8)
            }

            if failures.isEmpty {
                Text("No recent failures")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(failures.prefix(5)) { failure in
                    FailureRow(failure: failure)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

private struct FailureRow: View {
    let failure: TestFailure

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.red)

                Text(failure.testName)
                    .font(.subheadline)
                    .lineLimit(1)

                Spacer()
            }

            Text(failure.module)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(formatDate(failure.failedAt))
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 5)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Release Readiness Card

public struct ReleaseReadinessCard: View {
    let score: ReleaseReadiness

    public init(score: ReleaseReadiness) {
        self.score = score
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Release Readiness")
                .font(.headline)

            HStack(spacing: 20) {
                // Overall Score
                VStack(spacing: 5) {
                    Text("\(score.overallScore)")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(scoreColor)

                    Text(score.testGrade.letter)
                        .font(.title2)
                        .bold()
                        .foregroundColor(scoreColor)
                }

                VStack(alignment: .leading, spacing: 10) {
                    // Recommendation Badge
                    HStack(spacing: 8) {
                        Image(systemName: recommendationIcon)
                        Text(recommendationText)
                            .font(.subheadline)
                            .bold()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(recommendationColor.opacity(0.2))
                    .foregroundColor(recommendationColor)
                    .cornerRadius(8)

                    // Blockers
                    if !score.blockers.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)

                            Text("\(score.blockers.count) blockers")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }

                    // Warnings
                    if !score.warnings.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)

                            Text("\(score.warnings.count) warnings")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }

                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private var scoreColor: Color {
        switch score.overallScore {
        case 90...100: return .green
        case 75..<90: return .blue
        case 60..<75: return .orange
        default: return .red
        }
    }

    private var recommendationIcon: String {
        switch score.recommendation {
        case .readyForRelease: return "checkmark.circle.fill"
        case .readyWithWarnings: return "checkmark.circle"
        case .notReady: return "xmark.circle"
        case .blocked: return "xmark.circle.fill"
        }
    }

    private var recommendationText: String {
        switch score.recommendation {
        case .readyForRelease: return "Ready for Release"
        case .readyWithWarnings: return "Ready with Warnings"
        case .notReady: return "Not Ready"
        case .blocked: return "Blocked"
        }
    }

    private var recommendationColor: Color {
        switch score.recommendation {
        case .readyForRelease: return .green
        case .readyWithWarnings: return .orange
        case .notReady: return .red
        case .blocked: return .red
        }
    }
}

// MARK: - Recent Activity Card

public struct RecentActivityCard: View {
    let activities: [Activity]

    public init(activities: [Activity]) {
        self.activities = activities
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Recent Activity")
                .font(.headline)

            if activities.isEmpty {
                Text("No recent activity")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(activities) { activity in
                    ActivityRow(activity: activity)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

private struct ActivityRow: View {
    let activity: Activity

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: activity.icon)
                .foregroundColor(activity.color)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 3) {
                Text(activity.title)
                    .font(.subheadline)

                Text(activity.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(formatDate(activity.timestamp))
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 5)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

private extension Activity {
    var icon: String {
        switch type {
        case .build: return "hammer.fill"
        case .test: return "testtube.2"
        case .deployment: return "arrow.up.circle.fill"
        case .issue: return "exclamationmark.bubble.fill"
        }
    }

    var color: Color {
        switch type {
        case .build: return .blue
        case .test: return .green
        case .deployment: return .purple
        case .issue: return .orange
        }
    }
}

// MARK: - Stability Metrics View

public struct StabilityMetricsView: View {
    let metrics: StabilityMetrics

    public init(metrics: StabilityMetrics) {
        self.metrics = metrics
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Stability Metrics")
                .font(.headline)

            HStack(spacing: 20) {
                StabilityMetricCard(
                    title: "Flakiness Rate",
                    value: "\(metrics.flakinessRate, specifier: "%.1f")%",
                    target: "< 5%"
                )

                StabilityMetricCard(
                    title: "MTTR",
                    value: "\(Int(metrics.meanTimeToRecovery))m",
                    target: "< 30m"
                )

                StabilityMetricCard(
                    title: "Success Rate",
                    value: "\(metrics.successRate, specifier: "%.1f")%",
                    target: "> 95%"
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

private struct StabilityMetricCard: View {
    let title: String
    let value: String
    let target: String

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title3)
                .bold()

            Text(target: target)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Issues Card

public struct IssuesCard: View {
    let blockers: [Issue]
    let warnings: [Issue]

    public init(blockers: [Issue], warnings: [Issue]) {
        self.blockers = blockers
        self.warnings = warnings
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Issues")
                .font(.headline)

            if !blockers.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Blockers")
                        .font(.subheadline)
                        .bold()
                        .foregroundColor(.red)

                    ForEach(blockers.prefix(3)) { blocker in
                        IssueRow(issue: blocker, color: .red)
                    }
                }
            }

            if !warnings.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Warnings")
                        .font(.subheadline)
                        .bold()
                        .foregroundColor(.orange)

                    ForEach(warnings.prefix(3)) { warning in
                        IssueRow(issue: warning, color: .orange)
                    }
                }
            }

            if blockers.isEmpty && warnings.isEmpty {
                Text("No issues")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

private struct IssueRow: View {
    let issue: Issue
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(color)
                .font(.caption)

            VStack(alignment: .leading, spacing: 3) {
                Text(issue.title)
                    .font(.caption)
                    .bold()

                Text(issue.description)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 3)
    }
}

// MARK: - Uncovered Code View

public struct UncoveredCodeView: View {
    let uncovered: [UncoveredCode]

    public init(uncovered: [UncoveredCode]) {
        self.uncovered = uncovered
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Uncovered Code")
                .font(.headline)

            if uncovered.isEmpty {
                Text("All code covered")
                    .font(.subheadline)
                    .foregroundColor(.green)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(uncovered.prefix(10)) { item in
                    UncoveredCodeRow(item: item)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

private struct UncoveredCodeRow: View {
    let item: UncoveredCode

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "xmark.circle")
                .foregroundColor(.red)
                .font(.caption)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.file)
                    .font(.caption)
                    .bold()

                Text("\(item.function):\(item.line)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 3)
    }
}

// MARK: - Dashboard Data Service

public class DashboardDataService {
    public init() {}

    public func fetchKeyMetrics() async throws -> KeyMetrics {
        // Placeholder implementation
        return KeyMetrics(
            totalTests: 1250,
            passRate: 94.5,
            coverage: 78.2,
            flakyTests: 3,
            openIssues: 12,
            buildTime: 342.0
        )
    }

    public func fetchQualityTrend(days: Int) async throws -> [ERQualityDataPoint] {
        var trends: [ERQualityDataPoint] = []
        let calendar = Calendar.current

        for i in 0..<days {
            if let date = calendar.date(byAdding: .day, value: -i, to: Date()) {
                trends.append(ERQualityDataPoint(
                    date: date,
                    passRate: 92.0 + Double.random(in: -2...2),
                    coverage: 75.0 + Double.random(in: -3...3)
                ))
            }
        }

        return trends.reversed()
    }

    public func fetchPerformanceTrend(days: Int) async throws -> [ERPerformanceDataPoint] {
        var trends: [ERPerformanceDataPoint] = []
        let calendar = Calendar.current

        for i in 0..<days {
            if let date = calendar.date(byAdding: .day, value: -i, to: Date()) {
                trends.append(ERPerformanceDataPoint(
                    date: date,
                    buildTime: 300.0 + Double.random(in: -60...60),
                    testTime: 180.0 + Double.random(in: -30...30)
                ))
            }
        }

        return trends.reversed()
    }

    public func fetchCoverageByModule() async throws -> [ModuleCoverage] {
        return [
            ModuleCoverage(module: "AudioEngine", coverage: 85.2, linesCovered: 1240, totalLines: 1455),
            ModuleCoverage(module: "UI", coverage: 72.1, linesCovered: 890, totalLines: 1234),
            ModuleCoverage(module: "DSP", coverage: 91.5, linesCovered: 2300, totalLines: 2514),
            ModuleCoverage(module: "Networking", coverage: 68.3, linesCovered: 450, totalLines: 659),
            ModuleCoverage(module: "Storage", coverage: 78.9, linesCovered: 680, totalLines: 862)
        ]
    }

    public func assessDeploymentRisk() async throws -> DeploymentRisk {
        return DeploymentRisk(
            score: 35,
            level: .low,
            factors: [
                RiskFactor(description: "Good test coverage", impact: .low, likelihood: .low)
            ]
        )
    }

    public func fetchRecentFailures(limit: Int) async throws -> [TestFailure] {
        return [
            TestFailure(
                testName: "AudioEngineTests.testProcessingLatency",
                module: "AudioEngine",
                errorMessage: "Assertion failed: latency < 10ms",
                failedAt: Date().addingTimeInterval(-3600)
            ),
            TestFailure(
                testName: "NetworkingTests.testConnectionRetry",
                module: "Networking",
                errorMessage: "Timeout waiting for connection",
                failedAt: Date().addingTimeInterval(-7200)
            )
        ]
    }

    public func calculateReadinessScore() async throws -> ReleaseReadiness {
        return ReleaseReadiness(
            overallScore: 82,
            testGrade: .minus,
            recommendation: .readyWithWarnings,
            blockers: [],
            warnings: ["Test coverage below 80%", "3 flaky tests detected"]
        )
    }

    public func fetchRecentActivities(limit: Int) async throws -> [Activity] {
        return [
            Activity(
                title: "Build #1234",
                description: "Success",
                timestamp: Date().addingTimeInterval(-900),
                type: .build
            ),
            Activity(
                title: "Test Suite",
                description: "1245/1250 passed",
                timestamp: Date().addingTimeInterval(-1800),
                type: .test
            )
        ]
    }

    public func fetchStabilityMetrics() async throws -> StabilityMetrics {
        return StabilityMetrics(
            flakinessRate: 2.4,
            meanTimeToRecovery: 18.5,
            successRate: 96.8
        )
    }

    public func fetchIssues() async throws -> (blockers: [Issue], warnings: [Issue], uncoveredCode: [UncoveredCode]) {
        return (
            blockers: [],
            warnings: [
                Issue(title: "Coverage", description: "Test coverage below 80%", severity: .warning)
            ],
            uncoveredCode: [
                UncoveredCode(file: "AudioProcessor.swift", line: 245, function: "processAudio"),
                UncoveredCode(file: "NetworkManager.swift", line: 89, function: "retryConnection")
            ]
        )
    }
}
