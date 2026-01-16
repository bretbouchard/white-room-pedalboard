import Foundation

// MARK: - Harmony Generation Parameters

public struct HarmonyGenerationParams: Codable {
    public let key: String
    public let scale: String
    public let length: Int
    public let style: HarmonyStyle?
    public let complexity: Double?
    public let voiceLeading: VoiceLeadingStyle?
    
    public enum HarmonyStyle: String, Codable, CaseIterable {
        case classical
        case jazz
        case contemporary
        case modal
        case experimental
    }
    
    public enum VoiceLeadingStyle: String, Codable, CaseIterable {
        case smooth
        case contrary
        case parallel
        case oblique
    }
    
    public init(
        key: String,
        scale: String,
        length: Int,
        style: HarmonyStyle? = nil,
        complexity: Double? = nil,
        voiceLeading: VoiceLeadingStyle? = nil
    ) {
        self.key = key
        self.scale = scale
        self.length = length
        self.style = style
        self.complexity = complexity
        self.voiceLeading = voiceLeading
    }
}

// MARK: - Harmonic Context

public struct HarmonicContext: Codable {
    public let key: String
    public let scale: String
    public let previousChords: [String]?
    public let targetFunction: String?
    
    public init(key: String, scale: String, previousChords: [String]? = nil, targetFunction: String? = nil) {
        self.key = key
        self.scale = scale
        self.previousChords = previousChords
        self.targetFunction = targetFunction
    }
}

// MARK: - Chord Resolution

public struct ChordResolution: Codable {
    public let resolvedChord: String
    public let function: String
    public let tension: Double
    public let voiceLeading: VoiceLeading
    public let alternatives: [String]
    
    public init(resolvedChord: String, function: String, tension: Double, voiceLeading: VoiceLeading, alternatives: [String]) {
        self.resolvedChord = resolvedChord
        self.function = function
        self.tension = tension
        self.voiceLeading = voiceLeading
        self.alternatives = alternatives
    }
}

// MARK: - Harmonic Inference

public struct HarmonicInference: Codable {
    public let structure: HarmonicStructure
    public let confidence: Double
    public let alternatives: [HarmonicAlternative]
    
    public struct HarmonicStructure: Codable {
        public let key: String
        public let scale: String
        public let functions: [String]
        public let tensions: [Double]
        
        public init(key: String, scale: String, functions: [String], tensions: [Double]) {
            self.key = key
            self.scale = scale
            self.functions = functions
            self.tensions = tensions
        }
    }
    
    public struct HarmonicAlternative: Codable {
        public let structure: HarmonicStructure
        public let confidence: Double
        public let similarity: Double
        
        public init(structure: HarmonicStructure, confidence: Double, similarity: Double) {
            self.structure = structure
            self.confidence = confidence
            self.similarity = similarity
        }
    }
    
    public init(structure: HarmonicStructure, confidence: Double, alternatives: [HarmonicAlternative]) {
        self.structure = structure
        self.confidence = confidence
        self.alternatives = alternatives
    }
}

// MARK: - Harmonic Match

public struct HarmonicMatch: Codable {
    public let progression: ChordProgression
    public let confidence: Double
    public let similarity: Double
    public let analysis: HarmonicMatchAnalysis
    
    public struct HarmonicMatchAnalysis: Codable {
        public let functionalSimilarity: Double
        public let voiceLeadingSimilarity: Double
        public let tensionSimilarity: Double
        public let keySimilarity: Double
        
        public init(functionalSimilarity: Double, voiceLeadingSimilarity: Double, tensionSimilarity: Double, keySimilarity: Double) {
            self.functionalSimilarity = functionalSimilarity
            self.voiceLeadingSimilarity = voiceLeadingSimilarity
            self.tensionSimilarity = tensionSimilarity
            self.keySimilarity = keySimilarity
        }
    }
    
    public init(progression: ChordProgression, confidence: Double, similarity: Double, analysis: HarmonicMatchAnalysis) {
        self.progression = progression
        self.confidence = confidence
        self.similarity = similarity
        self.analysis = analysis
    }
}

// MARK: - Harmony API

/// Harmony API for chord progression generation, analysis, and reverse analysis
public class HarmonyAPI {
    private weak var sdk: SchillingerSDK?
    
    internal init(sdk: SchillingerSDK) {
        self.sdk = sdk
    }
    
    // MARK: - Progression Generation
    
    /// Generate chord progression
    public func generateProgression(key: String, scale: String, length: Int) async -> Result<ChordProgression, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }

        // Validate input
        guard length > 0 else {
            return .failure(.validation(ValidationError(field: "length", value: length, expected: "positive integer")))
        }
        
        let cacheKey = "harmony_progression_\(key)_\(scale)_\(length)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.generateProgressionOffline(key: key, scale: scale, length: length)
            }
            
            let params = HarmonyGenerationParams(key: key, scale: scale, length: length)
            
            do {
                let bodyData = try JSONEncoder().encode(params)
                return await sdk.makeRequest(
                    endpoint: "/harmony/generate-progression",
                    method: .POST,
                    body: bodyData,
                    responseType: ChordProgression.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Generate progression variations
    public func generateVariations(progression: ChordProgression) async -> Result<[ChordProgression], SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        do {
            let bodyData = try JSONEncoder().encode(progression)
            return await sdk.makeRequest(
                endpoint: "/harmony/generate-variations",
                method: .POST,
                body: bodyData,
                responseType: [ChordProgression].self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    /// Resolve chord in context
    public func resolveChord(chord: String, context: HarmonicContext) async -> Result<ChordResolution, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = ResolveChordRequest(chord: chord, context: context)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/harmony/resolve-chord",
                method: .POST,
                body: bodyData,
                responseType: ChordResolution.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Progression Analysis
    
    /// Analyze chord progression
    public func analyzeProgression(chords: [String]) async -> Result<HarmonicAnalysis, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "harmony_analysis_\(chords.joined(separator: "_"))"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = AnalyzeProgressionRequest(chords: chords)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/harmony/analyze-progression",
                    method: .POST,
                    body: bodyData,
                    responseType: HarmonicAnalysis.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    // MARK: - Reverse Analysis
    
    /// Infer harmonic structure from chord progression
    public func inferHarmonicStructure(chords: [String]) async -> Result<HarmonicInference, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "harmony_infer_structure_\(chords.joined(separator: "_"))"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = InferStructureRequest(chords: chords)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/harmony/infer-structure",
                    method: .POST,
                    body: bodyData,
                    responseType: HarmonicInference.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Encode progression into Schillinger parameters
    public func encodeProgression(inputChords: [String]) async -> Result<SchillingerEncoding, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "harmony_encode_progression_\(inputChords.joined(separator: "_"))"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = EncodeProgressionRequest(chords: inputChords)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/harmony/encode-progression",
                    method: .POST,
                    body: bodyData,
                    responseType: SchillingerEncoding.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Find harmonic matches for target progression
    public func findHarmonicMatches(targetProgression: ChordProgression) async -> Result<[HarmonicMatch], SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = FindHarmonicMatchesRequest(targetProgression: targetProgression)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/harmony/find-matches",
                method: .POST,
                body: bodyData,
                responseType: [HarmonicMatch].self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Offline Implementations
    
    private func generateProgressionOffline(key: String, scale: String, length: Int) async -> Result<ChordProgression, SchillingerError> {
        // Simple offline implementation of chord progression generation
        let chords = generateSimpleProgression(key: key, scale: scale, length: length)
        
        let progression = ChordProgression(
            chords: chords,
            key: key,
            scale: scale,
            metadata: HarmonyMetadata(
                functions: generateFunctions(for: chords),
                tensions: generateTensions(for: chords),
                voiceLeading: VoiceLeading(quality: 0.7, smoothness: 0.8)
            )
        )
        
        return .success(progression)
    }
    
    // MARK: - Helper Methods
    
    private func generateSimpleProgression(key: String, scale: String, length: Int) -> [String] {
        // Simple progression patterns based on common chord progressions
        let majorProgressions = [
            ["I", "V", "vi", "IV"],
            ["I", "vi", "IV", "V"],
            ["vi", "IV", "I", "V"],
            ["I", "IV", "vi", "V"]
        ]
        
        let minorProgressions = [
            ["i", "VII", "VI", "VII"],
            ["i", "iv", "VII", "III"],
            ["i", "VI", "III", "VII"],
            ["i", "iv", "v", "i"]
        ]
        
        let progressions = scale.lowercased().contains("minor") ? minorProgressions : majorProgressions
        let baseProgression = progressions.randomElement() ?? majorProgressions[0]
        
        var chords: [String] = []
        for i in 0..<length {
            let chordIndex = i % baseProgression.count
            let romanNumeral = baseProgression[chordIndex]
            let chord = convertRomanNumeralToChord(romanNumeral, key: key, scale: scale)
            chords.append(chord)
        }
        
        return chords
    }
    
    private func convertRomanNumeralToChord(_ romanNumeral: String, key: String, scale: String) -> String {
        // Simple conversion from Roman numerals to chord names
        // This is a simplified implementation
        let majorScale = ["C", "D", "E", "F", "G", "A", "B"]
        let keyIndex = majorScale.firstIndex(of: key) ?? 0
        
        switch romanNumeral {
        case "I", "i":
            return key
        case "ii", "II":
            let index = (keyIndex + 1) % 7
            return majorScale[index] + (romanNumeral == "ii" ? "m" : "")
        case "iii", "III":
            let index = (keyIndex + 2) % 7
            return majorScale[index] + (romanNumeral == "iii" ? "m" : "")
        case "IV", "iv":
            let index = (keyIndex + 3) % 7
            return majorScale[index] + (romanNumeral == "iv" ? "m" : "")
        case "V", "v":
            let index = (keyIndex + 4) % 7
            return majorScale[index] + (romanNumeral == "v" ? "m" : "")
        case "vi", "VI":
            let index = (keyIndex + 5) % 7
            return majorScale[index] + (romanNumeral == "vi" ? "m" : "")
        case "vii", "VII":
            let index = (keyIndex + 6) % 7
            return majorScale[index] + (romanNumeral == "vii" ? "dim" : "")
        default:
            return key
        }
    }
    
    private func generateFunctions(for chords: [String]) -> [String] {
        // Simple function analysis
        return chords.map { chord in
            if chord.contains("m") {
                return "tonic"
            } else if chord.contains("7") {
                return "dominant"
            } else {
                return "subdominant"
            }
        }
    }
    
    private func generateTensions(for chords: [String]) -> [Int] {
        // Simple tension analysis
        return chords.map { chord in
            if chord.contains("7") {
                return 7
            } else if chord.contains("9") {
                return 9
            } else {
                return 0
            }
        }
    }
}

// MARK: - Request Models

private struct ResolveChordRequest: Codable {
    let chord: String
    let context: HarmonicContext
}

private struct AnalyzeProgressionRequest: Codable {
    let chords: [String]
}

private struct InferStructureRequest: Codable {
    let chords: [String]
}

private struct EncodeProgressionRequest: Codable {
    let chords: [String]
}

private struct FindHarmonicMatchesRequest: Codable {
    let targetProgression: ChordProgression
}