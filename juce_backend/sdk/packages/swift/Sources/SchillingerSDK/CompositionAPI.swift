import Foundation

// MARK: - Composition Parameters

public struct CompositionParams: Codable {
    public let name: String
    public let key: String
    public let scale: String
    public let tempo: Int
    public let timeSignature: TimeSignature
    public let style: CompositionStyle?
    public let structure: CompositionStructure?
    public let length: Int
    
    public enum CompositionStyle: String, Codable, CaseIterable {
        case classical
        case jazz
        case contemporary
        case modal
        case experimental
        case folk
        case electronic
    }
    
    public enum CompositionStructure: String, Codable, CaseIterable {
        case aaba
        case verse_chorus
        case rondo
        case sonata
        case blues
        case custom
    }
    
    public init(
        name: String,
        key: String,
        scale: String,
        tempo: Int,
        timeSignature: TimeSignature,
        style: CompositionStyle? = nil,
        structure: CompositionStructure? = nil,
        length: Int
    ) {
        self.name = name
        self.key = key
        self.scale = scale
        self.tempo = tempo
        self.timeSignature = timeSignature
        self.style = style
        self.structure = structure
        self.length = length
    }
}

// MARK: - Section Parameters

public struct SectionParams: Codable {
    public let type: SectionType
    public let length: Int
    public let key: String?
    public let tempo: Int?
    public let complexity: Double?
    public let style: String?
    
    public init(
        type: SectionType,
        length: Int,
        key: String? = nil,
        tempo: Int? = nil,
        complexity: Double? = nil,
        style: String? = nil
    ) {
        self.type = type
        self.length = length
        self.key = key
        self.tempo = tempo
        self.complexity = complexity
        self.style = style
    }
}

// MARK: - Arrangement Template

public struct ArrangementTemplate: Codable {
    public let name: String
    public let sections: [SectionTemplate]
    public let transitions: [TransitionTemplate]?
    
    public struct SectionTemplate: Codable {
        public let type: SectionType
        public let length: Int
        public let position: Int
        public let variations: [String]?
        
        public init(type: SectionType, length: Int, position: Int, variations: [String]? = nil) {
            self.type = type
            self.length = length
            self.position = position
            self.variations = variations
        }
    }
    
    public struct TransitionTemplate: Codable {
        public let fromSection: Int
        public let toSection: Int
        public let type: TransitionType
        public let length: Int
        
        public enum TransitionType: String, Codable, CaseIterable {
            case direct
            case fade
            case bridge
            case modulation
            case ritardando
            case accelerando
        }
        
        public init(fromSection: Int, toSection: Int, type: TransitionType, length: Int) {
            self.fromSection = fromSection
            self.toSection = toSection
            self.type = type
            self.length = length
        }
    }
    
    public init(name: String, sections: [SectionTemplate], transitions: [TransitionTemplate]? = nil) {
        self.name = name
        self.sections = sections
        self.transitions = transitions
    }
}

// MARK: - Variation Parameters

public struct VariationParams: Codable {
    public let type: VariationType
    public let intensity: Double?
    public let targetSections: [Int]?
    public let preserveStructure: Bool?
    
    public init(
        type: VariationType,
        intensity: Double? = nil,
        targetSections: [Int]? = nil,
        preserveStructure: Bool? = nil
    ) {
        self.type = type
        self.intensity = intensity
        self.targetSections = targetSections
        self.preserveStructure = preserveStructure
    }
}

// MARK: - Composition Analysis

public struct CompositionAnalysis: Codable {
    public let structure: StructuralAnalysis
    public let harmony: HarmonicAnalysis
    public let rhythm: RhythmAnalysis
    public let melody: MelodyAnalysis?
    public let overall: OverallAnalysis
    
    public struct StructuralAnalysis: Codable {
        public let form: String
        public let sections: [SectionAnalysis]
        public let coherence: Double
        public let balance: Double
        
        public struct SectionAnalysis: Codable {
            public let type: SectionType
            public let length: Int
            public let complexity: Double
            public let function: String
            
            public init(type: SectionType, length: Int, complexity: Double, function: String) {
                self.type = type
                self.length = length
                self.complexity = complexity
                self.function = function
            }
        }
        
        public init(form: String, sections: [SectionAnalysis], coherence: Double, balance: Double) {
            self.form = form
            self.sections = sections
            self.coherence = coherence
            self.balance = balance
        }
    }
    
    public struct OverallAnalysis: Codable {
        public let complexity: Double
        public let unity: Double
        public let variety: Double
        public let flow: Double
        public let suggestions: [String]
        
        public init(complexity: Double, unity: Double, variety: Double, flow: Double, suggestions: [String]) {
            self.complexity = complexity
            self.unity = unity
            self.variety = variety
            self.flow = flow
            self.suggestions = suggestions
        }
    }
    
    public init(
        structure: StructuralAnalysis,
        harmony: HarmonicAnalysis,
        rhythm: RhythmAnalysis,
        melody: MelodyAnalysis?,
        overall: OverallAnalysis
    ) {
        self.structure = structure
        self.harmony = harmony
        self.rhythm = rhythm
        self.melody = melody
        self.overall = overall
    }
}

// MARK: - Structure Inference

public struct StructureInference: Codable {
    public let structure: InferredStructure
    public let confidence: Double
    public let alternatives: [StructureAlternative]
    
    public struct InferredStructure: Codable {
        public let form: String
        public let sections: [InferredSection]
        public let key: String
        public let scale: String
        public let tempo: Int
        
        public struct InferredSection: Codable {
            public let type: SectionType
            public let startPosition: Int
            public let length: Int
            public let confidence: Double
            
            public init(type: SectionType, startPosition: Int, length: Int, confidence: Double) {
                self.type = type
                self.startPosition = startPosition
                self.length = length
                self.confidence = confidence
            }
        }
        
        public init(form: String, sections: [InferredSection], key: String, scale: String, tempo: Int) {
            self.form = form
            self.sections = sections
            self.key = key
            self.scale = scale
            self.tempo = tempo
        }
    }
    
    public struct StructureAlternative: Codable {
        public let structure: InferredStructure
        public let confidence: Double
        public let similarity: Double
        
        public init(structure: InferredStructure, confidence: Double, similarity: Double) {
            self.structure = structure
            self.confidence = confidence
            self.similarity = similarity
        }
    }
    
    public init(structure: InferredStructure, confidence: Double, alternatives: [StructureAlternative]) {
        self.structure = structure
        self.confidence = confidence
        self.alternatives = alternatives
    }
}

// MARK: - Composition Encoding

public struct SchillingerCompositionEncoding: Codable {
    public let rhythmEncoding: SchillingerEncoding?
    public let harmonyEncoding: SchillingerEncoding?
    public let melodyEncoding: SchillingerEncoding?
    public let structureEncoding: StructureEncoding
    public let confidence: Double
    
    public struct StructureEncoding: Codable {
        public let form: String
        public let proportions: [Double]
        public let relationships: [String]
        public let parameters: [String: AnyCodable]
        
        public init(form: String, proportions: [Double], relationships: [String], parameters: [String: AnyCodable]) {
            self.form = form
            self.proportions = proportions
            self.relationships = relationships
            self.parameters = parameters
        }
    }
    
    public init(
        rhythmEncoding: SchillingerEncoding?,
        harmonyEncoding: SchillingerEncoding?,
        melodyEncoding: SchillingerEncoding?,
        structureEncoding: StructureEncoding,
        confidence: Double
    ) {
        self.rhythmEncoding = rhythmEncoding
        self.harmonyEncoding = harmonyEncoding
        self.melodyEncoding = melodyEncoding
        self.structureEncoding = structureEncoding
        self.confidence = confidence
    }
}

// MARK: - Composition API

/// Composition API for creating, analyzing, and manipulating complete musical compositions
public class CompositionAPI {
    private weak var sdk: SchillingerSDK?
    
    internal init(sdk: SchillingerSDK) {
        self.sdk = sdk
    }
    
    // MARK: - Composition Creation
    
    /// Create a new composition
    public func create(params: CompositionParams) async -> Result<Composition, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }

        // Validate input
        guard params.length > 0 else {
            return .failure(.validation(ValidationError(field: "length", value: params.length, expected: "positive integer")))
        }

        guard params.tempo > 0 else {
            return .failure(.validation(ValidationError(field: "tempo", value: params.tempo, expected: "positive integer")))
        }
        
        let cacheKey = "composition_create_\(params.name)_\(params.key)_\(params.length)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.createCompositionOffline(params: params)
            }
            
            do {
                let bodyData = try JSONEncoder().encode(params)
                return await sdk.makeRequest(
                    endpoint: "/composition/create",
                    method: .POST,
                    body: bodyData,
                    responseType: Composition.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Generate a section for a composition
    public func generateSection(type: SectionType, params: SectionParams) async -> Result<Section, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = GenerateSectionRequest(type: type, params: params)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/composition/generate-section",
                method: .POST,
                body: bodyData,
                responseType: Section.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    /// Generate arrangement from template
    public func generateArrangement(template: ArrangementTemplate) async -> Result<Composition, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        do {
            let bodyData = try JSONEncoder().encode(template)
            return await sdk.makeRequest(
                endpoint: "/composition/generate-arrangement",
                method: .POST,
                body: bodyData,
                responseType: Composition.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    /// Apply variation to composition
    public func applyVariation(composition: Composition, variation: VariationParams) async -> Result<Composition, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = ApplyVariationRequest(composition: composition, variation: variation)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/composition/apply-variation",
                method: .POST,
                body: bodyData,
                responseType: Composition.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Composition Analysis
    
    /// Analyze complete composition
    public func analyzeComposition(composition: Composition) async -> Result<CompositionAnalysis, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "composition_analysis_\(composition.id ?? composition.name)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            do {
                let bodyData = try JSONEncoder().encode(composition)
                return await sdk.makeRequest(
                    endpoint: "/composition/analyze",
                    method: .POST,
                    body: bodyData,
                    responseType: CompositionAnalysis.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    // MARK: - Reverse Analysis
    
    /// Infer structure from musical input
    public func inferStructure(inputMelody: [Int], inputRhythm: [Int]? = nil) async -> Result<StructureInference, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "composition_infer_structure_\(inputMelody.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = InferStructureRequest(melody: inputMelody, rhythm: inputRhythm)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/composition/infer-structure",
                    method: .POST,
                    body: bodyData,
                    responseType: StructureInference.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Encode user input into Schillinger composition parameters
    public func encodeUserInput(
        melody: [Int]? = nil,
        rhythm: [Int]? = nil,
        harmony: [String]? = nil
    ) async -> Result<SchillingerCompositionEncoding, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = EncodeUserInputRequest(melody: melody, rhythm: rhythm, harmony: harmony)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/composition/encode-user-input",
                method: .POST,
                body: bodyData,
                responseType: SchillingerCompositionEncoding.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Offline Implementations
    
    private func createCompositionOffline(params: CompositionParams) async -> Result<Composition, SchillingerError> {
        // Simple offline implementation of composition creation
        let sections = generateSimpleSections(
            count: max(1, params.length / 8),
            key: params.key,
            scale: params.scale,
            tempo: params.tempo,
            timeSignature: params.timeSignature
        )
        
        let composition = Composition(
            name: params.name,
            sections: sections,
            key: params.key,
            scale: params.scale,
            tempo: params.tempo,
            timeSignature: params.timeSignature,
            metadata: CompositionMetadata(
                style: params.style?.rawValue,
                complexity: calculateCompositionComplexity(sections: sections),
                duration: Double(sections.reduce(0) { $0 + $1.length })
            )
        )
        
        return .success(composition)
    }
    
    // MARK: - Helper Methods
    
    private func generateSimpleSections(
        count: Int,
        key: String,
        scale: String,
        tempo: Int,
        timeSignature: TimeSignature
    ) -> [Section] {
        
        let sectionTypes: [SectionType] = [.intro, .verse, .chorus, .bridge, .outro]
        var sections: [Section] = []
        
        for i in 0..<count {
            let sectionType = sectionTypes[i % sectionTypes.count]
            
            // Generate simple rhythm pattern
            let rhythmPattern = RhythmPattern(
                durations: [1, 1, 2, 1, 1, 2],
                timeSignature: timeSignature,
                tempo: tempo
            )
            
            // Generate simple chord progression
            let chords = generateSimpleChords(key: key, scale: scale, length: 4)
            let chordProgression = ChordProgression(
                chords: chords,
                key: key,
                scale: scale
            )
            
            // Generate simple melody
            let melodyNotes = generateSimpleMelodyNotes(key: key, length: 8)
            let melodyDurations = [1, 1, 2, 1, 1, 2, 2]
            let melody = MelodyLine(
                notes: melodyNotes,
                durations: melodyDurations,
                key: key,
                scale: scale
            )
            
            let section = Section(
                type: sectionType,
                rhythm: rhythmPattern,
                harmony: chordProgression,
                melody: melody,
                length: 8,
                position: i * 8
            )
            
            sections.append(section)
        }
        
        return sections
    }
    
    private func generateSimpleChords(key: String, scale: String, length: Int) -> [String] {
        // Simple chord progressions based on key
        let majorProgressions = [
            [key, key + "maj7", key + "6", key],
            [key, "F", "C", "G"],
            [key, "Am", "F", "G"]
        ]
        
        let progression = majorProgressions.randomElement() ?? [key]
        var chords: [String] = []
        
        for i in 0..<length {
            let chordIndex = i % progression.count
            chords.append(progression[chordIndex])
        }
        
        return chords
    }
    
    private func generateSimpleMelodyNotes(key: String, length: Int) -> [Int] {
        // Simple melody in C major (can be extended for other keys)
        let scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72] // C major scale
        
        var notes: [Int] = []
        for _ in 0..<length {
            notes.append(scaleNotes.randomElement() ?? 60)
        }
        
        return notes
    }
    
    private func calculateCompositionComplexity(sections: [Section]) -> Double {
        guard !sections.isEmpty else { return 0.0 }
        
        let sectionComplexities = sections.map { section in
            let rhythmComplexity = Double(Set(section.rhythm.durations).count) / Double(section.rhythm.durations.count)
            let harmonyComplexity = Double(Set(section.harmony.chords).count) / Double(section.harmony.chords.count)
            return (rhythmComplexity + harmonyComplexity) / 2.0
        }
        
        return sectionComplexities.reduce(0, +) / Double(sectionComplexities.count)
    }
}

// MARK: - Request Models

private struct GenerateSectionRequest: Codable {
    let type: SectionType
    let params: SectionParams
}

private struct ApplyVariationRequest: Codable {
    let composition: Composition
    let variation: VariationParams
}

private struct InferStructureRequest: Codable {
    let melody: [Int]
    let rhythm: [Int]?
}

private struct EncodeUserInputRequest: Codable {
    let melody: [Int]?
    let rhythm: [Int]?
    let harmony: [String]?
}