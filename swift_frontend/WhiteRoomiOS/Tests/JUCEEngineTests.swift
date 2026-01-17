//
//  JUCEEngineTests.swift
//  White Room Swift Frontend
//
//  Tests for JUCEEngine FFI bridge
//

import XCTest
@testable import SwiftFrontendCore

final class JUCEEngineTests: XCTestCase {

    func testEngineSingleton() {
        // Test that the engine singleton exists
        let engine = JUCEEngine.shared
        XCTAssertNotNil(engine)
    }

    func testEngineInitialization() {
        // Test engine initialization - this will call FFI
        let engine = JUCEEngine.shared

        // Give the engine time to initialize
        let expectation = XCTestExpectation(description: "Engine initializes")

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            // If we get here without crashing, FFI bridge works
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 5.0)
    }

    func testPerformanceBlend() {
        // Test setting performance blend via FFI
        let engine = JUCEEngine.shared

        let perfA = PerformanceInfo(id: "piano", name: "Piano", description: "Soft piano")
        let perfB = PerformanceInfo(id: "techno", name: "Techno", description: "Electronic beats")

        // This should call the FFI function
        engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

        // Give it time to process
        let expectation = XCTestExpectation(description: "Blend set")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 3.0)
    }

    func testFetchPerformances() {
        // Test fetching available performances
        let engine = JUCEEngine.shared
        let performances = engine.fetchAvailablePerformances()

        XCTAssertFalse(performances.isEmpty, "Should have default performances")
        XCTAssertTrue(performances.contains { $0.id == "piano" }, "Should have piano performance")
    }

    func testEngineLifecycle() throws {
        // Test engine start/stop
        let engine = JUCEEngine.shared

        // Start engine
        engine.startEngine()

        // Wait for start
        let startExpectation = XCTestExpectation(description: "Engine starts")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            XCTAssertTrue(engine.isEngineRunning, "Engine should be running")
            startExpectation.fulfill()
        }

        wait(for: [startExpectation], timeout: 5.0)

        // Stop engine
        engine.stopEngine()

        // Wait for stop
        let stopExpectation = XCTestExpectation(description: "Engine stops")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            XCTAssertFalse(engine.isEngineRunning, "Engine should be stopped")
            stopExpectation.fulfill()
        }

        wait(for: [stopExpectation], timeout: 3.0)
    }
}
