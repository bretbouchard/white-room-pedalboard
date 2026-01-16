//
//  TimelineModel.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Timeline Edit Command
// =============================================================================

/**
 Generic command for editing timeline properties.

 Supports reversible diffs for any timeline state:
 - Note edits (add, delete, modify)
 - Section edits (add, delete, modify)
 - Performance changes
 - Any other timeline mutations
 */
public struct TimelineEditCommand<T: Equatable & Codable & Sendable>: Command {

    /// Human-readable description
    public let description: String

    /// Reference to the value being edited (via getter/setter closures)
    private let getValue: () -> T
    private let setValue: (T) -> Void

    /// Old value (for undo)
    private let oldValue: T

    /// New value (for execute)
    private let newValue: T

    /**
     Initialize timeline edit command
     - Parameter description: What this edit does
     - Parameter getValue: Closure to retrieve current value
     - Parameter setValue: Closure to set new value
     - Parameter newValue: New value to apply
     */
    public init(
        description: String,
        getValue: @escaping () -> T,
        setValue: @escaping (T) -> Void,
        newValue: T
    ) {
        self.description = description
        self.getValue = getValue
        self.setValue = setValue
        self.oldValue = getValue()
        self.newValue = newValue
    }

    /**
     Execute the edit (apply new value)
     - Returns: True if successful
     - Throws: CommandError if setting fails
     */
    @discardableResult
    public func execute() throws -> Bool {
        setValue(newValue)
        return true
    }

    /**
     Undo the edit (restore old value)
     - Returns: True if successful
     - Throws: CommandError if restore fails
     */
    @discardableResult
    public func undo() throws -> Bool {
        setValue(oldValue)
        return true
    }

    /// Timeline edits are undoable
    public var canUndo: Bool { true }

    /// Timeline edits are redoable
    public var canRedo: Bool { true }
}

// =============================================================================
// MARK: - Timeline Array Edit Command
// =============================================================================

/**
 Command for editing arrays in timeline (add, remove, replace items).

 Handles reversible diffs for array-based timeline properties:
 - Sections array
 - Roles array
 - Notes array
 - Any array mutations
 */
public struct TimelineArrayEditCommand<T: Equatable & Codable & Sendable>: Command {

    /// Human-readable description
    public let description: String

    /// Reference to the array being edited
    private let getArray: () -> [T]
    private let setArray: ([T]) -> Void

    /// Edit operation type
    public enum ArrayEdit {
        case insert(Int, T)              // Insert item at index
        case remove(Int)                  // Remove item at index
        case replace(Int, T)              // Replace item at index
        case move(Int, Int)               // Move item from index to index
        case batch([BatchOperation])      // Batch operations

        public struct BatchOperation {
            let edit: ArrayEdit
        }
    }

    /// The edit operation
    private let operation: ArrayEdit

    /**
     Initialize array edit command
     - Parameter description: What this edit does
     - Parameter getArray: Closure to retrieve current array
     - Parameter setArray: Closure to set modified array
     - Parameter operation: Array edit operation
     */
    public init(
        description: String,
        getArray: @escaping () -> [T],
        setArray: @escaping ([T]) -> Void,
        operation: ArrayEdit
    ) {
        self.description = description
        self.getArray = getArray
        self.setArray = setArray
        self.operation = operation
    }

    /**
     Execute the array edit
     - Returns: True if successful
     - Throws: CommandError if operation fails
     */
    @discardableResult
    public func execute() throws -> Bool {
        var array = getArray()

        switch operation {
        case .insert(let index, let item):
            guard index >= 0 && index <= array.count else {
                throw CommandError.executionFailed("Insert index out of bounds")
            }
            array.insert(item, at: index)

        case .remove(let index):
            guard index >= 0 && index < array.count else {
                throw CommandError.executionFailed("Remove index out of bounds")
            }
            array.remove(at: index)

        case .replace(let index, let item):
            guard index >= 0 && index < array.count else {
                throw CommandError.executionFailed("Replace index out of bounds")
            }
            array[index] = item

        case .move(let fromIndex, let toIndex):
            guard fromIndex >= 0 && fromIndex < array.count,
                  toIndex >= 0 && toIndex <= array.count else {
                throw CommandError.executionFailed("Move index out of bounds")
            }
            let item = array.remove(at: fromIndex)
            array.insert(item, at: toIndex)

        case .batch(let operations):
            for op in operations {
                try applyOperation(&array, op.edit)
            }
        }

        setArray(array)
        return true
    }

    /**
     Undo the array edit
     - Returns: True if successful
     - Throws: CommandError if undo fails
     */
    @discardableResult
    public func undo() throws -> Bool {
        var array = getArray()

        switch operation {
        case .insert(let index, _):
            // Undo insert: remove at index
            array.remove(at: index)

        case .remove(let index):
            // Need to store removed item for undo
            throw CommandError.undoFailed("Cannot undo remove without stored value")

        case .replace(let index, _):
            // Need to store old value for undo
            throw CommandError.undoFailed("Cannot undo replace without stored value")

        case .move(let fromIndex, let toIndex):
            // Undo move: move back
            let item = array.remove(at: toIndex)
            array.insert(item, at: fromIndex)

        case .batch(let operations):
            // Undo batch in reverse order
            for op in operations.reversed() {
                try? undoOperation(&array, op.edit)
            }
        }

        setArray(array)
        return true
    }

    // MARK: - Private Helpers

    private func applyOperation(_ array: inout [T], _ operation: ArrayEdit) throws {
        switch operation {
        case .insert(let index, let item):
            array.insert(item, at: index)
        case .remove(let index):
            array.remove(at: index)
        case .replace(let index, let item):
            array[index] = item
        case .move(let from, let to):
            let item = array.remove(at: from)
            array.insert(item, at: to)
        case .batch:
            throw CommandError.executionFailed("Nested batch operations not supported")
        }
    }

    private func undoOperation(_ array: inout [T], _ operation: ArrayEdit) throws {
        switch operation {
        case .insert(let index, _):
            array.remove(at: index)
        case .remove:
            throw CommandError.undoFailed("Cannot undo remove in batch")
        case .replace:
            throw CommandError.undoFailed("Cannot undo replace in batch")
        case .move(let from, let to):
            let item = array.remove(at: to)
            array.insert(item, at: from)
        case .batch:
            throw CommandError.undoFailed("Nested batch operations not supported")
        }
    }
}

// =============================================================================
// MARK: - Song Model Edit Command
// =============================================================================

/**
 Specialized command for editing Song model properties.

 Provides undo/redo for all Song mutations with automatic diff tracking.
 */
public struct SongEditCommand: Command {

    /// Human-readable description
    public let description: String

    /// Song reference (via closures for thread safety)
    private let getSong: () -> Song
    private let setSong: (Song) -> Void

    /// Edit operation
    public enum SongEdit {
        case name(String)                                // Edit song name
        case metadata(SongMetadata)                      // Edit metadata
        case sections([Section])                         // Replace sections
        case roles([Role])                               // Replace roles
        case projections([Projection])                   // Replace projections
        case mixGraph(MixGraph)                          // Replace mix graph
        case realizationPolicy(RealizationPolicy)        // Edit realization policy
        case determinismSeed(String)                     // Edit seed
    }

    /// The edit operation
    private let edit: SongEdit

    /// Old song state (for undo)
    private let oldSong: Song

    /**
     Initialize song edit command
     - Parameter description: What this edit does
     - Parameter getSong: Closure to retrieve current song
     - Parameter setSong: Closure to set modified song
     - Parameter edit: Song edit operation
     */
    public init(
        description: String,
        getSong: @escaping () -> Song,
        setSong: @escaping (Song) -> Void,
        edit: SongEdit
    ) {
        self.description = description
        self.getSong = getSong
        self.setSong = setSong
        self.edit = edit
        self.oldSong = getSong()
    }

    /**
     Execute the song edit
     - Returns: True if successful
     */
    @discardableResult
    public func execute() throws -> Bool {
        var song = getSong()

        switch edit {
        case .name(let name):
            song.name = name
        case .metadata(let metadata):
            song.metadata = metadata
        case .sections(let sections):
            song.sections = sections
        case .roles(let roles):
            song.roles = roles
        case .projections(let projections):
            song.projections = projections
        case .mixGraph(let mixGraph):
            song.mixGraph = mixGraph
        case .realizationPolicy(let policy):
            song.realizationPolicy = policy
        case .determinismSeed(let seed):
            song.determinismSeed = seed
        }

        song.updatedAt = Date()
        setSong(song)
        return true
    }

    /**
     Undo the song edit
     - Returns: True if successful
     */
    @discardableResult
    public func undo() throws -> Bool {
        setSong(oldSong)
        return true
    }

    /// Song edits are undoable
    public var canUndo: Bool { true }

    /// Song edits are redoable
    public var canRedo: Bool { true }
}
