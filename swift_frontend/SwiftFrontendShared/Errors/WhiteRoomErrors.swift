//
//  WhiteRoomErrors.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - White Room Error Types
// =============================================================================

/**
 Comprehensive error handling system for White Room audio plugin

 Error categories:
 - Audio engine errors (dropout, xrun, crash)
 - FFI bridge errors (communication failure, serialization error)
 - File I/O errors (corrupted .wrs file, missing file)
 - Schillinger system errors (invalid generators, constraints)
 - Performance errors (CPU overload, memory limit)

 Error severity levels:
 - .info: Informational, operation can continue
 - .warning: Operation completed but with issues
 - .error: Operation failed but system is stable
 - .critical: Operation failed and system may be unstable
 */

// =============================================================================
// MARK: - Error Severity
// =============================================================================

public enum ErrorSeverity: String, Codable, Sendable {
    case info
    case warning
    case error
    case critical

    public var displayName: String {
        switch self {
        case .info: return "Information"
        case .warning: return "Warning"
        case .error: return "Error"
        case .critical: return "Critical"
        }
    }

    public var icon: String {
        switch self {
        case .info: return "info.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .error: return "xmark.circle.fill"
        case .critical: return "exclamationmark.octagon.fill"
        }
    }
}

// =============================================================================
// MARK: - Main White Room Error
// =============================================================================

/**
 Main White Room error type with comprehensive context and recovery suggestions
 */
public enum WhiteRoomError: LocalizedError, Codable, Sendable {

    // MARK: - Error Categories

    case audio(AudioError)
    case ffi(FFIError)
    case fileIO(FileIOError)
    case schillinger(SchillingerError)
    case performance(PerformanceError)
    case validation(ValidationError)
    case configuration(ConfigurationError)

    // MARK: - Error Properties

    public var severity: ErrorSeverity {
        switch self {
        case .audio(let error): return error.severity
        case .ffi(let error): return error.severity
        case .fileIO(let error): return error.severity
        case .schillinger(let error): return error.severity
        case .performance(let error): return error.severity
        case .validation(let error): return error.severity
        case .configuration(let error): return error.severity
        }
    }

    public var code: String {
        switch self {
        case .audio(let error): return error.code
        case .ffi(let error): return error.code
        case .fileIO(let error): return error.code
        case .schillinger(let error): return error.code
        case .performance(let error): return error.code
        case .validation(let error): return error.code
        case .configuration(let error): return error.code
        }
    }

    public var category: String {
        switch self {
        case .audio: return "Audio"
        case .ffi: return "FFI"
        case .fileIO: return "FileIO"
        case .schillinger: return "Schillinger"
        case .performance: return "Performance"
        case .validation: return "Validation"
        case .configuration: return "Configuration"
        }
    }

    public var userMessage: String {
        switch self {
        case .audio(let error): return error.userMessage
        case .ffi(let error): return error.userMessage
        case .fileIO(let error): return error.userMessage
        case .schillinger(let error): return error.userMessage
        case .performance(let error): return error.userMessage
        case .validation(let error): return error.userMessage
        case .configuration(let error): return error.userMessage
        }
    }

    public var technicalDetails: String {
        switch self {
        case .audio(let error): return error.technicalDetails
        case .ffi(let error): return error.technicalDetails
        case .fileIO(let error): return error.technicalDetails
        case .schillinger(let error): return error.technicalDetails
        case .performance(let error): return error.technicalDetails
        case .validation(let error): return error.technicalDetails
        case .configuration(let error): return error.technicalDetails
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .audio(let error): return error.recoverySuggestion
        case .ffi(let error): return error.recoverySuggestion
        case .fileIO(let error): return error.recoverySuggestion
        case .schillinger(let error): return error.recoverySuggestion
        case .performance(let error): return error.recoverySuggestion
        case .validation(let error): return error.recoverySuggestion
        case .configuration(let error): return error.recoverySuggestion
        }
    }

    public var context: [String: String] {
        switch self {
        case .audio(let error): return error.context
        case .ffi(let error): return error.context
        case .fileIO(let error): return error.context
        case .schillinger(let error): return error.context
        case .performance(let error): return error.context
        case .validation(let error): return error.context
        case .configuration(let error): return error.context
        }
    }

    // MARK: - LocalizedError Conformance

    public var errorDescription: String? {
        return userMessage
    }

    public var failureReason: String? {
        return technicalDetails
    }

}

// =============================================================================
// MARK: - Audio Errors
// =============================================================================

public enum AudioError: Sendable, Codable {
    case engineNotReady
    case engineCrashed(reason: String)
    case dropoutDetected(count: Int, duration: TimeInterval)
    case xrunDetected(count: Int)
    case playbackFailed(reason: String)
    case voiceCreationFailed(instrument: String, reason: String)
    case bufferSizeInvalid(size: Int, validRange: ClosedRange<Int>)
    case sampleRateUnsupported(rate: Double)
    case deviceNotFound(device: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case reason
        case count
        case duration
        case instrument
        case size
        case validRange
        case rate
        case device
    }

    public var severity: ErrorSeverity {
        switch self {
        case .engineNotReady: return .warning
        case .engineCrashed: return .critical
        case .dropoutDetected: return .error
        case .xrunDetected: return .warning
        case .playbackFailed: return .error
        case .voiceCreationFailed: return .error
        case .bufferSizeInvalid: return .error
        case .sampleRateUnsupported: return .error
        case .deviceNotFound: return .error
        }
    }

    public var code: String {
        switch self {
        case .engineNotReady: return "AUDIO_001"
        case .engineCrashed: return "AUDIO_002"
        case .dropoutDetected: return "AUDIO_003"
        case .xrunDetected: return "AUDIO_004"
        case .playbackFailed: return "AUDIO_005"
        case .voiceCreationFailed: return "AUDIO_006"
        case .bufferSizeInvalid: return "AUDIO_007"
        case .sampleRateUnsupported: return "AUDIO_008"
        case .deviceNotFound: return "AUDIO_009"
        }
    }

    public var userMessage: String {
        switch self {
        case .engineNotReady:
            return "The audio engine is not ready yet. Please wait a moment and try again."

        case .engineCrashed:
            return "The audio engine has crashed and needs to be restarted."

        case .dropoutDetected(let count, let duration):
            return "Audio dropout detected (count: \(count), duration: \(String(format: "%.2f", duration))s). Audio may be interrupted."

        case .xrunDetected(let count):
            return "Audio glitch detected (\(count) xrun). Try increasing buffer size."

        case .playbackFailed(let reason):
            return "Playback failed: \(reason)"

        case .voiceCreationFailed(let instrument, let reason):
            return "Failed to create voice for '\(instrument)': \(reason)"

        case .bufferSizeInvalid(let size, let range):
            return "Buffer size \(size) is invalid. Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .sampleRateUnsupported(let rate):
            return "Sample rate \(rate)Hz is not supported by this device"

        case .deviceNotFound(let device):
            return "Audio device '\(device)' not found. Please check your audio device settings."
        }
    }

    public var technicalDetails: String {
        switch self {
        case .engineNotReady:
            return "Audio engine initialization incomplete or not started"

        case .engineCrashed(let reason):
            return "Audio engine crashed: \(reason)"

        case .dropoutDetected(let count, let duration):
            return "Audio dropout: \(count) occurrences, \(duration)s total duration"

        case .xrunDetected(let count):
            return "Sample rate overflow/underflow: \(count) events detected"

        case .playbackFailed(let reason):
            return "Playback failure: \(reason)"

        case .voiceCreationFailed(let instrument, let reason):
            return "Voice creation failed for instrument '\(instrument)': \(reason)"

        case .bufferSizeInvalid(let size, let range):
            return "Invalid buffer size \(size). Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .sampleRateUnsupported(let rate):
            return "Unsupported sample rate: \(rate)Hz"

        case .deviceNotFound(let device):
            return "Audio device not found: \(device)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .engineNotReady:
            return "Wait a moment for the engine to initialize, then try again."

        case .engineCrashed:
            return "Restart the audio engine from the settings menu. If the problem persists, restart the application."

        case .dropoutDetected, .xrunDetected:
            return "Increase the buffer size in audio settings, close other applications, or reduce plugin CPU load."

        case .playbackFailed:
            return "Check your audio device connections and try restarting playback."

        case .voiceCreationFailed:
            return "Try reducing the number of active voices or increase CPU resources."

        case .bufferSizeInvalid:
            return "Select a valid buffer size from the audio settings (typically 64-2048 samples)."

        case .sampleRateUnsupported:
            return "Change the sample rate in your audio device settings to a supported value (44100, 48000, 96000 Hz)."

        case .deviceNotFound:
            return "Check that the audio device is connected and selected in system preferences."
        }
    }

    public var context: [String: String] {
        switch self {
        case .engineNotReady:
            return ["category": "audio", "subcategory": "engine"]

        case .engineCrashed(let reason):
            return ["category": "audio", "subcategory": "engine", "reason": reason]

        case .dropoutDetected(let count, let duration):
            return [
                "category": "audio",
                "subcategory": "playback",
                "count": String(count),
                "duration": String(format: "%.2f", duration)
            ]

        case .xrunDetected(let count):
            return ["category": "audio", "subcategory": "playback", "count": String(count)]

        case .playbackFailed(let reason):
            return ["category": "audio", "subcategory": "playback", "reason": reason]

        case .voiceCreationFailed(let instrument, let reason):
            return [
                "category": "audio",
                "subcategory": "voice",
                "instrument": instrument,
                "reason": reason
            ]

        case .bufferSizeInvalid(let size, let range):
            return [
                "category": "audio",
                "subcategory": "configuration",
                "size": String(size),
                "minSize": String(range.lowerBound),
                "maxSize": String(range.upperBound)
            ]

        case .sampleRateUnsupported(let rate):
            return ["category": "audio", "subcategory": "configuration", "rate": String(rate)]

        case .deviceNotFound(let device):
            return ["category": "audio", "subcategory": "device", "device": device]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "engineNotReady":
            self = .engineNotReady
        case "engineCrashed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .engineCrashed(reason: reason)
        case "dropoutDetected":
            let count = try container.decode(Int.self, forKey: .count)
            let duration = try container.decode(TimeInterval.self, forKey: .duration)
            self = .dropoutDetected(count: count, duration: duration)
        case "xrunDetected":
            let count = try container.decode(Int.self, forKey: .count)
            self = .xrunDetected(count: count)
        case "playbackFailed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .playbackFailed(reason: reason)
        case "voiceCreationFailed":
            let instrument = try container.decode(String.self, forKey: .instrument)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .voiceCreationFailed(instrument: instrument, reason: reason)
        case "bufferSizeInvalid":
            let size = try container.decode(Int.self, forKey: .size)
            let range = try container.decode(ClosedRange<Int>.self, forKey: .validRange)
            self = .bufferSizeInvalid(size: size, validRange: range)
        case "sampleRateUnsupported":
            let rate = try container.decode(Double.self, forKey: .rate)
            self = .sampleRateUnsupported(rate: rate)
        case "deviceNotFound":
            let device = try container.decode(String.self, forKey: .device)
            self = .deviceNotFound(device: device)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid AudioError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .engineNotReady:
            try container.encode("engineNotReady", forKey: .caseType)
        case .engineCrashed(let reason):
            try container.encode("engineCrashed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .dropoutDetected(let count, let duration):
            try container.encode("dropoutDetected", forKey: .caseType)
            try container.encode(count, forKey: .count)
            try container.encode(duration, forKey: .duration)
        case .xrunDetected(let count):
            try container.encode("xrunDetected", forKey: .caseType)
            try container.encode(count, forKey: .count)
        case .playbackFailed(let reason):
            try container.encode("playbackFailed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .voiceCreationFailed(let instrument, let reason):
            try container.encode("voiceCreationFailed", forKey: .caseType)
            try container.encode(instrument, forKey: .instrument)
            try container.encode(reason, forKey: .reason)
        case .bufferSizeInvalid(let size, let range):
            try container.encode("bufferSizeInvalid", forKey: .caseType)
            try container.encode(size, forKey: .size)
            try container.encode(range, forKey: .validRange)
        case .sampleRateUnsupported(let rate):
            try container.encode("sampleRateUnsupported", forKey: .caseType)
            try container.encode(rate, forKey: .rate)
        case .deviceNotFound(let device):
            try container.encode("deviceNotFound", forKey: .caseType)
            try container.encode(device, forKey: .device)
        }
    }
}

// =============================================================================
// MARK: - FFI Errors
// =============================================================================

public enum FFIError: Sendable, Codable {
    case notInitialized
    case callFailed(function: String, reason: String)
    case versionMismatch(expected: String, actual: String)
    case timeout(function: String, timeoutMs: Int)
    case serializationFailed(reason: String)
    case deserializationFailed(reason: String)
    case bridgeDisconnected
    case communicationError(reason: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case function
        case reason
        case expected
        case actual
        case timeoutMs
    }

    public var severity: ErrorSeverity {
        switch self {
        case .notInitialized: return .error
        case .callFailed: return .error
        case .versionMismatch: return .critical
        case .timeout: return .warning
        case .serializationFailed: return .error
        case .deserializationFailed: return .error
        case .bridgeDisconnected: return .critical
        case .communicationError: return .error
        }
    }

    public var code: String {
        switch self {
        case .notInitialized: return "FFI_001"
        case .callFailed: return "FFI_002"
        case .versionMismatch: return "FFI_003"
        case .timeout: return "FFI_004"
        case .serializationFailed: return "FFI_005"
        case .deserializationFailed: return "FFI_006"
        case .bridgeDisconnected: return "FFI_007"
        case .communicationError: return "FFI_008"
        }
    }

    public var userMessage: String {
        switch self {
        case .notInitialized:
            return "The audio engine is not initialized. Please restart the application."

        case .callFailed(let function, _):
            return "Communication with the audio engine failed (function: \(function))."

        case .versionMismatch:
            return "Version mismatch detected. Please update the application."

        case .timeout(let function, let timeoutMs):
            return "The audio engine took too long to respond (function: \(function), timeout: \(timeoutMs)ms)."

        case .serializationFailed:
            return "Failed to prepare data for the audio engine."

        case .deserializationFailed:
            return "Failed to process data from the audio engine."

        case .bridgeDisconnected:
            return "The connection to the audio engine was lost. Please restart the application."

        case .communicationError:
            return "Communication error with the audio engine."
        }
    }

    public var technicalDetails: String {
        switch self {
        case .notInitialized:
            return "FFI bridge not initialized"

        case .callFailed(let function, let reason):
            return "FFI call failed for function '\(function)': \(reason)"

        case .versionMismatch(let expected, let actual):
            return "FFI version mismatch: expected \(expected), got \(actual)"

        case .timeout(let function, let timeoutMs):
            return "FFI timeout in function '\(function)' after \(timeoutMs)ms"

        case .serializationFailed(let reason):
            return "FFI serialization failed: \(reason)"

        case .deserializationFailed(let reason):
            return "FFI deserialization failed: \(reason)"

        case .bridgeDisconnected:
            return "FFI bridge disconnected"

        case .communicationError(let reason):
            return "FFI communication error: \(reason)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .notInitialized:
            return "Restart the application to initialize the audio engine."

        case .callFailed:
            return "Try restarting the audio engine or the application."

        case .versionMismatch:
            return "Update the application to the latest version to ensure compatibility."

        case .timeout:
            return "Increase the timeout in settings, or reduce CPU load."

        case .serializationFailed, .deserializationFailed:
            return "Try restarting the application. If the problem persists, please report this issue."

        case .bridgeDisconnected:
            return "Restart the application to reconnect to the audio engine."

        case .communicationError:
            return "Check that the audio engine is running and try again."
        }
    }

    public var context: [String: String] {
        switch self {
        case .notInitialized:
            return ["category": "ffi", "subcategory": "initialization"]

        case .callFailed(let function, let reason):
            return ["category": "ffi", "subcategory": "call", "function": function, "reason": reason]

        case .versionMismatch(let expected, let actual):
            return [
                "category": "ffi",
                "subcategory": "version",
                "expected": expected,
                "actual": actual
            ]

        case .timeout(let function, let timeoutMs):
            return [
                "category": "ffi",
                "subcategory": "timeout",
                "function": function,
                "timeoutMs": String(timeoutMs)
            ]

        case .serializationFailed(let reason):
            return ["category": "ffi", "subcategory": "serialization", "reason": reason]

        case .deserializationFailed(let reason):
            return ["category": "ffi", "subcategory": "deserialization", "reason": reason]

        case .bridgeDisconnected:
            return ["category": "ffi", "subcategory": "connection"]

        case .communicationError(let reason):
            return ["category": "ffi", "subcategory": "communication", "reason": reason]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "notInitialized":
            self = .notInitialized
        case "callFailed":
            let function = try container.decode(String.self, forKey: .function)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .callFailed(function: function, reason: reason)
        case "versionMismatch":
            let expected = try container.decode(String.self, forKey: .expected)
            let actual = try container.decode(String.self, forKey: .actual)
            self = .versionMismatch(expected: expected, actual: actual)
        case "timeout":
            let function = try container.decode(String.self, forKey: .function)
            let timeoutMs = try container.decode(Int.self, forKey: .timeoutMs)
            self = .timeout(function: function, timeoutMs: timeoutMs)
        case "serializationFailed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .serializationFailed(reason: reason)
        case "deserializationFailed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .deserializationFailed(reason: reason)
        case "bridgeDisconnected":
            self = .bridgeDisconnected
        case "communicationError":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .communicationError(reason: reason)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid FFIError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .notInitialized:
            try container.encode("notInitialized", forKey: .caseType)
        case .callFailed(let function, let reason):
            try container.encode("callFailed", forKey: .caseType)
            try container.encode(function, forKey: .function)
            try container.encode(reason, forKey: .reason)
        case .versionMismatch(let expected, let actual):
            try container.encode("versionMismatch", forKey: .caseType)
            try container.encode(expected, forKey: .expected)
            try container.encode(actual, forKey: .actual)
        case .timeout(let function, let timeoutMs):
            try container.encode("timeout", forKey: .caseType)
            try container.encode(function, forKey: .function)
            try container.encode(timeoutMs, forKey: .timeoutMs)
        case .serializationFailed(let reason):
            try container.encode("serializationFailed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .deserializationFailed(let reason):
            try container.encode("deserializationFailed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .bridgeDisconnected:
            try container.encode("bridgeDisconnected", forKey: .caseType)
        case .communicationError(let reason):
            try container.encode("communicationError", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        }
    }
}

// =============================================================================
// MARK: - File I/O Errors
// =============================================================================

public enum FileIOError: Sendable, Codable {
    case fileNotFound(path: String)
    case corruptedFile(path: String, reason: String)
    case invalidFormat(path: String, expected: String, actual: String)
    case permissionDenied(path: String)
    case diskFull
    case readFailed(path: String, reason: String)
    case writeFailed(path: String, reason: String)
    case incompatibleVersion(version: String, supported: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case path
        case reason
        case expected
        case actual
        case version
        case supported
    }

    public var severity: ErrorSeverity {
        switch self {
        case .fileNotFound: return .error
        case .corruptedFile: return .error
        case .invalidFormat: return .error
        case .permissionDenied: return .error
        case .diskFull: return .critical
        case .readFailed: return .error
        case .writeFailed: return .error
        case .incompatibleVersion: return .error
        }
    }

    public var code: String {
        switch self {
        case .fileNotFound: return "FILE_001"
        case .corruptedFile: return "FILE_002"
        case .invalidFormat: return "FILE_003"
        case .permissionDenied: return "FILE_004"
        case .diskFull: return "FILE_005"
        case .readFailed: return "FILE_006"
        case .writeFailed: return "FILE_007"
        case .incompatibleVersion: return "FILE_008"
        }
    }

    public var userMessage: String {
        switch self {
        case .fileNotFound(let path):
            return "File not found: \(path)"

        case .corruptedFile(let path, _):
            return "The file '\(path)' is corrupted and cannot be opened."

        case .invalidFormat(let path, let expected, _):
            return "Invalid file format for '\(path)'. Expected: \(expected)"

        case .permissionDenied(let path):
            return "Permission denied accessing file: \(path)"

        case .diskFull:
            return "Disk is full. Cannot save file."

        case .readFailed(let path, _):
            return "Failed to read file: \(path)"

        case .writeFailed(let path, _):
            return "Failed to write file: \(path)"

        case .incompatibleVersion(let version, _):
            return "Incompatible file version: \(version). This file was created with a newer version of White Room."
        }
    }

    public var technicalDetails: String {
        switch self {
        case .fileNotFound(let path):
            return "File not found at path: \(path)"

        case .corruptedFile(let path, let reason):
            return "Corrupted file at path \(path): \(reason)"

        case .invalidFormat(let path, let expected, let actual):
            return "Invalid format for file \(path). Expected: \(expected), got: \(actual)"

        case .permissionDenied(let path):
            return "Permission denied for file at path: \(path)"

        case .diskFull:
            return "Disk full - cannot write file"

        case .readFailed(let path, let reason):
            return "Read failed for file at path \(path): \(reason)"

        case .writeFailed(let path, let reason):
            return "Write failed for file at path \(path): \(reason)"

        case .incompatibleVersion(let version, let supported):
            return "Incompatible file version: \(version). Supported: \(supported)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .fileNotFound:
            return "Check that the file exists and the path is correct."

        case .corruptedFile:
            return "Try restoring from a backup if available."

        case .invalidFormat:
            return "Ensure you're opening a valid White Room file (.wrs)."

        case .permissionDenied:
            return "Check file permissions and try again."

        case .diskFull:
            return "Free up disk space and try again."

        case .readFailed:
            return "Check that the file is not corrupted and you have read permissions."

        case .writeFailed:
            return "Check that you have write permissions and sufficient disk space."

        case .incompatibleVersion:
            return "Update White Room to the latest version to open this file."
        }
    }

    public var context: [String: String] {
        switch self {
        case .fileNotFound(let path):
            return ["category": "file", "subcategory": "not_found", "path": path]

        case .corruptedFile(let path, let reason):
            return ["category": "file", "subcategory": "corrupted", "path": path, "reason": reason]

        case .invalidFormat(let path, let expected, let actual):
            return [
                "category": "file",
                "subcategory": "format",
                "path": path,
                "expected": expected,
                "actual": actual
            ]

        case .permissionDenied(let path):
            return ["category": "file", "subcategory": "permission", "path": path]

        case .diskFull:
            return ["category": "file", "subcategory": "disk"]

        case .readFailed(let path, let reason):
            return ["category": "file", "subcategory": "read", "path": path, "reason": reason]

        case .writeFailed(let path, let reason):
            return ["category": "file", "subcategory": "write", "path": path, "reason": reason]

        case .incompatibleVersion(let version, let supported):
            return [
                "category": "file",
                "subcategory": "version",
                "version": version,
                "supported": supported
            ]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "fileNotFound":
            let path = try container.decode(String.self, forKey: .path)
            self = .fileNotFound(path: path)
        case "corruptedFile":
            let path = try container.decode(String.self, forKey: .path)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .corruptedFile(path: path, reason: reason)
        case "invalidFormat":
            let path = try container.decode(String.self, forKey: .path)
            let expected = try container.decode(String.self, forKey: .expected)
            let actual = try container.decode(String.self, forKey: .actual)
            self = .invalidFormat(path: path, expected: expected, actual: actual)
        case "permissionDenied":
            let path = try container.decode(String.self, forKey: .path)
            self = .permissionDenied(path: path)
        case "diskFull":
            self = .diskFull
        case "readFailed":
            let path = try container.decode(String.self, forKey: .path)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .readFailed(path: path, reason: reason)
        case "writeFailed":
            let path = try container.decode(String.self, forKey: .path)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .writeFailed(path: path, reason: reason)
        case "incompatibleVersion":
            let version = try container.decode(String.self, forKey: .version)
            let supported = try container.decode(String.self, forKey: .supported)
            self = .incompatibleVersion(version: version, supported: supported)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid FileIOError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .fileNotFound(let path):
            try container.encode("fileNotFound", forKey: .caseType)
            try container.encode(path, forKey: .path)
        case .corruptedFile(let path, let reason):
            try container.encode("corruptedFile", forKey: .caseType)
            try container.encode(path, forKey: .path)
            try container.encode(reason, forKey: .reason)
        case .invalidFormat(let path, let expected, let actual):
            try container.encode("invalidFormat", forKey: .caseType)
            try container.encode(path, forKey: .path)
            try container.encode(expected, forKey: .expected)
            try container.encode(actual, forKey: .actual)
        case .permissionDenied(let path):
            try container.encode("permissionDenied", forKey: .caseType)
            try container.encode(path, forKey: .path)
        case .diskFull:
            try container.encode("diskFull", forKey: .caseType)
        case .readFailed(let path, let reason):
            try container.encode("readFailed", forKey: .caseType)
            try container.encode(path, forKey: .path)
            try container.encode(reason, forKey: .reason)
        case .writeFailed(let path, let reason):
            try container.encode("writeFailed", forKey: .caseType)
            try container.encode(path, forKey: .path)
            try container.encode(reason, forKey: .reason)
        case .incompatibleVersion(let version, let supported):
            try container.encode("incompatibleVersion", forKey: .caseType)
            try container.encode(version, forKey: .version)
            try container.encode(supported, forKey: .supported)
        }
    }
}

// =============================================================================
// MARK: - Schillinger System Errors
// =============================================================================

public enum SchillingerError: Sendable, Codable {
    case invalidGenerator(period: Int, validRange: ClosedRange<Int>)
    case insufficientGenerators(actual: Int, minimum: Int)
    case invalidPitchCycle(reason: String)
    case invalidIntervalSeed(reason: String)
    case harmonyViolation(reason: String)
    case constraintSatisfactionFailed(reason: String)
    case systemExecutionFailed(system: String, reason: String)
    case derivationRecordFailed(reason: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case period
        case validRange
        case actual
        case minimum
        case reason
        case system
    }

    public var severity: ErrorSeverity {
        switch self {
        case .invalidGenerator: return .error
        case .insufficientGenerators: return .error
        case .invalidPitchCycle: return .error
        case .invalidIntervalSeed: return .error
        case .harmonyViolation: return .warning
        case .constraintSatisfactionFailed: return .error
        case .systemExecutionFailed: return .error
        case .derivationRecordFailed: return .error
        }
    }

    public var code: String {
        switch self {
        case .invalidGenerator: return "SCHILL_001"
        case .insufficientGenerators: return "SCHILL_002"
        case .invalidPitchCycle: return "SCHILL_003"
        case .invalidIntervalSeed: return "SCHILL_004"
        case .harmonyViolation: return "SCHILL_005"
        case .constraintSatisfactionFailed: return "SCHILL_006"
        case .systemExecutionFailed: return "SCHILL_007"
        case .derivationRecordFailed: return "SCHILL_008"
        }
    }

    public var userMessage: String {
        switch self {
        case .invalidGenerator(let period, let range):
            return "Generator period \(period) is invalid. Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .insufficientGenerators(let actual, let minimum):
            return "Insufficient generators: \(actual) (minimum: \(minimum))"

        case .invalidPitchCycle(let reason):
            return "Invalid pitch cycle: \(reason)"

        case .invalidIntervalSeed(let reason):
            return "Invalid interval seed: \(reason)"

        case .harmonyViolation(let reason):
            return "Harmony rule violation: \(reason)"

        case .constraintSatisfactionFailed(let reason):
            return "Could not satisfy constraints: \(reason)"

        case .systemExecutionFailed(let system, let reason):
            return "System execution failed for '\(system)': \(reason)"

        case .derivationRecordFailed(let reason):
            return "Failed to record derivation: \(reason)"
        }
    }

    public var technicalDetails: String {
        switch self {
        case .invalidGenerator(let period, let range):
            return "Invalid generator period: \(period). Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .insufficientGenerators(let actual, let minimum):
            return "Insufficient generators: actual=\(actual), minimum=\(minimum)"

        case .invalidPitchCycle(let reason):
            return "Invalid pitch cycle: \(reason)"

        case .invalidIntervalSeed(let reason):
            return "Invalid interval seed: \(reason)"

        case .harmonyViolation(let reason):
            return "Harmony violation: \(reason)"

        case .constraintSatisfactionFailed(let reason):
            return "Constraint satisfaction failed: \(reason)"

        case .systemExecutionFailed(let system, let reason):
            return "System execution failed: system=\(system), reason=\(reason)"

        case .derivationRecordFailed(let reason):
            return "Derivation record failed: \(reason)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .invalidGenerator:
            return "Provide a valid generator period within the specified range."

        case .insufficientGenerators:
            return "Add more generators or reduce the complexity of your request."

        case .invalidPitchCycle:
            return "Check the pitch cycle parameters and try again."

        case .invalidIntervalSeed:
            return "Verify the interval seed values and try again."

        case .harmonyViolation:
            return "Adjust the harmony settings to resolve the violation."

        case .constraintSatisfactionFailed:
            return "Simplify the constraints or adjust the parameters."

        case .systemExecutionFailed:
            return "Check the system parameters and try again."

        case .derivationRecordFailed:
            return "Try reducing the complexity of the derivation."
        }
    }

    public var context: [String: String] {
        switch self {
        case .invalidGenerator(let period, let range):
            return [
                "category": "schillinger",
                "subcategory": "generator",
                "period": String(period),
                "minPeriod": String(range.lowerBound),
                "maxPeriod": String(range.upperBound)
            ]

        case .insufficientGenerators(let actual, let minimum):
            return [
                "category": "schillinger",
                "subcategory": "generators",
                "actual": String(actual),
                "minimum": String(minimum)
            ]

        case .invalidPitchCycle(let reason):
            return ["category": "schillinger", "subcategory": "pitch", "reason": reason]

        case .invalidIntervalSeed(let reason):
            return ["category": "schillinger", "subcategory": "interval", "reason": reason]

        case .harmonyViolation(let reason):
            return ["category": "schillinger", "subcategory": "harmony", "reason": reason]

        case .constraintSatisfactionFailed(let reason):
            return ["category": "schillinger", "subcategory": "constraints", "reason": reason]

        case .systemExecutionFailed(let system, let reason):
            return ["category": "schillinger", "subcategory": "system", "system": system, "reason": reason]

        case .derivationRecordFailed(let reason):
            return ["category": "schillinger", "subcategory": "derivation", "reason": reason]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "invalidGenerator":
            let period = try container.decode(Int.self, forKey: .period)
            let range = try container.decode(ClosedRange<Int>.self, forKey: .validRange)
            self = .invalidGenerator(period: period, validRange: range)
        case "insufficientGenerators":
            let actual = try container.decode(Int.self, forKey: .actual)
            let minimum = try container.decode(Int.self, forKey: .minimum)
            self = .insufficientGenerators(actual: actual, minimum: minimum)
        case "invalidPitchCycle":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidPitchCycle(reason: reason)
        case "invalidIntervalSeed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidIntervalSeed(reason: reason)
        case "harmonyViolation":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .harmonyViolation(reason: reason)
        case "constraintSatisfactionFailed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .constraintSatisfactionFailed(reason: reason)
        case "systemExecutionFailed":
            let system = try container.decode(String.self, forKey: .system)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .systemExecutionFailed(system: system, reason: reason)
        case "derivationRecordFailed":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .derivationRecordFailed(reason: reason)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid SchillingerError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .invalidGenerator(let period, let range):
            try container.encode("invalidGenerator", forKey: .caseType)
            try container.encode(period, forKey: .period)
            try container.encode(range, forKey: .validRange)
        case .insufficientGenerators(let actual, let minimum):
            try container.encode("insufficientGenerators", forKey: .caseType)
            try container.encode(actual, forKey: .actual)
            try container.encode(minimum, forKey: .minimum)
        case .invalidPitchCycle(let reason):
            try container.encode("invalidPitchCycle", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .invalidIntervalSeed(let reason):
            try container.encode("invalidIntervalSeed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .harmonyViolation(let reason):
            try container.encode("harmonyViolation", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .constraintSatisfactionFailed(let reason):
            try container.encode("constraintSatisfactionFailed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .systemExecutionFailed(let system, let reason):
            try container.encode("systemExecutionFailed", forKey: .caseType)
            try container.encode(system, forKey: .system)
            try container.encode(reason, forKey: .reason)
        case .derivationRecordFailed(let reason):
            try container.encode("derivationRecordFailed", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        }
    }
}

// =============================================================================
// MARK: - Performance Errors
// =============================================================================

public enum PerformanceError: Sendable, Codable {
    case cpuOverload(usage: Double, threshold: Double)
    case memoryLimitExceeded(used: UInt64, limit: UInt64)
    case slowRealization(system: String, duration: TimeInterval, threshold: TimeInterval)
    case computeLimitExceeded(reason: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case usage
        case threshold
        case used
        case limit
        case system
        case duration
        case reason
    }

    public var severity: ErrorSeverity {
        switch self {
        case .cpuOverload: return .warning
        case .memoryLimitExceeded: return .error
        case .slowRealization: return .warning
        case .computeLimitExceeded: return .error
        }
    }

    public var code: String {
        switch self {
        case .cpuOverload: return "PERF_001"
        case .memoryLimitExceeded: return "PERF_002"
        case .slowRealization: return "PERF_003"
        case .computeLimitExceeded: return "PERF_004"
        }
    }

    public var userMessage: String {
        switch self {
        case .cpuOverload(let usage, let threshold):
            let usagePercent = Int(usage * 100)
            let thresholdPercent = Int(threshold * 100)
            return "High CPU usage detected: \(usagePercent)% (threshold: \(thresholdPercent)%)"

        case .memoryLimitExceeded(let used, let limit):
            let usedMB = used / 1024 / 1024
            let limitMB = limit / 1024 / 1024
            return "Memory limit exceeded: \(usedMB)MB used (limit: \(limitMB)MB)"

        case .slowRealization(let system, let duration, let threshold):
            return "Slow realization for '\(system)': \(String(format: "%.2f", duration))s (threshold: \(String(format: "%.2f", threshold))s)"

        case .computeLimitExceeded(let reason):
            return "Compute limit exceeded: \(reason)"
        }
    }

    public var technicalDetails: String {
        switch self {
        case .cpuOverload(let usage, let threshold):
            return "CPU overload: usage=\(usage), threshold=\(threshold)"

        case .memoryLimitExceeded(let used, let limit):
            return "Memory limit exceeded: used=\(used), limit=\(limit)"

        case .slowRealization(let system, let duration, let threshold):
            return "Slow realization: system=\(system), duration=\(duration)s, threshold=\(threshold)s"

        case .computeLimitExceeded(let reason):
            return "Compute limit exceeded: \(reason)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .cpuOverload:
            return "Reduce the number of active voices, increase buffer size, or close other applications."

        case .memoryLimitExceeded:
            return "Close other projects or applications to free up memory."

        case .slowRealization:
            return "Reduce the complexity of the Schillinger system or increase compute resources."

        case .computeLimitExceeded:
            return "Reduce the complexity of the operation or increase available resources."
        }
    }

    public var context: [String: String] {
        switch self {
        case .cpuOverload(let usage, let threshold):
            return [
                "category": "performance",
                "subcategory": "cpu",
                "usage": String(usage),
                "threshold": String(threshold)
            ]

        case .memoryLimitExceeded(let used, let limit):
            return [
                "category": "performance",
                "subcategory": "memory",
                "used": String(used),
                "limit": String(limit)
            ]

        case .slowRealization(let system, let duration, let threshold):
            return [
                "category": "performance",
                "subcategory": "realization",
                "system": system,
                "duration": String(format: "%.2f", duration),
                "threshold": String(format: "%.2f", threshold)
            ]

        case .computeLimitExceeded(let reason):
            return ["category": "performance", "subcategory": "compute", "reason": reason]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "cpuOverload":
            let usage = try container.decode(Double.self, forKey: .usage)
            let threshold = try container.decode(Double.self, forKey: .threshold)
            self = .cpuOverload(usage: usage, threshold: threshold)
        case "memoryLimitExceeded":
            let used = try container.decode(UInt64.self, forKey: .used)
            let limit = try container.decode(UInt64.self, forKey: .limit)
            self = .memoryLimitExceeded(used: used, limit: limit)
        case "slowRealization":
            let system = try container.decode(String.self, forKey: .system)
            let duration = try container.decode(TimeInterval.self, forKey: .duration)
            let threshold = try container.decode(TimeInterval.self, forKey: .threshold)
            self = .slowRealization(system: system, duration: duration, threshold: threshold)
        case "computeLimitExceeded":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .computeLimitExceeded(reason: reason)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid PerformanceError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .cpuOverload(let usage, let threshold):
            try container.encode("cpuOverload", forKey: .caseType)
            try container.encode(usage, forKey: .usage)
            try container.encode(threshold, forKey: .threshold)
        case .memoryLimitExceeded(let used, let limit):
            try container.encode("memoryLimitExceeded", forKey: .caseType)
            try container.encode(used, forKey: .used)
            try container.encode(limit, forKey: .limit)
        case .slowRealization(let system, let duration, let threshold):
            try container.encode("slowRealization", forKey: .caseType)
            try container.encode(system, forKey: .system)
            try container.encode(duration, forKey: .duration)
            try container.encode(threshold, forKey: .threshold)
        case .computeLimitExceeded(let reason):
            try container.encode("computeLimitExceeded", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        }
    }
}

// =============================================================================
// MARK: - Validation Errors
// =============================================================================

public enum ValidationError: Sendable, Codable {
    case invalidSchema(reason: String)
    case validationFailed(field: String, reason: String)
    case invalidVoiceCount(count: Int, validRange: ClosedRange<Int>)
    case invalidRolePool(reason: String)
    case invalidBalanceRules(reason: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case reason
        case field
        case count
        case validRange
    }

    public var severity: ErrorSeverity {
        return .error
    }

    public var code: String {
        switch self {
        case .invalidSchema: return "VAL_001"
        case .validationFailed: return "VAL_002"
        case .invalidVoiceCount: return "VAL_003"
        case .invalidRolePool: return "VAL_004"
        case .invalidBalanceRules: return "VAL_005"
        }
    }

    public var userMessage: String {
        switch self {
        case .invalidSchema(let reason):
            return "Invalid schema: \(reason)"

        case .validationFailed(let field, let reason):
            return "Validation failed for '\(field)': \(reason)"

        case .invalidVoiceCount(let count, let range):
            return "Invalid voice count: \(count). Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .invalidRolePool(let reason):
            return "Invalid role pool: \(reason)"

        case .invalidBalanceRules(let reason):
            return "Invalid balance rules: \(reason)"
        }
    }

    public var technicalDetails: String {
        switch self {
        case .invalidSchema(let reason):
            return "Schema validation failed: \(reason)"

        case .validationFailed(let field, let reason):
            return "Validation failed for field '\(field)': \(reason)"

        case .invalidVoiceCount(let count, let range):
            return "Invalid voice count: \(count). Valid range: \(range.lowerBound) - \(range.upperBound)"

        case .invalidRolePool(let reason):
            return "Invalid role pool configuration: \(reason)"

        case .invalidBalanceRules(let reason):
            return "Invalid balance rules configuration: \(reason)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .invalidSchema:
            return "Check the schema definition and ensure it conforms to the expected format."

        case .validationFailed:
            return "Correct the invalid field value and try again."

        case .invalidVoiceCount:
            return "Provide a voice count within the valid range."

        case .invalidRolePool:
            return "Check the role pool configuration and ensure all roles are valid."

        case .invalidBalanceRules:
            return "Check the balance rules configuration and ensure all rules are valid."
        }
    }

    public var context: [String: String] {
        switch self {
        case .invalidSchema(let reason):
            return ["category": "validation", "subcategory": "schema", "reason": reason]

        case .validationFailed(let field, let reason):
            return ["category": "validation", "subcategory": "field", "field": field, "reason": reason]

        case .invalidVoiceCount(let count, let range):
            return [
                "category": "validation",
                "subcategory": "voices",
                "count": String(count),
                "min": String(range.lowerBound),
                "max": String(range.upperBound)
            ]

        case .invalidRolePool(let reason):
            return ["category": "validation", "subcategory": "roles", "reason": reason]

        case .invalidBalanceRules(let reason):
            return ["category": "validation", "subcategory": "balance", "reason": reason]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "invalidSchema":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidSchema(reason: reason)
        case "validationFailed":
            let field = try container.decode(String.self, forKey: .field)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .validationFailed(field: field, reason: reason)
        case "invalidVoiceCount":
            let count = try container.decode(Int.self, forKey: .count)
            let range = try container.decode(ClosedRange<Int>.self, forKey: .validRange)
            self = .invalidVoiceCount(count: count, validRange: range)
        case "invalidRolePool":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidRolePool(reason: reason)
        case "invalidBalanceRules":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidBalanceRules(reason: reason)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid ValidationError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .invalidSchema(let reason):
            try container.encode("invalidSchema", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .validationFailed(let field, let reason):
            try container.encode("validationFailed", forKey: .caseType)
            try container.encode(field, forKey: .field)
            try container.encode(reason, forKey: .reason)
        case .invalidVoiceCount(let count, let range):
            try container.encode("invalidVoiceCount", forKey: .caseType)
            try container.encode(count, forKey: .count)
            try container.encode(range, forKey: .validRange)
        case .invalidRolePool(let reason):
            try container.encode("invalidRolePool", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        case .invalidBalanceRules(let reason):
            try container.encode("invalidBalanceRules", forKey: .caseType)
            try container.encode(reason, forKey: .reason)
        }
    }
}

// =============================================================================
// MARK: - Configuration Errors
// =============================================================================

public enum ConfigurationError: Sendable, Codable {
    case invalidConfig(section: String, reason: String)
    case missingConfig(section: String)
    case configParseError(section: String, reason: String)

    private enum CodingKeys: String, CodingKey {
        case caseType
        case section
        case reason
    }

    public var severity: ErrorSeverity {
        return .error
    }

    public var code: String {
        switch self {
        case .invalidConfig: return "CFG_001"
        case .missingConfig: return "CFG_002"
        case .configParseError: return "CFG_003"
        }
    }

    public var userMessage: String {
        switch self {
        case .invalidConfig(let section, let reason):
            return "Invalid configuration in '\(section)': \(reason)"

        case .missingConfig(let section):
            return "Missing configuration section: '\(section)'"

        case .configParseError(let section, let reason):
            return "Configuration parse error in '\(section)': \(reason)"
        }
    }

    public var technicalDetails: String {
        switch self {
        case .invalidConfig(let section, let reason):
            return "Invalid configuration: section=\(section), reason=\(reason)"

        case .missingConfig(let section):
            return "Missing configuration: section=\(section)"

        case .configParseError(let section, let reason):
            return "Configuration parse error: section=\(section), reason=\(reason)"
        }
    }

    public var recoverySuggestion: String {
        switch self {
        case .invalidConfig:
            return "Check the configuration settings and correct any invalid values."

        case .missingConfig:
            return "Provide the missing configuration section."

        case .configParseError:
            return "Check the configuration file for syntax errors."
        }
    }

    public var context: [String: String] {
        switch self {
        case .invalidConfig(let section, let reason):
            return ["category": "configuration", "section": section, "reason": reason]

        case .missingConfig(let section):
            return ["category": "configuration", "section": section]

        case .configParseError(let section, let reason):
            return ["category": "configuration", "section": section, "reason": reason]
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let caseType = try container.decode(String.self, forKey: .caseType)

        switch caseType {
        case "invalidConfig":
            let section = try container.decode(String.self, forKey: .section)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .invalidConfig(section: section, reason: reason)
        case "missingConfig":
            let section = try container.decode(String.self, forKey: .section)
            self = .missingConfig(section: section)
        case "configParseError":
            let section = try container.decode(String.self, forKey: .section)
            let reason = try container.decode(String.self, forKey: .reason)
            self = .configParseError(section: section, reason: reason)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .caseType,
                in: container,
                debugDescription: "Invalid ConfigurationError case: \(caseType)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .invalidConfig(let section, let reason):
            try container.encode("invalidConfig", forKey: .caseType)
            try container.encode(section, forKey: .section)
            try container.encode(reason, forKey: .reason)
        case .missingConfig(let section):
            try container.encode("missingConfig", forKey: .caseType)
            try container.encode(section, forKey: .section)
        case .configParseError(let section, let reason):
            try container.encode("configParseError", forKey: .caseType)
            try container.encode(section, forKey: .section)
            try container.encode(reason, forKey: .reason)
        }
    }
}

// =============================================================================
// MARK: - Codable Support
// =============================================================================

extension WhiteRoomError {

    // Custom coding keys for nested error types
    private enum CodingKeys: String, CodingKey {
        case type, audio, ffi, fileIO, schillinger, performance, validation, configuration
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "audio":
            self = .audio(try container.decode(AudioError.self, forKey: .audio))
        case "ffi":
            self = .ffi(try container.decode(FFIError.self, forKey: .ffi))
        case "fileIO":
            self = .fileIO(try container.decode(FileIOError.self, forKey: .fileIO))
        case "schillinger":
            self = .schillinger(try container.decode(SchillingerError.self, forKey: .schillinger))
        case "performance":
            self = .performance(try container.decode(PerformanceError.self, forKey: .performance))
        case "validation":
            self = .validation(try container.decode(ValidationError.self, forKey: .validation))
        case "configuration":
            self = .configuration(try container.decode(ConfigurationError.self, forKey: .configuration))
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Invalid error type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .audio(let error):
            try container.encode("audio", forKey: .type)
            try container.encode(error, forKey: .audio)
        case .ffi(let error):
            try container.encode("ffi", forKey: .type)
            try container.encode(error, forKey: .ffi)
        case .fileIO(let error):
            try container.encode("fileIO", forKey: .type)
            try container.encode(error, forKey: .fileIO)
        case .schillinger(let error):
            try container.encode("schillinger", forKey: .type)
            try container.encode(error, forKey: .schillinger)
        case .performance(let error):
            try container.encode("performance", forKey: .type)
            try container.encode(error, forKey: .performance)
        case .validation(let error):
            try container.encode("validation", forKey: .type)
            try container.encode(error, forKey: .validation)
        case .configuration(let error):
            try container.encode("configuration", forKey: .type)
            try container.encode(error, forKey: .configuration)
        }
    }
}

// =============================================================================
// MARK: - Helper Extensions
// =============================================================================

public extension Error {

    /// Convert Error to WhiteRoomError if possible
    var asWhiteRoomError: WhiteRoomError? {
        return self as? WhiteRoomError
    }

    /// Get user-friendly message from any Error
    var userMessage: String {
        if let whiteRoomError = self as? WhiteRoomError {
            return whiteRoomError.userMessage
        }
        return localizedDescription
    }

    /// Get recovery suggestion from any Error
    var recoverySuggestion: String? {
        if let whiteRoomError = self as? WhiteRoomError {
            return whiteRoomError.recoverySuggestion
        }
        return nil
    }
}
