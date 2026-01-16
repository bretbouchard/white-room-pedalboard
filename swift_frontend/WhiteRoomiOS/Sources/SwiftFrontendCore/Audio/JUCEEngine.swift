import Foundation
import Combine

/// Manages communication between Swift frontend and JUCE audio engine
public class JUCEEngine: ObservableObject {

    // MARK: - Properties

    public static let shared = JUCEEngine()

    @Published public var isEngineRunning: Bool = false
    @Published public var currentPerformances: (a: PerformanceInfo, b: PerformanceInfo)?
    @Published public var currentBlendValue: Double = 0.0

    private let engineQueue = DispatchQueue(label: "com.whiteroom.audio.engine", qos: .userInitiated)

    // MARK: - Initialization

    private init() {
        // TODO: Initialize JUCE engine via FFI when SchillingerFFI module is available
        NSLog("[JUCEEngine] Engine stub created - FFI not yet implemented")
    }

    // MARK: - Public API

    /// Sets the performance blend between two performances
    public func setPerformanceBlend(
        _ performanceA: PerformanceInfo,
        _ performanceB: PerformanceInfo,
        blendValue: Double
    ) {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            let clampedValue = max(0.0, min(1.0, blendValue))

            DispatchQueue.main.async {
                self.currentPerformances = (performanceA, performanceB)
                self.currentBlendValue = clampedValue
            }

            // TODO: Send to JUCE engine via FFI
            NSLog("[JUCEEngine] Set blend: \(performanceA.name) (\(clampedValue)) ↔ \(performanceB.name)")
        }
    }

    /// Fetches the list of available performances
    public func fetchAvailablePerformances() -> [PerformanceInfo] {
        return [
            PerformanceInfo(id: "piano", name: "Piano", description: "Soft piano"),
            PerformanceInfo(id: "techno", name: "Techno", description: "Electronic beats"),
            PerformanceInfo(id: "jazz", name: "Jazz", description: "Smooth jazz"),
            PerformanceInfo(id: "orchestral", name: "Orchestral", description: "Full ensemble")
        ]
    }

    /// Starts the audio engine
    public func startEngine() {
        engineQueue.async { [weak self] in
            DispatchQueue.main.async {
                self?.isEngineRunning = true
                NSLog("[JUCEEngine] Engine started (stub)")
            }
        }
    }

    /// Stops the audio engine
    public func stopEngine() {
        engineQueue.async { [weak self] in
            DispatchQueue.main.async {
                self?.isEngineRunning = false
                NSLog("[JUCEEngine] Engine stopped (stub)")
            }
        }
    }
}

// MARK: - Performance State Management

extension JUCEEngine {
    public func updatePerformanceA(_ performance: PerformanceInfo) {
        if let current = currentPerformances {
            setPerformanceBlend(performance, current.b, blendValue: currentBlendValue)
        }
    }

    public func updatePerformanceB(_ performance: PerformanceInfo) {
        if let current = currentPerformances {
            setPerformanceBlend(current.a, performance, blendValue: currentBlendValue)
        }
    }
}

// MARK: - Error Handling

public enum JUCEEngineError: Error, LocalizedError {
    case engineNotInitialized
    case invalidPerformance(String)
    case invalidBlendValue(Double)
    case communicationFailed(String)
    case engineError(String)

    public var errorDescription: String? {
        switch self {
        case .engineNotInitialized:
            return "JUCE engine is not initialized"
        case .invalidPerformance(let performance):
            return "Invalid performance: \(performance)"
        case .invalidBlendValue(let value):
            return "Invalid blend value: \(value)"
        case .communicationFailed(let message):
            return "Failed to communicate: \(message)"
        case .engineError(let message):
            return "Engine error: \(message)"
        }
    }
}
