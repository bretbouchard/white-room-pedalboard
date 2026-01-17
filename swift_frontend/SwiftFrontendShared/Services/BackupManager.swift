//
//  BackupManager.swift
//  SwiftFrontendShared
//
//  Manages backup and restore operations for all user data
//

import Foundation

/// Manages backup and restore operations
public actor BackupManager {
    private let backupRepository: BackupRepository
    private let songRepository: SongDataRepository
    private let performanceRepository: PerformanceDataRepository
    private let userPreferencesRepository: UserPreferencesRepository

    // Configuration
    private var autoBackupEnabled: Bool { true }
    private var backupIntervalHours: Int { 24 }
    private var maxBackups: Int { 30 }
    private var backupTimer: Task<Void, Never>?

    public init(
        backupRepository: BackupRepository,
        songRepository: SongDataRepository,
        performanceRepository: PerformanceDataRepository,
        userPreferencesRepository: UserPreferencesRepository
    ) {
        self.backupRepository = backupRepository
        self.songRepository = songRepository
        self.performanceRepository = performanceRepository
        self.userPreferencesRepository = userPreferencesRepository

        startBackupTimer()
    }

    // MARK: - Public Methods

    /// Create a full backup of all data
    public func createBackup(description: String? = nil) async throws -> Backup {
        let timestamp = Date()

        // Backup songs (encode as SharedSong)
        let songs = try await songRepository.getAll()
        let songsData = try JSONEncoder().encode(songs)
        let songsJSON = String(data: songsData, encoding: .utf8)!

        // Backup performances
        let performances = try await performanceRepository.getAll()
        let performancesData = try JSONEncoder().encode(performances)
        let performancesJSON = String(data: performancesData, encoding: .utf8)!

        // Backup user preferences
        let preferences = try await userPreferencesRepository.getDefault()
        let preferencesData = try JSONEncoder().encode(preferences)
        let preferencesJSON = String(data: preferencesData, encoding: .utf8)!

        // Calculate backup size
        let backupSize = songsJSON.count + performancesJSON.count + preferencesJSON.count

        // Create backup record
        let backup = Backup(
            id: UUID().uuidString,
            timestamp: timestamp,
            description: description ?? generateDescription(),
            songsJSON: songsJSON,
            performancesJSON: performancesJSON,
            preferencesJSON: preferencesJSON,
            size: backupSize,
            version: getCurrentVersion()
        )

        // Save to database
        try await backupRepository.create(backup)

        // Prune old backups
        try await pruneOldBackups()

        NSLog("Created backup: \(backup.description)")
        return backup
    }

    /// Restore from backup
    public func restoreFromBackup(_ backupId: String) async throws -> RestoreResult {
        guard let backup = try await backupRepository.read(id: backupId) else {
            throw BackupError.backupNotFound
        }

        var result = RestoreResult()

        // Restore songs (decode as SharedSong)
        if let songsData = backup.songsJSON.data(using: .utf8) {
            let songs = try JSONDecoder().decode([SharedSong].self, from: songsData)

            for song in songs {
                do {
                    // Check if song already exists
                    if let existing = try await songRepository.read(id: song.id) {
                        // Update existing song (convert to SharedSong if needed)
                        try await songRepository.update(song)
                    } else {
                        // Create new song
                        try await songRepository.create(song)
                    }
                    result.songsRestored += 1
                } catch {
                    result.errors.append("Failed to restore song: \(song.name)")
                }
            }
        }

        // Restore performances
        if let performancesData = backup.performancesJSON.data(using: .utf8) {
            let performances = try JSONDecoder().decode([Performance].self, from: performancesData)

            for performance in performances {
                do {
                    // Check if performance already exists
                    if let existing = try await performanceRepository.read(id: performance.id) {
                        // Update existing performance
                        try await performanceRepository.update(performance)
                    } else {
                        // Create new performance
                        try await performanceRepository.create(performance)
                    }
                    result.performancesRestored += 1
                } catch {
                    result.errors.append("Failed to restore performance: \(performance.name)")
                }
            }
        }

        // Restore user preferences
        if let preferencesData = backup.preferencesJSON.data(using: .utf8) {
            let preferences = try JSONDecoder().decode(UserPreferences.self, from: preferencesData)

            try await userPreferencesRepository.upsert(preferences)
            result.preferencesRestored = true
        }

        NSLog("Restored backup: \(backup.description)")
        return result
    }

    /// Get all backups
    public func getAllBackups() async throws -> [Backup] {
        return try await backupRepository.getAll()
    }

    /// Get latest backup
    public func getLatestBackup() async throws -> Backup? {
        return try await backupRepository.getLatest()
    }

    /// Delete backup
    public func deleteBackup(_ backupId: String) async throws {
        try await backupRepository.delete(id: backupId)
    }

    /// Get backup size in bytes
    public func getBackupSize(_ backupId: String) async throws -> Int {
        guard let backup = try await backupRepository.read(id: backupId) else {
            throw BackupError.backupNotFound
        }

        return backup.size
    }

    /// Validate backup integrity
    public func validateBackup(_ backupId: String) async throws -> BackupValidationResult {
        guard let backup = try await backupRepository.read(id: backupId) else {
            throw BackupError.backupNotFound
        }

        var result = BackupValidationResult()

        // Validate songs JSON (validate as SharedSong)
        if let songsData = backup.songsJSON.data(using: .utf8) {
            do {
                _ = try JSONDecoder().decode([SharedSong].self, from: songsData)
                result.validSongs = true
            } catch {
                result.errors.append("Invalid songs JSON: \(error.localizedDescription)")
            }
        }

        // Validate performances JSON
        if let performancesData = backup.performancesJSON.data(using: .utf8) {
            do {
                _ = try JSONDecoder().decode([Performance].self, from: performancesData)
                result.validPerformances = true
            } catch {
                result.errors.append("Invalid performances JSON: \(error.localizedDescription)")
            }
        }

        // Validate preferences JSON
        if let preferencesData = backup.preferencesJSON.data(using: .utf8) {
            do {
                _ = try JSONDecoder().decode(UserPreferences.self, from: preferencesData)
                result.validPreferences = true
            } catch {
                result.errors.append("Invalid preferences JSON: \(error.localizedDescription)")
            }
        }

        result.isValid = result.validSongs && result.validPerformances && result.validPreferences

        return result
    }

    /// Get backup statistics
    public func getBackupStatistics() async throws -> BackupStatistics {
        let backups = try await backupRepository.getAll()
        let totalSize = try await backupRepository.getTotalSize()
        let count = backups.count

        return BackupStatistics(
            totalBackups: count,
            totalSize: totalSize,
            oldestBackup: backups.last?.timestamp,
            newestBackup: backups.first?.timestamp,
            averageSize: count > 0 ? totalSize / count : 0
        )
    }

    // MARK: - Private Methods

    private func startBackupTimer() {
        backupTimer = Task {
            while !Task.isCancelled {
                do {
                    let interval = TimeInterval(backupIntervalHours * 3600)
                    try await Task.sleep(for: .seconds(interval))

                    if autoBackupEnabled {
                        try await createBackup(description: "Scheduled backup")
                    }
                } catch {
                    // Timer cancelled or error
                    break
                }
            }
        }
    }

    private func pruneOldBackups() async throws {
        let backups = try await backupRepository.getAll()

        if backups.count > maxBackups {
            // Sort by timestamp, oldest first
            let sorted = backups.sorted { $0.timestamp < $1.timestamp }
            let toDelete = sorted.dropFirst(maxBackups)

            for backup in toDelete {
                try await backupRepository.delete(id: backup.id)
            }
        }
    }

    private func generateDescription() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .medium

        let timestamp = formatter.string(from: Date())
        return "Backup - \(timestamp)"
    }

    private func getCurrentVersion() -> String {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    /// Cleanup
    deinit {
        backupTimer?.cancel()
    }
}

/// Backup statistics
public struct BackupStatistics {
    public let totalBackups: Int
    public let totalSize: Int
    public let oldestBackup: Date?
    public let newestBackup: Date?
    public let averageSize: Int
}
