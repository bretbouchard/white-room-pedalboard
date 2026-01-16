//
//  TransportControlsView.swift
//  White Room iOS
//
//  Transport controls UI for White Room audio playback
//  Provides play/pause/stop, position seeking, tempo adjustment, and loop controls
//

import SwiftUI

// =============================================================================
// MARK: - Transport Manager
// =============================================================================

/**
 Manages transport state for White Room playback

 - Note: Singleton instance for global transport control
 */
public class TransportManager: ObservableObject {

    // MARK: - Singleton

    public static let shared = TransportManager()

    // MARK: - Published Properties

    @Published public var isPlaying: Bool = false
    @Published public var isStopped: Bool = true
    @Published public var isPaused: Bool = false
    @Published public var position: Double = 0.0
    @Published public var tempo: Double = 120.0
    @Published public var timeSignature: TimeSignature = .fourFour
    @Published public var loopEnabled: Bool = false
    @Published public var loopStart: Double = 0.0
    @Published public var loopEnd: Double = 32.0

    // MARK: - Private Properties

    private var positionUpdateTimer: Timer?
    private let engineQueue = DispatchQueue(label: "com.whiteroom.transport", qos: .userInitiated)

    // MARK: - Initialization

    private init() {
        startPositionUpdates()
    }

    // MARK: - Playback Controls

    /** Start playback */
    public func play() {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport play
            // sch_transport_play(engine)

            DispatchQueue.main.async {
                self.isPlaying = true
                self.isStopped = false
                self.isPaused = false
                NSLog("[TransportManager] Play")
            }
        }
    }

    /** Pause playback */
    public func pause() {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport pause
            // sch_transport_pause(engine)

            DispatchQueue.main.async {
                self.isPlaying = false
                self.isStopped = false
                self.isPaused = true
                NSLog("[TransportManager] Pause")
            }
        }
    }

    /** Stop playback and reset position */
    public func stop() {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport stop
            // sch_transport_stop(engine)

            DispatchQueue.main.async {
                self.isPlaying = false
                self.isStopped = true
                self.isPaused = false
                self.position = 0.0
                NSLog("[TransportManager] Stop")
            }
        }
    }

    /** Toggle play/pause */
    @discardableResult
    public func togglePlay() -> Bool {
        if isPlaying {
            pause()
            return false
        } else {
            play()
            return true
        }
    }

    // MARK: - Position Controls

    /** Set playback position */
    public func setPosition(_ position: Double) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            let clampedPosition = max(0.0, position)

            // TODO: Call FFI transport set position
            // sch_transport_set_position(engine, clampedPosition)

            DispatchQueue.main.async {
                self.position = clampedPosition
                NSLog("[TransportManager] Set position: \(clampedPosition)")
            }
        }
    }

    /** Move position by delta */
    public func moveBy(_ delta: Double) {
        let newPosition = max(0.0, position + delta)
        setPosition(newPosition)
    }

    // MARK: - Tempo Controls

    /** Set tempo */
    public func setTempo(_ tempo: Double) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            let clampedTempo = max(1.0, min(999.0, tempo))

            // TODO: Call FFI transport set tempo
            // sch_transport_set_tempo(engine, clampedTempo)

            DispatchQueue.main.async {
                self.tempo = clampedTempo
                NSLog("[TransportManager] Set tempo: \(clampedTempo) BPM")
            }
        }
    }

    /** Adjust tempo by delta */
    public func adjustTempo(_ delta: Double) {
        let newTempo = max(1.0, min(999.0, tempo + delta))
        setTempo(newTempo)
    }

    // MARK: - Loop Controls

    /** Set loop enabled */
    public func setLoopEnabled(_ enabled: Bool) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport set loop enabled
            // sch_transport_set_loop_enabled(engine, enabled)

            DispatchQueue.main.async {
                self.loopEnabled = enabled
                NSLog("[TransportManager] Loop \(enabled ? "enabled" : "disabled")")
            }
        }
    }

    /** Set loop range */
    public func setLoopRange(start: Double, end: Double) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport set loop range
            // sch_transport_set_loop_range(engine, start, end)

            DispatchQueue.main.async {
                self.loopStart = start
                self.loopEnd = end
                NSLog("[TransportManager] Loop range: \(start) - \(end)")
            }
        }
    }

    /** Toggle loop */
    @discardableResult
    public func toggleLoop() -> Bool {
        setLoopEnabled(!loopEnabled)
        return loopEnabled
    }

    // MARK: - Time Signature

    /** Set time signature */
    public func setTimeSignature(_ timeSignature: TimeSignature) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            // TODO: Call FFI transport set time signature
            // sch_transport_set_time_signature(engine, timeSignature.numerator, timeSignature.denominator)

            DispatchQueue.main.async {
                self.timeSignature = timeSignature
                NSLog("[TransportManager] Time signature: \(timeSignature.numerator)/\(timeSignature.denominator)")
            }
        }
    }

    // MARK: - Private Methods

    private func startPositionUpdates() {
        positionUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            self?.updatePositionFromEngine()
        }
    }

    private func updatePositionFromEngine() {
        // TODO: Poll position from audio engine via FFI
        // sch_transport_get_state(engine, &state)
        // Dispatch position updates to main thread
    }
}

// =============================================================================
// MARK: - Time Signature
// =============================================================================

/** Time signature representation */
public struct TimeSignature: Equatable, Hashable {
    public let numerator: Int
    public let denominator: Int

    public static let fourFour = TimeSignature(numerator: 4, denominator: 4)
    public static let threeFour = TimeSignature(numerator: 3, denominator: 4)
    public static let sixEight = TimeSignature(numerator: 6, denominator: 8)

    public init(numerator: Int, denominator: Int) {
        self.numerator = numerator
        self.denominator = denominator
    }
}

// =============================================================================
// MARK: - Transport Controls View
// ============================================================================

/**
 Transport controls UI component

 Provides professional DAW-style transport controls with:
 - Play/Pause/Stop buttons
 - Forward/Rewind navigation
 - Loop toggle
 - Position display and slider
 - Tempo control with increment/decrement
 - Time signature picker
 */
struct TransportControlsView: View {

    // MARK: - Properties

    @StateObject private var transport = TransportManager.shared
    @State private var isEditingTempo = false
    @State private var isEditingPosition = false

    // MARK: - Body

    var body: some View {
        VStack(spacing: 20) {
            // Playback controls
            playbackControlsSection

            // Position display
            positionSection

            // Tempo control
            tempoSection

            // Time signature
            timeSignatureSection
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 4)
    }

    // MARK: - View Components

    private var playbackControlsSection: some View {
        HStack(spacing: 30) {
            // Stop button
            Button(action: { transport.stop() }) {
                Image(systemName: "stop.fill")
                    .font(.title)
                    .foregroundColor(transport.isStopped ? .red : .primary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Stop")

            // Rewind button
            Button(action: { transport.moveBy(-4) }) {
                Image(systemName: "backward.fill")
                    .font(.title)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Rewind")

            // Play/Pause button
            Button(action: { transport.togglePlay() }) {
                Image(systemName: transport.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.accentColor)
                    .frame(width: 60, height: 60)
            }
            .accessibilityLabel(transport.isPlaying ? "Pause" : "Play")

            // Forward button
            Button(action: { transport.moveBy(4) }) {
                Image(systemName: "forward.fill")
                    .font(.title)
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Forward")

            // Loop button
            Button(action: { transport.toggleLoop() }) {
                Image(systemName: "repeat")
                    .font(.title)
                    .foregroundColor(transport.loopEnabled ? .accentColor : .primary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Loop")
        }
        .padding()
    }

    private var positionSection: some View {
        VStack(spacing: 8) {
            Text("Position")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Text("\(transport.position, specifier: "%.2f")")
                    .font(.title2)
                    .monospacedDigit()
                    .frame(width: 80)

                Text("beats")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Position slider
            TransportPositionSlider(transport: transport)
        }
    }

    private var tempoSection: some View {
        VStack(spacing: 8) {
            Text("Tempo")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 16) {
                // Decrease tempo
                Button(action: { transport.adjustTempo(-1) }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.accentColor)
                }
                .accessibilityLabel("Decrease tempo")

                // Tempo display
                Text("\(transport.tempo, specifier: "%.1f")")
                    .font(.title2)
                    .monospacedDigit()
                    .frame(width: 80)

                // Increase tempo
                Button(action: { transport.adjustTempo(1) }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.accentColor)
                }
                .accessibilityLabel("Increase tempo")
            }

            Text("BPM")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    private var timeSignatureSection: some View {
        HStack {
            Text("Time Signature")
                .font(.caption)
                .foregroundColor(.secondary)

            Picker("", selection: $transport.timeSignature) {
                Text("4/4").tag(TimeSignature.fourFour)
                Text("3/4").tag(TimeSignature.threeFour)
                Text("6/8").tag(TimeSignature.sixEight)
            }
            .pickerStyle(.segmented)
        }
    }
}

// =============================================================================
// MARK: - Position Slider
// =============================================================================

/**
 Position slider component for transport seeking
 */
struct TransportPositionSlider: View {

    @ObservedObject var transport: TransportManager

    var body: some View {
        VStack {
            Slider(
                value: Binding(
                    get: { transport.position },
                    set: { transport.setPosition($0) }
                ),
                in: 0...Double(transport.loopEnd),
                step: 0.01
            )
            .accentColor(.accentColor)
        }
    }
}

// =============================================================================
// MARK: - Keyboard Shortcuts
// ============================================================================

public extension View {

    /**
     Add transport keyboard shortcuts to view

     - Space: Play/Pause
     - Escape: Stop
     - L: Toggle loop
     */
    func transportShortcuts() -> some View {
        self
            .onKeyPress(.space) {
                TransportManager.shared.togglePlay()
                return .handled
            }
            .onKeyPress(.escape) {
                TransportManager.shared.stop()
                return .handled
            }
            .onKeyPress(Character("l")) {
                TransportManager.shared.toggleLoop()
                return .handled
            }
    }
}

// =============================================================================
// MARK: - Preview
// ============================================================================

#if DEBUG
struct TransportControlsView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 40) {
            TransportControlsView()
                .padding()

            Text("Keyboard Shortcuts:")
                .font(.headline)
            Text("Space: Play/Pause\nEscape: Stop\nL: Toggle Loop")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .transportShortcuts()
    }
}
#endif
