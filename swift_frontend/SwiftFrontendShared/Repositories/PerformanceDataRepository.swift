//
//  PerformanceDataRepository.swift
//  SwiftFrontendShared
//
//  Repository for Performance data persistence
//

import Foundation
import GRDB

/// Repository for Performance data persistence
public actor PerformanceDataRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create a new performance
    public func create(_ performance: Performance) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                INSERT INTO performance_data (
                    id, name, song_id, description, duration,
                    performance_data_json, created_at, updated_at,
                    is_favorite, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                arguments: [
                    performance.id,
                    performance.name,
                    performance.songId,
                    performance.performanceDescription,
                    performance.duration,
                    performance.performanceDataJSON,
                    performance.createdAt,
                    performance.updatedAt,
                    performance.isFavorite,
                    performance.tags.jsonString
                ]
            )
        }
    }

    /// Read a performance by ID
    public func read(id: String) async throws -> Performance? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM performance_data WHERE id = ?",
                arguments: [id]
            ) {
                return try mapRowToPerformance(row)
            }
            return nil
        }
    }

    /// Update an existing performance
    public func update(_ performance: Performance) async throws {
        try await db.write { database in
            try database.execute(
                sql: """
                UPDATE performance_data SET
                    name = ?, song_id = ?, description = ?, duration = ?,
                    performance_data_json = ?, updated_at = ?,
                    is_favorite = ?, tags = ?
                WHERE id = ?
                """,
                arguments: [
                    performance.name,
                    performance.songId,
                    performance.performanceDescription,
                    performance.duration,
                    performance.performanceDataJSON,
                    performance.updatedAt,
                    performance.isFavorite,
                    performance.tags.jsonString,
                    performance.id
                ]
            )
        }
    }

    /// Delete a performance by ID
    public func delete(id: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM performance_data WHERE id = ?",
                arguments: [id]
            )
        }
    }

    // MARK: - Query Operations

    /// Get all performances ordered by name
    public func getAll() async throws -> [Performance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performance_data ORDER BY name"
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get performances by song ID
    public func getBySongId(_ songId: String) async throws -> [Performance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performance_data WHERE song_id = ? ORDER BY created_at DESC",
                arguments: [songId]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get favorite performances
    public func getFavorites() async throws -> [Performance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performance_data WHERE is_favorite = 1 ORDER BY name"
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get recently created performances
    public func getRecentlyCreated(limit: Int = 20) async throws -> [Performance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performance_data ORDER BY created_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Search performances by name
    public func search(query: String) async throws -> [Performance] {
        try await db.read { database in
            let searchPattern = "%\(query)%"
            let rows = try Row.fetchAll(
                database,
                sql: """
                SELECT * FROM performance_data
                WHERE name LIKE ?
                ORDER BY name
                """,
                arguments: [searchPattern]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Count total performances
    public func count() async throws -> Int {
        try await db.read { database in
            let count = try Int.fetchOne(
                database,
                sql: "SELECT COUNT(*) FROM performance_data"
            )
            return count ?? 0
        }
    }

    // MARK: - Helper Methods

    /// Map database row to Performance model
    private func mapRowToPerformance(_ row: Row) throws -> Performance {
        return Performance(
            id: row["id"],
            name: row["name"],
            songId: row["song_id"],
            performanceDescription: row["description"],
            duration: row["duration"],
            performanceDataJSON: row["performance_data_json"],
            createdAt: row["created_at"],
            updatedAt: row["updated_at"],
            isFavorite: row["is_favorite"],
            tags: (row["tags"] as String?)?.jsonArray ?? []
        )
    }
}

// MARK: - Helper Extensions

extension Array where Element == String {
    var jsonString: String? {
        guard let data = try? JSONEncoder().encode(self) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

extension String {
    var jsonArray: [String]? {
        guard let data = data(using: .utf8),
              let array = try? JSONDecoder().decode([String].self, from: data) else { return nil }
        return array
    }
}
