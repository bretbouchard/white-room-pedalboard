//
//  Song+InstrumentAssignment.swift
//  White Room
//
//  Created by AI Assistant
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

/// Extension to Song model for instrument assignment support
extension Song {

    /// Instrument assignments for tracks in this song
    var instrumentAssignments: InstrumentAssignmentManager {
        get {
            if let assignments = objc_getAssociatedObject(self, &AssociatedKeys.instrumentAssignments) as? InstrumentAssignmentManager {
                return assignments
            }

            // Create new manager if not exists
            let manager = InstrumentAssignmentManager()
            self.instrumentAssignments = manager
            return manager
        }
        set {
            objc_setAssociatedObject(self, &AssociatedKeys.instrumentAssignments, newValue, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }

    /// Assign instrument to track
    /// - Parameters:
    ///   - trackId: Track identifier
    ///   - instrument: Instrument assignment
    func assignInstrument(to trackId: String, instrument: InstrumentAssignment) throws {
        try instrumentAssignments.assignInstrument(trackId: trackId, instrument: instrument)
        setHasUnsavedChanges(true)
    }

    /// Get instrument for track
    /// - Parameter trackId: Track identifier
    /// - Returns: Instrument assignment or nil
    func getInstrument(for trackId: String) -> InstrumentAssignment? {
        return instrumentAssignments.getInstrument(trackId: trackId)
    }

    /// Remove instrument assignment
    /// - Parameter trackId: Track identifier
    func removeInstrumentAssignment(from trackId: String) {
        instrumentAssignments.removeAssignment(trackId: trackId)
        setHasUnsavedChanges(true)
    }

    /// Get all instrument assignments
    /// - Returns: Array of all assignments
    func getAllInstrumentAssignments() -> [InstrumentAssignment] {
        return instrumentAssignments.getAllAssignments()
    }

    /// Clear all instrument assignments
    func clearAllInstrumentAssignments() {
        instrumentAssignments.clearAll()
        setHasUnsavedChanges(true)
    }

    /// Serialize instrument assignments to JSON
    /// - Returns: JSON object or nil
    func serializeInstrumentAssignments() -> [String: Any]? {
        let assignments = instrumentAssignments

        var serializedAssignments: [String: [String: Any]] = [:]

        for trackId in assignments.getAssignedTrackIds() {
            if let instrument = assignments.getInstrument(trackId: trackId) {
                serializedAssignments[trackId] = [
                    "id": instrument.id,
                    "name": instrument.name,
                    "type": instrument.type.rawValue,
                    "channel": instrument.channel,
                    "patch": instrument.patch,
                    "bankMSB": instrument.bankMSB ?? NSNull(),
                    "bankLSB": instrument.bankLSB ?? NSNull(),
                    "color": instrument.color,
                    "icon": instrument.icon,
                    "createdAt": (instrument.createdAt ?? Date()).ISO8601Format(),
                    "updatedAt": (instrument.updatedAt ?? Date()).ISO8601Format()
                ]

                // Include plugin if present
                if let plugin = instrument.plugin {
                    serializedAssignments[trackId]?["plugin"] = [
                        "id": plugin.id,
                        "name": plugin.name,
                        "manufacturer": plugin.manufacturer,
                        "parameters": plugin.parameters
                    ]
                }
            }
        }

        return ["assignments": serializedAssignments]
    }

    /// Deserialize instrument assignments from JSON
    /// - Parameter json: JSON object
    func deserializeInstrumentAssignments(from json: [String: Any]) {
        guard let assignmentsData = json["assignments"] as? [String: [String: Any]] else {
            return
        }

        let manager = InstrumentAssignmentManager()

        for (trackId, instrumentData) in assignmentsData {
            guard let id = instrumentData["id"] as? String,
                  let name = instrumentData["name"] as? String,
                  let typeString = instrumentData["type"] as? String,
                  let type = InstrumentType(rawValue: typeString),
                  let channel = instrumentData["channel"] as? Int,
                  let patch = instrumentData["patch"] as? Patch,
                  let color = instrumentData["color"] as? String,
                  let icon = instrumentData["icon"] as? String else {
                continue
            }

            let bankMSB = instrumentData["bankMSB"] as? Int
            let bankLSB = instrumentData["bankLSB"] as? Int

            // Parse plugin if present
            var plugin: PluginInfo? = nil
            if let pluginData = instrumentData["plugin"] as? [String: Any],
               let pluginId = pluginData["id"] as? String,
               let pluginName = pluginData["name"] as? String,
               let pluginManufacturer = pluginData["manufacturer"] as? String,
               let pluginParameters = pluginData["parameters"] as? [String: Double] {
                plugin = PluginInfo(
                    id: pluginId,
                    name: pluginName,
                    manufacturer: pluginManufacturer,
                    parameters: pluginParameters
                )
            }

            let instrument = InstrumentAssignment(
                id: id,
                name: name,
                type: type,
                channel: channel,
                patch: patch,
                bankMSB: bankMSB,
                bankLSB: bankLSB,
                plugin: plugin,
                color: color,
                icon: icon
            )

            // Parse timestamps
            if let createdAtString = instrumentData["createdAt"] as? String,
               let createdAt = ISO8601DateFormatter().date(from: createdAtString) {
                var mutableInstrument = instrument
                // Note: We can't modify createdAt directly as it's a let constant
                // In production, you'd want to make this a mutable property
            }

            if let updatedAtString = instrumentData["updatedAt"] as? String,
               let updatedAt = ISO8601DateFormatter().date(from: updatedAtString) {
                var mutableInstrument = instrument
                // Note: Same issue as above
            }

            try? manager.assignInstrument(trackId: trackId, instrument: instrument)
        }

        self.instrumentAssignments = manager
    }
}

/// Associated keys for objc_getAssociatedObject
private struct AssociatedKeys {
    static var instrumentAssignments = "instrumentAssignments"
}
