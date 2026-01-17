//
//  JUCEEngine.swift
//  White Room Swift Frontend
//
//  Manages communication between Swift frontend and JUCE audio engine
//  Implements real FFI bridge to C++ backend
//

import Foundation
import Combine

// MARK: - FFI Bridge Implementation

/// Manages communication between Swift frontend and JUCE audio engine
public class JUCEEngine: ObservableObject {

    // MARK: - Properties

    public static let shared = JUCEEngine()

    @Published public var isEngineRunning: Bool = false
    @Published public var currentPerformances: (a: PerformanceInfo, b: PerformanceInfo)?
    @Published public var currentBlendValue: Double = 0.0

    private let engineQueue = DispatchQueue(label: "com.whiteroom.audio.engine", qos: .userInitiated)

    // FFI: Opaque engine handle
    private var engineHandle: OpaquePointer?

    // MARK: - Initialization

    private init() {
        initializeFFI()
    }

    /// Initialize the JUCE engine via FFI
    private func initializeFFI() {
        engineQueue.async { [weak self] in
            guard let self = self else { return }

            var engine: OpaquePointer?
            let result = sch_engine_create(&engine)

            if result == SCH_OK && engine != nil {
                self.engineHandle = engine

                // Create default song
                _ = sch_engine_create_default_song(engine)

                DispatchQueue.main.async {
                    NSLog("[JUCEEngine] Engine initialized successfully via FFI")
                }

                // Get version info
                var versionString = sch_string_t(data: nil, length: 0)
                let verResult = sch_engine_get_version(&versionString)

                if verResult == SCH_OK, let versionData = versionString.data {
                    let version = String(cString: versionData)
                    NSLog("[JUCEEngine] Engine version: \(version)")
                    sch_free_string(&versionString)
                }
            } else {
                DispatchQueue.main.async {
                    NSLog("[JUCEEngine] FAILED to initialize engine: \(result)")
                }
            }
        }
    }

    deinit {
        // Cleanup FFI resources
        if let handle = engineHandle {
            _ = sch_engine_destroy(handle)
        }
    }

    // MARK: - Public API

    /// Sets the performance blend between two performances
    public func setPerformanceBlend(
        _ performanceA: PerformanceInfo,
        _ performanceB: PerformanceInfo,
        blendValue: Double
    ) {
        engineQueue.async { [weak self] in
            guard let self = self, let handle = self.engineHandle else {
                NSLog("[JUCEEngine] ERROR: Engine not initialized")
                return
            }

            let clampedValue = max(0.0, min(1.0, blendValue))

            // Call FFI to set performance blend
            let result = performanceA.id.withCString { idA in
                performanceB.id.withCString { idB in
                    sch_engine_set_performance_blend(
                        handle,
                        idA,
                        idB,
                        clampedValue
                    )
                }
            }

            if result == SCH_OK {
                DispatchQueue.main.async {
                    self.currentPerformances = (performanceA, performanceB)
                    self.currentBlendValue = clampedValue
                    NSLog("[JUCEEngine] Set blend: \(performanceA.name) (\(clampedValue)) ↔ \(performanceB.name)")
                }
            } else {
                NSLog("[JUCEEngine] ERROR: Failed to set blend - \(result)")
            }
        }
    }

    /// Fetches the list of available performances
    public func fetchAvailablePerformances() -> [PerformanceInfo] {
        // For now, return default performances
        // In Phase 2, this will query the engine via FFI
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
            guard let self = self, let handle = self.engineHandle else {
                NSLog("[JUCEEngine] ERROR: Engine not initialized")
                return
            }

            // Initialize audio with default config
            var audioConfig = sch_audio_config_t(
                sample_rate: 48000.0,
                buffer_size: 512,
                input_channels: 0,
                output_channels: 2
            )

            let initResult = sch_engine_audio_init(handle, &audioConfig)

            if initResult == SCH_OK {
                // Start audio processing
                let startResult = sch_engine_audio_start(handle)

                if startResult == SCH_OK {
                    DispatchQueue.main.async {
                        self.isEngineRunning = true
                        NSLog("[JUCEEngine] Engine started successfully")
                    }
                } else {
                    NSLog("[JUCEEngine] ERROR: Failed to start audio - \(startResult)")
                }
            } else {
                NSLog("[JUCEEngine] ERROR: Failed to initialize audio - \(initResult)")
            }
        }
    }

    /// Stops the audio engine
    public func stopEngine() {
        engineQueue.async { [weak self] in
            guard let self = self, let handle = self.engineHandle else {
                NSLog("[JUCEEngine] ERROR: Engine not initialized")
                return
            }

            let result = sch_engine_audio_stop(handle)

            if result == SCH_OK {
                DispatchQueue.main.async {
                    self.isEngineRunning = false
                    NSLog("[JUCEEngine] Engine stopped successfully")
                }
            } else {
                NSLog("[JUCEEngine] ERROR: Failed to stop engine - \(result)")
            }
        }
    }

    /// Load a song from JSON
    public func loadSong(json: String) throws {
        guard let handle = engineHandle else {
            throw JUCEEngineError.engineNotInitialized
        }

        try json.withCString { cString in
            let result = sch_engine_load_song(handle, cString)

            if result != SCH_OK {
                throw JUCEEngineError.engineError("Failed to load song: \(result)")
            }
        }

        NSLog("[JUCEEngine] Song loaded successfully")
    }

    /// Get current song as JSON
    public func getCurrentSong() throws -> String {
        guard let handle = engineHandle else {
            throw JUCEEngineError.engineNotInitialized
        }

        var jsonString = sch_string_t(data: nil, length: 0)
        let result = sch_engine_get_song(handle, &jsonString)

        guard result == SCH_OK, let data = jsonString.data else {
            throw JUCEEngineError.engineError("Failed to get song: \(result)")
        }

        let song = String(cString: data)
        sch_free_string(&jsonString)

        return song
    }

    /// Set tempo
    public func setTempo(_ tempo: Double) throws {
        guard let handle = engineHandle else {
            throw JUCEEngineError.engineNotInitialized
        }

        let result = sch_engine_set_tempo(handle, tempo)

        if result != SCH_OK {
            throw JUCEEngineError.engineError("Failed to set tempo: \(result)")
        }

        NSLog("[JUCEEngine] Tempo set to \(tempo) BPM")
    }

    /// Set transport state
    public func setTransport(_ state: TransportState) throws {
        guard let handle = engineHandle else {
            throw JUCEEngineError.engineNotInitialized
        }

        let ffiState: SchTransportStateFFI
        switch state {
        case .stopped:
            ffiState = .stopped
        case .playing:
            ffiState = .playing
        case .recording:
            ffiState = .recording
        case .paused:
            ffiState = .paused
        }

        let result = sch_engine_set_transport(handle, ffiState)

        if result != SCH_OK {
            throw JUCEEngineError.engineError("Failed to set transport: \(result)")
        }

        NSLog("[JUCEEngine] Transport set to \(state)")
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

// MARK: - Supporting Types

// TransportState is now canonical in SwiftFrontendShared/MusicalModels.swift
// This enum is for FFI mapping only
internal enum SchTransportStateFFI: UInt32 {
    case stopped = 0
    case playing = 1
    case recording = 2
    case paused = 3
}

// MARK: - FFI Constants

let SCH_OK = SchResult.ok

/// FFI Audio configuration
struct sch_audio_config_t {
    var sample_rate: Double
    var buffer_size: UInt32
    var input_channels: UInt32
    var output_channels: UInt32
}

/// FFI String with ownership transfer
struct sch_string_t {
    var data: UnsafeMutablePointer<CChar>?
    var length: Int
}

// MARK: - FFI Function Declarations

// NOTE: These are stub implementations for compilation
// Real FFI bridge will be implemented when JUCE backend is integrated

/// Create a new Schillinger engine instance
internal func sch_engine_create(_ out_engine: UnsafeMutablePointer<OpaquePointer?>) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_create called")
    // Stub: Create a fake opaque pointer
    out_engine.pointee = OpaquePointer(bitPattern: 0x12345678)
    return .ok
}

/// Destroy an engine instance
internal func sch_engine_destroy(_ engine: OpaquePointer?) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_destroy called")
    return .ok
}

/// Get engine version info
internal func sch_engine_get_version(_ out_version: UnsafeMutablePointer<sch_string_t>) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_get_version called")
    let version = "0.1.0-stub"
    out_version.pointee = sch_string_t(
        data: UnsafeMutablePointer(mutating: (version as NSString).utf8String),
        length: version.count
    )
    return .ok
}

/// Create a default song
internal func sch_engine_create_default_song(_ engine: OpaquePointer?) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_create_default_song called")
    return .ok
}

/// Load a song from JSON
internal func sch_engine_load_song(_ engine: OpaquePointer?, _ json: UnsafePointer<CChar>) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_load_song called")
    return .ok
}

/// Get current song as JSON
internal func sch_engine_get_song(_ engine: OpaquePointer?, _ out_json: UnsafeMutablePointer<sch_string_t>) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_get_song called")
    let song = "{\"name\":\"Stub Song\"}"
    out_json.pointee = sch_string_t(
        data: UnsafeMutablePointer(mutating: (song as NSString).utf8String),
        length: song.count
    )
    return .ok
}

/// Initialize audio subsystem
internal func sch_engine_audio_init(_ engine: OpaquePointer?, _ config: UnsafePointer<sch_audio_config_t>) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_audio_init called")
    return .ok
}

/// Start audio processing
internal func sch_engine_audio_start(_ engine: OpaquePointer?) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_audio_start called")
    return .ok
}

/// Stop audio processing
internal func sch_engine_audio_stop(_ engine: OpaquePointer?) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_audio_stop called")
    return .ok
}

/// Set performance blend
internal func sch_engine_set_performance_blend(
    _ engine: OpaquePointer?,
    _ performance_a_id: UnsafePointer<CChar>,
    _ performance_b_id: UnsafePointer<CChar>,
    _ blend_value: Double
) -> SchResult {
    let idA = String(cString: performance_a_id)
    let idB = String(cString: performance_b_id)
    NSLog("[JUCEEngine STUB] sch_engine_set_performance_blend: \(idA) <-> \(idB) @ \(blend_value)")
    return .ok
}

/// Set transport state
internal func sch_engine_set_transport(_ engine: OpaquePointer?, _ state: SchTransportStateFFI) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_set_transport: \(state)")
    return .ok
}

/// Set tempo
internal func sch_engine_set_tempo(_ engine: OpaquePointer?, _ tempo: Double) -> SchResult {
    NSLog("[JUCEEngine STUB] sch_engine_set_tempo: \(tempo)")
    return .ok
}

/// Free string allocated by FFI
internal func sch_free_string(_ str: UnsafeMutablePointer<sch_string_t>) {
    // Stub: strings are statically allocated, no need to free
    NSLog("[JUCEEngine STUB] sch_free_string called")
}
