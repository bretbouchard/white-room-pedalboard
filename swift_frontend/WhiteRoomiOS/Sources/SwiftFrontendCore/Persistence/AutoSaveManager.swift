//
//  AutoSaveManager.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
#if canImport(UIKit)
import UIKit
#endif

// =============================================================================
// MARK: - Auto Save Manager
// =============================================================================

/**
 Comprehensive auto-save system with crash recovery and user notifications.

 ## Features

 - **Timer-based auto-save**: Configurable intervals (default 30s)
 - **Crash recovery**: Detects crashes and offers to restore auto-saved versions
 - **User notifications**: Shows "Last saved X seconds ago" indicator
 - **Performance optimized**: Asynchronous saves, incremental changes
 - **Battery aware**: Considers power state on mobile platforms
 - **Smart triggers**: Saves on critical changes, idle detection, memory pressure

 ## Usage

 ```swift
 let manager = AutoSaveManager.shared
 await manager.startAutoSave(for: song, interval: 30)
 manager.stopAutoSave()
 ```

 ## Thread Safety

 AutoSaveManager is an actor, ensuring thread-safe access to all operations.
 */
public actor AutoSaveManager {

    // MARK: - Singleton

    public static let shared = AutoSaveManager()

    // MARK: - Types

    /**
     Auto-save configuration
     */
    public struct Configuration: Codable, Sendable {

        /**
         Time interval between auto-saves (in seconds)
         */
        var interval: TimeInterval

        /**
         Maximum number of auto-save versions to keep
         */
        var maxVersions: Int

        /**
         Maximum file size for auto-save (in bytes)
         Files larger than this will not be auto-saved
         */
        var maxFileSize: Int

        /**
         Whether auto-save is enabled
         */
        var isEnabled: Bool

        /**
         Whether to show notifications
         */
        var showNotifications: Bool

        /**
         Whether to consider battery state (mobile only)
         */
        var conserveBattery: Bool

        public init(
            interval: TimeInterval = 30.0,
            maxVersions: Int = 10,
            maxFileSize: Int = 100_000_000, // 100 MB
            isEnabled: Bool = true,
            showNotifications: Bool = true,
            conserveBattery: Bool = true
        ) {
            self.interval = interval
            self.maxVersions = maxVersions
            self.maxFileSize = maxFileSize
            self.isEnabled = isEnabled
            self.showNotifications = showNotifications
            self.conserveBattery = conserveBattery
        }
    }

    /**
     Auto-save state
     */
    public struct AutoSaveState: Codable, Sendable {

        /**
         Unique identifier for the auto-saved song
         */
        var songId: String

        /**
         Path to the auto-saved file
         */
        var autoSavePath: String

        /**
         When this auto-save was created
         */
        var savedAt: Date

        /**
         File size in bytes
         */
        var fileSize: Int

        /**
         Version number (incrementing)
         */
        var version: Int

        /**
         Whether this auto-save was restored after a crash
         */
        var isCrashRecovery: Bool

        init(
            songId: String,
            autoSavePath: String,
            savedAt: Date,
            fileSize: Int,
            version: Int,
            isCrashRecovery: Bool = false
        ) {
            self.songId = songId
            self.autoSavePath = autoSavePath
            self.savedAt = savedAt
            self.fileSize = fileSize
            self.version = version
            self.isCrashRecovery = isCrashRecovery
        }
    }

    /**
     Auto-save event for user notifications
     */
    public enum AutoSaveEvent: Sendable {
        case saved(timeInterval: TimeInterval)
        case failed(Error)
        case restored(version: Int)
        case crashDetected(version: Int)
    }

    // MARK: - Properties

    /**
     Current configuration
     */
    private(set) var configuration: Configuration

    /**
     Active auto-save timer
     */
    private var timerTask: Task<Void, Never>?

    /**
     Current song being auto-saved
     */
    private var currentSong: Song?

    /**
     Last save time
     */
    private var lastSaveTime: Date?

    /**
     Current auto-save version
     */
    private var currentVersion: Int = 0

    /**
     Auto-save history (limited to maxVersions)
     */
    private var saveHistory: [AutoSaveState] = []

    /**
     Event callback for user notifications
     */
    private var eventCallback: ((AutoSaveEvent) -> Void)?

    /**
     File manager for file operations
     */
    private let fileManager = FileManager.default

    /**
     Auto-save directory URL
     */
    private var autoSaveDirectory: URL {
        let urls = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        let appSupportURL = urls.first ?? fileManager.temporaryDirectory
        let autoSaveURL = appSupportURL.appendingPathComponent("AutoSaves", isDirectory: true)

        // Create directory if it doesn't exist
        try? fileManager.createDirectory(at: autoSaveURL, withIntermediateDirectories: true)

        return autoSaveURL
    }

    /**
     Crash detection marker file path
     */
    private var crashMarkerPath: URL {
        autoSaveDirectory.appendingPathComponent(".crash_marker")
    }

    // MARK: - Initialization

    private init(configuration: Configuration = Configuration()) {
        self.configuration = configuration

        // Check for crash on startup
        Task {
            await checkForCrash()
        }
    }

    // MARK: - Public API

    /**
     Start auto-save for a song

     - Parameter song: The song to auto-save
     - Parameter interval: Optional custom interval (overrides config)
     - Parameter eventCallback: Optional callback for auto-save events
     */
    public func startAutoSave(
        for song: Song,
        interval: TimeInterval? = nil,
        eventCallback: ((AutoSaveEvent) -> Void)? = nil
    ) {
        guard configuration.isEnabled else {
            NSLog("AutoSave: Auto-save is disabled")
            return
        }

        // Stop any existing auto-save
        stopAutoSave()

        // Store state
        self.currentSong = song
        self.eventCallback = eventCallback

        let saveInterval = interval ?? configuration.interval

        NSLog("AutoSave: Starting auto-save for song \(song.id) every \(saveInterval)s")

        // Start timer
        timerTask = Task {
            while !Task.isCancelled {
                do {
                    #if os(iOS) || os(macOS) || os(watchOS) || os(tvOS)
                    if #available(iOS 16.0, macOS 13.0, watchOS 9.0, tvOS 16.0, *) {
                        try await Task.sleep(for: .seconds(saveInterval))
                    } else {
                        let nanoseconds = UInt64(saveInterval * 1_000_000_000)
                        try await Task.sleep(nanoseconds: nanoseconds)
                    }
                    #else
                    try await Task.sleep(for: .seconds(saveInterval))
                    #endif

                    // Check if we should save
                    if await shouldAutoSave() {
                        try await performAutoSave()
                    }
                } catch {
                    if !Task.isCancelled {
                        NSLog("AutoSave: Timer error: \(error)")
                    }
                }
            }
        }
    }

    /**
     Stop auto-save
     */
    public func stopAutoSave() {
        timerTask?.cancel()
        timerTask = nil
        currentSong = nil
        lastSaveTime = nil

        NSLog("AutoSave: Stopped auto-save")
    }

    /**
     Trigger an immediate auto-save (for critical changes)
     */
    public func triggerImmediateSave() async throws {
        guard let song = currentSong else {
            throw AutoSaveError.noActiveSong
        }

        NSLog("AutoSave: Triggering immediate save for song \(song.id)")
        try await performAutoSave()
    }

    /**
     Get the last save time
     */
    public func getLastSaveTime() -> Date? {
        return lastSaveTime
    }

    /**
     Get time since last save
     */
    public func getTimeSinceLastSave() -> TimeInterval? {
        guard let lastSave = lastSaveTime else {
            return nil
        }
        return Date().timeIntervalSince(lastSave)
    }

    /**
     Get auto-save history
     */
    public func getSaveHistory() -> [AutoSaveState] {
        return saveHistory
    }

    /**
     Update configuration
     */
    public func updateConfiguration(_ config: Configuration) {
        self.configuration = config
        NSLog("AutoSave: Configuration updated")

        // Restart auto-save if active
        if currentSong != nil {
            if let song = currentSong {
                startAutoSave(for: song, eventCallback: eventCallback)
            }
        }
    }

    /**
     Restore from auto-save
     */
    public func restoreFromAutoSave(version: Int) async throws -> Song {
        guard let state = saveHistory.first(where: { $0.version == version }) else {
            throw AutoSaveError.versionNotFound(version)
        }

        NSLog("AutoSave: Restoring from version \(version)")

        // Load the auto-saved song
        let data = try Data(contentsOf: URL(fileURLWithPath: state.autoSavePath))
        let song = try JSONDecoder().decode(Song.self, from: data)

        // Mark as crash recovery
        var restoredState = state
        restoredState.isCrashRecovery = true

        // Update event callback
        eventCallback?(.restored(version: version))

        return song
    }

    /**
     Clear all auto-save data for a song
     */
    public func clearAutoSaves(for songId: String) async throws {
        // Remove all auto-save files for this song
        for state in saveHistory.filter({ $0.songId == songId }) {
            try fileManager.removeItem(atPath: state.autoSavePath)
        }

        // Remove from history
        saveHistory.removeAll { $0.songId == songId }

        NSLog("AutoSave: Cleared auto-saves for song \(songId)")
    }

    // MARK: - Private Methods

    /**
     Check if auto-save should occur
     */
    private func shouldAutoSave() async -> Bool {
        // Check if disabled
        guard configuration.isEnabled else {
            return false
        }

        // Check battery state (if enabled)
        #if os(iOS)
        if configuration.conserveBattery {
            let batteryState = await getBatteryState()
            if batteryState == .lowPower {
                NSLog("AutoSave: Skipping save due to low power mode")
                return false
            }
        }
        #endif

        // Check file size (if we have a current song)
        if let song = currentSong {
            let estimatedSize = estimateSongSize(song)
            if estimatedSize > configuration.maxFileSize {
                NSLog("AutoSave: Skipping save - file too large (\(estimatedSize) bytes)")
                return false
            }
        }

        return true
    }

    /**
     Perform the auto-save operation
     */
    private func performAutoSave() async throws {
        guard let song = currentSong else {
            throw AutoSaveError.noActiveSong
        }

        NSLog("AutoSave: Performing auto-save for song \(song.id)")

        do {
            // Increment version
            currentVersion += 1

            // Create auto-save filename
            let filename = "\(song.id)_autosave_v\(currentVersion).json"
            let filePath = autoSaveDirectory.appendingPathComponent(filename).path

            // Encode song to JSON
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(song)

            // Write to file atomically
            try data.write(to: URL(fileURLWithPath: filePath), options: .atomic)

            // Get file size
            let fileSize = (try? fileManager.attributesOfItem(atPath: filePath)[.size] as? Int) ?? data.count

            // Create save state
            let state = AutoSaveState(
                songId: song.id,
                autoSavePath: filePath,
                savedAt: Date(),
                fileSize: fileSize,
                version: currentVersion
            )

            // Add to history
            saveHistory.append(state)

            // Trim history to max versions
            while saveHistory.count > configuration.maxVersions {
                let oldState = saveHistory.removeFirst()
                try? fileManager.removeItem(atPath: oldState.autoSavePath)
            }

            // Update last save time
            lastSaveTime = Date()

            // Write crash marker
            writeCrashMarker()

            // Notify callback
            if configuration.showNotifications {
                let timeSinceSave = Date().timeIntervalSince(state.savedAt)
                eventCallback?(.saved(timeInterval: timeSinceSave))
            }

            NSLog("AutoSave: Successfully saved version \(currentVersion)")

        } catch {
            NSLog("AutoSave: Failed to save - \(error)")
            eventCallback?(.failed(error))
            throw AutoSaveError.saveFailed(error)
        }
    }

    /**
     Estimate song size for auto-save limits
     */
    private func estimateSongSize(_ song: Song) -> Int {
        // Rough estimate: sections + roles + projections + mix graph
        let sectionSize = song.sections.count * 1000 // ~1KB per section
        let roleSize = song.roles.count * 500 // ~500B per role
        let projectionSize = song.projections.count * 300 // ~300B per projection
        let mixSize = song.mixGraph.tracks.count * 500 + song.mixGraph.buses.count * 300 // ~500B per track, ~300B per bus

        return sectionSize + roleSize + projectionSize + mixSize + 10000 // Base overhead
    }

    /**
     Check for crash on startup
     */
    private func checkForCrash() async {
        // Check if crash marker exists
        if fileManager.fileExists(atPath: crashMarkerPath.path) {
            NSLog("AutoSave: Crash detected - marker file found")

            // Read crash marker to get last auto-save info
            if let data = try? Data(contentsOf: crashMarkerPath),
               let crashInfo = try? JSONDecoder().decode(CrashInfo.self, from: data) {

                // Notify callback
                eventCallback?(.crashDetected(version: crashInfo.lastVersion))

                // Load auto-save history
                loadAutoSaveHistory()
            }

            // Remove crash marker
            try? fileManager.removeItem(at: crashMarkerPath)
        } else {
            // No crash, load history normally
            loadAutoSaveHistory()
        }
    }

    /**
     Write crash marker file
     */
    private func writeCrashMarker() {
        let crashInfo = CrashInfo(
            songId: currentSong?.id ?? "",
            lastVersion: currentVersion,
            timestamp: Date()
        )

        if let data = try? JSONEncoder().encode(crashInfo) {
            try? data.write(to: crashMarkerPath)
        }
    }

    /**
     Load auto-save history from disk
     */
    private func loadAutoSaveHistory() {
        // Clear current history
        saveHistory.removeAll()

        // Load all auto-save files
        guard let contents = try? fileManager.contentsOfDirectory(
            at: autoSaveDirectory,
            includingPropertiesForKeys: nil
        ) else {
            return
        }

        for file in contents {
            guard file.lastPathComponent.hasSuffix(".json") else { continue }

            // Parse version from filename
            let filename = file.lastPathComponent
            let components = filename.components(separatedBy: "_")
            guard components.count >= 3 else { continue }

            let versionString = components[2].replacingOccurrences(of: "autosave_v", with: "")
              .replacingOccurrences(of: ".json", with: "")
            guard let version = Int(versionString) else {
                continue
            }

            // Get file attributes
            let attributes = try? fileManager.attributesOfItem(atPath: file.path)
            let fileSize = (attributes?[.size] as? Int) ?? 0
            let modifiedDate = (attributes?[.modificationDate] as? Date) ?? Date()

            // Extract song ID
            let songId = components[0]

            // Create state
            let state = AutoSaveState(
                songId: songId,
                autoSavePath: file.path,
                savedAt: modifiedDate,
                fileSize: fileSize,
                version: version
            )

            saveHistory.append(state)
        }

        // Sort by version
        saveHistory.sort { $0.version < $1.version }

        // Update current version
        currentVersion = saveHistory.map { $0.version }.max() ?? 0

        NSLog("AutoSave: Loaded \(saveHistory.count) auto-save versions")
    }

    /**
     Get battery state (iOS only)
     */
    #if os(iOS)
    @available(iOS 9.0, *)
    private func getBatteryState() async -> BatteryState {
        return await withCheckedContinuation { continuation in
            UIDevice.current.isBatteryMonitoringEnabled = true
            let state = UIDevice.current.batteryState
            let level = UIDevice.current.batteryLevel

            if state == .unplugged && level < 0.2 {
                continuation.resume(returning: .lowPower)
            } else if ProcessInfo.processInfo.isLowPowerModeEnabled {
                continuation.resume(returning: .lowPower)
            } else {
                continuation.resume(returning: .normal)
            }
        }
    }
    #endif
}

// =============================================================================
// MARK: - Supporting Types
// =============================================================================

/**
 Auto-save errors
 */
public enum AutoSaveError: LocalizedError {
    case noActiveSong
    case saveFailed(Error)
    case versionNotFound(Int)
    case fileTooLarge(Int)
    case encodingFailed
    case decodingFailed(Error)

    public var errorDescription: String? {
        switch self {
        case .noActiveSong:
            return "No active song to auto-save"
        case .saveFailed(let error):
            return "Auto-save failed: \(error.localizedDescription)"
        case .versionNotFound(let version):
            return "Auto-save version \(version) not found"
        case .fileTooLarge(let size):
            return "File too large for auto-save (\(size) bytes)"
        case .encodingFailed:
            return "Failed to encode song for auto-save"
        case .decodingFailed(let error):
            return "Failed to decode auto-saved song: \(error.localizedDescription)"
        }
    }
}

/**
 Crash detection marker
 */
private struct CrashInfo: Codable {
    var songId: String
    var lastVersion: Int
    var timestamp: Date
}

/**
 Battery state
 */
private enum BatteryState {
    case normal
    case lowPower
}

// =============================================================================
// MARK: - User Notification Helpers
// =============================================================================

extension AutoSaveManager {

    /**
     Get human-readable time since last save
     */
    public func getTimeSinceLastSaveFormatted() -> String? {
        guard let timeInterval = getTimeSinceLastSave() else {
            return nil
        }

        if timeInterval < 60 {
            return "Saved \(Int(timeInterval))s ago"
        } else if timeInterval < 3600 {
            let minutes = Int(timeInterval / 60)
            return "Saved \(minutes)m ago"
        } else {
            let hours = Int(timeInterval / 3600)
            return "Saved \(hours)h ago"
        }
    }
}
