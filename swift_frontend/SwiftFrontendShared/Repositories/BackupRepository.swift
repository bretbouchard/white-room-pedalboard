//
//  BackupRepository.swift
//  SwiftFrontendShared
//
//  Repository for backup CRUD operations with GRDB integration
//

import Foundation
import GRDB

/// Repository for Backup CRUD operations
public actor BackupRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create a new backup
    public func create(_ backup: Backup) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                INSERT INTO backups (
                    id, timestamp, description,
                    songs_json, performances_json, preferences_json,
                    size, version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                arguments: [
                    backup.id,
                    backup.timestamp,
                    backup.description,
                    backup.songsJSON,
                    backup.performancesJSON,
                    backup.preferencesJSON,
                    backup.size,
                    backup.version
                ]
            )
        }
    }

    /// Read a backup by ID
    public func read(id: String) async throws -> Backup? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM backups WHERE id = ?",
                arguments: [id]
            ) {
                return try Self.mapRowToBackup(row)
            }
            return nil
        }
    }

    /// Update an existing backup
    public func update(_ backup: Backup) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                UPDATE backups SET
                    description = ?,
                    songs_json = ?,
                    performances_json = ?,
                    preferences_json = ?,
                    size = ?
                WHERE id = ?
                """,
                arguments: [
                    backup.description,
                    backup.songsJSON,
                    backup.performancesJSON,
                    backup.preferencesJSON,
                    backup.size,
                    backup.id
                ]
            )
        }
    }

    /// Delete a backup by ID
    public func delete(id: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM backups WHERE id = ?",
                arguments: [id]
            )
        }
    }

    // MARK: - Query Operations

    /// Get all backups ordered by timestamp (newest first)
    public func getAll() async throws -> [Backup] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM backups ORDER BY timestamp DESC"
            )
            return try rows.map { try Self.mapRowToBackup($0) }
        }
    }

    /// Get latest backup
    public func getLatest() async throws -> Backup? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM backups ORDER BY timestamp DESC LIMIT 1"
            ) {
                return try Self.mapRowToBackup(row)
            }
            return nil
        }
    }

    /// Get backups within a date range
    public func getByDateRange(from startDate: Date, to endDate: Date) async throws -> [Backup] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM backups WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC",
                arguments: [startDate, endDate]
            )
            return try rows.map { try Self.mapRowToBackup($0) }
        }
    }

    /// Get backups by version
    public func getByVersion(_ version: String) async throws -> [Backup] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM backups WHERE version = ? ORDER BY timestamp DESC",
                arguments: [version]
            )
            return try rows.map { try Self.mapRowToBackup($0) }
        }
    }

    /// Get total backup size
    public func getTotalSize() async throws -> Int {
        try await db.read { database in
            let total = try Int.fetchOne(
                database,
                sql: "SELECT SUM(size) FROM backups"
            )
            return total ?? 0
        }
    }

    /// Delete backups older than specified date
    public func deleteOlderThan(_ date: Date) async throws -> Int {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM backups WHERE timestamp < ?",
                arguments: [date]
            )
            return database.changesCount
        }
    }

    /// Count total backups
    public func count() async throws -> Int {
        try await db.read { database in
            let count = try Int.fetchOne(
                database,
                sql: "SELECT COUNT(*) FROM backups"
            )
            return count ?? 0
        }
    }

    // MARK: - Helper Methods

    /// Map database row to Backup model
    private static func mapRowToBackup(_ row: Row) throws -> Backup {
        return Backup(
            id: row["id"],
            timestamp: row["timestamp"],
            description: row["description"],
            songsJSON: row["songs_json"],
            performancesJSON: row["performances_json"],
            preferencesJSON: row["preferences_json"],
            size: row["size"],
            version: row["version"]
        )
    }
}
