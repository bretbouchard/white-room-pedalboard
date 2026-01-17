# FilterGate Swift Integration Guide

## Overview

FilterGate provides a C ABI (Foreign Function Interface) for seamless integration with Swift applications. This guide demonstrates how to use the FilterGate DSP processor from Swift.

## Basic Setup

### 1. Import the C Library

```swift
import Foundation
```

### 2. Create FilterGate Instance

```swift
// Create processor with sample rate
let sampleRate: Double = 48000.0
let handle = filtergate_create(sampleRate)

if handle == nil {
    print("Failed to create FilterGate instance")
    exit(1)
}
```

### 3. Process Audio

```swift
// Mono processing
let bufferSize = 256
var input = [Float](repeating: 0.0, count: bufferSize)
var output = [Float](repeating: 0.0, count: bufferSize)

// Fill input with audio data...

// Process mono
input.withUnsafeMutableBufferPointer { inputPtr in
    output.withUnsafeMutableBufferPointer { outputPtr in
        filtergate_process_mono(
            handle,
            inputPtr.baseAddress,
            outputPtr.baseAddress,
            bufferSize
        )
    }
}
```

```swift
// Stereo processing
var left = [Float](repeating: 0.0, count: bufferSize)
var right = [Float](repeating: 0.0, count: bufferSize)

// Fill channels with audio data...

left.withUnsafeMutableBufferPointer { leftPtr in
    right.withUnsafeMutableBufferPointer { rightPtr in
        filtergate_process_stereo(
            handle,
            leftPtr.baseAddress,
            rightPtr.baseAddress,
            bufferSize
        )
    }
}
```

### 4. Cleanup

```swift
// Always destroy the handle when done
filtergate_destroy(handle)
```

## Preset Management

### Loading a Preset

```swift
func loadPreset(from url: URL, handle: FilterGateHandle) -> Bool {
    do {
        let data = try Data(contentsOf: url)
        let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]

        guard let preset = json else {
            print("Invalid preset format")
            return false
        }

        return applyPreset(preset, to: handle)
    } catch {
        print("Failed to load preset: \(error)")
        return false
    }
}

func applyPreset(_ preset: [String: Any], to handle: FilterGateHandle) -> Bool {
    // Apply gate parameters
    if let gate = preset["gate"] as? [String: Any] {
        if let threshold = gate["threshold"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_GATE_THRESHOLD, threshold)
        }
        if let attack = gate["attack"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_GATE_ATTACK, attack / 1000.0) // Convert ms to normalized
        }
        // ... other gate parameters
    }

    // Apply envelope parameters
    if let env1 = preset["envelope1"] as? [String: Any] {
        if let attack = env1["attack"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_ENV1_ATTACK, attack / 5000.0) // Normalize
        }
        // ... other envelope parameters
    }

    // Apply filter parameters
    if let filter = preset["filter"] as? [String: Any] {
        if let cutoff = filter["cutoff"] as? Float {
            // Logarithmic mapping from Hz to normalized 0-1
            let normalized = log2(cutoff / 20.0) / log2(20000.0 / 20.0)
            filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, normalized)
        }
        if let resonance = filter["resonance"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_RESONANCE, resonance)
        }
        // ... other filter parameters
    }

    // Apply phaser parameters
    if let phaserA = preset["phaserA"] as? [String: Any] {
        if let rate = phaserA["rate"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_PHASER_A_RATE, rate / 10.0) // Normalize
        }
        if let depth = phaserA["depth"] as? Float {
            filtergate_set_param(handle, FILTERGATE_PARAM_PHASER_A_DEPTH, depth)
        }
        // ... other phaser parameters
    }

    // Apply modulation routes
    if let modMatrix = preset["modulationMatrix"] as? [String: Any],
       let enabled = modMatrix["enabled"] as? Bool,
       let routes = modMatrix["routes"] as? [String] {

        if enabled {
            for routeString in routes {
                let parts = routeString.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
                if parts.count == 4,
                   let source = Int(parts[0]),
                   let destination = Int(parts[1]),
                   let amount = Float(parts[2]),
                   let slew = Float(parts[3]) {
                    filtergate_add_mod_route(handle, Int32(source), Int32(destination), amount, slew)
                }
            }
        }
    }

    return true
}
```

### Saving a Preset

```swift
func saveCurrentPreset(to url: URL, from handle: FilterGateHandle, name: String) -> Bool {
    var preset: [String: Any] = [:]

    // Metadata
    preset["name"] = name
    preset["author"] = "User"
    preset["category"] = "User"
    preset["version"] = 1

    // Get current timestamp
    let dateFormatter = ISO8601DateFormatter()
    preset["createdDate"] = dateFormatter.string(from: Date())
    preset["modifiedDate"] = dateFormatter.string(from: Date())

    // Capture parameters (example)
    let threshold = filtergate_get_param(handle, FILTERGATE_PARAM_GATE_THRESHOLD)
    preset["gate"] = [
        "threshold": threshold,
        "attack": filtergate_get_param(handle, FILTERGATE_PARAM_GATE_ATTACK) * 1000.0, // Convert to ms
        "hold": filtergate_get_param(handle, FILTERGATE_PARAM_GATE_HOLD) * 5000.0,
        "release": filtergate_get_param(handle, FILTERGATE_PARAM_GATE_RELEASE) * 5000.0,
        "hysteresis": filtergate_get_param(handle, FILTERGATE_PARAM_GATE_HYSTERESIS) * 0.5
    ]

    // ... capture other parameters

    do {
        let data = try JSONSerialization.data(withJSONObject: preset, options: .prettyPrinted)
        try data.write(to: url)
        return true
    } catch {
        print("Failed to save preset: \(error)")
        return false
    }
}
```

## Parameter Control

### Setting Parameters

```swift
// Set filter cutoff (normalized 0-1)
filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, 0.7)

// Set filter resonance
filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_RESONANCE, 0.5)

// Check for errors
if let error = filtergate_get_last_error(handle) {
    let errorString = String(cString: error)
    print("Error: \(errorString)")
    filtergate_clear_error(handle)
}
```

### Getting Parameters

```swift
// Get current filter cutoff
let cutoff = filtergate_get_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF)
print("Current cutoff: \(cutoff)")
```

## Envelope Triggering

```swift
// Trigger envelope 1 with velocity
filtergate_trigger_envelope(handle, 0, 0.8) // Envelope 0, velocity 0.8

// Release envelope
filtergate_release_envelope(handle, 0)

// Get current envelope level
let level = filtergate_get_envelope_level(handle, 0)
print("Envelope 1 level: \(level)")
```

## Modulation Routing

```swift
// Add modulation route: Envelope 1 → Filter Cutoff
let routeIndex = filtergate_add_mod_route(
    handle,
    Int32(MOD_SOURCE_ENV1.rawValue),
    Int32(MOD_DESTINATION_FILTER_CUTOFF.rawValue),
    0.8,  // Amount
    10.0  // Slew time in ms
)

if routeIndex >= 0 {
    print("Added modulation route at index: \(routeIndex)")
} else {
    print("Failed to add modulation route")
    if let error = filtergate_get_last_error(handle) {
        print("Error: \(String(cString: error))")
    }
}

// Remove modulation route
filtergate_remove_mod_route(handle, routeIndex)

// Clear all modulation routes
filtergate_clear_mod_routes(handle)

// Get current modulation value
let modValue = filtergate_get_modulation(handle, Int32(MOD_DESTINATION_FILTER_CUTOFF.rawValue))
print("Current filter cutoff modulation: \(modValue)")
```

## State Queries

```swift
// Get gate state
let gateState = filtergate_get_gate_state(handle)
print("Gate is \(gateState > 0.5 ? "open" : "closed")")

// Check if gate just opened
let justOpened = filtergate_gate_just_opened(handle)
if justOpened != 0 {
    print("Gate just opened!")
}

// Get envelope follower level
let envFollowLevel = filtergate_get_envelope_follower_level(handle)
print("Envelope follower level: \(envFollowLevel)")
```

## Complete Swift Example

```swift
import Foundation

class FilterGateProcessor {
    private var handle: FilterGateHandle?
    let sampleRate: Double

    init(sampleRate: Double = 48000.0) {
        self.sampleRate = sampleRate
        self.handle = filtergate_create(sampleRate)

        if self.handle == nil {
            fatalError("Failed to create FilterGate instance")
        }
    }

    deinit {
        if let handle = self.handle {
            filtergate_destroy(handle)
        }
    }

    func process(_ input: [Float]) -> [Float] {
        guard let handle = handle else { return [] }

        var output = [Float](repeating: 0.0, count: input.count)

        input.withUnsafeBufferPointer { inputPtr in
            output.withUnsafeMutableBufferPointer { outputPtr in
                filtergate_process_mono(
                    handle,
                    inputPtr.baseAddress,
                    outputPtr.baseAddress,
                    Int32(input.count)
                )
            }
        }

        return output
    }

    func loadPreset(from url: URL) -> Bool {
        guard let handle = handle else { return false }
        // Implementation from above
        return true
    }

    func setFilterCutoff(_ value: Float) {
        guard let handle = handle else { return }
        filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, value)
    }

    func setPhaserDepth(_ value: Float) {
        guard let handle = handle else { return }
        filtergate_set_param(handle, FILTERGATE_PARAM_PHASER_A_DEPTH, value)
    }

    func triggerEnvelope(_ index: Int, velocity: Float) {
        guard let handle = handle else { return }
        filtergate_trigger_envelope(handle, Int32(index), velocity)
    }
}

// Usage
let processor = FilterGateProcessor()

// Load a preset
if let presetURL = Bundle.main.url(forResource: "Subtle Phaser", withExtension: "json") {
    processor.loadPreset(from: presetURL)
}

// Set some parameters
processor.setFilterCutoff(0.7)
processor.setPhaserDepth(0.6)

// Trigger envelope
processor.triggerEnvelope(0, velocity: 0.8)

// Process audio
let inputAudio: [Float] = ... // Your audio input
let outputAudio = processor.process(inputAudio)
```

## Error Handling

```swift
func checkError(handle: FilterGateHandle) {
    if let error = filtergate_get_last_error(handle) {
        let errorString = String(cString: error)
        print("FilterGate Error: \(errorString)")

        // Clear the error after handling
        filtergate_clear_error(handle)

        // Handle specific errors
        if errorString.contains("Invalid handle") {
            // Handle invalid handle error
        } else if errorString.contains("Invalid parameter") {
            // Handle invalid parameter error
        }
    }
}
```

## Thread Safety

All FilterGate C API functions are thread-safe. You can call them from multiple threads without additional synchronization.

```swift
let queue = DispatchQueue(label: "com.example.filtergate", attributes: .concurrent)

queue.async {
    // Thread 1: Process audio
    filtergate_process_mono(handle, ...)
}

queue.async {
    // Thread 2: Update parameters
    filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, 0.5)
}
```

## Best Practices

1. **Always Check Return Values**: Most functions return error codes
2. **Handle Errors**: Check `filtergate_get_last_error()` after failures
3. **Clean Up Resources**: Always call `filtergate_destroy()` when done
4. **Validate Parameters**: Clamp values to valid ranges before setting
5. **Use Proper Sample Rates**: Supported rates are 44100, 48000, 96000, 192000

## Performance Tips

1. **Process in Blocks**: Use block sizes of 128-512 samples for best performance
2. **Minimize Parameter Changes**: Update parameters during UI thread, not audio thread
3. **Reuse Handles**: Create once, reuse for entire session
4. **Avoid Frequent Allocations**: Reuse audio buffers

## Troubleshooting

### No Sound Output
- Check if handle is valid (not nil)
- Verify sample rate is correct
- Ensure wet/dry mix is not 0

### Distorted Audio
- Check output level parameter
- Verify drive parameters are not too high
- Check for modulation overloading parameters

### Poor Performance
- Increase buffer size
- Reduce number of modulation routes
- Check CPU usage

## See Also

- [C API Reference](./C_API_REFERENCE.md)
- [Preset Format Specification](./PRESET_FORMAT.md)
- [Factory Presets Reference](./FACTORY_PRESETS.md)
