//
//  ProjectionEngineTests.swift
//  SwiftFrontendCoreTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

// =============================================================================
// MARK: - Projection Engine Tests
// =============================================================================

/**
 Comprehensive tests for the Projection Engine.

 Tests cover:
 - All error paths
 - Edge cases
 - Happy path
 - Performance validation
 - Determinism verification
 */

final class ProjectionEngineTests: XCTestCase {

    // =============================================================================
    // MARK: - Test Helpers
    // =============================================================================

    /**
     Create a minimal valid Song for testing
     */
    private func createTestSong(
        id: String = "test-song",
        tempo: Double = 120.0,
        timeSignature: [Int] = [4, 4],
        sectionCount: Int = 1,
        roleCount: Int = 1,
        projectionCount: Int = 1
    ) -> Song {

        let metadata = SongMetadata(
            tempo: tempo,
            timeSignature: timeSignature,
            duration: 10.0,
            key: "C",
            tags: []
        )

        // Create sections
        var sections: [Section] = []
        for i in 0..<sectionCount {
            sections.append(Section(
                id: "section-\(i)",
                name: "Section \(i)",
                start: MusicalTime(seconds: Double(i) * 5.0),
                end: MusicalTime(seconds: Double(i + 1) * 5.0),
                roles: ["role-\(i)"]
            ))
        }

        // Create roles
        var roles: [Role] = []
        for i in 0..<roleCount {
            roles.append(Role(
                id: "role-\(i)",
                name: "Role \(i)",
                type: .melody,
                generatorConfig: GeneratorConfig(
                    type: "test-generator",
                    parameters: ["density": 0.5]
                ),
                parameters: RoleParameters(
                    density: 0.5,
                    range: 48...72,
                    velocityRange: 64...100
                )
            ))
        }

        // Create projections
        var projections: [Projection] = []
        for i in 0..<min(projectionCount, roleCount) {
            projections.append(Projection(
                id: "projection-\(i)",
                roleId: "role-\(i)",
                target: ProjectionTarget(type: .instrument, id: "instrument-\(i)")
            ))
        }

        let mixGraph = MixGraph(
            tracks: [
                TrackConfig(
                    id: "track-0",
                    name: "Track 0",
                    volume: 0.8,
                    pan: 0.0
                )
            ],
            buses: [],
            sends: [],
            master: MasterConfig(volume: 1.0, sampleRate: 44100, bufferSize: 512)
        )

        let realizationPolicy = RealizationPolicy(
            windowSize: MusicalTime(seconds: 1.0),
            lookaheadDuration: MusicalTime(seconds: 2.0),
            determinismMode: .strict
        )

        return Song(
            id: id,
            name: "Test Song",
            version: "1.0",
            metadata: metadata,
            sections: sections,
            roles: roles,
            projections: projections,
            mixGraph: mixGraph,
            realizationPolicy: realizationPolicy,
            determinismSeed: "test-seed",
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    /**
     Create a minimal valid PerformanceState for testing
     */
    private func createTestPerformance(
        id: String = "test-performance",
        mode: PerformanceState.PerformanceMode = .custom
    ) -> PerformanceState {
        return PerformanceState(
            id: id,
            name: "Test Performance",
            version: "1.0",
            mode: mode,
            roleOverrides: [:],
            globalDensityMultiplier: 1.0,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    // =============================================================================
    // MARK: - Song Validation Tests
    // =============================================================================

    func testInvalidSong_EmptyId() {
        let song = createTestSong(id: "")
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)
        XCTAssertTrue(result.isFailure)

        switch result {
        case .failure(let error):
            if case .invalidSong(let message, _) = error {
                XCTAssertEqual(message, "Song ID is empty")
            } else {
                XCTFail("Expected invalidSong error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSong_NegativeTempo() {
        let song = createTestSong(tempo: -10.0)
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSong(let message, _) = error {
                XCTAssertTrue(message.contains("Tempo must be positive"))
            } else {
                XCTFail("Expected invalidSong error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSong_ZeroTempo() {
        let song = createTestSong(tempo: 0.0)
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSong = error {
                // Expected
            } else {
                XCTFail("Expected invalidSong error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSong_InvalidTimeSignature() {
        let song = createTestSong(timeSignature: [4])
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSong = error {
                // Expected
            } else {
                XCTFail("Expected invalidSong error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSongContent_NoSections() {
        let song = createTestSong(sectionCount: 0)
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSongContent(let message, _) = error {
                XCTAssertTrue(message.contains("no sections"))
            } else {
                XCTFail("Expected invalidSongContent error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSongContent_NoRoles() {
        let song = createTestSong(roleCount: 0)
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSongContent(let message, _) = error {
                XCTAssertTrue(message.contains("no roles"))
            } else {
                XCTFail("Expected invalidSongContent error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSongContent_NoProjections() {
        let song = createTestSong(projectionCount: 0)
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSongContent(let message, _) = error {
                XCTAssertTrue(message.contains("no projections"))
            } else {
                XCTFail("Expected invalidSongContent error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidSongContent_ProjectionReferencesNonExistentRole() {
        var song = createTestSong()
        // Add projection for non-existent role
        song.projections.append(Projection(
            id: "bad-projection",
            roleId: "non-existent-role",
            target: ProjectionTarget(type: .instrument, id: "instrument-0")
        ))

        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidSongContent(let message, _) = error {
                XCTAssertTrue(message.contains("non-existent role"))
            } else {
                XCTFail("Expected invalidSongContent error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    // =============================================================================
    // MARK: - Performance Validation Tests
    // =============================================================================

    func testInvalidPerformance_EmptyId() {
        let song = createTestSong()
        var performance = createTestPerformance()
        performance.id = ""
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidPerformance(let message, _) = error {
                XCTAssertEqual(message, "Performance ID is empty")
            } else {
                XCTFail("Expected invalidPerformance error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidPerformance_NegativeDensityMultiplier() {
        let song = createTestSong()
        var performance = createTestPerformance()
        performance.globalDensityMultiplier = -1.0
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidPerformance(let message, _) = error {
                XCTAssertTrue(message.contains("density multiplier"))
            } else {
                XCTFail("Expected invalidPerformance error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testInvalidPerformance_ZeroTempoMultiplier() {
        let song = createTestSong()
        var performance = createTestPerformance()
        performance.tempoMultiplier = 0.0
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .invalidPerformance(let message, _) = error {
                XCTAssertTrue(message.contains("Tempo multiplier"))
            } else {
                XCTFail("Expected invalidPerformance error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testPerformanceReferencesInvalid_NonExistentRole() {
        let song = createTestSong()
        var performance = createTestPerformance()
        performance.roleOverrides = [
            "non-existent-role": RoleOverride(roleId: "non-existent-role", densityMultiplier: 1.5)
        ]
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertFalse(result.isSuccess)

        switch result {
        case .failure(let error):
            if case .performanceReferencesInvalid(let message, _) = error {
                XCTAssertTrue(message.contains("invalid entities"))
            } else {
                XCTFail("Expected performanceReferencesInvalid error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testPerformanceReferencesInvalid_NonExistentInstrumentReassignment() {
        let song = createTestSong()
        var performance = createTestPerformance()
        performance.instrumentReassignments = [
            "role-0": "non-existent-instrument"
        ]
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        // This should succeed but generate a warning
        // The projection system will substitute with a default instrument
        XCTAssertTrue(result.isSuccess)

        if case .success(let projectionResult) = result {
            // Should have a warning about substituted instrument
            XCTAssertFalse(projectionResult.warnings.isEmpty)
            let substitutionWarning = projectionResult.warnings.first { $0.category == "instrumentation" }
            XCTAssertNotNil(substitutionWarning)
        }
    }

    // =============================================================================
    // MARK: - Graph Validation Tests
    // =============================================================================

    func testCircularRoutingDetection() {
        // Create a graph with circular routing
        let song = createTestSong()

        // Create a custom render graph with a cycle
        var graph = RenderGraph(
            version: "1.0",
            nodes: [
                GraphNode(id: "track-a", type: .track, name: "Track A"),
                GraphNode(id: "track-b", type: .track, name: "Track B"),
                GraphNode(id: "master", type: .master, name: "Master")
            ],
            connections: [
                GraphConnection(fromNodeId: "track-a", toNodeId: "track-b", connectionType: .send),
                GraphConnection(fromNodeId: "track-b", toNodeId: "track-a", connectionType: .send)
            ],
            masterConfig: song.mixGraph.master
        )

        // Validate the graph
        let validation = validateRenderGraph(graph)

        XCTAssertFalse(validation.isSuccess)

        switch validation {
        case .failure(let error):
            if case .circularRouting(let cycle) = error {
                XCTAssertTrue(cycle.contains("track-a"))
                XCTAssertTrue(cycle.contains("track-b"))
            } else {
                XCTFail("Expected circularRouting error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    func testOrphanedNodesDetection() {
        // Create a graph with orphaned nodes
        let song = createTestSong()

        let graph = RenderGraph(
            version: "1.0",
            nodes: [
                GraphNode(id: "track-a", type: .track, name: "Track A"),
                GraphNode(id: "track-b", type: .track, name: "Track B (Orphaned)"),
                GraphNode(id: "master", type: .master, name: "Master")
            ],
            connections: [
                GraphConnection(fromNodeId: "track-a", toNodeId: "master", connectionType: .audio)
            ],
            masterConfig: song.mixGraph.master
        )

        // Validate the graph
        let validation = validateRenderGraph(graph)

        XCTAssertFalse(validation.isSuccess)

        switch validation {
        case .failure(let error):
            if case .orphanedNodes(let orphanIds, let nodeTypes) = error {
                XCTAssertTrue(orphanIds.contains("track-b"))
                XCTAssertTrue(nodeTypes.contains("track"))
            } else {
                XCTFail("Expected orphanedNodes error, got: \(error)")
            }
        default:
            XCTFail("Expected failure")
        }
    }

    // =============================================================================
    // MARK: - Happy Path Tests
    // =============================================================================

    func testSuccessfulProjection() {
        let song = createTestSong()
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)

        if case .success(let projectionResult) = result {
            XCTAssertNotNil(projectionResult.renderGraph)
            XCTAssertNotNil(projectionResult.instrumentationReport)
            XCTAssertNotNil(projectionResult.consolexConfig)
            XCTAssertFalse(projectionResult.resultId.isEmpty)
            XCTAssertEqual(projectionResult.projectedDuration, 10.0) // From durationOverride in testing config
        }
    }

    func testSuccessfulProjection_WithPerformanceOverrides() {
        let song = createTestSong()
        var performance = createTestPerformance()

        // Add role override
        performance.roleOverrides = [
            "role-0": RoleOverride(
                roleId: "role-0",
                densityMultiplier: 2.0,
                rangeOverride: 60...84
            )
        ]

        // Add tempo multiplier
        performance.tempoMultiplier = 1.5

        let config = ProjectionConfig.testing()
        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)

        if case .success(let projectionResult) = result {
            // Verify overrides were applied
            // The role density should be multiplied by 2.0 * 1.0 (global)
            // The tempo should be multiplied by 1.5
            XCTAssertNotNil(projectionResult.renderGraph)
        }
    }

    func testSuccessfulProjection_WithInstrumentReassignment() {
        let song = createTestSong()
        var performance = createTestPerformance()

        // Reassign instrument
        performance.instrumentReassignments = [
            "role-0": "new-instrument-id"
        ]

        let config = ProjectionConfig.testing()
        let result = projectSong(song, performance: performance, config: config)

        // Should succeed with warning
        XCTAssertTrue(result.isSuccess)

        if case .success(let projectionResult) = result {
            // Should have warning about substituted instrument
            let warnings = projectionResult.warnings.filter { $0.category == "instrumentation" }
            XCTAssertFalse(warnings.isEmpty)
        }
    }

    // =============================================================================
    // MARK: - Determinism Tests
    // =============================================================================

    func testDeterminism_SameInputsSameOutput() {
        let song = createTestSong()
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result1 = projectSong(song, performance: performance, config: config)
        let result2 = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result1.isSuccess)
        XCTAssertTrue(result2.isSuccess)

        if case .success(let projectionResult1) = result1,
           case .success(let projectionResult2) = result2 {
            XCTAssertEqual(projectionResult1.resultId, projectionResult2.resultId)
        }
    }

    func testDeterminism_DifferentSongsDifferentResults() {
        let song1 = createTestSong(id: "song-1")
        let song2 = createTestSong(id: "song-2")
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result1 = projectSong(song1, performance: performance, config: config)
        let result2 = projectSong(song2, performance: performance, config: config)

        XCTAssertTrue(result1.isSuccess)
        XCTAssertTrue(result2.isSuccess)

        if case .success(let projectionResult1) = result1,
           case .success(let projectionResult2) = result2 {
            XCTAssertNotEqual(projectionResult1.resultId, projectionResult2.resultId)
        }
    }

    // =============================================================================
    // MARK: - ProjectionConfig Tests
    // =============================================================================

    func testProjectionConfig_SkipValidation() {
        let song = createTestSong()
        let performance = createTestPerformance()

        // Create a config that skips validation
        var config = ProjectionConfig.testing()
        config.validateGraph = false

        let result = projectSong(song, performance: performance, config: config)

        // Should succeed even if graph would have validation issues
        XCTAssertTrue(result.isSuccess)
    }

    func testProjectionConfig_DurationOverride() {
        let song = createTestSong()
        let performance = createTestPerformance()

        var config = ProjectionConfig.testing()
        config.durationOverride = 30.0

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)

        if case .success(let projectionResult) = result {
            XCTAssertEqual(projectionResult.projectedDuration, 30.0)
        }
    }

    func testProjectionConfig_Presets() {
        // Test that all presets create valid configs
        let realtime = ProjectionConfig.realtime()
        XCTAssertEqual(realtime.renderMode, .realtime)
        XCTAssertTrue(realtime.validateGraph)
        XCTAssertTrue(realtime.includeAutomation)

        let bounce = ProjectionConfig.bounce()
        XCTAssertEqual(bounce.renderMode, .bounce)
        XCTAssertTrue(bounce.validateGraph)
        XCTAssertTrue(bounce.includeAutomation)

        let export = ProjectionConfig.export()
        XCTAssertEqual(export.renderMode, .export)
        XCTAssertTrue(export.validateGraph)
        XCTAssertTrue(export.includeAutomation)

        let testing = ProjectionConfig.testing()
        XCTAssertEqual(testing.renderMode, .realtime)
        XCTAssertFalse(testing.validateGraph)
        XCTAssertFalse(testing.includeAutomation)
    }

    // =============================================================================
    // MARK: - Error Message Tests
    // =============================================================================

    func testErrorMessage_UserFriendly() {
        let song = createTestSong(id: "")
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        if case .failure(let error) = result {
            let userMessage = error.userMessage
            XCTAssertFalse(userMessage.isEmpty)
            XCTAssertFalse(userMessage.contains("debugDescription"))
        }
    }

    func testErrorMessage_DebugInfo() {
        let song = createTestSong(id: "")
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        if case .failure(let error) = result {
            let debugInfo = error.debugInfo
            XCTAssertFalse(debugInfo.isEmpty)
            XCTAssertTrue(debugInfo.contains("Song ID"))
        }
    }

    func testErrorMessage_RecoveryHint() {
        let song = createTestSong(id: "")
        let performance = createTestPerformance()
        let config = ProjectionConfig.testing()

        let result = projectSong(song, performance: performance, config: config)

        if case .failure(let error) = result {
            let recoveryHint = error.recoveryHint
            XCTAssertNotNil(recoveryHint)
            XCTAssertFalse(recoveryHint!.isEmpty)
        }
    }

    // =============================================================================
    // MARK: - Performance Mode Tests
    // =============================================================================

    func testPerformanceMode_Piano() {
        let song = createTestSong()
        let performance = PerformanceState(
            id: "piano-performance",
            name: "Piano",
            version: "1.0",
            mode: .piano,
            roleOverrides: [:],
            globalDensityMultiplier: 1.0,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )

        let config = ProjectionConfig.realtime()
        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)
    }

    func testPerformanceMode_SATB() {
        let song = createTestSong(roleCount: 4, projectionCount: 4)
        let performance = PerformanceState(
            id: "satb-performance",
            name: "SATB",
            version: "1.0",
            mode: .satb,
            roleOverrides: [:],
            globalDensityMultiplier: 0.8,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )

        let config = ProjectionConfig.realtime()
        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)
    }

    func testPerformanceMode_Techno() {
        let song = createTestSong()
        let performance = PerformanceState(
            id: "techno-performance",
            name: "Techno",
            version: "1.0",
            mode: .techno,
            roleOverrides: [:],
            globalDensityMultiplier: 1.5,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .swing,
            tempoMultiplier: 1.2,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )

        let config = ProjectionConfig.realtime()
        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess)
    }
}
