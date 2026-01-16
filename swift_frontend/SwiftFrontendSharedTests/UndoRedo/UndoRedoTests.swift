//
//  UndoRedoTests.swift
//  SwiftFrontendSharedTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendShared

// =============================================================================
// MARK: - Test Commands
// =============================================================================

/**
 Simple test command that increments a counter
 */
struct CounterIncrementCommand: Command {
    let description: String
    var counter: Int

    init(counter: inout Int) {
        self.description = "Increment counter"
        self.counter = counter
    }

    @discardableResult
    func execute() throws -> Bool {
        counter += 1
        return true
    }

    @discardableResult
    func undo() throws -> Bool {
        counter -= 1
        return true
    }
}

/**
 Test command that can fail
 */
struct FailingCommand: Command {
    let description: String = "Failing command"
    let shouldFail: Bool

    @discardableResult
    func execute() throws -> Bool {
        if shouldFail {
            throw CommandError.executionFailed("Command failed as expected")
        }
        return true
    }

    @discardableResult
    func undo() throws -> Bool {
        throw CommandError.undoFailed("Cannot undo failed command")
    }

    var canUndo: Bool { false }
}

/**
 Test command for string edits
 */
struct StringEditCommand: Command {
    let description: String
    let getValue: () -> String
    let setValue: (String) -> Void
    let newValue: String
    let oldValue: String

    init(
        description: String,
        getValue: @escaping () -> String,
        setValue: @escaping (String) -> Void,
        newValue: String
    ) {
        self.description = description
        self.getValue = getValue
        self.setValue = setValue
        self.newValue = newValue
        self.oldValue = getValue()
    }

    @discardableResult
    func execute() throws -> Bool {
        setValue(newValue)
        return true
    }

    @discardableResult
    func undo() throws -> Bool {
        setValue(oldValue)
        return true
    }
}

// =============================================================================
// MARK: - Command History Tests
// =============================================================================

@available(macOS 12.0, iOS 15.0, *)
final class CommandHistoryTests: XCTestCase {

    var history: CommandHistory!

    override func setUp() {
        super.setUp()
        history = CommandHistory(maxSize: 100)
    }

    override func tearDown() {
        history = nil
        super.tearDown()
    }

    // MARK: - Basic Tests

    func testExecuteCommand() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        XCTAssertTrue(try history.execute(command))
        XCTAssertEqual(counter, 1)
        XCTAssertTrue(history.canUndo)
        XCTAssertFalse(history.canRedo)
    }

    func testUndoCommand() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        try history.execute(command)
        XCTAssertEqual(counter, 1)

        let description = try history.undo()
        XCTAssertEqual(description, "Increment counter")
        XCTAssertEqual(counter, 0)
        XCTAssertFalse(history.canUndo)
        XCTAssertTrue(history.canRedo)
    }

    func testRedoCommand() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        try history.execute(command)
        try history.undo()
        XCTAssertEqual(counter, 0)

        let description = try history.redo()
        XCTAssertEqual(description, "Increment counter")
        XCTAssertEqual(counter, 1)
        XCTAssertTrue(history.canUndo)
        XCTAssertFalse(history.canRedo)
    }

    func testMultipleUndoRedo() throws {
        var counter = 0
        let command1 = CounterIncrementCommand(counter: &counter)
        let command2 = CounterIncrementCommand(counter: &counter)

        try history.execute(command1)
        try history.execute(command2)
        XCTAssertEqual(counter, 2)

        try history.undo()
        XCTAssertEqual(counter, 1)

        try history.undo()
        XCTAssertEqual(counter, 0)

        try history.redo()
        XCTAssertEqual(counter, 1)

        try history.redo()
        XCTAssertEqual(counter, 2)
    }

    func testClearHistory() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        try history.execute(command)
        XCTAssertTrue(history.canUndo)

        history.clear()
        XCTAssertFalse(history.canUndo)
        XCTAssertFalse(history.canRedo)
        XCTAssertEqual(history.undoCount, 0)
        XCTAssertEqual(history.redoCount, 0)
    }

    // MARK: - Error Handling Tests

    func testUndoWhenEmpty() {
        XCTAssertThrowsError(try history.undo()) { error in
            XCTAssertTrue(error is CommandError)
        }
    }

    func testRedoWhenEmpty() {
        XCTAssertThrowsError(try history.redo()) { error in
            XCTAssertTrue(error is CommandError)
        }
    }

    func testExecuteFailingCommand() {
        let command = FailingCommand(shouldFail: true)

        XCTAssertThrowsError(try history.execute(command)) { error in
            XCTAssertEqual(error as? CommandError, .executionFailed("Command failed as expected"))
        }

        XCTAssertFalse(history.canUndo)
    }

    // MARK: - Save Point Tests

    func testSavePointTracking() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        // Mark save point
        history.markSavePoint()
        XCTAssertFalse(history.hasUnsavedChanges)

        // Execute command
        try history.execute(command)
        XCTAssertTrue(history.hasUnsavedChanges)

        // Undo command
        try history.undo()
        XCTAssertFalse(history.hasUnsavedChanges)
    }

    // MARK: - Stack Size Tests

    func testMaxSizeEnforcement() throws {
        let smallHistory = CommandHistory(maxSize: 3)
        var counter = 0

        // Execute 5 commands
        for i in 0..<5 {
            var localCounter = i
            let command = CounterIncrementCommand(counter: &localCounter)
            try smallHistory.execute(command)
        }

        // Only 3 should be in undo stack
        XCTAssertEqual(smallHistory.undoCount, 3)
    }

    // MARK: - Redo Stack Clearing Tests

    func testRedoClearedOnNewCommand() throws {
        var counter = 0
        let command1 = CounterIncrementCommand(counter: &counter)
        let command2 = CounterIncrementCommand(counter: &counter)

        try history.execute(command1)
        try history.undo()

        XCTAssertTrue(history.canRedo)
        XCTAssertEqual(history.redoCount, 1)

        // Execute new command clears redo stack
        try history.execute(command2)

        XCTAssertFalse(history.canRedo)
        XCTAssertEqual(history.redoCount, 0)
    }

    // MARK: - Descriptions Tests

    func testCommandDescriptions() throws {
        var counter = 0
        let command = CounterIncrementCommand(counter: &counter)

        try history.execute(command)
        XCTAssertEqual(history.undoDescription, "Increment counter")
        XCTAssertNil(history.redoDescription)

        try history.undo()
        XCTAssertNil(history.undoDescription)
        XCTAssertEqual(history.redoDescription, "Increment counter")
    }
}

// =============================================================================
// MARK: - Macro Command Tests
// =============================================================================

@available(macOS 12.0, iOS 15.0, *)
final class MacroCommandTests: XCTestCase {

    func testMacroCommandExecutesAll() throws {
        var counter1 = 0
        var counter2 = 0

        let command1 = CounterIncrementCommand(counter: &counter1)
        let command2 = CounterIncrementCommand(counter: &counter2)
        let macro = MacroCommand(description: "Increment both", commands: [command1, command2])

        let history = CommandHistory()
        try history.execute(macro)

        XCTAssertEqual(counter1, 1)
        XCTAssertEqual(counter2, 1)
    }

    func testMacroCommandUndoesAll() throws {
        var counter1 = 0
        var counter2 = 0

        let command1 = CounterIncrementCommand(counter: &counter1)
        let command2 = CounterIncrementCommand(counter: &counter2)
        let macro = MacroCommand(description: "Increment both", commands: [command1, command2])

        let history = CommandHistory()
        try history.execute(macro)
        XCTAssertEqual(counter1, 1)
        XCTAssertEqual(counter2, 1)

        try history.undo()
        XCTAssertEqual(counter1, 0)
        XCTAssertEqual(counter2, 0)
    }

    func testMacroCommandRollbackOnFailure() throws {
        var counter1 = 0
        var counter2 = 0

        let command1 = CounterIncrementCommand(counter: &counter1)
        let command2 = FailingCommand(shouldFail: true)
        let macro = MacroCommand(description: "Failing macro", commands: [command1, command2])

        let history = CommandHistory()

        XCTAssertThrowsError(try history.execute(macro)) { error in
            XCTAssertEqual(error as? CommandError, .executionFailed("Macro command failed at: Failing command"))
        }

        // First command should be rolled back
        XCTAssertEqual(counter1, 0)
        XCTAssertFalse(history.canUndo)
    }
}

// =============================================================================
// MARK: - Timeline Edit Command Tests
// =============================================================================

@available(macOS 12.0, iOS 15.0, *)
final class TimelineEditCommandTests: XCTestCase {

    func testStringEditCommand() throws {
        var text = "Hello"

        let command = StringEditCommand(
            description: "Change text",
            getValue: { text },
            setValue: { text = $0 },
            newValue: "World"
        )

        let history = CommandHistory()
        try history.execute(command)

        XCTAssertEqual(text, "World")

        try history.undo()
        XCTAssertEqual(text, "Hello")
    }

    func testIntEditCommand() throws {
        var value = 10

        let command = TimelineEditCommand(
            description: "Change value",
            getValue: { value },
            setValue: { value = $0 },
            newValue: 20
        )

        let history = CommandHistory()
        try history.execute(command)

        XCTAssertEqual(value, 20)

        try history.undo()
        XCTAssertEqual(value, 10)
    }

    func testArrayEditCommandInsert() throws {
        var array = [1, 2, 3]

        let command = TimelineArrayEditCommand(
            description: "Insert item",
            getArray: { array },
            setArray: { array = $0 },
            operation: .insert(1, 99)
        )

        let history = CommandHistory()
        try history.execute(command)

        XCTAssertEqual(array, [1, 99, 2, 3])

        try history.undo()
        XCTAssertEqual(array, [1, 2, 3])
    }

    func testArrayEditCommandRemove() throws {
        var array = [1, 2, 3]

        let command = TimelineArrayEditCommand(
            description: "Remove item",
            getArray: { array },
            setArray: { array = $0 },
            operation: .remove(1)
        )

        let history = CommandHistory()
        try history.execute(command)

        XCTAssertEqual(array, [1, 3])
    }

    func testArrayEditCommandMove() throws {
        var array = [1, 2, 3, 4]

        let command = TimelineArrayEditCommand(
            description: "Move item",
            getArray: { array },
            setArray: { array = $0 },
            operation: .move(0, 2)
        )

        let history = CommandHistory()
        try history.execute(command)

        XCTAssertEqual(array, [2, 3, 1, 4])

        try history.undo()
        XCTAssertEqual(array, [1, 2, 3, 4])
    }
}

// =============================================================================
// MARK: - Performance Tests
// =============================================================================

@available(macOS 12.0, iOS 15.0, *)
final class UndoRedoPerformanceTests: XCTestCase {

    func testUndoRedoPerformance() throws {
        var counter = 0
        let history = CommandHistory()

        // Measure execute performance
        measure {
            for _ in 0..<100 {
                var localCounter = counter
                let command = CounterIncrementCommand(counter: &localCounter)
                _ = try? history.execute(command)
            }
        }

        // Measure undo performance
        measure {
            for _ in 0..<100 {
                _ = try? history.undo()
            }
        }
    }

    func testLargeHistoryPerformance() throws {
        let history = CommandHistory(maxSize: 1000)

        measure {
            for i in 0..<1000 {
                var counter = i
                let command = CounterIncrementCommand(counter: &counter)
                _ = try? history.execute(command)
            }
        }
    }
}
