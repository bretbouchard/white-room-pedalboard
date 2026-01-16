/**
 * PerformanceSwitcherViewModel - Swift UI integration for performance switching
 *
 * This ViewModel bridges the UI layer with the performance switching system.
 * It provides ObservableObject properties for SwiftUI reactive updates.
 *
 * Features:
 * - Reactive performance state updates
 * - Switch scheduling with countdown
 * - Error handling and user feedback
 * - Integration with JUCE audio engine via FFI
 *
 * Usage:
 * ```swift
 * PerformanceStrip(switcher: switcher)
 *   .onChange(of: switcher.activePerformance) { newPerformance in
 *     // UI updates automatically
 *   }
 * ```
 */

import SwiftUI
import Combine
import Foundation

// ============================================================================
// Types
// ============================================================================

/**
 * Switch timing options
 */
enum SwitchTiming: String, CaseIterable {
    case immediate = "immediate"
    case nextBar = "nextBar"
    case specificBeat = "specificBeat"

    var displayName: String {
        switch self {
        case .immediate: return "Immediate"
        case .nextBar: return "Next Bar"
        case .specificBeat: return "Specific Beat"
        }
    }
}

/**
 * Performance state for UI
 */
struct PerformanceUIModel: Identifiable, Equatable {
    let id: String
    let name: String
    let description: String?
    let isActive: Bool
    let arrangementStyle: String
    let density: Double
    let instrumentCount: Int

    // Equatable conformance
    static func == (lhs: PerformanceUIModel, rhs: PerformanceUIModel) -> Bool {
        return lhs.id == rhs.id &&
               lhs.isActive == rhs.isActive &&
               lhs.name == rhs.name
    }
}

/**
 * Pending switch state for UI
 */
struct PendingSwitchUIModel {
    let performanceId: String
    let performanceName: String
    let targetBar: Int
    let secondsUntilSwitch: Double
    let samplesUntilSwitch: Int
    let scheduledAt: Date
}

/**
 * Switch error types
 */
enum SwitchError: LocalizedError {
    case performanceNotFound(String)
    case alreadyActive(String)
    case invalidTiming(String)
    case schedulingFailed(String)

    var errorDescription: String? {
        switch self {
        case .performanceNotFound(let id):
            return "Performance not found: \(id)"
        case .alreadyActive(let name):
            return "Performance '\(name)' is already active"
        case .invalidTiming(let reason):
            return "Invalid timing: \(reason)"
        case .schedulingFailed(let reason):
            return "Failed to schedule switch: \(reason)"
        }
    }
}

/**
 * Switch result
 */
struct SwitchResult {
    let success: Bool
    let scheduled: Bool
    let error: SwitchError?
}

// ============================================================================
// PerformanceSwitcherViewModel
// ============================================================================

@MainActor
class PerformanceSwitcherViewModel: ObservableObject {
    // MARK: - Published Properties

    /// Current active performance
    @Published var activePerformance: PerformanceUIModel?

    /// All available performances
    @Published var performances: [PerformanceUIModel] = []

    /// Pending switch (if any)
    @Published var pendingSwitch: PendingSwitchUIModel?

    /// Loading state
    @Published var isLoading: Bool = false

    /// Error message (if any)
    @Published var errorMessage: String?

    /// Current playback position (samples)
    @Published var currentPosition: Int = 0

    /// Current tempo (BPM)
    @Published var currentTempo: Double = 120.0

    /// Current time signature
    @Published var currentTimeSignature: (numerator: Int, denominator: Int) = (4, 4)

    /// Sample rate
    @Published var sampleRate: Double = 44100.0

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()
    private var updateTimer: Timer?

    // MARK: - Initialization

    init() {
        // Load performances from song model
        loadPerformances()

        // Start position update timer
        startPositionUpdates()
    }

    deinit {
        Task { @MainActor in
            stopPositionUpdates()
        }
    }

    // MARK: - Public Methods

    /**
     * Switch to a performance at specified timing
     *
     * - Parameters:
     *   - performanceId: Target performance ID
     *   - timing: When to switch ('immediate', 'nextBar', 'specificBeat')
     */
    func switchToPerformance(_ performanceId: String, timing: SwitchTiming) {
        Task {
            isLoading = true
            errorMessage = nil

            do {
                let result: SwitchResult

                switch timing {
                case .immediate:
                    result = try await executeImmediateSwitch(performanceId)

                case .nextBar:
                    result = try await scheduleNextBarSwitch(performanceId)

                case .specificBeat:
                    // For simplicity, default to next bar for now
                    result = try await scheduleNextBarSwitch(performanceId)
                }

                if result.success {
                    // Update UI state
                    updateActivePerformance(performanceId)

                    if result.scheduled {
                        // Update pending switch info
                        updatePendingSwitch(performanceId)
                    }
                } else if let error = result.error {
                    errorMessage = error.errorDescription
                }

                isLoading = false

            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    /**
     * Cancel pending switch
     */
    func cancelPendingSwitch() {
        Task {
            // Call FFI to cancel switch
            // await juceFFI.cancelPerformanceSwitch()

            // Clear pending state
            pendingSwitch = nil
        }
    }

    /**
     * Refresh performance list from song model
     */
    func refreshPerformances() {
        loadPerformances()
    }

    // MARK: - Private Methods

    private func loadPerformances() {
        // In a real implementation, this would load from SongModel via FFI
        // For now, create mock performances

        let piano = PerformanceUIModel(
            id: "piano-1",
            name: "Solo Piano",
            description: "Sparse, intimate piano performance",
            isActive: true,
            arrangementStyle: "SOLO_PIANO",
            density: 0.3,
            instrumentCount: 1
        )

        let satb = PerformanceUIModel(
            id: "satb-1",
            name: "SATB Choir",
            description: "Traditional 4-voice choir",
            isActive: false,
            arrangementStyle: "SATB",
            density: 0.5,
            instrumentCount: 4
        )

        let techno = PerformanceUIModel(
            id: "techno-1",
            name: "Ambient Techno",
            description: "Dense, layered synth performance",
            isActive: false,
            arrangementStyle: "AMBIENT_TECHNO",
            density: 0.8,
            instrumentCount: 8
        )

        performances = [piano, satb, techno]
        activePerformance = piano
    }

    private func updateActivePerformance(_ performanceId: String) {
        // Update active performance
        performances = performances.map { perf in
            PerformanceUIModel(
                id: perf.id,
                name: perf.name,
                description: perf.description,
                isActive: perf.id == performanceId,
                arrangementStyle: perf.arrangementStyle,
                density: perf.density,
                instrumentCount: perf.instrumentCount
            )
        }

        // Update active performance reference
        if let active = performances.first(where: { $0.id == performanceId }) {
            activePerformance = active
        }
    }

    private func updatePendingSwitch(_ performanceId: String) {
        guard let targetPerformance = performances.first(where: { $0.id == performanceId }) else {
            return
        }

        // Calculate time until next bar
        let timeUntil = calculateTimeUntilNextBar()

        pendingSwitch = PendingSwitchUIModel(
            performanceId: performanceId,
            performanceName: targetPerformance.name,
            targetBar: timeUntil.bar,
            secondsUntilSwitch: timeUntil.seconds,
            samplesUntilSwitch: timeUntil.samples,
            scheduledAt: Date()
        )
    }

    private func calculateTimeUntilNextBar() -> (samples: Int, seconds: Double, bar: Int) {
        // Calculate samples per bar
        let samplesPerBeat = Int((60.0 * sampleRate) / currentTempo)
        let samplesPerBar = samplesPerBeat * currentTimeSignature.numerator

        // Calculate current bar
        let currentBar = currentPosition / samplesPerBar
        let nextBarPosition = (currentBar + 1) * samplesPerBar

        let samplesUntil = nextBarPosition - currentPosition
        let secondsUntil = Double(samplesUntil) / sampleRate

        return (samplesUntil, secondsUntil, currentBar + 1)
    }

    private func executeImmediateSwitch(_ performanceId: String) async throws -> SwitchResult {
        // Validate performance exists
        guard performances.contains(where: { $0.id == performanceId }) else {
            throw SwitchError.performanceNotFound(performanceId)
        }

        // Check if already active
        if activePerformance?.id == performanceId {
            throw SwitchError.alreadyActive(activePerformance?.name ?? "")
        }

        // In production, this would call JUCE FFI
        // await juceFFI.switchPerformanceImmediate(performanceId)

        return SwitchResult(success: true, scheduled: false, error: nil)
    }

    private func scheduleNextBarSwitch(_ performanceId: String) async throws -> SwitchResult {
        // Validate performance exists
        guard performances.contains(where: { $0.id == performanceId }) else {
            throw SwitchError.performanceNotFound(performanceId)
        }

        // Check if already active
        if activePerformance?.id == performanceId {
            throw SwitchError.alreadyActive(activePerformance?.name ?? "")
        }

        // In production, this would call JUCE FFI
        // await juceFFI.switchPerformanceAtNextBar(performanceId)

        return SwitchResult(success: true, scheduled: true, error: nil)
    }

    // MARK: - Position Updates

    private func startPositionUpdates() {
        // Update playback position every 100ms
        updateTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }

                // In production, this would query actual position from JUCE
                // For now, simulate playback
                self.currentPosition += Int(self.sampleRate * 0.1) // 100ms of audio

                // Update pending switch countdown
                if self.pendingSwitch != nil {
                    self.updatePendingSwitchCountdown()
                }
            }
        }
    }

    private func stopPositionUpdates() {
        updateTimer?.invalidate()
        updateTimer = nil
    }

    private func updatePendingSwitchCountdown() {
        guard let pending = pendingSwitch else { return }

        // Recalculate time until next bar
        let timeUntil = calculateTimeUntilNextBar()

        // Update countdown
        pendingSwitch = PendingSwitchUIModel(
            performanceId: pending.performanceId,
            performanceName: pending.performanceName,
            targetBar: timeUntil.bar,
            secondsUntilSwitch: timeUntil.seconds,
            samplesUntilSwitch: timeUntil.samples,
            scheduledAt: pending.scheduledAt
        )
    }
}

// ============================================================================
// SwiftUI Views
// ============================================================================

/**
 * Performance Strip View
 *
 * Displays all available performances and allows switching between them.
 */
// DUPLICATE: struct PerformanceStripView: View {
// DUPLICATE:     @ObservedObject var switcher: PerformanceSwitcherViewModel
// DUPLICATE: 
// DUPLICATE:     var body: some View {
// DUPLICATE:         VStack(alignment: .leading, spacing: 12) {
// DUPLICATE:             Text("Performances")
// DUPLICATE:                 .font(.headline)
// DUPLICATE:                 .foregroundColor(.secondary)
// DUPLICATE: 
// DUPLICATE:             ScrollView(.horizontal, showsIndicators: false) {
// DUPLICATE:                 HStack(spacing: 12) {
// DUPLICATE:                     ForEach(switcher.performances) { performance in
// DUPLICATE:                         PerformanceButton(
// DUPLICATE:                             performance: performance,
// DUPLICATE:                             isActive: performance.isActive,
// DUPLICATE:                             pendingSwitch: switcher.pendingSwitch,
// DUPLICATE:                             onTap: {
// DUPLICATE:                                 switcher.switchToPerformance(performance.id, timing: .nextBar)
// DUPLICATE:                             }
// DUPLICATE:                         )
// DUPLICATE:                     }
// DUPLICATE:                 }
// DUPLICATE:                 .padding(.horizontal, 4)
// DUPLICATE:             }
// DUPLICATE: 
// DUPLICATE:             // Pending switch indicator
// DUPLICATE:             if let pending = switcher.pendingSwitch {
// DUPLICATE:                 PendingSwitchIndicator(pendingSwitch: pending)
// DUPLICATE:                     .transition(.opacity)
// DUPLICATE:             }
// DUPLICATE:         }
// DUPLICATE:         .padding()
// DUPLICATE:     }
// DUPLICATE: }

/**
 * Individual performance button
 */
struct PerformanceButton: View {
    let performance: PerformanceUIModel
    let isActive: Bool
    let pendingSwitch: PendingSwitchUIModel?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(performance.name)
                        .font(.subheadline)
                        .fontWeight(isActive ? .bold : .regular)
                        .foregroundColor(isActive ? .white : .primary)

                    Spacer()

                    if isActive {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.white)
                    }
                }

                // Density indicator
                HStack(spacing: 4) {
                    ForEach(0..<5) { index in
                        Circle()
                            .fill(index < Int(performance.density * 5) ? Color.white.opacity(0.8) : Color.white.opacity(0.3))
                            .frame(width: 6, height: 6)
                    }
                }

                // Instrument count
                Text("\(performance.instrumentCount) instruments")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(12)
            .frame(width: 140, height: 80)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isActive ? Color.blue : Color.gray.opacity(0.2))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isActive ? Color.blue : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(isActive || (pendingSwitch != nil))
    }
}

/**
 * Pending switch countdown indicator
 */
struct PendingSwitchIndicator: View {
    let pendingSwitch: PendingSwitchUIModel

    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .scaleEffect(0.8)

            Text("Switching to \(pendingSwitch.performanceName)")
                .font(.subheadline)

            Spacer()

            Text("\(pendingSwitch.secondsUntilSwitch, specifier: "%.1f")s")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.blue.opacity(0.1))
        )
    }
}

// ============================================================================
// Preview
// ============================================================================

struct PerformanceStripView_Previews: PreviewProvider {
    static var previews: some View {
        let switcher = PerformanceSwitcherViewModel()

        return PerformanceStripView(switcher: switcher)
            .frame(height: 150)
            .previewLayout(.sizeThatFits)
    }
}
