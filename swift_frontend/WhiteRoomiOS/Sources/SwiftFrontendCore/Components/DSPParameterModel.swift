import Foundation
import Combine
import SwiftUI

/// DSP parameter model for real-time audio parameter control
///
/// Provides observable state management for DSP parameters with:
/// - Real-time value updates
/// - Undo/redo integration
/// - Parameter smoothing
/// - Automation support
@MainActor
public class DSPParameterModel: ObservableObject {
    // MARK: - Published Properties

    @Published public var parameters: [DSPParameter] = []
    @Published public var presetName: String = "Default"
    @Published public var isModified: Bool = false
    @Published public var automationEnabled: Bool = false

    // MARK: - Private Properties

    private var parameterValues: [String: Float] = [:]
    private var undoStack: [DSPParameterState] = []
    private var redoStack: [DSPParameterState] = []
    private let maxUndoDepth = 50
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    public init() {
        setupDefaultParameters()
    }

    // MARK: - Parameter Management

    /// Sets up default DSP parameters for synthesis
    private func setupDefaultParameters() {
        parameters = [
            // Oscillator 1
            DSPParameter(
                id: "osc1_waveform",
                name: "Osc 1 Waveform",
                group: .oscillator,
                type: .enumeration,
                value: 0.0,
                defaultValue: 0.0,
                minValue: 0.0,
                maxValue: 5.0,
                unit: "",
                enumValues: ["Saw", "Square", "Triangle", "Sine", "Pulse", "Noise"]
            ),

            DSPParameter(
                id: "osc1_frequency",
                name: "Osc 1 Frequency",
                group: .oscillator,
                type: .continuous,
                value: 440.0,
                defaultValue: 440.0,
                minValue: 20.0,
                maxValue: 20000.0,
                unit: "Hz",
                displayScaler: 1.0
            ),

            DSPParameter(
                id: "osc1_detune",
                name: "Osc 1 Detune",
                group: .oscillator,
                type: .continuous,
                value: 0.0,
                defaultValue: 0.0,
                minValue: -100.0,
                maxValue: 100.0,
                unit: "cents"
            ),

            DSPParameter(
                id: "osc1_pulseWidth",
                name: "Osc 1 Pulse Width",
                group: .oscillator,
                type: .continuous,
                value: 0.5,
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            // Oscillator 2
            DSPParameter(
                id: "osc2_waveform",
                name: "Osc 2 Waveform",
                group: .oscillator,
                type: .enumeration,
                value: 0.0,
                defaultValue: 0.0,
                minValue: 0.0,
                maxValue: 5.0,
                unit: "",
                enumValues: ["Saw", "Square", "Triangle", "Sine", "Pulse", "Noise"]
            ),

            DSPParameter(
                id: "osc2_frequency",
                name: "Osc 2 Frequency",
                group: .oscillator,
                type: .continuous,
                value: 440.0,
                defaultValue: 440.0,
                minValue: 20.0,
                maxValue: 20000.0,
                unit: "Hz"
            ),

            DSPParameter(
                id: "osc2_detune",
                name: "Osc 2 Detune",
                group: .oscillator,
                type: .continuous,
                value: 0.0,
                defaultValue: 0.0,
                minValue: -100.0,
                maxValue: 100.0,
                unit: "cents"
            ),

            // Filter
            DSPParameter(
                id: "filter_cutoff",
                name: "Filter Cutoff",
                group: .filter,
                type: .continuous,
                value: 2000.0,
                defaultValue: 2000.0,
                minValue: 20.0,
                maxValue: 20000.0,
                unit: "Hz",
                displayScaler: 1.0
            ),

            DSPParameter(
                id: "filter_resonance",
                name: "Filter Resonance",
                group: .filter,
                type: .continuous,
                value: 0.5,
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            DSPParameter(
                id: "filter_type",
                name: "Filter Type",
                group: .filter,
                type: .enumeration,
                value: 0.0,
                defaultValue: 0.0,
                minValue: 0.0,
                maxValue: 3.0,
                unit: "",
                enumValues: ["LPF", "HPF", "BPF", "Notch"]
            ),

            DSPParameter(
                id: "filter_env_amount",
                name: "Filter Env Amount",
                group: .filter,
                type: .continuous,
                value: 0.5,
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            // Envelope (ADSR)
            DSPParameter(
                id: "env_attack",
                name: "Attack",
                group: .envelope,
                type: .continuous,
                value: 0.01,
                defaultValue: 0.01,
                minValue: 0.001,
                maxValue: 5.0,
                unit: "s",
                displayScaler: 1.0
            ),

            DSPParameter(
                id: "env_decay",
                name: "Decay",
                group: .envelope,
                type: .continuous,
                value: 0.3,
                defaultValue: 0.3,
                minValue: 0.01,
                maxValue: 5.0,
                unit: "s"
            ),

            DSPParameter(
                id: "env_sustain",
                name: "Sustain",
                group: .envelope,
                type: .continuous,
                value: 0.7,
                defaultValue: 0.7,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            DSPParameter(
                id: "env_release",
                name: "Release",
                group: .envelope,
                type: .continuous,
                value: 0.5,
                defaultValue: 0.5,
                minValue: 0.01,
                maxValue: 10.0,
                unit: "s"
            ),

            // Effects
            DSPParameter(
                id: "fx_reverb_mix",
                name: "Reverb Mix",
                group: .effects,
                type: .continuous,
                value: 0.2,
                defaultValue: 0.2,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            DSPParameter(
                id: "fx_reverb_decay",
                name: "Reverb Decay",
                group: .effects,
                type: .continuous,
                value: 2.0,
                defaultValue: 2.0,
                minValue: 0.1,
                maxValue: 10.0,
                unit: "s"
            ),

            DSPParameter(
                id: "fx_delay_time",
                name: "Delay Time",
                group: .effects,
                type: .continuous,
                value: 0.5,
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 2.0,
                unit: "s"
            ),

            DSPParameter(
                id: "fx_delay_feedback",
                name: "Delay Feedback",
                group: .effects,
                type: .continuous,
                value: 0.4,
                defaultValue: 0.4,
                minValue: 0.0,
                maxValue: 0.95,
                unit: ""
            ),

            DSPParameter(
                id: "fx_delay_mix",
                name: "Delay Mix",
                group: .effects,
                type: .continuous,
                value: 0.3,
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            // Master
            DSPParameter(
                id: "master_volume",
                name: "Master Volume",
                group: .master,
                type: .continuous,
                value: 0.8,
                defaultValue: 0.8,
                minValue: 0.0,
                maxValue: 1.0,
                unit: ""
            ),

            DSPParameter(
                id: "master_pan",
                name: "Master Pan",
                group: .master,
                type: .continuous,
                value: 0.0,
                defaultValue: 0.0,
                minValue: -1.0,
                maxValue: 1.0,
                unit: ""
            ),
        ]

        // Initialize parameter values
        for param in parameters {
            parameterValues[param.id] = param.value
        }
    }

    // MARK: - Parameter Access

    /// Gets the current value of a parameter
    public func getValue(for parameterId: String) -> Float {
        return parameterValues[parameterId] ?? 0.0
    }

    /// Sets the value of a parameter
    public func setValue(_ value: Float, for parameterId: String) {
        saveStateForUndo()

        parameterValues[parameterId] = value

        if let index = parameters.firstIndex(where: { $0.id == parameterId }) {
            parameters[index].value = value
            isModified = true
        }

        // Send to audio engine
        sendParameterToEngine(id: parameterId, value: value)
    }

    /// Gets a parameter by ID
    public func getParameter(for parameterId: String) -> DSPParameter? {
        return parameters.first { $0.id == parameterId }
    }

    /// Gets all parameters in a group
    public func getParameters(in group: DSPParameterGroup) -> [DSPParameter] {
        return parameters.filter { $0.group == group }
    }

    // MARK: - Preset Management

    /// Saves current parameters as a preset
    public func savePreset(name: String) {
        presetName = name
        // TODO: Implement preset persistence
        isModified = false
    }

    /// Loads a preset
    public func loadPreset(name: String) {
        // TODO: Implement preset loading
        presetName = name
        isModified = false
    }

    // MARK: - Undo/Redo

    /// Saves current state for undo
    private func saveStateForUndo() {
        let state = DSPParameterState(
            parameterValues: parameterValues,
            presetName: presetName
        )

        undoStack.append(state)

        // Limit undo stack size
        if undoStack.count > maxUndoDepth {
            undoStack.removeFirst()
        }

        // Clear redo stack on new action
        redoStack.removeAll()
    }

    /// Undoes the last parameter change
    public func undo() {
        guard let state = undoStack.popLast() else { return }

        // Save current state for redo
        let currentState = DSPParameterState(
            parameterValues: parameterValues,
            presetName: presetName
        )
        redoStack.append(currentState)

        // Restore previous state
        restoreState(state)
    }

    /// Redoes the last undone change
    public func redo() {
        guard let state = redoStack.popLast() else { return }

        // Save current state for undo
        let currentState = DSPParameterState(
            parameterValues: parameterValues,
            presetName: presetName
        )
        undoStack.append(currentState)

        // Restore redo state
        restoreState(state)
    }

    /// Restores a saved state
    private func restoreState(_ state: DSPParameterState) {
        parameterValues = state.parameterValues
        presetName = state.presetName

        // Update all parameters
        for (id, value) in parameterValues {
            if let index = parameters.firstIndex(where: { $0.id == id }) {
                parameters[index].value = value
            }
        }

        isModified = true
    }

    /// Checks if undo is available
    public var canUndo: Bool {
        return !undoStack.isEmpty
    }

    /// Checks if redo is available
    public var canRedo: Bool {
        return !redoStack.isEmpty
    }

    // MARK: - Engine Integration

    /// Sends parameter value to audio engine
    private func sendParameterToEngine(id: String, value: Float) {
        // TODO: Implement FFI call to JUCE engine
        // Example:
        // sch_engine_set_parameter(engine, id, value)

        #if DEBUG
        print("[DSPParameterModel] Setting \(id) = \(value)")
        #endif
    }

    /// Receives parameter update from audio engine
    public func receiveParameterUpdate(id: String, value: Float) {
        parameterValues[id] = value

        if let index = parameters.firstIndex(where: { $0.id == id }) {
            parameters[index].value = value
        }
    }
}

// MARK: - Supporting Types

/// DSP parameter definition
public struct DSPParameter: Identifiable, Equatable {
    public let id: String
    public let name: String
    public let group: DSPParameterGroup
    public let type: DSPParameterType
    public var value: Float
    public let defaultValue: Float
    public let minValue: Float
    public let maxValue: Float
    public let unit: String
    public let displayScaler: Float
    public let enumValues: [String]

    public init(
        id: String,
        name: String,
        group: DSPParameterGroup,
        type: DSPParameterType,
        value: Float,
        defaultValue: Float,
        minValue: Float,
        maxValue: Float,
        unit: String,
        displayScaler: Float = 1.0,
        enumValues: [String] = []
    ) {
        self.id = id
        self.name = name
        self.group = group
        self.type = type
        self.value = value
        self.defaultValue = defaultValue
        self.minValue = minValue
        self.maxValue = maxValue
        self.unit = unit
        self.displayScaler = displayScaler
        self.enumValues = enumValues
    }

    /// Gets the normalized value (0-1) for UI controls
    public var normalizedValue: Double {
        let range = maxValue - minValue
        return range != 0 ? Double((value - minValue) / range) : 0.0
    }

    /// Formats the value for display
    public func displayValue(_ value: Float? = nil) -> String {
        let val = value ?? self.value
        let scaled = val * displayScaler

        switch type {
        case .enumeration:
            let index = Int(val)
            return index < enumValues.count ? enumValues[index] : "?"
        case .continuous:
            if unit == "Hz" {
                return scaled >= 1000 ? String(format: "%.1f kHz", scaled / 1000) : String(format: "%.0f Hz", scaled)
            } else if unit == "s" {
                return scaled < 0.001 ? String(format: "%.1f ms", scaled * 1000) : String(format: "%.3f s", scaled)
            } else {
                return String(format: "%.2f", scaled)
            }
        case .boolean:
            return val > 0.5 ? "On" : "Off"
        }
    }
}

/// DSP parameter group
public enum DSPParameterGroup: String, CaseIterable {
    case oscillator = "Oscillator"
    case filter = "Filter"
    case envelope = "Envelope"
    case effects = "Effects"
    case master = "Master"
}

/// DSP parameter type
public enum DSPParameterType {
    case continuous
    case enumeration
    case boolean
}

/// DSP parameter state for undo/redo
private struct DSPParameterState {
    let parameterValues: [String: Float]
    let presetName: String
}
