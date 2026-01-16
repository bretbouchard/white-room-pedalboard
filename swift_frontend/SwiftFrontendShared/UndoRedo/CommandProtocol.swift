//
//  CommandProtocol.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Command Protocol
// =============================================================================

/**
 Base protocol for undoable commands.

 Command pattern implementation for reversible operations.
 Every command must be able to execute and undo itself.
 */
public protocol Command: Sendable {

    /// Human-readable description of what this command does
    var description: String { get }

    /**
     Execute the command
     - Returns: Success flag
     - Throws: CommandError if execution fails
     */
    @discardableResult
    func execute() throws -> Bool

    /**
     Undo the command
     - Returns: Success flag
     - Throws: CommandError if undo fails
     */
    @discardableResult
    func undo() throws -> Bool

    /**
     Check if command can be undone
     - Returns: True if undoable
     */
    var canUndo: Bool { get }

    /**
     Check if command can be redone
     - Returns: True if redoable
     */
    var canRedo: Bool { get }
}

// =============================================================================
// MARK: - Command Error
// =============================================================================

/**
 Errors that can occur during command execution/undo
 */
public enum CommandError: Error, Sendable {
    case executionFailed(String)
    case undoFailed(String)
    case invalidState(String)
    case notUndoable
    case notRedoable
}

// =============================================================================
// MARK: - Command Extensions
// =============================================================================

public extension Command {

    /// Default implementation: most commands are undoable after execution
    var canUndo: Bool { true }

    /// Default implementation: most commands are redoable after undo
    var canRedo: Bool { true }
}

// =============================================================================
// MARK: - Macro Command
// =============================================================================

/**
 Command that executes multiple commands as a single unit.

 Useful for composite operations where multiple changes should be
 undone/redone together (atomic operations).
 */
public struct MacroCommand: Command {

    /// Human-readable description
    public let description: String

    /// Commands to execute in sequence
    private let commands: [any Command]

    /**
     Initialize macro command
     - Parameter description: What this macro command does
     - Parameter commands: Commands to execute as a unit
     */
    public init(description: String, commands: [any Command]) {
        self.description = description
        self.commands = commands
    }

    /**
     Execute all commands in sequence
     - Returns: True if all commands executed successfully
     - Throws: CommandError if any command fails
     */
    @discardableResult
    public func execute() throws -> Bool {
        var succeededCommands: [any Command] = []

        for command in commands {
            do {
                try command.execute()
                succeededCommands.append(command)
            } catch {
                // Undo any succeeded commands
                for succeededCommand in succeededCommands.reversed() {
                    try? succeededCommand.undo()
                }
                throw CommandError.executionFailed(
                    "Macro command failed at: \(command.description)"
                )
            }
        }

        return true
    }

    /**
     Undo all commands in reverse order
     - Returns: True if all commands undone successfully
     - Throws: CommandError if any undo fails
     */
    @discardableResult
    public func undo() throws -> Bool {
        // Undo in reverse order
        for command in commands.reversed() {
            guard command.canUndo else {
                throw CommandError.undoFailed(
                    "Command not undoable: \(command.description)"
                )
            }

            try command.undo()
        }

        return true
    }

    /// Macro command is undoable if all subcommands are undoable
    public var canUndo: Bool {
        commands.allSatisfy { $0.canUndo }
    }

    /// Macro command is redoable if all subcommands are redoable
    public var canRedo: Bool {
        commands.allSatisfy { $0.canRedo }
    }
}

// =============================================================================
// MARK: - No-op Command
// =============================================================================

/**
 Command that does nothing.

 Useful for testing or as a placeholder.
 */
public struct NoOpCommand: Command {

    public let description: String = "No operation"

    public init() {}

    @discardableResult
    public func execute() throws -> Bool { true }

    @discardableResult
    public func undo() throws -> Bool { true }

    public var canUndo: Bool { false }

    public var canRedo: Bool { false }
}
