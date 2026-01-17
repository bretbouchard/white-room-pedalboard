import PDFKit
import SwiftUI
import Charts

/// Generates PDF reports with charts, tables, and executive summaries
public class PDFReportGenerator {

    // MARK: - Public API

    /// Generates a complete PDF report from report data
    public func generateReport(
        from data: ReportData,
        template: ReportTemplate
    ) throws -> PDFDocument {
        switch template {
        case .executiveSummary:
            return try generateExecutiveSummaryReport(data)
        case .detailedReport:
            return try generateDetailedReport(data)
        case .trendReport:
            return try generateTrendReport(data)
        case .releaseReport:
            return try generateReleaseReport(data)
        case .custom(let templateName):
            return try generateCustomReport(data, template: templateName)
        }
    }

    /// Generates executive summary as PDF data
    public func generateExecutiveSummary(_ summary: ExecutiveSummary) throws -> Data {
        let data = ReportData(
            title: "Executive Summary",
            dateRange: DateInterval(start: Date().addingTimeInterval(-30*24*3600), end: Date()),
            summary: summary,
            metrics: [],
            charts: [],
            tables: [],
            recommendations: summary.recommendations
        )

        let pdfDoc = try generateExecutiveSummaryReport(data)
        return pdfDoc.dataRepresentation() ?? Data()
    }

    /// Generates trend report as PDF data
    public func generateTrendReport(_ trends: [ERQualityTrend]) throws -> Data {
        let chartData = trends.map { trend in
            ChartData(
                x: formatDate(trend.date),
                y: trend.value,
                series: trend.metric.rawValue
            )
        }

        let chartConfig = ChartConfig(
            type: .line,
            title: "Quality Trends",
            data: chartData
        )

        let data = ReportData(
            title: "Trend Report",
            dateRange: DateInterval(start: Date().addingTimeInterval(-30*24*3600), end: Date()),
            summary: ExecutiveSummary(
                overallQuality: Int(trends.last?.value ?? 0),
                trend: .stable,
                keyAchievements: [],
                criticalIssues: [],
                recommendations: [],
                nextSteps: []
            ),
            metrics: [],
            charts: [chartConfig],
            tables: [],
            recommendations: []
        )

        let pdfDoc = try generateTrendReport(data)
        return pdfDoc.dataRepresentation() ?? Data()
    }

    /// Generates release report as PDF data
    public func generateReleaseReport(_ release: ReleaseInfo) throws -> Data {
        let data = ReportData(
            title: "Release Report - \(release.version)",
            dateRange: DateInterval(start: Date().addingTimeInterval(-30*24*3600), end: Date()),
            summary: ExecutiveSummary(
                overallQuality: 0,
                trend: .stable,
                keyAchievements: [],
                criticalIssues: [],
                recommendations: [],
                nextSteps: []
            ),
            metrics: [],
            charts: [],
            tables: [],
            recommendations: []
        )

        let pdfDoc = try generateReleaseReport(data)
        return pdfDoc.dataRepresentation() ?? Data()
    }

    // MARK: - Report Generation

    private func generateExecutiveSummaryReport(_ data: ReportData) throws -> PDFDocument {
        let pdfRenderer = PDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792)) // US Letter

        // Page 1: Executive Summary
        try renderExecutiveSummaryPage(pdfRenderer, data: data)

        return pdfRenderer.document
    }

    private func generateDetailedReport(_ data: ReportData) throws -> PDFDocument {
        let pdfRenderer = PDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))

        // Page 1: Executive Summary
        try renderExecutiveSummaryPage(pdfRenderer, data: data)

        // Page 2: Metrics
        try renderMetricsPage(pdfRenderer, data: data)

        // Page 3: Charts
        for (index, chart) in data.charts.enumerated() {
            if index > 0 {
                pdfRenderer.beginNewPage()
            }
            try renderChartPage(pdfRenderer, chart: chart)
        }

        // Page 4: Tables
        for (index, table) in data.tables.enumerated() {
            if index > 0 {
                pdfRenderer.beginNewPage()
            }
            try renderTablePage(pdfRenderer, table: table)
        }

        // Page 5: Recommendations
        try renderRecommendationsPage(pdfRenderer, data: data)

        return pdfRenderer.document
    }

    private func generateTrendReport(_ data: ReportData) throws -> PDFDocument {
        let pdfRenderer = PDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))

        // Page 1: Title and Summary
        try renderTitlePage(pdfRenderer, data: data)

        // Page 2+: Trend Charts
        for chart in data.charts {
            pdfRenderer.beginNewPage()
            try renderChartPage(pdfRenderer, chart: chart)
        }

        return pdfRenderer.document
    }

    private func generateReleaseReport(_ data: ReportData) throws -> PDFDocument {
        let pdfRenderer = PDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))

        // Page 1: Release Summary
        try renderTitlePage(pdfRenderer, data: data)

        // Page 2: Quality Metrics
        try renderMetricsPage(pdfRenderer, data: data)

        // Page 3: Release Readiness
        try renderReleaseReadinessPage(pdfRenderer, data: data)

        return pdfRenderer.document
    }

    private func generateCustomReport(_ data: ReportData, template: String) throws -> PDFDocument {
        // Load custom template and generate report
        return try generateDetailedReport(data)
    }

    // MARK: - Page Rendering

    private func renderTitlePage(_ renderer: PDFRenderer, data: ReportData) throws {
        renderer.beginNewPage()

        // Title
        renderer.drawString(
            data.title,
            at: CGPoint(x: 50, y: 700),
            font: .boldSystemFont(ofSize: 32),
            color: .black
        )

        // Date Range
        let dateString = formatDateRange(data.dateRange)
        renderer.drawString(
            dateString,
            at: CGPoint(x: 50, y: 660),
            font: .systemFont(ofSize: 14),
            color: .gray
        )

        // Summary
        var yPosition: CGFloat = 600
        renderer.drawString(
            "Executive Summary",
            at: CGPoint(x: 50, y: yPosition),
            font: .boldSystemFont(ofSize: 20),
            color: .black
        )

        yPosition -= 40
        renderer.drawString(
            "Overall Quality: \(data.summary.overallQuality)/100",
            at: CGPoint(x: 50, y: yPosition),
            font: .systemFont(ofSize: 16),
            color: .black
        )

        yPosition -= 30
        renderer.drawString(
            "Trend: \(data.summary.trend.rawValue)",
            at: CGPoint(x: 50, y: yPosition),
            font: .systemFont(ofSize: 14),
            color: .gray
        )
    }

    private func renderExecutiveSummaryPage(_ renderer: PDFRenderer, data: ReportData) throws {
        try renderTitlePage(renderer, data: data)

        var yPosition: CGFloat = 500

        // Key Achievements
        if !data.summary.keyAchievements.isEmpty {
            renderer.drawString(
                "Key Achievements",
                at: CGPoint(x: 50, y: yPosition),
                font: .boldSystemFont(ofSize: 16),
                color: .black
            )
            yPosition -= 25

            for achievement in data.summary.keyAchievements {
                renderer.drawString(
                    "• \(achievement)",
                    at: CGPoint(x: 70, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .black
                )
                yPosition -= 20
            }
            yPosition -= 20
        }

        // Critical Issues
        if !data.summary.criticalIssues.isEmpty {
            renderer.drawString(
                "Critical Issues",
                at: CGPoint(x: 50, y: yPosition),
                font: .boldSystemFont(ofSize: 16),
                color: .red
            )
            yPosition -= 25

            for issue in data.summary.criticalIssues {
                renderer.drawString(
                    "• \(issue)",
                    at: CGPoint(x: 70, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .black
                )
                yPosition -= 20
            }
            yPosition -= 20
        }

        // Recommendations
        if !data.summary.recommendations.isEmpty {
            renderer.drawString(
                "Recommendations",
                at: CGPoint(x: 50, y: yPosition),
                font: .boldSystemFont(ofSize: 16),
                color: .blue
            )
            yPosition -= 25

            for recommendation in data.summary.recommendations {
                renderer.drawString(
                    "• \(recommendation)",
                    at: CGPoint(x: 70, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .black
                )
                yPosition -= 20
            }
        }
    }

    private func renderMetricsPage(_ renderer: PDFRenderer, data: ReportData) throws {
        renderer.beginNewPage()

        renderer.drawString(
            "Quality Metrics",
            at: CGPoint(x: 50, y: 720),
            font: .boldSystemFont(ofSize: 24),
            color: .black
        )

        var yPosition: CGFloat = 680

        for section in data.metrics {
            // Section Title
            renderer.drawString(
                section.title,
                at: CGPoint(x: 50, y: yPosition),
                font: .boldSystemFont(ofSize: 16),
                color: .black
            )
            yPosition -= 25

            // Metrics
            for (label, value) in section.metrics {
                renderer.drawString(
                    "\(label):",
                    at: CGPoint(x: 70, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .gray
                )

                renderer.drawString(
                    value,
                    at: CGPoint(x: 200, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .black
                )
                yPosition -= 20
            }
            yPosition -= 15
        }
    }

    private func renderChartPage(_ renderer: PDFRenderer, chart: ChartConfig) throws {
        renderer.drawString(
            chart.title,
            at: CGPoint(x: 50, y: 720),
            font: .boldSystemFont(ofSize: 18),
            color: .black
        )

        // Generate chart image
        let chartImage = try generateChartImage(from: chart, size: CGSize(width: 512, height: 400))

        if let cgImage = chartImage.asCGImage() {
            let image = NSImage(cgImage: cgImage, size: NSSize(width: 512, height: 400))
            renderer.drawImage(image, at: CGPoint(x: 50, y: 250))
        }
    }

    private func renderTablePage(_ renderer: PDFRenderer, table: TableConfig) throws {
        renderer.drawString(
            table.title,
            at: CGPoint(x: 50, y: 720),
            font: .boldSystemFont(ofSize: 18),
            color: .black
        )

        // Draw table headers
        var xPosition: CGFloat = 50
        let columnWidth: CGFloat = 150

        renderer.drawString(
            "",
            at: CGPoint(x: xPosition, y: 680),
            font: .boldSystemFont(ofSize: 12),
            color: .black
        )

        xPosition = 50
        for header in table.headers {
            renderer.drawString(
                header,
                at: CGPoint(x: xPosition, y: 680),
                font: .boldSystemFont(ofSize: 12),
                color: .black
            )
            xPosition += columnWidth
        }

        // Draw horizontal line
        renderer.drawLine(
            from: CGPoint(x: 50, y: 670),
            to: CGPoint(x: 562, y: 670),
            width: 1.0,
            color: .black
        )

        // Draw table rows
        var yPosition: CGFloat = 650
        for row in table.rows {
            xPosition = 50
            for cell in row {
                renderer.drawString(
                    cell,
                    at: CGPoint(x: xPosition, y: yPosition),
                    font: .systemFont(ofSize: 10),
                    color: .black
                )
                xPosition += columnWidth
            }
            yPosition -= 20
        }
    }

    private func renderRecommendationsPage(_ renderer: PDFRenderer, data: ReportData) throws {
        renderer.beginNewPage()

        renderer.drawString(
            "Recommendations",
            at: CGPoint(x: 50, y: 720),
            font: .boldSystemFont(ofSize: 24),
            color: .black
        )

        var yPosition: CGFloat = 680

        for recommendation in data.recommendations {
            renderer.drawString(
                "• \(recommendation)",
                at: CGPoint(x: 70, y: yPosition),
                font: .systemFont(ofSize: 12),
                color: .black
            )
            yPosition -= 25
        }
    }

    private func renderReleaseReadinessPage(_ renderer: PDFRenderer, data: ReportData) throws {
        renderer.beginNewPage()

        renderer.drawString(
            "Release Readiness",
            at: CGPoint(x: 50, y: 720),
            font: .boldSystemFont(ofSize: 24),
            color: .black
        )

        let score = data.summary.overallQuality
        renderer.drawString(
            "Overall Score: \(score)/100",
            at: CGPoint(x: 50, y: 680),
            font: .boldSystemFont(ofSize: 18),
            color: scoreColor(score)
        )

        var yPosition: CGFloat = 640

        if !data.summary.criticalIssues.isEmpty {
            renderer.drawString(
                "Blockers",
                at: CGPoint(x: 50, y: yPosition),
                font: .boldSystemFont(ofSize: 16),
                color: .red
            )
            yPosition -= 25

            for blocker in data.summary.criticalIssues {
                renderer.drawString(
                    "• \(blocker)",
                    at: CGPoint(x: 70, y: yPosition),
                    font: .systemFont(ofSize: 12),
                    color: .black
                )
                yPosition -= 20
            }
        }
    }

    // MARK: - Chart Generation

    private func generateChartImage(from config: ChartConfig, size: CGSize) throws -> NSImage {
        let hostingController = UIHostingController(
            rootView: ChartViewRepresentable(config: config, size: size)
        )

        hostingController.view.bounds = CGRect(origin: .zero, size: size)
        hostingController.view.backgroundColor = .clear

        let renderer = ImageRenderer(content: hostingController.view)
        renderer.scale = 2.0 // Retina quality

        return renderer.nsImage ?? NSImage(size: size)
    }

    // MARK: - Helper Methods

    private func formatDateRange(_ interval: DateInterval) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return "\(formatter.string(from: interval.start)) - \(formatter.string(from: interval.end))"
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }

    private func scoreColor(_ score: Int) -> NSColor {
        switch score {
        case 90...100: return .systemGreen
        case 75..<90: return .systemBlue
        case 60..<75: return .systemOrange
        default: return .systemRed
        }
    }
}

// MARK: - PDF Renderer

private class PDFRenderer {
    private var context: CGContext
    private var document: PDFDocument
    private var currentPage: PDFPage
    private var bounds: CGRect

    init(bounds: CGRect) {
        self.bounds = bounds

        // Setup PDF context
        let data = NSMutableData()
        UIGraphicsBeginPDFContextToData(data, bounds, nil)

        if let context = UIGraphicsGetCurrentContext() {
            self.context = context
        } else {
            fatalError("Failed to create PDF graphics context")
        }

        self.document = PDFDocument()
        self.currentPage = PDFPage()

        beginNewPage()
    }

    func beginNewPage() {
        UIGraphicsBeginPDFPage()
        context = UIGraphicsGetCurrentContext()!
    }

    func drawString(_ string: String, at point: CGPoint, font: NSFont, color: NSColor) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color
        ]

        let attributedString = NSAttributedString(string: string, attributes: attributes)
        attributedString.draw(at: point)
    }

    func drawLine(from start: CGPoint, to end: CGPoint, width: CGFloat, color: NSColor) {
        context.setLineWidth(width)
        context.setStrokeColor(color.cgColor)
        context.move(to: start)
        context.addLine(to: end)
        context.strokePath()
    }

    func drawImage(_ image: NSImage, at point: CGPoint) {
        image.draw(at: point)
    }

    var finalDocument: PDFDocument {
        UIGraphicsEndPDFContext()
        return document
    }
}

// MARK: - Chart View Representable

private struct ChartViewRepresentable: View {
    let config: ChartConfig
    let size: CGSize

    var body: some View {
        VStack {
            Text(config.title)
                .font(.headline)
                .padding()

            switch config.type {
            case .line:
                LineChartView(data: config.data)
            case .bar:
                BarChartView(data: config.data)
            case .pie:
                PieChartView(data: config.data)
            case .gauge:
                GaugeChartView(data: config.data)
            }
        }
        .frame(width: size.width, height: size.height)
    }
}

private struct LineChartView: View {
    let data: [ChartData]

    var body: some View {
        Chart(data) { point in
            LineMark(
                x: .value("X", point.x),
                y: .value("Y", point.y)
            )
            .foregroundStyle(by: .value("Series", point.series))
        }
        .frame(height: 300)
    }
}

private struct BarChartView: View {
    let data: [ChartData]

    var body: some View {
        Chart(data) { point in
            BarMark(
                x: .value("X", point.x),
                y: .value("Y", point.y)
            )
            .foregroundStyle(by: .value("Series", point.series))
        }
        .frame(height: 300)
    }
}

private struct PieChartView: View {
    let data: [ChartData]

    var body: some View {
        Chart(data) { point in
            SectorMark(
                angle: .value("Value", point.y),
                innerRadius: .ratio(0.3),
                angularInset: 2
            )
            .foregroundStyle(by: .value("Category", point.x))
            .cornerRadius(5)
        }
        .frame(height: 300)
    }
}

private struct GaugeChartView: View {
    let data: [ChartData]

    var body: some View {
        if let value = data.first {
            Gauge(value: value.y, in: 0...100) {
                Text(value.series)
            } currentValueLabel: {
                Text("\(Int(value.y))")
            }
            .gaugeStyle(.accessoryCircular)
            .frame(height: 200)
        }
    }
}

// MARK: - Supporting Types

public struct ReportData {
    public let title: String
    public let dateRange: DateInterval
    public let summary: ExecutiveSummary
    public let metrics: [MetricSection]
    public let charts: [ChartConfig]
    public let tables: [TableConfig]
    public let recommendations: [String]

    public init(title: String, dateRange: DateInterval, summary: ExecutiveSummary,
                metrics: [MetricSection], charts: [ChartConfig], tables: [TableConfig],
                recommendations: [String]) {
        self.title = title
        self.dateRange = dateRange
        self.summary = summary
        self.metrics = metrics
        self.charts = charts
        self.tables = tables
        self.recommendations = recommendations
    }
}

public struct ExecutiveSummary {
    public let overallQuality: Int
    public let trend: ERTrendDirection
    public let keyAchievements: [String]
    public let criticalIssues: [String]
    public let recommendations: [String]
    public let nextSteps: [String]

    public init(overallQuality: Int, trend: ERTrendDirection, keyAchievements: [String],
                criticalIssues: [String], recommendations: [String], nextSteps: [String]) {
        self.overallQuality = overallQuality
        self.trend = trend
        self.keyAchievements = keyAchievements
        self.criticalIssues = criticalIssues
        self.recommendations = recommendations
        self.nextSteps = nextSteps
    }
}

public enum ReportTemplate {
    case executiveSummary
    case detailedReport
    case trendReport
    case releaseReport
    case custom(template: String)
}

public struct ReleaseInfo {
    public let version: String
    public let targetDate: Date
    public let features: [Feature]
    public let testResults: TestResults
    public let qualityMetrics: QualityMetrics
    public let securityScan: SecurityScanResults
    public let performanceBaseline: ERPerformanceBaseline

    public init(version: String, targetDate: Date, features: [Feature], testResults: TestResults,
                qualityMetrics: QualityMetrics, securityScan: SecurityScanResults,
                performanceBaseline: ERPerformanceBaseline) {
        self.version = version
        self.targetDate = targetDate
        self.features = features
        self.testResults = testResults
        self.qualityMetrics = qualityMetrics
        self.securityScan = securityScan
        self.performanceBaseline = performanceBaseline
    }
}

// MARK: - Supporting Types for ReleaseInfo

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

    public init(totalTests: Int, passedTests: Int, failedTests: Int, skippedTests: Int) {
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

    public init(criticalVulnerabilities: Int, highVulnerabilities: Int,
                mediumVulnerabilities: Int, lowVulnerabilities: Int) {
        self.criticalVulnerabilities = criticalVulnerabilities
        self.highVulnerabilities = highVulnerabilities
        self.mediumVulnerabilities = mediumVulnerabilities
        self.lowVulnerabilities = lowVulnerabilities
    }
}

public struct ERQualityTrend {
    public let date: Date
    public let metric: ERQualityMetric
    public let value: Double
    public let context: ERTrendContext?

    public init(date: Date, metric: ERQualityMetric, value: Double, context: ERTrendContext?) {
        self.date = date
        self.metric = metric
        self.value = value
        self.context = context
    }
}

public enum ERQualityMetric: String {
    case testCoverage = "Test Coverage"
    case passRate = "Pass Rate"
    case flakyTestCount = "Flaky Tests"
    case buildTime = "Build Time"
    case deploymentSuccessRate = "Deployment Success"
    case meanTimeToRecovery = "MTTR"
    case defectEscapeRate = "Defect Escape Rate"
}

public struct ERTrendContext {
    public let commitHash: String?
    public let prNumber: Int?
    public let author: String?
    public let notes: String?

    public init(commitHash: String?, prNumber: Int?, author: String?, notes: String?) {
        self.commitHash = commitHash
        self.prNumber = prNumber
        self.author = author
        self.notes = notes
    }
}
