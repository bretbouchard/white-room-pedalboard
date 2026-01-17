//
//  MasterTransportController.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//
//  Master coordination controller for multi-song playback with transport,
//  tempo, and volume control across all song instances.

import Foundation
import Combine

/// Master controller for coordinating multiple song instances
public final class MasterTransportController: ObservableObject {

    // MARK: - Published State

    /// Master transport state
    @Published public private(set) var transportState: TransportState = .stopped

    /// Master tempo (BPM) - applies based on sync mode
    @Published public private(set) var masterTempo: Double = 120.0

    /// Master tempo multiplier (0.5 = half speed, 1.0 = normal, 2.0 = double speed)
    @Published public private(set) var tempoMultiplier: Double = 1.0

    /// Master volume (0.0 to 1.0)
    @Published public private(set) var masterVolume: Double = 1.0

    /// Current sync mode
    @Published public private(set) var syncMode: SyncMode = .independent

    /// All active song instances
    @Published public private(set) var songInstances: [SongInstance] = []

    // MARK: - Dependencies

    private let syncModeController: SyncModeController
    private let undoManager: UndoManager?

    // MARK: - Thread Safety

    private let queue = DispatchQueue(
        label: "com.whiteroom.audio.master_transport",
        qos: .userInitiated
    )

    // MARK: - Cancellables

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    public init(
        syncModeController: SyncModeController,
        undoManager: UndoManager? = nil
    ) {
        self.syncModeController = syncModeController
        self.undoManager = undoManager

        setupObservers()
    }

    private func setupObservers() {
        // Observe sync mode changes
        syncModeController.$syncMode
            .sink { [weak self] mode in
                self?.syncMode = mode
            }
            .store(in: &cancellables)
    }

    // MARK: - Song Instance Management

    /// Add a new song instance to master control
    public func addSongInstance(_ instance: SongInstance) {
        queue.async { [weak self] in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.songInstances.append(instance)
                NSLog("[MasterTransport] Added song: \(instance.song.name)")
            }

            // Apply current master settings
            self.applyMasterSettings(to: instance)
        }
    }

    /// Remove a song instance from master control
    public func removeSongInstance(withId id: String) {
        queue.async { [weak self] in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.songInstances.removeAll { $0.id == id }
                NSLog("[MasterTransport] Removed song: \(id)")
            }
        }
    }

    /// Get song instance by ID
    public func getSongInstance(withId id: String) -> SongInstance? {
        songInstances.first { $0.id == id }
    }

    // MARK: - Master Transport Control

    /// Start playback of all active songs
    public func play() {
        queue.async { [weak self] in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.transportState = .playing
            }

            // Start all songs
            for instance in self.songInstances where instance.isActive {
                instance.play()
            }

            NSLog("[MasterTransport] Started playback of \(self.songInstances.count) songs")
        }
    }

    /// Pause playback of all active songs
    public func pause() {
        queue.async { [weak self] in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.transportState = .paused
            }

            // Pause all songs
            for instance in self.songInstances where instance.isActive {
                instance.pause()
            }

            NSLog("[MasterTransport] Paused playback")
        }
    }

    /// Stop playback of all active songs and reset positions
    public func stop() {
        queue.async { [weak self] in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.transportState = .stopped
            }

            // Stop all songs
            for instance in self.songInstances where instance.isActive {
                instance.stop()
            }

            NSLog("[MasterTransport] Stopped playback")
        }
    }

    /// Emergency stop - immediately stop all audio
    public func emergencyStop() {
        queue.async { [weak self] in
            guard let self = self else { return }

            // Stop all songs immediately
            for instance in self.songInstances {
                instance.stop()
            }

            DispatchQueue.main.async {
                self.transportState = .stopped
                self.masterVolume = 0.0
            }

            NSLog("[MasterTransport] EMERGENCY STOP activated")
        }
    }

    // MARK: - Master Tempo Control

    /// Set master tempo (applies based on sync mode)
    public func setMasterTempo(_ tempo: Double, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            let oldTempo = self.masterTempo
            let clampedTempo = max(20.0, min(300.0, tempo))

            if undoable, let undoManager = self.undoManager {
                undoManager.registerUndo(
                    withTarget: self,
                    selector: #selector(self.undoSetMasterTempo(_:)),
                    object: oldTempo
                )
                undoManager.setActionName("Set Master Tempo")
            }

            DispatchQueue.main.async {
                self.masterTempo = clampedTempo
            }

            // Apply tempo change based on sync mode
            self.syncModeController.applyMasterTempo(
                clampedTempo,
                multiplier: self.tempoMultiplier,
                to: self.songInstances
            )

            NSLog("[MasterTransport] Master tempo: \(clampedTempo) BPM")
        }
    }

    @objc private func undoSetMasterTempo(_ oldTempo: Double) {
        setMasterTempo(oldTempo, undoable: false)
    }

    /// Set master tempo multiplier
    public func setTempoMultiplier(_ multiplier: Double, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            let oldMultiplier = self.tempoMultiplier
            let clampedMultiplier = max(0.25, min(4.0, multiplier))

            if undoable, let undoManager = self.undoManager {
                undoManager.registerUndo(
                    withTarget: self,
                    selector: #selector(self.undoSetTempoMultiplier(_:)),
                    object: oldMultiplier
                )
                undoManager.setActionName("Set Tempo Multiplier")
            }

            DispatchQueue.main.async {
                self.tempoMultiplier = clampedMultiplier
            }

            // Apply multiplier change based on sync mode
            self.syncModeController.applyMasterTempo(
                self.masterTempo,
                multiplier: clampedMultiplier,
                to: self.songInstances
            )

            NSLog("[MasterTransport] Tempo multiplier: \(clampedMultiplier)x")
        }
    }

    @objc private func undoSetTempoMultiplier(_ oldMultiplier: Double) {
        setTempoMultiplier(oldMultiplier, undoable: false)
    }

    // MARK: - Master Volume Control

    /// Set master volume (0.0 to 1.0)
    public func setMasterVolume(_ volume: Double, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            let oldVolume = self.masterVolume
            let clampedVolume = max(0.0, min(1.0, volume))

            if undoable, let undoManager = self.undoManager {
                undoManager.registerUndo(
                    withTarget: self,
                    selector: #selector(self.undoSetMasterVolume(_:)),
                    object: oldVolume
                )
                undoManager.setActionName("Set Master Volume")
            }

            DispatchQueue.main.async {
                self.masterVolume = clampedVolume
            }

            // Apply volume to all songs
            for instance in self.songInstances where instance.isActive {
                instance.setVolume(clampedVolume)
            }

            NSLog("[MasterTransport] Master volume: \(Int(clampedVolume * 100))%")
        }
    }

    @objc private func undoSetMasterVolume(_ oldVolume: Double) {
        setMasterVolume(oldVolume, undoable: false)
    }

    // MARK: - Sync Mode Control

    /// Set sync mode for tempo coordination
    public func setSyncMode(_ mode: SyncMode, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            let oldMode = self.syncMode

            if undoable, let undoManager = self.undoManager {
                undoManager.registerUndo(
                    withTarget: self,
                    selector: #selector(self.undoSetSyncMode(_:)),
                    object: oldMode
                )
                undoManager.setActionName("Set Sync Mode")
            }

            // Apply new sync mode
            self.syncModeController.setSyncMode(mode)
            self.syncModeController.applyMasterTempo(
                self.masterTempo,
                multiplier: self.tempoMultiplier,
                to: self.songInstances
            )

            NSLog("[MasterTransport] Sync mode: \(mode)")
        }
    }

    @objc private func undoSetSyncMode(_ oldMode: SyncMode) {
        setSyncMode(oldMode, undoable: false)
    }

    // MARK: - Individual Song Control

    /// Play specific song instance
    public func playSong(withId id: String) {
        queue.async { [weak self] in
            guard let self = self,
                  let instance = self.getSongInstance(withId: id) else {
                return
            }

            instance.play()
            NSLog("[MasterTransport] Playing song: \(instance.song.name)")
        }
    }

    /// Pause specific song instance
    public func pauseSong(withId id: String) {
        queue.async { [weak self] in
            guard let self = self,
                  let instance = self.getSongInstance(withId: id) else {
                return
            }

            instance.pause()
            NSLog("[MasterTransport] Paused song: \(instance.song.name)")
        }
    }

    /// Stop specific song instance
    public func stopSong(withId id: String) {
        queue.async { [weak self] in
            guard let self = self,
                  let instance = self.getSongInstance(withId: id) else {
                return
            }

            instance.stop()
            NSLog("[MasterTransport] Stopped song: \(instance.song.name)")
        }
    }

    /// Set volume for specific song instance
    public func setVolume(_ volume: Double, forSongWithId id: String, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self,
                  let instance = self.getSongInstance(withId: id) else {
                return
            }

            let clampedVolume = max(0.0, min(1.0, volume))
            instance.setVolume(clampedVolume)

            NSLog("[MasterTransport] Song \(instance.song.name) volume: \(Int(clampedVolume * 100))%")
        }
    }

    /// Set tempo for specific song instance (only works in independent mode)
    public func setTempo(_ tempo: Double, forSongWithId id: String, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            guard self.syncMode == .independent else {
                NSLog("[MasterTransport] WARNING: Cannot set individual tempo in \(self.syncMode) mode")
                return
            }

            guard let instance = self.getSongInstance(withId: id) else {
                return
            }

            let clampedTempo = max(20.0, min(300.0, tempo))
            instance.setTempo(clampedTempo)

            NSLog("[MasterTransport] Song \(instance.song.name) tempo: \(clampedTempo) BPM")
        }
    }

    // MARK: - Master Settings Application

    /// Apply current master settings to a song instance
    private func applyMasterSettings(to instance: SongInstance) {
        instance.setVolume(masterVolume)

        // Apply tempo based on sync mode
        syncModeController.applyMasterTempo(
            masterTempo,
            multiplier: tempoMultiplier,
            to: [instance]
        )

        // Set transport state if playing
        if transportState == .playing && instance.isActive {
            instance.play()
        }
    }

    // MARK: - State Queries

    /// Get current state as snapshot
    public func getCurrentState() -> MasterTransportState {
        MasterTransportState(
            transportState: transportState,
            masterTempo: masterTempo,
            tempoMultiplier: tempoMultiplier,
            masterVolume: masterVolume,
            syncMode: syncMode,
            songStates: songInstances.map { $0.getCurrentState() }
        )
    }

    /// Restore state from snapshot
    public func restoreState(_ state: MasterTransportState, undoable: Bool = true) {
        queue.async { [weak self] in
            guard let self = self else { return }

            // Store current state for undo
            let currentState = self.getCurrentState()

            if undoable, let undoManager = self.undoManager {
                undoManager.registerUndo(
                    withTarget: self,
                    selector: #selector(self.undoRestoreState(_:)),
                    object: currentState
                )
                undoManager.setActionName("Restore Transport State")
            }

            // Restore master settings
            DispatchQueue.main.async {
                self.transportState = state.transportState
                self.masterTempo = state.masterTempo
                self.tempoMultiplier = state.tempoMultiplier
                self.masterVolume = state.masterVolume
                self.syncMode = state.syncMode
            }

            // Restore sync mode
            self.syncModeController.setSyncMode(state.syncMode)

            // Apply to all song instances
            for instance in self.songInstances {
                if let songState = state.songStates.first(where: { $0.id == instance.id }) {
                    instance.restoreState(songState)
                }
            }

            NSLog("[MasterTransport] State restored")
        }
    }

    @objc private func undoRestoreState(_ oldState: MasterTransportState) {
        restoreState(oldState, undoable: false)
    }
}

// MARK: - Supporting Types

// TransportState is now canonical in SwiftFrontendShared/MusicalModels.swift
// This comment reminds us to use that version instead of duplicating

/// Sync mode for tempo coordination
public enum SyncMode: Equatable, Codable, CaseIterable {
    case independent
    case locked
    case ratio

    var displayName: String {
        switch self {
        case .independent: return "Independent"
        case .locked: return "Locked"
        case .ratio: return "Ratio"
        }
    }

    var description: String {
        switch self {
        case .independent:
            return "Each song maintains its own tempo"
        case .locked:
            return "All songs synced to master tempo"
        case .ratio:
            return "Maintain relative tempo ratios"
        }
    }
}

/// Master transport state snapshot
public struct MasterTransportState: Codable, Sendable {
    public let transportState: TransportState
    public let masterTempo: Double
    public let tempoMultiplier: Double
    public let masterVolume: Double
    public let syncMode: SyncMode
    public let songStates: [SongInstanceState]

    public init(
        transportState: TransportState,
        masterTempo: Double,
        tempoMultiplier: Double,
        masterVolume: Double,
        syncMode: SyncMode,
        songStates: [SongInstanceState]
    ) {
        self.transportState = transportState
        self.masterTempo = masterTempo
        self.tempoMultiplier = tempoMultiplier
        self.masterVolume = masterVolume
        self.syncMode = syncMode
        self.songStates = songStates
    }
}

/// Song instance state snapshot
public struct SongInstanceState: Codable, Sendable {
    public let id: String
    public let songId: String
    public let isActive: Bool
    public let volume: Double
    public let tempo: Double

    public init(
        id: String,
        songId: String,
        isActive: Bool,
        volume: Double,
        tempo: Double
    ) {
        self.id = id
        self.songId = songId
        self.isActive = isActive
        self.volume = volume
        self.tempo = tempo
    }
}

/// Song instance protocol
public protocol SongInstance: AnyObject {
    var id: String { get }
    var song: Song { get }
    var isActive: Bool { get }

    func play()
    func pause()
    func stop()
    func setVolume(_ volume: Double)
    func setTempo(_ tempo: Double)

    func getCurrentState() -> SongInstanceState
    func restoreState(_ state: SongInstanceState)
}
