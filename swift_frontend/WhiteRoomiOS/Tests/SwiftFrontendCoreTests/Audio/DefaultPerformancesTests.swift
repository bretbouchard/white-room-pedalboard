//
//  DefaultPerformancesTests.swift
//  SwiftFrontendCoreTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

final class DefaultPerformancesTests: XCTestCase {

    // =============================================================================
    // MARK: - Schema Validation Tests
    // =============================================================================

    func testAllPerformancesValidateSchema() throws {
        let performances = DefaultPerformances.allPerformances()

        for performance in performances {
            let validation = performance.validate()

            XCTAssertTrue(
                validation.isValid,
                "Performance '\(performance.name)' failed validation: \(validation.errors.joined(separator: ", "))"
            )

            // Verify required fields
            XCTAssertEqual(performance.version, "1", "Performance '\(performance.name)' has invalid version")

            // Verify density is in range
            XCTAssertGreaterThanOrEqual(
                performance.density,
                0,
                "Performance '\(performance.name)' has negative density"
            )
            XCTAssertLessThanOrEqual(
                performance.density,
                1,
                "Performance '\(performance.name)' has density > 1"
            )

            // Verify instrumentation map is not empty
            XCTAssertFalse(
                performance.instrumentationMap.isEmpty,
                "Performance '\(performance.name)' has empty instrumentation map"
            )

            // Verify all mix targets have valid pan values
            for (role, target) in performance.mixTargets {
                XCTAssertGreaterThanOrEqual(
                    target.pan,
                    -1.0,
                    "Performance '\(performance.name)' role '\(role)' has pan < -1"
                )
                XCTAssertLessThanOrEqual(
                    target.pan,
                    1.0,
                    "Performance '\(performance.name)' role '\(role)' has pan > 1"
                )
            }
        }
    }

    // =============================================================================
    // MARK: - Performance Count Tests
    // =============================================================================

    func testAllArrangementStylesCovered() throws {
        let performances = DefaultPerformances.allPerformances()
        let styles = Set(performances.map { $0.arrangementStyle })

        // All styles except CUSTOM should be covered
        let expectedStyles: Set<ArrangementStyle> = [
            .SOLO_PIANO,
            .SATB,
            .AMBIENT_TECHNO,
            .JAZZ_COMBO,
            .JAZZ_TRIO,
            .ROCK_BAND,
            .ELECTRONIC,
            .ACAPPELLA,
            .STRING_QUARTET,
            .CHAMBER_ENSEMBLE,
            .FULL_ORCHESTRA
        ]

        XCTAssertEqual(
            styles,
            expectedStyles,
            "Not all arrangement styles are covered. Missing: \(expectedStyles.subtracting(styles))"
        )
    }

    func testPerformanceCount() throws {
        let performances = DefaultPerformances.allPerformances()

        XCTAssertEqual(
            performances.count,
            11,
            "Expected 11 default performances, got \(performances.count)"
        )
    }

    // =============================================================================
    // MARK: - Individual Performance Tests
    // =============================================================================

    func testSoloPianoPerformance() throws {
        let performance = DefaultPerformances.soloPiano()

        XCTAssertEqual(performance.arrangementStyle, .SOLO_PIANO)
        XCTAssertEqual(performance.name, "Solo Piano")
        XCTAssertEqual(performance.density, 0.35, accuracy: 0.001)
        XCTAssertTrue(performance.instrumentationMap.count >= 2)
    }

    func testSATBPerformance() throws {
        let performance = DefaultPerformances.satb()

        XCTAssertEqual(performance.arrangementStyle, .SATB)
        XCTAssertEqual(performance.name, "SATB Choir")
        XCTAssertEqual(performance.density, 0.55, accuracy: 0.001)
        XCTAssertTrue(performance.instrumentationMap.count >= 4)
    }

    func testAmbientTechnoPerformance() throws {
        let performance = DefaultPerformances.ambientTechno()

        XCTAssertEqual(performance.arrangementStyle, .AMBIENT_TECHNO)
        XCTAssertEqual(performance.name, "Ambient Techno")
        XCTAssertEqual(performance.density, 0.8, accuracy: 0.001)
        XCTAssertTrue(performance.instrumentationMap.count >= 4)
    }

    func testJazzComboPerformance() throws {
        let performance = DefaultPerformances.jazzCombo()

        XCTAssertEqual(performance.arrangementStyle, .JAZZ_COMBO)
        XCTAssertEqual(performance.name, "Jazz Combo")
        XCTAssertEqual(performance.density, 0.6, accuracy: 0.001)
    }

    func testJazzTrioPerformance() throws {
        let performance = DefaultPerformances.jazzTrio()

        XCTAssertEqual(performance.arrangementStyle, .JAZZ_TRIO)
        XCTAssertEqual(performance.name, "Jazz Trio")
        XCTAssertEqual(performance.density, 0.5, accuracy: 0.001)
    }

    func testRockBandPerformance() throws {
        let performance = DefaultPerformances.rockBand()

        XCTAssertEqual(performance.arrangementStyle, .ROCK_BAND)
        XCTAssertEqual(performance.name, "Rock Band")
        XCTAssertEqual(performance.density, 0.7, accuracy: 0.001)
    }

    func testElectronicPerformance() throws {
        let performance = DefaultPerformances.electronic()

        XCTAssertEqual(performance.arrangementStyle, .ELECTRONIC)
        XCTAssertEqual(performance.name, "Electronic")
        XCTAssertEqual(performance.density, 0.85, accuracy: 0.001)
    }

    func testACappellaPerformance() throws {
        let performance = DefaultPerformances.aCappella()

        XCTAssertEqual(performance.arrangementStyle, .ACAPPELLA)
        XCTAssertEqual(performance.name, "A Cappella")
        XCTAssertEqual(performance.density, 0.6, accuracy: 0.001)
    }

    func testStringQuartetPerformance() throws {
        let performance = DefaultPerformances.stringQuartet()

        XCTAssertEqual(performance.arrangementStyle, .STRING_QUARTET)
        XCTAssertEqual(performance.name, "String Quartet")
        XCTAssertEqual(performance.density, 0.45, accuracy: 0.001)
    }

    func testChamberEnsemblePerformance() throws {
        let performance = DefaultPerformances.chamberEnsemble()

        XCTAssertEqual(performance.arrangementStyle, .CHAMBER_ENSEMBLE)
        XCTAssertEqual(performance.name, "Chamber Ensemble")
        XCTAssertEqual(performance.density, 0.5, accuracy: 0.001)
    }

    func testFullOrchestraPerformance() throws {
        let performance = DefaultPerformances.fullOrchestra()

        XCTAssertEqual(performance.arrangementStyle, .FULL_ORCHESTRA)
        XCTAssertEqual(performance.name, "Full Orchestra")
        XCTAssertEqual(performance.density, 0.65, accuracy: 0.001)
    }

    // =============================================================================
    // MARK: - Performance Lookup Tests
    // =============================================================================

    func testPerformanceLookupByStyle() throws {
        for style in ArrangementStyle.allCases where style != .CUSTOM {
            let performance = DefaultPerformances.performance(for: style)

            XCTAssertNotNil(
                performance,
                "No default performance found for style: \(style.rawValue)"
            )

            if let perf = performance {
                XCTAssertEqual(perf.arrangementStyle, style)
            }
        }

        // CUSTOM should return nil
        let customPerformance = DefaultPerformances.performance(for: .CUSTOM)
        XCTAssertNil(customPerformance, "CUSTOM style should return nil")
    }

    // =============================================================================
    // MARK: - Metadata Tests
    // =============================================================================

    func testAllPerformancesHaveMetadata() throws {
        let performances = DefaultPerformances.allPerformances()

        for performance in performances {
            XCTAssertNotNil(
                performance.metadata,
                "Performance '\(performance.name)' is missing metadata"
            )

            if let metadata = performance.metadata {
                XCTAssertTrue(
                    metadata["description"] != nil,
                    "Performance '\(performance.name)' missing description"
                )
                XCTAssertTrue(
                    metadata["genre"] != nil,
                    "Performance '\(performance.name)' missing genre"
                )
                XCTAssertTrue(
                    metadata["mood"] != nil,
                    "Performance '\(performance.name)' missing mood"
                )
            }
        }
    }
}
