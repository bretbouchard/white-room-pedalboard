import SwiftUI
import Charts

/// Executive dashboard for quality metrics and trends
public struct ExecutiveDashboard: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedTab: DashboardTab = .overview

    public init() {}

    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("Dashboard Tab", selection: $selectedTab) {
                    ForEach(DashboardTab.allCases) { tab in
                        Text(tab.displayName).tag(tab)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()

                // Content based on selected tab
                ScrollView {
                    VStack(spacing: 20) {
                        switch selectedTab {
                        case .overview:
                            overviewContent
                        case .trends:
                            trendsContent
                        case .coverage:
                            coverageContent
                        case .risks:
                            risksContent
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Quality Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: { viewModel.refresh() }) {
                            Image(systemName: "arrow.clockwise")
                        }
                        .disabled(viewModel.isRefreshing)

                        Button(action: { exportReport() }) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
            .onAppear {
                viewModel.refresh()
            }
        }
    }

    // MARK: - Overview Tab

    private var overviewContent: some View {
        VStack(spacing: 20) {
            // Key Metrics Section
            KeyMetricsSection(metrics: viewModel.keyMetrics)

            // Release Readiness Score
            ReleaseReadinessCard(score: viewModel.readinessScore)

            // Quick Stats
            HStack(spacing: 15) {
                QuickStatCard(
                    title: "Pass Rate",
                    value: "\(viewModel.keyMetrics.passRate, specifier: "%.1f")%",
                    trend: viewModel.passRateTrend,
                    color: .green
                )

                QuickStatCard(
                    title: "Coverage",
                    value: "\(viewModel.keyMetrics.coverage, specifier: "%.1f")%",
                    trend: viewModel.coverageTrend,
                    color: .blue
                )

                QuickStatCard(
                    title: "Build Time",
                    value: formatDuration(viewModel.keyMetrics.buildTime),
                    trend: viewModel.buildTimeTrend,
                    color: .orange
                )
            }

            // Recent Activity
            RecentActivityCard(activities: viewModel.recentActivities)
        }
    }

    // MARK: - Trends Tab

    private var trendsContent: some View {
        VStack(spacing: 20) {
            // Quality Trend Chart
            QualityTrendChart(data: viewModel.qualityTrend)

            // Performance Trend
            PerformanceTrendChart(data: viewModel.performanceTrend)

            // Stability Metrics
            StabilityMetricsView(metrics: viewModel.stabilityMetrics)
        }
    }

    // MARK: - Coverage Tab

    private var coverageContent: some View {
        VStack(spacing: 20) {
            // Coverage Heatmap
            CoverageHeatmap(coverage: viewModel.coverageByModule)

            // Coverage Breakdown
            CoverageBreakdownView(coverage: viewModel.coverageByModule)

            // Uncovered Code List
            UncoveredCodeView(uncovered: viewModel.uncoveredCode)
        }
    }

    // MARK: - Risks Tab

    private var risksContent: some View {
        VStack(spacing: 20) {
            // Risk Assessment Gauge
            RiskAssessmentGauge(risk: viewModel.deploymentRisk)

            // Recent Failures List
            RecentFailuresList(failures: viewModel.recentFailures)

            // Blockers and Warnings
            IssuesCard(blockers: viewModel.blockers, warnings: viewModel.warnings)
        }
    }

    // MARK: - Helper Methods

    private func exportReport() {
        do {
            let data = try viewModel.exportToPDF()
            // Present share sheet or save document
            viewModel.pdfData = data
            viewModel.showingExportSheet = true
        } catch {
            viewModel.errorMessage = "Failed to export report: \(error.localizedDescription)"
            viewModel.showingError = true
        }
    }

    private func formatDuration(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return "\(minutes)m \(seconds)s"
    }
}

// MARK: - Dashboard Tab

public enum DashboardTab: CaseIterable {
    case overview
    case trends
    case coverage
    case risks

    var displayName: String {
        switch self {
        case .overview: return "Overview"
        case .trends: return "Trends"
        case .coverage: return "Coverage"
        case .risks: return "Risks"
        }
    }
}

// MARK: - Dashboard View Model

public class DashboardViewModel: ObservableObject {
    @Published var keyMetrics: KeyMetrics = KeyMetrics(
        totalTests: 0,
        passRate: 0.0,
        coverage: 0.0,
        flakyTests: 0,
        openIssues: 0,
        buildTime: 0.0
    )

    @Published var qualityTrend: [ERQualityDataPoint] = []
    @Published var performanceTrend: [ERPerformanceDataPoint] = []
    @Published var coverageByModule: [ModuleCoverage] = []
    @Published var deploymentRisk: DeploymentRisk = DeploymentRisk(
        score: 0,
        level: .low,
        factors: []
    )

    @Published var recentFailures: [TestFailure] = []
    @Published var blockers: [Issue] = []
    @Published var warnings: [Issue] = []
    @Published var uncoveredCode: [UncoveredCode] = []
    @Published var recentActivities: [Activity] = []

    @Published var readinessScore: ReleaseReadiness = ReleaseReadiness(
        overallScore: 0,
        testGrade: .F,
        recommendation: .notReady,
        blockers: [],
        warnings: []
    )

    @Published var stabilityMetrics: StabilityMetrics = StabilityMetrics(
        flakinessRate: 0.0,
        meanTimeToRecovery: 0.0,
        successRate: 0.0
    )

    @Published var passRateTrend: ERTrendDirection = .stable
    @Published var coverageTrend: ERTrendDirection = .stable
    @Published var buildTimeTrend: ERTrendDirection = .stable

    @Published var isRefreshing: Bool = false
    @Published var pdfData: Data?
    @Published var showingExportSheet: Bool = false
    @Published var showingError: Bool = false
    @Published var errorMessage: String?

    private let dataService: DashboardDataService
    private var refreshTimer: Timer?

    public init(dataService: DashboardDataService = DashboardDataService()) {
        self.dataService = dataService
    }

    // MARK: - Data Loading

    public func refresh() {
        isRefreshing = true

        Task {
            do {
                async let metrics = dataService.fetchKeyMetrics()
                async let trend = dataService.fetchQualityTrend(days: 30)
                async let coverage = dataService.fetchCoverageByModule()
                async let risk = dataService.assessDeploymentRisk()
                async let failures = dataService.fetchRecentFailures(limit: 10)
                async let readiness = dataService.calculateReadinessScore()
                async let activities = dataService.fetchRecentActivities(limit: 5)
                async let perfTrend = dataService.fetchPerformanceTrend(days: 30)
                async let stability = dataService.fetchStabilityMetrics()
                async let issues = dataService.fetchIssues()

                let (metricsResult, trendResult, coverageResult, riskResult,
                     failuresResult, readinessResult, activitiesResult,
                     perfTrendResult, stabilityResult, issuesResult) = try await (
                    metrics, trend, coverage, risk, failures,
                    readiness, activities, perfTrend, stability, issues
                )

                await MainActor.run {
                    self.keyMetrics = metricsResult
                    self.qualityTrend = trendResult
                    self.coverageByModule = coverageResult
                    self.deploymentRisk = riskResult
                    self.recentFailures = failuresResult
                    self.readinessScore = readinessResult
                    self.recentActivities = activitiesResult
                    self.performanceTrend = perfTrendResult
                    self.stabilityMetrics = stabilityResult
                    self.blockers = issuesResult.blockers
                    self.warnings = issuesResult.warnings
                    self.uncoveredCode = issuesResult.uncoveredCode

                    // Calculate trends
                    self.passRateTrend = calculateTrend(for: trendResult, metric: \.passRate)
                    self.coverageTrend = calculateTrend(for: trendResult, metric: \.coverage)
                    self.buildTimeTrend = calculateTrend(for: perfTrendResult, metric: \.buildTime)

                    self.isRefreshing = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to refresh dashboard: \(error.localizedDescription)"
                    self.showingError = true
                    self.isRefreshing = false
                }
            }
        }
    }

    // MARK: - PDF Export

    public func exportToPDF() throws -> Data {
        let generator = PDFReportGenerator()
        let reportData = ReportData(
            title: "Quality Dashboard Report",
            dateRange: DateInterval(start: Date().addingTimeInterval(-30*24*3600), end: Date()),
            summary: generateExecutiveSummary(),
            metrics: buildMetricSections(),
            charts: buildChartConfigs(),
            tables: buildTableConfigs(),
            recommendations: readinessScore.recommendationText
        )

        return try generator.generateReport(from: reportData, template: .detailedReport)
    }

    // MARK: - Private Helpers

    private func generateExecutiveSummary() -> ExecutiveSummary {
        ExecutiveSummary(
            overallQuality: readinessScore.overallScore,
            trend: calculateOverallTrend(),
            keyAchievements: calculateAchievements(),
            criticalIssues: blockers.map { $0.description },
            recommendations: readinessScore.recommendationText,
            nextSteps: generateNextSteps()
        )
    }

    private func calculateOverallTrend() -> ERTrendDirection {
        let improvingCount = [passRateTrend, coverageTrend].filter { $0 == .improving }.count
        let decliningCount = [passRateTrend, coverageTrend].filter { $0 == .declining }.count

        if improvingCount > decliningCount { return .improving }
        if decliningCount > improvingCount { return .declining }
        return .stable
    }

    private func calculateAchievements() -> [String] {
        var achievements: [String] = []

        if keyMetrics.passRate >= 95.0 {
            achievements.append("Maintained excellent pass rate of \(keyMetrics.passRate, specifier: "%.1f")%")
        }

        if keyMetrics.coverage >= 80.0 {
            achievements.append("Achieved strong test coverage of \(keyMetrics.coverage, specifier: "%.1f")%")
        }

        if keyMetrics.flakyTests == 0 {
            achievements.append("Eliminated all flaky tests")
        }

        return achievements
    }

    private func generateNextSteps() -> [String] {
        var steps: [String] = []

        if !blockers.isEmpty {
            steps.append("Address \(blockers.count) critical blockers")
        }

        if keyMetrics.coverage < 80.0 {
            steps.append("Increase test coverage to 80%+")
        }

        if keyMetrics.flakyTests > 0 {
            steps.append("Fix \(keyMetrics.flakyTests) flaky tests")
        }

        return steps
    }

    private func buildMetricSections() -> [MetricSection] {
        [
            MetricSection(
                title: "Test Metrics",
                metrics: [
                    ("Total Tests", "\(keyMetrics.totalTests)"),
                    ("Pass Rate", "\(keyMetrics.passRate, specifier: "%.1f")%"),
                    ("Coverage", "\(keyMetrics.coverage, specifier: "%.1f")%"),
                    ("Flaky Tests", "\(keyMetrics.flakyTests)")
                ]
            ),
            MetricSection(
                title: "Build Metrics",
                metrics: [
                    ("Build Time", formatDuration(keyMetrics.buildTime)),
                    ("Open Issues", "\(keyMetrics.openIssues)")
                ]
            )
        ]
    }

    private func buildChartConfigs() -> [ChartConfig] {
        [
            ChartConfig(
                type: .line,
                title: "Quality Trend",
                data: qualityTrend.map { $0.toChartData() }
            ),
            ChartConfig(
                type: .bar,
                title: "Coverage by Module",
                data: coverageByModule.map { $0.toChartData() }
            )
        ]
    }

    private func buildTableConfigs() -> [TableConfig] {
        [
            TableConfig(
                title: "Recent Failures",
                headers: ["Test", "Module", "Failed At"],
                rows: recentFailures.map { failure in
                    [
                        failure.testName,
                        failure.module,
                        formatDate(failure.failedAt)
                    ]
                }
            )
        ]
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func formatDuration(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return "\(minutes)m \(seconds)s"
    }

    private func calculateTrend<T>(
        for data: [T],
        metric: KeyPath<T, Double>
    ) -> ERTrendDirection {
        guard data.count >= 2 else { return .stable }

        let recent = data.suffix(7)
        let older = data.prefix(7)

        let recentAvg = recent.map { $0[keyPath: metric] }.reduce(0, +) / Double(recent.count)
        let olderAvg = older.map { $0[keyPath: metric] }.reduce(0, +) / Double(older.count)

        let diff = recentAvg - olderAvg

        if abs(diff) < 0.01 { return .stable }
        return diff > 0 ? .improving : .declining
    }

    public func startAutoRefresh(interval: TimeInterval = 300) { // 5 minutes default
        stopAutoRefresh()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    public func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    deinit {
        stopAutoRefresh()
    }
}

// MARK: - Supporting Types

public struct KeyMetrics {
    public let totalTests: Int
    public let passRate: Double
    public let coverage: Double
    public let flakyTests: Int
    public let openIssues: Int
    public let buildTime: TimeInterval

    public init(totalTests: Int, passRate: Double, coverage: Double,
                flakyTests: Int, openIssues: Int, buildTime: TimeInterval) {
        self.totalTests = totalTests
        self.passRate = passRate
        self.coverage = coverage
        self.flakyTests = flakyTests
        self.openIssues = openIssues
        self.buildTime = buildTime
    }
}

public struct ReleaseReadiness {
    public let overallScore: Int      // 0-100
    public let testGrade: ERGrade
    public let recommendation: Recommendation
    public let blockers: [String]
    public let warnings: [String]

    public var recommendationText: [String] {
        switch recommendation {
        case .readyForRelease:
            return ["Ready for release - all quality gates passed"]
        case .readyWithWarnings:
            return warnings
        case .notReady:
            return ["Not ready - address blockers and warnings"]
        case .blocked:
            return blockers
        }
    }

    public init(overallScore: Int, testGrade: ERGrade, recommendation: Recommendation,
                blockers: [String], warnings: [String]) {
        self.overallScore = overallScore
        self.testGrade = testGrade
        self.recommendation = recommendation
        self.blockers = blockers
        self.warnings = warnings
    }

    public enum Recommendation {
        case readyForRelease
        case readyWithWarnings
        case notReady
        case blocked
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

    public var letter: String {
        switch self {
        case .plus: return "A+"
        case .standard: return "A"
        case .minus: return "A-"
        case .F: return "F"
        }
    }
}

public enum ERTrendDirection {
    case improving
    case stable
    case declining
}

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

public struct DeploymentRisk {
    public let score: Int              // 0-100
    public let level: RiskLevel
    public let factors: [RiskFactor]

    public init(score: Int, level: RiskLevel, factors: [RiskFactor]) {
        self.score = score
        self.level = level
        self.factors = factors
    }

    public enum RiskLevel {
        case low
        case medium
        case high
        case critical
    }
}

public struct RiskFactor {
    public let description: String
    public let impact: Impact
    public let likelihood: Likelihood

    public enum Impact {
        case low
        case medium
        case high
        case critical
    }

    public enum Likelihood {
        case low
        case medium
        case high
    }
}

public struct TestFailure: Identifiable {
    public let id = UUID()
    public let testName: String
    public let module: String
    public let errorMessage: String
    public let failedAt: Date

    public init(testName: String, module: String, errorMessage: String, failedAt: Date) {
        self.testName = testName
        self.module = module
        self.errorMessage = errorMessage
        self.failedAt = failedAt
    }
}

public struct Issue: Identifiable {
    public let id = UUID()
    public let title: String
    public let description: String
    public let severity: IssueSeverity
    public let assignee: String?

    public init(title: String, description: String, severity: IssueSeverity, assignee: String? = nil) {
        self.title = title
        self.description = description
        self.severity = severity
        self.assignee = assignee
    }

    public enum IssueSeverity {
        case blocker
        case warning
        case info
    }
}

public struct UncoveredCode: Identifiable {
    public let id = UUID()
    public let file: String
    public let line: Int
    public let function: String

    public init(file: String, line: Int, function: String) {
        self.file = file
        self.line = line
        self.function = function
    }
}

public struct Activity: Identifiable {
    public let id = UUID()
    public let title: String
    public let description: String
    public let timestamp: Date
    public let type: ActivityType

    public init(title: String, description: String, timestamp: Date, type: ActivityType) {
        self.title = title
        self.description = description
        self.timestamp = timestamp
        self.type = type
    }

    public enum ActivityType {
        case build
        case test
        case deployment
        case issue
    }
}

public struct StabilityMetrics {
    public let flakinessRate: Double
    public let meanTimeToRecovery: Double
    public let successRate: Double

    public init(flakinessRate: Double, meanTimeToRecovery: Double, successRate: Double) {
        self.flakinessRate = flakinessRate
        self.meanTimeToRecovery = meanTimeToRecovery
        self.successRate = successRate
    }
}

// MARK: - Chart Data Support

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

public struct ChartConfig {
    public let type: ChartType
    public let title: String
    public let data: [ChartData]

    public enum ChartType {
        case line
        case bar
        case pie
        case gauge
    }

    public init(type: ChartType, title: String, data: [ChartData]) {
        self.type = type
        self.title = title
        self.data = data
    }
}

public struct MetricSection {
    public let title: String
    public let metrics: [(String, String)]

    public init(title: String, metrics: [(String, String)]) {
        self.title = title
        self.metrics = metrics
    }
}

public struct TableConfig {
    public let title: String
    public let headers: [String]
    public let rows: [[String]]

    public init(title: String, headers: [String], rows: [[String]]) {
        self.title = title
        self.headers = headers
        self.rows = rows
    }
}
