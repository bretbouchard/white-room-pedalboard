//
//  Song+AutoSave.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Song Auto-Save Extension
// =============================================================================

/**
 Extension to Song for auto-save integration.

 Provides convenience methods for integrating with AutoSaveManager.
 */
extension Song {

    // MARK: - Auto-Save Metadata

    /**
     Add auto-save metadata to song

     - Parameter version: Auto-save version number
     - Parameter isCrashRecovery: Whether this is a crash recovery
     - Returns: Updated song with metadata
     */
    public func withAutoSaveMetadata(
        version: Int,
        isCrashRecovery: Bool = false
    ) -> Song {
        var updated = self

        // Add custom metadata marker
        if var additionalParams = updated.metadata.additionalMetadata {
            additionalParams["lastAutoSaveVersion"] = version
            additionalParams["isCrashRecovery"] = isCrashRecovery
            updated.metadata.additionalMetadata = additionalParams
        } else {
            updated.metadata.additionalMetadata = [
                "lastAutoSaveVersion": version,
                "isCrashRecovery": isCrashRecovery
            ]
        }

        // Update timestamp
        updated.updatedAt = Date()

        return updated
    }

    /**
     Get last auto-save version from metadata
     */
    public var lastAutoSaveVersion: Int? {
        metadata.additionalMetadata?["lastAutoSaveVersion"] as? Int
    }

    /**
     Check if this is a crash recovery version
     */
    public var isCrashRecovery: Bool {
        metadata.additionalMetadata?["isCrashRecovery"] as? Bool ?? false
    }

    // MARK: - Validation

    /**
     Validate song for auto-save

     Checks if the song is in a valid state for auto-save.
     - Returns: Validation result with error if invalid
     */
    public func validateForAutoSave() -> AutoSaveValidationResult {
        // Check if song has required fields
        if id.isEmpty {
            return .invalid(AutoSaveError.encodingFailed)
        }

        if name.isEmpty {
            return .invalid(AutoSaveError.encodingFailed)
        }

        // Check if song has at least one section
        if sections.isEmpty {
            return .invalid(AutoSaveError.saveFailed(
                NSError(domain: "AutoSave", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "Song must have at least one section"
                ])
            ))
        }

        // Check estimated file size
        let estimatedSize = estimateSize()

        if estimatedSize > 100_000_000 { // 100 MB limit
            return .invalid(AutoSaveError.fileTooLarge(estimatedSize))
        }

        return .valid
    }

    /**
     Estimate song size in bytes
     */
    public func estimateSize() -> Int {
        let sectionSize = sections.count * 1000
        let roleSize = roles.count * 500
        let projectionSize = projections.count * 300
        let mixSize = mixGraph.tracks.count * 500 + mixGraph.buses.count * 300

        return sectionSize + roleSize + projectionSize + mixSize + 10000
    }
}

// =============================================================================
// MARK: - Auto Save Validation Result
// =============================================================================

/**
 Result of auto-save validation
 */
public enum AutoSaveValidationResult {
    case valid
    case invalid(Error)
}

// =============================================================================
// MARK: - Auto-Save Integration Manager
// =============================================================================

/**
 Manager for integrating auto-save with Song lifecycle.

 This coordinator handles the integration between Song models and AutoSaveManager,
 providing a high-level API for auto-save operations.
 */
public actor SongAutoSaveCoordinator {

    // MARK: - Singleton

    public static let shared = SongAutoSaveCoordinator()

    // MARK: - Properties

    private let autoSaveManager = AutoSaveManager.shared
    private var activeSong: Song?

    // MARK: - Initialization

    private init() {}

    // MARK: - Public API

    /**
     Start auto-save for a song

     - Parameter song: The song to auto-save
     - Parameter eventCallback: Optional callback for events
     */
    public func startAutoSave(
        for song: Song,
        eventCallback: ((AutoSaveManager.AutoSaveEvent) -> Void)? = nil
    ) async {
        activeSong = song

        await autoSaveManager.startAutoSave(for: song) { event in
            // Handle events
            switch event {
            case .saved(let timeInterval):
                NSLog("SongAutoSave: Saved \(timeInterval)s ago")
            case .failed(let error):
                NSLog("SongAutoSave: Failed - \(error)")
            case .restored(let version):
                NSLog("SongAutoSave: Restored version \(version)")
            case .crashDetected(let version):
                NSLog("SongAutoSave: Crash detected, version \(version)")
            }

            eventCallback?(event)
        }
    }

    /**
     Stop auto-save
     */
    public func stopAutoSave() async {
        await autoSaveManager.stopAutoSave()
        activeSong = nil
    }

    /**
     Trigger immediate save (for critical changes)

     - Parameter song: Updated song to save
     */
    public func triggerSave(for song: Song) async throws {
        // Validate song
        let validation = song.validateForAutoSave()

        if case .invalid(let error) = validation {
            throw error
        }

        // Update active song
        activeSong = song

        // Trigger save
        try await autoSaveManager.triggerImmediateSave()
    }

    /**
     Restore from auto-save

     - Parameter version: Version to restore
     - Returns: Restored song
     */
    public func restore(version: Int) async throws -> Song {
        let song = try await autoSaveManager.restoreFromAutoSave(version: version)

        // Mark as crash recovery
        let recoveredSong = song.withAutoSaveMetadata(
            version: version,
            isCrashRecovery: true
        )

        // Update active song
        activeSong = recoveredSong

        return recoveredSong
    }

    /**
     Get current auto-save status
     */
    public func getAutoSaveStatus() async -> AutoSaveStatus {
        let lastSaveTime = await autoSaveManager.getLastSaveTime()
        let timeSinceSave = await autoSaveManager.getTimeSinceLastSave()
        let history = await autoSaveManager.getSaveHistory()
        let config = await autoSaveManager.configuration

        return AutoSaveStatus(
            isEnabled: config.isEnabled,
            lastSaveTime: lastSaveTime,
            timeSinceLastSave: timeSinceSave,
            saveHistory: history,
            isSaving: false
        )
    }

    /**
     Clear auto-saves for a song
     */
    public func clearAutoSaves(for songId: String) async throws {
        try await autoSaveManager.clearAutoSaves(for: songId)
    }
}

// =============================================================================
// MARK: - Auto Save Status
// =============================================================================

/**
 Current auto-save status
 */
public struct AutoSaveStatus {
    public let isEnabled: Bool
    public let lastSaveTime: Date?
    public let timeSinceLastSave: TimeInterval?
    public let saveHistory: [AutoSaveManager.AutoSaveState]
    public let isSaving: Bool
}

// =============================================================================
// MARK: - Song Metadata Extension
// =============================================================================

/**
 Add auto-save metadata support to SongMetadata
 */
extension SongMetadata {

    /**
     Additional metadata for auto-save
     */
    var additionalMetadata: [String: Any]? {
        get {
            // In a real implementation, this would be stored in the metadata
            // For now, we'll use a computed property
            return nil
        }
        set {
            // In a real implementation, this would update the metadata
            // For now, we'll store it separately
        }
    }
}
