//
//  PerformanceRepository.swift
//  SwiftFrontendShared
//
//  Repository pattern implementation for Arrangement Performance CRUD operations
//  Thread-safe actor with GRDB integration
//

import Foundation
import GRDB

/// Arrangement performance model for database storage
public struct ArrangementPerformance: Codable, Identifiable {
    public let id: String
    public let songId: String
    public let name: String
    public let arrangementStyle: ArrangementStyle
    public let density: Double
    public let instrumentation: [String: Int]
    public let mixTargets: [MixTarget]
}

/// Repository for Arrangement Performance CRUD operations
public actor PerformanceRepository {
    private let db: DatabaseQueue

    public init(db: DatabaseQueue) {
        self.db = db
    }

    // MARK: - CRUD Operations

    /// Create a new performance in the database
    public func create(_ performance: ArrangementPerformance) async throws {
        try await db.write { database in
            let instrumentationJSON = try JSONEncoder().encode(performance.instrumentation)
            let mixTargetsJSON = try JSONEncoder().encode(performance.mixTargets)

            try database.execute(
                sql: """
                INSERT INTO performances (
                    id, song_id, name, arrangement_style, density,
                    instrumentation_json, mix_targets_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                arguments: [
                    performance.id,
                    performance.songId,
                    performance.name,
                    performance.arrangementStyle.rawValue,
                    performance.density,
                    String(data: instrumentationJSON, encoding: .utf8),
                    String(data: mixTargetsJSON, encoding: .utf8)
                ]
            )
        }
    }

    /// Read a performance by ID
    public func read(id: String) async throws -> ArrangementPerformance? {
        try await db.read { database in
            if let row = try Row.fetchOne(
                database,
                sql: "SELECT * FROM performances WHERE id = ?",
                arguments: [id]
            ) {
                return try mapRowToPerformance(row)
            }
            return nil
        }
    }

    /// Update an existing performance
    public func update(_ performance: ArrangementPerformance) async throws {
        try await db.write { database in
            let instrumentationJSON = try JSONEncoder().encode(performance.instrumentation)
            let mixTargetsJSON = try JSONEncoder().encode(performance.mixTargets)

            try database.execute(
                sql: """
                UPDATE performances SET
                    song_id = ?, name = ?, arrangement_style = ?, density = ?,
                    instrumentation_json = ?, mix_targets_json = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                arguments: [
                    performance.songId,
                    performance.name,
                    performance.arrangementStyle.rawValue,
                    performance.density,
                    String(data: instrumentationJSON, encoding: .utf8),
                    String(data: mixTargetsJSON, encoding: .utf8),
                    performance.id
                ]
            )
        }
    }

    /// Delete a performance by ID
    public func delete(id: String) async throws {
        try await db.write { database in
            try database.execute(
                sql: "DELETE FROM performances WHERE id = ?",
                arguments: [id]
            )
        }
    }

    // MARK: - Query Operations

    /// Get all performances ordered by name
    public func getAll() async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances ORDER BY name"
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get all performances for a specific song
    public func getBySongId(_ songId: String) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances WHERE song_id = ? ORDER BY name",
                arguments: [songId]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get performances by arrangement style
    public func getByArrangementStyle(_ style: ArrangementStyle) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances WHERE arrangement_style = ? ORDER BY name",
                arguments: [style.rawValue]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get performances with specific instrumentation
    public func getByInstrumentation(_ instrumentationMap: [String: Int]) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            // Search for performances that contain the specified instruments
            let allPerformances = try getAll()

            return allPerformances.filter { performance in
                for (instrument, count) in instrumentationMap {
                    if let performanceCount = performance.instrumentation[instrument] {
                        if performanceCount >= count {
                            return true
                        }
                    }
                }
                return false
            }
        }
    }

    /// Get most played performances (by update count or last played)
    public func getMostPlayed(limit: Int = 20) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances ORDER BY updated_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get recently created performances
    public func getRecentlyCreated(limit: Int = 20) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances ORDER BY created_at DESC LIMIT ?",
                arguments: [limit]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Get performances within a density range
    public func getByDensityRange(min: Double, max: Double) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances WHERE density BETWEEN ? AND ? ORDER BY density",
                arguments: [min, max]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    /// Search performances by name
    public func search(query: String) async throws -> [ArrangementPerformance] {
        try await db.read { database in
            let searchPattern = "%\(query)%"
            let rows = try Row.fetchAll(
                database,
                sql: "SELECT * FROM performances WHERE name LIKE ? ORDER BY name",
                arguments: [searchPattern]
            )
            return try rows.map { try mapRowToPerformance($0) }
        }
    }

    // MARK: - Helper Methods

    /// Map database row to ArrangementPerformance model
    private func mapRowToPerformance(_ row: Row) throws -> ArrangementPerformance {
        let id: String = row["id"]
        let songId: String = row["song_id"]
        let name: String = row["name"]
        let arrangementStyleString: String = row["arrangement_style"]
        let density: Double = row["density"]

        // Decode arrangement style
        guard let arrangementStyle = ArrangementStyle(rawValue: arrangementStyleString) else {
            throw RepositoryError.invalidData("Invalid arrangement style: \(arrangementStyleString)")
        }

        // Decode JSON columns
        let instrumentationJSON: String = row["instrumentation_json"]
        let mixTargetsJSON: String = row["mix_targets_json"]

        let instrumentation = try JSONDecoder().decode([String: Int].self, from: instrumentationJSON.data(using: .utf8)!)
        let mixTargets = try JSONDecoder().decode([MixTarget].self, from: mixTargetsJSON.data(using: .utf8)!)

        return ArrangementPerformance(
            id: id,
            songId: songId,
            name: name,
            arrangementStyle: arrangementStyle,
            density: density,
            instrumentation: instrumentation,
            mixTargets: mixTargets
        )
    }
}

// MARK: - Supporting Types

/// Arrangement style enum
public enum ArrangementStyle: String, Codable {
    case soloPiano = "SOLO_PIANO"
    case satb = "SATB"
    case chamberEnsemble = "CHAMBER_ENSEMBLE"
    case jazzCombo = "JAZZ_COMBO"
    case rockBand = "ROCK_BAND"
    case electronic = "ELECTRONIC"
    case orchestral = "ORCHESTRAL"
    case ambient = "AMBIENT"
    case minimal = "MINIMAL"
    case experimental = "EXPERIMENTAL"
    case custom = "CUSTOM"
    case fullEnsemble = "FULL_ENSEMBLE"
}

/// Mix target for audio routing
public struct MixTarget: Codable, Identifiable {
    public let id: String
    public let roleId: String
    public let targetName: String
    public let pan: Double
    public let volume: Double
}

/// Repository error types
public enum RepositoryError: Error {
    case notFound(String)
    case invalidData(String)
    case databaseError(Error)
}
