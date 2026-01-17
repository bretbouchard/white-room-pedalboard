import SwiftUI
import Charts
import Combine

/// Visualizes quality trends with interactive charts and anomaly detection
public class TrendVisualizer: ObservableObject {
    @Published var trends: [TrendVisualizerQualityTrend] = []
    @Published var anomalies: [TrendAnomaly] = []
    @Published var prediction: TrendPrediction?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let dataService: TrendDataService
    private var cancellables = Set<AnyCancellable>()

    public init(dataService: TrendDataService = TrendDataService()) {
        self.dataService = dataService
    }

    // MARK: - Public API

    /// Loads trends for a specific metric
    public func loadTrends(
        for metric: TrendVisualizerQualityMetric,
        from startDate: Date,
        to endDate: Date
    ) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let loadedTrends = try await dataService.fetchTrends(
                    metric: metric,
                    from: startDate,
                    to: endDate
                )

                await MainActor.run {
                    self.trends = loadedTrends
                    self.anomalies = detectAnomalies(in: loadedTrends)
                    self.prediction = predictFutureTrend(loadedTrends, daysAhead: 7)
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load trends: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }

    /// Generates comprehensive trend report
    public func generateTrendReport(_ trends: [TrendVisualizerQualityTrend]) -> TrendReport {
        let anomalies = detectAnomalies(in: trends)
        let prediction = predictFutureTrend(trends, daysAhead: 7)

        return TrendReport(
            metric: trends.first?.metric ?? .testCoverage,
            trends: trends,
            anomalies: anomalies,
            prediction: prediction,
            summary: generateSummary(trends, anomalies: anomalies, prediction: prediction)
        )
    }

    /// Detects anomalies in trend data
    public func detectAnomalies(in trends: [TrendVisualizerQualityTrend]) -> [TrendAnomaly] {
        guard trends.count >= 5 else { return [] }

        var detectedAnomalies: [TrendAnomaly] = []

        // Calculate moving average and standard deviation
        let windowSize = min(7, trends.count)

        for i in windowSize..<(trends.count) {
            let window = trends[(i - windowSize)..<(i)]
            let values = window.map { $0.value }

            let avg = values.reduce(0, +) / Double(values.count)
            let variance = values.map { pow($0 - avg, 2) }.reduce(0, +) / Double(values.count)
            let stdDev = sqrt(variance)

            let currentValue = trends[i].value
            let zScore = abs((currentValue - avg) / stdDev)

            // Detect anomalies (z-score > 2.5)
            if zScore > 2.5 {
                let severity: AnomalySeverity
                if zScore > 4.0 {
                    severity = .critical
                } else if zScore > 3.0 {
                    severity = .high
                } else {
                    severity = .medium
                }

                let anomaly = TrendAnomaly(
                    date: trends[i].date,
                    metric: trends[i].metric,
                    expectedValue: avg,
                    actualValue: currentValue,
                    deviation: currentValue - avg,
                    severity: severity,
                    likelyCause: determineCause(trends[i], deviation: currentValue - avg)
                )

                detectedAnomalies.append(anomaly)
            }
        }

        return detectedAnomalies
    }

    /// Predicts future trend using linear regression
    public func predictFutureTrend(
        _ trends: [TrendVisualizerQualityTrend],
        daysAhead: Int
    ) -> TrendPrediction? {
        guard trends.count >= 3 else { return nil }

        // Prepare data for linear regression
        let dataPoints = trends.suffix(30) // Use last 30 data points
        let n = Double(dataPoints.count)

        let x = dataPoints.enumerated().map { Double($0.offset) }
        let y = dataPoints.map { $0.value }

        // Calculate linear regression: y = mx + b
        let sumX = x.reduce(0, +)
        let sumY = y.reduce(0, +)
        let sumXY = zip(x, y).map(*).reduce(0, +)
        let sumXX = x.map { $0 * $0 }.reduce(0, +)

        let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        let intercept = (sumY - slope * sumX) / n

        // Predict future value
        let futureX = Double(dataPoints.count + daysAhead - 1)
        let predictedValue = slope * futureX + intercept

        // Calculate confidence (R²)
        let yMean = sumY / n
        let ssRes = zip(x, y).map { xi, yi in
            let yPred = slope * xi + intercept
            return pow(yi - yPred, 2)
        }.reduce(0, +)

        let ssTot = y.map { pow($0 - yMean, 2) }.reduce(0, +)
        let rSquared = 1 - (ssRes / ssTot)
        let confidence = max(0, min(1, rSquared))

        // Determine trend direction
        let trendDirection: TrendVisualizerDirection
        if abs(slope) < 0.01 {
            trendDirection = .stable
        } else {
            trendDirection = slope > 0 ? .improving : .declining
        }

        let currentValue = trends.last?.value ?? 0.0

        return TrendPrediction(
            metric: trends.first?.metric ?? .testCoverage,
            currentValue: currentValue,
            predictedValue: predictedValue,
            confidence: confidence,
            date: Date().addingTimeInterval(Double(daysAhead) * 24 * 3600),
            trendDirection: trendDirection
        )
    }

    // MARK: - Private Methods

    private func generateSummary(
        trends: [TrendVisualizerQualityTrend],
        anomalies: [TrendAnomaly],
        prediction: TrendPrediction?
    ) -> String {
        var summary = ""

        guard let first = trends.first, let last = trends.last else {
            return "Insufficient data for trend analysis"
        }

        let change = last.value - first.value
        let percentChange = (change / first.value) * 100

        summary += "Trend analysis for \(last.metric.rawValue):\n"
        summary += "Current value: \(String(format: "%.2f", last.value))\n"
        summary += "Change: \(String(format: "%.2f", change)) (\(String(format: "%.1f", percentChange))%)\n"

        if let prediction = prediction {
            summary += "\nPrediction (7 days): "
            summary += "\(String(format: "%.2f", prediction.predictedValue)) "
            summary += "(\(prediction.trendDirection.rawValue))\n"
            summary += "Confidence: \(String(format: "%.0f", prediction.confidence * 100))%\n"
        }

        if !anomalies.isEmpty {
            summary += "\nDetected \(anomalies.count) anomalies\n"
            let criticalCount = anomalies.filter { $0.severity == .critical }.count
            if criticalCount > 0 {
                summary += "Critical: \(criticalCount)\n"
            }
        }

        return summary
    }

    private func determineCause(
        _ trend: TrendVisualizerQualityTrend,
        deviation: Double
    ) -> String? {
        // Analyze context to determine likely cause
        if let context = trend.context {
            if let prNumber = context.prNumber {
                return "PR #\(prNumber) may have impacted \(trend.metric.rawValue)"
            }

            if let author = context.author {
                return "Changes by \(author) may have affected metrics"
            }

            if let notes = context.notes {
                return notes
            }
        }

        // Generic causes based on deviation
        if abs(deviation) > 10 {
            return "Significant deviation - investigate recent changes"
        }

        return nil
    }
}

// MARK: - Supporting Types

public struct TrendVisualizerQualityTrend: Identifiable {
    public let id = UUID()
    public let date: Date
    public let metric: TrendVisualizerQualityMetric
    public let value: Double
    public let context: TrendVisualizerContext?

    public init(date: Date, metric: TrendVisualizerQualityMetric, value: Double, context: TrendVisualizerContext? = nil) {
        self.date = date
        self.metric = metric
        self.value = value
        self.context = context
    }
}

public enum TrendVisualizerQualityMetric: String, CaseIterable {
    case testCoverage = "Test Coverage"
    case passRate = "Pass Rate"
    case flakyTestCount = "Flaky Test Count"
    case buildTime = "Build Time"
    case deploymentSuccessRate = "Deployment Success Rate"
    case meanTimeToRecovery = "Mean Time To Recovery"
    case defectEscapeRate = "Defect Escape Rate"
    case codeComplexity = "Code Complexity"
}

public struct TrendContext {
    public let commitHash: String?
    public let prNumber: Int?
    public let author: String?
    public let notes: String?

    public init(
        commitHash: String? = nil,
        prNumber: Int? = nil,
        author: String? = nil,
        notes: String? = nil
    ) {
        self.commitHash = commitHash
        self.prNumber = prNumber
        self.author = author
        self.notes = notes
    }
}

public struct TrendAnomaly: Identifiable {
    public let id = UUID()
    public let date: Date
    public let metric: TrendVisualizerQualityMetric
    public let expectedValue: Double
    public let actualValue: Double
    public let deviation: Double
    public let severity: AnomalySeverity
    public let likelyCause: String?

    public init(
        date: Date,
        metric: TrendVisualizerQualityMetric,
        expectedValue: Double,
        actualValue: Double,
        deviation: Double,
        severity: AnomalySeverity,
        likelyCause: String? = nil
    ) {
        self.date = date
        self.metric = metric
        self.expectedValue = expectedValue
        self.actualValue = actualValue
        self.deviation = deviation
        self.severity = severity
        self.likelyCause = likelyCause
    }
}

public enum AnomalySeverity {
    case low
    case medium
    case high
    case critical

    var color: Color {
        switch self {
        case .low: return .yellow
        case .medium: return .orange
        case .high: return .red
        case .critical: return .purple
        }
    }
}

public struct TrendPrediction {
    public let metric: TrendVisualizerQualityMetric
    public let currentValue: Double
    public let predictedValue: Double
    public let confidence: Double
    public let date: Date
    public let trendDirection: TrendVisualizerDirection

    public init(
        metric: TrendVisualizerQualityMetric,
        currentValue: Double,
        predictedValue: Double,
        confidence: Double,
        date: Date,
        trendDirection: TrendVisualizerDirection
    ) {
        self.metric = metric
        self.currentValue = currentValue
        self.predictedValue = predictedValue
        self.confidence = confidence
        self.date = date
        self.trendDirection = trendDirection
    }
}

public enum TrendVisualizerDirection: String {
    case improving = "Improving"
    case stable = "Stable"
    case declining = "Declining"

    var icon: String {
        switch self {
        case .improving: return "arrow.up.right"
        case .stable: return "arrow.right"
        case .declining: return "arrow.down.right"
        }
    }

    var color: Color {
        switch self {
        case .improving: return .green
        case .stable: return .blue
        case .declining: return .red
        }
    }
}

public struct TrendReport {
    public let metric: TrendVisualizerQualityMetric
    public let trends: [TrendVisualizerQualityTrend]
    public let anomalies: [TrendAnomaly]
    public let prediction: TrendPrediction?
    public let summary: String

    public init(
        metric: TrendVisualizerQualityMetric,
        trends: [TrendVisualizerQualityTrend],
        anomalies: [TrendAnomaly],
        prediction: TrendPrediction?,
        summary: String
    ) {
        self.metric = metric
        self.trends = trends
        self.anomalies = anomalies
        self.prediction = prediction
        self.summary = summary
    }
}

// MARK: - Data Service

public class TrendDataService {
    public init() {}

    public func fetchTrends(
        metric: TrendVisualizerQualityMetric,
        from startDate: Date,
        to endDate: Date
    ) async throws -> [TrendVisualizerQualityTrend] {
        // This would fetch from your data source
        // For now, return mock data
        return generateMockTrends(metric: metric, from: startDate, to: endDate)
    }

    private func generateMockTrends(
        metric: TrendVisualizerQualityMetric,
        from startDate: Date,
        to endDate: Date
    ) -> [TrendVisualizerQualityTrend] {
        var trends: [TrendVisualizerQualityTrend] = []
        var currentDate = startDate

        let baseValue: Double = {
            switch metric {
            case .testCoverage: return 75.0
            case .passRate: return 92.0
            case .flakyTestCount: return 5.0
            case .buildTime: return 120.0
            case .deploymentSuccessRate: return 95.0
            case .meanTimeToRecovery: return 15.0
            case .defectEscapeRate: return 2.0
            case .codeComplexity: return 10.0
            }
        }()

        while currentDate <= endDate {
            let randomVariation = Double.random(in: -5...5)
            let value = max(0, baseValue + randomVariation)

            let trend = TrendVisualizerQualityTrend(
                date: currentDate,
                metric: metric,
                value: value,
                context: nil
            )

            trends.append(trend)
            currentDate = Calendar.current.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
        }

        return trends
    }
}

// MARK: - SwiftUI Views

public struct TrendVisualizerView: View {
    @StateObject private var visualizer = TrendVisualizer()
    @State private var selectedMetric: TrendVisualizerQualityMetric = .testCoverage
    @State private var dateRange: DateRange = .last30Days

    public init() {}

    public var body: some View {
        VStack(spacing: 20) {
            // Controls
            HStack {
                Picker("Metric", selection: $selectedMetric) {
                    ForEach(TrendVisualizerQualityMetric.allCases, id: \.self) { metric in
                        Text(metric.rawValue).tag(metric)
                    }
                }

                Picker("Range", selection: $dateRange) {
                    Text("7 Days").tag(DateRange.last7Days)
                    Text("30 Days").tag(DateRange.last30Days)
                    Text("90 Days").tag(DateRange.last90Days)
                }
            }
            .pickerStyle(SegmentedPickerStyle())

            if visualizer.isLoading {
                ProgressView("Loading trends...")
            } else if let errorMessage = visualizer.errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
            } else if !visualizer.trends.isEmpty {
                // Trend Chart
                TrendChartView(
                    trends: visualizer.trends,
                    prediction: visualizer.prediction
                )

                // Anomalies
                if !visualizer.anomalies.isEmpty {
                    AnomaliesListView(anomalies: visualizer.anomalies)
                }

                // Prediction
                if let prediction = visualizer.prediction {
                    PredictionCard(prediction: prediction)
                }
            } else {
                Text("No trend data available")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .onChange(of: selectedMetric) { _ in
            loadTrends()
        }
        .onChange(of: dateRange) { _ in
            loadTrends()
        }
        .onAppear {
            loadTrends()
        }
    }

    private func loadTrends() {
        let (start, end) = dateRange.dateInterval()
        visualizer.loadTrends(for: selectedMetric, from: start, to: end)
    }
}

private struct TrendChartView: View {
    let trends: [TrendVisualizerQualityTrend]
    let prediction: TrendPrediction?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Trend: \(trends.first?.metric.rawValue ?? "")")
                .font(.headline)

            Chart(trends) { trend in
                LineMark(
                    x: .value("Date", trend.date),
                    y: .value("Value", trend.value)
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(.blue)

                if let prediction = prediction,
                   trend.date == trends.last?.date {
                    // Show prediction line
                    LineMark(
                        x: .value("Date", prediction.date),
                        y: .value("Value", prediction.predictedValue)
                    )
                    .foregroundStyle(.green.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
                }

                // Highlight anomalies
                if trend.isAnomaly(in: trends) {
                    PointMark(
                        x: .value("Date", trend.date),
                        y: .value("Value", trend.value)
                    )
                    .annotation(position: .top) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                    }
                }
            }
            .frame(height: 300)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
}

private struct AnomaliesListView: View {
    let anomalies: [TrendAnomaly]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Detected Anomalies")
                .font(.headline)

            ForEach(anomalies) { anomaly in
                HStack {
                    Circle()
                        .fill(anomaly.severity.color)
                        .frame(width: 10, height: 10)

                    VStack(alignment: .leading, spacing: 5) {
                        Text(formatDate(anomaly.date))
                            .font(.caption)

                        Text(anomaly.metric.rawValue)
                            .font(.subheadline)

                        Text("Deviation: \(String(format: "%.2f", anomaly.deviation))")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if let cause = anomaly.likelyCause {
                            Text(cause)
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

private struct PredictionCard: View {
    let prediction: TrendPrediction

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text("7-Day Prediction")
                    .font(.headline)

                Text("\(prediction.metric.rawValue)")
                    .font(.subheadline)

                HStack {
                    Image(systemName: prediction.trendDirection.icon)
                        .foregroundColor(prediction.trendDirection.color)

                    Text("\(String(format: "%.2f", prediction.predictedValue))")
                        .font(.title)
                        .bold()
                }

                Text("Confidence: \(String(format: "%.0f", prediction.confidence * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Gauge(value: prediction.confidence, in: 0...1) {
                Text("Confidence")
            }
            .gaugeStyle(.accessoryCircular)
            .frame(width: 100, height: 100)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
}

private enum DateRange {
    case last7Days
    case last30Days
    case last90Days

    func dateInterval() -> (Date, Date) {
        let endDate = Date()
        let startDate: Date = {
            switch self {
            case .last7Days:
                return Calendar.current.date(byAdding: .day, value: -7, to: endDate) ?? endDate
            case .last30Days:
                return Calendar.current.date(byAdding: .day, value: -30, to: endDate) ?? endDate
            case .last90Days:
                return Calendar.current.date(byAdding: .day, value: -90, to: endDate) ?? endDate
            }
        }()
        return (startDate, endDate)
    }
}

// MARK: - TrendVisualizerQualityTrend Extension

private extension TrendVisualizerQualityTrend {
    func isAnomaly(in trends: [TrendVisualizerQualityTrend]) -> Bool {
        let visualizer = TrendVisualizer()
        let anomalies = visualizer.detectAnomalies(in: trends)
        return anomalies.contains { $0.date == self.date && $0.metric == self.metric }
    }
}

// MARK: - Math Functions

private func sqrt(_ x: Double) -> Double {
    return Foundation.sqrt(x)
}

private func pow(_ base: Double, _ exp: Double) -> Double {
    return Foundation.pow(base, exp)
}
