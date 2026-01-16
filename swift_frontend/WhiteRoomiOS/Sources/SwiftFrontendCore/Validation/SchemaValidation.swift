//
//  SchemaValidation.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Validation Types
// =============================================================================

/**
 Validation error with field path and user-friendly message
 */
public struct SchemaValidationError: Error, Sendable, Equatable {
    /// Path to the invalid field (e.g., "ensemble.voices[0].id")
    public let fieldPath: String

    /// User-friendly error message
    public let message: String

    /// The invalid value (optional)
    public let value: Any?

    public init(fieldPath: String, message: String, value: Any? = nil) {
        self.fieldPath = fieldPath
        self.message = message
        self.value = value
    }

    public static func == (lhs: SchemaValidationError, rhs: SchemaValidationError) -> Bool {
        lhs.fieldPath == rhs.fieldPath &&
        lhs.message == rhs.message &&
        String(describing: lhs.value) == String(describing: rhs.value)
    }
}

/**
 Validation result type
 */
public enum ValidationResult<T> {
    case valid(T)
    case invalid([ValidationError])

    /// Returns true if validation passed
    public var isValid: Bool {
        if case .valid = self { return true }
        return false
    }

    /// Returns the validated value if valid, nil otherwise
    public var value: T? {
        if case .valid(let value) = self { return value }
        return nil
    }

    /// Returns validation errors if invalid, empty array otherwise
    public var errors: [ValidationError] {
        if case .invalid(let errors) = self { return errors }
        return []
    }

    /// Transform the valid value
    public func map<U>(_ transform: (T) -> U) -> ValidationResult<U> {
        switch self {
        case .valid(let value):
            return .valid(transform(value))
        case .invalid(let errors):
            return .invalid(errors)
        }
    }

    /// Chain with another validation function
    public func flatMap<U>(_ transform: (T) -> ValidationResult<U>) -> ValidationResult<U> {
        switch self {
        case .valid(let value):
            return transform(value)
        case .invalid(let errors):
            return .invalid(errors)
        }
    }
}

// =============================================================================
// MARK: - Validation Error Builder
// =============================================================================

/**
 Helper class for accumulating validation errors
 */
public class ValidationErrors {
    private var errors: [ValidationError] = []

    /// Add a validation error
    public func add(field: String, message: String, value: Any? = nil) {
        errors.append(ValidationError(fieldPath: field, message: message, value: value))
    }

    /// Add multiple validation errors
    public func addAll(_ newErrors: [ValidationError]) {
        errors.append(contentsOf: newErrors)
    }

    /// Check if any errors have been accumulated
    public var isEmpty: Bool {
        errors.isEmpty
    }

    /// Convert to ValidationResult
    public func toResult<T>(_ value: T) -> ValidationResult<T> {
        if isEmpty {
            return .valid(value)
        } else {
            return .invalid(errors)
        }
    }

    /// Get all accumulated errors
    public var allErrors: [ValidationError] {
        errors
    }
}

// =============================================================================
// MARK: - UUID Validation
// =============================================================================

/// Validates that a string is a valid UUID
public func isValidUUID(_ value: String) -> Bool {
    // Swift's UUID constructor validates format
    return UUID(uuidString: value) != nil
}

// =============================================================================
// MARK: - SchillingerSong_v1 Validation
// =============================================================================

/**
 Validate SchillingerSong_v1 schema compliance
 */
public func validateSongContract(_ data: Any) -> ValidationResult<SchillingerSong_v1> {
    let errors = ValidationErrors()

    // Must be a dictionary
    guard let obj = data as? [String: Any] else {
        errors.add(field: "root", message: "SchillingerSong must be an object", value: data)
        return errors.toResult(SchillingerSong_v1(version: "", id: "", createdAt: 0, modifiedAt: 0, author: "", name: "", seed: 0, ensemble: EnsembleModel(version: "", id: "", voices: [], voiceCount: 0), bindings: BindingModel(), constraints: ConstraintModel(), console: ConsoleModel(version: "", id: "")))
    }

    // Version (const: "1.0")
    if let version = obj["version"] as? String {
        if version != "1.0" {
            errors.add(field: "version", message: "Version must be \"1.0\"", value: version)
        }
    } else {
        errors.add(field: "version", message: "Version is required and must be \"1.0\"")
    }

    // ID (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "id", message: "ID must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "id", message: "ID is required and must be a valid UUID")
    }

    // createdAt (Unix timestamp, >= 0)
    if let createdAt = obj["createdAt"] as? Int {
        if createdAt < 0 {
            errors.add(field: "createdAt", message: "createdAt must be a non-negative number", value: createdAt)
        }
    } else {
        errors.add(field: "createdAt", message: "createdAt is required and must be a non-negative number")
    }

    // modifiedAt (Unix timestamp, >= 0)
    if let modifiedAt = obj["modifiedAt"] as? Int {
        if modifiedAt < 0 {
            errors.add(field: "modifiedAt", message: "modifiedAt must be a non-negative number", value: modifiedAt)
        }
    } else {
        errors.add(field: "modifiedAt", message: "modifiedAt is required and must be a non-negative number")
    }

    // author (string)
    if obj["author"] == nil || !(obj["author"] is String) {
        errors.add(field: "author", message: "author must be a string")
    }

    // name (string, minLength: 1, maxLength: 256)
    if let name = obj["name"] as? String {
        if name.isEmpty || name.count > 256 {
            errors.add(field: "name", message: "name must be between 1 and 256 characters", value: name)
        }
    } else {
        errors.add(field: "name", message: "name is required and must be a string")
    }

    // seed (integer, min: 0, max: 4294967295)
    if let seed = obj["seed"] as? Int {
        if seed < 0 || seed > 4294967295 {
            errors.add(field: "seed", message: "seed must be between 0 and 4294967295", value: seed)
        }
    } else {
        errors.add(field: "seed", message: "seed is required and must be between 0 and 4294967295")
    }

    // Validate ensemble
    if let ensemble = obj["ensemble"] {
        errors.addAll(validateEnsembleModel(ensemble, path: "ensemble").errors)
    } else {
        errors.add(field: "ensemble", message: "ensemble is required")
    }

    // Validate bindings
    if let bindings = obj["bindings"] {
        errors.addAll(validateBindingModel(bindings, path: "bindings").errors)
    } else {
        errors.add(field: "bindings", message: "bindings is required")
    }

    // Validate constraints
    if let constraints = obj["constraints"] {
        errors.addAll(validateConstraintModel(constraints, path: "constraints").errors)
    } else {
        errors.add(field: "constraints", message: "constraints is required")
    }

    // Validate console
    if let console = obj["console"] {
        errors.addAll(validateConsoleModel(console, path: "console").errors)
    } else {
        errors.add(field: "console", message: "console is required")
    }

    // Optional arrays - validate if present
    if let book1 = obj["book1"] as? [[String: Any]] {
        for (index, item) in book1.enumerated() {
            errors.addAll(validateRhythmSystem(item, path: "book1[\(index)]").errors)
        }
    }

    if let book2 = obj["book2"] as? [[String: Any]] {
        for (index, item) in book2.enumerated() {
            errors.addAll(validateMelodySystem(item, path: "book2[\(index)]").errors)
        }
    }

    if let book3 = obj["book3"] as? [[String: Any]] {
        for (index, item) in book3.enumerated() {
            errors.addAll(validateHarmonySystem(item, path: "book3[\(index)]").errors)
        }
    }

    if let book4 = obj["book4"] as? [String: Any] {
        errors.addAll(validateFormSystem(book4, path: "book4").errors)
    }

    if let book5 = obj["book5"] as? [[String: Any]] {
        for (index, item) in book5.enumerated() {
            errors.addAll(validateOrchestrationSystem(item, path: "book5[\(index)]").errors)
        }
    }

    // Return valid result with empty model if errors, otherwise indicate validation passed
    return errors.toResult(SchillingerSong_v1(
        version: obj["version"] as? String ?? "",
        id: obj["id"] as? String ?? "",
        createdAt: obj["createdAt"] as? Int ?? 0,
        modifiedAt: obj["modifiedAt"] as? Int ?? 0,
        author: obj["author"] as? String ?? "",
        name: obj["name"] as? String ?? "",
        seed: obj["seed"] as? Int ?? 0,
        ensemble: EnsembleModel(version: "", id: "", voices: [], voiceCount: 0),
        bindings: BindingModel(),
        constraints: ConstraintModel(),
        console: ConsoleModel(version: "", id: "")
    ))
}

// =============================================================================
// MARK: - EnsembleModel Validation
// =============================================================================

func validateEnsembleModel(_ data: Any, path: String) -> ValidationResult<EnsembleModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "EnsembleModel must be an object", value: data)
        return errors.toResult(EnsembleModel(version: "", id: "", voices: [], voiceCount: 0))
    }

    // version (const: "1.0")
    if let version = obj["version"] as? String {
        if version != "1.0" {
            errors.add(field: "\(path).version", message: "Version must be \"1.0\"", value: version)
        }
    } else {
        errors.add(field: "\(path).version", message: "Version is required and must be \"1.0\"")
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // voices (array, non-empty)
    if let voices = obj["voices"] as? [[String: Any]] {
        if voices.isEmpty {
            errors.add(field: "\(path).voices", message: "voices must not be empty")
        } else {
            for (index, voice) in voices.enumerated() {
                errors.addAll(validateVoice(voice, path: "\(path).voices[\(index)]").errors)
            }
        }
    } else {
        errors.add(field: "\(path).voices", message: "voices is required and must be a non-empty array")
    }

    // voiceCount (integer, min: 1, max: 100)
    if let voiceCount = obj["voiceCount"] as? Int {
        if voiceCount < 1 || voiceCount > 100 {
            errors.add(field: "\(path).voiceCount", message: "voiceCount must be between 1 and 100", value: voiceCount)
        }
    } else {
        errors.add(field: "\(path).voiceCount", message: "voiceCount is required and must be between 1 and 100")
    }

    // Optional groups
    if let groups = obj["groups"] as? [[String: Any]] {
        for (index, group) in groups.enumerated() {
            errors.addAll(validateVoiceGroup(group, path: "\(path).groups[\(index)]").errors)
        }
    }

    // Optional balance
    if let balance = obj["balance"] as? [String: Any] {
        errors.addAll(validateBalanceRules(balance, path: "\(path).balance").errors)
    }

    return errors.toResult(EnsembleModel(version: "", id: "", voices: [], voiceCount: 0))
}

// =============================================================================
// MARK: - Voice Validation
// =============================================================================

func validateVoice(_ data: Any, path: String) -> ValidationResult<VoiceModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "Voice must be an object", value: data)
        return errors.toResult(VoiceModel(id: "", name: "", rolePools: []))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // name (string)
    if obj["name"] == nil || !(obj["name"] is String) {
        errors.add(field: "\(path).name", message: "name must be a string")
    }

    // rolePools (array)
    if let rolePools = obj["rolePools"] as? [[String: Any]] {
        for (index, pool) in rolePools.enumerated() {
            errors.addAll(validateRolePool(pool, path: "\(path).rolePools[\(index)]").errors)
        }
    } else {
        errors.add(field: "\(path).rolePools", message: "rolePools is required and must be an array")
    }

    return errors.toResult(VoiceModel(id: "", name: "", rolePools: []))
}

// =============================================================================
// MARK: - RolePool Validation
// =============================================================================

func validateRolePool(_ data: Any, path: String) -> ValidationResult<RolePoolModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "RolePool must be an object", value: data)
        return errors.toResult(RolePoolModel(role: "", functionalClass: ""))
    }

    // role (enum)
    let validRoles = ["primary", "secondary", "tertiary"]
    if let role = obj["role"] as? String {
        if !validRoles.contains(role) {
            errors.add(field: "\(path).role", message: "role must be one of: \(validRoles.joined(separator: ", "))", value: role)
        }
    } else {
        errors.add(field: "\(path).role", message: "role is required and must be one of: \(validRoles.joined(separator: ", "))")
    }

    // functionalClass (enum)
    let validClasses = ["foundation", "motion", "ornament", "reinforcement"]
    if let functionalClass = obj["functionalClass"] as? String {
        if !validClasses.contains(functionalClass) {
            errors.add(field: "\(path).functionalClass", message: "functionalClass must be one of: \(validClasses.joined(separator: ", "))", value: functionalClass)
        }
    } else {
        errors.add(field: "\(path).functionalClass", message: "functionalClass is required and must be one of: \(validClasses.joined(separator: ", "))")
    }

    // enabled (optional boolean)
    if let enabled = obj["enabled"] {
        if !(enabled is Bool) {
            errors.add(field: "\(path).enabled", message: "enabled must be a boolean", value: enabled)
        }
    }

    return errors.toResult(RolePoolModel(role: "", functionalClass: ""))
}

// =============================================================================
// MARK: - VoiceGroup Validation
// =============================================================================

func validateVoiceGroup(_ data: Any, path: String) -> ValidationResult<VoiceGroupModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "VoiceGroup must be an object", value: data)
        return errors.toResult(VoiceGroupModel(id: "", name: "", voiceIds: []))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // name (string)
    if obj["name"] == nil || !(obj["name"] is String) {
        errors.add(field: "\(path).name", message: "name must be a string")
    }

    // voiceIds (array of UUIDs)
    if let voiceIds = obj["voiceIds"] as? [String] {
        for (index, voiceId) in voiceIds.enumerated() {
            if !isValidUUID(voiceId) {
                errors.add(field: "\(path).voiceIds[\(index)]", message: "voiceId must be a valid UUID", value: voiceId)
            }
        }
    } else {
        errors.add(field: "\(path).voiceIds", message: "voiceIds is required and must be an array")
    }

    return errors.toResult(VoiceGroupModel(id: "", name: "", voiceIds: []))
}

// =============================================================================
// MARK: - BalanceRules Validation
// =============================================================================

func validateBalanceRules(_ data: Any, path: String) -> ValidationResult<BalanceRulesModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "BalanceRules must be an object", value: data)
        return errors.toResult(BalanceRulesModel())
    }

    // Optional priority (array of integers)
    if let priority = obj["priority"] as? [Int] {
        for (index, item) in priority.enumerated() {
            // Check if it's an integer (already validated by type cast)
        }
    } else if obj["priority"] != nil {
        errors.add(field: "\(path).priority", message: "priority must be an array of integers")
    }

    // Optional limits
    if let limits = obj["limits"] as? [String: Any] {
        if let maxVoices = limits["maxVoices"] as? Int {
            if maxVoices < 1 || maxVoices > 100 {
                errors.add(field: "\(path).limits.maxVoices", message: "maxVoices must be between 1 and 100", value: maxVoices)
            }
        }

        if let maxPolyphony = limits["maxPolyphony"] as? Int {
            if maxPolyphony < 1 || maxPolyphony > 200 {
                errors.add(field: "\(path).limits.maxPolyphony", message: "maxPolyphony must be between 1 and 200", value: maxPolyphony)
            }
        }
    }

    return errors.toResult(BalanceRulesModel())
}

// =============================================================================
// MARK: - BindingModel Validation
// =============================================================================

func validateBindingModel(_ data: Any, path: String) -> ValidationResult<BindingModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "BindingModel must be an object", value: data)
        return errors.toResult(BindingModel())
    }

    // Optional rhythmBindings (array of UUIDs)
    if let rhythmBindings = obj["rhythmBindings"] as? [String] {
        for (index, binding) in rhythmBindings.enumerated() {
            if !isValidUUID(binding) {
                errors.add(field: "\(path).rhythmBindings[\(index)]", message: "binding must be a valid UUID", value: binding)
            }
        }
    } else if obj["rhythmBindings"] != nil {
        errors.add(field: "\(path).rhythmBindings", message: "rhythmBindings must be an array of UUIDs")
    }

    // Optional melodyBindings (array of UUIDs)
    if let melodyBindings = obj["melodyBindings"] as? [String] {
        for (index, binding) in melodyBindings.enumerated() {
            if !isValidUUID(binding) {
                errors.add(field: "\(path).melodyBindings[\(index)]", message: "binding must be a valid UUID", value: binding)
            }
        }
    } else if obj["melodyBindings"] != nil {
        errors.add(field: "\(path).melodyBindings", message: "melodyBindings must be an array of UUIDs")
    }

    // Optional harmonyBindings (array of UUIDs)
    if let harmonyBindings = obj["harmonyBindings"] as? [String] {
        for (index, binding) in harmonyBindings.enumerated() {
            if !isValidUUID(binding) {
                errors.add(field: "\(path).harmonyBindings[\(index)]", message: "binding must be a valid UUID", value: binding)
            }
        }
    } else if obj["harmonyBindings"] != nil {
        errors.add(field: "\(path).harmonyBindings", message: "harmonyBindings must be an array of UUIDs")
    }

    return errors.toResult(BindingModel())
}

// =============================================================================
// MARK: - ConstraintModel Validation
// =============================================================================

func validateConstraintModel(_ data: Any, path: String) -> ValidationResult<ConstraintModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "ConstraintModel must be an object", value: data)
        return errors.toResult(ConstraintModel())
    }

    // Optional constraints (array)
    if let constraints = obj["constraints"] {
        if !(constraints is [Any]) {
            errors.add(field: "\(path).constraints", message: "constraints must be an array")
        }
    }

    return errors.toResult(ConstraintModel())
}

// =============================================================================
// MARK: - ConsoleModel Validation
// =============================================================================

func validateConsoleModel(_ data: Any, path: String) -> ValidationResult<ConsoleModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "ConsoleModel must be an object", value: data)
        return errors.toResult(ConsoleModel(version: "", id: ""))
    }

    // version (const: "1.0")
    if let version = obj["version"] as? String {
        if version != "1.0" {
            errors.add(field: "\(path).version", message: "Version must be \"1.0\"", value: version)
        }
    } else {
        errors.add(field: "\(path).version", message: "Version is required and must be \"1.0\"")
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // Optional voiceBusses
    if let voiceBusses = obj["voiceBusses"] as? [[String: Any]] {
        for (index, bus) in voiceBusses.enumerated() {
            errors.addAll(validateBus(bus, path: "\(path).voiceBusses[\(index)]").errors)
        }
    } else if obj["voiceBusses"] != nil {
        errors.add(field: "\(path).voiceBusses", message: "voiceBusses must be an array")
    }

    // Optional mixBusses
    if let mixBusses = obj["mixBusses"] as? [[String: Any]] {
        for (index, bus) in mixBusses.enumerated() {
            errors.addAll(validateBus(bus, path: "\(path).mixBusses[\(index)]").errors)
        }
    } else if obj["mixBusses"] != nil {
        errors.add(field: "\(path).mixBusses", message: "mixBusses must be an array")
    }

    // Optional masterBus
    if let masterBus = obj["masterBus"] as? [String: Any] {
        errors.addAll(validateBus(masterBus, path: "\(path).masterBus").errors)
    }

    return errors.toResult(ConsoleModel(version: "", id: ""))
}

// =============================================================================
// MARK: - Bus Validation
// =============================================================================

func validateBus(_ data: Any, path: String) -> ValidationResult<BusModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "Bus must be an object", value: data)
        return errors.toResult(BusModel(id: "", name: "", type: ""))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // name (string)
    if obj["name"] == nil || !(obj["name"] is String) {
        errors.add(field: "\(path).name", message: "name must be a string")
    }

    // type (enum)
    let validTypes = ["voice", "mix", "master"]
    if let type = obj["type"] as? String {
        if !validTypes.contains(type) {
            errors.add(field: "\(path).type", message: "type must be one of: \(validTypes.joined(separator: ", "))", value: type)
        }
    } else {
        errors.add(field: "\(path).type", message: "type is required and must be one of: \(validTypes.joined(separator: ", "))")
    }

    // Optional gain (number, max: 0)
    if let gain = obj["gain"] as? Double {
        if gain > 0 {
            errors.add(field: "\(path).gain", message: "gain must be a number <= 0", value: gain)
        }
    } else if let gain = obj["gain"] as? Int {
        if gain > 0 {
            errors.add(field: "\(path).gain", message: "gain must be a number <= 0", value: gain)
        }
    }

    // Optional pan (number, min: -1, max: 1)
    if let pan = obj["pan"] as? Double {
        if pan < -1 || pan > 1 {
            errors.add(field: "\(path).pan", message: "pan must be a number between -1 and 1", value: pan)
        }
    } else if let pan = obj["pan"] as? Int {
        if pan < -1 || pan > 1 {
            errors.add(field: "\(path).pan", message: "pan must be a number between -1 and 1", value: pan)
        }
    }

    return errors.toResult(BusModel(id: "", name: "", type: ""))
}

// =============================================================================
// MARK: - System Validations (Rhythm, Melody, Harmony, Form, Orchestration)
// =============================================================================

func validateRhythmSystem(_ data: Any, path: String) -> ValidationResult<RhythmSystemModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "RhythmSystem must be an object", value: data)
        return errors.toResult(RhythmSystemModel(id: "", type: "", generators: []))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // type (enum)
    let validTypes = ["resultant", "permutation", "density"]
    if let type = obj["type"] as? String {
        if !validTypes.contains(type) {
            errors.add(field: "\(path).type", message: "type must be one of: \(validTypes.joined(separator: ", "))", value: type)
        }
    } else {
        errors.add(field: "\(path).type", message: "type is required and must be one of: \(validTypes.joined(separator: ", "))")
    }

    // generators (array)
    if let generators = obj["generators"] as? [[String: Any]] {
        for (index, gen) in generators.enumerated() {
            errors.addAll(validateGenerator(gen, path: "\(path).generators[\(index)]").errors)
        }
    } else {
        errors.add(field: "\(path).generators", message: "generators is required and must be an array")
    }

    return errors.toResult(RhythmSystemModel(id: "", type: "", generators: []))
}

func validateGenerator(_ data: Any, path: String) -> ValidationResult<GeneratorModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "Generator must be an object", value: data)
        return errors.toResult(GeneratorModel(period: 0, phaseOffset: 0))
    }

    // period (integer, min: 1)
    if let period = obj["period"] as? Int {
        if period < 1 {
            errors.add(field: "\(path).period", message: "period must be >= 1", value: period)
        }
    } else {
        errors.add(field: "\(path).period", message: "period is required and must be >= 1")
    }

    // phaseOffset (number, min: 0)
    if let phaseOffset = obj["phaseOffset"] as? Double {
        if phaseOffset < 0 {
            errors.add(field: "\(path).phaseOffset", message: "phaseOffset must be >= 0", value: phaseOffset)
        }
    } else if let phaseOffset = obj["phaseOffset"] as? Int {
        if phaseOffset < 0 {
            errors.add(field: "\(path).phaseOffset", message: "phaseOffset must be >= 0", value: phaseOffset)
        }
    } else {
        errors.add(field: "\(path).phaseOffset", message: "phaseOffset is required and must be >= 0")
    }

    return errors.toResult(GeneratorModel(period: 0, phaseOffset: 0))
}

func validateMelodySystem(_ data: Any, path: String) -> ValidationResult<MelodySystemModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "MelodySystem must be an object", value: data)
        return errors.toResult(MelodySystemModel(id: "", type: ""))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // type (enum)
    let validTypes = ["pitch_cycle", "interval_seed"]
    if let type = obj["type"] as? String {
        if !validTypes.contains(type) {
            errors.add(field: "\(path).type", message: "type must be one of: \(validTypes.joined(separator: ", "))", value: type)
        }
    } else {
        errors.add(field: "\(path).type", message: "type is required and must be one of: \(validTypes.joined(separator: ", "))")
    }

    return errors.toResult(MelodySystemModel(id: "", type: ""))
}

func validateHarmonySystem(_ data: Any, path: String) -> ValidationResult<HarmonySystemModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "HarmonySystem must be an object", value: data)
        return errors.toResult(HarmonySystemModel(id: "", type: ""))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // type (enum)
    let validTypes = ["distribution", "chord_class"]
    if let type = obj["type"] as? String {
        if !validTypes.contains(type) {
            errors.add(field: "\(path).type", message: "type must be one of: \(validTypes.joined(separator: ", "))", value: type)
        }
    } else {
        errors.add(field: "\(path).type", message: "type is required and must be one of: \(validTypes.joined(separator: ", "))")
    }

    return errors.toResult(HarmonySystemModel(id: "", type: ""))
}

func validateFormSystem(_ data: Any, path: String) -> ValidationResult<FormSystemModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "FormSystem must be an object", value: data)
        return errors.toResult(FormSystemModel(id: "", ratioTree: []))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // ratioTree (array of numbers)
    if let ratioTree = obj["ratioTree"] as? [Double] {
        for (index, ratio) in ratioTree.enumerated() {
            // Just check it's a number (already validated by type cast)
        }
    } else {
        errors.add(field: "\(path).ratioTree", message: "ratioTree is required and must be an array of numbers")
    }

    return errors.toResult(FormSystemModel(id: "", ratioTree: []))
}

func validateOrchestrationSystem(_ data: Any, path: String) -> ValidationResult<OrchestrationSystemModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "OrchestrationSystem must be an object", value: data)
        return errors.toResult(OrchestrationSystemModel(id: "", type: ""))
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "\(path).id", message: "id must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "\(path).id", message: "id is required and must be a valid UUID")
    }

    // type (enum)
    let validTypes = ["role_assignment", "register", "density"]
    if let type = obj["type"] as? String {
        if !validTypes.contains(type) {
            errors.add(field: "\(path).type", message: "type must be one of: \(validTypes.joined(separator: ", "))", value: type)
        }
    } else {
        errors.add(field: "\(path).type", message: "type is required and must be one of: \(validTypes.joined(separator: ", "))")
    }

    return errors.toResult(OrchestrationSystemModel(id: "", type: ""))
}

// =============================================================================
// MARK: - SongModel_v1 Validation
// =============================================================================

/**
 Validate SongModel_v1 schema compliance
 */
public func validateSongState(_ data: Any) -> ValidationResult<SongModel_v1> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: "root", message: "SongModel must be an object", value: data)
        return errors.toResult(SongModel_v1(version: "", id: "", sourceSongId: "", derivationId: "", duration: 0, tempo: 0, timeSignature: [], sampleRate: 44100, voiceAssignments: [], console: ConsoleModel(version: "", id: ""), derivedAt: 0))
    }

    // Version (const: "1.0")
    if let version = obj["version"] as? String {
        if version != "1.0" {
            errors.add(field: "version", message: "Version must be \"1.0\"", value: version)
        }
    } else {
        errors.add(field: "version", message: "Version is required and must be \"1.0\"")
    }

    // ID (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "id", message: "ID must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "id", message: "ID is required and must be a valid UUID")
    }

    // sourceSongId (UUID)
    if let sourceSongId = obj["sourceSongId"] as? String {
        if !isValidUUID(sourceSongId) {
            errors.add(field: "sourceSongId", message: "sourceSongId must be a valid UUID", value: sourceSongId)
        }
    } else {
        errors.add(field: "sourceSongId", message: "sourceSongId is required and must be a valid UUID")
    }

    // derivationId (UUID)
    if let derivationId = obj["derivationId"] as? String {
        if !isValidUUID(derivationId) {
            errors.add(field: "derivationId", message: "derivationId must be a valid UUID", value: derivationId)
        }
    } else {
        errors.add(field: "derivationId", message: "derivationId is required and must be a valid UUID")
    }

    // duration (integer, min: 0)
    if let duration = obj["duration"] as? Int {
        if duration < 0 {
            errors.add(field: "duration", message: "duration must be a non-negative number", value: duration)
        }
    } else {
        errors.add(field: "duration", message: "duration is required and must be a non-negative number")
    }

    // tempo (number, exclusiveMin: 0, max: 500)
    if let tempo = obj["tempo"] as? Double {
        if tempo <= 0 || tempo > 500 {
            errors.add(field: "tempo", message: "tempo must be between 0 and 500 (exclusive)", value: tempo)
        }
    } else if let tempo = obj["tempo"] as? Int {
        if tempo <= 0 || tempo > 500 {
            errors.add(field: "tempo", message: "tempo must be between 0 and 500 (exclusive)", value: tempo)
        }
    } else {
        errors.add(field: "tempo", message: "tempo is required and must be between 0 and 500 (exclusive)")
    }

    // timeSignature (array, minItems: 2, maxItems: 2)
    if let timeSignature = obj["timeSignature"] as? [Int] {
        if timeSignature.count != 2 {
            errors.add(field: "timeSignature", message: "timeSignature must be an array of 2 integers [numerator, denominator]")
        }
    } else {
        errors.add(field: "timeSignature", message: "timeSignature is required and must be an array of 2 integers")
    }

    // sampleRate (enum: 44100, 48000, 96000)
    let validSampleRates = [44100, 48000, 96000]
    if let sampleRate = obj["sampleRate"] as? Int {
        if !validSampleRates.contains(sampleRate) {
            errors.add(field: "sampleRate", message: "sampleRate must be one of: \(validSampleRates)", value: sampleRate)
        }
    } else {
        errors.add(field: "sampleRate", message: "sampleRate is required and must be one of: \(validSampleRates)")
    }

    // Validate console
    if let console = obj["console"] {
        errors.addAll(validateConsoleModel(console, path: "console").errors)
    } else {
        errors.add(field: "console", message: "console is required")
    }

    // derivedAt (integer, min: 0)
    if let derivedAt = obj["derivedAt"] as? Int {
        if derivedAt < 0 {
            errors.add(field: "derivedAt", message: "derivedAt must be a non-negative number", value: derivedAt)
        }
    } else {
        errors.add(field: "derivedAt", message: "derivedAt is required and must be a non-negative number")
    }

    // Optional activePerformanceId (UUID)
    if let activePerformanceId = obj["activePerformanceId"] as? String {
        if !isValidUUID(activePerformanceId) {
            errors.add(field: "activePerformanceId", message: "activePerformanceId must be a valid UUID", value: activePerformanceId)
        }
    }

    return errors.toResult(SongModel_v1(
        version: "",
        id: "",
        sourceSongId: "",
        derivationId: "",
        duration: 0,
        tempo: 0,
        timeSignature: [],
        sampleRate: 44100,
        voiceAssignments: [],
        console: ConsoleModel(version: "", id: ""),
        derivedAt: 0
    ))
}

// =============================================================================
// MARK: - PerformanceState_v1 Validation
// =============================================================================

/**
 Validate PerformanceState_v1 schema compliance
 */
public func validatePerformanceState(_ data: Any) -> ValidationResult<PerformanceState_v1_Data> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: "root", message: "PerformanceState must be an object", value: data)
        return errors.toResult(PerformanceState_v1_Data(
            version: "",
            id: "",
            name: "",
            arrangementStyle: "",
            density: 1.0,
            instrumentationMap: [:],
            mixTargets: [:]
        ))
    }

    // version (const: "1")
    if let version = obj["version"] as? String {
        if version != "1" {
            errors.add(field: "version", message: "Version must be \"1\"", value: version)
        }
    } else {
        errors.add(field: "version", message: "Version is required and must be \"1\"")
    }

    // id (UUID)
    if let id = obj["id"] as? String {
        if !isValidUUID(id) {
            errors.add(field: "id", message: "ID must be a valid UUID", value: id)
        }
    } else {
        errors.add(field: "id", message: "ID is required and must be a valid UUID")
    }

    // name (string, minLength: 1, maxLength: 256)
    if let name = obj["name"] as? String {
        if name.isEmpty || name.count > 256 {
            errors.add(field: "name", message: "name must be between 1 and 256 characters", value: name)
        }
    } else {
        errors.add(field: "name", message: "name is required and must be a string")
    }

    // arrangementStyle (enum)
    let validStyles = [
        "SOLO_PIANO", "SATB", "CHAMBER_ENSEMBLE", "FULL_ORCHESTRA",
        "JAZZ_COMBO", "JAZZ_TRIO", "ROCK_BAND", "AMBIENT_TECHNO",
        "ELECTRONIC", "ACAPPELLA", "STRING_QUARTET", "CUSTOM"
    ]
    if let arrangementStyle = obj["arrangementStyle"] as? String {
        if !validStyles.contains(arrangementStyle) {
            errors.add(field: "arrangementStyle", message: "arrangementStyle must be one of: \(validStyles.joined(separator: ", "))", value: arrangementStyle)
        }
    } else {
        errors.add(field: "arrangementStyle", message: "arrangementStyle is required and must be one of: \(validStyles.joined(separator: ", "))")
    }

    // Optional density (number, min: 0, max: 1)
    if let density = obj["density"] as? Double {
        if density < 0 || density > 1 {
            errors.add(field: "density", message: "density must be between 0 and 1", value: density)
        }
    } else if let density = obj["density"] as? Int {
        if density < 0 || density > 1 {
            errors.add(field: "density", message: "density must be between 0 and 1", value: density)
        }
    }

    // Optional grooveProfileId (string)
    if let grooveProfileId = obj["grooveProfileId"] {
        if !(grooveProfileId is String) {
            errors.add(field: "grooveProfileId", message: "grooveProfileId must be a string")
        }
    }

    // Optional consoleXProfileId (string)
    if let consoleXProfileId = obj["consoleXProfileId"] {
        if !(consoleXProfileId is String) {
            errors.add(field: "consoleXProfileId", message: "consoleXProfileId must be a string")
        }
    }

    // Optional instrumentationMap (object)
    if let instrumentationMap = obj["instrumentationMap"] as? [String: [String: Any]] {
        for (key, assignment) in instrumentationMap {
            errors.addAll(validatePerformanceInstrumentAssignment(assignment, path: "instrumentationMap.\(key)").errors)
        }
    }

    // Optional mixTargets (object)
    if let mixTargets = obj["mixTargets"] as? [String: [String: Any]] {
        for (key, target) in mixTargets {
            errors.addAll(validatePerformanceMixTarget(target, path: "mixTargets.\(key)").errors)
        }
    }

    // Optional timestamps (ISO 8601 date-time strings)
    if let createdAt = obj["createdAt"] as? String {
        // Check if it's a valid ISO 8601 date
        if ISO8601DateFormatter().date(from: createdAt) == nil {
            errors.add(field: "createdAt", message: "createdAt must be a valid ISO 8601 date-time string", value: createdAt)
        }
    }

    if let modifiedAt = obj["modifiedAt"] as? String {
        if ISO8601DateFormatter().date(from: modifiedAt) == nil {
            errors.add(field: "modifiedAt", message: "modifiedAt must be a valid ISO 8601 date-time string", value: modifiedAt)
        }
    }

    return errors.toResult(PerformanceState_v1_Data(
        version: "",
        id: "",
        name: "",
        arrangementStyle: "",
        density: 1.0,
        instrumentationMap: [:],
        mixTargets: [:]
    ))
}

func validatePerformanceInstrumentAssignment(_ data: Any, path: String) -> ValidationResult<PerformanceInstrumentAssignmentModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "PerformanceInstrumentAssignment must be an object", value: data)
        return errors.toResult(PerformanceInstrumentAssignmentModel(instrumentId: ""))
    }

    // instrumentId (string, required)
    if obj["instrumentId"] == nil || !(obj["instrumentId"] is String) {
        errors.add(field: "\(path).instrumentId", message: "instrumentId must be a string")
    }

    // Optional presetId (string)
    if let presetId = obj["presetId"] {
        if !(presetId is String) {
            errors.add(field: "\(path).presetId", message: "presetId must be a string")
        }
    }

    // Optional parameters (object with number values)
    if let parameters = obj["parameters"] as? [String: Any] {
        for (key, value) in parameters {
            if !(value is Double || value is Int) {
                errors.add(field: "\(path).parameters.\(key)", message: "parameter value must be a number", value: value)
            }
        }
    }

    return errors.toResult(PerformanceInstrumentAssignmentModel(instrumentId: ""))
}

func validatePerformanceMixTarget(_ data: Any, path: String) -> ValidationResult<PerformanceMixTargetModel> {
    let errors = ValidationErrors()

    guard let obj = data as? [String: Any] else {
        errors.add(field: path, message: "PerformanceMixTarget must be an object", value: data)
        return errors.toResult(PerformanceMixTargetModel(gain: 0, pan: 0))
    }

    // gain (number, required)
    if let gain = obj["gain"] as? Double {
        // Valid
    } else if let gain = obj["gain"] as? Int {
        // Valid
    } else {
        errors.add(field: "\(path).gain", message: "gain must be a number")
    }

    // pan (number, min: -1, max: 1, required)
    if let pan = obj["pan"] as? Double {
        if pan < -1 || pan > 1 {
            errors.add(field: "\(path).pan", message: "pan must be a number between -1 and 1", value: pan)
        }
    } else if let pan = obj["pan"] as? Int {
        if pan < -1 || pan > 1 {
            errors.add(field: "\(path).pan", message: "pan must be a number between -1 and 1", value: pan)
        }
    } else {
        errors.add(field: "\(path).pan", message: "pan is required and must be a number between -1 and 1")
    }

    // Optional stereo (boolean)
    if let stereo = obj["stereo"] {
        if !(stereo is Bool) {
            errors.add(field: "\(path).stereo", message: "stereo must be a boolean", value: stereo)
        }
    }

    return errors.toResult(PerformanceMixTargetModel(gain: 0, pan: 0))
}

// =============================================================================
// MARK: - Stub Models (for ValidationResult return types)
// =============================================================================

// These are minimal stub models to satisfy the ValidationResult return type.
// In production, you would use the actual model types from your codebase.

public struct SchillingerSong_v1 {
    let version: String
    let id: String
    let createdAt: Int
    let modifiedAt: Int
    let author: String
    let name: String
    let seed: Int
    let ensemble: EnsembleModel
    let bindings: BindingModel
    let constraints: ConstraintModel
    let console: ConsoleModel
}

public struct EnsembleModel {
    let version: String
    let id: String
    let voices: [VoiceModel]
    let voiceCount: Int
}

public struct VoiceModel {
    let id: String
    let name: String
    let rolePools: [RolePoolModel]
}

public struct RolePoolModel {
    let role: String
    let functionalClass: String
}

public struct VoiceGroupModel {
    let id: String
    let name: String
    let voiceIds: [String]
}

public struct BalanceRulesModel {}

public struct BindingModel {}

public struct ConstraintModel {}

public struct ConsoleModel {
    let version: String
    let id: String
}

public struct BusModel {
    let id: String
    let name: String
    let type: String
}

public struct RhythmSystemModel {
    let id: String
    let type: String
    let generators: [GeneratorModel]
}

public struct GeneratorModel {
    let period: Int
    let phaseOffset: Int
}

public struct MelodySystemModel {
    let id: String
    let type: String
}

public struct HarmonySystemModel {
    let id: String
    let type: String
}

public struct FormSystemModel {
    let id: String
    let ratioTree: [Double]
}

public struct OrchestrationSystemModel {
    let id: String
    let type: String
}

public struct SongModel_v1 {
    let version: String
    let id: String
    let sourceSongId: String
    let derivationId: String
    let duration: Int
    let tempo: Double
    let timeSignature: [Int]
    let sampleRate: Int
    let voiceAssignments: [Any]
    let console: ConsoleModel
    let derivedAt: Int
}

public struct PerformanceState_v1_Data {
    let version: String
    let id: String
    let name: String
    let arrangementStyle: String
    let density: Double
    let instrumentationMap: [String: PerformanceInstrumentAssignmentModel]
    let mixTargets: [String: PerformanceMixTargetModel]
}

public struct PerformanceInstrumentAssignmentModel {
    let instrumentId: String
}

public struct PerformanceMixTargetModel {
    let gain: Double
    let pan: Double
}
