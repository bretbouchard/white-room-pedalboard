//
//  MultiSongState.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import SwiftUI
import Combine

// =============================================================================
// MARK: - Multi Song State
// =============================================================================

/**
 State for multi-song playback (Moving Sidewalk feature)

 This model manages multiple songs playing simultaneously with independent
 tempo, volume, and transport controls for each song.

 Now an ObservableObject class to support SwiftUI's @StateObject and @ObservedObject.
 */
public final class MultiSongState: ObservableObject, Codable, Sendable {

    /**
     Unique identifier for this multi-song session
     */
    @Published public var id: String

    /**
     All song slots (up to 9 songs for tvOS grid)
     */
    @Published public var songs: [SongSlot]

    /**
     Master transport controls
     */
    @Published public var masterTransport: MasterTransport

    /**
     Session metadata
     */
    @Published public var metadata: SessionMetadata

    /**
     Master tempo (applied based on sync mode)
     */
    @Published public var masterTempo: Double

    /**
     Current sync mode for tempo coordination
     */
    @Published public var syncMode: SyncMode = .independent

    public init(
        id: String,
        songs: [SongSlot],
        masterTransport: MasterTransport,
        metadata: SessionMetadata,
        masterTempo: Double = 120.0,
        syncMode: SyncMode = .independent
    ) {
        self.id = id
        self.songs = songs
        self.masterTransport = masterTransport
        self.metadata = metadata
        self.masterTempo = masterTempo
        self.syncMode = syncMode
    }

    /**
     Create empty session with default slots
     */
    public static func createEmptySession() -> MultiSongState {
        let slots = (0..<9).map { index in
            SongSlot(
                id: UUID().uuidString,
                index: index,
                song: nil,
                transport: TransportState(isPlaying: false, tempo: 120.0, volume: 0.8),
                isActive: false
            )
        }

        return MultiSongState(
            id: UUID().uuidString,
            songs: slots,
            masterTransport: MasterTransport(isPlaying: false, masterVolume: 0.8),
            metadata: SessionMetadata(name: "New Session", createdAt: Date()),
            masterTempo: 120.0,
            syncMode: .independent
        )
    }

    // MARK: - Codable

    enum CodingKeys: String, CodingKey {
        case id
        case songs
        case masterTransport
        case metadata
        case masterTempo
        case syncMode
    }

    public required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        songs = try container.decode([SongSlot].self, forKey: .songs)
        masterTransport = try container.decode(MasterTransport.self, forKey: .masterTransport)
        metadata = try container.decode(SessionMetadata.self, forKey: .metadata)
        masterTempo = try container.decodeIfPresent(Double.self, forKey: .masterTempo) ?? 120.0
        syncMode = try container.decodeIfPresent(SyncMode.self, forKey: .syncMode) ?? .independent
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(songs, forKey: .songs)
        try container.encode(masterTransport, forKey: .masterTransport)
        try container.encode(metadata, forKey: .metadata)
        try container.encode(masterTempo, forKey: .masterTempo)
        try container.encode(syncMode, forKey: .syncMode)
    }
}

// =============================================================================
// MARK: - Song Slot
// =============================================================================

/**
 A single slot in the multi-song grid

 Each slot holds one song and its independent controls.
 */
public struct SongSlot: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier for this slot
     */
    public var id: String

    /**
     Grid index (0-8 for 3x3 grid)
     */
    public var index: Int

    /**
     The song assigned to this slot (nil if empty)
     */
    public var song: Song?

    /**
     Transport state for this song
     */
    public var transport: TransportState

    /**
     Whether this slot is active in the mix
     */
    public var isActive: Bool

    public init(
        id: String,
        index: Int,
        song: Song?,
        transport: TransportState,
        isActive: Bool
    ) {
        self.id = id
        self.index = index
        self.song = song
        self.transport = transport
        self.isActive = isActive
    }
}

// =============================================================================
// MARK: - Transport State
// =============================================================================

/**
 Transport state for a single song
 */
public struct TransportState: Equatable, Codable, Sendable {

    /**
     Whether this song is currently playing
     */
    public var isPlaying: Bool

    /**
     Tempo in BPM (independent from other songs)
     */
    public var tempo: Double

    /**
     Volume (0.0 to 1.0)
     */
    public var volume: Double

    /**
     Current playback position in seconds
     */
    public var currentPosition: Double

    /**
     Whether this song is muted
     */
    public var isMuted: Bool

    /**
     Whether this song is soloed
     */
    public var isSolo: Bool

    public init(
        isPlaying: Bool,
        tempo: Double,
        volume: Double,
        currentPosition: Double = 0.0,
        isMuted: Bool = false,
        isSolo: Bool = false
    ) {
        self.isPlaying = isPlaying
        self.tempo = tempo
        self.volume = volume
        self.currentPosition = currentPosition
        self.isMuted = isMuted
        self.isSolo = isSolo
    }
}

// =============================================================================
// MARK: - Master Transport
// =============================================================================

/**
 Master transport controls for all songs
 */
public struct MasterTransport: Equatable, Codable, Sendable {

    /**
     Whether master is playing (starts all active songs)
     */
    public var isPlaying: Bool

    /**
     Master volume (0.0 to 1.0)
     */
    public var masterVolume: Double

    /**
     Master tempo multiplier (0.5 to 2.0)
     */
    public var tempoMultiplier: Double

    /**
     Playback mode for master start
     */
    public var playbackMode: PlaybackMode

    public init(
        isPlaying: Bool,
        masterVolume: Double,
        tempoMultiplier: Double = 1.0,
        playbackMode: PlaybackMode = .simultaneous
    ) {
        self.isPlaying = isPlaying
        self.masterVolume = masterVolume
        self.tempoMultiplier = tempoMultiplier
        self.playbackMode = playbackMode
    }

    /**
     Playback mode for master transport
     */
    public enum PlaybackMode: String, Equatable, Codable, Sendable, CaseIterable {
        case simultaneous
        case roundRobin
        case random
        case cascade

        public var displayName: String {
            switch self {
            case .simultaneous: return "All Together"
            case .roundRobin: return "Round Robin"
            case .random: return "Random"
            case .cascade: return "Cascade"
            }
        }

        public var iconName: String {
            switch self {
            case .simultaneous: return "square.stack.3d.up"
            case .roundRobin: return "arrow.clockwise"
            case .random: return "shuffle"
            case .cascade: return "waveform.path"
            }
        }
    }
}

// =============================================================================
// MARK: - Session Metadata
// =============================================================================

/**
 Metadata for the multi-song session
 */
public struct SessionMetadata: Equatable, Codable, Sendable {

    /**
     Session name
     */
    public var name: String

    /**
     When this session was created
     */
    public var createdAt: Date

    /**
     When this session was last modified
     */
    public var updatedAt: Date

    /**
     User-defined tags
     */
    public var tags: [String]

    public init(
        name: String,
        createdAt: Date,
        updatedAt: Date = Date(),
        tags: [String] = []
    ) {
        self.name = name
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.tags = tags
    }
}

// =============================================================================
// MARK: - Slot Action
// =============================================================================

/**
 Actions that can be performed on a song slot
 */
public enum SlotAction: Equatable, Sendable {
    case togglePlay
    case setTempo(Double)
    case setVolume(Double)
    case toggleMute
    case toggleSolo
    case seekTo(Double)
    case assignSong(Song)
    case removeSong
    case activate
    case deactivate
}

// =============================================================================
// MARK: - Master Action
// =============================================================================

/**
 Actions that can be performed on master transport
 */
public enum MasterAction: Equatable, Sendable {
    case togglePlay
    case stopAll
    case setMasterVolume(Double)
    case setTempoMultiplier(Double)
    case setPlaybackMode(MasterTransport.PlaybackMode)
}
