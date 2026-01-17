import Foundation

// MARK: - Core Data Models

// NOTE: TimeSignature is now canonical in SwiftFrontendShared/MusicalModels.swift
// This SDK uses that definition to avoid duplication

/// Represents a rhythm pattern with durations and metadata
public struct RhythmPattern: Codable, Equatable, Hashable {
    public let id: String?
    public let durations: [Int]
    public let timeSignature: TimeSignature
    public let tempo: Int?
    public let swing: Double?
    public let metadata: RhythmMetadata?

    public init(
        id: String? = nil,
        durations: [Int],
        timeSignature: TimeSignature = TimeSignature(numerator: 4, denominator: 4),
        tempo: Int? = 120,
        swing: Double? = 0.0,
        metadata: RhythmMetadata? = nil
    ) {
        self.id = id
        self.durations = durations
        self.timeSignature = timeSignature
        self.tempo = tempo
        self.swing = swing
        self.metadata = metadata
    }
}

/// Metadata for rhythm patterns
public struct RhythmMetadata: Codable, Equatable, Hashable {
    public let generators: Generators?
    public let variationType: String?
    public let complexity: Double?
    
    public init(generators: Generators? = nil, variationType: String? = nil, complexity: Double? = nil) {
        self.generators = generators
        self.variationType = variationType
        self.complexity = complexity
    }
}

/// Generator pair for Schillinger patterns
public struct Generators: Codable, Equatable, Hashable {
    public let a: Int
    public let b: Int
    
    public init(a: Int, b: Int) {
        self.a = a
        self.b = b
    }
}

/// Chord progression representation
public struct ChordProgression: Codable, Equatable, Hashable {
    public let id: String?
    public let chords: [String]
    public let key: String
    public let scale: String
    public let metadata: HarmonyMetadata?
    
    public init(
        id: String? = nil,
        chords: [String],
        key: String,
        scale: String,
        metadata: HarmonyMetadata? = nil
    ) {
        self.id = id
        self.chords = chords
        self.key = key
        self.scale = scale
        self.metadata = metadata
    }
}

/// Metadata for harmony patterns
public struct HarmonyMetadata: Codable, Equatable, Hashable {
    public let functions: [String]?
    public let tensions: [Int]?
    public let voiceLeading: VoiceLeading?
    
    public init(functions: [String]? = nil, tensions: [Int]? = nil, voiceLeading: VoiceLeading? = nil) {
        self.functions = functions
        self.tensions = tensions
        self.voiceLeading = voiceLeading
    }
}

/// Voice leading information
public struct VoiceLeading: Codable, Equatable, Hashable {
    public let quality: Double
    public let smoothness: Double
    
    public init(quality: Double, smoothness: Double) {
        self.quality = quality
        self.smoothness = smoothness
    }
}

/// Melody line representation
public struct MelodyLine: Codable, Equatable, Hashable {
    public let id: String?
    public let notes: [Int]
    public let durations: [Int]
    public let key: String
    public let scale: String
    public let metadata: MelodyMetadata?
    
    public init(
        id: String? = nil,
        notes: [Int],
        durations: [Int],
        key: String,
        scale: String,
        metadata: MelodyMetadata? = nil
    ) {
        self.id = id
        self.notes = notes
        self.durations = durations
        self.key = key
        self.scale = scale
        self.metadata = metadata
    }
}

/// Metadata for melody patterns
public struct MelodyMetadata: Codable, Equatable, Hashable {
    public let contour: String?
    public let intervalPattern: [Int]?
    public let complexity: Double?
    
    public init(contour: String? = nil, intervalPattern: [Int]? = nil, complexity: Double? = nil) {
        self.contour = contour
        self.intervalPattern = intervalPattern
        self.complexity = complexity
    }
}

/// Complete composition structure
public struct Composition: Codable, Equatable, Hashable {
    public let id: String?
    public let name: String
    public let sections: [Section]
    public let key: String
    public let scale: String
    public let tempo: Int
    public let timeSignature: TimeSignature
    public let metadata: CompositionMetadata?
    
    public init(
        id: String? = nil,
        name: String,
        sections: [Section],
        key: String,
        scale: String,
        tempo: Int,
        timeSignature: TimeSignature,
        metadata: CompositionMetadata? = nil
    ) {
        self.id = id
        self.name = name
        self.sections = sections
        self.key = key
        self.scale = scale
        self.tempo = tempo
        self.timeSignature = timeSignature
        self.metadata = metadata
    }
}

/// Section within a composition
public struct Section: Codable, Equatable, Hashable {
    public let id: String?
    public let type: SectionType
    public let rhythm: RhythmPattern
    public let harmony: ChordProgression
    public let melody: MelodyLine?
    public let length: Int
    public let position: Int
    
    public init(
        id: String? = nil,
        type: SectionType,
        rhythm: RhythmPattern,
        harmony: ChordProgression,
        melody: MelodyLine? = nil,
        length: Int,
        position: Int
    ) {
        self.id = id
        self.type = type
        self.rhythm = rhythm
        self.harmony = harmony
        self.melody = melody
        self.length = length
        self.position = position
    }
}

/// Types of sections in a composition
public enum SectionType: String, Codable, CaseIterable {
    case intro
    case verse
    case chorus
    case bridge
    case outro
    case solo
    case interlude
}

/// Metadata for compositions
public struct CompositionMetadata: Codable, Equatable, Hashable {
    public let style: String?
    public let complexity: Double?
    public let duration: Double?
    
    public init(style: String? = nil, complexity: Double? = nil, duration: Double? = nil) {
        self.style = style
        self.complexity = complexity
        self.duration = duration
    }
}

// MARK: - Analysis Models

/// Analysis result for rhythm patterns
public struct RhythmAnalysis: Codable, Equatable {
    public let complexity: Double
    public let syncopation: Double
    public let density: Double
    public let patterns: [DetectedPattern]
    public let suggestions: [String]
    
    public init(
        complexity: Double,
        syncopation: Double,
        density: Double,
        patterns: [DetectedPattern],
        suggestions: [String]
    ) {
        self.complexity = complexity
        self.syncopation = syncopation
        self.density = density
        self.patterns = patterns
        self.suggestions = suggestions
    }
}

/// Detected pattern in analysis
public struct DetectedPattern: Codable, Equatable {
    public let type: String
    public let confidence: Double
    public let position: Int
    public let length: Int
    
    public init(type: String, confidence: Double, position: Int, length: Int) {
        self.type = type
        self.confidence = confidence
        self.position = position
        self.length = length
    }
}

/// Analysis result for harmonic progressions
public struct HarmonicAnalysis: Codable, Equatable {
    public let keyStability: Double
    public let tensionCurve: [Double]
    public let functionalAnalysis: [String]
    public let voiceLeadingQuality: Double
    public let suggestions: [String]
    
    public init(
        keyStability: Double,
        tensionCurve: [Double],
        functionalAnalysis: [String],
        voiceLeadingQuality: Double,
        suggestions: [String]
    ) {
        self.keyStability = keyStability
        self.tensionCurve = tensionCurve
        self.functionalAnalysis = functionalAnalysis
        self.voiceLeadingQuality = voiceLeadingQuality
        self.suggestions = suggestions
    }
}

// MARK: - Reverse Analysis Models

/// Generator inference result
public struct GeneratorInference: Codable, Equatable {
    public let generators: [Generators]
    public let confidence: Double
    public let alternatives: [GeneratorAlternative]
    
    public init(generators: [Generators], confidence: Double, alternatives: [GeneratorAlternative]) {
        self.generators = generators
        self.confidence = confidence
        self.alternatives = alternatives
    }
}

/// Alternative generator suggestion
public struct GeneratorAlternative: Codable, Equatable {
    public let generators: Generators
    public let confidence: Double
    public let similarity: Double
    
    public init(generators: Generators, confidence: Double, similarity: Double) {
        self.generators = generators
        self.confidence = confidence
        self.similarity = similarity
    }
}

/// Schillinger encoding result
public struct SchillingerEncoding: Codable, Equatable {
    public let parameters: [String: AnyCodable]
    public let confidence: Double
    public let interpretations: [SchillingerInterpretation]
    
    public init(parameters: [String: AnyCodable], confidence: Double, interpretations: [SchillingerInterpretation]) {
        self.parameters = parameters
        self.confidence = confidence
        self.interpretations = interpretations
    }
}

/// Schillinger interpretation
public struct SchillingerInterpretation: Codable, Equatable {
    public let type: String
    public let confidence: Double
    public let parameters: [String: AnyCodable]
    
    public init(type: String, confidence: Double, parameters: [String: AnyCodable]) {
        self.type = type
        self.confidence = confidence
        self.parameters = parameters
    }
}

/// Type-erased codable value
public struct AnyCodable: Codable, Equatable {
    public let value: Any
    
    public init<T: Codable>(_ value: T) {
        self.value = value
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            throw DecodingError.typeMismatch(
                AnyCodable.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Unsupported type")
            )
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            // Encode each element using type erasure
            try container.encode(arrayValue.map { element -> AnyCodable in
                // Force-unwrap is safe here because we control the type
                if let intValue = element as? Int {
                    return AnyCodable(intValue)
                } else if let doubleValue = element as? Double {
                    return AnyCodable(doubleValue)
                } else if let stringValue = element as? String {
                    return AnyCodable(stringValue)
                } else if let boolValue = element as? Bool {
                    return AnyCodable(boolValue)
                } else {
                    // For unsupported types, convert to string
                    return AnyCodable(String(describing: element))
                }
            })
        case let dictValue as [String: Any]:
            // Encode each value using type erasure
            let codableDict = dictValue.mapValues { element -> AnyCodable in
                // Force-unwrap is safe here because we control the type
                if let intValue = element as? Int {
                    return AnyCodable(intValue)
                } else if let doubleValue = element as? Double {
                    return AnyCodable(doubleValue)
                } else if let stringValue = element as? String {
                    return AnyCodable(stringValue)
                } else if let boolValue = element as? Bool {
                    return AnyCodable(boolValue)
                } else {
                    // For unsupported types, convert to string
                    return AnyCodable(String(describing: element))
                }
            }
            try container.encode(codableDict)
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(codingPath: encoder.codingPath, debugDescription: "Unsupported type")
            )
        }
    }
    
    public static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        // Simple equality check - in production, this would need more sophisticated comparison
        return String(describing: lhs.value) == String(describing: rhs.value)
    }
}

// MARK: - Variation Types

/// Types of pattern variations
public enum VariationType: String, Codable, CaseIterable {
    case augmentation
    case diminution
    case retrograde
    case rotation
    case permutation
    case fractioning
    case inversion
    case transposition
}