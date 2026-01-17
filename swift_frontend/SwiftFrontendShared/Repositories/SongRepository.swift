//
//  SongRepository.swift
//  SwiftFrontendShared
//
//  Repository pattern implementation for Song CRUD operations
//  Thread-safe actor with GRDB integration
//

import Foundation
import GRDB

/// Repository for Song CRUD operations
public actor SongRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create a new song in the database
    public func create(_ song: SharedSong) async throws {
        try await db.write { database in
            let trackConfigsJSON = try JSONEncoder().encode(song.trackConfigs)
            let sectionsJSON = try JSONEncoder().encode(song.sections)
            let rolesJSON = try JSONEncoder().encode(song.roles)

            try database.execute(
                sql: """
                INSERT INTO songs (
                    id, name, tempo, time_signature_numerator, time_signature_denominator,
                    composer, genre, mood, difficulty, rating,
                    sections_json, roles_json, mix_graph_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                arguments: [
                    song.id,
                    song.name,
                    song.tempo,
                    song.timeSignature.numerator,
                    song.timeSignature.denominator,
                    song.metadata.composer,
                    song.metadata.genre,
                    song.metadata.mood,
                    song.metadata.difficulty,
                    song.metadata.rating,
                    String(data: sectionsJSON, encoding: .utf8),
                    String(data: rolesJSON, encoding: .utf8),
                    String(data: trackConfigsJSON, encoding: .utf8)
                ]
            )
        }
    }

    /// Read a song by ID
    public func read(id: String) async throws -> SharedSong? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM songs WHERE id = ?",
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
            let trackConfigsJSON = try JSONEncoder().encode(song.trackConfigs)
            let sectionsJSON = try JSONEncoder().encode(song.sections)
            let rolesJSON = try JSONEncoder().encode(song.roles)

            try database.execute(
                sql: """
                UPDATE songs SET
                    name = ?, tempo = ?, time_signature_numerator = ?, time_signature_denominator = ?,
                    composer = ?, genre = ?, mood = ?, difficulty = ?, rating = ?,
                    sections_json = ?, roles_json = ?, mix_graph_json = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                arguments: [
                    song.name,
                    song.tempo,
                    song.timeSignature.numerator,
                    song.timeSignature.denominator,
                    song.metadata.composer,
                    song.metadata.genre,
                    song.metadata.mood,
                    song.metadata.difficulty,
                    song.metadata.rating,
                    String(data: sectionsJSON, encoding: .utf8),
                    String(data: rolesJSON, encoding: .utf8),
                    String(data: trackConfigsJSON, encoding: .utf8),
                    song.id
                ]
            )
        }
    }

    /// Delete a song by ID
    public func delete(id: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM songs WHERE id = ?",
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
                sql: "SELECT * FROM songs ORDER BY name"
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Search songs by name, composer, genre, or mood
    public func search(query: String) async throws -> [SharedSong] {
        try await db.read { database in
            let searchPattern = "%\(query)%"
            let rows = try Row.fetchAll(
                database,
                sql: """
                SELECT * FROM songs
                WHERE name LIKE ?
                   OR composer LIKE ?
                   OR genre LIKE ?
                   OR mood LIKE ?
                ORDER BY name
                """,
                arguments: [searchPattern, searchPattern, searchPattern, searchPattern]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get songs by genre
    public func getByGenre(_ genre: String) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM songs WHERE genre = ? ORDER BY name",
                arguments: [genre]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get songs by composer
    public func getByComposer(_ composer: String) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM songs WHERE composer = ? ORDER BY name",
                arguments: [composer]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get recently created songs
    public func getRecentlyCreated(limit: Int = 20) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM songs ORDER BY created_at DESC LIMIT ?",
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
                sql: "SELECT * FROM songs ORDER BY updated_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get songs within a tempo range
    public func getByTempoRange(min: Double, max: Double) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM songs WHERE tempo BETWEEN ? AND ? ORDER BY tempo",
                arguments: [min, max]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    /// Get songs by difficulty
    public func getByDifficulty(_ difficulty: String) async throws -> [SharedSong] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM songs WHERE difficulty = ? ORDER BY name",
                arguments: [difficulty]
            )
            return try rows.map { try mapRowToSong($0) }
        }
    }

    // MARK: - Helper Methods

    /// Map database row to Song model
    private func mapRowToSong(_ row: Row) throws -> SharedSong {
        let id: String = row["id"]
        let name: String = row["name"]
        let tempo: Double = row["tempo"]

        // Decode JSON columns
        let sectionsJSON: String = row["sections_json"]
        let rolesJSON: String = row["roles_json"]
        let trackConfigsJSON: String = row["mix_graph_json"]

        let sections = try JSONDecoder().decode([SharedSection].self, from: sectionsJSON.data(using: .utf8)!)
        let roles = try JSONDecoder().decode([SharedRole].self, from: rolesJSON.data(using: .utf8)!)
        let trackConfigs = try JSONDecoder().decode([SharedTrackConfig].self, from: trackConfigsJSON.data(using: .utf8)!)

        // Build metadata
        let metadata = SharedSongMetadata(
            name: name,
            tempo: tempo,
            timeSignature: SharedTimeSignature(
                numerator: row["time_signature_numerator"],
                denominator: row["time_signature_denominator"]
            ),
            composer: row["composer"],
            genre: row["genre"],
            mood: row["mood"],
            difficulty: row["difficulty"],
            rating: row["rating"]
        )

        return SharedSong(
            id: id,
            metadata: metadata,
            trackConfigs: trackConfigs,
            sections: sections,
            roles: roles
        )
    }
}

// MARK: - Supporting Types

// NOTE: These types are now defined in Song.swift as SharedSong, SongMetadata, etc.
// The repository now uses the types from Models/Song.swift to avoid duplication
