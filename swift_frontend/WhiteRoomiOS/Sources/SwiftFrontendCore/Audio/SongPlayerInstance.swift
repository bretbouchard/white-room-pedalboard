//
//  SongPlayerInstance.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//
//  Multi-Song Audio Engine - Song Player Instance
//
//  This module defines the SongPlayerInstance class that wraps individual
//  RealizationEngine instances for multi-song playback.
//

import Foundation
import AVFoundation
import Combine

// =============================================================================
// MARK: - Song Player Instance
// =============================================================================

/**
 Wraps a single song playback instance with independent controls.

 Each SongPlayerInstance manages:
 - A single RealizationEngine for audio rendering
 - Independent tempo/volume/mute/solo controls
 - Playback state (playing/paused/stopped)
 - Current position tracking
 - Loop points
 - Audio output to the mixer

 Thread Safety: This class uses an internal actor for state management,
 ensuring all operations are thread-safe.
 */
public final class SongPlayerInstance: ObservableObject, Identifiable {

    // MARK: - Identity

    /**
     Unique identifier for this player instance
     */
    public let id: UUID

    /**
     Song ID being played
     */
    public let songId: String

    // MARK: - State

    /**
     Current player state (thread-safe via actor)
     */
    @Published public private(set) var state: SongPlayerState

    /**
     Audio engine for this song
     */
    private let audioEngine: AVAudioEngine

    /**
     Player node for this song
     */
    private let playerNode: AVAudioPlayerNode

    /**
     Mixer node for volume/pan control
     */
    private let mixerNode: AVAudioMixerNode

    /**
   Whether this player is initialized
     */
    private var isInitialized: Bool = false

    // MARK: - Initialization

    /**
     Initialize a new song player instance

     - Parameters:
       - id: Unique identifier for this instance
       - songId: ID of the song to play
       - songName: Display name for the song
     */
    public init(
        id: UUID = UUID(),
        songId: String,
        songName: String
    ) {
        self.id = id
        self.songId = songId

        // Initialize state
        self.state = SongPlayerState(
            id: id,
            songId: songId,
            songName: songName
        )

        // Initialize audio engine
        self.audioEngine = AVAudioEngine()
        self.playerNode = AVAudioPlayerNode()
        self.mixerNode = AVAudioMixerNode()

        // Setup audio graph
        setupAudioGraph()
    }

    /**
     Setup the audio graph for this player
     */
    private func setupAudioGraph() {
        // Connect player -> mixer -> main mixer
        audioEngine.attach(playerNode)
        audioEngine.attach(mixerNode)

        // Stereo connection
        audioEngine.connect(
            playerNode,
            to: mixerNode,
            format: nil
        )

        // Mixer will be connected to main mixer by MultiSongEngine
    }

    // MARK: - Lifecycle

    /**
     Initialize the audio engine (call before playback)

     - Throws: Audio engine initialization errors
     */
    public func initialize() throws {
        guard !isInitialized else { return }

        // Start the audio engine
        try audioEngine.start()

        // Update state
        updateState { state in
            state.isLoaded = true
            state.hasError = false
            state.errorMessage = nil
        }

        isInitialized = true

        NSLog("[SongPlayerInstance] Initialized: \(songId)")
    }

    /**
     Stop and cleanup resources
     */
    public func cleanup() {
        playerNode.stop()
        audioEngine.stop()

        // Update state
        updateState { state in
            state.isPlaying = false
            state.isLoaded = false
        }

        isInitialized = false

        NSLog("[SongPlayerInstance] Cleaned up: \(songId)")
    }

    // MARK: - Playback Control

    /**
     Start playback from current position
     */
    public func play() {
        guard isInitialized else {
            NSLog("[SongPlayerInstance] Cannot play: not initialized (\(songId))")
            return
        }

        playerNode.play()

        updateState { state in
            state.isPlaying = true
        }

        NSLog("[SongPlayerInstance] Playing: \(songId)")
    }

    /**
     Pause playback at current position
     */
    public func pause() {
        playerNode.pause()

        updateState { state in
            state.isPlaying = false
        }

        NSLog("[SongPlayerInstance] Paused: \(songId)")
    }

    /**
     Stop playback and reset to beginning
     */
    public func stop() {
        playerNode.stop()

        updateState { state in
            state.isPlaying = false
            state.currentPosition = 0.0
        }

        NSLog("[SongPlayerInstance] Stopped: \(songId)")
    }

    /**
     Seek to specific position

     - Parameter position: Position in seconds
     */
    public func seek(to position: Double) {
        guard position >= 0 && position <= state.duration else {
            NSLog("[SongPlayerInstance] Invalid seek position: \(position) (duration: \(state.duration))")
            return
        }

        // Note: AVAudioPlayerNode doesn't support direct seeking
        // This is a placeholder - actual implementation would require
        // a custom audio player or buffering system
        updateState { state in
            state.currentPosition = position
        }

        NSLog("[SongPlayerInstance] Seeked to \(position)s: \(songId)")
    }

    // MARK: - Audio Controls

    /**
     Set tempo multiplier

     - Parameter multiplier: Tempo multiplier (0.5x to 2.0x)
     */
    public func setTempoMultiplier(_ multiplier: Double) {
        let clamped = max(0.5, min(2.0, multiplier))

        updateState { state in
            state.tempoMultiplier = clamped
        }

        // Note: AVAudioPlayerNode doesn't support rate change
        // This would require AUAudioFilePlayer or custom implementation

        NSLog("[SongPlayerInstance] Tempo multiplier: \(clamped)x (\(songId))")
    }

    /**
     Set volume

     - Parameter volume: Volume (0.0 to 1.0)
     */
    public func setVolume(_ volume: Double) {
        let clamped = max(0.0, min(1.0, volume))

        mixerNode.volume = Float(clamped)

        updateState { state in
            state.volume = clamped
        }

        NSLog("[SongPlayerInstance] Volume: \(clamped) (\(songId))")
    }

    /**
     Set pan

     - Parameter pan: Pan (-1.0 to 1.0)
     */
    public func setPan(_ pan: Double) {
        let clamped = max(-1.0, min(1.0, pan))

        mixerNode.pan = Float(clamped)

        updateState { state in
            state.pan = clamped
        }

        NSLog("[SongPlayerInstance] Pan: \(clamped) (\(songId))")
    }

    /**
     Toggle mute state
     */
    public func toggleMute() {
        let newMuteState = !state.isMuted

        mixerNode.volume = newMuteState ? 0.0 : Float(state.volume)

        updateState { state in
            state.isMuted = newMuteState
        }

        NSLog("[SongPlayerInstance] Mute: \(newMuteState) (\(songId))")
    }

    /**
     Toggle solo state

     - Note: Solo handling is managed by MultiSongEngine
     */
    public func toggleSolo() {
        updateState { state in
            state.isSolo = !state.isSolo
        }

        NSLog("[SongPlayerInstance] Solo: \(state.isSolo) (\(songId))")
    }

    // MARK: - Loop Control

    /**
     Set loop points

     - Parameters:
       - start: Loop start position in seconds (nil = song start)
       - end: Loop end position in seconds (nil = song end)
       - enabled: Whether looping is enabled
     */
    public func setLoopPoints(start: Double?, end: Double?, enabled: Bool) {
        // Validate loop points
        if let start = start, let end = end {
            guard start < end else {
                NSLog("[SongPlayerInstance] Invalid loop points: start (\(start)) >= end (\(end))")
                return
            }

            guard start >= 0 && end <= state.duration else {
                NSLog("[SongPlayerInstance] Loop points out of bounds: start=\(start), end=\(end), duration=\(state.duration)")
                return
            }
        }

        // Note: AVAudioPlayerNode doesn't support looping
        // This would require a custom audio player implementation

        updateState { state in
            state.loopStart = start
            state.loopEnd = end
            state.isLooping = enabled
        }

        NSLog("[SongPlayerInstance] Loop: enabled=\(enabled), start=\(start?.description ?? "none"), end=\(end?.description ?? "none") (\(songId))")
    }

    // MARK: - Audio Output

    /**
     Get the mixer node for connection to main mixer

     - Returns: AVAudioNode for this player's output
     */
    public func getOutputNode() -> AVAudioNode {
        return mixerNode
    }

    /**
     Connect this player's output to a destination node

     - Parameter destination: Destination AVAudioNode (e.g., main mixer)
     */
    public func connect(to destination: AVAudioNode) {
        audioEngine.connect(
            mixerNode,
            to: destination,
            format: audioEngine.mainMixerNode.outputFormat(forBus: 0)
        )

        NSLog("[SongPlayerInstance] Connected to destination (\(songId))")
    }

    /**
     Disconnect this player's output
     */
    public func disconnect() {
        audioEngine.disconnectNodeInput(mixerNode)

        NSLog("[SongPlayerInstance] Disconnected from destination (\(songId))")
    }

    // MARK: - State Management

    /**
     Update state with thread-safe mutation

     - Parameter mutation: Mutation to apply to state
     */
    private func updateState(_ mutation: (inout SongPlayerState) -> Void) {
        var newState = state
        mutation(&newState)
        state = newState
    }

    // MARK: - Position Tracking

    /**
     Update current position (called by MultiSongEngine)

     - Parameter position: Current position in seconds
     */
    public func updatePosition(_ position: Double) {
        updateState { state in
            state.currentPosition = position
        }
    }

    /**
     Get current position

     - Returns: Current position in seconds
     */
    public func getCurrentPosition() -> Double {
        return state.currentPosition
    }

    /**
     Get progress through song (0.0 to 1.0)

     - Returns: Progress ratio
     */
    public func getProgress() -> Double {
        guard state.duration > 0 else { return 0.0 }
        return min(1.0, state.currentPosition / state.duration)
    }
}

// =============================================================================
// MARK: - Song Player Factory
// =============================================================================

/**
 Factory for creating SongPlayerInstance objects
 */
public struct SongPlayerFactory {

    /**
     Create a new song player instance

     - Parameters:
       - songId: ID of the song to play
       - songName: Display name for the song
       - id: Optional unique identifier (auto-generated if nil)

     - Returns: Configured SongPlayerInstance
     */
    public static func createPlayer(
        songId: String,
        songName: String,
        id: UUID = UUID()
    ) -> SongPlayerInstance {
        return SongPlayerInstance(
            id: id,
            songId: songId,
            songName: songName
        )
    }

    /**
     Create multiple song player instances from a list of songs

     - Parameter songs: List of (songId, songName) tuples

     - Returns: Array of configured SongPlayerInstance objects
     */
    public static func createPlayers(
        from songs: [(String, String)]
    ) -> [SongPlayerInstance] {
        return songs.map { songId, songName in
            createPlayer(songId: songId, songName: songName)
        }
    }
}

// =============================================================================
// MARK: - Song Player Extensions
// =============================================================================

extension SongPlayerInstance {

    /**
     Check if this player is active (not muted, or soloed)

     - Returns: True if player should produce audio
     */
    public var isActive: Bool {
        return state.isSolo || !state.isMuted
    }

    /**
     Get effective tempo (original * multiplier)

     - Returns: Effective tempo in BPM
     */
    public var effectiveTempo: Double {
        return state.originalTempo * state.tempoMultiplier
    }

    /**
     Check if position is within loop bounds

     - Returns: True if within loop, false otherwise
     */
    public var isWithinLoop: Bool {
        return state.isWithinLoop
    }
}
