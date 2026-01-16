import XCTest
@testable import SchillingerSDK

final class BasicTests: XCTestCase {
    
    func testSDKVersion() {
        XCTAssertEqual(SDKVersion.version, "1.0.0")
        XCTAssertEqual(SDKVersion.name, "SchillingerSDK")
        XCTAssertFalse(SDKVersion.fullVersion.isEmpty)
    }
    
    func testErrorTypes() {
        let validationError = ValidationError(field: "test", value: nil, expected: "valid value")
        let schillingerError = SchillingerError.validation(validationError)
        
        XCTAssertEqual(schillingerError.category, .validation)
        XCTAssertFalse(schillingerError.suggestions.isEmpty)
        XCTAssertNotNil(schillingerError.errorDescription)
    }
    
    func testDataModels() {
        let timeSignature = TimeSignature(numerator: 4, denominator: 4)
        XCTAssertEqual(timeSignature.numerator, 4)
        XCTAssertEqual(timeSignature.denominator, 4)
        
        let generators = Generators(a: 3, b: 2)
        XCTAssertEqual(generators.a, 3)
        XCTAssertEqual(generators.b, 2)
        
        let rhythmPattern = RhythmPattern(
            durations: [1, 2, 1, 2],
            timeSignature: timeSignature
        )
        XCTAssertEqual(rhythmPattern.durations, [1, 2, 1, 2])
        XCTAssertEqual(rhythmPattern.timeSignature, timeSignature)
    }
    
    func testSDKConfiguration() {
        let config = SDKConfiguration(
            environment: .development,
            debug: true
        )
        
        XCTAssertEqual(config.environment, .development)
        XCTAssertTrue(config.debug)
        XCTAssertTrue(config.cacheEnabled)
    }
}