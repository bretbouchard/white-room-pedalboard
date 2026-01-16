import Foundation

// MARK: - Melody Generation Parameters

public struct MelodyGenerationParams: Codable {
    public let key: String
    public let scale: String
    public let length: Int
    public let range: MelodyRange?
    public let contour: ContourType?
    public let style: MelodyStyle?
    public let complexity: Double?
    
    public struct MelodyRange: Codable {
        public let low: Int
        public let high: Int
        
        public init(low: Int, high: Int) {
            self.low = low
            self.high = high
        }
    }
    
    public enum ContourType: String, Codable, CaseIterable {
        case ascending
        case descending
        case arch
        case valley
        case wave
        case random
    }
    
    public enum MelodyStyle: String, Codable, CaseIterable {
        case classical
        case jazz
        case contemporary
        case modal
        case experimental
    }
    
    public init(
        key: String,
        scale: String,
        length: Int,
        range: MelodyRange? = nil,
        contour: ContourType? = nil,
        style: MelodyStyle? = nil,
        complexity: Double? = nil
    ) {
        self.key = key
        self.scale = scale
        self.length = length
        self.range = range
        self.contour = contour
        self.style = style
        self.complexity = complexity
    }
}

// MARK: - Melody Analysis

public struct MelodyAnalysis: Codable {
    public let contour: String
    public let intervalPattern: [Int]
    public let complexity: Double
    public let range: Int
    public let averageInterval: Double
    public let direction: String
    public let suggestions: [String]
    
    public init(
        contour: String,
        intervalPattern: [Int],
        complexity: Double,
        range: Int,
        averageInterval: Double,
        direction: String,
        suggestions: [String]
    ) {
        self.contour = contour
        self.intervalPattern = intervalPattern
        self.complexity = complexity
        self.range = range
        self.averageInterval = averageInterval
        self.direction = direction
        self.suggestions = suggestions
    }
}

// MARK: - Melodic Inference

public struct MelodicInference: Codable {
    public let structure: MelodicStructure
    public let confidence: Double
    public let alternatives: [MelodicAlternative]
    
    public struct MelodicStructure: Codable {
        public let key: String
        public let scale: String
        public let contour: String
        public let intervalPattern: [Int]
        public let motifs: [Motif]
        
        public struct Motif: Codable {
            public let notes: [Int]
            public let position: Int
            public let length: Int
            public let repetitions: Int
            
            public init(notes: [Int], position: Int, length: Int, repetitions: Int) {
                self.notes = notes
                self.position = position
                self.length = length
                self.repetitions = repetitions
            }
        }
        
        public init(key: String, scale: String, contour: String, intervalPattern: [Int], motifs: [Motif]) {
            self.key = key
            self.scale = scale
            self.contour = contour
            self.intervalPattern = intervalPattern
            self.motifs = motifs
        }
    }
    
    public struct MelodicAlternative: Codable {
        public let structure: MelodicStructure
        public let confidence: Double
        public let similarity: Double
        
        public init(structure: MelodicStructure, confidence: Double, similarity: Double) {
            self.structure = structure
            self.confidence = confidence
            self.similarity = similarity
        }
    }
    
    public init(structure: MelodicStructure, confidence: Double, alternatives: [MelodicAlternative]) {
        self.structure = structure
        self.confidence = confidence
        self.alternatives = alternatives
    }
}

// MARK: - Melodic Match

public struct MelodicMatch: Codable {
    public let melody: MelodyLine
    public let confidence: Double
    public let similarity: Double
    public let analysis: MelodicMatchAnalysis
    
    public struct MelodicMatchAnalysis: Codable {
        public let contourSimilarity: Double
        public let intervalSimilarity: Double
        public let rhythmSimilarity: Double
        public let keySimilarity: Double
        
        public init(contourSimilarity: Double, intervalSimilarity: Double, rhythmSimilarity: Double, keySimilarity: Double) {
            self.contourSimilarity = contourSimilarity
            self.intervalSimilarity = intervalSimilarity
            self.rhythmSimilarity = rhythmSimilarity
            self.keySimilarity = keySimilarity
        }
    }
    
    public init(melody: MelodyLine, confidence: Double, similarity: Double, analysis: MelodicMatchAnalysis) {
        self.melody = melody
        self.confidence = confidence
        self.similarity = similarity
        self.analysis = analysis
    }
}

// MARK: - Melody API

/// Melody API for melodic line generation, analysis, and reverse analysis
public class MelodyAPI {
    private weak var sdk: SchillingerSDK?
    
    internal init(sdk: SchillingerSDK) {
        self.sdk = sdk
    }
    
    // MARK: - Melody Generation
    
    /// Generate melody line
    public func generateMelody(params: MelodyGenerationParams) async -> Result<MelodyLine, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }

        // Validate input
        guard params.length > 0 else {
            return .failure(.validation(ValidationError(field: "length", value: params.length, expected: "positive integer")))
        }
        
        let cacheKey = "melody_generate_\(params.key)_\(params.scale)_\(params.length)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.generateMelodyOffline(params: params)
            }
            
            do {
                let bodyData = try JSONEncoder().encode(params)
                return await sdk.makeRequest(
                    endpoint: "/melody/generate",
                    method: .POST,
                    body: bodyData,
                    responseType: MelodyLine.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Generate melody variations
    public func generateVariations(melody: MelodyLine, type: VariationType) async -> Result<MelodyLine, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "melody_variation_\(melody.notes.description)_\(type.rawValue)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.generateVariationOffline(melody: melody, type: type)
            }
            
            let requestBody = GenerateVariationRequest(melody: melody, type: type)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/melody/generate-variation",
                    method: .POST,
                    body: bodyData,
                    responseType: MelodyLine.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Harmonize melody with chord progression
    public func harmonizeMelody(melody: MelodyLine, progression: ChordProgression) async -> Result<Composition, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = HarmonizeMelodyRequest(melody: melody, progression: progression)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/melody/harmonize",
                method: .POST,
                body: bodyData,
                responseType: Composition.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Melody Analysis
    
    /// Analyze melody line
    public func analyzeMelody(melody: MelodyLine) async -> Result<MelodyAnalysis, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "melody_analysis_\(melody.notes.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.analyzeMelodyOffline(melody: melody)
            }
            
            do {
                let bodyData = try JSONEncoder().encode(melody)
                return await sdk.makeRequest(
                    endpoint: "/melody/analyze",
                    method: .POST,
                    body: bodyData,
                    responseType: MelodyAnalysis.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    // MARK: - Reverse Analysis
    
    /// Infer melodic structure from melody line
    public func inferStructure(inputMelody: [Int], inputRhythm: [Int]? = nil) async -> Result<MelodicInference, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "melody_infer_structure_\(inputMelody.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = InferStructureRequest(melody: inputMelody, rhythm: inputRhythm)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/melody/infer-structure",
                    method: .POST,
                    body: bodyData,
                    responseType: MelodicInference.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Encode melody into Schillinger parameters
    public func encodeMelody(inputMelody: [Int]) async -> Result<SchillingerEncoding, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "melody_encode_\(inputMelody.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = EncodeMelodyRequest(melody: inputMelody)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/melody/encode",
                    method: .POST,
                    body: bodyData,
                    responseType: SchillingerEncoding.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Find melodic matches for target melody
    public func findMelodicMatches(targetMelody: MelodyLine) async -> Result<[MelodicMatch], SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = FindMelodicMatchesRequest(targetMelody: targetMelody)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/melody/find-matches",
                method: .POST,
                body: bodyData,
                responseType: [MelodicMatch].self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Offline Implementations
    
    private func generateMelodyOffline(params: MelodyGenerationParams) async -> Result<MelodyLine, SchillingerError> {
        // Simple offline implementation of melody generation
        let notes = generateSimpleMelody(
            key: params.key,
            scale: params.scale,
            length: params.length,
            contour: params.contour,
            range: params.range
        )
        
        let durations = generateSimpleRhythm(length: params.length)
        
        let melody = MelodyLine(
            notes: notes,
            durations: durations,
            key: params.key,
            scale: params.scale,
            metadata: MelodyMetadata(
                contour: params.contour?.rawValue,
                intervalPattern: calculateIntervals(notes: notes),
                complexity: calculateMelodyComplexity(notes: notes)
            )
        )
        
        return .success(melody)
    }
    
    private func generateVariationOffline(melody: MelodyLine, type: VariationType) async -> Result<MelodyLine, SchillingerError> {
        let variatedNotes: [Int]
        let variatedDurations: [Int]
        
        switch type {
        case .inversion:
            variatedNotes = invertMelody(melody.notes)
            variatedDurations = melody.durations
        case .retrograde:
            variatedNotes = Array(melody.notes.reversed())
            variatedDurations = Array(melody.durations.reversed())
        case .augmentation:
            variatedNotes = melody.notes
            variatedDurations = melody.durations.map { $0 * 2 }
        case .diminution:
            variatedNotes = melody.notes
            variatedDurations = melody.durations.map { max(1, $0 / 2) }
        case .transposition:
            variatedNotes = transposeMelody(melody.notes, semitones: 2)
            variatedDurations = melody.durations
        default:
            variatedNotes = melody.notes
            variatedDurations = melody.durations
        }
        
        let variatedMelody = MelodyLine(
            id: melody.id,
            notes: variatedNotes,
            durations: variatedDurations,
            key: melody.key,
            scale: melody.scale,
            metadata: MelodyMetadata(
                contour: melody.metadata?.contour,
                intervalPattern: calculateIntervals(notes: variatedNotes),
                complexity: calculateMelodyComplexity(notes: variatedNotes)
            )
        )
        
        return .success(variatedMelody)
    }
    
    private func analyzeMelodyOffline(melody: MelodyLine) async -> Result<MelodyAnalysis, SchillingerError> {
        let intervalPattern = calculateIntervals(notes: melody.notes)
        let complexity = calculateMelodyComplexity(notes: melody.notes)
        let range = (melody.notes.max() ?? 0) - (melody.notes.min() ?? 0)
        let averageInterval = Double(intervalPattern.reduce(0, +)) / Double(max(intervalPattern.count, 1))
        let direction = determineDirection(intervals: intervalPattern)
        let contour = determineContour(notes: melody.notes)
        
        let analysis = MelodyAnalysis(
            contour: contour,
            intervalPattern: intervalPattern,
            complexity: complexity,
            range: range,
            averageInterval: averageInterval,
            direction: direction,
            suggestions: generateMelodySuggestions(complexity: complexity, range: range)
        )
        
        return .success(analysis)
    }
    
    // MARK: - Helper Methods
    
    private func generateSimpleMelody(key: String, scale: String, length: Int, contour: MelodyGenerationParams.ContourType?, range: MelodyGenerationParams.MelodyRange?) -> [Int] {
        // Simple scale degrees for C major (can be extended for other keys/scales)
        let scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72] // C major scale in MIDI notes
        
        let actualRange = range ?? MelodyGenerationParams.MelodyRange(low: 60, high: 72)
        let filteredNotes = scaleNotes.filter { $0 >= actualRange.low && $0 <= actualRange.high }
        
        var notes: [Int] = []
        
        switch contour {
        case .ascending:
            for i in 0..<length {
                let index = min(i * filteredNotes.count / length, filteredNotes.count - 1)
                notes.append(filteredNotes[index])
            }
        case .descending:
            for i in 0..<length {
                let index = max(filteredNotes.count - 1 - (i * filteredNotes.count / length), 0)
                notes.append(filteredNotes[index])
            }
        case .arch:
            let midpoint = length / 2
            for i in 0..<length {
                let distance = abs(i - midpoint)
                let index = min(distance * filteredNotes.count / midpoint, filteredNotes.count - 1)
                notes.append(filteredNotes[filteredNotes.count - 1 - index])
            }
        default:
            // Random or default
            for _ in 0..<length {
                notes.append(filteredNotes.randomElement() ?? 60)
            }
        }
        
        return notes
    }
    
    private func generateSimpleRhythm(length: Int) -> [Int] {
        // Simple rhythm pattern
        let rhythmPatterns = [[1, 1, 2], [2, 1, 1], [1, 2, 1], [4]]
        let pattern = rhythmPatterns.randomElement() ?? [1]
        
        var durations: [Int] = []
        for i in 0..<length {
            let index = i % pattern.count
            durations.append(pattern[index])
        }
        
        return durations
    }
    
    private func calculateIntervals(notes: [Int]) -> [Int] {
        guard notes.count > 1 else { return [] }
        
        var intervals: [Int] = []
        for i in 1..<notes.count {
            intervals.append(notes[i] - notes[i-1])
        }
        
        return intervals
    }
    
    private func calculateMelodyComplexity(notes: [Int]) -> Double {
        guard !notes.isEmpty else { return 0.0 }
        
        let intervals = calculateIntervals(notes: notes)
        let uniqueIntervals = Set(intervals).count
        let totalIntervals = intervals.count
        
        if totalIntervals == 0 { return 0.0 }
        
        let intervalVariety = Double(uniqueIntervals) / Double(totalIntervals)
        let averageInterval = Double(intervals.map(abs).reduce(0, +)) / Double(totalIntervals)
        
        // Normalize complexity between 0 and 1
        return min((intervalVariety + averageInterval / 12.0) / 2.0, 1.0)
    }
    
    private func invertMelody(_ notes: [Int]) -> [Int] {
        guard let first = notes.first else { return notes }
        return notes.map { first + (first - $0) }
    }
    
    private func transposeMelody(_ notes: [Int], semitones: Int) -> [Int] {
        return notes.map { $0 + semitones }
    }
    
    private func determineDirection(intervals: [Int]) -> String {
        let ascending = intervals.filter { $0 > 0 }.count
        let descending = intervals.filter { $0 < 0 }.count
        
        if ascending > descending {
            return "ascending"
        } else if descending > ascending {
            return "descending"
        } else {
            return "balanced"
        }
    }
    
    private func determineContour(notes: [Int]) -> String {
        guard notes.count > 2 else { return "linear" }
        
        let intervals = calculateIntervals(notes: notes)
        let changes = zip(intervals.dropLast(), intervals.dropFirst()).map { $0.0 * $0.1 < 0 ? 1 : 0 }.reduce(0, +)
        
        if changes <= 1 {
            return "linear"
        } else if changes <= 3 {
            return "arch"
        } else {
            return "wave"
        }
    }
    
    private func generateMelodySuggestions(complexity: Double, range: Int) -> [String] {
        var suggestions: [String] = []
        
        if complexity > 0.8 {
            suggestions.append("Consider simplifying the melody for better singability")
        }
        
        if range > 12 {
            suggestions.append("Large range may be difficult to perform")
        }
        
        if range < 5 {
            suggestions.append("Consider expanding the melodic range for more interest")
        }
        
        return suggestions
    }
}

// MARK: - Request Models

private struct GenerateVariationRequest: Codable {
    let melody: MelodyLine
    let type: VariationType
}

private struct HarmonizeMelodyRequest: Codable {
    let melody: MelodyLine
    let progression: ChordProgression
}

private struct InferStructureRequest: Codable {
    let melody: [Int]
    let rhythm: [Int]?
}

private struct EncodeMelodyRequest: Codable {
    let melody: [Int]
}

private struct FindMelodicMatchesRequest: Codable {
    let targetMelody: MelodyLine
}