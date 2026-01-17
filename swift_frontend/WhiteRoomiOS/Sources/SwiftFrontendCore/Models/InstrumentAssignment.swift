//
//  InstrumentAssignment.swift
//  White Room
//
//  Created by AI Assistant
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import Combine

/// Extension to add UI properties to InstrumentType from PerformanceModels
extension InstrumentType {
    /// Display name for the instrument type
    var displayName: String {
        switch self {
        case .piano: return "Piano"
        case .organ: return "Organ"
        case .guitar: return "Guitar"
        case .bass: return "Bass"
        case .strings: return "Strings"
        case .brass: return "Brass"
        case .winds: return "Winds"
        case .percussion: return "Percussion"
        case .synth: return "Synth"
        case .drums: return "Drums"
        case .vocal: return "Vocal"
        case .other: return "Other"
        }
    }

    /// SF Symbol icon name for the instrument type
    var iconName: String {
        switch self {
        case .piano: return "pianokeys"
        case .organ: return "organ"
        case .guitar: return "guitar"
        case .bass: return "guitars"
        case .strings: return "music.note"
        case .brass: return "trumpet"
        case .winds: return "wind"
        case .percussion: return "drum"
        case .synth: return "slider.horizontal.3"
        case .drums: return "speaker.wave.3"
        case .vocal: return "mic"
        case .other: return "music.quarternote.3"
        }
    }

    /// Default color for the instrument type
    var defaultColor: String {
        switch self {
        case .piano: return "#3B82F6"    // Blue
        case .organ: return "#8B5CF6"    // Purple
        case .guitar: return "#F59E0B"   // Amber
        case .bass: return "#EF4444"     // Red
        case .strings: return "#10B981"  // Green
        case .brass: return "#F97316"    // Orange
        case .winds: return "#06B6D4"    // Cyan
        case .percussion: return "#EC4899" // Pink
        case .synth: return "#6366F1"    // Indigo
        case .drums: return "#64748B"    // Slate
        case .vocal: return "#A855F7"    // Purple
        case .other: return "#78716C"    // Stone
        }
    }
}

/// Validation error types
enum InstrumentValidationError: String, Error {
    case invalidChannel = "invalid_channel"
    case invalidPatch = "invalid_patch"
    case invalidBank = "invalid_bank"
    case channelConflict = "channel_conflict"
    case missingRequiredField = "missing_required_field"
    case invalidPlugin = "invalid_plugin"

    var localizedDescription: String {
        switch self {
        case .invalidChannel: return "MIDI channel must be between 1 and 16"
        case .invalidPatch: return "MIDI patch must be between 0 and 127"
        case .invalidBank: return "Bank value must be between 0 and 127"
        case .channelConflict: return "MIDI channel is already in use"
        case .missingRequiredField: return "Required field is missing"
        case .invalidPlugin: return "Invalid plugin configuration"
        }
    }
}

/// Plugin information for virtual instruments
struct PluginInfo: Codable {
    let id: String
    let name: String
    let manufacturer: String
    var parameters: [String: Double]
}

/// Represents an assigned instrument in a song
struct MIDIInstrumentAssignment: Codable, Identifiable {
    let id: String
    var name: String
    var type: InstrumentType
    var channel: Int // MIDI channel (1-16)
    var patch: Int // MIDI program change (0-127)
    var bankMSB: Int? // Bank select MSB (0-127)
    var bankLSB: Int? // Bank select LSB (0-127)

    // Audio plugin for virtual instruments
    var plugin: PluginInfo?

    // Metadata
    var color: String
    var icon: String
    var createdAt: Date?
    var updatedAt: Date?

    /// Create a new instrument assignment
    init(
        id: String,
        name: String,
        type: InstrumentType,
        channel: Int,
        patch: Int,
        bankMSB: Int? = nil,
        bankLSB: Int? = nil,
        plugin: PluginInfo? = nil,
        color: String? = nil,
        icon: String? = nil
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.channel = channel
        self.patch = patch
        self.bankMSB = bankMSB
        self.bankLSB = bankLSB
        self.plugin = plugin
        self.color = color ?? type.defaultColor
        self.icon = icon ?? type.iconName
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    /// Validate the instrument assignment
    func validate() throws {
        // Check required fields
        if id.isEmpty {
            throw InstrumentValidationError.missingRequiredField
        }

        if name.isEmpty {
            throw InstrumentValidationError.missingRequiredField
        }

        // Validate MIDI channel (1-16)
        if channel < 1 || channel > 16 {
            throw InstrumentValidationError.invalidChannel
        }

        // Validate MIDI program change (0-127)
        if patch < 0 || patch > 127 {
            throw InstrumentValidationError.invalidPatch
        }

        // Validate bank select (0-127)
        if let msb = bankMSB, (msb < 0 || msb > 127) {
            throw InstrumentValidationError.invalidBank
        }

        if let lsb = bankLSB, (lsb < 0 || lsb > 127) {
            throw InstrumentValidationError.invalidBank
        }

        // Validate plugin if provided
        if let plugin = plugin {
            if plugin.id.isEmpty || plugin.name.isEmpty || plugin.manufacturer.isEmpty {
                throw InstrumentValidationError.invalidPlugin
            }
        }
    }

    /// Update timestamp
    mutating func touch() {
        self.updatedAt = Date()
    }
}

/// Manages instrument assignments for a song
class MIDIInstrumentAssignmentManager: Observableable, Codable {
    @Published var assignments: [String: MIDIInstrumentAssignment] = [:]

    /// Create a new manager
    init() {}

    /// Assign instrument to track
    /// - Parameters:
    ///   - trackId: Track identifier
    ///   - instrument: Instrument assignment
    /// - Throws: InstrumentValidationError if validation fails
    func assignInstrument(trackId: String, instrument: MIDIInstrumentAssignment) throws {
        // Validate instrument
        try instrument.validate()

        // Check for channel conflicts
        if let conflict = findChannelConflict(instrument.channel, excludeTrackId: trackId) {
            throw InstrumentValidationError.channelConflict
        }

        // Update timestamps
        var updatedInstrument = instrument
        if let existing = assignments[trackId] {
            updatedInstrument.createdAt = existing.createdAt
        }
        updatedInstrument.touch()

        assignments[trackId] = updatedInstrument
    }

    /// Get instrument for track
    /// - Parameter trackId: Track identifier
    /// - Returns: Instrument assignment or nil
    func getInstrument(trackId: String) -> MIDIInstrumentAssignment? {
        return assignments[trackId]
    }

    /// Remove assignment
    /// - Parameter trackId: Track identifier
    func removeAssignment(trackId: String) {
        assignments.removeValue(forKey: trackId)
    }

    /// Get all assignments
    /// - Returns: Array of all instrument assignments
    func getAllAssignments() -> [MIDIInstrumentAssignment] {
        return Array(assignments.values)
    }

    /// Get all track IDs with assignments
    /// - Returns: Array of track IDs
    func getAssignedTrackIds() -> [String] {
        return Array(assignments.keys)
    }

    /// Clear all assignments
    func clearAll() {
        assignments.removeAll()
    }

    /// Find channel conflict
    /// - Parameters:
    ///   - channel: MIDI channel to check
    ///   - excludeTrackId: Track ID to exclude from check
    /// - Returns: Conflicting track ID or nil
    private func findChannelConflict(channel: Int, excludeTrackId: String) -> String? {
        for (trackId, instrument) in assignments {
            if trackId != excludeTrackId && instrument.channel == channel {
                return trackId
            }
        }
        return nil
    }

    /// Get available MIDI channels
    /// - Returns: Array of available channel numbers
    func getAvailableChannels() -> [Int] {
        let usedChannels = Set(assignments.values.map { $0.channel })
        return (1...16).filter { !usedChannels.contains($0) }
    }

    /// Get instruments by type
    /// - Parameter type: Instrument type
    /// - Returns: Array of instruments of the specified type
    func getInstrumentsByType(_ type: InstrumentType) -> [MIDIInstrumentAssignment] {
        return assignments.values.filter { $0.type == type }
    }

    /// Check if track has assignment
    /// - Parameter trackId: Track identifier
    /// - Returns: True if assigned
    func hasAssignment(trackId: String) -> Bool {
        return assignments[trackId] != nil
    }

    /// Get assignment count
    var count: Int {
        return assignments.count
    }

    // MARK: - Codable

    enum CodingKeys: String, CodingKey {
        case assignments
    }

    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        assignments = try container.decode([String: MIDIInstrumentAssignment].self, forKey: .assignments)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(assignments, forKey: .assignments)
    }
}

/// Helper protocol for ObservableObject
protocol Observableable: ObservableObject {}
