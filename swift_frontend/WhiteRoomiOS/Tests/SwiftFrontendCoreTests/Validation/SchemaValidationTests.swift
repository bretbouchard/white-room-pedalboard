//
//  SchemaValidationTests.swift
//  SwiftFrontendCoreTests
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import XCTest
@testable import SwiftFrontendCore

/// Comprehensive tests for schema validation matching TypeScript implementation
final class SchemaValidationTests: XCTestCase {

    // MARK: - SongContract Validation Tests

    func testValidSongContract() {
        let validContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test Author",
            "name": "Test Song",
            "seed": 12345,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [
                    [
                        "id": UUID().uuidString,
                        "name": "Voice 1",
                        "rolePools": [
                            [
                                "role": "primary",
                                "functionalClass": "foundation"
                            ]
                        ]
                    ]
                ],
                "voiceCount": 1
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(validContract)

        switch result {
        case .valid:
            XCTAssertTrue(true, "Valid contract should pass validation")
        case .invalid(let errors):
            XCTFail("Valid contract failed validation: \(errors.map { $0.message }.joined(separator: ", "))")
        }
    }

    func testInvalidVersion() {
        let invalidContract: [String: Any] = [
            "version": "2.0", // Invalid version
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [],
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(invalidContract)

        switch result {
        case .valid:
            XCTFail("Invalid version should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "version" }, "Should have version error")
        }
    }

    func testInvalidUUID() {
        let invalidContract: [String: Any] = [
            "version": "1.0",
            "id": "not-a-uuid", // Invalid UUID
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [],
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(invalidContract)

        switch result {
        case .valid:
            XCTFail("Invalid UUID should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "id" }, "Should have id error")
        }
    }

    func testMissingRequiredField() {
        let missingFieldContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            // Missing "createdAt"
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [],
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(missingFieldContract)

        switch result {
        case .valid:
            XCTFail("Missing required field should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "createdAt" }, "Should have createdAt error")
        }
    }

    func testInvalidNameLength() {
        let emptyNameContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "", // Empty name
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [],
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(emptyNameContract)

        switch result {
        case .valid:
            XCTFail("Empty name should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "name" }, "Should have name error")
        }
    }

    func testInvalidSeedRange() {
        let invalidSeedContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": -1, // Invalid: negative
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [],
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(invalidSeedContract)

        switch result {
        case .valid:
            XCTFail("Negative seed should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "seed" }, "Should have seed error")
        }
    }

    func testEmptyVoicesArray() {
        let emptyVoicesContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [], // Empty array
                "voiceCount": 0
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(emptyVoicesContract)

        switch result {
        case .valid:
            XCTFail("Empty voices array should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "ensemble.voices" }, "Should have voices error")
        }
    }

    func testInvalidRolePool() {
        let invalidRolePoolContract: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [
                    [
                        "id": UUID().uuidString,
                        "name": "Voice 1",
                        "rolePools": [
                            [
                                "role": "invalid_role", // Invalid enum value
                                "functionalClass": "foundation"
                            ]
                        ]
                    ]
                ],
                "voiceCount": 1
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(invalidRolePoolContract)

        switch result {
        case .valid:
            XCTFail("Invalid role pool should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath.contains("role") }, "Should have role error")
        }
    }

    // MARK: - SongState Validation Tests

    func testValidSongState() {
        let validState: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "sourceSongId": UUID().uuidString,
            "derivationId": UUID().uuidString,
            "duration": 180,
            "tempo": 120.0,
            "timeSignature": [4, 4],
            "sampleRate": 44100,
            "voiceAssignments": [],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ],
            "derivedAt": 1736899200
        ]

        let result = validateSongState(validState)

        switch result {
        case .valid:
            XCTAssertTrue(true)
        case .invalid(let errors):
            XCTFail("Valid state failed: \(errors.map { $0.message }.joined(separator: ", "))")
        }
    }

    func testInvalidTempoRange() {
        let invalidState: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "sourceSongId": UUID().uuidString,
            "derivationId": UUID().uuidString,
            "duration": 180,
            "tempo": 0.0, // Must be > 0
            "timeSignature": [4, 4],
            "sampleRate": 44100,
            "voiceAssignments": [],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ],
            "derivedAt": 1736899200
        ]

        let result = validateSongState(invalidState)

        switch result {
        case .valid:
            XCTFail("Invalid tempo should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "tempo" }, "Should have tempo error")
        }
    }

    func testInvalidSampleRate() {
        let invalidState: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "sourceSongId": UUID().uuidString,
            "derivationId": UUID().uuidString,
            "duration": 180,
            "tempo": 120.0,
            "timeSignature": [4, 4],
            "sampleRate": 96000, // Valid (should be in enum)
            "voiceAssignments": [],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ],
            "derivedAt": 1736899200
        ]

        // This should pass since 96000 is valid
        let result = validateSongState(invalidState)
        XCTAssertTrue(result.isValid || result.errors.allSatisfy { $0.fieldPath != "sampleRate" })
    }

    func testInvalidTimeSignature() {
        let invalidState: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "sourceSongId": UUID().uuidString,
            "derivationId": UUID().uuidString,
            "duration": 180,
            "tempo": 120.0,
            "timeSignature": [4], // Should be 2 elements
            "sampleRate": 44100,
            "voiceAssignments": [],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ],
            "derivedAt": 1736899200
        ]

        let result = validateSongState(invalidState)

        switch result {
        case .valid:
            XCTFail("Invalid time signature should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "timeSignature" }, "Should have timeSignature error")
        }
    }

    // MARK: - PerformanceState Validation Tests

    func testValidPerformanceState() {
        let validPerformance: [String: Any] = [
            "version": "1",
            "id": UUID().uuidString,
            "name": "Test Performance",
            "arrangementStyle": "SOLO_PIANO",
            "density": 0.5,
            "grooveProfileId": "default",
            "consoleXProfileId": "default",
            "instrumentationMap": [:],
            "mixTargets": [:],
            "createdAt": "2024-01-15T12:00:00Z",
            "modifiedAt": "2024-01-15T12:00:00Z"
        ]

        let result = validatePerformanceState(validPerformance)

        switch result {
        case .valid:
            XCTAssertTrue(true)
        case .invalid(let errors):
            XCTFail("Valid performance failed: \(errors.map { $0.message }.joined(separator: ", "))")
        }
    }

    func testInvalidPerformanceVersion() {
        let invalidPerformance: [String: Any] = [
            "version": "2", // Should be "1"
            "id": UUID().uuidString,
            "name": "Test",
            "arrangementStyle": "SOLO_PIANO"
        ]

        let result = validatePerformanceState(invalidPerformance)

        switch result {
        case .valid:
            XCTFail("Invalid version should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "version" }, "Should have version error")
        }
    }

    func testInvalidDensityRange() {
        let invalidPerformance: [String: Any] = [
            "version": "1",
            "id": UUID().uuidString,
            "name": "Test",
            "arrangementStyle": "SOLO_PIANO",
            "density": 1.5 // Must be 0-1
        ]

        let result = validatePerformanceState(invalidPerformance)

        switch result {
        case .valid:
            XCTFail("Invalid density should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "density" }, "Should have density error")
        }
    }

    func testInvalidArrangementStyle() {
        let invalidPerformance: [String: Any] = [
            "version": "1",
            "id": UUID().uuidString,
            "name": "Test",
            "arrangementStyle": "INVALID_STYLE" // Invalid enum value
        ]

        let result = validatePerformanceState(invalidPerformance)

        switch result {
        case .valid:
            XCTFail("Invalid arrangement style should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "arrangementStyle" }, "Should have arrangementStyle error")
        }
    }

    func testInvalidMixTargetPan() {
        let invalidPerformance: [String: Any] = [
            "version": "1",
            "id": UUID().uuidString,
            "name": "Test",
            "arrangementStyle": "SOLO_PIANO",
            "mixTargets": [
                "voice1": [
                    "gain": 0.0,
                    "pan": 2.0 // Invalid: must be -1 to 1
                ]
            ]
        ]

        let result = validatePerformanceState(invalidPerformance)

        switch result {
        case .valid:
            XCTFail("Invalid pan should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath.contains("pan") }, "Should have pan error")
        }
    }

    func testInvalidISO8601Date() {
        let invalidPerformance: [String: Any] = [
            "version": "1",
            "id": UUID().uuidString,
            "name": "Test",
            "arrangementStyle": "SOLO_PIANO",
            "createdAt": "not-a-date" // Invalid ISO 8601
        ]

        let result = validatePerformanceState(invalidPerformance)

        switch result {
        case .valid:
            XCTFail("Invalid date should fail validation")
        case .invalid(let errors):
            XCTAssertTrue(errors.contains { $0.fieldPath == "createdAt" }, "Should have createdAt error")
        }
    }

    // MARK: - ValidationError Equality Tests

    func testValidationErrorEquality() {
        let error1 = ValidationError(fieldPath: "test.field", message: "Test message", value: 123)
        let error2 = ValidationError(fieldPath: "test.field", message: "Test message", value: 123)
        let error3 = ValidationError(fieldPath: "test.field", message: "Different message", value: 123)

        XCTAssertEqual(error1, error2, "Errors with same properties should be equal")
        XCTAssertNotEqual(error1, error3, "Errors with different messages should not be equal")
    }

    // MARK: - ValidationResult Mapping Tests

    func testValidationResultMap() {
        let validResult: ValidationResult<Int> = .valid(42)
        let mappedResult = validResult.map { String($0) }

        switch mappedResult {
        case .valid(let stringValue):
            XCTAssertEqual(stringValue, "42")
        case .invalid:
            XCTFail("Valid result should remain valid after map")
        }

        let invalidResult: ValidationResult<Int> = .invalid([
            ValidationError(fieldPath: "test", message: "Test error")
        ])
        let mappedInvalidResult = invalidResult.map { String($0) }

        switch mappedInvalidResult {
        case .valid:
            XCTFail("Invalid result should remain invalid after map")
        case .invalid(let errors):
            XCTAssertEqual(errors.count, 1)
            XCTAssertEqual(errors[0].fieldPath, "test")
        }
    }

    func testValidationResultFlatMap() {
        let validResult: ValidationResult<Int> = .valid(42)

        let chainedResult = validResult.flatMap { value in
            ValidationResult<String>.valid("Value: \(value)")
        }

        switch chainedResult {
        case .valid(let stringValue):
            XCTAssertEqual(stringValue, "Value: 42")
        case .invalid:
            XCTFail("Valid result should chain correctly")
        }

        let failingTransform: ValidationResult<Int> = .valid(42)
        let failedChain = failingTransform.flatMap { _ in
            ValidationResult<String>.invalid([
                ValidationError(fieldPath: "test", message: "Transform failed")
            ])
        }

        switch failedChain {
        case .valid:
            XCTFail("Failed transform should return invalid")
        case .invalid(let errors):
            XCTAssertEqual(errors.count, 1)
        }
    }

    // MARK: - UUID Validation Tests

    func testValidUUID() {
        let validUUID = UUID().uuidString
        XCTAssertTrue(isValidUUID(validUUID), "Generated UUID should be valid")
    }

    func testInvalidUUID() {
        XCTAssertFalse(isValidUUID("not-a-uuid"), "Invalid string should fail UUID validation")
        XCTAssertFalse(isValidUUID("12345678-1234-1234-1234-123456789abcd"), // Invalid format
            "Malformed UUID should fail validation")
        XCTAssertFalse(isValidUUID(""), "Empty string should fail UUID validation")
    }

    // MARK: - Multiple Validation Errors

    func testMultipleErrorsAccumulated() {
        let contractWithMultipleErrors: [String: Any] = [
            "version": "2.0", // Error 1
            "id": "invalid", // Error 2
            // Missing createdAt (Error 3)
            // Missing modifiedAt (Error 4)
            "author": "", // Error 5 (if we add minLength check)
            "name": "", // Error 6
            "seed": -1, // Error 7
            "ensemble": [
                "version": "1.0",
                "id": "invalid", // Error 8
                "voices": [], // Error 9
                "voiceCount": 0 // Error 10
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "2.0", // Error 11
                "id": "invalid" // Error 12
            ]
        ]

        let result = validateSongContract(contractWithMultipleErrors)

        switch result {
        case .valid:
            XCTFail("Contract with multiple errors should fail validation")
        case .invalid(let errors):
            // Should have accumulated multiple errors
            XCTAssertGreaterThanOrEqual(errors.count, 5, "Should accumulate multiple validation errors")

            // Check for specific errors
            let fieldPaths = Set(errors.map { $0.fieldPath })
            XCTAssertTrue(fieldPaths.contains("version"), "Should have version error")
            XCTAssertTrue(fieldPaths.contains("id"), "Should have id error")
            XCTAssertTrue(fieldPaths.contains("createdAt"), "Should have createdAt error")
        }
    }

    // MARK: - Nested Field Path Tests

    func testNestedFieldPaths() {
        let contractWithNestedErrors: [String: Any] = [
            "version": "1.0",
            "id": UUID().uuidString,
            "createdAt": 1736899200,
            "modifiedAt": 1736899200,
            "author": "Test",
            "name": "Test",
            "seed": 0,
            "ensemble": [
                "version": "1.0",
                "id": UUID().uuidString,
                "voices": [
                    [
                        "id": "invalid-uuid", // Error in nested path
                        "name": "Voice 1",
                        "rolePools": [
                            [
                                "role": "invalid", // Error in nested path
                                "functionalClass": "foundation"
                            ]
                        ]
                    ]
                ],
                "voiceCount": 1
            ],
            "bindings": [:] as [String: Any],
            "constraints": [:] as [String: Any],
            "console": [
                "version": "1.0",
                "id": UUID().uuidString
            ]
        ]

        let result = validateSongContract(contractWithNestedErrors)

        switch result {
        case .valid:
            XCTFail("Nested errors should fail validation")
        case .invalid(let errors):
            let fieldPaths = errors.map { $0.fieldPath }

            // Check that nested paths are correctly formatted
            XCTAssertTrue(fieldPaths.contains { $0.contains("ensemble.voices[0].id") },
                         "Should have nested path for voice id")
            XCTAssertTrue(fieldPaths.contains { $0.contains("ensemble.voices[0].rolePools[0].role") },
                         "Should have nested path for role")
        }
    }
}
