//
//  SchillingerFFIProtocol.swift
//  White Room Swift Frontend
//
//  Swift protocol for FFI bridge communication
//  Provides type-safe interface to C FFI functions
//

import Foundation
// TODO: Uncomment when SchillingerFFI module is available
// import SchillingerFFI

// MARK: - FFI Result Codes (STUB)

enum SchResult: Int32, Error {
    case ok = 0
    case invalidArg = 1
    case notFound = 2
    case rejected = 3
    case deferred = 4
    case notImplemented = 5
    case engineNull = 6
    case invalidState = 7
    case internalError = 100
    case engineFailed = 11
    case audioFailed = 12
    case outOfMemory = 13
    case notSupported = 8
    case parseFailed = 9
    case validationFailed = 10

    var message: String {
        switch self {
        case .ok: return "Success"
        case .invalidArg: return "Invalid argument"
        case .notFound: return "Not found"
        case .rejected: return "Operation rejected"
        case .deferred: return "Operation deferred"
        case .notImplemented: return "Not implemented"
        case .engineNull: return "Engine is null"
        case .invalidState: return "Invalid state"
        case .internalError: return "Internal error"
        case .engineFailed: return "Engine failed"
        case .audioFailed: return "Audio failed"
        case .outOfMemory: return "Out of memory"
        case .notSupported: return "Not supported"
        case .parseFailed: return "Parse failed"
        case .validationFailed: return "Validation failed"
        }
    }
}

// TODO: Add rest of FFI protocol when SchillingerFFI module is built
// For now, this stub allows the app to build
