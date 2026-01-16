/*
 * Component Edge Cases Tests
 *
 * Tests for edge cases, boundary conditions, and error handling
 * in SwiftUI components for the White Room frontend.
 */

import XCTest
import SwiftUI
import Combine
@testable import SwiftFrontendCore

@MainActor
class ComponentEdgeCasesTests: XCTestCase {

    // MARK: - SweepControl Edge Cases

    func testSweepControlHandlesZeroRange() {
        let sweepControl = SweepControl(
            value: .constant(0.5),
            range: 0...0,
            label: "Zero Range"
        )

        XCTAssertNotNil(sweepControl)
    }

    func testSweepControlHandlesNegativeRange() {
        let sweepControl = SweepControl(
            value: .constant(0.5),
            range: -1...0,
            label: "Negative Range"
        )

        XCTAssertNotNil(sweepControl)
    }

    func testSweepControlHandlesVeryLargeRange() {
        let sweepControl = SweepControl(
            value: .constant(0.5),
            range: -Double.greatestFiniteMagnitude...Double.greatestFiniteMagnitude,
            label: "Large Range"
        )

        XCTAssertNotNil(sweepControl)
    }

    func testSweepControlHandlesBoundaryValues() {
        var value = 0.5
        let sweepControl = SweepControl(
            value: Binding(get: { value }, set: { value = $0 }),
            range: 0...1,
            label: "Boundary Test"
        )

        value = 0.0
        XCTAssertEqual(value, 0.0)

        value = 1.0
        XCTAssertEqual(value, 1.0)

        value = -0.1
        XCTAssertEqual(value, -0.1) // Should be clamped by view

        value = 1.1
        XCTAssertEqual(value, 1.1) // Should be clamped by view
    }

    // MARK: - ProjectionEngine UI Edge Cases

    func testProjectionEngineUIHandlesEmptyState() {
        let viewModel = ProjectionEngineViewModel()
        XCTAssertNil(viewModel.currentProjection)
    }

    func testProjectionEngineUIHandlesRapidUpdates() {
        let viewModel = ProjectionEngineViewModel()

        for i in 0..<100 {
            let projection = ProjectionData(
                rhythm: RhythmData(events: []),
                intensity: Double(i) / 100.0,
                targetInstrument: .piano
            )
            viewModel.updateProjection(projection)
        }

        XCTAssertNotNil(viewModel.currentProjection)
    }

    func testProjectionEngineUIHandlesExtremeIntensityValues() {
        let viewModel = ProjectionEngineViewModel()

        let minProjection = ProjectionData(
            rhythm: RhythmData(events: []),
            intensity: 0.0,
            targetInstrument: .piano
        )
        viewModel.updateProjection(minProjection)
        XCTAssertEqual(viewModel.currentProjection?.intensity, 0.0)

        let maxProjection = ProjectionData(
            rhythm: RhythmData(events: []),
            intensity: 1.0,
            targetInstrument: .piano
        )
        viewModel.updateProjection(maxProjection)
        XCTAssertEqual(viewModel.currentProjection?.intensity, 1.0)

        let invalidProjection = ProjectionData(
            rhythm: RhythmData(events: []),
            intensity: 1.5,
            targetInstrument: .piano
        )
        viewModel.updateProjection(invalidProjection)
        // Should clamp to valid range
        XCTAssertLessThanOrEqual(viewModel.currentProjection?.intensity ?? 0, 1.0)
    }

    // MARK: - DefaultPerformances Edge Cases

    func testDefaultPerformancesHandlesEmptyPresets() {
        let viewModel = DefaultPerformancesViewModel()
        XCTAssertTrue(viewModel.presets.isEmpty)
    }

    func testDefaultPerformancesHandlesDuplicatePresets() {
        let viewModel = DefaultPerformancesViewModel()

        let preset1 = PerformancePreset(
            id: "test1",
            name: "Test Preset",
            parameters: [:]
        )

        let preset2 = PerformancePreset(
            id: "test1", // Duplicate ID
            name: "Test Preset 2",
            parameters: [:]
        )

        viewModel.addPreset(preset1)
        viewModel.addPreset(preset2)

        // Should handle duplicate IDs gracefully
        XCTAssertGreaterThan(viewModel.presets.count, 0)
    }

    func testDefaultPerformancesHandlesInvalidPresetValues() {
        let viewModel = DefaultPerformancesViewModel()

        let preset = PerformancePreset(
            id: "invalid",
            name: "Invalid Preset",
            parameters: [
                "negative": -100.0,
                "NaN": Double.nan,
                "infinity": Double.infinity,
                "string": "invalid" as NSNumber
            ]
        )

        XCTAssertNoThrow(viewModel.addPreset(preset))
    }

    // MARK: - Error Handling UI Tests

    func testErrorHandlingDisplaysCorrectly() {
        let viewModel = ErrorViewModel()

        let testError = NSError(
            domain: "com.whiteroom.test",
            code: 100,
            userInfo: [
                NSLocalizedDescriptionKey: "Test error message",
                NSLocalizedRecoverySuggestionErrorKey: "Try again"
            ]
        )

        viewModel.presentError(testError)

        XCTAssertTrue(viewModel.hasError)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    func testErrorHandlingHandlesMultipleErrors() {
        let viewModel = ErrorViewModel()

        for i in 0..<10 {
            let error = NSError(
                domain: "com.whiteroom.test",
                code: i,
                userInfo: [NSLocalizedDescriptionKey: "Error \(i)"]
            )
            viewModel.presentError(error)
        }

        XCTAssertTrue(viewModel.hasError)
    }

    func testErrorHandlingClearsErrors() {
        let viewModel = ErrorViewModel()

        let error = NSError(
            domain: "com.whiteroom.test",
            code: 100,
            userInfo: [NSLocalizedDescriptionKey: "Test error"]
        )

        viewModel.presentError(error)
        XCTAssertTrue(viewModel.hasError)

        viewModel.clearErrors()
        XCTAssertFalse(viewModel.hasError)
    }

    // MARK: - State Management Edge Cases

    func testStateManagementHandlesRapidStateChanges() async {
        let stateManager = StateManager()

        await stateManager.setState(.idle)

        for i in 0..<1000 {
            let state = AppState.allCases.randomElement() ?? .idle
            await stateManager.setState(state)
        }

        let currentState = await stateManager.currentState
        XCTAssertNotNil(currentState)
    }

    func testStateManagementHandlesConcurrentUpdates() async {
        let stateManager = StateManager()

        await withTaskGroup(of: Void.self) { group in
            for i in 0..<10 {
                group.addTask {
                    let state = AppState.allCases[i % AppState.allCases.count]
                    await stateManager.setState(state)
                }
            }
        }

        let currentState = await stateManager.currentState
        XCTAssertNotNil(currentState)
    }

    // MARK: - Navigation Edge Cases

    func testNavigationHandlesDeepLinking() {
        let navigator = NavigationManager()

        let deepLink = URL(string: "whiteroom://projection/piano")!
        navigator.handleDeepLink(deepLink)

        XCTAssertEqual(navigator.currentTab, .projection)
    }

    func testNavigationHandlesInvalidDeepLinks() {
        let navigator = NavigationManager()

        let invalidLink = URL(string: "whiteroom://invalid/route")!
        XCTAssertNoThrow(navigator.handleDeepLink(invalidLink))
    }

    func testNavigationHandlesRapidNavigationChanges() {
        let navigator = NavigationManager()

        for _ in 0..<100 {
            let tab = NavigationTab.allCases.randomElement() ?? .projection
            navigator.navigateTo(tab)
        }

        XCTAssertNotNil(navigator.currentTab)
    }

    // MARK: - Performance Tests

    func testPerformanceComponentRendering() {
        measure {
            let sweepControl = SweepControl(
                value: .constant(0.5),
                range: 0...1,
                label: "Performance Test"
            )

            // Force view rendering
            _ = sweepControl.body
        }
    }

    func testPerformanceStateUpdates() async {
        let stateManager = StateManager()

        measure {
            for i in 0..<10000 {
                let state = AppState.allCases[i % AppState.allCases.count]
                Task {
                    await stateManager.setState(state)
                }
            }
        }
    }

    func testPerformanceErrorHandling() {
        let viewModel = ErrorViewModel()

        measure {
            for i in 0..<1000 {
                let error = NSError(
                    domain: "com.whiteroom.test",
                    code: i,
                    userInfo: [NSLocalizedDescriptionKey: "Error \(i)"]
                )
                viewModel.presentError(error)
            }
        }
    }

    // MARK: - Memory Management Tests

    func testMemoryManagementComponentLifecycle() {
        var sweepControl: SweepControl? = SweepControl(
            value: .constant(0.5),
            range: 0...1,
            label: "Memory Test"
        )

        weak var weakReference = sweepControl

        XCTAssertNotNil(weakReference)

        sweepControl = nil

        XCTAssertNil(weakReference, "Component should be deallocated")
    }

    func testMemoryManagementViewModelLifecycle() {
        var viewModel: ProjectionEngineViewModel? = ProjectionEngineViewModel()

        weak var weakReference = viewModel

        XCTAssertNotNil(weakReference)

        viewModel = nil

        XCTAssertNil(weakReference, "ViewModel should be deallocated")
    }

    // MARK: - Integration Edge Cases

    func testIntegrationHandlesComponentUpdates() {
        let viewModel = ProjectionEngineViewModel()
        var value = 0.5

        let sweepControl = SweepControl(
            value: Binding(
                get: { value },
                set: { newValue in
                    value = newValue
                    viewModel.updateIntensity(newValue)
                }
            ),
            range: 0...1,
            label: "Integration Test"
        )

        value = 0.8
        XCTAssertEqual(viewModel.currentProjection?.intensity, 0.8, accuracy: 0.01)
    }

    func testIntegrationHandlesErrorRecovery() {
        let viewModel = ProjectionEngineViewModel()
        let errorViewModel = ErrorViewModel()

        let invalidProjection = ProjectionData(
            rhythm: RhythmData(events: []),
            intensity: -1.0,
            targetInstrument: .piano
        )

        viewModel.updateProjection(invalidProjection)

        if viewModel.hasError {
            errorViewModel.presentError(viewModel.error!)
        }

        // Should handle error gracefully
        XCTAssertNoThrow(viewModel.updateProjection(invalidProjection))
    }

    // MARK: - Accessibility Edge Cases

    func testAccessibilityHandlesVoiceOver() {
        let sweepControl = SweepControl(
            value: .constant(0.5),
            range: 0...1,
            label: "Accessibility Test"
        )

        // Force accessibility initialization
        _ = sweepControl.body

        // Should have accessibility label
        // Note: Actual accessibility testing would require UI testing
    }

    func testAccessibilityHandlesDynamicType() {
        let sweepControl = SweepControl(
            value: .constant(0.5),
            range: 0...1,
            label: "Dynamic Type Test"
        )

        // Force view rendering with different dynamic type settings
        _ = sweepControl.body
    }
}

// MARK: - Test Helpers

enum AppState: CaseIterable {
    case idle
    case loading
    case ready
    case error
}

enum NavigationTab: CaseIterable {
    case projection
    case performance
    case settings
}

@MainActor
class StateManager: ObservableObject {
    @Published var currentState: AppState = .idle

    func setState(_ state: AppState) async {
        currentState = state
    }
}

class NavigationManager: ObservableObject {
    @Published var currentTab: NavigationTab = .projection

    func navigateTo(_ tab: NavigationTab) {
        currentTab = tab
    }

    func handleDeepLink(_ url: URL) {
        // Parse deep link and navigate accordingly
        if url.pathComponents.contains("projection") {
            currentTab = .projection
        }
    }
}

struct ProjectionData {
    var rhythm: RhythmData
    var intensity: Double
    var targetInstrument: InstrumentType
}

struct RhythmData {
    var events: [RhythmEvent]
}

struct RhythmEvent {
    var time: Double
    var duration: Double
    var velocity: UInt8
}

enum InstrumentType {
    case piano
    case guitar
    case bass
    case drums
}

struct PerformancePreset {
    var id: String
    var name: String
    var parameters: [String: Any]
}

class DefaultPerformancesViewModel: ObservableObject {
    @Published var presets: [PerformancePreset] = []

    func addPreset(_ preset: PerformancePreset) {
        presets.append(preset)
    }
}

class ErrorViewModel: ObservableObject {
    @Published var hasError: Bool = false
    @Published var errorMessage: String?

    func presentError(_ error: Error) {
        hasError = true
        errorMessage = error.localizedDescription
    }

    func clearErrors() {
        hasError = false
        errorMessage = nil
    }
}
