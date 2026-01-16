//
//  SongOrderPersistence.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Song Order Persistence Manager
// =============================================================================

/**
 Persistence layer for SongOrderContract

 Handles saving and loading SongOrderContract instances to/from disk.
 Uses UserDefaults for simple persistence with JSON encoding.

 TODO: Future versions should use:
 - CloudKit for cloud sync
 - CoreData for complex queries
 - File system for large datasets
 */
public actor SongOrderPersistence {

    // MARK: - Singleton

    public static let shared = SongOrderPersistence()

    // MARK: - Keys

    private let contractsKey = "song_order_contracts"

    // MARK: - Initialization

    private init() {}

    // MARK: - Public API

    /**
     Save a contract to persistence

     - Parameter contract: The contract to save
     - Throws: PersistenceError if save fails
     */
    public func save(_ contract: SongOrderContract) async throws {
        var contracts = try await loadAll()

        // Update existing or add new
        if let index = contracts.firstIndex(where: { $0.id == contract.id }) {
            contracts[index] = contract
        } else {
            contracts.append(contract)
        }

        let data = try JSONEncoder().encode(contracts)
        UserDefaults.standard.set(data, forKey: contractsKey)
    }

    /**
     Load a specific contract by ID

     - Parameter id: Contract ID to load
     - Returns: The contract if found
     - Throws: PersistenceError if not found or load fails
     */
    public func load(id: String) async throws -> SongOrderContract {
        let contracts = try await loadAll()

        guard let contract = contracts.first(where: { $0.id == id }) else {
            throw PersistenceError.notFound(id)
        }

        return contract
    }

    /**
     Load all saved contracts

     - Returns: Array of all saved contracts
     - Throws: PersistenceError if load fails
     */
    public func loadAll() async throws -> [SongOrderContract] {
        guard let data = UserDefaults.standard.data(forKey: contractsKey) else {
            return []
        }

        return try JSONDecoder().decode([SongOrderContract].self, from: data)
    }

    /**
     Delete a contract

     - Parameter id: Contract ID to delete
     - Throws: PersistenceError if delete fails
     */
    public func delete(id: String) async throws {
        var contracts = try await loadAll()

        contracts.removeAll { $0.id == id }

        let data = try JSONEncoder().encode(contracts)
        UserDefaults.standard.set(data, forKey: contractsKey)
    }

    /**
     Delete all contracts

     - Throws: PersistenceError if delete fails
     */
    public func deleteAll() async throws {
        UserDefaults.standard.removeObject(forKey: contractsKey)
    }
}

// =============================================================================
// MARK: - Persistence Error
// =============================================================================

/**
 Errors that can occur during persistence operations
 */
public enum PersistenceError: LocalizedError {
    case notFound(String)
    case saveFailed(Error)
    case loadFailed(Error)
    case deleteFailed(Error)
    case encodingFailed
    case decodingFailed(Error)

    public var errorDescription: String? {
        switch self {
        case .notFound(let id):
            return "Contract not found: \(id)"
        case .saveFailed(let error):
            return "Failed to save: \(error.localizedDescription)"
        case .loadFailed(let error):
            return "Failed to load: \(error.localizedDescription)"
        case .deleteFailed(let error):
            return "Failed to delete: \(error.localizedDescription)"
        case .encodingFailed:
            return "Failed to encode contract data"
        case .decodingFailed(let error):
            return "Failed to decode contract data: \(error.localizedDescription)"
        }
    }
}
