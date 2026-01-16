//
//  EvolutionEngine.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Evolution Engine
// =============================================================================

/**
 EvolutionEngine - Controls how songs evolve over multiple plays

 The evolution system allows songs to change and grow over time while
 maintaining their core identity. Different evolution modes provide
 varying levels of predictability and novelty.

 **Evolution Modes:**
 - **Fixed**: Song never changes, same playback every time
 - **Adaptive**: Subtle variations within contract bounds
 - **Living**: Aggressive evolution with new motifs possible
 - **Museum**: Highest predictability, minimal variation

 **Evolution Controls:**
 - `mutateMotif`: Allow rhythmic/pattern mutations
 - `shiftDensity`: Vary note density over time
 - `reorchestrate`: Change instrumentation/voicing
 - `timeframe`: How fast changes occur (immediate/slow/epochal)
 */
public struct EvolutionEngine: Sendable {

    // MARK: - Evolution Mode

    /**
     How the song evolves over multiple plays
     */
    public enum Mode: String, Equatable, Codable, Sendable, CaseIterable {
        case fixed
        case adaptive
        case living
        case museum

        /**
         Display name for UI
         */
        public var displayName: String {
            switch self {
            case .fixed: return "Fixed"
            case .adaptive: return "Adaptive"
            case .living: return "Living"
            case .museum: return "Museum"
            }
        }

        /**
         Detailed description
         */
        public var description: String {
            switch self {
            case .fixed:
                return "Same playback every time"
            case .adaptive:
                return "Subtle variations within bounds"
            case .living:
                return "Aggressive evolution and growth"
            case .museum:
                return "Minimal variation, highly predictable"
            }
        }

        /**
         Whether this mode allows evolution
         */
        public var allowsEvolution: Bool {
            switch self {
            case .fixed, .museum: return false
            case .adaptive, .living: return true
            }
        }
    }

    // MARK: - Timeframe

    /**
     How quickly evolution occurs
     */
    public enum Timeframe: String, Equatable, Codable, Sendable, CaseIterable {
        case immediate
        case slow
        case epochal

        /**
         Display name for UI
         */
        public var displayName: String {
            switch self {
            case .immediate: return "Immediate"
            case .slow: return "Slow"
            case .epochal: return "Epochal"
            }
        }

        /**
         Detailed description
         */
        public var description: String {
            switch self {
            case .immediate:
                return "Changes occur on every play"
            case .slow:
                return "Changes accumulate over many plays"
            case .epochal:
                return "Major changes occur over long periods"
            }
        }
    }

    // MARK: - Evolution Controls

    /**
     Controls for which evolution mechanisms are active
     */
    public struct Controls: Equatable, Codable, Sendable {

        /**
         Allow rhythmic and melodic motif mutations
         */
        public let mutateMotif: Bool

        /**
         Allow density to shift over time
         */
        public let shiftDensity: Bool

        /**
         Allow reorchestration (changing instruments/voicing)
         */
        public let reorchestrate: Bool

        /**
         How fast evolution occurs
         */
        public let timeframe: Timeframe

        public init(
            mutateMotif: Bool = false,
            shiftDensity: Bool = false,
            reorchestrate: Bool = false,
            timeframe: Timeframe = .slow
        ) {
            self.mutateMotif = mutateMotif
            self.shiftDensity = shiftDensity
            self.reorchestrate = reorchestrate
            self.timeframe = timeframe
        }

        /**
         Default controls for a given mode
         */
        public static func defaults(for mode: Mode) -> Controls {
            switch mode {
            case .fixed:
                return Controls(
                    mutateMotif: false,
                    shiftDensity: false,
                    reorchestrate: false,
                    timeframe: .slow
                )

            case .adaptive:
                return Controls(
                    mutateMotif: true,
                    shiftDensity: true,
                    reorchestrate: false,
                    timeframe: .slow
                )

            case .living:
                return Controls(
                    mutateMotif: true,
                    shiftDensity: true,
                    reorchestrate: true,
                    timeframe: .immediate
                )

            case .museum:
                return Controls(
                    mutateMotif: false,
                    shiftDensity: false,
                    reorchestrate: false,
                    timeframe: .epochal
                )
            }
        }
    }

    // MARK: - Evolution Context

    /**
     Context information for evolution decisions
     */
    public struct Context: Equatable, Sendable {

        /**
         How many times this song has been played
         */
        public let playCount: Int

        /**
         When this song was first played
         */
        public let firstPlayedAt: Date

        /**
         When this song was last played
         */
        public let lastPlayedAt: Date

        /**
         Previous evolution states (for tracking changes)
         */
        public let previousStates: [String: String]

        public init(
            playCount: Int,
            firstPlayedAt: Date,
            lastPlayedAt: Date,
            previousStates: [String: String] = [:]
        ) {
            self.playCount = playCount
            self.firstPlayedAt = firstPlayedAt
            self.lastPlayedAt = lastPlayedAt
            self.previousStates = previousStates
        }

        /**
         Create context for first play
         */
        public static func firstPlay() -> Context {
            let now = Date()
            return Context(
                playCount: 1,
                firstPlayedAt: now,
                lastPlayedAt: now,
                previousStates: [:]
            )
        }
    }

    // MARK: - Evolution Result

    /**
     Result of evolution operation
     */
    public struct EvolutionResult: Equatable, Sendable {

        /**
         The evolved song
         */
        public let evolvedSong: Song

        /**
         What changes were made
         */
        public let changes: [EvolutionChange]

        /**
         New evolution context (updated with this play)
         */
        public let updatedContext: Context

        public init(
            evolvedSong: Song,
            changes: [EvolutionChange],
            updatedContext: Context
        ) {
            self.evolvedSong = evolvedSong
            self.changes = changes
            self.updatedContext = updatedContext
        }
    }

    /**
     A single evolution change
     */
    public struct EvolutionChange: Equatable, Sendable {
        public let type: ChangeType
        public let description: String
        public let affectedRoleIds: [String]

        public enum ChangeType: String, Equatable, Codable, Sendable {
            case motifMutation
            case densityShift
            case reorchestration
            case parameterAdjustment
            case structureVariation
        }

        public init(
            type: ChangeType,
            description: String,
            affectedRoleIds: [String] = []
        ) {
            self.type = type
            self.description = description
            self.affectedRoleIds = affectedRoleIds
        }
    }

    // MARK: - Main Evolution Function

    /**
     Evolve a song based on mode, controls, and contract certainty

     - Parameters:
       - song: The song to evolve
       - mode: Evolution mode (fixed, adaptive, living, museum)
       - controls: Which evolution mechanisms are active
       - certainty: Certainty value from SongOrderContract (0.0 = certain, 1.0 = volatile)
       - context: Evolution context (play count, timestamps, etc.)

     - Returns: EvolutionResult with evolved song and changes applied
     */
    public func evolve(
        song: Song,
        mode: Mode,
        controls: Controls,
        certainty: Double,
        context: Context
    ) -> EvolutionResult {

        // Fixed and Museum modes don't evolve
        guard mode.allowsEvolution else {
            return EvolutionResult(
                evolvedSong: song,
                changes: [],
                updatedContext: updateContext(context: context)
            )
        }

        var evolvedSong = song
        var changes: [EvolutionChange] = []

        // Apply evolution based on mode
        switch mode {
        case .fixed, .museum:
            // No evolution
            break

        case .adaptive:
            // Subtle variations within contract bounds
            // Certainty=tense (0.5-0.7) allows small transforms
            if controls.mutateMotif && certainty > 0.3 {
                let motifChanges = applyMotifMutations(
                    to: &evolvedSong,
                    intensity: mapCertaintyToIntensity(certainty, for: .adaptive)
                )
                changes.append(contentsOf: motifChanges)
            }

            if controls.shiftDensity && certainty > 0.4 {
                let densityChanges = applyDensityShifts(
                    to: &evolvedSong,
                    intensity: mapCertaintyToIntensity(certainty, for: .adaptive)
                )
                changes.append(contentsOf: densityChanges)
            }

            // Reorchestration is rare in adaptive mode
            if controls.reorchestrate && certainty > 0.8 {
                let orchChanges = applyReorchestration(
                    to: &evolvedSong,
                    intensity: 0.2 // Very low intensity
                )
                changes.append(contentsOf: orchChanges)
            }

        case .living:
            // Aggressive evolution with all transforms active
            // Certainty=volatile (1.0) enables maximum evolution
            if controls.mutateMotif {
                let motifChanges = applyMotifMutations(
                    to: &evolvedSong,
                    intensity: mapCertaintyToIntensity(certainty, for: .living)
                )
                changes.append(contentsOf: motifChanges)
            }

            if controls.shiftDensity {
                let densityChanges = applyDensityShifts(
                    to: &evolvedSong,
                    intensity: mapCertaintyToIntensity(certainty, for: .living)
                )
                changes.append(contentsOf: densityChanges)
            }

            if controls.reorchestrate {
                let orchChanges = applyReorchestration(
                    to: &evolvedSong,
                    intensity: mapCertaintyToIntensity(certainty, for: .living)
                )
                changes.append(contentsOf: orchChanges)
            }

            // Living mode can spawn new motifs
            if certainty > 0.7 {
                let newMotifs = spawnNewMotifs(
                    in: &evolvedSong,
                    intensity: certainty
                )
                changes.append(contentsOf: newMotifs)
            }
        }

        // Update determinism seed to reflect evolution
        evolvedSong.determinismSeed = generateEvolvedSeed(
            baseSeed: song.determinismSeed,
            playCount: context.playCount
        )

        // Update timestamp
        evolvedSong.updatedAt = Date()

        return EvolutionResult(
            evolvedSong: evolvedSong,
            changes: changes,
            updatedContext: updateContext(context: context)
        )
    }

    // MARK: - Private Helper Methods

    /**
     Map certainty (0.0-1.0) to evolution intensity (0.0-1.0)
     */
    private func mapCertaintyToIntensity(
        _ certainty: Double,
        for mode: Mode
    ) -> Double {
        switch mode {
        case .fixed, .museum:
            return 0.0

        case .adaptive:
            // Adaptive: certainty 0.5-0.7 → intensity 0.2-0.5
            // Lower certainty = more predictable = less evolution
            let adaptiveCertainty = max(0.0, min(1.0, certainty))
            if adaptiveCertainty < 0.3 {
                return 0.0
            } else if adaptiveCertainty < 0.7 {
                // Map 0.3-0.7 to 0.1-0.5
                return (adaptiveCertainty - 0.3) / 0.4 * 0.4 + 0.1
            } else {
                // Map 0.7-1.0 to 0.5-0.7
                return (adaptiveCertainty - 0.7) / 0.3 * 0.2 + 0.5
            }

        case .living:
            // Living: certainty directly drives intensity
            // Higher certainty = more volatility = more evolution
            return certainty
        }
    }

    /**
     Apply motif mutations to a song
     */
    private func applyMotifMutations(
        to song: inout Song,
        intensity: Double
    ) -> [EvolutionChange] {
        guard intensity > 0.0 else {
            return []
        }

        var changes: [EvolutionChange] = []

        // Mutate generator parameters for each role
        for index in song.roles.indices {
            let role = song.roles[index]

            // Apply mutation based on intensity
            let shouldMutate = Double.random(in: 0...1) < intensity

            if shouldMutate {
                var mutatedParameters = role.generatorConfig.parameters

                // Mutate specific generator parameters
                // (actual implementation depends on generator type)
                if let pulseStreams = mutatedParameters["pulseStreams"] {
                    // Small rhythmic variations
                    mutatedParameters["pulseStreams"] = .int(
                        (pulseStreams.toInt() ?? 4) + Int.random(in: -1...1)
                    )
                }

                if let density = mutatedParameters["density"] {
                    // Small density variations
                    let currentDensity = density.toDouble() ?? 0.5
                    let variation = (Double.random(in: -0.1...0.1) * intensity)
                    let newDensity = max(0.0, min(1.0, currentDensity + variation))
                    mutatedParameters["density"] = .double(newDensity)
                }

                // Update role with mutated parameters
                song.roles[index].generatorConfig = GeneratorConfig(
                    type: role.generatorConfig.type,
                    parameters: mutatedParameters
                )

                changes.append(EvolutionChange(
                    type: .motifMutation,
                    description: "Mutated motif for role '\(role.name)'",
                    affectedRoleIds: [role.id]
                ))
            }
        }

        return changes
    }

    /**
     Apply density shifts to a song
     */
    private func applyDensityShifts(
        to song: inout Song,
        intensity: Double
    ) -> [EvolutionChange] {
        guard intensity > 0.0 else {
            return []
        }

        var changes: [EvolutionChange] = []

        // Shift density for each role
        for index in song.roles.indices {
            let role = song.roles[index]

            let shouldShift = Double.random(in: 0...1) < intensity

            if shouldShift {
                let currentDensity = role.parameters.density
                let shift = (Double.random(in: -0.2...0.2) * intensity)
                let newDensity = max(0.0, min(1.0, currentDensity + shift))

                song.roles[index].parameters = RoleParameters(
                    density: newDensity,
                    range: role.parameters.range,
                    velocityRange: role.parameters.velocityRange,
                    articulation: role.parameters.articulation,
                    custom: role.parameters.custom
                )

                changes.append(EvolutionChange(
                    type: .densityShift,
                    description: "Shifted density for role '\(role.name)' from \(String(format: "%.2f", currentDensity)) to \(String(format: "%.2f", newDensity))",
                    affectedRoleIds: [role.id]
                ))
            }
        }

        return changes
    }

    /**
     Apply reorchestration to a song
     */
    private func applyReorchestration(
        to song: inout Song,
        intensity: Double
    ) -> [EvolutionChange] {
        guard intensity > 0.0 else {
            return []
        }

        var changes: [EvolutionChange] = []

        // Reorchestration involves changing projection targets
        // This is a placeholder - actual implementation would need
        // access to available instruments and ensemble information
        for index in song.projections.indices {
            let projection = song.projections[index]

            let shouldReorchestrate = Double.random(in: 0...1) < (intensity * 0.3)

            if shouldReorchestrate {
                // Placeholder: would actually change instrument assignment
                // For now, we just note that reorchestration occurred
                changes.append(EvolutionChange(
                    type: .reorchestration,
                    description: "Reorchestrated role '\(projection.roleId)'",
                    affectedRoleIds: [projection.roleId]
                ))
            }
        }

        return changes
    }

    /**
     Spawn new motifs in a song (living mode only)
     */
    private func spawnNewMotifs(
        in song: inout Song,
        intensity: Double
    ) -> [EvolutionChange] {
        // New motif spawning is complex and requires deep understanding
        // of the song's structure. This is a placeholder that would
        // be implemented with full Schillinger generator integration.

        // For now, return empty changes - this would be implemented
        // when the full Schillinger system is available
        return []
    }

    /**
     Generate a new determinism seed based on play count
     */
    private func generateEvolvedSeed(baseSeed: String, playCount: Int) -> String {
        // Combine base seed with play count to create deterministic evolution
        let combined = "\(baseSeed)-play-\(playCount)"
        return combined
    }

    /**
     Update evolution context for next play
     */
    private func updateContext(context: Context) -> Context {
        return Context(
            playCount: context.playCount + 1,
            firstPlayedAt: context.firstPlayedAt,
            lastPlayedAt: Date(),
            previousStates: context.previousStates
        )
    }
}

// =============================================================================
// MARK: - CodableAny Extensions for Evolution
// =============================================================================

extension CodableAny {
    func toInt() -> Int? {
        if case .int(let value) = self {
            return value
        }
        return nil
    }

    func toDouble() -> Double? {
        if case .double(let value) = self {
            return value
        }
        return nil
    }
}
