//
//  CommandHistory.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import Combine

// =============================================================================
// MARK: - Command History Manager
// =============================================================================

/**
 Manages undo/redo history for commands.

 Thread-safe command history with:
 - Unlimited or limited stack size
 - Current position tracking
 - Dirty state tracking (unsaved changes)
 - Save point integration
 */
@available(iOS 15.0, macOS 12.0, *)
public final class CommandHistory: ObservableObject, Sendable {

    // MARK: - Published Properties

    /**
     Can undo current state
     */
    @Published public private(set) var canUndo: Bool = false

    /**
     Can redo current state
     */
    @Published public private(set) var canRedo: Bool = false

    /**
     Description of next undo action
     */
    @Published public private(set) var undoDescription: String?

    /**
     Description of next redo action
     */
    @Published public private(set) var redoDescription: String?

    // MARK: - Private Properties

    /**
     Undo stack (commands that can be undone)
     */
    private var undoStack: [any Command] = []

    /**
     Redo stack (commands that can be redone)
     */
    private var redoStack: [any Command] = []

    /**
     Maximum history size (nil = unlimited)
     */
    private let maxSize: Int?

    /**
     Save point index (for dirty tracking)
     */
    private var savePointIndex: Int?

    /**
     Serial queue for thread safety
     */
    private let queue = DispatchQueue(label: "com.whiteroom.commandhistory", attributes: .concurrent)

    // MARK: - Initialization

    /**
     Initialize command history
     - Parameter maxSize: Maximum history size (nil = unlimited, default: 100)
     */
    public init(maxSize: Int? = 100) {
        self.maxSize = maxSize
        updatePublishers()
    }

    // MARK: - Public Methods

    /**
     Execute and track a command
     - Parameter command: Command to execute
     - Returns: Success flag
     - Throws: CommandError if execution fails
     */
    @discardableResult
    public func execute(_ command: any Command) throws -> Bool {
        var success = false
        var error: Error?

        queue.sync(flags: .barrier) {
            do {
                // Execute the command
                try command.execute()

                // Add to undo stack
                undoStack.append(command)

                // Clear redo stack (new branch of history)
                redoStack.removeAll()

                // Trim stack if needed
                trimStack()

                // Update state
                updatePublishers()

                success = true
            } catch let err {
                error = err
            }
        }

        if let error = error {
            throw error
        }

        return success
    }

    /**
     Undo last command
     - Returns: Description of undone command
     - Throws: CommandError if undo fails
     */
    @discardableResult
    public func undo() throws -> String {
        var description = ""

        try queue.sync(flags: .barrier) {
            guard let command = undoStack.last else {
                throw CommandError.notUndoable
            }

            guard command.canUndo else {
                throw CommandError.notUndoable
            }

            // Undo the command
            try command.undo()

            // Move from undo to redo stack
            undoStack.removeLast()
            redoStack.append(command)

            // Update state
            updatePublishers()

            description = command.description
        }

        return description
    }

    /**
     Redo last undone command
     - Returns: Description of redone command
     - Throws: CommandError if redo fails
     */
    @discardableResult
    public func redo() throws -> String {
        var description = ""

        try queue.sync(flags: .barrier) {
            guard let command = redoStack.last else {
                throw CommandError.notRedoable
            }

            guard command.canRedo else {
                throw CommandError.notRedoable
            }

            // Execute the command
            try command.execute()

            // Move from redo to undo stack
            redoStack.removeLast()
            undoStack.append(command)

            // Trim stack if needed
            trimStack()

            // Update state
            updatePublishers()

            description = command.description
        }

        return description
    }

    /**
     Clear all history
     */
    public func clear() {
        queue.sync(flags: .barrier) {
            undoStack.removeAll()
            redoStack.removeAll()
            savePointIndex = nil
            updatePublishers()
        }
    }

    /**
     Mark current state as save point
     (for tracking unsaved changes)
     */
    public func markSavePoint() {
        queue.sync(flags: .barrier) {
            savePointIndex = undoStack.count
        }
    }

    /**
     Check if there are unsaved changes
     - Returns: True if current state differs from save point
     */
    public var hasUnsavedChanges: Bool {
        queue.sync {
            guard let savePoint = savePointIndex else {
                return undoStack.isEmpty ? false : true
            }
            return savePoint != undoStack.count
        }
    }

    /**
     Get undo stack count
     */
    public var undoCount: Int {
        queue.sync { undoStack.count }
    }

    /**
     Get redo stack count
     */
    public var redoCount: Int {
        queue.sync { redoStack.count }
    }

    /**
     Get descriptions of all undoable commands
     - Returns: Array of command descriptions (oldest to newest)
     */
    public func undoDescriptions() -> [String] {
        queue.sync { undoStack.map { $0.description } }
    }

    /**
     Get descriptions of all redoable commands
     - Returns: Array of command descriptions (newest to oldest)
     */
    public func redoDescriptions() -> [String] {
        queue.sync { redoStack.reversed().map { $0.description } }
    }

    // MARK: - Private Methods

    /**
     Trim undo stack to max size
     */
    private func trimStack() {
        guard let maxSize = maxSize else { return }

        let excess = undoStack.count - maxSize
        if excess > 0 {
            undoStack.removeFirst(excess)

            // Adjust save point if needed
            if let savePoint = savePointIndex, savePoint <= excess {
                savePointIndex = nil
            } else if let savePoint = savePointIndex {
                savePointIndex = savePoint - excess
            }
        }
    }

    /**
     Update @Published properties
     */
    private func updatePublishers() {
        DispatchQueue.main.async {
            self.canUndo = !self.undoStack.isEmpty
            self.canRedo = !self.redoStack.isEmpty
            self.undoDescription = self.undoStack.last?.description
            self.redoDescription = self.redoStack.last?.description
        }
    }
}

// =============================================================================
// MARK: - Command History Extensions
// =============================================================================

public extension CommandHistory {

    /**
     Execute multiple commands as a single macro command
     - Parameter commands: Commands to execute atomically
     - Parameter description: Description of macro operation
     - Returns: Success flag
     - Throws: CommandError if any command fails
     */
    @discardableResult
    func executeMacro(description: String, commands: [any Command]) throws -> Bool {
        let macro = MacroCommand(description: description, commands: commands)
        return try execute(macro)
    }
}
