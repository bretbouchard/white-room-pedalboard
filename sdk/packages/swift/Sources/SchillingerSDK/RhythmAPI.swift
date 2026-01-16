import Foundation

// MARK: - Rhythm Generation Parameters

public struct RhythmGenerationParams: Codable {
    public let generators: Generators?
    public let length: Int?
    public let timeSignature: TimeSignature?
    public let tempo: Int?
    public let swing: Double?
    public let complexity: Double?
    public let style: RhythmStyle?
    
    public enum RhythmStyle: String, Codable, CaseIterable {
        case classical
        case jazz
        case contemporary
        case modal
        case experimental
    }
    
    public init(
        generators: Generators? = nil,
        length: Int? = nil,
        timeSignature: TimeSignature? = nil,
        tempo: Int? = nil,
        swing: Double? = nil,
        complexity: Double? = nil,
        style: RhythmStyle? = nil
    ) {
        self.generators = generators
        self.length = length
        self.timeSignature = timeSignature
        self.tempo = tempo
        self.swing = swing
        self.complexity = complexity
        self.style = style
    }
}

// MARK: - Schillinger Match

public struct SchillingerMatch: Codable, Equatable {
    public let generators: Generators
    public let confidence: Double
    public let pattern: RhythmPattern
    public let similarity: Double
    public let analysis: MatchAnalysis
    
    public struct MatchAnalysis: Codable, Equatable {
        public let patternSimilarity: Double
        public let lengthMatch: Double
        public let accentMatch: Double
        public let densityMatch: Double
        
        public init(patternSimilarity: Double, lengthMatch: Double, accentMatch: Double, densityMatch: Double) {
            self.patternSimilarity = patternSimilarity
            self.lengthMatch = lengthMatch
            self.accentMatch = accentMatch
            self.densityMatch = densityMatch
        }
    }
    
    public init(generators: Generators, confidence: Double, pattern: RhythmPattern, similarity: Double, analysis: MatchAnalysis) {
        self.generators = generators
        self.confidence = confidence
        self.pattern = pattern
        self.similarity = similarity
        self.analysis = analysis
    }
}

// MARK: - Fit Options

public struct FitOptions: Codable {
    public let maxResults: Int?
    public let minConfidence: Double?
    public let allowApproximation: Bool?
    public let maxGenerator: Int?
    public let weightAccents: Double?
    public let weightDensity: Double?
    public let weightLength: Double?
    
    public init(
        maxResults: Int? = nil,
        minConfidence: Double? = nil,
        allowApproximation: Bool? = nil,
        maxGenerator: Int? = nil,
        weightAccents: Double? = nil,
        weightDensity: Double? = nil,
        weightLength: Double? = nil
    ) {
        self.maxResults = maxResults
        self.minConfidence = minConfidence
        self.allowApproximation = allowApproximation
        self.maxGenerator = maxGenerator
        self.weightAccents = weightAccents
        self.weightDensity = weightDensity
        self.weightLength = weightLength
    }
}

// MARK: - Pattern Validation

public struct PatternValidationResult: Codable {
    public let valid: Bool
    public let errors: [String]
    public let warnings: [String]
    public let suggestions: [String]
    
    public init(valid: Bool, errors: [String], warnings: [String], suggestions: [String]) {
        self.valid = valid
        self.errors = errors
        self.warnings = warnings
        self.suggestions = suggestions
    }
}

// MARK: - Pattern Statistics

public struct PatternStats: Codable {
    public let totalDuration: Int
    public let averageDuration: Double
    public let uniqueValues: Int
    public let density: Double
    public let complexity: Double
    public let syncopation: Double
    
    public init(totalDuration: Int, averageDuration: Double, uniqueValues: Int, density: Double, complexity: Double, syncopation: Double) {
        self.totalDuration = totalDuration
        self.averageDuration = averageDuration
        self.uniqueValues = uniqueValues
        self.density = density
        self.complexity = complexity
        self.syncopation = syncopation
    }
}

// MARK: - Rhythm API

/// Rhythm API for pattern generation, analysis, and reverse analysis
public class RhythmAPI {
    private weak var sdk: SchillingerSDK?
    
    internal init(sdk: SchillingerSDK) {
        self.sdk = sdk
    }
    
    // MARK: - Pattern Generation
    
    /// Generate rhythmic resultant from two generators
    public func generateResultant(a: Int, b: Int) async -> Result<RhythmPattern, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }

        // Validate input
        guard a > 0 && b > 0 else {
            return .failure(.validation(ValidationError(field: "generators", value: [a, b], expected: "positive integers")))
        }
        
        let cacheKey = "rhythm_resultant_\(a)_\(b)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.generateResultantOffline(a: a, b: b)
            }
            
            let requestBody = GenerateResultantRequest(a: a, b: b)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/rhythm/generate-resultant",
                    method: .POST,
                    body: bodyData,
                    responseType: RhythmPattern.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Generate rhythm variation
    public func generateVariation(pattern: RhythmPattern, type: VariationType) async -> Result<RhythmPattern, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "rhythm_variation_\(pattern.durations.description)_\(type.rawValue)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            // Check if this can be computed offline
            let offlineMode = await sdk.isOfflineMode
            if offlineMode {
                return await self.generateVariationOffline(pattern: pattern, type: type)
            }
            
            let requestBody = GenerateVariationRequest(pattern: pattern, type: type)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/rhythm/generate-variation",
                    method: .POST,
                    body: bodyData,
                    responseType: RhythmPattern.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Generate complex rhythm pattern
    public func generateComplex(params: RhythmGenerationParams) async -> Result<RhythmPattern, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        do {
            let bodyData = try JSONEncoder().encode(params)
            return await sdk.makeRequest(
                endpoint: "/rhythm/generate-complex",
                method: .POST,
                body: bodyData,
                responseType: RhythmPattern.self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Pattern Analysis
    
    /// Analyze rhythm pattern
    public func analyzePattern(pattern: RhythmPattern) async -> Result<RhythmAnalysis, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "rhythm_analysis_\(pattern.durations.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            do {
                let bodyData = try JSONEncoder().encode(pattern)
                return await sdk.makeRequest(
                    endpoint: "/rhythm/analyze-pattern",
                    method: .POST,
                    body: bodyData,
                    responseType: RhythmAnalysis.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Validate rhythm pattern
    public func validatePattern(pattern: RhythmPattern) async -> Result<PatternValidationResult, SchillingerError> {
        // This can be done offline
        return await validatePatternOffline(pattern: pattern)
    }
    
    /// Get pattern statistics
    public func getPatternStats(pattern: RhythmPattern) async -> Result<PatternStats, SchillingerError> {
        // This can be computed offline
        return await getPatternStatsOffline(pattern: pattern)
    }
    
    // MARK: - Reverse Analysis
    
    /// Infer generators from rhythm pattern
    public func inferGenerators(pattern: RhythmPattern) async -> Result<GeneratorInference, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "rhythm_infer_generators_\(pattern.durations.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            do {
                let bodyData = try JSONEncoder().encode(pattern)
                return await sdk.makeRequest(
                    endpoint: "/rhythm/infer-generators",
                    method: .POST,
                    body: bodyData,
                    responseType: GeneratorInference.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Encode pattern into Schillinger parameters
    public func encodePattern(inputPattern: [Int]) async -> Result<SchillingerEncoding, SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let cacheKey = "rhythm_encode_pattern_\(inputPattern.description)"
        
        return await sdk.getCachedOrExecute(cacheKey: cacheKey) {
            let requestBody = EncodePatternRequest(pattern: inputPattern)
            
            do {
                let bodyData = try JSONEncoder().encode(requestBody)
                return await sdk.makeRequest(
                    endpoint: "/rhythm/encode-pattern",
                    method: .POST,
                    body: bodyData,
                    responseType: SchillingerEncoding.self
                )
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
        }
    }
    
    /// Find best fit for target pattern
    public func findBestFit(targetPattern: RhythmPattern, options: FitOptions? = nil) async -> Result<[SchillingerMatch], SchillingerError> {
        guard let sdk = sdk else {
            return .failure(.configuration(ConfigurationError(field: "sdk", message: "SDK not available")))
        }
        
        let requestBody = FindBestFitRequest(targetPattern: targetPattern, options: options)
        
        do {
            let bodyData = try JSONEncoder().encode(requestBody)
            return await sdk.makeRequest(
                endpoint: "/rhythm/find-best-fit",
                method: .POST,
                body: bodyData,
                responseType: [SchillingerMatch].self
            )
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    // MARK: - Offline Implementations
    
    private func generateResultantOffline(a: Int, b: Int) async -> Result<RhythmPattern, SchillingerError> {
        // Simple offline implementation of rhythmic resultant
        let resultant = generateSimpleResultant(a: a, b: b)
        
        let pattern = RhythmPattern(
            durations: resultant,
            timeSignature: TimeSignature(numerator: 4, denominator: 4),
            tempo: 120,
            swing: 0.0,
            metadata: RhythmMetadata(
                generators: Generators(a: a, b: b),
                variationType: nil,
                complexity: calculateComplexity(durations: resultant)
            )
        )
        
        return .success(pattern)
    }
    
    private func generateVariationOffline(pattern: RhythmPattern, type: VariationType) async -> Result<RhythmPattern, SchillingerError> {
        let variatedDurations: [Int]
        
        switch type {
        case .augmentation:
            variatedDurations = pattern.durations.map { $0 * 2 }
        case .diminution:
            variatedDurations = pattern.durations.map { max(1, $0 / 2) }
        case .retrograde:
            variatedDurations = Array(pattern.durations.reversed())
        case .rotation:
            variatedDurations = Array(pattern.durations.dropFirst() + pattern.durations.prefix(1))
        case .permutation:
            variatedDurations = pattern.durations.shuffled()
        default:
            variatedDurations = pattern.durations
        }
        
        let variatedPattern = RhythmPattern(
            id: pattern.id,
            durations: variatedDurations,
            timeSignature: pattern.timeSignature,
            tempo: pattern.tempo,
            swing: pattern.swing,
            metadata: RhythmMetadata(
                generators: pattern.metadata?.generators,
                variationType: type.rawValue,
                complexity: calculateComplexity(durations: variatedDurations)
            )
        )
        
        return .success(variatedPattern)
    }
    
    private func validatePatternOffline(pattern: RhythmPattern) async -> Result<PatternValidationResult, SchillingerError> {
        var errors: [String] = []
        var warnings: [String] = []
        var suggestions: [String] = []
        
        // Check for empty pattern
        if pattern.durations.isEmpty {
            errors.append("Pattern cannot be empty")
        }
        
        // Check for negative durations
        if pattern.durations.contains(where: { $0 <= 0 }) {
            errors.append("All durations must be positive")
        }
        
        // Check for very long patterns
        if pattern.durations.count > 32 {
            warnings.append("Pattern is very long and may be difficult to process")
            suggestions.append("Consider breaking into smaller patterns")
        }
        
        // Check for very complex patterns
        let complexity = calculateComplexity(durations: pattern.durations)
        if complexity > 0.8 {
            warnings.append("Pattern has high complexity")
            suggestions.append("Consider simplifying for better musical flow")
        }
        
        let result = PatternValidationResult(
            valid: errors.isEmpty,
            errors: errors,
            warnings: warnings,
            suggestions: suggestions
        )
        
        return .success(result)
    }
    
    private func getPatternStatsOffline(pattern: RhythmPattern) async -> Result<PatternStats, SchillingerError> {
        let durations = pattern.durations
        let totalDuration = durations.reduce(0, +)
        let averageDuration = Double(totalDuration) / Double(durations.count)
        let uniqueValues = Set(durations).count
        let density = Double(durations.count) / Double(totalDuration)
        let complexity = calculateComplexity(durations: durations)
        let syncopation = calculateSyncopation(durations: durations)
        
        let stats = PatternStats(
            totalDuration: totalDuration,
            averageDuration: averageDuration,
            uniqueValues: uniqueValues,
            density: density,
            complexity: complexity,
            syncopation: syncopation
        )
        
        return .success(stats)
    }
    
    // MARK: - Helper Methods
    
    private func generateSimpleResultant(a: Int, b: Int) -> [Int] {
        // Simple implementation of Schillinger rhythmic resultant
        let lcm = leastCommonMultiple(a, b)
        var resultant: [Int] = []
        
        for i in 0..<lcm {
            if i % a == 0 || i % b == 0 {
                resultant.append(1)
            } else {
                resultant.append(0)
            }
        }
        
        // Convert to duration representation
        var durations: [Int] = []
        var currentDuration = 0
        
        for value in resultant {
            if value == 1 {
                if currentDuration > 0 {
                    durations.append(currentDuration)
                    currentDuration = 1
                } else {
                    currentDuration = 1
                }
            } else {
                currentDuration += 1
            }
        }
        
        if currentDuration > 0 {
            durations.append(currentDuration)
        }
        
        return durations.isEmpty ? [1] : durations
    }
    
    private func leastCommonMultiple(_ a: Int, _ b: Int) -> Int {
        return abs(a * b) / greatestCommonDivisor(a, b)
    }
    
    private func greatestCommonDivisor(_ a: Int, _ b: Int) -> Int {
        var a = a
        var b = b
        while b != 0 {
            let temp = b
            b = a % b
            a = temp
        }
        return a
    }
    
    private func calculateComplexity(durations: [Int]) -> Double {
        guard !durations.isEmpty else { return 0.0 }
        
        let uniqueValues = Set(durations).count
        let totalValues = durations.count
        let variance = calculateVariance(durations)
        
        // Normalize complexity between 0 and 1
        let uniquenessRatio = Double(uniqueValues) / Double(totalValues)
        let normalizedVariance = min(variance / 100.0, 1.0)
        
        return (uniquenessRatio + normalizedVariance) / 2.0
    }
    
    private func calculateSyncopation(durations: [Int]) -> Double {
        guard durations.count > 1 else { return 0.0 }
        
        var syncopationScore = 0.0
        let average = Double(durations.reduce(0, +)) / Double(durations.count)
        
        for i in 0..<durations.count - 1 {
            let current = Double(durations[i])
            let next = Double(durations[i + 1])
            
            // Higher syncopation for larger differences from average
            let currentDeviation = abs(current - average) / average
            let nextDeviation = abs(next - average) / average
            
            syncopationScore += (currentDeviation + nextDeviation) / 2.0
        }
        
        return min(syncopationScore / Double(durations.count - 1), 1.0)
    }
    
    private func calculateVariance(_ values: [Int]) -> Double {
        guard !values.isEmpty else { return 0.0 }
        
        let mean = Double(values.reduce(0, +)) / Double(values.count)
        let squaredDifferences = values.map { pow(Double($0) - mean, 2) }
        return squaredDifferences.reduce(0, +) / Double(values.count)
    }
}

// MARK: - Request Models

private struct GenerateResultantRequest: Codable {
    let a: Int
    let b: Int
}

private struct GenerateVariationRequest: Codable {
    let pattern: RhythmPattern
    let type: VariationType
}

private struct EncodePatternRequest: Codable {
    let pattern: [Int]
}

private struct FindBestFitRequest: Codable {
    let targetPattern: RhythmPattern
    let options: FitOptions?
}