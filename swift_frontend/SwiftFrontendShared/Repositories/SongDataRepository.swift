//
//  SongDataRepository.swift
//  SwiftFrontendShared
//
//  Repository for Song data persistence (backup-compatible models)
//

import Foundation
import GRDB

/// Repository for Song data persistence
public actor SongDataRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create a new song
    public func create(_ song: SharedSong) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                INSERT INTO song_data (
                    id, name, composer, description, genre, duration, key,
                    created_at, updated_at, song_data_json, determinism_seed, custom_metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                arguments: [
                    song.id,
                    song.name,
                    song.composer,
                    song.songDescription,
                    song.genre,
                    song.duration,
                    song.key,
                    song.createdAt,
                    song.updatedAt,
                    song.songDataJSON,
                    song.determinismSeed,
                    song.customMetadata?.jsonString
                ]
            )
        }
    }

    /// Read a song by ID
    public func read(id: String) async throws -> Song? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM song_data WHERE id = ?",
                arguments: [id]
            ) {
                return try mapRowToSong(row)
            }
            return nil
        }
    }

    /// Update an existing song
    public func update(_ song: SharedSong) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                UPDATE song_data SET
                    name = ?, composer = ?, description = ?, genre = ?, duration = ?, key = ?,
                    updated_at = ?, song_data_json = ?, determinism_seed = ?, custom_metadata = ?
                WHERE id = ?
                """,
                arguments: [
                    song.name,
                    song.composer,
                    song.songDescription,
                    song.genre,
                    song.duration,
                    song.key,
                    song.updatedAt,
                    song.songDataJSON,
                    song.determinismSeed,
                    song.customMetadata?.jsonString,
                    song.id
                ]
            )
        }
    }

    /// Delete a song by ID
    public func delete(id: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM song_data WHERE id = ?",
                arguments: [id]
            )
        }
    }

    // MARK: - Query Operations

    /// Get all songs ordered by name
    public func getAll() async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM song_data ORDER BY name"
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get recently created songs
    public func getRecentlyCreated(limit: Int = 20) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM song_data ORDER BY created_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get recently updated songs
    public func getRecentlyUpdated(limit: Int = 20) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM song_data ORDER BY updated_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Search songs by name or composer
    public func search(query: String) async throws -> [SharedSong] {
        try await db.read { database in
            let searchPattern = "%\(query)%"
            let rows = try Row.fetchAll(
                database,
                sql: """
                SELECT * FROM song_data
                WHERE name LIKE ? OR composer LIKE ?
                ORDER BY name
                """,
                arguments: [searchPattern, searchPattern]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Count total songs
    public func count() async throws -> Int {
        try await db.read { database in
            let count = try Int.fetchOne(
                database,
                sql: "SELECT COUNT(*) FROM song_data"
            )
            return count ?? 0
        }
    }

    // MARK: - Helper Methods

    /// Map database row to Song model
    private func mapRowToSong(_ row: Row) throws -> SharedSong {
        return SharedSong(
            id: row["id"],
            name: row["name"],
            composer: row["composer"],
            songDescription: row["description"],
            genre: row["genre"],
            duration: row["duration"],
            key: row["key"],
            createdAt: row["created_at"],
            updatedAt: row["updated_at"],
            songDataJSON: row["song_data_json"],
            determinismSeed: row["determinism_seed"],
            customMetadata: (row["custom_metadata"] as String?)?.jsonDictionary
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
