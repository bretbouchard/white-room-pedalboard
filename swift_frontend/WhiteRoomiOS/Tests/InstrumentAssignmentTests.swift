//
//  InstrumentAssignmentTests.swift
//  White Room Tests
//
//  Created by AI Assistant
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

/// Comprehensive tests for InstrumentAssignment model and manager
final class InstrumentAssignmentTests: XCTestCase {

    var manager: InstrumentAssignmentManager!

    override func setUp() {
        super.setUp()
        manager = InstrumentAssignmentManager()
    }

    override func tearDown() {
        manager = nil
        super.tearDown()
    }

    // MARK: - Assignment Operations Tests

    func testAssignInstrumentToTrack() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)

        let retrieved = manager.getInstrument(trackId: "track-1")
        XCTAssertNotNil(retrieved)
        XCTAssertEqual(retrieved?.id, "inst-1")
        XCTAssertEqual(retrieved?.name, "Grand Piano")
        XCTAssertEqual(manager.count, 1)
    }

    func testGetInstrumentForTrack() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)

        let retrieved = manager.getInstrument(trackId: "track-1")
        XCTAssertNotNil(retrieved)
        XCTAssertEqual(retrieved?.id, "inst-1")
        XCTAssertEqual(retrieved?.name, "Grand Piano")
    }

    func testGetInstrumentReturnsNilForNonExistentTrack() {
        let retrieved = manager.getInstrument(trackId: "non-existent")
        XCTAssertNil(retrieved)
    }

    func testRemoveAssignment() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)
        XCTAssertEqual(manager.count, 1)

        manager.removeAssignment(trackId: "track-1")
        XCTAssertEqual(manager.count, 0)
        XCTAssertNil(manager.getInstrument(trackId: "track-1"))
    }

    func testGetAllAssignments() throws {
        let instrument1 = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        let instrument2 = InstrumentAssignment(
            id: "inst-2",
            name: "Acoustic Bass",
            type: .bass,
            channel: 2,
            patch: 32
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument1)
        try manager.assignInstrument(trackId: "track-2", instrument: instrument2)

        let all = manager.getAllAssignments()
        XCTAssertEqual(all.count, 2)
        XCTAssertTrue(all.contains { $0.id == "inst-1" })
        XCTAssertTrue(all.contains { $0.id == "inst-2" })
    }

    func testGetAssignedTrackIds() throws {
        let instrument1 = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        let instrument2 = InstrumentAssignment(
            id: "inst-2",
            name: "Acoustic Bass",
            type: .bass,
            channel: 2,
            patch: 32
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument1)
        try manager.assignInstrument(trackId: "track-2", instrument: instrument2)

        let trackIds = manager.getAssignedTrackIds()
        XCTAssertTrue(trackIds.contains("track-1"))
        XCTAssertTrue(trackIds.contains("track-2"))
        XCTAssertEqual(trackIds.count, 2)
    }

    func testClearAllAssignments() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)
        try manager.assignInstrument(trackId: "track-2", instrument: instrument)

        XCTAssertEqual(manager.count, 2)

        manager.clearAll()

        XCTAssertEqual(manager.count, 0)
        XCTAssertTrue(manager.getAssignedTrackIds().isEmpty)
    }

    // MARK: - Validation Tests

    func testValidateCorrectInstrument() {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        XCTAssertNoThrow(try instrument.validate())
    }

    func testRejectInvalidMIDIChannel() {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 0, // Invalid: must be 1-16
            patch: 0
        )

        XCTAssertThrowsError(try instrument.validate()) { error in
            XCTAssertEqual(error as? InstrumentValidationError, .invalidChannel)
        }
    }

    func testRejectInvalidPatch() {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 128 // Invalid: must be 0-127
        )

        XCTAssertThrowsError(try instrument.validate()) { error in
            XCTAssertEqual(error as? InstrumentValidationError, .invalidPatch)
        }
    }

    func testRejectInvalidBankMSB() {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0,
            bankMSB: 128 // Invalid: must be 0-127
        )

        XCTAssertThrowsError(try instrument.validate()) { error in
            XCTAssertEqual(error as? InstrumentValidationError, .invalidBank)
        }
    }

    // MARK: - Channel Conflict Tests

    func testThrowErrorWhenAssigningToUsedChannel() throws {
        let instrument1 = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        let instrument2 = InstrumentAssignment(
            id: "inst-2",
            name: "Acoustic Bass",
            type: .bass,
            channel: 1, // Same channel as instrument1
            patch: 32
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument1)

        XCTAssertThrowsError(try manager.assignInstrument(trackId: "track-2", instrument: instrument2)) { error in
            XCTAssertEqual(error as? InstrumentValidationError, .channelConflict)
        }
    }

    func testAllowReassigningSameTrackToDifferentChannel() throws {
        let instrument1 = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        let instrument2 = InstrumentAssignment(
            id: "inst-2",
            name: "Electric Piano",
            type: .piano,
            channel: 2, // Different channel
            patch: 4
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument1)
        try manager.assignInstrument(trackId: "track-1", instrument: instrument2)

        XCTAssertEqual(manager.getInstrument(trackId: "track-1")?.channel, 2)
    }

    // MARK: - Available Channels Tests

    func testReturnAllChannelsWhenNoneAssigned() {
        let available = manager.getAvailableChannels()
        XCTAssertEqual(available.count, 16)
        XCTAssertEqual(available, Array(1...16))
    }

    func testExcludeAssignedChannels() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)

        let available = manager.getAvailableChannels()
        XCTAssertFalse(available.contains(1))
        XCTAssertEqual(available.count, 15)
    }

    // MARK: - Filtering Tests

    func testGetInstrumentsByType() throws {
        let piano1 = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        let piano2 = InstrumentAssignment(
            id: "inst-2",
            name: "Electric Piano",
            type: .piano,
            channel: 2,
            patch: 4
        )

        let bass = InstrumentAssignment(
            id: "inst-3",
            name: "Acoustic Bass",
            type: .bass,
            channel: 3,
            patch: 32
        )

        try manager.assignInstrument(trackId: "track-1", instrument: piano1)
        try manager.assignInstrument(trackId: "track-2", instrument: piano2)
        try manager.assignInstrument(trackId: "track-3", instrument: bass)

        let pianos = manager.getInstrumentsByType(.piano)
        XCTAssertEqual(pianos.count, 2)
        XCTAssertTrue(pianos.contains { $0.id == "inst-1" })
        XCTAssertTrue(pianos.contains { $0.id == "inst-2" })

        let basses = manager.getInstrumentsByType(.bass)
        XCTAssertEqual(basses.count, 1)
        XCTAssertTrue(basses.contains { $0.id == "inst-3" })
    }

    // MARK: - Has Assignment Tests

    func testHasAssignment() throws {
        let instrument = InstrumentAssignment(
            id: "inst-1",
            name: "Grand Piano",
            type: .piano,
            channel: 1,
            patch: 0
        )

        try manager.assignInstrument(trackId: "track-1", instrument: instrument)

        XCTAssertTrue(manager.hasAssignment(trackId: "track-1"))
        XCTAssertFalse(manager.hasAssignment(trackId: "track-2"))
    }

    // MARK: - InstrumentType Tests

    func testInstrumentTypeDisplayNames() {
        XCTAssertEqual(InstrumentType.piano.displayName, "Piano")
        XCTAssertEqual(InstrumentType.organ.displayName, "Organ")
        XCTAssertEqual(InstrumentType.guitar.displayName, "Guitar")
    }

    func testInstrumentTypeIcons() {
        XCTAssertEqual(InstrumentType.piano.iconName, "pianokeys")
        XCTAssertEqual(InstrumentType.drums.iconName, "speaker.wave.3")
    }

    func testInstrumentTypeDefaultColors() {
        XCTAssertTrue(InstrumentType.piano.defaultColor.starts(with: "#"))
        XCTAssertTrue(InstrumentType.bass.defaultColor.starts(with: "#"))
    }
}
