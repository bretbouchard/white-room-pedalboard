//
//  UndoRedoIntegrationTests.swift
//  SwiftFrontendSharedTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendShared

// =============================================================================
// MARK: - Integration Tests
// =============================================================================

@available(macOS 12.0, iOS 15.0, *)
final class UndoRedoIntegrationTests: XCTestCase {

    var manager: UndoRedoManager!

    override func setUp() {
        super.setUp()
        manager = UndoRedoManager.shared
        manager.clear()
    }

    override func tearDown() {
        manager.clear()
        manager = nil
        super.tearDown()
    }

    // MARK: - Song Editing Workflow Tests

    func testSongNameEditWorkflow() throws {
        var song = createTestSong()
        let originalName = song.name

        // Edit song name
        let editCommand = SongEditCommand(
            description: "Change song name",
            getSong: { song },
            setSong: { song = $0 },
            edit: .name("New Song Name")
        )

        try manager.execute(editCommand)
        XCTAssertEqual(song.name, "New Song Name")

        // Undo
        try manager.undo()
        XCTAssertEqual(song.name, originalName)

        // Redo
        try manager.redo()
        XCTAssertEqual(song.name, "New Song Name")
    }

    func testMultipleSongEditsWorkflow() throws {
        var song = createTestSong()

        // Edit multiple properties
        let commands = [
            SongEditCommand(
                description: "Change tempo",
                getSong: { song },
                setSong: { song = $0 },
                edit: .metadata(SongMetadata(
                    tempo: 140.0,
                    timeSignature: [4, 4]
                ))
            ),
            SongEditCommand(
                description: "Change name",
                getSong: { song },
                setSong: { song = $0 },
                edit: .name("Updated Song")
            )
        ]

        try manager.executeMacro(description: "Update song metadata", commands: commands)

        XCTAssertEqual(song.metadata.tempo, 140.0)
        XCTAssertEqual(song.name, "Updated Song")

        // Undo all at once
        try manager.undo()
        XCTAssertEqual(song.metadata.tempo, 120.0)
        XCTAssertEqual(song.name, "Test Song")
    }

    // MARK: - Performance Editing Workflow Tests

    func testPerformanceBatchEditWorkflow() throws {
        var performances = createTestPerformances()
        let getters = performances.map { { $0 } }
        var mutablePerformances = performances
        let setters = (0..<performances.count).map { { (index: Int) -> (TestPerformance) -> Void in
            return { newPerformance in
                mutablePerformances[index] = newPerformance
            }
        }
        let zipSetters = zip(0..<performances.count, setters).map { pair in
            return { (perf: TestPerformance) in
                let (index, setter) = pair
                var newPerformances = mutablePerformances
                newPerformances[index] = perf
                mutablePerformances = newPerformances
            }
        }

        // Batch activate all performances
        let batchCommand = PerformanceBatchEditCommand(
            description: "Activate all performances",
            performances: getters,
            setPerformances: zipSetters,
            edit: .activate(true)
        )

        try manager.execute(batchCommand)

        for performance in mutablePerformances {
            XCTAssertTrue(performance.active)
        }

        // Undo
        try manager.undo()

        for performance in mutablePerformances {
            XCTAssertFalse(performance.active)
        }
    }

    // MARK: - Section Editing Workflow Tests

    func testSectionArrayEditWorkflow() throws {
        var song = createTestSong()
        let originalCount = song.sections.count

        // Add new section
        let newSection = Section(
            id: "section-new",
            name: "Bridge",
            start: MusicalTime(bars: 8),
            end: MusicalTime(bars: 12),
            roles: []
        )

        let addCommand = TimelineArrayEditCommand(
            description: "Add bridge section",
            getArray: { song.sections },
            setArray: { song.sections = $0 },
            operation: .insert(song.sections.count, newSection)
        )

        try manager.execute(addCommand)
        XCTAssertEqual(song.sections.count, originalCount + 1)

        // Undo
        try manager.undo()
        XCTAssertEqual(song.sections.count, originalCount)

        // Redo
        try manager.redo()
        XCTAssertEqual(song.sections.count, originalCount + 1)
    }

    // MARK: - Complex Workflow Tests

    func testComplexSongEditingWorkflow() throws {
        var song = createTestSong()
        var performances = createTestPerformances()

        // Complex multi-step edit
        let commands: [any Command] = [
            // Edit song metadata
            SongEditCommand(
                description: "Update tempo",
                getSong: { song },
                setSong: { song = $0 },
                edit: .metadata(SongMetadata(
                    tempo: 135.0,
                    timeSignature: [4, 4]
                ))
            ),

            // Add section
            TimelineArrayEditCommand(
                description: "Add chorus section",
                getArray: { song.sections },
                setArray: { song.sections = $0 },
                operation: .insert(1, Section(
                    id: "section-chorus",
                    name: "Chorus",
                    start: MusicalTime(bars: 4),
                    end: MusicalTime(bars: 8),
                    roles: []
                ))
            )
        ]

        try manager.executeMacro(description: "Prepare song structure", commands: commands)

        // Verify changes
        XCTAssertEqual(song.metadata.tempo, 135.0)
        XCTAssertEqual(song.sections.count, 2)

        // Undo all
        try manager.undo()
        XCTAssertEqual(song.metadata.tempo, 120.0)
        XCTAssertEqual(song.sections.count, 1)

        // Redo all
        try manager.redo()
        XCTAssertEqual(song.metadata.tempo, 135.0)
        XCTAssertEqual(song.sections.count, 2)
    }

    // MARK: - Save Point Workflow Tests

    func testSavePointWorkflow() throws {
        var song = createTestSong()

        // Mark initial state as saved
        manager.markSavePoint()
        XCTAssertFalse(manager.hasUnsavedChanges)

        // Make edit
        let editCommand = SongEditCommand(
            description: "Change song name",
            getSong: { song },
            setSong: { song = $0 },
            edit: .name("Modified Song")
        )

        try manager.execute(editCommand)
        XCTAssertTrue(manager.hasUnsavedChanges)

        // Undo
        try manager.undo()
        XCTAssertFalse(manager.hasUnsavedChanges)
    }

    // MARK: - Error Recovery Tests

    func testErrorRecoveryWorkflow() throws {
        var song = createTestSong()
        var counter = 0

        // Successful command
        let successCommand = SongEditCommand(
            description: "Change name",
            getSong: { song },
            setSong: { song = $0 },
            edit: .name("New Name")
        )

        // Failing command
        let failingCommand = FailingCommand(shouldFail: true)

        // Another successful command
        let anotherSuccessCommand = CounterIncrementCommand(counter: &counter)

        // Execute first command
        try manager.execute(successCommand)
        XCTAssertEqual(song.name, "New Name")
        XCTAssertEqual(manager.undoCount, 1)

        // Try to execute failing command (should not add to history)
        XCTAssertThrowsError(try manager.execute(failingCommand))
        XCTAssertEqual(manager.undoCount, 1)

        // Execute third command
        try manager.execute(anotherSuccessCommand)
        XCTAssertEqual(manager.undoCount, 2)

        // Verify undo works correctly
        try manager.undo()
        XCTAssertEqual(counter, 0)

        try manager.undo()
        XCTAssertEqual(song.name, "Test Song")
    }

    // MARK: - Helper Methods

    private func createTestSong() -> Song {
        Song(
            id: "song-1",
            name: "Test Song",
            version: "1.0",
            metadata: SongMetadata(
                tempo: 120.0,
                timeSignature: [4, 4]
            ),
            sections: [
                Section(
                    id: "section-verse",
                    name: "Verse",
                    start: MusicalTime(bars: 0),
                    end: MusicalTime(bars: 4),
                    roles: []
                )
            ],
            roles: [],
            projections: [],
            mixGraph: MixGraph(
                tracks: [],
                buses: [],
                sends: [],
                master: MixMasterConfig(volume: 1.0)
            ),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(beats: 1),
                determinismMode: .strict
            ),
            determinismSeed: "test-seed",
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    private func createTestPerformances() -> [TestPerformance] {
        [
            TestPerformance(
                id: "perf-1",
                songId: "song-1",
                name: "Performance 1",
                description: "First performance",
                tags: [],
                active: false,
                createdAt: Date(),
                updatedAt: Date()
            ),
            TestPerformance(
                id: "perf-2",
                songId: "song-1",
                name: "Performance 2",
                description: "Second performance",
                tags: [],
                active: false,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
    }
}

// =============================================================================
// MARK: - Test Performance Model
// =============================================================================

struct TestPerformance: Equatable, Codable, Sendable, Identifiable {
    var id: String
    var songId: String
    var name: String
    var description: String?
    var tags: [String]
    var active: Bool
    var parameters: [String: CodableAny] = [:]
    var projections: [String: Projection] = [:]
    var createdAt: Date
    var updatedAt: Date
}
