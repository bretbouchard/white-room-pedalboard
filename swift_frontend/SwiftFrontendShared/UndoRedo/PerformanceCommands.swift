//
//  PerformanceCommands.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Performance Edit Command
// =============================================================================

/**
 Command for editing performance properties.

 Provides undo/redo for performance changes:
 - Name, description, tags
 - Active status
 - Parameters
 - Projection assignments
 */
public struct PerformanceEditCommand: Command {

    /// Human-readable description
    public let description: String

    /// Performance reference
    private let getPerformance: () -> Performance
    private let setPerformance: (Performance) -> Void

    /// Edit operation
    public enum PerformanceEdit {
        case name(String)
        case description(String?)
        case tags([String])
        case active(Bool)
        case parameter(String, CodableAny)
        case projection(String, Projection?)
    }

    /// The edit operation
    private let edit: PerformanceEdit

    /// Old performance state (for undo)
    private let oldPerformance: Performance

    /**
     Initialize performance edit command
     - Parameter description: What this edit does
     - Parameter getPerformance: Closure to retrieve current performance
     - Parameter setPerformance: Closure to set modified performance
     - Parameter edit: Performance edit operation
     */
    public init(
        description: String,
        getPerformance: @escaping () -> Performance,
        setPerformance: @escaping (Performance) -> Void,
        edit: PerformanceEdit
    ) {
        self.description = description
        self.getPerformance = getPerformance
        self.setPerformance = setPerformance
        self.edit = edit
        self.oldPerformance = getPerformance()
    }

    /**
     Execute the performance edit
     - Returns: True if successful
     */
    @discardableResult
    public func execute() throws -> Bool {
        var performance = getPerformance()

        switch edit {
        case .name(let name):
            performance.name = name
        case .description(let description):
            performance.description = description
        case .tags(let tags):
            performance.tags = tags
        case .active(let active):
            performance.active = active
        case .parameter(let key, let value):
            performance.parameters[key] = value
        case .projection(let roleId, let projection):
            if let projection = projection {
                performance.projections[roleId] = projection
            } else {
                performance.projections.removeValue(forKey: roleId)
            }
        }

        performance.updatedAt = Date()
        setPerformance(performance)
        return true
    }

    /**
     Undo the performance edit
     - Returns: True if successful
     */
    @discardableResult
    public func undo() throws -> Bool {
        setPerformance(oldPerformance)
        return true
    }

    /// Performance edits are undoable
    public var canUndo: Bool { true }

    /// Performance edits are redoable
    public var canRedo: Bool { true }
}

// =============================================================================
// MARK: - Performance Batch Edit Command
// =============================================================================

/**
 Command for batch editing multiple performances at once.

 Useful for operations like:
 - Rename multiple performances
 - Apply tags to multiple performances
 - Activate/deactivate multiple performances
 */
public struct PerformanceBatchEditCommand: Command {

    /// Human-readable description
    public let description: String

    /// Performance references
    private let performances: [() -> Performance]
    private let setPerformances: [(Performance) -> Void]

    /// Batch edit operation
    public enum BatchEdit {
        case activate(Bool)
        case addTags([String])
        case removeTags([String])
        case setDescription(String?)
        case setParameter(String, CodableAny)
    }

    /// The batch edit operation
    private let edit: BatchEdit

    /// Old performance states (for undo)
    private let oldPerformances: [Performance]

    /**
     Initialize performance batch edit command
     - Parameter description: What this batch edit does
     - Parameter performances: Array of closures to retrieve performances
     - Parameter setPerformances: Array of closures to set performances
     - Parameter edit: Batch edit operation
     */
    public init(
        description: String,
        performances: [() -> Performance],
        setPerformances: [(Performance) -> Void],
        edit: BatchEdit
    ) {
        self.description = description
        self.performances = performances
        self.setPerformances = setPerformances
        self.edit = edit
        self.oldPerformances = performances.map { $0() }
    }

    /**
     Execute the batch performance edit
     - Returns: True if successful
     */
    @discardableResult
    public func execute() throws -> Bool {
        for (i, getPerformance) in performances.enumerated() {
            var performance = getPerformance()

            switch edit {
            case .activate(let active):
                performance.active = active
            case .addTags(let tags):
                performance.tags = Array(Set(performance.tags + tags)).sorted()
            case .removeTags(let tags):
                performance.tags = performance.tags.filter { !tags.contains($0) }
            case .setDescription(let description):
                performance.description = description
            case .setParameter(let key, let value):
                performance.parameters[key] = value
            }

            performance.updatedAt = Date()
            setPerformances[i](performance)
        }

        return true
    }

    /**
     Undo the batch performance edit
     - Returns: True if successful
     */
    @discardableResult
    public func undo() throws -> Bool {
        for (i, oldPerformance) in oldPerformances.enumerated() {
            setPerformances[i](oldPerformance)
        }

        return true
    }

    /// Batch edits are undoable
    public var canUndo: Bool { true }

    /// Batch edits are redoable
    public var canRedo: Bool { true }
}

// =============================================================================
// MARK: - Performance Reorder Command
// =============================================================================

/**
 Command for reordering performances in a song.
 */
public struct PerformanceReorderCommand: Command {

    /// Human-readable description
    public let description: String

    /// Performances array reference
    private let getPerformances: () -> [Performance]
    private let setPerformances: ([Performance]) -> Void

    /// Reordering operation
    public enum Reorder {
        case move(Int, Int)              // Move from index to index
        case swap(Int, Int)              // Swap two indices
        case reverse                     // Reverse entire array
        case shuffle                     // Random shuffle
    }

    /// The reorder operation
    private let reorder: Reorder

    /// Old array state (for undo)
    private let oldPerformances: [Performance]

    /**
     Initialize performance reorder command
     - Parameter description: What this reorder does
     - Parameter getPerformances: Closure to retrieve performances array
     - Parameter setPerformances: Closure to set modified array
     - Parameter reorder: Reorder operation
     */
    public init(
        description: String,
        getPerformances: @escaping () -> [Performance],
        setPerformances: @escaping ([Performance]) -> Void,
        reorder: Reorder
    ) {
        self.description = description
        self.getPerformances = getPerformances
        self.setPerformances = setPerformances
        self.reorder = reorder
        self.oldPerformances = getPerformances()
    }

    /**
     Execute the reorder
     - Returns: True if successful
     */
    @discardableResult
    public func execute() throws -> Bool {
        var performances = getPerformances()

        switch reorder {
        case .move(let from, let to):
            guard from >= 0 && from < performances.count,
                  to >= 0 && to <= performances.count else {
                throw CommandError.executionFailed("Move indices out of bounds")
            }
            let performance = performances.remove(at: from)
            performances.insert(performance, at: to)

        case .swap(let index1, let index2):
            guard index1 >= 0 && index1 < performances.count,
                  index2 >= 0 && index2 < performances.count else {
                throw CommandError.executionFailed("Swap indices out of bounds")
            }
            performances.swapAt(index1, index2)

        case .reverse:
            performances.reverse()

        case .shuffle:
            performances.shuffle()
        }

        setPerformances(performances)
        return true
    }

    /**
     Undo the reorder
     - Returns: True if successful
     */
    @discardableResult
    public func undo() throws -> Bool {
        setPerformances(oldPerformances)
        return true
    }

    /// Reorders are undoable
    public var canUndo: Bool { true }

    /// Reorders are redoable
    public var canRedo: Bool { true }
}
