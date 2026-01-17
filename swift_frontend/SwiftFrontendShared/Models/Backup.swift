/**
 * Backup Model
 *
 * Represents a complete backup of all user data including songs, performances, and preferences.
 * Used for data recovery, export/import, and version control.
 */

import Foundation

/// Complete backup of all user data
public struct Backup: Codable, Sendable {
    /// Unique backup identifier
    public let id: String

    /// Backup creation timestamp
    public let timestamp: Date

    /// Human-readable description
    public let description: String

    /// Serialized songs (JSON array)
    public let songsJSON: String

    /// Serialized performances (JSON array)
    public let performancesJSON: String

    /// Serialized user preferences (JSON object)
    public let preferencesJSON: String

    /// Total backup size in bytes
    public let size: Int

    /// Application version that created this backup
    public let version: String

    public init(
        id: String,
        timestamp: Date,
        description: String,
        songsJSON: String,
        performancesJSON: String,
        preferencesJSON: String,
        size: Int,
        version: String
    ) {
        self.id = id
        self.timestamp = timestamp
        self.description = description
        self.songsJSON = songsJSON
        self.performancesJSON = performancesJSON
        self.preferencesJSON = preferencesJSON
        self.size = size
        self.version = version
    }
}

/// Result of a restore operation
public struct RestoreResult: Codable, Sendable {
    /// Number of songs successfully restored
    public var songsRestored: Int = 0

    /// Number of performances successfully restored
    public var performancesRestored: Int = 0

    /// Whether preferences were restored
    public var preferencesRestored: Bool = false

    /// Any errors that occurred during restore
    public var errors: [String] = []

    /// Whether the restore was successful
    public var isSuccess: Bool {
        return errors.isEmpty && songsRestored > 0
    }

    public init(
        songsRestored: Int = 0,
        performancesRestored: Int = 0,
        preferencesRestored: Bool = false,
        errors: [String] = []
    ) {
        self.songsRestored = songsRestored
        self.performancesRestored = performancesRestored
        self.preferencesRestored = preferencesRestored
        self.errors = errors
    }
}

/// Result of backup validation
public struct BackupValidationResult: Codable, Sendable {
    /// Whether songs JSON is valid
    public var validSongs: Bool = false

    /// Whether performances JSON is valid
    public var validPerformances: Bool = false

    /// Whether preferences JSON is valid
    public var validPreferences: Bool = false

    /// Overall validity
    public var isValid: Bool = false

    /// Validation errors
    public var errors: [String] = []

    public init(
        validSongs: Bool = false,
        validPerformances: Bool = false,
        validPreferences: Bool = false,
        isValid: Bool = false,
        errors: [String] = []
    ) {
        self.validSongs = validSongs
        self.validPerformances = validPerformances
        self.validPreferences = validPreferences
        self.isValid = isValid
        self.errors = errors
    }
}

/// Backup-related errors
public enum BackupError: LocalizedError, Sendable {
    case backupNotFound
    case invalidBackup
    case restoreFailed
    case exportFailed
    case importFailed(String)

    public var errorDescription: String? {
        switch self {
        case .backupNotFound:
            return "Backup not found"
        case .invalidBackup:
            return "Backup is invalid or corrupted"
        case .restoreFailed:
            return "Failed to restore from backup"
        case .exportFailed:
            return "Failed to export backup"
        case .importFailed(let message):
            return "Failed to import backup: \(message)"
        }
    }
}

/// Backup export data format for file I/O
public struct BackupExportData: Codable, Sendable {
    /// Application version
    public let version: String

    /// Backup timestamp
    public let timestamp: Date

    /// Backup description
    public let description: String

    /// Songs JSON data
    public let songs: String

    /// Performances JSON data
    public let performances: String

    /// Preferences JSON data
    public let preferences: String

    public init(
        version: String,
        timestamp: Date,
        description: String,
        songs: String,
        performances: String,
        preferences: String
    ) {
        self.version = version
        self.timestamp = timestamp
        self.description = description
        self.songs = songs
        self.performances = performances
        self.preferences = preferences
    }
}
