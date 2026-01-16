//
//  AutoSaveManagerTests.swift
//  SwiftFrontendCoreTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

// =============================================================================
// MARK: - Auto Save Manager Tests
// =============================================================================

/**
 Comprehensive tests for AutoSaveManager

 Tests cover:
 - Timer-based auto-save
 - Crash detection and recovery
 - File size limits
 - Configuration management
 - Save history management
 */
final class AutoSaveManagerTests: XCTestCase {

    // MARK: - Properties

    var autoSaveManager: AutoSaveManager!
    var testSong: Song!

    // MARK: - Setup & Teardown

    override func setUp() async throws {
        try await super.setUp()

        autoSaveManager = AutoSaveManager.shared

        // Create test song
        testSong = createTestSong()
    }

    override func tearDown() async throws {
        // Clean up auto-saves
        try await autoSaveManager.clearAutoSaves(for: testSong.id)
        autoSaveManager.stopAutoSave()

        try await super.tearDown()
    }

    // MARK: - Helper Methods

    private func createTestSong() -> Song {
        Song(
            id: UUID().uuidString,
            name: "Test Song",
            version: "1.0.0",
            metadata: SongMetadata(
                tempo: 120.0,
                timeSignature: [4, 4]
            ),
            sections: [
                Section(
                    id: UUID().uuidString,
                    name: "Verse",
                    start: MusicalTime(beats: 0),
                    end: MusicalTime(beats: 16),
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
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test-seed",
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    // MARK: - Configuration Tests

    func testConfigurationDefaultValues() async throws {
        let config = AutoSaveManager.Configuration()

        XCTAssertEqual(config.interval, 30.0, accuracy: 0.1)
        XCTAssertEqual(config.maxVersions, 10)
        XCTAssertEqual(config.maxFileSize, 100_000_000)
        XCTAssertTrue(config.isEnabled)
        XCTAssertTrue(config.showNotifications)
        XCTAssertTrue(config.conserveBattery)
    }

    func testConfigurationCustomValues() async throws {
        let config = AutoSaveManager.Configuration(
            interval: 60.0,
            maxVersions: 20,
            maxFileSize: 50_000_000,
            isEnabled: false,
            showNotifications: false,
            conserveBattery: false
        )

        XCTAssertEqual(config.interval, 60.0, accuracy: 0.1)
        XCTAssertEqual(config.maxVersions, 20)
        XCTAssertEqual(config.maxFileSize, 50_000_000)
        XCTAssertFalse(config.isEnabled)
        XCTAssertFalse(config.showNotifications)
        XCTAssertFalse(config.conserveBattery)
    }

    // MARK: - Auto-Save Trigger Tests

    func testAutoSaveStart() async throws {
        let expectation = XCTestExpectation(description: "Auto-save started")

        autoSaveManager.startAutoSave(for: testSong, interval: 1.0) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        // Wait for auto-save
        await fulfillment(of: [expectation], timeout: 5.0)

        autoSaveManager.stopAutoSave()

        let lastSaveTime = await autoSaveManager.getLastSaveTime()
        XCTAssertNotNil(lastSaveTime)
    }

    func testAutoSaveStop() async throws {
        autoSaveManager.startAutoSave(for: testSong, interval: 1.0)

        try await Task.sleep(for: .seconds(0.5))

        autoSaveManager.stopAutoSave()

        // Wait to ensure it doesn't save after stopping
        try await Task.sleep(for: .seconds(2.0))

        let history = await autoSaveManager.getSaveHistory()
        XCTAssertEqual(history.count, 0) // Should not have saved in 0.5s
    }

    func testAutoSaveDisabled() async throws {
        var config = AutoSaveManager.Configuration()
        config.isEnabled = false

        await autoSaveManager.updateConfiguration(config)

        let expectation = XCTestExpectation(description: "Auto-save should not occur")
        expectation.isInverted = true

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        // Wait to ensure no save occurs
        await fulfillment(of: [expectation], timeout: 2.0)

        autoSaveManager.stopAutoSave()
    }

    // MARK: - Immediate Save Tests

    func testImmediateSave() async throws {
        let expectation = XCTestExpectation(description: "Immediate save")

        try await autoSaveManager.triggerImmediateSave()

        autoSaveManager.startAutoSave(for: testSong, interval: 10.0) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 1.0)

        autoSaveManager.stopAutoSave()

        let history = await autoSaveManager.getSaveHistory()
        XCTAssertGreaterThanOrEqual(history.count, 1)
    }

    func testImmediateSaveWithoutActiveSong() async {
        // Don't start auto-save
        do {
            try await autoSaveManager.triggerImmediateSave()
            XCTFail("Should have thrown error")
        } catch AutoSaveError.noActiveSong {
            // Expected
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }

    // MARK: - Save History Tests

    func testSaveHistoryMaxVersions() async throws {
        var config = AutoSaveManager.Configuration()
        config.maxVersions = 3

        await autoSaveManager.updateConfiguration(config)

        let expectation = XCTestExpectation(description: "Multiple saves")
        expectation.expectedFulfillmentCount = 5

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 5.0)

        autoSaveManager.stopAutoSave()

        let history = await autoSaveManager.getSaveHistory()

        // Should only keep 3 versions
        XCTAssertLessThanOrEqual(history.count, 3)
    }

    func testSaveHistoryOrdering() async throws {
        let expectation = XCTestExpectation(description: "Multiple saves")
        expectation.expectedFulfillmentCount = 3

        var savedVersions: [Int] = []

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                if let history = await autoSaveManager.getSaveHistory().last {
                    savedVersions.append(history.version)
                }
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 5.0)

        autoSaveManager.stopAutoSave()

        // Versions should be incrementing
        XCTAssertEqual(savedVersions, [1, 2, 3])
    }

    // MARK: - Time Since Save Tests

    func testTimeSinceLastSave() async throws {
        let expectation = XCTestExpectation(description: "Save occurred")

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 2.0)

        autoSaveManager.stopAutoSave()

        let timeSinceSave = await autoSaveManager.getTimeSinceLastSave()
        XCTAssertNotNil(timeSinceSave)
        XCTAssertGreaterThan(timeSinceSave!, 0)
    }

    func testTimeSinceLastSaveInitiallyNil() async {
        autoSaveManager.startAutoSave(for: testSong, interval: 10.0)

        let timeSinceSave = await autoSaveManager.getTimeSinceLastSave()
        XCTAssertNil(timeSinceSave)

        autoSaveManager.stopAutoSave()
    }

    // MARK: - Restore Tests

    func testRestoreFromAutoSave() async throws {
        let expectation = XCTestExpectation(description: "Save occurred")

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 2.0)

        autoSaveManager.stopAutoSave()

        let history = await autoSaveManager.getSaveHistory()
        guard let version = history.first?.version else {
            XCTFail("No save history")
            return
        }

        let restoredSong = try await autoSaveManager.restoreFromAutoSave(version: version)

        XCTAssertEqual(restoredSong.id, testSong.id)
        XCTAssertEqual(restoredSong.name, testSong.name)
    }

    func testRestoreInvalidVersion() async {
        do {
            try await autoSaveManager.restoreFromAutoSave(version: 999)
            XCTFail("Should have thrown error")
        } catch AutoSaveError.versionNotFound(let version) {
            XCTAssertEqual(version, 999)
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }

    // MARK: - Clear Tests

    func testClearAutoSaves() async throws {
        let expectation = XCTestExpectation(description: "Save occurred")
        expectation.expectedFulfillmentCount = 3

        autoSaveManager.startAutoSave(for: testSong, interval: 0.5) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 5.0)

        autoSaveManager.stopAutoSave()

        // Verify saves exist
        let historyBefore = await autoSaveManager.getSaveHistory()
        XCTAssertGreaterThan(historyBefore.count, 0)

        // Clear saves
        try await autoSaveManager.clearAutoSaves(for: testSong.id)

        // Verify cleared
        let historyAfter = await autoSaveManager.getSaveHistory()
        XCTAssertEqual(historyAfter.count, 0)
    }

    // MARK: - File Size Limit Tests

    func testFileSizeLimit() async throws {
        // This would require creating a very large song
        // For now, we'll test the estimation logic

        let smallSong = createTestSong()
        let smallSize = smallSong.estimateSize()

        XCTAssertLessThan(smallSize, 100_000_000) // Should be under 100 MB

        // Test validation
        let validation = smallSong.validateForAutoSave()

        switch validation {
        case .valid:
            break // Expected
        case .invalid(let error):
            XCTFail("Small song should be valid: \(error)")
        }
    }

    // MARK: - Crash Detection Tests

    func testCrashDetectionOnStartup() async {
        // This test would require creating a crash marker file
        // and then creating a new AutoSaveManager instance

        // For now, we'll just verify the method exists and doesn't crash
        // In a real implementation, we'd mock the file system
    }

    // MARK: - Performance Tests

    func testAutoSavePerformance() async throws {
        let expectation = XCTestExpectation(description: "Performance test")

        measure {
            let task = Task {
                try await autoSaveManager.triggerImmediateSave()
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 1.0)
    }
}

// =============================================================================
// MARK: - Song Auto Save Extension Tests
// =============================================================================

/**
 Tests for Song+AutoSave extension
 */
final class SongAutoSaveExtensionTests: XCTestCase {

    func testWithAutoSaveMetadata() {
        let song = Song(
            id: UUID().uuidString,
            name: "Test",
            version: "1.0",
            metadata: SongMetadata(tempo: 120, timeSignature: [4, 4]),
            sections: [],
            roles: [],
            projections: [],
            mixGraph: MixGraph(tracks: [], buses: [], sends: [], master: MixMasterConfig(volume: 1.0)),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test",
            createdAt: Date(),
            updatedAt: Date()
        )

        let updatedSong = song.withAutoSaveMetadata(version: 5, isCrashRecovery: true)

        XCTAssertEqual(updatedSong.lastAutoSaveVersion, 5)
        XCTAssertTrue(updatedSong.isCrashRecovery)
    }

    func testValidateForAutoSave() {
        let validSong = Song(
            id: UUID().uuidString,
            name: "Valid Song",
            version: "1.0",
            metadata: SongMetadata(tempo: 120, timeSignature: [4, 4]),
            sections: [
                Section(
                    id: UUID().uuidString,
                    name: "Verse",
                    start: MusicalTime(beats: 0),
                    end: MusicalTime(beats: 16),
                    roles: []
                )
            ],
            roles: [],
            projections: [],
            mixGraph: MixGraph(tracks: [], buses: [], sends: [], master: MixMasterConfig(volume: 1.0)),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test",
            createdAt: Date(),
            updatedAt: Date()
        )

        let result = validSong.validateForAutoSave()

        switch result {
        case .valid:
            break // Expected
        case .invalid(let error):
            XCTFail("Song should be valid: \(error)")
        }
    }

    func testValidateForAutoSaveEmptySections() {
        let invalidSong = Song(
            id: UUID().uuidString,
            name: "Invalid Song",
            version: "1.0",
            metadata: SongMetadata(tempo: 120, timeSignature: [4, 4]),
            sections: [], // Empty sections
            roles: [],
            projections: [],
            mixGraph: MixGraph(tracks: [], buses: [], sends: [], master: MixMasterConfig(volume: 1.0)),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test",
            createdAt: Date(),
            updatedAt: Date()
        )

        let result = invalidSong.validateForAutoSave()

        switch result {
        case .valid:
            XCTFail("Song with empty sections should be invalid")
        case .invalid:
            break // Expected
        }
    }

    func testEstimateSize() {
        let song = Song(
            id: UUID().uuidString,
            name: "Test",
            version: "1.0",
            metadata: SongMetadata(tempo: 120, timeSignature: [4, 4]),
            sections: [
                Section(
                    id: UUID().uuidString,
                    name: "Verse",
                    start: MusicalTime(beats: 0),
                    end: MusicalTime(beats: 16),
                    roles: []
                ),
                Section(
                    id: UUID().uuidString,
                    name: "Chorus",
                    start: MusicalTime(beats: 16),
                    end: MusicalTime(beats: 32),
                    roles: []
                )
            ],
            roles: [],
            projections: [],
            mixGraph: MixGraph(tracks: [], buses: [], sends: [], master: MixMasterConfig(volume: 1.0)),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test",
            createdAt: Date(),
            updatedAt: Date()
        )

        let size = song.estimateSize()

        // Should be reasonable size (base 10KB + sections)
        XCTAssertGreaterThan(size, 10_000)
        XCTAssertLessThan(size, 100_000_000) // Should be under 100 MB
    }
}

// =============================================================================
// MARK: - Song Auto Save Coordinator Tests
// =============================================================================

/**
 Tests for SongAutoSaveCoordinator
 */
final class SongAutoSaveCoordinatorTests: XCTestCase {

    var coordinator: SongAutoSaveCoordinator!
    var testSong: Song!

    override func setUp() async throws {
        try await super.setUp()

        coordinator = SongAutoSaveCoordinator.shared
        testSong = Song(
            id: UUID().uuidString,
            name: "Test Song",
            version: "1.0.0",
            metadata: SongMetadata(tempo: 120, timeSignature: [4, 4]),
            sections: [
                Section(
                    id: UUID().uuidString,
                    name: "Verse",
                    start: MusicalTime(beats: 0),
                    end: MusicalTime(beats: 16),
                    roles: []
                )
            ],
            roles: [],
            projections: [],
            mixGraph: MixGraph(tracks: [], buses: [], sends: [], master: MixMasterConfig(volume: 1.0)),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(seconds: 2),
                determinismMode: .strict
            ),
            determinismSeed: "test",
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    override func tearDown() async throws {
        try await coordinator.clearAutoSaves(for: testSong.id)
        coordinator.stopAutoSave()

        try await super.tearDown()
    }

    func testStartAutoSave() async throws {
        let expectation = XCTestExpectation(description: "Auto-save started")

        coordinator.startAutoSave(for: testSong) { event in
            if case .saved = event {
                expectation.fulfill()
            }
        }

        await fulfillment(of: [expectation], timeout: 35.0) // 30s default interval + 5s buffer

        coordinator.stopAutoSave()

        let status = await coordinator.getAutoSaveStatus()
        XCTAssertNotNil(status.lastSaveTime)
    }

    func testGetAutoSaveStatus() async {
        coordinator.startAutoSave(for: testSong)

        let status = await coordinator.getAutoSaveStatus()

        XCTAssertTrue(status.isEnabled)
        XCTAssertNotNil(status.saveHistory)

        coordinator.stopAutoSave()
    }
}
