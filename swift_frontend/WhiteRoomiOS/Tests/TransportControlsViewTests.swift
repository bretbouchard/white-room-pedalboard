//
//  TransportControlsViewTests.swift
//  White Room iOSTests
//
//  Unit tests for TransportControlsView and TransportManager
//

import XCTest
import SwiftUI
@testable import SwiftFrontendCore

// =============================================================================
// MARK: - Transport Manager Tests
// ============================================================================

class TransportManagerTests: XCTestCase {

    var transport: TransportManager!

    override func setUp() {
        super.setUp()
        transport = TransportManager.shared
    }

    override func tearDown() {
        transport = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialState() {
        XCTAssertFalse(transport.isPlaying)
        XCTAssertTrue(transport.isStopped)
        XCTAssertFalse(transport.isPaused)
        XCTAssertEqual(transport.position, 0.0)
        XCTAssertEqual(transport.tempo, 120.0)
        XCTAssertEqual(transport.timeSignature, .fourFour)
        XCTAssertFalse(transport.loopEnabled)
        XCTAssertEqual(transport.loopStart, 0.0)
        XCTAssertEqual(transport.loopEnd, 32.0)
    }

    // MARK: - Playback Control Tests

    func testPlay() {
        transport.play()

        // Wait for async dispatch
        let expectation = XCTestExpectation(description: "Play completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isPlaying)
            XCTAssertFalse(self.transport.isStopped)
            XCTAssertFalse(self.transport.isPaused)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testPause() {
        transport.play()
        transport.pause()

        let expectation = XCTestExpectation(description: "Pause completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.transport.isPlaying)
            XCTAssertFalse(self.transport.isStopped)
            XCTAssertTrue(self.transport.isPaused)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testStop() {
        transport.play()
        transport.setPosition(16.5)
        transport.stop()

        let expectation = XCTestExpectation(description: "Stop completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.transport.isPlaying)
            XCTAssertTrue(self.transport.isStopped)
            XCTAssertFalse(self.transport.isPaused)
            XCTAssertEqual(self.transport.position, 0.0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testTogglePlay() {
        // Start playing
        let playing = transport.togglePlay()

        let expectation1 = XCTestExpectation(description: "Toggle to play")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(playing)
            XCTAssertTrue(self.transport.isPlaying)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        // Pause
        let paused = transport.togglePlay()

        let expectation2 = XCTestExpectation(description: "Toggle to pause")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(paused)
            XCTAssertFalse(self.transport.isPlaying)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)
    }

    // MARK: - Position Control Tests

    func testSetPosition() {
        transport.setPosition(16.5)

        let expectation = XCTestExpectation(description: "Set position completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.position, 16.5)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testMoveBy() {
        transport.setPosition(10.0)
        transport.moveBy(5.0)

        let expectation = XCTestExpectation(description: "Move by positive completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.position, 15.0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)

        transport.moveBy(-3.0)

        let expectation2 = XCTestExpectation(description: "Move by negative completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.position, 12.0)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)
    }

    func testMoveByClampsToZero() {
        transport.setPosition(2.0)
        transport.moveBy(-5.0)

        let expectation = XCTestExpectation(description: "Clamp to zero completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.position, 0.0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    // MARK: - Tempo Control Tests

    func testSetTempo() {
        transport.setTempo(140.0)

        let expectation = XCTestExpectation(description: "Set tempo completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 140.0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testAdjustTempo() {
        transport.setTempo(120.0)
        transport.adjustTempo(10)

        let expectation1 = XCTestExpectation(description: "Adjust tempo up completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 130.0)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        transport.adjustTempo(-5)

        let expectation2 = XCTestExpectation(description: "Adjust tempo down completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 125.0)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)
    }

    func testTempoClampsToValidRange() {
        transport.setTempo(1.0)
        transport.adjustTempo(-10)

        let expectation1 = XCTestExpectation(description: "Clamp min tempo")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 1.0)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        transport.setTempo(999.0)
        transport.adjustTempo(10)

        let expectation2 = XCTestExpectation(description: "Clamp max tempo")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 999.0)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)
    }

    // MARK: - Loop Control Tests

    func testSetLoopEnabled() {
        transport.setLoopEnabled(true)

        let expectation = XCTestExpectation(description: "Enable loop completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.loopEnabled)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testSetLoopRange() {
        transport.setLoopRange(start: 8.0, end: 24.0)

        let expectation = XCTestExpectation(description: "Set loop range completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.loopStart, 8.0)
            XCTAssertEqual(self.transport.loopEnd, 24.0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testToggleLoop() {
        let enabled = transport.toggleLoop()

        let expectation1 = XCTestExpectation(description: "Toggle loop on")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(enabled)
            XCTAssertTrue(self.transport.loopEnabled)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        let disabled = transport.toggleLoop()

        let expectation2 = XCTestExpectation(description: "Toggle loop off")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(disabled)
            XCTAssertFalse(self.transport.loopEnabled)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)
    }

    // MARK: - Time Signature Tests

    func testSetTimeSignature() {
        transport.setTimeSignature(.threeFour)

        let expectation = XCTestExpectation(description: "Set time signature completes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.timeSignature.numerator, 3)
            XCTAssertEqual(self.transport.timeSignature.denominator, 4)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    // MARK: - Integration Tests

    func testCompletePlaybackWorkflow() {
        // Start playback
        transport.play()

        let expectation1 = XCTestExpectation(description: "Play")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isPlaying)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        // Seek to position
        transport.setPosition(16.5)

        let expectation2 = XCTestExpectation(description: "Seek")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.position, 16.5)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)

        // Change tempo
        transport.setTempo(140.0)

        let expectation3 = XCTestExpectation(description: "Tempo")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.transport.tempo, 140.0)
            expectation3.fulfill()
        }

        wait(for: [expectation3], timeout: 1.0)

        // Enable loop
        transport.setLoopEnabled(true)
        transport.setLoopRange(start: 8.0, end: 24.0)

        let expectation4 = XCTestExpectation(description: "Loop")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.loopEnabled)
            XCTAssertEqual(self.transport.loopStart, 8.0)
            XCTAssertEqual(self.transport.loopEnd, 24.0)
            expectation4.fulfill()
        }

        wait(for: [expectation4], timeout: 1.0)

        // Pause
        transport.pause()

        let expectation5 = XCTestExpectation(description: "Pause")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isPaused)
            XCTAssertEqual(self.transport.position, 16.5) // Position maintained
            expectation5.fulfill()
        }

        wait(for: [expectation5], timeout: 1.0)

        // Stop
        transport.stop()

        let expectation6 = XCTestExpectation(description: "Stop")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isStopped)
            XCTAssertEqual(self.transport.position, 0.0) // Position reset
            expectation6.fulfill()
        }

        wait(for: [expectation6], timeout: 1.0)
    }

    func testKeyboardShortcutWorkflow() {
        // Space: Toggle play/pause
        transport.togglePlay()

        let expectation1 = XCTestExpectation(description: "Space toggle play")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isPlaying)
            expectation1.fulfill()
        }

        wait(for: [expectation1], timeout: 1.0)

        transport.togglePlay()

        let expectation2 = XCTestExpectation(description: "Space toggle pause")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.transport.isPlaying)
            expectation2.fulfill()
        }

        wait(for: [expectation2], timeout: 1.0)

        // Escape: Stop
        transport.togglePlay()
        transport.stop()

        let expectation3 = XCTestExpectation(description: "Escape stop")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.isStopped)
            expectation3.fulfill()
        }

        wait(for: [expectation3], timeout: 1.0)

        // L: Toggle loop
        transport.toggleLoop()

        let expectation4 = XCTestExpectation(description: "L toggle loop")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.transport.loopEnabled)
            expectation4.fulfill()
        }

        wait(for: [expectation4], timeout: 1.0)

        transport.toggleLoop()

        let expectation5 = XCTestExpectation(description: "L toggle loop off")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.transport.loopEnabled)
            expectation5.fulfill()
        }

        wait(for: [expectation5], timeout: 1.0)
    }
}

// =============================================================================
// MARK: - Time Signature Tests
// ============================================================================

class TimeSignatureTests: XCTestCase {

    func testTimeSignatureEquality() {
        let ts1 = TimeSignature(numerator: 4, denominator: 4)
        let ts2 = TimeSignature(numerator: 4, denominator: 4)
        let ts3 = TimeSignature(numerator: 3, denominator: 4)

        XCTAssertEqual(ts1, ts2)
        XCTAssertNotEqual(ts1, ts3)
    }

    func testStandardTimeSignatures() {
        XCTAssertEqual(TimeSignature.fourFour.numerator, 4)
        XCTAssertEqual(TimeSignature.fourFour.denominator, 4)

        XCTAssertEqual(TimeSignature.threeFour.numerator, 3)
        XCTAssertEqual(TimeSignature.threeFour.denominator, 4)

        XCTAssertEqual(TimeSignature.sixEight.numerator, 6)
        XCTAssertEqual(TimeSignature.sixEight.denominator, 8)
    }

    func testTimeSignatureHashable() {
        let set: Set<TimeSignature> = [.fourFour, .threeFour, .sixEight]
        XCTAssertEqual(set.count, 3)
        XCTAssertTrue(set.contains(.fourFour))
        XCTAssertTrue(set.contains(.threeFour))
        XCTAssertTrue(set.contains(.sixEight))
    }
}

// =============================================================================
// MARK: - UI Tests
// ============================================================================

class TransportControlsViewTests: XCTestCase {

    func testTransportControlsViewCreation() {
        let view = TransportControlsView()
        XCTAssertNotNil(view)
    }

    func testTransportPositionSliderCreation() {
        let transport = TransportManager.shared
        let slider = TransportPositionSlider(transport: transport)
        XCTAssertNotNil(slider)
    }
}
