//
//  UserPreferencesRepository.swift
//  SwiftFrontendShared
//
//  Repository for User Preferences persistence
//

import Foundation
import GRDB

/// Repository for User Preferences persistence
public actor UserPreferencesRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create or update user preferences
    public func upsert(_ preferences: UserPreferences) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                INSERT OR REPLACE INTO user_preferences (
                    user_id, display_name, default_output_device, default_input_device,
                    default_sample_rate, default_buffer_size,
                    auto_save_enabled, auto_save_interval,
                    auto_backup_enabled, backup_interval_hours, max_backups,
                    theme, language, show_tooltips, custom_preferences, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                arguments: [
                    preferences.userId,
                    preferences.displayName,
                    preferences.defaultOutputDevice,
                    preferences.defaultInputDevice,
                    preferences.defaultSampleRate,
                    preferences.defaultBufferSize,
                    preferences.autoSaveEnabled,
                    preferences.autoSaveInterval,
                    preferences.autoBackupEnabled,
                    preferences.backupIntervalHours,
                    preferences.maxBackups,
                    preferences.theme,
                    preferences.language,
                    preferences.showTooltips,
                    preferences.customPreferences.jsonString,
                    preferences.updatedAt
                ]
            )
        }
    }

    /// Read user preferences by user ID
    public func read(userId: String = "default") async throws -> UserPreferences? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM user_preferences WHERE user_id = ?",
                arguments: [userId]
            ) {
                return try mapRowToUserPreferences(row)
            }
            return nil
        }
    }

    /// Update user preferences (alias for upsert)
    public func update(_ preferences: UserPreferences) async throws {
        try await upsert(preferences)
    }

    /// Delete user preferences by user ID
    public func delete(userId: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM user_preferences WHERE user_id = ?",
                arguments: [userId]
            )
        }
    }

    // MARK: - Query Operations

    /// Get default preferences (creates if not exists)
    public func getDefault() async throws -> UserPreferences {
        if let existing = try await read() {
            return existing
        }

        // Create default preferences
        let defaults = UserPreferences(
            userId: "default",
            displayName: nil,
            defaultOutputDevice: nil,
            defaultInputDevice: nil,
            defaultSampleRate: 48000,
            defaultBufferSize: 256,
            autoSaveEnabled: true,
            autoSaveInterval: 300,
            autoBackupEnabled: true,
            backupIntervalHours: 24,
            maxBackups: 30,
            theme: nil,
            language: nil,
            showTooltips: true,
            customPreferences: [:],
            updatedAt: Date()
        )

        try await upsert(defaults)
        return defaults
    }

    // MARK: - Helper Methods

    /// Map database row to UserPreferences model
    private func mapRowToUserPreferences(_ row: Row) throws -> UserPreferences {
        return UserPreferences(
            userId: row["user_id"],
            displayName: row["display_name"],
            defaultOutputDevice: row["default_output_device"],
            defaultInputDevice: row["default_input_device"],
            defaultSampleRate: row["default_sample_rate"],
            defaultBufferSize: row["default_buffer_size"],
            autoSaveEnabled: row["auto_save_enabled"],
            autoSaveInterval: row["auto_save_interval"],
            autoBackupEnabled: row["auto_backup_enabled"],
            backupIntervalHours: row["backup_interval_hours"],
            maxBackups: row["max_backups"],
            theme: row["theme"],
            language: row["language"],
            showTooltips: row["show_tooltips"],
            customPreferences: (row["custom_preferences"] as String?)?.jsonDictionary ?? [:],
            updatedAt: row["updated_at"]
        )
    }
}

// MARK: - Helper Extensions

extension Dictionary where Key == String, Value == String {
    var jsonString: String? {
        guard let data = try? JSONEncoder().encode(self) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

extension String {
    var jsonDictionary: [String: String]? {
        guard let data = data(using: .utf8),
              let dict = try? JSONDecoder().decode([String: String].self, from: data) else { return nil }
        return dict
    }
}
