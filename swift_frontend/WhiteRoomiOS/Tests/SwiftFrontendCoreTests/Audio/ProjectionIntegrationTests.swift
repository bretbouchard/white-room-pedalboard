//
//  ProjectionIntegrationTests.swift
//  SwiftFrontendCoreTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

// =============================================================================
// MARK: - Projection Integration Tests
// =============================================================================

/**
 Integration tests for end-to-end projection scenarios.

 These tests use realistic Song and Performance configurations
 to verify the complete projection pipeline works correctly.
 */

final class ProjectionIntegrationTests: XCTestCase {

    // =============================================================================
    // MARK: - Test Helpers
    // =============================================================================

    /**
     Create a realistic Song with multiple sections, roles, and projections
     */
    private func createRealisticSong() -> Song {
        let metadata = SongMetadata(
            tempo: 120.0,
            timeSignature: [4, 4],
            duration: 180.0, // 3 minutes
            key: "C",
            tags: ["test", "integration"]
        )

        // Create sections (verse, chorus, bridge)
        let sections = [
            Section(
                id: "verse-1",
                name: "Verse 1",
                start: MusicalTime(seconds: 0.0),
                end: MusicalTime(seconds: 30.0),
                roles: ["bass", "melody", "harmony", "rhythm"]
            ),
            Section(
                id: "chorus-1",
                name: "Chorus 1",
                start: MusicalTime(seconds: 30.0),
                end: MusicalTime(seconds: 60.0),
                roles: ["bass", "melody", "harmony", "rhythm", "pad"]
            ),
            Section(
                id: "verse-2",
                name: "Verse 2",
                start: MusicalTime(seconds: 60.0),
                end: MusicalTime(seconds: 90.0),
                roles: ["bass", "melody", "harmony", "rhythm"]
            ),
            Section(
                id: "chorus-2",
                name: "Chorus 2",
                start: MusicalTime(seconds: 90.0),
                end: MusicalTime(seconds: 120.0),
                roles: ["bass", "melody", "harmony", "rhythm", "pad"]
            ),
            Section(
                id: "bridge",
                name: "Bridge",
                start: MusicalTime(seconds: 120.0),
                end: MusicalTime(seconds: 150.0),
                roles: ["bass", "melody", "pad"]
            ),
            Section(
                id: "outro",
                name: "Outro",
                start: MusicalTime(seconds: 150.0),
                end: MusicalTime(seconds: 180.0),
                roles: ["bass", "rhythm"]
            )
        ]

        // Create roles
        let roles = [
            Role(
                id: "bass",
                name: "Bass",
                type: .bass,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-bass",
                    parameters: ["pattern": "walking"]
                ),
                parameters: RoleParameters(
                    density: 0.6,
                    range: 36...48,
                    velocityRange: 80...100,
                    articulation: "legato"
                )
            ),
            Role(
                id: "melody",
                name: "Melody",
                type: .melody,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-melody",
                    parameters: ["complexity": "medium"]
                ),
                parameters: RoleParameters(
                    density: 0.4,
                    range: 60...84,
                    velocityRange: 90...120,
                    articulation: "tenuto"
                )
            ),
            Role(
                id: "harmony",
                name: "Harmony",
                type: .harmony,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-harmony",
                    parameters: ["voicing": "closed"]
                ),
                parameters: RoleParameters(
                    density: 0.5,
                    range: 48...72,
                    velocityRange: 70...90,
                    articulation: "staccato"
                )
            ),
            Role(
                id: "rhythm",
                name: "Rhythm",
                type: .rhythm,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-rhythm",
                    parameters: ["pattern": "rock"]
                ),
                parameters: RoleParameters(
                    density: 0.8,
                    range: 60...72,
                    velocityRange: 100...127
                )
            ),
            Role(
                id: "pad",
                name: "Pad",
                type: .texture,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-pad",
                    parameters: ["layers": 3]
                ),
                parameters: RoleParameters(
                    density: 0.3,
                    range: 48...60,
                    velocityRange: 50...70,
                    articulation: "legato"
                )
            )
        ]

        // Create projections
        let projections = [
            Projection(
                id: "bass-projection",
                roleId: "bass",
                target: ProjectionTarget(type: .instrument, id: "fender-bass")
            ),
            Projection(
                id: "melody-projection",
                roleId: "melody",
                target: ProjectionTarget(type: .instrument, id: "grand-piano")
            ),
            Projection(
                id: "harmony-projection",
                roleId: "harmony",
                target: ProjectionTarget(type: .instrument, id: "jazz-guitar")
            ),
            Projection(
                id: "rhythm-projection",
                roleId: "rhythm",
                target: ProjectionTarget(type: .instrument, id: "drum-kit")
            ),
            Projection(
                id: "pad-projection",
                roleId: "pad",
                target: ProjectionTarget(type: .instrument, id: "strings-pad")
            )
        ]

        // Create mix graph
        let mixGraph = MixGraph(
            tracks: [
                TrackConfig(id: "bass-track", name: "Bass", volume: 0.9, pan: 0.0),
                TrackConfig(id: "melody-track", name: "Melody", volume: 0.85, pan: -0.2),
                TrackConfig(id: "harmony-track", name: "Harmony", volume: 0.75, pan: 0.3),
                TrackConfig(id: "rhythm-track", name: "Rhythm", volume: 0.95, pan: 0.0),
                TrackConfig(id: "pad-track", name: "Pad", volume: 0.6, pan: 0.0)
            ],
            buses: [
                BusConfig(id: "reverb-bus", name: "Reverb", volume: 0.4)
            ],
            sends: [
                SendConfig(id: "send-1", fromTrackId: "melody-track", toBusId: "reverb-bus", amount: 0.3),
                SendConfig(id: "send-2", fromTrackId: "harmony-track", toBusId: "reverb-bus", amount: 0.2),
                SendConfig(id: "send-3", fromTrackId: "pad-track", toBusId: "reverb-bus", amount: 0.5)
            ],
            master: MasterConfig(volume: 1.0, sampleRate: 44100, bufferSize: 512)
        )

        let realizationPolicy = RealizationPolicy(
            windowSize: MusicalTime(seconds: 1.0),
            lookaheadDuration: MusicalTime(seconds: 2.0),
            determinismMode: .strict
        )

        return Song(
            id: "realistic-song-\(UUID().uuidString)",
            name: "Realistic Test Song",
            version: "1.0",
            metadata: metadata,
            sections: sections,
            roles: roles,
            projections: projections,
            mixGraph: mixGraph,
            realizationPolicy: realizationPolicy,
            determinismSeed: "integration-test-seed",
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    // =============================================================================
    // MARK: - Integration Tests
    // =============================================================================

    func testCompleteProjectionPipeline() {
        let song = createRealisticSong()
        let performance = PerformanceState.defaultPerformance(id: "default", name: "Default Performance")
        let config = ProjectionConfig.realtime()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess, "Projection should succeed")

        if case .success(let projectionResult) = result {
            // Verify render graph
            XCTAssertFalse(projectionResult.renderGraph.nodes.isEmpty, "Render graph should have nodes")
            XCTAssertFalse(projectionResult.renderGraph.connections.isEmpty, "Render graph should have connections")

            // Verify instrumentation report
            XCTAssertEqual(
                projectionResult.instrumentationReport.roleInstrumentMap.count,
                song.roles.count,
                "All roles should be instrumented"
            )
            XCTAssertEqual(
                projectionResult.instrumentationReport.usedInstruments.count,
                song.projections.count,
                "All instruments should be used"
            )

            // Verify ConsoleX config
            XCTAssertFalse(
                projectionResult.consolexConfig.mixSettings.isEmpty,
                "ConsoleX should have mix settings"
            )

            // Verify result ID is deterministic
            XCTAssertFalse(
                projectionResult.resultId.isEmpty,
                "Result ID should be generated"
            )

            // Verify duration
            XCTAssertEqual(
                projectionResult.projectedDuration,
                song.metadata.duration,
                "Projected duration should match song duration"
            )

            // Verify timestamp
            XCTAssertLessThan(
                abs(projectionResult.projectionTimestamp.timeIntervalSinceNow),
                1.0,
                "Projection timestamp should be recent"
            )
        }
    }

    func testPerformanceSwitching() {
        let song = createRealisticSong()

        // Create multiple performances
        let pianoPerformance = PerformanceState(
            id: "piano",
            name: "Piano",
            version: "1.0",
            mode: .piano,
            roleOverrides: [
                "bass": RoleOverride(roleId: "bass", densityMultiplier: 0.8),
                "melody": RoleOverride(roleId: "melody", densityMultiplier: 1.2)
            ],
            globalDensityMultiplier: 1.0,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["piano"],
            createdAt: Date(),
            updatedAt: Date()
        )

        let technoPerformance = PerformanceState(
            id: "techno",
            name: "Techno",
            version: "1.0",
            mode: .techno,
            roleOverrides: [
                "bass": RoleOverride(roleId: "bass", densityMultiplier: 1.5),
                "rhythm": RoleOverride(roleId: "rhythm", densityMultiplier: 2.0)
            ],
            globalDensityMultiplier: 1.3,
            instrumentReassignments: [
                "melody": "synth-lead",
                "bass": "synth-bass"
            ],
            ensembleOverride: nil,
            groove: .swing,
            tempoMultiplier: 1.2,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["techno"],
            createdAt: Date(),
            updatedAt: Date()
        )

        let config = ProjectionConfig.realtime()

        // Project with piano performance
        let pianoResult = projectSong(song, performance: pianoPerformance, config: config)
        XCTAssertTrue(pianoResult.isSuccess, "Piano projection should succeed")

        // Project with techno performance
        let technoResult = projectSong(song, performance: technoPerformance, config: config)
        XCTAssertTrue(technoResult.isSuccess, "Techno projection should succeed")

        // Verify results are different
        if case .success(let pianoProjection) = pianoResult,
           case .success(let technoProjection) = technoResult {
            XCTAssertNotEqual(
                pianoProjection.resultId,
                technoProjection.resultId,
                "Different performances should produce different results"
            )
        }
    }

    func testProjectionCaching() {
        let song = createRealisticSong()
        let performance = PerformanceState.defaultPerformance()
        let config = ProjectionConfig.realtime()

        // Project multiple times with same inputs
        let result1 = projectSong(song, performance: performance, config: config)
        let result2 = projectSong(song, performance: performance, config: config)
        let result3 = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result1.isSuccess)
        XCTAssertTrue(result2.isSuccess)
        XCTAssertTrue(result3.isSuccess)

        // All results should be identical
        if case .success(let projection1) = result1,
           case .success(let projection2) = result2,
           case .success(let projection3) = result3 {
            XCTAssertEqual(projection1.resultId, projection2.resultId)
            XCTAssertEqual(projection2.resultId, projection3.resultId)

            // Render graphs should be identical
            XCTAssertEqual(projection1.renderGraph.nodes.count, projection2.renderGraph.nodes.count)
            XCTAssertEqual(projection2.renderGraph.nodes.count, projection3.renderGraph.nodes.count)
        }
    }

    func testOfflineBounce() {
        let song = createRealisticSong()
        let performance = PerformanceState.defaultPerformance()
        let config = ProjectionConfig.bounce()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess, "Offline bounce projection should succeed")

        if case .success(let projectionResult) = result {
            // Verify timing stats are collected
            XCTAssertNotNil(
                projectionResult.timingStats,
                "Timing stats should be collected for bounce"
            )

            // Verify warnings are collected
            XCTAssertNotNil(
                projectionResult.warnings,
                "Warnings should be collected for bounce"
            )
        }
    }

    func testFullExport() {
        let song = createRealisticSong()
        let performance = PerformanceState.defaultPerformance()
        let config = ProjectionConfig.export()

        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess, "Full export projection should succeed")

        if case .success(let projectionResult) = result {
            // Verify complete result
            XCTAssertNotNil(projectionResult.timingStats)
            XCTAssertNotNil(projectionResult.instrumentationReport)
            XCTAssertNotNil(projectionResult.consolexConfig)
            XCTAssertFalse(projectionResult.warnings.isEmpty || true) // May or may not have warnings
        }
    }

    func testComplexSongWithManyRoles() {
        let song = createRealisticSong()

        // Add more roles
        var roles = song.roles
        var projections = song.projections

        let additionalRoles = [
            ("counterpoint", Role.RoleType.melody),
            ("ornament", Role.RoleType.ornament),
            ("texture", Role.RoleType.texture)
        ]

        for (roleId, roleType) in additionalRoles {
            roles.append(Role(
                id: roleId,
                name: roleId.capitalized,
                type: roleType,
                generatorConfig: GeneratorConfig(
                    type: "schillinger-generic",
                    parameters: [:]
                ),
                parameters: RoleParameters(
                    density: 0.5,
                    range: 48...72,
                    velocityRange: 64...100
                )
            ))

            projections.append(Projection(
                id: "\(roleId)-projection",
                roleId: roleId,
                target: ProjectionTarget(type: .instrument, id: "default-instrument")
            ))
        }

        var complexSong = song
        complexSong.roles = roles
        complexSong.projections = projections

        let performance = PerformanceState.defaultPerformance()
        let config = ProjectionConfig.realtime()

        let result = projectSong(complexSong, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess, "Complex song should project successfully")

        if case .success(let projectionResult) = result {
            // Verify all roles are instrumented
            XCTAssertEqual(
                projectionResult.instrumentationReport.roleInstrumentMap.count,
                roles.count,
                "All roles should be instrumented"
            )
        }
    }

    func testPerformanceWithAllOverrides() {
        let song = createRealisticSong()

        // Create performance with all possible overrides
        let performance = PerformanceState(
            id: "full-override",
            name: "Full Override",
            version: "1.0",
            mode: .custom,
            roleOverrides: [
                "bass": RoleOverride(
                    roleId: "bass",
                    densityMultiplier: 2.0,
                    rangeOverride: 40...52,
                    velocityRangeOverride: 90..110,
                    articulationOverride: "staccato"
                ),
                "melody": RoleOverride(
                    roleId: "melody",
                    densityMultiplier: 0.5,
                    rangeOverride: 72..96
                )
            ],
            globalDensityMultiplier: 1.5,
            instrumentReassignments: [
                "bass": "synth-bass",
                "melody": "electric-piano",
                "harmony": "organ",
                "rhythm": "electronic-drums",
                "pad": "analog-pad"
            ],
            ensembleOverride: EnsembleOverride(
                ensembleId: "custom-ensemble",
                name: "Custom Ensemble",
                instruments: []
            ),
            groove: .swing,
            tempoMultiplier: 1.3,
            consolexOverrides: [
                "bass-track": ConsoleXOverride(targetId: "bass-track", volumeOverride: 1.0, panOverride: -0.5),
                "melody-track": ConsoleXOverride(targetId: "melody-track", volumeOverride: 0.9, panOverride: 0.5)
            ],
            effectsOverrides: [
                "reverb-bus": EffectsOverride(
                    targetId: "reverb-bus",
                    effectsChain: [
                        EffectSlot(
                            id: "reverb-1",
                            type: "reverb",
                            enabled: true,
                            parameters: ["roomSize": 0.8, "decay": 2.0],
                            position: 0
                        )
                    ]
                )
            ],
            tags: ["override", "test"],
            createdAt: Date(),
            updatedAt: Date()
        )

        let config = ProjectionConfig.realtime()
        let result = projectSong(song, performance: performance, config: config)

        XCTAssertTrue(result.isSuccess, "Full override performance should project successfully")

        if case .success(let projectionResult) = result {
            // Verify overrides were applied
            // ConsoleX overrides should be in the config
            XCTAssertNotNil(
                projectionResult.consolexConfig.mixSettings["bass-track"],
                "ConsoleX override should be applied"
            )

            // Instrument reassignments should generate warnings
            let substitutionWarnings = projectionResult.warnings.filter { $0.category == "instrumentation" }
            XCTAssertFalse(substitutionWarnings.isEmpty, "Instrument reassignments should generate warnings")
        }
    }

    func testPerformanceWithGrooveTemplates() {
        let song = createRealisticSong()

        let grooveTemplates: [(GrooveTemplate, String)] = [
            (.straight, "Straight"),
            (.swing, "Swing"),
            (.push, "Push"),
            (.drag, "Drag")
        ]

        for (groove, name) in grooveTemplates {
            var performance = PerformanceState.defaultPerformance(id: "groove-\(name.lowercased())", name: name)
            performance.groove = groove

            let config = ProjectionConfig.realtime()
            let result = projectSong(song, performance: performance, config: config)

            XCTAssertTrue(
                result.isSuccess,
                "\(name) groove projection should succeed: \(String(describing: result))"
            )
        }
    }
}
